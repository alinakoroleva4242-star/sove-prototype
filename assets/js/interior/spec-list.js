/* specList(slots, dna, {exact, area, levelName, room, perUnit, compact, title, quiet, planLink}) — «Материалы отделки · 12» (ТЗ v2, 5.6–5.7; эталон etalon-v2-V2).
   Группы: ПОЛ · СТЕНЫ И ПОТОЛОК · САНУЗЕЛ И КУХНЯ · ДВЕРИ, СВЕТ, ФУРНИТУРА. Строка: образец 46 px с номером · точка цвета ДНК ·
   «ПОЛ · ОРЕХ» · товар · метка «с фото» / «подобрал SOVE» · сумма · «›». Тап по строке — замена (data-swap).
   Внизу итог: «Итого · Премиум» · «примерно на 47 м² · уточнить по плану ›» · «≈ 682 600 ₽»; с планом — «точно по плану», без «≈».
   perUnit — доска на одну комнату без площади: в строках цена за единицу, суммы итога нет.
   UI.product — материал как товар Моего ремонта (♡ и 🛒 общие, repair.js): цена — за весь объём слота. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};

  UI.product = function (it) {
    var S = window.SOVE, svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="' + it.hex + '"/></svg>';
    var p = { id: it.pid, name: it.name + ' · ' + UI.qtyTxt(it), brand: '', metod: it.sum, retail: it.sum, img: 'data:image/svg+xml,' + encodeURIComponent(svg), category: 'Отделка', subcat: window.SOVE_KB.slot(it.slot).name };
    if (S.repair && S.repair.registerProduct) S.repair.registerProduct(p);
    return S.data.product(p.id) || p;
  };
  UI.qtyTxt = function (it) { return it.unit === 'компл.' ? 'комплект' : String(it.qty).replace('.', ',') + ' ' + it.unit; };
  UI.slotLabel = function (s, dna) { var c = window.SOVE_KB.dnaColor(dna, s.dna); return (s.name + ' · ' + (c ? c.name : '')).toUpperCase(); };
  var SRC = { capsule: ['от дизайнера', 'is-cap'], photo: ['с фото', 'is-photo'], sove: ['подобрал SOVE', ''], user: ['выбрал сам', ''] };
  /* свёрнутый список (ТЗ Интерьера, 4): четыре строки без групп и меток + «Ещё 8 ›» */
  var FEATURED = ['floor', 'walls', 'apron', 'plumbing'];

  UI.specList = function (slots, dna, o) {
    o = o || {};
    var KB = window.SOVE_KB, F = window.SOVE.fmt, esc = F.esc, ap = o.exact ? '' : '≈ ', compact = !!o.compact;
    function row(s) {
      var e = slots[s.key], it = e && KB.item(e.sku); if (!it) return '';
      var c = KB.dnaColor(dna, s.dna), src = SRC[e.source] || SRC.sove;
      return '<button type="button" class="sp-row' + (e.ok === false ? ' is-flag' : '') + (compact ? ' sp-row--c' : '') + '" data-swap="' + s.key + '" data-row="' + s.key + '">' +
        '<span class="sp-row__pic">' + UI.sampleTile(it, compact ? 44 : 46, compact ? 44 : 46, { thickness: 3, flag: e.ok === false }) + (compact ? '' : '<b class="sp-row__n">' + s.num + '</b>') + '</span>' +
        '<span class="sp-row__t"><span class="sp-row__l">' + (compact ? '' : '<i style="background:' + (c ? c.hex : '#ccc') + '"></i>') + '<small>' + esc(UI.slotLabel(s, dna)) + '</small></span>' +
          '<b>' + esc(it.name) + '</b>' +
          (compact && e.ok !== false ? '' : '<small class="sp-row__src ' + src[1] + '">' + src[0] + (e.ok === false ? ' <em>! ' + esc(e.reason) + '</em>' : '') + '</small>') + '</span>' +
        '<span class="sp-row__sum"><small>' + (o.perUnit ? UI.unitPrice(it) : F.rub(e.sum)) + '</small><span>›</span></span></button>';
    }
    var rows = compact
      ? FEATURED.map(function (k) { return row(KB.slot(k)); }).join('') + '<button type="button" class="sp-more" data-sp-more>Ещё ' + (KB.SLOTS.length - FEATURED.length) + ' ›</button>'
      : KB.GROUPS.map(function (g) { return '<small class="sp-g">' + esc(g.name.toUpperCase()) + '</small>' + KB.SLOTS.filter(function (s) { return s.group === g.key; }).map(row).join(''); }).join('');
    var sub = o.room ? 'одна комната · ' + esc(o.room) + (o.perUnit ? ' · цены за единицу' : '')
      : o.exact ? 'точно по плану · ' + String(o.area).replace('.', ',') + ' м²'
      : 'примерно на ' + String(o.area || KB.AREA).replace('.', ',') + ' м²' + (o.planLink ? ' · <span class="sp-tot__plan" data-plan>уточнить по плану ›</span>' : '');
    var total = o.quiet
      ? '<div class="sp-tot sp-tot--q"><small>материалы · ' + sub + '</small>' + (o.perUnit ? '' : '<b class="sp-tot__sum">' + ap + F.rub(KB.sum(slots)) + '</b>') + '</div>'
      : '<div class="sp-tot"><span><b>Итого · ' + esc(o.levelName || '') + '</b><small>' + sub + '</small></span>' + (o.perUnit ? '' : '<b class="sp-tot__sum">' + ap + F.rub(KB.sum(slots)) + '</b>') + '</div>';
    return '<section class="sp" aria-label="Материалы"><div class="sp__h"><b>' + esc(o.title || 'Материалы отделки') + ' · 12</b><small>нажми, чтобы заменить</small></div>' + rows + (o.quiet ? '' : total) + '</section>' + (o.quiet ? total : '');
  };

  /* zoneList(slots, dna, o) — список экрана B · Материалы (ТЗ Интерьера, 6.8–6.9; эталоны etalon-B1, etalon-B1one):
     «Материалы · <зона> · N» · строки: фото-образец 46px · «ПОЛ · ОРЕХ» · товар · «от дизайнера · во всех комнатах» · сумма зоны · ⇄;
     первые 4 + «Ещё N ›»; внизу «В бюджет · материалы» — «примерно на 47 м² · уточнить по плану ›» / «на N м² из плана» + сумма.
     o = { zones, zone, zoneName, where (показывать «где применён»), sumOf(key), total, more, hl, area, exact, perUnit } */
  var FIRST = ['floor', 'walls', 'apron', 'light'];
  UI.zoneList = function (slots, dna, o) {
    var KB = window.SOVE_KB, F = window.SOVE.fmt, esc = F.esc;
    var list = KB.slotsFor(o.zone === 'flat' ? o.zones : [o.zone]);
    list.sort(function (a, b) { var i = FIRST.indexOf(a.key), j = FIRST.indexOf(b.key); return (i < 0 ? 9 : i) - (j < 0 ? 9 : j); });
    var shown = o.more ? list : list.slice(0, 4);
    var rows = shown.map(function (s) {
      var e = slots[s.key], it = KB.item(e.sku), c = KB.dnaColor(dna, s.dna), src = SRC[e.source] || SRC.sove;
      return '<button type="button" class="zl-row' + (e.ok === false ? ' is-flag' : '') + (o.hl === s.key ? ' is-hl' : '') + '" data-swap="' + s.key + '" data-from="list" data-row="' + s.key + '">' +
        UI.sampleTile(it, 46, 46, { thickness: 3, flag: e.ok === false }) +
        '<span class="zl-row__t"><small>' + esc((s.name + ' · ' + (c ? c.name : '')).toUpperCase()) + '</small><b>' + esc(it.name) + '</b>' +
          '<small class="zl-row__src">' + src[0] + (o.where ? ' · <b>' + esc(KB.whereText(s, o.zones)) + '</b>' : '') + (e.ok === false ? ' · <em>! ' + esc(e.reason) + '</em>' : '') + '</small></span>' +
        '<small class="zl-row__sum">' + (o.perUnit ? UI.unitPrice(it) : F.rub(o.sumOf(s.key))) + '</small><span class="zl-row__x">⇄</span></button>';
    }).join('');
    var sub = o.exact ? 'на ' + String(o.area).replace('.', ',') + ' м² из плана' : 'примерно на ' + String(o.area).replace('.', ',') + ' м² · <span class="sp-tot__plan" data-plan>уточнить по плану ›</span>';
    return '<section class="zl"><div class="zl__h"><b>Материалы · ' + esc(o.zoneName) + ' · ' + list.length + '</b><small>нажми, чтобы заменить</small></div>' + rows +
      (list.length > 4 && !o.more ? '<button type="button" class="zl-more" data-sp-more>Ещё ' + (list.length - 4) + ' ›</button>' : '') +
      '<div class="zl-tot"><span><b>В бюджет · ' + (o.zone && o.zone !== 'flat' ? esc(o.zoneName) : 'материалы') + '</b><small>' + (o.perUnit ? 'цены за единицу · площадь комнаты — из плана' : sub) + '</small></span>' + (o.perUnit ? '' : '<b class="zl-tot__sum">≈ ' + F.rub(o.total) + '</b>') + '</div></section>';
  };
})();
