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
var logger_exports = {};
__export(logger_exports, {
  Logger: () => Logger
});
module.exports = __toCommonJS(logger_exports);
class Logger {
  log(...args) {
    console.log(...args);
  }
  debug(...args) {
    if (!process.env.DEBUG) {
      return;
    }
    console.log("[Debug]", ...args);
  }
  info(...args) {
    console.log("[Info]", ...args);
  }
  warn(...args) {
    console.warn("[Warn]", ...args);
  }
  error(...args) {
    console.error("[Error]", ...args);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Logger
});
//# sourceMappingURL=logger.js.map
