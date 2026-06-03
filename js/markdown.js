/**
 * mdReader - markdown.js
 * Handles loading files, rendering markdown to HTML, sanitizing output,
 * applying syntax highlighting and mermaid diagrams.
 */

(function () {
  class MarkdownParser {
    constructor() {
      this.initMarked();
    }

    /**
     * Configure marked compiler
     */
    initMarked() {
      if (typeof marked !== 'undefined') {
        marked.setOptions({
          gfm: true,
          breaks: true,
          headerIds: true,
          mangle: false
        });
        
        // Add KaTeX extension if available
        if (typeof markedKatex === 'function') {
          marked.use(markedKatex({
            throwOnError: false,
            nonStandard: true
          }));
        }
      } else {
        console.error('marked.js library is missing.');
      }
    }

    /**
     * Parses raw Markdown string into sanitized HTML
     */
    parse(markdownText) {
      if (typeof marked === 'undefined') return '<p>Compiler Error: marked.js is not loaded.</p>';
      
      // Compile Markdown
      const rawHtml = marked.parse(markdownText);

      // Sanitize compiled HTML using DOMPurify
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['iframe', 'embed'], // Allow safe embeddings if needed
          USE_PROFILES: { html: true, mathMl: true }
        });
      }

      console.warn('DOMPurify not loaded. Output might be vulnerable to XSS.');
      return rawHtml;
    }

    /**
     * Post-process the DOM inside the render target to set up syntax highlight,
     * copy buttons, and mermaid diagrams.
     */
    postProcess(element) {
      if (!element) return;

      // 1. Process Code Blocks (Syntax Highlighting & Copy Buttons)
      const preBlocks = element.querySelectorAll('pre');
      preBlocks.forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;

        // Extract language class (e.g., language-js)
        let lang = 'text';
        const classes = code.className.split(' ');
        const langClass = classes.find(c => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '');
        }

        // Handle Mermaid.js blocks specifically
        if (lang.toLowerCase() === 'mermaid') {
          pre.classList.add('mermaid-block');
          code.classList.add('mermaid');
          // We will render mermaid separately in an async step
          return;
        }

        // Apply highlight.js highlighting if available
        if (typeof hljs !== 'undefined') {
          hljs.highlightElement(code);
        }

        // Check if copy-wrapper header is already built
        const sibling = pre.previousElementSibling;
        if (sibling && sibling.classList.contains('code-block-header')) {
          return;
        }

        // Wrap pre in header with copy button and language tag
        const header = document.createElement('div');
        header.className = 'code-block-header';
        
        const langTag = document.createElement('span');
        langTag.className = 'code-lang-tag';
        langTag.textContent = lang.toUpperCase();

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy-code';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(code.textContent).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
          }).catch(err => {
            console.error('Failed to copy text:', err);
            copyBtn.textContent = 'Failed';
          });
        });

        header.appendChild(langTag);
        header.appendChild(copyBtn);
        pre.parentNode.insertBefore(header, pre);
      });

      // 2. Process Mermaid Diagrams
      this.renderMermaid();
    }

    /**
     * Renders mermaid graphs asynchronously
     */
    renderMermaid() {
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: document.body.classList.contains('theme-dark') ? 'dark' : 'default'
          });
          mermaid.run({
            querySelector: '.mermaid'
          });
        } catch (e) {
          console.error('Error rendering mermaid diagrams:', e);
        }
      }
    }

    /**
     * Reads a File object and returns a promise resolving with text content
     */
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    }
  }

  // Export to global namespace
  window.Markdown = new MarkdownParser();
})();
