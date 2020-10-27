"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sleep_1 = require("./sleep");
const export_1 = require("./export");
async function mainSqlLoop() {
    while (true) {
        console.log("checkSql");
        await sleep_1.sleep(export_1.config.checkSqlPeriodMs);
    }
}
exports.mainSqlLoop = mainSqlLoop;
//# sourceMappingURL=mainLoop.js.map