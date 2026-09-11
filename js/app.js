/* =============================================================
   app.js
   Main application controller. Wires DOM elements to the other
   modules (Utils, Examples, AIDebugger, History). Contains no AI
   implementation details of its own — those live in ai-debugger.js.
============================================================= */

(function () {
  "use strict";

  var THEME_KEY = "aicodedebugger_theme_v1";

  /* ---------------------------------------------------------
     DOM REFERENCES
  --------------------------------------------------------- */
  var codeInput = document.getElementById("codeInput");
  var lineNumbers = document.getElementById("lineNumbers");
  var charCount = document.getElementById("charCount");
  var langEcho = document.getElementById("langEcho");
  var languageSelect = document.getElementById("languageSelect");
  var errorInput = document.getElementById("errorInput");

  var analyzeBtn = document.getElementById("analyzeBtn");
  var analyzeHint = document.getElementById("analyzeHint");
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");

  var resultsSection = document.getElementById("resultsSection");
  var resultBanner = document.getElementById("resultBanner");
  var structuredResults = document.getElementById("structuredResults");
  var rawFallbackCard = document.getElementById("rawFallbackCard");

  var outFixedCode = document.getElementById("out-fixedcode");
  var outRaw = document.getElementById("out-raw");

  var historyListEl = document.getElementById("historyList");
  var historyEmptyEl = document.getElementById("historyEmpty");

  var isRequestInFlight = false;
  var lastFixedCode = "";

  /* ---------------------------------------------------------
     THEME
  --------------------------------------------------------- */
  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* storage unavailable — theme just won't persist */
    }
  }

  function initTheme() {
    var saved = "dark";
    try {
      saved = localStorage.getItem(THEME_KEY) || "dark";
    } catch (e) {
      /* ignore */
    }
    applyTheme(saved);
  }

  document.getElementById("themeToggle").addEventListener("click", function () {
    var current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  /* ---------------------------------------------------------
     CODE EDITOR: line numbers, char count, scroll sync
  --------------------------------------------------------- */
  function updateEditorMeta() {
    var text = codeInput.value;
    var lines = text.length ? text.split("\n") : [""];
    var lineCount = lines.length;

    var numStr = "";
    for (var i = 1; i <= lineCount; i++) {
      numStr += i + "\n";
    }
    lineNumbers.textContent = numStr;

    charCount.textContent = text.length + " characters · " + lineCount + " lines";
  }

  codeInput.addEventListener("input", updateEditorMeta);
  codeInput.addEventListener("scroll", function () {
    lineNumbers.scrollTop = codeInput.scrollTop;
  });

  languageSelect.addEventListener("change", function () {
    langEcho.textContent = languageSelect.value;
  });

  document.getElementById("clearCodeBtn").addEventListener("click", function () {
    codeInput.value = "";
    updateEditorMeta();
    codeInput.focus();
  });

  document.getElementById("copyCodeBtn").addEventListener("click", function () {
    Utils.copyToClipboard(codeInput.value, this);
  });

  /* ---------------------------------------------------------
     EXAMPLES
  --------------------------------------------------------- */
  Utils.qsa(".chip[data-example]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var key = chip.getAttribute("data-example");
      var example = Examples.getExample(key);
      if (!example) return;

      codeInput.value = example.code;
      errorInput.value = example.error;
      languageSelect.value = example.language;
      langEcho.textContent = example.language;
      updateEditorMeta();
      codeInput.focus();
    });
  });

  /* ---------------------------------------------------------
     STATUS BADGE
  --------------------------------------------------------- */
  function setStatus(state, label) {
    statusDot.className = "status-dot" + (state === "busy" ? " busy" : state === "error" ? " err" : "");
    statusText.textContent = label;
  }

  /* ---------------------------------------------------------
     RESULT RENDERING
  --------------------------------------------------------- */
  function showBanner(type, message) {
    resultBanner.textContent = "";
    var div = document.createElement("div");
    div.className = "result-banner " + type;
    div.textContent = message;
    resultBanner.appendChild(div);
  }

  function resetResults() {
    resultBanner.textContent = "";
    [
      "out-issue",
      "out-why",
      "out-explanation",
      "out-improvements",
      "out-complexity",
      "out-edgecases"
    ].forEach(function (id) {
      Utils.setTextById(id, "");
    });
    outFixedCode.textContent = "—";
    outRaw.textContent = "—";
  }

  function renderStructured(sections) {
    structuredResults.style.display = "grid";
    rawFallbackCard.style.display = "none";

    Utils.setTextById("out-issue", sections.ISSUE, "Not reported.");
    Utils.setTextById("out-why", sections.WHY_IT_HAPPENS, "Not reported.");
    Utils.setTextById("out-explanation", sections.EXPLANATION, "Not reported.");
    Utils.setTextById("out-improvements", sections.IMPROVEMENTS, "Not reported.");
    Utils.setTextById("out-complexity", sections.COMPLEXITY, "Not reported.");
    Utils.setTextById("out-edgecases", sections.EDGE_CASES, "Not reported.");

    lastFixedCode = sections.FIXED_CODE || "";
    outFixedCode.textContent = lastFixedCode || "No corrected code was returned.";
  }

  function renderRawFallback(raw) {
    structuredResults.style.display = "none";
    rawFallbackCard.style.display = "block";
    outRaw.textContent = raw;
    lastFixedCode = "";
  }

  /* ---------------------------------------------------------
     ANALYZE FLOW
  --------------------------------------------------------- */
  function handleAnalyze() {
    if (isRequestInFlight) return;

    var code = codeInput.value.trim();
    var language = languageSelect.value;
    var errorMsg = errorInput.value.trim();

    if (!code) {
      resultsSection.classList.add("show");
      resetResults();
      showBanner("error", "Please paste some code before running the analysis.");
      codeInput.focus();
      return;
    }

    isRequestInFlight = true;
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add("loading");
    setStatus("busy", "AI Debugger — Analyzing…");
    analyzeHint.textContent = "Contacting the AI service, this can take a few seconds…";

    resultsSection.classList.add("show");
    resetResults();
    showBanner("warn", "Analyzing your code…");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    AIDebugger.analyzeCode(language, code, errorMsg)
      .then(function (result) {
        if (result.structured) {
          renderStructured(result.sections);
          showBanner("ok", "Analysis complete.");
        } else {
          renderRawFallback(result.raw);
          showBanner("warn", "The AI responded, but not in the expected format. Showing the full response below.");
        }

        History.saveEntry({
          language: language,
          code: code,
          error: errorMsg,
          result: result.raw
        });
        refreshHistory();

        setStatus("ok", "AI Debugger — Ready");
      })
      .catch(function (err) {
        console.error("Debug analysis failed:", err);
        resetResults();
        showBanner("error", friendlyErrorMessage(err));
        setStatus("error", "AI Debugger — Error");
      })
      .finally(function () {
        isRequestInFlight = false;
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove("loading");
        analyzeHint.textContent = "Uses your browser's built-in AI access — no API key needed.";
      });
  }

  function friendlyErrorMessage(err) {
    var msg = err && err.message ? String(err.message) : "";
    if (msg === "AI_UNAVAILABLE") {
      return "The AI service isn't available right now. Please check your connection and reload the page, then try again.";
    }
    if (msg === "EMPTY_CODE") {
      return "Please paste some code before running the analysis.";
    }
    if (msg === "EMPTY_RESPONSE") {
      return "The AI returned an empty response. Please try again in a moment.";
    }
    if (/network|fetch|offline/i.test(msg)) {
      return "A network error occurred while reaching the AI service. Please check your internet connection and try again.";
    }
    if (/rate/i.test(msg)) {
      return "The AI service is rate-limiting requests right now. Please wait a moment and try again.";
    }
    if (/auth|permission|login|sign/i.test(msg)) {
      return "The AI service needs you to be signed in through Puter. A sign-in prompt may appear — please complete it and try again.";
    }
    return "Something went wrong while analyzing your code. Please try again in a moment.";
  }

  analyzeBtn.addEventListener("click", handleAnalyze);

  /* ---------------------------------------------------------
     COPY / DOWNLOAD FIXED CODE
  --------------------------------------------------------- */
  document.getElementById("copyFixedBtn").addEventListener("click", function () {
    Utils.copyToClipboard(lastFixedCode || outFixedCode.textContent, this);
  });

  document.getElementById("downloadFixedBtn").addEventListener("click", function () {
    var content = lastFixedCode || outFixedCode.textContent;
    if (!content || content === "—") return;
    var ext = Utils.extensionForLanguage(languageSelect.value);
    Utils.downloadFile(content, "fixed-code." + ext);
  });

  /* ---------------------------------------------------------
     HISTORY
  --------------------------------------------------------- */
  function refreshHistory() {
    History.render({
      listEl: historyListEl,
      emptyEl: historyEmptyEl,
      onLoad: function (entry) {
        codeInput.value = entry.code;
        errorInput.value = entry.error || "";
        languageSelect.value = entry.language;
        langEcho.textContent = entry.language;
        updateEditorMeta();

        var parsed = AIDebugger.parseAIResponse(entry.result || "");
        resultsSection.classList.add("show");
        resetResults();

        if (parsed.ok && (parsed.sections.ISSUE || parsed.sections.FIXED_CODE)) {
          renderStructured(parsed.sections);
        } else {
          renderRawFallback(entry.result || "");
        }
        showBanner("ok", "Loaded from history · " + Utils.formatTimestamp(entry.timestamp));
        resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      onChange: function () {
        /* no extra work needed — render() already refreshed the list */
      }
    });
  }

  document.getElementById("clearHistoryBtn").addEventListener("click", function () {
    if (History.load().length === 0) return;
    if (confirm("Clear all debugging history? This cannot be undone.")) {
      History.clearAll();
      refreshHistory();
    }
  });

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function init() {
    initTheme();
    updateEditorMeta();
    refreshHistory();

    window.addEventListener("load", function () {
      if (typeof puter === "undefined") {
        setStatus("error", "AI Debugger — Script blocked");
        analyzeHint.textContent = "Could not load the AI service script. Check your connection and reload.";
      }
    });
  }

  init();
})();
