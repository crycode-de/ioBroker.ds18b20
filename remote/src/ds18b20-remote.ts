/**
 * ioBroker-ds18b20-remote
 *
 * Remote client for the ioBroker.ds18b20 adapter.
 * This client has zero dependencies and can be started on any linux os running
 * Node.js.
 *
 * The client will connect to the ioBroker adapter using a TCP socket and
 * provide an interface to let the adapter read 1-wire sensors connected to the
 * client system.
 *
 * MIT License
 *
 * Copyright (c) 2021 Peter Müller <peter@crycode.de> (https://crycode.de)
 */

import { promisify } from 'util';
import { Socket } from 'net';
import * as fs from 'fs';
import * as os from 'os';

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

import { Logger } from './logger';

import {
  encrypt,
  decrypt,
} from './common/crypt';

import { RemoteData } from './common/types';

/**
 * Keys to read from a .env file into process.env
 */
const ENV_KEYS = [
  'ADAPTER_HOST',
  'ADAPTER_KEY',
  'ADAPTER_PORT',
  'DEBUG',
  'SYSTEM_ID',
  'W1_DEVICES_PATH',
];

/**
 * Main class for ioBroker-ds18b20-remote
 */
class Ds18b20Remote {

  /**
   * Host where the adapter runs on.
   */
  private readonly adapterHost: string;

  /**
   * Port on which the adapter is listening for remote connections.
   * Default is `1820`.
   */
  private readonly adapterPort: number;

  /**
   * Encryption key used to encrypt/decrypt the communication with the adapter.
   */
  private readonly adapterKey: Buffer;

  /**
   * ID of this remote system.
   * This should be unique. Defaults to the system hostname.
   */
  private readonly systemId: string;

  /**
   * System path to the 1-wire devices. Default is `/sys/bus/w1/devices`.
   */
  private readonly w1DevicesPath: string;

  /**
   * The socket used to communicate with the adapter.
   */
  private socket: Socket;

  /**
   * Timeout to trigger socket reconnects.
   */
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Flag if ds18b20-remote should exit.
   * If `true` a reconnect won't be possible.
   */
  private shouldExit: boolean = false;

  /**
   * String of the received data.
   * All received data chunks will be appended to this until we got `\n`.
   * On `\n` data before it will be processed.
   */
  private recvData: string = '';

  /**
   * Our simple logger.
   */
  private readonly log: Logger;

  constructor () {
    // bind methods
    this.connect = this.connect.bind(this);
    this.exit = this.exit.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onData = this.onData.bind(this);
    this.onError = this.onError.bind(this);

    this.log = new Logger();
    this.log.log('ioBroker-ds18b20-remote');

    // read env vars from a .env file in cwd
    this.readDotEnv();

    // get the system ID
    if (process.env.SYSTEM_ID) {
      this.systemId = process.env.SYSTEM_ID.trim();
    } else {
      this.systemId = os.hostname();
      this.log.warn(`Using the hostname ${this.systemId} as system ID. Please set SYSTEM_ID to a unique value.`);
    }
    this.log.debug(`systemId`, this.systemId);

    // get adapter port
    if (process.env.ADAPTER_PORT) {
      try {
        this.adapterPort = parseInt(process.env.ADAPTER_PORT, 10);
      } catch (err) {
        this.log.error(`Invalid ADAPTER_PORT!`, err);
        process.exit(1);
      }
    } else {
      this.adapterPort = 1820;
    }
    this.log.debug(`adapterPort`, this.adapterPort);

    // get adapter host
    this.adapterHost = (process.env.ADAPTER_HOST || '').trim();
    if (this.adapterHost.length <= 0) {
      this.log.error(`No ADAPTER_HOST given!`);
      process.exit(1);
    }
    this.log.debug(`adapterHost`, this.adapterHost);

    // get the encryption key
    this.adapterKey = Buffer.from(process.env.ADAPTER_KEY || '', 'hex');
    if (this.adapterKey.length !== 32) {
      this.log.error(`ADAPTER_KEY is no valid key!`);
      process.exit(1);
    }
    this.log.debug(`adapterKey`, this.adapterKey);

    // get the 1-wire devices path
    this.w1DevicesPath = process.env.W1_DEVICES_PATH || '/sys/bus/w1/devices';
    if (!fs.existsSync(this.w1DevicesPath)) {
      this.log.error(`The 1-wire devices path ${this.w1DevicesPath} does not exist!`);
      process.exit(1);
    }
    this.log.debug(`w1DevicesPath`, this.w1DevicesPath);

    // register signal handlers for exit
    process.on('SIGINT', this.exit);
    process.on('SIGTERM', this.exit);

    // create the socket
    this.socket = new Socket();

    this.socket.on('close', this.onClose);
    this.socket.on('data', this.onData);
    this.socket.on('error', this.onError);

    // try to connect
    this.connect();
  }

  /**
   * Try to connect to the adapter.
   */
  private connect (): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // don't connect if we should exit
    if (this.shouldExit) {
      return;
    }

    this.log.info(`Connecting to ${this.adapterHost}:${this.adapterPort} ...`)

    this.socket.connect({
      host: this.adapterHost,
      port: this.adapterPort,
    }, () => {
      this.log.info(`Connected with adapter`);
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      this.reconnectTimeout = null;
    });
  }

  /**
   * Handle incoming data chunks.
   * @param data A data chunk.
   */
  private onData (data: Buffer): void {
    this.recvData += data.toString();

    // check for \n and process the data
    const idx = this.recvData.indexOf('\n');
    if (idx > 0) {
      const raw = this.recvData.slice(0, idx);
      this.recvData = this.recvData.slice(idx + 1);
      this.handleSocketData(raw);
    }
  }

  /**
   * Handle a message from the adapter.
   * @param raw The raw (encoded) message from the adapter.
   */
  private async handleSocketData (raw: string): Promise<void> {
    // try to decrypt and parse the data
    let data: RemoteData;
    try {
      const dataStr = decrypt(raw, this.adapterKey);
      data = JSON.parse(dataStr);
    } catch (err) {
      this.log.warn(`Decrypt of data failed! ${err.toString()}`);
      // close the socket
      this.socket.end();
      return;
    }

    this.log.debug('message from adapter:', data);

    switch (data.cmd) {
      case 'clientInfo':
        // get client info
        this.log.info('Sending client info to the adapter')
        this.send({
          cmd: 'clientInfo',
          systemId: this.systemId,
        });
        break;

      case 'read':
        // read sensor data
        if (!data.address) {
          this.log.warn(`Got read command without address from adapter!`);
          return;
        }

        let raw: string;
        try {
          raw = await readFile(`${this.w1DevicesPath}/${data.address}/w1_slave`, 'utf8');
          this.log.debug(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave:`, raw);
        } catch (err) {
          this.log.warn(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave failed! ${err.toString()}`);
          this.log.debug(err);
          raw = '';
        }

        await this.send({
          cmd: 'read',
          address: data.address,
          ts: data.ts,
          raw,
        });
        break;

      case 'search':
        // search for sensors
        try {
          const files = await readDir(this.w1DevicesPath);

          const proms: Promise<string>[] = [];
          for (let i = 0; i < files.length; i++) {
            if (!files[ i ].match(/^w1_bus_master\d+$/)) {
              continue;
            }
            this.log.debug(`reading ${this.w1DevicesPath}/${files[ i ]}/w1_master_slaves`);
            proms.push(readFile(`${this.w1DevicesPath}/${files[ i ]}/w1_master_slaves`, 'utf8'));
          }

          const addresses: string[] = (await Promise.all(proms)).reduce<string[]>((acc, cur) => {
            acc.push(...cur.trim().split('\n'));
            return acc;
          }, []);

          await this.send({
            cmd: 'search',
            ts: data.ts,
            systemId: data.systemId,
            addresses
          });

        } catch (err) {
          this.log.warn(`Searching for sensors failed! ${err.toString()}`);
          this.log.debug(err);
        }

        break;

      default:
        this.log.warn(`Unknown command from adapter`);
    }
  }

  /**
   * Handler for socket errors.
   * Each error will trigger a socket disconnect and reconnect.
   * @param err The error.
   */
  private onError (err: Error): void {
    this.log.warn(`Socket error:`, err.toString());
    this.log.debug(err);

    // close the socket on an error
    this.socket.end();

    this.reconnect();
  }

  /**
   * Handler for socket close events.
   */
  private onClose (): void {
    this.log.info('Socket closed');
    this.reconnect();
  }

  /**
   * Init a reconnect after 30 seconds.
   */
  private reconnect (): void {
    if (!this.reconnectTimeout && !this.shouldExit) {
      // schedule reconnect
      this.log.info(`Reconnect in 30 seconds`);
      this.reconnectTimeout = setTimeout(this.connect, 30000);
    }
  }

  /**
   * Send some data to the adapter.
   * The data will be stringified and encrypted before sending.
   * @param data The data object to send.
   */
  private async send (data: RemoteData): Promise<void> {
    this.log.debug('send to adapter:', data);
    return new Promise<void>((resolve, reject) => {
      this.socket.write(encrypt(JSON.stringify(data), this.adapterKey) + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  }

  /**
   * Read env vars from a .env file in the current working dir if exists.
   */
  private readDotEnv (): void {
    if (!fs.existsSync('.env')) return;

    let data: string[];
    try {
      data = fs.readFileSync('.env', 'utf-8').split('\n').map((l) => l.trim());
    } catch (err) {
      this.log.debug('can\'t read .env file', err);
      return;
    }

    for (const line of data) {
      if (!line || line.startsWith('#')) continue;

      const idx = line.indexOf('=');
      if (idx <= 0) continue;

      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/(^"|"$)/g, '');

      if (ENV_KEYS.indexOf(key) >= 0) {
        // ignore if this env is already set
        if (process.env[key]) continue;

        // set this env
        process.env[key] = val;
        this.log.debug(`read ${key}=${val} from .env file`);
      }
    }
  }

  /**
   * Handler process exit.
   * This will stop all timeouts and close the socket connection.
   */
  private exit (): void {
    this.shouldExit = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.socket.end();
  }
}

// create an instance of the main class for startup
new Ds18b20Remote();
