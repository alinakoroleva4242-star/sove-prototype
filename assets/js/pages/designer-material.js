/* Карточка материала — модель (ТЗ «Карточка материала», шаг 1).
   Единица заполнения капсулы — карточка, а не строка комнаты. Здесь: сборка карточек из строк таблиц (База + Премиум),
   правки дизайнера поверх сборки и expand() — карточка → строки капсулы по комнатам.

   material = { id, capsule, version, position, title, category, zones:[{room, share}], base:product|null, premium:product|'same'|null,
     alts:{ base:[product], premium:[product] },
     by_flat:  null | { studio|k1|k2|k3|k4: 'same' | 'none' | { base:product, premium:product } },
     by_index: null | { [room]: { 2:{base, premium}, 3:{…} } },
     origin:'table'|'manual'|'spec', note, unit, rule, work, keys:[ключи строк таблицы] }

   Как строки таблицы превращаются в карточки (раздел 6 ТЗ):
   1. База и Премиум склеиваются по ключу строки.  2. Один товар в нескольких комнатах — одна карточка с несколькими зонами.
   3. «…, тип 1/2/3/4» — одна карточка, тип 1 основной, остальные — by_index (комнаты 2, 3, 4).
   4. Размер в названии — одна карточка, by_flat: метраж — по порогам 30/50/80/100 м²; длина — по возрастанию от Студии;
      размеров больше пяти — лишние уходят в замены (ДОПУЩЕНИЕ: в ТЗ про это не сказано).
   5. «ДОПОЛНИТЕЛЬНЫЙ», повтор названия и варианты по цвету — замены.  6. Полные дубли — остаётся один.
   7. Комнаты нет в строке: позиция бывает в комнатах капсулы по справочнику — зоны оттуда; позиции нет в справочнике — «Не размещены». */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var st = DC.st, POS = DC.POS, price = DC.price;
  /* «тот же товар» для карточек — совпадают и товар, и цена: в таблицах у Премиума бывает то же название с другой ценой */
  function same(a, b) { return !!a && !!b && DC.sameProduct(a, b) && Math.abs(price(a) - price(b)) < 0.01 && Math.abs((a.price_retail || 0) - (b.price_retail || 0)) < 0.01; }
  /* доля по умолчанию: в таблицах дизайнеров акцентная стена — «Доля в комнате 0,25» */
  var SHARE0 = { accent_wall: 0.25 };
  /* типы квартир — как в калькуляторе («Размеры комнат (классификация)»): 1 Студия · 2 Евро-2 · 3 Евро-3 · 4 Евро-4 · 5 Евро-5 */
  var FLATS = [['studio', 'Студия', 30], ['k1', 'Евро-2', 50], ['k2', 'Евро-3', 80], ['k3', 'Евро-4', 100], ['k4', 'Евро-5', Infinity]];
  DC.FLATS = FLATS;

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); }
  function prod(p) { return p ? { source: p.source || 'table', id: p.id || null, name: p.name || '', brand: p.brand || '', url: p.url || '', img: p.img || '', price_retail: p.price_retail || 0, price_metod: p.price_metod || 0, unit: p.unit || '' } : null; }
  function firstNum(v) { var m = String(v || '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
  /* название без комнаты, «тип N», размера и слова «дополнительный» — по нему строки без позиции собираются в одну карточку */
  function baseTitle(r) { return norm(DC.splitRoom(r.title).rest.replace(/,?\s*тип\s*\d+/i, ' ').replace(/дополнительн[а-яё]*/i, ' ').replace(/\d+([-–]\d+)?\s*(см|мм|м2|м²|")|\bd\s?\d+|\d+\s*[xх]\s*\d+/gi, ' ')); }

  /* комнаты для строки без комнаты: где позиция бывает по справочнику среди комнат капсулы; «Общее» — если она только общая */
  function autoZones(code, pos, real) {
    var P = pos && POS[pos]; if (!P) return [];
    var hit = P.rooms.filter(function (r) { return r !== 'Общее' && real.indexOf(r) >= 0; });
    /* в капсуле Гостиная и Кухня отдельно, а в справочнике позиция записана на Кухню-гостиную (или наоборот) */
    if (!hit.length && P.rooms.indexOf('Кухня-гостиная') >= 0) hit = real.filter(function (r) { return r === 'Гостиная' || r === 'Кухня'; });
    return hit.length ? hit : (P.rooms.indexOf('Общее') >= 0 || P.rooms.length ? ['Общее'] : []);
  }

  /* ── сборка карточек из строк одной капсулы ── */
  function build(code) {
    var B = DC.rowsFor(code, 'база'), Pm = DC.rowsFor(code, 'премиум'); if (!B || !Pm) return null;
    var real = DC.realRooms(code), pk = {}, used = {}, cards = [], dropped = [];
    Pm.forEach(function (r) { pk[r.key] = r; });
    function premOf(r) { var x = pk[r.key]; if (x) used[r.key] = 1; return x ? prod(x.product) : null; }
    function pair(r) { return { base: prod(r.product), premium: premOf(r) }; }

    function fromRows(rows, levelBase) {
      /* ячейка = позиция (или название) × комната */
      var cells = {}, order = [];
      rows.forEach(function (r) { var gk = r.pos || 'T:' + baseTitle(r), ck = gk + '|' + (r.room || ''); if (!cells[ck]) { cells[ck] = { gk: gk, room: r.room || '', rows: [] }; order.push(ck); } cells[ck].rows.push(r); });
      order.forEach(function (ck) {
        var c = cells[ck], mains = c.rows.filter(function (r) { return r.role !== 'alt'; }), alts = c.rows.filter(function (r) { return r.role === 'alt'; });
        var idx = mains.filter(function (r) { return r.variant && r.variant.by === 'room_index'; }), size = mains.filter(function (r) { return r.variant && r.variant.by === 'size'; });
        var plain = mains.filter(function (r) { return !r.variant || r.variant.by === 'color'; });
        var groups = [];   /* каждая группа = одна карточка: { main, idx, size, alts } */
        if (idx.length) { idx.sort(function (a, b) { return Number(a.variant.value) - Number(b.variant.value); }); groups.push({ main: idx[0], idx: idx.slice(1), size: [], alts: [] }); }
        if (size.length > 1) { size.sort(function (a, b) { return firstNum(a.variant.value) - firstNum(b.variant.value); }); groups.push({ main: size[0], idx: [], size: size, alts: [] }); }
        else if (size.length === 1) plain.push(size[0]);
        if (plain.length > 1 && plain.every(function (r) { return r.color; }) && plain.some(function (r) { return r.color !== plain[0].color; })) groups.push({ main: plain[0], idx: [], size: [], alts: plain.slice(1) }); /* варианты по цвету — замены */
        else if (plain.length) { /* несколько товаров на одной позиции в одной зоне (акцентная стена: штукатурка, микроцемент, панели, керамогранит) —
             правило «в зоне на позиции один основной»: первый основной, остальные — замены (клиент выбирает) */
          groups.push({ main: plain[0], idx: [], size: [], alts: plain.slice(1) });
        }
        if (!groups.length && alts.length) groups.push({ main: alts.shift(), idx: [], size: [], alts: [] });   /* одни замены без основной строки */
        if (groups.length) groups[0].alts = groups[0].alts.concat(alts);
        groups.forEach(function (g) { cards.push(card(c, g, levelBase)); });
      });
    }
    function card(c, g, levelBase) {
      var m = g.main, P = m.pos && POS[m.pos], pr = levelBase ? pair(m) : { base: null, premium: prod(m.product) };
      var k = { id: 'm|' + m.key, capsule: code, version: DC.versionOf(code), position: m.pos || '', title: P ? P.name : DC.splitRoom(m.title).rest, category: P ? P.cat : m.category,
        zones: [], base: pr.base, premium: pr.premium, alts: { base: [], premium: [] }, by_flat: null, by_index: null, origin: m.added ? (m.origin === 'gen' || m.origin === 'import' || m.origin === 'spec' ? 'spec' : 'manual') : 'table', note: '',
        unit: m.unit || '', rule: m.qty_rule || '', work: m.work_code || '', share: m.share || 1, keys: [m.key], gk: c.gk, guess: !!m.posGuess };
      var all = [k.base, k.premium];
      function addAlt(r) {
        var b = levelBase ? prod(r.product) : null, p = levelBase ? premOf(r) : prod(r.product);
        [['base', b], ['premium', p]].forEach(function (x) { if (!x[1]) return; var main = x[0] === 'base' ? k.base : k.premium; if (same(x[1], main) || k.alts[x[0]].some(function (y) { return same(y, x[1]); })) { dropped.push(x[1]); return; } k.alts[x[0]].push(x[1]); });
        k.keys.push(r.key);
      }
      if (g.idx.length) { k.by_index = {}; var room = c.room || '?'; k.by_index[room] = {}; g.idx.forEach(function (r) { k.by_index[room][Number(r.variant.value)] = levelBase ? pair(r) : { base: null, premium: prod(r.product) }; k.keys.push(r.key); }); }
      if (g.size.length) {
        var byArea = g.size.every(function (r) { return /м2|м²/i.test(r.variant.value); }), slots = {};
        g.size.forEach(function (r, i) {
          var f = byArea ? FLATS.filter(function (x) { return firstNum(String(r.variant.value).split(/[-–]/).pop()) <= x[2]; })[0][0] : (FLATS[i] || [])[0];
          if (!f || slots[f]) { addAlt(r); return; }     /* размеров больше, чем типов квартир — в замены */
          slots[f] = levelBase ? pair(r) : { base: null, premium: prod(r.product) };
          if (r !== m) { k.keys.push(r.key); if (same(slots[f].base || slots[f].premium, k.base || k.premium)) { if (slots[f].base) dropped.push(slots[f].base); if (slots[f].premium) dropped.push(slots[f].premium); } } /* тот же товар записан на два размера — второй раз не нужен */
        });
        /* большие квартиры без своего размера получают самый большой из имеющихся */
        var last = null; k.by_flat = {}; FLATS.forEach(function (x) { if (slots[x[0]]) last = slots[x[0]]; k.by_flat[x[0]] = slots[x[0]] ? (same(slots[x[0]].base || slots[x[0]].premium, k.base || k.premium) ? 'same' : slots[x[0]]) : (last && !same(last.base || last.premium, k.base || k.premium) ? last : 'same'); });
      }
      if (m.pos === 'oven' && !g.size.length) { /* калькулятор: до 60 м² обычный духовой шкаф, от 60 м² — с СВЧ */
        var svch = g.alts.filter(function (r) { return /свч/i.test(r.title + ' ' + ((r.product || {}).name || '')); })[0];
        if (svch) { g.alts = g.alts.filter(function (r) { return r !== svch; }); var sv = levelBase ? pair(svch) : { base: null, premium: prod(svch.product) }; k.by_flat = { studio: 'same', k1: 'same', k2: sv, k3: sv, k4: sv }; k.keys.push(svch.key); }
      }
      g.alts.forEach(addAlt);
      if (k.premium && k.base && same(k.premium, k.base)) k.premium = 'same';
      k.zones = (c.room ? [c.room] : autoZones(code, m.pos, real)).map(function (r) { return { room: r, share: SHARE0[m.pos] || m.share || 1 }; });
      k.auto = !c.room && k.zones.length > 0;     /* зоны не из таблицы, а из справочника — дизайнеру стоит проверить */
      if (k.by_index && k.by_index['?']) { var z = k.zones[0] ? k.zones[0].room : ''; if (z) { k.by_index[z] = k.by_index['?']; } delete k.by_index['?']; if (!Object.keys(k.by_index).length) k.by_index = null; }
      return k;
    }
    fromRows(B, true);
    fromRows(Pm.filter(function (r) { return !used[r.key]; }), false);     /* строки, которые есть только в Премиуме */

    /* один товар в нескольких комнатах — одна карточка с несколькими зонами */
    var out = [];
    cards.forEach(function (k) {
      var t = !k.by_index && !k.by_flat ? out.filter(function (o) { return o.gk === k.gk && !o.by_index && !o.by_flat && same(o.base || o.premium, k.base || k.premium) && (o.premium === 'same') === (k.premium === 'same'); })[0] : null;
      if (!t) { out.push(k); return; }
      k.zones.forEach(function (z) { if (!t.zones.some(function (y) { return y.room === z.room; })) t.zones.push(z); });
      ['base', 'premium'].forEach(function (lv) { k.alts[lv].forEach(function (a) { if (!t.alts[lv].some(function (y) { return same(y, a); })) t.alts[lv].push(a); else dropped.push(a); }); });
      t.keys = t.keys.concat(k.keys); dropped.push(k.base); dropped.push(k.premium === 'same' ? k.base : k.premium);
    });
    return { cards: out, dropped: dropped.filter(Boolean), rows: { base: B.length, premium: Pm.length } };
  }

  /* ── правки дизайнера поверх сборки: хранятся отдельно и переживают перезагрузку таблицы ── */
  function overlay(code) { var all = DC.db('mats', {}); return all[code] || (all[code] = { patch: {}, added: [], removed: {} }); }
  DC.matOverlay = overlay;
  var cache = {};
  DC.matReset = function (code) { if (code) delete cache[code]; else cache = {}; };
  DC.materials = function (code) {
    var t = st.tables, sig = [DC.tkey(code, 'база'), DC.tkey(code, 'премиум')].map(function (k) { return t[k] ? t[k].rows.length + ':' + JSON.stringify(st.edits[k] || '').length : '-'; }).join('|');
    var c = cache[code]; if (!c || c.sig !== sig) { var b = build(code); if (!b) return null; c = cache[code] = { sig: sig, built: b }; }
    var ov = overlay(code);
    return c.built.cards.filter(function (k) { return !ov.removed[k.id]; }).map(function (k) { return ov.patch[k.id] ? DC.merge(k, ov.patch[k.id]) : k; }).concat(ov.added);
  };
  DC.matBuilt = function (code) { DC.materials(code); return cache[code] ? cache[code].built : null; };

  /* ── карточка → строки капсулы. flat: studio|k1|…|null («Все комнаты капсулы») ── */
  function flatRooms(code, flat) { if (!flat || !DC.aptTypes) return null; var t = DC.aptTypes().filter(function (x) { return x.code === FLAT_CODE[flat]; })[0]; return t ? t.rooms : null; }
  var FLAT_CODE = { studio: 'studio', k1: 'euro2', k2: 'euro3', k3: 'euro4', k4: 'euro5' };
  DC.expand = function (m, flat, level) {
    var lv = level === 'премиум' || level === 'premium' ? 'premium' : 'base', rows = [], fr = flatRooms(m.capsule, flat), ov = flat && m.by_flat ? m.by_flat[flat] : null;
    if (ov === 'none') return rows;
    function pick(x) { if (!x) return null; var p = lv === 'premium' ? (x.premium === 'same' || x.premium == null ? x.base : x.premium) : x.base; return p || null; }
    var mainP = (ov && ov !== 'same' ? pick(ov) : null) || pick(m);
    function row(room, p, variant, role, slot) { return { capsule: m.capsule, version: m.version, room: room, position: m.position || null, level: lv, slot: slot || 1, variant: variant || null, role: role || 'main', product: p, share: 1, qty_rule: m.rule || null, unit: m.unit || null, work_code: m.work || null, origin: m.origin, material: m.id, title: m.title, category: m.category || '' }; }
    m.zones.forEach(function (z) {
      var n = 1;
      if (fr) { /* в этом типе квартиры комната есть? сколько раз? Кухня-гостиная типа = Гостиная и Кухня капсулы */
        n = fr.filter(function (r) { return r === z.room || (r === 'Кухня-гостиная' && (z.room === 'Гостиная' || z.room === 'Кухня')) || ((r === 'Гостиная' || r === 'Кухня') && z.room === 'Кухня-гостиная'); }).length;
        if (z.room === 'Общее') n = 1; if (!n) return;
      }
      var r0 = row(z.room, mainP); r0.share = z.share || 1; if (z.qty != null) r0.qty = z.qty; rows.push(r0);
      var bi = m.by_index && m.by_index[z.room];
      if (fr) { for (var i = 2; i <= n; i++) { var r = row(z.room, pick(bi && bi[i]) || mainP, { by: 'room_index', value: String(i) }); r.share = z.share || 1; rows.push(r); } }
      else if (bi) Object.keys(bi).forEach(function (i) { rows.push(row(z.room, pick(bi[i]), { by: 'room_index', value: String(i) })); });
      if (!fr && m.by_flat) FLATS.forEach(function (f) { var v = m.by_flat[f[0]]; if (v && v !== 'same' && v !== 'none' && pick(v)) rows.push(row(z.room, pick(v), { by: 'flat', value: f[0] })); });
      m.alts[lv].forEach(function (a, k) { rows.push(row(z.room, a, null, 'alt', k + 1)); });
    });
    return rows;
  };
  DC.matRows = function (code, level, flat) { var ms = DC.materials(code) || [], out = []; ms.forEach(function (m) { out = out.concat(DC.expand(m, flat || null, level)); }); return out; };

  /* ── список комнат читает карточки: ячейка = комната × позиция, собранная из строк expand() ── */
  DC.matById = function (code, id) { return (DC.materials(code) || []).filter(function (m) { return m.id === id; })[0] || null; };
  DC.matPatch = function (code, id, p) {
    var ov = overlay(code), a = ov.added.filter(function (m) { return m.id === id; })[0];
    if (a) Object.keys(p).forEach(function (k) { a[k] = p[k]; }); else ov.patch[id] = DC.merge(ov.patch[id] || {}, p);
    DC.saveStore();
  };
  /* новый материал: товар в Базе, позиция подставляется по названию товара; зона ставится сразу, только если позиция бывает в одной комнате капсулы */
  /* позиция справочника для товара: позиция в каталоге → подкатегория → название товара */
  /* разметка каталога: товар → позиция справочника. Пока в каталоге нет поля «позиция», выбор дизайнера запоминается здесь
     (в настоящем приложении — поле position у товара каталога, см. design/TZ-poziciya-v-kataloge.md) */
  DC.catPos = function (p, code) { var x = DC.store().extra; x.catPos = x.catPos || {}; if (!p || !p.id) return ''; var k = (p.source || 'catalog') + ':' + p.id; if (code) { x.catPos[k] = code; DC.saveStore(); } return x.catPos[k] || ''; };
  /* категория каталога ↔ категория справочника: «Мебель» каталога = обе мебели справочника */
  function catOk(code, ccat) { if (!ccat || !POS[code]) return true; var a = String(POS[code].cat).toLowerCase(), b = String(ccat).toLowerCase(); return a === b || a.split(' ')[0] === b.split(' ')[0]; }
  function stems(t) { return String(t || '').toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/).filter(function (w) { return w.length > 2; }).map(function (w) { return w.slice(0, Math.max(4, w.length - 2)); }); }
  /* слова, которыми в каталоге называют позицию иначе, чем в справочнике */
  var SYN = [[/настенн/, 'sconce'], [/напольн.*(светил|ламп)|торшер/, 'floor_lamp'], [/(точечн|встраив).*(светил|спот)|спот/, 'recessed'], [/подвесн.*(светил|ламп)/, 'pendant'], [/настольн.*(ламп|светил)/, 'table_lamp'], [/трек/, 'track']];
  DC.posOfProduct = function (p) {
    if (!p) return ''; if (p.pos && POS[p.pos]) return p.pos; var known = DC.catPos(p); if (known && POS[known]) return known;
    var tries = [p.cpos, p.csub, p.name].filter(Boolean);
    for (var i = 0; i < tries.length; i++) { var r = DC.resolvePos(tries[i], '', p.ccat || '') || DC.guessPos(tries[i], '', p.ccat || ''); if (r && POS[r] && catOk(r, p.ccat)) return r; }
    var nm = String(p.name || '').toLowerCase().replace(/ё/g, 'е');
    for (var k = 0; k < SYN.length; k++) if (SYN[k][0].test(nm) && POS[SYN[k][1]] && catOk(SYN[k][1], p.ccat)) return SYN[k][1];
    /* позиция, все слова которой есть в названии товара; из нескольких — самая длинная */
    var ws = stems(nm), best = '', bl = 0;
    Object.keys(POS).forEach(function (c) { if (POS[c].hidden || !catOk(c, p.ccat)) return; var ps = stems(POS[c].name); if (!ps.length) return; if (ps.every(function (x) { return ws.some(function (w) { return w.indexOf(x) === 0 || x.indexOf(w) === 0; }); }) && POS[c].name.length > bl) { best = c; bl = POS[c].name.length; } });
    return best;
  };

  DC.matAdd = function (code, product, opts) {
    opts = opts || {}; var pos = opts.position || (product ? DC.posOfProduct(product) : ''), P = pos && POS[pos], real = DC.realRooms(code);
    var zones = opts.zones || [];
    if (!zones.length && P) { var hit = P.rooms.filter(function (r) { return r !== 'Общее' && real.indexOf(r) >= 0; }); if (hit.length === 1) zones = [hit[0]]; else if (!hit.length && P.rooms.length === 1 && P.rooms[0] === 'Общее') zones = ['Общее']; }
    var m = { id: 'a|' + Date.now().toString(36) + Math.round(Math.random() * 1e4), capsule: code, version: DC.versionOf(code), position: P ? pos : '', title: P ? P.name : (product && product.name) || 'Новый материал', category: P ? P.cat : 'Без позиции в справочнике',
      zones: zones.map(function (r) { return { room: r, share: 1 }; }), base: product || null, premium: null, alts: { base: [], premium: [] }, by_flat: null, by_index: null, origin: opts.origin || 'manual', note: '', unit: P ? P.unit || '' : '', rule: P ? P.rule || '' : '', work: P ? P.work || '' : '', keys: [] };
    overlay(code).added.push(m); DC.saveStore(); return m.id;
  };
  DC.matRemove = function (code, id) { var ov = overlay(code); if (ov.added.some(function (m) { return m.id === id; })) ov.added = ov.added.filter(function (m) { return m.id !== id; }); else ov.removed[id] = 1; DC.saveStore(); };
  DC.matCells = function (code, level, room) {
    var ms = DC.materials(code); if (!ms) return null;
    var nm = String(room).match(/^(.*) (\d+)$/), idx = nm ? Number(nm[2]) : 1; if (nm) room = nm[1];   /* «Спальня 2» — вторая комната того же вида */
    var rows = DC.matRows(code, level, st.flat || null).filter(function (r) { return r.room === room && (idx > 1 ? (r.variant && r.variant.by === 'room_index' && Number(r.variant.value) === idx) : !(st.flat && r.variant && r.variant.by === 'room_index')); }), by = {}, order = [];
    rows.forEach(function (r) { var k = r.material; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(r); });
    function cell(id) {
      var rs = by[id].map(function (r) { return { key: id + '|' + r.room + '|' + (r.variant ? r.variant.by + r.variant.value : '') + '|' + r.role + r.slot, room: r.room, pos: r.position || '', title: r.title, product: r.product, share: r.share, qty: r.qty, qty_rule: r.qty_rule || '', unit: r.unit || '', role: r.role, variant: r.variant, origin: r.origin }; });
      var main = rs.filter(function (r) { return r.role === 'main' && !r.variant; })[0] || rs.filter(function (r) { return r.role === 'main'; })[0] || null, m = DC.matById(code, id);
      return { room: room, pos: main ? main.pos : '', rows: rs, slots: main ? [main] : [], variants: rs.filter(function (r) { return r.role === 'main' && r.variant; }), alts: rs.filter(function (r) { return r.role === 'alt'; }), main: main, mat: id, nopos: !(main && main.pos), auto: !!(m && m.auto), dep: !!(m && (m.by_flat || m.by_index)), noPrem: !!(m && !m.premium) };
    }
    var cells = [], seen = {};
    DC.KB.list.forEach(function (p) {
      var ids = order.filter(function (id) { return by[id][0].position === p.code; });
      if (ids.length) { ids.forEach(function (id) { cells.push(cell(id)); seen[id] = 1; }); }
      else if (room !== 'Общее' ? (!p.hidden && p.rooms.indexOf(room) >= 0) : (!p.hidden && p.rooms.length === 1 && p.rooms[0] === 'Общее')) cells.push({ room: room, pos: p.code, rows: [], slots: [], variants: [], alts: [], main: null });
    });
    order.forEach(function (id) { if (!seen[id]) cells.push(cell(id)); });
    return cells;
  };

  /* ── «Проверка» по карточкам (ТЗ п. 4.5): без зон · нет Премиума · доли в зоне больше 1 · позиция там, где её не бывает ·
     «зависит от квартиры» без товара — плюс прежние: нет позиции, товара, цены, фото, Премиум дешевле Базы, товар ссылкой ── */
  function fitsRoom(m, room) { var P = m.position && POS[m.position]; if (!P || room === 'Общее') return true; return P.rooms.indexOf(room) >= 0 || (P.rooms.indexOf('Кухня-гостиная') >= 0 && (room === 'Гостиная' || room === 'Кухня')); }
  DC.matIssues = function (code, level) {
    var ms = DC.materials(code); if (!ms) return null;
    var out = [], prem = level === 'премиум', sums = {}, mains = 0, partner = 0;
    function add(kind, m, text) { out.push({ kind: kind, title: (m.title || 'Материал') + (m.zones.length ? ' · ' + m.zones.slice(0, 3).map(function (z) { return z.room; }).join(', ') + (m.zones.length > 3 ? ' +' + (m.zones.length - 3) : '') : ''), text: text, go: { mat: m.id } }); }
    ms.forEach(function (m) {
      var p = prem ? (m.premium === 'same' ? m.base : m.premium) : m.base;
      if (!m.zones.length) { add('nozone', m, 'не выбраны зоны — материал не входит в интерьер и бюджет'); return; }
      if (!m.position) add('nopos', m, 'нет позиции в справочнике — выберите позицию в карточке');
      if (!m.base) add('noprod', m, 'в Базе товар не выбран — в бюджет уйдёт 0 ₽');
      if (!m.premium) add('noprem', m, 'нет товара Премиума — выберите его или отметьте «Премиум такой же, как База»');
      m.zones.forEach(function (z) { if (m.position) { var k = z.room + '|' + m.position; (sums[k] = sums[k] || { sum: 0, list: [], room: z.room }); sums[k].sum += z.share || 1; sums[k].list.push(m); } if (!fitsRoom(m, z.room)) add('badzone', m, 'по справочнику в зоне «' + z.room + '» этой позиции не бывает — проверьте'); });
      var holes = [];
      if (m.by_flat) DC.FLATS.forEach(function (f) { var v = m.by_flat[f[0]]; if (v && typeof v === 'object' && !v.base && !v.premium) holes.push(f[1]); });
      if (m.by_index) Object.keys(m.by_index).forEach(function (r) { Object.keys(m.by_index[r]).forEach(function (i) { var v = m.by_index[r][i]; if (v && !v.base && !v.premium) holes.push(r + ' ' + i); }); });
      if (holes.length) add('flatempty', m, '«другой товар» не выбран: ' + holes.join(', '));
      if (!p) return;
      mains++; if (p.price_metod > 0 && p.price_retail > p.price_metod) partner++;
      if (!price(p)) add('noprice', m, (p.name || 'товар') + ' — цены нет, в бюджет уйдёт 0 ₽');
      if (!p.img) add('nophoto', m, (p.name || 'товар') + ' — карточка клиента без картинки');
      if (p.source === 'link') add('link', m, (p.name || 'товар') + ' — цена по ссылке не обновляется сама');
      if (prem && m.premium === 'same') add('same', m, 'тот же товар, что в Базе');
      else if (prem && m.base && price(p) && price(m.base) && price(p) < price(m.base)) add('cheaper', m, 'Премиум ' + DC.F.rub(price(p)) + ' дешевле Базы ' + DC.F.rub(price(m.base)));
    });
    Object.keys(sums).forEach(function (k) { var x = sums[k]; if (x.sum > 1.001) add('share', x.list[0], prepRoom(x.room) + ' доли в сумме ' + DC.ruNum(Math.round(x.sum * 100) / 100) + ' — больше 1: ' + x.list.map(function (m) { return ((m.base || {}).name || m.title || '').slice(0, 28); }).join('; ')); });
    if (mains && partner / mains < 0.7) out.push({ kind: 'partner', title: Math.round(partner / mains * 100) + '% материалов с ценой METOD ниже розницы', text: 'для публикации нужно не меньше 70%', go: { tab: 'rows' } });
    return out;
  };
  function prepRoom(r) { return r === 'Общее' ? 'В «Общем»' : 'В зоне «' + r + '»'; }

  /* ── бюджет по карточкам: цена × количество. Количество — правило позиции × геометрия комнаты × доля.
     Геометрия — из загруженной планировки или дизайн-проекта; пока их нет — эталонная квартира (те же доли, что в «Расходе») ── */
  function planOf(code) {
    var pl = (st.meta[code] || {}).plan, rooms = pl && pl.rooms ? pl.rooms.filter(function (r) { return r.type && Number(r.floor_m2) > 0; }) : [];
    if (rooms.length) return { real: true, rooms: rooms, area: rooms.reduce(function (s, r) { return s + Number(r.floor_m2); }, 0), file: pl.file || (st.meta[code] || {}).project_file || '' };
    var E = DC.ETALON; return { real: false, area: E.area, rooms: Object.keys(E.rooms).map(function (r) { return { type: r, floor_m2: E.area * E.rooms[r][0], windows: E.rooms[r][1] }; }) };
  }
  DC.matPlan = planOf;
  /* условная планировка типа квартиры: комнаты типа, площадь делится в тех же долях, что у эталона */
  var FLAT_AREA = { studio: 30, k1: 45, k2: 65, k3: 90, k4: 110 };
  function planFor(code, flat) {
    var fr = flatRooms(code, flat) || [], E = DC.ETALON, w = fr.map(function (r) { return (E.rooms[r] || [0.15, 0])[0]; }), tot = w.reduce(function (a, b) { return a + b; }, 0) || 1, area = FLAT_AREA[flat];
    return { real: false, area: area, rooms: fr.map(function (r, i) { return { type: r, floor_m2: area * w[i] / tot, windows: (E.rooms[r] || [0, 1])[1] }; }) };
  }
  /* количество материала в зоне: введено дизайнером вручную — берём его; иначе правило позиции × геометрия комнаты × доля; правила нет — 1 */
  DC.matQty = function (code, m, z, plan) {
    if (z.qty != null) return { q: z.qty, manual: true };
    var q = DC.planQty(code, { room: z.room, pos: m.position, qty_rule: m.rule, share: z.share || 1 }, { rooms: (plan || planOf(code)).rooms });
    return { q: q == null ? (z.share || 1) : q, manual: false, norule: q == null };
  };
  DC.matUnit = function (m) { return /^м² /.test(m.rule || '') ? 'м²' : /^п\.м\./.test(m.rule || '') ? 'п.м.' : /^компл/.test(m.rule || '') ? 'компл.' : (m.unit && !/м2|м²/.test(m.unit) ? m.unit : 'шт'); };
  /* количество и сумма одного материала — по формулам калькулятора (designer-calc.js).
     Ввёл дизайнер своё количество (m.qty) — берём его. Позиции нет в калькуляторе — прежнее правило позиции по комнатам. */
  DC.matCalc = function (code, m, level, flat) {
    var ctx = DC.calcCtx(code, level, flat), lv = ctx.lv, fk = DC.FLATS[ctx.t - 1][0];
    function pick(x) { if (!x || x === 'same') return null; return lv === 'premium' ? (x.premium === 'same' || !x.premium ? x.base : x.premium) : x.base; }
    var main = pick(m) || (lv === 'premium' ? m.base : null), ov = m.by_flat ? m.by_flat[fk] : null;
    if (ov === 'none') return { q: 0, sum: 0, by: {}, ctx: ctx, none: true };
    if (ov && ov !== 'same' && pick(ov)) main = pick(ov);
    var r = DC.calcHas(m.position) ? DC.calcQty(m.position, m.zones, ctx) : null, manual = m.qty != null;
    if (!r) { var by = {}, t = 0; m.zones.forEach(function (z) { var q = DC.planQty(code, { room: z.room, pos: m.position, qty_rule: m.rule, share: z.share || 1 }, { rooms: planOf(code).rooms }); if (q == null) q = z.share || 1; by[z.room] = q; t += q; }); r = { q: t, by: by, txt: m.rule ? m.rule + ' по комнатам' : 'правила нет — 1 в зоне' }; }
    if (manual) { var k = r.q ? m.qty / r.q : 0, byM = {}; Object.keys(r.by).forEach(function (z) { byM[z] = k ? r.by[z] * k : m.qty / m.zones.length; }); r = { q: m.qty, by: byM, txt: r.txt }; }
    /* вторая и следующие спальни со своим товаром: первая единица — основной, остальные — товар своей спальни */
    var sum = 0, byS = {}, pm = price(main);
    Object.keys(r.by).forEach(function (room) {
      var q = r.by[room], bi = m.by_index && m.by_index[room], s2 = 0;
      if (bi && q > 1) { s2 = pm; for (var i = 2; i <= Math.round(q); i++) s2 += price(pick(bi[i])) || pm; }
      else s2 = pm * q;
      byS[room] = s2; sum += s2;
    });
    return { q: r.q, by: r.by, sum: sum, bySum: byS, txt: r.txt, ctx: ctx, product: main, manual: manual, calc: DC.calcHas(m.position) };
  };
  DC.matBudget = function (code, level, flat) {
    var ms = DC.materials(code); if (!ms) return null;
    var pl = planOf(code), sum = 0, n = 0, noPrice = 0, zones = {}, cats = {}; /* zones — бюджет по зонам: каждый материал привязан к зоне */
    ms.forEach(function (m) {
      if (!m.zones.length) return;
      var c = DC.matCalc(code, m, level, flat); if (c.none || !c.q) return;
      if (!price(c.product)) { if (c.product) noPrice++; return; }
      sum += c.sum; n++; cats[m.category || 'Без категории'] = (cats[m.category || 'Без категории'] || 0) + c.sum;
      Object.keys(c.bySum).forEach(function (z) { zones[z] = (zones[z] || 0) + c.bySum[z]; });
    });
    var ctx = DC.calcCtx(code, level, flat);
    return { sum: Math.round(sum), rows: n, noPrice: noPrice, plan: { real: pl.real, area: ctx.S, rooms: pl.rooms }, zones: zones, cats: cats, ctx: ctx };
  };
  DC.budgetStrip = function (code) {
    var b = DC.matBudget(code, 'база'), p = DC.matBudget(code, 'премиум'); if (!b || !p) return '';
    var F = DC.F, pl = b.plan, open = !!st.budOpen;
    var zOpen = !!st.budZones, zr = DC.ROOM_NAMES.filter(function (r) { return b.zones[r] || p.zones[r]; });
    var byZone = zOpen ? '<div class="mt-bud__tb"><div class="mt-bud__tr is-h"><span>Зона</span><span>База</span><span>Премиум</span></div>' + zr.map(function (r) { return '<div class="mt-bud__tr"><span>' + DC.esc(r) + '</span><b>' + F.rub(Math.round(b.zones[r] || 0)) + '</b><b>' + F.rub(Math.round(p.zones[r] || 0)) + '</b></div>'; }).join('') +
      '<p class="pj-mut">«Общее» — материалы на всю квартиру без своей комнаты.</p></div>' : '';
    var cOpen = st.budCats != null ? st.budCats : true, cn = []; DC.KB.list.forEach(function (x) { if (cn.indexOf(x.cat) < 0) cn.push(x.cat); }); Object.keys(b.cats).concat(Object.keys(p.cats)).forEach(function (c) { if (cn.indexOf(c) < 0) cn.push(c); });
    var byCat = cOpen ? '<div class="mt-bud__tb"><div class="mt-bud__tr is-h"><span>Категория</span><span>База</span><span>Премиум</span></div>' + cn.filter(function (c) { return b.cats[c] || p.cats[c] || (DC.canEdit(code) && DC.KB.list.some(function (x) { return x.cat === c; })); }).map(function (c) { return '<div class="mt-bud__tr"><span>' + (DC.canEdit(code) ? '<button type="button" class="mt-bud__add" data-act="bud-add" data-cat="' + DC.esc(c) + '" aria-label="Добавить в «' + DC.esc(c) + '»">＋</button>' : '') + DC.esc(c) + '</span><b>' + F.rub(Math.round(b.cats[c] || 0)) + '</b><b>' + F.rub(Math.round(p.cats[c] || 0)) + '</b></div>'; }).join('') +
      '<div class="mt-bud__tr is-sum"><span>Итого</span><b>' + F.rub(b.sum) + '</b><b>' + F.rub(p.sum) + '</b></div><div class="mt-bud__tr"><span>За м²</span><b>' + F.rub(Math.round(b.sum / pl.area)) + '</b><b>' + F.rub(Math.round(p.sum / pl.area)) + '</b></div></div>' : '';
    var tName = ['Студия', 'Евро-2', 'Евро-3', 'Евро-4', 'Евро-5'][b.ctx.t - 1];
    return '<section class="mt-bud"><div class="mt-bud__h"><b>✦ Бюджет материалов</b><span>' + (pl.real ? 'по планировке: ' + tName + ', ' + DC.ruNum(Math.round(pl.area * 10) / 10) + ' м²' : 'эталон: ' + tName + ', ' + pl.area + ' м²') + '</span></div>' +
      '<div class="mt-bud__g"><button type="button" class="mt-bud__t' + (st.level === 'база' ? ' is-on' : '') + '" data-act="level" data-level="база"><span>База</span><b>' + F.rub(b.sum) + '</b><i>' + F.rub(Math.round(b.sum / pl.area)) + ' за м²</i></button>' +
      '<button type="button" class="mt-bud__t' + (st.level === 'премиум' ? ' is-on' : '') + '" data-act="level" data-level="премиум"><span>Премиум</span><b>' + F.rub(p.sum) + '</b><i>' + F.rub(Math.round(p.sum / pl.area)) + ' за м²</i></button></div>' +
      '<div class="mt-bud__f"><button type="button" class="mt-bud__btn" data-act="bud-cats" aria-expanded="' + cOpen + '">' + (cOpen ? 'Скрыть категории' : 'По категориям') + '</button><button type="button" class="mt-bud__btn" data-act="bud-zones" aria-expanded="' + zOpen + '">' + (zOpen ? 'Скрыть зоны' : 'По зонам') + '</button>' + (pl.real ? '' : '<span class="pj-mut">Загрузите планировку или дизайн-проект на вкладке «Интерьер» — посчитаем по вашим комнатам.</span>') + '</div>' + byCat + byZone + '</section>';
  };
  DC.acts['bud-cats'] = function () { st.budCats = !(st.budCats != null ? st.budCats : true); DC.paint(); };
  DC.acts['bud-zones'] = function () { st.budZones = !st.budZones; DC.paint(); };
  DC.acts['bud-types'] = function () { st.budOpen = !st.budOpen; DC.paint(); };

  /* ── сверка: каждый товар таблицы должен оказаться в карточке (или в списке убранных дублей) ── */
  function products(m, lv) {
    var out = [], main = lv === 'premium' ? (m.premium === 'same' ? null : m.premium) : m.base; if (main) out.push(main);
    function side(x) { if (x && x !== 'same' && x !== 'none') { var p = lv === 'premium' ? (x.premium === 'same' ? null : x.premium) : x.base; if (p && !out.some(function (y) { return y === p; })) out.push(p); } }
    if (m.by_flat) { var seen = []; FLATS.forEach(function (f) { var v = m.by_flat[f[0]]; if (seen.indexOf(v) < 0) { seen.push(v); side(v); } }); }
    if (m.by_index) Object.keys(m.by_index).forEach(function (r) { Object.keys(m.by_index[r]).forEach(function (i) { side(m.by_index[r][i]); }); });
    return out.concat(m.alts[lv]);
  }
  DC.matCheck = function (code) {
    var b = DC.matBuilt(code); if (!b) return null;
    var res = { cards: b.cards.length, rows: b.rows, unplaced: b.cards.filter(function (k) { return !k.zones.length; }).length, auto: b.cards.filter(function (k) { return k.auto; }).length,
      byIndex: b.cards.filter(function (k) { return k.by_index; }).length, byFlat: b.cards.filter(function (k) { return k.by_flat; }).length, withAlts: b.cards.filter(function (k) { return k.alts.base.length || k.alts.premium.length; }).length,
      multiZone: b.cards.filter(function (k) { return k.zones.length > 1; }).length, dropped: b.dropped.length, levels: {} };
    [['база', 'base'], ['премиум', 'premium']].forEach(function (L) {
      var rows = DC.rowsFor(code, L[0]) || [], before = rows.reduce(function (s, r) { return s + price(r.product); }, 0), n = rows.filter(function (r) { return r.product; }).length;
      /* в карточках «Премиум такой же, как База» хранится один раз — для сверки считаем его и в Премиуме */
      var after = 0, cnt = 0; b.cards.forEach(function (k) { products(k, L[1]).forEach(function (p) { after += price(p); cnt++; }); if (L[1] === 'premium' && k.premium === 'same' && k.base) { after += price(k.base); cnt++; } });
      res.levels[L[0]] = { before: Math.round(before), rows: n, after: Math.round(after), inCards: cnt };
    });
    var dropSum = b.dropped.reduce(function (s, p) { return s + price(p); }, 0);
    res.droppedSum = Math.round(dropSum);
    res.ok = Math.abs(res.levels['база'].before + res.levels['премиум'].before - res.levels['база'].after - res.levels['премиум'].after - dropSum) < 2;
    return res;
  };

  /* ── временная сводка шага 1 — только при ?proto=1 ── */
  DC.matReport = function (code) {
    var c = DC.matCheck(code); if (!c) return '';
    var F = DC.F, L = c.levels, open = !!st.matRep, ms = DC.matBuilt(code).cards;
    function line(a, b) { return '<div class="dk-kvr"><span>' + a + '</span><b>' + b + '</b></div>'; }
    function zones(k) { return k.zones.length ? k.zones.map(function (z) { return z.room; }).join(', ') : 'не размещена'; }
    return '<section class="dp-card mt-rep"><button type="button" class="pj-sec__h" data-act="mat-rep" aria-expanded="' + open + '"><b>Все карточки капсулы</b><span class="' + (c.ok ? 'pj-ok' : 'dp-warn') + '">' + (c.ok ? 'сумма сходится' : '! сумма не сходится') + '</span></button>' +
      line('Строк таблицы: База / Премиум', c.rows.base + ' / ' + c.rows.premium) + line('Карточек', c.cards) + line('Не размещены', c.unplaced) + line('Зоны взяты из справочника — проверить', c.auto) +
      (open ? line('Карточек с несколькими зонами', c.multiZone) + line('«Тип 1–4» → вторая и следующие комнаты', c.byIndex) + line('Размер → зависит от квартиры', c.byFlat) + line('Карточек с заменами', c.withAlts) + line('Убрано полных дублей', c.dropped + ' · ' + F.rub(c.droppedSum)) +
        line('База: сумма цен строк → в карточках', F.rub(L['база'].before) + ' → ' + F.rub(L['база'].after)) + line('Премиум: сумма цен строк → в карточках', F.rub(L['премиум'].before) + ' → ' + F.rub(L['премиум'].after)) +
        '<p class="pj-mut">Разница между «строк» и «в карточках» равна сумме убранных дублей. Количества в таблицах нет, поэтому сверяется сумма цен товаров.</p>' +
        '<div class="mt-list">' + ms.map(function (k) { var p = k.base || (k.premium !== 'same' && k.premium) || {}; return '<button type="button" class="mt-row" data-act="mat" data-id="' + DC.esc(k.id) + '"><b>' + DC.esc(k.title || 'без названия') + '</b><span>' + DC.esc(p.name || 'нет товара').slice(0, 60) + '</span><span class="' + (k.zones.length ? (k.auto ? 'mt-auto' : '') : 'dp-warn') + '">' + DC.esc(zones(k)) + (k.by_index ? ' · комнаты 2–' + (Object.keys(k.by_index[Object.keys(k.by_index)[0]]).length + 1) : '') + (k.by_flat ? ' · зависит от квартиры' : '') + (k.alts.base.length ? ' · ⇄ ' + k.alts.base.length : '') + (k.premium === 'same' ? ' · Премиум = База' : !k.premium ? ' · нет Премиума' : '') + '</span></button>'; }).join('') + '</div>' : '') + '</section>';
  };
  DC.acts['bud-calc'] = function () { DC.matReset(st.cap); DC.paint(); var pl = planOf(st.cap); DC.ui.toast('Бюджет пересчитан ' + (pl.real ? 'по планировке' : 'по эталонной квартире')); };
  DC.acts['mat-rep'] = function () { st.matRep = !st.matRep; DC.paint(); };
})();
