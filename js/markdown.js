/**
 * mdReader - markdown.js
 * Handles loading files, rendering markdown to HTML, sanitizing output,
 * applying syntax highlighting and mermaid diagrams.
 */

(function () {
  class MarkdownParser {
    constructor() {
      this.initMarked();
      this.setupDOMPurifyHooks();
    }

    /**
     * Configure marked compiler
     */
    initMarked() {
      if (typeof marked !== 'undefined') {
        marked.setOptions({
          gfm: true,
          breaks: true
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
     * Set up security hooks for DOMPurify
     */
    setupDOMPurifyHooks() {
      if (typeof DOMPurify !== 'undefined' && !DOMPurify.hasSecurityHook) {
        DOMPurify.addHook('uponSanitizeElement', (node, data) => {
          if (data.tagName === 'iframe') {
            const src = node.getAttribute('src') || '';
            
            // Allowlist for iframe sources (YouTube, Vimeo, Google Maps)
            const isAllowedUrl = /^(https:\/\/www\.youtube\.com\/embed\/|https:\/\/www\.youtube-nocookie\.com\/embed\/|https:\/\/player\.vimeo\.com\/video\/|https:\/\/www\.google\.com\/maps\/embed)/.test(src);
            
            if (!isAllowedUrl) {
              if (node.parentNode) {
                node.parentNode.removeChild(node);
              } else {
                node.setAttribute('src', 'about:blank');
              }
              return;
            }
            
            // Enforce strict sandboxing without allow-same-origin to prevent breakouts
            node.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-presentation');
            
            // Allow list of safe attributes
            const allowedAttributes = ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'sandbox', 'title', 'class', 'id', 'style'];
            const attrs = Array.from(node.attributes);
            for (const attr of attrs) {
              if (!allowedAttributes.includes(attr.name.toLowerCase())) {
                node.removeAttribute(attr.name);
              }
            }
          }
        });
        DOMPurify.hasSecurityHook = true;
      }
    }

    /**
     * Parses raw Markdown string into sanitized HTML
     */
    parse(markdownText) {
      if (typeof marked === 'undefined') return '<p>Compiler Error: marked.js is not loaded.</p>';
      
      // Compile Markdown
      const rawHtml = marked.parse(markdownText);

      // Make sure hooks are set up
      this.setupDOMPurifyHooks();

      // Sanitize compiled HTML using DOMPurify
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['iframe'], // Allow only iframe, removing embed entirely
          ADD_ATTR: ['sandbox', 'allow', 'allowfullscreen', 'frameborder'],
          USE_PROFILES: { html: true, mathMl: true }
        });
      }

      console.warn('DOMPurify not loaded. Rendering blocked to prevent XSS.');
      return `<div style="padding: 20px; border: 1px solid #ffcccb; background-color: #fff6f6; color: #d8000c; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px 0; line-height: 1.5;">
        <strong style="font-size: 1.1em;">Security Alert:</strong> The sanitization module (DOMPurify) is not loaded. Rendering has been halted to prevent potential script execution (XSS). Please check your connection or reload the page.
      </div>`;
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

      // 3. Wrap tables for horizontal scrolling on narrow screens
      element.querySelectorAll('table').forEach(table => {
        if (!table.parentElement.classList.contains('table-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'table-wrapper';
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
      });
    }

    /**
     * Renders mermaid graphs asynchronously using IntersectionObserver
     */
    renderMermaid() {
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: document.body.classList.contains('theme-dark') ? 'dark' : 'default'
          });

          const mermaidBlocks = document.querySelectorAll('.mermaid');

          if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const el = entry.target;
                  if (!el.dataset.mermaidRendered) {
                    try {
                      mermaid.run({ nodes: [el] });
                      el.dataset.mermaidRendered = 'true';
                    } catch (err) {
                      console.error('Error running mermaid on block:', err);
                    }
                  }
                  obs.unobserve(el);
                }
              });
            }, { rootMargin: '200px' });

            mermaidBlocks.forEach(block => observer.observe(block));
          } else {
            // Fallback for older browsers without IntersectionObserver
            mermaid.run({ querySelector: '.mermaid' });
          }
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
