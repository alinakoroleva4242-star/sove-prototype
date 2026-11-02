/* Лента «Метод ремонта» (feed.html) — закрытый канал METOD в приложении (созвон 28.10.2026, Алина и Таня; замечания Тани 29.10).
   Посты — assets/js/feed-posts.js (window.SOVE_FEED_POSTS). Три типа карточек: акция партнёра, подборка дизайнера,
   концепция. Без подписки открыт контент недели (access:'open', правило WEEK в feed-posts.js), остальное размыто (CSS) и ведёт на metod.html.
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

  var TYPES = [ { key: 'all', label: 'Все' }, { key: 'promo', label: 'Акции' }, { key: 'pick', label: 'Подборки' }, { key: 'concept', label: 'Концепции' } ];
  var KIND = { promo: 'Акция партнёра', pick: 'Подборка дизайнера', concept: 'Концепция' };
  var METOD_HREF = 'metod.html?returnTo=feed.html';
  /* порядок ленты — rank (feed-posts.js: дата поста, у подборок с маркетплейсов — после остальных подборок) */
  var POSTS = (window.SOVE_FEED_POSTS || []).slice().sort(function (a, b) { return (b.rank || b.ts) - (a.rank || a.ts); });
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
  function locked(post) { return post.access === 'metod' && !S.metod.active(); }
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
      '<span class="fp__who"><b>' + esc(post.author) + '</b><small>' + esc(KIND[post.type] || '') + ' · ' + esc(F.dateLong(post.ts)) + '</small></span>' +
      (badge ? '<span class="fp__badge' + (post.type === 'promo' ? ' fp__badge--promo' : '') + '">' + badge + '</span>' : '') + '</header>';
  }
  /* товар — своя плашка: фото предмета на белом, название, магазин, цена; партнёр: ♡ · 🛒 · «Найти в каталоге»; маркетплейс: «Перейти в магазин» */
  function item(post, it) {
    var p = product(it), href = it.local ? 'product.html?id=' + p.id : '', name = it.local ? p.name : it.name;
    var pic = (href ? '<a href="' + href + '"' : '<span') + ' class="fp-it__pic"><img src="' + esc(it.img || p.img) + '" alt="" loading="lazy"></' + (href ? 'a' : 'span') + '>';
    var price = it.marketplace
      ? '<span class="rp-price"><b>' + F.rub(it.price) + '</b>' + (it.old > it.price ? '<s>' + F.rub(it.old) + '</s>' : '') + '</span>'
      : (R ? R.price(p) : '<span class="rp-price"><b>' + F.rub(p.metod) + '</b></span>');
    var act = it.marketplace
      ? '<a class="btn btn--ghost btn--sm fp-it__go" href="' + esc(it.url) + '" target="_blank" rel="noopener">Перейти в магазин ↗</a>'
      : (R ? R.btns(p, 'market') : '') + '<a class="fp-it__find" href="market.html?q=' + encodeURIComponent(searchName(name)) + '">Найти в каталоге</a>';
    return '<div class="fp-it' + (it.marketplace ? ' fp-it--mp' : '') + '">' + pic +
      '<div class="fp-it__body">' + (href ? '<a class="fp-it__name" href="' + href + '">' + esc(name) + '</a>' : '<b class="fp-it__name">' + esc(name) + '</b>') +
      '<small class="fp-it__shop">' + esc(it.brand) + (it.marketplace ? ' · маркетплейс' : it.category ? ' · ' + esc(it.category) : '') + '</small>' +
      price + '<div class="fp-it__act">' + act + '</div></div></div>';
  }
  function lockPlate() {
    return '<div class="fp__lock"><div class="fp__lock-box"><b>Полная лента и закрытые цены — по подписке METOD</b><a class="btn btn--primary btn--sm" href="' + METOD_HREF + '">Оформить</a></div></div>';
  }
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
      return '<a class="fp-pick" href="feed.html?post=' + esc(p.id) + '" data-go="' + esc(p.id) + '"><img src="' + esc((p.items[0] || {}).img || '') + '" alt="" loading="lazy">' +
        '<span><b>' + esc(p.category) + '</b><small>' + n + ' ' + plural(n, 'товар', 'товара', 'товаров') + ' · ' + esc(F.dateLong(p.ts)) + '</small></span></a>';
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
    return head(post, 'Концепция ' + post.concept) +
      '<h2 class="fp__t">' + esc(post.title) + '</h2>' +
      (post.text ? '<p class="fp__text">' + esc(post.text) + '</p>' : '') +
      carousel(post) +
      (post.dna && post.dna.length ? '<span class="fp__cap">ДНК интерьера</span><div class="fp-dna fp-dna--' + Math.min(post.dna.length, 7) + '">' + post.dna.map(function (c) { return '<span class="fp-dna__c"><i style="background:' + esc(c.hex) + '"></i><small>' + esc(c.name) + '</small></span>'; }).join('') + '</div>' : '') +
      (post.materials && post.materials.length ? '<span class="fp__cap">' + (post.materials.every(function (m) { return m.n; }) ? 'Материалы по номерам на доске' : 'Материалы на доске') + '</span><ol class="fp-mats">' + post.materials.map(function (m, i) { return '<li><span class="fp-mats__n">' + (m.n || i + 1) + '</span><span class="fp-mats__t"><b>' + esc(m.name) + '</b>' + (m.where ? '<small>' + esc(m.where) + '</small>' : '') + '</span></li>'; }).join('') + '</ol>' : '') +
      picksBlock(post) +
      '<footer class="fp__foot">' +
      '<button type="button" class="btn btn--primary btn--sm' + (on ? ' is-on' : '') + '" data-set-save="' + esc(post.id) + '" aria-pressed="' + on + '">' + HEART + ' ' + (on ? 'Материалы в Моём ремонте' : 'Сохранить в Мой ремонт') + '</button>' +
      '<a class="btn btn--ghost btn--sm" href="interior.html">Собрать интерьер по концепции</a></footer>';
  }
  function card(post) {
    var lk = locked(post), body = post.type === 'promo' ? promoCard(post) : post.type === 'pick' ? pickCard(post) : conceptCard(post);
    return '<article class="fp fp--' + esc(post.type) + (lk ? ' is-locked' : '') + (post.id === focusId ? ' is-focus' : '') + '" data-post="' + esc(post.id) + '"' + (lk ? ' aria-label="Пост по подписке METOD"' : '') + '>' +
      '<div class="fp__in"' + (lk ? ' inert aria-hidden="true"' : '') + '>' + body + '</div>' + (lk ? lockPlate() : '') + '</article>';
  }

  /* ---------- экран ---------- */
  function paint() {
    var active = S.metod.active(), open = POSTS.filter(function (p) { return !locked(p); }).length;
    var focus = focusId ? byId(focusId) : null;
    var list = POSTS.filter(function (p) { return (cur === 'all' || p.type === cur) && p !== focus; });
    if (focus) list.unshift(focus);   /* deep-link: пост первым и раскрытым, даже если закрыт по подписке (тогда с плашкой) */
    root.innerHTML =
      '<div class="fd-head"><span class="eyebrow">Подписка METOD</span><h1 class="h1">Метод ремонта</h1>' +
      '<p class="lead">Лента закрытого канала: акции, подборки, концепции</p></div>' +
      (active
        ? '<p class="fd-ok">' + STAR + ' Подписка METOD активна · осталось ' + S.metod.daysLeft() + ' дн. · вся лента и закрытые цены открыты</p>'
        : '<a class="fd-sub" href="' + METOD_HREF + '"><span class="fd-sub__t"><b>Открыто ' + open + ' ' + plural(open, 'пост', 'поста', 'постов') + ' из ' + POSTS.length + '</b><small>Контент недели — всем, полная лента и закрытые цены — по подписке METOD</small></span><span class="btn btn--primary btn--sm">Оформить</span></a>') +
      (focus
        ? '<div class="fd-back"><button type="button" class="btn btn--ghost btn--sm" data-feed-back>← Все посты</button><small>' + esc(KIND[focus.type] || '') + (focus.concept ? ' · концепция ' + focus.concept : '') + '</small></div>'
        : '<div class="fd-chips" role="group" aria-label="Тип поста">' + TYPES.map(function (t) {
          var n = t.key === 'all' ? POSTS.length : POSTS.filter(function (p) { return p.type === t.key; }).length;
          return '<button type="button" class="chip' + (cur === t.key ? ' is-on' : '') + '" data-t="' + t.key + '" aria-pressed="' + (cur === t.key) + '">' + esc(t.label) + ' <i>' + n + '</i></button>';
        }).join('') + '</div>') +
      (list.length ? '<div class="fd-list">' + list.slice(0, shown).map(card).join('') + '</div>' : '<p class="fd-empty">Постов этого типа пока нет.</p>') +
      (list.length > shown ? '<button type="button" class="btn btn--ghost fd-more" data-more>Показать ещё · ' + (list.length - shown) + ' ' + plural(list.length - shown, 'пост', 'поста', 'постов') + '</button>' : '') +
      '<p class="fd-note">Посты закрытого Telegram-канала METOD появляются здесь автоматически. Товар из подборки распознаётся и ищется в каталоге SOVEAPP.</p>';
    if (R && R.sync) R.sync(root);
    bind();
  }

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
  function url(id) { return 'feed.html' + (id ? '?post=' + encodeURIComponent(id) : cur === 'all' ? '' : '?t=' + cur); }
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

  function boot() { paint(); markTab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('sove:repair', function () { if (R && R.sync) R.sync(root); syncSets(); });
  if (S.onChange) S.onChange(function () { setTimeout(function () { paint(); markTab(); }, 0); });  /* вход, подписка — шапка перерисовалась, лента тоже */
})();
