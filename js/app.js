/**
 * Indian Stock Exchanges (NSE & BSE) Official API Documentation & Explorer
 * Adaptive Architecture:
 * - Laptop / PC (>= 768px): Unified workstation view with horizontal tabs & live detail pane (the view you loved)
 * - Mobile (< 768px): Clean vertical scroll feed where all endpoints are visible with 1-tap drill-down
 */

let apiDatabase = [];
let activeApi = null;
let currentViewer = null;
let searchQuery = "";
let selectedCategory = "ALL";
let activeSubTabKey = null;

// Track whether mobile is currently in detail drill-down
let isMobileDetailActive = false;

// Query parameters state for customizable endpoints (e.g. BSE Bulk Deals)
let currentQueryParams = {
  DealType: "1",
  FDate: "25/09/2026",
  TDate: "25/09/2026",
  sc_code: ""
};

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  try {
    const res = await fetch("data/apis.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    apiDatabase = data.apis || [];

    // Set initial active API
    const hash = window.location.hash.replace("#", "");
    const initialApi = apiDatabase.find((a) => a.id === hash) || apiDatabase[0];
    if (initialApi) {
      activeApi = initialApi;
      if (initialApi.hasSubTabs && initialApi.subTabs && initialApi.subTabs.length > 0) {
        activeSubTabKey = initialApi.subTabs[0].key;
      }
      if (initialApi.hasDateRangeFilter && initialApi.dateRangeConfig) {
        currentQueryParams = {
          DealType: initialApi.dateRangeConfig.defaultDealType || "1",
          FDate: initialApi.dateRangeConfig.defaultFDate || "25/09/2026",
          TDate: initialApi.dateRangeConfig.defaultTDate || "25/09/2026",
          sc_code: initialApi.dateRangeConfig.defaultScCode || ""
        };
      }
    }

    // If mobile loaded with a specific hash, go to detail directly; otherwise show list feed
    if (hash && isMobileScreen() && apiDatabase.some((a) => a.id === hash)) {
      isMobileDetailActive = true;
    } else {
      isMobileDetailActive = false;
    }

    renderApp();
    setupEventListeners();
  } catch (err) {
    console.error("Failed to load apis.json:", err);
    const detailMount = document.getElementById("detail-content-mount");
    if (detailMount) {
      detailMount.innerHTML = `
        <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-800">
          <h3 class="font-bold text-sm mb-1">Unable to Load API Data</h3>
          <p class="text-xs text-red-600 mb-3">If running locally, please serve this folder via an HTTP server.</p>
          <code class="text-xs bg-white px-3 py-1.5 rounded border border-red-200 text-gray-800">python -m http.server 8000</code>
        </div>
      `;
    }
  }
}

function isMobileScreen() {
  return window.innerWidth < 768;
}

function setupEventListeners() {
  const searchInput = document.getElementById("global-search");
  const clearBtn = document.getElementById("clear-search-btn");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (clearBtn) {
        if (searchQuery.trim().length > 0) {
          clearBtn.classList.remove("hidden");
        } else {
          clearBtn.classList.add("hidden");
        }
      }

      // If user types on mobile while in detail view, return to list to show matches
      if (isMobileScreen() && isMobileDetailActive && searchQuery.trim().length > 0) {
        isMobileDetailActive = false;
      }

      performSearch();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchQuery = "";
        clearBtn.classList.add("hidden");
        performSearch();
        searchInput.focus();
      }
    });
  }

  // Handle window resizing (transitioning between mobile & laptop)
  window.addEventListener("resize", () => {
    renderApp();
  });

  // Handle back button / hash changes safely
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    if (hash && apiDatabase.some((a) => a.id === hash)) {
      const targetApi = apiDatabase.find((a) => a.id === hash);
      if (targetApi) {
        selectApi(targetApi.id, isMobileScreen());
      }
    } else if (isMobileScreen()) {
      mobileGoBackToList();
    }
  });
}

function handleLogoClick() {
  searchQuery = "";
  selectedCategory = "ALL";
  const searchInput = document.getElementById("global-search");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("clear-search-btn");
  if (clearBtn) clearBtn.classList.add("hidden");

  if (isMobileScreen()) {
    isMobileDetailActive = false;
  }
  if (apiDatabase.length > 0) {
    selectApi(apiDatabase[0].id, false);
  }
  renderApp();
}

function renderApp() {
  renderDesktopHeader();
  renderMobileHeader();

  if (isMobileScreen()) {
    // MOBILE VIEW LOGIC
    const mobileListView = document.getElementById("mobile-list-view");
    const detailViewContainer = document.getElementById("detail-view-container");
    const mobileSubheader = document.getElementById("mobile-subheader");

    if (isMobileDetailActive) {
      if (mobileListView) mobileListView.classList.add("hidden");
      if (detailViewContainer) detailViewContainer.classList.remove("hidden");
      if (mobileSubheader) mobileSubheader.classList.add("hidden");
      renderDetailContent(activeApi);
    } else {
      if (mobileListView) mobileListView.classList.remove("hidden");
      if (detailViewContainer) detailViewContainer.classList.add("hidden");
      if (mobileSubheader) mobileSubheader.classList.remove("hidden");
      renderMobileCardsFeed(getFilteredApis());
    }
  } else {
    // LAPTOP / DESKTOP VIEW LOGIC (Exact layout the user loved!)
    const mobileListView = document.getElementById("mobile-list-view");
    const detailViewContainer = document.getElementById("detail-view-container");

    if (mobileListView) mobileListView.classList.add("hidden");
    if (detailViewContainer) detailViewContainer.classList.remove("hidden");

    renderDesktopTabs(getFilteredApis());
    renderDetailContent(activeApi);
  }
}

function getFilteredApis() {
  const q = searchQuery.trim();
  let baseList = selectedCategory === "ALL" ? apiDatabase : apiDatabase.filter((a) => a.category === selectedCategory);

  if (!q) return baseList;

  // Use robust search engine
  const scored = [];
  apiDatabase.forEach((api) => {
    const score = window.scoreApiMatch ? window.scoreApiMatch(api, q) : 0;
    if (score > 0) {
      if (selectedCategory === "ALL" || api.category === selectedCategory) {
        scored.push({ api, score });
      }
    }
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.api);
}

function performSearch() {
  const filtered = getFilteredApis();
  updateStatusBadges(filtered.length);

  if (isMobileScreen()) {
    renderMobileCardsFeed(filtered);
  } else {
    renderDesktopTabs(filtered);
    if (filtered.length > 0 && !filtered.some((a) => a.id === activeApi?.id)) {
      selectApi(filtered[0].id, false);
    } else if (filtered.length === 0) {
      showEmptyDesktopDetail();
    }
  }
}

function updateStatusBadges(count) {
  const dBadge = document.getElementById("desktop-search-badge");
  const mBadge = document.getElementById("mobile-search-badge");
  const text = `${count} ${count === 1 ? "Endpoint" : "Endpoints"}`;

  if (dBadge) dBadge.innerText = text;
  if (mBadge) mBadge.innerText = `${count} APIs`;
}

// -------------------------------------------------------------
// LAPTOP / DESKTOP COMPONENT RENDERING
// -------------------------------------------------------------

function renderDesktopHeader() {
  const breadcrumb = document.getElementById("desktop-breadcrumb-category");
  if (breadcrumb && activeApi) {
    breadcrumb.innerText = activeApi.categoryPath || activeApi.category;
  }
}

function renderDesktopTabs(list) {
  const container = document.getElementById("desktop-tabs-list");
  if (!container) return;

  const currentList = list || apiDatabase;

  if (currentList.length === 0) {
    container.innerHTML = `<span class="text-xs text-gray-400 py-1 italic">No matching endpoints found</span>`;
    return;
  }

  container.innerHTML = currentList
    .map((api) => {
      const isActive = activeApi && activeApi.id === api.id;
      const shortTitle = api.shortName || api.name.replace("Pre-Open Market: ", "");
      const isMulti = api.publishTimes && api.publishTimes.length > 1;
      const isBse = api.exchange === "BSE";

      let badgeText = "09:08 AM";
      if (isBse) {
        badgeText = "BSE EOD";
      } else if (isMulti) {
        badgeText = `${api.publishTimes.length} Windows`;
      }

      return `
      <button onclick="selectApi('${api.id}', false)" id="desktop-tab-${api.id}"
        class="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center space-x-2 border shadow-xs ${
          isActive
            ? "bg-[#002855] text-white border-[#002855] shadow-md"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
        }">
        <span>${shortTitle}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${
          isActive
            ? "bg-amber-400 text-gray-900 font-extrabold"
            : isBse
              ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
              : isMulti ? "bg-blue-100 text-blue-800 font-medium" : "bg-amber-100 text-amber-800 font-medium"
        }">${badgeText}</span>
      </button>
    `;
    })
    .join("");
}

// -------------------------------------------------------------
// MOBILE COMPONENT RENDERING
// -------------------------------------------------------------

function renderMobileHeader() {
  const container = document.getElementById("mobile-category-pills");
  if (!container) return;

  const categories = ["ALL", ...new Set(apiDatabase.map((a) => a.category).filter(Boolean))];

  container.innerHTML = categories
    .map((cat) => {
      const isSelected = selectedCategory === cat;
      const count = cat === "ALL" ? apiDatabase.length : apiDatabase.filter((a) => a.category === cat).length;
      return `
      <button onclick="setMobileCategoryFilter('${cat}')"
        class="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
          isSelected
            ? "bg-[#002855] text-white border-[#002855] shadow-xs"
            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
        }">
        <span>${cat}</span>
        <span class="ml-0.5 text-[10px] ${isSelected ? "text-amber-300 font-bold" : "text-gray-500"}">(${count})</span>
      </button>
    `;
    })
    .join("");
}

function setMobileCategoryFilter(cat) {
  selectedCategory = cat;
  renderMobileHeader();
  performSearch();
}

function renderMobileCardsFeed(list) {
  const container = document.getElementById("mobile-cards-feed");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-xs">
        <div class="text-3xl mb-2">🔍</div>
        <h3 class="text-base font-bold text-gray-800 mb-1">No Endpoints Found</h3>
        <p class="text-xs text-gray-500 mb-3">No API matches your search query.</p>
        <button onclick="handleLogoClick()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-[#002855] text-white">
          Reset View
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map((api) => {
      const isMulti = api.publishTimes && api.publishTimes.length > 1;
      const isBse = api.exchange === "BSE";

      return `
      <!-- ENDPOINT CARD FOR MOBILE SCROLL VIEW -->
      <div class="endpoint-card bg-white border border-gray-200 hover:border-[#002855] rounded-2xl p-4 shadow-xs space-y-2.5">
        
        <!-- Category & Method Badge -->
        <div class="flex items-center justify-between gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[#a6192e] bg-red-50 px-2 py-0.5 rounded border border-red-100 truncate">
            ${api.categoryPath || api.category}
          </span>
          <div class="flex items-center space-x-1 flex-shrink-0">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isBse ? "bg-[#003b7a] text-amber-300" : "bg-[#002855] text-white"}">
              ${api.exchange || "NSE"} &bull; ${api.method || "GET"}
            </span>
            ${
              api.hasDateRangeFilter
                ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">Date Range</span>`
                : api.hasSubTabs
                  ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">3 Datasets</span>`
                  : `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live</span>`
            }
          </div>
        </div>

        <!-- Name & Description -->
        <div>
          <h2 class="text-base font-bold text-[#002855] leading-snug">
            ${api.name}
          </h2>
          <p class="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
            ${api.description}
          </p>
        </div>

        <!-- Path Box -->
        <div class="bg-[#f8fafc] border border-gray-200 rounded-lg px-2.5 py-1 font-mono-code text-[11px] text-gray-700 truncate">
          <span class="text-[#003b7a] font-semibold">${api.path}</span>
        </div>

        <!-- Fetch Timing Pill -->
        <div class="bg-amber-50/90 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 flex items-center justify-between">
          <div class="flex items-center space-x-1.5 truncate">
            <span>🕒</span>
            <span class="font-bold text-[10px] uppercase tracking-wider">Fetch:</span>
            <span class="font-bold font-mono-code text-[11px] text-[#002855] truncate">${api.fetchTime}</span>
          </div>
          <span class="text-[10px] text-amber-700 font-semibold flex-shrink-0 ml-1">
            ${isBse ? "EOD" : isMulti ? `${api.publishTimes.length} Windows` : "Pre-Market"}
          </span>
        </div>

        <!-- Touch-Friendly Button to Open Details -->
        <div class="pt-1">
          <button onclick="mobileOpenDetail('${api.id}')" 
            class="w-full h-11 px-4 text-xs font-bold rounded-xl bg-[#002855] hover:bg-[#001a38] text-white flex items-center justify-center space-x-2 shadow-xs transition active:scale-[0.99]">
            <span>View Details & JSON Data</span>
            <span class="text-sm">➔</span>
          </button>
        </div>

      </div>
    `;
    })
    .join("");
}

function mobileOpenDetail(apiId) {
  selectApi(apiId, true);
}

function mobileGoBackToList() {
  isMobileDetailActive = false;
  // Clean hash without throwing SecurityError
  try {
    if (window.location.hash) {
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  } catch (e) {
    window.location.hash = "";
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------------------------------------------------
// DYNAMIC PATH & QUERY PARAMETERS
// -------------------------------------------------------------

function getDynamicPath(api) {
  if (!api) return "";
  if (!api.hasDateRangeFilter) return api.path;

  const dt = currentQueryParams.DealType || "1";
  const fDate = currentQueryParams.FDate || "25/09/2026";
  const tDate = currentQueryParams.TDate || "25/09/2026";
  const sc = currentQueryParams.sc_code || "";

  return `/BseIndiaAPI/api/BulkDealData_ng/w?DealType=${dt}&sc_code=${encodeURIComponent(sc)}&FDate=${fDate}&TDate=${tDate}`;
}

function handleParamChange() {
  if (!activeApi || !activeApi.hasDateRangeFilter) return;

  const dealTypeSelect = document.getElementById("query-deal-type");
  const fDateInput = document.getElementById("query-fdate");
  const tDateInput = document.getElementById("query-tdate");
  const scCodeInput = document.getElementById("query-sc-code");

  if (dealTypeSelect) currentQueryParams.DealType = dealTypeSelect.value;
  if (fDateInput) currentQueryParams.FDate = fDateInput.value.trim();
  if (tDateInput) currentQueryParams.TDate = tDateInput.value.trim();
  if (scCodeInput) currentQueryParams.sc_code = scCodeInput.value.trim();

  // If DealType was changed, automatically update the active subtab
  if (currentQueryParams.DealType === "2" && activeSubTabKey !== "BLOCK_DEALS") {
    activeSubTabKey = "BLOCK_DEALS";
  } else if (currentQueryParams.DealType === "1" && activeSubTabKey === "BLOCK_DEALS") {
    activeSubTabKey = "BULK_DEALS";
  }

  updateDynamicEndpointView();
}

function applyDatePreset(presetKey) {
  if (!activeApi || !activeApi.hasDateRangeFilter) return;

  let f = "25/09/2026";
  let t = "25/09/2026";

  if (presetKey === "closing") {
    f = "25/09/2026";
    t = "25/09/2026";
  } else if (presetKey === "2days") {
    f = "24/09/2026";
    t = "25/09/2026";
  } else if (presetKey === "7days") {
    f = "19/09/2026";
    t = "25/09/2026";
  } else if (presetKey === "month") {
    f = "01/09/2026";
    t = "25/09/2026";
  }

  currentQueryParams.FDate = f;
  currentQueryParams.TDate = t;

  const fDateInput = document.getElementById("query-fdate");
  const tDateInput = document.getElementById("query-tdate");
  if (fDateInput) fDateInput.value = f;
  if (tDateInput) tDateInput.value = t;

  updateDynamicEndpointView();
}

function updateDynamicEndpointView() {
  if (!activeApi) return;

  const path = getDynamicPath(activeApi);
  const fullUrl = `${activeApi.baseUrl}${path}`;

  // Update URL span
  const pathSpan = document.getElementById("endpoint-url-path");
  if (pathSpan) pathSpan.innerText = path;

  // Update Copy button action
  const copyBtn = document.getElementById("btn-copy-url");
  if (copyBtn) {
    copyBtn.setAttribute("onclick", `navigator.clipboard.writeText('${fullUrl}'); window.showToast('Copied custom URL to clipboard!');`);
  }

  // Update Open in Exchange link
  const openLink = document.getElementById("btn-open-exchange");
  if (openLink) {
    openLink.setAttribute("href", fullUrl);
  }

  // Update Active Range label
  const rangeLabel = document.getElementById("active-range-label");
  if (rangeLabel) {
    rangeLabel.innerText = `${currentQueryParams.FDate} to ${currentQueryParams.TDate}`;
  }

  // Update subtab buttons highlight
  document.querySelectorAll("[id^='subtab-btn-']").forEach((btn) => {
    btn.className = "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 border shadow-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-100";
  });
  const activeBtn = document.getElementById(`subtab-btn-${activeSubTabKey}`);
  if (activeBtn) {
    activeBtn.className = "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shadow-sm bg-[#002855] text-white border-[#002855]";
  }

  // Update snippet
  const activeSnippetType = document.getElementById("btn-snip-curl")?.classList.contains("bg-[#002855]") ? "curl" : "python";
  updateSnippet(activeApi, activeSnippetType);

  // Re-render json tree
  renderJsonTreeForCurrentView();

  // Update record count
  const countElem = document.getElementById("viewer-record-count");
  if (countElem) countElem.innerText = getActiveRecordCount(activeApi);

  const statusLabel = document.getElementById("filter-status-label");
  if (statusLabel) {
    const data = getActiveViewData(activeApi);
    const count = Array.isArray(data) ? data.length : 1;
    statusLabel.innerText = `${count} Records Found`;
  }
}

// -------------------------------------------------------------
// SELECT API & DETAIL VIEW RENDERING
// -------------------------------------------------------------

function selectApi(apiId, openInMobile = false) {
  const api = apiDatabase.find((a) => a.id === apiId);
  if (!api) return;

  activeApi = api;
  
  if (openInMobile) {
    isMobileDetailActive = true;
  }

  // Initialize query params for date-filterable APIs
  if (api.hasDateRangeFilter && api.dateRangeConfig) {
    currentQueryParams = {
      DealType: api.dateRangeConfig.defaultDealType || "1",
      FDate: api.dateRangeConfig.defaultFDate || "25/09/2026",
      TDate: api.dateRangeConfig.defaultTDate || "25/09/2026",
      sc_code: api.dateRangeConfig.defaultScCode || ""
    };
  }

  // Set subTab default
  if (api.hasSubTabs && api.subTabs && api.subTabs.length > 0) {
    activeSubTabKey = api.subTabs[0].key;
  } else {
    activeSubTabKey = null;
  }

  try {
    window.location.hash = api.id;
  } catch (e) {}

  renderApp();

  if (openInMobile) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderDetailContent(api) {
  const container = document.getElementById("detail-content-mount");
  if (!container || !api) return;

  const currentPath = getDynamicPath(api);
  const fullUrl = `${api.baseUrl}${currentPath}`;
  const isMultiSchedule = api.publishTimes && api.publishTimes.length > 1;
  const isBse = api.exchange === "BSE";

  // Update mobile back bar tag
  const mobileTag = document.getElementById("mobile-detail-tag");
  if (mobileTag) {
    mobileTag.innerText = api.categoryPath || api.category;
  }

  container.innerHTML = `
    <div class="space-y-4">
      
      <!-- API CARD HEADER -->
      <div class="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        
        <!-- Breadcrumb & Badges -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex items-center space-x-1.5 text-[11px] font-medium text-[#64748b] overflow-hidden truncate">
            <span class="text-[#002855] font-semibold">${api.categoryPath || "MARKET DATA"}</span>
          </div>
          <div class="flex items-center space-x-1.5 flex-shrink-0">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${isBse ? "bg-[#003b7a] text-amber-300" : "bg-[#002855] text-white"}">
              ${api.exchange || "NSE"} &bull; ${api.method || "GET"}
            </span>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              api.hasDateRangeFilter
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : api.hasSubTabs ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }">
              ${api.hasDateRangeFilter ? "Custom Date Range" : api.hasSubTabs ? "3-in-1 Dataset" : "Live Endpoint"}
            </span>
          </div>
        </div>

        <!-- Title & Description -->
        <h1 class="text-xl sm:text-2xl font-bold text-[#002855] tracking-tight mb-2">
          ${api.name}
        </h1>
        <p class="text-xs sm:text-sm text-[#475569] leading-relaxed mb-4">
          ${api.description}
        </p>

        <!-- FETCH TIME BANNER -->
        <div class="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 mb-4">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-base">🕒</span>
            <span class="text-xs font-bold text-amber-900 uppercase tracking-wider">Data Fetch & Publication Schedule</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
              ${api.frequencyType}
            </span>
          </div>

          <div class="grid grid-cols-1 ${isMultiSchedule ? "sm:grid-cols-3" : "sm:grid-cols-1"} gap-2 pt-1">
            ${api.publishTimes
              .map(
                (pt, idx) => `
              <div class="bg-white/80 border border-amber-200/80 rounded-lg p-2.5 shadow-xs">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-bold text-amber-950">${pt.window || `Window #${idx + 1}`}</span>
                  <span class="text-[11px] font-mono-code font-bold text-[#002855] bg-amber-100/90 px-1.5 py-0.2 rounded">${pt.time}</span>
                </div>
                <p class="text-[10px] text-amber-900/90 leading-normal">${pt.description}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- INTERACTIVE QUERY BUILDER (FOR BSE DEALS & DATE RANGE APIS) -->
        ${
          api.hasDateRangeFilter
            ? `
        <div class="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl p-4 space-y-3 mb-4 shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="text-base">📅</span>
              <span class="text-xs font-bold text-[#002855] uppercase tracking-wider">Date Range & Query Builder</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">Default: Last Closing Day</span>
            </div>
            <span class="text-[10px] text-gray-500 font-mono-code">DealType: 1=Bulk, 2=Block</span>
          </div>

          <!-- Quick Presets -->
          <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span class="text-[11px] font-bold text-gray-600 mr-1">Quick Presets:</span>
            <button type="button" onclick="applyDatePreset('closing')" class="px-2.5 py-1 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-[#002855] font-bold text-xs transition shadow-2xs">
              ⚡ Last Closing Day (25/09/2026)
            </button>
            <button type="button" onclick="applyDatePreset('2days')" class="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs transition">
              Last 2 Days (24–25 Sep)
            </button>
            <button type="button" onclick="applyDatePreset('7days')" class="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs transition">
              Last 7 Days (19–25 Sep)
            </button>
            <button type="button" onclick="applyDatePreset('month')" class="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs transition">
              Month-to-Date (01–25 Sep)
            </button>
          </div>

          <!-- Form Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">Deal Type</label>
              <select id="query-deal-type" onchange="handleParamChange()" 
                class="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#002855]">
                <option value="1" ${currentQueryParams.DealType === "1" ? "selected" : ""}>1 - Bulk Deals (>= 0.5% Float)</option>
                <option value="2" ${currentQueryParams.DealType === "2" ? "selected" : ""}>2 - Block Deals (>= ₹10 Crore)</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">From Date (FDate)</label>
              <input type="text" id="query-fdate" value="${currentQueryParams.FDate}" placeholder="DD/MM/YYYY" oninput="handleParamChange()"
                class="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-mono-code text-gray-800 outline-none focus:border-[#002855]" />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">To Date (TDate)</label>
              <input type="text" id="query-tdate" value="${currentQueryParams.TDate}" placeholder="DD/MM/YYYY" oninput="handleParamChange()"
                class="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-mono-code text-gray-800 outline-none focus:border-[#002855]" />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">Scrip Code / Name Filter</label>
              <input type="text" id="query-sc-code" value="${currentQueryParams.sc_code}" placeholder="e.g. 539222 or GROWINGTON" oninput="handleParamChange()"
                class="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-mono-code text-gray-800 outline-none focus:border-[#002855]" />
            </div>
          </div>

          <!-- Dynamic Active Status -->
          <div class="flex items-center justify-between text-[11px] text-blue-900 bg-white/80 border border-blue-200 rounded-lg px-3 py-1.5">
            <span>Range Selected: <b id="active-range-label" class="font-mono-code">${currentQueryParams.FDate} to ${currentQueryParams.TDate}</b></span>
            <span id="filter-status-label" class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ${getActiveRecordCount(api)}
            </span>
          </div>
        </div>
        `
            : ""
        }

        <!-- BSE WAF HEADER NOTICE (Explains HTML 403 vs JSON) -->
        ${
          isBse
            ? `
        <div class="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs text-amber-950 space-y-1.5 shadow-2xs">
          <div class="flex items-center space-x-2 font-bold text-amber-900">
            <span>💡</span>
            <span>Why did direct browser GET return HTML Access Denied?</span>
          </div>
          <p class="text-[11px] text-amber-900/90 leading-relaxed">
            <b>BSE Akamai Cloudflare/WAF Protection:</b> When requested directly via browser address bar or plain <code>curl</code> without headers, BSE blocks the request with an HTML <i>403 Access Denied</i> page.
          </p>
          <p class="text-[11px] text-amber-900/90 leading-relaxed">
            <b>The Fix:</b> Pass <code>Origin: https://www.bseindia.com</code> and <code>Referer: https://www.bseindia.com/</code> headers along with a standard User-Agent. In Python, an initial session handshake with the homepage sets cookies to fetch pure JSON. See the ready-to-run snippet below!
          </p>
        </div>
        `
            : ""
        }

        <!-- ENDPOINT URL BAR -->
        <div class="space-y-2">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Official Request URL (HTTP GET)
          </label>
          <div class="flex items-center space-x-2 bg-[#f8fafc] border border-gray-300 rounded-xl p-2.5 font-mono-code text-xs text-gray-800 shadow-inner overflow-hidden">
            <span id="endpoint-url-base" class="text-gray-400 select-none hidden sm:inline flex-shrink-0">${api.baseUrl}</span>
            <span id="endpoint-url-path" class="text-[#003b7a] font-semibold truncate flex-1">${currentPath}</span>
          </div>

          <!-- Action Buttons (Touch-friendly 44px on Mobile) -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button id="btn-copy-url" onclick="navigator.clipboard.writeText('${fullUrl}'); window.showToast('Copied full URL to clipboard!');" 
              class="h-11 px-4 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 border border-gray-200 flex items-center justify-center space-x-2 transition">
              <span>📋</span>
              <span>Copy URL</span>
            </button>
            <a id="btn-open-exchange" href="${fullUrl}" target="_blank" rel="noopener noreferrer" 
              class="h-11 px-4 text-xs font-bold rounded-xl bg-[#002855] hover:bg-[#001a38] text-white flex items-center justify-center space-x-2 transition shadow-sm">
              <span>↗</span>
              <span>Open in ${api.exchange || "NSE"}</span>
            </a>
          </div>
        </div>

      </div>

      <!-- JSON VIEWER CARD WITH MULTI-DATASET SUB-TABS -->
      <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        
        <!-- SUB-TABS SELECTOR (IF MULTI-DATASET API e.g. LARGE DEALS OR BSE) -->
        ${
          api.hasSubTabs && api.subTabs && api.subTabs.length > 0
            ? `
        <div class="border-b border-gray-200 bg-[#f8fafc] p-2.5 sm:p-3">
          <div class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1 flex items-center justify-between">
            <span>Separate Dataset Views (${api.subTabs.length} Types of Data)</span>
            <span class="text-[10px] font-normal text-gray-400">Tap to inspect each category</span>
          </div>
          <div class="horizontal-scroll space-x-2 pb-0.5">
            ${api.subTabs
              .map((st) => {
                const isSelected = activeSubTabKey === st.key;
                const count = Array.isArray(api.sampleResponse?.[st.key]) ? api.sampleResponse[st.key].length : 0;
                return `
              <button onclick="switchSubTab('${st.key}')" id="subtab-btn-${st.key}"
                class="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border shadow-xs ${
                  isSelected
                    ? "bg-[#002855] text-white border-[#002855] shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }">
                <span>${st.label}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-amber-400 text-gray-900 font-extrabold" : "bg-gray-200 text-gray-700 font-medium"
                }">${count > 0 ? count : st.badge}</span>
              </button>
            `;
              })
              .join("")}
            
            <!-- Raw All Option -->
            <button onclick="switchSubTab('RAW_ALL')" id="subtab-btn-RAW_ALL"
              class="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 border shadow-xs ${
                activeSubTabKey === "RAW_ALL"
                  ? "bg-[#002855] text-white border-[#002855] shadow-sm"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }">
              <span>Full Raw Payload</span>
            </button>
          </div>
          
          <!-- Subtab contextual banner -->
          <div id="subtab-info-banner" class="mt-2 text-xs text-[#002855] bg-blue-50/80 border border-blue-200 rounded-lg p-2 flex items-center justify-between">
            <span id="subtab-info-text">${getCurrentSubTabInfo(api)}</span>
          </div>
        </div>
        `
            : ""
        }

        <!-- Viewer Control Bar -->
        <div class="border-b border-gray-200 p-3 sm:p-4 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 id="viewer-header-title" class="text-xs sm:text-sm font-bold text-[#002855]">
              ${getActiveViewTitle(api)}
            </h3>
            <span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono-code">JSON</span>
          </div>

          <!-- In-Tree Controls -->
          <div class="flex items-center space-x-1.5 w-full sm:w-auto">
            <input type="text" id="tree-search" placeholder="Search keys or values..." 
              oninput="if(currentViewer) currentViewer.setSearch(this.value);"
              class="flex-1 sm:w-44 bg-white border border-gray-300 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-[#002855]" />
            <button onclick="if(currentViewer) currentViewer.expandAll();" class="h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100" title="Expand All">+</button>
            <button onclick="if(currentViewer) currentViewer.collapseAll();" class="h-8 px-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100" title="Collapse All">-</button>
            <button onclick="copyCurrentActiveJson()" class="h-8 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center space-x-1">
              <span>Copy</span>
            </button>
          </div>
        </div>

        <!-- Interactive Tree Mount -->
        <div id="json-tree-mount" class="min-h-[300px] max-h-[600px] overflow-y-auto bg-white"></div>

        <!-- Footer Info -->
        <div class="border-t border-gray-200 p-3 bg-gray-50 text-[11px] text-gray-500 flex items-center justify-between">
          <span>💡 Tap any key to copy its exact JSON path</span>
          <span id="viewer-record-count" class="font-mono-code text-[#002855] font-semibold">
            ${getActiveRecordCount(api)}
          </span>
        </div>
      </div>

      <!-- CODE INTEGRATION (cURL & Python) -->
      <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="border-b border-gray-200 p-3 bg-gray-50/70 flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-gray-600">Quick Integration Snippet</span>
          <div class="flex space-x-1">
            <button onclick="switchSnippetTab('python')" id="btn-snip-python" class="px-2.5 py-1 text-xs rounded-md bg-[#002855] text-white font-semibold">Python</button>
            <button onclick="switchSnippetTab('curl')" id="btn-snip-curl" class="px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-gray-900 font-semibold">cURL</button>
          </div>
        </div>
        <div class="p-4 bg-[#0f172a] text-gray-200 font-mono-code text-xs overflow-x-auto">
          <pre id="snippet-code-box"></pre>
        </div>
      </div>

      <!-- Mobile-only Bottom Back button -->
      <div class="md:hidden pt-2 pb-6">
        <button onclick="mobileGoBackToList()" class="w-full h-11 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-[#002855] flex items-center justify-center space-x-2 shadow-xs transition">
          <span>← Back to All API Endpoints</span>
        </button>
      </div>

    </div>
  `;

  renderJsonTreeForCurrentView();
  updateSnippet(api, "python");
}

function showEmptyDesktopDetail() {
  const container = document.getElementById("detail-content-mount");
  if (!container) return;
  container.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-xs">
      <div class="text-3xl mb-2">🔍</div>
      <h3 class="text-base font-bold text-gray-800 mb-1">No Endpoints Match Your Search</h3>
      <p class="text-xs text-gray-500 mb-3">Try searching for keywords like "bse", "bulk", "block", "pre open", or "09:08".</p>
      <button onclick="handleLogoClick()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-[#002855] text-white">
        Reset Search
      </button>
    </div>
  `;
}

function getActiveViewData(api) {
  if (!api) return {};
  let data = api.sampleResponse || {};

  if (api.hasSubTabs && activeSubTabKey && activeSubTabKey !== "RAW_ALL") {
    data = api.sampleResponse?.[activeSubTabKey] || [];
  }

  // If user entered a scrip code filter and data is an array
  if (api.hasDateRangeFilter && currentQueryParams.sc_code && Array.isArray(data)) {
    const codeFilter = String(currentQueryParams.sc_code).trim().toLowerCase();
    const filtered = data.filter((item) =>
      String(item.SCRIP_CODE || "").toLowerCase().includes(codeFilter) ||
      String(item.scripname || "").toLowerCase().includes(codeFilter) ||
      String(item.CLIENT_NAME || "").toLowerCase().includes(codeFilter)
    );
    return filtered.length > 0 ? filtered : data;
  }

  return data;
}

function getActiveViewTitle(api) {
  if (api.hasSubTabs && activeSubTabKey && activeSubTabKey !== "RAW_ALL") {
    const tabObj = (api.subTabs || []).find((s) => s.key === activeSubTabKey);
    return `${tabObj?.label || activeSubTabKey} Dataset`;
  }
  return "Complete Exchange Response Payload";
}

function getActiveRecordCount(api) {
  const data = getActiveViewData(api);
  if (Array.isArray(data)) {
    return `${data.length} records in this view`;
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    return `${keys.length} top-level fields`;
  }
  return "1 record";
}

function getCurrentSubTabInfo(api) {
  if (!api.hasSubTabs) return "";
  if (activeSubTabKey === "RAW_ALL") {
    return "Displaying full combined exchange response with all keys.";
  }
  const tabObj = (api.subTabs || []).find((s) => s.key === activeSubTabKey);
  return tabObj?.description || "";
}

function switchSubTab(subKey) {
  activeSubTabKey = subKey;
  if (!activeApi) return;

  document.querySelectorAll("[id^='subtab-btn-']").forEach((btn) => {
    btn.className = "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 border shadow-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-100";
  });
  const activeBtn = document.getElementById(`subtab-btn-${subKey}`);
  if (activeBtn) {
    activeBtn.className = "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shadow-sm bg-[#002855] text-white border-[#002855]";
  }

  const titleElem = document.getElementById("viewer-header-title");
  if (titleElem) titleElem.innerText = getActiveViewTitle(activeApi);

  const countElem = document.getElementById("viewer-record-count");
  if (countElem) countElem.innerText = getActiveRecordCount(activeApi);

  const infoElem = document.getElementById("subtab-info-text");
  if (infoElem) infoElem.innerText = getCurrentSubTabInfo(activeApi);

  renderJsonTreeForCurrentView();
}

function renderJsonTreeForCurrentView() {
  const mount = document.getElementById("json-tree-mount");
  if (!mount || !activeApi) return;

  const dataToView = getActiveViewData(activeApi);
  currentViewer = new JsonViewer(mount, dataToView);
  currentViewer.render();
}

function copyCurrentActiveJson() {
  if (!activeApi) return;
  const data = getActiveViewData(activeApi);
  const str = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(str).then(() => {
    window.showToast("Copied view JSON to clipboard!");
  });
}

function updateSnippet(api, type) {
  const box = document.getElementById("snippet-code-box");
  if (!box || !api) return;

  const currentPath = getDynamicPath(api);
  const fullUrl = `${api.baseUrl}${currentPath}`;
  const isBse = api.exchange === "BSE" || api.id === "bse-bulk-deals";

  if (type === "python") {
    if (isBse) {
      box.innerText = `import requests
import json

url = "${fullUrl}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.bseindia.com",
    "Referer": "https://www.bseindia.com/"
}

session = requests.Session()
# 1. Establish session handshake on BSE homepage to receive bot clearance
session.get("https://www.bseindia.com", headers=headers, timeout=10)

# 2. Fetch Bulk / Block Deals with custom Date Range
response = session.get(url, headers=headers, timeout=10)
data = response.json()

# Extract Table array
deals = data.get("Table", [])
print(f"Total deals received: {len(deals)}")

for deal in deals[:5]:
    print(f"{deal.get('scripname')} | {deal.get('CLIENT_NAME')} | Type: {deal.get('TRANSACTION_TYPE')} | Qty: {deal.get('QUANTITY')} | Rs. {deal.get('PRICE')}")`;
    } else {
      const referer = api.headers?.Referer || "https://www.nseindia.com/";
      const ua = api.headers?.["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36";
      box.innerText = `import requests

url = "${fullUrl}"
headers = {
    "User-Agent": "${ua}",
    "Referer": "${referer}",
    "Accept": "*/*"
}

session = requests.Session()
# Handshake on NSE homepage once to establish cookies
session.get("https://www.nseindia.com", headers=headers, timeout=10)

# Fetch data
response = session.get(url, headers=headers, timeout=10)
data = response.json()
${api.hasSubTabs ? `
# Access each dataset independently:
bulk_deals = data.get("BULK_DEALS_DATA", [])
block_deals = data.get("BLOCK_DEALS_DATA", [])
short_selling = data.get("SHORT_DEALS_DATA", [])
print(f"Bulk: {len(bulk_deals)}, Block: {len(block_deals)}, Short: {len(short_selling)}")` : `print(data)`}`;
    }
  } else {
    // cURL
    if (isBse) {
      box.innerText = `curl "${fullUrl}" \\
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" \\
  -H "Origin: https://www.bseindia.com" \\
  -H "Referer: https://www.bseindia.com/" \\
  -H "Accept: application/json, text/plain, */*"`;
    } else {
      const referer = api.headers?.Referer || "https://www.nseindia.com/";
      const ua = api.headers?.["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36";
      box.innerText = `curl "${fullUrl}" \\
  -H "User-Agent: ${ua}" \\
  -H "Referer: ${referer}" \\
  -H "Accept: */*"`;
    }
  }
}

function switchSnippetTab(type) {
  const pyBtn = document.getElementById("btn-snip-python");
  const curlBtn = document.getElementById("btn-snip-curl");
  if (type === "python") {
    pyBtn.className = "px-2.5 py-1 text-xs rounded-md bg-[#002855] text-white font-semibold";
    curlBtn.className = "px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-gray-900 font-semibold";
  } else {
    curlBtn.className = "px-2.5 py-1 text-xs rounded-md bg-[#002855] text-white font-semibold";
    pyBtn.className = "px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-gray-900 font-semibold";
  }
  if (activeApi) {
    updateSnippet(activeApi, type);
  }
}
