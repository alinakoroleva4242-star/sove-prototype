/* SOVE AI — окно «Создать» (ТЗ 22.10, п. 1.5): шторка снизу со всеми 6 генерациями по группам.
   Вид — 1:1 из design/sove-ai/etalon-sozdat.html. Подключается на любом экране:
   нужны data.js, site.js, sove-ai-config.js; открыть — SOVE_AI_CREATE.open() или кнопка [data-create]. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, CFG = window.SOVE_AI_CONFIG;
  var IMG = 'assets/img/sove-ai/';
  function planHref() { var f = window.SOVE_FLOW ? window.SOVE_FLOW.load() : {}; return f.step >= 2 ? 'arrange.html?v=panel&flow=1' : 'plan-demo.html'; }
  /* блоки Материалы и Визуализации объединены в Интерьер (design/interior/TZ-interior.md; Алина 25.10): капсула = ДНК + материалы + комнаты.
     «Замена предмета» живёт внутри Комнат — тап по материалу на рендере, отдельной генерации нет */
  var GROUPS = [
    { t: 'ПЛАНИРОВКА', items: [{ g: 'g1', t: 'План → 3D', img: 'g-domik.jpg', href: planHref }] },
    { t: 'ИНТЕРЬЕР', items: [
      { g: 'g4', t: 'Капсула SOVE', img: 'k2-kitchen.jpg', href: function () { return 'interior.html'; } },
      { g: 'g2', t: 'Своя картинка → капсула', img: 'k1-living.jpg', href: function () { return 'interior.html'; } },
      { g: 'g5', t: 'Комнаты · рендеры', img: 'k5.jpg', href: function () { return 'interior.html?tab=rooms'; } }] }
  ];
  function price(g) {
    var p = CFG.GEN_PRICES[g];
    if (p === 0) return 'бесплатно';
    if (p === null || p === undefined) return '[N] токенов';
    return (CFG.fromPrice && CFG.fromPrice[g] ? 'от ' : '') + F.tokens(p) + (CFG.perFrame[g] ? (g === 'g5' ? ' за комнату' : ' за кадр') : '');
  }
  function tokens() { return S.auth.isIn() ? F.tokens(S.tokens.balance()) : F.tokens(CFG.giftTokens) + ' 🎁'; }

  var el = null, prevFocus = null;
  function html() {
    return '<div class="saic__back" data-saic-close></div>' +
      '<div class="saic__sheet" role="dialog" aria-modal="true" aria-labelledby="saic-t">' +
      '<span class="saic__grip"></span>' +
      '<div class="saic__hd"><b id="saic-t">Создать</b><span>' + esc(tokens()) + ' · <a href="tokens.html" data-saic-topup>пополнить</a></span></div>' +
      '<span class="saic__sub">всё сохранится в историю SOVE AI</span>' +
      GROUPS.map(function (gr) {
        return '<div class="saic__g">' + gr.t + '</div><div class="saic__grid">' + gr.items.map(function (it) {
          var free = CFG.GEN_PRICES[it.g] === 0;
          return '<button type="button" class="saic__it" data-saic-go="' + esc(it.href()) + '"><span style="background-image:url(' + IMG + it.img + ')"></span>' +
            '<b>' + esc(it.t) + '</b><small class="' + (free ? 'is-free' : '') + '">' + esc(price(it.g)) + '</small></button>';
        }).join('') + '</div>';
      }).join('') +
      '<button type="button" class="saic__close" data-saic-close>Закрыть</button></div>';
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    if (el) return;
    prevFocus = document.activeElement;
    el = document.createElement('div'); el.className = 'saic'; el.innerHTML = html();
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { if (el) el.classList.add('is-open'); });
    document.addEventListener('keydown', onKey);
    var f = el.querySelector('.saic__it'); if (f) f.focus();
    el.addEventListener('click', function (e) {
      var go = e.target.closest('[data-saic-go]');
      if (go) { var h = go.getAttribute('data-saic-go'); close(); location.href = h; return; }
      if (e.target.closest('[data-saic-topup]') && CFG.topupStub) { e.preventDefault(); S.ui.toast('Пополнение токенов — скоро'); return; }
      if (e.target.closest('[data-saic-close]')) close();
    });
  }
  function close() {
    if (!el) return;
    el.remove(); el = null; document.body.style.overflow = ''; document.removeEventListener('keydown', onKey);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }
  /* любая кнопка [data-create] на любом экране открывает шторку */
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-create]'); if (b) { e.preventDefault(); open(); } });
  window.SOVE_AI_CREATE = { open: open, close: close };
})();
