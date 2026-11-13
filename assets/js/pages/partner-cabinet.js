/* Кабинет поставщика — строго по ТЗ и макету Вики (пакет 21.10: SOVE_Supplier_Mobile_Developer_Handoff.docx и 10 экранов
   SOVE_supplier_mobile_reference.png; Вика 03.11: «кабинет поставщика строго по ТЗ и дизайну»).
   Одна оболочка на все типы (ТЗ, раздел 6): Главная · Товары и цены · Заказы · Сообщения · Финансы · Профиль компании, одни
   показатели, фильтры, финансы и профиль. Тип A/B/C — Retail · Materials · Custom (PDF Алины 19.10) — меняет только
   дополнительные поля товара и заказа и статусы заказа; шаги, поля и кнопки — из SOVE.orders, покупатель видит то же зеркально.
   ?demo=stock|materials|custom — демо-кабинет для команды с учебными заказами; ?tab=… — открыть раздел по ссылке.
   В прототипе партнёр видит заказы всех поставщиков этого браузера. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, O = S.orders, X = S.pext;
  var root = document.getElementById('pc-root'); if (!root) return;
  var SEC_OF = { goods: 'goods', orders: 'orders', finance: 'finance', messages: 'messages' };
  function canTab(t) { return !SEC_OF[t] || X.access.can(SEC_OF[t]); }
  var KEY = 'sove.proto.partnerCab', LEAD_KEY = 'sove.proto.partnerLead', DEMO_PHONE = '+7 999 000-00-70'; /* вымышленный номер демо */
  var st = { step: 'phone', phone: '', tab: 'home', brand: 'all', open: {}, filter: 'all', demo: null, showDemo: false, promoSel: null, screen: null, cat: 'all', q: '', whDraft: {}, profOpen: null, stockTab: 'stock' };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.phone) { st.step = 'cab'; st.phone = saved.phone; if (saved.demo) { st.demo = saved.demo; st.brand = saved.brand || 'all'; } else if (saved.brand) st.brand = saved.brand; } } catch (e) {}
  function hasType(k) { return O.scenarios().some(function (s) { return s.key === k; }); }
  var demo = ui.qs('demo');
  if (demo && !O.single && hasType(demo)) {
    var dBrand = 'Демо · ' + O.typeInfo(demo).short; O.seed(demo, dBrand);
    st.step = 'cab'; st.phone = DEMO_PHONE; st.brand = dBrand; st.demo = demo; st.tab = 'home';
    try { localStorage.setItem(KEY, JSON.stringify({ phone: DEMO_PHONE, demo: demo, brand: dBrand })); } catch (e) {}
  }
  /* ?tab=goods|orders|messages|finance|profile — открыть раздел по ссылке (для просмотра командой) */
  var tabQ = ui.qs('tab'); if (st.step === 'cab' && tabQ && ['home', 'goods', 'orders', 'messages', 'finance', 'profile'].indexOf(tabQ) >= 0) st.tab = tabQ;

  var IC = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', goods: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    orders: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', promo: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6"/>',
    finance: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 8H13a2.5 2.5 0 0 1 0 5H9.5m0 0v4m-1.5-2h4"/>', profile: '<path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
    clip: '<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M15 18l-6-6 6-6"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>', search: '<path d="M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"/>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/>', pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', pic: '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14M3 19l5-5 4 4 3-3 6 6M8 9h.01"/>', wallet: '<path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 3H6a2 2 0 0 0-2 2v2M16 14h2"/>', clock: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2"/>', building: '<path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11M9 8h2M9 12h2M9 16h2"/>', users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>', card: '<path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22"/>', truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>', plug: '<path d="M9 2v6M15 2v6M5 8h14v4a7 7 0 0 1-14 0zM12 19v3"/>', help: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', check: '<path d="M5 12l4 4L19 6"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/>', box: '<path d="M4 7h16v13H4zM4 7l2-4h12l2 4M10 11h4"/>', calc: '<path d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM9 6h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15v4M9 19h.01M12 19h.01"/>', factory: '<path d="M3 21V9l5 3V9l5 3V9l5 3v9zM17 12V4h3v8M7 17h2M11 17h2M15 17h2"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>', chev: '<path d="M6 9l6 6 6-6"/>', more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  /* разделы — одни для всех типов (ТЗ, раздел 6): на компьютере — боковое меню, на телефоне — ряд под приветствием */
  var SECTIONS = [['goods', 'Товары', 'goods'], ['orders', 'Заказы', 'orders'], ['messages', 'Сообщения', 'chat'], ['finance', 'Финансы', 'finance'], ['profile', 'Профиль', 'profile']];
  function navItems() { return [['home', 'Главная', 'home']].concat(SECTIONS); }
  /* «Следующее действие» на главной компьютера — по состоянию заказов своего типа */
  var NEXT = { stock: ['Подтвердите наличие и срок', 'Ответ в день заказа держит рейтинг и не теряет продажу.'], materials: ['Пришлите расчёт и КП', 'Количество, упаковки, партия, цена и срок — клиент примет расчёт и оплатит.'], custom: ['Примите заявки и назначьте замер', 'После замера — КП и спецификация, затем предоплата и изготовление.'] };
  var TOPICS = ['товары', 'цены', 'заказ', 'выплаты', 'продвижение', 'жалоба'];
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? f[2] : b === 1 ? f[0] : (b >= 2 && b <= 4) ? f[1] : f[2]; }
  function lead() { try { return JSON.parse(localStorage.getItem(LEAD_KEY) || 'null'); } catch (e) { return null; } }

  /* бренды партнёра: в прототипе — те, у кого есть заказы или скидка в каталоге */
  function brands() {
    var by = {};
    D.products.forEach(function (p) { var k = O.supplierOf(p); if (!(p.retail > p.metod)) return; var b = by[k] || (by[k] = { name: k, items: 0, discount: 0 }); b.items++; b.discount = Math.max(b.discount, p.discount || 0); });
    O.list().forEach(function (o) { by[o.brand] = by[o.brand] || { name: o.brand, items: 0, discount: 0 }; });
    var out = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.items - a.items; });
    if (st.brand !== 'all' && !out.slice(0, 6).some(function (b) { return b.name === st.brand; })) out = [by[st.brand] || { name: st.brand, items: 0, discount: 0 }].concat(out.filter(function (b) { return b.name !== st.brand; }));
    return out;
  }
  function myOrders() { return O.list().filter(function (o) { return st.brand === 'all' || o.brand === st.brand; }); }
  function myTypes() {
    var set = {};
    myOrders().forEach(function (o) { if (hasType(o.scenario)) set[o.scenario] = true; });
    brands().forEach(function (b) { if (st.brand !== 'all' && b.name !== st.brand) return; var p = O.profiles.get(b.name); if (p.scenario && hasType(p.scenario)) set[p.scenario] = true; });
    var keys = Object.keys(set); if (keys.length) return keys;
    var L = lead() || {}; return [hasType(L.type) ? L.type : 'stock'];
  }
  function mainType() { var t = myTypes(); if (t.length === 1) return t[0]; var best = t[0], n = -1; t.forEach(function (k) { var c = myOrders().filter(function (o) { return o.scenario === k && O.needsSupplier(o); }).length; if (c > n) { n = c; best = k; } }); return best; }
  function singleType() { var t = myTypes(); return t.length === 1 ? t[0] : null; }
  function brandTitle() { if (st.brand !== 'all') return st.brand; var L = lead(); if (L && L.company) return L.company; var bs = brands(); return bs.length > 1 ? 'Все бренды' : bs.length ? bs[0].name : 'Ваш бренд'; }
  /* название на экране: у демо-кабинета — без типа, тип не часть оболочки (ТЗ, раздел 6); для данных — brandTitle() */
  function brandName() { return st.demo ? 'Демо-поставщик' : brandTitle(); }
  function pill(o) { var s = o.status, cls = /^(received|delivered|installed|done|paid|shipped|in_transit)$/.test(s) ? 'pill--ok' : /^(return|cancelled)$/.test(s) ? 'pill--bad' : s === 'pending_confirmation' ? 'pill--warn' : 'pill--blue'; return '<span class="pill pill--dot ' + cls + '">' + esc(o.statusLabel) + '</span>'; }
  function title(o) { var f = o.items[0] || {}; return esc(f.name || 'Заказ') + (o.items.length > 1 ? ' <small>и ещё ' + (o.items.length - 1) + '</small>' : ''); }
  function thumb(o) { var f = o.items[0] || {}; return '<span class="pc-ord__pic">' + (f.img ? '<img src="' + f.img + '" alt="" loading="lazy">' : ic('box', 20)) + '</span>'; }
  function finished(o) { return !O.active(o); }

  /* ---------- вход ---------- */
  /* три демо-кабинета поставщика — те же, что в Профиле (Валерия 04.11: «где тут выбор между кабинетами?»): на странице входа
     видны сразу, а не под кнопкой «Для команды» */
  var CABS = [['stock', 'Ретейл', 'свет, сантехника, мебель в наличии'], ['materials', 'Материал с расчётом', 'плитка, краска, обои — по площади'], ['custom', 'Изделие на заказ', 'кухни, шкафы, столярка — с замером']];
  /* переключатель демо-кабинетов на главной кабинета — только в демо (Валерия 04.11: «где выбор?» — изнутри кабинета его не было) */
  var CAB_SHORT = { stock: 'Ретейл', materials: 'С расчётом', custom: 'На заказ' };
  function demoSwitch() {
    if (!st.demo) return '';
    return '<div class="pc-dsw" role="group" aria-label="Демо-кабинет поставщика"><span class="pc-dsw__k">Демо-кабинет</span><div class="pc-dsw__b">' + CABS.filter(function (c) { return hasType(c[0]); }).map(function (c) { var on = st.demo === c[0]; return '<a class="pc-dsw__i' + (on ? ' is-on' : '') + '" href="partner-cabinet.html?demo=' + c[0] + '" title="' + esc(c[1] + ' — ' + c[2]) + '"' + (on ? ' aria-current="true"' : '') + '>' + esc(CAB_SHORT[c[0]] || c[1]) + '</a>'; }).join('') + '</div></div>';
  }
  function demoChips() {
    return '<div class="pc-demo-list">' + CABS.filter(function (c) { return hasType(c[0]); }).map(function (c) { return '<a class="pc-demo-list__a" href="partner-cabinet.html?demo=' + c[0] + '"><b>' + esc(c[1]) + '</b><span>' + esc(c[2]) + '</span>' + ic('arrow', 16) + '</a>'; }).join('') + '</div>';
  }

  function viewPhone() {
    return '<div class="stack stack--2"><span class="eyebrow">Партнёрам</span><h1 class="h1 h1--sm">Вход в кабинет</h1><p class="text">По телефону из анкеты партнёра. Пришлём код в SMS.</p></div>' +
      '<form class="stack stack--4" id="pc-form"><div class="field"><label for="pc-phone">Телефон</label><input class="input" id="pc-phone" type="tel" inputmode="tel" placeholder="+7 900 000-00-00" value="' + esc(st.phone) + '"><p class="field__error" id="pc-err" hidden></p></div><button class="btn btn--primary btn--block" type="submit">Получить код</button></form>' +
      '<a class="btn btn--link" href="partner.html">Ещё не партнёр — стать партнёром</a>' +
      (O.single ? '' : '<div class="pc-team"><b class="pc-team__h">Посмотреть демо-кабинет поставщика</b>' + demoChips() + '</div>');
  }
  function viewCode() {
    return '<div class="stack stack--2"><span class="eyebrow">Партнёрам</span><h1 class="h1 h1--sm">Код из SMS</h1><p class="text">Отправили на ' + esc(st.phone) + '. В прототипе подойдут любые четыре цифры.</p></div>' +
      '<form class="stack stack--4" id="pc-code-form"><div class="field"><label for="pc-code">Код</label><input class="input" id="pc-code" inputmode="numeric" maxlength="4" placeholder="1234"><p class="field__error" id="pc-code-err" hidden></p></div><button class="btn btn--primary btn--block" type="submit">Войти</button></form>' +
      '<button type="button" class="btn btn--link" id="pc-other">Другой номер / отправить код ещё раз</button>';
  }

  /* ---------- каркас по 10 экранам макета: шапка «SOVEAPP · Кабинет партнёра» на главной, стрелка «назад» в разделах ---------- */
  /* тип поставщика (ТЗ, раздел 6) задаёт только дополнительные поля: поля товара, учёт остатков (склады / м² и упаковки /
     загрузка производства) и карточку в заказе (доставка / расчёт / проект); статусы заказа — из его сценария в SOVE.orders */
  var TYPE_CFG = {
    stock: { unit: 'шт', priceNote: '',
      goodsFields: [['sizes', 'Размеры', 'Например: 1200×600 мм'], ['warranty', 'Гарантия', '2 года'], ['lead', 'Срок отгрузки', '1–2 дня']],
      stockMode: 'warehouses', orderCard: 'delivery' },
    materials: { unit: 'м²', priceNote: ' / м²',
      goodsFields: [['packArea', 'В упаковке, м²', '1,44'], ['consumption', 'Расход на м²', '1,05'], ['batch', 'Партия / тон', 'A-12'], ['pack', 'Кратность упаковки', '1 уп.'], ['lead', 'Срок отгрузки', '2–3 дня']],
      stockMode: 'units', orderCard: 'calc' },
    custom: { unit: 'проект', priceNote: '',
      goodsFields: [['leadTime', 'Срок изготовления', '30–45 дней'], ['materials', 'Материалы и фасады', 'МДФ, эмаль, шпон'], ['hardware', 'Фурнитура', 'Blum, Hettich'], ['measure', 'Замер', 'бесплатно по Москве'], ['install', 'Монтаж', 'включён']],
      stockMode: 'capacity', orderCard: 'project' }
  };
  function cfg() { return TYPE_CFG[mainType()] || TYPE_CFG.stock; }
  function inStatuses(o, list) { return list.split(',').indexOf(o.status) >= 0; }
  /* фильтры заказов по ТЗ (экран 06: новые, на подтверждении, в работе, отправлены, выполнены) с подписями макета — одни для всех
     типов; статусы у сценариев разные, поэтому «В работе» собрана из шагов всех трёх. Новые — пришли за последние 7 дней. */
  var FILTERS = [['all', 'Все'], ['new', 'Новые'], ['confirm', 'Подтвердить'], ['work', 'В работе'], ['sent', 'Отправлены'], ['done', 'Выполнены']];
  var GROUP = { work: 'confirmed,paid,assembling,spec_sent,spec_accepted,measurement_scheduled,in_production', sent: 'shipped,in_transit', done: 'delivered,installed,received' };
  function orderGroup(key, list) {
    if (key === 'new') { var week = Date.now() - 7 * 864e5; return list.filter(function (o) { return o.status !== 'cancelled' && (o.ts || 0) > week; }); }
    if (key === 'confirm') return list.filter(function (o) { return o.status === 'pending_confirmation'; });
    return GROUP[key] ? list.filter(function (o) { return inStatuses(o, GROUP[key]); }) : list;
  }
  var TITLES = { goods: 'Товары и цены', orders: 'Заказы', finance: 'Финансы', profile: 'Профиль компании', messages: 'Сообщения' };
  /* у карточки товара заголовка нет — как на макете (стрелка, сердечко); у остальных экранов — одни названия для всех типов */
  function screenTitle() {
    var sc = st.screen;
    if (sc) return sc.kind === 'chat' ? 'Переписка' : sc.kind === 'payouts' ? 'Выплаты' : sc.kind === 'stock' ? 'Остатки и цены' : sc.kind === 'add' ? 'Добавить товар' : sc.kind === 'order' ? 'Заказ №' + shortId(sc.id) : '';
    return TITLES[st.tab] || '';
  }
  function shortId(id) { return id.replace(/^o-/, '').slice(-6); }
  function header() {
    if (st.tab === 'home' && !st.screen) return '<div class="pc-head"><div><span class="pc-head__logo">SOVEAPP</span><span class="pc-head__k">Кабинет партнёра</span></div><button type="button" class="pc-bell" data-tab="messages" aria-label="Сообщения">' + ic('bell', 20) + ((S.leads.list() || []).length ? '<i></i>' : '') + '</button></div>';
    var t = screenTitle(), find = (st.tab === 'goods' || st.tab === 'messages') && !st.screen;
    /* поиск: у «Товаров» и «Сообщений» — значком в шапке (макет), у «Заказов» — полем под фильтрами */
    var right = find ? '<button type="button" class="pc-bar__b" data-search-toggle aria-label="Поиск" aria-expanded="' + !!st.searchOpen + '">' + ic('search', 20) + '</button>' : (st.screen && st.screen.kind === 'product' ? '<span class="pc-bar__r"><span class="pc-bar__b" aria-hidden="true">' + ic('heart', 20) + '</span><button type="button" class="pc-bar__b" data-more="' + esc(st.screen.ref) + '" aria-label="Ещё действия с товаром">' + ic('more', 20) + '</button></span>' : st.tab === 'finance' && !st.screen ? monthSel() : '<span class="pc-bar__b"></span>');
    return '<div class="pc-bar"><button type="button" class="pc-bar__b" data-pc-back aria-label="Назад">' + ic('back', 22) + '</button>' + (t ? '<h1 class="pc-bar__t">' + esc(t) + '</h1>' : '<span class="pc-bar__t"></span>') + right + '</div>';
  }
  /* разделы для сотрудников — без «Продвижения»: его нет в ТЗ */
  function secs() { return X.SECTIONS.filter(function (k) { return k !== 'promotion'; }); }
  function empStripe() { var a = X.access.current(); return a ? '<div class="pc-stripe pc-stripe--emp"><span>Вы вошли как сотрудник · ' + esc(a.label) + ' · открыты: ' + secs().filter(function (k) { return a.sections.indexOf(k) >= 0; }).map(function (k) { return X.SECTION_LABEL[k]; }).join(', ').toLowerCase() + '</span><button type="button" data-emp-logout>вернуться как владелец</button></div>' : ''; }
  function navButtons() { return navItems().filter(function (n) { return canTab(n[0]); }).map(function (n) { var need = n[0] === 'orders' ? myOrders().filter(O.needsSupplier).length : 0; return '<button type="button" class="pc-nav__b' + (st.tab === n[0] && !st.screen ? ' is-on' : '') + '" data-tab="' + n[0] + '">' + ic(n[2], 18) + '<span>' + esc(n[1]) + '</span>' + (need ? '<i>' + need + '</i>' : '') + '</button>'; }).join(''); }
  function shell(body) {
    return empStripe() +
      '<div class="pc-shell"><nav class="pc-nav" aria-label="Разделы кабинета"><span class="pc-nav__brand">SOVEAPP<small>Кабинет партнёра</small></span>' + navButtons() + '</nav>' +
      '<div class="pc-main">' + header() + body + '</div></div>';
  }

  /* ---------- экран 1: главная ---------- */
  function spark(values, h) {
    h = h || 88; var w = 300, max = Math.max(1, Math.max.apply(null, values)), n = Math.max(2, values.length), step = w / (n - 1);
    var pts = values.map(function (v, i) { return [i * step, h - 6 - (v / max) * (h - 12)]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var fmt = function (v) { return v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + ' млн' : v >= 1000 ? Math.round(v / 1000) + ' тыс.' : String(Math.round(v)); };
    var d = new Date(), labels = [29, 20, 10, 0].map(function (b) { var x = new Date(d); x.setDate(x.getDate() - b); return x.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', ''); });
    return '<div class="pc-chart"><div class="pc-chart__y"><span>' + fmt(max) + '</span><span>' + fmt(max / 2) + '</span><span>0</span></div><div class="pc-chart__g"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pcs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".02"/></linearGradient></defs><path d="' + line + ' L' + w + ',' + h + ' L0,' + h + ' Z" fill="url(#pcs)"/><path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/></svg></div><div class="pc-chart__x">' + labels.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div></div>';
  }
  function inPeriod(list) { var from = Date.now() - (st.period || 30) * 864e5; return list.filter(function (o) { return (o.ts || 0) >= from; }); }
  function periodSel(cls) { var cur = st.period || 30; return '<label class="pc-period' + (cls ? ' ' + cls : '') + '"><select data-period aria-label="Период">' + [7, 30, 90].map(function (d) { return '<option value="' + d + '"' + (d === cur ? ' selected' : '') + '>За ' + d + ' дней</option>'; }).join('') + '</select>▾</label>'; }
  function daily(list, days) { var now = Date.now(), out = []; for (var i = (days || 30) - 1; i >= 0; i--) { var d0 = now - (i + 1) * 864e5, d1 = now - i * 864e5; out.push(list.filter(function (o) { return o.ts > d0 && o.ts <= d1 && o.status !== 'cancelled'; }).reduce(function (s, o) { return s + o.total; }, 0)); } return out; }
  /* показатель как на макете: цветной круглый значок слева, подпись, число, «+N» за сутки и сумма */
  function kpi(icon, tone, label, value, delta, sub, tab, filter) { return '<button type="button" class="pc-kpi" data-tab="' + tab + '"' + (filter ? ' data-filter="' + filter + '"' : '') + '><i class="pc-ic pc-ic--' + tone + '">' + ic(icon, 18) + '</i><span class="pc-kpi__c"><small>' + esc(label) + '</small><b>' + value + '</b>' + (delta ? '<em>' + delta + '</em>' : '') + (sub ? '<span class="pc-kpi__s">' + esc(sub) + '</span>' : '') + '</span></button>'; }
  /* изменение к прошлому такому же периоду, как на макете: «+12 % к прошлому периоду»; без прошлого периода — подпись по умолчанию */
  function inPrev(list) { var p = (st.period || 30) * 864e5, to = Date.now() - p; return list.filter(function (o) { return (o.ts || 0) >= to - p && (o.ts || 0) < to; }); }
  function trend(cur, prev, none, long) {
    if (!prev) return none ? '<em class="pc-trend">' + esc(none) + '</em>' : '';
    var p = Math.round((cur - prev) / prev * 100);
    return '<em class="pc-trend"><span class="pc-trend__v' + (p < 0 ? ' is-down' : '') + '">' + (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p) + ' %</span>' + (long ? ' к прошлому периоду' : '') + '</em>';
  }
  function tabHome() {
    var list = myOrders(), cur = inPeriod(list), fin = O.finance(cur), pf = O.finance(inPrev(list));
    var cap = D.capsule('k1'), hour = new Date().getHours(), hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    return demoSwitch() + '<div class="pc-hello"><div><b>' + hello + ', ' + esc(brandName()) + '!</b><span>Здесь вся ключевая информация о вашем бизнесе на SOVEAPP</span></div>' + (cap && cap.cover ? '<img src="' + cap.cover + '" alt="">' : '') + '</div>' +
      /* ряда разделов на макете нет, но на телефоне без него не попасть в «Товары и цены» и «Профиль компании» (верхнего меню
         нет), а ТЗ, п. 10, требует, чтобы все десять экранов были доступны из кабинета */
      '<div class="pc-quick">' + SECTIONS.filter(function (x) { return canTab(x[0]); }).map(function (x) { return '<button type="button" class="pc-quick__b" data-tab="' + x[0] + '"><i>' + ic(x[2], 18) + '</i><span>' + esc(x[1]) + '</span></button>'; }).join('') + '</div>' +
      kpiTiles(list) +
      '<div class="pc-sec"><b>Ключевые показатели</b>' + periodSel() + '</div>' +
      '<button type="button" class="pc-card pc-card--b" data-tab="finance"><small>Оборот</small><b class="pc-big">' + F.rub(fin.total) + '</b>' + trend(fin.total, pf.total, fin.count ? 'за выбранный период' : 'заказов пока нет', true) + spark(daily(cur, st.period || 30)) + '</button>' +
      '<div class="pc-two"><button type="button" class="pc-card pc-card--b" data-tab="orders" data-filter="all"><small>Заказы</small><b class="pc-mid">' + fin.count + '</b>' + trend(fin.count, pf.count, '') + '</button><button type="button" class="pc-card pc-card--b" data-tab="finance"><small>Средний чек</small><b class="pc-mid">' + (fin.count ? F.rub(fin.averageCheck) : '—') + '</b>' + trend(fin.count ? fin.averageCheck : 0, pf.count ? pf.averageCheck : 0, '') + '</button></div>';
  }
  /* ---------- дополнительные поля по типу (ТЗ, раздел 6): остатки, расчёт по площади, этап и дата замера проекта ---------- */
  function stockTotal(g) { return X.stocks.list(g.ref).reduce(function (s, r) { return s + (Number(r.qty) || 0); }, 0); }
  function seedDemoStocks() { var items = goodsItems(); if (items.some(function (g) { return X.stocks.list(g.ref).length; })) return; [12, 3, 0, 24, 5, 18].forEach(function (q, i) { if (items[i]) X.stocks.set(items[i].ref, 'Основной склад', q, 'шт'); }); }
  function packAreaOf(g) { var e = g.edit || {}, v = Number(String(e.packArea || '').replace(',', '.')); if (v) return v; return /м²/.test(g.name || '') ? X.calc.get().packArea : 0; }
  function calcFor(o) { var cs = X.calc.get(), area = Number((String(o.fields.area || '').replace(',', '.').match(/\d+(?:\.\d+)?/) || [0])[0]) || 0, need = area ? X.calc.need(area, cs.reserve) : 0; return { area: area, reserve: cs.reserve, need: need, packArea: cs.packArea, packs: need ? X.calc.packs(need, cs.packArea) : 0 }; }
  function stageOf(o) { return X.production.stage(o.id) || o.fields.stage || (O.scenario(o.scenario).production_stages || ['Материалы'])[0]; }
  function measureDate(o) { return X.production.measure(o.id) || o.fields.measurementDate || ''; }
  /* показатели главной по ТЗ (экран 01): новые заказы, ожидают подтверждения, сообщения, на выплату — одни для всех типов;
     нажатие открывает отфильтрованный список; «+N» — пришло за сутки */
  function unread() { return (S.leads.list() || []).length + dialogs().reduce(function (sum, d) { return sum + d.unread; }, 0); }
  function kpiTiles(list) {
    var day = Date.now() - 864e5, plus = function (arr) { var n = arr.filter(function (o) { return (o.ts || 0) > day; }).length; return n ? '+' + n : ''; };
    var nw = orderGroup('new', list), cf = orderGroup('confirm', list), received = list.filter(function (o) { return o.status === 'received'; });
    return '<div class="pc-kpis">' + kpi('bag', 'new', 'Новые заказы', String(nw.length), plus(nw), '', 'orders', 'new') + kpi('clock', 'wait', 'Ожидают подтверждения', String(cf.length), plus(cf), '', 'orders', 'confirm') +
      kpi('chat', 'msg', 'Сообщения', String(unread()), '', '', 'messages') + kpi('wallet', 'pay', 'На выплату', String(received.length), '', F.rub(O.finance(list).awaitingPayout), 'finance') + '</div>';
  }
  /* хендофф, экран 08: список диалогов с покупателями (по заказам бренда), непрочитанные, предпросмотр; переписка — экран kind: 'chat' */
  function buyerName(o) { var city = o.address ? String(o.address).split(/[·,]/)[0].trim() : ''; if (/^квартира|м²/i.test(city)) city = ''; return (o.buyerName || o.client || '') || ('Покупатель' + (city ? ' · ' + city : ' · №' + shortId(o.id))); }
  function dialogs() {
    return myOrders().slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).map(function (o) {
      var msgs = X.chat.list(o.id), last = msgs[msgs.length - 1], seen = (st.seen || {})[o.id] || 0;
      return { id: o.id, name: buyerName(o), text: last ? last.text : '', ts: last ? last.ts : o.ts, unread: msgs.filter(function (m, i) { return m.who === 'buyer' && i >= seen; }).length };
    });
  }
  /* файл в переписку (ТЗ, экран 08): фото, PDF и документы до 20 МБ; в прототипе в переписке видны имя и размер файла */
  function attach(id) { return '<label class="pc-roundbtn pc-attach" aria-label="Прикрепить файл">' + ic('clip', 16) + '<input type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" data-chat-file="' + esc(id) + '"></label>'; }
  function chatScreen(id) {
    var o = myOrders().filter(function (x) { return x.id === id; })[0]; if (!o) return '<p class="small muted">Не найдено.</p>';
    var msgs = X.chat.list(id); st.seen = st.seen || {}; st.seen[id] = msgs.length;
    return '<div class="pc-card"><div class="pc-sec"><b>' + esc(buyerName(o)) + '</b><span class="small muted">Заказ №' + shortId(id) + ' · <button type="button" class="btn btn--link" data-open-docs="' + esc(id) + '">документы заказа ›</button></span></div>' +
      '<div class="pc-chat__list">' + msgs.map(function (m) { return '<div class="pc-chat__m' + (m.who === 'me' ? ' is-me' : '') + '"><small>' + (m.who === 'me' ? 'Вы' : 'Покупатель') + ' · ' + new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</small>' + esc(m.text) + '</div>'; }).join('') + '</div>' +
      '<div class="pc-chat__in">' + attach(id) + '<input class="input" id="pc-chat-in" placeholder="Написать покупателю…" aria-label="Сообщение покупателю"><button type="button" class="pc-roundbtn" data-chat-send="' + esc(id) + '" aria-label="Отправить">' + ic('arrow', 16) + '</button></div></div>';
  }
  function when(ts) {
    var d = new Date(ts), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === y.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }
  function tabMessages() {
    var inc = (S.leads.list() || []), rq = O.requests.list().filter(function (r) { return r.reply; }), q = (st.q || '').toLowerCase();
    var find = st.searchOpen ? '<label class="pc-search">' + ic('search', 16) + '<input id="pc-q" placeholder="Поиск по имени или тексту…" aria-label="Поиск по сообщениям" value="' + esc(st.q || '') + '"></label>' : '';
    var rows = dialogs().map(function (d) { return { name: d.name, text: d.text, ts: d.ts, unread: d.unread, chat: d.id }; }).concat(inc.map(function (l) { var LEAD = { partner: 'заявка партнёра', adept: 'Дизайн-проект', track: 'Ремонт под ключ' }; return { name: l.name || 'Клиент', text: (LEAD[l.product] || l.product || 'заявка') + (l.status ? ' · ' + l.status : ''), ts: l.ts, unread: 1 }; }))
      .concat(rq.map(function (r) { return { name: 'Менеджер SOVEAPP', text: r.reply, ts: r.ts, unread: 0 }; })).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })
      .filter(function (r) { return !q || (r.name + ' ' + r.text).toLowerCase().indexOf(q) >= 0; });
    if (!rows.length) return find + '<div class="pc-card pc-empty">' + ic('chat', 28) + '<p class="small muted">' + (q ? 'Ничего не нашли — измените запрос.' : 'Сообщений пока нет. Клиенты пишут с карточки товара и из заказа — переписка появится здесь.') + '</p></div>';
    return find + '<div class="pc-card pc-list">' + rows.map(function (r) { return '<' + (r.chat ? 'button type="button" data-open-chat="' + esc(r.chat) + '"' : 'a href="chats.html?kind=partner"') + ' class="pc-msg2"><span class="pc-ava' + (r.unread ? ' is-hot' : '') + '">' + esc(r.name.charAt(0).toUpperCase()) + '</span><span class="pc-msg2__b"><b>' + esc(r.name) + '</b><span>' + esc(r.text) + '</span></span><span class="pc-msg2__r"><small>' + (r.ts ? when(r.ts) : '') + '</small>' + (r.unread ? '<i>' + r.unread + '</i>' : '') + '</span></' + (r.chat ? 'button' : 'a') + '>'; }).join('') + '</div>';
  }

  /* ---------- экраны 2–5: товары ---------- */
  function goodsItems() {
    var names = brands().map(function (b) { return b.name; }), mine = D.products.filter(function (p) { return names.indexOf(O.supplierOf(p)) >= 0; });
    if (!mine.length || st.demo) { var t = mainType(); mine = D.products.filter(function (p) { return t === 'materials' ? p.category === 'Отделка' : t === 'custom' ? (p.madeToOrder && p.category === 'Мебель') : (!p.madeToOrder && p.category !== 'Отделка'); }).slice(0, 6); if (!mine.length) mine = D.products.slice(0, 6); }
    var cat = mine.slice(0, 8).map(function (p) { var ref = 'cat:' + p.id, e = X.edits.get(ref), pub = X.edits.published(ref); return { ref: ref, id: p.id, own: false, name: (pub && pub.name) || (e && e.name) || p.name, brand: O.supplierOf(p), category: p.category, img: p.img, priceRetail: e && e.priceRetail != null ? e.priceRetail : p.retail, priceSove: e && e.priceSove != null ? e.priceSove : p.metod, status: (e && e.status) || (p.madeToOrder ? 'under_order' : 'in_stock'), edit: e, sizes: p.size || null, material: p.material || null }; });
    var own = X.edits.list(brandTitle()).concat(X.edits.list('all')).filter(function (e) { return e.own; }).map(function (e) { return { ref: e.ref, id: null, own: true, name: e.name, brand: e.brand, category: e.category, article: e.article, img: e.img || null, priceRetail: e.priceRetail, priceSove: e.priceSove, status: e.status || 'in_stock', edit: e, sizes: e.sizes || null, description: e.description || null }; });
    return own.concat(cat);
  }
  /* артикул (ТЗ 02/03: SKU): у своих позиций — как ввёл партнёр, у позиций каталога — их номер в каталоге */
  function sku(g) { return g.article || (g.id != null ? String(g.id) : ''); }
  function subline(g) { return [g.sizes, sku(g) ? 'арт. ' + sku(g) : null].filter(Boolean).join(', ') || g.brand || ''; }
  /* единица у цены (ТЗ 03: «цена и единица измерения»): м² у расчётных позиций, шт у каталога, у изделий на заказ — цена «от» */
  function priceUnit() { var C = cfg(); return C.priceNote || (C.stockMode === 'warehouses' ? ' / шт' : ''); }
  function unitOf(g) { var r = X.stocks.list(g.ref)[0]; return (r && r.unit) || cfg().unit; }
  function dec(n) { return String(n).replace('.', ','); }
  function goodById(ref) { return goodsItems().filter(function (g) { return g.ref === ref; })[0]; }
  function statusPill(s) { return '<span class="pill pill--dot ' + (s === 'in_stock' ? 'pill--ok' : s === 'under_order' ? 'pill--warn' : 'pill--bad') + '">' + X.STATUS[s] + '</span>'; }
  function reviewPill(e) { return e ? '<span class="pill ' + (e.state === 'approved' ? 'pill--ok' : e.state === 'rejected' ? 'pill--bad' : e.state === 'draft' ? '' : 'pill--blue') + '">' + X.REVIEW[e.state] + '</span>' : ''; }
  function goodsRow(g) {
    return '<button type="button" class="pc-row pc-row--good" data-open-product="' + esc(g.ref) + '"><span class="pc-ord__pic">' + (g.img ? '<img src="' + g.img + '" alt="" loading="lazy">' : ic('goods', 20)) + '</span>' +
      '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + esc(subline(g)) + (X.stocks.list(g.ref).length && cfg().stockMode !== 'capacity' ? ' · остаток ' + dec(stockTotal(g)) + ' ' + esc(unitOf(g)) : '') + '</span><span class="pc-good__pills"><b class="pc-good__price">' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) : 'цена не указана') + '</b>' + statusPill(g.status) + reviewPill(g.edit) + '</span></span><i>⋯</i></button>';
  }
  function tabGoods() {
    var items = goodsItems(), cats = [], q = (st.q || '').toLowerCase(); items.forEach(function (g) { if (g.category && cats.indexOf(g.category) < 0) cats.push(g.category); });
    var shown = items.filter(function (g) { return (st.cat === 'all' || g.category === st.cat) && (!q || [g.name, g.article, g.category, g.brand].some(function (v) { return v && String(v).toLowerCase().indexOf(q) >= 0; })); });
    return (st.searchOpen ? '<label class="pc-search">' + ic('search', 16) + '<input id="pc-q" placeholder="Поиск по названию или артикулу…" aria-label="Поиск по товарам" value="' + esc(st.q || '') + '"></label>' : '') +
      (cats.length ? '<div class="pc-chips">' + [['all', 'Все']].concat(cats.map(function (c) { return [c, c]; })).map(function (c) { return '<button type="button" class="pc-chip' + (st.cat === c[0] ? ' is-on' : '') + '" data-cat="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>' : '') +
      '<button type="button" class="pc-btn pc-btn--ghost" data-open-add>' + ic('plus', 18) + ' Добавить товар</button>' +
      (shown.length ? '<div class="stack stack--2">' + shown.map(goodsRow).join('') + '</div>' : '<p class="small muted">' + (items.length ? 'Ничего не нашли — измените запрос или категорию.' : 'Товаров пока нет — добавьте первый.') + '</p>');
  }
  function productScreen(g) {
    var e = g.edit, ex = g.edit || {};
    /* характеристики — как на макете (бренд, размер, …) и дополнительные поля типа; цены и склады — на экране «Остатки и цены» */
    var specs = [['Бренд', g.brand], ['Артикул', g.article]].concat(cfg().goodsFields.map(function (f) { return [f[1], ex[f[0]] || (f[0] === 'sizes' ? g.sizes : '')]; })).concat([['Материал', g.material], ['Описание', g.description]]).filter(function (x) { return x[1]; });
    return '<div class="pc-hero">' + (g.img ? '<img src="' + g.img + '" alt="">' : ic('goods', 48)) + '</div>' + (g.img ? '<div class="pc-thumbs"><span class="is-on"><img src="' + g.img + '" alt=""></span></div>' : '') +
      '<div class="stack stack--1"><b class="pc-name">' + esc(g.name) + '</b><span class="line--f">' + esc(subline(g)) + '</span><b class="pc-big">' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) + priceUnit() : 'цена не указана') + '</b><span class="pc-good__pills">' + statusPill(g.status) + [g.category, g.brand].filter(Boolean).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('') + reviewPill(e) + '</span></div>' +
      (e ? '<p class="line--f' + (e.state === 'rejected' ? ' pc-err' : '') + '">' + (e.state === 'draft' ? 'Черновик: в витрину не отправлен. «Редактировать» → «Сохранить» — и товар уйдёт на проверку.' : e.state === 'pending' ? 'На проверке у менеджера: в витрине пока прежние данные.' : e.state === 'approved' ? 'Опубликовано в витрине маркета.' : 'Отклонено менеджером' + (e.note ? ': ' + esc(e.note) : '') + '. Поправьте и сохраните снова.') + '</p>' : '') +
      '<div class="pc-specs pc-specs--flat">' + specs.map(function (x) { return '<div class="pc-spec"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-edit="' + esc(g.ref) + '">Редактировать</button><button type="button" class="pc-btn" data-open-stock="' + esc(g.ref) + '">Управление остатками</button>';
  }
  /* «Остатки и цены» как на экране 04: склады с карандашом и «+ Добавить склад», цены, наличие и статус выпадающим списком;
     во вкладке «Цены» — правка цен. Учёт остатков — по типу: склады, м² и упаковки или загрузка производства */
  function stockScreen(g) {
    var C = cfg(), stocks = X.stocks.list(g.ref), tab = st.stockTab || 'stock', e = g.edit || {}, pr = e.priceRetail != null ? e.priceRetail : g.priceRetail, ps = e.priceSove != null ? e.priceSove : g.priceSove;
    var disc = pr && ps && pr > ps ? Math.round((1 - ps / pr) * 100) : 0, inStock = g.status !== 'none', pack = Number(String(e.packArea || '').replace(',', '.')), d = st.whDraft || {}, form = st.whForm || !stocks.length;
    var head = '<div class="pc-row pc-row--flat"><span class="pc-ord__pic">' + (g.img ? '<img src="' + g.img + '" alt="">' : ic('goods', 20)) + '</span><span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + esc(subline(g)) + '</span></span></div>' +
      '<div class="pc-tabs2">' + [['stock', C.stockMode === 'capacity' ? 'Загрузка' : 'Остатки'], ['prices', 'Цены']].map(function (t) { return '<button type="button" class="' + (tab === t[0] ? 'is-on' : '') + '" data-stock-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var stockCard = C.stockMode === 'capacity'
      ? '<b class="pc-h3">Загрузка производства</b><div class="pc-card"><span class="line--f">Сколько проектов можете взять в работу — покупатель видит реальный срок в КП.</span><div class="field"><label for="cap-slots">Свободных слотов на ближайший месяц</label><input class="input" id="cap-slots" inputmode="numeric" value="' + esc(String(e.capacity || '')) + '" placeholder="3"></div><div class="field"><label for="cap-lead">Срок изготовления</label><input class="input" id="cap-lead" value="' + esc(e.leadTime || '') + '" placeholder="30–45 дней"></div></div>'
      : '<b class="pc-h3">Склад</b><div class="pc-card">' + (C.stockMode === 'units' && pack ? '<span class="line--f">В упаковке ' + esc(e.packArea) + ' м² — остаток в упаковках считается сам.</span>' : '') +
        stocks.map(function (r) { return '<div class="pc-spec"><span class="pc-spec--ink">' + esc(r.warehouse) + '</span><b>' + r.qty + ' ' + esc(r.unit || '') + (C.stockMode === 'units' && pack ? ' · ' + Math.floor(r.qty / pack) + ' уп.' : '') + ' <button type="button" class="pc-iconbtn" data-wh-edit="' + r.id + '" aria-label="Изменить: ' + esc(r.warehouse) + '">' + ic('pencil', 14) + '</button></b></div>'; }).join('') +
        (form ? '<div class="field"><label for="wh-name">Склад</label><input class="input" id="wh-name" placeholder="Например: Центральный склад" value="' + esc(d.warehouse || '') + '"></div><div class="pc-two"><div class="field"><label for="wh-qty">Остаток</label><input class="input" id="wh-qty" inputmode="decimal" placeholder="124" value="' + esc(d.qty != null ? String(d.qty) : '') + '"></div><div class="field"><label for="wh-unit">Единица</label><input class="input" id="wh-unit" placeholder="м² / шт" value="' + esc(d.unit || C.unit) + '"></div></div>' +
          '<div class="row"><button type="button" class="pc-link" data-wh-add>' + ic('check', 14) + ' Сохранить склад</button>' + (d.id ? '<button type="button" class="pc-link pc-err" data-wh-del="' + esc(d.id) + '">' + ic('trash', 14) + ' Убрать склад</button>' : '') + '</div>'
          : '') + '</div>' + (form ? '' : '<button type="button" class="pc-link" data-wh-new>' + ic('plus', 14) + ' Добавить склад</button>');
    var prices = '<b class="pc-h3">Цены</b><div class="pc-card pc-card--ink"><div class="pc-spec"><span>Розничная цена</span><b>' + (pr != null ? F.rub(pr) + priceUnit() : '—') + '</b></div><div class="pc-spec"><span>Цена для клиентов SOVEAPP <button type="button" class="pc-info" data-info="Цена для покупателей с подпиской METOD — ваша скидка SOVEAPP" aria-label="Что это за цена">' + ic('help', 14) + '</button></span><b>' + (ps != null ? F.rub(ps) + priceUnit() : '—') + '</b></div><div class="pc-spec"><span>Скидка</span><b>' + (disc ? '<span class="pill pill--ok">−' + disc + ' %</span>' : '—') + '</b></div></div>';
    var priceForm = '<b class="pc-h3">Цены</b><div class="pc-card"><div class="field"><label for="pr-retail">Розничная цена, ₽</label><input class="input" id="pr-retail" inputmode="decimal" value="' + (pr != null ? pr : '') + '"></div><div class="field"><label for="pr-sove">Цена для клиентов SOVEAPP, ₽</label><input class="input" id="pr-sove" inputmode="decimal" value="' + (ps != null ? ps : '') + '"><span class="line--f">Цена для покупателей с подпиской METOD — ваша скидка SOVEAPP</span></div><div class="pc-spec"><span>Скидка</span><b class="' + (disc ? 'green' : '') + '">' + (disc ? '−' + disc + ' %' : '—') + '</b></div></div>';
    var status = '<b class="pc-h3">' + (C.stockMode === 'capacity' ? 'Приём заказов' : 'Наличие и статус') + '</b><div class="pc-card pc-card--ink"><div class="pc-spec pc-spec--sw"><span class="pc-spec--ink">' + (C.stockMode === 'capacity' ? 'Принимаем заказы на изделие' : 'Товар в наличии') + '</span><button type="button" class="pc-switch' + (inStock ? ' is-on' : '') + '" data-switch role="switch" aria-checked="' + inStock + '" aria-label="' + (C.stockMode === 'capacity' ? 'Принимаем заказы на изделие' : 'Товар в наличии') + '"><i></i></button></div>' +
      '<div class="pc-spec pc-spec--sw"><span class="pc-spec--ink">Статус</span><span class="pc-select"><select id="st-status" aria-label="Статус">' + Object.keys(X.STATUS).map(function (k) { return '<option value="' + k + '"' + (g.status === k ? ' selected' : '') + '>' + X.STATUS[k] + '</option>'; }).join('') + '</select>' + ic('chev', 14) + '</span></div></div>';
    return head + (tab === 'stock' ? stockCard + prices : priceForm) + status + '<button type="button" class="pc-btn" data-stock-save="' + esc(g.ref) + '">Сохранить</button>';
  }
  /* «Добавить товар» как на экране 05: фото, название, категория списком, артикул, описание, характеристики (с полями типа);
     цены и наличие задаются потом в «Остатки и цены» */
  function addScreen() {
    var cats = []; goodsItems().concat(D.products).forEach(function (g) { if (g.category && cats.indexOf(g.category) < 0) cats.push(g.category); });
    var f = function (id, label, ph, extra) { return '<div class="field"><label for="g-' + id + '">' + label + '</label><' + (id === 'description' ? 'textarea rows="3"' : 'input') + ' class="input" id="g-' + id + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '>' + (id === 'description' ? '</textarea>' : '') + '</div>'; };
    return '<b class="pc-h3">Фото товара</b><div class="pc-photos" id="g-photos">' + photosHTML() + '</div>' +
      f('name', 'Название товара', 'Например: Керамогранит Terra Sand') +
      '<div class="field"><label for="g-category">Категория</label><span class="pc-select pc-select--wide"><select id="g-category"><option value="">Выберите категорию</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' + ic('chev', 14) + '</span></div>' +
      f('article', 'Артикул', 'Например: TS-120') + f('description', 'Описание', 'Введите описание товара…') +
      '<b class="pc-h3">Характеристики</b>' + f('brand', 'Бренд', '', ' value="' + esc(brandTitle()) + '"') + cfg().goodsFields.map(function (x) { return f(x[0], x[1], x[2]); }).join('') +
      '<button type="button" class="pc-btn" data-add-save>Сохранить товар</button><button type="button" class="btn btn--link pc-draft" data-add-draft>Сохранить как черновик</button>';
  }
  /* фото товара (ТЗ 05: «загрузка фото»): до 6 штук, уменьшаются до 480 px и хранятся в этом браузере; первое — обложка */
  function photosHTML() {
    var ph = st.addPhotos || [];
    return ph.map(function (src, i) { return '<span class="pc-ph"><img src="' + src + '" alt="Фото ' + (i + 1) + '"><button type="button" data-ph-del="' + i + '" aria-label="Убрать фото ' + (i + 1) + '">×</button></span>'; }).join('') +
      (ph.length < 6 ? '<label class="pc-ph is-add">' + ic('plus', 18) + '<small>Добавить фото</small><input type="file" accept="image/*" multiple id="g-photo-in" hidden></label>' : '');
  }
  function shrink(file, done) {
    if (!/^image\//.test(file.type)) return ui.toast('Это не фото: выберите JPG или PNG', 'error');
    var r = new FileReader();
    r.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.82)); }; im.onerror = function () { ui.toast('Не удалось открыть фото', 'error'); }; im.src = r.result; };
    r.readAsDataURL(file);
  }
  function bindPhotos() {
    var box = root.querySelector('#g-photos'); if (!box) return;
    var redraw = function () { box.innerHTML = photosHTML(); bindPhotos(); };
    var inp = box.querySelector('#g-photo-in');
    if (inp) inp.addEventListener('change', function () { Array.prototype.slice.call(inp.files || [], 0, 6).forEach(function (file) { shrink(file, function (url) { st.addPhotos = (st.addPhotos || []).concat([url]).slice(0, 6); redraw(); }); }); });
    box.querySelectorAll('[data-ph-del]').forEach(function (b) { b.addEventListener('click', function () { st.addPhotos.splice(Number(b.getAttribute('data-ph-del')), 1); redraw(); }); });
  }
  function goodsForm(g) {
    var status = g.status;
    ui.modal({ title: 'Редактировать', text: 'После сохранения позиция уйдёт на проверку менеджеру SOVEAPP.', html: [['name', 'Название', g.name]].concat(cfg().goodsFields.map(function (x) { return [x[0], x[1], (g.edit && g.edit[x[0]]) || (x[0] === 'sizes' ? g.sizes || '' : ''), x[2]]; })).concat([['priceRetail', (mainType() === 'custom' ? 'Базовая цена «от», ₽' : 'Розничная цена, ₽') + (cfg().priceNote ? ' за м²' : ''), g.priceRetail != null ? g.priceRetail : ''], ['priceSove', 'Цена для клиентов SOVEAPP, ₽' + (cfg().priceNote ? ' за м²' : ''), g.priceSove != null ? g.priceSove : '']]).map(function (f) { return '<div class="field"><label for="g-' + f[0] + '">' + f[1] + '</label><input class="input" id="g-' + f[0] + '" value="' + esc(String(f[2])) + '"' + (f[3] ? ' placeholder="' + esc(f[3]) + '"' : '') + (/price/.test(f[0]) ? ' inputmode="decimal"' : '') + '></div>'; }).join('') +
        '<div class="field"><label>Статус</label><div class="pc-chips" id="g-status">' + Object.keys(X.STATUS).map(function (k) { return '<button type="button" class="pc-chip' + (status === k ? ' is-on' : '') + '" data-gs="' + k + '">' + X.STATUS[k] + '</button>'; }).join('') + '</div></div>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var name = api.el.querySelector('#g-name').value.trim(); if (name.length < 2) return ui.toast('Укажите название', 'error'); var patch = { name: name, priceRetail: api.el.querySelector('#g-priceRetail').value, priceSove: api.el.querySelector('#g-priceSove').value, status: status, brand: brandTitle(), own: g.own }; cfg().goodsFields.forEach(function (x) { var inp = api.el.querySelector('#g-' + x[0]); if (inp) patch[x[0]] = inp.value.trim(); }); X.edits.submit(g.ref, patch); ui.toast('Сохранено и отправлено на проверку', 'ok'); api.close(); paint(); } }, { label: 'Отмена', kind: 'link' }] });
    document.querySelectorAll('.modal #g-status [data-gs]').forEach(function (b) { b.addEventListener('click', function () { status = b.getAttribute('data-gs'); document.querySelectorAll('.modal #g-status [data-gs]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
  }

  /* ---------- экраны 6–7: заказы ---------- */
  /* быстрое действие в строке заказа (ТЗ, экран 06: «быстрые действия с подтверждением») — следующий шаг, если он за партнёром */
  function quickAct(o) { return O.needsSupplier(o) ? (o.actions.supplier || []).filter(function (a) { return a.status !== 'cancelled'; })[0] || null : null; }
  function orderFilter() { return FILTERS.some(function (x) { return x[0] === st.filter; }) ? st.filter : (st.filter = 'all'); }
  function findOrders(list) { var q = (st.q || '').toLowerCase(); return list.filter(function (o) { return !q || o.id.toLowerCase().indexOf(q) >= 0 || o.items.some(function (it) { return it.name.toLowerCase().indexOf(q) >= 0; }); }); }
  function filterChips(list, f) { return '<div class="pc-chips">' + FILTERS.map(function (x) { return '<button type="button" class="pc-chip' + (f === x[0] ? ' is-on' : '') + '" data-filter="' + x[0] + '">' + x[1] + ' <i>' + orderGroup(x[0], list).length + '</i></button>'; }).join('') + '</div>'; }
  function tabOrders() {
    var list = myOrders(), f = orderFilter(), shown = findOrders(orderGroup(f, list));
    return filterChips(list, f) +
      '<label class="pc-search">' + ic('search', 16) + '<input id="pc-q" placeholder="Поиск по номеру заказа…" aria-label="Поиск по номеру заказа" value="' + esc(st.q || '') + '"></label>' +
      (shown.length ? '<div class="stack stack--2">' + shown.map(function (o) { var qa = quickAct(o); return '<div class="pc-orow"><button type="button" class="pc-row" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b>№' + shortId(o.id) + '</b><span>' + F.dateLong(o.ts) + '</span><span class="pc-sum">' + ic('wallet', 12) + ' ' + F.rub(o.total) + '</span><span>' + pill(o) + '</span></span><i>›</i></button>' + (qa ? '<button type="button" class="pc-btn pc-btn--sm pc-quickact" data-quick="' + qa.status + '" data-oid="' + o.id + '">' + esc(qa.label) + '</button>' : '') + '</div>'; }).join('') + '</div>' : '<p class="small muted">' + (list.length ? 'В этом списке заказов нет.' : 'Заказов пока нет. Они появятся, когда покупатель оформит корзину с вашими товарами.') + '</p>');
  }
  /* детали заказа как на экране 07: статус и время, покупатель с телефоном, товары и итоги, дополнительные поля типа,
     затем «Подтвердить заказ» · «Написать клиенту» · «Предложить изменение» (ТЗ: подтвердить, предложить изменение, написать) */
  /* заказ — три вкладки (Вика 05.11): «Заказ» как был, «Логистика» — согласование доставки с клиентом, «Документы» — договор, счёт, акт и оплаты */
  function orderTab(o) { return st.orderTabId === o.id && st.orderTab ? st.orderTab : 'main'; }
  function orderScreen(o) {
    var tab = orderTab(o), nd = X.docs.list(o.id).filter(function (d) { return d.name; }).length;
    var head = '<div class="pc-orderhead">' + pill(o) + '<span class="line--f">' + F.dateLong(o.ts) + ', ' + new Date(o.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
      '<div class="pc-tabs2 pc-otabs">' + [['main', 'Заказ'], ['logistics', 'Логистика'], ['docs', 'Документы' + (nd ? ' · ' + nd : '')]].map(function (t) {
        return '<button type="button" class="' + (tab === t[0] ? 'is-on' : '') + '" data-otab="' + t[0] + '" data-oid="' + o.id + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'logistics') return head + logisticsCard(o);
    if (tab === 'docs') return head + docsCard(o);
    var acts = (o.actions.supplier || []).filter(function (a) { return a.status !== 'cancelled'; }), goods = o.items.reduce(function (s, it) { return s + it.lineTotal; }, 0);
    return head +
      '<div class="pc-card pc-client"><i class="pc-ic">' + ic('profile', 18) + '</i><div class="grow"><b>' + esc(o.buyerName || o.client || 'Покупатель') + '</b><span class="pc-phone">' + ic('phone', 12) + ' +7 999 000-00-77</span></div><a class="pc-roundbtn" href="tel:+79990000077" aria-label="Позвонить покупателю">' + ic('phone', 16) + '</a></div>' +
      '<b class="pc-h4">Товары в заказе (' + o.items.length + ')</b><div class="pc-card">' + o.items.map(function (it) { return '<div class="pc-oi"><span class="pc-ord__pic">' + (it.img ? '<img src="' + it.img + '" alt="">' : ic('box', 18)) + '</span><span class="pc-ord__b"><b>' + esc(it.name) + '</b><span>' + it.qty + ' шт. × ' + F.rub(it.unitPrice) + '</span></span><b>' + F.rub(it.lineTotal) + '</b></div>'; }).join('') +
        '<div class="pc-totals"><div><span>Итого за товары</span><b>' + F.rub(goods) + '</b></div><div><span>Доставка</span><b>' + esc(o.fields.deliveryMethod || 'по согласованию') + '</b></div><div class="is-sum"><span>Сумма заказа</span><b>' + F.rub(o.fields.finalPrice ? Number(o.fields.finalPrice) : o.total) + '</b></div></div></div>' +
      typeCard(o) +
      acts.map(function (a, i) { return '<button type="button" class="pc-btn' + (i ? ' pc-btn--ghost' : '') + '" data-act="' + a.status + '" data-oid="' + o.id + '">' + esc(a.label === 'Подтвердить' ? 'Подтвердить заказ' : a.label) + '</button>'; }).join('') +
      '<a class="pc-btn pc-btn--ghost" href="chats.html?kind=partner">Написать клиенту</a><a class="pc-btn pc-btn--ghost" href="chats.html?kind=partner">Предложить изменение</a>' +
      (o.review ? '<div class="pc-card"><b class="pc-card__t">Отзыв</b><span class="line">Товар ' + '★'.repeat(o.review.productRating) + ' · вы ' + '★'.repeat(o.review.supplierRating) + (o.review.text ? ' · «' + esc(o.review.text) + '»' : '') + '</span>' + (o.review.reply ? '<span class="line--f">Ваш ответ: ' + esc(o.review.reply) + '</span>' : '<div class="row"><input class="input" data-reply-in="' + o.id + '" placeholder="Ответить публично"><button type="button" class="btn btn--primary btn--small" data-reply="' + o.id + '">Ответить</button></div>') + '</div>' : '') +
      (/^(delivered|installed|done)$/.test(o.status) ? '<button type="button" class="btn btn--link" data-auto="' + o.id + '">Прототип: прошло 7 дней</button>' : '');
  }
  /* карточка по типу: Retail — доставка; Materials — расчёт по площади; Custom — карточка проекта и этапы производства */
  function typeCard(o) {
    var f = o.fields, C = TYPE_CFG[O.typeInfo(o.scenario).key] || cfg(), row = function (k, v) { return v ? '<div class="pc-spec"><span>' + esc(k) + '</span><b>' + v + '</b></div>' : ''; };
    if (C.orderCard === 'calc') {
      var c = calcFor(o), need = c.need, packs = f.packs || (need ? c.packs : '');
      return '<div class="pc-card"><b class="pc-card__t">Расчёт</b>' + row('Площадь из заявки', esc(f.area || '')) + row('Запас', c.reserve + ' %') + row('Нужно с запасом', need ? dec(need) + ' м²' : '') + row('Упаковок', packs ? esc(String(packs)) + (f.packs ? '' : ' · по ' + dec(c.packArea) + ' м²') : '') + row('Количество', f.quantity ? esc(f.quantity) : '') + row('Партия / тон', esc(f.batch || '')) + row('Цена за м²', o.items[0] ? F.rub(o.items[0].unitPrice) : '') + row('Итог расчёта', f.finalPrice ? F.rub(Number(f.finalPrice)) : '') + row('Срок', esc(f.eta || '')) + row('Спецификация', esc(f.specNote || '')) + (f.finalPrice ? '' : '<span class="line--f">Пришлите расчёт кнопкой ниже: количество, упаковки, партия, цена и срок.</span>') + '</div>';
    }
    if (C.orderCard === 'project') {
      var stages = (O.scenario(o.scenario).production_stages || ['Материалы', 'Изготовление', 'Проверка']), cur = stageOf(o), live = o.status === 'in_production';
      return '<div class="pc-card"><b class="pc-card__t">Карточка проекта</b>' + row('Размеры и параметры', esc(f.sizes || '')) + row('Бюджет клиента', esc(f.budget || '')) + row('Пожелания', esc(f.request || '')) + row('Замер', measureDate(o) ? esc(measureDate(o)) + (o.status === 'measurement_scheduled' ? ' <button type="button" class="pc-link" data-measure="' + o.id + '">перенести</button>' : '') : '') + row('КП', f.finalPrice ? F.rub(Number(f.finalPrice)) : '') + row('Спецификация', esc(f.specNote || '')) + row('Срок изготовления', esc(f.eta || '')) + row('Заметка', esc(f.note || '')) +
        '<span class="line">Этапы производства</span><div class="pc-chips">' + stages.map(function (sName) { return live ? '<button type="button" class="pc-chip pc-chip--sm' + (cur === sName ? ' is-on' : '') + '" data-stage="' + esc(sName) + '" data-oid="' + o.id + '">' + esc(sName) + '</button>' : '<span class="pc-chip pc-chip--sm' + (cur === sName && /^(shipped|delivered|installed|received)$/.test(o.status) ? ' is-on' : '') + '">' + esc(sName) + '</span>'; }).join('') + '</div>' + (live ? '<span class="line--f">Нажмите этап — покупатель видит прогресс изготовления.</span>' : '') + '</div>';
    }
    if (!(f.deliveryMethod || f.carrier || f.tracking || f.eta)) return '';
    return '<div class="pc-card"><b class="pc-card__t">Доставка</b>' + row('Способ', esc(f.deliveryMethod || '')) + row('Перевозчик', esc(f.carrier || '')) + row('Трек-номер', esc(f.tracking || '')) + row('Срок', esc(f.eta || '')) + '</div>';
  }
  /* «Логистика»: поставщик предлагает способ, адрес, дату и время — клиент подтверждает; согласованное видят оба (Вика 05.11) */
  var LG_STATE = { draft: ['Не согласовано', 'pill--warn'], proposed: ['Ждём ответ клиента', 'pill--blue'], agreed: ['Согласовано с клиентом', 'pill--ok'] }, LG_WIN = ['9–13', '13–18', '18–21'];
  function lgMethods(o) { return O.typeInfo(o.scenario).key === 'custom' ? ['Доставка и монтаж', 'Только доставка', 'Самовывоз'] : ['Курьер поставщика', 'Транспортная компания', 'Самовывоз со склада']; }
  function lgOf(o) {
    var ob = (O.object && O.object.get && O.object.get()) || {}, m = lgMethods(o);
    var a0 = o.address && !/^квартира|м²/i.test(o.address) ? o.address : '';   /* «Квартира · 47 м²» из заявки — не адрес */
    return Object.assign({ method: m.indexOf(o.fields.deliveryMethod) >= 0 ? o.fields.deliveryMethod : m[0], addr: a0 || [ob.city, ob.address].filter(Boolean).join(', '), date: '', win: '', lift: false, note: '', state: 'draft' }, X.logistics.get(o.id) || {});
  }
  function logisticsCard(o) {
    var L = lgOf(o), s = LG_STATE[L.state] || LG_STATE.draft, lock = L.state !== 'draft', dis = lock ? ' disabled' : '', pick = /^Самовывоз/.test(L.method);
    var chip = function (attr, v, on) { return '<button type="button" class="pc-chip' + (on ? ' is-on' : '') + '" ' + attr + '="' + esc(v) + '" data-oid="' + o.id + '" aria-pressed="' + on + '"' + dis + '>' + esc(v) + '</button>'; };
    var row = function (k, v) { return v ? '<div class="pc-spec"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>' : ''; };
    return '<div class="pc-card pc-lg"><div class="pc-sec"><b class="pc-card__t">Доставка клиенту</b><span class="pill ' + s[1] + '">' + s[0] + '</span></div>' +
      '<span class="line">Способ</span><div class="pc-chips">' + lgMethods(o).map(function (m) { return chip('data-lg-method', m, L.method === m); }).join('') + '</div>' +
      (pick ? '' : '<div class="field"><label for="lg-addr">Адрес</label><input class="input" id="lg-addr" value="' + esc(L.addr) + '" placeholder="Город, улица, дом, квартира"' + dis + '></div>') +
      '<div class="field"><label for="lg-date">Дата</label><input class="input" id="lg-date" type="date" min="' + new Date().toISOString().slice(0, 10) + '" value="' + esc(L.date) + '"' + dis + '></div>' +
      '<span class="line">Время</span><div class="pc-chips">' + LG_WIN.map(function (w) { return chip('data-lg-win', w, L.win === w); }).join('') + '</div>' +
      (pick ? '' : '<label class="pc-lg__lift"><input type="checkbox" id="lg-lift"' + (L.lift ? ' checked' : '') + dis + '> Подъём на этаж</label>') +
      '<div class="field"><label for="lg-note">Комментарий клиенту</label><input class="input" id="lg-note" value="' + esc(L.note) + '" placeholder="Например: позвоним за час до приезда"' + dis + '></div>' +
      (L.state === 'draft' ? '<button type="button" class="pc-btn" data-lg="propose" data-oid="' + o.id + '">Предложить клиенту</button>'
        : L.state === 'proposed' ? '<span class="line--f">Клиент видит предложение в своём заказе и подтверждает его или просит другое время.</span>' +
          '<button type="button" class="pc-btn pc-btn--ghost" data-lg="edit" data-oid="' + o.id + '">Изменить предложение</button><button type="button" class="btn btn--link" data-lg="agree" data-oid="' + o.id + '">Прототип: клиент согласовал</button>'
        : '<button type="button" class="pc-btn pc-btn--ghost" data-lg="edit" data-oid="' + o.id + '">Изменить договорённость</button>') + '</div>' +
      (o.fields.carrier || o.fields.tracking || o.fields.eta ? '<div class="pc-card"><b class="pc-card__t">Отправка</b>' + row('Перевозчик', o.fields.carrier) + row('Трек-номер', o.fields.tracking) + row('Срок', o.fields.eta) + '</div>' : '');
  }
  /* «Документы»: договор, счёт и акт по заказу — загрузить, отправить клиенту, клиент подписал; оплаты — из истории заказа (Вика 05.11) */
  var DOC_KINDS = [['contract', 'Договор'], ['invoice', 'Счёт на оплату'], ['act', 'Акт приёма-передачи']];
  var DOC_STATE = { uploaded: ['Загружен', 'pill--blue'], sent: ['У клиента на согласовании', 'pill--warn'], signed: ['Подписан клиентом', 'pill--ok'] };
  function docFile(oid, kind, label, cls) { return '<label class="pc-btn ' + (cls || 'pc-btn--sm pc-btn--ghost') + '">' + label + '<input type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" data-doc-file="' + oid + '" data-kind="' + kind + '"></label>'; }
  function docsCard(o) {
    var paid = (o.history || []).filter(function (h) { return h.status === 'paid'; })[0], total = o.fields.finalPrice ? Number(o.fields.finalPrice) : o.total;
    var row = function (d, title) {
      var s = d && DOC_STATE[d.state], act = !d || !d.name ? docFile(o.id, d ? d.kind : title[0], 'Загрузить')
        : d.state === 'uploaded' ? '<button type="button" class="pc-btn pc-btn--sm" data-doc-send="' + d.id + '" data-oid="' + o.id + '">Отправить клиенту</button>'
        : d.state === 'sent' ? '<button type="button" class="btn btn--link" data-doc-sign="' + d.id + '" data-oid="' + o.id + '">Прототип: клиент подписал</button>' : '';
      return '<div class="pc-doc"><span class="pc-doc__b"><b>' + esc(title[1]) + '</b><span>' + (d && d.name ? esc(d.name) + ' · ' + F.date(d.ts) : 'файла пока нет') + '</span>' +
        (s ? '<span class="pill ' + s[1] + '">' + s[0] + '</span>' : '') + '</span>' + act + '</div>';
    };
    var others = X.docs.list(o.id).filter(function (d) { return d.kind === 'other'; });
    return '<div class="pc-card pc-docs"><b class="pc-card__t">Документы по заказу</b>' +
      DOC_KINDS.map(function (k) { return row(X.docs.get(o.id, k[0]) || null, k); }).join('') +
      others.map(function (d) { return row(d, ['other', 'Файл']); }).join('') +
      docFile(o.id, 'other', ic('plus', 16) + ' Добавить файл', 'pc-btn--ghost') + '</div>' +
      '<div class="pc-card"><b class="pc-card__t">Оплаты</b><div class="pc-spec"><span>' + (paid ? 'Оплачено через SOVEAPP · ' + F.date(paid.at) : 'Ждём оплату клиента') + '</span><b>' + F.rub(total) + '</b></div></div>' +
      '<span class="line--f">Клиент видит эти документы в своём заказе. Переписка по заказу — в «Сообщениях».</span>';
  }
  function actionSheet(o, a) {
    var labels = o.fieldLabels, fields = a.fields || [];
    if (!fields.length && !a.needsReason) return doAct(o, a, {});
    var pre = prefill(o, a), m = ui.modal({ title: a.label, text: a.hint, html: fields.map(function (k) { return '<div class="field"><label for="f-' + k + '">' + esc(labels[k] || k) + '</label>' + (k === 'specNote' || k === 'note' ? '<textarea class="input" id="f-' + k + '" rows="3"></textarea>' : '<input class="input" id="f-' + k + '" placeholder="' + (/Date$/.test(k) ? 'ДД.ММ.ГГГГ' : k === 'finalPrice' ? '0' : '') + '">') + '</div>'; }).join('') + (a.needsReason ? '<div class="field"><label for="f-reason">Причина</label><input class="input" id="f-reason"></div>' : ''),
      actions: [{ label: 'Подтвердить', kind: 'primary', close: false, onClick: function (ev, api) { var vals = {}; fields.forEach(function (k) { vals[k] = api.el.querySelector('#f-' + k).value; }); var reason = a.needsReason ? api.el.querySelector('#f-reason').value.trim() : ''; if (doAct(o, a, vals, reason)) api.close(); } }, { label: 'Отмена', kind: 'link' }] });
    if (pre) Object.keys(pre).forEach(function (k) { var el = document.querySelector('.modal #f-' + k); if (el && pre[k]) el.value = pre[k]; });
    return m;
  }
  /* Materials: «Рассчитать заявку» предзаполняется из калькулятора — количество, упаковки, сумма по цене за м² */
  function prefill(o, a) {
    if (a.status !== 'spec_sent' || (TYPE_CFG[O.typeInfo(o.scenario).key] || {}).orderCard !== 'calc') return null;
    var c = calcFor(o); if (!c.need) return null;
    var unit = o.items[0] ? o.items[0].unitPrice : 0;
    return { quantity: c.need + ' м²', packs: String(c.packs), finalPrice: unit ? String(Math.round(c.packs * c.packArea * unit)) : '' };
  }
  function doAct(o, a, fields, reason) { try { O.setStatus(o.id, a.status, 'supplier', { fields: fields, reason: reason }); ui.toast('Статус обновлён, покупатель видит его сразу', 'ok'); paint(); return true; } catch (e) { ui.toast(e.message, 'error'); return false; } }

  /* ---------- экран 9: финансы — к выплате, выплачено, ожидают выплаты, оборот за период, последние выплаты; ниже — выплаты
     по заказам с комиссией (ТЗ: детализация сумм и комиссий). Платёжную схему экран не обещает (ТЗ, п. 9) ---------- */
  function tabFinance() {
    var list = myOrders(), fin = O.finance(list), received = list.filter(function (o) { return o.status === 'received'; }), cur = inPeriod(list), fc = O.finance(cur), pf = O.finance(inPrev(list));
    var mon = monthOf(st.finMonth || 0), inMon = function (o) { return (o.updated || o.ts || 0) >= mon.from && (o.updated || o.ts || 0) < mon.to; }, paidM = received.filter(inMon);
    return '' +
      '<div class="pc-two"><div class="pc-card pc-card--acc"><small>К выплате</small><b class="pc-mid">' + F.rub(fin.awaitingPayout) + '</b><span class="line--f">' + 'Подготовлены к выплате' + '</span></div><div class="pc-card"><small>Выплачено</small><b class="pc-mid">' + F.rub(0) + '</b><span class="line--f">За ' + esc(mon.label) + '</span></div></div>' +
      '<div class="pc-card pc-client"><i class="pc-ic">' + ic('wallet', 16) + '</i><div class="grow"><small>Ожидают выплаты</small><b class="pc-mid">' + F.rub(fin.awaitingPayout) + '</b><span class="line--f">' + received.length + ' ' + plural(received.length, ['заказ', 'заказа', 'заказов']) + '</span></div></div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Оборот</b>' + periodSel() + '</div><b class="pc-big">' + F.rub(fc.total) + '</b>' + trend(fc.total, pf.total, cur.length ? 'за выбранный период' : 'заказов пока нет', true) + spark(daily(cur, st.period || 30), 96) + '</div>' +
      '<div class="pc-sec"><b>Последние выплаты</b><button type="button" class="pc-link" data-open-payouts>Все</button></div><div class="pc-card">' + (paidM.length ? paidM.slice(0, 5).map(function (o) { return '<div class="pc-spec"><span>' + F.dateLong(o.updated || o.ts) + '</span><b>' + F.rub(o.supplierAmount) + '</b><span class="pill pill--dot pill--warn">В обработке</span></div>'; }).join('') : '<span class="line--f">За ' + esc(mon.label) + ' выплат нет: выплата формируется, когда покупатель отметил «Получен».</span>') + '</div>';
  }

  /* месяц для «Финансов» (ТЗ 09: выбор периода) — текущий и пять прошлых */
  function monthOf(back) { var d = new Date(), a = new Date(d.getFullYear(), d.getMonth() - back, 1), b = new Date(d.getFullYear(), d.getMonth() - back + 1, 1), l = a.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''); return { from: a.getTime(), to: b.getTime(), label: l }; }
  function monthSel() { var cur = st.finMonth || 0; return '<span class="pc-select pc-select--sm"><select data-month aria-label="Месяц">' + [0, 1, 2, 3, 4, 5].map(function (i) { var m = monthOf(i).label; return '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + esc(m.charAt(0).toUpperCase() + m.slice(1)) + '</option>'; }).join('') + '</select>' + ic('chev', 14) + '</span>'; }
  /* «Все» выплаты (ТЗ 09: фильтр статусов, детализация сумм и комиссий): сумма заказа, комиссия SOVEAPP и к выплате по каждому заказу */
  var PAY = [['all', 'Все'], ['wait', 'Ожидают'], ['ready', 'В обработке'], ['back', 'Возвраты']];
  function payGroup(k, list) { return k === 'wait' ? list.filter(function (o) { return !/^(received|return|cancelled)$/.test(o.status); }) : k === 'ready' ? list.filter(function (o) { return o.status === 'received'; }) : k === 'back' ? list.filter(function (o) { return /^(return|cancelled)$/.test(o.status); }) : list; }
  function payoutsScreen() {
    var list = myOrders(), f = PAY.some(function (x) { return x[0] === st.payF; }) ? st.payF : 'all', shown = payGroup(f, list);
    return '<div class="pc-chips">' + PAY.map(function (x) { return '<button type="button" class="pc-chip' + (f === x[0] ? ' is-on' : '') + '" data-payf="' + x[0] + '">' + x[1] + ' <i>' + payGroup(x[0], list).length + '</i></button>'; }).join('') + '</div>' +
      (shown.length ? '<div class="stack stack--2">' + shown.map(function (o) { return '<div class="pc-row pc-row--static"><span class="pc-ord__b"><b>№' + shortId(o.id) + ' · ' + title(o) + '</b><span>' + F.dateLong(o.ts) + ' · ' + F.rub(o.total) + ' · комиссия ' + F.rub(o.commissionAmount) + '</span></span><span class="pc-ord__r"><b>' + F.rub(o.supplierAmount) + '</b>' + pill(o) + '</span></div>'; }).join('') + '</div>' : '<p class="small muted">' + (list.length ? 'В этом списке выплат нет.' : 'Заказов пока нет.') + '</p>');
  }

  /* ---------- экран 10: профиль компании — пункты как на макете; зона и условия доставки — внутри «Склады и доставка» ---------- */
  function tabProfile(desktop) {
    var bs = brands().slice(0, 4), mgr = O.requests.list().filter(function (r) { return r.kind === 'manager'; }), ev = [], app = lead() || {};
    O.list().forEach(function (o) { o.history.forEach(function (h) { if (h.actor !== 'supplier') ev.push({ at: h.at, text: 'заказ ' + shortId(o.id) + ' · ' + (h.actor === 'buyer' ? 'покупатель' : 'система') + ': ' + O.statusLabel(o.scenario, h.status || h.action) + (h.reason ? ' · ' + h.reason : '') }); }); });
    ev.sort(function (a, b) { return b.at - a.at; });
    var verified = bs.some(function (b) { return b.items > 0; }) || !!app.company;
    var rows = [['company', 'building', 'Информация о компании'], ['contacts', 'phone', 'Контакты'], ['payout', 'card', 'Реквизиты и выплаты'], ['warehouses', 'box', 'Склады и доставка'], ['users', 'users', 'Пользователи', X.employees.list().length + 1], ['notifications', 'bell', 'Уведомления', ev.length], ['integrations', 'plug', 'Интеграции'], ['support', 'help', 'Поддержка']].filter(function (r) { return X.access.can('admin') || (r[0] !== 'users' && r[0] !== 'payout'); });
    var body = {
      company: function () { return '<div class="pc-spec"><span>Компания</span><b>' + esc(brandName()) + '</b></div>' + (app.category ? '<div class="pc-spec"><span>Категория</span><b>' + esc(app.category) + '</b></div>' : '') + bs.map(function (b) { return '<div class="pc-spec"><span>' + esc(st.demo && b.name === st.brand ? brandName() : b.name) + '</span><b>комиссия ' + O.profiles.get(b.name).commissionPct + ' %</b></div>'; }).join(''); },
      contacts: function () { return '<div class="pc-spec"><span>Телефон</span><b>' + esc(st.phone) + '</b></div>' + (app.contact ? '<div class="pc-spec"><span>Контакт</span><b>' + esc(app.contact) + '</b></div>' : '') + '<span class="line--f">Изменить контакты — через менеджера (форма в «Поддержке»).</span>'; },
      payout: function () { return '<span class="line">Реквизиты для выплат передайте менеджеру — он внесёт их в договор. Платёжная схема описывается договором, а не этим экраном.</span>'; },
      warehouses: warehousesBlock,
      users: usersBlock,
      notifications: function () { return ev.length ? ev.slice(0, 8).map(function (e) { return '<span class="hist">' + new Date(e.at).toLocaleString('ru-RU') + ' · ' + esc(e.text) + '</span>'; }).join('') : '<span class="line--f">Событий по заказам пока нет.</span>'; },
      integrations: integrationsBlock,
      support: function () { return '<div class="pc-chips">' + TOPICS.map(function (t, i) { return '<button type="button" class="pc-chip' + (i === 0 ? ' is-on' : '') + '" data-topic="' + t + '">' + t + '</button>'; }).join('') + '</div><textarea class="input" id="mg-text" rows="2" placeholder="Вопрос менеджеру"></textarea><button type="button" class="pc-btn" id="mg-send">Отправить</button>' + mgr.map(function (r) { return '<div class="stack stack--1" style="border-top:1px solid var(--line);padding-top:8px"><span class="line">' + esc(r.topic) + ': ' + esc(r.text) + '</span><span class="line--f">' + F.dateLong(r.ts) + (r.reply ? ' · ответ: ' + esc(r.reply) : ' · ждёт ответа') + '</span></div>'; }).join(''); }
    };
    if (desktop) return dProfileMarkup(rows, body, verified);
    return '<div class="pc-card pc-prof"><span class="pc-ava pc-ava--lg">' + esc(brandName().charAt(0).toUpperCase()) + '</span><div class="grow"><b>' + esc(brandName()) + '</b><span class="pc-verified">' + ic('check', 13) + ' ' + (verified ? 'Проверенный партнёр' : 'Новый партнёр · заявка на модерации') + '</span><button type="button" class="pc-btn pc-btn--sm pc-btn--ghost" data-prof="company">Редактировать</button></div></div>' +
      (function () {
        var mrow = function (r) { var open = st.profOpen === r[0]; return '<button type="button" class="pc-menu__r' + (open ? ' is-open' : '') + '" data-prof="' + r[0] + '"><i class="pc-ic pc-ic--round">' + ic(r[1], 17) + '</i><span>' + r[2] + '</span>' + (r[3] ? '<em>' + r[3] + '</em>' : '') + '<b>' + (open ? '⌃' : '›') + '</b></button>' + (open ? '<div class="pc-menu__body">' + body[r[0]]() + '</div>' : ''); };
        return '<div class="pc-card pc-menu">' + rows.filter(function (r) { return r[0] !== 'support'; }).map(mrow).join('') + '</div><div class="pc-card pc-menu">' + rows.filter(function (r) { return r[0] === 'support'; }).map(mrow).join('') + '</div>' +
          '<div class="pc-card pc-menu"><button type="button" class="pc-menu__r pc-menu__r--out" data-out><i class="pc-ic pc-ic--round">' + ic('out', 17) + '</i><span>Выйти из кабинета</span></button></div>';
      })();
  }
  /* «Склады и доставка»: склады из остатков товаров и зона доставки (покупатель видит её в карточке товара, корзине и заказе) */
  function warehousesBlock() {
    var wh = {}; goodsItems().forEach(function (g) { X.stocks.list(g.ref).forEach(function (r) { wh[r.warehouse] = (wh[r.warehouse] || 0) + 1; }); });
    var names = Object.keys(wh);
    return '<b class="line">Склады</b>' + (names.length ? names.map(function (n) { return '<div class="pc-spec"><span class="pc-spec--ink">' + esc(n) + '</span><b>' + wh[n] + ' ' + plural(wh[n], ['товар', 'товара', 'товаров']) + '</b></div>'; }).join('') : '<span class="line--f">Склады появятся, когда укажете остатки в «Управление остатками» у товара.</span>') +
      '<b class="line">Доставка</b>' + deliveryBlock();
  }
  function deliveryBlock() {
    var brand = brandTitle(), d = X.delivery.get(brand), app = lead() || {}, cur = d || { zones: [], other: '', note: '' };
    return '<span class="line--f">Куда доставляете. Покупатель видит зону в карточке товара, корзине и заказе; вне зоны — предупреждение до оформления.</span><div class="pc-chips" id="dz-zones">' + X.delivery.ZONES.map(function (z) { return '<button type="button" class="pc-chip pc-chip--sm' + (cur.zones.indexOf(z.key) >= 0 ? ' is-on' : '') + '" data-zone="' + z.key + '">' + esc(z.label) + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label for="dz-other">Другие города</label><input class="input" id="dz-other" placeholder="Тверь, Калуга" value="' + esc(d ? cur.other : (app.region || '')) + '"></div>' +
      '<div class="field"><label for="dz-note">Условия доставки</label><input class="input" id="dz-note" placeholder="от 10 000 ₽ бесплатно, 1–2 дня" value="' + esc(d ? cur.note : (app.delivery || '')) + '"></div>' +
      (d ? '<div class="pc-spec"><span>Покупатель видит</span><b>' + esc(X.delivery.label(brand) || 'только условия') + '</b></div>' : '<span class="line--f pc-err">Зона не указана — покупатель видит «доставка уточняется».</span>') +
      '<button type="button" class="pc-btn" data-zone-save>Сохранить зону</button>';
  }
  function cityOf(address) { var c = String(address || '').split(' · ')[0].trim(); return !c || /^квартира/i.test(c) || /м²/.test(c) ? '' : c; }
  function usersBlock() {
    var list = X.employees.list();
    return '<div class="pc-spec"><span class="pc-spec--ink">Вы · владелец</span><b>' + esc(st.phone) + '</b></div>' +
      list.map(function (e) { return '<div class="pc-emp"><div class="row row--between"><div><b>' + esc(e.label) + '</b><span class="small muted"> · ' + esc(e.phone) + '</span></div><div class="row"><button type="button" class="btn btn--ghost btn--small" data-emp-login="' + e.id + '">Войти как</button><button type="button" class="btn btn--link" data-emp-del="' + e.id + '">Убрать</button></div></div><div class="pc-chips">' + secs().map(function (k) { return '<button type="button" class="pc-chip pc-chip--sm' + (e.sections.indexOf(k) >= 0 ? ' is-on' : '') + '" data-emp-sec="' + e.id + '" data-sec="' + k + '">' + X.SECTION_LABEL[k] + '</button>'; }).join('') + '</div></div>'; }).join('') +
      '<span class="line--f">Сотрудник входит в этот же кабинет по своему телефону и видит только отмеченные разделы. Главная и профиль открыты всем.</span>' +
      '<div class="field"><label for="emp-phone">Телефон сотрудника</label><input class="input" id="emp-phone" type="tel" placeholder="+7 999 000-00-00"></div><div class="field"><label for="emp-label">Имя или роль</label><input class="input" id="emp-label" placeholder="Менеджер склада"></div>' +
      '<div class="field"><label>Доступ нового сотрудника</label><div class="pc-chips" id="emp-new-secs">' + secs().map(function (k) { return '<button type="button" class="pc-chip pc-chip--sm' + (k !== 'admin' ? ' is-on' : '') + '" data-new-sec="' + k + '">' + X.SECTION_LABEL[k] + '</button>'; }).join('') + '</div></div>' +
      '<button type="button" class="pc-btn" id="emp-add">Добавить сотрудника</button>';
  }
  function integrationsBlock() {
    var fd = X.feed.get();
    return '<b class="line">YML-фид (Яндекс.Маркет)</b>' +
      (fd ? '<span class="small muted">' + esc(fd.url) + '</span><span class="line">Последний импорт ' + new Date(fd.lastRun).toLocaleString('ru-RU') + ': ' + fd.lastResult.total + ' позиций · новых ' + fd.lastResult.created + ' · обновлено ' + fd.lastResult.updated + ' · без изменений ' + fd.lastResult.skipped + '</span><button type="button" class="btn btn--ghost btn--small" data-feed-refresh>Обновить из фида</button>' : '<span class="line">Укажите ссылку на фид: позиции появятся в «Товары и цены» и уйдут на проверку менеджеру. Повторный импорт обновит цены и наличие.</span>') +
      '<div class="field"><label for="feed-url">Ссылка на YML-фид</label><input class="input" id="feed-url" inputmode="url" placeholder="https://…/feed.xml"></div><button type="button" class="pc-btn" id="feed-import">' + (fd ? 'Сменить фид и импортировать' : 'Импортировать фид') + '</button>' +
      '<span class="line--f">МойСклад и 1С подключаются по запросу: нужны доступы к вашему аккаунту, менеджер свяжется. В прототипе импорт имитируется учебными позициями.</span>';
  }

  /* ---------- версия для компьютера (≥ 1100 px) — по референсу Вики: сайдбар, шапка с поиском и аватаром, плитки, таблицы, заказы в три колонки с перепиской ---------- */
  var DESK_MQ = window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null;
  function isDesktop() { return !!(DESK_MQ && DESK_MQ.matches); }
  var ORD_SUB = 'Обработка новых заказов, подтверждение и контроль доставки';
  function dShell(inner) {
    return empStripe() +
      '<div class="pc-shell pc-shell--d"><nav class="pc-nav" aria-label="Разделы кабинета"><span class="pc-nav__brand">SOVEAPP<small>Кабинет партнёра</small></span>' + navButtons() + '</nav>' +
      '<div class="pc-main pc-main--d">' + inner + '</div></div>';
  }
  function dHeader(title, sub, o) {
    o = o || {};
    return '<div class="pc-dhead"><div class="pc-dhead__l">' + (o.back ? '<button type="button" class="pc-link" data-pc-back>' + ic('back', 16) + ' Назад</button>' : '') + '<h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><div class="pc-dhead__r">' +
      (o.search ? '<label class="pc-search pc-dsearch">' + ic('search', 16) + '<input id="pc-q" placeholder="' + esc(o.search) + '" value="' + esc(st.q || '') + '"></label>' : '') +
      '<button type="button" class="pc-bell" data-tab="messages" aria-label="Сообщения">' + ic('bell', 20) + ((S.leads.list() || []).length ? '<i></i>' : '') + '</button>' +
      '<button type="button" class="pc-davatar" data-tab="profile"><i>' + esc(brandName().charAt(0).toUpperCase()) + '</i><span><b>' + esc(brandName()) + '</b><small>Кабинет партнёра</small></span><em>▾</em></button></div></div>';
  }
  function dMetric(label, value, tr) { return '<div class="pc-card pc-dmetric"><small>' + esc(label) + '</small><b class="pc-mid">' + value + '</b>' + (tr || '<em class="pc-trend">—</em>') + '</div>'; }
  /* главная компьютера: те же показатели по ТЗ (выручка, заказы, средний чек, график) и «Следующее действие» */
  function dHome() {
    var list = myOrders(), cur = inPeriod(list), fin = O.finance(cur), pf = O.finance(inPrev(list)), nx = NEXT[mainType()] || NEXT.stock, need = orderGroup('confirm', list).length;
    return dHeader('Главная', 'Вся ключевая информация о вашем бизнесе на SOVEAPP') + demoSwitch() +
      kpiTiles(list) +
      '<div class="pc-sec"><b>Ключевые показатели</b>' + periodSel() + '</div>' +
      '<div class="pc-dmetrics pc-dmetrics--3">' + dMetric('Оборот', F.rub(fin.total), trend(fin.total, pf.total, fin.count ? 'за выбранный период' : 'заказов пока нет', true)) + dMetric('Заказы', String(fin.count), trend(fin.count, pf.count, '')) + dMetric('Средний чек', fin.count ? F.rub(fin.averageCheck) : '—', trend(fin.count ? fin.averageCheck : 0, pf.count ? pf.averageCheck : 0, '')) + '</div>' +
      '<div class="pc-dtwo"><div class="pc-card"><div class="pc-sec"><b>Оборот</b><span class="small muted">по дням · ' + (st.period || 30) + ' дней</span></div>' + spark(daily(cur, st.period || 30), 150) + '</div>' +
      '<div class="pc-card pc-dnext"><b class="pc-card__t">Следующее действие</b><div class="pc-dnext__b"><i class="pc-ic">' + ic('box', 18) + '</i><div><b>' + esc(nx[0]) + (need ? ' · ' + need : '') + '</b><span>' + esc(nx[1]) + '</span></div></div><button type="button" class="pc-btn" data-tab="orders" data-filter="confirm">Перейти к заказам →</button></div></div>';
  }
  function dStatusDot(g) { var e = g.edit; if (e && e.state === 'pending') return '<span class="pc-dot pc-dot--warn">На проверке</span>'; if (e && e.state === 'rejected') return '<span class="pc-dot pc-dot--bad">Отклонено</span>'; return g.status === 'in_stock' ? '<span class="pc-dot pc-dot--ok">В наличии</span>' : g.status === 'under_order' ? '<span class="pc-dot pc-dot--warn">Под заказ</span>' : '<span class="pc-dot pc-dot--bad">Нет в наличии</span>'; }
  function dAvail(g) { var C = cfg(), t = stockTotal(g), e = g.edit || {}; if (C.stockMode === 'capacity') return esc(e.leadTime || 'срок не указан'); if (C.stockMode === 'units') { var pa = packAreaOf(g); return t ? t + ' м²' + (pa ? ' · ' + Math.floor(t / pa) + ' уп.' : '') : '—'; } return t ? t + ' шт' : (g.status === 'none' ? '<span class="pc-err">0 шт</span>' : '—'); }
  function dUpdated(g) { var e = g.edit, ts = e && e.submittedAt ? e.submittedAt : Date.now() - (((g.id || 7) % 23) + 1) * 864e5; return new Date(ts).toLocaleDateString('ru-RU'); }
  function dGoods() {
    var C = cfg(), items = goodsItems(), cats = [], q = (st.q || '').toLowerCase();
    items.forEach(function (g) { if (g.category && cats.indexOf(g.category) < 0) cats.push(g.category); });
    var dc = st.dCat || 'all', ds = st.dStatus || 'all', da = st.dAvail || 'all';
    var shown = items.filter(function (g) { return (dc === 'all' || g.category === dc) && (ds === 'all' || g.status === ds) && (da === 'all' || (da === 'yes' ? stockTotal(g) > 0 : stockTotal(g) === 0)) && (!q || (g.name || '').toLowerCase().indexOf(q) >= 0 || (g.article || '').toLowerCase().indexOf(q) >= 0 || (g.category || '').toLowerCase().indexOf(q) >= 0); });
    var sel = function (id, cur, opts) { return '<select class="pc-dselect" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    return dHeader('Товары и цены', 'Управление ассортиментом, ценами и наличием', { search: 'Поиск по товарам, артикулу, категории…' }) +
      '<div class="pc-dfilters">' + sel('df-cat', dc, [['all', 'Все категории']].concat(cats.map(function (c) { return [c, c]; }))) + sel('df-status', ds, [['all', 'Все статусы']].concat(Object.keys(X.STATUS).map(function (k) { return [k, X.STATUS[k]]; }))) + (C.stockMode === 'capacity' ? '' : sel('df-avail', da, [['all', 'Наличие'], ['yes', 'Есть остаток'], ['no', 'Нет остатка']])) + '<button type="button" class="pc-link" data-dreset>Сбросить</button><span class="grow"></span>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-open-add>' + ic('plus', 16) + ' Добавить товар вручную</button><button type="button" class="pc-btn" data-tab="profile" data-open-prof="integrations">' + ic('plug', 16) + ' Подключить склад</button></div>' +
      '<div class="pc-card pc-card--table"><table class="pc-table"><thead><tr><th></th><th>Товар</th><th>Категория</th><th>РРЦ</th><th>Скидка METOD</th><th>Цена SOVEAPP</th><th>' + (C.stockMode === 'capacity' ? 'Срок изготовления' : C.stockMode === 'units' ? 'Наличие, м²' : 'Наличие') + '</th><th>Обновлено</th><th>Статус</th><th></th></tr></thead><tbody>' +
      (shown.length ? shown.map(function (g) { var disc = g.priceRetail && g.priceSove && g.priceRetail > g.priceSove ? Math.round((1 - g.priceSove / g.priceRetail) * 100) : 0; return '<tr data-open-product="' + esc(g.ref) + '"><td><input type="checkbox" data-stop aria-label="Выбрать"></td><td><div class="pc-tprod">' + (g.img ? '<img src="' + g.img + '" alt="" loading="lazy">' : '<span class="pc-tprod__ph">' + ic('goods', 16) + '</span>') + '<div><b>' + esc(g.name) + '</b><small>' + esc([g.sizes, g.article ? 'арт. ' + g.article : null].filter(Boolean).join(', ') || g.brand || '') + '</small></div></div></td><td>' + esc(g.category || '—') + '</td><td>' + (g.priceRetail != null ? F.rub(g.priceRetail) + C.priceNote : '—') + '</td><td>' + (disc ? disc + ' %' : '—') + '</td><td class="green"><b>' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) + C.priceNote : '—') + '</b></td><td>' + dAvail(g) + '</td><td>' + dUpdated(g) + '</td><td>' + dStatusDot(g) + '</td><td class="pc-tmore">⋯</td></tr>'; }).join('') : '<tr><td colspan="10"><span class="small muted">Ничего не найдено — сбросьте фильтры.</span></td></tr>') +
      '</tbody></table></div>' +
      '<p class="line--f">' + items.length + ' ' + plural(items.length, ['товар', 'товара', 'товаров']) + ' · каждое сохранение уходит на проверку менеджеру SOVEAPP, в витрину — после одобрения.</p>';
  }
  function dOrders() {
    var list = myOrders(), f = orderFilter(), shown = findOrders(orderGroup(f, list));
    if (!st.dOrder || !shown.some(function (o) { return o.id === st.dOrder; })) st.dOrder = shown[0] ? shown[0].id : null;
    var o = st.dOrder ? O.get(st.dOrder) : null;
    return dHeader('Заказы', ORD_SUB, { search: 'Поиск по номеру заказа…' }) +
      filterChips(list, f) +
      '<div class="pc-dorders"><div class="pc-dlist">' + (shown.length ? shown.map(function (x) { return '<button type="button" class="pc-row' + (x.id === st.dOrder ? ' is-on' : '') + '" data-dorder="' + x.id + '">' + thumb(x) + '<span class="pc-ord__b"><b>№' + shortId(x.id) + '</b><span>' + F.dateLong(x.ts) + ' · ' + F.rub(x.total) + '</span><span>' + pill(x) + '</span></span></button>'; }).join('') : '<p class="small muted">' + (list.length ? 'В этом списке заказов нет.' : 'Заказов пока нет. Они появятся, когда покупатель оформит корзину с вашими товарами.') + '</p>') + '</div>' +
      '<div class="stack stack--3 pc-dcenter">' + (o ? '<b class="pc-dnum">Заказ №' + shortId(o.id) + '</b>' + orderScreen(o) : '<p class="small muted">Выберите заказ слева.</p>') + '</div>' +
      '<div class="pc-card pc-dchat">' + (o ? dChat(o) : '<span class="line--f">Переписка появится после выбора заказа.</span>') + '</div></div>';
  }
  function dChat(o) {
    var msgs = X.chat.list(o.id);
    return '<div class="pc-dtabs"><button type="button" class="is-on">Как с покупателем</button><button type="button" data-otab="docs" data-oid="' + o.id + '">Документы (' + X.docs.list(o.id).filter(function (d) { return d.name; }).length + ')</button></div>' +
      '<div class="pc-dchat__list">' + msgs.map(function (m) { return '<div class="pc-dchat__m' + (m.who === 'me' ? ' is-me' : '') + '"><small>' + (m.who === 'me' ? 'Вы' : 'Покупатель') + ' · ' + new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</small>' + esc(m.text) + '</div>'; }).join('') + '</div>' +
      '<div class="pc-dchat__in">' + attach(o.id) + '<input class="input" id="dc-in" placeholder="Написать сообщение…"><button type="button" class="pc-roundbtn" data-dsend="' + o.id + '" aria-label="Отправить">' + ic('arrow', 16) + '</button></div>';
  }
  function dFinance() {
    var all = myOrders(), list = all.filter(function (o) { return o.status !== 'cancelled'; }), fin = O.finance(list), prof = O.profiles.get(st.brand === 'all' ? (brands()[0] || {}).name : st.brand), paidRe = /^(paid|assembling|in_production|shipped|in_transit|delivered|installed|received)$/;
    var paid = list.filter(function (o) { return paidRe.test(o.status); }), paidSum = paid.reduce(function (s, o) { return s + o.total; }, 0);
    var waiting = list.filter(function (o) { return /^(delivered|installed)$/.test(o.status); }), waitSum = waiting.reduce(function (s, o) { return s + o.supplierAmount; }, 0);
    var month = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); month = month.charAt(0).toUpperCase() + month.slice(1);
    var tile = function (l, v, sub, acc) { return '<div class="pc-card' + (acc ? ' pc-card--acc' : '') + '"><small>' + l + '</small><b class="pc-mid">' + v + '</b><span class="line--f">' + sub + '</span></div>'; };
    var HOW = [['Покупатель оплачивает заказ в SOVEAPP', 'порядок расчётов — по договору с площадкой', 'card'], ['Комиссия SOVEAPP', prof.commissionPct + ' % — по согласованным условиям', 'wallet'], ['Покупатель подтверждает получение', 'приёмка или 7 дней без претензий', 'box'], ['Выплата по реестру', 'сроки — по договору; статусы и удержания — в таблице ниже', 'card']];
    var ft = st.finTab || 'payouts', tabs = [['payouts', 'Выплаты'], ['paid', 'Оплаченные заказы'], ['commission', 'Комиссия SOVEAPP'], ['returns', 'Возвраты']];
    var rows = ft === 'paid' ? paid : ft === 'returns' ? all.filter(function (o) { return /^(return|cancelled)$/.test(o.status); }) : list;
    var statusCell = function (o) { return o.status === 'received' ? '<span class="pc-dot pc-dot--ok">Готово к выплате</span>' : /^(delivered|installed)$/.test(o.status) ? '<span class="pc-dot pc-dot--warn">Ожидает приёмки</span>' : /^(return|cancelled)$/.test(o.status) ? '<span class="pc-dot pc-dot--bad">' + esc(o.statusLabel) + '</span>' : '<span class="pc-dot pc-dot--muted">В работе</span>'; };
    return dHeader('Финансы', 'Прозрачные расчёты, безопасные выплаты и полная детализация') +
      '<div class="pc-tiles5">' + tile('Оплаченные заказы', F.rub(paidSum), 'за ' + month.toLowerCase()) + tile('Комиссия SOVEAPP', '− ' + F.rub(Math.round(fin.commission)), prof.commissionPct + ' % от оборота') + tile('К выплате', F.rub(fin.awaitingPayout), fin.awaitingPayout ? 'подготовлены к выплате' : 'после «Получен»', true) + tile('Выплачено', '—', 'реестр появится после первой выплаты') + tile('Ожидают выплаты', F.rub(waitSum), waiting.length + ' ' + plural(waiting.length, ['заказ', 'заказа', 'заказов'])) + '</div>' +
      '<div class="pc-sec"><b>Как это работает</b><span class="pc-link">Условия — в договоре</span></div>' +
      '<div class="pc-card"><div class="pc-steps4">' + HOW.map(function (h) { return '<div class="pc-step"><i class="pc-ic">' + ic(h[2], 18) + '</i><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div>'; }).join('') + '</div><span class="line--f">Суммы «К выплате» и «Комиссия SOVEAPP» считаются по согласованным условиям; платёжная схема описывается договором, а не этим экраном.</span></div>' +
      '<div class="pc-card pc-card--table"><div class="pc-dtabs pc-dtabs--pad">' + tabs.map(function (t) { return '<button type="button" class="' + (ft === t[0] ? 'is-on' : '') + '" data-fintab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<span class="grow"></span><span class="pc-period">' + month + ' ▾</span></div>' +
      '<table class="pc-table"><thead><tr><th>Дата</th><th>№ заказа</th><th>Покупатель</th><th>Сумма заказа</th><th>Комиссия SOVEAPP</th><th>К выплате</th><th>Статус</th></tr></thead><tbody>' + (rows.length ? rows.map(function (o) { return '<tr data-open-order="' + o.id + '"><td>' + new Date(o.ts).toLocaleDateString('ru-RU') + '</td><td>№' + shortId(o.id) + '</td><td>' + esc(cityOf(o.address) || 'Покупатель') + '</td><td>' + F.rub(o.total) + '</td><td>' + F.rub(o.commissionAmount) + '</td><td><b>' + F.rub(o.supplierAmount) + '</b></td><td>' + statusCell(o) + '</td></tr>'; }).join('') : '<tr><td colspan="7"><span class="small muted">Пока пусто.</span></td></tr>') + '</tbody></table></div>' +
      '';
  }
  function dProfileMarkup(rows, body, verified) {
    var open = st.profOpen && body[st.profOpen] ? st.profOpen : 'company', cur = rows.filter(function (r) { return r[0] === open; })[0];
    return dHeader('Профиль компании', verified ? 'Проверенный партнёр' : 'Новый партнёр · заявка на модерации') +
      '<div class="pc-dprof"><div class="pc-card pc-menu">' + rows.map(function (r) { return '<button type="button" class="pc-menu__r' + (open === r[0] ? ' is-open' : '') + '" data-prof="' + r[0] + '"><i class="pc-ic pc-ic--round">' + ic(r[1], 17) + '</i><span>' + r[2] + '</span>' + (r[3] ? '<em>' + r[3] + '</em>' : '') + '<b>›</b></button>'; }).join('') + '<button type="button" class="pc-menu__r pc-menu__r--out" data-out><i class="pc-ic pc-ic--round">' + ic('out', 17) + '</i><span>Выйти из кабинета</span></button></div>' +
      '<div class="pc-card pc-dprof__body"><b class="pc-card__t">' + (cur ? cur[2] : '') + '</b>' + body[open]() + '</div></div>';
  }
  function dView() {
    if (st.screen && st.screen.kind === 'order') { st.tab = 'orders'; st.dOrder = st.screen.id; st.screen = null; }
    var inner, t = st.tab;
    if (st.screen) {
      var g = st.screen.ref ? goodById(st.screen.ref) : null;
      if (st.screen.kind === 'product' && g) inner = dHeader('Товар', g.name, { back: true }) + '<div class="pc-dproduct">' + productScreen(g) + '</div>';
      else if (st.screen.kind === 'stock' && g) inner = dHeader(screenTitle(), g.name, { back: true }) + '<div class="pc-dwide stack stack--3">' + stockScreen(g) + '</div>';
      else if (st.screen.kind === 'add') inner = dHeader('Добавить товар', 'Позиция появится в кабинете сразу, в витрине — после проверки менеджером', { back: true }) + '<div class="pc-dwide stack stack--3">' + addScreen() + '</div>';
      else if (st.screen.kind === 'payouts') inner = dHeader('Выплаты', 'Сумма заказа, комиссия SOVEAPP и к выплате по каждому заказу', { back: true }) + '<div class="pc-dwide stack stack--3">' + payoutsScreen() + '</div>';
      else if (st.screen.kind === 'chat') inner = dHeader('Переписка', 'Сообщения покупателя по заказу', { back: true }) + '<div class="pc-dwide stack stack--3">' + chatScreen(st.screen.id) + '</div>';
      else inner = dHeader('Не найдено', '', { back: true });
    } else if (t === 'goods') inner = dGoods();
    else if (t === 'orders') inner = dOrders();
    else if (t === 'finance') inner = dFinance();
    else if (t === 'profile') inner = tabProfile(true);
    else if (t === 'messages') inner = dHeader('Сообщения', 'Клиенты пишут с карточки товара и из заказа') + '<div class="pc-dwide">' + tabMessages() + '</div>';
    else inner = dHome();
    return dShell(inner);
  }
  function viewCab() {
    if (!canTab(st.tab)) st.tab = 'home';
    if (isDesktop()) return dView();
    var body;
    if (st.screen) {
      var g = st.screen.ref ? goodById(st.screen.ref) : null, o = st.screen.id ? O.get(st.screen.id) : null;
      body = st.screen.kind === 'chat' ? chatScreen(st.screen.id) : st.screen.kind === 'product' && g ? productScreen(g) : st.screen.kind === 'stock' && g ? stockScreen(g) : st.screen.kind === 'add' ? addScreen() : st.screen.kind === 'payouts' ? payoutsScreen() : st.screen.kind === 'order' && o ? orderScreen(o) : '<p class="small muted">Не найдено.</p>';
    } else body = ({ home: tabHome, goods: tabGoods, orders: tabOrders, finance: tabFinance, profile: tabProfile, messages: tabMessages }[st.tab] || tabHome)();
    return shell(body);
  }
  function openScreen(sc) { st.screen = sc; paint(); window.scrollTo(0, 0); }
  function back() {
    if (st.screen && st.screen.kind === 'stock') return openScreen({ kind: 'product', ref: st.screen.ref });
    if (st.screen) { st.screen = null; paint(); window.scrollTo(0, 0); return; }
    st.tab = 'home'; paint(); window.scrollTo(0, 0);
  }
  /* «<» в шапке сайта: из экрана — к списку, из раздела — на главную кабинета; с главной — со страницы (site.js) */
  window.SOVE.backStep = function () { if (!st.screen && st.tab === 'home') return false; back(); return true; };

  function paint() {
    root.innerHTML = st.step === 'cab' ? viewCab() : st.step === 'code' ? viewCode() : viewPhone();
    /* хендофф, п. 7: состояние offline — полоска, данные из localStorage остаются доступны */
    if (st.step === 'cab' && navigator.onLine === false) root.insertAdjacentHTML('afterbegin', '<div class="pc-offline" role="status">Нет сети · показываем сохранённые данные, действия отправим при подключении</div>');
    if (!window.__pcNetHooked) { window.__pcNetHooked = true; window.addEventListener('online', paint); window.addEventListener('offline', paint); }
    var f = document.getElementById('pc-form');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var inp = document.getElementById('pc-phone'), err = document.getElementById('pc-err'); var d = inp.value.replace(/\D/g, ''); if (d.length === 10) d = '7' + d; if (d.charAt(0) === '8' && d.length === 11) d = '7' + d.slice(1); if (d.length !== 11) { err.hidden = false; err.textContent = 'Введите телефон полностью: 11 цифр.'; inp.focus(); return; } st.phone = '+' + d; st.step = 'code'; paint(); });
    var cf = document.getElementById('pc-code-form');
    if (cf) cf.addEventListener('submit', function (e) { e.preventDefault(); var inp = document.getElementById('pc-code'), err = document.getElementById('pc-code-err'); if (inp.value.replace(/\D/g, '').length !== 4) { err.hidden = false; err.textContent = 'Код — четыре цифры.'; inp.focus(); return; } var L = lead(); if (L && L.company && hasType(L.type)) { st.brand = L.company; O.profiles.set(L.company, { scenario: L.type }); } try { localStorage.setItem(KEY, JSON.stringify({ phone: st.phone, brand: st.brand })); } catch (e2) {} st.step = 'cab'; st.tab = 'home'; paint(); ui.toast('Вы вошли в кабинет партнёра' + (L && L.type && hasType(L.type) ? ' · ' + O.typeInfo(L.type).typeLabel : '')); });
    var other = document.getElementById('pc-other'); if (other) other.addEventListener('click', function () { st.step = 'phone'; paint(); });
    var dt = root.querySelector('[data-demo-toggle]'); if (dt) dt.addEventListener('click', function () { st.showDemo = !st.showDemo; paint(); });
    root.querySelectorAll('[data-out]').forEach(function (out) { out.addEventListener('click', function () { try { localStorage.removeItem(KEY); } catch (e) {} st = { step: 'phone', phone: '', tab: 'home', brand: 'all', open: {}, filter: 'all', demo: null, showDemo: false, promoSel: null, screen: null, cat: 'all', q: '', whDraft: {}, profOpen: null }; if (location.search) history.replaceState(null, '', 'partner-cabinet.html'); paint(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { st.tab = b.getAttribute('data-tab'); st.screen = null; st.q = ''; st.searchOpen = false; var fl = b.getAttribute('data-filter'); if (fl) st.filter = fl; var pf = b.getAttribute('data-open-prof'); if (pf) st.profOpen = pf; paint(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-pc-back]').forEach(function (b) { b.addEventListener('click', back); });
    root.querySelectorAll('[data-period]').forEach(function (sel) { sel.addEventListener('change', function () { st.period = Number(sel.value) || 30; paint(); }); });
    root.querySelectorAll('[data-open-chat]').forEach(function (b) { b.addEventListener('click', function () { st.tab = 'messages'; openScreen({ kind: 'chat', id: b.getAttribute('data-open-chat') }); }); });
    var cs = root.querySelector('[data-chat-send]'), ci = root.querySelector('#pc-chat-in');
    if (cs && ci) { var sendChat = function () { var v = ci.value.trim(); if (!v) return; X.chat.add(cs.getAttribute('data-chat-send'), 'me', v); paint(); var ci2 = root.querySelector('#pc-chat-in'); if (ci2) ci2.focus(); }; cs.addEventListener('click', sendChat); ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }); }
    root.querySelectorAll('.pc-chips [data-filter]').forEach(function (b) { b.addEventListener('click', function () { st.filter = b.getAttribute('data-filter'); paint(); }); });
    root.querySelectorAll('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { st.cat = b.getAttribute('data-cat'); paint(); }); });
    var q = root.querySelector('#pc-q'); if (q) q.addEventListener('input', function () { st.q = q.value; var pos = q.selectionStart; paint(); var q2 = root.querySelector('#pc-q'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } });
    var stg = root.querySelector('[data-search-toggle]'); if (stg) stg.addEventListener('click', function () { st.searchOpen = !st.searchOpen; if (!st.searchOpen) st.q = ''; paint(); var q3 = root.querySelector('#pc-q'); if (q3) q3.focus(); });
    root.querySelectorAll('[data-open-product]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'product', ref: b.getAttribute('data-open-product') }); }); });
    root.querySelectorAll('[data-open-stock]').forEach(function (b) { b.addEventListener('click', function () { st.stockTab = 'stock'; st.whDraft = {}; st.whForm = false; openScreen({ kind: 'stock', ref: b.getAttribute('data-open-stock') }); }); });
    root.querySelectorAll('[data-open-add]').forEach(function (b) { b.addEventListener('click', function () { st.addPhotos = []; openScreen({ kind: 'add' }); }); });
    bindPhotos();
    root.querySelectorAll('[data-open-payouts]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'payouts' }); }); });
    root.querySelectorAll('[data-payf]').forEach(function (b) { b.addEventListener('click', function () { st.payF = b.getAttribute('data-payf'); paint(); }); });
    root.querySelectorAll('[data-month]').forEach(function (sel) { sel.addEventListener('change', function () { st.finMonth = Number(sel.value) || 0; paint(); }); });
    root.querySelectorAll('[data-info]').forEach(function (b) { b.addEventListener('click', function () { ui.toast(b.getAttribute('data-info')); }); });
    root.querySelectorAll('[data-more]').forEach(function (b) { b.addEventListener('click', function () { var g = goodById(b.getAttribute('data-more')); if (!g) return; ui.modal({ title: g.name, text: 'Что сделать с товаром?', actions: [{ label: 'Редактировать', kind: 'primary', onClick: function (ev, api) { api.close(); goodsForm(g); } }, { label: 'Управление остатками', kind: 'ghost', onClick: function (ev, api) { api.close(); st.stockTab = 'stock'; st.whDraft = {}; st.whForm = false; openScreen({ kind: 'stock', ref: g.ref }); } }, { label: 'Закрыть', kind: 'link' }] }); }); });
    root.querySelectorAll('[data-open-order]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'order', id: b.getAttribute('data-open-order') }); }); });
    root.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { var g = goodById(b.getAttribute('data-edit')); if (g) goodsForm(g); }); });
    root.querySelectorAll('[data-stock-tab]').forEach(function (b) { b.addEventListener('click', function () { st.stockTab = b.getAttribute('data-stock-tab'); paint(); }); });
    var draftStatus = st.screen && st.screen.ref ? (goodById(st.screen.ref) || {}).status : 'in_stock';
    var sst = root.querySelector('#st-status'); if (sst) sst.addEventListener('change', function () { draftStatus = sst.value; var sw0 = root.querySelector('[data-switch]'); if (sw0) { sw0.classList.toggle('is-on', draftStatus !== 'none'); sw0.setAttribute('aria-checked', draftStatus !== 'none'); } });
    var sw = root.querySelector('[data-switch]'); if (sw) sw.addEventListener('click', function () { var on = !sw.classList.contains('is-on'); sw.classList.toggle('is-on', on); sw.setAttribute('aria-checked', on); draftStatus = on ? (draftStatus === 'none' ? 'in_stock' : draftStatus) : 'none'; var sst2 = root.querySelector('#st-status'); if (sst2) sst2.value = draftStatus; });
    root.querySelectorAll('[data-wh-edit]').forEach(function (b) { b.addEventListener('click', function () { var s = X.stocks.list(st.screen.ref).filter(function (x) { return x.id === b.getAttribute('data-wh-edit'); })[0]; if (s) { st.whDraft = { id: s.id, warehouse: s.warehouse, qty: s.qty, unit: s.unit }; st.whForm = true; paint(); } }); });
    root.querySelectorAll('[data-wh-del]').forEach(function (b) { b.addEventListener('click', function () { X.stocks.remove(st.screen.ref, b.getAttribute('data-wh-del')); st.whDraft = {}; st.whForm = false; ui.toast('Склад убран', 'ok'); paint(); }); });
    var wa = root.querySelector('[data-wh-add]'); if (wa) wa.addEventListener('click', function () { var n = root.querySelector('#wh-name').value.trim(), qv = root.querySelector('#wh-qty').value.trim(), u = root.querySelector('#wh-unit').value.trim(); if (!n || !qv) return ui.toast('Укажите склад и остаток', 'error'); var was = st.whDraft.id && X.stocks.list(st.screen.ref).filter(function (x) { return x.id === st.whDraft.id; })[0]; if (was && was.warehouse !== n) X.stocks.remove(st.screen.ref, was.id); X.stocks.set(st.screen.ref, n, Number(qv.replace(',', '.')) || 0, u || 'шт'); st.whDraft = {}; st.whForm = false; ui.toast('Склад сохранён', 'ok'); paint(); });
    root.querySelectorAll('[data-wh-new]').forEach(function (b) { b.addEventListener('click', function () { st.whDraft = {}; st.whForm = true; paint(); var wn = root.querySelector('#wh-name'); if (wn) wn.focus(); }); });
    root.querySelectorAll('[data-stock-save]').forEach(function (b) { b.addEventListener('click', function () { var g = goodById(b.getAttribute('data-stock-save')); if (!g) return; var n = root.querySelector('#wh-name'), qv = root.querySelector('#wh-qty'), u = root.querySelector('#wh-unit'); if (n && n.value.trim() && qv && qv.value.trim()) X.stocks.set(g.ref, n.value.trim(), Number(qv.value.replace(',', '.')) || 0, (u && u.value.trim()) || 'шт'); var pr = root.querySelector('#pr-retail'), ps = root.querySelector('#pr-sove'), cs = root.querySelector('#cap-slots'), cl = root.querySelector('#cap-lead'); var patch = { name: g.name, priceRetail: pr ? pr.value : g.priceRetail, priceSove: ps ? ps.value : g.priceSove, status: draftStatus, brand: brandTitle(), own: g.own }; if (cs) patch.capacity = cs.value.trim(); if (cl) patch.leadTime = cl.value.trim(); X.edits.submit(g.ref, patch); ui.toast('Сохранено: остатки в кабинете, цены и статус — на проверке у менеджера', 'ok'); st.whDraft = {}; st.whForm = false; openScreen({ kind: 'product', ref: g.ref }); }); });
    root.querySelectorAll('[data-gcat]').forEach(function (b) { b.addEventListener('click', function () { root.querySelector('#g-category').value = b.getAttribute('data-gcat'); root.querySelectorAll('[data-gcat]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
    var as = root.querySelector('[data-add-save]'), addSave = function (asDraft) { var v = function (id) { var el = root.querySelector('#g-' + id); return el ? el.value.trim() : ''; }; if (v('name').length < 2) return ui.toast('Укажите название товара', 'error'); var payload = { name: v('name'), article: v('article'), category: v('category'), description: v('description'), sizes: v('sizes'), priceRetail: v('priceRetail'), priceSove: v('priceSove'), status: draftStatus, brand: v('brand') || brandTitle(), own: true, img: (st.addPhotos || [])[0] || null }; cfg().goodsFields.forEach(function (x) { payload[x[0]] = v(x[0]); }); X.edits.submit('own:' + Date.now().toString(36), payload, asDraft); st.addPhotos = []; ui.toast(asDraft ? 'Черновик сохранён — в витрину не отправлен' : 'Товар отправлен на проверку менеджеру', 'ok'); st.screen = null; paint(); window.scrollTo(0, 0); };
    if (as) as.addEventListener('click', function () { addSave(false); });
    var adr = root.querySelector('[data-add-draft]'); if (adr) adr.addEventListener('click', function () { addSave(true); });
    root.querySelectorAll('[data-dorder]').forEach(function (b) { b.addEventListener('click', function () { st.dOrder = b.getAttribute('data-dorder'); paint(); }); });
    root.querySelectorAll('[data-stop]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); }); });
    [['df-cat', 'dCat'], ['df-status', 'dStatus'], ['df-avail', 'dAvail']].forEach(function (p) { var el = root.querySelector('#' + p[0]); if (el) el.addEventListener('change', function () { st[p[1]] = el.value; paint(); }); });
    var dr = root.querySelector('[data-dreset]'); if (dr) dr.addEventListener('click', function () { st.dCat = st.dStatus = st.dAvail = 'all'; st.q = ''; paint(); });
    root.querySelectorAll('[data-fintab]').forEach(function (b) { b.addEventListener('click', function () { st.finTab = b.getAttribute('data-fintab'); paint(); }); });
    var dsend = root.querySelector('[data-dsend]'), din = root.querySelector('#dc-in');
    if (dsend && din) { var sendMsg = function () { var v = din.value.trim(); if (!v) return; X.chat.add(dsend.getAttribute('data-dsend'), 'me', v); paint(); var el = root.querySelector('#dc-in'); if (el) el.focus(); }; dsend.addEventListener('click', sendMsg); din.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendMsg(); } }); }
    root.querySelectorAll('[data-zone]').forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('is-on'); }); });
    var zs = root.querySelector('[data-zone-save]'); if (zs) zs.addEventListener('click', function () { var zones = Array.prototype.map.call(root.querySelectorAll('#dz-zones .is-on'), function (b) { return b.getAttribute('data-zone'); }), patch = { zones: zones, other: root.querySelector('#dz-other').value.trim(), note: root.querySelector('#dz-note').value.trim() }; if (!zones.length && !patch.other) return ui.toast('Отметьте хотя бы одну зону или впишите город', 'error'); X.delivery.set(brandTitle(), patch); if (st.demo) { var seen = {}; goodsItems().forEach(function (g) { if (g.brand && !seen[g.brand]) { seen[g.brand] = true; X.delivery.set(g.brand, patch); } }); } ui.toast('Зона доставки сохранена — покупатель видит её сразу', 'ok'); paint(); });
    /* вкладки заказа «Заказ · Логистика · Документы» (Вика 05.11) */
    root.querySelectorAll('[data-otab]').forEach(function (b) { b.addEventListener('click', function () { st.orderTab = b.getAttribute('data-otab'); st.orderTabId = b.getAttribute('data-oid'); paint(); }); });
    root.querySelectorAll('[data-open-docs]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-open-docs'); st.orderTab = 'docs'; st.orderTabId = id; st.tab = 'orders'; openScreen({ kind: 'order', id: id }); }); });
    var lgSave = function (id) {
      var a = root.querySelector('#lg-addr'), d = root.querySelector('#lg-date'), l = root.querySelector('#lg-lift'), n = root.querySelector('#lg-note'), p = {};
      if (a && !a.disabled) p.addr = a.value.trim(); if (d && !d.disabled) p.date = d.value; if (l && !l.disabled) p.lift = l.checked; if (n && !n.disabled) p.note = n.value.trim();
      return X.logistics.set(id, p);
    };
    root.querySelectorAll('[data-lg-method]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-oid'); lgSave(id); X.logistics.set(id, { method: b.getAttribute('data-lg-method') }); paint(); }); });
    root.querySelectorAll('[data-lg-win]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-oid'); lgSave(id); X.logistics.set(id, { win: b.getAttribute('data-lg-win') }); paint(); }); });
    var lgBtn = root.querySelector('[data-lg][data-oid]');
    if (lgBtn) ['#lg-addr', '#lg-date', '#lg-lift', '#lg-note'].forEach(function (q) { var el = root.querySelector(q); if (el) el.addEventListener('change', function () { lgSave(lgBtn.getAttribute('data-oid')); }); });
    root.querySelectorAll('[data-lg]').forEach(function (b) { b.addEventListener('click', function () {
      var id = b.getAttribute('data-oid'), k = b.getAttribute('data-lg'), o = O.get(id); if (!o) return;
      if (k === 'propose') {
        lgSave(id); var L = lgOf(o), miss = [];
        if (!/^Самовывоз/.test(L.method) && !L.addr) miss.push('адрес'); if (!L.date) miss.push('дату'); if (!L.win) miss.push('время');
        if (miss.length) { ui.toast('Укажите ' + miss.join(', ')); return; }
        X.logistics.set(id, { state: 'proposed' }); ui.toast('Предложение доставки отправлено клиенту', 'ok');
      }
      if (k === 'agree') { X.logistics.set(id, { state: 'agreed' }); ui.toast('Клиент согласовал доставку', 'ok'); }
      if (k === 'edit') X.logistics.set(id, { state: 'draft' });
      paint();
    }); });
    root.querySelectorAll('[data-doc-file]').forEach(function (inp) { inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return; if (f.size > 20 * 1048576) { ui.toast('Файл больше 20 МБ — сожмите или разбейте'); return; }
      X.docs.put(inp.getAttribute('data-doc-file'), inp.getAttribute('data-kind'), { name: f.name, state: 'uploaded' }); ui.toast('Файл загружен', 'ok'); paint();
    }); });
    root.querySelectorAll('[data-doc-send]').forEach(function (b) { b.addEventListener('click', function () { X.docs.set(b.getAttribute('data-oid'), b.getAttribute('data-doc-send'), { state: 'sent' }); ui.toast('Отправлено клиенту на согласование', 'ok'); paint(); }); });
    root.querySelectorAll('[data-doc-sign]').forEach(function (b) { b.addEventListener('click', function () { X.docs.set(b.getAttribute('data-oid'), b.getAttribute('data-doc-sign'), { state: 'signed' }); ui.toast('Клиент подписал документ', 'ok'); paint(); }); });
    root.querySelectorAll('[data-stage]').forEach(function (b) { b.addEventListener('click', function () { X.production.setStage(b.getAttribute('data-oid'), b.getAttribute('data-stage')); ui.toast('Этап обновлён — покупатель видит прогресс', 'ok'); paint(); }); });
    root.querySelectorAll('[data-measure]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-measure'), o = O.get(id); if (!o) return; ui.modal({ title: 'Перенести замер', text: 'Покупатель получит новую дату сразу.', html: '<div class="field"><label for="ms-date">Дата замера</label><input class="input" id="ms-date" placeholder="ДД.ММ.ГГГГ" value="' + esc(measureDate(o)) + '"></div>', actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var v = api.el.querySelector('#ms-date').value.trim(); if (!v) return ui.toast('Укажите дату', 'error'); X.production.setMeasure(id, v); api.close(); ui.toast('Замер перенесён на ' + v, 'ok'); paint(); } }, { label: 'Отмена', kind: 'link' }] }); }); });
    root.querySelectorAll('[data-quick]').forEach(function (b) { b.addEventListener('click', function () { var o = O.get(b.getAttribute('data-oid')), a = o && (o.actions.supplier || []).filter(function (x) { return x.status === b.getAttribute('data-quick'); })[0]; if (!o || !a) return; if ((a.fields || []).length || a.needsReason) return actionSheet(o, a); ui.confirm({ title: a.label + '?', text: 'Заказ №' + shortId(o.id) + ': покупатель сразу увидит новый статус.', ok: a.label, onOk: function () { doAct(o, a, {}); } }); }); });
    root.querySelectorAll('[data-chat-file]').forEach(function (inp) { inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; if (!f) return; if (f.size > 20 * 1048576) return ui.toast('Файл больше 20 МБ — сожмите или пришлите ссылкой', 'error'); var kb = f.size / 1024; X.chat.add(inp.getAttribute('data-chat-file'), 'me', '📎 ' + f.name + ' · ' + (kb < 1024 ? Math.max(1, Math.round(kb)) + ' КБ' : (Math.round(kb / 102.4) / 10).toString().replace('.', ',') + ' МБ')); ui.toast('Файл отправлен', 'ok'); paint(); }); });
    root.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { var o = O.get(b.getAttribute('data-oid')), a = o && o.actions.supplier.filter(function (x) { return x.status === b.getAttribute('data-act'); })[0]; if (o && a) actionSheet(o, a); }); });
    root.querySelectorAll('[data-reply]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-reply'), v = root.querySelector('[data-reply-in="' + id + '"]').value.trim(); if (v) { O.replyReview(id, v); paint(); } }); });
    root.querySelectorAll('[data-auto]').forEach(function (b) { b.addEventListener('click', function () { O.autoReceive(b.getAttribute('data-auto')); ui.toast('Заказ закрыт автоматически — «Получен»', 'ok'); paint(); }); });
    root.querySelectorAll('[data-prof]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-prof'); st.profOpen = st.profOpen === k ? null : k; paint(); }); });
    var topic = TOPICS[0]; root.querySelectorAll('[data-topic]').forEach(function (b) { b.addEventListener('click', function () { topic = b.getAttribute('data-topic'); root.querySelectorAll('[data-topic]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
    var mg = root.querySelector('#mg-send'); if (mg) mg.addEventListener('click', function () { var v = root.querySelector('#mg-text').value.trim(); if (!v) return; O.requests.add('manager', { brand: (brands()[0] || {}).name, topic: topic, text: v }); ui.toast('Отправлено менеджеру', 'ok'); paint(); });
    root.querySelectorAll('[data-emp-sec]').forEach(function (b) { b.addEventListener('click', function () { X.employees.toggle(b.getAttribute('data-emp-sec'), b.getAttribute('data-sec')); paint(); }); });
    root.querySelectorAll('[data-emp-del]').forEach(function (b) { b.addEventListener('click', function () { X.employees.remove(b.getAttribute('data-emp-del')); paint(); }); });
    root.querySelectorAll('[data-emp-login]').forEach(function (b) { b.addEventListener('click', function () { X.access.loginAs(b.getAttribute('data-emp-login')); st.tab = 'home'; st.screen = null; ui.toast('Прототип: смотрим кабинет глазами сотрудника', 'ok'); paint(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-emp-logout]').forEach(function (b) { b.addEventListener('click', function () { X.access.logout(); paint(); }); });
    var newSecs = secs().filter(function (k) { return k !== 'admin'; });
    root.querySelectorAll('[data-new-sec]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-new-sec'); newSecs = newSecs.indexOf(k) >= 0 ? newSecs.filter(function (x) { return x !== k; }) : newSecs.concat([k]); b.classList.toggle('is-on', newSecs.indexOf(k) >= 0); }); });
    var ea = root.querySelector('#emp-add'); if (ea) ea.addEventListener('click', function () { var ph = root.querySelector('#emp-phone').value.trim(), lb = root.querySelector('#emp-label').value.trim(); if (ph.replace(/\D/g, '').length < 10) return ui.toast('Введите телефон сотрудника', 'error'); X.employees.add(ph, lb, newSecs); ui.toast('Сотрудник добавлен', 'ok'); paint(); });
    var fi = root.querySelector('#feed-import'); if (fi) fi.addEventListener('click', function () { var u = root.querySelector('#feed-url').value.trim(); try { var r = X.feed.import(u, brandTitle()); ui.toast('Фид импортирован: новых ' + r.lastResult.created + ', обновлено ' + r.lastResult.updated + ' — позиции на проверке у менеджера', 'ok'); paint(); } catch (e) { ui.toast(e.message, 'error'); } });
    var fr = root.querySelector('[data-feed-refresh]'); if (fr) fr.addEventListener('click', function () { try { var r = X.feed.import(X.feed.get().url, brandTitle()); ui.toast('Фид обновлён: без изменений ' + r.lastResult.skipped, 'ok'); paint(); } catch (e) { ui.toast(e.message, 'error'); } });
  }
  O.autoReceive();
  if (st.demo === 'stock') seedDemoStocks();
  if (DESK_MQ) { if (DESK_MQ.addEventListener) DESK_MQ.addEventListener('change', function () { paint(); }); else if (DESK_MQ.addListener) DESK_MQ.addListener(function () { paint(); }); }
  paint();
})();
