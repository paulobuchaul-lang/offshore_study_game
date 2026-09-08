/*
  Offshore Estudy Game — Cockpit Mestre (injeção de HUD)
  Uma única função inicializa tema, áudio, estado e navegação em qualquer página.
  Uso: no final do <body>, depois de carregar theme-controller.js, audio-engine.js,
  state-store.js e navigation.js:

    <script src="assets/js/theme-controller.js"></script>
    <script src="assets/js/audio-engine.js"></script>
    <script src="assets/js/state-store.js"></script>
    <script src="assets/js/navigation.js"></script>
    <script src="assets/js/cockpit-element.js"></script>
    <script>
      SubseaCockpit.init({ activeNav: 'inicio' });
    </script>
*/

const GAME_TITLE = 'OFFSHORE ESTUDY GAME';
const SUBSEA_TOKEN_STORAGE_KEY = 'subsea_github_token';

function readStoredToken() {
  try {
    return window.localStorage.getItem(SUBSEA_TOKEN_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

function buildCockpitMarkup() {
  return `
    <div class="cockpit-master__row">
      <span class="cockpit-master__brand">${GAME_TITLE}</span>
      <div class="cockpit-master__controls">
        <button type="button" class="cockpit-master__btn" id="subsea-sync-indicator" title="Estado de sincronização">
          <span class="cockpit-master__led cockpit-master__led--off" id="subsea-sync-led"></span>
          <span id="subsea-sync-label">LOCAL</span>
        </button>
        <button type="button" class="cockpit-master__btn" id="subsea-sfx-btn">
          <span id="subsea-sfx-label">SFX: ON</span>
        </button>
        <button type="button" class="cockpit-master__btn" id="subsea-bgm-btn">
          <span id="subsea-bgm-label">TRILHA: INICIAR</span>
        </button>
        <button type="button" class="cockpit-master__btn" id="subsea-theme-btn">
          <span id="subsea-theme-label">☀️ / 🌙</span>
        </button>
      </div>
    </div>
  `;
}

const SubseaCockpit = {
  audio: null,
  theme: null,
  store: null,

  init({ activeNav = '', basePath = '' } = {}) {
    this.store = new window.SubseaStateStore();
    this.audio = new window.SubseaAudioEngine();

    const initialState = this.store.getState();
    this.audio.setSfxEnabled(initialState.audio.sfxEnabled);
    this.audio.setVolume(initialState.audio.volume);

    this.theme = new window.SubseaThemeController({
      audioEngine: this.audio,
      onChange: (tema) => this.store.setTema(tema),
    });
    // Garante consistência entre o tema já salvo no SubseaState e o aplicado no DOM.
    if (initialState.tema !== this.theme.getTheme()) {
      this.theme.applyTheme(initialState.tema, { silent: true });
    }

    this._mount();
    this._wireControls();
    this._refreshSyncIndicator();

    if (window.SubseaNavigation && typeof window.SubseaNavigation.render === 'function') {
      window.SubseaNavigation.render({ activeNav, audio: this.audio, basePath });
    }

    this.store.onChange(() => this._refreshSyncIndicator());

    this._autoAttachSync();

    return this;
  },

  /** Se já existe um token salvo (configurado antes em qualquer dispositivo), conecta a sincronização automaticamente. */
  _autoAttachSync() {
    const token = readStoredToken();
    if (!token || !window.SubseaGithubSyncClient) return;
    const client = new window.SubseaGithubSyncClient({
      token,
      usuarioId: this.store.getState().usuario.id,
    });
    this.store.attachSyncClient(client);
    this.store.initialSync();
  },

  _mount() {
    let mount = document.getElementById('cockpit-master-mount');
    if (!mount) {
      mount = document.createElement('header');
      mount.id = 'cockpit-master-mount';
      document.body.insertBefore(mount, document.body.firstChild);
    }
    mount.className = 'cockpit-master';
    mount.innerHTML = buildCockpitMarkup();
  },

  _wireControls() {
    const sfxBtn = document.getElementById('subsea-sfx-btn');
    const sfxLabel = document.getElementById('subsea-sfx-label');
    sfxBtn.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.store.setAudio({ sfxEnabled: !muted });
      sfxLabel.textContent = muted ? 'SFX: MUTE' : 'SFX: ON';
      if (!muted) this.audio.playBlip(700, 0.08);
    });

    const bgmBtn = document.getElementById('subsea-bgm-btn');
    const bgmLabel = document.getElementById('subsea-bgm-label');
    bgmBtn.addEventListener('click', () => {
      if (this.audio.isBgmPlaying()) {
        this.audio.stopChiptuneBgm();
        bgmLabel.textContent = 'TRILHA: INICIAR';
        this.store.setAudio({ bgmEnabled: false });
      } else {
        this.audio.startChiptuneBgm();
        bgmLabel.textContent = 'TRILHA: TOCANDO';
        this.store.setAudio({ bgmEnabled: true });
      }
    });

    const themeBtn = document.getElementById('subsea-theme-btn');
    themeBtn.addEventListener('click', () => this.theme.toggle());
  },

  _refreshSyncIndicator() {
    const led = document.getElementById('subsea-sync-led');
    const label = document.getElementById('subsea-sync-label');
    if (!led || !label) return;

    const state = this.store.getState();
    if (!this.store.isSyncActive()) {
      led.className = 'cockpit-master__led cockpit-master__led--off';
      label.textContent = 'LOCAL';
      return;
    }
    if (state.sync.ultimaSincronizacaoEm) {
      led.className = 'cockpit-master__led';
      label.textContent = 'SINCRONIZADO';
    } else {
      led.className = 'cockpit-master__led cockpit-master__led--pending';
      label.textContent = 'SINCRONIZANDO...';
    }
  },
};

window.SubseaCockpit = SubseaCockpit;
