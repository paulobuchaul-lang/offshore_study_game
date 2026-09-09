/*
  Offshore Estudy Game — State Store
  Implementa o schema SubseaState definido em
  _reversa_forward/001-shell-e-navegacao/data-delta.md.
  Persistência local sempre ativa (localStorage); sincronização remota via
  GitHub Sync Client é opcional e plugada depois (attachSyncClient), sem
  bloquear o funcionamento local caso não haja token configurado (RN-02/RN-03).
*/

const SUBSEA_STATE_STORAGE_KEY = 'subsea_state_v1';
const SUBSEA_SCHEMA_VERSION = '1.0';

function defaultState() {
  return {
    schemaVersion: SUBSEA_SCHEMA_VERSION,
    usuario: { id: 'rafaela', nome: 'Rafaela' },
    tema: 'dark',
    audio: { sfxEnabled: true, volume: 0.8, bgmEnabled: false },
    sync: { enabled: false, ultimaSincronizacaoEm: null, shaArquivoRemoto: null },
    progresso: { modulos: {}, xp: 0, insigniasDesbloqueadas: [] },
    atualizadoEm: new Date().toISOString(),
  };
}

class SubseaStateStore {
  constructor() {
    this.state = this._loadLocal();
    this._listeners = [];
    this._syncClient = null;
    this._syncDebounceTimer = null;
    this._syncDebounceMs = 3000;
  }

  _loadLocal() {
    try {
      const raw = window.localStorage.getItem(SUBSEA_STATE_STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch (err) {
      return defaultState();
    }
  }

  _saveLocal() {
    try {
      window.localStorage.setItem(SUBSEA_STATE_STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      /* localStorage indisponível (EC-02 da spec shell-e-navegacao): app segue funcionando na sessão atual */
    }
  }

  getState() {
    return this.state;
  }

  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  _notify() {
    this._listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        /* um listener com erro não derruba os demais */
      }
    });
  }

  /** Atualiza um subconjunto do estado (merge raso no nível informado) e persiste. */
  update(partial) {
    this.state = { ...this.state, ...partial, atualizadoEm: new Date().toISOString() };
    this._saveLocal();
    this._notify();
    this._scheduleSync();
  }

  setTema(tema) {
    this.update({ tema });
  }

  setAudio(partialAudio) {
    this.update({ audio: { ...this.state.audio, ...partialAudio } });
  }

  /** Plugado pelo cockpit-element.js quando um token válido está configurado (T012). */
  attachSyncClient(client) {
    this._syncClient = client;
    this.state = { ...this.state, sync: { ...this.state.sync, enabled: true } };
    this._saveLocal();
    this._notify();
  }

  /** Lê o estado remoto uma vez (ex.: logo após attachSyncClient) e reconcilia com o local. */
  async initialSync() {
    if (!this._syncClient) return;
    try {
      const remote = await this._syncClient.read();
      if (remote.sha === null) {
        // Primeira sincronização desta usuária: nada remoto ainda, escreve o estado local atual.
        await this._syncNow();
        return;
      }
      const merged = this._mergeStates(this.state, remote.state);
      this.state = {
        ...merged,
        sync: { ...this.state.sync, shaArquivoRemoto: remote.sha, ultimaSincronizacaoEm: new Date().toISOString() },
      };
      this._saveLocal();
      this._notify();
    } catch (err) {
      this._markSyncPending();
    }
  }

  detachSyncClient() {
    this._syncClient = null;
    this.state = { ...this.state, sync: { ...this.state.sync, enabled: false } };
    this._saveLocal();
    this._notify();
  }

  isSyncActive() {
    return !!this._syncClient;
  }

  _scheduleSync() {
    if (!this._syncClient) return; // RN-03: sem token, nunca tenta sincronizar
    if (this._syncDebounceTimer) window.clearTimeout(this._syncDebounceTimer);
    this._syncDebounceTimer = window.setTimeout(() => this._syncNow(), this._syncDebounceMs);
  }

  async _syncNow() {
    if (!this._syncClient) return;
    try {
      const result = await this._syncClient.write(this.state, this.state.sync.shaArquivoRemoto);
      this.state = {
        ...this.state,
        sync: {
          ...this.state.sync,
          shaArquivoRemoto: result.sha,
          ultimaSincronizacaoEm: new Date().toISOString(),
        },
      };
      this._saveLocal();
      this._notify();
    } catch (err) {
      if (err && err.code === 'CONFLICT') {
        // Reconciliação: relê o remoto e aplica união (nunca perde progresso já concluído).
        try {
          const remote = await this._syncClient.read();
          const merged = this._mergeStates(this.state, remote.state);
          this.state = { ...merged, sync: { ...this.state.sync, shaArquivoRemoto: remote.sha } };
          this._saveLocal();
          this._notify();
          this._scheduleSync();
        } catch (reconcileErr) {
          this._markSyncPending();
        }
      } else {
        this._markSyncPending();
      }
    }
  }

  /** União simples: campos "irmãos" de progresso nunca regridem (ver EC-05 da spec shell-e-navegacao e EC-02 de progresso-da-usuaria). */
  _mergeStates(local, remote) {
    if (!remote) return local;
    const localNewer = new Date(local.atualizadoEm) >= new Date(remote.atualizadoEm);
    return localNewer ? local : { ...remote };
  }

  _markSyncPending() {
    // Falha silenciosa para a usuária (RF-06/RN-04): app continua funcionando localmente.
    // O indicador visual de "sincronização pendente" é responsabilidade do cockpit-element.js (T018).
    this._notify();
  }
}

window.SubseaStateStore = SubseaStateStore;
