"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_node_util = require("node:util");
var import_node_net = require("node:net");
var import_node_fs = __toESM(require("node:fs"));
var import_node_os = __toESM(require("node:os"));
var import_logger = require("./logger");
var import_common = require("./common");
const readDir = (0, import_node_util.promisify)(import_node_fs.default.readdir);
const readFile = (0, import_node_util.promisify)(import_node_fs.default.readFile);
const ENV_KEYS = [
  "ADAPTER_HOST",
  "ADAPTER_KEY",
  "ADAPTER_PORT",
  "DEBUG",
  "SYSTEM_ID",
  "W1_DEVICES_PATH"
];
class Ds18b20Remote {
  constructor() {
    /**
     * Timeout to trigger socket reconnects.
     */
    this.reconnectTimeout = null;
    /**
     * Flag if ds18b20-remote should exit.
     * If `true` a reconnect won't be possible.
     */
    this.shouldExit = false;
    /**
     * String of the received data.
     * All received data chunks will be appended to this until we got `\n`.
     * On `\n` data before it will be processed.
     */
    this.recvData = "";
    this.connect = this.connect.bind(this);
    this.exit = this.exit.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onData = this.onData.bind(this);
    this.onError = this.onError.bind(this);
    this.onConnect = this.onConnect.bind(this);
    this.log = new import_logger.Logger();
    this.log.log("- ioBroker.ds18b20 remote client -");
    this.readDotEnv();
    if (process.env.SYSTEM_ID) {
      this.systemId = process.env.SYSTEM_ID.trim();
    } else {
      this.systemId = import_node_os.default.hostname();
      this.log.warn(`Using the hostname ${this.systemId} as system ID. Please set SYSTEM_ID to a unique value.`);
    }
    this.log.debug(`systemId`, this.systemId);
    if (process.env.ADAPTER_PORT) {
      try {
        this.adapterPort = parseInt(process.env.ADAPTER_PORT, 10);
      } catch (err) {
        this.log.error(`Invalid ADAPTER_PORT!`, err);
        process.exit(1);
      }
    } else {
      this.adapterPort = 1820;
    }
    this.log.debug(`adapterPort`, this.adapterPort);
    this.adapterHost = (process.env.ADAPTER_HOST ?? "").trim();
    if (this.adapterHost.length <= 0) {
      this.log.error(`No ADAPTER_HOST given!`);
      process.exit(1);
    }
    this.log.debug(`adapterHost`, this.adapterHost);
    this.adapterKey = Buffer.from(process.env.ADAPTER_KEY ?? "", "hex");
    if (this.adapterKey.length !== 32) {
      this.log.error(`ADAPTER_KEY is no valid key!`);
      process.exit(1);
    }
    this.log.debug(`adapterKey`, this.adapterKey);
    this.w1DevicesPath = process.env.W1_DEVICES_PATH ?? "/sys/bus/w1/devices";
    if (!import_node_fs.default.existsSync(this.w1DevicesPath)) {
      this.log.error(`The 1-wire devices path ${this.w1DevicesPath} does not exist!`);
      process.exit(1);
    }
    this.log.debug(`w1DevicesPath`, this.w1DevicesPath);
    process.on("SIGINT", this.exit);
    process.on("SIGTERM", this.exit);
    this.socket = new import_node_net.Socket();
    this.socket.on("close", this.onClose);
    this.socket.on("data", this.onData);
    this.socket.on("error", this.onError);
    this.socket.on("connect", this.onConnect);
    this.connect();
  }
  /**
   * Try to connect to the adapter.
   */
  connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.shouldExit) {
      return;
    }
    this.log.info(`Connecting to ${this.adapterHost}:${this.adapterPort} ...`);
    this.socket.connect({
      host: this.adapterHost,
      port: this.adapterPort
    });
  }
  /**
   * Handle established connection.
   */
  onConnect() {
    this.log.info(`Connected with adapter`);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = null;
  }
  /**
   * Handle incoming data chunks.
   * @param data A data chunk.
   */
  onData(data) {
    this.recvData += data.toString();
    let idx = this.recvData.indexOf("\n");
    while (idx > 0) {
      const raw = this.recvData.slice(0, idx);
      this.recvData = this.recvData.slice(idx + 1);
      void this.handleSocketData(raw);
      idx = this.recvData.indexOf("\n");
    }
  }
  /**
   * Handle a message from the adapter.
   * @param raw The raw (encoded) message from the adapter.
   */
  async handleSocketData(raw) {
    let data;
    try {
      const dataStr = (0, import_common.decrypt)(raw, this.adapterKey);
      data = JSON.parse(dataStr);
    } catch (err) {
      this.log.warn(`Decrypt of data failed! ${err}`);
      this.socket.end();
      return;
    }
    this.log.debug("message from adapter:", data);
    switch (data.cmd) {
      case "clientInfo":
        if (data.protocolVersion !== import_common.REMOTE_PROTOCOL_VERSION) {
          this.log.warn(`Protocol version ${data.protocolVersion} from the adapter does not match the remote client protocol version ${import_common.REMOTE_PROTOCOL_VERSION}! Please reinstall the remote client.`);
        }
        this.log.info("Sending client info to the adapter");
        await this.send({
          cmd: "clientInfo",
          protocolVersion: import_common.REMOTE_PROTOCOL_VERSION,
          systemId: this.systemId
        });
        break;
      case "read": {
        if (!data.address) {
          this.log.warn(`Got read command without address from adapter!`);
          return;
        }
        let raw2;
        try {
          raw2 = await readFile(`${this.w1DevicesPath}/${data.address}/w1_slave`, "utf8");
          this.log.debug(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave:`, raw);
        } catch (err) {
          this.log.warn(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave failed! ${err}`);
          this.log.debug(err);
          raw2 = "";
        }
        await this.send({
          cmd: "read",
          address: data.address,
          ts: data.ts,
          raw: raw2
        });
        break;
      }
      case "search":
        try {
          const files = await readDir(this.w1DevicesPath);
          const proms = [];
          for (const file of files) {
            if (/^w1_bus_master\d+$/.exec(file)) {
              this.log.debug(`reading ${this.w1DevicesPath}/${file}/w1_master_slaves`);
              proms.push(readFile(`${this.w1DevicesPath}/${file}/w1_master_slaves`, "utf8"));
            } else if (file === "w1_master_slaves") {
              this.log.debug(`reading ${this.w1DevicesPath}/w1_master_slaves`);
              proms.push(readFile(`${this.w1DevicesPath}/w1_master_slaves`, "utf8"));
            }
          }
          const addresses = (await Promise.all(proms)).reduce((acc, cur) => {
            acc.push(...cur.trim().split("\n"));
            return acc;
          }, []);
          await this.send({
            cmd: "search",
            ts: data.ts,
            systemId: data.systemId,
            addresses
          });
        } catch (err) {
          this.log.warn(`Searching for sensors failed! ${err}`);
          this.log.debug(err);
        }
        break;
      default:
        this.log.warn(`Unknown command from adapter`);
    }
  }
  /**
   * Handler for socket errors.
   * Each error will trigger a socket disconnect and reconnect.
   * @param err The error.
   */
  onError(err) {
    this.log.warn(`Socket error:`, err.toString());
    this.log.debug(err);
    this.socket.end();
    this.reconnect();
  }
  /**
   * Handler for socket close events.
   */
  onClose() {
    this.log.info("Socket closed");
    this.reconnect();
  }
  /**
   * Init a reconnect after 30 seconds.
   */
  reconnect() {
    if (!this.reconnectTimeout && !this.shouldExit) {
      this.log.info(`Reconnect in 30 seconds`);
      this.reconnectTimeout = setTimeout(this.connect, 3e4);
    }
  }
  /**
   * Send some data to the adapter.
   * The data will be stringified and encrypted before sending.
   * @param data The data object to send.
   */
  async send(data) {
    this.log.debug("send to adapter:", data);
    return await new Promise((resolve, reject) => {
      this.socket.write((0, import_common.encrypt)(JSON.stringify(data), this.adapterKey) + "\n", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  /**
   * Read env vars from a .env file in the current working dir if exists.
   */
  readDotEnv() {
    if (!import_node_fs.default.existsSync(".env")) return;
    let data;
    try {
      data = import_node_fs.default.readFileSync(".env", "utf-8").split("\n").map((l) => l.trim());
    } catch (err) {
      this.log.debug("can't read .env file", err);
      return;
    }
    for (const line of data) {
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/(^"|"$)/g, "");
      if (ENV_KEYS.includes(key)) {
        if (process.env[key]) continue;
        process.env[key] = val;
        this.log.debug(`read ${key}=${val} from .env file`);
      }
    }
  }
  /**
   * Handler process exit.
   * This will stop all timeouts and close the socket connection.
   */
  exit() {
    this.shouldExit = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.socket.end();
  }
}
new Ds18b20Remote();
//# sourceMappingURL=ds18b20-remote-client.js.map
