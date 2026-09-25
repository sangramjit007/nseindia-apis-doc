/**
 * NSE India API Documentation & Explorer
 * Adaptive Architecture:
 * - Laptop / PC (>= 768px): Unified workstation view with horizontal tabs & live detail pane (the view you loved)
 * - Mobile (< 768px): Clean vertical scroll feed where Large Deals is directly visible, with 1-tap drill-down
 */

let apiDatabase = [];
let activeApi = null;
let currentViewer = null;
let searchQuery = "";
let selectedCategory = "ALL";
let activeSubTabKey = null;

// Track whether mobile is currently in detail drill-down
let isMobileDetailActive = false;

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
            : isMulti ? "bg-blue-100 text-blue-800 font-medium" : "bg-amber-100 text-amber-800 font-medium"
        }">${isMulti ? `${api.publishTimes.length} Windows` : "09:08 AM"}</span>
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

      return `
      <!-- ENDPOINT CARD FOR MOBILE SCROLL VIEW -->
      <div class="endpoint-card bg-white border border-gray-200 hover:border-[#002855] rounded-2xl p-4 shadow-xs space-y-2.5">
        
        <!-- Category & Method Badge -->
        <div class="flex items-center justify-between gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[#a6192e] bg-red-50 px-2 py-0.5 rounded border border-red-100 truncate">
            ${api.categoryPath || api.category}
          </span>
          <div class="flex items-center space-x-1 flex-shrink-0">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#002855] text-white">
              ${api.method || "GET"}
            </span>
            ${
              api.hasSubTabs
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
            ${isMulti ? `${api.publishTimes.length} Windows` : "Pre-Market"}
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
// SELECT API & DETAIL VIEW RENDERING
// -------------------------------------------------------------

function selectApi(apiId, openInMobile = false) {
  const api = apiDatabase.find((a) => a.id === apiId);
  if (!api) return;

  activeApi = api;
  
  if (openInMobile) {
    isMobileDetailActive = true;
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

  const fullUrl = `${api.baseUrl}${api.path}`;
  const isMultiSchedule = api.publishTimes && api.publishTimes.length > 1;

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
            <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-[#002855] text-white">
              ${api.method || "GET"}
            </span>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              api.hasSubTabs ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }">
              ${api.hasSubTabs ? "3-in-1 Dataset" : "Live Endpoint"}
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
            <span class="text-xs font-bold text-amber-900 uppercase tracking-wider">Data Fetch & Publication Windows</span>
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

        <!-- ENDPOINT URL BAR -->
        <div class="space-y-2">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Official Request URL (HTTP GET)
          </label>
          <div class="flex items-center space-x-2 bg-[#f8fafc] border border-gray-300 rounded-xl p-2.5 font-mono-code text-xs text-gray-800 shadow-inner overflow-hidden">
            <span class="text-gray-400 select-none hidden sm:inline flex-shrink-0">${api.baseUrl}</span>
            <span class="text-[#003b7a] font-semibold truncate flex-1">${api.path}</span>
          </div>

          <!-- Action Buttons (Touch-friendly 44px on Mobile) -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="navigator.clipboard.writeText('${fullUrl}'); window.showToast('Copied full URL to clipboard!');" 
              class="h-11 px-4 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 border border-gray-200 flex items-center justify-center space-x-2 transition">
              <span>📋</span>
              <span>Copy URL</span>
            </button>
            <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" 
              class="h-11 px-4 text-xs font-bold rounded-xl bg-[#002855] hover:bg-[#001a38] text-white flex items-center justify-center space-x-2 transition shadow-sm">
              <span>↗</span>
              <span>Open in NSE</span>
            </a>
          </div>
        </div>

      </div>

      <!-- JSON VIEWER CARD WITH MULTI-DATASET SUB-TABS -->
      <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        
        <!-- SUB-TABS SELECTOR (IF MULTI-DATASET API e.g. LARGE DEALS) -->
        ${
          api.hasSubTabs && api.subTabs && api.subTabs.length > 0
            ? `
        <div class="border-b border-gray-200 bg-[#f8fafc] p-2.5 sm:p-3">
          <div class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1 flex items-center justify-between">
            <span>Separate Dataset Views (3 Types of Data)</span>
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
      <p class="text-xs text-gray-500 mb-3">Try searching for keywords like "bulk", "block", "pre open", or "09:08".</p>
      <button onclick="handleLogoClick()" class="px-4 py-2 text-xs font-semibold rounded-lg bg-[#002855] text-white">
        Reset Search
      </button>
    </div>
  `;
}

function getActiveViewData(api) {
  if (!api) return {};
  if (api.hasSubTabs && activeSubTabKey && activeSubTabKey !== "RAW_ALL") {
    return api.sampleResponse?.[activeSubTabKey] || [];
  }
  return api.sampleResponse || {};
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
  if (!box) return;

  const fullUrl = `${api.baseUrl}${api.path}`;
  const referer = api.headers?.Referer || "https://www.nseindia.com/";
  const ua = api.headers?.["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36";

  if (type === "python") {
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
  } else {
    box.innerText = `curl "${fullUrl}" \\
  -H "User-Agent: ${ua}" \\
  -H "Referer: ${referer}" \\
  -H "Accept: */*"`;
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
