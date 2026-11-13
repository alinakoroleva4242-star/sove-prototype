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
  /* порядок — как в таблицах и Excel (файл Алины 1, с.3): Отделка … Мебель заказная · Двери и перегородки · Текстиль и декор */
  var KIT = [['finish', 'Отделка'], ['light', 'Освещение'], ['sockets', 'Выключатели и розетки'], ['plumbing', 'Сантехника'], ['appliances', 'Техника'],
    ['furniture', 'Мебель покупная'], ['furniture_custom', 'Мебель заказная'], ['doors', 'Двери и перегородки'], ['decor', 'Текстиль и декор']];
  var WORKS = [
    ['demolition', 'Демонтаж и подготовительные работы', '15 раб. дн.', ['Временная электрика', 'Укрытие окон и дверей', 'Временная сантехника']],
    ['rough', 'Черновые работы', '30 раб. дн.', ['Перегородки из пеноблока', 'Штукатурка стен под маяк', 'Стяжка по маякам']],
    ['engineering', 'Инженерные работы', '35–40 раб. дн.', ['Разводка водоснабжения', 'Канализация, инсталляции', 'Электрика, щит']],
    ['prefinish', 'Предчистовые работы', '30–35 раб. дн.', ['Шпаклёвка, шлифовка', 'Гидроизоляция санузлов', 'Подготовка под отделку']],
    ['finish_works', 'Чистовые работы', '45–50 раб. дн.', ['Укладка паркета и плитки', 'Покраска, микроцемент', 'Монтаж дверей, света, сантехники']]];
  function markup() { var D = window.SOVE && window.SOVE.data; return (D && D.scout && D.scout.retailMarkup) || 1; }
  function shape(kv, wv, rough, area, km) {
    var mk = markup(), r = function (v) { return v === null ? null : Math.round(v); };
    /* km — рынок по категориям из серверного расчёта (цены товаров), иначе наценка */
    return {
      kit: KIT.map(function (k) { var v = r(kv[k[0]]); return { key: k[0], title: k[1], plan: v, market: v === null ? null : km && typeof km[k[0]] === 'number' ? Math.round(km[k[0]]) : Math.round(v * mk), source: 'norm', accuracy: 'примерно' }; }),
      works: WORKS.map(function (w, i) { return { key: w[0], n: i + 1, title: w[1], plan: r(wv[w[0]]), days: w[2], examples: w[3], done: false }; }),
      roughMat: { sum: r(rough), rate: rough !== null && area ? Math.round(rough / area) : null }
    };
  }

  /* ── гибрид (ТЗ Планировки, 17.2): полный бюджет считает движок расчёта (SOVE.scout.estimate),
     а здесь его итог раскладывается на 11 строк. Работы — по этапам расчёта, комплектация — по долям расчёта;
     мебель — поштучно из расстановки (правило «значение строки = выбранные товары»). ── */
  function fromScout(o) {
    var S = window.SOVE, sp = o.scout, e = S.scout.estimate(sp), st = o.state || 'concrete_walls';
    /* черновые: внутри «Отделки» (40 %, чистовым остаётся 60 %) или сверху комплектации (ставка × м², «Отделка» целиком) — S.scout.kitParts */
    var roughTop = e.roughMode === 'top', finShare = roughTop ? 1 : .6;
    var W = {}, K = {}; e.stages.forEach(function (x) { W[x[0]] = x[1]; }); e.kit.forEach(function (x) { K[x[0]] = x[1]; });
    var walls = W['Стены и перегородки'] || 0, demo = W['Демонтаж'] || 0, plen = o.partitions && o.partitions.length ? 1 : st === 'concrete_free' ? 1 : 0;
    var finishKit = K['Отделка'] || 0, acc = o.accuracy || 'примерно', byInt = o.interior ? 'по интерьеру' : 'по расчёту';
    var KM = null; if (e.api && e.api.by_category) { KM = {}; e.api.by_category.forEach(function (c) { KM[kitKey(c.category) || c.category] = c.market; }); }
    var lines = [];
    function line(key, t, source, value, accuracy) { lines.push({ key: key, t: t, source: source, value: Math.round(value), accuracy: accuracy || acc }); }
    if (st === 'finished') line('demolition', 'Демонтаж и вывоз', 'по расчёту', demo);
    line('rough_works', 'Черновые работы', 'по расчёту', (st === 'finished' ? 0 : demo) + walls * (plen ? .5 : 1) + (W['Водоснабжение и канализация'] || 0) + (W['Электрика, свет, двери'] || 0));
    if (plen) line('partitions', 'Перегородки', o.partitions && o.partitions.length ? 'по варианту стен' : 'по плану', walls * .5 + (K['Двери и перегородки'] || 0));
    line('rough_mat', 'Черновые материалы', 'по расчёту', (roughTop ? e.rough : finishKit * .4) + (plen ? 0 : (K['Двери и перегородки'] || 0)));
    line('finish_works', 'Чистовые работы', 'по расчёту', (W['Полы'] || 0) + (W['Потолки'] || 0) + (W['Финальная сдача'] || 0));
    line('finish_mat', 'Чистовые материалы', byInt, finishKit * finShare);
    line('plumbing', 'Сантехника', byInt, K['Сантехника'] || 0);
    line('electric', 'Свет и электрика', byInt, (K['Освещение'] || 0) + (K['Выключатели и розетки'] || 0));
    line('kitchen', 'Кухня и техника', 'по длине гарнитура', K['Техника'] || 0);
    var furn = typeof o.furniture === 'number' ? o.furniture : (K['Мебель покупная'] || 0) + (K['Мебель заказная'] || 0);
    line('furniture', 'Мебель', 'по расстановке', furn, o.interior ? 'точнее' : 'примерно');
    line('decor', 'Декор и текстиль', '% от мебели', K['Текстиль и декор'] || 0);
    var total = lines.reduce(function (a, l) { return a + l.value; }, 0);
    /* 9 + 5 прямо из расчёта: 5 этапов договора как в смете №684 — по строкам плана (lineStage), без плана ставка × м² по весам этапов (rateStages); Отделка — 60 % чистовые (строка «Отделка»), 40 % черновые материалы, как в 11 строках.
       Сумма 9 + 5 + черновые = сумма расчёта (мебель — из расстановки, если есть) */
    /* итог работ прежний до рубля: по плану разделы книги округляются отдельно (e.stages), разница с суммой строк — в последний этап */
    var wv = e.apiStages ? Object.assign({}, e.apiStages) : e.lines ? linesStages(e.lines, st) : rateStages(e.works, e.state && e.state.id);
    if (e.lines) { var wKeys = Object.keys(wv).filter(function (k) { return wv[k] > 0; }), dW = e.stages.reduce(function (a, x) { return a + x[1]; }, 0) - wKeys.reduce(function (a, k) { return a + wv[k]; }, 0); if (dW && wKeys.length) wv[wKeys[wKeys.length - 1]] += dW; }
    var sh = shape({ finish: finishKit * finShare, light: K['Освещение'] || 0, sockets: K['Выключатели и розетки'] || 0, plumbing: K['Сантехника'] || 0, doors: K['Двери и перегородки'] || 0,
        furniture: typeof o.furniture === 'number' ? o.furniture : K['Мебель покупная'] || 0, furniture_custom: K['Мебель заказная'] || 0, appliances: K['Техника'] || 0, decor: K['Текстиль и декор'] || 0 },
      wv, roughTop ? e.rough : finishKit * .4, e.area, KM);
    /* копейки округления строк — в последний этап и последнюю категорию: итог и рынок как в расчёте до рубля, вход в Интерьер без замены цифру не меняет */
    if (typeof o.furniture !== 'number') {
      var tt = function (l, f) { return l.reduce(function (a, x) { return a + (x[f] || 0); }, 0); }, lw = sh.works.filter(function (w) { return w.plan > 0; }).pop(), lk = sh.kit.filter(function (k) { return k.plan > 0; }).pop();
      var dT = Math.round(e.total) - tt(sh.kit, 'plan') - tt(sh.works, 'plan') - (sh.roughMat.sum || 0), dM = Math.round(e.kitMarket) - tt(sh.kit, 'market');
      if (dT && Math.abs(dT) < 50 && lw) lw.plan += dT;
      if (dM && Math.abs(dM) < 50 && lk) lk.market += dM;
    }
    return Object.assign({ lines: lines, total: total, accuracy: acc, type: sp.level === 'premium' ? 'premium' : 'base', scout: sp, perM2: e.area ? total / e.area : null, area: e.area, state: st, workLines: e.lines || null, roughMode: e.roughMode, api: e.api || null }, sh);
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
     Доска той же капсулы, что в расчёте (Алина 06.11: «заменили материал — меняется итог»): строка = норма расчёта плюс разница от замен, без замены итог прежний; образцы доски нормы не заменяют (их сумма в разы меньше нормы).
     Правило 5.1: выбор в блоке ЗАМЕНЯЕТ норму строки и её метку, не складывается — только у доски не из капсулы расчёта (своя по фото, другая капсула) и у старых досок без поля base. Капсула не на всю квартиру — строки по норме (П6). */
  function view(res, o) {
    o = o || {}; var R = window.SOVE && window.SOVE.repair, KB = window.SOVE_KB, b = o.board, mk = markup();
    var whole = b && b.slots && (!b.scope || b.scope === 'flat'), pz = whole && KB && R && R.planZones ? calcZones(R.planZones(), res) : null;
    var byNorm = whole && pz && boardOfCalc(b, res), area0 = res.area || (pz && pz.area);
    var kit = res.kit.map(function (k) {
      var x = Object.assign({}, k, { paid: (o.paid || {})[k.key] || 0 });
      if (whole && KB && KB.BUDGET_CATS.indexOf(k.key) >= 0 && R && R.materialsSum) {
        x.source = 'interior'; x.accuracy = b.accuracy === 'точно' ? 'точно' : 'точнее';
        if (byNorm && k.plan !== null) {
          x.byNorm = true; x.parts = swapParts(b, k.key, pz, area0); x.norm = { sum: k.plan, market: k.market };   /* норма без замен: по ней комнаты делятся так же, как до замены */
          var dm = x.parts.reduce(function (a, p) { return a + p.delta; }, 0);
          x.plan = Math.max(0, k.plan + dm); x.market = Math.max(0, k.market + Math.round(dm * mk));
          if (k.key === 'finish') x.rooms = normRooms(k.plan, x, pz);
        } else {
          var pz0 = R.planZones();   /* сумма строки — как считалась всегда, старые бюджеты не меняются; по комнатам она делится по площади (calcZones), округление — в последнюю зону */
          x.plan = R.materialsSum('flat', { board: b, category: k.key, plan: pz0 }); x.market = Math.round(x.plan * mk);
          /* по слотам и зонам: «По комнатам» и листы Excel сходятся до рубля (byRooms, mapToRooms) */
          x.parts = KB.SLOTS.filter(function (s) { return s.budgetCat === k.key; }).map(function (s) {
            var zones = {}, on = [], tot = R.materialsSum('flat', { board: b, slot: s.key, plan: pz0 }), acc = 0;
            pz.zones.forEach(function (z) { zones[z] = R.materialsSum(z, { board: b, slot: s.key, plan: pz }); acc += zones[z]; if (zones[z]) on.push(z); });
            if (on.length && tot !== acc) zones[on[on.length - 1]] += tot - acc;
            return { slot: s.key, zones: zones };
          });
          if (k.key === 'finish') x.rooms = pz.zones.map(function (z) { return { id: KB.zoneId(z), zone: z, name: KB.zone(z).name, plan: x.parts.reduce(function (a, p) { return a + (p.zones[z] || 0); }, 0) }; });
        }
      }
      if ((k.key === 'furniture' && typeof o.furniture === 'number') || (k.key === 'furniture_custom' && o.plan)) { x.source = 'planirovka'; if (k.key === 'furniture') { x.plan = Math.round(o.furniture); x.market = Math.round(x.plan * mk); } }
      /* без плана мебель по норме расчёта: разница заменённых предметов прибавляется к строке, источник строки прежний. В Планировке она уже внутри o.furniture */
      if (k.key === 'furniture' && o.objectDelta && typeof o.furniture !== 'number' && x.plan !== null) { x.plan = Math.max(0, x.plan + Math.round(o.objectDelta)); x.market = Math.max(0, x.market + Math.round(o.objectDelta * mk)); }
      /* покупка декора заменяет норму строки только там, где выбор заменяет норму (правило 5.1). Иначе цифра менялась бы от простого открытия Интерьера: одна картина вместо всей нормы. Заменять ли норму покупкой — вопрос Алине */
      if (k.key === 'decor' && o.decorCart) { if (whole && !byNorm) { x.plan = o.decorCart.metod; x.market = o.decorCart.retail; x.source = 'market'; x.accuracy = 'точнее'; } else x.cartApart = true; }
      return x;
    });
    /* замена материала меняет работу (Алина 06.11). Считаем здесь, каждый раз заново: отмена замены возвращает все цифры сама, отдельно ничего не хранится. Только при доске на всю квартиру — иначе норма (П6) */
    var sw = whole && KB && KB.WORK && pz ? swapWorks(b, { area: area0, lines: res.workLines, state: res.state, pz: pz }) : { swaps: [], unknown: [], delta: 0 };
    var works = applySwaps(res.works, sw.swaps).filter(function (w) { return w.plan === null || w.plan > 0; });   /* этап с нулём (нет демонтажа в новостройке) — скрыт */
    var sum = function (l, f) { return l.reduce(function (a, x) { return a === null || x[f] === null || x[f] === undefined ? null : a + x[f]; }, 0); };
    var tk = sum(kit, 'plan'), tm = sum(kit, 'market'), tw = sum(works, 'plan'), rm = res.roughMat.sum;
    var war = tw === null || rm === null ? null : tw + rm, plan = tk === null || war === null ? null : tk + war, area = res.area || null;
    return { type: res.type, kit: kit, works: works, roughMat: res.roughMat, area: area, state: res.state, workLines: res.workLines || null, workSwaps: sw.swaps, workUnknown: sw.unknown, roughMode: res.roughMode || 'share', pz: pz, api: res.api || null,
      capsuleId: (res.scout && res.scout.capsuleId) || null, boardRule: !!whole && !byNorm,   /* boardRule: строки материалов взяты с доски (5.1), шапка Excel — по её капсуле */
      totals: { kit: tk, kitMarket: tm, saving: tk === null || tm === null ? null : Math.max(0, tm - tk), works: tw, worksAndRough: war, plan: plan, worksDelta: sw.delta,
        paid: kit.reduce(function (a, x) { return a + (x.paid || 0); }, 0), perM2: plan !== null && area ? Math.round(plan / area) : null } };
  }

  /* без плана площади комнат — из расчёта (комнаты шага 3 или типовые зоны): материалы по комнатам делятся по площади, а не поровну. Формула R.materialsSum прежняя, меняется только её вход.
     Зоне без комнаты в расчёте (нет прихожей) — исчезающе малая площадь: иначе materialsSum делит материал поровну, а её копейки всё равно уйдут по комнатам (mapToRooms) */
  function calcZones(pz, res) {
    var br = res.scout && res.scout.byRooms, za = {}; if (pz.exact || !br || !br.length) return pz;
    br.forEach(function (x) { if (!x.common && x.area > 0) za[x.zone] = (za[x.zone] || 0) + x.area; });
    if (!Object.keys(za).length) return pz;
    pz.zones.forEach(function (z) { if (!za[z]) za[z] = .01; });
    return Object.assign({}, pz, { zoneArea: za });
  }
  /* доска считается от нормы расчёта: та же капсула и у всех слотов записана база. Старая доска без поля base — по правилу 5.1, как считалась раньше */
  function boardOfCalc(b, res) {
    var R = window.SOVE && window.SOVE.repair, id = res.scout && res.scout.capsuleId;
    return !!(R && R.boardOfCapsule && R.boardOfCapsule(b, id) && R.boardHasBases(b));
  }
  /* разница заменённых слотов категории по зонам: стало минус было (товар базы). Суммы — той же R.materialsSum, на площадь расчёта. Отмена замены возвращает всё сама: ничего не хранится */
  function swapParts(b, cat, pz, area) {
    var KB = window.SOVE_KB, R = window.SOVE.repair, out = [];
    KB.SLOTS.forEach(function (s) {
      var e = b.slots[s.key]; if (s.budgetCat !== cat || !e) return;
      var one = function (x) { var sl = {}; sl[s.key] = x; return { slots: sl }; };
      if (e.base && e.base !== e.sku && KB.item(e.base) && KB.item(e.sku)) {
        var sc = R.scaleSlots({ now: { sku: e.sku }, was: { sku: e.base } }, area), p = { slot: s.key, sku: e.sku, base: e.base, nowQty: sc.now.qty, wasQty: sc.was.qty, now: {}, was: {}, zones: {}, delta: 0 };
        pz.zones.forEach(function (z) { p.now[z] = R.materialsSum(z, { board: one(sc.now), slot: s.key, plan: pz }); p.was[z] = R.materialsSum(z, { board: one(sc.was), slot: s.key, plan: pz }); });
        /* округление зон до 100 ₽ не должно менять разницу: последняя зона добирает до суммы слота */
        [[p.now, sc.now.sum], [p.was, sc.was.sum]].forEach(function (x) { var on = pz.zones.filter(function (z) { return x[0][z]; }), lastZ = on[on.length - 1]; if (lastZ) x[0][lastZ] += x[1] - on.reduce(function (a, z) { return a + x[0][z]; }, 0); });
        pz.zones.forEach(function (z) { p.zones[z] = p.now[z] - p.was[z]; p.delta += p.zones[z]; });
        out.push(p);
      }
      /* замена «только здесь»: разница материала только в этой комнате, остальные не меняются. Было — общий материал доски */
      Object.keys(b.roomSlots || {}).forEach(function (z) {
        var ov = b.roomSlots[z][s.key]; if (!ov || ov.sku === e.sku || pz.zones.indexOf(z) < 0 || !KB.item(ov.sku) || !KB.item(e.sku)) return;
        var sc2 = R.scaleSlots({ now: { sku: ov.sku }, was: { sku: e.sku } }, area), nv = R.materialsSum(z, { board: one(sc2.now), slot: s.key, plan: pz }), wv = R.materialsSum(z, { board: one(sc2.was), slot: s.key, plan: pz });
        var now = {}, was = {}, zones = {}; now[z] = nv; was[z] = wv; zones[z] = nv - wv;
        var q = function (x) { var it = KB.item(x.sku); return it.unit === 'компл.' ? x.qty : Math.round(x.qty * R.zoneShare(s.key, z, pz, it) * 10) / 10; };
        out.push({ slot: s.key, sku: ov.sku, base: e.sku, only: !!pz.exact, room: z, nowQty: q(sc2.now), wasQty: q(sc2.was), now: now, was: was, zones: zones, delta: nv - wv });
      });
    });
    return out;
  }
  /* «Отделка» по комнатам при счёте от нормы: норма по правилу категории плюс разница замен в этой комнате; сумма комнат = строка */
  function normRooms(norm, x, pz) {
    var KB = window.SOVE_KB, part = split(norm, pz.zones.map(function (z) { return { zone: KB.zoneType(z), area: pz.zoneArea[z] || 1 }; }), ROOM_RULES.finish);
    var rows = pz.zones.map(function (z, i) { return { id: KB.zoneId(z), zone: z, name: KB.zone(z).name, plan: part[i] + x.parts.reduce(function (a, p) { return a + (p.zones[z] || 0); }, 0) }; });
    if (rows.length) rows[rows.length - 1].plan += x.plan - rows.reduce(function (a, r) { return a + r.plan; }, 0);
    return rows;
  }

  /* ── работа от замены материала: база слота → текущий товар. Чистые функции, ничего не хранят ── */
  /* база слота: новая доска пишет её сама (slotEntry). У старой доски поля нет: её прошлые замены в прежнюю цифру не входили, база — текущий товар, разница пойдёт с новой замены клиента */
  function slotBase(b, key) { var e = b && b.slots && b.slots[key]; return e ? e.base || e.sku : null; }
  /* этап каждой работы — как в смете №684 (образец Алины, sove_scout_works_budget_684.xlsx): стяжка в черновых, плитка и шпатлёвка в предчистовых, покраска, пол и сантехника в чистовых.
     Книга работ (works-prices.js) генерируется и живёт своими 7 разделами; раскладка по 5 этапам договора — здесь, по названию работы. Строки и суммы от неё не меняются.
     Работ книги, которых нет в №684, — по смыслу: «Демонтаж» — в демонтаж; стеклохолст, финишная шпаклёвка, грунтовка 3 этап, шпатлёвка потолка, облицовка керамогранитом — в предчистовые; ламинат, инж. доска, потолок ГКЛ, его покраска и светильник — в чистовые */
  var WORK_STAGE = {};
  [['demolition', ['Демонтаж', 'Укрытие плёнкой окон и дверей', 'Монтаж временная электрика', 'Монтаж временной сантехники']],
    ['rough', ['Возведение перегородок из пеноблока до 10 см.', 'Усиление стандартного проема металлоконструкциями', 'Обеспыливание и грунтовка стен', 'Отштукатуривание стен под маяк', 'Отштукатуривание стен под маяк в санузле', 'Обеспыливание и грунтовка откосов', 'Отштукатуривание отокосов', 'Гидроизоляция пола шуманет гидро-100', 'Устройство стяжки по маякам до 12см']],
    ['engineering', ['Штробление гипсолитовых/ пеноблочных стен до 7 см', 'Разводка труб водоснабжения до 3-х метров (за 1 точку)', 'Разводка труб канализации', 'Сборка и монтаж системы "инсталляции"', 'Установка сливного трапа', 'Установка коллекторов (гребенка)', 'Установка шарового крана', 'Компенсатор от гидроудара', 'Установка регулятора давления', 'Установка фильтра грубой очистки', 'Установка фильтра тонкой очистки', 'Установка системы защиты от протечек воды', 'Замена радиаторов системы отопления', 'Монтаж электроточек комплект (точка)', 'Монтаж распределительного электрощита', 'Установка слаботочного щита', 'Монтаж тепло / звукоизоляции стен (мин.вата,пенополистироловые плиты) 1 слой']],
    ['prefinish', ['Монтаж трассы системы кондиционирования', 'Шпатлевка стен в 2 слоя с ошкуриванием', 'Обеспыливание и грунтовка стен 2 этап', 'Поклейка стеклохолста на стены (паутинки)', 'Обеспыливание и грунтовка стен 3 этап', 'Шпаклевка финишная в 2 слоя с шлифованием', 'Гидроизоляция ленточная и обмазночная', 'Замазка штроб', 'Облицовка стены керамогранитом 60*120', 'Облицовка стен керамогранитом 120*120', 'Затирка швоф эпоксидной затиркой', 'Запил края плитки под 45 гр.', 'Высверливание отверстий в керамограните', 'Установка ванны', 'Вывоз мусора', 'Обшивка ГКЛ инсталляции', 'Обшифка ГКЛ', 'Монтаж вентеляции из короба ПВХ', 'Шпатлевка потолка в 2 слоя и грунтовка']],
    ['finish_works', ['Обеспыливание и грунтовка стен этап 4', 'Покраска стен в 2 слоя (техническая и обычна краска)', 'Монтаж натяжного потолка', 'Монтаж прямолинейных потолков из ГКЛ в 2 уровня', 'Покраска потолка в 2 слоя', 'Установка точечного светильника (в натяжной потолок)', 'Установка точечного светильника (в ГКЛ потолок)', 'Установка люстры на 1 - 3 лампы на монтажную планку', 'Установка настенных светильников, бра', 'Монтаж ламината ёлкой', 'Монтаж инженерная доска ёлкой', 'Укладка ветоши на напольное покрытие и оргалита', 'Монтаж плинтуса из дюрополимера с покраской', 'Установка навесных зеркал в санузле', 'Установка раковины', 'Установка унитаза, без сборки', 'Установка смесителей / гигиенического душа', 'Установка душевой системы', 'Установка полотенцесушителя эектрический', 'Установка и подключение стиральной машины', 'Установка чистовых разеток, выключателей и т.д.', 'Установка дверей', 'Установка двухстворчатых дверей']]
  ].forEach(function (x) { x[1].forEach(function (n) { WORK_STAGE[n] = x[0]; }); });
  /* раздел книги → этап договора: только для работы, которой ещё нет в таблице выше (книгу перегенерировали) */
  function stageOf(name, state) {
    if (name === 'Демонтаж') return state === 'finished' ? 'demolition' : 'rough';
    if (name === 'Стены и перегородки') return 'rough';
    if (name === 'Водоснабжение и канализация' || name === 'Электрика, свет, двери') return 'engineering';
    return 'finish_works';
  }
  /* этап строки сметы */
  function lineStage(l, state) { return WORK_STAGE[l.work] || stageOf(l.stage, state); }
  /* суммы 5 этапов по строкам плана: Σ этапов = Σ строк */
  function linesStages(lines, state) { var out = {}; WORKS.forEach(function (w) { out[w[0]] = 0; }); (lines || []).forEach(function (l) { out[lineStage(l, state)] += l.sum; }); return out; }
  /* суммы 5 этапов без плана (ставка × м²): итог работ делится по весам состояния (data.js, stageWeights), округление — в последний этап с суммой: Σ этапов = работы */
  function rateStages(works, stateId) {
    var D = window.SOVE && window.SOVE.data, all = (D && D.scout && D.scout.stageWeights) || {}, ws = all[stateId] || all.concrete || {}, out = {}, tot = 0, acc = 0, last = null;
    WORKS.forEach(function (w) { tot += ws[w[0]] || 0; });
    WORKS.forEach(function (w) { var v = tot ? Math.round((works || 0) * (ws[w[0]] || 0) / tot) : 0; out[w[0]] = v; acc += v; if (v) last = w[0]; });
    if (last) out[last] += Math.round(works || 0) - acc;
    return out;
  }
  /* строка книги работ, которую заменяет слот: только пол, потолок и плинтус есть в книге одной строкой */
  var SLOT_ROWS = { floor: [108, 112], ceiling: [88, 89], moldings: [114] };
  function slotLine(lines, key) { var rows = SLOT_ROWS[key] || []; return (lines || []).filter(function (l) { return rows.indexOf(l.row) >= 0; })[0] || null; }
  /* swapWorks(board, {area, lines, state}) → { swaps[], unknown[], delta }. lines — работы по объёмам плана: снимается сама строка; нет строк (ставка × м²) — снимается цена базовой работы из прайса на её объём.
     Работы нет в прайсе (work: null) — в unknown: не снимаем и не прибавляем */
  function swapWorks(b, o) {
    o = o || {}; var KB = window.SOVE_KB, R = window.SOVE && window.SOVE.repair, out = { swaps: [], unknown: [], delta: 0 };
    if (!b || !b.slots || !KB || !KB.WORK || !R || !R.scaleSlots) return out;
    KB.SLOTS.forEach(function (s) {
      var e = b.slots[s.key], it = e && KB.item(e.sku), base = it && KB.item(slotBase(b, s.key));
      if (!it || !base || base.sku === it.sku) return;
      if (base.work === undefined && it.work === undefined) return;
      if (base.work === null || it.work === null || base.work === undefined || it.work === undefined) { out.unknown.push({ slot: s.key, slotName: s.name, from: base.name, to: it.name }); return; }
      var A = KB.WORK[base.work], Z = KB.WORK[it.work]; if (!A || !Z || base.work === it.work || (A.price === Z.price && A.stage === Z.stage)) return;
      var q0 = R.scaleSlots({ t: { sku: base.sku } }, o.area).t.qty, q1 = R.scaleSlots({ t: { sku: it.sku } }, o.area).t.qty;
      var L = slotLine(o.lines, s.key);
      var minus = L ? L.sum : Math.round(A.price * q0), qty = L && s.key !== 'moldings' ? L.qty : q1, plus = Math.round(Z.price * qty);
      out.swaps.push({ slot: s.key, slotName: s.name, from: A.short, to: Z.short, work: Z.name, unit: Z.unit, price: Z.price, qty: qty, plus: plus, plusStage: Z.stage,
        fromWork: L ? L.work : A.name, fromUnit: L ? L.unit : A.unit, fromPrice: L ? L.price : A.price, fromQty: L ? L.qty : q0, minus: minus, minusStage: L ? lineStage(L, o.state) : A.stage, row: L ? L.row : null, delta: plus - minus });
      out.delta += plus - minus;
    });
    /* замена «только здесь»: от общего материала доски к материалу комнаты, на долю этой комнаты. Строка сметы остаётся, снятая работа — отдельной строкой с минусом */
    var pz0 = o.pz || (R.planZones && R.planZones());
    Object.keys(b.roomSlots || {}).forEach(function (z) {
      if (pz0.zones.indexOf(z) < 0) return;   /* комнаты больше нет в плане: материал её тоже не считает */
      KB.SLOTS.forEach(function (s) {
        var ov = b.roomSlots[z][s.key], e = b.slots[s.key], it = ov && KB.item(ov.sku), cur = e && KB.item(e.sku); if (!it || !cur || it.sku === cur.sku) return;
        if (cur.work === undefined && it.work === undefined) return;
        var zn = KB.zone(z).name;
        if (cur.work === null || it.work === null || cur.work === undefined || it.work === undefined) { out.unknown.push({ slot: s.key, slotName: s.name + ' · ' + zn, from: cur.name, to: it.name, room: z }); return; }
        var A = KB.WORK[cur.work], Z = KB.WORK[it.work]; if (!A || !Z || cur.work === it.work || (A.price === Z.price && A.stage === Z.stage)) return;
        /* строка книги ещё на месте (общий материал не менялся): снимаем по её цене и этапу */
        var unswapped = !e.base || e.base === e.sku || (KB.item(e.base) || {}).work === cur.work, Lq = slotLine(o.lines, s.key), L = unswapped ? Lq : null, byLine = Lq && s.key !== 'moldings';
        var share = R.zoneShare(s.key, z, pz0, it), q0 = R.scaleSlots({ t: { sku: cur.sku } }, o.area).t.qty * share, q1 = R.scaleSlots({ t: { sku: it.sku } }, o.area).t.qty * share;
        var fromQty = Math.round((L || byLine ? Lq.qty * share : q0) * 10) / 10, qty = byLine ? Math.round(Lq.qty * share * 10) / 10 : Math.round(q1 * 10) / 10, minus = Math.round((L ? L.price : A.price) * fromQty), plus = Math.round(Z.price * qty);
        out.swaps.push({ slot: s.key, slotName: s.name + ' · ' + zn, room: z, from: A.short, to: Z.short, work: Z.name, unit: Z.unit, price: Z.price, qty: qty, plus: plus, plusStage: Z.stage,
          fromWork: L ? L.work : A.name, fromUnit: L ? L.unit : A.unit, fromPrice: L ? L.price : A.price, fromQty: fromQty, minus: minus, minusStage: L ? lineStage(L, o.state) : A.stage, row: null, delta: plus - minus });
        out.delta += plus - minus;
      });
    });
    return out;
  }
  /* сколько изменит работы выбор товара на этом слоте: null — работа уточняется, undefined — разницу не считаем. Для подписи в шторке замены. o.room — замена только в этой комнате */
  function workIf(b, slot, sku, o) {
    var KB = window.SOVE_KB, R = window.SOVE && window.SOVE.repair, it = KB && KB.item(sku); if (!it || !b || !b.slots || !b.slots[slot] || it.work === undefined) return undefined;
    var one = {}; one[slot] = KB.slotEntry(it, 'user', null, o.room ? null : slotBase(b, slot)); R.scaleSlots(one, o.area);
    var t = o.room ? Object.assign({}, b, { roomSlots: withRoomSlot(b.roomSlots, o.room, slot, b.slots[slot].sku === sku ? null : one[slot]) }) : Object.assign({}, b, { slots: Object.assign({}, b.slots, one), roomSlots: withRoomSlot(b.roomSlots, null, slot, null) });
    var s1 = swapWorks(t, o);
    if (s1.unknown.some(function (u) { return u.slot === slot && (!o.room || u.room === o.room); })) return null;
    return s1.delta - swapWorks(b, o).delta;
  }
  /* замены «только здесь» с новой заменой: room — комната, entry — запись или null (снять). room = null — снять замену слота во всех комнатах («Везде»). Исходное не меняем */
  function withRoomSlot(rs, room, slot, entry) {
    var out = {}; Object.keys(rs || {}).forEach(function (z) { out[z] = Object.assign({}, rs[z]); if (room === null || z === room) delete out[z][slot]; });
    if (room !== null && entry) { out[room] = out[room] || {}; out[room][slot] = entry; }
    Object.keys(out).forEach(function (z) { if (!Object.keys(out[z]).length) delete out[z]; });
    return out;
  }
  /* замены в этапах: новая работа — в свой этап; снятая — из своего, а если там меньше (снятие базовой плитки на малой площади ушло бы в минус) — из чистовых, затем из остальных.
     Сумма изменений всегда равна delta. changes у этапа — расшифровка на экране и в смете. Массив res.works не меняем */
  var CARRY = ['finish_works', 'prefinish', 'engineering', 'rough', 'demolition'];
  function applySwaps(list, swaps) {
    var out = list.map(function (w) { return Object.assign({}, w, { plan0: w.plan, changes: [] }); }), by = {};
    out.forEach(function (w) { by[w.key] = w; });
    if (!swaps.length || out.some(function (w) { return w.plan === null; })) return out;
    function note(key, s, v) { var c = by[key].changes.filter(function (x) { return x.swap === s; })[0]; if (c) c.amount += v; else by[key].changes.push({ swap: s, slot: s.slot, slotName: s.slotName, from: s.from, to: s.to, amount: v }); }
    swaps.forEach(function (s) { by[s.plusStage].plan += s.plus; note(s.plusStage, s, s.plus); });
    swaps.forEach(function (s) {
      var rest = s.minus; [s.minusStage].concat(CARRY).forEach(function (k) {
        if (rest <= 0 || !by[k]) return; var take = Math.min(rest, Math.max(0, by[k].plan)); if (!take) return;
        by[k].plan -= take; rest -= take; note(k, s, -take);
      });
      if (rest > 0) { by[s.minusStage].plan -= rest; note(s.minusStage, s, -rest); }
    });
    return out;
  }
  /* оплачено — только из Заказов (TZ-budget, 5.5): заказы, прошедшие шаг «оплачен», по разделу позиции → категория комплектации */
  var SEC = { finish: 'finish', light: 'light', plumbing: 'plumbing', doors: 'doors', furniture: 'furniture', appliances: 'appliances', decor: 'decor' };
  function paidMap() {
    var O = window.SOVE && window.SOVE.orders, m = {}; if (!O || !O.list) return m;
    /* учебные заказы демо-кабинета поставщика в «оплачено» покупателя не идут */
    (O.mine ? O.mine() : O.list()).forEach(function (o) {
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
  /* бюджет по параметрам расчёта, без плана: 9 + 5 от расчёта плюс выбор в блоках */
  function ofParams(sp, r) {
    var res = compute({ scout: sp, rooms: (sp.rooms || []).map(function (x) { return { name: x.name, m2: x.m2 }; }), state: { concrete: 'concrete_walls', pre: 'whitebox', secondary: 'finished' }[sp.stateId] || 'concrete_walls', type: sp.level });
    return view(res, { board: r.interior, decorCart: decorCart(), paid: paidMap(), objectDelta: (r.interior && r.interior.objectDelta) || 0 });
  }
  /* сколько этот расчёт даст в Бюджете с заменами текущей доски: только доска той же капсулы на всю квартиру (считается от нормы), иначе null. Для строки на результате расчёта */
  function withBoard(sp) {
    var R = window.SOVE && window.SOVE.repair, r = R && R.flats.active() ? R.get() : null, b = r && r.interior;
    if (!b || !b.slots || (b.scope && b.scope !== 'flat') || !boardOfCalc(b, { scout: sp })) return null;
    return ofParams(sp, r);
  }
  /* другой тип ремонта (База / Премиум) — другая пара расчёта со своей ценой открытия, переключатель её не открывает. Без оплаты — уже открытая пара и подписка;
     бюджет из Планировки куплен за ✦ и пересчитывается бесплатно, кроме пары со счётом (капсула дизайнера). Остальное — через расчёт, со счётом */
  function canSwitchType(C) {
    var S = window.SOVE; if (!C || !C.full || !S || !S.scout || !S.scout.access) return false;
    var a = S.scout.access({ capsuleId: C.capsuleId, level: C.type === 'premium' ? 'base' : 'premium', stateId: C.state, area: C.area, rooms: 0, bathrooms: 0, formatId: 'self' });
    if (a.kind === 'opened' || a.kind === 'metod' || a.kind === 'repeat') return true;
    return !!C.P && a.kind !== 'paid' && a.kind !== 'recalc-paid';
  }
  /* бюджет активной квартиры: Планировка (компьют) + выбор в блоках. Нет плана — null (экран показывает пример) */
  function current() {
    var S = window.SOVE, R = S && S.repair, FL = window.SOVE_FLOW, P = FL && FL.planDoc && FL.planDoc();
    if (!R || !R.flats.active()) return null;
    var r = R.get();
    /* без Планировки, но с расчётом бюджета «из Интерьера» — бюджет по параметрам расчёта (план и капсула из квартиры), мебель — по норме.
       Свой расчёт квартиры (сохранённый или «из Интерьера»): открытый пример Планировки (не свой план) его цифру не подменяет */
    var sampleOnly = !!(P && P.T && !P.T.live && r.budgetPlan && r.budgetPlan.source);
    if ((!P || !P.budget || !P.budget.kit || sampleOnly) && r.scoutParams && r.budgetPlan && r.budgetPlan.full && S.scout && S.scout.estimate) {
      var sp = Object.assign({ roughMode: 'share' }, r.scoutParams, { level: r.budgetPlan.type || r.scoutParams.level });   /* режим черновых сохранённого расчёта: новые записи пишут его сами, у старых — прежний, итог не меняется */
      var v0 = ofParams(sp, r);
      v0.full = true; v0.P = null; v0.scoutOnly = true;
      return v0;
    }
    if (!P || !P.budget || !P.budget.kit) return null;
    var v = view(P.budget, { board: r.interior, furniture: P.furniture + (r.interior && r.interior.objectDelta || 0), plan: true, decorCart: decorCart(), paid: paidMap() });
    v.full = !!(FL.budgetFull && FL.budgetFull()); v.P = P;
    return v;
  }

  /* ── «По комнатам» (созвон 28.10): комплектация раскладывается по комнатам плана в одном стиле; сумма считается сама, руками не вписывается.
     Только материалы (Алина 06.11: «по строительным работам не нужно, только по комплектации»): работы и черновые живут в блоке работ, по 5 этапам.
     Чистый helper: ничего не читает из состояния. byRooms({ rooms:[{name, area}], area, cats:[{key, title, sum, market, parts?}], marketTotal? })
     → { rooms:[{name, zone, key, zoneName, area, typical, common?, kit, market, saving, byCat:{key: ₽}}], typical, kit, market, saving }.
     Суммы комнат ВСЕГДА сходятся с входом: каждая строка округляется до 100 ₽, последняя комната добирает разницу.
     Последняя строка — «Общее» (common: true, ТЗ Алины 06.11, справочник комнат): не комната, а всё на квартиру целиком — двери.
     parts в cats — суммы по слотам и зонам из доски Интерьера (view), они точнее правила. market делится вслед за суммой; marketTotal — итог по рынку, остаток округления уходит в последнюю комнату.
     Комнат нет (только «Вся квартира» или площадь вручную) — типовые зоны по площади (typicalRooms), typical: true. ── */
  var ZONE_NAME = { kitchenLiving: 'Кухня-гостиная', bedroom: 'Спальня', bathroom: 'Санузел', hall: 'Прихожая', common: 'На всю квартиру' };
  var ZONE_RE = [['kitchenLiving', /кух|гост|столов/i], ['bathroom', /сан|ванн|душ|туалет|с\/у/i], ['hall', /прих|корид|холл|ниша|гардероб/i], ['bedroom', /спал|детск|кабинет|комнат/i]];
  function zoneOf(name) {
    var KB = window.SOVE_KB; if (KB && KB.zoneOf) return KB.zoneOf(name);
    var hit = ZONE_RE.filter(function (z) { return z[1].test(String(name || '')); })[0]; return hit ? hit[0] : 'bedroom';
  }
  function isWholeName(n) { return /^(вся\s+квартира|вся\s+площадь|общая(\s+площадь)?|квартира\s+целиком)$/i.test(String(n || '').trim()); }
  /* применимость категории к типу зоны. Число — вес на м² относительно спальни (0 — в этой зоне категории нет):
     отделка — санузел дороже за м² (плитка на пол и стены, KB finish-slots: ≈ 2,5× на 47 м² примера);
     group — доли между типами зон независимо от площади (внутри типа — по площади): сантехника — санузел и кухня, техника — только кухня;
     common — не делится по комнатам, идёт в строку «Общее». Нет подходящей комнаты — по площади всех комнат, чтобы сумма сошлась. */
  var ROOM_RULES = {
    finish:           { kitchenLiving: 1,   bedroom: 1, bathroom: 2.5, hall: 1 },
    light:            { kitchenLiving: 1,   bedroom: 1, bathroom: 1,   hall: 1 },
    sockets:          { kitchenLiving: 1.2, bedroom: 1, bathroom: 0.5, hall: 1 },
    plumbing:         { group: { bathroom: 70, kitchenLiving: 30 } },
    doors:            { common: true },
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
    if (rule.group) {
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
  /* ключ комнаты как в R.planZones: первая комната типа — ключ зоны, дальше тип-2, тип-3 */
  function roomKeys(rooms) { var seen = {}; rooms.forEach(function (r) { seen[r.zone] = (seen[r.zone] || 0) + 1; r.key = r.common ? 'common' : seen[r.zone] === 1 ? r.zone : r.zone + '-' + seen[r.zone]; }); return rooms; }
  /* зоны доски → комнаты строки. Ключи совпали — точно по ключам; нет — сумма типа зоны по площади комнат этого типа; типа нет среди комнат — по правилу категории. Сумма сохраняется всегда.
     only — замена «только здесь» по плану: ключ одной комнаты, остальные комнаты того же типа не трогаем */
  function mapToRooms(zones, rooms, rule, only) {
    var KB = window.SOVE_KB, out = rooms.map(function () { return 0; }), types = {}, rest = 0;
    Object.keys(zones || {}).forEach(function (z) { var t = KB && KB.zoneType ? KB.zoneType(z) : String(z).split('-')[0]; (types[t] = types[t] || []).push(z); });
    Object.keys(types).forEach(function (t) {
      var keys = types[t], idx = [], sum = keys.reduce(function (a, z) { return a + Math.round(zones[z] || 0); }, 0);
      rooms.forEach(function (r, i) { if (r.zone === t) idx.push(i); });
      if (!idx.length) { rest += sum; return; }
      var exact = (only || keys.length === idx.length) && keys.every(function (z) { return idx.some(function (i) { return rooms[i].key === z; }); });
      if (exact) { keys.forEach(function (z) { idx.forEach(function (i) { if (rooms[i].key === z) out[i] += Math.round(zones[z] || 0); }); }); return; }
      var part = split(sum, idx.map(function (i) { return rooms[i]; }), {});
      idx.forEach(function (i, n) { out[i] += part[n]; });
    });
    if (rest) split(rest, rooms, rule || {}).forEach(function (v, i) { out[i] += v; });
    return out;
  }
  function byRooms(o) {
    o = o || {};
    var src = (o.rooms || []).filter(function (r) { return r && Number(r.area) > 0 && !isWholeName(r.name); }), typical = false;
    if (!src.length) { src = typicalRooms(o.area || (o.rooms || []).reduce(function (a, r) { return a + (Number(r && r.area) || 0); }, 0)); typical = true; }
    var rooms = roomKeys(src.map(function (r) { var z = r.zone || zoneOf(r.name); return { name: r.name || ZONE_NAME[z], zone: z, zoneName: ZONE_NAME[z] || ZONE_NAME.bedroom, area: Math.round(Number(r.area) * 10) / 10, typical: !!r.typical, kit: 0, market: 0, saving: 0, byCat: {} }; }));
    if (!rooms.length) return { rooms: [], typical: typical, kit: 0, market: 0, saving: 0 };
    var common = { name: 'Общее', zone: 'common', key: 'common', zoneName: ZONE_NAME.common, area: 0, common: true, typical: false, kit: 0, market: 0, saving: 0, byCat: {} };
    /* база комнат из серверного расчёта (budget-api.js rooms): строки товаров по комнатам вместо весов; замены ложатся сверху */
    var base = o.base && o.base.rooms && o.base.rooms.length ? o.base.rooms : null;
    function baseOf(name) { return base ? base.filter(function (x) { return x.name === name; })[0] || null : null; }
    function baseVals(key, f) { return rooms.map(function (r) { var b = baseOf(r.name); return b ? Math.round((f === 'market' ? b.byCatMarket && b.byCatMarket[key] : b.byCat[key]) || 0) : 0; }); }
    var baseCommon = baseOf('Общее');
    (o.cats || []).forEach(function (c) {
      if (!c || !c.key) return;
      var rule = ROOM_RULES[c.key] || null, market = c.market === undefined ? c.sum : c.market;
      if (rule && rule.common) { var one = Math.round(c.sum || 0); common.byCat[c.key] = one; common.kit += one; common.market += Math.round(market || 0); return; }
      var v = rooms.map(function () { return 0; }), mv;
      /* часть категории «на всю квартиру» (техническая покраска) — в «Общее», остальное по комнатам */
      var cb = baseCommon && baseCommon.byCat[c.key] ? Math.round(baseCommon.byCat[c.key]) : 0, cbm = baseCommon && baseCommon.byCatMarket && baseCommon.byCatMarket[c.key] ? Math.round(baseCommon.byCatMarket[c.key]) : 0;
      if (base && cb) { common.byCat[c.key] = (common.byCat[c.key] || 0) + cb; common.kit += cb; common.market += cbm; }
      if (c.parts && c.parts.length && c.norm) {
        /* счёт от нормы: комнаты делятся как до замены, к ним — разница замены. Комната без замены не меняется ни по METOD, ни по рынку */
        var dv = rooms.map(function () { return 0; });
        c.parts.forEach(function (p) { mapToRooms(p.zones, rooms, rule, p.only).forEach(function (x, i) { dv[i] += x; }); });
        var ns = base ? baseVals(c.key, 'kit') : split(Math.round(c.sum || 0) - dv.reduce(function (a, x) { return a + x; }, 0), rooms, rule), nm = base ? baseVals(c.key, 'market') : split(c.norm.market, rooms, rule), mk1 = markup();
        v = ns.map(function (x, i) { return x + dv[i]; });
        mv = nm.map(function (x, i) { return x + Math.round(dv[i] * mk1); });
        var mr = Math.round(market || 0) - cbm - mv.reduce(function (a, x) { return a + x; }, 0), lastD = -1; dv.forEach(function (x, i) { if (x) lastD = i; });   /* часть «Общее» (cbm) уже учтена */
        if (mr && lastD >= 0) mv[lastD] += mr;
      } else if (c.parts && c.parts.length) {
        c.parts.forEach(function (p) { mapToRooms(p.zones, rooms, rule, p.only).forEach(function (x, i) { v[i] += x; }); });
        /* что не разложено по слотам (норма расчёта при счёте «норма плюс замены») — по правилу категории */
        var rest0 = Math.round(c.sum || 0) - v.reduce(function (a, x) { return a + x; }, 0);
        if (rest0) split(rest0, rooms, rule || {}).forEach(function (x, i) { v[i] += x; });
        var k = c.sum ? (market || 0) / c.sum : 1, acc = 0, last = -1; v.forEach(function (x, i) { if (x > 0) last = i; });
        mv = v.map(function (x, i) { if (i === last) return Math.round(market || 0) - acc; var y = Math.round(x * k); acc += y; return y; });
      } else if (base) { v = baseVals(c.key, 'kit'); mv = baseVals(c.key, 'market'); }
      else { v = split(c.sum, rooms, rule); mv = split(market, rooms, rule); }
      rooms.forEach(function (r, i) { r.byCat[c.key] = (r.byCat[c.key] || 0) + v[i]; r.kit += v[i]; r.market += mv[i]; });
    });
    if (typeof o.marketTotal === 'number') {
      var diff = Math.round(o.marketTotal) - rooms.concat(common).reduce(function (a, r) { return a + r.market; }, 0), own = rooms.filter(function (r) { return r.market > 0; });
      if (diff && own.length) own[own.length - 1].market += diff;
    }
    if (common.kit > 0) rooms.push(common);
    return roomsTotals(rooms, typical);
  }
  /* итоги строк: экономия комнаты и всей таблицы */
  function roomsTotals(rooms, typical) {
    rooms.forEach(function (r) { r.saving = Math.max(0, r.market - r.kit); });
    var tot = function (f) { return rooms.reduce(function (a, r) { return a + r[f]; }, 0); };
    return { rooms: rooms, typical: !!typical, kit: tot('kit'), market: tot('market'), saving: Math.max(0, tot('market') - tot('kit')) };
  }
  /* расчёты, сохранённые раньше, к одному виду: только материалы. Двери — в «Общее» (раньше лежали и по комнатам), черновые — не комната (живут в блоке работ),
     работы и итог строки отбрасываем, рынок считает экран. Сумма материалов комнаты — по её категориям, категорий нет — как сохранено. «Общее» — только если в нём что-то есть */
  function withCommon(rooms) {
    var doors = 0, common = null, out = [];
    rooms.forEach(function (r) {
      var isCommon = !!r.common || r.zone === 'common', byCat = Object.assign({}, r.byCat || {}), has = Object.keys(byCat).length > 0;
      delete byCat.rough_mat;
      if (!isCommon && byCat.doors) { doors += byCat.doors; delete byCat.doors; }
      var kit = has ? Object.keys(byCat).reduce(function (a, k) { return a + (Number(byCat[k]) || 0); }, 0) : Number(r.kit) || 0;
      var y = { name: isCommon ? 'Общее' : r.name, zone: isCommon ? 'common' : r.zone, zoneName: isCommon ? ZONE_NAME.common : r.zoneName, area: isCommon ? 0 : r.area, typical: !!r.typical, kit: kit, byCat: byCat };
      if (typeof r.market === 'number' && r.works === undefined) y.market = r.market;   /* новая запись: рынок комнаты как в Расчёте; в старой он считан вместе с черновыми */
      if (isCommon) { y.common = true; y.typical = false; common = y; } else out.push(y);
    });
    if (doors > 0) { common = common || { name: 'Общее', zone: 'common', zoneName: ZONE_NAME.common, area: 0, common: true, typical: false, kit: 0, byCat: {} }; common.byCat.doors = (common.byCat.doors || 0) + doors; common.kit += doors; }
    if (common && common.kit > 0) out.push(common);
    return roomKeys(out);
  }

  /* ── витрина позиций бюджета (Алина 10.11): категории и комнаты раскрываются карточками, как каталог Маркета — фото, цена METOD, ♡ и 🛒.
     Одна на «Бюджет» Моего ремонта и на финальную страницу расчёта. Позиции — товары каталога, привязанные к капсуле (p.capsules);
     где их в каталоге нет — материалы капсулы из базы отделки (нужен SOVE_MATUI, на странице расчёта его нет — там только каталог).
     По комнатам раскладываем по разделу товара: ПРИМЕР правила (ROOM_OF), пока в каталоге нет привязки товара к комнате ── */
  var CAT_KEY = { 'Отделка': 'finish', 'Освещение': 'light', 'Сантехника': 'plumbing', 'Мебель': 'furniture', 'Техника': 'appliances', 'Текстиль и декор': 'decor' };
  var DRY = ['kitchenLiving', 'bedroom', 'hall'];
  var ROOM_OF = { 'Кровати': ['bedroom'], 'Тумбы': ['bedroom'], 'Кресла': ['kitchenLiving'], 'Диваны': ['kitchenLiving'], 'Столы': ['kitchenLiving'], 'Стулья': ['kitchenLiving'],
    'Керамогранит': ['bathroom', 'hall'], 'Плитка': ['bathroom'], 'Напольные покрытия': DRY, 'Краска': DRY, 'Панели': ['kitchenLiving', 'bedroom'], 'Люстры': ['kitchenLiving'], 'Подвесы': ['bedroom', 'hall'] };
  var SLOT_ROOM = { floor: DRY, floorTile: ['bathroom'], bathWalls: ['bathroom'], apron: ['kitchenLiving'], plumbing: ['bathroom'], walls: DRY, accentWall: ['kitchenLiving', 'bedroom'] };
  function capsuleGoods(cid, key, type) {
    var W = window.SOVE, D = W && W.data, KB = window.SOVE_KB, UI = window.SOVE_MATUI, out = [];
    if (!cid || !D) return out;
    D.products.forEach(function (p) { if ((p.capsules || []).indexOf(cid) >= 0 && CAT_KEY[p.category] === key) out.push({ p: p, sub: p.subcat || p.brand || '', rooms: ROOM_OF[p.subcat] || (key === 'plumbing' ? ['bathroom'] : null) }); });
    var kc = !out.length && KB && KB.capsule && UI ? KB.capsule(cid) : null;
    if (kc && kc.slots) KB.SLOTS.filter(function (x) { return x.budgetCat === key; }).forEach(function (x) {
      var sl = kc.slots[x.key], sku = sl && (typeof sl === 'string' ? sl : (type === 'premium' && sl.premium) || sl.base), it = sku && KB.item(sku);
      if (it) out.push({ p: UI.product(it), bg: UI.tileBg(it, 160, 120), sub: x.name, rooms: SLOT_ROOM[x.key] || null });
    });
    return out;
  }
  function roomGoods(cid, zone, type) {
    var out = [];
    KIT.forEach(function (k) { capsuleGoods(cid, k[0], type).forEach(function (g) { if (!g.rooms || g.rooms.indexOf(zone) >= 0) out.push(g); }); });
    return out;
  }
  function goodsHtml(list, empty) {
    var W = window.SOVE, R = W && W.repair, F = W.fmt, esc = F.esc;
    function rub(n) { return F.num(Math.round(n)) + ' ₽'; }
    if (!list.length) return '<small class="bg-mk__no">' + (empty || 'Позиции появятся после подбора') + '</small>';
    return '<div class="bg-mk">' + list.map(function (g) {
      var p = g.p, old = p.retail && p.metod && p.retail > p.metod;
      return '<div class="bg-mc"><span class="bg-mc__pic" style="' + (g.bg ? 'background:' + g.bg : 'background-image:url(' + esc(p.img) + ')') + '"></span>' +
        '<span class="bg-mc__b"><small>' + esc(g.sub || '') + '</small><b>' + esc(p.name) + '</b>' +
          (p.metod ? '<span class="bg-mc__pr">' + (old ? '<s>' + rub(p.retail) + '</s>' : '') + '<em>' + rub(p.metod) + '</em><small>цена METOD</small></span>' : '') + '</span>' +
        (R && R.btns ? '<span class="bg-mc__a">' + R.btns(p, 'budget') + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* работы этапа построчно — на весь объект (примеры работ этапа из договора, WORKS[3]) */
  function workLines(key) { var w = WORKS.filter(function (x) { return x[0] === key; })[0]; return w ? w[3].slice() : []; }
  function linesHtml(lines) { var esc = window.SOVE.fmt.esc; return '<div class="fr-lines">' + lines.map(function (t) { return '<div class="fr-line">' + esc(t) + '</div>'; }).join('') + '</div>'; }

  window.SOVE_BUDGET = { capsuleGoods: capsuleGoods, roomGoods: roomGoods, goodsHtml: goodsHtml, workLines: workLines, linesHtml: linesHtml, compute: compute, areas: areas, fromScout: fromScout, view: view, current: current, withBoard: withBoard, canSwitchType: canSwitchType, paidMap: paidMap, KIT: KIT, WORKS: WORKS,
    byRooms: byRooms, roomsTotals: roomsTotals, mapToRooms: mapToRooms, withCommon: withCommon, typicalRooms: typicalRooms, kitKey: kitKey, zoneOf: zoneOf, ZONE_NAME: ZONE_NAME, ROOM_RULES: ROOM_RULES,
    swapWorks: swapWorks, workIf: workIf, withRoomSlot: withRoomSlot, slotLine: slotLine, slotBase: slotBase, lineStage: lineStage, linesStages: linesStages, rateStages: rateStages };
})();
