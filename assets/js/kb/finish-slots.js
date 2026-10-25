/* База знаний, слой 1а: 12 слотов чистовой отделки × База / Премиум + альтернативы
   (design/materialy/TZ-materialy-v2.md, разделы 7–9). Цифры — только из раздела 9 ТЗ, своих не добавляем:
   у слота есть цена за единицу и сумма на всю квартиру 47 м²; количество = сумма / цена.
   Теги товара: hex, тон, подтон, материал, уровень, слот, фактура (texture — вид CSS-фактуры, запасной вариант),
   textureUrl (фото фактуры ≥ 512 px без логотипов) и crop — кадр с картинки примера, unit, price.
   pid — числовой id для ♡ и 🛒 Моего ремонта (товары регистрируются в каталоге прототипа при первом показе).
   Капсулы здесь не упоминаются: они невидимая основа подбора (rules.js, kb.complete). */
(function () {
  var KB = window.SOVE_KB = window.SOVE_KB || {};

  /* ДНК примера «тёплая неоклассика»: 60% основа · 30% второй цвет · 10% акцент — порядок ряда ДНК на эталонах A0 / B1 */
  KB.DNA = [
    { key: 'walnut',   hex: '#4A2C1C', name: 'Орех',     role: 'second', share: 15 },
    { key: 'emerald',  hex: '#3E5440', name: 'Изумруд',  role: 'accent', share: 4 },
    { key: 'olive',    hex: '#5E6B3E', name: 'Олива',    role: 'second', share: 15 },
    { key: 'brass',    hex: '#C49A5B', name: 'Латунь',   role: 'accent', share: 3 },
    { key: 'milk',     hex: '#E9E1D4', name: 'Молочный', role: 'base',   share: 30 },
    { key: 'taupe',    hex: '#B9AC9C', name: 'Тауп',     role: 'base',   share: 30 },
    { key: 'graphite', hex: '#2E2A27', name: 'Графит',   role: 'accent', share: 3 }
  ];
  /* роль цвета в карточке ДНК (эталон etalon-I2): где этот цвет живёт в квартире */
  KB.DNA_ROLE_T = { milk: 'стены', taupe: 'санузел', walnut: 'пол', olive: 'акцент', emerald: 'фартук', brass: 'металл', graphite: 'фурнитура' };
  KB.ROLE_SHARE = { base: '60%', second: '30%', accent: '10%' };
  KB.STYLE = 'тёплая неоклассика';
  KB.WARM = true;                      /* ДНК тёплая — правило 2 */
  KB.AREA = 47;                        /* квартира примера, м² */
  KB.ROLE = { base: 'основа', second: 'второй цвет', accent: 'акцент' };

  /* 12 слотов в порядке списка (ТЗ v2, 5.6); номер на доске — как на эталоне; форма образца — раздел 7 */
  KB.GROUPS = [
    { key: 'floor', name: 'Пол' },
    { key: 'walls', name: 'Стены и потолок' },
    { key: 'wet',   name: 'Санузел и кухня' },
    { key: 'rest',  name: 'Двери, свет, фурнитура' }
  ];
  /* rooms — где применён материал (ТЗ Интерьера, 7.1): ключи зон или 'all'. Отсюда — чипы зон, фильтр мудборда и списка,
     какие рендеры устарели после замены и подпись «где применён». Числа зон как на эталоне B1: кухня-гостиная 9 · спальня 7 · санузел 6 · прихожая 5 */
  KB.SLOTS = [
    { key: 'floor',      num: 1,  name: 'Пол',                 group: 'floor', dna: 'walnut',   shape: 'plank',  rooms: ['kitchenLiving', 'bedroom', 'hall'] },
    { key: 'floorTile',  num: 2,  name: 'Плитка пола',         group: 'floor', dna: 'taupe',    shape: 'rect',   rooms: ['bathroom'] },
    { key: 'walls',      num: 3,  name: 'Стены',               group: 'walls', dna: 'milk',     shape: 'rect',   rooms: ['kitchenLiving', 'bedroom', 'hall'] },
    { key: 'accentWall', num: 4,  name: 'Акцентная стена',     group: 'walls', dna: 'olive',    shape: 'arch',   rooms: ['kitchenLiving'] },
    { key: 'ceiling',    num: 9,  name: 'Потолок',             group: 'walls', dna: 'milk',     shape: 'circle', rooms: ['kitchenLiving', 'bedroom', 'bathroom'] },
    { key: 'moldings',   num: 8,  name: 'Плинтус и молдинги',  group: 'walls', dna: 'milk',     shape: 'strip',  rooms: ['kitchenLiving', 'bedroom'] },
    { key: 'bathWalls',  num: 5,  name: 'Плитка санузла',      group: 'wet',   dna: 'milk',     shape: 'rect',   rooms: ['bathroom'] },
    { key: 'apron',      num: 6,  name: 'Фартук кухни',        group: 'wet',   dna: 'emerald',  shape: 'rect',   rooms: ['kitchenLiving'] },
    { key: 'plumbing',   num: 10, name: 'Сантехника',          group: 'wet',   dna: 'brass',    shape: 'round',  rooms: ['bathroom'] },
    { key: 'doors',      num: 7,  name: 'Двери',               group: 'rest',  dna: 'milk',     shape: 'arch',   rooms: 'all' },
    { key: 'light',      num: 11, name: 'Свет',                group: 'rest',  dna: 'brass',    shape: 'circle', rooms: 'all' },
    { key: 'hardware',   num: 12, name: 'Фурнитура и розетки', group: 'rest',  dna: 'graphite', shape: 'circle', rooms: ['kitchenLiving', 'bedroom', 'hall'] }
  ];

  /* зоны квартиры: ключ, название, к какому типу относится комната плана (кухня и гостиная — одна зона, кабинет и детская — как спальня) */
  KB.ZONES = [
    { key: 'kitchenLiving', name: 'Кухня-гостиная', re: /кух|гост|столов/i },
    { key: 'bedroom',       name: 'Спальня',        re: /спал|детск|кабинет|комнат/i },
    { key: 'bathroom',      name: 'Санузел',        re: /сан|ванн|душ|туалет|с\/у/i },
    { key: 'hall',          name: 'Прихожая',       re: /прих|корид|холл|ниша|гардероб/i }
  ];
  KB.zoneOf = function (roomName) { var z = KB.ZONES.filter(function (x) { return x.re.test(String(roomName || '')); })[0]; return z ? z.key : 'bedroom'; };
  /* категория бюджета (design/budget/TZ-budget.md, 2 и 4): слот → строка комплектации; ИНТЕРЬЕР заполняет 5 из 9 категорий */
  var BCAT = { floor: 'finish', floorTile: 'finish', walls: 'finish', accentWall: 'finish', bathWalls: 'finish', apron: 'finish', moldings: 'finish', ceiling: 'finish',
    light: 'light', hardware: 'sockets', plumbing: 'plumbing', doors: 'doors' };
  KB.SLOTS.forEach(function (s) { s.budgetCat = BCAT[s.key]; });
  KB.BUDGET_CATS = ['finish', 'light', 'sockets', 'plumbing', 'doors'];
  /* короткие id зон в адресе: interior.html?v=b&room=kitchen (ТЗ chips-budget, 2); принимаем и ключ зоны */
  var ZID = { kitchenLiving: 'kitchen', bedroom: 'bedroom', bathroom: 'bathroom', hall: 'hall' };
  KB.zoneId = function (key) { return ZID[key] || key; };
  /* комнаты плана (Алина 26.10): каждая комната — своя единица {key, type, name, m2}; тип (одна из 4 зон) решает, какие материалы в ней.
     Первая комната типа носит ключ зоны (kitchenLiving, bedroom…) — старые доски и рендеры работают; следующие — bedroom-2, bathroom-2…
     Реестр заполняет repair.js (planZones) по плану квартиры; без плана — 4 типовые комнаты */
  KB.UNITS = {};
  KB.zoneType = function (key) { if (KB.UNITS[key]) return KB.UNITS[key].type; return ZID[key] ? key : String(key || '').split('-')[0]; };
  KB.zoneFromId = function (id) { if (!id) return null; if (ZID[id] || KB.UNITS[id]) return id; var k = Object.keys(ZID).filter(function (z) { return ZID[z] === id; })[0]; return k || null; };
  KB.zone = function (key) {
    if (KB.UNITS[key]) return KB.UNITS[key];
    var z = KB.ZONES.filter(function (x) { return x.key === key; })[0]; if (z) return z;
    var t = KB.ZONES.filter(function (x) { return x.key === KB.zoneType(key); })[0];
    return t ? { key: key, type: t.key, name: t.name } : null;
  };
  KB.inZone = function (slot, zoneKey) { var s = typeof slot === 'string' ? KB.slot(slot) : slot; if (!zoneKey || zoneKey === 'flat' || s.rooms === 'all') return true; return s.rooms.indexOf(KB.zoneType(zoneKey)) >= 0; };
  /* слоты зоны (или нескольких зон — объединение) */
  KB.slotsFor = function (zones) {
    if (!zones || zones === 'flat') return KB.SLOTS.slice();
    zones = [].concat(zones);
    return KB.SLOTS.filter(function (s) { return zones.some(function (z) { return KB.inZone(s, z); }); });
  };
  /* «где применён» для строки списка: «во всех комнатах» / «везде, кроме санузла» / «кухня-гостиная» (только по зонам квартиры) */
  KB.whereText = function (slot, zones) {
    var s = typeof slot === 'string' ? KB.slot(slot) : slot, all = zones && zones.length ? zones : KB.ZONES.map(function (z) { return z.key; });
    var on = all.filter(function (z) { return KB.inZone(s, z); }), off = all.filter(function (z) { return on.indexOf(z) < 0; });
    if (!off.length) return 'во всех комнатах';
    if (off.length === 1 && on.length >= 2) return 'везде, кроме ' + { kitchenLiving: 'кухни', bedroom: 'спальни', bathroom: 'санузла', hall: 'прихожей' }[off[0]];
    return on.map(function (z) { return KB.zone(z).name.toLowerCase(); }).join(', ');
  };

  /* фактуры (design/materialy/img/tex → assets/img/interior/tex): фото 512 px без логотипов.
     REF — кадр с картинки примера (флэтлей mb-ref.jpg): центр кадра в долях картинки, как на эталоне */
  var TEX = 'assets/img/interior/tex/', SW = 'assets/img/interior/sw/';
  /* фото образца по материалу (ТЗ Интерьера, 8: приоритет — реальные вырезки sw/*.jpg; краска и штукатурка — выкраска цветом) */
  var PHOTO = { 'fl-lam-walnut': 'walnut', 'fl-parq-walnut': 'walnut', 'fl-lvt-walnut': 'walnut', 'fl-eng-walnut': 'walnut', 'fl-parq-oak': 'taupe', 'fl-lam-oak': 'cer',
    'ft-60': 'taupe', 'ft-120': 'taupe', 'bw-20x60': 'cer', 'bw-60x120': 'cer', 'ap-metro': 'marble', 'ap-zellige': 'marble',
    'pl-brass': 'faucet', 'pl-brushed': 'faucet', 'lt-track': 'brass', 'lt-sconce': 'brass' };
  var SWATCH = { paint: 1, plaster: 1, enamel: 1, matte: 1, molding: 1 };

  /* товары: [sku, slot, level, название, материал, hex, фактура, тон, подтон, металл, единица, цена, сумма, фото фактуры] */
  var ROWS = [
    ['fl-lam-walnut',   'floor', 'base',    'Ламинат 33 кл., орех',          'Ламинат',     '#4E3020', 'wood',        'warm', 'red',     null, 'м²', 1290,  55100, 'walnut-lam'],
    ['fl-parq-walnut',  'floor', 'premium', 'Паркет орех, ёлочка',           'Паркет',      '#4A2B1B', 'herringbone', 'warm', 'red',     null, 'м²', 4270, 182300, 'plaster-milk'],
    /* альтернативы пола для замены (раздел 9): сумма — цена × те же 42,7 м² */
    ['fl-lvt-walnut',   'floor', 'base',    'Кварц-винил, орех',             'Кварц-винил', '#523424', 'wood',        'warm', 'red',     null, 'м²', 1650,  70500, 'walnut-lam'],
    ['fl-lam-oak',      'floor', 'base',    'Ламинат, дуб светлый',          'Ламинат',     '#C8A77E', 'wood',        'warm', 'neutral', null, 'м²',  990,  42300, 'oak-lam'],
    ['fl-eng-walnut',   'floor', 'premium', 'Инж. доска, орех',              'Инж. доска',  '#47291A', 'wood',        'warm', 'red',     null, 'м²', 3480, 148600, 'walnut'],
    ['fl-parq-oak',     'floor', 'premium', 'Керамогранит под дерево',       'Керамогранит', '#8B6440', 'tileBig',    'warm', 'yellow',  null, 'м²', 3900, 166500, 'oak'],   /* имя — по эталону etalon-swap (25.10) */

    ['ft-60',      'floorTile',  'base',    'Керамогранит 60×60',            'Керамогранит', '#B7AA99', 'tile',     'warm', null,  null,     'м²',     1190,  12400, 'tile-taupe-60'],
    ['ft-120',     'floorTile',  'premium', 'Керамогранит 60×120, мат',      'Керамогранит', '#BBAE9E', 'tileBig',  'warm', null,  null,     'м²',     3290,  34200, 'plaster-milk'],
    ['wl-paint',   'walls',      'base',    'Краска моющаяся',               'Краска',       '#E8E0D2', 'paint',    'warm', null,  null,     'м²',      210,  24800, 'paint-milk'],
    ['wl-plaster', 'walls',      'premium', 'Декоративная штукатурка',       'Штукатурка',   '#E6DDCE', 'plaster',  'warm', null,  null,     'м²',     1450,  87000, 'plaster-milk'],
    ['ac-paint',   'accentWall', 'base',    'Краска матовая',                'Краска',       '#5F6C40', 'paint',    'warm', null,  null,     'м²',      230,   2200, 'paint-olive'],
    ['ac-mineral', 'accentWall', 'premium', 'Краска минеральная',            'Краска',       '#5C693C', 'plaster',  'warm', null,  null,     'м²',      690,   6600, 'paint-olive'],
    ['bw-20x60',   'bathWalls',  'base',    'Плитка 20×60, глянец',          'Плитка',       '#EAE2D5', 'tileWall', 'warm', null,  null,     'м²',     1090,  19600, 'tile-milk'],
    ['bw-60x120',  'bathWalls',  'premium', 'Керамогранит 60×120',           'Керамогранит', '#E5DCCD', 'tileBig',  'warm', null,  null,     'м²',     2150,  38700, 'plaster-milk'],
    ['ap-metro',   'apron',      'base',    'Кабанчик, изумруд',             'Плитка',       '#3F5541', 'metro',    'warm', null,  null,     'м²',     1400,   2500, 'enamel-emerald'],
    ['ap-zellige', 'apron',      'premium', 'Зеллиж ручной, изумруд',        'Плитка',       '#3B5340', 'zellige',  'warm', null,  null,     'м²',     6900,  12400, 'zellige-emerald'],
    ['dr-enamel',  'doors',      'base',    'Эмаль, гладкие',                'Двери',        '#EAE3D6', 'enamel',   'warm', 'red', null,     'шт',    14500,  58000, 'paint-milk'],
    ['dr-hidden',  'doors',      'premium', 'Скрытые, под покраску',         'Двери',        '#E8E0D3', 'paint',    'warm', 'red', null,     'шт',    27000, 108000, 'paint-milk'],
    ['ml-mdf',     'moldings',   'base',    'МДФ-плинтус',                   'Плинтус',      '#E9E1D3', 'enamel',   'warm', null,  null,     'м',       290,  11600, 'paint-milk'],
    ['ml-gypsum',  'moldings',   'premium', 'Гипсовые молдинги',             'Молдинги',     '#ECE5D9', 'molding',  'warm', null,  null,     'м',       890,  35600, 'plaster-milk'],
    ['cl-stretch', 'ceiling',    'base',    'Натяжной матовый',              'Потолок',      '#EDE7DC', 'paint',    'warm', null,  null,     'м²',      650,  30500, 'paint-milk'],
    ['cl-gkl',     'ceiling',    'premium', 'Окраска по ГКЛ',                'Потолок',      '#EAE3D7', 'plaster',  'warm', null,  null,     'м²',     1150,  54000, 'plaster-milk'],
    ['pl-brass',   'plumbing',   'base',    'Смесители, покрытие латунь',    'Сантехника',   '#C39858', 'metal',    'warm', null,  'латунь', 'компл.', 18600,  18600, 'brass-plate'],
    ['pl-brushed', 'plumbing',   'premium', 'Смесители, латунь брашир.',     'Сантехника',   '#C69C5E', 'brushed',  'warm', null,  'латунь', 'компл.', 46800,  46800, 'plaster-milk'],
    ['lt-track',   'light',      'base',    'Трек + споты, латунь',          'Свет',         '#C49A5A', 'metal',    'warm', null,  'латунь', 'компл.', 21400,  21400, 'brass-plate'],
    ['lt-sconce',  'light',      'premium', 'Бра и споты, латунь',           'Свет',         '#C29757', 'brushed',  'warm', null,  'латунь', 'компл.', 52400,  52400, 'brass'],
    ['hw-sockets', 'hardware',   'base',    'Розетки графит',                'Фурнитура',    '#2F2B28', 'matte',    'warm', null,  null,     'компл.',  9800,   9800, null],
    ['hw-handles', 'hardware',   'premium', 'Розетки + ручки, графит мат',   'Фурнитура',    '#2C2826', 'matte',    'warm', null,  null,     'компл.', 24600,  24600, null]
  ];
  /* основные (База / Премиум) — первые два у слота; остальные — альтернативы */
  KB.ITEMS = ROWS.map(function (r, i) {
    var t = r[13];
    return { sku: r[0], pid: 910001 + i, slot: r[1], level: r[2], name: r[3], material: r[4], hex: r[5], texture: r[6],
      tone: r[7], undertone: r[8], metal: r[9], unit: r[10], price: r[11], sum: r[12],
      qty: Math.round(r[12] / r[11] * 10) / 10,
      photo: PHOTO[r[0]] ? SW + PHOTO[r[0]] + '.jpg' : null, photoSq: PHOTO[r[0]] ? SW + PHOTO[r[0]] + '-sq.jpg' : null, swatch: !PHOTO[r[0]] && SWATCH[r[6]] ? r[5] : null,
      textureUrl: typeof t === 'string' ? TEX + t + '.jpg' : null, crop: null };
  });
  var MAIN = {};
  KB.ITEMS.forEach(function (it) { var m = MAIN[it.slot] || (MAIN[it.slot] = {}); if (!m[it.level]) { m[it.level] = it.sku; it.main = true; } });

  KB.slot = function (key) { return KB.SLOTS.filter(function (s) { return s.key === key; })[0] || null; };
  KB.item = function (sku) { return KB.ITEMS.filter(function (x) { return x.sku === sku; })[0] || null; };
  KB.itemsFor = function (slot) { return KB.ITEMS.filter(function (x) { return x.slot === slot; }); };
  KB.mainFor = function (slot, level) { return KB.item((MAIN[slot] || {})[level === 'premium' ? 'premium' : 'base']); };
  /* цвет ДНК для слота: по ключу; у ДНК капсулы или картинки ключей может не быть — тогда ближайший по ΔE к цвету примера */
  /* ключ цвета ДНК (у ДНК капсулы или картинки ключей нет — ближайший цвет примера по ΔE) */
  KB.dnaKey = function (c) {
    if (c.key) return c.key; if (!KB.deltaE) return null;
    return KB.DNA.slice().sort(function (a, b) { return KB.deltaE(c.hex, a.hex) - KB.deltaE(c.hex, b.hex); })[0].key;
  };
  KB.dnaColor = function (dna, key) {
    var list = dna || KB.DNA, hit = list.filter(function (c) { return c.key === key; })[0]; if (hit) return hit;
    var base = KB.DNA.filter(function (c) { return c.key === key; })[0]; if (!base || !KB.deltaE) return null;
    return list.slice().sort(function (a, b) { return KB.deltaE(base.hex, a.hex) - KB.deltaE(base.hex, b.hex); })[0] || null;
  };
})();
