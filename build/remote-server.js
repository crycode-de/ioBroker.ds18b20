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
var remote_server_exports = {};
__export(remote_server_exports, {
  RemoteSensorServer: () => RemoteSensorServer
});
module.exports = __toCommonJS(remote_server_exports);
var import_events = require("events");
var import_net = require("net");
var import_autobind_decorator = require("autobind-decorator");
var import_common = require("./remote/common");
class RemoteSensorServer extends import_events.EventEmitter {
  constructor(port, encKey, adapter) {
    super();
    /**
     * Connected sockets.
     */
    this.sockets = {};
    /**
     * Timeouts for sockets.
     * Used to disconnect a socket after idle before it is identified.
     */
    this.socketTimeouts = {};
    this.adapter = adapter;
    this.encryptionKey = Buffer.from(encKey, "hex");
    this.server = (0, import_net.createServer)();
    this.server.on("connection", this.handleConnection);
    this.server.on("error", (err) => {
      this.emit("error", err);
    });
    this.server.listen(port, () => {
      this.emit("listening");
    });
  }
  /**
   * Returns if the server is listening for connections.
   */
  isListening() {
    return this.server.listening;
  }
  /**
   * Returns an array of the system IDs of all currently connected remote systems.
   */
  getConnectedSystems() {
    const systems = [];
    for (const socketId in this.sockets) {
      systems.push(this.sockets[socketId].systemId);
    }
    return systems;
  }
  /**
   * Read from a remote sensor.
   * @param clientSystemId The system ID of the remote client to send the request to.
   * @param sensorAddress The sensor address.
   */
  async read(clientSystemId, sensorAddress) {
    let client = null;
    for (const socketId in this.sockets) {
      if (this.sockets[socketId].systemId === clientSystemId) {
        client = this.sockets[socketId];
        break;
      }
    }
    if (!client) {
      throw new Error(`Remote system ${clientSystemId} is not connected.`);
    }
    const requestTs = Date.now();
    const prom = new Promise((resolve, reject) => {
      let timeout;
      const handler = (data) => {
        if (typeof data !== "object" || data.address !== sensorAddress || data.ts !== requestTs)
          return;
        if (timeout) {
          this.adapter.clearTimeout(timeout);
        }
        this.removeListener("sensorData", handler);
        resolve(data.raw ?? "");
      };
      timeout = this.adapter.setTimeout(() => {
        this.removeListener("sensorData", handler);
        reject(new Error(`No response from remote system ${clientSystemId}`));
      }, 5e3);
      this.on("sensorData", handler);
    });
    this.send(client.socket, {
      cmd: "read",
      ts: requestTs,
      address: sensorAddress
    }).catch((err) => {
      this.adapter.log.error(`Error while sending request to remote system ${clientSystemId}: ${err}`);
    });
    const raw = await prom;
    return raw;
  }
  /**
   * Search for sensors an all currently connected remote systems.
   */
  async search() {
    const sensors = [];
    const proms = [];
    for (const socketId in this.sockets) {
      const client = this.sockets[socketId];
      const requestTs = Date.now();
      this.send(client.socket, {
        cmd: "search",
        ts: requestTs,
        systemId: client.systemId
      }).catch((err) => {
        this.adapter.log.error(`Error while sending request to remote system ${client.systemId}: ${err}`);
      });
      proms.push(new Promise((resolve, reject) => {
        let timeout;
        const handler = (data) => {
          if (typeof data !== "object" || data.systemId !== client.systemId || data.ts !== requestTs)
            return;
          if (timeout) {
            this.adapter.clearTimeout(timeout);
          }
          this.removeListener("searchData", handler);
          if (!Array.isArray(data.addresses)) {
            data.addresses = [];
          }
          resolve(data.addresses.map((a) => ({ address: a, remoteSystemId: client.systemId })));
        };
        timeout = this.adapter.setTimeout(() => {
          this.removeListener("searchData", handler);
          reject(new Error(`No response from remote system ${client.systemId}`));
        }, 5e3);
        this.on("searchData", handler);
      }));
    }
    const results = await Promise.all(proms);
    results.forEach((r) => sensors.push(...r));
    return sensors;
  }
  /**
   * Stop the server and close all socket connections.
   */
  async stop() {
    return await new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
  handleConnection(socket) {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    this.adapter.log.debug(`socket connect ${socketId}`);
    socket.on("close", () => {
      this.adapter.log.debug(`socket closed ${socketId}`);
      if (this.sockets[socketId]) {
        this.adapter.log.info(`Remote system ${this.sockets[socketId].systemId} (${socketId}) disconnected`);
      } else {
        this.adapter.log.info(`Remote system ${socketId} disconnected`);
      }
      if (this.socketTimeouts[socketId]) {
        this.adapter.clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];
      }
      delete this.sockets[socketId];
      this.emit("remotesChanged", this.getConnectedSystems());
    });
    let dataStr = "";
    socket.on("data", (data) => {
      dataStr += data.toString();
      let idx = dataStr.indexOf("\n");
      while (idx > 0) {
        const raw = dataStr.slice(0, idx);
        dataStr = dataStr.slice(idx + 1);
        this.handleSocketData(socketId, socket, raw);
        idx = dataStr.indexOf("\n");
      }
    });
    this.socketTimeouts[socketId] = this.adapter.setTimeout(() => {
      this.adapter.log.warn(`Disconnecting remote ${socketId} due to inactivity before identification`);
      socket.destroy();
      delete this.socketTimeouts[socketId];
    }, 5e3);
    this.send(socket, { cmd: "clientInfo", protocolVersion: import_common.REMOTE_PROTOCOL_VERSION }).catch((err) => {
      this.adapter.log.error(`Error while sending request to remote system ${socketId}: ${err}`);
    });
  }
  /**
   * Handler for received encrypted messages from a socket.
   * @param socketId The ID of the related socket.
   * @param socket The socket from which the data was received.
   * @param raw The encrypted received data.
   */
  handleSocketData(socketId, socket, raw) {
    let data;
    try {
      const dataStr = (0, import_common.decrypt)(raw, this.encryptionKey);
      data = JSON.parse(dataStr);
    } catch (err) {
      this.adapter.log.warn(`Decrypt of data from ${socketId} failed! ${err}`);
      socket.destroy();
      return;
    }
    this.adapter.log.debug(`data from remote ${socketId}: ${JSON.stringify(data)}`);
    switch (data.cmd) {
      case "clientInfo":
        if (!data.systemId) {
          this.adapter.log.warn(`Got invalid data from remote ${socketId}!`);
          return;
        }
        this.adapter.clearTimeout(this.socketTimeouts[socketId]);
        delete this.socketTimeouts[socketId];
        this.sockets[socketId] = {
          socket,
          systemId: data.systemId
        };
        this.adapter.log.info(`Remote system ${data.systemId} connected from ${socket.remoteAddress}`);
        if (data.protocolVersion !== import_common.REMOTE_PROTOCOL_VERSION) {
          this.adapter.log.warn(`Protocol version ${data.protocolVersion} from remote system ${data.systemId} does not match the adapter protocol version ${import_common.REMOTE_PROTOCOL_VERSION}! Please reinstall the remote client.`);
        }
        this.emit("remotesChanged", this.getConnectedSystems());
        break;
      case "read":
        this.emit("sensorData", data);
        break;
      case "search":
        this.emit("searchData", data);
        break;
      default:
        this.adapter.log.warn(`Unknown command from remote system ${socketId}.`);
    }
  }
  /**
   * Send some data to a remote system.
   * The data will be stringified and encrypted before sending.
   * @param socket The socket to send the data to.
   * @param data The data object to send.
   */
  async send(socket, data) {
    return await new Promise((resolve, reject) => {
      socket.write((0, import_common.encrypt)(JSON.stringify(data), this.encryptionKey) + "\n", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
__decorateClass([
  import_autobind_decorator.boundMethod
], RemoteSensorServer.prototype, "handleConnection", 1);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RemoteSensorServer
});
//# sourceMappingURL=remote-server.js.map
