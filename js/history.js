/* =============================================================
   history.js
   Client-side debugging history, persisted to localStorage only.
   No database, no backend. Handles corrupted/missing storage
   gracefully and renders entries using safe DOM APIs (textContent)
   rather than innerHTML, since entries may embed AI-generated text.
============================================================= */

(function (global) {
  "use strict";

  var STORAGE_KEY = "aicodedebugger_history_v1";
  var MAX_ENTRIES = 20;

  /**
   * Load history entries from localStorage. Returns an empty array
   * if storage is unavailable, empty, or corrupted.
   * @returns {Array<Object>}
   */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // Corrupted JSON or storage inaccessible — fail safe with no history.
      return [];
    }
  }

  /**
   * Persist an array of history entries to localStorage.
   * @param {Array<Object>} items
   */
  function persist(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // Storage full, disabled, or in a restricted context — fail silently
      // rather than breaking the analysis flow.
    }
  }

  /**
   * Save a new debugging analysis to history (most recent first),
   * trimmed to MAX_ENTRIES.
   * @param {{language:string, code:string, error:string, result:string}} entry
   * @returns {Object} the stored entry, including its generated id/timestamp
   */
  function saveEntry(entry) {
    var items = load();
    var stored = {
      id: Utils.generateId("h"),
      language: entry.language,
      code: entry.code,
      error: entry.error || "",
      result: entry.result || "",
      timestamp: new Date().toISOString()
    };
    items.unshift(stored);
    while (items.length > MAX_ENTRIES) {
      items.pop();
    }
    persist(items);
    return stored;
  }

  /**
   * Delete a single history entry by id.
   * @param {string} id
   */
  function deleteEntry(id) {
    var items = load().filter(function (it) {
      return it.id !== id;
    });
    persist(items);
  }

  /**
   * Clear all history entries.
   */
  function clearAll() {
    persist([]);
  }

  /**
   * Render the history list into the given container, wiring up
   * click-to-load and delete behavior via caller-supplied callbacks.
   * Uses only textContent / createElement — never innerHTML — for
   * anything derived from stored (potentially AI-generated) content.
   *
   * @param {Object} options
   * @param {HTMLElement} options.listEl - container to render items into
   * @param {HTMLElement} options.emptyEl - element to show/hide when history is empty
   * @param {function(Object):void} options.onLoad - called with the entry when a user opens it
   * @param {function():void} options.onChange - called after any delete/clear so the UI can refresh
   */
  function render(options) {
    var listEl = options.listEl;
    var emptyEl = options.emptyEl;
    var onLoad = options.onLoad;
    var onChange = options.onChange;

    var items = load();
    listEl.textContent = ""; // clear safely

    if (items.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    items.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "history-item";

      var main = document.createElement("div");
      main.className = "history-main";
      main.setAttribute("role", "button");
      main.setAttribute("tabindex", "0");
      main.setAttribute(
        "aria-label",
        "Load history entry: " + entry.language + " from " + Utils.formatTimestamp(entry.timestamp)
      );

      var langLine = document.createElement("div");
      langLine.className = "history-lang";
      langLine.textContent = entry.language;

      var snippet = document.createElement("div");
      snippet.className = "history-snippet";
      snippet.textContent = (entry.code || "").replace(/\s+/g, " ").slice(0, 90);

      main.appendChild(langLine);
      main.appendChild(snippet);

      var time = document.createElement("div");
      time.className = "history-time";
      time.textContent = Utils.formatTimestamp(entry.timestamp);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "history-del";
      delBtn.setAttribute("aria-label", "Delete this history entry");
      // Static, trusted markup only (no user/AI content) — safe to use innerHTML here.
      delBtn.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
        '<path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';

      function handleLoad() {
        if (typeof onLoad === "function") onLoad(entry);
      }
      main.addEventListener("click", handleLoad);
      main.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleLoad();
        }
      });

      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteEntry(entry.id);
        render(options);
        if (typeof onChange === "function") onChange();
      });

      row.appendChild(main);
      row.appendChild(time);
      row.appendChild(delBtn);
      listEl.appendChild(row);
    });
  }

  global.History = {
    load: load,
    saveEntry: saveEntry,
    deleteEntry: deleteEntry,
    clearAll: clearAll,
    render: render
  };
})(window);