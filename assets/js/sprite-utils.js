/*
  Offshore Estudy Game — Utilitário de Sprite
  Recorta um fundo sólido de uma imagem via canvas (client-side, sem dependência),
  usado pelos sprites gerados via Stitch MCP sobre fundo #091420 uniforme, para
  compor sem costura visível sobre o tema escuro do jogo.
*/

function subseaRecortarFundoSolido(img, corFundo, tolerancia) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [cr, cg, cb] = corFundo;
  for (let i = 0; i < dados.data.length; i += 4) {
    const dist = Math.abs(dados.data[i] - cr) + Math.abs(dados.data[i + 1] - cg) + Math.abs(dados.data[i + 2] - cb);
    if (dist <= tolerancia) dados.data[i + 3] = 0;
  }
  ctx.putImageData(dados, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Carrega `src`, recorta o fundo sólido e aplica o resultado em `destinoImgEl.src`. */
function subseaCarregarSpriteRecortado(src, destinoImgEl, corFundo = [9, 20, 32], tolerancia = 36) {
  const fonte = new Image();
  fonte.onload = () => {
    try {
      destinoImgEl.src = subseaRecortarFundoSolido(fonte, corFundo, tolerancia);
    } catch (err) {
      destinoImgEl.src = fonte.src; // navegador sem suporte a canvas: mostra com o fundo sólido mesmo
    }
  };
  fonte.src = src;
}

/** Recorta só a faixa de cima de uma imagem (0 a `fracaoAltura` da altura original). */
function subseaRecortarTopo(img, fracaoAltura) {
  const alturaRecorte = Math.round(img.naturalHeight * fracaoAltura);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = alturaRecorte;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.naturalWidth, alturaRecorte, 0, 0, img.naturalWidth, alturaRecorte);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Carrega `src`, recorta só a faixa limpa de cima (útil quando a arte de referência do Stitch
 * tem texto "queimado" na metade de baixo da mesma imagem) e aplica como background de `elementoAlvo`.
 */
function subseaCarregarFundoRecortado(src, elementoAlvo, fracaoAltura = 0.4) {
  const fonte = new Image();
  fonte.onload = () => {
    try {
      elementoAlvo.style.backgroundImage = `url(${subseaRecortarTopo(fonte, fracaoAltura)})`;
    } catch (err) {
      elementoAlvo.style.backgroundImage = `url(${src})`; // navegador sem suporte a canvas: usa a imagem inteira
    }
  };
  fonte.src = src;
}

window.SubseaSpriteUtils = {
  recortarFundoSolido: subseaRecortarFundoSolido,
  carregarSpriteRecortado: subseaCarregarSpriteRecortado,
  recortarTopo: subseaRecortarTopo,
  carregarFundoRecortado: subseaCarregarFundoRecortado,
};
