"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round = void 0;
/**
 * Round a floating point number to the given precision.
 * @param num       The number.
 * @param precision The number of decimals to round to.
 * @return          The rounded number.
 */
function round(num, precision) {
    if (precision == 0)
        return Math.round(num);
    let exp = 1;
    for (let i = 0; i < precision; i++) {
        exp *= 10;
    }
    return Math.round(num * exp) / exp;
}
exports.round = round;
