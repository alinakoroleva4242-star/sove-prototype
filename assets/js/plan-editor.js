/* Правка плана словами и пальцем — экран 1 сценария «план → расстановка → интерьер».

   «Сдвинь стену между спальней и гостиной на 30 см вниз» — стена переезжает, площади
   пересчитываются, двери едут вместе со стеной. Стену можно и потянуть пальцем.

   План здесь — данные, а не картинка: те же комнаты в пикселях плана, что дальше уходят
   в расстановку (/ai/layout/auto). Комната — набор прямоугольников: после переноса части
   стены она может стать Г-образной. В расстановку такая комната уходит главным
   прямоугольником и частями с part_of, как ниша прихожей.

   Наружные стены, окна и входная дверь не двигаются: это фасад и общий коридор.
   Слова разбирает код по шаблонам — без нейросети и без платных вызовов. */
(function () {
  'use strict';

  /* ── нормы, метры ──────────────────────────────────────────────────────── */
  var WALL_DRAW_M = 0.25;   /* толщина серой подложки вокруг комнат, как на экране расстановки */
  var MAXGAP_M = 0.7;       /* толще — это не стена между комнатами, а что-то между ними */
  var MIN_OV_M = 0.25;      /* короче — комнаты касаются углами, общей стены нет */
  var MIN_ROOM_M = 0.9;     /* уже — в комнату не войти */
  var MIN_STORE_M = 0.6;    /* гардеробная и кладовая */
  var SNAP_M = 0.12;        /* концы стен ближе этого считаем совпавшими */
  var DOOR_W_M = 0.8, PASSAGE_W_M = 1.2, DOOR_MARGIN_M = 0.1;
  var DRAG_STEP_M = 0.05, KEY_STEP_M = 0.05, KEY_BIG_M = 0.25, NUDGE_M = 0.1, MAX_MOVE_M = 4;
  var MINUS = '−';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function m2txt(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function deltaTxt(v) { return (v >= 0 ? '+' : MINUS) + m2txt(Math.abs(v)); }
  function lenTxt(m) {
    m = Math.abs(m);
    if (m < 0.995) return Math.max(1, Math.round(m * 100)) + ' см';
    var s = (Math.round(m * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',') + ' м';
  }
  function dimTxt(m) { return (Math.round(m * 100) / 100).toFixed(2).replace('.', ',') + ' м'; }

  /* ── прямоугольники [x1, y1, x2, y2] и наборы прямоугольников ─────────── */
  function rw(r) { return r[2] - r[0]; }
  function rh(r) { return r[3] - r[1]; }
  function rArea(r) { return Math.max(0, rw(r)) * Math.max(0, rh(r)); }
  function inter(a, b) {
    var x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
    return (x2 > x1 + 1e-6 && y2 > y1 + 1e-6) ? [x1, y1, x2, y2] : null;
  }
  /* a без b — до четырёх прямоугольников */
  function sub(a, b) {
    var i = inter(a, b); if (!i) return [a.slice()];
    var out = [];
    if (i[1] > a[1]) out.push([a[0], a[1], a[2], i[1]]);
    if (i[3] < a[3]) out.push([a[0], i[3], a[2], a[3]]);
    if (i[0] > a[0]) out.push([a[0], i[1], i[0], i[3]]);
    if (i[2] < a[2]) out.push([i[2], i[1], a[2], i[3]]);
    return out;
  }
  function regionSub(reg, b) { var out = []; reg.forEach(function (r) { out = out.concat(sub(r, b)); }); return out; }
  function regionAdd(reg, b) { return regionSub(reg, b).concat([b.slice()]); }
  function regionArea(reg) { return reg.reduce(function (s, r) { return s + rArea(r); }, 0); }
  function near(a, b) { return Math.abs(a - b) < 0.6; }
  /* склеиваем соседние куски одной комнаты, если у них общая сторона целиком: так
     прямоугольная комната после переноса стены остаётся одним прямоугольником */
  function normalize(reg) {
    var rs = reg.map(function (r) { return r.map(function (v) { return Math.round(v * 100) / 100; }); })
      .filter(function (r) { return rw(r) > 0.6 && rh(r) > 0.6; });
    var merged = true;
    while (merged) {
      merged = false;
      for (var i = 0; i < rs.length && !merged; i++) {
        for (var j = i + 1; j < rs.length && !merged; j++) {
          var a = rs[i], b = rs[j], u = null;
          if (near(a[1], b[1]) && near(a[3], b[3]) && (near(a[2], b[0]) || near(b[2], a[0])))
            u = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
          else if (near(a[0], b[0]) && near(a[2], b[2]) && (near(a[3], b[1]) || near(b[3], a[1])))
            u = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
          if (u) { rs.splice(j, 1); rs[i] = u; merged = true; }
        }
      }
    }
    return rs;
  }
  function uniqSorted(a) {
    a = a.slice().sort(function (p, q) { return p - q; });
    var out = [];
    a.forEach(function (v) { if (!out.length || Math.abs(out[out.length - 1] - v) > 0.3) out.push(v); });
    return out;
  }
  function covered(reg, c) {
    var s = 0;
    reg.forEach(function (r) { var i = inter(r, c); if (i) s += rArea(i); });
    return s >= rArea(c) * 0.998 - 1;
  }
  /* самый большой прямоугольник внутри комнаты: по нему подпись, размеры и «главный»
     прямоугольник для расстановки */
  function maxRect(reg) {
    if (!reg.length) return [0, 0, 0, 0];
    if (reg.length === 1) return reg[0].slice();
    var xs = [], ys = [];
    reg.forEach(function (r) { xs.push(r[0], r[2]); ys.push(r[1], r[3]); });
    xs = uniqSorted(xs); ys = uniqSorted(ys);
    var best = reg.reduce(function (p, q) { return rArea(q) > rArea(p) ? q : p; }).slice(), ba = rArea(best);
    for (var a = 0; a < xs.length; a++) for (var b = a + 1; b < xs.length; b++) {
      for (var c = 0; c < ys.length; c++) for (var d = c + 1; d < ys.length; d++) {
        var cand = [xs[a], ys[c], xs[b], ys[d]], ar = rArea(cand);
        if (ar > ba + 0.5 && covered(reg, cand)) { best = cand; ba = ar; }
      }
    }
    return best;
  }
  function cutSpans(spans, lo, hi) {
    var out = [];
    spans.forEach(function (s) {
      if (hi <= s[0] || lo >= s[1]) { out.push(s); return; }
      if (lo > s[0]) out.push([s[0], lo]);
      if (hi < s[1]) out.push([hi, s[1]]);
    });
    return out;
  }
  function mergeSpans(spans, gap) {
    var s = spans.slice().sort(function (p, q) { return p[0] - q[0]; }), out = [];
    s.forEach(function (x) {
      var last = out[out.length - 1];
      if (last && x[0] - last[1] <= gap) last[1] = Math.max(last[1], x[1]);
      else out.push([x[0], x[1]]);
    });
    return out;
  }
  /* вдоль стены: у вертикальной стены — по y, у горизонтальной — по x */
  function along(r, o) { return o === 'v' ? [r[1], r[3]] : [r[0], r[2]]; }
  function across(r, o) { return o === 'v' ? [r[0], r[2]] : [r[1], r[3]]; }
  function strip(o, c1, c2, a, b) { return o === 'v' ? [c1, a, c2, b] : [a, c1, b, c2]; }
  function sideCoord(r, side) { return side === 'west' ? r[0] : side === 'east' ? r[2] : side === 'north' ? r[1] : r[3]; }
  function sideAlong(r, side) { return (side === 'west' || side === 'east') ? [r[1], r[3]] : [r[0], r[2]]; }

  /* ── словарь комнат: падежи для ответов ────────────────────────────────── */
  var FORMS = {
    'спальня': ['спальни', 'спальней', 'спальню'],
    'гостиная': ['гостиной', 'гостиной', 'гостиную'],
    'кухня-гостиная': ['кухни-гостиной', 'кухней-гостиной', 'кухню-гостиную'],
    'кухня': ['кухни', 'кухней', 'кухню'],
    'санузел': ['санузла', 'санузлом', 'санузел'],
    'ванная': ['ванной', 'ванной', 'ванную'],
    'туалет': ['туалета', 'туалетом', 'туалет'],
    'прихожая': ['прихожей', 'прихожей', 'прихожую'],
    'коридор': ['коридора', 'коридором', 'коридор'],
    'холл': ['холла', 'холлом', 'холл'],
    'детская': ['детской', 'детской', 'детскую'],
    'кабинет': ['кабинета', 'кабинетом', 'кабинет'],
    'гардеробная': ['гардеробной', 'гардеробной', 'гардеробную'],
    'кладовая': ['кладовой', 'кладовой', 'кладовую'],
    'балкон': ['балкона', 'балконом', 'балкон'],
    'лоджия': ['лоджии', 'лоджией', 'лоджию'],
    'помещение': ['помещения', 'помещением', 'помещение']
  };
  /* gen — «стена спальни», ins — «между спальней и…», acc — «сделай спальню…», nom — «спальня» */
  function form(room, kase) {
    var name = String(room.name || '').trim(), low = name.toLowerCase();
    var m = low.match(/^(.*?)(\s+\d+)?$/), base = m[1], num = m[2] || '';
    if (kase === 'nom') return low;
    var f = FORMS[base];
    if (!f) return '«' + name + '»';
    return f[{ gen: 0, ins: 1, acc: 2 }[kase]] + num;
  }

  /* типы, которые понимает расстановка, и как их назвать */
  var LEX = [
    { re: /кухн[а-я]*[\s-]+гостин[а-я]*|гостин[а-я]*[\s-]+кухн[а-я]*|кухн[а-я]*-столов[а-я]*/g, types: ['гостиная-кухня'], nom: 'Кухня-гостиная', type: 'гостиная-кухня' },
    { re: /спальн[а-я]*/g, types: ['спальня'], nom: 'Спальня', type: 'спальня' },
    { re: /гостин[а-я]*|(?:^|\s)зал(?:а|е|ом|у)?(?=\s|$)/g, types: ['гостиная', 'гостиная-кухня'], nom: 'Гостиная', type: 'гостиная' },
    { re: /кухн[а-я]*/g, types: ['кухня', 'гостиная-кухня'], nom: 'Кухня', type: 'кухня' },
    { re: /санузл[а-я]*|санузел|ванн[а-я]*|туалет[а-я]*|с\/у|уборн[а-я]*/g, types: ['санузел'], nom: 'Санузел', type: 'санузел' },
    { re: /прихож[а-я]*|коридор[а-я]*|холл[а-я]*/g, types: ['прихожая'], nom: 'Прихожая', type: 'прихожая' },
    { re: /детск[а-я]*/g, types: ['детская'], nom: 'Детская', type: 'детская' },
    { re: /кабинет[а-я]*/g, types: ['кабинет'], nom: 'Кабинет', type: 'кабинет' },
    { re: /гардеробн[а-я]*/g, types: ['гардеробная'], nom: 'Гардеробная', type: 'гардеробная' },
    { re: /кладов[а-я]*/g, types: ['кладовая'], nom: 'Кладовая', type: 'кладовая' },
    { re: /балкон[а-я]*|лоджи[а-я]*/g, types: ['балкон'], nom: 'Балкон', type: 'балкон' }
  ];

  /* ── модель плана ──────────────────────────────────────────────────────── */
  function Model(frame) {
    if (!frame) return;                      /* пустая — для clone() */
    var self = this;
    this.ppm = +frame.px_per_m || 76.8;
    this.rooms = [];
    this.outside = (frame.outside || []).map(function (o) { return { box: o.box.slice() }; });
    this.frameWindows = (frame.windows || []).map(function (w) { return JSON.parse(JSON.stringify(w)); });
    var hosts = (frame.rooms || []).filter(function (r) { return !r.part_of && r.box; });
    hosts.forEach(function (r, i) {
      var doc = r.doc_m2 != null ? +r.doc_m2 : (r.m2 != null ? +r.m2 : null);
      self.rooms.push({ id: 'r' + i, name: r.name || 'Помещение', type: r.type || null,
        rects: [r.box.map(Number)], parts: [], doc: doc });
    });
    (frame.rooms || []).filter(function (r) { return r.part_of && r.box; }).forEach(function (p) {
      var host = self.rooms.filter(function (x) { return x.name === p.part_of; })[0];
      if (!host) return;
      host.rects.push(p.box.map(Number));
      host.parts.push({ box: p.box.map(Number), name: p.name, contains: p.contains || null,
        doc: p.doc_m2 != null ? +p.doc_m2 : (p.m2 != null ? +p.m2 : null) });
    });
    this.rooms.forEach(function (r) { r.area0 = regionArea(r.rects); if (r.doc == null || !(r.doc > 0)) r.doc = r.area0 / (self.ppm * self.ppm); });

    /* окна — на наружной стене своей комнаты; не двигаются никогда */
    this.windows = [];
    this.frameWindows.forEach(function (w, i) {
      var room = self.byType(w.room) || self.byName(w.room);
      if (!room || !w.box) return;
      var side = w.wall, b = w.box, best = null, bd = Infinity;
      room.rects.forEach(function (r) {
        var c = sideCoord(r, side), mid = (side === 'west' || side === 'east') ? (b[0] + b[2]) / 2 : (b[1] + b[3]) / 2;
        var al = sideAlong(r, side), wa = (side === 'west' || side === 'east') ? [b[1], b[3]] : [b[0], b[2]];
        if (Math.min(al[1], wa[1]) - Math.max(al[0], wa[0]) < 2) return;
        var dd = Math.abs(c - mid);
        if (dd < bd) { bd = dd; best = r; }
      });
      if (!best) return;
      var al2 = sideAlong(best, side), wa2 = (side === 'west' || side === 'east') ? [b[1], b[3]] : [b[0], b[2]];
      self.windows.push({ id: 'w' + i, room: room.id, side: side, at: sideCoord(best, side),
        from: Math.max(al2[0], wa2[0]), to: Math.min(al2[1], wa2[1]) });
    });

    /* двери: у межкомнатной в данных только зона вокруг проёма — находим стену между
       комнатами и место вдоль неё; входная стоит в наружной стене прихожей */
    this.doors = [];
    (frame.doors || []).forEach(function (d, i) {
      if (!d.box) return;
      var b = d.box, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      var A = self.byType(d.a) || self.byName(d.a), B = d.b ? (self.byType(d.b) || self.byName(d.b)) : null;
      if (!A) return;
      if (d.kind === 'entrance' || !B) {
        var best = null;
        A.rects.forEach(function (r) {
          [['west', Math.abs(cx - r[0])], ['east', Math.abs(cx - r[2])], ['north', Math.abs(cy - r[1])], ['south', Math.abs(cy - r[3])]]
            .forEach(function (p) { if (!best || p[1] < best.d) best = { d: p[1], side: p[0], rect: r }; });
        });
        if (!best) return;
        var vert = best.side === 'west' || best.side === 'east';
        self.doors.push({ id: 'd' + i, kind: 'entrance', a: A.id, b: null, side: best.side,
          at: sideCoord(best.rect, best.side), pos: vert ? cy : cx, width: vert ? rh(b) : rw(b), box: b.slice() });
        return;
      }
      var o = rh(b) > rw(b) ? 'h' : 'v';
      self.doors.push({ id: 'd' + i, kind: d.kind || 'door', a: A.id, b: B.id, o: o,
        pos: o === 'h' ? cx : cy, width: Math.min(rw(b), rh(b)), at: o === 'h' ? cy : cx });
    });
    var segs = this.segments();
    this.doors = this.doors.filter(function (d) { return d.kind === 'entrance' || self.anchorDoor(d, segs); });
    this.nextId = 100;
  }

  Model.prototype.clone = function () {
    var m = new Model(null);
    m.ppm = this.ppm;
    m.rooms = JSON.parse(JSON.stringify(this.rooms));
    m.doors = JSON.parse(JSON.stringify(this.doors));
    m.windows = this.windows;
    m.outside = this.outside;
    m.frameWindows = this.frameWindows;
    m.nextId = this.nextId;
    return m;
  };
  Model.prototype.room = function (id) { return this.rooms.filter(function (r) { return r.id === id; })[0] || null; };
  Model.prototype.byType = function (t) {
    if (!t) return null;
    t = String(t).toLowerCase();
    return this.rooms.filter(function (r) { return String(r.type || '').toLowerCase() === t; })[0] || null;
  };
  Model.prototype.byName = function (n) {
    if (!n) return null;
    n = String(n).toLowerCase();
    return this.rooms.filter(function (r) { return String(r.name || '').toLowerCase() === n; })[0] || null;
  };
  Model.prototype.area = function (r) {
    return r.doc + (regionArea(r.rects) - r.area0) / (this.ppm * this.ppm);
  };
  Model.prototype.host = function (r) { return maxRect(r.rects); };

  /* участки стен между комнатами: две грани разных комнат смотрят друг на друга через
     зазор не толще MAXGAP_M, и между ними нет третьей комнаты */
  Model.prototype.segments = function () {
    var ppm = this.ppm, maxGap = MAXGAP_M * ppm, minOv = MIN_OV_M * ppm, all = [], segs = [];
    this.rooms.forEach(function (room) {
      room.rects.forEach(function (r, k) { all.push({ room: room, r: r, id: room.id + '#' + k }); });
    });
    function blocked(i, j, o, lo, hi, c1, c2) {
      var spans = [[lo, hi]];
      if (c2 - c1 <= 0.5) return spans;
      all.forEach(function (c, ci) {
        if (ci === i || ci === j) return;
        var ac = across(c.r, o), al = along(c.r, o);
        if (ac[0] < c2 - 0.5 && ac[1] > c1 + 0.5) spans = cutSpans(spans, al[0], al[1]);
      });
      return spans;
    }
    for (var i = 0; i < all.length; i++) {
      for (var j = 0; j < all.length; j++) {
        if (i === j || all[i].room === all[j].room) continue;
        var a = all[i].r, b = all[j].r;
        [['v', a[2], b[0], Math.max(a[1], b[1]), Math.min(a[3], b[3])],
         ['h', a[3], b[1], Math.max(a[0], b[0]), Math.min(a[2], b[2])]].forEach(function (t) {
          var o = t[0], ea = t[1], eb = t[2], lo = t[3], hi = t[4], g = eb - ea;
          if (g < -0.6 || g > maxGap || hi - lo < minOv) return;
          blocked(i, j, o, lo, hi, ea, eb).forEach(function (s) {
            if (s[1] - s[0] < minOv) return;
            segs.push({ o: o, A: all[i].room.id, B: all[j].room.id, ra: all[i].id, rb: all[j].id,
              rectA: a, rectB: b, ea: ea, eb: Math.max(eb, ea), from: s[0], to: s[1] });
          });
        });
      }
    }
    segs.forEach(function (s, k) { s.k = k; });
    return segs;
  };
  /* стена как её видит глаз: участки, у которых общая грань одной комнаты, двигаются вместе
     (правая стена спальни, за которой и санузел, и прихожая, — одна стена) */
  Model.prototype.lines = function (segs) {
    segs = segs || this.segments();
    var parent = segs.map(function (s, i) { return i; });
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    for (var i = 0; i < segs.length; i++) for (var j = i + 1; j < segs.length; j++) {
      var s = segs[i], t = segs[j];
      if (s.o !== t.o) continue;
      if ((s.ra === t.ra && near(s.ea, t.ea)) || (s.rb === t.rb && near(s.eb, t.eb))) parent[find(i)] = find(j);
    }
    var groups = {};
    segs.forEach(function (s, i) { var r = find(i); (groups[r] = groups[r] || []).push(s); });
    return Object.keys(groups).map(function (k) {
      var g = groups[k], o = g[0].o;
      var sideA = uniq(g.map(function (s) { return s.A; })), sideB = uniq(g.map(function (s) { return s.B; }));
      var lo = Math.min.apply(null, g.map(function (s) { return s.from; })), hi = Math.max.apply(null, g.map(function (s) { return s.to; }));
      var c1 = Math.min.apply(null, g.map(function (s) { return s.ea; })), c2 = Math.max.apply(null, g.map(function (s) { return s.eb; }));
      return { o: o, segs: g, A: sideA, B: sideB, from: lo, to: hi, c1: c1, c2: c2, mid: (c1 + c2) / 2 };
    }).sort(function (p, q) { return (q.to - q.from) - (p.to - p.from); });
  };
  function uniq(a) { var out = []; a.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); return out; }

  /* дверь на своей стене: ищем участок между теми же комнатами, держим проём целиком в стене */
  Model.prototype.anchorDoor = function (d, segs) {
    var ppm = this.ppm, margin = DOOR_MARGIN_M * ppm;
    var cand = segs.filter(function (s) { return (s.A === d.a && s.B === d.b) || (s.A === d.b && s.B === d.a); });
    if (!cand.length) return false;
    var same = cand.filter(function (s) { return s.o === d.o; });
    if (same.length) cand = same;
    var best = null, bd = Infinity;
    cand.forEach(function (s) {
      if (s.to - s.from < d.width + 2) return;
      var dd = d.pos < s.from ? s.from - d.pos : d.pos > s.to ? d.pos - s.to : 0;
      if (dd < bd) { bd = dd; best = s; }
    });
    if (!best) return false;
    var lo = best.from + d.width / 2 + margin, hi = best.to - d.width / 2 - margin;
    if (hi < lo) { lo = hi = (best.from + best.to) / 2; }
    d.pos = Math.max(lo, Math.min(hi, d.pos));
    d.o = best.o;
    d.at = (best.ea + best.eb) / 2;
    d.ea = best.ea; d.eb = best.eb;
    return true;
  };
  /* грань комнаты на этой стороне по координате at покрывает отрезок [from, to] */
  Model.prototype.edgeHas = function (roomId, side, at, from, to) {
    var room = this.room(roomId); if (!room) return false;
    var spans = [];
    room.rects.forEach(function (r) { if (Math.abs(sideCoord(r, side) - at) < 1.5) spans.push(sideAlong(r, side)); });
    spans = mergeSpans(spans, 0.8);
    return spans.some(function (s) { return s[0] <= from + 1.5 && s[1] >= to - 1.5; });
  };

  /* перенос участков стены на d пикселей поперёк неё: d > 0 — вправо или вниз (растут
     комнаты слева или сверху), d < 0 — наоборот. Возвращает {ok, model} или {ok:false, why} */
  Model.prototype.moveSegs = function (segs, d) {
    var m = this.clone(), ppm = this.ppm, snap = SNAP_M * ppm, maxGap = MAXGAP_M * ppm, ad = Math.abs(d);
    if (!segs.length) return { ok: false, why: 'нет такой стены' };
    if (ad < 0.5) return { ok: true, model: m };
    var o = segs[0].o, growA = d > 0, gainsBy = {}, losses = {};
    segs.forEach(function (s) {
      var gRect = growA ? s.rectA : s.rectB, lRect = growA ? s.rectB : s.rectA;
      var gRoom = growA ? s.A : s.B, lRoom = growA ? s.B : s.A;
      var gEdge = growA ? s.ea : s.eb, lEdge = growA ? s.eb : s.ea;
      var gk = gRoom + '|' + gRect.join(',');
      if (!gainsBy[gk]) gainsBy[gk] = { room: gRoom, rect: gRect, edge: gEdge, spans: [] };
      gainsBy[gk].spans.push([s.from, s.to]);
      var key = lRoom + '|' + lRect.join(',');
      if (!losses[key]) losses[key] = { room: lRoom, rect: lRect, edge: lEdge, spans: [], gEdge: gEdge, gRoom: gRoom };
      losses[key].spans.push([s.from, s.to]);
    });
    /* грань растущей комнаты едет целиком: участки напротив разных соседей склеиваем
       через стык, иначе на месте поперечной стены останется зазубрина */
    var gains = [];
    Object.keys(gainsBy).forEach(function (k) {
      var G = gainsBy[k], gs = along(G.rect, o);
      mergeSpans(G.spans, maxGap).forEach(function (sp) {
        gains.push({ room: G.room, edge: G.edge,
          from: Math.abs(sp[0] - gs[0]) <= snap ? gs[0] : sp[0],
          to: Math.abs(sp[1] - gs[1]) <= snap ? gs[1] : sp[1] });
      });
    });
    /* комната, которая уменьшается, отдаёт полосу; на конце полосы стена, идущая поперёк,
       должна продолжиться — иначе останется узкий «палец» комнаты шириной в стену */
    function extend(L, end, dir) {
      var best = end;
      m.rooms.forEach(function (room) {
        if (room.id === L.room) return;
        room.rects.forEach(function (r) {
          var al = along(r, o), ac = across(r, o);
          var touches = growA ? (ac[0] <= L.gEdge + 0.5 && ac[1] >= L.gEdge - 1) : (ac[1] >= L.gEdge - 0.5 && ac[0] <= L.gEdge + 1);
          if (!touches) return;
          if (dir > 0 && al[0] > end - 0.5 && al[0] <= end + maxGap && al[0] > best) best = al[0];
          if (dir < 0 && al[1] < end + 0.5 && al[1] >= end - maxGap && (best === end || al[1] < best)) best = al[1];
        });
      });
      return best;
    }
    Object.keys(losses).forEach(function (k) {
      var L = losses[k], ls = along(L.rect, o);
      L.spans = mergeSpans(L.spans, maxGap).map(function (sp) {
        var a = Math.abs(sp[0] - ls[0]) <= snap ? ls[0] : extend(L, sp[0], -1);
        var b = Math.abs(sp[1] - ls[1]) <= snap ? ls[1] : extend(L, sp[1], 1);
        return [Math.max(ls[0], a), Math.min(ls[1], b)];
      });
    });
    Object.keys(losses).forEach(function (k) {
      var L = losses[k], room = m.room(L.room);
      L.spans.forEach(function (sp) {
        room.rects = regionSub(room.rects, strip(o, growA ? L.edge : L.edge - ad, growA ? L.edge + ad : L.edge, sp[0], sp[1]));
      });
      room.rects = normalize(room.rects);
    });
    gains.forEach(function (g) {
      var room = m.room(g.room);
      var pieces = [strip(o, growA ? g.edge : g.edge - ad, growA ? g.edge + ad : g.edge, g.from, g.to)];
      m.rooms.forEach(function (r) { if (r.id !== room.id) r.rects.forEach(function (rr) { pieces = regionSub(pieces, rr); }); });
      pieces.forEach(function (p) { room.rects = regionAdd(room.rects, p); });
      room.rects = normalize(room.rects);
    });
    return m.check(this);
  };

  /* после правки: никто ни с кем не пересёкся, комнаты не уже нормы, окна и входная
     дверь остались в своих стенах, межкомнатные двери помещаются */
  Model.prototype.check = function (prev) {
    var self = this, ppm = this.ppm, i, j;
    for (i = 0; i < this.rooms.length; i++) for (j = i + 1; j < this.rooms.length; j++) {
      var A = this.rooms[i], B = this.rooms[j];
      for (var a = 0; a < A.rects.length; a++) for (var b = 0; b < B.rects.length; b++) {
        var x = inter(A.rects[a], B.rects[b]);
        if (x && rArea(x) > 2) return { ok: false, why: 'стена упрётся в ' + form(B, 'acc'), code: 'overlap' };
      }
    }
    for (i = 0; i < this.rooms.length; i++) {
      var r = this.rooms[i], p = prev ? prev.room(r.id) : null;
      if (p && JSON.stringify(p.rects) === JSON.stringify(r.rects)) continue;
      if (!r.rects.length) return { ok: false, why: cap(form(r, 'nom')) + ' исчезнет', code: 'min', room: r.id };
      var h = maxRect(r.rects), lim = (r.type === 'гардеробная' || r.type === 'кладовая') ? MIN_STORE_M : MIN_ROOM_M;
      if (Math.min(rw(h), rh(h)) / ppm < lim - 1e-6)
        return { ok: false, why: form(r, 'nom') + ' станет уже ' + Math.round(lim * 100) + ' см', code: 'min', room: r.id };
    }
    for (i = 0; i < this.windows.length; i++) {
      var w = this.windows[i];
      if (!this.edgeHas(w.room, w.side, w.at, w.from, w.to))
        return { ok: false, why: 'стена упрётся в окно ' + form(this.room(w.room) || { name: '' }, 'gen'), code: 'window' };
    }
    var segs = this.segments();
    for (i = 0; i < this.doors.length; i++) {
      var d = this.doors[i];
      if (d.kind === 'entrance') {
        if (!this.edgeHas(d.a, d.side, d.at, d.pos - d.width / 2, d.pos + d.width / 2))
          return { ok: false, why: 'входная дверь окажется в стене', code: 'entrance' };
      } else if (!this.anchorDoor(d, segs)) {
        return { ok: false, why: 'дверь между ' + form(this.room(d.a), 'ins') + ' и ' + form(this.room(d.b), 'ins') + ' не поместится', code: 'door' };
      }
    }
    return { ok: true, model: this };
  };

  /* насколько далеко можно сдвинуть в эту сторону: ищем шагами по сантиметру */
  Model.prototype.maxMove = function (segs, d) {
    var ppm = this.ppm, sign = d > 0 ? 1 : -1, lo = 0, hi = Math.abs(d), step = 0.01 * ppm, last = null;
    var r = this.moveSegs(segs, d); if (r.ok) return { px: d, res: r };
    var why = r.why;
    while (hi - lo > step) {
      var mid = (lo + hi) / 2, t = this.moveSegs(segs, sign * mid);
      if (t.ok) { lo = mid; last = t; } else { hi = mid; why = t.why; }
    }
    lo = Math.floor(lo / step) * step;
    if (lo < step) return { px: 0, why: why };
    var fin = this.moveSegs(segs, sign * lo);
    return { px: fin.ok ? sign * lo : 0, why: why, res: fin.ok ? fin : last };
  };

  /* снести стену: две комнаты и стена между ними становятся одной комнатой */
  Model.prototype.merge = function (idA, idB) {
    var m = this.clone(), A = m.room(idA), B = m.room(idB);
    var segs = this.segments().filter(function (s) { return (s.A === idA && s.B === idB) || (s.A === idB && s.B === idA); });
    if (!segs.length) return { ok: false, why: 'у них нет общей стены' };
    var big = this.area(this.room(idA)) >= this.area(this.room(idB)) ? A : B, small = big === A ? B : A;
    var reg = A.rects.concat([]);
    B.rects.forEach(function (r) { reg = regionAdd(reg, r); });
    segs.forEach(function (s) { reg = regionAdd(reg, strip(s.o, s.ea, s.eb, s.from, s.to)); });
    var types = [A.type, B.type].join('+') + '+' + [A.name, B.name].join('+').toLowerCase();
    var kitchenLiving = /кухн/.test(types) && /гостин/.test(types);
    var docSum = this.area(this.room(idA)) + this.area(this.room(idB));
    big.rects = normalize(reg);
    big.parts = big.parts.concat(small.parts);
    if (kitchenLiving) { big.name = 'Кухня-гостиная'; big.type = 'гостиная-кухня'; }
    else big.name = big.name + ' и ' + String(small.name).toLowerCase();
    big.area0 = regionArea(big.rects);
    big.doc = docSum + regionArea(segs.map(function (s) { return strip(s.o, s.ea, s.eb, s.from, s.to); })) / (this.ppm * this.ppm);
    m.rooms = m.rooms.filter(function (r) { return r.id !== small.id; });
    m.doors = m.doors.filter(function (d) { return !((d.a === idA && d.b === idB) || (d.a === idB && d.b === idA)); });
    m.doors.forEach(function (d) { if (d.a === small.id) d.a = big.id; if (d.b === small.id) d.b = big.id; });
    m.windows = m.windows.map(function (w) { return w.room === small.id ? Object.assign({}, w, { room: big.id }) : w; });
    var res = m.check(null);
    if (res.ok) res.merged = { into: big.id, gone: small.id };
    return res;
  };

  /* куда можно пройти от входа: если дверь убрали и в комнату не попасть — скажем */
  Model.prototype.unreachable = function () {
    var ent = this.doors.filter(function (d) { return d.kind === 'entrance'; })[0];
    if (!ent) return [];
    var seen = {}, q = [ent.a], self = this;
    seen[ent.a] = 1;
    while (q.length) {
      var cur = q.shift();
      this.doors.forEach(function (d) {
        if (d.kind === 'entrance') return;
        var nx = d.a === cur ? d.b : d.b === cur ? d.a : null;
        if (nx && !seen[nx]) { seen[nx] = 1; q.push(nx); }
      });
    }
    return this.rooms.filter(function (r) { return !seen[r.id] && r.type !== 'балкон'; }).map(function (r) { return r.id; });
  };

  /* в формат рамки для /ai/layout/auto: главный прямоугольник комнаты + части с part_of */
  Model.prototype.toFrame = function () {
    var self = this, ppm = this.ppm, rooms = [], used = {};
    function uniqName(n) { var k = n, i = 2; while (used[k]) k = n + ' ' + (i++); used[k] = 1; return k; }
    var names = {};
    this.rooms.forEach(function (r) { names[r.id] = uniqName(r.name); });
    this.rooms.forEach(function (r) {
      /* полоски тоньше 8 см — шум стыков, а не часть комнаты: в расстановку не отдаём */
      var host = maxRect(r.rects), rest = normalize(regionSub(r.rects, host))
        .filter(function (p) { return Math.min(rw(p), rh(p)) >= 0.08 * ppm; });
      rooms.push({ name: names[r.id], type: r.type, box: host.map(function (v) { return Math.round(v * 10) / 10; }),
        doc_m2: Math.round(self.area(r) * 10) / 10 });
      rest.forEach(function (p, k) {
        var orig = r.parts.filter(function (q) { return Math.abs(q.box[0] - p[0]) < 1.5 && Math.abs(q.box[1] - p[1]) < 1.5 && Math.abs(q.box[2] - p[2]) < 1.5 && Math.abs(q.box[3] - p[3]) < 1.5; })[0];
        var item = { name: orig ? orig.name : names[r.id] + ' · часть ' + (k + 1), type: r.type, part_of: names[r.id],
          box: p.map(function (v) { return Math.round(v * 10) / 10; }),
          doc_m2: orig && orig.doc != null ? orig.doc : Math.round(rArea(p) / (ppm * ppm) * 10) / 10 };
        if (orig && orig.contains) item.contains = orig.contains;
        rooms.push(item);
      });
    });
    function typeOf(id) { var r = self.room(id); return r ? (r.type || names[r.id]) : null; }
    var clear = 0.9 * ppm;
    var doors = this.doors.map(function (d) {
      if (d.kind === 'entrance') return { kind: 'entrance', a: typeOf(d.a), b: null, box: d.box.slice() };
      var half = d.width / 2, box = d.o === 'h'
        ? [d.pos - half, d.at - clear, d.pos + half, d.at + clear]
        : [d.at - clear, d.pos - half, d.at + clear, d.pos + half];
      return { kind: d.kind, a: typeOf(d.a), b: typeOf(d.b), box: box.map(Math.round) };
    });
    var windows = [];
    this.windows.forEach(function (w) {
      var src = self.frameWindows[+w.id.slice(1)];
      if (src) windows.push(Object.assign({}, src, { room: typeOf(w.room) }));
    });
    return { px_per_m: ppm, rooms: rooms, windows: windows, doors: doors, outside: this.outside.map(function (o) { return { box: o.box.slice() }; }) };
  };

  /* ── слова → команда ───────────────────────────────────────────────────── */
  var WORDNUM = { 'один': 1, 'одну': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6,
    'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10, 'пятнадцать': 15, 'двадцать': 20, 'тридцать': 30, 'сорок': 40,
    'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90, 'сто': 100 };
  function norm(t) {
    return String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„]/g, ' ')
      .replace(/кв\.?\s*м\.?|квадратн[а-я]*\s+метр[а-я]*|квадрат[а-я]*/g, ' м2 ')
      .replace(/м\^?2|м²/g, ' м2 ')
      .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
      .replace(/(\d)([а-я])/g, '$1 $2')
      .replace(/[!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function amountOf(t) {
    var m;
    if (/полметра|пол метра/.test(t)) return { m: 0.5 };
    if (/полтора метр/.test(t)) return { m: 1.5 };
    m = t.match(/(\d+(?:\.\d+)?)\s*(мм|миллиметр[а-я]*|см|сантиметр[а-я]*|сант[а-я]*|м2|метр[а-я]*|м)(?![а-я0-9])/);
    if (m) {
      var v = parseFloat(m[1]), u = m[2];
      if (u === 'м2') return { m2: v };
      if (/^мм|^миллим/.test(u)) return { m: v / 1000 };
      if (/^см|^сант/.test(u)) return { m: v / 100 };
      return { m: v };
    }
    m = t.match(/(?:^|\s)((?:двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|один|одну|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пятнадцать)(?:\s+(?:один|одну|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять))?)\s+(см|сантиметр[а-я]*|метр[а-я]*|м2)/);
    if (m) {
      var val = m[1].split(/\s+/).reduce(function (s, w) { return s + (WORDNUM[w] || 0); }, 0);
      if (m[2] === 'м2') return { m2: val };
      return /^с/.test(m[2]) ? { m: val / 100 } : { m: val };
    }
    if (/(?:^|\s)(?:на\s+)?(?:один\s+)?метр(?=\s|$)/.test(t)) return { m: 1 };
    m = t.match(/(?:^|\s)(?:на|еще|ещё)\s+(\d+(?:\.\d+)?)(?![\d.])/);
    if (m) { var n = parseFloat(m[1]); return n <= 4 ? { m: n, guessed: true } : { m: n / 100, guessed: true }; }
    return null;
  }
  var DIRS = [
    { re: /(?:^|\s)(?:влево|налево|левее)(?=\s|$)|на запад(?=\s|$)/, o: 'v', sign: -1, word: 'влево' },
    { re: /(?:^|\s)(?:вправо|направо|правее)(?=\s|$)|на восток(?=\s|$)/, o: 'v', sign: 1, word: 'вправо' },
    { re: /(?:^|\s)(?:вверх|наверх|выше)(?=\s|$)|на север(?=\s|$)/, o: 'h', sign: -1, word: 'вверх' },
    { re: /(?:^|\s)(?:вниз|ниже)(?=\s|$)|на юг(?=\s|$)/, o: 'h', sign: 1, word: 'вниз' }
  ];
  var SIDES = [
    { re: /(?:лев[а-я]*|западн[а-я]*)\s+(?:стен|перегородк)|(?:стен[а-я]*|перегородк[а-я]*)\s+слева/, side: 'west' },
    { re: /(?:прав[а-я]*|восточн[а-я]*)\s+(?:стен|перегородк)|(?:стен[а-я]*|перегородк[а-я]*)\s+справа/, side: 'east' },
    { re: /(?:верхн[а-я]*|северн[а-я]*)\s+(?:стен|перегородк)|(?:стен[а-я]*|перегородк[а-я]*)\s+сверху/, side: 'north' },
    { re: /(?:нижн[а-я]*|южн[а-я]*)\s+(?:стен|перегородк)|(?:стен[а-я]*|перегородк[а-я]*)\s+снизу/, side: 'south' }
  ];

  /* упоминания комнат по порядку: [{at, ids:[...], len}] */
  function mentions(t, model) {
    var masked = t, found = [];
    LEX.forEach(function (lx) {
      lx.re.lastIndex = 0;
      var m;
      while ((m = lx.re.exec(masked))) {
        var word = m[0].replace(/^\s+/, ''), at = m.index + (m[0].length - word.length);
        var ids = model.rooms.filter(function (r) {
          var tp = String(r.type || '').toLowerCase(), nm = String(r.name || '').toLowerCase();
          lx.re.lastIndex = 0;
          var hit = lx.types.indexOf(tp) >= 0 || new RegExp(lx.re.source).test(nm);
          return hit;
        }).map(function (r) { return r.id; });
        found.push({ at: at, len: word.length, ids: ids, word: word, lex: lx });
        masked = masked.slice(0, at) + new Array(word.length + 1).join(' ') + masked.slice(at + word.length);
        lx.re.lastIndex = at + word.length;
      }
    });
    /* свои названия («Мастерская») — по началу слова */
    model.rooms.forEach(function (r) {
      var nm = String(r.name || '').toLowerCase().replace(/ё/g, 'е').split(/\s+/)[0];
      if (nm.length < 4) return;
      var covered = LEX.some(function (lx) { return new RegExp(lx.re.source).test(nm); });
      if (covered) return;
      var stem = nm.slice(0, Math.max(4, nm.length - 2)), at = masked.indexOf(stem);
      if (at >= 0) {
        var end = at; while (end < masked.length && /[а-я-]/.test(masked[end])) end++;
        found.push({ at: at, len: end - at, ids: [r.id], word: masked.slice(at, end) });
        masked = masked.slice(0, at) + new Array(end - at + 1).join(' ') + masked.slice(end);
      }
    });
    found.sort(function (a, b) { return a.at - b.at; });
    /* какая из одинаковых: «большая спальня», «спальня 2» */
    found.forEach(function (f) {
      if (f.ids.length < 2) return;
      var before = t.slice(Math.max(0, f.at - 16), f.at), after = t.slice(f.at + f.len, f.at + f.len + 4);
      var rs = f.ids.map(function (id) { return model.room(id); });
      var num = after.match(/^\s*(\d)/);
      if (num) {
        var byNum = rs.filter(function (r) { return new RegExp('\\s' + num[1] + '$').test(r.name); });
        if (byNum.length === 1) { f.ids = [byNum[0].id]; return; }
      }
      if (/больш|просторн/.test(before)) { rs.sort(function (a, b) { return model.area(b) - model.area(a); }); f.ids = [rs[0].id]; }
      else if (/маленьк|меньш/.test(before)) { rs.sort(function (a, b) { return model.area(a) - model.area(b); }); f.ids = [rs[0].id]; }
      else if (/перв/.test(before)) f.ids = [rs[0].id];
      else if (/втор/.test(before)) f.ids = [rs[1].id];
    });
    return found.filter(function (f) { return f.ids.length; });
  }

  function parse(text, model, ctx) {
    var t = norm(text), cmd = { text: text, t: t };
    ctx = ctx || {};
    if (!t) return { intent: 'empty' };
    var ms = mentions(t, model);
    cmd.ms = ms;
    cmd.rooms = ms.map(function (x) { return x.ids; });
    cmd.amount = amountOf(t);
    cmd.dir = null;
    DIRS.forEach(function (d) { if (!cmd.dir && d.re.test(t)) cmd.dir = d; });
    cmd.side = null;
    SIDES.forEach(function (s) { if (!cmd.side && s.re.test(t)) cmd.side = s.side; });
    cmd.toward = null;
    ms.forEach(function (x) {
      var before = t.slice(Math.max(0, x.at - 14), x.at);
      if (/(?:в сторону|в направлении|ближе к|за счет|отняв у|отнимая у|(?:^|\s)ко?)\s*$/.test(before)) cmd.toward = x;
    });
    cmd.grow = /(больше|шире|длиннее|просторнее|увелич|расшир|прибав|(?:^|\s)добав)/.test(t) ? true
      : /(меньше|(?:^|\s)уже(?=\s|$)|короче|уменьш|сузь|сократ|убав)/.test(t) ? false : null;
    cmd.axis = /(шире|(?:^|\s)уже(?=\s|$)|ширин)/.test(t) ? 'short' : /(длиннее|короче|длин)/.test(t) ? 'long' : null;
    cmd.only = /(?:^|\s)только(?=\s|$)/.test(t);
    cmd.more = /(?:^|\s)(?:еще|ещё)(?=\s|$)/.test(t);
    var wall = /стен|перегородк/.test(t), door = /двер|проем|(?:^|\s)арк[ауи]?(?=\s|$)/.test(t);

    if (/^(?:отмени|отменить|откати|верни назад|назад|undo)(?=\s|$)|(?:^|\s)отмени(?:ть)?(?=\s|$)/.test(t)) return set('undo');
    if (/(сбрось|сбросить|верни как было|как было|исходн|начать заново|с начала|заново)/.test(t)) return set('reset');
    if (/^(?:помощь|помоги|что ты умеешь|что умеешь|как|примеры|help)(?=\s|$)/.test(t)) return set('help');
    if (/(какая|какой|сколько|чему равна|узнать).*(площад|метр|размер)|^площадь/.test(t) && !/сдвин|подвин|сделай/.test(t)) return set('ask');
    if (/(?:^|\s)окн[а-я]*/.test(t) && !door && !wall) return set('window');
    if (door) {
      if (/(убер|убра|удал|заложи|закрой|закрыть|не нужн)/.test(t)) return set('door_remove');
      if (/(сдвин|подвин|передвин|перенес|перемест)/.test(t)) return set('door_move');
      if (/(добав|постав|сделай|сделать|прорежь|прорез|прорубить|пробить|пробей|нужн|вставь|откр)/.test(t)) {
        cmd.kind = /проем|(?:^|\s)арк/.test(t) ? 'passage' : 'door';
        return set('door_add');
      }
    }
    if ((wall && /(снес|снести|убер|убра|удал|демонтир|сломай|сломать)/.test(t)) || /(объедин|совмест|соедин)/.test(t)) return set('merge');
    var ren = t.match(/(?:переименуй|переименовать|назови|назвать)\s+(.+)/);
    if (ren || /пусть\s.+\sбудет\s/.test(t) || /сделай из\s/.test(t) || /\s(?:это|—|-)\s(?=[а-я])/.test(t) && ms.length && !wall && !cmd.amount) {
      var after = '';
      if (/пусть\s.+\sбудет\s/.test(t)) after = t.replace(/^.*?\sбудет\s/, '');
      else if (ms.length) {
        var f = ms[0], rest = t.slice(f.at + f.len).replace(/^\s*(?:в|на|как|это|—|-)\s+/, '');
        after = rest;
      }
      cmd.newName = nameFrom(after.trim(), text);
      if (cmd.newName) return set('rename');
    }
    if (wall || /(сдвин|подвин|передвин|перенес|отодвин|перемест|двига)/.test(t)) {
      if (wall || cmd.dir || cmd.toward) return set('move');
    }
    if (cmd.grow !== null && ms.length) return set('resize');
    if (cmd.more && cmd.amount) return set('repeat');
    if (ctx.pending && (cmd.amount || cmd.dir || cmd.toward || ms.length)) return set('fill');
    if (ctx.selected && (cmd.amount || cmd.dir)) return set('move');
    return set('help');

    function set(i) { cmd.intent = i; return cmd; }
  }
  /* новое имя: «в кухню-гостиную» → «Кухня-гостиная»; своё имя — как написали */
  function nameFrom(s, raw) {
    s = String(s || '').replace(/[.,]+$/, '').trim();
    if (!s) return null;
    var first = s.split(/\s+/)[0];
    var lx = LEX.filter(function (l) { return new RegExp('^(?:' + l.re.source + ')').test(first) || new RegExp('^(?:' + l.re.source + ')$').test(s); })[0];
    if (lx) {
      var compound = LEX[0];
      if (new RegExp(compound.re.source).test(s)) return { name: compound.nom, type: compound.type };
      var tail = s.split(/\s+/).slice(1).join(' ');
      return { name: lx.nom + (tail ? ' ' + tail : ''), type: lx.type };
    }
    /* своё имя берём из исходного текста, чтобы сохранить регистр */
    var low = String(raw || '').toLowerCase(), at = low.lastIndexOf(s.split(/\s+/)[0]);
    var orig = at >= 0 ? String(raw).slice(at, at + s.length) : s;
    orig = orig.replace(/[.,!?]+$/, '').trim().slice(0, 30);
    return orig ? { name: cap(orig), type: null } : null;
  }

  /* ── редактор на странице ──────────────────────────────────────────────── */
  function create(root, frame, opts) {
    opts = opts || {};
    var base = new Model(frame);
    var saved = opts.state || null;
    var st = {
      model: saved && saved.model ? restore(saved.model, base) : base.clone(),
      undo: saved && saved.undo ? saved.undo.map(function (u) { return { model: restore(u.model, base), label: u.label }; }) : [],
      log: (saved && saved.log) || [], pending: null,
      sel: null, selRoom: null, hl: null, preview: null, drag: null, view: 'scheme', scale: 1,
      changed: { geom: false, names: false }, showAll: false
    };
    var ppm = base.ppm;
    var VB = viewBoxOf(base);

    function restore(saved, b) {
      var m = b.clone();
      m.rooms = JSON.parse(JSON.stringify(saved.rooms));
      m.doors = JSON.parse(JSON.stringify(saved.doors));
      m.nextId = saved.nextId || 100;
      return m;
    }
    function viewBoxOf(m) {
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      m.rooms.forEach(function (r) { r.rects.forEach(function (b) { x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); }); });
      var pad = 0.6 * m.ppm;
      return [x1 - pad, y1 - pad, (x2 - x1) + pad * 2, (y2 - y1) + pad * 2];
    }

    root.classList.add('pe');
    /* на телефоне одна колонка; на широком экране слева чертёж, справа команды и комнаты */
    root.innerHTML =
      '<div class="pe-col pe-col--plan">' +
        (opts.original ? '<div class="pe-view" role="tablist" aria-label="Что показать">' +
          '<button type="button" role="tab" class="pe-view__b is-on" data-view="scheme" aria-selected="true">Схема</button>' +
          '<button type="button" role="tab" class="pe-view__b" data-view="file" aria-selected="false">' + esc(opts.original.label || 'Ваш план') + '</button></div>' : '') +
        '<div class="pe-stage"><svg class="pe-plan" role="group" aria-label="План квартиры: стены можно двигать"></svg>' +
          (opts.original ? '<img class="pe-file" alt="' + esc(opts.original.alt || 'Исходный план') + '" src="' + esc(opts.original.src) + '" hidden>' : '') +
          '<p class="pe-legend" hidden></p></div>' +
        '<div class="pe-panel" hidden></div>' +
      '</div>' +
      '<div class="pe-col pe-col--side">' +
        '<form class="pe-cmd" autocomplete="off"><label class="pe-sr" for="pe-in-' + uid() + '">Что поменять в плане</label>' +
          '<input class="input pe-cmd__in" type="text" enterkeyhint="send" placeholder="Что поменять в плане?">' +
          '<button class="pe-cmd__go" type="submit" aria-label="Выполнить">' + icon('send') + '</button></form>' +
        '<div class="pe-sugg"></div>' +
        '<div class="pe-log" aria-live="polite"></div>' +
        '<section class="pb pe-rooms"></section>' +
      '</div>';
    var svg = root.querySelector('.pe-plan'), panel = root.querySelector('.pe-panel'), form_ = root.querySelector('.pe-cmd');
    var input = root.querySelector('.pe-cmd__in'), sugg = root.querySelector('.pe-sugg'), logEl = root.querySelector('.pe-log');
    var roomsEl = root.querySelector('.pe-rooms'), legend = root.querySelector('.pe-legend'), fileImg = root.querySelector('.pe-file');
    var lbl = root.querySelector('.pe-sr'); if (lbl) input.id = lbl.getAttribute('for');

    /* ── чертёж ── */
    function cur() { return st.preview || st.model; }
    function draw() {
      var m = cur(), segs = m.segments(), lines = m.lines(segs), k = 1 / st.scale;
      var wall = WALL_DRAW_M * ppm, out = [];
      svg.setAttribute('viewBox', VB.join(' '));
      /* подложка стен: из неё «вырезаются» комнаты */
      m.rooms.forEach(function (r) { r.rects.forEach(function (b) { out.push(rect('pe-slab', [b[0] - wall, b[1] - wall, b[2] + wall, b[3] + wall], 3)); }); });
      segs.forEach(function (s) { out.push(rect('pe-slab', strip(s.o, s.ea - 1, s.eb + 1, s.from, s.to))); });
      /* угол «вне квартиры» не закрашиваем: плита и так идёт только вокруг комнат,
         а белая заплатка срезала бы наружную стену рядом с ним */
      /* комнаты */
      m.rooms.forEach(function (r) {
        var cls = 'pe-room' + (st.selRoom === r.id ? ' is-sel' : '') + (st.hl && st.hl.rooms && st.hl.rooms[r.id] ? ' is-hl' : '');
        var h = maxRect(r.rects);
        out.push('<g class="' + cls + '" data-room="' + r.id + '" tabindex="0" role="button" aria-label="' +
          esc(r.name + ', ' + m2txt(m.area(r)) + ' квадратных метра, ' + dimTxt(rw(h) / ppm) + ' на ' + dimTxt(rh(h) / ppm)) + '">' +
          r.rects.map(function (b) { return rect('', b); }).join('') + '</g>');
      });
      /* окна */
      m.windows.forEach(function (w) {
        var bx = w.side === 'west' ? [w.at - wall, w.from, w.at, w.to] : w.side === 'east' ? [w.at, w.from, w.at + wall, w.to]
          : w.side === 'north' ? [w.from, w.at - wall, w.to, w.at] : [w.from, w.at, w.to, w.at + wall];
        out.push(rect('pe-win', bx));
      });
      /* двери: проём в стене, створка и дуга открывания; места створок помним для подписей */
      var swings = [];
      m.doors.forEach(function (d) { out.push(doorSvg(m, d, swings)); });
      st.swings = swings;
      /* было: пунктир там, где стена стояла до последней правки */
      if (st.hl && st.hl.ghost) st.hl.ghost.forEach(function (g) { out.push(rect('pe-ghost', g)); });
      /* стены, которые можно двигать */
      lines.forEach(function (ln, i) {
        var on = st.sel && sameLine(st.sel, ln), moved = st.hl && st.hl.line && sameLine(st.hl.line, ln);
        var hitT = Math.max(ln.c2 - ln.c1, 30 * k), hm = ln.mid;
        var hit = strip(ln.o, hm - hitT / 2, hm + hitT / 2, ln.from, ln.to);
        var names = sideNames(m, ln);
        out.push('<g class="pe-line' + (on ? ' is-sel' : '') + (moved ? ' is-moved' : '') + '" data-line="' + i + '" tabindex="0" role="slider" aria-orientation="' +
          (ln.o === 'v' ? 'horizontal' : 'vertical') + '" aria-label="' + esc('Стена: ' + names.a + ' | ' + names.b) + '" aria-valuetext="' +
          esc(names.a + ' и ' + names.b) + '">' +
          ln.segs.map(function (s) { return rect('pe-line__v', strip(s.o, s.ea, s.eb, s.from, s.to)); }).join('') +
          rect('pe-line__hit', hit) + '</g>');
      });
      /* размеры у комнат, которые только что поменялись, и у выбранной */
      var dims = [];
      if (st.hl && st.hl.rooms) Object.keys(st.hl.rooms).forEach(function (id) { var r = m.room(id); if (r) dims.push([r, st.hl.axis]); });
      if (st.selRoom && m.room(st.selRoom)) { dims.push([m.room(st.selRoom), 'x']); dims.push([m.room(st.selRoom), 'y']); }
      dims.forEach(function (p) { out.push(dimSvg(m, p[0], p[1], k)); });
      /* подписи комнат */
      m.rooms.forEach(function (r) { out.push(labelSvg(m, r, k)); });
      /* ручка выбранной стены */
      if (st.sel) {
        var ln2 = lines.filter(function (l) { return sameLine(st.sel, l); })[0];
        if (ln2) out.push(handleSvg(ln2, k));
      }
      svg.innerHTML = out.join('');
      legend.hidden = !(st.hl && st.hl.ghost && st.hl.ghost.length);
      legend.textContent = 'Пунктир — где стена стояла до правки';
      st.lines = lines;
    }
    function rect(cls, b, rx) {
      return '<rect' + (cls ? ' class="' + cls + '"' : '') + ' x="' + r1(b[0]) + '" y="' + r1(b[1]) + '" width="' + r1(Math.max(0, b[2] - b[0])) +
        '" height="' + r1(Math.max(0, b[3] - b[1])) + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>';
    }
    function r1(v) { return Math.round(v * 10) / 10; }
    function doorSvg(m, d, swings) {
      var o = [], w = d.width;
      if (d.kind === 'entrance') {
        var t = WALL_DRAW_M * ppm, s = d.side, inward = (s === 'west' || s === 'north') ? 1 : -1;
        var vert = s === 'west' || s === 'east';
        if (swings) swings.push(vert ? [Math.min(d.at, d.at + inward * w), d.pos - w / 2, Math.max(d.at, d.at + inward * w), d.pos + w / 2]
          : [d.pos - w / 2, Math.min(d.at, d.at + inward * w), d.pos + w / 2, Math.max(d.at, d.at + inward * w)]);
        var gap = vert ? [Math.min(d.at, d.at - inward * t), d.pos - w / 2, Math.max(d.at, d.at - inward * t), d.pos + w / 2]
          : [d.pos - w / 2, Math.min(d.at, d.at - inward * t), d.pos + w / 2, Math.max(d.at, d.at - inward * t)];
        o.push(rect('pe-gap', gap));
        if (vert) {
          o.push('<line class="pe-leaf is-entrance" x1="' + r1(d.at) + '" y1="' + r1(d.pos - w / 2) + '" x2="' + r1(d.at + inward * w) + '" y2="' + r1(d.pos - w / 2) + '"/>');
          o.push('<path class="pe-arc" d="M ' + r1(d.at + inward * w) + ' ' + r1(d.pos - w / 2) + ' A ' + r1(w) + ' ' + r1(w) + ' 0 0 ' + (inward > 0 ? 1 : 0) + ' ' + r1(d.at) + ' ' + r1(d.pos + w / 2) + '"/>');
        } else {
          o.push('<line class="pe-leaf is-entrance" x1="' + r1(d.pos - w / 2) + '" y1="' + r1(d.at) + '" x2="' + r1(d.pos - w / 2) + '" y2="' + r1(d.at + inward * w) + '"/>');
          o.push('<path class="pe-arc" d="M ' + r1(d.pos - w / 2) + ' ' + r1(d.at + inward * w) + ' A ' + r1(w) + ' ' + r1(w) + ' 0 0 ' + (inward > 0 ? 0 : 1) + ' ' + r1(d.pos + w / 2) + ' ' + r1(d.at) + '"/>');
        }
        return o.join('');
      }
      var ea = d.ea != null ? d.ea : d.at - 4, eb = d.eb != null ? d.eb : d.at + 4;
      o.push(rect('pe-gap', strip(d.o, ea - 1, eb + 1, d.pos - w / 2, d.pos + w / 2)));
      if (d.kind === 'passage') return o.join('');
      /* створка открывается в комнату побольше; из санузла — наружу */
      var A = m.room(d.a), B = m.room(d.b), toB;
      var segA = d.o === 'v' ? null : null; void segA;
      var aIsLow = isLowSide(m, d, A);
      var intoA = (A && /санузел|ванн|туалет/.test((A.type || '') + (A.name || '').toLowerCase())) ? false
        : (B && /санузел|ванн|туалет/.test((B.type || '') + (B.name || '').toLowerCase())) ? true
        : (A && B ? m.area(A) >= m.area(B) : false);
      toB = !intoA;
      /* сторона, куда открывается: «низ» — меньшие координаты */
      var lowSide = toB ? !aIsLow : aIsLow;
      var edge = lowSide ? ea : eb, dir = lowSide ? -1 : 1;
      if (swings) swings.push(d.o === 'h' ? [d.pos - w / 2, Math.min(edge, edge + dir * w), d.pos + w / 2, Math.max(edge, edge + dir * w)]
        : [Math.min(edge, edge + dir * w), d.pos - w / 2, Math.max(edge, edge + dir * w), d.pos + w / 2]);
      if (d.o === 'h') {
        o.push('<line class="pe-leaf" x1="' + r1(d.pos - w / 2) + '" y1="' + r1(edge) + '" x2="' + r1(d.pos - w / 2) + '" y2="' + r1(edge + dir * w) + '"/>');
        o.push('<path class="pe-arc" d="M ' + r1(d.pos - w / 2) + ' ' + r1(edge + dir * w) + ' A ' + r1(w) + ' ' + r1(w) + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + r1(d.pos + w / 2) + ' ' + r1(edge) + '"/>');
      } else {
        o.push('<line class="pe-leaf" x1="' + r1(edge) + '" y1="' + r1(d.pos - w / 2) + '" x2="' + r1(edge + dir * w) + '" y2="' + r1(d.pos - w / 2) + '"/>');
        o.push('<path class="pe-arc" d="M ' + r1(edge + dir * w) + ' ' + r1(d.pos - w / 2) + ' A ' + r1(w) + ' ' + r1(w) + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + r1(edge) + ' ' + r1(d.pos + w / 2) + '"/>');
      }
      return o.join('');
    }
    /* комната A у этой двери — по меньшим координатам (слева или сверху)? */
    function isLowSide(m, d, A) {
      if (!A) return true;
      var c = 0;
      A.rects.forEach(function (r) { var ac = across(r, d.o); if (ac[1] <= d.at + 1) c++; });
      return c > 0;
    }
    function labelSvg(m, r, k) {
      var h = maxRect(r.rects), cx = (h[0] + h[2]) / 2, cy = (h[1] + h[3]) / 2;
      var fs = 11 * k, fs2 = 12 * k, name = String(r.name || '').toUpperCase();
      var dl = st.hl && st.hl.delta ? st.hl.delta[r.id] : null;
      var areaStr = m2txt(m.area(r)) + ' м²';
      /* подпись не кладём на створку двери: пробуем центр и сдвиги, берём где меньше задевает */
      var tw = Math.max(name.length * fs * 0.68, areaStr.length * fs2 * 0.6), th = fs + fs2 * 2;
      var best = null;
      [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22], [0.22, 0.22], [-0.22, 0.22]].forEach(function (o) {
        var x = cx + o[0] * rw(h), y = cy + o[1] * rh(h);
        var box = [x - tw / 2, y - fs, x + tw / 2, y + th - fs];
        if (box[0] < h[0] || box[2] > h[2] || box[1] < h[1] || box[3] > h[3]) return;
        var hit = (st.swings || []).reduce(function (a, s) { var i = inter(box, s); return a + (i ? rArea(i) : 0); }, 0);
        if (!best || hit < best.hit - 1) best = { x: x, y: y, hit: hit };
      });
      if (best) { cx = best.x; cy = best.y; }
      var maxW = rw(h) * 0.92, nameW = name.length * fs * 0.68;
      if (nameW > maxW) { fs = Math.max(8 * k, fs * maxW / nameW); }
      /* в низкой комнате три строки не помещаются: имя и площадь в одну строку */
      if (rh(h) < 58 * k) {
        var line = name + '  ' + areaStr + (dl && Math.abs(dl) >= 0.05 ? '  ' + deltaTxt(dl) : '');
        var fs1 = Math.min(11 * k, rw(h) * 0.92 / (line.length * 0.62));
        return '<g class="pe-label" aria-hidden="true"><text class="pe-label__n" x="' + r1(cx) + '" y="' + r1(cy + fs1 * 0.35) + '" style="font-size:' + r1(fs1) + 'px">' +
          esc(name) + '<tspan class="pe-label__a" dx="' + r1(fs1 * 0.6) + '">' + esc(areaStr) + '</tspan>' +
          (dl && Math.abs(dl) >= 0.05 ? '<tspan class="pe-label__d ' + (dl > 0 ? 'is-up' : 'is-down') + '" dx="' + r1(fs1 * 0.5) + '">' + esc(deltaTxt(dl)) + '</tspan>' : '') + '</text></g>';
      }
      var s = '<g class="pe-label" aria-hidden="true">' +
        '<text class="pe-label__n" x="' + r1(cx) + '" y="' + r1(cy - 2 * k) + '" style="font-size:' + r1(fs) + 'px">' + esc(name) + '</text>' +
        '<text class="pe-label__a" x="' + r1(cx) + '" y="' + r1(cy + fs2 + 1 * k) + '" style="font-size:' + r1(fs2) + 'px">' + esc(areaStr) + '</text>';
      if (dl && Math.abs(dl) >= 0.05) {
        s += '<text class="pe-label__d ' + (dl > 0 ? 'is-up' : 'is-down') + '" x="' + r1(cx) + '" y="' + r1(cy + fs2 * 2 + 3 * k) + '" style="font-size:' + r1(11 * k) + 'px">' + esc(deltaTxt(dl)) + '</text>';
      }
      return s + '</g>';
    }
    function dimSvg(m, r, axis, k) {
      var h = maxRect(r.rects), lenPx = axis === 'x' ? rw(h) : rh(h);
      if (lenPx < 20 * k) return '';
      var off = 12 * k, tick = 5 * k, fs = 10 * k, txt = dimTxt(lenPx / ppm);
      if (axis === 'x') {
        var y = h[1] + off, x1 = h[0] + 3 * k, x2 = h[2] - 3 * k;
        return '<g class="pe-dim" aria-hidden="true"><line x1="' + r1(x1) + '" y1="' + r1(y) + '" x2="' + r1(x2) + '" y2="' + r1(y) + '"/>' +
          '<line x1="' + r1(x1) + '" y1="' + r1(y - tick) + '" x2="' + r1(x1) + '" y2="' + r1(y + tick) + '"/>' +
          '<line x1="' + r1(x2) + '" y1="' + r1(y - tick) + '" x2="' + r1(x2) + '" y2="' + r1(y + tick) + '"/>' +
          '<text x="' + r1((x1 + x2) / 2) + '" y="' + r1(y + fs + 2 * k) + '" style="font-size:' + r1(fs) + 'px">' + txt + '</text></g>';
      }
      var x = h[0] + off, y1 = h[1] + 3 * k, y2 = h[3] - 3 * k, my = (y1 + y2) / 2;
      return '<g class="pe-dim" aria-hidden="true"><line x1="' + r1(x) + '" y1="' + r1(y1) + '" x2="' + r1(x) + '" y2="' + r1(y2) + '"/>' +
        '<line x1="' + r1(x - tick) + '" y1="' + r1(y1) + '" x2="' + r1(x + tick) + '" y2="' + r1(y1) + '"/>' +
        '<line x1="' + r1(x - tick) + '" y1="' + r1(y2) + '" x2="' + r1(x + tick) + '" y2="' + r1(y2) + '"/>' +
        '<text x="' + r1(x + 4 * k) + '" y="' + r1(my) + '" style="font-size:' + r1(fs) + 'px;text-anchor:start" transform="rotate(-90 ' + r1(x + 4 * k) + ' ' + r1(my) + ')" dx="' + r1(-txt.length * fs * 0.28) + '" dy="' + r1(fs) + '">' + txt + '</text></g>';
    }
    function handleSvg(ln, k) {
      var cx = ln.o === 'v' ? ln.mid : (ln.from + ln.to) / 2, cy = ln.o === 'v' ? (ln.from + ln.to) / 2 : ln.mid;
      var R = 15 * k, a = 7 * k, s = 4 * k;
      var p = ln.o === 'v'
        ? 'M ' + r1(cx - a) + ' ' + r1(cy) + ' l ' + r1(s) + ' ' + r1(-s) + ' M ' + r1(cx - a) + ' ' + r1(cy) + ' l ' + r1(s) + ' ' + r1(s) +
          ' M ' + r1(cx + a) + ' ' + r1(cy) + ' l ' + r1(-s) + ' ' + r1(-s) + ' M ' + r1(cx + a) + ' ' + r1(cy) + ' l ' + r1(-s) + ' ' + r1(s) +
          ' M ' + r1(cx - a) + ' ' + r1(cy) + ' L ' + r1(cx + a) + ' ' + r1(cy)
        : 'M ' + r1(cx) + ' ' + r1(cy - a) + ' l ' + r1(-s) + ' ' + r1(s) + ' M ' + r1(cx) + ' ' + r1(cy - a) + ' l ' + r1(s) + ' ' + r1(s) +
          ' M ' + r1(cx) + ' ' + r1(cy + a) + ' l ' + r1(-s) + ' ' + r1(-s) + ' M ' + r1(cx) + ' ' + r1(cy + a) + ' l ' + r1(s) + ' ' + r1(-s) +
          ' M ' + r1(cx) + ' ' + r1(cy - a) + ' L ' + r1(cx) + ' ' + r1(cy + a);
      return '<g class="pe-handle" aria-hidden="true"><circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(R) + '"/><path d="' + p + '" style="stroke-width:' + r1(1.8 * k) + 'px"/></g>';
    }
    function sameLine(a, b) {
      if (!a || !b || a.o !== b.o) return false;
      var pa = a.segs.map(function (s) { return s.A + '>' + s.B; }), pb = b.segs.map(function (s) { return s.A + '>' + s.B; });
      return pa.some(function (x) { return pb.indexOf(x) >= 0; }) && Math.abs(a.mid - b.mid) < MAX_MOVE_M * ppm;
    }
    function sideNames(m, ln) {
      function nm(ids) { return ids.map(function (id) { var r = m.room(id); return r ? form(r, 'nom') : ''; }).join(', '); }
      return { a: nm(ln.A), b: nm(ln.B) };
    }

    /* ── правки ── */
    function areas(m) { var o = {}; m.rooms.forEach(function (r) { o[r.id] = m.area(r); }); return o; }
    function diff(before, after) {
      var a0 = areas(before), a1 = areas(after), rows = [], delta = {};
      Object.keys(a1).forEach(function (id) {
        var was = a0[id] != null ? a0[id] : null, now = a1[id];
        if (was == null || Math.abs(now - was) >= 0.005) {
          var r = after.room(id);
          rows.push({ name: r.name, was: was, now: now });
          if (was != null) delta[id] = now - was;
        }
      });
      Object.keys(a0).forEach(function (id) { if (a1[id] == null) { var r = before.room(id); rows.push({ name: r.name, was: a0[id], now: null }); } });
      return { rows: rows, delta: delta };
    }
    function commit(next, entry, hl) {
      st.undo.push({ model: st.model, label: entry.undoLabel || entry.text });
      st.model = next;
      st.preview = null;
      st.changed.geom = st.changed.geom || !!entry.geom;
      st.changed.names = st.changed.names || !!entry.names;
      st.hl = hl || null;
      st.pending = null;
      say(entry);
      paint();
    }
    function moveLine(ln, dPx, how) {
      var m = st.model, segs = ln.segs;
      if (how && how.only) segs = segs.filter(function (s) { return (s.A === how.only[0] && s.B === how.only[1]) || (s.A === how.only[1] && s.B === how.only[0]); });
      var res = m.moveSegs(segs, dPx);
      if (!res.ok) return { ok: false, why: res.why, max: m.maxMove(segs, dPx) };
      return { ok: true, model: res.model, segs: segs };
    }
    function moveText(ln, dPx, m) {
      var dir = ln.o === 'v' ? (dPx > 0 ? 'вправо' : 'влево') : (dPx > 0 ? 'вниз' : 'вверх');
      return lenTxt(dPx / ppm) + ' ' + dir;
    }
    function lineTitle(m, ln, only) {
      if (only) return 'между ' + form(m.room(only[0]), 'ins') + ' и ' + form(m.room(only[1]), 'ins');
      if (ln.A.length === 1 && ln.B.length === 1) return 'между ' + form(m.room(ln.A[0]), 'ins') + ' и ' + form(m.room(ln.B[0]), 'ins');
      var a = ln.A.map(function (id) { return form(m.room(id), 'ins'); }), b = ln.B.map(function (id) { return form(m.room(id), 'ins'); });
      return 'между ' + a.join(' и ') + ' и ' + b.join(' и ');
    }
    function ghostOf(segs) { return segs.map(function (s) { return strip(s.o, s.ea, s.eb, s.from, s.to); }); }
    function hlFor(before, after, ln, segs) {
      var df = diff(before, after), rooms = {};
      Object.keys(df.delta).forEach(function (id) { rooms[id] = 1; });
      var newLine = after.lines().filter(function (l) { return sameLine(ln, l); })[0] || null;
      return { rooms: rooms, delta: df.delta, ghost: ghostOf(segs), line: newLine, axis: ln.o === 'v' ? 'x' : 'y', rows: df.rows };
    }
    function doMove(ln, dPx, userText, how) {
      var m = st.model, r = moveLine(ln, dPx, how);
      if (!r.ok) {
        var mx = r.max, opts2 = [];
        if (mx && Math.abs(mx.px) >= 0.01 * ppm) {
          var maxTxt = lenTxt(mx.px / ppm);
          opts2.push({ label: 'Сдвинуть на ' + maxTxt, run: function () { doMove(ln, mx.px, null, how); } });
          return say({ who: 'app', text: 'Так не получится: ' + r.why + '. Можно сдвинуть максимум на ' + maxTxt + '.', options: opts2, err: true });
        }
        return say({ who: 'app', text: 'Эту стену в ту сторону не сдвинуть: ' + r.why + '.', err: true });
      }
      var h = hlFor(m, r.model, ln, r.segs), notes = [];
      r.model.rooms.forEach(function (x) {
        var p = m.room(x.id);
        if (p && p.rects.length === 1 && x.rects.length > 1) notes.push('У ' + form(x, 'gen') + ' теперь Г-образная форма: часть стены осталась на месте.');
      });
      r.model.doors.forEach(function (d) {
        var p = m.doors.filter(function (q) { return q.id === d.id; })[0];
        if (p && d.kind !== 'entrance' && Math.abs(p.pos - d.pos) > 1) notes.push('Дверь между ' + form(r.model.room(d.a), 'ins') + ' и ' + form(r.model.room(d.b), 'ins') + ' подвинулась на ' + lenTxt((d.pos - p.pos) / ppm) + ', чтобы остаться в стене.');
      });
      var dirTxt = moveText(ln, dPx, m), text;
      if (how && how.resize) {
        var dX = h.delta[how.resize] || 0;
        text = cap(form(r.model.room(how.resize), 'nom')) + (dX >= 0 ? ' больше' : ' меньше') + ' на ' + m2txt(Math.abs(dX)) + ' м²: стена сдвинута на ' + dirTxt + '.';
      } else if ((how && how.only) || (ln.A.length === 1 && ln.B.length === 1)) {
        text = 'Стена ' + lineTitle(m, ln, how && how.only) + ' сдвинута на ' + dirTxt + '.';
      } else if (how && how.asked) {
        var others = ln.A.concat(ln.B).filter(function (id) { return how.asked.indexOf(id) < 0; }).map(function (id) { return 'у ' + form(m.room(id), 'gen'); });
        text = 'Стена ' + lineTitle(m, ln, how.asked) + ' сдвинута на ' + dirTxt + '. Это одна прямая стена, поэтому площадь изменилась и ' + others.join(', и ') + '.';
      } else if (how && how.room) {
        text = 'Стена ' + form(m.room(how.room), 'gen') + ' сдвинута на ' + dirTxt + '.';
      } else if (ln.A.length === 1 || ln.B.length === 1) {
        text = 'Стена ' + form(m.room(ln.A.length === 1 ? ln.A[0] : ln.B[0]), 'gen') + ' сдвинута на ' + dirTxt + '.';
      } else {
        text = 'Стена сдвинута на ' + dirTxt + '.';
      }
      var options = [];
      /* стена шла дальше упомянутых комнат — предложим двинуть только их участок */
      if (how && how.asked && !how.only && (ln.A.length + ln.B.length) > 2) {
        var pair = how.asked;
        var segsPair = ln.segs.filter(function (s) { return (s.A === pair[0] && s.B === pair[1]) || (s.A === pair[1] && s.B === pair[0]); });
        if (segsPair.length) options.push({ label: 'Только между ' + form(m.room(pair[0]), 'ins') + ' и ' + form(m.room(pair[1]), 'ins'),
          run: function () { undo(true); doMove(ln, dPx, null, { only: pair }); } });
      }
      st.lastMove = { ln: ln, dPx: dPx, how: how };
      commit(r.model, { who: 'app', text: text, rows: h.rows, notes: notes, options: options, geom: true, undoLabel: 'перенос стены' }, h);
    }

    /* ── команды словами ── */
    function run(text) {
      text = String(text || '').trim();
      if (!text) return;
      say({ who: 'user', text: text });
      var m = st.model, cmd = parse(text, m, { pending: st.pending, selected: st.sel });
      if (cmd.intent === 'fill' && st.pending) { cmd = parse(st.pending.text + ' ' + text, m, {}); }
      exec(cmd);
    }
    function exec(cmd) {
      var m = st.model, i = cmd.intent;
      if (i === 'undo') return undo();
      if (i === 'reset') return reset();
      if (i === 'help') return help(cmd.t ? 'Такую команду я пока не понимаю. ' : '');
      if (i === 'window') return say({ who: 'app', text: 'Окна — часть фасада: их нельзя добавить, убрать или сдвинуть. Двигать можно стены между комнатами и межкомнатные двери.' });
      if (i === 'ask') return ask(cmd);
      if (i === 'rename') return rename(cmd);
      if (i === 'merge') return merge(cmd);
      if (i === 'door_add') return doorAdd(cmd);
      if (i === 'door_remove') return doorRemove(cmd);
      if (i === 'door_move') return doorMove(cmd);
      if (i === 'repeat') return repeat(cmd);
      if (i === 'resize') return resize(cmd);
      if (i === 'move') return move(cmd);
      return help('');
    }
    function one(ids) { return ids && ids.length === 1 ? ids[0] : null; }
    function clarifyRoom(cmd, f) {
      var rs = f.ids.map(function (id) { return st.model.room(id); });
      return say({ who: 'app', text: 'Уточните, какую именно:', options: rs.map(function (r) {
        return { label: r.name + ', ' + m2txt(st.model.area(r)) + ' м²', run: function () { run(cmd.text.replace(new RegExp(f.word), f.word + ' ' + r.name.replace(/^\D*/, ''))); } };
      }) });
    }
    function needAmount(cmd, what) {
      st.pending = { text: cmd.text };
      return say({ who: 'app', text: (what || 'На сколько') + '?', options: ['10 см', '30 см', '50 см', '1 м'].map(function (a) {
        return { label: a, run: function () { run(cmd.text + ' на ' + a); } };
      }) });
    }
    function move(cmd) {
      var m = st.model, lines = m.lines(), ms = cmd.ms, ln = null, asked = null, sign = 0;
      for (var q = 0; q < ms.length; q++) if (ms[q].ids.length > 1) return clarifyRoom(cmd, ms[q]);
      var ids = ms.map(function (x) { return x.ids[0]; });
      if (ids.length >= 2 && !(cmd.toward && ms.length === 2 && cmd.toward === ms[1] && !/между/.test(cmd.t) && !/и\s/.test(cmd.t.slice(ms[0].at, ms[1].at)))) {
        var A = ids[0], B = ids[1];
        var cand = lines.filter(function (l) { return l.segs.some(function (s) { return (s.A === A && s.B === B) || (s.A === B && s.B === A); }); });
        if (!cand.length) return say({ who: 'app', text: cap(form(m.room(A), 'nom')) + ' и ' + form(m.room(B), 'nom') + ' не соседние — общей стены нет.', err: true });
        ln = cand[0]; asked = [A, B];
      } else if (ids.length >= 1) {
        var X = ids[0], Xl = lines.filter(function (l) { return l.A.indexOf(X) >= 0 || l.B.indexOf(X) >= 0; });
        var towardId = cmd.toward ? cmd.toward.ids[0] : null;
        if (towardId && towardId !== X) Xl = Xl.filter(function (l) { return l.A.indexOf(towardId) >= 0 || l.B.indexOf(towardId) >= 0; });
        if (cmd.side) {
          Xl = Xl.filter(function (l) {
            var xa = l.A.indexOf(X) >= 0;
            return cmd.side === 'east' ? (l.o === 'v' && xa) : cmd.side === 'west' ? (l.o === 'v' && !xa) : cmd.side === 'south' ? (l.o === 'h' && xa) : (l.o === 'h' && !xa);
          });
          if (!Xl.length) return say({ who: 'app', text: 'С этой стороны у ' + form(m.room(X), 'gen') + ' наружная стена — её двигать нельзя.', err: true });
        } else if (cmd.dir && !towardId) {
          /* «сдвинь стену спальни вправо» — та стена, что с этой стороны: спальня растёт */
          var byDir = Xl.filter(function (l) { return l.o === cmd.dir.o && ((cmd.dir.sign > 0) === (l.A.indexOf(X) >= 0)); });
          Xl = byDir.length ? byDir : Xl.filter(function (l) { return l.o === cmd.dir.o; });
        }
        if (!Xl.length) return say({ who: 'app', text: 'У ' + form(m.room(X), 'gen') + ' нет стены, которую можно сдвинуть' + (towardId ? ' в сторону ' + form(m.room(towardId), 'gen') : '') + '.', err: true });
        if (Xl.length > 1 && !cmd.dir && !towardId) {
          st.pending = { text: cmd.text };
          return say({ who: 'app', text: 'Какую стену ' + form(m.room(X), 'gen') + '?', options: Xl.slice(0, 4).map(function (l) {
            var other = (l.A.indexOf(X) >= 0 ? l.B : l.A)[0];
            return { label: 'С ' + form(m.room(other), 'ins'), run: function () { run(cmd.text + ' в сторону ' + form(m.room(other), 'gen')); } };
          }) });
        }
        ln = Xl[0];
        if (towardId) asked = [X, towardId];
        cmd.roomOnly = X;
        if (!cmd.dir && !towardId && cmd.grow == null) {
          /* направление не сказали: пусть растёт названная комната */
          sign = ln.A.indexOf(X) >= 0 ? 1 : -1;
        }
      } else if (st.sel) {
        ln = lines.filter(function (l) { return sameLine(st.sel, l); })[0] || null;
      }
      if (!ln) return help('Не поняла, какую стену двигать. ');
      if (cmd.dir) {
        if (cmd.dir.o !== ln.o) return say({ who: 'app', text: 'Эта стена идёт ' + (ln.o === 'v' ? 'сверху вниз — её можно сдвинуть только влево или вправо.' : 'слева направо — её можно сдвинуть только вверх или вниз.'),
          options: (ln.o === 'v' ? ['влево', 'вправо'] : ['вверх', 'вниз']).map(function (w) { return { label: cap(w), run: function () { run(stripDir(cmd.text) + ' ' + w); } }; }) });
        sign = cmd.dir.sign;
      } else if (cmd.toward) {
        var tw = cmd.toward.ids[0];
        if (ln.B.indexOf(tw) >= 0) sign = 1; else if (ln.A.indexOf(tw) >= 0) sign = -1;
        else return say({ who: 'app', text: 'Эта стена не граничит с ' + form(m.room(tw), 'ins') + '.', err: true });
      }
      if (!sign) {
        st.pending = { text: cmd.text };
        var ws = ln.o === 'v' ? [['влево', -1], ['вправо', 1]] : [['вверх', -1], ['вниз', 1]];
        return say({ who: 'app', text: 'В какую сторону?', options: ws.map(function (w) {
          var grows = (w[1] > 0 ? ln.A : ln.B).map(function (id) { return form(m.room(id), 'nom'); }).join(' и ');
          return { label: cap(w[0]) + ' — ' + grows + ' больше', run: function () { run(cmd.text + ' ' + w[0]); } };
        }) });
      }
      if (!cmd.amount) return needAmount(cmd);
      if (cmd.amount.m2) return say({ who: 'app', text: 'Стену двигают на сантиметры. Чтобы прибавить площадь, скажите: «сделай спальню больше на 1 м²».' });
      var dm = Math.min(cmd.amount.m, MAX_MOVE_M);
      doMove(ln, sign * dm * ppm, cmd.text, { asked: asked, only: cmd.only && asked ? asked : null, room: cmd.roomOnly || null });
    }
    function stripDir(t) { return t.replace(/\s*(влево|вправо|вверх|вниз|налево|направо|наверх)\s*/g, ' ').trim(); }
    function resize(cmd) {
      var m = st.model, ms = cmd.ms;
      for (var q = 0; q < ms.length; q++) if (ms[q].ids.length > 1) return clarifyRoom(cmd, ms[q]);
      var X = ms[0].ids[0], room = m.room(X), lines = m.lines();
      var towardId = cmd.toward ? cmd.toward.ids[0] : (ms[1] ? ms[1].ids[0] : null);
      if (towardId === X) towardId = null;
      var cand = lines.filter(function (l) { return l.A.indexOf(X) >= 0 || l.B.indexOf(X) >= 0; });
      if (towardId) cand = cand.filter(function (l) { return l.A.indexOf(towardId) >= 0 || l.B.indexOf(towardId) >= 0; });
      if (cmd.axis) {
        var h = maxRect(room.rects), shortX = rw(h) <= rh(h);
        var wantO = (cmd.axis === 'short') === shortX ? 'v' : 'h';
        var c2 = cand.filter(function (l) { return l.o === wantO; });
        if (c2.length) cand = c2;
      }
      if (!cand.length) return say({ who: 'app', text: 'У ' + form(room, 'gen') + ' все стены наружные' + (towardId ? ' или не граничат с ' + form(m.room(towardId), 'ins') : '') + ' — менять её размер нечем.', err: true });
      if (!cmd.amount) return needAmount(cmd, 'На сколько ' + (cmd.grow ? 'больше' : 'меньше'));
      var tries = cand.map(function (l) {
        var xa = l.A.indexOf(X) >= 0, sign = (xa ? 1 : -1) * (cmd.grow ? 1 : -1);
        var len = l.segs.filter(function (s) { return s.A === X || s.B === X; }).reduce(function (a, s) { return a + (s.to - s.from); }, 0);
        var dm = cmd.amount.m2 ? cmd.amount.m2 * ppm * ppm / Math.max(1, len) / ppm : cmd.amount.m;
        dm = Math.min(dm, MAX_MOVE_M);
        var res = m.moveSegs(l.segs, sign * dm * ppm);
        var other = (xa ? l.B : l.A).reduce(function (a, id) { return a + m.area(m.room(id)); }, 0);
        var keepsShape = res.ok && res.model.room(X).rects.length <= room.rects.length;
        return { l: l, sign: sign, dm: dm, res: res, score: (res.ok ? 1e6 : 0) + (keepsShape ? 1e4 : 0) + (cmd.grow ? other : -other) };
      }).sort(function (a, b) { return b.score - a.score; });
      var best = tries[0];
      if (!best.res.ok) {
        var mx = m.maxMove(best.l.segs, best.sign * best.dm * ppm);
        if (mx.px && Math.abs(mx.px) >= 0.01 * ppm) {
          var mt = lenTxt(mx.px / ppm);
          return say({ who: 'app', text: 'На столько не выйдет: ' + best.res.why + '. Стену можно сдвинуть максимум на ' + mt + '.',
            options: [{ label: 'Сдвинуть на ' + mt, run: function () { doMove(best.l, mx.px, null, { resize: X }); } }], err: true });
        }
        return say({ who: 'app', text: 'Не получится: ' + best.res.why + '.', err: true });
      }
      doMove(best.l, best.sign * best.dm * ppm, cmd.text, { resize: X });
    }
    function repeat(cmd) {
      if (!st.lastMove) return help('');
      var lm = st.lastMove, ln = st.model.lines().filter(function (l) { return sameLine(lm.ln, l); })[0];
      if (!ln) return help('');
      var sign = lm.dPx > 0 ? 1 : -1;
      if (cmd.dir && cmd.dir.o === ln.o) sign = cmd.dir.sign;
      doMove(ln, sign * Math.min(cmd.amount.m, MAX_MOVE_M) * ppm, cmd.text, lm.how);
    }
    function rename(cmd) {
      var m = st.model, ms = cmd.ms;
      if (!ms.length) return say({ who: 'app', text: 'Какую комнату переименовать?', options: m.rooms.map(function (r) {
        return { label: r.name, run: function () { input.value = 'Переименуй ' + form(r, 'acc') + ' в '; input.focus(); } };
      }) });
      if (ms[0].ids.length > 1) return clarifyRoom(cmd, ms[0]);
      var next = m.clone(), r = next.room(ms[0].ids[0]), was = r.name;
      r.name = cmd.newName.name;
      if (cmd.newName.type) r.type = cmd.newName.type;
      if (was === r.name) return say({ who: 'app', text: 'Название и так такое.' });
      commit(next, { who: 'app', text: 'Готово: «' + was + '» теперь «' + r.name + '».', names: true, undoLabel: 'переименование' }, null);
    }
    function merge(cmd) {
      var m = st.model, ms = cmd.ms;
      if (ms.length < 2) return say({ who: 'app', text: 'Какие две комнаты объединить? Например: «снеси стену между кухней и гостиной».' });
      for (var q = 0; q < 2; q++) if (ms[q].ids.length > 1) return clarifyRoom(cmd, ms[q]);
      var A = ms[0].ids[0], B = ms[1].ids[0];
      if (A === B) return say({ who: 'app', text: 'Назовите две разные комнаты.' });
      var res = m.merge(A, B);
      if (!res.ok) return say({ who: 'app', text: 'Не получится: ' + cap(form(m.room(A), 'nom')) + ' и ' + form(m.room(B), 'nom') + ' — ' + res.why + '.', err: true });
      var big = res.model.room(res.merged.into);
      var h = { rooms: {}, delta: {}, ghost: m.segments().filter(function (s) { return (s.A === A && s.B === B) || (s.A === B && s.B === A); }).map(function (s) { return strip(s.o, s.ea, s.eb, s.from, s.to); }) };
      h.rooms[big.id] = 1; h.delta[big.id] = res.model.area(big) - m.area(m.room(big.id));
      commit(res.model, { who: 'app', text: 'Стена между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' снесена: ' + form(big, 'nom') + ' — ' + m2txt(res.model.area(big)) + ' м².',
        notes: ['Несущую стену сносить нельзя: какая стена несущая, видно в техпаспорте БТИ.'], geom: true, undoLabel: 'снос стены' }, h);
    }
    function pairDoors(m, A, B) { return m.doors.filter(function (d) { return (d.a === A && d.b === B) || (d.a === B && d.b === A); }); }
    function doorAdd(cmd) {
      var m = st.model, ms = cmd.ms;
      if (ms.length < 2) return say({ who: 'app', text: 'Между какими комнатами нужна дверь? Например: «добавь дверь из прихожей в гостиную».' });
      for (var q = 0; q < 2; q++) if (ms[q].ids.length > 1) return clarifyRoom(cmd, ms[q]);
      var A = ms[0].ids[0], B = ms[1].ids[0];
      if (pairDoors(m, A, B).length && !/втор|ещ/.test(cmd.t)) return say({ who: 'app', text: 'Между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' дверь уже есть.' });
      var segs = m.segments().filter(function (s) { return (s.A === A && s.B === B) || (s.A === B && s.B === A); })
        .sort(function (p, q2) { return (q2.to - q2.from) - (p.to - p.from); });
      if (!segs.length) return say({ who: 'app', text: cap(form(m.room(A), 'nom')) + ' и ' + form(m.room(B), 'nom') + ' не соседние — дверь не поставить.', err: true });
      var s = segs[0], want = (cmd.kind === 'passage' ? PASSAGE_W_M : DOOR_W_M) * ppm, margin = DOOR_MARGIN_M * ppm;
      var room = s.to - s.from - 2 * margin, w = Math.min(want, room);
      if (w < 0.6 * ppm) return say({ who: 'app', text: 'Стена между ними слишком короткая для двери.', err: true });
      var next = m.clone();
      var d = { id: 'd' + (next.nextId++), kind: cmd.kind === 'passage' ? 'passage' : 'door', a: A, b: B, o: s.o, pos: (s.from + s.to) / 2, width: w };
      /* не ставим поверх другой двери на той же стене */
      var others = next.doors.filter(function (x) { return x.kind !== 'entrance' && x.o === s.o && Math.abs((x.at || 0) - (s.ea + s.eb) / 2) < 2; });
      others.forEach(function (x) { if (Math.abs(x.pos - d.pos) < (x.width + w) / 2 + margin) d.pos = x.pos + (x.pos > (s.from + s.to) / 2 ? -1 : 1) * ((x.width + w) / 2 + margin); });
      if (!next.anchorDoor(d, next.segments())) return say({ who: 'app', text: 'Двери не хватает места в этой стене.', err: true });
      next.doors.push(d);
      commit(next, { who: 'app', text: (d.kind === 'passage' ? 'Сделан проём ' : 'Добавлена дверь ') + lenTxt(w / ppm) + ' между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + '.', geom: true, undoLabel: 'новая дверь' }, null);
    }
    function doorRemove(cmd) {
      var m = st.model, ms = cmd.ms;
      if (ms.length < 2) return say({ who: 'app', text: 'Какую дверь убрать? Например: «убери дверь между спальней и прихожей».' });
      for (var q = 0; q < 2; q++) if (ms[q].ids.length > 1) return clarifyRoom(cmd, ms[q]);
      var A = ms[0].ids[0], B = ms[1].ids[0], ds = pairDoors(m, A, B);
      if (!ds.length) return say({ who: 'app', text: 'Между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' двери нет.' });
      var next = m.clone();
      next.doors = next.doors.filter(function (d) { return !ds.some(function (x) { return x.id === d.id; }); });
      var lost = next.unreachable().filter(function (id) { return m.unreachable().indexOf(id) < 0; });
      var notes = lost.map(function (id) { return 'В ' + form(next.room(id), 'acc') + ' теперь не попасть — нужна другая дверь.'; });
      commit(next, { who: 'app', text: 'Дверь между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' убрана.', notes: notes, geom: true, undoLabel: 'дверь убрана' }, null);
    }
    function doorMove(cmd) {
      var m = st.model, ms = cmd.ms;
      if (ms.length < 2) return say({ who: 'app', text: 'Какую дверь сдвинуть? Например: «сдвинь дверь между спальней и прихожей на 20 см вниз».' });
      var A = ms[0].ids[0], B = ms[1].ids[0], ds = pairDoors(m, A, B);
      if (!ds.length) return say({ who: 'app', text: 'Между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' двери нет.' });
      var d0 = ds[0];
      if (!cmd.dir) return say({ who: 'app', text: 'Дверь можно сдвинуть ' + (d0.o === 'h' ? 'влево или вправо' : 'вверх или вниз') + '. Куда и на сколько?' });
      var alongO = d0.o === 'h' ? 'v' : 'h';
      if (cmd.dir.o !== alongO) return say({ who: 'app', text: 'Эта дверь стоит в стене, которая идёт ' + (d0.o === 'h' ? 'слева направо: двигать её можно влево или вправо.' : 'сверху вниз: двигать её можно вверх или вниз.') });
      if (!cmd.amount) return needAmount(cmd);
      var next = m.clone(), d = next.doors.filter(function (x) { return x.id === d0.id; })[0];
      var want = d.pos + cmd.dir.sign * cmd.amount.m * ppm, before = d.pos;
      d.pos = want;
      next.anchorDoor(d, next.segments());
      var moved = d.pos - before;
      if (Math.abs(moved) < 0.5) return say({ who: 'app', text: 'Дальше двигать некуда: дверь упрётся в угол.', err: true });
      commit(next, { who: 'app', text: 'Дверь между ' + form(m.room(A), 'ins') + ' и ' + form(m.room(B), 'ins') + ' сдвинута на ' + lenTxt(moved / ppm) + ' ' + cmd.dir.word +
        (Math.abs(moved - (want - before)) > 1 ? ' — дальше упирается в угол' : '') + '.', geom: true, undoLabel: 'перенос двери' }, null);
    }
    function ask(cmd) {
      var m = st.model, ms = cmd.ms;
      if (!ms.length) {
        var tot = m.rooms.reduce(function (a, r) { return a + m.area(r); }, 0);
        return say({ who: 'app', text: 'Всего ' + m2txt(tot) + ' м² в ' + m.rooms.length + ' помещениях.' });
      }
      var parts = ms.map(function (f) { return f.ids.map(function (id) { var r = m.room(id), h = maxRect(r.rects);
        return r.name + ' — ' + m2txt(m.area(r)) + ' м², ' + dimTxt(rw(h) / ppm).replace(' м', '') + ' × ' + dimTxt(rh(h) / ppm) + (r.rects.length > 1 ? ', Г-образная' : ''); }).join('; '); });
      say({ who: 'app', text: parts.join('; ') + '.' });
    }
    function help(prefix) {
      say({ who: 'app', text: (prefix || '') + 'Я понимаю такие команды — нажмите, чтобы попробовать:', options: examples(true).map(function (e) {
        return { label: e, run: function () { run(e); } };
      }) });
    }
    /* примеры под этот план: только то, что сработает */
    function examples(all) {
      var m = st.model, out = [], lines = m.lines();
      var ln = lines.filter(function (l) { return l.A.length === 1 && l.B.length === 1; })[0] || lines[0];
      if (ln) {
        var A = m.room(ln.A[0]), B = m.room(ln.B[0]);
        var grow = m.area(A) <= m.area(B) ? 1 : -1, dir = ln.o === 'v' ? (grow > 0 ? 'вправо' : 'влево') : (grow > 0 ? 'вниз' : 'вверх');
        if (m.moveSegs(ln.segs, grow * 0.3 * ppm).ok) out.push('Сдвинь стену между ' + form(A, 'ins') + ' и ' + form(B, 'ins') + ' на 30 см ' + dir);
      }
      var small = m.rooms.slice().sort(function (a, b) { return m.area(a) - m.area(b); })
        .filter(function (r) { return lines.some(function (l) { return l.A.indexOf(r.id) >= 0 || l.B.indexOf(r.id) >= 0; }); })[0];
      if (small) out.push('Сделай ' + form(small, 'acc') + ' больше на 20 см');
      var kitchen = m.rooms.filter(function (r) { return /кухн/.test(String(r.name).toLowerCase()) && !/гостин/.test(String(r.name).toLowerCase()); })[0];
      var living = m.rooms.filter(function (r) { return r.type === 'гостиная'; })[0];
      if (kitchen && living && m.segments().some(function (s) { return (s.A === kitchen.id && s.B === living.id) || (s.A === living.id && s.B === kitchen.id); }))
        out.push('Снеси стену между кухней и гостиной');
      else if (living && !kitchen) out.push('Переименуй гостиную в кухню-гостиную');
      if (all) {
        var segs = m.segments(), pair = null;
        segs.some(function (s) { if (!pairDoors(m, s.A, s.B).length && s.to - s.from > 1.1 * ppm) { pair = s; return true; } return false; });
        if (pair) out.push('Добавь дверь между ' + form(m.room(pair.A), 'ins') + ' и ' + form(m.room(pair.B), 'ins'));
        if (m.rooms[0]) out.push('Какая площадь ' + form(m.rooms.slice().sort(function (a, b) { return m.area(b) - m.area(a); })[0], 'gen') + '?');
        out.push('Отмени');
      }
      return out.slice(0, all ? 6 : 3);
    }
    function undo(silent) {
      var last = st.undo.pop();
      if (!last) { if (!silent) say({ who: 'app', text: 'Отменять нечего — план как был.' }); paint(); return; }
      st.model = last.model; st.preview = null; st.hl = null; st.pending = null;
      st.changed.geom = st.undo.length > 0 && st.changed.geom;
      if (!silent) say({ who: 'app', text: 'Отменено: ' + last.label + '.' });
      paint();
    }
    function reset() {
      if (!st.undo.length) { say({ who: 'app', text: 'План и так исходный.' }); return; }
      st.undo = []; st.model = base.clone(); st.preview = null; st.hl = null; st.sel = null; st.selRoom = null; st.pending = null;
      st.changed = { geom: false, names: false };
      say({ who: 'app', text: 'План вернулся к исходному.' });
      paint();
    }

    /* ── журнал ── */
    function say(e) {
      st.log.push(e);
      if (st.log.length > 40) st.log = st.log.slice(-40);
      renderLog();
    }
    function renderLog() {
      var items = st.log, show = st.showAll ? items : items.slice(-4), hidden = items.length - show.length;
      logEl.innerHTML = (hidden > 0 ? '<button type="button" class="pe-log__more" data-more="1">Показать всю историю · ' + items.length + '</button>' : '') +
        show.map(function (e, i) {
          if (e.who === 'user') return '<p class="pe-msg pe-msg--me">' + esc(e.text) + '</p>';
          var idx = items.length - show.length + i;
          return '<div class="pe-msg pe-msg--app' + (e.err ? ' is-err' : '') + '"><p>' + esc(e.text) + '</p>' +
            (e.rows && e.rows.length ? '<ul class="pe-rows">' + e.rows.map(function (r) {
              var d = r.was != null && r.now != null ? r.now - r.was : null;
              return '<li><span>' + esc(r.name) + '</span><b>' + (r.was != null ? m2txt(r.was) + ' → ' : '') + (r.now != null ? m2txt(r.now) + ' м²' : 'нет') + '</b>' +
                (d != null ? '<em class="' + (d >= 0 ? 'is-up' : 'is-down') + '">' + deltaTxt(d) + '</em>' : '<em></em>') + '</li>';
            }).join('') + '</ul>' : '') +
            (e.notes && e.notes.length ? e.notes.map(function (n) { return '<p class="pe-note">' + esc(n) + '</p>'; }).join('') : '') +
            (e.options && e.options.length && idx === items.length - 1 ? '<div class="pe-opts">' + e.options.map(function (o, k) {
              return '<button type="button" class="chip pe-opt" data-opt="' + k + '">' + esc(o.label) + '</button>'; }).join('') + '</div>' : '') +
            '</div>';
        }).join('');
      logEl.hidden = !items.length;
      sugg.hidden = items.length > 0;
    }

    /* ── список комнат ── */
    function renderRooms() {
      var m = st.model, tot = m.rooms.reduce(function (a, r) { return a + m.area(r); }, 0);
      var delta = st.hl && st.hl.delta ? st.hl.delta : {};
      var cnt = m.rooms.length, word = cnt % 10 === 1 && cnt % 100 !== 11 ? 'помещение' : (cnt % 10 >= 2 && cnt % 10 <= 4 && (cnt % 100 < 12 || cnt % 100 > 14)) ? 'помещения' : 'помещений';
      roomsEl.innerHTML = '<div class="pe-rooms__head"><span class="pb__k">' + cnt + ' ' + word + ' · ' + m2txt(tot) + ' м²</span>' +
        '<span class="pe-tools">' +
          '<button type="button" class="pe-tool" data-tool="undo"' + (st.undo.length ? '' : ' disabled') + '>' + icon('undo') + 'Отменить</button>' +
          '<button type="button" class="pe-tool" data-tool="reset"' + (st.undo.length ? '' : ' disabled') + '>Сбросить</button></span></div>' +
        '<ul class="pe-list">' + m.rooms.map(function (r) {
          var d = delta[r.id];
          return '<li><input class="input pe-list__in" data-rid="' + r.id + '" value="' + esc(r.name) + '" aria-label="Название помещения">' +
            '<span class="pe-list__a">' + m2txt(m.area(r)) + ' м²' + (d != null && Math.abs(d) >= 0.05 ? '<em class="' + (d > 0 ? 'is-up' : 'is-down') + '">' + deltaTxt(d) + '</em>' : '') + '</span></li>';
        }).join('') + '</ul>';
    }
    function renderPanel() {
      var m = cur(), ln = st.sel ? (st.lines || []).filter(function (l) { return sameLine(st.sel, l); })[0] : null;
      if (!ln) {
        if (st.selRoom && m.room(st.selRoom)) {
          var r = m.room(st.selRoom), h = maxRect(r.rects);
          panel.hidden = false;
          panel.innerHTML = '<p class="pe-panel__t"><b>' + esc(r.name) + '</b> · ' + m2txt(m.area(r)) + ' м² · ' + dimTxt(rw(h) / ppm).replace(' м', '') + ' × ' + dimTxt(rh(h) / ppm) +
            (r.rects.length > 1 ? ' · Г-образная' : '') + '</p><p class="pe-panel__h">Чтобы поменять размер, потяните стену или скажите: «сделай ' + esc(form(r, 'acc')) + ' больше на 30 см».</p>';
          return;
        }
        panel.hidden = true; panel.innerHTML = ''; return;
      }
      var a = ln.A.map(function (id) { return m.room(id).name; }).join(', '), b = ln.B.map(function (id) { return m.room(id).name; }).join(', ');
      panel.hidden = false;
      panel.innerHTML = '<p class="pe-panel__t">Стена: <b>' + esc(a) + '</b> | <b>' + esc(b) + '</b></p>' +
        '<div class="pe-panel__b"><button type="button" class="btn btn--ghost btn--sm" data-nudge="1">' + esc(shortList(ln.A, m)) + ' +10 см</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-nudge="-1">' + esc(shortList(ln.B, m)) + ' +10 см</button></div>' +
        '<p class="pe-panel__h">Или тяните стену пальцем — шаг 5 см.</p>';
    }
    function shortList(ids, m) { var n = ids.map(function (id) { return m.room(id).name; }); return n.length > 1 ? n[0] + ' и др.' : n[0]; }
    function renderSugg() {
      var ex = examples(false);
      sugg.innerHTML = ex.length ? '<span class="pe-sugg__k">Например</span>' + ex.map(function (e) { return '<button type="button" class="chip pe-ex">' + esc(e) + '</button>'; }).join('') : '';
    }
    function paint() {
      measure();
      draw();
      renderPanel();
      renderRooms();
      renderLog();
      if (opts.onChange) opts.onChange(api);
    }
    function measure() {
      var w = svg.getBoundingClientRect().width || root.getBoundingClientRect().width || 360;
      st.scale = w / VB[2];
    }

    /* ── пальцем и мышью ── */
    function toPlan(e) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
      var p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest ? e.target.closest('[data-line]') : null;
      if (g) {
        var ln = st.lines[+g.getAttribute('data-line')];
        if (!ln) return;
        e.preventDefault();
        var p = toPlan(e);
        st.drag = { ln: ln, start: ln.o === 'v' ? p.x : p.y, d: 0, moved: false, id: e.pointerId, res: null, why: null };
        try { svg.setPointerCapture(e.pointerId); } catch (x) {}
        return;
      }
      var rg = e.target.closest ? e.target.closest('[data-room]') : null;
      st.tapRoom = rg ? rg.getAttribute('data-room') : '';
    });
    svg.addEventListener('pointermove', function (e) {
      var dr = st.drag; if (!dr || e.pointerId !== dr.id) return;
      var p = toPlan(e), raw = (dr.ln.o === 'v' ? p.x : p.y) - dr.start, step = DRAG_STEP_M * ppm;
      var snapped = Math.round(raw / step) * step;
      if (Math.abs(raw) > 3 / st.scale) dr.moved = true;
      if (snapped === dr.d) return;
      dr.d = snapped;
      if (!snapped) { st.preview = null; dr.res = null; schedule(); return; }
      var r = st.model.moveSegs(dr.ln.segs, snapped);
      if (!r.ok) {
        var mx = st.model.maxMove(dr.ln.segs, snapped);
        dr.why = r.why;
        if (mx.px && mx.res && mx.res.ok) { r = mx.res; dr.d = mx.px; } else { r = null; dr.d = 0; }
      } else dr.why = null;
      dr.res = r;
      st.preview = r ? r.model : null;
      if (r) st.hl = hlFor(st.model, r.model, dr.ln, dr.ln.segs); else st.hl = null;
      st.sel = dr.ln;
      schedule();
    });
    function endDrag(e) {
      var dr = st.drag; if (!dr || (e && e.pointerId !== dr.id)) return;
      st.drag = null;
      if (dr.moved && dr.res && dr.d) {
        st.preview = null;
        doMove(dr.ln, dr.d, null, {});
        if (dr.why) say({ who: 'app', text: 'Дальше нельзя: ' + dr.why + '.', err: true });
        st.sel = st.model.lines().filter(function (l) { return sameLine(dr.ln, l); })[0] || null;
        paint();
        return;
      }
      st.preview = null;
      st.sel = sameLine(st.sel, dr.ln) && !dr.moved ? null : dr.ln;
      st.selRoom = null;
      if (st.sel) st.hl = null;
      paint();
    }
    svg.addEventListener('pointerup', function (e) {
      if (st.drag) return endDrag(e);
      if (st.tapRoom != null) {
        var id = st.tapRoom; st.tapRoom = null;
        st.sel = null;
        st.selRoom = id && st.selRoom !== id ? id : null;
        paint();
      }
    });
    svg.addEventListener('pointercancel', function (e) { if (st.drag) { st.preview = null; st.drag = null; paint(); } void e; });
    var raf = 0;
    function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(); renderPanel(); }); }

    /* клавиатура: стрелки двигают выбранную стену на 5 см, с Shift — на 25 см */
    svg.addEventListener('keydown', function (e) {
      var g = e.target.closest ? e.target.closest('[data-line]') : null;
      var rg = e.target.closest ? e.target.closest('[data-room]') : null;
      if (rg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); st.selRoom = rg.getAttribute('data-room'); st.sel = null; paint(); focusSel('[data-room="' + st.selRoom + '"]'); return; }
      if (!g) return;
      var ln = st.lines[+g.getAttribute('data-line')]; if (!ln) return;
      var dir = 0;
      if (ln.o === 'v' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) dir = e.key === 'ArrowRight' ? 1 : -1;
      if (ln.o === 'h' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) dir = e.key === 'ArrowDown' ? 1 : -1;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.sel = ln; st.selRoom = null; paint(); focusLine(ln); return; }
      if (!dir) return;
      e.preventDefault();
      st.sel = ln;
      doMove(ln, dir * (e.shiftKey ? KEY_BIG_M : KEY_STEP_M) * ppm, null, {});
      focusLine(ln);
    });
    function focusLine(ln) {
      var i = -1; (st.lines || []).some(function (l, k) { if (sameLine(ln, l)) { i = k; return true; } return false; });
      if (i >= 0) focusSel('[data-line="' + i + '"]');
    }
    function focusSel(sel) { var el = svg.querySelector(sel); if (el && el.focus) el.focus({ preventScroll: true }); }

    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nudge]'); if (!b || !st.sel) return;
      var ln = (st.lines || []).filter(function (l) { return sameLine(st.sel, l); })[0]; if (!ln) return;
      doMove(ln, +b.getAttribute('data-nudge') * NUDGE_M * ppm, null, {});
      st.sel = st.model.lines().filter(function (l) { return sameLine(ln, l); })[0] || null;
      paint();
    });
    form_.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; run(v); });
    sugg.addEventListener('click', function (e) { var b = e.target.closest('.pe-ex'); if (b) run(b.textContent); });
    logEl.addEventListener('click', function (e) {
      var more = e.target.closest('[data-more]'); if (more) { st.showAll = true; renderLog(); return; }
      var b = e.target.closest('[data-opt]'); if (!b) return;
      var last = st.log[st.log.length - 1], o = last && last.options ? last.options[+b.getAttribute('data-opt')] : null;
      if (o && o.run) { say({ who: 'user', text: o.label }); o.run(); }
    });
    roomsEl.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tool]'); if (!t || t.disabled) return;
      if (t.getAttribute('data-tool') === 'undo') undo(); else reset();
    });
    roomsEl.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-rid]'); if (!inp) return;
      var v = inp.value.trim(), m = st.model, r = m.room(inp.getAttribute('data-rid'));
      if (!r || !v || v === r.name) { if (r) inp.value = r.name; return; }
      var next = m.clone(), nr = next.room(r.id), was = nr.name, nm = nameFrom(v.toLowerCase(), v);
      nr.name = v.slice(0, 30);
      if (nm && nm.type) nr.type = nm.type;
      commit(next, { who: 'app', text: 'Готово: «' + was + '» теперь «' + nr.name + '».', names: true, undoLabel: 'переименование' }, null);
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]'); if (!b || !fileImg) return;
      st.view = b.getAttribute('data-view');
      root.querySelectorAll('[data-view]').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      svg.style.display = st.view === 'file' ? 'none' : '';
      fileImg.hidden = st.view !== 'file';
      legend.hidden = st.view === 'file' || !(st.hl && st.hl.ghost && st.hl.ghost.length);
    });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { var s = st.scale; measure(); if (Math.abs(s - st.scale) > 0.002) draw(); }) : null;
    if (ro) ro.observe(svg);

    var api = {
      rooms: function () { var m = st.model; return m.rooms.map(function (r) { return { id: r.id, name: r.name, type: r.type, area: m.area(r) }; }); },
      /* что поменялось относительно исходного плана — сравниваем данные, а не историю правок */
      changed: function () {
        var b = base, m = st.model;
        function geo(x) { return JSON.stringify(x.rooms.map(function (r) { return [r.id, r.rects]; })) + JSON.stringify(x.doors.map(function (d) { return [d.kind, d.a, d.b, Math.round(d.pos), Math.round(d.width)]; })); }
        function nm(x) { return JSON.stringify(x.rooms.map(function (r) { return [r.id, r.name, r.type]; })); }
        return { geom: geo(b) !== geo(m), names: nm(b) !== nm(m) };
      },
      frame: function () { return st.model.toFrame(); },
      state: function () {
        function pack(m) { return { rooms: m.rooms, doors: m.doors, nextId: m.nextId }; }
        return { model: pack(st.model), undo: st.undo.slice(-20).map(function (u) { return { model: pack(u.model), label: u.label }; }), log: st.log.slice(-12) };
      },
      run: run,
      destroy: function () { if (ro) ro.disconnect(); root.innerHTML = ''; root.classList.remove('pe'); }
    };
    renderSugg();
    paint();
    return api;
  }

  var uidN = 0;
  function uid() { return ++uidN; }
  function icon(name) {
    if (name === 'send') return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (name === 'undo') return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '';
  }

  window.SOVE_PLANED = { create: create, Model: Model, parse: parse, norm: norm, amountOf: amountOf, form: form };
})();
