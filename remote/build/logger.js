"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    log(...args) {
        console.log(...args);
    }
    debug(...args) {
        if (!process.env.DEBUG) {
            return;
        }
        console.log('[Debug]', ...args);
    }
    info(...args) {
        console.log('[Info]', ...args);
    }
    warn(...args) {
        console.warn('[Warn]', ...args);
    }
    error(...args) {
        console.error('[Error]', ...args);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map