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
const events_1 = require("events");
const core_decorators_1 = require("core-decorators");
const ds18b20 = require("ds18b20");
const tools_1 = require("./lib/tools");
class Sensor extends events_1.EventEmitter {
    constructor(id, address, interval, nullOnError, factor, offset, decimals) {
        super();
        this.timer = null;
        this.id = id;
        this.address = address;
        this.nullOnError = nullOnError;
        this.factor = factor;
        this.offset = offset;
        this.decimals = decimals;
        this.hasError = true; // true on init while we don't know the current state
        // start interval and inital read if interval is set
        if (interval && interval > 0) {
            this.timer = setInterval(this.read, interval);
            this.read();
        }
    }
    /**
     * Read the temperature.
     * Use the decimal parser because the hex parser doesn't  support crc checking.
     * The value and possible errors will be emitted as events.
     * Optionally a callback may be used.
     * @param  cb Optional callback function.
     */
    read(cb) {
        ds18b20.temperature(this.address, { parser: 'decimal' }, (err, val) => {
            if (err) {
                this.emit('error', err, this.id);
                val = null;
            }
            else if (val === 85) {
                this.emit('error', new Error('Communication error'), this.id);
                val = null;
            }
            else if (val === -127) {
                this.emit('error', new Error('Device disconnected'), this.id);
                val = null;
            }
            else if (val === false) {
                this.emit('error', new Error('Checksum error'), this.id);
                val = null;
            }
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
