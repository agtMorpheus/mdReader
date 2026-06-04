/**
 * mdReader - app.js
 * Main entry orchestrator. Hooks DOM elements, manages file uploading/dropping,
 * wires layout preferences, sets up search queries, shortcuts, and navigation flow.
 */

document.addEventListener('DOMContentLoaded', () => {
  const App = window.App;
  if (!App) {
    console.error('App utility/loader modules not loaded!');
    return;
  }

  // --- DOM References ---
  const landingZone = document.getElementById('landing-zone'),
        dropCard = document.getElementById('drop-card'),
        fileInput = document.getElementById('file-input'),
        browseBtn = document.getElementById('browse-btn');

  const readerLayout = document.getElementById('reader-layout'),
        btnBackLanding = document.getElementById('btn-back-landing'),
        btnToggleToc = document.getElementById('btn-toggle-toc'),
        btnCloseToc = document.getElementById('btn-close-toc'),
        tocSidebar = document.getElementById('toc-sidebar'),
        displayFileName = document.getElementById('display-file-name'),
        displayFileSize = document.getElementById('display-file-size'),
        renderTarget = document.getElementById('render-target');
  
  const searchInput = document.getElementById('search-input'),
        btnSearchPrev = document.getElementById('search-prev'),
        btnSearchNext = document.getElementById('search-next');

  const btnPresentation = document.getElementById('btn-presentation'),
        btnClosePresentation = document.getElementById('btn-close-presentation'),
        btnSlidePrev = document.getElementById('slide-prev'),
        btnSlideNext = document.getElementById('slide-next');

  const btnToggleSettings = document.getElementById('btn-toggle-settings'),
        settingsPanel = document.getElementById('settings-panel'),
        btnCloseSettings = document.getElementById('btn-close-settings');

  const themeBtns = document.querySelectorAll('[data-theme]'),
        fontBtns = document.querySelectorAll('[data-font]'),
        layoutBtns = document.querySelectorAll('[data-layout]'),
        alignmentBtns = document.querySelectorAll('[data-align]'),
        langBtns = document.querySelectorAll('[data-lang]'),
        fontSizeRange = document.getElementById('setting-font-size'),
        lineHeightRange = document.getElementById('setting-line-height'),
        maxWidthRange = document.getElementById('setting-max-width');

  const btnExportHtml = document.getElementById('btn-export-html'),
        btnExportPdf = document.getElementById('btn-export-pdf');

  // --- Initialize Sub-Modules ---
  if (window.TOC) window.TOC.init('toc-nav-container');
  if (window.Search) window.Search.init('render-target');
  if (window.Presentation) window.Presentation.init();

  // --- Accessible Drawers ---
  const settingsDrawer = App.createDrawer({ panel: settingsPanel, trigger: btnToggleSettings, closeBtn: btnCloseSettings }),
        tocDrawer = App.createDrawer({ panel: tocSidebar, trigger: btnToggleToc, closeBtn: btnCloseToc });

  App.settingsDrawer = settingsDrawer;
  App.tocDrawer = tocDrawer;

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

  // Sync settings panel values with stored Settings values
  if (window.Settings) {
    const s = window.Settings.settings;
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === s.theme));
    fontBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.font === s.font));
    if (layoutBtns) layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === s.layout));
    if (alignmentBtns) alignmentBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.align === s.textAlign));
    if (langBtns) langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === s.lang));
    if (fontSizeRange) fontSizeRange.value = s.fontSize;
    if (lineHeightRange) lineHeightRange.value = s.lineHeight;
    if (maxWidthRange) maxWidthRange.value = s.maxWidth;
  }

  // --- Drag and Drop File Handlers ---
  browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropCard.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) App.handleFileSelected(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropCard.addEventListener(eventName, (e) => {
      e.preventDefault(); e.stopPropagation(); dropCard.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropCard.addEventListener(eventName, (e) => {
      e.preventDefault(); e.stopPropagation(); dropCard.classList.remove('dragover');
    }, false);
  });

  dropCard.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) App.handleFileSelected(files[0]);
  });

  /**
   * Reset / return to drop card landing zone
   */
  btnBackLanding.addEventListener('click', () => {
    App.state.currentMarkdownText = '';
    App.state.currentFile = null;
    fileInput.value = '';
    localStorage.removeItem('mdReader_session');
    readerLayout.classList.add('hidden');
    landingZone.classList.remove('hidden');
  });

  const btnResetSettings = document.getElementById('btn-reset-settings');
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', () => {
      if (window.Settings) {
        window.Settings.reset();
        const s = window.Settings.settings;
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === s.theme));
        fontBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.font === s.font));
        if (layoutBtns) layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === s.layout));
        if (alignmentBtns) alignmentBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.align === s.textAlign));
        if (langBtns) langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === s.lang));
        if (fontSizeRange) fontSizeRange.value = s.fontSize;
        if (lineHeightRange) lineHeightRange.value = s.lineHeight;
        if (maxWidthRange) maxWidthRange.value = s.maxWidth;
      }
    });
  }

  // Theme, Font and Layout Switches
  themeBtns.forEach(btn => btn.addEventListener('click', () => {
    if (window.Settings) window.Settings.set('theme', btn.dataset.theme);
    themeBtns.forEach(b => b.classList.toggle('active', b === btn));
  }));

  fontBtns.forEach(btn => btn.addEventListener('click', () => {
    if (window.Settings) window.Settings.set('font', btn.dataset.font);
    fontBtns.forEach(b => b.classList.toggle('active', b === btn));
  }));

  if (layoutBtns) {
    layoutBtns.forEach(btn => btn.addEventListener('click', () => {
      if (window.Settings) window.Settings.set('layout', btn.dataset.layout);
      layoutBtns.forEach(b => b.classList.toggle('active', b === btn));
    }));
  }

  if (alignmentBtns) {
    alignmentBtns.forEach(btn => btn.addEventListener('click', () => {
      if (window.Settings) window.Settings.set('textAlign', btn.dataset.align);
      alignmentBtns.forEach(b => b.classList.toggle('active', b === btn));
    }));
  }

  if (langBtns) {
    langBtns.forEach(btn => btn.addEventListener('click', () => {
      if (window.Settings) window.Settings.set('lang', btn.dataset.lang);
      langBtns.forEach(b => b.classList.toggle('active', b === btn));
    }));
  }

  // Range Slider Adjustments
  if (fontSizeRange) fontSizeRange.addEventListener('input', e => window.Settings && window.Settings.set('fontSize', e.target.value));
  if (lineHeightRange) lineHeightRange.addEventListener('input', e => window.Settings && window.Settings.set('lineHeight', e.target.value));
  if (maxWidthRange) maxWidthRange.addEventListener('input', e => window.Settings && window.Settings.set('maxWidth', e.target.value));

  // --- Real-time Search Binding ---
  const debouncedSearch = App.debounce((val) => {
    if (!window.Search) return;
    if (val === '') window.Search.clear();
    else window.Search.search(val);
  }, 300);

  searchInput.addEventListener('input', e => debouncedSearch(e.target.value));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !window.Search) return;
    e.preventDefault();
    if (e.shiftKey) window.Search.prev();
    else if (window.Search.matches.length > 0) window.Search.scrollToCurrent();
  });

  btnSearchPrev.addEventListener('click', () => window.Search && window.Search.prev());
  btnSearchNext.addEventListener('click', () => window.Search && window.Search.next());

  // --- Exports Binding ---
  btnExportHtml.addEventListener('click', () => {
    if (window.Export) window.Export.exportToHTML(renderTarget, App.state.currentFile ? App.state.currentFile.name : 'document.html');
  });
  btnExportPdf.addEventListener('click', () => window.Export && window.Export.exportToPDF());

  // --- Presentation Bindings ---
  btnPresentation.addEventListener('click', () => window.Presentation && window.Presentation.start());
  btnClosePresentation.addEventListener('click', () => window.Presentation && window.Presentation.stop());
  btnSlidePrev.addEventListener('click', () => window.Presentation && window.Presentation.prev());
  btnSlideNext.addEventListener('click', () => window.Presentation && window.Presentation.next());

  // --- Keyboard Shortcuts & Utilities ---
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !window.Presentation?.isActive) {
      e.preventDefault(); searchInput.focus(); searchInput.select();
    }
    
    const isEditable = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable;
    if ((e.key === 'z' || e.key === 'Z') && !isEditable && !window.Presentation?.isActive) {
      e.preventDefault();
      const isZen = readerLayout.classList.toggle('zen-mode-active');
      if (isZen) {
        if (tocDrawer.isOpen) tocDrawer.close();
        if (window.showToast) {
          const msg = window.Settings ? window.Settings.t('zenModeActive') : 'Modo Zen Ativado (Pressione Z para sair)';
          window.showToast(msg, 'info', 2000);
        }
      }
    }

    if (e.key === 't' && document.activeElement.tagName !== 'INPUT' && !window.Presentation?.isActive) {
      if (window.Settings) {
        const nextTheme = window.Settings.settings.theme === 'light' ? 'dark' : 'light';
        window.Settings.set('theme', nextTheme);
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === nextTheme));
      }
    }

    if (e.key === 'Escape') {
      if (settingsDrawer.isOpen) settingsDrawer.close();
      if (tocDrawer.isOpen)      tocDrawer.close();
    }
  });

  // --- Session Persistence ---
  const readingCanvas = document.getElementById('reading-canvas'),
        readingProgress = document.getElementById('reading-progress');
  let scrollTimeout, lastScrollTop = 0;

  if (readingCanvas) {
    readingCanvas.addEventListener('scroll', () => {
      const currentScrollTop = readingCanvas.scrollTop;

      if (readingProgress) {
        const scrollHeight = readingCanvas.scrollHeight - readingCanvas.clientHeight;
        const progress = scrollHeight > 0 ? (currentScrollTop / scrollHeight) * 100 : 0;
        readingProgress.style.width = `${progress}%`;
      }

      const scrollDelta = currentScrollTop - lastScrollTop;
      if (scrollDelta > 0 && currentScrollTop > 30) {
        if (scrollDelta > 30 || document.body.classList.contains('scroll-fade-active')) {
           document.body.classList.add('scroll-fade-active');
        }
      } else if (scrollDelta < 0) {
        if (Math.abs(scrollDelta) > 30 || !document.body.classList.contains('scroll-fade-active')) {
          document.body.classList.remove('scroll-fade-active');
        }
      }

      if (Math.abs(scrollDelta) > 30) lastScrollTop = currentScrollTop;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(App.saveSession, 500);
    });
  }

  // Attempt to restore session on load
  App.restoreSession();
});
