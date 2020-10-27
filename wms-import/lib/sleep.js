"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function sleep(durationMs) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, durationMs);
    });
}
exports.sleep = sleep;
//# sourceMappingURL=sleep.js.map