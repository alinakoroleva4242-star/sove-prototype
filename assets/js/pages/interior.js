/* Блок «Интерьер» — всё капсула (design/interior/TZ-interior.md, финальная структура 25.10). Капсула = ДНК + 12 материалов + рендеры комнат.
   ДВА СОСТОЯНИЯ, не шаги: A · пусто (?v=a) → всплывашка «Твоя квартира» → B · готово (?v=b — вся квартира, ?v=b&room=kitchen — комната).
   В B (design/interior/TZ-interior-final.md, эталоны etalon-final-1…5) — две плитки «Материалы / Визуализации» (st.mode, ?view=), чипов комнат нет:
   комнаты добавляются «＋» (под ДНК и под плитками), визуализации — по кнопке «✦ Сгенерировать», чистые, под каждой «На этой визуализации» с заменами.
   Замены — постоянная возможность внутри B, три уровня: 1 весь интерьер («⇄ Сменить»), 2 материал (шторка замены), 3 предмет (шторка предметов).
   Связь доска ↔ комнаты — поле rooms[] у слота (kb/finish-slots.js): чипы зон фильтруют мудборд и список, замена материала помечает устаревшими
   рендеры только тех комнат, где он применён; рендер сам не перегенерируется — «! обновить · +5 токенов».
   Повторный вход при сохранённой капсуле — сразу B, «Вся квартира». Автосохранение; кнопки «Сохранить» нет.
   Суммы материалов — одна функция R.materialsSum(room) (repair.js), та же в Моём ремонте.
   Цены — SOVE_AI_CONFIG.INTERIOR_PRICES (одна строка на действие); каждое списание — событие int_charge {action, tokens, flatId}.
   Прежние версии экрана — pages/interior-v3.js (I1–I3), pages/materialy-v1.js; не подключены. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, ui = S.ui, R = S.repair, KB = window.SOVE_KB, UI = window.SOVE_MATUI;
  var root = document.getElementById('mt-root'); if (!root || !KB || !UI) return;
  if (R.planZones) R.planZones();   /* реестр комнат плана (KB.UNITS) — до чтения паспорта */

  var P = Object.assign({ capsule: 0, ownFlat: 25, ownRoom: 10, extend: 15, render: 5, angle: 5, materialSwap: 1, objectSwap: 1, rerender: 5, level: 1, changeCapsule: 0 },
    (window.SOVE_AI_CONFIG && window.SOVE_AI_CONFIG.INTERIOR_PRICES) || {});
  /* финал (TZ-interior-final, 6): комнаты и визуализации — SOVE_AI_CONFIG.GEN_PRICES */
  (function (G) { G = G || {}; ['roomMaterials', 'roomRender', 'angle', 'rerender'].forEach(function (k) { if (typeof G[k] === 'number') P[k] = G[k]; }); if (P.roomMaterials == null) P.roomMaterials = 5; if (P.roomRender == null) P.roomRender = 5; })(window.SOVE_AI_CONFIG && window.SOVE_AI_CONFIG.GEN_PRICES);
  var TOK = UI.fmtTokens; P.capsulePaid = (window.SOVE_AI_CONFIG && window.SOVE_AI_CONFIG.GEN_PRICES && window.SOVE_AI_CONFIG.GEN_PRICES.capsulePaid) || 10;
  var IMG = 'assets/img/interior/', SW = IMG + 'sw/';
  var MOCK = { kitchenLiving: IMG + 'k2-kitchen.jpg', bedroom: IMG + 'k1-bedroom.jpg', bathroom: IMG + 'g-bath.jpg', hall: IMG + 'g-hall.jpg' };
  var OBJ_SHORT = { 'Обеденный стол': 'Стол', 'Кровать': 'Кровать', 'Раковина': 'Раковина', 'Гардероб': 'Шкаф' };

  /* старые адреса блока: ?v=1 → a, ?v=2 → b, tab=board → materials */
  var Q = new URLSearchParams(location.search);
  var V0 = { '1': 'a', '1b': 'a', '2': 'b' }[Q.get('v')] || Q.get('v'), TAB0 = { board: 'materials' }[Q.get('tab')] || Q.get('tab');
  /* комната из адреса: room=kitchen (или ключ зоны); старые zone= и tab=materials|rooms тоже понимаем */
  /* экран B: view=materials | visuals (TZ-interior-final, 6); старые tab=materials → materials, tab=rooms → visuals; room= не используем */
  var MODE0 = Q.get('view') === 'visuals' || TAB0 === 'rooms' ? 'visuals' : 'materials';
  var FROM_BUDGET = Q.get('from') === 'budget', FROM_MY = Q.get('from') === 'my';   /* назад — в Бюджет (my.html?v=budget) или в Мой ремонт */
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ── аналитика: localStorage['sove.events'], у каждого события zk_id, layout_id, flatId ── */
  function track(name, props) {
    var fl = window.SOVE_FLOW ? window.SOVE_FLOW.load() : {}, zk = fl.zk || {}, f = R.flats.active();
    var ev = Object.assign({ name: name, ts: Date.now(), zk_id: zk.id || null, layout_id: zk.layout || null, flatId: f ? f.id : null }, props || {});
    try { var a = JSON.parse(localStorage.getItem('sove.events') || '[]'); a.push(ev); localStorage.setItem('sove.events', JSON.stringify(a.slice(-500))); } catch (e) {}
  }
  function balance() { return S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens; }
  /* списание: 0 — только событие; > 0 — вход, резерв, (commit сразу или после работы), событие int_charge. Возвращает id операции или null */
  function charge(action, cost, label, later) {
    R.flats.ensure();   /* у каждого списания — flatId */
    if (!cost) { track('int_charge', { action: action, tokens: 0 }); return 'free'; }
    if (!S.auth.isIn()) { location.href = 'auth.html?returnTo=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); return null; }
    var op = S.tokens.reserve(cost, label, 'interior');
    if (!op) { R.toast('Не хватает токенов · нужно ' + F.tokens(cost), { label: 'Пополнить', href: 'tokens.html?returnTo=' + encodeURIComponent('interior.html' + location.search) }); return null; }
    if (!later) S.tokens.commit(op);
    track('int_charge', { action: action, tokens: cost });
    return op;
  }
  function refund(op, why) { if (op && op !== 'free') { S.tokens.refund(op, why); track('int_refund', { op: op }); } }

  /* ── квартира: зоны и площади (план → точно; иначе м² квартиры или 47 м² примера — примерно) ── */
  function planInfo() { return R.planZones(); }
  function allZones() { return R.planZones().zones; }
  function boardZones() { return board.scope === 'flat' ? allZones() : board.zones.slice(); }
  /* «Спальня · 13,2 м²» — площадь из плана; без плана — только название */
  function roomLabel(z) { var pl = planInfo(), a = pl.exact && pl.zoneArea[z]; return KB.zone(z).name + (a ? ' · ' + String(Math.round(a * 10) / 10).replace('.', ',') + ' м²' : ''); }
  function zoneName(z) { return z === 'flat' ? 'вся квартира' : KB.zone(z).name.toLowerCase(); }
  /* суммы — одна функция на Интерьер и Мой ремонт (repair.js, materialsSum): строка слота в зоне и подытог зоны / всей квартиры */
  function zoneSum(key, zone) { return R.materialsSum(zone, { board: board, slot: key }); }
  function zoneTotal(zone) { return R.materialsSum(zone, { board: board }); }
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
  function snapshot() { var o = {}; KB.SLOTS.forEach(function (s) { o[s.key] = board.slots[s.key].sku; }); return o; }

  /* ── паспорт ── */
  function normalize(b) {
    if (!b || !b.slots) return null;
    if (b.scope !== 'flat' && b.scope !== 'rooms') { b.zones = b.scope === 'room' && b.room ? [KB.zoneOf(b.room)] : null; b.scope = b.zones ? 'rooms' : 'flat'; }
    if (!b.zones) b.zones = [];
    b.basis = { typical: 'none', plan: 'plan' }[b.basis] || b.basis || (planInfo().exact ? 'plan' : 'none');
    var snap = {}; KB.SLOTS.forEach(function (s) { snap[s.key] = b.slots[s.key].sku; });
    b.renders = (b.renders || []).filter(function (r) { return r.img; }).map(function (r) {
      var z = r.zone || KB.zoneOf(r.room); return Object.assign({}, r, { zone: z, room: KB.zone(z).name, angle: r.angle || 0, skus: r.skus || snap });
    });
    b.objects = b.objects || {}; b.objectDelta = b.objectDelta || 0;
    return b;
  }
  function passport() { var f = R.flats.active(), it = f ? R.get().interior : null; return it && it.slots && (it.type === 'own' || it.type === 'capsule') ? normalize(it) : null; }
  function persist() {
    board.level = KB.levelOf(board.slots); board.ts = Date.now(); board.img = board.imageUrl;
    board.materialsSum = zoneTotal('flat'); board.rooms = boardZones().map(function (z) { return KB.zone(z).name; });
    board.productIds = KB.SLOTS.map(function (s) { return UI.product(KB.item(board.slots[s.key].sku)).id; });
    var f = R.flats.ensure(), r = R.get(f.id); r.interior = board; R.flats.update(f.id, {});
  }

  /* ── состояние ── */
  var pending = ss('sove.int.pending');
  var board = pending ? null : passport();
  var st = { view: V0 || (board || pending ? 'b' : 'a'), mode: MODE0, zf: null, pins: {}, open: {}, vmore: {}, angleOf: {}, pick: null, angles: 1, hl: Q.get('hl'), sel: null, busy: null, gen: {}, error: null };
  if (st.view === 'b' && !board && !pending) st.view = 'a';

  /* ── рендеры ── */
  function rendersOf(zone) { return board.renders.filter(function (r) { return r.zone === zone; }).sort(function (a, b) { return a.angle - b.angle; }); }
  function staleSlots(r) {
    if (!r || !r.skus) return [];
    return KB.slotsFor([r.zone]).filter(function (s) { return r.skus[s.key] !== board.slots[s.key].sku; }).map(function (s) { return UI.slotShort(s.key).toLowerCase(); })
      .concat(r.objStale ? [r.objStale.toLowerCase()] : []);
  }
  /* «пол заменён на доске» · «стол заменён на рендере» · «пол и стол заменены» */
  function staleText(r) {
    if (!r || !r.skus) return '';
    var m = KB.slotsFor([r.zone]).filter(function (s) { return r.skus[s.key] !== board.slots[s.key].sku; }).map(function (s) { return UI.slotShort(s.key).toLowerCase(); });
    var parts = [];
    if (m.length) parts.push(m.join(', ') + (m.length > 1 ? ' заменены' : ' заменён'));
    if (r.objStale) parts.push(r.objStale.toLowerCase() + ' заменён');
    return parts.join(', ');
  }
  function isStale(r) { return staleSlots(r).length > 0; }
  function firstRenderZone() { var zs = boardZones(); return zs.filter(function (z) { return rendersOf(z).length; })[0] || zs[0]; }
  /* комната для шторок рендера: та, у которой открыли замену (st.vz), иначе первая с визуализацией */
  function mainZone() { return st.vz || firstRenderZone(); }
  /* предметы Маркета на рендере: по одному виду на зону, товары — из каталога расстановки (боевые цены) */
  function objectsOf(zone) {
    var C = window.SOVE_ARRANGE_CATALOG || {}, sp = UI.ROOM_SPOTS[KB.zoneType(zone)] || {};
    return (sp.obj || []).map(function (o) {
      var list = C[o[0]] || []; if (!list.length) return null;
      var cur = list.filter(function (p) { return p.id === board.objects[o[0]]; })[0] || list[0];
      return { kind: o[0], short: OBJ_SHORT[o[0]] || o[0], product: cur, options: list };
    }).filter(Boolean);
  }
  function placeOf(kind) {
    var A = window.SOVE_ARRANGE; if (!A) return null;
    var f = (A.furniture || []).filter(function (x) { return x.label === kind; })[0]; if (!f || !A.px_per_m) return null;
    return [Math.round((f.box[2] - f.box[0]) / A.px_per_m * 100), Math.round((f.box[3] - f.box[1]) / A.px_per_m * 100)];
  }

  /* ── шапка ── */
  function head() {
    var back = FROM_BUDGET ? '<a class="pz-back" href="my.html?v=budget">← Бюджет</a>' : FROM_MY ? '<a class="pz-back" href="my.html?v=center">← Мой ремонт</a>' : '<a class="pz-back" href="sove-ai.html">← SOVE AI</a>';
    return '<header class="pz-head int-head"><div class="pz-head__top">' + back +
      '<a class="pz-tok" href="tokens.html?returnTo=' + encodeURIComponent('interior.html' + location.search) + '">' + esc(F.tokens(balance())) + '</a></div>' +
      '<h1 class="pz-head__t">Интерьер</h1></header>';
  }

  /* ════════ A · Пусто (эталон etalon-A0) ════════ */
  var HERO_TILES = [['marble', 0, 6, 64, 104, -2], ['walnut', 56, 22, 52, 92, 2], ['brass', 114, 10, 30, 76, 0], ['mesh', 150, 20, 40, 96, 1],
    ['taupe', 196, 46, 54, 54, 3], ['cer', 256, 30, 56, 50, -1], ['velvet', 318, 44, 40, 40, 2]];
  function viewA() {
    var c = KB.capsule('k2'), mine = R.flats.list().filter(function (f) { var it = R.get(f.id).interior; return it && it.slots; }).length;
    var floor = KB.item(c.slots.floor.premium);
    return head() + '<div class="mt-body mt-body--14">' +
      '<div class="mt-hero"><h2 class="mt-h2">Материалы и визуализации твоей квартиры</h2><p class="mt-sub">выбери капсулу или загрузи свой рендер — получишь мудборд материалов с ценами и комнаты в своей планировке</p></div>' +
      '<div class="ah"><img class="ah__img" src="' + IMG + 'k2-kitchen.jpg" alt="Кухня-гостиная в капсуле «' + esc(c.name) + '»">' +
        '<span class="hc__lbl">ТАК БУДЕТ ВЫГЛЯДЕТЬ РЕЗУЛЬТАТ</span>' +
        '<span class="hc__pill" style="left:62%;top:110px"><i></i><span>Фартук · зеллиж</span><b>⇄</b></span>' +
        '<span class="hc__pill" style="left:24%;top:215px"><i></i><span>Пол · орех</span><b>' + F.num(floor.price) + '/' + floor.unit + '</b></span>' +
        '<div class="ah__b"><div class="hc__b-h"><small>МУДБОРД · 12 МАТЕРИАЛОВ · ДНК</small><span class="hc__dots">' + KB.DNA.map(function (x) { return '<i style="background:' + x.hex + '"></i>'; }).join('') + '</span></div>' +
          '<div class="ah__row">' + HERO_TILES.map(function (t) { return '<span style="left:' + t[1] + 'px;top:' + t[2] + 'px">' + UI.sampleTile({ photo: SW + t[0] + '.jpg' }, t[3], t[4], { thickness: 3, rot: t[5], radius: 3 }) + '</span>'; }).join('') + '</div>' +
          '<small class="ah__cap">реальные образцы с ценами · База / Премиум · любой можно заменить, и рендер обновится</small></div></div>' +
      '<div class="mt-row"><small class="mt-cap-l">КАПСУЛЫ SOVE · ' + (S.metod.active() ? 'БЕСПЛАТНО С METOD' : TOK(P.capsulePaid).toUpperCase() + ' · С METOD БЕСПЛАТНО') + '</small><a class="mt-a" href="capsules.html">все ' + KB.CAPSULES.length + ' ›</a></div>' +
      UI.capsuleStrip(KB.CAPSULES) +
      '<label class="up up--line"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic" hidden data-up><span class="up__ic">⇪</span>' +
        '<span class="up__t"><b>Или свой рендер, фото, Pinterest</b><small>разберём ДНК и соберём материалы · от ' + F.tokens(P.ownRoom) + '</small></span><span class="up__a">›</span></label>' +
      '<small class="mt-cap">≈ 10 минут · у тебя ' + F.tokens(balance()) + (mine ? ' · <a class="mt-a" href="interior.html?v=b">мои капсулы · ' + mine + ' ›</a>' : '') + '</small>' +
      '</div>';
  }

  /* ════════ B · Готово (TZ-interior-final: две плитки «Материалы / Визуализации», комнаты добавляются «＋») ════════ */
  function capHead() {
    var b = board, zs = boardZones(), pl = planInfo();
    var sub = (b.type === 'capsule' ? 'капсула SOVE' : 'своя капсула') + ' · ' + String(pl.area).replace('.', ',') + ' м²';   /* коротко, в одну строку (чистка 26.10) */
    var nR = zs.filter(function (z) { return rendersOf(z).length; }).length, nS = KB.slotsFor(zs).length, cover = (zs.map(function (z) { return rendersOf(z)[0]; }).filter(Boolean)[0] || {}).img || MOCK[zs[0]] || IMG + 'k2-kitchen.jpg';
    /* картинка плитки «Материалы» — живая доска (образцы выбранных материалов), «Визуализации» до генерации — обещание ✦ */
    var tile = function (m, img, t, small) {
      var pic = m === 'materials' ? '<span class="it__pic it__pic--board">' + KB.slotsFor(zs).slice(0, 4).map(function (s, i) { return UI.sampleTile(KB.item(b.slots[s.key].sku), [38, 30, 24, 34][i], [70, 62, 48, 40][i], { thickness: 3, rot: [-3, 2, 0, 3][i] }); }).join('') + '</span>'
        : img ? '<span class="it__pic" style="background-image:url(' + esc(img) + ')"></span>' : '<span class="it__pic it__pic--promo"><i>✦</i></span>';
      return '<button type="button" class="it' + (st.mode === m ? ' is-on' : '') + '" data-mode="' + m + '" aria-pressed="' + (st.mode === m) + '">' + pic + '<span class="it__t"><b>' + t + '</b><small>' + small + '</small></span></button>';
    };
    return '<div class="ch"><span class="ch__pic" style="background-image:url(' + esc(b.imageUrl || '') + ')"></span>' +
      '<span class="ch__t"><b class="ch__n">' + esc(b.name || b.style) + '</b><small>' + sub + '</small></span><button type="button" class="ch__x" data-change>Сменить</button></div>' +
      '<div class="its">' + tile('materials', SW + 'marble.jpg', 'Материалы', zs.length + ' ' + UI.roomsWord(zs.length) + ' · ' + nS + ' ' + plural(nS, 'образец', 'образца', 'образцов')) +
        tile('visuals', nR ? cover : '', 'Визуализации', nR ? nR + ' ' + UI.roomsWord(nR) + ' · в твоих материалах' : 'ещё не сгенерированы') + '</div>';
  }
  /* зоны плана, ещё не добавленные в работу */
  function todoZones() { var bz = boardZones(); return board.scope === 'rooms' ? allZones().filter(function (z) { return bz.indexOf(z) < 0; }) : []; }
  function viewB() {
    if (st.error) return head() + '<div class="mt-body"><section class="mt-err">' + (st.error.img ? '<img src="' + esc(st.error.img) + '" alt="">' : '') +
      '<b>Не видим интерьер на картинке — попробуй другую</b><small>токены не списаны</small><a class="mt-btn" href="interior.html?v=a">Выбрать капсулу или другую картинку</a></section></div>';
    if (!board) return head() + '<div class="mt-body"><div class="ch"><span class="ch__pic mt-sk"' + (pending && pending.img ? ' style="background-image:url(' + pending.img + ')"' : '') + '></span><span class="ch__t"><i class="mt-sk mt-sk--line"></i><i class="mt-sk mt-sk--line mt-sk--short"></i></span></div>' +
      '<div class="mb mb--b mb--sk"><b class="mt-load">Разбираем ДНК… собираем мудборд</b></div></div>';
    return head() + '<div class="mt-body">' + capHead() + (st.mode === 'visuals' ? visualsView() : materialsView()) + '</div>';
  }

  /* блок «＋ комната» (экраны 3–5): по 2 пунктирные в ряд и тёмная «＋ Вся квартира»; все добавлены — блок скрыт */
  /* зоны одной тонкой строкой, как на первых пробах (Алина 26.10): добавленные — тёмные пилюли, недобавленные — пунктир «＋ Санузел · +5 токенов»,
     в конце «＋ Вся квартира». Строка переносится — вбок не едет */
  function addBlock(title, per, sub, filter) {
    var todo = todoZones(), zs = boardZones(); if (!todo.length && !filter) return '';
    var pill = function (key, name) { var on = filter ? st.zf === key : true; return filter ? '<button type="button" class="zr__z is-in' + (on ? ' is-on' : '') + '" data-zf="' + key + '" aria-pressed="' + on + '">' + esc(name) + '</button>' : '<span class="zr__z is-on">' + esc(name) + '</span>'; };
    return '<div class="zr" role="group" aria-label="' + esc(title) + '">' +
      zs.map(function (z) { return pill(z, roomLabel(z)); }).join('') +
      todo.map(function (z) { return '<button type="button" class="zr__z" data-add="' + z + '">＋ ' + esc(roomLabel(z)) + ' <small>' + TOK(per) + '</small></button>'; }).join('') +
      (todo.length > 1 ? '<button type="button" class="zr__z zr__z--all" data-add="all" title="' + esc(sub) + '">＋ Вся квартира <small>' + TOK(per * todo.length) + '</small></button>' : '') + '</div>';
  }
  /* ── Экран 3 · Материалы: доска всех добавленных комнат · ДНК · «＋» · список по комнатам ── */
  function materialsView() {
    /* тап по зоне в строке под ДНК фильтрует доску и список: st.zf — 'all' или зона (Алина 26.10) */
    /* каждая доска — одна комната; переключатель комнат сразу под доской (Алина 26.10) */
    var b = board, all = boardZones(); if (all.indexOf(st.zf) < 0) st.zf = all[0];
    var zs = [st.zf], keys = KB.slotsFor(zs);
    var label = roomLabel(st.zf) + ' · ' + keys.length + ' ' + matWord(keys.length);
    var seen = {};
    var lists = zs.map(function (z) {
      var list = KB.slotsFor([z]), open = !!st.open[z] || (st.hl && list.some(function (s) { return s.key === st.hl; }));
      var rows = (open ? list : list.slice(0, 3)).map(function (s) {
        var e = b.slots[s.key], it = KB.item(e.sku), shared = seen[s.key];
        var word = (it.name.split(',')[0] || '').toLowerCase();
        /* строка материала: тап — замена; справа ⇄ заменить · ♡ · 🛒 (Алина 26.10: «напротив сердечко, корзина и все с заменами») */
        return '<div class="rl__r' + (st.hl === s.key ? ' is-hl' : '') + (e.ok === false ? ' is-bad' : '') + '" data-row="' + s.key + '"><button type="button" class="rl__m" data-swap="' + s.key + '" data-from="list">' + UI.sampleTile(it, 40, 40, { thickness: 3, radius: 6 }) +
          '<span><b>' + esc(UI.slotShort(s.key) + ' · ' + word) + '</b><small>' + (shared ? 'общий с ' + shared : esc(UI.unitPrice(it))) + '</small></span></button>' +
          '<span class="rl__a"><button type="button" class="rl__x" data-swap="' + s.key + '" data-from="list" aria-label="Заменить">⇄</button>' + R.btns(UI.product(it), 'materials') + '</span></div>';
      }).join('');
      list.forEach(function (s) { if (!seen[s.key]) seen[s.key] = { kitchenLiving: 'кухней', bedroom: 'спальней', bathroom: 'санузлом', hall: 'прихожей' }[KB.zoneType(z)]; });
      return '<section class="rl"><button type="button" class="rl__h" data-open="' + z + '" aria-expanded="' + open + '"><b>' + esc(roomLabel(z)) + '</b><small>' + list.length + ' ' + matWord(list.length) + (list.length > 3 ? (open ? ' · свернуть' : ' · ещё ›') : '') + '</small></button>' + rows + '</section>';
    }).join('');
    /* База / Премиум — только в шторке замены (Алина 26.10); тонкая подсказка на доске — всегда */
    var loading = st.loadZ === st.zf;
    return (loading ? '<div class="mb-load"><small class="mb-load__t">Собираем материалы · ' + esc(KB.zone(st.zf).name) + '…</small>' : '') +
      UI.moodboard(b.slots, b.dna, { zones: zs, label: label, selected: st.sel, height: 400, corner: loading ? '' : '<button type="button" class="mb__dl" data-dl-board="' + st.zf + '" aria-label="Скачать мудборд комнаты с материалами" title="Скачать мудборд"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg></button><small class="mb__hint"><span class="mb__hint--hover">наведи на образец — заменить</span><span class="mb__hint--tap">тап по образцу — заменить</span></small>' }) + (loading ? '</div>' : '') +
      addBlock('Комнаты', P.roomMaterials, 'та же ДНК · бюджет станет полным', true) +
      '<div class="dnb">' + b.dna.map(function (c) { return '<i style="background:' + c.hex + '" title="' + esc(c.name) + '"></i>'; }).join('') + '</div>' + lists +
      /* под материалами — «Сохранить в бюджет» (Алина 26.10); сохранено — «✓ В Бюджете · открыть ›»; корзина — тихой строкой */
      '<div class="ma">' + (board.budgetTs ? '<a class="mt-btn2 ma__ok" href="my.html?v=budget">✓ Материалы в Бюджете · открыть ›</a>' : '<button type="button" class="mt-btn" data-to-budget>Сохранить в бюджет · ' + keys.length + ' ' + matWord(keys.length) + '</button>') +
        '<button type="button" class="ma__cart" data-cart-all>🛒 Все материалы в корзину</button></div>' + setBtn();
  }
  /* ── Экраны 4–5 · Визуализации: до генерации — выбор комнат и ракурсов; после — чистые визуализации и «На этой визуализации» ── */
  /* «Здесь будет …»: одна отмеченная комната — её имя, ни одной или несколько — «твоя квартира» (Алина 26.10) */
  var YOUR = { kitchenLiving: 'твоя кухня', bedroom: 'твоя спальня', bathroom: 'твой санузел', hall: 'твоя прихожая' };
  /* Визуализации облегчены (Алина 26.10, «тяжеловато»): одна комната за раз — переключатель пилюлями под картинкой, как в Материалах;
     под картинкой одна полоса «ракурсы · ✦ ещё · ♡ в Мой ремонт · ↓»; подсказки нет; «На этой визуализации» — 3 позиции и «все N ›»;
     «обновить» — метка на углу картинки; экран до генерации — компактный, «Сгенерировать» на первом экране */
  function visualsView() {
    var zs = boardZones(), done = zs.filter(function (z) { return rendersOf(z).length || st.gen[z]; });
    if (!st.pick) st.pick = zs.slice();
    st.pick = st.pick.filter(function (z) { return zs.indexOf(z) >= 0; });
    /* новые комнаты — «＋» в той же строке пилюль (Алина 26.10), отдельного блока «Ещё комнаты» нет */
    if (!done.length) return preGen(zs);
    if (zs.indexOf(st.vcur) < 0) st.vcur = done[0];
    return vizRoom(st.vcur, zs, done) + designerCard();
  }
  /* «＋ Санузел · +10 токенов» и «＋ Вся квартира» — недобавленные комнаты (материалы + визуализация) */
  function plusPills() {
    var todo = todoZones(), per = P.roomMaterials + P.roomRender; if (!todo.length) return '';
    return todo.map(function (z) { return '<button type="button" class="zr__z" data-add="' + z + '">＋ ' + esc(roomLabel(z)) + ' <small>' + TOK(per) + '</small></button>'; }).join('') +
      (todo.length > 1 ? '<button type="button" class="zr__z zr__z--all" data-add="all">＋ Вся квартира <small>' + TOK(per * todo.length) + '</small></button>' : '');
  }
  /* пилюли комнат под картинкой: готовые — переключают, устаревшие — с точкой, несгенерированные — «✦ Спальня +5 токенов» */
  function vizPills(zs, done, cur) {
    if (zs.length < 2 && !todoZones().length) return '';
    return '<div class="zr">' + zs.map(function (z) {
      var isDone = done.indexOf(z) >= 0, bad = rendersOf(z).some(isStale);
      return isDone ? '<button type="button" class="zr__z is-in' + (z === cur ? ' is-on' : '') + '" data-vcur="' + z + '" aria-pressed="' + (z === cur) + '">' + esc(KB.zone(z).name) + (bad ? '<i class="zr__dot" aria-label="нужно обновить"></i>' : '') + '</button>'
        : '<button type="button" class="zr__z" data-gen-one="' + z + '">✦ ' + esc(KB.zone(z).name) + ' <small>' + TOK(P.roomRender) + '</small></button>';
    }).join('') + plusPills() + '</div>';
  }
  /* кадр комнаты из галереи капсулы (или типовой) — для примера до генерации и проявки */
  function capsuleImg(z) { var c = KB.capsule(board.capsuleId || board.baseCapsuleId || KB.nearestCapsule(board.dna).id), rm = c && c.rooms.filter(function (x) { return x.zone === KB.zoneType(z); })[0]; return rm ? rm.img : MOCK[KB.zoneType(z)]; }
  function fan(z, n) {
    return '<span class="fan">' + KB.slotsFor([z]).slice(0, n || 3).map(function (s) { return UI.sampleTile(KB.item(board.slots[s.key].sku), 30, 30, { thickness: 2, radius: 4 }); }).join('') + '</span>';
  }
  /* до генерации — компактно: обещание 150 px · комнаты пилюлями с галочкой · ракурсы · «✦ Сгенерировать» */
  function preGen(zs) {
    var pick = st.pick, a = st.angles, cost = pick.length * a * P.roomRender, z0 = pick[0] || zs[0];
    var promo = KB.slotsFor([z0]).slice(0, 3).map(function (s, i) { var p = [[14, 18, 44, 100, -2], [48, 30, 38, 92, 2], [20, 112, 30, 30, 0]][i]; return '<span style="left:' + p[0] + 'px;top:' + p[1] + 'px">' + UI.sampleTile(KB.item(board.slots[s.key].sku), p[2], p[3], { thickness: 3, rot: p[4] }) + '</span>'; }).join('');
    /* справа — не пустая рамка, а пример визуализации комнаты из капсулы с подписью (Алина 26.10: «вставь картинку, опять непонятно») */
    return '<div class="vp vp--s">' + promo + '<i class="vp__star">✦</i><span class="vp__ex" style="background-image:url(' + esc(capsuleImg(z0)) + ')"><small class="vp__exl">пример</small>' +
      '<span class="vp__ext"><b>Здесь будет ' + esc(pick.length === 1 ? (YOUR[KB.zoneType(z0)] || 'твоя комната') : 'твоя квартира') + '</b><small>из этих материалов · в ' + a + ' ' + plural(a, 'ракурсе', 'ракурсах', 'ракурсах') + '</small></span></span></div>' +
      /* что делать — одной строкой и главная кнопка сразу под примером (Алина 26.10: «и что мне делать?») */
      '<button type="button" class="vg" data-gen' + (pick.length ? '' : ' disabled') + '><i>✦</i><span><b>Сгенерировать</b><small>' + pick.length + ' ' + UI.roomsWord(pick.length) + ' × ' + a + ' ' + plural(a, 'ракурс', 'ракурса', 'ракурсов') + '</small></span><b>' + TOK(cost) + '</b></button>' +
      '<small class="mt-cap">отметь комнаты и число ракурсов ниже · ≈ 2 минуты · спишем только за готовые · у тебя ' + F.tokens(balance()) + '</small>' +
      (zs.length > 1 || todoZones().length ? '<div class="zr">' + zs.map(function (z) {
        var on = pick.indexOf(z) >= 0;
        return '<button type="button" class="zr__z is-in' + (on ? ' is-on' : '') + '" data-pick-room="' + z + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + esc(roomLabel(z)) + '</button>';
      }).join('') + plusPills() + '</div>' : '') +
      '<div class="va"><small class="ad__l">РАКУРСОВ НА КОМНАТУ</small><div class="va__seg" role="group" aria-label="Ракурсов на комнату">' + [1, 2, 3].map(function (n) {
        return '<button type="button" data-angles="' + n + '" aria-pressed="' + (a === n) + '"><b>' + n + '</b><small>' + TOK(n * P.roomRender) + '</small></button>';
      }).join('') + '</div></div>' +
      '';
  }
  var DL_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
  var MY_IC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6"/></svg>';   /* значок вкладки «Мой ремонт» */
  var HEART_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  /* одна комната: имя и ракурс · чистая картинка (метка «обновить» на углу) · пилюли комнат · полоса ракурсов и действий · позиции */
  function vizRoom(z, zs, done) {
    var rs = rendersOf(z), n = rs.length, cur = Math.min(st.angleOf[z] || 0, Math.max(0, n - 1)), r = rs[cur];
    if (!r) return '<div class="vz"><div class="vz__h"><b>' + esc(KB.zone(z).name) + '</b><small>собираем…</small></div>' + devImg(z) + vizPills(zs, done, z) + '</div>';
    var busy = st.busy === z || st.busy === '__main' && st.vz === z, stale = isStale(r);
    var mats = KB.slotsFor([z]).map(function (s) { return { kind: 'mat', s: s }; }), objs = objectsOf(z).map(function (o) { return { kind: 'obj', o: o }; });
    var items = mats.slice(0, 2).concat(objs, mats.slice(2)), open = !!st.vmore[z], shown = open ? items : items.slice(0, 3);
    return '<div class="vz"><div class="vz__h"><b>' + esc(KB.zone(z).name) + '</b><small>ракурс ' + (cur + 1) + ' из ' + n + '</small></div>' +
      (busy ? devImg(z, r.img) : '<div class="vz__wrap"><button type="button" class="vz__img" data-view="' + z + '" aria-label="Открыть на весь экран"><img src="' + esc(r.img) + '" alt="' + esc(KB.zone(z).name) + '"></button>' +
        (st.pins[z] ? pins(z) : '') + (stale ? '<button type="button" class="vz__tag" data-rerender="' + z + '">! ' + esc(staleText(r)) + ' · обновить ' + TOK(P.rerender) + '</button>' : '') +
        '<button type="button" class="vz__pinbtn' + (st.pins[z] ? ' is-on' : '') + '" data-pins="' + z + '" aria-pressed="' + !!st.pins[z] + '">' + (st.pins[z] ? '✕ Скрыть' : '⇄ Заменить на фото') + '</button>' +
        /* сохранить в Мой ремонт и скачать — два тихих круга в правом верхнем углу картинки (Алина 26.10: «не красиво» строкой) */
        /* «Мой ремонт» — своя кнопка со значком вкладки Мой ремонт (Алина 26.10: Мой ремонт и Избранное — разные места, ♡ здесь не годится) */
        '<span class="vz__corner">' + (r.saved ? '<a class="vz__my is-on" href="my.html">✓ В Моём ремонте</a>' : '<button type="button" class="vz__my" data-save-viz="' + z + '">' + MY_IC + 'В Мой ремонт</button>') +
        '<a class="vz__ic" href="' + esc(r.img) + '" download="' + esc(KB.zone(z).name + ' — ракурс ' + (cur + 1)) + '.jpg" aria-label="Скачать визуализацию" title="Скачать">' + DL_IC + '</a></span></div>') +
      '<div class="vz__bar">' + rs.map(function (x, i) { return '<button type="button" class="vz__t' + (i === cur ? ' is-on' : '') + '" data-ang="' + z + ':' + i + '" style="background-image:url(' + esc(x.img) + ')" aria-label="Ракурс ' + (i + 1) + '"></button>'; }).join('') +
        (n < 3 ? '<button type="button" class="vz__t vz__t--more" data-ang-add="' + z + '"><b>✦</b><small>' + TOK(P.angle) + '</small></button>' : '') +
        '</div>' +
      vizPills(zs, done, z) +
      '<section class="on"><div class="on__h"><b>На этой визуализации</b><small>' + items.length + ' ' + plural(items.length, 'позиция', 'позиции', 'позиций') + '</small></div>' +
        shown.map(function (x) { return x.kind === 'mat' ? matRow(x.s) : objRow(x.o, z); }).join('') +
        (items.length > 3 ? '<button type="button" class="on__more" data-vmore="' + z + '">' + (open ? 'свернуть' : 'все ' + items.length + ' ›') + '</button>' : '') + '</section></div>';
  }
  /* точки замены на визуализации — по кнопке «⇄ Заменить на фото» (по умолчанию картинка чистая): материалы — терракотовые, предметы — зелёные */
  function pins(z) {
    var sp = UI.ROOM_SPOTS[KB.zoneType(z)] || {}, slots = KB.slotsFor([z]).map(function (s) { return s.key; }), objs = objectsOf(z);
    return (sp.mat || []).filter(function (m) { return slots.indexOf(m[0]) >= 0; }).map(function (m) {
      return '<button type="button" class="pin" data-swap="' + m[0] + '" data-from="viz" style="left:' + m[1] + '%;top:' + m[2] + '%"><i></i>' + esc(UI.slotShort(m[0])) + ' ⇄</button>';
    }).join('') + (sp.obj || []).map(function (o) {
      var x = objs.filter(function (y) { return y.kind === o[0]; })[0]; if (!x) return '';
      return '<button type="button" class="pin pin--obj" data-object="' + esc(x.kind) + '" data-zone="' + z + '" style="left:' + o[1] + '%;top:' + o[2] + '%"><i></i>' + esc(x.short) + ' ⇄</button>';
    }).join('');
  }
  /* ⚠️ ЧЕРНОВИК формы — не эталон: дизайн скачиваемого мудборда Алина ещё разработает (26.10). Пока — простая раскладка.
     ↓ мудборд комнаты картинкой PNG шириной 1080 (высота — по числу материалов): название и метраж, капсула, ДНК, все материалы комнаты — образец, название, цена (Алина 26.10) */
  function downloadBoard(z) {
    var list = KB.slotsFor([z]), cols = 3, pad = 64, gap = 28, ch = 250, W = 1080, H = 270 + Math.ceil(list.length / cols) * (ch + 120) + 70, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), cw = (W - pad * 2 - gap * (cols - 1)) / cols;
    /* строка не шире карточки — обрезаем с «…» */
    var fit = function (t) { if (g.measureText(t).width <= cw) return t; while (t.length > 1 && g.measureText(t + '…').width > cw) t = t.slice(0, -1); return t + '…'; };
    var items = list.map(function (s) { return { s: s, it: KB.item(board.slots[s.key].sku) }; });
    var srcs = items.map(function (x) { return x.it.photo || x.it.textureUrl || null; });
    var imgs = srcs.map(function (src) { if (!src) return null; var im = new Image(); im.src = src; return im; });
    Promise.all(imgs.map(function (im) { return im ? new Promise(function (ok) { if (im.complete) ok(); else { im.onload = ok; im.onerror = ok; } }) : null; })).then(function () {
      g.fillStyle = '#F8F3EE'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1E1C1A'; g.font = '600 64px "Cormorant Garamond", Georgia, serif'; g.fillText(KB.zone(z).name, pad, 120);
      g.fillStyle = '#6B655F'; g.font = '500 28px Montserrat, Arial, sans-serif'; g.fillText(roomLabel(z).replace(KB.zone(z).name, '').replace(/^ · /, '') + (roomLabel(z) !== KB.zone(z).name ? ' · ' : '') + list.length + ' ' + matWord(list.length) + ' · ' + (board.name || ''), pad, 168);
      var dw = (W - pad * 2) / board.dna.length; board.dna.forEach(function (c, i) { g.fillStyle = c.hex; g.fillRect(pad + i * dw, 200, dw - 6, 34); });
      items.forEach(function (x, i) {
        var cx = pad + (i % cols) * (cw + gap), cy = 270 + Math.floor(i / cols) * (ch + 120), im = imgs[i];
        g.fillStyle = '#E7E0D4'; g.fillRect(cx, cy, cw, ch);
        if (im && im.naturalWidth) { var k = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k; g.save(); g.beginPath(); g.rect(cx, cy, cw, ch); g.clip(); g.drawImage(im, cx + (cw - iw) / 2, cy + (ch - ih) / 2, iw, ih); g.restore(); }
        else { g.fillStyle = x.it.hex || '#CFC6BC'; g.fillRect(cx, cy, cw, ch); }
        g.fillStyle = '#A24E32'; g.font = '800 20px Montserrat, Arial, sans-serif'; g.fillText(fit(x.s.name.toUpperCase()), cx, cy + ch + 34);
        g.fillStyle = '#1E1C1A'; g.font = '600 24px Montserrat, Arial, sans-serif'; g.fillText(fit(x.it.name), cx, cy + ch + 66);
        g.fillStyle = '#6B655F'; g.font = '500 22px Montserrat, Arial, sans-serif'; g.fillText(UI.unitPrice(x.it), cx, cy + ch + 96);
      });
      g.fillStyle = '#8A7F74'; g.font = '500 20px Montserrat, Arial, sans-serif'; g.fillText('SOVE App · мудборд интерьера', pad, H - 48);
      var a = document.createElement('a'); a.download = 'Мудборд — ' + KB.zone(z).name + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
      track('int_board_download', { zone: z, n: list.length });
    });
  }
  /* проявка (как в Планировке): кадр комнаты размытый, проступает, внизу «Собираем визуализацию…» */
  function devImg(z, src) {
    var c = KB.capsule(board.capsuleId || board.baseCapsuleId || KB.nearestCapsule(board.dna).id), rm = c && c.rooms.filter(function (x) { return x.zone === KB.zoneType(z); })[0];
    return '<div class="vz__img is-busy"><img src="' + esc(src || (rm ? rm.img : MOCK[KB.zoneType(z)])) + '" alt=""><b class="mt-load">Собираем визуализацию…</b></div>';
  }
  /* предложение замены: число альтернатив и «от» минимальной цены; дешевле нет — «N замен в ДНК» */
  /* строка позиции: образец · метка · название и цена; справа в одну линию ⇄ · ♡ · 🛒 — как в Материалах */
  function matRow(s) {
    var e = board.slots[s.key], it = KB.item(e.sku);
    return '<div class="on__r"><button type="button" class="on__m" data-swap="' + s.key + '" data-from="viz"><span class="on__pic" style="background:' + UI.tileBg(it, 44, 44) + '"></span><span class="on__b"><small class="is-mat">МАТЕРИАЛ</small><b>' + esc(it.name) + '</b><em>' + esc(UI.unitPrice(it)) + '</em></span></button>' +
      '<span class="on__a"><button type="button" class="rl__x" data-swap="' + s.key + '" data-from="viz" aria-label="Заменить">⇄</button>' + R.btns(UI.product(it), 'room') + '</span></div>';
  }
  function objRow(o, z) {
    var alt = o.options.length > 1;
    return '<div class="on__r"><button type="button" class="on__m"' + (alt ? ' data-object="' + esc(o.kind) + '" data-zone="' + z + '"' : '') + '><span class="on__pic" style="background-image:url(' + esc(o.product.img) + ')"></span><span class="on__b"><small class="is-obj">ПРЕДМЕТ</small><b>' + esc(o.product.name) + '</b><em>' + F.rub(o.product.metod) + '</em></span></button>' +
      '<span class="on__a">' + (alt ? '<button type="button" class="rl__x" data-object="' + esc(o.kind) + '" data-zone="' + z + '" aria-label="Заменить">⇄</button>' : '') + objBtns(o.product) + '</span></div>';
  }
  /* ♡ и 🛒 у предмета: товар каталога расстановки регистрируем в каталоге прототипа, чтобы он жил в Избранном и Корзине */
  function objBtns(p) {
    if (R.registerProduct) R.registerProduct({ id: p.id, name: p.name, brand: p.brand, metod: p.metod, retail: p.retail, img: p.img, category: 'Мебель' });
    return R.btns(S.data.product(p.id) || p, 'room');
  }
  /* ♡ подборка — блок товаров к интерьеру (товары капсулы) целиком в Избранное (Алина 25.10) */
  function setBtn() {
    var set = R.favSets && R.favSets.capsule(board.capsuleId || board.baseCapsuleId); if (!set) return '';
    var on = R.favSets.has(set.id);
    return '<button type="button" class="mt-btn2' + (on ? ' is-on' : '') + '" data-fav-set aria-pressed="' + on + '">' + (on ? '♥ Товары к интерьеру — в Избранном' : '♡ Товары к интерьеру · ' + set.productIds.length + ' — в Избранное') + '</button>';
  }
  function setMode(m) { st.mode = m; st.sel = null; track('int_mode', { mode: m }); history.replaceState(null, '', roomUrl()); render(); window.scrollTo(0, 0); }
  function roomUrl() { return 'interior.html?v=b&view=' + st.mode + (FROM_BUDGET ? '&from=budget' : FROM_MY ? '&from=my' : ''); }

  /* ── «＋ комната» и «✦ Сгенерировать»: без плана — сначала окно «Покажем в твоей квартире» (экран 2) ── */
  function needPlan(act) {
    /* окно про план в Материалах и Визуализациях не показываем (Алина 26.10: «предлагает план на этом месте — неверно»): план грузят в Моём ремонте */
    if (true || planInfo().exact || board.noPlan) return false;
    var back = sheet('pq', 'Покажем в твоей квартире', '<i class="ss-grip"></i><div class="pq__h"><span><b>Покажем в твоей квартире</b><small>нужен план или фото — посчитаем метраж и построим комнаты в твоей планировке</small></span><button type="button" class="sw-x" data-sw-close aria-label="Закрыть">✕</button></div>' +
      '<button type="button" class="mt-btn" data-pq-up>⇪ Загрузить план или фото</button><small class="pq__n">подойдёт: план от застройщика · скрин из ДомКлик · фото бумажного плана<br>обмерный план · дизайн-проект · фото пустых комнат</small>' +
      '<button type="button" class="mt-btn2" data-pq-none>Пока без плана — примерно</button><small class="pq__n">суммы останутся приблизительными, комнаты — в типовой планировке</small>');
    back.addEventListener('click', function (e) {
      if (e.target.closest('[data-pq-up]')) { ss('sove.int.after', act); track('int_plan_upload', { from: act.kind }); location.href = 'plan-demo.html?from=interior'; return; }
      if (e.target.closest('[data-pq-none]')) { back.close(); board.noPlan = true; persist(); track('int_noplan', {}); run(act); }
    });
    return true;
  }
  function run(act) { if (act.kind === 'add') addRooms(act.zones, act.ctx, true); if (act.kind === 'gen') generate(act.zones, act.angles, true); }
  function addRooms(zones, ctx, asked) {
    if (!asked && needPlan({ kind: 'add', zones: zones, ctx: ctx })) return;
    var per = ctx === 'visuals' ? P.roomMaterials + P.roomRender : P.roomMaterials, cost = per * zones.length;
    if (!charge(ctx === 'visuals' ? 'roomVisual' : 'roomMaterials', cost, (zones.length > 1 ? 'Вся квартира' : KB.zone(zones[0]).name) + (ctx === 'visuals' ? ' · материалы и визуализация' : ' · материалы'))) return;
    zones.forEach(function (z) { if (board.zones.indexOf(z) < 0) board.zones.push(z); });
    if (allZones().every(function (z) { return board.zones.indexOf(z) >= 0; })) { board.scope = 'flat'; board.zones = []; }
    board.tokensSpent = (board.tokensSpent || 0) + cost; persist(); track('int_add_room', { zones: zones, ctx: ctx, tokens: cost });
    if (st.pick) zones.forEach(function (z) { if (st.pick.indexOf(z) < 0) st.pick.push(z); });
    if (ctx === 'visuals') return generate(zones, 1, true, true);
    /* загрузка новой комнаты: доска собирается на глазах — образцы проявляются из размытия (как в Планировке), ~1,6 с */
    st.zf = zones[0]; st.loadZ = zones[0]; render();
    setTimeout(function () { st.loadZ = null; render(); }, 1600);
  }
  /* генерация по готовности: комнаты появляются по одной, остальные — «собираем…»; списание — за готовые */
  function generate(zones, angles, asked, paid) {
    if (!zones.length) return;
    if (!asked && needPlan({ kind: 'gen', zones: zones, angles: angles })) return;
    var cost = zones.length * angles * P.roomRender, op = paid ? 'paid' : charge('render', cost, 'Визуализации · ' + zones.length + ' ' + UI.roomsWord(zones.length) + ' × ' + angles, true);
    if (!op) return;
    zones.forEach(function (z) { st.gen[z] = true; });
    var c = KB.capsule(board.capsuleId || board.baseCapsuleId || KB.nearestCapsule(board.dna).id), i = 0;
    render();
    (function next() {
      if (i >= zones.length) { if (op !== 'paid' && op !== 'free') S.tokens.commit(op); board.tokensSpent = (board.tokensSpent || 0) + (paid ? 0 : cost); persist(); track('int_generate', { zones: zones, angles: angles, tokens: cost }); return render(); }
      var z = zones[i++];
      setTimeout(function () {
        var rm = c && c.rooms.filter(function (x) { return x.zone === KB.zoneType(z); })[0], srcs = rm ? rm.angles : [MOCK[KB.zoneType(z)]], snap = snapshot();
        board.renders = board.renders.filter(function (r) { return r.zone !== z; });
        for (var k = 0; k < angles; k++) board.renders.push({ zone: z, room: KB.zone(z).name, angle: k, img: srcs[k % srcs.length] || MOCK[KB.zoneType(z)], skus: snap });
        delete st.gen[z]; persist(); R.save('render', { room: KB.zone(z).name, src: srcs[0] || MOCK[KB.zoneType(z)], mine: true }, { silent: true });
        render(); next();
      }, 1200);
    })();
  }
  /* «Подключить дизайнера» — одна строка-ссылка в самом низу Визуализаций (Алина 25.10): без подписи и уровней; «Дальше: стоимость работ» в Интерьере нет;
     капсула уходит дизайнеру параметром */
  function designerCard() {
    var cid = board.capsuleId || board.baseCapsuleId || '';
    return '<a class="dz1" href="adept.html?from=interior' + (cid ? '&capsule=' + cid : '') + '" data-adept><b>Подключить дизайнера</b><i aria-hidden="true">›</i></a>';
  }
  function plural(n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }
  function matWord(n) { return plural(n, 'материал', 'материала', 'материалов'); }

  function render() {
    root.innerHTML = st.view === 'b' ? viewB() : viewA();
    if (st.hl) { var row = root.querySelector('[data-row="' + st.hl + '"]'); if (row) { setTimeout(function () { row.scrollIntoView({ block: 'center' }); }, 60); setTimeout(function () { st.hl = null; var x = root.querySelector('.is-hl'); if (x) x.classList.remove('is-hl'); }, 2600); } }
  }
  function goB(mode) {
    st.view = 'b'; if (mode) st.mode = mode;
    history.replaceState(null, '', roomUrl()); render(); window.scrollTo(0, 0);
  }

  /* капсулы SOVE 1–6 — бесплатно с подпиской METOD, без неё — 10 токенов (Алина 26.10); дизайнерская — всегда 10 */
  function capsuleCost(c) { return S.metod.active() && !c.designer ? 0 : P.capsulePaid; }
  /* главная комната капсулы — обычно кухня-гостиная; в плане её нет — первая комната плана */
  function capsuleMain(c) { var zs = allZones(), m = (c.rooms.filter(function (r) { return r.zone === 'kitchenLiving'; })[0] || c.rooms[0] || {}).zone || 'kitchenLiving'; return zs.indexOf(m) >= 0 || !zs.length ? m : zs[0]; }
  /* визуализация на весь экран, свайп между комнатами и ракурсами; подписей на картинке нет */
  function openViewer(zone) {
    var list = []; boardZones().forEach(function (z) { rendersOf(z).forEach(function (r) { list.push(r); }); });
    var start = Math.max(0, list.map(function (r) { return r.zone + ':' + r.angle; }).indexOf(zone + ':' + (st.angleOf[zone] || 0)));
    var back = document.createElement('div'); back.className = 'vw';
    back.innerHTML = '<button type="button" class="vw__x" aria-label="Закрыть">✕</button><div class="vw__track">' + list.map(function (r) {
      return '<figure><img src="' + esc(r.img) + '" alt="' + esc(r.room) + '"><figcaption>' + esc(r.room) + ' · ракурс ' + (r.angle + 1) + '</figcaption></figure>'; }).join('') + '</div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var tr = back.querySelector('.vw__track'); tr.scrollLeft = tr.clientWidth * start;
    back.addEventListener('click', function (e) { if (e.target.closest('.vw__x')) { back.remove(); document.body.style.overflow = ''; } });
  }

  /* ── шторки ── */
  function sheet(cls, label, html) {
    var back = document.createElement('div'); back.className = 'mt-back';
    back.innerHTML = '<div class="mt-sheet ' + cls + '" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    back.close = function () { back.remove(); document.body.style.overflow = ''; };
    back.addEventListener('click', function (e) { if (e.target === back || e.target.closest('[data-sw-close]') || e.target.closest('[data-bs-close]')) back.close(); });
    return back;
  }

  /* всплывашка «Твоя квартира» (эталон etalon-A1) — после выбора капсулы или картинки; план из Планировки — уже отмечен */
  function openBasis(pick, keep) {
    var pl = planInfo(), zones = allZones(), f = R.flats.active();
    var bs = keep || { pick: pick, basis: pl.exact ? 'plan' : null, file: null, files: [], scope: 'flat', picked: zones.slice() };
    var back = sheet('ss bs', 'Твоя квартира', '');
    function cost() { return pick.kind === 'capsule' ? P.capsule : bs.scope === 'rooms' && bs.picked.length === 1 ? P.ownRoom : P.ownFlat; }
    function paint() {
      var c = cost(), bal = balance();
      back.firstChild.innerHTML = UI.basisSheet({ pick: pick, basis: bs.basis, file: bs.file, scope: bs.scope, picked: bs.picked, cost: c, enough: !c || bal >= c, lack: c - bal,
        zones: zones.map(function (z) { return { key: z, name: KB.zone(z).name }; }),
        plan: pl.exact ? { line: [f && f.jk ? 'ЖК ' + f.jk : (pl.doc ? 'ЖК PRIDE' : ''), String(pl.area).replace('.', ',') + ' м²', zones.length + ' ' + UI.roomsWord(zones.length), 'точно'].filter(Boolean).join(' · ') } : null });
    }
    back.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-basis]'); if (!inp || !inp.files || !inp.files.length) return;
      bs.basis = inp.getAttribute('data-basis'); bs.file = inp.files.length > 1 ? inp.files.length + ' файла' : inp.files[0].name; bs.files = [];
      track('int_basis', { basis: bs.basis, n: inp.files.length });
      /* фото квартиры и рендеры дизайн-проекта — картинками в комнаты; спецификации проекта не разбираем (ТЗ 14.8) */
      [].slice.call(inp.files, 0, 4).filter(function (x) { return /^image\//.test(x.type); }).forEach(function (file) { shrink(file, 900, function (src) { bs.files.push(src); }); });
      paint();
    });
    back.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-basis-plan')) { bs.basis = 'plan'; bs.file = null; return paint(); }
      if (b.hasAttribute('data-scope')) { bs.scope = b.getAttribute('data-scope'); if (bs.scope === 'flat') bs.picked = zones.slice(); else if (bs.picked.length === zones.length) bs.picked = zones.slice(0, 1); return paint(); }
      if (b.hasAttribute('data-room')) {
        var z = b.getAttribute('data-room'), i = bs.picked.indexOf(z);
        if (bs.scope === 'flat') { bs.scope = 'rooms'; bs.picked = [z]; return paint(); }
        if (i >= 0) bs.picked.splice(i, 1); else bs.picked.push(z);
        if (bs.picked.length === zones.length) bs.scope = 'flat';
        return paint();
      }
      if (b.hasAttribute('data-basis-none')) { bs.basis = 'none'; bs.file = null; back.close(); return build(pick, bs); }
      if (b.hasAttribute('data-build')) { if (!bs.basis) bs.basis = 'none'; back.close(); return build(pick, bs); }
    });
    paint();
  }
  function shrink(file, max, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', .82)); };
      im.onerror = function () { done(null); };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* сборка: капсула — сразу (0 токенов); своя картинка — резерв → разбор → списано, ошибка — возврат */
  function build(pick, bs) {
    var zones = bs.scope === 'flat' ? allZones() : bs.picked.slice(), pl = planInfo();
    var common = { scope: bs.scope, zones: bs.scope === 'flat' ? [] : zones, basis: bs.basis, accuracy: pl.exact || bs.basis === 'measure' ? 'точно' : '≈', objects: {}, objectDelta: 0, decor: [] };
    if (pick.kind === 'capsule') {
      var c = KB.capsule(pick.id), lv = c.full ? 'premium' : 'base';
      if (!charge(pick.change ? 'changeCapsule' : 'capsule', capsuleCost(c), 'Капсула ' + c.name)) return;
      var prev = board ? JSON.parse(JSON.stringify(board)) : null;
      board = Object.assign({ type: 'capsule', source: 'capsule', capsuleId: c.id, name: c.name, imageUrl: c.cover, dna: c.dna, style: c.style, slots: scaleSlots(KB.fromCapsule(c.id, lv), pl.area), tokensSpent: 0, boardGeneratedAt: Date.now() }, common);
      board.renders = [];   /* визуализации — только по кнопке «✦ Сгенерировать» (TZ-interior-final, 0.4) */
      addBasisRenders(bs);
      persist(); track('int_capsule_pick', { capsule: c.id, scope: bs.scope, basis: bs.basis });
      st.open = {}; st.pick = null;
      goB('materials');
      if (prev && pick.change) R.toast('Интерьер сменили · ' + c.name, { label: 'Отменить', onClick: function () { board = normalize(prev); persist(); render(); track('int_undo', { what: 'change' }); } });
      return;
    }
    var cost = bs.scope === 'rooms' && zones.length === 1 ? P.ownRoom : P.ownFlat;
    var op = charge(cost === P.ownRoom ? 'ownRoom' : 'ownFlat', cost, 'Своя капсула · ' + (bs.scope === 'flat' ? 'вся квартира' : zones.map(function (z) { return KB.zone(z).name; }).join(', ')), true);
    if (!op) return;
    pending = { img: pick.img, room: pick.room, op: op, cost: cost, bs: { scope: bs.scope, zones: zones, basis: bs.basis, files: bs.files }, t0: Date.now() };
    ss('sove.int.pending', pending); board = null; st.error = null; goB('materials'); analyze();
  }
  function addBasisRenders(bs) {
    /* рендеры дизайн-проекта и фото квартиры — комнатами капсулы (материалы с них берём в бою, здесь — картинка как есть) */
    (bs.files || []).forEach(function (src, i) {
      var z = boardZones()[i]; if (!z || !src) return;
      board.renders = board.renders.filter(function (r) { return r.zone !== z; });
      board.renders.push({ zone: z, room: KB.zone(z).name, angle: 0, img: src, project: bs.basis === 'project', photo: bs.basis === 'photo', skus: snapshot() });
    });
  }
  function analyze() {
    var p = pending; if (!p) return;
    KB.analyzeInterior(p.img).then(function (a) {
      if (p.op !== 'free') S.tokens.commit(p.op);
      var pl = planInfo(), slots = scaleSlots(KB.complete(a.dna, a.found, a.level || 'premium'), pl.area);
      board = { type: 'own', source: 'photo', imageUrl: p.img, dna: a.dna, style: a.style, name: cap(a.style), scope: p.bs.scope, zones: p.bs.scope === 'flat' ? [] : p.bs.zones,
        basis: p.bs.basis, accuracy: pl.exact || p.bs.basis === 'measure' ? 'точно' : '≈', slots: slots, renders: [], objects: {}, objectDelta: 0, decor: [], tokensSpent: p.cost, boardGeneratedAt: Date.now() };
      var z = KB.zoneOf(p.room); if (boardZones().indexOf(z) < 0) z = boardZones()[0];
      board.renders.push({ zone: z, room: KB.zone(z).name, angle: 0, img: p.img, photo: true, skus: snapshot() });
      addBasisRenders(p.bs);
      persist(); pending = null; ss('sove.int.pending', null);
      track('int_board_ready', { ms: Date.now() - p.t0 }); render();
    }).catch(function () {
      refund(p.op, 'не видим интерьер на картинке');
      st.error = { img: p.img }; pending = null; ss('sove.int.pending', null); render();
    });
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function readUpload(file) {
    shrink(file, 1000, function (src) {
      if (!src) { st.error = { img: '' }; st.view = 'b'; return render(); }
      track('int_upload', { source: /pinterest/i.test(file.name) ? 'pinterest' : 'photo' });
      openBasis({ kind: 'own', img: src, room: KB.guessRoom() });
    });
  }

  /* любое изменение капсулы SOVE делает её своей: «своя капсула на основе …» */
  function makeOwn() { if (board.type !== 'capsule') return; board.type = 'own'; board.baseCapsuleId = board.capsuleId; track('int_capsule_own', { base: board.capsuleId }); }

  /* ── шторка 2 · замена материала: с доски / из списка — контекст мудборд; с рендера / из ленты комнаты — контекст рендер ── */
  function openSwap(slot, from) {
    track('int_swap_open', { slot: slot, from: from });
    var onRender = false;   /* замена материала — одна шторка и в Материалах, и под визуализацией (TZ-interior-final, 5) */
    st.sel = slot; render();
    var ctx = onRender ? root.querySelector('.rh--b') : root.querySelector('.mb');
    var tile = onRender ? root.querySelector('.rh-pill[data-swap="' + slot + '"]') : root.querySelector('.mb-tile[data-slot="' + slot + '"]');
    if (ctx) window.scrollTo(0, ctx.getBoundingClientRect().top + window.scrollY - 8);
    document.body.classList.add('int-swap'); if (tile) tile.classList.add('is-top'); if (onRender && ctx) ctx.classList.add('is-top');
    var back = sheet('sw', 'Замена материала', ''); back.classList.add('mt-back--sw');
    var mz = mainZone(), rs = rendersOf(mz);
    back.firstChild.innerHTML = '<i class="ss-grip"></i>' + (onRender
      ? UI.renderSwapSheet(slot, { slots: board.slots, dna: board.dna, price: P.rerender, angles: rs.length, angle: st.angle })
      : UI.swapSheet(slot, { slots: board.slots, dna: board.dna, exact: planInfo().exact, price: P.materialSwap }));
    var close0 = back.close; back.close = function () { close0(); document.body.classList.remove('int-swap'); st.sel = null; render(); };
    back.addEventListener('click', function (e) {
      if (e.target.closest('[data-sw-all]')) { back.close(); return openSwap(slot, 'all'); }
      if (e.target.closest('[data-market]')) { track('int_market_open', { slot: slot }); return; }
      var a = e.target.closest('[data-angle]'); if (a) { st.angle = +a.getAttribute('data-angle'); back.close(); return; }
      var b = e.target.closest('[data-pick]'); if (!b) return;
      var sku = b.getAttribute('data-pick'); if (board.slots[slot].sku === sku) return back.close();
      var op = charge('materialSwap', P.materialSwap, 'Замена материала · ' + KB.slot(slot).name); if (!op) return;
      var t = swapTo(slot, sku); t.op = op; back.close(); swapToast(t);
    });
  }
  function swapTo(slot, sku) {
    var prev = JSON.parse(JSON.stringify({ slots: board.slots, type: board.type, baseCapsuleId: board.baseCapsuleId || null })), z = 'flat', sum0 = zoneTotal(z), it = KB.item(sku);
    makeOwn();
    board.slots[slot] = KB.slotEntry(it, 'user', null); scaleSlots(board.slots, planInfo().area); KB.recheck(board.slots, board.dna); persist();
    var e = board.slots[slot], d = zoneTotal(z) - sum0;
    var zones = boardZones().filter(function (x) { return KB.inZone(slot, x) && rendersOf(x).length; });
    track('int_swap_done', { slot: slot, level: it.level, ok: e.ok, staleRooms: zones.length });
    var name = it.name.charAt(0).toLowerCase() + it.name.slice(1);
    return { prev: prev, text: KB.slot(slot).name + ': ' + name + ' · ' + (e.ok ? '✓ сочетается' : '! ' + e.reason) + ' · итого ' + (d < 0 ? '−' : '+') + F.rub(Math.abs(d)) +
      (zones.length ? ' · ' + zones.length + ' ' + plural(zones.length, 'рендер', 'рендера', 'рендеров') + ' обновить' : '') };
  }
  /* тост 4 с с «Отменить» — возвращает образец, строку, сумму, паспорт, статус капсулы и токен за замену */
  function swapToast(t) {
    var old = document.querySelector('.mt-toast'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'mt-toast'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>' + esc(t.text) + '</span><button type="button">Отменить</button>';
    el.querySelector('button').addEventListener('click', function () {
      if (t.prev.slots) { board.slots = t.prev.slots; board.type = t.prev.type; if (t.prev.baseCapsuleId) board.baseCapsuleId = t.prev.baseCapsuleId; else delete board.baseCapsuleId; }
      if (t.undo) t.undo();
      refund(t.op, 'отмена'); persist(); track('int_undo', {}); el.remove(); render();
    });
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 4000);
    render();
  }

  /* ── шторка 3 · замена предмета (зелёная пилюля) ── */
  function openObject(kind) {
    var mz = mainZone(), o = objectsOf(mz).filter(function (x) { return x.kind === kind; })[0]; if (!o) return;
    track('int_object_open', { kind: kind });
    st.sel = 'obj:' + kind; render();
    var ctx = root.querySelector('.rh--b'), pill = root.querySelector('.rh-pill[data-object="' + kind + '"]');
    if (ctx) { window.scrollTo(0, ctx.getBoundingClientRect().top + window.scrollY - 8); ctx.classList.add('is-top'); }
    document.body.classList.add('int-swap'); if (pill) pill.classList.add('is-top');
    var back = sheet('sw', 'Замена предмета', ''); back.classList.add('mt-back--sw');
    back.firstChild.innerHTML = '<i class="ss-grip"></i>' + UI.objectSwapSheet(kind, { options: o.options, current: o.product.id, place: placeOf(kind), price: P.objectSwap });
    var close0 = back.close; back.close = function () { close0(); document.body.classList.remove('int-swap'); st.sel = null; render(); };
    back.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick-obj]'); if (!b) return;
      var id = +b.getAttribute('data-pick-obj'); if (id === o.product.id) return back.close();
      var op = charge('objectSwap', P.objectSwap, 'Замена предмета · ' + kind); if (!op) return;
      var np = o.options.filter(function (p) { return p.id === id; })[0], prevId = board.objects[kind], prevDelta = board.objectDelta, d = np.metod - o.product.metod;
      board.objects[kind] = id; board.objectDelta = (board.objectDelta || 0) + d;
      var rr = rendersOf(mz); rr.forEach(function (x) { x.objStale = OBJ_SHORT[kind] || kind; });
      makeOwn(); persist(); track('int_object_done', { kind: kind, id: id, delta: d });
      back.close();
      swapToast({ op: op, prev: {}, text: kind + ': ' + np.name.split(',')[0] + ' · Мебель ' + (d < 0 ? '−' : '+') + F.rub(Math.abs(d)) + ' · рендер обновить',
        undo: function () { if (prevId) board.objects[kind] = prevId; else delete board.objects[kind]; board.objectDelta = prevDelta; rr.forEach(function (x) { delete x.objStale; }); } });
    });
  }

  /* ── шторка 1 · сменить интерьер ── */
  function openChange() {
    var changes = KB.SLOTS.filter(function (s) { return board.slots[s.key].source === 'user'; }).length + Object.keys(board.objects || {}).length;
    var back = sheet('ss sw', 'Сменить интерьер', UI.changeInteriorSheet({ caps: KB.CAPSULES, currentId: board.capsuleId || board.baseCapsuleId, current: board.name, changes: changes, ownPrice: P.ownRoom }));
    back.addEventListener('click', function (e) {
      var c = e.target.closest('[data-capsule]'); if (!c) return;
      back.close(); var keep = { basis: board.basis, file: null, files: [], scope: board.scope, picked: boardZones() };
      track('int_change', { to: c.getAttribute('data-capsule') });
      build({ kind: 'capsule', id: c.getAttribute('data-capsule'), change: true }, keep);
    });
    back.addEventListener('change', function (e) { var inp = e.target.closest('[data-up]'); if (inp && inp.files && inp.files[0]) { back.close(); readUpload(inp.files[0]); } });
  }

  /* ── рендеры: новый · ракурс · обновить (по 5 токенов, черновик). Сам рендер не перегенерируется — только по кнопке ── */
  function makeRender(zone, kind) {
    var price = kind === 'angle' ? P.angle : kind === 're' ? P.rerender : P.render;
    var op = charge(kind === 'angle' ? 'angle' : kind === 're' ? 'rerender' : 'render', price, (kind === 'angle' ? 'Ракурс · ' : kind === 're' ? 'Обновить рендер · ' : 'Рендер · ') + KB.zone(zone).name); if (!op) return false;
    st.busy = zone; st.vz = zone; render();
    setTimeout(function () {
      var c = KB.capsule(board.capsuleId || board.baseCapsuleId || KB.nearestCapsule(board.dna).id), rm = c && c.rooms.filter(function (x) { return x.zone === KB.zoneType(zone); })[0];
      var srcs = rm ? rm.angles : [MOCK[KB.zoneType(zone)]], rs = rendersOf(zone), snap = snapshot();
      if (kind === 'angle') board.renders.push({ zone: zone, room: KB.zone(zone).name, angle: rs.length, img: srcs[rs.length % srcs.length] || MOCK[KB.zoneType(zone)], skus: snap });
      else if (kind === 're') rs.forEach(function (r) { r.skus = snap; delete r.objStale; r.example = false; r.photo = false; });
      else { board.renders = board.renders.filter(function (r) { return r.zone !== zone; }); board.renders.push({ zone: zone, room: KB.zone(zone).name, angle: 0, img: srcs[0] || MOCK[KB.zoneType(zone)], skus: snap }); }
      board.tokensSpent = (board.tokensSpent || 0) + price; persist();
      R.save('render', { room: KB.zone(zone).name, src: (srcs[0] || MOCK[KB.zoneType(zone)]), mine: true }, { silent: true });
      track('int_render', { zone: zone, kind: kind, tokens: price }); st.busy = null; if (kind === 'angle') st.angleOf[zone] = rs.length; render();
    }, 1500);
    return true;
  }
  /* «↓ Скачать капсулу PDF»: ДНК, 12 материалов, комнаты; брендинг только в полях */
  function pdf() {
    var b = board, abs = function (u) { return /^(data:|https?:)/.test(u) ? u : location.href.replace(/[^/]*$/, '') + u; }, rs = [];
    boardZones().forEach(function (z) { var r = rendersOf(z)[0]; if (r) rs.push(r); });
    var w = window.open('', '_blank'); if (!w) { ui.toast('Разреши всплывающие окна — откроем PDF'); return; }
    w.document.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + esc(b.name) + ' — капсула SOVE</title><style>body{font:12px/1.4 Montserrat,Arial,sans-serif;color:#1E1C1A;margin:28px}h1{font:600 28px "Cormorant Garamond",Georgia,serif;margin:0 0 4px}.s{color:#6B655F;margin:0 0 14px}.dna{display:flex;gap:4px;margin:0 0 16px}.dna i{flex:1;height:28px;border-radius:6px}table{width:100%;border-collapse:collapse;margin:0 0 18px}td{padding:6px 0;border-top:1px solid #E6E1DA;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}.r{display:grid;grid-template-columns:1fr 1fr;gap:8px}.r img{width:100%;height:150px;object-fit:cover;border-radius:8px}.f{margin-top:18px;font-size:10px;color:#6B655F}</style></head><body>' +
      '<h1>' + esc(b.name) + '</h1><p class="s">капсула SOVE App</p>' +
      '<div class="dna">' + b.dna.map(function (c) { return '<i style="background:' + c.hex + '"></i>'; }).join('') + '</div>' +
      '<table>' + KB.slotsFor(boardZones()).map(function (s) { var e = b.slots[s.key], it = KB.item(e.sku); return '<tr><td>' + esc(s.name) + '<br><small>' + esc(KB.whereText(s, boardZones())) + '</small></td><td>' + esc(it.name) + '</td><td>' + F.rub(zoneSum(s.key, 'flat')) + '</td></tr>'; }).join('') +
      '<tr><td colspan="2"><b>Материалы</b></td><td><b>≈ ' + F.rub(zoneTotal('flat')) + '</b></td></tr></table>' +
      '<div class="r">' + rs.map(function (r) { return '<figure style="margin:0"><img src="' + esc(abs(r.img)) + '" alt=""><figcaption>' + esc(r.room) + '</figcaption></figure>'; }).join('') + '</div>' +
      '<p class="f">SOVE App · платформа выгодного ремонта · ' + new Date().toLocaleDateString('ru-RU') + '</p></body></html>');
    w.document.close(); setTimeout(function () { w.print(); }, 600); track('int_pdf', {});
  }

  /* ── события ── */
  /* свайп по визуализации — следующий / предыдущий ракурс (тап — по-прежнему на весь экран) */
  var sw0 = null;
  root.addEventListener('touchstart', function (e) { var im = e.target.closest('.vz__img[data-view]'); sw0 = im ? { z: im.getAttribute('data-view'), x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (!sw0) return; var t = e.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y, z = sw0.z; sw0 = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    var n = rendersOf(z).length; if (n < 2) return;
    st.angleOf[z] = ((st.angleOf[z] || 0) + (dx < 0 ? 1 : -1) + n) % n; st.swiped = Date.now(); render();
  });
  root.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-up]'); if (inp && inp.files && inp.files[0]) { readUpload(inp.files[0]); inp.value = ''; }
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
    /* тап по капсуле — сразу Материалы с одной комнатой, главной комнатой капсулы (TZ-interior-final, 1); окна на входе нет */
    if (b.hasAttribute('data-capsule')) { var c = KB.capsule(b.getAttribute('data-capsule')); return build({ kind: 'capsule', id: c.id, name: c.name, img: c.cover }, { scope: 'rooms', picked: [capsuleMain(c)], basis: planInfo().exact ? 'plan' : 'none', files: [] }); }
    if (b.hasAttribute('data-change')) return openChange();
    if (b.hasAttribute('data-mode')) return setMode(b.getAttribute('data-mode'));
    if (b.hasAttribute('data-vcur')) { st.vcur = b.getAttribute('data-vcur'); st.vz = st.vcur; track('int_room', { room: st.vcur }); return render(); }
    if (b.hasAttribute('data-dl-board')) return downloadBoard(b.getAttribute('data-dl-board'));
    if (b.hasAttribute('data-to-budget')) { board.budgetTs = Date.now(); persist(); track('int_to_budget', { zones: boardZones().length }); R.toast('Материалы в Бюджете', { label: 'Открыть', href: 'my.html?v=budget' }); return render(); }
    if (b.hasAttribute('data-save-viz')) { var sz = b.getAttribute('data-save-viz'), sr = rendersOf(sz)[st.angleOf[sz] || 0]; if (sr) { R.save('render', { room: KB.zone(sz).name, src: sr.img, mine: true }); sr.saved = Date.now(); persist(); track('int_save_viz', { zone: sz }); render(); } return; }
    if (b.hasAttribute('data-cart-all')) { var ids = KB.slotsFor([st.zf]).map(function (s2) { return UI.product(KB.item(board.slots[s2.key].sku)).id; }); R.cart.addMany(ids, 'materials'); track('int_cart_all', { zone: st.zf, n: ids.length }); return render(); }
    if (b.hasAttribute('data-pins')) { var pz2 = b.getAttribute('data-pins'); st.pins[pz2] = !st.pins[pz2]; track('int_pins', { zone: pz2, on: st.pins[pz2] }); return render(); }
    if (b.hasAttribute('data-zf')) { st.zf = b.getAttribute('data-zf'); st.sel = null; track('int_zone', { zone: st.zf }); return render(); }
    if (b.hasAttribute('data-add')) { var az = b.getAttribute('data-add'); return addRooms(az === 'all' ? todoZones() : [az], st.mode); }
    if (b.hasAttribute('data-open')) { var oz = b.getAttribute('data-open'); st.open[oz] = !st.open[oz]; return render(); }
    if (b.hasAttribute('data-pick-room')) { var pz = b.getAttribute('data-pick-room'), pi = st.pick.indexOf(pz); if (pi >= 0) st.pick.splice(pi, 1); else st.pick.push(pz); return render(); }
    if (b.hasAttribute('data-angles')) { st.angles = +b.getAttribute('data-angles'); return render(); }
    if (b.hasAttribute('data-gen')) return generate(st.pick.slice(), st.angles);
    if (b.hasAttribute('data-gen-one')) return generate([b.getAttribute('data-gen-one')], 1);
    if (b.hasAttribute('data-ang')) { var ap = b.getAttribute('data-ang').split(':'); st.angleOf[ap[0]] = +ap[1]; return render(); }
    if (b.hasAttribute('data-ang-add')) return makeRender(b.getAttribute('data-ang-add'), 'angle');
    if (b.hasAttribute('data-vmore')) { var vz = b.getAttribute('data-vmore'); st.vmore[vz] = !st.vmore[vz]; return render(); }
    if (b.hasAttribute('data-view')) { if (st.swiped && Date.now() - st.swiped < 400) return; return openViewer(b.getAttribute('data-view')); }
    if (b.hasAttribute('data-object')) { st.vz = b.getAttribute('data-zone') || st.vz; return openObject(b.getAttribute('data-object')); }
    var tile = b.closest('.mb-tile'); if (tile) return openSwap(tile.getAttribute('data-slot'), 'board');
    if (b.hasAttribute('data-swap')) return openSwap(b.getAttribute('data-swap'), b.getAttribute('data-from') || 'list');
    if (b.hasAttribute('data-plan')) { track('int_plan_upload', {}); location.href = 'plan-demo.html?from=interior'; return; }
    if (b.hasAttribute('data-rerender')) { st.vz = b.getAttribute('data-rerender'); return makeRender(st.vz, 're'); }
    if (b.hasAttribute('data-rerender-all')) { boardZones().filter(function (z) { return rendersOf(z).some(isStale); }).forEach(function (z) { makeRender(z, 're'); }); return; }
    if (b.hasAttribute('data-pdf')) return pdf();
    if (b.hasAttribute('data-next')) { track('int_next', {}); return; }
    if (b.hasAttribute('data-adept')) { track('int_adept', { capsule: board.capsuleId || board.baseCapsuleId }); return; }
  });

  /* вход по ссылке: ?capsule=k2 — сразу всплывашка «Твоя квартира» с этой капсулой; ?flat= — капсула другой квартиры */
  if (Q.get('flat') && R.flats.get(Q.get('flat'))) { R.flats.setActive(Q.get('flat')); board = passport(); }
  track('int_open', { entry: Q.get('from') || (document.referrer ? document.referrer.split('/').pop().split('?')[0] : 'direct'), view: st.view });
  render();
  if (st.view === 'b' && pending && !board) analyze();
  /* вернулись из загрузки плана — продолжаем действие, ради которого просили план («＋ комната» / «✦ Сгенерировать») */
  var after = ss('sove.int.after'); if (after && board) { ss('sove.int.after', null); if (planInfo().exact) run(after); }
  var qc = Q.get('capsule') && KB.capsule(Q.get('capsule')); if (qc && !board) build({ kind: 'capsule', id: qc.id, name: qc.name, img: qc.cover }, { scope: 'rooms', picked: [capsuleMain(qc)], basis: planInfo().exact ? 'plan' : 'none', files: [] });
})();
