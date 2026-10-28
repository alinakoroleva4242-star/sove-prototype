/* Объёмы работ по плану клиента (Валерия 27.10: «надо в демо менять же» — после пробы CADCraft на плане PRIDE
   формулы Scout разошлись с чертежом: стены +9%, санузел +11%, пол −13%).
   Площадь и периметр каждой комнаты — та же геометрия, что меряет CADCraft (комната — рамка плана, Г-образная —
   рамка + ниша part_of); сверено с `cadcraft-cli area` на четырёх планах tools/fixtures.
   Работы — расценки Scout (works-prices.js) × эти объёмы; что не меряется по плану (электроточки, свет,
   утепление, короба), — по формулам самой книги Scout от площади, комнат и санузлов.

   SOVE_VOLUMES.fromGeo(geo, { h, state, kitchenLen, bath }) → объёмы
   SOVE_VOLUMES.works(vol, stateId, level) → { lines, total, stages } — stateId: secondary | pre | concrete | finish */
(function () {
  var H_DOOR = 2.1, H_WIN = 1.5, APRON = 0.6, TOL_M = 0.15, DOUBLE_DOOR_M = 1.2;
  var STAGES = ['Демонтаж', 'Стены и перегородки', 'Водоснабжение и канализация', 'Электрика, свет, двери', 'Полы', 'Потолки', 'Финальная сдача'];
  var OUT = /балкон|лодж/i, BATH = /сан|ванн|туал|с\/у|wc/i, HALL = /прих|коридор|холл|тамбур/i,
      LIVING = /спальн|гостин|детск|кабинет|комнат/i, KITCHEN = /кухн/i;
  function txt(r) { return String((r.type || '') + ' ' + (r.name || '')).toLowerCase(); }
  function kind(r) { var t = txt(r); return OUT.test(t) ? 'out' : BATH.test(t) ? 'bath' : HALL.test(t) ? 'hall' : LIVING.test(t) ? 'living' : KITCHEN.test(t) ? 'kitchen' : 'other'; }
  function bw(b) { return Math.abs(b[2] - b[0]); }
  function bh(b) { return Math.abs(b[3] - b[1]); }
  /* комната = объединение рамок (основная + ниши): сетка по краям рамок, близкие края (зазор до tol) сливаются,
     площадь — сумма занятых клеток, периметр — длина рёбер между занятой и пустой клеткой. Так же меряет CADCraft,
     и так не задваиваются ниши, которые зрение нарисовало внахлёст с комнатой */
  function snapAll(vals, tol) {
    var s = vals.slice().sort(function (a, b) { return a - b; }), out = [];
    s.forEach(function (v) { if (!out.length || v - out[out.length - 1] > tol) out.push(v); });
    return function (v) { var best = out[0]; out.forEach(function (x) { if (Math.abs(x - v) < Math.abs(best - v)) best = x; }); return best; };
  }
  function grid(boxes, tol) {
    var bs = boxes.map(function (b) { return [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])]; });
    var sx = snapAll([].concat.apply([], bs.map(function (b) { return [b[0], b[2]]; })), tol), sy = snapAll([].concat.apply([], bs.map(function (b) { return [b[1], b[3]]; })), tol);
    bs = bs.map(function (b) { return [sx(b[0]), sy(b[1]), sx(b[2]), sy(b[3])]; });
    var xs = [], ys = [];
    bs.forEach(function (b) { [b[0], b[2]].forEach(function (x) { if (xs.indexOf(x) < 0) xs.push(x); }); [b[1], b[3]].forEach(function (y) { if (ys.indexOf(y) < 0) ys.push(y); }); });
    xs.sort(function (a, b) { return a - b; }); ys.sort(function (a, b) { return a - b; });
    var full = {};
    for (var i = 0; i < xs.length - 1; i++) for (var j = 0; j < ys.length - 1; j++) {
      var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (bs.some(function (b) { return cx > b[0] && cx < b[2] && cy > b[1] && cy < b[3]; })) full[i + ',' + j] = 1;
    }
    return { xs: xs, ys: ys, full: full };
  }
  function measure(boxes, tol) {
    var g = grid(boxes, tol), area = 0, per = 0, has = function (i, j) { return !!g.full[i + ',' + j]; };
    Object.keys(g.full).forEach(function (k) {
      var p = k.split(','), i = +p[0], j = +p[1], w = g.xs[i + 1] - g.xs[i], hh = g.ys[j + 1] - g.ys[j];
      area += w * hh;
      if (!has(i, j - 1)) per += w; if (!has(i, j + 1)) per += w; if (!has(i - 1, j)) per += hh; if (!has(i + 1, j)) per += hh;
    });
    return { area: area, per: per, grid: g };
  }
  /* контур объединения обходом границы — для чертежа DXF */
  function outline(boxes, tol) {
    var g = grid(boxes, tol), next = {}, key = function (i, j) { return i + ',' + j; }, has = function (i, j) { return !!g.full[key(i, j)]; };
    Object.keys(g.full).forEach(function (k) {
      var p = k.split(','), i = +p[0], j = +p[1];
      if (!has(i, j - 1)) next[key(i, j)] = key(i + 1, j);
      if (!has(i + 1, j)) next[key(i + 1, j)] = key(i + 1, j + 1);
      if (!has(i, j + 1)) next[key(i + 1, j + 1)] = key(i, j + 1);
      if (!has(i - 1, j)) next[key(i, j + 1)] = key(i, j);
    });
    var start = Object.keys(next)[0]; if (!start) return [];
    var pts = [], cur = start, guard = 0;
    do { var p = cur.split(','); pts.push([g.xs[+p[0]], g.ys[+p[1]]]); cur = next[cur]; } while (cur && cur !== start && ++guard < 400);
    return pts.filter(function (pt, k) {           /* убираем точки посреди прямой */
      var a = pts[(k + pts.length - 1) % pts.length], b = pts[(k + 1) % pts.length];
      return !((a[0] === pt[0] && pt[0] === b[0]) || (a[1] === pt[1] && pt[1] === b[1]));
    });
  }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }

  function fromGeo(geo, o) {
    o = o || {};
    if (!geo || !geo.rooms || !geo.rooms.length || !(+geo.px_per_m > 0)) return null;
    var h = +o.h > 1.8 ? +o.h : 2.8, ppmGeo = +geo.px_per_m, hosts = geo.rooms.filter(function (r) { return !r.part_of; });
    function parts(r) { return geo.rooms.filter(function (n) { return n.part_of && n.part_of === r.name; }); }
    /* масштаб: сервер его не отдаёт, и демо берёт план шириной 9 м. Подписанные площади комнат читает
       зрение прямо с плана — по ним и сверяем: если масштаб плана расходится больше чем на 4 %, берём их */
    var est = hosts.map(function (r) {
      var px = bw(r.box) * bh(r.box), m2 = +(r.m2 || r.doc_m2 || 0);
      parts(r).forEach(function (n) { px += bw(n.box) * bh(n.box); });
      return m2 > 0 ? Math.sqrt(px / m2) : null;
    }).filter(Boolean);
    var lab = median(est), ppm = ppmGeo, scaleBy = 'plan';
    if (lab && Math.abs(ppmGeo / lab - 1) > 0.04) { ppm = lab; scaleBy = 'labels'; }
    var tol = TOL_M * ppm;
    var rooms = hosts.map(function (r) {
      var ps = parts(r), mz = measure([r.box].concat(ps.map(function (n) { return n.box; })), tol), per = mz.per, area = mz.area;
      var drawn = area / ppm / ppm, label = +(r.m2 || r.doc_m2 || 0), m2 = label || drawn, perM = per / ppm, fixed = false;
      /* рамка разошлась с подписью больше чем на 20 % (зрение ошиблось с границей) — периметр подгоняем
         к подписанной площади, сохраняя пропорции комнаты: периметр растёт как корень из площади */
      if (label > 0 && drawn > 0 && Math.abs(drawn / label - 1) > 0.2) { perM = perM * Math.sqrt(label / drawn); fixed = true; }
      return { name: r.name, type: r.type || '', kind: kind(r), m2: r1(m2), area_drawn: r2(drawn), per_m: r2(perM), per_drawn: r2(per / ppm), fixed: fixed,
        openings_m2: 0, doors_m: 0, box: r.box, parts: ps.map(function (n) { return n.box; }) };
    });
    function roomBy(t) {
      t = String(t || '').toLowerCase(); if (!t) return null;
      return rooms.filter(function (x) { return String(x.type).toLowerCase() === t || String(x.name).toLowerCase() === t; })[0] || null;
    }
    var doors = [], windows = [];
    /* дверь в рамке плана — зона: ширина проёма вдоль стены и 0,9 м прохода в каждую сторону (у входной — внутрь) */
    (geo.doors || []).forEach(function (d) {
      if (!d.box) return;
      var C = (d.kind === 'entrance' ? 0.9 : 1.8) * ppmGeo, w = bw(d.box), hh = bh(d.box), alongX = Math.abs(w - C) > Math.abs(hh - C);
      var width = r2((alongX ? w : hh) / ppmGeo), a = roomBy(d.a), b = d.b ? roomBy(d.b) : null;
      doors.push({ kind: d.kind || 'door', width: width, a: a ? a.name : (d.a || ''), b: b ? b.name : (d.b || ''), box: d.box, axis: alongX ? 'x' : 'y',
        at: [(d.box[0] + d.box[2]) / 2, (d.box[1] + d.box[3]) / 2] });
      [a, b].forEach(function (x) { if (x) { x.openings_m2 += width * H_DOOR; x.doors_m += width; } });
    });
    (geo.windows || []).forEach(function (w) {
      if (!w.box) return;
      var width = r2(Math.max(bw(w.box), bh(w.box)) / ppm), a = roomBy(w.room);
      windows.push({ width: width, room: a ? a.name : (w.room || ''), box: w.box });
      if (a) a.openings_m2 += width * H_WIN;
    });
    function sum(f, ok) { return rooms.filter(ok).reduce(function (s, r) { return s + f(r); }, 0); }
    var inFlat = function (r) { return r.kind !== 'out'; }, dry = function (r) { return r.kind !== 'out' && r.kind !== 'bath'; }, wet = function (r) { return r.kind === 'bath'; };
    var wall = function (r) { return Math.max(0, r.per_m * h - r.openings_m2); };
    var V = { h: h, ppm: r2(ppm), ppm_plan: r2(ppmGeo), scaleBy: scaleBy, rooms: rooms, doors: doors, windows: windows, state: o.state || null };
    V.area = r1(sum(function (r) { return r.m2; }, inFlat));
    V.floor_dry = r1(sum(function (r) { return r.m2; }, dry));
    V.floor_bath = r1(sum(function (r) { return r.m2; }, wet));
    V.walls = r1(sum(wall, inFlat));
    V.walls_bath = r1(sum(wall, wet));
    V.walls_dry = r1(V.walls - V.walls_bath);
    /* фартук — по длине кухонного гарнитура из расстановки (кухня часто внутри «гостиной»), высота 0,6 м */
    V.apron = r1(Math.max(0, +o.kitchenLen || 0) * APRON);
    V.paint = r1(Math.max(0, V.walls_dry - V.apron));
    V.plinth_m = r1(sum(function (r) { return Math.max(0, r.per_m - r.doors_m); }, dry));
    V.slopes_m = r1(windows.reduce(function (s, w) { return s + 2 * H_WIN + w.width; }, 0) + doors.reduce(function (s, d) { return s + 2 * H_DOOR + d.width; }, 0));
    var inner = doors.filter(function (d) { return d.kind !== 'entrance'; });
    V.doors_n = inner.filter(function (d) { return d.width < DOUBLE_DOOR_M; }).length;
    V.doors_double_n = inner.length - V.doors_n;
    V.windows_n = windows.length;
    V.rooms_n = rooms.filter(function (r) { return r.kind === 'living'; }).length || 1;
    V.baths_n = rooms.filter(wet).length || 1;
    /* перегородки строим только в бетоне без стен: внутренние стены = (сумма периметров − контур квартиры) / 2 */
    V.inner_walls_m = 0;
    if (o.state === 'concrete_free') {
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, s = 0;
      rooms.filter(inFlat).forEach(function (r) { s += r.per_m; [r.box].concat(r.parts).forEach(function (b) { x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); }); });
      V.inner_walls_m = r1(Math.max(0, (s - 2 * ((x2 - x1) + (y2 - y1)) / ppm) / 2));
    }
    V.partitions_m2 = r1(V.inner_walls_m * h);
    V.bathtub = o.bath === 'ванна' ? 1 : 0;
    V.tiles_all = r1(V.walls_bath + V.floor_bath + V.apron);   /* плитка санузла на всю высоту + пол санузла + фартук */
    return V;
  }

  /* плитка по ставкам (как в сметах Алины 27.10): база — всё по 60×120; премиум — стены и фартук 120×120, пол 60×120 */
  function tiles60(V, lv) { return lv === 'premium' ? V.floor_bath : V.tiles_all; }
  function tiles120(V, lv) { return lv === 'premium' ? r1(V.walls_bath + V.apron) : 0; }
  function rk(V) { return String(Math.min(4, Math.max(1, V.rooms_n))); }
  function qty(V, it, st, lv) {
    var S = V.area, R = Math.max(1, V.rooms_n), B = Math.max(1, V.baths_n), k = V.h / 2.7;
    switch (it.q) {
      case 'area': return S;
      case 'one': return 1;
      case 'two': return 2;
      case 'openings_n': return V.windows_n + V.doors_n + V.doors_double_n;
      case 'temp_el': return R + 1 + B;
      case 'partitions_m2': return V.partitions_m2;
      case 'strengthen_m': return (V.doors_n + V.doors_double_n) * 6.85;            /* Scout: двери × (0,85 + 6) м/п */
      case 'walls': return V.walls;
      case 'walls_dry': return V.walls_dry;
      case 'walls_bath': return V.walls_bath;
      case 'slopes_m': return V.slopes_m;
      case 'chasing_m': return 20 / 45 * S;
      case 'water_points': return 10 * (B > 1 ? 1.5 * (B - 1) : 1) + 3;            /* Scout: 10 × коэф. санузлов + 3 */
      case 'by_rooms': return 1;
      case 'baths': return B;
      case 'radiators': return R;
      case 'tiles_all': return tiles60(V, lv) + tiles120(V, lv);
      case 'insulation_m2': return 9 / 45 * S * k;
      case 'paint': return V.paint;
      case 'waterproof_m2': return S * 15 / 45;
      case 'chases_by_rooms': case 'debris_by_rooms': return ((it.qtyByRooms || {})[st] || {})[rk(V)] || 0;
      case 'boxes_m2': return 5 / 45 * S * k;
      case 'sinks': case 'mixers': return B + 1;                                   /* по санузлу + кухня */
      case 'showers': return Math.max(0, B - V.bathtub);
      case 'el_points': return Math.ceil(S);                                       /* ≈ 1 точка на м², как в комплектации капсул */
      case 'tiles_60': return tiles60(V, lv);
      case 'tiles_120': return tiles120(V, lv);
      case 'cut45_m': return 3 / 39 * tiles60(V, lv) + 5 / 39 * tiles120(V, lv);
      case 'drill_n': return Math.round(16 / 39 * tiles60(V, lv) + 20 / 39 * tiles120(V, lv));
      case 'spots': return Math.ceil(0.08 * S);                                    /* калькулятор MOD: споты 0,08 × площадь */
      case 'rooms': return R;
      case 'bra': return 2 * R;
      case 'doors_n': return V.doors_n;
      case 'doors_double_n': return V.doors_double_n;
      case 'floor_dry': return V.floor_dry;
      case 'plinth_pcs': return Math.ceil(V.plinth_m / 2);                         /* планка 2 м */
      case 'bathtub': return V.bathtub;
    }
    return 0;
  }

  /* состояния демо → колонки Scout. «Чистовая — переделаем под интерьер» в Scout отдельно не считается
     (у «С отделкой» только установка сантехники и света), поэтому берём набор White Box: отделка без черновых */
  var COL = { secondary: 'secondary', pre: 'pre', concrete: 'concrete', finish: 'pre' };
  function works(V, stateId, level) {
    var W = window.SOVE_WORKS; if (!V || !W) return null;
    var lv = level === 'premium' ? 'premium' : 'base', col = COL[stateId] || 'concrete', lines = [], by = {};
    W.items.forEach(function (it) {
      if (!(it[lv] || {})[col]) return;
      var q = qty(V, it, col, lv), price = it.byRooms ? it.byRooms[rk(V)] : it.price;
      if (!(q > 0) || !(price > 0)) return;
      var s = q * price;
      lines.push({ row: it.row, work: it.work, unit: it.unit, qty: r1(q), price: price, sum: Math.round(s), stage: it.stage });
      by[it.stage] = (by[it.stage] || 0) + s;
    });
    var names = (window.SOVE && window.SOVE.data && window.SOVE.data.scout && window.SOVE.data.scout.stages || []).map(function (x) { return x[0]; });
    if (!names.length) names = STAGES;
    var total = lines.reduce(function (a, l) { return a + l.sum; }, 0);
    return { lines: lines, total: total, stages: names.map(function (n) { return [n, Math.round(by[n] || 0)]; }), source: W.source, date: W.date };
  }

  /* короткая сводка для карточек: что посчитано по плану */
  function summary(V) {
    if (!V) return [];
    return [
      ['Пол', V.floor_dry, 'м²', 'сухие комнаты'], ['Пол санузлов', V.floor_bath, 'м²', 'плитка'],
      ['Стены', V.walls, 'м²', 'за вычетом дверей и окон'], ['Стены санузлов', V.walls_bath, 'м²', 'плитка на всю высоту'],
      ['Покраска', V.paint, 'м²', 'стены сухих комнат'], ['Плинтус', V.plinth_m, 'м', 'без дверных проёмов'],
      ['Откосы', V.slopes_m, 'м', 'окна и двери'], ['Двери', V.doors_n + V.doors_double_n, 'шт', ''], ['Окна', V.windows_n, 'шт', '']
    ];
  }

  window.SOVE_VOLUMES = { fromGeo: fromGeo, works: works, summary: summary, outline: outline, measure: measure, STAGES: STAGES };
})();
