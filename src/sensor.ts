/**
 *  Class for a DS18B20 temperature sensor.
 */

import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';

import { boundMethod } from 'autobind-decorator';

import { round } from './lib/utils';
import type { Ds18b20Adapter } from './main';

/**
 * Options for a Sensor.
 */
interface SensorOptions {
  w1DevicesPath: string;
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
interface SensorEvents {
  value: [ value: number | null, address: string ];
  error: [ err: Error, address: string ];
  errorStateChanged: [ hasError: boolean, address: string ];
}

/**
 * This class represents a single sensor.
 */
export class Sensor extends EventEmitter<SensorEvents> {
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
  private timer: ioBroker.Interval | undefined = undefined;

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

    this.address = opts.address;
    this.nullOnError = opts.nullOnError;
    this.factor = opts.factor;
    this.offset = opts.offset;
    this.decimals = opts.decimals;
    this.hasError = true; // true on init while we don't know the current state
    this.w1DevicesPath = opts.w1DevicesPath;
    this.remoteSystemId = opts.remoteSystemId;

    // start interval and initial read if interval is set
    if (opts.interval && opts.interval > 0) {
      // smallest interval is 500ms
      if (opts.interval < 500) {
        opts.interval = 500;
      }
      this.timer = this.adapter.setInterval(() => {
        this.read().catch(() => { /* noop */ });
      }, opts.interval);
      this.read().catch(() => { /* noop */ });
    }
  }

  /**
   * Read the temperature.
   * The value and possible errors will be emitted as events.
   * @returns The read value.
   * @throws Error when an error occurs.
   */
  @boundMethod
  public async read (): Promise<number | null> {
    let val: number | null = null;
    try {
      let raw: string;

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

      val = this.processData(raw);

      this.emit('value', val, this.address);

      if (this.hasError) {
        this.hasError = false;
        this.emit('errorStateChanged', false, this.address);
      }

    } catch (err) {
      this.emit('error', err as Error, this.address);

      if (this.nullOnError) {
        this.emit('value', null, this.address);
      }

      if (!this.hasError) {
        this.hasError = true;
        this.emit('errorStateChanged', true, this.address);
      }
      throw err;
    }

    return val;
  }

  /**
   * Process the raw data from a sensor file.
   * @param rawData The raw data read from the sensor file.
   * @returns The read value.
   * @throws Error when an error occurs.
   */
  public processData (rawData: string): number {
    const lines = rawData.split('\n');

    let val: number;

    if (lines[0].includes('YES')) {
      // checksum ok
      const bytes = lines[0].split(' ');
      if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
        // all bytes are the same
        throw new Error('Communication error');
      }

      const m = /t=(-?\d+)/.exec(lines[1]);
      if (!m) {
        throw new Error('Parse error');
      }
      val = parseInt(m[1], 10) / 1000;

    } else if (lines[0].includes('NO')) {
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

    // evaluate the result
    val = val * this.factor + this.offset;
    if (this.decimals !== null) {
      val = round(val, this.decimals);
    }

    return val;
  }

  /**
   * Stop a running interval for automated readings.
   */
  public stop (): void {
    if (this.timer) {
      this.adapter.clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
