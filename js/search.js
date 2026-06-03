/**
 * mdReader - search.js
 * Implements real-time text search inside the rendered markdown document
 * using DOM text node traversal (avoiding breaking HTML structure/attributes)
 * and highlights active matches.
 */

(function () {
  class DocumentSearch {
    constructor() {
      this.targetElement = null;
      this.matches = [];
      this.currentIndex = -1;
      this.query = '';
    }

    init(targetId) {
      this.targetElement = document.getElementById(targetId);
    }

    /**
     * Clear all current search highlights and reset search state
     */
    clear() {
      if (!this.targetElement) return;

      const highlights = this.targetElement.querySelectorAll('.search-highlight');
      highlights.forEach(span => {
        const textNode = document.createTextNode(span.textContent);
        span.parentNode.replaceChild(textNode, span);
      });

      // Normalize parent elements to join split text nodes
      this.targetElement.normalize();

      this.matches = [];
      this.currentIndex = -1;
      this.query = '';

      this.updateUI();
    }

    /**
     * Search the document and highlight all occurrences of query
     */
    search(query) {
      this.clear();
      
      if (!query || query.trim() === '') return;
      this.query = query.toLowerCase();

      // Find and highlight matches in text nodes
      this.highlightMatches(this.targetElement);

      this.matches = Array.from(this.targetElement.querySelectorAll('.search-highlight'));
      
      if (this.matches.length > 0) {
        this.currentIndex = 0;
        this.highlightCurrent();
      }

      this.updateUI();
    }

    /**
     * Traverses nodes recursively to find matches only in text nodes
     */
    highlightMatches(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        const index = text.toLowerCase().indexOf(this.query);
        
        if (index !== -1) {
          const parent = node.parentNode;
          // Skip if parent is inside pre/code or table tags if preferred,
          // but specs say: "visually marks matching terms inside the rendered content"
          // Skip if parent is already a highlight
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.classList.contains('search-highlight'))) {
            return;
          }

          // Split text node around match
          const before = text.substring(0, index);
          const matchText = text.substring(index, index + this.query.length);
          const after = text.substring(index + this.query.length);

          const fragment = document.createDocumentFragment();

          if (before) fragment.appendChild(document.createTextNode(before));

          const highlightSpan = document.createElement('span');
          highlightSpan.className = 'search-highlight';
          highlightSpan.textContent = matchText;
          fragment.appendChild(highlightSpan);

          if (after) {
            const remainingTextNode = document.createTextNode(after);
            fragment.appendChild(remainingTextNode);
            // Recursively check remaining text for more matches in the same node
            this.highlightMatches(remainingTextNode);
          }

          parent.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.hasChildNodes()) {
        // Create an array of children to prevent live nodeList mutation issues during replacement
        const children = Array.from(node.childNodes);
        children.forEach(child => this.highlightMatches(child));
      }
    }

    /**
     * Highlights the current search result
     */
    highlightCurrent() {
      this.matches.forEach((el, idx) => {
        if (idx === this.currentIndex) {
          el.classList.add('search-current');
          // Scroll target match into view
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          el.classList.remove('search-current');
        }
      });
    }

    /**
     * Navigate to next match
     */
    next() {
      if (this.matches.length === 0) return;
      this.currentIndex = (this.currentIndex + 1) % this.matches.length;
      this.highlightCurrent();
      this.updateUI();
    }

    /**
     * Navigate to previous match
     */
    prev() {
      if (this.matches.length === 0) return;
      this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
      this.highlightCurrent();
      this.updateUI();
    }

    /**
     * Update counter UI elements
     */
    updateUI() {
      const controls = document.getElementById('search-controls');
      const counter = document.getElementById('search-counter');
      
      if (!controls || !counter) return;

      if (this.query === '') {
        controls.classList.add('hidden');
      } else {
        controls.classList.remove('hidden');
        if (this.matches.length === 0) {
          counter.textContent = '0 of 0';
        } else {
          counter.textContent = `${this.currentIndex + 1} of ${this.matches.length}`;
        }
      }
    }
  }

  // Export to global namespace
  window.Search = new DocumentSearch();
})();
