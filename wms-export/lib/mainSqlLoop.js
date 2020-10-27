"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sleep_1 = require("./sleep");
const export_1 = require("./export");
const executeSql_1 = require("./executeSql");
const stringAsSql_1 = require("./stringAsSql");
async function mainSqlLoop() {
    while (true) {
        console.log("check Sql");
        try {
            await mainSqlProcess();
        }
        catch (e) {
            console.error(e);
        }
        await sleep_1.sleep(export_1.config.checkSqlPeriodMs);
    }
}
exports.mainSqlLoop = mainSqlLoop;
async function mainSqlProcess() {
    let messages = await executeSql_1.executeSql("select Ключ,Вид,Документ,ШтрихКод,IDD from _JSON_OUT_MESSAGE WHERE Обработан=0");
    for (let msg of messages) {
        let schemas = await executeSql_1.executeSql("select * from _JSON_OUT_SCHEMA WHERE Отключен=0 and Вид=" + msg.Вид);
        if (schemas.length != 0) {
            let schema = schemas[0];
            if (msg.Документ > 0) {
                let packages = await executeSql_1.executeSql("EXEC " + schema.SqlШапка + " " + msg.Документ);
                if (packages.length == 0)
                    throw "не найден документ вида " + msg.Вид + " с ключом " + msg.Документ;
                let packageObj = {};
                packageObj.НомерПакета = msg.Ключ;
                packageObj.Тип = schema["Название вида"];
                packageObj.Данные = packages[0];
                //Object.assign(packageObj, packages[0]);
                packageObj.Данные.Товары = await executeSql_1.executeSql("EXEC " + schema.SqlТабличнаяЧасть + " " + msg.Документ);
                let jsonText = JSON.stringify(packageObj);
                await executeSql_1.executeSql("UPDATE _JSON_OUT_MESSAGE SET Обработан=1, Текст=" + stringAsSql_1.stringAsSql(jsonText) + " WHERE Ключ=" + msg.Ключ);
                console.log(JSON.stringify(packageObj));
            }
        }
        else
            console.log("отключено");
    }
}
//# sourceMappingURL=mainSqlLoop.js.map