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

    const bassLine = [110, 110, 130.81, 98];
    let step = 0;

    const playStep = () => {
      if (!this.bgmEnabled) return;
      const freq = bassLine[step % bassLine.length];
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
      step += 1;
    };

    playStep();
    this._bgmTimer = window.setInterval(playStep, 400);
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
