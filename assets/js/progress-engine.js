/*
  Offshore Estudy Game — Progress Engine
  Regras de negócio de progresso: XP, patentes e insígnias. `state-store.js`
  continua sendo só persistência; este módulo calcula o que muda no campo
  `progresso` de SubseaState.

  PATENTE_TIERS e INSIGNIAS são valores placeholder (ver data-delta.md da
  feature 002-progresso-da-usuaria) — ajustáveis quando o conteúdo técnico
  (quantidade de módulos, XP por ação) for definido nas sessões futuras.
*/

const XP_POR_NIVEL_CONCLUIDO = 100;

const PATENTE_TIERS = [
  { min: 0, titulo: 'Trainee Offshore' },
  { min: 500, titulo: 'Engenheira de Campo' },
  { min: 1500, titulo: 'Especialista de Sistemas' },
  { min: 3500, titulo: 'Líder de Instalação' },
  { min: 7000, titulo: 'Coordenadora de Projetos' },
  { min: 12000, titulo: 'Capitã Submarina' },
];

/** Insígnias genéricas: não dependem de módulos específicos, funcionam mesmo sem trilha publicada. */
const INSIGNIAS = [
  {
    id: 'primeira-missao',
    titulo: 'Primeira Missão Concluída',
    descricao: 'Concluiu o primeiro módulo em qualquer nível.',
    condicao: (state) => Object.keys(state.progresso.modulos).length >= 1,
  },
  {
    id: 'cinco-modulos',
    titulo: '5 Módulos Conquistados',
    descricao: 'Concluiu pelo menos um nível em 5 módulos diferentes.',
    condicao: (state) => Object.keys(state.progresso.modulos).length >= 5,
  },
  {
    id: 'todos-niveis-um-modulo',
    titulo: 'Domínio Completo',
    descricao: 'Concluiu os 3 níveis de complexidade de um mesmo módulo.',
    condicao: (state) =>
      Object.values(state.progresso.modulos).some(
        (m) => m.niveisConcluidos && m.niveisConcluidos.length >= 3,
      ),
  },
];

function getPatenteAtual(xp) {
  let atual = PATENTE_TIERS[0].titulo;
  for (const tier of PATENTE_TIERS) {
    if (xp >= tier.min) atual = tier.titulo;
  }
  return atual;
}

function getProximaPatente(xp) {
  const proxima = PATENTE_TIERS.find((tier) => tier.min > xp);
  return proxima || null;
}

/** Marca um módulo/nível como concluído, soma XP e verifica insígnias. Retorna o novo `progresso`. */
function concluirModulo(progresso, moduloId, nivel) {
  const moduloAtual = progresso.modulos[moduloId] || {
    niveisConcluidos: [],
    concluidoEm: { basico: null, intermediario: null, avancado: null },
  };

  const jaConcluido = moduloAtual.niveisConcluidos.includes(nivel);
  const niveisConcluidos = jaConcluido
    ? moduloAtual.niveisConcluidos
    : [...moduloAtual.niveisConcluidos, nivel];

  const novoProgresso = {
    ...progresso,
    modulos: {
      ...progresso.modulos,
      [moduloId]: {
        niveisConcluidos,
        concluidoEm: { ...moduloAtual.concluidoEm, [nivel]: new Date().toISOString() },
      },
    },
    xp: progresso.xp + (jaConcluido ? 0 : XP_POR_NIVEL_CONCLUIDO),
  };

  return verificarInsigniasDesbloqueadas(novoProgresso);
}

/** Reavalia todas as condições de insígnia contra o progresso atual. Idempotente. */
function verificarInsigniasDesbloqueadas(progresso) {
  const stateParaCondicao = { progresso };
  const desbloqueadas = new Set(progresso.insigniasDesbloqueadas);

  INSIGNIAS.forEach((insignia) => {
    if (!desbloqueadas.has(insignia.id) && insignia.condicao(stateParaCondicao)) {
      desbloqueadas.add(insignia.id);
    }
  });

  return { ...progresso, insigniasDesbloqueadas: Array.from(desbloqueadas) };
}

function listarInsigniasComStatus(progresso) {
  return INSIGNIAS.map((insignia) => ({
    ...insignia,
    desbloqueada: progresso.insigniasDesbloqueadas.includes(insignia.id),
  }));
}

function contarModulosConcluidos(progresso) {
  return Object.keys(progresso.modulos).length;
}

window.SubseaProgressEngine = {
  PATENTE_TIERS,
  INSIGNIAS,
  getPatenteAtual,
  getProximaPatente,
  concluirModulo,
  verificarInsigniasDesbloqueadas,
  listarInsigniasComStatus,
  contarModulosConcluidos,
};

/** Ferramenta de teste manual (T011): simula conclusão de módulo sem trilha real publicada.
 *  Uso no console do navegador: SubseaDebug.concluirModuloTeste('modulo-teste-1', 'basico')
 */
window.SubseaDebug = window.SubseaDebug || {};
window.SubseaDebug.concluirModuloTeste = function concluirModuloTeste(moduloId, nivel) {
  if (!window.SubseaCockpit || !window.SubseaCockpit.store) {
    console.warn('SubseaCockpit ainda não foi inicializado nesta página.');
    return;
  }
  const store = window.SubseaCockpit.store;
  const estadoAtual = store.getState();
  const novoProgresso = concluirModulo(estadoAtual.progresso, moduloId, nivel);
  store.update({ progresso: novoProgresso });
  console.log('Módulo de teste concluído:', moduloId, nivel, '— XP total:', novoProgresso.xp);
};
