import { sleep } from "./sleep";
import { config } from './export';
import { IMessage } from "./mainSqlLoop";
import { executeSql } from "./executeSql";
import { stringAsSql } from "./stringAsSql";

var request = require("request");

export async function mainHttpLoop() {

    while (true) {
        console.log("send Http");
        try {
            await mainHttpProcess();
        }
        catch (e) {
            console.error(e);
        }

        await sleep(config.sendHttpPeriodMs);
    }
}

async function mainHttpProcess() {
    //await call_1c({ жопа: "23456" });

    let messages: IMessage[] = await executeSql("select Ключ,Текст from _JSON_OUT_MESSAGE WHERE Обработан=1 and Отправлен=0");

    let duration = 0;
    let startTime: Date = new Date();
    for (let msg of messages) {
        try {
            await call_1c(JSON.parse(msg.Текст));
            let endTime = new Date();
            duration = endTime.getTime() - startTime.getTime();
            await executeSql(
                `
begin tran
update _JSON_OUT_MESSAGE set Отправлен=1 where Ключ=${msg.Ключ}
insert _JSON_OUT_LOG(Сообщение,Время,Длительность,Ответ) VALUES(${msg.Ключ},getdate(),${duration},'Ok')
commit
`);
        }
        catch (err) {
            let endTime = new Date();
            duration = endTime.getTime() - startTime.getTime();
            await executeSql(`insert _JSON_OUT_LOG(Сообщение,Время,Длительность,Ответ) VALUES(${msg.Ключ},getdate(),${duration},${stringAsSql(err.toString())})`);
            break;
        }
    }


}

export async function call_1c(pack: any): Promise<boolean> {

    return new Promise<any>(
        (resolve: (obj: any) => void, reject: (error: string) => void) => {

            request(
                {
                    method: 'POST',
                    uri: config.import1cServiceUrl,
                    json: pack,
                    timeout: 60000 * 10,
                    'auth': {
                        'user': 'BusClientBuhta',
                        'pass': 'mq16/VRqs&',
                    }
                },
                function (error: any, response: any, body: any) {
                    if (!error && response.statusCode == 200) {
                        console.log("ответ с сервера 1c", body)
                        if (body.Code == 200)
                            resolve(true);
                        else
                            if (body.Code && body.Code.toString() != "200")
                                reject("Ошибка " + body.Code + ": " + body.Descr)
                            else
                                resolve(true);
                    }
                    else {
                        console.log("ответ с сервера 1c", response.statusCode, body, error)
                        reject(error || "error " + response.statusCode)
                    }
                }
            );

        });

}