/* Кабинет партнёра — мобильная версия референса Вики (04 «Поставщик: товары, заказы, продвижение, финансы»
   и «Типы поставщиков — единый каркас»): меню Главная · Товары · Заказы · Продвижение · Финансы · Профиль,
   сводка очередей по типам, «следующее действие», список заказов со статусами, финансы «как это работает».
   Типы Retail · Materials · Custom (PDF Алины 19.10): шаги, поля и кнопки — из SOVE.orders, покупатель видит
   то же зеркально. ?demo=stock|materials|custom — демо-кабинет для команды с учебными заказами.
   Три кабинета по типу (20.10, Валерия): общий стиль, но свои разделы — Retail «Остатки», Materials «Калькулятор»,
   Custom «Производство», свои карточки главной, виджеты, финансы. Тип берётся из анкеты «Стать партнёром» или из заказов.
   В прототипе партнёр видит заказы всех поставщиков этого браузера. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, O = S.orders, X = S.pext;
  var root = document.getElementById('pc-root'); if (!root) return;
  var SEC_OF = { goods: 'goods', stocks: 'goods', calc: 'goods', orders: 'orders', production: 'orders', promo: 'promotion', finance: 'finance', messages: 'messages' };
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
  /* ?tab=stocks|calc|production|goods|orders|finance|promo|profile|messages — открыть раздел по ссылке (для просмотра командой) */
  var tabQ = ui.qs('tab'); if (st.step === 'cab' && tabQ && ['home', 'goods', 'orders', 'promo', 'finance', 'profile', 'messages', 'stocks', 'calc', 'production'].indexOf(tabQ) >= 0) st.tab = tabQ;

  var IC = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', goods: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    orders: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', promo: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6"/>',
    finance: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 8H13a2.5 2.5 0 0 1 0 5H9.5m0 0v4m-1.5-2h4"/>', profile: '<path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M15 18l-6-6 6-6"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>', search: '<path d="M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"/>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/>', pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', pic: '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14M3 19l5-5 4 4 3-3 6 6M8 9h.01"/>', wallet: '<path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 3H6a2 2 0 0 0-2 2v2M16 14h2"/>', clock: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2"/>', building: '<path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11M9 8h2M9 12h2M9 16h2"/>', users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>', card: '<path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22"/>', truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>', plug: '<path d="M9 2v6M15 2v6M5 8h14v4a7 7 0 0 1-14 0zM12 19v3"/>', help: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', check: '<path d="M5 12l4 4L19 6"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/>', box: '<path d="M4 7h16v13H4zM4 7l2-4h12l2 4M10 11h4"/>', calc: '<path d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM9 6h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15v4M9 19h.01M12 19h.01"/>', factory: '<path d="M3 21V9l5 3V9l5 3V9l5 3v9zM17 12V4h3v8M7 17h2M11 17h2M15 17h2"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  /* меню по типу кабинета: Главная + разделы типа + Сообщения (на телефоне сообщения — через колокольчик) */
  function navItems() { return [['home', 'Главная', 'home']].concat(cfg().sections).concat([['messages', 'Сообщения', 'chat']]); }
  var ORD_LABEL = { stock: 'Заказы', materials: 'Запросы', custom: 'Проекты' };
  /* очередь и следующее действие по типу — из «единой обработки обращений» в референсах */
  var QUEUE = { stock: ['Новые заказы', 'требуют подтверждения'], materials: ['Заявки на расчёт', 'ждут расчёта и КП'], custom: ['Проекты на заказ', 'ждут принятия, замера или КП'] };
  var NEXT = { stock: ['Подтвердите наличие и срок', 'Ответ в день заказа держит рейтинг и не теряет продажу.', 'Перейти к заказам'], materials: ['Пришлите расчёт и КП', 'Количество, упаковки, партия, цена и срок — клиент примет расчёт и оплатит.', 'Перейти к запросам'], custom: ['Примите заявки и назначьте замер', 'После замера — КП и спецификация, затем предоплата и изготовление.', 'Перейти к проектам'] };
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
  function pill(o) { var cls = /^(received|delivered|installed|done|paid)$/.test(o.status) ? 'pill--ok' : /^(return|cancelled)$/.test(o.status) ? 'pill--bad' : o.status === 'pending_confirmation' ? '' : 'pill--on'; return '<span class="pill ' + cls + '">' + esc(o.statusLabel) + '</span>'; }
  function title(o) { var f = o.items[0] || {}; return esc(f.name || 'Заказ') + (o.items.length > 1 ? ' <small>и ещё ' + (o.items.length - 1) + '</small>' : ''); }
  function thumb(o) { var f = o.items[0] || {}; return '<span class="pc-ord__pic">' + (f.img ? '<img src="' + f.img + '" alt="" loading="lazy">' : ic('box', 20)) + '</span>'; }
  function finished(o) { return !O.active(o); }

  /* ---------- вход ---------- */
  function demoChips() {
    return '<div class="pc-demo-list">' + O.scenarios().map(function (s) { var t = O.typeInfo(s.key); return '<a class="pc-demo-list__a" href="partner-cabinet.html?demo=' + s.key + '"><b>' + esc(t.typeLabel) + '</b><span>' + esc(t.label) + '</span>' + ic('arrow', 16) + '</a>'; }).join('') + '</div>';
  }
  function viewPhone() {
    return '<div class="stack stack--2"><span class="eyebrow">Партнёрам</span><h1 class="h1 h1--sm">Вход в кабинет</h1><p class="text">По телефону из анкеты партнёра. Пришлём код в SMS.</p></div>' +
      '<form class="stack stack--4" id="pc-form"><div class="field"><label for="pc-phone">Телефон</label><input class="input" id="pc-phone" type="tel" inputmode="tel" placeholder="+7 900 000-00-00" value="' + esc(st.phone) + '"><p class="field__error" id="pc-err" hidden></p></div><button class="btn btn--primary btn--block" type="submit">Получить код</button></form>' +
      '<a class="btn btn--link" href="partner.html">Ещё не партнёр — стать партнёром</a>' +
      (O.single ? '' : '<div class="pc-team"><button type="button" class="pc-team__t" data-demo-toggle>Для команды · демо-кабинеты по типам ' + (st.showDemo ? '▴' : '▾') + '</button>' + (st.showDemo ? demoChips() : '') + '</div>');
  }
  function viewCode() {
    return '<div class="stack stack--2"><span class="eyebrow">Партнёрам</span><h1 class="h1 h1--sm">Код из SMS</h1><p class="text">Отправили на ' + esc(st.phone) + '. В прототипе подойдут любые четыре цифры.</p></div>' +
      '<form class="stack stack--4" id="pc-code-form"><div class="field"><label for="pc-code">Код</label><input class="input" id="pc-code" inputmode="numeric" maxlength="4" placeholder="1234"><p class="field__error" id="pc-code-err" hidden></p></div><button class="btn btn--primary btn--block" type="submit">Войти</button></form>' +
      '<button type="button" class="btn btn--link" id="pc-other">Другой номер / отправить код ещё раз</button>';
  }

  /* ---------- каркас по 10 экранам Вики: шапка «SOVEAPP · Кабинет партнёра» на главной, стрелка «назад» в разделах ---------- */
  /* три кабинета по типу поставщика (выбирается при регистрации): общий стиль, разные очереди, карточки товара, остатки и финансы */
  var TYPE_CFG = {
    stock: { goodsTitle: 'Товары и цены', addTitle: 'Добавить товар', unit: 'шт', priceNote: '',
      sections: [['goods', 'Товары', 'goods'], ['stocks', 'Остатки', 'box'], ['orders', 'Заказы', 'orders'], ['finance', 'Финансы', 'finance'], ['promo', 'Промо', 'promo'], ['profile', 'Профиль', 'profile']],
      kpis: [['box', 'Новые заказы', 'k_new'], ['truck', 'К отправке', 'k_ship'], ['goods', 'Мало на складе', 'low'], ['wallet', 'На выплату', 'finance']],
      stages: [['pending_confirmation', 'Новые'], ['confirmed,paid,assembling', 'Подтверждённые'], ['shipped,in_transit', 'В доставке'], ['delivered,received', 'Завершены']],
      goodsFields: [['sizes', 'Размеры', 'Например: 1200×600 мм'], ['warranty', 'Гарантия', '2 года'], ['lead', 'Срок отгрузки', '1–2 дня']],
      stockMode: 'warehouses', orderCard: 'delivery',
      finance: 'Оплата 100 % после подтверждения наличия. Выплата после «Получен» по условиям оферты.',
      profileRow: ['box', 'Склады и сроки', 'Склады и срок отгрузки задают, за сколько дней покупатель получит товар; зона доставки — отдельной строкой ниже.'] },
    materials: { goodsTitle: 'Материалы и расчёт', addTitle: 'Добавить материал', unit: 'м²', priceNote: ' / м²',
      sections: [['goods', 'Матери\u00adалы', 'goods'], ['calc', 'Кальку\u00adлятор', 'calc'], ['orders', 'Запросы', 'orders'], ['finance', 'Финансы', 'finance'], ['promo', 'Промо', 'promo'], ['profile', 'Профиль', 'profile']],
      kpis: [['box', 'Заявки на расчёт', 'k_new'], ['clock', 'Расчёт у клиента', 'k_calc'], ['goods', 'К комплектации', 'k_pack'], ['wallet', 'На выплату', 'finance']],
      stages: [['pending_confirmation', 'Заявки'], ['spec_sent', 'Расчёт отправлен'], ['spec_accepted,paid,assembling', 'В работе'], ['shipped,in_transit,delivered,received', 'Доставка']],
      goodsFields: [['packArea', 'В упаковке, м²', '1,44'], ['consumption', 'Расход на м²', '1,05'], ['batch', 'Партия / тон', 'A-12'], ['pack', 'Кратность упаковки', '1 уп.'], ['lead', 'Срок отгрузки', '2–3 дня']],
      stockMode: 'units', orderCard: 'calc',
      finance: 'Оплата 100 % после принятия расчёта. Выплата после «Получен» по условиям оферты.',
      profileRow: ['help', 'Калькулятор', 'Запас по умолчанию 10 %, кратность упаковки и расход на м² — из карточки материала; покупатель видит расчёт по площади.'] },
    custom: { goodsTitle: 'Изделия и услуги', addTitle: 'Добавить изделие', unit: 'проект', priceNote: '',
      sections: [['goods', 'Изделия', 'goods'], ['production', 'Производ\u00adство', 'factory'], ['orders', 'Проекты', 'orders'], ['finance', 'Финансы', 'finance'], ['promo', 'Промо', 'promo'], ['profile', 'Профиль', 'profile']],
      kpis: [['box', 'Заявки на проект', 'k_new'], ['clock', 'Замеры', 'k_meas'], ['factory', 'В производстве', 'k_prod'], ['wallet', 'На выплату', 'finance']],
      stages: [['pending_confirmation', 'Заявки'], ['confirmed,measurement_scheduled', 'Замер'], ['spec_sent,spec_accepted,paid', 'КП и предоплата'], ['in_production', 'Изготовление'], ['shipped,delivered,installed,received', 'Монтаж и приёмка']],
      goodsFields: [['leadTime', 'Срок изготовления', '30–45 дней'], ['materials', 'Материалы и фасады', 'МДФ, эмаль, шпон'], ['hardware', 'Фурнитура', 'Blum, Hettich'], ['measure', 'Замер', 'бесплатно по Москве'], ['install', 'Монтаж', 'включён']],
      stockMode: 'capacity', orderCard: 'project',
      finance: 'Предоплата 50 % после утверждения КП, остаток после монтажа и приёмки. Выплата после «Принят».',
      profileRow: ['building', 'Производство', 'Сроки изготовления, выезд на замер и регионы монтажа — из них складывается срок в КП.'] }
  };
  function cfg() { return TYPE_CFG[mainType()] || TYPE_CFG.stock; }
  function inStatuses(o, list) { return list.split(',').indexOf(o.status) >= 0; }
  function kpiCount(key, list) {
    if (key === 'k_new') return list.filter(function (o) { return o.status === 'pending_confirmation'; });
    if (key === 'k_ship') return list.filter(function (o) { return inStatuses(o, 'confirmed,paid,assembling'); });
    if (key === 'k_calc') return list.filter(function (o) { return o.status === 'spec_sent'; });
    if (key === 'k_measure') return list.filter(function (o) { return inStatuses(o, 'confirmed,measurement_scheduled,spec_sent'); });
    if (key === 'k_prod') return list.filter(function (o) { return o.status === 'in_production'; });
    if (key === 'k_pack') return list.filter(function (o) { return inStatuses(o, 'spec_accepted,paid,assembling'); });
    if (key === 'k_meas') return list.filter(function (o) { return inStatuses(o, 'confirmed,measurement_scheduled'); });
    return [];
  }
  var TITLES = { goods: 'Товары и цены', orders: 'Заказы', promo: 'Продвижение', finance: 'Финансы', profile: 'Профиль компании', messages: 'Сообщения', stocks: 'Остатки', calc: 'Калькулятор', production: 'Производство' };
  function screenTitle() {
    var sc = st.screen;
    if (sc) return sc.kind === 'chat' ? 'Переписка' : sc.kind === 'product' ? (mainType() === 'custom' ? 'Изделие' : mainType() === 'materials' ? 'Материал' : 'Товар') : sc.kind === 'stock' ? (cfg().stockMode === 'capacity' ? 'Загрузка и цены' : 'Остатки и цены') : sc.kind === 'add' ? cfg().addTitle : sc.kind === 'order' ? (mainType() === 'custom' ? 'Проект №' : mainType() === 'materials' ? 'Запрос №' : 'Заказ №') + sc.id.replace(/^o-/, '').slice(-6) : '';
    return st.tab === 'orders' ? (ORD_LABEL[singleType()] || 'Заказы') : st.tab === 'goods' ? cfg().goodsTitle : TITLES[st.tab] || '';
  }
  function shortId(id) { return id.replace(/^o-/, '').slice(-6); }
  function header() {
    if (st.tab === 'home' && !st.screen) return '<div class="pc-head"><div><span class="pc-head__logo">SOVEAPP</span><span class="pc-head__k">Кабинет партнёра · ' + esc(O.typeInfo(mainType()).typeLabel) + '</span></div><button type="button" class="pc-bell" data-tab="messages" aria-label="Сообщения">' + ic('bell', 20) + ((S.leads.list() || []).length ? '<i></i>' : '') + '</button></div>';
    var right = st.screen && st.screen.kind === 'product' ? ic('heart', 20) : (st.tab === 'goods' || st.tab === 'orders' || st.tab === 'messages') && !st.screen ? ic('search', 20) : '';
    return '<div class="pc-bar"><button type="button" class="pc-bar__b" data-pc-back aria-label="Назад">' + ic('back', 22) + '</button><h1 class="pc-bar__t">' + esc(screenTitle()) + '</h1><span class="pc-bar__b">' + right + '</span></div>';
  }
  function shell(body) {
    var one = singleType(), ts = myTypes().map(O.typeInfo);
    return (X.access.current() ? '<div class="pc-stripe pc-stripe--emp"><span>Вы вошли как сотрудник · ' + esc(X.access.current().label) + ' · открыты: ' + X.access.current().sections.map(function (k) { return X.SECTION_LABEL[k]; }).join(', ').toLowerCase() + '</span><button type="button" data-emp-logout>вернуться как владелец</button></div>' : '') +
      '<div class="pc-shell"><nav class="pc-nav" aria-label="Разделы кабинета"><span class="pc-nav__brand">SOVEAPP<small>Кабинет партнёра · ' + esc(O.typeInfo(mainType()).typeLabel) + '</small></span>' + navItems().filter(function (n) { return canTab(n[0]); }).map(function (n) { var need = n[0] === 'orders' ? myOrders().filter(O.needsSupplier).length : 0; return '<button type="button" class="pc-nav__b' + (st.tab === n[0] && !st.screen ? ' is-on' : '') + '" data-tab="' + n[0] + '">' + ic(n[2], 18) + '<span>' + esc(n[1]) + '</span>' + (need ? '<i>' + need + '</i>' : '') + '</button>'; }).join('') + '</nav>' +
      '<div class="pc-main">' + header() + (st.tab === 'home' && !st.screen && !O.single && ts.length > 1 ? '<div class="pc-top__types">' + ts.map(function (t) { return '<span class="pc-type"><b>' + esc(t.typeLabel) + '</b></span>'; }).join('') + '</div>' : '') + body + '</div></div>' +
      (st.demo ? '<div class="pc-stripe pc-stripe--foot"><span>Демо-кабинет · ' + esc(O.typeInfo(st.demo).label) + ' · заказы учебные</span><a href="my.html?v=orders">глазами покупателя</a><button type="button" data-out>выйти</button></div>' : '') +
      '<p class="pc-foot">Прототип: вход, заказы и заявки хранятся только в этом браузере. В продукте партнёр видит только свои бренды.</p>';
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
  function kpi(icon, label, value, delta, sub, tab, filter) { return '<button type="button" class="pc-kpi" data-tab="' + tab + '"' + (filter ? ' data-filter="' + filter + '"' : '') + '><span class="pc-kpi__t"><i class="pc-ic">' + ic(icon, 16) + '</i><small>' + esc(label) + '</small></span><span class="pc-kpi__v"><b>' + value + '</b>' + (delta ? '<em>' + delta + '</em>' : '') + '</span>' + (sub ? '<span class="pc-kpi__s">' + esc(sub) + '</span>' : '') + '</button>'; }
  function onboarding() {
    var L = lead() || {}, t = L.type || mainType();
    var okType = !!(L.type || brands().some(function (b) { return O.profiles.get(b.name).scenario; })), okGoods = !!L.goods, okOrder = O.list().length > 0;
    if (okType && okGoods && okOrder) return '';
    var steps = [[okType, 'Тип и анкета', okType ? 'заполнено' : 'тип задаёт путь заказа', okType ? null : 'partner.html'], [okGoods, 'Товары переданы', okGoods ? 'у менеджера' : 'ссылка на каталог или прайс', okGoods ? null : 'partner.html?type=' + t], [okOrder, 'Первый заказ', okOrder ? 'есть' : 'покупатель оформит корзину', okOrder ? null : 'market.html']];
    var done = steps.filter(function (x) { return x[0]; }).length;
    return '<div class="pc-card"><div class="pc-sec"><b>Первые шаги</b><span class="small muted">' + done + ' из 3</span></div><div class="pc-onb">' + steps.map(function (x, i) { var inner = '<i>' + (x[0] ? ic('check', 12) : i + 1) + '</i><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span>'; return x[3] ? '<a class="pc-onb__s" href="' + x[3] + '">' + inner + '</a>' : '<span class="pc-onb__s is-done">' + inner + '</span>'; }).join('') + '</div></div>';
  }
  function tabHome() {
    var list = myOrders(), mt = mainType(), q = QUEUE[mt];
    var need = list.filter(O.needsSupplier), fin = O.finance(inPeriod(list)), week = Date.now() - 7 * 864e5;
    var msgs = (S.leads.list() || []).length + dialogs().reduce(function (sum, d) { return sum + d.unread; }, 0), received = list.filter(function (o) { return o.status === 'received'; });
    var cap = D.capsule('k1'), hour = new Date().getHours(), hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    var avg = fin.count ? fin.averageCheck : 0, series = daily(inPeriod(list), st.period || 30);
    return '<div class="pc-hello"><div><b>' + hello + ', ' + esc(brandTitle()) + '!</b><span>Здесь вся ключевая информация о вашем бизнесе на SOVEAPP</span></div>' + (cap && cap.cover ? '<img src="' + cap.cover + '" alt="">' : '') + '</div>' +
      /* быстрый переход в разделы: на телефоне верхнего меню нет (как на макете) */
      '<div class="pc-quick">' + cfg().sections.filter(function (x) { return canTab(x[0]); }).map(function (x) { return '<button type="button" class="pc-quick__b" data-tab="' + x[0] + '"><i>' + ic(x[2], 18) + '</i><span>' + esc(x[1]) + '</span></button>'; }).join('') + '</div>' +
      kpiTiles(list) +
      zonePrompt() + homeWidget(list) +
      '<div class="pc-sec"><b>Ключевые показатели</b>' + periodSel() + '</div>' +
      '<button type="button" class="pc-card pc-card--b" data-tab="finance"><small>Оборот</small><b class="pc-big">' + F.rub(fin.total) + '</b><em class="pc-delta">' + (fin.count ? 'за выбранный период' : 'заказов пока нет') + '</em>' + spark(series) + '</button>' +
      '<div class="pc-two"><button type="button" class="pc-card pc-card--b" data-tab="orders" data-filter="all"><small>Заказы</small><b class="pc-mid">' + fin.count + '</b></button><button type="button" class="pc-card pc-card--b" data-tab="finance"><small>Средний чек</small><b class="pc-mid">' + (avg ? F.rub(avg) : '—') + '</b></button></div>' +
      '';
  }
  /* ---------- содержание по типу: виджеты главной и свои разделы ---------- */
  function pic(g) { return '<span class="pc-ord__pic">' + (g.img ? '<img src="' + g.img + '" alt="" loading="lazy">' : ic('goods', 18)) + '</span>'; }
  function actBtn(o, extraCls) { var a = (o.actions.supplier || []).filter(function (x) { return x.status !== 'cancelled'; })[0]; return a ? '<button type="button" class="pc-btn pc-btn--sm' + (extraCls || '') + '" data-act="' + a.status + '" data-oid="' + o.id + '">' + esc(a.label) + '</button>' : ''; }
  function orderSum(o) { return F.rub(o.fields.finalPrice ? Number(o.fields.finalPrice) : o.total); }
  function miniOrder(o, line, btn) { return '<div class="pc-mini"><button type="button" class="pc-mini__o" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b>№' + shortId(o.id) + ' · ' + title(o) + '</b><span>' + line + '</span></span></button>' + (btn == null ? actBtn(o) : btn) + '</div>'; }
  function stockTotal(g) { return X.stocks.list(g.ref).reduce(function (s, r) { return s + (Number(r.qty) || 0); }, 0); }
  function stockLine(g) { var rows = X.stocks.list(g.ref); return rows.length ? rows.map(function (r) { return esc(r.warehouse) + ' — ' + r.qty + ' ' + esc(r.unit || ''); }).join(' · ') : X.STATUS[g.status]; }
  function lowStock() { return goodsItems().filter(function (g) { var rows = X.stocks.list(g.ref); return g.status === 'none' || (rows.length && stockTotal(g) <= 5); }); }
  function seedDemoStocks() { var items = goodsItems(); if (items.some(function (g) { return X.stocks.list(g.ref).length; })) return; [12, 3, 0, 24, 5, 18].forEach(function (q, i) { if (items[i]) X.stocks.set(items[i].ref, 'Основной склад', q, 'шт'); }); }
  function packAreaOf(g) { var e = g.edit || {}, v = Number(String(e.packArea || '').replace(',', '.')); if (v) return v; return /м²/.test(g.name || '') ? X.calc.get().packArea : 0; }
  function calcFor(o) { var cs = X.calc.get(), area = Number((String(o.fields.area || '').replace(',', '.').match(/\d+(?:\.\d+)?/) || [0])[0]) || 0, need = area ? X.calc.need(area, cs.reserve) : 0; return { area: area, reserve: cs.reserve, need: need, packArea: cs.packArea, packs: need ? X.calc.packs(need, cs.packArea) : 0 }; }
  function stageOf(o) { return X.production.stage(o.id) || o.fields.stage || (O.scenario(o.scenario).production_stages || ['Материалы'])[0]; }
  function measureDate(o) { return X.production.measure(o.id) || o.fields.measurementDate || ''; }
  function capacity() { var n = 0; goodsItems().forEach(function (g) { n += Number((g.edit || {}).capacity) || 0; }); return n || 4; }
  function loadBar(used, cap) { return '<div class="pc-load"><i style="width:' + Math.min(100, Math.round(used / Math.max(1, cap) * 100)) + '%"></i></div>'; }
  function homeWidget(list) { var t = mainType(); return t === 'materials' ? homeMaterials(list) : t === 'custom' ? homeCustom(list) : homeStock(list); }
  /* Retail: что отправить сегодня и что заканчивается на складе */
  function homeStock(list) {
    var ship = list.filter(function (o) { return inStatuses(o, 'confirmed,paid,assembling'); }), low = lowStock();
    return '<div class="pc-card"><div class="pc-sec"><b>Отправить сегодня</b><span class="small muted">' + ship.length + '</span></div>' + (ship.length ? ship.map(function (o) { return miniOrder(o, orderSum(o) + ' · ' + esc(o.statusLabel)); }).join('') : '<span class="line--f">Оплаченных заказов к отправке нет.</span>') + '</div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Мало на складе</b><button type="button" class="pc-link" data-tab="stocks" data-filter="low">Все остатки</button></div>' + (low.length ? low.slice(0, 4).map(function (g) { return '<div class="pc-mini"><button type="button" class="pc-mini__o" data-open-stock="' + esc(g.ref) + '">' + pic(g) + '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + stockLine(g) + '</span></span></button></div>'; }).join('') : '<span class="line--f">Все товары в наличии.</span>') + '</div>';
  }
  /* Materials: заявки с авторасчётом и материалы без данных для калькулятора */
  function homeMaterials(list) {
    var wait = list.filter(function (o) { return o.status === 'pending_confirmation'; }), nodata = goodsItems().filter(function (g) { return !packAreaOf(g); });
    return '<div class="pc-card"><div class="pc-sec"><b>Ждут расчёта</b><span class="small muted">' + wait.length + '</span></div>' + (wait.length ? wait.map(function (o) { var c = calcFor(o); return miniOrder(o, esc(o.fields.area || 'площадь не указана') + (c.need ? ' → ' + c.need + ' м² с запасом · ' + c.packs + ' уп.' : '')); }).join('') : '<span class="line--f">Новых заявок нет.</span>') + '</div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Без данных для расчёта</b><button type="button" class="pc-link" data-tab="calc">Калькулятор</button></div>' + (nodata.length ? nodata.slice(0, 4).map(function (g) { return '<div class="pc-mini"><button type="button" class="pc-mini__o" data-edit="' + esc(g.ref) + '">' + pic(g) + '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>укажите м² в упаковке и расход</span></span></button></div>'; }).join('') : '<span class="line--f">У всех материалов указаны упаковка и расход.</span>') + '</div>';
  }
  /* Custom: ближайшие замеры и загрузка производства */
  function homeCustom(list) {
    var meas = list.filter(function (o) { return inStatuses(o, 'confirmed,measurement_scheduled'); }), prod = list.filter(function (o) { return o.status === 'in_production'; }), cap = capacity();
    return '<div class="pc-card"><div class="pc-sec"><b>Ближайшие замеры</b><button type="button" class="pc-link" data-tab="production">Производство</button></div>' + (meas.length ? meas.map(function (o) { return miniOrder(o, (measureDate(o) ? '<span class="pc-date">' + esc(measureDate(o)) + '</span> · ' : 'дата не назначена · ') + esc(o.address), o.status === 'confirmed' ? actBtn(o) : '<button type="button" class="pc-btn pc-btn--sm pc-btn--out" data-measure="' + o.id + '">Перенести</button>'); }).join('') : '<span class="line--f">Замеров не назначено.</span>') + '</div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Производство</b><span class="small muted">' + prod.length + ' из ' + cap + ' слотов</span></div>' + loadBar(prod.length, cap) + (prod.length ? prod.map(function (o) { return miniOrder(o, 'этап: ' + esc(stageOf(o)) + (o.fields.eta ? ' · срок ' + esc(o.fields.eta) : ''), ''); }).join('') : '<span class="line--f">В изготовлении ничего нет.</span>') + '</div>';
  }
  /* раздел «Остатки» (Retail): все товары × склады, +/− без проверки менеджером */
  function tabStocks() {
    var items = goodsItems(), f = ['all', 'low', 'none'].indexOf(st.filter) >= 0 ? st.filter : 'all';
    var groups = { all: items, low: lowStock(), none: items.filter(function (g) { return g.status === 'none'; }) };
    return '<div class="pc-chips">' + [['all', 'Все'], ['low', 'Мало'], ['none', 'Нет в наличии']].map(function (x) { return '<button type="button" class="pc-chip' + (f === x[0] ? ' is-on' : '') + '" data-filter="' + x[0] + '">' + x[1] + ' <i>' + groups[x[0]].length + '</i></button>'; }).join('') + '</div>' +
      '<p class="line--f">Остатки по складам меняются сразу, без проверки менеджером. Пять и меньше — попадает в «Мало».</p>' +
      (groups[f].length ? groups[f].map(function (g) { var rows = X.stocks.list(g.ref); return '<div class="pc-card"><div class="pc-mini"><button type="button" class="pc-mini__o" data-open-product="' + esc(g.ref) + '">' + pic(g) + '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + (g.article ? 'арт. ' + esc(g.article) : esc(g.category || '')) + '</span></span></button>' + statusPill(g.status) + '</div>' +
        (rows.length ? rows.map(function (r) { return '<div class="pc-spec"><span class="pc-spec--ink">' + esc(r.warehouse) + '</span><b><span class="pc-qty"><button type="button" data-wh-step="-1" data-wh-ref="' + esc(g.ref) + '" data-wh-id="' + r.id + '" aria-label="Меньше">−</button><em>' + r.qty + ' ' + esc(r.unit || '') + '</em><button type="button" data-wh-step="1" data-wh-ref="' + esc(g.ref) + '" data-wh-id="' + r.id + '" aria-label="Больше">+</button></span></b></div>'; }).join('') : '<span class="line--f">Склады не указаны.</span>') +
        '<button type="button" class="pc-link" data-open-stock="' + esc(g.ref) + '">' + ic('plus', 14) + ' Склад, цены и статус</button></div>'; }).join('') : '<p class="small muted">В этом списке ничего нет.</p>');
  }
  /* раздел «Калькулятор» (Materials): быстрый расчёт и правила, как у покупателя в заявке */
  function calcOut(sel) {
    var area = Number(String(st.calcArea || '').replace(',', '.')) || 0, cs = X.calc.get(), pa = sel ? packAreaOf(sel) : cs.packArea;
    if (!area) return '<span class="line--f">Введите площадь — покажем м² с запасом, упаковки и сумму.</span>';
    var need = X.calc.need(area, cs.reserve), packs = X.calc.packs(need, pa), sum = sel && sel.priceSove != null ? Math.round(packs * pa * sel.priceSove) : null;
    return '<div class="pc-spec"><span>С запасом ' + cs.reserve + ' %</span><b>' + need + ' м²</b></div><div class="pc-spec"><span>Упаковок по ' + pa + ' м²</span><b>' + packs + ' уп. · ' + (Math.round(packs * pa * 100) / 100) + ' м²</b></div>' + (sum != null ? '<div class="pc-spec"><span>Сумма по цене SOVEAPP</span><b>' + F.rub(sum) + '</b></div>' : '');
  }
  function calcSel() { var items = goodsItems(), mats = items.filter(packAreaOf); return items.filter(function (g) { return g.ref === st.calcMat; })[0] || mats[0] || null; }
  function tabCalc() {
    var cs = X.calc.get(), items = goodsItems(), mats = items.filter(packAreaOf), sel = calcSel(), nodata = items.filter(function (g) { return !packAreaOf(g); });
    return '<div class="pc-card"><b class="pc-card__t">Быстрый расчёт</b><span class="line--f">Так же считает покупатель в заявке: площадь → запас → целые упаковки.</span>' +
      '<div class="field"><label for="calc-mat">Материал</label><select class="input" id="calc-mat">' + (mats.length ? mats.map(function (g) { return '<option value="' + esc(g.ref) + '"' + (sel && g.ref === sel.ref ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') : '<option value="">нет материалов с упаковкой</option>') + '</select></div>' +
      '<div class="pc-two"><div class="field"><label for="calc-area">Площадь, м²</label><input class="input" id="calc-area" inputmode="decimal" placeholder="48" value="' + esc(st.calcArea || '') + '"></div><div class="field"><label for="calc-reserve">Запас, %</label><input class="input" id="calc-reserve" inputmode="numeric" value="' + cs.reserve + '"></div></div>' +
      '<div class="pc-calc__out" id="calc-out">' + calcOut(sel) + '</div></div>' +
      '<div class="pc-card"><b class="pc-card__t">Правила расчёта</b><div class="pc-spec"><span>Запас по умолчанию</span><b>' + cs.reserve + ' %</b></div><div class="pc-spec"><span>Кратность</span><b>целые упаковки</b></div><div class="pc-spec"><span>Упаковка, если не указана</span><b>' + cs.packArea + ' м²</b></div><span class="line--f">Запас из поля выше сохраняется и применяется к новым заявкам. Упаковку и расход задавайте в карточке каждого материала.</span></div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Без данных для расчёта</b><span class="small muted">' + nodata.length + '</span></div>' + (nodata.length ? nodata.map(function (g) { return '<div class="pc-mini"><button type="button" class="pc-mini__o" data-edit="' + esc(g.ref) + '">' + pic(g) + '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>укажите м² в упаковке и расход</span></span></button></div>'; }).join('') : '<span class="line--f">У всех материалов указаны упаковка и расход.</span>') + '</div>';
  }
  /* раздел «Производство» (Custom): замеры, проекты в изготовлении с этапами, загрузка */
  function tabProduction() {
    var list = myOrders(), toMeas = list.filter(function (o) { return o.status === 'confirmed'; }), meas = list.filter(function (o) { return o.status === 'measurement_scheduled'; }), prod = list.filter(function (o) { return o.status === 'in_production'; }), cap = capacity(), stages = O.scenario('custom').production_stages || ['Материалы', 'Изготовление', 'Проверка'];
    return '<div class="pc-card"><div class="pc-sec"><b>Загрузка</b><span class="small muted">' + prod.length + ' из ' + cap + ' слотов</span></div>' + loadBar(prod.length, cap) + '<span class="line--f">Свободно ' + Math.max(0, cap - prod.length) + ' — столько проектов можно взять в изготовление. Слоты задаются в «Загрузка и цены» у изделия.</span></div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Замеры</b><span class="small muted">' + (toMeas.length + meas.length) + '</span></div>' + (toMeas.length + meas.length ? toMeas.map(function (o) { return miniOrder(o, 'дата не назначена · ' + esc(o.address)); }).concat(meas.map(function (o) { return '<div class="pc-prod"><button type="button" class="pc-mini__o" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b><span class="pc-date">' + esc(measureDate(o)) + '</span> · №' + shortId(o.id) + '</b><span>' + esc(o.address) + (o.fields.sizes ? ' · ' + esc(o.fields.sizes) : '') + '</span></span></button><div class="pc-prod__a"><button type="button" class="pc-btn pc-btn--sm pc-btn--out" data-measure="' + o.id + '">Перенести</button>' + actBtn(o) + '</div></div>'; })).join('') : '<span class="line--f">Нет проектов, ожидающих замера.</span>') + '</div>' +
      '<div class="pc-card"><div class="pc-sec"><b>В изготовлении</b><span class="small muted">' + prod.length + '</span></div>' + (prod.length ? prod.map(function (o) { var cur = stageOf(o); return '<div class="pc-prod"><button type="button" class="pc-mini__o" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b>№' + shortId(o.id) + ' · ' + title(o) + '</b><span>' + (o.fields.eta ? 'срок ' + esc(o.fields.eta) : 'срок не указан') + ' · ' + orderSum(o) + '</span></span></button><div class="pc-chips">' + stages.map(function (sName) { return '<button type="button" class="pc-chip pc-chip--sm' + (sName === cur ? ' is-on' : '') + '" data-stage="' + esc(sName) + '" data-oid="' + o.id + '">' + esc(sName) + '</button>'; }).join('') + '</div>' + (cur === stages[stages.length - 1] ? '<div class="pc-prod__a">' + actBtn(o) + '</div>' : '<span class="line--f">Этап видит покупатель. После «' + esc(stages[stages.length - 1]) + '» — передача в доставку.</span>') + '</div>'; }).join('') : '<span class="line--f">В изготовлении ничего нет.</span>') + '</div>';
  }
  function kpiTiles(list) {
    var fin = O.finance(list), week = Date.now() - 7 * 864e5, msgs = (S.leads.list() || []).length, received = list.filter(function (o) { return o.status === 'received'; });
    return '<div class="pc-kpis">' + cfg().kpis.map(function (k) {
      if (k[2] === 'messages') return kpi(k[0], k[1], String(msgs), '', '', 'messages');
      if (k[2] === 'finance') return kpi(k[0], k[1], String(received.length), '', received.length ? F.rub(fin.awaitingPayout) : 'после «Получен»', 'finance');
      if (k[2] === 'low') { var low = lowStock(); return kpi(k[0], k[1], String(low.length), '', low.length ? 'пополнить' : 'все в наличии', 'stocks', 'low'); }
      var arr = kpiCount(k[2], list), wk = arr.filter(function (o) { return o.ts > week; }).length;
      var sub = k[2] === 'k_meas' ? (function () { var n = list.filter(function (o) { return o.status === 'confirmed'; }).length; return n ? n + ' назначить' : (arr.length ? 'назначены' : ''); })() : '';
      return kpi(k[0], k[1], String(arr.length), wk ? '+' + wk : '', sub, k[2] === 'k_meas' ? 'production' : 'orders', k[2]);
    }).join('') + '</div>';
  }
  /* хендофф, экран 08: список диалогов с покупателями (по заказам бренда), непрочитанные, предпросмотр; переписка — экран kind: 'chat' */
  function buyerName(o) { var city = o.address ? String(o.address).split(/[·,]/)[0].trim() : ''; if (/^квартира|м²/i.test(city)) city = ''; return (o.buyerName || o.client || '') || ('Покупатель' + (city ? ' · ' + city : ' · №' + shortId(o.id))); }
  function dialogs() {
    return myOrders().slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).map(function (o) {
      var msgs = X.chat.list(o.id), last = msgs[msgs.length - 1], seen = (st.seen || {})[o.id] || 0;
      return { id: o.id, name: buyerName(o), text: last ? last.text : '', ts: last ? last.ts : o.ts, unread: msgs.filter(function (m, i) { return m.who === 'buyer' && i >= seen; }).length };
    });
  }
  function chatScreen(id) {
    var o = myOrders().filter(function (x) { return x.id === id; })[0]; if (!o) return '<p class="small muted">Не найдено.</p>';
    var msgs = X.chat.list(id); st.seen = st.seen || {}; st.seen[id] = msgs.length;
    return '<div class="pc-card"><div class="pc-sec"><b>' + esc(buyerName(o)) + '</b><span class="small muted">Заказ №' + shortId(id) + '</span></div>' +
      '<div class="pc-chat__list">' + msgs.map(function (m) { return '<div class="pc-chat__m' + (m.who === 'me' ? ' is-me' : '') + '"><small>' + (m.who === 'me' ? 'Вы' : 'Покупатель') + ' · ' + new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</small>' + esc(m.text) + '</div>'; }).join('') + '</div>' +
      '<div class="pc-chat__in"><input class="input" id="pc-chat-in" placeholder="Написать покупателю…" aria-label="Сообщение покупателю"><button type="button" class="pc-roundbtn" data-chat-send="' + esc(id) + '" aria-label="Отправить">' + ic('arrow', 16) + '</button></div></div>';
  }
  function tabMessages() {
    var inc = (S.leads.list() || []), rq = O.requests.list().filter(function (r) { return r.reply; });
    var rows = dialogs().map(function (d) { return { name: d.name, text: d.text, ts: d.ts, unread: d.unread, chat: d.id }; }).concat(inc.map(function (l) { var LEAD = { partner: 'заявка партнёра', adept: 'Дизайн-проект', track: 'Ремонт под ключ' }; return { name: l.name || 'Клиент', text: (LEAD[l.product] || l.product || 'заявка') + (l.status ? ' · ' + l.status : ''), ts: l.ts, unread: 1 }; }))
      .concat(rq.map(function (r) { return { name: 'Менеджер SOVEAPP', text: r.reply, ts: r.ts, unread: 0 }; })).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (!rows.length) return '<div class="pc-card pc-empty">' + ic('chat', 28) + '<p class="small muted">Сообщений пока нет. Клиенты пишут с карточки товара и из заказа — переписка появится здесь.</p></div>';
    return '<div class="pc-card pc-list">' + rows.map(function (r) { return '<' + (r.chat ? 'button type="button" data-open-chat="' + esc(r.chat) + '"' : 'a href="chats.html?kind=partner"') + ' class="pc-msg2"><span class="pc-ava' + (r.unread ? ' is-hot' : '') + '">' + esc(r.name.charAt(0).toUpperCase()) + '</span><span class="pc-msg2__b"><span class="row row--between"><b>' + esc(r.name) + '</b><small>' + (r.ts ? new Date(r.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') : '') + '</small></span><span>' + esc(r.text) + '</span></span>' + (r.unread ? '<i>' + r.unread + '</i>' : '') + '</' + (r.chat ? 'button' : 'a') + '>'; }).join('') + '</div>';
  }

  /* ---------- экраны 2–5: товары ---------- */
  function goodsItems() {
    var names = brands().map(function (b) { return b.name; }), mine = D.products.filter(function (p) { return names.indexOf(O.supplierOf(p)) >= 0; });
    if (!mine.length || st.demo) { var t = mainType(); mine = D.products.filter(function (p) { return t === 'materials' ? p.category === 'Отделка' : t === 'custom' ? (p.madeToOrder && p.category === 'Мебель') : (!p.madeToOrder && p.category !== 'Отделка'); }).slice(0, 6); if (!mine.length) mine = D.products.slice(0, 6); }
    var cat = mine.slice(0, 8).map(function (p) { var ref = 'cat:' + p.id, e = X.edits.get(ref), pub = X.edits.published(ref); return { ref: ref, id: p.id, own: false, name: (pub && pub.name) || (e && e.name) || p.name, brand: O.supplierOf(p), category: p.category, img: p.img, priceRetail: e && e.priceRetail != null ? e.priceRetail : p.retail, priceSove: e && e.priceSove != null ? e.priceSove : p.metod, status: (e && e.status) || (p.madeToOrder ? 'under_order' : 'in_stock'), edit: e, sizes: p.size || null, material: p.material || null }; });
    var own = X.edits.list(brandTitle()).concat(X.edits.list('all')).filter(function (e) { return e.own; }).map(function (e) { return { ref: e.ref, id: null, own: true, name: e.name, brand: e.brand, category: e.category, article: e.article, img: null, priceRetail: e.priceRetail, priceSove: e.priceSove, status: e.status || 'in_stock', edit: e, sizes: e.sizes || null, description: e.description || null }; });
    return own.concat(cat);
  }
  function goodById(ref) { return goodsItems().filter(function (g) { return g.ref === ref; })[0]; }
  function statusPill(s) { return '<span class="pill ' + (s === 'in_stock' ? 'pill--ok' : s === 'under_order' ? 'pill--on' : '') + '">' + X.STATUS[s] + '</span>'; }
  function reviewPill(e) { return e ? '<span class="pill ' + (e.state === 'approved' ? 'pill--ok' : e.state === 'rejected' ? 'pill--bad' : 'pill--blue') + '">' + X.REVIEW[e.state] + '</span>' : ''; }
  function goodsRow(g) {
    return '<button type="button" class="pc-row" data-open-product="' + esc(g.ref) + '"><span class="pc-ord__pic">' + (g.img ? '<img src="' + g.img + '" alt="" loading="lazy">' : ic('goods', 20)) + '</span>' +
      '<span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + (g.article ? 'арт. ' + esc(g.article) : [g.brand, g.category].filter(Boolean).map(esc).join(' · ')) + '</span><span class="pc-good__pills"><b>' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) + cfg().priceNote : 'цена не указана') + '</b>' + statusPill(g.status) + reviewPill(g.edit) + '</span></span><i>⋯</i></button>';
  }
  function tabGoods() {
    var items = goodsItems(), cats = []; items.forEach(function (g) { if (g.category && cats.indexOf(g.category) < 0) cats.push(g.category); });
    var shown = items.filter(function (g) { return st.cat === 'all' || g.category === st.cat; });
    return (cats.length ? '<div class="pc-chips">' + [['all', 'Все']].concat(cats.map(function (c) { return [c, c]; })).map(function (c) { return '<button type="button" class="pc-chip' + (st.cat === c[0] ? ' is-on' : '') + '" data-cat="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>' : '') +
      '<button type="button" class="pc-btn pc-btn--ghost" data-open-add>' + ic('plus', 18) + ' ' + cfg().addTitle + '</button>' +
      '<div class="stack stack--2">' + shown.map(goodsRow).join('') + '</div>' +
      '<p class="line--f">' + items.length + ' ' + plural(items.length, ['товар', 'товара', 'товаров']) + ' · каждое сохранение уходит на проверку менеджеру SOVEAPP, в витрину — после одобрения.</p>';
  }
  function productScreen(g) {
    var e = g.edit, disc = g.priceRetail && g.priceSove && g.priceRetail > g.priceSove ? Math.round((1 - g.priceSove / g.priceRetail) * 100) : 0, stocks = X.stocks.list(g.ref);
    var C = cfg(), ex = (g.edit || {});
    var typed = C.goodsFields.map(function (f) { return [f[1], ex[f[0]] || (f[0] === 'sizes' ? g.sizes : '')]; });
    var specs = [['Бренд', g.brand], ['Категория', g.category], ['Артикул', g.article]].concat(typed).concat([['Материал', g.material], ['Розничная цена', g.priceRetail != null ? F.rub(g.priceRetail) + C.priceNote : ''], ['Цена для клиентов SOVEAPP', g.priceSove != null ? F.rub(g.priceSove) + C.priceNote : ''], ['Скидка', disc ? '−' + disc + ' %' : ''], ['Описание', g.description],
      [C.stockMode === 'capacity' ? 'Загрузка производства' : 'Склады', C.stockMode === 'capacity' ? (ex.capacity ? 'свободных слотов: ' + ex.capacity : '') : (stocks.length ? stocks.map(function (s) { return s.warehouse + ' — ' + s.qty + ' ' + (s.unit || ''); }).join('; ') : '')]]).filter(function (x) { return x[1]; });
    return '<div class="pc-hero">' + (g.img ? '<img src="' + g.img + '" alt="">' : ic('goods', 48)) + '</div>' + (g.img ? '<div class="pc-thumbs"><span class="is-on"><img src="' + g.img + '" alt=""></span></div>' : '') +
      '<div class="stack stack--1"><b class="pc-name">' + esc(g.name) + '</b><span class="line--f">' + [g.sizes, g.article ? 'арт. ' + g.article : null, !g.sizes && !g.article ? g.brand : null].filter(Boolean).map(esc).join(', ') + '</span><b class="pc-big">' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) + cfg().priceNote : 'цена не указана') + '</b><span class="pc-good__pills">' + statusPill(g.status) + [g.category, g.brand].filter(Boolean).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('') + reviewPill(e) + '</span></div>' +
      (e ? '<p class="line--f' + (e.state === 'rejected' ? ' pc-err' : '') + '">' + (e.state === 'pending' ? 'На проверке у менеджера: в витрине пока прежние данные.' : e.state === 'approved' ? 'Опубликовано в витрине маркета.' : 'Отклонено менеджером' + (e.note ? ': ' + esc(e.note) : '') + '. Поправьте и сохраните снова.') + '</p>' : '') +
      '<div class="pc-card pc-specs">' + specs.map(function (x) { return '<div class="pc-spec"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
      '<button type="button" class="pc-btn pc-btn--out" data-edit="' + esc(g.ref) + '">Редактировать</button><button type="button" class="pc-btn" data-open-stock="' + esc(g.ref) + '">' + (C.stockMode === 'capacity' ? 'Загрузка и цены' : 'Управление остатками') + '</button>';
  }
  function stockScreen(g) {
    var stocks = X.stocks.list(g.ref), tab = st.stockTab || 'stock', e = g.edit || {}, pr = e.priceRetail != null ? e.priceRetail : g.priceRetail, ps = e.priceSove != null ? e.priceSove : g.priceSove;
    var disc = pr && ps && pr > ps ? Math.round((1 - ps / pr) * 100) : 0, inStock = g.status !== 'none';
    return '<div class="pc-row pc-row--flat"><span class="pc-ord__pic">' + (g.img ? '<img src="' + g.img + '" alt="">' : ic('goods', 20)) + '</span><span class="pc-ord__b"><b>' + esc(g.name) + '</b><span>' + [g.sizes, g.article ? 'арт. ' + g.article : g.brand].filter(Boolean).map(esc).join(', ') + '</span></span></div>' +
      '<div class="pc-tabs2">' + [['stock', cfg().stockMode === 'capacity' ? 'Загрузка' : 'Остатки'], ['prices', 'Цены']].map(function (t) { return '<button type="button" class="' + (tab === t[0] ? 'is-on' : '') + '" data-stock-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (tab === 'stock' && cfg().stockMode === 'capacity'
        ? '<div class="pc-card"><b class="pc-card__t">Загрузка производства</b><span class="line--f">Сколько проектов можете взять в работу — покупатель видит реальный срок в КП.</span><div class="field"><label for="cap-slots">Свободных слотов на ближайший месяц</label><input class="input" id="cap-slots" inputmode="numeric" value="' + esc(String(e.capacity || '')) + '" placeholder="3"></div><div class="field"><label for="cap-lead">Срок изготовления</label><input class="input" id="cap-lead" value="' + esc(e.leadTime || '') + '" placeholder="30–45 дней"></div></div>'
        : tab === 'stock'
        ? '<div class="pc-card"><b class="pc-card__t">' + (cfg().stockMode === 'units' ? 'Остатки, м² и упаковки' : 'Склад') + '</b>' + (cfg().stockMode === 'units' && e.packArea ? '<span class="line--f">В упаковке ' + esc(e.packArea) + ' м² — остаток в упаковках считается сам.</span>' : '') + (stocks.length ? stocks.map(function (s) { var packs = cfg().stockMode === 'units' && Number(String(e.packArea || '').replace(',', '.')) ? ' · ' + Math.floor(s.qty / Number(String(e.packArea).replace(',', '.'))) + ' уп.' : ''; return '<div class="pc-spec"><span class="pc-spec--ink">' + esc(s.warehouse) + '</span><b>' + s.qty + ' ' + esc(s.unit || '') + packs + ' <button type="button" class="pc-iconbtn" data-wh-edit="' + s.id + '" aria-label="Изменить">' + ic('pencil', 14) + '</button><button type="button" class="pc-iconbtn" data-wh-del="' + s.id + '" aria-label="Убрать">' + ic('trash', 14) + '</button></b></div>'; }).join('') : '') +
          '<div class="field"><label for="wh-name">Склад</label><input class="input" id="wh-name" placeholder="Например: Центральный склад" value="' + esc(st.whDraft.warehouse || '') + '"></div><div class="pc-two"><div class="field"><label for="wh-qty">Остаток</label><input class="input" id="wh-qty" inputmode="decimal" placeholder="124" value="' + esc(st.whDraft.qty || '') + '"></div><div class="field"><label for="wh-unit">Единица</label><input class="input" id="wh-unit" placeholder="м² / шт" value="' + esc(st.whDraft.unit || cfg().unit) + '"></div></div><button type="button" class="pc-link" data-wh-add>' + ic('plus', 14) + ' Добавить склад</button></div>'
        : '<div class="pc-card"><b class="pc-card__t">Цены</b><div class="field"><label for="pr-retail">Розничная цена, ₽</label><input class="input" id="pr-retail" inputmode="decimal" value="' + (pr != null ? pr : '') + '"></div><div class="field"><label for="pr-sove">Цена для клиентов SOVEAPP, ₽</label><input class="input" id="pr-sove" inputmode="decimal" value="' + (ps != null ? ps : '') + '"><span class="line--f">Цена для покупателей с подпиской METOD — ваша скидка SOVEAPP</span></div><div class="pc-spec"><span>Скидка</span><b class="' + (disc ? 'green' : '') + '">' + (disc ? '−' + disc + ' %' : '—') + '</b></div></div>') +
      '<div class="pc-card"><b class="pc-card__t">' + (cfg().stockMode === 'capacity' ? 'Приём заказов' : 'Наличие и статус') + '</b><div class="pc-spec pc-spec--sw"><span class="pc-spec--ink">' + (cfg().stockMode === 'capacity' ? 'Принимаем заказы на изделие' : 'Товар в наличии') + '</span><button type="button" class="pc-switch' + (inStock ? ' is-on' : '') + '" data-switch role="switch" aria-checked="' + inStock + '"><i></i></button></div><span class="line">Статус</span><div class="pc-chips" id="st-status">' + Object.keys(X.STATUS).map(function (k) { return '<button type="button" class="pc-chip' + (g.status === k ? ' is-on' : '') + '" data-gs="' + k + '">' + X.STATUS[k] + '</button>'; }).join('') + '</div></div>' +
      '<button type="button" class="pc-btn" data-stock-save="' + esc(g.ref) + '">Сохранить</button><button type="button" class="btn btn--link" data-open-product="' + esc(g.ref) + '">К карточке товара</button>';
  }
  function addScreen() {
    var cats = []; goodsItems().forEach(function (g) { if (g.category && cats.indexOf(g.category) < 0) cats.push(g.category); });
    var f = function (id, label, ph, extra) { return '<div class="field"><label for="g-' + id + '">' + label + '</label><' + (id === 'description' ? 'textarea rows="3"' : 'input') + ' class="input" id="g-' + id + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '>' + (id === 'description' ? '</textarea>' : '') + '</div>'; };
    return '<div class="field"><label>Фото товара</label><div class="pc-photos"><span>' + ic('pic', 20) + '</span><span>' + ic('pic', 20) + '</span><span class="is-add">' + ic('plus', 18) + '<small>Добавить фото</small></span></div><span class="line--f">Фото добавит менеджер при публикации — пришлите их в чат или укажите ссылку в описании.</span></div>' +
      f('name', 'Название товара', 'Например: Керамогранит Terra Sand') +
      '<div class="field"><label for="g-category">Категория</label>' + (cats.length ? '<div class="pc-chips" id="g-cats">' + cats.map(function (c) { return '<button type="button" class="pc-chip" data-gcat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '') + '<input class="input" id="g-category" placeholder="Выберите или введите категорию"></div>' +
      f('article', 'Артикул', 'Например: TS-120') + f('description', 'Описание', 'Введите описание товара…') +
      '<b class="pc-sec__t">Характеристики</b>' + f('brand', 'Бренд', '', ' value="' + esc(brandTitle()) + '"') + cfg().goodsFields.map(function (x) { return f(x[0], x[1], x[2]); }).join('') + f('priceRetail', (mainType() === 'custom' ? 'Базовая цена «от», ₽' : 'Розничная цена, ₽') + (cfg().priceNote ? ' за м²' : ''), '6 200', ' inputmode="decimal"') + f('priceSove', 'Цена для клиентов SOVEAPP, ₽' + (cfg().priceNote ? ' за м²' : ''), '4 800', ' inputmode="decimal"') +
      '<div class="field"><label>Наличие и статус</label><div class="pc-chips" id="g-status">' + Object.keys(X.STATUS).map(function (k) { return '<button type="button" class="pc-chip' + (k === 'in_stock' ? ' is-on' : '') + '" data-gs="' + k + '">' + X.STATUS[k] + '</button>'; }).join('') + '</div></div>' +
      '<button type="button" class="pc-btn" data-add-save>Сохранить товар</button><p class="line--f">Товар сразу появится в кабинете; в витрину маркета попадёт после проверки менеджером.</p>';
  }
  function goodsForm(g) {
    var status = g.status;
    ui.modal({ title: 'Редактировать', text: 'После сохранения позиция уйдёт на проверку менеджеру SOVEAPP.', html: [['name', 'Название', g.name]].concat(cfg().goodsFields.map(function (x) { return [x[0], x[1], (g.edit && g.edit[x[0]]) || (x[0] === 'sizes' ? g.sizes || '' : ''), x[2]]; })).concat([['priceRetail', (mainType() === 'custom' ? 'Базовая цена «от», ₽' : 'Розничная цена, ₽') + (cfg().priceNote ? ' за м²' : ''), g.priceRetail != null ? g.priceRetail : ''], ['priceSove', 'Цена для клиентов SOVEAPP, ₽' + (cfg().priceNote ? ' за м²' : ''), g.priceSove != null ? g.priceSove : '']]).map(function (f) { return '<div class="field"><label for="g-' + f[0] + '">' + f[1] + '</label><input class="input" id="g-' + f[0] + '" value="' + esc(String(f[2])) + '"' + (f[3] ? ' placeholder="' + esc(f[3]) + '"' : '') + (/price/.test(f[0]) ? ' inputmode="decimal"' : '') + '></div>'; }).join('') +
        '<div class="field"><label>Статус</label><div class="pc-chips" id="g-status">' + Object.keys(X.STATUS).map(function (k) { return '<button type="button" class="pc-chip' + (status === k ? ' is-on' : '') + '" data-gs="' + k + '">' + X.STATUS[k] + '</button>'; }).join('') + '</div></div>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var name = api.el.querySelector('#g-name').value.trim(); if (name.length < 2) return ui.toast('Укажите название', 'error'); var patch = { name: name, priceRetail: api.el.querySelector('#g-priceRetail').value, priceSove: api.el.querySelector('#g-priceSove').value, status: status, brand: brandTitle(), own: g.own }; cfg().goodsFields.forEach(function (x) { var inp = api.el.querySelector('#g-' + x[0]); if (inp) patch[x[0]] = inp.value.trim(); }); X.edits.submit(g.ref, patch); ui.toast('Сохранено и отправлено на проверку', 'ok'); api.close(); paint(); } }, { label: 'Отмена', kind: 'link' }] });
    document.querySelectorAll('.modal #g-status [data-gs]').forEach(function (b) { b.addEventListener('click', function () { status = b.getAttribute('data-gs'); document.querySelectorAll('.modal #g-status [data-gs]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
  }

  /* ---------- экраны 6–7: заказы ---------- */
  function tabOrders() {
    var list = myOrders(), f = st.filter, q = (st.q || '').toLowerCase();
    var C = cfg(), groups = { all: list, action: list.filter(O.needsSupplier) };
    var chips = [['all', 'Все'], ['action', 'Ждут вас']];
    C.stages.forEach(function (sg) { groups[sg[0]] = list.filter(function (o) { return inStatuses(o, sg[0]); }); chips.push([sg[0], sg[1]]); });
    ['k_new', 'k_ship', 'k_calc', 'k_measure', 'k_prod', 'k_pack', 'k_meas'].forEach(function (k) { groups[k] = kpiCount(k, list); });
    if (!groups[f]) f = st.filter = 'all';
    var shown = groups[f].filter(function (o) { return !q || o.id.toLowerCase().indexOf(q) >= 0 || o.items.some(function (it) { return it.name.toLowerCase().indexOf(q) >= 0; }); });
    return '<div class="pc-chips">' + chips.map(function (x) { return '<button type="button" class="pc-chip' + (f === x[0] ? ' is-on' : '') + '" data-filter="' + x[0] + '">' + x[1] + ' <i>' + groups[x[0]].length + '</i></button>'; }).join('') + '</div>' +
      '<label class="pc-search">' + ic('search', 16) + '<input id="pc-q" placeholder="Поиск по номеру заказа…" value="' + esc(st.q || '') + '"></label>' +
      (shown.length ? '<div class="stack stack--2">' + shown.map(function (o) { return '<button type="button" class="pc-row" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b>№' + shortId(o.id) + '</b><span>' + F.dateLong(o.ts) + ' · ' + F.rub(o.total) + '</span><span>' + pill(o) + '</span></span><i>›</i></button>'; }).join('') + '</div>' : '<p class="small muted">' + (list.length ? 'В этом списке заказов нет.' : 'Заказов пока нет. Они появятся, когда покупатель оформит корзину с вашими товарами.') + '</p>');
  }
  function orderScreen(o) {
    var acts = o.actions.supplier, fields = Object.keys(o.fields).filter(function (k) { return o.fields[k]; }), cur = o.timeline.filter(function (t) { return t.current; })[0];
    var goods = o.items.reduce(function (s, it) { return s + it.lineTotal; }, 0);
    return '<div class="pc-orderhead">' + pill(o) + '<span class="line--f">' + F.dateLong(o.ts) + ' · ' + esc(o.scenarioLabel || '') + '</span></div>' +
      '<div class="pc-card pc-client"><i class="pc-ic">' + ic('profile', 18) + '</i><div class="grow"><b>Покупатель</b><span>' + esc(o.address) + '</span><span class="pc-phone">+7 999 000-00-77</span></div><a class="pc-roundbtn" href="tel:+79990000077" aria-label="Позвонить">' + ic('phone', 16) + '</a><a class="pc-roundbtn" href="chats.html?kind=partner" aria-label="Написать клиенту">' + ic('chat', 16) + '</a></div>' +
      (X.delivery.covers(brandTitle(), cityOf(o.address)) === false ? '<p class="line--f pc-err">' + esc(cityOf(o.address)) + ' — вне вашей зоны доставки (' + esc(X.delivery.label(brandTitle())) + '). Согласуйте доставку с покупателем или откажитесь от заказа.</p>' : '') +
      '<div class="pc-card"><b class="pc-card__t">Товары в заказе (' + o.items.length + ')</b>' + o.items.map(function (it) { return '<div class="pc-oi"><span class="pc-ord__pic">' + (it.img ? '<img src="' + it.img + '" alt="">' : ic('box', 18)) + '</span><span class="pc-ord__b"><b>' + esc(it.name) + '</b><span>' + it.qty + ' шт. × ' + F.rub(it.unitPrice) + '</span></span><b>' + F.rub(it.lineTotal) + '</b></div>'; }).join('') +
        '<div class="pc-totals"><div><span>Итого за товары</span><b>' + F.rub(goods) + '</b></div><div><span>Доставка</span><b>' + esc(o.fields.deliveryMethod || 'по согласованию') + '</b></div><div class="is-sum"><span>Сумма заказа</span><b>' + F.rub(o.fields.finalPrice ? Number(o.fields.finalPrice) : o.total) + '</b></div></div></div>' +
      (cur ? '<p class="pc-ord__hint">' + esc(cur.supplier) + '</p>' : '') +
      acts.map(function (a, i) { return '<button type="button" class="pc-btn' + (a.status === 'cancelled' ? ' pc-btn--out' : i ? ' pc-btn--ghost' : '') + '" data-act="' + a.status + '" data-oid="' + o.id + '">' + esc(a.label) + '</button>'; }).join('') +
      '<a class="pc-btn pc-btn--ghost" href="chats.html?kind=partner">Написать клиенту</a><a class="pc-btn pc-btn--out" href="chats.html?kind=partner">Предложить изменение</a>' +
      typeCard(o) +
      '<div class="pc-card"><b class="pc-card__t">Шаги</b><div class="tl tl--flat">' + o.timeline.map(function (t) { return '<div class="tl__r' + (t.done ? ' is-done' : '') + (t.current ? ' is-cur' : '') + (t.skipped ? ' is-skip' : '') + '"><span class="tl__d"></span><div><div class="tl__l">' + esc(t.label) + (t.skipped ? ' · подключится с оплатой' : t.optional && !t.done && !t.current ? ' · по ситуации' : '') + '</div></div></div>'; }).join('') + '</div></div>' +
      (o.review ? '<div class="pc-card"><b class="pc-card__t">Отзыв</b><span class="line">Товар ' + '★'.repeat(o.review.productRating) + ' · вы ' + '★'.repeat(o.review.supplierRating) + (o.review.text ? ' · «' + esc(o.review.text) + '»' : '') + '</span>' + (o.review.reply ? '<span class="line--f">Ваш ответ: ' + esc(o.review.reply) + '</span>' : '<div class="row"><input class="input" data-reply-in="' + o.id + '" placeholder="Ответить публично"><button type="button" class="btn btn--primary btn--small" data-reply="' + o.id + '">Ответить</button></div>') + '</div>' : '') +
      (/^(delivered|installed|done)$/.test(o.status) ? '<button type="button" class="btn btn--link" data-auto="' + o.id + '">Прототип: прошло 7 дней</button>' : '');
  }
  /* карточка по типу: Retail — доставка; Materials — расчёт по площади; Custom — карточка проекта и этапы производства */
  function typeCard(o) {
    var f = o.fields, C = TYPE_CFG[O.typeInfo(o.scenario).key] || cfg(), row = function (k, v) { return v ? '<div class="pc-spec"><span>' + esc(k) + '</span><b>' + v + '</b></div>' : ''; };
    if (C.orderCard === 'calc') {
      var c = calcFor(o), need = c.need, packs = f.packs || (need ? c.packs : '');
      return '<div class="pc-card"><b class="pc-card__t">Расчёт</b>' + row('Площадь из заявки', esc(f.area || '')) + row('Запас', c.reserve + ' %') + row('Нужно с запасом', need ? need + ' м²' : '') + row('Упаковок', packs ? esc(String(packs)) + (f.packs ? '' : ' · по ' + c.packArea + ' м²') : '') + row('Количество', f.quantity ? esc(f.quantity) : '') + row('Партия / тон', esc(f.batch || '')) + row('Цена за м²', o.items[0] ? F.rub(o.items[0].unitPrice) : '') + row('Итог расчёта', f.finalPrice ? F.rub(Number(f.finalPrice)) : '') + row('Срок', esc(f.eta || '')) + row('Спецификация', esc(f.specNote || '')) + (f.finalPrice ? '' : '<span class="line--f">Пришлите расчёт кнопкой ниже: количество, упаковки, партия, цена и срок.</span>') + '</div>';
    }
    if (C.orderCard === 'project') {
      var stages = (O.scenario(o.scenario).production_stages || ['Материалы', 'Изготовление', 'Проверка']), cur = stageOf(o), live = o.status === 'in_production';
      return '<div class="pc-card"><b class="pc-card__t">Карточка проекта</b>' + row('Размеры и параметры', esc(f.sizes || '')) + row('Бюджет клиента', esc(f.budget || '')) + row('Пожелания', esc(f.request || '')) + row('Замер', measureDate(o) ? esc(measureDate(o)) + (o.status === 'measurement_scheduled' ? ' <button type="button" class="pc-link" data-measure="' + o.id + '">перенести</button>' : '') : '') + row('КП', f.finalPrice ? F.rub(Number(f.finalPrice)) : '') + row('Спецификация', esc(f.specNote || '')) + row('Срок изготовления', esc(f.eta || '')) + row('Заметка', esc(f.note || '')) +
        '<span class="line">Этапы производства</span><div class="pc-chips">' + stages.map(function (sName) { return live ? '<button type="button" class="pc-chip pc-chip--sm' + (cur === sName ? ' is-on' : '') + '" data-stage="' + esc(sName) + '" data-oid="' + o.id + '">' + esc(sName) + '</button>' : '<span class="pc-chip pc-chip--sm' + (cur === sName && /^(shipped|delivered|installed|received)$/.test(o.status) ? ' is-on' : '') + '">' + esc(sName) + '</span>'; }).join('') + '</div>' + (live ? '<span class="line--f">Нажмите этап — покупатель видит прогресс изготовления.</span>' : '') + '</div>';
    }
    return '<div class="pc-card"><b class="pc-card__t">Доставка</b>' + row('Способ', esc(f.deliveryMethod || '')) + row('Перевозчик', esc(f.carrier || '')) + row('Трек-номер', esc(f.tracking || '')) + row('Срок', esc(f.eta || '')) + (f.deliveryMethod ? '' : '<span class="line--f">Способ, перевозчик и трек появятся на шаге «Передан в доставку».</span>') + '</div>';
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

  /* ---------- продвижение ---------- */
  function tabPromo() {
    var P = O.promotion, mine = O.requests.list().filter(function (r) { return r.kind === 'promotion'; }), sel = st.promoSel;
    var STATUS = { new: 'Отправлена', answered: 'Ответ менеджера', scheduled: 'Запланировано', published: 'Опубликовано', rejected: 'Отклонено' };
    return '<p class="line">Канал METOD ремонта: не чаще раза в ' + P.rules.channel_min_interval_days + ' дней на партнёра по каждому формату. Пакет: ' + P.rules.package_count + ' даты в пределах ' + P.rules.package_months + ' месяцев. Все размещения помечены «Реклама».</p>' +
      '<div class="stack stack--2">' + P.services.map(function (s) { return '<button type="button" class="pc-row' + (sel === s.key ? ' is-on' : '') + '" data-svc="' + s.key + '"><span class="pc-ord__b"><b>' + esc(s.title) + '</b><span>' + esc(s.where) + ' · ' + esc(s.term) + (s.price_note ? ' · ' + esc(s.price_note) : '') + '</span></span><b class="pc-price">' + (s.price != null ? (s.price === 0 ? '0 ₽' : F.rub(s.price)) : 'уточняется') + '</b></button>'; }).join('') + '</div>' +
      (sel ? '<div class="pc-card"><b class="pc-card__t">Заявка: ' + esc((P.services.filter(function (s) { return s.key === sel; })[0] || {}).title) + '</b><div class="field"><label for="pr-dates">Желаемые даты</label><input class="input" id="pr-dates" placeholder="напр. 1–7 ноября"></div><div class="field"><label for="pr-text">Товары, бренд, материалы</label><textarea class="input" id="pr-text" rows="2" placeholder="Что продвигаем, ссылки на материалы"></textarea></div><button type="button" class="pc-btn" id="pr-send">Отправить заявку менеджеру</button></div>' : '') +
      '<div class="pc-sec"><b>Мои заявки</b></div>' + (mine.length ? '<div class="pc-card pc-list">' + mine.map(function (r) { var s = P.services.filter(function (x) { return x.key === r.service; })[0]; return '<div class="pc-msg2"><span class="pc-ava">' + ic('promo', 16) + '</span><span class="pc-msg2__b"><b>' + esc(s ? s.title : r.service) + ' · ' + STATUS[r.status] + '</b><span>' + F.dateLong(r.ts) + (r.dates ? ' · ' + esc(r.dates) : '') + (r.reply ? ' · ответ: ' + esc(r.reply) : '') + '</span></span></div>'; }).join('') + '</div>' : '<p class="small muted">Заявок пока нет.</p>');
  }

  /* ---------- экран 9: финансы ---------- */
  function tabFinance() {
    var list = myOrders(), fin = O.finance(list), prof = O.profiles.get(st.brand === 'all' ? (brands()[0] || {}).name : st.brand), received = list.filter(function (o) { return o.status === 'received'; });
    var month = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    /* хендофф, п. 9: экран не обещает платёжную схему — условия задаёт договор, суммы считает сервер */
    var HOW = [['Покупатель оплачивает заказ в SOVEAPP', 'порядок расчётов — по договору с площадкой'], ['Комиссия SOVEAPP', 'ставка ' + prof.commissionPct + ' % — по согласованным условиям'], ['Покупатель подтверждает получение', 'или 7 дней без претензий'], ['Выплата по реестру', 'сроки — по договору, статус виден в этом разделе']];
    return '<span class="pc-period pc-period--r">' + month.charAt(0).toUpperCase() + month.slice(1) + ' ▾</span>' +
      '<div class="pc-two"><div class="pc-card pc-card--acc"><small>К выплате</small><b class="pc-mid">' + F.rub(fin.awaitingPayout) + '</b><span class="line--f">' + (received.length ? 'Подготовлены к выплате' : 'после «Получен»') + '</span></div><div class="pc-card"><small>Выплачено</small><b class="pc-mid">—</b><span class="line--f">реестр появится после первой выплаты</span></div></div>' +
      '<div class="pc-card pc-client"><i class="pc-ic">' + ic('clock', 16) + '</i><div class="grow"><small>Ожидают выплаты</small><b class="pc-mid">' + F.rub(fin.awaitingPayout) + '</b><span class="line--f">' + received.length + ' ' + plural(received.length, ['заказ', 'заказа', 'заказов']) + '</span></div></div>' +
      '<div class="pc-card"><div class="pc-sec"><b>Оборот</b>' + periodSel() + '</div><b class="pc-big">' + F.rub(O.finance(inPeriod(list)).total) + '</b><em class="pc-delta">' + (inPeriod(list).length ? 'за выбранный период' : 'заказов пока нет') + '</em>' + spark(daily(inPeriod(list), st.period || 30), 96) + '</div>' +
      '<div class="pc-sec"><b>Последние выплаты</b><a href="#" class="pc-link">Все</a></div><div class="pc-card">' + (received.length ? received.slice(0, 5).map(function (o) { return '<div class="pc-spec"><span>' + F.dateLong(o.ts) + '</span><b>' + F.rub(o.supplierAmount) + '</b><span class="pill pill--on">В обработке</span></div>'; }).join('') : '<span class="line--f">Пока ни один заказ не получен покупателем — выплат нет.</span>') + '</div>' +
      '<div class="pc-sec"><b>Как это работает</b></div><div class="pc-card">' + HOW.map(function (h, i) { return '<div class="pc-how2"><i>' + (i + 1) + '</i><div><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div></div>'; }).join('') + '<span class="line">' + esc(cfg().finance) + '</span><span class="line--f">Суммы «К выплате» и «Комиссия SOVEAPP» считаются по согласованным условиям; платёжная схема описывается договором, а не этим экраном. Реестр выплат появится после первой выплаты. Ставка комиссии задаётся менеджером и меняется только с уведомлением заранее.</span></div>' +
      (mainType() === 'custom' ? '<div class="pc-sec"><b>Платежи по проектам</b></div>' + (list.length ? list.map(function (o) { var pre = /^(paid|in_production|shipped|delivered|installed|received)$/.test(o.status), rest = /^(installed|received)$/.test(o.status), bal = Math.round((o.total - o.prepayment) * 100) / 100; return '<div class="pc-card pc-pay2"><div class="pc-mini"><button type="button" class="pc-mini__o" data-open-order="' + o.id + '">' + thumb(o) + '<span class="pc-ord__b"><b>№' + shortId(o.id) + ' · ' + title(o) + '</b><span>' + orderSum(o) + ' · ' + esc(o.statusLabel) + '</span></span></button></div><div class="pc-spec"><span>Предоплата 50 %</span><b>' + F.rub(o.prepayment) + ' <span class="pill' + (pre ? ' pill--ok' : '') + '">' + (pre ? 'получена' : 'после КП') + '</span></b></div><div class="pc-spec"><span>Остаток после монтажа</span><b>' + F.rub(bal) + ' <span class="pill' + (rest ? ' pill--ok' : '') + '">' + (rest ? 'получен' : 'после приёмки') + '</span></b></div></div>'; }).join('') : '<p class="small muted">Проектов пока нет.</p>') : '') +
      '<div class="pc-sec"><b>Выплаты по заказам</b></div>' + (list.length ? list.map(function (o) { return '<div class="pc-row pc-row--static"><span class="pc-ord__b"><b>№' + shortId(o.id) + ' · ' + title(o) + '</b><span>' + F.dateLong(o.ts) + ' · ' + F.rub(o.total) + ' · комиссия ' + F.rub(o.commissionAmount) + '</span></span><span class="pc-ord__r"><b>' + F.rub(o.supplierAmount) + '</b>' + pill(o) + '</span></div>'; }).join('') : '<p class="small muted">Заказов пока нет.</p>');
  }

  /* ---------- экран 10: профиль ---------- */
  function tabProfile(desktop) {
    var bs = brands().slice(0, 4), scns = O.scenarios(), mgr = O.requests.list().filter(function (r) { return r.kind === 'manager'; }), ev = [], app = lead() || {};
    O.list().forEach(function (o) { o.history.forEach(function (h) { if (h.actor !== 'supplier') ev.push({ at: h.at, text: 'заказ ' + shortId(o.id) + ' · ' + (h.actor === 'buyer' ? 'покупатель' : 'система') + ': ' + O.statusLabel(o.scenario, h.status || h.action) + (h.reason ? ' · ' + h.reason : '') }); }); });
    ev.sort(function (a, b) { return b.at - a.at; });
    var verified = bs.some(function (b) { return b.items > 0; }) || !!app.company;
    var C = cfg(), rows = [['company', 'building', 'Информация о компании'], ['delivery', 'truck', 'Зона доставки', X.delivery.get(brandTitle()) ? 0 : '!'], ['type', C.profileRow[0], C.profileRow[1]], ['contacts', 'phone', 'Контакты'], ['payout', 'card', 'Реквизиты и выплаты'], ['users', 'users', 'Пользователи', X.employees.list().length + 1], ['notifications', 'bell', 'Уведомления', ev.length], ['integrations', 'plug', 'Интеграции'], ['support', 'help', 'Поддержка']].filter(function (r) { return X.access.can('admin') || (r[0] !== 'users' && r[0] !== 'payout'); });
    var body = {
      company: function () { return '<div class="pc-spec"><span>Компания</span><b>' + esc(brandTitle()) + '</b></div>' + (app.category ? '<div class="pc-spec"><span>Категория</span><b>' + esc(app.category) + '</b></div>' : '') + bs.map(function (b) { var p = O.profiles.get(b.name); return '<div class="pc-spec"><span>' + esc(b.name) + '</span><b>комиссия ' + p.commissionPct + ' %' + (p.scenario ? ' · ' + esc(O.typeInfo(p.scenario).short) : '') + '</b></div>' + (O.single ? '' : '<div class="pc-chips">' + scns.map(function (s) { return '<button type="button" class="pc-chip' + (p.scenario === s.key ? ' is-on' : '') + '" data-scn="' + s.key + '" data-brand="' + esc(b.name) + '">' + esc(s.short) + '</button>'; }).join('') + '</div>'); }).join(''); },
      contacts: function () { return '<div class="pc-spec"><span>Телефон</span><b>' + esc(st.phone) + '</b></div>' + (app.contact ? '<div class="pc-spec"><span>Контакт</span><b>' + esc(app.contact) + '</b></div>' : '') + '<span class="line--f">Изменить контакты — через менеджера (форма в «Поддержке»).</span>'; },
      delivery: deliveryBlock,
      payout: function () { return '<span class="line">Реквизиты для выплат передайте менеджеру — он внесёт их в договор. Платёжная схема описывается договором, а не этим экраном.</span>'; },
      type: function () { var t = O.typeInfo(mainType()); return '<div class="pc-spec"><span>Тип кабинета</span><b>' + esc(t.typeLabel) + ' · ' + esc(t.label) + '</b></div><span class="line">' + esc(C.profileRow[2]) + '</span>' + (app.delivery ? '<div class="pc-spec"><span>Доставка</span><b>' + esc(app.delivery) + '</b></div>' : '') + (mainType() === 'materials' ? '<div class="pc-spec"><span>Запас по умолчанию</span><b>10 %</b></div><div class="pc-spec"><span>Кратность</span><b>упаковка</b></div>' : mainType() === 'custom' ? '<div class="pc-spec"><span>Выезд на замер</span><b>Москва и область</b></div><div class="pc-spec"><span>Монтаж</span><b>включён в КП</b></div>' : '<div class="pc-spec"><span>Срок отгрузки</span><b>1–2 дня</b></div>') + '<span class="line--f">Тип выбран при регистрации; сменить можно через менеджера.</span>'; },
      users: usersBlock,
      notifications: function () { return ev.length ? ev.slice(0, 8).map(function (e) { return '<span class="hist">' + new Date(e.at).toLocaleString('ru-RU') + ' · ' + esc(e.text) + '</span>'; }).join('') : '<span class="line--f">Событий по заказам пока нет.</span>'; },
      integrations: integrationsBlock,
      support: function () { return '<div class="pc-chips">' + TOPICS.map(function (t, i) { return '<button type="button" class="pc-chip' + (i === 0 ? ' is-on' : '') + '" data-topic="' + t + '">' + t + '</button>'; }).join('') + '</div><textarea class="input" id="mg-text" rows="2" placeholder="Вопрос менеджеру"></textarea><button type="button" class="pc-btn" id="mg-send">Отправить</button>' + mgr.map(function (r) { return '<div class="stack stack--1" style="border-top:1px solid var(--line);padding-top:8px"><span class="line">' + esc(r.topic) + ': ' + esc(r.text) + '</span><span class="line--f">' + F.dateLong(r.ts) + (r.reply ? ' · ответ: ' + esc(r.reply) : ' · ждёт ответа') + '</span></div>'; }).join(''); }
    };
    if (desktop) return dProfileMarkup(rows, body, verified);
    return '<div class="pc-card pc-prof"><span class="pc-ava pc-ava--lg">' + esc(brandTitle().charAt(0).toUpperCase()) + '</span><div class="grow"><b>' + esc(brandTitle()) + '</b><span class="pc-verified">' + ic('check', 13) + ' ' + (verified ? 'Проверенный партнёр' : 'Новый партнёр · заявка на модерации') + '</span><button type="button" class="pc-btn pc-btn--sm" data-tab="goods">Редактировать</button></div></div>' +
      '<div class="pc-card pc-menu">' + rows.map(function (r) { var open = st.profOpen === r[0]; return '<button type="button" class="pc-menu__r' + (open ? ' is-open' : '') + '" data-prof="' + r[0] + '"><i class="pc-ic pc-ic--round">' + ic(r[1], 17) + '</i><span>' + r[2] + '</span>' + (r[3] ? '<em>' + r[3] + '</em>' : '') + '<b>' + (open ? '⌃' : '›') + '</b></button>' + (open ? '<div class="pc-menu__body">' + body[r[0]]() + '</div>' : ''); }).join('') + '<button type="button" class="pc-menu__r pc-menu__r--out" data-out><i class="pc-ic pc-ic--round">' + ic('out', 17) + '</i><span>Выйти из кабинета</span></button></div>';
  }
  /* зона доставки: чипы зон + другие города + условия; в демо пишется и на бренды показанных товаров, чтобы покупатель видел в карточке */
  function deliveryBlock() {
    var brand = brandTitle(), d = X.delivery.get(brand), app = lead() || {}, t = mainType(), cur = d || { zones: [], other: '', note: '' };
    var hint = t === 'materials' ? 'Материалы тяжёлые: отметьте, куда возите сами, остальное — транспортной компанией. Покупатель видит зону в карточке материала и в корзине.' : t === 'custom' ? 'Куда доставляете и монтируете изделия — туда же выезжаете на замер. Покупатель видит зону в карточке изделия и в проекте.' : 'Куда доставляете товары. Покупатель видит зону в карточке товара, корзине и заказе; вне зоны — предупреждение до оформления.';
    return '<span class="line">' + esc(hint) + '</span><div class="pc-chips" id="dz-zones">' + X.delivery.ZONES.map(function (z) { return '<button type="button" class="pc-chip pc-chip--sm' + (cur.zones.indexOf(z.key) >= 0 ? ' is-on' : '') + '" data-zone="' + z.key + '">' + esc(z.label) + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label for="dz-other">Другие города</label><input class="input" id="dz-other" placeholder="Тверь, Калуга" value="' + esc(d ? cur.other : (app.region || '')) + '"></div>' +
      '<div class="field"><label for="dz-note">Условия доставки</label><input class="input" id="dz-note" placeholder="от 10 000 ₽ бесплатно, 1–2 дня" value="' + esc(d ? cur.note : (app.delivery || '')) + '"></div>' +
      (d ? '<div class="pc-spec"><span>Покупатель видит</span><b>' + esc(X.delivery.label(brand) || 'только условия') + '</b></div>' : '<span class="line--f pc-err">Зона не указана — покупатель видит «доставка уточняется».</span>') +
      '<button type="button" class="pc-btn" data-zone-save>Сохранить зону</button>';
  }
  function zonePrompt() { return X.delivery.get(brandTitle()) ? '' : '<button type="button" class="pc-next2" data-tab="profile" data-open-prof="delivery">' + ic('truck', 18) + '<span><b>Укажите зону доставки</b><small>Покупатели видят её в карточке товара и корзине; вне зоны — предупреждение.</small></span>' + ic('arrow', 16) + '</button>'; }
  function cityOf(address) { var c = String(address || '').split(' · ')[0].trim(); return !c || /^квартира/i.test(c) || /м²/.test(c) ? '' : c; }
  function usersBlock() {
    var list = X.employees.list();
    return '<div class="pc-spec"><span class="pc-spec--ink">Вы · владелец</span><b>' + esc(st.phone) + '</b></div>' +
      list.map(function (e) { return '<div class="pc-emp"><div class="row row--between"><div><b>' + esc(e.label) + '</b><span class="small muted"> · ' + esc(e.phone) + '</span></div><div class="row"><button type="button" class="btn btn--ghost btn--small" data-emp-login="' + e.id + '">Войти как</button><button type="button" class="btn btn--link" data-emp-del="' + e.id + '">Убрать</button></div></div><div class="pc-chips">' + X.SECTIONS.map(function (k) { return '<button type="button" class="pc-chip pc-chip--sm' + (e.sections.indexOf(k) >= 0 ? ' is-on' : '') + '" data-emp-sec="' + e.id + '" data-sec="' + k + '">' + X.SECTION_LABEL[k] + '</button>'; }).join('') + '</div></div>'; }).join('') +
      '<span class="line--f">Сотрудник входит в этот же кабинет по своему телефону и видит только отмеченные разделы. Главная и профиль открыты всем.</span>' +
      '<div class="field"><label for="emp-phone">Телефон сотрудника</label><input class="input" id="emp-phone" type="tel" placeholder="+7 999 000-00-00"></div><div class="field"><label for="emp-label">Имя или роль</label><input class="input" id="emp-label" placeholder="Менеджер склада"></div>' +
      '<div class="field"><label>Доступ нового сотрудника</label><div class="pc-chips" id="emp-new-secs">' + X.SECTIONS.map(function (k) { return '<button type="button" class="pc-chip pc-chip--sm' + (k !== 'admin' ? ' is-on' : '') + '" data-new-sec="' + k + '">' + X.SECTION_LABEL[k] + '</button>'; }).join('') + '</div></div>' +
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
  var ORD_SUB = { stock: 'Обработка новых заказов, подтверждение наличия и контроль доставки', materials: 'Заявки на расчёт, КП и контроль доставки', custom: 'Заявки на проекты, замеры, КП и изготовление' };
  function dShell(inner) {
    var cap = D.capsule('k1');
    return (X.access.current() ? '<div class="pc-stripe pc-stripe--emp"><span>Вы вошли как сотрудник · ' + esc(X.access.current().label) + ' · открыты: ' + X.access.current().sections.map(function (k) { return X.SECTION_LABEL[k]; }).join(', ').toLowerCase() + '</span><button type="button" data-emp-logout>вернуться как владелец</button></div>' : '') +
      '<div class="pc-shell pc-shell--d"><nav class="pc-nav" aria-label="Разделы кабинета"><span class="pc-nav__brand">SOVEAPP<small>Кабинет партнёра · ' + esc(O.typeInfo(mainType()).typeLabel) + '</small></span>' +
      navItems().filter(function (n) { return canTab(n[0]); }).map(function (n) { var need = n[0] === 'orders' ? myOrders().filter(O.needsSupplier).length : 0; return '<button type="button" class="pc-nav__b' + (st.tab === n[0] && !st.screen ? ' is-on' : '') + '" data-tab="' + n[0] + '">' + ic(n[2], 18) + '<span>' + esc(n[1]) + '</span>' + (need ? '<i>' + need + '</i>' : '') + '</button>'; }).join('') +
      '<button type="button" class="pc-nav__promo" data-tab="promo">' + (cap && cap.cover ? '<img src="' + cap.cover + '" alt="">' : '') + '<b>Больше продаж с SOVEAPP</b><span>Инструменты продвижения →</span></button></nav>' +
      '<div class="pc-main pc-main--d">' + inner + '</div></div>' +
      (st.demo ? '<div class="pc-stripe pc-stripe--foot"><span>Демо-кабинет · ' + esc(O.typeInfo(st.demo).label) + ' · заказы учебные</span><a href="my.html?v=orders">глазами покупателя</a><button type="button" data-out>выйти</button></div>' : '') +
      '<p class="pc-foot">Прототип: вход, заказы и заявки хранятся только в этом браузере. В продукте партнёр видит только свои бренды.</p>';
  }
  function dHeader(title, sub, o) {
    o = o || {};
    return '<div class="pc-dhead"><div class="pc-dhead__l">' + (o.back ? '<button type="button" class="pc-link" data-pc-back>' + ic('back', 16) + ' Назад</button>' : '') + '<h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><div class="pc-dhead__r">' +
      (o.search ? '<label class="pc-search pc-dsearch">' + ic('search', 16) + '<input id="pc-q" placeholder="' + esc(o.search) + '" value="' + esc(st.q || '') + '"></label>' : '') +
      '<button type="button" class="pc-bell" data-tab="messages" aria-label="Сообщения">' + ic('bell', 20) + ((S.leads.list() || []).length ? '<i></i>' : '') + '</button>' +
      '<button type="button" class="pc-davatar" data-tab="profile"><i>' + esc(brandTitle().charAt(0).toUpperCase()) + '</i><span><b>' + esc(brandTitle()) + '</b><small>' + esc(O.typeInfo(mainType()).label) + '</small></span><em>▾</em></button></div></div>';
  }
  function dMetric(label, value, delta) { return '<div class="pc-card pc-dmetric"><small>' + esc(label) + '</small><b class="pc-mid">' + value + '</b>' + (delta ? '<em class="pc-delta">' + esc(delta) + '</em>' : '<em class="pc-delta pc-delta--mute">—</em>') + '</div>'; }
  function dHome() {
    var list = myOrders(), fin = O.finance(inPeriod(list)), week = Date.now() - 7 * 864e5, wk = list.filter(function (o) { return o.ts > week; }).length, nx = NEXT[mainType()] || NEXT.stock, views = goodsItems().length * 160 + list.length * 37, need = list.filter(O.needsSupplier).length;
    return dHeader('Главная', 'Вся ключевая информация о вашем бизнесе на SOVEAPP') +
      kpiTiles(list) +
      '<div class="pc-sec"><b>Ключевые показатели</b>' + periodSel() + '</div>' +
      '<div class="pc-dmetrics">' + dMetric('Оборот', F.rub(fin.total), fin.count ? 'за выбранный период' : 'заказов пока нет') + dMetric('Заказы', String(fin.count), wk ? '+' + wk + ' за неделю' : '') + dMetric('Средний чек', fin.count ? F.rub(fin.averageCheck) : '—', '') + dMetric('Просмотры товаров', String(views), '+25 % · учебно') + '</div>' +
      '<div class="pc-dtwo"><div class="pc-card"><div class="pc-sec"><b>Оборот</b><span class="small muted">по дням · ' + (st.period || 30) + ' дней</span></div>' + spark(daily(inPeriod(list), st.period || 30), 150) + '</div>' +
      '<div class="pc-card pc-dnext"><b class="pc-card__t">Следующее действие</b><div class="pc-dnext__b"><i class="pc-ic">' + ic('box', 18) + '</i><div><b>' + esc(nx[0]) + (need ? ' · ' + need : '') + '</b><span>' + esc(nx[1]) + '</span></div></div><button type="button" class="pc-btn" data-tab="orders" data-filter="action">' + esc(nx[2]) + ' →</button></div></div>' +
      '<div class="pc-dcols2">' + zonePrompt() + homeWidget(list) + '</div>';
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
    return dHeader(C.goodsTitle, 'Управление ассортиментом, ценами и наличием', { search: 'Поиск по товарам, артикулу, категории…' }) +
      '<div class="pc-dfilters">' + sel('df-cat', dc, [['all', 'Все категории']].concat(cats.map(function (c) { return [c, c]; }))) + sel('df-status', ds, [['all', 'Все статусы']].concat(Object.keys(X.STATUS).map(function (k) { return [k, X.STATUS[k]]; }))) + (C.stockMode === 'capacity' ? '' : sel('df-avail', da, [['all', 'Наличие'], ['yes', 'Есть остаток'], ['no', 'Нет остатка']])) + '<button type="button" class="pc-link" data-dreset>Сбросить</button><span class="grow"></span>' +
      '<button type="button" class="pc-btn pc-btn--ghost" data-open-add>' + ic('plus', 16) + ' ' + esc(C.addTitle) + ' вручную</button><button type="button" class="pc-btn" data-tab="profile" data-open-prof="integrations">' + ic('plug', 16) + ' Подключить склад</button></div>' +
      '<div class="pc-card pc-card--table"><table class="pc-table"><thead><tr><th></th><th>Товар</th><th>Категория</th><th>РРЦ</th><th>Скидка METOD</th><th>Цена SOVEAPP</th><th>' + (C.stockMode === 'capacity' ? 'Срок изготовления' : C.stockMode === 'units' ? 'Наличие, м²' : 'Наличие') + '</th><th>Обновлено</th><th>Статус</th><th></th></tr></thead><tbody>' +
      (shown.length ? shown.map(function (g) { var disc = g.priceRetail && g.priceSove && g.priceRetail > g.priceSove ? Math.round((1 - g.priceSove / g.priceRetail) * 100) : 0; return '<tr data-open-product="' + esc(g.ref) + '"><td><input type="checkbox" data-stop aria-label="Выбрать"></td><td><div class="pc-tprod">' + (g.img ? '<img src="' + g.img + '" alt="" loading="lazy">' : '<span class="pc-tprod__ph">' + ic('goods', 16) + '</span>') + '<div><b>' + esc(g.name) + '</b><small>' + esc([g.sizes, g.article ? 'арт. ' + g.article : null].filter(Boolean).join(', ') || g.brand || '') + '</small></div></div></td><td>' + esc(g.category || '—') + '</td><td>' + (g.priceRetail != null ? F.rub(g.priceRetail) + C.priceNote : '—') + '</td><td>' + (disc ? disc + ' %' : '—') + '</td><td class="green"><b>' + (g.priceSove != null ? (mainType() === 'custom' ? 'от ' : '') + F.rub(g.priceSove) + C.priceNote : '—') + '</b></td><td>' + dAvail(g) + '</td><td>' + dUpdated(g) + '</td><td>' + dStatusDot(g) + '</td><td class="pc-tmore">⋯</td></tr>'; }).join('') : '<tr><td colspan="10"><span class="small muted">Ничего не найдено — сбросьте фильтры.</span></td></tr>') +
      '</tbody></table></div>' +
      '<p class="line--f">' + items.length + ' ' + plural(items.length, ['товар', 'товара', 'товаров']) + ' · каждое сохранение уходит на проверку менеджеру SOVEAPP, в витрину — после одобрения.</p>';
  }
  function dOrders() {
    var list = myOrders(), C = cfg(), f = st.filter, q = (st.q || '').toLowerCase();
    var groups = { all: list, action: list.filter(O.needsSupplier) }, chips = [['all', 'Все'], ['action', 'Ждут вас']];
    C.stages.forEach(function (sg) { groups[sg[0]] = list.filter(function (o) { return inStatuses(o, sg[0]); }); chips.push([sg[0], sg[1]]); });
    ['k_new', 'k_ship', 'k_calc', 'k_measure', 'k_prod', 'k_pack', 'k_meas'].forEach(function (k) { groups[k] = kpiCount(k, list); });
    if (!groups[f]) f = st.filter = 'all';
    var shown = groups[f].filter(function (o) { return !q || o.id.toLowerCase().indexOf(q) >= 0 || o.items.some(function (it) { return it.name.toLowerCase().indexOf(q) >= 0; }); });
    if (!st.dOrder || !shown.some(function (o) { return o.id === st.dOrder; })) st.dOrder = shown[0] ? shown[0].id : null;
    var o = st.dOrder ? O.get(st.dOrder) : null, prefix = mainType() === 'custom' ? 'Проект №' : mainType() === 'materials' ? 'Запрос №' : 'Заказ №';
    return dHeader(ORD_LABEL[mainType()] || 'Заказы', ORD_SUB[mainType()] || ORD_SUB.stock, { search: 'Поиск по номеру заказа…' }) +
      '<div class="pc-chips">' + chips.map(function (x) { return '<button type="button" class="pc-chip' + (f === x[0] ? ' is-on' : '') + '" data-filter="' + x[0] + '">' + x[1] + ' <i>' + groups[x[0]].length + '</i></button>'; }).join('') + '</div>' +
      '<div class="pc-dorders"><div class="pc-dlist">' + (shown.length ? shown.map(function (x) { return '<button type="button" class="pc-row' + (x.id === st.dOrder ? ' is-on' : '') + '" data-dorder="' + x.id + '">' + thumb(x) + '<span class="pc-ord__b"><b>№' + shortId(x.id) + '</b><span>' + F.dateLong(x.ts) + ' · ' + F.rub(x.total) + '</span><span>' + pill(x) + '</span></span></button>'; }).join('') : '<p class="small muted">' + (list.length ? 'В этом списке заказов нет.' : 'Заказов пока нет. Они появятся, когда покупатель оформит корзину с вашими товарами.') + '</p>') + '</div>' +
      '<div class="stack stack--3 pc-dcenter">' + (o ? '<b class="pc-dnum">' + prefix + shortId(o.id) + '</b>' + orderScreen(o) : '<p class="small muted">Выберите заказ слева.</p>') + '</div>' +
      '<div class="pc-card pc-dchat">' + (o ? dChat(o) : '<span class="line--f">Переписка появится после выбора заказа.</span>') + '</div></div>';
  }
  function dChat(o) {
    var msgs = X.chat.list(o.id);
    return '<div class="pc-dtabs"><button type="button" class="is-on">Как с покупателем</button><button type="button">Файлы (0)</button></div>' +
      '<div class="pc-dchat__list">' + msgs.map(function (m) { return '<div class="pc-dchat__m' + (m.who === 'me' ? ' is-me' : '') + '"><small>' + (m.who === 'me' ? 'Вы' : 'Покупатель') + ' · ' + new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</small>' + esc(m.text) + '</div>'; }).join('') + '</div>' +
      '<div class="pc-dchat__in"><input class="input" id="dc-in" placeholder="Написать сообщение…"><button type="button" class="pc-roundbtn" data-dsend="' + o.id + '" aria-label="Отправить">' + ic('arrow', 16) + '</button></div>';
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
      '<div class="pc-card"><div class="pc-steps4">' + HOW.map(function (h) { return '<div class="pc-step"><i class="pc-ic">' + ic(h[2], 18) + '</i><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div>'; }).join('') + '</div><span class="line--f">' + esc(cfg().finance) + ' Суммы «К выплате» и «Комиссия SOVEAPP» считаются по согласованным условиям; платёжная схема описывается договором, а не этим экраном.</span></div>' +
      '<div class="pc-card pc-card--table"><div class="pc-dtabs pc-dtabs--pad">' + tabs.map(function (t) { return '<button type="button" class="' + (ft === t[0] ? 'is-on' : '') + '" data-fintab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<span class="grow"></span><span class="pc-period">' + month + ' ▾</span></div>' +
      '<table class="pc-table"><thead><tr><th>Дата</th><th>№ заказа</th><th>Покупатель</th><th>Сумма заказа</th><th>Комиссия SOVEAPP</th><th>К выплате</th><th>Статус</th></tr></thead><tbody>' + (rows.length ? rows.map(function (o) { return '<tr data-open-order="' + o.id + '"><td>' + new Date(o.ts).toLocaleDateString('ru-RU') + '</td><td>№' + shortId(o.id) + '</td><td>' + esc(cityOf(o.address) || 'Покупатель') + '</td><td>' + F.rub(o.total) + '</td><td>' + F.rub(o.commissionAmount) + '</td><td><b>' + F.rub(o.supplierAmount) + '</b></td><td>' + statusCell(o) + '</td></tr>'; }).join('') : '<tr><td colspan="7"><span class="small muted">Пока пусто.</span></td></tr>') + '</tbody></table></div>' +
      (mainType() === 'custom' ? '<div class="pc-sec"><b>Платежи по проектам</b><span class="small muted">предоплата 50 % после КП · остаток после монтажа</span></div><div class="pc-card pc-card--table"><table class="pc-table"><thead><tr><th>Проект</th><th>Сумма</th><th>Предоплата 50 %</th><th>Остаток после монтажа</th></tr></thead><tbody>' + all.map(function (o) { var pre = /^(paid|in_production|shipped|delivered|installed|received)$/.test(o.status), rest = /^(installed|received)$/.test(o.status); return '<tr data-open-order="' + o.id + '"><td>№' + shortId(o.id) + ' · ' + title(o) + '</td><td>' + orderSum(o) + '</td><td>' + F.rub(o.prepayment) + ' <span class="pc-dot ' + (pre ? 'pc-dot--ok">получена' : 'pc-dot--muted">после КП') + '</span></td><td>' + F.rub(Math.round((o.total - o.prepayment) * 100) / 100) + ' <span class="pc-dot ' + (rest ? 'pc-dot--ok">получен' : 'pc-dot--muted">после приёмки') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '');
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
      if (st.screen.kind === 'product' && g) inner = dHeader(screenTitle(), g.name, { back: true }) + '<div class="pc-dproduct">' + productScreen(g) + '</div>';
      else if (st.screen.kind === 'stock' && g) inner = dHeader(screenTitle(), g.name, { back: true }) + '<div class="pc-dwide stack stack--3">' + stockScreen(g) + '</div>';
      else if (st.screen.kind === 'add') inner = dHeader(cfg().addTitle, 'Позиция появится в кабинете сразу, в витрине — после проверки менеджером', { back: true }) + '<div class="pc-dwide stack stack--3">' + addScreen() + '</div>';
      else if (st.screen.kind === 'chat') inner = dHeader('Переписка', 'Сообщения покупателя по заказу', { back: true }) + '<div class="pc-dwide stack stack--3">' + chatScreen(st.screen.id) + '</div>';
      else inner = dHeader('Не найдено', '', { back: true });
    } else if (t === 'home') inner = dHome();
    else if (t === 'goods') inner = dGoods();
    else if (t === 'orders') inner = dOrders();
    else if (t === 'finance') inner = dFinance();
    else if (t === 'profile') inner = tabProfile(true);
    else if (t === 'messages') inner = dHeader('Сообщения', 'Клиенты пишут с карточки товара и из заказа') + '<div class="pc-dwide">' + tabMessages() + '</div>';
    else if (t === 'promo') inner = dHeader('Продвижение', 'Канал METOD и размещения на SOVEAPP') + '<div class="pc-dcols2">' + tabPromo() + '</div>';
    else if (t === 'stocks') inner = dHeader('Остатки', 'Склады и остатки по всем товарам') + '<div class="pc-dcols2">' + tabStocks() + '</div>';
    else if (t === 'calc') inner = dHeader('Калькулятор', 'Так же считает покупатель в заявке') + '<div class="pc-dcols2">' + tabCalc() + '</div>';
    else if (t === 'production') inner = dHeader('Производство', 'Замеры, этапы изготовления и загрузка') + '<div class="pc-dcols2">' + tabProduction() + '</div>';
    else inner = dHome();
    return dShell(inner);
  }
  function viewCab() {
    if (!canTab(st.tab)) st.tab = 'home';
    if (isDesktop()) return dView();
    var body;
    if (st.screen) {
      var g = st.screen.ref ? goodById(st.screen.ref) : null, o = st.screen.id ? O.get(st.screen.id) : null;
      body = st.screen.kind === 'chat' ? chatScreen(st.screen.id) : st.screen.kind === 'product' && g ? productScreen(g) : st.screen.kind === 'stock' && g ? stockScreen(g) : st.screen.kind === 'add' ? addScreen() : st.screen.kind === 'order' && o ? orderScreen(o) : '<p class="small muted">Не найдено.</p>';
    } else body = { home: tabHome, goods: tabGoods, orders: tabOrders, promo: tabPromo, finance: tabFinance, profile: tabProfile, messages: tabMessages, stocks: tabStocks, calc: tabCalc, production: tabProduction }[st.tab]();
    return shell(body);
  }
  function openScreen(sc) { st.screen = sc; paint(); window.scrollTo(0, 0); }
  function back() {
    if (st.screen && st.screen.kind === 'stock') return openScreen({ kind: 'product', ref: st.screen.ref });
    if (st.screen) { st.screen = null; paint(); window.scrollTo(0, 0); return; }
    st.tab = 'home'; paint(); window.scrollTo(0, 0);
  }

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
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { st.tab = b.getAttribute('data-tab'); st.screen = null; var fl = b.getAttribute('data-filter'); if (fl) st.filter = fl; var pf = b.getAttribute('data-open-prof'); if (pf) st.profOpen = pf; paint(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-pc-back]').forEach(function (b) { b.addEventListener('click', back); });
    root.querySelectorAll('[data-period]').forEach(function (sel) { sel.addEventListener('change', function () { st.period = Number(sel.value) || 30; paint(); }); });
    root.querySelectorAll('[data-open-chat]').forEach(function (b) { b.addEventListener('click', function () { st.tab = 'messages'; openScreen({ kind: 'chat', id: b.getAttribute('data-open-chat') }); }); });
    var cs = root.querySelector('[data-chat-send]'), ci = root.querySelector('#pc-chat-in');
    if (cs && ci) { var sendChat = function () { var v = ci.value.trim(); if (!v) return; X.chat.add(cs.getAttribute('data-chat-send'), 'me', v); paint(); var ci2 = root.querySelector('#pc-chat-in'); if (ci2) ci2.focus(); }; cs.addEventListener('click', sendChat); ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }); }
    root.querySelectorAll('.pc-chips [data-filter]').forEach(function (b) { b.addEventListener('click', function () { st.filter = b.getAttribute('data-filter'); paint(); }); });
    root.querySelectorAll('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { st.cat = b.getAttribute('data-cat'); paint(); }); });
    var q = root.querySelector('#pc-q'); if (q) q.addEventListener('input', function () { st.q = q.value; var pos = q.selectionStart; paint(); var q2 = root.querySelector('#pc-q'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } });
    root.querySelectorAll('[data-open-product]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'product', ref: b.getAttribute('data-open-product') }); }); });
    root.querySelectorAll('[data-open-stock]').forEach(function (b) { b.addEventListener('click', function () { st.stockTab = 'stock'; st.whDraft = {}; openScreen({ kind: 'stock', ref: b.getAttribute('data-open-stock') }); }); });
    root.querySelectorAll('[data-open-add]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'add' }); }); });
    root.querySelectorAll('[data-open-order]').forEach(function (b) { b.addEventListener('click', function () { openScreen({ kind: 'order', id: b.getAttribute('data-open-order') }); }); });
    root.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { var g = goodById(b.getAttribute('data-edit')); if (g) goodsForm(g); }); });
    root.querySelectorAll('[data-stock-tab]').forEach(function (b) { b.addEventListener('click', function () { st.stockTab = b.getAttribute('data-stock-tab'); paint(); }); });
    var draftStatus = st.screen && st.screen.ref ? (goodById(st.screen.ref) || {}).status : 'in_stock';
    root.querySelectorAll('#st-status [data-gs], #g-status [data-gs]').forEach(function (b) { b.addEventListener('click', function () { draftStatus = b.getAttribute('data-gs'); var box = b.parentNode; box.querySelectorAll('[data-gs]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); var sw = root.querySelector('[data-switch]'); if (sw) { sw.classList.toggle('is-on', draftStatus !== 'none'); sw.setAttribute('aria-checked', draftStatus !== 'none'); } }); });
    var sw = root.querySelector('[data-switch]'); if (sw) sw.addEventListener('click', function () { var on = !sw.classList.contains('is-on'); sw.classList.toggle('is-on', on); sw.setAttribute('aria-checked', on); draftStatus = on ? (draftStatus === 'none' ? 'in_stock' : draftStatus) : 'none'; root.querySelectorAll('#st-status [data-gs]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-gs') === draftStatus); }); });
    root.querySelectorAll('[data-wh-edit]').forEach(function (b) { b.addEventListener('click', function () { var s = X.stocks.list(st.screen.ref).filter(function (x) { return x.id === b.getAttribute('data-wh-edit'); })[0]; if (s) { st.whDraft = { warehouse: s.warehouse, qty: s.qty, unit: s.unit }; paint(); } }); });
    root.querySelectorAll('[data-wh-del]').forEach(function (b) { b.addEventListener('click', function () { X.stocks.remove(st.screen.ref, b.getAttribute('data-wh-del')); ui.toast('Склад убран', 'ok'); paint(); }); });
    var wa = root.querySelector('[data-wh-add]'); if (wa) wa.addEventListener('click', function () { var n = root.querySelector('#wh-name').value.trim(), qv = root.querySelector('#wh-qty').value.trim(), u = root.querySelector('#wh-unit').value.trim(); if (!n || !qv) return ui.toast('Укажите склад и остаток', 'error'); X.stocks.set(st.screen.ref, n, Number(qv.replace(',', '.')) || 0, u || 'шт'); st.whDraft = {}; ui.toast('Склад сохранён', 'ok'); paint(); });
    root.querySelectorAll('[data-stock-save]').forEach(function (b) { b.addEventListener('click', function () { var g = goodById(b.getAttribute('data-stock-save')); if (!g) return; var n = root.querySelector('#wh-name'), qv = root.querySelector('#wh-qty'), u = root.querySelector('#wh-unit'); if (n && n.value.trim() && qv && qv.value.trim()) X.stocks.set(g.ref, n.value.trim(), Number(qv.value.replace(',', '.')) || 0, (u && u.value.trim()) || 'шт'); var pr = root.querySelector('#pr-retail'), ps = root.querySelector('#pr-sove'), cs = root.querySelector('#cap-slots'), cl = root.querySelector('#cap-lead'); var patch = { name: g.name, priceRetail: pr ? pr.value : g.priceRetail, priceSove: ps ? ps.value : g.priceSove, status: draftStatus, brand: brandTitle(), own: g.own }; if (cs) patch.capacity = cs.value.trim(); if (cl) patch.leadTime = cl.value.trim(); X.edits.submit(g.ref, patch); ui.toast('Сохранено: остатки в кабинете, цены и статус — на проверке у менеджера', 'ok'); st.whDraft = {}; openScreen({ kind: 'product', ref: g.ref }); }); });
    root.querySelectorAll('[data-gcat]').forEach(function (b) { b.addEventListener('click', function () { root.querySelector('#g-category').value = b.getAttribute('data-gcat'); root.querySelectorAll('[data-gcat]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
    var as = root.querySelector('[data-add-save]'); if (as) as.addEventListener('click', function () { var v = function (id) { var el = root.querySelector('#g-' + id); return el ? el.value.trim() : ''; }; if (v('name').length < 2) return ui.toast('Укажите название товара', 'error'); var payload = { name: v('name'), article: v('article'), category: v('category'), description: v('description'), sizes: v('sizes'), priceRetail: v('priceRetail'), priceSove: v('priceSove'), status: draftStatus, brand: v('brand') || brandTitle(), own: true }; cfg().goodsFields.forEach(function (x) { payload[x[0]] = v(x[0]); }); X.edits.submit('own:' + Date.now().toString(36), payload); ui.toast('Товар отправлен на проверку менеджеру', 'ok'); st.screen = null; paint(); window.scrollTo(0, 0); });
    root.querySelectorAll('[data-dorder]').forEach(function (b) { b.addEventListener('click', function () { st.dOrder = b.getAttribute('data-dorder'); paint(); }); });
    root.querySelectorAll('[data-stop]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); }); });
    [['df-cat', 'dCat'], ['df-status', 'dStatus'], ['df-avail', 'dAvail']].forEach(function (p) { var el = root.querySelector('#' + p[0]); if (el) el.addEventListener('change', function () { st[p[1]] = el.value; paint(); }); });
    var dr = root.querySelector('[data-dreset]'); if (dr) dr.addEventListener('click', function () { st.dCat = st.dStatus = st.dAvail = 'all'; st.q = ''; paint(); });
    root.querySelectorAll('[data-fintab]').forEach(function (b) { b.addEventListener('click', function () { st.finTab = b.getAttribute('data-fintab'); paint(); }); });
    var dsend = root.querySelector('[data-dsend]'), din = root.querySelector('#dc-in');
    if (dsend && din) { var sendMsg = function () { var v = din.value.trim(); if (!v) return; X.chat.add(dsend.getAttribute('data-dsend'), 'me', v); paint(); var el = root.querySelector('#dc-in'); if (el) el.focus(); }; dsend.addEventListener('click', sendMsg); din.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendMsg(); } }); }
    root.querySelectorAll('[data-zone]').forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('is-on'); }); });
    var zs = root.querySelector('[data-zone-save]'); if (zs) zs.addEventListener('click', function () { var zones = Array.prototype.map.call(root.querySelectorAll('#dz-zones .is-on'), function (b) { return b.getAttribute('data-zone'); }), patch = { zones: zones, other: root.querySelector('#dz-other').value.trim(), note: root.querySelector('#dz-note').value.trim() }; if (!zones.length && !patch.other) return ui.toast('Отметьте хотя бы одну зону или впишите город', 'error'); X.delivery.set(brandTitle(), patch); if (st.demo) { var seen = {}; goodsItems().forEach(function (g) { if (g.brand && !seen[g.brand]) { seen[g.brand] = true; X.delivery.set(g.brand, patch); } }); } ui.toast('Зона доставки сохранена — покупатель видит её сразу', 'ok'); paint(); });
    root.querySelectorAll('[data-wh-step]').forEach(function (b) { b.addEventListener('click', function () { var ref = b.getAttribute('data-wh-ref'), r = X.stocks.list(ref).filter(function (x) { return x.id === b.getAttribute('data-wh-id'); })[0]; if (!r) return; X.stocks.set(ref, r.warehouse, Math.max(0, (Number(r.qty) || 0) + Number(b.getAttribute('data-wh-step'))), r.unit); paint(); }); });
    root.querySelectorAll('[data-stage]').forEach(function (b) { b.addEventListener('click', function () { X.production.setStage(b.getAttribute('data-oid'), b.getAttribute('data-stage')); ui.toast('Этап обновлён — покупатель видит прогресс', 'ok'); paint(); }); });
    root.querySelectorAll('[data-measure]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-measure'), o = O.get(id); if (!o) return; ui.modal({ title: 'Перенести замер', text: 'Покупатель получит новую дату сразу.', html: '<div class="field"><label for="ms-date">Дата замера</label><input class="input" id="ms-date" placeholder="ДД.ММ.ГГГГ" value="' + esc(measureDate(o)) + '"></div>', actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var v = api.el.querySelector('#ms-date').value.trim(); if (!v) return ui.toast('Укажите дату', 'error'); X.production.setMeasure(id, v); api.close(); ui.toast('Замер перенесён на ' + v, 'ok'); paint(); } }, { label: 'Отмена', kind: 'link' }] }); }); });
    var ca = root.querySelector('#calc-area'), cm = root.querySelector('#calc-mat'), cr = root.querySelector('#calc-reserve'), co = root.querySelector('#calc-out');
    if (ca) ca.addEventListener('input', function () { st.calcArea = ca.value; co.innerHTML = calcOut(calcSel()); });
    if (cm) cm.addEventListener('change', function () { st.calcMat = cm.value; co.innerHTML = calcOut(calcSel()); });
    if (cr) cr.addEventListener('input', function () { var v = Number(cr.value); if (isFinite(v) && v >= 0 && v <= 50) { X.calc.set({ reserve: v }); co.innerHTML = calcOut(calcSel()); } });
    root.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { var o = O.get(b.getAttribute('data-oid')), a = o && o.actions.supplier.filter(function (x) { return x.status === b.getAttribute('data-act'); })[0]; if (o && a) actionSheet(o, a); }); });
    root.querySelectorAll('[data-reply]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-reply'), v = root.querySelector('[data-reply-in="' + id + '"]').value.trim(); if (v) { O.replyReview(id, v); paint(); } }); });
    root.querySelectorAll('[data-auto]').forEach(function (b) { b.addEventListener('click', function () { O.autoReceive(b.getAttribute('data-auto')); ui.toast('Заказ закрыт автоматически — «Получен»', 'ok'); paint(); }); });
    root.querySelectorAll('[data-svc]').forEach(function (b) { b.addEventListener('click', function () { st.promoSel = st.promoSel === b.getAttribute('data-svc') ? null : b.getAttribute('data-svc'); paint(); }); });
    var ps = root.querySelector('#pr-send'); if (ps) ps.addEventListener('click', function () { O.requests.add('promotion', { brand: st.brand === 'all' ? (brands()[0] || {}).name : st.brand, service: st.promoSel, dates: root.querySelector('#pr-dates').value.trim(), text: root.querySelector('#pr-text').value.trim() }); st.promoSel = null; ui.toast('Заявка ушла менеджеру', 'ok'); paint(); });
    root.querySelectorAll('[data-scn]').forEach(function (b) { b.addEventListener('click', function () { O.profiles.set(b.getAttribute('data-brand'), { scenario: b.getAttribute('data-scn') }); ui.toast('Тип поставщика сохранён', 'ok'); paint(); }); });
    root.querySelectorAll('[data-prof]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-prof'); st.profOpen = st.profOpen === k ? null : k; paint(); }); });
    var topic = TOPICS[0]; root.querySelectorAll('[data-topic]').forEach(function (b) { b.addEventListener('click', function () { topic = b.getAttribute('data-topic'); root.querySelectorAll('[data-topic]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); }); });
    var mg = root.querySelector('#mg-send'); if (mg) mg.addEventListener('click', function () { var v = root.querySelector('#mg-text').value.trim(); if (!v) return; O.requests.add('manager', { brand: (brands()[0] || {}).name, topic: topic, text: v }); ui.toast('Отправлено менеджеру', 'ok'); paint(); });
    root.querySelectorAll('[data-emp-sec]').forEach(function (b) { b.addEventListener('click', function () { X.employees.toggle(b.getAttribute('data-emp-sec'), b.getAttribute('data-sec')); paint(); }); });
    root.querySelectorAll('[data-emp-del]').forEach(function (b) { b.addEventListener('click', function () { X.employees.remove(b.getAttribute('data-emp-del')); paint(); }); });
    root.querySelectorAll('[data-emp-login]').forEach(function (b) { b.addEventListener('click', function () { X.access.loginAs(b.getAttribute('data-emp-login')); st.tab = 'home'; st.screen = null; ui.toast('Прототип: смотрим кабинет глазами сотрудника', 'ok'); paint(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-emp-logout]').forEach(function (b) { b.addEventListener('click', function () { X.access.logout(); paint(); }); });
    var newSecs = X.SECTIONS.filter(function (k) { return k !== 'admin'; });
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
