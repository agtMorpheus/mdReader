/**
 * mdReader - export.js
 * Handles document exports (Sanitized HTML download, and PDF generation via window.print)
 */

(function () {
  /**
   * Escape the 5 special HTML characters for safe injection into element
   * attributes and text contexts (e.g. <title>).
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  class DocumentExport {
    
    /**
     * Download the rendered and sanitized HTML
     */
    exportToHTML(contentElement, fileName = 'document.html') {
      if (!contentElement) return;

      // --- 1. Build a clean DOM clone, stripping interactive artifacts ---
      // Copy buttons, active search highlights, and other post-processing
      // elements are ephemeral UI — they should not appear in a static export.
      const clone = contentElement.cloneNode(true);
      clone.querySelectorAll('.btn-copy-code, .code-block-header, .search-highlight, .search-current')
        .forEach(el => {
          // Unwrap search-highlight spans, restoring their inner text
          if (el.classList.contains('search-highlight') || el.classList.contains('search-current')) {
            el.replaceWith(document.createTextNode(el.textContent));
          } else {
            el.remove();
          }
        });

      // --- 2. Re-sanitize the cloned content with a conservative static profile ---
      // Even though the render target was already sanitized, the export creates
      // a new browsing context, so we sanitize again without iframe/embed support.
      let htmlContent;
      if (typeof DOMPurify !== 'undefined') {
        htmlContent = DOMPurify.sanitize(clone.innerHTML, {
          USE_PROFILES: { html: true, mathMl: true },
          // No ADD_TAGS: the export is a static snapshot — no iframes allowed
          FORBID_TAGS: ['iframe', 'embed', 'object', 'form', 'input', 'button', 'script'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
        });
      } else {
        // DOMPurify unavailable — fall back to the raw clone and warn
        console.warn('export.js: DOMPurify not available; exporting raw innerHTML.');
        htmlContent = clone.innerHTML;
      }

      // --- 3. Escape the document title for safe injection into <title> ---
      const documentTitle = escapeHtml(document.title || 'Rendered Document');

      // Create a clean standalone HTML template including styling
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  <style>
    /* Standalone export styling */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #24292f;
      background-color: #ffffff;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h3 { font-size: 1.25em; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote {
      padding: 0 1em;
      color: #57606a;
      border-left: .25em solid #d0d7de;
      margin: 0 0 1rem 0;
    }
    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 6px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, SF Font, Menlo, Monaco, Consolas, monospace;
      font-size: 85%;
      background-color: rgba(175,184,193,0.2);
      padding: .2em .4em;
      border-radius: 6px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
      font-size: 100%;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #d0d7de;
      padding: 6px 13px;
    }
    th { background-color: #f6f8fa; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

      // Trigger download
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.[^/.]+$/, "") + '.html'; // Ensure .html extension
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    /**
     * Trigger browser printing panel which parses media print styles in print.css
     */
    exportToPDF() {
      window.print();
    }
  }

  // Export to global namespace
  window.Export = new DocumentExport();
})();
