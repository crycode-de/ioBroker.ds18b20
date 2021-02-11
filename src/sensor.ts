/**
 *  Class for a DS18B20 temperature sensor.
 */

import { EventEmitter } from 'events';
import { promisify } from 'util';

import * as fs from 'fs';
const readFile = promisify(fs.readFile);

import { autobind } from 'core-decorators';

import { round } from './lib/tools';

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
   * Constructor for a new sensor.
   * @param opts The options for the Sensor.
   */
  constructor (opts: SensorOptions) {
    super();
    this.id = opts.id;
    this.address = opts.address.replace(/[^0-9a-f-]/g, ''); // remove all bad chars!
    this.nullOnError = opts.nullOnError;
    this.factor = opts.factor;
    this.offset = opts.offset;
    this.decimals = opts.decimals;
    this.hasError = true; // true on init while we don't know the current state
    this.w1DevicesPath = opts.w1DevicesPath;

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
  public read (cb?: (err: Error | null, val: number | null) => void): void {
    // read the file
    readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, 'utf8')
      // process data
      .then((data: string) => {
        const lines = data.split('\n');

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
          return parseInt(m[1], 10) / 1000;

        } else if (lines[0].indexOf('NO') > -1) {
          // checksum error
          throw new Error('Checksum error');

        } else {
          // read error
          throw new Error('Read error');

        }
      })

      // check for specific errors
      .then((val) => {
        if (val === 85) {
          throw new Error('No temperature read');
        } else if (val === -127) {
          throw new Error('Device disconnected');
        } else if (val < -80 || val > 150) {
          // From datasheet: Measures Temperatures from -55°C to +125°C
          throw new Error('Read temperature is out of possible range');
        }
        return { err: null, val: val };
      })

      // handle errors
      .catch((err: Error) => {
        this.emit('error', err, this.id);
        return { err: err, val: null };
      })

      // evaluate the result
      .then((data: { err: Error|null; val: number|null }) => {
        if (data.val !== null) {
          data.val = data.val * this.factor + this.offset;
          if (this.decimals !== null) {
            data.val = round(data.val, this.decimals);
          }
        }

        if (data.val !== null || this.nullOnError) {
          this.emit('value', data.val, this.id);
        }

        if (this.hasError !== (data.val === null)) {
          this.hasError = (data.val === null);
          this.emit('errorStateChanged', this.hasError, this.id);
        }

        if (typeof cb === 'function') {
          cb(data.err, data.val);
        }
      });
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
