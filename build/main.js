"use strict";
/**
 * ioBroker DS18B20 1-wire temperature sensor adapter.
 *
 * (C) 2019 Peter Müller <peter@crycode.de> (https://github.com/crycode-de/ioBroker.ds18b20)
 */
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
const readFile = util_1.promisify(fs.readFile);
const readDir = util_1.promisify(fs.readdir);
const crypto = require("crypto");
const utils = require("@iobroker/adapter-core");
const core_decorators_1 = require("core-decorators");
const sensor_1 = require("./sensor");
const remote_server_1 = require("./remote-server");
/**
 * The ds18b20 adapter.
 */
class Ds18b20Adapter extends utils.Adapter {
    /**
     * Constructor to create a new instance of the adapter.
     * @param options The adapter options.
     */
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: 'ds18b20' }));
        /**
         * Mapping of the ioBroker object IDs to the sensor class instances.
         */
        this.sensors = {};
        /**
         * The server for remote sensors if enabled.
         */
        this.remoteSensorServer = null;
        this.on('ready', this.onReady);
        this.on('stateChange', this.onStateChange);
        this.on('message', this.onMessage);
        this.on('unload', this.onUnload);
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            // Reset the connection indicator during startup
            this.setState('info.connection', false, true);
            // Debug log the current config
            this.log.debug('config: ' + JSON.stringify(this.config));
            // set default devices path if not defined
            if (!this.config.w1DevicesPath) {
                this.config.w1DevicesPath = '/sys/bus/w1/devices';
            }
            // remote sensor server
            if (this.config.remoteEnabled) {
                // check decrypt native and show a warning in case of unsupportet
                if (this.supportsFeature && !this.supportsFeature('ADAPTER_AUTO_DECRYPT_NATIVE')) {
                    this.log.warn('The server for remote sensors is enabled but decrypt native is not supported! The encryption key will be stored in unencrypted in the ioBroker database. To get decrypt native support, please upgrade js-controller to v3.0 or greater.');
                }
                // check the port
                if (!this.config.remotePort || this.config.remotePort <= 0) {
                    this.log.warn('Config: Invalid port for the remote sensor server! Using default port 1820.');
                    this.config.remotePort = 1820;
                }
                // check the key
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
            // setup sensors
            this.getForeignObjects(this.namespace + '.sensors.*', 'state', (err, objects) => {
                if (err) {
                    this.log.error('error loading sensors data objects');
                    return;
                }
                for (const objectId in objects) {
                    const obj = objects[objectId];
                    if (typeof obj.native.address !== 'string') {
                        this.log.warn(`Object ${obj._id} has no valid address!`);
                        continue;
                    }
                    if (obj.native.remoteSystemId && !this.config.remoteEnabled) {
                        this.log.warn(`Object ${obj._id} is configured as remote sensor but remote sensors of ${obj.native.remoteSystemId} are not enabled!`);
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
            // subscribe needed states
            this.subscribeStates('actions.*');
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // stop all intervals from the sensors
                for (const address in this.sensors) {
                    this.sensors[address].stop();
                }
                // stop the remote sensor server
                if (this.remoteSensorServer) {
                    yield this.remoteSensorServer.stop();
                }
                // reset connection state
                yield this.setStateAsync('info.connection', false, true);
            }
            catch (e) { }
            callback();
        });
    }
    /**
     * Handler for incoming sensor values.
     * @param value The value or null in case of an error.
     * @param id    The ioBroker ID of the sensor.
     */
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
    /**
     * Handler for sensor errors.
     * @param err The error.
     * @param id  The ioBroker ID of the sensor.
     */
    handleSensorError(err, id) {
        this.log.warn(`Error reading sensor ${this.sensors[id].address}: ${err}`);
    }
    /**
     * Handler for changes of error state of a sensor.
     * This will change the info.connection state of the adapter to true if all
     * sensors are ok and false if at least one sensor has an error.
     * @param hasError Indecator if the sensor has an error or not.
     * @param id       The ioBroker ID of the sensor.
     */
    handleSensorErrorStateChanged(hasError, id) {
        this.log.debug(`error state of sensor ${this.sensors[id].address} changed to ${hasError}`);
        this.updateInfoConnection();
    }
    /**
     * Update the info.connection state depending on the error state of all
     * sensors and the listening state of the remote sensor server.
     */
    updateInfoConnection() {
        // check if remote sensor server is listening if enabled
        if (this.remoteSensorServer && !this.remoteSensorServer.isListening()) {
            // server enabled but not listening
            this.setStateAsync('info.connection', false, true);
            return;
        }
        // check all sensors for errors
        for (const id in this.sensors) {
            if (this.sensors[id].hasError) {
                // at least one sensor has an error, set connection state to false
                this.setStateAsync('info.connection', false, true);
                return;
            }
        }
        // all sensors are ok, set connection state to true
        this.setStateAsync('info.connection', true, true);
    }
    /**
     * Get a defined sensor from it's ioBroker ID or 1-wire address.
     * @param  idOrAddress The ID or address of the sensor.
     * @return             The sensor or null.
     */
    getSensor(idOrAddress) {
        if (this.sensors[idOrAddress])
            return this.sensors[idOrAddress];
        // check address
        for (const id in this.sensors) {
            if (this.sensors[id].address === idOrAddress) {
                return this.sensors[id];
            }
        }
        return null;
    }
    /**
     * Trigger the reading of a single sensor or all sensors.
     * @param idOrAddress The ioBroker ID or 1-wire address of the sensor. Use `all` or an empty string to read all sensors.
     */
    readNow(idOrAddress) {
        if (typeof idOrAddress !== 'string' || idOrAddress === 'all' || idOrAddress === '') {
            // read all sensors
            this.log.info(`Read data from all sensors now`);
            for (const addr in this.sensors) {
                this.sensors[addr].read();
            }
        }
        else {
            // read a specific sensor
            const sens = this.getSensor(idOrAddress);
            if (!sens) {
                this.log.warn(`No sensor with address or id ${idOrAddress} found!`);
                return;
            }
            this.log.info(`Read data from sensor ${sens.address} now`);
            sens.read();
        }
    }
    /**
     * Is called if a subscribed state changes.
     * @param id    The ID of the state.
     * @param state The ioBroker state.
     */
    onStateChange(id, state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (state) {
                // The state was changed
                this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack}) ` + JSON.stringify(state));
                // don't do anything if ack is set
                if (state.ack === true)
                    return;
                // handle special states
                switch (id) {
                    case this.namespace + '.actions.readNow':
                        this.readNow(state.val);
                        this.setStateAsync(this.namespace + '.actions.readNow', '', true);
                        break;
                }
            }
            else {
                // The state was deleted
                this.log.debug(`state ${id} deleted`);
            }
        });
    }
    /**
     * Some message was sent to this instance over message box (e.g. by a script).
     * @param obj The receied ioBroker message.
     */
    onMessage(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('got message ' + JSON.stringify(obj));
            if (typeof obj === 'object' && obj.message) {
                switch (obj.command) {
                    case 'readNow':
                        // we should read sensors now...
                        if (typeof obj.message === 'string') {
                            this.readNow(obj.message);
                        }
                        else {
                            this.readNow();
                        }
                        break;
                    case 'read':
                        // read a sensor
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
                        // get connected remote systems
                        // don't do anything if no callback is provided
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
                        // search for sensors
                        // don't do anything if no callback is provided
                        if (!obj.callback)
                            return;
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
                            const sensors = (yield Promise.all(proms)).reduce((acc, cur) => {
                                acc.push(...cur.trim().split('\n'));
                                return acc;
                            }, []);
                            this.log.debug(`sensors found: ${JSON.stringify(sensors)}`);
                            this.sendTo(obj.from, obj.command, { err: null, sensors }, obj.callback);
                        }
                        catch (err) {
                            this.log.warn(`Error while searching for sensors: ${err.toString()}`);
                            this.sendTo(obj.from, obj.command, { err: err.toString(), sensors: [] }, obj.callback);
                        }
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
    // Export the constructor in compact mode
    module.exports = (options) => new Ds18b20Adapter(options);
}
else {
    // otherwise start the instance directly
    (() => new Ds18b20Adapter())();
}
//# sourceMappingURL=main.js.map