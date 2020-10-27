"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const executeSql_1 = require("./executeSql");
const mainSqlLoop_1 = require("./mainSqlLoop");
const mainHttpLoop_1 = require("./mainHttpLoop");
const commandLineArgs = require("command-line-args");
var appRoot = require("app-root-path");
const express = require("express");
const optionDefinitions = [
    { name: "test-sql", type: Boolean },
    { name: "test-http", type: Boolean },
    { name: "run", type: Boolean },
];
const options = commandLineArgs(optionDefinitions);
console.log("Программа экспорта документов из 'БУХта WMS'");
console.log("Загрузка файла конфигурации 'config.json'");
var fs = require("fs");
try {
    exports.config = JSON.parse(fs.readFileSync("config.json").toString());
}
catch (err) {
    console.error("Ошибка чтения файла 'config.json'", err);
    fs.writeFileSync("export.log", err.toString(), "utf8");
    process.exit(1);
}
if (options["test-sql"]) {
    console.log("тест соединения с SQL сервером");
    console.log("sql server: " + exports.config.sqlServerAddress + ":" + exports.config.sqlServerPort);
    console.log("sql база  : " + exports.config.sqlDatabase);
    console.log("sql login : " + exports.config.sqlLogin);
    executeSql_1.executeSql("select * from _JSON_OUT_SCHEMA")
        .then((rows) => {
        console.log("Соединение Ok");
        process.exit(0);
    })
        .catch((err) => {
        console.error("Ошибка соединения", err);
        fs.writeFileSync("export.log", err.toString(), "utf8");
        process.exit(1);
    });
}
else if (options["run"]) {
    console.log("sql server: " + exports.config.sqlServerAddress + ":" + exports.config.sqlServerPort);
    console.log("sql база  : " + exports.config.sqlDatabase);
    console.log("sql login : " + exports.config.sqlLogin);
    executeSql_1.executeSql("select * from _JSON_OUT_SCHEMA")
        .then((rows) => {
        const app = express();
        app.set("port", 17347);
        app.listen(app.get("port"), () => {
            console.log("Соединение Ok");
            console.log("программа в рабочем состоянии...");
            mainSqlLoop_1.mainSqlLoop().then(() => { }).catch(() => { });
            mainHttpLoop_1.mainHttpLoop().then(() => { }).catch(() => { });
        }).on("error", err => {
            console.log("Уже запущен экземпляр программы.");
            fs.writeFileSync("export.log", err.toString(), "utf8");
            process.exit(0);
        });
    })
        .catch((err) => {
        console.error("Ошибка соединения", err);
        fs.writeFileSync("export.log", err.toString(), "utf8");
        process.exit(1);
    });
}
else {
    console.log("неверные параметры программы, допустимы --test-sql, --test-http, --run");
    fs.writeFileSync("export.log", "неверные параметры программы, допустимы --test-sql, --test-http, --run", "utf8");
    process.exit(1);
}
//# sourceMappingURL=export.js.map