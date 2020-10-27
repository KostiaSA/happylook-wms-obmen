"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sleep_1 = require("./sleep");
const export_1 = require("./export");
const executeSql_1 = require("./executeSql");
const stringAsSql_1 = require("./stringAsSql");
var request = require("request");
async function mainHttpLoop() {
    while (true) {
        console.log("send Http");
        try {
            await mainHttpProcess();
        }
        catch (e) {
            console.error(e);
        }
        await sleep_1.sleep(export_1.config.sendHttpPeriodMs);
    }
}
exports.mainHttpLoop = mainHttpLoop;
async function mainHttpProcess() {
    //await call_1c({ жопа: "23456" });
    let messages = await executeSql_1.executeSql("select Ключ,Текст from _JSON_OUT_MESSAGE WHERE Обработан=1 and Отправлен=0");
    let duration = 0;
    let startTime = new Date();
    for (let msg of messages) {
        try {
            await call_1c(JSON.parse(msg.Текст));
            let endTime = new Date();
            duration = endTime.getTime() - startTime.getTime();
            await executeSql_1.executeSql(`
begin tran
update _JSON_OUT_MESSAGE set Отправлен=1 where Ключ=${msg.Ключ}
insert _JSON_OUT_LOG(Сообщение,Время,Длительность,Ответ) VALUES(${msg.Ключ},getdate(),${duration},'Ok')
commit
`);
        }
        catch (err) {
            let endTime = new Date();
            duration = endTime.getTime() - startTime.getTime();
            await executeSql_1.executeSql(`insert _JSON_OUT_LOG(Сообщение,Время,Длительность,Ответ) VALUES(${msg.Ключ},getdate(),${duration},${stringAsSql_1.stringAsSql(err.toString())})`);
            break;
        }
    }
}
async function call_1c(pack) {
    return new Promise((resolve, reject) => {
        request({
            method: 'POST',
            uri: export_1.config.import1cServiceUrl,
            json: pack,
            timeout: 60000 * 10,
            'auth': {
                'user': 'BusClientBuhta',
                'pass': 'mq16/VRqs&',
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("ответ с сервера 1c", body);
                if (body.Code == 200)
                    resolve(true);
                else if (body.Code && body.Code.toString() != "200")
                    reject("Ошибка " + body.Code + ": " + body.Descr);
                else
                    resolve(true);
            }
            else {
                console.log("ответ с сервера 1c", response.statusCode, body, error);
                reject(error || "error " + response.statusCode);
            }
        });
    });
}
exports.call_1c = call_1c;
//# sourceMappingURL=mainHttpLoop.js.map