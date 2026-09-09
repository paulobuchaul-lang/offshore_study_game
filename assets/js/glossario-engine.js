/*
  Offshore Estudy Game — Glossário Engine
  Carrega data/glossario.json e faz filtro, paginação e índice alfabético
  100% client-side. Sem backend, sem biblioteca externa (D-01/D-02 do roadmap
  da feature 003-glossario).
*/

const CATEGORIA_ICONE = {
  'valvula-equipamento': '🔧',
  'duto-riser': '〰️',
  'embarcacao-unidade': '🚢',
  poco: '🛢️',
  geral: '📦',
};

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

class GlossarioEngine {
  constructor() {
    this.termos = [];
    this.carregado = false;
  }

  async carregar() {
    if (this.carregado) return this.termos;
    const response = await fetch('data/glossario.json');
    if (!response.ok) throw new Error('Falha ao carregar data/glossario.json');
    this.termos = (await response.json()).sort((a, b) =>
      normalizarTexto(a.termo).localeCompare(normalizarTexto(b.termo)),
    );
    this.carregado = true;
    return this.termos;
  }

  filtrar(busca) {
    if (!busca) return this.termos;
    const buscaNormalizada = normalizarTexto(busca);
    return this.termos.filter((t) => {
      const alvo = normalizarTexto(`${t.termo} ${t.sigla || ''} ${t.definicao}`);
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
    const letras = new Set(lista.map((t) => normalizarTexto(t.termo).charAt(0).toUpperCase()));
    return Array.from(letras).sort();
  }

  getIconeCategoria(categoria) {
    return CATEGORIA_ICONE[categoria] || CATEGORIA_ICONE.geral;
  }

  destacar(texto, busca) {
    return destacarTrecho(texto, busca);
  }
}

window.SubseaGlossarioEngine = new GlossarioEngine();
