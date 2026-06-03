/**
 * mdReader - settings.js
 * Manages UI settings (theme, font, size, line spacing, layout width)
 * and persists configuration preferences in localStorage.
 */

(function () {
  const STORAGE_KEY = 'mdreader_settings';

  const defaultSettings = {
    theme: 'light',
    font: 'serif',
    layout: 'single',
    fontSize: 18,
    lineHeight: 1.6,
    maxWidth: 800
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
    }

    /**
     * Layout Toggle (Single / Columns)
     */
    applyLayout(layout) {
      this.settings.layout = layout;
      const target = document.getElementById('render-target');
      if (target) {
        target.classList.toggle('layout-two-columns', layout === 'columns');
      }
    }

    /**
     * Theme Toggle (Light / Dark)
     */
    applyTheme(theme) {
      this.settings.theme = theme;
      document.body.classList.remove('theme-light', 'theme-dark');
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
     * Font Toggle (Sans / Serif)
     */
    applyFont(font) {
      this.settings.font = font;
      const target = document.getElementById('render-target');
      if (target) {
        target.classList.remove('font-sans', 'font-serif');
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
        target.style.maxWidth = `${this.settings.maxWidth}px`;
      }
      const valLabel = document.getElementById('val-max-width');
      if (valLabel) {
        valLabel.textContent = `${this.settings.maxWidth}px`;
      }
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
        }
        this.save();
      }
    }
  }

  // Export to global namespace
  window.Settings = new SettingsManager();
})();
