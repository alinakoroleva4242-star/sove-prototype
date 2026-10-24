/* Бюджет «ремонт под ключ» — общая логика для всех блоков (ТЗ-planirovka, раздел 12).
   11 строк; Планировка считает их из плана, состояния квартиры и расстановки, следующие блоки
   заменяют строки (а не прибавляют). Нормы — assets/js/budget-norms.js. Нет нормы ('[норма]') —
   значение строки null, на экране «[сумма] ₽»; итог тогда тоже неизвестен (total: null).
   window.SOVE_BUDGET.compute(input) → { lines: [{key, t, source, value, accuracy}], total, accuracy, type } */
(function () {
  var NORMS = window.SOVE_BUDGET_NORMS || { base: {}, premium: {} };
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function mul() { var r = 1; for (var i = 0; i < arguments.length; i++) { var v = num(arguments[i]); if (v === null) return null; r *= v; } return r; }
  function add() { var r = 0; for (var i = 0; i < arguments.length; i++) { var v = num(arguments[i]); if (v === null) return null; r += v; } return r; }

  /* площади из рамок плана: пол — по комнатам, стены — периметр × потолок, плитка — санузлы целиком */
  function areas(geo, rooms) {
    var floor = (rooms || []).reduce(function (a, r) { return a + (r.m2 || 0); }, 0), walls = 0, tile = 0, baths = 0, n = 0;
    var h = NORMS.ceiling_m || 2.7, ppm = geo && geo.px_per_m;
    ((geo && geo.rooms) || []).filter(function (r) { return !r.part_of; }).forEach(function (r) {
      var w = (r.box[2] - r.box[0]) / ppm, d = (r.box[3] - r.box[1]) / ppm, per = 2 * (w + d) * h;
      walls += per;
      if (/сан|ванн/i.test(r.type || r.name)) { tile += per + w * d; baths++; } else if (!/прих|балкон|лодж/i.test(r.type || r.name)) n++;
    });
    if (!ppm) { baths = (rooms || []).filter(function (r) { return /сан|ванн/i.test(r.name); }).length || 1; n = (rooms || []).filter(function (r) { return !/сан|ванн|прих|балкон/i.test(r.name); }).length; walls = floor * 2.6; tile = 0; }
    return { floor: floor, walls: walls, tile: tile, baths: Math.max(1, baths), rooms: n };
  }
  /* длина перегородок плана (стен нет): внутренние стены = (сумма периметров комнат − внешний контур) / 2 */
  function innerWalls(geo) {
    if (!geo || !geo.px_per_m) return 0;
    var rs = geo.rooms.filter(function (r) { return !r.part_of; }), ppm = geo.px_per_m, sum = 0;
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    rs.forEach(function (r) { var b = r.box; sum += 2 * ((b[2] - b[0]) + (b[3] - b[1])); x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); });
    return Math.max(0, (sum - 2 * ((x2 - x1) + (y2 - y1))) / 2 / ppm);
  }
  function partitionsLen(parts, ppm) {
    return (parts || []).reduce(function (a, b) { return a + Math.max(b[2] - b[0], b[3] - b[1]) / ppm; }, 0);
  }

  /* ── гибрид (ТЗ Планировки, 17.2): полный бюджет считает движок Скаута (SOVE.scout.estimate),
     а здесь его итог раскладывается на 11 строк. Работы — по этапам Скаута, комплектация — по долям Скаута;
     мебель — поштучно из расстановки (правило «значение строки = выбранные товары»). ── */
  function fromScout(o) {
    var S = window.SOVE, sp = o.scout, e = S.scout.estimate(sp), st = o.state || 'concrete_walls';
    var W = {}, K = {}; e.stages.forEach(function (x) { W[x[0]] = x[1]; }); e.kit.forEach(function (x) { K[x[0]] = x[1]; });
    var walls = W['Стены и перегородки'] || 0, demo = W['Демонтаж'] || 0, plen = o.partitions && o.partitions.length ? 1 : st === 'concrete_free' ? 1 : 0;
    var finishKit = K['Отделка'] || 0, acc = o.accuracy || 'примерно', byInt = o.interior ? 'по интерьеру' : 'по Скауту';
    var lines = [];
    function line(key, t, source, value, accuracy) { lines.push({ key: key, t: t, source: source, value: Math.round(value), accuracy: accuracy || acc }); }
    if (st === 'finished') line('demolition', 'Демонтаж и вывоз', 'по Скауту', demo);
    line('rough_works', 'Черновые работы', 'по Скауту', (st === 'finished' ? 0 : demo) + walls * (plen ? .5 : 1) + (W['Водоснабжение и канализация'] || 0) + (W['Электрика, свет, двери'] || 0));
    if (plen) line('partitions', 'Перегородки', o.partitions && o.partitions.length ? 'по варианту стен' : 'по плану', walls * .5 + (K['Двери и перегородки'] || 0));
    line('rough_mat', 'Черновые материалы', 'по Скауту', finishKit * .4 + (plen ? 0 : (K['Двери и перегородки'] || 0)));
    line('finish_works', 'Чистовые работы', 'по Скауту', (W['Полы'] || 0) + (W['Потолки'] || 0) + (W['Финальная сдача'] || 0));
    line('finish_mat', 'Чистовые материалы', byInt, finishKit * .6);
    line('plumbing', 'Сантехника', byInt, K['Сантехника'] || 0);
    line('electric', 'Свет и электрика', byInt, (K['Освещение'] || 0) + (K['Выключатели и розетки'] || 0));
    line('kitchen', 'Кухня и техника', 'по длине гарнитура', K['Техника'] || 0);
    var furn = typeof o.furniture === 'number' ? o.furniture : (K['Мебель покупная'] || 0) + (K['Мебель на заказ'] || 0);
    line('furniture', 'Мебель', 'по расстановке', furn, o.interior ? 'точнее' : 'примерно');
    line('decor', 'Декор и текстиль', '% от мебели', K['Текстиль и декор'] || 0);
    var total = lines.reduce(function (a, l) { return a + l.value; }, 0);
    return { lines: lines, total: total, accuracy: acc, type: sp.level === 'premium' ? 'premium' : 'base', scout: sp, perM2: e.area ? total / e.area : null };
  }

  /* input: { geo, rooms, state, type, interior, kitchenLen, furniture, partitions (варианта стен), accuracy, scout? } */
  function compute(o) {
    if (o.scout && window.SOVE && window.SOVE.scout && window.SOVE.scout.estimate) return fromScout(o);
    var type = o.type === 'premium' ? 'premium' : 'base', N = NORMS[type] || {}, st = o.state || 'concrete_walls';
    var A = areas(o.geo, o.rooms), surf = A.floor + A.walls, acc = o.accuracy || 'примерно';
    var byInt = o.interior ? 'по интерьеру' : 'по плану';
    var lines = [];
    function line(key, t, source, value, accuracy) { lines.push({ key: key, t: t, source: source, value: value, accuracy: accuracy || acc }); }
    if (st === 'finished') line('demolition', 'Демонтаж и вывоз', 'по плану', mul(A.floor, N.demolition_m2));
    line('rough_works', 'Черновые работы', 'по плану', mul(surf, (N.rough_works_m2 || {})[st]));
    var plen = o.partitions && o.partitions.length ? partitionsLen(o.partitions, o.geo.px_per_m) : st === 'concrete_free' ? innerWalls(o.geo) : 0;
    if (plen > 0) line('partitions', 'Перегородки', o.partitions && o.partitions.length ? 'по варианту стен' : 'по плану', mul(plen, N.partitions_m));
    line('rough_mat', 'Черновые материалы', 'по плану', mul(surf, (N.rough_mat_m2 || {})[st]));
    line('finish_works', 'Чистовые работы', 'по плану', add(mul(surf, N.finish_works_m2), mul(A.tile, N.finish_tile_m2)));
    line('finish_mat', 'Чистовые материалы', byInt, mul(surf, N.finish_mat_m2));
    line('plumbing', 'Сантехника', byInt, add(mul(A.baths, N.plumbing_bath), num(N.plumbing_kitchen)));
    line('electric', 'Свет и электрика', byInt, add(mul(A.floor, N.electric_m2), mul(A.rooms, N.electric_room)));
    line('kitchen', 'Кухня и техника', 'по длине гарнитура', mul(o.kitchenLen || 0, N.kitchen_m));
    line('furniture', 'Мебель', 'по расстановке', num(o.furniture), o.interior ? 'точнее' : 'примерно');
    line('decor', 'Декор и текстиль', '% от мебели', num(N.decor_pct) === null || num(o.furniture) === null ? null : o.furniture * N.decor_pct / 100);
    var total = lines.reduce(function (a, l) { return a === null || l.value === null ? null : a + l.value; }, 0);
    return { lines: lines, total: total, accuracy: acc, type: type };
  }

  window.SOVE_BUDGET = { compute: compute, areas: areas, fromScout: fromScout };
})();
