/* Маркет: поиск, фильтры, сортировка, избранное. Состояние фильтров живёт в адресе страницы.
   Источник товаров: живой каталог (SOVE.catalog, /api/marketplace/*, 1 млн товаров), когда страница открыта
   с сервера; с file:// — примеры из data.js. Разметка и поведение одинаковые для обоих источников. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;
  var listEl = document.getElementById('market-list');
  if (!listEl) return;

  var $ = function (id) { return document.getElementById(id); };
  var qInput = $('market-q'), qClear = $('market-q-clear'), sortEl = $('market-sort');
  var countEl = $('market-count'), countMobEl = $('market-count-m'), activeEl = $('market-active');
  var openBtn = $('market-open-filters'), deskPanel = $('market-filters'), metodEl = $('market-metod');
  var resetDesk = document.querySelector('.market-filters [data-reset]');

  var LIVE = !!(S.catalog && S.catalog.enabled) && S.ui.qs('demo') !== 'local';
  var CAPS = D.capsules.filter(function (c) { return !c.soon; });
  var DISCOUNTS = [10, 20, 30];
  function promoRank(p) { return D.isPromo(p.id) ? 0 : 1; }
  /* акции партнёров идут первыми: это платное продвижение, помечено на карточке */
  function byDiscount(a, b) { return promoRank(a) - promoRank(b) || b.discount - a.discount || b.metod - a.metod || a.id - b.id; }
  var SORTS = {
    /* «Выгодные» — по умолчанию (Таня и Алина 30.10: слово «Вперемешку» убрать, сразу самые большие скидки,
       но товары разные). Сервер (sort=best) ставит первыми лучшие товары разных брендов, каждый следующий
       товар бренда — как будто со скидкой на 10 пунктов меньше. На общей витрине разделы идут по кругу — mixed().
       В образце data.js — скидка по убыванию, при равной скидке дешевле; бренды чередует brandMix */
    best: function (a, b) { return promoRank(a) - promoRank(b) || b.discount - a.discount || a.metod - b.metod || a.id - b.id; },
    price_asc: function (a, b) { return a.metod - b.metod || a.id - b.id; },
    price_desc: function (a, b) { return b.metod - a.metod || a.id - b.id; }
  };
  var PRICE_MIN = Math.min.apply(null, D.products.map(function (p) { return p.metod; }));
  var PRICE_MAX = Math.max.apply(null, D.products.map(function (p) { return p.metod; }));
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  var TICK = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 5l3.5 3.5L11 1"/></svg>';

  var PAGE = 16;
  var st = { shown: PAGE, page: 1, q: '', cats: [], sub: '', capsule: '', min: null, max: null, discount: 0, sort: 'best', promo: false, pcat: '', brand: '', sale: false };

  /* ---------- категории таблицы партнёров (Алина 29.10: фильтры — по схеме таблицы, как в партнёрском блоке ботов) ----------
     assets/js/partner-cats.js собирает tools/gen_partner_cats.py. Категория таблицы → раздел каталога API,
     подкатегория → подтип (ptype) раздела, если такой подтип у каталога есть; иначе подкатегорию не показываем. */
  var PARTNERS = window.SOVE_PARTNERS || null;
  var P_API = { otdelka: 'Отделка', svet: 'Освещение', rozetki: 'Розетки и выключатели', santehnika: 'Сантехника',
                tehnika: 'Техника', mebel: 'Мебель покупная', dveri: 'Двери и перегородки', dekor: 'Декор' };
  /* подкатегория таблицы → подтип каталога, когда названия не совпадают (у каталога «Панели» — все стеновые) */
  var P_PTYPE = { 'bambukovye-paneli': 'Панели' };
  function efold(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').trim(); }
  /* «Мебель покупная» → «Мебель»: в фильтре, чипе и заголовке — названия таблицы */
  function catTitle(api) {
    if (!PARTNERS) return api;
    for (var k in P_API) if (P_API[k] === api) { var c = PARTNERS.cat(k); return c ? c.title : api; }
    return api;
  }
  var loaded = false, demoError = S.ui.qs('demo') === 'error', loadError = false;
  var sheet = null; /* открытое окно фильтров на телефоне */

  /* ---------- адрес ⇄ состояние ---------- */
  function toInt(v) { var n = parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10); return isFinite(n) && n > 0 ? n : null; }
  function readURL() {
    var u = new URLSearchParams(location.search);
    st.q = (u.get('q') || '').trim().slice(0, 80);
    st.cats = (u.get('category') || '').split(',').map(function (c) { return c.trim(); }).filter(function (c, i, a) { return c && a.indexOf(c) === i && (LIVE || D.categories.indexOf(c) >= 0); }).slice(0, 4);
    st.sub = (u.get('sub') || '').trim().slice(0, 60);
    var cap = (u.get('capsule') || '').toLowerCase();
    st.capsule = CAPS.some(function (c) { return c.id === cap; }) ? cap : '';
    var d = parseInt(u.get('discount'), 10);
    st.discount = DISCOUNTS.indexOf(d) >= 0 ? d : 0;
    /* старые ссылки ?sort=discount и ?sort=mix («Каталог со скидками» на metod.html) — это «Выгодные» */
    st.sort = SORTS[u.get('sort')] ? u.get('sort') : 'best';
    st.promo = u.get('promo') === '1';
    var pc = (u.get('pcat') || '').trim();
    st.pcat = st.promo && (pc === 'all' || pc === 'other' || (PARTNERS && PARTNERS.cat(pc))) ? pc : '';
    st.brand = (u.get('brand') || '').trim().slice(0, 80);
    st.sale = u.get('sale') === '1';
    st.min = toInt(u.get('min')); st.max = toInt(u.get('max'));
    if (st.min && st.max && st.min > st.max) { st.min = st.max = null; }
  }
  function query() {
    var u = new URLSearchParams();
    if (st.q) u.set('q', st.q);
    if (st.cats.length) u.set('category', st.cats.join(','));
    if (st.sub) u.set('sub', st.sub);
    if (st.capsule) u.set('capsule', st.capsule);
    if (st.discount) u.set('discount', String(st.discount));
    if (st.promo) u.set('promo', '1');
    if (st.promo && st.pcat) u.set('pcat', st.pcat);
    if (st.brand) u.set('brand', st.brand);
    if (st.sale) u.set('sale', '1');
    if (st.min && !priceBad()) u.set('min', String(st.min));
    if (st.max && !priceBad()) u.set('max', String(st.max));
    if (st.sort !== 'best') u.set('sort', st.sort);
    var s = u.toString();
    return s ? '?' + s : '';
  }
  function here() { return 'market.html' + query(); }
  function writeURL() {
    /* state сохраняем: по нему «назад» из категории акций возвращает к плиткам (см. openPcat) */
    try { history.replaceState(history.state, '', location.pathname + query()); } catch (e) { /* file:// — без синхронизации */ }
    /* кнопка «Войти» в шапке должна вернуть на этот же набор фильтров */
    var login = document.querySelector('.header__cab[href^="auth.html"]');
    if (login) login.setAttribute('href', 'auth.html?returnTo=' + encodeURIComponent(here()));
  }
  function priceBad() { return st.min && st.max && st.min > st.max; }
  function filtersOn() { return st.cats.length + (st.capsule ? 1 : 0) + (st.promo ? 1 : 0) + (st.discount ? 1 : 0) + (st.brand ? 1 : 0) + (st.sale ? 1 : 0) + (((st.min || st.max) && !priceBad()) ? 1 : 0); }
  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }
  function goods(n) { return F.num(n) + ' ' + plural(n, ['товар', 'товара', 'товаров']); }
  function capCode() { var c = st.capsule ? D.capsule(st.capsule) : null; return c ? c.code : ''; }   /* только для запросов к API — в интерфейсе не показываем */
  /* имя капсулы в интерфейсе — короткое, как в Интерьере (SOVE_KB), иначе из data.js; коды К1–К7 не показываем */
  function capLabel(c) { if (typeof c === 'string') c = D.capsule(c); if (!c) return ''; var k = window.SOVE_KB && window.SOVE_KB.capsule && window.SOVE_KB.capsule(c.id); return (k && k.name) || c.name || ''; }

  /* ---------- «Выгодные» на общей витрине: разделы по кругу ---------- */
  /* по кругу: первый из каждого ряда, потом второй и т. д. */
  function rotate(lists) {
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      lists.forEach(function (l) { if (i < l.length) { out.push(l[i]); more = true; } });
      i++;
    }
    return out;
  }
  /* внутри раздела бренды чередуются: иначе подряд шли бы восемь одинаковых светильников одного бренда */
  function brandMix(items) {
    var by = {}, order = [];
    items.forEach(function (p) { var k = p.brand || ''; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(p); });
    return rotate(order.map(function (k) { return by[k]; }));
  }
  /* круг по разделам — только общая витрина. Выбрал раздел, фильтр или ищет — выбор уже сузил сам: тогда «Выгодные»
     идут одним запросом (сервер сам чередует бренды), без восьми запросов и пустых подразделов */
  function mixed() { return st.sort === 'best' && !st.q && !st.sub && !st.capsule && !st.promo && !st.brand && !st.sale && !st.cats.length && !st.discount && !st.min && !st.max; }
  /* разделы витрины по кругу: свет, мебель, обои, керамогранит… (у живого каталога обои и керамогранит — подразделы Отделки) */
  var MIX = [['Освещение'], ['Мебель покупная'], ['Отделка', 'Обои'], ['Отделка', 'Керамогранит'], ['Сантехника'], ['Декор'],
             ['Отделка', 'Напольные покрытия'], ['Техника']];

  /* ---------- источник: примеры из data.js ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  var hay = {};
  D.products.forEach(function (p) {
    hay[p.id] = norm([p.name, p.brand, p.category, p.subcat].concat((p.capsules || []).map(function (id) { var c = D.capsule(id); return c ? c.code : ''; })).join(' '));
  });
  function match(p, skipCats) {
    if (st.q) { var words = norm(st.q).split(/\s+/).filter(Boolean); for (var i = 0; i < words.length; i++) if (hay[p.id].indexOf(words[i]) < 0) return false; }
    if (!skipCats && st.cats.length && st.cats.indexOf(p.category) < 0) return false;
    if (st.sub && p.subcat !== st.sub) return false;
    if (st.capsule && (p.capsules || []).indexOf(st.capsule) < 0) return false;
    if (st.discount && p.discount < st.discount) return false;
    if (st.promo && !D.isPromo(p.id)) return false;
    if (!priceBad()) { if (st.min && p.metod < st.min) return false; if (st.max && p.metod > st.max) return false; }
    return true;
  }
  /* в общей выдаче — товары с фото на белом фоне и отделка (у неё фото и есть фактура); вещи из рендеров видны внутри интерьера */
  function pool() { return D.products.filter(function (p) { return p.white || p.category === 'Отделка' || st.capsule; }); }
  function zoom(p) { var b = p.box || [0.8, 0.8]; return Math.min(1.5, 0.96 / b[0], Math.max(1, 0.72 / b[1])).toFixed(2); }
  var localSrc = {
    query: function (page) {
      var items = pool().filter(function (p) { return match(p); }).sort(SORTS[st.sort]);
      if (mixed()) {
        /* в образце data.js разделы — категории, а при одной выбранной — подкатегории */
        var key = st.cats.length === 1 ? 'subcat' : 'category', by = {}, order = [];
        items.forEach(function (p) { var k = p[key] || ''; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(p); });
        items = rotate(order.map(function (k) { return brandMix(by[k]); }));
      }
      var from = items.length ? Math.min.apply(null, items.map(function (p) { return p.metod; })) : 0;
      return Promise.resolve({ total: items.length, items: items.slice(0, page * PAGE), from: from, more: page * PAGE < items.length });
    },
    categories: function () {
      return Promise.resolve(D.categories.map(function (c) {
        var keep = st.sub; st.sub = '';
        var n = pool().filter(function (p) { return p.category === c && match(p, true); }).length; st.sub = keep;
        return { name: c, count: n };
      }).filter(function (c) { return c.count || st.cats.indexOf(c.name) >= 0; }));
    },
    countWith: function (over) {
      var keep = { capsule: st.capsule, discount: st.discount };
      if ('capsule' in over) st.capsule = over.capsule; if ('discount' in over) st.discount = over.discount;
      var n = pool().filter(function (p) { return match(p); }).length;
      st.capsule = keep.capsule; st.discount = keep.discount;
      return n;
    },
    subs: function () {
      var keep = st.sub; st.sub = '';
      var items = pool().filter(function (p) { return match(p); }); st.sub = keep;
      var seen = {}, list = [];
      items.forEach(function (p) { if (!p.white) return; if (!seen[p.subcat]) { seen[p.subcat] = { name: p.subcat, img: p.img, z: zoom(p) }; list.push(seen[p.subcat]); } });
      return Promise.resolve(list);
    },
    more: function (items) {
      if (!(st.sub && items.length && items.length < 8)) return [];
      var cat = items[0].category, had = {};
      return pool().filter(function (p) { return p.white && p.category === cat && p.subcat !== st.sub; }).filter(function (p) { if (had[p.subcat]) return false; had[p.subcat] = 1; return true; }).slice(0, 4);
    }
  };

  /* ---------- источник: живой каталог ---------- */
  var facetsCache = {}, subsCache = {};
  function liveParams() {
    /* sort=best сервер, ещё не знающий «Выгодных», понимает как обычный порядок — витрина не ломается */
    var p = { q: st.q || undefined, sort: st.sort, page_size: PAGE };
    if (st.sub) p.ptype = st.sub;
    if (st.capsule) p.capsule_id = capCode();
    if (st.discount) p.discount_min = st.discount;
    else if (st.sale) p.discount_min = 1;             /* из баннера акции: только товары со скидкой */
    if (st.brand) p.brand = st.brand;
    if (!priceBad()) { if (st.min) p.price_min = st.min; if (st.max) p.price_max = st.max; }
    return p;
  }
  /* «Выгодные» на общей витрине живого каталога: по запросу на ряд (раздел или подраздел), в каждом ряду бренды
     чередуются, ряды идут по кругу. Только общая витрина без фильтров (mixed()) — восемь рядов MIX */
  function mixSlots() { return Promise.resolve(MIX); }
  /* ряд не ответил за 9 с (холодный кэш каталога) — витрина показывается без него, а не падает целиком */
  function slotSearch(p) {
    var none = { total: 0, items: [], failed: true };
    return new Promise(function (ok) {
      var t = setTimeout(function () { ok(none); }, 9000);
      S.catalog.search(p).then(function (r) { clearTimeout(t); ok(r); }, function () { clearTimeout(t); ok(none); });
    });
  }
  function mixQuery(page) {
    return mixSlots().then(function (slots) {
      var per = Math.ceil(PAGE * page / slots.length) + 4;     /* с запасом: часть уйдёт на чередование брендов */
      return Promise.all(slots.map(function (sl) {
        var p = liveParams(); p.category = sl[0]; if (sl[1]) p.ptype = sl[1];
        /* внутри ряда — «Выгодные»: лучшие товары разных брендов («по скидке» ставил наверх восемь LIGHTSTAR подряд) */
        p.sort = 'best';
        p.page_size = per; p.page = 1;
        return slotSearch(p);
      })).then(function (rs) {
        if (rs.every(function (r) { return r.failed; })) throw new Error('каталог не ответил');
        var seen = {}, items = rotate(rs.map(function (r) { return brandMix(r.items); })).filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return true; });
        var total = rs.reduce(function (a, r) { return a + (r.total || 0); }, 0);
        var more = rs.some(function (r) { return r.items.length < r.total; });
        /* в общей витрине счётчик — весь каталог, как было «по скидке», а не только восемь рядов */
        var all = !st.cats.length && !st.discount && !st.min && !st.max;
        var count = all ? (facetsCache['*'] || (facetsCache['*'] = S.catalog.facets({}))).then(function (d) {
          var n = (d.category || []).reduce(function (a, x) { return a + (x.count || 0); }, 0);
          return n || total;
        }, function () { return total; }) : Promise.resolve(total);
        return count.then(function (n) {
          items = items.slice(0, page * PAGE);
          var from = items.length ? Math.min.apply(null, items.map(function (p) { return p.metod; })) : 0;
          return { total: n, items: items, from: from, more: more || items.length < Math.min(n, total) };
        });
      });
    });
  }
  /* «Акции партнёров» (Таня 29.10): сначала плитки категорий таблицы партнёров, внутри — баннеры брендов,
     тап по баннеру → товары бренда со скидкой.
     Бренды: кураторские акции реестра (/marketplace/brand-promos) + бренды каталога со скидкой от 10 %,
     по каждой категории не больше PROMO_PER_CAT (самые большие скидки). Меньше 20 товаров — не показываем:
     почти всегда совпадение имени с чужим брендом (ASKON в каталоге — программы для инженеров) — тупик.
     DECARO СПБ / DECARO МСК / Decaro — один баннер «DECARO» (SOVE_PARTNERS.canon), «Дивная Ива» и DIVNAYA IVA —
     один партнёр таблицы, баннер один. Та же выборка — в tools/gen_partner_cats.py (banner_keys): по ней качаются логотипы. */
  var PROMO_PER_CAT = 20, promoCache = null;
  function normBrand(b) { return String(b || '').toUpperCase().replace(/Ё/g, 'Е').replace(/[^A-ZА-Я0-9]+/g, ''); }
  function canonBrand(b) { return PARTNERS ? PARTNERS.canon(b) : String(b || '').trim(); }
  function pctLabel(s) { var m = /(\d+)/.exec(String(s || '')); return m ? '−' + m[1] + ' %' : ''; }
  function promoBanners() {
    if (promoCache) return promoCache;
    promoCache = Promise.all([S.catalog.brandPromos().catch(function () { return []; }), S.catalog.brands()]).then(function (r) {
      var promos = r[0], brands = r[1], byKey = {}, order = [];
      brands.forEach(function (b) {
        var raw = String(b.brand || '').trim(), name = canonBrand(raw), k = normBrand(name); if (!k) return;
        var alias = normBrand(raw) !== k, x = byKey[k];
        if (!x) { x = byKey[k] = { brand: name, key: k, count: b.count || 0, max: b.max_discount || 0, merged: alias }; order.push(x); return; }
        /* склейка вариантов одного бренда (DECARO СПБ + DECARO + Decaro): товары суммируем, скидка — наибольшая.
           Прочие совпадения по норме — как раньше: первый (самый крупный) вариант */
        if (alias || x.merged) { x.count += b.count || 0; x.max = Math.max(x.max, b.max_discount || 0); x.merged = true; }
      });
      function tbl(x) { return PARTNERS ? PARTNERS.brand(x.brand) : null; }
      function catKey(x, text) { var t = tbl(x); return (t && t.cat) || (PARTNERS && PARTNERS.catOf(text)) || 'other'; }
      function one(x) { return PARTNERS ? PARTNERS.key(x.brand) : x.key; }
      var out = [], seen = {}, per = {};
      function push(x, cat, label, until, curated) {
        var t = tbl(x);
        seen[one(x)] = 1; per[cat] = (per[cat] || 0) + 1;
        out.push({ brand: x.brand, label: label, until: until || '', cat: cat, count: x.count, max: x.max, logo: (t && t.logo) || '', curated: curated });
      }
      promos.forEach(function (p) {
        var x = byKey[normBrand(canonBrand(p.brand))];
        if (!x || seen[one(x)] || x.count < 20) return;
        push(x, catKey(x, p.category), pctLabel(p.discount_label) || (x.max ? 'до −' + x.max + ' %' : ''), p.deadline, true);
      });
      order.filter(function (x) { return x.max >= 10 && x.count >= 20; })
        .sort(function (a, b) { return b.max - a.max || b.count - a.count; })
        .forEach(function (x) {
          var cat = catKey(x, '');
          if (seen[one(x)] || (per[cat] || 0) >= PROMO_PER_CAT) return;
          push(x, cat, 'до −' + x.max + ' %', '', false);
        });
      return out;
    }).catch(function (e) { promoCache = null; throw e; });
    return promoCache;
  }
  /* группы по категориям таблицы — в её порядке; бренды без категории — в конце, «Другое» */
  function promoGroups(list) {
    var by = {}, out = [];
    list.forEach(function (x) { (by[x.cat] = by[x.cat] || []).push(x); });
    (PARTNERS ? PARTNERS.cats : []).forEach(function (c) { if (by[c.key]) out.push({ key: c.key, title: c.title, items: by[c.key] }); });
    Object.keys(by).forEach(function (k) { if (!out.some(function (g) { return g.key === k; })) out.push({ key: k, title: k === 'other' ? 'Другое' : k, items: by[k] }); });
    out.forEach(function (g) { g.max = Math.max.apply(null, g.items.map(function (x) { return x.max || 0; })); });
    return out;
  }
  function brandsWord(n) { return F.num(n) + ' ' + plural(n, ['бренд', 'бренда', 'брендов']); }
  var PC_ICON = {
    otdelka: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
    svet: '<path d="M12 3v5"/><path d="M5.5 15a6.5 6.5 0 0 1 13 0z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>',
    rozetki: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="12" cy="12" r="4.6"/><path d="M10.4 12h.01M13.6 12h.01" stroke-width="2.2"/>',
    santehnika: '<path d="M4 10h8.5a4.5 4.5 0 0 1 4.5 4.5"/><path d="M8 10V6.5M5 6.5h6"/><path d="M17 21a2 2 0 0 1-2-2c0-1.3 2-3.5 2-3.5s2 2.2 2 3.5a2 2 0 0 1-2 2z"/>',
    tehnika: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 8h16"/><rect x="7.5" y="11" width="9" height="7" rx="1.2"/><path d="M8 5.5h.01M11 5.5h.01" stroke-width="2"/>',
    mebel: '<path d="M5.5 11V8.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3V11"/><path d="M3 13.5a2 2 0 0 1 4 0V15h10v-1.5a2 2 0 0 1 4 0V18H3z"/><path d="M5 18v2M19 18v2"/>',
    dveri: '<path d="M6.5 21V4.2a1.2 1.2 0 0 1 1.2-1.2h8.6a1.2 1.2 0 0 1 1.2 1.2V21"/><path d="M4 21h16"/><path d="M14.5 12.5h.01" stroke-width="2.2"/>',
    dekor: '<path d="M9.5 3h5M10.5 3v3.2C7.6 7.6 6.5 10 6.5 13c0 4.2 2.4 8 5.5 8s5.5-3.8 5.5-8c0-3-1.1-5.4-4-6.8V3"/>',
    other: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
    all: '<circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="17" r="2.6"/><path d="M19 5 5 19"/>'
  };
  function pcIcon(key) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PC_ICON[key] || PC_ICON.other) + '</svg>'; }
  function pcatHref(key) { return 'market.html?promo=1&pcat=' + encodeURIComponent(key); }
  function pcatTileHTML(g) {
    return '<a class="mk-pcat" data-pc="' + F.esc(g.key) + '" data-pcat="' + F.esc(g.key) + '" href="' + pcatHref(g.key) + '">' +
      '<span class="mk-pcat__ic">' + pcIcon(g.key) + '</span>' +
      (g.max ? '<span class="mk-pcat__off">до −' + g.max + ' %</span>' : '') +
      '<span class="mk-pcat__text"><b class="mk-pcat__name">' + F.esc(g.title) + '</b>' +
      '<span class="mk-pcat__meta">' + brandsWord(g.items.length) + '</span></span></a>';
  }
  function bannerHTML(x) {
    var letter = (x.brand.replace(/[^A-Za-zА-Яа-яЁё0-9]/g, '')[0] || '•').toUpperCase();
    return '<a class="mk-bnr" data-pc="' + F.esc(x.cat) + '" href="market.html?brand=' + encodeURIComponent(x.brand) + '&sale=1" aria-label="' + F.esc(x.brand) + ': скидка ' + F.esc(x.label) + ', ' + F.esc(goods(x.count)) + '">' +
      '<span class="mk-bnr__logo" aria-hidden="true">' + (x.logo
        ? '<img src="' + F.esc(x.logo) + '" alt="" loading="lazy" decoding="async">'
        : '<span class="mk-bnr__letter">' + F.esc(letter) + '</span>') + '</span>' +
      '<span class="mk-bnr__off">' + F.esc(x.label) + '</span>' +
      '<b class="mk-bnr__name">' + F.esc(x.brand) + '</b>' +
      '<span class="mk-bnr__meta">' + F.esc(goods(x.count)) + (x.until ? ' · до ' + F.esc(x.until) : '') + '</span>' +
      '</a>';
  }
  /* выбор категории акций — отдельный шаг истории: «Назад» браузера возвращает к плиткам */
  function openPcat(key) {
    if (key === st.pcat) return;
    var from = st.pcat;
    st.pcat = key;
    try { if (key && !from) history.pushState({ mkPcat: 1 }, '', location.pathname + query()); } catch (e) { /* file:// */ }
    apply();
    var top = (tabsEl || listEl).getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
  }
  function closePcat() {
    if (history.state && history.state.mkPcat) { history.back(); return; }
    st.pcat = ''; apply();
  }
  var liveSrc = {
    query: function (page) {
      if (st.promo) return promoBanners().then(function (list) { return { total: list.length, items: [], banners: list, from: 0, more: false }; });
      if (false) {
        return S.catalog.deals(48).then(function (items) {
          if (st.sort !== 'discount') items = items.slice().sort(SORTS[st.sort]);
          return { total: items.length, items: items.slice(0, page * PAGE), from: items.length ? Math.min.apply(null, items.map(function (p) { return p.metod; })) : 0, more: page * PAGE < items.length };
        });
      }
      if (mixed()) return mixQuery(page);
      var cats = st.cats.length ? st.cats : [''];
      /* капсула + скидка: сервер на такой запрос не отвечает, поэтому скидку отбираем на странице по всей капсуле */
      var capDisc = !!(st.capsule && st.discount);
      /* несколько разделов сразу: по запросу на раздел, склейка и сортировка на странице */
      return Promise.all(cats.map(function (c) {
        var p = liveParams(); if (c) p.category = c;
        if (capDisc) { delete p.discount_min; p.page_size = 300; } else { p.page_size = PAGE * page; }
        p.page = 1;
        return S.catalog.search(p);
      })).then(function (rs) {
        var items = [], total = 0, seen = {};
        rs.forEach(function (r) { total += r.total; r.items.forEach(function (p) { if (!seen[p.id]) { seen[p.id] = 1; items.push(p); } }); });
        if (capDisc) { items = items.filter(function (p) { return p.discount >= st.discount; }); total = items.length; }
        /* несколько разделов в «Выгодных» — по кругу, как на витрине; иначе общая сортировка */
        if (rs.length > 1 && st.sort === 'best' && !capDisc) { var seen2 = {}; items = rotate(rs.map(function (r) { return brandMix(r.items); })).filter(function (p) { if (seen2[p.id]) return false; seen2[p.id] = 1; return true; }); }
        else if (rs.length > 1 || capDisc) items.sort(SORTS[st.sort]);
        items = items.slice(0, page * PAGE);
        var from = items.length ? Math.min.apply(null, items.map(function (p) { return p.metod; })) : 0;
        return { total: total, items: items, from: from, more: items.length < total };
      });
    },
    categories: function () {
      var key = capCode() || '*';
      var f = facetsCache[key] || (facetsCache[key] = S.catalog.facets(st.capsule ? { capsule_id: capCode() } : {}));
      return f.then(function (d) {
        var flat = (d.category || []).map(function (x) { return { name: x.value, count: x.count }; });
        if (PARTNERS) return partnerTree(flat);
        return flat.filter(function (c) { return c.count || st.cats.indexOf(c.name) >= 0; });
      });
    },
    countWith: function () { return 1; },
    subs: function () {
      if (st.cats.length !== 1 || st.capsule || st.promo) return Promise.resolve([]);
      var c = st.cats[0];
      var p = subsCache[c] || (subsCache[c] = S.catalog.subtypes(c));
      return p.then(function (items) { return items.map(function (x) { return { name: x.label, count: x.count }; }); });
    },
    more: function () { return []; }
  };
  var src = LIVE ? liveSrc : localSrc;

  /* дерево «Категория»: категории таблицы партнёров (её порядок) со счётчиками разделов каталога,
     внутри — подкатегории таблицы, у которых в каталоге есть подтип с товарами (/marketplace/subtypes) */
  var subsReady = {};    /* раздел API → [{label, count}] — когда подтипы пришли */
  function partnerTree(flat) {
    var counts = {}, used = {}, out = [];
    flat.forEach(function (x) { counts[x.name] = x.count; });
    PARTNERS.cats.forEach(function (c) {
      var api = P_API[c.key]; if (!api || used[api]) return;
      used[api] = 1;
      if (!counts[api] && st.cats.indexOf(api) < 0) return;
      out.push({ name: api, title: c.title, key: c.key, count: counts[api] || 0, subs: treeSubs(c, api) });
    });
    /* раздел каталога, которого нет в таблице, не теряем — в конце списка, как есть */
    flat.forEach(function (x) { if (!used[x.name] && (x.count || st.cats.indexOf(x.name) >= 0)) out.push({ name: x.name, title: x.name, count: x.count, subs: [] }); });
    return out;
  }
  function treeSubs(c, api) {
    var have = subsReady[api]; if (!have) return [];
    var by = {}, seen = {}, out = [];
    have.forEach(function (x) { by[efold(x.label)] = x; });
    c.subs.forEach(function (s) {
      var x = by[efold(P_PTYPE[s.key] || s.title)];
      if (!x || !x.count || seen[x.label]) return;
      seen[x.label] = 1;
      out.push({ name: x.label, count: x.count });
    });
    return out;
  }
  /* подтипы грузим только когда открыли фильтры (не нагружаем боевой API на каждый показ страницы) и только
     для категорий, где в таблице больше одной подкатегории: у «Освещения» одна — «Свет», это сама категория */
  var treeAsked = false;
  function loadTreeSubs() {
    if (treeAsked || !LIVE || !PARTNERS) return;
    treeAsked = true;
    PARTNERS.cats.forEach(function (c) {
      var api = P_API[c.key]; if (!api || c.subs.length < 2 || subsReady[api]) return;
      var p = subsCache[api] || (subsCache[api] = S.catalog.subtypes(api));
      p.then(function (items) {
        subsReady[api] = items || [];
        catList.forEach(function (x) { if (x.name === api && x.key) x.subs = treeSubs(PARTNERS.cat(x.key), api); });
        syncPanel(deskPanel); if (sheet) syncPanel(sheet.el);
      }, function () { subsCache[api] = null; treeAsked = false; /* не ответил — попробуем при следующем открытии */ });
    });
  }

  /* ---------- панель фильтров (одна разметка для колонки и для окна на телефоне) ---------- */
  var catList = [];   /* [{name, count}] — заполняется источником */
  function filtersHTML(pre) {
    function group(title, inner, id) {
      if (pre === 'mf-d') return '<details class="mfd" data-group="' + id + '"><summary><span id="' + pre + id + '">' + title + '</span><i data-badge></i></summary><div class="mfd__pop" role="group" aria-labelledby="' + pre + id + '">' + inner + '</div></details>';
      return '<div class="mf__group" role="group" aria-labelledby="' + pre + id + '"><span class="mf__title" id="' + pre + id + '">' + title + '</span>' + inner + '</div>';
    }
    return '<div class="mf">' +
      group('Интерьер', '<div class="mf__chips">' + CAPS.map(function (c) { return '<button type="button" class="chip" data-capsule="' + c.id + '" aria-pressed="false" title="' + F.esc(c.name) + '">' + F.esc(capLabel(c)) + '</button>'; }).join('') + '</div>', '-cap') +
      group('Категория', '<div class="mf__checks" data-cats></div>', '-cat') +
      group('Цена METOD, ₽', '<div class="mf__price" data-price>' +
        '<div class="field"><label for="' + pre + '-min">от</label><input class="input" id="' + pre + '-min" data-min type="text" inputmode="numeric" autocomplete="off" placeholder="' + F.num(PRICE_MIN) + '"></div>' +
        '<div class="field"><label for="' + pre + '-max">до</label><input class="input" id="' + pre + '-max" data-max type="text" inputmode="numeric" autocomplete="off" placeholder="' + F.num(PRICE_MAX) + '"></div>' +
        '</div><p class="field__error" data-price-error hidden>Цена «от» больше цены «до» — поправьте одно из значений. Пока фильтр по цене не применён.</p>', '-price') +
      group('Скидка', '<div class="mf__chips">' + DISCOUNTS.map(function (d) { return '<button type="button" class="chip" data-discount="' + d + '" aria-pressed="false">от ' + d + ' %</button>'; }).join('') + '</div>', '-disc') +
      '</div>';
  }
  /* раскрыта ли категория в дереве: тап по стрелке — запоминаем; иначе раскрыта выбранная */
  var openCats = {};
  function catOpen(c) { return openCats[c.name] != null ? openCats[c.name] : st.cats.indexOf(c.name) >= 0; }
  var CHEV = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg>';
  function treeHTML(pre) {
    /* у строк без подкатегорий — пустое место под стрелку, чтобы счётчики стояли в одну колонку */
    var anyExp = catList.some(function (c) { return c.subs && c.subs.length; });
    return catList.map(function (c, i) {
      var on = st.cats.indexOf(c.name) >= 0, off = !c.count && !on, subs = c.subs || [], open = subs.length && catOpen(c);
      var id = pre + '-cat-' + i;
      return '<div class="mf__node' + (open ? ' is-open' : '') + '">' +
        '<div class="mf__row"><label class="check mf__check' + (off ? ' is-off' : '') + '" for="' + id + '"><input type="checkbox" id="' + id + '" data-cat="' + F.esc(c.name) + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="check__box">' + TICK + '</span><span class="check__label">' + F.esc(c.title || c.name) + '</span><span class="check__count" data-count>' + F.num(c.count) + '</span></label>' +
        (subs.length ? '<button type="button" class="mf__exp" data-pexp="' + F.esc(c.name) + '" aria-expanded="' + !!open + '" aria-controls="' + id + '-subs" aria-label="' + (open ? 'Свернуть' : 'Подкатегории') + ': ' + F.esc(c.title || c.name) + '">' + CHEV + '</button>' : (anyExp ? '<span class="mf__exp mf__exp--none" aria-hidden="true"></span>' : '')) + '</div>' +
        (subs.length ? '<div class="mf__subs" id="' + id + '-subs" role="group" aria-label="Подкатегории: ' + F.esc(c.title || c.name) + '"' + (open ? '' : ' hidden') + '>' + subs.map(function (s) {
          var act = on && st.sub === s.name;
          return '<button type="button" class="mf__sub' + (act ? ' is-active' : '') + '" data-psub="' + F.esc(s.name) + '" data-pcat="' + F.esc(c.name) + '" aria-pressed="' + act + '">' + F.esc(s.name) + ' <i>' + F.num(s.count) + '</i></button>';
        }).join('') + '</div>' : '') +
        '</div>';
    }).join('');
  }
  function catsHTML(pre) {
    if (PARTNERS && LIVE) return treeHTML(pre);
    return catList.map(function (c, i) {
      var on = st.cats.indexOf(c.name) >= 0, off = !c.count && !on;
      return '<label class="check mf__check' + (off ? ' is-off' : '') + '" for="' + pre + '-cat-' + i + '"><input type="checkbox" id="' + pre + '-cat-' + i + '" data-cat="' + F.esc(c.name) + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="check__box">' + TICK + '</span><span class="check__label">' + F.esc(c.name) + '</span><span class="check__count" data-count>' + F.num(c.count) + '</span></label>';
    }).join('');
  }
  function arrange(root) {
    var mf = root.querySelector('.mf'); if (!mf || mf.getAttribute('data-arranged')) return;
    var g = Array.prototype.slice.call(mf.children), kinds = ['cap', 'cat', 'price', 'disc'];
    g.forEach(function (el, i) { el.setAttribute('data-kind', kinds[i]); });
    [g[2], g[3], g[1], g[0]].forEach(function (el) { mf.appendChild(el); });
    mf.setAttribute('data-arranged', '1');
  }
  function syncPanel(root) {
    if (!root) return;
    arrange(root);
    var pre = root === deskPanel ? 'mf-d' : 'mf-m';
    /* в дереве партнёров подкатегория видна внутри «Категории» — группу не прячем */
    var catG = root.querySelector('[data-kind="cat"]'); if (catG) catG.hidden = !!st.sub && !(PARTNERS && LIVE);
    var box = root.querySelector('[data-cats]'); if (box) box.innerHTML = catsHTML(pre);
    root.querySelectorAll('[data-discount]').forEach(function (b) { var d = Number(b.getAttribute('data-discount')), n = src.countWith({ discount: d }); b.disabled = !n && st.discount !== d; b.classList.toggle('is-off', !n && st.discount !== d); });
    root.querySelectorAll('[data-capsule]').forEach(function (b) { var id = b.getAttribute('data-capsule'), n = src.countWith({ capsule: id }); b.disabled = !n && st.capsule !== id; b.classList.toggle('is-off', !n && st.capsule !== id); });
    root.querySelectorAll('[data-capsule]').forEach(function (b) { var on = b.getAttribute('data-capsule') === st.capsule; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    root.querySelectorAll('[data-discount]').forEach(function (b) { var on = Number(b.getAttribute('data-discount')) === st.discount; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    var marks = { cap: st.capsule ? 1 : 0, cat: st.cats.length, price: ((st.min || st.max) && !priceBad()) ? 1 : 0, disc: st.discount ? 1 : 0 };
    root.querySelectorAll('details[data-group]').forEach(function (d) { var m = marks[d.getAttribute('data-kind')] || 0; d.classList.toggle('is-on', !!m); d.querySelector('[data-badge]').textContent = m ? String(m) : ''; });
    var mn = root.querySelector('[data-min]'), mx = root.querySelector('[data-max]');
    if (document.activeElement !== mn) mn.value = st.min ? F.num(st.min) : '';
    if (document.activeElement !== mx) mx.value = st.max ? F.num(st.max) : '';
    root.querySelector('[data-price]').classList.toggle('is-error', !!priceBad());
    root.querySelector('[data-price-error]').hidden = !priceBad();
  }
  var priceTimer = null;
  function bindPanel(root) {
    root.addEventListener('click', function (e) {
      var cap = e.target.closest('[data-capsule]'), disc = e.target.closest('[data-discount]');
      if (cap) { var id = cap.getAttribute('data-capsule'); st.capsule = st.capsule === id ? '' : id; st.sub = ''; apply(); }
      if (disc) { var d = Number(disc.getAttribute('data-discount')); st.discount = st.discount === d ? 0 : d; apply(); }
      /* дерево категорий: стрелка раскрывает подкатегории, подкатегория — раздел + подтип каталога (?category=&sub=) */
      var exp = e.target.closest('[data-pexp]');
      if (exp) {
        var nm = exp.getAttribute('data-pexp'), node = exp.closest('.mf__node'), c = catList.filter(function (x) { return x.name === nm; })[0];
        if (!c) return;
        openCats[nm] = !catOpen(c);
        var box = node && node.querySelector('.mf__subs');
        if (box) box.hidden = !openCats[nm];
        if (node) node.classList.toggle('is-open', openCats[nm]);
        exp.setAttribute('aria-expanded', String(openCats[nm]));
        exp.setAttribute('aria-label', (openCats[nm] ? 'Свернуть' : 'Подкатегории') + ': ' + (c.title || c.name));
        return;
      }
      var ps = e.target.closest('[data-psub]');
      if (ps) {
        var sub = ps.getAttribute('data-psub'), pc = ps.getAttribute('data-pcat');
        if (st.sub === sub && st.cats.length === 1 && st.cats[0] === pc) st.sub = '';
        else { st.cats = [pc]; st.sub = sub; openCats[pc] = true; }
        apply();
      }
    });
    root.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-cat]'); if (!inp) return;
      var cat = inp.getAttribute('data-cat'), i = st.cats.indexOf(cat);
      if (inp.checked && i < 0) st.cats.push(cat); if (!inp.checked && i >= 0) st.cats.splice(i, 1);
      if (inp.checked) delete openCats[cat];   /* выбрал категорию — подкатегории раскрываются сами */
      st.sub = '';
      apply();
    });
    function price(e) {
      var mn = e.target.closest('[data-min]'), mx = e.target.closest('[data-max]'); if (!mn && !mx) return;
      if (mn) st.min = toInt(mn.value); else st.max = toInt(mx.value);
      clearTimeout(priceTimer); priceTimer = setTimeout(apply, e.type === 'input' ? 400 : 0);
    }
    root.addEventListener('input', price);
    root.addEventListener('focusout', function (e) { if (e.target.closest('[data-min], [data-max]')) { price(e); setTimeout(function () { syncPanel(root); }, 10); } });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-min], [data-max]')) e.target.blur(); });
  }

  /* ---------- лента разделов, заголовок и витрина выбранного раздела ---------- */
  var subsEl = $('market-subs'), titleEl = $('market-title'), heroEl = $('market-hero'), moreEl = $('market-more');
  /* вкладка «Акции партнёров»: тот же каталог, но только платные позиции */
  var tabsEl = $('market-tabs');
  function renderTabs() {
    if (!tabsEl) return;
    var btns = tabsEl.querySelectorAll('[data-tab]');
    for (var i = 0; i < btns.length; i++) {
      var on = (btns[i].getAttribute('data-tab') === 'promo') === !!st.promo;
      btns[i].classList.toggle('is-on', on);
      btns[i].setAttribute('aria-pressed', String(on));
    }
  }
  if (tabsEl) tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    var want = b.getAttribute('data-tab') === 'promo';
    if (want === st.promo) { if (want && st.pcat) closePcat(); return; }   /* повторный тап по «Акциям» — к плиткам */
    st.promo = want; st.pcat = ''; apply();
  });
  var subsReq = 0;
  function renderSubs() {
    renderTabs();
    if (!subsEl) return;
    var my = ++subsReq;
    src.subs().then(function (list) {
      if (my !== subsReq) return;
      subsEl.hidden = list.length < 2 && !st.sub;      /* прячем саму ленту, а не всю секцию с результатами */
      subsEl.innerHTML = list.map(function (x) {
        var on = x.name === st.sub;
        return '<button type="button" class="rail__item' + (on ? ' is-active' : '') + (x.img ? '' : ' rail__item--text') + '" data-sub="' + F.esc(x.name) + '" aria-pressed="' + on + '">' +
          (x.img ? '<span class="rail__pic"><img src="' + x.img + '" alt="" loading="lazy" style="transform:scale(' + x.z + ')"></span>' : '') +
          '<span class="rail__name">' + F.esc(x.name) + (x.count != null ? ' <i class="muted">' + F.num(x.count) + '</i>' : '') + '</span></button>';
      }).join('');
      var act = subsEl.querySelector('.is-active'); if (act && act.scrollIntoView && subsEl.scrollWidth > subsEl.clientWidth) subsEl.scrollLeft = Math.max(0, act.offsetLeft - subsEl.clientWidth / 2 + 50);
    }).catch(function () { subsEl.hidden = true; });
  }
  if (subsEl) subsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-sub]'); if (!b) return; var v = b.getAttribute('data-sub'); st.sub = st.sub === v ? '' : v; apply(); });
  function pcatName() { if (st.pcat === 'all') return 'Все акции'; if (st.pcat === 'other') return 'Другое'; var c = PARTNERS && PARTNERS.cat(st.pcat); return c ? c.title : ''; }
  function heroName() {
    if (st.promo) return st.pcat ? 'Акции: ' + pcatName() : 'Акции партнёров';
    return st.sub || (st.cats.length === 1 ? catTitle(st.cats[0]) : '') || (st.capsule ? 'Интерьер «' + capLabel(st.capsule) + '»' : '') || (st.brand ? st.brand + (st.sale ? ' · акция' : '') : '');
  }
  function renderHero(res) {
    var name = heroName();
    document.title = (name || 'Каталог') + ' — SOVEAPP';
    if (!loaded || !res) { heroEl.textContent = st.q ? 'Ищем среди миллиона товаров…' : 'Загружаем каталог…'; moreEl.hidden = true; return; }
    if (res.banners) {
      var gs = promoGroups(res.banners), g = st.pcat && st.pcat !== 'all' ? gs.filter(function (x) { return x.key === st.pcat; })[0] : null;
      heroEl.innerHTML = g ? '<b>' + F.esc(g.title) + '</b> · ' + brandsWord(g.items.length) + ' со скидкой'
        : '<b>' + (st.pcat === 'all' ? 'Все акции' : 'Акции партнёров') + '</b> · ' + brandsWord(res.banners.length) +
          (st.pcat ? '' : ' в ' + F.num(gs.length) + ' ' + plural(gs.length, ['разделе', 'разделах', 'разделах']));
      moreEl.hidden = true; return;
    }
    if (!res.total) { heroEl.textContent = name ? F.esc(name) : 'Каталог'; }
    else { heroEl.innerHTML = (name ? '<b>' + F.esc(name) + '</b> · ' : '') + goods(res.total) + (name && res.from ? ' · от ' + F.rub(res.from) : ''); }
    /* когда в разделе мало товаров, страница не должна заканчиваться пустотой */
    var more = src.more(res.items);
    moreEl.hidden = !more.length;
    moreEl.innerHTML = more.length ? '<h2 class="h2">Ещё в разделе «' + F.esc(more[0].category) + '»</h2><div class="grid market-grid">' + more.map(cardHTML).join('') + '</div>' : '';
  }

  /* ---------- активные фильтры ---------- */
  function renderActive() {
    var chips = [];
    function chip(kind, value, text) { chips.push('<button type="button" class="chip" data-drop="' + kind + '" data-value="' + F.esc(value) + '" aria-label="Убрать фильтр: ' + F.esc(text) + '">' + F.esc(text) + ' <span aria-hidden="true">×</span></button>'); }
    if (st.q) chip('q', '', '«' + st.q + '»');
    if (st.capsule) chip('capsule', '', 'Капсула «' + capLabel(st.capsule) + '»');
    st.cats.forEach(function (c) { chip('cat', c, catTitle(c)); });
    if (st.sub) chip('sub', '', st.sub);
    if (st.min || st.max) chip('price', '', st.min && st.max ? F.num(st.min) + ' – ' + F.rub(st.max) : st.min ? 'от ' + F.rub(st.min) : 'до ' + F.rub(st.max));
    if (st.discount) chip('discount', '', 'скидка от ' + st.discount + ' %');
    if (st.brand) chip('brand', '', st.brand);
    if (st.sale && !st.discount) chip('sale', '', 'только со скидкой');
    renderSubs();
    activeEl.hidden = !chips.length;
    activeEl.innerHTML = chips.join('') + (chips.length > 1 ? '<button type="button" class="btn btn--link" data-drop="all">Сбросить всё</button>' : '');
    var n = filtersOn();
    openBtn.innerHTML = '<span>Фильтры' + (n ? ' · <b>' + n + '</b>' : '') + '</span>';
    openBtn.setAttribute('aria-label', n ? 'Фильтры, выбрано: ' + n : 'Фильтры');
    if (resetDesk) resetDesk.hidden = !n;
  }
  function reset(keepSearch) { st.cats = []; st.sub = ''; st.capsule = ''; st.min = st.max = null; st.discount = 0; st.brand = ''; st.sale = false; if (!keepSearch) { st.q = ''; qInput.value = ''; } apply(); }
  activeEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-drop]'); if (!b) return;
    var kind = b.getAttribute('data-drop'), v = b.getAttribute('data-value');
    if (kind === 'all') return reset();
    if (kind === 'q') { st.q = ''; qInput.value = ''; }
    if (kind === 'capsule') st.capsule = '';
    if (kind === 'sub') st.sub = '';
    if (kind === 'cat') { st.cats = st.cats.filter(function (c) { return c !== v; }); st.sub = ''; }
    if (kind === 'price') st.min = st.max = null;
    if (kind === 'discount') st.discount = 0;
    if (kind === 'brand') st.brand = '';
    if (kind === 'sale') st.sale = false;
    apply();
  });
  if (resetDesk) resetDesk.addEventListener('click', function () { reset(true); });

  /* ---------- список ---------- */
  function cardHTML(p) {
    var on = S.auth.isIn() && S.favs.has(p.id);
    return '<div class="market-item">' + S.ui.productCard(p) +
      '<button type="button" class="product-card__fav' + (on ? ' is-on' : '') + '" data-fav="' + p.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Убрать из избранного: ' : 'В избранное: ') + F.esc(p.name) + '">' + HEART + '</button>' +
      (S.repair ? '<button type="button" class="product-card__fav product-card__cart rp-ic--cart' + (S.repair.cart.has(p.id) ? ' is-on' : '') + '" data-rp-cart="' + p.id + '" data-src="market" aria-label="В корзину: ' + F.esc(p.name) + '"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg></button>' : '') + '</div>';
  }
  function setCount(html) { countEl.innerHTML = html; countMobEl.innerHTML = html; }
  /* «Акции партнёров»: без выбора — плитки категорий (+ «Все»); выбрана — баннеры брендов этой категории */
  var PROMO_NOTE = 'Цену METOD поставщик даёт по промокоду из подписки.';
  function renderPromos(list) {
    var n = list.length, gs = promoGroups(list);
    setCount('Акции партнёров: <b>' + F.num(n) + '</b>');
    if (!n) {
      listEl.innerHTML = '<div class="empty"><span class="empty__title">Акций сейчас нет</span><p class="text">Загляните позже или посмотрите весь каталог.</p>' +
        '<div class="row"><button type="button" class="btn btn--dark" data-tab-all>Все товары</button></div></div>';
      return;
    }
    var g = st.pcat && st.pcat !== 'all' ? gs.filter(function (x) { return x.key === st.pcat; })[0] : null;
    if (st.pcat && st.pcat !== 'all' && !g) { st.pcat = ''; writeURL(); }   /* в категории акций больше нет — к плиткам */
    if (!st.pcat) {
      var all = { key: 'all', title: 'Все акции', items: list, max: Math.max.apply(null, gs.map(function (x) { return x.max; })) };
      listEl.innerHTML = '<div class="mk-pz">' +
        '<div class="mk-pcats">' + [all].concat(gs).map(pcatTileHTML).join('') + '</div>' +
        '<p class="mk-promos__note">Выберите раздел — покажем бренды партнёров со скидкой. ' + PROMO_NOTE + '</p></div>';
      return;
    }
    var back = '<div class="mk-pz__head"><button type="button" class="mk-pz__back" data-pback><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Все разделы</button>' +
      '<span class="mk-pz__title" data-pc="' + F.esc(g ? g.key : 'all') + '"><span class="mk-pz__ic">' + pcIcon(g ? g.key : 'all') + '</span>' + F.esc(g ? g.title : 'Все акции') + '</span></div>';
    var body = g
      ? '<div class="mk-bnrs">' + g.items.map(bannerHTML).join('') + '</div>'
      : gs.map(function (x) {
          return '<section class="mk-pz__sec" aria-label="' + F.esc(x.title) + '"><h2 class="mk-pz__h"><a href="' + pcatHref(x.key) + '" data-pcat="' + F.esc(x.key) + '">' + F.esc(x.title) + '</a> <i>' + brandsWord(x.items.length) + '</i></h2>' +
            '<div class="mk-bnrs">' + x.items.map(bannerHTML).join('') + '</div></section>';
        }).join('');
    listEl.innerHTML = '<div class="mk-pz">' + back + body +
      '<p class="mk-promos__note">Нажмите на бренд — покажем его товары со скидкой. ' + PROMO_NOTE + '</p></div>';
  }
  var last = null;   /* последний ответ источника */
  function renderList() {
    if (!loaded) return;
    if (demoError || loadError) {
      setCount('Каталог не загрузился');
      listEl.innerHTML = '<div class="error-screen" role="alert"><span class="eyebrow">Ошибка загрузки</span><span class="empty__title">Каталог не загрузился</span>' +
        '<p class="text">Не получили ответ от сервера. Фильтры и поисковый запрос мы сохранили — попробуйте ещё раз.</p>' +
        '<div class="row"><button type="button" class="btn btn--dark" data-retry>Загрузить ещё раз</button></div></div>';
      return;
    }
    var res = last || { total: 0, items: [], more: false }, n = res.total;
    if (res.banners) { renderPromos(res.banners); return; }
    setCount(plural(n, ['Найден', 'Найдено', 'Найдено']) + ' <b>' + goods(n) + '</b>');
    if (!n) {
      var why = st.q ? 'По запросу «' + F.esc(st.q) + '»' + (filtersOn() ? ' с выбранными фильтрами' : '') + ' товаров нет.' : 'С таким набором фильтров товаров нет.';
      listEl.innerHTML = '<div class="empty"><span class="empty__title">Ничего не нашли</span>' +
        '<p class="text">' + why + ' Уберите часть условий или покажите нам фотографию — подберём похожее.</p>' +
        '<div class="row"><button type="button" class="btn btn--dark" data-reset-all>Сбросить фильтры</button><a class="btn btn--link" href="ai.html?mode=photo">Найти по фото</a></div></div>';
    } else {
      listEl.innerHTML = res.items.map(cardHTML).join('') + (res.more ? '<div class="market-more"><button type="button" class="btn btn--ghost" data-more>Показать ещё ' + goods(Math.min(PAGE, n - res.items.length)) + '</button></div>' : '');
    }
    if (sheet) {
      var main = sheet.el.querySelector('.modal__actions .btn--primary');
      if (main) main.textContent = n ? 'Показать ' + goods(n) : 'Ничего не нашли — показать';
    }
  }
  function syncFavs() {
    var inn = S.auth.isIn();
    listEl.querySelectorAll('[data-fav]').forEach(function (b) {
      var on = inn && S.favs.has(b.getAttribute('data-fav'));
      if (b.classList.contains('is-on') === on) return;
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^[^:]+:/, on ? 'Убрать из избранного:' : 'В избранное:'));
    });
  }
  listEl.addEventListener('click', function (e) {
    if (e.target.closest('[data-tab-all]')) { st.promo = false; st.pcat = ''; apply(); return; }
    var pcl = e.target.closest('[data-pcat]');
    if (pcl && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); openPcat(pcl.getAttribute('data-pcat')); return; }
    if (e.target.closest('[data-pback]')) { closePcat(); return; }
    if (e.target.closest('[data-more]')) { st.page += 1; load(true); return; }
    if (e.target.closest('[data-reset-all]')) return reset();
    if (e.target.closest('[data-retry]')) { demoError = false; loadError = false; apply(); return; }
    var b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault();
    var id = Number(b.getAttribute('data-fav'));
    if (!S.auth.isIn()) {
      var m = S.ui.needAuth('Войдите, чтобы сохранить товар в избранное', here());
      var go = m.el.querySelector('a.btn--primary');
      if (go) go.addEventListener('click', function () { S.draft.set('market.fav', id); });
      return;
    }
    var on = S.favs.toggle(id);
    if (!S.repair) S.ui.toast(on ? 'Добавили в избранное' : 'Убрали из избранного', on ? 'ok' : undefined);
  });
  var skeletonHTML = listEl.innerHTML;
  function showSkeleton() { listEl.setAttribute('aria-busy', 'true'); listEl.innerHTML = skeletonHTML; setCount(st.q ? 'Ищем среди миллиона товаров…' : 'Загружаем каталог…'); }

  /* ---------- METOD в шапке страницы ---------- */
  function renderMetod() {
    metodEl.innerHTML = S.metod.active()
      ? '<span class="badge badge--green">METOD до ' + F.dateLong(S.metod.until()) + '</span>'
      : '';
  }

  /* ---------- загрузка: один живой запрос на изменение, поздние ответы отбрасываются ---------- */
  var reqId = 0;
  function load(append) {
    var my = ++reqId;
    if (!append) { loaded = false; showSkeleton(); renderHero(null); }
    else { var btn = listEl.querySelector('[data-more]'); if (btn) { btn.disabled = true; btn.textContent = 'Загружаем…'; } }
    if (demoError) { loaded = true; listEl.setAttribute('aria-busy', 'false'); renderList(); return; }
    var slow = setTimeout(function () {
      if (my === reqId && !loaded && st.q) setCount('Ищем среди миллиона товаров — первый поиск по новому слову занимает до минуты…');
    }, 4000);
    src.query(st.page).then(function (res) {
      clearTimeout(slow);
      if (my !== reqId) return;
      last = res; loaded = true; loadError = false;
      listEl.setAttribute('aria-busy', 'false');
      renderList(); renderHero(res);
    }).catch(function () {
      clearTimeout(slow);
      if (my !== reqId) return;
      loaded = true; loadError = true; listEl.setAttribute('aria-busy', 'false'); renderList(); renderHero(null);
    });
    src.categories().then(function (list) {
      if (my !== reqId) return;
      catList = list; syncPanel(deskPanel); if (sheet) syncPanel(sheet.el);
    }).catch(function () { /* без счётчиков категорий страница всё равно работает */ });
  }

  /* ---------- применить изменения ---------- */
  function apply() {
    st.page = 1;
    writeURL();
    qClear.hidden = !qInput.value;
    sortEl.value = st.sort;
    syncPanel(deskPanel); if (sheet) syncPanel(sheet.el);
    renderActive(); renderMetod();
    load(false);
  }

  /* поиск */
  var qTimer = null;
  qInput.addEventListener('input', function () { qClear.hidden = !qInput.value; clearTimeout(qTimer); qTimer = setTimeout(function () { st.q = qInput.value.trim().slice(0, 80); apply(); }, LIVE ? 350 : 160); });
  qClear.addEventListener('click', function () { qInput.value = ''; st.q = ''; apply(); qInput.focus(); });
  $('market-search').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(qTimer); st.q = qInput.value.trim().slice(0, 80); apply(); qInput.blur(); });
  sortEl.addEventListener('change', function () { st.sort = SORTS[sortEl.value] ? sortEl.value : 'best'; apply(); });

  /* фильтры на телефоне — в окне */
  openBtn.addEventListener('click', function () {
    sheet = S.ui.modal({ eyebrow: 'Каталог', title: 'Фильтры', html: filtersHTML('mf-m'),
      actions: [ { label: 'Показать', kind: 'primary', onClick: function () { setTimeout(function () { var top = listEl.getBoundingClientRect().top + window.scrollY - 130; if (window.scrollY < top) window.scrollTo({ top: top, behavior: 'smooth' }); }, 50); } }, { label: 'Сбросить', kind: 'link', close: false, onClick: function () { reset(true); } } ],
      onClose: function () { sheet = null; } });
    sheet.el.classList.add('market-sheet');
    bindPanel(sheet.el); syncPanel(sheet.el); renderList();
    loadTreeSubs();
    var first = sheet.el.querySelector('.modal__close'); if (first) first.focus();
  });

  /* окошки фильтров: открыто одно, закрываются кликом мимо и клавишей Esc */
  deskPanel.addEventListener('toggle', function (e) { if (e.target.open) { loadTreeSubs(); deskPanel.querySelectorAll('details[open]').forEach(function (d) { if (d !== e.target) d.open = false; }); } }, true);
  document.addEventListener('click', function (e) { if (!e.target.closest('.mfd')) deskPanel.querySelectorAll('details[open]').forEach(function (d) { d.open = false; }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') deskPanel.querySelectorAll('details[open]').forEach(function (d) { d.open = false; d.querySelector('summary').focus(); }); });

  /* ---------- старт ---------- */
  readURL();
  qInput.value = st.q;
  deskPanel.innerHTML = filtersHTML('mf-d');
  bindPanel(deskPanel);
  apply();

  /* сердечко, нажатое до входа: после возврата доводим действие до конца */
  var pending = S.draft.get('market.fav');
  if (pending) {
    S.draft.clear('market.fav');
    if (S.auth.isIn() && !S.favs.has(pending)) { S.favs.toggle(pending); S.ui.toast('Вы вошли. Товар добавлен в избранное', 'ok'); }
  }

  S.onChange(function () { syncFavs(); renderMetod(); });
  window.addEventListener('popstate', function () { readURL(); qInput.value = st.q; apply(); });
})();

/* кнопка «наверх»: появляется после двух экранов прокрутки */
(function () {
  var b = document.createElement('button'); b.type = 'button'; b.className = 'totop'; b.setAttribute('aria-label', 'Наверх'); b.hidden = true;
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(b);
  b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  window.addEventListener('scroll', function () { b.hidden = window.scrollY < window.innerHeight * 1.5; }, { passive: true });

  /* подсказки в строке поиска каталога */
  (function () {
    var el = document.getElementById('market-q');
    if (el && window.SOVE && SOVE.ui && SOVE.ui.suggest) SOVE.ui.suggest(el);
  })();
})();
