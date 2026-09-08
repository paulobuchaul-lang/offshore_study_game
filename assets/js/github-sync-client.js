/*
  Offshore Estudy Game — GitHub Sync Client
  Implementa o contrato descrito em
  _reversa_forward/001-shell-e-navegacao/interfaces/github-contents-api.md.
  Lê/escreve data/users/<usuarioId>.json no repositório offshore_study_game
  via API REST (Contents API), usando o token colado pela usuária na tela de
  Configuração (token gerado por Paulo — ver requirements.md, RN-03).
*/

const GITHUB_OWNER = 'paulobuchaul-lang';
const GITHUB_REPO = 'offshore_study_game';
const GITHUB_API_TIMEOUT_MS = 8000;

function base64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64DecodeUnicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject({ code: 'TIMEOUT' }), ms)),
  ]);
}

class GithubSyncClient {
  constructor({ token, usuarioId = 'rafaela' }) {
    this.token = token;
    this.path = `data/users/${usuarioId}.json`;
    this.apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${this.path}`;
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
    };
  }

  /** Valida o token com uma chamada leve (RF-04). Lança erro com .code em caso de falha. */
  async validate() {
    const response = await withTimeout(
      fetch(this.apiUrl, { headers: this._headers() }),
      GITHUB_API_TIMEOUT_MS,
    );
    if (response.status === 401 || response.status === 403) {
      throw { code: response.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' };
    }
    // 404 é esperado na primeira sincronização (arquivo ainda não existe) — token está OK.
    return true;
  }

  /** Lê o estado remoto. Retorna { state, sha } ou { state: null, sha: null } se o arquivo não existe. */
  async read() {
    const response = await withTimeout(
      fetch(this.apiUrl, { headers: this._headers() }),
      GITHUB_API_TIMEOUT_MS,
    );

    if (response.status === 404) {
      return { state: null, sha: null };
    }
    if (response.status === 401) throw { code: 'UNAUTHORIZED' };
    if (response.status === 403) throw { code: 'FORBIDDEN' };
    if (!response.ok) throw { code: 'UNKNOWN', httpStatus: response.status };

    const body = await response.json();
    const decoded = base64DecodeUnicode(body.content.replace(/\n/g, ''));
    return { state: JSON.parse(decoded), sha: body.sha };
  }

  /**
   * Escreve o estado remoto. `sha` deve ser o valor lido na última leitura
   * (omitir/null na primeira escrita, quando o arquivo ainda não existe).
   * Em caso de conflito de sha, lança erro com code "CONFLICT" (ver EC do
   * state-store.js, que relê e reconcilia antes de tentar de novo).
   */
  async write(state, sha) {
    const payload = {
      message: `sync: atualiza estado de ${state.usuario && state.usuario.nome ? state.usuario.nome : 'usuária'}`,
      content: base64EncodeUnicode(JSON.stringify(state, null, 2)),
    };
    if (sha) payload.sha = sha;

    const response = await withTimeout(
      fetch(this.apiUrl, {
        method: 'PUT',
        headers: { ...this._headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      GITHUB_API_TIMEOUT_MS,
    );

    if (response.status === 409) throw { code: 'CONFLICT' };
    if (response.status === 401) throw { code: 'UNAUTHORIZED' };
    if (response.status === 403) {
      const retryAfter = response.headers.get('Retry-After');
      throw { code: 'FORBIDDEN', retryAfter };
    }
    if (!response.ok) throw { code: 'UNKNOWN', httpStatus: response.status };

    const body = await response.json();
    return { sha: body.content.sha };
  }
}

window.SubseaGithubSyncClient = GithubSyncClient;
