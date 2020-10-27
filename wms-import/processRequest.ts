import { isNumber, isString } from "util";
import { stringAsSql } from './stringAsSql';
import { executeSql } from "./executeSql";
import { sleep } from "./sleep";

interface IAns {
    Ошибка: number,
    ТекстОшибки: string
}

function checkPackage(body: any): IAns {

    if (!body.НомерПакета)
        return { Ошибка: 3, ТекстОшибки: "нет тэга 'НомерПакета'" };

    if (!body.Данные)
        return { Ошибка: 3, ТекстОшибки: "нет тэга 'Данные'" };

    body.НомерПакета = Number.parseInt(body.НомерПакета);

    if (isNaN(body.НомерПакета))
        return { Ошибка: 3, ТекстОшибки: "неверный тэг 'НомерПакета'" };

    if (!Array.isArray(body.Данные) || body.Данные.length == 0)
        return { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Данные'" };

    if (!body.Комментарий)
        body.Комментарий = " ";

    if (!body.ФИОМенеджера)
        body.ФИОМенеджера = "";

    return { Ошибка: 0, ТекстОшибки: "OK" };

}

async function saveErrorToLog(body: any, err: IAns): Promise<IAns> {
    if (!body.Тип)
        body.Тип = "?";

    if (isNaN(parseInt(body.НомерПакета)))
        body.НомерПакета = 0;

    try {
        await executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql(body.Тип.toString())},
    ${stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    0,
    '',
    0,
    ${stringAsSql(err.ТекстОшибки)}
)`);
    }
    catch{

    }

    return err;
}

async function executeSqlInCycle() {

}

let sqlQueue: { sql: string[], body: any }[] = [];
async function runSqlQueue() {

    while (true) {
        if (sqlQueue.length > 0) {
            var q = sqlQueue.shift();
            try {
                if (q) await executeImportPackageEx(q.sql, q.body);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            await sleep(1000);
            console.log("wait", new Date());
        }
    }
}
runSqlQueue().then();


async function executeImportPackage(sql: string[], body: any): Promise<IAns> {
    sqlQueue.push({ sql, body });
    // setTimeout(async () => {
    //     await executeImportPackageEx(sql, body);
    // }, 1000);

    return { Ошибка: 0, ТекстОшибки: "OK" };
}

async function executeImportPackageEx(sql: string[], body: any): Promise<IAns> {
    let duration = 0;
    let startTime: Date = new Date();

    try {
        await executeSql(sql.join("\n"));

        let endTime = new Date();
        duration = endTime.getTime() - startTime.getTime();
        await executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql(body.Тип.toString())},
    ${stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    ${duration},
    ${stringAsSql(sql.join("\n"))},
    1,
    'OK'
)`);
        return { Ошибка: 0, ТекстОшибки: "OK" };
    }
    catch (err) {
        let endTime = new Date();
        duration = endTime.getTime() - startTime.getTime();

        await executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql(body.Тип.toString())},
    ${stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    ${duration},
    ${stringAsSql(sql.join("\n"))},
    0,
    ${stringAsSql(err.toString())}
)`);
        return { Ошибка: 3, ТекстОшибки: err.toString() };
    }

}

export async function processRequest(body: any): Promise<IAns> {
    if (body.Тип == "Справочник.НоменклатурныеГруппы") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {
            if (!isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });

            if (!isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });

            if (!isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });

            if (!isString(obj.Родитель) || obj.Родитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Родитель'" });

            sql.push(`
delete from [_JSON_IN_Вид ТМЦ] where _1С_GUID=${stringAsSql(obj.IDD)};
insert [_JSON_IN_Вид ТМЦ]([_1С_GUID],[Код],[Наименование],[Родитель]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${stringAsSql(obj.Код)}, 
    ${stringAsSql(obj.Наименование)}, 
    ${stringAsSql(obj.Родитель)} 
 );`);
        }

        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");

        return executeImportPackage(sql, body);

    }
    else if (body.Тип == "Справочник.Номенклатура") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {
            if (!obj.Комментарий)
                obj.Комментарий = "";

            if (!isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });

            if (!isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });

            if (!isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });

            if (!isString(obj.Родитель) || obj.Родитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Родитель'" });

            if (!isString(obj.Бренд) || obj.Бренд.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Бренд'" });

            if (!isString(obj.ЕдИзм) || obj.ЕдИзм.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ЕдИзм'" });

            if (!isString(obj.Артикул) || obj.Артикул.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Артикул'" });

            if (typeof obj.КолВУпаковке != "number")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'КолВУпаковке'" });

            sql.push(`
delete from [_JSON_IN_ТМЦ] where _1С_GUID=${stringAsSql(obj.IDD)};
insert [_JSON_IN_ТМЦ]([_1С_GUID],[Код],[Наименование],[Родитель],[Бренд],[Ед.изм.],[Кол. в упаковке],[Артикул]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${stringAsSql(obj.Код)}, 
    ${stringAsSql(obj.Наименование)}, 
    ${stringAsSql(obj.Родитель)}, 
    ${stringAsSql(obj.Бренд)}, 
    ${stringAsSql(obj.ЕдИзм)}, 
    ${obj.КолВУпаковке}, 
    ${stringAsSql(obj.Артикул)} 
 );`);
        }

        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");

        return executeImportPackage(sql, body);

    }
    else if (body.Тип == "Справочник.Контрагенты") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {
            if (!isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });

            if (!isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });

            if (!isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });

            if (!isString(obj.ИНН) || obj.ИНН.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ИНН'" });

            if (!isString(obj.КПП) || obj.КПП.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'КПП'" });

            if (!isString(obj.Адрес) || obj.Адрес.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Адрес'" });

            if (!isString(obj.ГрузополучательАдрес) || obj.ГрузополучательАдрес.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ГрузополучательАдрес'" });

            if (!isString(obj.ФИОМенеджера))
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ФИОМенеджера'" });

            sql.push(`
delete from [_JSON_IN_Организация] where _1С_GUID=${stringAsSql(obj.IDD)};
insert [_JSON_IN_Организация]([_1С_GUID],[Код],[Наименование],[ИНН],[КПП],[Адрес],[ГрузополучательАдрес],[ФИОМенеджера]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${stringAsSql(obj.Код)}, 
    ${stringAsSql(obj.Наименование.toString().substr(0, 100))}, 
    ${stringAsSql(obj.ИНН.toString().substr(0, 15))}, 
    ${stringAsSql(obj.КПП.toString().substr(0, 12))}, 
    ${stringAsSql(obj.Адрес.toString().substr(0, 200))}, 
    ${stringAsSql(obj.ГрузополучательАдрес.toString().substr(0, 100))}, 
    ${stringAsSql(obj.ФИОМенеджера)} 
 );`);
        }
        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");
        return executeImportPackage(sql, body);
    }
    else if (body.Тип == "РегистрСведений.Штрихкоды") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {
            if (!isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });

            if (!isString(obj.Товар) || obj.Товар.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Товар'" });

            if (typeof obj.Количество != "number")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Количество'" });

            sql.push(`
delete from [_JSON_IN_ШтрихКод] where [Код]=${stringAsSql(obj.Код)};
insert [_JSON_IN_ШтрихКод]([Код],[ТМЦ],[Количество]) 
values(
    ${stringAsSql(obj.Код)}, 
    ${stringAsSql(obj.Товар)}, 
    ${obj.Количество} 
 );`);
        }

        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");

        return executeImportPackage(sql, body);

    }
    else if (body.Тип == "Документ.ПоступлениеТоваровУслуг" || body.Тип == "Документ.РеализацияТоваровУслуг") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        let docvid: string = '1';
        let dateOtgr: string = '';
        if (body.Тип == "Документ.РеализацияТоваровУслуг")
            docvid = '2';

        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {

            if (!obj.Комментарий)
                obj.Комментарий = "";

            if (!isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });

            //    if (!isString(obj.Вид) || obj.Вид.trim() == "")
            //        return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Вид'" });

            if (!isString(obj.Номер) || obj.Номер.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номер'" });

            if (!isString(obj.Дата) || obj.Дата.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Дата'" });

            if (!isString(obj.Комментарий))
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "тэг 'Комментарий'" });

            if (!isString(obj.Поставщик) || obj.Поставщик.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Поставщик'" });

            if (!isString(obj.Грузоотправитель) || obj.Грузоотправитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Грузоотправитель'" });

            if (!isString(obj.Получатель) || obj.Получатель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Получатель'" });

            if (!isString(obj.Грузополучатель) || obj.Грузоотправитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Грузополучатель'" });

            if (isString(obj.ДатаОтгрузки))
                dateOtgr = obj.ДатаОтгрузки;

            sql.push(`
delete from [_JSON_IN_Договор] where _1С_GUID=${stringAsSql(obj.IDD)};
delete from [_JSON_IN_Догспец] where  Договор=${stringAsSql(obj.IDD)};
insert [_JSON_IN_Договор]([_1С_GUID],[Вид],[Номер документа],[ДатаВремяИз1С],[Комментарий],[Поставщик],[Грузоотправитель],[Получатель],[Грузополучатель],[ДатаОтгрузкиИз1С]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${docvid}, 
    ${stringAsSql(obj.Номер)}, 
    ${stringAsSql(obj.Дата)}, 
    ${stringAsSql(obj.Комментарий)}, 
    ${stringAsSql(obj.Поставщик)}, 
    ${stringAsSql(obj.Грузоотправитель)}, 
    ${stringAsSql(obj.Получатель)}, 
    ${stringAsSql(obj.Грузополучатель)}, 
    ${stringAsSql(dateOtgr)} 
 );`);

            for (let spc of obj.Товары) {
                if (!isString(spc.Номенклатура) || spc.Номенклатура.trim() == "")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номенклатура'" });
                if (typeof spc.Количество != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Количество'" });
                if (typeof spc.ПорядокВвода != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'ПорядокВвода'" });
                if (typeof spc.Цена != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Цена'" });
                if (typeof spc.Сумма != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Сумма'" });
                sql.push(`
insert [_JSON_IN_Догспец]([Договор],[ТМЦ],[Количество],[Цена],[Сумма],[Порядок ввода]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${stringAsSql(spc.Номенклатура)}, 
    ${spc.Количество}, 
    ${spc.Цена}, 
    ${spc.Сумма}, 
    ${spc.ПорядокВвода} 
 );`);
            }
        }

        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");

        return executeImportPackage(sql, body);

    }
    else if (body.Тип == "Документ.КомплектацияНоменклатуры") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);

        let sql: string[] = [];
        let docvid: string = '200';
        let KomplIDD: string = '';

        sql.push("BEGIN TRAN;");

        for (let obj of body.Данные) {
            if (!isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });

            if (!isString(obj.Номер) || obj.Номер.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номер'" });

            if (!isString(obj.Дата) || obj.Дата.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Дата'" });

            if (!isString(obj.Поставщик) || obj.Поставщик.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Поставщик'" });

            if (!isString(obj.Номенклатура) || obj.Номенклатура.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номенклатура'" });

            KomplIDD = obj.Номенклатура;

            sql.push(`
delete from [_JSON_IN_Договор] where _1С_GUID=${stringAsSql(obj.IDD)};
delete from [_JSON_IN_Догспец] where  Договор=${stringAsSql(obj.IDD)};
insert [_JSON_IN_Договор]([_1С_GUID],[Вид],[Номер документа],[ДатаВремяИз1С],[Поставщик]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${docvid}, 
    ${stringAsSql(obj.Номер)}, 
    ${stringAsSql(obj.Дата)}, 
    ${stringAsSql(obj.Поставщик)} 
 );`);

            for (let spc of obj.Товары) {
                if (!isString(spc.Номенклатура) || spc.Номенклатура.trim() == "")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номенклатура'" });
                if (typeof spc.Количество != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Количество'" });
                if (typeof spc.НомерСтроки != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'НомерСтроки'" });
                sql.push(`
insert [_JSON_IN_Догспец]([Договор],[ТМЦ],[Комплектующий],[Количество],[Порядок ввода]) 
values(
    ${stringAsSql(obj.IDD)}, 
    ${stringAsSql(KomplIDD)},
    ${stringAsSql(spc.Номенклатура)}, 
    ${spc.Количество},      
    ${spc.НомерСтроки} 
 );`);
            }
        }

        sql.push("EXEC [_JSON_IN_Импорт];");
        sql.push("COMMIT;");

        return executeImportPackage(sql, body);

    }

    //////////////////////////////////////////////////////// Справочник.Контрагенты /////////////////////////////////////////////////

    // копать тут

    else {
        return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный 'Тип' пакета: '" + body.Тип + "'" });
    }
}



