/* dnaFan(dna) — веер выкрасок на фоне-штукатурке (ТЗ Материалов, 5.2): 7 белых карточек 64×150, цвет сверху 104 px,
   подпись «имя + роль», поворот −18°…+18° вокруг низа. Тап по карточке — 12 соседних оттенков (dnaShades). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  var esc = function (s) { return window.SOVE.fmt.esc(s); };

  UI.dnaFan = function (dna, o) {
    o = o || {};
    var KB = window.SOVE_KB, n = dna.length;
    return '<div class="dna-fan" role="list" aria-label="ДНК интерьера, 7 цветов">' + dna.map(function (c, i) {
      var rot = n > 1 ? -18 + 36 * i / (n - 1) : 0;
      return '<button type="button" class="dna-fan__c' + (o.picked === i ? ' is-on' : '') + '" role="listitem" data-dna="' + i + '" style="--rot:' + rot.toFixed(1) + 'deg;z-index:' + (i + 1) + '"' +
        ' aria-label="' + esc(c.name + ', ' + KB.ROLE[c.role] + ' — сменить оттенок') + '">' +
        '<i style="background:' + c.hex + '"></i><b>' + esc(c.name) + '</b><small>' + esc(KB.ROLE[c.role]) + '</small></button>';
    }).join('') + '</div>';
  };

  /* 12 соседних оттенков: светлее / темнее и чуть теплее / холоднее */
  function hsl(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function toHex(h, s, l) {
    var f = function (n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); var v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return ('0' + Math.round(v * 255).toString(16)).slice(-2); };
    return ('#' + f(0) + f(8) + f(4)).toUpperCase();
  }
  UI.dnaShades = function (hex) {
    var c = hsl(hex), out = [];
    [-.15, -.1, -.05, .05, .1, .15].forEach(function (dl) { out.push(toHex(c[0], c[1], Math.max(.04, Math.min(.96, c[2] + dl)))); });
    [-12, -6, 6, 12].forEach(function (dh) { out.push(toHex((c[0] + dh + 360) % 360, c[1], c[2])); });
    [-.12, .12].forEach(function (ds) { out.push(toHex(c[0], Math.max(0, Math.min(1, c[1] + ds)), c[2])); });
    return out;
  };
})();
