const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const NODE_ENV = process.env.NODE_ENV || "development";
const ROOT = __dirname;
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "US";
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || "auto";
const PUBLIC_DATA_MODE = process.env.PUBLIC_DATA_MODE !== "false";
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 300);
const HISTORY_CACHE_TTL_SECONDS = Number(process.env.HISTORY_CACHE_TTL_SECONDS || 3600);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:4173,file://").split(",").map((item) => item.trim()));
const ALLOWED_PROXY_HOSTS = new Set(["stooq.com", "api.coingecko.com", "query1.finance.yahoo.com"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const dataContext = { window: {} };
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"), dataContext);

const countryConfigs = dataContext.window.countryConfigs;
const assetCatalog = dataContext.window.assetCatalog;
const cache = new Map();
const rateBuckets = new Map();
const startedAt = new Date().toISOString();
const providerAttempts = [];

const exchangeMetadata = [
  { exchangeCode: "NASDAQ", name: "Nasdaq Stock Market", country: "US", website: "https://www.nasdaq.com", timezone: "America/New_York", currency: "USD", notes: "US exchange data is often available from public or free-tier providers." },
  { exchangeCode: "NYSE", name: "New York Stock Exchange", country: "US", website: "https://www.nyse.com", timezone: "America/New_York", currency: "USD", notes: "US exchange data is often available from public or free-tier providers." },
  { exchangeCode: "LSE", name: "London Stock Exchange", country: "GB", website: "https://www.londonstockexchange.com", timezone: "Europe/London", currency: "GBP", notes: "Symbols are provider-specific and may need suffixes." },
  { exchangeCode: "GSE", name: "Ghana Stock Exchange", country: "GH", website: "https://gse.com.gh", timezone: "Africa/Accra", currency: "GHS", notes: "Local live quote data may require official or licensed feeds." },
  { exchangeCode: "NGX", name: "Nigerian Exchange", country: "NG", website: "https://ngxgroup.com", timezone: "Africa/Lagos", currency: "NGN", notes: "Local live quote data may require specialized providers." },
  { exchangeCode: "JSE", name: "Johannesburg Stock Exchange", country: "ZA", website: "https://www.jse.co.za", timezone: "Africa/Johannesburg", currency: "ZAR", notes: "Yahoo chart endpoint covers selected symbols through the local proxy." },
  { exchangeCode: "TSX", name: "Toronto Stock Exchange", country: "CA", website: "https://www.tsx.com", timezone: "America/Toronto", currency: "CAD", notes: "Yahoo chart endpoint covers selected symbols through the local proxy." },
  { exchangeCode: "XETRA", name: "Xetra", country: "DE", website: "https://www.xetra.com", timezone: "Europe/Berlin", currency: "EUR", notes: "Some symbols are available through Stooq." },
  { exchangeCode: "EURONEXT", name: "Euronext Paris", country: "FR", website: "https://www.euronext.com", timezone: "Europe/Paris", currency: "EUR", notes: "Some symbols and indices are available through Stooq." },
  { exchangeCode: "TSE", name: "Tokyo Stock Exchange", country: "JP", website: "https://www.jpx.co.jp", timezone: "Asia/Tokyo", currency: "JPY", notes: "Selected symbols are available through Stooq." },
  { exchangeCode: "NSE", name: "National Stock Exchange of India", country: "IN", website: "https://www.nseindia.com", timezone: "Asia/Kolkata", currency: "INR", notes: "Yahoo chart endpoint covers selected symbols through the local proxy." },
  { exchangeCode: "HKEX", name: "Hong Kong Exchanges", country: "CN", website: "https://www.hkex.com.hk", timezone: "Asia/Hong_Kong", currency: "HKD", notes: "Yahoo chart endpoint covers selected symbols through the local proxy." },
  { exchangeCode: "ASX", name: "Australian Securities Exchange", country: "AU", website: "https://www.asx.com.au", timezone: "Australia/Sydney", currency: "AUD", notes: "Yahoo chart endpoint covers selected symbols through the local proxy." }
];

const assetTypeDefinitions = {
  stock: { label: "Stocks", description: "Company equity shares.", supportedDefaultProviders: ["Stooq", "Yahoo chart", "Advanced APIs"], availableFields: ["price", "change", "volume"], commonUnavailableFields: ["marketCap", "peRatio", "dividendYield"], chartSupportStatus: "Provider-dependent", riskNote: "Equities can be volatile and company-specific." },
  etf: { label: "ETFs", description: "Exchange-traded funds.", supportedDefaultProviders: ["Stooq", "Yahoo chart", "Advanced APIs"], availableFields: ["price", "change", "volume"], commonUnavailableFields: ["expenseRatio", "holdings"], chartSupportStatus: "Provider-dependent", riskNote: "Fund risk depends on holdings, fees, liquidity, and domicile." },
  crypto: { label: "Crypto", description: "Digital assets.", supportedDefaultProviders: ["CoinGecko"], availableFields: ["price", "change", "marketCap", "volume"], commonUnavailableFields: ["exchange"], chartSupportStatus: "Available for supported CoinGecko assets", riskNote: "Crypto assets are highly volatile and may face regulatory risk." },
  index: { label: "Indices", description: "Market index levels.", supportedDefaultProviders: ["Stooq", "Yahoo chart"], availableFields: ["price", "change"], commonUnavailableFields: ["volume", "marketCap"], chartSupportStatus: "Provider-dependent", riskNote: "Indices are not directly investable unless accessed through products." },
  bond: { label: "Bonds", description: "Debt instruments and bond funds.", supportedDefaultProviders: ["Advanced APIs", "Metadata"], availableFields: ["price"], commonUnavailableFields: ["yield", "duration"], chartSupportStatus: "Limited in public no-key mode", riskNote: "Bond values are sensitive to rates, credit, liquidity, and currency." },
  commodity: { label: "Commodities", description: "Commodity funds or proxies.", supportedDefaultProviders: ["Stooq", "Advanced APIs"], availableFields: ["price", "change"], commonUnavailableFields: ["spot detail"], chartSupportStatus: "Provider-dependent", riskNote: "Commodity exposure can be volatile and product-structure dependent." },
  currency: { label: "Currencies", description: "Foreign exchange pairs.", supportedDefaultProviders: ["Advanced APIs"], availableFields: ["price"], commonUnavailableFields: ["fundamentals"], chartSupportStatus: "Limited in this app", riskNote: "FX rates can move quickly and may include conversion costs." },
  unknown: { label: "Unknown", description: "Unclassified instrument.", supportedDefaultProviders: ["Metadata"], availableFields: [], commonUnavailableFields: ["price", "history"], chartSupportStatus: "Unavailable until mapped", riskNote: "Verify the instrument before making decisions." }
};

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!rateLimit(req, res)) return;
    const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, requestUrl);
      return;
    }
    serveStatic(requestUrl, res);
  } catch (error) {
    sendJson(res, error.status || 500, errorResponse(error.code || "SERVER_ERROR", NODE_ENV === "production" && !error.status ? "Unexpected server error" : error.message));
  }
});

server.listen(PORT, () => {
  console.log(`Global Investment Tracker running at http://localhost:${PORT}`);
});

async function handleApi(req, res, requestUrl) {
  const route = `${req.method} ${requestUrl.pathname}`;
  if (route === "GET /api/health") return sendJson(res, 200, ok({ ok: true, service: "global-investment-tracker", startedAt, publicDataMode: PUBLIC_DATA_MODE }));
  if (route === "GET /api/countries") return sendJson(res, 200, ok(getCountries()));
  if (route === "GET /api/market-overview") return sendJson(res, 200, ok(marketOverview(requiredCountry(requestUrl))));
  if (route === "GET /api/search") return sendJson(res, 200, ok(searchAssets(requestUrl)));
  if (route === "GET /api/quote") return sendJson(res, 200, ok(await getQuoteResponse(requiredAsset(requestUrl), requestUrl.searchParams.get("provider") || DEFAULT_PROVIDER)));
  if (route === "GET /api/history") return sendJson(res, 200, ok(await getHistoryResponse(requiredAsset(requestUrl), requestUrl.searchParams.get("range") || "1M", isRefreshRequest(requestUrl))));
  if (route === "GET /api/fundamentals") return sendJson(res, 200, ok(getFundamentalsResponse(requiredAsset(requestUrl))));
  if (route === "GET /api/brokers") return sendJson(res, 200, ok(getBrokers(requiredCountry(requestUrl), requestUrl.searchParams.get("type"))));
  if (route === "GET /api/news") return sendJson(res, 200, ok(getUnavailableNews(requiredAsset(requestUrl))));
  if (route === "GET /api/diagnostics") return sendJson(res, 200, ok(getDiagnostics()));
  if (route === "GET /api/proxy") return proxyRequest(requestUrl, res);
  if (route === "POST /api/watchlist/refresh") return sendJson(res, 200, ok(await refreshWatchlist(await readBody(req))));
  if (route === "POST /api/compare") return sendJson(res, 200, ok(await compareAssets(await readBody(req))));
  if (route === "POST /api/ai-insight") return sendJson(res, 200, ok(await getAiInsight(await readBody(req))));
  sendJson(res, 404, errorResponse("NOT_FOUND", "Route not found"));
}

function getCountries() {
  return Object.entries(countryConfigs).map(([code, config]) => ({
    countryCode: code,
    name: config.name,
    currency: config.currency,
    currencySymbol: config.symbol,
    locale: config.locale || localeFor(code),
    timezone: config.timezone || timezoneFor(code),
    primaryExchanges: config.exchanges,
    defaultTickers: config.defaultTickers,
    defaultCryptoAssets: ["BTC", "ETH"],
    defaultIndices: assetCatalog.filter((asset) => asset.country === code && asset.type === "Indices").map(assetSummary),
    defaultEtfs: assetCatalog.filter((asset) => asset.country === code && asset.type === "ETFs").map(assetSummary),
    supportedAssetTypes: config.supportedAssetTypes,
    brokerExamples: config.brokers.map((broker) => brokerRecord(code, broker)),
    marketNotes: config.notes,
    dataCoverageNotes: coverageNoteFor(code),
    officialExchangeLinks: exchangeMetadata.filter((exchange) => exchange.country === code).map((exchange) => ({ name: exchange.name, url: exchange.website })),
    regulatoryReminder: "Example platforms only. Availability, fees, tax rules, and regulations vary by user eligibility. Verify directly with brokers and local regulators."
  }));
}

function marketOverview(countryCode) {
  const config = countryConfigs[countryCode];
  const assets = assetsForCountry(countryCode);
  const liveBacked = assets.filter(hasPublicSource);
  return {
    country: { countryCode, name: config.name, currency: config.currency, currencySymbol: config.symbol },
    dataMode: PUBLIC_DATA_MODE ? "Public source mode" : "Advanced provider mode",
    defaultProvider: DEFAULT_PROVIDER,
    assets: assets.map(searchShape),
    counts: {
      assets: assets.length,
      liveBacked: liveBacked.length,
      officialOnly: assets.length - liveBacked.length
    },
    exchanges: exchangeMetadata.filter((exchange) => exchange.country === countryCode),
    notes: config.notes,
    dataCoverageNotes: coverageNoteFor(countryCode),
    assetTypes: assetTypeDefinitions
  };
}

function searchAssets(requestUrl) {
  const query = (requestUrl.searchParams.get("q") || "").toLowerCase().trim();
  const country = requestUrl.searchParams.get("country") || "";
  const type = requestUrl.searchParams.get("type") || "";
  return assetCatalog
    .filter((asset) => !country || asset.country === country || asset.country === "GLOBAL")
    .filter((asset) => !type || asset.type.toLowerCase() === type.toLowerCase())
    .filter((asset) => !query || [asset.ticker, asset.name, asset.type, asset.exchange, asset.country].join(" ").toLowerCase().includes(query))
    .slice(0, 50)
    .map(searchShape);
}

async function getQuoteResponse(asset, provider = "auto") {
  const cacheKey = `quote:${asset.id}:${provider}`;
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, isCached: true, stale: false };
  const attempts = publicProvidersFor(asset);
  if (!hasPublicSource(asset)) {
    return unavailableQuote(asset, `${asset.ticker} needs an official exchange feed, licensed provider, or backend connector for live quotes.`, { source: coverageSource(asset) });
  }
  for (const source of attempts) {
    try {
      const quote = source === "stooq" ? await fetchStooqQuote(asset) : source === "yahoo" ? await fetchYahooQuote(asset) : await fetchCoinGeckoQuote(asset);
      setCache(cacheKey, quote, CACHE_TTL_SECONDS);
      recordAttempt(source, asset.ticker, true);
      return quote;
    } catch (error) {
      recordAttempt(source, asset.ticker, false, error.message);
    }
  }
  return unavailableQuote(asset, "Public source quote is unavailable right now. Retry later or configure an advanced provider.", { source: attempts.join(", ") || "Unavailable" });
}

async function getHistoryResponse(asset, range, refresh = false) {
  const cacheKey = `history:${asset.id}:${range}`;
  const cached = refresh ? null : getCache(cacheKey);
  if (cached) return { ...cached, isCached: true, stale: false };
  if (!hasPublicSource(asset)) return unavailableHistory(asset, range, `${asset.ticker} needs an official or licensed market data feed for history.`);
  const attempts = historySourcesFor(asset);
  let lastError = null;
  try {
    let points = [];
    let source = coverageSource(asset);
    for (const attempt of attempts) {
      try {
        points = attempt.provider === "coingecko"
          ? await fetchCoinGeckoHistory(asset, range)
          : attempt.provider === "stooq"
            ? await fetchStooqHistory(asset, range)
            : await fetchYahooHistory({ ...asset, yahooSymbol: attempt.symbol }, range);
        if (points.length) {
          source = attempt.label;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }
    const response = {
      symbol: asset.ticker,
      range,
      interval: range === "1D" ? "5m" : "1d",
      currency: asset.currency,
      source,
      lastUpdated: new Date().toISOString(),
      isCached: false,
      stale: false,
      points,
      warning: points.length ? null : (lastError ? normalizeProviderError(lastError) : "Historical data is unavailable from the current source. Try another range, retry, or add an advanced provider in Settings."),
      error: null,
      diagnostics: { pointCount: points.length, attemptedSources: attempts.map((attempt) => attempt.label) }
    };
    setCache(cacheKey, response, HISTORY_CACHE_TTL_SECONDS);
    return response;
  } catch (error) {
    return unavailableHistory(asset, range, normalizeProviderError(error));
  }
}

function getFundamentalsResponse(asset) {
  return {
    symbol: asset.ticker,
    name: asset.name,
    source: "Metadata fallback",
    lastUpdated: new Date().toISOString(),
    isCached: false,
    stale: false,
    fieldsAvailable: ["symbol", "name", "assetType", "exchange", "currency", "country"],
    fieldsUnavailable: ["marketCap", "peRatio", "dividendYield", "expenseRatio", "beta"],
    warning: "Fundamentals are unavailable from public no-key mode. Configure an advanced provider for deeper fundamentals.",
    error: null,
    data: {
      assetType: asset.type,
      exchange: asset.exchange,
      currency: asset.currency,
      country: asset.country,
      risk: asset.risk
    }
  };
}

function getBrokers(countryCode, assetType) {
  const brokers = (countryConfigs[countryCode]?.brokers || [])
    .filter((broker) => !assetType || broker.assetTypes.some((type) => type.toLowerCase().includes(assetType.toLowerCase())))
    .map((broker) => brokerRecord(countryCode, broker));
  return {
    country: countryCode,
    title: "Example platforms to research",
    brokers,
    regulatoryReminder: "These are not recommendations. Availability, fees, tax rules, and regulations vary by country and user eligibility. Verify directly with the broker and local regulators."
  };
}

async function refreshWatchlist(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    items: await Promise.all(items.map(async (item) => {
      const asset = assetByAny(item.assetId || item.symbol);
      if (!asset) return { ...item, ok: false, error: "Unknown asset" };
      const quote = await getQuoteResponse(asset);
      const units = finiteOrNull(item.units) || 0;
      const averagePrice = finiteOrNull(item.averagePrice) || 0;
      const estimatedValue = quote.price !== null ? quote.price * units : null;
      const unrealizedGainLoss = quote.price !== null && averagePrice > 0 ? (quote.price - averagePrice) * units : null;
      const unrealizedGainLossPercent = quote.price !== null && averagePrice > 0 ? ((quote.price - averagePrice) / averagePrice) * 100 : null;
      return { asset: searchShape(asset), quote, units, averagePrice, estimatedValue, unrealizedGainLoss, unrealizedGainLossPercent, warning: quote.price === null ? "Price unavailable; holding value not calculated." : null };
    }))
  };
}

async function compareAssets(body) {
  const symbols = Array.isArray(body.items) ? body.items : [];
  const range = body.range || "1M";
  const assets = symbols.map(assetByAny).filter(Boolean).slice(0, 4);
  const histories = await Promise.all(assets.map((asset) => getHistoryResponse(asset, range)));
  return {
    range,
    assets: assets.map(searchShape),
    histories,
    normalizedPerformance: histories.map((history) => {
      const base = history.points?.find((point) => Number.isFinite(Number(point.close)))?.close;
      return {
        symbol: history.symbol,
        points: (history.points || []).map((point) => ({
          date: point.date,
          performance: base ? ((point.close / base) - 1) * 100 : null
        }))
      };
    }),
    warning: histories.some((history) => !history.points?.length) ? "Some assets do not have comparable history from the current source." : null
  };
}

async function getAiInsight(body) {
  const asset = assetByAny(body.symbol || body.assetId);
  if (!asset) return { available: false, message: "AI Insight is disabled for unknown assets." };
  if (!process.env.HUGGINGFACE_API_TOKEN) {
    return { available: false, message: "AI Insight is disabled. Add a supported AI provider token in Advanced Settings or backend environment to enable it." };
  }
  return { available: false, message: "Backend AI insight route is configured, but model execution is intentionally disabled until a supported provider token and model policy are configured." };
}

function getUnavailableNews(asset) {
  return {
    symbol: asset.ticker,
    items: [],
    source: "Unavailable",
    warning: process.env.NEWS_API_KEY ? "News provider integration is configured for future expansion." : "News is unavailable in public no-key mode. Add a News API key for future news workflows.",
    error: null
  };
}

function getDiagnostics() {
  return {
    backendOnline: true,
    uptimeSeconds: Math.round((Date.now() - Date.parse(startedAt)) / 1000),
    dataMode: PUBLIC_DATA_MODE ? "Public source mode" : "Advanced provider mode",
    defaultProvider: DEFAULT_PROVIDER,
    cacheEntries: cache.size,
    missingApiKeys: ["ALPHA_VANTAGE_API_KEY", "FINNHUB_API_KEY", "TWELVE_DATA_API_KEY", "FMP_API_KEY", "POLYGON_API_KEY", "NEWS_API_KEY", "HUGGINGFACE_API_TOKEN"].filter((key) => !process.env[key]),
    recentProviderAttempts: providerAttempts.slice(-20),
    allowedProxyHosts: Array.from(ALLOWED_PROXY_HOSTS),
    suggestedFix: "Use public source mode out of the box. Add optional API keys for deeper coverage. Official-only local exchange listings require licensed feeds."
  };
}

async function fetchStooqQuote(asset) {
  const text = await fetchText(`https://stooq.com/q/l/?s=${encodeURIComponent(asset.stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`);
  const row = csvToObjects(text)[0] || {};
  if (!row.Close || row.Close === "N/D") throw new Error("Stooq returned no quote");
  return quoteShape(asset, {
    price: Number(row.Close),
    open: Number(row.Open),
    previousClose: null,
    dayHigh: Number(row.High),
    dayLow: Number(row.Low),
    volume: Number(row.Volume),
    source: "Stooq public CSV",
    lastUpdated: toIso(row.Date, row.Time)
  });
}

async function fetchStooqHistory(asset, range) {
  const text = await fetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(asset.stooqSymbol)}&i=d`);
  return csvToObjects(text)
    .map((row) => ({ date: row.Date, open: finiteOrNull(row.Open), high: finiteOrNull(row.High), low: finiteOrNull(row.Low), close: finiteOrNull(row.Close), volume: finiteOrNull(row.Volume) }))
    .filter((point) => point.date && point.close !== null && inRange(point.date, range))
    .slice(-600);
}

async function fetchYahooQuote(asset) {
  const data = await fetchJson(yahooChartUrl(asset.yahooSymbol, "5d", "1d"));
  const result = data.chart?.result?.[0];
  if (!result?.meta || !Number.isFinite(Number(result.meta.regularMarketPrice))) throw new Error("Yahoo returned no quote");
  const quote = result.indicators?.quote?.[0] || {};
  return quoteShape(asset, {
    price: normalizeYahooPrice(result.meta.regularMarketPrice, result.meta.currency, asset.currency),
    open: normalizeYahooPrice(lastFinite(quote.open), result.meta.currency, asset.currency),
    previousClose: normalizeYahooPrice(result.meta.chartPreviousClose, result.meta.currency, asset.currency),
    dayHigh: normalizeYahooPrice(lastFinite(quote.high), result.meta.currency, asset.currency),
    dayLow: normalizeYahooPrice(lastFinite(quote.low), result.meta.currency, asset.currency),
    volume: lastFinite(quote.volume),
    source: "Yahoo chart public endpoint",
    lastUpdated: result.meta.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
  });
}

async function fetchYahooHistory(asset, range) {
  const data = await fetchJson(yahooChartUrl(asset.yahooSymbol, yahooRangeFor(range), yahooIntervalFor(range)));
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const currency = result?.meta?.currency || asset.currency;
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: normalizeYahooPrice(quote.open?.[index], currency, asset.currency),
    high: normalizeYahooPrice(quote.high?.[index], currency, asset.currency),
    low: normalizeYahooPrice(quote.low?.[index], currency, asset.currency),
    close: normalizeYahooPrice(quote.close?.[index], currency, asset.currency),
    volume: finiteOrNull(quote.volume?.[index])
  })).filter((point) => point.close !== null && inRange(point.date, range)).slice(-600);
}

async function fetchCoinGeckoQuote(asset) {
  const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset.coinGeckoId)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`);
  const record = data[asset.coinGeckoId]?.usd ? data[asset.coinGeckoId] : null;
  if (!record) throw new Error("CoinGecko returned no quote");
  return quoteShape(asset, {
    price: record.usd,
    changePercent: record.usd_24h_change,
    marketCap: record.usd_market_cap,
    volume: record.usd_24h_vol,
    currency: "USD",
    source: "CoinGecko public API",
    lastUpdated: new Date().toISOString()
  });
}

async function fetchCoinGeckoHistory(asset, range) {
  const days = rangeToDays(range);
  const data = await fetchJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset.coinGeckoId)}/market_chart?vs_currency=usd&days=${days}`);
  return (data.prices || []).map(([time, price]) => ({ date: new Date(time).toISOString().slice(0, 10), open: null, high: null, low: null, close: finiteOrNull(price), volume: null })).filter((point) => point.close !== null);
}

function quoteShape(asset, raw) {
  const price = finiteOrNull(raw.price);
  const previousClose = finiteOrNull(raw.previousClose);
  const change = finiteOrNull(raw.change) ?? (price !== null && previousClose ? price - previousClose : null);
  const changePercent = finiteOrNull(raw.changePercent) ?? (change !== null && previousClose ? (change / previousClose) * 100 : null);
  const fields = {
    price,
    currency: raw.currency || asset.currency,
    change,
    changePercent,
    exchange: asset.exchange,
    volume: finiteOrNull(raw.volume),
    marketCap: finiteOrNull(raw.marketCap),
    open: finiteOrNull(raw.open),
    previousClose,
    dayHigh: finiteOrNull(raw.dayHigh),
    dayLow: finiteOrNull(raw.dayLow)
  };
  return {
    symbol: asset.ticker,
    name: asset.name,
    assetType: asset.type,
    price,
    currency: fields.currency,
    change,
    changePercent,
    exchange: asset.exchange || null,
    marketState: "unknown",
    source: raw.source || null,
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
    isCached: false,
    stale: false,
    fieldsAvailable: Object.entries(fields).filter(([, value]) => value !== null && value !== undefined).map(([key]) => key),
    fieldsUnavailable: Object.entries(fields).filter(([, value]) => value === null || value === undefined).map(([key]) => key),
    warning: null,
    error: null,
    diagnostics: { provider: raw.source || "Unknown", publicDataMode: true },
    open: fields.open,
    previousClose,
    dayHigh: fields.dayHigh,
    dayLow: fields.dayLow,
    volume: fields.volume,
    marketCap: fields.marketCap
  };
}

function unavailableQuote(asset, message, extra = {}) {
  return {
    symbol: asset.ticker,
    name: asset.name,
    assetType: asset.type,
    price: null,
    currency: asset.currency || null,
    change: null,
    changePercent: null,
    exchange: asset.exchange || null,
    marketState: "unknown",
    source: extra.source || null,
    lastUpdated: new Date().toISOString(),
    isCached: false,
    stale: false,
    fieldsAvailable: ["symbol", "name", "assetType", "exchange", "currency"],
    fieldsUnavailable: ["price", "change", "changePercent", "volume", "marketCap", "history"],
    warning: message,
    error: message,
    diagnostics: { publicDataMode: PUBLIC_DATA_MODE, providerAttempted: extra.source || "none" }
  };
}

function unavailableHistory(asset, range, message) {
  return {
    symbol: asset.ticker,
    range,
    interval: "1d",
    currency: asset.currency || null,
    source: coverageSource(asset),
    lastUpdated: new Date().toISOString(),
    isCached: false,
    stale: false,
    points: [],
    warning: message,
    error: message,
    diagnostics: { publicDataMode: PUBLIC_DATA_MODE }
  };
}

function serveStatic(requestUrl, res) {
  const pathname = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT)) return sendText(res, 403, "Forbidden");
  fs.readFile(filePath, (error, content) => {
    if (error) return sendText(res, 404, "Not found");
    sendHeaders(res, 200, MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream", staticCachePolicy(filePath));
    res.end(content);
  });
}

function proxyRequest(requestUrl, res) {
  const target = requestUrl.searchParams.get("url");
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return sendText(res, 400, "Invalid proxy URL");
  }
  if (parsed.protocol !== "https:" || !ALLOWED_PROXY_HOSTS.has(parsed.hostname)) return sendText(res, 403, "Proxy host not allowed");
  https.get(parsed, { headers: { "User-Agent": "Codex-Local-Market-Data/1.0" }, timeout: 15000 }, (upstream) => {
    let body = "";
    upstream.setEncoding("utf8");
    upstream.on("data", (chunk) => body += chunk);
    upstream.on("end", () => {
      sendHeaders(res, upstream.statusCode || 502, upstream.headers["content-type"] || "text/plain; charset=utf-8");
      res.end(body);
    });
  }).on("timeout", function () {
    this.destroy(new Error("Proxy timeout"));
  }).on("error", (error) => sendText(res, 502, error.message || "Proxy request failed"));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Global-Investment-Tracker/1.0" } });
  if (!response.ok) throw new Error(response.status === 429 ? "API rate limit reached" : `Provider error ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Global-Investment-Tracker/1.0" } });
  if (!response.ok) throw new Error(response.status === 429 ? "API rate limit reached" : `Provider error ${response.status}`);
  return response.text();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function requiredCountry(requestUrl) {
  const country = (requestUrl.searchParams.get("country") || DEFAULT_COUNTRY).toUpperCase();
  if (!countryConfigs[country]) throw httpError(400, "INVALID_COUNTRY", "Unsupported country");
  return country;
}

function requiredAsset(requestUrl) {
  const symbol = requestUrl.searchParams.get("symbol") || requestUrl.searchParams.get("assetId");
  const asset = assetByAny(symbol);
  if (!asset) throw httpError(400, "INVALID_SYMBOL", "Unknown or unsupported symbol");
  return asset;
}

function isRefreshRequest(requestUrl) {
  const value = (requestUrl.searchParams.get("refresh") || requestUrl.searchParams.get("force") || "").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function assetByAny(value) {
  const key = String(value || "").toLowerCase();
  return assetCatalog.find((asset) => asset.id.toLowerCase() === key || asset.ticker.toLowerCase() === key);
}

function assetsForCountry(countryCode) {
  const config = countryConfigs[countryCode] || countryConfigs[DEFAULT_COUNTRY];
  const defaults = new Set(config.defaultTickers.map((ticker) => ticker.toUpperCase()));
  return uniqueBy([
    ...assetCatalog.filter((asset) => asset.country === countryCode),
    ...assetCatalog.filter((asset) => defaults.has(asset.ticker.toUpperCase())),
    ...assetCatalog.filter((asset) => asset.country === "GLOBAL")
  ], "id");
}

function searchShape(asset) {
  return {
    symbol: asset.ticker,
    id: asset.id,
    name: asset.name,
    assetType: asset.type,
    exchange: asset.exchange || null,
    currency: asset.currency || null,
    country: asset.country || null,
    source: coverageSource(asset)
  };
}

function assetSummary(asset) {
  return { symbol: asset.ticker, name: asset.name, assetType: asset.type, exchange: asset.exchange };
}

function brokerRecord(countryCode, broker) {
  return {
    name: broker.name,
    url: broker.url,
    assetTypes: broker.assetTypes,
    country: countryCode,
    note: broker.note,
    verificationReminder: "Example platform to research. Availability, fees, tax rules, and regulations vary by country and user eligibility. Verify directly with the broker and local regulators."
  };
}

function publicProvidersFor(asset) {
  if (asset.coinGeckoId) return ["coingecko"];
  return [asset.stooqSymbol ? "stooq" : "", asset.yahooSymbol ? "yahoo" : ""].filter(Boolean);
}

function historySourcesFor(asset) {
  if (asset.coinGeckoId) return [{ provider: "coingecko", label: "CoinGecko public API" }];
  const sources = [];
  if (asset.stooqSymbol) sources.push({ provider: "stooq", label: "Stooq public CSV" });
  const yahooSymbol = asset.yahooSymbol || asset.ticker;
  if (yahooSymbol) sources.push({ provider: "yahoo", symbol: yahooSymbol, label: "Yahoo chart public endpoint" });
  return sources;
}

function hasPublicSource(asset) {
  return Boolean(asset.stooqSymbol || asset.yahooSymbol || asset.coinGeckoId);
}

function coverageSource(asset) {
  if (asset.stooqSymbol) return "Stooq public CSV";
  if (asset.yahooSymbol) return "Yahoo chart public endpoint";
  if (asset.coinGeckoId) return "CoinGecko public API";
  return asset.dataSources?.[0] || "Official exchange or licensed provider required";
}

function coverageNoteFor(countryCode) {
  if (["GH", "NG"].includes(countryCode)) return "Local exchange live data may require official exchange feeds or specialized licensed providers. Global assets and crypto use public sources where available.";
  return "Public no-key data is available for selected symbols. Coverage, delays, and available fields vary by provider.";
}

function normalizeProviderError(error) {
  const message = String(error?.message || "Provider failed");
  if (/rate|limit|429/i.test(message)) return "API rate limit reached";
  if (/fetch|network|timeout/i.test(message)) return "Provider network request failed or timed out";
  return message;
}

function getCache(key) {
  const record = cache.get(key);
  if (!record || Date.now() > record.expiresAt) return null;
  return record.value;
}

function setCache(key, value, ttlSeconds) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function recordAttempt(provider, symbol, ok, error = null) {
  providerAttempts.push({ provider, symbol, ok, error, at: new Date().toISOString() });
  if (providerAttempts.length > 100) providerAttempts.shift();
}

function rateLimit(req, res) {
  const key = req.socket.remoteAddress || "local";
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > RATE_LIMIT_MAX) {
    sendJson(res, 429, errorResponse("RATE_LIMIT", "Too many requests. Slow down and retry shortly."));
    return false;
  }
  return true;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = !origin || ALLOWED_ORIGINS.has(origin) || origin === "null" || NODE_ENV === "development";
  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendHeaders(res, status, contentType, cacheControl = "no-store") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || "*"
  });
}

function staticCachePolicy(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  if (basename === "index.html" || basename === "service-worker.js" || extension === ".webmanifest") return "no-store";
  if ([".css", ".js", ".png", ".jpg", ".jpeg", ".svg"].includes(extension)) return "public, max-age=86400";
  return "no-store";
}

function sendJson(res, status, body) {
  sendHeaders(res, status, "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendText(res, status, message) {
  sendHeaders(res, status, "text/plain; charset=utf-8");
  res.end(message);
}

function ok(data) {
  return { ok: true, data };
}

function errorResponse(code, message) {
  return { ok: false, error: { code, message } };
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function csvToObjects(csv) {
  const [headerLine, ...lines] = String(csv || "").trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = headerLine.split(",").map((header) => header.trim());
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() || ""]));
  });
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function lastFinite(values = []) {
  return [...values].reverse().find((value) => Number.isFinite(Number(value))) ?? null;
}

function normalizeYahooPrice(value, yahooCurrency, assetCurrency) {
  const number = finiteOrNull(value);
  if (number === null) return null;
  if (yahooCurrency === "ZAc" && assetCurrency === "ZAR") return number / 100;
  if (yahooCurrency === "GBp" && assetCurrency === "GBP") return number / 100;
  return number;
}

function yahooChartUrl(symbol, range, interval) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
}

function yahooRangeFor(range) {
  return { "1D": "1d", "5D": "5d", "1M": "1mo", "6M": "6mo", YTD: "ytd", "1Y": "1y", "5Y": "5y", Max: "max" }[range] || "1mo";
}

function yahooIntervalFor(range) {
  return range === "1D" ? "5m" : "1d";
}

function rangeToDays(range) {
  return { "1D": 1, "5D": 5, "1M": 30, "6M": 180, YTD: Math.max(1, Math.ceil((Date.now() - Date.parse(`${new Date().getFullYear()}-01-01`)) / 86400000)), "1Y": 365, "5Y": 1825, Max: "max" }[range] || 30;
}

function inRange(date, range) {
  if (range === "Max") return true;
  const days = rangeToDays(range);
  if (days === "max") return true;
  return Date.parse(date) >= Date.now() - Number(days) * 86400000;
}

function toIso(date, time) {
  if (!date || date === "N/D") return new Date().toISOString();
  const stamp = `${date}T${time && time !== "N/D" ? time : "00:00:00"}Z`;
  return Number.isFinite(Date.parse(stamp)) ? new Date(stamp).toISOString() : new Date().toISOString();
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

function localeFor(code) {
  return { US: "en-US", GB: "en-GB", GH: "en-GH", NG: "en-NG", ZA: "en-ZA", CA: "en-CA", DE: "de-DE", FR: "fr-FR", JP: "ja-JP", IN: "en-IN", CN: "zh-CN", AU: "en-AU" }[code] || "en-US";
}

function timezoneFor(code) {
  return { US: "America/New_York", GB: "Europe/London", GH: "Africa/Accra", NG: "Africa/Lagos", ZA: "Africa/Johannesburg", CA: "America/Toronto", DE: "Europe/Berlin", FR: "Europe/Paris", JP: "Asia/Tokyo", IN: "Asia/Kolkata", CN: "Asia/Shanghai", AU: "Australia/Sydney" }[code] || "UTC";
}

function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").trim();
  }
}
