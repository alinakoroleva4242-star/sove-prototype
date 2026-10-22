/* Мой ремонт — кабинет по ТЗ Алины 16.10.2026, вид по макету SOVEAPP 20.10.2026 (тёплый стиль — my-warm.css). Экраны по ?v=: главная (объект, готовность, план и факт, разделы),
   new (анкета по одному вопросу), object, visual, budget, basket, orders, order&id=, feed, inspire.
   Данные: SOVE.my (интерьер, расчёт Скаута, товары «В мой ремонт»), SOVE.orders (объект, корзина, заказы по сценариям). */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, O = S.orders, X = S.pext;
  var root = document.getElementById('my-root'); if (!root) return;
  var view = ui.qs('v') || 'home', param = ui.qs('id') || '';
  var PAGE = location.pathname.split('/').pop() || 'my.html'; /* ссылки внутри кабинета — относительно текущей страницы */
  var IC = {
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', img: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="9" cy="9" r="1.5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/>', cart: '<path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', feed: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    up: '<path d="M12 16V5M7 10l5-5 5 5"/><path d="M4 20h16"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    pin: '<path d="M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    crown: '<path d="M3 17l2-10 5 5 2-7 2 7 5-5 2 10zM3 20h18"/>', truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', wallet: '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7a2 2 0 0 1 2-2h11v2"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    chev: '<path d="M9 6l6 6-6 6"/>', chevd: '<path d="M6 9l6 6 6-6"/>', back: '<path d="M15 5l-7 7 7 7"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? f[2] : b === 1 ? f[0] : (b >= 2 && b <= 4) ? f[1] : f[2]; }
  function cnt(n, f) { return n + ' ' + plural(n, f); }
  function go(v, extra) { location.href = PAGE + (v === 'home' ? '' : '?v=' + v + (extra || '')); }
  function href(v, extra) { return PAGE + (v === 'home' ? '' : '?v=' + v + (extra || '')); }
  function tierOf() { var o = O.object.get(); return o && o.tier ? o.tier : null; }
  function tierTag() { var t = tierOf(); return t ? '<span class="tier' + (t === 'premium' ? ' tier--premium' : '') + '">' + (t === 'premium' ? 'Премиум' : 'База') + '</span>' : ''; }
  var SECTIONS_TZ = [ /* ТЗ, раздел 4 */
    { v: 'object', ic: 'home', t: 'Объект', d: function () { return O.object.levelLabel() + ' · файлы и данные квартиры'; }, a: 'Загрузить документ' },
    { v: 'visual', ic: 'img', t: 'Визуал и планировки', d: function () { return 'генерации, рендеры, примерки капсул'; }, a: 'Наложить на план', n: function () { return S.gens.list().length; } },
    { v: 'budget', ic: 'calc', t: 'Бюджет', d: function () { return 'план и факт по разделам'; }, a: 'В корзину' },
    { v: 'basket', ic: 'cart', t: 'Корзина', d: function () { return 'по разделам и поставщикам'; }, a: 'Оформить', n: function () { return O.basket.list().length; } },
    /* плитка заказов говорит, что ждёт решения покупателя: принять расчёт, утвердить КП, подтвердить получение */
    { v: 'orders', ic: 'box', t: 'Заказы и доставка', d: function () { var w = O.list().filter(O.needsBuyer); if (!w.length) return 'статусы, трек, получение, возвраты'; var a = O.buyerAction(w[0]); return w.length + ' ' + plural(w.length, ['ждёт', 'ждут', 'ждут']) + ' вашего решения: ' + (a ? a.label.toLowerCase() : 'откройте заказ'); }, a: function () { return O.list().some(O.needsBuyer) ? 'Решить' : 'Отследить'; }, n: function () { return O.list().filter(O.active).length; } },
    { href: 'chats.html', ic: 'chat', t: 'Чаты', d: function () { return 'поставщики по товарам и заказам'; }, a: 'Написать' },
    { v: 'feed', ic: 'feed', t: 'Лента', d: function () { return 'посты METOD ремонта, акции партнёров'; }, a: 'В корзину из поста' },
    { v: 'inspire', ic: 'heart', t: 'Вдохновение', d: function () { return 'товары, решения, рендеры'; }, a: 'В корзину', n: function () { return S.favs.list().length; } }
  ];

  /* ---------- общие кусочки ---------- */
  function productRow(p, o) {
    o = o || {}; var m = O.mode(), unit = O.priceFor(p, m), qty = o.qty || 1, total = unit * qty, save = m === 'rrp' && p.retail > p.metod ? (p.retail - p.metod) * qty : 0;
    return '<div class="pr-row"><img class="pr-row__pic" src="' + p.img + '" alt="" loading="lazy"><div>' +
      '<div class="row" style="gap:8px"><span class="pr-row__b">' + esc(p.brand === 'на заказ' ? O.supplierOf(p) : p.brand) + '</span>' + (o.tier !== false ? tierTag() : '') + (o.source ? '<span class="pr-row__m">' + esc(o.source) + '</span>' : '') + '</div>' +
      '<a class="pr-row__n" href="product.html?id=' + p.id + '">' + esc(p.name) + '</a>' +
      '<div class="pr-row__p">' + F.rub(total) + (qty > 1 ? '<small>' + qty + ' × ' + F.rub(unit) + '</small>' : '') + (save ? '<i>с METOD −' + F.rub(save) + '</i>' : '') + '</div>' +
      (o.meta ? '<div class="pr-row__m">' + esc(o.meta) + '</div>' : '') + (o.below || '') + '</div>' +
      '<div class="pr-row__right">' + (o.right || '') + '</div></div>';
  }
  function cartBtn(p, source) { var on = O.basket.has(p.id); return '<button type="button" class="btn--cart' + (on ? ' is-on' : '') + '" data-cart="' + p.id + '" data-src="' + esc(source || 'catalog') + '">' + (on ? 'В корзине' : ic('cart', 14) + ' В корзину') + '</button>'; }
  function chatLink(p) { return '<a href="chats.html?kind=partner&partner=' + encodeURIComponent(O.supplierOf(p)) + '&name=' + encodeURIComponent(O.supplierOf(p)) + '">Написать поставщику</a>'; }
  function bindCart(scope) {
    scope.querySelectorAll('[data-cart]').forEach(function (b) { b.addEventListener('click', function () {
      O.basket.add(b.getAttribute('data-cart'), b.getAttribute('data-src'));
      b.classList.add('is-on'); b.textContent = 'Улетело ✓'; setTimeout(function () { b.textContent = 'В корзине'; }, 1200);
      ui.toast('Товар в корзине объекта', 'ok');
    }); });
  }
  function head(title, sub, right) { return '<div class="mw-bar"><button type="button" class="mw-bar__b" data-mw-back aria-label="Назад">' + ic('back', 22) + '</button><h1 class="mw-bar__t">' + esc(title) + '</h1><span class="mw-bar__r">' + S.ui.tokenChip() + (right || '') + '</span></div>' + (sub ? '<p class="text muted mw-sub">' + sub + '</p>' : ''); }
  function homeHead() {
    var wait = O.list().filter(O.needsBuyer).length, inn = S.auth.isIn();
    var u = inn && S.auth.user(), initials = u && u.name ? String(u.name).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('') : '';
    return '<div class="mw-head"><h1 class="mw-head__t">Мой ремонт</h1><div class="mw-head__r">' + S.ui.tokenChip() + '<a class="mw-round" href="chats.html" aria-label="Уведомления">' + ic('bell', 20) + (wait ? '<i class="dot"></i>' : '') + '</a><a class="mw-round' + (initials ? ' mw-round--ava' : '') + '" href="' + (inn ? 'account.html' : 'auth.html?returnTo=' + PAGE) + '" aria-label="' + (inn ? 'Профиль' : 'Войти') + '">' + (initials ? esc(initials) : ic('user', 20)) + '</a></div></div>';
  }
  function pill(o) { var cls = o.status === 'received' || o.status === 'delivered' || o.status === 'installed' || o.status === 'done' || o.status === 'paid' ? 'pill--ok' : o.status === 'return' || o.status === 'cancelled' ? 'pill--bad' : o.status === 'pending_confirmation' ? '' : 'pill--on'; return '<span class="pill ' + cls + '">' + esc(o.statusLabel) + '</span>'; }
  function myProducts() { return S.my.get().productIds.map(function (id) { return D.product(id); }).filter(Boolean); }

  /* ---------- главная (макет 01): готовность кольцом, объект с фото и «Следующий шаг», плитки Объект/Визуал и Бюджет/Корзина/Заказы ---------- */
  function ring(pct) {
    var r = 22, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<svg class="mr-ring" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--mw-track, var(--line))" stroke-width="5"/><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 28 28)"/><text x="28" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">' + pct + '%</text></svg>';
  }
  var ACC = { finish: 'отделку', plumbing: 'сантехнику', light: 'свет', furniture: 'мебель', decor: 'декор', appliances: 'технику', doors: 'двери', other: 'прочее' };
  /* подсказка под «Следующий шаг»: «Выбрать сантехнику · 12 товаров» — первый раздел, которого ещё нет ни в бюджете, ни в корзине, ни в заказах */
  function nextHint(r) {
    if (r.step.view !== 'budget' && r.step.view !== 'orders') return r.step.hint;
    var have = {}; myProducts().forEach(function (p) { have[O.sectionFor(p)] = true; }); O.basket.rows().forEach(function (x) { have[x.section] = true; }); O.list().forEach(function (o) { o.items.forEach(function (it) { have[it.section] = true; }); });
    var next = O.SECTIONS.filter(function (s) { return s.key !== 'other' && !have[s.key]; })[0]; if (!next) return r.step.hint;
    var n = D.products.filter(function (p) { return O.sectionFor(p) === next.key; }).length;
    return 'Выбрать ' + (ACC[next.key] || next.label.toLowerCase()) + (n ? ' · ' + cnt(n, ['товар', 'товара', 'товаров']) : '');
  }
  function viewHome() {
    var m = S.my.get(), c = m.capsuleId && D.capsule(m.capsuleId), ob = O.object.get(), hasObject = !!(ob && (ob.city || ob.area)) || !!m.area, r = O.object.readiness();
    if (!hasObject) {
      return homeHead() + '<div class="my-empty">' + ic('home', 36) + '<span class="my-empty__t">Добавьте квартиру</span><p class="text">Объект — корень кабинета: план, бюджет, корзина и заказы будут привязаны к нему. Анкета — по одному вопросу на экран.</p><a class="btn btn--primary" href="' + href('new') + '">+ Добавить квартиру</a></div>';
    }
    var bask = O.basket.totals(), list = O.list(), active = list.filter(O.active), wait = list.filter(O.needsBuyer), gen = S.gens.list().filter(function (g) { return g.src; })[0];
    var pl = roomsPlan(), sm = X.rooms.summary(pl), lvl = O.object.level();
    var rooms = ob && ob.rooms != null ? (ob.rooms === 0 ? 'Студия' : ob.rooms + '-комнатная') : null, area = (ob && ob.area) || m.area, tier = ob && ob.tier ? (ob.tier === 'premium' ? 'Премиум' : 'База') : null;
    var plan = m.kitMetod || m.total || 0;
    var pic1 = c ? ((c.slides && c.slides[2] && c.slides[2].src) || c.cover) : '', pic2 = gen ? gen.src : (c ? ((c.gallery && c.gallery[1] && c.gallery[1].src) || c.cover) : '');
    var bg = function (src) { return src ? ' style="background-image:url(\'' + src + '\')"' : ''; };
    /* фото объекта — лента кадров капсулы с точками, как на макете */
    var pics = c ? [c.cover].concat((c.slides || []).map(function (x) { return x.src; }), (c.gallery || []).map(function (x) { return x.src; })).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 4) : [];
    var gal = pics.length ? '<div class="mr-obj__gal"><div class="mr-obj__strip" id="obj-strip">' + pics.map(function (src) { return '<img class="mr-obj__pic" src="' + src + '" alt="" loading="lazy">'; }).join('') + '</div>' + (pics.length > 1 ? '<div class="mr-obj__dots" id="obj-dots">' + pics.map(function (x, i) { return '<i' + (i ? '' : ' class="is-on"') + '></i>'; }).join('') + '</div>' : '') + '</div>'
      : '<div class="mr-obj__pic mr-obj__pic--ph">' + ic('home', 34) + '<span>наложите капсулу — появится фото интерьера</span></div>';
    var place = ob && ob.city ? ob.city + (ob.address ? ', ' + ob.address : '') : '';
    return homeHead() +
      '<a class="mr-ready" href="' + href(r.step.view) + '">' + ring(r.percent) + '<div class="grow"><b>Ваш ремонт готов на ' + r.percent + '%</b><span>' + (sm.total ? 'Уже ' + sm.done + ' из ' + sm.total + ' задач выполнено' : esc(r.step.title)) + '</span></div>' + ic('chev', 18) + '</a>' +
      '<div class="mr-obj">' + gal +
        '<div class="mr-obj__body"><div class="row row--between"><b class="mr-obj__t">' + esc(ob && ob.complex ? 'Квартира в ' + ob.complex : 'Квартира') + '</b><a class="mr-obj__gear" href="' + href('object') + '" aria-label="Объект">' + ic('gear', 16) + '</a></div>' +
          '<span class="mr-obj__m">' + [rooms, area ? F.area(area) : null].filter(Boolean).map(esc).join(' · ') + '</span>' +
          (place ? '<span class="mr-obj__m">' + ic('pin', 13) + ' ' + esc(place) + '</span>' : '') +
          '<a class="btn btn--primary btn--block mr-obj__next" href="' + href(r.step.view) + '">Следующий шаг <i>' + ic('arrow', 16) + '</i></a><small class="mr-obj__hint">' + esc(nextHint(r)) + '</small></div></div>' +
      '<div class="mr-tiles2">' +
        '<a class="mr-tile" href="' + href('object') + '"><span class="mr-tile__pic"' + bg(pic1) + '><i class="mr-tile__chip">' + ic('doc', 18) + '</i></span><b>Объект</b><span>План и комнаты</span></a>' +
        '<a class="mr-tile" href="' + href('visual') + '"><span class="mr-tile__pic"' + bg(pic2) + '><i class="mr-tile__chip">' + ic('img', 18) + '</i></span><b>Визуал</b><span>3D и подбор</span></a></div>' +
      '<div class="mr-tiles3">' +
        '<a class="mr-tile mr-tile--s" href="' + href('budget') + '"><span class="mr-tile__ic">' + ic('calc', 22) + '</span><b>Бюджет</b><span>Контроль трат</span></a>' +
        '<a class="mr-tile mr-tile--s" href="' + href('basket') + '"><span class="mr-tile__ic">' + ic('cart', 22) + (bask.count ? '<i>' + bask.count + '</i>' : '') + '</span><b>Корзина</b><span>' + (bask.count ? cnt(bask.count, ['товар', 'товара', 'товаров']) : 'Пока пусто') + '</span></a>' +
        '<a class="mr-tile mr-tile--s" href="' + href('orders') + '"><span class="mr-tile__ic">' + ic('box', 22) + (wait.length ? '<i>' + wait.length + '</i>' : '') + '</span><b>Заказы</b><span>' + (wait.length ? cnt(wait.length, ['ждёт решения', 'ждут решения', 'ждут решения']) : active.length ? cnt(active.length, ['активный', 'активных', 'активных']) : 'Пока нет') + '</span></a></div>';
  }

  /* ---------- анкета объекта: по одному вопросу на экран ---------- */
  function viewNew() {
    var q = { city: '', complex: '', area: '', rooms: null, bathrooms: null, tier: null, capsule: null }, i = 0;
    var STEPS = ['city', 'complex', 'area', 'rooms', 'bathrooms', 'tier', 'capsule'];
    var Q = { city: ['В каком городе квартира?', 'Покажем товары только тех поставщиков, которые доставляют сюда'], complex: ['Жилой комплекс или адрес', 'Можно пропустить — адрес подставится в доставку позже'], area: ['Какая площадь?', 'Общая площадь квартиры в м² — от неё считается бюджет'], rooms: ['Сколько комнат?', 'Без кухни и санузлов'], bathrooms: ['Сколько санузлов?', 'Ванная и туалет вместе считаются одним'], tier: ['Какой уровень бюджета?', 'От этого зависит подбор товаров: «База» или «Премиум»'], capsule: ['Выберите интерьер', 'Капсула — стиль и ДНК проекта. Можно выбрать позже, после загрузки плана'] };
    function can() { var k = STEPS[i]; return k === 'city' ? q.city.trim().length > 1 : k === 'area' ? Number(q.area.replace(',', '.')) > 0 : k === 'rooms' ? q.rooms !== null : k === 'bathrooms' ? q.bathrooms !== null : k === 'tier' ? !!q.tier : true; }
    function finish() {
      O.object.set({ city: q.city.trim(), complex: q.complex.trim() || null, area: Number(q.area.replace(',', '.')), rooms: q.rooms, bathrooms: q.bathrooms, tier: q.tier });
      if (q.capsule) S.my.set({ capsuleId: q.capsule, total: null, works: null, kitMetod: null, kitRetail: null });
      ui.toast('Квартира добавлена', 'ok'); go('home');
    }
    function paintQ() {
      var k = STEPS[i], body = '';
      if (k === 'city') body = '<div class="field"><label for="q-in">Город</label><input class="input" id="q-in" value="' + esc(q.city) + '" placeholder="Город" autofocus></div><div class="q-chips">' + ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Краснодар', 'Сочи'].map(function (c) { return '<button type="button" class="q-chip' + (q.city === c ? ' is-on' : '') + '" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div>';
      else if (k === 'complex') body = '<div class="field"><label for="q-in">ЖК или адрес</label><input class="input" id="q-in" value="' + esc(q.complex) + '" placeholder="напр. ЖК PRIDE, корпус 2" autofocus></div>';
      else if (k === 'area') body = '<div class="field"><label for="q-in">Площадь, м²</label><input class="input" id="q-in" inputmode="decimal" value="' + esc(q.area) + '" placeholder="напр. 47,3" autofocus></div>';
      else if (k === 'rooms') body = '<div class="q-chips">' + [[0, 'Студия'], [1, '1'], [2, '2'], [3, '3'], [4, '4+']].map(function (x) { return '<button type="button" class="q-chip q-big' + (q.rooms === x[0] ? ' is-on' : '') + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      else if (k === 'bathrooms') body = '<div class="q-chips">' + [[1, '1'], [2, '2'], [3, '3+']].map(function (x) { return '<button type="button" class="q-chip q-big' + (q.bathrooms === x[0] ? ' is-on' : '') + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
      else if (k === 'tier') body = '<div class="stack stack--2">' + [['base', 'База', 'Проверенные бренды по разумной цене'], ['premium', 'Премиум', 'Дизайнерские коллекции и редкие материалы']].map(function (x) { return '<button type="button" class="q-opt' + (q.tier === x[0] ? ' is-on' : '') + '" data-v="' + x[0] + '"><span class="grow"><b>' + x[1] + '</b><small>' + x[2] + '</small></span>' + (q.tier === x[0] ? ic('check', 20) : '') + '</button>'; }).join('') + '</div>';
      else body = '<div class="stack stack--2">' + D.capsules.filter(function (c) { return !c.soon; }).map(function (c) { return '<button type="button" class="q-opt' + (q.capsule === c.id ? ' is-on' : '') + '" data-v="' + c.id + '"><img src="' + c.cover + '" alt=""><span class="grow"><b>' + esc(c.code) + ' · ' + esc(c.name) + '</b><small>' + esc(c.style) + ' · от ' + F.rub(c.pricePerM2) + '/м²</small></span></button>'; }).join('') + '</div>';
      root.innerHTML = '<div class="q-top"><span>' + (i ? '← Назад' : 'Мой ремонт') + '</span><span>Шаг ' + (i + 1) + ' из ' + STEPS.length + '</span></div><div class="my-bar"><i style="width:' + Math.round((i + 1) / STEPS.length * 100) + '%"></i></div>' +
        '<h1 class="h1">' + Q[k][0] + '</h1><p class="text muted">' + Q[k][1] + '</p>' + body +
        '<button type="button" class="btn btn--primary btn--block" id="q-next"' + (can() ? '' : ' disabled') + '>' + (k === 'capsule' ? (q.capsule ? 'Создать объект с интерьером' : 'Создать объект') : 'Далее →') + '</button>' +
        (k === 'complex' ? '<button type="button" class="btn btn--link" id="q-skip">Пропустить</button>' : '');
      var inp = root.querySelector('#q-in'); if (inp) { inp.addEventListener('input', function () { q[k] = inp.value; root.querySelector('#q-next').disabled = !can(); }); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && can()) next(); }); }
      root.querySelectorAll('[data-v]').forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-v'); q[k] = (k === 'rooms' || k === 'bathrooms') ? Number(v) : (k === 'capsule' && q.capsule === v ? null : v); paintQ(); }); });
      root.querySelector('.q-top span').addEventListener('click', function () { if (i) { i--; paintQ(); } else history.back(); });
      root.querySelector('#q-next').addEventListener('click', next);
      var sk = root.querySelector('#q-skip'); if (sk) sk.addEventListener('click', function () { q.complex = ''; next(); });
      window.scrollTo(0, 0);
    }
    function next() { if (!can()) return; if (i === STEPS.length - 1) return finish(); i++; paintQ(); }
    paintQ();
  }

  /* ---------- объект ---------- */
  function viewObject() {
    var ob = O.object.get() || {}, m = S.my.get(), c = m.capsuleId && D.capsule(m.capsuleId), nd = O.object.nextDoc(), bk = O.object.budgetKind(), lvl = O.object.level();
    var docs = ob.documents || [];
    root.innerHTML = head('Объект') +
      '<div class="ob-level"><span class="eyebrow">Уровень готовности</span><span class="ob-level__t">' + esc(O.object.levelLabel()) + '</span><div class="my-bar"><i style="width:' + { none: 0, developer_plan: 33, measured_plan: 66, design_project: 100 }[lvl] + '%"></i></div>' +
        '<span class="ob-level__l"><b>Комплектация:</b> ' + bk[0] + '</span><span class="ob-level__l"><b>Работы:</b> ' + bk[1] + '</span>' +
        (nd ? '<button type="button" class="btn btn--primary" data-up="' + nd.kind + '">' + ic('up', 18) + ' Загрузить: ' + O.DOC_LABEL[nd.kind].toLowerCase() + '</button><span class="small" style="color:var(--accent-ink)">' + nd.text + '</span>' : '<span class="small green">Все документы загружены — бюджет комплектации фактический</span>') + '</div>' +
      '<span class="my-sec">Квартира</span><div class="card--my"><div class="row row--between"><span class="h4">' + esc(O.object.title()) + '</span><button type="button" class="btn btn--ghost btn--small" id="ob-edit">Изменить</button></div>' +
        '<div class="ob-facts">' + [['Город', ob.city], ['ЖК / адрес', ob.complex], ['Площадь', (ob.area || m.area) ? F.area(ob.area || m.area) : null], ['Комнаты', ob.rooms === 0 ? 'студия' : ob.rooms], ['Санузлы', ob.bathrooms], ['Бюджет', ob.tier === 'premium' ? 'Премиум' : ob.tier === 'base' ? 'База' : null]].map(function (x) { return '<div class="ob-fact"><small>' + x[0] + '</small>' + (x[1] != null && x[1] !== '' ? '<b>' + esc(x[1]) + '</b>' : '<i>не указано</i>') + '</div>'; }).join('') + '</div>' +
        (!ob.city ? '<span class="small" style="color:#a0392a">Без города расчёт не делается — добавьте его</span>' : '') + '</div>' +
      '<span class="my-sec">Файлы</span>' + O.DOC_KINDS.map(function (k) {
        var list = docs.filter(function (d) { return d.kind === k; });
        return '<div class="card--my"><div class="row row--between"><div><span class="h4">' + O.DOC_LABEL[k] + '</span><div class="small muted">' + (list.length ? list.length + ' файл(ов), последний — текущая версия' : 'не загружен') + '</div></div><button type="button" class="btn btn--ghost btn--small" data-up="' + k + '">' + (list.length ? 'Новая версия' : 'Загрузить') + '</button></div>' +
          list.map(function (d, i) { return '<div class="ob-doc">' + ic('doc', 18) + '<div class="grow">' + esc(d.name) + (i === 0 ? ' · текущая' : '') + '<small>' + F.dateLong(d.ts) + (d.size ? ' · ' + Math.max(1, Math.round(d.size / 1024)) + ' КБ' : '') + '</small></div><button type="button" class="ob-del" data-del="' + d.id + '">Удалить</button></div>'; }).join('') + '</div>';
      }).join('') +
      '<span class="my-sec">Комнаты и этапы</span>' + (function () { var pl = roomsPlan(), sm = X.rooms.summary(pl); return '<a class="mr-row" href="' + href('rooms') + '"><span class="mr-row__ic">' + ic('home', 18) + '</span><div class="grow"><b>Готовность ' + sm.percent + ' % · ' + sm.done + ' из ' + sm.total + ' этапов</b><span>' + pl.map(function (x) { return esc(x.name) + ' ' + x.percent + ' %'; }).join(' · ') + '</span></div><i>›</i></a>'; })() +
      '<span class="my-sec">Интерьер</span><a class="my-obj" href="capsules.html?pick=1&returnTo=' + PAGE + '?v=object">' + (c ? '<img class="my-obj__pic" src="' + c.cover + '" alt="">' : '<span class="my-obj__pic">' + ic('img', 24) + '</span>') + '<div><div class="my-obj__t">' + (c ? esc(c.code + ' · ' + c.name) : 'Интерьер не выбран') + '</div><div class="my-obj__m">' + (c ? 'стиль и ДНК проекта · нажмите, чтобы сменить' : 'наложите капсулу на план — появится плановый бюджет') + '</div></div></a>' +
      '<div class="my-more">' + [['visual', 'Визуал'], ['budget', 'Бюджет'], ['basket', 'Корзина']].map(function (x) { return '<a href="' + href(x[0]) + '">' + x[1] + '</a>'; }).join('') + '</div>' +
      '<input type="file" id="ob-file" accept="image/*,application/pdf" hidden>';
    var kind = null, file = root.querySelector('#ob-file');
    root.querySelectorAll('[data-up]').forEach(function (b) { b.addEventListener('click', function () { kind = b.getAttribute('data-up'); file.click(); }); });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f || !kind) return; O.object.addDoc(kind, f.name, f.size); ui.toast('Файл сохранён: ' + O.DOC_LABEL[kind].toLowerCase(), 'ok'); viewObject(); });
    root.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { ui.confirm({ title: 'Удалить файл?', text: 'Версия будет удалена из объекта.', ok: 'Удалить', onOk: function () { O.object.removeDoc(b.getAttribute('data-del')); viewObject(); } }); }); });
    root.querySelector('#ob-edit').addEventListener('click', editObject);
  }
  function editObject() {
    var ob = O.object.get() || {}, m = S.my.get();
    var f = function (id, label, val, ph) { return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + ph + '"></div>'; };
    var md = ui.modal({ title: 'Данные квартиры', html: f('e-city', 'Город', ob.city, 'Москва') + f('e-complex', 'ЖК или адрес', ob.complex, 'ЖК PRIDE, корпус 2') + f('e-area', 'Площадь, м²', ob.area || m.area, '47,3') + f('e-rooms', 'Комнаты', ob.rooms, '2') + f('e-bath', 'Санузлы', ob.bathrooms, '1') +
      '<div class="field"><label>Тип бюджета</label><div class="q-chips">' + [['base', 'База'], ['premium', 'Премиум']].map(function (x) { return '<button type="button" class="q-chip' + (ob.tier === x[0] ? ' is-on' : '') + '" data-tier="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var el = api.el, g = function (id) { return el.querySelector('#' + id).value.trim(); }, on = el.querySelector('.q-chip.is-on');
        O.object.set({ city: g('e-city') || null, complex: g('e-complex') || null, area: Number(g('e-area').replace(',', '.')) || null, rooms: g('e-rooms') === '' ? null : Number(g('e-rooms')), bathrooms: g('e-bath') === '' ? null : Number(g('e-bath')), tier: on ? on.getAttribute('data-tier') : ob.tier || null });
        api.close(); viewObject(); ui.toast('Сохранено', 'ok');
      } }, { label: 'Отмена', kind: 'link' }] });
    md.el.querySelectorAll('[data-tier]').forEach(function (b) { b.addEventListener('click', function () { md.el.querySelectorAll('[data-tier]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
  }

  /* ---------- визуал и планировки ---------- */
  function viewVisual() {
    var m = S.my.get(), gens = S.gens.list(), sc = S.scout.requests();
    var cards = gens.map(function (g) {
      var items = (g.result && g.result.items) || [], sum = items.reduce(function (s, it) { var p = D.product(it.id || it); return s + (p ? O.priceFor(p) : 0); }, 0);
      return '<div class="gen-card">' + (g.src ? '<img src="' + g.src + '" alt="">' : '<span class="gen-card__ph"></span>') + '<div><div class="gen-card__k">' + (g.kind === 'render' ? 'Рендер' : g.kind === 'photo' ? 'Поиск по фото' : esc(g.kind || 'Генерация')) + '</div><div class="gen-card__t">' + esc(g.title || 'Генерация') + '</div><div class="gen-card__m">' + F.dateLong(g.ts) + (items.length ? ' · ' + cnt(items.length, ['товар', 'товара', 'товаров']) : '') + '</div></div><div class="stack stack--2"><b class="num">' + (sum ? F.rub(sum) : '—') + '</b><a class="arrow-link" href="generation.html?id=' + g.id + '">Открыть</a></div></div>';
    }).join('');
    var scouts = sc.map(function (r) { var res = r.result || {}; return '<div class="gen-card"><span class="gen-card__ph"></span><div><div class="gen-card__k">Расчёт Скаут · ' + (r.params && r.params.area ? F.area(r.params.area) : '') + '</div><div class="gen-card__t">Бюджет ремонта с наполнением</div><div class="gen-card__m">' + F.dateLong(r.ts) + ' · ' + esc(S.scout.basisLabel(r.basis)) + '</div></div><div class="stack stack--2"><b class="num">' + (res.total ? F.rub(res.total) : '—') + '</b><a class="arrow-link" href="' + href('budget') + '">Бюджет</a></div></div>'; }).join('');
    root.innerHTML = head('Визуал и планировки', 'Каждая визуализация сохраняется в объекте и сразу получает свой бюджет — список позиций с ценами.') +
      '<div class="row"><a class="btn btn--primary" href="fit.html' + (m.capsuleId ? '?capsule=' + m.capsuleId : '') + '">Наложить капсулу на план</a><a class="btn btn--ghost" href="scout.html' + (m.capsuleId ? '?capsule=' + m.capsuleId : '') + '">Посчитать бюджет</a></div>' +
      '<div class="row"><a class="arrow-link" href="arrange.html">Расстановка мебели</a><a class="arrow-link" href="plan.html">Планировка в интерьере</a><a class="arrow-link" href="ai.html">Поиск по фото</a></div>' +
      (cards || scouts ? '<div class="stack stack--2">' + cards + scouts + '</div>' : '<div class="my-empty">' + ic('img', 32) + '<p class="text">Пока нет визуализаций — наложите капсулу на план или посчитайте бюджет в Скауте</p></div>');
  }

  /* ---------- бюджет (макет 02): план и факт двумя карточками, по категориям с прогрессом, популярные товары ---------- */
  function viewBudget() {
    var m = S.my.get(), prods = myProducts(), mode = O.mode(), bySec = O.basket.bySection(mode), orders = O.list(), ordSec = {};
    var MAIN = ['finish', 'plumbing', 'light', 'furniture', 'decor']; /* пять строк макета — всегда, остальные разделы — когда в них что-то есть */
    orders.forEach(function (o) { if (o.status === 'cancelled' || o.status === 'return') return; o.items.forEach(function (it) { ordSec[it.section] = (ordSec[it.section] || 0) + it.lineTotal; }); });
    var secs = O.SECTIONS.map(function (s) { var items = prods.filter(function (p) { return O.sectionFor(p) === s.key; }); var plan = items.reduce(function (sum, p) { return sum + O.priceFor(p, mode); }, 0); var fact = (bySec[s.key] || 0) + (ordSec[s.key] || 0); return Object.assign({ items: items, plan: plan, fact: fact }, s); }).filter(function (s) { return MAIN.indexOf(s.key) >= 0 || s.items.length || s.fact; });
    var picked = secs.reduce(function (s, x) { return s + x.plan; }, 0), planTotal = m.kitMetod || m.total || picked, factTotal = secs.reduce(function (s, x) { return s + x.fact; }, 0); /* план — расчёт Скаута, пока его нет — сумма выбранных позиций */
    var used = planTotal ? Math.min(100, Math.round(factTotal / planTotal * 100)) : 0, left = Math.max(0, planTotal - factTotal);
    var popular = D.products.filter(function (p) { return p.discount >= 15 && p.img && !S.my.hasProduct(p.id); }).slice(0, 2);
    var bar = head('Бюджет', null, '<span class="mw-pill">RUB ' + ic('chevd', 12) + '</span>');
    if (!prods.length && !planTotal && !factTotal) { root.innerHTML = bar + '<div class="my-empty">' + ic('calc', 32) + '<p class="text">Бюджет появится после расчёта: посчитайте в Скауте или добавьте товары из каталога кнопкой «В мой ремонт»</p><div class="row"><a class="btn btn--primary" href="scout.html">В Скаут</a><a class="btn btn--ghost" href="market.html">В каталог</a></div></div>'; return; }
    root.innerHTML = bar +
      '<div class="mr-bud2"><div class="mr-bud"><small>Плановый бюджет</small><b>' + F.rub(planTotal) + '</b><div class="my-bar my-bar--thin"><i style="width:' + used + '%"></i></div><span>Использовано ' + used + '%</span><span class="mr-bud__v">' + F.rub(factTotal) + '</span></div>' +
        '<div class="mr-bud"><small>Фактический бюджет</small><b>' + (factTotal ? F.rub(factTotal) : '—') + '</b><div class="my-bar my-bar--thin"><i style="width:' + (100 - used) + '%"></i></div><span>Осталось <em class="mr-bud__pct">' + (100 - used) + '%</em></span><span class="mr-bud__v">' + F.rub(left) + '</span></div></div>' +
      (secs.length ? '<div class="mr-sech"><span class="my-sec">По категориям</span><button type="button" class="arrow-link" id="bd-all">См. все</button></div>' + secs.map(function (s) {
        var pct = s.plan ? Math.min(100, Math.round(s.fact / s.plan * 100)) : 0, pic = (s.items[0] || D.products.filter(function (p) { return p.img && O.sectionFor(p) === s.key; })[0] || {}).img;
        return '<div class="mr-cat"><button type="button" class="mr-cat__h" data-open="' + s.key + '"><span class="mr-cat__pic">' + (pic ? '<img src="' + pic + '" alt="">' : ic('box', 18)) + '</span><div class="grow"><b>' + s.label + '</b><span><em class="mr-cat__f">' + F.rub(s.fact) + '</em> / ' + F.rub(s.plan) + '</span><div class="my-bar my-bar--thin"><i style="width:' + pct + '%"></i></div></div><b class="mr-cat__pct">' + pct + '%</b></button>' +
          '<div class="mr-cat__b" id="bd-' + s.key + '" hidden>' + (s.items.length ? '<div class="row"><button type="button" class="btn--cart" data-cart-all="' + s.key + '">Весь раздел в корзину</button></div>' : '<p class="small muted">Позиции не выбраны — факт сложился из корзины и заказов.</p>') +
          s.items.map(function (p) { return productRow(p, { right: cartBtn(p, 'budget'), below: '<div class="links">' + chatLink(p) + '<button type="button" data-rm="' + p.id + '">Убрать</button></div>', meta: p.leadTime }); }).join('') + '</div></div>';
      }).join('') : '') +
      (popular.length ? '<div class="mr-sech"><span class="my-sec">Популярные товары</span><a class="arrow-link" href="market.html">См. все</a></div><div class="mr-pop">' + popular.map(function (p) { return '<div class="mr-pop__c"><button type="button" class="mr-pop__fav' + (S.favs.has(p.id) ? ' is-on' : '') + '" data-fav="' + p.id + '" aria-label="В избранное">' + ic('heart', 14) + '</button><a href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="" loading="lazy"></a><b>' + esc(p.name) + '</b><span>' + esc(p.brand === 'на заказ' ? O.supplierOf(p) : p.brand) + '</span><strong>' + F.rub(O.priceFor(p, mode)) + '</strong>' + cartBtn(p, 'budget') + '</div>'; }).join('') + '</div>' : '');
    root.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { var el = root.querySelector('#bd-' + b.getAttribute('data-open')); el.hidden = !el.hidden; b.closest('.mr-cat').classList.toggle('is-open', !el.hidden); }); });
    var all = root.querySelector('#bd-all'); if (all) all.addEventListener('click', function () { var open = root.querySelectorAll('.mr-cat__b:not([hidden])').length < secs.length; root.querySelectorAll('.mr-cat__b').forEach(function (el) { el.hidden = !open; el.closest('.mr-cat').classList.toggle('is-open', open); }); all.textContent = open ? 'Свернуть' : 'См. все'; });
    root.querySelectorAll('[data-cart-all]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-cart-all'); prods.filter(function (p) { return O.sectionFor(p) === k; }).forEach(function (p) { O.basket.add(p.id, 'budget'); }); ui.toast('Раздел в корзине', 'ok'); viewBudget(); }); });
    root.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { S.my.removeProduct(b.getAttribute('data-rm')); viewBudget(); }); });
    root.querySelectorAll('[data-fav]').forEach(function (b) { b.addEventListener('click', function () { var on = S.favs.toggle(b.getAttribute('data-fav')); b.classList.toggle('is-on', on); ui.toast(on ? 'В избранном' : 'Убрали из избранного'); }); });
    bindCart(root);
  }

  /* ---------- корзина (макет 03): по поставщикам или категориям, галочка на поставщике и на позиции, выгода, итого ---------- */
  function viewBasket() {
    var mode = O.mode(), groups = O.basket.groups(mode), t = O.basket.totals(mode), by = ui.qs('g') || 'brand';
    if (!groups.length) { root.innerHTML = head('Корзина') + '<div class="my-empty">' + ic('cart', 32) + '<p class="text">Корзина пуста — перенесите позиции из бюджета, генерации или ленты</p><a class="btn btn--primary" href="' + href('budget') + '">В бюджет</a></div>'; return; }
    var address = O.object.title();
    var shown = by === 'section'
      ? O.SECTIONS.map(function (s) { var rows = O.basket.rows().filter(function (r) { return r.section === s.key; }); return { title: s.label, rows: rows, total: rows.reduce(function (a, r) { return a + O.priceFor(r.product, mode) * r.qty; }, 0) }; }).filter(function (g) { return g.rows.length; })
      : groups.map(function (g) { return { title: g.brand, rows: g.rows, total: g.total, scenarioLabel: g.scenarioLabel, steps: g.steps, brand: g.brand }; });
    function row(r) {
      var p = r.product, unit = O.priceFor(p, mode);
      return '<div class="mr-ci' + (r.payLater ? ' is-later' : '') + '"><label class="mr-chk"><input type="checkbox" data-later="' + r.id + '"' + (r.payLater ? '' : ' checked') + ' aria-label="Оплатить сейчас"><i>' + ic('check', 12) + '</i></label>' +
        '<img class="mr-ci__pic" src="' + p.img + '" alt="" loading="lazy"><div class="mr-ci__b"><a href="product.html?id=' + p.id + '">' + esc(p.name) + '</a><span>' + esc(p.brand === 'на заказ' ? O.supplierOf(p) : p.brand) + '</span><strong>' + F.rub(unit * r.qty) + (r.qty > 1 ? ' <small>' + r.qty + ' × ' + F.rub(unit) + '</small>' : '') + '</strong></div>' +
        '<div class="mr-ci__r"><span class="qty"><button type="button" data-q="' + r.id + '" data-d="-1" aria-label="Меньше">−</button><b>' + r.qty + '</b><button type="button" data-q="' + r.id + '" data-d="1" aria-label="Больше">+</button></span><button type="button" class="mr-ci__rm" data-rm="' + r.id + '" aria-label="Убрать">' + ic('trash', 16) + '</button></div></div>';
    }
    root.innerHTML = head('Корзина', null, '<button type="button" class="mw-bar__b" id="bk-more" aria-label="Ещё">' + ic('dots', 20) + '</button>') +
      '<div class="mr-seg"><a class="' + (by === 'brand' ? 'is-on' : '') + '" href="' + href('basket') + '">По поставщикам</a><a class="' + (by === 'section' ? 'is-on' : '') + '" href="' + href('basket', '&g=section') + '">По категориям</a></div>' +
      shown.map(function (g, i) {
        var allNow = g.rows.every(function (r) { return !r.payLater; });
        return '<div class="mr-grp"><div class="mr-grp__h"><label class="mr-chk"><input type="checkbox" data-gall="' + i + '"' + (allNow ? ' checked' : '') + ' aria-label="Оплатить всё: ' + esc(g.title) + '"><i>' + ic('check', 12) + '</i></label><button type="button" class="mr-grp__t" data-g="' + i + '"><b>' + esc(g.title) + '</b><small>' + cnt(g.rows.length, ['товар', 'товара', 'товаров']) + '</small>' + ic('chevd', 16) + '</button></div>' + (g.brand ? zoneLine(g.brand) : '') + '<div class="mr-grp__b" id="grp-' + i + '">' + g.rows.map(row).join('') + '</div></div>';
      }).join('') +
      (t.rrp > t.metod ? '<a class="mr-gain mr-gain--flat" href="metod.html">' + ic('crown', 18) + '<div class="grow"><b>Ваша выгода с подпиской SOVEAPP</b><span>Закрытые цены поставщиков <i class="mr-info" aria-label="Цены по подписке ниже розничных">i</i></span></div><b class="mr-gain__v">− ' + F.rub(t.rrp - t.metod) + '</b></a>' : '') +
      '<div class="mr-total"><div><span>Итого<small>' + cnt(t.count, ['товар', 'товара', 'товаров']) + (t.later ? ' · отложено ' + F.rub(t.later) : '') + '</small></span></div><b>' + F.rub(t.payNow) + (mode === 'metod' && t.rrp > t.metod ? '<s>' + F.rub(t.rrp) + '</s>' : '') + '</b></div>' +
      '<button type="button" class="btn btn--primary btn--lg btn--block" id="bk-place"' + (t.payNow ? '' : ' disabled') + '>Оформить заказ ' + ic('arrow', 16) + '</button>';
    root.querySelectorAll('[data-g]').forEach(function (b) { b.addEventListener('click', function () { var el = root.querySelector('#grp-' + b.getAttribute('data-g')); el.hidden = !el.hidden; b.classList.toggle('is-closed', el.hidden); }); });
    root.querySelectorAll('[data-gall]').forEach(function (cb) { cb.addEventListener('change', function () { var g = shown[Number(cb.getAttribute('data-gall'))]; g.rows.forEach(function (r) { if (r.payLater === cb.checked) O.basket.togglePayLater(r.id); }); viewBasket(); }); });
    root.querySelectorAll('[data-q]').forEach(function (b) { b.addEventListener('click', function () { var r = O.basket.list().filter(function (x) { return x.id === b.getAttribute('data-q'); })[0]; if (r) { O.basket.setQty(r.id, r.qty + Number(b.getAttribute('data-d'))); viewBasket(); } }); });
    root.querySelectorAll('[data-later]').forEach(function (b) { b.addEventListener('change', function () { O.basket.togglePayLater(b.getAttribute('data-later')); viewBasket(); }); });
    root.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { O.basket.remove(b.getAttribute('data-rm')); viewBasket(); }); });
    root.querySelector('#bk-more').addEventListener('click', function () {
      ui.modal({ title: 'Корзина', text: cnt(t.count, ['товар', 'товара', 'товаров']) + ' у ' + cnt(groups.length, ['поставщика', 'поставщиков', 'поставщиков']) + '. Каждый поставщик станет отдельным заказом.',
        actions: [{ label: 'Очистить корзину', kind: 'ghost', onClick: function () { O.basket.clear(); ui.toast('Корзина очищена'); viewBasket(); } }, { label: 'В бюджет', kind: 'link', href: href('budget') }] });
    });
    root.querySelector('#bk-place').addEventListener('click', function () {
      if (!S.auth.isIn()) { ui.needAuth('Войдите, чтобы оформить заказ', PAGE + '?v=basket'); return; }
      var created = O.place(address, mode);
      ui.toast(cnt(created.length, ['заказ отправлен', 'заказа отправлены', 'заказов отправлены']) + ' поставщикам', 'ok');
      go('orders', '&created=' + created.length);
    });
  }

  /* зона доставки поставщика под шапкой группы корзины: «доставляет / не доставляет в ваш город» */
  function zoneLine(brand) { var l = S.pext && S.pext.delivery ? S.pext.delivery.line(brand) : ''; return l ? '<div class="small muted" style="padding:0 14px 10px;display:flex;gap:6px;align-items:center">' + ic('truck', 14) + '<span>Доставка: ' + l + '</span></div>' : ''; }

  /* ---------- заказы: строки товар · поставщик · дата · сумма · статус ---------- */
  function orderRow(o) {
    var f = o.items[0] || {}, cur = o.timeline.filter(function (t) { return t.current; })[0], need = O.needsBuyer(o);
    return '<a class="mr-ord' + (need ? ' is-need' : '') + '" href="' + href('order', '&id=' + o.id) + '"><span class="mr-ord__pic">' + (f.img ? '<img src="' + f.img + '" alt="" loading="lazy">' : ic('box', 20)) + '</span>' +
      '<span class="mr-ord__b"><b>' + esc(f.name || 'Заказ') + (o.items.length > 1 ? ' <small>и ещё ' + (o.items.length - 1) + '</small>' : '') + '</b><span>' + esc(o.brand) + ' · ' + F.dateLong(o.ts) + '</span>' + (need && cur ? '<em>' + esc(cur.buyer || 'нужно ваше решение') + '</em>' : '') + '</span>' +
      '<span class="mr-ord__r"><b>' + F.rub(o.total) + '</b>' + pill(o) + '</span></a>';
  }
  function viewOrders() {
    var list = O.list(), filter = ui.qs('f') || 'active', created = ui.qs('created');
    var groups = { need: list.filter(O.needsBuyer), active: list.filter(O.active), all: list }, shown = groups[filter] || groups.active;
    root.innerHTML = head('Заказы') +
      (created ? '<div class="notice notice--ok"><span class="small">' + created + ' ' + plural(Number(created), ['заказ отправлен', 'заказа отправлены', 'заказов отправлены']) + ' поставщикам на подтверждение наличия, цены и срока</span></div>' : '') +
      '<div class="mr-filt">' + [['need', 'Ждут вас'], ['active', 'Активные'], ['all', 'Все']].map(function (x) { return '<a class="' + (filter === x[0] ? 'is-on' : '') + '" href="' + href('orders', '&f=' + x[0]) + '">' + x[1] + '<i>' + groups[x[0]].length + '</i></a>'; }).join('') + '</div>' +
      (shown.length ? '<div class="stack stack--2">' + shown.map(orderRow).join('') + '</div>' : '<div class="my-empty">' + ic('box', 32) + '<p class="text">' + (list.length ? 'В этом списке заказов нет' : 'Заказов пока нет — оформите корзину') + '</p>' + (list.length ? '' : '<a class="btn btn--primary" href="' + href('basket') + '">В корзину</a>') + '</div>');
  }

  /* ---------- карточка заказа (макет 04): поставщик, пять вех, статус с действиями, возврат, оплата в SOVEAPP ---------- */
  /* пять вех на полосе — одинаковые для всех сценариев; точные шаги сценария остаются в «Все шаги и история» */
  var PH = [ { label: 'Ожидает подтверждения', st: ['pending_confirmation'] }, { label: 'Подтверждён', st: ['confirmed', 'spec_sent', 'spec_accepted', 'measurement_scheduled'] }, { label: 'Оплачен', st: ['paid'] }, { label: 'В доставке', st: ['assembling', 'in_production', 'shipped', 'in_transit', 'delivered', 'installed'] }, { label: 'Получен', st: ['received'] } ];
  function stepsHtml(o) {
    var idx = -1; PH.forEach(function (p, i) { if (p.st.indexOf(o.status) >= 0) idx = i; });
    var n = PH.length, cur = Math.max(0, idx), fin = o.status === 'received';
    return '<div class="mw-steps"><span class="mw-steps__line"></span><span class="mw-steps__fill" style="width:' + ((100 - 100 / n) * cur / (n - 1)).toFixed(2) + '%"></span>' + PH.map(function (p, i) {
      var h = o.history.filter(function (x) { return (x.status && p.st.indexOf(x.status) >= 0) || (i === 0 && x.action === 'created'); })[0];
      var done = i < idx || (fin && i === idx), curr = i === idx && !fin;
      return '<div class="mw-step' + (done ? ' is-done' : '') + (curr ? ' is-cur' : '') + '"><i>' + (done ? ic('check', 11) : i + 1) + '</i><b>' + p.label + '</b><small>' + (h ? F.dateLong(h.at) : '') + '</small></div>';
    }).join('') + '</div>';
  }
  /* номер заказа как на макете — пятизначный, из id */
  function onum(o) { var h = parseInt(String(o.id).replace(/^o-/, ''), 16); if (isNaN(h)) { h = 0; for (var i = 0; i < o.id.length; i++) h = (h * 31 + o.id.charCodeAt(i)) >>> 0; } return 10000 + (h % 90000); }
  function phaseOf(o) { var r = null; PH.forEach(function (p) { if (p.st.indexOf(o.status) >= 0) r = p; }); return r; }
  function viewOrder() {
    O.syncPayments(); var o = O.get(param);
    if (!o) { root.innerHTML = head('Заказ') + '<div class="my-empty"><p class="text">Заказ не найден</p><a class="btn btn--ghost" href="' + href('orders') + '">К заказам</a></div>'; return; }
    var acts = o.actions.buyer, main = acts.filter(function (a) { return a.status !== 'cancelled' && a.status !== 'return'; })[0], other = acts.filter(function (a) { return a !== main; }), cur = o.timeline.filter(function (t) { return t.current; })[0];
    var fields = Object.keys(o.fields).filter(function (k) { return o.fields[k]; }), f0 = o.items[0] || {};
    var canPay = !C_paid(o) && stepIdx(o, 'paid') === stepIdx(o, o.status) + 1 && !/^(return|cancelled)$/.test(o.status);
    var steps = o.timeline.filter(function (t) { return !t.skipped; }), ci = -1; steps.forEach(function (t, i) { if (t.current) ci = i; });
    var bad = /^(return|cancelled)$/.test(o.status), paid = C_paid(o), moving = /deliver|transit|ship/.test(o.status), passedPay = !paid && stepIdx(o, o.status) > stepIdx(o, 'paid'); /* шаг оплаты пройден без платежа — пока оплата не подключена */
    var delivery = o.fields.deliveryMethod ? o.fields.deliveryMethod : (O.single ? 'Доставка поставщика' : o.scenarioLabel);
    var zl = S.pext && S.pext.delivery ? S.pext.delivery.label(o.brand) : ''; if (zl) delivery += ' · зона: ' + zl;
    var chat = 'chats.html?kind=partner&partner=' + encodeURIComponent(o.brand) + '&name=' + encodeURIComponent(o.brand);
    var prepay = o.payment.prepaymentPct != null && o.payment.prepaymentPct > 0 && o.payment.prepaymentPct < 100 ? ' · предоплата ' + o.payment.prepaymentPct + ' %, остаток после «' + esc(O.statusLabel(o.scenario, o.payment.balanceAt)) + '»' : '';
    var ph = phaseOf(o);
    root.innerHTML = head('Заказ №' + onum(o), null, '<button type="button" class="mw-bar__b" id="o-more" aria-label="Ещё">' + ic('dots', 20) + '</button>') +
      '<div class="mr-sup"><button type="button" class="mr-sup__h" id="o-items"><span class="mr-sup__pic">' + (f0.img ? '<img src="' + f0.img + '" alt="">' : ic('box', 20)) + '</span><span class="mr-sup__b"><b>' + esc(o.brand) + '</b><span>' + cnt(o.items.length, ['товар', 'товара', 'товаров']) + ' · ' + F.rub(o.total) + '</span><span>' + esc(delivery) + '</span>' + (o.fields.eta ? '<strong>' + esc(o.fields.eta) + '</strong>' : '') + '</span>' + ic('chev', 18) + '</button>' +
        '<div class="mr-sup__items" id="o-items-b" hidden>' + o.items.map(function (it) { var p = D.product(it.productId); return productRow(p || { id: null, name: it.name, brand: it.brand, img: it.img, metod: it.unitPrice, retail: it.unitPrice }, { qty: it.qty, tier: false }); }).join('') + '<div class="mr-total mr-total--in"><div><span>Итого<small>цена зафиксирована при оформлении</small></span></div><b>' + F.rub(o.total) + '</b></div></div></div>' +
      (bad ? '<div class="mr-status mr-status--bad"><div class="mr-status__row"><span class="mr-status__ic">!</span><div><b>' + esc(o.statusLabel) + '</b><span>' + esc((o.history.filter(function (h) { return h.status === o.status; }).pop() || {}).reason || '') + '</span></div></div></div>' : stepsHtml(o)) +
      (main ? '<button type="button" class="btn btn--primary btn--lg btn--block" data-act="' + main.status + '">' + esc(main.label) + ' ✓</button>' : '') +
      (canPay ? '<button type="button" class="btn btn--dark btn--block" id="o-pay">Оплатить ' + (o.payment.prepaymentPct && o.payment.prepaymentPct < 100 ? 'предоплату ' + o.payment.prepaymentPct + ' % · ' : '') + F.rub(o.prepayment) + '</button>' : '') +
      (main && main.status === 'spec_accepted' ? '<div class="spec-box"><b>Проверьте условия перед принятием</b>' + (o.fields.finalPrice ? '<span>Итоговая цена: ' + F.rub(Number(o.fields.finalPrice)) + '</span>' : '') + (o.fields.quantity ? '<span>Количество: ' + esc(o.fields.quantity) + (o.fields.packs ? ' · упаковок: ' + esc(o.fields.packs) : '') + '</span>' : '') + (o.fields.specNote ? '<span>Спецификация: ' + esc(o.fields.specNote) + '</span>' : '') + (o.fields.eta ? '<span>Срок: ' + esc(o.fields.eta) + '</span>' : '') + '<span class="line--f">После принятия цена и состав фиксируются; дальше — оплата.</span></div>' : '') +
      (bad ? '' : '<div class="mr-status"><div class="mr-status__row"><span class="mr-status__ic">' + ic(moving ? 'truck' : 'box', 18) + '</span><div><b>' + esc(ph && moving ? ph.label : cur ? cur.label : o.statusLabel) + '</b><span>' + (o.fields.eta ? (moving ? 'Прибудет ' : 'Срок: ') + esc(o.fields.eta) : cur && cur.buyer ? esc(cur.buyer) : 'Шаг ' + (ci + 1) + ' из ' + steps.length + (ci >= 0 && steps[ci + 1] ? ' · дальше: ' + esc(steps[ci + 1].label) : '')) + '</span></div><button type="button" class="mw-chev" id="o-hist" aria-label="Все шаги и история">' + ic('chev', 18) + '</button></div>' +
        (o.fields.tracking ? '<button type="button" class="mw-soft" id="o-track">' + ic('truck', 16) + ' Отследить доставку</button>' : '') + '<a class="mw-soft" href="' + chat + '">' + ic('chat', 16) + ' Чат с продавцом</a></div>') +
      '<button type="button" class="mr-row" id="o-support"><span class="mr-row__ic">' + ic('shield', 18) + '</span><div class="grow"><b>Возврат и поддержка</b><span>Обмен, возврат, гарантия</span></div><i>›</i></button>' +
      '<div class="mr-sech"><span class="my-sec">Оплата в SOVEAPP</span><span class="mw-safe">' + ic('lock', 12) + ' Безопасный платёж</span></div>' +
      '<div class="mr-pay mr-pay--card" id="o-paycard" role="button" tabindex="0"><span class="mr-pay__ic">' + ic('wallet', 18) + '</span><div class="grow"><b>' + (paid ? 'Оплачено ' + F.rub(o.prepayment) : canPay ? 'К оплате ' + F.rub(o.prepayment) : passedPay ? 'Оплата вне SOVEAPP' : 'Оплата после подтверждения') + '</b><span>' + (paid ? 'Средства защищены на номинальном счёте SOVEAPP' : passedPay ? 'Шаг оплаты подключится с интеграцией платежей' : esc(moneyNote(o))) + prepay + '</span></div>' + ic('chev', 18) + '</div>' +
      '<div class="mr-pay mr-pay--soft"><span class="mr-pay__ic">' + ic('shield', 18) + '</span><div class="grow"><b>Ваш платёж под защитой</b><span>Мы работаем через номинальный счёт. Деньги поступают продавцу только после получения товаров.</span></div></div>' +
      (o.status === 'received' && !o.review ? '<div class="card--my" id="o-review"><span class="h4">Отзыв о товаре и поставщике</span><span class="line">Товар</span><div class="stars" data-s="p">' + stars() + '</div><span class="line">Поставщик: сроки, доставка, общение</span><div class="stars" data-s="s">' + stars() + '</div><textarea class="input" id="o-rtext" rows="2" placeholder="Пара слов (необязательно)"></textarea><button type="button" class="btn btn--primary" id="o-rsend" disabled>Отправить отзыв</button></div>' : '') +
      (o.review ? '<div class="card--my"><span class="h4">Ваш отзыв</span><span class="line">Товар ' + '★'.repeat(o.review.productRating) + ' · Поставщик ' + '★'.repeat(o.review.supplierRating) + '</span>' + (o.review.text ? '<span class="line">' + esc(o.review.text) + '</span>' : '') + (o.review.reply ? '<span class="line" style="color:var(--accent-ink)">Ответ поставщика: ' + esc(o.review.reply) + '</span>' : '') + '</div>' : '');
    /* всё, чего нет на макете, — за «···»: документы, детали от поставщика, шаги и история, все заказы */
    var histHtml = '<div class="tl">' + o.timeline.map(function (t) { return '<div class="tl__r' + (t.done ? ' is-done' : '') + (t.current ? ' is-cur' : '') + (t.skipped ? ' is-skip' : '') + '"><span class="tl__d"></span><div><div class="tl__l">' + esc(t.label) + (t.skipped ? ' · подключится с оплатой' : t.optional && !t.done && !t.current ? ' · по ситуации' : '') + '</div><div class="tl__w">' + esc(t.buyer) + '</div></div></div>'; }).join('') + '</div><div class="stack stack--2" style="margin-top:8px">' + o.history.map(function (h) { return '<span class="hist">' + new Date(h.at).toLocaleString('ru-RU') + ' · ' + (h.actor === 'buyer' ? 'вы' : h.actor === 'supplier' ? 'поставщик' : 'система') + ' · ' + esc(h.status ? O.statusLabel(o.scenario, h.status) : h.action) + (h.reason ? ' · ' + esc(h.reason) : '') + (h.note ? ' · ' + esc(h.note) : '') + '</span>'; }).join('') + '</div>';
    function histModal() { ui.modal({ title: 'Все шаги и история', html: histHtml, actions: [{ label: 'Закрыть', kind: 'link' }] }); }
    function detailsModal() { ui.modal({ title: 'Детали от поставщика', html: '<div class="stack stack--1">' + fields.map(function (k) { return '<span class="line">' + esc(o.fieldLabels[k] || k) + ': ' + (k === 'finalPrice' ? F.rub(Number(o.fields[k])) : esc(o.fields[k])) + '</span>'; }).join('') + '</div>', actions: [{ label: 'Закрыть', kind: 'link' }] }); }
    function moreSheet() {
      ui.modal({ title: 'Заказ №' + onum(o), text: 'Счёт и чек появятся после оплаты через SOVEAPP.', actions: [
        { label: 'Подтверждение заказа · печать или PDF', kind: 'ghost', href: href('doc', '&id=' + o.id + '&kind=confirmation') },
        o.fields.specNote || o.fields.finalPrice ? { label: 'Спецификация (КП)', kind: 'ghost', href: href('doc', '&id=' + o.id + '&kind=spec') } : null,
        fields.length ? { label: 'Детали от поставщика', kind: 'ghost', close: false, onClick: function (ev, api) { api.close(); detailsModal(); } } : null,
        { label: 'Все шаги и история', kind: 'ghost', close: false, onClick: function (ev, api) { api.close(); histModal(); } },
        { label: 'Все заказы', kind: 'link', href: href('orders') } ].filter(Boolean) });
    }
    var ib = root.querySelector('#o-items'); ib.addEventListener('click', function () { var el = root.querySelector('#o-items-b'); el.hidden = !el.hidden; ib.classList.toggle('is-open', !el.hidden); });
    root.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { try { O.setStatus(o.id, b.getAttribute('data-act'), 'buyer'); ui.toast('Готово', 'ok'); viewOrder(); } catch (e) { ui.toast(e.message, 'error'); } }); });
    function supportModal() {
      if (!other.length) { location.href = 'chats.html?kind=support'; return; }
      ui.modal({ title: 'Возврат и поддержка', text: 'Возврат — после доставки, с причиной; отмена — до оплаты. Решение по возврату принимает поставщик, спор разбирает SOVEAPP.',
        actions: other.map(function (a) { return { label: a.status === 'cancelled' ? 'Отменить заказ' : a.label, kind: a.status === 'cancelled' ? 'ghost' : 'primary', onClick: function () { if (a.needsReason) reasonSheet(o, a.status); else { try { O.setStatus(o.id, a.status, 'buyer'); ui.toast('Готово', 'ok'); viewOrder(); } catch (e) { ui.toast(e.message, 'error'); } } } }; }).concat([{ label: 'Написать в поддержку SOVEAPP', kind: 'link', href: 'chats.html?kind=support' }]) });
    }
    var sup = root.querySelector('#o-support'); if (sup) sup.addEventListener('click', supportModal);
    root.querySelector('#o-more').addEventListener('click', moreSheet);
    function payNow() { if (!S.auth.isIn()) return ui.needAuth('Войдите, чтобы оплатить', PAGE + '?v=order&id=' + o.id); var pm = O.payFor(o.id); location.href = 'pay.html?id=' + pm.id; }
    var pay = root.querySelector('#o-pay'); if (pay) pay.addEventListener('click', payNow);
    root.querySelector('#o-paycard').addEventListener('click', function () { if (canPay) payNow(); else histModal(); });
    var hb = root.querySelector('#o-hist'); if (hb) hb.addEventListener('click', histModal);
    var tr = root.querySelector('#o-track'); if (tr) tr.addEventListener('click', function () { ui.modal({ title: 'Доставка', text: (o.fields.carrier ? esc(o.fields.carrier) + ' · ' : '') + 'трек ' + esc(o.fields.tracking) + (o.fields.eta ? ' · срок: ' + esc(o.fields.eta) : ''), actions: [{ label: 'Скопировать трек', kind: 'primary', onClick: function () { try { navigator.clipboard.writeText(o.fields.tracking); ui.toast('Трек скопирован', 'ok'); } catch (e) {} } }, { label: 'Закрыть', kind: 'link' }] }); });
    var rv = root.querySelector('#o-review'); if (rv) {
      var vals = { p: 0, s: 0 };
      rv.querySelectorAll('.stars').forEach(function (st) { st.querySelectorAll('button').forEach(function (b, i) { b.addEventListener('click', function () { vals[st.getAttribute('data-s')] = i + 1; st.querySelectorAll('button').forEach(function (x, j) { x.classList.toggle('is-on', j <= i); }); rv.querySelector('#o-rsend').disabled = !(vals.p && vals.s); }); }); });
      rv.querySelector('#o-rsend').addEventListener('click', function () { O.review(o.id, vals.p, vals.s, rv.querySelector('#o-rtext').value.trim()); ui.toast('Спасибо за отзыв', 'ok'); viewOrder(); });
    }
  }
  function stars() { var s = ''; for (var i = 1; i <= 5; i++) s += '<button type="button" aria-label="' + i + ' из 5">★</button>'; return s; }

  /* ---------- комнаты и этапы (референс «Проект / помещения») ---------- */
  function roomItems() {
    var items = O.basket.list().map(function (b) { var p = D.product(b.productId); return { section: b.section || X.rooms.sectionOf(p), room: p && p.room }; });
    O.list().forEach(function (o) { if (o.status === 'cancelled') return; o.items.forEach(function (it) { items.push({ section: it.section || X.rooms.sectionOf(D.product(it.productId)) }); }); });
    return items;
  }
  function roomsPlan() { return X.rooms.plan(O.object.get(), roomItems()); }
  function viewRooms() {
    var plan = roomsPlan(), sum = X.rooms.summary(plan);
    root.innerHTML = head('Комнаты и этапы', esc(O.object.title()) + ' · готовность ' + sum.percent + ' % · ' + sum.done + ' из ' + sum.total + ' ' + plural(sum.total, ['этапа', 'этапов', 'этапов'])) +
      '<p class="small muted">Выберите комнату, чтобы подобрать товары. Общие позиции (плитка, краска, свет) засчитываются всем комнатам, где они нужны.</p>' +
      plan.map(function (r) { return '<div class="card--my mr-room"><div class="row row--between"><span class="h4">' + esc(r.name) + '</span><b class="mr-room__p">' + r.percent + ' %</b></div><div class="my-bar"><i style="width:' + r.percent + '%"></i></div>' +
        '<span class="line">' + (r.covered.length ? r.covered.map(X.rooms.sectionLabel).join(' · ') : 'пока ничего не подобрано') + '</span>' + (r.missing.length ? '<span class="line--f">Осталось: ' + r.missing.map(function (k) { return X.rooms.sectionLabel(k).toLowerCase(); }).join(', ') + '</span>' : '') +
        (r.capsule ? '<span class="line" style="color:var(--accent-ink)">Капсула: ' + esc(r.capsule) + '</span>' : '') +
        '<div class="row"><a class="btn btn--primary btn--small" href="' + href('budget') + '">Подобрать</a><a class="btn btn--ghost btn--small" href="capsules.html?pick=1&returnTo=' + encodeURIComponent(PAGE + '?v=rooms&room=' + r.key) + '">' + (r.capsule ? 'Сменить капсулу' : 'Применить капсулу') + '</a></div></div>'; }).join('') +
      '<p class="small muted">Состав комнат берётся из объекта: число комнат и санузлов меняется на экране объекта («Изменить»).</p><a class="arrow-link" href="' + href('object') + '">К объекту</a>';
  }

  /* ---------- документы к заказу: подтверждение и спецификация, печать в PDF ---------- */
  function viewDoc() {
    var o = O.get(param), kind = ui.qs('kind') || 'confirmation';
    if (!o) { root.innerHTML = head('Документ') + '<div class="my-empty"><p class="text">Заказ не найден</p></div>'; return; }
    var spec = kind === 'spec', title = spec ? 'Спецификация (КП)' : 'Подтверждение заказа', num = o.id.replace(/^o-/, ''), fp = Number(o.fields.finalPrice) || null;
    root.innerHTML = head(title, null, '<button type="button" class="btn btn--ghost btn--small" id="doc-print">Печать / PDF</button>') +
      '<div class="mr-doc"><span class="mr-doc__brand">SOVEAPP</span><b class="mr-doc__t">' + title + ' № ' + esc(num) + '</b><span class="small muted">от ' + F.dateLong(o.ts) + ' · ' + esc(o.scenarioLabel || '') + '</span><span class="line" style="color:var(--accent-ink)">Статус: ' + esc(o.statusLabel) + '</span>' +
      '<div class="mr-doc__parties"><div><small>Покупатель</small><b>' + esc(o.address || 'объект без адреса') + '</b></div><div><small>Поставщик</small><b>' + esc(o.brand) + '</b>' + (o.fields.deliveryMethod ? '<span>доставка: ' + esc(o.fields.deliveryMethod) + '</span>' : '') + '</div></div>' +
      (spec ? '<b class="mr-doc__h">Смета по статьям</b>' + (o.fields.specNote ? '<span class="line">' + esc(o.fields.specNote) + '</span>' : '<span class="line--f">Поставщик ещё не прислал спецификацию.</span>') + (fp ? '<div class="mr-doc__row mr-doc__row--t"><span>Итого по КП</span><b>' + F.rub(fp) + '</b></div>' : '') + (o.fields.eta ? '<span class="line">Срок: ' + esc(o.fields.eta) + '</span>' : '')
        : '<b class="mr-doc__h">Состав заказа</b><div class="mr-doc__table">' + o.items.map(function (it) { return '<div class="mr-doc__row"><div><b>' + esc(it.name) + '</b><small>' + esc(it.brand || o.brand) + '</small></div><span>' + it.qty + ' × ' + F.rub(it.unitPrice) + ' = ' + F.rub(it.lineTotal) + '</span></div>'; }).join('') + '<div class="mr-doc__row mr-doc__row--t"><span>Итого</span><b>' + F.rub(fp || o.total) + '</b></div></div>' +
          '<b class="mr-doc__h">Оплата</b><span class="line">Оплата через SOVEAPP' + (o.payment.prepaymentPct != null && o.payment.prepaymentPct > 0 && o.payment.prepaymentPct < 100 ? ': предоплата ' + o.payment.prepaymentPct + ' %, остаток после «' + esc(O.statusLabel(o.scenario, o.payment.balanceAt)) + '»' : o.payment.prepaymentPct === 100 ? ': 100 % после подтверждения поставщиком' : '') + '.' + (o.payment.note ? ' ' + esc(o.payment.note) : '') + '</span>' +
          '<b class="mr-doc__h">История</b>' + o.history.slice().reverse().map(function (h) { return '<span class="hist">' + new Date(h.at).toLocaleString('ru-RU') + ' · ' + esc(h.status ? O.statusLabel(o.scenario, h.status) : h.action === 'created' ? 'Заказ оформлен' : h.action) + (h.reason ? ' · ' + esc(h.reason) : '') + '</span>'; }).join('')) +
      '<span class="line--f">Сформировано в SOVEAPP ' + F.dateLong(Date.now()) + ' · заказ ' + esc(o.id) + '. Счёт и чек появятся после оплаты.</span></div>' +
      '<a class="arrow-link" href="' + href('order', '&id=' + o.id) + '">К заказу</a>';
    root.querySelector('#doc-print').addEventListener('click', function () { window.print(); });
  }
  function stepIdx(o, status) { var steps = O.scenario(o.scenario).steps; for (var i = 0; i < steps.length; i++) if (steps[i].status === status) return i; return -1; }
  function C_paid(o) { return o.history.some(function (h) { return h.status === 'paid'; }); }
  function moneyNote(o) { if (C_paid(o)) return o.status === 'received' ? 'Выплата поставщику по условиям оферты' : 'Деньги на мультисчёте'; if (o.status === 'return') return 'Возврат: с мультисчёта — платформа, после выплаты — поставщик'; if (o.status === 'cancelled') return 'Если оплачен — возврат покупателю'; return 'Оплата появится после подтверждения поставщиком'; }
  function reasonSheet(o, status) {
    var REASONS = ['Повреждение', 'Несоответствие описанию', 'Комплектация', 'Просрочка', 'Отказ от товара', 'Гарантийный случай'], chosen = '';
    var md = ui.modal({ title: status === 'return' ? 'Причина возврата' : 'Причина отмены', html: '<div class="q-chips">' + REASONS.map(function (r) { return '<button type="button" class="q-chip" data-r="' + r + '">' + r + '</button>'; }).join('') + '</div>',
      actions: [{ label: 'Отправить поставщику', kind: 'primary', close: false, onClick: function (ev, api) { if (!chosen) return; try { O.setStatus(o.id, status, 'buyer', { reason: chosen }); api.close(); viewOrder(); } catch (e) { ui.toast(e.message, 'error'); } } }, { label: 'Отмена', kind: 'link' }] });
    md.el.querySelectorAll('[data-r]').forEach(function (b) { b.addEventListener('click', function () { chosen = b.getAttribute('data-r'); md.el.querySelectorAll('[data-r]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
  }

  /* ---------- лента ---------- */
  function viewFeed() {
    var sec = ui.qs('s') || 'all', promo = Object.keys(D.promo || {}).map(function (id) { return D.product(id); }).filter(Boolean);
    var deals = D.products.filter(function (p) { return p.discount >= 15 && (sec === 'all' || O.sectionFor(p) === sec); }).slice(0, S.metod.active() ? 12 : 4);
    root.innerHTML = head('Лента') + '<div class="chips">' + [{ key: 'all', label: 'Все' }].concat(O.SECTIONS.filter(function (s) { return s.key !== 'other'; })).map(function (s) { return '<a class="q-chip' + (sec === s.key ? ' is-on' : '') + '" href="' + href('feed', '&s=' + s.key) + '">' + s.label + '</a>'; }).join('') + '</div>' +
      '<span class="my-sec">Посты METOD ремонта</span><div class="post-empty"><span>Посты закрытого канала появятся здесь автоматически после подключения канала: фото, текст, бренд и товары с кнопкой «В корзину».</span>' + (S.metod.active() ? '' : '<a class="btn btn--dark btn--small" href="metod.html" style="align-self:flex-start">Лента полностью — с подпиской METOD</a>') + '</div>' +
      (promo.length ? '<span class="my-sec">Акции партнёров</span>' + promo.map(function (p) { return '<div class="my-promo"><img class="my-promo__pic" src="' + p.img + '" alt=""><div class="grow"><div class="my-row__t">' + esc(p.brand) + '</div><div class="my-row__m">' + esc(p.name) + ' · −' + p.discount + ' %' + (D.promo[p.id].until ? ' · до ' + esc(D.promo[p.id].until) : '') + '</div></div><span class="my-ad">Реклама</span>' + cartBtn(p, 'feed') + '</div>'; }).join('') : '') +
      '<span class="my-sec">Товары со скидкой</span>' + (deals.length ? deals.map(function (p) { return '<div class="card--my">' + productRow(p, { right: '<button type="button" class="ob-del" data-fav="' + p.id + '" aria-label="В избранное">' + (S.favs.has(p.id) ? '♥' : '♡') + '</button>' + cartBtn(p, 'feed'), meta: p.leadTime }) + '</div>'; }).join('') : '<p class="small muted">В этом разделе пока нет акций</p>') +
      (!S.metod.active() ? '<a class="btn btn--dark" href="metod.html">Ещё товары со скидкой — с подпиской METOD</a>' : '');
    root.querySelectorAll('[data-fav]').forEach(function (b) { b.addEventListener('click', function () { var on = S.favs.toggle(b.getAttribute('data-fav')); b.textContent = on ? '♥' : '♡'; ui.toast(on ? 'В избранном' : 'Убрали из избранного'); }); });
    bindCart(root);
  }

  /* ---------- вдохновение ---------- */
  function viewInspire() {
    var tab = ui.qs('t') || 'products', favs = S.favs.list().map(function (id) { return D.product(id); }).filter(Boolean), gens = S.gens.list().filter(function (g) { return g.kind === 'render' || g.src; });
    root.innerHTML = head('Вдохновение') + '<div class="tabs--my">' + [['products', 'Товары · ' + favs.length], ['solutions', 'Решения'], ['renders', 'Рендеры · ' + gens.length]].map(function (x) { return '<button type="button" class="' + (tab === x[0] ? 'is-on' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (tab === 'products' ? (favs.length ? favs.map(function (p) { return '<div class="card--my">' + productRow(p, { right: cartBtn(p, 'inspire'), below: '<div class="links">' + chatLink(p) + '</div>', meta: p.leadTime }) + '</div>'; }).join('') : '<div class="my-empty">' + ic('heart', 32) + '<p class="text">Сердечко на товаре, посте или рендере — и он окажется здесь</p><a class="btn btn--primary" href="market.html">В каталог</a></div>')
      : tab === 'solutions' ? '<div class="my-empty"><p class="text">Решения — это посты ленты целиком с кнопкой «Все товары в корзину». Появятся после подключения канала METOD ремонта.</p></div>'
      : (gens.length ? gens.map(function (g) { return '<a class="gen-card" href="generation.html?id=' + g.id + '">' + (g.src ? '<img src="' + g.src + '" alt="">' : '<span class="gen-card__ph"></span>') + '<div><div class="gen-card__t">' + esc(g.title || 'Рендер') + '</div><div class="gen-card__m">' + F.dateLong(g.ts) + '</div><span class="arrow-link">Открыть бюджет</span></div></a>'; }).join('') : '<div class="my-empty">' + ic('img', 32) + '<p class="text">Сохранённых рендеров пока нет — сделайте визуализацию в SOVEAPP AI</p><a class="btn btn--primary" href="ai.html">В SOVEAPP AI</a></div>'));
    root.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { location.href = href('inspire', '&t=' + b.getAttribute('data-t')); }); });
    bindCart(root);
  }

  /* вернулись из выбора интерьера */
  (function pickedCapsule() { var q = (ui.qs('capsule') || '').toLowerCase(), c = q && D.capsule(q), rk = ui.qs('room'); if (c && !c.soon) { if (rk) { X.rooms.setCapsule(rk, c.code + ' · ' + c.name); if (!S.my.get().capsuleId) S.my.set({ capsuleId: q, total: null, works: null, kitMetod: null, kitRetail: null }); } else S.my.set({ capsuleId: q, total: null, works: null, kitMetod: null, kitRetail: null }); try { history.replaceState(null, '', PAGE + (view !== 'home' ? '?v=' + view : '')); } catch (e) {} setTimeout(function () { ui.toast(rk ? 'Капсула ' + c.code + ' применена к комнате' : 'Интерьер ' + c.code + ' выбран', 'ok'); }, 200); } })();
  /* ?demo=1 — учебные данные для показа команде (один раз, пока квартиры нет): квартира, капсула, бюджет, корзина, заказ в доставке и заказ на подтверждении */
  function seedDemo() {
    var ob = O.object.get();
    if (!S.auth.isIn()) S.auth.login('+79990000777'); /* демо-ссылка работает и после «Выйти» — иначе «Профиль» уведёт на вход */
    if (!(ob && ob.city)) seedDemoData();
    /* зоны доставки демо-поставщиков (модуль partner-extra): поставщик заказа в доставке возит в город покупателя, остальные — нет; видно в корзине и заказе */
    var DL = S.pext && S.pext.delivery; if (!DL) return;
    var brands = []; O.list().forEach(function (o) { if (brands.indexOf(o.brand) < 0) brands.push(o.brand); }); O.basket.groups().forEach(function (g) { if (brands.indexOf(g.brand) < 0) brands.push(g.brand); });
    var moving = (O.list().filter(function (o) { return o.status === 'in_transit'; })[0] || {}).brand;
    brands.forEach(function (b, i) { if (DL.get(b)) return; DL.set(b, b === moving || (!moving && i === 0) ? { zones: ['moscow', 'mo', 'pickup'], other: '', note: '' } : { zones: ['spb', 'lo'], other: 'Казань', note: '' }); });
  }
  function seedDemoData() {
    if (!S.auth.isIn()) S.auth.login('+79990000777');
    O.object.set({ city: 'Москва', address: 'ул. Лобачевского, 118', complex: 'ЖК Событие', area: 78, rooms: 3, bathrooms: 2, tier: 'premium' });
    O.object.addDoc('developer_plan', 'plan-sobytie.pdf', 240000);
    S.my.set({ capsuleId: 'k1', total: 2500000, kitMetod: 2500000, kitRetail: 2900000, works: 1200000 });
    if (!S.metod.active()) S.metod.activate(1);
    var pick = function (key, n) { return D.products.filter(function (p) { return p.img && O.sectionFor(p) === key; }).slice(0, n); };
    [].concat(pick('finish', 2), pick('plumbing', 2), pick('light', 2), pick('furniture', 4), pick('decor', 1)).forEach(function (p) { S.my.addProduct(p.id); });
    var byBrand = {}; D.products.forEach(function (p) { if (p.img && p.brand !== 'на заказ') (byBrand[p.brand] = byBrand[p.brand] || []).push(p); });
    var brands = Object.keys(byBrand).filter(function (b) { return byBrand[b].length >= 3; }).slice(0, 2), first = byBrand[brands[0]].slice(0, 3), second = brands[1] ? byBrand[brands[1]].slice(0, 2) : [];
    var st = function (id, status, actor, opts) { try { O.setStatus(id, status, actor, opts); } catch (e) { O.setStatus(id, status, 'system', opts); } };
    first.forEach(function (p) { O.basket.add(p.id, 'budget'); });
    var o1 = O.place(O.object.title(), 'metod')[0];
    if (o1) { st(o1.id, 'confirmed', 'supplier', { fields: { deliveryMethod: 'Складская доставка', eta: '12–15 мая' } }); st(o1.id, 'paid', 'system'); st(o1.id, 'shipped', 'supplier'); st(o1.id, 'in_transit', 'supplier', { fields: { tracking: 'RU7781234567', carrier: 'СДЭК' } }); }
    second.forEach(function (p) { O.basket.add(p.id, 'budget'); }); O.place(O.object.title(), 'metod');
    first.concat(second).forEach(function (p) { O.basket.add(p.id, 'budget'); });
  }
  if (ui.qs('demo')) { seedDemo(); try { history.replaceState(null, '', PAGE + (view !== 'home' ? '?v=' + view : '')); } catch (e) {} }
  var TITLES = { home: 'Мой ремонт', new: 'Добавить квартиру', object: 'Объект', visual: 'Визуал и планировки', budget: 'Бюджет', basket: 'Корзина', orders: 'Заказы', order: 'Заказ', feed: 'Лента', inspire: 'Вдохновение', rooms: 'Комнаты и этапы', doc: 'Документ' };
  document.title = (TITLES[view] || 'Мой ремонт') + ' — SOVEAPP';
  var t = document.querySelector('.appbar__title'); if (t) t.textContent = TITLES[view] || 'Мой ремонт';
  O.autoReceive();
  root.addEventListener('click', function (e) { var b = e.target.closest('[data-mw-back]'); if (!b) return; if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = PAGE; });
  function bindHome() {
    if (window.SOVE_MY_HOME) return window.SOVE_MY_HOME(root); /* новый главный вид — ТЗ 22.10.2026, assets/js/pages/my-repair.js */
    root.innerHTML = viewHome();
    var strip = root.querySelector('#obj-strip'), dots = root.querySelector('#obj-dots'); if (!strip || !dots) return;
    strip.addEventListener('scroll', function () { var i = Math.round(strip.scrollLeft / strip.clientWidth); dots.querySelectorAll('i').forEach(function (d, j) { d.classList.toggle('is-on', j === i); }); }, { passive: true });
  }
  ({ home: bindHome, new: viewNew, object: viewObject, visual: viewVisual, budget: window.SOVE_MY_BUDGET ? function () { window.SOVE_MY_BUDGET(root); } : viewBudget, basket: viewBasket, orders: viewOrders, order: viewOrder, feed: viewFeed, inspire: viewInspire, rooms: viewRooms, doc: viewDoc }[view] || bindHome)();
})();
