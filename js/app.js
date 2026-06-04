/**
 * mdReader - app.js
 * Main entry orchestrator. Hooks DOM elements, manages file uploading/dropping,
 * wires layout preferences, sets up search queries, shortcuts, and navigation flow.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------------
  // Utilities
  // ----------------------------------------------------------------

  /**
   * Returns a debounced version of fn that delays invocation by `delay` ms.
   */
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Display a brief notification toast (replaces blocking alert()).
   * @param {string} message
   * @param {'error'|'info'|'warning'} type
   * @param {number} duration  Auto-dismiss in ms; 0 = stay until closed manually.
   */
  function showToast(message, type = 'error', duration = 6000) {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn('[Toast]', message); return; }

    const icons = { error: '\u26a0\ufe0f', info: '\u2139\ufe0f', warning: '\u26a1' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type] || '\u2022'}</span>
      <span class="toast-body">${message}</span>
      <button class="toast-close" aria-label="Fechar notifica\u00e7\u00e3o">\u00d7</button>
    `;
    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    };
    closeBtn.addEventListener('click', dismiss);
    container.appendChild(toast);
    if (duration > 0) setTimeout(dismiss, duration);
  }
  // Expose globally so presentation.js and other modules can use it
  window.showToast = showToast;

  // --- DOM References ---
  const landingZone = document.getElementById('landing-zone');
  const dropCard = document.getElementById('drop-card');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');

  const readerLayout = document.getElementById('reader-layout');
  const btnBackLanding = document.getElementById('btn-back-landing');
  const btnToggleToc = document.getElementById('btn-toggle-toc');
  const btnCloseToc = document.getElementById('btn-close-toc');
  const tocSidebar = document.getElementById('toc-sidebar');
  const displayFileName = document.getElementById('display-file-name');
  const displayFileSize = document.getElementById('display-file-size');

  const renderTarget = document.getElementById('render-target');
  
  // Search
  const searchInput = document.getElementById('search-input');
  const btnSearchPrev = document.getElementById('search-prev');
  const btnSearchNext = document.getElementById('search-next');

  // Presentation Mode
  const btnPresentation = document.getElementById('btn-presentation');
  const btnClosePresentation = document.getElementById('btn-close-presentation');
  const btnSlidePrev = document.getElementById('slide-prev');
  const btnSlideNext = document.getElementById('slide-next');

  // Settings Panel
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  // Settings Controls
  const themeBtns = document.querySelectorAll('[data-theme]');
  const fontBtns = document.querySelectorAll('[data-font]');
  const layoutBtns = document.querySelectorAll('[data-layout]');
  const fontSizeRange = document.getElementById('setting-font-size');
  const lineHeightRange = document.getElementById('setting-line-height');
  const maxWidthRange = document.getElementById('setting-max-width');

  // Exports
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportPdf = document.getElementById('btn-export-pdf');

  // Raw text container
  let currentMarkdownText = '';
  let currentFile = null;

  // --- Initialize Sub-Modules ---
  if (window.TOC) window.TOC.init('toc-nav-container');
  if (window.Search) window.Search.init('render-target');
  if (window.Presentation) window.Presentation.init();

  // --- Accessible Drawer Helper ---
  /**
   * Creates an accessible drawer (slide-in panel) that:
   * - Sets aria-expanded on the trigger button
   * - Injects a semi-transparent backdrop into the DOM
   * - Moves focus to the first focusable element inside the panel on open
   * - Traps Tab focus within the panel while open
   * - Returns focus to the trigger button on close
   * - Closes on Escape or backdrop click
   *
   * @param {Object} opts
   * @param {HTMLElement} opts.panel     - The drawer/aside element
   * @param {HTMLElement} opts.trigger   - Button that opens the drawer
   * @param {HTMLElement} opts.closeBtn  - Button inside the drawer that closes it
   * @param {string}      opts.openClass - CSS class applied to the panel when open (default 'open')
   * @returns {{ open, close, isOpen }}
   */
  function createDrawer({ panel, trigger, closeBtn, openClass = 'open' }) {
    let backdrop = null;
    let previouslyFocused = null;

    const FOCUSABLE = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function getFocusable() {
      return Array.from(panel.querySelectorAll(FOCUSABLE))
        .filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');
    }

    function trapTab(e) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }

    function handleEsc(e) {
      if (e.key === 'Escape') close();
    }

    function open() {
      previouslyFocused = document.activeElement;
      panel.classList.add(openClass);

      // ARIA state
      if (trigger) trigger.setAttribute('aria-expanded', 'true');

      // Inject backdrop
      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', close);
      document.body.appendChild(backdrop);

      // Move focus inside
      const focusable = getFocusable();
      if (focusable.length > 0) {
        // Prefer a close button, otherwise first focusable element
        const closeEl = panel.querySelector('[id$="-close"], [id$="close-"], .btn-close, .btn-close-presentation');
        (closeEl || focusable[0]).focus();
      }

      // Trap focus and listen for Esc
      panel.addEventListener('keydown', trapTab);
      document.addEventListener('keydown', handleEsc);
    }

    function close() {
      panel.classList.remove(openClass);

      // ARIA state
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      // Remove backdrop
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }

      // Remove listeners
      panel.removeEventListener('keydown', trapTab);
      document.removeEventListener('keydown', handleEsc);

      // Return focus
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    }

    // Wire the dedicated close button inside the panel
    if (closeBtn) closeBtn.addEventListener('click', close);

    return {
      open,
      close,
      get isOpen() { return panel.classList.contains(openClass); },
      toggle() { this.isOpen ? this.close() : this.open(); }
    };
  }

  // Sync settings panel values with stored Settings values
  if (window.Settings) {
    const s = window.Settings.settings;
    
    // Theme
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === s.theme);
    });
    // Font
    fontBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.font === s.font);
    });
    // Layout
    if (layoutBtns) {
      layoutBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === s.layout);
      });
    }
    // Range Sliders
    if (fontSizeRange) fontSizeRange.value = s.fontSize;
    if (lineHeightRange) lineHeightRange.value = s.lineHeight;
    if (maxWidthRange) maxWidthRange.value = s.maxWidth;
  }

  // --- Drag and Drop File Handlers ---
  
  // Browse click triggers hidden input
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropCard.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag states styling
  ['dragenter', 'dragover'].forEach(eventName => {
    dropCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropCard.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropCard.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropCard.classList.remove('dragover');
    }, false);
  });

  dropCard.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  function calculateReadingTime(text) {
    const wordsPerMinute = 225;
    const words = text.trim().split(/\s+/).length;
    const time = Math.ceil(words / wordsPerMinute);
    return time;
  }

  /**
   * Reads, compiles and displays a markdown file
   */
  function handleFileSelected(file) {
    // Basic format validation
    const name = file.name.toLowerCase();
    if (!name.endsWith('.md') && !name.endsWith('.markdown') && !name.endsWith('.txt')) {
      showToast('Formato inválido: selecione um arquivo Markdown (.md, .markdown) ou texto simples (.txt).', 'error');
      return;
    }

    currentFile = file;

    // Load file content
    if (window.Markdown) {
      window.Markdown.readFile(file)
        .then(text => {
          currentMarkdownText = text;
          renderDocument(text);
          
          // Switch layouts
          landingZone.classList.add('hidden');
          readerLayout.classList.remove('hidden');
          
          // Update file information in header
          displayFileName.textContent = file.name;
          const readingTime = calculateReadingTime(text);
          displayFileSize.textContent = `${formatBytes(file.size)} • Est. ${readingTime} min de leitura`;
          
          const readingCanvas = document.getElementById('reading-canvas');
          if (readingCanvas) readingCanvas.scrollTop = 0;
          saveSession();
        })
        .catch(err => {
          console.error(err);
          showToast('Erro ao carregar o arquivo: ' + err.message, 'error');
        });
    }
  }

  /**
   * Compiles, sanitizes, and binds details to target elements
   */
  function renderDocument(text) {
    if (!window.Markdown) return;

    // 1. Compile & Sanitize
    const htmlContent = window.Markdown.parse(text);
    renderTarget.innerHTML = htmlContent;

    // Apply Settings constraints (fonts, width, sizing) to render target
    if (window.Settings) {
      window.Settings.applyAll();
    }

    // 2. Wrap code blocks, run highlight.js and mermaid.js
    window.Markdown.postProcess(renderTarget);

    // 3. Populate Table of Contents sidebar
    if (window.TOC) {
      window.TOC.generate(renderTarget);
    }

    // 4. Reset Search query
    if (window.Search) {
      window.Search.clear();
      searchInput.value = '';
    }

    // 5. Parse slides for presentation mode
    if (window.Presentation) {
      window.Presentation.parseMarkdown(text, currentFile ? currentFile.name : 'Presentation');
    }
  }

  /**
   * Reset / return to drop card landing zone
   */
  btnBackLanding.addEventListener('click', () => {
    currentMarkdownText = '';
    currentFile = null;
    fileInput.value = '';
    
    localStorage.removeItem('mdReader_session');
    
    readerLayout.classList.add('hidden');
    landingZone.classList.remove('hidden');
  });

  // --- Mobile TOC Binding ---
  // (handled by tocDrawer below)

  // --- Accessible Drawers ---

  const settingsDrawer = createDrawer({
    panel:     settingsPanel,
    trigger:   btnToggleSettings,
    closeBtn:  btnCloseSettings
  });

  const tocDrawer = createDrawer({
    panel:    tocSidebar,
    trigger:  btnToggleToc,
    closeBtn: btnCloseToc
  });

  btnToggleSettings.addEventListener('click', () => settingsDrawer.toggle());

  if (btnToggleToc && tocSidebar) {
    btnToggleToc.addEventListener('click', () => tocDrawer.toggle());

    // On mobile, close TOC automatically when a heading link is clicked
    tocSidebar.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'a' && window.innerWidth <= 768) {
        tocDrawer.close();
      }
    });
  }

  const btnResetSettings = document.getElementById('btn-reset-settings');
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', () => {
      if (window.Settings) {
        window.Settings.reset();
        
        // Sync UI back
        const s = window.Settings.settings;
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === s.theme));
        fontBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.font === s.font));
        if (layoutBtns) layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === s.layout));
        if (fontSizeRange) fontSizeRange.value = s.fontSize;
        if (lineHeightRange) lineHeightRange.value = s.lineHeight;
        if (maxWidthRange) maxWidthRange.value = s.maxWidth;
      }
    });
  }

  // Theme Switches
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (window.Settings) {
        window.Settings.set('theme', theme);
      }
      themeBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Font Switches
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const font = btn.dataset.font;
      if (window.Settings) {
        window.Settings.set('font', font);
      }
      fontBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Layout Switches
  if (layoutBtns) {
    layoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.dataset.layout;
        if (window.Settings) {
          window.Settings.set('layout', layout);
        }
        layoutBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  // Range Slider Adjustments
  if (fontSizeRange) {
    fontSizeRange.addEventListener('input', (e) => {
      if (window.Settings) window.Settings.set('fontSize', e.target.value);
    });
  }

  if (lineHeightRange) {
    lineHeightRange.addEventListener('input', (e) => {
      if (window.Settings) window.Settings.set('lineHeight', e.target.value);
    });
  }

  if (maxWidthRange) {
    maxWidthRange.addEventListener('input', (e) => {
      if (window.Settings) window.Settings.set('maxWidth', e.target.value);
    });
  }

  // --- Real-time Search Binding ---

  const debouncedSearch = debounce((val) => {
    if (!window.Search) return;
    if (val === '') {
      window.Search.clear();
    } else {
      window.Search.search(val);
    }
  }, 300);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Enter: scroll to current match without advancing.
  // Shift+Enter: go to previous match (with scroll).
  searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !window.Search) return;
    e.preventDefault();
    if (e.shiftKey) {
      window.Search.prev();
    } else if (window.Search.matches.length > 0) {
      window.Search.scrollToCurrent();
    }
  });

  btnSearchPrev.addEventListener('click', () => {
    if (window.Search) window.Search.prev();
  });

  btnSearchNext.addEventListener('click', () => {
    if (window.Search) window.Search.next();
  });

  // --- Exports Binding ---
  
  btnExportHtml.addEventListener('click', () => {
    if (window.Export) {
      window.Export.exportToHTML(renderTarget, currentFile ? currentFile.name : 'document.html');
    }
  });

  btnExportPdf.addEventListener('click', () => {
    if (window.Export) window.Export.exportToPDF();
  });

  // --- Presentation Bindings ---
  
  btnPresentation.addEventListener('click', () => {
    if (window.Presentation) window.Presentation.start();
  });

  btnClosePresentation.addEventListener('click', () => {
    if (window.Presentation) window.Presentation.stop();
  });

  btnSlidePrev.addEventListener('click', () => {
    if (window.Presentation) window.Presentation.prev();
  });

  btnSlideNext.addEventListener('click', () => {
    if (window.Presentation) window.Presentation.next();
  });

  // --- Keyboard Shortcuts & Utilities ---
  
  window.addEventListener('keydown', (e) => {
    // Focus search bar shortcut: / or Ctrl+F / Cmd+F (let's use / as standard keyboard key)
    if (e.key === '/' && document.activeElement !== searchInput && !window.Presentation?.isActive) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    
    // Zen Mode Shortcut: Z
    const isEditable = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable;
    if ((e.key === 'z' || e.key === 'Z') && !isEditable && !window.Presentation?.isActive) {
      e.preventDefault();
      const isZen = readerLayout.classList.toggle('zen-mode-active');
      if (isZen) {
        if (tocDrawer.isOpen) tocDrawer.close();
        showToast('Modo Zen Ativado (Pressione Z para sair)', 'info', 2000);
      }
    }

    // Toggle theme shortcut: 't' (when not inside inputs)
    if (e.key === 't' && document.activeElement.tagName !== 'INPUT' && !window.Presentation?.isActive) {
      if (window.Settings) {
        const nextTheme = window.Settings.settings.theme === 'light' ? 'dark' : 'light';
        window.Settings.set('theme', nextTheme);
        themeBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.theme === nextTheme);
        });
      }
    }

    // Escape closes whichever drawer is open (focus is returned by each drawer's own handler)
    if (e.key === 'Escape') {
      if (settingsDrawer.isOpen) settingsDrawer.close();
      if (tocDrawer.isOpen)      tocDrawer.close();
    }
  });

  // --- Session Persistence ---
  
  const readingCanvas = document.getElementById('reading-canvas');
  let scrollTimeout;
  
  let lastScrollTop = 0;

  const readingProgress = document.getElementById('reading-progress');

  if (readingCanvas) {
    readingCanvas.addEventListener('scroll', () => {
      const currentScrollTop = readingCanvas.scrollTop;

      // Reading Progress logic
      if (readingProgress) {
        const scrollHeight = readingCanvas.scrollHeight - readingCanvas.clientHeight;
        const progress = scrollHeight > 0 ? (currentScrollTop / scrollHeight) * 100 : 0;
        readingProgress.style.width = `${progress}%`;
      }

      // Scroll Fade logic
      const scrollDelta = currentScrollTop - lastScrollTop;
      if (scrollDelta > 0 && currentScrollTop > 30) {
        // Scrolling down
        if (scrollDelta > 30 || document.body.classList.contains('scroll-fade-active')) {
           document.body.classList.add('scroll-fade-active');
        }
      } else if (scrollDelta < 0) {
        // Scrolling up
        if (Math.abs(scrollDelta) > 30 || !document.body.classList.contains('scroll-fade-active')) {
          document.body.classList.remove('scroll-fade-active');
        }
      }

      // Update lastScrollTop if scroll amount was large enough to change state, or just tracking continuously
      if (Math.abs(scrollDelta) > 30) {
        lastScrollTop = currentScrollTop;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveSession, 500);
    });
  }

  function saveSession() {
    if (!currentFile || !currentMarkdownText) return;
    
    // Only save if file is under 2MB to prevent quota exhaustion
    if (currentMarkdownText.length < 2 * 1024 * 1024) {
      const sessionData = {
        name: currentFile.name,
        text: currentMarkdownText,
        scroll: readingCanvas ? readingCanvas.scrollTop : 0
      };
      localStorage.setItem('mdReader_session', JSON.stringify(sessionData));
    }
  }

  function restoreSession() {
    try {
      const saved = localStorage.getItem('mdReader_session');
      if (saved) {
        const sessionData = JSON.parse(saved);
        if (sessionData && sessionData.text) {
          currentFile = { name: sessionData.name, size: 0 };
          currentMarkdownText = sessionData.text;
          
          renderDocument(currentMarkdownText);
          
          landingZone.classList.add('hidden');
          readerLayout.classList.remove('hidden');
          
          displayFileName.textContent = currentFile.name;
          displayFileSize.textContent = 'Sessão restaurada';
          
          setTimeout(() => {
            if (sessionData.scroll && readingCanvas) {
              readingCanvas.scrollTop = sessionData.scroll;
            }
          }, 150);
        }
      }
    } catch (e) {
      console.warn('Could not restore session', e);
    }
  }

  // Attempt to restore session on load
  restoreSession();

  /**
   * Human readable file sizes
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});
