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
exports.Sensor = void 0;
const events_1 = require("events");
const util_1 = require("util");
const fs = require("fs");
const readFile = (0, util_1.promisify)(fs.readFile);
const core_decorators_1 = require("core-decorators");
const tools_1 = require("./lib/tools");
class Sensor extends events_1.EventEmitter {
    constructor(opts, adapter) {
        super();
        this.timer = null;
        this.adapter = adapter;
        this.id = opts.id;
        this.address = opts.address.replace(/[^0-9a-f-]/g, '');
        this.nullOnError = opts.nullOnError;
        this.factor = opts.factor;
        this.offset = opts.offset;
        this.decimals = opts.decimals;
        this.hasError = true;
        this.w1DevicesPath = opts.w1DevicesPath;
        this.remoteSystemId = opts.remoteSystemId;
        if (opts.interval && opts.interval > 0) {
            if (opts.interval < 500) {
                opts.interval = 500;
            }
            this.timer = setInterval(this.read, opts.interval);
            this.read();
        }
    }
    read(cb) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let raw;
                if (this.remoteSystemId) {
                    if (!this.adapter.remoteSensorServer) {
                        throw new Error('Remote sensors not enabled');
                    }
                    raw = yield this.adapter.remoteSensorServer.read(this.remoteSystemId, this.address);
                }
                else {
                    raw = yield readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, 'utf8');
                }
                this.processData(raw, cb);
            }
            catch (err) {
                this.emit('error', err, this.id);
                if (typeof cb === 'function') {
                    cb(err, null);
                }
            }
        });
    }
    processData(rawData, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            const lines = rawData.split('\n');
            let val = null;
            let err = null;
            try {
                if (lines[0].indexOf('YES') > -1) {
                    const bytes = lines[0].split(' ');
                    if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
                        throw new Error('Communication error');
                    }
                    const m = lines[1].match(/t=(-?\d+)/);
                    if (!m) {
                        throw new Error('Parse error');
                    }
                    val = parseInt(m[1], 10) / 1000;
                }
                else if (lines[0].indexOf('NO') > -1) {
                    throw new Error('Checksum error');
                }
                else {
                    throw new Error('Read error');
                }
                if (val === 85) {
                    throw new Error('No temperature read');
                }
                else if (val === -127) {
                    throw new Error('Device disconnected');
                }
                else if (val < -80 || val > 150) {
                    throw new Error('Read temperature is out of possible range');
                }
            }
            catch (e) {
                this.emit('error', e, this.id);
                err = e;
                val = null;
            }
            if (val !== null) {
                val = val * this.factor + this.offset;
                if (this.decimals !== null) {
                    val = (0, tools_1.round)(val, this.decimals);
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