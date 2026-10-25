/* swapSheet(slot, {slots, dna, exact}) — экран 3 «Замена» (ТЗ v2, раздел 6; эталон etalon-v2-V3): шторка поверх затемнённой доски.
   «Пол» · «● цвет ДНК — орех · ≈ 42,7 м²» · ✕; ПРЕМИУМ и БАЗА — по 3 карточки в ряд: фото-образец 100×76 · название · цена за м²/шт ·
   «✓ сочетается» / «! причина». Текущий — рамка 2px. Внизу «выбери — доска и бюджет обновятся» · «Ещё в Маркете ›». */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.unitPrice = function (it) { var F = window.SOVE.fmt; return F.num(it.price) + ' ₽' + (it.unit === 'компл.' ? '' : '/' + it.unit); };   /* один формат везде: «4 270 ₽/м²» */

  UI.swapSheet = function (slot, st) {
    var KB = window.SOVE_KB, F = window.SOVE.fmt, esc = F.esc, s = KB.slot(slot), cur = st.slots[slot], c = KB.dnaColor(st.dna, s.dna);
    var ctx = { dna: st.dna, slots: st.slots }, it0 = KB.item(cur.sku);
    function lane(level, title) {
      var xs = KB.itemsFor(slot).filter(function (it) { return it.level === level; });
      return '<small class="sw-lane">' + title + '</small><div class="sw-row">' + xs.map(function (it) {
        var on = cur.sku === it.sku, r = KB.check(it, slot, ctx);
        return '<button type="button" class="sw-card' + (on ? ' is-cur' : '') + '" data-pick="' + it.sku + '" aria-pressed="' + on + '">' +
          UI.sampleTile(it, 100, 76, { thickness: 4, radius: 6 }) +
          '<span class="sw-card__t">' + esc(it.name) + '</span><b>' + UI.unitPrice(it) + '</b>' +
          '<small class="' + (r.ok ? 'is-ok' : 'is-bad') + '">' + (r.ok ? '✓ сочетается' : '! ' + esc(r.reason)) + '</small></button>';
      }).join('') + '</div>';
    }
    var qty = it0.unit === 'компл.' ? '' : ' · ' + (st.exact ? '' : '≈ ') + String(cur.qty).replace('.', ',') + ' ' + it0.unit;
    return '<div class="sw-head"><span><b class="sw-t">Замены · ' + esc(s.name) + '</b>' +
        '<span class="sw-sub"><i style="background:' + (c ? c.hex : '#ccc') + '"></i>цвет ДНК — ' + esc(c ? c.name.toLowerCase() : '') + qty + '</span></span>' +
        '<button type="button" class="sw-x" data-sw-close aria-label="Закрыть">✕</button></div>' +
      lane('premium', 'ПРЕМИУМ') + lane('base', 'БАЗА') +
      '<div class="sw-foot"><small>выбери — доска и бюджет обновятся' + (st.price ? ' · ' + UI.fmtTokens(st.price) : '') + '</small><a href="market.html?q=' + encodeURIComponent(s.name.toLowerCase()) + '" data-market="' + slot + '">Ещё в Маркете ›</a></div>';
  };
})();
