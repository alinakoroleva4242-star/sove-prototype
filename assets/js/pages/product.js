/* Карточка товара: галерея, цена METOD, доступ к контакту поставщика, проект, избранное, похожие. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;
  var root = document.getElementById('product-root');
  if (!root) return;

  /* товар: пример из data.js или живой каталог (SOVE.catalog по id из API); похожие для живого — с сервера */
  var p = null, liveSim = [];
  var self = 'product.html';
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* ---------- товар не найден ---------- */
  function notFound() {
    document.title = 'Товар не найден — SOVEAPP';
    root.setAttribute('aria-busy', 'false');
    root.innerHTML =
      '<section class="wrap split product-404">' +
      '<div class="col-7 stack stack--6"><div class="stack stack--3"><span class="eyebrow">Каталог</span><h1 class="h1">Товар не найден</h1></div>' +
      '<p class="lead">Возможно, ссылка устарела или поставщик снял товар с продажи. В каталоге — актуальные товары партнёров по ценам METOD.</p>' +
      '<div class="row"><a class="btn btn--primary" href="market.html">Перейти в каталог</a><a class="btn btn--ghost" href="ai.html?mode=photo">Найти по фото</a></div></div>' +
      '<div class="col-5"><div class="ph product-404__ph">нет такого товара</div></div>' +
      '</section>';
  }
  var pid = S.ui.qs('id');
  (S.catalog ? S.catalog.resolve(pid) : Promise.resolve(D.product(pid))).then(function (x) {
    p = x;
    if (!p) return null;
    self = 'product.html?id=' + p.id;
    return p.live && S.catalog ? S.catalog.similar(p.id, 8).catch(function () { return []; }) : [];
  }).then(function (sim) {
    if (!p) return notFound();
    liveSim = sim || [];
    main();
  }).catch(function () { notFound(); });

  function main() {
  var caps = (p.capsules || []).map(function (id) { return D.capsule(id); }).filter(Boolean);
  /* продавцы (SOVE.sellers, Таня 29.10): склады DECARO — Москва и Санкт-Петербург, у примеров data.js — их поставщики,
     у обычного товара один продавец = бренд. Выбор запоминается по товару; от него — строка «Продавец», доставка, контакт и корзина */
  var X = S.sellers;
  var suppliers = (X ? X.list(p) : p.suppliers).slice().sort(function (a, b) { return a.metod - b.metod; });
  var multi = suppliers.length > 1;
  var selId = X ? X.chosenId(p) : suppliers[0].id;
  function sel() { return suppliers.filter(function (s) { return s.id === selId; })[0] || suppliers[0]; }
  /* зона доставки поставщика из кабинета партнёра (SOVE.pext.delivery); пусто — показываем условия каталога */
  function supplierBrand() { return S.pext && S.pext.delivery ? S.pext.delivery.supplierOf(p) : p.brand; }
  function zoneLine(brand) { return S.pext && S.pext.delivery ? S.pext.delivery.line(brand) : ''; }
  /* доставка продавца: зона из кабинета партнёра, иначе условия продавца («Санкт-Петербург и ЛО»); у одного продавца — как раньше */
  function sellerDelivery(s) {
    if (!multi) return zoneLine(supplierBrand()) || F.esc(s.delivery || p.delivery);
    var z = zoneLine(s.name); if (z) return 'Доставка: ' + z;
    var d = String(s.delivery || '').trim().replace(/^доставка:?\s*/i, ''); if (!d) return '';
    return 'Доставка: ' + F.esc(d);
  }
  /* строка «Доставка» в таблице: без слова «Доставка» — оно уже в подписи строки */
  function rowDelivery(s) {
    if (!multi) return sellerDelivery(s);
    var z = zoneLine(s.name); if (z) return z;
    var d = String(s.delivery || '').trim().replace(/^доставка:?\s*/i, '');
    return F.esc(d.charAt(0).toUpperCase() + d.slice(1));
  }
  /* цена у продавца: та же, что крупно на странице (METOD при скидке, иначе розница), плюс наценка продавца */
  function sellerPrice(s) { return (p.discount > 0 && p.retail > p.metod ? p.metod : (p.retail || p.metod)) + (Number(s.priceDelta) || 0); }
  /* метка уровня по классификатору (tier-map.js, другой экран её тоже показывает); нет файла — без метки */
  function tierChip() {
    try { var t = typeof S.tier === 'function' ? S.tier(p) : null; if (t !== 'base' && t !== 'premium') return '';
      return '<span class="pc-tier' + (t === 'premium' ? ' pc-tier--premium' : '') + '" title="Уровень по классификатору SOVEAPP">' + (S.tierLabel ? S.tierLabel(t) : t === 'premium' ? 'Премиум' : 'База') + '</span>';
    } catch (e) { return ''; }
  }
  var media = [ { src: p.img, alt: p.name, label: 'Фото товара', render: false } ];
  if (caps[0]) media.push({ src: caps[0].cover, alt: 'Интерьер капсулы «' + caps[0].name + '»', label: 'Интерьер капсулы «' + caps[0].name + '»', render: true });

  function hasAccess() { return S.auth.isIn() && S.metod.hasContact(p.id); }
  function hasPrice() { return p.metod > 0 || p.retail > 0; }
  var perUnit = p.unit ? ' за ' + F.esc(p.unit) : '';
  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }

  /* ---------- похожие ---------- */
  function similar() {
    if (p.live) return liveSim.slice(0, 4);
    function shared(x) { return x.capsules.filter(function (c) { return p.capsules.indexOf(c) >= 0; }).length; }
    var rest = D.products.filter(function (x) { return x.id !== p.id; });
    var same = rest.filter(function (x) { return x.category === p.category; })
      .sort(function (a, b) { return (b.subcat === p.subcat) - (a.subcat === p.subcat) || shared(b) - shared(a) || a.id - b.id; });
    var extra = rest.filter(function (x) { return x.category !== p.category && shared(x) > 0; }).sort(function (a, b) { return shared(b) - shared(a) || a.id - b.id; });
    return same.concat(extra).slice(0, 4);
  }
  function cardHTML(x) {
    var on = S.auth.isIn() && S.favs.has(x.id);
    return '<div class="market-item">' + S.ui.productCard(x) +
      '<button type="button" class="product-card__fav' + (on ? ' is-on' : '') + '" data-fav="' + x.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Убрать из избранного: ' : 'В избранное: ') + F.esc(x.name) + '">' + HEART + '</button></div>';
  }

  /* ---------- «Где купить»: выбор продавца (только у товара с двумя и более продавцами) ---------- */
  function buyHTML() {
    if (!multi) return '';
    var prices = suppliers.map(sellerPrice), min = Math.min.apply(null, prices), same = prices.every(function (x) { return x === prices[0]; });
    return '<fieldset class="pbuy"><legend class="pbuy__h"><span>Где купить</span><small>' + suppliers.length + ' ' + plural(suppliers.length, ['продавец', 'продавца', 'продавцов']) + '</small></legend>' +
      suppliers.map(function (s, i) {
        var on = s.id === selId, pr = prices[i], line = [s.city && s.name.indexOf(s.city) < 0 ? 'Склад: ' + F.esc(s.city) : '', sellerDelivery(s)].filter(Boolean).join(' · ');
        return '<label class="pbuy__opt' + (on ? ' is-on' : '') + '"><input type="radio" name="p-seller" value="' + F.esc(s.id) + '"' + (on ? ' checked' : '') + '>' +
          '<span class="pbuy__dot" aria-hidden="true"></span>' +
          '<span class="pbuy__b"><b>' + F.esc(s.name) + '</b>' + (line ? '<small>' + line + '</small>' : '') + '</span>' +
          '<span class="pbuy__p"><b class="num">' + F.rub(pr) + '</b>' + (!same && pr === min ? '<small class="green">лучшая цена</small>' : '') + '</span></label>';
      }).join('') + '</fieldset>';
  }
  /* кнопка «В корзину»: нет в корзине → положить у выбранного продавца; лежит у него же → «В корзине ✓» (открыть корзину);
     лежит у другого продавца → «Сменить продавца в корзине» */
  var CART = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
  function cartState() {
    var R = S.repair, O = S.orders;
    var inCart = R ? R.cart.has(p.id) : !!(O && O.basket.has(p.id));
    var cur = inCart && multi ? ((R ? R.cart.sellerOf(p.id) : O.basket.sellerOf(p.id)) || null) : null;
    return { inCart: inCart, cur: cur, other: inCart && multi && (!cur || cur.id !== sel().id) };
  }
  function renderBuy() {
    var box = document.getElementById('p-buy'); if (!box) return;
    if (!hasPrice()) { box.innerHTML = '<p class="product-buy__note">Цена уточняется: товар пока нельзя добавить в корзину.</p>'; return; }
    var c = cartState(), state = !c.inCart ? 'add' : c.other ? 'switch' : 'open';
    var label = { add: 'В корзину', 'switch': 'Сменить продавца в корзине', open: 'В корзине ✓' }[state];
    box.innerHTML = '<button type="button" class="btn btn--primary btn--lg btn--block product-buy__btn' + (state === 'open' ? ' is-on' : '') + '" data-act="cart" data-state="' + state + '"' +
      (state === 'open' ? ' aria-label="В корзине — открыть корзину"' : '') + '>' + CART + '<span>' + label + '</span></button>' +
      (state === 'switch' ? '<p class="product-buy__note">' + (c.cur ? 'Сейчас в корзине — ' + F.esc(c.cur.name) : 'В корзине без выбора продавца') + '</p>'
        : multi ? '<p class="product-buy__note">Продавец: ' + F.esc(sel().name) + '</p>' : '');
  }
  function toCart(state) {
    var R = S.repair, O = S.orders, s = sel(), seller = multi && X ? X.short(s) : undefined;
    if (state === 'open') { location.href = 'my.html?v=basket'; return; }
    /* товар живого каталога — в общий список товаров (корзина и «Мой ремонт» на других экранах его увидят) */
    if (R && R.registerProduct && !D.product(p.id)) R.registerProduct(p);
    if (state === 'switch') {
      if (R) R.cart.setSeller(p.id, seller); else if (O) O.basket.setSeller(p.id, seller);
      S.ui.toast('Продавец в корзине: ' + s.name, 'ok');
    } else if (R) R.cart.add(p.id, 'market', false, seller);
    else if (O) { O.basket.add(p.id, 'catalog', 1, seller); S.ui.toast('В корзине · ' + (multi ? s.name : p.name), 'ok'); }
    renderBuy();
  }
  /* смена продавца: подсветка, строки «Продавец» и «Доставка», кнопка корзины и контакт */
  function onSeller(id) {
    selId = id; if (X) X.choose(p.id, id);
    root.querySelectorAll('.pbuy__opt').forEach(function (l) { var i = l.querySelector('input'); l.classList.toggle('is-on', !!(i && i.checked)); });
    var nm = document.getElementById('p-seller-name'); if (nm) nm.textContent = sel().name;
    var dl = document.getElementById('p-delivery'); if (dl) dl.innerHTML = rowDelivery(sel());
    renderBuy(); ctaMode = null; renderCTA();
  }

  /* ---------- страница ---------- */
  function pageHTML() {
    var cat = encodeURIComponent(p.category);
    var eyebrow = [p.category, p.subcat].concat(caps.length ? [caps.map(function (c) { return c.name; }).join(', ')] : []).join(' · ');
    var rows =
      '<div><span>Срок</span><span>' + F.esc(p.leadTime) + '</span></div>' +
      '<div><span>Доставка</span><span id="p-delivery">' + rowDelivery(sel()) + '</span></div>' +
      (p.madeToOrder || !p.brand ? '' : '<div><span>Бренд</span><span>' + F.esc(p.brand) + '</span></div>') +
      (caps.length ? '<div><span>' + plural(caps.length, ['Капсула', 'Капсулы', 'Капсулы']) + '</span><span class="row">' + caps.map(function (c) { return '<a class="chip" href="capsule.html?id=' + c.id + '" title="' + F.esc(c.name) + '">' + F.esc(c.name) + '</a>'; }).join('') + '</span></div>' : '');
    /* у товара с выбором продавца список — в блоке «Где купить» над кнопкой «В корзину» */
    if (!multi && p.brandRaw !== '') rows += '<div><span>Поставщик</span><span>' + F.esc(suppliers[0].name) + '</span></div>';
    if (p.brandRaw !== '') rows += '<div class="seller"><span>Продавец</span><span class="seller__body"><b id="p-seller-name">' + F.esc(sel().name) + '</b><small>ИНН и ОГРН — из реестра партнёров · проверен по ЕГРЮЛ</small><a href="about.html#docs">Документы и сертификаты</a></span></div>';

    var sim = similar().filter(function (x) { return x.white; });
    var guest = !S.auth.isIn();
    var aiNote = 'Покажем товары каталога, похожие на этот по форме и материалу. Поиск по фото — ' + F.tokens(D.costs.photo).replace(' ', '\u00a0') + ' за запуск' +
      (guest && S.demo.left() > 0 ? '; без регистрации доступно пробных запусков: ' + S.demo.left() : '') + '.';

    return '' +
      '<div class="wrap product-top"><nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">Главная</a><span aria-hidden="true">/</span><a href="market.html">Маркет</a><span aria-hidden="true">/</span><a href="market.html?category=' + cat + '">' + F.esc(p.category) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + F.esc(p.name) + '</span></nav></div>' +

      '<section class="wrap split product">' +
      '<div class="col-7 sticky"><div class="pg">' +
        '<figure class="pg__figure"><div class="pg__stage" id="pg-stage"><img id="pg-img" src="' + media[0].src + '" alt="' + F.esc(media[0].alt) + '">' +
        '<button type="button" class="pg__fav" data-act="fav" aria-pressed="false" aria-label="В избранное">' + HEART + '<span data-fav-label hidden>В избранное</span></button>' +
        '<button type="button" class="pg__add' + (S.my.hasProduct(p.id) ? ' is-on' : '') + '" data-act="project" aria-pressed="' + S.my.hasProduct(p.id) + '">' + PLUS + '<span data-my-label>' + (S.my.hasProduct(p.id) ? 'В моём ремонте' : 'В мой ремонт') + '</span></button></div><figcaption class="dim"><span id="pg-label">' + media[0].label + '</span></figcaption></figure>' +
        (media.length > 1 ? '<div class="pg__thumbs" role="group" aria-label="Фотографии товара">' + media.map(function (m, i) { return '<button type="button" class="pg__thumb' + (i === 0 ? ' is-active' : '') + '" data-media="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="' + F.esc(m.label) + '"><img src="' + m.src + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
      '</div></div>' +

      '<div class="col-5 stack stack--6 product-info">' +
        '<div class="stack stack--3"><div class="product-eyebrow"><span class="eyebrow">' + F.esc(eyebrow) + '</span>' + tierChip() + '</div><h1 class="h2">' + F.esc(p.name) + '</h1></div>' +
        /* без скидки (у поставщика нет цены METOD) — одна цена, без «−0 %» и «выгода 0 ₽» (Таня 29.10) */
        (!hasPrice() ? '<div class="price2"><div class="price2__row price2__row--our"><span>Цена уточняется</span></div></div>' : p.discount > 0 && p.retail > p.metod
          ? '<div class="price2">' +
              '<div class="price2__row"><span>Цена поставщика' + perUnit + '</span><b class="num">' + F.rub(p.retail) + '</b></div>' +
              '<div class="price2__row price2__row--our"><span>Ваша цена с METOD' + perUnit + '</span><b class="num">' + F.rub(p.metod) + '</b></div>' +
              '<div class="price2__save"><span class="badge badge--green">−' + p.discount + ' %</span><span>выгода ' + F.rub(p.retail - p.metod) + '</span>' +
              (S.metod.active() ? '<i>подписка активна</i>' : '<a class="link" href="metod.html?returnTo=' + encodeURIComponent('product.html?id=' + p.id) + '">Подключить METOD</a>') + '</div>' +
            '</div>'
          : '<div class="price2"><div class="price2__row price2__row--our"><span>Цена' + perUnit + '</span><b class="num">' + F.rub(p.retail || p.metod) + '</b></div>' +
              '<p class="tiny muted">Скидки METOD у этого поставщика нет.</p></div>') +
        (function () { var pub = S.pext && S.pext.edits.published('cat:' + p.id); return pub ? '<p class="product-avail"><b>Наличие: ' + (S.pext.STATUS[pub.status] || '—') + '</b> · по данным поставщика' + (pub.priceSove ? ' · цена поставщика ' + F.rub(pub.priceSove) : '') + '</p>' : ''; })() +
        buyHTML() +
        '<div class="product-buy" id="p-buy"></div>' +
        '<a class="btn btn--dark btn--block product-fit" href="fit.html?product=' + p.id + '">Примерить в моём интерьере</a>' +
        '<div class="product-cta" id="p-cta"></div>' +
        '<p class="product-inproject" id="p-inproject" hidden></p>' +
        '<div class="rows product-rows">' + rows + '</div>' +
      '</div></section>' +

      '<section class="wrap section--tight"><div class="notice" style="border-color:var(--line)"><div class="stack stack--2"><span class="h4">Нужен вариант дешевле или другого цвета?</span><span class="small muted">Найдём похожие товары в каталоге по фотографии этого.</span></div><a class="btn btn--ghost btn--sm" href="ai.html?mode=photo">Найти похожие</a></div></section>' +

      (sim.length ? '<section class="wrap section--tight stack stack--6 product-similar" aria-labelledby="p-sim-title">' +
        '<div class="row row--between row--end"><h2 class="h2" id="p-sim-title">Похожие товары</h2><a class="btn btn--link" href="market.html?category=' + cat + '">Вся категория «' + F.esc(p.category) + '»</a></div>' +
        '<div class="grid market-grid" id="p-similar">' + sim.map(cardHTML).join('') + '</div></section>' : '');
  }

  /* ---------- главный блок действия: зависит от входа и подписки ---------- */
  var ctaMode = null;
  function renderCTA() {
    var box = document.getElementById('p-cta'); if (!box) return;
    var mode = hasAccess() ? (S.metod.active() ? 'metod' : 'single') : 'locked';
    if (mode === ctaMode) return;
    ctaMode = mode;
    if (mode === 'locked') {
      /* главная кнопка страницы — «В корзину»; контакт и промокод METOD — второстепенная */
      box.innerHTML = '<button type="button" class="btn btn--ghost btn--block" data-act="contact">Узнать, где купить</button>' +
        '<p class="product-cta__hint">Контакт и промокод на цену METOD — по подписке. Сама цена видна всем.</p>';
      return;
    }
    /* контакт выбранного продавца (склад DECARO · Санкт-Петербург и т. п.); у одного продавца — как раньше */
    var s = sel(), best = multi && suppliers.every(function (x) { return sellerPrice(x) >= sellerPrice(s); }) && suppliers.some(function (x) { return sellerPrice(x) !== sellerPrice(s); });
    box.innerHTML = '<div class="notice notice--ok product-contact">' +
      '<div class="stack stack--2"><span class="eyebrow">Контакт открыт · ' + (mode === 'metod' ? 'METOD до ' + F.dateLong(S.metod.until()) : 'разовый доступ') + '</span>' +
      '<span class="h4">' + F.esc(s.name) + '</span><span class="small muted">' + sellerDelivery(s) + (best ? ' · лучшая цена из ' + suppliers.length : '') + '</span></div>' +
      '<div class="product-promo"><span class="stack stack--2" style="gap:0"><span class="tiny muted">Промокод</span><span class="product-promo__code num" id="p-promo">SOVEAPP-' + p.id + '</span></span><button type="button" class="btn btn--link" data-act="copy">Скопировать</button></div>' +
      '<button type="button" class="btn btn--primary btn--block" data-act="write">Написать поставщику</button>' +
      '<p class="tiny muted">Назовите промокод при заказе — по нему поставщик применит цену METOD.</p></div>';
  }

  function renderActions() {
    var on = S.auth.isIn() && S.favs.has(p.id);
    var fav = root.querySelector('[data-act="fav"]');
    if (fav) { fav.classList.toggle('is-on', on); fav.setAttribute('aria-pressed', String(on)); fav.querySelector('[data-fav-label]').textContent = on ? 'В избранном' : 'В избранное'; }
    var note = document.getElementById('p-inproject');
    if (note) {
      var prs = S.auth.isIn() ? S.projects.list().filter(function (pr) { return (pr.productIds || []).indexOf(p.id) >= 0; }) : [];
      note.hidden = !prs.length;
      note.innerHTML = prs.length ? 'Уже в ' + (prs.length > 1 ? 'проектах' : 'проекте') + ': ' + prs.map(function (pr) { return '<a class="link" href="project.html?id=' + encodeURIComponent(pr.id) + '">' + F.esc(pr.name) + '</a>'; }).join(', ') : '';
    }
    root.querySelectorAll('[data-fav]').forEach(function (b) {
      var o = S.auth.isIn() && S.favs.has(b.getAttribute('data-fav'));
      b.classList.toggle('is-on', o); b.setAttribute('aria-pressed', String(o));
      b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^[^:]+:/, o ? 'Убрать из избранного:' : 'В избранное:'));
    });
  }

  /* ---------- окно «Доступ к контакту» ---------- */
  function openAccess() {
    var rt = encodeURIComponent(self), single = D.singleAccess;
    var plans = D.metodPlans.slice().sort(function (a, b) { return a.price - b.price; });
    var months = D.metodPlans.map(function (m) { return m.months; });
    var monthsText = months.length > 1 ? months.slice(0, -1).join(', ') + ' и ' + months[months.length - 1] : String(months[0]);
    var singleOn = !!(single && single.price);
    var html = '<p class="text">Цена METOD на этот товар — ' + F.rub(p.metod) + ', это на ' + F.rub(p.retail - p.metod) + ' ниже розничной. Чтобы купить по ней, нужны контакт поставщика и промокод.</p>' +
      '<div class="stack stack--2 product-access">' +
      '<button type="button" class="option" data-single' + (singleOn ? '' : ' disabled') + '><span class="option__row"><span class="option__title">Только этот поставщик</span>' + (singleOn ? '<span class="num">' + F.rub(single.price) + '</span>' : '<span class="badge badge--line">цена уточняется</span>') + '</span>' +
      '<span class="option__note">Разовый доступ к контакту и промокоду по этому товару' + (singleOn ? '' : '. Пока недоступен') + '</span></button>' +
      '<a class="option is-active" href="metod.html?returnTo=' + rt + '"><span class="option__row"><span class="option__title">METOD — все поставщики, клуб и генерации</span></span>' +
      '<span class="option__note">от ' + F.rub(plans[0].price) + ' · тарифы на ' + monthsText + ' ' + plural(months[months.length - 1], ['месяц', 'месяца', 'месяцев']) + '. После оплаты вернём вас к этому товару</span></a>' +
      '</div>';
    var m = S.ui.modal({ eyebrow: 'Цена METOD', title: 'Доступ к контакту', html: html,
      actions: [ { label: 'Выбрать тариф METOD', kind: 'primary', href: 'metod.html?returnTo=' + rt }, { label: 'Не сейчас', kind: 'ghost' } ] });
    var one = m.el.querySelector('[data-single]');
    if (one && singleOn) one.addEventListener('click', function () {
      var pm = S.pay.create({ kind: 'contact', id: 'contact-' + p.id, title: 'Контакт поставщика · ' + p.name, price: single.price, productId: p.id }, self);
      location.href = 'pay.html?id=' + encodeURIComponent(pm.id);
    });
    return m;
  }

  /* ---------- действия ---------- */
  function addToProject() {
    S.ui.pickProject(function (prId) {
      var pr = S.projects.get(prId); if (!pr) return;
      var had = (pr.productIds || []).indexOf(p.id) >= 0;
      S.projects.addProduct(prId, p.id);
      S.ui.toast(had ? 'Товар уже лежит в проекте «' + pr.name + '»' : 'Добавили в проект «' + pr.name + '»', 'ok');
    });
  }
  function copyPromo() {
    var text = 'SOVEAPP-' + p.id;
    function done() { S.ui.toast('Промокод ' + text + ' скопирован', 'ok'); }
    function manual() {
      try { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); t.remove(); if (ok) return done(); } catch (e) {}
      S.ui.toast('Не получилось скопировать. Промокод: ' + text, 'error');
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, manual); else manual();
  }
  function showMedia(i) {
    var m = media[i]; if (!m) return;
    var img = document.getElementById('pg-img');
    img.src = m.src; img.alt = m.alt;
    document.getElementById('pg-stage').classList.toggle('is-render', m.render);
    document.getElementById('pg-label').textContent = m.label;
    root.querySelectorAll('[data-media]').forEach(function (b) { var on = Number(b.getAttribute('data-media')) === i; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
  }

  root.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-media]'); if (thumb) return showMedia(Number(thumb.getAttribute('data-media')));
    var favCard = e.target.closest('[data-fav]');
    if (favCard) {
      e.preventDefault();
      if (!S.auth.isIn()) return void S.ui.needAuth('Войдите, чтобы сохранить товар в избранное', self);
      var on = S.favs.toggle(Number(favCard.getAttribute('data-fav')));
      if (!S.repair) S.ui.toast(on ? 'Добавили в избранное' : 'Убрали из избранного', on ? 'ok' : undefined);
      return;
    }
    var btn = e.target.closest('[data-act]'); if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'contact') {
      if (!S.auth.isIn()) return void S.ui.needAuth('Войдите, чтобы открыть контакт поставщика', self + '&intent=contact');
      if (hasAccess()) return renderCTA();
      openAccess();
    }
    if (act === 'cart') return void toCart(btn.getAttribute('data-state'));
    if (act === 'write') S.ui.toast('В прототипе чат не подключён');
    if (act === 'copy') copyPromo();
    if (act === 'project') {
      /* v2: «Мой ремонт» работает и у гостя — вход не нужен, чтобы отложить товар */
      var has = S.my.hasProduct(p.id);
      if (has) S.my.removeProduct(p.id); else S.my.addProduct(p.id);
      var lb = document.querySelector('[data-my-label]'); if (lb) lb.textContent = has ? 'В мой ремонт' : 'В моём ремонте';
      var bt = document.querySelector('[data-act="project"]'); if (bt) bt.setAttribute('aria-pressed', String(!has));
      S.ui.toast(has ? 'Убрали из «Моего ремонта»' : 'Добавили в «Мой ремонт»', 'ok');
    }
    if (act === 'fav') {
      if (!S.auth.isIn()) return void S.ui.needAuth('Войдите, чтобы сохранить товар в избранное', self + '&intent=fav');
      var now = S.favs.toggle(p.id);
      if (!S.repair) S.ui.toast(now ? 'Добавили в избранное' : 'Убрали из избранного', now ? 'ok' : undefined);
    }
  });

  root.addEventListener('change', function (e) {
    var r = e.target.closest && e.target.closest('input[name="p-seller"]'); if (r && r.checked) onSeller(r.value);
  });

  /* ---------- старт ---------- */
  function start() {
    document.title = p.name + ' — SOVEAPP';
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = pageHTML();
    renderCTA(); renderActions(); renderBuy();
    /* корзина меняется и с других кнопок (полоса, другие вкладки) — кнопка следит */
    window.addEventListener('sove:repair', renderBuy); window.addEventListener('sove:orders', renderBuy);

    /* действие, начатое до входа, доводим до конца после возврата */
    var intent = S.ui.qs('intent');
    if (intent) {
      try { history.replaceState(null, '', location.pathname + '?id=' + p.id); } catch (e) {}
      var login = document.querySelector('.header__cab[href^="auth.html"]');
      if (login) login.setAttribute('href', 'auth.html?returnTo=' + encodeURIComponent(self));
      if (S.auth.isIn()) {
        if (intent === 'contact') { if (hasAccess()) S.ui.toast('Вы вошли. Контакт поставщика открыт', 'ok'); else openAccess(); }
        if (intent === 'fav' && !S.favs.has(p.id)) { S.favs.toggle(p.id); S.ui.toast('Вы вошли. Товар добавлен в избранное', 'ok'); }
        if (intent === 'project') addToProject();
      }
    }
    S.onChange(function () { renderCTA(); renderActions(); });
  }
  setTimeout(start, 250);
  }
})();

/* «Вы недавно смотрели» на главной */
(function () {
  try {
    var id = Number(new URLSearchParams(location.search).get('id')); if (!id || !window.SOVE.data.product(id)) return;
    var list = JSON.parse(localStorage.getItem('sove.proto.recent') || '[]').filter(function (x) { return x !== id; });
    list.unshift(id); localStorage.setItem('sove.proto.recent', JSON.stringify(list.slice(0, 8)));
  } catch (e) { /* хранилище недоступно — блок просто не появится */ }

  /* липкая панель внизу ведёт в примерку этого товара */
  (function () {
    var pid = new URLSearchParams(location.search).get('id');
    if (!pid) return;
    var href = 'fit.html?product=' + pid;
    document.body.setAttribute('data-funnel-target', href);
    (function fixBar(n) {
      var btn = document.querySelector('.fbar__btn');
      if (btn && btn.tagName === 'A') { btn.href = href; return; }
      if (n < 20) setTimeout(function () { fixBar(n + 1); }, 60);
    })(0);
  })();
})();