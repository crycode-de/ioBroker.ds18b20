"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const SYSTEMD_SERVICE_NAME = 'iobroker-ds18b20-remote.service';
const files = {
    FILE: 'DUMMY'
};
for (const f in files) {
    const content = Buffer.from(files[f], 'base64').toString('utf-8');
    fs.writeFileSync(f, content, { encoding: 'utf-8' });
}
const systemDContent = `[Unit]
Description=ioBroker.ds18b20 remote client
Documentation=https://github.com/crycode-de/ioBroker.ds18b20
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${__dirname}
ExecStart=${process.execPath} ${path.join(__dirname, 'ds18b20-remote-client.js')}
Restart=on-failure

[Install]
WantedBy=multi-user.target
`;
const systemDFile = path.join(__dirname, SYSTEMD_SERVICE_NAME);
fs.writeFileSync(systemDFile, systemDContent, { encoding: 'utf-8' });
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
const dotEnvFile = path.join(__dirname, '.env');
if (!fs.existsSync(dotEnvFile)) {
    fs.writeFileSync(dotEnvFile, dotEnvContent, { encoding: 'utf-8' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmVtb3RlL3NldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBTUEseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFFN0IsTUFBTSxvQkFBb0IsR0FBRyxpQ0FBaUMsQ0FBQztBQUUvRCxNQUFNLEtBQUssR0FBMkI7SUFDcEMsSUFBSSxFQUFFLE9BQU87Q0FDZCxDQUFDO0FBRUYsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7SUFDckIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0NBQ3JEO0FBRUQsTUFBTSxjQUFjLEdBQUc7Ozs7Ozs7T0FPaEIsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVE7bUJBQ1YsU0FBUztZQUNoQixPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDOzs7OztDQUsvRSxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUMvRCxFQUFFLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUVyRSxNQUFNLGFBQWEsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1CckIsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2hELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0lBQzlCLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0NBQ3BFO0FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQzs7Ozs7Ozs7OztZQVVBLG9CQUFvQix3QkFBd0Isb0JBQW9COzswQkFFbEQsb0JBQW9CO3lCQUNyQixvQkFBb0I7Q0FDNUMsQ0FBQyxDQUFDIn0=