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
        this.onConnect = this.onConnect.bind(this);
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
        this.socket.on('connect', this.onConnect);
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
        });
    }
    onConnect() {
        this.log.info(`Connected with adapter`);
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHMxOGIyMC1yZW1vdGUtY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JlbW90ZS9kczE4YjIwLXJlbW90ZS1jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFnQkEsK0JBQWlDO0FBQ2pDLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIseUJBQXlCO0FBRXpCLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0JBQVMsRUFBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBQSxnQkFBUyxFQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV4QyxxQ0FBa0M7QUFFbEMscUNBSWtCO0FBS2xCLE1BQU0sUUFBUSxHQUFHO0lBQ2YsY0FBYztJQUNkLGFBQWE7SUFDYixjQUFjO0lBQ2QsT0FBTztJQUNQLFdBQVc7SUFDWCxpQkFBaUI7Q0FDbEIsQ0FBQztBQUtGLE1BQU0sYUFBYTtJQXlEakI7UUFwQlEscUJBQWdCLEdBQTBCLElBQUksQ0FBQztRQU0vQyxlQUFVLEdBQVksS0FBSyxDQUFDO1FBTzVCLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFTNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FB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