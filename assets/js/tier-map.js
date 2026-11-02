/* Метки «База» / «Премиум» на карточках товаров.
   Источник — services/api/ai_knowledge/classifier.md, собирает tools/gen_tiers.py — не править руками.
   Уровень — только по бренду или материалу, без цен; первая подошедшая позиция решает;
   подошли и база, и премиум — метки нет. Без метки (различие только ценой): Стены, Потолок, Стык между напольным покрытием, Двери, Точечные светильники, Декоративный свет, Встроенная мебель, Кровать, Диван, Стол, Стулья, Журнальный стол, Тумба под ТВ, Прикроватные тумбы, Консоль, Пуф, декор.
   Слова: префикс слова («краск» = краска, краски); «a+b» — все части; «^x» — название начинается с x;
   «x$» — слово целиком; фраза — подряд.
   Бренды: «БРЕНД» или «БРЕНД|СЕРИЯ» (серия ищется в названии); сначала поле brand, если там нет ни одного
   бренда позиции — бренд ищется в названии (у магазинов-агрегаторов бренд производителя только в названии). */
(function () {
  var S = window.SOVE = window.SOVE || {};
  var RULES = [{"pos": "Затирка", "src": "Затирка, 1 л", "match": {"words": ["затирк"]}, "base": {"brands": [], "words": ["цементн"]}, "premium": {"brands": [], "words": ["эпоксид"]}}, {"pos": "Столешница", "src": "Столешница, 1 м п.", "match": {"words": ["^столешниц"]}, "base": {"brands": [], "words": ["акрил", "hpl"]}, "premium": {"brands": [], "words": ["кварц", "мрамор"]}}, {"pos": "Фасады", "src": "Фасады", "match": {"words": ["^фасад"], "not": ["фасадн"]}, "base": {"brands": ["EGGER"], "words": ["пленк"]}, "premium": {"brands": ["AGT"], "words": ["шпон", "эмал"]}}, {"pos": "Молдинги и карнизы", "src": "Молдинги и потолочные карнизы", "match": {"category": ["Отделка"], "words": ["молдинг", "^карниз", "потолочн+карниз", "галтел", "потолочн+плинтус"], "not": ["штор", "гардин"]}, "base": {"brands": [], "words": ["дюрополимер", "полистирол"]}, "premium": {"brands": [], "words": ["гипс"]}}, {"pos": "Керамогранит", "src": "Базовый керамогранит, м²", "match": {"category": ["Отделка"], "subcat": ["Керамогранит"], "words": ["керамогранит", "керамическ+плитк"], "not": ["обои"]}, "base": {"brands": ["VITRA", "LAPARET", "CRETO", "KERAMA MARAZZI"], "words": []}, "premium": {"brands": ["ITALON", "NT CERAMIC", "ATLAS CONCORDE"], "words": []}}, {"pos": "Напольное покрытие", "src": "Напольное покрытие, м²", "match": {"category": ["Отделка"], "subcat": ["Напольные покрытия"], "words": ["ламинат", "spc", "кварцвинил", "lvt", "инженерн+доск", "паркет"], "not": ["керамогранит", "керамич", "клинкер", "обои", "^плинтус", "^подложк", "^клей", "^порог", "^порожек", "^герметик", "^лак", "^масло", "^грунт", "^средств", "^шнур", "^профил"]}, "base": {"brands": [], "words": ["ламинат", "spc", "кварцвинил", "lvt", "пвх", "винилов"]}, "premium": {"brands": ["QUARTZ PARQUET"], "words": ["инженерн+доск", "^паркет", "паркетн+доск", "модульн+паркет", "штучн+паркет"]}}, {"pos": "Акцентный камень", "src": "Акцентный камень", "match": {"category": ["Отделка"], "subcat": ["Камень"], "words": ["гибк+камен", "мрамор"], "not": ["обои", "керамогранит", "керамич", "плитк", "под мрамор", "штукатур", "краск", "пвх", "эффект", "имитац"]}, "base": {"brands": [], "words": ["гибк+камен"]}, "premium": {"brands": [], "words": ["мрамор"]}}, {"pos": "Панели", "src": "Панели, 1 м²", "match": {"category": ["Отделка"], "subcat": ["Панели"], "words": ["^панел", "^стенов+панел"], "not": ["под шпон"]}, "base": {"brands": ["EGGER"], "words": ["бамбук"]}, "premium": {"brands": [], "words": ["шпон"]}}, {"pos": "Краска", "src": "Краска, за 1 л", "match": {"category": ["Отделка"], "words": ["^краск", "краска$", "краски$", "emulsion", "эмульси"], "not": ["обои", "картин", "репродукц"]}, "base": {"brands": ["LANORS", "MONS", "SWISS LAKE"], "words": []}, "premium": {"brands": ["LITTLE GREENE", "ARGILE"], "words": []}}, {"pos": "Выключатели и розетки", "src": "Выключатели и розетки, за 1 пост", "match": {"category": ["Розетки и выключатели"]}, "base": {"brands": ["SCHNEIDER ELECTRIC|ATLAS DESIGN", "SCHNEIDER ELECTRIC|ART GALLERY"], "words": []}, "premium": {"brands": ["VOLTUM|S70", "DONEL|R98"], "words": []}}, {"pos": "Сантехника", "src": "Вся сантехника под ключ на 1 санузел, включая инсталляции", "match": {"category": ["Сантехника"]}, "base": {"brands": ["KASANYE", "WASSERKRAFT", "BOHEME"], "words": []}, "premium": {"brands": ["FIMA", "HANSGROHE", "GESSI"], "words": []}}, {"pos": "Техника", "src": "Вся техника на кухню + стиральная машина", "match": {"category": ["Техника"], "not": ["^батарейк", "^средств", "^фильтр", "^сковород", "^кастрюл", "^ковш", "^сотейник", "^посуд", "^нож", "^таблетк", "^соль", "^ополаскивател", "^чистящ", "^шланг", "^сифон", "^аксессуар"]}, "base": {"brands": ["WEISSGAUFF", "MAUNFELD", "KORTING", "KUPPERSBERG"], "words": []}, "premium": {"brands": ["BOSCH", "AEG", "HAIER", "ASKO"], "words": []}}];
  var SYN = {"SCHNEIDER ELECTRIC": ["SCHNEIDER", "SHNIEDER", "ШНАЙДЕР"], "KERAMA MARAZZI": ["KERAMA MARATZZI", "KERAMAMARAZZI", "КЕРАМА МАРАЦЦИ"], "ITALON": ["ITALONCERAMICA", "ИТАЛОН"], "ATLAS CONCORDE": ["АТЛАС КОНКОРД"], "WASSERKRAFT": ["WASSERCRAFT", "WASSER KRAFT", "ВАССЕРКРАФТ"], "BOHEME": ["БОГЕМА"], "HANSGROHE": ["ХАНСГРОЕ"], "KUPPERSBERG": ["KUPERSBERG", "КУПЕРСБЕРГ", "КУППЕРСБЕРГ"], "WEISSGAUFF": ["WAISGAUF", "WEISGAUFF", "ВАЙСГАУФ", "ВАЙСГАУФФ"], "BOSCH": ["BOSH", "БОШ"], "MAUNFELD": ["МАУНФЕЛЬД"], "KORTING": ["КОРТИНГ"], "HAIER": ["ХАЙЕР"], "ASKO": ["АСКО"], "LITTLE GREENE": ["LITTLEGREENE"], "QUARTZ PARQUET": ["QUARTZPARQUET"], "VOLTUM": ["ВОЛЬТУМ"], "DONEL": ["ДОНЕЛ"]};

  function up(s) { return (' ' + String(s || '').toUpperCase().replace(/Ё/g, 'Е').replace(/[^A-ZА-Я0-9]+/g, ' ') + ' ').replace(/\s+/g, ' '); }
  function low(s) { return (' ' + String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ') + ' ').replace(/\s+/g, ' '); }
  function squash(s) { return String(s || '').replace(/ /g, ''); }
  /* слово из правила в названии (n — low(name)) */
  function hasWord(n, w) {
    if (w.indexOf('+') > 0) return w.split('+').every(function (x) { return hasWord(n, x); });
    var start = w.charAt(0) === '^', end = w.charAt(w.length - 1) === '$';
    var core = ' ' + w.slice(start ? 1 : 0, end ? -1 : undefined) + (end ? ' ' : '');
    return start ? n.indexOf(core) === 0 : n.indexOf(core) >= 0;
  }
  function anyWord(n, ws) { return (ws || []).some(function (w) { return hasWord(n, w); }); }
  function inList(v, list) { v = String(v || '').trim().toLowerCase(); return list.some(function (x) { return x.toLowerCase() === v; }); }
  /* бренд правила (с синонимами) в строке h (h — up(...)) */
  function variants(b) { return [b].concat(SYN[b] || []); }
  function hasBrand(h, b) {
    var sq = squash(h);
    return variants(b).some(function (v) { return h.indexOf(' ' + v + ' ') >= 0 || (sq.length && sq === squash(v)); });
  }
  function brandHit(h, nameUp, entry) {
    var parts = entry.split('|');
    if (!hasBrand(h, parts[0])) return false;
    return parts.length < 2 || squash(nameUp).indexOf(squash(parts[1])) >= 0;
  }
  function brandsIn(h, nameUp, side) { return (side.brands || []).some(function (e) { return brandHit(h, nameUp, e); }); }
  function applies(m, p, n) {
    if (m.category && !inList(p.category, m.category)) return false;
    if (m.not && anyWord(n, m.not)) return false;
    if (!m.subcat && !m.words) return true;
    return (m.subcat && inList(p.subcat, m.subcat)) || anyWord(n, m.words);
  }
  /* 'base' | 'premium' | null */
  S.tier = function (p) {
    if (!p || !p.name) return null;
    var n = low(p.name), nameUp = up(p.name), brUp = up(p.brand);
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (!applies(r.match, p, n)) continue;
      /* бренд: сначала поле brand; если там нет ни одного бренда позиции — ищем бренд в названии */
      var hb = brandsIn(brUp, nameUp, r.base), hp = brandsIn(brUp, nameUp, r.premium);
      if (!hb && !hp) { hb = brandsIn(nameUp, nameUp, r.base); hp = brandsIn(nameUp, nameUp, r.premium); }
      var b = hb || anyWord(n, r.base.words), pr = hp || anyWord(n, r.premium.words);
      return b && !pr ? 'base' : pr && !b ? 'premium' : null;
    }
    return null;
  };
  S.tierLabel = function (t) { return t === 'premium' ? 'Премиум' : t === 'base' ? 'База' : ''; };
  S.tierRules = RULES;
})();
