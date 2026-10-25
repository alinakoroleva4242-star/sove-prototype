/* Вкладка «Комнаты» (ТЗ Интерьера, 5; эталон etalon-I3).
   renderHotspots(render, slots, dna, {label, changed, price, extra}) — extra: пилюли предметов Маркета (зелёные, ведут в товар) — главный рендер 366×300: метка «КУХНЯ-ГОСТИНАЯ · ИЗ ТВОИХ МАТЕРИАЛОВ»,
   3 пилюли «Пол · паркет орех ⇄» (тап — та же шторка замены, data-swap), после замены — плашка «материал изменён · обновить рендер · 5 токенов».
   roomsGrid(rooms, {price, locked, redo}) — сетка 2 колонки по 150px: готовые с ✓ (тап — просмотр), не сгенерированные — пунктир «＋ Прихожая · рендер · 5 токенов»;
   locked — основы квартиры нет («нужен план квартиры»); redo — у типовых рендеров капсулы кнопка «на моём плане · 5 токенов». */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  /* пилюли на рендере: слот → место на картинке (доли), как на эталоне */
  var SPOTS = [['floor', 24, 78], ['apron', 62, 40], ['light', 80, 22]];
  var SHORT = { floor: 'Пол', floorTile: 'Плитка пола', walls: 'Стены', accentWall: 'Акцент', bathWalls: 'Плитка', apron: 'Фартук', doors: 'Двери', moldings: 'Плинтус', ceiling: 'Потолок', plumbing: 'Сантехника', light: 'Свет', hardware: 'Розетки' };
  UI.pillName = function (slot, it) { return SHORT[slot] + ' · ' + it.name.split(',')[0].toLowerCase(); };

  UI.renderHotspots = function (render, slots, dna, o) {
    o = o || {};
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc;
    var pills = SPOTS.map(function (p) {
      var e = slots[p[0]], it = e && KB.item(e.sku); if (!it) return '';
      return '<button type="button" class="rh-pill' + (e.ok === false ? ' is-bad' : '') + '" data-swap="' + p[0] + '" style="left:' + p[1] + '%;top:' + p[2] + '%"><i></i><span>' + esc(UI.pillName(p[0], it)) + '</span><b>⇄</b></button>';
    }).join('');
    return '<div class="rh"><img src="' + esc(render.img) + '" alt="' + esc(render.room) + '">' +
      '<span class="rh__lbl">' + esc(String(render.room).toUpperCase()) + ' · ' + (o.label || 'ИЗ ТВОИХ МАТЕРИАЛОВ') + '</span>' + pills + (o.extra || '') +
      (o.changed ? '<button type="button" class="rh__upd" data-rerender="' + esc(render.room) + '">материал изменён · обновить рендер · ' + UI.fmtTokens(o.price) + '</button>' : '') + '</div>';
  };

  UI.roomsGrid = function (rooms, o) {
    o = o || {};
    var esc = window.SOVE.fmt.esc;
    return '<div class="rg">' + rooms.map(function (r, i) {
      if (r.busy) return '<span class="rg__i rg__i--add rg__i--busy"><b>' + esc(r.room) + '</b><small>собираем рендер…</small></span>';
      if (r.img) return '<button type="button" class="rg__i" data-view="' + i + '" style="background-image:url(' + esc(r.img) + ')"><span><b>' + esc(r.room) + '</b><small>' + (r.example ? 'пример' : r.photo ? 'твоя картинка' : r.project ? 'из проекта' : r.basis === 'typical' ? '≈' : '✓') + '</small></span>' +
        (r.example && o.redo ? '<em class="rg__redo" data-render="' + esc(r.room) + '">на моём плане · ' + UI.fmtTokens(o.price) + '</em>' : '') + '</button>';
      return o.locked
        ? '<button type="button" class="rg__i rg__i--add rg__i--off" data-render="' + esc(r.room) + '"><b>＋ ' + esc(r.room) + '</b><small>нужен план квартиры</small></button>'
        : '<button type="button" class="rg__i rg__i--add" data-render="' + esc(r.room) + '"><b>＋ ' + esc(r.room) + '</b><small>рендер · ' + UI.fmtTokens(o.price) + '</small></button>';
    }).join('') + '</div>';
  };
})();
