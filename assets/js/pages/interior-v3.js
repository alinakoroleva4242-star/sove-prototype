/* Блок 2 «Интерьер» — всё капсула (design/interior/TZ-interior.md). Капсула = ДНК + 12 материалов + рендеры комнат.
   Два входа: капсула SOVE из ленты (бесплатно, шаги 2–3 одним нажатием) и своя картинка (разбор бесплатно, доска 25 / 10 🎟).
   Экраны: I1 Вход (?v=1) → I2 Моя капсула · Доска ↔ I3 Комнаты (?v=2&tab=board|rooms) → шторка замены; Мой ремонт — my.html?v=center.
   Повторный вход при сохранённой капсуле — сразу I2/I3 (капсула SOVE → Комнаты, своя картинка → Доска); I1 — через «Другая».
   Паспорт — «Мой ремонт» (repair.js): interior = {type:'capsule'|'own', source, capsuleId, baseCapsuleId, name, imageUrl, dna, style, level,
   scope:'flat'|'room', room, slots, renders[{room, img, example}], accuracy, tokensSpent}. Автосохранение при каждом изменении — кнопки «Сохранить» нет.
   Токены: доска по картинке 25 / 10 (+15 достроить), рендер комнаты и обновление рендера — 5 (цифры ждут подтверждения, ТЗ 15).
   Рендеры комнат — только на основе квартиры (методология, раздел 6, П3): план из Планировки («точно»), рендеры дизайн-проекта
   или типовая планировка по м² и комнатам («примерно»). Нет основы — собираем её прямо во вкладке Комнаты, в паспорте interior.basis.
   Доска, список и шторка замены — из блока Материалы v2 (assets/js/interior/*), не переписаны. Старый экран — pages/materialy-v1.js (не подключён). */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, ui = S.ui, R = S.repair, KB = window.SOVE_KB, UI = window.SOVE_MATUI;
  var root = document.getElementById('mt-root'); if (!root || !KB || !UI) return;

  var PRICE = { flat: 25, room: 10 }, EXTEND = 15, RENDER = 5;
  var IMG = 'assets/img/interior/';
  var LEVEL_T = { base: 'База', premium: 'Премиум', mixed: 'своё сочетание' };
  /* рендеры комнат в прототипе — заглушки по комнатам (в бою — генерация из материалов капсулы) */
  var MOCK = { 'Кухня-гостиная': IMG + 'k2-kitchen.jpg', 'Спальня': IMG + 'k1-bedroom.jpg', 'Санузел': IMG + 'g-bath.jpg', 'Прихожая': 'assets/img/slides/k2-hall-1.jpg' };

  var Q = new URLSearchParams(location.search);
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ── аналитика: события в localStorage['sove.events'], у каждого zk_id, layout_id, flatId ── */
  function track(name, props) {
    var fl = window.SOVE_FLOW ? window.SOVE_FLOW.load() : {}, zk = fl.zk || {}, f = R.flats.active();
    var ev = Object.assign({ name: name, ts: Date.now(), zk_id: zk.id || null, layout_id: zk.layout || null, flatId: f ? f.id : null }, props || {});
    try { var a = JSON.parse(localStorage.getItem('sove.events') || '[]'); a.push(ev); localStorage.setItem('sove.events', JSON.stringify(a.slice(-500))); } catch (e) {}
  }

  /* ── паспорт ── */
  function passport() { var f = R.flats.active(), it = f ? R.get().interior : null; return it && it.slots && (it.type === 'own' || it.type === 'capsule') ? it : null; }
  function planInfo() {
    var f = R.flats.active(), r = f ? R.get() : {}, m2 = r.plan && r.plan.rooms ? r.plan.rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0) : 0;
    if (m2) return { exact: true, area: Math.round(m2 * 10) / 10, rooms: r.plan.rooms };
    return { exact: false, area: f && f.m2 ? f.m2 : KB.AREA, rooms: [] };
  }
  function roomArea(room) {
    var x = planInfo().rooms.filter(function (r) { return String(r.name).toLowerCase() === String(room).toLowerCase(); })[0];
    return x && x.m2 ? x.m2 : null;
  }
  /* сумма слота на площадь: данные ТЗ — на 47 м², иначе пропорционально; комплекты не масштабируем */
  function scaleSlots(slots, area) {
    Object.keys(slots).forEach(function (k) {
      var it = KB.item(slots[k].sku); if (!it) return;
      var fx = it.unit === 'компл.' || area === KB.AREA ? 1 : area / KB.AREA;
      slots[k].sum = fx === 1 ? it.sum : Math.round(it.sum * fx / 100) * 100;
      slots[k].qty = fx === 1 ? it.qty : Math.round(it.qty * fx * 10) / 10;
      slots[k].price = it.price; slots[k].unit = it.unit; slots[k].level = it.level;
    });
    return slots;
  }
  function areaOf(b) { return b.scope === 'room' ? roomArea(b.room) : planInfo().area; }

  /* ── состояние ── */
  var draft = ss('sove.int.draft');       /* картинка загружена, окно охвата */
  var pending = ss('sove.int.pending');   /* токены в резерве, идёт разбор */
  var board = pending ? null : passport();
  var st = { view: Q.get('v') || (board || pending ? '2' : '1'), tab: Q.get('tab') || ss('sove.int.tab') || null, error: null, sel: null, more: false, busy: null, viewer: null };
  if (st.view === '1b') st.view = '1';
  if (st.view === '2' && !board && !pending && !Q.get('capsule')) st.view = '1';
  if (!st.tab) st.tab = board && board.type === 'capsule' ? 'rooms' : 'board';

  function balance() { return S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }
  function upload(html, cls) { return '<label class="' + cls + '">' + html + '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic" hidden data-up></label>'; }
  function sub(b) {
    if (b.type === 'capsule') return 'капсула SOVE · от дизайнера';
    if (b.baseCapsuleId) { var c = KB.capsule(b.baseCapsuleId); return 'своя капсула на основе «' + esc(c ? c.name : '') + '»'; }
    return 'своя капсула · по твоей картинке' + (b.scope === 'room' ? ' · ' + esc(b.room) : '');
  }
  function rooms() { return R.rooms().map(function (r) { return r.name; }); }
  /* на чём собираем комнаты: план квартиры (Планировка) → точно; рендеры дизайн-проекта; типовая планировка по м² → примерно; ничего — спросить */
  function basis() {
    var pl = planInfo(), P = window.SOVE_FLOW && window.SOVE_FLOW.planDoc && window.SOVE_FLOW.planDoc();
    if (pl.exact || P) return { kind: 'plan', exact: true, label: 'НА ТВОЁМ ПЛАНЕ', m2: pl.area };
    if (board && board.basis === 'project') return { kind: 'project', exact: true, label: 'ИЗ ДИЗАЙН-ПРОЕКТА', m2: pl.area };
    if (board && board.basis === 'typical') return { kind: 'typical', exact: false, label: 'ПРИМЕРНО · ТИПОВАЯ ' + String(board.typicalM2 || pl.area).replace('.', ',') + ' М²', m2: board.typicalM2 || pl.area };
    return null;
  }
  function renderLabel(r, bs) {
    if (r.example) return 'ПРИМЕР КАПСУЛЫ';
    if (r.photo) return 'ТВОЯ КАРТИНКА';
    if (r.project) return 'ИЗ ДИЗАЙН-ПРОЕКТА';
    return 'ИЗ ТВОИХ МАТЕРИАЛОВ · ' + (r.basis === 'typical' ? 'ПРИМЕРНО' : bs && bs.kind === 'plan' ? 'НА ТВОЁМ ПЛАНЕ' : 'ПРИМЕРНО');
  }
  function renders() {
    var rs = board.renders || [];
    return rooms().map(function (name) { return rs.filter(function (x) { return x.room === name; })[0] || { room: name, img: null }; });
  }

  /* шапка: «← Назад» · токены · «Интерьер» · 3 сегмента, «шаг 2 из 3» (Планировка ✓ · Интерьер · Работы) */
  function head() {
    var rt = encodeURIComponent('interior.html' + location.search);
    return '<header class="pz-head"><div class="pz-head__top"><button type="button" class="pz-back" data-pz-back>← Назад</button>' +
      '<a class="pz-tok" href="tokens.html?returnTo=' + rt + '">' + esc(F.tokens(balance())) + ' 🎁</a></div>' +
      '<h1 class="pz-head__t">Интерьер</h1>' +
      '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="2"><span class="pz-bar__i is-done"></span><span class="pz-bar__i is-now"></span><span class="pz-bar__i"></span><small>шаг 2 из 3</small></div></header>';
  }

  /* ════════ I1 · Вход (эталон etalon-I1): герой-капсула целиком, «Выбрать капсулу — бесплатно», лента, «или своя картинка» ════════ */
  var HERO = 'k2';
  /* предметы Маркета для пилюль на рендере: мебель капсулы из каталога прототипа (цены METOD — из данных) */
  function capsuleItems(capId) {
    return S.data.products.filter(function (p) { return p.img && (p.capsules || []).indexOf(capId) >= 0 && p.category === 'Мебель'; }).slice(0, 2);
  }
  function itemPill(p, x, y, cls) {
    return '<a class="' + cls + ' is-item" href="product.html?id=' + p.id + '" style="left:' + x + '%;top:' + y + '%"><i></i><span>' + esc(p.name.split(/[:,]/)[0]) + '</span><b>' + F.num(p.metod) + '</b></a>';
  }
  function view1() {
    var c = KB.capsule(HERO), slots = KB.fromCapsule(HERO, 'premium'), mine = R.flats.list().filter(function (f) { var it = R.get(f.id).interior; return it && it.slots; }).length;
    var fl = KB.item(slots.floor.sku), ap = KB.item(slots.apron.sku), items = capsuleItems(HERO);
    var pill = function (it, slot, x, y) { return '<span class="hc__pill" style="left:' + x + '%;top:' + y + '%"><i></i><span>' + esc(KB.slot(slot).name + ' · ' + it.name.split(',')[0].toLowerCase().split(' ').slice(-1)[0]) + '</span><b>' + F.num(it.price) + '/' + it.unit + '</b></span>'; };
    var TILES = [['floor', 46, 69, -3], ['walls', 40, 51, 2], ['apron', 44, 47, -2], ['floorTile', 40, 43, 3], ['doors', 30, 65, 0], ['light', 34, 37, 0], ['plumbing', 28, 43, 4]];
    return head() + '<div class="mt-body">' +
      '<div class="mt-hero"><h2 class="mt-h2">Твоя квартира в готовом интерьере</h2><p class="mt-sub">капсула = комнаты, материалы с ценами и ДНК, вокруг которой всё сочетается. Поменять можно что угодно</p></div>' +
      '<div class="hc"><img class="hc__img" src="' + IMG + 'k2-kitchen.jpg" alt="Капсула: кухня-гостиная">' +
        '<span class="hc__lbl">ПРИМЕР · КАПСУЛА «' + esc(c.name.toUpperCase()) + '»</span>' +
        pill(fl, 'floor', 24, 42) + pill(ap, 'apron', 62, 24) + (items[0] ? itemPill(items[0], 80, 12, 'hc__pill') : '') +
        '<div class="hc__b"><div class="hc__b-h"><small>ДНК + 12 МАТЕРИАЛОВ + КОМНАТЫ</small><span class="hc__dots">' + c.dna.map(function (x) { return '<i style="background:' + x.hex + '"></i>'; }).join('') + '</span></div>' +
          '<div class="hc__row">' + TILES.map(function (t) { var it = KB.item(slots[t[0]].sku); return UI.sampleTile(it, t[1], t[2], { thickness: 3, rot: t[3], radius: 3 }); }).join('') +
            '<span class="hc__rooms"><span>' + ['k1-bedroom', 'g-bath', 'g-hall'].map(function (n) { return '<i style="background-image:url(' + IMG + n + '.jpg)"></i>'; }).join('') + '</span><small>+ ' + (c.rooms.length - 1) + ' ' + UI.roomsWord(c.rooms.length - 1) + '</small></span></div>' +
          '<div class="hc__f"><small>материалы База / Премиум · всё сочетается · цены из Маркета</small><button type="button" class="mt-a" data-capsule="' + HERO + '">смотреть ›</button></div></div></div>' +
      '<button type="button" class="mt-btn mt-btn--56" data-capsule="' + HERO + '">Выбрать капсулу — бесплатно</button>' +
      '<div class="cc-strip cc-strip--s">' + KB.CAPSULES.map(UI.capsuleCard).join('') + '</div>' +
      '<div class="mt-or"><span></span><small>ИЛИ СВОЯ КАРТИНКА</small><span></span></div>' +
      upload('<span class="up__ic">⇪</span><span class="up__t"><b>Загрузить рендер, фото или Pinterest</b><small>разберём ДНК и соберём такую же капсулу из твоей картинки · от ' + PRICE.room + ' 🎟</small></span><span class="up__a">›</span>', 'up up--line') +
      '<small class="mt-cap">у тебя ' + balance() + ' 🎟' + (S.auth.isIn() ? '' : ' в подарок') + (mine ? ' · <a class="mt-a" href="interior.html?v=2">мои капсулы · ' + mine + ' ›</a>' : '') + '</small>' +
      '</div>';
  }

  /* ════════ I2 / I3 · Моя капсула ════════ */
  function skeleton() {
    var p = pending || {};
    return head() + '<div class="mt-body">' +
      '<div class="mt-top">' + (p.img ? '<span class="mt-top__pic" style="background-image:url(' + p.img + ')"></span>' : '<span class="mt-top__pic mt-sk"></span>') +
        '<span class="mt-top__t"><i class="mt-sk mt-sk--line"></i><i class="mt-sk mt-sk--line mt-sk--short"></i></span></div>' +
      '<div class="dna dna--26">' + [0, 1, 2, 3, 4, 5, 6].map(function () { return '<span><i class="mt-sk"></i></span>'; }).join('') + '</div>' +
      '<div class="mb mb--sk" style="height:400px"><b class="mt-load">Разбираем ДНК… подбираем материалы</b></div></div>';
  }
  function errorView() {
    return head() + '<div class="mt-body"><section class="mt-err">' + (st.error.img ? '<img src="' + esc(st.error.img) + '" alt="">' : '') +
      '<b>Не видим интерьер на картинке — попробуй другую</b><small>токены не списаны</small>' + upload('⇪ Загрузить другую', 'mt-btn') +
      '<a class="mt-a" href="interior.html?v=1">или выбрать капсулу SOVE ›</a></section></div>';
  }
  function top(b) {
    return '<div class="mt-top"><span class="mt-top__pic" style="background-image:url(' + esc(b.imageUrl || '') + ')">' + (b.imageUrl ? '' : UI.dnaBar(b.dna)) + '</span>' +
      '<span class="mt-top__t"><b>' + esc(cap(b.name || b.style)) + '</b><small>' + sub(b) + '</small></span><a class="mt-top__a" href="interior.html?v=1">Другая</a></div>' + UI.capsuleTabs(st.tab);
  }
  function view2() {
    if (st.error) return errorView();
    if (!board) return skeleton();
    return head() + '<div class="mt-body">' + top(board) + (st.tab === 'rooms' ? roomsTab(board) : boardTab(board)) + '</div>';
  }
  function boardTab(b) {
    var isCap = b.type === 'capsule', room = b.scope === 'room', area = areaOf(b), perUnit = room && !area, exact = room ? false : planInfo().exact;
    var lv = KB.levelOf(b.slots), bad = KB.SLOTS.filter(function (s) { return b.slots[s.key].ok === false; });
    return UI.materialsBoard(b.slots, b.dna, { style: b.name || b.style, selected: st.sel, level: lv }) +
      UI.dnaCard(b.dna) +
      UI.levelSwitch(lv, { exact: exact, sum: perUnit ? null : KB.sum(b.slots) }) +
      (bad.length ? '<button type="button" class="mt-stat is-bad" data-goto="' + bad[0].key + '">! ' + bad.length + ' ' + plural(bad.length, 'материал выбивается', 'материала выбиваются', 'материалов выбиваются') + ' из ДНК — посмотреть</button>'
        : '<div class="mt-stat"><span>' + (isCap ? '✓ проверено дизайнером' : '✓ все 12 материалов сочетаются') + '</span><small>сохранено</small></div>') +
      '<small class="mt-cap">нажми на образец — заменить · список 12 материалов ниже</small>' +
      UI.specList(b.slots, b.dna, { compact: !st.more, quiet: true, title: isCap ? 'Материалы дизайнера' : 'Материалы', exact: exact, area: area, levelName: LEVEL_T[lv], room: room ? b.room : null, perUnit: perUnit }) +
      (room ? '<button type="button" class="mt-more" data-extend>Достроить всю квартиру · +' + EXTEND + ' 🎟 ›</button>' : '') +
      '<button type="button" class="mt-btn2" data-cart-all>🛒 Всё в корзину</button><a class="mt-btn" href="scout.html?from=interior" data-next>Дальше: стоимость работ →</a>';
  }
  function roomsTab(b) {
    var rs = renders(), main = rs.filter(function (r) { return r.img; })[0], bs = basis(), f = R.flats.active();
    var BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers && window.SOVE_FLOW.budgetLayers();
    var decor = BL ? BL.parts.filter(function (x) { return x.key === 'decor'; })[0] : null;
    var m2 = f && f.m2 ? f.m2 : KB.AREA, items = capsuleItems(b.capsuleId || b.baseCapsuleId || KB.nearestCapsule(b.dna).id);
    /* основы нет — короткий шаг на месте: план из Планировки, рендеры дизайн-проекта или типовая квартира по м² */
    var planCard = bs ? '' : '<section class="pb" id="pb"><b class="pb__t">Комнаты твоей квартиры — нужен план</b>' +
      '<small>рендер собираем на твоей планировке: где окна, двери, кухня и санузел. Иначе получится чужая комната в твоих материалах</small>' +
      '<div class="pb__opts"><a class="pb__o" href="plan-demo.html?from=interior"><b>⇪ План квартиры</b><small>застройщика или обмерный → Планировка · бесплатно · точно</small></a>' +
      '<label class="pb__o"><input type="file" accept="image/*,application/pdf" multiple hidden data-up-project><b>⇪ Дизайн-проект</b><small>рендеры и чертежи — комнаты возьмём из проекта</small></label>' +
      '<button type="button" class="pb__o" data-typical><b>Примерно · типовая квартира ' + String(m2).replace('.', ',') + ' м²</b><small>по ' + rooms().length + ' ' + UI.roomsWord(rooms().length) + ' · уточним, когда будет план</small></button></div></section>';
    var grid = rs.map(function (r) { return r.room === st.busy ? { room: r.room, img: null, busy: true } : r; });
    /* предметы из Маркета на рендере — зелёные пилюли, замена ведёт в карточку товара */
    var itemPills = items.map(function (p, i) { return itemPill(p, i ? 16 : 44, i ? 50 : 58, 'rh-pill'); }).join('');
    return (st.busy === '__main' ? '<div class="rh rh--sk"><b class="mt-load">Собираем рендер…</b></div>'
        : main ? UI.renderHotspots(main, b.slots, b.dna, { label: renderLabel(main, bs), changed: !!b.changed && !main.example && !main.project, price: RENDER, extra: itemPills })
        : '<div class="rh rh--empty"><b>Рендеров пока нет</b><small>' + (bs ? 'выбери комнату ниже — соберём рендер из твоих материалов' : 'сначала основа квартиры — ниже') + '</small></div>') +
      '<div class="rh-leg"><span><i></i>материалы · меняются на доске</span><span><i class="is-item"></i>предметы · из Маркета</span></div>' +
      (bs ? '<small class="mt-cap">нажми на что угодно на картинке — заменишь, рендер обновится · ' + RENDER + ' 🎟' + (bs.kind === 'typical' ? ' · комнаты примерные, с планом станут точными' : '') + '</small>' : '') +
      planCard +
      UI.roomsGrid(grid, { price: RENDER, locked: !bs, redo: !!bs }) +
      '<a class="bc" href="my.html?v=center"><small class="bc__t">В БЮДЖЕТ КВАРТИРЫ · ИЗ ЭТОЙ КАПСУЛЫ</small>' +
        '<span><span>Материалы · 12</span><b>' + (b.scope === 'room' && !areaOf(b) ? 'одна комната' : '≈ ' + F.rub(KB.sum(b.slots))) + '</b></span>' +
        '<span><span>Декор и текстиль · подобрано под комнаты</span><b>' + (decor && decor.known ? '≈ ' + F.rub(decor.value) : 'после рендеров') + '</b></span>' +
        '<span><span>Предметы, заменённые на рендере</span><b>в строку «Мебель»</b></span>' +
        '<small class="bc__ok">✓ в Моём ремонте · обновляется при каждой замене</small></a>' +
      '<button type="button" class="mt-btn2" data-pdf>↓ Скачать капсулу PDF</button>' +
      '<a class="mt-btn" href="scout.html?from=interior" data-next>Дальше: стоимость работ →</a>';
  }

  function render() {
    root.innerHTML = st.view === '2' ? view2() : view1();
    document.body.classList.toggle('int-rooms', st.view === '2' && st.tab === 'rooms');
  }
  function go2(tab) {
    st.view = '2'; if (tab) st.tab = tab; ss('sove.int.tab', st.tab);
    history.replaceState(null, '', 'interior.html?v=2&tab=' + st.tab); render(); window.scrollTo(0, 0);
  }

  /* ── шторки: окно охвата, замена, просмотр комнат ── */
  function sheet(cls, label, html) {
    var back = document.createElement('div'); back.className = 'mt-back';
    back.innerHTML = '<div class="mt-sheet ' + cls + '" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    back.close = function () { back.remove(); document.body.style.overflow = ''; };
    back.addEventListener('click', function (e) { if (e.target === back) back.close(); });
    return back;
  }

  /* окно охвата «Для чего собираем?» (эталон etalon-scope) */
  function openScope() {
    var back = sheet('ss', 'Для чего собираем?', '');
    function paint() { back.firstChild.innerHTML = UI.scopeSheet({ img: draft.img, dna: KB.DNA, room: draft.room, scope: draft.scope, balance: balance(), prices: PRICE }); }
    back.addEventListener('change', function (e) { var r = e.target.closest('[data-scope]'); if (!r) return; draft.scope = r.value; ss('sove.int.draft', draft); paint(); });
    back.addEventListener('click', function (e) { if (e.target.closest('[data-build]')) { back.close(); startBuild(); } });
    paint();
  }

  /* ── своя картинка: сжимаем до 1000 px → окно охвата (разбор бесплатный, после выбора охвата) ── */
  function readFile(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        var source = /pinterest/i.test(file.name) ? 'pinterest' : /render|рендер/i.test(file.name) ? 'render' : 'photo';
        track('int_upload', { source: source });
        draft = { img: c.toDataURL('image/jpeg', .82), source: source, room: KB.guessRoom(), scope: 'flat' }; ss('sove.int.draft', draft);
        openScope();
      };
      im.onerror = function () { st.error = { img: '' }; st.view = '2'; render(); };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  /* «Собрать доску» — это и есть списание: резерв → разбор → списано; ошибка — возврат */
  function startBuild() {
    var cost = PRICE[draft.scope];
    if (!S.auth.isIn()) { location.href = 'auth.html?returnTo=' + encodeURIComponent('interior.html?v=1b'); return; }
    var op = S.tokens.reserve(cost, 'Доска капсулы · ' + (draft.scope === 'flat' ? 'вся квартира' : draft.room), 'interior');
    if (!op) { ui.toast('Не хватает токенов'); return; }
    track('int_scope', { scope: draft.scope, tokens: cost });
    pending = Object.assign({}, draft, { op: op, cost: cost, t0: Date.now() }); ss('sove.int.pending', pending); ss('sove.int.draft', null); draft = null;
    board = null; st.error = null; st.tab = 'board'; go2(); analyze();
  }
  function analyze() {
    var p = pending; if (!p) return;
    KB.analyzeInterior(p.img).then(function (a) {
      S.tokens.commit(p.op);
      var room = p.scope === 'room', area = room ? roomArea(p.room) : planInfo().area;
      var slots = KB.complete(a.dna, a.found, a.level || 'premium'); if (area) scaleSlots(slots, area);
      board = { type: 'own', source: p.source, imageUrl: p.img, dna: a.dna, style: a.style, name: cap(a.style), scope: p.scope, room: room ? p.room : null, slots: slots,
        renders: [{ room: cap(p.room), img: p.img, photo: true }], accuracy: room ? '≈' : planInfo().exact ? 'точно' : '≈', tokensSpent: p.cost, boardGeneratedAt: Date.now() };
      persist(); pending = null; ss('sove.int.pending', null);
      track('int_board_ready', { ms: Date.now() - p.t0 }); render();
    }).catch(function () {
      S.tokens.refund(p.op, 'не видим интерьер на картинке');
      st.error = { img: p.img }; pending = null; ss('sove.int.pending', null); render();
    });
  }

  /* ── капсула SOVE: копия в паспорт, 0 🎟, 12 материалов дизайнера, типовые рендеры комнат с меткой «пример» ── */
  function pickCapsule(id) {
    var c = KB.capsule(id); if (!c) return;
    var level = c.full ? 'premium' : 'base', slots = KB.fromCapsule(id, level); scaleSlots(slots, planInfo().area);
    board = { type: 'capsule', source: 'capsule', capsuleId: id, name: c.name, imageUrl: c.cover, dna: c.dna, style: c.style, scope: 'flat', room: null, slots: slots,
      renders: c.rooms.map(function (r) { return { room: r.room, img: r.img, example: true }; }), accuracy: planInfo().exact ? 'точно' : '≈', tokensSpent: 0, boardGeneratedAt: Date.now() };
    persist(); track('int_capsule_pick', { capsule: id }); st.more = false; go2('rooms');   /* капсула SOVE открывается на Комнатах, своя картинка — на Доске */
  }
  /* любое изменение капсулы SOVE делает её своей: «своя капсула на основе …», дальше работают правила */
  function makeOwn() {
    if (board.type !== 'capsule') return;
    board.type = 'own'; board.baseCapsuleId = board.capsuleId; board.imageUrl = board.imageUrl || null;
    track('int_capsule_own', { base: board.capsuleId });
  }
  /* автосохранение: паспорт квартиры; бюджет «Материалы» = сумма слотов только при scope 'flat' */
  function persist() {
    board.level = KB.levelOf(board.slots); board.materialsSum = KB.sum(board.slots); board.ts = Date.now();
    board.img = board.imageUrl; board.productIds = KB.SLOTS.map(function (s) { return UI.product(KB.item(board.slots[s.key].sku)).id; });
    var f = R.flats.ensure(), r = R.get(f.id); r.interior = board; R.flats.update(f.id, {});
  }

  /* ── шторка замены (одна и та же из Доски и Комнат) ── */
  function openSwap(slot) {
    track('int_swap_open', { slot: slot, tab: st.tab });
    st.sel = slot; render();
    /* доска сверху гаснет, выбранный образец — поверх затемнения в кольце (эталон etalon-swap) */
    var mb = root.querySelector('.mb'), tile = root.querySelector('.mb-tile[data-slot="' + slot + '"]');
    if (mb) { var y = mb.getBoundingClientRect().top + window.scrollY, ty = tile ? tile.getBoundingClientRect().top + window.scrollY : y; window.scrollTo(0, Math.min(y - 8, Math.max(y - 8, ty - 40))); }
    document.body.classList.add('int-swap'); if (tile) tile.classList.add('is-top');
    var back = sheet('sw', 'Замена материала', ''); back.classList.add('mt-back--sw');
    var exact = board.scope === 'room' ? false : planInfo().exact;
    back.firstChild.innerHTML = '<i class="ss-grip"></i>' + UI.swapSheet(slot, { slots: board.slots, dna: board.dna, exact: exact });
    var close0 = back.close; back.close = function () { close0(); document.body.classList.remove('int-swap'); st.sel = null; render(); };
    back.addEventListener('click', function (e) {
      if (e.target.closest('[data-sw-close]')) return back.close();
      if (e.target.closest('[data-market]')) { track('int_market_open', { slot: slot }); return; }
      var b = e.target.closest('[data-pick]'); if (!b) return;
      var sku = b.getAttribute('data-pick'); if (board.slots[slot].sku === sku) return back.close();
      var t = swapTo(slot, sku); back.close(); swapToast(t);
    });
  }
  function swapTo(slot, sku) {
    var prev = JSON.parse(JSON.stringify({ slots: board.slots, type: board.type, baseCapsuleId: board.baseCapsuleId || null, changed: !!board.changed })), sum0 = KB.sum(board.slots), it = KB.item(sku), area = areaOf(board);
    makeOwn();
    board.slots[slot] = KB.slotEntry(it, 'user', null);
    if (area) scaleSlots(board.slots, area);
    KB.recheck(board.slots, board.dna); board.changed = true; persist();
    var e = board.slots[slot], d = KB.sum(board.slots) - sum0;
    track('int_swap_done', { slot: slot, level: it.level, ok: e.ok });
    var name = it.name.charAt(0).toLowerCase() + it.name.slice(1);
    return { prev: prev, text: KB.slot(slot).name + ': ' + name + ' · ' + (e.ok ? '✓ сочетается' : '! ' + e.reason) + (area ? ' · итого ' + (d < 0 ? '−' : '+') + F.rub(Math.abs(d)) : '') };
  }
  /* тост 4 с с «Отменить» — возвращает образец, строку, сумму, паспорт и статус капсулы */
  function swapToast(t) {
    var old = document.querySelector('.mt-toast'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'mt-toast'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>' + esc(t.text) + '</span><button type="button">Отменить</button>';
    el.querySelector('button').addEventListener('click', function () {
      board.slots = t.prev.slots; board.type = t.prev.type; board.baseCapsuleId = t.prev.baseCapsuleId || undefined; board.changed = t.prev.changed;
      if (board.type === 'capsule') delete board.baseCapsuleId;
      persist(); track('int_undo', {}); el.remove(); render();
    });
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 4000);
    render();
  }

  /* ── рендер комнаты · 5 🎟: списание, 2 с, заглушка; сохраняем и в комнаты квартиры (декор в бюджете — после рендеров) ── */
  function makeRender(room, rerender) {
    var bs = basis();
    if (!bs) { var pb = root.querySelector('#pb'); if (pb) pb.scrollIntoView({ block: 'center', behavior: 'smooth' }); ui.toast('Сначала основа квартиры — план, проект или типовая'); return; }
    if (!S.auth.isIn()) { location.href = 'auth.html?returnTo=' + encodeURIComponent('interior.html?v=2&tab=rooms'); return; }
    var op = S.tokens.reserve(RENDER, (rerender ? 'Обновить рендер · ' : 'Рендер комнаты · ') + room, 'interior'); if (!op) { ui.toast('Не хватает токенов'); return; }
    st.busy = rerender ? '__main' : room; render();
    setTimeout(function () {
      S.tokens.commit(op);
      var src = MOCK[room] || IMG + 'k2-kitchen.jpg', rs = board.renders = (board.renders || []).filter(function (r) { return r.room !== room; });
      rs.push({ room: room, img: src, tokens: RENDER, basis: bs.kind }); if (rerender) board.changed = false;
      board.accuracy = bs.exact ? 'точно' : '≈';
      board.tokensSpent = (board.tokensSpent || 0) + RENDER; persist();
      R.save('render', { room: room, src: src, mine: true }, { silent: true });
      track(rerender ? 'int_rerender' : 'int_render', { room: room, tokens: RENDER }); st.busy = null; render();
    }, 2000);
  }
  /* дизайн-проект: рендеры картинками становятся комнатами капсулы (метка «из дизайн-проекта»); PDF — разбор следующим шагом (ТЗ 13.7) */
  function readProject(files) {
    var imgs = [].filter.call(files, function (f) { return /^image\//.test(f.type); }), pdf = files.length - imgs.length;
    if (pdf) ui.toast('Разбор PDF дизайн-проекта — следующий шаг; пока загрузи рендеры картинками');
    if (!imgs.length) return;
    var free = renders().filter(function (r) { return !r.img || r.photo; }).map(function (r) { return r.room; }), done = 0;
    imgs.slice(0, free.length || 1).forEach(function (file, i) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          var room = free[i] || rooms()[0], src = c.toDataURL('image/jpeg', .82);
          board.renders = (board.renders || []).filter(function (r) { return r.room !== room; }); board.renders.push({ room: room, img: src, project: true, basis: 'project' });
          board.basis = 'project'; board.accuracy = 'точно';
          R.save('render', { room: room, src: src, mine: true }, { silent: true });
          if (++done === Math.min(imgs.length, free.length || 1)) { persist(); track('int_project_upload', { n: done }); render(); ui.toast('Комнаты из дизайн-проекта · ' + done, 'ok'); }
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  /* просмотр комнат во весь экран, свайп между готовыми */
  function openViewer(i) {
    var rs = renders().filter(function (r) { return r.img; });
    var back = document.createElement('div'); back.className = 'vw';
    back.innerHTML = '<button type="button" class="vw__x" aria-label="Закрыть">✕</button><div class="vw__track">' + rs.map(function (r) {
      return '<figure><img src="' + esc(r.img) + '" alt="' + esc(r.room) + '"><figcaption>' + esc(r.room) + (r.example ? ' · пример капсулы' : '') + '</figcaption></figure>'; }).join('') + '</div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var tr = back.querySelector('.vw__track'); tr.scrollLeft = tr.clientWidth * i;
    back.querySelector('.vw__x').addEventListener('click', function () { back.remove(); document.body.style.overflow = ''; });
  }
  /* «↓ Скачать капсулу PDF»: ДНК, доска, 12 материалов, комнаты; брендинг только в полях, на картинках ничего */
  function pdf() {
    var b = board, rs = renders().filter(function (r) { return r.img; }), abs = function (u) { return /^(data:|https?:)/.test(u) ? u : location.href.replace(/[^/]*$/, '') + u; };
    var w = window.open('', '_blank'); if (!w) { ui.toast('Разреши всплывающие окна — откроем PDF'); return; }
    w.document.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + esc(b.name) + ' — капсула SOVE</title><style>body{font:12px/1.4 Montserrat,Arial,sans-serif;color:#1E1C1A;margin:28px}h1{font:600 28px "Cormorant Garamond",Georgia,serif;margin:0 0 4px}.s{color:#6B655F;margin:0 0 14px}.dna{display:flex;gap:4px;margin:0 0 16px}.dna i{flex:1;height:28px;border-radius:6px}table{width:100%;border-collapse:collapse;margin:0 0 18px}td{padding:6px 0;border-top:1px solid #E6E1DA}td:last-child{text-align:right;white-space:nowrap}.r{display:grid;grid-template-columns:1fr 1fr;gap:8px}.r img{width:100%;height:150px;object-fit:cover;border-radius:8px}.f{margin-top:18px;font-size:10px;color:#6B655F}</style></head><body>' +
      '<h1>' + esc(b.name) + '</h1><p class="s">капсула SOVE App · ' + sub(b) + '</p>' +
      '<div class="dna">' + b.dna.map(function (c) { return '<i style="background:' + c.hex + '" title="' + esc(c.name) + '"></i>'; }).join('') + '</div>' +
      '<table>' + KB.SLOTS.map(function (s) { var e = b.slots[s.key], it = KB.item(e.sku); return '<tr><td>' + esc(s.name) + '</td><td>' + esc(it.name) + '</td><td>' + F.rub(e.sum) + '</td></tr>'; }).join('') +
      '<tr><td colspan="2"><b>Материалы · ' + LEVEL_T[KB.levelOf(b.slots)] + '</b></td><td><b>≈ ' + F.rub(KB.sum(b.slots)) + '</b></td></tr></table>' +
      '<div class="r">' + rs.map(function (r) { return '<figure style="margin:0"><img src="' + esc(abs(r.img)) + '" alt=""><figcaption>' + esc(r.room) + '</figcaption></figure>'; }).join('') + '</div>' +
      '<p class="f">SOVE App · платформа выгодного ремонта · ' + new Date().toLocaleDateString('ru-RU') + '</p></body></html>');
    w.document.close(); setTimeout(function () { w.print(); }, 600); track('int_pdf', {});
  }

  /* ── события ── */
  root.addEventListener('change', function (e) {
    var pr = e.target.closest('[data-up-project]'); if (pr && pr.files && pr.files.length) { readProject(pr.files); pr.value = ''; return; }
    var inp = e.target.closest('[data-up]'); if (inp && inp.files && inp.files[0]) { readFile(inp.files[0]); inp.value = ''; }
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-capsule')) return pickCapsule(b.getAttribute('data-capsule'));
    if (b.hasAttribute('data-tab')) return go2(b.getAttribute('data-tab'));
    var tile = b.closest('.mb-tile'); if (tile) return openSwap(tile.getAttribute('data-slot'));
    if (b.hasAttribute('data-swap')) return openSwap(b.getAttribute('data-swap'));
    if (b.hasAttribute('data-sp-more')) { st.more = true; return render(); }
    if (b.hasAttribute('data-goto')) { st.more = true; render(); var row = root.querySelector('[data-row="' + b.getAttribute('data-goto') + '"]'); if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (b.hasAttribute('data-level')) {
      var lv = b.getAttribute('data-level'); if (lv === 'mixed') return;
      var mb = root.querySelector('.mb'); if (mb) mb.classList.add('is-flip');
      setTimeout(function () {
        var isCap = board.type === 'capsule', cid = board.capsuleId || board.baseCapsuleId;
        KB.SLOTS.forEach(function (s) {
          var cur = board.slots[s.key], sku = cid ? KB.capsuleSku(cid, s.key, lv) : KB.mainFor(s.key, lv).sku;
          board.slots[s.key] = KB.slotEntry(KB.item(sku), isCap ? 'capsule' : cur.source === 'user' ? 'sove' : cur.source, cur.confidence);
        });
        var area = areaOf(board); if (area) scaleSlots(board.slots, area);
        if (!isCap) KB.recheck(board.slots, board.dna);
        board.changed = true; persist(); track('int_level', { level: lv }); render();
        var m2 = root.querySelector('.mb'); if (m2) { m2.classList.add('is-flip-in'); setTimeout(function () { m2.classList.remove('is-flip-in'); }, 150); }
      }, 150);
      return;
    }
    if (b.hasAttribute('data-cart-all')) {
      var ids = KB.SLOTS.map(function (s) { return UI.product(KB.item(board.slots[s.key].sku)).id; });
      R.cart.addMany(ids, 'materials'); track('int_cart_all', { level: KB.levelOf(board.slots), sum: KB.sum(board.slots) }); return;
    }
    if (b.hasAttribute('data-next')) { track('int_next', {}); return; }
    if (b.hasAttribute('data-extend')) {
      if (!S.auth.isIn()) { location.href = 'auth.html?returnTo=' + encodeURIComponent('interior.html?v=2'); return; }
      var op = S.tokens.reserve(EXTEND, 'Доска капсулы · достроить квартиру', 'interior'); if (!op) { ui.toast('Не хватает токенов'); return; }
      S.tokens.commit(op); board.scope = 'flat'; board.room = null; board.tokensSpent = (board.tokensSpent || 0) + EXTEND;
      scaleSlots(board.slots, planInfo().area); persist(); track('int_scope', { scope: 'flat', tokens: EXTEND, extend: true }); return render();
    }
    if (b.hasAttribute('data-typical')) {
      var f0 = R.flats.active(); board.basis = 'typical'; board.typicalM2 = f0 && f0.m2 ? f0.m2 : KB.AREA; board.accuracy = '≈'; persist();
      track('int_basis', { basis: 'typical', m2: board.typicalM2 }); render(); ui.toast('Комнаты соберём по типовой квартире · с планом станут точными'); return;
    }
    var rd = e.target.closest('[data-render]'); if (rd) return makeRender(rd.getAttribute('data-render'), false);   /* «на моём плане» лежит внутри плитки просмотра */
    if (b.hasAttribute('data-rerender')) return makeRender(b.getAttribute('data-rerender'), true);
    if (b.hasAttribute('data-view')) return openViewer(+b.getAttribute('data-view'));
    if (b.hasAttribute('data-pdf')) return pdf();
  });

  /* вход по ссылке: ?capsule=k2 — сразу капсула SOVE; ?flat= — открыть капсулу другой квартиры */
  if (Q.get('flat') && R.flats.get(Q.get('flat'))) { R.flats.setActive(Q.get('flat')); board = passport(); }
  track('int_open', { entry: Q.get('from') || (document.referrer ? document.referrer.split('/').pop().split('?')[0] : 'direct'), view: st.view });
  if (Q.get('capsule') && KB.capsule(Q.get('capsule'))) { pickCapsule(Q.get('capsule')); if (Q.get('tab') === 'rooms') go2('rooms'); }
  else { render(); if (st.view === '2' && pending && !board) analyze(); if (Q.get('v') === '1b' && draft) openScope(); }
})();
