
import { EventEmitter } from 'events';

import {
  createServer,
  Server,
  Socket,
} from 'net';
/**
 *  Class for the server to handle remote sensors.
 */

import { autobind } from 'core-decorators';

import { Ds18b20Adapter } from './main';
import { decrypt, encrypt } from './common/crypt';
import {
  RemoteData,
  RemoteDataRead,
  RemoteDataSearch,
  SearchSensor,
} from './common/types';

/**
 * Information about a connected client.
 */
interface RemoteClient {
  socket: Socket;
  systemId: string;
}

export class RemoteSensorServer extends EventEmitter {

  private adapter: Ds18b20Adapter;
  private encyptionKey: Buffer;

  private server: Server;

  private sockets: Record<string, RemoteClient> = {};
  private socketTimeouts: Record<string, NodeJS.Timeout> = {};

  constructor (port: number, encKey: string, adapter: Ds18b20Adapter) {
    super();

    this.encyptionKey = Buffer.from(encKey, 'hex');
    this.adapter = adapter;

    this.server = createServer();

    this.server.on('connection', this.handleConnection);

    this.server.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this.server.listen(port, () => {
      this.emit('listening');
    });
  }

  public isListening (): boolean {
    return this.server && this.server.listening;
  }

  public getConnectedSystems (): string[] {
    const systems: string[] = [];
    for (const socketId in this.sockets) {
      systems.push(this.sockets[socketId].systemId);
    }
    return systems;
  }

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

    // send the request (async but don't wait)
    this.send(client.socket, {
      cmd: 'read',
      ts: requestTs,
      address: sensorAddress,
    });

    // wait for feedback with a timeout of 5 seconds
    const raw = await new Promise<string>((resolve, reject) => {
      let timeout: NodeJS.Timeout | null = null;

      const handler = (data: RemoteDataRead): void => {
        if (typeof data !== 'object' || data.address !== sensorAddress || data.ts !== requestTs) return;
        if (timeout) clearTimeout(timeout);
        this.removeListener('sensorData', handler);
        resolve(data.raw || '');
      };

      timeout = setTimeout(() => {
        this.removeListener('sensorData', handler);
        reject(new Error('No response from remote system'));
      }, 5000);

      this.on('sensorData', handler);
    });

    return raw;
  }

  public async search (): Promise<SearchSensor[]> {
    const sensors: SearchSensor[] = [];

    const proms: Promise<SearchSensor[]>[] = [];

    for (const socketId in this.sockets) {
      const client = this.sockets[socketId];

      // timestamp for the request, used to identify response
      const requestTs = Date.now();

      // send the request (async but don't wait)
      this.send(client.socket, {
        cmd: 'search',
        ts: requestTs,
        systemId: client.systemId,
      });

      // wait for feedback with a timeout of 5 seconds
      proms.push(new Promise<SearchSensor[]>((resolve, reject) => {
        let timeout: NodeJS.Timeout | null = null;

        const handler = (data: RemoteDataSearch): void => {
          if (typeof data !== 'object' || data.systemId !== client.systemId || data.ts !== requestTs) return;
          if (timeout) clearTimeout(timeout);
          this.removeListener('sensorData', handler);
          if (!Array.isArray(data.addresses)) {
            data.addresses = [];
          }
          resolve(data.addresses.map((a) => ({ address: a, remoteSystemId: client.systemId })));
        };

        timeout = setTimeout(() => {
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

  public stop (): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  @autobind
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
        clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];
      }

      delete this.sockets[socketId];
    });

    // collect all incoming data and split it by `\n`
    let dataStr = '';
    socket.on('data', (data: Buffer) => {
      dataStr += data.toString();

      const idx = dataStr.indexOf('\n');
      if (idx > 0) {
        const raw = dataStr.slice(0, idx);
        dataStr = dataStr.slice(idx+1);
        this.handleSocketData(socketId, socket, raw);
      }
    });

    // set timeout to close unknown sockets after 5 seconds
    this.socketTimeouts[socketId] = setTimeout(() => {
      this.adapter.log.warn(`Disconnecting remote ${socketId} due to inactivity before identification`);
      socket.destroy();
      delete this.socketTimeouts[socketId];
    }, 5000);

    // request client information
    this.send(socket, { cmd: 'clientInfo' });
  }

  private handleSocketData (socketId: string, socket: Socket, raw: string): void {

    // try to decrypt and parse the data
    let data: RemoteData;
    try {
      const dataStr = decrypt(raw, this.encyptionKey);
      data = JSON.parse(dataStr);
    } catch (err) {
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
        clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];

        // save as known socket
        this.sockets[socketId] = {
          socket: socket,
          systemId: data.systemId,
        };

        this.adapter.log.info(`Remote system ${data.systemId} connected from ${socket.remoteAddress}`);
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

  private async send (socket: Socket, data: RemoteData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      socket.write(encrypt(JSON.stringify(data), this.encyptionKey) + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  }
}