# Global Investment Tracker API

Base URL: `http://localhost:4173`

All API routes return JSON and never include provider secrets.

## Routes

- `GET /api/health`
- `GET /api/countries`
- `GET /api/market-overview?country=US`
- `GET /api/search?q=apple&country=US&type=Stocks`
- `GET /api/quote?symbol=AAPL`
- `GET /api/history?symbol=AAPL&range=1M`
- `GET /api/fundamentals?symbol=AAPL`
- `GET /api/brokers?country=US&type=Stocks`
- `POST /api/watchlist/refresh`
- `POST /api/compare`
- `GET /api/news?symbol=AAPL`
- `POST /api/ai-insight`
- `GET /api/diagnostics`
- `GET /api/proxy?url=https%3A%2F%2Fstooq.com%2F...`

## Quote Shape

```json
{
  "ok": true,
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "assetType": "Stocks",
    "price": 123.45,
    "currency": "USD",
    "change": 1.23,
    "changePercent": 1.01,
    "exchange": "NASDAQ",
    "marketState": "unknown",
    "source": "Stooq public CSV",
    "lastUpdated": "2026-06-03T12:00:00.000Z",
    "isCached": false,
    "stale": false,
    "fieldsAvailable": ["price", "currency"],
    "fieldsUnavailable": ["marketCap"],
    "warning": null,
    "error": null,
    "diagnostics": {}
  }
}
```

## History Shape

```json
{
  "ok": true,
  "data": {
    "symbol": "AAPL",
    "range": "1M",
    "interval": "1d",
    "currency": "USD",
    "source": "Stooq public CSV",
    "lastUpdated": "2026-06-03T12:00:00.000Z",
    "isCached": false,
    "stale": false,
    "points": [
      { "date": "2026-06-03", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1 }
    ],
    "warning": null,
    "error": null,
    "diagnostics": {}
  }
}
```

## Unavailable Data Policy

Unavailable financial data is returned as `null`, listed in `fieldsUnavailable`, and explained in `warning` or `error`. The API does not fabricate prices, fundamentals, history, broker availability, predictions, or AI insight.
