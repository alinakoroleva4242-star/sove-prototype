/* sampleTile(spec, w, h, {shape, thickness, rot, num, selected, flag}) — образец как физический предмет
   (ТЗ v2, раздел 7, приём Mattoboard): два слоя одной фактуры — кромка (сдвиг вниз, brightness .58)
   и лицо (блик сверху), общая мягкая тень. Формы: rect · plank · strip · round · circle · arch.
   Фактура: реальное фото-вырезка (photo, sw/*.jpg) → выкраска краски (swatch: цвет × штукатурка, как малярная карточка) →
   фактура tex (размер 1,4 × большая сторона) → CSS по виду материала. Логотипов нет. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  /* цена генерации словами — одна функция на блок (TZ-interior-final, 6): fmtTokens(10) → «+10 токенов»; значков токенов  нет */
  UI.fmtTokens = function (n) { return '+' + window.SOVE.fmt.tokens(n); };

  function rgb(h) { h = String(h).replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  /* светлее (+) / темнее (−) на долю */
  function shade(hex, k) {
    var c = rgb(hex).map(function (v) { return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); });
    return 'rgb(' + c.join(',') + ')';
  }
  UI.shade = shade;

  /* CSS-фактуры: дерево — продольные полосы, плитка — сетка швов, металл — горизонтальная шлифовка, штукатурка — мягкий шум */
  function texture(spec, w, h) {
    var c = spec.hex, d = shade(c, -.16), l = shade(c, .12), s = Math.max(w || 60, h || 60);
    var seam = shade(c, rgb(c)[0] > 150 ? -.22 : .28);
    switch (spec.texture) {
      case 'wood': return {
        bg: 'repeating-linear-gradient(90deg, transparent 0 ' + Math.round(s * .42) + 'px, rgba(0,0,0,.28) ' + Math.round(s * .42) + 'px ' + (Math.round(s * .42) + 1) + 'px),' +
            'repeating-linear-gradient(0deg, ' + d + ' 0 1px, ' + c + ' 1px 5px, ' + l + ' 5px 6px, ' + c + ' 6px 9px, ' + shade(c, -.06) + ' 9px 13px)' };
      case 'herringbone': return {
        bg: 'repeating-linear-gradient(45deg, rgba(0,0,0,.22) 0 1px, transparent 1px 12px),' +
            'repeating-linear-gradient(-45deg, ' + d + ' 0 1px, ' + c + ' 1px 4px, ' + l + ' 4px 5px, ' + c + ' 5px 12px)' };
      case 'tile': case 'tileBig': case 'tileWall': case 'metro': case 'zellige':
        var sz = { tile: [22, 22], tileBig: [34, 17], tileWall: [12, 34], metro: [18, 9], zellige: [11, 11] }[spec.texture];
        return { bg: 'linear-gradient(90deg, ' + seam + ' 1px, transparent 1px) 0 0 / ' + sz[0] + 'px ' + sz[1] + 'px,' +
          'linear-gradient(0deg, ' + seam + ' 1px, transparent 1px) 0 0 / ' + sz[0] + 'px ' + sz[1] + 'px,' +
          (spec.texture === 'zellige' ? 'radial-gradient(circle at 30% 30%, ' + l + ', transparent 60%) 0 0 / 11px 11px,' : '') +
          (spec.texture === 'tileWall' || spec.texture === 'metro' ? 'linear-gradient(160deg, rgba(255,255,255,.28), transparent 45%),' : '') + c };
      case 'metal': case 'brushed':
        return { bg: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,.38) 45%, transparent 70%),' +
          'repeating-linear-gradient(0deg, ' + l + ' 0 1px, ' + c + ' 1px 2px, ' + d + ' 2px ' + (spec.texture === 'brushed' ? 3 : 4) + 'px),' + c };
      case 'plaster':
        return { bg: 'radial-gradient(circle at 20% 30%, ' + l + ' 0 18%, transparent 40%),radial-gradient(circle at 70% 60%, ' + shade(c, -.05) + ' 0 22%, transparent 45%),' +
          'radial-gradient(circle at 45% 85%, ' + shade(c, .06) + ' 0 15%, transparent 35%),radial-gradient(circle at 85% 15%, ' + shade(c, -.04) + ' 0 12%, transparent 30%),' + c };
      case 'molding':
        return { bg: 'repeating-linear-gradient(0deg, ' + c + ' 0 5px, ' + d + ' 5px 6px, ' + l + ' 6px 8px, ' + c + ' 8px 11px)' };
      case 'enamel':
        return { bg: 'linear-gradient(170deg, rgba(255,255,255,.35), transparent 40%),' + c };
      case 'matte':
        return { bg: 'linear-gradient(135deg, rgba(255,255,255,.18), transparent 60%),' + c };
      default:
        return { bg: 'linear-gradient(160deg, rgba(255,255,255,.14), transparent 60%),' + c };
    }
  }
  UI.texture = texture;

  /* фон образца (ТЗ Интерьера, 8): фото-вырезка sw/ (cover) → выкраска краски: цвет товара × штукатурка → фактура tex → CSS */
  function bgOf(spec, w, h) {
    /* маленькие образцы (строки списка, карточки замены) — квадратная вырезка, крупные на доске — полная */
    if (spec.photo) return 'url(' + (spec.photoSq && Math.max(w, h) <= 110 ? spec.photoSq : spec.photo) + ') center / cover';
    if (spec.swatch) return spec.swatch + ' url(assets/img/interior/tex/plaster-milk.jpg) center / 300px';
    if (spec.textureUrl) return 'url(' + spec.textureUrl + ') center / ' + Math.round(1.4 * Math.max(w, h)) + 'px';
    return texture(spec, w, h).bg;
  }
  UI.tileBg = bgOf;

  var RADIUS = { rect: '4px', plank: '4px', strip: '4px', round: '10px', circle: '50%' };
  UI.sampleTile = function (spec, w, h, o) {
    o = o || {};
    var shape = o.shape || 'rect', th = o.thickness != null ? o.thickness : 5, kind = spec.photo ? 'photo' : spec.swatch ? 'swatch' : 'tex';
    var r = o.radius ? o.radius + 'px' : shape === 'arch' ? Math.round(w / 2) + 'px ' + Math.round(w / 2) + 'px 4px 4px' : RADIUS[shape] || '4px';
    var bg = bgOf(spec, w, h);
    return '<span class="st st--' + shape + ' st--' + kind + (o.selected ? ' is-sel' : '') + (o.flag ? ' is-flag' : '') + (o.cls ? ' ' + o.cls : '') + '"' +
      ' style="width:' + w + 'px;height:' + (h + th) + 'px;--h:' + h + 'px;--r:' + r + ';--th:' + th + 'px;--rot:' + (o.rot || 0) + 'deg' + (o.style ? ';' + o.style : '') + '"' +
      (o.attrs ? ' ' + o.attrs : '') + '>' +
      '<i class="st__edge" style="background:' + bg + '"></i><i class="st__face" style="background:' + bg + '"></i>' +
      (o.num ? '<b class="st__num">' + o.num + '</b>' : '') + (o.flag ? '<b class="st__flag" aria-label="выбивается из ДНК">!</b>' : '') + '</span>';
  };
})();
