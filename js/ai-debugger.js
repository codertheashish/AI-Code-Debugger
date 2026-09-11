/* =============================================================
   ai-debugger.js
   Complete AI integration for the debugging assistant, built on
   Puter.js (https://js.puter.com/v2/) so no API key or backend
   server is required.

   Public API:
     AIDebugger.analyzeCode(language, code, errorMessage) -> Promise
       resolves to:
         {
           ok: true,
           structured: boolean,       // true if labeled sections were parsed
           sections: {...} | null,    // present when structured === true
           raw: string                // full raw AI response, always present
         }
       rejects with an Error whose .message is one of a small set of
       known codes (see friendlyErrorMessage in app.js), or a generic
       message, so callers never see a raw stack trace.

   Security:
     - Never calls eval() or Function() on anything.
     - Never executes user-submitted or AI-generated code.
     - Only reads/writes plain strings; rendering into the DOM is the
       caller's responsibility and must use textContent (see app.js).
============================================================= */

(function (global) {
  "use strict";

  // Change the AI model used for debugging from this single constant.
  var AI_MODEL = "gpt-5-nano";

  var SECTION_LABELS = [
    "ISSUE",
    "WHY_IT_HAPPENS",
    "FIXED_CODE",
    "EXPLANATION",
    "IMPROVEMENTS",
    "COMPLEXITY",
    "EDGE_CASES"
  ];

  /**
   * Build the debugging prompt sent to the AI model.
   * @param {string} language
   * @param {string} code
   * @param {string} errorMessage
   * @returns {string}
   */
  function buildPrompt(language, code, errorMessage) {
    return [
      "You are an expert software debugging assistant.",
      "Analyze the provided code carefully. Do not invent errors that are not present.",
      "If the code is correct, explicitly say that it appears correct.",
      "Identify:",
      "- Syntax errors",
      "- Runtime errors",
      "- Logical errors",
      "- Performance problems",
      "- Security issues",
      "- Bad programming practices",
      "State which of these categories each issue belongs to.",
      "Explain the root cause in beginner-friendly language.",
      "Provide corrected code.",
      "Preserve the user's intended functionality whenever possible.",
      "Do not unnecessarily rewrite working code.",
      "",
      "PROGRAMMING LANGUAGE: " + language,
      "",
      "USER CODE:",
      "```" + language.toLowerCase(),
      code,
      "```",
      "",
      "ERROR MESSAGE / PROBLEM DESCRIPTION:",
      errorMessage ? errorMessage : "(none provided)",
      "",
      "Return your response using exactly these labeled sections, each starting on its own",
      "line with the label followed by a colon. Do not use markdown headers, only these",
      "plain labels:",
      "ISSUE:",
      "WHY_IT_HAPPENS:",
      "FIXED_CODE:",
      "EXPLANATION:",
      "IMPROVEMENTS:",
      "COMPLEXITY:",
      "EDGE_CASES:",
      "",
      "Inside FIXED_CODE, put only the corrected source code, wrapped in a single markdown",
      "code fence. Keep every other section as clear prose or short bullet points."
    ].join("\n");
  }

  /**
   * Call Puter's AI chat endpoint with graceful model fallback.
   * @param {string} prompt
   * @returns {Promise<string>} raw text response
   */
  function callPuterAI(prompt) {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      return Promise.reject(new Error("AI_UNAVAILABLE"));
    }

    // Try the configured model first; if the session's Puter build doesn't
    // support that model id, fall back to Puter's own default model.
    return puter.ai
      .chat(prompt, { model: AI_MODEL })
      .then(extractResponseText)
      .catch(function () {
        return puter.ai.chat(prompt).then(extractResponseText);
      });
  }

  /**
   * Normalize the many possible shapes of a Puter AI response into plain text.
   * @param {*} response
   * @returns {string}
   */
  function extractResponseText(response) {
    if (typeof response === "string") return response;
    if (!response) return "";

    if (typeof response.toString === "function") {
      var s = response.toString();
      if (s && s !== "[object Object]") return s;
    }

    if (response.message && response.message.content) {
      var c = response.message.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c
          .map(function (block) {
            return block && (block.text || block.content || "");
          })
          .join("\n");
      }
    }

    if (typeof response.text === "string") return response.text;

    if (Array.isArray(response.content)) {
      return response.content
        .map(function (block) {
          return block && block.text ? block.text : "";
        })
        .join("\n");
    }

    try {
      return JSON.stringify(response);
    } catch (e) {
      return String(response);
    }
  }

  /**
   * Parse a raw AI response into labeled sections.
   * @param {string} raw
   * @returns {{ok:boolean, sections?:Object, raw:string}}
   */
  function parseAIResponse(raw) {
    var pattern = new RegExp("(" + SECTION_LABELS.join("|") + ")\\s*:", "g");
    var matches = [];
    var m;
    while ((m = pattern.exec(raw)) !== null) {
      matches.push({ label: m[1], index: m.index, end: pattern.lastIndex });
    }

    if (matches.length === 0) {
      return { ok: false, raw: raw };
    }

    var sections = {};
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].end;
      var end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
      sections[matches[i].label] = raw.slice(start, end).trim();
    }

    return { ok: true, sections: sections, raw: raw };
  }

  /**
   * Strip a single markdown code fence from the FIXED_CODE section, if present.
   * @param {string} text
   * @returns {string}
   */
  function stripCodeFence(text) {
    if (!text) return "";
    var fenceMatch = text.match(/```[a-zA-Z0-9+#]*\n([\s\S]*?)```/);
    if (fenceMatch) return fenceMatch[1].trim();
    return text.trim();
  }

  /**
   * Validate inputs, build the prompt, call the AI, and return a
   * structured result. This is the single public entry point used
   * by app.js.
   * @param {string} language
   * @param {string} code
   * @param {string} errorMessage
   * @returns {Promise<{ok:boolean, structured:boolean, sections:Object|null, raw:string}>}
   */
  function analyzeCode(language, code, errorMessage) {
    if (!code || !code.trim()) {
      return Promise.reject(new Error("EMPTY_CODE"));
    }
    if (!language) {
      return Promise.reject(new Error("MISSING_LANGUAGE"));
    }

    var prompt = buildPrompt(language, code.trim(), (errorMessage || "").trim());

    return callPuterAI(prompt).then(function (raw) {
      if (!raw || !raw.trim()) {
        throw new Error("EMPTY_RESPONSE");
      }

      var parsed = parseAIResponse(raw);
      var hasUsefulStructure = parsed.ok && (parsed.sections.ISSUE || parsed.sections.FIXED_CODE);

      if (hasUsefulStructure) {
        var sections = parsed.sections;
        sections.FIXED_CODE = stripCodeFence(sections.FIXED_CODE || "");
        return { ok: true, structured: true, sections: sections, raw: raw };
      }

      return { ok: true, structured: false, sections: null, raw: raw };
    });
  }

  global.AIDebugger = {
    analyzeCode: analyzeCode,
    // exposed for potential reuse/testing, not required by app.js
    buildPrompt: buildPrompt,
    parseAIResponse: parseAIResponse
  };
})(window);