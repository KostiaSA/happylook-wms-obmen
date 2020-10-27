import { config } from "./import";

const sql = require("mssql");

export async function executeSql(sqlText: string): Promise<any[]> {
    console.log("executeSql", sqlText);

    sqlText = "set arithabort on;set numeric_roundabort on;set datefirst 1;set dateformat dmy; " + sqlText;

    const cfg: any = {
        user: config.sqlLogin,
        password: config.sqlPassword,
        server: config.sqlServerAddress, // You can use 'localhost\\instance' to connect to named instance
        database: config.sqlDatabase,
        requestTimeout: 3600000,
        options: {
            appName: "buhta-wms-export",
            abortTransactionOnError: true
        }
    }
    if (config.sqlPort != "1433")
        cfg.port = config.sqlPort;


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