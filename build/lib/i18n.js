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
var i18n_exports = {};
__export(i18n_exports, {
  i18n: () => i18n
});
module.exports = __toCommonJS(i18n_exports);
var import_de = __toESM(require("../../admin/i18n/de.json"));
var import_en = __toESM(require("../../admin/i18n/en.json"));
var import_es = __toESM(require("../../admin/i18n/es.json"));
var import_fr = __toESM(require("../../admin/i18n/fr.json"));
var import_it = __toESM(require("../../admin/i18n/it.json"));
var import_nl = __toESM(require("../../admin/i18n/nl.json"));
var import_pl = __toESM(require("../../admin/i18n/pl.json"));
var import_pt = __toESM(require("../../admin/i18n/pt.json"));
var import_ru = __toESM(require("../../admin/i18n/ru.json"));
var import_zh_cn = __toESM(require("../../admin/i18n/zh-cn.json"));
class I18n {
  constructor() {
    this.language = "en";
  }
  getStringOrTranslated(key, ...args) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (import_en.default[key]) {
      return {
        de: this.replacePlaceholders((_a = import_de.default[key]) != null ? _a : key, ...args),
        en: this.replacePlaceholders((_b = import_en.default[key]) != null ? _b : key, ...args),
        es: this.replacePlaceholders((_c = import_es.default[key]) != null ? _c : key, ...args),
        fr: this.replacePlaceholders((_d = import_fr.default[key]) != null ? _d : key, ...args),
        it: this.replacePlaceholders((_e = import_it.default[key]) != null ? _e : key, ...args),
        nl: this.replacePlaceholders((_f = import_nl.default[key]) != null ? _f : key, ...args),
        pl: this.replacePlaceholders((_g = import_pl.default[key]) != null ? _g : key, ...args),
        pt: this.replacePlaceholders((_h = import_pt.default[key]) != null ? _h : key, ...args),
        ru: this.replacePlaceholders((_i = import_ru.default[key]) != null ? _i : key, ...args),
        "zh-cn": this.replacePlaceholders((_j = import_zh_cn.default[key]) != null ? _j : key, ...args)
      };
    } else {
      return key;
    }
  }
  getString(key, ...args) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    let str;
    switch (this.language) {
      case "de":
        str = (_a = import_de.default[key]) != null ? _a : key;
        break;
      case "en":
        str = (_b = import_en.default[key]) != null ? _b : key;
        break;
      case "es":
        str = (_c = import_es.default[key]) != null ? _c : key;
        break;
      case "fr":
        str = (_d = import_fr.default[key]) != null ? _d : key;
        break;
      case "it":
        str = (_e = import_it.default[key]) != null ? _e : key;
        break;
      case "nl":
        str = (_f = import_nl.default[key]) != null ? _f : key;
        break;
      case "pl":
        str = (_g = import_pl.default[key]) != null ? _g : key;
        break;
      case "pt":
        str = (_h = import_pt.default[key]) != null ? _h : key;
        break;
      case "ru":
        str = (_i = import_ru.default[key]) != null ? _i : key;
        break;
      case "zh-cn":
        str = (_j = import_zh_cn.default[key]) != null ? _j : key;
        break;
      default:
        str = key;
    }
    return this.replacePlaceholders(str, ...args);
  }
  replacePlaceholders(text, ...args) {
    for (const s of args) {
      text = text.replace("%s", s);
    }
    return text;
  }
}
const i18n = new I18n();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  i18n
});
//# sourceMappingURL=i18n.js.map
