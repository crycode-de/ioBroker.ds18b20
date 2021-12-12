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
exports.Ds18b20Adapter = void 0;
const util_1 = require("util");
const fs = require("fs");
const readFile = (0, util_1.promisify)(fs.readFile);
const readDir = (0, util_1.promisify)(fs.readdir);
const crypto = require("crypto");
const utils = require("@iobroker/adapter-core");
const core_decorators_1 = require("core-decorators");
const sensor_1 = require("./sensor");
const remote_server_1 = require("./remote-server");
class Ds18b20Adapter extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: 'ds18b20' }));
        this.sensors = {};
        this.remoteSensorServer = null;
        this.on('ready', this.onReady);
        this.on('stateChange', this.onStateChange);
        this.on('message', this.onMessage);
        this.on('unload', this.onUnload);
    }
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setState('info.connection', false, true);
            if (!this.config.w1DevicesPath) {
                this.config.w1DevicesPath = '/sys/bus/w1/devices';
            }
            if (this.config.remoteEnabled) {
                if (this.supportsFeature && !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
                    this.log.warn('The server for remote sensors is enabled but decrypt native is not supported! The encryption key will be stored unencrypted in the ioBroker database. To get decrypt native support, please upgrade js-controller to v3.0 or greater.');
                }
                if (!this.config.remotePort || this.config.remotePort <= 0) {
                    this.log.warn('Config: Invalid port for the remote sensor server! Using default port 1820.');
                    this.config.remotePort = 1820;
                }
                if (typeof this.config.remoteKey !== 'string' || this.config.remoteKey.length !== 64) {
                    this.config.remoteKey = crypto.randomBytes(32).toString('hex');
                    this.log.error(`Config: Invalid key for the remote sensor server! Using random key "${this.config.remoteKey}".`);
                }
                this.remoteSensorServer = new remote_server_1.RemoteSensorServer(this.config.remotePort, this.config.remoteKey, this);
                this.remoteSensorServer.on('listening', () => {
                    this.log.info(`Remote sensor server is listening on port ${this.config.remotePort}`);
                    this.updateInfoConnection();
                });
                this.remoteSensorServer.on('error', (err) => {
                    this.log.warn(`Remote sensor server error: ${err.toString()}`);
                    this.log.debug(`${err.toString()} ${err.stack}`);
                    this.updateInfoConnection();
                });
            }
            this.getForeignObjects(this.namespace + '.sensors.*', 'state', (err, objects) => {
                var _a;
                if (err) {
                    this.log.error('error loading sensors data objects');
                    return;
                }
                for (const objectId in objects) {
                    const obj = objects[objectId];
                    if (typeof ((_a = obj.native) === null || _a === void 0 ? void 0 : _a.address) !== 'string') {
                        this.log.warn(`Object ${obj._id} has no valid address!`);
                        continue;
                    }
                    if (obj.native.enabled === false) {
                        this.log.debug(`Sensor ${obj.native.address} is not enabled and will be ignored.`);
                        continue;
                    }
                    if (obj.native.remoteSystemId && !this.config.remoteEnabled) {
                        this.log.warn(`Sensor ${obj.native.address} is configured as remote sensor of ${obj.native.remoteSystemId} but remote sensors are not enabled!`);
                        continue;
                    }
                    this.sensors[obj._id] = new sensor_1.Sensor({
                        w1DevicesPath: this.config.w1DevicesPath,
                        id: obj._id,
                        address: obj.native.address,
                        interval: typeof obj.native.interval === 'number' ? obj.native.interval : this.config.defaultInterval,
                        nullOnError: !!obj.native.nullOnError,
                        factor: typeof obj.native.factor === 'number' ? obj.native.factor : 1,
                        offset: typeof obj.native.offset === 'number' ? obj.native.offset : 0,
                        decimals: typeof obj.native.decimals === 'number' ? obj.native.decimals : null,
                        remoteSystemId: typeof obj.native.remoteSystemId === 'string' ? obj.native.remoteSystemId : null,
                    }, this);
                    this.sensors[obj._id].on('value', this.handleSensorValue);
                    this.sensors[obj._id].on('error', this.handleSensorError);
                    this.sensors[obj._id].on('errorStateChanged', this.handleSensorErrorStateChanged);
                }
                this.log.debug(`loaded ${Object.keys(this.sensors).length} sensors`);
            });
            this.subscribeStates('actions.*');
        });
    }
    onUnload(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (const address in this.sensors) {
                    this.sensors[address].stop();
                }
                if (this.remoteSensorServer) {
                    yield this.remoteSensorServer.stop();
                }
                yield this.setStateAsync('info.connection', false, true);
            }
            catch (e) { }
            callback();
        });
    }
    handleSensorValue(value, id) {
        if (!this.sensors[id])
            return;
        this.log.debug(`got value ${value} from sensor ${this.sensors[id].address}`);
        if (value === null) {
            this.setStateAsync(id, {
                ack: true,
                val: null,
                q: 0x81,
            });
        }
        else {
            this.setStateAsync(id, {
                ack: true,
                val: value,
            });
        }
    }
    handleSensorError(err, id) {
        this.log.warn(`Error reading sensor ${this.sensors[id].address}: ${err}`);
    }
    handleSensorErrorStateChanged(hasError, id) {
        this.log.debug(`error state of sensor ${this.sensors[id].address} changed to ${hasError}`);
        this.updateInfoConnection();
    }
    updateInfoConnection() {
        if (this.remoteSensorServer && !this.remoteSensorServer.isListening()) {
            this.setStateAsync('info.connection', false, true);
            return;
        }
        for (const id in this.sensors) {
            if (this.sensors[id].hasError) {
                this.setStateAsync('info.connection', false, true);
                return;
            }
        }
        this.setStateAsync('info.connection', true, true);
    }
    getSensor(idOrAddress) {
        if (this.sensors[idOrAddress])
            return this.sensors[idOrAddress];
        for (const id in this.sensors) {
            if (this.sensors[id].address === idOrAddress) {
                return this.sensors[id];
            }
        }
        return null;
    }
    readNow(idOrAddress) {
        if (typeof idOrAddress !== 'string' || idOrAddress === 'all' || idOrAddress === '') {
            this.log.info(`Read data from all sensors now`);
            for (const addr in this.sensors) {
                this.sensors[addr].read();
            }
        }
        else {
            const sens = this.getSensor(idOrAddress);
            if (!sens) {
                this.log.warn(`No sensor with address or id ${idOrAddress} found!`);
                return;
            }
            this.log.info(`Read data from sensor ${sens.address} now`);
            sens.read();
        }
    }
    onStateChange(id, state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (state) {
                this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack}) ` + JSON.stringify(state));
                if (state.ack === true)
                    return;
                switch (id) {
                    case this.namespace + '.actions.readNow':
                        this.readNow(state.val);
                        this.setStateAsync(this.namespace + '.actions.readNow', '', true);
                        break;
                }
            }
            else {
                this.log.debug(`state ${id} deleted`);
            }
        });
    }
    onMessage(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('got message ' + JSON.stringify(obj));
            if (typeof obj === 'object' && obj.message) {
                switch (obj.command) {
                    case 'readNow':
                        if (typeof obj.message === 'string') {
                            this.readNow(obj.message);
                        }
                        else {
                            this.readNow();
                        }
                        break;
                    case 'read':
                        if (typeof obj.message === 'string') {
                            const sens = this.getSensor(obj.message);
                            if (!sens) {
                                this.log.debug('no such sensor');
                                return this.sendTo(obj.from, obj.command, { err: 'No such sensor', value: null }, obj.callback);
                            }
                            sens.read((err, value) => {
                                if (err) {
                                    this.log.debug(err.toString());
                                    this.sendTo(obj.from, obj.command, { err: err.toString(), value: null }, obj.callback);
                                }
                                else {
                                    this.sendTo(obj.from, obj.command, { err: null, value: value }, obj.callback);
                                }
                            });
                        }
                        else {
                            this.log.debug('no address or id given');
                            return this.sendTo(obj.from, obj.command, { err: 'No sensor address or id given', value: null }, obj.callback);
                        }
                        break;
                    case 'getRemoteSystems':
                        if (!obj.callback)
                            return;
                        if (!this.remoteSensorServer) {
                            this.sendTo(obj.from, obj.command, [], obj.callback);
                            return;
                        }
                        const systems = this.remoteSensorServer.getConnectedSystems();
                        this.sendTo(obj.from, obj.command, systems, obj.callback);
                        break;
                    case 'search':
                        if (!obj.callback)
                            return;
                        const sensors = [];
                        let err = null;
                        try {
                            const files = yield readDir(this.config.w1DevicesPath);
                            const proms = [];
                            for (let i = 0; i < files.length; i++) {
                                if (!files[i].match(/^w1_bus_master\d+$/)) {
                                    continue;
                                }
                                this.log.debug(`reading ${this.config.w1DevicesPath}/${files[i]}/w1_master_slaves`);
                                proms.push(readFile(`${this.config.w1DevicesPath}/${files[i]}/w1_master_slaves`, 'utf8'));
                            }
                            const localSensors = (yield Promise.all(proms)).reduce((acc, cur) => {
                                acc.push(...cur.trim().split('\n'));
                                return acc;
                            }, []).map((addr) => ({ address: addr, remoteSystemId: '' }));
                            sensors.push(...localSensors);
                        }
                        catch (er) {
                            this.log.warn(`Error while searching for local sensors: ${er.toString()}`);
                            if (!this.config.remoteEnabled) {
                                err = er;
                            }
                        }
                        if (this.config.remoteEnabled && this.remoteSensorServer) {
                            try {
                                const remoteSensors = yield this.remoteSensorServer.search();
                                sensors.push(...remoteSensors);
                            }
                            catch (er) {
                                this.log.warn(`Error while searching for remote sensors: ${er.toString()}`);
                            }
                        }
                        this.log.debug(`sensors found: ${JSON.stringify(sensors)}`);
                        this.sendTo(obj.from, obj.command, { err, sensors }, obj.callback);
                        break;
                }
            }
        });
    }
}
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "onReady", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "onUnload", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "handleSensorValue", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "handleSensorError", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "handleSensorErrorStateChanged", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "onStateChange", null);
__decorate([
    core_decorators_1.autobind
], Ds18b20Adapter.prototype, "onMessage", null);
exports.Ds18b20Adapter = Ds18b20Adapter;
if (module.parent) {
    module.exports = (options) => new Ds18b20Adapter(options);
}
else {
    (() => new Ds18b20Adapter())();
}
//# sourceMappingURL=main.js.map