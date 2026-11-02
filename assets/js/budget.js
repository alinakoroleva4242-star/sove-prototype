/* Бюджет «ремонт под ключ» — общая логика для всех блоков (ТЗ-planirovka, раздел 12).
   11 строк; Планировка считает их из плана, состояния квартиры и расстановки, следующие блоки
   заменяют строки (а не прибавляют). Нормы — assets/js/budget-norms.js. Нет нормы ('[норма]') —
   значение строки null, на экране «[сумма] ₽»; итог тогда тоже неизвестен (total: null).
   window.SOVE_BUDGET.compute(input) → { lines: [{key, t, source, value, accuracy}], total, accuracy, type, kit[9], works[5], roughMat }
   Экран бюджета (design/budget/TZ-budget.md) — как смета ремонта: 9 категорий комплектации + 5 этапов работ + черновые.
   11 строк не выбрасываем, а перекладываем (таблица раздела 4); view() кладёт сверху выбор в блоках (Интерьер, Планировка, Маркет),
   оплаты из Заказов и считает totals — одна цифра totals.plan для экрана, полосы, дашборда, PDF и Excel. */
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

  /* ── 9 + 5 (TZ-budget, 2–4): названия, ключи, сроки договора п. 4.1, примеры работ — с эталона etalon-budget-W ── */
  var KIT = [['finish', 'Отделка'], ['light', 'Освещение'], ['sockets', 'Выключатели и розетки'], ['plumbing', 'Сантехника'], ['doors', 'Двери и перегородки'],
    ['furniture', 'Мебель покупная'], ['furniture_custom', 'Мебель заказная'], ['appliances', 'Техника'], ['decor', 'Текстиль и декор']];
  var WORKS = [
    ['demolition', 'Демонтаж и подготовительные работы', '15 раб. дн.', ['Временная электрика', 'Укрытие окон и дверей', 'Временная сантехника']],
    ['rough', 'Черновые работы', '30 раб. дн.', ['Перегородки из пеноблока', 'Штукатурка стен под маяк', 'Стяжка по маякам']],
    ['engineering', 'Инженерные работы', '35–40 раб. дн.', ['Разводка водоснабжения', 'Канализация, инсталляции', 'Электрика, щит']],
    ['prefinish', 'Предчистовые работы', '30–35 раб. дн.', ['Шпаклёвка, шлифовка', 'Гидроизоляция санузлов', 'Подготовка под отделку']],
    ['finish_works', 'Чистовые работы', '45–50 раб. дн.', ['Укладка паркета и плитки', 'Покраска, микроцемент', 'Монтаж дверей, света, сантехники']]];
  function markup() { var D = window.SOVE && window.SOVE.data; return (D && D.scout && D.scout.retailMarkup) || 1; }
  function shape(kv, wv, rough, area) {
    var mk = markup(), r = function (v) { return v === null ? null : Math.round(v); };
    return {
      kit: KIT.map(function (k) { var v = r(kv[k[0]]); return { key: k[0], title: k[1], plan: v, market: v === null ? null : Math.round(v * mk), source: 'norm', accuracy: 'примерно' }; }),
      works: WORKS.map(function (w, i) { return { key: w[0], n: i + 1, title: w[1], plan: r(wv[w[0]]), days: w[2], examples: w[3], done: false }; }),
      roughMat: { sum: r(rough), rate: rough !== null && area ? Math.round(rough / area) : null }
    };
  }

  /* ── гибрид (ТЗ Планировки, 17.2): полный бюджет считает движок расчёта (SOVE.scout.estimate),
     а здесь его итог раскладывается на 11 строк. Работы — по этапам расчёта, комплектация — по долям расчёта;
     мебель — поштучно из расстановки (правило «значение строки = выбранные товары»). ── */
  function fromScout(o) {
    var S = window.SOVE, sp = o.scout, e = S.scout.estimate(sp), st = o.state || 'concrete_walls';
    var W = {}, K = {}; e.stages.forEach(function (x) { W[x[0]] = x[1]; }); e.kit.forEach(function (x) { K[x[0]] = x[1]; });
    var walls = W['Стены и перегородки'] || 0, demo = W['Демонтаж'] || 0, plen = o.partitions && o.partitions.length ? 1 : st === 'concrete_free' ? 1 : 0;
    var finishKit = K['Отделка'] || 0, acc = o.accuracy || 'примерно', byInt = o.interior ? 'по интерьеру' : 'по расчёту';
    var lines = [];
    function line(key, t, source, value, accuracy) { lines.push({ key: key, t: t, source: source, value: Math.round(value), accuracy: accuracy || acc }); }
    if (st === 'finished') line('demolition', 'Демонтаж и вывоз', 'по расчёту', demo);
    line('rough_works', 'Черновые работы', 'по расчёту', (st === 'finished' ? 0 : demo) + walls * (plen ? .5 : 1) + (W['Водоснабжение и канализация'] || 0) + (W['Электрика, свет, двери'] || 0));
    if (plen) line('partitions', 'Перегородки', o.partitions && o.partitions.length ? 'по варианту стен' : 'по плану', walls * .5 + (K['Двери и перегородки'] || 0));
    line('rough_mat', 'Черновые материалы', 'по расчёту', finishKit * .4 + (plen ? 0 : (K['Двери и перегородки'] || 0)));
    line('finish_works', 'Чистовые работы', 'по расчёту', (W['Полы'] || 0) + (W['Потолки'] || 0) + (W['Финальная сдача'] || 0));
    line('finish_mat', 'Чистовые материалы', byInt, finishKit * .6);
    line('plumbing', 'Сантехника', byInt, K['Сантехника'] || 0);
    line('electric', 'Свет и электрика', byInt, (K['Освещение'] || 0) + (K['Выключатели и розетки'] || 0));
    line('kitchen', 'Кухня и техника', 'по длине гарнитура', K['Техника'] || 0);
    var furn = typeof o.furniture === 'number' ? o.furniture : (K['Мебель покупная'] || 0) + (K['Мебель на заказ'] || 0);
    line('furniture', 'Мебель', 'по расстановке', furn, o.interior ? 'точнее' : 'примерно');
    line('decor', 'Декор и текстиль', '% от мебели', K['Текстиль и декор'] || 0);
    var total = lines.reduce(function (a, l) { return a + l.value; }, 0);
    /* 9 + 5 прямо из расчёта: этапы — 7 этапов расчёта в 5 этапов договора; Отделка — 60 % чистовые (строка «Отделка»), 40 % черновые материалы, как в 11 строках.
       Предчистовые — норма ₽/м²; пока «[норма]» — 0, этап скрыт. Сумма 9 + 5 + черновые = сумма расчёта (мебель — из расстановки, если есть) */
    var Nn = NORMS[sp.level === 'premium' ? 'premium' : 'base'] || {}, finW = (W['Полы'] || 0) + (W['Потолки'] || 0) + (W['Финальная сдача'] || 0);
    var pre = num(Nn.prefinish_m2) !== null && e.area ? Math.min(finW, Nn.prefinish_m2 * e.area) : 0;
    var sh = shape({ finish: finishKit * .6, light: K['Освещение'] || 0, sockets: K['Выключатели и розетки'] || 0, plumbing: K['Сантехника'] || 0, doors: K['Двери и перегородки'] || 0,
        furniture: typeof o.furniture === 'number' ? o.furniture : K['Мебель покупная'] || 0, furniture_custom: K['Мебель на заказ'] || 0, appliances: K['Техника'] || 0, decor: K['Текстиль и декор'] || 0 },
      { demolition: st === 'finished' ? demo : 0, rough: (st === 'finished' ? 0 : demo) + walls, engineering: (W['Водоснабжение и канализация'] || 0) + (W['Электрика, свет, двери'] || 0), prefinish: pre, finish_works: finW - pre },
      finishKit * .4, e.area);
    return Object.assign({ lines: lines, total: total, accuracy: acc, type: sp.level === 'premium' ? 'premium' : 'base', scout: sp, perM2: e.area ? total / e.area : null, area: e.area, state: st }, sh);
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
    /* 11 строк → 9 + 5 по таблице TZ-budget, 4; новые нормы — «[норма]» (null), их строки и итог — «[сумма] ₽» */
    var L = {}; lines.forEach(function (l) { L[l.key] = l.value; });
    var el = L.electric, sh_ = num(N.light_share), app = mul(o.kitchenLen || 0, N.appliances_m);
    var sh = shape({ finish: L.finish_mat, light: el === null || sh_ === null ? null : el * sh_, sockets: el === null || sh_ === null ? null : el * (1 - sh_), plumbing: L.plumbing,
        doors: mul(A.rooms + A.baths, N.doors_pc), furniture: L.furniture, furniture_custom: L.kitchen === null || app === null ? null : Math.max(0, L.kitchen - app), appliances: app, decor: L.decor },
      { demolition: L.demolition || 0, rough: add(L.rough_works, L.partitions || 0), engineering: mul(A.floor, N.engineering_m2), prefinish: mul(surf, N.prefinish_m2), finish_works: L.finish_works },
      L.rough_mat, A.floor);
    return Object.assign({ lines: lines, total: total, accuracy: acc, type: type, area: A.floor, state: st }, sh);
  }

  /* ── экран бюджета: выбор в блоках поверх норм, оплаты из Заказов, totals (TZ-budget, 4–5) ──
     res — compute(); o: { board (паспорт Интерьера), furniture (из расстановки), plan (есть Планировка), decorCart, paid {key: ₽} }.
     Правило 5.1: выбор в блоке ЗАМЕНЯЕТ норму строки и её метку, не складывается. Капсула не на всю квартиру — строки по норме (П6). */
  function view(res, o) {
    o = o || {}; var R = window.SOVE && window.SOVE.repair, KB = window.SOVE_KB, b = o.board, mk = markup();
    var whole = b && b.slots && (!b.scope || b.scope === 'flat');
    var kit = res.kit.map(function (k) {
      var x = Object.assign({}, k, { paid: (o.paid || {})[k.key] || 0 });
      if (whole && KB && KB.BUDGET_CATS.indexOf(k.key) >= 0 && R && R.materialsSum) {
        x.plan = R.materialsSum('flat', { board: b, category: k.key }); x.market = Math.round(x.plan * mk); x.source = 'interior'; x.accuracy = b.accuracy === 'точно' ? 'точно' : 'точнее';
        if (k.key === 'finish') {
          var pz = R.planZones(), on = pz.zones;
          x.rooms = on.map(function (z) { return { id: KB.zoneId(z), zone: z, name: KB.zone(z).name, plan: R.materialsSum(z, { board: b, category: 'finish' }) }; });
        }
      }
      if ((k.key === 'furniture' && typeof o.furniture === 'number') || (k.key === 'furniture_custom' && o.plan)) { x.source = 'planirovka'; if (k.key === 'furniture') { x.plan = Math.round(o.furniture); x.market = Math.round(x.plan * mk); } }
      if (k.key === 'decor' && o.decorCart) { x.plan = o.decorCart.metod; x.market = o.decorCart.retail; x.source = 'market'; x.accuracy = 'точнее'; }
      return x;
    });
    var works = res.works.filter(function (w) { return w.plan === null || w.plan > 0; });   /* этап с нулём (нет демонтажа в новостройке) — скрыт */
    var sum = function (l, f) { return l.reduce(function (a, x) { return a === null || x[f] === null || x[f] === undefined ? null : a + x[f]; }, 0); };
    var tk = sum(kit, 'plan'), tm = sum(kit, 'market'), tw = sum(works, 'plan'), rm = res.roughMat.sum;
    var war = tw === null || rm === null ? null : tw + rm, plan = tk === null || war === null ? null : tk + war, area = res.area || null;
    return { type: res.type, kit: kit, works: works, roughMat: res.roughMat, area: area, state: res.state,
      totals: { kit: tk, kitMarket: tm, saving: tk === null || tm === null ? null : Math.max(0, tm - tk), works: tw, worksAndRough: war, plan: plan,
        paid: kit.reduce(function (a, x) { return a + (x.paid || 0); }, 0), perM2: plan !== null && area ? Math.round(plan / area) : null } };
  }

  /* оплачено — только из Заказов (TZ-budget, 5.5): заказы, прошедшие шаг «оплачен», по разделу позиции → категория комплектации */
  var SEC = { finish: 'finish', light: 'light', plumbing: 'plumbing', doors: 'doors', furniture: 'furniture', appliances: 'appliances', decor: 'decor' };
  function paidMap() {
    var O = window.SOVE && window.SOVE.orders, m = {}; if (!O || !O.list) return m;
    O.list().forEach(function (o) {
      if (o.status === 'cancelled' || o.status === 'return') return;
      var steps = (O.scenario(o.scenario) || { steps: [] }).steps.map(function (x) { return x.status; }), pi = steps.indexOf('paid');
      if (pi < 0 ? o.status !== 'received' : steps.indexOf(o.status) < pi) return;
      (o.items || []).forEach(function (it) { var k = SEC[it.section]; if (k) m[k] = (m[k] || 0) + (it.lineTotal || 0); });
    });
    return m;
  }
  /* декор из корзины квартиры (Маркет): есть — строка «Текстиль и декор» берёт его вместо нормы */
  function decorCart() {
    var R = window.SOVE && window.SOVE.repair; if (!R || !R.cart) return null;
    var rows = R.cart.rows().filter(function (x) { return x.product && x.product.category === 'Текстиль и декор'; }); if (!rows.length) return null;
    return { metod: rows.reduce(function (a, x) { return a + x.product.metod * x.qty; }, 0), retail: rows.reduce(function (a, x) { return a + (x.product.retail || x.product.metod) * x.qty; }, 0) };
  }
  /* бюджет активной квартиры: Планировка (компьют) + выбор в блоках. Нет плана — null (экран показывает пример) */
  function current() {
    var S = window.SOVE, R = S && S.repair, FL = window.SOVE_FLOW, P = FL && FL.planDoc && FL.planDoc();
    if (!R || !R.flats.active()) return null;
    var r = R.get();
    /* без Планировки, но с расчётом бюджета «из Интерьера» — бюджет по параметрам расчёта (план и капсула из квартиры), мебель — по норме */
    if ((!P || !P.budget || !P.budget.kit) && r.scoutParams && r.budgetPlan && r.budgetPlan.full && S.scout && S.scout.estimate) {
      var sp = Object.assign({}, r.scoutParams, { level: r.budgetPlan.type || r.scoutParams.level });
      var res = compute({ scout: sp, rooms: (sp.rooms || []).map(function (x) { return { name: x.name, m2: x.m2 }; }), state: { concrete: 'concrete_walls', pre: 'whitebox', secondary: 'finished' }[sp.stateId] || 'concrete_walls', type: sp.level });
      var v0 = view(res, { board: r.interior, decorCart: decorCart(), paid: paidMap() });
      v0.full = true; v0.P = null; v0.scoutOnly = true;
      return v0;
    }
    if (!P || !P.budget || !P.budget.kit) return null;
    var v = view(P.budget, { board: r.interior, furniture: P.furniture + (r.interior && r.interior.objectDelta || 0), plan: true, decorCart: decorCart(), paid: paidMap() });
    v.full = !!(FL.budgetFull && FL.budgetFull()); v.P = P;
    return v;
  }

  /* ── «По комнатам» (созвон 28.10): бюджет раскладывается по комнатам плана в одном стиле; сумма считается сама, руками не вписывается.
     Чистый helper: ничего не читает из состояния. byRooms({ rooms:[{name, area}], area, works, roughMat, cats:[{key, title, sum}] })
     → { rooms:[{name, zone, zoneName, area, works, kit, total, byCat:{key: ₽}}], typical, works, kit, total }.
     Суммы комнат ВСЕГДА сходятся с входом: каждая строка округляется до 100 ₽, последняя комната добирает разницу.
     Комнат нет (только «Вся квартира» или площадь вручную) — типовые зоны по площади (typicalRooms), typical: true. ── */
  var ZONE_NAME = { kitchenLiving: 'Кухня-гостиная', bedroom: 'Спальня', bathroom: 'Санузел', hall: 'Прихожая' };
  var ZONE_RE = [['kitchenLiving', /кух|гост|столов/i], ['bathroom', /сан|ванн|душ|туалет|с\/у/i], ['hall', /прих|корид|холл|ниша|гардероб/i], ['bedroom', /спал|детск|кабинет|комнат/i]];
  function zoneOf(name) {
    var KB = window.SOVE_KB; if (KB && KB.zoneOf) return KB.zoneOf(name);
    var hit = ZONE_RE.filter(function (z) { return z[1].test(String(name || '')); })[0]; return hit ? hit[0] : 'bedroom';
  }
  function isWholeName(n) { return /^(вся\s+квартира|вся\s+площадь|общая(\s+площадь)?|квартира\s+целиком)$/i.test(String(n || '').trim()); }
  /* применимость категории к типу зоны. Число — вес на м² относительно спальни (0 — в этой зоне категории нет):
     отделка и черновые — санузел дороже за м² (плитка на пол и стены, KB finish-slots: ≈ 2,5× на 47 м² примера), работы в санузле — 2×;
     group — доли между типами зон независимо от площади (внутри типа — по площади): сантехника — санузел и кухня, техника — только кухня;
     each — поровну на комнату (дверь у каждой). Нет подходящей комнаты — по площади всех комнат, чтобы сумма сошлась. */
  var ROOM_RULES = {
    works:            { kitchenLiving: 1,   bedroom: 1, bathroom: 2,   hall: 1 },
    rough_mat:        { kitchenLiving: 1,   bedroom: 1, bathroom: 2.5, hall: 1 },
    finish:           { kitchenLiving: 1,   bedroom: 1, bathroom: 2.5, hall: 1 },
    light:            { kitchenLiving: 1,   bedroom: 1, bathroom: 1,   hall: 1 },
    sockets:          { kitchenLiving: 1.2, bedroom: 1, bathroom: 0.5, hall: 1 },
    plumbing:         { group: { bathroom: 70, kitchenLiving: 30 } },
    doors:            { each: true },
    furniture:        { kitchenLiving: 1,   bedroom: 1, bathroom: 0.3, hall: 0.6 },
    furniture_custom: { kitchenLiving: 4,   bedroom: 1, bathroom: 0,   hall: 1.5 },
    appliances:       { group: { kitchenLiving: 100 } },
    decor:            { kitchenLiving: 1,   bedroom: 1, bathroom: 0.2, hall: 0.5 }
  };
  var KIT_KEY = { 'Мебель на заказ': 'furniture_custom' }; KIT.forEach(function (k) { KIT_KEY[k[1]] = k[0]; });
  function kitKey(title) { return KIT_KEY[String(title || '').trim()] || null; }
  function split(sum, rooms, rule) {
    sum = Math.round(sum || 0); rule = rule || {};
    var w;
    if (rule.each) w = rooms.map(function () { return 1; });
    else if (rule.group) {
      var ga = {}, gs = 0;
      rooms.forEach(function (r) { if (rule.group[r.zone]) ga[r.zone] = (ga[r.zone] || 0) + r.area; });
      Object.keys(ga).forEach(function (z) { gs += rule.group[z]; });
      w = rooms.map(function (r) { return rule.group[r.zone] && ga[r.zone] ? rule.group[r.zone] / gs * (r.area / ga[r.zone]) : 0; });
    } else w = rooms.map(function (r) { return r.area * (typeof rule[r.zone] === 'number' ? rule[r.zone] : 1); });
    var tw = w.reduce(function (a, x) { return a + x; }, 0);
    if (!(tw > 0)) { w = rooms.map(function (r) { return r.area; }); tw = w.reduce(function (a, x) { return a + x; }, 0); }
    if (!(tw > 0)) { w = rooms.map(function () { return 1; }); tw = rooms.length; }
    var last = -1; w.forEach(function (x, i) { if (x > 0) last = i; });
    var out = [], acc = 0;
    rooms.forEach(function (r, i) {
      if (i === last) { out[i] = sum - acc; return; }
      var v = w[i] > 0 ? Math.round(sum * w[i] / tw / 100) * 100 : 0; out[i] = v; acc += v;
    });
    return out;
  }
  /* типовые зоны по площади: кухня-гостиная 40 %, санузел 10 % (8 % от 60 м²), прихожая 12 %, остаток — спальни (до 60 м² — одна, до 90 — две, дальше три) */
  function typicalRooms(area) {
    area = Math.round((Number(area) || 0) * 10) / 10; if (!(area > 0)) return [];
    var beds = area < 60 ? 1 : area < 90 ? 2 : 3, bath = area < 60 ? 10 : 8;
    var plan = [['Кухня-гостиная', 'kitchenLiving', 40]], rest = 100 - 40 - bath - 12, bs = beds === 1 ? [1] : beds === 2 ? [.57, .43] : [.42, .32, .26];
    bs.forEach(function (x, i) { plan.push([i ? 'Спальня ' + (i + 1) : 'Спальня', 'bedroom', rest * x]); });
    plan.push(['Санузел', 'bathroom', bath], ['Прихожая', 'hall', 12]);
    var acc = 0;
    return plan.map(function (p, i) {
      var a = i === plan.length - 1 ? Math.round((area - acc) * 10) / 10 : Math.round(area * p[2] / 100 * 10) / 10; acc += a;
      return { name: p[0], zone: p[1], area: a, typical: true };
    });
  }
  function byRooms(o) {
    o = o || {};
    var src = (o.rooms || []).filter(function (r) { return r && Number(r.area) > 0 && !isWholeName(r.name); }), typical = false;
    if (!src.length) { src = typicalRooms(o.area || (o.rooms || []).reduce(function (a, r) { return a + (Number(r && r.area) || 0); }, 0)); typical = true; }
    var rooms = src.map(function (r) { var z = r.zone || zoneOf(r.name); return { name: r.name || ZONE_NAME[z], zone: z, zoneName: ZONE_NAME[z] || ZONE_NAME.bedroom, area: Math.round(Number(r.area) * 10) / 10, typical: !!r.typical, works: 0, kit: 0, total: 0, byCat: {} }; });
    if (!rooms.length) return { rooms: [], typical: typical, works: 0, kit: 0, total: 0 };
    /* черновые материалы — это 40 % «Отделки» расчёта (fromScout): делим их вместе с отделкой одним правилом, чтобы итог комнаты
       на экране Бюджета совпадал с итогом комнаты в Расчёте копейка в копейку (а не расходился на округление) */
    var fin = (o.cats || []).filter(function (c) { return c && c.key === 'finish'; })[0], RM = null;
    if (o.roughMat && fin) { var C = split((fin.sum || 0) + o.roughMat, rooms, ROOM_RULES.finish), Fo = split(fin.sum, rooms, ROOM_RULES.finish); RM = C.map(function (x, i) { return x - Fo[i]; }); }
    else if (o.roughMat) RM = split(o.roughMat, rooms, ROOM_RULES.rough_mat);
    var W = split(o.works, rooms, ROOM_RULES.works);
    rooms.forEach(function (r, i) { r.works = W[i] + (RM ? RM[i] : 0); });
    (o.cats || []).forEach(function (c) {
      if (!c || !c.key) return;
      var v = split(c.sum, rooms, ROOM_RULES[c.key] || null);
      rooms.forEach(function (r, i) { r.byCat[c.key] = v[i]; r.kit += v[i]; });
    });
    rooms.forEach(function (r) { r.total = r.works + r.kit; });
    var tot = function (f) { return rooms.reduce(function (a, r) { return a + r[f]; }, 0); };
    return { rooms: rooms, typical: typical, works: tot('works'), kit: tot('kit'), total: tot('total') };
  }

  window.SOVE_BUDGET = { compute: compute, areas: areas, fromScout: fromScout, view: view, current: current, paidMap: paidMap, KIT: KIT, WORKS: WORKS,
    byRooms: byRooms, typicalRooms: typicalRooms, kitKey: kitKey, zoneOf: zoneOf, ZONE_NAME: ZONE_NAME, ROOM_RULES: ROOM_RULES };
})();
