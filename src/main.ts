/**
 * ioBroker DS18B20 1-wire temperature sensor adapter.
 *
 * (C) 2019-2023 Peter Müller <peter@crycode.de> (https://github.com/crycode-de/ioBroker.ds18b20)
 */

import 'source-map-support/register';

import { promisify } from 'util';

import * as fs from 'fs';
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

import * as crypto from 'crypto';

import {
  Adapter,
  AdapterOptions,
  EXIT_CODES,
} from '@iobroker/adapter-core';

import { boundMethod } from 'autobind-decorator';

import { Sensor } from './sensor';

import { RemoteSensorServer } from './remote-server';

/**
 * The ds18b20 adapter.
 */
class Ds18b20Adapter extends Adapter {

  /**
   * Mapping of the ioBroker object IDs to the sensor class instances.
   */
  private sensors: Record<string, Sensor> = {};

  /**
   * The server for remote sensors if enabled.
   */
  public remoteSensorServer: RemoteSensorServer | null = null;

  /**
   * Constructor to create a new instance of the adapter.
   * @param options The adapter options.
   */
  public constructor(options: Partial<AdapterOptions> = {}) {
    super({
      ...options,
      name: 'ds18b20',
    });

    this.on('ready', this.onReady);
    this.on('stateChange', this.onStateChange);
    this.on('message', this.onMessage);
    this.on('unload', this.onUnload);
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  @boundMethod
  private async onReady(): Promise<void> {
    // Reset the connection indicator during startup
    this.setState('info.connection', false, true);

    // set default devices path if not defined
    if (!this.config.w1DevicesPath) {
      this.config.w1DevicesPath = '/sys/bus/w1/devices';
    }

    // need to upgrade config from old version (<2.0.0)?
    if (Object.keys(this.config).includes('_values')) {
      this.log.info('Migrate config from old version ...');
      const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
      if (!instanceObj) {
        this.log.error('Could not read instance object!');
        this.terminate('Config migration required', EXIT_CODES.INVALID_ADAPTER_CONFIG);
        return;
      }

      const oldNative: ioBroker.AdapterConfigV1 = instanceObj.native as ioBroker.AdapterConfigV1;

      // log a warning to inform the user to re-install the remote clients if remote is enabled
      if (oldNative.remoteEnabled) {
        this.log.warn(`Please make sure to re-install you remote clients, or they won't be able to connect!`);
      }

      const newNative: ioBroker.AdapterConfig = {
        defaultInterval: oldNative.defaultInterval,
        remoteEnabled: oldNative.remoteEnabled,
        remoteKey: oldNative.remoteKey,
        remotePort: oldNative.remotePort,
        w1DevicesPath: oldNative.w1DevicesPath,
        sensors: [],
      };

      // migrate sensors
      for (const oldSensor of oldNative._values) {
        const { obj, ...sensor } = oldSensor;
        newNative.sensors.push(sensor);

        // TODO: remove native part from the sensor object
        /*const sensorObj = await this.getForeignObjectAsync(obj._id);
        if (sensorObj) {
          sensorObj.native = {};
          await this.setForeignObjectAsync(obj._id, sensorObj);
        }*/
      }

      instanceObj.native = newNative;
      this.log.info('Rewriting adapter config');
      this.setForeignObjectAsync(`system.adapter.${this.namespace}`, instanceObj);
      this.terminate('Restart adapter to apply config changes', EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
      return;
    }

    // remote sensor server
    if (this.config.remoteEnabled) {
      // check decrypt native support and show a warning in case of unsupported
      if (this.supportsFeature && !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
        this.log.warn('The server for remote sensors is enabled but decrypt native is not supported! The encryption key will be stored unencrypted in the ioBroker database. To get decrypt native support, please upgrade js-controller to v3.0 or greater.');
      }

      // check the port
      if (!this.config.remotePort || this.config.remotePort <= 0) {
        this.log.warn('Config: Invalid port for the remote sensor server! Using default port 1820.');
        this.config.remotePort = 1820;
      }

      // check the key
      if (typeof this.config.remoteKey !== 'string' || this.config.remoteKey.length !== 64) {
        this.config.remoteKey = crypto.randomBytes(32).toString('hex');
        this.log.error(`Config: Invalid key for the remote sensor server! Using random key "${this.config.remoteKey}".`);
      }

      this.remoteSensorServer = new RemoteSensorServer(this.config.remotePort, this.config.remoteKey, this);

      this.remoteSensorServer.on('listening', () => {
        this.log.info(`Remote sensor server is listening on port ${this.config.remotePort}`);
        this.updateInfoConnection();
      });

      this.remoteSensorServer.on('error', (err: Error) => {
        this.log.warn(`Remote sensor server error: ${err.toString()}`);
        this.log.debug(`${err.toString()} ${err.stack}`);
        this.updateInfoConnection();
      });
    }

    // setup sensors
    this.getForeignObjects(this.namespace + '.sensors.*', 'state', (err, objects) => {
      if (err) {
        this.log.error('error loading sensors data objects');
        return;
      }

      for (const objectId in objects) {
        const obj: SensorObject = objects[objectId] as SensorObject;

        if (typeof obj.native?.address !== 'string') {
          this.log.warn(`Object ${obj._id} has no valid address!`);
          continue;
        }

        if (obj.native.enabled === false) {
          this.log.debug(`Sensor ${obj.native.address} is not enabled and will be ignored.`);
          continue;
        }

        if (obj.native.remoteSystemId && !this.config.remoteEnabled) {
          this.log.warn(`Sensor ${obj.native.address} is configured as remote sensor of ${obj.native.remoteSystemId} but remote sensors are not enabled!`);
          continue;
        }

        this.sensors[obj._id] = new Sensor({
          w1DevicesPath: this.config.w1DevicesPath,
          id: obj._id,
          address: obj.native.address,
          interval: typeof obj.native.interval === 'number' ? obj.native.interval : this.config.defaultInterval,
          nullOnError: !!obj.native.nullOnError,
          factor: typeof obj.native.factor === 'number' ? obj.native.factor : 1,
          offset: typeof obj.native.offset === 'number' ? obj.native.offset : 0,
          decimals: typeof obj.native.decimals === 'number' ? obj.native.decimals : null,
          remoteSystemId: typeof obj.native.remoteSystemId === 'string' ? obj.native.remoteSystemId : null,
        }, this);
        this.sensors[obj._id].on('value', this.handleSensorValue);
        this.sensors[obj._id].on('error', this.handleSensorError);
        this.sensors[obj._id].on('errorStateChanged', this.handleSensorErrorStateChanged);
      }

      this.log.debug(`loaded ${Object.keys(this.sensors).length} sensors`);
    });

    // subscribe needed states
    this.subscribeStates('actions.*');
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  @boundMethod
  private async onUnload(callback: () => void): Promise<void> {
    try {
      // stop all intervals from the sensors
      for (const address in this.sensors) {
        this.sensors[address].stop();
      }

      // stop the remote sensor server
      if (this.remoteSensorServer) {
        await this.remoteSensorServer.stop();
      }

      // reset connection state
      await this.setStateAsync('info.connection', false, true);

    } catch(e) { }

    callback();
  }

  /**
   * Handler for incoming sensor values.
   * @param value The value or null in case of an error.
   * @param id    The ioBroker ID of the sensor.
   */
  @boundMethod
  private handleSensorValue (value: number | null, id: string): void {
    if (!this.sensors[id]) return;

    this.log.debug(`got value ${value} from sensor ${this.sensors[id].address}`);

    if (value === null) {
      this.setStateAsync(id, {
        ack: true,
        val: null,
        q: 0x81, // general problem by sensor
      });
    } else {
      this.setStateAsync(id, {
        ack: true,
        val: value,
      });
    }
  }

  /**
   * Handler for sensor errors.
   * @param err The error.
   * @param id  The ioBroker ID of the sensor.
   */
  @boundMethod
  private handleSensorError (err: Error, id: string): void {
    this.log.warn(`Error reading sensor ${this.sensors[id].address}: ${err}`);
  }

  /**
   * Handler for changes of error state of a sensor.
   * This will change the info.connection state of the adapter to true if all
   * sensors are ok and false if at least one sensor has an error.
   * @param hasError Indicator if the sensor has an error or not.
   * @param id       The ioBroker ID of the sensor.
   */
  @boundMethod
  private handleSensorErrorStateChanged (hasError: boolean, id: string): void {
    this.log.debug(`error state of sensor ${this.sensors[id].address} changed to ${hasError}`);

    this.updateInfoConnection();
  }

  /**
   * Update the info.connection state depending on the error state of all
   * sensors and the listening state of the remote sensor server.
   */
  private updateInfoConnection (): void {
    // check if remote sensor server is listening if enabled
    if (this.remoteSensorServer && !this.remoteSensorServer.isListening()) {
      // server enabled but not listening
      this.setStateAsync('info.connection', false, true);
      return;
    }

    // check all sensors for errors
    for (const id in this.sensors) {
      if (this.sensors[id].hasError) {
        // at least one sensor has an error, set connection state to false
        this.setStateAsync('info.connection', false, true);
        return;
      }
    }

    // all sensors are ok, set connection state to true
    this.setStateAsync('info.connection', true, true);
  }

  /**
   * Get a defined sensor from it's ioBroker ID or 1-wire address.
   * @param  idOrAddress The ID or address of the sensor.
   * @return             The sensor or null.
   */
  public getSensor (idOrAddress: string): Sensor | null {
    if (this.sensors[idOrAddress]) return this.sensors[idOrAddress];

    // check address
    for (const id in this.sensors) {
      if (this.sensors[id].address === idOrAddress) {
        return this.sensors[id];
      }
    }

    return null;
  }

  /**
   * Trigger the reading of a single sensor or all sensors.
   * @param idOrAddress The ioBroker ID or 1-wire address of the sensor. Use `all` or an empty string to read all sensors.
   */
  private readNow (idOrAddress?: string): void {
    if (typeof idOrAddress !== 'string' || idOrAddress === 'all' || idOrAddress === '') {
      // read all sensors
      this.log.info(`Read data from all sensors now`);
      for (const addr in this.sensors) {
        this.sensors[addr].read();
      }

    } else {
      // read a specific sensor
      const sens = this.getSensor(idOrAddress);

      if (!sens) {
        this.log.warn(`No sensor with address or id ${idOrAddress} found!`);
        return;
      }

      this.log.info(`Read data from sensor ${sens.address} now`);
      sens.read();
    }
  }

  /**
   * Is called if a subscribed state changes.
   * @param id    The ID of the state.
   * @param state The ioBroker state.
   */
  @boundMethod
  private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
    if (state) {
      // The state was changed
      this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack}) ` + JSON.stringify(state));

      // don't do anything if ack is set
      if (state.ack === true) return;

      // handle special states
      switch (id) {
        case this.namespace + '.actions.readNow':
          this.readNow(state.val as string);
          this.setStateAsync(this.namespace + '.actions.readNow', '', true);
          break;
      }

    } else {
      // The state was deleted
      this.log.debug(`state ${id} deleted`);
    }
  }

  /**
   * Some message was sent to this instance over message box (e.g. by a script).
   * @param obj The received ioBroker message.
   */
  @boundMethod
  private async onMessage(obj: ioBroker.Message): Promise<void> {
    this.log.debug('got message ' + JSON.stringify(obj));

    if (typeof obj === 'object' && obj.message) {
      switch (obj.command) {
        case 'readNow':
          // we should read sensors now...
          if (typeof obj.message === 'string') {
            this.readNow(obj.message);
          } else {
            this.readNow();
          }
          break;

        case 'read':
          // read a sensor
          if (typeof obj.message === 'string') {
            const sens = this.getSensor(obj.message);
            if (!sens) {
              this.log.debug('no such sensor');
              return this.sendTo(obj.from, obj.command, { err: 'No such sensor' , value: null }, obj.callback);
            }
            sens.read((err, value) => {
              if (err) {
                this.log.debug(err.toString());
                this.sendTo(obj.from, obj.command, { err: err.toString() , value: null }, obj.callback);
              } else {
                this.sendTo(obj.from, obj.command, { err: null , value: value }, obj.callback);
              }
            });
          } else {
            this.log.debug('no address or id given');
            return this.sendTo(obj.from, obj.command, { err: 'No sensor address or id given' , value: null }, obj.callback);
          }
          break;

        case 'getRemoteSystems':
          // get connected remote systems
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          if (!this.remoteSensorServer) {
            this.sendTo(obj.from, obj.command, [], obj.callback);
            return;
          }
          const systems = this.remoteSensorServer.getConnectedSystems();
          this.sendTo(obj.from, obj.command, systems, obj.callback);

          break;

        case 'search':
          // search for sensors
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          const sensors: SearchedSensor[] = [];
          let err: Error | null = null;

          // local sensors
          try {
            const files = await readDir(this.config.w1DevicesPath);

            const proms: Promise<string>[] = [];
            for (const file of files) {
              if (file.match(/^w1_bus_master\d+$/)) { // devices path used
                this.log.debug(`reading ${this.config.w1DevicesPath}/${file}/w1_master_slaves`);
                proms.push(readFile(`${this.config.w1DevicesPath}/${file}/w1_master_slaves`, 'utf8'));
              } else if (file === 'w1_master_slaves') { // path of one w1_bus_masterX used
                this.log.debug(`reading ${this.config.w1DevicesPath}/w1_master_slaves`);
                proms.push(readFile(`${this.config.w1DevicesPath}/w1_master_slaves`, 'utf8'));
              }
            }

            const localSensors: SearchedSensor[] = (await Promise.all(proms)).reduce<string[]>((acc, cur) => {
              acc.push(...cur.trim().split('\n'));
              return acc;
            }, []).map((addr) => ({ address: addr, remoteSystemId: '' }));

            sensors.push(...localSensors);

          } catch (er: any) {
            this.log.warn(`Error while searching for local sensors: ${er.toString()}`);
            if (!this.config.remoteEnabled) {
              err = er;
            }
          }

          // remote sensors
          if (this.config.remoteEnabled && this.remoteSensorServer) {
            try {
              const remoteSensors = await this.remoteSensorServer.search();
              sensors.push(...remoteSensors);
            } catch (er: any) {
              this.log.warn(`Error while searching for remote sensors: ${er.toString()}`);
            }
          }

          this.log.debug(`sensors found: ${JSON.stringify(sensors)}`);
          this.sendTo(obj.from, obj.command, { err, sensors }, obj.callback);

          break;
      }
    }
  }

}

if (require.main !== module) {
  // Export the constructor in compact mode
  module.exports = (options: Partial<AdapterOptions> | undefined) => new Ds18b20Adapter(options);
} else {
  // otherwise start the instance directly
  (() => new Ds18b20Adapter())();
}

// export the type of the adapter class to use it in other files
export type { Ds18b20Adapter };
