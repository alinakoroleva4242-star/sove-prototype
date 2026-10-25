/* dnaStrip(dna) — ДНК интерьера: 7 плашек в ряд (высота 30, radius 6) с подписями (ТЗ v2, 5.2; эталон etalon-v2-V2).
   dnaBar(dna) — тонкая полоса из 7 цветов (шторка первого экрана). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.dnaStrip = function (dna) {
    var esc = window.SOVE.fmt.esc;
    return '<div class="dna" role="list" aria-label="ДНК интерьера">' + dna.map(function (c) {
      return '<span role="listitem"><i style="background:' + c.hex + '"></i><small>' + esc(c.name) + '</small></span>';
    }).join('') + '</div>';
  };
  /* dnaCard(dna) — «ДНК интерьера · 7 цветов · 60 / 30 / 10»: 7 плиток 44px с тенью, под каждой имя и роль («стены · 60%») (эталон etalon-I2).
     Порядок — основа → второй цвет → акцент; доля — у первого цвета роли */
  UI.dnaCard = function (dna) {
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc, ORDER = { base: 0, second: 1, accent: 2 }, seen = {};
    var list = dna.slice().sort(function (a, b) { return (ORDER[a.role] || 0) - (ORDER[b.role] || 0); });
    return '<section class="dnac"><div class="dnac__h"><b>ДНК интерьера</b><small>7 цветов · 60 / 30 / 10</small></div><div class="dnac__row">' + list.map(function (c) {
      var k = KB.dnaKey ? KB.dnaKey(c) : c.key, role = (KB.DNA_ROLE_T && KB.DNA_ROLE_T[k]) || (KB.ROLE ? KB.ROLE[c.role] : ''), share = !seen[c.role] && KB.ROLE_SHARE ? ' · ' + KB.ROLE_SHARE[c.role] : ''; seen[c.role] = 1;
      return '<span><i style="background:' + c.hex + '"></i><b>' + esc(c.name) + '</b><small>' + esc(role + share) + '</small></span>';
    }).join('') + '</div></section>';
  };
  UI.dnaBar = function (dna) { return '<span class="dna-bar">' + dna.map(function (c) { return '<i style="background:' + c.hex + '"></i>'; }).join('') + '</span>'; };
})();
