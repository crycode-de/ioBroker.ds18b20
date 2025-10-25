![Logo](admin/ds18b20.png)

# ioBroker.ds18b20

[![NPM version](https://img.shields.io/npm/v/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
[![Downloads](https://img.shields.io/npm/dm/iobroker.ds18b20.svg)](https://www.npmjs.com/package/iobroker.ds18b20)
![Number of Installations (latest)](https://iobroker.live/badges/ds18b20-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/ds18b20-stable.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/ds18b20/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)

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
### 3.1.1 (2025-10-25)

* (crycode-de) Updated Sentry DSN

### 3.1.0 (2025-10-21)

* (crycode-de) Node.js >= 20, js-controller >= 6.0.11, Admin >= 7.6.17 required
* (crycode-de) Updated dependencies

### 3.0.1 (2024-11-16)

* (crycode-de) Added missing sizes to jsonConfig

### 3.0.0 (2024-10-16)

* (crycode-de) Node >= 18, js-controller >= 5.0.19 required
* (crycode-de) Fixed possible issue on sensor search
* (crycode-de) Small style fixes for jsonConfig
* (crycode-de) Updated dependencies
* (crycode-de) Refactored some code parts

### 2.0.5 (2023-10-29)

* (crycode-de) Fixed cosmetic issue in config UI

## License

Copyright (c) 2019-2025 Peter Müller <peter@crycode.de>

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
