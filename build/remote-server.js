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
const core_decorators_1 = require("core-decorators");
const common_1 = require("./remote/common");
class RemoteSensorServer extends events_1.EventEmitter {
    constructor(port, encKey, adapter) {
        super();
        this.sockets = {};
        this.socketTimeouts = {};
        this.adapter = adapter;
        this.encryptionKey = Buffer.from(encKey, 'hex');
        this.server = (0, net_1.createServer)();
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
            let client = null;
            for (const socketId in this.sockets) {
                if (this.sockets[socketId].systemId === clientSystemId) {
                    client = this.sockets[socketId];
                    break;
                }
            }
            if (!client) {
                throw new Error(`Remote system ${clientSystemId} is not connected.`);
            }
            const requestTs = Date.now();
            const prom = new Promise((resolve, reject) => {
                let timeout = null;
                const handler = (data) => {
                    if (typeof data !== 'object' || data.address !== sensorAddress || data.ts !== requestTs)
                        return;
                    if (timeout)
                        clearTimeout(timeout);
                    this.removeListener('sensorData', handler);
                    resolve(data.raw || '');
                };
                timeout = setTimeout(() => {
                    this.removeListener('sensorData', handler);
                    reject(new Error(`No response from remote system ${client === null || client === void 0 ? void 0 : client.systemId}`));
                }, 5000);
                this.on('sensorData', handler);
            });
            this.send(client.socket, {
                cmd: 'read',
                ts: requestTs,
                address: sensorAddress,
            });
            const raw = yield prom;
            return raw;
        });
    }
    search() {
        return __awaiter(this, void 0, void 0, function* () {
            const sensors = [];
            const proms = [];
            for (const socketId in this.sockets) {
                const client = this.sockets[socketId];
                const requestTs = Date.now();
                this.send(client.socket, {
                    cmd: 'search',
                    ts: requestTs,
                    systemId: client.systemId,
                });
                proms.push(new Promise((resolve, reject) => {
                    let timeout = null;
                    const handler = (data) => {
                        if (typeof data !== 'object' || data.systemId !== client.systemId || data.ts !== requestTs)
                            return;
                        if (timeout)
                            clearTimeout(timeout);
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
            const results = yield Promise.all(proms);
            results.forEach((r) => sensors.push(...r));
            return sensors;
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
                this.adapter.log.info(`Remote system ${this.sockets[socketId].systemId} (${socketId}) disconnected`);
            }
            else {
                this.adapter.log.info(`Remote system ${socketId} disconnected`);
            }
            if (this.socketTimeouts[socketId]) {
                clearTimeout(this.socketTimeouts[socketId]);
                delete this.socketTimeouts[socketId];
            }
            delete this.sockets[socketId];
        });
        let dataStr = '';
        socket.on('data', (data) => {
            dataStr += data.toString();
            let idx = dataStr.indexOf('\n');
            while (idx > 0) {
                const raw = dataStr.slice(0, idx);
                dataStr = dataStr.slice(idx + 1);
                this.handleSocketData(socketId, socket, raw);
                idx = dataStr.indexOf('\n');
            }
        });
        this.socketTimeouts[socketId] = setTimeout(() => {
            this.adapter.log.warn(`Disconnecting remote ${socketId} due to inactivity before identification`);
            socket.destroy();
            delete this.socketTimeouts[socketId];
        }, 5000);
        this.send(socket, { cmd: 'clientInfo', protocolVersion: common_1.REMOTE_PROTOCOL_VERSION });
    }
    handleSocketData(socketId, socket, raw) {
        let data;
        try {
            const dataStr = (0, common_1.decrypt)(raw, this.encryptionKey);
            data = JSON.parse(dataStr);
        }
        catch (err) {
            this.adapter.log.warn(`Decrypt of data from ${socketId} failed! ${err.toString()}`);
            socket.destroy();
            return;
        }
        this.adapter.log.debug(`data from remote ${socketId}: ${JSON.stringify(data)}`);
        switch (data.cmd) {
            case 'clientInfo':
                if (!data.systemId) {
                    this.adapter.log.warn(`Got invalid data from remote ${socketId}!`);
                    return;
                }
                clearTimeout(this.socketTimeouts[socketId]);
                delete this.socketTimeouts[socketId];
                this.sockets[socketId] = {
                    socket: socket,
                    systemId: data.systemId,
                };
                this.adapter.log.info(`Remote system ${data.systemId} connected from ${socket.remoteAddress}`);
                if (data.protocolVersion !== common_1.REMOTE_PROTOCOL_VERSION) {
                    this.adapter.log.warn(`Protocol version ${data.protocolVersion} from remote system ${data.systemId} does not match the adapter protocol version ${common_1.REMOTE_PROTOCOL_VERSION}! Please reinstall the remote client.`);
                }
                break;
            case 'read':
                this.emit('sensorData', data);
                break;
            case 'search':
                this.emit('searchData', data);
                break;
            default:
                this.adapter.log.warn(`Unknown command from remote system ${socketId}.`);
        }
    }
    send(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                socket.write((0, common_1.encrypt)(JSON.stringify(data), this.encryptionKey) + '\n', (err) => {
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