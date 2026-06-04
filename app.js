(function () {
  "use strict";

  const STORAGE = {
    settings: "git.settings",
    quotes: "git.quoteCache",
    history: "git.historyCache",
    watchlist: "git.watchlist",
    compare: "git.compare",
    theme: "git.theme",
    notifications: "git.notifications"
  };
  const QUOTE_CACHE_VERSION = 3;

  const ASSET_TYPES = ["All", "Stocks", "ETFs", "Crypto", "Indices", "Treasuries", "Bonds", "Commodities"];
  const TIME_RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "Max"];
  const DEFAULT_HF_MODEL = "google/gemma-2-2b-it:fastest";
  const HUGGING_FACE_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";
  const HERO_PRESETS = {
    cover: "assets/hero-cover-reference.jpg",
    mist: "assets/market-mist-flow.jpg",
    amber: "assets/market-amber-flow.jpg",
    sage: "assets/market-sage-flow.jpg",
    gold: "assets/market-gold-flow.jpg"
  };

  const designTokens = {
    durationFast: 120,
    durationNormal: 220,
    durationSlow: 420,
    easeStandard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    easeEmphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeExit: "cubic-bezier(0.7, 0, 0.84, 0)"
  };

  const motionSystem = {
    prefersReducedMotion() {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    duration(value) {
      return this.prefersReducedMotion() ? 1 : value;
    }
  };

  const animationUtilities = {
    nextFrame(callback) {
      requestAnimationFrame(() => requestAnimationFrame(callback));
    },
    pulse(element, className = "motion-pulse") {
      if (!element || motionSystem.prefersReducedMotion()) return;
      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);
    }
  };

  const transitionManager = {
    reveal(element, className = "is-revealed") {
      if (!element) return;
      animationUtilities.nextFrame(() => element.classList.add(className));
    },
    hideAfterExit(element, className = "is-revealed") {
      if (!element) return;
      element.classList.remove(className);
      window.setTimeout(() => {
        if (!element.classList.contains(className)) element.hidden = true;
      }, motionSystem.duration(designTokens.durationSlow));
    },
    animateListChange(container) {
      if (!container || motionSystem.prefersReducedMotion()) return;
      container.classList.remove("list-updated");
      void container.offsetWidth;
      container.classList.add("list-updated");
    }
  };

  const modalManager = {
    open(drawer) {
      byId("modalBackdrop").hidden = false;
      drawer.hidden = false;
      transitionManager.reveal(byId("modalBackdrop"));
      transitionManager.reveal(drawer);
    },
    closeAll() {
      transitionManager.hideAfterExit(byId("modalBackdrop"));
      transitionManager.hideAfterExit(byId("settingsDrawer"));
      transitionManager.hideAfterExit(byId("detailDrawer"));
    }
  };

  const drawerManager = {
    open(id) {
      const drawer = byId(id);
      modalManager.open(drawer);
      window.setTimeout(() => {
        drawer.querySelector("button, input, select, a")?.focus();
      }, motionSystem.duration(designTokens.durationNormal));
    },
    close() {
      modalManager.closeAll();
    }
  };

  const toastManager = {
    show(message) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = message;
      byId("toastRegion").appendChild(toast);
      transitionManager.reveal(toast);
      window.setTimeout(() => {
        toast.classList.remove("is-revealed");
        window.setTimeout(() => toast.remove(), motionSystem.duration(designTokens.durationNormal));
      }, 2800);
    }
  };

  const themeManager = {
    apply(theme) {
      applyTheme(theme);
      animationUtilities.pulse(document.documentElement, "theme-changing");
    },
    toggle() {
      toggleTheme();
    }
  };

  const menuManager = {
    markActive(container, selector, activeValue, dataKey) {
      container.querySelectorAll(selector).forEach((item) => {
        item.classList.toggle("active", item.dataset[dataKey] === activeValue);
      });
    }
  };

  const glassSelectManager = {
    enhanceAll() {
      document.querySelectorAll("select").forEach((select) => this.enhance(select));
    },
    enhance(select) {
      if (!select || select.dataset.glassSelect === "true") {
        this.refresh(select);
        return;
      }
      select.dataset.glassSelect = "true";
      select.classList.add("native-select-hidden");
      const control = document.createElement("div");
      control.className = "glass-select";
      control.dataset.selectId = select.id || "";
      control.innerHTML = `
        <button class="glass-select-button" type="button" aria-haspopup="listbox" aria-expanded="false">
          <span></span>
          <i aria-hidden="true">⌄</i>
        </button>
        <div class="glass-select-menu" role="listbox" hidden></div>
      `;
      select.insertAdjacentElement("afterend", control);
      control.querySelector(".glass-select-button").addEventListener("click", (event) => {
        event.preventDefault();
        this.toggle(select);
      });
      select.addEventListener("change", () => this.refresh(select));
      this.refresh(select);
    },
    controlFor(select) {
      if (!select) return null;
      return select.nextElementSibling?.classList?.contains("glass-select") ? select.nextElementSibling : null;
    },
    refresh(select) {
      const control = this.controlFor(select);
      if (!select || !control) return;
      const button = control.querySelector(".glass-select-button");
      const menu = control.querySelector(".glass-select-menu");
      const selected = select.selectedOptions?.[0] || select.options[select.selectedIndex] || select.options[0];
      button.querySelector("span").textContent = selected?.textContent || "Select";
      menu.innerHTML = Array.from(select.options).map((option) => `
        <button class="glass-select-option ${option.value === select.value ? "active" : ""}" type="button" role="option" aria-selected="${option.value === select.value ? "true" : "false"}" data-value="${escapeHTML(option.value)}">
          <span>${escapeHTML(option.textContent)}</span>
          <i aria-hidden="true">${option.value === select.value ? "•" : ""}</i>
        </button>
      `).join("");
      menu.querySelectorAll(".glass-select-option").forEach((optionButton) => {
        optionButton.addEventListener("click", (event) => {
          event.preventDefault();
          select.value = optionButton.dataset.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          this.close(select);
        });
      });
    },
    refreshAll() {
      document.querySelectorAll("select").forEach((select) => this.refresh(select));
    },
    toggle(select) {
      const control = this.controlFor(select);
      if (!control) return;
      const menu = control.querySelector(".glass-select-menu");
      const open = !menu.hidden;
      this.closeAll();
      if (!open) {
        menu.hidden = false;
        control.classList.add("open");
        control.querySelector(".glass-select-button").setAttribute("aria-expanded", "true");
      }
    },
    close(select) {
      const control = this.controlFor(select);
      if (!control) return;
      control.classList.remove("open");
      control.querySelector(".glass-select-menu").hidden = true;
      control.querySelector(".glass-select-button").setAttribute("aria-expanded", "false");
    },
    closeAll() {
      document.querySelectorAll(".glass-select.open").forEach((control) => {
        control.classList.remove("open");
        control.querySelector(".glass-select-menu").hidden = true;
        control.querySelector(".glass-select-button").setAttribute("aria-expanded", "false");
      });
    }
  };

  const pageRouter = {
    goTo(page) {
      const next = document.querySelector(`.page-view[data-page="${page}"]`);
      const current = document.querySelector(".page-view.active");
      if (!next || next === current) return;
      state.page = page;
      if (current) {
        current.classList.remove("active");
        current.classList.add("is-exiting");
        window.setTimeout(() => {
          current.hidden = true;
          current.classList.remove("is-exiting");
        }, motionSystem.duration(designTokens.durationNormal));
      }
      next.hidden = false;
      animationUtilities.nextFrame(() => next.classList.add("active"));
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
      byId("viewStage").scrollTo({ top: 0, behavior: motionSystem.prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  const uxGuidance = {
    watchlistEmpty: "Your watchlist is empty. Add assets from Explore to track them here.",
    compareEmpty: "Select at least two assets to compare performance and key statistics."
  };

  const emptyStateManager = {
    render(message) {
      return emptyState(message);
    }
  };

  const apiClient = {
    baseUrl() {
      if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return "";
      return "http://localhost:4173";
    },
    url(path, params = {}) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") query.set(key, value);
      });
      return `${this.baseUrl()}${path}${query.toString() ? `?${query.toString()}` : ""}`;
    },
    async request(path, params = {}) {
      const response = await fetch(this.url(path, params), { cache: "no-store" });
      if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message || "Backend returned an error");
      return payload.data;
    },
    async post(path, body = {}) {
      const response = await fetch(`${this.baseUrl()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message || "Backend returned an error");
      return payload.data;
    },
    getHealth() { return this.request("/api/health"); },
    getCountries() { return this.request("/api/countries"); },
    getMarketOverview(country) { return this.request("/api/market-overview", { country }); },
    searchAssets(params) { return this.request("/api/search", params); },
    getQuote(params) { return this.request("/api/quote", params); },
    getHistory(params) { return this.request("/api/history", params); },
    getFundamentals(params) { return this.request("/api/fundamentals", params); },
    getBrokers(params) { return this.request("/api/brokers", params); },
    refreshWatchlist(items) { return this.post("/api/watchlist/refresh", { items }); },
    compareAssets(items, range) { return this.post("/api/compare", { items, range }); },
    getDiagnostics() { return this.request("/api/diagnostics"); },
    getNews(params) { return this.request("/api/news", params); },
    getAiInsight(payload) { return this.post("/api/ai-insight", payload); }
  };

  const state = {
    country: "US",
    type: "All",
    page: "home",
    search: "",
    selectedAssetId: "",
    selectedRange: "1M",
    loading: false,
    marketSwitching: false,
    errors: [],
    assets: [],
    quotes: {},
    histories: {},
    watchlist: {},
    compare: [],
    settings: {},
    notifications: {},
    charts: {},
    diagnostics: {
      mode: "Public source mode",
      activeProvider: "Public no-key sources",
      publicSourceStatus: "Ready",
      cacheStatus: "No cache used",
      lastSuccessfulFetch: "Not yet",
      failedAttempts: [],
      rateLimitWarnings: [],
      corsWarnings: [],
      suggestedFix: "Open the app normally. API keys are optional for deeper coverage.",
      activeRefresh: "Manual only"
    },
    searchTimer: 0,
    refreshTimer: 0,
    heroPreviewTimer: 0,
    refreshInFlight: false
  };

  const trustPolicy = {
    sourceWeights: {
      "Official exchange": 100,
      "Regulator": 95,
      "Licensed data provider": 85,
      "Established financial data API": 80,
      "News provider": 70,
      "Community source": 40,
      "Blog": 20,
      "Unavailable": 0
    }
  };

  const ipoSourceDirectory = [
    {
      name: "Ghana Stock Exchange",
      type: "Official exchange",
      url: "https://gse.com.gh",
      coverage: "Ghana listings and issuer notices",
      status: "Manual verification required"
    },
    {
      name: "SEC Ghana",
      type: "Regulator",
      url: "https://sec.gov.gh",
      coverage: "Regulatory notices and licensed market participants",
      status: "Manual verification required"
    },
    {
      name: "Nasdaq IPO Calendar",
      type: "Established financial data API",
      url: "https://www.nasdaq.com/market-activity/ipos",
      coverage: "US IPO calendar reference",
      status: "Source link only in this prototype"
    },
    {
      name: "London Stock Exchange",
      type: "Official exchange",
      url: "https://www.londonstockexchange.com",
      coverage: "UK admissions and issuer notices",
      status: "Source link only in this prototype"
    }
  ];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    state.settings = getSettings();
    state.country = state.settings.defaultCountry || "US";
    state.watchlist = watchlistService.getWatchlist();
    state.compare = readJson(STORAGE.compare, []);
    state.notifications = notificationService.getStatus();
    themeManager.apply(state.settings.theme || readJson(STORAGE.theme, "dark"));
    heroImageService.applyFromSettings(state.settings);
    renderGreeting();
    bindEvents();
    renderCountryOptions();
    renderSettingsOptions();
    renderAssetTypeTabs();
    glassSelectManager.enhanceAll();
    updateCountry(state.country, { silent: true });
    scheduleAutoRefresh();
    registerServiceWorker();
    checkLocalProxyStatus();
  }

  function bindEvents() {
    byId("countrySelect").addEventListener("change", (event) => updateCountry(event.target.value));
    byId("searchInput").addEventListener("input", (event) => {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(() => {
        state.search = event.target.value;
        renderAssetGrid();
        renderFeaturedAssets();
      }, 160);
    });
    byId("refreshButton").addEventListener("click", () => refreshMarketData({ force: true }));
    byId("refreshIpoButton").addEventListener("click", () => {
      renderIpoPage();
      renderTodayBrief();
      showToast("IPO verification status refreshed");
    });
    byId("themeToggle").addEventListener("click", () => themeManager.toggle());
    byId("settingsOpen").addEventListener("click", openSettings);
    byId("settingsClose").addEventListener("click", closeDrawers);
    byId("detailClose").addEventListener("click", closeDrawers);
    byId("modalBackdrop").addEventListener("click", closeDrawers);
    byId("watchlistJump").addEventListener("click", () => pageRouter.goTo("watchlist"));
    byId("exploreCta").addEventListener("click", () => pageRouter.goTo("explore"));
    byId("settingsPageOpen").addEventListener("click", openSettings);
    document.querySelectorAll("[data-page-action]").forEach((button) => {
      button.addEventListener("click", () => pageRouter.goTo(button.dataset.pageAction));
    });
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        pageRouter.goTo(button.dataset.page);
      });
    });
    byId("clearWatchlist").addEventListener("click", () => {
      state.watchlist = {};
      watchlistService.saveWatchlist(state.watchlist);
      renderWatchlist();
      showToast("Watchlist cleared");
    });
    byId("clearCompare").addEventListener("click", () => {
      compareService.clear();
      renderComparison();
      renderAssetGrid();
    });
    byId("settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveSettings();
    });
    byId("testApiButton").addEventListener("click", testApiConnection);
    byId("clearSettingsButton").addEventListener("click", clearSavedSettings);
    byId("clearCacheButton").addEventListener("click", clearCache);
    byId("requestNotificationPermission").addEventListener("click", requestNotificationPermission);
    byId("heroPreset").addEventListener("change", previewHeroFromControls);
    byId("heroImageUrl").addEventListener("input", () => {
      byId("heroPreset").value = "custom";
      window.clearTimeout(state.heroPreviewTimer);
      state.heroPreviewTimer = window.setTimeout(previewHeroFromControls, 240);
    });
    byId("heroImageFile").addEventListener("change", handleHeroImageUpload);
    byId("clearHeroImage").addEventListener("click", () => {
      heroImageService.reset();
      showToast("Hero image reset");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") glassSelectManager.closeAll();
      if (event.key === "Escape") closeDrawers();
      if (event.key === "Tab") trapDrawerFocus(event);
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".glass-select")) glassSelectManager.closeAll();
    });
  }

  function trapDrawerFocus(event) {
    const drawer = [byId("settingsDrawer"), byId("detailDrawer")].find((item) => !item.hidden);
    if (!drawer) return;
    const focusable = Array.from(drawer.querySelectorAll("button, input, select, a, textarea, [tabindex]:not([tabindex='-1'])"))
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateCountry(countryCode, options = {}) {
    const previousCountry = state.country;
    state.country = countryCode;
    byId("countrySelect").value = countryCode;
    glassSelectManager.refresh(byId("countrySelect"));
    const config = countryConfigService.getCountryConfig(countryCode);
    if (previousCountry !== countryCode) {
      state.marketSwitching = true;
      state.selectedAssetId = "";
      state.quotes = {};
      state.histories = {};
      state.compare = state.compare.filter((assetId) => isAssetInSelectedMarket(getAsset(assetId), countryCode));
      localStorage.setItem(STORAGE.compare, JSON.stringify(state.compare));
      state.diagnostics.cacheStatus = "Market changed; refreshing current region";
      state.diagnostics.suggestedFix = `${config.name} data is being refreshed. Previous market quotes are hidden until this market loads.`;
    }
    byId("marketRegionLabel").textContent = `${config.currency} · ${config.exchanges.join(", ")}`;
    byId("marketTitle").textContent = `${config.name} market view`;
    byId("marketNotes").textContent = config.notes;
    byId("marketTags").innerHTML = [
      tag(config.currency),
      tag(config.exchanges.join(" · ")),
      tag(`${config.defaultTickers.length} default assets`),
      tag(timezoneForCountry(countryCode)),
      tag("Availability may vary")
    ].join("");
    state.assets = marketDataService.assetsForCountry(countryCode);
    renderOverview();
    renderMarketHero();
    renderInsightCard();
    renderDiagnostics();
    renderTodayBrief();
    renderOpportunityPanel();
    renderMorningBrief();
    renderNotificationCenter();
    renderJournal();
    renderIpoPage();
    renderLearnPage();
    renderSourceExplorer();
    renderAssetGrid();
    renderWatchlist();
    renderComparison();
    renderFeaturedAssets();
    renderBrokerPage();
    renderAiPage();
    if (!options.silent) showToast(`${config.name} selected`);
    refreshMarketData();
  }

  async function refreshMarketData({ force = false } = {}) {
    if (state.refreshInFlight) return;
    state.refreshInFlight = true;
    state.loading = true;
    state.errors = [];
    renderStatus();
    renderAssetGrid();

    try {
      const visible = state.assets.slice(0, 18);
      await Promise.allSettled(visible.map((asset) => loadAssetData(asset, { force })));
    } finally {
      state.loading = false;
      state.marketSwitching = false;
      state.refreshInFlight = false;
      summarizeCoverage();
      renderStatus();
      renderMarketHero();
      renderInsightCard();
      renderDiagnostics();
      renderTodayBrief();
      renderOpportunityPanel();
      renderMorningBrief();
      renderNotificationCenter();
      renderJournal();
      renderIpoPage();
      renderLearnPage();
      renderSourceExplorer();
      renderOverview();
      renderAssetGrid();
      renderWatchlist();
      renderComparison();
      renderFeaturedAssets();
      renderBrokerPage();
      renderAiPage();
      if (state.selectedAssetId) renderDetail(state.selectedAssetId);
    }
  }

  async function loadAssetData(asset, { force = false } = {}) {
    try {
      const quote = await dataSourceManager.fetchQuote(asset, { force });
      state.quotes[asset.id] = quote;
      renderQuoteDependentViews();
      if (asset.stooqSymbol || asset.yahooSymbol || asset.coinGeckoId) {
        state.histories[asset.id] = await dataSourceManager.fetchHistory(asset, state.selectedRange, { force });
      }
    } catch (error) {
      state.errors.push(`${asset.ticker}: ${safeText(error.message)}`);
    }
  }

  function renderQuoteDependentViews() {
    summarizeCoverage();
    renderStatus();
    renderOverview();
    renderMarketHero();
    renderTodayBrief();
    renderOpportunityPanel();
    renderMorningBrief();
    renderNotificationCenter();
    renderJournal();
    renderIpoPage();
    renderSourceExplorer();
    renderAssetGrid();
    renderFeaturedAssets();
    renderWatchlist();
    renderComparison();
  }

  const countryConfigService = {
    getCountryConfig(countryCode) {
      return window.countryConfigs[countryCode] || window.countryConfigs.US;
    },
    getCountries() {
      return Object.entries(window.countryConfigs).map(([code, config]) => ({ code, ...config }));
    }
  };

  const dataSourceManager = {
    async fetchQuote(asset, options = {}) {
      resetDiagnosticsForRequest();
      const settings = getSettings();
      const provider = options.provider || settings.provider || "auto";
      const cached = cacheService.getQuote(asset.id);
      if (!options.localOnly) {
        try {
          const backendQuote = await apiClient.getQuote({ symbol: asset.ticker, provider });
          const normalizedBackendQuote = normalizeBackendQuote(asset, backendQuote);
          cacheService.saveQuote(asset.id, normalizedBackendQuote);
          diagnosticsService.recordSuccess(normalizedBackendQuote.source || "Backend API");
          return normalizedBackendQuote;
        } catch (error) {
          diagnosticsService.recordFailure("backend", error);
        }
      }
      if (!hasLiveQuoteSource(asset, settings, provider)) {
        const unavailable = unavailableQuote(asset, coverageMessage(asset));
        unavailable.source = coverageSource(asset);
        unavailable.sourceMode = "Official or licensed data required";
        unavailable.error = coverageMessage(asset);
        diagnosticsService.recordCoverageGap(asset);
        return unavailable;
      }
      const advancedOrder = provider === "auto" ? availableAdvancedProviders(settings) : [provider];
      const publicOrder = publicProvidersFor(asset);
      const order = [...advancedOrder, ...publicOrder].filter((item) => item && item !== "auto");

      state.diagnostics.mode = advancedOrder.length ? "Advanced provider mode" : "Public source mode";
      state.diagnostics.activeProvider = advancedOrder.length ? advancedOrder.map(providerLabel).join(", ") : "Public no-key sources";

      for (const source of order) {
        try {
          const quote = await this.fetchQuoteFromSource(asset, source, settings);
          const normalized = normalizeQuote({
            ...quote,
            asset,
            source: quote.source || providerLabel(source)
          });
          normalized.sourceMode = publicOrder.includes(source) ? "Public source mode" : "Advanced provider mode";
          cacheService.saveQuote(asset.id, normalized);
          diagnosticsService.recordSuccess(normalized.source);
          return normalized;
        } catch (error) {
          diagnosticsService.recordFailure(source, error);
        }
      }

      if (cached && !options.force) {
        diagnosticsService.recordCacheUse(cached);
        return { ...cached, sourceMode: "Cached data", message: `Using cached data from ${formatTime(cached.cachedAt)}.` };
      }

      const unavailable = unavailableQuote(asset, "Live data is unavailable for this asset right now. Add an API key in Advanced Settings for deeper coverage, or try another asset.");
      diagnosticsService.recordUnavailable();
      return unavailable;
    },

    async fetchQuoteFromSource(asset, source, settings) {
      if (source === "stooq") return publicMarketDataService.fetchStooqQuote(asset);
      if (source === "yahoo") return publicMarketDataService.fetchYahooQuote(asset);
      if (source === "coingecko") return publicMarketDataService.fetchCryptoPrice(asset);
      if (source === "alphavantage") return advancedApiService.fetchAlphaVantageQuote(asset, settings.alphaKey);
      if (source === "finnhub") return advancedApiService.fetchFinnhubQuote(asset, settings.finnhubKey);
      if (source === "fmp") return advancedApiService.fetchFmpQuote(asset, settings.fmpKey);
      if (source === "twelvedata") return advancedApiService.fetchTwelveDataQuote(asset, settings.twelveKey);
      if (source === "polygon") throw new Error("Polygon.io quote support is configured for a production proxy in this prototype");
      throw new Error("Provider unavailable");
    },

    async fetchHistory(asset, range, options = {}) {
      const key = `${asset.id}:${range}`;
      const cached = cacheService.getHistory(key);
      if (!options.localOnly) {
        try {
          const backendHistory = await apiClient.getHistory({ symbol: asset.ticker, range, refresh: options.force ? "true" : "" });
          const points = normalizeBackendHistory(backendHistory);
          if (points.length) {
            cacheService.saveHistory(key, points);
            return points;
          }
        } catch (error) {
          diagnosticsService.recordFailure("backend history", error);
        }
      }
      try {
        const points = await publicMarketDataService.fetchHistory(asset, range);
        if (points.length) {
          cacheService.saveHistory(key, points);
          return points;
        }
      } catch (error) {
        diagnosticsService.recordFailure("history", error);
      }
      if (cached && !options.force) {
        state.diagnostics.cacheStatus = `Using cached history from ${formatTime(cacheService.getHistoryTimestamp(key))}`;
        return cached;
      }
      return [];
    }
  };

  const marketDataService = {
    assetsForCountry(countryCode) {
      const config = countryConfigService.getCountryConfig(countryCode);
      const defaults = new Set(config.defaultTickers.map((ticker) => ticker.toUpperCase()));
      const local = window.assetCatalog.filter((asset) => asset.country === countryCode);
      const suggested = window.assetCatalog.filter((asset) => defaults.has(asset.ticker.toUpperCase()));
      const global = window.assetCatalog.filter((asset) => asset.country === "GLOBAL");
      return uniqueBy([...local, ...suggested, ...global], "id");
    },

    async fetchQuote(asset, options = {}) {
      const cached = cacheService.getQuote(asset.id);
      if (!options.force && cached) return cached;

      const settings = getSettings();
      const provider = settings.provider || "auto";
      const order = provider === "auto" ? ["public", "alphavantage", "finnhub", "fmp", "twelvedata"] : [provider, "public"];
      let lastError = null;

      for (const item of order) {
        try {
          let quote = null;
          if (item === "public") quote = asset.type === "Crypto" ? await cryptoDataService.fetchCryptoPrice(asset) : await fetchStooqQuote(asset);
          if (item === "stooq") quote = await fetchStooqQuote(asset);
          if (item === "coingecko") quote = await cryptoDataService.fetchCryptoPrice(asset);
          if (item === "alphavantage") quote = await fetchAlphaVantageQuote(asset, settings.alphaKey);
          if (item === "finnhub") quote = await fetchFinnhubQuote(asset, settings.finnhubKey);
          if (item === "fmp") quote = await fetchFmpQuote(asset, settings.fmpKey);
          if (item === "twelvedata") quote = await fetchTwelveDataQuote(asset, settings.twelveKey);
          if (quote) {
            cacheService.saveQuote(asset.id, quote);
            return quote;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (cached) return cached;
      return unavailableQuote(asset, lastError?.message || "Data unavailable from the selected provider. Add an API key in Settings or try another provider.");
    },

    async fetchHistoricalPrices(asset, range, options = {}) {
      const key = `${asset.id}:${range}`;
      const cached = cacheService.getHistory(key);
      if (!options.force && cached) return cached;

      let history = [];
      if (asset.type === "Crypto") {
        history = await cryptoDataService.fetchCryptoHistory(asset, range);
      } else if (asset.stooqSymbol) {
        history = await fetchStooqHistory(asset, range);
      }

      if (history.length) {
        cacheService.saveHistory(key, history);
        return history;
      }
      return cached || [];
    }
  };

  const cryptoDataService = {
    async fetchCryptoPrice(asset) {
      if (!asset.coinGeckoId) throw new Error("CoinGecko asset id unavailable");
      const currency = countryConfigService.getCountryConfig(state.country).currency.toLowerCase();
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset.coinGeckoId)}&vs_currencies=${encodeURIComponent(currency)}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
      const data = await fetchJson(url);
      const record = data[asset.coinGeckoId]?.[currency] ? data[asset.coinGeckoId] : data[asset.coinGeckoId]?.usd ? data[asset.coinGeckoId] : null;
      if (!record) throw new Error("CoinGecko returned no quote");
      const quoteCurrency = record[currency] ? currency.toUpperCase() : "USD";
      return normalizeQuote({
        asset,
        price: record[currency] || record.usd,
        changePercent: record[`${currency}_24h_change`] || record.usd_24h_change,
        marketCap: record[`${currency}_market_cap`] || record.usd_market_cap,
        volume: record[`${currency}_24h_vol`] || record.usd_24h_vol,
        currency: quoteCurrency,
        source: "CoinGecko public API"
      });
    },

    async fetchCryptoHistory(asset, range) {
      if (!asset.coinGeckoId) return [];
      const currency = countryConfigService.getCountryConfig(state.country).currency.toLowerCase();
      const days = rangeToDays(range);
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset.coinGeckoId)}/market_chart?vs_currency=${encodeURIComponent(currency)}&days=${days}`;
      const data = await fetchJson(url);
      return (data.prices || []).map(([time, price]) => ({ date: new Date(time).toISOString().slice(0, 10), close: Number(price) })).filter((point) => Number.isFinite(point.close));
    }
  };

  const publicMarketDataService = {
    fetchCryptoPrice(asset) {
      return cryptoDataService.fetchCryptoPrice(asset);
    },
    fetchCryptoHistory(asset, range) {
      return cryptoDataService.fetchCryptoHistory(asset, range);
    },
    fetchStooqQuote,
    fetchStooqHistory,
    fetchYahooQuote,
    fetchYahooHistory,
    async fetchHistory(asset, range) {
      if (asset.type === "Crypto") return this.fetchCryptoHistory(asset, range);
      if (asset.stooqSymbol) {
        const stooqPoints = await this.fetchStooqHistory(asset, range);
        if (stooqPoints.length) return stooqPoints;
      }
      if (asset.yahooSymbol || asset.ticker) return this.fetchYahooHistory(asset, range);
      return [];
    }
  };

  const advancedApiService = {
    fetchAlphaVantageQuote,
    fetchFinnhubQuote,
    fetchFmpQuote,
    fetchTwelveDataQuote
    /*
      Production backend proxy recommendation:
      The frontend should call normalized backend routes instead of provider URLs:
      /api/quote, /api/history, /api/search, /api/fundamentals, /api/news, /api/ai-insight.
      The proxy should hide API keys, validate user input, sanitize requests, handle CORS,
      cache provider responses, rate-limit requests, prevent abuse, normalize JSON, and log
      provider errors safely without exposing private tokens to the browser.
    */
  };

  const diagnosticsService = {
    recordSuccess(source) {
      state.diagnostics.publicSourceStatus = /Stooq|CoinGecko|public/i.test(source) ? "Public source reachable" : "Advanced provider connected";
      state.diagnostics.cacheStatus = "Fresh online response";
      state.diagnostics.lastSuccessfulFetch = new Date().toLocaleString();
      state.diagnostics.suggestedFix = "No action needed. Data source returned a usable response.";
    },
    recordFailure(source, error) {
      const message = normalizeProviderError(error);
      const entry = `${providerLabel(source)}: ${message}`;
      state.diagnostics.failedAttempts = [...state.diagnostics.failedAttempts, entry].slice(-6);
      if (/rate|limit|429/i.test(message)) state.diagnostics.rateLimitWarnings = [...state.diagnostics.rateLimitWarnings, entry].slice(-3);
      if (/cors|failed to fetch|network/i.test(message)) state.diagnostics.corsWarnings = [...state.diagnostics.corsWarnings, entry].slice(-3);
      state.diagnostics.publicSourceStatus = "Some sources unavailable";
      state.diagnostics.suggestedFix = /cors|failed to fetch|network/i.test(message)
        ? "This public data source could not be reached directly from the browser. For production, route this request through a secure backend proxy."
        : "Try another asset, retry later, or add an optional advanced API key in Advanced Settings.";
    },
    recordCacheUse(cached) {
      state.diagnostics.cacheStatus = `Using cached data from ${formatTime(cached.cachedAt)}.`;
      state.diagnostics.suggestedFix = "Cached data is being used because live sources are unavailable or were skipped.";
    },
    recordUnavailable() {
      state.diagnostics.cacheStatus = "No usable cache";
      state.diagnostics.publicSourceStatus = "Data unavailable";
      state.diagnostics.suggestedFix = "Add an API key in Advanced Settings for deeper coverage, retry later, or try another asset.";
    },
    recordCoverageGap(asset) {
      state.diagnostics.cacheStatus = "No public endpoint configured";
      state.diagnostics.publicSourceStatus = "Official feed required";
      state.diagnostics.suggestedFix = `${asset.ticker} needs an official exchange feed, licensed data provider, or custom backend connector. It is not refreshed by public no-key APIs.`;
    }
  };

  const compareService = {
    add(assetId) {
      state.compare = state.compare.includes(assetId) ? state.compare : [...state.compare, assetId].slice(-4);
      localStorage.setItem(STORAGE.compare, JSON.stringify(state.compare));
    },
    remove(assetId) {
      state.compare = state.compare.filter((id) => id !== assetId);
      localStorage.setItem(STORAGE.compare, JSON.stringify(state.compare));
    },
    clear() {
      state.compare = [];
      localStorage.setItem(STORAGE.compare, JSON.stringify(state.compare));
    }
  };

  const brokerDirectoryService = {
    getBrokerOptions(countryCode, assetType) {
      const config = countryConfigService.getCountryConfig(countryCode);
      return config.brokers.filter((broker) => broker.assetTypes.some((type) => assetTypeMatches(type, assetType)));
    }
  };

  const watchlistService = {
    getWatchlist() {
      return readJson(STORAGE.watchlist, {});
    },
    saveWatchlist(watchlist) {
      localStorage.setItem(STORAGE.watchlist, JSON.stringify(watchlist));
    },
    saveWatchlistItem(asset, extra = {}) {
      state.watchlist[asset.id] = {
        assetId: asset.id,
        units: Number(extra.units ?? state.watchlist[asset.id]?.units ?? 0),
        averagePrice: Number(extra.averagePrice ?? state.watchlist[asset.id]?.averagePrice ?? 0)
      };
      this.saveWatchlist(state.watchlist);
    },
    removeWatchlistItem(assetId) {
      delete state.watchlist[assetId];
      this.saveWatchlist(state.watchlist);
    }
  };

  const huggingFaceService = {
    async fetchInsight(asset, quote, settings) {
      const model = safeText(settings.hfModel || DEFAULT_HF_MODEL);
      const response = await fetch(HUGGING_FACE_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 320,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You create concise educational market research summaries. Do not provide financial advice, price targets, or buy/sell recommendations. Return only compact JSON."
            },
            {
              role: "user",
              content: JSON.stringify({
                instruction: "Analyze this instrument using only the supplied fields. If data is missing, say so. Return JSON with summary, sentimentScore, riskFactors, bullishFactors, bearishFactors, dataQuality.",
                asset: {
                  ticker: asset.ticker,
                  name: asset.name,
                  type: asset.type,
                  exchange: asset.exchange,
                  country: asset.country,
                  sector: asset.sector,
                  risk: asset.risk,
                  currency: asset.currency
                },
                quote: {
                  price: quote?.price ?? null,
                  change: quote?.change ?? null,
                  changePercent: quote?.changePercent ?? null,
                  volume: quote?.volume ?? null,
                  source: quote?.source ?? null,
                  status: quote?.status ?? null
                }
              })
            }
          ]
        })
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(huggingFaceErrorMessage(response.status, detail));
      }

      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content || "";
      return normalizeAiInsight(parseModelJson(text), text, model);
    },
    async testConnection(settings) {
      const model = safeText(settings.hfModel || DEFAULT_HF_MODEL);
      const response = await fetch(HUGGING_FACE_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 24,
          temperature: 0,
          messages: [{ role: "user", content: "Reply with only: connected" }]
        })
      });
      if (!response.ok) throw new Error(huggingFaceErrorMessage(response.status, await response.text().catch(() => "")));
      return response.json();
    }
  };

  const aiInsightService = {
    async fetchAiInsight(asset) {
      const settings = getSettings();
      if (!settings.hfToken) {
        return {
          available: false,
          message: "AI insight is disabled. Add a Hugging Face token in Advanced Settings to enable this feature."
        };
      }
      try {
        const quote = state.quotes[asset.id] || unavailableQuote(asset, "Quote not loaded yet.");
        return await huggingFaceService.fetchInsight(asset, quote, settings);
      } catch (error) {
        const failedFetch = /failed to fetch|networkerror|load failed/i.test(error?.message || "");
        return {
          available: false,
          message: failedFetch
            ? "Hugging Face could not be reached from this browser. If the token and model are correct, use a secure backend proxy for the API call."
            : error?.message || "Hugging Face AI insight could not be generated right now."
        };
      }
    }
  };

  const trustService = {
    governanceForAsset(asset, quote = null) {
      const sourceName = quote?.source || coverageSource(asset);
      const fetchedAt = quote?.lastUpdated || quote?.asOf || quote?.cachedAt || null;
      const confidenceScore = confidenceScoreFor(asset, quote, sourceName);
      const reliabilityScore = reliabilityScoreFor(asset, quote, sourceName);
      return {
        sourceName,
        sourceType: sourceTypeFor(sourceName, asset),
        sourceUrl: sourceUrlFor(asset, sourceName),
        sourceMode: quote?.sourceMode || sourceModeFor(asset, quote),
        fetchedAt,
        lastVerifiedAt: fetchedAt,
        confidenceScore,
        reliabilityScore,
        dataStatus: dataStatusFor(asset, quote),
        freshness: freshnessFor(fetchedAt),
        conflictDetected: false,
        missingFields: missingFieldsFor(asset, quote),
        conflictingFields: [],
        verificationNotes: verificationNotesFor(asset, quote)
      };
    },
    availabilityFor(asset, countryCode = state.country) {
      const config = countryConfigService.getCountryConfig(countryCode);
      const local = asset.country === countryCode;
      const global = asset.country === "GLOBAL";
      const brokerOptions = brokerDirectoryService.getBrokerOptions(countryCode, asset.type);
      const requiresOfficial = !hasPublicSource(asset);
      return {
        country: config.name,
        accessAvailable: local || global || Boolean(brokerOptions.length),
        brokerRequired: true,
        requiredCurrency: asset.currency || config.currency,
        minimumInvestment: "Not verified",
        verificationStatus: requiresOfficial ? "Needs official verification" : "Source-backed, broker eligibility still varies",
        availabilityStatus: local ? "Local market" : global ? "Global asset" : brokerOptions.length ? "Potential international access" : "Unknown",
        reason: brokerOptions.length ? "Example platforms exist, but eligibility, fees, and regulation must be checked directly." : "No broker directory match is configured for this market."
      };
    },
    marketSignalFor(asset, quote = null) {
      const percent = finiteOrNull(quote?.changePercent);
      if (percent === null) return { label: "Neutral Signal", quality: "Low", reason: "Daily percent change is unavailable from the current source." };
      if (percent > 1) return { label: "Positive Signal", quality: "Medium", reason: "Current source reports a positive daily move above 1%." };
      if (percent < -1) return { label: "Negative Signal", quality: "Medium", reason: "Current source reports a negative daily move below -1%." };
      return { label: "Flat Trend", quality: "Medium", reason: "Current source reports limited daily movement." };
    },
    scenarioFor(asset, quote = null) {
      const governance = this.governanceForAsset(asset, quote);
      return {
        bullish: "Price and accessibility data remain available, with improving source confidence.",
        neutral: "Asset remains watchable, but missing fields limit interpretation.",
        bearish: "Provider outages, stale data, or access restrictions reduce watch priority.",
        drivers: ["Source freshness", "Broker eligibility", "Currency exposure", "Liquidity and volatility"],
        confidenceLevel: governance.confidenceScore >= 80 ? "Medium" : "Low",
        forecastQuality: governance.missingFields.length > 3 ? "Low Quality" : "Medium Quality"
      };
    }
  };

  const ipoIntelligenceService = {
    getSummary() {
      const verifiedOpen = [];
      return {
        openIpos: verifiedOpen,
        closingSoon: [],
        accessibleFromGhana: [],
        confidenceIssues: ["No live IPO aggregation provider is connected in this prototype."],
        verificationIssues: ["IPO dates, pricing ranges, and eligibility must be verified from official exchange or regulator sources before display."],
        sourceDirectory: ipoSourceDirectory,
        mode: "Source directory mode",
        status: "No verified IPO feed connected"
      };
    },
    journalEntry() {
      const summary = this.getSummary();
      return {
        date: new Date().toISOString(),
        newOpportunities: summary.openIpos.length,
        changedOpportunities: 0,
        confidenceChanges: 0,
        signalChanges: 0,
        verificationIssues: summary.verificationIssues.length,
        dataSourceChanges: summary.sourceDirectory.length,
        note: "IPO monitor is waiting for a verified official or licensed IPO feed."
      };
    }
  };

  const opportunityRankingService = {
    rankAssets(assets = state.assets) {
      return assets
        .map((asset) => this.scoreAsset(asset))
        .sort((left, right) => right.opportunityScore - left.opportunityScore);
    },
    scoreAsset(asset) {
      const quote = state.quotes[asset.id] || null;
      const governance = trustService.governanceForAsset(asset, quote);
      const availability = trustService.availabilityFor(asset, "GH");
      const signal = trustService.marketSignalFor(asset, quote);
      const scenario = trustService.scenarioFor(asset, quote);
      const confidenceScore = governance.confidenceScore;
      const reliabilityScore = governance.reliabilityScore;
      const forecastQualityScore = forecastQualityScoreFor(scenario);
      const riskScore = riskScoreFor(asset);
      const availabilityScore = availabilityScoreFor(asset, availability);
      const freshnessScore = freshnessScoreForGovernance(governance);
      const liquidityScore = liquidityScoreFor(asset, quote);
      const marketSignalScore = marketSignalScoreFor(signal, quote);
      const urgencyScore = urgencyScoreFor(asset);
      const currencyScore = currencyExposureScoreFor(asset);
      const preference = preferenceBoostFor(asset, { availabilityScore, riskScore, marketSignalScore, quote });
      const opportunityScore = clampScore(
        confidenceScore * 0.17 +
        reliabilityScore * 0.15 +
        forecastQualityScore * 0.12 +
        riskScore * 0.12 +
        availabilityScore * 0.15 +
        freshnessScore * 0.1 +
        liquidityScore * 0.07 +
        marketSignalScore * 0.08 +
        urgencyScore * 0.04 +
        currencyScore * 0.04 +
        preference.points
      );
      return {
        asset,
        quote,
        governance,
        availability,
        signal,
        scenario,
        opportunityScore,
        confidenceScore,
        reliabilityScore,
        forecastQualityScore,
        riskScore,
        availabilityScore,
        liquidityScore,
        freshnessScore,
        marketSignalScore,
        urgencyScore,
        currencyScore,
        watchPriority: watchPriorityFor(opportunityScore),
        preferenceExplanation: preference.reason,
        limitations: this.limitationsFor(asset, quote, governance, availability),
        inputs: [
          `Accessibility ${availabilityScore}%`,
          `Ghana availability: ${availability.availabilityStatus}`,
          `Confidence ${confidenceScore}%`,
          `Reliability ${reliabilityScore}%`,
          `Freshness: ${governance.freshness.label}`,
          `Liquidity ${liquidityScore}%`,
          `Risk score ${riskScore}%`,
          `Currency exposure: ${asset.currency || "Unknown"}`
        ]
      };
    },
    limitationsFor(asset, quote, governance, availability) {
      const limitations = [];
      if (!quote || finiteOrNull(quote.price) === null) limitations.push("Current price is unavailable from the connected source.");
      if (governance.missingFields.length) limitations.push(`Missing fields: ${governance.missingFields.slice(0, 4).join(", ")}.`);
      if (!hasPublicSource(asset)) limitations.push("Requires an official exchange feed or licensed provider for live data.");
      if (!availability.accessAvailable) limitations.push("Ghana access is not confirmed by the broker directory.");
      limitations.push("Ranking is for monitoring priority only, not a buy, sell, hold, or guaranteed return recommendation.");
      return limitations;
    },
    topCards(rankings) {
      const byConfidence = [...rankings].sort((left, right) => right.confidenceScore - left.confidenceScore);
      const byAccess = [...rankings].sort((left, right) => right.availabilityScore - left.availabilityScore);
      const bySignal = [...rankings].sort((left, right) => right.marketSignalScore - left.marketSignalScore);
      const byTrending = [...rankings].sort((left, right) => (right.marketSignalScore + right.freshnessScore) - (left.marketSignalScore + left.freshnessScore));
      return [
        { label: "Top Opportunity", item: rankings[0], note: "Highest blended monitoring score." },
        { label: "Highest Confidence Opportunity", item: byConfidence[0], note: "Strongest current confidence layer." },
        { label: "Most Accessible Opportunity", item: byAccess[0], note: "Best access and Ghana availability score." },
        { label: "Most Urgent IPO", ipo: true, note: ipoIntelligenceService.getSummary().status },
        { label: "Highest Watch Priority Opportunity", item: rankings[0], note: "Highest priority after your preference weighting." },
        { label: "Trending Opportunity", item: byTrending[0], note: "Strongest mix of freshness and signal." },
        { label: "Strongest Positive Signal", item: bySignal[0], note: "Highest detected market signal score." }
      ];
    },
    morningBrief(rankings) {
      const ipo = ipoIntelligenceService.getSummary();
      const top = rankings.slice(0, 3);
      const verificationAlerts = rankings.filter((item) => item.governance.dataStatus !== "Live data loaded").slice(0, 3);
      const changed = rankings.filter((item) => item.signal.label !== "Neutral Signal").slice(0, 3);
      return {
        openIpos: ipo.openIpos.length ? `${ipo.openIpos.length} verified open` : "No verified IPO feed connected",
        closingSoon: ipo.closingSoon.length ? `${ipo.closingSoon.length} closing soon` : "No verified closing windows",
        newOpportunities: top.map((item) => item.asset.ticker).join(", ") || "Waiting for market data",
        changedOpportunities: changed.map((item) => `${item.asset.ticker}: ${item.signal.label}`).join("; ") || "No confirmed signal changes",
        highestConfidence: [...rankings].sort((left, right) => right.confidenceScore - left.confidenceScore).slice(0, 3).map((item) => item.asset.ticker).join(", "),
        mostAccessible: [...rankings].sort((left, right) => right.availabilityScore - left.availabilityScore).slice(0, 3).map((item) => item.asset.ticker).join(", "),
        verificationAlerts: verificationAlerts.length ? verificationAlerts.map((item) => `${item.asset.ticker}: ${item.governance.dataStatus}`).join("; ") : "No critical verification alerts",
        conflictAlerts: "No source conflicts detected",
        signalChanges: changed.length ? changed.map((item) => `${item.asset.ticker} ${item.signal.label}`).join(", ") : "No confirmed changes",
        currencyExposure: currencyExposureSummary(rankings),
        riskNote: riskNoteFor(rankings),
        topWatchPriority: top.map((item) => `${item.asset.ticker} ${item.watchPriority}`).join(", ") || "No ranked assets yet"
      };
    }
  };

  const notificationService = {
    categories: [
      "Morning Brief",
      "IPO Opening Soon",
      "IPO Closing Soon",
      "Listing Day Approaching",
      "Confidence Increased",
      "Confidence Dropped",
      "Market Signal Changed",
      "Watch Priority Increased",
      "New Opportunity Detected",
      "Verification Required",
      "Data Refresh Recommended"
    ],
    getStatus() {
      const stored = readJson(STORAGE.notifications, {});
      return {
        lastNotificationSent: "Never",
        morningBriefStatus: "Not scheduled until notifications are enabled and permission is granted",
        providerStatus: this.providerStatus(),
        permissionStatus: this.permissionStatus(),
        ...stored
      };
    },
    permissionStatus() {
      if (!("Notification" in window)) return "Unsupported";
      return Notification.permission === "default" ? "Not requested" : sentenceCase(Notification.permission);
    },
    providerStatus() {
      if (!("Notification" in window)) return "Browser notifications unavailable";
      if (!("serviceWorker" in navigator)) return "Browser notifications available; service worker unavailable";
      return "Browser notifications available; static app shell registration in progress";
    },
    save(update) {
      const next = { ...this.getStatus(), ...update, permissionStatus: this.permissionStatus(), providerStatus: this.providerStatus() };
      localStorage.setItem(STORAGE.notifications, JSON.stringify(next));
      state.notifications = next;
      return next;
    },
    async requestPermission() {
      if (!("Notification" in window)) {
        return this.save({ permissionStatus: "Unsupported", providerStatus: "Browser notifications unavailable" });
      }
      const permission = await Notification.requestPermission();
      const enabled = getSettings().enableNotifications && permission === "granted";
      return this.save({
        permissionStatus: sentenceCase(permission),
        morningBriefStatus: enabled ? "Ready to schedule; no notification has been sent yet" : "Permission recorded; notifications remain opt-in"
      });
    }
  };

  const heroImageService = {
    imageFromSettings(settings = getSettings()) {
      if (settings.heroPreset === "custom" && settings.heroImageUrl) return settings.heroImageUrl;
      return HERO_PRESETS[settings.heroPreset] || HERO_PRESETS.cover;
    },
    applyFromSettings(settings = getSettings()) {
      const image = this.imageFromSettings(settings);
      this.applyImage(image);
      if (settings.heroAccent) this.applyAccent(settings.heroAccent);
      this.sampleAccent(image).then((accent) => {
        if (!accent) return;
        this.applyAccent(accent);
        const next = { ...getSettings(), heroAccent: accent };
        localStorage.setItem(STORAGE.settings, JSON.stringify(next));
        state.settings = next;
      }).catch(() => {});
    },
    applyImage(image) {
      const safe = safeHeroImageUrl(image);
      document.documentElement.style.setProperty("--hero-image", `url("${safe.replace(/"/g, "%22")}")`);
      const preview = byIdOptional("heroPreview");
      if (preview) preview.style.backgroundImage = `url("${safe.replace(/"/g, "%22")}")`;
    },
    applyAccent(accent) {
      document.documentElement.style.setProperty("--accent", accent.primary);
      document.documentElement.style.setProperty("--accent-strong", accent.strong);
      document.documentElement.style.setProperty("--accent-soft", accent.soft);
      document.documentElement.style.setProperty("--accent-ink", accent.ink);
    },
    sampleAccent(src) {
      return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const size = 32;
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, size, size);
            const data = context.getImageData(0, 0, size, size).data;
            const color = dominantColorFromPixels(data);
            resolve(color ? accentSetFromRgb(color) : null);
          } catch {
            resolve(null);
          }
        };
        image.onerror = () => resolve(null);
        image.src = safeHeroImageUrl(src);
      });
    },
    reset() {
      const settings = { ...getSettings(), heroPreset: "cover", heroImageUrl: "", heroAccent: null };
      localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
      state.settings = settings;
      this.applyFromSettings(settings);
      renderSettingsOptions();
    }
  };

  const cacheService = {
    getQuote(assetId) {
      const cache = readJson(STORAGE.quotes, {});
      const record = cache[assetId];
      if (!record) return null;
      if (record.cacheVersion !== QUOTE_CACHE_VERSION) return null;
      if (Date.now() - record.cachedAt > cacheDurationMs()) return null;
      return record;
    },
    saveQuote(assetId, quote) {
      const cache = readJson(STORAGE.quotes, {});
      const timestamp = Date.now();
      cache[assetId] = {
        ...quote,
        cachedAt: timestamp,
        timestamp,
        expiry: timestamp + cacheDurationMs(),
        cacheValueType: "quote",
        cacheVersion: QUOTE_CACHE_VERSION,
        cacheSource: quote.source
      };
      localStorage.setItem(STORAGE.quotes, JSON.stringify(cache));
    },
    getHistory(key) {
      const cache = readJson(STORAGE.history, {});
      const record = cache[key];
      if (!record) return null;
      if (Date.now() - record.cachedAt > Math.max(cacheDurationMs(), 60 * 60 * 1000)) return null;
      return record.points || [];
    },
    getHistoryTimestamp(key) {
      return readJson(STORAGE.history, {})[key]?.cachedAt || null;
    },
    saveHistory(key, points) {
      const cache = readJson(STORAGE.history, {});
      const timestamp = Date.now();
      cache[key] = {
        points,
        source: "Public historical source",
        timestamp,
        cachedAt: timestamp,
        expiry: timestamp + Math.max(cacheDurationMs(), 60 * 60 * 1000),
        cacheValueType: "history"
      };
      localStorage.setItem(STORAGE.history, JSON.stringify(cache));
    }
  };

  async function fetchStooqQuote(asset) {
    if (!asset.stooqSymbol) throw new Error("Public quote endpoint unavailable for this asset");
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(asset.stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
    const text = await fetchText(url);
    const rows = csvToObjects(text);
    const row = rows[0] || {};
    if (!row.Close || row.Close === "N/D") throw new Error("Stooq returned no quote");
    const close = Number(row.Close);
    const open = Number(row.Open);
    return normalizeQuote({
      asset,
      price: close,
      open,
      previousClose: null,
      dayHigh: Number(row.High),
      dayLow: Number(row.Low),
      volume: Number(row.Volume),
      currency: asset.currency,
      source: "Stooq public CSV",
      asOf: `${row.Date || ""} ${row.Time || ""}`.trim()
    });
  }

  async function fetchStooqHistory(asset, range) {
    if (!asset.stooqSymbol) return [];
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(asset.stooqSymbol)}&i=d`;
    const text = await fetchText(url);
    const rows = csvToObjects(text);
    const cutoff = cutoffForRange(range);
    return rows
      .map((row) => ({ date: row.Date, close: Number(row.Close), volume: Number(row.Volume), open: Number(row.Open), high: Number(row.High), low: Number(row.Low) }))
      .filter((point) => point.date && Number.isFinite(point.close) && (!cutoff || Date.parse(point.date) >= cutoff))
      .slice(-600);
  }

  async function fetchYahooQuote(asset) {
    if (!asset.yahooSymbol) throw new Error("Yahoo chart endpoint unavailable for this asset");
    const url = yahooChartUrl(asset.yahooSymbol, "5d", "1d");
    const data = await fetchJson(url);
    const result = data.chart?.result?.[0];
    if (!result?.meta?.regularMarketPrice) throw new Error("Yahoo returned no quote");
    const quote = result.indicators?.quote?.[0] || {};
    const closes = quote.close?.filter((value) => Number.isFinite(Number(value))) || [];
    const previousClose = finiteOrNull(result.meta.chartPreviousClose) ?? closes[closes.length - 2] ?? null;
    const normalizedPrice = normalizeYahooPrice(result.meta.regularMarketPrice, result.meta.currency, asset.currency);
    const normalizedPrevious = normalizeYahooPrice(previousClose, result.meta.currency, asset.currency);
    return normalizeQuote({
      asset,
      price: normalizedPrice,
      open: normalizeYahooPrice(lastFinite(quote.open), result.meta.currency, asset.currency),
      previousClose: normalizedPrevious,
      dayHigh: normalizeYahooPrice(lastFinite(quote.high), result.meta.currency, asset.currency),
      dayLow: normalizeYahooPrice(lastFinite(quote.low), result.meta.currency, asset.currency),
      volume: lastFinite(quote.volume),
      currency: asset.currency,
      source: "Yahoo chart public endpoint",
      asOf: result.meta.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
    });
  }

  async function fetchYahooHistory(asset, range) {
    const symbol = asset.yahooSymbol || asset.ticker;
    if (!symbol) return [];
    const url = yahooChartUrl(symbol, yahooRangeFor(range), yahooIntervalFor(range));
    const data = await fetchJson(url);
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    const currency = result?.meta?.currency || asset.currency;
    const cutoff = cutoffForRange(range);
    return timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: normalizeYahooPrice(quote.close?.[index], currency, asset.currency),
      volume: quote.volume?.[index],
      open: normalizeYahooPrice(quote.open?.[index], currency, asset.currency),
      high: normalizeYahooPrice(quote.high?.[index], currency, asset.currency),
      low: normalizeYahooPrice(quote.low?.[index], currency, asset.currency)
    }))
      .filter((point) => point.date && Number.isFinite(point.close) && (!cutoff || Date.parse(point.date) >= cutoff))
      .slice(-600);
  }

  async function fetchAlphaVantageQuote(asset, key) {
    if (!key) throw new Error("Alpha Vantage API key missing");
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(asset.ticker)}&apikey=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    if (data.Note || data.Information) throw new Error("Alpha Vantage limit or unavailable response");
    const quote = data["Global Quote"] || {};
    if (!quote["05. price"]) throw new Error("Alpha Vantage returned no quote");
    return normalizeQuote({
      asset,
      price: Number(quote["05. price"]),
      previousClose: Number(quote["08. previous close"]),
      change: Number(quote["09. change"]),
      changePercent: parsePercent(quote["10. change percent"]),
      volume: Number(quote["06. volume"]),
      currency: asset.currency,
      source: "Alpha Vantage"
    });
  }

  async function fetchFinnhubQuote(asset, key) {
    if (!key) throw new Error("Finnhub API key missing");
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(asset.ticker)}&token=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    if (!data.c) throw new Error("Finnhub returned no quote");
    return normalizeQuote({
      asset,
      price: Number(data.c),
      open: Number(data.o),
      previousClose: Number(data.pc),
      dayHigh: Number(data.h),
      dayLow: Number(data.l),
      change: Number(data.d),
      changePercent: Number(data.dp),
      currency: asset.currency,
      source: "Finnhub"
    });
  }

  async function fetchFmpQuote(asset, key) {
    if (!key) throw new Error("Financial Modeling Prep API key missing");
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(asset.ticker)}?apikey=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.price) throw new Error("FMP returned no quote");
    return normalizeQuote({
      asset,
      price: Number(row.price),
      open: Number(row.open),
      previousClose: Number(row.previousClose),
      dayHigh: Number(row.dayHigh),
      dayLow: Number(row.dayLow),
      yearHigh: Number(row.yearHigh),
      yearLow: Number(row.yearLow),
      marketCap: Number(row.marketCap),
      volume: Number(row.volume),
      avgVolume: Number(row.avgVolume),
      peRatio: Number(row.pe),
      change: Number(row.change),
      changePercent: Number(row.changesPercentage),
      currency: asset.currency,
      source: "Financial Modeling Prep"
    });
  }

  async function fetchTwelveDataQuote(asset, key) {
    if (!key) throw new Error("Twelve Data API key missing");
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(asset.ticker)}&apikey=${encodeURIComponent(key)}`;
    const data = await fetchJson(url);
    if (data.status === "error" || !data.close) throw new Error(data.message || "Twelve Data returned no quote");
    return normalizeQuote({
      asset,
      price: Number(data.close),
      open: Number(data.open),
      previousClose: Number(data.previous_close),
      dayHigh: Number(data.high),
      dayLow: Number(data.low),
      change: Number(data.change),
      changePercent: Number(data.percent_change),
      volume: Number(data.volume),
      currency: data.currency || asset.currency,
      source: "Twelve Data"
    });
  }

  function normalizeQuote(raw) {
    const price = finiteOrNull(raw.price);
    const previousClose = finiteOrNull(raw.previousClose);
    const change = finiteOrNull(raw.change) ?? (price !== null && previousClose ? price - previousClose : null);
    const changePercent = finiteOrNull(raw.changePercent) ?? (change !== null && previousClose ? (change / previousClose) * 100 : null);
    const fields = {
      price,
      open: finiteOrNull(raw.open),
      previousClose,
      dayHigh: finiteOrNull(raw.dayHigh),
      dayLow: finiteOrNull(raw.dayLow),
      yearHigh: finiteOrNull(raw.yearHigh),
      yearLow: finiteOrNull(raw.yearLow),
      marketCap: finiteOrNull(raw.marketCap),
      volume: finiteOrNull(raw.volume),
      avgVolume: finiteOrNull(raw.avgVolume),
      dividendYield: finiteOrNull(raw.dividendYield),
      expenseRatio: finiteOrNull(raw.expenseRatio),
      peRatio: finiteOrNull(raw.peRatio),
      beta: finiteOrNull(raw.beta),
      change,
      changePercent
    };
    const fieldLabels = Object.keys(fields);
    return {
      symbol: raw.asset.ticker,
      name: raw.asset.name,
      assetType: raw.asset.type,
      assetId: raw.asset.id,
      ticker: raw.asset.ticker,
      price,
      open: fields.open,
      previousClose,
      dayHigh: fields.dayHigh,
      dayLow: fields.dayLow,
      yearHigh: fields.yearHigh,
      yearLow: fields.yearLow,
      marketCap: fields.marketCap,
      volume: fields.volume,
      avgVolume: fields.avgVolume,
      dividendYield: fields.dividendYield,
      expenseRatio: fields.expenseRatio,
      peRatio: fields.peRatio,
      beta: fields.beta,
      change,
      changePercent,
      currency: raw.currency || raw.asset.currency,
      exchange: raw.asset.exchange || null,
      source: raw.source || "Unavailable",
      lastUpdated: raw.asOf || new Date().toISOString(),
      asOf: raw.asOf || new Date().toISOString(),
      status: price === null ? "Unavailable" : "Success",
      fieldsAvailable: fieldLabels.filter((field) => fields[field] !== null && fields[field] !== undefined),
      fieldsUnavailable: fieldLabels.filter((field) => fields[field] === null || fields[field] === undefined),
      error: price === null ? "Live data is unavailable for this asset right now. Add an API key in Advanced Settings for deeper coverage, or try another asset." : null,
      message: price === null ? "Live data is unavailable for this asset right now. Add an API key in Advanced Settings for deeper coverage, or try another asset." : ""
    };
  }

  function normalizeBackendQuote(asset, quote) {
    const normalized = normalizeQuote({
      asset,
      price: quote.price,
      open: quote.open,
      previousClose: quote.previousClose,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      marketCap: quote.marketCap,
      volume: quote.volume,
      change: quote.change,
      changePercent: quote.changePercent,
      currency: quote.currency || asset.currency,
      source: quote.source || "Backend API",
      asOf: quote.lastUpdated || quote.asOf
    });
    normalized.status = quote.price === null || quote.price === undefined ? "Unavailable" : "Success";
    normalized.warning = quote.warning || null;
    normalized.error = quote.error || normalized.error;
    normalized.message = quote.warning || quote.error || normalized.message;
    normalized.sourceMode = quote.isCached ? "Cached backend data" : "Backend public API";
    normalized.isCached = Boolean(quote.isCached);
    normalized.stale = Boolean(quote.stale);
    return normalized;
  }

  function normalizeBackendHistory(history) {
    return (history.points || [])
      .map((point) => ({
        date: point.date,
        close: Number(point.close),
        volume: Number(point.volume),
        open: Number(point.open),
        high: Number(point.high),
        low: Number(point.low)
      }))
      .filter((point) => point.date && Number.isFinite(point.close));
  }

  function unavailableQuote(asset, message) {
    return {
      assetId: asset.id,
      symbol: asset.ticker,
      name: asset.name,
      assetType: asset.type,
      ticker: asset.ticker,
      price: null,
      open: null,
      previousClose: null,
      dayHigh: null,
      dayLow: null,
      yearHigh: null,
      yearLow: null,
      marketCap: null,
      volume: null,
      avgVolume: null,
      dividendYield: null,
      expenseRatio: null,
      peRatio: null,
      beta: null,
      change: null,
      changePercent: null,
      currency: asset.currency,
      exchange: asset.exchange || null,
      source: "Unavailable",
      lastUpdated: new Date().toISOString(),
      asOf: new Date().toISOString(),
      fieldsAvailable: [],
      fieldsUnavailable: ["price", "open", "previousClose", "dayHigh", "dayLow", "yearHigh", "yearLow", "marketCap", "volume", "avgVolume", "dividendYield", "expenseRatio", "peRatio", "beta", "change", "changePercent"],
      error: message,
      status: "Unavailable",
      message
    };
  }

  function renderCountryOptions() {
    byId("countrySelect").innerHTML = countryConfigService.getCountries()
      .map((country) => `<option value="${escapeHTML(country.code)}">${escapeHTML(country.name)}</option>`)
      .join("");
    glassSelectManager.refresh(byId("countrySelect"));
  }

  function renderSettingsOptions() {
    byId("defaultCountry").innerHTML = countryConfigService.getCountries()
      .map((country) => `<option value="${escapeHTML(country.code)}">${escapeHTML(country.name)}</option>`)
      .join("");
    const settings = getSettings();
    byId("providerSelect").value = settings.provider || "auto";
    byId("themeSetting").value = settings.theme || "system";
    byId("defaultCountry").value = settings.defaultCountry || state.country;
    byId("refreshInterval").value = settings.refreshInterval || "manual";
    byId("priorityPreference").value = settings.priorityPreference || "balanced";
    byId("heroPreset").value = settings.heroPreset || "cover";
    byId("heroImageUrl").value = settings.heroImageUrl || "";
    heroImageService.applyImage(heroImageService.imageFromSettings(settings));
    byId("enableNotifications").checked = Boolean(settings.enableNotifications);
    byId("morningBriefNotifications").checked = settings.morningBriefNotifications !== false;
    byId("ipoNotifications").checked = settings.ipoNotifications !== false;
    byId("opportunityNotifications").checked = settings.opportunityNotifications !== false;
    byId("verificationAlerts").checked = settings.verificationAlerts !== false;
    byId("notificationTime").value = settings.notificationTime || "07:00";
    byId("notificationFrequency").value = settings.notificationFrequency || "daily";
    setStoredPlaceholder("alphaKey", settings.alphaKey);
    setStoredPlaceholder("finnhubKey", settings.finnhubKey);
    setStoredPlaceholder("fmpKey", settings.fmpKey);
    setStoredPlaceholder("twelveKey", settings.twelveKey);
    setStoredPlaceholder("polygonKey", settings.polygonKey);
    setStoredPlaceholder("newsKey", settings.newsKey);
    setStoredPlaceholder("hfToken", settings.hfToken);
    byId("hfModel").value = settings.hfModel || DEFAULT_HF_MODEL;
    byId("cacheDuration").value = settings.cacheDuration || "900";
    glassSelectManager.enhanceAll();
    glassSelectManager.refreshAll();
  }

  function summarizeCoverage() {
    const liveBacked = state.assets.filter(hasPublicSource);
    const officialOnly = state.assets.length - liveBacked.length;
    const loaded = liveBacked.filter((asset) => Number.isFinite(Number(state.quotes[asset.id]?.price))).length;
    state.diagnostics.mode = officialOnly ? "Mixed live and official-only coverage" : "Public source mode";
    state.diagnostics.publicSourceStatus = liveBacked.length ? `${loaded}/${liveBacked.length} live-backed loaded` : "Official feed required";
    if (officialOnly) {
      state.diagnostics.suggestedFix = `${officialOnly} listing${officialOnly === 1 ? "" : "s"} need an official exchange feed, licensed provider, or backend proxy. Source-backed assets refresh normally.`;
    } else if (loaded === liveBacked.length) {
      state.diagnostics.suggestedFix = "No action needed. Public source-backed assets returned usable responses.";
    }
  }

  function renderAssetTypeTabs() {
    byId("assetTypeTabs").innerHTML = ASSET_TYPES.map((type) => `
      <button class="tab-button ${type === state.type ? "active" : ""}" type="button" data-type="${escapeHTML(type)}">${escapeHTML(type)}</button>
    `).join("");
    byId("assetTypeTabs").querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.type = button.dataset.type;
        renderAssetTypeTabs();
        renderAssetGrid();
      });
    });
  }

  function renderOverview() {
    const config = countryConfigService.getCountryConfig(state.country);
    const assets = state.assets;
    const loaded = assets.filter((asset) => state.quotes[asset.id]?.price !== null && state.quotes[asset.id]?.price !== undefined);
    const sourceBacked = assets.filter(hasPublicSource);
    const officialOnly = assets.length - sourceBacked.length;
    const unavailable = sourceBacked.length - loaded.filter(hasPublicSource).length;
    byId("overviewCards").innerHTML = [
      overviewCard("Currency", `${config.symbol} ${config.currency}`, "Selected market currency"),
      overviewCard("Exchanges", config.exchanges.length, config.exchanges.join(", ")),
      overviewCard("Live-backed", sourceBacked.length, `${loaded.length} with loaded quote data`),
      overviewCard("Official-only", officialOnly, unavailable ? `${unavailable} source-backed assets still pending` : "No unsupported prices are invented")
    ].join("");
  }

  function renderMarketHero() {
    const config = countryConfigService.getCountryConfig(state.country);
    const assets = state.assets.slice(0, 7);
    const loaded = state.assets.filter((asset) => Number.isFinite(Number(state.quotes[asset.id]?.price)));
    const sourceBacked = state.assets.filter(hasPublicSource);
    const score = sourceBacked.length
      ? Math.round((loaded.length / sourceBacked.length) * 100)
      : Math.min(92, 48 + state.assets.filter((asset) => asset.stooqSymbol || asset.coinGeckoId).length * 7);
    byId("marketHero").innerHTML = `
      <div class="hero-status-row" aria-hidden="true">
        <span>${escapeHTML(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date()))}</span>
        <span class="hero-signal-icons">▰ ◦ ▬</span>
      </div>
      <div class="hero-cover-actions">
        <button class="hero-round-button" type="button" aria-label="Open settings" data-hero-settings>☰</button>
        <button class="hero-round-button" type="button" aria-label="Open watchlist" data-hero-watchlist>☆</button>
      </div>
      <div class="hero-cover-copy">
        <span class="hero-brand-mark">GI</span>
        <p class="hero-greeting">${escapeHTML(byId("timeGreeting").textContent || "Good evening")}</p>
        <span class="hero-pill">Recommended</span>
        <h2>Market<br>Opportunities</h2>
        <p>${escapeHTML(config.name)} watch brief with ${escapeHTML(score)}% live coverage.</p>
        <button class="hero-listen-button" type="button" data-page-action-hero="explore">Explore</button>
      </div>
      <div class="market-orb" role="img" aria-label="${escapeHTML(config.name)} live coverage score ${score} percent">
        <span class="orb-icon">◒</span>
        <strong>${escapeHTML(score)}</strong>
        <small>live coverage</small>
        <em>${escapeHTML(config.currency)} · ${escapeHTML(config.exchanges[0] || "Market")}</em>
      </div>
      <div class="ticker-orbs">
        ${assets.map((asset) => {
          const quote = state.quotes[asset.id];
          const orbValue = tickerOrbValue(asset, quote);
          return `<button class="ticker-orb" type="button" data-detail-orb="${escapeHTML(asset.id)}">
            <span>${escapeHTML(orbValue)}</span>
            <strong>${escapeHTML(asset.ticker.replace(/\..*/, ""))}</strong>
          </button>`;
        }).join("")}
      </div>
    `;
    byId("marketHero").querySelectorAll("[data-detail-orb]").forEach((button) => {
      button.addEventListener("click", () => openDetail(button.dataset.detailOrb));
    });
    byId("marketHero").querySelector("[data-hero-settings]")?.addEventListener("click", openSettings);
    byId("marketHero").querySelector("[data-hero-watchlist]")?.addEventListener("click", () => pageRouter.goTo("watchlist"));
    byId("marketHero").querySelector("[data-page-action-hero]")?.addEventListener("click", (event) => pageRouter.goTo(event.currentTarget.dataset.pageActionHero));
  }

  function renderInsightCard() {
    const config = countryConfigService.getCountryConfig(state.country);
    const unavailable = state.assets.filter((asset) => state.quotes[asset.id]?.status === "Unavailable").length;
    const officialOnly = state.assets.filter((asset) => !hasPublicSource(asset)).length;
    byId("insightCard").innerHTML = `
      <span class="insight-mark">✦</span>
      <div>
        <strong>${escapeHTML(config.name)} research note</strong>
        <p>${officialOnly ? `${officialOnly} local listings need an official or licensed feed. ` : unavailable ? `${unavailable} assets need a retry or connected provider. ` : ""}Verify broker availability, fees, regulation, tax implications, and eligibility before using any platform.</p>
      </div>
      <button class="chevron-button" type="button" aria-label="Open settings from insight">›</button>
    `;
    byId("insightCard").querySelector("button").addEventListener("click", openSettings);
  }

  function renderTodayBrief() {
    const ipo = ipoIntelligenceService.getSummary();
    const watched = Object.values(state.watchlist);
    const loadedAssets = state.assets.filter((asset) => finiteOrNull(state.quotes[asset.id]?.price) !== null);
    const trustItems = state.assets.slice(0, 4).map((asset) => {
      const quote = state.quotes[asset.id] || null;
      const governance = trustService.governanceForAsset(asset, quote);
      const availability = trustService.availabilityFor(asset, "GH");
      const signal = trustService.marketSignalFor(asset, quote);
      return `
        <article class="trust-mini-card">
          <div>
            <span>${escapeHTML(asset.ticker)}</span>
            <strong>${escapeHTML(governance.dataStatus)}</strong>
          </div>
          <p>${escapeHTML(signal.label)} · ${escapeHTML(availability.availabilityStatus)}</p>
          <div class="trust-meter" aria-label="Confidence ${governance.confidenceScore} percent"><i style="width:${governance.confidenceScore}%"></i></div>
          <small>Confidence ${governance.confidenceScore}% · Reliability ${governance.reliabilityScore}% · ${escapeHTML(governance.freshness.label)}</small>
        </article>
      `;
    }).join("");
    byId("todayBriefPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">What to watch today</p>
          <h3>Trust-first market brief</h3>
        </div>
        ${tag(state.loading ? "Refreshing" : "Ready")}
      </div>
      <div class="priority-grid">
        ${priorityTile("Open IPOs", ipo.openIpos.length ? ipo.openIpos.length : "Unverified", ipo.status)}
        ${priorityTile("Closing Soon", ipo.closingSoon.length ? ipo.closingSoon.length : "No verified feed", "Connect official IPO data before listing dates.")}
        ${priorityTile("Ghana Access", `${loadedAssets.length}/${state.assets.filter(hasPublicSource).length}`, "Source-backed markets; broker eligibility still varies.")}
        ${priorityTile("Watchlist", watched.length, watched.length ? "Review saved instruments for freshness." : "No saved instruments yet.")}
      </div>
      <div class="trust-list">${trustItems}</div>
      <details class="why-panel">
        <summary>Why am I seeing this?</summary>
        <p>The brief prioritizes open IPOs, closing windows, Ghana accessibility, watchlist changes, data confidence, verification issues, and source freshness. Missing IPO feed data is shown as unverified rather than estimated.</p>
      </details>
    `;
  }

  function renderOpportunityPanel() {
    const rankings = opportunityRankingService.rankAssets();
    if (!rankings.length) {
      byId("opportunityPanel").innerHTML = emptyState("Market opportunities will appear after assets load.");
      return;
    }
    const cards = opportunityRankingService.topCards(rankings);
    const preference = getSettings().priorityPreference || "balanced";
    byId("opportunityPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">Market Opportunities</p>
          <h3>Top Opportunities Today</h3>
        </div>
        ${tag(rankingPreferenceLabel(preference))}
      </div>
      <p class="trust-copy">These rankings estimate watch priority only. They are not buy, sell, hold, or guaranteed return recommendations.</p>
      <div class="opportunity-grid">
        ${cards.map((card) => renderOpportunityCard(card)).join("")}
      </div>
      <details class="why-panel">
        <summary>Why did the rankings change?</summary>
        <p>${escapeHTML(preferenceChangeExplanation(preference))}</p>
      </details>
    `;
    byId("opportunityPanel").querySelectorAll("[data-detail-opportunity]").forEach((button) => {
      button.addEventListener("click", () => openDetail(button.dataset.detailOpportunity));
    });
  }

  function renderOpportunityCard(card) {
    if (card.ipo) {
      return `
        <article class="opportunity-card muted-opportunity">
          <div class="opportunity-card-head">
            <span>${escapeHTML(card.label)}</span>
            <strong>Unverified</strong>
          </div>
          <p>${escapeHTML(card.note)}</p>
          <div class="score-grid">
            ${miniScore("Confidence Score", "0%")}
            ${miniScore("Reliability Score", "0%")}
            ${miniScore("Availability", "Needs feed")}
            ${miniScore("Risk", "Unknown")}
          </div>
          <details class="why-panel compact">
            <summary>Why is this ranked highly?</summary>
            <p>IPO urgency is not ranked until subscription deadlines, listing dates, source information, and Ghana access are verified from an official exchange, regulator, or licensed provider.</p>
          </details>
        </article>
      `;
    }
    const item = card.item;
    if (!item) return "";
    return `
      <article class="opportunity-card">
        <div class="opportunity-card-head">
          <span>${escapeHTML(card.label)}</span>
          <strong>${escapeHTML(item.asset.ticker)}</strong>
        </div>
        <p>${escapeHTML(card.note)}</p>
        <div class="opportunity-score">
          <strong>${item.opportunityScore}</strong>
          <span>Opportunity Score</span>
        </div>
        <div class="score-grid">
          ${miniScore("Confidence Score", `${item.confidenceScore}%`)}
          ${miniScore("Reliability Score", `${item.reliabilityScore}%`)}
          ${miniScore("Forecast Quality Score", `${item.forecastQualityScore}%`)}
          ${miniScore("Risk Score", `${item.riskScore}%`)}
          ${miniScore("Availability Score", `${item.availabilityScore}%`)}
          ${miniScore("Freshness", item.governance.freshness.label)}
        </div>
        <div class="opportunity-meta">
          <span>${escapeHTML(item.availability.availabilityStatus)}</span>
          <span>${escapeHTML(item.asset.risk || "Risk unclassified")}</span>
          <span>${escapeHTML(item.watchPriority)}</span>
        </div>
        <small>Source: ${escapeHTML(item.governance.sourceName)}. Signal: ${escapeHTML(item.signal.label)}.</small>
        <details class="why-panel compact">
          <summary>Why is this ranked highly?</summary>
          <p><strong>Inputs used:</strong> ${escapeHTML(item.inputs.join("; "))}</p>
          <p><strong>Signals detected:</strong> ${escapeHTML(item.signal.reason)} ${escapeHTML(item.preferenceExplanation)}</p>
          <p><strong>Source information:</strong> ${escapeHTML(item.governance.sourceType)} via ${escapeHTML(item.governance.sourceMode)}.</p>
          <p><strong>Limitations:</strong> ${escapeHTML(item.limitations.join(" "))}</p>
        </details>
        <button class="secondary-action" type="button" data-detail-opportunity="${escapeHTML(item.asset.id)}">View Details</button>
      </article>
    `;
  }

  function renderMorningBrief() {
    const rankings = opportunityRankingService.rankAssets();
    const brief = opportunityRankingService.morningBrief(rankings);
    byId("morningBriefPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">Daily Market Intelligence Brief</p>
          <h3>Morning Executive Summary</h3>
        </div>
        ${tag(formatTime(new Date().toISOString()))}
      </div>
      <div class="brief-summary-grid">
        ${briefRow("Open IPOs", brief.openIpos)}
        ${briefRow("Closing Soon IPOs", brief.closingSoon)}
        ${briefRow("New Opportunities", brief.newOpportunities)}
        ${briefRow("Changed Opportunities", brief.changedOpportunities)}
        ${briefRow("Highest Confidence", brief.highestConfidence || "Waiting for source confidence")}
        ${briefRow("Most Accessible", brief.mostAccessible || "Waiting for availability checks")}
        ${briefRow("Verification Alerts", brief.verificationAlerts)}
        ${briefRow("Conflict Alerts", brief.conflictAlerts)}
        ${briefRow("Market Signal Changes", brief.signalChanges)}
        ${briefRow("Currency Exposure", brief.currencyExposure)}
        ${briefRow("Risk Note of the Day", brief.riskNote)}
        ${briefRow("Top Watch Priority", brief.topWatchPriority)}
      </div>
    `;
  }

  function renderNotificationCenter() {
    const settings = getSettings();
    const notificationState = notificationService.getStatus();
    const enabled = Boolean(settings.enableNotifications);
    const permission = notificationService.permissionStatus();
    const morningReady = enabled && permission === "Granted";
    byId("notificationCenterPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">Notification Center</p>
          <h3>Delivery Status</h3>
        </div>
        ${tag(enabled ? "Opted in" : "Off")}
      </div>
      <div class="notification-status-grid">
        ${briefRow("Notification Status", enabled ? "Enabled in preferences" : "Disabled until you opt in")}
        ${briefRow("Permission Status", permission)}
        ${briefRow("Last Notification Sent", notificationState.lastNotificationSent || "Never")}
        ${briefRow("Morning Brief Status", morningReady ? `Ready for ${settings.notificationTime || "07:00"}; not sent yet` : notificationState.morningBriefStatus)}
        ${briefRow("Provider Status", notificationState.providerStatus)}
      </div>
      <div class="notification-category-list">
        ${notificationService.categories.map((category) => `<span>${escapeHTML(category)}</span>`).join("")}
      </div>
      <p class="trust-copy">Notification delivery is optional. The app only reports sent notifications after the browser confirms permission and a notification is actually created.</p>
    `;
  }

  function renderIpoPage() {
    const ipo = ipoIntelligenceService.getSummary();
    byId("ipoPanel").innerHTML = `
      <section class="ipo-status-card">
        <span class="status-dot"></span>
        <div>
          <p class="eyebrow">${escapeHTML(ipo.mode)}</p>
          <h3>${escapeHTML(ipo.status)}</h3>
          <p>No IPO dates, price ranges, or allocations are displayed until they are verified from an official exchange, regulator, or licensed provider.</p>
        </div>
      </section>
      <div class="priority-grid">
        ${priorityTile("Open IPOs", "Unverified", "Live IPO feed not connected.")}
        ${priorityTile("Closing Soon", "Unverified", "No closing window shown without official data.")}
        ${priorityTile("Accessible From Ghana", "Needs verification", "Broker and currency requirements must be confirmed.")}
        ${priorityTile("Verification Issues", ipo.verificationIssues.length, ipo.verificationIssues[0])}
      </div>
      <section class="source-list">
        <div class="brief-head">
          <div>
            <p class="eyebrow">Source Explorer</p>
            <h3>IPO source directory</h3>
          </div>
        </div>
        ${ipo.sourceDirectory.map(sourceCard).join("")}
      </section>
      <section class="trust-note">
        <strong>Non-negotiable rule</strong>
        <p>A high opportunity score will never mean “buy.” It only means watch priority after accessibility, confidence, freshness, urgency, liquidity, and risk are explained.</p>
      </section>
    `;
  }

  function renderJournal() {
    const entry = ipoIntelligenceService.journalEntry();
    const loaded = state.assets.filter((asset) => finiteOrNull(state.quotes[asset.id]?.price) !== null).length;
    const stale = state.assets.filter((asset) => trustService.governanceForAsset(asset, state.quotes[asset.id]).freshness.status === "stale").length;
    byId("journalPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">Intelligence Journal</p>
          <h3>Refresh log</h3>
        </div>
        ${tag(formatTime(entry.date))}
      </div>
      <div class="journal-row"><span>Loaded market records</span><strong>${loaded}</strong></div>
      <div class="journal-row"><span>IPO verification issues</span><strong>${entry.verificationIssues}</strong></div>
      <div class="journal-row"><span>Stale market records</span><strong>${stale}</strong></div>
      <p>${escapeHTML(entry.note)}</p>
    `;
  }

  function renderLearnPage() {
    byId("learnPanel").innerHTML = `
      ${learnCard("Opportunity Score", "Watch priority, not investment quality. It should consider accessibility, confidence, freshness, market signals, liquidity, urgency, and risk.")}
      ${learnCard("Confidence vs Reliability", "Confidence describes trust in a record. Reliability describes how consistently the source works over time. They must stay separate.")}
      ${learnCard("Scenario Outlooks", "The app may show bullish, neutral, and bearish scenarios, but never guaranteed outcomes or trade recommendations.")}
      ${learnCard("Can I Participate?", "Availability depends on country, broker eligibility, required currency, minimum investment, and verification status.")}
      ${learnCard("AI Signals", "AI can summarize or classify information. It cannot invent prices, IPO dates, fundamentals, news, or recommendations.")}
    `;
  }

  function renderSourceExplorer() {
    const activeSources = state.assets.slice(0, 8).map((asset) => {
      const governance = trustService.governanceForAsset(asset, state.quotes[asset.id]);
      return `
        <article class="source-card">
          <div>
            <span>${escapeHTML(asset.ticker)}</span>
            <strong>${escapeHTML(governance.sourceName)}</strong>
          </div>
          <p>${escapeHTML(governance.sourceMode)} · ${escapeHTML(governance.freshness.label)}</p>
          <small>Missing: ${escapeHTML(governance.missingFields.length ? governance.missingFields.join(", ") : "None reported")}</small>
        </article>
      `;
    }).join("");
    byId("sourceExplorerPanel").innerHTML = `
      <div class="brief-head">
        <div>
          <p class="eyebrow">Verification Layer</p>
          <h3>Active market sources</h3>
        </div>
      </div>
      <div class="source-list">${activeSources}${ipoSourceDirectory.map(sourceCard).join("")}</div>
    `;
  }

  function renderStatus() {
    const settings = getSettings();
    const assets = filteredAssets();
    const publicCount = assets.filter(hasPublicSource).length;
    const officialCount = assets.length - publicCount;
    byId("statusPanel").innerHTML = `
      ${statusPill("Data mode", state.diagnostics.mode || "Public source mode")}
      ${statusPill("Provider", providerLabel(settings.provider || "auto"))}
      ${statusPill("Public endpoints", `${publicCount} supported`)}
      ${statusPill("Official-only", `${officialCount} listed`)}
      ${statusPill("Refresh", state.diagnostics.activeRefresh || "Manual only")}
      ${statusPill("API keys", apiKeySummary(settings))}
      ${statusPill("Market", `${countryName(state.country)} · ${timezoneForCountry(state.country)}`)}
      ${statusPill("State", state.marketSwitching ? "Switching market" : state.loading ? "Loading" : "Ready")}
      ${state.errors.length ? `<div class="error-banner"><strong>Data notice</strong><p>${escapeHTML(state.errors.slice(0, 3).join(" · "))}</p><button class="secondary-action" type="button" id="retryErrors">Retry</button></div>` : ""}
    `;
    const retry = byId("retryErrors");
    if (retry) retry.addEventListener("click", () => refreshMarketData({ force: true }));
  }

  function renderDiagnostics() {
    const d = state.diagnostics;
    refreshBackendDiagnostics();
    byId("diagnosticsPanel").innerHTML = `
      <details class="diagnostics-shell">
        <summary>
          <div>
            <p class="eyebrow">Data Sources</p>
            <h3>${escapeHTML(d.mode)}</h3>
          </div>
          ${tag(d.publicSourceStatus)}
        </summary>
        <div class="diagnostics-grid">
          ${mini("Active provider", d.activeProvider)}
          ${mini("Cache status", d.cacheStatus)}
          ${mini("Last successful fetch", d.lastSuccessfulFetch)}
          ${mini("Suggested fix", d.suggestedFix)}
        </div>
        ${d.failedAttempts.length ? `<details class="diagnostics-details"><summary>Failed source attempts</summary><p>${escapeHTML(d.failedAttempts.join(" · "))}</p></details>` : ""}
        ${d.rateLimitWarnings.length ? `<details class="diagnostics-details"><summary>Rate limit warnings</summary><p>${escapeHTML(d.rateLimitWarnings.join(" · "))}</p></details>` : ""}
        ${d.corsWarnings.length ? `<details class="diagnostics-details"><summary>CORS or browser access warnings</summary><p>${escapeHTML(d.corsWarnings.join(" · "))}</p></details>` : ""}
      </details>
    `;
  }

  async function refreshBackendDiagnostics() {
    try {
      const diagnostics = await apiClient.getDiagnostics();
      state.diagnostics.backendOnline = diagnostics.backendOnline;
      state.diagnostics.cacheEntries = diagnostics.cacheEntries;
      state.diagnostics.missingApiKeys = diagnostics.missingApiKeys;
    } catch {
      state.diagnostics.backendOnline = false;
    }
  }

  function renderAssetGrid() {
    const assets = filteredAssets();
    const container = byId("assetGrid");
    if (state.loading && !Object.keys(state.quotes).length) {
      container.innerHTML = Array.from({ length: 6 }, () => `<article class="asset-card skeleton"></article>`).join("");
      transitionManager.animateListChange(container);
      return;
    }
    if (!assets.length) {
      container.innerHTML = emptyState("No assets match the current country, filter, or search.");
      transitionManager.animateListChange(container);
      return;
    }
    container.innerHTML = assets.map(renderAssetCard).join("");
    transitionManager.animateListChange(container);
    container.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", () => openDetail(button.dataset.detail)));
    container.querySelectorAll("[data-watch]").forEach((button) => button.addEventListener("click", () => addToWatchlist(button.dataset.watch)));
    container.querySelectorAll("[data-compare]").forEach((button) => button.addEventListener("click", () => toggleCompare(button.dataset.compare)));
  }

  function renderFeaturedAssets() {
    const featured = state.assets
      .filter((asset) => hasPublicSource(asset))
      .slice(0, 4);
    byId("featuredGrid").innerHTML = featured.map((asset) => {
      const quote = state.quotes[asset.id] || unavailableQuote(asset, "Quote loading.");
      return `
        <article class="featured-card">
          <div>
            <span>${escapeHTML(asset.type)}</span>
            <strong>${escapeHTML(asset.ticker)}</strong>
            <p>${escapeHTML(asset.name)}</p>
          </div>
          <div>
            <b>${escapeHTML(formatMoney(quote.price, quote.currency))}</b>
            ${changeBadge(quote.change, quote.changePercent)}
          </div>
          <button class="secondary-action" type="button" data-detail="${escapeHTML(asset.id)}">View Details</button>
        </article>
      `;
    }).join("");
    byId("featuredGrid").querySelectorAll("[data-detail]").forEach((button) => {
      button.addEventListener("click", () => openDetail(button.dataset.detail));
    });
  }

  function renderBrokerPage() {
    const config = countryConfigService.getCountryConfig(state.country);
    const brokers = brokerDirectoryService.getBrokerOptions(state.country, state.type === "All" ? "Stocks" : state.type);
    byId("brokerPagePanel").innerHTML = `
      <div class="broker-page-head">
        <p class="eyebrow">${escapeHTML(config.name)} · ${escapeHTML(config.currency)}</p>
        <h3>Example platforms to research</h3>
        <p>Broker availability, fees, tax rules, and regulations vary by country and user eligibility. Verify directly with the broker and local regulators.</p>
      </div>
      <div class="broker-grid">
        ${brokers.map((broker) => `
          <article class="broker-card">
            <h4>${escapeHTML(broker.name)}</h4>
            <p>${escapeHTML(broker.note)}</p>
            <span>${escapeHTML(broker.assetTypes.join(", "))}</span>
            <a href="${escapeHTML(broker.url)}" target="_blank" rel="noreferrer">Visit site</a>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderAiPage() {
    const settings = getSettings();
    byId("aiPagePanel").innerHTML = `
      <h3>AI Insight</h3>
      <p class="prototype-note">Optional summaries only. Not financial advice.</p>
      <p class="${settings.hfToken ? "success-message" : "data-message"}">
        ${escapeHTML(settings.hfToken ? "Hugging Face token saved locally. Open an asset detail view to request an AI insight from the selected model." : "AI Insight is disabled. Add a supported AI provider token in Advanced Settings to enable it.")}
      </p>
      <button class="primary-action" type="button" id="aiSettingsOpen">Advanced Settings</button>
    `;
    byId("aiSettingsOpen").addEventListener("click", openSettings);
  }

  function renderGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    byId("timeGreeting").textContent = greeting;
    byId("todayDate").textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(new Date());
  }

  function renderAssetCard(asset) {
    const quote = state.quotes[asset.id] || unavailableQuote(asset, "Quote not loaded yet.");
    const watched = Boolean(state.watchlist[asset.id]);
    const compared = state.compare.includes(asset.id);
    return `
      <article class="asset-card ${watched ? "is-watchlisted" : ""} ${compared ? "is-compared" : ""}">
        <div class="asset-top">
          <div>
            <strong class="ticker">${escapeHTML(asset.ticker)}</strong>
            <h3>${escapeHTML(asset.name)}</h3>
          </div>
          ${tag(asset.type)}
        </div>
        <div class="price-row">
          <span>${formatMoney(quote.price, quote.currency)}</span>
          ${changeBadge(quote.change, quote.changePercent)}
        </div>
        ${sparkline(asset)}
        <div class="meta-grid">
          ${mini("Exchange", asset.exchange)}
          ${mini("Risk", `${asset.risk} risk`)}
          ${mini("Source", quote.source)}
          ${mini("Updated", quote.lastUpdated ? formatTime(quote.lastUpdated) : formatTime(quote.cachedAt))}
          ${mini("Market", countryName(asset.country))}
        </div>
        ${quote.status === "Unavailable" ? `<p class="data-message">${escapeHTML(quote.message)}</p>` : ""}
        <div class="card-actions">
          <button class="primary-action" type="button" data-detail="${escapeHTML(asset.id)}">View Details</button>
          <button class="secondary-action" type="button" data-watch="${escapeHTML(asset.id)}">${watched ? "Update Watchlist" : "Add to Watchlist"}</button>
          <button class="secondary-action ${compared ? "active" : ""}" type="button" data-compare="${escapeHTML(asset.id)}">${compared ? "Comparing" : "Compare"}</button>
        </div>
      </article>
    `;
  }

  async function openDetail(assetId) {
    state.selectedAssetId = assetId;
    drawerManager.open("detailDrawer");
    await loadAssetData(getAsset(assetId), { force: false });
    renderDetail(assetId);
  }

  async function renderDetail(assetId) {
    const asset = getAsset(assetId);
    const quote = state.quotes[assetId] || unavailableQuote(asset, "Quote not loaded yet.");
    const history = state.histories[assetId] || [];
    const ai = await aiInsightService.fetchAiInsight(asset);
    byId("detailTitle").textContent = `${asset.ticker} · ${asset.name}`;
    byId("detailContent").innerHTML = `
      <section class="detail-summary">
        <div>
          <p class="eyebrow">${escapeHTML(asset.type)} · ${escapeHTML(asset.exchange)}</p>
          <h3>${formatMoney(quote.price, quote.currency)}</h3>
          ${changeBadge(quote.change, quote.changePercent)}
        </div>
        ${tag(`${asset.risk} risk`)}
      </section>

      <section class="chart-card">
        <div class="chart-header">
          <h3>Price history</h3>
          <div class="range-tabs">${TIME_RANGES.map((range) => `<button class="range-button ${range === state.selectedRange ? "active" : ""}" type="button" data-range="${range}">${range}</button>`).join("")}</div>
        </div>
        <canvas id="detailPriceChart" aria-label="Price history line chart"></canvas>
        ${history.length ? "" : `<p class="data-message">${escapeHTML(hasPublicSource(asset) ? "Historical data is unavailable from the current public source. Add an advanced API provider in Settings for deeper chart history." : "Historical charting for this listing needs an official exchange feed, licensed data provider, or backend connector.")}</p>`}
      </section>

      <section class="chart-card">
        <h3>Volume</h3>
        <canvas id="detailVolumeChart" aria-label="Volume bar chart"></canvas>
        ${history.some((point) => point.volume) ? "" : `<p class="data-message">${escapeHTML(hasPublicSource(asset) ? "Volume chart unavailable from the selected provider." : "Volume requires an official or licensed market data feed for this listing.")}</p>`}
      </section>

      <section class="stats-section">
        <h3>Statistics</h3>
        <div class="stats-grid">
          ${stat("Ticker", asset.ticker)}
          ${stat("Asset type", asset.type)}
          ${stat("Exchange", asset.exchange)}
          ${stat("Country or region", countryName(asset.country))}
          ${stat("Current price", formatMoney(quote.price, quote.currency))}
          ${stat("Open price", formatMoney(quote.open, quote.currency))}
          ${stat("Previous close", formatMoney(quote.previousClose, quote.currency))}
          ${stat("Day high", formatMoney(quote.dayHigh, quote.currency))}
          ${stat("Day low", formatMoney(quote.dayLow, quote.currency))}
          ${stat("52-week high", formatMoney(quote.yearHigh, quote.currency))}
          ${stat("52-week low", formatMoney(quote.yearLow, quote.currency))}
          ${stat("Market cap", formatNumber(quote.marketCap))}
          ${stat("Volume", formatNumber(quote.volume))}
          ${stat("Average volume", formatNumber(quote.avgVolume))}
          ${stat("Dividend yield", formatPercent(quote.dividendYield))}
          ${stat("Expense ratio", formatPercent(quote.expenseRatio))}
          ${stat("P/E ratio", formatNumber(quote.peRatio))}
          ${stat("Beta", formatNumber(quote.beta))}
          ${stat("1D change", changeText(quote.change, quote.changePercent))}
          ${stat("1M performance", performanceFor(assetId, "1M"))}
          ${stat("6M performance", performanceFor(assetId, "6M"))}
          ${stat("YTD performance", performanceFor(assetId, "YTD"))}
          ${stat("1Y performance", performanceFor(assetId, "1Y"))}
        </div>
      </section>

      <section class="stats-section">
        <h3>Data source diagnostics</h3>
        <div class="stats-grid">
          ${stat("Source", quote.source)}
          ${stat("Mode", quote.sourceMode || state.diagnostics.mode)}
          ${stat("Last updated", formatTime(quote.lastUpdated || quote.cachedAt))}
          ${stat("Fields available", quote.fieldsAvailable?.join(", ") || "Not available")}
          ${stat("Fields unavailable", quote.fieldsUnavailable?.join(", ") || "Not available")}
          ${stat("Error", quote.error || "None")}
        </div>
      </section>

      ${whereToBuySection(asset)}
      ${aiInsightSection(ai)}

      <section class="risk-note">
        <h3>Risk and suitability note</h3>
        <p>This asset may not be suitable for every investor. Check fees, regulation, tax implications, eligibility, liquidity, and currency exposure before making any decision.</p>
      </section>

      <section class="footer-disclaimer compact">
        This app is for education and research only. It does not provide financial, investment, tax, or legal advice. Market data may be delayed, incomplete, or unavailable. Verify information with official sources before making decisions.
      </section>
    `;
    byId("detailContent").querySelectorAll("[data-range]").forEach((button) => {
      button.addEventListener("click", async () => {
        state.selectedRange = button.dataset.range;
        state.histories[assetId] = await dataSourceManager.fetchHistory(asset, state.selectedRange, { force: true });
        renderDetail(assetId);
      });
    });
    chartService.renderPriceChart("detailPriceChart", history, `${asset.ticker} price`);
    chartService.renderVolumeChart("detailVolumeChart", history, `${asset.ticker} volume`);
  }

  function whereToBuySection(asset) {
    const brokers = brokerDirectoryService.getBrokerOptions(state.country, asset.type);
    return `
      <section class="broker-section">
        <h3>Example platforms to research</h3>
        <p>Broker examples are informational only. Verify availability and regulation.</p>
        <div class="broker-list">
          ${brokers.length ? brokers.map((broker) => `
            <article class="broker-card">
              <strong>${escapeHTML(broker.name)}</strong>
              <span>${escapeHTML(broker.assetTypes.join(", "))}</span>
              <p>${escapeHTML(broker.note)} Availability may vary.</p>
              <a class="secondary-action link-button" href="${escapeHTML(broker.url)}" target="_blank" rel="noreferrer">Open website</a>
            </article>
          `).join("") : emptyState("No broker examples match this asset type for the selected country.")}
        </div>
        <p class="data-message">Broker availability, fees, tax rules, and regulations vary by country and user eligibility. Verify with the broker and local regulators before opening an account.</p>
      </section>
    `;
  }

  function aiInsightSection(ai) {
    return `
      <section class="ai-section">
        <h3>AI Insight</h3>
        <p class="prototype-note">Automated research summary. Not financial advice.</p>
        ${ai.available ? `
          ${stat("Sentiment score", ai.sentimentScore)}
          <p>${escapeHTML(ai.summary)}</p>
          <p class="prototype-note">${escapeHTML(ai.modelLabel)}</p>
        ` : `<p class="data-message">${escapeHTML(ai.message)}</p>`}
        <div class="stats-grid">
          ${stat("Risk factors", insightList(ai.riskFactors) || "Requires connected quote data")}
          ${stat("Bullish factors", insightList(ai.bullishFactors) || "Limited by supplied data")}
          ${stat("Bearish factors", insightList(ai.bearishFactors) || "Limited by supplied data")}
          ${stat("Data quality", ai.dataQuality || "Model output depends on available source data")}
        </div>
      </section>
    `;
  }

  function renderWatchlist() {
    const allEntries = Object.values(state.watchlist);
    const entries = allEntries.filter((entry) => isAssetInSelectedMarket(getAsset(entry.assetId), state.country));
    const hiddenCount = allEntries.length - entries.length;
    if (!allEntries.length) {
      byId("watchlistPanel").innerHTML = emptyState(uxGuidance.watchlistEmpty);
      transitionManager.animateListChange(byId("watchlistPanel"));
      return;
    }
    if (!entries.length) {
      byId("watchlistPanel").innerHTML = emptyState(`${hiddenCount} saved item${hiddenCount === 1 ? "" : "s"} are outside ${countryName(state.country)}. Switch market to view them.`);
      transitionManager.animateListChange(byId("watchlistPanel"));
      return;
    }
    let total = 0;
    let cost = 0;
    byId("watchlistPanel").innerHTML = `
      <div class="chart-card allocation-card">
        <h3>Asset allocation</h3>
        <canvas id="allocationChart" aria-label="Watchlist asset allocation pie chart"></canvas>
      </div>
      ${hiddenCount ? `<p class="market-scope-note">${escapeHTML(hiddenCount)} saved item${hiddenCount === 1 ? "" : "s"} hidden because they belong to another market.</p>` : ""}
      <div class="watchlist-grid">
        ${entries.map((entry) => {
          const asset = getAsset(entry.assetId);
          const quote = state.quotes[asset.id] || unavailableQuote(asset, "Quote unavailable.");
          const value = quote.price !== null ? quote.price * Number(entry.units || 0) : null;
          const basis = Number(entry.averagePrice || 0) * Number(entry.units || 0);
          if (value !== null) total += value;
          cost += basis;
          return `
            <article class="watch-card">
              <div>
                <strong>${escapeHTML(asset.ticker)}</strong>
                <span>${escapeHTML(asset.name)}</span>
              </div>
              <div class="holding-inputs">
                <label>Units<input type="number" min="0" step="any" value="${escapeHTML(entry.units || 0)}" data-units="${escapeHTML(asset.id)}"></label>
                <label>Avg buy<input type="number" min="0" step="any" value="${escapeHTML(entry.averagePrice || 0)}" data-average="${escapeHTML(asset.id)}"></label>
              </div>
              <div class="meta-grid">
                ${mini("Current", formatMoney(quote.price, quote.currency))}
                ${mini("Value", formatMoney(value, quote.currency))}
                ${mini("Unrealized", value === null || !basis ? "Not available" : changeText(value - basis, basis ? ((value - basis) / basis) * 100 : null))}
              </div>
              <button class="danger-action" type="button" data-remove-watch="${escapeHTML(asset.id)}">Remove</button>
            </article>
          `;
        }).join("")}
      </div>
      <section class="portfolio-total">
        <h3>Watchlist total estimated value</h3>
        <p>${total ? formatMoney(total, countryConfigService.getCountryConfig(state.country).currency) : "Not available until prices and holdings are available."}</p>
        <span>${cost ? `Cost basis entered: ${formatMoney(cost, countryConfigService.getCountryConfig(state.country).currency)}` : "Enter holdings to estimate gain or loss."}</span>
      </section>
    `;
    transitionManager.animateListChange(byId("watchlistPanel"));
    chartService.renderAllocationChart("allocationChart", entries);
    byId("watchlistPanel").querySelectorAll("[data-units]").forEach((input) => input.addEventListener("input", updateHolding));
    byId("watchlistPanel").querySelectorAll("[data-average]").forEach((input) => input.addEventListener("input", updateHolding));
    byId("watchlistPanel").querySelectorAll("[data-remove-watch]").forEach((button) => {
      button.addEventListener("click", () => {
        watchlistService.removeWatchlistItem(button.dataset.removeWatch);
        renderWatchlist();
        renderAssetGrid();
      });
    });
  }

  function updateHolding(event) {
    const assetId = event.target.dataset.units || event.target.dataset.average;
    const entry = state.watchlist[assetId] || { assetId, units: 0, averagePrice: 0 };
    if (event.target.dataset.units) entry.units = Number(event.target.value || 0);
    if (event.target.dataset.average) entry.averagePrice = Number(event.target.value || 0);
    state.watchlist[assetId] = entry;
    watchlistService.saveWatchlist(state.watchlist);
    renderWatchlist();
  }

  function renderComparison() {
    const assets = state.compare.map(getAsset).filter((asset) => isAssetInSelectedMarket(asset, state.country));
    if (assets.length < 2) {
      byId("comparePanel").innerHTML = emptyState(uxGuidance.compareEmpty);
      transitionManager.animateListChange(byId("comparePanel"));
      return;
    }
    byId("comparePanel").innerHTML = `
      <div class="chart-card">
        <h3>Normalized performance</h3>
        <canvas id="compareChart" aria-label="Normalized performance comparison chart"></canvas>
      </div>
      <div class="comparison-table-wrap">
        <table class="comparison-table">
          <thead>
            <tr><th>Metric</th>${assets.map((asset) => `<th>${escapeHTML(asset.ticker)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${comparisonRow("Asset type", assets.map((asset) => asset.type))}
            ${comparisonRow("Risk", assets.map((asset) => asset.risk))}
            ${comparisonRow("Current price", assets.map((asset) => formatMoney(state.quotes[asset.id]?.price, state.quotes[asset.id]?.currency || asset.currency)))}
            ${comparisonRow("Daily change", assets.map((asset) => changeText(state.quotes[asset.id]?.change, state.quotes[asset.id]?.changePercent)))}
            ${comparisonRow("Expense ratio", assets.map((asset) => formatPercent(state.quotes[asset.id]?.expenseRatio)))}
            ${comparisonRow("Dividend yield", assets.map((asset) => formatPercent(state.quotes[asset.id]?.dividendYield)))}
            ${comparisonRow("Market cap", assets.map((asset) => formatNumber(state.quotes[asset.id]?.marketCap)))}
          </tbody>
        </table>
      </div>
    `;
    transitionManager.animateListChange(byId("comparePanel"));
    chartService.renderComparisonChart("compareChart", assets);
  }

  const chartService = {
    renderPriceChart(canvasId, points, label) {
      const canvas = byId(canvasId);
      if (state.charts[canvasId]) state.charts[canvasId].destroy();
      delete state.charts[canvasId];
      if (!canvas || !window.Chart || !points.length) return;
      state.charts[canvasId] = new Chart(canvas, {
        type: "line",
        data: {
          labels: points.map((point) => point.date),
          datasets: [{
            label,
            data: points.map((point) => point.close),
            borderColor: cssVar("--accent"),
            backgroundColor: "rgba(15, 140, 125, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 0
          }]
        },
        options: chartOptions()
      });
    },
    renderVolumeChart(canvasId, points, label) {
      const canvas = byId(canvasId);
      const volumePoints = points.filter((point) => Number.isFinite(Number(point.volume)) && Number(point.volume) > 0);
      if (state.charts[canvasId]) state.charts[canvasId].destroy();
      delete state.charts[canvasId];
      if (!canvas || !window.Chart || !volumePoints.length) return;
      state.charts[canvasId] = new Chart(canvas, {
        type: "bar",
        data: {
          labels: volumePoints.map((point) => point.date),
          datasets: [{
            label,
            data: volumePoints.map((point) => point.volume),
            backgroundColor: "rgba(49, 102, 168, 0.45)",
            borderColor: cssVar("--blue")
          }]
        },
        options: chartOptions()
      });
    },
    renderAllocationChart(canvasId, entries) {
      const canvas = byId(canvasId);
      if (!canvas || !window.Chart || !entries.length) return;
      if (state.charts[canvasId]) state.charts[canvasId].destroy();
      const buckets = {};
      entries.forEach((entry) => {
        const asset = getAsset(entry.assetId);
        const quote = state.quotes[entry.assetId];
        const value = quote?.price && Number(entry.units) ? quote.price * Number(entry.units) : 1;
        buckets[asset.type] = (buckets[asset.type] || 0) + value;
      });
      state.charts[canvasId] = new Chart(canvas, {
        type: "pie",
        data: {
          labels: Object.keys(buckets),
          datasets: [{
            data: Object.values(buckets),
            backgroundColor: ["#0f8c7d", "#3166a8", "#b7791f", "#b53b45", "#59ca91", "#7aa9e8"]
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
      });
    },
    renderComparisonChart(canvasId, assets) {
      const canvas = byId(canvasId);
      if (!canvas || !window.Chart) return;
      if (state.charts[canvasId]) state.charts[canvasId].destroy();
      const datasets = assets.map((asset, index) => {
        const points = state.histories[asset.id] || [];
        const base = points[0]?.close || null;
        return {
          label: asset.ticker,
          data: points.map((point) => base ? ((point.close / base) - 1) * 100 : null),
          borderColor: ["#0f8c7d", "#3166a8", "#b7791f", "#b53b45"][index % 4],
          tension: 0.25,
          pointRadius: 0
        };
      });
      const labels = (state.histories[assets[0]?.id] || []).map((point) => point.date);
      state.charts[canvasId] = new Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: { ...chartOptions(), plugins: { legend: { display: true } } }
      });
    }
  };

  function openSettings() {
    renderSettingsOptions();
    drawerManager.open("settingsDrawer");
  }

  function closeDrawers() {
    drawerManager.close();
  }

  function saveSettings() {
    const existing = getSettings();
    const settings = {
      provider: byId("providerSelect").value,
      alphaKey: byId("alphaKey").value || existing.alphaKey || "",
      finnhubKey: byId("finnhubKey").value || existing.finnhubKey || "",
      fmpKey: byId("fmpKey").value || existing.fmpKey || "",
      twelveKey: byId("twelveKey").value || existing.twelveKey || "",
      polygonKey: byId("polygonKey").value || existing.polygonKey || "",
      newsKey: byId("newsKey").value || existing.newsKey || "",
      hfToken: byId("hfToken").value || existing.hfToken || "",
      hfModel: safeText(byId("hfModel").value) || existing.hfModel || DEFAULT_HF_MODEL,
      theme: byId("themeSetting").value,
      defaultCountry: byId("defaultCountry").value,
      cacheDuration: byId("cacheDuration").value,
      refreshInterval: byId("refreshInterval").value,
      priorityPreference: byId("priorityPreference").value,
      heroPreset: byId("heroPreset").value,
      heroImageUrl: safeText(byId("heroImageUrl").value),
      heroAccent: existing.heroAccent || null,
      heroIdentityVersion: 2,
      enableNotifications: byId("enableNotifications").checked,
      morningBriefNotifications: byId("morningBriefNotifications").checked,
      ipoNotifications: byId("ipoNotifications").checked,
      opportunityNotifications: byId("opportunityNotifications").checked,
      verificationAlerts: byId("verificationAlerts").checked,
      notificationTime: byId("notificationTime").value || "07:00",
      notificationFrequency: byId("notificationFrequency").value
    };
    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    localStorage.setItem(STORAGE.theme, JSON.stringify(settings.theme));
    state.settings = settings;
    themeManager.apply(settings.theme);
    heroImageService.applyFromSettings(settings);
    scheduleAutoRefresh();
    notificationService.save({
      morningBriefStatus: settings.enableNotifications
        ? "Preference saved; browser permission still controls delivery"
        : "Not scheduled until notifications are enabled and permission is granted"
    });
    renderOpportunityPanel();
    renderMorningBrief();
    renderNotificationCenter();
    renderAiPage();
    byId("settingsStatus").innerHTML = `<p class="success-message">Settings saved. Keys are stored locally for this prototype only.</p>`;
    showToast("Settings saved");
  }

  function scheduleAutoRefresh() {
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = 0;
    const interval = Number(getSettings().refreshInterval);
    if (!Number.isFinite(interval) || interval <= 0) {
      state.diagnostics.activeRefresh = "Manual only";
      renderStatus();
      return;
    }
    state.diagnostics.activeRefresh = `Every ${formatRefreshInterval(interval)}`;
    state.refreshTimer = window.setInterval(() => {
      refreshMarketData({ force: true });
    }, interval * 1000);
    renderStatus();
  }

  async function checkLocalProxyStatus() {
    if (window.location.protocol !== "file:") return;
    try {
      const response = await fetch("http://localhost:4173/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Local proxy health check failed");
      state.diagnostics.activeProvider = `${state.diagnostics.activeProvider} + local proxy`;
      state.diagnostics.cacheStatus = "Local proxy connected";
      state.diagnostics.suggestedFix = "Live regional quote coverage is available through the local proxy.";
    } catch {
      state.diagnostics.cacheStatus = "Local proxy not connected";
      state.diagnostics.suggestedFix = "Run node server.js or open http://localhost:4173 for full live regional quote coverage.";
    }
    renderStatus();
    renderDiagnostics();
  }

  function getSettings() {
    const defaults = {
      provider: "auto",
      theme: "dark",
      defaultCountry: "US",
      cacheDuration: "900",
      refreshInterval: "900",
      hfModel: DEFAULT_HF_MODEL,
      priorityPreference: "balanced",
      enableNotifications: false,
      morningBriefNotifications: true,
      ipoNotifications: true,
      opportunityNotifications: true,
      verificationAlerts: true,
      notificationTime: "07:00",
      notificationFrequency: "daily",
      heroPreset: "cover",
      heroImageUrl: "",
      heroAccent: null
    };
    const saved = readJson(STORAGE.settings, {});
    if (!saved.heroIdentityVersion && (!saved.heroPreset || saved.heroPreset === "mist") && !saved.heroImageUrl) {
      saved.heroPreset = "cover";
    }
    return { ...defaults, ...saved, heroIdentityVersion: 2 };
  }

  async function testApiConnection() {
    const settings = getSettings();
    const tests = [];
    if (settings.alphaKey) tests.push(["Alpha Vantage", fetchAlphaVantageQuote(getAsset("aapl"), settings.alphaKey)]);
    if (settings.finnhubKey) tests.push(["Finnhub", fetchFinnhubQuote(getAsset("aapl"), settings.finnhubKey)]);
    if (settings.fmpKey) tests.push(["FMP", fetchFmpQuote(getAsset("aapl"), settings.fmpKey)]);
    if (settings.twelveKey) tests.push(["Twelve Data", fetchTwelveDataQuote(getAsset("aapl"), settings.twelveKey)]);
    if (settings.hfToken) tests.push(["Hugging Face AI", huggingFaceService.testConnection(settings)]);
    tests.push(["CoinGecko", cryptoDataService.fetchCryptoPrice(getAsset("btc"))]);
    const results = await Promise.allSettled(tests.map(([, promise]) => promise));
    byId("settingsStatus").innerHTML = tests.map(([name], index) => {
      const ok = results[index].status === "fulfilled" && results[index].value?.status !== "Unavailable";
      return `<p class="${ok ? "success-message" : "data-message"}">${escapeHTML(name)}: ${ok ? "Connected" : "Failed or limited"}</p>`;
    }).join("");
  }

  async function requestNotificationPermission() {
    const settings = getSettings();
    if (!settings.enableNotifications) {
      byId("settingsStatus").innerHTML = `<p class="data-message">Turn on Enable notifications, save settings, then request browser permission.</p>`;
      renderNotificationCenter();
      return;
    }
    try {
      const status = await notificationService.requestPermission();
      renderNotificationCenter();
      byId("settingsStatus").innerHTML = `<p class="success-message">Notification permission status: ${escapeHTML(status.permissionStatus)}. No notification has been sent.</p>`;
    } catch (error) {
      byId("settingsStatus").innerHTML = `<p class="data-message">Notification permission could not be requested: ${escapeHTML(error.message || "Browser blocked the request")}.</p>`;
    }
  }

  function previewHeroFromControls() {
    const preset = byId("heroPreset").value;
    const image = preset === "custom" ? byId("heroImageUrl").value : HERO_PRESETS[preset];
    if (!image) return;
    heroImageService.applyImage(image);
    heroImageService.sampleAccent(image).then((accent) => {
      if (accent) heroImageService.applyAccent(accent);
    }).catch(() => {});
  }

  function handleHeroImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      byId("settingsStatus").innerHTML = `<p class="data-message">Please choose an image file.</p>`;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      byId("heroPreset").value = "custom";
      byId("heroImageUrl").value = String(reader.result || "");
      heroImageService.applyImage(byId("heroImageUrl").value);
      heroImageService.sampleAccent(byId("heroImageUrl").value).then((accent) => {
        if (accent) heroImageService.applyAccent(accent);
      }).catch(() => {});
      byId("settingsStatus").innerHTML = `<p class="success-message">Hero image loaded. Save settings to keep it.</p>`;
    };
    reader.readAsDataURL(file);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
      notificationService.save({ providerStatus: notificationService.providerStatus() });
      return;
    }
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => {
        notificationService.save({ providerStatus: "Service worker registered for static app shell only" });
        renderNotificationCenter();
      })
      .catch(() => {
        notificationService.save({ providerStatus: "Service worker registration failed" });
        renderNotificationCenter();
      });
  }

  function clearSavedSettings() {
    localStorage.removeItem(STORAGE.settings);
    state.settings = getSettings();
    scheduleAutoRefresh();
    renderSettingsOptions();
    renderOpportunityPanel();
    renderMorningBrief();
    renderNotificationCenter();
    byId("settingsStatus").innerHTML = `<p class="success-message">Saved settings cleared.</p>`;
  }

  function clearCache() {
    localStorage.removeItem(STORAGE.quotes);
    localStorage.removeItem(STORAGE.history);
    state.quotes = {};
    state.histories = {};
    state.diagnostics.cacheStatus = "Cache cleared";
    state.diagnostics.suggestedFix = "Refresh data to fetch public online sources again.";
    renderDiagnostics();
    renderOpportunityPanel();
    renderMorningBrief();
    renderNotificationCenter();
    renderAssetGrid();
    renderWatchlist();
    renderComparison();
    byId("settingsStatus").innerHTML = `<p class="success-message">Cached quotes and history cleared.</p>`;
    showToast("Cache cleared");
  }

  function addToWatchlist(assetId) {
    watchlistService.saveWatchlistItem(getAsset(assetId));
    renderAssetGrid();
    renderWatchlist();
    renderFeaturedAssets();
    showToast("Added to watchlist");
  }

  function toggleCompare(assetId) {
    if (state.compare.includes(assetId)) compareService.remove(assetId);
    else compareService.add(assetId);
    renderAssetGrid();
    renderComparison();
    renderFeaturedAssets();
  }

  function filteredAssets() {
    const query = state.search.toLowerCase().trim();
    return state.assets.filter((asset) => {
      const typeMatch = state.type === "All" || asset.type === state.type;
      const searchMatch = !query || [asset.ticker, asset.name, asset.type, asset.exchange, countryName(asset.country)].join(" ").toLowerCase().includes(query);
      return typeMatch && searchMatch;
    });
  }

  function applyTheme(theme) {
    const resolved = theme === "system"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.dataset.theme = resolved;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    const settings = { ...getSettings(), theme: next };
    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    localStorage.setItem(STORAGE.theme, JSON.stringify(next));
  }

  function chartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { maxTicksLimit: 6, color: cssVar("--muted") }, grid: { color: cssVar("--line") } },
        y: { ticks: { color: cssVar("--muted") }, grid: { color: cssVar("--line") } }
      },
      plugins: { legend: { display: false } }
    };
  }

  function fetchJson(url) {
    return fetchWithProxyFallback(url)
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 429 ? "API limit reached" : "Network or provider error");
        return response.json();
      })
      .catch((error) => {
        throw new Error(normalizeProviderError(error));
      });
  }

  function fetchText(url) {
    return fetchWithProxyFallback(url)
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 429 ? "API limit reached" : "Network or provider error");
        return response.text();
      })
      .catch((error) => {
        throw new Error(normalizeProviderError(error));
      });
  }

  function fetchWithProxyFallback(url) {
    const primary = proxiedUrl(url);
    return fetch(primary).catch((error) => {
      if (primary !== url) return fetch(url);
      throw error;
    });
  }

  function proxiedUrl(url) {
    const localServer = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (!/^https:\/\//i.test(url)) return url;
    if (localServer) return `/api/proxy?url=${encodeURIComponent(url)}`;
    if (window.location.protocol === "file:") return `http://localhost:4173/api/proxy?url=${encodeURIComponent(url)}`;
    return url;
  }

  function csvToObjects(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const headers = lines.shift()?.split(",") || [];
    return lines.map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
  }

  function rangeToDays(range) {
    return { "1D": 1, "5D": 5, "1M": 30, "6M": 180, YTD: "ytd", "1Y": 365, "5Y": 1825, Max: "max" }[range] || 30;
  }

  function cacheDurationMs() {
    return Number(getSettings().cacheDuration || 900) * 1000;
  }

  function cutoffForRange(range) {
    if (range === "Max") return null;
    if (range === "YTD") return Date.parse(`${new Date().getFullYear()}-01-01`);
    const days = Number(rangeToDays(range));
    return Number.isFinite(days) ? Date.now() - days * 86400000 : null;
  }

  function performanceFor(assetId, range) {
    const points = state.histories[assetId] || [];
    if (points.length < 2) return "Not available";
    const cutoff = cutoffForRange(range);
    const filtered = cutoff ? points.filter((point) => Date.parse(point.date) >= cutoff) : points;
    if (filtered.length < 2) return "Not available";
    const start = filtered[0].close;
    const end = filtered[filtered.length - 1].close;
    return changeText(end - start, start ? ((end - start) / start) * 100 : null);
  }

  function sparkline(asset) {
    const assetId = typeof asset === "string" ? asset : asset.id;
    const record = typeof asset === "string" ? getAsset(asset) : asset;
    const points = state.histories[assetId] || [];
    if (points.length < 2) return `<div class="sparkline empty">${hasPublicSource(record) ? "Chart data unavailable" : "Official feed required"}</div>`;
    const recent = points.slice(-24);
    const min = Math.min(...recent.map((point) => point.close));
    const max = Math.max(...recent.map((point) => point.close));
    const coords = recent.map((point, index) => {
      const x = (index / Math.max(recent.length - 1, 1)) * 100;
      const y = 34 - (((point.close - min) / Math.max(max - min, 1)) * 28 + 3);
      return `${x},${y}`;
    }).join(" ");
    return `<svg class="sparkline" viewBox="0 0 100 36" role="img" aria-label="Mini sparkline chart"><polyline points="${coords}"></polyline></svg>`;
  }

  function getAsset(assetId) {
    return window.assetCatalog.find((asset) => asset.id === assetId) || state.assets.find((asset) => asset.id === assetId);
  }

  function countryName(countryCode) {
    if (countryCode === "GLOBAL") return "Global";
    return window.countryConfigs[countryCode]?.name || countryCode || "Not available";
  }

  function isAssetInSelectedMarket(asset, countryCode = state.country) {
    if (!asset) return false;
    return asset.country === countryCode || asset.country === "GLOBAL";
  }

  function timezoneForCountry(countryCode) {
    return ({
      US: "America/New_York",
      GB: "Europe/London",
      GH: "Africa/Accra",
      NG: "Africa/Lagos",
      ZA: "Africa/Johannesburg",
      CA: "America/Toronto",
      DE: "Europe/Berlin",
      FR: "Europe/Paris",
      JP: "Asia/Tokyo",
      IN: "Asia/Kolkata",
      CN: "Asia/Hong_Kong",
      AU: "Australia/Sydney",
      GLOBAL: "UTC"
    })[countryCode] || "UTC";
  }

  function localeForCountry(countryCode) {
    return ({
      US: "en-US",
      GB: "en-GB",
      GH: "en-GH",
      NG: "en-NG",
      ZA: "en-ZA",
      CA: "en-CA",
      DE: "de-DE",
      FR: "fr-FR",
      JP: "ja-JP",
      IN: "en-IN",
      CN: "zh-HK",
      AU: "en-AU",
      GLOBAL: "en-US"
    })[countryCode] || undefined;
  }

  function assetTypeMatches(brokerType, assetType) {
    const broker = brokerType.toLowerCase();
    const asset = assetType.toLowerCase();
    return broker.includes(asset.replace(/s$/, "")) || asset.includes(broker.replace(/s$/, "")) || broker.includes("international");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function byIdOptional(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeText(value) {
    return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  }

  function safeHeroImageUrl(value) {
    const text = safeText(value);
    if (!text) return HERO_PRESETS.mist;
    if (Object.values(HERO_PRESETS).includes(text)) return text;
    if (/^data:image\//i.test(text)) return text;
    if (/^https?:\/\//i.test(text)) return text;
    if (/^assets\/[-\w./]+$/i.test(text)) return text;
    return HERO_PRESETS.mist;
  }

  function dominantColorFromPixels(data) {
    const buckets = new Map();
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 180) continue;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max - min;
      const brightness = (red + green + blue) / 3;
      if (saturation < 42 || brightness < 45 || brightness > 238) continue;
      const key = `${Math.round(red / 24) * 24},${Math.round(green / 24) * 24},${Math.round(blue / 24) * 24}`;
      const current = buckets.get(key) || { score: 0, red: 0, green: 0, blue: 0, count: 0 };
      current.score += saturation + Math.abs(brightness - 150) * 0.18;
      current.red += red;
      current.green += green;
      current.blue += blue;
      current.count += 1;
      buckets.set(key, current);
    }
    const best = [...buckets.values()].sort((left, right) => right.score - left.score)[0];
    if (!best) return null;
    return {
      red: Math.round(best.red / best.count),
      green: Math.round(best.green / best.count),
      blue: Math.round(best.blue / best.count)
    };
  }

  function accentSetFromRgb(color) {
    const primary = `rgb(${color.red}, ${color.green}, ${color.blue})`;
    const strong = `rgb(${lightenChannel(color.red, 42)}, ${lightenChannel(color.green, 42)}, ${lightenChannel(color.blue, 42)})`;
    const soft = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.2)`;
    const luminance = (0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue) / 255;
    return {
      primary,
      strong,
      soft,
      ink: luminance > 0.58 ? "#151514" : "#fff8ef"
    };
  }

  function lightenChannel(value, amount) {
    return Math.min(255, Math.round(Number(value) + amount));
  }

  function parseModelJson(text) {
    const cleaned = safeText(text)
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  function normalizeAiInsight(data, fallbackText, model) {
    const fallbackSummary = safeText(fallbackText) || "Hugging Face returned an empty response.";
    return {
      available: true,
      summary: safeText(data?.summary) || fallbackSummary,
      sentimentScore: safeText(data?.sentimentScore) || "Qualitative only",
      riskFactors: normalizeInsightList(data?.riskFactors),
      bullishFactors: normalizeInsightList(data?.bullishFactors),
      bearishFactors: normalizeInsightList(data?.bearishFactors),
      dataQuality: safeText(data?.dataQuality) || "Generated from the current quote and asset metadata only.",
      modelLabel: `Hugging Face model: ${model}`
    };
  }

  function normalizeInsightList(value) {
    if (Array.isArray(value)) return value.map(safeText).filter(Boolean).slice(0, 3);
    const text = safeText(value);
    return text ? [text] : [];
  }

  function insightList(items) {
    return normalizeInsightList(items).join(" / ");
  }

  function huggingFaceErrorMessage(status, detail) {
    if (status === 401 || status === 403) return "Hugging Face token was rejected. Add a token with Inference Providers permission in Advanced Settings.";
    if (status === 404) return "The selected Hugging Face model was not found or is not available through Inference Providers. Try another chat model.";
    if (status === 429) return "Hugging Face rate limit reached. Wait a bit or choose another available model.";
    const shortDetail = safeText(detail).slice(0, 160);
    return shortDetail ? `Hugging Face request failed (${status}): ${shortDetail}` : `Hugging Face request failed (${status}). If this is a browser/CORS issue, route requests through a secure backend proxy.`;
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function uniqueBy(items, key) {
    return [...new Map(items.map((item) => [item[key], item])).values()];
  }

  function finiteOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function parsePercent(value) {
    return finiteOrNull(String(value || "").replace("%", ""));
  }

  function formatMoney(value, currency) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not available";
    return new Intl.NumberFormat(localeForCountry(state.country), { style: "currency", currency: currency || countryConfigService.getCountryConfig(state.country).currency || "USD", maximumFractionDigits: Number(value) > 1000 ? 0 : 2 }).format(Number(value));
  }

  function formatNumber(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not available";
    return new Intl.NumberFormat(undefined, { notation: Number(value) >= 1000000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(Number(value));
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not available";
    return `${Number(value).toFixed(2)}%`;
  }

  function changeText(change, percent) {
    const safeChange = finiteOrNull(change);
    const safePercent = finiteOrNull(percent);
    if (safeChange === null && safePercent === null) return "Not available";
    const direction = (safeChange ?? safePercent) >= 0 ? "up" : "down";
    return `${direction} ${safeChange === null ? "N/A" : formatNumber(Math.abs(safeChange))} (${safePercent === null ? "N/A" : formatPercent(Math.abs(safePercent))})`;
  }

  function changeBadge(change, percent) {
    const safeChange = finiteOrNull(change);
    const safePercent = finiteOrNull(percent);
    if (safeChange === null && safePercent === null) return `<span class="change-badge neutral">Change not available</span>`;
    const up = (safeChange ?? safePercent) >= 0;
    return `<span class="change-badge ${up ? "up" : "down"}">${up ? "up" : "down"} ${safePercent === null ? "N/A" : formatPercent(Math.abs(safePercent))}</span>`;
  }

  function tickerOrbValue(asset, quote) {
    const safePercent = finiteOrNull(quote?.changePercent);
    const safePrice = finiteOrNull(quote?.price);
    if (safePercent !== null) return `${Math.abs(safePercent).toFixed(1)}%`;
    if (safePrice !== null) return compactMoney(safePrice, quote.currency || asset.currency);
    if (state.loading && hasPublicSource(asset)) return "...";
    return "N/A";
  }

  function compactMoney(value, currency) {
    if (!Number.isFinite(Number(value))) return "N/A";
    const number = Number(value);
    const symbol = currencySymbol(currency);
    if (Math.abs(number) >= 1000) return `${symbol}${new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(number)}`;
    if (Math.abs(number) >= 100) return `${symbol}${number.toFixed(0)}`;
    if (Math.abs(number) >= 10) return `${symbol}${number.toFixed(1)}`;
    return `${symbol}${number.toFixed(2)}`;
  }

  function currencySymbol(currency) {
    return { USD: "$", GBP: "£", EUR: "€", JPY: "¥", CAD: "C$", AUD: "A$", ZAR: "R", INR: "₹", HKD: "HK$", GHS: "GH₵", NGN: "₦" }[currency] || "";
  }

  function overviewCard(label, value, note) {
    return `<article class="overview-card"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><p>${escapeHTML(note)}</p></article>`;
  }

  function tag(text) {
    return `<span class="tag">${escapeHTML(text)}</span>`;
  }

  function mini(label, value) {
    return `<div class="mini"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "Not available")}</strong></div>`;
  }

  function miniScore(label, value) {
    return `<div class="mini-score"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "Not available")}</strong></div>`;
  }

  function briefRow(label, value) {
    return `<article class="brief-row"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "Not available")}</strong></article>`;
  }

  function stat(label, value) {
    return `<div class="stat"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "Not available")}</strong></div>`;
  }

  function availabilityScoreFor(asset, availability) {
    if (asset.country === "GH") return 92;
    if (asset.country === "GLOBAL") return 82;
    if (asset.type === "ETFs" && availability.accessAvailable) return 76;
    if (availability.accessAvailable) return 68;
    return hasPublicSource(asset) ? 50 : 28;
  }

  function riskScoreFor(asset) {
    const label = String(asset.risk || "").toLowerCase();
    if (label.includes("low")) return 84;
    if (label.includes("medium")) return 64;
    if (label.includes("high")) return 38;
    return 52;
  }

  function forecastQualityScoreFor(scenario) {
    const label = String(scenario.forecastQuality || scenario.confidenceLevel || "").toLowerCase();
    if (label.includes("high")) return 84;
    if (label.includes("medium")) return 64;
    if (label.includes("low")) return 36;
    return 48;
  }

  function freshnessScoreForGovernance(governance) {
    if (governance.freshness.status === "fresh") return 90;
    if (governance.freshness.status === "recent") return 72;
    if (governance.freshness.status === "stale") return 36;
    return 28;
  }

  function liquidityScoreFor(asset, quote) {
    const volume = finiteOrNull(quote?.volume);
    const avgVolume = finiteOrNull(quote?.avgVolume);
    if (volume && volume >= 10000000) return 88;
    if (volume && volume >= 1000000) return 76;
    if (volume && volume > 0) return 58;
    if (avgVolume && avgVolume > 0) return 62;
    if (asset.type === "ETFs" || asset.type === "Crypto") return hasPublicSource(asset) ? 55 : 35;
    return hasPublicSource(asset) ? 42 : 24;
  }

  function marketSignalScoreFor(signal, quote) {
    const percent = finiteOrNull(quote?.changePercent);
    if (percent === null) return 42;
    if (signal.label === "Positive Signal") return clampScore(62 + Math.min(Math.abs(percent) * 4, 25));
    if (signal.label === "Negative Signal") return clampScore(48 - Math.min(Math.abs(percent) * 3, 24));
    return 55;
  }

  function urgencyScoreFor(asset) {
    if (/ipo/i.test(asset.type || asset.name || "")) return 30;
    if (!hasPublicSource(asset)) return 45;
    return 52;
  }

  function currencyExposureScoreFor(asset) {
    const preference = getSettings().priorityPreference || "balanced";
    if (preference === "usd") return asset.currency === "USD" ? 92 : 44;
    if (asset.currency === "GHS") return 72;
    if (asset.currency === "USD") return 68;
    return 58;
  }

  function preferenceBoostFor(asset, scores) {
    const preference = getSettings().priorityPreference || "balanced";
    const reasons = {
      balanced: "Balanced mode is active, so no single asset class receives a strong preference boost.",
      ghana: "Ghana priority gives local Ghana assets and Ghana-accessible instruments extra watch weight.",
      global: "Global priority gives non-local and globally accessible assets extra watch weight.",
      etfs: "ETF priority increases watch weight for diversified fund structures.",
      ipos: "IPO priority is limited until subscription deadlines and official source data are connected.",
      lowerRisk: "Lower-risk priority increases watch weight for assets with lower risk labels.",
      growth: "Growth priority increases watch weight for stronger positive market signals.",
      usd: "USD priority increases watch weight for USD-denominated assets.",
      income: "Income priority increases watch weight when dividend or yield data is available."
    };
    let points = 0;
    if (preference === "ghana" && (asset.country === "GH" || scores.availabilityScore >= 80)) points += 8;
    if (preference === "global" && asset.country !== "GH") points += 7;
    if (preference === "etfs" && asset.type === "ETFs") points += 9;
    if (preference === "ipos" && /ipo/i.test(asset.type || asset.name || "")) points += 6;
    if (preference === "lowerRisk") points += scores.riskScore >= 75 ? 8 : scores.riskScore >= 60 ? 4 : -4;
    if (preference === "growth") points += scores.marketSignalScore >= 70 ? 8 : 2;
    if (preference === "usd" && asset.currency === "USD") points += 8;
    if (preference === "income" && finiteOrNull(scores.quote?.dividendYield) !== null) points += 8;
    return { points, reason: reasons[preference] || reasons.balanced };
  }

  function watchPriorityFor(score) {
    if (score >= 78) return "High Watch Priority";
    if (score >= 60) return "Medium Watch Priority";
    return "Low Watch Priority";
  }

  function rankingPreferenceLabel(preference) {
    return ({
      balanced: "Balanced",
      ghana: "Ghana",
      global: "Global",
      etfs: "ETFs",
      ipos: "IPOs",
      lowerRisk: "Lower Risk",
      growth: "Higher Growth",
      usd: "USD",
      income: "Income"
    })[preference] || "Balanced";
  }

  function preferenceChangeExplanation(preference) {
    const label = rankingPreferenceLabel(preference);
    if (preference === "balanced") return "Balanced mode uses accessibility, Ghana availability, confidence, reliability, freshness, market signals, liquidity, risk, urgency, and currency exposure with no extra category tilt.";
    return `${label} preference adds a small watch-priority boost to matching assets. Scores still depend on source confidence, freshness, reliability, risk, liquidity, and limitations. This is monitoring priority, not advice.`;
  }

  function currencyExposureSummary(rankings) {
    const buckets = {};
    rankings.forEach((item) => {
      const currency = item.asset.currency || "Unknown";
      buckets[currency] = (buckets[currency] || 0) + 1;
    });
    return Object.entries(buckets).slice(0, 4).map(([currency, count]) => `${currency}: ${count}`).join(", ") || "No exposure data yet";
  }

  function riskNoteFor(rankings) {
    const highRisk = rankings.filter((item) => /high/i.test(item.asset.risk || "")).length;
    const unavailable = rankings.filter((item) => finiteOrNull(item.quote?.price) === null).length;
    if (highRisk) return `${highRisk} high-risk asset${highRisk === 1 ? "" : "s"} need extra review before monitoring changes.`;
    if (unavailable) return `${unavailable} asset${unavailable === 1 ? "" : "s"} have unavailable live price data, reducing ranking confidence.`;
    return "Risk scoring favors lower-risk labels and penalizes stale or incomplete source data.";
  }

  function sentenceCase(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
  }

  function statusPill(label, value) {
    return `<span class="status-pill"><strong>${escapeHTML(label)}</strong>${escapeHTML(value)}</span>`;
  }

  function priorityTile(label, value, note) {
    return `<article class="priority-tile"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><p>${escapeHTML(note)}</p></article>`;
  }

  function sourceCard(source) {
    const weight = trustPolicy.sourceWeights[source.type] || 0;
    return `
      <article class="source-card">
        <div>
          <span>${escapeHTML(source.type)}</span>
          <strong>${escapeHTML(source.name)}</strong>
        </div>
        <p>${escapeHTML(source.coverage || source.status || "Source metadata available.")}</p>
        <small>Source weight ${weight}/100 · ${escapeHTML(source.status || "Status unknown")}</small>
        <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">Open source</a>
      </article>
    `;
  }

  function learnCard(title, body) {
    return `<article class="learn-card"><span>Concept</span><strong>${escapeHTML(title)}</strong><p>${escapeHTML(body)}</p></article>`;
  }

  function sourceTypeFor(sourceName, asset) {
    if (asset.officialUrl || /official|exchange|required/i.test(sourceName)) return "Official exchange";
    if (/coingecko|stooq|yahoo|alpha|finnhub|financial modeling|twelve/i.test(sourceName)) return "Established financial data API";
    return "Unavailable";
  }

  function sourceUrlFor(asset, sourceName) {
    if (asset.officialUrl) return asset.officialUrl;
    if (/coingecko/i.test(sourceName)) return "https://www.coingecko.com";
    if (/stooq/i.test(sourceName)) return "https://stooq.com";
    if (/yahoo/i.test(sourceName)) return "https://finance.yahoo.com";
    if (/alpha/i.test(sourceName)) return "https://www.alphavantage.co";
    if (/finnhub/i.test(sourceName)) return "https://finnhub.io";
    return "";
  }

  function sourceModeFor(asset, quote) {
    if (quote?.isCached) return "Cached market data";
    if (finiteOrNull(quote?.price) !== null) return "Live or recently fetched public data";
    if (!hasPublicSource(asset)) return "Official or licensed source required";
    return "Unavailable from current source";
  }

  function confidenceScoreFor(asset, quote, sourceName) {
    if (!quote || quote.status === "Unavailable" || finiteOrNull(quote.price) === null) return hasPublicSource(asset) ? 35 : 15;
    const sourceType = sourceTypeFor(sourceName, asset);
    const weight = trustPolicy.sourceWeights[sourceType] || 40;
    const missingPenalty = missingFieldsFor(asset, quote).length * 4;
    const cachePenalty = quote.isCached ? 12 : 0;
    return clampScore(weight - missingPenalty - cachePenalty);
  }

  function reliabilityScoreFor(asset, quote, sourceName) {
    if (!hasPublicSource(asset)) return 30;
    let score = /stooq|yahoo|coingecko/i.test(sourceName) ? 72 : 62;
    if (quote?.isCached) score -= 12;
    if (quote?.error || quote?.status === "Unavailable") score -= 25;
    return clampScore(score);
  }

  function dataStatusFor(asset, quote) {
    if (!hasPublicSource(asset)) return "Official feed required";
    if (!quote) return "Waiting for source";
    if (quote.status === "Unavailable" || finiteOrNull(quote.price) === null) return "Needs review";
    return quote.isCached ? "Cached" : "Fresh";
  }

  function freshnessFor(timestamp) {
    if (!timestamp) return { status: "unknown", label: "Freshness unknown" };
    const ageHours = (Date.now() - Date.parse(timestamp)) / 3600000;
    if (!Number.isFinite(ageHours)) return { status: "unknown", label: "Freshness unknown" };
    if (ageHours <= 24) return { status: "fresh", label: "Fresh" };
    if (ageHours <= 72) return { status: "review", label: "Needs Review" };
    return { status: "stale", label: "Stale" };
  }

  function missingFieldsFor(asset, quote) {
    if (!quote) return ["price", "change", "changePercent", "volume", "marketCap"];
    const fields = ["price", "change", "changePercent", "volume", "marketCap", "previousClose"];
    return fields.filter((field) => quote[field] === null || quote[field] === undefined || quote[field] === "");
  }

  function verificationNotesFor(asset, quote) {
    if (!hasPublicSource(asset)) return "No public no-key market endpoint is configured. Verify with official exchange or licensed provider.";
    if (!quote) return "Data fetch has not completed.";
    if (quote.isCached) return "Using cached data. Verify freshness before making decisions.";
    if (missingFieldsFor(asset, quote).length) return "Some fields are missing from the current provider and are not estimated.";
    return "Source-backed data returned without detected conflicts.";
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function providerLabel(provider) {
    return {
      auto: "Auto",
      stooq: "Stooq",
      coingecko: "CoinGecko",
      alphavantage: "Alpha Vantage",
      finnhub: "Finnhub",
      fmp: "FMP",
      twelvedata: "Twelve Data",
      polygon: "Polygon.io",
      newsapi: "NewsAPI",
      yahoo: "Yahoo chart",
      public: "Public source"
    }[provider] || provider;
  }

  function availableAdvancedProviders(settings) {
    const selected = settings.provider || "auto";
    if (["stooq", "coingecko"].includes(selected)) return [];
    if (selected !== "auto") return [selected].filter((provider) => providerHasKey(provider, settings));
    return ["alphavantage", "finnhub", "fmp", "twelvedata", "polygon"].filter((provider) => providerHasKey(provider, settings));
  }

  function providerHasKey(provider, settings) {
    return {
      alphavantage: Boolean(settings.alphaKey),
      finnhub: Boolean(settings.finnhubKey),
      fmp: Boolean(settings.fmpKey),
      twelvedata: Boolean(settings.twelveKey),
      polygon: Boolean(settings.polygonKey),
      newsapi: Boolean(settings.newsKey),
      stooq: true,
      coingecko: true
    }[provider] || false;
  }

  function hasPublicSource(asset) {
    return Boolean(asset?.stooqSymbol || asset?.yahooSymbol || asset?.coinGeckoId);
  }

  function publicProvidersFor(asset) {
    if (asset.type === "Crypto") return ["coingecko"];
    return [
      asset.stooqSymbol ? "stooq" : "",
      asset.yahooSymbol ? "yahoo" : ""
    ].filter(Boolean);
  }

  function hasLiveQuoteSource(asset, settings, provider = "auto") {
    if (hasPublicSource(asset)) return true;
    const advanced = provider === "auto" ? availableAdvancedProviders(settings) : [provider].filter((item) => providerHasKey(item, settings));
    return advanced.some((item) => asset.providerSymbols?.[item] || asset.dataSources?.some((source) => source.toLowerCase().includes(providerLabel(item).toLowerCase())));
  }

  function coverageSource(asset) {
    if (asset?.stooqSymbol) return "Stooq public CSV";
    if (asset?.yahooSymbol) return "Yahoo chart public endpoint";
    if (asset?.coinGeckoId) return "CoinGecko public API";
    return asset.dataSources?.[0] || "Official exchange or licensed provider required";
  }

  function coverageMessage(asset) {
    if (hasPublicSource(asset)) return "Live data is unavailable from the configured public source right now. Retry later or add an advanced provider.";
    return `${asset.ticker} is listed for research context, but no free browser-readable live quote endpoint is configured. Connect an official exchange feed, licensed provider, or backend proxy to refresh it live.`;
  }

  function formatRefreshInterval(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.round(seconds / 60);
    return minutes === 60 ? "1 hour" : `${minutes} minutes`;
  }

  function yahooChartUrl(symbol, range, interval) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  }

  function yahooRangeFor(range) {
    return {
      "1D": "1d",
      "5D": "5d",
      "1M": "1mo",
      "6M": "6mo",
      "YTD": "ytd",
      "1Y": "1y",
      "5Y": "5y",
      "Max": "max"
    }[range] || "1mo";
  }

  function yahooIntervalFor(range) {
    return range === "1D" ? "5m" : "1d";
  }

  function normalizeYahooPrice(value, yahooCurrency, assetCurrency) {
    const number = finiteOrNull(value);
    if (number === null) return null;
    if (yahooCurrency === "ZAc" && assetCurrency === "ZAR") return number / 100;
    if (yahooCurrency === "GBp" && assetCurrency === "GBP") return number / 100;
    return number;
  }

  function lastFinite(values = []) {
    return [...values].reverse().find((value) => Number.isFinite(Number(value))) ?? null;
  }

  function resetDiagnosticsForRequest() {
    state.diagnostics.failedAttempts = [];
    state.diagnostics.rateLimitWarnings = [];
    state.diagnostics.corsWarnings = [];
    state.diagnostics.publicSourceStatus = "Checking sources";
    state.diagnostics.cacheStatus = "Cache available if online sources fail";
  }

  function normalizeProviderError(error) {
    const message = safeText(error?.message || "Provider failed");
    if (/failed to fetch|network/i.test(message)) {
      return "This public data source could not be reached directly from the browser. For production, route this request through a secure backend proxy.";
    }
    if (/429|rate|limit/i.test(message)) return "API rate limit reached";
    return message;
  }

  function apiKeySummary(settings) {
    const count = ["alphaKey", "finnhubKey", "fmpKey", "twelveKey", "polygonKey", "newsKey", "hfToken"].filter((key) => settings[key]).length;
    return count ? `${count} saved locally` : "None saved";
  }

  function formatTime(timestamp) {
    if (!timestamp) return "Not yet";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Not yet";
    return new Intl.DateTimeFormat(localeForCountry(state.country), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezoneForCountry(state.country),
      timeZoneName: "short"
    }).format(date);
  }

  function comparisonRow(label, values) {
    return `<tr><th>${escapeHTML(label)}</th>${values.map((value) => `<td>${escapeHTML(value)}</td>`).join("")}</tr>`;
  }

  function emptyState(message) {
    return `<div class="empty-state"><h3>No data to show</h3><p>${escapeHTML(message)}</p></div>`;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function setStoredPlaceholder(id, value) {
    const input = byId(id);
    input.value = "";
    input.placeholder = value ? `Saved locally · ${maskSecret(value)}` : "Prototype-only local storage";
  }

  function maskSecret(value) {
    const text = String(value || "");
    return text ? `••••••••${text.slice(-4)}` : "";
  }

  function showToast(message) {
    toastManager.show(message);
  }

  window.dataSourceManager = dataSourceManager;
  window.apiClient = apiClient;
  window.publicMarketDataService = publicMarketDataService;
  window.advancedApiService = advancedApiService;
  window.marketDataService = marketDataService;
  window.cryptoDataService = cryptoDataService;
  window.brokerDirectoryService = brokerDirectoryService;
  window.countryConfigService = countryConfigService;
  window.watchlistService = watchlistService;
  window.compareService = compareService;
  window.huggingFaceService = huggingFaceService;
  window.aiInsightService = aiInsightService;
  window.diagnosticsService = diagnosticsService;
  window.chartService = chartService;
  window.fetchStockQuote = (ticker, provider) => dataSourceManager.fetchQuote(window.assetCatalog.find((asset) => asset.ticker === ticker), { provider });
  window.fetchHistoricalPrices = (ticker, range) => dataSourceManager.fetchHistory(window.assetCatalog.find((asset) => asset.ticker === ticker), range || "1M");
  window.fetchCryptoPrice = (assetId) => cryptoDataService.fetchCryptoPrice(getAsset(assetId));
  window.fetchMarketOverview = (country) => marketDataService.assetsForCountry(country || state.country);
  window.getCountryConfig = countryConfigService.getCountryConfig;
  window.getBrokerOptions = brokerDirectoryService.getBrokerOptions;
  window.saveWatchlistItem = (assetId) => watchlistService.saveWatchlistItem(getAsset(assetId));
  window.removeWatchlistItem = watchlistService.removeWatchlistItem;
  window.getWatchlist = watchlistService.getWatchlist;
  window.saveSettings = saveSettings;
  window.getSettings = getSettings;
  window.testApiConnection = testApiConnection;
  window.fetchAiInsight = aiInsightService.fetchAiInsight;
})();
