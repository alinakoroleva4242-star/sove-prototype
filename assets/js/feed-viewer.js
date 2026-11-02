/* Полноэкранный просмотр картинок (лента «Метод ремонта», замечания Тани 29.10): тёмный фон, картинка по центру,
   зум щипком (touch), колесом и двойным тапом, перетаскивание при зуме, листание свайпом и стрелками (и ← → с клавиатуры),
   закрытие крестиком, свайпом вниз и Esc. «Назад» на телефоне тоже закрывает (pushState при открытии).
   Без зависимостей. Стили — assets/css/pages/feed.css (.fv).
   window.SOVE_VIEWER.open([{ src, label }], index) · .close() · .isOpen() */
(function () {
  var MIN = 1, MAX = 5, SWIPE = 60, DOWN = 90, TAP = 320;
  var el, stage, img, cap, prevBtn, nextBtn, closeBtn;
  var list = [], idx = 0, opened = false, pushed = false, backPending = false, lastFocus = null;
  var sc = 1, tx = 0, ty = 0;        /* текущий transform картинки */
  var ptrs = {}, gesture = null, lastTap = 0;
  var X = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function build() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'fv'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Просмотр картинки');
    el.innerHTML =
      '<div class="fv__bar"><span class="fv__cap" aria-live="polite"></span><button type="button" class="fv__close" aria-label="Закрыть">' + X + '</button></div>' +
      '<div class="fv__stage"><img class="fv__img" alt="" draggable="false"></div>' +
      '<button type="button" class="fv__arr fv__arr--prev" aria-label="Предыдущая картинка">' + CHEV + '</button>' +
      '<button type="button" class="fv__arr fv__arr--next" aria-label="Следующая картинка">' + CHEV + '</button>' +
      '<p class="fv__hint">Щипок или колесо — увеличить · свайп — листать · вниз — закрыть</p>';
    document.body.appendChild(el);
    stage = el.querySelector('.fv__stage'); img = el.querySelector('.fv__img'); cap = el.querySelector('.fv__cap');
    prevBtn = el.querySelector('.fv__arr--prev'); nextBtn = el.querySelector('.fv__arr--next'); closeBtn = el.querySelector('.fv__close');
    closeBtn.addEventListener('click', function () { close(); });
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', wheel, { passive: false });
    /* фокус не уходит за пределы окна просмотра */
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [closeBtn, prevBtn, nextBtn].filter(function (b) { return !b.disabled && b.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------- transform ---------- */
  function apply(anim) {
    img.style.transition = anim ? 'transform .22s ease' : 'none';
    img.style.transform = 'translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
    img.setAttribute('data-scale', sc.toFixed(2));
    el.classList.toggle('is-zoomed', sc > 1.01);
  }
  function reset(anim) { sc = 1; tx = 0; ty = 0; el.style.opacity = ''; apply(anim); }
  /* картинку не уводим далеко за край сцены */
  function clamp() {
    var w = img.offsetWidth * sc, h = img.offsetHeight * sc;
    var mx = Math.max(0, (w - stage.clientWidth) / 2), my = Math.max(0, (h - stage.clientHeight) / 2);
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
  }
  /* зум к точке (cx, cy — относительно центра сцены): точка под пальцем/курсором остаётся на месте */
  function zoomTo(s, cx, cy, anim) {
    s = Math.max(MIN, Math.min(MAX, s));
    var k = s / sc; tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; sc = s;
    if (sc <= 1.001) { sc = 1; tx = 0; ty = 0; } else clamp();
    apply(anim);
  }
  function rel(x, y) { var r = stage.getBoundingClientRect(); return { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* ---------- жесты ---------- */
  function down(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { stage.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(ptrs);
    if (keys.length === 1) gesture = { kind: 'drag', x0: e.clientX, y0: e.clientY, tx0: tx, ty0: ty, sc0: sc, t0: Date.now(), moved: false, axis: '' };
    else if (keys.length === 2) {
      var a = ptrs[keys[0]], b = ptrs[keys[1]];
      gesture = { kind: 'pinch', d0: Math.max(1, dist(a, b)), sc0: sc, tx0: tx, ty0: ty, c0: rel((a.x + b.x) / 2, (a.y + b.y) / 2) };
    }
    img.style.transition = 'none';
  }
  function move(e) {
    if (!ptrs[e.pointerId] || !gesture) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(ptrs);
    if (gesture.kind === 'pinch' && keys.length >= 2) {
      var a = ptrs[keys[0]], b = ptrs[keys[1]], c = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
      var s = Math.max(MIN, Math.min(MAX, gesture.sc0 * dist(a, b) / gesture.d0)), k = s / gesture.sc0;
      tx = c.x - (gesture.c0.x - gesture.tx0) * k; ty = c.y - (gesture.c0.y - gesture.ty0) * k; sc = s; clamp(); apply(false);
      return;
    }
    if (gesture.kind !== 'drag') return;
    var dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
    if (!gesture.moved && Math.hypot(dx, dy) > 6) gesture.moved = true;
    if (!gesture.moved) return;
    if (gesture.sc0 > 1.01) { tx = gesture.tx0 + dx; ty = gesture.ty0 + dy; clamp(); apply(false); return; }
    /* без зума: тянем картинку за пальцем — вбок к соседней, вниз к закрытию */
    if (!gesture.axis) gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (gesture.axis === 'x') { tx = dx; ty = 0; }
    else { tx = 0; ty = Math.max(0, dy); el.style.opacity = String(Math.max(0.35, 1 - ty / 420)); }
    apply(false);
  }
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    var keys = Object.keys(ptrs), g = gesture;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (keys.length >= 2) return;
      if (sc < 1.05) reset(true); else { clamp(); apply(true); }
      gesture = keys.length === 1 ? { kind: 'drag', x0: ptrs[keys[0]].x, y0: ptrs[keys[0]].y, tx0: tx, ty0: ty, sc0: sc, t0: Date.now(), moved: true, axis: '' } : null;
      return;
    }
    gesture = null;
    var dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = Date.now();
    if (!g.moved) {
      /* тап: двойной — зум к точке / сброс; одиночный — ничего */
      if (now - lastTap < TAP) { lastTap = 0; var p = rel(e.clientX, e.clientY); zoomTo(sc > 1.01 ? 1 : 2.5, p.x, p.y, true); }
      else lastTap = now;
      return;
    }
    lastTap = 0;
    if (g.sc0 > 1.01) { clamp(); apply(true); return; }
    var fast = now - g.t0 < 250 && Math.abs(dx) > 24;
    if (g.axis === 'x' && (Math.abs(dx) > SWIPE || fast) && Math.abs(dx) > Math.abs(dy)) {
      var d = dx < 0 ? 1 : -1;
      if ((d > 0 && idx < list.length - 1) || (d < 0 && idx > 0)) { step(d); return; }
    }
    if (g.axis === 'y' && dy > DOWN) { close(); return; }
    reset(true);
  }
  function wheel(e) {
    e.preventDefault();
    var p = rel(e.clientX, e.clientY), f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    if (e.ctrlKey) f = e.deltaY < 0 ? 1.08 : 1 / 1.08;   /* щипок на трекпаде приходит как wheel+ctrl */
    zoomTo(sc * f, p.x, p.y, false);
  }
  function key(e) {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === '+' || e.key === '=') { zoomTo(sc * 1.25, 0, 0, true); }
    else if (e.key === '-') { zoomTo(sc / 1.25, 0, 0, true); }
  }

  /* ---------- показ ---------- */
  function show() {
    var it = list[idx] || {};
    reset(false);
    img.src = it.src || ''; img.alt = it.alt || it.label || '';
    cap.textContent = (list.length > 1 ? (idx + 1) + ' из ' + list.length + ' · ' : '') + (it.label || '');
    prevBtn.disabled = idx <= 0; nextBtn.disabled = idx >= list.length - 1;
    el.classList.toggle('fv--one', list.length < 2);
    [idx - 1, idx + 1].forEach(function (i) { if (list[i] && list[i].src) { var pre = new Image(); pre.src = list[i].src; } });
  }
  function step(d) {
    var i = idx + d; if (i < 0 || i >= list.length) return;
    idx = i; show();
    img.classList.remove('is-in'); void img.offsetWidth; img.classList.add('is-in');
  }
  function open(images, i, o) {
    build();
    list = (images || []).filter(function (x) { return x && x.src; }); if (!list.length) return;
    idx = Math.max(0, Math.min(list.length - 1, Number(i) || 0));
    lastFocus = document.activeElement; opened = true; ptrs = {}; gesture = null;
    el.hidden = false; document.documentElement.classList.add('fv-open');
    if (o && o.title) el.setAttribute('aria-label', 'Просмотр: ' + o.title);
    show();
    try { history.pushState({ sv: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    document.addEventListener('keydown', key);
    try { closeBtn.focus({ preventScroll: true }); } catch (e) {}
  }
  function close(fromPop) {
    if (!opened) return;
    opened = false; ptrs = {}; gesture = null;
    el.hidden = true; document.documentElement.classList.remove('fv-open');
    document.removeEventListener('keydown', key);
    reset(false); img.removeAttribute('src');
    if (pushed && !fromPop) { backPending = true; try { history.back(); } catch (e) { backPending = false; } }
    pushed = false;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    lastFocus = null;
  }
  window.addEventListener('popstate', function () {
    if (backPending) { backPending = false; return; }   /* наш же history.back() после закрытия крестиком */
    if (opened) close(true);
  });

  window.SOVE_VIEWER = { open: open, close: close, isOpen: function () { return opened; } };
})();
