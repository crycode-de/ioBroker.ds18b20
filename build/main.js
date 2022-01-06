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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU1BLCtCQUFpQztBQUVqQyx5QkFBeUI7QUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBQSxnQkFBUyxFQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFBLGdCQUFTLEVBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRXRDLGlDQUFpQztBQUVqQyxnREFBZ0Q7QUFFaEQscURBQTJDO0FBRTNDLHFDQUFrQztBQUVsQyxtREFBcUQ7QUFrQnJELE1BQWEsY0FBZSxTQUFRLEtBQUssQ0FBQyxPQUFPO0lBZ0IvQyxZQUFtQixVQUF5QyxFQUFFO1FBQzVELEtBQUssaUNBQ0EsT0FBTyxLQUNWLElBQUksRUFBRSxTQUFTLElBQ2YsQ0FBQztRQWZHLFlBQU8sR0FBMkIsRUFBRSxDQUFDO1FBS3RDLHVCQUFrQixHQUE4QixJQUFJLENBQUM7UUFZMUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFNYSxPQUFPOztZQUVuQixJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUc5QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7Z0JBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMs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