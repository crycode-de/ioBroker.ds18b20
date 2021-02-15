"use strict";
/**
 *  Class for a DS18B20 temperature sensor.
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
exports.Sensor = void 0;
const events_1 = require("events");
const util_1 = require("util");
const fs = require("fs");
const readFile = util_1.promisify(fs.readFile);
const core_decorators_1 = require("core-decorators");
const tools_1 = require("./lib/tools");
/**
 * This class represents a single sensor.
 */
class Sensor extends events_1.EventEmitter {
    /**
     * Constructor for a new sensor.
     * @param opts The options for the Sensor.
     */
    constructor(opts, adapter) {
        super();
        /**
         * Timer for interval sensor readings.
         */
        this.timer = null;
        this.adapter = adapter;
        this.id = opts.id;
        this.address = opts.address.replace(/[^0-9a-f-]/g, ''); // remove all bad chars!
        this.nullOnError = opts.nullOnError;
        this.factor = opts.factor;
        this.offset = opts.offset;
        this.decimals = opts.decimals;
        this.hasError = true; // true on init while we don't know the current state
        this.w1DevicesPath = opts.w1DevicesPath;
        this.remoteSystemId = opts.remoteSystemId;
        // start interval and inital read if interval is set
        if (opts.interval && opts.interval > 0) {
            // smallest interval is 500ms
            if (opts.interval < 500) {
                opts.interval = 500;
            }
            this.timer = setInterval(this.read, opts.interval);
            this.read();
        }
    }
    /**
     * Read the temperature.
     * The value and possible errors will be emitted as events.
     * Optionally a callback may be used.
     * @param  cb Optional callback function.
     */
    read(cb) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.remoteSystemId) {
                // remote sensor - send request
                try {
                    yield ((_a = this.adapter.remoteSensorServer) === null || _a === void 0 ? void 0 : _a.read(this.remoteSystemId, this.address));
                }
                catch (err) {
                    this.emit('error', err, this.id);
                    if (typeof cb === 'function') {
                        cb(err, null);
                    }
                }
            }
            else {
                // local sensor - read the file
                readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, 'utf8')
                    .then((raw) => this.processData(raw, cb));
            }
        });
    }
    /**
     * Process the raw data from a sensor file.
     * @param rawData The raw data read from the sensor file.
     * @param cb Optional callback function.
     */
    processData(rawData, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            const lines = rawData.split('\n');
            let val = null;
            let err = null;
            try {
                if (lines[0].indexOf('YES') > -1) {
                    // checksum ok
                    const bytes = lines[0].split(' ');
                    if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
                        // all bytes are the same
                        throw new Error('Communication error');
                    }
                    const m = lines[1].match(/t=(-?\d+)/);
                    if (!m) {
                        throw new Error('Parse error');
                    }
                    val = parseInt(m[1], 10) / 1000;
                }
                else if (lines[0].indexOf('NO') > -1) {
                    // checksum error
                    throw new Error('Checksum error');
                }
                else {
                    // read error
                    throw new Error('Read error');
                }
                // check for specific errors
                if (val === 85) {
                    throw new Error('No temperature read');
                }
                else if (val === -127) {
                    throw new Error('Device disconnected');
                }
                else if (val < -80 || val > 150) {
                    // From datasheet: Measures Temperatures from -55°C to +125°C
                    throw new Error('Read temperature is out of possible range');
                }
            }
            catch (e) {
                this.emit('error', e, this.id);
                err = e;
                val = null;
            }
            // evaluate the result
            if (val !== null) {
                val = val * this.factor + this.offset;
                if (this.decimals !== null) {
                    val = tools_1.round(val, this.decimals);
                }
            }
            if (val !== null || this.nullOnError) {
                this.emit('value', val, this.id);
            }
            if (this.hasError !== (val === null)) {
                this.hasError = (val === null);
                this.emit('errorStateChanged', this.hasError, this.id);
            }
            if (typeof cb === 'function') {
                cb(err, val);
            }
        });
    }
    /**
     * Stop a running interval for automated readings.
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
__decorate([
    core_decorators_1.autobind
], Sensor.prototype, "read", null);
exports.Sensor = Sensor;
//# sourceMappingURL=sensor.js.map