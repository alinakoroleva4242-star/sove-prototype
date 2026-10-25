/* Экран B · Материалы: зоны, ДНК, лента капсул (ТЗ Интерьера, 4 и 6; эталоны etalon-A0, etalon-B1).
   zoneChips(zones, active, {todo, stale}) — главный переключатель B «ЧТО СМОТРЮ» (ТЗ chips-budget, 1): «Вся квартира · 12 материалов», затем зоны плана с числом материалов;
     не проработанные (todo — доска собрана не на них) — пунктиром «＋ Санузел»; устаревший рендер — точка.
   dnaRow(dna) — 7 плиток 40px с подписями, порядок как на эталоне: орех, изумруд, олива, латунь, молочный, тауп, графит.
   capsuleStrip(caps) — лента карточек 120×150 (обложка, полоса ДНК, название, «12 материалов · 5 комнат»). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};

  UI.zoneChips = function (zones, active, o) {
    o = o || {};
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc;
    var chip = function (key, name, n) {
      var on = active === key, todo = (o.todo || []).indexOf(key) >= 0, stale = (o.stale || []).indexOf(key) >= 0;
      return '<button type="button" class="zc' + (on ? ' is-on' : '') + (todo ? ' zc--add' : '') + '" data-zone="' + key + '" aria-pressed="' + on + '">' + (todo ? '＋ ' : '') + esc(name) +
        '<small>' + n + (key === 'flat' ? ' ' + UI.matWord(n) : '') + '</small>' + (stale ? '<i class="zc__dot" aria-label="рендер устарел"></i>' : '') + '</button>';
    };
    return '<div class="zcs" role="group" aria-label="Что смотрю"><small class="zcs__l">ЧТО СМОТРЮ</small><div class="zcs__row">' + chip('flat', 'Вся квартира', KB.slotsFor(zones.filter(function (z) { return (o.todo || []).indexOf(z) < 0; })).length) +
      zones.map(function (z) { return chip(z, KB.zone(z).name, KB.slotsFor([z]).length); }).join('') + '</div></div>';
  };
  UI.matWord = function (n) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? 'материалов' : k === 1 ? 'материал' : k >= 2 && k <= 4 ? 'материала' : 'материалов'; };

  var ORDER = ['walnut', 'emerald', 'olive', 'brass', 'milk', 'taupe', 'graphite'];
  UI.dnaRow = function (dna) {
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc;
    var list = dna.slice().sort(function (a, b) { return ORDER.indexOf(KB.dnaKey(a)) - ORDER.indexOf(KB.dnaKey(b)); });
    return '<div class="dnar" role="list" aria-label="ДНК интерьера">' + list.map(function (c) {
      return '<span role="listitem"><i style="background:' + c.hex + '"></i><b>' + esc(c.name) + '</b></span>';
    }).join('') + '</div>';
  };

  UI.capsuleStrip = function (caps, o) {
    o = o || {};
    var esc = window.SOVE.fmt.esc;
    return '<div class="cc-strip cc-strip--s">' + caps.map(function (c) {
      return '<button type="button" class="cc" data-capsule="' + c.id + '"' + (o.current === c.id ? ' aria-current="true"' : '') + ' aria-label="Капсула ' + esc(c.name) + '">' +
        '<span class="cc__pic" style="background-image:url(' + c.cover + ')"></span>' +
        '<span class="cc__dna">' + c.dna.map(function (x) { return '<i style="background:' + x.hex + '"></i>'; }).join('') + '</span>' +
        '<span class="cc__t"><b>' + esc(c.name) + '</b><small>12 материалов · ' + c.rooms.length + ' ' + UI.roomsWord(c.rooms.length) + '</small></span></button>';
    }).join('') + '</div>';
  };
})();
