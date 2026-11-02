/* Чертёж плана из объёмов (plan-volumes.js): стены с толщиной, проёмы дверей со створкой и дугой открывания,
   окна в наружной стене, подписи комнат и общие размеры. Одна геометрия для DXF (plan-dxf.js) и для картинки
   на экране (SVG). Комнаты в разметке — внутренние грани стен; зазоры между ними и есть стены, поэтому стены =
   (комнаты, расширенные на e) − комнаты: так закрываются перегородки до 2e и появляются наружные стены толщиной e.
   Поправки к разметке (проверено на PRIDE и 4 планах tools/fixtures, 27.10):
   • края комнат ближе SNAP — одна линия (иначе ступеньки и щели в 1–3 см);
   • комнаты касаются или налезают друг на друга (зрение не оставило зазора) — тонкая перегородка посередине;
   • окно — в полосе стены у грани своей комнаты (а не где придётся в рамке разметки);
   • проём двери — только в той стене, которая пересекает зону прохода целиком; дверь в комнату, которой нет
     на чертеже (битая разметка), не рисуем и стену не режем.
   SOVE_DRAW.build(vol) → { walls, rooms, doors, windows, box } в метрах (y вниз, как на картинке плана);
   SOVE_DRAW.build(vol, img) — стены, окна и двери не из рамок комнат, а с картинки плана (fromImage ниже);
   SOVE_DRAW.svg(vol, { width }) → строка SVG. */
(function () {
  var E_M = 0.3;             /* толщина наружной стены; зазоры разметки до 2·E — перегородки */
  var SNAP_M = 0.06;         /* края комнат ближе 6 см — одна линия */
  var PART_M = 0.12;         /* перегородка там, где комнаты касаются или налезают */
  var WIN_M = 0.45;          /* окно ищем у грани комнаты не дальше E + WIN_M */
  var COVER = 0.7;           /* стена должна перекрывать зону двери хотя бы на 70 % ширины */
  function rnd(v) { return Math.round(v * 1000) / 1000; }
  function norm(b) { return [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])]; }
  function grow(b, d) { return [b[0] - d, b[1] - d, b[2] + d, b[3] + d]; }
  function inside(b, x, y) { return x > b[0] && x < b[2] && y > b[1] && y < b[3]; }
  function uniq(a) { a.sort(function (x, y) { return x - y; }); return a.filter(function (v, i) { return !i || v - a[i - 1] > 1e-6; }); }
  /* близкие значения — к среднему своей группы */
  function snapper(vals, tol) {
    var s = vals.slice().sort(function (a, b) { return a - b; }), groups = [];
    s.forEach(function (v) { var g = groups[groups.length - 1]; if (g && v - g[g.length - 1] <= tol) g.push(v); else groups.push([v]); });
    var mean = groups.map(function (g) { return { lo: g[0], hi: g[g.length - 1], v: g.reduce(function (a, x) { return a + x; }, 0) / g.length }; });
    return function (v) { for (var i = 0; i < mean.length; i++) if (v >= mean[i].lo - 1e-9 && v <= mean[i].hi + 1e-9) return mean[i].v; return v; };
  }

  function build(V, img) {
    if (!V || !V.rooms || !V.rooms.length) return null;
    var k = V.ppm, e = E_M;
    function toM(b) { b = norm(b); return [b[0] / k, b[1] / k, b[2] / k, b[3] / k]; }
    /* id и type — только для стен с картинки (дверь знает комнату по id, створку ставит по типу); в G не попадают */
    var rooms = V.rooms.filter(function (r) { return r.area_drawn > 0.3; }).map(function (r) {
      return { name: r.name, kind: r.kind, m2: r.m2, rects: [r.box].concat(r.parts || []).map(toM), id: r.id || null, type: r.type || '' };
    });
    var ex = [], ey = [];
    rooms.forEach(function (r) { r.rects.forEach(function (b) { ex.push(b[0], b[2]); ey.push(b[1], b[3]); }); });
    var sx = snapper(ex, SNAP_M), sy = snapper(ey, SNAP_M);
    rooms.forEach(function (r) { r.rects = r.rects.map(function (b) { return [sx(b[0]), sy(b[1]), sx(b[2]), sy(b[3])]; }).filter(function (b) { return b[2] - b[0] > 0.05 && b[3] - b[1] > 0.05; }); });
    rooms = rooms.filter(function (r) { return r.rects.length; });
    if (!rooms.length) return null;
    var byName = {};
    rooms.forEach(function (r) { var b = r.rects[0]; byName[r.name] = r; r.c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; r.w = b[2] - b[0]; r.d = b[3] - b[1]; });
    var roomRects = [].concat.apply([], rooms.map(function (r) { return r.rects; }));
    var flatRects = roomRects.map(function (b) { return grow(b, e); });
    if (img && img.walls && img.walls.length) return fromImage(img, rooms, byName, roomRects, toM);   /* стены с картинки плана */

    /* перегородки там, где комнаты касаются или налезают: посередине общей полосы, поперёк меньшей стороны */
    var parts = [];
    for (var a = 0; a < rooms.length; a++) for (var c = a + 1; c < rooms.length; c++) {
      rooms[a].rects.forEach(function (p) {
        rooms[c].rects.forEach(function (q) {
          var ox0 = Math.max(p[0], q[0]), ox1 = Math.min(p[2], q[2]), oy0 = Math.max(p[1], q[1]), oy1 = Math.min(p[3], q[3]);
          var gx = ox1 - ox0, gy = oy1 - oy0;
          if (gx < -1e-6 || gy < -1e-6) return;                     /* есть зазор — его закроет стена из сетки */
          if (gx <= gy) { if (gy < 0.3) return; var x = (ox0 + ox1) / 2; parts.push([x - PART_M / 2, oy0, x + PART_M / 2, oy1]); }
          else { if (gx < 0.3) return; var y = (oy0 + oy1) / 2; parts.push([ox0, y - PART_M / 2, ox1, y + PART_M / 2]); }
        });
      });
    }

    /* окна: полоса стены у ближайшей грани комнаты, вдоль которой лежит окно */
    var wins = [];
    (V.windows || []).forEach(function (w) {
      if (!w.box) return;
      var r = toM(w.box), alongX = (r[2] - r[0]) >= (r[3] - r[1]);
      var line = alongX ? (r[1] + r[3]) / 2 : (r[0] + r[2]) / 2, s0 = alongX ? r[0] : r[1], s1 = alongX ? r[2] : r[3], best = null;
      roomRects.forEach(function (q) {
        var a0 = alongX ? q[0] : q[1], a1 = alongX ? q[2] : q[3], ov = Math.min(s1, a1) - Math.max(s0, a0);
        if (ov < Math.min(0.4, 0.3 * (s1 - s0))) return;
        [[alongX ? q[1] : q[0], -1], [alongX ? q[3] : q[2], 1]].forEach(function (f) {
          var dist = Math.abs(line - f[0]); if (dist > e + WIN_M) return;
          if (!best || dist < best.dist) best = { dist: dist, face: f[0], out: f[1], a0: Math.max(s0, a0), a1: Math.min(s1, a1) };
        });
      });
      if (!best || best.a1 - best.a0 < 0.3) return;
      var t0 = best.out < 0 ? best.face - e : best.face, t1 = best.out < 0 ? best.face : best.face + e;
      wins.push({ band: alongX ? [best.a0, t0, best.a1, t1] : [t0, best.a0, t1, best.a1], alongX: alongX });
    });

    /* двери: только между комнатами, которые есть на чертеже (входная — у своей комнаты) */
    var doorList = (V.doors || []).filter(function (d) {
      return d.box && (d.kind === 'entrance' ? byName[d.a] : (byName[d.a] && byName[d.b]));
    }).map(function (d) { return { d: d, z: toM(d.box) }; });

    /* сетка по всем краям; клетка: 0 — снаружи, 1 — комната, 2 — стена, 3 — проём двери, 4 — окно */
    var xs = [], ys = [];
    roomRects.concat(flatRects, parts).forEach(function (b) { xs.push(b[0], b[2]); ys.push(b[1], b[3]); });
    doorList.forEach(function (o) { [o.z, grow(o.z, e)].forEach(function (b) { xs.push(b[0], b[2]); ys.push(b[1], b[3]); }); });
    wins.forEach(function (w) { xs.push(w.band[0], w.band[2]); ys.push(w.band[1], w.band[3]); });
    xs = uniq(xs); ys = uniq(ys);
    var nx = xs.length - 1, ny = ys.length - 1, cls = [];
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      cls[j * nx + i] = parts.some(function (b) { return inside(b, cx, cy); }) ? 2
        : roomRects.some(function (b) { return inside(b, cx, cy); }) ? 1
        : flatRects.some(function (b) { return inside(b, cx, cy); }) ? 2 : 0;
    }
    function cmid(t, xy) { return (xy[t] + xy[t + 1]) / 2; }
    /* какая доля отрезка [lo, hi] в ряду (или колонке) t — стена */
    function cover(alongX, t, lo, hi) {
      var s = 0, n = alongX ? nx : ny, xy = alongX ? xs : ys;
      for (var q = 0; q < n; q++) {
        var m = cmid(q, xy); if (m <= lo || m >= hi) continue;
        if (cls[alongX ? t * nx + q : q * nx + t] === 2) s += xy[q + 1] - xy[q];
      }
      return s / Math.max(1e-6, hi - lo);
    }
    function mark(alongX, t0, t1, lo, hi, to) {
      var n = alongX ? nx : ny, xy = alongX ? xs : ys;
      for (var t = t0; t <= t1; t++) for (var q = 0; q < n; q++) {
        var m = cmid(q, xy); if (m <= lo || m >= hi) continue;
        var id = alongX ? t * nx + q : q * nx + t; if (cls[id] === 2) cls[id] = to;
      }
    }

    /* дверь: ось — по тому, как стена пересекает зону прохода; проём — полоса стены, перекрывающая зону почти
       целиком (перпендикулярная стена рядом с дверью не режется), на всю толщину стены */
    var doors = [];
    doorList.forEach(function (o) {
      var z = o.z, d = o.d, best = null;
      [true, false].forEach(function (alongX) {
        /* зона входной двери — только внутрь квартиры, поэтому ищем стену и чуть за зоной (на толщину стены) */
        var lo = alongX ? z[0] : z[1], hi = alongX ? z[2] : z[3], A = (alongX ? z[1] : z[0]) - e, B = (alongX ? z[3] : z[2]) + e;
        var xy = alongX ? ys : xs, n = alongX ? ny : nx, mid = (A + B) / 2;
        for (var t = 0; t < n; t++) {
          var m = cmid(t, xy); if (m <= A || m >= B) continue;
          if (cover(alongX, t, lo, hi) < COVER) continue;
          var dist = Math.abs(m - mid);
          if (!best || dist < best.dist - 1e-9) best = { alongX: alongX, t: t, dist: dist, lo: lo, hi: hi };
        }
      });
      if (!best) return;
      var ax = best.alongX, xy = ax ? ys : xs, n = ax ? ny : nx, t0 = best.t, t1 = best.t;
      while (t0 > 0 && cover(ax, t0 - 1, best.lo, best.hi) >= COVER && xy[t1 + 1] - xy[t0 - 1] <= 2 * e + 0.15) t0--;
      while (t1 < n - 1 && cover(ax, t1 + 1, best.lo, best.hi) >= COVER && xy[t1 + 2] - xy[t0] <= 2 * e + 0.15) t1++;
      mark(ax, t0, t1, best.lo, best.hi, 3);
      var s0 = best.lo, s1 = best.hi, w = s1 - s0, f0 = xy[t0], f1 = xy[t1 + 1];
      var opening = ax ? [s0, f0, s1, f1] : [f0, s0, f1, s1];
      var A2 = byName[d.a], B2 = byName[d.b], into = d.kind === 'entrance' ? A2 : (A2 && A2.kind === 'bath' && B2 ? B2 : (A2 || B2));
      var midT = (f0 + f1) / 2, toPlus = into ? (ax ? into.c[1] : into.c[0]) > midT : true;
      var face = toPlus ? f1 : f0, dir = toPlus ? 1 : -1;
      var hinge = ax ? [s0, face] : [face, s0], tip = ax ? [s0, face + dir * w] : [face + dir * w, s0], end = ax ? [s1, face] : [face, s1];
      doors.push({ kind: d.kind, width: w, opening: opening, hinge: hinge, tip: tip, end: end, r: w, alongX: ax });
    });

    /* окна: клетки стены в своей полосе */
    var windows = [];
    wins.forEach(function (wn) {
      var b = wn.band, cells = [];
      for (var j2 = 0; j2 < ny; j2++) for (var i2 = 0; i2 < nx; i2++) {
        var id = j2 * nx + i2; if (cls[id] !== 2) continue;
        if (inside(b, cmid(i2, xs), cmid(j2, ys))) { cls[id] = 4; cells.push([xs[i2], ys[j2], xs[i2 + 1], ys[j2 + 1]]); }
      }
      if (!cells.length) return;
      var o = cells.reduce(function (s, q) { return [Math.min(s[0], q[0]), Math.min(s[1], q[1]), Math.max(s[2], q[2]), Math.max(s[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
      windows.push({ rect: o, alongX: wn.alongX });
    });

    /* стены — ряды подряд идущих клеток стены; одинаковые отрезки соседних рядов склеиваем в один прямоугольник
       (иначе в CAD по стене видны швы) */
    var walls = [], open = {};
    for (var j3 = 0; j3 < ny; j3++) {
      var run = null, next = {};
      for (var i3 = 0; i3 <= nx; i3++) {
        var wall = i3 < nx && cls[j3 * nx + i3] === 2;
        if (wall && run === null) run = xs[i3];
        if (!wall && run !== null) {
          var key = run + ',' + xs[i3], prev = open[key];
          if (prev && Math.abs(prev[3] - ys[j3]) < 1e-9) { prev[3] = ys[j3 + 1]; next[key] = prev; }
          else { var nw = [run, ys[j3], xs[i3], ys[j3 + 1]]; walls.push(nw); next[key] = nw; }
          run = null;
        }
      }
      open = next;
    }
    labelRooms(rooms, doors);
    var box = flatRects.reduce(function (s, q) { return [Math.min(s[0], q[0]), Math.min(s[1], q[1]), Math.max(s[2], q[2]), Math.max(s[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
    return { walls: walls, rooms: rooms, doors: doors, windows: windows, box: box, wall: e };
  }

  /* подписи: точка в комнате, где блок подписи меньше всего задевает дуги дверей (и поближе к центру) */
  function labelRooms(rooms, doors) {
    var swings = doors.map(function (d) {
      var f = [d.tip[0] + d.end[0] - d.hinge[0], d.tip[1] + d.end[1] - d.hinge[1]], pts = [d.hinge, d.tip, d.end, f];
      return [Math.min.apply(null, pts.map(function (p) { return p[0]; })), Math.min.apply(null, pts.map(function (p) { return p[1]; })),
              Math.max.apply(null, pts.map(function (p) { return p[0]; })), Math.max.apply(null, pts.map(function (p) { return p[1]; }))];
    });
    function over(p, q) { return Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1])); }
    rooms.forEach(function (r) {
      var L = label(r), hh = L.hh, b = r.rects[0], tw = Math.max(String(r.name).length * 0.62, 4) * hh, up = 1.1 * hh, down = (L.dims ? 2.2 : 1.3) * hh, best = null;
      for (var gi = 0; gi <= 8; gi++) for (var gj = 0; gj <= 8; gj++) {
        var x = b[2] - b[0] > tw + 0.2 ? b[0] + 0.1 + tw / 2 + (b[2] - b[0] - tw - 0.2) * gi / 8 : r.c[0];
        var y = b[3] - b[1] > up + down + 0.2 ? b[1] + 0.1 + up + (b[3] - b[1] - up - down - 0.2) * gj / 8 : r.c[1];
        var lb = [x - tw / 2, y - up, x + tw / 2, y + down], ov = 0;
        swings.forEach(function (s) { ov += over(lb, s); });
        var score = ov * 50 + Math.abs(x - r.c[0]) + Math.abs(y - r.c[1]);
        if (!best || score < best.s - 1e-9) best = { s: score, x: x, y: y };
      }
      r.lab = [best.x, best.y]; r.hh = hh; r.dims = L.dims;
    });
  }

  /* ── стены с картинки плана (сервер 29.10; рамка demo-flow: walls_2d / doors_2d / windows_2d, в пикселях) ──
     Стены — прямоугольники с картинки (двери и окна в них уже вырезаны), окна — их места в стене, двери — створка в проёме:
     петля у начала проёма, полотно длиной с проём, дуга. Вход открывается внутрь квартиры (в комнату a); межкомнатная —
     в комнату с бо́льшим рангом (rank ниже), при равных — в комнату a. Сторону комнаты берём по её рамке относительно проёма:
     с какой стороны стены рамка ближе. Проём без двери (passage) — разрыв без створки.
     Комнату двери ищем по id (a_id / b_id): две спальни с одним названием — у каждой двери своя (разбор 30.10); название —
     только если id у комнат нет совсем. Комнаты (подписи, площади, размерные цепочки) — как без стен с картинки; габарит —
     стены, окна, двери и рамки комнат (балкон без стен не выпадает); толщина wall — для цепочек сервера: на сколько комнаты
     у верхней и левой стены отстоят от края чертежа, меньший отступ по каждой стороне (ниже). img: { walls: [пиксели], doors: [{ box, along,
     kind, a_id, b_id, a, b }], windows: [{ box, along }] }, a / b — названия комнат */
  /* ранг комнаты для межкомнатной створки — туда, где больше, дверь и открывается: спальня, детская, кабинет, гардеробная —
     внутрь (2); кухня, гостиная и прочее — 1; прихожая и коридор — 0 (в них не открываем); из санузла — наружу (−1, как у
     PRIDE 27.10); балкон и лоджия — внутрь квартиры (−2). По типу комнаты (разметка с правками «Проверь план»), тип не
     узнали — по названию */
  var RANKS = [[/балкон|лодж/, -2], [/сан|ванн|туал|с\/у|wc|душ/, -1], [/прих|коридор|холл|тамбур/, 0], [/спальн|детск|кабинет|гардероб/, 2], [/гост|кухн|студи|комнат|зал/, 1]];
  function rankOf(t) { t = String(t || '').toLowerCase(); for (var i = 0; i < RANKS.length; i++) if (RANKS[i][0].test(t)) return RANKS[i][1]; return null; }
  function rank(r) { var v = r ? rankOf(r.type) : null; if (v === null && r) v = rankOf(r.name); return v === null ? 1 : v; }
  function fromImage(img, rooms, byName, roomRects, toM) {
    function real(b) { return b[2] - b[0] > 0.005 && b[3] - b[1] > 0.005; }
    function alongX(o, b) { return o.along === 'x' ? true : o.along === 'y' ? false : b[2] - b[0] >= b[3] - b[1]; }
    function dist(q, p) { var dx = Math.max(q[0] - p[0], 0, p[0] - q[2]), dy = Math.max(q[1] - p[1], 0, p[1] - q[3]); return Math.sqrt(dx * dx + dy * dy); }
    var walls = img.walls.map(toM).filter(real);
    var windows = (img.windows || []).map(function (w) { var r = toM(w.box); return { rect: r, alongX: alongX(w, r) }; }).filter(function (w) { return real(w.rect); });
    var doors = [], all = { rects: roomRects }, byId = {}, hasIds = false;
    rooms.forEach(function (r) { if (r.id) { byId[r.id] = r; hasIds = true; } });
    /* комната двери: по id; id есть, а такой комнаты на чертеже нет (крошечная) — не угадываем по названию */
    function roomOf(id, name) { if (id && byId[id]) return byId[id]; if (id && hasIds) return null; return name ? byName[name] || null : null; }
    (img.doors || []).forEach(function (d) {
      if (d.kind === 'passage') return;
      var z = toM(d.box), ax = alongX(d, z); if (!real(z)) return;
      var s0 = ax ? z[0] : z[1], s1 = ax ? z[2] : z[3], f0 = ax ? z[1] : z[0], f1 = ax ? z[3] : z[2], w = s1 - s0, mid = (f0 + f1) / 2, c = (s0 + s1) / 2;
      if (w < 0.3) return;
      /* с какой стороны стены комната: +1 — дальше по оси толщины, −1 — ближе, 0 — не понять. Точки в 0,3 м по обе стороны
         стены: к какой рамка комнаты ближе; рамка накрыла обе (зашла за стену) — по центру ближайшей к проёму рамки */
      function side(r) {
        if (!r) return 0;
        var t = (f1 - f0) / 2 + 0.3, P = ax ? [c, mid + t] : [mid + t, c], M = ax ? [c, mid - t] : [mid - t, c], C = ax ? [c, mid] : [mid, c];
        var dp = Math.min.apply(null, r.rects.map(function (q) { return dist(q, P); })), dm = Math.min.apply(null, r.rects.map(function (q) { return dist(q, M); }));
        if (Math.abs(dp - dm) > 1e-9) return dp < dm ? 1 : -1;
        var q = r.rects.slice().sort(function (a, b) { return dist(a, C) - dist(b, C); })[0], qc = ax ? (q[1] + q[3]) / 2 : (q[0] + q[2]) / 2;
        return qc > mid + 1e-9 ? 1 : qc < mid - 1e-9 ? -1 : 0;
      }
      var A = roomOf(d.a_id, d.a), B = roomOf(d.b_id, d.b), s;
      if (d.kind === 'entrance') s = side(A);
      else if (A && B) { var to = rank(B) > rank(A) ? B : A; s = side(to) || -side(to === A ? B : A); }
      /* нашлась одна комната — то же правило: в спальню и кухню — внутрь, из санузла, прихожей и с балкона — наружу */
      else if (A || B) { var one = A || B; s = rank(one) >= 1 ? side(one) : -side(one); }
      if (!s) s = side(all) || 1;                              /* комнаты не нашлись — внутрь квартиры */
      var face = s > 0 ? f1 : f0, dir = s > 0 ? 1 : -1;
      var opening = ax ? [s0, f0, s1, f1] : [f0, s0, f1, s1];
      var hinge = ax ? [s0, face] : [face, s0], tip = ax ? [s0, face + dir * w] : [face + dir * w, s0], end = ax ? [s1, face] : [face, s1];
      doors.push({ kind: d.kind, width: w, opening: opening, hinge: hinge, tip: tip, end: end, r: w, alongX: ax });
    });
    labelRooms(rooms, doors);
    var box = walls.concat(windows.map(function (w) { return w.rect; }), doors.map(function (d) { return d.opening; }), roomRects)
      .reduce(function (s, q) { return [Math.min(s[0], q[0]), Math.min(s[1], q[1]), Math.max(s[2], q[2]), Math.max(s[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
    /* толщина — меньший отступ рамки комнаты от края, по каждой стороне (верх и лево) отдельно: комната дальше от края (за ней
       ниша, выступ, рамка зрения со сдвигом) толщину не раздувает (разбор 30.10). Ниши в счёт не идут — они уходят в стену.
       Число на обе цепочки одно — берём большее из двух минимумов: чистый минимум оставлял цепочку у более толстой стены без
       единой комнаты (PRIDE с сервера: верх 0,35, лево 0,47 — слева только общий размер, дважды) */
    var tops = [], lefts = [];
    rooms.forEach(function (r) {
      var q = r.rects[0], gt = q[1] - box[1], gl = q[0] - box[0];
      if (gt > 0.02 && gt < 1) tops.push(gt);
      if (gl > 0.02 && gl < 1) lefts.push(gl);
    });
    var mins = [tops, lefts].filter(function (a) { return a.length; }).map(function (a) { return Math.min.apply(null, a); });
    var e = mins.length ? Math.max(0.1, rnd(Math.max.apply(null, mins))) : E_M;
    return { walls: walls, rooms: rooms, doors: doors, windows: windows, box: box, wall: e };
  }

  function ru(v, n) { return (Math.round(v * Math.pow(10, n || 1)) / Math.pow(10, n || 1)).toString().replace('.', ','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* подписи комнаты: размер шрифта по меньшей стороне; размеры «Ш × Г» — только если комната не узкая */
  function label(r) { var hh = Math.max(0.16, Math.min(0.3, Math.min(r.w, r.d) / 7)); return { hh: hh, dims: Math.min(r.w, r.d) >= 1.6 }; }
  /* картинка плана: стены — тёмная заливка, комнаты — светлые, двери — створка с дугой, окна — тонкие линии стекла */
  function svg(V, o) {
    o = o || {}; var G = build(V); if (!G) return '';
    var pad = 0.9, b = G.box, W = b[2] - b[0] + pad * 2, H = b[3] - b[1] + pad * 2, x0 = b[0] - pad, y0 = b[1] - pad;
    var ink = o.ink || '#2B2826', room = o.room || '#FBFAF7', line = o.line || '#8E867E', font = o.font || 'Manrope, Arial, sans-serif';
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [rnd(x0), rnd(y0), rnd(W), rnd(H)].join(' ') + '"' + (o.width ? ' width="' + o.width + '"' : '') + ' font-family="' + font + '" role="img" aria-label="Чертёж плана">';
    s += '<rect x="' + rnd(x0) + '" y="' + rnd(y0) + '" width="' + rnd(W) + '" height="' + rnd(H) + '" fill="' + (o.bg || '#F4F2EE') + '"/>';
    G.rooms.forEach(function (r) { r.rects.forEach(function (q) { s += '<rect x="' + rnd(q[0]) + '" y="' + rnd(q[1]) + '" width="' + rnd(q[2] - q[0]) + '" height="' + rnd(q[3] - q[1]) + '" fill="' + room + '"/>'; }); });
    s += '<g fill="' + ink + '">' + G.walls.map(function (q) { return '<rect x="' + rnd(q[0]) + '" y="' + rnd(q[1]) + '" width="' + rnd(q[2] - q[0] + 0.002) + '" height="' + rnd(q[3] - q[1] + 0.002) + '"/>'; }).join('') + '</g>';
    G.windows.forEach(function (wn) {
      var q = wn.rect, t = wn.alongX ? q[3] - q[1] : q[2] - q[0];
      s += '<rect x="' + rnd(q[0]) + '" y="' + rnd(q[1]) + '" width="' + rnd(q[2] - q[0]) + '" height="' + rnd(q[3] - q[1]) + '" fill="#fff" stroke="' + ink + '" stroke-width="0.02"/>';
      [1 / 3, 2 / 3].forEach(function (f) {
        s += wn.alongX ? '<line x1="' + rnd(q[0]) + '" y1="' + rnd(q[1] + t * f) + '" x2="' + rnd(q[2]) + '" y2="' + rnd(q[1] + t * f) + '" stroke="' + line + '" stroke-width="0.015"/>'
                       : '<line x1="' + rnd(q[0] + t * f) + '" y1="' + rnd(q[1]) + '" x2="' + rnd(q[0] + t * f) + '" y2="' + rnd(q[3]) + '" stroke="' + line + '" stroke-width="0.015"/>';
      });
    });
    G.doors.forEach(function (d) {
      var h = d.hinge, t = d.tip, en = d.end, sweep = ((t[0] - h[0]) * (en[1] - h[1]) - (t[1] - h[1]) * (en[0] - h[0])) > 0 ? 1 : 0;
      s += '<line x1="' + rnd(h[0]) + '" y1="' + rnd(h[1]) + '" x2="' + rnd(t[0]) + '" y2="' + rnd(t[1]) + '" stroke="' + ink + '" stroke-width="0.03"/>' +
        '<path d="M' + rnd(t[0]) + ' ' + rnd(t[1]) + ' A' + rnd(d.r) + ' ' + rnd(d.r) + ' 0 0 ' + sweep + ' ' + rnd(en[0]) + ' ' + rnd(en[1]) + '" fill="none" stroke="' + line + '" stroke-width="0.015" stroke-dasharray="0.05 0.04"/>';
    });
    G.rooms.forEach(function (r) {
      var hh = r.hh, x = r.lab[0], y = r.lab[1];
      s += '<text x="' + rnd(x) + '" y="' + rnd(y - hh * 0.25) + '" text-anchor="middle" font-size="' + rnd(hh) + '" font-weight="600" fill="' + ink + '">' + esc(r.name) + '</text>' +
        '<text x="' + rnd(x) + '" y="' + rnd(y + hh * 1.05) + '" text-anchor="middle" font-size="' + rnd(hh * 0.85) + '" fill="' + ink + '">' + ru(r.m2) + ' м²</text>' +
        (r.dims ? '<text x="' + rnd(x) + '" y="' + rnd(y + hh * 2.05) + '" text-anchor="middle" font-size="' + rnd(hh * 0.62) + '" fill="' + line + '">' + ru(r.w, 2) + ' × ' + ru(r.d, 2) + ' м</text>' : '');
    });
    /* общие размеры квартиры: сверху и слева, с засечками */
    var dy = b[1] - 0.45, dx = b[0] - 0.45, tk = 0.08, fs = 0.2;
    s += '<g stroke="' + line + '" stroke-width="0.015">' +
      '<line x1="' + rnd(b[0]) + '" y1="' + rnd(dy) + '" x2="' + rnd(b[2]) + '" y2="' + rnd(dy) + '"/>' +
      '<line x1="' + rnd(b[0]) + '" y1="' + rnd(dy - tk) + '" x2="' + rnd(b[0]) + '" y2="' + rnd(dy + tk) + '"/><line x1="' + rnd(b[2]) + '" y1="' + rnd(dy - tk) + '" x2="' + rnd(b[2]) + '" y2="' + rnd(dy + tk) + '"/>' +
      '<line x1="' + rnd(dx) + '" y1="' + rnd(b[1]) + '" x2="' + rnd(dx) + '" y2="' + rnd(b[3]) + '"/>' +
      '<line x1="' + rnd(dx - tk) + '" y1="' + rnd(b[1]) + '" x2="' + rnd(dx + tk) + '" y2="' + rnd(b[1]) + '"/><line x1="' + rnd(dx - tk) + '" y1="' + rnd(b[3]) + '" x2="' + rnd(dx + tk) + '" y2="' + rnd(b[3]) + '"/></g>' +
      '<text x="' + rnd((b[0] + b[2]) / 2) + '" y="' + rnd(dy - 0.1) + '" text-anchor="middle" font-size="' + fs + '" fill="' + line + '">' + ru(b[2] - b[0], 2) + ' м</text>' +
      '<text transform="translate(' + rnd(dx - 0.1) + ' ' + rnd((b[1] + b[3]) / 2) + ') rotate(-90)" text-anchor="middle" font-size="' + fs + '" fill="' + line + '">' + ru(b[3] - b[1], 2) + ' м</text>';
    return s + '</svg>';
  }

  window.SOVE_DRAW = { build: build, svg: svg, label: label };
})();
