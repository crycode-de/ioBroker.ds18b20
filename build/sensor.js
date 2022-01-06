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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vuc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlbnNvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJQSxtQ0FBc0M7QUFDdEMsK0JBQWlDO0FBRWpDLHlCQUF5QjtBQUN6QixNQUFNLFFBQVEsR0FBRyxJQUFBLGdCQUFTLEVBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXhDLHFEQUEyQztBQUUzQyx1Q0FBb0M7QUFtQ3BDLE1BQWEsTUFBTyxTQUFRLHFCQUFZO0lBNkR0QyxZQUFhLElBQW1CLEVBQUUsT0FBdUI7UUFDdkQsS0FBSyxFQUFFLENBQUM7UUFqQkYsVUFBSyxHQUF3QixJQUFJLENBQUM7UUFrQnhDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBRXZCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUcxQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUU7WUFFdEMsSUFBSSxJ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