/* Советы проектировщика на экране «Расстановка мебели» (Алина 27.10: «а подсказки при расстановке
   он делает как проектировщик?»). «Замечания» в arrange.js — нарушения норм между предметами:
   проходы, двери, окна, наложения; их же ловит сервер (ai_layout.validate). Здесь — то, что
   сказал бы дизайнер, глядя на расстановку: проходы до стен (их validate не меряет), кровать
   160 или 180, тумбы с двух сторон, стол у окна, диван напротив ТВ и на каком расстоянии, размер
   дивана, кухня, мойка и плита, шкафы, стирка, бытовое хранение, ванна в евро-2.
   Правила и числа — из документов SOVE «Планировочные правила по форматам» и «Правила генераций»
   (services/api/ai_knowledge/rules/formats.json и layout.json, 11.10.2026; нормы стартовые —
   дизайнер подтверждает). Правило не из этих документов помечено general — на экране «общее правило».
   Считается кодом по рамкам плана после каждой перестановки: бесплатно, без нейросети.
   Где можно, совет несёт готовую правку (fix). Её проверяет та же validate, что и ручные
   перестановки: правка не должна добавить ни одного замечания и не должна прятать проход.

   SOVE_TIPS.check(ctx) → [{ key, room, tone, text, ids, also, fix, norm, general }]
     tone: 'tip' — совет (идёт в счёт «N советов»), 'opt' — вариант на выбор (не в счёт), 'ok' — уже по правилам;
     norm: совет о норме прохода до стены — плашка тогда не пишет «проходы свободны»;
     general: правило не из документов SOVE; also: связанные предметы (тумбы кровати) — для сверки с замечаниями;
     fix: null | { label, done, boxes: [{ id, box }] }
   ctx: { ppm, rooms, windows, items, problems, flatM2, brief, wants, notPlaced, roomOf, validate } */
(function () {
  /* числа правил и откуда они */
  var N = {
    bedSide: .6,       /* layout.passage: «с боков и в ногах кровати 60 см»; formats евро-2: «180 × 200, если с двух сторон остаётся по 60 см, иначе 160 × 200» */
    bed180: 1.75,      /* от этой ширины кровать — 180 */
    bedDouble: 1.35,   /* от этой — двуспальная: проход и тумбы с двух сторон (formats: «тумбы с двух сторон») */
    standGap: .2,      /* тумба «у кровати» — не дальше 20 см от бока */
    tvNear: .0365, tvFar: .0545, /* layout.tv_distance: «для 55 дюймов 2–3 м, для другой диагонали — пропорционально»: 3,65 и 5,45 см на дюйм */
    tvSlack: .05,      /* рамки мебели лежат с шагом 5 см: 1,96 м до экрана — «около 2 м», не повод для совета */
    tvAxis: .3,        /* formats евро-2: «диван напротив ТВ»; сдвиг оси больше 30 см — уже вполоборота */
    deskZone: .6,      /* formats евро-2: «у окна рабочее место 120 × 60» — стол в полосе 60 см от проёма */
    deskLen: 1,        /* стол короче 1 м — тесно (в проектах 120 × 60) */
    kitchenFront: 2,   /* formats евро-2: «кухня одной линией или Г вдоль стены, фронт 2–3 м» */
    sinkHob: .4,       /* layout.passage: «между мойкой и плитой 40 см столешницы» */
    wardrobeBed: 2.2, wardrobeBedMax: 2.4, /* formats евро-2 спальня: «шкаф 2,2–2,4 м» */
    wardrobeFront: .9, /* layout.passage: «перед распашным шкафом 90 см» */
    hallLen: 1.3, hallDepth: .55, /* formats евро-2 прихожая: «шкаф глубиной 600 мм, длиной от 1,3 м» */
    chair: .75,        /* layout.passage: «за стулом обеденного стола до стены 75 см» */
    wcAxis: .35, wcFront: .6, /* layout.passage: «перед унитазом 60 см, от оси до стены 35 см» */
    sofaTol: .1,       /* layout.sofa_scale: сервер (ai_review) прощает ±10 см — совет не строже сервера */
    touch: .1,         /* щель меньше 10 см — вплотную, а не проход (как в нормах) */
    thin: .25,         /* тоньше — ТВ на стене, сушитель: прохода не занимает */
    winCover: .05      /* высокая мебель заходит на окно больше чем на 5 см — уже закрывает свет */
  };
  /* layout.sofa_by_area — канон дивана по площади квартиры: до 30 м² — 160–180 см, до 45 — 190–210,
     до 60 — 220–240, до 80 — 250–280 или угловой. Больше 80 м² правила нет — и совета нет */
  var SOFA = [[30, 1.6, 1.8, ''], [45, 1.9, 2.1, ''], [60, 2.2, 2.4, ''], [80, 2.5, 2.8, ' или угловой']];
  var SOFA_EVRO2 = [2.1, 2.2];   /* formats евро-2, кухня-гостиная: «Диван 210–220 см» — в евро-2 это тоже норма */

  var OPP = { w: 'e', e: 'w', n: 's', s: 'n' };
  var SIDE = { west: 'w', east: 'e', north: 'n', south: 's', w: 'w', e: 'e', n: 'n', s: 's' };
  var ROOM = { bed: /спал/, living: /гост|студ/, kitchen: /кух/, bath: /сан|ванн|туал|душев/,
               hall: /прихож|коридор|холл/, hidden: /постир|кладов|гардеробн/ };
  /* предметы — по подписи, как в нормах сервера */
  var IS = {
    bed: /^кроват/, stand: /прикроват/, desk: /рабоч|письмен|туалетн/, wardrobe: /гардероб|шкаф/,
    sofa: /^диван/, tv: /^тв(\s|$)|телевиз/, coffee: /журнальн/, table: /обеден/,
    sink: /^мойк/, hob: /вароч|плит/, fridge: /холодильн/,
    kitchen: /мойк|плит|варочн|посудом|углов|холодильник встро|модул|пенал/,
    wc: /унитаз/, bath: /^ванн/, shower: /^душ/, laundry: /стирк|стирал|сушил/,
    utility: /бытов|хозяйств|кладов|пылесос/, pouf: /пуф|банкетк|консол/,
    tall: /шкаф|гардероб|стеллаж|холодильник|пенал|колонна/
  };
  var NB = '\u00a0';   /* неразрывный пробел: «43 см» и «160 × 200» не рвутся по строкам */

  var C = null;   /* контекст текущей проверки */
  var P = 1;      /* пикселей плана в метре */

  function low(s) { return String(s || '').toLowerCase(); }
  function rt(r) { return low((r.type || '') + ' ' + (r.name || '')); }
  function is(it, k) { return IS[k].test(low(it.label)); }
  function m(px) { return px / P; }
  function num(v) { return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/0$/, '').replace(/,0?$/, ''); }
  function num1(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  function cm(v) { return String(Math.round(v * 100)); }
  function up(v) { return Math.ceil(v * 100 - 1e-6) / 100; }   /* до сантиметра вверх: «сдвинь на 7 см», а не на 6,4 */
  /* расстояние в тех же единицах, что норма рядом: меньше метра — «43 см», от метра — «1,06 м» */
  function len(v) { return v < .995 ? cm(v) + NB + 'см' : num(v) + NB + 'м'; }
  /* два расстояния: «50 и 50 см», «1,2 и 1,3 м», «60 см и 1,06 м» */
  function two(a, b) {
    var ca = a < .995, cb = b < .995;
    if (ca && cb) return cm(a) + ' и ' + cm(b) + NB + 'см';
    if (!ca && !cb) return num(a) + ' и ' + num(b) + NB + 'м';
    return len(a) + ' и ' + len(b);
  }
  function dims(a, b) { return a + NB + '×' + NB + b; }
  function over(a, b) {
    return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  }
  function center(b) { return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
  function d2(a, b) { return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]); }
  function thin(it) { var b = it.box; return Math.min(b[2] - b[0], b[3] - b[1]) < N.thin * P; }
  function ids(list) { return list.map(function (it) { return it.id; }); }
  function byId(id) { return C.items.filter(function (it) { return it.id === id; })[0] || null; }
  function mainRooms() { return C.rooms.filter(function (r) { return !r.part_of; }); }
  function byName(n) { return C.rooms.filter(function (r) { return r.name === n; })[0] || null; }
  /* комната предмета; у ниши — комната, к которой она относится */
  function hostOf(box) { var r = C.roomOf(box); return r ? (r.part_of ? byName(r.part_of) || r : r) : null; }
  /* прямоугольники комнаты: сама комната и её ниши (Г-образная комната размечена комнатой и нишей) */
  function rectsOf(room) {
    return [room.box].concat(C.rooms.filter(function (r) { return r.part_of === room.name; }).map(function (r) { return r.box; }));
  }
  function bbox(bs) {
    return [Math.min.apply(null, bs.map(function (b) { return b[0]; })), Math.min.apply(null, bs.map(function (b) { return b[1]; })),
            Math.max.apply(null, bs.map(function (b) { return b[2]; })), Math.max.apply(null, bs.map(function (b) { return b[3]; }))];
  }
  /* сколько рамки (px²) выходит за комнату с её нишами: режем рамку по краям прямоугольников
     и складываем куски, которых не накрывает ни один из них */
  function outside(b, rs) {
    var xs = [b[0], b[2]], ys = [b[1], b[3]], out = 0;
    rs.forEach(function (r) {
      [r[0], r[2]].forEach(function (x) { if (x > b[0] && x < b[2]) xs.push(x); });
      [r[1], r[3]].forEach(function (y) { if (y > b[1] && y < b[3]) ys.push(y); });
    });
    xs.sort(function (p, q) { return p - q; }); ys.sort(function (p, q) { return p - q; });
    for (var i = 0; i + 1 < xs.length; i++) for (var j = 0; j + 1 < ys.length; j++) {
      var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (!rs.some(function (r) { return cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]; }))
        out += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
    }
    return out;
  }
  /* какими сторонами рамка стоит у стены своей комнаты (до 12 см) */
  function touchesBox(b) {
    var r = C.roomOf(b); if (!r) return {};
    var R = r.box, t = .12 * P;
    return { w: Math.abs(b[0] - R[0]) <= t, e: Math.abs(R[2] - b[2]) <= t, n: Math.abs(b[1] - R[1]) <= t, s: Math.abs(R[3] - b[3]) <= t };
  }
  function touches(it) { return touchesBox(it.box); }
  /* свободно от стороны предмета до стены или ближайшего предмета в эту сторону:
     { m — метры, by — предмет-препятствие или null, если упираемся в стену }. Тонкое (ТВ на стене) не мешает.
     Стены берём только у тех прямоугольников комнаты и её ниш, что стоят напротив предмета: у Г-образной
     комнаты стена главной части ближе, чем край общей рамки с нишей. Предмет, который наехал на этот край
     (наложение меньше порога «Замечаний»), оставляет 0 — места с этой стороны нет. */
  function clear(it, dir, skip) {
    var b = it.box, room = hostOf(b); if (!room) return null;
    var side = dir === 'w' || dir === 'e', tol = .05 * P, by = null, hit = false;
    var rs = rectsOf(room).filter(function (r) {
      return (side ? Math.min(b[3], r[3]) - Math.max(b[1], r[1]) : Math.min(b[2], r[2]) - Math.max(b[0], r[0])) > tol;
    });
    var R = bbox(rs.length ? rs : [room.box]);
    var lim = dir === 'w' ? R[0] : dir === 'e' ? R[2] : dir === 'n' ? R[1] : R[3];
    var edge = dir === 'w' ? b[0] : dir === 'e' ? b[2] : dir === 'n' ? b[1] : b[3];
    C.items.forEach(function (o) {
      if (hit || o.id === it.id || thin(o) || (skip && skip(o))) return;
      var ob = o.box;
      var px = Math.min(b[2], ob[2]) - Math.max(b[0], ob[0]), py = Math.min(b[3], ob[3]) - Math.max(b[1], ob[1]);
      if (px > tol && py > tol) {
        /* наложение относим к той стороне, с которой предмет зашёл неглубоко */
        var oc = center(ob), bc = center(b);
        var into = px < py ? (oc[0] < bc[0] ? 'w' : 'e') : (oc[1] < bc[1] ? 'n' : 's');
        if (into === dir) { lim = edge; by = o; hit = true; }
        return;
      }
      if ((side ? py : px) <= tol) return;
      if (dir === 'w' && ob[2] <= b[0] + tol && ob[2] > lim) { lim = ob[2]; by = o; }
      if (dir === 'e' && ob[0] >= b[2] - tol && ob[0] < lim) { lim = ob[0]; by = o; }
      if (dir === 'n' && ob[3] <= b[1] + tol && ob[3] > lim) { lim = ob[3]; by = o; }
      if (dir === 's' && ob[1] >= b[3] - tol && ob[1] < lim) { lim = ob[1]; by = o; }
    });
    var gap = dir === 'w' ? b[0] - lim : dir === 'e' ? lim - b[2] : dir === 'n' ? b[1] - lim : lim - b[3];
    return { m: Math.max(0, gap) / P, by: by };
  }
  /* эта пара уже в «Замечаниях» (узкий проход или наложение) — совет не дублирует */
  function flagged(a, b) {
    return C.problems.some(function (p) { return (p.id === a.id && p.id2 === b.id) || (p.id === b.id && p.id2 === a.id); });
  }
  function shift(box, dir, d) {
    var dx = dir === 'w' ? -d : dir === 'e' ? d : 0, dy = dir === 'n' ? -d : dir === 's' ? d : 0;
    return [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy];
  }
  /* зазор между рамками, если они стоят друг напротив друга (перекрываются по другой оси), как в нормах; иначе null */
  function faceGap(a, b) {
    var dx = Math.max(a[0] - b[2], b[0] - a[2]), dy = Math.max(a[1] - b[3], b[1] - a[3]);
    if (dy < 0 && dx >= 0) return dx;
    if (dx < 0 && dy >= 0) return dy;
    return null;
  }
  /* кому можно встать вплотную: модулям одного кухонного ряда и тумбе к своей кровати */
  function ownPair(a, b) {
    if (is(a, 'kitchen') && is(b, 'kitchen')) return runGap(a, b) !== null;
    return (is(a, 'bed') && is(b, 'stand')) || (is(a, 'stand') && is(b, 'bed'));
  }
  /* правка годится, если предметы остались в своей комнате (внутри неё и её ниш с допуском 1 px — или
     вылезают не сильнее, чем до правки), ни на что не налезли, не встали вплотную туда, где был проход
     (иначе «узкий проход» не решается, а просто пропадает из «Замечаний»), и проверка норм не нашла
     ни одного нового замечания */
  function valid(changes) {
    var map = {}; changes.forEach(function (c) { map[c.id] = c.box; });
    var trial = C.items.map(function (it) { return map[it.id] ? { id: it.id, label: it.label, box: map[it.id], kind: it.kind } : it; });
    var touch = N.touch * P;
    for (var i = 0; i < changes.length; i++) {
      var c = changes[i], was = byId(c.id);
      if (!was || !C.roomOf(c.box)) return false;
      var host = hostOf(was.box);
      if (!host || hostOf(c.box) !== host) return false;
      var rs = rectsOf(host), edge = Math.max(c.box[2] - c.box[0], c.box[3] - c.box[1]);
      if (outside(c.box, rs) > Math.max(edge, outside(was.box, rs)) + .01) return false;
      for (var j = 0; j < trial.length; j++) {
        var o = trial[j]; if (o.id === c.id) continue;
        if (over(c.box, o.box) > 1) return false;
        var o0 = byId(o.id);
        if (thin(was) || thin(o) || ownPair(was, o) || hostOf(o0.box) !== host) continue;
        var g0 = faceGap(was.box, o0.box), g1 = faceGap(c.box, o.box);
        if (g0 !== null && g0 > touch && g1 !== null && g1 <= touch) return false;
      }
    }
    var moved = changes.map(function (c) { return c.id; }), probs = C.validate(trial);
    if (probs.length > C.problems.length) return false;
    return !probs.some(function (p) { return moved.indexOf(p.id) >= 0 || (p.id2 !== undefined && moved.indexOf(p.id2) >= 0); });
  }
  /* o: { prio, norm, general, also } */
  function T(key, room, tone, text, idl, fix, o) {
    o = o || {};
    return { key: key, room: room ? room.name : '', tone: tone, text: text, ids: idl || [], fix: fix || null,
             prio: o.prio || 0, norm: !!o.norm, general: !!o.general, also: o.also || [] };
  }

  /* окна: отрезок стены с проёмом. Прямоугольник ищем по типу среди комнат и их ниш и берём ближайший:
     у евротрёшки две спальни, а окно Г-образной кухни стоит на стене ниши, а не главной рамки.
     seg.room — комната (по ней советы группируются), seg.box — прямоугольник, на стене которого окно */
  function windowsOf() {
    return (C.windows || []).map(function (w) {
      var t = low(w.room), side = SIDE[low(w.wall)], s = w.box;
      if (!side || !s) return null;
      var cands = C.rooms.filter(function (r) {
        var host = r.part_of ? byName(r.part_of) : null;
        return low(r.type || r.name) === t || (host && low(host.type || host.name) === t);
      });
      if (!cands.length) return null;
      var c = center(s);
      cands.sort(function (a, b) { return gapTo(a.box, c) - gapTo(b.box, c); });
      var rect = cands[0], b = rect.box, seg = side === 'w' || side === 'e'
        ? { side: side, from: Math.max(s[1], b[1]), to: Math.min(s[3], b[3]) }
        : { side: side, from: Math.max(s[0], b[0]), to: Math.min(s[2], b[2]) };
      if (seg.to - seg.from < .3 * P) return null;
      seg.room = rect.part_of ? byName(rect.part_of) || rect : rect;
      seg.box = b;
      return seg;
    }).filter(Boolean);
  }
  function gapTo(b, p) { var dx = Math.max(b[0] - p[0], 0, p[0] - b[2]), dy = Math.max(b[1] - p[1], 0, p[1] - b[3]); return dx * dx + dy * dy; }
  /* полоса перед окном внутри его прямоугольника глубиной d метров */
  function zone(seg, d) {
    var b = seg.box, k = d * P;
    if (seg.side === 'w') return [b[0], seg.from, b[0] + k, seg.to];
    if (seg.side === 'e') return [b[2] - k, seg.from, b[2], seg.to];
    if (seg.side === 'n') return [seg.from, b[1], seg.to, b[1] + k];
    return [seg.from, b[3] - k, seg.to, b[3]];
  }
  /* формат по правилу formats.json: евро-N = изолированные жилые комнаты + 1; кухня-гостиная не считается */
  function format() {
    var main = mainRooms(), iso = main.filter(function (r) { return /спал|детск|гостев|кабинет/.test(rt(r)); }).length;
    var kitchenApart = main.some(function (r) { return ROOM.kitchen.test(rt(r)) && !ROOM.living.test(rt(r)); });
    if (kitchenApart) iso += main.filter(function (r) { return ROOM.living.test(rt(r)) && !ROOM.kitchen.test(rt(r)); }).length;
    return iso + 1;
  }

  /* ── кровать: 160 или 180, проходы по бокам и в ногах, тумбы ─────────── */
  function standsOf(bed, sides) {
    var b = bed.box, g = N.standGap * P, res = {};
    sides.forEach(function (s) { res[s] = []; });
    C.items.forEach(function (o) {
      if (!is(o, 'stand')) return;
      var ob = o.box;
      sides.forEach(function (s) {
        var along = s === 'w' || s === 'e' ? Math.min(b[3], ob[3]) - Math.max(b[1], ob[1]) : Math.min(b[2], ob[2]) - Math.max(b[0], ob[0]);
        var gap = s === 'w' ? b[0] - ob[2] : s === 'e' ? ob[0] - b[2] : s === 'n' ? b[1] - ob[3] : ob[1] - b[3];
        if (along > 0 && gap >= -2 && gap <= g) res[s].push(o);
      });
    });
    return res;
  }
  function moveBed(bed, sides, dir, d) {
    var st = standsOf(bed, sides), out = [{ id: bed.id, box: shift(bed.box, dir, d * P) }];
    st[sides[0]].concat(st[sides[1]]).forEach(function (o) { out.push({ id: o.id, box: shift(o.box, dir, d * P) }); });
    return out;
  }
  /* кровать шириной W вместо нынешней: бока растут так, чтобы по обе стороны осталось по 60 см
     (если можно — поровну), тумбы едут вместе с боками */
  function resizeBed(bed, sides, A, B, W) {
    var b = bed.box, vert = sides[0] === 'w', g = W - m(vert ? b[2] - b[0] : b[3] - b[1]);
    var lo = g - (B - N.bedSide), hi = A - N.bedSide;            /* сколько отдать стороне A */
    var gA = lo <= hi ? Math.max(lo, Math.min(hi, g / 2)) : (A - B + g) / 2;
    gA = Math.round(gA * 100) / 100;
    var gB = Math.round((g - gA) * 100) / 100;
    var nb = vert ? [b[0] - gA * P, b[1], b[2] + gB * P, b[3]] : [b[0], b[1] - gA * P, b[2], b[3] + gB * P];
    var st = standsOf(bed, sides), out = [{ id: bed.id, box: nb }];
    st[sides[0]].forEach(function (o) { out.push({ id: o.id, box: shift(o.box, sides[0], gA * P) }); });
    st[sides[1]].forEach(function (o) { out.push({ id: o.id, box: shift(o.box, sides[1], gB * P) }); });
    return { boxes: out, A: A - gA, B: B - gB };
  }
  /* изголовье — короткой стороной к стене; стоят у двух стен или ни у одной — к ближней */
  function headSide(bed, vert) {
    var tc = touches(bed), a = vert ? 'n' : 'w', b = vert ? 's' : 'e';
    if (tc[a] !== tc[b]) return tc[a] ? a : b;
    var ca = clear(bed, a), cb = clear(bed, b);
    return (ca ? ca.m : 9) <= (cb ? cb.m : 9) ? a : b;
  }
  /* главная спальня — самая большая: 180 × 200 предлагаем только в ней (formats евро-3: кровать 180 × 200 — в мастер-спальне) */
  function masterBedroom() {
    var best = null, area = 0;
    mainRooms().forEach(function (r) {
      if (!ROOM.bed.test(rt(r))) return;
      var a = (r.box[2] - r.box[0]) * (r.box[3] - r.box[1]);
      if (a > area) { best = r; area = a; }
    });
    return best;
  }
  /* ширина кровати из анкеты: «160×200» → 1,6; не разобрали — null */
  function briefBed() {
    var mt = String((C.brief && C.brief.bed) || '').match(/(\d{2,3})\s*[×xхX*]\s*\d{2,3}/);
    return mt ? +mt[1] / 100 : null;
  }
  function bedTips(add) {
    /* размер кровати — выбор клиента (formats евро-2: «кровать 160 или 180»): выбрал в анкете — другой не предлагаем */
    var asked = !!(C.brief && C.brief.bed), askedW = briefBed(), master = masterBedroom();
    C.items.filter(function (it) { return is(it, 'bed'); }).forEach(function (bed) {
      var room = hostOf(bed.box); if (!room) return;
      var b = bed.box, vert = (b[2] - b[0]) <= (b[3] - b[1]);
      var W = m(vert ? b[2] - b[0] : b[3] - b[1]), L = m(vert ? b[3] - b[1] : b[2] - b[0]);
      var sides = vert ? ['w', 'e'] : ['n', 's'], key = 'bed' + bed.id, size = dims(cm(W), cm(L));
      var notStand = function (o) { return is(o, 'stand'); };
      var cA = clear(bed, sides[0], notStand), cB = clear(bed, sides[1], notStand);
      if (!cA || !cB) return;
      var st = standsOf(bed, sides), nA = st[sides[0]].length, nB = st[sides[1]].length;
      var withStands = { also: ids(st[sides[0]].concat(st[sides[1]])) };   /* «✓» про кровать снимаем и при замечании у её тумб */
      var A = cA.m, B = cB.m, lo = Math.min(A, B), loC = A <= B ? cA : cB, hiDir = A <= B ? sides[1] : sides[0];
      /* пара уже в «Замечаниях» (узкий проход или наложение) — не повторяем */
      var dup = loC.by && flagged(bed, loC.by);
      if (W >= N.bedDouble) {
        if (lo < N.bedSide - .005 && !dup) {
          var need = up(N.bedSide - lo), norm = { norm: !loC.by };   /* проход до стены — норма, которую validate не меряет */
          if (A + B >= 2 * N.bedSide - .005) {
            var mv = moveBed(bed, sides, hiDir, need);
            add(T(key + '-side', room, 'tip', (W >= N.bed180 ? 'Кровать ' + size + ': с одной стороны' : 'С одной стороны кровати') + ' проход ' + len(lo) +
              ', а нужно 60. Сдвинь её на ' + cm(need) + NB + 'см — пройти можно будет с двух сторон.', [bed.id],
              valid(mv) ? { label: 'Сдвинуть на ' + cm(need) + NB + 'см', done: 'кровать сдвинута — проходы с двух сторон', boxes: mv } : null, norm));
          } else if (W >= N.bed180 && !asked) {
            var r160 = resizeBed(bed, sides, A, B, 1.6);
            add(T(key + '-160', room, 'tip', 'Для кровати ' + size + ' здесь тесно: с одной стороны проход ' + len(lo) +
              '. По нашим правилам 180 ставим, если с двух сторон остаётся по 60' + NB + 'см, иначе ' + dims(160, 200) + '.', [bed.id],
              valid(r160.boxes) && Math.min(r160.A, r160.B) > lo + .05 ? { label: 'Поставить ' + dims(160, 200), done: 'кровать ' + dims(160, 200), boxes: r160.boxes } : null, norm));
          } else if (W >= N.bed180) {
            add(T(key + '-side', room, 'tip', 'Для кровати ' + size + ' здесь тесно: с одной стороны проход ' + len(lo) + ', а нужно 60.', [bed.id], null, norm));
          } else {
            add(T(key + '-side', room, 'tip', 'С одной стороны кровати проход ' + len(lo) + ', а нужно 60' +
              (asked ? '.' : ': для ' + size + ' здесь тесно — возьми кровать поуже.'), [bed.id], null, norm));
          }
        } else if (!dup) {
          var same = askedW !== null && Math.abs(askedW - W) < .055;
          add(T(key + '-ok', room, 'ok', same ? 'Кровать ' + size + ' — как в анкете; проходы по бокам ' + two(A, B) + '.'
            : 'Кровать ' + size + ': проходы по бокам ' + two(A, B) + ' — от 60' + NB + 'см с двух сторон.', [bed.id], null, withStands));
          /* без анкеты 180 — вариант на выбор, а не совет; во второй спальне евро-3+ не предлагаем */
          if (!asked && room === master && W < N.bed180 && A + B - (1.8 - W) >= 2 * N.bedSide - .005) {
            var r180 = resizeBed(bed, sides, A, B, 1.8);
            if (valid(r180.boxes))
              add(T(key + '-180', room, 'opt', 'Сюда встанет и кровать ' + dims(180, 200) + ' — по бокам останется ' + two(r180.A, r180.B) + '.', [bed.id],
                { label: 'Поставить ' + dims(180, 200), done: 'кровать ' + dims(180, 200), boxes: r180.boxes }));
          }
        }
        if (!nA && !nB) add(T(key + '-stands', room, 'tip', 'У кровати нет тумб — у двуспальной в наших проектах по тумбе с каждой стороны.', [bed.id], null, { prio: -1 }));
        else if (!nA || !nB) add(T(key + '-stands', room, 'tip', 'Тумба только с одной стороны кровати — у двуспальной в наших проектах тумбы с двух сторон.', [bed.id], null, { prio: -1 }));
        else add(T(key + '-stands', room, 'ok', 'Тумбы с двух сторон кровати.', [bed.id], null, withStands));
      } else if (Math.max(A, B) < N.bedSide - .005 && !dup) {
        add(T(key + '-side', room, 'tip', 'К кровати не подойти: по бокам ' + two(A, B) + ', а нужно 60 хотя бы с одной стороны.', [bed.id], null, { norm: !cA.by || !cB.by }));
      }
      var cf = clear(bed, OPP[headSide(bed, vert)]);
      if (cf && cf.m < N.bedSide - .005 && !(cf.by && flagged(bed, cf.by)))
        add(T(key + '-foot', room, 'tip', 'В ногах кровати ' + len(cf.m) + ', а чтобы пройти, нужно 60.', [bed.id], null, { norm: !cf.by }));
    });
  }

  /* ── рабочее место у окна ─────────────────────────────────────────────── */
  function deskToWindow(d, segs) {
    var b = d.box, Lp = Math.max(b[2] - b[0], b[3] - b[1]), Dp = Math.min(b[2] - b[0], b[3] - b[1]), step = .05 * P;
    var list = segs.slice().sort(function (a, c) { return (c.to - c.from) - (a.to - a.from); });
    for (var i = 0; i < list.length; i++) {
      var s = list[i], R = s.box, mid = (s.from + s.to) / 2, alongX = s.side === 'n' || s.side === 's';
      var lo = alongX ? R[0] : R[1], hi = (alongX ? R[2] : R[3]) - Lp;
      for (var k = 0; k <= 40; k++) {
        var tries = k ? [k, -k] : [0];
        for (var t = 0; t < tries.length; t++) {
          var a0 = mid - Lp / 2 + tries[t] * step;
          if (a0 < lo - 1 || a0 > hi + 1) continue;
          a0 = Math.max(lo, Math.min(hi, a0));
          var box = s.side === 'w' ? [R[0], a0, R[0] + Dp, a0 + Lp] : s.side === 'e' ? [R[2] - Dp, a0, R[2], a0 + Lp]
            : s.side === 'n' ? [a0, R[1], a0 + Lp, R[1] + Dp] : [a0, R[3] - Dp, a0 + Lp, R[3]];
          if (over(box, zone(s, N.deskZone)) <= 0) continue;
          var ch = [{ id: d.id, box: box }];
          if (valid(ch)) return ch;
        }
      }
    }
    return null;
  }
  function deskTips(add, wins) {
    C.items.filter(function (it) { return is(it, 'desk'); }).forEach(function (d) {
      var room = hostOf(d.box); if (!room) return;
      var key = 'desk' + d.id, dl = m(Math.max(d.box[2] - d.box[0], d.box[3] - d.box[1]));
      var segs = wins.filter(function (s) { return s.room === room; });
      if (segs.length) {
        if (segs.some(function (s) { return over(d.box, zone(s, N.deskZone)) > 0; })) {
          add(T(key, room, 'ok', 'Рабочее место у окна — днём свет падает на стол.', [d.id]));
        } else {
          var mv = deskToWindow(d, segs);
          add(T(key, room, 'tip', 'Рабочее место далеко от окна. В наших проектах стол ставят у окна — днём на него падает свет.', [d.id],
            mv ? { label: 'Перенести к окну', done: 'стол у окна', boxes: mv } : null));
        }
      }
      if (dl < N.deskLen - .005) add(T(key + '-len', room, 'tip', 'Стол ' + len(dl) + ' — работать тесно. В наших проектах рабочее место ' + dims(120, 60) + NB + 'см.', [d.id]));
    });
  }

  /* ── диван и ТВ: ось взгляда, расстояние по диагонали экрана; размер дивана по площади квартиры ── */
  /* куда смотрит диван: поперёк длинной стороны, спинкой от стены, которой касается; у стены не стоит — к ТВ */
  function sofaFace(s, tv) {
    var b = s.box, horiz = (b[2] - b[0]) >= (b[3] - b[1]), t = touches(s);
    var a = horiz ? 'n' : 'w', z = horiz ? 's' : 'e';
    if (t[a] && !t[z]) return z;
    if (t[z] && !t[a]) return a;
    var sc = center(b), tc = center(tv.box);
    return horiz ? (tc[1] >= sc[1] ? 's' : 'n') : (tc[0] >= sc[0] ? 'e' : 'w');
  }
  /* диагональ по ширине ТВ: у сервера ТВ 1,24 м — это 55″; шаг 5″ */
  function inches(tv) { var b = tv.box; return Math.max(5, Math.round(55 * m(Math.max(b[2] - b[0], b[3] - b[1])) / 1.24 / 5) * 5); }
  /* ТВ (не вышло — диван) двигаем только вдоль его длинной стороны, к оси соседа. Вариант, после которого
     предмет перестал касаться стены, у которой стоял спиной (или стал касаться другой), отбрасываем: ТВ остаётся
     на своей стене. Уйти вдоль стены из угла можно — торцевая стена тут ни при чём */
  function alignTv(s, tv, alongX) {
    var step = .05 * P, lim = Math.floor(N.tvAxis * P / step), back = alongX ? ['n', 's'] : ['w', 'e'];
    function tryMove(it, target, label, done) {
      var c = center(it.box)[alongX ? 0 : 1], t0 = touches(it), ks = [0];
      for (var k = 1; k <= lim; k++) ks.push(k, -k);
      for (var i = 0; i < ks.length; i++) {
        var d = target + ks[i] * step - c;
        var box = alongX ? [it.box[0] + d, it.box[1], it.box[2] + d, it.box[3]] : [it.box[0], it.box[1] + d, it.box[2], it.box[3] + d];
        var t1 = touchesBox(box);
        if (back.some(function (sd) { return !!t0[sd] !== !!t1[sd]; })) continue;
        var ch = [{ id: it.id, box: box }];
        if (valid(ch)) return { label: label, done: done, boxes: ch };
      }
      return null;
    }
    return tryMove(tv, center(s.box)[alongX ? 0 : 1], 'Поставить ТВ напротив дивана', 'ТВ напротив дивана') ||
           tryMove(s, center(tv.box)[alongX ? 0 : 1], 'Сдвинуть диван напротив ТВ', 'диван напротив ТВ');
  }
  function tvTips(add) {
    C.items.filter(function (it) { return is(it, 'sofa'); }).forEach(function (s) {
      var room = hostOf(s.box); if (!room) return;
      var sc = center(s.box);
      var tvs = C.items.filter(function (it) { return is(it, 'tv') && hostOf(it.box) === room; });
      if (!tvs.length) return;
      tvs.sort(function (a, b) { return d2(center(a.box), sc) - d2(center(b.box), sc); });
      var tv = tvs[0], tc = center(tv.box), key = 'tv' + s.id, b = s.box, t = tv.box;
      var horiz = (b[2] - b[0]) >= (b[3] - b[1]), face = sofaFace(s, tv);
      /* ТВ должен быть впереди дивана и стоять к нему экраном — длинной стороной поперёк взгляда */
      var gap = face === 's' ? t[1] - b[3] : face === 'n' ? b[1] - t[3] : face === 'e' ? t[0] - b[2] : b[0] - t[2];
      var screen = ((t[2] - t[0]) >= (t[3] - t[1])) === horiz;
      if (gap < -.05 * P || !screen) {
        add(T(key + '-axis', room, 'tip', 'ТВ сбоку от дивана — повесь на стену напротив.', [tv.id, s.id]));
        return;
      }
      var dist = m(Math.max(0, gap)), off = m(Math.abs(horiz ? sc[0] - tc[0] : sc[1] - tc[1]));
      var inch = inches(tv), lo = Math.round(inch * N.tvNear * 10) / 10, hi = Math.round(inch * N.tvFar * 10) / 10;
      var scr = 'для экрана ~' + inch + '″', span = num1(lo) + '–' + num1(hi) + NB + 'м';
      if (dist < lo - N.tvSlack) add(T(key + '-d', room, 'tip', 'От дивана до ТВ ' + len(dist) + ' — ' + scr + ' нужно ' + span + ': ближе смотреть неудобно.', [s.id, tv.id]));
      else if (dist > hi + N.tvSlack) add(T(key + '-d', room, 'tip', 'От дивана до ТВ ' + len(dist) + ' — ' + scr + ' далеко, нужно ' + span + ': подвинь ближе или возьми экран больше.', [s.id, tv.id]));
      else add(T(key + '-d', room, 'ok', 'От дивана до ТВ ' + (dist < lo ? 'около ' + len(lo) : dist > hi ? 'около ' + len(hi) : len(dist)) + ' — ' + scr + ' в норме.', [s.id, tv.id]));
      if (off > N.tvAxis + .005) {
        add(T(key + '-axis', room, 'tip', 'ТВ не напротив дивана: сдвинут на ' + len(off) + ', смотреть придётся вполоборота. В наших проектах диван ставят напротив ТВ.',
          [tv.id, s.id], alignTv(s, tv, horiz)));
      } else add(T(key + '-axis', room, 'ok', 'Диван напротив ТВ.', [s.id, tv.id]));
    });
  }
  /* диван длиной W: растим от стены, которой он касается торцом; не касается — сначала туда, где свободнее;
     по центру — в последнюю очередь (иначе половина прибавки уходит в стену) */
  function growSofa(s, horiz, W) {
    var b = s.box, g = (W - m(horiz ? b[2] - b[0] : b[3] - b[1])) * P, t = touches(s);
    var a = horiz ? 'w' : 'n', z = horiz ? 'e' : 's', toZ = [0, g], toA = [g, 0];
    var order;
    if (t[a] && !t[z]) order = [toZ, toA];
    else if (t[z] && !t[a]) order = [toA, toZ];
    else { var ca = clear(s, a), cz = clear(s, z); order = (ca ? ca.m : 0) > (cz ? cz.m : 0) ? [toA, toZ] : [toZ, toA]; }
    order.push([g / 2, g / 2]);
    for (var i = 0; i < order.length; i++) {
      var o = order[i], box = horiz ? [b[0] - o[0], b[1], b[2] + o[1], b[3]] : [b[0], b[1] - o[0], b[2], b[3] + o[1]];
      var ch = [{ id: s.id, box: box }];
      if (valid(ch)) return ch;
    }
    return null;
  }
  function sofaTips(add, fmt) {
    var A = C.flatM2; if (!A) return;
    var row = SOFA.filter(function (r) { return A <= r[0]; })[0]; if (!row) return;
    var lo = row[1], hi = row[2];
    if (fmt === 2) { lo = Math.min(lo, SOFA_EVRO2[0]); hi = Math.max(hi, SOFA_EVRO2[1]); }
    var span = cm(lo) + '–' + cm(hi) + NB + 'см' + row[3], flat = num1(A) + NB + 'м²';
    C.items.filter(function (it) { return is(it, 'sofa'); }).forEach(function (s) {
      var room = hostOf(s.box), b = s.box, horiz = (b[2] - b[0]) >= (b[3] - b[1]), sl = m(horiz ? b[2] - b[0] : b[3] - b[1]), key = 'sofa' + s.id;
      if (sl < lo - N.sofaTol - .005) {
        var fx = growSofa(s, horiz, lo);
        add(T(key, room, 'tip', 'Диван ' + cm(sl) + NB + 'см маловат для квартиры ' + flat + ': по нашим правилам ' + span + '.', [s.id],
          fx ? { label: 'Поставить ' + cm(lo) + NB + 'см', done: 'диван ' + cm(lo) + NB + 'см', boxes: fx } : null));
      } else if (sl <= hi + N.sofaTol + .005) {
        var exact = sl >= lo - .005 && sl <= hi + .005;
        add(T(key, room, 'ok', 'Диван ' + cm(sl) + NB + 'см — по размеру квартиры' + (exact ? '' : ' с допуском 10' + NB + 'см') + ' (для ' + flat + ' — ' + span + ').', [s.id]));
      }
    });
  }
  /* ── обеденный стол: место, чтобы отодвинуть стул ─────────────────────── */
  function tableTips(add) {
    C.items.filter(function (it) { return is(it, 'table'); }).forEach(function (t) {
      var room = hostOf(t.box); if (!room) return;
      var dirs = ['w', 'e', 'n', 's'].map(function (d) { return { d: d, c: clear(t, d) }; }).filter(function (x) { return x.c; });
      var tight = dirs.filter(function (x) { return !x.c.by && x.c.m > N.touch && x.c.m < N.chair - .005; });
      if (!tight.length) {
        if (dirs.every(function (x) { return x.c.m >= N.chair - .005 || x.c.m <= N.touch; }))
          add(T('table' + t.id, room, 'ok', 'У обеденного стола хватает места, чтобы отодвинуть стулья.', [t.id]));
        return;
      }
      var w = tight[0], need = up(N.chair - w.c.m), opp = dirs.filter(function (x) { return x.d === OPP[w.d]; })[0];
      var mv = [{ id: t.id, box: shift(t.box, OPP[w.d], need * P) }];
      /* с другой стороны тоже нужно 75 см — и до стены, и до мебели: иначе стол встаёт вплотную к фасадам кухни */
      var can = opp && opp.c.m - need >= N.chair - .005 && valid(mv);
      add(T('table' + t.id, room, 'tip', 'От обеденного стола до стены ' + len(w.c.m) + ' — стул не отодвинуть, нужно 75.', [t.id],
        can ? { label: 'Сдвинуть стол на ' + cm(need) + NB + 'см', done: 'стол сдвинут на ' + cm(need) + NB + 'см', boxes: mv } : null, { norm: true }));
    });
  }

  /* ── кухня: фронт, мойка и плита, холодильник и плита ─────────────────── */
  /* зазор вдоль ряда: предметы на одной линии, если перекрываются поперёк ряда больше чем наполовину; иначе — угол, null */
  function runGap(a, b) {
    var A = a.box, B = b.box;
    var ovY = Math.min(A[3], B[3]) - Math.max(A[1], B[1]), ovX = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
    if (ovY > Math.min(A[3] - A[1], B[3] - B[1]) * .5) return m(Math.max(0, B[0] - A[2], A[0] - B[2]));
    if (ovX > Math.min(A[2] - A[0], B[2] - B[0]) * .5) return m(Math.max(0, B[1] - A[3], A[1] - B[3]));
    return null;
  }
  /* ширина модуля по фронту — вдоль стены, у которой он стоит: у посудомойки 45 см, хотя глубина 60 */
  function runLen(it) {
    var b = it.box, w = m(b[2] - b[0]), h = m(b[3] - b[1]), t = touches(it);
    var side = t.w || t.e, top = t.n || t.s;
    if (side && !top) return h;
    if (top && !side) return w;
    return side && top ? Math.min(w, h) : Math.max(w, h);   /* в углу — узкая сторона; посреди комнаты — длинная */
  }
  function kitchenTips(add) {
    var by = {}, order = [];
    C.items.forEach(function (it) {
      if (!is(it, 'kitchen')) return;
      var r = hostOf(it.box); if (!r) return;
      if (!by[r.name]) { by[r.name] = { room: r, list: [] }; order.push(r.name); }
      by[r.name].list.push(it);
    });
    order.forEach(function (k) {
      var room = by[k].room, list = by[k].list;
      if (list.length < 2) return;
      var front = Math.round(list.reduce(function (a, it) { return a + runLen(it); }, 0) * 100) / 100;
      if (front < N.kitchenFront - .005) add(T('kfront' + k, room, 'tip', 'Гарнитур ' + len(front) + ' по фронту — готовить тесно. В наших проектах 2–3' + NB + 'м.', ids(list)));
      else add(T('kfront' + k, room, 'ok', 'Гарнитур ' + len(front) + ' по фронту — в наших проектах от 2' + NB + 'м.', []));
      var sink = list.filter(function (it) { return is(it, 'sink'); })[0], hob = list.filter(function (it) { return is(it, 'hob'); })[0];
      var fridge = list.filter(function (it) { return is(it, 'fridge'); })[0];
      var sh = sink && hob ? runGap(sink, hob) : null;
      if (sh !== null && sh <= N.touch) {
        add(T('ksink' + k, room, 'tip', 'Плита вплотную к мойке. Между ними нужно хотя бы 40' + NB + 'см столешницы — чтобы брызги не летели на плиту и было где резать.', [hob.id, sink.id]));
      } else if (sh !== null && sh >= N.sinkHob - .005) {
        add(T('ksink' + k, room, 'ok', 'Между мойкой и плитой ' + len(sh) + ' столешницы — по норме от 40' + (sh < .995 ? '.' : NB + 'см.'), []));
      }
      /* общее правило (не из документов SOVE): холодильник не ставят вплотную к плите */
      var fh = fridge && hob ? runGap(fridge, hob) : null;
      if (fh !== null && fh <= N.touch) {
        add(T('kfridge' + k, room, 'tip', 'Холодильник вплотную к плите — от жара он изнашивается быстрее. Между ними нужен модуль или кусок столешницы.', [fridge.id, hob.id], null, { general: true }));
      }
    });
  }

  /* ── шкафы: длина в спальне, глубина и длина в прихожей, место перед дверцами ── */
  function wardrobeTips(add) {
    C.items.filter(function (it) { return is(it, 'wardrobe'); }).forEach(function (wd) {
      var room = hostOf(wd.box); if (!room) return;
      var r = rt(room), b = wd.box, horiz = (b[2] - b[0]) >= (b[3] - b[1]), key = 'wd' + wd.id;
      var wl = m(horiz ? b[2] - b[0] : b[3] - b[1]), dep = m(horiz ? b[3] - b[1] : b[2] - b[0]);
      if (ROOM.bed.test(r)) {
        if (wl < N.wardrobeBed - .005) add(T(key, room, 'tip', 'Шкаф ' + len(wl) + ' — для спальни мало: в наших проектах 2,2–2,4' + NB + 'м.', [wd.id]));
        else if (wl <= N.wardrobeBedMax + .005) add(T(key, room, 'ok', 'Шкаф ' + len(wl) + ' — как в наших проектах (2,2–2,4' + NB + 'м).', [wd.id]));
      } else if (ROOM.hall.test(r)) {
        var bad = false;
        if (dep < N.hallDepth - .005) { bad = true; add(T(key + '-d', room, 'tip', 'Шкаф глубиной ' + len(dep) + ' — вешалки поперёк не встанут. В наших проектах глубина 60' + NB + 'см.', [wd.id])); }
        if (wl < N.hallLen - .005) { bad = true; add(T(key + '-l', room, 'tip', 'Шкаф длиной ' + len(wl) + ' — в наших проектах от 1,3' + NB + 'м.', [wd.id])); }
        if (!bad) add(T(key, room, 'ok', 'Шкаф ' + num(wl) + NB + '×' + NB + num(dep) + NB + 'м — по нашим правилам.', [wd.id]));
      }
      /* дверцы — длинной стороной, той, где свободнее (вторая у стены или в глубине ниши) */
      var f = horiz ? [clear(wd, 'n'), clear(wd, 's')] : [clear(wd, 'w'), clear(wd, 'e')];
      if (!f[0] || !f[1]) return;
      var front = f[0].m >= f[1].m ? f[0] : f[1];
      if (front.m < N.wardrobeFront - .005 && !(front.by && flagged(wd, front.by))) {
        /* до стены — норма прохода; до мебели пару судит validate (у кровати своя норма 60 см) — здесь только про дверцы */
        if (!front.by) add(T(key + '-f', room, 'tip', 'Перед шкафом ' + len(front.m) + ', а распашным дверцам нужно 90. Возьми шкаф-купе.', [wd.id], null, { norm: true }));
        else if (front.m <= N.touch) add(T(key + '-f', room, 'tip', 'Перед шкафом вплотную «' + front.by.label + '» — распашные дверцы не откроются. Подойдёт шкаф-купе.', [wd.id, front.by.id]));
        else add(T(key + '-f', room, 'tip', 'Перед шкафом ' + len(front.m) + ' — распашные дверцы откроются впритык, в наших проектах 90. Подойдёт шкаф-купе.', [wd.id]));
      }
    });
  }

  /* ── санузел: ванна в евро-2, стирка скрыта, унитаз ───────────────────── */
  function wcTip(w, add) {
    var room = hostOf(w.box); if (!room) return;
    var tc = touches(w), b = w.box, bw = b[2] - b[0], bh = b[3] - b[1], best = null;
    /* спинка — по форме рамки: длинная сторона (0,75 м) — глубина от стены, спинка у стены поперёк неё.
       Только у квадратной рамки спиной туда, где спереди свободнее */
    var backs = Math.abs(bw - bh) < .05 * P ? ['w', 'e', 'n', 's'] : bh > bw ? ['n', 's'] : ['w', 'e'];
    backs.forEach(function (back) {
      if (!tc[back]) return;
      var f = clear(w, OPP[back]);
      if (f && (!best || f.m > best.f.m)) best = { back: back, f: f };
    });
    if (!best) return;
    var vertAxis = best.back === 'n' || best.back === 's', sides = vertAxis ? ['w', 'e'] : ['n', 's'];
    var half = m(vertAxis ? bw / 2 : bh / 2);
    var notTall = function (o) { return !is(o, 'tall'); };   /* сбоку считаем стены и высокие шкафы, не раковину */
    var axis = Math.min.apply(null, sides.map(function (s) { var c = clear(w, s, notTall); return c ? c.m + half : 9; }));
    var key = 'wc' + w.id;
    if (axis < N.wcAxis - .005) add(T(key, room, 'tip', 'От оси унитаза до стены ' + len(axis) + ', а нужно 35 — сидеть тесно.', [w.id], null, { norm: true }));
    else if (best.f.m < N.wcFront - .005 && !(best.f.by && flagged(w, best.f.by)))
      add(T(key, room, 'tip', 'Перед унитазом ' + len(best.f.m) + ', а нужно 60.', [w.id], null, { norm: true }));
    else add(T(key, room, 'ok', 'Унитаз по нормам: от оси до стены от 35' + NB + 'см, впереди от 60' + NB + 'см.', [w.id]));
  }
  function bathTips(add, fmt) {
    var baths = C.items.filter(function (it) { return is(it, 'bath'); }), showers = C.items.filter(function (it) { return is(it, 'shower'); });
    var lostWash = (C.notPlaced || []).some(function (n) { return IS.laundry.test(low(n.label)); });
    var wantBath = !!(C.brief && C.brief.bath === 'ванна');
    if (fmt === 2 && baths.length && !wantBath) {
      add(T('bath', hostOf(baths[0].box), 'tip', 'В евродвушке мы не ставим ванну, даже если она есть у застройщика: делаем душ со сливом в полу и стеклянной перегородкой.' +
        (lostWash ? ' Тогда в санузле поместится и стиральная машина с сушилкой.' : ''), [baths[0].id]));
    } else if (fmt === 2 && showers.length && !baths.length && !wantBath) {
      add(T('bath', hostOf(showers[0].box), 'ok', 'Душ вместо ванны — по правилу для евро-2.', [showers[0].id]));
    }
    C.items.filter(function (it) { return is(it, 'laundry'); }).forEach(function (w) {
      var room = hostOf(w.box); if (!room) return;
      var r = rt(room);
      if (ROOM.bath.test(r) || ROOM.hidden.test(r)) {
        /* в евро-4 и евро-5 стирку выносят из санузла (formats: «а не в санузле») — «как в проектах» там не скажешь */
        if (!(fmt >= 4 && ROOM.bath.test(r))) add(T('wash' + w.id, room, 'ok', 'Стирка колонной — не на виду, как в наших проектах.', [w.id]));
      }
      else if (ROOM.hall.test(r)) add(T('wash' + w.id, room, 'tip', 'Стирку в прихожей прячут за фасад шкафа — так в наших проектах.', [w.id], null, { prio: -1 }));
      else add(T('wash' + w.id, room, 'tip', 'Стирка на виду — в наших проектах её прячут: за дверь санузла, в шкаф или в постирочную.', [w.id]));
    });
    /* правило евро-4 (formats: «стиральная и сушильная машины в прихожей колонной, а не в санузле»); в евро-2 об этом уже говорит совет про ванну */
    if (lostWash && fmt >= 4) {
      var hall = mainRooms().filter(function (r) { return ROOM.hall.test(rt(r)); })[0];
      var hallWd = hall ? C.items.filter(function (it) { return is(it, 'wardrobe') && hostOf(it.box) === hall; })[0] : null;
      if (hall) add(T('wash-lost', hall, 'tip', 'Стирка не встала в санузел. В наших проектах в таких квартирах её ставят колонной ' + (hallWd ? 'в шкаф прихожей.' : 'в прихожей.'), []));
    }
    C.items.filter(function (it) { return is(it, 'wc'); }).forEach(function (w) { wcTip(w, add); });
  }

  /* ── чего не хватает по правилам — одним советом, а не тремя одинаковыми карточками на каждом плане ── */
  function missingTips(add) {
    var hall = mainRooms().filter(function (r) { return ROOM.hall.test(rt(r)); })[0];
    var hallWd = hall ? C.items.filter(function (it) { return is(it, 'wardrobe') && hostOf(it.box) === hall; })[0] : null;
    var need = [];
    /* formats, общие правила: «отдельное бытовое хранение для пылесоса и хозяйственных вещей, розетка под робот-пылесос»;
       layout.storage_zones: «обязательно в любом формате» */
    if (!C.items.some(function (it) { return is(it, 'utility'); }))
      need.push('шкаф для пылесоса, швабры и сушилки с розеткой для робота-пылесоса' + (hallWd ? ' (можно отсек шкафа в прихожей)' : ''));
    /* formats, общие правила: прихожая — «консоль или банкетка с пуфом, зеркало» */
    if (hall && !C.items.some(function (it) { return is(it, 'pouf') && hostOf(it.box) === hall; })) need.push('пуф или банкетка в прихожей');
    /* formats евро-2 и евро-3: в кухне-гостиной «журнальный стол» */
    C.items.filter(function (it) { return is(it, 'sofa'); }).some(function (s) {
      var room = hostOf(s.box);
      if (!room || C.items.some(function (it) { return is(it, 'coffee') && hostOf(it.box) === room; })) return false;
      need.push('журнальный столик у дивана');
      return true;
    });
    /* это список покупок, а не правка расстановки — «Показать на плане» ему не нужна */
    if (need.length) add(T('missing', null, 'tip', 'Ещё по нашим правилам нужны: ' + need.join(', ') + '.', [], null, { prio: -1 }));
  }

  /* ── высокая мебель у окна ────────────────────────────────────────────── */
  function clearWindow(it, s) {
    var b = it.box, alongY = s.side === 'w' || s.side === 'e';
    var opts = alongY ? [s.from - b[3], s.to - b[1]] : [s.from - b[2], s.to - b[0]];   /* кончиться до проёма или начаться после */
    opts.sort(function (a, c) { return Math.abs(a) - Math.abs(c); });
    for (var i = 0; i < opts.length; i++) {
      var d = opts[i], box = alongY ? [b[0], b[1] + d, b[2], b[3] + d] : [b[0] + d, b[1], b[2] + d, b[3]];
      var ch = [{ id: it.id, box: box }];
      if (valid(ch)) return { label: 'Отодвинуть от окна', done: '«' + it.label + '» отодвинут от окна', boxes: ch };
    }
    return null;
  }
  function windowTips(add, wins) {
    wins.forEach(function (s, i) {
      var R = s.box, t = .15 * P;
      C.items.forEach(function (it) {
        if (!is(it, 'tall') || hostOf(it.box) !== s.room) return;
        var b = it.box, near = s.side === 'w' ? b[0] - R[0] : s.side === 'e' ? R[2] - b[2] : s.side === 'n' ? b[1] - R[1] : R[3] - b[3];
        if (near > t) return;
        var cover = s.side === 'w' || s.side === 'e' ? Math.min(b[3], s.to) - Math.max(b[1], s.from) : Math.min(b[2], s.to) - Math.max(b[0], s.from);
        if (cover <= N.winCover * P) return;
        if (C.problems.some(function (p) { return p.id === it.id && p.rule === 'окно закрыто'; })) return;
        add(T('win' + i + '-' + it.id, s.room, 'tip', '«' + it.label + '» закрывает край окна на ' + len(m(cover)) + ' — в комнате меньше света.', [it.id], clearWindow(it, s)));
      });
    });
  }

  /* ── сверка с анкетой ─────────────────────────────────────────────────── */
  function briefTips(add) {
    if ((C.wants || []).indexOf('рабочее место') < 0 || C.items.some(function (it) { return is(it, 'desk'); })) return;
    var bedroom = mainRooms().filter(function (r) { return ROOM.bed.test(rt(r)); })[0] || mainRooms()[0];
    add(T('want-desk', bedroom, 'tip', 'В анкете — рабочее место, а на плане его нет. В наших проектах его ставят в спальне у окна: стол ' + dims(120, 60) + NB + 'см.', []));
  }

  /* порядок: сначала советы с готовой правкой, потом остальные, потом «чего не хватает»; варианты на выбор — после
     советов, «✓» — в конце */
  function rank(t) { return t.tone === 'ok' ? 9 : t.tone === 'opt' ? 5 : t.fix ? 0 : t.prio < 0 ? 2 : 1; }
  function check(ctx) {
    C = ctx; P = ctx.ppm || 1;
    var out = [], seen = {}, wins = [], fmt = 0;
    function add(t) { if (!t || seen[t.key]) return; seen[t.key] = 1; out.push(t); }
    try { wins = windowsOf(); fmt = format(); } catch (err) { if (window.console) console.warn('SOVE_TIPS', err); }
    [function () { bedTips(add); }, function () { deskTips(add, wins); }, function () { wardrobeTips(add); },
     function () { tvTips(add); }, function () { sofaTips(add, fmt); }, function () { tableTips(add); },
     function () { kitchenTips(add); }, function () { bathTips(add, fmt); }, function () { windowTips(add, wins); },
     function () { briefTips(add); }, function () { missingTips(add); }
    ].forEach(function (rule) {
      /* одно правило упало на странном плане — остальные советы всё равно показываем */
      try { rule(); } catch (err) { if (window.console) console.warn('SOVE_TIPS', err); }
    });
    /* «✓» про предмет с замечанием спорит с «Замечаниями» — не показываем (у кровати считаются и её тумбы) */
    var bad = {};
    (C.problems || []).forEach(function (p) { bad[p.id] = 1; if (p.id2 !== undefined) bad[p.id2] = 1; });
    out = out.filter(function (t) { return t.tone !== 'ok' || !t.ids.concat(t.also).some(function (id) { return bad[id]; }); });
    var order = {};
    mainRooms().forEach(function (r, i) { order[r.name] = i; });
    out.forEach(function (t, i) { t.n = i; });
    out.sort(function (a, b) {
      var ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
      var oa = a.room in order ? order[a.room] : 99, ob = b.room in order ? order[b.room] : 99;
      return oa !== ob ? oa - ob : a.n - b.n;
    });
    C = null;
    return out;
  }

  window.SOVE_TIPS = { check: check, rules: N };
})();
