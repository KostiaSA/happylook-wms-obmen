"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const import_1 = require("./import");
const sql = require("mssql");
async function executeSql(sqlText) {
    console.log("executeSql", sqlText);
    sqlText = "set arithabort on;set numeric_roundabort on;set datefirst 1;set dateformat dmy; " + sqlText;
    const cfg = {
        user: import_1.config.sqlLogin,
        password: import_1.config.sqlPassword,
        server: import_1.config.sqlServerAddress,
        database: import_1.config.sqlDatabase,
        requestTimeout: 3600000,
        options: {
            appName: "buhta-wms-export",
            abortTransactionOnError: true
        }
    };
    if (import_1.config.sqlPort != "1433")
        cfg.port = import_1.config.sqlPort;
    //pool = await sql.connect(cfg);
    let pool = new sql.ConnectionPool(cfg);
    //console.log("executeSql1");
    await pool.connect();
    //console.log("executeSql2");
    let result1 = await pool.request().query(sqlText);
    //console.log("executeSql3");
    await pool.close();
    //console.log("executeSql4");
    return result1.recordset;
}
exports.executeSql = executeSql;
//# sourceMappingURL=executeSql.js.map