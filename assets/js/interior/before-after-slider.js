/* beforeAfterSlider(el, {start, min, max, hint, onDrag}) — шторка «рендер ↔ материалы» первого экрана (ТЗ Материалов, 5.1):
   верх слева — рендер, низ — флэтлей. Разделитель 3 px, ручка 40 px. Старт 46 %, диапазон 10–90 %, палец и мышь.
   Подсказка один раз на браузер: 46 → 60 → 46 % за 1,2 с. Положение — CSS-переменная --pos. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  var HINT = 'sove.mat.sliderHint';
  UI.beforeAfterSlider = function (el, o) {
    o = o || {};
    var min = o.min || 10, max = o.max || 90, pos = o.start || 46, drag = false, moved = false;
    function set(v) { pos = Math.max(min, Math.min(max, v)); el.style.setProperty('--pos', pos + '%'); var k = el.querySelector('.ba__knob'); if (k) k.setAttribute('aria-valuenow', Math.round(pos)); }
    function at(e) { var r = el.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    set(pos);
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, input')) return;
      drag = true; moved = false; el.setPointerCapture(e.pointerId); set(at(e)); el.classList.add('is-drag');
    });
    el.addEventListener('pointermove', function (e) { if (!drag) return; moved = true; set(at(e)); });
    function up() { if (!drag) return; drag = false; el.classList.remove('is-drag'); if (o.onDrag) o.onDrag(pos, moved); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    var knob = el.querySelector('.ba__knob');
    if (knob) knob.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(pos + (e.key === 'ArrowLeft' ? -5 : 5)); if (o.onDrag) o.onDrag(pos, true); }
    });
    var seen = false; try { seen = !!localStorage.getItem(HINT); } catch (x) {}
    if (o.hint !== false && !seen) {
      try { localStorage.setItem(HINT, '1'); } catch (x) {}
      var t0 = null, from = pos;
      setTimeout(function () {
        (function step(now) {
          if (drag) return; if (t0 === null) t0 = now;
          var k = Math.min(1, (now - t0) / 1200), e = Math.sin(k * Math.PI);
          set(from + (60 - from) * e);
          if (k < 1) requestAnimationFrame(step); else set(from);
        })(performance.now());
      }, 500);
    }
    return { set: set, get: function () { return pos; } };
  };
})();
