/**
 * mdReader - settings.js
 * Manages UI settings (theme, font, size, line spacing, layout width)
 * and persists configuration preferences in localStorage.
 */

(function () {
  const STORAGE_KEY = 'mdreader_settings';

  const defaultSettings = {
    theme: 'light',
    font: 'swiss',
    layout: 'single',
    fontSize: 18,
    lineHeight: 1.6,
    maxWidth: 65,
    textAlign: 'left',
    lang: navigator.language.startsWith('pt') ? 'pt' : 'en'
  };


  class SettingsManager {
    constructor() {
      this.settings = { ...defaultSettings };
      this.listeners = [];
      this.init();
    }

    /**
     * Load settings from localStorage or fallback to defaults
     */
    init() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.settings = { ...defaultSettings, ...JSON.parse(saved) };
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          this.settings.theme = prefersDark ? 'dark' : 'light';
        }
      } catch (e) {
        console.warn('Unable to read from localStorage:', e);
      }
      this.applyAll();
    }

    /**
     * Save current settings state to localStorage
     */
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('Unable to save to localStorage:', e);
      }
      this.notifyListeners();
    }

    /**
     * Add change listener
     */
    onChange(callback) {
      this.listeners.push(callback);
    }

    notifyListeners() {
      this.listeners.forEach(cb => cb(this.settings));
    }

    /**
     * Restore all defaults
     */
    reset() {
      this.settings = { ...defaultSettings };
      this.save();
      this.applyAll();
    }

    /**
     * Apply all settings to the DOM
     */
    applyAll() {
      this.applyTheme(this.settings.theme);
      this.applyFont(this.settings.font);
      this.applyLayout(this.settings.layout);
      this.applyFontSize(this.settings.fontSize);
      this.applyLineHeight(this.settings.lineHeight);
      this.applyMaxWidth(this.settings.maxWidth);
      this.applyAlignment(this.settings.textAlign);
      this.applyLanguage(this.settings.lang);
    }

    /**
     * Layout Toggle (Single / Columns)
     */
    applyLayout(layout) {
      this.settings.layout = layout;
      const target = document.getElementById('render-target');
      if (target) {
        target.classList.toggle('layout-two-columns', layout === 'columns');
        this.applyMaxWidth(this.settings.maxWidth);
      }
    }

    /**
     * Theme Toggle (Light / Dark)
     */
    applyTheme(theme) {
      this.settings.theme = theme;
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.body.classList.add(`theme-${theme}`);
      
      // Update hljs theme stylesheets if present
      const lightCodeTheme = document.getElementById('hljs-theme-light');
      const darkCodeTheme = document.getElementById('hljs-theme-dark');
      if (lightCodeTheme && darkCodeTheme) {
        if (theme === 'dark') {
          lightCodeTheme.disabled = true;
          darkCodeTheme.disabled = false;
        } else {
          lightCodeTheme.disabled = false;
          darkCodeTheme.disabled = true;
        }
      }
    }

    /**
     * Font Toggle (Sans / Serif / Swiss)
     */
    applyFont(font) {
      this.settings.font = font;
      const target = document.getElementById('render-target');
      if (target) {
        target.classList.remove('font-sans', 'font-serif', 'font-swiss', 'font-dyslexic');
        target.classList.add(`font-${font}`);
      }
    }

    /**
     * Font Size adjustment (in pixels)
     */
    applyFontSize(size) {
      this.settings.fontSize = parseInt(size, 10);
      const target = document.getElementById('render-target');
      if (target) {
        target.style.fontSize = `${this.settings.fontSize}px`;
      }
      const valLabel = document.getElementById('val-font-size');
      if (valLabel) {
        valLabel.textContent = `${this.settings.fontSize}px`;
      }
    }

    /**
     * Line Height adjustment
     */
    applyLineHeight(lh) {
      this.settings.lineHeight = parseFloat(lh);
      const target = document.getElementById('render-target');
      if (target) {
        target.style.lineHeight = this.settings.lineHeight;
      }
      const valLabel = document.getElementById('val-line-height');
      if (valLabel) {
        valLabel.textContent = this.settings.lineHeight;
      }
    }

    /**
     * Maximum Content Width adjustment
     */
    applyMaxWidth(width) {
      this.settings.maxWidth = parseInt(width, 10);
      const target = document.getElementById('render-target');
      if (target) {
        if (this.settings.layout === 'columns') {
          target.style.maxWidth = `calc(${this.settings.maxWidth * 2}ch + 6rem)`;
        } else {
          target.style.maxWidth = `${this.settings.maxWidth}ch`;
        }
      }
      const valLabel = document.getElementById('val-max-width');
      if (valLabel) {
        valLabel.textContent = `${this.settings.maxWidth}ch`;
      }
    }

    /**
     * Text Alignment adjustment (left or justify)
     */
    applyAlignment(align) {
      this.settings.textAlign = align;
      const target = document.getElementById('render-target');
      if (target) {
        target.classList.toggle('align-justify', align === 'justify');
      }
    }

    /**
     * Language selection (pt or en) and DOM translations
     */
    applyLanguage(lang) {
      this.settings.lang = lang;
      const dict = (window.Translations && (window.Translations[lang] || window.Translations['en'])) || {};
      
      // Translate elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (dict[key]) el.textContent = dict[key];
      });

      // Translate attributes with data-i18n-placeholder
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (dict[key]) el.placeholder = dict[key];
      });

      // Translate attributes with data-i18n-title
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        if (dict[key]) el.title = dict[key];
      });

      // Translate attributes with data-i18n-aria-label
      document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.dataset.i18nAriaLabel;
        if (dict[key]) el.setAttribute('aria-label', dict[key]);
      });
      
      document.title = lang === 'pt' ? 'mdReader - Visualizador de Markdown livre de distrações' : 'mdReader - Distraction-Free Markdown Viewer';
    }

    t(key) {
      const lang = this.settings.lang || 'en';
      const trans = window.Translations || {};
      return (trans[lang] && trans[lang][key]) || (trans['en'] && trans['en'][key]) || key;
    }

    set(key, value) {
      if (key in this.settings) {
        this.settings[key] = value;
        switch (key) {
          case 'theme': this.applyTheme(value); break;
          case 'font': this.applyFont(value); break;
          case 'layout': this.applyLayout(value); break;
          case 'fontSize': this.applyFontSize(value); break;
          case 'lineHeight': this.applyLineHeight(value); break;
          case 'maxWidth': this.applyMaxWidth(value); break;
          case 'textAlign': this.applyAlignment(value); break;
          case 'lang': this.applyLanguage(value); break;
        }
        this.save();
      }
    }
  }

  // Export to global namespace
  window.Settings = new SettingsManager();
})();
