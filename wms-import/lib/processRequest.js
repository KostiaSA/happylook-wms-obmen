"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const stringAsSql_1 = require("./stringAsSql");
const executeSql_1 = require("./executeSql");
const sleep_1 = require("./sleep");
function checkPackage(body) {
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
async function saveErrorToLog(body, err) {
    if (!body.Тип)
        body.Тип = "?";
    if (isNaN(parseInt(body.НомерПакета)))
        body.НомерПакета = 0;
    try {
        await executeSql_1.executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql_1.stringAsSql(body.Тип.toString())},
    ${stringAsSql_1.stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    0,
    '',
    0,
    ${stringAsSql_1.stringAsSql(err.ТекстОшибки)}
)`);
    }
    catch {
    }
    return err;
}
async function executeSqlInCycle() {
}
let sqlQueue = [];
async function runSqlQueue() {
    while (true) {
        if (sqlQueue.length > 0) {
            var q = sqlQueue.shift();
            try {
                if (q)
                    await executeImportPackageEx(q.sql, q.body);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            await sleep_1.sleep(1000);
            console.log("wait", new Date());
        }
    }
}
runSqlQueue().then();
async function executeImportPackage(sql, body) {
    sqlQueue.push({ sql, body });
    // setTimeout(async () => {
    //     await executeImportPackageEx(sql, body);
    // }, 1000);
    return { Ошибка: 0, ТекстОшибки: "OK" };
}
async function executeImportPackageEx(sql, body) {
    let duration = 0;
    let startTime = new Date();
    try {
        await executeSql_1.executeSql(sql.join("\n"));
        let endTime = new Date();
        duration = endTime.getTime() - startTime.getTime();
        await executeSql_1.executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql_1.stringAsSql(body.Тип.toString())},
    ${stringAsSql_1.stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    ${duration},
    ${stringAsSql_1.stringAsSql(sql.join("\n"))},
    1,
    'OK'
)`);
        return { Ошибка: 0, ТекстОшибки: "OK" };
    }
    catch (err) {
        let endTime = new Date();
        duration = endTime.getTime() - startTime.getTime();
        await executeSql_1.executeSql(`
insert _JSON_IN_LOG([Номер пакета],[Тип пакета],Сообщение,[Время создания],[Дата создания],Длительность,SQL,Обработан,Ошибка) 
values(
    ${body.НомерПакета},
    ${stringAsSql_1.stringAsSql(body.Тип.toString())},
    ${stringAsSql_1.stringAsSql(JSON.stringify(body))},
    getdate(),
    convert(date,getdate()),
    ${duration},
    ${stringAsSql_1.stringAsSql(sql.join("\n"))},
    0,
    ${stringAsSql_1.stringAsSql(err.toString())}
)`);
        return { Ошибка: 3, ТекстОшибки: err.toString() };
    }
}
async function processRequest(body) {
    if (body.Тип == "Справочник.НоменклатурныеГруппы") {
        let err = checkPackage(body);
        if (err.Ошибка != 0)
            return saveErrorToLog(body, err);
        let sql = [];
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!util_1.isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });
            if (!util_1.isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });
            if (!util_1.isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });
            if (!util_1.isString(obj.Родитель) || obj.Родитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Родитель'" });
            sql.push(`
delete from [_JSON_IN_Вид ТМЦ] where _1С_GUID=${stringAsSql_1.stringAsSql(obj.IDD)};
insert [_JSON_IN_Вид ТМЦ]([_1С_GUID],[Код],[Наименование],[Родитель]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${stringAsSql_1.stringAsSql(obj.Код)}, 
    ${stringAsSql_1.stringAsSql(obj.Наименование)}, 
    ${stringAsSql_1.stringAsSql(obj.Родитель)} 
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
        let sql = [];
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!obj.Комментарий)
                obj.Комментарий = "";
            if (!util_1.isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });
            if (!util_1.isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });
            if (!util_1.isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });
            if (!util_1.isString(obj.Родитель) || obj.Родитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Родитель'" });
            if (!util_1.isString(obj.Бренд) || obj.Бренд.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Бренд'" });
            if (!util_1.isString(obj.ЕдИзм) || obj.ЕдИзм.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ЕдИзм'" });
            if (!util_1.isString(obj.Артикул) || obj.Артикул.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Артикул'" });
            if (typeof obj.КолВУпаковке != "number")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'КолВУпаковке'" });
            sql.push(`
delete from [_JSON_IN_ТМЦ] where _1С_GUID=${stringAsSql_1.stringAsSql(obj.IDD)};
insert [_JSON_IN_ТМЦ]([_1С_GUID],[Код],[Наименование],[Родитель],[Бренд],[Ед.изм.],[Кол. в упаковке],[Артикул]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${stringAsSql_1.stringAsSql(obj.Код)}, 
    ${stringAsSql_1.stringAsSql(obj.Наименование)}, 
    ${stringAsSql_1.stringAsSql(obj.Родитель)}, 
    ${stringAsSql_1.stringAsSql(obj.Бренд)}, 
    ${stringAsSql_1.stringAsSql(obj.ЕдИзм)}, 
    ${obj.КолВУпаковке}, 
    ${stringAsSql_1.stringAsSql(obj.Артикул)} 
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
        let sql = [];
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!util_1.isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });
            if (!util_1.isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });
            if (!util_1.isString(obj.Наименование) || obj.Наименование.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Наименование'" });
            if (!util_1.isString(obj.ИНН) || obj.ИНН.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ИНН'" });
            if (!util_1.isString(obj.КПП) || obj.КПП.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'КПП'" });
            if (!util_1.isString(obj.Адрес) || obj.Адрес.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Адрес'" });
            if (!util_1.isString(obj.ГрузополучательАдрес) || obj.ГрузополучательАдрес.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ГрузополучательАдрес'" });
            if (!util_1.isString(obj.ФИОМенеджера))
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'ФИОМенеджера'" });
            sql.push(`
delete from [_JSON_IN_Организация] where _1С_GUID=${stringAsSql_1.stringAsSql(obj.IDD)};
insert [_JSON_IN_Организация]([_1С_GUID],[Код],[Наименование],[ИНН],[КПП],[Адрес],[ГрузополучательАдрес],[ФИОМенеджера]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${stringAsSql_1.stringAsSql(obj.Код)}, 
    ${stringAsSql_1.stringAsSql(obj.Наименование.toString().substr(0, 100))}, 
    ${stringAsSql_1.stringAsSql(obj.ИНН.toString().substr(0, 15))}, 
    ${stringAsSql_1.stringAsSql(obj.КПП.toString().substr(0, 12))}, 
    ${stringAsSql_1.stringAsSql(obj.Адрес.toString().substr(0, 200))}, 
    ${stringAsSql_1.stringAsSql(obj.ГрузополучательАдрес.toString().substr(0, 100))}, 
    ${stringAsSql_1.stringAsSql(obj.ФИОМенеджера)} 
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
        let sql = [];
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!util_1.isString(obj.Код) || obj.Код.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Код'" });
            if (!util_1.isString(obj.Товар) || obj.Товар.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Товар'" });
            if (typeof obj.Количество != "number")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Количество'" });
            sql.push(`
delete from [_JSON_IN_ШтрихКод] where [Код]=${stringAsSql_1.stringAsSql(obj.Код)};
insert [_JSON_IN_ШтрихКод]([Код],[ТМЦ],[Количество]) 
values(
    ${stringAsSql_1.stringAsSql(obj.Код)}, 
    ${stringAsSql_1.stringAsSql(obj.Товар)}, 
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
        let sql = [];
        let docvid = '1';
        let dateOtgr = '';
        if (body.Тип == "Документ.РеализацияТоваровУслуг")
            docvid = '2';
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!obj.Комментарий)
                obj.Комментарий = "";
            if (!util_1.isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });
            //    if (!isString(obj.Вид) || obj.Вид.trim() == "")
            //        return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Вид'" });
            if (!util_1.isString(obj.Номер) || obj.Номер.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номер'" });
            if (!util_1.isString(obj.Дата) || obj.Дата.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Дата'" });
            if (!util_1.isString(obj.Комментарий))
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "тэг 'Комментарий'" });
            if (!util_1.isString(obj.Поставщик) || obj.Поставщик.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Поставщик'" });
            if (!util_1.isString(obj.Грузоотправитель) || obj.Грузоотправитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Грузоотправитель'" });
            if (!util_1.isString(obj.Получатель) || obj.Получатель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Получатель'" });
            if (!util_1.isString(obj.Грузополучатель) || obj.Грузоотправитель.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Грузополучатель'" });
            if (util_1.isString(obj.ДатаОтгрузки))
                dateOtgr = obj.ДатаОтгрузки;
            sql.push(`
delete from [_JSON_IN_Договор] where _1С_GUID=${stringAsSql_1.stringAsSql(obj.IDD)};
delete from [_JSON_IN_Догспец] where  Договор=${stringAsSql_1.stringAsSql(obj.IDD)};
insert [_JSON_IN_Договор]([_1С_GUID],[Вид],[Номер документа],[ДатаВремяИз1С],[Комментарий],[Поставщик],[Грузоотправитель],[Получатель],[Грузополучатель],[ДатаОтгрузкиИз1С]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${docvid}, 
    ${stringAsSql_1.stringAsSql(obj.Номер)}, 
    ${stringAsSql_1.stringAsSql(obj.Дата)}, 
    ${stringAsSql_1.stringAsSql(obj.Комментарий)}, 
    ${stringAsSql_1.stringAsSql(obj.Поставщик)}, 
    ${stringAsSql_1.stringAsSql(obj.Грузоотправитель)}, 
    ${stringAsSql_1.stringAsSql(obj.Получатель)}, 
    ${stringAsSql_1.stringAsSql(obj.Грузополучатель)}, 
    ${stringAsSql_1.stringAsSql(dateOtgr)} 
 );`);
            for (let spc of obj.Товары) {
                if (!util_1.isString(spc.Номенклатура) || spc.Номенклатура.trim() == "")
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
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${stringAsSql_1.stringAsSql(spc.Номенклатура)}, 
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
        let sql = [];
        let docvid = '200';
        let KomplIDD = '';
        sql.push("BEGIN TRAN;");
        for (let obj of body.Данные) {
            if (!util_1.isString(obj.IDD) || obj.IDD.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'IDD'" });
            if (!util_1.isString(obj.Номер) || obj.Номер.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номер'" });
            if (!util_1.isString(obj.Дата) || obj.Дата.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Дата'" });
            if (!util_1.isString(obj.Поставщик) || obj.Поставщик.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Поставщик'" });
            if (!util_1.isString(obj.Номенклатура) || obj.Номенклатура.trim() == "")
                return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номенклатура'" });
            KomplIDD = obj.Номенклатура;
            sql.push(`
delete from [_JSON_IN_Договор] where _1С_GUID=${stringAsSql_1.stringAsSql(obj.IDD)};
delete from [_JSON_IN_Догспец] where  Договор=${stringAsSql_1.stringAsSql(obj.IDD)};
insert [_JSON_IN_Договор]([_1С_GUID],[Вид],[Номер документа],[ДатаВремяИз1С],[Поставщик]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${docvid}, 
    ${stringAsSql_1.stringAsSql(obj.Номер)}, 
    ${stringAsSql_1.stringAsSql(obj.Дата)}, 
    ${stringAsSql_1.stringAsSql(obj.Поставщик)} 
 );`);
            for (let spc of obj.Товары) {
                if (!util_1.isString(spc.Номенклатура) || spc.Номенклатура.trim() == "")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный или пустой тэг 'Номенклатура'" });
                if (typeof spc.Количество != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'Количество'" });
                if (typeof spc.НомерСтроки != "number")
                    return saveErrorToLog(body, { Ошибка: 3, ТекстОшибки: "неверный тэг 'НомерСтроки'" });
                sql.push(`
insert [_JSON_IN_Догспец]([Договор],[ТМЦ],[Комплектующий],[Количество],[Порядок ввода]) 
values(
    ${stringAsSql_1.stringAsSql(obj.IDD)}, 
    ${stringAsSql_1.stringAsSql(KomplIDD)},
    ${stringAsSql_1.stringAsSql(spc.Номенклатура)}, 
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
exports.processRequest = processRequest;
//# sourceMappingURL=processRequest.js.map