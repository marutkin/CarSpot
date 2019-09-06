/**
 * Parse car store API response and write data into the file.
 */
(function () {

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

        function handleOutput(results, log = true) {
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
        writeInFile(`\nМинимальнцая цена: ${minPriceCar.model} ||| Цена: ${formatCurrency(minPriceCar.price.value, opts)} Скидка: ${formatCurrency(minPriceCar.price.discount, opts)}\n`);
        writeInFile(`\nМаксимальная скидка: ${maxDiscountCar.model} ||| Цена: ${formatCurrency(maxDiscountCar.price.value, opts)} Скидка: ${formatCurrency(maxDiscountCar.price.discount, opts)}\n`);

        return handleOutput(result);
    }

    async function fetchData(options) {

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

        writeInFile(`Регион - ${region}\n`);

        return region === 'msk' ? fetchData(options(brand).msk) : fetchData(options(brand).spb);

    }

    global.CarParser = function CarParser() {
        this.spbParse = async (brand) => start('spb', brand);
        this.mskParse = async (brand) => start('msk', brand);
    }

})();

const parser = new CarParser();

parser.spbParse('audi').then(() => parser.mskParse('audi'));

//parser.spbParse('audi');
//parser.spbParse('volkswagen');
//parser.spbParse('skoda');
// parser.spbParse('bmw');

// parser.mskParse('audi');
//parser.mskParse('volkswagen');
//parser.mskParse('skoda');
// parser.mskParse('bmw');