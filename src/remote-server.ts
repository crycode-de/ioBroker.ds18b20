
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

import { RemoteData } from './common/types';

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

  public async read (clientSystemId: string, sensorAddress: string): Promise<void> {
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
      this.adapter.log.warn(`No remote client ${clientSystemId} is not connected.`);
      throw new Error('Client not connected');
    }

    await this.send(client.socket, {
      cmd: 'read',
      address: sensorAddress,
    });

    // TODO: handle the response for callback functions
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
        this.adapter.log.info(`Remote client ${this.sockets[socketId].systemId} (${socketId}) disconnected`);
      } else {
        this.adapter.log.info(`Remote client ${socketId} disconnected`);
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
      this.adapter.log.warn(`Disconnection remote ${socketId} due to inactivity`);
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

        this.adapter.log.info(`Remote client ${data.systemId} connected from ${socket.remoteAddress}`);
        break;

      case 'read':
        // got sensor data
        const sensor = this.adapter.getSensor(data.address);
        if (!sensor) {
          this.adapter.log.warn(`Got remote data for unknown sensor ${data.address}.`);
          return;
        }

        sensor.processData(data.raw || '');

      case 'search':
        // got search data


      default:
        this.adapter.log.warn(`Unknown command "${data.cmd}" from client ${socketId}.`);
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