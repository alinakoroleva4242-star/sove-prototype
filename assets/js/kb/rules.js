/* База знаний, слой 2: правила сочетаний (design/interior/TZ-interior.md, раздел 9).
   kb.check(item, slot, ctx) → {ok, reason, tones} — первая сработавшая причина; ctx = {dna, slots: {slot: sku}}.
   kb.complete(dna, found, level) — доска из 12 слотов: основа подбора (невидимая капсула) → найденное на фото → правила.
   Порядок проверок: частное раньше общего — тон, металл, двери, дерево, санузел и в конце ΔE к цвету слота. */
(function () {
  var KB = window.SOVE_KB = window.SOVE_KB || {};

  /* ── цвет: hex → Lab, ΔE CIE76 ── */
  function rgb(hex) { var h = String(hex).replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); }
  function lab(hex) {
    var c = rgb(hex).map(function (v) { return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92; });
    var x = (c[0] * .4124 + c[1] * .3576 + c[2] * .1805) / .95047, y = c[0] * .2126 + c[1] * .7152 + c[2] * .0722, z = (c[0] * .0193 + c[1] * .1192 + c[2] * .9505) / 1.08883;
    var f = function (t) { return t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function deltaE(a, b) { var p = lab(a), q = lab(b); return Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2) + Math.pow(p[2] - q[2], 2)); }
  KB.lab = lab; KB.deltaE = deltaE;

  var WOOD = { wood: 1, herringbone: 1 };
  function current(ctx, slot) { var s = ctx && ctx.slots && ctx.slots[slot]; return s ? KB.item(s.sku || s) : null; }

  /* 6 правил; каждое возвращает причину или null */
  var RULES = [
    /* 2 · холодный тон при тёплой ДНК */
    function (it) { return KB.WARM && it.tone === 'cool' ? 'холодный тон' : null; },
    /* 4 · один металл на квартиру */
    function (it, slot, ctx) {
      if (!it.metal) return null;
      var other = ['plumbing', 'light', 'hardware'].filter(function (k) { return k !== slot; }).map(function (k) { return current(ctx, k); })
        .filter(function (x) { return x && x.metal && x.metal !== it.metal; })[0];
      return other ? 'спорит с ' + other.metal.replace(/ь$/, 'ью') : null;
    },
    /* 5 · контраст пол / двери: разный подтон дерева и краски спорит, близкая светлота сливается */
    function (it, slot, ctx) {
      if (slot !== 'floor' && slot !== 'doors') return null;
      var pair = current(ctx, slot === 'floor' ? 'doors' : 'floor'); if (!pair) return null;
      var who = slot === 'floor' ? 'с дверями' : 'с полом';
      if (it.undertone && pair.undertone && it.undertone !== 'neutral' && pair.undertone !== 'neutral' && it.undertone !== pair.undertone) return 'спорит ' + who;
      return Math.abs(lab(it.hex)[0] - lab(pair.hex)[0]) < 15 ? 'сливается ' + who : null;
    },
    /* 3 · не больше двух тонов дерева */
    function (it, slot, ctx) {
      if (!WOOD[it.texture]) return null;
      var tones = [it.hex];
      Object.keys((ctx && ctx.slots) || {}).forEach(function (k) {
        if (k === slot) return; var x = current(ctx, k);
        if (x && WOOD[x.texture] && tones.every(function (h) { return deltaE(h, x.hex) > 10; })) tones.push(x.hex);
      });
      return tones.length > 2 ? 'третий тон дерева' : null;
    },
    /* 6 · плитка санузла в тон основы или второго цвета */
    function (it, slot, ctx) {
      if (slot !== 'bathWalls') return null;
      var near = ((ctx && ctx.dna) || KB.DNA).filter(function (c) { return c.role !== 'accent'; }).some(function (c) { return deltaE(c.hex, it.hex) <= 15; });
      return near ? null : 'не в тон основы';
    },
    /* 1 · ΔE ≤ 12 к цвету слота */
    function (it, slot, ctx) {
      var s = KB.slot(slot), c = s && KB.dnaColor(ctx && ctx.dna, s.dna); if (!c) return null;
      if (deltaE(c.hex, it.hex) <= 12) return null;
      return lab(it.hex)[0] > lab(c.hex)[0] ? 'светлее ДНК' : 'темнее ДНК';
    }
  ];
  KB.check = function (item, slot, ctx) {
    var it = typeof item === 'string' ? KB.item(item) : item; if (!it) return { ok: false, reason: 'нет товара' };
    slot = slot || it.slot;
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i](it, slot, ctx);
      if (r) {
        var s = KB.slot(slot), c = s && KB.dnaColor(ctx && ctx.dna, s.dna);
        var tones = /светлее|темнее/.test(r) && c ? Math.max(1, Math.round(Math.abs(lab(it.hex)[0] - lab(c.hex)[0]) / 20)) : 0;
        return { ok: false, reason: r, tones: tones };
      }
    }
    return { ok: true, reason: null };
  };

  /* ближайшая капсула — основа подбора (ТЗ Интерьера, раздел 9): минимальная сумма ΔE между 7 цветами ДНК.
     Капсулы — kb/capsules.js; нет их — одна оцифрованная основа «Изумрудная неоклассика» (k2) */
  KB.nearestCapsule = function (dna) {
    var caps = KB.CAPSULES || []; if (!caps.length || !dna) return { id: 'k2', similarity: .86 };
    var best = null;
    caps.forEach(function (c) {
      var d = 0; dna.forEach(function (x) { d += Math.min.apply(null, c.dna.map(function (y) { return deltaE(x.hex, y.hex); })); });
      if (!best || d < best.d) best = { id: c.id, d: d };
    });
    return { id: best.id, similarity: Math.max(0, Math.round((1 - best.d / 300) * 100) / 100) };
  };
  /* артикул слота у капсулы на уровне; нет своего — общий из каталога */
  KB.capsuleSku = function (capId, slot, level) {
    var c = KB.capsule ? KB.capsule(capId) : null, o = c && c.slots[slot];
    return (o && o[level]) || KB.mainFor(slot, level).sku;
  };

  /* доска: slots = {slot: {sku, level, qty, unit, price, sum, dnaRef, source, confidence, ok, reason}}
     Своя картинка: ближайшая капсула → её слоты → найденные на фото (source 'photo') → остальные 'sove' → правила */
  KB.complete = function (dna, found, level) {
    var near = KB.nearestCapsule(dna), slots = {};
    KB.SLOTS.forEach(function (s) {
      var f = found && found[s.key], it = KB.item(KB.capsuleSku(near.id, s.key, level));
      slots[s.key] = KB.slotEntry(it, f ? 'photo' : 'sove', f ? f.confidence : null);
    });
    KB.recheck(slots, dna);
    return slots;
  };
  /* капсула SOVE целиком: 12 материалов дизайнера, source 'capsule', проверено дизайнером — правила не гоняем */
  KB.fromCapsule = function (capId, level) {
    var slots = {};
    KB.SLOTS.forEach(function (s) { slots[s.key] = KB.slotEntry(KB.item(KB.capsuleSku(capId, s.key, level)), 'capsule', null); });
    return slots;
  };
  KB.slotEntry = function (it, source, confidence) {
    return { sku: it.sku, level: it.level, qty: it.qty, unit: it.unit, price: it.price, sum: it.sum, dnaRef: KB.slot(it.slot).dna,
      source: source || 'sove', confidence: confidence || null, ok: true, reason: null };
  };
  /* пересчитать ✓ / ! у всех слотов (после замены одного меняется контекст соседей) */
  KB.recheck = function (slots, dna) {
    var ctx = { dna: dna, slots: slots };
    Object.keys(slots).forEach(function (k) { var r = KB.check(slots[k].sku, k, ctx); slots[k].ok = r.ok; slots[k].reason = r.reason; });
    return slots;
  };
  KB.sum = function (slots) { return Object.keys(slots || {}).reduce(function (a, k) { return a + (slots[k].sum || 0); }, 0); };
  /* уровень доски: все База / все Премиум / смешано → «Своё» */
  KB.levelOf = function (slots) {
    var ls = Object.keys(slots || {}).map(function (k) { return slots[k].level; });
    return ls.every(function (l) { return l === 'base'; }) ? 'base' : ls.every(function (l) { return l === 'premium'; }) ? 'premium' : 'mixed';
  };
  /* суммы уровней для переключателя: вся доска на База / на Премиум */
  KB.levelSum = function (level) { return KB.SLOTS.reduce(function (a, s) { return a + KB.mainFor(s.key, level).sum; }, 0); };
})();
