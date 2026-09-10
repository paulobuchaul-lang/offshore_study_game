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
const SUBSEA_FAVICON_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23091420'/%3E%3Ctext x='50' y='72' font-size='58' text-anchor='middle'%3E%E2%9A%93%3C/text%3E%3C/svg%3E";

/** Injeta o favicon do jogo (SVG inline, zero asset extra) se a página ainda não tiver um. */
function ensureFavicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = SUBSEA_FAVICON_SVG;
  document.head.appendChild(link);
}

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

  /**
   * `mountHeader`/`mountNav` = false: a página tem seu próprio cabeçalho/navegação
   * (ex.: a tela de abertura, que reaproveita o layout do Stitch) e só quer os
   * motores compartilhados (tema, áudio, estado, sync), sem o Cockpit Mestre padrão.
   */
  init({ activeNav = '', basePath = '', mountHeader = true, mountNav = true } = {}) {
    ensureFavicon();
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

    if (mountHeader) {
      this._mount();
      this._wireControls();
      this._refreshSyncIndicator();
      this.store.onChange(() => this._refreshSyncIndicator());
    }
    this._mountScanlines();
    this._mountDiveTransition();
    this._resumeBgmSeSalvo();

    if (mountNav && window.SubseaNavigation && typeof window.SubseaNavigation.render === 'function') {
      window.SubseaNavigation.render({ activeNav, audio: this.audio, basePath });
    }

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

  /**
   * Overlay de scanlines (`.crt-scanlines`, `crt-arcade.css`): mesmo padrão visual
   * em toda a aplicação. A tela de abertura já injeta o dela própria
   * (`.opening__scanlines`) direto no HTML, então só cria se nenhuma das duas
   * classes já estiver presente, para nunca duplicar o overlay.
   */
  _mountScanlines() {
    if (document.querySelector('.crt-scanlines, .opening__scanlines')) return;
    const el = document.createElement('div');
    el.className = 'crt-scanlines';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  },

  _mountDiveTransition() {
    if (document.getElementById('subsea-dive-transition')) return;
    const el = document.createElement('div');
    el.id = 'subsea-dive-transition';
    el.className = 'subsea-dive-transition';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = Array.from({ length: 14 })
      .map(() => '<span class="subsea-dive-transition__bubble"></span>')
      .join('');
    document.body.appendChild(el);
  },

  /** Transição "mergulho": bolhas sobem por cima da tela. Não bloqueia navegação (resolve sempre). */
  playDiveTransition(durationMs = 550) {
    return new Promise((resolve) => {
      const el = document.getElementById('subsea-dive-transition');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!el || reduced) {
        resolve();
        return;
      }
      el.classList.add('subsea-dive-transition--active');
      window.setTimeout(() => {
        el.classList.remove('subsea-dive-transition--active');
        resolve();
      }, durationMs);
    });
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
    bgmBtn.addEventListener('click', () => {
      if (this.audio.isBgmPlaying()) {
        this.audio.stopChiptuneBgm();
        this.store.setAudio({ bgmEnabled: false });
      } else {
        this.audio.startChiptuneBgm();
        this.store.setAudio({ bgmEnabled: true });
      }
      this._syncBgmLabel();
    });

    const themeBtn = document.getElementById('subsea-theme-btn');
    themeBtn.addEventListener('click', () => this.theme.toggle());
  },

  _syncBgmLabel() {
    const bgmLabel = document.getElementById('subsea-bgm-label');
    if (bgmLabel) bgmLabel.textContent = this.audio.isBgmPlaying() ? 'TRILHA: TOCANDO' : 'TRILHA: INICIAR';
  },

  /**
   * A trilha nunca começa sozinha "do zero" (RF-10): isto só retoma um estado que a
   * própria usuária já ligou numa página anterior. Como cada página é um reload
   * completo, o AudioContext nasce suspenso até a primeira interação — por isso
   * também escuta o primeiro clique/tecla da página nova para destravar o áudio.
   */
  _resumeBgmSeSalvo() {
    const estava = this.store.getState().audio.bgmEnabled;
    if (!estava) return;

    // Agenda a trilha já de cara (silenciosa até o contexto ser destravado por um gesto real).
    this.audio.startChiptuneBgm();
    this._syncBgmLabel();

    const destravar = () => {
      if (this.audio.ctx && this.audio.ctx.state === 'suspended') {
        this.audio.ctx.resume();
      }
    };
    ['pointerdown', 'keydown'].forEach((evento) => {
      document.addEventListener(evento, destravar, { once: true });
    });
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
