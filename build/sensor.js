"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
var sensor_exports = {};
__export(sensor_exports, {
  Sensor: () => Sensor
});
module.exports = __toCommonJS(sensor_exports);
var import_events = require("events");
var import_util = require("util");
var fs = __toESM(require("fs"));
var import_autobind_decorator = require("autobind-decorator");
var import_utils = require("./lib/utils");
const readFile = (0, import_util.promisify)(fs.readFile);
class Sensor extends import_events.EventEmitter {
  constructor(opts, adapter) {
    super();
    this.timer = null;
    this.adapter = adapter;
    this.id = opts.id;
    this.address = opts.address.replace(/[^0-9a-f-]/g, "");
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
      this.timer = this.adapter.setInterval(this.read, opts.interval);
      this.read();
    }
  }
  async read(cb) {
    try {
      let raw;
      if (this.remoteSystemId) {
        if (!this.adapter.remoteSensorServer) {
          throw new Error("Remote sensors not enabled");
        }
        raw = await this.adapter.remoteSensorServer.read(this.remoteSystemId, this.address);
      } else {
        raw = await readFile(`${this.w1DevicesPath}/${this.address}/w1_slave`, "utf8");
      }
      this.processData(raw, cb);
    } catch (err) {
      this.emit("error", err, this.id);
      if (typeof cb === "function") {
        cb(err, null);
      }
    }
  }
  async processData(rawData, cb) {
    const lines = rawData.split("\n");
    let val = null;
    let err = null;
    try {
      if (lines[0].indexOf("YES") > -1) {
        const bytes = lines[0].split(" ");
        if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
          throw new Error("Communication error");
        }
        const m = lines[1].match(/t=(-?\d+)/);
        if (!m) {
          throw new Error("Parse error");
        }
        val = parseInt(m[1], 10) / 1e3;
      } else if (lines[0].indexOf("NO") > -1) {
        throw new Error("Checksum error");
      } else {
        throw new Error("Read error");
      }
      if (val === 85) {
        throw new Error("No temperature read");
      } else if (val === -127) {
        throw new Error("Device disconnected");
      } else if (val < -80 || val > 150) {
        throw new Error("Read temperature is out of possible range");
      }
    } catch (e) {
      this.emit("error", e, this.id);
      err = e;
      val = null;
    }
    if (val !== null) {
      val = val * this.factor + this.offset;
      if (this.decimals !== null) {
        val = (0, import_utils.round)(val, this.decimals);
      }
    }
    if (val !== null || this.nullOnError) {
      this.emit("value", val, this.id);
    }
    if (this.hasError !== (val === null)) {
      this.hasError = val === null;
      this.emit("errorStateChanged", this.hasError, this.id);
    }
    if (typeof cb === "function") {
      cb(err, val);
    }
  }
  stop() {
    if (this.timer) {
      this.adapter.clearInterval(this.timer);
      this.timer = null;
    }
  }
}
__decorateClass([
  import_autobind_decorator.boundMethod
], Sensor.prototype, "read", 1);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Sensor
});
//# sourceMappingURL=sensor.js.map
