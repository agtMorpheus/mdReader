/**
 * mdReader - presentation.js
 * Parses markdown files by horizontal rules (---) to generate a full-screen,
 * responsive slide deck presentation environment with keyboard controls.
 */

(function () {
  class PresentationMode {
    constructor() {
      this.overlay = null;
      this.container = null;
      this.counter = null;
      this.title = null;
      
      this.slides = [];
      this.currentIndex = 0;
      this.isActive = false;

      this.boundKeyDown = this.handleKeyDown.bind(this);
    }

    init() {
      this.overlay = document.getElementById('presentation-mode');
      this.container = document.getElementById('slide-container');
      this.counter = document.getElementById('slide-counter');
      this.title = document.getElementById('slide-title');
    }

    /**
     * Parse raw markdown text into separate slides.
     * Uses horizontal rule line breaks (---, ***, ___) as slide delimiters.
     */
    parseMarkdown(markdownText, documentTitle = 'Presentation') {
      if (!markdownText) {
        this.slides = [];
        return;
      }

      this.documentTitle = documentTitle;

      // Regex matching lines containing 3 or more dashes, asterisks, or underscores (with optional spaces)
      // e.g. ---,  ***, _____
      const delimiterRegex = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m;
      const chunks = markdownText.split(delimiterRegex);

      // Process and compile each slide
      this.slides = chunks
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0)
        .map(chunk => {
          // Compile slide using global Markdown parser
          if (window.Markdown) {
            return window.Markdown.parse(chunk);
          }
          return `<p>${chunk}</p>`;
        });
    }

    /**
     * Start slide presentation mode
     */
    start() {
      if (this.slides.length === 0) {
        alert('No slides content parsed from document.');
        return;
      }

      this.isActive = true;
      this.currentIndex = 0;
      
      if (this.overlay) {
        this.overlay.classList.remove('hidden');
      }

      // Add keyboard controls
      window.addEventListener('keydown', this.boundKeyDown);

      // Show first slide
      this.renderSlide();
    }

    /**
     * Stop presentation mode
     */
    stop() {
      this.isActive = false;
      if (this.overlay) {
        this.overlay.classList.add('hidden');
      }

      // Remove keyboard controls
      window.removeEventListener('keydown', this.boundKeyDown);
    }

    /**
     * Render active slide to the container
     */
    renderSlide() {
      if (!this.container || this.slides.length === 0) return;

      const slideHtml = this.slides[this.currentIndex];
      
      // Inject slide
      this.container.innerHTML = `<div class="slide-content">${slideHtml}</div>`;
      
      // Post-process highlight / copy / math inside the slide
      if (window.Markdown) {
        window.Markdown.postProcess(this.container);
      }

      // Update counters
      if (this.counter) {
        this.counter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
      }

      if (this.title) {
        this.title.textContent = this.documentTitle;
      }
    }

    /**
     * Navigate next slide
     */
    next() {
      if (this.currentIndex < this.slides.length - 1) {
        this.currentIndex++;
        this.renderSlide();
      }
    }

    /**
     * Navigate previous slide
     */
    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderSlide();
      }
    }

    /**
     * Manage keyboard navigation events
     */
    handleKeyDown(e) {
      if (!this.isActive) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          this.next();
          break;
        case 'ArrowLeft':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault();
          this.prev();
          break;
        case 'Escape':
          e.preventDefault();
          this.stop();
          break;
      }
    }
  }

  // Export to global namespace
  window.Presentation = new PresentationMode();
})();
