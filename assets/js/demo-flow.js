/* Общее для трёх экранов сценария «планировка → расстановка → интерьер»:
   полоска шагов и состояние сценария (анкета, выбранная капсула), которое
   живёт в localStorage между страницами. Платных вызовов здесь нет. */
(function () {
  var KEY = 'sove.demo.flow.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(patch) {
    var cur = load(); Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    return cur;
  }
  var STEPS = [
    { n: 1, t: 'План', href: 'plan-demo.html' },
    { n: 2, t: 'Расстановка', href: 'arrange.html?v=panel' },
    { n: 3, t: 'Интерьер', href: 'result.html' }
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* полоска шагов: пройденные кликабельны, текущий выделен, будущие — серые */
  function stepsBar(current) {
    return '<nav class="df-steps" aria-label="Шаги сценария">' + STEPS.map(function (s) {
      var cls = s.n < current ? 'is-done' : s.n === current ? 'is-now' : '';
      var inner = '<i>' + s.n + '</i><span>' + esc(s.t) + '</span>';
      return s.n < current
        ? '<a class="df-step ' + cls + '" href="' + s.href + '">' + inner + '</a>'
        : '<span class="df-step ' + cls + '"' + (s.n === current ? ' aria-current="step"' : '') + '>' + inner + '</span>';
    }).join('<b class="df-steps__line"></b>') + '</nav>';
  }
  /* какой вариант расстановки отвечает анкете: правила те же, что в API, здесь — три
     заранее посчитанных набора из arrange-data.js */
  function planFor(brief) {
    if (!brief) return 0;
    if (brief.work === 'да' && brief.bath === 'ванна') return 2;   /* «С рабочим местом» */
    if (brief.work === 'нет') return 1;                            /* «Больше хранения» */
    return 0;                                                      /* «Как советует SOVEAPP» */
  }
  /* ── рамка планировки из разметки: перенос ai_plan_markup.layout_frame ──────
     Разметка приходит в долях 0–1000 ([y, x]), а расстановке нужны пиксели плана
     [x1, y1, x2, y2]. Ниша — своя «комната» с part_of, дверь — зона 0,9 м поперёк
     проёма (у входной — только внутрь), окно — полоса стены 0,3 м. */
  var RU = { 'спальня': 'Спальня', 'санузел': 'Санузел', 'прихожая': 'Прихожая', 'гостиная': 'Гостиная',
             'гостиная-кухня': 'Кухня-гостиная', 'кухня': 'Кухня', 'детская': 'Детская',
             'гардеробная': 'Гардеробная', 'балкон': 'Балкон', 'другое': 'Помещение' };
  function frameFromMarkup(res, W, H) {
    var ppm = +(res.scale_px_per_m || (W / 9));
    function px(b) { return [Math.round(b[1] / 1000 * W), Math.round(b[0] / 1000 * H), Math.round(b[3] / 1000 * W), Math.round(b[2] / 1000 * H)]; }
    var rooms = [], windows = [], doors = [];
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      var name = r.label || RU[r.type] || (r.type || 'Помещение');
      rooms.push({ name: name, type: r.type, box: px(r.main_box_2d || r.box_2d), doc_m2: r.area_m2 });
      if (r.recess) rooms.push({ name: 'Ниша: ' + name, type: r.type, part_of: name, box: px(r.recess.box_2d),
        doc_m2: Math.round((r.recess.depth_m || 0) * (r.recess.width_m || 0) * 10) / 10, contains: r.recess.contains });
    });
    var clear = 0.9 * ppm, wall = 0.3 * ppm;
    (res.openings || []).forEach(function (o) {
      if (o.kind === 'window' && o.span_2d) {
        var ay = o.span_2d[0][0], ax = o.span_2d[0][1], by = o.span_2d[1][0], bx = o.span_2d[1][1], box;
        if (ay === by) box = [ax / 1000 * W, ay / 1000 * H - wall / 2, bx / 1000 * W, by / 1000 * H + wall / 2];
        else box = [ax / 1000 * W - wall / 2, ay / 1000 * H, bx / 1000 * W + wall / 2, by / 1000 * H];
        windows.push({ room: o.a, wall: o.wall, box: box.map(Math.round) });
      } else if (o.kind === 'door' || o.kind === 'passage' || o.kind === 'entrance') {
        if (!o.point_2d) return;
        var cy = o.point_2d[0] / 1000 * H, cx = o.point_2d[1] / 1000 * W;
        var half = Math.max(0.4, +(o.width_m || 0.9)) * ppm / 2, side = o.wall_of_a || o.wall, box2;
        if (o.kind === 'entrance') {
          box2 = { east: [cx - clear, cy - half, cx, cy + half], west: [cx, cy - half, cx + clear, cy + half],
                   south: [cx - half, cy - clear, cx + half, cy], north: [cx - half, cy, cx + half, cy + clear] }[side] ||
                 [cx - half, cy - clear, cx + half, cy + clear];
        } else if (side === 'north' || side === 'south') box2 = [cx - half, cy - clear, cx + half, cy + clear];
        else box2 = [cx - clear, cy - half, cx + clear, cy + half];
        doors.push({ kind: o.kind, a: o.a, b: o.b, box: box2.map(Math.round) });
      }
    });
    return { px_per_m: Math.round(ppm * 100) / 100, rooms: rooms, windows: windows, doors: doors,
             outside: (res.outside || []).map(function (p) { return { box: px(p.box_2d) }; }) };
  }

  /* анкета из четырёх ответов → формат brief, который читает /ai/layout/auto */
  function briefFromAnswers(a) {
    a = a || {};
    return {
      rooms: { kitchen_format: 'кухня-гостиная (единое пространство)' },
      kitchen: { shape: 'Г-образная', front_m: '2–3', fridge: 'встроенный' },
      living: { dining_table: 'стол на 4', sofa: a.sofa || 'прямой, до 200 см', tv: true, extra: 'место для хранения' },
      bedroom: { bed: a.bed || '160×200', nightstands: 2, wardrobe: 'шкаф', workplace: a.work === 'да', tv: false },
      bathroom: { shower: a.bath === 'ванна' ? '' : 'встроенный', bathtub: a.bath === 'ванна', wc: 'подвесной', sink: 'накладная' },
      storage: { zones: ['прихожая', 'спальня'] },
      laundry: { appliances: ['стиральная машина'] }
    };
  }

  /* вызовы API того же сервера; на стенде /api/ проксируется на API, как на сайте */
  function apiMarkup(file) {
    var fd = new FormData(); fd.append('file', file, file.name || 'plan.jpg');
    return fetch('/api/ai/plan/markup', { method: 'POST', body: fd }).then(unwrap);
  }
  function apiAuto(frame, brief) {
    return fetch('/api/ai/layout/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frame, brief: brief }) }).then(unwrap);
  }
  function unwrap(r) {
    return r.text().then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) {}
      if (r.ok) return j;
      var msg = (j && (j.detail || (j.error && j.error.message))) || ('ошибка ' + r.status);
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      var e = new Error(msg); e.status = r.status; throw e;
    });
  }
  function imageSize(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url); };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('не удалось прочитать картинку')); };
      im.src = url;
    });
  }

  window.SOVE_FLOW = { load: load, save: save, stepsBar: stepsBar, planFor: planFor, STEPS: STEPS,
    frameFromMarkup: frameFromMarkup, briefFromAnswers: briefFromAnswers, apiMarkup: apiMarkup, apiAuto: apiAuto,
    imageSize: imageSize, RU: RU };
})();
