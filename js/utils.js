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

  /**
   * Lightweight, dependency-free language auto-detector. Scores the code
   * against a handful of distinctive patterns per language and returns the
   * best match, or null if the code is too short / ambiguous to guess.
   *
   * This is a heuristic, not a parser — it is intended only to save the
   * user a click, not to be 100% authoritative. The user can always
   * override the result via the language dropdown.
   *
   * @param {string} code
   * @returns {string|null} one of the supported language labels, or null
   */
  function detectLanguage(code) {
    if (!code || code.trim().length < 15) return null;

    var scores = {
      Python: 0,
      JavaScript: 0,
      Java: 0,
      "C++": 0,
      C: 0,
      HTML: 0,
      CSS: 0,
      SQL: 0
    };

    var rules = [
      // Python
      [/^\s*def\s+\w+\s*\(.*\)\s*:/m, "Python", 3],
      [/^\s*(from\s+\w+\s+)?import\s+\w+/m, "Python", 1.5],
      [/^\s*elif\s+.*:/m, "Python", 2],
      [/\bprint\s*\(/, "Python", 1],
      [/\bself\./, "Python", 1.5],
      [/^\s*#.+/m, "Python", 0.5],

      // JavaScript
      [/\bconsole\.log\s*\(/, "JavaScript", 3],
      [/\bfunction\s+\w+\s*\(/, "JavaScript", 1.5],
      [/=>\s*{?/, "JavaScript", 1.5],
      [/\b(const|let|var)\s+\w+\s*=/, "JavaScript", 1],
      [/\bdocument\.\w+/, "JavaScript", 2],
      [/\brequire\s*\(/, "JavaScript", 1],

      // Java
      [/\bpublic\s+static\s+void\s+main\s*\(/, "Java", 4],
      [/\bpublic\s+class\s+\w+/, "Java", 3],
      [/\bSystem\.out\.print(ln)?\s*\(/, "Java", 3],
      [/^\s*import\s+java\./m, "Java", 2],

      // C++ (checked before C so cout/std::/iostream outrank plain printf)
      [/#include\s*<iostream>/, "C++", 3],
      [/\busing\s+namespace\s+std\s*;/, "C++", 3],
      [/\bstd::/, "C++", 2],
      [/\bcout\s*<</, "C++", 3],
      [/\bcin\s*>>/, "C++", 2],

      // C
      [/#include\s*<stdio\.h>/, "C", 4],
      [/\bprintf\s*\(/, "C", 2],
      [/\bscanf\s*\(/, "C", 2],

      // HTML
      [/<!DOCTYPE\s+html>/i, "HTML", 4],
      [/<\/?(html|head|body|div|span)[\s>]/i, "HTML", 2],

      // CSS
      [/^[^{};]*\{[^}]*[\w-]+\s*:\s*[^;]+;[^}]*\}/m, "CSS", 2],
      [/^\s*[.#]?[\w-]+(\s*[,>+~]\s*[.#]?[\w-]+)*\s*\{/m, "CSS", 1.5],

      // SQL
      [/\bSELECT\b[\s\S]*\bFROM\b/i, "SQL", 4],
      [/\bINSERT\s+INTO\b/i, "SQL", 3],
      [/\bCREATE\s+TABLE\b/i, "SQL", 3],
      [/\bUPDATE\b[\s\S]*\bSET\b/i, "SQL", 3]
    ];

    rules.forEach(function (rule) {
      if (rule[0].test(code)) {
        scores[rule[1]] += rule[2];
      }
    });

    var best = null;
    var bestScore = 0;
    var runnerUpScore = 0;
    Object.keys(scores).forEach(function (lang) {
      if (scores[lang] > bestScore) {
        runnerUpScore = bestScore;
        bestScore = scores[lang];
        best = lang;
      } else if (scores[lang] > runnerUpScore) {
        runnerUpScore = scores[lang];
      }
    });

    // Require a minimum confidence and a clear lead over the next best guess
    // so ambiguous snippets (e.g. a lone "print(...)") don't cause flip-flopping.
    if (best && bestScore >= 2.5 && bestScore - runnerUpScore >= 1.5) {
      return best;
    }
    return null;
  }

  global.Utils = {
    qs: qs,
    qsa: qsa,
    copyToClipboard: copyToClipboard,
    downloadFile: downloadFile,
    extensionForLanguage: extensionForLanguage,
    formatTimestamp: formatTimestamp,
    setTextById: setTextById,
    generateId: generateId,
    detectLanguage: detectLanguage
  };
})(window);