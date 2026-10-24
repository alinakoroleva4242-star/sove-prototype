/* «Мой ремонт» — общий слой (ТЗ Алины 22.10.2026, design/moy-remont/TZ-moy-remont.md).
   Чистовик квартиры: сюда падает только сохранённое из SOVE AI (план, мудборд, рендеры), Скаута (бюджет) и Маркета (♡ и 🛒).
   Подключать после site.js. Даёт window.SOVE.repair: квартиры, сохранения, Избранное и Корзина по квартире,
   общую карточку товара (та же, что под результатами SOVE AI) и полосу «Корзина · Избранное · Бюджет» над нижним меню.
   В бою всё это — сервер; здесь отдельный ключ localStorage, «Сбросить данные прототипа» чистит и его. */
(function () {
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var KEY = 'sove.repair.v1';
  var MY = 'my.html';
  /* куда ведут призывы: экран услуги SOVE AI и его блоки (поменять здесь, когда появится sove-ai.html / moodboard.html) */
  var LINK = { ai: 'gen.html', plan: 'plan-demo.html', materials: 'capsules.html', visual: 'result.html', scout: 'scout.html', market: 'market.html', metod: 'metod.html', adept: 'adept.html', track: 'track.html' };
  var LEVEL = { none: 'Без плана', developer_plan: 'План застройщика', measured_plan: 'Обмерный план', design_project: 'Дизайн-проект' };
  var RANK = { none: 0, developer_plan: 1, measured_plan: 2, design_project: 3 };
  var SRC = { budget: 'Из бюджета', moodboard: 'Из мудборда', room: 'Из комнат', market: 'Из Маркета' };
  var WHAT = { plan: 'план', interior: 'мудборд', budget: 'бюджет' };
  var DEFAULT_ROOMS = [ { key: 'liv', name: 'Кухня-гостиная' }, { key: 'bed', name: 'Спальня' }, { key: 'bath', name: 'Санузел' }, { key: 'hall', name: 'Прихожая' } ];
  /* какие разделы каталога показываем «в комнате» — товары берём из каталога по капсуле мудборда */
  var ROOM_CATS = { liv: ['Мебель', 'Освещение', 'Техника', 'Текстиль и декор'], bed: ['Мебель', 'Освещение', 'Текстиль и декор'], bath: ['Сантехника', 'Отделка'], hall: ['Мебель', 'Освещение', 'Отделка'] };

  /* ---------- хранилище ---------- */
  function blank() { return { flats: [], active: null, repair: {}, fav: {}, cart: {}, seq: 1 }; }
  var st;
  function load() { try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} renderStrip(); window.dispatchEvent(new Event('sove:repair')); }
  function uid(p) { st.seq = (st.seq || 1) + 1; return p + '-' + Date.now().toString(36) + '-' + st.seq; }
  load();
  /* товары боевого каталога, которых нет в образце data.js (корпусная мебель, техника под расстановку):
     запоминаем их при ♡ / 🛒, чтобы Корзина и Избранное видели их на любом экране */
  var XKEY = 'sove.products.extra';
  function extras() { try { return JSON.parse(localStorage.getItem(XKEY) || '{}') || {}; } catch (e) { return {}; } }
  function addToData(p) { if (p && !D.product(p.id)) D.products.push(p); }
  (function () { var x = extras(); Object.keys(x).forEach(function (k) { addToData(x[k]); }); })();
  function registerProduct(p) {
    if (!p || !p.id) return; addToData(p);
    var x = extras(); if (x[p.id]) return;
    x[p.id] = { id: p.id, name: p.name, brand: p.brand, metod: p.metod, retail: p.retail, img: p.img, category: p.category || 'Мебель', subcat: p.subcat || '' };
    try { localStorage.setItem(XKEY, JSON.stringify(x)); } catch (e) {}
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); renderStrip(); window.dispatchEvent(new Event('sove:repair')); } });

  function roomKey(name) { var n = String(name || '').toLowerCase(); return /кух|гост/.test(n) ? 'liv' : /спал/.test(n) ? 'bed' : /сан|ванн|душ/.test(n) ? 'bath' : /прих|корид|холл/.test(n) ? 'hall' : n.replace(/[^a-zа-я0-9]+/g, '-'); }

  /* ---------- квартиры ---------- */
  var flats = {
    list: function () { return st.flats.slice(); },
    get: function (id) { return st.flats.filter(function (f) { return f.id === id; })[0] || null; },
    active: function () { return flats.get(st.active) || st.flats[0] || null; },
    setActive: function (id) { if (flats.get(id)) { st.active = id; save(); } },
    /* новая квартира: первая — «Моя квартира», дальше «Квартира 2», «Квартира 3»; поля объекта подтягиваем из старой анкеты, если она есть */
    add: function (o) {
      o = o || {}; var ob = (!st.flats.length && S.orders && S.orders.object.get()) || {};
      var f = { id: uid('flat'), name: o.name || (st.flats.length ? 'Квартира ' + (st.flats.length + 1) : 'Моя квартира'), jk: o.jk || ob.complex || '', city: o.city || ob.city || '', m2: o.m2 || ob.area || null, rooms: o.rooms || null, ts: Date.now() };
      st.flats.push(f); st.active = f.id; save(); return f;
    },
    /* квартира создаётся сама при первом сохранении */
    ensure: function () { return flats.active() || flats.add(); },
    update: function (id, patch) { var f = flats.get(id); if (f) { Object.assign(f, patch); save(); } return f; }
  };
  function rp(id) { id = id || (flats.active() || {}).id; if (!id) return { plan: null, interior: null, rooms: {}, budget: null }; return st.repair[id] || (st.repair[id] = { plan: null, interior: null, rooms: {}, budget: null }); }
  function favOf(id) { id = id || (flats.active() || {}).id; return id ? (st.fav[id] || (st.fav[id] = [])) : []; }
  function cartOf(id) { id = id || (flats.active() || {}).id; return id ? (st.cart[id] || (st.cart[id] = [])) : []; }

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
      : !r.interior ? { text: 'Выберите интерьер — мудборд материалов с ценами', cta: 'В SOVE AI', href: LINK.materials }
      : !r.budget ? { text: 'Посчитайте бюджет ремонта — 2 минуты', cta: 'В Скаут', href: LINK.scout }
      : !buy ? { text: 'Перенесите бюджет в корзину', cta: 'Всё в корзину', href: MY + '#sec-budget' }
      : { text: 'Оформить корзину', cta: 'Оформить', href: MY + '#sec-cart' };
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
  function anchor(kind) { return MY + '#sec-' + ({ plan: 'plan', interior: 'interior', render: 'rooms', budget: 'budget', fav: 'fav', cart: 'cart' }[kind] || 'plan'); }
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
  function flatLine(f) { if (!f) return ''; return [f.jk ? 'ЖК ' + f.jk : '', f.city, f.m2 ? F.area(f.m2) : ''].filter(Boolean).join(' · '); }

  /* ---------- сохранения из SOVE AI и Скаута (таблица п. 3 ТЗ) ----------
     kind: 'plan' {level, img, rooms:[{name,m2}], variant} · 'interior' {capsuleId|null, name, img, dna:[src], productIds}
           'render' {room, src, mine} — без лимита · 'budget' {type:'base'|'premium', area, works, kitMetod, kitRetail, total} */
  function write(kind, data, flatId) {
    var r = rp(flatId), now = Date.now();
    if (kind === 'render') {
      var k = roomKey(data.room), list = r.rooms[k] || (r.rooms[k] = []);
      var item = { id: uid('rnd'), src: data.src, ts: now, mine: !!data.mine, capsuleId: data.capsuleId || (r.interior && r.interior.capsuleId) || null, interiorTs: r.interior ? r.interior.ts : null };
      list.unshift(item); if (!r.rooms[k + ':main']) r.rooms[k + ':main'] = item.id; return item;
    }
    var v = Object.assign({}, data, { ts: now }); r[kind] = v;
    if (kind === 'plan') { var f = flats.get(flatId), m2 = (data.rooms || []).reduce(function (a, x) { return a + (x.m2 || 0); }, 0); if (f && m2 && !f.m2) f.m2 = Math.round(m2 * 10) / 10; if (f && data.jk && !f.jk) f.jk = data.jk; }
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
        else { dst[kind] = src[kind]; src[kind] = cur || null; }
      });
      if (opts.done) opts.done();
    }
    if (cur && !opts.force) ui.confirm({ title: 'Заменить текущий ' + WHAT[kind] + '?', text: 'В «' + f.name + '» уже сохранён ' + WHAT[kind] + ' от ' + F.dateLong(cur.ts) + '. Прежний останется в истории ' + (kind === 'budget' ? 'Скаута' : 'SOVE AI') + '.', ok: 'Заменить', onOk: go });
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
  var cart = {
    has: function (pid) { return cartOf().some(function (r) { return r.productId === Number(pid); }); },
    rows: cartRows, totals: cartTotals,
    add: function (pid, source, quiet) {
      var f = flats.ensure(), list = cartOf(f.id); pid = Number(pid);
      var row = list.filter(function (r) { return r.productId === pid; })[0];
      if (row) row.qty += 1; else list.unshift({ productId: pid, qty: 1, source: SRC[source] ? source : 'market', ts: Date.now() });
      if (!quiet) { save(); cartToast(); }
    },
    addMany: function (ids, source) { var n = 0; flats.ensure(); ids.forEach(function (id) { if (!cart.has(id)) { cart.add(id, source, true); n++; } }); save(); cartToast(); return n; },
    remove: function (pid) { var f = flats.active(); if (!f) return; st.cart[f.id] = cartOf(f.id).filter(function (r) { return r.productId !== Number(pid); }); save(); },
    toggle: function (pid, source) { if (cart.has(pid)) { cart.remove(pid); toast('Убрали из корзины'); return false; } cart.add(pid, source); return true; },
    qty: function (pid, d) { var row = cartOf().filter(function (r) { return r.productId === Number(pid); })[0]; if (!row) return; row.qty = Math.max(1, row.qty + d); save(); },
    /* «Оформить»: корзина квартиры уходит в общую корзину оплаты (my.html?v=basket — оплата через SOVE, заказы по поставщикам) */
    checkout: function () {
      var O = S.orders; if (!O) { location.href = MY + '?v=basket'; return; }
      cartRows().forEach(function (r) { if (!O.basket.has(r.productId)) O.basket.add(r.productId, r.source === 'budget' ? 'budget' : 'catalog', r.qty); });
      location.href = MY + '?v=basket';
    }
  };
  function cartToast() { var t = cartTotals(); toast('В корзине · ' + t.count, { label: 'Оформить', href: anchor('cart') }); }
  /* сердечки Маркета и карточки товара пишут в Избранное текущей квартиры */
  S.favs = { has: fav.has, list: function () { return fav.list(); }, toggle: function (id) { return fav.toggle(id); } };

  /* ---------- общая карточка товара (та же, что в SOVE AI): [фото] Название · где применяется · цена METOD · ♡ · 🛒 ---------- */
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
  function stripOn() { return document.body && document.body.hasAttribute('data-repair-strip'); }
  function renderStrip() {
    if (!stripOn()) return;
    var el = document.getElementById('rp-strip');
    if (!el) { el = document.createElement('nav'); el.id = 'rp-strip'; el.className = 'rp-strip'; el.setAttribute('aria-label', 'Корзина, Избранное и Бюджет квартиры'); document.body.appendChild(el); document.body.classList.add('has-rp-strip'); }
    var t = cartTotals(), fv = favOf().length, b = rp().budget, bp = rp().budgetPlan, onMy = document.body.getAttribute('data-page') === 'my';
    /* одна цифра везде (ТЗ Планировки, 12.5): бюджет «ремонт под ключ» из Планировки; нормы — заглушки, итога нет — «[сумма] ₽» */
    /* раздел 17: полный бюджет куплен — «итого ≈ …»; нет — «мебель ≈ … · весь — узнать ›» (мебель из Планировки) */
    /* мебель — по текущей расстановке Планировки; нет её — из последнего сохранения */
    var furn = null; try { var fl = JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}'); furn = fl.toSave && fl.toSave.furniture; } catch (x) {}
    if (!furn) furn = bp && bp.furniture;
    /* одна цифра «итого» с карточкой «Бюджет квартиры» (методология, П6): сумма известных слоёв */
    var BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers && window.SOVE_FLOW.budgetLayers();
    /* новый план ещё не расставлен — старую сумму не показываем */
    var newPlan = document.body.getAttribute('data-page') === 'plan-demo';
    var bTotal = newPlan ? '' : BL ? '≈ ' + F.rub(BL.total) + ' · ' + BL.known + ' из 4' : bp && bp.full ? '≈ ' + (bp.total === null || bp.total === undefined ? '[сумма] ₽' : F.rub(bp.total))
      : furn ? null : F.rub(b && b.total ? b.total : 0);
    /* полоса ведёт на свои экраны (ТЗ 22.10, п. 0.4 и 5): корзина и бюджет квартиры — виды my.html, избранное — общая страница */
    var h = function (sec) { return { cart: 'my.html?v=basket', fav: 'favorites.html', budget: 'my.html?v=budget' }[sec]; };
    el.innerHTML =
      '<a href="' + h('cart') + '" data-strip="cart">' + CART + '<span><b>Корзина</b><small>' + (t.count ? t.qty + ' · ' + F.rub(t.metod) : 'пока пусто') + '</small></span></a>' +
      '<a href="' + h('fav') + '" data-strip="fav">' + HEART + '<span><b>Избранное</b><small>' + (fv ? fv : 'пока пусто') + '</small></span></a>' +
      '<a href="' + h('budget') + '" data-strip="budget"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg><span><b>Бюджет</b><small>' + (newPlan ? 'после расстановки' : bTotal === null ? 'мебель ≈ ' + F.rub(furn) + ' · весь — узнать ›' : 'итого ' + bTotal) + '</small></span></a>';
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
      var mats = capsuleProducts('k2');
      write('interior', { capsuleId: 'k2', name: c.name, img: c.cover, dna: c.dna, productIds: mats.map(function (p) { return p.id; }) }, f.id);
      [['Кухня-гостиная', '3-kuhnya-gostinaya'], ['Спальня', '2-spalnya'], ['Спальня', '6-spalnya-pravka-komandoy'], ['Санузел', '4-sanuzel'], ['Прихожая', '5-prihozhaya']].forEach(function (x) { write('render', { room: x[0], src: 'assets/img/demo/' + x[1] + '.jpg' }, f.id); });
      var state = D.scout.states.filter(function (s) { return s.id === 'concrete'; })[0], kitMetod = c.pricePerM2 * area, works = state.rate * area;
      write('budget', { type: 'base', area: area, works: works, kitMetod: kitMetod, kitRetail: kitMetod * D.scout.retailMarkup, total: works + kitMetod }, f.id);
      st.fav[f.id] = mats.slice(0, 4).map(function (p) { return p.id; });
      st.cart[f.id] = mats.slice(0, 5).map(function (p, i) { return { productId: p.id, qty: 1, source: i < 3 ? 'budget' : 'moodboard', ts: Date.now() }; });
      flats.add({ name: 'Квартира 2' }); st.active = f.id;
    }
    save();
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} load(); renderStrip(); }

  /* «Сбросить данные прототипа» в меню стирает и «Мой ремонт» */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-reset]'); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (confirm('Стереть все данные прототипа в этом браузере?')) { try { localStorage.removeItem('sove.proto.v1'); localStorage.removeItem(KEY); localStorage.removeItem(XKEY); } catch (x) {} location.href = 'index.html'; }
  }, true);

  S.repair = { LINK: LINK, LEVEL: LEVEL, RANK: RANK, SRC: SRC, flats: flats, flatLine: flatLine, get: rp, level: level, rooms: roomsOf, roomKey: roomKey, rendersCount: rendersCount,
    capsuleProducts: capsuleProducts, roomProducts: roomProducts, progress: progress, budgetStale: budgetStale,
    save: saveTo, saveButton: saveButton, setMainRender: setMainRender, removeRender: removeRender, fav: fav, cart: cart, card: card, price: price, btns: btns, sync: syncButtons,
    toast: toast, renderStrip: renderStrip, registerProduct: registerProduct, seed: seed, reset: reset };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderStrip); else renderStrip();
})();
