/* SOVEAPP — прототип. Общая логика: состояние в браузере, шапка, подвал, окна, токены.
   Страницы НЕ меняют этот файл. Своё — в assets/js/pages/<page>.js
   В настоящем сайте всё, что здесь делает SOVE.tokens / SOVE.auth / SOVE.pay, делает сервер. */
(function () {
  var D = window.SOVE_DATA;
  var KEY = 'sove.proto.v1';

  /* ---------- хранилище ---------- */
  function blank() {
    return { user: null, gifted: {}, ledger: [], reserves: {}, demoUsed: 0, metodUntil: null, access: [],
      projects: [], generations: [], favorites: [], payments: [], leads: [], drafts: {}, my: null,
      scout: { freeUsed: false, opened: {}, requests: [] }, seq: 1 };
  }
  var state;
  function load() {
    try { state = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { state = blank(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватное окно — живём в памяти */ }
    emit();
  }
  function uid(prefix) { state.seq = (state.seq || 1) + 1; return prefix + '-' + Date.now().toString(36) + '-' + state.seq; }
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
  load();

  /* ---------- формат ---------- */
  var fmt = {
    num: function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); },
    rub: function (n) { return fmt.num(n) + ' ₽'; },
    area: function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + ' м²'; },
    date: function (ts) { var d = new Date(ts); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2); },
    dateLong: function (ts) { return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); },
    tokens: function (n) { var a = Math.abs(n) % 100, b = a % 10; var w = (a > 10 && a < 20) ? 'токенов' : b === 1 ? 'токен' : (b >= 2 && b <= 4) ? 'токена' : 'токенов'; return fmt.num(n) + ' ' + w; },
    phone: function (p) { var d = (p || '').replace(/\D/g, ''); return d.length >= 11 ? '+7 ' + d.slice(1, 4) + ' ··· ' + d.slice(7, 9) + ' ' + d.slice(9, 11) : p; },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  };

  /* ---------- вход ---------- */
  var auth = {
    user: function () { return state.user; },
    isIn: function () { return !!state.user; },
    /* В прототипе код не проверяется сервером; login вызывает страница auth.html.
       Способ входа: 'phone' (по умолчанию), 'tg' — Telegram, 'email' — почта.
       Подарок даётся один раз на опознанного человека, поэтому ключ строится
       по нормализованному значению: номер без знаков, почта без псевдонима. */
    login: function (value, kind) {
      kind = kind || 'phone';
      var key, user = { kind: kind, since: Date.now() };
      if (kind === 'email') {
        key = 'e:' + auth.normEmail(value);
        user.email = String(value).trim().toLowerCase();
      } else if (kind === 'tg') {
        var tg = String(value).replace(/^@/, '');
        key = 't:' + tg.toLowerCase();
        /* «собачку» ставим только настоящему нику; у виджета Telegram приходит числовой id */
        user.tg = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tg) ? '@' + tg : tg;
      } else {
        var digits = String(value).replace(/\D/g, '');
        key = digits;
        user.phone = '+' + digits;
      }
      state.user = user;
      var gifted = false;
      if (!state.gifted[key]) {
        state.gifted[key] = Date.now();
        state.ledger.push({ id: uid('op'), ts: Date.now(), type: 'gift', amount: D.gift.tokens, reason: 'Подарок за регистрацию', expires: Date.now() + D.gift.days * 864e5 });
        gifted = true;
      }
      save();
      return { gifted: gifted };
    },

    /* Почта без псевдонима: отбрасываем «+метку», у Gmail ещё и точки в имени.
       Нужно, чтобы один человек не заводил бесконечные аккаунты на один ящик. */
    normEmail: function (email) {
      var parts = String(email || '').trim().toLowerCase().split('@');
      if (parts.length !== 2) return String(email || '').trim().toLowerCase();
      var name = parts[0].split('+')[0], domain = parts[1];
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        name = name.replace(/\./g, '');
        domain = 'gmail.com';
      }
      if (domain === 'ya.ru' || domain === 'yandex.by' || domain === 'yandex.kz') domain = 'yandex.ru';
      if (domain === 'yandex.ru') name = name.replace(/\./g, '-');
      return name + '@' + domain;
    },

    /* занятые ящики прототипа: по ним видно, что это тот же человек */
    emailTaken: function (email) {
      return !!state.gifted['e:' + auth.normEmail(email)];
    },
    /* как назвать вошедшего: номер, почта или просто «Telegram» — ника у нас нет */
    label: function () {
      var u = state.user; if (!u) return '';
      if (u.kind === 'tg') return 'Telegram';
      if (u.kind === 'email') return u.email || '';
      return fmt.phone(u.phone);
    },
    logout: function () { state.user = null; save(); },
    /* отправить на вход и вернуть обратно на returnTo (по умолчанию — текущая страница) */
    require: function (returnTo) {
      if (state.user) return true;
      location.href = 'auth.html?returnTo=' + encodeURIComponent(returnTo || (location.pathname.split('/').pop() + location.search));
      return false;
    }
  };

  /* ---------- токены: журнал операций, резерв → списание / возврат ---------- */
  var tokens = {
    balance: function () {
      if (!state.user) return 0;
      var sum = 0; state.ledger.forEach(function (op) { sum += op.amount; });
      return sum;
    },
    history: function () { return state.ledger.slice().sort(function (a, b) { return b.ts - a.ts; }); },
    giftExpires: function () { var g = state.ledger.filter(function (o) { return o.type === 'gift'; })[0]; return g ? g.expires : null; },
    canAfford: function (cost) { return tokens.balance() >= cost; },
    /* резерв: токены сразу уходят с баланса, но операция помечена «в резерве» */
    reserve: function (cost, reason, ref) {
      if (!tokens.canAfford(cost)) return null;
      var op = { id: uid('op'), ts: Date.now(), type: 'reserve', amount: -cost, reason: reason, ref: ref || null };
      state.ledger.push(op); save(); return op.id;
    },
    commit: function (opId) { var op = find(state.ledger, opId); if (op && op.type === 'reserve') { op.type = 'spend'; save(); } },
    refund: function (opId, why) {
      var op = find(state.ledger, opId); if (!op || op.refunded) return;
      op.type = 'spend'; op.refunded = true;
      state.ledger.push({ id: uid('op'), ts: Date.now() + 1, type: 'refund', amount: -op.amount, reason: 'Возврат · ' + (why || 'операция не удалась'), ref: op.ref });
      save();
    },
    credit: function (amount, reason, ref) { state.ledger.push({ id: uid('op'), ts: Date.now(), type: 'topup', amount: amount, reason: reason, ref: ref || null }); save(); }
  };
  function find(arr, id) { return arr.filter(function (x) { return x.id === id; })[0] || null; }

  /* ---------- демо для гостя ---------- */
  var demo = {
    left: function () { return Math.max(0, D.demoLimit - (state.demoUsed || 0)); },
    use: function () { state.demoUsed = (state.demoUsed || 0) + 1; save(); },
    giveBack: function () { state.demoUsed = Math.max(0, (state.demoUsed || 0) - 1); save(); }
  };

  /* ---------- METOD и разовые доступы ---------- */
  var metod = {
    active: function () { return !!(state.user && state.metodUntil && state.metodUntil > Date.now()); },
    until: function () { return state.metodUntil; },
    daysLeft: function () { return metod.active() ? Math.ceil((state.metodUntil - Date.now()) / 864e5) : 0; },
    activate: function (months) { var from = metod.active() ? state.metodUntil : Date.now(); state.metodUntil = from + months * 30 * 864e5; save(); },
    hasContact: function (productId) { return metod.active() || state.access.indexOf(Number(productId)) >= 0; },
    grantContact: function (productId) { if (state.access.indexOf(Number(productId)) < 0) { state.access.push(Number(productId)); save(); } }
  };

  /* ---------- проекты, генерации, избранное ---------- */
  var projects = {
    list: function () { return state.projects.slice(); },
    get: function (id) { return find(state.projects, id); },
    create: function (o) {
      var pr = { id: uid('pr'), ts: Date.now(), name: o.name || ('Проект ' + (state.projects.length + 1)), capsuleId: o.capsuleId || null, area: o.area || null, scout: o.scout || null, productIds: [], generationIds: [] };
      state.projects.push(pr); save(); return pr;
    },
    update: function (id, patch) { var pr = find(state.projects, id); if (pr) { Object.assign(pr, patch); save(); } return pr; },
    addProduct: function (id, productId) { var pr = find(state.projects, id); if (pr && pr.productIds.indexOf(productId) < 0) { pr.productIds.push(productId); save(); } },
    remove: function (id) { state.projects = state.projects.filter(function (p) { return p.id !== id; }); save(); }
  };
  var gens = {
    list: function () { return state.generations.slice().sort(function (a, b) { return b.ts - a.ts; }); },
    get: function (id) { return find(state.generations, id); },
    /* o: {kind:'photo'|'render', title, src, status:'running'|'done'|'empty'|'error', cost, opId, result, projectId} */
    add: function (o) { var g = Object.assign({ id: uid('gen'), ts: Date.now() }, o); state.generations.push(g); save(); return g; },
    update: function (id, patch) { var g = find(state.generations, id); if (g) { Object.assign(g, patch); save(); } return g; },
    attach: function (id, projectId) { var g = find(state.generations, id), pr = find(state.projects, projectId); if (g && pr) { g.projectId = projectId; if (pr.generationIds.indexOf(id) < 0) pr.generationIds.push(id); save(); } }
  };
  var favs = {
    has: function (id) { return state.favorites.indexOf(Number(id)) >= 0; },
    toggle: function (id) { id = Number(id); var i = state.favorites.indexOf(id); if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id); save(); return i < 0; },
    list: function () { return state.favorites.slice(); }
  };
  var leads = {
    add: function (o) { var l = Object.assign({ id: uid('lead'), ts: Date.now(), status: 'Заявка принята' }, o); state.leads.push(l); save(); return l; },
    list: function () { return state.leads.slice().sort(function (a, b) { return b.ts - a.ts; }); }
  };

  /* ---------- доступ к просчёту Скаута (правила платформы, как в боте) ----------
     Порядок проверки: 1) точный повтор параметров → отдаём прежний расчёт без счёта и без новой заявки;
     2) пара «капсула + тип ремонта» уже открыта → пересчёт (бесплатно, если платформа не назначила цену);
     3) первое открытие: капсула SOVEAPP и первый бесплатный ещё не использован → бесплатно (один раз на клиента);
        есть METOD → бесплатно; иначе счёт в рублях; дизайнерская капсула — всегда платно; цены нет → недоступно. */
  function scoutState() { if (!state.scout) state.scout = { freeUsed: false, opened: {}, requests: [] }; return state.scout; }
  function scoutKey(p) { var c = D.capsule(p.capsuleId) || {}; return [p.capsuleId, 'v' + (c.version || 1), p.level, p.stateId, Math.round((p.area || 0) * 10) / 10, p.rooms || 0, p.bathrooms || 0, p.formatId || '', metod.active() ? 'full' : 'limited'].join('|'); }
  var scout = {
    pairKey: function (capsuleId, level) { return capsuleId + '|' + level; },
    isOpened: function (capsuleId, level) { return !!scoutState().opened[scout.pairKey(capsuleId, level)]; },
    freeUsed: function () { return !!scoutState().freeUsed; },
    price: function (capsuleId, level) {
      var c = D.capsule(capsuleId) || {}, def = D.scoutAccess.defaults[c.type || 'sove'] || {};
      var row = (c.scoutPrices && c.scoutPrices.open && c.scoutPrices.open[level]) || (def.open && def.open[level]) || null;
      if (!row) return null; var v = metod.active() ? row.metod : row.guest; return (v === undefined || v === null) ? null : v;
    },
    /* p: {capsuleId, level, stateId, area, rooms, bathrooms, formatId} → что ждёт клиента при нажатии «Рассчитать» */
    access: function (p) {
      var st = scoutState(), c = D.capsule(p.capsuleId) || {}, key = scoutKey(p);
      var same = st.requests.filter(function (r) { return r.key === key; })[0];
      if (same) return { kind: 'repeat', request: same, price: 0 };
      if (scout.isOpened(p.capsuleId, p.level)) { var def = D.scoutAccess.defaults[c.type || 'sove'] || {}; var rp = def.recalc; return rp ? { kind: 'recalc-paid', price: rp } : { kind: 'opened', price: 0 }; }
      if (c.type === 'designer') { var dp = scout.price(p.capsuleId, p.level); return dp === null ? { kind: 'unavailable', price: null } : { kind: 'paid', price: dp }; }
      if (!st.freeUsed) return { kind: 'first-free', price: 0 };
      if (metod.active()) return { kind: 'metod', price: 0 };
      var pr = scout.price(p.capsuleId, p.level);
      return pr === null ? { kind: 'unavailable', price: null } : { kind: 'paid', price: pr };
    },
    /* записать заявку Скаут после выдачи расчёта. basis: 'first-free' | 'metod' | 'paid' | 'opened' | 'manual' */
    register: function (p, result, basis) {
      var st = scoutState();
      var req = { id: uid('sc'), number: 260 + st.requests.length + 1, ts: Date.now(), key: scoutKey(p), params: p, result: result, basis: basis, fullAccess: metod.active() };
      st.requests.push(req); st.opened[scout.pairKey(p.capsuleId, p.level)] = true; if (basis === 'first-free') st.freeUsed = true; save(); return req;
    },
    open: function (capsuleId, level) { scoutState().opened[scout.pairKey(capsuleId, level)] = true; save(); },
    requests: function () { return scoutState().requests.slice().sort(function (a, b) { return b.ts - a.ts; }); },
    basisLabel: function (b) { return { 'first-free': 'первый бесплатный', metod: 'по подписке METOD', paid: 'оплачен', opened: 'пересчёт открытой капсулы', manual: 'выдано вручную', plan: 'из Планировки' }[b] || b; },
    /* движок расчёта Скаута без экрана: работы = ставка состояния × м², комплектация = цена капсулы за м² × м².
       Его же вызывает бюджет «ремонт под ключ» в Планировке и Моём ремонте (ТЗ Планировки, 17.2 «гибрид»).
       p: {stateId, area, capsuleId, level} → {works, kitMetod, kitRetail, total, stages[[название, ₽]], kit[[категория, ₽]]} */
    estimate: function (p) {
      var SC = D.scout, s = SC.states.filter(function (x) { return x.id === p.stateId; })[0] || SC.states[1], c = D.capsule(p.capsuleId) || {};
      var area = Number(p.area) || 0, perM2 = (p.level === 'premium' && c.pricePerM2Premium) || c.pricePerM2 || 0;
      if (!perM2) { var ps = D.capsules.filter(function (x) { return x.pricePerM2 && !x.soon; }).map(function (x) { return x.pricePerM2; }).sort(function (a, b) { return a - b; }); perM2 = ps[Math.floor(ps.length / 2)] || 0; }
      var works = s.rate * area, kitMetod = perM2 * area;
      return { state: s, area: area, works: works, kitMetod: kitMetod, kitRetail: kitMetod * SC.retailMarkup, total: works + kitMetod,
        stages: SC.stages.map(function (x) { return [x[0], works * x[1] / 100]; }), kit: SC.kitShares.map(function (x) { return [x[0], kitMetod * x[1] / 100]; }) };
    },
    /* параметры Скаута из квартиры Моего ремонта и ответов Планировки — Скаут ничего не переспрашивает */
    fromRepair: function (flatId) {
      var R = window.SOVE.repair, r = R ? R.get(flatId) : {}, f = R ? (flatId ? R.flats.get(flatId) : R.flats.active()) : null, flow = {};
      try { flow = JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}') || {}; } catch (e) {}
      if (r && r.scoutParams) return Object.assign({}, r.scoutParams);
      var STATE = { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'secondary' };
      var rooms = (r && r.plan && r.plan.rooms) || flow.rooms || [], area = rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0) || (f && f.m2) || 0;
      var it = (r && r.interior) || flow.interior || null, base = (r && r.base) || {};
      return { stateId: STATE[base.state || flow.state] || 'concrete', area: Math.round(area * 10) / 10, rooms: rooms,
        capsuleId: it && (it.capsuleId || it.id) || null, level: (r && r.budgetPlan && r.budgetPlan.type) || 'base' };
    }
  };

  /* ---------- «Мой ремонт»: одна опора для всего, что человек делает на сайте (работает и у гостя) ---------- */
  function myState() { if (!state.my) state.my = { capsuleId: null, level: 'base', area: null, stateId: null, total: null, kitMetod: null, kitRetail: null, works: null, productIds: [], service: null, updated: null }; return state.my; }
  var my = {
    get: function () { return myState(); },
    set: function (patch) { Object.assign(myState(), patch, { updated: Date.now() }); save(); return state.my; },
    hasProduct: function (id) { return myState().productIds.indexOf(Number(id)) >= 0; },
    addProduct: function (id) { id = Number(id); var m = myState(); if (m.productIds.indexOf(id) < 0) { m.productIds.push(id); m.updated = Date.now(); save(); } },
    removeProduct: function (id) { id = Number(id); var m = myState(); m.productIds = m.productIds.filter(function (x) { return x !== id; }); save(); },
    isEmpty: function () { var m = myState(); return !m.capsuleId && !m.area && !m.productIds.length; },
    /* этапы пути: что сделано и какой шаг следующий */
    stages: function () {
      var m = myState(), hasLead = state.leads.some(function (l) { return l.product === 'adept' || l.product === 'track'; });
      return [ { key: 'interior', name: 'Интерьер', done: !!m.capsuleId, href: 'capsules.html?pick=1&returnTo=my.html', cta: 'Выбрать интерьер' },
               { key: 'budget', name: 'Бюджет', done: !!m.total, href: 'scout.html', cta: 'Посчитать ремонт' },
               { key: 'goods', name: 'Покупки', done: m.productIds.length > 0, href: 'market.html' + (m.capsuleId ? '?capsule=' + m.capsuleId : ''), cta: 'Подобрать товары' },
               { key: 'service', name: 'Дизайн и ремонт', done: hasLead, href: 'services.html', cta: 'Доверить нам' } ];
    },
    summary: function () {
      var m = myState(), c = m.capsuleId && D.capsule(m.capsuleId), parts = [];
      if (c) parts.push(c.name); if (m.area) parts.push(fmt.area(m.area));
      var short = parts.join(' · ');
      if (m.total) parts.push('≈ ' + (Math.round(m.total / 100000) / 10).toString().replace('.', ',') + ' млн ₽');
      if (m.productIds.length) parts.push(m.productIds.length + ' ' + (m.productIds.length === 1 ? 'товар' : (m.productIds.length < 5 ? 'товара' : 'товаров')));
      return { short: short, full: parts.join(' · ') };
    }
  };

  /* ---------- оплата (тестовый провайдер) ---------- */
  var pay = {
    /* item: {kind:'pack'|'metod'|'contact', id, title, price, tokens?, months?, productId?} → платёж «ожидает» */
    create: function (item, returnTo) { var pm = { id: uid('pay'), ts: Date.now(), status: 'pending', item: item, returnTo: returnTo || 'account.html' }; state.payments.push(pm); save(); return pm; },
    get: function (id) { return find(state.payments, id); },
    list: function () { return state.payments.slice().sort(function (a, b) { return b.ts - a.ts; }); },
    /* «вебхук»: зачисление ровно один раз */
    confirm: function (id) {
      var pm = find(state.payments, id); if (!pm || pm.status === 'paid') return pm;
      pm.status = 'paid'; pm.paidAt = Date.now();
      if (pm.item.kind === 'pack') tokens.credit(pm.item.tokens, 'Пополнение · ' + pm.item.title, pm.id);
      if (pm.item.kind === 'metod') metod.activate(pm.item.months);
      if (pm.item.kind === 'contact') metod.grantContact(pm.item.productId);
      if (pm.item.kind === 'scout') scout.open(pm.item.capsuleId, pm.item.level);
      save(); return pm;
    },
    fail: function (id, status) { var pm = find(state.payments, id); if (pm && pm.status === 'pending') { pm.status = status || 'failed'; save(); } return pm; }
  };

  /* ---------- черновики: контекст не теряется при уходе на вход или оплату ---------- */
  var draft = {
    set: function (key, value) { try { sessionStorage.setItem('sove.draft.' + key, JSON.stringify(value)); } catch (e) { state.drafts[key] = value; save(); } },
    get: function (key) { try { var v = sessionStorage.getItem('sove.draft.' + key); if (v) return JSON.parse(v); } catch (e) {} return state.drafts[key] || null; },
    clear: function (key) { try { sessionStorage.removeItem('sove.draft.' + key); } catch (e) {} delete state.drafts[key]; save(); }
  };

  /* ---------- интерфейс ---------- */
  /* v2: меню от задач человека. Фирменные названия — вторым планом (note). */
  var NAV = [
    { key: 'catalog', label: 'Каталог', href: 'market.html', note: 'мебель, свет, отделка' },
    { key: 'interiors', label: 'Интерьеры', href: 'capsules.html', note: 'готовые капсулы' },
    { key: 'calc', label: 'Расчёт', href: 'scout.html', note: 'бюджет ремонта · Скаут' },
    { key: 'services', label: 'Услуги', href: 'services.html', note: 'дизайн и ремонт под ключ' }
  ];
  var NAVMAP = { capsules: 'interiors', capsule: 'interiors', scout: 'calc', market: 'catalog', product: 'catalog', ai: 'catalog', adept: 'services', track: 'services', services: 'services' };
  var IC = {
    cart: '<path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>', box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    my: '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    svc: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-2.7L7 19l1-6-4-4 5.5-.5z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    calc: '<rect x="5" y="3" width="14" height="18"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/>'
  };
  function icon(name, size) { return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + IC[name] + '</svg>'; }
  /* нижнее меню — строго 5 вкладок по документу Вики (SOVE_Supplier_Handoff_Package, п. 1; Вика 21.10: «у нас пять»): Главная · Капсулы · Мой ремонт · Маркет · Профиль; подвал одинаковый на всех экранах, включая кабинеты; заказы и корзина — экраны «Мой ремонт» и строки профиля */
  /* подвал: пять вкладок, как перечислила Вика 21.10 (Валерия подтвердила 22.10): старый формат, «Заказы» вместо «Капсул»; корзина — плиткой в «Моём ремонте» и строкой в профиле */
  var TABS = [ { key: 'home', label: 'Главная', href: 'home-feed.html', ic: 'home' }, { key: 'market', label: 'Маркет', href: 'market.html', ic: 'cart' }, { key: 'my', label: 'Мой ремонт', href: 'my.html', ic: 'my' }, { key: 'orders', label: 'Заказы', href: 'my.html?v=orders', ic: 'box' }, { key: 'profile', label: 'Профиль', href: 'account.html', ic: 'user' } ];
  var TABMAP = { 'partner-cabinet': 'profile', home: 'home', capsules: 'home', capsule: 'home', market: 'market', product: 'market', ai: 'market', services: 'home', metod: 'home', adept: 'home', track: 'my', gen: 'home', scout: 'home', my: 'my', account: 'profile', project: 'my', generations: 'profile', generation: 'profile', tokens: 'profile', 'sove-ai': 'home', moodboard: 'home', about: 'home', partner: 'home', pay: 'profile', auth: 'profile' };

  var SVC = [ { href: 'metod.html', label: 'METOD', small: 'подписка: скидки и партнёры' }, { href: 'adept.html', label: 'Адепт', small: 'дизайн-проект' }, { href: 'sove-ai.html', label: 'Генерации', small: 'поиск по фото и рендер' }, { href: 'track.html', label: 'Трек', small: 'ремонт под ключ' } ];
  /* число позиций в корзине для бейджа в меню: orders.js на части страниц не подключён, читаем его хранилище напрямую */
  /* баланс токенов в шапке на любом экране (решения 21.10, шаг 1); экраны со своей шапкой берут его через SOVE.ui.tokenChip() */
  function tokenChip() { return '<a class="tok-chip" data-tok href="tokens.html?returnTo=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) + '" aria-label="Баланс: ' + fmt.tokens(tokens.balance()) + '. Пополнить">' + fmt.tokens(tokens.balance()) + '</a>'; }
  function syncTokenChips() { var t = auth.isIn() ? fmt.tokens(tokens.balance()) : ''; document.querySelectorAll('[data-tok]').forEach(function (el) { el.textContent = t; el.hidden = !t; }); }
  function renderHeader() {
    var host = document.getElementById('site-header'); if (!host) return;
    var page = document.body.getAttribute('data-page') || '';
    var tabKey = TABMAP[page] || '';
    var vq = new URLSearchParams(location.search).get('v') || ''; /* экраны заказов кабинета — своя вкладка «Заказы» */
    if (page === 'my' && /^(orders|order|doc)$/.test(vq)) tabKey = 'orders';
    var inn = auth.isIn();
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var title = document.body.getAttribute('data-title') || (document.title.split(' — ')[0] || 'SOVEAPP');
    var isHome = page === 'home';
    var profileHref = inn ? 'account.html' : 'auth.html?returnTo=' + rt;
    var tabs = TABS.map(function (t) { var h = t.key === 'profile' ? profileHref : t.href; return '<a href="' + h + '" data-tab="' + t.key + '" class="' + (t.key === tabKey ? 'is-active' : '') + '"' + (t.key === tabKey ? ' aria-current="page"' : '') + '>' + icon(t.ic, 22) + '<span>' + t.label + '</span></a>'; }).join('');
    host.innerHTML =
      '<header class="appbar">' +
      (isHome ? '<a class="logo" href="index.html" aria-label="SOVEAPP"><img class="logo__img" src="assets/img/logo-sapp-trim.png" alt="SOVEAPP" width="611" height="713"></a>' : '<button type="button" class="appbar__back" data-back aria-label="Назад">' + icon('back', 22) + '</button><span class="appbar__title">' + fmt.esc(title) + '</span>') +
      (inn ? tokenChip() : '') +
      '<a class="appbar__user' + (inn ? ' is-in' : '') + '" href="' + profileHref + '" aria-label="' + (inn ? 'Профиль' : 'Войти') + '">' + icon('user', 22) + '</a>' +
      '</header>' +
      '<aside class="side" aria-label="Меню приложения">' +
      '<a class="logo side__logo" href="index.html" aria-label="SOVEAPP"><img class="logo__img" src="assets/img/logo-sapp-trim.png" alt="SOVEAPP" width="611" height="713"></a>' +
      '<nav class="side__nav">' + tabs + '</nav>' +
      '<div class="side__group"><span class="side__cap">Услуги</span>' + SVC.map(function (x) { return '<a href="' + x.href + '"' + (location.pathname.split('/').pop() === x.href ? ' class="is-active" aria-current="page"' : '') + '>' + fmt.esc(x.label) + '<small>' + fmt.esc(x.small) + '</small></a>'; }).join('') + '</div>' +
      '<div class="side__group"><a href="ai.html"' + (page === 'ai' ? ' class="is-active"' : '') + '>Поиск по фото<small>найти такой же предмет</small></a><a href="capsules.html"' + (page === 'capsules' ? ' class="is-active"' : '') + '>Интерьеры<small>капсулы К1–К7</small></a></div>' +
      '<div class="side__foot"><button type="button" class="side__reset" data-reset>Сбросить данные прототипа</button></div>' +
      '</aside>' +
      '<nav class="tabbar" aria-label="Разделы">' + tabs + '</nav>';
    var back = host.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = 'index.html'; });
    var r = host.querySelector('[data-reset]');
    if (r) r.addEventListener('click', function () { if (confirm('Стереть все данные прототипа в этом браузере?')) { localStorage.removeItem(KEY); location.href = 'index.html'; } });
  }

  function renderFooter() {
    var host = document.getElementById('site-footer'); if (!host) return;
    host.innerHTML = '<p class="proto-note">Прототип SOVEAPP: данные хранятся только в этом браузере, заявки и оплаты никуда не уходят.</p>';
  }

  var ui = {
    tokenChip: function () { return auth.isIn() ? tokenChip() : ''; },
    toast: function (text, kind) {
      var box = document.querySelector('.toasts');
      if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      var t = document.createElement('div'); t.className = 'toast' + (kind ? ' toast--' + kind : ''); t.textContent = text; box.appendChild(t);
      setTimeout(function () { t.remove(); }, 4200);
    },
    /* o: {title, html | text, actions:[{label, kind:'primary'|'ghost'|'dark'|'link', href?, onClick?, close?}], onClose} → {close()} */
    modal: function (o) {
      var back = document.createElement('div'); back.className = 'modal-back';
      var prev = document.activeElement;
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal__close" type="button" aria-label="Закрыть">×</button>' +
        (o.eyebrow ? '<span class="eyebrow">' + fmt.esc(o.eyebrow) + '</span>' : '') +
        '<h2 class="h3" id="modal-title">' + fmt.esc(o.title || '') + '</h2>' +
        '<div class="stack stack--3 modal__body">' + (o.html || (o.text ? '<p class="text">' + fmt.esc(o.text) + '</p>' : '')) + '</div>' +
        '<div class="modal__actions"></div></div>';
      var acts = back.querySelector('.modal__actions');
      (o.actions || []).forEach(function (a) {
        var el = document.createElement(a.href ? 'a' : 'button');
        el.className = 'btn btn--' + (a.kind || 'ghost') + (a.kind === 'link' ? '' : ' btn--block');
        if (a.href) el.href = a.href; else el.type = 'button';
        el.textContent = a.label;
        el.addEventListener('click', function (ev) { if (a.onClick) a.onClick(ev, api); if (a.close !== false && !a.href) api.close(); });
        acts.appendChild(el);
      });
      function close() { back.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; if (prev && prev.focus) prev.focus(); if (o.onClose) o.onClose(); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      var api = { close: close, el: back };
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
      back.querySelector('.modal__close').addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(back); document.body.style.overflow = 'hidden';
      var first = back.querySelector('.modal__body input, .modal__actions .btn, .modal__close'); if (first) first.focus();
      return api;
    },
    confirm: function (o) { return ui.modal({ title: o.title, text: o.text, actions: [ { label: o.ok || 'Да', kind: 'primary', onClick: o.onOk }, { label: o.cancel || 'Отмена', kind: 'ghost' } ] }); },
    /* окно «не хватает токенов»: две равные кнопки, контекст сохраняет вызывающая страница */
    needTokens: function (cost, returnTo) {
      var rt = encodeURIComponent(returnTo || (location.pathname.split('/').pop() + location.search));
      return ui.modal({ eyebrow: 'Не хватает токенов', title: 'Нужно ' + fmt.tokens(cost) + ', на балансе ' + fmt.tokens(tokens.balance()),
        text: 'Фото и параметры мы сохранили. Выберите любой из двух равнозначных способов продолжить: купить токены или оформить METOD — подписка начисляет токены 1:1 к своей сумме. После оплаты вернём вас на этот экран.',
        actions: [ { label: 'Купить токены', kind: 'primary', href: 'tokens.html?returnTo=' + rt },
          { label: 'Оформить METOD', kind: 'ghost', href: 'metod.html?returnTo=' + rt },
          { label: 'Не сейчас', kind: 'link' } ] });
    },
    /* окно «войдите»: после кода вернём на returnTo */
    needAuth: function (why, returnTo) {
      var rt = encodeURIComponent(returnTo || (location.pathname.split('/').pop() + location.search));
      return ui.modal({ eyebrow: 'Нужен вход', title: why || 'Войдите, чтобы продолжить', text: 'Вход по коду из SMS. Новым пользователям дарим ' + fmt.tokens(D.gift.tokens) + ' на SOVEAPP AI. Всё, что вы уже сделали, сохранится.',
        actions: [ { label: 'Войти или зарегистрироваться', kind: 'primary', href: 'auth.html?returnTo=' + rt }, { label: 'Не сейчас', kind: 'ghost' } ] });
    },
    /* выбор проекта: вернёт id через onPick; даёт создать новый */
    pickProject: function (onPick) {
      var list = projects.list();
      var html = list.length
        ? '<div class="stack stack--2">' + list.map(function (p) { var c = D.capsule(p.capsuleId); return '<button type="button" class="option" data-pr="' + p.id + '"><span class="option__title">' + fmt.esc(p.name) + '</span><span class="option__note">' + (c ? c.name + ' · ' : '') + (p.area ? fmt.area(p.area) : 'площадь не указана') + '</span></button>'; }).join('') + '</div>'
        : '<p class="text">Проектов пока нет. Создадим первый — в нём соберутся смета, товары и генерации.</p>';
      html += '<div class="field"><label for="new-project-name">Новый проект</label><input class="input" id="new-project-name" placeholder="Например, квартира на Лесной"></div>';
      var m = ui.modal({ eyebrow: 'Сохранить в проект', title: 'Куда положить?', html: html, actions: [ { label: 'Создать проект и сохранить', kind: 'primary', close: false, onClick: function (ev, api) { var name = api.el.querySelector('#new-project-name').value.trim(); var pr = projects.create({ name: name }); api.close(); onPick(pr.id); } } ] });
      m.el.querySelectorAll('[data-pr]').forEach(function (b) { b.addEventListener('click', function () { m.close(); onPick(b.getAttribute('data-pr')); }); });
      return m;
    },
    productCard: function (p, opts) {
      opts = opts || {};
      var inMy = SOVE.my && SOVE.my.get && (SOVE.my.get().productIds || []).indexOf(p.id) >= 0;
      return '<article class="pc' + (p.white ? ' pc--white' : '') + '">' +
        '<a class="pc__pic" href="product.html?id=' + p.id + '" tabindex="-1" aria-hidden="true"><img src="' + p.img + '" alt="" loading="lazy">' +
        '<span class="pc__off">−' + p.discount + ' %</span>' +
        (SOVE.data.isPromo && SOVE.data.isPromo(p.id) ? '<span class="pc__promo">★ Акция</span>' : '') + '</a>' +
        '<div class="pc__body">' + (opts.tag ? '<span class="tag' + (opts.tag === 'exact' ? ' tag--exact' : '') + '">' + (opts.tag === 'exact' ? 'точное совпадение' : 'похожее') + '</span>' : '<span class="pc__brand">' + fmt.esc(p.brand) + '</span>') +
        '<a class="pc__name" href="product.html?id=' + p.id + '">' + fmt.esc(p.name) + '</a>' +
        '<div class="price"><button type="button" class="price__metod price__metod--tap" data-metod-price="' + p.id + '" aria-label="Цена по подписке METOD: ' + fmt.rub(p.metod) + '. Узнать о подписке">' + fmt.rub(p.metod) + '</button><span class="price__retail">' + fmt.rub(p.retail) + '</span></div>' +
        '<span class="price__sub">с подпиской METOD</span>' +
        '<span class="pc__meta">' + fmt.esc(p.leadTime || '') + (p.suppliers && p.suppliers.length > 1 ? ', ' + p.suppliers.length + ' поставщика' : '') + '</span>' +
        (SOVE.pext && SOVE.pext.delivery ? SOVE.pext.delivery.badge(p) : '') +
        (SOVE.data.isPromo && SOVE.data.isPromo(p.id) ? '<span class="pc__adv">Продвижение · до ' + fmt.esc(SOVE.data.promo[p.id].until) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="pc__add' + (inMy ? ' is-on' : '') + '" data-my-add="' + p.id + '" aria-pressed="' + inMy + '" aria-label="' + (inMy ? 'Убрать из моего ремонта: ' : 'В мой ремонт: ') + fmt.esc(p.name) + '">' + (inMy ? 'В моём ремонте' : 'В мой ремонт') + '</button>' +
        '</article>';
    },
    capsuleCard: function (c, href) {
      return '<a class="capsule-card" href="' + (href || ('capsule.html?id=' + c.id)) + '"><div class="capsule-card__pic"><img src="' + c.cover + '" alt="Капсула « ' + c.name + ' »" loading="lazy"></div>' +
        '<span class="capsule-card__name">' + fmt.esc(c.name) + '</span><span class="capsule-card__price">' + (c.soon ? 'скоро' : (c.designer ? 'авторский · ' : '') + 'от\u00a0' + fmt.rub(c.pricePerM2) + '/м²') + '</span></a>';
    },
    /* каталожное фото снято с широкими белыми полями: находим предмет и вписываем его в рамку */
    fitPhoto: function (img, host) {
      function place() {
        var n = 140, w = n, h = Math.max(1, Math.round(n * img.naturalHeight / img.naturalWidth));
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var ctx = cv.getContext('2d'); if (!ctx) return;
        try { ctx.drawImage(img, 0, 0, w, h); } catch (e) { return; }
        var px; try { px = ctx.getImageData(0, 0, w, h).data; } catch (e) { return; }
        var x, y, i, minX = w, minY = h, maxX = -1, maxY = -1;
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          i = (y * w + x) * 4;
          if (px[i + 3] > 24 && (px[i] + px[i + 1] + px[i + 2]) / 3 < 243) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
        if (maxX <= minX || maxY <= minY) return;
        var sw = host.clientWidth, sh = host.clientHeight; if (!sw || !sh) return;
        var k = Math.min(sw / img.naturalWidth, sh / img.naturalHeight);
        var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
        var bw = (maxX - minX + 1) / w * dw, bh = (maxY - minY + 1) / h * dh;
        var bx = (minX + maxX + 1) / 2 / w * dw + (sw - dw) / 2, by = (minY + maxY + 1) / 2 / h * dh + (sh - dh) / 2;
        var sc = Math.min(3, (sw * 0.94) / bw, (sh * 0.92) / bh);
        img.style.transform = 'translate(' + (-sc * (bx - sw / 2)).toFixed(1) + 'px,' + (-sc * (by - sh / 2)).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      }
      if (img.complete && img.naturalWidth) place(); else img.addEventListener('load', place);
    },
    /* сцена «сорвите ценник»: розничный ценник поверх вещи, под ним цена METOD */
    tearScene: function (p) {
      var name = String(p.name).split(' - ')[0].split(' \u2014 ')[0].slice(0, 46);
      return '<div class="mtd__stage">' +
        '<img class="mtd__pic" src="' + p.img + '" alt="' + fmt.esc(name) + '">' +
        '<div class="mtd__under"><span class="mtd__ulabel">цена METOD</span><b>' + fmt.rub(p.metod) + '</b>' +
        '<span class="mtd__save">дешевле на ' + fmt.rub(p.retail - p.metod) + '</span></div>' +
        '<div class="mtd__tag"><span>розница</span><b>' + fmt.rub(p.retail) + '</b><i class="mtd__hole"></i>' +
        '<em class="mtd__hint" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v13M6 13l6 6 6-6"/></svg></em></div>' +
        '</div>';
    },
    /* жесты для сцены: ценник тянут вниз, после порога он срывается */
    bindTear: function (stage, opts) {
      opts = opts || {};
      var tag = stage.querySelector('.mtd__tag'); if (!tag) return null;
      var img = stage.querySelector('.mtd__pic'); if (img) ui.fitPhoto(img, stage);
      var drag = false, x0 = 0, y0 = 0, done = false;
      function set(dx, dy, rot) { tag.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)'; }
      function tear() {
        done = true;
        tag.style.transition = 'transform .45s ease, opacity .45s ease';
        set(30, 230, 16); tag.style.opacity = '0';
        stage.classList.add('is-open');
        if (typeof opts.onTear === 'function') opts.onTear();
      }
      tag.addEventListener('pointerdown', function (e) {
        if (done) return;
        drag = true; x0 = e.clientX; y0 = e.clientY;
        tag.style.transition = 'none'; tag.setPointerCapture(e.pointerId); e.preventDefault();
      });
      tag.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - x0, dy = Math.max(0, e.clientY - y0);
        set(dx * 0.6, dy, dy * 0.06);
        stage.classList.toggle('is-peek', dy > 20);
        e.preventDefault();
      });
      tag.addEventListener('pointerup', function (e) {
        if (!drag) return;
        drag = false;
        var dy = e.clientY - y0;
        tag.style.transition = 'transform .3s ease, opacity .3s ease';
        if (dy > 70) tear(); else { set(0, 0, 0); stage.classList.remove('is-peek'); }
      });
      /* подсказка движением: ценник качнулся и вернулся */
      function nudge(delay) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setTimeout(function () {
          if (done) return;
          tag.style.transition = 'transform .5s ease';
          set(0, 26, 2); stage.classList.add('is-peek');
          setTimeout(function () { if (!done) { set(0, 0, 0); stage.classList.remove('is-peek'); } }, 700);
        }, delay || 700);
      }
      return { tear: tear, nudge: nudge, torn: function () { return done; } };
    },
    /* нажали на цену со скидкой: показываем тот же «сорвите ценник» для этой вещи */
    metodPrice: function (productId) {
      var p = D.product(productId); if (!p) return null;
      var saveOn = p.retail - p.metod;
      var plan = D.metodPlans.slice().sort(function (a, b) { return a.price - b.price; })[0];
      var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      var mine = metod.active();
      var m = ui.modal({
        eyebrow: 'Подписка METOD',
        title: mine ? 'Эта цена уже ваша' : 'Сорвите ценник',
        html: '<p class="text mtd__d">' + (mine
            ? 'Цена под ценником — по вашей подписке. Осталось ' + metod.daysLeft() + ' дн.'
            : 'Под розничным ценником — цена, по которой продаёт сам поставщик') + '</p>' +
          ui.tearScene(p) +
          '<p class="mtd__gain">Выгода на этой вещи — ' + fmt.rub(saveOn) +
          (!mine && plan ? '. Подписка ' + fmt.rub(plan.price) + ' в месяц' + (plan.price <= saveOn ? ' окупается этой покупкой' : '') : '') + '.</p>',
        actions: mine
          ? [ { label: 'Понятно', kind: 'primary' } ]
          : [ { label: 'Получить низкие цены', kind: 'primary', href: 'metod.html?returnTo=' + rt }, { label: 'Не сейчас', kind: 'ghost' } ]
      });
      var stage = m.el.querySelector('.mtd__stage');
      if (stage) { var api = ui.bindTear(stage); if (api) api.nudge(500); }
      return m;
    },
    /* Подсказки в строке поиска: товары, разделы и бренды прямо при наборе.
       Работает и на главной, и в каталоге — вешается на любой input. */
    suggest: function (input, opts) {
      if (!input || input.dataset.suggest) return null;
      input.dataset.suggest = '1';
      opts = opts || {};
      var KEY = 'sove.proto.recentSearch';
      var box = document.createElement('div');
      box.className = 'sug';
      box.setAttribute('role', 'listbox');
      box.hidden = true;
      (input.closest('form') || input.parentElement).appendChild(box);
      var items = [], cur = -1, tm = null;

      function norm(v) { return String(v || '').toLowerCase().replace(/ё/g, 'е').trim(); }
      function recent() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
      function remember(q) {
        q = q.trim(); if (q.length < 2) return;
        var list = recent().filter(function (x) { return norm(x) !== norm(q); });
        list.unshift(q);
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {}
      }
      function mark(text, q) {
        var t = String(text), i = norm(t).indexOf(norm(q));
        if (i < 0 || !q) return fmt.esc(t);
        return fmt.esc(t.slice(0, i)) + '<mark>' + fmt.esc(t.slice(i, i + q.length)) + '</mark>' + fmt.esc(t.slice(i + q.length));
      }

      /* что нашли: сначала товары, затем разделы и бренды — как в маркетплейсах.
         С живым каталогом (SOVE.catalog) товары и бренды приходят с сервера: ответ кладём в кэш и перерисовываем. */
      var live = {}, liveTm = null;
      function liveFetch(q) {
        var n = norm(q);
        if (!(window.SOVE.catalog && SOVE.catalog.enabled) || n.length < 2 || live[n]) return;
        live[n] = { items: null };
        SOVE.catalog.search({ q: q, page_size: 6 }).then(function (r) {
          var brands = {};
          r.items.forEach(function (p) { if (p.brand && norm(p.brand).indexOf(n) >= 0) brands[p.brand] = 1; });
          live[n] = { items: r.items, total: r.total, brands: Object.keys(brands).slice(0, 3) };
          if (norm(input.value.trim()) === n) paint();
        }).catch(function () { live[n] = { items: [], total: 0, brands: [] }; });
      }
      function build(q) {
        var n = norm(q), out = [];
        if (n.length < 2) {
          return recent().map(function (r) { return { kind: 'recent', label: r, href: 'market.html?q=' + encodeURIComponent(r) }; });
        }
        if (window.SOVE.catalog && SOVE.catalog.enabled) {
          liveFetch(q);
          var L = live[n];
          if (!L || !L.items) return [{ kind: 'empty', label: 'Ищем в каталоге…', href: 'market.html?q=' + encodeURIComponent(q) }];
          L.items.forEach(function (p) { out.push({ kind: 'product', product: p, label: p.name, href: 'product.html?id=' + p.id }); });
          L.brands.forEach(function (b) { out.push({ kind: 'brand', label: b, href: 'market.html?q=' + encodeURIComponent(b) }); });
          if (!out.length) out.push({ kind: 'empty', label: 'Ничего не нашли — покажем весь каталог', href: 'market.html?q=' + encodeURIComponent(q) });
          return out;
        }
        var goods = D.products.filter(function (p) {
          return norm(p.name).indexOf(n) >= 0 || norm(p.brand).indexOf(n) >= 0 || norm(p.subcat).indexOf(n) >= 0;
        });
        /* точное начало названия важнее совпадения в середине */
        goods.sort(function (a, b) {
          var ai = norm(a.name).indexOf(n), bi = norm(b.name).indexOf(n);
          return (ai === 0 ? -1 : 0) - (bi === 0 ? -1 : 0) || (b.retail - b.metod) - (a.retail - a.metod);
        });
        goods.slice(0, 6).forEach(function (p) { out.push({ kind: 'product', product: p, label: p.name, href: 'product.html?id=' + p.id }); });

        var subs = {};
        D.products.forEach(function (p) {
          if (p.subcat && norm(p.subcat).indexOf(n) >= 0) subs[p.subcat] = (subs[p.subcat] || 0) + 1;
        });
        Object.keys(subs).slice(0, 3).forEach(function (k) {
          out.push({ kind: 'section', label: k, note: subs[k] + ' товаров', href: 'market.html?sub=' + encodeURIComponent(k) });
        });

        var brands = {};
        D.products.forEach(function (p) {
          if (p.brand && p.brand !== 'на заказ' && norm(p.brand).indexOf(n) >= 0) brands[p.brand] = (brands[p.brand] || 0) + 1;
        });
        Object.keys(brands).slice(0, 3).forEach(function (k) {
          out.push({ kind: 'brand', label: k, note: brands[k] + ' товаров', href: 'market.html?q=' + encodeURIComponent(k) });
        });

        if (!out.length) out.push({ kind: 'empty', label: 'Ничего не нашли — покажем весь каталог', href: 'market.html?q=' + encodeURIComponent(q) });
        return out;
      }

      var ICONS = {
        recent: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/><path d="M12 8v4l3 2"/>',
        section: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="15" width="7" height="5" rx="1.5"/><rect x="14" y="15" width="7" height="5" rx="1.5"/>',
        brand: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z"/>',
        empty: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'
      };
      function ico(kind) {
        return '<span class="sug__ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
          (ICONS[kind] || ICONS.empty) + '</svg></span>';
      }
      var TITLES = { product: 'Товары', section: 'Разделы', brand: 'Бренды', recent: 'Вы искали', empty: '' };
      function row(it, q, i) {
        var on = i === cur ? ' is-on' : '';
        if (it.kind === 'product') {
          var save = it.product.retail - it.product.metod;
          return '<a class="sug__item sug__item--prod' + on + '" role="option" href="' + it.href + '" data-i="' + i + '">' +
            '<span class="sug__pic"><img src="' + it.product.img + '" alt="" loading="lazy"></span>' +
            '<span class="sug__body"><b>' + mark(it.label, q) + '</b>' +
            '<i>' + fmt.esc(it.product.brand) + '</i></span>' +
            '<span class="sug__price"><b>' + fmt.rub(it.product.metod) + '</b>' +
            (save > 0 ? '<s>' + fmt.rub(it.product.retail) + '</s>' : '') + '</span></a>';
        }
        return '<a class="sug__item' + on + '" role="option" href="' + it.href + '" data-i="' + i + '">' +
          ico(it.kind) +
          '<span class="sug__body"><b>' + mark(it.label, q) + '</b>' + (it.note ? '<i>' + fmt.esc(it.note) + '</i>' : '') + '</span>' +
          '<span class="sug__go" aria-hidden="true">→</span></a>';
      }

      function paint() {
        var q = input.value.trim();
        items = build(q);
        if (!items.length) { close(); return; }
        var html = '', last = '';
        items.forEach(function (it, i) {
          if (it.kind !== last && TITLES[it.kind]) html += '<span class="sug__head">' + TITLES[it.kind] + '</span>';
          last = it.kind;
          html += row(it, q, i);
        });
        if (q.length >= 2) html += '<a class="sug__all" href="market.html?q=' + encodeURIComponent(q) + '">Показать всё в каталоге</a>';
        box.innerHTML = html;
        box.hidden = false;
        box.classList.remove('is-in'); void box.offsetWidth; box.classList.add('is-in');
      }
      function close() { box.hidden = true; cur = -1; }
      function go(i) {
        var it = items[i]; if (!it) return;
        remember(it.kind === 'product' ? input.value : it.label);
        location.href = it.href;
      }

      input.setAttribute('autocomplete', 'off');
      input.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(paint, 90); });
      input.addEventListener('focus', paint);
      input.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          cur = e.key === 'ArrowDown' ? Math.min(items.length - 1, cur + 1) : Math.max(0, cur - 1);
          box.querySelectorAll('.sug__item').forEach(function (el, i) { el.classList.toggle('is-on', i === cur); });
          return;
        }
        if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); go(cur); return; }
        if (e.key === 'Escape') { close(); }
      });
      box.addEventListener('mousedown', function (e) {
        var a = e.target.closest('[data-i]'); if (!a) return;
        e.preventDefault(); go(Number(a.getAttribute('data-i')));
      });
      document.addEventListener('click', function (e) {
        if (!box.contains(e.target) && e.target !== input) close();
      });
      var form = input.closest('form');
      if (form) form.addEventListener('submit', function () { remember(input.value); });
      return { close: close, refresh: paint };
    },
    qs: function (name) { return new URLSearchParams(location.search).get(name); },
    /* заявка на услугу: {product, title, note, extra} → окно с именем и телефоном, затем экран «принята» */
    leadSheet: function (o) {
      var inn = auth.isIn();
      var m = ui.modal({ eyebrow: o.eyebrow || 'Заявка', title: o.title || 'Оставьте заявку', html:
        '<form class="lead-sheet" id="lead-sheet" novalidate>' +
        (o.note ? '<p class="text">' + fmt.esc(o.note) + '</p>' : '') +
        '<div class="field"><label for="ls-name">Как вас зовут</label><input class="input" id="ls-name" name="name" autocomplete="name" maxlength="60"></div>' +
        '<div class="field"><label for="ls-phone">Телефон</label><input class="input" id="ls-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"' + (inn && state.user.phone ? ' value="' + fmt.esc(state.user.phone) + '"' : '') + '><p class="field__error" id="ls-err" hidden></p></div>' +
        '<div class="field"><label for="ls-note">Комментарий <span class="muted">необязательно</span></label><textarea class="input" id="ls-note" rows="2" maxlength="300"></textarea></div>' +
        '<p class="tiny muted">Нажимая кнопку, вы соглашаетесь с <a href="about.html#docs">политикой обработки данных</a>.</p>' +
        '</form>',
        actions: [ { label: o.cta || 'Отправить заявку', kind: 'primary', close: false, onClick: submit }, { label: 'Не сейчас', kind: 'link' } ] });
      var el = m.el;
      function submit() {
        var name = el.querySelector('#ls-name').value.trim(), phone = el.querySelector('#ls-phone').value.replace(/\D/g, ''), err = el.querySelector('#ls-err');
        if (phone.length === 10) phone = '7' + phone; if (phone.charAt(0) === '8' && phone.length === 11) phone = '7' + phone.slice(1);
        if (phone.length !== 11) { err.hidden = false; err.textContent = 'Введите телефон полностью: 11 цифр, например +7 900 000-00-00.'; el.querySelector('#ls-phone').focus(); return; }
        var lead = leads.add(Object.assign({ product: o.product, name: name, phone: '+' + phone, note: el.querySelector('#ls-note').value.trim() }, o.extra || {}));
        el.querySelector('.modal__body').innerHTML = '<div class="lead-done"><span class="lead-done__ok">✓</span><span class="h3">Заявка принята</span><p class="text">' + fmt.esc(o.done || 'Менеджер перезвонит в рабочее время и уточнит детали.') + '</p><p class="small muted">Номер заявки ' + fmt.esc(lead.id.slice(-6).toUpperCase()) + '. Статус — в профиле.</p></div>';
        el.querySelector('.modal__actions').innerHTML = '<a class="btn btn--dark btn--block" href="account.html#leads">Мои заявки</a><button type="button" class="btn btn--link" data-close>Закрыть</button>';
        el.querySelector('[data-close]').addEventListener('click', m.close);
        if (typeof o.onDone === 'function') o.onDone(lead);
      }
      el.querySelector('#lead-sheet').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
      return m;
    }
  };

  window.SOVE = { data: D, fmt: fmt, auth: auth, tokens: tokens, demo: demo, metod: metod, projects: projects, my: my, scout: scout, gens: gens, favs: favs, leads: leads, pay: pay, draft: draft, ui: ui,
    onChange: function (fn) { listeners.push(fn); }, _state: function () { return state; } };

  function renderFunnel() {
    var b = document.body, cta = b.getAttribute('data-funnel-cta'); if (!cta) return;
    var bar = document.createElement('div'); bar.className = 'fbar';
    var target = b.getAttribute('data-funnel-target') || 'lead', price = b.getAttribute('data-funnel-price') || '';
    bar.innerHTML = '<div class="fbar__in">' + (price ? '<span class="fbar__price">' + fmt.esc(price) + '</span>' : '') + '<' + (target === 'lead' ? 'button type="button"' : 'a href="' + fmt.esc(target) + '"') + ' class="btn btn--primary fbar__btn">' + fmt.esc(cta) + '</' + (target === 'lead' ? 'button' : 'a') + '></div>';
    document.getElementById('site-footer').before(bar);
    if (target !== 'lead') bar.querySelector('.fbar__btn').addEventListener('click', function (e) { if (openAcc(target)) e.preventDefault(); });
    if (target === 'lead') bar.querySelector('.fbar__btn').addEventListener('click', function () { ui.leadSheet({ product: b.getAttribute('data-page'), title: b.getAttribute('data-funnel-title') || cta, note: b.getAttribute('data-funnel-note') || '', cta: cta }); });
    /* кнопка прячется, когда её «двойник» на странице и так на экране */
    var twins = document.querySelectorAll('[data-funnel-twin]'), seen = {};
    if (twins.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e, i) { seen[e.target.id || ('t' + Array.prototype.indexOf.call(twins, e.target))] = e.isIntersecting; }); var any = Object.keys(seen).some(function (k) { return seen[k]; }); bar.classList.toggle('is-hidden', any); }, { threshold: .3 });
      twins.forEach(function (t) { io.observe(t); });
    }
  }
  /* ссылка на якорь внутри закрытого блока раскрывает его */
  function openAcc(hash) {
    if (!hash || hash.charAt(0) !== '#') return false;
    var el = document.querySelector(hash); if (!el) return false;
    var d = el.closest ? el.closest('details') : null; if (d && !d.open) d.open = true;
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
    return true;
  }
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && openAcc(a.getAttribute('href'))) e.preventDefault(); });
  /* на большом экране приложение показываем в рамке телефона: внутри рамки настоящая телефонная вёрстка */
  (function () {
    var q = new URLSearchParams(location.search);
    if (q.get('noframe')) { try { sessionStorage.setItem('sove.noframe', '1'); } catch (e) {} }
    var off = false; try { off = sessionStorage.getItem('sove.noframe') === '1'; } catch (e) {}
    if (window.top === window && !off && window.innerWidth >= 760 && document.body.getAttribute('data-page') !== 'phone') {
      location.replace('phone.html?p=' + encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash));
    }
  })();
  function boot() { renderHeader(); renderFooter(); renderFunnel(); listeners.push(function () { renderHeader(); syncTokenChips(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); emit(); } });
})();

/* быстрая кнопка «В мой ремонт» на любой карточке товара */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-my-add]'); if (!b || !window.SOVE || !SOVE.my) return;
  var id = Number(b.getAttribute('data-my-add')), on = b.classList.contains('is-on');
  if (on) SOVE.my.removeProduct(id); else SOVE.my.addProduct(id);
  b.classList.toggle('is-on', !on); b.setAttribute('aria-pressed', String(!on)); b.textContent = on ? 'В мой ремонт' : 'В моём ремонте';
  if (SOVE.ui && SOVE.ui.toast) SOVE.ui.toast(on ? 'Убрали из «Моего ремонта»' : 'Добавили в «Мой ремонт»');
  window.dispatchEvent(new Event('sove:my'));
});

/* нажатие на цену со скидкой в каталоге: объясняем, что это цена подписки METOD */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-metod-price]');
  if (!b || !window.SOVE || !SOVE.ui || !SOVE.ui.metodPrice) return;
  e.preventDefault();
  SOVE.ui.metodPrice(Number(b.getAttribute('data-metod-price')));
});
