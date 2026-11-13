/* Расчёт бюджета на сервере (задача 2 запуска 1.12, 10.11): калькулятор MOD, книга работ и черновые переехали в код API —
   GET /api/budget/calc. Здесь: параметры запроса из Расчёта, кэш ответов (localStorage, чтобы полоса, Мой ремонт и Excel
   считали одну и ту же цифру без сети), перевод ответа в формы, которые уже понимают scout.js, budget.js и my-budget.js.
   Сервер не ответил — расчёт идёт по старым ставкам (site.js estimate), с пометкой. Контактов и промокодов в ответе нет. */
(function () {
  var S = window.SOVE; if (!S) return;
  var base = /^https?:$/.test(location.protocol) ? '/api' : null;
  var KEY = 'sove.budget.calc.v1', KEEP = 20, mem = {}, pending = {};
  var STATE = { secondary: 'secondary', concrete: 'concrete', pre: 'whitebox', finish: 'finished' };
  var TYPE_OF_ZONE = { kitchenLiving: 'Кухня-гостиная', bedroom: 'Спальня', bathroom: 'Санузел', hall: 'Прихожая' };
  var ZONE_OF_TYPE = { 'Кухня-гостиная': 'kitchenLiving', 'Кухня': 'kitchenLiving', 'Гостиная': 'kitchenLiving', 'Спальня': 'bedroom', 'Детская': 'bedroom', 'Кабинет': 'bedroom',
    'Гардеробная': 'hall', 'Санузел': 'bathroom', 'Постирочная': 'bathroom', 'Прихожая': 'hall', 'Общее': 'common' };
  var STAGE_KEY = { 1: 'demolition', 2: 'rough', 3: 'engineering', 4: 'prefinish', 5: 'finish_works' };

  /* тип комнаты справочника по названию помещения плана */
  function roomType(name) {
    var n = String(name || '');
    if (/детск/i.test(n)) return 'Детская';
    if (/кабинет/i.test(n)) return 'Кабинет';
    if (/гардероб/i.test(n)) return 'Гардеробная';
    if (/постироч/i.test(n)) return 'Постирочная';
    var KB = window.SOVE_KB, z = KB && KB.zoneOf ? KB.zoneOf(n) : 'bedroom';
    return TYPE_OF_ZONE[z] || 'Спальня';
  }
  /* нет плана — формат квартиры по площади (типовой расчёт, точность «примерно») */
  function formatByArea(a) { return a <= 35 ? 1 : a <= 55 ? 2 : a <= 75 ? 3 : a <= 95 ? 4 : 5; }
  function num(v) { return Math.round((Number(v) || 0) * 100) / 100; }

  /* p: {capsuleId, level, stateId, area, rooms: [{name, m2|area}], bathrooms} — параметры Расчёта → параметры сервера */
  function params(p) {
    var c = (S.data && S.data.capsule && S.data.capsule(p.capsuleId)) || {};
    var code = c.code || String(p.capsuleId || '').toUpperCase().replace(/^K/, 'К');
    var rooms = (p.rooms || []).filter(function (r) { return r && num(r.m2 || r.area) > 0; })
      .map(function (r) { return { name: r.name || 'Помещение', type: roomType(r.name), floor_m2: num(r.m2 || r.area) }; });
    var area = Math.round((Number(p.area) || 0) * 10) / 10;
    var baths = Number(p.bathrooms) || rooms.filter(function (r) { return r.type === 'Санузел'; }).length || (area >= 80 ? 2 : 1);
    /* «Делаю сам» — только материалы: работы и черновые не считаются (Summary 09.11: черновые только при строительных работах) */
    var q = { capsule: code, level: p.level === 'premium' ? 'premium' : 'base', area: area, bathrooms: baths, state: STATE[p.stateId] || 'concrete', works: p.formatId === 'self' ? 0 : 1, metod: 1 };
    if (rooms.length) q.rooms = rooms; else q.format = formatByArea(area);
    return q;
  }
  function key(q) { return [q.capsule, q.level, q.area, q.format || 'plan', q.bathrooms, q.state, 'w' + q.works, q.rooms ? q.rooms.map(function (r) { return r.type + ':' + r.floor_m2; }).join(',') : ''].join('|'); }
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function remember(k, res) {
    mem[k] = res;
    try {
      var st = store(); st[k] = { ts: Date.now(), res: res };
      var ks = Object.keys(st).sort(function (a, b) { return st[b].ts - st[a].ts; }).slice(KEEP);
      ks.forEach(function (x) { delete st[x]; });
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) { /* хранилище недоступно — ответ живёт до перезагрузки */ }
  }
  function usable(p) { return !!base && !!p && !!p.capsuleId && Number(p.area) > 0; }
  /* ответ из кэша (синхронно) или null */
  function get(p) {
    if (p && p.api && p.api.totals && (p.api.works_on === undefined || p.api.works_on === (p.formatId !== 'self'))) return p.api;   /* ответ сохранён в паспорте квартиры — считаем по нему и без сети */
    if (!usable(p)) return null;
    var k = key(params(p)); if (mem[k]) return mem[k];
    var st = store(); if (st[k] && st[k].res) { mem[k] = st[k].res; return mem[k]; }
    return null;
  }
  /* ответ сервера; ошибка → null (расчёт идёт по ставкам) */
  function fetchCalc(p) {
    if (!usable(p)) return Promise.resolve(null);
    var q = params(p), k = key(q), have = get(p); if (have) return Promise.resolve(have);
    if (pending[k]) return pending[k];
    var qs = Object.keys(q).map(function (n) { return n + '=' + encodeURIComponent(n === 'rooms' ? JSON.stringify(q[n]) : q[n]); }).join('&');
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    pending[k] = fetch(base + '/budget/calc?' + qs, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('budget ' + r.status); return r.json(); })
      .then(function (res) { res = compact(res); remember(k, res); return res; })
      .catch(function (e) { console.warn('бюджет: сервер не ответил, считаем по ставкам', e && e.message); return null; })
      .then(function (res) { if (timer) clearTimeout(timer); delete pending[k]; return res; });
    return pending[k];
  }
  /* в кэш — без лишнего: строки материалов без формул, работы построчно, комнаты, итоги */
  function compact(res) {
    return { capsule: res.capsule, level: res.level, state: res.state, basis: res.basis, accuracy: res.accuracy, flat: res.flat, works_on: res.totals.works > 0 || res.rough.sum > 0,
      lines: (res.lines || []).map(function (l) { return { category: l.category, key: l.key, name: l.name, unit: l.unit, qty: l.qty, price_market: l.price_market, price_metod: l.price_metod, sum_market: l.sum_market, sum_metod: l.sum_metod, position: l.position, work_code: l.work_code, photo: l.photo, rooms: l.rooms }; }),
      by_category: res.by_category, by_room: res.by_room, materials: res.materials, rough: res.rough, totals: res.totals, checks: res.checks,
      works: { total: res.works.total, stages: (res.works.stages || []).map(function (s) { return { n: s.n, title: s.title, sum: s.sum, rows: (s.rows || []).map(function (w) { return { code: w.code, name: w.name, unit: w.unit, price: w.price, qty: w.qty, sum: w.sum, source: w.source }; }) }; }) } };
  }

  /* ответ сервера в форме S.scout.estimate: работы, комплектация, черновые сверху, 5 этапов и 9 категорий */
  function estimate(res, p, stateObj) {
    var stages = {}; (res.works.stages || []).forEach(function (s) { stages[STAGE_KEY[s.n]] = s.sum; });
    var kit = (res.by_category || []).map(function (c) { return [c.category, c.metod]; });
    var works = res.totals.works, kitMetod = res.materials.metod, kitRetail = res.materials.market, rough = res.rough.sum;
    return { state: stateObj, area: res.flat.area, works: works, kitMetod: kitMetod, kitRetail: kitRetail, rough: rough, roughMode: 'top', kitSum: kitMetod, kitMarket: kitRetail,
      total: works + kitMetod + rough, stages: (res.works.stages || []).map(function (s) { return [s.title, s.sum]; }), kit: kit, apiStages: stages, lines: null, basis: 'api', api: res };
  }
  /* категории комплектации для Расчёта: {key, title, sum (METOD), market} */
  function cats(res) {
    var B = window.SOVE_BUDGET;
    return (res.by_category || []).map(function (c) { return { key: (B && B.kitKey(c.category)) || c.category, title: c.category, sum: Math.round(c.metod), market: Math.round(c.market) }; });
  }
  /* комнаты для «По комнатам» и Excel: как SOVE_BUDGET.byRooms — {rooms:[{name, zone, zoneName, key, area, kit, market, saving, byCat, common, typical}], kit, market, saving, typical} */
  function rooms(res) {
    var B = window.SOVE_BUDGET, ZN = (B && B.ZONE_NAME) || {}, out = [], byName = {};
    (res.flat.rooms || []).forEach(function (r) {
      var z = ZONE_OF_TYPE[r.type] || 'bedroom';
      var x = { name: r.name, zone: z, zoneName: ZN[z] || r.type, area: Math.round(r.floor_m2 * 10) / 10, typical: res.basis !== 'plan', kit: 0, market: 0, saving: 0, byCat: {}, byCatMarket: {} };
      byName[r.name] = x; out.push(x);
    });
    var common = { name: 'Общее', zone: 'common', key: 'common', zoneName: ZN.common || 'На всю квартиру', area: 0, common: true, typical: false, kit: 0, market: 0, saving: 0, byCat: {}, byCatMarket: {} };
    (res.lines || []).forEach(function (l) {
      var k = (B && B.kitKey(l.category)) || l.category;
      (l.rooms || []).forEach(function (p) {
        var x = byName[p.room] || common, m = Math.round(p.qty * l.price_metod), mk = Math.round(p.qty * l.price_market);
        x.byCat[k] = (x.byCat[k] || 0) + m; x.byCatMarket[k] = (x.byCatMarket[k] || 0) + mk; x.kit += m; x.market += mk;
      });
    });
    if (common.kit > 0) out.push(common);
    /* копейки округления строк — в самую большую по категории комнату: Σ комнат по каждой категории = категория расчёта до рубля (одна цифра) */
    (res.by_category || []).forEach(function (c) {
      var k = (B && B.kitKey(c.category)) || c.category, big = out.slice().sort(function (a, b) { return (b.byCat[k] || 0) - (a.byCat[k] || 0); })[0]; if (!big || !big.byCat[k]) return;
      var dk = Math.round(c.metod) - out.reduce(function (a, r) { return a + (r.byCat[k] || 0); }, 0), dm = Math.round(c.market) - out.reduce(function (a, r) { return a + (r.byCatMarket[k] || 0); }, 0);
      if (dk) { big.byCat[k] += dk; big.kit += dk; }
      if (dm) { big.byCatMarket[k] += dm; big.market += dm; }
    });
    if (B && B.roomsTotals) { var o = B.roomsTotals(out, res.basis !== 'plan'); if (B.mapToRooms) out.forEach(function (r, i) { r.key = r.common ? 'common' : (r.zone + (i ? '-' + i : '')); }); return o; }
    return { rooms: out, typical: res.basis !== 'plan', kit: out.reduce(function (a, r) { return a + r.kit; }, 0), market: out.reduce(function (a, r) { return a + r.market; }, 0), saving: 0 };
  }
  /* строки категории для листа Excel: [Комната, Тип, Кол-во, Ед, Наименование, Цена розница, Цена METOD, ИТОГ РОЗНИЦА, ИТОГ МЕТОД] */
  function catRows(res, kitKey) {
    var B = window.SOVE_BUDGET, rows = [], order = {}; (res.flat.rooms || []).forEach(function (r, i) { order[r.name] = i; }); order['Общее'] = 999;
    /* одно имя на несколько позиций («ЭКСКЛЮЗИВНЫЙ МЕБЕЛЬНЫЙ ПАРТНЕР» — кухня, шкаф, тумба, ТВ-зона) — показываем «Кухня · имя», иначе четыре одинаковые строки */
    var posOf = {}; (res.lines || []).forEach(function (l) { var n = String(l.name || '').replace(/\s+/g, ' ').trim().toLowerCase(); if (!n) return; (posOf[n] = posOf[n] || {})[l.position || l.key] = 1; });
    /* товар без названия в таблице (шторы по площади, картина К1, радиаторы К8) — показываем позицию («Шторы»), а не ключ «К1_Шторы 50-60м2» */
    var nameOf = function (l) { var n = String(l.name || l.label || l.position || l.key || '').replace(/\s+/g, ' ').trim(), pos = l.position || ''; return l.name && pos && Object.keys(posOf[n.toLowerCase()] || {}).length > 1 ? pos + ' · ' + n : n; };
    (res.lines || []).forEach(function (l) {
      var k = (B && B.kitKey(l.category)) || l.category; if (k !== kitKey) return;
      (l.rooms || []).forEach(function (p) {
        if (!(p.qty > 0)) return;
        var q = Math.round(p.qty * 10) / 10;
        rows.push({ i: order[p.room] === undefined ? 998 : order[p.room], c: [p.room, l.position || l.key, q, l.unit || '', nameOf(l), Math.round(l.price_market), Math.round(l.price_metod), Math.round(p.qty * l.price_market), Math.round(p.qty * l.price_metod), photoUrl(l.photo), l.key] });
      });
    });
    rows.sort(function (a, b) { return a.i - b.i; });
    return rows.map(function (x) { return x.c; });
  }
  /* фото товара из таблицы капсулы: ссылки Google Диска «file/d/<id>/view» картинкой не открываются — переводим в прямую */
  function photoUrl(raw) {
    var u = String(raw || '').trim(); if (!/^https?:\/\//.test(u)) return '';
    var m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{10,})/.exec(u);
    return m ? 'https://drive.google.com/uc?export=view&id=' + m[1] : u;
  }
  /* витрина позиций категории или комнаты (Алина 11.11: «общая цена категории не связана с товаром — нужно связать количеством»):
     карточка — фото из таблицы, комната · позиция, название, «кол-во × цена METOD» и итог строки; сумма карточек = сумма категории */
  function goodsHtml(rows, empty) {
    var esc = S.fmt.esc, rub = S.fmt.rub;
    if (!rows || !rows.length) return '<small class="bg-mk__no">' + esc(empty || 'Позиций в этой категории нет') + '</small>';
    return '<div class="bg-mk bg-mk--api">' + rows.map(function (c) {
      var q = String(c[2]).replace('.', ','), unit = c[3] || 'шт', pic = c[9] ? '<span class="bg-mc__pic"><img src="' + esc(c[9]) + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'is-none\')"></span>' : '<span class="bg-mc__pic is-none"></span>';
      return '<div class="bg-mc bg-mc--api">' + pic + '<span class="bg-mc__b"><small>' + esc((c[0] && c[0] !== 'Общее' ? c[0] + ' · ' : '') + (c[1] || '')) + '</small><b>' + esc(c[4]) + '</b>' +
        '<span class="bg-mc__q num">' + q + ' ' + esc(unit) + ' × ' + rub(c[6]) + '</span>' +
        '<span class="bg-mc__pr">' + (c[7] > c[8] ? '<s>' + rub(c[7]) + '</s>' : '') + '<em>' + rub(c[8]) + '</em><small>цена METOD</small></span></span></div>';
    }).join('') + '</div>';
  }
  /* строки сметы работ по этапам: {demolition: [[Тип работ, Ед, Цена, Объём, Итого]], …} */
  function workRows(res) {
    var out = {};
    (res.works.stages || []).forEach(function (s) { out[STAGE_KEY[s.n]] = (s.rows || []).map(function (w) { return [w.name, w.unit, w.price, w.qty, w.sum]; }); });
    return out;
  }

  S.budgetApi = { enabled: !!base, params: params, get: get, fetch: fetchCalc, estimate: estimate, cats: cats, rooms: rooms, catRows: catRows, workRows: workRows, roomType: roomType, goodsHtml: goodsHtml, photoUrl: photoUrl };
})();
