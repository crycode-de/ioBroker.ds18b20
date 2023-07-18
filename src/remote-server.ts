/**
 * Server for remote connections.
 */

import { EventEmitter } from 'events';

import {
  createServer,
  Server,
  Socket,
} from 'net';

import { boundMethod } from 'autobind-decorator';

import type { Ds18b20Adapter } from './main';
import {
  decrypt,
  encrypt,
  REMOTE_PROTOCOL_VERSION,
} from './remote/common';

/**
 * Information about a connected client.
 */
interface RemoteClient {
  socket: Socket;
  systemId: string;
}

/**
 * Interface to declare events for the RemoteSensorServer class.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface RemoteSensorServer {
  on (event: 'listening', listener: () => void): this;
  on (event: 'error', listener: (err: Error) => void): this;
  on (event: 'sensorData', listener: (data: RemoteDataRead) => void): this;
  on (event: 'searchData', listener: (data: RemoteDataSearch) => void): this;
  on (event: 'remotesChanged', listener: (remotes: string[]) => void): this;

  emit (event: 'listening'): boolean;
  emit (event: 'error', err: Error): boolean;
  emit (event: 'sensorData', data: RemoteDataRead): boolean;
  emit (event: 'searchData', data: RemoteDataSearch): boolean;
  emit (event: 'remotesChanged', data: string[]): boolean;
}

/**
 * Server for remote connections.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class RemoteSensorServer extends EventEmitter {

  /**
   * Instance of the adapter.
   */
  private adapter: Ds18b20Adapter;

  /**
   * Buffer containing the 32 bit encryption key.
   */
  private encryptionKey: Buffer;

  /**
   * Instance of the tcp server to handle socket connections.
   */
  private server: Server;

  /**
   * Connected sockets.
   */
  private sockets: Record<string, RemoteClient> = {};

  /**
   * Timeouts for sockets.
   * Used to disconnect a socket after idle before it is identified.
   */
  private socketTimeouts: Record<string, ioBroker.Timeout> = {};

  constructor (port: number, encKey: string, adapter: Ds18b20Adapter) {
    super();

    this.adapter = adapter;

    this.encryptionKey = Buffer.from(encKey, 'hex');

    this.server = createServer();

    this.server.on('connection', this.handleConnection);

    this.server.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this.server.listen(port, () => {
      this.emit('listening');
    });
  }

  /**
   * Returns if the server is listening for connections.
   */
  public isListening (): boolean {
    return this.server.listening;
  }

  /**
   * Returns an array of the system IDs of all currently connected remote systems.
   */
  public getConnectedSystems (): string[] {
    const systems: string[] = [];
    for (const socketId in this.sockets) {
      systems.push(this.sockets[socketId].systemId);
    }
    return systems;
  }

  /**
   * Read from a remote sensor.
   * @param clientSystemId The system ID of the remote client to send the request to.
   * @param sensorAddress The sensor address.
   */
  public async read (clientSystemId: string, sensorAddress: string): Promise<string> {
    // get the socket
    let client: RemoteClient | null = null;
    for (const socketId in this.sockets) {
      if (this.sockets[socketId].systemId === clientSystemId) {
        client = this.sockets[socketId];
        break;
      }
    }

    if (!client) {
      // client not connected
      throw new Error(`Remote system ${clientSystemId} is not connected.`);
    }

    // timestamp for the request, used to identify response
    const requestTs = Date.now();

    // prepare promise to wait for feedback with a timeout of 5 seconds
    const prom = new Promise<string>((resolve, reject) => {
      let timeout: ioBroker.Timeout | null = null;

      const handler = (data: RemoteDataRead): void => {
        if (typeof data !== 'object' || data.address !== sensorAddress || data.ts !== requestTs) return;
        if (timeout) {
          this.adapter.clearTimeout(timeout);
        }
        this.removeListener('sensorData', handler);
        resolve(data.raw || '');
      };

      timeout = this.adapter.setTimeout(() => {
        this.removeListener('sensorData', handler);
        reject(new Error(`No response from remote system ${clientSystemId}`));
      }, 5000);

      this.on('sensorData', handler);
    });

    // send the request (async but don't wait)
    this.send(client.socket, {
      cmd: 'read',
      ts: requestTs,
      address: sensorAddress,
    })
      .catch((err) => {
        this.adapter.log.error(`Error while sending request to remote system ${clientSystemId}: ${err}`);
      });

    // wait for the feedback promise to resolve
    const raw = await prom;

    return raw;
  }

  /**
   * Search for sensors an all currently connected remote systems.
   */
  public async search (): Promise<SearchedSensor[]> {
    const sensors: SearchedSensor[] = [];

    // array of promises for parallel search on all remote systems
    const proms: Promise<SearchedSensor[]>[] = [];

    for (const socketId in this.sockets) {
      const client = this.sockets[socketId];

      // timestamp for the request, used to identify response
      const requestTs = Date.now();

      // send the request (async but don't wait)
      this.send(client.socket, {
        cmd: 'search',
        ts: requestTs,
        systemId: client.systemId,
      })
        .catch((err) => {
          this.adapter.log.error(`Error while sending request to remote system ${client.systemId}: ${err}`);
        });

      // wait for feedback with a timeout of 5 seconds
      proms.push(new Promise<SearchedSensor[]>((resolve, reject) => {
        let timeout: ioBroker.Timeout | null = null;

        const handler = (data: RemoteDataSearch): void => {
          if (typeof data !== 'object' || data.systemId !== client.systemId || data.ts !== requestTs) return;
          if (timeout) {
            this.adapter.clearTimeout(timeout);
          }
          this.removeListener('sensorData', handler);
          if (!Array.isArray(data.addresses)) {
            data.addresses = [];
          }
          resolve(data.addresses.map((a) => ({ address: a, remoteSystemId: client.systemId })));
        };

        timeout = this.adapter.setTimeout(() => {
          this.removeListener('sensorData', handler);
          reject(new Error(`No response from remote system ${client.systemId}`));
        }, 5000);

        this.on('searchData', handler);
      }));
    }

    const results = await Promise.all(proms);
    results.forEach((r) => sensors.push(...r));

    return sensors;
  }

  /**
   * Stop the server and close all socket connections.
   */
  public stop (): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  /**
   * Handler for new socket connections.
   * @param socket The connected socket.
   */
  @boundMethod
  private handleConnection (socket: Socket): void {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    this.adapter.log.debug(`socket connect ${socketId}`);

    socket.on('close', () => {
      this.adapter.log.debug(`socket closed ${socketId}`);
      if (this.sockets[socketId]) {
        this.adapter.log.info(`Remote system ${this.sockets[socketId].systemId} (${socketId}) disconnected`);
      } else {
        this.adapter.log.info(`Remote system ${socketId} disconnected`);
      }

      if (this.socketTimeouts[socketId]) {
        this.adapter.clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];
      }

      delete this.sockets[socketId];

      this.emit('remotesChanged', this.getConnectedSystems());
    });

    // collect all incoming data and split it by `\n`
    let dataStr = '';
    socket.on('data', (data: Buffer) => {
      dataStr += data.toString();

      // dataStr may contain multiple `\n`!
      let idx = dataStr.indexOf('\n');
      while (idx > 0) {
        const raw = dataStr.slice(0, idx);
        dataStr = dataStr.slice(idx+1);
        this.handleSocketData(socketId, socket, raw);
        idx = dataStr.indexOf('\n');
      }
    });

    // set timeout to close unknown sockets after 5 seconds
    this.socketTimeouts[socketId] = this.adapter.setTimeout(() => {
      this.adapter.log.warn(`Disconnecting remote ${socketId} due to inactivity before identification`);
      socket.destroy();
      delete this.socketTimeouts[socketId];
    }, 5000);

    // request client information
    this.send(socket, { cmd: 'clientInfo', protocolVersion: REMOTE_PROTOCOL_VERSION })
      .catch((err) => {
        this.adapter.log.error(`Error while sending request to remote system ${socketId}: ${err}`);
      });
  }

  /**
   * Handler for received encrypted messages from a socket.
   * @param socketId The ID of the related socket.
   * @param socket The socket from which the data was received.
   * @param raw The encrypted received data.
   */
  private handleSocketData (socketId: string, socket: Socket, raw: string): void {

    // try to decrypt and parse the data
    let data: RemoteData;
    try {
      const dataStr = decrypt(raw, this.encryptionKey);
      data = JSON.parse(dataStr);
    } catch (err: any) {
      this.adapter.log.warn(`Decrypt of data from ${socketId} failed! ${err.toString()}`);
      // close the socket
      socket.destroy();
      return;
    }

    this.adapter.log.debug(`data from remote ${socketId}: ${JSON.stringify(data)}`);

    switch (data.cmd) {
      case 'clientInfo':
        // got client information
        if (!data.systemId) {
          this.adapter.log.warn(`Got invalid data from remote ${socketId}!`);
          return;
        }

        // clear the close timeout
        this.adapter.clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];

        // save as known socket
        this.sockets[socketId] = {
          socket: socket,
          systemId: data.systemId,
        };

        this.adapter.log.info(`Remote system ${data.systemId} connected from ${socket.remoteAddress}`);

        // check the protocol version
        if (data.protocolVersion !== REMOTE_PROTOCOL_VERSION) {
          this.adapter.log.warn(`Protocol version ${data.protocolVersion} from remote system ${data.systemId} does not match the adapter protocol version ${REMOTE_PROTOCOL_VERSION}! Please reinstall the remote client.`);
        }

        this.emit('remotesChanged', this.getConnectedSystems());

        break;

      case 'read':
        // got sensor data
        this.emit('sensorData', data);
        break;

      case 'search':
        // got search data
        this.emit('searchData', data);
        break;

      default:
        this.adapter.log.warn(`Unknown command from remote system ${socketId}.`);
    }
  }

  /**
   * Send some data to a remote system.
   * The data will be stringified and encrypted before sending.
   * @param socket The socket to send the data to.
   * @param data The data object to send.
   */
  private async send (socket: Socket, data: RemoteData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      socket.write(encrypt(JSON.stringify(data), this.encryptionKey) + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
