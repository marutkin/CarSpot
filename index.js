/**
 * Parse car store API response and write data into the file.
 */
(function () {

    const fs = require("fs");
    const fetch = require('node-fetch');
    const formatCurrency = require('format-currency');

    const url = 'https://spb.autospot.ru/blog/carstock/rest/find';
    const opts = {format: '%s %v', symbol: '₽', locale: 'ru-RU'};
    const fileExt = 'html';
    const historyFileName = `./index.${fileExt}`;

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
    const carsList = (regionId, brand) => {

        const {audi, bmw, skoda, volkswagen} = cars;

        const defaultList = {
            ...volkswagen,
            ...audi,
            ...bmw,
            ...skoda
        };

        /**
         * If one brand selected.
         */
        if (brand) {
            if (!cars[brand]) {
                return console.log('No brand provided in store!');
            }
            return Object.keys(cars[brand]).map(item => {
                return {...cars[brand][item], regions: regionId}
            });
        }

        return Object.keys(defaultList).map(item => {
            return {...defaultList[item], regions: regionId}
        });

    };
    const options = (brand) => {
        return {
            msk: carsList(regionsData.msk.id, brand),
            spb: carsList(regionsData.spb.id, brand),
        }
    };

    function createFile() {
        fs.writeFileSync(historyFileName, '', function (err) {
            if (err) {
                return console.log(err);
            }
        });
    }

    function writeInFile(msg) {
        fs.appendFileSync(historyFileName, msg, function (error) {
            if (error) throw error;
        });
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

    function formatMessageToString(car) {
        if (!car) {
            return;
        }
        const {brand, model, wheel, equipment_name, engine_type, color_name, price: {value, discount}, regions, transmission} = car;
        const carPrice = `Цена: ${formatCurrency(value, opts)} | Скидка: ${formatCurrency(discount, opts)}`;
        const carSummary = `\n${brand.toLocaleUpperCase()} ${model} ${equipment_name} |-|-| ${carPrice}`;
        const regionName = regions[regionsData.msk.id] ? regionsData.msk.name : regionsData.spb.name;
        return `${carSummary}\nКоробка: ${transmission}\nРегион: ${regionName}\nПривод: ${wheel}\nДвигатель: ${engine_type}\nЦвет: ${color_name}\n`;
    }

    function formatMessageToHtmlString(car) {

        if (!car) {
            return;
        }

        const {brand, model, wheel, equipment_name, engine_type, color_name, price: {value, discount}, regions, transmission, image} = car;
        const regionName = regions[regionsData.msk.id] ? regionsData.msk.name : regionsData.spb.name;

        const head = `<div class="row__head"><h3>${brand.toLocaleUpperCase()} ${model}</h3> <h4>${equipment_name}</h4> </div>`;
        const carPrice = `<div class="row__price"><h5>Цена: ${formatCurrency(value, opts)}</h5></div>`;
        const carDiscount = `<div class="row__price"><h5>Скидка: ${formatCurrency(discount, opts)}</h5></div>`;
        const mainImage = `<div class="image-wrap"><img class="row__image img-fluid" src="${image.face}"/></div>`;
        const details = `<ul class="row__details"> <li>Коробка: ${transmission}</li> <li>Регион: <b>${regionName}</b></li> <li>Привод: ${wheel}</li> <li>Двигатель: ${engine_type}</li> <li>Цвет: ${color_name}</li> </ul>`

        const leftColumn = `<div class="col-sm-6"> ${head} ${carPrice} ${carDiscount} ${mainImage} </div>`;
        const rightColumn = `<div class="col-sm-6 flex-center"> ${details} </div>`;

        return `<div class="row"> ${leftColumn} ${rightColumn} </div>`;

    }


    function handleOutputText(results, log = true) {
        for (let i = 0; i <= results.length; i++) {
            const msg = results[i];
            const formattedMessage = formatMessageToString(msg);
            if (!formattedMessage) {
                continue;
            }
            if (log) {
                console.log(formattedMessage);
            }
            writeInFile(formattedMessage);
        }
    }

    function handleOutputHtml(results, maxDiscount, minPrice) {
        const jqueryCSS = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">';
        const header = '<header class="header__text"> Price parser results </header>';
        const maxDiscountInfo = `<div class="col-sm-6 special-info"> <p>Самый выгодный вариант: </p> </h3>${maxDiscount.brand.toLocaleUpperCase()} ${maxDiscount.model}</h3> <h4>${maxDiscount.equipment_name}</h4> <h5>Цена: ${formatCurrency(maxDiscount.price.value, opts)}</h5> </div>`;
        const minPriceInfo = `<div class="col-sm-6 special-info"> <p>Самый доступный вариант: </p> </h3>${minPrice.brand.toLocaleUpperCase()} ${minPrice.model}</h3> <h4>${minPrice.equipment_name}</h4> <h5>Цена: ${formatCurrency(minPrice.price.value, opts)}</h5> </div>`;
        const specialInfo = `<div class="row special-info__wrap"> ${minPriceInfo} ${maxDiscountInfo} </div>`;
        const htmlUpperPart = `<html><head><meta charset="utf-8"> ${jqueryCSS} <link href="./Client/src/css/main.css" rel="stylesheet"></head><body><main class="container">${header} ${specialInfo}`;
        const htmlBottomPart = '</main></body></html>';
        let htmlBodyCollection = '';
        for (let i = 0; i <= results.length; i++) {
            const node = results[i];
            const formattedMessage = formatMessageToHtmlString(node);
            if (!formattedMessage) {
                continue;
            }
            htmlBodyCollection = htmlBodyCollection + formattedMessage;
        }
        writeInFile(htmlUpperPart + htmlBodyCollection + htmlBottomPart);
    }

    function fetchHandler(jsonList, isLowest = true, isHtmlOutput = true) {
        let result = [];
        let jsonListFormatted = jsonList.map(item => formatResponse(item));

        Object.keys(jsonListFormatted).forEach(item => {
            if (isLowest) {
                result = [...result, jsonListFormatted[item].sort(({price: xPrice}, {price: yPrice}) => Number(xPrice.value) - Number(yPrice.value))[0]]
            } else {
                result = [...result, ...jsonListFormatted[item]]
            }
        });

        result = result.sort(({price: xPrice}, {price: yPrice}) => Number(xPrice.value) - Number(yPrice.value));

        const maxDiscountCar = result.reduce((result, item) => {
            let maxRest = result.length? result[0].price.discount: item.price.discount;

            if (Number(item.price.discount) > Number(maxRest)) {
                maxRest = item.price.discount;
                result.length = 0;
            }

            if (Number(item.price.discount) === Number(maxRest)) {
                result.push(item);
            }

            return result;
        }, [])[0];

        const minPriceCar = result.reduce((result, item) => {
            let minRest = result.length? result[0].price.value: item.price.value;

            if (Number(item.price.value) < Number(minRest)) {
                minRest = item.price.value;
                result.length = 0;
            }

            if (Number(item.price.value) === Number(minRest)) {
                result.push(item);
            }

            return result;
        }, [])[0];

        if (isHtmlOutput) {
            handleOutputHtml(result, maxDiscountCar, minPriceCar);
        } else {
            handleOutputText(result);
        }
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

    function start(region, brand) {

        createFile();

        return region === 'msk' ? fetchData(options(brand).msk) : fetchData(options(brand).spb);

    }

    global.CarParser = function CarParser() {
        this.spbParse = (brand) => start('spb', brand);
        this.mskParse = (brand) => start('msk', brand);
    }

})();

const parser = new CarParser();

// parser.spbParse();
// parser.mskParse();

//parser.spbParse('audi');
// parser.spbParse('volkswagen');
parser.spbParse('skoda');
// parser.spbParse('bmw');

// parser.mskParse('audi');
// parser.mskParse('volkswagen');
// parser.mskParse('skoda');
// parser.mskParse('bmw');