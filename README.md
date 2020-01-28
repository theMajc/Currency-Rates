# Currency-Rates

Currency converter using fixer.io's historical endpoint.

## Install

- `npm install` to install dependencies
- `npm start` to start the app server
- `npm run dev` to start the app in development live-reload mode

Default app gateway is localhost:8888

## Usage

This module mimics the Fixer.io endpoint format to obtain historical currency rate conversion.

```HTTP
GET localhost:8888/api/v1/convert
    ? date={YYYY-MM-DD}
    & base={FROM_CURRENCY}
    & symbol={TO_CURRENCY...}
    & amount={AMOUNT}
```

The following will return the exchange rate of $23.33 USD to CAD:

`localhost:8888/api/v1/convert?date=2020-01-17&base=usd&symbol=cad&amount=23.33`

Returns:

```JSON
{"code":200,"data":{"base":"USD","symbol":"CAD","rate":"1.306705","amount":"30.485428"}}
```

## Note

Saves historical data to `data.json` as cache, and is loaded on each start up. Consider other caching method when used for quering large number of dates.
