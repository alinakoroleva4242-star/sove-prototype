/* analyzeInterior(image) — разбор интерьера (методология, раздел 5; ТЗ Материалов, раздел 15.5). Бесплатно, 2–3 с.
   Заглушка прототипа: палитра — k-means по пикселям на canvas (настоящая, по картинке человека);
   стиль, уровень и найденные материалы — mock-ответ (в бою — модель распознавания на сервере).
   ДНК: 7 цветов примера подтягиваются к ближайшим цветам картинки, но не дальше ΔE 8 — чтобы слоты
   и правила (rules.js) работали на mock-материалах. Ошибка — картинка без интерьера (почти один цвет). */
(function () {
  var KB = window.SOVE_KB = window.SOVE_KB || {};

  /* найдено на картинке: 7 из 12, уверенность (раздел 5.2) */
  var FOUND = { floor: .96, walls: .93, apron: .91, accentWall: .88, plumbing: .84, floorTile: .78, bathWalls: .74 };

  function hex(c) { return '#' + c.map(function (v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? '0' + s : s; }).join('').toUpperCase(); }
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }

  function pixels(img) {
    var c = document.createElement('canvas'), k = Math.min(1, 96 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
    var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    var d = x.getImageData(0, 0, c.width, c.height).data, out = [];
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 200) out.push([d[i], d[i + 1], d[i + 2]]);
    return out;
  }
  /* k-means, k = 7, старт — равномерно по светлоте */
  function kmeans(px, k) {
    var sorted = px.slice().sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
    var cen = []; for (var i = 0; i < k; i++) cen.push(sorted[Math.floor((i + .5) / k * sorted.length)].slice());
    var cnt = [];
    for (var it = 0; it < 10; it++) {
      var acc = cen.map(function () { return [0, 0, 0]; }); cnt = cen.map(function () { return 0; });
      px.forEach(function (p) {
        var best = 0, bd = 1e9;
        cen.forEach(function (c, j) { var d = (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]) + (p[2] - c[2]) * (p[2] - c[2]); if (d < bd) { bd = d; best = j; } });
        acc[best][0] += p[0]; acc[best][1] += p[1]; acc[best][2] += p[2]; cnt[best]++;
      });
      cen = cen.map(function (c, j) { return cnt[j] ? acc[j].map(function (v) { return v / cnt[j]; }) : c; });
    }
    return cen.map(function (c, j) { return { hex: hex(c), share: cnt[j] / px.length }; }).sort(function (a, b) { return b.share - a.share; });
  }
  /* цвет ДНК примера, подтянутый к ближайшему цвету картинки (не дальше ΔE 8) */
  function nudge(base, palette) {
    var near = palette.slice().sort(function (a, b) { return KB.deltaE(base, a.hex) - KB.deltaE(base, b.hex); })[0];
    if (!near) return base;
    var a = rgb(base), b = rgb(near.hex), t = .5, out = base;
    while (t > .02) { out = hex(a.map(function (v, i) { return v + (b[i] - v) * t; })); if (KB.deltaE(base, out) <= 8) break; t /= 2; }
    return t > .02 ? out : base;
  }

  KB.analyzeInterior = function (src) {
    var t0 = Date.now();
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () {
        var px; try { px = pixels(img); } catch (e) { return no(new Error('read')); }
        if (px.length < 50) return no(new Error('empty'));
        var palette = kmeans(px, 7);
        /* почти один цвет — это не интерьер */
        var spread = palette.reduce(function (m, c) { return Math.max(m, KB.deltaE(palette[0].hex, c.hex)); }, 0);
        if (spread < 18) return no(new Error('flat'));
        var dna = KB.DNA.map(function (c) { return Object.assign({}, c, { hex: nudge(c.hex, palette) }); });
        var found = {}; Object.keys(FOUND).forEach(function (k) { found[k] = { confidence: FOUND[k] }; });
        /* «3 сек» — разбор не мгновенный, как в бою */
        setTimeout(function () { ok({ dna: dna, palette: palette, style: KB.STYLE, level: 'premium', found: found, ms: Date.now() - t0 }); }, Math.max(0, 2600 - (Date.now() - t0)));
      };
      img.onerror = function () { no(new Error('load')); };
      img.src = src;
    });
  };
  KB.FOUND = FOUND;
  /* комната на картинке — сразу при загрузке, для окна «Для чего собираем?» (mock; в бою — тот же вызов распознавания) */
  KB.guessRoom = function () { return 'кухня-гостиная'; };
})();
