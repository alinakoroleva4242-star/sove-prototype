/* База ЖК (design/baza-zhk/TZ-baza-zhk.md, раздел 1): ЖК → планировки, уже размеченные и готовые в 3D с мебелью.
   В бою — таблицы БД; в прототипе — этот файл. Данные не выдумываем: чего нет — заглушка '[…]' или null.
   ЖК PRIDE: адрес, «без отделки» и 2-комн 47,3 м² — из анкеты клиента (ZK-spisok-shablon.csv); разметка и расстановка
   2-комн — те же, что в Планировке (assets/js/arrange-data.js). Остальные 3 планировки PRIDE и 3 ЖК — заглушки,
   список реальных ЖК даст Алина. Пример бюджета не храним цифрами — считает Скаут (SOVE.scout.estimate).
   Личных данных нет и не будет: ни номеров квартир, ни ФИО, ни телефонов (раздел 2). */
(function () {
  var A = function () { return window.SOVE_ARRANGE || null; };

  var ZK = [
    {
      id: 'pride', name: 'ЖК PRIDE', aliases: ['прайд', 'pride', 'прайд жк'],
      developer: '[застройщик]', city: 'Москва', district: '[район]', address: 'ул. Полковая, 1',
      class: '[класс]', finish: 'без отделки', status: '[статус]', year: null,
      cover: null, source: 'client', sourceUrl: '', published: true,
      layouts: [
        { id: 'pride-2k-47', type: '2-комн', m2: 47.3, rooms: 2, floors: '[этажи]', count: null,
          planImg: 'assets/img/demo/0-plan-razmetka.jpg', markup: 'arrange', layout: 'arrange',
          cover3d: 'assets/img/demo/1-domik-vsya-kvartira.jpg',
          budgetExample: { capsule: 'k2', state: 'concrete', level: 'base' }, verified: true },
        /* заглушки: тип и площадь даст Алина, разметки ещё нет — в поиске «скоро в 3D» */
        { id: 'pride-l2', type: '[тип]', m2: null, rooms: null, floors: '[этажи]', count: null, planImg: null, markup: null, layout: null, cover3d: null, budgetExample: null, verified: false },
        { id: 'pride-l3', type: '[тип]', m2: null, rooms: null, floors: '[этажи]', count: null, planImg: null, markup: null, layout: null, cover3d: null, budgetExample: null, verified: false },
        { id: 'pride-l4', type: '[тип]', m2: null, rooms: null, floors: '[этажи]', count: null, planImg: null, markup: null, layout: null, cover3d: null, budgetExample: null, verified: false }
      ]
    },
    /* ЖК-заглушки: нужны, чтобы проверить поиск и ленту «уже в 3D»; названия и данные даст Алина */
    { id: 'zk-2', name: '[ЖК 2]', aliases: [], developer: '[застройщик]', city: '[город]', district: '[район]', address: '[адрес]', class: '[класс]', finish: '[как сдаётся]', status: '[статус]', year: null, cover: null, source: 'developer_site', sourceUrl: '', published: true, layouts: [] },
    { id: 'zk-3', name: '[ЖК 3]', aliases: [], developer: '[застройщик]', city: '[город]', district: '[район]', address: '[адрес]', class: '[класс]', finish: '[как сдаётся]', status: '[статус]', year: null, cover: null, source: 'developer_site', sourceUrl: '', published: true, layouts: [] },
    { id: 'zk-4', name: '[ЖК 4]', aliases: [], developer: '[застройщик]', city: '[город]', district: '[район]', address: '[адрес]', class: '[класс]', finish: '[как сдаётся]', status: '[статус]', year: null, cover: null, source: 'partner', sourceUrl: '', published: true, layouts: [] }
  ];

  /* правки из zk-admin.html (раздел 3): весь список ЖК хранится в браузере поверх этого файла и сразу виден в поиске;
     «Скачать zk.js» в админке выгружает итог файлом. Сброс — «Вернуть как в файле». */
  var DB_KEY = 'sove.zk.db', BASE = JSON.parse(JSON.stringify(ZK));
  try { var saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); if (saved && saved.length) ZK = saved; } catch (e) {}
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(ZK)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(DB_KEY); } catch (e) {} ZK.length = 0; BASE.forEach(function (z) { ZK.push(JSON.parse(JSON.stringify(z))); }); }
  /* текст файла zk.js: этот же модуль, но со списком ЖК из админки */
  function exportJs(src) { return src.replace(/var ZK = \[[\s\S]*?\n  \];\n/, 'var ZK = ' + JSON.stringify(ZK, null, 2).replace(/\n/g, '\n  ') + ';\n'); }

  /* как сдаётся → состояние квартиры в анкете (вопрос «Что сейчас в квартире?») и в Скауте */
  var FINISH_STATE = { 'без отделки': 'concrete_walls', 'white box': 'whitebox', 'с отделкой': 'finished' };
  var SCOUT_STATE = { concrete_walls: 'concrete', whitebox: 'pre', finished: 'secondary' };

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); }
  function get(id) { return ZK.filter(function (z) { return z.id === id; })[0] || null; }
  function layout(id) {
    for (var i = 0; i < ZK.length; i++) { var l = ZK[i].layouts.filter(function (x) { return x.id === id; })[0]; if (l) return { zk: ZK[i], layout: l }; }
    return null;
  }
  /* поиск по названию, синонимам, застройщику и адресу; без учёта регистра и ё/е; с 2-го символа (раздел 5) */
  function search(q) {
    q = norm(q); if (q.length < 2) return [];
    return ZK.filter(function (z) {
      return z.published && [z.name, z.developer, z.address, z.city].concat(z.aliases).some(function (s) { return norm(s).indexOf(q) >= 0; });
    });
  }
  /* планировка готова в 3D: есть проверенная разметка и расстановка */
  function ready(l) { return !!(l && l.verified && l.markup && l.layout); }
  /* разметка и расстановка: 'arrange' — данные Планировки (arrange-data.js), иначе объект из конвейера zk-admin */
  function markupOf(l) { var a = A(); return l.markup === 'arrange' ? (a ? { px_per_m: a.px_per_m, rooms: a.rooms, windows: a.windows, doors: a.doors, outside: a.outside } : null) : l.markup; }
  function layoutOf(l) { var a = A(); return l.layout === 'arrange' ? (a && a.variants ? a.variants[0] : null) : l.layout; }

  /* пример бюджета — расчёт Скаута по площади, состоянию и капсуле, разложенный на 4 слоя методологии.
     Нет Скаута на странице или нет данных — null (на экране «[сумма]») */
  function budgetExample(l) {
    var S = window.SOVE, b = l && l.budgetExample;
    if (!b || !l.m2 || !S || !S.scout || !S.scout.estimate) return null;
    var e = S.scout.estimate({ stateId: b.state || 'concrete', area: l.m2, capsuleId: b.capsule, level: b.level || 'base' });
    var K = {}; e.kit.forEach(function (x) { K[x[0]] = x[1]; });
    var furniture = (K['Мебель покупная'] || 0) + (K['Мебель на заказ'] || 0);
    var materials = (K['Отделка'] || 0) + (K['Освещение'] || 0) + (K['Выключатели и розетки'] || 0) + (K['Сантехника'] || 0) + (K['Техника'] || 0) + (K['Двери и перегородки'] || 0);
    var decor = K['Текстиль и декор'] || 0, works = e.works;
    return { furniture: Math.round(furniture), materials: Math.round(materials), decor: Math.round(decor), works: Math.round(works),
      total: Math.round(furniture + materials + decor + works), capsule: b.capsule };
  }

  window.SOVE_ZK = { list: ZK, persist: persist, reset: reset, exportJs: exportJs, get: get, layout: layout, search: search, ready: ready, markupOf: markupOf, layoutOf: layoutOf,
    budgetExample: budgetExample, norm: norm, FINISH_STATE: FINISH_STATE, SCOUT_STATE: SCOUT_STATE };
})();
