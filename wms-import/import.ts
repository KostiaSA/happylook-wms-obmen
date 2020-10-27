import * as express from "express";
import { sleep } from "./sleep";
import { executeSql } from "./executeSql";
import { processRequest } from "./processRequest";


const commandLineArgs = require("command-line-args")
var appRoot = require("app-root-path");

const optionDefinitions = [
    { name: "test-sql", type: Boolean },
    { name: "run", type: Boolean },
];

const options = commandLineArgs(optionDefinitions)

console.log("Программа импорта документов в 'БУХту WMS' от 27.05.2020 ex1");

console.log("Загрузка файла конфигурации 'config.json'");
var fs = require("fs");
//export var config = JSON.parse(fs.readFileSync(appRoot + "/config.json").toString());
export var config = JSON.parse(fs.readFileSync("config.json").toString());


if (options["test-sql"]) {

    console.log("тест соединения с SQL сервером");

    console.log("sql server: " + config.sqlServerAddress + ":" + config.sqlServerPort);
    console.log("sql база  : " + config.sqlDatabase);
    console.log("sql login : " + config.sqlLogin);

    executeSql("select * from _JSON_OUT_SCHEMA")
        .then((rows) => {
            console.log("Соединение Ok");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Ошибка соединения", err);
            process.exit(1);
        });
}
else
    if (options["run"]) {
        console.log("sql server: " + config.sqlServerAddress + ":" + config.sqlServerPort);
        console.log("sql база  : " + config.sqlDatabase);
        console.log("sql login : " + config.sqlLogin);

        executeSql("select * from _JSON_OUT_SCHEMA")
            .then((rows) => {
                const app = express();

                app.use(express.json({ limit: '100mb' }));

                app.post('/', async (req: express.Request, res: express.Response, next: Function) => {
                    //console.log("received body=", req.body);


                    let ans = await processRequest(req.body);

                    res.send(JSON.stringify(ans));

                });
                app.set("port", config.port);

                app.use((req: express.Request, res: express.Response, next: Function) => {
                    let err = new Error("Not Found");
                    res.status(404);
                    console.log("catching 404 error");
                    return next(err);
                });

                app.listen(app.get("port"), () => {
                    console.log("Buhta server listening on port " + config.port);
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



