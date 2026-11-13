/* Полоска «Объект · Интерьер» — закреплена сверху на экранах, где выбирается капсула или интерьер (созвон 28.10.2026):
   «работаешь с этим объектом в этом интерьере». Интерьер — капсула SOVEAPP или своё решение; работа всегда идёт с объектом.
   Подключать после site.js, repair.js и kb/*.js. Квартиру сам не создаёт: нет квартиры — «Объект появится после первого действия».
   Источники: квартира — SOVE.repair.flats.active(); интерьер — R.get().interior, иначе капсула, зафиксированная к квартире
   (flat.capsuleId) или капсула расчёта (SOVE.my.capsuleId) — с пометкой «из расчёта».
   Фиксация: SOVE.my.set({capsuleId}) при активной квартире пишет flat.capsuleId и шлёт window 'sove:my'.
   Перерисовка по 'sove:repair', 'sove:my', 'storage'. Высоту (--ob-h) и отступ под шапкой приложения выставляет сам. */
(function () {
  var S = window.SOVE; if (!S || !S.data) return;
  var D = S.data, F = S.fmt, esc = F.esc;
  var R = S.repair || null;
  var KEY = 'sove.repair.v1', PROTO = 'sove.proto.v1';
  var ID = 'object-bar';

  /* ---------- данные (на страницах без repair.js, например capsules.html, хранилище «Моего ремонта» читаем напрямую, только на чтение) ---------- */
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function activeFlat() {
    if (R) return R.flats.active();
    var st = store(), fl = st.flats || [];
    return fl.filter(function (f) { return f.id === st.active; })[0] || fl[0] || null;
  }
  function interiorOf(f) {
    if (!f) return flowInterior();
    if (R) return R.get(f.id).interior || flowInterior();
    /* без repair.js: список интерьеров квартиры + flat.currentInteriorId (старый формат — одно поле interior) */
    var st = store(), r = (st.repair && st.repair[f.id]) || {};
    return (r.interiors || []).filter(function (x) { return x.id === f.currentInteriorId; })[0] || r.interior || flowInterior();
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
  /* интерьер, выбранный в Планировке и ещё не сохранённый в «Мой ремонт» (sove.demo.flow.v1) — как у полосы Корзина · Избранное · Бюджет */
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

  /* что показываем справа: {img, title, note, href} или null — «Интерьер не выбран» */
  function interior(f) {
    var it = interiorOf(f);
    if (it) {
      var c = it.capsuleId && D.capsule(it.capsuleId), cnt = interiorsCount(f);
      var own = !c, name = it.name || it.style || '';
      /* «К2 · Изумрудная …» и, если интерьеров несколько, «1 из 2» — в подписи (название в одну строку с многоточием, счёт не обрезается) */
      return { img: it.img || it.imageUrl || (c && c.cover) || '', title: c ? c.name : ('Мой интерьер' + (own && name ? ' · ' + name : '')), note: cnt ? cnt.n + ' из ' + cnt.total : '', href: 'interior.html' };
    }
    var cid = (f && f.capsuleId) || myCapsuleId(), c2 = cid && D.capsule(cid);
    if (c2) return { img: c2.cover || '', title: c2.name, note: 'из расчёта', href: 'interior.html' };
    return null;
  }

  /* ---------- разметка ---------- */
  var HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/></svg>';
  /* план прочитан, но ещё не сохранён в объект («Проверь план», вопросы, расстановка): шапка уже про него, а не про прежний план.
     Только показ, данные квартиры не меняются: ушёл не сохранив — шапка прежняя */
  var planPreview = null;
  function shown(f) { return planPreview && f && f.id && R && R.planPatch ? Object.assign({}, f, R.planPatch(f, R.get(f.id).plan, planPreview)) : f; }
  function html() {
    /* объект ведёт на экран объекта (my.html?v=object): данные активной квартиры и переключатель «Мои объекты» (созвон 28.10) */
    var f = shown(activeFlat() || ordersObject()), it = interior(f), objHref = 'my.html?v=object';
    var obj = f
      ? '<a class="ob__obj" href="' + objHref + '" aria-label="Объект: ' + esc(f.name) + '. Открыть объект"><span class="ob__ic">' + HOME + '</span><span class="ob__t"><small>Объект' + (flatLine(f) ? ' · ' + esc(flatLine(f)) : '') + '</small><b>' + esc(f.name) + '</b></span></a>'
      : '<a class="ob__obj" href="' + objHref + '" aria-label="Объекта пока нет. Добавить объект"><span class="ob__ic ob__ic--none">' + HOME + '</span><span class="ob__t"><b class="is-empty is-empty--2">Объект появится после первого действия</b></span></a>';
    var int = it
      ? '<a class="ob__int" href="' + esc(it.href) + '" aria-label="Интерьер: ' + esc(it.title) + '. Открыть"><span class="ob__t ob__t--r"><small>Интерьер' + (it.note ? ' · ' + esc(it.note) : '') + '</small><b>' + esc(it.title) + '</b></span><span class="ob__pic"' + (it.img ? ' style="background-image:url(\'' + esc(it.img) + '\')"' : '') + '></span></a>'
      : '<a class="ob__int" href="sove-ai.html" aria-label="Интерьер не выбран. Выбрать"><span class="ob__t ob__t--r"><small>Интерьер</small><b class="is-empty">Интерьер не выбран</b></span><span class="ob__pic ob__pic--none">✦</span></a>';
    return obj + int;
  }

  var bar = null;
  function mount() {
    if (bar || document.getElementById(ID)) { bar = bar || document.getElementById(ID); return bar; }
    bar = document.createElement('nav'); bar.id = ID; bar.className = 'ob'; bar.setAttribute('aria-label', 'Объект и интерьер, с которыми идёт работа');
    /* под шапкой приложения (#site-header), если она есть; иначе — самым первым в body */
    var host = document.getElementById('site-header');
    if (host && host.parentNode === document.body) host.insertAdjacentElement('afterend', bar);
    else document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-object-bar');
    return bar;
  }
  /* отступ сверху = высота шапки приложения (на экранах со своей шапкой .appbar скрыт — 0); высота полоски — в --ob-h для чужих sticky-блоков */
  function place() {
    if (!bar) return;
    var host = document.getElementById('site-header'), h = host ? Math.round(host.getBoundingClientRect().height) : 0;
    bar.style.top = h + 'px';
    document.documentElement.style.setProperty('--ob-h', Math.round(bar.getBoundingClientRect().height) + 'px');
  }
  function render() { var el = mount(); el.innerHTML = html(); place(); }

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
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY || e.key === PROTO) render(); });
  if (S.onChange) S.onChange(function () { place(); }); /* шапка перерисовалась (вход/выход, генерации) — пересчитать отступ */

  S.objectBar = { render: render, place: place, interior: function () { return interior(activeFlat() || ordersObject()); },
    previewPlan: function (data) { planPreview = data || null; if (bar) render(); } };
})();
