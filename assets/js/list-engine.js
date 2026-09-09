/*
  Offshore Estudy Game — Motor de Lista Genérico
  Extraído de glossario-engine.js (feature 003) para ser reaproveitado por
  qualquer tela de listagem estática (glossário, normas técnicas, prompts
  futuros): fetch de um JSON, busca normalizada, paginação, destaque de
  trecho e, opcionalmente, índice alfabético e agrupamento por chave.
  100% client-side, sem backend, sem biblioteca externa (D-01 do roadmap
  da feature 004-biblioteca-de-normas-tecnicas).
*/

function normalizarTexto(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Envolve o trecho que corresponde à busca em <mark>. Escapa regex especiais do termo buscado. */
function destacarTrecho(texto, busca) {
  if (!busca) return texto;
  const escapado = busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapado})`, 'gi');
  return texto.replace(regex, '<mark>$1</mark>');
}

function valorDoCampo(item, campo) {
  return typeof campo === 'function' ? campo(item) : item[campo];
}

class MotorDeLista {
  /**
   * @param {object} config
   * @param {string} config.url - caminho do JSON a carregar (ex.: 'data/normas.json')
   * @param {(string|function)[]} config.camposBusca - campos (ou funções extratoras) considerados na busca textual
   * @param {string|function} [config.ordenarPor] - campo (ou função extratora) usado para ordenar e para o índice alfabético
   * @param {string} [config.chaveAgrupamento] - campo usado por agrupar()
   */
  constructor(config) {
    this.url = config.url;
    this.camposBusca = config.camposBusca || [];
    this.ordenarPor = config.ordenarPor || null;
    this.chaveAgrupamento = config.chaveAgrupamento || null;
    this.itens = [];
    this.carregado = false;
  }

  async carregar() {
    if (this.carregado) return this.itens;
    const response = await fetch(this.url);
    if (!response.ok) throw new Error(`Falha ao carregar ${this.url}`);
    let itens = await response.json();
    if (this.ordenarPor) {
      itens = itens.sort((a, b) =>
        normalizarTexto(valorDoCampo(a, this.ordenarPor)).localeCompare(
          normalizarTexto(valorDoCampo(b, this.ordenarPor)),
        ),
      );
    }
    this.itens = itens;
    this.carregado = true;
    return this.itens;
  }

  filtrar(busca) {
    if (!busca) return this.itens;
    const buscaNormalizada = normalizarTexto(busca);
    return this.itens.filter((item) => {
      const alvo = normalizarTexto(
        this.camposBusca.map((campo) => valorDoCampo(item, campo) || '').join(' '),
      );
      return alvo.includes(buscaNormalizada);
    });
  }

  paginar(lista, pagina, tamanhoPagina) {
    const inicio = (pagina - 1) * tamanhoPagina;
    return {
      itens: lista.slice(inicio, inicio + tamanhoPagina),
      totalPaginas: Math.max(1, Math.ceil(lista.length / tamanhoPagina)),
      pagina,
    };
  }

  indiceAlfabetico(lista) {
    if (!this.ordenarPor) return [];
    const letras = new Set(
      lista.map((item) => normalizarTexto(valorDoCampo(item, this.ordenarPor)).charAt(0).toUpperCase()),
    );
    return Array.from(letras).sort();
  }

  /** Agrupa a lista pela chave configurada, preservando a ordem de primeira aparição dos grupos. */
  agrupar(lista) {
    if (!this.chaveAgrupamento) return null;
    const grupos = new Map();
    lista.forEach((item) => {
      const chave = valorDoCampo(item, this.chaveAgrupamento) || 'Outro';
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(item);
    });
    return grupos;
  }

  destacar(texto, busca) {
    return destacarTrecho(texto, busca);
  }
}

window.criarMotorDeLista = (config) => new MotorDeLista(config);
