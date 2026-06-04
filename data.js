window.countryConfigs = {
  US: {
    name: "United States",
    currency: "USD",
    symbol: "$",
    exchanges: ["NYSE", "NASDAQ", "NYSE Arca"],
    defaultTickers: ["AAPL", "MSFT", "NVDA", "SPY", "QQQ", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Treasuries", "Commodities"],
    notes: "US market data is usually available through public quote APIs, but brokerage access and fees vary by user.",
    brokers: [
      { name: "Fidelity", url: "https://www.fidelity.com", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify eligibility, fees, and account terms." },
      { name: "Charles Schwab", url: "https://www.schwab.com", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify eligibility and local restrictions." },
      { name: "Robinhood", url: "https://robinhood.com", assetTypes: ["Stocks", "ETFs", "Crypto"], note: "Availability may vary by state and user eligibility." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com", assetTypes: ["Stocks", "ETFs", "Bonds", "Options"], note: "Verify jurisdiction support and fees." },
      { name: "Vanguard", url: "https://investor.vanguard.com", assetTypes: ["ETFs", "Mutual Funds"], note: "Verify account eligibility and product access." }
    ]
  },
  GB: {
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    exchanges: ["LSE", "AIM"],
    defaultTickers: ["VOD.L", "HSBA.L", "BP.L", "ISF.L", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "UK assets may require exchange suffixes. Verify ISA/SIPP eligibility, fees, and tax treatment with providers.",
    brokers: [
      { name: "Hargreaves Lansdown", url: "https://www.hl.co.uk", assetTypes: ["Stocks", "ETFs", "Funds"], note: "Verify fees and account eligibility." },
      { name: "Trading 212", url: "https://www.trading212.com", assetTypes: ["Stocks", "ETFs"], note: "Availability may vary." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.co.uk", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify jurisdiction support." },
      { name: "AJ Bell", url: "https://www.ajbell.co.uk", assetTypes: ["Stocks", "ETFs", "Funds"], note: "Verify fees and product availability." }
    ]
  },
  GH: {
    name: "Ghana",
    currency: "GHS",
    symbol: "GH₵",
    exchanges: ["Ghana Stock Exchange"],
    defaultTickers: ["MTNGH", "GCB", "EGL", "SPY", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Treasuries"],
    notes: "Local GSE quote coverage is limited in free public APIs. The app shows unavailable states rather than inventing prices. Broker availability depends on eligibility and local regulation.",
    brokers: [
      { name: "Ghana Stock Exchange broker directory", url: "https://gse.com.gh/membership/", assetTypes: ["Stocks", "Bonds"], note: "Use the official directory and verify licensing." },
      { name: "Licensed local brokers", url: "https://sec.gov.gh", assetTypes: ["Stocks", "Bonds", "Treasuries"], note: "Verify SEC Ghana registration and fees." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com", assetTypes: ["International Stocks", "ETFs"], note: "Availability may vary by country, eligibility, and regulation." }
    ]
  },
  NG: {
    name: "Nigeria",
    currency: "NGN",
    symbol: "₦",
    exchanges: ["NGX"],
    defaultTickers: ["DANGCEM", "MTNN", "ZENITHBANK", "AAPL", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds"],
    notes: "Local data coverage varies by provider. Verify broker regulation with official Nigerian authorities.",
    brokers: [
      { name: "Local SEC-regulated brokers", url: "https://sec.gov.ng", assetTypes: ["Stocks", "Bonds"], note: "Verify registration and fees." },
      { name: "Bamboo", url: "https://investbamboo.com", assetTypes: ["US Stocks", "ETFs"], note: "Availability may vary." },
      { name: "Chaka", url: "https://chaka.com", assetTypes: ["Stocks", "ETFs"], note: "Verify access and regulation." },
      { name: "Trove", url: "https://troveapp.co", assetTypes: ["Stocks", "ETFs"], note: "Verify terms and eligibility." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com", assetTypes: ["International Stocks", "ETFs"], note: "Availability may vary." }
    ]
  },
  ZA: {
    name: "South Africa",
    currency: "ZAR",
    symbol: "R",
    exchanges: ["JSE"],
    defaultTickers: ["NPN.JO", "SBK.JO", "SOL.JO", "GLD", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "JSE symbols may require provider-specific suffixes. Verify exchange access and product rules.",
    brokers: [
      { name: "EasyEquities", url: "https://www.easyequities.co.za", assetTypes: ["Stocks", "ETFs"], note: "Verify fees and account eligibility." },
      { name: "Standard Bank", url: "https://securities.standardbank.co.za", assetTypes: ["Stocks", "ETFs"], note: "Verify product availability." },
      { name: "Absa Stockbrokers", url: "https://www.absa.co.za", assetTypes: ["Stocks", "ETFs"], note: "Verify fees and regulation." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com", assetTypes: ["International Stocks", "ETFs"], note: "Availability may vary." }
    ]
  },
  CA: {
    name: "Canada",
    currency: "CAD",
    symbol: "C$",
    exchanges: ["TSX", "TSXV", "CSE"],
    defaultTickers: ["SHOP.TO", "RY.TO", "XIU.TO", "SPY", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "Canadian symbols may require provider-specific suffixes. Verify registered account eligibility.",
    brokers: [
      { name: "Questrade", url: "https://www.questrade.com", assetTypes: ["Stocks", "ETFs"], note: "Verify fees and account terms." },
      { name: "Wealthsimple", url: "https://www.wealthsimple.com", assetTypes: ["Stocks", "ETFs", "Crypto"], note: "Availability may vary." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.ca", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify account eligibility." },
      { name: "TD Direct Investing", url: "https://www.td.com", assetTypes: ["Stocks", "ETFs", "Funds"], note: "Verify product availability." }
    ]
  },
  DE: {
    name: "Germany",
    currency: "EUR",
    symbol: "€",
    exchanges: ["Xetra", "Frankfurt"],
    defaultTickers: ["SAP.DE", "SIE.DE", "DTE.DE", "EXS1.DE", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "European instruments may be available through regional brokers and banks. Verify costs and tax treatment.",
    brokers: [
      { name: "Trade Republic", url: "https://traderepublic.com", assetTypes: ["Stocks", "ETFs", "Crypto"], note: "Verify product availability." },
      { name: "DEGIRO", url: "https://www.degiro.de", assetTypes: ["Stocks", "ETFs"], note: "Availability may vary." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.ie", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify jurisdiction support." },
      { name: "Local banks", url: "https://www.bafin.de", assetTypes: ["Stocks", "ETFs", "Funds"], note: "Verify regulation and fees." }
    ]
  },
  FR: {
    name: "France",
    currency: "EUR",
    symbol: "€",
    exchanges: ["Euronext Paris"],
    defaultTickers: ["AIR.PA", "MC.PA", "OR.PA", "CAC.PA", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds"],
    notes: "Verify PEA eligibility, fund domicile, fees, and tax treatment with providers.",
    brokers: [
      { name: "DEGIRO", url: "https://www.degiro.fr", assetTypes: ["Stocks", "ETFs"], note: "Verify availability and fees." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.ie", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify jurisdiction support." },
      { name: "Trade Republic", url: "https://traderepublic.com", assetTypes: ["Stocks", "ETFs", "Crypto"], note: "Availability may vary." },
      { name: "Local banks", url: "https://www.amf-france.org", assetTypes: ["Stocks", "Funds", "ETFs"], note: "Verify regulation and tax treatment." }
    ]
  },
  JP: {
    name: "Japan",
    currency: "JPY",
    symbol: "¥",
    exchanges: ["Tokyo Stock Exchange"],
    defaultTickers: ["7203.T", "6758.T", "9984.T", "1306.T", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds"],
    notes: "Japanese exchange data and account access vary by provider. Verify local rules and fees.",
    brokers: [
      { name: "SBI Securities", url: "https://www.sbisec.co.jp", assetTypes: ["Stocks", "Funds", "ETFs"], note: "Verify eligibility and fees." },
      { name: "Rakuten Securities", url: "https://www.rakuten-sec.co.jp", assetTypes: ["Stocks", "Funds", "ETFs"], note: "Verify account terms." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.co.jp", assetTypes: ["International Stocks", "ETFs"], note: "Availability may vary." }
    ]
  },
  IN: {
    name: "India",
    currency: "INR",
    symbol: "₹",
    exchanges: ["NSE", "BSE"],
    defaultTickers: ["RELIANCE.NS", "TCS.NS", "NIFTYBEES.NS", "GLD", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "Verify account eligibility, tax treatment, and regulatory rules for each asset type.",
    brokers: [
      { name: "Zerodha", url: "https://zerodha.com", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify product availability and fees." },
      { name: "Groww", url: "https://groww.in", assetTypes: ["Stocks", "Mutual Funds", "ETFs"], note: "Verify terms and fees." },
      { name: "Upstox", url: "https://upstox.com", assetTypes: ["Stocks", "ETFs", "Commodities"], note: "Verify account eligibility." },
      { name: "ICICI Direct", url: "https://www.icicidirect.com", assetTypes: ["Stocks", "Funds", "Bonds"], note: "Verify product rules." }
    ]
  },
  CN: {
    name: "China",
    currency: "CNY",
    symbol: "¥",
    exchanges: ["Shanghai", "Shenzhen", "Hong Kong"],
    defaultTickers: ["BABA", "0700.HK", "ASHR", "SPY", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds"],
    notes: "Market access can be restricted and regulation changes. Verify eligibility, exchange rules, and data source coverage.",
    brokers: [
      { name: "Local licensed brokers", url: "http://www.csrc.gov.cn", assetTypes: ["Stocks", "Funds"], note: "Verify regulation and eligibility." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com", assetTypes: ["International Stocks", "ETFs"], note: "Availability may vary." },
      { name: "Local banks where available", url: "http://www.csrc.gov.cn", assetTypes: ["Funds", "Bonds"], note: "Verify official rules and fees." }
    ]
  },
  AU: {
    name: "Australia",
    currency: "AUD",
    symbol: "A$",
    exchanges: ["ASX"],
    defaultTickers: ["BHP.AX", "CBA.AX", "VAS.AX", "GLD", "BTC"],
    supportedAssetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Bonds", "Commodities"],
    notes: "Verify CHESS sponsorship, fees, and tax implications with each platform.",
    brokers: [
      { name: "CommSec", url: "https://www.commsec.com.au", assetTypes: ["Stocks", "ETFs"], note: "Verify fees and eligibility." },
      { name: "Selfwealth", url: "https://www.selfwealth.com.au", assetTypes: ["Stocks", "ETFs"], note: "Availability may vary." },
      { name: "Stake", url: "https://hellostake.com", assetTypes: ["Stocks", "ETFs"], note: "Verify supported markets and fees." },
      { name: "Interactive Brokers", url: "https://www.interactivebrokers.com.au", assetTypes: ["Stocks", "ETFs", "Bonds"], note: "Verify product availability." }
    ]
  }
};

window.assetCatalog = [
  { id: "aapl", ticker: "AAPL", name: "Apple Inc.", type: "Stocks", exchange: "NASDAQ", country: "US", currency: "USD", stooqSymbol: "aapl.us", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "msft", ticker: "MSFT", name: "Microsoft Corp.", type: "Stocks", exchange: "NASDAQ", country: "US", currency: "USD", stooqSymbol: "msft.us", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "nvda", ticker: "NVDA", name: "NVIDIA Corp.", type: "Stocks", exchange: "NASDAQ", country: "US", currency: "USD", stooqSymbol: "nvda.us", risk: "High", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "spy", ticker: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETFs", exchange: "NYSE Arca", country: "US", currency: "USD", stooqSymbol: "spy.us", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "qqq", ticker: "QQQ", name: "Invesco QQQ Trust", type: "ETFs", exchange: "NASDAQ", country: "US", currency: "USD", stooqSymbol: "qqq.us", risk: "High", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "voo", ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "ETFs", exchange: "NYSE Arca", country: "US", currency: "USD", stooqSymbol: "voo.us", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage", "Finnhub", "FMP", "Twelve Data"] },
  { id: "shy", ticker: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", type: "Treasuries", exchange: "NASDAQ", country: "US", currency: "USD", stooqSymbol: "shy.us", risk: "Low", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "gld", ticker: "GLD", name: "SPDR Gold Shares", type: "Commodities", exchange: "NYSE Arca", country: "US", currency: "USD", stooqSymbol: "gld.us", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "spx", ticker: "SPX", name: "S&P 500 Index", type: "Indices", exchange: "S&P Dow Jones", country: "US", currency: "USD", stooqSymbol: "^spx", risk: "Medium", dataSources: ["Stooq"] },

  { id: "btc", ticker: "BTC", name: "Bitcoin", type: "Crypto", exchange: "CoinGecko", country: "GLOBAL", currency: "USD", coinGeckoId: "bitcoin", risk: "High", dataSources: ["CoinGecko"] },
  { id: "eth", ticker: "ETH", name: "Ethereum", type: "Crypto", exchange: "CoinGecko", country: "GLOBAL", currency: "USD", coinGeckoId: "ethereum", risk: "High", dataSources: ["CoinGecko"] },

  { id: "vod-l", ticker: "VOD.L", name: "Vodafone Group", type: "Stocks", exchange: "LSE", country: "GB", currency: "GBP", stooqSymbol: "vod.uk", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "hsba-l", ticker: "HSBA.L", name: "HSBC Holdings", type: "Stocks", exchange: "LSE", country: "GB", currency: "GBP", stooqSymbol: "hsba.uk", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "bp-l", ticker: "BP.L", name: "BP plc", type: "Stocks", exchange: "LSE", country: "GB", currency: "GBP", stooqSymbol: "bp.uk", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "isf-l", ticker: "ISF.L", name: "iShares Core FTSE 100 ETF", type: "ETFs", exchange: "LSE", country: "GB", currency: "GBP", stooqSymbol: "isf.uk", risk: "Medium", dataSources: ["Stooq"] },

  { id: "mtngh", ticker: "MTNGH", name: "MTN Ghana", type: "Stocks", exchange: "Ghana Stock Exchange", country: "GH", currency: "GHS", risk: "Medium", officialUrl: "https://gse.com.gh", dataSources: ["Official exchange or licensed provider required"] },
  { id: "gcb", ticker: "GCB", name: "GCB Bank PLC", type: "Stocks", exchange: "Ghana Stock Exchange", country: "GH", currency: "GHS", risk: "Medium", officialUrl: "https://gse.com.gh", dataSources: ["Official exchange or licensed provider required"] },
  { id: "egl", ticker: "EGL", name: "Enterprise Group PLC", type: "Stocks", exchange: "Ghana Stock Exchange", country: "GH", currency: "GHS", risk: "Medium", officialUrl: "https://gse.com.gh", dataSources: ["Official exchange or licensed provider required"] },

  { id: "dangcem", ticker: "DANGCEM", name: "Dangote Cement", type: "Stocks", exchange: "NGX", country: "NG", currency: "NGN", risk: "Medium", officialUrl: "https://ngxgroup.com", dataSources: ["Official exchange or licensed provider required"] },
  { id: "mtnn", ticker: "MTNN", name: "MTN Nigeria", type: "Stocks", exchange: "NGX", country: "NG", currency: "NGN", risk: "Medium", officialUrl: "https://ngxgroup.com", dataSources: ["Official exchange or licensed provider required"] },
  { id: "zenithbank", ticker: "ZENITHBANK", name: "Zenith Bank", type: "Stocks", exchange: "NGX", country: "NG", currency: "NGN", risk: "Medium", officialUrl: "https://ngxgroup.com", dataSources: ["Official exchange or licensed provider required"] },

  { id: "npn-jo", ticker: "NPN.JO", name: "Naspers", type: "Stocks", exchange: "JSE", country: "ZA", currency: "ZAR", yahooSymbol: "NPN.JO", risk: "High", dataSources: ["Yahoo chart public endpoint", "Alpha Vantage"] },
  { id: "sbk-jo", ticker: "SBK.JO", name: "Standard Bank Group", type: "Stocks", exchange: "JSE", country: "ZA", currency: "ZAR", yahooSymbol: "SBK.JO", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] },
  { id: "sol-jo", ticker: "SOL.JO", name: "Sasol", type: "Stocks", exchange: "JSE", country: "ZA", currency: "ZAR", yahooSymbol: "SOL.JO", risk: "High", dataSources: ["Yahoo chart public endpoint"] },

  { id: "shop-to", ticker: "SHOP.TO", name: "Shopify", type: "Stocks", exchange: "TSX", country: "CA", currency: "CAD", yahooSymbol: "SHOP.TO", risk: "High", dataSources: ["Yahoo chart public endpoint", "Alpha Vantage"] },
  { id: "ry-to", ticker: "RY.TO", name: "Royal Bank of Canada", type: "Stocks", exchange: "TSX", country: "CA", currency: "CAD", yahooSymbol: "RY.TO", risk: "Medium", dataSources: ["Yahoo chart public endpoint", "Alpha Vantage"] },
  { id: "xiu-to", ticker: "XIU.TO", name: "iShares S&P/TSX 60 ETF", type: "ETFs", exchange: "TSX", country: "CA", currency: "CAD", yahooSymbol: "XIU.TO", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] },

  { id: "sap-de", ticker: "SAP.DE", name: "SAP SE", type: "Stocks", exchange: "Xetra", country: "DE", currency: "EUR", stooqSymbol: "sap.de", risk: "Medium", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "sie-de", ticker: "SIE.DE", name: "Siemens AG", type: "Stocks", exchange: "Xetra", country: "DE", currency: "EUR", stooqSymbol: "sie.de", risk: "Medium", dataSources: ["Stooq"] },
  { id: "dte-de", ticker: "DTE.DE", name: "Deutsche Telekom", type: "Stocks", exchange: "Xetra", country: "DE", currency: "EUR", stooqSymbol: "dte.de", risk: "Medium", dataSources: ["Stooq"] },
  { id: "exs1-de", ticker: "EXS1.DE", name: "iShares Core DAX ETF", type: "ETFs", exchange: "Xetra", country: "DE", currency: "EUR", stooqSymbol: "exs1.de", risk: "Medium", dataSources: ["Stooq"] },

  { id: "air-pa", ticker: "AIR.PA", name: "Airbus", type: "Stocks", exchange: "Euronext Paris", country: "FR", currency: "EUR", stooqSymbol: "air.fr", risk: "Medium", dataSources: ["Stooq"] },
  { id: "mc-pa", ticker: "MC.PA", name: "LVMH", type: "Stocks", exchange: "Euronext Paris", country: "FR", currency: "EUR", stooqSymbol: "mc.fr", risk: "Medium", dataSources: ["Stooq"] },
  { id: "or-pa", ticker: "OR.PA", name: "L'Oreal", type: "Stocks", exchange: "Euronext Paris", country: "FR", currency: "EUR", stooqSymbol: "or.fr", risk: "Medium", dataSources: ["Stooq"] },
  { id: "cac-pa", ticker: "CAC.PA", name: "CAC 40 Index", type: "Indices", exchange: "Euronext Paris", country: "FR", currency: "EUR", stooqSymbol: "^cac", risk: "Medium", dataSources: ["Stooq"] },

  { id: "toyota-t", ticker: "7203.T", name: "Toyota Motor", type: "Stocks", exchange: "Tokyo Stock Exchange", country: "JP", currency: "JPY", stooqSymbol: "7203.jp", risk: "Medium", dataSources: ["Stooq"] },
  { id: "sony-t", ticker: "6758.T", name: "Sony Group", type: "Stocks", exchange: "Tokyo Stock Exchange", country: "JP", currency: "JPY", stooqSymbol: "6758.jp", risk: "Medium", dataSources: ["Stooq"] },
  { id: "softbank-t", ticker: "9984.T", name: "SoftBank Group", type: "Stocks", exchange: "Tokyo Stock Exchange", country: "JP", currency: "JPY", stooqSymbol: "9984.jp", risk: "High", dataSources: ["Stooq"] },
  { id: "topix-etf-t", ticker: "1306.T", name: "NEXT FUNDS TOPIX ETF", type: "ETFs", exchange: "Tokyo Stock Exchange", country: "JP", currency: "JPY", stooqSymbol: "1306.jp", risk: "Medium", dataSources: ["Stooq"] },

  { id: "reliance-ns", ticker: "RELIANCE.NS", name: "Reliance Industries", type: "Stocks", exchange: "NSE", country: "IN", currency: "INR", yahooSymbol: "RELIANCE.NS", risk: "Medium", dataSources: ["Yahoo chart public endpoint", "Alpha Vantage"] },
  { id: "tcs-ns", ticker: "TCS.NS", name: "Tata Consultancy Services", type: "Stocks", exchange: "NSE", country: "IN", currency: "INR", yahooSymbol: "TCS.NS", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] },
  { id: "niftybees-ns", ticker: "NIFTYBEES.NS", name: "Nippon India ETF Nifty 50 BeES", type: "ETFs", exchange: "NSE", country: "IN", currency: "INR", yahooSymbol: "NIFTYBEES.NS", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] },

  { id: "baba", ticker: "BABA", name: "Alibaba Group ADR", type: "Stocks", exchange: "NYSE", country: "CN", currency: "USD", stooqSymbol: "baba.us", risk: "High", dataSources: ["Stooq", "Alpha Vantage"] },
  { id: "tencent-hk", ticker: "0700.HK", name: "Tencent Holdings", type: "Stocks", exchange: "Hong Kong", country: "CN", currency: "HKD", yahooSymbol: "0700.HK", risk: "High", dataSources: ["Yahoo chart public endpoint"] },
  { id: "ashr", ticker: "ASHR", name: "Xtrackers Harvest CSI 300 China A-Shares ETF", type: "ETFs", exchange: "NYSE Arca", country: "CN", currency: "USD", stooqSymbol: "ashr.us", risk: "High", dataSources: ["Stooq"] },

  { id: "bhp-ax", ticker: "BHP.AX", name: "BHP Group", type: "Stocks", exchange: "ASX", country: "AU", currency: "AUD", yahooSymbol: "BHP.AX", risk: "Medium", dataSources: ["Yahoo chart public endpoint", "Alpha Vantage"] },
  { id: "cba-ax", ticker: "CBA.AX", name: "Commonwealth Bank", type: "Stocks", exchange: "ASX", country: "AU", currency: "AUD", yahooSymbol: "CBA.AX", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] },
  { id: "vas-ax", ticker: "VAS.AX", name: "Vanguard Australian Shares ETF", type: "ETFs", exchange: "ASX", country: "AU", currency: "AUD", yahooSymbol: "VAS.AX", risk: "Medium", dataSources: ["Yahoo chart public endpoint"] }
];
