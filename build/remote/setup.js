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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
const SYSTEMD_SERVICE_NAME = "iobroker-ds18b20-remote.service";
const files = {
  FILE: "DUMMY"
};
for (const f in files) {
  const content = Buffer.from(files[f], "base64").toString("utf-8");
  fs.writeFileSync(f, content, { encoding: "utf-8" });
}
const systemDContent = `[Unit]
Description=ioBroker.ds18b20 remote client
Documentation=https://github.com/crycode-de/ioBroker.ds18b20
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${__dirname}
ExecStart=${process.execPath} ${path.join(__dirname, "ds18b20-remote-client.js")}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`;
const systemDFile = path.join(__dirname, SYSTEMD_SERVICE_NAME);
fs.writeFileSync(systemDFile, systemDContent, { encoding: "utf-8" });
const dotEnvContent = `# Settings for the ioBroker.ds18b20 remote client

# Unique ID for this remote system
SYSTEM_ID=my-remote

# IP or hostname of the ioBroker host running the adapter
ADAPTER_HOST=

# Port from the adapter config
ADAPTER_PORT=1820

# Encryption key from the adapter config
ADAPTER_KEY=

# Enable debug log output
#DEBUG=1

# System path of the 1-wire devices
#W1_DEVICES_PATH=/sys/bus/w1/devices
`;
const dotEnvFile = path.join(__dirname, ".env");
if (!fs.existsSync(dotEnvFile)) {
  fs.writeFileSync(dotEnvFile, dotEnvContent, { encoding: "utf-8" });
}
console.log(`- ioBroker.ds18b20 remote client -

Basic setup done.

Please adjust the settings in the .env file.

To manually start the client just run:
  node ds18b20-remote-client.js

To setup the SystemD service, please run:
  sudo cp ${SYSTEMD_SERVICE_NAME} /etc/systemd/system/${SYSTEMD_SERVICE_NAME}
  sudo systemctl daemon-reload
  sudo systemctl enable ${SYSTEMD_SERVICE_NAME}
  sudo systemctl start ${SYSTEMD_SERVICE_NAME}
`);
//# sourceMappingURL=setup.js.map
