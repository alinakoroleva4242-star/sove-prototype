/* Общее для экранов блока «Планировка»: шапка с полосой шагов и состояние сценария (анкета, выбранная капсула), которое
   живёт в localStorage между страницами. Платных вызовов здесь нет. */
(function () {
  var KEY = 'sove.demo.flow.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(patch) {
    var cur = load(); Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    return cur;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* ── шапка блока «Планировка» (ТЗ-planirovka, ред. 24.10 13:30, п. 1): «← Назад», токены, заголовок,
     полоса шагов. Таблеток сценариев нет: сценарий один — План · Чтение · Проверка · Вопросы · Мебель (5),
     с перепланировкой между Вопросами и Мебелью встаёт «Варианты стен» (6). Дизайн-проект — свой вход, 3 шага. */
  var SCN = { project: { href: 'plan-demo.html?scn=project', n: 3 } };
  /* перепланировка включена: пришли с ?replan=1 или включили переключатель (sove.answers[flatId].replan) */
  function replanOn() { return new URLSearchParams(location.search).get('replan') === '1' || !!load().replan; }
  function setReplan(on) { save({ replan: !!on }); }
  /* номер шага по имени: plan · read · check · questions · walls · furniture */
  function stepOf(name) {
    var list = ['plan', 'read', 'check', 'questions'].concat(replanOn() ? ['walls'] : [], ['furniture']);
    return list.indexOf(name) + 1;
  }
  /* дизайн блока утверждён 24.10: вариант А «как в эталоне» (варианты Б и В убраны) */
  var STEP_NAMES = { plan: 'План', read: 'Чтение', check: 'Проверка', questions: 'Вопросы', walls: 'Стены', furniture: 'Мебель' };
  function stepList(kind) { return kind === 'project' ? ['plan', 'read', 'furniture'] : ['plan', 'read', 'check', 'questions'].concat(replanOn() ? ['walls'] : [], ['furniture']); }
  /* done — экран итога: все отрезки полосы зелёные (эталон A6) */
  function blockHead(kind, step, done) {
    var list = stepList(kind), total = list.length, bars = '';
    if (typeof step === 'string') step = stepOf(step);
    for (var i = 1; i <= total; i++) bars += '<span class="pz-bar__i' + (i < step || done ? ' is-done' : i === step ? ' is-now' : '') + '"></span>';
    /* токены: вошёл — баланс; не вошёл — подарок за регистрацию (50), как в эталоне */
    var S = window.SOVE, bal = S && S.tokens ? S.fmt.tokens(S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens) : '';
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var tok = bal ? '<a class="pz-tok" href="tokens.html?returnTo=' + rt + '">' + esc(bal) + ' 🎁</a>' : '';
    return '<header class="pz-head">' +
      '<div class="pz-head__top"><button type="button" class="pz-back" data-pz-back>← Назад</button>' + tok + '</div>' +
      '<h1 class="pz-head__t">Планировка</h1>' +
      '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="' + step + '">' + bars +
        '<small>шаг ' + step + ' из ' + total + '</small></div>' +
      '</header>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pz-back]'); if (!b) return;
    if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = 'sove-ai.html';
  });

  /* ── цена «Вариантов стен» в токенах (открытое решение № 1 ТЗ: Алина 24.10 — «например, 10») ── */
  var REPLAN_PRICE = 10;
  /* подпись цены: «+10 токенов» (Алина 24.10) */
  function priceTxt() { return '+' + REPLAN_PRICE + ' токенов'; }
  /* ключ генерации: тот же план и те же ответы — второй раз не списываем (ТЗ 4.3) */
  function replanKey() { var f = load(); return JSON.stringify([f.flat || '', f.source || '', f.replanAnswers || {}]); }
  /* окно списания (эталон B2c). onGen — после списания (или если уже оплачено), onSkip — «Без перепланировки» */
  function replanSheet(onGen, onSkip) {
    var S = window.SOVE, inn = S.auth.isIn(), bal = inn ? S.tokens.balance() : S.data.gift.tokens;
    var paid = load().replanPaid === replanKey(), enough = !inn || bal >= REPLAN_PRICE;
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-sheet-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-sheet-t">Варианты стен</b><small class="pz-sheet__s">3 варианта под твою жизнь · только то, что разрешено технически</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + (paid ? 'уже оплачено' : priceTxt(true)) + '</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(S.fmt.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough || paid
        ? '<button type="button" class="pz-btn" data-sheet="gen">' + (paid ? 'Показать варианты' : (inn ? 'Сгенерировать · ' : 'Войти и сгенерировать · ') + priceTxt()) + '</button>'
        : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<button type="button" class="pz-link" data-sheet="skip"><u>Без перепланировки — сразу мебель</u></button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-sheet]'); if (!b) return;
      close();
      if (b.dataset.sheet === 'skip') { setReplan(false); return onSkip && onSkip(); }
      if (paid) return onGen();
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      /* списываем один раз: резерв → генерация (в прототипе заглушки, ошибок нет) → списано; при ошибке — refund */
      var op = S.tokens.reserve(REPLAN_PRICE, 'Планировка · варианты стен', 'replan');
      if (!op) { S.ui.toast('Не хватает токенов'); return; }
      S.tokens.commit(op); save({ replanPaid: replanKey() });
      document.querySelectorAll('.pz-tok').forEach(function (el) { el.textContent = S.fmt.tokens(S.tokens.balance()) + ' 🎁'; });
      onGen();
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var f = back.querySelector('[data-sheet="gen"], .pz-btn'); if (f) f.focus();
  }

  /* ── «Какой интерьер?»: плитка «＋ Свой интерьер» + капсулы (прямоугольные, только названия) ──
     общая для вопросов (A4), мебели по размерам (A5а) и «сменить интерьер» (A5б) */
  var CAPS = ['k2', 'k1', 'k3', 'k4', 'k5'];
  /* названия капсул в выборе интерьера — открытый вопрос ТЗ (№ 3): кроме «Изумрудной неоклассики» стоит заглушка */
  function capName(id) { return id === 'k2' ? 'Изумрудная неоклассика' : '[название]'; }
  function interiorTiles(it, dark) {
    var D = window.SOVE.data;
    return '<div class="pz-caps' + (dark ? ' is-dark' : '') + '">' +
      '<button type="button" class="pz-cap pz-cap--own' + (it && it.type === 'own' ? ' is-on' : '') + '" data-own-open><span class="pz-cap__img">＋<small>фото или рендер</small></span><b>' + (it && it.type === 'own' ? esc(it.name) : 'Свой интерьер') + '</b></button>' +
      CAPS.map(function (id) {
        var c = D.capsule(id); if (!c) return '';
        return '<button type="button" class="pz-cap' + (it && it.id === id ? ' is-on' : '') + '" data-cap="' + id + '"><span class="pz-cap__img" style="background-image:url(' + esc(c.cover) + ')"></span><b>' + esc(capName(id)) + '</b></button>';
      }).join('') + '</div>';
  }
  function capsuleInterior(id) { var c = window.SOVE.data.capsule(id); return c ? { type: 'capsule', id: c.id, name: capName(c.id) } : null; }
  /* «＋ Свой интерьер»: три способа (п. A4) — фото или рендер, ведомость / спецификация, ссылка */
  function ownSheet(done) {
    var m = window.SOVE.ui.modal({ eyebrow: 'Свой интерьер', title: 'Как покажешь интерьер?',
      html: '<div class="pz-own">' +
        '<label class="pz-own__i"><input type="file" accept="image/*" hidden data-own="photo"><b>📷 Фото или рендер</b><small>найдём похожую мебель и материалы</small></label>' +
        '<label class="pz-own__i"><input type="file" accept="application/pdf,image/*,.xlsx,.xls" hidden data-own="spec"><b>📄 Ведомость или спецификация</b><small>из дизайн-проекта — берём ровно то, что в проекте</small></label>' +
        '<div class="pz-own__i"><b>🔗 Ссылка</b><small>Pinterest, сайт — как фото</small><div class="pz-own__url"><input class="input" type="url" placeholder="https://" data-own-url><button type="button" class="pz-chip is-on" data-own="link">Готово</button></div></div>' +
      '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    var NAMES = { photo: 'Свой интерьер · по фото', spec: 'Свой интерьер · по ведомости', link: 'Свой интерьер · по ссылке' };
    function pick(how) { m.close(); done({ type: 'own', how: how, name: NAMES[how] }); }
    m.el.querySelectorAll('input[type=file][data-own]').forEach(function (inp) {
      inp.addEventListener('change', function () { if (inp.files && inp.files[0]) pick(inp.getAttribute('data-own')); });
    });
    m.el.querySelector('button[data-own="link"]').addEventListener('click', function () {
      var u = m.el.querySelector('[data-own-url]'); if (!u.value.trim()) { u.focus(); return; } pick('link');
    });
  }

  /* ── лента «Выбери интерьер» (ТЗ-planirovka, раздел 14): одна на все экраны, пока интерьер не выбран.
     Прилипает снизу над полосой «Корзина · Избранное · Бюджет». Показываем на A3, вариантах стен, A5а, A6
     и дашборде Моего ремонта; на A2 и A4 — нет. «×» сворачивает в «✦ Интерьер» до следующего экрана.
     opts: { show, onPick(interior) } — onPick: экран перестраивает мебель и бюджет */
  var stripOpts = null, stripFolded = false;
  function interiorChosen() { var R = window.SOVE && window.SOVE.repair; return !!(load().interior || (R && R.get().interior)); }
  function interiorStrip(opts) {
    stripOpts = opts || {}; stripFolded = false; drawStrip(); setTimeout(drawStrip, 0);
  }
  function drawStrip() {
    var el = document.getElementById('pz-istrip');
    /* на экране уже есть выбор интерьера на месте бюджета — липкую ленту не показываем, чтобы не закрывала визуализации */
    var on = stripOpts && stripOpts.show !== false && !('chosen' in stripOpts ? stripOpts.chosen : interiorChosen()) && !document.querySelector('.pz-ipick');
    document.body.classList.toggle('has-istrip', !!on);
    if (!on) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'pz-istrip'; el.setAttribute('aria-label', 'Выбери интерьер'); document.body.appendChild(el); }
    el.className = 'pz-istrip' + (stripFolded ? ' is-folded' : '');
    if (stripFolded) { el.innerHTML = '<button type="button" class="pz-istrip__fab" data-is="open">✦ Интерьер</button>'; return; }
    el.innerHTML = '<div class="pz-istrip__h"><b>Выбери интерьер — покажем бюджет</b>' +
        '<button type="button" data-is="all" aria-label="Все интерьеры">›</button><button type="button" data-is="fold" aria-label="Скрыть">×</button></div>' + stripList();
  }
  function stripList() {
    return '<div class="pz-istrip__l"><button type="button" class="pz-istrip__t pz-istrip__t--own" data-is="own"><span>＋</span><b>Свой</b></button>' +
      CAPS.map(function (id) {
        var c = window.SOVE.data.capsule(id); if (!c) return '';
        return '<button type="button" class="pz-istrip__t" data-is-cap="' + id + '"><span style="background-image:url(' + esc(c.cover) + ')"></span><b>' + esc(capName(id)) + '</b></button>';
      }).join('') + '</div>';
  }
  /* выбор интерьера: записываем в сценарий и в Мой ремонт → Интерьер (+25% готовности), тост, экран перестраивается */
  function pickInterior(it) {
    var S = window.SOVE, R = S.repair;
    save({ interior: it });
    if (R) {
      var c = it.type === 'capsule' ? S.data.capsule(it.id) : null;
      R.save('interior', { capsuleId: c ? c.id : null, name: it.name, img: c ? c.cover : null, dna: c ? c.dna : [],
        productIds: c ? R.capsuleProducts(c.id).map(function (p) { return p.id; }) : [] }, { force: true, silent: true });
    }
    if (stripOpts) stripOpts.chosen = true; drawStrip();
    S.ui.toast('Мебель подобрана под ' + (it.type === 'capsule' ? '«' + it.name + '»' : 'свой интерьер') + ' · бюджет точнее', 'ok');
    if (stripOpts && stripOpts.onPick) stripOpts.onPick(it);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pz-istrip [data-is], #pz-istrip [data-is-cap], .pz-ipick [data-is], .pz-ipick [data-is-cap]'); if (!b) return;
    var a = b.getAttribute('data-is'), cap = b.getAttribute('data-is-cap');
    if (cap) return pickInterior(capsuleInterior(cap));
    if (a === 'fold') { stripFolded = true; drawStrip(); }
    if (a === 'open') { stripFolded = false; drawStrip(); }
    if (a === 'own') ownSheet(pickInterior);
    if (a === 'all') {
      var m = window.SOVE.ui.modal({ eyebrow: 'Интерьер', title: 'Все интерьеры', html: interiorTiles(null), actions: [{ label: 'Закрыть', kind: 'link' }] });
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); pickInterior(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(pickInterior); });
    }
  });

  /* мебель под интерьер вне экрана расстановки (A6): у предмета — товар капсулы той же подкатегории, иначе прежняя цена */
  var SUBCAT_BY = [[/прикроватная тумба/, 'Тумбы'], [/тумба под раковину/, 'Мебель для ванной'], [/кроват/, 'Кровати'], [/диван/, 'Диваны'],
    [/кресл/, 'Кресла'], [/комод/, 'Комоды'], [/обеденный стол/, 'Столы обеденные'], [/журнальн/, 'Столы журнальные'], [/стул/, 'Стулья'],
    [/ванна/, 'Ванны'], [/унитаз/, 'Унитазы'], [/раковин/, 'Раковины'], [/холодильник/, 'Холодильники'], [/вытяжк/, 'Вытяжки']];
  function furnitureSum(goods, interior) {
    var R = window.SOVE.repair, caps = interior && interior.type === 'capsule' && R ? R.capsuleProducts(interior.id) : [];
    return (goods || []).reduce(function (a, g) {
      var l = String(g.label || '').toLowerCase(), sub = (SUBCAT_BY.filter(function (x) { return x[0].test(l); })[0] || [])[1];
      var p = sub ? caps.filter(function (x) { return x.subcat === sub; })[0] : null;
      return a + (p ? p.metod : g.metod || 0);
    }, 0);
  }

  /* ── финал блока (ТЗ-planirovka, раздел 15): «Сохранить в Мой ремонт» · «↓ Скачать планировку» · «↗ Поделиться» ·
     «✦ Дальше: визуализации». Один компонент planFinish() на A5а, A5б, A6 и в плитке Моего ремонта.
     Данные берём из состояния сценария (toSave пишет экран мебели), бюджет — budget.js. ── */
  var SOURCE_LEVEL = { developer: 'developer_plan', measure: 'measured_plan', none: 'none', project: 'design_project' };
  var HKEY = 'sove.plan.history';
  function planDoc() {
    var f = load(), T = f.toSave; if (!T) return null;
    var S = window.SOVE, A = window.SOVE_ARRANGE || { rooms: [] }, INT = f.interior || null, V = T.variant;
    var rooms = f.rooms && f.rooms.length ? f.rooms : A.rooms.filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
    var geo = T.geo || A, furniture = INT ? furnitureSum(T.goods, INT) : T.furniture;
    var R0 = window.SOVE.repair, fl0 = R0 && R0.flats.active(), bp0 = fl0 ? R0.get().budgetPlan : null;
    /* параметры Скаута: из квартиры (правки в Скауте) или из Планировки — план, состояние, интерьер, тип */
    var STATE = { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'secondary' };
    var sp = fl0 && R0.get().scoutParams ? Object.assign({}, R0.get().scoutParams) : { stateId: STATE[f.state] || 'concrete',
      area: Math.round(rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0) * 10) / 10, capsuleId: INT && INT.type === 'capsule' ? INT.id : null, level: bp0 && bp0.type || 'base' };
    if (bp0 && bp0.type) sp.level = bp0.type;
    var budget = window.SOVE_BUDGET ? window.SOVE_BUDGET.compute({ scout: sp, geo: geo, rooms: rooms, state: f.state || 'concrete_walls', type: bp0 && bp0.type || 'base', interior: INT,
      kitchenLen: T.kitchenLen, furniture: furniture, partitions: V ? V.partitions : null, accuracy: f.accuracy || 'примерно' }) : { lines: [], total: null, type: 'base' };
    return { T: T, INT: INT, V: V, rooms: rooms, geo: geo, furniture: furniture, budget: budget, flatName: f.flat || 'ЖК PRIDE · 47,3 м²',
      source: f.source || 'developer', state: f.state || 'concrete_walls', accuracy: f.accuracy || 'примерно', answers: f.answers || null };
  }
  /* сохранение: план, расстановка, интерьер, ответы, бюджет (11 строк), запись в «Мои планировки»; то же второй раз — без дубля */
  function savePlan() {
    var S = window.SOVE, R = S.repair, P = planDoc(); if (!P || !R) return null;
    var T = P.T, INT = P.INT, V = P.V, flat = R.flats.ensure(), r = R.get(flat.id), all = {};
    try { all = JSON.parse(localStorage.getItem(HKEY) || '{}') || {}; } catch (e) {}
    var list = all[flat.id] || (all[flat.id] = []);
    var key = JSON.stringify([P.flatName, T.arrangement, V && V.id, INT && (INT.id || INT.name), T.items.map(function (i) { return i.box.map(Math.round).join(','); })]);
    var rec = list.filter(function (x) { return x.key === key; })[0], dup = !!rec;
    if (!rec) { rec = { id: 'pl-' + Date.now().toString(36), key: key, flatId: flat.id, type: V ? 'replan' : '3d', variant: V ? V.letter : null, createdAt: Date.now() }; list.unshift(rec); }
    Object.assign(rec, { planImg: T.img, layout: T.items, arrangement: T.arrangement, interiorId: INT ? (INT.id || INT.type) : null, interiorName: INT ? INT.name : null,
      items: INT ? T.goods : null, count: T.count, budget: INT ? { lines: P.budget.lines, total: P.budget.total, type: P.budget.type } : null, flat: P.flatName, answers: P.answers });
    list.forEach(function (x) { x.isMain = x === rec; });
    try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch (e) { list.forEach(function (x) { if (x !== rec) x.planImg = null; }); try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch (e2) {} }
    r.base = { historyId: rec.id, source: P.source, accuracy: P.accuracy, state: P.state };
    r.replan = V ? { historyId: rec.id, variant: V.letter, approval: V.approval } : null;
    /* мебель и бюджет сохраняем только с интерьером: без него цены мебели и бюджета нет (Алина 24.10) */
    if (INT) r.budgetPlan = { lines: P.budget.lines, type: P.budget.type, total: P.budget.total, ts: Date.now(), full: !!(r.budgetPlan && r.budgetPlan.full), furniture: P.furniture };
    r.progress = INT ? 50 : 25;
    if (INT) {
      var c = INT.type === 'capsule' ? S.data.capsule(INT.id) : null;
      R.save('interior', { capsuleId: c ? c.id : null, name: INT.name, img: c ? c.cover : null, dna: c ? c.dna : [], productIds: c ? R.capsuleProducts(c.id).map(function (p) { return p.id; }) : [] }, { force: true, silent: true });
    }
    R.save('plan', { level: SOURCE_LEVEL[P.source] || 'developer_plan', img: T.img, rooms: P.rooms, variant: T.arrangement, jk: T.live ? '' : 'PRIDE', historyId: rec.id }, { force: true, silent: true });
    save({ savedKey: key });
    return { flatId: flat.id, dup: dup, rec: rec };
  }
  /* тост с двумя действиями: «Открыть» и сразу «Дальше: визуализации ›» (15.1) */
  function savedToast(text) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast toast--ok rp-toast pz-toast2';
    t.innerHTML = '<span>' + esc(text) + '</span><a href="my.html">Открыть</a><button type="button" data-pf="visual">Дальше: визуализации ›</button>';
    box.appendChild(t); setTimeout(function () { t.remove(); }, 6500);
  }

  /* ── скачать: PDF (эталон D1), PNG, план с размерами для бригады ── */
  function fileBase(P) {
    var d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var m = String(P.flatName).match(/([\d,]+)\s*м²/), jk = P.T.live ? 'мой-план' : 'PRIDE';
    return 'SOVE_' + jk + '_' + (m ? m[1] : '') + 'м2_планировка_' + date;
  }
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function rub(v) { return v === null || v === undefined ? '[сумма] ₽' : window.SOVE.fmt.rub(v); }
  function printDoc(title, body) {
    var w = window.open('', '_blank'); if (!w) { window.SOVE.ui.toast('Разреши всплывающие окна, чтобы сохранить PDF'); return; }
    w.document.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;600;800&display=swap">' +
      '<style>@page{size:A4;margin:14mm}body{margin:0;font-family:Montserrat,Arial,sans-serif;color:#1E1C1A}.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #E6E1DA;padding-bottom:8px}' +
      '.logo{font:600 26px "Cormorant Garamond",Georgia,serif;letter-spacing:.35em}.h small{color:#6B655F;font-size:11px}h1{font:600 20px Montserrat;margin:14px 0 2px}.sub{color:#6B655F;font-size:12px;margin:0 0 10px}' +
      'img.plan{width:100%;border-radius:8px;display:block}.rooms{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.rooms div{background:#F4F2EE;border-radius:6px;padding:6px 8px;font-size:10px;color:#6B655F}.rooms b{display:block;font-size:14px;color:#1E1C1A}' +
      '.list{font-size:11px}.list div{display:flex;justify-content:space-between;border-bottom:1px solid #EEE9E3;padding:4px 0}.tot{display:flex;justify-content:space-between;font-weight:800;font-size:13px;margin:8px 0}' +
      '.foot{margin-top:14px;font-size:9px;color:#8E867E}svg{width:100%;height:auto}</style></head><body>' + body +
      '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>');
    w.document.close();
  }
  function headHtml(sub) {
    var d = new Date().toLocaleDateString('ru-RU');
    return '<div class="h"><span><span class="logo">SOVE</span> <small>' + esc(sub) + '</small></span><small>' + d + '</small></div>';
  }
  function pdfPlan(getImg) {
    var P = planDoc(); if (!P) return;
    var T = P.T, img = getImg && getImg() || T.img, rest = Math.max(0, (T.goods || []).length - 4), d = new Date().toLocaleDateString('ru-RU');
    printDoc(fileBase(P), headHtml('планировка и мебель') +
      '<h1>' + esc(P.flatName) + '</h1><p class="sub">' + esc((P.INT ? P.INT.name + ' · ' : '') + '«' + T.arrangement + '» · ' + T.count + ' предметов') + '</p>' +
      (img ? '<img class="plan" src="' + esc(absUrl(img)) + '" alt="">' : '') +
      '<div class="rooms">' + P.rooms.slice(0, 4).map(function (r) { return '<div><b>' + String(r.m2 || '').replace('.', ',') + '</b>' + esc(r.name.toLowerCase()) + '</div>'; }).join('') + '</div>' +
      /* без интерьера — только план и расстановка, без цен мебели и бюджета */
      (P.INT ? '<div class="tot"><span>Мебель</span><span>≈ ' + rub(P.furniture) + '</span></div><div class="list">' +
      (T.goods || []).slice(0, 4).map(function (g) { return '<div><span>' + esc(g.label + ' · ' + String(g.room || '').toLowerCase()) + '</span><span>' + rub(g.metod) + '</span></div>'; }).join('') +
      (rest ? '<div><span>ещё ' + rest + ' предметов …</span><span></span></div>' : '') + '</div>' : '') +
      (P.INT && budgetFull() ? '<div class="tot"><span>Ремонт под ключ</span><span>≈ ' + rub(P.budget.total) + '</span></div>' : '') +
      '<div class="foot">Сделано в SOVE · sove.app<br>Расстановка по нормам проходов. Перед стройкой проверьте размеры по обмеру. Цены METOD на ' + d + '.</div>');
  }
  /* план с размерами: вид сверху, комнаты с размерами, мебель с габаритами в мм — для бригады */
  function pdfDims() {
    var P = planDoc(); if (!P) return;
    var g = P.geo, ppm = g.px_per_m, rooms = g.rooms || [], items = P.T.items || [], all = rooms.map(function (r) { return r.box; });
    var x1 = Math.min.apply(null, all.map(function (b) { return b[0]; })) - 30, y1 = Math.min.apply(null, all.map(function (b) { return b[1]; })) - 30;
    var x2 = Math.max.apply(null, all.map(function (b) { return b[2]; })) + 30, y2 = Math.max.apply(null, all.map(function (b) { return b[3]; })) + 30;
    var mm = function (px) { return Math.round(px / ppm * 1000); };
    var svg = '<svg viewBox="' + [x1, y1, x2 - x1, y2 - y1].join(' ') + '" xmlns="http://www.w3.org/2000/svg" font-family="Montserrat,Arial">' +
      rooms.map(function (r) { var b = r.box; return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '" fill="#fff" stroke="#1E1C1A" stroke-width="3"/>' +
        (r.part_of ? '' : '<text x="' + (b[0] + 6) + '" y="' + (b[1] + 16) + '" font-size="12" font-weight="700">' + esc(r.type === 'гостиная' ? 'Кухня-гостиная' : r.name) + ' · ' + mm(b[2] - b[0]) + '×' + mm(b[3] - b[1]) + '</text>'); }).join('') +
      items.map(function (it) { var b = it.box, w = b[2] - b[0], h = b[3] - b[1]; return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + w + '" height="' + h + '" fill="#EEEAE3" stroke="#6B655F"/>' +
        '<text x="' + ((b[0] + b[2]) / 2) + '" y="' + ((b[1] + b[3]) / 2 + 3) + '" font-size="7" text-anchor="middle" fill="#1E1C1A">' + esc(it.label) + ' ' + mm(w) + '×' + mm(h) + '</text>'; }).join('') + '</svg>';
    printDoc(fileBase(P) + '_размеры', headHtml('план с размерами · для бригады') + '<h1>' + esc(P.flatName) + '</h1><p class="sub">размеры в мм · «' + esc(P.T.arrangement) + '»</p>' + svg +
      '<div class="foot">Сделано в SOVE · sove.app<br>Перед стройкой проверьте размеры по обмеру.</div>');
  }
  /* PNG: чистая картинка плана, «sove.app» мелко в поле под картинкой — не на плане */
  function pngPlan(getImg) {
    var P = planDoc(); if (!P) return;
    var src = getImg && getImg() || P.T.img; if (!src) return;
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      var pad = 40, foot = 56, c = document.createElement('canvas'); c.width = im.naturalWidth + pad * 2; c.height = im.naturalHeight + pad + foot;
      var x = c.getContext('2d'); x.fillStyle = '#F4F2EE'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, pad, pad);
      x.fillStyle = '#8E867E'; x.font = '500 18px Montserrat, Arial, sans-serif'; x.textAlign = 'right'; x.fillText('sove.app', c.width - pad, c.height - 20);
      var a = document.createElement('a'); a.download = fileBase(P) + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    };
    im.src = src;
  }
  function downloadSheet(getImg) {
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-dl-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-dl-t">Скачать планировку</b><small class="pz-sheet__s">файл в оформлении SOVE · на самом плане никаких знаков</small>' +
      '<button type="button" class="pz-dl" data-dl="pdf"><b>PDF · 1 страница</b><small>3D-план с мебелью, площади, мебель с ценами, итог ремонта</small></button>' +
      '<button type="button" class="pz-dl" data-dl="png"><b>PNG · картинка</b><small>для мессенджеров — чистый 3D-план</small></button>' +
      '<button type="button" class="pz-dl" data-dl="dims"><b>План с размерами · PDF</b><small>вид сверху, размеры мебели в мм — для бригады</small></button>' +
      '<button type="button" class="pz-link" data-dl="close">Отмена</button></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-dl]'); if (!b) return; close();
      var k = b.dataset.dl; if (k === 'pdf') pdfPlan(getImg); if (k === 'png') pngPlan(getImg); if (k === 'dims') pdfDims();
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
  }
  /* «↗ Поделиться»: картинка плана + ссылка (заглушка sove.app/p/<id>) системным меню; нет меню — скачиваем PNG */
  function sharePlan(getImg) {
    var P = planDoc(); if (!P) return;
    var src = getImg && getImg() || P.T.img, url = 'https://sove.app/p/demo';
    if (!navigator.share) { pngPlan(getImg); return; }
    fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      var file = new File([b], fileBase(P) + '.png', { type: b.type || 'image/png' });
      var data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title: 'Моя планировка · SOVE', url: url } : { title: 'Моя планировка · SOVE', url: url };
      return navigator.share(data);
    }).catch(function () {});
  }
  /* «Дальше: визуализации»: без интерьера — сначала выбор интерьера; перед переходом — автосохранение (15.3) */
  function goVisual() {
    var f = load();
    if (!f.interior) {
      var m = window.SOVE.ui.modal({ eyebrow: 'Сначала интерьер', title: 'В каком интерьере показать комнаты?', html: interiorTiles(null), actions: [{ label: 'Отмена', kind: 'link' }] });
      function go(it) { save({ interior: it }); goVisual(); }
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); go(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(go); });
      return;
    }
    if (finishOpts && finishOpts.before) finishOpts.before();
    var r = savePlan();
    window.SOVE.ui.toast('Сохранено в Мой ремонт', 'ok');
    setTimeout(function () { location.href = 'result.html?from=plan&flat=' + encodeURIComponent(r ? r.flatId : ''); }, 600);
  }
  var finishOpts = null;
  /* opts: { getImg() — картинка 3D-плана сейчас; before() — экран дописывает расстановку; after(res) — после сохранения } */
  function planFinish(opts) {
    finishOpts = opts || {};
    var thumbs = ['2-spalnya', '3-kuhnya-gostinaya', '4-sanuzel', '5-prihozhaya'];
    return '<section class="pz-finish">' +
      (finishOpts.noSave ? '' : '<button type="button" class="pz-btn" data-pf="save">Сохранить в Мой ремонт</button>') +

      '<button type="button" class="pz-visual" data-pf="visual"><span class="pz-visual__t"><b>✦ Дальше: визуализации</b><small>Покажем каждую комнату в интерьере · ' + priceTxt() + ' за комнату</small>' +
        '<span class="pz-visual__th">' + thumbs.map(function (t) { return '<i style="background-image:url(assets/img/demo/' + t + '.jpg)"></i>'; }).join('') + '</span></span><em>›</em></button>' +
      /* одно «Дальше» на экране (методология, П2): скачать, поделиться и перепланировка — в «Ещё» */
      '<button type="button" class="pz-link" data-pf="more">Ещё ⋯ скачать, поделиться' + (finishOpts.more && finishOpts.more.length ? ', стены' : '') + '</button>' +
      '</section>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pf]'); if (!b) return;
    var a = b.getAttribute('data-pf'), o = finishOpts || {};
    if (a === 'visual') { if (b.closest('.toast')) b.closest('.toast').remove(); return goVisual(); }
    if (a === 'more') return moreSheet(o);
    if (o.before) o.before();
    if (a === 'save') {
      var r = savePlan(); if (!r) return;
      savedToast(r.dup ? '✓ Уже сохранено в Мой ремонт' : '✓ Сохранено в Мой ремонт');
      if (o.after) o.after(r);
    }
    if (a === 'download') downloadSheet(o.getImg);
    if (a === 'share') sharePlan(o.getImg);
  });

  /* «Ещё ⋯»: скачать, поделиться и то, что добавил экран (opts.more: [{ label, onClick }]) */
  function moreSheet(o) {
    var items = [{ label: '↓ Скачать планировку', onClick: function () { if (o.before) o.before(); downloadSheet(o.getImg); } },
      { label: '↗ Поделиться', onClick: function () { if (o.before) o.before(); sharePlan(o.getImg); } }].concat(o.more || []);
    var m = window.SOVE.ui.modal({ eyebrow: 'Планировка', title: 'Ещё', html: '<div class="pz-more">' + items.map(function (x, i) {
      return '<button type="button" class="pz-btn2" data-more="' + i + '">' + x.label + '</button>'; }).join('') + '</div>', actions: [{ label: 'Закрыть', kind: 'link' }] });
    m.el.querySelectorAll('[data-more]').forEach(function (b) { b.addEventListener('click', function () { m.close(); items[+b.dataset.more].onClick(); }); });
  }

  /* ── список товаров с выбором галочками (ТЗ-planirovka, раздел 16): один компонент на все списки блока,
     дальше — SOVE AI и Мой ремонт. rows: [{ p: товар, label, room, pick? }]; opts: { key, title, rerender, limit }.
     Обычный режим — ♡ / 🛒 у каждого товара и «Выбрать»; режим выбора — галочки, «Выбрать все», панель снизу. ── */
  var PL = {};
  function plState(key) { return PL[key] || (PL[key] = { on: false, sel: {}, all: false, rows: [], opts: {} }); }
  function productList(rows, opts) {
    var R = window.SOVE.repair, F = window.SOVE.fmt, st = plState(opts.key || 'list'); st.rows = rows; st.opts = opts;
    var withP = rows.filter(function (r) { return r.p; }), sum = withP.reduce(function (a, r) { return a + (r.p.metod || 0); }, 0);
    var shown = st.on || st.all || !opts.limit ? rows : rows.slice(0, opts.limit), nSel = Object.keys(st.sel).length, key = esc(opts.key || 'list');
    var html = '<section class="pz-card pz-goods pz-pl' + (st.on ? ' is-sel' : '') + '" data-pl="' + key + '">' +
      '<div class="pz-goods__h"><b>' + esc(opts.title) + ' · ' + rows.length + '</b>' +
        (st.on ? '<span class="pz-pl__ctl"><button type="button" data-pl-act="all">' + (nSel === withP.length ? 'Снять все' : 'Выбрать все · ' + withP.length) + '</button><button type="button" data-pl-act="done">Готово</button></span>'
               : '<span class="pz-pl__ctl"><b>≈ ' + F.rub(sum) + '</b><button type="button" data-pl-act="select">Выбрать</button></span>') + '</div>' +
      shown.map(function (r, i) {
        var on = !!st.sel[i], inCart = r.p && R.cart.has(r.p.id);
        return '<div class="pz-good' + (st.on ? ' is-sel' : '') + (on ? ' is-on' : '') + '"' + (st.on && r.p ? ' data-pl-row="' + i + '" role="checkbox" aria-checked="' + on + '" tabindex="0"' : '') + '>' +
          (st.on ? '<i class="pz-check" aria-hidden="true">' + (on ? '✓' : '') + '</i>' : '') +
          (r.p ? '<img src="' + esc(r.p.img) + '" alt="" loading="lazy">' : '<i class="pz-good__ph"></i>') +
          '<span class="pz-good__t"' + (!st.on && r.pick !== undefined ? ' data-pick="' + r.pick + '" role="button" tabindex="0"' : '') + '><b>' + esc(r.label) + '</b><small>' + esc(String(r.room || '').toLowerCase()) + (inCart ? ' · <em>в корзине</em>' : '') + '</small></span>' +
          (r.p ? R.price(r.p) + (st.on ? '' : '<span class="pz-good__act">' + R.btns(r.p, 'market') + '</span>') : '<small class="pz-note">нет в Маркете</small>') +
          '</div>';
      }).join('') +
      (!st.on && opts.limit && rows.length > opts.limit ? '<button type="button" class="pz-link" data-pl-act="more">' + (st.all ? 'Свернуть' : 'Все ' + rows.length + ' предметов ›') + '</button>' : '') +
      '</section>' +
      '<div class="pz-pl__quick"><button type="button" class="pz-btn2" data-pl-act="cart-all" data-pl="' + key + '">Всё в корзину · ' + withP.length + '</button>' +
        '<button type="button" class="pz-link" data-pl-act="fav-all" data-pl="' + key + '">♡ Всё в избранное</button></div>';
    setTimeout(function () { plPanel(opts.key || 'list'); }, 0);
    return html;
  }
  /* выбранные строки → id товаров; одинаковые предметы на плане (две тумбы) — две штуки */
  function selIds(st, all) {
    var ids = []; st.rows.forEach(function (r, i) { if (r.p && (all || st.sel[i])) ids.push(r.p.id); }); return ids;
  }
  /* панель действий снизу (над полосой) — только в режиме выбора */
  function plPanel(key) {
    var st = plState(key), el = document.getElementById('pz-plbar'), F = window.SOVE.fmt;
    document.body.classList.toggle('has-plbar', st.on);
    if (!st.on) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'pz-plbar'; el.className = 'pz-plbar'; document.body.appendChild(el); }
    var n = Object.keys(st.sel).length, sum = Object.keys(st.sel).reduce(function (a, i) { var r = st.rows[i]; return a + (r && r.p ? r.p.metod : 0); }, 0);
    el.setAttribute('data-pl', key);
    el.innerHTML = '<b>' + (n ? 'Выбрано ' + n + ' · ≈ ' + F.rub(sum) : 'Выбери товары') + '</b>' +
      '<div><button type="button" class="pz-btn" data-pl-act="to-cart"' + (n ? '' : ' disabled') + '>🛒 В корзину · ' + n + '</button>' +
      '<button type="button" class="pz-btn2" data-pl-act="to-fav"' + (n ? '' : ' disabled') + '>♡ В избранное · ' + n + '</button></div>';
  }
  function plural3(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }
  /* в корзину: уже лежащие не добавляем второй раз; в избранное — избранное активной квартиры */
  function plToCart(ids) {
    var R = window.SOVE.repair; R.flats.ensure();
    /* уже лежащие в корзине не добавляем и количество не меняем (16.4); новые — по числу предметов на плане */
    var had = {}; ids.forEach(function (id) { had[id] = R.cart.has(id); });
    ids.forEach(function (id) { if (!had[id]) R.cart.add(id, 'market', true); });
    R.flats.update(R.flats.active().id, {});                    /* сохраняет корзину и сразу обновляет полосу */
    R.toast(ids.length + ' ' + plural3(ids.length, 'товар', 'товара', 'товаров') + ' в корзине', { label: 'Оформить', href: 'my.html?v=basket' });
  }
  function plToFav(ids) {
    var R = window.SOVE.repair; R.flats.ensure();
    ids.filter(function (id, i) { return ids.indexOf(id) === i; }).forEach(function (id) { if (!R.fav.has(id)) R.fav.toggle(id, true); });
    R.toast(ids.length + ' ' + plural3(ids.length, 'товар', 'товара', 'товаров') + ' в избранном', { label: 'Открыть', href: 'favorites.html' });
  }
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('[data-pl-row]');
    var b = e.target.closest && e.target.closest('[data-pl-act]');
    if (!row && !b) return;
    var host = (row || b).closest('[data-pl]') || b, key = host.getAttribute('data-pl') || 'list', st = plState(key), re = st.opts.rerender || function () {};
    if (row) { var i = row.getAttribute('data-pl-row'); if (st.sel[i]) delete st.sel[i]; else st.sel[i] = 1; return re(); }
    var a = b.getAttribute('data-pl-act'); e.preventDefault();
    if (a === 'select') { st.on = true; st.sel = {}; }
    if (a === 'done') { st.on = false; st.sel = {}; }
    if (a === 'more') st.all = !st.all;
    if (a === 'all') { var withP = st.rows.map(function (r, i) { return r.p ? i : -1; }).filter(function (i) { return i >= 0; }); if (Object.keys(st.sel).length === withP.length) st.sel = {}; else withP.forEach(function (i) { st.sel[i] = 1; }); }
    if (a === 'to-cart' || a === 'to-fav') { var ids = selIds(st, false); if (!ids.length) return; (a === 'to-cart' ? plToCart : plToFav)(ids); st.on = false; st.sel = {}; }
    if (a === 'cart-all') plToCart(selIds(st, true));
    if (a === 'fav-all') plToFav(selIds(st, true));
    re();
  });
  document.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && e.target.matches && e.target.matches('[data-pl-row]')) { e.preventDefault(); e.target.click(); } });

  /* ── бюджет за токены (раздел 17): бесплатно — только «Мебель на всю квартиру»; полный бюджет из 11 строк —
     «✦ Узнать весь бюджет · +10 токенов» → подтверждение → списание → генерация со стадиями → в Мой ремонт
     (budgetPlan.full). Дальше пересчёт бесплатный. Цена — та же константа, что у вариантов стен (Алина 24.10: «+10 токенов»). ── */
  function budgetFull() { var R = window.SOVE.repair; return !!(R && R.flats.active() && R.get().budgetPlan && R.get().budgetPlan.full); }
  /* полный бюджет куплен — держим строки актуальными при любых изменениях (бесплатно) */
  function refreshBudget() {
    var R = window.SOVE.repair, P = planDoc(); if (!budgetFull() || !P || !P.INT || !window.SOVE_BUDGET) return;   /* без расчёта и без интерьера не затираем итог */
    var bp = R.get().budgetPlan; Object.assign(bp, { lines: P.budget.lines, total: P.budget.total, type: P.budget.type, furniture: P.furniture, ts: Date.now() });
    R.flats.update(R.flats.active().id, {});
  }
  function setBudgetType(type) {
    var R = window.SOVE.repair; if (!budgetFull()) return;
    R.get().budgetPlan.type = type === 'premium' ? 'premium' : 'base'; refreshBudget();
  }
  /* бюджет по методологии (П6): сумма известных слоёв — Мебель · Материалы · Декор и текстиль · Работы, «известно N из 4».
     Мебель — из расстановки, материалы — по выбранному интерьеру (бесплатно), декор — после визуализаций,
     работы — за токены через Скаут (П5). Одна цифра «итого» — и здесь, и в полосе «Бюджет» над меню. */
  function budgetLayers() {
    if (!interiorChosen()) return null;                /* без интерьера бюджета нет */
    var P = window.SOVE_BUDGET && planDoc(); if (!P) return null;
    var R = window.SOVE.repair, r = R && R.flats.active() ? R.get() : {}, L = {};
    P.budget.lines.forEach(function (l) { L[l.key] = l.value || 0; });
    var INT = P.INT || (r.interior ? { name: r.interior.name } : null), renders = R && R.flats.active() ? R.rendersCount() : 0;
    var parts = [
      { key: 'furniture', t: 'Мебель', sub: P.T.count + ' ' + plural3(P.T.count, 'предмет', 'предмета', 'предметов') + ' по расстановке', known: true, value: P.furniture },
      { key: 'materials', t: 'Материалы', sub: INT ? 'по интерьеру «' + INT.name + '»' : 'пол, стены, плитка, свет', known: !!INT, value: L.finish_mat + L.plumbing + L.electric + L.kitchen },
      { key: 'decor', t: 'Декор и текстиль', sub: renders ? 'по визуализациям' : 'после визуализаций', known: renders > 0, value: L.decor },
      { key: 'works', t: 'Работы', sub: 'черновые и чистовые · Скаут', known: budgetFull(), value: (L.demolition || 0) + L.rough_works + (L.partitions || 0) + L.rough_mat + L.finish_works }
    ];
    var known = parts.filter(function (x) { return x.known; });
    return { P: P, parts: parts, known: known.length, total: known.reduce(function (a, x) { return a + (x.value || 0); }, 0), type: P.budget.type };
  }
  /* карточка бюджета: только когда интерьер выбран (Алина 24.10), без него — подсказка в ленте интерьеров.
     В Моём ремонте (opts.full) после расчёта работ — ещё переключатель База / Премиум */
  function budgetCard(opts) {
    opts = opts || {};
    /* интерьер не выбран — на месте бюджета выбор интерьера (лента та же, что снизу) */
    if (!interiorChosen()) return planDoc() ? '<section class="pz-card pz-bud pz-ipick"><div class="pz-bud__h"><b>Выбери интерьер — покажем бюджет</b>' +
      '<button type="button" class="pz-bud__go" data-is="all">Все ›</button></div>' + stripList() + '</section>' : '';
    var B = budgetLayers(); if (!B) return '';
    var R = window.SOVE.repair, fid = R && R.flats.active() ? R.flats.active().id : '';
    var act = {
      materials: '<a class="pz-bud__go" href="' + esc((R && R.LINK && R.LINK.materials) || 'my.html') + '">Подобрать ›</a>',
      decor: '<button type="button" class="pz-bud__go" data-pf="visual">Визуализации ›</button>',
      works: '<button type="button" class="pz-bud__go pz-bud__go--pay" data-bud="buy">Узнать · ' + priceTxt() + '</button>'
    };
    return '<section class="pz-card pz-bud"><div class="pz-bud__h"><b>Бюджет квартиры</b><small>известно ' + B.known + ' из 4</small></div>' +
      (opts.full && budgetFull() ? '<div class="pz-btype" role="group" aria-label="Тип бюджета"><button type="button" data-bud-type="base" aria-pressed="' + (B.type !== 'premium') + '">База</button><button type="button" data-bud-type="premium" aria-pressed="' + (B.type === 'premium') + '">Премиум</button></div>' : '') +
      B.parts.map(function (x) {
        return '<div class="pz-bud__r' + (x.known ? '' : ' is-off') + '"><i>' + (x.known ? '✓' : '○') + '</i><span><b>' + esc(x.t) + '</b><small>' + esc(x.sub) + '</small></span>' +
          (x.known ? '<em>' + rub(x.value) + '</em>' : act[x.key]) + '</div>';
      }).join('') +
      '<div class="pz-bud__t"><span>Итого ' + (B.known < 4 ? 'сейчас' : '') + '</span><b>≈ ' + rub(B.total) + '</b></div>' +
      (B.known < 4 ? '<small class="pz-note">станет точнее</small>' : '') +
      (budgetFull() ? '<a class="pz-link pz-link--left" href="scout.html?from=plan&flat=' + encodeURIComponent(fid) + '&step=result">Подробно в Скауте ›</a>' : '') +
      '</section>';
  }
  var budgetOnDone = null;
  function buyBudget(done) {
    var S = window.SOVE, inn = S.auth.isIn(), bal = inn ? S.tokens.balance() : S.data.gift.tokens, enough = !inn || bal >= REPLAN_PRICE;
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-bud-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-bud-t">Стоимость работ</b><small class="pz-sheet__s">черновые и чистовые работы по твоему плану считает Скаут · дальше пересчёт бесплатный</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + priceTxt() + '</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(S.fmt.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough ? '<button type="button" class="pz-btn" data-bs="go">' + (inn ? 'Рассчитать · ' : 'Войти и рассчитать · ') + priceTxt() + '</button>'
              : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<button type="button" class="pz-link" data-bs="no">Не сейчас</button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-bs]'); if (!b) return; close();
      if (b.dataset.bs !== 'go') return;
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      /* списание один раз: резерв → расчёт → списано; не получилось — токены вернём */
      var op = S.tokens.reserve(REPLAN_PRICE, 'Планировка · стоимость работ', 'budget');
      if (!op) { S.ui.toast('Не хватает токенов'); return; }
      document.querySelectorAll('.pz-tok').forEach(function (el) { el.textContent = S.fmt.tokens(S.tokens.balance()) + ' 🎁'; });
      budgetStages(function () { S.tokens.commit(op); if (done) done(); });
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
  }
  /* генерация 3–5 с со стадиями, затем 11 строк — в Мой ремонт */
  function budgetStages(done) {
    var STAGES = ['Считаю работы по м²', 'Материалы по интерьеру', 'Сантехника и свет', 'Готово'];
    var o = document.createElement('div'); o.className = 'pz-sheet-back pz-gen';
    o.innerHTML = '<div class="pz-sheet"><b class="pz-sheet__t">Считаю стоимость работ</b><div class="pz-prog"><i id="pz-gen-bar"></i></div><ul class="pz-stages" id="pz-gen-st">' +
      STAGES.map(function (t, i) { return '<li class="' + (i ? '' : 'is-now') + '"><i>' + (i ? '·' : '◌') + '</i>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    document.body.appendChild(o); var i = 0;
    var tick = setInterval(function () {
      i++; var bar = o.querySelector('#pz-gen-bar'); if (bar) bar.style.width = Math.min(100, i / STAGES.length * 100) + '%';
      o.querySelectorAll('#pz-gen-st li').forEach(function (li, k) { li.className = k < i ? 'is-done' : k === i ? 'is-now' : ''; li.querySelector('i').textContent = k < i ? '✓' : k === i ? '◌' : '·'; });
      if (i >= STAGES.length) {
        clearInterval(tick);
        var R = window.SOVE.repair, P = planDoc(), f = R.flats.ensure(), r = R.get(f.id);
        r.budgetPlan = Object.assign({}, r.budgetPlan || {}, { lines: P.budget.lines, total: P.budget.total, type: P.budget.type, furniture: P.furniture, full: true, ts: Date.now() });
        R.flats.update(f.id, {});
        setTimeout(function () { o.remove(); window.SOVE.ui.toast('Стоимость работ готова · сохранена в Мой ремонт', 'ok'); if (done) done(); }, 400);
      }
    }, 800);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-bud], [data-bud-type]'); if (!b) return;
    if (b.hasAttribute('data-bud-type')) { setBudgetType(b.getAttribute('data-bud-type')); if (budgetOnDone) budgetOnDone(); return; }
    /* весь бюджет считается только с интерьером: нет интерьера — сначала выбор, потом окно оплаты (Алина 24.10) */
    if (!load().interior) {
      var m = window.SOVE.ui.modal({ eyebrow: 'Сначала интерьер', title: 'Под какой интерьер считать работы?', html: interiorTiles(null), actions: [{ label: 'Отмена', kind: 'link' }] });
      var then = function (it) { pickInterior(it); setTimeout(function () { buyBudget(budgetOnDone); }, 300); };
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); then(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(then); });
      return;
    }
    buyBudget(budgetOnDone);
  });

  /* какой вариант расстановки отвечает анкете: правила те же, что в API, здесь — три
     заранее посчитанных набора из arrange-data.js */
  function planFor(brief) {
    if (!brief) return 0;
    if (brief.work === 'да' && brief.bath === 'ванна') return 2;   /* «С рабочим местом» */
    if (brief.work === 'нет') return 1;                            /* «Больше хранения» */
    return 0;                                                      /* «Как советует SOVEAPP» */
  }
  /* ── рамка планировки из разметки: перенос ai_plan_markup.layout_frame ──────
     Разметка приходит в долях 0–1000 ([y, x]), а расстановке нужны пиксели плана
     [x1, y1, x2, y2]. Ниша — своя «комната» с part_of, дверь — зона 0,9 м поперёк
     проёма (у входной — только внутрь), окно — полоса стены 0,3 м. */
  var RU = { 'спальня': 'Спальня', 'санузел': 'Санузел', 'прихожая': 'Прихожая', 'гостиная': 'Гостиная',
             'гостиная-кухня': 'Кухня-гостиная', 'кухня': 'Кухня', 'детская': 'Детская',
             'гардеробная': 'Гардеробная', 'балкон': 'Балкон', 'другое': 'Помещение' };
  function frameFromMarkup(res, W, H) {
    var ppm = +(res.scale_px_per_m || (W / 9));
    function px(b) { return [Math.round(b[1] / 1000 * W), Math.round(b[0] / 1000 * H), Math.round(b[3] / 1000 * W), Math.round(b[2] / 1000 * H)]; }
    var rooms = [], windows = [], doors = [];
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      var name = r.label || RU[r.type] || (r.type || 'Помещение');
      rooms.push({ name: name, type: r.type, box: px(r.main_box_2d || r.box_2d), doc_m2: r.area_m2 });
      if (r.recess) rooms.push({ name: 'Ниша: ' + name, type: r.type, part_of: name, box: px(r.recess.box_2d),
        doc_m2: Math.round((r.recess.depth_m || 0) * (r.recess.width_m || 0) * 10) / 10, contains: r.recess.contains });
    });
    var clear = 0.9 * ppm, wall = 0.3 * ppm;
    (res.openings || []).forEach(function (o) {
      if (o.kind === 'window' && o.span_2d) {
        var ay = o.span_2d[0][0], ax = o.span_2d[0][1], by = o.span_2d[1][0], bx = o.span_2d[1][1], box;
        if (ay === by) box = [ax / 1000 * W, ay / 1000 * H - wall / 2, bx / 1000 * W, by / 1000 * H + wall / 2];
        else box = [ax / 1000 * W - wall / 2, ay / 1000 * H, bx / 1000 * W + wall / 2, by / 1000 * H];
        windows.push({ room: o.a, wall: o.wall, box: box.map(Math.round) });
      } else if (o.kind === 'door' || o.kind === 'passage' || o.kind === 'entrance') {
        if (!o.point_2d) return;
        var cy = o.point_2d[0] / 1000 * H, cx = o.point_2d[1] / 1000 * W;
        var half = Math.max(0.4, +(o.width_m || 0.9)) * ppm / 2, side = o.wall_of_a || o.wall, box2;
        if (o.kind === 'entrance') {
          box2 = { east: [cx - clear, cy - half, cx, cy + half], west: [cx, cy - half, cx + clear, cy + half],
                   south: [cx - half, cy - clear, cx + half, cy], north: [cx - half, cy, cx + half, cy + clear] }[side] ||
                 [cx - half, cy - clear, cx + half, cy + clear];
        } else if (side === 'north' || side === 'south') box2 = [cx - half, cy - clear, cx + half, cy + clear];
        else box2 = [cx - clear, cy - half, cx + clear, cy + half];
        doors.push({ kind: o.kind, a: o.a, b: o.b, box: box2.map(Math.round) });
      }
    });
    return { px_per_m: Math.round(ppm * 100) / 100, rooms: rooms, windows: windows, doors: doors,
             outside: (res.outside || []).map(function (p) { return { box: px(p.box_2d) }; }) };
  }

  /* анкета из четырёх ответов → формат brief, который читает /ai/layout/auto */
  function briefFromAnswers(a) {
    a = a || {};
    return {
      rooms: { kitchen_format: 'кухня-гостиная (единое пространство)' },
      kitchen: { shape: 'Г-образная', front_m: '2–3', fridge: 'встроенный' },
      living: { dining_table: 'стол на 4', sofa: a.sofa || 'прямой, до 200 см', tv: true, extra: 'место для хранения' },
      bedroom: { bed: a.bed || '160×200', nightstands: 2, wardrobe: 'шкаф', workplace: a.work === 'да', tv: false },
      bathroom: { shower: a.bath === 'ванна' ? '' : 'встроенный', bathtub: a.bath === 'ванна', wc: 'подвесной', sink: 'накладная' },
      storage: { zones: ['прихожая', 'спальня'] },
      laundry: { appliances: ['стиральная машина'] }
    };
  }

  /* вызовы API того же сервера; на стенде /api/ проксируется на API, как на сайте */
  function apiMarkup(file) {
    var fd = new FormData(); fd.append('file', file, file.name || 'plan.jpg');
    return fetch('/api/ai/plan/markup', { method: 'POST', body: fd }).then(unwrap);
  }
  function apiAuto(frame, brief) {
    return fetch('/api/ai/layout/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frame, brief: brief }) }).then(unwrap);
  }
  function unwrap(r) {
    return r.text().then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) {}
      if (r.ok) return j;
      var msg = (j && (j.detail || (j.error && j.error.message))) || ('ошибка ' + r.status);
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      var e = new Error(msg); e.status = r.status; throw e;
    });
  }
  function imageSize(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url); };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('не удалось прочитать картинку')); };
      im.src = url;
    });
  }

  window.SOVE_FLOW = { load: load, save: save, blockHead: blockHead, SCN: SCN, REPLAN_PRICE: REPLAN_PRICE, priceTxt: priceTxt, replanSheet: replanSheet, replanOn: replanOn, setReplan: setReplan, stepOf: stepOf, interiorTiles: interiorTiles, interiorStrip: interiorStrip, budgetCard: function (o) { budgetOnDone = o && o.rerender || null; return budgetCard(o); }, budgetFull: budgetFull, budgetLayers: budgetLayers, refreshBudget: refreshBudget, productList: productList, planFinish: planFinish, planDoc: planDoc, savePlan: savePlan, downloadSheet: downloadSheet, furnitureSum: furnitureSum, interiorChosen: interiorChosen, capsuleInterior: capsuleInterior, ownSheet: ownSheet, planFor: planFor,
    frameFromMarkup: frameFromMarkup, briefFromAnswers: briefFromAnswers, apiMarkup: apiMarkup, apiAuto: apiAuto,
    imageSize: imageSize, RU: RU };
})();
