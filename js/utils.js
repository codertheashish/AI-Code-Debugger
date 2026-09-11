/* =============================================================
   utils.js
   Small, independent, reusable helper functions used across the
   application. No dependencies on other app modules.
============================================================= */

(function (global) {
  "use strict";

  /**
   * Shorthand querySelector.
   * @param {string} selector
   * @param {ParentNode} [root]
   * @returns {Element|null}
   */
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  /**
   * Shorthand querySelectorAll returning a real array.
   * @param {string} selector
   * @param {ParentNode} [root]
   * @returns {Element[]}
   */
  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /**
   * Copy text to the clipboard, with a manual fallback for older browsers.
   * Optionally flashes a button's label to confirm the action.
   * @param {string} text
   * @param {HTMLElement} [btnEl] - button element to show temporary "Copied!" feedback on
   */
  function copyToClipboard(text, btnEl) {
    if (!text) return;

    function flashSuccess() {
      if (!btnEl) return;
      var original = btnEl.textContent;
      btnEl.textContent = "Copied!";
      setTimeout(function () {
        btnEl.textContent = original;
      }, 1400);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flashSuccess).catch(function () {
        legacyCopy(text);
        flashSuccess();
      });
    } else {
      legacyCopy(text);
      flashSuccess();
    }
  }

  /**
   * Fallback copy mechanism using a temporary offscreen textarea.
   * @param {string} text
   */
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* clipboard unavailable — silently ignore */
    }
    document.body.removeChild(ta);
  }

  /**
   * Trigger a browser-side download of plain text content.
   * @param {string} content
   * @param {string} filename
   */
  function downloadFile(content, filename) {
    if (!content) return;
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "download.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Maps a language name to a sensible file extension for downloads.
   * @param {string} language
   * @returns {string}
   */
  var LANGUAGE_EXTENSIONS = {
    Python: "py",
    JavaScript: "js",
    Java: "java",
    "C++": "cpp",
    C: "c",
    HTML: "html",
    CSS: "css",
    SQL: "sql"
  };
  function extensionForLanguage(language) {
    return LANGUAGE_EXTENSIONS[language] || "txt";
  }

  /**
   * Format an ISO timestamp into a short, readable local date/time string.
   * @param {string} iso
   * @returns {string}
   */
  function formatTimestamp(iso) {
    try {
      var d = new Date(iso);
      return (
        d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      );
    } catch (e) {
      return "";
    }
  }

  /**
   * Safely set the text content of an element by id, defaulting to a
   * placeholder if the value is empty. Never uses innerHTML — this is the
   * only text-insertion helper the app uses for AI-generated content.
   * @param {string} id
   * @param {string} value
   * @param {string} [placeholder]
   */
  function setTextById(id, value, placeholder) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value && String(value).trim() ? value : (placeholder || "—");
  }

  /**
   * Generate a reasonably unique id for local records (history entries, etc.)
   * @returns {string}
   */
  function generateId(prefix) {
    return (prefix || "id") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  global.Utils = {
    qs: qs,
    qsa: qsa,
    copyToClipboard: copyToClipboard,
    downloadFile: downloadFile,
    extensionForLanguage: extensionForLanguage,
    formatTimestamp: formatTimestamp,
    setTextById: setTextById,
    generateId: generateId
  };
})(window);
