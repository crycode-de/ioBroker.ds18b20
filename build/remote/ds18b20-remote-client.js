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
const util_1 = require("util");
const net_1 = require("net");
const fs = require("fs");
const os = require("os");
const readDir = (0, util_1.promisify)(fs.readdir);
const readFile = (0, util_1.promisify)(fs.readFile);
const logger_1 = require("./logger");
const common_1 = require("./common");
const ENV_KEYS = [
    'ADAPTER_HOST',
    'ADAPTER_KEY',
    'ADAPTER_PORT',
    'DEBUG',
    'SYSTEM_ID',
    'W1_DEVICES_PATH',
];
class Ds18b20Remote {
    constructor() {
        this.reconnectTimeout = null;
        this.shouldExit = false;
        this.recvData = '';
        this.connect = this.connect.bind(this);
        this.exit = this.exit.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onData = this.onData.bind(this);
        this.onError = this.onError.bind(this);
        this.log = new logger_1.Logger();
        this.log.log('- ioBroker.ds18b20 remote client -');
        this.readDotEnv();
        if (process.env.SYSTEM_ID) {
            this.systemId = process.env.SYSTEM_ID.trim();
        }
        else {
            this.systemId = os.hostname();
            this.log.warn(`Using the hostname ${this.systemId} as system ID. Please set SYSTEM_ID to a unique value.`);
        }
        this.log.debug(`systemId`, this.systemId);
        if (process.env.ADAPTER_PORT) {
            try {
                this.adapterPort = parseInt(process.env.ADAPTER_PORT, 10);
            }
            catch (err) {
                this.log.error(`Invalid ADAPTER_PORT!`, err);
                process.exit(1);
            }
        }
        else {
            this.adapterPort = 1820;
        }
        this.log.debug(`adapterPort`, this.adapterPort);
        this.adapterHost = (process.env.ADAPTER_HOST || '').trim();
        if (this.adapterHost.length <= 0) {
            this.log.error(`No ADAPTER_HOST given!`);
            process.exit(1);
        }
        this.log.debug(`adapterHost`, this.adapterHost);
        this.adapterKey = Buffer.from(process.env.ADAPTER_KEY || '', 'hex');
        if (this.adapterKey.length !== 32) {
            this.log.error(`ADAPTER_KEY is no valid key!`);
            process.exit(1);
        }
        this.log.debug(`adapterKey`, this.adapterKey);
        this.w1DevicesPath = process.env.W1_DEVICES_PATH || '/sys/bus/w1/devices';
        if (!fs.existsSync(this.w1DevicesPath)) {
            this.log.error(`The 1-wire devices path ${this.w1DevicesPath} does not exist!`);
            process.exit(1);
        }
        this.log.debug(`w1DevicesPath`, this.w1DevicesPath);
        process.on('SIGINT', this.exit);
        process.on('SIGTERM', this.exit);
        this.socket = new net_1.Socket();
        this.socket.on('close', this.onClose);
        this.socket.on('data', this.onData);
        this.socket.on('error', this.onError);
        this.connect();
    }
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
            port: this.adapterPort,
        }, () => {
            this.log.info(`Connected with adapter`);
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            this.reconnectTimeout = null;
        });
    }
    onData(data) {
        this.recvData += data.toString();
        let idx = this.recvData.indexOf('\n');
        while (idx > 0) {
            const raw = this.recvData.slice(0, idx);
            this.recvData = this.recvData.slice(idx + 1);
            this.handleSocketData(raw);
            idx = this.recvData.indexOf('\n');
        }
    }
    handleSocketData(raw) {
        return __awaiter(this, void 0, void 0, function* () {
            let data;
            try {
                const dataStr = (0, common_1.decrypt)(raw, this.adapterKey);
                data = JSON.parse(dataStr);
            }
            catch (err) {
                this.log.warn(`Decrypt of data failed! ${err.toString()}`);
                this.socket.end();
                return;
            }
            this.log.debug('message from adapter:', data);
            switch (data.cmd) {
                case 'clientInfo':
                    if (data.protocolVersion !== common_1.REMOTE_PROTOCOL_VERSION) {
                        this.log.warn(`Protocol version ${data.protocolVersion} from the adapter does not match the remote client protocol version ${common_1.REMOTE_PROTOCOL_VERSION}! Please reinstall the remote client.`);
                    }
                    this.log.info('Sending client info to the adapter');
                    this.send({
                        cmd: 'clientInfo',
                        protocolVersion: common_1.REMOTE_PROTOCOL_VERSION,
                        systemId: this.systemId,
                    });
                    break;
                case 'read':
                    if (!data.address) {
                        this.log.warn(`Got read command without address from adapter!`);
                        return;
                    }
                    let raw;
                    try {
                        raw = yield readFile(`${this.w1DevicesPath}/${data.address}/w1_slave`, 'utf8');
                        this.log.debug(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave:`, raw);
                    }
                    catch (err) {
                        this.log.warn(`Read from file ${this.w1DevicesPath}/${data.address}/w1_slave failed! ${err.toString()}`);
                        this.log.debug(err);
                        raw = '';
                    }
                    yield this.send({
                        cmd: 'read',
                        address: data.address,
                        ts: data.ts,
                        raw,
                    });
                    break;
                case 'search':
                    try {
                        const files = yield readDir(this.w1DevicesPath);
                        const proms = [];
                        for (let i = 0; i < files.length; i++) {
                            if (!files[i].match(/^w1_bus_master\d+$/)) {
                                continue;
                            }
                            this.log.debug(`reading ${this.w1DevicesPath}/${files[i]}/w1_master_slaves`);
                            proms.push(readFile(`${this.w1DevicesPath}/${files[i]}/w1_master_slaves`, 'utf8'));
                        }
                        const addresses = (yield Promise.all(proms)).reduce((acc, cur) => {
                            acc.push(...cur.trim().split('\n'));
                            return acc;
                        }, []);
                        yield this.send({
                            cmd: 'search',
                            ts: data.ts,
                            systemId: data.systemId,
                            addresses
                        });
                    }
                    catch (err) {
                        this.log.warn(`Searching for sensors failed! ${err.toString()}`);
                        this.log.debug(err);
                    }
                    break;
                default:
                    this.log.warn(`Unknown command from adapter`);
            }
        });
    }
    onError(err) {
        this.log.warn(`Socket error:`, err.toString());
        this.log.debug(err);
        this.socket.end();
        this.reconnect();
    }
    onClose() {
        this.log.info('Socket closed');
        this.reconnect();
    }
    reconnect() {
        if (!this.reconnectTimeout && !this.shouldExit) {
            this.log.info(`Reconnect in 30 seconds`);
            this.reconnectTimeout = setTimeout(this.connect, 30000);
        }
    }
    send(data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('send to adapter:', data);
            return new Promise((resolve, reject) => {
                this.socket.write((0, common_1.encrypt)(JSON.stringify(data), this.adapterKey) + '\n', (err) => {
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
    readDotEnv() {
        if (!fs.existsSync('.env'))
            return;
        let data;
        try {
            data = fs.readFileSync('.env', 'utf-8').split('\n').map((l) => l.trim());
        }
        catch (err) {
            this.log.debug('can\'t read .env file', err);
            return;
        }
        for (const line of data) {
            if (!line || line.startsWith('#'))
                continue;
            const idx = line.indexOf('=');
            if (idx <= 0)
                continue;
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim().replace(/(^"|"$)/g, '');
            if (ENV_KEYS.indexOf(key) >= 0) {
                if (process.env[key])
                    continue;
                process.env[key] = val;
                this.log.debug(`read ${key}=${val} from .env file`);
            }
        }
    }
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