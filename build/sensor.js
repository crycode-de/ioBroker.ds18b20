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
    constructor(opts) {
        super();
        /**
         * Timer for interval sensor readings.
         */
        this.timer = null;
        this.id = opts.id;
        this.address = opts.address.replace(/[^0-9a-f-]/g, ''); // remove all bad chars!
        this.nullOnError = opts.nullOnError;
        this.factor = opts.factor;
        this.offset = opts.offset;
        this.decimals = opts.decimals;
        this.hasError = true; // true on init while we don't know the current state
        this.w1DevicesPath = opts.w1DevicesPath;
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
        // read the file
        readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, 'utf8')
            // process data
            .then((data) => {
            const lines = data.split('\n');
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
                return parseInt(m[1], 10) / 1000;
            }
            else if (lines[0].indexOf('NO') > -1) {
                // checksum error
                throw new Error('Checksum error');
            }
            else {
                // read error
                throw new Error('Read error');
            }
        })
            // check for specific errors
            .then((val) => {
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
            return { err: null, val: val };
        })
            // handle errors
            .catch((err) => {
            this.emit('error', err, this.id);
            return { err: err, val: null };
        })
            // evaluate the result
            .then((data) => {
            if (data.val !== null) {
                data.val = data.val * this.factor + this.offset;
                if (this.decimals !== null) {
                    data.val = tools_1.round(data.val, this.decimals);
                }
            }
            if (data.val !== null || this.nullOnError) {
                this.emit('value', data.val, this.id);
            }
            if (this.hasError !== (data.val === null)) {
                this.hasError = (data.val === null);
                this.emit('errorStateChanged', this.hasError, this.id);
            }
            if (typeof cb === 'function') {
                cb(data.err, data.val);
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