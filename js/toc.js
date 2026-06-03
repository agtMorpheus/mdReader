/**
 * mdReader - toc.js
 * Parses the rendered document headings to automatically generate a
 * Table of Contents sidebar and track active scrolling section.
 */

(function () {
  class TableOfContents {
    constructor() {
      this.tocContainer = null;
      this.observer = null;
      this.headingElements = [];
    }

    /**
     * Initialize TOC target elements
     */
    init(containerId) {
      this.tocContainer = document.getElementById(containerId);
    }

    /**
     * Generates a slug from text content for heading anchors
     */
    slugify(text) {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
    }

    /**
     * Generate TOC links from headings inside targetElement
     */
    generate(targetElement) {
      if (!this.tocContainer) return;
      
      // Clear current content
      this.tocContainer.innerHTML = '';
      
      if (!targetElement) {
        this.renderEmpty();
        return;
      }

      // Query h1, h2, h3 headings
      const headings = targetElement.querySelectorAll('h1, h2, h3');
      this.headingElements = Array.from(headings);

      if (this.headingElements.length === 0) {
        this.renderEmpty();
        return;
      }

      const fragment = document.createDocumentFragment();

      this.headingElements.forEach((heading, index) => {
        // Ensure heading has an ID
        if (!heading.id) {
          const slug = this.slugify(heading.textContent);
          // Append index to avoid duplication conflicts
          heading.id = slug ? `${slug}-${index}` : `heading-${index}`;
        }

        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.className = `toc-link indent-${heading.tagName.charAt(1)}`;
        link.textContent = heading.textContent;
        link.dataset.targetId = heading.id;

        // Smooth scroll event listener
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(heading.id);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // On small viewports, click triggers navigation and focus
            history.pushState(null, null, `#${heading.id}`);
            this.setActiveLink(link.dataset.targetId);
          }
        });

        fragment.appendChild(link);
      });

      this.tocContainer.appendChild(fragment);

      // Start observing scroll position to highlight active heading
      this.setupIntersectionObserver();
    }

    renderEmpty() {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'toc-empty';
      emptyMsg.textContent = 'No headings found';
      this.tocContainer.appendChild(emptyMsg);
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    /**
     * Highlight the TOC item corresponding to the active document section
     */
    setActiveLink(id) {
      if (!this.tocContainer) return;
      const links = this.tocContainer.querySelectorAll('.toc-link');
      links.forEach(link => {
        if (link.dataset.targetId === id) {
          link.classList.add('active');
          // Scroll TOC panel if active link is out of view
          link.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        } else {
          link.classList.remove('active');
        }
      });
    }

    /**
     * Setup IntersectionObserver to trace active reading position
     */
    setupIntersectionObserver() {
      if (this.observer) {
        this.observer.disconnect();
      }

      if (!('IntersectionObserver' in window)) return;

      const options = {
        root: document.getElementById('reading-canvas'),
        rootMargin: '0px 0px -60% 0px', // Trigger when heading is near the top
        threshold: 0.1
      };

      this.observer = new IntersectionObserver((entries) => {
        // Find headings entering/leaving screen
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.setActiveLink(entry.target.id);
          }
        });
      }, options);

      this.headingElements.forEach(heading => {
        this.observer.observe(heading);
      });
    }
  }

  // Export to global namespace
  window.TOC = new TableOfContents();
})();
