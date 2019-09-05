const fs = require("fs");
const fetch = require('node-fetch');
const formatCurrency = require('format-currency');

const url = 'https://spb.autospot.ru/blog/carstock/rest/find';
const opts = {format: '%s %v', symbol: '₽', locale: 'ru-RU'};
const fileExt = 'text';
const historyFileName = `./LocalStorage/requestHistory${new Date().getTime()}.${fileExt}`;

const regionsData = {
    msk: {id: 3, name: 'МСК'},
    spb: {id: 10, name: 'CПб'},
};
const cars = {
    volkswagen: {
        polo: {distance: 0, slug: 'volkswagen/polo/sedan', brand_id: 'volkswagen'},
        golf: {distance: 0, slug: 'volkswagen/golf/hatchback', brand_id: 'volkswagen'},
    },
    skoda: {
        rapid: {distance: 0, slug: 'skoda/rapid/liftback', brand_id: 'skoda'},
        octavia: {distance: 0, slug: 'skoda/octavia/liftback', brand_id: 'skoda'},
        kodiaq: {distance: 0, slug: 'skoda/kodiaq/suv', brand_id: 'skoda'},

    },
    audi: {
        a3: {distance: 0, slug: 'audi/a3/sedan', brand_id: 'audi'},
        a4: {slug: 'audi/a4/sedan', brand_id: 'audi'},
    },
    bmw: {
        thirdGt: {slug: 'bmw/3gt/hatchback', brand_id: 'bmw'},
        third: {slug: 'bmw/3/sedan', brand_id: 'bmw'},
        x1New: {slug: 'bmw/x1_generation/suv', brand_id: 'bmw'},
        x1: {slug: 'bmw/x1/suv', brand_id: 'bmw'},
        x3: {slug: 'bmw/x3/suv', brand_id: 'bmw'}
    }
};
const carsList = (regionId) => {

    const {audi, bmw, skoda, volkswagen} = cars;

    const list = {
        ...volkswagen,
        ...audi,
        ...bmw,
        ...skoda
    };

    return Object.keys(list).map(item => {
        return {...list[item], regions: regionId}
    });

};
const options = {
    msk: carsList(regionsData.msk.id),
    spb: carsList(regionsData.spb.id),
};

function createFile() {
    fs.writeFile(historyFileName, '', function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function writeInFile(msg) {
    fs.appendFile(historyFileName, msg, function (error) {
        if (error) throw error;
    });
}

function handleOutput(results, log = true) {
    for (let i = 0; i <= results.length; i++) {
        const msg = results[i];
        const formattedMessage = formatMessageToString(msg);
        if (log) {
            console.log(formattedMessage);
        }
        writeInFile(formattedMessage);
    }
}

function formatMessageToString(car) {
    if (!car) {
        return;
    }
    const {brand, model, wheel, equipment_name, engine_type, color_name, price: {value, discount}, regions} = car;
    const carSummary = `\n${brand.toLocaleUpperCase()} ${model} ${equipment_name}`;
    const carPrice = `Цена: ${formatCurrency(value, opts)} | Скидка: ${formatCurrency(discount, opts)}`;
    const regionName = regions[regionsData.msk.id] ? regionsData.msk.name : regionsData.spb.name;
    return `${carSummary}\nРегион: ${regionName}\nПривод: ${wheel}\nДвигатель: ${engine_type}\nЦвет: ${color_name}\n${carPrice}\n`;
}

function formatResponse(json) {
    let result = [];
    if (json && json.items) {
        Object.keys(json.items).forEach((car) => {
            const {items} = json.items[car];
            const collection = items[Object.keys(items)[0]].items;
            Object.keys(collection).forEach((item) => result.push(collection[item]));
        });
    }
    return result;
}

function fetchHandler(jsonList, isLowest = true) {
    let result = [];
    let jsonListFormatted = jsonList.map(item => formatResponse(item));

    Object.keys(jsonListFormatted).forEach(item => {
        if (isLowest) {
            result = [...result, jsonListFormatted[item].sort(({price: xPrice}, {price: yPrice}) => xPrice.value - yPrice.value)[0]]
        } else {
            result = [...result, ...jsonListFormatted[item]]
        }
    });

    return handleOutput(result);
}

function fetchData(options) {

    let requests = [];

    const errorHandler = (error) => console.log('There has been a problem with your fetch operation: ' + error.message);

    Object.keys(options).forEach((option) => {
        requests.push(fetch(url, {
            method: 'post',
            body: JSON.stringify(options[option]),
            headers: {'Content-Type': 'application/json'},
        }));
    });

    Promise.all(requests)
    .then(resp => Promise.all(resp.map(r => r.json())))
    .then(fetchHandler)
    .catch(errorHandler);
}

function start(region) {

    createFile();

    if (region === 'msk') {
        return fetchData(options.msk);
    }

    fetchData(options.spb);
}

//start('spb');
start('msk');
