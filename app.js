/* Модули */
var redis = require("redis");
var client = redis.createClient();
var express = require('express');
var request = require('request');
var app = express();

var searchdesc = (classid, arr) => {
    for (key in arr) {
        if (classid === arr[key].classid) {
            return key;
        }
    }
}


/* Сайт */
app.listen(3000,  () => {
    console.log('Запустили!');
});
//sudo fuser -k 3000/tcp
app.get('/', (req, res) =>  {
    res.send('Для загрузки инвентаря -  /api/loadInventory/steamid/appid/lang</br>Пример :<a href="http://ezyskins.ru/api/loadInventory/76561198316116397/730/russian">http://ezyskins.ru/api/loadInventory/76561198316116397/730/russian</a>');
});


app.get('/api/loadInventory/:steamid/:appid/:lang', (req, res) =>  {
    var pricelist = [];
    client.get('csgofast', function (err, value) {
        if (err || value == null) {
            request('https://api.csgofast.com/price/all', (error, response) => {
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
    request('http://steamcommunity.com/inventory/' + req.params.steamid + '/' + req.params.appid + '/2?l=' + req.params.lang + '&count=5000', (error, response) => {
        if (error || response.body == 'null')  return res.send({ 'success' : false, 'error':'steamid is invalid'});
        try {
            JSON.parse(response.body);
        } catch (err) {
            return res.send({ 'success' : false, 'error':'steamid is invalid'});
        }
        pricelist = JSON.parse(pricelist);
        var inventory = [];
        const items = JSON.parse(response.body);
        items.assets.forEach((item, i, arr) => {
           var id = searchdesc(item.classid, items.descriptions);

            var color;
            for (var key in items.descriptions[id]['tags']) {
                if (items.descriptions[id]['tags'][key].category == "Rarity") {
                    color = items.descriptions[id]['tags'][key].color;
                }
            }
            inventory.push({
                'assetid': item.assetid,
                'price': pricelist[items.descriptions[id]['market_hash_name']],
                'classid': item.classid,
                'instanceid': item.instanceid,
                'contextid': item.contextid,
                'tradable': items.descriptions[id]['tradable'],
                'type': items.descriptions[id]['type'],
                'name': items.descriptions[id]['name'],
                'market_hash_name': items.descriptions[id]['market_hash_name'],
                'market_name': items.descriptions[id]['market_name'],
                'image': 'https://steamcommunity-a.akamaihd.net/economy/image/class/' + config.appid + '/' + item.classid + '/',
                'icon_url': items.descriptions[id]['icon_url'],
                'color': color
            });
        });
        res.send({
            'success' : true,
            'steamid': req.params.steamid,
            'lang': req.params.lang,
            'appid': req.params.appid,
            'items': inventory
        });
    });
});

