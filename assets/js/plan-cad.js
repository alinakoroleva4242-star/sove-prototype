/* «Чертёж» в Планировке — чертёж плана в CADCraft, как третья колонка сравнения для команды 27.10
   («Чертёж — Claude в CADCraft по разметке плана и расстановке», ~/Desktop/чертёж_сравнение).
   Геометрия G — тем же кодом, что 27.10 строил tools/tmp/draw-dump.cjs: SOVE_VOLUMES.fromGeo(geo, { h: 2.8 }) →
   SOVE_DRAW.build(V), масштаб k = V.ppm, всё в метрах с округлением до 0,001; мебель расстановки — в тех же пикселях
   плана, что рамка комнат, делённых на k. Рисует сервер: POST /api/ai/plan/drawing { G } → { png_base64, dxf_base64 }
   (services/api/plan_drawing_cad.py — тот же скрипт CADCraft, что 27.10; нейросетей нет, бесплатно).
   SOVE_CAD.geometry(geo, { furniture, title }) → G (null — в плане нет комнат)
   SOVE_CAD.draw(G) → Promise { png_base64, dxf_base64 } с .abort(); ошибка — e.kind: http | net | timeout | abort | empty, e.status, e.code
   SOVE_CAD.open({ geo, furniture, title, note }) → лист поверх страницы: «Рисую чертёж…» → картинка, «Скачать DXF»,
   «Скачать картинку»; ошибка словами и «Попробовать ещё раз». Без title — «Ваш план · N м²» (сумма площадей комнат чертежа) */
(function () {
  var URL_DRAW = '/api/ai/plan/drawing', TIMEOUT_MS = 60000, SLOW_MS = 15000, WAIT_429_S = 60;
  var PRIDE_TITLE = 'ЖК PRIDE · 47 м² · евро-двушка', TITLE_DEFAULT = 'План квартиры', FILE = 'plan-SOVEAPP';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function box4(b) { return Array.isArray(b) && b.length === 4 && b.every(function (v) { return typeof v === 'number' && isFinite(v); }); }
  function ready() { return !!(window.SOVE_VOLUMES && window.SOVE_DRAW); }
  function area(n) {
    var F = window.SOVE && window.SOVE.fmt;
    return F && F.area ? F.area(n) : (Math.round(n * 10) / 10).toString().replace('.', ',') + ' м²';
  }

  /* стены с картинки плана (рамка demo-flow: walls_2d / doors_2d / windows_2d в пикселях) → вход SOVE_DRAW.build.
     Комната двери — по id рамки (a_id / b_id), без id — ближайшая к двери комната того же типа (вторая сторона — не та же
     комната). В чертёж уходит id комнаты, имя — только запасное, когда id у комнат нет: две спальни с одним названием
     не путаются (разбор 30.10). Стен с картинки нет — null, чертёж как 27.10 */
  function imageOf(geo) {
    var ws = (geo.walls_2d || []).filter(function (w) { return w && box4(w.box); });
    if (!ws.length) return null;
    var hosts = (geo.rooms || []).filter(function (r) { return r && !r.part_of && box4(r.box); });
    function gap(b, p) { var dx = Math.max(b[0] - p[0], 0, p[0] - b[2]), dy = Math.max(b[1] - p[1], 0, p[1] - b[3]); return dx * dx + dy * dy; }
    function roomFor(id, type, at, not) {
      var r = id ? hosts.filter(function (x) { return x.id === id; })[0] : null;
      if (!r && type) r = hosts.filter(function (x) { return x.type === type && x !== not; }).sort(function (p, q) { return gap(p.box, at) - gap(q.box, at); })[0];
      return r || null;
    }
    return { walls: ws.map(function (w) { return w.box; }),
      windows: (geo.windows_2d || []).filter(function (w) { return w && box4(w.box); }).map(function (w) { return { box: w.box, along: w.along }; }),
      doors: (geo.doors_2d || []).filter(function (d) { return d && box4(d.box); }).map(function (d) {
        var at = [(d.box[0] + d.box[2]) / 2, (d.box[1] + d.box[3]) / 2], A = roomFor(d.a_id, d.a, at), B = roomFor(d.b_id, d.b, at, A);
        return { box: d.box, along: d.along, kind: d.kind || 'door', a_id: A ? A.id || null : null, b_id: B ? B.id || null : null,
          a: A ? A.name : null, b: B ? B.name : null };
      }) };
  }

  /* ── G: как draw-dump.cjs 27.10 — те же поля, тот же порядок, то же округление (JSON для PRIDE — байт в байт) ──
     со стенами с картинки плана — стены, окна и двери с неё (imageOf), остальное так же */
  function geometry(geo, o) {
    o = o || {};
    if (!ready() || !geo) return null;
    var V = window.SOVE_VOLUMES.fromGeo(geo, { h: 2.8 }), G = V && window.SOVE_DRAW.build(V, imageOf(geo));
    if (!G) return null;
    var k = V.ppm;
    function m(bx) { return [bx[0] / k, bx[1] / k, bx[2] / k, bx[3] / k].map(r3); }
    return { ppm: k, wall: G.wall, title: o.title || TITLE_DEFAULT, box: G.box.map(r3), walls: G.walls.map(function (w) { return w.map(r3); }),
      rooms: G.rooms.map(function (r) { return { name: r.name, m2: r.m2, rects: r.rects.map(function (q) { return q.map(r3); }), lab: r.lab.map(r3), hh: r3(r.hh), w: r3(r.w), d: r3(r.d) }; }),
      doors: G.doors.map(function (d) { return { kind: d.kind, hinge: d.hinge.map(r3), tip: d.tip.map(r3), end: d.end.map(r3), r: r3(d.r), opening: d.opening.map(r3) }; }),
      windows: G.windows.map(function (w) { return { rect: w.rect.map(r3), alongX: w.alongX }; }),
      furniture: (o.furniture || []).filter(function (f) { return f && box4(f.box); }).map(function (f) { return { label: f.label, box: m(f.box) }; }) };
  }

  /* ── запрос к серверу: fetch с таймаутом 60 с и отменой ── */
  function draw(G) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, done = false, timer = null, fail;
    var p = new Promise(function (ok, no) {
      fail = function (kind, status, code, msg) {
        if (done) return; done = true; clearTimeout(timer);
        var e = new Error(msg || kind); e.kind = kind; e.status = status || 0; e.code = code || ''; no(e);
      };
      timer = setTimeout(function () { fail('timeout'); if (ctl) ctl.abort(); }, TIMEOUT_MS);
      fetch(URL_DRAW, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ G: G }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          return r.text().then(function (t) {
            var j = null; try { j = JSON.parse(t); } catch (e) {}
            if (!r.ok) {
              var d = j && j.detail;
              return fail('http', r.status, String((j && (j.code || (d && d.code))) || ''), typeof d === 'string' ? d : '');
            }
            if (!j || typeof j.png_base64 !== 'string' || typeof j.dxf_base64 !== 'string' || !j.png_base64 || !j.dxf_base64) return fail('empty', r.status);
            if (done) return; done = true; clearTimeout(timer); ok(j);
          });
        })
        .catch(function () { fail('net'); });
    });
    p.abort = function () { fail('abort'); if (ctl) try { ctl.abort(); } catch (e) {} };
    return p;
  }

  /* ошибка словами → { text, retry, wait (с до повтора) }. 404 — маршрута на сервере ещё нет: то же, что «не подключён» */
  function errorOf(e) {
    e = e || {};
    var s = e.status, code = String(e.code || '');
    function R(text, retry, wait) { return { text: text, retry: retry !== false, wait: wait || 0 }; }
    if (e.kind === 'timeout') return R('Сервер не ответил за минуту — попробуй ещё раз.');
    if (e.kind === 'net') return R('Нет связи — проверь интернет и попробуй ещё раз.');
    if (e.kind === 'empty') return R('Сервер прислал пустой чертёж — попробуй ещё раз.');
    if (code === 'cad_unavailable' || s === 404) return R('Чертёж пока не подключён на сервере.', false);
    if (s === 429) return R('Много чертежей подряд — подожди минуту.', true, WAIT_429_S);
    if (code === 'cad_busy') return R('Чертёж сейчас рисуется для другого плана — попробуй через минуту.');
    if (code === 'cad_timeout') return R('Чертёж строился слишком долго — попробуй ещё раз.');
    if (code === 'cad_failed') return R('Программа чертежа не справилась с этим планом — попробуй ещё раз.');
    if (code === 'bad_geometry') return R('План не сложился в чертёж — проверь комнаты и попробуй ещё раз.');
    if (code === 'too_big' || s === 413) return R('План слишком большой для чертежа.', false);
    if (s === 502 || s === 503 || s === 504) return R('Сервер чертежа не отвечает — попробуй через пару минут.');
    return R('Не получилось нарисовать чертёж — попробуй ещё раз.');
  }

  function blobOf(b64, type) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: type });
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  /* последний удачный чертёж: тот же план второй раз не рисуем (и не тратим лимит сервера — 12 чертежей в минуту) */
  var cache = null, sheet = null;

  function open(o) {
    o = o || {};
    if (sheet) sheet.close();
    var furn = (o.furniture || []).length > 0;
    var G = null;
    try { G = geometry(o.geo, { furniture: o.furniture || [], title: o.title || '' }); } catch (err) { G = null; }
    if (G && !o.title) G.title = 'Ваш план · ' + area(G.rooms.reduce(function (a, r) { return a + (+r.m2 || 0); }, 0));
    var key = G ? JSON.stringify(G) : '';
    var sub = (G ? G.title : 'План') + (furn ? ' · с мебелью' : ' · без мебели') + (o.note ? ' · ' + o.note : '');
    var opener = document.activeElement, req = null, tick = null, slow = null, png = null, dxf = null, imgUrl = null;

    var back = document.createElement('div'); back.className = 'pz-sheet-back pz-cad';
    back.innerHTML = '<div class="pz-sheet pz-sheet--cad" role="dialog" aria-modal="true" aria-labelledby="pz-cad-t" aria-describedby="pz-cad-s">' +
      '<i class="pz-sheet__grip"></i>' +
      '<div class="pz-cad__head"><b class="pz-sheet__t" id="pz-cad-t">Чертёж</b>' +
        '<button type="button" class="pz-cad__x" data-cad="close" aria-label="Закрыть чертёж">×</button></div>' +
      '<small class="pz-sheet__s" id="pz-cad-s">' + esc(sub) + '</small>' +
      '<div class="pz-cad__body" aria-live="polite"></div></div>';
    var body = back.querySelector('.pz-cad__body');

    function stopTimers() { if (tick) clearInterval(tick); if (slow) clearTimeout(slow); tick = null; slow = null; }
    function paint(html) { stopTimers(); body.innerHTML = html; }
    function wait() {
      paint('<div class="pz-cad__frame pz-cad__wait" role="status"><b>Рисую чертёж…</b><small id="pz-cad-w">обычно 5–10 секунд</small>' +
        '<div class="pz-prog"><i class="pz-prog__run"></i></div></div>' +
        '<button type="button" class="pz-link" data-cad="close">Отменить</button>');
      slow = setTimeout(function () { var w = body.querySelector('#pz-cad-w'); if (w) w.textContent = 'сложный план — ещё немного, до минуты'; }, SLOW_MS);
    }
    function done() {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      imgUrl = URL.createObjectURL(png);
      paint('<img class="pz-cad__img" src="' + imgUrl + '" alt="Чертёж плана: ' + esc(G.title) + (furn ? ', с мебелью' : '') + '">' +
        '<div class="pz-cad__acts"><button type="button" class="pz-btn" data-cad="dxf">Скачать DXF</button>' +
        '<button type="button" class="pz-btn2" data-cad="png">Скачать картинку</button></div>' +
        '<p class="pz-cad__note">DXF — для AutoCAD и других CAD-программ, размеры в метрах</p>' +
        '<button type="button" class="pz-link" data-cad="close">Закрыть</button>');
    }
    function failed(er) {
      paint('<p class="pz-cad__err" role="alert">' + esc(er.text) + '</p>' +
        (er.retry ? '<button type="button" class="pz-btn" data-cad="retry"' + (er.wait ? ' disabled' : '') + '>' +
          (er.wait ? 'Попробовать через ' + er.wait + ' с' : 'Попробовать ещё раз') + '</button>' : '') +
        '<button type="button" class="pz-link" data-cad="close">Закрыть</button>');
      if (er.retry && er.wait) {
        var left = er.wait;
        tick = setInterval(function () {
          var b = body.querySelector('[data-cad="retry"]'); left--;
          if (!b) return stopTimers();
          if (left <= 0) { stopTimers(); b.disabled = false; b.textContent = 'Попробовать ещё раз'; return; }
          b.textContent = 'Попробовать через ' + left + ' с';
        }, 1000);
      }
    }
    function run() {
      if (!G) return failed({ text: 'В плане не нашлось комнат для чертежа — проверь план.', retry: false });
      if (cache && cache.key === key) { png = cache.png; dxf = cache.dxf; return done(); }
      wait();
      var my = req = draw(G);
      my.then(function (j) {
        if (req !== my) return;
        req = null;
        try { png = blobOf(j.png_base64, 'image/png'); dxf = blobOf(j.dxf_base64, 'application/dxf'); }
        catch (err) { return failed(errorOf({ kind: 'empty' })); }
        cache = { key: key, png: png, dxf: dxf };
        done();
      }, function (e) {
        if (req !== my || (e && e.kind === 'abort')) return;
        req = null; failed(errorOf(e));
      });
    }
    function close() {
      if (!sheet || sheet.el !== back) return;
      sheet = null;
      if (req) { var r = req; req = null; r.abort(); }
      stopTimers();
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      back.remove(); document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus && document.contains(opener)) try { opener.focus(); } catch (e) {}
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    /* «скачано» — на самой кнопке: тост внизу экрана закрывал шапку листа */
    function saved(b, label) {
      b.textContent = '✓ Скачано · ' + label;
      setTimeout(function () { if (b.isConnected) b.textContent = b.getAttribute('data-cad') === 'dxf' ? 'Скачать DXF' : 'Скачать картинку'; }, 2500);
    }

    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-cad]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-cad');
      if (a === 'close') close();
      if (a === 'retry') run();
      if (a === 'dxf' && dxf) { download(dxf, FILE + '.dxf'); saved(b, FILE + '.dxf'); }
      if (a === 'png' && png) { download(png, FILE + '.png'); saved(b, FILE + '.png'); }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    sheet = { el: back, close: close };
    var x = back.querySelector('.pz-cad__x'); if (x) try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
    run();
    return sheet;
  }

  window.SOVE_CAD = { geometry: geometry, draw: draw, open: open, errorOf: errorOf, ready: ready, PRIDE_TITLE: PRIDE_TITLE, URL: URL_DRAW, TIMEOUT_MS: TIMEOUT_MS };
})();
