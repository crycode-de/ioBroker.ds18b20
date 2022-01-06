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
                    reject(new Error(`No response from remote system ${clientSystemId}`));
                }, 5000);
                this.on('sensorData', handler);
            });
            this.send(client.socket, {
                cmd: 'read',
                ts: requestTs,
                address: sensorAddress,
            })
                .catch((err) => {
                this.adapter.log.error(`Error while sending request to remote system ${clientSystemId}: ${err}`);
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
                })
                    .catch((err) => {
                    this.adapter.log.error(`Error while sending request to remote system ${client.systemId}: ${err}`);
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
        this.send(socket, { cmd: 'clientInfo', protocolVersion: common_1.REMOTE_PROTOCOL_VERSION })
            .catch((err) => {
            this.adapter.log.error(`Error while sending request to remote system ${socketId}: ${err}`);
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9yZW1vdGUtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLG1DQUFzQztBQUV0Qyw2QkFJYTtBQUViLHFEQUEyQztBQUczQyw0Q0FBNEU7QUE0QjVFLE1BQWEsa0JBQW1CLFNBQVEscUJBQVk7SUE0QmxELFlBQWEsSUFBWSxFQUFFLE1BQWMsRUFBRSxPQUF1QjtRQUNoRSxLQUFLLEVBQUUsQ0FBQztRQVRGLFlBQU8sR0FBaUMsRUFBRSxDQUFDO1FBTTNDLG1CQUFjLEdBQW1DLEVBQUUsQ0FBQztRQUsxRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUV2QixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWhELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxrQkFBWSxHQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXBELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUtNLFdBQVc7UUFDaEIsT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQzlDLENBQUM7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