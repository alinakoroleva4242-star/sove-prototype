/* «Расстановка мебели» — экран 2 сценария «клиент двигает мебель» (решение команды 16.10).
   Планировка здесь не картинка, а данные: те же рамки, что отдают наши маршруты
   /ai/layout/auto (стартовая расстановка) и /ai/layout/fit (замена не вошедшего).
   Нормы проходов повторяют серверные (ai_knowledge/rules/layout.json), чтобы макет
   показывал ровно то, что скажет проверка в бою. Платных вызовов на экране нет. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  /* свой формат метров: F.num округляет до целых, а здесь важны сантиметры */
  function mm(v) { return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, ''); }
  function m2(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  var root = document.getElementById('ar-root'); if (!root) return;
  var SRC = window.SOVE_ARRANGE; if (!SRC) { root.innerHTML = '<p class="text">Нет данных планировки.</p>'; return; }
  /* свой план клиента с первого шага: разметка и расстановка пришли с сервера, вариант один */
  var LIVE = (window.SOVE_FLOW && S.ui.qs('live')) ? (window.SOVE_FLOW.load().live || null) : null;
  if (LIVE && LIVE.layout && LIVE.layout.rooms) {
    var L = LIVE.layout;
    SRC = { px_per_m: L.px_per_m, flat: LIVE.flat || 'Ваш план', rooms: L.rooms.map(function (r) {
        return { name: r.name, type: r.type, box: r.box, m2: r.doc_m2, part_of: r.part_of || null }; }),
      windows: L.windows || [], doors: L.doors || [], outside: L.outside || [], furniture: L.furniture || [],
      variants: [{ name: 'По вашей анкете', furniture: L.furniture || [], not_placed: LIVE.not_placed || [] }] };
  }

  var PPM = SRC.px_per_m;                       /* пикселей плана в метре */
  var STEP = 0.05 * PPM;                        /* шаг перетаскивания: 5 см */

  /* нормы в метрах — как на сервере */
  var N = { passage_main: .9, passage_narrow: .75, passage_min: .6, bed_side: .6,
            wardrobe_swing_front: .9, worktop_to_island: 1, sink_to_hob_worktop: .4,
            chair_pullout: .75, wc_front: .6, shower_front: .7, touching_max: .1 };
  /* какая норма между этими двумя предметами. Порядок как на сервере: частное раньше общего,
     первое совпадение выигрывает. Без правила «мойка — плита» кухонный ряд, собранный
     вплотную, читался бы как узкий проход. */
  var GAP = [
    [['мойк'], ['плит', 'вароч', 'духов'], 'sink_to_hob_worktop', 'между мойкой и плитой'],
    [['столешниц', 'кухн', 'гарнитур'], ['остров'], 'worktop_to_island', 'между столешницей и островом'],
    [['кроват'], [], 'bed_side', 'с боков и в ногах кровати'],
    [['шкаф', 'гардероб'], [], 'wardrobe_swing_front', 'перед распашным шкафом'],
    [['стул', 'стол на', 'обеден'], [], 'chair_pullout', 'за стулом обеденного стола'],
    [['унитаз'], [], 'wc_front', 'перед унитазом'],
    [['душ'], [], 'shower_front', 'перед душем']
  ];
  var TALL = ['шкаф', 'гардероб', 'стеллаж', 'холодильник', 'пенал', 'колонна'];
  var THIN = .25;                               /* тоньше — проход не перекрывает */

  var VIEWS = [
    { id: 'panel', t: 'Панель снизу', hint: 'план всегда на виду, управление в плашке' },
    { id: 'rooms', t: 'По комнатам', hint: 'одна комната крупно — мелкое легче двигать' },
    { id: 'focus', t: 'Только важное', hint: 'под планом лишь то, что требует внимания' }
  ];
  /* в блоке «Планировка» экран один — «панель снизу»; остальные виды остались для сравнения по ?v= */
  var view = S.ui.qs('v') || 'panel';
  if (!VIEWS.some(function (v) { return v.id === view; })) view = 'panel';

  var PLANS = SRC.variants || [{ name: 'Расстановка', furniture: SRC.furniture }];
  var planIdx = Math.max(0, Math.min(PLANS.length - 1, parseInt(S.ui.qs('plan') || '0', 10) || 0));
  var FLOW = window.SOVE_FLOW || null;                    /* шапка блока и состояние сценария */
  var FL = FLOW ? FLOW.load() : {};
  var INT = FL.interior || null;                           /* выбранный интерьер: нет — A5а «Мебель по размерам», есть — A5б «Твоя квартира в 3D» */
  function itemsOf(i) {
    return (PLANS[i].furniture || []).map(function (f, n) {
      return { id: n, label: f.label, box: f.box.slice(), kind: f.kind };
    });
  }

  var st = {
    items: itemsOf(planIdx),
    picked: null, drag: null, problems: [], swap: null, room: null, listOpen: false,
    tap: null, dragWasMoved: false, raf: 0, zoom: 1, panx: 0, pany: 0, pan: null, whole: false, hand: false,
    undo: [], restored: false, mode3d: false, hide: false, allItems: false
  };
  var START = st.items.map(function (it) { return it.box.slice(); });   /* исходные места для «вернуть» */

  /* ── геометрия ───────────────────────────────────────────────────────── */
  function m(px) { return Math.round(px / PPM * 100) / 100; }
  function w_m(b) { return m(b[2] - b[0]); }
  function d_m(b) { return m(b[3] - b[1]); }
  function over(a, b) {
    return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
           Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  }
  function rooms() { return SRC.rooms; }
  function roomOf(box) {
    var best = null, area = 0;
    rooms().forEach(function (r) { var o = over(box, r.box); if (o > area) { best = r; area = o; } });
    return best;
  }
  function hostName(r) { return r ? (r.part_of || r.name) : null; }
  function need(a, b) {
    var la = (a.label || '').toLowerCase(), lb = (b.label || '').toLowerCase();
    for (var i = 0; i < GAP.length; i++) {
      var first = GAP[i][0], second = GAP[i][1];
      var hitA = first.some(function (w) { return la.indexOf(w) >= 0; });
      var hitB = first.some(function (w) { return lb.indexOf(w) >= 0; });
      if (second.length) {
        var pair = (hitA && second.some(function (w) { return lb.indexOf(w) >= 0; })) ||
                   (hitB && second.some(function (w) { return la.indexOf(w) >= 0; }));
        if (pair) return { m: N[GAP[i][2]], why: GAP[i][3] };
      } else if (hitA || hitB) return { m: N[GAP[i][2]], why: GAP[i][3] };
    }
    return { m: N.passage_narrow, why: 'проход' };
  }

  /* стоит ли третий предмет в промежутке — тогда это не проход, а соседние модули ряда */
  function between(a, b, items, horizontal) {
    var strip = horizontal
      ? [Math.min(a.box[2], b.box[2]), Math.min(a.box[1], b.box[1]), Math.max(a.box[0], b.box[0]), Math.max(a.box[3], b.box[3])]
      : [Math.min(a.box[0], b.box[0]), Math.min(a.box[3], b.box[3]), Math.max(a.box[2], b.box[2]), Math.max(a.box[1], b.box[1])];
    return items.some(function (c) { return c !== a && c !== b && over(c.box, strip) > 200; });
  }
  function thin(b) { return Math.min(b[2] - b[0], b[3] - b[1]) < THIN * PPM; }
  function isTall(label) { var l = (label || '').toLowerCase(); return TALL.some(function (t) { return l.indexOf(t) >= 0; }); }

  /* ── проверка: те же правила, что ai_layout.validate ─────────────────── */
  function validate(items) {
    var out = [];
    items.forEach(function (it) {
      var r = roomOf(it.box);
      if (!r) { out.push({ id: it.id, rule: 'вне стен', note: '«' + it.label + '» вне помещений' }); return; }
      var x1 = it.box[0], y1 = it.box[1], x2 = it.box[2], y2 = it.box[3];
      var out_px = Math.max(r.box[0] - x1, 0) + Math.max(r.box[1] - y1, 0) +
                   Math.max(x2 - r.box[2], 0) + Math.max(y2 - r.box[3], 0);
      if (out_px > Math.max(4, .1 * PPM))
        out.push({ id: it.id, rule: 'вне стен', note: '«' + it.label + '» выходит за «' + r.name + '» на ' + mm(m(out_px)) + ' м' });
    });
    for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
      var a = items[i], b = items[j];
      if (over(a.box, b.box) > 400)
        out.push({ id: a.id, id2: b.id, rule: 'наложение', note: '«' + a.label + '» и «' + b.label + '» накладываются' });
    }
    var touch = N.touching_max * PPM;
    for (var k = 0; k < items.length; k++) for (var n = k + 1; n < items.length; n++) {
      var p = items[k], q = items[n];
      if (hostName(roomOf(p.box)) !== hostName(roomOf(q.box))) continue;   /* разные комнаты — не проход */
      if (thin(p.box) || thin(q.box)) continue;
      var rule = need(p, q), gap = rule.m * PPM;
      var dx = Math.max(p.box[0] - q.box[2], q.box[0] - p.box[2]);
      var dy = Math.max(p.box[1] - q.box[3], q.box[1] - p.box[3]);
      var found = null;
      if (dx > touch && dx < gap && dy < 0 && !between(p, q, items, true)) found = dx;
      else if (dy > touch && dy < gap && dx < 0 && !between(p, q, items, false)) found = dy;
      if (found !== null)
        out.push({ id: p.id, id2: q.id, rule: 'узкий проход',
                   note: rule.why + ': между «' + p.label + '» и «' + q.label + '» ' + mm(m(found)) + ' м, нужно ' + mm(rule.m) + ' м' });
    }
    SRC.doors.forEach(function (door) {
      items.forEach(function (it) {
        if (thin(it.box)) return;
        if (over(it.box, door.box) > 400)
          out.push({ id: it.id, rule: 'дверь занята',
                     note: '«' + it.label + '» перед ' + (door.kind === 'entrance' ? 'входной дверью' : 'дверью «' + door.a + '» — «' + door.b + '»') });
      });
    });
    SRC.windows.forEach(function (win) {
      items.forEach(function (it) {
        if (isTall(it.label) && over(it.box, win.box) > 400)
          out.push({ id: it.id, rule: 'окно закрыто', note: '«' + it.label + '» перекрывает окно' });
      });
    });
    return out;
  }

  var SNAP = 0.25 * PPM;              /* 25 см — с какого расстояния предмет прилипает */

  /* прилипание к стенам комнаты и к бокам соседей: иначе клиент целится вручную,
     остаются щели в пару сантиметров, и проверка ругается на «узкий проход» */
  function snap(box, id) {
    var r = roomOf(box);
    if (!r) return box;
    var hosts = [r.box].concat(rooms().filter(function (x) {
      return x.part_of === r.name || x.name === r.part_of;
    }).map(function (x) { return x.box; }));
    var w = box[2] - box[0], h = box[3] - box[1];
    var x = box[0], y = box[1], bestX = null, bestY = null;

    function tryX(v) { var d = Math.abs(x - v); if (d < SNAP && (bestX === null || d < bestX.d)) bestX = { v: v, d: d }; }
    function tryY(v) { var d = Math.abs(y - v); if (d < SNAP && (bestY === null || d < bestY.d)) bestY = { v: v, d: d }; }

    hosts.forEach(function (b) {
      tryX(b[0]); tryX(b[2] - w);               /* к левой и правой стене */
      tryY(b[1]); tryY(b[3] - h);               /* к верхней и нижней */
    });
    st.items.forEach(function (o) {
      if (o.id === id) return;
      tryX(o.box[2]); tryX(o.box[0] - w);       /* вплотную справа и слева от соседа */
      tryY(o.box[3]); tryY(o.box[1] - h);
      tryX(o.box[0]); tryY(o.box[1]);           /* в одну линию с соседом */
    });
    if (bestX) x = bestX.v;
    if (bestY) y = bestY.v;
    return [x, y, x + w, y + h];
  }

  /* ── шаги назад ──────────────────────────────────────────────────────── */
  function remember() {
    st.undo.push(st.items.map(function (it) { return it.box.slice(); }));
    if (st.undo.length > 30) st.undo.shift();
  }
  function undo() {
    var prev = st.undo.pop();
    if (!prev) return;
    st.items.forEach(function (it, i) { if (prev[i]) it.box = prev[i].slice(); });
    save(); render();
  }

  /* ── расстановка переживает перезаход ────────────────────────────────── */
  /* «Сохранить в Мой ремонт»: 3D-план с расстановкой и комнаты с м² (ТЗ «Мой ремонт», п. 2.1) */
  function planForRepair() {
    var rooms = (SRC.rooms || []).filter(function (r) { return !r.part_of && r.m2; }).map(function (r) { return { name: r.name, m2: r.m2 }; });
    if (!rooms.length) rooms = D.scout.samplePlan.rooms.map(function (r) { return { name: r.name, m2: r.area }; });
    return { level: 'developer_plan', img: 'assets/img/demo/1-domik-vsya-kvartira.jpg', rooms: rooms, variant: 'Расстановка по анкете', jk: LIVE ? '' : 'PRIDE' };
  }
  var SAVE_KEY = 'sove.arrange.layout.v1' + (LIVE && LIVE.name ? ':' + LIVE.name : '');
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(st.items.map(function (it) {
        return { label: it.label, box: it.box };
      })));
    } catch (err) {}
  }
  function restore() {
    try {
      var raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!raw || !raw.length) return false;
      var byLabel = {};
      raw.forEach(function (r) { byLabel[r.label] = r.box; });
      var hit = 0;
      st.items.forEach(function (it) {
        if (byLabel[it.label]) { it.box = byLabel[it.label].slice(); hit++; }
      });
      return hit > 0;
    } catch (err) { return false; }
  }

  /* повернуть на 90° вокруг центра: шкаф у длинной стены разворачивают к короткой,
     и без этого расстановку не поправишь — только подвинуть целиком */
  function rotate(it) {
    var cx = (it.box[0] + it.box[2]) / 2, cy = (it.box[1] + it.box[3]) / 2;
    var w = it.box[2] - it.box[0], h = it.box[3] - it.box[1];
    it.box = [cx - h / 2, cy - w / 2, cx + h / 2, cy + w / 2];
  }

  /* ── «не влезло»: до какой ширины предмет встаёт здесь ───────────────── */
  function fits(item, want) {
    var others = st.items.filter(function (x) { return x.id !== item.id; });
    var w = want, floor = .4;
    while (w >= floor - 1e-9) {
      var box = [item.box[0], item.box[1], item.box[0] + w * PPM, item.box[1] + (item.box[3] - item.box[1])];
      var trial = others.concat([{ id: item.id, label: item.label, box: box, kind: item.kind }]);
      var bad = validate(trial).filter(function (p) { return p.id === item.id || p.id2 === item.id; });
      if (!bad.length) return Math.round(w * 100) / 100;
      w -= .05;
    }
    return null;
  }

  /* ── подбор замены из каталога ───────────────────────────────────────── */
  /* какой подкатегории каталога соответствует предмет расстановки.
     Чего тут нет — того нет и в каталоге: шкафов, стеллажей, душей, кухонных модулей. */
  var SUBCAT = {
    'прикроватная тумба': 'Тумбы', 'тумба под раковину': 'Мебель для ванной',
    'диван': 'Диваны', 'кресло': 'Кресла', 'кровать': 'Кровати', 'комод': 'Комоды',
    'обеденный стол': 'Столы обеденные', 'журнальный столик': 'Столы журнальные',
    'стул': 'Стулья', 'пуф': 'Пуфы', 'ванна': 'Ванны',
    'унитаз': 'Унитазы', 'раковина': 'Раковины', 'смеситель': 'Смесители',
    'холодильник': 'Холодильники', 'варочная панель': 'Духовые шкафы', 'духов': 'Духовые шкафы',
    'вытяжка': 'Вытяжки', 'кофемашина': 'Кофемашины',
    'люстра': 'Люстры', 'бра': 'Бра', 'торшер': 'Торшеры', 'настольная лампа': 'Настольные лампы'
  };
  function kindOf(label) {
    var l = (label || '').toLowerCase();
    var keys = Object.keys(SUBCAT);
    for (var i = 0; i < keys.length; i++) if (l.indexOf(keys[i]) >= 0) return keys[i];
    return null;
  }
  /* ширина из названия: «200 см», «200/60/92», «1600х700» — в каталоге габаритов пока нет */
  function widthFromName(name) {
    var s = String(name || '');
    var m1 = s.match(/(\d{2,3})\s*\/\s*\d{2,3}\s*\/\s*\d{2,3}/); if (m1) return +m1[1] / 100;
    var m2 = s.match(/(\d{2,3})\s*см/); if (m2) return +m2[1] / 100;
    var m3 = s.match(/(\d{3,4})\s*[х×x]\s*\d{2,4}/); if (m3) return (+m3[1] > 400 ? +m3[1] / 1000 : +m3[1] / 100);
    return null;
  }
  function analogs(label, maxW) {
    var kind = kindOf(label); if (!kind) return [];
    var sub = SUBCAT[kind];
    return (D.products || []).filter(function (p) { return p.subcat === sub; }).map(function (p) {
      var w = widthFromName(p.name);
      return { p: p, w: w, ok: w === null ? null : w <= maxW + 1e-9 };
    }).sort(function (a, b) {
      if (a.ok === b.ok) return (a.w || 9) - (b.w || 9);
      return a.ok === true ? -1 : b.ok === true ? 1 : a.ok === null ? -1 : 1;
    }).slice(0, 4);
  }

  /* цена предмета: берём первый подходящий товар каталога по виду. На экране
     расстановки клиент сразу видит, во что обходится то, что он двигает. */
  var CAT = window.SOVE_ARRANGE_CATALOG || {};
  var priceCache = {};
  function priceOf(label) {
    if (label in priceCache) return priceCache[label];
    /* сначала товары боевого каталога под этот вид, потом образец из data.js */
    var own = CAT[label];
    if (own && own.length) { priceCache[label] = own[0]; return own[0]; }
    var kind = kindOf(label), sub = kind ? SUBCAT[kind] : null;
    var list = sub ? (D.products || []).filter(function (p) { return p.subcat === sub; }) : [];
    list.sort(function (a, b) { return (a.metod || 0) - (b.metod || 0); });
    priceCache[label] = list.length ? list[Math.floor(list.length / 2)] : null;
    return priceCache[label];
  }
  /* варианты товара для блока замены: боевой каталог важнее образца */
  function catalogOptions(label) { return (CAT[label] || []).slice(0, 3); }
  function total() {
    var sum = 0, n = 0;
    st.items.forEach(function (it) {
      var p = priceOf(it.label);
      if (p) { sum += p.metod || 0; n++; }
    });
    return { sum: sum, n: n };
  }
  /* товар под предмет: при выбранной капсуле — из её товаров той же подкатегории, иначе средний по Маркету */
  function productFor(label) {
    if (INT && INT.type === 'capsule' && S.repair) {
      var kind = kindOf(label), sub = kind ? SUBCAT[kind] : null;
      var mine = sub ? S.repair.capsuleProducts(INT.id).filter(function (p) { return p.subcat === sub; }) : [];
      if (mine.length) return mine[0];
    }
    return priceOf(label);
  }
  function goods() {
    return st.items.map(function (it) {
      var p = productFor(it.label), r = roomOf(it.box);
      if (p && S.repair) S.repair.registerProduct(p);
      return { it: it, p: p, room: r ? (r.part_of || r.name) : '' };
    });
  }
  function goodsSum() { return goods().reduce(function (a, g) { return a + (g.p ? g.p.metod || 0 : 0); }, 0); }
  /* «Мебель на плане» — общий список с выбором галочками (раздел 16) */
  function goodsBlock() {
    return FLOW.productList(goods().map(function (g) { return { p: g.p, label: g.it.label, room: g.room, pick: g.it.id }; }),
      { key: 'plan-goods', title: 'Мебель на всю квартиру', limit: 4, rerender: render });
  }

  /* ── отрисовка ───────────────────────────────────────────────────────── */
  /* рамка плана — по самим данным: другая квартира другого размера впишется сама */
  var VB = (function () {
    var all = SRC.rooms.map(function (r) { return r.box; })
      .concat((SRC.outside || []).map(function (o) { return o.box; }));
    var pad = 0.35 * PPM;
    var x1 = Math.min.apply(null, all.map(function (b) { return b[0]; })) - pad;
    var y1 = Math.min.apply(null, all.map(function (b) { return b[1]; })) - pad;
    var x2 = Math.max.apply(null, all.map(function (b) { return b[2]; })) + pad;
    var y2 = Math.max.apply(null, all.map(function (b) { return b[3]; })) + pad;
    return [Math.round(x1), Math.round(y1), Math.round(x2 - x1), Math.round(y2 - y1)];
  })();
  /* сколько единиц плана приходится на пиксель экрана — по матрице самого SVG */
  function userPerPixel(svg) {
    try {
      var m = svg.getScreenCTM();
      if (m && m.a) return 1 / m.a;
    } catch (err) {}
    return (VB[2] / st.zoom) / svg.getBoundingClientRect().width;
  }

  /* не даём уехать в пустоту: центр рамки держим в пределах плана */
  function clampPan() {
    var w = VB[2] / st.zoom, h = VB[3] / st.zoom;
    /* план обрезан по краям (он заполняет область), поэтому сдвиг нужен и при 100%:
       разрешаем уехать на 45% размера — дальше показывать уже нечего */
    var limX = Math.max(VB[2] * 0.45, (VB[2] - w) / 2);
    var limY = Math.max(VB[3] * 0.45, (VB[3] - h) / 2);
    st.panx = Math.max(-limX, Math.min(limX, st.panx));
    st.pany = Math.max(-limY, Math.min(limY, st.pany));
  }

  function viewBox() {
    /* «по комнатам» показывает одну комнату крупно: кадрируем с полем в 20 px */
    if (view !== 'rooms' || !st.room) {
      /* зум: сужаем рамку вокруг центра, клиент приближает квартиру как карту */
      var w = VB[2] / st.zoom, h = VB[3] / st.zoom;
      var x = VB[0] + (VB[2] - w) / 2 + st.panx, y = VB[1] + (VB[3] - h) / 2 + st.pany;
      return [x, y, w, h].join(' ');
    }
    var r = rooms().filter(function (x) { return x.name === st.room; })[0];
    if (!r) return VB.join(' ');
    var pad = 22, b = r.box;
    return [b[0] - pad, b[1] - pad, (b[2] - b[0]) + pad * 2, (b[3] - b[1]) + pad * 2].join(' ');
  }
  function inView(it) {
    if (view !== 'rooms' || !st.room) return true;
    var r = roomOf(it.box);
    return !r || (r.part_of || r.name) === st.room;
  }

  var WALL = Math.round(0.25 * PPM);  /* стена 25 см — в пикселях этого плана */

  /* ── план квартиры ───────────────────────────────────────────────────── */
  function wallLayer() {
    /* комнаты приходят по внутренним размерам: между ними пустота толщиной стены.
       Подкладываем серую плиту — промежутки читаются как стены, квартира как одно целое. */
    return rooms().map(function (r) {
      var b = r.box;
      return '<rect class="ar-wall" x="' + (b[0] - WALL) + '" y="' + (b[1] - WALL) +
        '" width="' + (b[2] - b[0] + WALL * 2) + '" height="' + (b[3] - b[1] + WALL * 2) + '" rx="3"/>';
    }).join('') +
    /* угол вне квартиры вырезаем из плиты, иначе дом выглядит прямоугольным */
    (SRC.outside || []).map(function (o) {
      var b = o.box;
      return '<rect class="ar-out" x="' + b[0] + '" y="' + b[1] +
        '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '"/>';
    }).join('');
  }

  function openingsLayer() {
    var out = [];
    /* окно: полоса по той стене комнаты, на которой оно стоит. В данных окно задано
       вокруг линии стены плана и висело снаружи контура — привязываем к комнате. */
    (SRC.windows || []).forEach(function (w) {
      var r = rooms().filter(function (x) { return (x.type || x.name).toLowerCase() === String(w.room).toLowerCase(); })[0];
      if (!r) return;
      var b = r.box, s = w.box, box;
      if (w.wall === 'west') box = [b[0] - WALL, Math.max(s[1], b[1]), b[0], Math.min(s[3], b[3])];
      else if (w.wall === 'east') box = [b[2], Math.max(s[1], b[1]), b[2] + WALL, Math.min(s[3], b[3])];
      else if (w.wall === 'north') box = [Math.max(s[0], b[0]), b[1] - WALL, Math.min(s[2], b[2]), b[1]];
      else box = [Math.max(s[0], b[0]), b[3], Math.min(s[2], b[2]), b[3] + WALL];
      out.push('<rect class="ar-win" x="' + box[0] + '" y="' + box[1] +
        '" width="' + (box[2] - box[0]) + '" height="' + (box[3] - box[1]) + '"/>');
    });
    /* дверь: ищем стену между двумя комнатами и ставим проём на неё. В данных у двери
       только зона вокруг проёма, поэтому раньше створка висела посреди комнаты. */
    (SRC.doors || []).forEach(function (d) {
      var b = d.box, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      var span = Math.min(b[2] - b[0], b[3] - b[1]);
      var ra = roomByType(d.a), rb = roomByType(d.b);
      var wall = null;                           /* {horizontal, at, from, to} */
      if (ra && rb) wall = sharedWall(ra.box, rb.box);
      if (!wall && ra) wall = outerWall(ra.box, cx, cy);
      if (!wall) return;
      var pos = Math.max(wall.from + span / 2, Math.min(wall.horizontal ? cx : cy, wall.to - span / 2));
      var gap = wall.horizontal
        ? [pos - span / 2, wall.at - WALL / 2 - 1, pos + span / 2, wall.at + WALL / 2 + 1]
        : [wall.at - WALL / 2 - 1, pos - span / 2, wall.at + WALL / 2 + 1, pos + span / 2];
      out.push('<rect class="ar-gap" x="' + gap[0] + '" y="' + gap[1] +
        '" width="' + (gap[2] - gap[0]) + '" height="' + (gap[3] - gap[1]) + '"/>');
      var ent = d.kind === 'entrance', side = wall.inward || 1;
      if (wall.horizontal) {
        out.push('<line class="ar-leaf' + (ent ? ' is-entrance' : '') + '" x1="' + (pos - span / 2) +
          '" y1="' + wall.at + '" x2="' + (pos - span / 2) + '" y2="' + (wall.at + span * side) + '"/>');
        out.push('<path class="ar-arc" d="M ' + (pos - span / 2) + ' ' + (wall.at + span * side) +
          ' A ' + span + ' ' + span + ' 0 0 ' + (side > 0 ? 1 : 0) + ' ' + (pos + span / 2) + ' ' + wall.at + '"/>');
      } else {
        out.push('<line class="ar-leaf' + (ent ? ' is-entrance' : '') + '" x1="' + wall.at +
          '" y1="' + (pos - span / 2) + '" x2="' + (wall.at + span * side) + '" y2="' + (pos - span / 2) + '"/>');
        out.push('<path class="ar-arc" d="M ' + (wall.at + span * side) + ' ' + (pos - span / 2) +
          ' A ' + span + ' ' + span + ' 0 0 ' + (side > 0 ? 0 : 1) + ' ' + wall.at + ' ' + (pos + span / 2) + '"/>');
      }
    });
    return out.join('');
  }

  function roomByType(t) {
    if (!t) return null;
    return rooms().filter(function (r) {
      return !r.part_of && String(r.type || r.name).toLowerCase() === String(t).toLowerCase();
    })[0] || null;
  }
  /* общая стена двух комнат: между ними зазор меньше метра и есть перекрытие вдоль неё */
  function sharedWall(a, b) {
    var near = 1.1 * PPM;
    if (Math.abs(b[1] - a[3]) < near && Math.min(a[2], b[2]) > Math.max(a[0], b[0]))
      return { horizontal: true, at: (a[3] + b[1]) / 2, from: Math.max(a[0], b[0]), to: Math.min(a[2], b[2]), inward: 1 };
    if (Math.abs(a[1] - b[3]) < near && Math.min(a[2], b[2]) > Math.max(a[0], b[0]))
      return { horizontal: true, at: (a[1] + b[3]) / 2, from: Math.max(a[0], b[0]), to: Math.min(a[2], b[2]), inward: -1 };
    if (Math.abs(b[0] - a[2]) < near && Math.min(a[3], b[3]) > Math.max(a[1], b[1]))
      return { horizontal: false, at: (a[2] + b[0]) / 2, from: Math.max(a[1], b[1]), to: Math.min(a[3], b[3]), inward: 1 };
    if (Math.abs(a[0] - b[2]) < near && Math.min(a[3], b[3]) > Math.max(a[1], b[1]))
      return { horizontal: false, at: (a[0] + b[2]) / 2, from: Math.max(a[1], b[1]), to: Math.min(a[3], b[3]), inward: -1 };
    return null;
  }
  /* входная дверь: наружная стена комнаты, ближайшая к зоне двери */
  function outerWall(b, cx, cy) {
    var d = [{ v: Math.abs(cy - b[1]), w: { horizontal: true, at: b[1], from: b[0], to: b[2], inward: 1 } },
             { v: Math.abs(cy - b[3]), w: { horizontal: true, at: b[3], from: b[0], to: b[2], inward: -1 } },
             { v: Math.abs(cx - b[0]), w: { horizontal: false, at: b[0], from: b[1], to: b[3], inward: 1 } },
             { v: Math.abs(cx - b[2]), w: { horizontal: false, at: b[2], from: b[1], to: b[3], inward: -1 } }];
    d.sort(function (p, q) { return p.v - q.v; });
    return d[0].w;
  }

  function planSvg() {
    var parts = [wallLayer()], labels = [];
    rooms().forEach(function (r) {
      var b = r.box;
      parts.push('<rect class="ar-room" x="' + b[0] + '" y="' + b[1] +
        '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '"/>');
    });
    parts.push(openingsLayer());

    var bad = {};
    st.problems.forEach(function (p) { bad[p.id] = 1; if (p.id2 !== undefined) bad[p.id2] = 1; });
    var taken = [];                                  /* занятые подписями места */
    /* подписи комнат ставим первыми: они главнее, выноски обходят их, а не наоборот */
    rooms().forEach(function (r) {
      if (r.part_of) return;
      var cap = r.name.toUpperCase() + (r.m2 ? ' · ' + m2(r.m2) + ' м²' : '');
      var wid = cap.length * 6.6 + 10;
      var spot = freeSpot(r, wid, 17, taken);
      labels.push('<rect class="ar-rbg" x="' + spot[0] + '" y="' + spot[1] +
        '" width="' + wid + '" height="17" rx="3"/>' +
        '<text class="ar-rname" x="' + (spot[0] + 5) + '" y="' + (spot[1] + 12.5) + '">' + esc(cap) + '</text>');
    });
    st.items.forEach(function (it) {
      if (!inView(it)) return;
      var b = it.box, w = b[2] - b[0], h = b[3] - b[1];
      var on = st.picked === it.id;
      var cls = 'ar-item' + (bad[it.id] ? ' is-bad' : '') + (on ? ' is-on' : '');
      var name = short(it.label, w, h);
      parts.push('<g class="' + cls + '" data-id="' + it.id + '" tabindex="0" role="button" aria-label="' +
        esc(it.label) + ', ' + mm(w_m(b)) + ' на ' + mm(d_m(b)) + ' метра' + (bad[it.id] ? ', есть замечание' : '') + '">' +
        '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + w + '" height="' + h + '" rx="3"/>' +
        (name ? '<text x="' + ((b[0] + b[2]) / 2) + '" y="' + ((b[1] + b[3]) / 2 + 4.5) + '">' + esc(name) + '</text>' : '') +
        (bad[it.id] ? '<circle class="ar-mark" cx="' + (b[2] - 7) + '" cy="' + (b[1] + 7) + '" r="8"/>' +
          '<text class="ar-mark__t" x="' + (b[2] - 7) + '" y="' + (b[1] + 11) + '">!</text>' : '') +
        (on ? '<g class="ar-rot" data-rot="' + it.id + '"><circle cx="' + (b[2] + 2) + '" cy="' + (b[1] - 2) +
          '" r="17"/><text x="' + (b[2] + 2) + '" y="' + (b[1] + 4) + '">↻</text></g>' : '') +
        '</g>');
      /* узкому предмету подпись внутрь не влезает — выносим её рядом, с подложкой */
      if (!name) labels.push(callout(it, taken));
    });

    return '<svg class="ar-plan' + (st.hand ? ' is-hand' : '') + (INT ? '' : ' is-sizes') + (st.hide ? ' is-empty' : '') + '" id="ar-svg" viewBox="' + viewBox() + '" role="img" ' +
      /* при 100% вся квартира видна целиком, при увеличении план заполняет область и таскается */
      'preserveAspectRatio="' + (st.zoom > 1.001 ? 'xMidYMid slice' : 'xMidYMid meet') + '" ' +
      'aria-label="План квартиры с мебелью: ' + st.items.length + ' предметов">' +
      parts.join('') + labels.join('') + '</svg>';
  }

  /* подпись сбоку от узкого предмета: тумба 45 см и полотенцесушитель иначе безымянные */
  function callout(it, taken) {
    var b = it.box, text = shortName(it.label);
    var w = text.length * 6.2 + 8, h = 16;
    var host = roomOf(b) || { box: VB.slice(0, 2).concat(VB.slice(2)) };
    var right = b[2] + 5 + w <= host.box[2] - 2;
    var x = right ? b[2] + 5 : b[0] - 5 - w;
    var y = Math.max(b[1], host.box[1] + 2);
    var tries = 0;
    function clash() {
      var box = [x, y, x + w, y + h];
      return taken.some(function (t) { return ai_overlap(box, t) > 1; }) ||
             st.items.some(function (o) { return o.id !== it.id && ai_overlap(box, o.box) > 1; });
    }
    while (tries < 12 && clash()) {
      y += h + 2;
      if (y + h > host.box[3] - 2) { y = host.box[1] + 2; x = right ? b[0] - 5 - w : b[2] + 5; }
      tries++;
    }
    taken.push([x, y, x + w, y + h]);
    return '<g class="ar-call" data-id="' + it.id + '">' +
      '<line x1="' + (right ? b[2] : b[0]) + '" y1="' + ((b[1] + b[3]) / 2) + '" x2="' + (right ? x : x + w) +
        '" y2="' + (y + h / 2) + '"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3"/>' +
      '<text x="' + (x + 4) + '" y="' + (y + 11.5) + '">' + esc(text) + '</text></g>';
  }

  /* место под подпись комнаты: ищем угол, где нет мебели и чужих подписей */
  function freeSpot(r, w, h, taken) {
    var b = r.box, pads = [[b[0] + 4, b[1] + 4], [b[2] - w - 4, b[1] + 4],
                           [b[0] + 4, b[3] - h - 4], [b[2] - w - 4, b[3] - h - 4]];
    for (var i = 0; i < pads.length; i++) {
      var x = pads[i][0], y = pads[i][1], box = [x, y, x + w, y + h];
      var busy = st.items.some(function (it) { return ai_overlap(box, it.box) > 1; }) ||
                 taken.some(function (t) { return ai_overlap(box, t) > 1; });
      if (!busy) { taken.push(box); return [x, y]; }
    }
    taken.push([pads[0][0], pads[0][1], pads[0][0] + w, pads[0][1] + h]);
    return pads[0];
  }
  function ai_overlap(a, b) {
    return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
           Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  }

  /* короткое имя для плана: «Варочная панель с духовкой» на рамке 60 см не читается,
     а обрезанное «Вароч…» не говорит ничего. Полное название остаётся в панели и списке. */
  var SHORT = {
    'Прикроватная тумба': 'Тумба', 'Полотенцесушитель': 'Сушитель', 'Стирка-сушка колонна': 'Стирка',
    'Варочная панель с духовкой': 'Плита', 'Посудомоечная машина': 'Посудомойка',
    'Холодильник встроенный': 'Холодильник', 'Угловой модуль': 'Угол кухни', 'Рабочее место': 'Стол',
    'Встроенный шкаф': 'Шкаф', 'Обеденный стол': 'Обед. стол', 'Журнальный столик': 'Столик',
    'Тумба под раковину': 'Раковина', 'Душевое ограждение': 'Душ'
  };
  function shortName(label) { return SHORT[label] || String(label).split(' ')[0]; }

  /* на узкой рамке обрезанное «Прикроватн…» хуже пустоты: такие предметы выбираются из списка */
  function short(label, w_px, h_px) {
    if (h_px !== undefined && h_px < 17) return '';
    var fit = Math.floor(w_px / 7.2), w = shortName(label);
    return w.length <= fit ? w : '';        /* не влезло целиком — уйдёт в выноску */
  }

  /* список предметов под планом: в тумбу 45 см пальцем не попасть, а в строку — попадёшь */
  function itemsBlock() {
    if (view === 'focus' && !st.listOpen) return '';
    if (view === 'panel' && !st.listOpen)
      return '<button type="button" class="btn btn--ghost btn--block btn--sm" data-act="list">' +
        why_list() + '</button>';
    var bad = {};
    st.problems.forEach(function (p) { bad[p.id] = 1; if (p.id2 !== undefined) bad[p.id2] = 1; });
    var byRoom = {};
    st.items.forEach(function (it) {
      var r = roomOf(it.box), key = r ? (r.part_of || r.name) : 'Вне комнат';
      (byRoom[key] = byRoom[key] || []).push(it);
    });
    return '<section class="pb ar-items"><span class="pb__k">Предметы · ' + st.items.length + '</span>' +
      Object.keys(byRoom).map(function (room) {
        return '<div class="ar-items__g"><b>' + esc(room) + '</b><div class="lane ar-items__l">' +
          byRoom[room].map(function (it) {
            return '<button type="button" class="chip ar-chip' + (st.picked === it.id ? ' is-on' : '') +
              (bad[it.id] ? ' is-bad' : '') + '" data-pick="' + it.id + '">' +
              esc(it.label) + ' <i>' + mm(w_m(it.box)) + '</i></button>';
          }).join('') + '</div></div>';
      }).join('') +
      '<button type="button" class="btn btn--link btn--sm" data-act="list-off">Свернуть список</button>' +
      '</section>';
  }
  function why_list() { return 'Все предметы · ' + st.items.length + ' — выбрать из списка'; }

  function switcher() {
    var v = VIEWS.filter(function (x) { return x.id === view; })[0];
    return '<div class="ar-sw"><span>вариант:</span>' + VIEWS.map(function (x) {
        return '<button type="button" class="chip chip--xs' + (x.id === view ? ' is-on' : '') +
          '" data-view="' + x.id + '" title="' + esc(x.hint) + '">' + esc(x.t) + '</button>';
      }).join('') + '</div>';
  }

  function roomTabs() {
    if (view !== 'rooms') return '';
    var list = rooms().filter(function (r) { return !r.part_of; });
    return '<div class="lane ar-tabs">' +
      '<button type="button" class="chip' + (!st.room ? ' is-on' : '') + '" data-room="">Вся квартира</button>' +
      list.map(function (r) {
        return '<button type="button" class="chip' + (st.room === r.name ? ' is-on' : '') +
          '" data-room="' + esc(r.name) + '">' + esc(r.name) + '</button>';
      }).join('') + '</div>';
  }

  /* чипы расстановки (A5б): «Рекомендовано» / «Больше хранения» / «С рабочим местом» (Алина 24.10: не «Как советует SOVE») */
  function planName(n) { return /^Как советует/.test(n) ? 'Рекомендовано' : n; }
  function plansBlock() {
    if (PLANS.length < 2 || !INT) return '';
    return '<div class="pz-chips">' + PLANS.map(function (pl, i) {
      return '<button type="button" class="pz-chip' + (i === planIdx ? ' is-on' : '') +
        '" data-plan="' + i + '">' + esc(planName(pl.name)) + '</button>';
    }).join('') + '</div>';
  }

  function head() {
    if (VAR) return (FLOW ? FLOW.blockHead('flow', 'furniture') : '') +
      '<div class="pz-title"><h2>Мебель на варианте ' + esc(VLET[VAR.id]) + '</h2><span>3D · двигай и меняй · переключение вариантов бесплатно' +
      (INT ? ' · ' + esc(INT.name) + ' · <button type="button" class="pz-link pz-link--in" data-act="change-int">сменить интерьер</button>' : '') + '</span></div>';
    var sub = INT
      ? esc(INT.name) + ' · ' + st.items.length + ' предметов · <button type="button" class="pz-link pz-link--in" data-act="change-int">сменить интерьер</button>'
      : 'интерьер не выбран — показываем габариты';
    return (FLOW ? FLOW.blockHead('flow', 'furniture') : '') +
      '<div class="pz-title"><h2>' + (INT ? 'Твоя квартира в 3D' : 'Мебель по размерам') + '</h2><span>' + sub + '</span></div>';
  }
  /* плашка поверх плана: первое замечание оранжевым или «замечаний нет» зелёным */
  function verdict() {
    /* замечания — одним списком под планом; на плашке только число (она живая — меняется, пока двигаешь) */
    if (st.problems.length) return '<span class="pz-verdict is-bad">! Замечаний: ' + st.problems.map(function (p) { return p.note; }).filter(function (n, i, a) { return a.indexOf(n) === i; }).length + ' · список ниже</span>';
    return '<span class="pz-verdict">' + (INT ? '✓ Замечаний нет · проходы и двери свободны' : '✓ Всё влезло · проходы свободны') + '</span>';
  }

  function problemsBlock() {
    if (!st.problems.length) return '';
    var seen = {}, list = [];
    st.problems.forEach(function (p) { if (!seen[p.note]) { seen[p.note] = 1; list.push(p); } });
    return '<section class="pb ar-bad"><span class="pb__k">Замечания · ' + list.length + '</span>' +
      '<ul class="ar-list">' + list.map(function (p) {
        return '<li><i class="ar-dot"></i><span><b>' + esc(p.rule) + '.</b> ' + esc(p.note) + '</span></li>';
      }).join('') + '</ul>' +
      '</section>';
  }

  function pickedBlock() {
    var it = st.items.filter(function (x) { return x.id === st.picked; })[0];
    if (!it) return '<section class="pb ar-hint"><span class="pb__k">Как двигать</span>' +
      '<b class="pb__t">Нажмите предмет на плане</b>' +
      '<p class="text">Появятся размеры, кнопки «шире / уже» и подбор замены, если предмет не встаёт.</p></section>';
    var r = roomOf(it.box), maxW = fits(it, Math.max(w_m(it.box) + 1.2, 2.6));
    return '<section class="pb ar-pick">' +
      '<button type="button" class="ar-x" data-act="close" aria-label="Закрыть">×</button>' +
      '<span class="pb__k">' + esc(r ? r.name : 'вне комнаты') + '</span>' +
      '<b class="pb__t">' + esc(it.label) + '</b>' +
      '<p class="ar-size">' + mm(w_m(it.box)) + ' × ' + mm(d_m(it.box)) + ' м' +
        (maxW ? ' · на этом месте максимум <b>' + mm(maxW) + ' м</b>' : '') +
        (priceOf(it.label) ? ' · от <b>' + F.rub(priceOf(it.label).metod) + '</b>' : '') + '</p>' +
      '<div class="lane ar-ctl">' +
        '<button type="button" class="chip" data-w="-0.1">уже на 10 см</button>' +
        '<button type="button" class="chip" data-w="0.1">шире на 10 см</button>' +
        '<button type="button" class="chip" data-act="rot">повернуть на 90°</button>' +
        '<button type="button" class="chip" data-act="back">вернуть на место</button>' +
      '</div>' +
      (kindOf(it.label) || catalogOptions(it.label).length
        ? '<button type="button" class="btn btn--ghost btn--block" data-act="swap">Показать товары по размеру</button>' : '') +
      '</section>';
  }

  /* кто мешает предмету стать шире и насколько его подвинуть: «максимум 1,35 м» —
     это полдела, полезнее сказать «сдвиньте тумбу на 20 см, и встанет 1,8 м» */
  function blocker(it, want) {
    var hit = null;
    var box = [it.box[0], it.box[1], it.box[0] + want * PPM, it.box[3]];
    st.items.forEach(function (o) {
      if (hit || o.id === it.id) return;
      if (hostName(roomOf(o.box)) !== hostName(roomOf(it.box))) return;
      if (o.box[0] < it.box[0]) return;                   /* мешает только сосед справа */
      var rule = need(it, o), gapNeed = rule.m * PPM;
      var dy = Math.max(box[1] - o.box[3], o.box[1] - box[3]);
      if (dy >= 0) return;                                /* не на одной линии — не мешает */
      var dx = o.box[0] - box[2];
      if (dx >= gapNeed) return;                          /* места и так хватает */
      var move = gapNeed - dx;
      if (move > 0.05 * PPM) hit = { item: o, move_m: Math.round(move / PPM * 100) / 100 };
    });
    return hit;
  }

  function swapBlock() {
    if (!st.swap) return '';
    var it = st.items.filter(function (x) { return x.id === st.swap.id; })[0];
    if (!it) return '';
    var max = st.swap.max, rows = analogs(it.label, max), now = w_m(it.box);
    var tight = max < now - 1e-9;            /* предмет не влез — или клиент просто смотрит аналоги */
    return '<section class="pb ar-swap"><span class="pb__k">' +
        (tight ? 'Замена · не шире ' : 'Аналоги · до ') + mm(max) + ' м</span>' +
      '<b class="pb__t">' + esc(it.label) +
        (tight ? ' здесь не встаёт в полный размер' : ' · на этом месте поместится до ' + mm(max) + ' м') + '</b>' +
      '<p class="text">' + (tight
        ? 'Ищем в каталоге аналог не шире ' + mm(max) + ' м — тогда проходы останутся по норме.'
        : 'Сейчас ' + mm(now) + ' м. Шире ' + mm(max) + ' м поставить не получится: упрётся в проход или дверь.') + '</p>' +
      (function () {
        var b = blocker(it, Math.max(now + 0.3, max + 0.3));
        if (!b) return '';
        return '<p class="ar-move">Мешает «' + esc(b.item.label) + '»: не хватает ' + mm(b.move_m) +
          ' м. Освободить место — и поместится предмет пошире. ' +
          '<button type="button" class="btn btn--link btn--sm" data-nudge="' + b.item.id + '" data-by="' +
          b.move_m + '">Сдвинуть</button></p>';
      })() +
      (function () {
        var own = catalogOptions(it.label);
        if (!own.length) return '';
        return '<div class="ar-an">' + own.map(function (pr) {
          return '<article class="ar-an__c"><img src="' + esc(pr.img) + '" alt="" loading="lazy">' +
            '<b>' + esc(pr.name.length > 38 ? pr.name.slice(0, 37) + '…' : pr.name) + '</b>' +
            '<span class="ar-an__m">' + esc(pr.brand) + '</span>' +
            '<span class="ar-an__p">' + F.rub(pr.metod) + '<i>с подпиской METOD</i></span></article>';
        }).join('') + '</div>';
      })() +
      (rows.length ? '<div class="ar-an">' + rows.map(function (a) {
        var w = a.w === null ? '<i class="ar-nosize">размер уточняется</i>' : mm(a.w) + ' м';
        return '<article class="ar-an__c' + (a.ok === false ? ' is-wide' : '') + '">' +
          '<img src="' + esc(a.p.img) + '" alt="" loading="lazy">' +
          '<b>' + esc(a.p.name.length > 38 ? a.p.name.slice(0, 37) + '…' : a.p.name) + '</b>' +
          '<span class="ar-an__m">' + esc(a.p.brand) + ' · ' + w + '</span>' +
          '<span class="ar-an__p">' + F.rub(a.p.metod) + '<i>с подпиской METOD</i></span>' +
          (a.ok === false ? '<span class="ar-an__no">шире места</span>' : '') +
          '</article>';
      }).join('') + '</div>' : '<p class="text">В каталоге прототипа нет этой категории.</p>') +
      '<p class="small muted">У большинства позиций каталога ширина пока не заполнена — фильтр по габариту заработает, ' +
      'когда размеры появятся в данных. Это видно здесь честно, а не подогнано.</p>' +
      '<button type="button" class="btn btn--link" data-act="swap-off">Закрыть подбор</button></section>';
  }

  /* «только важное»: вместо списка из двадцати строк — короткий разбор того, что не так */
  function notPlacedBlock() {
    var miss = (PLANS[planIdx] && PLANS[planIdx].not_placed) || [];
    if (!miss.length) return '';
    return '<section class="pb ar-bad"><span class="pb__k">Не вошло по метражу · ' + miss.length + '</span>' +
      miss.map(function (m) {
        return '<article class="ar-fx"><b>' + esc(m.label) + (m.w_m ? ' · ' + mm(m.w_m) + ' м' : '') + '</b>' +
          '<p>' + esc(m.why || 'нет стены нужной длины') + (m.room ? ' — ' + esc(m.room) : '') + '</p></article>';
      }).join('') +
      '<p class="small muted">Сервер не ставит предмет туда, где он нарушит проход или перекроет дверь. ' +
      'Можно освободить место или подобрать аналог поменьше.</p></section>';
  }

  function focusBlock() {
    if (!st.problems.length)
      return '<section class="ar-ok"><b>Всё стоит по нормам</b>' +
        '<span>' + st.items.length + ' предметов, проходы и двери свободны. Двигайте мебель прямо на плане.</span></section>';
    var seen = {}, list = [];
    st.problems.forEach(function (p) { if (!seen[p.note]) { seen[p.note] = 1; list.push(p); } });
    return '<section class="pb ar-bad"><span class="pb__k">Требует внимания · ' + list.length + '</span>' +
      list.map(function (p) {
        var it = st.items.filter(function (x) { return x.id === p.id; })[0];
        return '<article class="ar-fx"><b>' + esc(p.rule) + '</b><p>' + esc(p.note) + '</p>' +
          (it ? '<button type="button" class="btn btn--ghost btn--sm" data-pick="' + it.id + '">Показать «' +
            esc(it.label) + '»</button>' : '') + '</article>';
      }).join('') +
      '<p class="small muted">Остальные ' + Math.max(st.items.length - list.length, 0) +
      ' предметов стоят правильно.</p>' +
      '<button type="button" class="btn btn--link btn--sm" data-act="list">' + why_list() + '</button></section>';
  }

  /* только план — для плавного перетаскивания */
  function drawPlan() {
    st.problems = validate(st.items);
    var stage = document.querySelector('.ar-stage');
    if (!stage) return render();
    var old = stage.querySelector('.ar-plan');
    var tmp = document.createElement('div');
    tmp.innerHTML = planSvg();
    if (old) stage.replaceChild(tmp.firstChild, old);
    bind();
  }

  /* 3D — картинка квартиры с мебелью (для примера ЖК PRIDE); для своего плана 3D строится в бою */
  /* ── 3D (правки 13:40, п. 1): мебель и варианты стен в 3D, 2D — дополнительная кнопка ── */
  var P3 = window.SOVE_PLAN3D || { ok: false }, view3d = null;
  var WALLS = (!LIVE && SRC.walls) || [];
  var VLET = { A: 'А', B: 'Б', C: 'В' };
  var VAR = null;                                        /* выбранный вариант стен: null — исходный план */
  function is3d() { return P3.ok && !st.view2d; }
  function geoOf(v) {
    var g = { px_per_m: SRC.px_per_m, rooms: SRC.rooms, windows: SRC.windows || [], doors: SRC.doors || [], outside: SRC.outside || [], partitions: v ? v.partitions : [] };
    return g;
  }
  var GEO = {};
  function geoFor(v) { var k = v ? v.id : '-'; return GEO[k] || (GEO[k] = geoOf(v)); }
  /* подписи габаритов на A5а: «кровать 160×200», «диван 220», «стол на 4», «кухня Г» */
  function sizeTags() {
    if (INT) return [];
    var ans = (FL.answers || {}), out = [], seen = {};
    st.items.forEach(function (it) {
      var l = it.label.toLowerCase(), b = it.box, t = null;
      if (/^кроват/.test(l)) t = 'кровать ' + ((ans.bed || [])[0] || Math.round(w_m(b) * 100) + '×' + Math.round(d_m(b) * 100));
      else if (/^диван/.test(l)) t = 'диван ' + Math.round(Math.max(w_m(b), d_m(b)) * 100);
      else if (/обеден/.test(l)) t = 'стол ' + ((ans.table || [])[0] || '');
      else if (/углов/.test(l)) t = 'кухня ' + String((ans.kitchen || ['Г'])[0]).charAt(0).toUpperCase();
      else if (/гардероб|встроен/.test(l)) t = 'шкаф';
      if (!t || seen[t]) return; seen[t] = 1;
      out.push({ t: esc(t), px: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], y: .8 });
    });
    return out;
  }
  function badMap() { var bad = {}; st.problems.forEach(function (p) { bad[p.id] = 1; if (p.id2 !== undefined) bad[p.id2] = 1; }); return bad; }
  /* пример ЖК PRIDE: под 3D — фото-рендер квартиры (как в эталонах), рамка плана 730×610 px разметки */
  var PHOTO = LIVE ? null : { src: 'assets/img/demo/1-domik-vsya-kvartira.jpg', w: 730, h: 610 };
  function movedMap() {
    var m = {}; st.items.forEach(function (it) { var s0 = START[it.id]; if (s0 && (Math.abs(s0[0] - it.box[0]) > 1 || Math.abs(s0[1] - it.box[1]) > 1 || Math.abs((s0[2] - s0[0]) - (it.box[2] - it.box[0])) > 1)) m[it.id] = 1; });
    return m;
  }
  /* интерьер не выбран — стандартный белый домик (3D); выбрана «Изумрудная неоклассика» — её фото-рендер;
     другой интерьер — 3D в его цветах (Алина 24.10) */
  function photoNow() { return PHOTO && INT && INT.id === 'k2' ? PHOTO : null; }
  function opts3d() {
    return { photo: photoNow(), moved: movedMap(), geo: geoFor(VAR), items: st.items, style: INT ? 'interior' : 'sizes', interiorId: INT ? (INT.type === 'capsule' ? INT.id : 'own') : null,
      picked: st.picked, bad: badMap(), hideItems: st.hide, tags: sizeTags(), zoom: st.zoom, height: 340,
      onItemDown: function (id, p) {
        var it = st.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
        remember(); st.picked = id; st.drag3 = { id: id, p0: p, box: it.box.slice(), moved: false };
        view3d.update({ picked: id });
      },
      onItemMove: function (p) {
        var g = st.drag3; if (!g) return;
        var it = st.items.filter(function (x) { return x.id === g.id; })[0];
        var dx = Math.round((p[0] - g.p0[0]) / STEP) * STEP, dy = Math.round((p[1] - g.p0[1]) / STEP) * STEP;
        if (!dx && !dy) return; g.moved = true;
        it.box = [g.box[0] + dx, g.box[1] + dy, g.box[2] + dx, g.box[3] + dy];
        st.problems = validate(st.items);
        var v = root.querySelector('.pz-verdict'); if (v) v.outerHTML = verdict();
        view3d.update({ items: st.items, bad: badMap(), moved: movedMap() });
      },
      onItemUp: function () {
        var g = st.drag3; st.drag3 = null; if (!g) return;
        if (g.moved) { var it = st.items.filter(function (x) { return x.id === g.id; })[0]; it.box = snap(it.box, it.id); save(); } else st.undo.pop();
        render();
      } };
  }
  var dropOnce = S.ui.qs('anim') === '1';
  function mount3d() {
    var slot = root.querySelector('.pz-3dslot'); if (!slot) return;
    if (!view3d) view3d = P3.create(slot, opts3d()); else { view3d.mount(slot); view3d.update(opts3d()); }
    /* 0.1: пришли с «Расставить мебель» — лоадер и мебель встаёт на места в той же 3D */
    if (dropOnce && !photoNow()) {
      dropOnce = false;
      var ld = document.createElement('div'); ld.className = 'pz-drop'; ld.innerHTML = '<span>Расставляю мебель по нормам проходов</span>'; slot.parentNode.appendChild(ld);
      view3d.dropIn(1500, function () { ld.remove(); });
    }
  }
  function seg() {
    if (!P3.ok) return '';
    return '<div class="pz-seg" role="group" aria-label="Вид плана"><button type="button" data-act="v3d" aria-pressed="' + is3d() + '">3D</button>' +
      '<button type="button" data-act="v2d" aria-pressed="' + !is3d() + '">2D</button></div>';
  }
  function stageBlock() {
    var plan = is3d() ? '<div class="pz-3dslot"></div>' : planSvg();
    return '<section class="ar-stage pz-stage' + (view === 'panel' ? ' is-sticky' : '') + '">' + roomTabs() + plan +
      (view === 'rooms' ? '' :
        '<div class="ar-zoom"><button type="button" data-zoom="-1" aria-label="Отдалить">−</button>' +
        '<span>' + Math.round(st.zoom * 100) + '%</span>' +
        '<button type="button" data-zoom="1" aria-label="Приблизить">+</button>' +
        (st.zoom > 1.001 && !is3d()
          ? '<button type="button" class="ar-zoom__all" data-act="whole" aria-label="Вся квартира">⤢</button>' +
            '<button type="button" class="ar-zoom__all' + (st.hand ? ' is-on' : '') +
            '" data-act="hand" aria-label="Двигать план">✋</button>'
          : '') + '</div>') + seg() +
      (INT || VAR ? '<div class="pz-tools">' +
        '<button type="button" data-act="hide" aria-pressed="' + st.hide + '" aria-label="' + (st.hide ? 'Показать мебель' : 'Скрыть мебель') + '">👁</button>' +
        '<button type="button" data-act="reset" aria-label="Сбросить расстановку">↺</button></div>' : '') +
      verdict() + '</section>';
  }

  /* ── «Варианты стен» (эталон B3, ТЗ 4.4): 3 варианта, нарушающие правила не показываем ── */
  function allowed(v) {
    var f = v.flags || {}, gas = FL.gas === 'gas' || FL.gas === undefined;    /* газа в документах нет — считаем, что есть */
    return !f.bearing && !f.movesWet && !f.roomWithoutWindow && !(f.mergesKitchenLiving && gas);
  }
  function answersLine() {
    var a = FL.replanAnswers || {}, add = (a.add || []).map(function (x) { return x === 'гардеробная' ? 'гардероб' : x === 'больше хранения' ? 'хранение' : x === 'рабочее место' ? 'кабинет' : x; });
    var who = a.who ? a.who + (a.guests && a.guests !== 'не нужно' ? ' + гость' : '') : '';
    return [a.purpose, who, add.join(', ')].filter(Boolean).join(' · ');
  }
  var shots = {};
  function wallShots(done) {
    if (!P3.ok) return done();
    var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-2000px;top:0;width:358px'; document.body.appendChild(host);
    var v = P3.create(host, { photo: photoNow(), geo: geoFor(null), items: st.items, style: INT ? 'interior' : 'sizes', interiorId: INT ? (INT.type === 'capsule' ? INT.id : 'own') : 'k2', height: 190 });
    WALLS.forEach(function (w) { v.update({ geo: geoFor(w) }); shots[w.id] = v.snapshot(); });
    v.renderer.dispose(); host.remove(); done();
  }
  function viewWalls() {
    var list = WALLS.filter(allowed), pick = st.wallPick || 'B', free = FL.state === 'concrete_free';
    var want = (FL.replanAnswers || {}).add || [];
    var GK = { 'гардеробная': 'гардероб', 'больше хранения': 'хранение', 'рабочее место': 'кабинет', 'спальня отдельно': 'спальня' };
    var givesKeys = want.length ? want.map(function (x) { return GK[x] || x; }) : ['кабинет', 'гардероб', 'хранение'];
    return FLOW.blockHead('flow', 'walls') +
      '<div class="pz-title"><h2>3 варианта</h2><span>под «' + esc(answersLine() || 'твои ответы') + '»</span></div>' +
      (LIVE ? '<p class="pz-note">Для своего плана варианты стен в прототипе не строятся — показываем на примере ЖК PRIDE.</p>' : '') +
      list.map(function (w) {
        var badge = free ? '<em class="pz-badge">стены ещё не построены — ставим по варианту</em>'
          : w.approval === 'required' ? '<em class="pz-badge is-warn">! нужно согласование</em>' : '<em class="pz-badge">✓ без согласования</em>';
        return '<button type="button" class="pz-var' + (pick === w.id ? ' is-on' : '') + '" data-wall="' + w.id + '">' +
          '<span class="pz-var__img">' + (shots[w.id] ? '<img src="' + shots[w.id] + '" alt="Вариант ' + esc(VLET[w.id]) + ' в 3D">' : '') + badge + (w.advice ? '<em class="pz-badge pz-badge--advice">Рекомендовано</em>' : '') + '</span>' +
          '<span class="pz-var__h"><b>' + esc(VLET[w.id] + ' · ' + w.name) + '</b><b>' + esc(w.price) + '</b></span>' +
          '<small>' + esc(w.text) + '</small>' +
          '<span class="pz-var__g">' + givesKeys.map(function (k) { return esc(k) + ' ' + (w.gives[k] ? '✓' : '—'); }).join(' &nbsp; ') + '</span></button>';
      }).join('') +
      '<button type="button" class="pz-btn" data-act="wall-go">Выбрать ' + esc(VLET[pick]) + '</button>' +
      '<button type="button" class="pz-link" data-act="wall-none"><u>Без перепланировки</u></button>' +
      FLOW.budgetCard({ rerender: render });
  }
  /* таблетки вариантов на экране мебели (эталон B4): переключение бесплатно */
  /* варианты сгенерированы (в т. ч. выбран «Исходный») — таблетки остаются, переключение бесплатно */
  function varPills() {
    if (!FL.wallVariant) return '';
    var ids = WALLS.filter(allowed).map(function (w) { return w.id; });
    if (VAR) ids = [VAR.id].concat(ids.filter(function (id) { return id !== VAR.id; }));
    return '<div class="pz-chips pz-vpills">' + ids.map(function (id) {
      var on = VAR && VAR.id === id;
      return '<button type="button" class="pz-chip' + (on ? ' is-on' : '') + '" data-var="' + id + '">' + (on ? 'Вариант ' : '') + esc(VLET[id]) + '</button>';
    }).join('') + '<button type="button" class="pz-chip' + (VAR ? '' : ' is-on') + '" data-var="">Исходный</button></div>';
  }

  function render() {
    st.problems = validate(st.items);
    collectLite();
    /* лента «Выбери интерьер»: варианты стен и A5а — пока интерьер не выбран (раздел 14) */
    FLOW.interiorStrip({ chosen: !!INT, onPick: function (it) { if (st.walls) { INT = it; FL = FLOW.load(); shots = {}; wallShots(render); } else setInterior(it); } });
    if (st.walls) { root.innerHTML = viewWalls(); bind(); return; }
    var body;
    if (INT || VAR) {
      /* A5б · Твоя квартира в 3D: механика расстановки, товары интерьера с ♡ / 🛒 */
      body = varPills() + plansBlock() + stageBlock() +
        '<p class="pz-hint">Нажми предмет — размеры, шире / уже, замена · двигай пальцем, проверка сразу · 👁 скрыть мебель · ↺ сбросить</p>' +
        problemsBlock() + notPlacedBlock() + swapBlock() + (INT ? goodsBlock() : '') +
        finish() +
        /* бюджет — под визуализациями, только с интерьером */
        FLOW.budgetCard({ rerender: render }) +
        '<div class="ar-dock' + (st.picked === null ? ' is-off' : '') + '">' + pickedBlock() + '</div>';
    } else {
      /* A5а · Мебель по размерам: серые габариты, сумма по средним ценам, выбор интерьера */
      body = varPills() + stageBlock() + problemsBlock() + notPlacedBlock() +
        /* тёмную плашку «Выбери интерьер» заменила лента снизу (раздел 14) */
        finish() +
        '<div class="ar-dock' + (st.picked === null ? ' is-off' : '') + '">' + pickedBlock() + '</div>';
    }
    root.innerHTML = head() + body;
    if (is3d()) mount3d();
    bind();
  }
  /* «Сохранить в Мой ремонт» → экран A6 «Моя планировка»: передаём расстановку, картинку плана и мебель */
  var KITCHEN = /мойк|плит|варочн|посудом|углов|холодильник встро|модул/i;
  function toSave() { collect(); location.href = 'plan-save.html'; }
  /* лёгкая запись без картинки — чтобы мебель и бюджет на экране считались по текущей расстановке */
  function collectLite() {
    var prev = FLOW.load().toSave || {}, g = goods();
    FLOW.save({ toSave: Object.assign({}, prev, { flat: SRC.flat, live: !!LIVE, arrangement: planName(PLANS[planIdx].name || ''),
      items: st.items.map(function (it) { return { label: it.label, box: it.box }; }), count: st.items.length, furniture: goodsSum(),
      kitchenLen: Math.round(st.items.filter(function (it) { return KITCHEN.test(it.label); }).reduce(function (a, it) { return a + Math.max(w_m(it.box), d_m(it.box)); }, 0) * 10) / 10,
      goods: g.filter(function (x) { return x.p; }).map(function (x) { return { label: x.it.label, room: x.room, id: x.p.id, metod: x.p.metod }; }),
      variant: VAR ? { id: VAR.id, letter: VLET[VAR.id], name: VAR.name, text: VAR.text, approval: VAR.approval, partitions: VAR.partitions } : null,
      geo: LIVE ? { px_per_m: SRC.px_per_m, rooms: SRC.rooms } : null }) });
  }
  /* расстановку, картинку плана и мебель — в состояние сценария (для A6, сохранения, PDF и визуализаций) */
  function collect() {
    var g = goods(), kitchenLen = st.items.filter(function (it) { return KITCHEN.test(it.label); })
      .reduce(function (a, it) { return a + Math.max(w_m(it.box), d_m(it.box)); }, 0);
    var shot = photoNow() && !VAR ? PHOTO.src : (view3d ? view3d.snapshot() : null);
    FLOW.save({ toSave: {
      flat: SRC.flat, live: !!LIVE, img: shot, arrangement: planName(PLANS[planIdx].name || ''),
      items: st.items.map(function (it) { return { label: it.label, box: it.box }; }),
      count: st.items.length, furniture: goodsSum(), kitchenLen: Math.round(kitchenLen * 10) / 10,
      goods: g.filter(function (x) { return x.p; }).map(function (x) { return { label: x.it.label, room: x.room, id: x.p.id, metod: x.p.metod }; }),
      variant: VAR ? { id: VAR.id, letter: VLET[VAR.id], name: VAR.name, text: VAR.text, approval: VAR.approval, partitions: VAR.partitions } : null,
      others: VAR ? WALLS.filter(allowed).filter(function (w) { return w.id !== VAR.id; }).map(function (w) { return VLET[w.id]; }) : [],
      geo: LIVE ? { px_per_m: SRC.px_per_m, rooms: SRC.rooms } : null
    } });
  }
  /* финал блока (раздел 15): сохранить — и показываем «Моя планировка» с итогом; скачать; дальше — визуализации */
  function finish() {
    /* после «Сохранить» остаёмся здесь: тост «Сохранено в Мой ремонт · Открыть · Дальше: визуализации» (отдельный экран A6 убран) */
    var more = FL.wallVariant || !WALLS.length ? [] : [{ label: ((FL.layoutHints || {}).roomHint ? 'Хочешь отдельную комнату? Поменять стены · ' + FLOW.priceTxt() : 'Перепланировка · ' + FLOW.priceTxt(true)), onClick: replanSheet }];
    return FLOW.planFinish({ before: collect, more: more, after: function () { render(); },
      getImg: function () { return photoNow() && !VAR ? PHOTO.src : (view3d ? view3d.snapshot() : null); } });
  }
  function chooseWall(id) {
    VAR = id ? WALLS.filter(function (w) { return w.id === id; })[0] || null : null;
    st.walls = false; st.picked = null; FL = FLOW.save({ wallVariant: VAR ? VAR.id : 'orig' });
    render(); window.scrollTo(0, 0);
  }
  /* «Хочешь поменять стены?» на A5: включает переключатель и ведёт на «Варианты стен» через то же окно списания */
  function replanSheet() { FLOW.replanSheet(function () { FLOW.setReplan(true); openWalls(); }); }
  function openWalls() { st.walls = true; st.picked = null; wallShots(function () { render(); window.scrollTo(0, 0); }); }
  function setInterior(it) {
    INT = it; FL = FLOW.save({ interior: it }); st.picked = null; st.swap = null; render(); window.scrollTo(0, 0);
  }

  /* ── перетаскивание: слушаем окно, не предмет (иначе клик теряется) ──── */
  function bind() {
    var svg = document.getElementById('ar-svg'); if (!svg) return;
    svg.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ar-zoom')) return;
      if (!st.hand && (st.zoom <= 1 || e.target.closest('.ar-item'))) return;
      st.pan = { x: e.clientX, y: e.clientY, x0: st.panx, y0: st.pany, k: userPerPixel(svg), moved: false };
      e.preventDefault();
    });
    svg.querySelectorAll('.ar-rot').forEach(function (g) {
      g.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      g.addEventListener('click', function (e) {
        e.stopPropagation();
        var it = st.items.filter(function (x) { return x.id === +g.dataset.rot; })[0];
        if (it) { rotate(it); render(); }
      });
    });
    svg.querySelectorAll('.ar-item').forEach(function (g) {
      g.addEventListener('pointerdown', function (e) {
        if (st.hand) return;                      /* включена «рука» — двигаем план, не мебель */
        var id = +g.dataset.id, it = st.items.filter(function (x) { return x.id === id; })[0];
        remember();
        st.picked = id;
        var k = userPerPixel(svg);
        st.drag = { id: id, x: e.clientX, y: e.clientY, box: it.box.slice(), k: k, moved: false };
        e.preventDefault();
      });
      g.addEventListener('pointerup', function () {
        var id = +g.dataset.id;
        var now = (window.performance && performance.now) ? performance.now() : 0;
        if (!st.dragWasMoved && st.tap && st.tap.id === id && now - st.tap.t < 450) {
          var it = st.items.filter(function (x) { return x.id === id; })[0];
          st.tap = null;
          if (it) { remember(); rotate(it); it.box = snap(it.box, id); st.picked = id; save(); render(); }
          return;
        }
        st.tap = { id: id, t: now };
      });
      g.addEventListener('keydown', function (e) {
        var id = +g.dataset.id, it = st.items.filter(function (x) { return x.id === id; })[0];
        if (e.key && e.key.indexOf('Arrow') === 0) remember();
        var d = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key];
        if (!d) return;
        it.box = [it.box[0] + d[0], it.box[1] + d[1], it.box[2] + d[0], it.box[3] + d[1]];
        st.picked = id; e.preventDefault(); render();
        var again = document.querySelector('.ar-item[data-id="' + id + '"]'); if (again) again.focus();
      });
    });
  }
  window.addEventListener('pointermove', function (e) {
    if (st.pan) {
      var k = st.pan.k;
      if (Math.abs(e.clientX - st.pan.x) > 3 || Math.abs(e.clientY - st.pan.y) > 3) st.pan.moved = true;
      st.panx = st.pan.x0 - (e.clientX - st.pan.x) * k;
      st.pany = st.pan.y0 - (e.clientY - st.pan.y) * k;
      clampPan();
      if (!st.raf) st.raf = requestAnimationFrame(function () { st.raf = 0; drawPlan(); });
      return;
    }
    if (!st.drag) return;
    var g = st.drag, it = st.items.filter(function (x) { return x.id === g.id; })[0]; if (!it) return;
    var dx = Math.round((e.clientX - g.x) * g.k / STEP) * STEP;
    var dy = Math.round((e.clientY - g.y) * g.k / STEP) * STEP;
    if (!dx && !dy) return;
    g.moved = true;
    it.box = [g.box[0] + dx, g.box[1] + dy, g.box[2] + dx, g.box[3] + dy];
    /* перерисовываем план целиком раз в кадр: при ручном сдвиге одной рамки
       значок «!» и ручка поворота оставались на старом месте и ехали отдельно */
    if (!st.raf) st.raf = requestAnimationFrame(function () { st.raf = 0; drawPlan(); });
  });
  window.addEventListener('pointerup', function () {
    if (st.pan) {
      /* по пустому месту плашку не закрываем: промахнуться мимо тумбы 45 см легко,
         и панель пропадала посреди работы. Закрывает только крестик. */
      st.pan = null; render(); return;
    }
    if (!st.drag) return;
    var moved = st.drag.moved;
    if (moved) {
      var it = st.items.filter(function (x) { return x.id === st.drag.id; })[0];
      if (it) it.box = snap(it.box, it.id);   /* прилипание к стене и соседям */
      save();
    } else {
      st.undo.pop();                          /* не двигали — шаг назад не нужен */
    }
    st.drag = null;
    st.dragWasMoved = moved;                  /* перетащили — значит это не двойное касание */
    render();
    setTimeout(function () { st.dragWasMoved = false; }, 0);
  });

  root.addEventListener('click', function (e) {
    var wb = e.target.closest('[data-wall]');
    if (wb) { st.wallPick = wb.dataset.wall; render(); return; }
    var vb2 = e.target.closest('[data-var]');
    if (vb2) { chooseWall(vb2.dataset.var || null); return; }
    var cb = e.target.closest('[data-cap]');
    if (cb) { setInterior(FLOW.capsuleInterior(cb.dataset.cap)); return; }
    if (e.target.closest('[data-own-open]')) { FLOW.ownSheet(setInterior); return; }
    var zb = e.target.closest('[data-zoom]');
    if (zb) {
      var step = +zb.dataset.zoom > 0 ? 1.25 : 1 / 1.25;
      st.zoom = Math.round(Math.max(1, Math.min(3, st.zoom * step)) * 100) / 100;
      if (st.zoom <= 1) { st.hand = false; st.panx = 0; st.pany = 0; }
      clampPan();
      render(); return;
    }
    var vb = e.target.closest('[data-view]');
    if (vb) {
      view = vb.dataset.view; st.picked = null; st.swap = null; st.room = null; st.listOpen = false;
      try { localStorage.setItem('sove.arrange.view', view); } catch (err) {}
      render(); return;
    }
    var rb = e.target.closest('[data-room]');
    if (rb) { st.room = rb.dataset.room || null; st.picked = null; render(); return; }
    var pb = e.target.closest('[data-plan]');
    if (pb) {
      planIdx = +pb.dataset.plan;
      st.items = itemsOf(planIdx);
      START = st.items.map(function (x) { return x.box.slice(); });
      st.picked = null; st.swap = null; st.undo = []; save(); render();
      return;
    }
    var nb = e.target.closest('[data-nudge]');
    if (nb) {
      var who = st.items.filter(function (x) { return x.id === +nb.dataset.nudge; })[0];
      if (who) { remember(); var d = parseFloat(nb.dataset.by) * PPM; who.box[0] += d; who.box[2] += d; save(); }
      render(); return;
    }
    var pick = e.target.closest('[data-pick]');
    if (pick) { st.picked = +pick.dataset.pick; st.swap = null; render(); return; }
    var w = e.target.closest('[data-w]'), act = e.target.closest('[data-act]');
    var it = st.items.filter(function (x) { return x.id === st.picked; })[0];
    if (w && it) {
      var step = parseFloat(w.dataset.w) * PPM;
      remember();
      if (w_m(it.box) + parseFloat(w.dataset.w) >= .4) it.box[2] += step;
      save(); render(); return;
    }
    if (!act) return;
    var a = act.dataset.act;
    if (a === 'undo') { undo(); }
    if (a === 'reset') {
      if (view3d) view3d.reset();
      remember();
      st.items.forEach(function (x, i) { x.box = START[i].slice(); });
      st.picked = null; st.swap = null; save(); render();
    }
    if (a === 'back' && it) { remember(); it.box = START[it.id].slice(); save(); render(); }
    if (a === 'rot' && it) { remember(); rotate(it); it.box = snap(it.box, it.id); save(); render(); }
    if (a === 'swap' && it) {
      /* предел места, а не текущий размер: клиенту нужна граница, до которой можно выбирать */
      st.swap = { id: it.id, max: fits(it, Math.max(w_m(it.box) + 1.2, 2.6)) || w_m(it.box) };
      render();
    }
    if (a === 'swap-off') { st.swap = null; render(); }
    if (a === 'list') { st.listOpen = true; render(); }
    if (a === 'list-off') { st.listOpen = false; render(); }
    if (a === 'whole') { st.zoom = 1; st.panx = 0; st.pany = 0; render(); }
    if (a === 'hand') { st.hand = !st.hand; st.picked = null; render(); }
    if (a === 'close') { st.picked = null; st.swap = null; render(); }
    if (a === 'to-save') { toSave(); return; }
    if (a === 'v3d') { st.view2d = false; render(); }
    if (a === 'v2d') { st.view2d = true; render(); }
    if (a === 'hide') { st.hide = !st.hide; st.picked = null; render(); }
    if (a === 'wall-go') { chooseWall(st.wallPick || 'B'); }
    if (a === 'wall-none') { chooseWall(null); }
    if (a === 'replan') { replanSheet(); }
    if (a === 'all-items') { st.allItems = !st.allItems; render(); }
    if (a === 'all-cart' && S.repair) {
      var ids = goods().filter(function (g) { return g.p; }).map(function (g) { return g.p.id; });
      S.repair.cart.addMany(ids.filter(function (v, i) { return ids.indexOf(v) === i; }), 'market'); render();
    }
    if (a === 'change-int') {
      var m = S.ui.modal({ eyebrow: 'Интерьер', title: 'Сменить интерьер', html: FLOW.interiorTiles(INT), actions: [{ label: 'Отмена', kind: 'link' }] });
      m.el.querySelectorAll('[data-cap]').forEach(function (b) { b.addEventListener('click', function () { m.close(); setInterior(FLOW.capsuleInterior(b.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); FLOW.ownSheet(setInterior); });
    }
  });

  st.restored = restore();
  if (S.ui.qs('walls') && WALLS.length && !FL.wallVariant) { FLOW.setReplan(true); openWalls(); }
  else { if (FL.wallVariant) VAR = WALLS.filter(function (w) { return w.id === FL.wallVariant; })[0] || null; render(); }
})();
