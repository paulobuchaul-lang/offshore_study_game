/*
  Offshore Estudy Game — Motor de Áudio Sintetizado (Web Audio API)
  Unifica as 3 implementações encontradas no inventário do material Stitch:
  SubseaSFXEngine (tela de abertura), SubseaAudioEngine (ADR) e SubseaSFX (three.js_1).
  Zero arquivos de áudio: tudo sintetizado por osciladores, para carregar instantâneo
  no GitHub Pages mesmo em conexão lenta (RF-09).
*/

class SubseaAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxEnabled = true;
    this.volume = 0.8;
    this.bgmEnabled = false;
    this._bgmNodes = [];
    this._bgmTimer = null;
  }

  _ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = !!enabled;
  }

  toggleMute() {
    this.setSfxEnabled(!this.sfxEnabled);
    return !this.sfxEnabled;
  }

  _tone({ type = 'square', freq = 440, freqEnd = null, duration = 0.08, startGain = 0.15 } = {}) {
    if (!this.sfxEnabled) return;
    this._ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);
    }

    gain.gain.setValueAtTime(startGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Clique genérico de navegação/UI. */
  playBlip(freq = 700, duration = 0.06) {
    this._tone({ type: 'square', freq, freqEnd: freq * 0.4, duration });
  }

  /** Som do switch de tema Sol/Lua — frequência diferente para claro/escuro. */
  playThemeSwitch(isLight = false) {
    this._tone({
      type: 'triangle',
      freq: isLight ? 850 : 420,
      freqEnd: isLight ? 1200 : 300,
      duration: 0.09,
    });
  }

  /** Ping de sonar/radar, usado em elementos de mapa/telemetria. */
  playSonarPing() {
    this._tone({ type: 'sine', freq: 1450, duration: 0.8, startGain: 0.1 });
  }

  /** Fanfarra curta de sucesso/conquista. */
  playSuccess() {
    if (!this.sfxEnabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  /** Jingle de abertura ("Press Start"). */
  playStartJingle() {
    this.playSuccess();
  }

  /** Erro/feedback negativo (ex.: resposta errada em quiz). */
  playError() {
    this._tone({ type: 'sawtooth', freq: 400, freqEnd: 150, duration: 0.2, startGain: 0.12 });
  }

  isBgmPlaying() {
    return this.bgmEnabled && this._bgmTimer !== null;
  }

  /** Trilha chiptune opcional — nunca inicia sozinha (RF-10). Chamar apenas em resposta a interação da usuária. */
  startChiptuneBgm() {
    if (this.isBgmPlaying()) return;
    this._ensureContext();
    if (!this.ctx) return;
    this.bgmEnabled = true;

    // Sequenciador de 16 passos (200ms/passo, ~3.2s de loop) em Lá menor — baixo sincopado,
    // arpejo de lead nos contratempos e um "hi-hat" curto marcando o groove.
    const STEP_MS = 200;
    const bassLine = [110, 0, 110, 130.81, 0, 110, 0, 98, 110, 0, 110, 130.81, 0, 98, 0, 110];
    const leadLine = [0, 440, 0, 523.25, 0, 659.25, 0, 523.25, 0, 440, 0, 392, 0, 523.25, 0, 440];
    const hatSteps = [1, 3, 5, 7, 9, 11, 13, 15];
    let step = 0;

    const playStep = () => {
      if (!this.bgmEnabled) return;
      const t = this.ctx.currentTime;
      const i = step % 16;

      if (bassLine[i]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassLine[i], t);
        gain.gain.setValueAtTime(this.volume * 0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.32);
      }

      if (leadLine[i]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(leadLine[i], t);
        gain.gain.setValueAtTime(this.volume * 0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.16);
      }

      if (hatSteps.includes(i)) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(5200, t);
        gain.gain.setValueAtTime(this.volume * 0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.03);
      }

      step += 1;
    };

    playStep();
    this._bgmTimer = window.setInterval(playStep, STEP_MS);
  }

  stopChiptuneBgm() {
    this.bgmEnabled = false;
    if (this._bgmTimer !== null) {
      window.clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
  }
}

window.SubseaAudioEngine = SubseaAudioEngine;
