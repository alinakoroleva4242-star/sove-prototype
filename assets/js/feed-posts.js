/* Лента «Метод ремонта» — посты закрытого канала METOD в виде данных (созвон 28.10.2026, Алина и Таня; замечания Тани 29.10).
   Три типа: promo — акции партнёров (товары из data.js, D.promo), pick — подборки дизайнера к концепции
   (каждый товар — своя плашка с фото предмета на белом: assets/img/feed/items/<pid>.jpg, 600×600), concept — концепции
   (доска материалов assets/img/feed/concept-NN.jpg + рендеры kb/concept-refs.js → карусель в ленте).
   Четвёртый тип команда ещё не назвала — место под него есть.
   Поле access: 'open' — виден всем, 'metod' — только по подписке (без неё размыт). Открыто = контент недели (WEEK ниже):
   1 самая новая концепция + 6 самых новых подборок + 2 самые новые акции, остальное — по подписке.
   Товары подборок в каталоге data.js отсутствуют — feed.js регистрирует их через SOVE.repair.registerProduct,
   чтобы ♡ и 🛒 работали; id числовые: 90 + номер концепции + номер категории + номер товара.
   Товары с маркетплейсов (OZON, ALIEXPRESS, WILDBERRIES, ЯНДЕКС МАРКЕТ — не партнёры) в каталог не регистрируются:
   у них одна кнопка «Перейти в магазин» (поле url); подборки с такими товарами — в конце списка подборок (rank).
   Подключать после data.js и kb/concepts.js (эталонные концепции 28–81). В бою всё это приходит из канала / панели управления. */
(function () {
  var D = window.SOVE_DATA || {};
  var IMG = 'assets/img/feed/';
  var DAY = 864e5, NOW = Date.now();
  function ago(days, hour) { var d = new Date(NOW - days * DAY); d.setHours(hour || 11, 0, 0, 0); return d.getTime(); }
  function on(date, hour) { return Date.parse(date + 'T' + ('0' + (hour || 11)).slice(-2) + ':00:00'); }   /* фиксированная дата поста: концепции не «плывут» относительно сегодня */
  var DESIGNER = 'Дизайнер SOVEAPP';

  /* ---------- акции: группируем продвигаемые товары D.promo по бренду, добираем товары того же бренда со скидкой ---------- */
  function promoPosts() {
    var list = (D.promoList ? D.promoList() : []).filter(Boolean), byBrand = {}, brands = [];
    list.forEach(function (p) { if (!byBrand[p.brand]) { byBrand[p.brand] = []; brands.push(p.brand); } byBrand[p.brand].push(p); });
    brands.sort(function (a, b) { return byBrand[b].length - byBrand[a].length; });
    var untilNum = function (s) { var m = /^(\d\d)\.(\d\d)$/.exec(s || ''); return m ? Number(m[2]) * 100 + Number(m[1]) : 0; };
    var NOTE = {
      0: 'Партнёр открыл цены METOD на витрину сезона: мебель для гостиной и столовой. Скидка действует на весь ассортимент бренда в каталоге SOVEAPP, промокод — в карточке товара.',
      1: 'Мягкая мебель и кровати по цене подписки. Доставка по Москве и области, сроки — в карточке. Покупаете через SOVEAPP — цена фиксируется на день заказа.',
      2: 'Кресла и небольшие предметы для гостиной со скидкой партнёра. Хороший повод закрыть «мелочи» в спецификации до конца месяца.'
    };
    return brands.slice(0, 3).map(function (brand, i) {
      var items = byBrand[brand].slice();
      if (items.length < 3) D.products.filter(function (p) { return p.brand === brand && p.img && p.white && p.discount >= 10 && items.indexOf(p) < 0; }).slice(0, 3 - items.length).forEach(function (p) { items.push(p); });
      var until = byBrand[brand].map(function (p) { return (D.promo[p.id] || {}).until; }).filter(Boolean).sort(function (a, b) { return untilNum(b) - untilNum(a); })[0] || '';
      var disc = Math.max.apply(null, items.map(function (p) { return p.discount || 0; }));
      return {
        id: 'promo-' + brand.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-'), type: 'promo', ts: ago([0, 3, 7][i], 10),
        title: brand, brand: brand, discount: disc, until: until,
        text: NOTE[i] || '', images: items.map(function (p) { return p.img; }), author: brand, access: i === 0 ? 'open' : 'metod',
        items: items.map(function (p) { return { pid: p.id, name: p.name, brand: p.brand, price: p.metod, old: p.retail, img: p.img, category: p.subcat || p.category, local: true }; })
      };
    });
  }

  /* ---------- подборки дизайнера к концепциям 79 и 80: названия, магазины и цены — со страниц подборок; фото предмета — items/<pid>.jpg ----------
     Маркетплейсы — не партнёры: вместо ♡ / 🛒 / «Найти в каталоге» одна кнопка «Перейти в магазин» (url).
     ЗАГЛУШКА до ссылок от Дианы: прямых ссылок на товар в данных нет — ведём на поиск магазина по названию товара. */
  var MARKETPLACE = {
    'OZON': function (q) { return 'https://www.ozon.ru/search/?text=' + encodeURIComponent(q); },
    'ALIEXPRESS': function (q) { return 'https://aliexpress.ru/wholesale?SearchText=' + encodeURIComponent(q); },
    'WILDBERRIES': function (q) { return 'https://www.wildberries.ru/catalog/0/search.aspx?search=' + encodeURIComponent(q); },
    'ЯНДЕКС МАРКЕТ': function (q) { return 'https://market.yandex.ru/search?text=' + encodeURIComponent(q); }
  };
  function pick(o) {
    var items = o.items.map(function (x, i) {
      var pid = Number('90' + o.n + ('0' + o.k).slice(-2) + (i + 1)), shop = String(x.shop || '').toUpperCase(), mp = MARKETPLACE[shop];
      var it = { pid: pid, name: x.name, brand: x.shop, price: x.price, old: x.old || x.price, img: IMG + 'items/' + pid + '.jpg', category: o.cat };
      if (mp) { it.marketplace = true; it.url = x.url || mp(x.name); }
      return it;
    });
    return {
      id: 'pick-' + o.n + '-' + o.k, type: 'pick', ts: o.ts, title: o.cat + ' к концепции ' + o.n, category: o.cat, concept: o.n,
      text: o.text, images: items.map(function (x) { return x.img; }), author: DESIGNER, access: 'metod',
      marketplace: items.some(function (x) { return x.marketplace; }), items: items
    };
  }
  var PICKS = [
    pick({ n: 80, k: 1, cat: 'Стулья', ts: ago(1, 12),
      text: 'Концепция 80 — цветная эклектика: синие стены, красные и розовые акценты, графика. Стулья берём контрастные: букле на чёрном каркасе и мягкий велюр «пыльная роза», чтобы столовая не спорила с гостиной.',
      items: [
        { name: 'Стул Тингл Букле Светло-Серый/Чёрный', shop: 'DIVAN.RU', price: 12340, old: 12990 },
        { name: 'Pompadour: обеденный стул, мягкая конструкция, без подлокотников, велюр, пыльная роза', shop: 'INMYROOM', price: 16647, old: 17900 }
      ] }),
    pick({ n: 79, k: 2, cat: 'Диваны', ts: ago(4, 13),
      text: 'Концепция 79 — современная классика: молдинги, тёмное дерево, латунь. Диван — зелёный велюр или шенилл: он держит композицию гостиной и дружит с латунными светильниками.',
      items: [
        { name: 'Amsterdam: трёхместный прямой диван, велюр зелёного цвета, высокие металлические ножки, 206×95×85 см', shop: 'INMYROOM', price: 92907, old: 99900 },
        { name: 'Диван Barcelona 2-местный 943459, 225×110×82 см', shop: 'ОГОГО', price: 128763, old: 135540 }
      ] }),
    pick({ n: 80, k: 4, cat: 'Ковры', ts: ago(6, 9),
      text: 'Ковры к концепции 80: в детскую — мягкая шахматка в приглушённых тонах, в гостиную — крупный графичный рисунок, который собирает цвета стен и мебели.',
      items: [
        { name: 'Ковёр детский с шахматным принтом Soft Hugs', shop: 'LOFT CONCEPT', price: 11920, old: 14900 },
        { name: 'Ковёр из полиэстера «HARLEQUIN OUTDOOR» Synchronic Brazilian Rosewood 442303, 160×230 см', shop: 'KOVER.RU', price: 63992, old: 79990 }
      ] }),
    pick({ n: 79, k: 1, cat: 'Зеркала', ts: ago(8, 15),
      text: 'Зеркала к концепции 79: тонкая латунная рама с декором — в прихожую над консолью и в санузел над раковиной. Круглое и прямоугольное в одной отделке смотрятся как пара.',
      items: [
        { name: 'Glasar: круглое настенное зеркало в металлической раме с декором, 60×4×68 см', shop: 'INMYROOM', price: 6355, old: 6834 },
        { name: 'Relikviya Home: зеркало настенное, 52,4×82,4 см', shop: 'OZON', price: 13924, old: 0 }
      ] }),
    pick({ n: 79, k: 5, cat: 'Торшеры', ts: ago(10, 11),
      text: 'Торшеры к концепции 79: бронза и бежевый тканевый абажур — тёплый свет у дивана и в зоне чтения. Высота 150–165 см, чтобы абажур был на уровне глаз сидящего.',
      items: [
        { name: 'Американский винтажный торшер напольный для гостиной', shop: 'ALIEXPRESS', price: 7158, old: 0 },
        { name: 'Citilux Базель CL407931: торшер, бронза с бежевым абажуром', shop: 'CITILUX', price: 15883, old: 22690 }
      ] })
  ];

  /* ---------- концепции 76–78: доска материалов (номера — как на доске), референсы, ДНК цвета.
     Даты фиксированные (по датам референсов из канала): самой новой концепцией должна оставаться 80 — к ней есть подборки. ---------- */
  var DETAILED = [
    { id: 'concept-78', type: 'concept', ts: on('2026-10-12', 14), concept: 78, title: 'Концепция 78 · Шалфей, песок и терраццо', author: DESIGNER, access: 'open',
      text: 'Спокойная база из белёного дуба и песочных стен, на которую ложатся шалфейный текстиль, терраццо в мокрых зонах и рейки на стенах. Подходит семье с детьми: материалы прочные, цвета не надоедают.',
      images: [IMG + 'concept-78.jpg', IMG + 'concept-78-ref-img-3497-jpg.jpg', IMG + 'concept-78-ref-img-3498-jpg.jpg'],
      board: IMG + 'concept-78.jpg', refs: [IMG + 'concept-78-ref-img-3497-jpg.jpg', IMG + 'concept-78-ref-img-3498-jpg.jpg'],
      dna: [ { hex: '#f3efe8', name: 'Белый' }, { hex: '#d9c7ab', name: 'Песок' }, { hex: '#8d9b83', name: 'Шалфей' }, { hex: '#c38b6e', name: 'Терракота' }, { hex: '#b8b0a4', name: 'Терраццо' } ],
      materials: [
        { n: 1, name: 'Краска, белый тёплый', where: 'потолок, рейки' }, { n: 2, name: 'Краска, песочный', where: 'стены' },
        { n: 3, name: 'Дуб натуральный, панель', where: 'фасады, двери' }, { n: 4, name: 'Дуб тёмный, шпон', where: 'акцентная стена прихожей' },
        { n: 5, name: 'Эмаль белая', where: 'плинтус, откосы' }, { n: 6, name: 'Эмаль песочная', where: 'фасады кухни' },
        { n: 7, name: 'Паркетная доска, белёный дуб', where: 'пол жилых комнат' }, { n: 8, name: 'Дуб, ёлочка', where: 'пол прихожей' },
        { n: 9, name: 'Терраццо серый', where: 'пол санузла' }, { n: 10, name: 'Терраццо бежевый', where: 'стены санузла, фартук' }
      ],
      items: [] },
    { id: 'concept-77', type: 'concept', ts: on('2026-10-05', 10), concept: 77, title: 'Концепция 77 · Серый тауп и дуб', author: DESIGNER, access: 'metod',
      text: 'Графичная нейтральная палитра: светло-серые и тауп стены, дуб двух тонов, керамогранит под бетон. Чёрные светильники и терракотовая графика дают характер без лишнего цвета.',
      images: [IMG + 'concept-77.jpg', IMG + 'concept-77-ref-photo-2026-10-05-12-36-4.jpg'],
      board: IMG + 'concept-77.jpg', refs: [IMG + 'concept-77-ref-photo-2026-10-05-12-36-4.jpg'],
      dna: [ { hex: '#d9d5cf', name: 'Серый' }, { hex: '#9a9089', name: 'Тауп' }, { hex: '#c9a06a', name: 'Дуб' }, { hex: '#7d6557', name: 'Орех' }, { hex: '#2a2724', name: 'Чёрный' }, { hex: '#c0613d', name: 'Терракота' } ],
      materials: [
        { n: 1, name: 'Краска, светло-серый', where: 'стены' }, { n: 2, name: 'Краска, тауп', where: 'акцентная стена' },
        { n: 3, name: 'Дуб натуральный, панель', where: 'фасады кухни' }, { n: 4, name: 'Орех серо-коричневый, шпон', where: 'шкафы, двери' },
        { n: 5, name: 'Эмаль белая', where: 'потолок, плинтус' }, { n: 6, name: 'Эмаль тауп', where: 'фасады' },
        { n: 7, name: 'Паркет дуб, узкая доска', where: 'пол гостиной' }, { n: 8, name: 'Дуб, широкая доска', where: 'пол спальни' },
        { n: 9, name: 'Керамогранит под бетон, крупный формат', where: 'пол кухни и прихожей' }, { n: 10, name: 'Керамогранит серый', where: 'санузел' }
      ],
      items: [] },
    { id: 'concept-76', type: 'concept', ts: on('2026-09-21', 16), concept: 76, title: 'Концепция 76 · Тёплый минимализм с бордо', author: DESIGNER, access: 'metod',
      text: 'Бежевые стены, светлый дуб и мрамор Calacatta — спокойная основа, на которую ставим один сильный акцент: бордовый велюр дивана и хрусталь люстры. Орех в фасадах добавляет глубины.',
      images: [IMG + 'concept-76.jpg', IMG + 'concept-76-ref-photo-2026-09-21-14-37-2.jpg'],
      board: IMG + 'concept-76.jpg', refs: [IMG + 'concept-76-ref-photo-2026-09-21-14-37-2.jpg'],
      dna: [ { hex: '#e8dcd0', name: 'Беж' }, { hex: '#f4f1ec', name: 'Белый' }, { hex: '#7a2e3a', name: 'Бордо' }, { hex: '#8a5a3c', name: 'Орех' }, { hex: '#c9a77a', name: 'Дуб' }, { hex: '#b89b5e', name: 'Латунь' } ],
      materials: [
        { n: 1, name: 'Краска, тёплый беж', where: 'стены' }, { n: 2, name: 'Краска, белый', where: 'потолок' },
        { n: 3, name: 'Мрамор Calacatta', where: 'фартук, столешница острова' }, { n: 4, name: 'Дуб светлый, панель', where: 'стеновые панели' },
        { n: 5, name: 'Орех американский, шпон', where: 'фасады кухни' }, { n: 6, name: 'Дуб тонированный, шпон', where: 'мебель, двери' },
        { n: 7, name: 'Керамогранит под оникс', where: 'пол кухни, санузел' }, { n: 8, name: 'Паркетная доска, дуб', where: 'пол жилых комнат' },
        { n: 9, name: 'Эмаль белая', where: 'плинтус, откосы' }, { n: 10, name: 'Эмаль кремовая', where: 'фасады шкафов' }
      ],
      items: [] }
  ];

  /* ---------- все концепции 28–81 — эталоны из kb/concepts.js (созвон 28.10.2026: мудборды дизайнеров из закрытого TG-канала).
     Подключать kb/concepts.js раньше этого файла; нет его — остаются три подробные карточки выше. Текст поста собран из данных
     доски (стиль, палитра), без выдумок; у концепции без доски (hasBoard:false) на обложке — референс из канала. ---------- */
  function conceptPost(c) {
    var full = DETAILED.filter(function (p) { return p.concept === c.n; })[0]; if (full) return full;
    var names = (c.dna || []).map(function (x) { return String(x.name || '').toLowerCase(); }).filter(Boolean);
    var text = (c.style ? 'Стиль — ' + c.style + '. ' : '') + (names.length ? 'Палитра: ' + names.join(', ') + '.' : '') +
      (c.hasBoard === false ? ' Доска материалов ещё не собрана — на обложке референс из канала.' : '');
    var ts = Date.parse(String(c.date || '') + 'T11:00:00'); if (isNaN(ts)) ts = ago(30, 11);
    return { id: 'concept-' + c.n, type: 'concept', ts: ts, concept: c.n, title: 'Концепция ' + c.n + (c.title ? ' · ' + c.title : ''), author: DESIGNER, access: 'metod',
      text: text.trim(), images: [c.img], board: c.img, refs: [], dna: c.dna || [], materials: c.materials || [], hasBoard: c.hasBoard !== false, style: c.style || '', items: [] };
  }
  var CONCEPTS = (window.SOVE_CONCEPTS || []).map(conceptPost);
  DETAILED.forEach(function (p) { if (!CONCEPTS.some(function (c) { return c.concept === p.concept; })) CONCEPTS.push(p); });

  /* ---------- открыто = контент недели (Таня, 29.10): по типам, а не «три самых новых» ----------
     WEEK — сколько самых новых постов каждого типа открыто без подписки; остальное размыто с плашкой «Оформить».
     Самая новая концепция — та, к которой есть подборки (сейчас 80: подборки к 79 и 80), это держат даты концепций выше. */
  var WEEK = { concept: 1, pick: 6, promo: 2 };
  /* подборки с товарами маркетплейсов — в конец списка подборок (открытый вопрос команде про AliExpress: видимы, но последними):
     rank — ключ сортировки ленты (feed.js), дата поста (ts) не меняется */
  var plain = PICKS.filter(function (p) { return !p.marketplace; }), tail = Math.min.apply(null, plain.map(function (p) { return p.ts; }).concat(NOW));
  PICKS.filter(function (p) { return p.marketplace; }).sort(function (a, b) { return b.ts - a.ts; }).forEach(function (p, i) { p.rank = Math.min(p.ts, tail - (i + 1) * 3600e3); });
  var ALL = promoPosts().concat(PICKS, CONCEPTS);
  ALL.forEach(function (p) { if (p.rank === undefined) p.rank = p.ts; p.access = 'metod'; });
  ALL.sort(function (a, b) { return b.rank - a.rank; });
  Object.keys(WEEK).forEach(function (type) {
    ALL.filter(function (p) { return p.type === type; }).slice(0, WEEK[type]).forEach(function (p) { p.access = 'open'; });
  });
  window.SOVE_FEED_WEEK = WEEK;
  window.SOVE_FEED_POSTS = ALL;
})();
