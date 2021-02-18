"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round = void 0;
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
//# sourceMappingURL=tools.js.map