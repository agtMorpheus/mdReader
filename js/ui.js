/**
 * mdReader - ui.js
 * Utility functions for UI transitions, notifications, and drawer controls.
 */

(function () {
  window.App = window.App || {};

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
   * Display a brief notification toast.
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
      <button class="toast-close" aria-label="Fechar notificação">\u00d7</button>
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
  // Expose globally
  window.showToast = showToast;

  /**
   * Creates an accessible drawer (slide-in panel)
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

      if (trigger) trigger.setAttribute('aria-expanded', 'true');

      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', close);
      document.body.appendChild(backdrop);

      const focusable = getFocusable();
      if (focusable.length > 0) {
        const closeEl = panel.querySelector('[id$="-close"], [id$="close-"], .btn-close, .btn-close-presentation');
        (closeEl || focusable[0]).focus();
      }

      panel.addEventListener('keydown', trapTab);
      document.addEventListener('keydown', handleEsc);
    }

    function close() {
      panel.classList.remove(openClass);

      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }

      panel.removeEventListener('keydown', trapTab);
      document.removeEventListener('keydown', handleEsc);

      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    }

    if (closeBtn) closeBtn.addEventListener('click', close);

    return {
      open,
      close,
      get isOpen() { return panel.classList.contains(openClass); },
      toggle() { this.isOpen ? this.close() : this.open(); }
    };
  }

  // Bind to App namespace
  window.App.debounce = debounce;
  window.App.createDrawer = createDrawer;
})();
