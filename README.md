# AI-Powered Code & Debugging Assistant

A browser-based coding assistant that analyzes source code, explains bugs in
plain language, and suggests corrected code — powered by AI, with **no
backend server, no API keys, and no build step**. Deploys directly to
GitHub Pages as a static site.

**Find bugs. Understand errors. Fix code faster.**

---

## Features

- **Code editor** with line numbers, live character/line count, copy and
  clear actions
- **8 supported languages**: Python, JavaScript, Java, C++, C, HTML, CSS, SQL
- **Optional error input** — paste a stack trace or just describe the problem
- **AI-powered analysis** covering:
  - Issue summary
  - Why it happens (root cause, beginner-friendly)
  - Fixed code
  - Explanation
  - Suggested improvements
  - Complexity analysis
  - Potential edge cases
- **Copy / download** the corrected code as a file
- **3 built-in examples** (Python logical bug, JavaScript runtime error,
  C++ out-of-bounds access) to try the assistant instantly
- **Local debugging history** (up to 20 entries) — reopen, delete, or clear
- **Dark / light theme**, persisted across visits
- **Fully responsive** — desktop, tablet, and mobile (including Android)
- **Accessible**: semantic HTML, labeled controls, visible focus states,
  keyboard-operable history items

---

## Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Markup     | HTML5 (semantic)                              |
| Styling    | CSS3 (custom properties, no framework)        |
| Behavior   | Vanilla JavaScript (ES6, no build step)       |
| AI         | [Puter.js](https://js.puter.com/v2/) — `puter.ai.chat()` |
| Storage    | Browser `localStorage` (no database)          |
| Fonts      | Space Grotesk (UI), JetBrains Mono (code)     |
| Hosting    | GitHub Pages (static, no server)              |

No React, no Next.js, no Node backend, no npm, no Vite/Webpack, no
Firebase/MongoDB/MySQL, and no API keys are used anywhere in this project.

---

## How It Works

1. The user pastes code, picks a language, and optionally describes an
   error or pastes a stack trace.
2. `js/ai-debugger.js` builds a structured debugging prompt and sends it to
   the AI model through Puter.js (`puter.ai.chat`), which runs entirely in
   the browser — Puter handles AI access without exposing any API key.
3. The AI's response is parsed for labeled sections (`ISSUE:`,
   `WHY_IT_HAPPENS:`, `FIXED_CODE:`, etc.). If the model doesn't follow the
   format exactly, the app safely falls back to showing the full raw
   response instead of breaking.
4. Results are rendered using `textContent` only — the app never uses
   `innerHTML` with AI-generated content, and never executes user or
   AI-generated code.
5. Each analysis is saved to `localStorage` so it can be revisited later,
   even after closing the tab.

---

## Project Structure

```
ai-code-debugger/
│
├── index.html          # Page structure only — no inline CSS/JS logic
│
├── css/
│   └── style.css        # All styling (theme, layout, components, responsive)
│
├── js/
│   ├── utils.js          # Clipboard, download, formatting, DOM helpers
│   ├── examples.js        # Sample buggy code snippets
│   ├── ai-debugger.js      # Puter.js AI integration, prompt + response parsing
│   ├── history.js          # localStorage-backed history (save/load/delete/render)
│   └── app.js               # Main controller — wires DOM to the modules above
│
├── assets/
│   └── logo.svg          # Self-contained brand mark (no external image)
│
├── README.md
└── .gitignore
```

Script load order (see the bottom of `index.html`) matters: Puter.js loads
first, then `utils.js` and `examples.js` (no dependencies), then
`ai-debugger.js` (depends on Puter being present), then `history.js`
(depends on `Utils`), and finally `app.js`, which depends on all of the
above.

---

## Running Locally

No installation or build step is required. Either:

- **Open directly**: double-click `index.html` to open it in your browser, or
- **Serve it** (recommended, avoids any browser file:// quirks):

  ```bash
  # Python 3
  python -m http.server 8000

  # or Node's http-server, if you already have it installed
  npx http-server .
  ```

  Then visit `http://localhost:8000`.

An internet connection is required for the AI features (Puter.js is loaded
from a CDN and performs the actual AI call), and for loading the Google
Fonts used by the UI.

---

## GitHub Pages Deployment

1. Create a new GitHub repository and push this project's contents to it
   (the `ai-code-debugger/` folder's contents go at the repo root, or in a
   subfolder — either works, see the note on relative paths below).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a
   branch**, choose the **main** branch and the **/(root)** folder.
4. Save. GitHub Pages will publish the site within about a minute at
   `https://<your-username>.github.io/<repo-name>/`.

All asset references (`./css/style.css`, `./js/app.js`,
`./assets/logo.svg`, etc.) use **relative paths**, so the site works
correctly whether it's hosted at the root of a domain or under a repository
subpath — no configuration changes are needed either way.

---

## AI Integration

AI functionality is provided entirely client-side by
[Puter.js](https://js.puter.com/v2/), loaded via:

```html
<script src="https://js.puter.com/v2/"></script>
```

The assistant calls `puter.ai.chat(prompt, { model })` from
`js/ai-debugger.js`. The model used is controlled by a single constant
(`AI_MODEL`) at the top of that file, so it can be swapped without touching
any other code. If the configured model isn't available in a given
session, the app automatically retries with Puter's default model.

Puter manages authentication and usage on its own infrastructure — this
project never stores, transmits, or requests an API key of its own.

---

## Security Considerations

- **No `eval()` or `new Function()`** anywhere in the codebase.
- **User-submitted code is never executed.** It is treated purely as text
  sent to the AI for analysis.
- **AI-generated code is never executed either** — it is only ever
  displayed, copied, or downloaded as a text file.
- All dynamic content (AI results, history entries) is rendered using
  `textContent` / safely constructed DOM nodes, never `innerHTML`, so a
  malicious or malformed AI response cannot inject markup into the page.
- No API keys, secrets, or credentials are stored in this repository, in
  `localStorage`, or anywhere in client code.
- All debugging history stays on the user's own device in `localStorage`;
  nothing is sent to a server the project controls, because there isn't one.

---

## Future Improvements

- Optional syntax highlighting in the editor (e.g. via a lightweight,
  CDN-loaded highlighter) while keeping the app fully offline-buildable
- Export/import of history as a JSON file
- Side-by-side diff view between original and fixed code
- Additional language support and per-language linting hints
- PWA support (installable, offline-friendly shell)

---

## Credits

Built with HTML, CSS, JavaScript, and AI via [Puter.js](https://puter.com).
Fonts: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) and
[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), both via
Google Fonts.

## 👨‍💻 Author

**Ashish Kumar Prajapati**

- GitHub :
[codertheashish](https://github.com/codertheashish)
- LinkedIn :
[codertheashish](https://www.linkedin.com/in/codertheashish/)
- Instagram :
[codertheashish](https://www.instagram.com/codertheashish/)
---

<img width="1726" height="911" alt="AI Code Debugger Png 1" src="https://github.com/user-attachments/assets/5af8dff2-6dd4-4e22-b9de-8e2ec245388e" />
