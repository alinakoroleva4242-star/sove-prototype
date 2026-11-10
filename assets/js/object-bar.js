/* Полоска «Квартира · Интерьер» — закреплена сверху на экранах, где выбирается капсула или интерьер (созвон 28.10.2026):
   «работаешь с этой квартирой в этом интерьере». Интерьер — капсула SOVEAPP или своё решение; работа всегда идёт с объектом.
   Подключать после site.js, repair.js и kb/*.js. Квартиру сам не создаёт. Нет ни квартиры, ни интерьера — полоски нет (Вика: пустая полоска непонятна).
   Источники: квартира — SOVE.repair.flats.active(); интерьер — R.get().interior, иначе капсула, зафиксированная к квартире
   (flat.capsuleId) или капсула расчёта (SOVE.my.capsuleId) — с пометкой «из расчёта»; выбор Планировки (flow.interior) — только пока квартиры нет.
   Коды К1–К7 не показываем: имя капсулы короткое, как в Интерьере.
   «Интерьер не выбран» — ссылка с data-cpk-open: на странице с окном выбора капсулы (SOVE.capsulePicker) открывает окно,
   без него ведёт в каталог капсул с возвратом на экран объекта.
   Фиксация: SOVE.my.set({capsuleId}) при активной квартире пишет flat.capsuleId и шлёт window 'sove:my'.
   Перерисовка по 'sove:repair', 'sove:my', 'sove:capsule', 'storage'. Высоту (--ob-h) и отступ под шапкой приложения выставляет сам. */
(function () {
  var S = window.SOVE; if (!S || !S.data) return;
  var D = S.data, F = S.fmt, esc = F.esc;
  var R = S.repair || null;
  var KEY = 'sove.repair.v1', PROTO = 'sove.proto.v1';
  var ID = 'object-bar';
  /* запасной путь «Интерьер не выбран», когда окна выбора капсулы на странице нет: каталог капсул, после выбора — экран объекта */
  var PICK = 'capsules.html?pick=1&returnTo=my.html%3Fv%3Dobject';

  /* ---------- данные (на страницах без repair.js, например capsules.html, хранилище «Моего ремонта» читаем напрямую, только на чтение) ---------- */
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function activeFlat() {
    if (R) return R.flats.active();
    var st = store(), fl = st.flats || [];
    return fl.filter(function (f) { return f.id === st.active; })[0] || fl[0] || null;
  }
  /* интерьер квартиры — только её собственный (паспорт объекта). Выбор Планировки (flow.interior) — одна копия на все квартиры,
     поэтому он в счёт, лишь пока квартиры нет: у новой квартиры без интерьера полоска показывала интерьер другой (проверка 02.11) */
  function interiorOf(f) {
    if (!f || !f.id) return flowInterior();
    if (R) return R.get(f.id).interior || null;
    /* без repair.js: список интерьеров квартиры + flat.currentInteriorId (старый формат — одно поле interior) */
    var st = store(), r = (st.repair && st.repair[f.id]) || {};
    return (r.interiors || []).filter(function (x) { return x.id === f.currentInteriorId; })[0] || r.interior || null;
  }
  /* несколько интерьеров у объекта (созвон 28.10): «1 из 2» — номер текущего в порядке создания; один интерьер — ничего */
  function interiorsCount(f) {
    if (!f || !f.id) return null;
    var list, cid;
    if (R && R.interiors) { list = R.interiors.list(f.id); cid = (list.filter(function (x) { return x.current; })[0] || {}).id; }
    else { var st = store(), r = (st.repair && st.repair[f.id]) || {}; list = r.interiors || []; cid = f.currentInteriorId; }
    var i = list.map(function (x) { return x.id; }).indexOf(cid);
    return list.length > 1 && i >= 0 ? { n: i + 1, total: list.length } : null;
  }
  /* интерьер, выбранный в Планировке, пока квартиры в «Моём ремонте» ещё нет (sove.demo.flow.v1) — как у полосы Корзина · Избранное · Бюджет */
  function flowInterior() {
    try {
      var fl = JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}') || {}, it = fl.interior;
      if (!it) return null;
      if (typeof it === 'string') return { capsuleId: it };
      return { capsuleId: it.capsuleId || it.id || null, name: it.name || it.title || '', img: it.img || it.imageUrl || it.cover || '' };
    } catch (e) { return null; }
  }
  /* объект из анкеты заказов (my.html?demo=1, «+ Добавить объект»), когда квартиры в «Моём ремонте» ещё нет — показываем, но не создаём */
  function ordersObject() {
    try {
      var o = S.orders && S.orders.object && S.orders.object.get();
      if (!o || !(o.complex || o.city || o.area)) return null;
      return { id: null, name: o.name || 'Моя квартира', jk: o.complex || '', city: o.city || '', m2: o.area || null, fromOrders: true };
    } catch (e) { return null; }
  }
  function flatLine(f) {
    if (R && R.flatLine) return R.flatLine(f);
    return [f.jk ? 'ЖК ' + f.jk : '', f.city, f.m2 ? F.area(f.m2) : ''].filter(Boolean).join(' · ');
  }
  function myCapsuleId() { try { return S.my && S.my.get().capsuleId || null; } catch (e) { return null; } }
  /* короткое имя капсулы — как в Интерьере и Планировке (SOVE_KB), без кода; на страницах без базы капсул — имя из data.js */
  function capName(id) { var k = window.SOVE_KB && window.SOVE_KB.capsule && window.SOVE_KB.capsule(id), c = D.capsule(id); return (k && k.name) || (c && c.name) || ''; }
  /* имя интерьера: своё (переименованный) или короткое имя капсулы; свой интерьер — «Мой интерьер · …» без повтора «Мой интерьер · Мой интерьер …» */
  function nameOf(it, c) {
    var nm = String(it.name || '').replace(/^К\d+\s*·\s*/, '');
    if (c) return nm && nm !== c.name ? nm : capName(c.id);
    nm = nm || it.style || '';
    return /^(мой|свой) интерьер/i.test(nm) ? nm : 'Мой интерьер' + (nm ? ' · ' + nm : '');
  }

  /* что показываем справа: {img, title, note, href} или null — «Интерьер не выбран» */
  function interior(f) {
    var it = interiorOf(f);
    if (it) {
      var c = it.capsuleId && D.capsule(it.capsuleId), cnt = interiorsCount(f);
      /* имя — в одну строку с многоточием; если интерьеров несколько, «1 из 2» — в подписи (счёт не обрезается) */
      return { img: it.img || it.imageUrl || (c && c.cover) || '', title: nameOf(it, c), note: cnt ? cnt.n + ' из ' + cnt.total : '', href: 'interior.html' };
    }
    var cid = (f && f.capsuleId) || myCapsuleId(), c2 = cid && D.capsule(cid);
    if (c2) return { img: c2.cover || '', title: capName(c2.id), note: 'из расчёта', href: 'interior.html' };
    return null;
  }

  /* ---------- разметка ---------- */
  var HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/></svg>';
  function html(f, it) {
    /* квартира ведёт на экран объекта (my.html?v=object): данные активной квартиры и переключатель «Мои объекты» (созвон 28.10) */
    var objHref = 'my.html?v=object', line = f ? flatLine(f) : '';
    var obj = f
      ? '<a class="ob__obj" href="' + objHref + '" aria-label="Квартира: ' + esc(f.name) + (line ? ', ' + esc(line) : '') + '. Открыть"><span class="ob__ic">' + HOME + '</span><span class="ob__t"><small>Квартира' + (line ? ' · ' + esc(line) : '') + '</small><b>' + esc(f.name) + '</b></span></a>'
      : '<a class="ob__obj" href="' + objHref + '" aria-label="Квартира не добавлена. Добавить квартиру"><span class="ob__ic ob__ic--none">' + HOME + '</span><span class="ob__t"><small>Квартира</small><b class="is-empty">Не добавлена</b></span></a>';
    var int = it
      ? '<a class="ob__int" href="' + esc(it.href) + '" aria-label="Интерьер: ' + esc(it.title) + (it.note ? ', ' + esc(it.note) : '') + '. Открыть"><span class="ob__t ob__t--r"><small>Интерьер' + (it.note ? ' · ' + esc(it.note) : '') + '</small><b>' + esc(it.title) + '</b></span><span class="ob__pic"' + (it.img ? ' style="background-image:url(\'' + esc(it.img) + '\')"' : '') + '></span></a>'
      : '<a class="ob__int" href="' + PICK + '" data-cpk-open aria-label="Интерьер не выбран. Выбрать интерьер"><span class="ob__t ob__t--r"><small>Интерьер</small><b class="is-empty">Не выбран</b></span><span class="ob__pic ob__pic--none" aria-hidden="true">✦</span></a>';
    return obj + int;
  }

  var bar = null;
  function mount() {
    if (bar || document.getElementById(ID)) { bar = bar || document.getElementById(ID); return bar; }
    bar = document.createElement('nav'); bar.id = ID; bar.className = 'ob'; bar.setAttribute('aria-label', 'Квартира и интерьер, с которыми идёт работа');
    /* под шапкой приложения (#site-header), если она есть; иначе — самым первым в body */
    var host = document.getElementById('site-header');
    if (host && host.parentNode === document.body) host.insertAdjacentElement('afterend', bar);
    else document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }
  /* отступ сверху = высота шапки приложения (на экранах со своей шапкой .appbar скрыт — 0); высота полоски — в --ob-h для чужих sticky-блоков (скрыта — 0) */
  function place() {
    var on = !!(bar && !bar.hidden);
    if (on) { var host = document.getElementById('site-header'), h = host ? Math.round(host.getBoundingClientRect().height) : 0; bar.style.top = h + 'px'; }
    document.documentElement.style.setProperty('--ob-h', (on ? Math.round(bar.getBoundingClientRect().height) : 0) + 'px');
  }
  /* полоска появилась (или пропала) сразу после нажатия — первое ♡ / 🛒 создало квартиру, выбор в окне капсулы: контент под пальцем не сдвигаем,
     прокрутку докручиваем ровно на столько, на сколько уехал #main (браузер, который сам удержал прокрутку, даст 0). Без недавнего нажатия
     (загрузка страницы, другая вкладка) прокрутку не трогаем */
  var gesture = 0;
  ['pointerdown', 'keydown'].forEach(function (t) { document.addEventListener(t, function () { gesture = Date.now(); }, { capture: true, passive: true }); });
  function scrollNow(dy) {
    var de = document.documentElement, sb = de.style.scrollBehavior;
    de.style.scrollBehavior = 'auto';   /* site.css: html { scroll-behavior: smooth } — докрутка должна быть мгновенной */
    window.scrollTo(window.pageXOffset, window.pageYOffset + dy);
    de.style.scrollBehavior = sb;
  }
  function hold(el, top0) { if (!el || !el.isConnected) return; var d = Math.round(el.getBoundingClientRect().top - top0); if (d) scrollNow(d); }
  /* нет ни квартиры, ни интерьера — полоску прячем (и отступы под неё у чужих sticky-блоков); появятся данные — показываем */
  function render() {
    if (!bar) bar = document.getElementById(ID);
    var f = activeFlat() || ordersObject(), it = interior(f), show = !!(f || it), was = !!(bar && !bar.hidden);
    var main = show !== was && Date.now() - gesture < 2000 ? document.getElementById('main') : null, top0 = main ? main.getBoundingClientRect().top : 0;
    if (show) { mount(); bar.hidden = false; bar.innerHTML = html(f, it); }
    else if (bar) { bar.hidden = true; bar.innerHTML = ''; }
    if (document.body) document.body.classList.toggle('has-object-bar', show);
    place();
    if (main) { hold(main, top0); requestAnimationFrame(function () { hold(main, top0); }); }
  }

  /* ---------- фиксация капсулы к объекту: SOVE.my.set({capsuleId}) → flat.capsuleId (квартиру не создаём) + событие 'sove:my' ---------- */
  if (S.my && typeof S.my.set === 'function' && !S.my.set._objectBar) {
    var orig = S.my.set;
    var wrapped = function (patch) {
      var out = orig.apply(S.my, arguments);
      try {
        if (R && patch && Object.prototype.hasOwnProperty.call(patch, 'capsuleId')) {
          var f = R.flats.active(), cid = patch.capsuleId || null;
          if (f && (f.capsuleId || null) !== cid) R.flats.update(f.id, { capsuleId: cid });
        }
      } catch (e) {}
      window.dispatchEvent(new Event('sove:my'));
      return out;
    };
    wrapped._objectBar = true; S.my.set = wrapped;
  }

  /* ---------- запуск и перерисовка ---------- */
  function boot() { render(); setTimeout(place, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', place);
  window.addEventListener('resize', place);
  window.addEventListener('sove:repair', render);
  window.addEventListener('sove:my', render);
  window.addEventListener('sove:capsule', render);   /* выбор в окне капсулы (SOVE.capsulePicker) */
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY || e.key === PROTO) render(); });
  if (S.onChange) S.onChange(function () { place(); }); /* шапка перерисовалась (вход/выход, токены) — пересчитать отступ */

  S.objectBar = { render: render, place: place, interior: function () { return interior(activeFlat() || ordersObject()); }, shown: function () { return !!(bar && !bar.hidden); } };
})();
