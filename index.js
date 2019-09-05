const fs = require("fs");
const fetch = require('node-fetch');
const formatCurrency = require('format-currency')

const url = 'https://spb.autospot.ru/blog/carstock/rest/find';
const opts = { format: '%s %v', symbol: '₽', locale: 'ru-RU' };
const historyFileName = `./LocalStorage/requestHistory${new Date().getTime()}.txt`;

const regionsData = {
    spb: {id: 10, name: 'CПб'},
    msk: {id: 3, name: 'МСК'}
};
const params = {
    regions: regionsData.spb.id,
    regions: regionsData.msk.id,
    distance: 0
};
const options = {
    a3: {...params, slug: 'audi/a3/sedan', brand_id: 'audi'},
    a4: {...params, slug: 'audi/a4/sedan', brand_id: 'audi'},
    thirdGt: {...params, slug: 'bmw/3gt/hatchback', brand_id: 'bmw'},
    third: {...params, slug: 'bmw/3/sedan', brand_id: 'bmw'},
    x1New: {...params, slug: 'bmw/x1_generation/suv', brand_id: 'bmw'},
    x1: {...params, slug: 'bmw/x1/suv', brand_id: 'bmw'},
    x3: {...params, slug: 'bmw/x3/suv', brand_id: 'bmw'}
};

function createFile() {
    fs.writeFile(historyFileName, `${new Date()}`, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function writeInFile(msg) {
    fs.appendFile(historyFileName, msg, function(error) {
        if(error) throw error;
    });
}

function renderOutput(msg) {
    const formattedMessage = formatOutputMessage(msg);
    writeInFile(formattedMessage);
    console.log(formattedMessage);
}

function formatOutputMessage(car) {
    if (!car) {
        return;
    }
    const { brand, model, wheel, equipment_name, engine_type, color_name, price, regions } = car;
    const carSummary = `\n${brand.toLocaleUpperCase()} ${model} ${equipment_name}`;
    const carPrice = `Цена: ${formatCurrency(price.value, opts)} | Скидка: ${formatCurrency(price.discount, opts)}`
    const regionName = regions[regionsData.msk.id] ? regionsData.msk.name : regionsData.spb.name;
    return `${carSummary}\nРегион: ${regionName}\nПривод: ${wheel}\nДвигатель: ${engine_type}\nЦвет: ${color_name}\n${carPrice}\n`;
}

function formatResponce(json) {
    let result = [];
    if (json && json.items) {
        Object.keys(json.items).forEach((car) => {
            const { items } = json.items[car];
            const collection = items[Object.keys(items)[0]].items;
            Object.keys(collection).forEach((item) => result.push(collection[item]));
        });
    }
    return result;
}

function handler(json, isLowest = true) {

    let result = formatResponce(json).sort((x,y) => x.price.value - y.price.value);

    if (isLowest) {
        return renderOutput(result[0]);
    } else {
        result.forEach(car => renderOutput(car));
    }

}

function fetchOptions(options) {

    var requests = [];

    const errorHandler = (error) => console.log('There has been a problem with your fetch operation: ' + error.message);

    Object.keys(options).forEach((option) => {
        requests.push(fetch(url, {
            method: 'post',
            body:    JSON.stringify(options[option]),
            headers: { 'Content-Type': 'application/json' },
            }));
    })

    Promise.all(requests).then(promises => promises.forEach((promise) => promise.json().then(res => handler(res)).catch(errorHandler)))
};

function start() {
    createFile();
    fetchOptions(options);
}

start();
