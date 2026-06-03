# mdReader

> A clean, blazing-fast, distraction-free Markdown reader and viewer designed for maximum focus and beautiful typography.

**mdReader** is a 100% client-side, dependency-free (at runtime) Single Page Application (SPA). It allows you to simply drag and drop any `.md` or `.txt` file directly into your browser to instantly render it into a beautifully formatted document.

## ✨ Features

- **"Monoblock" Architecture:** The entire application—HTML, CSS, and modular JavaScript—is compiled into a single, highly portable `index.html` file weighing in at under 70 KB. It runs completely offline with zero backend.
- **Session Persistence:** When you close the app, your active document and exact scroll position are seamlessly saved locally. Reopen the reader later to pick up exactly where you left off.
- **Premium Typography:** Ships with elegantly tuned fonts (`Libertinus Serif` and `Outfit`) combined with smart default metrics for line height, margins, and headings.
- **Advanced Markdown Parsing:**
  - Standard GitHub Flavored Markdown (via `marked.js`).
  - **Math & Formulas:** Full LaTeX equation support via `KaTeX`, correctly handling both inline (`$E=mc^2$`) and block (`$$`) equations.
  - **Syntax Highlighting:** Integrated `highlight.js` that automatically switches between light and dark code themes based on the UI.
  - **Diagrams:** Full support for `mermaid.js` flowcharts and diagrams.
- **Layout Control:** Toggle between a standard "Single Column" and a sophisticated "Two Columns" desktop layout that intelligently spans main headers across columns to prevent awkward vertical scrolling.
- **Presentation Mode:** Instantly transform any markdown document separated by horizontal rules (`---`) into a sleek, full-screen slide presentation.
- **Dynamic Tools:**
  - Auto-generated Table of Contents with a responsive, slide-out mobile drawer.
  - Real-time text search and highlighting with previous/next navigation.
  - Deep appearance customization (Light/Dark mode, fonts, sizing, layout width, and a "Restore Defaults" button).
- **Export Options:** Easily save your rendered document as HTML, or use the Print/PDF layout specifically optimized for paper/PDF generation.

## 🚀 Getting Started

### Usage (No installation required)

Simply locate the `dist/index.html` file in the project directory and double-click it to open it in any modern browser. 
Once open, drag and drop your `.md` or `.txt` file into the target zone, or click the button to browse.

### Development

To modify the source code and rebuild the monoblock `index.html`:

1. **Install Dependencies** (only required for development):
   ```bash
   npm install
   ```

2. **Make your changes** in the modular files inside `css/` and `js/`.

3. **Build the Application**:
   ```bash
   npm run build
   ```
   This will execute the `build.js` Node script, which intelligently concatenates, scopes, and injects all CSS and JS assets directly into `dist/index.html`.

## 🛠 Tech Stack

- Vanilla HTML5 / CSS3 / ES6 JavaScript
- **[Marked.js](https://marked.js.org/)** for fast Markdown parsing.
- **[KaTeX](https://katex.org/)** & `marked-katex-extension` for robust mathematical typesetting.
- **[Highlight.js](https://highlightjs.org/)** for code block styling.
- **[Mermaid.js](https://mermaid.js.org/)** for diagrams.

## 📱 Mobile Support

Fully responsive. The Table of Contents transforms into a smooth navigation drawer, toolbars are simplified, and the reading canvas smartly manages touch interactions and spacing for smaller screens.

---

*Designed and engineered for a seamless reading experience.*
