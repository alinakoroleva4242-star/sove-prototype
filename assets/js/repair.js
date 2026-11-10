/* «Мой ремонт» — общий слой (ТЗ Алины 22.10.2026, design/moy-remont/TZ-moy-remont.md).
   Чистовик квартиры: сюда падает только сохранённое из Генерации (план, мудборд, рендеры), расчёта (бюджет) и Маркета (♡ и 🛒).
   Подключать после site.js. Даёт window.SOVE.repair: квартиры, сохранения, Избранное и Корзина по квартире (товары, подборки, специалисты — R.favPros),
   интерьеры объекта (R.interiors, выбор капсулы из любого блока — R.interiors.choose),
   общую карточку товара (та же, что под результатами Генерации) и полосу «Корзина · Избранное · Бюджет» над нижним меню.
   В бою всё это — сервер; здесь отдельный ключ localStorage, «Сбросить данные прототипа» чистит и его. */
(function () {
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var KEY = 'sove.repair.v1';
  var MY = 'my.html';
  /* куда ведут призывы: экран услуги Генерации и его блоки; Материалы и Визуализации — экран «Интерьер» (interior.html) */
  var LINK = { ai: 'gen.html', plan: 'plan-demo.html', materials: 'interior.html', visual: 'interior.html?tab=rooms', scout: 'scout.html', market: 'market.html', metod: 'metod.html', adept: 'adept.html', track: 'track.html' };
  var LEVEL = { none: 'Без плана', developer_plan: 'План застройщика', measured_plan: 'Обмерный план', design_project: 'Дизайн-проект' };
  var RANK = { none: 0, developer_plan: 1, measured_plan: 2, design_project: 3 };
  var SRC = { budget: 'Из бюджета', moodboard: 'Из мудборда', materials: 'Из Интерьера', room: 'Из комнат', market: 'Из Маркета' };
  var WHAT = { plan: 'план', interior: 'мудборд', budget: 'бюджет' };
  var DEFAULT_ROOMS = [ { key: 'liv', name: 'Кухня-гостиная' }, { key: 'bed', name: 'Спальня' }, { key: 'bath', name: 'Санузел' }, { key: 'hall', name: 'Прихожая' } ];
  /* какие разделы каталога показываем «в комнате» — товары берём из каталога по капсуле мудборда */
  var ROOM_CATS = { liv: ['Мебель', 'Освещение', 'Техника', 'Текстиль и декор'], bed: ['Мебель', 'Освещение', 'Текстиль и декор'], bath: ['Сантехника', 'Отделка'], hall: ['Мебель', 'Освещение', 'Отделка'] };

  /* ---------- хранилище ---------- */
  function blank() { return { flats: [], active: null, repair: {}, fav: {}, favSets: {}, favPros: {}, cart: {}, seq: 1 }; }
  var st;
  function load() { try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} renderStrip(); window.dispatchEvent(new Event('sove:repair')); }
  function uid(p) { st.seq = (st.seq || 1) + 1; return p + '-' + Date.now().toString(36) + '-' + st.seq; }
  load();
  /* товары боевого каталога, которых нет в образце data.js (корпусная мебель, техника под расстановку):
     запоминаем их при ♡ / 🛒, чтобы Корзина и Избранное видели их на любом экране */
  var XKEY = 'sove.products.extra';
  function extras() { try { return JSON.parse(localStorage.getItem(XKEY) || '{}') || {}; } catch (e) { return {}; } }
  /* у товаров живого каталога, расстановки и Интерьера нет списка капсул — дополняем, иначе Маркет и карточка падают на p.capsules.map */
  function addToData(p) { if (p && !D.product(p.id)) { if (!p.capsules) p.capsules = []; D.products.push(p); } }
  (function () { var x = extras(); Object.keys(x).forEach(function (k) { addToData(x[k]); }); })();
  function registerProduct(p) {
    if (!p || !p.id) return; addToData(p);
    var x = extras(); if (x[p.id]) return;
    /* brandRaw — исходный бренд каталога (DECARO СПБ): по нему склад продавца по умолчанию (sellers.js) */
    x[p.id] = { id: p.id, name: p.name, brand: p.brand, brandRaw: p.brandRaw, metod: p.metod, retail: p.retail, img: p.img, category: p.category || 'Мебель', subcat: p.subcat || '' };
    try { localStorage.setItem(XKEY, JSON.stringify(x)); } catch (e) {}
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); renderStrip(); window.dispatchEvent(new Event('sove:repair')); } });

  function roomKey(name) { var n = String(name || '').toLowerCase(); return /кух|гост/.test(n) ? 'liv' : /спал/.test(n) ? 'bed' : /сан|ванн|душ/.test(n) ? 'bath' : /прих|корид|холл/.test(n) ? 'hall' : n.replace(/[^a-zа-я0-9]+/g, '-'); }
  /* имя капсулы — короткое, как в Интерьере и Планировке (SOVE_KB), одно на все экраны; коды К1–К7 в интерфейсе не показываем */
  function capName(id) { var k = window.SOVE_KB && window.SOVE_KB.capsule && window.SOVE_KB.capsule(id), c = D.capsule(id); return (k && k.name) || (c && c.name) || ''; }
  /* тип ремонта: 'base' | 'premium', всё остальное (mixed, пусто) — null */
  function lvOf(x) { return x === 'base' || x === 'premium' ? x : null; }

  /* ---------- квартиры = объект (схема «Данные вокруг объекта v2», созвон 28.10: любая запись принадлежит объекту) ----------
     поля: id, name, jk (ЖК), city, m2, rooms, baths, state (concrete_free | concrete_walls | whitebox | finished), budgetType (base | premium),
     accuracy (примерно | точнее | точно — считается из основы: нет плана / план застройщика → примерно, обмерный → точнее, дизайн-проект → точно),
     isDraft (черновик — создан сам при первом действии, человек ещё не назвал и не заполнил), currentInteriorId, capsuleId, createdAt (ts — прежнее имя).
     Анкета заказов (SOVE.orders.object) и расчёт (SOVE.my: area, stateId, level, capsuleId) зеркалят активную квартиру. */
  var STATE = { concrete_free: 'Бетон', concrete_walls: 'Бетон, стены', whitebox: 'White box', finished: 'С отделкой' };
  var ACCURACY = { none: 'примерно', developer_plan: 'примерно', measured_plan: 'точнее', design_project: 'точно' };
  /* состояние квартиры ↔ состояние в расчёте (SOVE.my.stateId: concrete | pre | finish | secondary) */
  var STATE_MY = { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'finish' };
  var MY_STATE = { concrete: 'concrete_walls', pre: 'whitebox', finish: 'finished', secondary: 'finished' };
  function accuracyOf(id) { var p = (st.repair[id] || {}).plan; return ACCURACY[p ? p.level : 'none'] || 'примерно'; }
  function num(v, fb) { return v === null || v === undefined || v === '' ? fb : v; }
  /* квартира → расчёт (S.my): площадь, состояние, уровень, капсула — только заданное в квартире и отличающееся (обратное зеркало — в S.my.set, без создания квартиры);
     при смене активной квартиры ('budget') — ещё и итог расчёта: из сохранённого бюджета этой квартиры, иначе пусто (итог прежней квартиры к ней не относится).
     Зовётся ДО save(): к событию 'sove:repair' расчёт уже согласован с квартирой */
  function mirrorMy(f, keys) {
    try {
      var my = S.my; if (!my || !f) return; var m = my.get(), p = {};
      if (keys.indexOf('m2') >= 0 && f.m2 > 0 && m.area !== f.m2) p.area = f.m2;
      if (keys.indexOf('state') >= 0 && f.state && STATE_MY[f.state] && m.stateId !== STATE_MY[f.state]) p.stateId = STATE_MY[f.state];
      if (keys.indexOf('budgetType') >= 0 && f.budgetType && m.level !== f.budgetType) p.level = f.budgetType;
      if (keys.indexOf('capsuleId') >= 0 && (m.capsuleId || null) !== (f.capsuleId || null)) p.capsuleId = f.capsuleId || null;
      if (keys.indexOf('budget') >= 0) { var b = (st.repair[f.id] || {}).budget || {}; ['total', 'works', 'kitMetod', 'kitRetail'].forEach(function (k) { var v = b[k] || null; if ((m[k] || null) !== v) p[k] = v; }); }
      if (Object.keys(p).length) my.set(p);
    } catch (e) {}
  }
  var ALL = ['m2', 'state', 'budgetType', 'capsuleId', 'budget'];
  /* копия интерьера в сценарии Планировки (sove.demo.flow.v1 → interior) — копия интерьера АКТИВНОЙ квартиры (demo-flow.js, adoptInterior).
     Сменилась активная квартира (вторая и следующие, «Сделать активной») — копию переписываем под неё: иначе у квартиры без интерьера
     полоска объекта, окно выбора капсулы и бюджет показывали интерьер другой квартиры (проверка 02.11). Первую квартиру не трогаем:
     выбор, сделанный до неё, — её же (окно выбора создаёт её через ensure и сразу записывает выбор). Формат — как у demo-flow.js */
  var FLOW = 'sove.demo.flow.v1';
  function syncFlow() {
    try {
      var FL = window.SOVE_FLOW;
      if (FL && typeof FL.adoptInterior === 'function' && S.repair) { FL.adoptInterior(); return; }
      var f = flats.active(); if (!f) return;
      var fl = JSON.parse(localStorage.getItem(FLOW) || '{}') || {}, it = rp(f.id).interior, c = f.capsuleId && D.capsule(f.capsuleId);
      var want = it ? (it.capsuleId ? { type: 'capsule', id: it.capsuleId, name: capName(it.capsuleId) } : { type: 'own', how: it.how || 'photo', name: it.name || 'Свой интерьер' })
        : c ? { type: 'capsule', id: c.id, name: capName(c.id) } : null;
      var cur = fl.interior || null, same = !want ? !cur : !!cur && typeof cur === 'object' && cur.type === want.type && (want.type === 'capsule' ? (cur.id || cur.capsuleId) === want.id : cur.how === want.how && cur.name === want.name);
      if (same) return;
      fl.interior = want; localStorage.setItem(FLOW, JSON.stringify(fl));
    } catch (e) {}
  }
  var flats = {
    STATE: STATE, STATE_MY: STATE_MY, MY_STATE: MY_STATE, accuracy: accuracyOf,
    list: function () { return st.flats.slice(); },
    get: function (id) { return st.flats.filter(function (f) { return f.id === id; })[0] || null; },
    active: function () { return flats.get(st.active) || st.flats[0] || null; },
    setActive: function (id) { var f = flats.get(id); if (f && st.active !== id) { st.active = id; syncFlow(); mirrorMy(f, ALL); save(); } },
    /* новая квартира: первая — «Моя квартира», дальше «Квартира 2», «Квартира 3»; поля объекта подтягиваем из старой анкеты, если она есть; сразу активная */
    add: function (o) {
      o = o || {}; var had = st.flats.length > 0, ob = (!st.flats.length && S.orders && S.orders.object.get()) || {}, now = Date.now();
      var f = { id: uid('flat'), name: o.name || (st.flats.length ? 'Квартира ' + (st.flats.length + 1) : 'Моя квартира'), jk: o.jk || ob.complex || '', city: o.city || ob.city || '',
        m2: num(o.m2, ob.area || null), rooms: num(o.rooms, num(ob.rooms, null)), baths: num(o.baths, num(ob.bathrooms, null)), state: o.state || null, budgetType: o.budgetType || ob.tier || null,
        accuracy: 'примерно', isDraft: !!o.isDraft, currentInteriorId: null, capsuleId: o.capsuleId || null, ts: now, createdAt: now };
      st.flats.push(f); st.active = f.id; if (had) syncFlow(); mirrorMy(f, ALL); save(); return f;
    },
    /* квартира создаётся сама при первом действии с данными — черновик «Моя квартира» */
    ensure: function () { return flats.active() || flats.add({ name: 'Моя квартира', isDraft: true }); },
    update: function (id, patch) {
      var f = flats.get(id); if (!f) return null; patch = patch || {};
      Object.assign(f, patch); f.accuracy = accuracyOf(f.id);
      /* расчёт (S.my) зеркалит только активную квартиру: правка другой (choose / setCurrent с flatId) активную и расчёт не трогает */
      if (f === flats.active()) mirrorMy(f, Object.keys(patch).filter(function (k) { return ALL.indexOf(k) >= 0; }));
      save(); return f;
    },
    /* ensure + update: первое действие с данными создаёт квартиру и сразу заполняет; имя, ЖК, город или план снимают «черновик» */
    touch: function (patch) {
      patch = Object.assign({}, patch || {}); var f = flats.ensure();
      if (patch.name || patch.jk || patch.city) patch.isDraft = false;
      return flats.update(f.id, patch);
    }
  };
  function rp(id) { id = id || (flats.active() || {}).id; if (!id) return { plan: null, interior: null, rooms: {}, budget: null }; return attachInteriors(st.repair[id] || (st.repair[id] = { plan: null, rooms: {}, budget: null, interiors: [] }), id); }
  function favOf(id) { id = id || (flats.active() || {}).id; return id ? (st.fav[id] || (st.fav[id] = [])) : []; }
  function cartOf(id) { id = id || (flats.active() || {}).id; return id ? (st.cart[id] || (st.cart[id] = [])) : []; }

  /* ---------- интерьеры квартиры (схема v2 Алины, созвон 28.10: один объект можно проработать в нескольких интерьерах) ----------
     r.interiors — список досок в порядке создания: {id, type ('capsule' | 'own'), capsuleId, baseCapsuleId, name, img / imageUrl, level, scope, zones, slots, dna,
     renders, objects, status ('active'), createdAt, ts, …}. r.interior — ТЕКУЩИЙ (flat.currentInteriorId): свойство-аксессор, отдельно в localStorage не хранится,
     все экраны (бюджет, полоса, Мой ремонт) читают R.get().interior как раньше. Запись r.interior = доска кладёт её в список (по id; без id — новый интерьер)
     и делает текущей; прежний остаётся в списке со своими материалами и рендерами. Смена интерьера — круг заново: материалы и визуализации собираются под новый.
     Старый формат (r.interior без r.interiors, r.interiorHistory) переезжает в список при первом чтении — данные не теряются.
     Лёгкая запись — выбор капсулы без материалов (окно выбора капсулы в любом блоке, R.interiors.choose; договор частей 02.11):
     {type:'capsule', source: блок, capsuleId, name, img, imageUrl, level} без slots, dna и productIds. У объекта она одна и обновляется на месте;
     доска без id занимает её место (тот же id) — правило одно, здесь (adoptOf), для R.save, r.interior = … и выбора капсулы. */
  function curIdOf(r, flatId) { var f = flats.get(flatId); return f ? (f.currentInteriorId || null) : (r.currentInteriorId || null); }
  function setCurId(r, flatId, id) { var f = flats.get(flatId); if (f) f.currentInteriorId = id; else r.currentInteriorId = id; }
  /* старые записи хранили имя с кодом капсулы («К2 · Изумрудная неоклассика»): коды в интерфейсе не показываем — срезаем в самой записи,
     тогда Бюджет, Интерьер и любой экран, читающий R.get().interior.name, видят имя без кода (проверка 02.11). → true, если имя поменялось */
  function stripCode(it) { if (!it || typeof it.name !== 'string') return false; var nm = it.name.replace(/^К\d+\s*·\s*/, ''); if (nm === it.name) return false; it.name = nm; return true; }
  function normInterior(it, now) {
    if (!it || typeof it !== 'object') return null;
    if (!it.id) it.id = uid('int'); if (!it.status) it.status = 'active'; if (!it.createdAt) it.createdAt = it.boardGeneratedAt || it.ts || now || Date.now();
    stripCode(it);
    return it;
  }
  function isLight(x) { return !!(x && x.type === 'capsule' && !x.slots && !(x.dna && x.dna.length) && !(x.productIds && x.productIds.length)); }
  function lightOf(r) { var cur = r.interior; return isLight(cur) ? cur : (r.interiors || []).filter(isLight).pop() || null; }
  /* запись интерьера без id — чьё место она занимает (null — новый интерьер объекта):
     доска (slots) — текущей лёгкой записи (любой капсулы), текущей заготовки той же капсулы без slots или лёгкой записи той же капсулы —
     после сборки в Интерьере в списке один интерьер, а не два одинаковых; лёгкая — прежней лёгкой; мудборд капсулы без slots — лёгкой записи той же капсулы */
  function adoptOf(r, v) {
    if (!v || typeof v !== 'object' || v.id) return null;
    var cur = r.interior, l = lightOf(r), cap = v.capsuleId || v.baseCapsuleId || null;
    if (v.slots) return isLight(cur) ? cur : cur && !cur.slots && cur.type !== 'own' && cap && cur.capsuleId === cap ? cur : l && cap && l.capsuleId === cap ? l : null;
    if (isLight(v)) return l;
    return l && cap && v.type !== 'own' && l.capsuleId === cap ? l : null;
  }
  /* выбор капсулы, смена текущего интерьера: капсула и тип ремонта расчёта и бюджета следуют за объектом
     (договор: r.scoutParams.level и r.budgetPlan.type равны flat.budgetType; капсула расчёта — капсула текущего интерьера) */
  function syncCalc(r, lv, capsuleId) {
    var ch = false, sp = r.scoutParams, bp = r.budgetPlan;
    if (sp && capsuleId && sp.capsuleId !== capsuleId) { sp.capsuleId = capsuleId; ch = true; }
    if (sp && lv && sp.level !== lv) { sp.level = lv; ch = true; }
    if (bp && lv && bp.type !== lv) { bp.type = lv; ch = true; }
    return ch;
  }
  /* полный бюджет Планировки (budgetPlan.full) пересчитать под новый тип и капсулу — тот же путь, что у переключателя типа в Планировке (бесплатно) */
  function refreshFlow(f) { try { var FL = window.SOVE_FLOW; if (FL && FL.refreshBudget && f && f === flats.active()) FL.refreshBudget(); } catch (e) {} }
  /* тихая запись хранилища (без события и полосы) — после миграции старого формата */
  var persistT = null;
  function persistSoon() { if (persistT) return; persistT = setTimeout(function () { persistT = null; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }, 0); }
  function attachInteriors(r, flatId) {
    var d = Object.getOwnPropertyDescriptor(r, 'interior'); if (d && d.get) return r;
    var legacy = r.interior || null, hist = r.interiorHistory || [], now = Date.now();
    delete r.interior; delete r.interiorHistory;
    if (!Array.isArray(r.interiors)) r.interiors = [];
    var has = function (id) { return r.interiors.some(function (x) { return x.id === id; }); }, renamed = false;
    r.interiors.forEach(function (x) { if (stripCode(x)) renamed = true; normInterior(x, now); });
    /* старый формат: история «Заменить?» (новые сверху) → в порядке создания, затем сохранённый интерьер — он и текущий */
    hist.slice().reverse().concat(legacy ? [legacy] : []).forEach(function (x) { if (normInterior(x, now) && !has(x.id)) r.interiors.push(x); });
    if (legacy) setCurId(r, flatId, legacy.id);
    var cid = curIdOf(r, flatId); if (!has(cid) && r.interiors.length) setCurId(r, flatId, r.interiors[r.interiors.length - 1].id);
    if (legacy || hist.length || renamed) persistSoon();   /* переезд старого формата и имена без кода — записать сразу (id интерьеров стабильны, экраны без repair.js видят список) */
    Object.defineProperty(r, 'interior', { enumerable: false, configurable: true,
      get: function () { var id = curIdOf(r, flatId); return r.interiors.filter(function (x) { return x.id === id; })[0] || null; },
      set: function (v) {
        if (!v) { setCurId(r, flatId, null); return; }
        var a = adoptOf(r, v); if (a) { v.id = a.id; if (!v.createdAt) v.createdAt = a.createdAt; }   /* доска без id — на место лёгкой записи */
        normInterior(v); var i = r.interiors.map(function (x) { return x.id; }).indexOf(v.id);
        if (i >= 0) r.interiors[i] = v; else r.interiors.push(v);
        setCurId(r, flatId, v.id);
        var f = flats.get(flatId); if (f && v.capsuleId) f.capsuleId = v.capsuleId;   /* капсула текущего интерьера — капсула квартиры */
      } });
    return r;
  }
  /* имя интерьера для списков, полоски и тостов — без кода капсулы: своё (переименованный), иначе короткое имя капсулы;
     полное имя из data.js (так пишут старые сохранения мудборда) тоже показываем коротким — одно имя на все экраны */
  function interiorName(it) {
    var c = it.capsuleId && D.capsule(it.capsuleId), nm = String(it.name || '').replace(/^К\d+\s*·\s*/, '');
    if (c && nm === c.name) nm = '';
    return nm || (c ? capName(c.id) : '') || it.style || 'Мой интерьер';
  }
  /* карточка интерьера для списков: «Изумрудная неоклассика» (title = name, без кода), n — номер в порядке создания («1 из 2»), rooms / renders / slots — счётчики,
     light — выбор капсулы без материалов (доску соберёт Интерьер). code — только для данных, в интерфейсе не показывать */
  function interiorSummary(it, i, cid, flatId) {
    var c = it.capsuleId && D.capsule(it.capsuleId), name = interiorName(it);
    var rooms = it.scope === 'rooms' ? (it.zones || []).length : it.scope === 'room' ? 1 : (planZones(flatId).zones.length || roomsOf(flatId).length);
    return { id: it.id, n: i + 1, name: name, title: name, code: c ? c.code : '', type: it.type || (it.capsuleId ? 'capsule' : 'own'),
      capsuleId: it.capsuleId || null, baseCapsuleId: it.baseCapsuleId || null, img: it.img || it.imageUrl || (c && c.cover) || '', level: it.level || null,
      scope: it.scope || 'flat', zones: (it.zones || []).slice(), rooms: rooms, status: it.status || 'active', createdAt: it.createdAt || it.ts || null, ts: it.ts || null,
      renders: (it.renders || []).length, slots: it.slots ? Object.keys(it.slots).length : 0, light: isLight(it), source: it.source || null, current: it.id === cid };
  }
  var interiors = {
    list: function (flatId) { var r = rp(flatId), cid = r.interior ? r.interior.id : null; return (r.interiors || []).map(function (it, i) { return interiorSummary(it, i, cid, flatId || (flats.active() || {}).id); }); },
    get: function (id, flatId) {
      var ids = flatId ? [flatId] : [(flats.active() || {}).id].concat(st.flats.map(function (f) { return f.id; }));
      for (var i = 0; i < ids.length; i++) { if (!ids[i]) continue; var hit = (rp(ids[i]).interiors || []).filter(function (x) { return x.id === id; })[0]; if (hit) return hit; }
      return null;
    },
    current: function (flatId) { return rp(flatId).interior; },
    /* новый интерьер квартиры — становится текущим; прежний остаётся в списке (не архив — просто не текущий) */
    add: function (data, flatId) { var f = flatId ? flats.get(flatId) : flats.ensure(); if (!f) return null; var v = write('interior', Object.assign({}, data, { id: null }), f.id); save(); return v; },
    /* выбор капсулы из любого блока (окно выбора капсулы, Бюджет, Планировка, Мой ремонт) — ОДНА запись на объект, без дублей; ничего не списывает.
       Та же капсула уже есть у объекта (текущий интерьер, доска, своя на её основе) — становится текущей; иначе лёгкая запись (одна, обновляется на месте).
       o = {level: 'base'|'premium', source: блок, flatId}; уровень → flat.budgetType, тип расчёта и бюджета. → запись интерьера или null */
    choose: function (capsuleId, o) {
      o = o || {}; var c = D.capsule(capsuleId); if (!c || c.soon) return null;
      var f = o.flatId ? flats.get(o.flatId) : flats.ensure(); if (!f) return null;
      var r = rp(f.id), lv = lvOf(o.level), cur = r.interior, list = r.interiors || [];
      var same = function (x) { return x.capsuleId === capsuleId; };
      var hit = cur && same(cur) ? cur : list.filter(function (x) { return same(x) && x.slots; }).pop() || list.filter(same).pop() || null;
      if (hit) {
        var lvl = lv && !hit.slots && hit.level !== lv, src = o.source && isLight(hit) && hit.source !== o.source;   /* уровень доски задают её материалы — у доски не трогаем */
        if (lvl) hit.level = lv; if (src) hit.source = o.source; if (lvl || src) hit.ts = Date.now();
        setCurId(r, f.id, hit.id);
      } else {
        hit = write('interior', { type: 'capsule', source: o.source || 'picker', capsuleId: capsuleId, name: capName(capsuleId), img: c.cover, imageUrl: c.cover,
          level: lv || lvOf(f.budgetType) }, f.id);
      }
      var ch = syncCalc(r, lv, capsuleId), patch = { capsuleId: capsuleId }; if (lv) patch.budgetType = lv;
      flats.update(f.id, patch);   /* всегда через update: зеркало в расчёт (S.my) и событие 'sove:repair' */
      if (ch) refreshFlow(f);
      return hit;
    },
    /* переключение: flat.currentInteriorId; капсула и тип ремонта интерьера (База / Премиум) — капсула и тип квартиры, расчёта и бюджета;
       save → 'sove:repair' — полоса, бюджет и Мой ремонт перерисуются */
    setCurrent: function (id, flatId) {
      var f = flatId ? flats.get(flatId) : flats.active(); if (!f) return null;
      var r = rp(f.id), it = (r.interiors || []).filter(function (x) { return x.id === id; })[0]; if (!it) return null;
      setCurId(r, f.id, it.id);
      var lv = lvOf(it.level), patch = {};
      if (it.capsuleId) patch.capsuleId = it.capsuleId; if (lv) patch.budgetType = lv;
      var ch = syncCalc(r, lv, it.capsuleId || null);
      flats.update(f.id, patch);
      if (ch) refreshFlow(f);
      return it;
    },
    remove: function (id, flatId) {
      var f = flatId ? flats.get(flatId) : flats.active(); if (!f) return false;
      var r = rp(f.id), n = (r.interiors || []).length; r.interiors = (r.interiors || []).filter(function (x) { return x.id !== id; });
      if (r.interiors.length === n) return false;
      if (curIdOf(r, f.id) === id) setCurId(r, f.id, r.interiors.length ? r.interiors[r.interiors.length - 1].id : null);
      save(); return true;
    },
    rename: function (id, name, flatId) { var it = interiors.get(id, flatId); if (!it) return null; it.name = String(name || '').trim() || it.name; save(); return it; }
  };

  /* ---------- чтение для экрана ---------- */
  function level(id) { var p = rp(id).plan; return p ? p.level : 'none'; }
  function roomsOf(id) { var p = rp(id).plan; return p && p.rooms && p.rooms.length ? p.rooms.map(function (r) { return { key: roomKey(r.name), name: r.name, m2: r.m2 }; }) : DEFAULT_ROOMS.slice(); }
  function rendersCount(id) { var r = rp(id).rooms, n = 0; Object.keys(r).forEach(function (k) { if (k.indexOf(':') < 0) n += (r[k] || []).length; }); return n; }
  function capsuleProducts(capsuleId) { return D.products.filter(function (p) { return p.img && (p.capsules || []).indexOf(capsuleId) >= 0; }); }
  function roomProducts(key, id) { var it = rp(id).interior; if (!it || !it.capsuleId) return []; var cats = ROOM_CATS[key] || []; return capsuleProducts(it.capsuleId).filter(function (p) { return cats.indexOf(p.category) >= 0; }).slice(0, 6); }
  function cartRows(id) { return cartOf(id).map(function (r) { var p = D.product(r.productId); return p ? Object.assign({ product: p }, r) : null; }).filter(Boolean); }
  function cartTotals(id) { var t = { count: 0, qty: 0, metod: 0, retail: 0 }; cartRows(id).forEach(function (r) { t.count++; t.qty += r.qty; t.metod += r.product.metod * r.qty; t.retail += r.product.retail * r.qty; }); return t; }
  /* путь квартиры: Основа → Интерьер → Бюджет → Покупки и одна подсказка «Следующий шаг» */
  function progress(id) {
    var r = rp(id), f = id ? flats.get(id) : flats.active(), base = !!r.plan || !!(f && f.m2), buy = cartOf(id).length > 0;
    var steps = [ { key: 'base', name: 'Основа', done: base }, { key: 'interior', name: 'Интерьер', done: !!r.interior }, { key: 'budget', name: 'Бюджет', done: !!r.budget }, { key: 'buy', name: 'Покупки', done: buy } ];
    var next = !base ? { text: 'Загрузите план — расставим мебель и посчитаем бюджет', cta: 'Загрузить план', href: LINK.plan }
      : !r.interior ? { text: 'Выберите интерьер — капсула SOVEAPP или своя картинка', cta: 'В Интерьер', href: LINK.materials }
      : !r.budget ? { text: 'Посчитайте бюджет ремонта — 2 минуты', cta: 'Посчитать бюджет', href: LINK.scout }
      : !buy ? { text: 'Перенесите бюджет в корзину', cta: 'Всё в корзину', href: MY + '#sec-budget' }
      : { text: 'Оформить корзину', cta: 'Оформить', href: MY + '?v=basket' };
    return { steps: steps, next: next };
  }
  /* бюджет устарел: после него сохранили другой план или мудборд */
  function budgetStale(id) { var r = rp(id); if (!r.budget) return false; return (r.plan && r.plan.ts > r.budget.ts) || (r.interior && r.interior.ts > r.budget.ts); }

  /* ---------- тосты с действием: «Сохранено в Мой ремонт · Открыть» ---------- */
  function toast(text, act) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast toast--ok rp-toast';
    t.innerHTML = '<span>' + esc(text) + '</span>' + (act ? (act.href ? '<a href="' + esc(act.href) + '">' + esc(act.label) + '</a>' : '<button type="button">' + esc(act.label) + '</button>') : '');
    if (act && act.onClick) t.querySelector('button').addEventListener('click', function () { t.remove(); act.onClick(); });
    box.appendChild(t); setTimeout(function () { t.remove(); }, 5200);
  }
  /* корзина и бюджет — свои экраны (якорей #sec-cart / #sec-budget на главном виде «Моего ремонта» нет) */
  function anchor(kind) { if (kind === 'cart') return MY + '?v=basket'; if (kind === 'budget') return MY + '?v=budget'; return MY + '#sec-' + ({ plan: 'plan', interior: 'interior', render: 'rooms', fav: 'fav' }[kind] || 'plan'); }
  function savedToast(kind, flatId, move) {
    if (st.flats.length > 1) { var f = flats.get(flatId); toast('Сохранено в «' + f.name + '»', { label: 'Сменить', onClick: function () { pickFlat(flatId, move); } }); }
    else toast('Сохранено в Мой ремонт', { label: 'Открыть', href: anchor(kind) });
  }
  /* «Сменить»: перекинуть только что сохранённое в другую квартиру */
  function pickFlat(fromId, move) {
    var others = st.flats.filter(function (f) { return f.id !== fromId; });
    var m = ui.modal({ title: 'В какую квартиру?', html: '<div class="rp-pick">' + others.map(function (f) { return '<button type="button" class="rp-pick__b" data-to="' + f.id + '"><b>' + esc(f.name) + '</b><span>' + esc(flatLine(f) || 'данных пока нет') + '</span></button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    m.el.querySelectorAll('[data-to]').forEach(function (b) { b.addEventListener('click', function () { var to = b.getAttribute('data-to'); m.close(); move(to); save(); ui.toast('Перенесли в «' + flats.get(to).name + '»', 'ok'); }); });
  }
  /* строка квартиры «ЖК · город · м²»; «ЖК» не дублируем, если человек вписал его сам */
  function flatLine(f) { if (!f) return ''; return [f.jk ? (/^(жк|кп)\s/i.test(f.jk) ? f.jk : 'ЖК ' + f.jk) : '', f.city, f.m2 ? F.area(f.m2) : ''].filter(Boolean).join(' · '); }

  /* ---------- сохранения из Генерации и расчёта (таблица п. 3 ТЗ) ----------
     kind: 'plan' {level, img, rooms:[{name,m2}], variant} · 'interior' {capsuleId|null, name, img, dna:[src], productIds}
           'render' {room, src, mine} — без лимита · 'budget' {type:'base'|'premium', area, works, kitMetod, kitRetail, total} */
  function write(kind, data, flatId) {
    var r = rp(flatId), now = Date.now();
    if (kind === 'render') {
      var k = roomKey(data.room), list = r.rooms[k] || (r.rooms[k] = []);
      /* тот же кадр второй раз (Интерьер кладёт его и при генерации, и по «В Мой ремонт») — не дублируем, освежаем время */
      var same = list.filter(function (x) { return x.src === data.src; })[0];
      if (same) { same.ts = now; if (data.from) same.from = data.from; return same; }
      var item = { id: uid('rnd'), src: data.src, ts: now, mine: !!data.mine, from: data.from || null, capsuleId: data.capsuleId || (r.interior && r.interior.capsuleId) || null, interiorTs: r.interior ? r.interior.ts : null, interiorId: r.interior ? r.interior.id : null };
      list.unshift(item); if (!r.rooms[k + ':main']) r.rooms[k + ':main'] = item.id; return item;
    }
    var v = Object.assign({}, data, { ts: now });
    /* интерьер: с id — обновление той же доски, без id — НОВЫЙ интерьер квартиры (прежний остаётся в r.interiors со своими материалами и рендерами),
       кроме места лёгкой записи (adoptOf: лёгкая — одна на объект, доска встаёт на её место); записанный становится текущим — flat.currentInteriorId ставит аксессор r.interior */
    if (kind === 'interior') { var ad = data.id ? null : adoptOf(r, data); v.id = data.id || (ad && ad.id) || uid('int'); v.status = data.status || 'active'; v.createdAt = data.createdAt || (ad && ad.createdAt) || now; }
    var prevPlan = kind === 'plan' ? r.plan : null;
    r[kind] = v;
    /* план — основа квартиры: площадь и ЖК, точность из уровня основы, черновик снимается.
       Площадь и ЖК, взятые из плана (f.m2Src = 'plan'), идут за текущим планом: пришёл другой план — площадь по его комнатам (комнат
       ещё нет — пусто, пока «Всё верно» Планировки их не запишет), ЖК — его; поля примера ЖК PRIDE своим планом не остаются
       (Валерия 02.11: загрузила свой план — полоска всё равно «ЖК PRIDE · 47 м²»). Площадь, вписанную человеком в объект, не трогаем */
    if (kind === 'plan') { var f = flats.get(flatId), m2 = (data.rooms || []).reduce(function (a, x) { return a + (x.m2 || 0); }, 0); if (f) {
      var m2r = m2 ? Math.round(m2 * 10) / 10 : null, smp = data.sample === 'pride' || data.jk === 'PRIDE';
      var other = !prevPlan || (prevPlan.file || '') !== (data.file || '') || !!prevPlan.sample !== !!data.sample;
      if (f.jk === 'PRIDE' && !smp) { f.jk = data.jk || ''; f.m2Src = 'plan'; }
      if (f.m2Src === 'plan' && (m2r || other)) f.m2 = m2r;
      else if (m2r && !f.m2) { f.m2 = m2r; f.m2Src = 'plan'; }
      if (data.jk && !f.jk) f.jk = data.jk;
      if (m2r) mirrorMy(f, ['m2']);
      f.accuracy = accuracyOf(f.id); f.isDraft = false; } }
    /* капсула интерьера — капсула квартиры */
    if (kind === 'interior') { var fi = flats.get(flatId); if (fi && data.capsuleId) fi.capsuleId = data.capsuleId; }
    if (kind === 'budget') { var fb = flats.get(flatId); if (fb) fb.budgetType = data.type; }
    return v;
  }
  function saveTo(kind, data, opts) {
    opts = opts || {};
    var f = flats.ensure(), r = rp(f.id), single = kind !== 'render', cur = single && r[kind];
    function go() {
      write(kind, data, f.id); save();
      if (opts.silent) return;
      savedToast(kind, f.id, function (to) {
        var src = rp(f.id), dst = rp(to);
        if (kind === 'render') { var k = roomKey(data.room); var it = (src.rooms[k] || []).shift(); if (it) (dst.rooms[k] = dst.rooms[k] || []).unshift(it); if (src.rooms[k + ':main'] === (it && it.id)) src.rooms[k + ':main'] = (src.rooms[k][0] || {}).id || null; if (!dst.rooms[k + ':main'] && it) dst.rooms[k + ':main'] = it.id; }
        /* интерьер — в список другой квартиры; здесь текущим снова становится прежний */
        else if (kind === 'interior') { var ii = src.interior; if (ii) { src.interiors = src.interiors.filter(function (x) { return x.id !== ii.id; }); setCurId(src, f.id, cur && cur.id !== ii.id ? cur.id : (src.interiors.length ? src.interiors[src.interiors.length - 1].id : null)); dst.interior = ii; } }
        else { dst[kind] = src[kind]; src[kind] = cur || null; }
      });
      if (opts.done) opts.done();
    }
    /* новый интерьер прежний не заменяет (у объекта несколько интерьеров) — вопроса «Заменить?» для него нет */
    if (cur && kind !== 'interior' && !opts.force) ui.confirm({ title: 'Заменить текущий ' + WHAT[kind] + '?', text: 'В «' + f.name + '» уже сохранён ' + WHAT[kind] + ' от ' + F.dateLong(cur.ts) + '. Прежний останется в истории ' + (kind === 'budget' ? 'расчётов' : 'генераций') + '.', ok: 'Заменить', onOk: go });
    else go();
  }
  function setMainRender(key, id) { var r = rp(); r.rooms[key + ':main'] = id; save(); }
  function removeRender(key, id) { var r = rp(), list = r.rooms[key] || []; r.rooms[key] = list.filter(function (x) { return x.id !== id; }); if (r.rooms[key + ':main'] === id) r.rooms[key + ':main'] = (r.rooms[key][0] || {}).id || null; save(); }

  /* кнопка «Сохранить в Мой ремонт» для экранов-источников: данные лежат в атрибуте, нажатие — saveTo с вопросом «Заменить?» */
  function saveButton(kind, data, label, cls) { return '<button type="button" class="' + (cls || 'btn btn--primary') + '" data-rp-save="' + kind + '" data-payload="' + esc(JSON.stringify(data)) + '">' + esc(label || 'Сохранить в Мой ремонт') + '</button>'; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rp-save]'); if (!b) return;
    e.preventDefault(); var data; try { data = JSON.parse(b.getAttribute('data-payload') || '{}'); } catch (x) { return; }
    saveTo(b.getAttribute('data-rp-save'), data, { done: function () { b.classList.add('is-saved'); } });
  });

  /* ---------- ♡ и 🛒 текущей квартиры ---------- */
  var fav = {
    has: function (pid) { return favOf().indexOf(Number(pid)) >= 0; },
    list: function (id) { return favOf(id).slice(); },
    toggle: function (pid, quiet) {
      var f = flats.ensure(), list = favOf(f.id); pid = Number(pid); var i = list.indexOf(pid);
      if (i >= 0) list.splice(i, 1); else list.unshift(pid); save();
      if (!quiet) toast(i >= 0 ? 'Убрали из Избранного' : 'В Избранном · ' + f.name, i >= 0 ? null : { label: 'Открыть', href: anchor('fav') });
      return i < 0;
    },
    move: function (pid, to) { pid = Number(pid); var from = favOf(); var i = from.indexOf(pid); if (i >= 0) from.splice(i, 1); var dst = favOf(to); if (dst.indexOf(pid) < 0) dst.unshift(pid); save(); }
  };
  /* корзина квартиры (♡/🛒 в Маркете, ленте, Интерьере) зеркалится в корзину оплаты O.basket (экран my.html?v=basket, заказы по поставщикам):
     раньше товар из Маркета и ленты до экрана корзины и заказа не доходил (созвон 28.10: «всё в итоге попадает в Мой ремонт») */
  /* продавец строки (Таня 29.10: один товар — несколько продавцов-складов, DECARO · Москва / · Санкт-Петербург):
     seller — объект {id, name, city, delivery, priceDelta} или id продавца; не передан — выбранный на карточке товара или по умолчанию (SOVE.sellers).
     У товара с одним продавцом — null: корзина и заказ группируются по бренду, как раньше */
  function sellerOf(pid, seller) {
    try {
      if (seller && typeof seller === 'object' && seller.name) return { id: seller.id || seller.name, name: seller.name, city: seller.city || '', delivery: seller.delivery || '', priceDelta: Number(seller.priceDelta) || 0 };
      var X = S.sellers, p = D.product(pid); if (!X || !p) return null;
      var s = seller ? X.get(p, seller) : null; return s ? X.short(s) : X.pick(p);
    } catch (e) { return null; }
  }
  function mirror(pid, source, qty, seller) { try { var O = S.orders; if (O && O.basket && !O.basket.has(pid)) O.basket.add(pid, source === 'budget' ? 'budget' : 'catalog', qty || 1, seller || undefined); } catch (e) {} }
  function unmirror(pid) { try { var O = S.orders; if (!O || !O.basket) return; O.basket.list().filter(function (b) { return b.productId === Number(pid); }).forEach(function (b) { O.basket.remove(b.id); }); } catch (e) {} }
  /* строка корзины квартиры: {productId, qty, source, ts, seller?} */
  var cart = {
    has: function (pid) { return cartOf().some(function (r) { return r.productId === Number(pid); }); },
    rows: cartRows, totals: cartTotals,
    add: function (pid, source, quiet, seller) {
      var f = flats.ensure(), list = cartOf(f.id); pid = Number(pid);
      var row = list.filter(function (r) { return r.productId === pid; })[0], sl = sellerOf(pid, seller);
      if (row) { row.qty += 1; if (sl && (!row.seller || seller)) { row.seller = sl; try { if (S.orders) S.orders.basket.setSeller(pid, sl); } catch (e) {} } }
      else { var nr = { productId: pid, qty: 1, source: SRC[source] ? source : 'market', ts: Date.now() }; if (sl) nr.seller = sl; list.unshift(nr); }
      mirror(pid, source, row ? row.qty : 1, sl);
      /* товар живого каталога, которого нет в списке товаров страницы (🛒 на карточке Маркета): дотягиваем карточку по id —
         иначе корзина и заказ его не видят; заодно продавец по умолчанию (склад DECARO по исходному бренду) */
      if (!row && !D.product(pid) && S.catalog && S.catalog.resolve) {
        S.catalog.resolve(pid).then(function (p) {
          if (!p) return; registerProduct(p);
          var r2 = cartOf(f.id).filter(function (r) { return r.productId === pid; })[0]; if (!r2) return;
          if (!r2.seller) { var s2 = sellerOf(pid, seller); if (s2) r2.seller = s2; }
          mirror(pid, source, r2.qty, r2.seller); save();
        }).catch(function () {});
      }
      if (!quiet) { save(); cartToast(sl); }
    },
    /* продавец товара в корзине: смена на карточке товара — и в корзине оплаты */
    sellerOf: function (pid) { var row = cartOf().filter(function (r) { return r.productId === Number(pid); })[0]; return row ? row.seller || null : null; },
    setSeller: function (pid, seller) {
      pid = Number(pid); var row = cartOf().filter(function (r) { return r.productId === pid; })[0]; if (!row) return null;
      var sl = sellerOf(pid, seller); if (sl) row.seller = sl; else delete row.seller;
      try { if (S.orders) S.orders.basket.setSeller(pid, sl); } catch (e) {}
      save(); return sl;
    },
    addMany: function (ids, source) { var n = 0; flats.ensure(); ids.forEach(function (id) { if (!cart.has(id)) { cart.add(id, source, true); n++; } }); save(); cartToast(); return n; },
    remove: function (pid) { var f = flats.active(); if (!f) return; st.cart[f.id] = cartOf(f.id).filter(function (r) { return r.productId !== Number(pid); }); unmirror(pid); save(); },
    toggle: function (pid, source) { if (cart.has(pid)) { cart.remove(pid); toast('Убрали из корзины'); return false; } cart.add(pid, source); return true; },
    qty: function (pid, d) { var row = cartOf().filter(function (r) { return r.productId === Number(pid); })[0]; if (!row) return; row.qty = Math.max(1, row.qty + d); save(); },
    /* «Оформить»: корзина квартиры уходит в общую корзину оплаты (my.html?v=basket — оплата через SOVEAPP, заказы по поставщикам) */
    checkout: function () {
      var O = S.orders; if (!O) { location.href = MY + '?v=basket'; return; }
      cartRows().forEach(function (r) { if (!O.basket.has(r.productId)) O.basket.add(r.productId, r.source === 'budget' ? 'budget' : 'catalog', r.qty, r.seller || undefined); });
      location.href = MY + '?v=basket';
    }
  };
  /* ♡ подборки (Алина 25.10): целый блок товаров к интерьеру — товары капсулы; позже — посты Ленты METOD. Хранится в Избранном квартиры: {id, kind, capsuleId, title, cover, ts} */
  function setsOf(id) { id = id || (flats.active() || {}).id; if (!st.favSets) st.favSets = {}; return id ? (st.favSets[id] || (st.favSets[id] = [])) : []; }
  var favSets = {
    capsule: function (capId) {
      var c = D.capsule(capId), ids = capsuleProducts(capId).map(function (p) { return p.id; }); if (!c || !ids.length) return null;
      return { id: 'cap:' + capId, kind: 'capsule', capsuleId: capId, title: 'Товары к интерьеру «' + capName(capId) + '»', cover: c.cover, productIds: ids };
    },
    has: function (sid) { return setsOf().some(function (x) { return x.id === sid; }); },
    list: function (id) { return setsOf(id).map(function (x) { return x.kind === 'capsule' ? Object.assign({}, favSets.capsule(x.capsuleId) || x, { ts: x.ts }) : x; }); },
    toggle: function (set) {
      var f = flats.ensure(), list = setsOf(f.id), i = list.map(function (x) { return x.id; }).indexOf(set.id);
      if (i >= 0) list.splice(i, 1); else list.unshift({ id: set.id, kind: set.kind, capsuleId: set.capsuleId, title: set.title, cover: set.cover, ts: Date.now() });
      save(); toast(i >= 0 ? 'Подборку убрали из Избранного' : 'Подборка в Избранном · ' + f.name, i >= 0 ? null : { label: 'Открыть', href: 'favorites.html' });
      return i < 0;
    }
  };
  /* ♡ специалиста (раздел «Строители, дизайнеры и мастера») — в Избранном квартиры наравне с товарами и подборками.
     st.favPros[flatId] = [{id, sec, name, what, disc, ts}], новые сверху: снимок карточки — Избранное покажет его, даже если раздел поменяется.
     В R.fav (id товаров) и R.favSets не кладём. toggle(snapshot | id, quiet) → true, если добавили */
  function prosOf(id) { id = id || (flats.active() || {}).id; if (!st.favPros) st.favPros = {}; return id ? (st.favPros[id] || (st.favPros[id] = [])) : []; }
  var favPros = {
    has: function (pid) { pid = String(pid); return prosOf().some(function (x) { return x.id === pid; }); },
    list: function (flatId) { return prosOf(flatId).map(function (x) { return Object.assign({}, x); }); },
    toggle: function (snap, quiet) {
      if (snap !== null && typeof snap !== 'object') snap = { id: snap };
      if (!snap || snap.id === undefined || snap.id === null || snap.id === '') return false;
      var f = flats.ensure(), list = prosOf(f.id), id = String(snap.id), i = list.map(function (x) { return x.id; }).indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.unshift({ id: id, sec: String(snap.sec || ''), name: String(snap.name || ''), what: String(snap.what || ''), disc: String(snap.disc || ''), ts: Date.now() });
      save();
      if (!quiet) toast(i >= 0 ? 'Убрали из Избранного' : 'Специалист в Избранном · ' + f.name, i >= 0 ? null : { label: 'Открыть', href: 'favorites.html#fv-pros' });
      return i < 0;
    }
  };
  /* число позиций — по строкам корзины, а не по найденным карточкам: товар живого каталога дотягивается позже, и было «В корзине · 0» */
  function cartToast(seller) { toast('В корзине · ' + (seller && seller.name ? seller.name : cartOf().length), { label: 'Оформить', href: anchor('cart') }); }
  /* сердечки Маркета и карточки товара пишут в Избранное текущей квартиры */
  S.favs = { has: fav.has, list: function () { return fav.list(); }, toggle: function (id) { return fav.toggle(id); } };

  /* ---------- общая карточка товара (та же, что в Генерациях): [фото] Название · где применяется · цена METOD · ♡ · 🛒 ---------- */
  var HEART = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  var CART = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function price(p, qty) {
    qty = qty || 1;
    return S.metod.active()
      ? '<span class="rp-price"><b>' + F.rub(p.metod * qty) + '</b>' + (p.retail > p.metod ? '<s>' + F.rub(p.retail * qty) + '</s>' : '') + '</span>'
      : '<span class="rp-price rp-price--lock"><b>' + LOCK + F.rub(p.metod * qty) + '</b><small>' + F.rub(p.retail * qty) + '</small></span>';
  }
  function where(p) { return p.subcat || p.category; }
  function btns(p, source) {
    var f = fav.has(p.id), c = cart.has(p.id);
    return '<button type="button" class="rp-ic' + (f ? ' is-on' : '') + '" data-rp-fav="' + p.id + '" aria-pressed="' + f + '" aria-label="' + (f ? 'Убрать из Избранного' : 'В Избранное') + '">' + HEART + '</button>' +
      '<button type="button" class="rp-ic rp-ic--cart' + (c ? ' is-on' : '') + '" data-rp-cart="' + p.id + '" data-src="' + (source || 'market') + '" aria-pressed="' + c + '" aria-label="' + (c ? 'Убрать из корзины' : 'В корзину') + '">' + CART + '</button>';
  }
  function card(p, o) {
    o = o || {};
    return '<div class="rp-card"><a class="rp-card__pic" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="" loading="lazy"></a>' +
      '<a class="rp-card__body" href="product.html?id=' + p.id + '"><span class="rp-card__t">' + esc(p.name) + '</span><span class="rp-card__w">' + esc(o.where || where(p)) + '</span>' + price(p) + '</a>' +
      '<div class="rp-card__act">' + btns(p, o.source) + '</div></div>';
  }
  function syncButtons(scope) {
    (scope || document).querySelectorAll('[data-rp-fav]').forEach(function (b) { var on = fav.has(b.getAttribute('data-rp-fav')); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Убрать из Избранного' : 'В Избранное'); });
    (scope || document).querySelectorAll('[data-rp-cart]').forEach(function (b) { var on = cart.has(b.getAttribute('data-rp-cart')); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Убрать из корзины' : 'В корзину'); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rp-fav], [data-rp-cart]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.hasAttribute('data-rp-fav')) fav.toggle(b.getAttribute('data-rp-fav'));
    else cart.toggle(b.getAttribute('data-rp-cart'), b.getAttribute('data-src'));
    syncButtons();
  });
  window.addEventListener('sove:repair', function () { syncButtons(); });

  /* ---------- полоса над нижним меню: Корзина (N · сумма) · Избранное (N) · Бюджет (сумма / «посчитать →») ---------- */
  /* своя доска отделки (блок Материалы): «Материалы» известны только при охвате всей квартиры (методология, П6) */
  function ownMat(id) {
    var it = rp(id).interior; if (!it || (it.type !== 'own' && it.type !== 'capsule') || !it.slots) return null;
    /* охват: ТЗ v2 — scope 'flat' | 'room'; доски по старому ТЗ — {whole, rooms} */
    /* охват: 'flat' — вся квартира; 'rooms' + zones[] (ТЗ Интерьера) или 'room' (Материалы v2) — часть, в бюджет не идёт (П6); сумма части — в part */
    var whole = !it.scope || it.scope === 'flat' || it.scope.whole === true, zones = it.scope === 'rooms' ? (it.zones || []).length : it.scope === 'room' ? 1 : (it.scope && it.scope.rooms || []).length;
    var sum = materialsSum('flat', { id: id });
    return { known: whole, value: whole ? sum : 0, part: sum, zones: zones, total: planZones(id).zones.length || roomsOf(id).length };
  }
  /* итог сохранённого расчёта квартиры — та же цифра, что «Плановый бюджет» экрана Бюджета без полного бюджета (my-budget.js, fromSaved):
     r.budget.total («Сохранить в Мой ремонт» в Расчёте), иначе сумма комнат r.scoutParams.byRooms; расчёта нет — 0 */
  function savedTotal(r) {
    var b = r && r.budget, br = r && r.scoutParams && r.scoutParams.byRooms;
    if (b && b.total > 0) return Math.round(b.total);
    var t = br && br.length ? br.reduce(function (a, x) { return a + (Number(x.total) || 0); }, 0) : 0;
    return t > 0 ? Math.round(t) : 0;
  }

  /* зоны квартиры и их площади: план (Мой ремонт / Планировка) → точно; нет плана — комнаты квартиры, площадь — м² квартиры или 47 м² примера */
  function planZones(id) {
    var KB = window.SOVE_KB; if (!KB) return { zones: [], zoneArea: {}, area: 0, exact: false };
    var f = flats.get(id || (flats.active() || {}).id), r = rp(id), rooms = r.plan && r.plan.rooms ? r.plan.rooms : [];
    var m2 = rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0);
    var Pd = window.SOVE_FLOW && window.SOVE_FLOW.planDoc && window.SOVE_FLOW.planDoc();
    if (!m2 && Pd && Pd.rooms) { rooms = Pd.rooms; m2 = rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0); }
    /* каждая комната плана — отдельная единица со своей площадью (Алина 26.10): первая комната типа — ключ зоны, следующие — тип-2, тип-3 */
    var za = {}, n = {}, units = [];
    (rooms.length ? rooms : roomsOf(id)).forEach(function (x) {
      var t = KB.zoneOf(x.name); n[t] = (n[t] || 0) + 1;
      var key = n[t] === 1 ? t : t + '-' + n[t], u = { key: key, type: t, name: x.name === 'Гостиная-кухня' ? 'Кухня-гостиная' : x.name, m2: x.m2 || null };
      KB.UNITS[key] = u; units.push(u); if (m2) za[key] = x.m2 || 0;
    });
    var order = KB.ZONES.map(function (z) { return z.key; });
    units.sort(function (a, b) { return order.indexOf(a.type) - order.indexOf(b.type) || (a.key < b.key ? -1 : 1); });
    return { zones: units.map(function (u) { return u.key; }), units: units, zoneArea: za, exact: !!m2,
      area: m2 ? Math.round(m2 * 10) / 10 : (f && f.m2 ? f.m2 : KB.AREA), rooms: rooms, doc: Pd };
  }
  /* ОДНА сумма материалов (ТЗ chips-budget, 4; TZ-budget, 4) — для Интерьера, Моего ремонта и Бюджета: room — id зоны или 'flat';
     o.slot — один слот; o.category — категория бюджета (finish | light | sockets | plumbing | doors, поле budgetCat слота); o.board — доска вместо паспорта.
     Сумма слота (на всю квартиру) делится между зонами плана, где он применён: по площади (план) или поровну; комплекты и штуки — поровну.
     Комната округляется до 100 ₽; 'flat' = Σ комнат доски — сумма комнат всегда равна строке «Материалы». */
  function materialsSum(room, o) {
    o = o || {}; var KB = window.SOVE_KB, b = o.board || rp(o.id).interior; if (!KB || !b || !b.slots) return 0;
    var pz = o.plan || planZones(o.id), keys = o.slot ? [o.slot] : KB.SLOTS.filter(function (s) { return !o.category || s.budgetCat === o.category; }).map(function (s) { return s.key; });
    if (!room || room === 'flat') {
      var on = b.scope === 'rooms' && (b.zones || []).length ? b.zones : pz.zones;
      return on.reduce(function (a, z) { return a + materialsSum(z, Object.assign({}, o, { plan: pz })); }, 0);
    }
    return keys.reduce(function (a, k) {
      var e = b.slots[k], it = e && KB.item(e.sku); if (!it || !KB.inZone(k, room)) return a;
      var zs = pz.zones.filter(function (z) { return KB.inZone(k, z); }); if (zs.indexOf(room) < 0) zs.push(room);
      var byArea = it.unit !== 'компл.' && it.unit !== 'шт' && zs.every(function (z) { return pz.zoneArea[z]; });
      var w = byArea ? pz.zoneArea[room] / zs.reduce(function (x, z) { return x + pz.zoneArea[z]; }, 0) : 1 / zs.length;
      return a + Math.round((e.sum || 0) * w / 100) * 100;
    }, 0);
  }
  function stripOn() { return document.body && document.body.hasAttribute('data-repair-strip'); }
  function renderStrip() {
    if (!stripOn()) return;
    var el = document.getElementById('rp-strip');
    if (!el) { el = document.createElement('nav'); el.id = 'rp-strip'; el.className = 'rp-strip'; el.setAttribute('aria-label', 'Корзина, Избранное и Бюджет квартиры'); document.body.appendChild(el); document.body.classList.add('has-rp-strip'); }
    var t = cartTotals(), fv = favOf().length, b = rp().budget, bp = rp().budgetPlan, onMy = document.body.getAttribute('data-page') === 'my';
    /* одна цифра везде (ТЗ Планировки, 12.5): бюджет «ремонт под ключ» из Планировки; нормы — заглушки, итога нет — «[сумма] ₽» */
    /* раздел 17: полный бюджет куплен — «итого ≈ …»; нет — «мебель ≈ … · весь — узнать ›» (мебель из Планировки) */
    /* мебель — по текущей расстановке Планировки; нет её — из последнего сохранения */
    var furn = null, fl = {}; try { fl = JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}') || {}; furn = fl.toSave && fl.toSave.furniture; } catch (x) {}
    /* интерьер не выбран — ни мебели, ни бюджета не показываем (Алина 24.10): только «выбери интерьер».
       Есть квартира — её интерьер или капсула; выбор Планировки (одна копия на все квартиры) — только пока квартиры нет */
    var fa = flats.active(), noInt = !(rp().interior || (fa ? fa.capsuleId : fl.interior));
    if (!furn) furn = bp && bp.furniture;
    /* одна цифра «итого» с карточкой «Бюджет квартиры» (методология, П6): сумма известных слоёв */
    var BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers && window.SOVE_FLOW.budgetLayers();
    /* бюджет посчитан расчётом «из Интерьера», без Планировки — та же цифра, что на экране Бюджета */
    if (!BL && window.SOVE_BUDGET && window.SOVE_BUDGET.current) { var C0 = window.SOVE_BUDGET.current(); if (C0 && C0.full && C0.totals.plan !== null) BL = { total: C0.totals.plan, known: 4 }; }
    /* слои ещё не посчитаны (0 ₽) — показываем известное из Интерьера, а не «≈ 0 ₽ · 0 из 4», как было после «Сохранить в бюджет» */
    if (BL && !BL.total) BL = null;
    /* сохранённый расчёт (Расчёт → «Сохранить в Мой ремонт»): пока полный бюджет не куплен и доски Интерьера со слотами нет, экран Бюджета
       показывает его итог («Плановый бюджет», my-budget.js) — полоса ту же цифру. Сумма известных слоёв его не перекрывает: после захода
       в расстановку было «итого ≈ 1 201 803 ₽ · 1 из 4» (одна мебель) при 5 311 000 ₽ на экране Бюджета (проверка 02.11) */
    var r0 = rp(), it0 = r0.interior, sv = savedTotal(r0), saved = sv && !(bp && bp.full) && !(it0 && it0.slots) ? sv : 0;
    /* Интерьер на часть квартиры: в «итого» по правилу П6 не идёт, но известная сумма есть — как «Известно ≈ …» на экране Бюджета */
    var omP = ownMat(), part = !saved && !BL && omP && !omP.known && omP.part > 0 ? omP.part : 0;
    /* новый план ещё не расставлен — старую сумму не показываем */
    var newPlan = document.body.getAttribute('data-page') === 'plan-demo';
    /* сумм ещё нет (выбрана только капсула — лёгкая запись, мудборд без расчёта, доска без базы материалов на странице): 0 ₽ не пишем —
       '' → «посчитать ›», экран Бюджета с кнопкой «Рассчитать бюджет» */
    var bTotal = newPlan || noInt ? '' : saved ? F.rub(saved) : BL ? '≈ ' + F.rub(BL.total) + ' · ' + BL.known + ' из 4' : bp && bp.full ? '≈ ' + (bp.total === null || bp.total === undefined ? '[сумма] ₽' : F.rub(bp.total))
      : omP && omP.value > 0 ? '≈ ' + F.rub(omP.value) + ' · ' + (omP.known ? 1 : 0) + ' из 4'
      : furn ? null : b && b.total > 0 ? F.rub(b.total) : '';
    /* полоса ведёт на свои экраны (ТЗ 22.10, п. 0.4 и 5): корзина и бюджет квартиры — виды my.html, избранное — общая страница */
    var h = function (sec) { return { cart: 'my.html?v=basket', fav: 'favorites.html', budget: 'my.html?v=budget' }[sec]; };
    el.innerHTML =
      '<a href="' + h('cart') + '" data-strip="cart">' + CART + '<span><b>Корзина</b><small>' + (t.count ? t.qty + ' · ' + F.rub(t.metod) : 'пока пусто') + '</small></span></a>' +
      '<a href="' + h('fav') + '" data-strip="fav">' + HEART + '<span><b>Избранное</b><small>' + (fv ? fv : 'пока пусто') + '</small></span></a>' +
      '<a href="' + h('budget') + '" data-strip="budget"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg><span><b>Бюджет</b><small>' + (newPlan ? 'после расстановки' : noInt ? (sv ? 'итого ' + F.rub(sv) : 'выбери интерьер') : part ? 'известно ≈ ' + F.rub(part) : bTotal === null ? 'мебель ≈ ' + F.rub(furn) + ' · весь — узнать ›' : bTotal ? 'итого ' + bTotal : 'посчитать ›') + '</small></span></a>';
  }

  /* ---------- данные прототипа: 3 состояния экрана из п. 6 ТЗ ---------- */
  function pickProducts(filter, n) { return D.products.filter(function (p) { return p.img && filter(p); }).slice(0, n).map(function (p) { return p.id; }); }
  function seed(kind) {
    st = blank();
    var f = flats.add({ name: 'Моя квартира' });
    if (kind === 'goods') {
      st.fav[f.id] = pickProducts(function (p) { return p.category === 'Мебель' || p.category === 'Освещение'; }, 6);
      st.cart[f.id] = pickProducts(function (p) { return p.category === 'Сантехника' || p.category === 'Текстиль и декор'; }, 3).map(function (id) { return { productId: id, qty: 1, source: 'market', ts: Date.now() }; });
    }
    if (kind === 'full') {
      var sp = D.scout.samplePlan, c = D.capsule('k2'), area = sp.rooms.reduce(function (a, r) { return a + r.area; }, 0);
      flats.update(f.id, { jk: 'PRIDE' });
      write('plan', { level: 'developer_plan', img: 'assets/img/demo/1-domik-vsya-kvartira.jpg', rooms: sp.rooms.map(function (r) { return { name: r.name, m2: r.area }; }), variant: 'Расстановка по анкете', jk: 'PRIDE' }, f.id);
      var mats = capsuleProducts('k2'), KB = window.SOVE_KB, RENDERS = [['Кухня-гостиная', '3-kuhnya-gostinaya'], ['Спальня', '2-spalnya'], ['Спальня', '6-spalnya-pravka-komandoy'], ['Санузел', '4-sanuzel'], ['Прихожая', '5-prihozhaya']];
      var board = { capsuleId: 'k2', name: capName('k2'), img: c.cover, dna: c.dna, productIds: mats.map(function (p) { return p.id; }) };
      /* на экранах с базой материалов (kb/*) — полная доска К2 со слотами и визуализациями, как после экрана «Интерьер»: иначе мудборд без слотов */
      if (KB && KB.fromCapsule && KB.capsule && KB.capsule('k2') && KB.zoneOf) {
        var kc = KB.capsule('k2'), slots = KB.fromCapsule('k2', 'base'), snap = {}, ang = {}; Object.keys(slots).forEach(function (k) { snap[k] = slots[k].sku; });
        Object.assign(board, { type: 'capsule', source: 'capsule', imageUrl: c.cover, style: kc.style, dna: kc.dna, scope: 'flat', zones: [], basis: 'plan', accuracy: 'точно', slots: slots, level: 'base', objects: {}, objectDelta: 0, decor: [], tokensSpent: 0, boardGeneratedAt: Date.now(),
          renders: RENDERS.map(function (x) { var z = KB.zoneOf(x[0]); ang[z] = (ang[z] || 0) + 1; return { zone: z, room: x[0], angle: ang[z] - 1, img: 'assets/img/demo/' + x[1] + '.jpg', skus: snap }; }) });
      }
      write('interior', board, f.id);
      RENDERS.forEach(function (x) { write('render', { room: x[0], src: 'assets/img/demo/' + x[1] + '.jpg', from: 'interior' }, f.id); });
      var state = D.scout.states.filter(function (s) { return s.id === 'concrete'; })[0], kitMetod = c.pricePerM2 * area, works = state.rate * area;
      write('budget', { type: 'base', area: area, works: works, kitMetod: kitMetod, kitRetail: kitMetod * D.scout.retailMarkup, total: works + kitMetod }, f.id);
      st.fav[f.id] = mats.slice(0, 4).map(function (p) { return p.id; });
      st.cart[f.id] = mats.slice(0, 5).map(function (p, i) { return { productId: p.id, qty: 1, source: i < 3 ? 'budget' : 'moodboard', ts: Date.now() }; });
      flats.add({ name: 'Квартира 2' }); st.active = f.id;
    }
    syncFlow();   /* копия интерьера в Планировке — под активную квартиру примера (прежняя к ней не относится) */
    save();
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} load(); renderStrip(); }

  /* «Сбросить данные прототипа» в меню стирает и «Мой ремонт» */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-reset]'); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (confirm('Стереть все данные прототипа в этом браузере?')) { try { localStorage.removeItem('sove.proto.v1'); localStorage.removeItem(KEY); localStorage.removeItem(XKEY); } catch (x) {} location.href = 'index.html'; }
  }, true);

  S.repair = { LINK: LINK, LEVEL: LEVEL, RANK: RANK, SRC: SRC, STATE: STATE, ACCURACY: ACCURACY, flats: flats, flatLine: flatLine, get: rp, level: level, rooms: roomsOf, roomKey: roomKey, rendersCount: rendersCount,
    capsuleProducts: capsuleProducts, roomProducts: roomProducts, progress: progress, budgetStale: budgetStale, interiors: interiors,
    save: saveTo, saveButton: saveButton, setMainRender: setMainRender, removeRender: removeRender, fav: fav, cart: cart, card: card, price: price, btns: btns, sync: syncButtons,
    toast: toast, renderStrip: renderStrip, ownMat: ownMat, favSets: favSets, favPros: favPros, capName: capName, planZones: planZones, materialsSum: materialsSum, registerProduct: registerProduct, seed: seed, reset: reset };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderStrip); else renderStrip();
})();
