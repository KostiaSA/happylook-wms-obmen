import { sleep } from "./sleep";
import { config } from "./export";
import { executeSql } from "./executeSql";
import { stringAsSql } from "./stringAsSql";

export async function mainSqlLoop() {

    while (true) {
        console.log("check Sql");
        try {
            await mainSqlProcess();
        }
        catch (e) {
            console.error(e);
        }
        await sleep(config.checkSqlPeriodMs);
    }
}

export interface IMessage {
    Ключ: number;
    Вид: number;
    Документ: number;
    ШтрихКод: number;
    IDD: string;
    Текст: string;
}

interface ISchema {
    "Название вида": number;
    SqlШапка: number;
    SqlТабличнаяЧасть: number;
}

async function mainSqlProcess() {

    let messages: IMessage[] = await executeSql("select Ключ,Вид,Документ,ШтрихКод,IDD from _JSON_OUT_MESSAGE WHERE Обработан=0");

    for (let msg of messages) {
        let schemas: ISchema[] = await executeSql("select * from _JSON_OUT_SCHEMA WHERE Отключен=0 and Вид=" + msg.Вид);
        if (schemas.length != 0) {
            let schema = schemas[0];

            if (msg.Документ > 0) {
                let packages: any = await executeSql("EXEC " + schema.SqlШапка + " " + msg.Документ);
                if (packages.length == 0)
                    throw "не найден документ вида " + msg.Вид + " с ключом " + msg.Документ;

                let packageObj: any = {};
                packageObj.НомерПакета = msg.Ключ;
                packageObj.Тип = schema["Название вида"];
                packageObj.Данные = packages[0];
                //Object.assign(packageObj, packages[0]);
                packageObj.Данные.Товары = await executeSql("EXEC " + schema.SqlТабличнаяЧасть + " " + msg.Документ);

                let jsonText = JSON.stringify(packageObj);
                await executeSql("UPDATE _JSON_OUT_MESSAGE SET Обработан=1, Текст=" + stringAsSql(jsonText) + " WHERE Ключ=" + msg.Ключ);

                console.log(JSON.stringify(packageObj));
            }

        }
        else
            console.log("отключено");
    }

}