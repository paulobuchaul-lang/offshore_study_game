/*
  Offshore Estudy Game — Navegação
  Menu superior (desktop >= 1024px) e barra inferior fixa (mobile), com as 8
  áreas do jogo. RF-07: qualquer área alcançável em no máximo 2 cliques/toques.
  Páginas de conteúdo (trilha, quizzes, glossário, etc.) são criadas pelas
  features seguintes (002 em diante); os links abaixo já refletem a estrutura
  alvo definida no PRD/spec-sdd, mesmo antes de as páginas existirem.
*/

const SUBSEA_NAV_ITEMS = [
  { id: 'inicio', label: 'Início', icon: '🎮', href: 'index.html' },
  { id: 'trilha', label: 'Trilha', icon: '🗺️', href: 'capitulos/index.html' },
  { id: 'quizzes', label: 'Quizzes', icon: '🎯', href: 'capitulos/index.html' },
  { id: 'glossario', label: 'Glossário', icon: '📖', href: 'glossario.html' },
  { id: 'normas', label: 'Normas', icon: '📋', href: 'normas.html' },
  { id: 'busca', label: 'Buscar', icon: '🔍', href: 'busca.html' },
  { id: 'prompts', label: 'Prompts', icon: '🤖', href: 'prompts.html' },
  { id: 'progresso', label: 'Progresso', icon: '🏆', href: 'progresso.html' },
  { id: 'config', label: 'Config', icon: '⚙️', href: 'configuracao.html' },
];

function renderNavLinks(activeNav, variant, basePath) {
  return SUBSEA_NAV_ITEMS.map((item) => {
    const isActive = item.id === activeNav;
    return `<a class="subsea-nav__link" href="${basePath}${item.href}" ${isActive ? 'aria-current="page"' : ''} data-nav-id="${item.id}" data-nav-variant="${variant}">
      <span>${item.icon}</span><span>${item.label}</span>
    </a>`;
  }).join('');
}

const SubseaNavigation = {
  /**
   * @param {string} basePath - prefixo relativo até a raiz do site (ex.: '' na raiz, '../' um nível abaixo).
   *   Necessário porque o GitHub Pages publica em um subcaminho (ex.: /offshore_study_game/),
   *   então links absolutos começando com "/" quebrariam.
   */
  render({ activeNav = '', audio = null, basePath = '' } = {}) {
    const mount = document.getElementById('cockpit-master-mount');
    if (!mount) return;

    const topNav = document.createElement('nav');
    topNav.className = 'subsea-nav subsea-nav--top';
    topNav.innerHTML = renderNavLinks(activeNav, 'top', basePath);
    mount.appendChild(topNav);

    const bottomNav = document.createElement('nav');
    bottomNav.className = 'subsea-nav subsea-nav--bottom';
    bottomNav.innerHTML = renderNavLinks(activeNav, 'bottom', basePath);
    document.body.appendChild(bottomNav);

    if (audio) {
      document.querySelectorAll('[data-nav-id]').forEach((link) => {
        link.addEventListener('click', () => audio.playBlip(880, 0.06));
      });
    }
  },
};

window.SubseaNavigation = SubseaNavigation;
