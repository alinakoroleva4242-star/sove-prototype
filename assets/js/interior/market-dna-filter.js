/* marketDnaFilter(slot, st) — R4 «Маркет с ДНК» (ТЗ Материалов, 5.5): весь Маркет по слоту, у каждого товара
   отметка «✓ К ТВОЕЙ ДНК» / «! СВЕТЛЕЕ ДНК НА 2 ТОНА». Чип «Моя ДНК ✕» снимает отметки, «только ✓» — фильтр.
   В прототипе «весь Маркет» по слоту — товары базы finish-slots.js (у товаров каталога пока нет тегов цвета). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  function badge(r) {
    if (r.ok) return '✓ К ТВОЕЙ ДНК';
    var t = r.tones ? ' НА ' + r.tones + ' ' + (r.tones === 1 ? 'ТОН' : r.tones < 5 ? 'ТОНА' : 'ТОНОВ') : '';
    return ('! ' + r.reason + (/ДНК$/.test(r.reason) ? t : '')).toUpperCase();
  }
  UI.marketItems = function (slot, st) {
    var KB = window.SOVE_KB, q = String(st.q || '').toLowerCase().replace(/ё/g, 'е').trim(), ctx = { dna: st.dna, slots: st.slots };
    var xs = KB.itemsFor(slot).map(function (it) { return { it: it, r: KB.check(it, slot, ctx) }; }).filter(function (x) {
      if (st.level && x.it.level !== st.level) return false;
      if (st.dnaOn && st.onlyOk && !x.r.ok) return false;
      if (q && (x.it.name + ' ' + x.it.material + ' ' + x.it.sku).toLowerCase().replace(/ё/g, 'е').indexOf(q) < 0) return false;
      return true;
    });
    if (st.sort) xs.sort(function (a, b) { return st.sort === 'asc' ? a.it.price - b.it.price : b.it.price - a.it.price; });
    return xs;
  };
  UI.marketDnaFilter = function (slot, st) {
    var KB = window.SOVE_KB, S = window.SOVE, F = S.fmt, esc = F.esc, s = KB.slot(slot), R = S.repair;
    var xs = UI.marketItems(slot, st);
    var chip = function (attr, label, on, dark) { return '<button type="button" class="chip' + (on ? ' is-on' : '') + (dark ? ' mk-chip--dna' : '') + '" ' + attr + ' aria-pressed="' + !!on + '">' + label + '</button>'; };
    return '<div class="mk-search"><input class="input" type="search" data-mk-q value="' + esc(st.q || '') + '" placeholder="паркет, ламинат, артикул" aria-label="Поиск в Маркете">' +
        '<a class="mk-photo" href="ai.html?mode=photo" aria-label="Найти по фото">⇪</a></div>' +
      '<div class="mk-chips">' +
        (st.dnaOn ? chip('data-mk-dna', '<span class="mk-dna">' + st.dna.map(function (c) { return '<i style="background:' + c.hex + '"></i>'; }).join('') + '</span>Моя ДНК ✕', true, true)
                  : chip('data-mk-dna', '＋ Моя ДНК', false)) +
        chip('data-mk-level="base"', 'База', st.level === 'base') + chip('data-mk-level="premium"', 'Премиум', st.level === 'premium') +
        chip('data-mk-sort', 'Цена ' + (st.sort === 'desc' ? '▴' : '▾'), !!st.sort) + chip('data-mk-brand', 'Бренд ▾', false) + '</div>' +
      (st.dnaOn ? '<div class="mk-note"><span>Показываем весь Маркет и отмечаем, что подходит к твоей ДНК</span>' +
        '<label class="mk-tg"><input type="checkbox" data-mk-ok' + (st.onlyOk ? ' checked' : '') + '><i></i>только ✓</label></div>' : '') +
      (xs.length ? '<div class="mk-grid">' + xs.map(function (x) {
        var p = UI.product(x.it), cur = st.slots[slot] && st.slots[slot].sku === x.it.sku;
        return '<div class="mk-card' + (cur ? ' is-cur' : '') + '">' +
          '<span class="mk-card__pic">' + UI.sampleTile(x.it, 128, 92, { shape: 'rect', thickness: 4 }) +
            (st.dnaOn ? '<em class="' + (x.r.ok ? 'is-ok' : 'is-bad') + '">' + esc(badge(x.r)) + '</em>' : '') +
            '<span class="mk-card__fav">' + R.btns(p, 'materials').split('</button>')[0] + '</button></span></span>' +
          '<b>' + esc(x.it.name) + '</b><span class="mk-card__p">' + UI.unitPrice(x.it) + '</span>' +
          (cur ? '<span class="mk-card__cur">на доске</span>'
               : '<button type="button" class="' + (x.r.ok || !st.dnaOn ? 'mt-btn3' : 'mt-btn3 mt-btn3--ghost') + '" data-mk-take="' + x.it.sku + '">' + (x.r.ok || !st.dnaOn ? 'На доску · ' + esc(s.name) : 'Всё равно взять') + '</button>') +
        '</div>';
      }).join('') + '</div>' : '<p class="sw-empty">Ничего не нашли — сбрось фильтры.</p>');
  };
})();
