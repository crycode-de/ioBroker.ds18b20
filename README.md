![Logo](admin/ds18b20.png)
# ioBroker.ds18b20

[![NPM version](https://img.shields.io/npm/v/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
[![Downloads](https://img.shields.io/npm/dm/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
![Number of Installations (latest)](https://iobroker.live/badges/ds18b20-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/ds18b20-stable.svg)
[![Dependency Status](https://img.shields.io/david/crycode-de/iobroker.ds18b20.svg)](https://david-dm.org/crycode-de/iobroker.ds18b20)

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

### 1.2.1 (2021-01-09)
* (crycode-de) Small fixes

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

Copyright (c) 2019-2021 Peter Müller <peter@crycode.de>

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
