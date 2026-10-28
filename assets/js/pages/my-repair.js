/* Мой ремонт — главный вид my.html по ТЗ 22.10.2026 (design/moy-remont/TZ-moy-remont.md): чистовик квартиры.
   Шапка с переключателем квартир и прогрессом Основа → Интерьер → Бюджет → Покупки, разделы
   План · Интерьер · Комнаты · Бюджет · Избранное · Корзина, внизу история генераций, мост к Дизайн-проект и следующий уровень.
   Три варианта вёрстки на одних данных (?d=): a — лента одной страницей, b — плитки разделов, c — вкладки. Данные — SOVE.repair. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, R = S.repair;
  if (!R) return;
  var PAGE = 'my.html';
  var SECS = [ { id: 'plan', t: 'План' }, { id: 'interior', t: 'Интерьер' }, { id: 'rooms', t: 'Комнаты' }, { id: 'budget', t: 'Бюджет' }, { id: 'fav', t: 'Избранное' }, { id: 'cart', t: 'Корзина' } ];
  var VARIANTS = { a: 'Лента', b: 'Плитки', c: 'Вкладки' };
  var variant = (function () { var q = (ui.qs('d') || '').toLowerCase(); if (VARIANTS[q]) { try { localStorage.setItem('sove.my.variant', q); } catch (e) {} return q; } try { var s = localStorage.getItem('sove.my.variant'); if (VARIANTS[s]) return s; } catch (e) {} return 'a'; })();
  var COST = (D.ai && D.ai.costs && D.ai.costs.render) || 10;
  var ui$ = { room: null, favCat: 'all', open: null };

  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? f[2] : b === 1 ? f[0] : (b >= 2 && b <= 4) ? f[1] : f[2]; }
  function cnt(n, f) { return n + ' ' + plural(n, f); }
  var I = {
    chev: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', back: '<path d="M15 5l-7 7 7 7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plan: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 11h8V4M11 15v5M15 11h6"/>', palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-.9-.7-1.2-.7-2s.6-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    img: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="9" cy="9" r="1.5"/>', calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', cart: '<path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    move: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', up: '<path d="M12 16V5M7 10l5-5 5 5"/><path d="M4 20h16"/>'
  };
  var SEC_IC = { plan: 'plan', interior: 'palette', rooms: 'img', budget: 'calc', fav: 'heart', cart: 'cart' };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>'; }
  function empty(sec, text, cta, href, extra) { return '<div class="rs-empty">' + ic(SEC_IC[sec], 26) + '<p>' + esc(text) + '</p><a class="btn btn--primary btn--sm" href="' + href + '">' + esc(cta) + '</a>' + (extra || '') + '</div>'; }
  function more(href, label) { return '<a class="rs-link" href="' + href + '">' + esc(label) + ' ' + ic('chev', 14) + '</a>'; }
  function sum(ids) { return ids.reduce(function (a, id) { var p = D.product(id); return a + (p ? p.metod : 0); }, 0); }

  /* ---------- шапка: «Моя квартира ▾», строка объекта, метки, токены; прогресс и следующий шаг ---------- */
  function head() {
    var f = R.flats.active(), r = R.get(), line = R.flatLine(f), lvl = R.level(), bt = r.budget ? r.budget.type : (f && f.budgetType);
    return '<header class="rh"><div class="rh__top"><button type="button" class="rh__flat" data-flats aria-haspopup="dialog">' + esc(f ? f.name : 'Моя квартира') + ' ' + ic('down', 18) + '</button>' +
      '<a class="rh__tok" href="tokens.html" aria-label="Баланс токенов">' + ic('spark', 16) + F.num(S.tokens.balance()) + '</a></div>' +
      (line ? '<p class="rh__meta">' + esc(line) + '</p>' : '') +
      '<div class="rh__tags"><span class="rtag' + (lvl === 'none' ? ' rtag--mute' : '') + '">' + esc(R.LEVEL[lvl]) + '</span>' + (bt ? '<span class="rtag">' + (bt === 'premium' ? 'Премиум' : 'База') + '</span>' : '') + '</div></header>';
  }
  function progress() {
    var p = R.progress();
    return '<section class="rprog" aria-label="Путь квартиры"><ol class="rprog__s">' + p.steps.map(function (s, i) { return '<li class="' + (s.done ? 'is-done' : '') + '"><i>' + (s.done ? ic('check', 12) : i + 1) + '</i><span>' + s.name + '</span></li>'; }).join('') + '</ol>' +
      '<div class="rprog__next"><div class="grow"><small>Следующий шаг</small><b>' + esc(p.next.text) + '</b></div><a class="btn btn--primary btn--sm" href="' + p.next.href + '">' + esc(p.next.cta) + '</a></div></section>';
  }
  /* состояние «есть только товары»: плана нет, а ♡ или 🛒 уже есть */
  function goodsOnlyCall() {
    var r = R.get(), f = R.flats.active();
    if (r.plan || (f && f.m2) || !(R.fav.list().length || R.cart.rows().length)) return '';
    return '<a class="rcall" href="' + R.LINK.plan + '">' + ic('up', 22) + '<span class="grow"><b>Загрузите план — посчитаем весь бюджет квартиры</b><small>товары уже отложены, план покажет, чего не хватает</small></span>' + ic('chev', 16) + '</a>';
  }

  /* ---------- разделы: каждый отдаёт {sub, pic, n, html} ---------- */
  function secPlan() {
    var r = R.get(), p = r.plan, f = R.flats.active();
    if (!p) return { sub: f && f.m2 ? F.area(f.m2) + ' · без плана' : 'пусто', html: empty('plan', 'Загрузите план — расставим мебель и посчитаем бюджет', 'Загрузить план', R.LINK.plan, '<button type="button" class="btn btn--link btn--sm" data-act="no-plan">Плана нет — указать площадь и комнаты</button>') };
    var m2 = p.rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0);
    return { sub: R.LEVEL[p.level], pic: p.img, n: p.rooms.length,
      html: '<figure class="rs-plan"><img src="' + p.img + '" alt="План квартиры с расстановкой"><figcaption><span class="rtag">' + esc(R.LEVEL[p.level]) + '</span>' + (p.variant ? '<span class="rtag rtag--mute">' + esc(p.variant) + '</span>' : '') + '</figcaption></figure>' +
        '<ul class="rs-rooms">' + p.rooms.map(function (x) { return '<li><span>' + esc(x.name) + '</span><b>' + F.area(x.m2) + '</b></li>'; }).join('') + '<li class="is-sum"><span>Всего</span><b>' + F.area(m2) + '</b></li></ul>' +
        '<div class="rs-row">' + more(R.LINK.plan, 'Изменить в Генерациях') + '<button type="button" class="btn btn--ghost btn--sm" data-act="upload">Загрузить проект</button></div>' };
  }
  function secInterior() {
    var it = R.get().interior;
    if (!it) return { sub: 'пусто', html: empty('interior', 'Выберите интерьер — мудборд материалов с ценами', 'Выбрать в Генерациях', R.LINK.materials) };
    var ids = it.productIds || [], prods = ids.map(function (id) { return D.product(id); }).filter(Boolean), shown = ui$.open === 'mat' ? prods : prods.slice(0, 3);
    /* ДНК: у капсулы — картинки, у своей доски отделки (блок Материалы) — цвета {hex, name} */
    var own = it.type === 'own', imgs = own ? (it.img ? [it.img] : []) : (it.dna || []).slice(0, 4);
    var sw = function (s) { return typeof s === 'string' ? 'background-image:url(\'' + s + '\')' : 'background:' + s.hex; };
    return { sub: it.name || 'Своя капсула', pic: own ? it.img : (it.dna && it.dna[0]) || it.img, n: prods.length,
      html: '<div class="rs-mb">' + imgs.map(function (s) { return '<img src="' + s + '" alt="" loading="lazy">'; }).join('') + '</div>' +
        '<div class="rs-mb__t"><b>' + esc(it.name || 'Своя капсула') + '</b><span class="rs-dna" aria-label="ДНК интерьера">' + (it.dna || []).map(function (s) { return '<i style="' + sw(s) + '"></i>'; }).join('') + '</span></div>' +
        '<div class="rs-sub"><b>Материалы · ' + prods.length + ' · ' + F.rub(sum(ids)) + '</b>' + more(R.LINK.materials, 'Изменить в Генерациях') + '</div>' +
        '<div class="rp-list">' + shown.map(function (p) { return R.card(p, { source: 'moodboard' }); }).join('') + '</div>' +
        (prods.length > 3 ? '<button type="button" class="btn btn--link btn--sm" data-open="mat">' + (ui$.open === 'mat' ? 'Свернуть' : 'Показать все · ' + prods.length) + '</button>' : '') +
        '<button type="button" class="btn btn--dark btn--block" data-all="moodboard">' + ic('cart', 16) + ' Всё в корзину · ' + prods.length + '</button>' };
  }
  function secRooms() {
    var r = R.get(), rooms = R.rooms(), it = r.interior, total = R.rendersCount();
    if (!total) return { sub: 'пусто', html: '<div class="rs-ghosts">' + rooms.map(function (x) { return '<a class="rs-ghost" href="' + R.LINK.visual + '"><b>' + esc(x.name) + '</b><span>' + ic('spark', 14) + ' Нарисовать · ' + F.tokens(COST) + '</span></a>'; }).join('') + '</div><p class="rs-note">Рендеры комнат делаются в Генерациях, блок Визуализации, и сохраняются сюда без ограничений.</p>' };
    if (!ui$.room || !rooms.some(function (x) { return x.key === ui$.room; })) ui$.room = (rooms.filter(function (x) { return (r.rooms[x.key] || []).length; })[0] || rooms[0]).key;
    var key = ui$.room, list = r.rooms[key] || [], mainId = r.rooms[key + ':main'], main = list.filter(function (x) { return x.id === mainId; })[0] || list[0], room = rooms.filter(function (x) { return x.key === key; })[0];
    var stale = function (x) { return it && x.interiorTs && x.interiorTs !== it.ts; };
    var prods = R.roomProducts(key), firstPic = (function () { for (var i = 0; i < rooms.length; i++) { var l = r.rooms[rooms[i].key]; if (l && l.length) return l[0].src; } return ''; })();
    var body = !main ? '<a class="rs-ghost rs-ghost--big" href="' + R.LINK.visual + '"><b>' + esc(room.name) + '</b><span>' + ic('spark', 14) + ' Нарисовать · ' + F.tokens(COST) + '</span></a>'
      : '<figure class="rs-render"><img src="' + main.src + '" alt="' + esc(room.name) + '"><figcaption><span class="rtag rtag--on">основной</span>' + (main.mine ? '<span class="rtag">Мой проект</span>' : '') + (stale(main) ? '<a class="rtag rtag--warn" href="' + R.LINK.visual + '">по прошлому стилю · обновить ✦</a>' : '') + '</figcaption></figure>' +
        (list.length > 1 ? '<div class="rs-thumbs">' + list.map(function (x) { return '<button type="button" class="rs-thumb' + (x.id === main.id ? ' is-on' : '') + '" data-main="' + x.id + '" aria-label="Сделать основным"><img src="' + x.src + '" alt="">' + (stale(x) ? '<i>прошлый стиль</i>' : '') + '</button>'; }).join('') + '</div>' : '') +
        (prods.length ? '<div class="rs-sub"><b>Товары в комнате · ' + prods.length + '</b></div><div class="rp-list">' + prods.map(function (p) { return R.card(p, { source: 'room', where: room.name }); }).join('') + '</div>' : '');
    return { sub: cnt(total, ['рендер', 'рендера', 'рендеров']), pic: firstPic, n: total,
      html: '<div class="rs-tabs" role="tablist">' + rooms.map(function (x) { var n = (r.rooms[x.key] || []).length; return '<button type="button" role="tab" aria-selected="' + (x.key === key) + '" class="' + (x.key === key ? 'is-on' : '') + '" data-room="' + x.key + '">' + esc(x.name) + (n ? ' <i>' + n + '</i>' : '') + '</button>'; }).join('') + '</div>' + body };
  }
  function secBudget() {
    var r = R.get(), b = r.budget, draft = S.draft.get('scout'), on = S.metod.active();
    var unfinished = !b && draft && draft.capsuleId && draft.step && draft.step < 5 ? '<a class="rcall rcall--soft" href="' + R.LINK.scout + '">' + ic('calc', 20) + '<span class="grow"><b>Расчёт бюджета не закончен</b><small>шаг ' + draft.step + ' из 5</small></span>Продолжить ' + ic('chev', 14) + '</a>' : '';
    if (!b) return { sub: 'посчитать', html: unfinished + empty('budget', 'Посчитайте бюджет ремонта — 2 минуты', 'Посчитать бюджет', R.LINK.scout) };
    var shares = D.scout.kitShares || [], gain = b.kitRetail - b.kitMetod;
    var kit = function (v, retail) { return on ? '<b>' + F.rub(v) + '</b>' + (retail ? '<s>' + F.rub(retail) + '</s>' : '') : '<b class="is-lock">' + ic('lock', 12) + F.rub(v) + '</b>'; };
    var capId = b.capsuleId || (r.interior && r.interior.capsuleId), ids = capId ? R.capsuleProducts(capId).map(function (p) { return p.id; }) : [];
    return { sub: F.rub(b.total), n: null,
      html: (R.budgetStale() ? '<a class="rcall rcall--warn" href="' + R.LINK.scout + '"><span class="grow"><b>План или интерьер изменились</b><small>бюджет посчитан по прежним</small></span>Пересчитать бюджет ' + ic('chev', 14) + '</a>' : '') +
        '<div class="rs-bud"><span class="rtag">' + (b.type === 'premium' ? 'Премиум' : 'База') + '</span><b class="rs-bud__t">' + F.rub(b.total) + '</b><small>' + (b.area ? F.area(b.area) + ' · ' : '') + 'работы и комплектация</small></div>' +
        '<ul class="rs-lines"><li><span>Работы</span><b>' + F.rub(b.works) + '</b></li>' + shares.map(function (s) { return '<li><span>' + esc(s[0]) + '</span>' + kit(b.kitMetod * s[1] / 100, on ? b.kitRetail * s[1] / 100 : 0) + '</li>'; }).join('') + '</ul>' +
        (on ? '<p class="rs-gain">' + ic('check', 14) + ' Выгода с METOD · <b>' + F.rub(gain) + '</b></p>' : '<a class="rcall rcall--metod" href="' + R.LINK.metod + '">' + ic('lock', 18) + '<span class="grow"><b>Закрытые цены SOVEAPP — с METOD</b><small>выгода на комплектации ' + F.rub(gain) + '</small></span>' + ic('chev', 14) + '</a>') +
        '<div class="rs-row rs-row--2">' + (ids.length ? '<button type="button" class="btn btn--dark btn--sm" data-all="budget">Всё в корзину по бюджету</button>' : '') + '<a class="btn btn--ghost btn--sm" href="' + R.LINK.scout + '">Пересчитать бюджет</a></div>' };
  }
  function secFav() {
    var ids = R.fav.list(), prods = ids.map(function (id) { return D.product(id); }).filter(Boolean), many = R.flats.list().length > 1;
    if (!prods.length) return { sub: 'пусто', n: 0, html: empty('fav', 'Нажмите ♡ на товаре в Маркете или в результатах генераций — он появится здесь', 'В Маркет', R.LINK.market) };
    var cats = []; prods.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    if (ui$.favCat !== 'all' && cats.indexOf(ui$.favCat) < 0) ui$.favCat = 'all';
    var shown = prods.filter(function (p) { return ui$.favCat === 'all' || p.category === ui$.favCat; });
    return { sub: cnt(prods.length, ['товар', 'товара', 'товаров']), pic: prods[0].img, n: prods.length,
      html: (cats.length > 1 ? '<div class="rs-chips">' + ['all'].concat(cats).map(function (c) { return '<button type="button" class="' + (ui$.favCat === c ? 'is-on' : '') + '" data-cat="' + esc(c) + '">' + esc(c === 'all' ? 'Все' : c) + '</button>'; }).join('') + '</div>' : '') +
        '<div class="rp-grid">' + shown.map(function (p) { return '<div class="rp-tile"><a class="rp-tile__pic" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="" loading="lazy"></a><a class="rp-tile__t" href="product.html?id=' + p.id + '">' + esc(p.name) + '</a>' + R.price(p) +
          '<div class="rp-tile__act"><button type="button" class="rp-ic rp-ic--cart' + (R.cart.has(p.id) ? ' is-on' : '') + '" data-rp-cart="' + p.id + '" data-src="market" aria-label="В корзину">' + ic('cart', 18) + '</button>' + (many ? '<button type="button" class="rp-ic" data-move="' + p.id + '" aria-label="Перенести в другую квартиру">' + ic('move', 18) + '</button>' : '') + '<button type="button" class="rp-ic is-on" data-rp-fav="' + p.id + '" aria-label="Убрать из Избранного">' + ic('heart', 18) + '</button></div></div>'; }).join('') + '</div>' };
  }
  function secCart() {
    var rows = R.cart.rows(), t = R.cart.totals(), on = S.metod.active();
    if (!rows.length) return { sub: 'пусто', n: 0, html: empty('cart', 'Нажмите 🛒 на товаре в Маркете, мудборде, комнате или бюджете — он появится здесь', 'В Маркет', R.LINK.market) };
    var order = ['budget', 'moodboard', 'room', 'market'];
    return { sub: t.qty + ' · ' + F.rub(t.metod), pic: rows[0].product.img, n: t.count,
      html: order.map(function (src) { var g = rows.filter(function (x) { return x.source === src; }); if (!g.length) return '';
          return '<div class="rs-grp"><span class="rs-grp__t">' + R.SRC[src] + ' · ' + g.length + '</span>' + g.map(function (x) { var p = x.product; return '<div class="rs-ci"><a href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="" loading="lazy"></a><div class="rs-ci__b"><a class="rp-card__t" href="product.html?id=' + p.id + '">' + esc(p.name) + '</a>' + R.price(p, x.qty) +
            '<div class="rs-ci__q"><span class="qty"><button type="button" data-q="' + p.id + '" data-d="-1" aria-label="Меньше">−</button><b>' + x.qty + '</b><button type="button" data-q="' + p.id + '" data-d="1" aria-label="Больше">+</button></span><button type="button" class="rp-ic" data-rm="' + p.id + '" aria-label="Убрать из корзины">' + ic('trash', 16) + '</button></div></div></div>'; }).join('') + '</div>'; }).join('') +
        '<div class="rs-total"><span>Итого · ' + cnt(t.qty, ['товар', 'товара', 'товаров']) + '</span><b>' + F.rub(t.metod) + '</b></div>' +
        (t.retail > t.metod ? '<p class="rs-gain">' + ic('check', 14) + ' Выгода с METOD · <b>' + F.rub(t.retail - t.metod) + '</b>' + (on ? '' : ' · <a href="' + R.LINK.metod + '">подключить</a>') + '</p>' : '') +
        '<button type="button" class="btn btn--primary btn--block btn--lg" data-act="checkout">Оформить · ' + F.rub(t.metod) + '</button><p class="rs-note">Оплата через SOVEAPP, заказы уйдут поставщикам.</p>' };
  }
  var BUILD = { plan: secPlan, interior: secInterior, rooms: secRooms, budget: secBudget, fav: secFav, cart: secCart };
  var LINKS = { plan: R.LINK.plan, interior: R.LINK.materials, rooms: R.LINK.visual, budget: R.LINK.scout };

  /* ---------- низ страницы: история генераций, мост к Дизайн-проект, следующий уровень ---------- */
  function bottom() {
    var r = R.get(), n = S.gens.list().length, ready = !!(r.plan && r.interior && r.budget), bridge = (r.interior && !r.interior.capsuleId) || n >= 5;
    return '<a class="rs-hist" href="' + R.LINK.ai + '">' + ic('spark', 18) + '<span class="grow">История генераций · ' + n + '</span>Генерации ' + ic('chev', 14) + '</a>' +
      (bridge ? '<a class="rcall rcall--soft" href="' + R.LINK.adept + '"><span class="grow"><b>Дизайнер доведёт до проекта</b><small>промокод 5 000 ₽ для METOD</small></span>' + ic('chev', 14) + '</a>' : '') +
      '<div class="rs-next">' + [['Подключить дизайнера', 'дизайн-проект', R.LINK.adept], ['Перейти к стройке', 'ремонт под ключ', R.LINK.track]].map(function (x) { return ready ? '<a href="' + x[2] + '"><b>' + x[0] + '</b><small>' + x[1] + '</small></a>' : '<span class="is-off"><b>' + ic('lock', 12) + ' ' + x[0] + '</b><small>' + x[1] + ' · откроется после основы, интерьера и бюджета</small></span>'; }).join('') + '</div>';
  }
  function proto() {
    return '<section class="rs-proto" aria-label="Прототип"><span>Прототип · вариант</span><div>' + Object.keys(VARIANTS).map(function (k) { return '<a class="' + (k === variant ? 'is-on' : '') + '" href="' + PAGE + '?d=' + k + '">' + k.toUpperCase() + ' · ' + VARIANTS[k] + '</a>'; }).join('') + '</div>' +
      '<span>Состояние экрана</span><div><button type="button" data-seed="empty">1 · Пусто</button><button type="button" data-seed="goods">2 · Только товары</button><button type="button" data-seed="full">3 · Всё собрано</button></div></section>';
  }

  /* ---------- три варианта вёрстки ---------- */
  function sectionCard(id) {
    var s = BUILD[id](), t = SECS.filter(function (x) { return x.id === id; })[0].t;
    return '<section class="rs" id="sec-' + id + '"><div class="rs__h"><h2>' + ic(SEC_IC[id], 18) + t + (s.n ? ' <i>' + s.n + '</i>' : '') + '</h2></div>' + s.html + '</section>';
  }
  function layoutA() { return SECS.map(function (s) { return sectionCard(s.id); }).join(''); }
  function layoutB() {
    var open = (location.hash || '').replace('#sec-', '');
    if (BUILD[open]) return '<div class="rs-back"><a href="#" data-home>' + ic('back', 18) + ' Все разделы</a></div>' + sectionCard(open);
    return '<div class="rs-tiles">' + SECS.map(function (x) { var s = BUILD[x.id](), on = s.sub !== 'пусто' && s.sub !== 'посчитать';
      return '<a class="rs-tile' + (on ? '' : ' is-empty') + '" href="#sec-' + x.id + '"><span class="rs-tile__pic"' + (s.pic ? ' style="background-image:url(\'' + s.pic + '\')"' : '') + '>' + (s.pic ? '' : ic(SEC_IC[x.id], 26)) + '</span><b>' + x.t + '</b><small>' + esc(on ? s.sub : x.id === 'budget' ? 'посчитать →' : 'пусто · ' + ({ plan: 'загрузить', interior: 'выбрать', rooms: 'нарисовать', fav: 'в Маркет', cart: 'в Маркет' }[x.id] || '')) + '</small></a>'; }).join('') + '</div>';
  }
  function layoutC() {
    var cur = (location.hash || '').replace('#sec-', ''); if (!BUILD[cur]) cur = 'plan';
    return '<nav class="rs-seg" aria-label="Разделы">' + SECS.map(function (x) { var s = BUILD[x.id](); return '<a href="#sec-' + x.id + '" class="' + (x.id === cur ? 'is-on' : '') + '"' + (x.id === cur ? ' aria-current="true"' : '') + '>' + x.t + (s.n ? '<i>' + s.n + '</i>' : '') + '</a>'; }).join('') + '</nav>' + sectionCard(cur);
  }

  var root;
  function render() {
    var y = window.pageYOffset;
    root.className = 'wrap section--tight rmy rmy--' + variant;
    root.innerHTML = head() + progress() + goodsOnlyCall() + (variant === 'b' ? layoutB() : variant === 'c' ? layoutC() : layoutA()) + bottom() + proto();
    window.scrollTo(0, y);
  }
  function jump() {
    if (variant !== 'a') { render(); var top = root.querySelector(variant === 'c' ? '.rs-seg' : '.rs, .rs-tiles'); if (top && location.hash) top.scrollIntoView({ block: 'start' }); return; }
    var el = location.hash && document.querySelector(location.hash); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- действия ---------- */
  function flatsSheet() {
    var list = R.flats.list(), act = R.flats.active();
    var m = ui.modal({ title: 'Мои квартиры', html: '<div class="rp-pick">' + (list.length ? list.map(function (f) { return '<button type="button" class="rp-pick__b' + (act && f.id === act.id ? ' is-on' : '') + '" data-flat="' + f.id + '"><b>' + esc(f.name) + '</b><span>' + esc(R.flatLine(f) || 'данных пока нет') + '</span></button>'; }).join('') : '<p class="small muted">Квартира появится сама при первом сохранении.</p>') + '</div><p class="small muted">Переименовать квартиру — в Профиле.</p>',
      actions: [{ label: '+ Добавить квартиру', kind: 'ghost', onClick: function () { R.flats.add(); ui.toast('Квартира добавлена', 'ok'); } }, { label: 'Закрыть', kind: 'link' }] });
    m.el.querySelectorAll('[data-flat]').forEach(function (b) { b.addEventListener('click', function () { R.flats.setActive(b.getAttribute('data-flat')); m.close(); }); });
  }
  function noPlanSheet() {
    var f = R.flats.active() || {};
    ui.modal({ title: 'Площадь и комнаты', html: '<div class="field"><label for="np-m2">Площадь, м²</label><input class="input" id="np-m2" inputmode="decimal" value="' + esc(f.m2 || '') + '"></div><div class="field"><label for="np-r">Комнат</label><input class="input" id="np-r" inputmode="numeric" value="' + esc(f.rooms || '') + '"></div>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var m2 = parseFloat(String(api.el.querySelector('#np-m2').value).replace(',', '.')); if (!(m2 > 0)) { ui.toast('Укажите площадь', 'error'); return; } var fl = R.flats.ensure(); R.flats.update(fl.id, { m2: m2, rooms: parseInt(api.el.querySelector('#np-r').value, 10) || null }); api.close(); } }, { label: 'Отмена', kind: 'link' }] });
  }
  /* «Загрузить проект» → «Что у вас есть?»: одна основа на квартиру, новая — с вопросом «Заменить текущий план?» */
  function uploadSheet() {
    var cur = R.get().plan;
    var m = ui.modal({ title: 'Что у вас есть?', html: '<div class="rp-pick">' + ['developer_plan', 'measured_plan', 'design_project'].map(function (k) { return '<button type="button" class="rp-pick__b" data-lvl="' + k + '"><b>' + R.LEVEL[k] + '</b></button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    m.el.querySelectorAll('[data-lvl]').forEach(function (b) { b.addEventListener('click', function () { m.close(); R.save('plan', Object.assign({}, cur, { level: b.getAttribute('data-lvl') })); }); });
  }
  function bind() {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button, a'); if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-flats')) return flatsSheet();
      if (t.hasAttribute('data-home')) { e.preventDefault(); history.pushState(null, '', PAGE); render(); return; }
      if (t.getAttribute('data-act') === 'no-plan') return noPlanSheet();
      if (t.getAttribute('data-act') === 'upload') return uploadSheet();
      if (t.getAttribute('data-act') === 'checkout') return R.cart.checkout();
      if (t.hasAttribute('data-open')) { ui$.open = ui$.open === t.getAttribute('data-open') ? null : t.getAttribute('data-open'); return render(); }
      if (t.hasAttribute('data-room')) { ui$.room = t.getAttribute('data-room'); return render(); }
      if (t.hasAttribute('data-cat')) { ui$.favCat = t.getAttribute('data-cat'); return render(); }
      if (t.hasAttribute('data-main')) return R.setMainRender(ui$.room, t.getAttribute('data-main'));
      if (t.hasAttribute('data-q')) return R.cart.qty(t.getAttribute('data-q'), Number(t.getAttribute('data-d')));
      if (t.hasAttribute('data-rm')) return R.cart.remove(t.getAttribute('data-rm'));
      if (t.hasAttribute('data-all')) {
        var src = t.getAttribute('data-all'), r = R.get(), cap = src === 'budget' ? (r.budget.capsuleId || (r.interior && r.interior.capsuleId)) : null;
        var ids = src === 'moodboard' ? (r.interior.productIds || []) : R.capsuleProducts(cap).map(function (p) { return p.id; });
        if (!R.cart.addMany(ids, src)) ui.toast('Всё уже в корзине');
        return;
      }
      if (t.hasAttribute('data-move')) {
        var pid = t.getAttribute('data-move'), cur = R.flats.active(), others = R.flats.list().filter(function (f) { return f.id !== cur.id; });
        var m = ui.modal({ title: 'Перенести в другую квартиру', html: '<div class="rp-pick">' + others.map(function (f) { return '<button type="button" class="rp-pick__b" data-to="' + f.id + '"><b>' + esc(f.name) + '</b></button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
        m.el.querySelectorAll('[data-to]').forEach(function (b) { b.addEventListener('click', function () { m.close(); R.fav.move(pid, b.getAttribute('data-to')); ui.toast('Перенесли в «' + R.flats.get(b.getAttribute('data-to')).name + '»', 'ok'); }); });
        return;
      }
      if (t.hasAttribute('data-seed')) { R.seed(t.getAttribute('data-seed')); history.replaceState(null, '', PAGE); window.scrollTo(0, 0); ui$ = { room: null, favCat: 'all', open: null }; render(); return; }
    });
    window.addEventListener('sove:repair', render);
    window.addEventListener('hashchange', jump);
  }

  window.SOVE_MY_HOME = function (el) {
    root = el; document.body.setAttribute('data-repair-strip', ''); R.renderStrip();
    render(); bind(); if (location.hash) setTimeout(jump, 60);
  };
})();
