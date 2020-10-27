"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function stringAsSql(str) {
    return "'" + str.replace(/./g, function (char) {
        switch (char) {
            case "'":
                return "''";
            default:
                return char;
        }
    }) + "'";
}
exports.stringAsSql = stringAsSql;
//# sourceMappingURL=stringAsSql.js.map