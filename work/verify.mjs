import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const data = fs.readFileSync("data.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const server = fs.readFileSync("server.js", "utf8");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(data, context);

const countries = Object.keys(context.window.countryConfigs);
const assets = context.window.assetCatalog;
const assetTypes = new Set(assets.map((asset) => asset.type));
const catalogTickers = new Set(assets.map((asset) => asset.ticker.toUpperCase()));
const missingDefaultTickers = Object.entries(context.window.countryConfigs)
  .flatMap(([code, config]) => config.defaultTickers.filter((ticker) => !catalogTickers.has(ticker.toUpperCase())).map((ticker) => `${code}:${ticker}`));
const officialOnlyAssets = assets.filter((asset) => !asset.stooqSymbol && !asset.yahooSymbol && !asset.coinGeckoId);
const providers = ["Stooq", "Yahoo chart", "CoinGecko", "Alpha Vantage", "Finnhub", "Financial Modeling Prep", "Twelve Data"];
const services = [
  "designTokens",
  "motionSystem",
  "transitionManager",
  "themeManager",
  "toastManager",
  "modalManager",
  "drawerManager",
  "menuManager",
  "pageRouter",
  "animationUtilities",
  "uxGuidance",
  "emptyStateManager",
  "dataSourceManager",
  "publicMarketDataService",
  "advancedApiService",
  "marketDataService",
  "cryptoDataService",
  "brokerDirectoryService",
  "countryConfigService",
  "watchlistService",
  "compareService",
  "trustService",
  "ipoIntelligenceService",
  "opportunityRankingService",
  "notificationService",
  "huggingFaceService",
  "aiInsightService",
  "diagnosticsService",
  "chartService"
];
const suggestedFunctions = [
  "fetchStockQuote",
  "fetchHistoricalPrices",
  "fetchCryptoPrice",
  "fetchMarketOverview",
  "getCountryConfig",
  "getBrokerOptions",
  "saveWatchlistItem",
  "removeWatchlistItem",
  "getWatchlist",
  "saveSettings",
  "getSettings",
  "testApiConnection",
  "fetchAiInsight"
];

const checks = {
  chartJs: html.includes("chart.js"),
  countrySelector: html.includes("countrySelect"),
  search: html.includes("searchInput"),
  assetGrid: html.includes("assetGrid"),
  detailDrawer: html.includes("detailDrawer"),
  settingsDrawer: html.includes("settingsDrawer"),
  routeViews: ["homeView", "iposView", "exploreView", "watchlistView", "compareView", "brokersView", "diagnosticsView", "learnView", "settingsView"].every((id) => html.includes(id)) && app.includes("pageRouter") && app.includes("data-page"),
  animatedRouteViews: css.includes(".page-view") && css.includes(".page-view[hidden]") && css.includes("grid-area: 1 / 1") && css.includes("is-exiting") && css.includes("translateY(16px)") && css.includes("prefers-reduced-motion"),
  apiClient: app.includes("const apiClient") && ["getHealth", "getCountries", "getMarketOverview", "searchAssets", "getQuote", "getHistory", "getFundamentals", "getBrokers", "refreshWatchlist", "compareAssets", "getDiagnostics", "getNews", "getAiInsight"].every((name) => app.includes(name)),
  setupFiles: fs.existsSync("package.json") && fs.existsSync(".env.example") && fs.existsSync("API.md"),
  backendRoutes: ["/api/health", "/api/countries", "/api/market-overview", "/api/search", "/api/quote", "/api/history", "/api/fundamentals", "/api/brokers", "/api/watchlist/refresh", "/api/compare", "/api/news", "/api/ai-insight", "/api/diagnostics"].every((route) => server.includes(route)),
  advancedSettings: html.includes("Advanced Settings") && html.includes("Polygon.io") && html.includes("News API") && html.includes("cacheDuration") && html.includes("hfModel"),
  huggingFaceApi: app.includes("HUGGING_FACE_CHAT_COMPLETIONS_URL") && app.includes("router.huggingface.co/v1/chat/completions") && app.includes("DEFAULT_HF_MODEL"),
  diagnosticsPanel: html.includes("diagnosticsPanel") && app.includes("function renderDiagnostics"),
  trustGovernance: html.includes("todayBriefPanel") && html.includes("ipoPanel") && html.includes("learnPanel") && html.includes("sourceExplorerPanel") && app.includes("function renderTodayBrief") && app.includes("function confidenceScoreFor") && app.includes("function freshnessFor") && app.includes("ipoSourceDirectory"),
  insightCard: html.includes("insightCard") && app.includes("function renderInsightCard"),
  publicSourceMode: app.includes("Public source mode") && app.includes("Public no-key sources"),
  watchlist: html.includes("watchlistPanel") && app.includes("localStorage.setItem(STORAGE.watchlist"),
  comparison: html.includes("comparePanel") && app.includes("renderComparison"),
  volumeChart: app.includes("renderVolumeChart") && app.includes("detailVolumeChart"),
  allocationChart: app.includes("renderAllocationChart") && app.includes("allocationChart"),
  countries: countries.length,
  requiredCountries: ["US", "GB", "GH", "NG", "ZA", "CA", "DE", "FR", "JP", "IN", "CN", "AU"].every((code) => countries.includes(code)),
  defaultTickersExist: missingDefaultTickers.length === 0,
  officialOnlyCoverageExplicit: officialOnlyAssets.length === 6 && officialOnlyAssets.every((asset) => asset.dataSources?.join(" ").includes("Official exchange")),
  assetTypes: ["Stocks", "ETFs", "Crypto", "Indices", "Treasuries", "Commodities"].every((type) => assetTypes.has(type)),
  providerSupport: providers.every((provider) => data.includes(provider) || app.includes(provider)),
  services: services.every((service) => app.includes(service)),
  suggestedFunctions: suggestedFunctions.every((name) => app.includes(`window.${name}`) || app.includes(`function ${name}`)),
  noUnsafeEval: !app.includes("eval("),
  sanitizes: app.includes("escapeHTML") && app.includes("safeText"),
  noHardcodedPrivateKeys: !/(hf_[A-Za-z0-9]{10,}|apikey\\s*=\\s*['\"][A-Za-z0-9]{8,})/.test(`${html}\n${app}\n${data}`),
  localStoragePrototypeNote: html.includes("Prototype security note") && app.includes("localStorage"),
  backendProxyRecommendation: app.includes("/api/quote") && app.includes("/api/history") && app.includes("secure backend proxy"),
  clearCache: html.includes("clearCacheButton") && app.includes("function clearCache"),
  historyRefresh: app.includes("refresh: options.force ? \"true\"") && server.includes("isRefreshRequest") && server.includes("refresh ? null : getCache(cacheKey)"),
  quoteCacheVersion: app.includes("QUOTE_CACHE_VERSION") && app.includes("record.cacheVersion !== QUOTE_CACHE_VERSION"),
  tickerHeroValues: app.includes("function tickerOrbValue") && app.includes("compactMoney") && app.includes("renderQuoteDependentViews"),
  yahooFallback: app.includes("fetchYahooQuote") && app.includes("fetchYahooHistory") && app.includes("asset.yahooSymbol || asset.ticker") && server.includes("historySourcesFor") && server.includes("Yahoo chart public endpoint") && data.includes("yahooSymbol"),
  localProxy: fs.existsSync("server.js") && app.includes("function proxiedUrl") && app.includes("checkLocalProxyStatus") && server.includes("/api/proxy") && server.includes("/api/health"),
  continuousRefresh: html.includes("refreshInterval") && html.includes("5 minutes") && app.includes("function scheduleAutoRefresh") && app.includes("refreshTimer") && app.includes("setInterval"),
  opportunityRanking: html.includes("opportunityPanel") && app.includes("const opportunityRankingService") && app.includes("Opportunity Score") && app.includes("Confidence Score") && app.includes("Reliability Score") && app.includes("Forecast Quality") && app.includes("Availability Score") && app.includes("Why is this ranked highly?") && app.includes("not buy, sell, hold, or guaranteed return"),
  morningBrief: html.includes("morningBriefPanel") && app.includes("Daily Market Intelligence Brief") && app.includes("Morning Executive Summary") && app.includes("Open IPOs") && app.includes("Closing Soon IPOs") && app.includes("Currency Exposure"),
  notifications: html.includes("notificationCenterPanel") && html.includes("requestNotificationPermission") && app.includes("const notificationService") && app.includes("Notification.requestPermission") && app.includes("Last Notification Sent") && app.includes("No notification has been sent"),
  pwaStaticOnly: html.includes("manifest.webmanifest") && html.includes("apple-touch-icon") && fs.existsSync("manifest.webmanifest") && fs.existsSync("service-worker.js") && fs.existsSync("assets/app-icon-192.png") && fs.existsSync("assets/app-icon-512.png") && fs.existsSync("assets/apple-touch-icon.png") && fs.readFileSync("service-worker.js", "utf8").includes('url.pathname.startsWith("/api/")') && fs.readFileSync("service-worker.js", "utf8").includes("STATIC_ASSETS") && fs.readFileSync("manifest.webmanifest", "utf8").includes("maskable"),
  heroIdentity: html.includes("heroPreset") && html.includes("heroImageUrl") && html.includes("heroImageFile") && html.includes("heroPreview") && app.includes("const heroImageService") && app.includes("dominantColorFromPixels") && app.includes("--hero-image") && css.includes("--hero-image") && css.includes(".hero-preview"),
  glassSubmenus: app.includes("const glassSelectManager") && app.includes("native-select-hidden") && css.includes(".glass-select-menu") && css.includes(".glass-select-option.active") && ["countrySelect", "providerSelect", "themeSetting", "defaultCountry", "cacheDuration", "refreshInterval", "priorityPreference", "heroPreset", "notificationFrequency"].every((id) => html.includes(id)),
  globalMarketIntegrity: app.includes("state.marketSwitching") && app.includes("isAssetInSelectedMarket") && app.includes("timezoneForCountry") && app.includes("localeForCountry") && app.includes("Previous market quotes are hidden") && app.includes("hidden because they belong to another market") && css.includes(".market-scope-note"),
  motionTokens: css.includes("--duration-fast") && css.includes("--ease-emphasized") && css.includes("--glass-blur"),
  motionClasses: css.includes(".is-revealed") && css.includes("cardEnter") && css.includes("toastProgress"),
  reducedMotion: css.includes("prefers-reduced-motion") && app.includes("prefersReducedMotion"),
  responsive: css.includes("@media (max-width: 820px)") && css.includes("grid-template-columns: 1fr"),
  disclaimer: html.includes("education and research only") && html.includes("Market data may be delayed")
};

console.log(JSON.stringify(checks, null, 2));

const failed = Object.entries(checks).filter(([key, value]) => {
  if (key === "countries") return value < 12;
  return value !== true;
});

if (failed.length) {
  console.error("Failed checks:", failed);
  process.exit(1);
}
