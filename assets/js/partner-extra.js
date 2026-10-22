/* Прототип SOVEAPP — дополнения кабинетов по референсам Вики 20.10.2026 (зеркало боевого сайта):
   правки товаров поставщика с проверкой менеджером и публикацией в витрину, роли сотрудников,
   YML-фид (имитация импорта), капсула по комнатам и готовность по комнатам.
   Состояние — только этот браузер (localStorage). Подключается после site.js. */
(function () {
  var S = window.SOVE; if (!S) return;
  var KEY = 'sove.proto.partnerExt.v1';
  function blank() { return { edits: {}, employees: [], feed: null, roomCapsules: {}, asEmployee: null, seq: 1 }; }
  var st;
  function load() { try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function uid(p) { st.seq = (st.seq || 1) + 1; return p + '-' + Date.now().toString(36) + '-' + st.seq; }
  load();

  var STATUS = { in_stock: 'В наличии', under_order: 'Под заказ', none: 'Нет в наличии' };
  var REVIEW = { pending: 'На проверке', approved: 'Опубликовано', rejected: 'Отклонено' };
  var SECTIONS = ['orders', 'goods', 'finance', 'messages', 'promotion', 'admin'];
  var SECTION_LABEL = { orders: 'Заказы', goods: 'Товары и цены', finance: 'Финансы', messages: 'Сообщения', promotion: 'Продвижение', admin: 'Профиль и сотрудники' };
  function money(v) { if (v == null || v === '') return null; var n = Number(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }

  /* ---------- правки товаров → проверка → витрина ---------- */
  var edits = {
    list: function (brand) { return Object.keys(st.edits).map(function (k) { return st.edits[k]; }).filter(function (e) { return !brand || e.brand === brand; }).sort(function (a, b) { return b.submittedAt - a.submittedAt; }); },
    get: function (ref) { return st.edits[ref] || null; },
    submit: function (ref, data) {
      var cur = st.edits[ref] || { ref: ref, published: null, own: /^own:/.test(ref) };
      Object.keys(data).forEach(function (k) { if (data[k] !== undefined) cur[k] = data[k]; });
      cur.priceRetail = money(cur.priceRetail); cur.priceSove = money(cur.priceSove);
      cur.state = 'pending'; cur.note = null; cur.submittedAt = Date.now();
      st.edits[ref] = cur; save(); return cur;
    },
    decide: function (ref, approve, note) {
      var e = st.edits[ref]; if (!e) return null;
      if (approve) { e.published = { name: e.name, priceRetail: e.priceRetail, priceSove: e.priceSove, status: e.status, article: e.article, category: e.category, brand: e.brand, own: !!e.own }; e.state = 'approved'; }
      else { e.published = null; e.state = 'rejected'; }
      e.note = (note || '').trim() || null; e.decidedAt = Date.now(); save(); return e;
    },
    published: function (ref) { var e = st.edits[ref]; return e && e.published ? e.published : null; },
    publishedOwn: function (brand) { return edits.list(brand).filter(function (e) { return e.own && e.published; }); }
  };

  /* ---------- сотрудники и роли ---------- */
  var employees = {
    list: function () { return st.employees.slice(); },
    add: function (phone, label, sections) { var e = { id: uid('emp'), phone: phone, label: label || 'Сотрудник', sections: sections ? sections.slice() : SECTIONS.filter(function (s) { return s !== 'admin'; }), ts: Date.now() }; st.employees.push(e); save(); return e; },
    remove: function (id) { st.employees = st.employees.filter(function (e) { return e.id !== id; }); if (st.asEmployee === id) st.asEmployee = null; save(); },
    setSections: function (id, sections) { st.employees.forEach(function (e) { if (e.id === id) e.sections = SECTIONS.filter(function (s) { return sections.indexOf(s) >= 0; }); }); save(); },
    toggle: function (id, section) { var e = st.employees.filter(function (x) { return x.id === id; })[0]; if (!e) return; var has = e.sections.indexOf(section) >= 0; employees.setSections(id, has ? e.sections.filter(function (s) { return s !== section; }) : e.sections.concat([section])); }
  };
  var access = {
    current: function () { return st.employees.filter(function (e) { return e.id === st.asEmployee; })[0] || null; },
    sections: function () { var e = access.current(); return e ? e.sections : null; },
    can: function (section) { var s = access.sections(); return !s || s.indexOf(section) >= 0; },
    loginAs: function (id) { st.asEmployee = id; save(); },
    logout: function () { st.asEmployee = null; save(); }
  };

  /* ---------- YML-фид (имитация: в прототипе ничего не скачиваем) ---------- */
  var FEED_DEMO = [
    { article: 'F-101', name: 'Керамогранит Terra Sand 60×120', category: 'Отделка', priceRetail: 6200, priceSove: 4800, status: 'in_stock' },
    { article: 'F-102', name: 'Керамогранит Terra Grey 60×60', category: 'Отделка', priceRetail: 4900, priceSove: 3900, status: 'in_stock' },
    { article: 'F-103', name: 'Затирка эпоксидная, 2 кг', category: 'Отделка', priceRetail: 2100, priceSove: 1850, status: 'under_order' }
  ];
  var feed = {
    get: function () { return st.feed; },
    import: function (url, brand) {
      url = String(url || '').trim();
      if (!/^https?:\/\/[^\s/]+/.test(url)) throw new Error('Ссылка должна начинаться с http:// или https://');
      if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)) throw new Error('Фид должен быть на публичном адресе');
      var created = 0, updated = 0, skipped = 0;
      FEED_DEMO.forEach(function (f, i) {
        var ref = 'own:feed-' + f.article, cur = st.edits[ref];
        if (!cur) { created++; edits.submit(ref, Object.assign({ brand: brand, own: true, source: 'yml' }, f)); }
        else if (st.feed && st.feed.url === url) { skipped++; }
        else { updated++; edits.submit(ref, Object.assign({ brand: brand, own: true, source: 'yml' }, f)); }
      });
      st.feed = { url: url, lastRun: Date.now(), lastResult: { total: FEED_DEMO.length, created: created, updated: updated, skipped: skipped } };
      save(); return st.feed;
    }
  };

  /* ---------- комнаты и этапы ---------- */
  var SEC_LABEL = { finish: 'Отделка', plumbing: 'Сантехника', light: 'Свет', furniture: 'Мебель', decor: 'Декор', appliances: 'Техника', doors: 'Двери', other: 'Прочее' };
  var SEC_BY_CAT = { 'Отделка': 'finish', 'Сантехника': 'plumbing', 'Освещение': 'light', 'Мебель': 'furniture', 'Текстиль и декор': 'decor', 'Техника': 'appliances', 'Двери': 'doors' };
  var ROOM_SECTIONS = { hall: ['finish', 'light', 'furniture', 'doors'], kitchen: ['finish', 'furniture', 'appliances', 'plumbing', 'light'], living: ['finish', 'light', 'furniture', 'decor'], studio: ['finish', 'light', 'furniture', 'appliances', 'plumbing', 'decor'], bedroom: ['finish', 'light', 'furniture', 'decor'], bath: ['finish', 'plumbing', 'light'] };
  var ROOM_NAME = { hall: 'Прихожая', kitchen: 'Кухня', living: 'Гостиная', studio: 'Студия', bedroom: 'Спальня', bath: 'Ванная' };
  var ROOM_ALIAS = { hall: ['прихож', 'коридор', 'холл'], kitchen: ['кухн', 'столов'], living: ['гостин', 'зал'], studio: ['студи', 'гостин', 'кухн'], bedroom: ['спальн', 'детск'], bath: ['ванн', 'санузел', 'туалет', 'душ'] };
  var rooms = {
    sectionOf: function (p) { return (p && SEC_BY_CAT[p.category]) || 'other'; },
    sectionLabel: function (k) { return SEC_LABEL[k] || k; },
    defs: function (ob) {
      ob = ob || {}; var n = ob.rooms == null ? null : Number(ob.rooms), baths = Math.max(1, Math.min(4, Number(ob.bathrooms) || 1)), out = [];
      out.push({ key: 'hall', kind: 'hall', name: ROOM_NAME.hall, sections: ROOM_SECTIONS.hall });
      if (n === 0) out.push({ key: 'studio', kind: 'studio', name: ROOM_NAME.studio, sections: ROOM_SECTIONS.studio });
      else {
        out.push({ key: 'kitchen', kind: 'kitchen', name: ROOM_NAME.kitchen, sections: ROOM_SECTIONS.kitchen });
        out.push({ key: 'living', kind: 'living', name: ROOM_NAME.living, sections: ROOM_SECTIONS.living });
        var beds = Math.max(0, Math.min(5, (n == null ? 2 : n) - 1));
        for (var i = 1; i <= beds; i++) out.push({ key: 'bedroom' + i, kind: 'bedroom', name: beds > 1 ? ROOM_NAME.bedroom + ' ' + i : ROOM_NAME.bedroom, sections: ROOM_SECTIONS.bedroom });
      }
      for (var j = 1; j <= baths; j++) out.push({ key: 'bath' + j, kind: 'bath', name: baths > 1 ? ROOM_NAME.bath + ' ' + j : ROOM_NAME.bath, sections: ROOM_SECTIONS.bath });
      return out;
    },
    matches: function (room, itemRoom) { var t = String(itemRoom || '').trim().toLowerCase(); if (!t) return null; if (t === room.key || t === room.name.toLowerCase()) return true; return ROOM_ALIAS[room.kind].some(function (a) { return t.indexOf(a) >= 0; }); },
    plan: function (ob, items) {
      return rooms.defs(ob).map(function (room) {
        var covered = room.sections.filter(function (s) { return items.some(function (it) { return it.section === s && rooms.matches(room, it.room) !== false; }); });
        return Object.assign({}, room, { covered: covered, missing: room.sections.filter(function (s) { return covered.indexOf(s) < 0; }), percent: Math.round(covered.length / room.sections.length * 100), capsule: st.roomCapsules[room.key] || null });
      });
    },
    summary: function (plan) { var total = 0, done = 0; plan.forEach(function (r) { total += r.sections.length; done += r.covered.length; }); return { total: total, done: done, percent: total ? Math.round(done / total * 100) : 0 }; },
    setCapsule: function (key, label) { st.roomCapsules[key] = label; save(); },
    capsules: function () { return st.roomCapsules; }
  };

  S.pext = { STATUS: STATUS, REVIEW: REVIEW, SECTIONS: SECTIONS, SECTION_LABEL: SECTION_LABEL, edits: edits, employees: employees, access: access, feed: feed, rooms: rooms, money: money, reset: function () { st = blank(); save(); } };
})();
/* остатки по складам (экран «Остатки и цены» референса) — {ref: [{id, warehouse, qty, unit}]} */
(function () {
  var S = window.SOVE; if (!S || !S.pext) return;
  var KEY = 'sove.proto.partnerStocks.v1';
  var st; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  S.pext.stocks = {
    list: function (ref) { return (st[ref] || []).slice(); },
    set: function (ref, warehouse, qty, unit) {
      var list = st[ref] || (st[ref] = []), row = list.filter(function (r) { return r.warehouse === warehouse; })[0];
      if (row) { row.qty = qty; row.unit = unit; } else list.push({ id: 'wh-' + Date.now().toString(36), warehouse: warehouse, qty: qty, unit: unit });
      save(); return list;
    },
    remove: function (ref, id) { st[ref] = (st[ref] || []).filter(function (r) { return r.id !== id; }); save(); }
  };
})();
/* три кабинета по типу: этап изготовления и дата замера по проекту (Custom), правила расчёта (Materials) — только этот браузер */
(function () {
  var S = window.SOVE; if (!S || !S.pext) return;
  var KEY = 'sove.proto.partnerTypes.v1';
  function blank() { return { stage: {}, measure: {}, calc: {} }; }
  var st; try { st = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  S.pext.production = {
    stage: function (id) { return st.stage[id] || null; },
    setStage: function (id, stage) { st.stage[id] = stage; save(); },
    measure: function (id) { return st.measure[id] || null; },
    setMeasure: function (id, date) { st.measure[id] = date; save(); }
  };
  var calc = {
    get: function () { return Object.assign({ reserve: 10, packArea: 1.44 }, st.calc); },
    set: function (patch) { Object.keys(patch).forEach(function (k) { st.calc[k] = patch[k]; }); save(); return calc.get(); },
    need: function (area, reserve) { var r = reserve == null ? calc.get().reserve : reserve; return Math.round(area * (1 + r / 100) * 100) / 100; },
    packs: function (need, packArea) { var p = Number(packArea) || calc.get().packArea; return p ? Math.ceil(need / p) : 0; }
  };
  S.pext.calc = calc;
})();
/* зона доставки поставщика (Валерия 20.10): партнёр отмечает в профиле, покупатель видит в карточке товара,
   корзине и заказе с пометкой «доставляет / не доставляет в ваш город». Ключ — бренд (как O.supplierOf). */
(function () {
  var S = window.SOVE; if (!S || !S.pext) return;
  var KEY = 'sove.proto.partnerDelivery.v1';
  var st; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var ZONES = [
    { key: 'moscow', label: 'Москва', short: 'Москва', match: ['москв', 'зеленоград'] },
    { key: 'mo', label: 'Московская область', short: 'МО', match: ['московская обл', 'подмосков', 'химки', 'мытищи', 'одинцов', 'красногорск', 'балашиха', 'люберц', 'подольск', 'королев', 'домодедово', 'реутов', 'видное', 'долгопрудн', 'жуковск', 'пушкино', 'щелково', 'раменск', 'истра', 'сергиев', 'коломн', 'серпухов'] },
    { key: 'spb', label: 'Санкт-Петербург', short: 'СПб', match: ['санкт', 'петербург', 'спб', 'питер'] },
    { key: 'lo', label: 'Ленинградская область', short: 'ЛО', match: ['ленинградская', 'всеволожск', 'гатчин', 'выборг', 'кудрово', 'мурино', 'сертолово', 'тосно', 'кириши'] },
    { key: 'russia', label: 'Регионы России (транспортной компанией)', short: 'регионы ТК', match: [] },
    { key: 'pickup', label: 'Самовывоз', short: 'самовывоз', match: [] }
  ];
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').trim(); }
  function supplierOf(p) { if (!p) return ''; if (p.brand && p.brand !== 'на заказ') return p.brand; var s = p.suppliers && p.suppliers[0]; return s ? s.name : 'Партнёр'; }
  var delivery = {
    ZONES: ZONES,
    supplierOf: supplierOf,
    get: function (brand) { return st[brand] || null; },
    set: function (brand, patch) { var cur = st[brand] || { zones: [], other: '', note: '' }; Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; }); cur.ts = Date.now(); st[brand] = cur; save(); return cur; },
    clear: function (brand) { delete st[brand]; save(); },
    /* город покупателя из объекта «Мой ремонт» (orders.js может быть не подключён на странице) */
    buyerCity: function () { try { var o = JSON.parse(localStorage.getItem('sove.proto.orders.v1') || '{}'); return o.object && o.object.city ? String(o.object.city) : ''; } catch (e) { return ''; } },
    /* короткая подпись: «Москва, МО, Тверь · самовывоз» */
    label: function (brand) {
      var d = st[brand]; if (!d) return '';
      var parts = ZONES.filter(function (z) { return z.key !== 'pickup' && d.zones.indexOf(z.key) >= 0; }).map(function (z) { return z.short; });
      if (d.other) parts.push(d.other);
      var s = parts.join(', '); if (d.zones.indexOf('pickup') >= 0) s += (s ? ' · ' : '') + 'самовывоз';
      return s;
    },
    /* доставляет ли в город: true / false / null (зона не указана или город неизвестен) */
    covers: function (brand, city) {
      var d = st[brand], c = norm(city); if (!d || !c) return null;
      if (d.zones.indexOf('russia') >= 0) return true;
      if (ZONES.some(function (z) { return d.zones.indexOf(z.key) >= 0 && z.match.some(function (m) { return c.indexOf(m) >= 0; }); })) return true;
      if (norm(d.other).split(/[,;]/).some(function (t) { t = t.trim(); return t.length > 2 && (c.indexOf(t) >= 0 || t.indexOf(c) >= 0); })) return true;
      return false;
    },
    /* строка для покупателя с пометкой по его городу */
    line: function (brand, cls) {
      var lbl = delivery.label(brand); if (!lbl) return '';
      var city = delivery.buyerCity(), c = delivery.covers(brand, city), esc = S.fmt.esc;
      return esc(lbl) + (city && c === false ? ' · <b style="color:#a0392a">ваш город ' + esc(city) + ' вне зоны</b>' : city && c ? ' · <b class="green">ваш город ' + esc(city) + ' в зоне</b>' : '');
    },
    badge: function (p) { var l = delivery.line(supplierOf(p)); return l ? '<span class="pc__meta">Доставка: ' + l + '</span>' : ''; }
  };
  S.pext.delivery = delivery;
})();
/* переписка по заказу в кабинете для компьютера (правая колонка «Как с покупателем») — учебная, только этот браузер */
(function () {
  var S = window.SOVE; if (!S || !S.pext) return;
  var KEY = 'sove.proto.partnerChat.v1';
  var st; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var chat = {
    list: function (id) {
      if (!st[id]) { var t = Date.now(); st[id] = [{ who: 'buyer', text: 'Здравствуйте! Подскажите, какая точная дата доставки возможна на этой неделе?', ts: t - 36e5 }, { who: 'me', text: 'Да, доставка возможна. Можем привезти в четверг. Вам подходит?', ts: t - 30e5 }, { who: 'buyer', text: 'Да, отлично! Подтверждайте, пожалуйста.', ts: t - 25e5 }]; save(); }
      return st[id].slice();
    },
    add: function (id, who, text) { var l = chat.list(id); l.push({ who: who, text: text, ts: Date.now() }); st[id] = l; save(); return l; }
  };
  S.pext.chat = chat;
})();
