"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var import_promises = require("fs/promises");
var import_autobind_decorator = require("autobind-decorator");
var import_utils = require("./lib/utils");
class Sensor extends import_events.EventEmitter {
  constructor(opts, adapter) {
    super();
    this.timer = null;
    this.adapter = adapter;
    this.address = opts.address;
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
      this.timer = this.adapter.setInterval(() => {
        this.read().catch(() => {
        });
      }, opts.interval);
      this.read().catch(() => {
      });
    }
  }
  async read() {
    let val = null;
    try {
      let raw;
      if (this.remoteSystemId) {
        if (!this.adapter.remoteSensorServer) {
          throw new Error("Remote sensors not enabled");
        }
        raw = await this.adapter.remoteSensorServer.read(this.remoteSystemId, this.address);
      } else {
        raw = await (0, import_promises.readFile)(`${this.w1DevicesPath}/${this.address}/w1_slave`, "utf8");
      }
      val = await this.processData(raw);
      this.emit("value", val, this.address);
      if (this.hasError) {
        this.hasError = false;
        this.emit("errorStateChanged", false, this.address);
      }
    } catch (err) {
      this.emit("error", err, this.address);
      if (this.nullOnError) {
        this.emit("value", null, this.address);
      }
      if (!this.hasError) {
        this.hasError = true;
        this.emit("errorStateChanged", true, this.address);
      }
      throw err;
    }
    return val;
  }
  async processData(rawData) {
    const lines = rawData.split("\n");
    let val;
    if (lines[0].indexOf("YES") > -1) {
      const bytes = lines[0].split(" ");
      if (bytes[0] === bytes[1] && bytes[0] === bytes[2] && bytes[0] === bytes[3] && bytes[0] === bytes[4] && bytes[0] === bytes[5] && bytes[0] === bytes[6] && bytes[0] === bytes[7] && bytes[0] === bytes[8]) {
        throw new Error("Communication error");
      }
      const m = /t=(-?\d+)/.exec(lines[1]);
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
    val = val * this.factor + this.offset;
    if (this.decimals !== null) {
      val = (0, import_utils.round)(val, this.decimals);
    }
    return val;
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
