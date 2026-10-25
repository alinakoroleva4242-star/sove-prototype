/* Экран B · Комнаты (ТЗ Интерьера, 7 и 7.1; эталон etalon-B2).
   renderStage(r, o) — главный рендер 366×310: метка «КУХНЯ-ГОСТИНАЯ · РАКУРС 1 ИЗ 3», красные пилюли — материалы (data-swap → шторка 2),
     зелёные — предметы (data-object → шторка 3); устаревший рендер — плашка «! пол заменён на доске — рендер показывает старый · Обновить · 5 токенов».
   roomMaterials(slots, zone) — «Материалы этой комнаты · N · из общей ДНК»: все образцы зоны сеткой (тап → шторка замены).
   angleChips(n, cur, o) — «Ракурс 1 · 2 · 3 · ＋ ракурс · 5 токенов».
   roomCards(cards, o) — «Комнаты · N» на «Вся квартира» (эталон C1): рендер, имя, сумма материалов комнаты; без рендера — пунктир «＋ Прихожая · рендер · 5 токенов ·
     материалы уже есть · …»; не проработанные — «＋ Санузел · не проработана». Тап по любой = тап по чипу комнаты (data-room). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  /* где на кадре стоят пилюли материалов и предметов — по зоне (доли кадра) */
  var SPOTS = {
    kitchenLiving: { mat: [['floor', 24, 80], ['apron', 62, 40], ['light', 80, 22]], obj: [['Обеденный стол', 38, 58]] },
    bedroom:       { mat: [['floor', 24, 82], ['walls', 70, 32], ['light', 80, 16]], obj: [['Кровать', 46, 64]] },
    bathroom:      { mat: [['bathWalls', 28, 34], ['plumbing', 64, 56], ['floorTile', 40, 86]], obj: [['Раковина', 70, 74]] },
    hall:          { mat: [['floor', 30, 84], ['doors', 66, 44], ['light', 50, 14]], obj: [['Гардероб', 24, 50]] }
  };
  UI.ROOM_SPOTS = SPOTS;
  var SHORT = { floor: 'Пол', floorTile: 'Плитка пола', walls: 'Стены', accentWall: 'Акцент', bathWalls: 'Плитка', apron: 'Фартук', doors: 'Двери', moldings: 'Плинтус', ceiling: 'Потолок', plumbing: 'Сантехника', light: 'Свет', hardware: 'Розетки' };
  UI.slotShort = function (k) { return SHORT[k]; };

  UI.renderStage = function (r, o) {
    o = o || {};
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc, sp = SPOTS[r.zone] || SPOTS.kitchenLiving;
    var mats = sp.mat.map(function (p) {
      var e = o.slots[p[0]], it = e && KB.item(e.sku); if (!it) return '';
      var c = KB.dnaColor(o.dna, KB.slot(p[0]).dna), word = c ? c.name.toLowerCase() : it.name.split(',')[0].toLowerCase();   /* «Пол · орех» — цвет ДНК слота */
      return '<button type="button" class="rh-pill' + (e.ok === false ? ' is-bad' : '') + (o.sel === p[0] ? ' is-sel' : '') + '" data-swap="' + p[0] + '" data-from="render" style="left:' + p[1] + '%;top:' + p[2] + '%"><i></i><span>' + esc(SHORT[p[0]] + ' · ' + word) + '</span><b>⇄</b></button>';
    }).join('');
    var objs = (o.objects || []).map(function (x, i) {
      var p = sp.obj[i]; if (!p || !x) return '';
      return '<button type="button" class="rh-pill is-item' + (o.sel === 'obj:' + x.kind ? ' is-sel' : '') + '" data-object="' + esc(x.kind) + '" style="left:' + p[1] + '%;top:' + p[2] + '%"><i></i><span>' + esc(x.short) + '</span><b>⇄</b></button>';
    }).join('');
    var stale = o.staleText ? '<span class="rh__stale"><span><b>!</b> ' + esc(o.staleText) + ' — рендер показывает старый</span><button type="button" data-rerender="' + r.zone + '">Обновить · ' + UI.fmtTokens(o.price) + '</button></span>' : '';
    return '<div class="rh rh--b"><img src="' + esc(r.img) + '" alt="' + esc(r.room) + '">' +
      '<span class="rh__lbl">' + esc(String(r.room).toUpperCase()) + ' · ' + (o.label || ('РАКУРС ' + (o.angle + 1) + ' ИЗ ' + o.angles)) + '</span>' + mats + objs + stale + '</div>';
  };

  UI.roomMaterials = function (slots, zone) {
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc, list = KB.slotsFor([zone]);
    list.sort(function (a, b) { return (KB.item(slots[b.key].sku).photo ? 1 : 0) - (KB.item(slots[a.key].sku).photo ? 1 : 0); });
    return '<div class="rmat"><div class="rmat__h"><b>Материалы этой комнаты · ' + list.length + '</b><small class="rmat__s">из общей ДНК</small></div>' +
      '<div class="rmat__row">' + list.map(function (s) {
        var e = slots[s.key], it = KB.item(e.sku);
        return '<button type="button" class="rmat__i' + (e.ok === false ? ' is-bad' : '') + '" data-swap="' + s.key + '" data-from="strip"><span style="background:' + UI.tileBg(it, 66, 54) + '"></span><small>' + esc(SHORT[s.key]) + '</small></button>';
      }).join('') + '</div></div>';
  };

  UI.angleChips = function (n, cur, o) {
    o = o || {};
    var b = '';
    for (var i = 0; i < n; i++) b += '<button type="button" class="ac' + (i === cur ? ' is-on' : '') + '" data-angle="' + i + '" aria-pressed="' + (i === cur) + '">Ракурс ' + (i + 1) + '</button>';
    return '<div class="acs">' + b + (o.canAdd ? '<button type="button" class="ac" data-angle-add>＋ ракурс · ' + UI.fmtTokens(o.price) + '</button>' : '') + '</div>';
  };

  UI.roomCards = function (cards, o) {
    o = o || {};
    var esc = window.SOVE.fmt.esc, F = window.SOVE.fmt;
    return '<div class="rcs">' + cards.map(function (c) {
      var sum = c.sum ? F.rub(c.sum) : '';
      if (c.busy) return '<span class="rc rc--add rc--busy"><b>' + esc(c.room) + '</b><small>собираем рендер…</small></span>';
      if (c.todo) return '<button type="button" class="rc rc--add rc--todo" data-room="' + c.zone + '"><b>＋ ' + esc(c.room) + '</b><small>не проработана</small>' + (sum ? '<small>материалы уже есть · ' + sum + '</small>' : '') + '</button>';
      if (!c.img) return '<button type="button" class="rc rc--add" data-room="' + c.zone + '"><b>＋ ' + esc(c.room) + '</b><small>рендер · ' + UI.fmtTokens(o.price) + '</small>' + (sum ? '<small>материалы уже есть · ' + sum + '</small>' : '') + '</button>';
      return '<button type="button" class="rc" data-room="' + c.zone + '" style="background-image:url(' + esc(c.img) + ')"><span class="rc__n"><b>' + esc(c.room) + '</b>' + (sum ? '<small>' + sum + '</small>' : '') + '</span>' +
        (c.stale ? '<span class="rc__b is-bad">! обновить</span>' : c.example ? '<span class="rc__b">пример капсулы</span>' : '') + '</button>';
    }).join('') + '</div>';
  };
})();
