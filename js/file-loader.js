/**
 * mdReader - file-loader.js
 * Manages loading, reading, compiling, rendering and local storage persistence of Markdown documents.
 */

(function () {
  window.App = window.App || {};

  // Global app state definition
  window.App.state = {
    currentMarkdownText: '',
    currentFile: null
  };

  /**
   * Estimates reading time based on standard words per minute.
   */
  function calculateReadingTime(text) {
    const wordsPerMinute = 225;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Helper to format file size in bytes into human readable format.
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Saves current file progress and scroll state to localStorage.
   */
  function saveSession() {
    const state = window.App.state;
    const readingCanvas = document.getElementById('reading-canvas');
    if (!state.currentFile || !state.currentMarkdownText) return;

    // Only save if file is under 2MB to prevent localStorage quota exhaustion
    if (state.currentMarkdownText.length < 2 * 1024 * 1024) {
      const sessionData = {
        name: state.currentFile.name,
        text: state.currentMarkdownText,
        scroll: readingCanvas ? readingCanvas.scrollTop : 0
      };
      localStorage.setItem('mdReader_session', JSON.stringify(sessionData));
    }
  }

  /**
   * Compiles Markdown text, updates render target, structures TOC, resets search and sets slides.
   */
  function renderDocument(text) {
    if (!window.Markdown) return;
    const renderTarget = document.getElementById('render-target');
    const searchInput = document.getElementById('search-input');
    if (!renderTarget) return;

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
      if (searchInput) searchInput.value = '';
    }

    // 5. Parse slides for presentation mode
    if (window.Presentation) {
      const state = window.App.state;
      window.Presentation.parseMarkdown(text, state.currentFile ? state.currentFile.name : 'Presentation');
    }
  }

  /**
   * Handles markdown file loading, triggers parser, updates headers and visibility.
   */
  function handleFileSelected(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.md') && !name.endsWith('.markdown') && !name.endsWith('.txt')) {
      if (window.showToast) {
        const msg = window.Settings ? window.Settings.t('invalidFormat') : 'Formato inválido: selecione um arquivo Markdown (.md, .markdown) ou texto simples (.txt).';
        window.showToast(msg, 'error');
      }
      return;
    }

    const state = window.App.state;
    state.currentFile = file;

    if (window.Markdown) {
      window.Markdown.readFile(file)
        .then(text => {
          state.currentMarkdownText = text;
          renderDocument(text);

          // Switch layouts
          const landingZone = document.getElementById('landing-zone');
          const readerLayout = document.getElementById('reader-layout');
          const displayFileName = document.getElementById('display-file-name');
          const displayFileSize = document.getElementById('display-file-size');

          if (landingZone) landingZone.classList.add('hidden');
          if (readerLayout) readerLayout.classList.remove('hidden');

          if (displayFileName) displayFileName.textContent = file.name;
          const readingTime = calculateReadingTime(text);
          if (displayFileSize) {
            const estPattern = window.Settings ? window.Settings.t('estReadingTime') : 'Est. {time} min de leitura';
            const estString = estPattern.replace('{time}', readingTime);
            displayFileSize.textContent = `${formatBytes(file.size)} • ${estString}`;
          }

          const readingCanvas = document.getElementById('reading-canvas');
          if (readingCanvas) readingCanvas.scrollTop = 0;
          saveSession();
        })
        .catch(err => {
          console.error(err);
          if (window.showToast) {
            const errorMsg = window.Settings ? window.Settings.t('errorLoadingFile') : 'Erro ao carregar o arquivo: ';
            window.showToast(errorMsg + err.message, 'error');
          }
        });
    }
  }

  /**
   * Attempts to restore any previous markdown reading session.
   */
  function restoreSession() {
    try {
      const saved = localStorage.getItem('mdReader_session');
      if (saved) {
        const sessionData = JSON.parse(saved);
        if (sessionData && sessionData.text) {
          const state = window.App.state;
          state.currentFile = { name: sessionData.name, size: 0 };
          state.currentMarkdownText = sessionData.text;

          renderDocument(state.currentMarkdownText);

          const landingZone = document.getElementById('landing-zone');
          const readerLayout = document.getElementById('reader-layout');
          const displayFileName = document.getElementById('display-file-name');
          const displayFileSize = document.getElementById('display-file-size');
          const readingCanvas = document.getElementById('reading-canvas');

          if (landingZone) landingZone.classList.add('hidden');
          if (readerLayout) readerLayout.classList.remove('hidden');

          if (displayFileName) displayFileName.textContent = state.currentFile.name;
          if (displayFileSize) {
            const sessionMsg = window.Settings ? window.Settings.t('sessionRestored') : 'Sessão restaurada';
            displayFileSize.textContent = sessionMsg;
          }

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

  // Bind to App namespace
  window.App.renderDocument = renderDocument;
  window.App.handleFileSelected = handleFileSelected;
  window.App.saveSession = saveSession;
  window.App.restoreSession = restoreSession;
})();
