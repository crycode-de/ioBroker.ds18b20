/**
 * ioBroker DS18B20 1-wire temperature sensor adapter.
 *
 * (C) 2019 Peter Müller <peter@crycode.de> (https://github.com/crycode-de/ioBroker.ds18b20)
 */

import * as utils from '@iobroker/adapter-core';

import { autobind } from 'core-decorators';

import * as ds18b20 from 'ds18b20';

import { Sensor } from './sensor';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ioBroker {
    interface AdapterConfig {
      defaultInterval: number;
    }
  }
}

/**
 * The ds18b20 adapter.
 */
class Ds18b20Adapter extends utils.Adapter {

  /**
   * Mapping of the ioBroker object IDs to the sensor class instances.
   */
  private sensors: Record<string, Sensor> = {};

  /**
   * Constructor to create a new instance of the adapter.
   * @param options The adapter options.
   */
  public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
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
  @autobind
  private async onReady(): Promise<void> {
    // Reset the connection indicator during startup
    this.setState('info.connection', false, true);

    // Debug log the current config
    this.log.debug('config: ' + JSON.stringify(this.config));

    // setup sensors
    this.getForeignObjects(this.namespace + '.sensors.*', 'state', (err, objects) => {
      if (err) {
        this.log.error('error loading sensors data objects');
        return;
      }

      for (const objectId in objects) {
        const obj: SensorObject = objects[objectId] as SensorObject;

        const interval = typeof obj.native.interval === 'number' ? obj.native.interval : this.config.defaultInterval;
        this.sensors[obj._id] = new Sensor(obj._id, obj.native.address, interval, obj.native.nullOnError, obj.native.factor, obj.native.offset, obj.native.decimals);
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
  @autobind
  private async onUnload(callback: () => void): Promise<void> {
    try {
      // stop all intervals from the sensors
      for (const address in this.sensors) {
        this.sensors[address].stop();
      }

      // reset connection state
      this.setState('info.connection', false, true);

    } catch(e) { }

    callback();
  }

  /**
   * Handler for incoming sensor values.
   * @param value The value.
   * @param id    The ioBroker ID of the sensor.
   */
  @autobind
  private handleSensorValue (value: number | null, id: string): void {
    if (!this.sensors[id]) return;

    this.log.debug(`got value ${value} from sensor ${this.sensors[id].address}`);

    this.setStateAsync(id, {
      ack: true,
      val: value
    });
  }

  /**
   * Handler for sensor errors.
   * @param err The error.
   * @param id  The ioBroker ID of the sensor.
   */
  @autobind
  private handleSensorError (err: Error, id: string): void {
    this.log.warn(`Error reading sensor ${this.sensors[id].address}: ${err}`);
  }

  /**
   * Handler for changes of error state of a sensor.
   * This will change the info.connection state of the adapter to true if all
   * sensors are ok and false if at least one sensor has an error.
   * @param hasError Indecator if the sensor has an error or not.
   * @param id       The ioBroker ID of the sensor.
   */
  @autobind
  private handleSensorErrorStateChanged (hasError: boolean, id: string): void {
    this.log.debug(`error state of sensor ${this.sensors[id].address} changed to ${hasError}`);

    // check all sensors for errors
    for (const id in this.sensors) {
      if (this.sensors[id].hasError) {
        // at least one sensor has an error, set connection state to false
        this.setState('info.connection', false, true);
        return;
      }
    }
    // all sensors are ok, set connection state to true
    this.setState('info.connection', true, true);
  }

  /**
   * Get a defined sensor from it's ioBroker ID or 1-wire address.
   * @param  idOrAddress The ID or address of the sensor.
   * @return             The sensor or null.
   */
  private getSensor (idOrAddress: string): Sensor | null {
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
  @autobind
  private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
    if (state) {
      // The state was changed
      this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack}) ` + JSON.stringify(state));

      // don't do anything if ack is set
      if (state.ack === true) return;

      // handle special states
      switch (id) {
        case this.namespace + '.actions.readNow':
          this.readNow(state.val);
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
   * @param obj The receied ioBroker message.
   */
  @autobind
  private onMessage(obj: ioBroker.Message): void {
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
        case 'search':
          // search for sensors
          // don't do anything if no callback is provided
          if (!obj.callback) return;
          ds18b20.sensors((err, sensors) => {
            if (err) {
              return this.sendTo(obj.from, obj.command, { err: err.toString() , sensors: sensors }, obj.callback);
            }
            this.sendTo(obj.from, obj.command, { err: null , sensors: sensors }, obj.callback);
          });
          break;
      }
    }
  }

}

if (module.parent) {
  // Export the constructor in compact mode
  module.exports = (options: Partial<ioBroker.AdapterOptions> | undefined) => new Ds18b20Adapter(options);
} else {
  // otherwise start the instance directly
  (() => new Ds18b20Adapter())();
}
