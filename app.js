/* Модули */
var redis = require("redis");
var client = redis.createClient();
var express = require('express');
var request = require('request');
var app = express();


/* Сайт */
app.listen(3000, function () {
    console.log('Запустили!');
});
//sudo fuser -k 3000/tcp
app.get('/', function (req, res) {
    res.send('Для загрузки инвентаря -  /api/loadInventory/steamid/appid/lang</br>Пример :<a href="http://ezyskins.ru/api/loadInventory/76561198316116397/730/russian">http://ezyskins.ru/api/loadInventory/76561198316116397/730/russian</a>');
});


app.get('/api/loadInventory/:steamid/:appid/:lang', function (req, res) {
    var pricelist = [];
    client.get('csgofast', function (err, value) {
        if (err || value == null) {
            request('https://api.csgofast.com/price/all', function (error, response) {
                if (!error) {
                    client.set('csgofast', JSON.stringify(response.body), redis.print);
                    client.expireat('csgofast', parseInt((+new Date)/1000) + 86400);
                    pricelist.push(JSON.parse(response.body));
                }
            });
        } else {
            pricelist.push(JSON.parse(value));
        }
    });
    request('http://steamcommunity.com/inventory/' + req.params.steamid + '/' + req.params.appid + '/2?l=' + req.params.lang + '&count=5000', function (error, response) {
        if (error || response.body == 'null')  return res.send('Error');
        try {
            JSON.parse(response.body);
        } catch (err) {
            return res.send('Error: check steamid');
        }
        pricelist = JSON.parse(pricelist);
        var inventory = [];
        const items = JSON.parse(response.body);
        items.assets.forEach(function (item, i, arr) {
           try {
                var price = 0;
                if (req.params.appid == 730) price = pricelist[items.descriptions[i]['market_hash_name']];
                inventory.push({
                    'assetid': item.assetid,
                    'price': price,
                    'classid': item.classid,
                    'instanceid': item.instanceid,
                    'contextid': item.contextid,
                    'type': items.descriptions[i]['type'],
                    'name': items.descriptions[i]['name'],
                    'market_hash_name': items.descriptions[i]['market_hash_name'],
                    'market_name': items.descriptions[i]['market_name'],
                    'image': 'https://steamcommunity-a.akamaihd.net/economy/image/class/' + req.params.appid + '/' + item.classid + '/',
                    'icon_url': items.descriptions[i]['icon_url'],
                });
            } catch (err) {
               //console.log(err);
            }
        });
        res.send({
            'steamid': req.params.steamid,
            'lang': req.params.lang,
            'appid': req.params.appid,
            'items': inventory
        });
    });
});

