/**
 * ioBroker DS18B20 1-wire temperature sensor adapter.
 *
 * (C) 2019-2023 Peter Müller <peter@crycode.de> (https://github.com/crycode-de/ioBroker.ds18b20)
 */

import 'source-map-support/register';

import { readFile, readdir } from 'fs/promises';


import * as crypto from 'crypto';

import {
  Adapter,
  AdapterOptions,
  EXIT_CODES,
} from '@iobroker/adapter-core';

import { boundMethod } from 'autobind-decorator';

import { Sensor } from './sensor';

import { RemoteSensorServer } from './remote-server';
import { genHexString } from './lib/utils';
import { i18n } from './lib/i18n';

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
   * Internal indicator if we are doing a migration from an old version.
   */
  private doingMigration: boolean = false;

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

    // try to get the system language
    const systemConfig = await this.getForeignObjectAsync('system.config');
    i18n.language = systemConfig?.common.language || 'en';

    // set default devices path if not defined
    if (!this.config.w1DevicesPath) {
      this.config.w1DevicesPath = '/sys/bus/w1/devices';
    }

    // need to upgrade config from old version (<2.0.0)?
    if (Object.keys(this.config).includes('_values')) {
      this.log.info('Migrate config from old version ...');
      this.doingMigration = true;

      const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
      if (!instanceObj) {
        this.log.error('Could not read instance object!');
        this.terminate('Config migration required', EXIT_CODES.INVALID_ADAPTER_CONFIG);
        return;
      }

      const oldNative: ioBroker.AdapterConfigV1 = instanceObj.native as ioBroker.AdapterConfigV1;

      const newNative: ioBroker.AdapterConfig = {
        defaultInterval: oldNative.defaultInterval,
        remoteEnabled: oldNative.remoteEnabled,
        remoteKey: '', // a new remote key must be created in admin!
        remotePort: oldNative.remotePort,
        w1DevicesPath: oldNative.w1DevicesPath,
        sensors: [],
      };

      // log warning if remote is enabled
      if (newNative.remoteEnabled) {
        this.log.warn('You have remote sensor enabled. It is required to set a new remote key in admin and update the remote configs!');
      }

      // sort the old sensors by given sortOrder
      oldNative._values.sort((a, b) => {
        if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
          return a.sortOrder - b.sortOrder;
        }
        return 0;
      });

      // migrate sensors
      for (const oldSensor of oldNative._values) {

        const sensor: ioBroker.AdapterConfigSensor = {
          address: oldSensor.address,
          remoteSystemId: oldSensor.remoteSystemId ?? '',
          name: oldSensor.name || oldSensor.address,
          interval: oldSensor.interval ?? null,
          unit: oldSensor.unit ?? '°C',
          factor: oldSensor.factor ?? 1,
          offset: oldSensor.offset ?? 0,
          decimals: oldSensor.decimals ?? 2,
          nullOnError: !!oldSensor.nullOnError,
          enabled: !!oldSensor.enabled,
        };

        this.log.info(`Migrate sensor ${JSON.stringify(sensor)}`);
        newNative.sensors.push(sensor);

        // remove native part from the sensor object
        const sensorObj = await this.getObjectAsync(`sensors.${sensor.address}`);
        if (sensorObj) {
          sensorObj.native = {};
          await this.setObjectAsync(`sensors.${sensor.address}`, sensorObj);
        }
      }

      // delete some objects - they will be recreated on adapter restart
      await Promise.all([
        this.delObjectAsync('actions'),
        this.delObjectAsync('actions.readNow'),
        this.delObjectAsync('info'),
        this.delObjectAsync('info.connection'),
        this.delObjectAsync('sensors'),
      ]);

      instanceObj.native = newNative;
      this.log.info('Rewriting adapter config');
      await this.setForeignObjectAsync(`system.adapter.${this.namespace}`, instanceObj);
      this.terminate('Restart adapter to apply config changes', EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
      return;
    }

    // remote sensor server
    if (this.config.remoteEnabled) {
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

      // setup info state for connected remote systems
      await this.extendObjectAsync('info.remotesConnected', {
        type: 'state',
        common: {
          name: i18n.getStringOrTranslated('Connected remote systems'),
          type: 'string',
          role: 'state',
          read: true,
          write: false,
          def: '',
        },
        native: {},
      });
      this.setState('info.remotesConnected', '', true);

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

      this.remoteSensorServer.on('remotesChanged', (remotes: string[]) => {
        this.setState('info.remotesConnected', remotes.join(','), true);
      });

    } else {
      // remote systems disabled - delete info object if exists
      if (await this.getObjectAsync('info.remotesConnected')) {
        await this.delObjectAsync('info.remotesConnected');
      }
    }

    // setup sensors
    if (!Array.isArray(this.config.sensors)) {
      this.config.sensors = [];
    }
    for (const sensorCfg of this.config.sensors) {
      if (!/^[0-9a-f]{2}-[0-9a-f]{12}$/.test(sensorCfg.address)) {
        this.log.warn(`Invalid sensor address configured: ${sensorCfg.address}`);
        continue;
      }

      if (this.sensors[sensorCfg.address]) {
        this.log.warn(`Sensor ${sensorCfg.address} is configured twice! Ignoring the all expect the first.`);
        continue;
      }

      if (sensorCfg.remoteSystemId && !this.config.remoteEnabled) {
        this.log.warn(`Sensor ${sensorCfg.address} is configured as remote sensor of ${sensorCfg.remoteSystemId} but remote sensors are not enabled!`);
        continue;
      }

      // create/update object
      const name = sensorCfg.name || sensorCfg.address;
      await this.extendObjectAsync(`sensors.${sensorCfg.address}`, {
        type: 'state',
        common: {
          name: sensorCfg.enabled ? name : i18n.getStringOrTranslated('%s (disabled)', name),
          type: 'number',
          role: 'value.temperature',
          unit: sensorCfg.unit || '°C',
          read: true,
          write: false,
          def: null,
          icon: sensorCfg.enabled ? 'ds18b20.png' : 'sensor_disabled.png',
        },
        native: {},
      });

      // stop here if sensor is not enabled
      if (!sensorCfg.enabled) {
        this.log.debug(`Sensor ${sensorCfg.address} is not enabled`);
        continue;
      }

      // init the sensor
      let interval: number;
      if (typeof sensorCfg.interval === 'number') {
        interval = sensorCfg.interval;
      } else if (typeof sensorCfg.interval === 'string' && sensorCfg.interval.length > 0) {
        interval = parseInt(sensorCfg.interval, 10);
        if (isNaN(interval)) {
          this.log.warn(`Query interval for sensor ${sensorCfg.address} is invalid! Using default.`);
          interval = this.config.defaultInterval;
        }
      } else {
        interval = this.config.defaultInterval;
      }
      this.sensors[sensorCfg.address] = new Sensor({
        w1DevicesPath: this.config.w1DevicesPath,
        address: sensorCfg.address,
        interval,
        nullOnError: !!sensorCfg.nullOnError,
        factor: typeof sensorCfg.factor === 'number' ? sensorCfg.factor : 1,
        offset: typeof sensorCfg.offset === 'number' ? sensorCfg.offset : 0,
        decimals: typeof sensorCfg.decimals === 'number' ? sensorCfg.decimals : null,
        remoteSystemId: typeof sensorCfg.remoteSystemId === 'string' ? sensorCfg.remoteSystemId : null,
      }, this);
      this.sensors[sensorCfg.address].on('value', this.handleSensorValue);
      this.sensors[sensorCfg.address].on('error', this.handleSensorError);
      this.sensors[sensorCfg.address].on('errorStateChanged', this.handleSensorErrorStateChanged);
    }

    const count = Object.keys(this.sensors).length;
    this.log.debug(`Loaded ${count} enabled sensors`);

    if (count === 0) {
      this.log.warn('No sensors configured or enabled!');
    }

    // check for sensor objects not configured
    const objListSensors = await this.getObjectListAsync({
      startkey: `${this.namespace}.sensors.`,
      endkey: `${this.namespace}.sensors.\u9999`,
    });
    const reAddress = new RegExp(`^${this.name}\\.${this.instance}\\.sensors\\.(.+)$`);
    for (const item of objListSensors.rows) {
      const m = item.id.match(reAddress);
      if (m) {
        const addr = m[1];
        if (!this.config.sensors.find((s) => s.address === addr)) {
          // not configured
          this.log.info(`Delete object ${item.id} since sensor is not configured`);
          await this.delObjectAsync(item.id);
        }
      }
    }

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
        await this.setStateAsync('info.remotesConnected', '' , true);
      }

      // reset connection state
      if (!this.doingMigration) {
        await this.setStateAsync('info.connection', false, true);
      }

    } catch(e) { }

    callback();
  }

  /**
   * Handler for incoming sensor values.
   * @param value The value or null in case of an error.
   * @param address The Address of the sensor.
   */
  @boundMethod
  private handleSensorValue (value: number | null, address: string): void {
    if (!this.sensors[address]) return;

    this.log.debug(`Got value ${value} from sensor ${address}`);

    if (value === null) {
      this.setStateAsync(`sensors.${address}`, {
        ack: true,
        val: null,
        q: 0x81, // general problem by sensor
      });
    } else {
      this.setStateAsync(`sensors.${address}`, {
        ack: true,
        val: value,
      });
    }
  }

  /**
   * Handler for sensor errors.
   * @param err The error.
   * @param address The address of the sensor.
   */
  @boundMethod
  private handleSensorError (err: Error, address: string): void {
    this.log.warn(`Error reading sensor ${address}: ${err}`);
  }

  /**
   * Handler for changes of error state of a sensor.
   * This will change the info.connection state of the adapter to true if all
   * sensors are ok and false if at least one sensor has an error.
   * @param hasError Indicator if the sensor has an error or not.
   * @param address  The address of the sensor.
   */
  @boundMethod
  private handleSensorErrorStateChanged (hasError: boolean, address: string): void {
    this.log.debug(`Error state of sensor ${address} changed to ${hasError}`);

    this.extendObjectAsync(`sensors.${address}`, {
      common: {
        icon: hasError ? 'sensor_error.png' : 'sensor_ok.png',
      },
    });

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

    // are any sensors available?
    if (Object.keys(this.sensors).length === 0) {
      // no sensors
      this.setStateAsync('info.connection', false, true);
      return;
    }

    // check all sensors for errors
    for (const address in this.sensors) {
      if (this.sensors[address].hasError) {
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

    // check id
    const m = /^ds18b20\.\d+\.sensors\.(.+)$/.exec(idOrAddress);
    if (m && this.sensors[m[1]]) {
      return this.sensors[m[1]];
    }

    return null;
  }

  /**
   * Trigger the reading of a single sensor or all sensors.
   * If all sensor should be read, errors on single sensors will be represented by `null` values.
   * @param idOrAddress The ioBroker ID or 1-wire address of the sensor. Use `all` or an empty string to read all sensors.
   * @throws Error if a single sensor should be read and an error occurs.
   */
  private async readNow (): Promise<Record<string, number | null>>;
  private async readNow (idOrAddress: undefined): Promise<Record<string, number | null>>;
  private async readNow (idOrAddress: 'all' | ''): Promise<Record<string, number | null>>;
  private async readNow (idOrAddress: string): Promise<number | null>;
  private async readNow (idOrAddress?: string): Promise<Record<string, number | null> | number | null> {
    if (typeof idOrAddress !== 'string' || idOrAddress === 'all' || idOrAddress === '') {
      // read all sensors
      this.log.info(`Read data from all sensors now`);
      const results: Record<string, number | null> = {};
      for (const address in this.sensors) {
        try {
          results[address] = await this.sensors[address].read();
        } catch (err) {
          results[address] = null;
        }
      }

      return results;

    } else {
      // read a specific sensor
      const sens = this.getSensor(idOrAddress);

      if (!sens) {
        this.log.warn(`No sensor with address or id ${idOrAddress} found!`);
        return null;
      }

      this.log.info(`Read data from sensor ${sens.address} now`);
      return await sens.read();
    }
  }

  /**
   * Search for local and remote sensors.
   * @returns Array of the found sensors
   */
  private async searchSensors (): Promise<SearchedSensor[]> {
    const sensors: SearchedSensor[] = [];

    // local sensors
    try {
      const files = await readdir(this.config.w1DevicesPath);

      const proms: Promise<string>[] = [];
      for (const file of files) {
        if (/^w1_bus_master\d+$/.test(file)) { // devices path used
          this.log.debug(`Reading ${this.config.w1DevicesPath}/${file}/w1_master_slaves`);
          proms.push(readFile(`${this.config.w1DevicesPath}/${file}/w1_master_slaves`, 'utf8'));
        } else if (file === 'w1_master_slaves') { // path of one w1_bus_masterX used
          this.log.debug(`Reading ${this.config.w1DevicesPath}/w1_master_slaves`);
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

    this.log.debug(`Sensors found: ${JSON.stringify(sensors)}`);

    return sensors;
  }

  /**
   * Is called if a subscribed state changes.
   * @param id    The ID of the state.
   * @param state The ioBroker state.
   */
  @boundMethod
  private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
    // don't do anything if state is deleted or ack is set
    if (!state || state.ack) {
      return;
    }

    // handle special states
    if (id === `${this.namespace}.actions.readNow`) {
      await this.readNow(state.val as string).catch(() => { /* noop */});
      await this.setStateAsync(this.namespace + '.actions.readNow', '', true);
    }
  }

  /**
   * Some message was sent to this instance over message box (e.g. by a script).
   * @param obj The received ioBroker message.
   */
  @boundMethod
  private async onMessage(obj: ioBroker.Message): Promise<void> {
    this.log.debug('Got message ' + JSON.stringify(obj));

    if (typeof obj === 'object') {
      switch (obj.command) {
        case 'read':
        case 'readNow':
          // we should read sensors now...
          try {
            const value = (typeof obj.message === 'string') ? await this.readNow(obj.message) : await this.readNow();
            if (obj.callback) {
              this.sendTo(obj.from, obj.command, { err: null, value }, obj.callback);
            }
            return;
          } catch (err: any) {
            this.log.debug(err.toString());
            if (obj.callback) {
              this.sendTo(obj.from, obj.command, { err: err.toString(), value: null }, obj.callback);
            }
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
          this.sendTo(obj.from, obj.command, this.remoteSensorServer.getConnectedSystems(), obj.callback);

          break;

        case 'getRemoteSystemsAdminUi':
          // get connected remote systems
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          let remotes = this.remoteSensorServer?.getConnectedSystems().join(', ');
          if (!remotes) {
            remotes = '---';
          }
          this.sendTo(obj.from, obj.command, remotes, obj.callback);

          break;

        case 'search':
        case 'searchSensors':
          // search for sensors
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          this.sendTo(obj.from, obj.command, { sensors: await this.searchSensors() }, obj.callback);

          break;

        case 'searchSensorsAdminUi':
          // search for sensors from the admin ui
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          const sensors: ioBroker.AdapterConfigSensor[] = [];

          // use sensors currently defined in admin ui
          if (typeof obj.message === 'object' && Array.isArray(obj.message.sensors)) {
            sensors.push(...obj.message.sensors);
          }

          // search for sensors and add found sensors if not already in
          const foundSensors = await this.searchSensors();
          for (const foundSensor of foundSensors) {
            if (sensors.findIndex((cfgSensor) => (cfgSensor.address === foundSensor.address && cfgSensor.remoteSystemId === foundSensor.remoteSystemId)) < 0) {
              // not in the list... add it
              sensors.push({
                address: foundSensor.address,
                remoteSystemId: foundSensor.remoteSystemId,
                name: '',
                interval: null,
                unit: '°C',
                factor: 1,
                offset: 0,
                decimals: 2,
                nullOnError: true,
                enabled: true,
              });
            }
          }

          // send back the result
          this.sendTo(obj.from, obj.command, { native: { sensors } }, obj.callback);

          break;

        case 'getNewRemoteKey':
          // don't do anything if no callback is provided
          if (!obj.callback) return;

          this.sendTo(obj.from, obj.command, { native: { remoteKey: genHexString(64) } }, obj.callback);
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
