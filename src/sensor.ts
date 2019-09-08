/**
 *  Class for a DS18B20 temperature sensor.
 */

import { EventEmitter } from 'events';

import { autobind } from 'core-decorators';

import * as ds18b20 from 'ds18b20';

import { round } from './lib/tools';

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
   * Constructor for a new sensor.
   * @param id          The ID of the sensor in ioBroker.
   * @param address     The address (1-wire ID) of the sensor.
   * @param interval    The interval in milliseconds for periodic reads.
   * @param nullOnError Use null values on errors.
   * @param factor      Factor for value calculation.
   * @param offset      Offset for value calculation.
   * @param decimals    Number of decimals to round to.
   */
  constructor (id: string, address: string, interval: number, nullOnError: boolean, factor: number, offset: number, decimals: number | null) {
    super();
    this.id = id;
    this.address = address;
    this.nullOnError = nullOnError;
    this.factor = factor;
    this.offset = offset;
    this.decimals = decimals;
    this.hasError = true; // true on init while we don't know the current state

    // start interval and inital read if interval is set
    if (interval && interval > 0) {
      this.timer = setInterval(this.read, interval);
      this.read();
    }
  }

  /**
   * Read the temperature.
   * Use the decimal parser because the hex parser doesn't  support crc checking.
   * The value and possible errors will be emitted as events.
   * Optionally a callback may be used.
   * @param  cb Optional callback function.
   */
  @autobind
  public read (cb?: (err: Error | null, val: number | null) => void): void {
    ds18b20.temperature(this.address, { parser: 'decimal' }, (err, val: number | null | false) => {
      if (err) {
        this.emit('error', err, this.id);
        val = null;
      } else if (val === 85) {
        this.emit('error', new Error('Communication error'), this.id);
        val = null;
      } else if (val === -127) {
        this.emit('error', new Error('Device disconnected'), this.id);
        val = null;
      } else if (val === false) {
        this.emit('error', new Error('Checksum error'), this.id);
        val = null;
      }

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
