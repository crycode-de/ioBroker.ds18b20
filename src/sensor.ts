/**
 *  Class for a DS18B20 temperature sensor.
 */

import { EventEmitter } from 'events';
import { promisify } from 'util';

import * as fs from 'fs';
const readFile = promisify(fs.readFile);

import { autobind } from 'core-decorators';

import { round } from './lib/tools';
import { Ds18b20Adapter } from './main';

/**
 * Options for a Sensor.
 */
interface SensorOptions {
  w1DevicesPath: string;
  id: string;
  address: string;
  interval: number;
  nullOnError: boolean;
  factor: number;
  offset: number;
  decimals: number | null;

  remoteSystemId: string | null;
}

/**
 * Interface to declare events for the Sensor class.
 */
export interface Sensor {
  on (event: 'value', listener: (value: number | null, id: string) => void): this;
  on (event: 'error', listener: (err: Error, id: string) => void): this;
  on (event: 'errorStateChanged', listener: (hasError: boolean, id: string) => void): this;

  emit (event: 'value', value: number | null, id: string): boolean;
  emit (event: 'error', err: Error, id: string): boolean;
  emit (event: 'errorStateChanged', hasError: boolean, id: string): boolean;
}

/**
 * This class represents a single sensor.
 */
export class Sensor extends EventEmitter {
  /**
   * The ID of the sensor in ioBroker.
   */
  public readonly id: string;

  /**
   * The address (1-wire ID) of the sensor.
   */
  public readonly address: string;

  /**
   * Use null values on errors.
   */
  public readonly nullOnError: boolean;

  /**
   * Factor for value calculation.
   */
  public readonly factor: number;

  /**
   * Offset for value calculation.
   */
  public readonly offset: number;

  /**
   * Number of decimals to round to.
   */
  public readonly decimals: number | null;

  /**
   * SystemID of the client with this sensor if this is a remote sensor.
   * `null` for local sensors.
   */
  public readonly remoteSystemId: string | null;

  /**
   * Flag if the last read of the sensor had an error.
   */
  public hasError: boolean;

  /**
   * Timer for interval sensor readings.
   */
  private timer: number | null = null;

  /**
   * System path where the 1-wire devices can be read.
   */
  private readonly w1DevicesPath: string;

  /**
   * Reference to the adapter class.
   */
  private readonly adapter: Ds18b20Adapter;

  /**
   * Constructor for a new sensor.
   * @param opts The options for the Sensor.
   */
  constructor (opts: SensorOptions, adapter: Ds18b20Adapter) {
    super();
    this.adapter = adapter;

    this.id = opts.id;
    this.address = opts.address.replace(/[^0-9a-f-]/g, ''); // remove all bad chars!
    this.nullOnError = opts.nullOnError;
    this.factor = opts.factor;
    this.offset = opts.offset;
    this.decimals = opts.decimals;
    this.hasError = true; // true on init while we don't know the current state
    this.w1DevicesPath = opts.w1DevicesPath;
    this.remoteSystemId = opts.remoteSystemId;

    // start interval and inital read if interval is set
    if (opts.interval && opts.interval > 0) {
      // smallest interval is 500ms
      if (opts.interval < 500) {
        opts.interval = 500;
      }
      this.timer = setInterval(this.read, opts.interval);
      this.read();
    }
  }

  /**
   * Read the temperature.
   * The value and possible errors will be emitted as events.
   * Optionally a callback may be used.
   * @param  cb Optional callback function.
   */
  @autobind
  public async read (cb?: (err: Error | null, val: number | null) => void): Promise<void> {

    let raw: string;

    try {
      if (this.remoteSystemId) {
        // remote sensor - send request
        if (!this.adapter.remoteSensorServer) {
          throw new Error('Remote sensors not enabled');
        }
        raw = await this.adapter.remoteSensorServer.read(this.remoteSystemId, this.address);
      } else {
        // local sensor - read the file
        raw = await readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, 'utf8');
      }

      this.processData(raw, cb);

    } catch (err) {
      this.emit('error', err, this.id);
      if (typeof cb === 'function') {
        cb(err, null);
      }
    }
  }

  /**
   * Process the raw data from a sensor file.
   * @param rawData The raw data read from the sensor file.
   * @param cb Optional callback function.
   */
  public async processData (rawData: string, cb?: (err: Error | null, val: number | null) => void): Promise<void> {
    const lines = rawData.split('\n');

    let val: number | null = null;
    let err: Error | null = null;

    try {
      if (lines[0].indexOf('YES') > -1) {
        // checksum ok
        const bytes = lines[0].split(' ');
        if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
          // all bytes are the same
          throw new Error('Communication error');
        }

        const m = lines[1].match(/t=(-?\d+)/);
        if (!m) {
          throw new Error('Parse error');
        }
        val = parseInt(m[1], 10) / 1000;

      } else if (lines[0].indexOf('NO') > -1) {
        // checksum error
        throw new Error('Checksum error');

      } else {
        // read error
        throw new Error('Read error');
      }

      // check for specific errors
      if (val === 85) {
        throw new Error('No temperature read');
      } else if (val === -127) {
        throw new Error('Device disconnected');
      } else if (val < -80 || val > 150) {
        // From datasheet: Measures Temperatures from -55°C to +125°C
        throw new Error('Read temperature is out of possible range');
      }

    } catch (e) {
      this.emit('error', e, this.id);
      err = e;
      val = null;
    }

    // evaluate the result
    if (val !== null) {
      val = val * this.factor + this.offset;
      if (this.decimals !== null) {
        val = round(val, this.decimals);
      }
    }

    if (val !== null || this.nullOnError) {
      this.emit('value', val, this.id);
    }

    if (this.hasError !== (val === null)) {
      this.hasError = (val === null);
      this.emit('errorStateChanged', this.hasError, this.id);
    }

    if (typeof cb === 'function') {
      cb(err, val);
    }
  }

  /**
   * Stop a running interval for automated readings.
   */
  public stop (): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
