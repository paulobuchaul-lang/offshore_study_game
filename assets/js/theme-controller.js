/*
  Offshore Estudy Game — Theme Controller
  Origem: correção de bug encontrada em stitch_subsea_quest_8_bit_edition/three.js_2
  (o switch de tema tocava o som mas não mudava as cores, por aplicar a classe em
  apenas um elemento e ter cores hardcoded sobrepondo as variáveis do tema).
  Correção: aplicar classe E atributo data-theme em <html> E <body> ao mesmo tempo.
*/

class ThemeController {
  constructor({ audioEngine = null, onChange = null } = {}) {
    this.audioEngine = audioEngine;
    this.onChange = onChange;
    this.storageKey = 'subsea_theme';
    this.currentTheme = this._readStoredTheme() || 'dark';
    this.applyTheme(this.currentTheme, { silent: true, skipPersist: true });
  }

  _readStoredTheme() {
    try {
      const value = window.localStorage.getItem(this.storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (err) {
      return null;
    }
  }

  applyTheme(theme, { silent = false, skipPersist = false } = {}) {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';

    const root = document.documentElement;
    const body = document.body;

    [root, body].forEach((el) => {
      if (!el) return;
      el.setAttribute('data-theme', this.currentTheme);
      el.classList.toggle('light-mode', this.currentTheme === 'light');
    });

    if (!skipPersist) {
      try {
        window.localStorage.setItem(this.storageKey, this.currentTheme);
      } catch (err) {
        /* localStorage indisponível: tema segue funcionando apenas nesta sessão */
      }
    }

    if (!silent && this.audioEngine && typeof this.audioEngine.playThemeSwitch === 'function') {
      this.audioEngine.playThemeSwitch(this.currentTheme === 'light');
    }

    if (typeof this.onChange === 'function') {
      this.onChange(this.currentTheme);
    }
  }

  toggle() {
    this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  getTheme() {
    return this.currentTheme;
  }
}

window.SubseaThemeController = ThemeController;
