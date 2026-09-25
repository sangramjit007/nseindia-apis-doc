/**
 * Interactive Collapsible JSON Tree Viewer (NSE Official Theme & Mobile Touch-Optimized)
 */

class JsonViewer {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.searchQuery = "";
  }

  setSearch(query) {
    this.searchQuery = query ? query.toLowerCase().trim() : "";
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "json-viewer p-3 sm:p-4 select-text";

    if (this.data === undefined) {
      wrapper.innerHTML = '<span class="text-gray-400 italic">No JSON data available</span>';
      this.container.appendChild(wrapper);
      return;
    }

    const tree = this._buildNode(this.data, "", true, "$");
    wrapper.appendChild(tree);
    this.container.appendChild(wrapper);
  }

  _escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = String(text);
    return div.innerHTML;
  }

  _highlightMatch(text) {
    if (!this.searchQuery) return this._escapeHtml(text);
    const escaped = this._escapeHtml(text);
    const regex = new RegExp(`(${this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return escaped.replace(regex, '<mark class="json-highlight font-semibold">$1</mark>');
  }

  _buildNode(val, key, isLast, currentPath) {
    const item = document.createElement("div");
    item.className = "json-item relative";

    const isObject = val !== null && typeof val === "object";
    const isArray = Array.isArray(val);

    const keySpan = key !== "" ? `<span class="json-key cursor-pointer hover:underline" title="Tap to copy: ${currentPath}" onclick="navigator.clipboard.writeText('${currentPath}'); window.showToast('Copied path: ${currentPath}')">${this._highlightMatch(`"${key}"`)}</span>: ` : "";

    if (!isObject) {
      let valHtml = "";
      if (typeof val === "string") {
        valHtml = `<span class="json-string">"${this._highlightMatch(val)}"</span>`;
      } else if (typeof val === "number") {
        valHtml = `<span class="json-number">${this._highlightMatch(val)}</span>`;
      } else if (typeof val === "boolean") {
        valHtml = `<span class="json-boolean">${val}</span>`;
      } else if (val === null) {
        valHtml = `<span class="json-null">null</span>`;
      }
      item.innerHTML = `<span class="inline-block w-4"></span>${keySpan}${valHtml}${isLast ? "" : '<span class="text-gray-400">,</span>'}`;
      return item;
    }

    const keys = Object.keys(val);
    const count = keys.length;
    const openChar = isArray ? "[" : "{";
    const closeChar = isArray ? "]" : "}";

    if (count === 0) {
      item.innerHTML = `<span class="inline-block w-4"></span>${keySpan}<span class="text-gray-500 font-semibold">${openChar}${closeChar}</span>${isLast ? "" : '<span class="text-gray-400">,</span>'}`;
      return item;
    }

    const header = document.createElement("div");
    header.className = "flex items-baseline space-x-1 cursor-pointer group py-0.5";

    const caret = document.createElement("span");
    caret.className = "json-caret flex-shrink-0";
    caret.innerHTML = "▼";

    const preview = document.createElement("span");
    preview.innerHTML = `${keySpan}<span class="text-gray-600 font-semibold">${openChar}</span>`;

    const collapsedPlaceholder = document.createElement("span");
    collapsedPlaceholder.className = "json-collapsed-text hidden";
    collapsedPlaceholder.innerText = ` ... ${count} ${isArray ? "items" : "keys"} ... `;

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "pl-4 sm:pl-5 border-l border-gray-200 ml-2.5 my-0.5 space-y-0.5";

    keys.forEach((childKey, idx) => {
      const childPath = isArray ? `${currentPath}[${childKey}]` : `${currentPath}.${childKey}`;
      const childNode = this._buildNode(val[childKey], isArray ? "" : childKey, idx === count - 1, childPath);
      childrenContainer.appendChild(childNode);
    });

    const footer = document.createElement("div");
    footer.innerHTML = `<span class="inline-block w-4"></span><span class="text-gray-600 font-semibold">${closeChar}</span>${isLast ? "" : '<span class="text-gray-400">,</span>'}`;

    let isCollapsed = false;
    const toggle = () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        caret.classList.add("collapsed");
        childrenContainer.classList.add("hidden");
        collapsedPlaceholder.classList.remove("hidden");
      } else {
        caret.classList.remove("collapsed");
        childrenContainer.classList.remove("hidden");
        collapsedPlaceholder.classList.add("hidden");
      }
    };

    caret.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    collapsedPlaceholder.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    header.appendChild(caret);
    header.appendChild(preview);
    header.appendChild(collapsedPlaceholder);

    item.appendChild(header);
    item.appendChild(childrenContainer);
    item.appendChild(footer);

    return item;
  }

  expandAll() {
    this.container.querySelectorAll(".json-caret").forEach((c) => c.classList.remove("collapsed"));
    this.container.querySelectorAll(".json-collapsed-text").forEach((c) => c.classList.add("hidden"));
    this.container.querySelectorAll(".json-item > div.pl-4, .json-item > div.pl-5").forEach((c) => c.classList.remove("hidden"));
  }

  collapseAll() {
    this.container.querySelectorAll(".json-caret").forEach((c) => c.classList.add("collapsed"));
    this.container.querySelectorAll(".json-collapsed-text").forEach((c) => c.classList.remove("hidden"));
    this.container.querySelectorAll(".json-item > div.pl-4, .json-item > div.pl-5").forEach((c) => c.classList.add("hidden"));
  }
}

// Global Toast helper
window.showToast = function (msg, duration = 2500) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-50 bg-[#002855] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-white/20 transition-all duration-300 opacity-0 pointer-events-none";
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.classList.remove("opacity-0", "translate-y-2");
  toast.classList.add("opacity-100", "translate-y-0");
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-2");
  }, duration);
};

window.JsonViewer = JsonViewer;
