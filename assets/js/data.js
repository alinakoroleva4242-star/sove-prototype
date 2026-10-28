/* SOVEAPP — прототип. Данные-примеры. Страницы НЕ меняют этот файл.
   Настоящие (с платформы sove.app, 21.09.2026): капсулы К1–К7 и бюджеты ₽/м², цены открытия расчёта, ставки и сроки дизайн-проекта.
   Также настоящие: пакеты токенов, тарифы METOD, ставки работ и этапы расчёта, цены функций ИИ (5/10).
   Примеры: товары каталога и их цены, поставщики, результаты распознавания. */
(function () {
  var IMG = 'assets/img/';

  var capsules = [
    { id: 'k1', code: 'К1', name: 'Бургундский камень в арт‑классике', style: 'Арт-классика', pricePerM2: 51000,
      concept: 'Светлая классика с лепниной, в которую врезан бордовый мрамор и тёмно-красные акценты.',
      forWhom: 'Для тех, кто хочет парадный интерьер без музейности.',
      materials: ['Мрамор бордо', 'Дуб светлый, ёлочка', 'Латунь', 'Букле'],
      cover: IMG + 'capsules/k1-living.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k1-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k1-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k1-hall-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k1-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k1-living.jpg' }, { room: 'Кухня', src: IMG + 'capsules/k1-kitchen.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k1-main-2.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k1-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k1-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k1-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k1-mat-' + i + '.jpg'; }) },
    { id: 'k2', code: 'К2', name: 'Изумрудная неоклассика в орехе', style: 'Неоклассика', pricePerM2: 46000,
      concept: 'Тёплый орех, зелёный камень и глубокие оливковые ткани. Вечерний, собранный интерьер.',
      forWhom: 'Для тех, кто любит тёмное дерево и приглушённый свет.',
      materials: ['Орех американский', 'Зелёный мрамор', 'Бронза', 'Велюр оливковый'],
      cover: IMG + 'capsules/k2-main-1.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k2-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k2-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k2-hall-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k2-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k2-main-1.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k2-main-2.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k2-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k2-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k2-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k2-mat-' + i + '.jpg'; }) },
    { id: 'k3', code: 'К3', name: 'Минимализм с голубым и хромом', style: 'Минимализм', pricePerM2: 47000,
      concept: 'Белые объёмы, хром и один холодный синий акцент. Много воздуха и света.',
      forWhom: 'Для тех, кому важны простор и порядок.',
      materials: ['Микроцемент', 'Хром', 'Стекло', 'Букле белое'],
      cover: IMG + 'capsules/k3-main-1.jpg',
      slides: [ { room: 'Спальня', src: IMG + 'slides/k3-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k3-hall-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k3-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k3-main-1.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k3-main-2.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k3-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k3-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k3-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k3-mat-' + i + '.jpg'; }) },
    { id: 'k4', code: 'К4', name: 'Тёплая классика с терракотом', style: 'Классика', pricePerM2: 48000,
      concept: 'Молочные стены с молдингами, тёмный паркет ёлочкой и терракотовые детали.',
      forWhom: 'Для семьи: спокойно, тепло, без резких решений.',
      materials: ['Дуб тёмный, ёлочка', 'Мрамор светлый', 'Латунь', 'Велюр горчичный'],
      cover: IMG + 'capsules/k4-main-1.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k4-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k4-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k4-hall-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k4-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k4-main-1.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k4-main-2.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k4-main-3.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k4-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k4-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k4-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k4-mat-' + i + '.jpg'; }) },
    { id: 'k5', code: 'К5', name: 'Органика в песочном минимализме', style: 'Органика', pricePerM2: 45000,
      concept: 'Арки, шпон и песочные оттенки. Мягкие формы и рассеянный свет.',
      forWhom: 'Для тех, кто хочет тихий, природный интерьер.',
      materials: ['Шпон ореха', 'Травертин', 'Лён', 'Бумажные светильники'],
      cover: IMG + 'capsules/k5-main-1.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k5-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k5-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k5-hall-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k5-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k5-main-1.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k5-main-2.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k5-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k5-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k5-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k5-mat-' + i + '.jpg'; }) },
    { id: 'k6', code: 'К6', name: 'Оливковая классика с тёмным деревом', style: 'Классика', pricePerM2: 50000,
      concept: 'Современная классика в природной палитре: оливковые стены, тёмное дерево, латунь.',
      forWhom: 'Для тех, кто хочет глубокий, спокойный интерьер с характером.', materials: ['Дуб тёмный', 'Оливковая краска', 'Латунь', 'Мрамор'],
      cover: IMG + 'capsules/k6-main-1.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k6-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k6-bed-1.jpg' }, { room: 'Прихожая', src: IMG + 'slides/k6-hall-1.jpg' }, { room: 'Гардероб', src: IMG + 'slides/k6-dress-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k6-bath-1.jpg' } ],
      gallery: [ { room: 'Гостиная', src: IMG + 'capsules/k6-main-1.jpg' }, { room: 'Гостиная', src: IMG + 'capsules/k6-main-2.jpg' }, { room: 'Спальня', src: IMG + 'capsules/k6-bed-1.jpg' }, { room: 'Санузел', src: IMG + 'capsules/k6-bath-1.jpg' }, { room: 'Прихожая', src: IMG + 'capsules/k6-hall-1.jpg' } ],
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k6-mat-' + i + '.jpg'; }) },
    { id: 'k7', code: 'К7', name: 'Минималистичная классика с солнечным дубом', style: 'Минимализм', pricePerM2: 50000, pricePerM2Premium: 83000, designer: true,
      concept: 'Современная классика в светлой природной палитре. Авторская капсула дизайнера.',
      forWhom: 'Для квартир от 40 м² в современных домах: для себя, под премиальную аренду или продажу.', materials: ['Дуб светлый', 'Светлый камень', 'Лён', 'Матовая латунь'],
      cover: IMG + 'capsules/k7-main-1.jpg',
      slides: [ { room: 'Гостиная-кухня', src: IMG + 'slides/k7-living-1.jpg' }, { room: 'Спальня', src: IMG + 'slides/k7-bed-1.jpg' }, { room: 'Кабинет', src: IMG + 'slides/k7-work-1.jpg' }, { room: 'Терраса', src: IMG + 'slides/k7-other-1.jpg' }, { room: 'Санузел', src: IMG + 'slides/k7-bath-1.jpg' } ],
      gallery: [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return { room: 'Интерьер', src: IMG + 'capsules/k7-main-' + i + '.jpg' }; }),
      dna: [1, 2, 3, 4].map(function (i) { return IMG + 'mat/k5-mat-' + i + '.jpg'; }),
      adeptRates: { start: 1800, base: 2400, opt: 3500 } }
  ];
  /* карточки капсул в широком формате (Вика 23.10): широкий кадр без кривой обрезки, палитра, теги фильтров расчёта.
     wide/kN.jpg — заранее обрезанные (мебель в кадре) и облегчённые до ~90 КБ копии: на телефоне по LTE листаются без задержки;
     capsules/hc/*.jpg — такие же облегчённые копии всей галереи капсулы для листалки на главной.
     ⚠️ палитра — по фото материалов капсулы, подогнана вручную; теги (light — светлые, modern — современные,
     warm — тёплые, classic — классика) — наша разметка по описаниям капсул. Поправить здесь. */
  var CAPS_EXTRA = {
    k1: { wide: 'wide/k1.jpg', from: 'k1-main-4', palette: ['#6E2328', '#C3A79B', '#E6DCCF', '#917D54'], tags: ['light', 'classic'] },
    k2: { wide: 'wide/k2.jpg', from: 'k2-main-4', palette: ['#2F3B2E', '#737E6F', '#806853', '#D9D0C0'], tags: ['warm', 'classic'] },
    k3: { wide: 'wide/k3.jpg', from: 'k3-main-3', palette: ['#3D55A0', '#6A849D', '#B9BBBE', '#EEEDEA'], tags: ['light', 'modern'] },
    k4: { wide: 'wide/k4.jpg', from: 'k4-main-4', palette: ['#EDE4D8', '#B4643F', '#6D5135', '#402C1C'], tags: ['warm', 'classic'] },
    k5: { wide: 'wide/k5.jpg', from: 'k5-main-2', palette: ['#DFD3C3', '#BAABA1', '#B38756', '#8C694C'], tags: ['light', 'warm', 'modern'] },
    k6: { wide: 'wide/k6.jpg', from: 'k6-main-3', palette: ['#5C6042', '#543F2A', '#A68A55', '#E9E4D9'], tags: ['classic'] },
    k7: { wide: 'wide/k7.jpg', from: 'k7-main-1', palette: ['#E6E1D8', '#BDB09F', '#A49380', '#6C5945'], tags: ['light', 'modern', 'classic'] }
  };
  /* pos — какую часть вертикального кадра показывать в широкой карточке (мебель в кадре, а не потолок) */
  capsules.forEach(function (c) { var x = CAPS_EXTRA[c.id]; if (x) { c.wide = IMG + 'capsules/' + x.wide; c.wideFrom = x.from; c.widePos = x.pos || ''; c.palette = x.palette; c.tags = x.tags; } });

  var categories =['Мебель', 'Освещение', 'Отделка', 'Сантехника', 'Техника', 'Двери', 'Текстиль и декор'];

  function p(id, name, brand, category, subcat, caps, retail, disc, img, extra) {
    var metod = Math.round(retail * (100 - disc) / 100 / 10) * 10;
    var o = { id: id, name: name, brand: brand, category: category, subcat: subcat, capsules: caps,
      retail: retail, metod: metod, discount: disc, img: IMG + img,
      delivery: 'Москва и область', leadTime: 'В наличии, 3–7 дней', madeToOrder: false,
      suppliers: [ { id: 's-' + id + '-1', name: 'Поставщик 1', metod: metod, delivery: 'Москва и область' } ] };
    for (var k in (extra || {})) o[k] = extra[k];
    return o;
  }
  var order = { madeToOrder: true, leadTime: 'На заказ, 6–8 недель' };
  var products = [
    p(101, 'Кресло на ножке, велюр горчичный', 'на заказ', 'Мебель', 'Кресла', ['k4'], 84000, 15, 'obj/chair-mustard.jpg', order),
    p(102, 'Кресло мягкое, букле белое', 'на заказ', 'Мебель', 'Кресла', ['k1', 'k3'], 92000, 15, 'obj/armchair-boucle.jpg', order),
    p(103, 'Стол журнальный круглый, латунь', 'на заказ', 'Мебель', 'Столы журнальные', ['k1'], 58000, 15, 'obj/table-brass.jpg', order),
    p(104, 'Кровать с мягким изголовьем «волна»', 'на заказ', 'Мебель', 'Кровати', ['k4'], 150000, 20, 'obj/bed-wave.jpg', order),
    p(105, 'Диван модульный, букле белое', 'на заказ', 'Мебель', 'Диваны', ['k3'], 210000, 15, 'obj/sofa-white.jpg', order),
    p(106, 'Стул с подлокотниками, орех', 'на заказ', 'Мебель', 'Стулья', ['k5', 'k2'], 38000, 10, 'obj/chair-wood.jpg', order),
    p(107, 'Обеденная группа: стол и 4 кресла', 'на заказ', 'Мебель', 'Столы обеденные', ['k2'], 320000, 15, 'obj/dining-set.jpg', order),
    p(108, 'Остров кухонный, столешница мрамор бордо', 'на заказ', 'Мебель', 'Кухни', ['k1'], 480000, 10, 'obj/island-marble.jpg', order),
    p(201, 'Люстра каскадная, бордо', 'Maytoni', 'Освещение', 'Люстры', ['k1'], 64900, 20, 'obj/chandelier-bordo.jpg'),
    p(202, 'Люстра «шары», бронзовое стекло', 'Maytoni', 'Освещение', 'Люстры', ['k2'], 52400, 20, 'obj/chandelier-globe.jpg'),
    p(203, 'Люстра рожковая, латунь', 'Denkirs', 'Освещение', 'Люстры', ['k4'], 48200, 15, 'obj/chandelier-gold.jpg'),
    p(204, 'Подвес, дымчатое стекло', 'Denkirs', 'Освещение', 'Подвесы', ['k1', 'k4'], 18900, 25, 'obj/pendant-glass.jpg'),
    p(205, 'Подвес «лист», рисовая бумага', 'на заказ', 'Освещение', 'Подвесы', ['k5'], 26000, 10, 'obj/pendant-leaf.jpg', order),
    p(301, 'Инженерная доска, дуб тёмный, ёлочка, м²', 'Quartz Parquet', 'Отделка', 'Напольные покрытия', ['k4', 'k2'], 7000, 15, 'obj/floor-herringbone.jpg'),
    p(302, 'Керамогранит под мрамор 60×120, м²', 'Italon', 'Отделка', 'Керамогранит', ['k4'], 6900, 20, 'mat/k4-mat-1.jpg'),
    p(303, 'Панель стеновая, шпон ореха, м²', 'на заказ', 'Отделка', 'Панели', ['k4', 'k5'], 12000, 15, 'mat/k4-mat-3.jpg', order),
    p(304, 'Краска интерьерная матовая, 1 л', 'Little Greene', 'Отделка', 'Краска', ['k4', 'k1'], 5000, 15, 'mat/k4-mat-4.jpg'),
    p(305, 'Камень акцентный, мрамор бордо, м²', 'на заказ', 'Отделка', 'Камень', ['k1'], 30000, 10, 'mat/k1-mat-1.jpg', order),
    p(306, 'Керамогранит базовый 60×60, м²', 'Kerama Marazzi', 'Отделка', 'Керамогранит', ['k1', 'k3', 'k5'], 3000, 30, 'mat/k1-mat-3.jpg'),
    p(307, 'Панель, зелёный мрамор, м²', 'на заказ', 'Отделка', 'Камень', ['k2'], 28000, 10, 'mat/k2-mat-1.jpg', order),
    p(308, 'Шпон орех американский, панель, м²', 'на заказ', 'Отделка', 'Панели', ['k2'], 12000, 20, 'mat/k2-mat-2.jpg', order),
    p(309, 'Микроцемент, покрытие стен, м²', 'на заказ', 'Отделка', 'Штукатурка', ['k3'], 4000, 10, 'mat/k3-mat-1.jpg', order),
    p(310, 'Травертин, плита, м²', 'на заказ', 'Отделка', 'Камень', ['k5'], 19000, 15, 'mat/k5-mat-1.jpg', order),
    p(311, 'Ламинат SPC, дуб песочный, м²', 'Laparet', 'Отделка', 'Напольные покрытия', ['k5', 'k3'], 3000, 25, 'mat/k5-mat-2.jpg'),
    p(401, 'Тумба подвесная с раковиной, шпон', 'Boheme', 'Сантехника', 'Мебель для ванной', ['k4'], 96000, 20, 'obj/vanity.jpg'),
    p(402, 'Унитаз подвесной с инсталляцией', 'Wasserkraft', 'Сантехника', 'Унитазы', ['k4', 'k1', 'k5'], 54000, 25, 'obj/toilet.jpg'),
    p(601, 'Картина, печать на холсте 90×120', 'на заказ', 'Текстиль и декор', 'Картины', ['k1'], 32000, 10, 'obj/painting.jpg', order)
  ];
  // у части товаров два поставщика
  [101, 104, 201, 302, 401].forEach(function (id) {
    var it = products.filter(function (x) { return x.id === id; })[0];
    it.suppliers.push({ id: 's-' + id + '-2', name: 'Поставщик 2', metod: Math.round(it.metod * 1.04 / 10) * 10, delivery: 'Вся Россия' });
  });

  /*CAT-START — товары из локальной копии каталога (релиз 17.08), фото на белом фоне; собирает tools/build_products.py*/
  products = products.concat([{"id": 199537, "name": "Диван Дэвис раскладной", "brand": "LAVSIT", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 408100, "metod": 367290, "discount": 10, "img": "assets/img/cat/99537.jpg", "white": true, "fill": 0.21, "box": [0.75, 0.45], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 199762, "name": "Диван Стив раскладной", "brand": "LAVSIT", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 212300, "metod": 191070, "discount": 10, "img": "assets/img/cat/99762.jpg", "white": true, "fill": 0.16, "box": [0.48, 0.36], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202406, "name": "Диван Анива 200 см", "brand": "PARTISAN", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 165900, "metod": 157600, "discount": 5, "img": "assets/img/cat/102406.jpg", "white": true, "fill": 0.25, "box": [0.83, 0.53], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 203274, "name": "Basic Decor. Диван Ambia Jamis белый BD-3069537, 200/60/92", "brand": "BASICDECOR", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 135000, "metod": 114750, "discount": 15, "img": "assets/img/cat/103274.jpg", "white": true, "fill": 0.2, "box": [0.85, 0.47], "color": "белый", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 195495, "name": "Кресло Clubchair белое обивка из хлопковой ткани", "brand": "DESONDO", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 32000, "metod": 27200, "discount": 15, "img": "assets/img/cat/95495.jpg", "white": true, "fill": 0.52, "box": [0.94, 0.91], "color": "белый", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 202716, "name": "Кресло Карман МТ", "brand": "TOK", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 80500, "metod": 72450, "discount": 10, "img": "assets/img/cat/102716.jpg", "white": true, "fill": 0.27, "box": [0.78, 0.6], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 195513, "name": "Кресло бежевое, обивка из ткани рогожка", "brand": "DESONDO", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 24950, "metod": 21210, "discount": 15, "img": "assets/img/cat/95513.jpg", "white": true, "fill": 0.4, "box": [0.93, 0.8], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 205000, "name": "Стул Бремен серая экокожа ножки черные", "brand": "КУХНИ ЛАЙТ", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 17900, "metod": 15220, "discount": 15, "img": "assets/img/cat/105000.jpg", "white": true, "fill": 0.19, "box": [0.84, 0.7], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 195366, "name": "Дизайнерский стул Quadro со спинкой и сидением из ротанга бежевый", "brand": "DESONDO", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 19400, "metod": 16490, "discount": 15, "img": "assets/img/cat/95366.jpg", "white": true, "fill": 0.38, "box": [0.94, 0.86], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 205312, "name": "Стул Катания светло-серая ткань, дуб (тон американский орех нью)", "brand": "КУХНИ ЛАЙТ", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 24500, "metod": 20820, "discount": 15, "img": "assets/img/cat/105312.jpg", "white": true, "fill": 0.18, "box": [0.81, 0.7], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 196188, "name": "Стул Bell Chair серый пластиковый", "brand": "DESONDO", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 4200, "metod": 3570, "discount": 15, "img": "assets/img/cat/96188.jpg", "white": true, "fill": 0.19, "box": [0.71, 0.59], "color": "серый", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 200020, "name": "Кровать Уолтер на ножках", "brand": "LAVSIT", "category": "Мебель", "subcat": "Кровати", "capsules": [], "retail": 171300, "metod": 154170, "discount": 10, "img": "assets/img/cat/100020.jpg", "white": true, "fill": 0.31, "box": [0.93, 0.6], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 200049, "name": "Кровать Эрик с подъемным механизмом", "brand": "LAVSIT", "category": "Мебель", "subcat": "Кровати", "capsules": [], "retail": 177100, "metod": 159390, "discount": 10, "img": "assets/img/cat/100049.jpg", "white": true, "fill": 0.4, "box": [0.64, 0.56], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 193988, "name": "Большой обеденный стол Furuya Dining Table", "brand": "LOFT CONCEPT", "category": "Мебель", "subcat": "Столы обеденные", "capsules": [], "retail": 165000, "metod": 132000, "discount": 20, "img": "assets/img/cat/93988.jpg", "white": true, "fill": 0.19, "box": [0.99, 0.66], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202578, "name": "Стол обеденный Ki", "brand": "UNIKA", "category": "Мебель", "subcat": "Столы обеденные", "capsules": [], "retail": 103300, "metod": 82640, "discount": 20, "img": "assets/img/cat/102578.jpg", "white": true, "fill": 0.2, "box": [0.97, 0.69], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 203240, "name": "Inmyroom. Стол обеденный Lagom D 100 цвета натуральный дуб", "brand": "INMYROOM", "category": "Мебель", "subcat": "Столы обеденные", "capsules": [], "retail": 64300, "metod": 59800, "discount": 7, "img": "assets/img/cat/103240.jpg", "white": true, "fill": 0.17, "box": [0.54, 0.51], "color": "дуб", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202770, "name": "Столик журнальный РОЛ", "brand": "TOK", "category": "Мебель", "subcat": "Столы журнальные", "capsules": [], "retail": 64000, "metod": 57600, "discount": 10, "img": "assets/img/cat/102770.jpg", "white": true, "fill": 0.21, "box": [0.91, 0.68], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 202764, "name": "Столик журнальный Глыба", "brand": "TOK", "category": "Мебель", "subcat": "Столы журнальные", "capsules": [], "retail": 121300, "metod": 109170, "discount": 10, "img": "assets/img/cat/102764.jpg", "white": true, "fill": 0.22, "box": [0.89, 0.64], "color": "дуб", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202557, "name": "Приставной столик Casper", "brand": "UNIKA", "category": "Мебель", "subcat": "Столы журнальные", "capsules": [], "retail": 62600, "metod": 50080, "discount": 20, "img": "assets/img/cat/102557.jpg", "white": true, "fill": 0.19, "box": [0.59, 0.54], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202431, "name": "Журнальный стол Эзоп", "brand": "PARTISAN", "category": "Мебель", "subcat": "Столы журнальные", "capsules": [], "retail": 32900, "metod": 31260, "discount": 5, "img": "assets/img/cat/102431.jpg", "white": true, "fill": 0.15, "box": [0.65, 0.45], "color": "дуб", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 201940, "name": "Комод Symmetric", "brand": "COMA-COMA", "category": "Мебель", "subcat": "Комоды", "capsules": [], "retail": 322000, "metod": 289800, "discount": 10, "img": "assets/img/cat/101940.jpg", "white": true, "fill": 0.25, "box": [0.94, 0.57], "color": "чёрный", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 202538, "name": "Комод Tynd • 2 ящика 1 дверь", "brand": "UNIKA", "category": "Мебель", "subcat": "Комоды", "capsules": [], "retail": 234200, "metod": 187360, "discount": 20, "img": "assets/img/cat/102538.jpg", "white": true, "fill": 0.18, "box": [0.5, 0.44], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 193209, "name": "Банкетка Soft Blocks Ruby", "brand": "LOFT CONCEPT", "category": "Мебель", "subcat": "Пуфы", "capsules": [], "retail": 61000, "metod": 48800, "discount": 20, "img": "assets/img/cat/93209.jpg", "white": true, "fill": 0.23, "box": [0.94, 0.61], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202844, "name": "Пуф с ключницей", "brand": "OCKHOME", "category": "Мебель", "subcat": "Пуфы", "capsules": [], "retail": 55000, "metod": 49500, "discount": 10, "img": "assets/img/cat/102844.jpg", "white": true, "fill": 0.18, "box": [0.85, 0.62], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202590, "name": "Стол полубарный Mirua Figure", "brand": "UNIKA", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 105500, "metod": 84400, "discount": 20, "img": "assets/img/cat/102590.jpg", "white": true, "fill": 0.21, "box": [0.74, 0.72], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 193479, "name": "Барный стул Eichholtz Bar Stool Avorio Blue", "brand": "LOFT CONCEPT", "category": "Мебель", "subcat": "Стулья", "capsules": [], "retail": 87000, "metod": 69600, "discount": 20, "img": "assets/img/cat/93479.jpg", "white": true, "fill": 0.16, "box": [0.91, 0.67], "color": "синий", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 137536, "name": "Люстра потолочная Lussole LSP-8368 Gresham", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Люстры", "capsules": [], "retail": 5490, "metod": 3840, "discount": 30, "img": "assets/img/cat/37536.jpg", "white": true, "fill": 0.2, "box": [0.95, 0.63], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 133468, "name": "Потолочная люстра Liser OML-54507-05", "brand": "OMNILUX", "category": "Освещение", "subcat": "Люстры", "capsules": [], "retail": 10210, "metod": 7150, "discount": 30, "img": "assets/img/cat/33468.jpg", "white": true, "fill": 0.22, "box": [0.93, 0.59], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 133381, "name": "Потолочная люстра 254 OML-25407-03", "brand": "OMNILUX", "category": "Освещение", "subcat": "Люстры", "capsules": [], "retail": 5010, "metod": 3510, "discount": 30, "img": "assets/img/cat/33381.jpg", "white": true, "fill": 0.16, "box": [0.88, 0.71], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 137231, "name": "Люстра Lussole LSP-8452", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Люстры", "capsules": [], "retail": 11400, "metod": 7980, "discount": 30, "img": "assets/img/cat/37231.jpg", "white": true, "fill": 0.33, "box": [0.95, 0.72], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 154444, "name": "Бра Newport 3611/A nickel", "brand": "NEWPORT-ONLINE", "category": "Освещение", "subcat": "Бра", "capsules": [], "retail": 17020, "metod": 11910, "discount": 30, "img": "assets/img/cat/54444.jpg", "white": true, "fill": 0.23, "box": [0.74, 0.56], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 154323, "name": "Бра Newport 11401/A gold", "brand": "NEWPORT-ONLINE", "category": "Освещение", "subcat": "Бра", "capsules": [], "retail": 12480, "metod": 8740, "discount": 30, "img": "assets/img/cat/54323.jpg", "white": true, "fill": 0.17, "box": [0.62, 0.51], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 136494, "name": "Бра Lussole Todi GRLSA-4611-02", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Бра", "capsules": [], "retail": 5220, "metod": 3650, "discount": 30, "img": "assets/img/cat/36494.jpg", "white": true, "fill": 0.16, "box": [0.95, 0.81], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 132931, "name": "Бра Catanzaro OML-30811-02", "brand": "OMNILUX", "category": "Освещение", "subcat": "Бра", "capsules": [], "retail": 6430, "metod": 4500, "discount": 30, "img": "assets/img/cat/32931.jpg", "white": true, "fill": 0.27, "box": [0.73, 0.73], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 137709, "name": "Настольная лампа Lussole Cameron LSP-0526", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Настольные лампы", "capsules": [], "retail": 4880, "metod": 3420, "discount": 30, "img": "assets/img/cat/37709.jpg", "white": true, "fill": 0.44, "box": [0.95, 0.93], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 100773, "name": "Декоративная настольная лампа Zulu", "brand": "ARTELAMP", "category": "Освещение", "subcat": "Настольные лампы", "capsules": [], "retail": 10980, "metod": 7690, "discount": 30, "img": "assets/img/cat/773.jpg", "white": true, "fill": 0.38, "box": [0.91, 0.75], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 161695, "name": "Декоративная настольная лампа Divinare Volturn 1243/17 TL-15", "brand": "DIVINARE", "category": "Освещение", "subcat": "Настольные лампы", "capsules": [], "retail": 20690, "metod": 14480, "discount": 30, "img": "assets/img/cat/61695.jpg", "white": true, "fill": 0.2, "box": [0.88, 0.58], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 100714, "name": "Декоративная настольная лампа Poppy", "brand": "ARTELAMP", "category": "Освещение", "subcat": "Настольные лампы", "capsules": [], "retail": 4990, "metod": 3490, "discount": 30, "img": "assets/img/cat/714.jpg", "white": true, "fill": 0.29, "box": [0.88, 0.72], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 224571, "name": "Смеситель для биде ЧЕРНЫЙ+ХРОМ", "brand": "BOHEME", "category": "Сантехника", "subcat": "Смесители", "capsules": [], "retail": 23790, "metod": 20220, "discount": 15, "img": "assets/img/cat/124571.jpg", "white": true, "fill": 0.33, "box": [0.89, 0.88], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 224359, "name": "Смеситель встроенный Tradizionale Nero (Золото)_Комплект", "brand": "BOHEME", "category": "Сантехника", "subcat": "Смесители", "capsules": [], "retail": 36520, "metod": 31050, "discount": 15, "img": "assets/img/cat/124359.jpg", "white": true, "fill": 0.57, "box": [0.86, 0.77], "color": "золотой", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 219184, "name": "Раковина накладная Abber Rechteck AC2214MB черная матовая", "brand": "ABBER", "category": "Сантехника", "subcat": "Раковины", "capsules": [], "retail": 7560, "metod": 6430, "discount": 15, "img": "assets/img/cat/119184.jpg", "white": true, "fill": 0.27, "box": [0.88, 0.7], "color": "чёрный", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 219158, "name": "Раковина накладная Abber Rechteck AC2207MW белая матовая", "brand": "ABBER", "category": "Сантехника", "subcat": "Раковины", "capsules": [], "retail": 10200, "metod": 8670, "discount": 15, "img": "assets/img/cat/119158.jpg", "white": true, "fill": 0.32, "box": [0.86, 0.71], "color": "белый", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 236413, "name": "Ванна из литьевого мрамора Эстет Бостон 180х74 см", "brand": "ЭСТЕСТ", "category": "Сантехника", "subcat": "Ванны", "capsules": [], "retail": 69700, "metod": 59240, "discount": 15, "img": "assets/img/cat/136413.jpg", "white": true, "fill": 0.25, "box": [0.96, 0.56], "color": "белый", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 225760, "name": "Ванна акриловая 130х70 Cezares ECO-130-70-40-W37", "brand": "BELBAGNO", "category": "Сантехника", "subcat": "Ванны", "capsules": [], "retail": 30700, "metod": 26100, "discount": 15, "img": "assets/img/cat/125760.jpg", "white": true, "fill": 0.26, "box": [0.9, 0.73], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 236470, "name": "Ванна из литьевого мрамора Эстет Камелия 180х75 см", "brand": "ЭСТЕСТ", "category": "Сантехника", "subcat": "Ванны", "capsules": [], "retail": 54000, "metod": 45900, "discount": 15, "img": "assets/img/cat/136470.jpg", "white": true, "fill": 0.28, "box": [0.8, 0.51], "color": "белый", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 230370, "name": "Унитаз-компакт безободковый BelBagno SFERA-R", "brand": "CEZARES", "category": "Сантехника", "subcat": "Унитазы", "capsules": [], "retail": 25420, "metod": 21600, "discount": 15, "img": "assets/img/cat/130370.jpg", "white": true, "fill": 0.26, "box": [0.88, 0.76], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 219737, "name": "Унитаз Abber Bequem AC1106P подвесной белый с импульсным смывом", "brand": "ABBER", "category": "Сантехника", "subcat": "Унитазы", "capsules": [], "retail": 36750, "metod": 31240, "discount": 15, "img": "assets/img/cat/119737.jpg", "white": true, "fill": 0.36, "box": [0.79, 0.67], "color": "белый", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 225466, "name": "Тумба c раковиной VOI рифл. 120см Luna", "brand": "BOHEME", "category": "Сантехника", "subcat": "Мебель для ванной", "capsules": [], "retail": 134030, "metod": 113920, "discount": 15, "img": "assets/img/cat/125466.jpg", "white": true, "fill": 0.35, "box": [0.92, 0.66], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 238132, "name": "Тумба под раковину Глэм 700-0-2 (Como)", "brand": "VIGO", "category": "Сантехника", "subcat": "Мебель для ванной", "capsules": [], "retail": 13470, "metod": 11450, "discount": 15, "img": "assets/img/cat/138132.jpg", "white": true, "fill": 0.28, "box": [0.82, 0.67], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 238191, "name": "Тумба под раковину Милос 600-1-0 (Como) дуб золотой", "brand": "VIGO", "category": "Сантехника", "subcat": "Мебель для ванной", "capsules": [], "retail": 7720, "metod": 6560, "discount": 15, "img": "assets/img/cat/138191.jpg", "white": true, "fill": 0.41, "box": [0.87, 0.74], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 480823, "name": "Встраиваемый электрический духовой шкаф Midea MO37003GB", "brand": "MIDEA", "category": "Техника", "subcat": "Духовые шкафы", "capsules": [], "retail": 21990, "metod": 16490, "discount": 25, "img": "assets/img/cat/380823.jpg", "white": true, "fill": 0.65, "box": [0.81, 0.81], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 462369, "name": "Духовой электрический шкаф Zigmund & Shtain E 153 B", "brand": "ZIGMUND&SHTAIN", "category": "Техника", "subcat": "Духовые шкафы", "capsules": [], "retail": 44990, "metod": 38240, "discount": 15, "img": "assets/img/cat/362369.jpg", "white": true, "fill": 0.53, "box": [0.73, 0.72], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 451440, "name": "Вытяжка Ilve AM150 - ilve-shop.ru", "brand": "LIVE", "category": "Техника", "subcat": "Вытяжки", "capsules": [], "retail": 457990, "metod": 343490, "discount": 25, "img": "assets/img/cat/351440.jpg", "white": true, "fill": 0.29, "box": [0.95, 0.7], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 457104, "name": "Полновстраиваемая вытяжка KHI 6892 DGN", "brand": "KORTING", "category": "Техника", "subcat": "Вытяжки", "capsules": [], "retail": 20490, "metod": 17420, "discount": 15, "img": "assets/img/cat/357104.jpg", "white": true, "fill": 0.45, "box": [0.88, 0.65], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 481051, "name": "Холодильник Midea MDRB241FGF50", "brand": "MIDEA", "category": "Техника", "subcat": "Холодильники", "capsules": [], "retail": 31990, "metod": 23990, "discount": 25, "img": "assets/img/cat/381051.jpg", "white": true, "fill": 0.24, "box": [0.88, 0.49], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 481075, "name": "Холодильник Midea MDRS791MIE33", "brand": "MIDEA", "category": "Техника", "subcat": "Холодильники", "capsules": [], "retail": 89990, "metod": 67490, "discount": 25, "img": "assets/img/cat/381075.jpg", "white": true, "fill": 0.36, "box": [0.88, 0.63], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 458966, "name": "Кофемашина CKV 6550.0 W4 золотой Куперсбуш / Kuppersbusch", "brand": "KUPPERSBUSCH", "category": "Техника", "subcat": "Кофемашины", "capsules": [], "retail": 382990, "metod": 325540, "discount": 15, "img": "assets/img/cat/358966.jpg", "white": true, "fill": 0.54, "box": [0.94, 0.81], "color": "золотой", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 462456, "name": "Кофемашина Zigmund & Shtain ZACM-2100", "brand": "ZIGMUND&SHTAIN", "category": "Техника", "subcat": "Кофемашины", "capsules": [], "retail": 46990, "metod": 39940, "discount": 15, "img": "assets/img/cat/362456.jpg", "white": true, "fill": 0.44, "box": [0.75, 0.75], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 138847, "name": "Торшер Lussole Nulvi GRLSF-2115-02", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Торшеры", "capsules": [], "retail": 23470, "metod": 16430, "discount": 30, "img": "assets/img/cat/38847.jpg", "white": true, "fill": 0.15, "box": [0.95, 0.5], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 138850, "name": "Торшер Lussole Parker GRLSP-9887", "brand": "LUSSOLE", "category": "Освещение", "subcat": "Торшеры", "capsules": [], "retail": 20580, "metod": 14410, "discount": 30, "img": "assets/img/cat/38850.jpg", "white": true, "fill": 0.15, "box": [0.95, 0.54], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 195108, "name": "Кресло PK20 Lounge", "brand": "LOFT CONCEPT", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 97000, "metod": 77600, "discount": 20, "img": "assets/img/cat/95108.jpg", "white": true, "fill": 0.26, "box": [0.85, 0.85], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 195487, "name": "Кресло Academic зеленое, обивка из ткани шенилл", "brand": "DESONDO", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 35900, "metod": 30520, "discount": 15, "img": "assets/img/cat/95487.jpg", "white": true, "fill": 0.58, "box": [0.93, 0.9], "color": "зелёный", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 199421, "name": "Тумба под ТВ с бортиками дуб мини", "brand": "MEBELROOM", "category": "Мебель", "subcat": "Тумбы", "capsules": [], "retail": 22000, "metod": 20900, "discount": 5, "img": "assets/img/cat/99421.jpg", "white": true, "fill": 0.3, "box": [0.86, 0.6], "color": "дуб", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202865, "name": "ТВ-тумба Нова", "brand": "OCKHOME", "category": "Мебель", "subcat": "Тумбы", "capsules": [], "retail": 168000, "metod": 151200, "discount": 10, "img": "assets/img/cat/102865.jpg", "white": true, "fill": 0.16, "box": [0.9, 0.5], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 199725, "name": "Диван Паркер раскладной", "brand": "LAVSIT", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 300300, "metod": 270270, "discount": 10, "img": "assets/img/cat/99725.jpg", "white": true, "fill": 0.27, "box": [0.72, 0.49], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 199635, "name": "Диван Линден раскладной", "brand": "LAVSIT", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 271700, "metod": 244530, "discount": 10, "img": "assets/img/cat/99635.jpg", "white": true, "fill": 0.23, "box": [0.63, 0.44], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 202088, "name": "Рохо диван с мягкой посадкой", "brand": "MASTERFABRIK", "category": "Мебель", "subcat": "Диваны", "capsules": [], "retail": 173600, "metod": 164920, "discount": 5, "img": "assets/img/cat/102088.jpg", "white": true, "fill": 0.32, "box": [0.89, 0.51], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 199929, "name": "Кровать Конор с подъемным механизмом", "brand": "LAVSIT", "category": "Мебель", "subcat": "Кровати", "capsules": [], "retail": 209500, "metod": 188550, "discount": 10, "img": "assets/img/cat/99929.jpg", "white": true, "fill": 0.44, "box": [0.92, 0.65], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 199980, "name": "Кровать Портер с подъемным механизмом", "brand": "LAVSIT", "category": "Мебель", "subcat": "Кровати", "capsules": [], "retail": 179800, "metod": 161820, "discount": 10, "img": "assets/img/cat/99980.jpg", "white": true, "fill": 0.46, "box": [0.83, 0.6], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "Под заказ, 2–3 недели", "madeToOrder": false}, {"id": 195844, "name": "Полукресло Coco оливковое, обивка из ткани букле", "brand": "DESONDO", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 19500, "metod": 16580, "discount": 15, "img": "assets/img/cat/95844.jpg", "white": true, "fill": 0.35, "box": [0.93, 0.82], "color": "", "material": "", "sizes": "", "delivery": "Вся Россия", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}, {"id": 195511, "name": "Кресло Ricco бежевое, обивка из ткани рогожка", "brand": "DESONDO", "category": "Мебель", "subcat": "Кресла", "capsules": [], "retail": 49900, "metod": 42420, "discount": 15, "img": "assets/img/cat/95511.jpg", "white": true, "fill": 0.76, "box": [0.93, 0.92], "color": "", "material": "", "sizes": "", "delivery": "Москва и область", "leadTime": "В наличии, 3–7 дней", "madeToOrder": false}].map(function (o, i) {
    o.suppliers = [ { id: 's-' + o.id + '-1', name: 'Поставщик 1', metod: o.metod, delivery: o.delivery } ];
    if (i % 5 === 0) o.suppliers.push({ id: 's-' + o.id + '-2', name: 'Поставщик 2', metod: Math.round(o.metod * 1.04 / 10) * 10, delivery: 'Вся Россия' });
    return o;
  }));
  /*CAT-END*/

  /* Платное продвижение партнёров: товар поднимается в каталоге и попадает в полку «Акции».
     По 289-ФЗ такие позиции помечаются словом «Продвижение» — звёздочки без подписи мало. */
  var PROMO = {};
  (function () {
    var pool = products.filter(function (p) { return p.img && p.white && p.discount >= 10; });   /* только те, что видны в каталоге */
    var pick = [];
    var seen = {};
    pool.forEach(function (p) {
      if (pick.length >= 8) return;
      if (seen[p.subcat]) return;          /* по одной позиции с полки, чтобы полка была разной */
      seen[p.subcat] = 1; pick.push(p);
    });
    pick.forEach(function (p, i) {
      PROMO[p.id] = { until: ['26.09', '27.09', '28.09', '30.09'][i % 4], partner: p.brand || 'партнёр' };
    });
  })();

  var data = {
    capsules: capsules,
    promo: PROMO,
    isPromo: function (id) { return !!PROMO[id]; },
    promoList: function () {
      return Object.keys(PROMO).map(function (id) { return products.filter(function (p) { return String(p.id) === String(id); })[0]; }).filter(Boolean);
    },
    categories: categories,
    products: products,

    /* цены функций — на сайте придут с сервера из конфига */
    costs: { photo: 0, render: 10 },
    demoLimit: 3,
    gift: { tokens: 50, days: 30 },

    tokenPacks: [ { id: 'p100', tokens: 100, price: 990 }, { id: 'p300', tokens: 300, price: 2490 }, { id: 'p1000', tokens: 1000, price: 6990 } ],
    metodPlans: [ { id: 'm1', months: 1, price: 4400 }, { id: 'm3', months: 3, price: 6200 }, { id: 'm6', months: 6, price: 9800 } ],
    /* разовый доступ к контакту: цен в ТЗ нет — в интерфейсе показывать «цена уточняется» */
    singleAccess: null,

    scout: {
      states: [
        { id: 'secondary', name: 'Вторичка', note: 'нужно всё снимать', rate: 65000, estimate: true },
        { id: 'concrete', name: 'Бетон', note: 'новостройка без отделки', rate: 60000, estimate: false },
        { id: 'pre', name: 'Предчистовая отделка', note: 'стяжка и штукатурка есть', rate: 55000, estimate: true },
        { id: 'finish', name: 'Чистовая отделка', note: 'переделаем под интерьер', rate: 50000, estimate: false }
      ],
      stages: [ ['Демонтаж', 10], ['Стены и перегородки', 20], ['Водоснабжение и канализация', 20], ['Электрика, свет, двери', 15], ['Полы', 15], ['Потолки', 10], ['Финальная сдача', 10] ],
      /* доли комплектации по категориям — пример, для показа структуры */
      kitShares: [ ['Отделка', 22], ['Освещение', 7], ['Выключатели и розетки', 2], ['Сантехника', 10], ['Техника', 12], ['Мебель покупная', 17], ['Мебель на заказ', 20], ['Двери и перегородки', 6], ['Текстиль и декор', 4] ],
      retailMarkup: 1.1746, /* розница / METOD по примеру К4 45 м² из ТЗ: 2 764 512 / 2 353 552 */
      formats: [ { id: 'self', name: 'Делаю сам', note: 'Смета и список товаров останутся в кабинете' }, { id: 'adept', name: 'Нужен дизайн-проект', note: 'Передадим расчёт в дизайн-проект' }, { id: 'track', name: 'Ремонт под ключ', note: 'Передадим расчёт в управление ремонтом' } ],
      samplePlan: { rooms: [ { name: 'Гостиная-кухня', area: 21.4 }, { name: 'Спальня', area: 13.2 }, { name: 'Прихожая', area: 6.3 }, { name: 'Санузел', area: 4.1 } ], bathrooms: 1, doors: 4, windows: 2 }
    },

    /* результаты ИИ для примеров (в прототипе распознавания нет) */
    ai: {
      renderSample: { src: IMG + 'capsules/k1-living.jpg', title: 'Гостиная, капсула К1', capsule: 'k1',
        objects: [
          { n: 1, name: 'Люстра подвесная', box: [54, 2, 18, 46],
            poly: '58,3 69,3 70,9 69,17 67,26 65,35 63,43 61,46 59,43 57,34 56,24 56,13',
            items: [ { id: 201, match: 'exact' }, { id: 202, match: 'near' }, { id: 203, match: 'near' } ] },
          { n: 2, name: 'Кресло в букле', box: [75, 57, 21, 26],
            poly: '88,65 96,63 102,69 103,78 100,87 93,89 88,84 86,76 86,70',
            items: [ { id: 102, match: 'exact' }, { id: 101, match: 'near' }, { id: 106, match: 'near' } ] },
          { n: 3, name: 'Стол журнальный', box: [45, 70, 27, 15],
            poly: '46,74 53,71 64,71 71,75 70,80 62,84 52,84 46,79',
            items: [ { id: 103, match: 'exact' } ] },
          { n: 4, name: 'Картина', box: [18, 27, 24, 30],
            poly: '19,28 42,27 42,56 19,57',
            items: [ { id: 601, match: 'near' } ] }
        ] },
      /* разметка предметов на кадрах других капсул: рамки и товары, которые за ними стоят */
      renderMarks: {
        k2: { src: IMG + 'slides/k2-living-1.jpg', objects: [
          { n: 1, name: 'Люстра «шары»', box: [56, 25, 17, 12], items: [ { id: 202, match: 'exact' } ] },
          { n: 2, name: 'Обеденная группа', box: [50, 37, 28, 15], items: [ { id: 107, match: 'exact' } ] },
          { n: 3, name: 'Панель, зелёный мрамор', box: [10, 44, 36, 17], items: [ { id: 307, match: 'exact' } ] },
          { n: 4, name: 'Стулья у острова', box: [30, 47, 17, 16], items: [ { id: 106, match: 'near' } ] }
        ] },
        k4: { src: IMG + 'slides/k4-living-1.jpg', objects: [
          { n: 1, name: 'Подвесы над кухней', box: [62, 12, 30, 17], items: [ { id: 204, match: 'exact' } ] },
          { n: 2, name: 'Кресло на ножке', box: [38, 60, 23, 26], items: [ { id: 101, match: 'exact' } ] },
          { n: 3, name: 'Пол, инженерная доска', box: [8, 78, 34, 16], items: [ { id: 301, match: 'near' } ] }
        ] },
        k3: { src: IMG + 'slides/k3-bed-1.jpg', objects: [
          { n: 1, name: 'Люстра с хрустальной бахромой', box: [44, 26, 24, 22], items: [ { id: 201, match: 'near' } ] },
          { n: 2, name: 'Кресло у окна', box: [25, 56, 25, 15], items: [ { id: 102, match: 'near' } ] },
          { n: 3, name: 'Кровать с мягким изголовьем', box: [10, 68, 72, 21], items: [ { id: 104, match: 'near' } ] },
          { n: 4, name: 'Панель в нише, камень', box: [1, 22, 13, 46], items: [ { id: 305, match: 'near' } ] }
        ] },
        k5: { src: IMG + 'slides/k5-hall-1.jpg', objects: [
          { n: 1, name: 'Дверь, шпон ореха', box: [31, 14, 41, 70], items: [ { id: 303, match: 'near' } ] },
          { n: 2, name: 'Бра у входа', box: [13, 34, 9, 11], items: [ { id: 204, match: 'near' } ] },
          { n: 3, name: 'Табурет у двери', box: [18, 75, 20, 18], items: [ { id: 106, match: 'near' } ] },
          { n: 4, name: 'Пол, керамогранит', box: [12, 86, 70, 11], items: [ { id: 306, match: 'exact' } ] }
        ] },
        k6: { src: IMG + 'slides/k6-living-1.jpg', objects: [
          { n: 1, name: 'Панель, камень с прожилками', box: [48, 15, 40, 50], items: [ { id: 305, match: 'near' } ] },
          { n: 2, name: 'Остров, столешница камень', box: [8, 70, 42, 13], items: [ { id: 108, match: 'near' } ] },
          { n: 3, name: 'Стул у острова', box: [55, 85, 20, 12], items: [ { id: 106, match: 'near' } ] }
        ] },
        k7: { src: IMG + 'slides/k7-living-1.jpg', objects: [
          { n: 1, name: 'Диван модульный, букле', box: [4, 4, 82, 56], items: [ { id: 105, match: 'near' } ] },
          { n: 2, name: 'Стол журнальный', box: [62, 48, 37, 40], items: [ { id: 103, match: 'near' } ] }
        ] }
      },
      photoSample: { src: IMG + 'obj/chair-mustard.jpg', title: 'Кресло на ножке',
        items: [ { id: 101, match: 'exact' }, { id: 102, match: 'near' }, { id: 106, match: 'near' } ] },
      emptySample: { src: IMG + 'mat/k3-mat-2.jpg', title: 'Фото без предметов' }
    },

    /* Отзывы клуба METOD — перенесены с сайта (constants/reviews.ts): реальный отзыв один,
       выдуманных цитат не добавляем. */
    reviews: [
      { id: 'artem-msk', quote: 'Сэкономил 400к на ремонте через клуб METOD', author: 'Артём, Москва', meta: 'с фото-пруфами в канале' }
    ],

    /* Партнёры «на заказ» — делают под объект, в общем каталоге их нет
       (перенесено с сайта, constants/custom-order-partners.ts) */
    customOrder: {
      categories: ['Кухни на заказ', 'Двери на заказ', 'Мебель из металла на заказ'],
      partners: [
        { id: 'kuhni-layt', name: 'КУХНИ ЛАЙТ', category: 'Кухни на заказ', note: '−15 %' },
        { id: 'kuhni-ot-marata', name: 'КУХНИ ОТ МАРАТА', category: 'Кухни на заказ', note: '−10 %' },
        { id: 'nordic-kitchens', name: 'NORDIC KITCHENS', category: 'Кухни на заказ', note: 'сертификат 100 т.р' },
        { id: 'klassicheskie-dveri-s-nalichnikom', name: 'КЛАССИЧЕСКИЕ ДВЕРИ С НАЛИЧНИКОМ', category: 'Двери на заказ', note: 'от 18 700 ₽' },
        { id: 'klassicheskie-dveri', name: 'КЛАССИЧЕСКИЕ ДВЕРИ', category: 'Двери на заказ', note: 'от 24 000 ₽' },
        { id: 'skrytye-dveri-pod-pokrasku', name: 'СКРЫТЫЕ ДВЕРИ ПОД ПОКРАСКУ', category: 'Двери на заказ', note: 'от 20 615 ₽' },
        { id: 'awelt', name: 'AWELT', category: 'Мебель из металла на заказ', note: '−15 %' },
        { id: 'sgib', name: 'SGIB', category: 'Мебель из металла на заказ', note: '−20 %' }
      ]
    },

    /* Чаты: четыре канала, как на сайте (chats.tsx). Партнёрский — «первое касание»,
       дальше переписка уходит во внешний мессенджер; чаты услуг открываются после оформления. */
    chats: [
      { kind: 'support', title: 'Поддержка SOVEAPP', sub: 'техвопросы · оплаты · аккаунт', accent: '#6FA8C9',
        seed: [ { text: 'Здравствуйте! Это поддержка SOVEAPP. Чем помочь?' },
                { me: true, text: 'Как работает возврат токенов?' },
                { text: 'Подарочные токены действуют 30 дней, купленные — бессрочно. По подписке METOD токены начисляются 1:1.' } ] },
      { kind: 'partner', title: 'Партнёр', sub: 'первое касание · дальше во внешнем мессенджере', accent: '#C9C46A', locked: false, first: true, seed: [] },
      { kind: 'designer', title: 'Дизайнер · дизайн-проект', sub: 'дизайн-проект · внутри проекта', accent: '#9B7FC9', locked: true,
        seed: [ { text: 'Чат с дизайнером открывается после оформления дизайн-проекта.' } ] },
      { kind: 'team', title: 'Команда · ремонт', sub: 'ход ремонта · внутри проекта', accent: '#C96F6F', locked: true,
        seed: [ { text: 'Чат с командой стройки открывается после оформления ремонта под ключ.' } ] }
    ],

    /* Доступ к просчёту расчёта — по документу «Доступ к просчёту капсул» (платформа и бот).
       Оплата РУБЛЯМИ по счёту, не токенами. Цены задаются в админке платформы: у капсулы своя цена,
       пустое поле → дефолт типа. ЗНАЧЕНИЯ НИЖЕ — ПРИМЕРЫ для прототипа, настоящих цен в документе нет. */
    scoutAccess: {
      pricesAreExamples: false, /* прочитано с платформы 21.09.2026: GET /api/v1/design_concepts/published */
      defaults: {
        sove:     { open: { base: { guest: null, metod: 0 }, premium: { guest: null, metod: 0 } }, recalc: null },
        designer: { open: { base: { guest: 2200, metod: 1100 }, premium: { guest: 2200, metod: 1100 } }, recalc: null }
      },
      levels: [ { id: 'base', name: 'Базовый' }, { id: 'premium', name: 'Премиум' } ]
    },

    adept: { packages: [ { id: 'start', name: 'Стартовый', rate: 2000, term: '7–10 дней', includes: ['Планировка с мебелью', 'ИИ-рендеры ключевых зон', 'Бюджет диапазоном'] }, { id: 'base', name: 'Базовый', rate: 2600, term: '25 дней', includes: ['Всё из Стартового', 'Планы света, розеток, сантехники', 'Базовая спецификация'] }, { id: 'opt', name: 'Оптимальный', rate: 4000, term: '35 дней', includes: ['Всё из Базового', 'Эскизный 3D', 'Полная спецификация и точный бюджет'] } ] }
  };

  capsules.forEach(function (c) { c.type = c.designer ? 'designer' : 'sove'; c.version = 1; });
  data.capsule = function (id) { return capsules.filter(function (c) { return c.id === id; })[0] || null; };
  data.product = function (id) { id = Number(id); return products.filter(function (x) { return x.id === id; })[0] || null; };

  window.SOVE_DATA = data;
})();
