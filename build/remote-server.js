"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSensorServer = void 0;
const events_1 = require("events");
const net_1 = require("net");
/**
 *  Class for the server to handle remote sensors.
 */
const core_decorators_1 = require("core-decorators");
const crypt_1 = require("./common/crypt");
class RemoteSensorServer extends events_1.EventEmitter {
    constructor(port, encKey, adapter) {
        super();
        this.sockets = {};
        this.socketTimeouts = {};
        this.encyptionKey = Buffer.from(encKey, 'hex');
        this.adapter = adapter;
        this.server = net_1.createServer();
        this.server.on('connection', this.handleConnection);
        this.server.on('error', (err) => {
            this.emit('error', err);
        });
        this.server.listen(port, () => {
            this.emit('listening');
        });
    }
    isListening() {
        return this.server && this.server.listening;
    }
    getConnectedSystems() {
        const systems = [];
        for (const socketId in this.sockets) {
            systems.push(this.sockets[socketId].systemId);
        }
        return systems;
    }
    read(clientSystemId, sensorAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            // get the socket
            let client = null;
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
            yield this.send(client.socket, {
                cmd: 'read',
                address: sensorAddress,
            });
            // TODO: handle the response for callback functions
        });
    }
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }
    handleConnection(socket) {
        const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.adapter.log.debug(`socket connect ${socketId}`);
        socket.on('close', () => {
            this.adapter.log.debug(`socket closed ${socketId}`);
            if (this.sockets[socketId]) {
                this.adapter.log.info(`Remote client ${this.sockets[socketId].systemId} (${socketId}) disconnected`);
            }
            else {
                this.adapter.log.info(`Remote client ${socketId} disconnected`);
            }
            delete this.sockets[socketId];
        });
        // collect all incoming data and split it by `\n`
        let dataStr = '';
        socket.on('data', (data) => {
            dataStr += data.toString();
            const idx = dataStr.indexOf('\n');
            if (idx > 0) {
                const raw = dataStr.slice(0, idx);
                dataStr = dataStr.slice(idx + 1);
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
    handleSocketData(socketId, socket, raw) {
        // try to decrypt and parse the data
        let data;
        try {
            const dataStr = crypt_1.decrypt(raw, this.encyptionKey);
            data = JSON.parse(dataStr);
        }
        catch (err) {
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
    send(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                socket.write(crypt_1.encrypt(JSON.stringify(data), this.encyptionKey) + '\n', (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
}
__decorate([
    core_decorators_1.autobind
], RemoteSensorServer.prototype, "handleConnection", null);
exports.RemoteSensorServer = RemoteSensorServer;
//# sourceMappingURL=remote-server.js.map