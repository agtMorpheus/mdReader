/**
 * mdReader - app.js
 * Main entry orchestrator. Hooks DOM elements, manages file uploading/dropping,
 * wires layout preferences, sets up search queries, shortcuts, and navigation flow.
 */

document.addEventListener('DOMContentLoaded', () => {
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

  /**
   * Reads, compiles and displays a markdown file
   */
  function handleFileSelected(file) {
    // Basic format validation
    const name = file.name.toLowerCase();
    if (!name.endsWith('.md') && !name.endsWith('.markdown') && !name.endsWith('.txt')) {
      alert('Format error: Please select a valid markdown file (.md, .markdown) or plain text (.txt).');
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
          displayFileSize.textContent = formatBytes(file.size);
          
          const readingCanvas = document.getElementById('reading-canvas');
          if (readingCanvas) readingCanvas.scrollTop = 0;
          saveSession();
        })
        .catch(err => {
          console.error(err);
          alert('Error loading file content: ' + err.message);
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
  if (btnToggleToc && tocSidebar) {
    btnToggleToc.addEventListener('click', () => {
      tocSidebar.classList.toggle('open');
    });
  }

  if (btnCloseToc && tocSidebar) {
    btnCloseToc.addEventListener('click', () => {
      tocSidebar.classList.remove('open');
    });
  }

  if (tocSidebar) {
    tocSidebar.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'a' && window.innerWidth <= 768) {
        tocSidebar.classList.remove('open');
      }
    });
  }

  // --- Appearance Settings Binding ---
  
  btnToggleSettings.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

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
  
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (window.Search) {
      if (val === '') {
        window.Search.clear();
      } else {
        window.Search.search(val);
      }
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

    // Escape exits settings drawer
    if (e.key === 'Escape' && settingsPanel.classList.contains('open')) {
      settingsPanel.classList.remove('open');
    }
  });

  // --- Session Persistence ---
  
  const readingCanvas = document.getElementById('reading-canvas');
  let scrollTimeout;
  
  if (readingCanvas) {
    readingCanvas.addEventListener('scroll', () => {
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
          displayFileSize.textContent = 'Session Restored';
          
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
