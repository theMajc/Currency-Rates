const fs = require("fs");
const util = require('util');
const request = require("request");
const express = require("express");

/**
 * Currency Conversion Module
 * 
 * Converts an amount from one currency to another on a given date
 * Powered by fixer.io, using `historical` data.
 * 
 */

// Init module service
const port = 8888;
const api_path = "/api/v1/";
const app = express();
app.listen(port);

// Convert all URL query to upper case
app.use(function(req, res, next) {
    for (var key in req.query){
        req.query[key] = req.query[key].toUpperCase();
	}
    next();
});

// fixer.io service api
const cxrApiURL="http://data.fixer.io/api";
const cxrApiKey="4bd5c8bc40c581d4916f9cd7ee3684df"; // Free key with 1000 req/mo limit

// file based db for exchange rates
const cacheSource = "./data.json";
let db;
try {
	db = JSON.parse(fs.readFileSync(cacheSource, "utf8"));
} catch(e) {
	db = {} // init new db if failed to load
}

/**
 * Pulls currency exchange rates from API service
 * Store rates in db
 */
function fetchRatesFromSource(date) {
	return new Promise((resolve, reject) => { 
		request.get({
			url: `${cxrApiURL}/${date}?access_key=${cxrApiKey}`,
			json: true,
			headers: {'User-Agent': 'request'}
		}, (err, res, data) => {
			if (err) {
				reject({"error":"Service API failed.", "message":err});
			} else if (res.statusCode !== 200) {
				reject({"error":`Service API failed. ${res.statusCode}`, "data":data});
			} else {
				if (!data.success){
					reject({"error":"Service API failed.", "message":data.error});
				} else {
					db[date] = {
						"timestamp": data.timestamp,
						"updated_at": new Date().getTime(),
						"base": data.base,
						"rates": data.rates
					}

					fs.writeFileSync(cacheSource, JSON.stringify(db));
					console.log(`Updated currency rates for ${date}`);
					
					resolve(db[date]);
				}
			}
		})
	});
}

function fetchRatesFromCache(date) {
	if (db.hasOwnProperty(date) && db[date].hasOwnProperty('rates')) {
		console.log(`Found rates from cache for ${date}`);
		return db[date];
	} else {
		console.log(`Rate not found from cache for ${date}`);
		return false;
	}
}

app.get('/', (req, res) => {
	res.send("Currency Rate Converter. See README for details.");
});

/**
 * GET convert/
 * 	Queries
 * 		- {date}:	YYYY-MM-DD date of rate
 * 		- {base}:	ISO 4217 currency code
 * 		- {symbol}:	ISO 4217 currency code
 * 		- {amount}:	decimal amount to convert
 * 	Return
 * 		- Response code
 * 		- Float
 */
app.get(api_path+"convert", async (req, res) => {
	let date = req.query.date;
	let base = req.query.base;
	let symbol = req.query.symbol;
	let amount = req.query.amount;

	if (!date || !symbol || !amount) {
		res.status(400).send({"code":"400", "message":"Missing `date`|`base`|`amount` in query."});
		return false;
	}
	if (!base){
		base = "EUR";
	}

	// simple validators in regex
	if(date && date != 'undefined' && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
		res.status(400).send({"code":"400", "message":"Invalid date format. Must be YYYY-MM-DD"});
		return false;
	}
	if(base && base != 'undefined' && !base.match(/^\w{3}$/)) {
		res.status(400).send({"code":"400", "message":"Invalid base format. Must be ISO 4217"});
		return false;
	}
	if(symbol && symbol != 'undefined' && !symbol.match(/^\w{3}$/)) {
		res.status(400).send({"code":"400", "message":"Invalid symbol format. Must be ISO 4217"});
		return false;
	}
	if(amount && amount != 'undefined' && !amount.match(/^[0-9]+\.[0-9]{0,2}$/)) {
		res.status(400).send({"code":"400", "message":"Invalid amount format. Must be 2-place decimal"});
		return false;
	}

	// query exchange rates
	try {
		let data = fetchRatesFromCache(date) 
			|| await fetchRatesFromSource(date).catch((err)=>{res.status(500).send(JSON.stringify(err))});
		rates = data.rates;
		if (!rates.hasOwnProperty(base)) {
			res.status(400).send({"code":"400", "message":`Invalid or currency not found: base=${base}`});
			return false;
		}
		if (!rates.hasOwnProperty(symbol)) {
			res.status(400).send({"code":"400", "message":`Invalid or currency not found: symbol=${symbol}`});
			return false;
		}
	} catch(e) {
		res.status(500).send(JSON.stringify({
			"error": e.message
		}));
	}

	// calculate rate conversion
	rate = parseFloat(rates[symbol] / rates[base]).toFixed(6);
	amount = parseFloat(rate * amount).toFixed(6);
	console.log(`${symbol} ${rates[symbol]} / ${base} ${rates[base]} = ${rate}`);

	res.send(JSON.stringify({
		"code": 200,
		"data": {
			"base": base,
			"symbol": symbol,
			"rate": rate,
			"amount": amount
		}
	}));
});