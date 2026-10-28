/* Замена мебели по размеру на настоящих товарах каталога («Планировка» → расстановка).
   Данные — assets/js/arrange-sizes.js (tools/gen_arrange_sizes.py): ширина разобрана из названий
   и описаний товаров каталога SOVEAPP. Экран расстановки спрашивает здесь:
   • analogs(label, maxW, capsuleId) — что поставить вместо предмета: сначала товары выбранной
     капсулы, потом товары, которые встают на это место (самые широкие из влезающих), и один-два
     шире места — чтобы было видно, где граница;
   • capsulePick(label, capsuleId, placeW) — какой товар капсулы поставить на место такой ширины. */
(function () {
  var SZ = window.SOVE_SIZED; if (!SZ || !SZ.kinds) return;
  var EPS = 1e-9, TOL = 0.05;                 /* 5 см — шаг перетаскивания на плане */

  /* предмет на плане → вид товара. Встроенное и кухню не подбираем: это делается на заказ */
  var RULES = [
    [/прикроват/, 'прикроватная тумба'], [/кроват/, 'кровать'], [/гардероб|платян|шкаф/, 'гардероб'],
    [/рабоч|письмен|компьютер/, 'рабочее место'], [/обеден/, 'обеденный стол'], [/журнальн/, 'журнальный столик'],
    [/диван/, 'диван'], [/кресл/, 'кресло'], [/пуф/, 'пуф'], [/комод/, 'комод'], [/стул/, 'стул'],
    [/(^|\s)тв($|\s)|тумба.*тв|тв.*тумба|телевиз/, 'тумба под тв'], [/стеллаж/, 'стеллаж'],
    [/^ванна|(^|\s)ванна($|\s)/, 'ванна'], [/унитаз/, 'унитаз'], [/раковин/, 'раковина'],
    [/торшер/, 'торшер'], [/люстр/, 'люстра'], [/(^|\s)бра($|\s)/, 'бра']
  ];
  function kindOf(label) {
    var l = String(label || '').toLowerCase().replace(/ё/g, 'е');
    if (/встро|кухн|модул|мойк|варочн|духов|холодил|посудомо|стирк|сушк|полотенц|душ/.test(l)) return null;
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(l)) return SZ.kinds[RULES[i][1]] ? RULES[i][1] : null;
    return null;
  }
  function capCode(id) {
    var D = window.SOVE && window.SOVE.data, c = D && D.capsule ? D.capsule(id) : null;
    return (c && c.code) || String(id || '').replace(/^k/i, 'К');
  }
  function asProduct(p, kind, fromCapsule) {
    var q = { id: p.id, name: p.name, brand: p.brand, img: p.img, metod: p.metod, retail: p.retail, w: p.w, d: p.d,
              subcat: SZ.kinds[kind].subcat, category: 'Мебель', sized: true };
    if (fromCapsule) { q.fromCapsule = true; q.brand = (p.brand ? p.brand + ' · ' : '') + 'из капсулы'; }
    return q;
  }
  function row(p, kind, maxW, fromCapsule) {
    var w = p.w == null ? null : p.w;
    return { p: asProduct(p, kind, fromCapsule), w: w, ok: w === null ? null : w <= maxW + EPS };
  }
  function capsuleItems(capsuleId, kind) {
    if (!capsuleId) return [];
    return ((SZ.capsules || {})[capCode(capsuleId)] || {})[kind] || [];
  }

  function analogs(label, maxW, capsuleId) {
    var kind = kindOf(label); if (!kind) return null;
    var all = SZ.kinds[kind].items || [];
    var own = capsuleItems(capsuleId, kind).map(function (p) { return row(p, kind, maxW, true); })
      .sort(function (a, b) { return (a.ok === b.ok ? 0 : a.ok === true ? -1 : b.ok === true ? 1 : a.ok === null ? -1 : 1) || ((b.w || 0) - (a.w || 0)); });
    var fit = all.filter(function (p) { return p.w <= maxW + EPS; })
      .sort(function (a, b) { return (b.w - a.w) || (a.metod - b.metod); }).slice(0, 4)
      .map(function (p) { return row(p, kind, maxW, false); });
    var wide = all.filter(function (p) { return p.w > maxW + EPS; })
      .sort(function (a, b) { return a.w - b.w; }).slice(0, fit.length ? 1 : 2)
      .map(function (p) { return row(p, kind, maxW, false); });
    return own.slice(0, 3).concat(fit, wide);
  }

  /* товар капсулы под место: самый широкий из влезающих; не знаем размер — первый без размера;
     все шире — самый узкий из них (экран замены покажет, что он не встаёт) */
  function capsulePick(label, capsuleId, placeW) {
    var kind = kindOf(label); if (!kind) return null;
    var own = capsuleItems(capsuleId, kind); if (!own.length) return null;
    var limit = placeW == null ? Infinity : placeW + TOL;
    var fit = own.filter(function (p) { return p.w != null && p.w <= limit; }).sort(function (a, b) { return b.w - a.w; });
    if (fit.length) return asProduct(fit[0], kind, true);
    var unknown = own.filter(function (p) { return p.w == null; });
    if (unknown.length) return asProduct(unknown[0], kind, true);
    var wider = own.slice().sort(function (a, b) { return a.w - b.w; });
    return asProduct(wider[0], kind, true);
  }

  window.SOVE_PLAN_SIZES = { kindOf: kindOf, analogs: analogs, capsulePick: capsulePick, built: SZ.built };
})();
