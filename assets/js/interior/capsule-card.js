/* capsuleCard(c) — карточка капсулы SOVE в ленте входа (ТЗ Интерьера, 3; эталон etalon-I1): 160×200, фото 146, полоса ДНК 8px,
   название, «12 материалов · N комнат». Прямоугольная плитка radius 10, без арок, без кодов К1–К7.
   myCapsuleRow(it) — строка «МОИ КАПСУЛЫ»: превью 56×44, название, «12 материалов · N комнат · когда», «Открыть ›». */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.capsuleCard = function (c) {
    var esc = window.SOVE.fmt.esc;
    return '<button type="button" class="cc" data-capsule="' + c.id + '" aria-label="Капсула ' + esc(c.name) + '">' +
      '<span class="cc__pic" style="background-image:url(' + c.cover + ')"></span>' +
      '<span class="cc__dna">' + c.dna.map(function (x) { return '<i style="background:' + x.hex + '"></i>'; }).join('') + '</span>' +
      '<span class="cc__t"><b>' + esc(c.name) + '</b><small>12 материалов · ' + c.rooms.length + ' ' + UI.roomsWord(c.rooms.length) + '</small></span></button>';
  };
  UI.roomsWord = function (n) { var a = n % 100, b = n % 10; return a > 10 && a < 20 ? 'комнат' : b === 1 ? 'комната' : b >= 2 && b <= 4 ? 'комнаты' : 'комнат'; };
  UI.ago = function (ts) {
    var d = Math.floor((Date.now() - ts) / 864e5);
    return d <= 0 ? 'сегодня' : d === 1 ? 'вчера' : d < 7 ? d + ' дн. назад' : new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };
  UI.myCapsuleRow = function (it, href) {
    var esc = window.SOVE.fmt.esc, n = (it.renders || []).filter(function (r) { return r.img; }).length;
    return '<a class="mc-row" href="' + href + '">' + (it.imageUrl ? '<span class="mc-row__pic" style="background-image:url(' + esc(it.imageUrl) + ')"></span>' : '<span class="mc-row__pic mc-row__pic--dna">' + UI.dnaBar(it.dna) + '</span>') +
      '<span class="mc-row__t"><b>' + esc(it.name || it.style) + '</b><small>12 материалов · ' + n + ' ' + UI.roomsWord(n) + (it.ts ? ' · ' + UI.ago(it.ts) : '') + '</small></span><span class="mc-row__a">Открыть ›</span></a>';
  };
})();
