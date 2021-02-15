"use strict";
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
const net_1 = require("net");
const os = require("os");
require("source-map-support/register");
const crypt_1 = require("./common/crypt");
class Ds18b20Remote {
    constructor() {
        this.reconnectTimeout = null;
        this.recvData = '';
        // bind methods
        this.connect = this.connect.bind(this);
        this.exit = this.exit.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onData = this.onData.bind(this);
        this.onError = this.onError.bind(this);
        // get the system ID
        if (process.env.SYSTEM_ID) {
            this.systemId = process.env.SYSTEM_ID.trim();
        }
        else {
            this.systemId = os.hostname();
            console.warn(`[Warn] Using the hostname ${this.systemId} as system ID. Please set SYSTEM_ID to a unique value.`);
        }
        // get adapter port
        if (process.env.ADAPTER_PORT) {
            try {
                this.adapterPort = parseInt(process.env.ADAPTER_PORT, 10);
            }
            catch (err) {
                console.error(`[Error] Invalid ADAPTER_PORT!`, err);
                process.exit(1);
            }
        }
        else {
            this.adapterPort = 1820;
        }
        // get adapter host
        this.adapterHost = (process.env.ADAPTER_HOST || '').trim();
        if (this.adapterHost.length <= 0) {
            console.error(`[Error] No ADAPTER_HOST given!`);
            process.exit(1);
        }
        // get the encryption key
        this.adapterKey = Buffer.from(process.env.ADAPTER_KEY || '', 'hex');
        if (this.adapterKey.length !== 32) {
            console.error(`[Error] ADAPTER_KEY is no valid key!`);
            process.exit(1);
        }
        // register signal handlers
        process.on('SIGINT', this.exit);
        process.on('SIGTERM', this.exit);
        // create the socket
        this.socket = new net_1.Socket();
        this.socket.on('close', this.onClose);
        this.socket.on('data', this.onData);
        this.socket.on('error', this.onError);
        // try to connect
        this.connect();
    }
    connect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        console.log(`[Info] Connecting to ${this.adapterHost}:${this.adapterPort} ...`);
        this.socket.connect({
            host: this.adapterHost,
            port: this.adapterPort,
        }, () => {
            console.log(`[Info] Connected`);
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            this.reconnectTimeout = null;
        });
    }
    onData(data) {
        this.recvData += data.toString();
        const idx = this.recvData.indexOf('\n');
        if (idx > 0) {
            const raw = this.recvData.slice(0, idx);
            this.recvData = this.recvData.slice(idx + 1);
            this.handleSocketData(raw);
        }
    }
    handleSocketData(raw) {
        // try to decrypt and parse the data
        let data;
        try {
            const dataStr = crypt_1.decrypt(raw, this.adapterKey);
            data = JSON.parse(dataStr);
        }
        catch (err) {
            console.warn(`[Warn] Decrypt of data failed! ${err.toString()}`);
            // close the socket
            this.socket.end();
            return;
        }
        switch (data.cmd) {
            case 'clientInfo':
                console.info('[Info] Sending client info to the adapter');
                this.send({
                    cmd: 'clientInfo',
                    systemId: this.systemId,
                });
                break;
            default:
                console.warn(`[Warn] Unknown command "${data.cmd}" from adapter`);
        }
    }
    onError(err) {
        console.warn(`[Warn] Socket error:`, err);
        // close the socket on an error
        this.socket.end();
        this.reconnect();
    }
    onClose() {
        console.info('[Info] Socket closed');
        this.reconnect();
    }
    reconnect() {
        if (!this.reconnectTimeout) {
            // schedule reconnect
            console.log(`[Info] Reconnect in 30 seconds`);
            this.reconnectTimeout = setTimeout(this.connect, 30000);
        }
    }
    send(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.socket.write(crypt_1.encrypt(JSON.stringify(data), this.adapterKey) + '\n', (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    exit() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.socket.end();
    }
}
new Ds18b20Remote();
//# sourceMappingURL=ds18b20-remote.js.map