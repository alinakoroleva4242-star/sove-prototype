/* Шторки блока «Интерьер», которых нет на эталонах (ТЗ Интерьера, 8) — по описанию, на проверку Алине.
   renderSwapSheet(slot, o) — шторка 2 на рендере (эталон etalon-swap-render): «Пол на рендере», «цвет ДНК — орех · после замены рендер обновится · 5 токенов»,
     три фото-карточки уровня материала, «меняется и на доске, и в бюджете» + «Все варианты ›», ракурсы, «Готово → Мой ремонт».
   objectSwapSheet(kind, o) — шторка 3 «Замена предмета»: товары Маркета с фото, габариты из названия, «встанет в комнату» по месту в расстановке, цена METOD.
   changeInteriorSheet(o) — шторка 1 «Сменить интерьер»: лента капсул SOVE, «загрузить свой рендер», предупреждение «твои замены сбросятся», «Отмена». */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};

  UI.renderSwapSheet = function (slot, o) {
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc, s = KB.slot(slot), cur = o.slots[slot], it0 = KB.item(cur.sku), c = KB.dnaColor(o.dna, s.dna);
    var ctx = { dna: o.dna, slots: o.slots }, list = KB.itemsFor(slot).filter(function (it) { return it.level === it0.level; }).slice(0, 3);
    return '<div class="sw-head"><span><b class="sw-t">' + esc(s.name) + ' на рендере</b><span class="sw-sub">цвет ДНК — ' + esc(c ? c.name.toLowerCase() : '') + ' · после замены рендер обновится · ' + UI.fmtTokens(o.price) + '</span></span>' +
        '<button type="button" class="sw-x" data-sw-close aria-label="Закрыть">✕</button></div>' +
      '<div class="sw-row">' + list.map(function (it) {
        var on = cur.sku === it.sku, r = KB.check(it, slot, ctx);
        return '<button type="button" class="sw-card' + (on ? ' is-cur' : '') + '" data-pick="' + it.sku + '" aria-pressed="' + on + '">' + UI.sampleTile(it, 96, 74, { thickness: 4, radius: 6 }) +
          '<span class="sw-card__t">' + esc(it.name) + '</span><b>' + UI.unitPrice(it) + '</b><small class="' + (r.ok ? 'is-ok' : 'is-bad') + '">' + (r.ok ? '✓ сочетается' : '! ' + esc(r.reason)) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="sw-foot"><small>меняется и на доске, и в бюджете</small><button type="button" class="mt-a" data-sw-all>Все варианты ›</button></div>' +
      (o.angles > 1 ? UI.angleChips(o.angles, o.angle, {}) : '') +
      '<a class="mt-btn" href="my.html?v=center">Готово → Мой ремонт</a>';
  };

  /* габариты из названия товара: «175x242», «200×90» → [ширина, глубина] в см (числа больше 30 — сантиметры) */
  function dims(name) {
    var m = String(name).match(/(\d{2,3})\s*[xх×]\s*(\d{2,3})/i); if (!m) return null;
    var a = +m[1], b = +m[2]; return a >= 30 && b >= 30 ? [a, b] : null;
  }
  UI.objDims = dims;
  UI.objectSwapSheet = function (kind, o) {
    var F = window.SOVE.fmt, esc = F.esc, list = o.options || [];
    return '<div class="sw-head"><span><b class="sw-t">' + esc(kind) + '</b><span class="sw-sub">предмет из Маркета · меняет строку «Мебель» в бюджете' + (o.place ? ' · место ' + o.place[0] + '×' + o.place[1] + ' см' : '') + '</span></span>' +
        '<button type="button" class="sw-x" data-sw-close aria-label="Закрыть">✕</button></div>' +
      '<div class="os">' + list.map(function (p) {
        var on = o.current === p.id, d = dims(p.name), fit = '';
        if (d && o.place) { var over = Math.max(d[0], d[1]) - Math.max(o.place[0], o.place[1]); fit = over <= 5 ? '<small class="is-ok">✓ встанет в комнату</small>' : '<small class="is-bad">! шире места на ' + over + ' см</small>'; }
        else fit = '<small class="os__mute">размер — в карточке товара</small>';
        return '<button type="button" class="os__i' + (on ? ' is-cur' : '') + '" data-pick-obj="' + p.id + '" aria-pressed="' + on + '"><span class="os__pic" style="background-image:url(' + esc(p.img) + ')"></span>' +
          '<span class="os__t"><b>' + esc(p.name) + '</b><small>' + esc(p.brand || '') + (d ? ' · ' + d[0] + '×' + d[1] + ' см' : '') + '</small>' + fit + '</span>' +
          '<span class="os__p"><b>' + F.rub(p.metod) + '</b>' + (p.retail > p.metod ? '<s>' + F.rub(p.retail) + '</s>' : '') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="sw-foot"><small>замена · ' + UI.fmtTokens(o.price) + ' · рендер комнаты потом обновить</small><a class="mt-a" href="market.html?q=' + encodeURIComponent(kind.toLowerCase()) + '">Ещё в Маркете ›</a></div>';
  };

  UI.changeInteriorSheet = function (o) {
    var esc = window.SOVE.fmt.esc;
    return '<i class="ss-grip"></i><div class="sw-head"><span><b class="sw-t">Сменить интерьер</b><span class="sw-sub">другая капсула или свой рендер — пересоберём ДНК, 12 материалов и комнаты</span></span>' +
        '<button type="button" class="sw-x" data-sw-close aria-label="Закрыть">✕</button></div>' +
      (o.changes ? '<div class="ci-warn"><b>!</b> твои замены сбросятся · ' + o.changes + ' ' + (o.changes === 1 ? 'замена' : o.changes < 5 ? 'замены' : 'замен') + ' в «' + esc(o.current) + '»</div>' : '') +
      '<small class="bs-l">КАПСУЛЫ SOVEAPP · БЕСПЛАТНО</small>' + UI.capsuleStrip(o.caps, { current: o.currentId }) +
      '<label class="up up--line"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic" hidden data-up><span class="up__ic">⇪</span><span class="up__t"><b>Свой рендер, фото, Pinterest</b><small>разберём ДНК и соберём материалы · от ' + UI.fmtTokens(o.ownPrice) + '</small></span><span class="up__a">›</span></label>' +
      '<button type="button" class="mt-btn2" data-sw-close>Отмена</button>';
  };
})();
