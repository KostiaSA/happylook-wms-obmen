"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const executeSql_1 = require("./executeSql");
const processRequest_1 = require("./processRequest");
const commandLineArgs = require("command-line-args");
var appRoot = require("app-root-path");
const optionDefinitions = [
    { name: "test-sql", type: Boolean },
    { name: "run", type: Boolean },
];
const options = commandLineArgs(optionDefinitions);
console.log("Программа импорта документов в 'БУХту WMS' от 27.05.2020 ex1");
console.log("Загрузка файла конфигурации 'config.json'");
var fs = require("fs");
//export var config = JSON.parse(fs.readFileSync(appRoot + "/config.json").toString());
exports.config = JSON.parse(fs.readFileSync("config.json").toString());
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
        app.use(express.json({ limit: '100mb' }));
        app.post('/', async (req, res, next) => {
            //console.log("received body=", req.body);
            let ans = await processRequest_1.processRequest(req.body);
            res.send(JSON.stringify(ans));
        });
        app.set("port", exports.config.port);
        app.use((req, res, next) => {
            let err = new Error("Not Found");
            res.status(404);
            console.log("catching 404 error");
            return next(err);
        });
        app.listen(app.get("port"), () => {
            console.log("Buhta server listening on port " + exports.config.port);
        }).on("error", err => {
            console.log("Cannot start server, port most likely in use");
            console.log(err);
        });
    })
        .catch((err) => {
        console.error("Ошибка соединения", err);
        process.exit(1);
    });
}
else {
    console.log("неверные параметры программы, допустимы --test-sql, --run");
    process.exit(1);
}
/////////////////
/////////////////
/////////////////
/////////////////
//# sourceMappingURL=import.js.map