![Logo](admin/ds18b20.png)
# ioBroker.ds18b20

[![NPM version](https://img.shields.io/npm/v/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
[![Downloads](https://img.shields.io/npm/dm/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
![Number of Installations (latest)](https://iobroker.live/badges/ds18b20-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/ds18b20-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.ds18b20.png?downloads=true)](https://nodei.co/npm/iobroker.ds18b20/)

**Tests:** ![Test and Release](https://github.com/crycode-de/iobroker.ds18b20/workflows/Test%20and%20Release/badge.svg)

## DS18B20 adapter for ioBroker

This is an ioBroker-Adapter to integrate DS18B20 1-wire temperature sensors.

* **[Description in English](./docs/en/ds18b20.md)**

---

Dies ist ein ioBroker-Adapter zur Integration von DS18B20 1-Wire Temperatursensoren.

* **[Beschreibung in Deutsch](./docs/de/ds18b20.md)**

---

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.


## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**

* (crycode-de) 💥 Node.js 16.4+, js-controller 4+ and admin 5.3+ are required
* (crycode-de) 💥 Changed encryption algorithm for remote clients - remote clients need to be reinstalled to update!
* (crycode-de) Code upgrades to current standards
* (crycode-de) Updated dependencies

### 1.6.1 (2022-12-15)

* (crycode-de) Remote client setup url displayed in admin UI fixed

### 1.6.0 (2022-01-29)

* (crycode-de) Added sorting of sensors in admin and keep the sort order
* (crycode-de) Allow usage of w1_bus_masterX directly as w1DevicesPath
* (crycode-de) Fixed display of errors in admin

### 1.5.4 (2022-01-06)

* (crycode-de) Catch errors while sending request to remote client (IOBROKER-DS18B20-C)

### 1.5.3 (2021-12-28)

* (crycode-de) Increased remote client protocol version to inform users that they should update their remote clients

### 1.5.2 (2021-12-19)

* (ghecker1) Fix remote client reconnect after multiple failed attempts
  * **Reinstall of remote client needed to apply this fix!**

### 1.5.1 (2021-12-12)

* (crycode-de) Fix crash on undefined obj.native
* (crycode-de) Updated remote-client-setup info in admin if https is used

### 1.5.0 (2021-12-11)

* (crycode-de) Add setting to disable specific sensors

### 1.4.2 (2021-11-22)

* (crycode-de) Added some instructions for installing remote client in admin

### 1.4.1 (2021-04-20)

* (crycode-de) Fixed bug if multiple remote sensors are used

### 1.4.0 (2021-02-21)

* (crycode-de) Support for remote sensors using an own tiny daemon and encrypted TCP sockets
* (crycode-de) Set `q` flag to `0x81` (general problem by sensor) if a sensor reported a `null` value

### 1.3.0 (2021-02-11)

* (crycode-de) Searching for sensors now works for multiple 1-wire masters

### 1.2.3 (2021-02-11)

* (crycode-de) Added check of temperatures higher/lower than possible sensor values

### 1.2.2 (2021-02-06)

* (crycode-de) Fixed crash if settings are malformed (IOBROKER-DS18B20-3)

### 1.2.1 (2021-01-09)

* (crycode-de) Small fixes
* (crycode-de) Updated dependencies

### 1.2.0 (2020-12-21)

* (crycode-de) Added Sentry error reporting
* (crycode-de) Updated dependencies
* (crycode-de) Optimized npm package

### 1.1.5 (2020-10-14)

* (crycode-de) Fixed incorrect data type of object
* (crycode-de) Updated dependencies

### 1.1.4 (2020-02-03)

* (crycode-de) Updated connectionType and dataSource in io-package.json.

### 1.1.3 (2020-01-23)

* (crycode-de) Added `connectionType` in `io-package.json` and updated dependencies.

### 1.1.2 (2020-01-22)

* (crycode-de) Better handling of changed objects in admin.

### 1.1.1 (2020-01-09)

* (crycode-de) Fixed wrong communication errror detection on some sensors.

### 1.1.0 (2019-11-11)

* (crycode-de) Own implementation of reading the sensor data.
* (crycode-de) Fixed bug on decimals rounding.
* (crycode-de) 1-wire devices path is now configurable.

### 1.0.3 (2019-11-03)

* (crycode-de) Added documentation about DS18B20 at a Raspberry Pi; Dependencies updated

### 1.0.2 (2019-10-07)

* (crycode-de) Display error message when tried to search for sensors without adapter running.

### 1.0.1 (2019-10-01)

* (crycode-de) Type changed to hardware, Renamed command, Added missing documentation

### 1.0.0 (2019-09-09)

* (crycode-de) initial release


## License

Copyright (c) 2019-2022 Peter Müller <peter@crycode.de>

### MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
