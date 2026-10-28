/* SOVEAPP — прототип. Объект «Мой ремонт», корзина, заказы по сценариям типов поставщиков,
   профиль поставщика (тип, комиссия), заявки партнёра. Подключается после site.js и
   order-scenarios.js. Состояние — в этом браузере (sove.proto.orders.v1); в настоящем приложении
   всё это делает сервер (services/api/orders.py), движок переходов здесь — его зеркало.
   Страницы НЕ меняют этот файл. */
(function () {
  var S = window.SOVE, D = S.data, C = window.SOVE_SCENARIOS, P = window.SOVE_PROMOTION;
  var KEY = 'sove.proto.orders.v1';
  /* Три типа поставщика по PDF Алины 19.10 (Retail · Materials · Custom), как на сайте.
     Один путь заказа для всех (решение 16.10) — SINGLE = true: типы спрячутся, данные останутся. */
  var SINGLE = false;
  var TERMINAL = ['received', 'return', 'cancelled'];
  var PRIORITY = ['custom', 'materials', 'stock'];
  var FIELD_KEYS = ['area', 'sizes', 'budget', 'request', 'quantity', 'packs', 'batch', 'deliveryMethod', 'carrier', 'tracking', 'eta', 'measurementDate', 'specNote', 'specItems', 'finalPrice', 'serviceDate', 'note', 'stage'];
  var DOC_KINDS = ['developer_plan', 'measured_plan', 'design_project'];
  var DOC_LABEL = { developer_plan: 'План застройщика', measured_plan: 'Обмерный план', design_project: 'Дизайн-проект' };
  var LEVEL_LABEL = { none: 'Без документов', developer_plan: 'План застройщика', measured_plan: 'Обмерный план', design_project: 'Дизайн-проект' };
  var SECTIONS = [
    { key: 'finish', label: 'Отделка' }, { key: 'plumbing', label: 'Сантехника' }, { key: 'light', label: 'Свет' },
    { key: 'furniture', label: 'Мебель' }, { key: 'decor', label: 'Декор' }, { key: 'appliances', label: 'Техника' },
    { key: 'doors', label: 'Двери' }, { key: 'other', label: 'Прочее' } ];
  var SECTION_BY_CAT = { 'Отделка': 'finish', 'Сантехника': 'plumbing', 'Освещение': 'light', 'Мебель': 'furniture', 'Текстиль и декор': 'decor', 'Техника': 'appliances', 'Двери': 'doors' };

  function blank() { return { object: null, basket: [], orders: [], profiles: {}, requests: [], appliedPayments: [], seq: 1 }; }
  var st;
  function load() { try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} window.dispatchEvent(new Event('sove:orders')); }
  function uid(p) { st.seq = (st.seq || 1) + 1; return p + '-' + Date.now().toString(36) + '-' + st.seq; }
  function now() { return Date.now(); }
  load();

  /* ---------- сценарии ---------- */
  function scn(key) { return C.scenarios[key] || C.scenarios[C.default]; }
  function scnKey(key) { return C.scenarios[key] ? key : C.default; }
  function paymentIntegrated() { return !!C.payment_integrated; }
  function stepIndex(key, status) { var s = scn(key).steps; for (var i = 0; i < s.length; i++) if (s[i].status === status) return i; return -1; }
  function step(key, status) { var i = stepIndex(key, status); return i >= 0 ? scn(key).steps[i] : null; }
  function statusLabel(key, status) { if (status === 'return') return 'Возврат'; if (status === 'cancelled') return 'Отменён'; var s = step(key, status); return s ? s.label : status; }

  function nextReachable(key, status, actor) {
    var steps = scn(key).steps, i = stepIndex(key, status), out = [];
    if (i < 0 || TERMINAL.indexOf(status) >= 0) return out;
    for (var j = i + 1; j < steps.length; j++) {
      var s = steps[j];
      if (s.actor === 'system') { if (paymentIntegrated()) break; continue; }
      if (s.actor === actor) { out.push(s); if (s.optional) continue; }
      break;
    }
    return out;
  }
  function returnAllowed(key, status) { var s = step(key, status); return !!(s && s.returnable); }
  function cancelAllowed(key, status, actor) {
    if (TERMINAL.indexOf(status) >= 0) return false;
    var i = stepIndex(key, status), uni = C.universal || {};
    if (actor === 'buyer') { if (returnAllowed(key, status)) return false; var b = stepIndex(key, uni.cancel_by_buyer_before || 'paid'); return b >= 0 ? i < b : i < scn(key).steps.length - 1; }
    if (actor === 'supplier') { var cands = [uni.cancel_by_supplier_before || 'shipped', 'done']; for (var k = 0; k < cands.length; k++) { var bb = stepIndex(key, cands[k]); if (bb >= 0) return i < bb; } return i < scn(key).steps.length - 1; }
    return false;
  }
  function actions(key, status, actor) {
    var out = nextReachable(key, status, actor).map(function (s) { return { status: s.status, label: s.action || s.label, fields: s.fields || [], hint: s[actor] || '' }; });
    if (actor === 'buyer' && returnAllowed(key, status)) out.push({ status: 'return', label: 'Вернуть', needsReason: true, fields: [] });
    if (cancelAllowed(key, status, actor)) out.push({ status: 'cancelled', label: 'Отменить', needsReason: actor === 'supplier', fields: [] });
    return out;
  }
  function allowed(key, status, actor) {
    if (actor === 'system') return null;
    return actions(key, status, actor).map(function (a) { return a.status; });
  }
  function timeline(key, status) {
    var steps = scn(key).steps, i = stepIndex(key, status);
    return steps.map(function (s, j) {
      var done = i >= 0 && j <= i, skipped = done && s.status === 'paid' && !paymentIntegrated() && j < i;
      return { status: s.status, label: s.label, actor: s.actor, fields: s.fields || [], optional: !!s.optional, buyer: s.buyer || '', supplier: s.supplier || '', done: done && !skipped, current: j === i, skipped: skipped };
    });
  }
  function preReceive(key) { var steps = scn(key).steps, i = stepIndex(key, 'received'), out = []; for (var j = i - 1; j >= 0; j--) { if (steps[j].actor === 'system') continue; out.push(steps[j].status); break; } return out; }
  function paymentOf(key) { var p = scn(key).payment || {}; return { prepaymentPct: p.prepayment_pct, balanceAt: p.balance_at, payoutEvent: p.payout_event, note: p.note || '' }; }

  /* тип по товарам: профиль поставщика → категория и название (категория весит больше) */
  function detect(products, hint) {
    if (SINGLE) return C.default;
    if (hint && C.scenarios[hint]) return hint;
    var scores = {}; Object.keys(C.scenarios).forEach(function (k) { scores[k] = 0; });
    (products || []).forEach(function (p) {
      var cat = ((p.category || '') + ' ' + (p.subcat || '')).toLowerCase(), name = (p.name || '').toLowerCase();
      if (p.madeToOrder || p.brand === 'на заказ') scores.custom += 2;
      Object.keys(C.scenarios).forEach(function (k) {
        var words = C.scenarios[k].categories || [];
        if (words.some(function (w) { return cat.indexOf(w) >= 0; })) scores[k] += 2;
        if (words.some(function (w) { return name.indexOf(w) >= 0; })) scores[k] += 1;
      });
    });
    var best = 0; Object.keys(scores).forEach(function (k) { if (scores[k] > best) best = scores[k]; });
    if (!best) return C.default;
    for (var i = 0; i < PRIORITY.length; i++) if (scores[PRIORITY[i]] === best) return PRIORITY[i];
    return C.default;
  }

  /* ---------- цены ---------- */
  function mode() { return S.metod.active() ? 'metod' : 'rrp'; }
  function priceFor(p, m) { m = m || mode(); return m === 'metod' ? (p.metod || p.retail) : (p.retail || p.metod); }
  function sectionFor(p) { return SECTION_BY_CAT[p.category] || 'other'; }
  function supplierOf(p) { if (p.brand && p.brand !== 'на заказ') return p.brand; var s = p.suppliers && p.suppliers[0]; return s ? s.name : 'Партнёр'; }

  /* ---------- объект ---------- */
  var object = {
    get: function () { return st.object; },
    set: function (patch) { st.object = Object.assign(st.object || { city: null, complex: null, area: null, rooms: null, bathrooms: null, tier: null, documents: [], ts: now() }, patch, { updated: now() }); if (patch.area) S.my.set({ area: patch.area }); save(); return st.object; },
    clear: function () { st.object = null; save(); },
    addDoc: function (kind, name, size) { var o = object.get() || object.set({}); o.documents.unshift({ id: uid('doc'), kind: kind, name: name, size: size || 0, ts: now() }); save(); },
    removeDoc: function (id) { var o = object.get(); if (!o) return; o.documents = o.documents.filter(function (d) { return d.id !== id; }); save(); },
    level: function () { var o = object.get(), best = 'none', rank = { none: 0, developer_plan: 1, measured_plan: 2, design_project: 3 }; ((o && o.documents) || []).forEach(function (d) { if ((rank[d.kind] || 0) > rank[best]) best = d.kind; }); return best; },
    levelLabel: function () { return LEVEL_LABEL[object.level()]; },
    budgetKind: function () { return { design_project: ['Фактический — по спецификации дизайн-проекта', 'Плановый — по чертежам'], measured_plan: ['Плановый, точнее — по реальным размерам', 'Плановый'], developer_plan: ['Плановый — по капсуле или генерации через Scout', 'Плановый'], none: ['Появится после первого документа или расчёта', 'Плановый — по расчёту'] }[object.level()]; },
    nextDoc: function () { return { none: { kind: 'developer_plan', text: 'Загрузите план застройщика — появится плановый бюджет' }, developer_plan: { kind: 'measured_plan', text: 'Загрузите обмерный план — бюджет станет точнее' }, measured_plan: { kind: 'design_project', text: 'Загрузите дизайн-проект — бюджет станет фактическим' }, design_project: null }[object.level()]; },
    title: function () { var o = object.get(), m = S.my.get(); if (!o) return m.area ? 'Квартира · ' + S.fmt.area(m.area) : 'Квартира'; var parts = [o.city, o.complex, o.area ? S.fmt.area(o.area) : null].filter(Boolean); return parts.length ? parts.join(' · ') : 'Квартира'; },
    /* шкала «Ваш ремонт готов на N %» и следующий шаг (одна главная кнопка) */
    readiness: function () {
      var o = object.get() || {}, m = S.my.get(), lvl = object.level(), list = orders.list(), bask = basket.list();
      var hasBudget = !!m.total || m.productIds.length > 0 || S.gens.list().length > 0;
      var placed = list.filter(function (x) { return x.status !== 'cancelled'; }).length, received = list.filter(function (x) { return x.status === 'received'; }).length;
      var sections = {}; m.productIds.forEach(function (id) { var p = D.product(id); if (p) sections[sectionFor(p)] = true; });
      var closed = {}; list.forEach(function (x) { if (x.status === 'received') x.items.forEach(function (it) { closed[it.section] = true; }); });
      var total = Object.keys(sections).length, closedN = Object.keys(sections).filter(function (k) { return closed[k]; }).length;
      var pct = 0; if (o.city) pct += 5; if (o.area || m.area) pct += 5; pct += { none: 0, developer_plan: 10, measured_plan: 15, design_project: 20 }[lvl];
      if (hasBudget) pct += 15; if (bask.length) pct += 10; if (placed) pct += 10; if (received) pct += 10; if (total) pct += Math.round(25 * Math.min(closedN, total) / total);
      var step;
      if (!o.city || !(o.area || m.area)) step = { title: 'Дополнить объект', hint: 'Город и площадь нужны для расчёта', view: 'object' };
      else if (lvl === 'none') step = { title: 'Загрузить план', hint: 'Загрузите план застройщика — появится плановый бюджет', view: 'object' };
      else if (!hasBudget) step = { title: 'Наложить капсулу', hint: 'План загружен — наложите на него капсулу и посмотрите, сколько стоит этот ремонт', view: 'visual' };
      else if (!bask.length && !placed) step = { title: 'Перенести в корзину', hint: 'Бюджет готов — перенесите отделку в корзину', view: 'budget' };
      else if (!placed) step = { title: 'Оформить заказ', hint: 'Отделка нужна первой — оформите её', view: 'basket' };
      else step = { title: 'Отследить заказы', hint: 'Следующий раздел — сантехника', view: 'orders' };
      return { percent: Math.max(0, Math.min(100, pct)), step: step, level: lvl };
    }
  };

  /* ---------- корзина ---------- */
  var basket = {
    list: function () { return st.basket.slice(); },
    has: function (id) { return st.basket.some(function (b) { return b.productId === Number(id); }); },
    add: function (id, source, qty) {
      id = Number(id); var p = D.product(id); if (!p) return null;
      var row = st.basket.filter(function (b) { return b.productId === id; })[0];
      if (row) row.qty += (qty || 1); else st.basket.unshift({ id: uid('bk'), productId: id, qty: qty || 1, source: source || 'catalog', section: sectionFor(p), payLater: false, ts: now() });
      save(); return row || st.basket[0];
    },
    setQty: function (id, qty) { var row = st.basket.filter(function (b) { return b.id === id; })[0]; if (!row) return; if (qty <= 0) return basket.remove(id); row.qty = qty; save(); },
    togglePayLater: function (id) { var row = st.basket.filter(function (b) { return b.id === id; })[0]; if (row) { row.payLater = !row.payLater; save(); } },
    remove: function (id) { st.basket = st.basket.filter(function (b) { return b.id !== id; }); save(); },
    removeProduct: function (pid) { st.basket = st.basket.filter(function (b) { return b.productId !== Number(pid); }); save(); },
    clear: function () { st.basket = []; save(); },
    rows: function () { return st.basket.map(function (b) { var p = D.product(b.productId); return p ? Object.assign({ product: p }, b) : null; }).filter(Boolean); },
    groups: function (m) {
      m = m || mode(); var by = {};
      basket.rows().forEach(function (r) {
        var key = supplierOf(r.product);
        var g = by[key] || (by[key] = { brand: key, rows: [], total: 0, payNow: 0 });
        g.rows.push(r); var line = priceFor(r.product, m) * r.qty; g.total += line; if (!r.payLater) g.payNow += line;
      });
      return Object.keys(by).sort().map(function (k) {
        var g = by[k], prof = profiles.get(k), key = detect(g.rows.map(function (r) { return r.product; }), prof.scenario), def = scn(key);
        g.scenario = key; g.scenarioLabel = def.label; g.payment = paymentOf(key);
        g.steps = def.steps.filter(function (s) { return s.actor !== 'system' || paymentIntegrated(); }).map(function (s) { return s.label; });
        return g;
      });
    },
    totals: function (m) { m = m || mode(); var t = { count: 0, metod: 0, rrp: 0, payNow: 0, later: 0 }; basket.rows().forEach(function (r) { t.count++; t.metod += r.product.metod * r.qty; t.rrp += r.product.retail * r.qty; var line = priceFor(r.product, m) * r.qty; if (r.payLater) t.later += line; else t.payNow += line; }); return t; },
    bySection: function (m) { m = m || mode(); var out = {}; basket.rows().forEach(function (r) { out[r.section] = (out[r.section] || 0) + priceFor(r.product, m) * r.qty; }); return out; }
  };

  /* ---------- заказы ---------- */
  function entry(actor, action, extra) { var e = { at: now(), actor: actor, action: action }; Object.keys(extra || {}).forEach(function (k) { if (extra[k] != null && extra[k] !== '') e[k] = extra[k]; }); return e; }
  function decorate(o) {
    var key = scnKey(o.scenario), prof = profiles.get(o.brand);
    o.scenarioLabel = scn(key).label; o.statusLabel = statusLabel(key, o.status);
    o.timeline = timeline(key, o.status); o.actions = { buyer: actions(key, o.status, 'buyer'), supplier: actions(key, o.status, 'supplier') };
    o.payment = paymentOf(key); o.fieldLabels = C.field_labels || {};
    o.commissionPct = prof.commissionPct; o.commissionAmount = Math.round(o.total * prof.commissionPct) / 100; o.supplierAmount = Math.round((o.total - o.commissionAmount) * 100) / 100;
    o.prepayment = Math.round(o.total * (o.payment.prepaymentPct == null ? 100 : o.payment.prepaymentPct) / 100);
    return o;
  }
  var orders = {
    list: function () { return st.orders.slice().sort(function (a, b) { return b.ts - a.ts; }).map(decorate); },
    get: function (id) { var o = st.orders.filter(function (x) { return x.id === id; })[0]; return o ? decorate(o) : null; },
    /* оформить: позиции «сейчас» → один заказ на поставщика, цена фиксируется (ТЗ, раздел 4) */
    place: function (address, m) {
      m = m || mode(); var created = [];
      basket.groups(m).forEach(function (g) {
        var rows = g.rows.filter(function (r) { return !r.payLater; }); if (!rows.length) return;
        var items = rows.map(function (r) { return { productId: r.productId, name: r.product.name, brand: r.product.brand, category: r.product.category, section: r.section, source: r.source, qty: r.qty, unitPrice: priceFor(r.product, m), img: r.product.img, lineTotal: priceFor(r.product, m) * r.qty }; });
        var total = items.reduce(function (s, it) { return s + it.lineTotal; }, 0);
        var o = { id: 'o-' + Math.random().toString(16).slice(2, 8), ts: now(), updated: now(), brand: g.brand, scenario: g.scenario, status: 'pending_confirmation', priceMode: m, total: total, address: address || object.title(), items: items, fields: {}, history: [entry('buyer', 'created', { total: total, priceMode: m, scenario: g.scenario })], review: null };
        st.orders.push(o); created.push(o.id);
        rows.forEach(function (r) { basket.remove(r.id); });
      });
      save(); return created.map(orders.get);
    },
    setStatus: function (id, status, actor, opts) {
      opts = opts || {}; var o = st.orders.filter(function (x) { return x.id === id; })[0]; if (!o) throw new Error('нет заказа');
      var key = scnKey(o.scenario), ok = allowed(key, o.status, actor);
      if (ok && ok.indexOf(status) < 0) throw new Error(actor === 'buyer' ? 'Сейчас это действие недоступно' : 'Переход не разрешён сценарием');
      if (status === 'return' && !(opts.reason || '').trim()) throw new Error('Укажите причину возврата');
      if (status === 'cancelled' && actor === 'supplier' && !(opts.reason || '').trim()) throw new Error('Укажите причину отмены');
      var s = step(key, status), f = {}; FIELD_KEYS.forEach(function (k) { if (opts.fields && opts.fields[k] != null && String(opts.fields[k]).trim() !== '') f[k] = String(opts.fields[k]).trim(); });
      if (actor === 'supplier' && s) (s.fields || []).forEach(function (k) { if ((k === 'measurementDate' || k === 'serviceDate') && !f[k]) throw new Error('Укажите ' + ((C.field_labels || {})[k] || k).toLowerCase()); });
      o.history.push(entry(actor, 'status', Object.assign({ status: status, reason: opts.reason, note: opts.note }, f)));
      Object.keys(f).forEach(function (k) { o.fields[k] = f[k]; });
      o.status = status; o.updated = now(); save(); return orders.get(id);
    },
    /* «Доставлен»/«Смонтирован» без претензий N дней → «Получен» (в прототипе по кнопке «прошло 7 дней») */
    autoReceive: function (force) {
      var days = (C.universal || {}).auto_receive_days || 7, lim = now() - days * 864e5, closed = [];
      st.orders.forEach(function (o) { if (TERMINAL.indexOf(o.status) >= 0) return; if (preReceive(scnKey(o.scenario)).indexOf(o.status) < 0) return; if (force === o.id || o.updated <= lim) { o.history.push(entry('system', 'status', { status: 'received', note: 'автоматически через ' + days + ' дн.' })); o.status = 'received'; o.updated = now(); closed.push(o.id); } });
      if (closed.length) save(); return closed;
    },
    review: function (id, product, supplier, text) { var o = st.orders.filter(function (x) { return x.id === id; })[0]; if (!o || o.status !== 'received') throw new Error('Отзыв — после получения'); o.review = { productRating: product, supplierRating: supplier, text: text || '', reply: null, ts: now() }; save(); return orders.get(id); },
    replyReview: function (id, text) { var o = st.orders.filter(function (x) { return x.id === id; })[0]; if (o && o.review) { o.review.reply = text; o.review.repliedAt = now(); save(); } return orders.get(id); },
    supplierRating: function (brand) { var rs = st.orders.filter(function (o) { return o.brand === brand && o.review; }); if (!rs.length) return null; return { count: rs.length, supplier: Math.round(rs.reduce(function (s, o) { return s + o.review.supplierRating; }, 0) / rs.length * 10) / 10 }; },
    /* оплата через тестовый провайдер: предоплата по сценарию; после «банка» — статус «Оплачен» системой */
    payFor: function (id, returnTo) { var o = orders.get(id); if (!o) return null; var pm = S.pay.create({ kind: 'order', id: o.id, title: 'Заказ ' + o.id + ' · ' + o.brand, price: o.prepayment, orderId: o.id }, returnTo || ('my.html?v=order&id=' + o.id)); return pm; },
    syncPayments: function () {
      var changed = false;
      S.pay.list().forEach(function (pm) {
        if (pm.status !== 'paid' || !pm.item || pm.item.kind !== 'order' || st.appliedPayments.indexOf(pm.id) >= 0) return;
        var o = st.orders.filter(function (x) { return x.id === pm.item.orderId; })[0]; st.appliedPayments.push(pm.id);
        if (o && stepIndex(scnKey(o.scenario), 'paid') > stepIndex(scnKey(o.scenario), o.status)) { o.history.push(entry('system', 'status', { status: 'paid', note: 'оплата ' + S.fmt.rub(pm.item.price) + ' на мультисчёте' })); o.status = 'paid'; o.updated = now(); }
        changed = true;
      });
      if (changed) save();
    },
    needsSupplier: function (o) { return (o.actions.supplier || []).some(function (a) { return a.status !== 'cancelled'; }); },
    /* покупателю нужно решение: принять расчёт / КП, подтвердить получение (отмена и возврат не в счёт) */
    needsBuyer: function (o) { return (o.actions.buyer || []).some(function (a) { return a.status !== 'cancelled' && a.status !== 'return'; }); },
    buyerAction: function (o) { return (o.actions.buyer || []).filter(function (a) { return a.status !== 'cancelled' && a.status !== 'return'; })[0] || null; },
    /* учебные заказы для демо-кабинета типа: один ждёт поставщика, второй уже в пути по сценарию */
    seed: function (type, brand) {
      type = scnKey(type); brand = brand || ('Демо · ' + scn(type).short);
      var have = st.orders.filter(function (o) { return o.brand === brand; }); if (have.length >= 3) return [];
      var tomorrow = new Date(now() + 864e5).toLocaleDateString('ru-RU');
      var img = function (cat) { var p = D.products.filter(function (x) { return x.category === cat && x.img; })[0]; return p ? p.img : ''; };
      var SEED = {
        stock: { items: [['Люстра подвесная латунь', 'Освещение', 'light', 1, 24900], ['Смеситель для раковины', 'Сантехника', 'plumbing', 1, 12400]], second: ['shipped', { deliveryMethod: 'Курьер поставщика', eta: 'через 2 дня' }], third: ['paid', {}, 2] },
        materials: { items: [['Керамогранит 60×60 бежевый', 'Отделка', 'finish', 37, 1440], ['Краска матовая для стен, 9 л', 'Отделка', 'finish', 3, 7900]], first: { area: '48 м² пол, 62 м² стены', request: 'запас 10 %, партия одним тоном' }, second: ['spec_sent', { quantity: '53,28 м²', packs: '37', batch: 'одна партия', finalPrice: '239760', eta: '5 дней' }], third: ['paid', { quantity: '53,28 м²', packs: '37', batch: 'партия A-12', finalPrice: '76720', eta: '5 дней' }, 3] },
        custom: { items: [['Кухня угловая на заказ', 'Мебель', 'furniture', 1, 250000]], first: { sizes: '3,2 × 1,8 м, высота 2,4 м', budget: 'до 400 000 ₽', request: 'фасады матовые, без ручек' }, second: ['in_production', { finalPrice: '318000', eta: '3 недели', stage: 'Изготовление' }], third: ['measurement_scheduled', { measurementDate: tomorrow }, 2] }
      }[type];
      var mk = function (status, fields, daysAgo) {
        var items = SEED.items.map(function (r) { return { productId: null, name: r[0], brand: brand, category: r[1], section: r[2], source: 'demo', qty: r[3], unitPrice: r[4], img: img(r[1]), lineTotal: r[3] * r[4] }; });
        var total = items.reduce(function (a, it) { return a + it.lineTotal; }, 0), ts = now() - daysAgo * 864e5;
        var o = { id: 'o-' + Math.random().toString(16).slice(2, 8), ts: ts, updated: ts, brand: brand, scenario: type, status: 'pending_confirmation', priceMode: 'metod', total: total, address: object.title(), items: items, fields: Object.assign({}, SEED.first || {}), history: [entry('buyer', 'created', { total: total, priceMode: 'metod', scenario: type, note: 'учебный заказ' })], review: null };
        if (status !== 'pending_confirmation') { Object.keys(fields || {}).forEach(function (k) { o.fields[k] = fields[k]; }); o.history.push(entry('supplier', 'status', Object.assign({ status: status }, fields || {}))); o.status = status; }
        st.orders.push(o); return o.id;
      };
      var ids = [];
      if (!have.length) { ids.push(mk(SEED.second[0], SEED.second[1], 6)); ids.push(mk('pending_confirmation', null, 1)); }
      if (SEED.third && !have.some(function (o) { return o.status === SEED.third[0]; })) ids.push(mk(SEED.third[0], SEED.third[1], SEED.third[2]));
      profiles.set(brand, { scenario: type }); save(); return ids;
    },
    /* карточка типа: как пойдёт заказ, одной строкой */
    typeInfo: function (key) { var d = scn(key); return { key: scnKey(key), label: d.label, short: d.short, typeLabel: d.type_label || '', description: d.description || '', path: d.steps.filter(function (x) { return x.actor !== 'system'; }).map(function (x) { return x.label; }), payment: (d.payment || {}).note || '', buyerFields: d.buyer_fields || [] }; },
    active: function (o) { return TERMINAL.indexOf(o.status) < 0; },
    finance: function (list) {
      list = (list || orders.list()).filter(function (o) { return o.status !== 'cancelled'; });
      var sum = function (f) { return list.filter(f).reduce(function (s, o) { return s + o.total; }, 0); };
      var received = sum(function (o) { return o.status === 'received'; });
      return { count: list.length, total: sum(function () { return true; }), inWork: sum(function (o) { return o.status !== 'received' && o.status !== 'return'; }), received: received, awaitingPayout: received,
        commission: list.reduce(function (s, o) { return s + o.commissionAmount; }, 0), supplierShare: list.reduce(function (s, o) { return s + o.supplierAmount; }, 0), returns: sum(function (o) { return o.status === 'return'; }), averageCheck: list.length ? Math.round(sum(function () { return true; }) / list.length) : 0 };
    }
  };

  /* ---------- профиль поставщика: тип и комиссия ---------- */
  var profiles = {
    get: function (brand) { var p = st.profiles[brand] || {}; var key = p.scenario && C.scenarios[p.scenario] ? p.scenario : null; return { brand: brand, scenario: key, scenarioLabel: key ? scn(key).label : null, commissionPct: p.commissionPct != null ? p.commissionPct : (C.default_commission_pct || 10), commissionSet: p.commissionPct != null }; },
    set: function (brand, patch) { var p = st.profiles[brand] || (st.profiles[brand] = {}); if (patch.scenario !== undefined) p.scenario = patch.scenario; if (patch.commissionPct !== undefined) p.commissionPct = patch.commissionPct; p.updated = now(); save(); return profiles.get(brand); },
    brands: function () { var set = {}; Object.keys(st.profiles).forEach(function (b) { set[b] = true; }); st.orders.forEach(function (o) { set[o.brand] = true; }); return Object.keys(set).sort(); }
  };

  /* ---------- заявки партнёра: продвижение, менеджер, капсула ---------- */
  var requests = {
    add: function (kind, o) { var r = Object.assign({ id: uid('rq'), ts: now(), kind: kind, status: 'new', reply: null }, o || {}); st.requests.unshift(r); save(); return r; },
    list: function (brand) { return st.requests.filter(function (r) { return !brand || r.brand === brand; }); },
    reply: function (id, text, status) { var r = st.requests.filter(function (x) { return x.id === id; })[0]; if (r) { r.reply = text; r.status = status || 'answered'; r.repliedAt = now(); save(); } return r; }
  };

  window.SOVE.orders = { cfg: C, promotion: P, single: SINGLE, scenario: scn, scenarios: function () { return Object.keys(C.scenarios).filter(function (k) { return !SINGLE || k === C.default; }).map(function (k) { return Object.assign({ key: k }, C.scenarios[k]); }); }, detect: detect, statusLabel: statusLabel,
    mode: mode, priceFor: priceFor, sectionFor: sectionFor, supplierOf: supplierOf, SECTIONS: SECTIONS, DOC_KINDS: DOC_KINDS, DOC_LABEL: DOC_LABEL, LEVEL_LABEL: LEVEL_LABEL,
    object: object, basket: basket, list: orders.list, get: orders.get, place: orders.place, setStatus: orders.setStatus, autoReceive: orders.autoReceive, review: orders.review, replyReview: orders.replyReview, supplierRating: orders.supplierRating,
    payFor: orders.payFor, syncPayments: orders.syncPayments, needsSupplier: orders.needsSupplier, needsBuyer: orders.needsBuyer, buyerAction: orders.buyerAction, seed: orders.seed, typeInfo: orders.typeInfo, active: orders.active, finance: orders.finance, profiles: profiles, requests: requests, reset: function () { st = blank(); save(); } };
  orders.syncPayments();
})();
