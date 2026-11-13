/* Лента «Метод ремонта» (feed.html) — закрытый канал METOD в приложении (созвон 28.10.2026, Алина и Таня; замечания Тани 29.10).
   Посты — assets/js/feed-posts.js (window.SOVE_FEED_POSTS). Три типа карточек: акция партнёра, подборка дизайнера,
   концепция. Без подписки открыты только промо-посты (акции партнёров, Алина 03.11), остальное размыто (CSS) и ведёт на metod.html.
   Из ленты товар уходит в Избранное и Корзину квартиры (SOVE.repair: ♡ / 🛒), подборка — целиком в Избранное → Подборки
   (R.favSets) или вся в корзину; концепция — в Избранное как подборка материалов, «Собрать интерьер» — экран Интерьер.
   Товар с маркетплейса (it.marketplace) — одна кнопка «Перейти в магазин», в каталог не регистрируется.
   Связь подборка ↔ концепция: deep-link ?post=<id> — пост первым и раскрытым, независимо от фильтра и пагинации, сверху «← Все посты»;
   в подборке ссылка «Смотреть концепцию N», в концепции блок «Подборки к концепции N».
   Картинки концепции (доска + рендеры kb/concept-refs.js) — карусель со свайпом, тап — полноэкранный просмотр (feed-viewer.js).
   Концепции 28–81 приходят из kb/concepts.js через feed-posts.js; лента показывает по 6 постов, дальше — «Показать ещё».
   Старая заглушка my.html?v=feed переадресует сюда (?t=тип). */
(function () {
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, R = S.repair, V = window.SOVE_VIEWER;
  var root = document.getElementById('feed-root'); if (!root) return;

  /* рубрики (ТЗ 04.11, п. 4): «Все» во всю ширину, ниже плитки 2 в ряд с фото; «Доски материалов» — концепции с собранной доской */
  var TYPES = [ { key: 'all', label: 'Все' },
    { key: 'concept', label: 'Концепции', img: 'assets/img/feed/concept-80.jpg' },
    { key: 'promo', label: 'Акции партнёров', img: 'assets/img/cat/93209.jpg', obj: true },
    { key: 'capsule', label: 'Интерьерные капсулы', img: 'assets/img/capsules/k1-main-1.jpg' },
    { key: 'pick', label: 'Подборки', img: 'assets/img/feed/items/9080011.jpg', obj: true },
    { key: 'board', label: 'Доски материалов', img: 'assets/img/feed/concept-78.jpg' } ];
  function inType(p, key) { return key === 'all' ? true : key === 'board' ? p.type === 'concept' && p.hasBoard !== false : p.type === key; }
  /* категории товаров (ТЗ 04.11, п. 5): пост попадает в категорию по товарам внутри — категория, подкатегория, название */
  var CATS = ['Отделка', 'Освещение', 'Сантехника', 'Техника', 'Мебель', 'Двери', 'Декор', 'Розетки и выключатели'];
  var CAT_RULES = [
    ['Розетки и выключатели', /розетк|выключател/],
    ['Освещение', /свет|люстр|бра\b|торшер|ламп/],
    ['Сантехника', /смесител|ванн|раковин/],
    ['Отделка', /плитк|керамогранит|обои|паркет|ламинат|краск|молдинг|панел/],
    ['Двери', /двер|перегородк/],
    ['Техника', /холодильн|духов|вытяжк/],
    ['Декор', /ковр|ковёр|ковер|зеркал|штор|текстил|декор/]
  ];
  function itemCat(it) { var t = (String(it.category || '') + ' ' + String(it.subcat || '') + ' ' + String(it.name || '')).toLowerCase(); for (var i = 0; i < CAT_RULES.length; i++) if (CAT_RULES[i][1].test(t)) return CAT_RULES[i][0]; return 'Мебель'; }
  function postCats(p) { var out = []; (p.items || []).forEach(function (it) { var c = itemCat(it); if (out.indexOf(c) < 0) out.push(c); }); return out; }
  function inCat(p, cat) { return cat === 'all' || postCats(p).indexOf(cat) >= 0; }
  var curCat = CATS.indexOf(ui.qs('c') || '') >= 0 ? ui.qs('c') : 'all';
  var KIND = { promo: 'Акция партнёра', pick: 'Подборка дизайнера', concept: 'Концепция', capsule: 'Капсула' };
  /* подписка METOD живёт здесь же, в ленте (Алина 03.11): «Оформить» / «Продлить» открывают шторку с тарифами → сразу оплата */
  /* порядок ленты — rank (feed-posts.js: дата поста, у подборок с маркетплейсов — после остальных подборок) */
  /* рубрика «Капсулы» (Алина 03.11): капсулы SOVEAPP из данных — по посту на капсулу, даты поста нет; в «Все» — после постов канала */
  var CAPS = (D.capsules || []).map(function (c) {
    return { id: 'capsule-' + c.id, type: 'capsule', rank: 0, ts: null, author: 'Дизайнер', capsuleId: c.id, title: c.name, style: c.style, text: c.concept,
      materials: c.materials || [], gallery: (c.gallery || []).length ? c.gallery : [{ room: 'Интерьер', src: c.cover }] };
  });
  var POSTS = (window.SOVE_FEED_POSTS || []).concat(CAPS).sort(function (a, b) { return (b.rank || b.ts) - (a.rank || a.ts); });
  function byId(id) { return POSTS.filter(function (p) { return p.id === id; })[0]; }
  function validType(t) { return TYPES.some(function (x) { return x.key === t; }) ? t : 'all'; }
  var cur = validType(ui.qs('t') || 'all');
  var focusId = byId(ui.qs('post')) ? ui.qs('post') : null;   /* deep-link ?post=<id>: этот пост первым, независимо от фильтра и пагинации */
  var PAGE = 6, shown = PAGE;   /* постов на экране: по 6, «Показать ещё» дорисовывает следующие 6 (концепций 28–81 — полсотни) */

  /* товары подборок нет в data.js — регистрируем, чтобы ♡ / 🛒, Избранное и Корзина видели их на любом экране.
     R.registerProduct запоминает усечённую карточку (без скидки и раздела) — на других экранах карточка показывала «−undefined %»,
     поэтому полную карточку кладём в то же хранилище сами, а registerProduct только добавляет её в каталог страницы.
     Товары маркетплейсов (it.marketplace) не регистрируем: они не партнёры, у них только «Перейти в магазин». */
  var XKEY = 'sove.products.extra';
  function remember(p) {
    var x; try { x = JSON.parse(localStorage.getItem(XKEY) || '{}') || {}; } catch (e) { x = {}; }
    if (x[p.id] && x[p.id].discount !== undefined) return;
    x[p.id] = p; try { localStorage.setItem(XKEY, JSON.stringify(x)); } catch (e) {}
  }
  POSTS.forEach(function (post) {
    (post.items || []).forEach(function (it) {
      if (it.local || it.marketplace || !R) return;
      var p = { id: it.pid, name: it.name, brand: it.brand, category: 'Мебель', subcat: it.category, capsules: [], retail: it.old || it.price, metod: it.price,
        discount: it.old ? Math.round(100 - it.price / it.old * 100) : 0, img: it.img, white: true, delivery: 'Уточняется у магазина', leadTime: 'Подборка дизайнера · ' + it.brand, madeToOrder: false, feed: post.id };
      remember(p);
      var ex = D.product(p.id);
      if (ex) { if (ex.discount === undefined) Object.assign(ex, p); } else R.registerProduct(p);
    });
  });
  function product(it) { return D.product(it.pid) || { id: it.pid, name: it.name, brand: it.brand, metod: it.price, retail: it.old || it.price, img: it.img, subcat: it.category }; }
  /* товары поста для корзины и Избранного — только партнёрские (маркетплейсов в каталоге нет) */
  function ids(post) { return (post.items || []).filter(function (it) { return !it.marketplace; }).map(function (it) { return it.pid; }); }
  /* без подписки открыто 5 постов (ТЗ 04.11, п. 6): WEEK в feed-posts.js — 1 концепция, 2 подборки, 2 акции; остальное размыто */
  /* переключатель показа «С подпиской / Без подписки» (Алина 03.11): в одном прототипе видно оба варианта ленты; ?view=sub|nosub */
  var demoView = /^(sub|nosub)$/.test(ui.qs('view') || '') ? ui.qs('view') : null;
  function subOn() { return demoView === 'nosub' ? false : demoView === 'sub' ? true : S.metod.active(); }
  function locked(post) { return post.access !== 'open' && !subOn(); }
  function setId(post) { return 'feed:' + post.id; }
  function hasSet(post) { return !!(R && R.favSets && R.favSets.has(setId(post))); }
  function initials(s) { return String(s || '').split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || 'S'; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }
  function picksOf(post) { return POSTS.filter(function (p) { return p.type === 'pick' && p.concept === post.concept; }); }
  /* «Найти в каталоге» — по названию товара: до 4 первых слов без префикса «Бренд: …», артикулов, размеров и хвоста после запятой
     (поиск Маркета требует совпадения всех слов — короткий запрос даёт шанс найти похожее) */
  var PREP = /^(в|на|с|и|из|для|под|без|по|к|у|от|со)$/i;
  function searchName(name) {
    var s = String(name || ''), c = s.indexOf(':'); if (c > 0 && c < 24) s = s.slice(c + 1);
    s = s.split(/[,(«»"]/)[0];
    var w = s.replace(/\//g, ' ').split(/\s+/).filter(function (x) { return x && !/\d/.test(x) && !/^[-–—]$/.test(x); }).slice(0, 4);
    while (w.length > 1 && PREP.test(w[w.length - 1])) w.pop();
    return w.join(' ') || String(name || '').slice(0, 40);
  }
  /* все картинки концепции: доска (или референс, если доски нет) + рендеры из kb/concept-refs.js (+ refs у 76–78) */
  function conceptImages(post) {
    if (post.type === 'capsule') return post.gallery.map(function (g) { return { src: g.src, label: String(g.room || '').toLowerCase() }; });
    var extra = (window.SOVE_CONCEPT_REFS || {})[String(post.concept)] || [];
    var list = [ { src: post.board, label: post.hasBoard === false ? 'референс' : 'доска' } ];
    (post.refs || []).concat(extra).forEach(function (src) { if (src && !list.some(function (x) { return x.src === src; })) list.push({ src: src, label: 'рендер' }); });
    return list;
  }
  var STAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';
  var HEART = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  var CART = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  /* ---------- кусочки карточек ---------- */
  function head(post, badge) {
    var who = post.type === 'promo' ? '<span class="fp__ava fp__ava--brand">' + esc(initials(post.brand)) + '</span>' : '<span class="fp__ava">' + STAR + '</span>';
    return '<header class="fp__head">' + who +
      '<span class="fp__who"><b>' + esc(post.author) + '</b><small>' + esc(KIND[post.type] || '') + (post.ts ? ' · ' + esc(F.dateLong(post.ts)) : '') + '</small></span>' +
      (badge ? '<span class="fp__badge' + (post.type === 'promo' ? ' fp__badge--promo' : '') + '">' + badge + '</span>' : '') + '</header>';
  }
  /* товар — своя плашка: фото предмета на белом, название, магазин, цена; партнёр: ♡ · 🛒 · «Найти в каталоге»; маркетплейс: «Перейти в магазин» */
  /* товар — плитка 2 в ряд (ТЗ 04.11, п. 7): фото на квадрате, ♡ и 🛒 кругами поверх фото, ниже цена, название в 2 строки, магазин.
     Старая цена зачёркнута всегда — и с подпиской, и без. Маркетплейс — одна кнопка «Перейти в магазин» под плиткой */
  function item(post, it) {
    var p = product(it), href = it.local ? 'product.html?id=' + p.id : '', name = it.local ? p.name : it.name;
    var now = it.marketplace ? it.price : p.metod, old = it.marketplace ? it.old : p.retail;
    var pic = (href ? '<a href="' + href + '"' : '<span') + ' class="fp-it__img"><img src="' + esc(it.img || p.img) + '" alt="" loading="lazy"></' + (href ? 'a' : 'span') + '>';
    var act = it.marketplace ? '' : '<div class="fp-it__act">' + (R ? R.btns(p, 'market') : '') + '</div>';
    return '<div class="fp-it' + (it.marketplace ? ' fp-it--mp' : '') + '"><div class="fp-it__pic">' + pic + act + '</div>' +
      '<div class="fp-it__body"><span class="rp-price"><b>' + F.rub(now) + '</b>' + (old > now ? '<s>' + F.rub(old) + '</s>' : '') + '</span>' +
      (href ? '<a class="fp-it__name" href="' + href + '">' + esc(name) + '</a>' : '<b class="fp-it__name">' + esc(name) + '</b>') +
      '<small class="fp-it__shop">' + esc(it.brand) + (it.marketplace ? ' · маркетплейс' : '') + '</small>' +
      (it.marketplace ? '<a class="btn btn--ghost btn--sm fp-it__go" href="' + esc(it.url) + '" target="_blank" rel="noopener">Перейти в магазин ↗</a>' : '') + '</div></div>';
  }
  function lockPlate() {
    return '<div class="fp__lock"><div class="fp__lock-box"><b>Полная лента и закрытые цены — по подписке METOD</b><a class="btn btn--primary btn--sm" href="#" data-sub>Оформить</a></div></div>';
  }
  var firstLockedId = null;   /* плашку «Оформить» — только на первом закрытом посте, остальные просто размыты (ТЗ 04.11, п. 6) */
  /* подборка → концепция: ссылка с обложкой; переход в той же странице (data-go), href — для новой вкладки */
  function conceptLink(post) {
    var c = byId('concept-' + post.concept); if (!c) return '';
    return '<a class="fp-cref" href="feed.html?post=' + esc(c.id) + '" data-go="' + esc(c.id) + '"><img src="' + esc(c.board) + '" alt="" loading="lazy">' +
      '<span class="fp-cref__t"><b>Смотреть концепцию ' + post.concept + ' ›</b><small>' + esc(c.title) + '</small></span></a>';
  }
  /* концепция → подборки к ней */
  function picksBlock(post) {
    var picks = picksOf(post); if (!picks.length) return '';
    return '<span class="fp__cap">Подборки к концепции ' + post.concept + '</span><div class="fp-picks">' + picks.map(function (p) {
      var n = p.items.length;
      return '<a class="fp-pick" href="feed.html?post=' + esc(p.id) + '" data-go="' + esc(p.id) + '"><span class="fp-pick__img"><img src="' + esc((p.items[0] || {}).img || '') + '" alt="" loading="lazy"></span>' +
        '<span><b>' + esc(p.category) + '</b><small>' + n + ' ' + plural(n, 'товар', 'товара', 'товаров') + '</small></span></a>';
    }).join('') + '</div>';
  }
  /* карусель картинок концепции: scroll-snap со свайпом, точки, стрелки на десктопе, тап — просмотр; картинки грузятся лениво */
  function carousel(post) {
    var imgs = conceptImages(post), n = imgs.length;
    return '<div class="fp-car' + (n > 1 ? ' fp-car--many' : '') + '" data-car="' + esc(post.id) + '"><div class="fp-car__box">' +
      '<div class="fp-car__track" aria-label="Картинки концепции · ' + n + '">' + imgs.map(function (im, i) {
        var alt = (im.label === 'доска' ? 'Доска материалов: ' : im.label === 'референс' ? 'Референс концепции: ' : 'Рендер: ') + post.title;
        return '<button type="button" class="fp-car__slide' + (im.label === 'рендер' ? '' : ' fp-car__slide--board') + '" data-view="' + i + '" aria-label="Открыть · ' + (i + 1) + ' из ' + n + ' · ' + im.label + '">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(alt) + '"' + (i ? ' loading="lazy"' : '') + '></button>';
      }).join('') + '</div>' +
      (n > 1 ? '<button type="button" class="fp-car__arr fp-car__arr--prev" data-car-step="-1" aria-label="Предыдущая картинка">' + CHEV + '</button>' +
        '<button type="button" class="fp-car__arr fp-car__arr--next" data-car-step="1" aria-label="Следующая картинка">' + CHEV + '</button>' : '') + '</div>' +
      (n > 1 ? '<div class="fp-car__dots" role="tablist" aria-label="Картинки">' + imgs.map(function (im, i) { return '<button type="button" class="fp-car__dot' + (i ? '' : ' is-on') + '" data-car-dot="' + i + '" role="tab" aria-selected="' + (i === 0) + '" aria-label="' + (i + 1) + ' из ' + n + ' · ' + im.label + '"></button>'; }).join('') + '</div>' : '') +
      '<p class="fp-car__cap" data-car-cap>' + (n > 1 ? '1 из ' + n + ' · ' : '') + imgs[0].label + '</p></div>';
  }

  function promoCard(post) {
    var badge = '−' + post.discount + ' %' + (post.until ? ' до ' + esc(post.until) : '');
    return head(post, badge) +
      '<h2 class="fp__t">' + esc(post.brand) + ': скидка партнёра ' + post.discount + ' %</h2>' +
      (post.text ? '<p class="fp__text">' + esc(post.text) + '</p>' : '') +
      '<div class="fp-items">' + post.items.map(function (it) { return item(post, it); }).join('') + '</div>' +
      '<footer class="fp__foot"><a class="btn btn--ghost btn--sm" href="market.html?q=' + encodeURIComponent(post.brand) + '">Все товары ' + esc(post.brand) + '</a>' +
      '<button type="button" class="btn btn--dark btn--sm" data-set-cart="' + esc(post.id) + '">' + CART + ' Всё в корзину</button></footer>';
  }
  function pickCard(post) {
    var on = hasSet(post), n = ids(post).length;
    return head(post, esc(post.category)) +
      '<h2 class="fp__t">' + esc(post.title) + '</h2>' +
      (post.text ? '<p class="fp__text">' + esc(post.text) + '</p>' : '') +
      conceptLink(post) +
      '<div class="fp-items">' + post.items.map(function (it) { return item(post, it); }).join('') + '</div>' +
      '<footer class="fp__foot">' +
      '<button type="button" class="btn btn--primary btn--sm' + (on ? ' is-on' : '') + '" data-set-save="' + esc(post.id) + '" aria-pressed="' + on + '">' + HEART + ' ' + (on ? 'Подборка в Избранном' : 'Сохранить подборку целиком') + '</button>' +
      (n ? '<button type="button" class="btn btn--dark btn--sm" data-set-cart="' + esc(post.id) + '">' + CART + ' Всё в корзину · ' + n + ' ' + plural(n, 'товар', 'товара', 'товаров') + '</button>' : '') + '</footer>';
  }
  function conceptCard(post) {
    var on = hasSet(post);
    return carousel(post) + head(post, 'Концепция ' + post.concept) +
      '<h2 class="fp__t">' + esc(post.title) + '</h2>' +
      (post.text ? '<p class="fp__text">' + esc(post.text) + '</p>' : '') +
      (post.dna && post.dna.length ? '<span class="fp__cap">ДНК интерьера</span><div class="fp-dna" style="--n:' + post.dna.length + '"><div class="fp-dna__bar">' + post.dna.map(function (c) { return '<i style="background:' + esc(c.hex) + '"></i>'; }).join('') + '</div>' +
        '<div class="fp-dna__names">' + post.dna.map(function (c) { return '<small>' + esc(c.name) + '</small>'; }).join('') + '</div></div>' : '') +
      (post.materials && post.materials.length ? '<span class="fp__cap">' + (post.materials.every(function (m) { return m.n; }) ? 'Материалы по номерам на доске' : 'Материалы на доске') + '</span><ol class="fp-mats">' + post.materials.map(function (m, i) { return '<li><span class="fp-mats__n">' + (m.n || i + 1) + '</span><span class="fp-mats__t"><b>' + esc(m.name) + '</b>' + (m.where ? '<small>' + esc(m.where) + '</small>' : '') + '</span></li>'; }).join('') + '</ol>' : '') +
      picksBlock(post) +
      '<footer class="fp__foot">' +
      '<button type="button" class="btn btn--primary btn--sm' + (on ? ' is-on' : '') + '" data-set-save="' + esc(post.id) + '" aria-pressed="' + on + '">' + HEART + ' ' + (on ? 'Материалы в Моём ремонте' : 'Сохранить в Мой ремонт') + '</button>' +
      '<a class="btn btn--ghost btn--sm" href="interior.html">Собрать интерьер по концепции</a></footer>';
  }
  function capsuleCard(post) {
    return carousel(post) + head(post, esc(post.style)) +
      '<h2 class="fp__t">' + esc(post.title) + '</h2>' +
      (post.text ? '<p class="fp__text">' + esc(post.text) + '</p>' : '') +
      (post.materials.length ? '<span class="fp__cap">Материалы</span><ol class="fp-mats">' + post.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol>' : '') +
      '<footer class="fp__foot"><a class="btn btn--ghost btn--sm" href="capsule.html?id=' + esc(post.capsuleId) + '">Подробнее о капсуле</a>' +
      '<a class="btn btn--primary btn--sm" href="interior.html?v=a">Собрать интерьер</a></footer>';
  }
  function card(post) {
    var lk = locked(post), body = post.type === 'promo' ? promoCard(post) : post.type === 'pick' ? pickCard(post) : post.type === 'capsule' ? capsuleCard(post) : conceptCard(post);
    var plate = lk && post.id === firstLockedId;
    return '<article class="fp fp--' + esc(post.type) + (lk ? ' is-locked' + (plate ? '' : ' is-quiet') : '') + (post.id === focusId ? ' is-focus' : '') + '" data-post="' + esc(post.id) + '"' + (lk ? ' aria-label="Пост по подписке METOD"' : '') + '>' +
      '<div class="fp__in"' + (lk ? ' inert aria-hidden="true"' : '') + '>' + body + '</div>' + (plate ? lockPlate() : '') + '</article>';
  }

  /* ---------- шапка как на Главной (ТЗ 04.11, п. 1): фото интерьера, «Пример расчёта бюджета», ползунок, выгода ----------
     Формулы — ровно как в home3.js: budget, gain, flatName, заливка ползунка через --fill. Интерьер — «Тёплая классика с терракотом» */
  var CAP = D.capsule('k4') || D.capsules.filter(function (c) { return !c.soon && !c.designer && c.pricePerM2; })[0];
  var BASE_STATE = D.scout.states.filter(function (x) { return x.id === 'concrete'; })[0] || D.scout.states[0];
  var AREA_MIN = 36, AREA_MAX = 84, AREA_DEF = 60, area = AREA_DEF;
  var sumRetail = 0, sumMetod = 0;
  D.products.forEach(function (p) { if (p.capsules && p.capsules.length) { sumRetail += p.retail; sumMetod += p.metod; } });
  var noMetodK = sumMetod ? sumRetail / sumMetod : 1.2;
  function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
  function budget(a) { return mln((BASE_STATE.rate + D.scout.roughRate(BASE_STATE.id) + CAP.pricePerM2) * a) + ' млн ₽'; }
  function gain(a) { return 'до ' + F.num(Math.round((CAP.pricePerM2 * noMetodK - CAP.pricePerM2) * a / 10000) * 10000).replace(/ /g, ' ') + ' ₽'; }
  function flatName(a) { return a < 41 ? 'Студия' : a < 56 ? '1-комнатная' : a < 71 ? '2-комнатная' : '3-комнатная'; }
  var HERO_SRC = ((D.ai && D.ai.renderMarks) || {})[CAP.id] ? D.ai.renderMarks[CAP.id].src : CAP.cover;
  /* цена «от» на кнопке — самый дешёвый тариф METOD из данных (Алина 04.11: цены как в данных прототипа) */
  var FROM = Math.min.apply(null, (D.metodPlans || [{ price: 0 }]).map(function (m) { return m.price; }));
  var MARK = '<span class="hc-mark3" aria-hidden="true"><i class="hc-mark3__logo"></i></span>';
  var GIFT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1"/></svg>';
  var UPLOAD = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>';
  /* 6 пунктов подписки (ТЗ 04.11, п. 2): obj — фото предмета на белом (contain + multiply), иначе интерьер / доска (cover) */
  var PERKS = [
    ['1 млн+', 'товаров со скидкой в Маркете', 'assets/img/cat/99537.jpg', true],
    ['5–20 %', 'скидка по закрытым ценам', 'assets/img/cat/93209.jpg', true],
    ['120+', 'подборок материалов ежемесячно', 'assets/img/feed/items/9080011.jpg', true],
    ['80+', 'готовых сочетаний в досках материалов', 'assets/img/feed/concept-78.jpg', false],
    ['200+', 'позиций в одной интерьерной капсуле', 'assets/img/capsules/k1-main-1.jpg', false],
    ['100 %', 'материалов отобраны дизайнерами', 'assets/img/feed/concept-76.jpg', false]
  ];
  function topHTML(active, open) {
    /* с подпиской продающий блок (фото, расчёт, выгода, пункты, «Оформить») не показываем — только строка «Подписка активна» (Алина 04.11) */
    if (active) return '<p class="fd-ok">' + STAR + ' Подписка METOD активна' + (S.metod.active() ? ' · осталось ' + S.metod.daysLeft() + ' дн.' : '') + ' · вся лента и закрытые цены открыты</p>';
    return '<div id="home3" class="fd-top"><section class="hc hc--c1" aria-label="Пример расчёта бюджета ремонта">' +
      '<div class="hc-hero"><img class="hc-hero__img" src="' + esc(HERO_SRC) + '" alt="Интерьер «' + esc(CAP.name) + '»" decoding="async">' +
        '<span class="fd-logo" aria-label="METOD ремонта"><i></i></span></div>' +
      '<div class="hc-card hc-card--1"><span class="hc-card__k">Пример расчёта бюджета</span>' +
        '<div class="hc-card__head"><h1 class="hc-card__t">Ваш ремонт <b class="hc-sum" id="fd-sum"></b></h1><span class="hc-card__m2" id="fd-m2"></span></div>' +
        '<input type="range" class="hc-range" id="fd-range" min="' + AREA_MIN + '" max="' + AREA_MAX + '" step="1" value="' + area + '" aria-label="Площадь квартиры, м²">' +
        '<p class="hc-card__sub" id="fd-area"></p>' +
        '<div class="hc-save hc-save--1">' + MARK + '<span class="hc-save__txt"><small>' + (active ? 'Выгода с вашей подпиской METOD' : 'Ваша выгода с подпиской METOD') + '</small><b id="fd-save"></b>' +
          '<em>Закрытые цены поставщиков и&nbsp;готовые решения дизайнеров</em></span></div></div></section>' +
      '<div class="fd-perks">' + PERKS.map(function (k) {
        return '<div class="fd-perk' + (k[3] ? ' is-obj' : '') + '"><img src="' + esc(k[2]) + '" alt="" loading="lazy"><span class="fd-perk__p"><b>' + esc(k[0]) + '</b><small>' + esc(k[1]) + '</small></span></div>';
      }).join('') + '</div>' +
      (active
        ? '<p class="fd-ok">' + STAR + ' Подписка METOD активна' + (S.metod.active() ? ' · осталось ' + S.metod.daysLeft() + ' дн.' : '') + ' · вся лента и закрытые цены открыты</p>'
        : '<a class="hc-go" href="#" data-sub>Оформить подписку · от ' + F.rub(FROM).replace(/ /g, ' ') + '</a>' +
          '<p class="fd-open">Сейчас открыто ' + open + ' ' + plural(open, 'пост', 'поста', 'постов') + ' из ' + POSTS.length + '</p>' + capsRow()) +
      '</div>';
  }
  /* карусель капсул (Алина 04.11: «сюда карусель капсул в ряд, как плитки выше»; с подпиской — первой на экране) — единая карточка SOVE.ui.capCard (Вика 03.11) */
  function capsRow() {
    var caps = (D.capsules || []).filter(function (c) { return !c.soon; });
    if (!caps.length || !S.ui.capCard) return '';
    return '<div class="fd-caps"><small class="fd-caps__t">Интерьерные капсулы</small><div class="fd-caps__row">' +
      caps.map(function (c) { return S.ui.capCard(c, { size: 'xs', href: 'capsule.html?id=' + c.id, cls: 'fd-caps__i' }); }).join('') + '</div></div>';
  }
  function syncArea() {
    var r = document.getElementById('fd-range'); if (!r) return;
    var a = Math.min(AREA_MAX, Math.max(AREA_MIN, Math.round(Number(r.value) || AREA_DEF))); area = a;
    function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
    set('fd-sum', budget(a)); set('fd-m2', a + ' м²'); set('fd-area', flatName(a) + ' · Базовый, ' + BASE_STATE.note); set('fd-save', gain(a));
    r.style.setProperty('--fill', ((a - AREA_MIN) / (AREA_MAX - AREA_MIN) * 100).toFixed(1) + '%');
    r.setAttribute('aria-valuetext', a + ' м², ремонт ' + budget(a).replace(/ /g, ' '));
  }
  /* плитка-подарок «Доска материалов по вашему рендеру» (ТЗ 04.11, п. 3) — компактная (Алина 04.11: «поменьше»).
     Без подписки плитка тоже есть: тап по «Прислать рендер» — окно «Оформить подписку» (renderGift), загрузка только подписчикам */
  function giftHTML(active) {
    return '<section class="fd-gift"><div class="fd-gift__ph"><img src="assets/img/feed/concept-78.jpg" alt="Доска материалов" loading="lazy">' +
      '<span class="fd-gift__tag">' + GIFT + (active ? 'ВХОДИТ В ВАШУ ПОДПИСКУ' : 'В ПОДАРОК С ПОДПИСКОЙ') + '</span>' +
      '<span class="fd-gift__logo" aria-label="METOD ремонта"><i></i></span>' +
      '<figure class="fd-gift__pol"><img src="assets/img/feed/concept-78-ref-1.jpg" alt="" loading="lazy"><figcaption>ваш рендер</figcaption></figure></div>' +
      /* Алина 04.11: «это место только загрузка и всё» — без описания и плашек, только заголовок и кнопка */
      '<div class="fd-gift__b"><h2 class="fd-gift__t">Доска материалов по вашему рендеру</h2>' +
      '<button type="button" class="fd-gift__go" data-render>' + UPLOAD + ' Прислать рендер</button></div></section>';
  }
  function renderGift() {
    if (subOn()) { location.href = 'ai.html?mode=render'; return; }
    ui.modal({ eyebrow: 'Подписка METOD', title: 'Доска материалов по рендеру — в подарок с подпиской',
      text: 'Оформите подписку METOD — и дизайнер SOVE соберёт доску материалов по вашему рендеру. После оплаты вернём вас сюда.',
      actions: [ { label: 'Оформить подписку · от ' + F.rub(FROM), kind: 'primary', onClick: function () { setTimeout(openSub, 0); } }, { label: 'Не сейчас', kind: 'ghost' } ] });
  }
  /* рубрики и категории — два фильтра, работают вместе (ТЗ 04.11, п. 4–5) */
  function filtersHTML() {
    var byType = function (k) { return POSTS.filter(function (p) { return inType(p, k); }).length; };
    var nAll = POSTS.length;
    var rub = '<section class="fd-rub"><span class="fd-cap">Рубрики</span>' +
      '<button type="button" class="fd-all' + (cur === 'all' ? ' is-on' : '') + '" data-t="all" aria-pressed="' + (cur === 'all') + '">Все · ' + nAll + ' ' + plural(nAll, 'пост', 'поста', 'постов') + '</button>' +
      '<div class="fd-rub__grid">' + TYPES.slice(1).map(function (t) {
        var n = byType(t.key);
        return '<button type="button" class="fd-rt' + (t.obj ? ' is-obj' : '') + (cur === t.key ? ' is-on' : '') + '" data-t="' + t.key + '" aria-pressed="' + (cur === t.key) + '"><img src="' + esc(t.img) + '" alt="" loading="lazy">' +
          '<span><b>' + esc(t.label) + '</b><small>' + (n ? n + ' ' + plural(n, 'пост', 'поста', 'постов') : 'скоро') + '</small></span></button>';
      }).join('') + '</div></section>';
    var inRub = POSTS.filter(function (p) { return inType(p, cur); });
    var cats = '<section class="fd-cats"><span class="fd-cap">Категории</span><div class="fd-cats__row">' +
      '<button type="button" class="fd-c' + (curCat === 'all' ? ' is-on' : '') + '" data-c="all" aria-pressed="' + (curCat === 'all') + '">Все</button>' +
      CATS.map(function (c) {
        var n = inRub.filter(function (p) { return inCat(p, c); }).length;
        return '<button type="button" class="fd-c' + (curCat === c ? ' is-on' : '') + '" data-c="' + esc(c) + '" aria-pressed="' + (curCat === c) + '"' + (n ? '' : ' disabled') + '>' + esc(c) + ' <i>' + n + '</i></button>';
      }).join('') + '</div></section>';
    return rub + cats;
  }
  /* призыв внизу (Алина 04.11): дизайн-проект по готовой капсуле, промокод 5 000 ₽ по подписке METOD → блок «Дизайн-проект» */
  function adeptHTML() {
    return '<a class="fd-adept" href="adept.html"><span class="fd-adept__t"><small>Дизайн-проект по готовой капсуле</small>' +
      '<b>Промокод 5&nbsp;000&nbsp;₽ по подписке METOD</b></span><span class="fd-adept__go">Перейти ' + CHEV + '</span></a>';
  }

  /* ---------- экран ---------- */
  function paint() {
    var active = subOn(), open = POSTS.filter(function (p) { return !locked(p); }).length;
    var focus = focusId ? byId(focusId) : null;
    var list = POSTS.filter(function (p) { return inType(p, cur) && inCat(p, curCat) && p !== focus; });
    /* без подписки открытые посты идут первыми, все закрытые — ниже (порядок внутри групп сохраняем) */
    if (!active) list = list.filter(function (p) { return !locked(p); }).concat(list.filter(locked));
    if (focus) list.unshift(focus);   /* deep-link: пост первым и раскрытым, даже если закрыт по подписке (тогда с плашкой) */
    var firstLocked = list.slice(0, shown).filter(locked)[0]; firstLockedId = firstLocked ? firstLocked.id : null;
    root.innerHTML =
      '<div class="fd-view" role="tablist" aria-label="Как выглядит лента">' +
        '<button type="button" role="tab" data-view="sub" aria-selected="' + active + '"' + (active ? ' class="is-on"' : '') + '>С подпиской</button>' +
        '<button type="button" role="tab" data-view="nosub" aria-selected="' + !active + '"' + (!active ? ' class="is-on"' : '') + '>Без подписки</button></div>' +
      /* с подпиской экран тоже начинается с карусели капсул (Алина 04.11), без подписки карусель — под кнопкой «Оформить» внутри topHTML */
      (active ? capsRow() : '') + topHTML(active, open) + giftHTML(active) +
      (focus
        ? '<div class="fd-back"><button type="button" class="btn btn--ghost btn--sm" data-feed-back>← Все посты</button><small>' + esc(KIND[focus.type] || '') + (focus.concept ? ' · концепция ' + focus.concept : '') + '</small></div>'
        : filtersHTML()) +
      (list.length ? '<div class="fd-list">' + list.slice(0, shown).map(card).join('') + '</div>' : '<p class="fd-empty">Постов с таким фильтром пока нет.</p>') +
      (list.length > shown ? '<button type="button" class="btn btn--ghost fd-more" data-more>Показать ещё · ' + (list.length - shown) + ' ' + plural(list.length - shown, 'пост', 'поста', 'постов') + '</button>' : '') +
      adeptHTML() +
      '<p class="fd-note">Посты закрытого Telegram-канала METOD появляются здесь автоматически. Товар из подборки распознаётся и ищется в каталоге SOVEAPP.</p>';
    syncArea();
    if (R && R.sync) R.sync(root);
    bind();
  }

  /* ---------- подписка METOD: шторка с тарифами и оплата ---------- */
  var INSIDE = ['Закрытые акции партнёров', 'Доски материалов от дизайнера — раз в неделю', 'Подборки товаров — каждый день', 'Отзывы о поставщиках', 'Клуб участников — 3000+ человек'];
  function monthsW(n) { return n + ' ' + plural(n, 'месяц', 'месяца', 'месяцев'); }
  function openSub() {
    var plans = D.metodPlans || [], base = plans[0], on = S.metod.active();   /* подарок — giftGens тарифа (ТЗ 04.11: 6 месяцев — 25 генераций) */
    S.ui.modal({ eyebrow: 'Подписка METOD', title: on ? 'Продлить подписку' : 'Оформить подписку',
      html: '<ul class="fd-in">' + INSIDE.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '<div class="fd-plans">' + plans.map(function (m) {
          var gift = m.giftGens || 0;
          return '<button type="button" class="fd-plan' + (gift ? ' is-best' : '') + '" data-mt-buy="' + m.id + '"><span class="fd-plan__t"><b>' + monthsW(m.months) + '</b>' +
            '<small>' + (m.months > 1 ? '≈ ' + F.rub(m.price / m.months) + ' в месяц' : 'чтобы попробовать') + (gift ? ' · в подарок ' + F.tokens(gift) : '') + '</small></span>' +
            '<b class="fd-plan__p">' + F.rub(m.price) + '</b></button>';
        }).join('') + '</div>' + (on ? '<p class="small muted">Сейчас активна до ' + F.dateLong(S.metod.until()) + ' — продлим с этой даты.</p>' : '') });
  }
  function buySub(id) {
    var m = (D.metodPlans || []).filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var back = ui.qs('returnTo') || 'feed.html';   /* после оплаты — на экран, с которого пришли (окно «бюджет по подписке» и т.п.) */
    if (!S.auth.isIn()) { S.ui.needAuth('Войдите, чтобы оплатить', 'feed.html?buy=' + id + '&returnTo=' + encodeURIComponent(back)); return; }
    var pm = S.pay.create({ kind: 'metod', id: m.id, title: 'METOD · ' + monthsW(m.months), price: m.price, months: m.months, giftGens: m.giftGens || 0 }, back);
    location.href = 'pay.html?id=' + encodeURIComponent(pm.id);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-sub]'); if (a) { e.preventDefault(); openSub(); return; }
    var b = e.target.closest('[data-mt-buy]'); if (b) { e.preventDefault(); buySub(b.getAttribute('data-mt-buy')); }
  });

  /* ---------- действия ---------- */
  function persist() { var f = R.flats.active(); if (f) R.flats.update(f.id, {}); }
  /* R.favSets хранит только {id, kind, capsuleId, title, cover, ts} — список товаров дописываем в сохранённую запись и перезаписываем хранилище */
  function toggleSet(p) {
    if (!R || !R.favSets) return;
    var isConcept = p.type === 'concept';
    var set = { id: setId(p), kind: isConcept ? 'concept' : 'feed', title: isConcept ? 'Материалы · ' + p.title : p.title, cover: isConcept ? p.board : (p.items[0] || {}).img, productIds: ids(p) };
    var on = R.favSets.toggle(set);
    if (on) {
      var saved = R.favSets.list().filter(function (x) { return x.id === set.id; })[0];
      if (saved) { saved.productIds = set.productIds; saved.post = p.id; saved.href = 'feed.html?post=' + p.id; if (isConcept) { saved.materials = p.materials; saved.dna = p.dna; } persist(); }
    }
    syncSets();
  }
  function syncSets() {
    root.querySelectorAll('[data-set-save]').forEach(function (b) {
      var p = byId(b.getAttribute('data-set-save')); if (!p) return;
      var on = hasSet(p), isConcept = p.type === 'concept';
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
      b.innerHTML = HEART + ' ' + (isConcept ? (on ? 'Материалы в Моём ремонте' : 'Сохранить в Мой ремонт') : (on ? 'Подборка в Избранном' : 'Сохранить подборку целиком'));
    });
  }
  function url(id) { if (id) return 'feed.html?post=' + encodeURIComponent(id); var q = []; if (cur !== 'all') q.push('t=' + cur); if (curCat !== 'all') q.push('c=' + encodeURIComponent(curCat)); if (demoView) q.push('view=' + demoView); return 'feed.html' + (q.length ? '?' + q.join('&') : ''); }
  /* переход к посту в той же странице: пост первым, адрес ?post=<id> (pushState — «Назад» возвращает к списку) */
  function go(id) {
    if (!byId(id)) return;
    focusId = id; shown = PAGE;
    try { history.pushState({ post: id }, '', url(id)); } catch (e) {}
    paint(); window.scrollTo(0, 0);
  }
  function back() {
    focusId = null; shown = PAGE;
    try { history.replaceState(null, '', url(null)); } catch (e) {}
    paint(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function () {
    var id = ui.qs('post'), want = byId(id) ? id : null;
    if (want !== focusId) { focusId = want; shown = PAGE; cur = validType(ui.qs('t') || 'all'); paint(); }
  });
  function bindCarousels() {
    root.querySelectorAll('.fp-car').forEach(function (car) {
      var p = byId(car.getAttribute('data-car')); if (!p) return;
      var track = car.querySelector('.fp-car__track'), dots = car.querySelectorAll('[data-car-dot]'), cap = car.querySelector('[data-car-cap]');
      var imgs = conceptImages(p), n = imgs.length, idx = 0, raf = 0;
      function width() { return Math.max(1, track.clientWidth); }
      function update() {
        raf = 0; var i = Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / width()))); if (i === idx) return; idx = i;
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', String(k === i)); });
        if (cap) cap.textContent = (i + 1) + ' из ' + n + ' · ' + imgs[i].label;
      }
      function to(i) { track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * width(), behavior: 'smooth' }); }
      track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      car.querySelectorAll('[data-car-step]').forEach(function (b) { b.addEventListener('click', function () { to(idx + Number(b.getAttribute('data-car-step'))); }); });
      dots.forEach(function (d) { d.addEventListener('click', function () { to(Number(d.getAttribute('data-car-dot'))); }); });
      car.querySelectorAll('[data-view]').forEach(function (b) {
        b.addEventListener('click', function () { if (V) V.open(imgs, Number(b.getAttribute('data-view')), { title: p.title }); });
      });
    });
  }
  function bind() {
    root.querySelectorAll('.fd-view [data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        demoView = b.getAttribute('data-view'); shown = PAGE;
        try { history.replaceState(null, '', url(focusId)); } catch (e) {}
        paint(); window.scrollTo(0, 0);
      });
    });
    var rg = document.getElementById('fd-range'); if (rg) rg.addEventListener('input', syncArea);
    var rb = root.querySelector('[data-render]'); if (rb) rb.addEventListener('click', renderGift);
    root.querySelectorAll('[data-c]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        curCat = b.getAttribute('data-c'); shown = PAGE;
        try { history.replaceState(null, '', url(null)); } catch (e) {}
        paint();
      });
    });
    root.querySelectorAll('[data-t]').forEach(function (b) {
      b.addEventListener('click', function () {
        cur = validType(b.getAttribute('data-t')); shown = PAGE;
        try { history.replaceState(null, '', url(null)); } catch (e) {}
        paint();
      });
    });
    var more = root.querySelector('[data-more]');
    if (more) more.addEventListener('click', function () {
      var first = root.querySelectorAll('.fd-list .fp').length; shown += PAGE; paint();
      var next = root.querySelectorAll('.fd-list .fp')[first]; if (next) next.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    var bk = root.querySelector('[data-feed-back]'); if (bk) bk.addEventListener('click', back);
    root.querySelectorAll('[data-go]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-go')); }); });
    root.querySelectorAll('[data-set-save]').forEach(function (b) { b.addEventListener('click', function () { var p = byId(b.getAttribute('data-set-save')); if (p) toggleSet(p); }); });
    root.querySelectorAll('[data-set-cart]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = byId(b.getAttribute('data-set-cart')); if (!p || !R) return;
        var n = R.cart.addMany(ids(p), 'market'); if (!n) ui.toast('Эти товары уже в корзине');
        R.sync(root);
      });
    });
    bindCarousels();
    /* фото предмета ещё не загружено (items/<pid>.jpg готовит команда) — вместо битой картинки нейтральная плашка */
    root.querySelectorAll('.fp-it__pic img, .fp-pick img, .fp-cref img').forEach(function (img) {
      function none() { img.parentNode.classList.add('is-none'); img.remove(); }
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('loading') !== 'lazy') none(); else img.addEventListener('error', none);
    });
  }
  /* нижнее меню: лента живёт на «Главной», как и экран METOD (site.js не трогаем — подсвечиваем сами) */
  function markTab() {
    document.querySelectorAll('.tabbar a[data-tab="home"], .side__nav a[data-tab="home"]').forEach(function (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); });
  }

  function boot() {
    /* лента всегда открывается с начала — с шапки, а не с места, где была прокрутка в прошлый раз (Алина 04.11) */
    try { history.scrollRestoration = 'manual'; } catch (e) {}
    paint(); markTab(); window.scrollTo(0, 0);
    /* ?buy=<план> — возврат после входа или старая ссылка на оформление METOD: сразу к оплате; buy из адреса убираем */
    var buyId = ui.qs('buy');
    if (buyId) { try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]buy=[^&]*/, '').replace(/^&/, '?')); } catch (e) {} buySub(buyId); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('sove:repair', function () { if (R && R.sync) R.sync(root); syncSets(); });
  if (S.onChange) S.onChange(function () { setTimeout(function () { paint(); markTab(); }, 0); });  /* вход, подписка — шапка перерисовалась, лента тоже */
})();
