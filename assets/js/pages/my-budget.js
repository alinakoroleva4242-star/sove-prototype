/* Мой ремонт → Бюджет (my.html?v=budget, &seg=w — к работам) — design/budget/TZ-budget.md; вид — по рендеру «Бюджет» Алины 25.10 (проще эталонов K/W):
   две карточки «Плановый бюджет · Оплачено», «Экономия с подпиской METOD», «По комнатам» или «По категориям» — только материалы, «Работы» — 5 этапов + черновые, два файла Excel (.xlsx, оформление как в смете №684).
   Как смета ремонта: 9 категорий комплектации + 5 этапов работ + черновые материалы. Бюджет ничего не хранит и не меняет — показывает:
   строка = выбор в своём блоке (ИНТЕРЬЕР / ПЛАНИРОВКА / МАРКЕТ) или норма (ПО НОРМЕ), тап ведёт в блок, «← Бюджет» возвращает сюда.
   Цифры — SOVE_BUDGET.current() (budget.js): totals.plan = карточка «Плановый бюджет» = полоса «Бюджет» = дашборд = PDF = Excel.
   Бюджет формируется только после расчёта бюджета (Алина 25.10): до него — пустой экран с одной кнопкой «Рассчитать бюджет», примера нет. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, R = S.repair;
  var IMG = 'assets/img/interior/';
  /* без подписки цена METOD — с замком (файл Алины 3, с.5 п.3), как в карточке товара */
  var LOCK = '<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  /* миниатюры категорий — как на эталоне K: образцы sw/, фото капсулы; техника и декор — значки */
  var THUMB = { finish: IMG + 'sw/walnut.jpg', light: IMG + 'sw/brass.jpg', sockets: IMG + 'sw/velvet.jpg', plumbing: IMG + 'sw/faucet.jpg', doors: IMG + 'sw/cer.jpg',
    furniture: IMG + 'k2.jpg', furniture_custom: IMG + 'k2-kitchen.jpg', appliances: '▣', decor: '❖' };
  var SLOT_OF = { finish: 'floor', light: 'light', sockets: 'hardware', plumbing: 'plumbing', doors: 'doors' };
  var TAG = { interior: 'ИНТЕРЬЕР', planirovka: 'ПЛАНИРОВКА', market: 'МАРКЕТ', scout: 'СКАУТ', norm: 'ПО НОРМЕ' };   /* на экране не показываем — только в Excel */

  function sum(l, f) { return l.reduce(function (a, x) { return a + (x[f] || 0); }, 0); }
  function rub(n) { return n === null || n === undefined ? '[сумма] ₽' : F.num(Math.round(n)) + ' ₽'; }
  function plural(n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }

  /* модель экрана: свой бюджет (план есть) или пример; figure — та же цифра, что в полосе «Бюджет» (budgetLayers) */
  /* карточка итога — та же, что на финальной странице расчёта (budget-view.css): фото интерьера, параметры квартиры, плановый бюджет; ниже — оплачено / осталось */
  function hero(m, fig, T, pct, left, lock) {
    var D = S.data, f = R.flats.active() || {}, it = R.get().interior, cid = (it && it.capsuleId) || f.capsuleId, c = cid && D.capsule(cid);
    var kb = c && window.SOVE_KB && window.SOVE_KB.capsule ? window.SOVE_KB.capsule(c.id) : null, name = c ? (kb && kb.name) || c.name : (it && it.name) || f.name || 'Моя квартира';
    var img = c ? (c.wide || c.cover) : (it && it.imageUrl) || '';
    var stId = m.state || (S.my && S.my.get().stateId), stt = stId && D.scout ? D.scout.states.filter(function (x) { return x.id === stId; })[0] : null;
    var chips = [m.type === 'premium' ? 'Премиум' : 'База', m.area ? F.area(m.area) : '', f.city || '', stt ? stt.name : ''].filter(Boolean);
    return '<section class="sq-card fr-hero">' + (img ? '<span class="fr-hero__pic"><img src="' + esc(img) + '" alt="" loading="lazy"></span>' : '') +
      '<div class="fr-hero__b"><div class="fr-hero__top"><small class="fr-k">Интерьер</small><b class="fr-hero__name">' + esc(name) + '</b></div>' +
        '<div class="fr-chips">' + chips.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="fr-hero__sum"><small class="fr-k">Плановый бюджет</small>' +
          '<div class="fr-total__row"><b class="fr-big">' + rub(fig) + '</b>' + (T.perM2 ? '<span class="fr-per">' + rub(T.perM2) + '/м²</span>' : '') + '</div>' +
          (lock ? '' : '<div class="fr-parts"><span>Комплектация <b>' + rub(T.kit) + '</b></span>' + (T.worksAndRough > 0 ? '<span>Работы <b>' + rub(T.worksAndRough) + '</b></span>' : '') + '</div>') +
          (!lock && T.saving > 0 ? '<div class="fr-save"><span>Экономия с подпиской METOD</span><b>−' + rub(T.saving) + '</b></div>' : '') +
        '</div></div></section>';
  }
  function model() {
    var B = window.SOVE_BUDGET, C = B && B.current ? B.current() : null;
    /* полного бюджета нет. Сохранённый расчёт важнее частичного: его итог не должен пропадать с экрана из-за доски на часть квартиры.
       До расчёта: если собран Интерьер — показываем, что уже известно (строки ИНТЕРЬЕР), остальное серым и «Досчитать весь бюджет» (Алина 26.10).
       Только параметры без сохранения (правка из Планировки) доску не перекрывают: полоса «Бюджет» показывает ту же известную сумму */
    if (!C || !C.full) { var r0 = R.get(), it = r0.interior, sv = fromSaved(); if (sv && r0.budget && r0.budget.total > 0) return sv; if (it && it.slots) return partial(it); return sv || { empty: true, plan: !!C }; }
    var f = R.flats.active(), BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers ? window.SOVE_FLOW.budgetLayers() : null;
    C.meta = [f && f.name, C.area ? F.area(C.area) : '', C.P && C.P.rooms ? C.P.rooms.filter(function (r) { return !/сан|ванн|прих|балкон|лодж|корид/i.test(r.name); }).length + ' комн.' : ''].filter(Boolean).join(' · ');
    C.figure = C.full ? C.totals.plan : BL ? BL.total : null;
    if (C.full && BL && BL.total !== C.totals.plan) console.warn('Бюджет: полоса ' + BL.total + ' ≠ экран ' + C.totals.plan);
    return C;
  }

  /* без Планировки и без расчёта «из Интерьера», но расчёт сохранён кнопкой «Сохранить в Мой ремонт» (rp.budget: works, rough, kit, total, byRooms)
     или есть rp.scoutParams.byRooms — экран строится из них: та же итоговая цифра, что в полосе (rp.budget.total), категории = Σ byCat по комнатам
     (нет разбивки — доли расчёта, «Отделка» 60 / 40), этапы — 5 этапов договора (как fromScout), черновые материалы — отдельной строкой в работах.
     Старые сохранения (в строках комнат есть работы, итог и rough_mat в byCat) показывают прежний итог: withCommon приводит строки к одному виду.
     «Рассчитать бюджет» остаётся только когда расчёта нет вообще. */
  function fromSaved() {
    var B = window.SOVE_BUDGET, SC = S.data && S.data.scout, r = R.get(), sp = r.scoutParams || {}, b = r.budget && r.budget.total > 0 ? r.budget : null;
    var br = (b && b.byRooms && b.byRooms.length ? b.byRooms : null) || (sp.byRooms && sp.byRooms.length ? sp.byRooms : null);
    if (!B || !SC || (!b && !br)) return null;
    var rsum = function (f) { return br ? br.reduce(function (a, x) { return a + (Number(x[f]) || 0); }, 0) : 0; };
    var val = function (f) { return b && typeof b[f] === 'number' ? b[f] : typeof sp[f] === 'number' ? sp[f] : rsum(f); };
    var total = Math.round(val('total')), works = Math.round(val('works')), kitMetod = Math.round(b && typeof b.kitMetod === 'number' ? b.kitMetod : total - works);
    if (!(total > 0)) return null;
    var kv = {}, savedMarket = b && b.kitMarket > 0 && b.kit > 0 ? b.kitMarket : 0;
    /* наценка как в расчёте: у подборки по картинкам своя розница */
    var mk = savedMarket ? savedMarket / b.kit : SC.retailMarkup || 1;
    if (br && br[0] && br[0].byCat) br.forEach(function (x) { Object.keys(x.byCat || {}).forEach(function (k) { kv[k] = (kv[k] || 0) + (Number(x.byCat[k]) || 0); }); });
    else {
      SC.kitShares.forEach(function (k) { kv[B.kitKey(k[0]) || k[0]] = kitMetod * k[1] / 100; });
      if (((b && b.roughMode) || sp.roughMode) !== 'top' && kv.finish) { kv.rough_mat = kv.finish * .4; kv.finish *= .6; }   /* нет разбивки: черновые — 40 % «Отделки», как в полном бюджете */
    }
    var rough = Math.round(kv.rough_mat || (b && b.rough) || sp.rough || 0); delete kv.rough_mat;   /* черновые материалы — отдельной строкой, как в полном бюджете */
    var known = B.KIT.map(function (k) { return k[0]; });
    Object.keys(kv).forEach(function (k) { if (known.indexOf(k) < 0) { kv.furniture = (kv.furniture || 0) + kv[k]; delete kv[k]; } });   /* «по картинкам» — в мебель */
    var kit = B.KIT.map(function (k) { var v = Math.round(kv[k[0]] || 0); return { key: k[0], title: k[1], plan: v, market: Math.round(v * mk), paid: 0, source: 'scout', accuracy: 'примерно' }; });
    if (savedMarket) { var md = Math.round(savedMarket) - sum(kit, 'market'), top = kit.filter(function (k) { return k.plan > 0; }).pop(); if (md && top) top.market += md; }   /* рынок до рубля как в расчёте */
    var stId = (b && b.stateId) || sp.stateId || (S.my && S.my.get().stateId), api = (b && b.api && b.api.totals ? b.api : null) || (sp.api && sp.api.totals ? sp.api : null);
    /* 5 этапов: из серверного расчёта (книга работ в коде), иначе доли ставки, как в полном бюджете.
       Бюджет по своим фото: материалы — товары с фото, а работы сервер считал по типовой норме (worksApi) — этапы берём оттуда, строки материалов нет */
    var wapi = api || (b && b.worksApi && b.worksApi.totals ? b.worksApi : null);
    var wv = wapi ? (function () { var o = {}; (wapi.works.stages || []).forEach(function (x) { o[B.WORKS[x.n - 1][0]] = x.sum; }); return o; })() : B.rateStages(works, stId);
    var wl = B.WORKS.map(function (w, i) { return { key: w[0], n: i + 1, title: w[1], plan: Math.round(wv[w[0]] || 0), days: w[2], examples: w[3], done: false }; }).filter(function (w) { return w.plan > 0; });
    var tk = sum(kit, 'plan'), tw = sum(wl, 'plan'), diff = total - tk - tw - rough;
    if (diff && wl.length) { wl[wl.length - 1].plan += diff; tw += diff; }   /* копейки округления — в последний этап: «Плановый бюджет» = итог полосы */
    var tm = sum(kit, 'market'), f = R.flats.active(), area = (b && b.area) || sp.area || rsum('area') || null;
    var rooms = br ? B.withCommon(br.map(function (x) { return { name: x.name, zone: x.zone, zoneName: (B.ZONE_NAME || {})[x.zone] || 'Спальня', area: x.area, works: x.works, market: x.market, kit: x.kit, common: !!x.common, byCat: x.byCat || {}, typical: !!x.typical }; })) : null;
    /* копейки округления материалов — в последнюю комнату: Σ комнат = «Итого по материалам» */
    if (rooms && rooms.length) {
      var own = rooms.filter(function (x) { return !x.common; }), rd = tk - rooms.reduce(function (a, x) { return a + x.kit; }, 0), lr = own[own.length - 1];
      if (rd && lr) { lr.kit += rd; var big = Object.keys(lr.byCat).sort(function (p, q) { return lr.byCat[q] - lr.byCat[p]; })[0]; if (big) lr.byCat[big] += rd; }
    }
    var nRooms = rooms ? rooms.filter(function (x) { return !x.common; }).length : 0, whole = tk + tw + rough;
    /* замена материала дойдёт до бюджета только у расчёта по капсуле с материалами: подборка по картинкам и капсула без доски (К10 из живого списка) — без замен */
    var capId = (b ? b.capsuleId : sp.capsuleId) || null, KBs = window.SOVE_KB, picks = !!br && br.some(function (x) { return x.byCat && x.byCat.visuals; });
    var noSwap = picks ? 'picks' : !(capId && KBs && KBs.capsule && KBs.capsule(capId)) ? 'calc' : null;
    return { saved: true, full: false, capsuleId: capId, noSwap: noSwap, type: (b && b.type) || sp.level || 'base', kit: kit, works: wl, roughMat: { sum: rough, rate: rough && area ? Math.round(rough / area) : null }, area: area, state: stId || null, savedRooms: rooms, workLines: null, workSwaps: [], workUnknown: [], api: api,
      /* экономия как в образце Excel: только по материалам, черновые в неё не входят */
      totals: { kit: tk, kitMarket: tm, saving: Math.max(0, tm - tk), works: tw, worksAndRough: tw + rough, plan: whole, paid: 0, perM2: area ? Math.round(whole / area) : null, worksDelta: 0 }, figure: whole,
      meta: [f && f.name, area ? F.area(area) : '', rooms ? nRooms + ' ' + plural(nRooms, 'комната', 'комнаты', 'комнат') : ''].filter(Boolean).join(' · ') };
  }
  function partial(b) {
    var B = window.SOVE_BUDGET, KB = window.SOVE_KB, whole = !b.scope || b.scope === 'flat';
    var kit = B.KIT.map(function (k) {
      var own = KB && KB.BUDGET_CATS.indexOf(k[0]) >= 0, v = own ? R.materialsSum('flat', { board: b, category: k[0] }) : null;
      return { key: k[0], title: k[1], plan: v, paid: 0, source: own ? 'interior' : 'scout', known: own };
    });
    var pz = R.planZones(), f = R.flats.active();
    kit[0].rooms = (whole ? pz.zones : b.zones).map(function (z) { return { id: KB.zoneId(z), name: KB.zone(z).name, plan: R.materialsSum(z, { board: b, category: 'finish' }) }; });
    var known = kit.filter(function (k) { return k.known; });
    return { partial: true, kit: kit, known: known.length, sum: known.reduce(function (a, k) { return a + (k.plan || 0); }, 0), meta: [f && f.name, pz.area ? F.area(pz.area) : ''].filter(Boolean).join(' · ') };
  }
  function thumb(k, m) {
    var t = THUMB[k.key], KB = window.SOVE_KB, UI = window.SOVE_MATUI, b = R.get().interior;
    if (k.source === 'interior' && b && b.slots && KB && UI && UI.tileBg) { var it = KB.item(b.slots[SLOT_OF[k.key]].sku); if (it) return '<span class="bg-th" style="background:' + UI.tileBg(it, 40, 40) + '"></span>'; }
    return t.length < 3 ? '<span class="bg-th bg-th--ic">' + t + '</span>' : '<span class="bg-th" style="background-image:url(' + t + ')"></span>';
  }
  /* куда ведёт строка — блок-источник; в Интерьер — с подсветкой строки (hl) или чипом комнаты (room) */
  function hrefOf(k, m) {
    var hl = SLOT_OF[k.key];
    if (m && m.noSwap && (hl || k.key === 'finish')) return 'scout.html?from=budget';   /* материалы этого расчёта не меняются: в Интерьере делать нечего */
    if (k.key === 'finish') return null;
    if (hl) return 'interior.html?v=b&hl=' + hl + '&from=budget';
    if (k.key === 'furniture' || k.key === 'furniture_custom') return R.LINK.plan;
    return R.LINK.market + (k.key === 'appliances' ? '?cat=' + encodeURIComponent('Техника') : '');
  }

  var ui$ = { open: { finish: true }, rooms: {}, works: {} };   /* раскрытые категории; rooms — раскрытые комнаты блока «По комнатам» */
  window.SOVE_MY_BUDGET = function (root) {
    if (new URLSearchParams(location.search).get('seg') === 'w') setTimeout(function () { var h = root.querySelectorAll('.bg-h')[1]; if (h) h.scrollIntoView({ block: 'start' }); }, 60);   /* &seg=w — сразу к работам */
    /* строка как на рендере «Бюджет» (Алина 25.10, «проще, меньше текста»): круглая миниатюра · название · «оплачено / план» · полоска · % · ›.
       Метки источника, легенду и плашку-правило убрали; куда ведёт строка — тот же блок-источник */
    function row(o) {
      var pct = o.plan ? Math.round((o.paid || 0) / o.plan * 100) : 0;
      /* строка как на финальной странице расчёта (Алина 10.11): название слева, плановая сумма справа. «Оплачено» и полоска — только когда
         по строке уже что-то оплачено: пока оплат нет, «0 ₽ / … · 0%» только путали */
      var paid = false;   /* «Оплачено» пока не показываем (Алина 10.11): запускаемся как агрегатор, оплаты не отследить */
      var body = (o.th || '') + '<span class="bg-r__b"><b>' + esc(o.title) + '</b>' +
        (o.lock ? '<small class="is-lock">Посчитаем при расчёте</small>' : paid ? '<small>Оплачено <b>' + rub(o.paid) + '</b> · ' + pct + '%</small><i class="bg-bar"><i style="width:' + Math.min(100, pct) + '%"></i></i>' : '') + '</span>' +
        (o.lock ? '' : '<b class="bg-r__sum">' + rub(o.plan) + '</b>') + '<span class="bg-r__a">' + (o.plain ? '' : o.fin ? (o.open ? '▴' : '▾') : '›') + '</span>';
      if (o.plain) return '<div class="bg-r">' + body + '</div>';   /* строка без перехода (этапы работ) */
      return o.fin ? '<button type="button" class="bg-r" data-fin="' + o.fin + '" aria-expanded="' + !!o.open + '">' + body + '</button>'
        : '<a class="bg-r" href="' + (o.lock && !o.go ? '#' : o.go || o.href) + '"' + (o.lock && !o.go ? ' data-bud="buy"' : '') + '>' + body + '</a>';
    }
    /* товары категории — прямо товарами, с ♡ и 🛒 (Алина 25.10): Интерьер — 12 материалов доски, Планировка — мебель расстановки, декор — корзина или декор капсулы */
    function goodsOf(k, m) {
      var KB = window.SOVE_KB, UI = window.SOVE_MATUI, b = R.get().interior, D = S.data, out = [];
      if (k.source === 'interior' && b && b.slots && KB && UI) KB.SLOTS.filter(function (s) { return s.budgetCat === k.key; }).forEach(function (s) {
        var e = b.slots[s.key], it = KB.item(e.sku), rooms = Object.keys(b.roomSlots || {}).filter(function (z) { return b.roomSlots[z][s.key] && KB.item(b.roomSlots[z][s.key].sku) && KB.inZone(s, z); });
        if (!rooms.length) { if (it) out.push({ p: UI.product(it), bg: UI.tileBg(it, 44, 44), sub: s.name, sum: R.materialsSum('flat', { board: b, slot: s.key }) }); return; }
        /* замена «только здесь» — своей строкой: количество и сумма этой комнаты; у общего материала — остальные комнаты */
        var pz = m.pz || R.planZones(), rest = R.materialsSum('flat', { board: b, slot: s.key, plan: pz }), left = 1;
        function nameOf(x, q) { return x.name + ' · ' + (x.unit === 'компл.' ? 'комплект' : String(Math.round(q * 10) / 10).replace('.', ',') + ' ' + x.unit); }
        rooms.forEach(function (z) { var ov = b.roomSlots[z][s.key], io = KB.item(ov.sku), zs = R.materialsSum(z, { board: b, slot: s.key, plan: pz }); rest -= zs; left -= R.zoneShare(s.key, z, pz, it); out.push({ p: UI.product(io), name: nameOf(io, ov.qty * R.zoneShare(s.key, z, pz, io)), bg: UI.tileBg(io, 44, 44), sub: s.name + ' · ' + KB.zone(z).name, sum: zs }); });
        if (it) out.push({ p: UI.product(it), name: nameOf(it, e.qty * left), bg: UI.tileBg(it, 44, 44), sub: s.name, sum: rest });
      });
      if (k.key === 'furniture' && m.P && m.P.T) (m.P.T.goods || []).forEach(function (g) { var p = D.product(g.id); if (p) out.push({ p: p, sub: g.label + (g.room ? ' · ' + g.room : ''), sum: p.metod }); });
      if (k.key === 'decor') {
        var rows = R.cart.rows().filter(function (x) { return x.product && x.product.category === 'Текстиль и декор'; });
        var ids = rows.length ? rows.map(function (x) { return x.product.id; }) : (KB && b && KB.capsule(b.capsuleId || b.baseCapsuleId || '') || { decor: [] }).decor;
        ids.forEach(function (id) { var p = D.product(id); if (p) out.push({ p: p, sub: p.brand || '', sum: p.metod }); });
      }
      /* бюджет посчитан по капсуле (расчёт, без доски Интерьера и расстановки): каждая категория раскрывается позициями капсулы с фото из каталога
         (Алина 10.11) — товары каталога этой капсулы; где их в каталоге нет (двери, розетки) — материалы капсулы из базы отделки. Цена — METOD за позицию */
      if (!out.length) {
        var f = R.flats.active() || {}, cid = (b && (b.capsuleId || b.baseCapsuleId)) || f.capsuleId || '';
        var CAT = { 'Отделка': 'finish', 'Освещение': 'light', 'Сантехника': 'plumbing', 'Мебель': 'furniture', 'Техника': 'appliances', 'Текстиль и декор': 'decor' };
        if (cid) D.products.forEach(function (p) { if ((p.capsules || []).indexOf(cid) >= 0 && CAT[p.category] === k.key) out.push({ p: p, sub: p.subcat || p.brand || '', sum: p.metod }); });
        var kc = !out.length && cid && KB && KB.capsule ? KB.capsule(cid) : null;
        if (kc && kc.slots && UI) KB.SLOTS.filter(function (x) { return x.budgetCat === k.key; }).forEach(function (x) {
          var sl = kc.slots[x.key], sku = sl && (typeof sl === 'string' ? sl : (m.type === 'premium' && sl.premium) || sl.base), it = sku && KB.item(sku);
          if (it) out.push({ p: UI.product(it), bg: UI.tileBg(it, 160, 120), sub: x.name, sum: null });
        });
      }
      return out;
    }
    /* категория раскрывается на месте витриной, как каталог Маркета (Алина 10.11): карточки с фото, ценой METOD, ♡ и 🛒 — заказать можно прямо отсюда.
       Никуда не уводим: строка — кнопка «раскрыть», карточка — не ссылка, ссылок «в Интерьер / в Маркет» нет */
    function kitRow(k, m, lock) {
      var open = !!ui$.open[k.key], api = !lock && m.api && S.budgetApi && k.key !== 'visuals' ? S.budgetApi.catRows(m.api, k.key) : null;
      if (api) {   /* серверный расчёт: позиции категории его строками — те же, что в Excel (комната · тип · количество · сумма METOD) */
        var h0 = row({ th: thumb(k, m), title: k.title + (api.length ? ' · ' + api.length : ''), plan: k.plan, paid: k.paid, fin: api.length ? k.key : null, lock: lock, open: open, href: '#' });
        return (!api.length || !open) ? h0 : h0 + '<div class="bg-goods">' + (S.budgetApi.goodsHtml ? S.budgetApi.goodsHtml(api) : window.SOVE_BUDGET.linesHtml(api.map(function (c) { return (c[0] ? c[0] + ' · ' : '') + c[4] + ' · ' + String(c[2]).replace('.', ',') + ' ' + c[3] + ' · ' + rub(c[8]); }))) +
          (m.noSwap ? '' : '<a class="bg-goods__go" href="' + (hrefOf(k, m) || 'interior.html?v=b&from=budget') + '">' + (k.source === 'interior' ? 'Заменить в Интерьере ›' : 'В Маркет ›') + '</a>') + '</div>';
      }
      var goods = lock ? [] : goodsOf(k, m);
      var html = row({ th: thumb(k, m), title: k.title + (goods.length ? ' · ' + goods.length : ''), plan: k.plan, paid: k.paid, href: hrefOf(k, m) || 'interior.html?v=b&from=budget', fin: goods.length ? k.key : null, lock: lock, open: open });
      if (!goods.length || !open) return html;
      return html + '<div class="bg-goods">' + goods.map(function (g) {
        var p = g.p;
        return '<div class="bg-p"><a class="bg-p__pic" href="product.html?id=' + p.id + '" style="' + (g.bg ? 'background:' + g.bg : 'background-image:url(' + esc(p.img) + ')') + '"></a>' +
          '<a class="bg-p__b" href="product.html?id=' + p.id + '"><small>' + esc(g.sub) + '</small><b>' + esc(g.name || p.name) + '</b><em>' + rub(g.sum) + '</em></a><span class="bg-p__a">' + R.btns(p, 'budget') + '</span></div>';
      }).join('') +
        (k.key === 'finish' && k.rooms ? '<div class="bg-rooms">' + k.rooms.map(function (r) { return '<a href="interior.html?v=b&room=' + r.id + '&from=budget"><span>' + esc(r.name) + '</span><span><b>' + rub(r.plan) + '</b><i>›</i></span></a>'; }).join('') + '</div>' : '') +
        (k.byNorm ? '<small class="bg-note bg-note--l">Итог строки: норма расчёта и разница от замен. Суммы образцов показаны для справки.</small>' : k.cartApart ? '<small class="bg-note bg-note--l">Итог строки: норма расчёта. Покупка в корзине её не меняет.</small>' : '') +
        '<a class="bg-goods__go" href="' + (hrefOf(k, m) || 'interior.html?v=b&from=budget') + '">' + (k.source === 'interior' ? 'Заменить в Интерьере ›' : k.source === 'planirovka' ? 'Изменить в Планировке ›' : 'В Маркет ›') + '</a></div>';
    }
    /* «По комнатам» (созвон 28.10, логика таблиц дизайнеров — ТЗ Алины 06.11): комната → категории → сумма; только материалы, те же цифры, что в «По категориям», в одном стиле (SOVE_BUDGET.byRooms, budget.js).
       Комнаты — из расчёта (rp.scoutParams.byRooms), иначе из плана квартиры (R.planZones), иначе типовые зоны по площади с пометкой. Последняя строка — «Общее»: двери.
       Σ строк = «Итого по материалам»; работы и черновые — в блоке «Работы» ниже. «Заменить материалы ›» — в Интерьер с зоной. */
    function roomsSrc() {
      var r = R.get(), br = r.scoutParams && r.scoutParams.byRooms;
      if (br && br.length) return br.filter(function (x) { return !x.common; }).map(function (x) { return { name: x.name, zone: x.zone, area: x.area, typical: !!x.typical }; });
      var pz = R.planZones();
      if (pz.exact && pz.units && pz.units.length) return pz.units.map(function (u) { return { name: u.name, zone: u.type, area: u.m2 }; });
      return [];
    }
    /* комнаты для экрана и для Excel: у каждой строки материалы по рынку, METOD и экономия; Σ по рынку = «Рыночная цена», Σ METOD = «Итого по материалам» */
    function roomsModel(m) {
      var B = window.SOVE_BUDGET, T = m.totals, mk = (S.data && S.data.scout && S.data.scout.retailMarkup) || 1; if (!B || !B.byRooms || T.plan === null) return null;
      if (!m.savedRooms) return B.byRooms({ rooms: roomsSrc(), area: m.area, marketTotal: T.kitMarket || 0, base: m.api && S.budgetApi ? S.budgetApi.rooms(m.api) : null, cats: m.kit.map(function (k) { return { key: k.key, title: k.title, sum: k.plan || 0, market: k.market === null || k.market === undefined ? k.plan || 0 : k.market, parts: k.parts, norm: k.norm }; }) });
      /* строки из сохранённого расчёта — как в Расчёте; рынок — той же наценкой, остаток округления в последнюю комнату */
      var sr = m.savedRooms.map(function (x) { return Object.assign({}, x, { market: typeof x.market === 'number' ? x.market : Math.round(x.kit * (T.kit ? T.kitMarket / T.kit : mk)) }); });
      var diff = (T.kitMarket || 0) - sr.reduce(function (a, x) { return a + x.market; }, 0), own = sr.filter(function (x) { return !x.common && x.market > 0; });
      if (diff && own.length) own[own.length - 1].market += diff;
      return B.roomsTotals(sr, sr.some(function (x) { return x.typical; }));
    }
    function roomsBlock(m) {
      /* по комнатам — только комплектация, одна сумма на комнату (Алина 10.11); комнаты и суммы — из серверного расчёта (budget-api.rooms),
         раскрытие — позиции комнаты из его строк */
      var B = window.SOVE_BUDGET, T = m.totals; if (!B || T.plan === null) return '';
      var src = m.savedRooms || roomsSrc(), o = null;
      if (m.savedRooms) { var sr = m.savedRooms, tt = function (f) { return sr.reduce(function (a, x) { return a + (Number(x[f]) || 0); }, 0); }; o = { rooms: sr, typical: sr.some(function (x) { return x.typical; }), kit: tt('kit') }; }
      else if (m.api && S.budgetApi) { var ao = S.budgetApi.rooms(m.api); o = { rooms: ao.rooms, typical: ao.typical, kit: ao.kit }; }
      else if (B.byRooms) o = B.byRooms({ rooms: src, area: m.area, works: T.works || 0, roughMat: (m.roughMat && m.roughMat.sum) || 0, cats: m.kit.map(function (k) { return { key: k.key, title: k.title, sum: k.plan || 0 }; }) });
      if (!o || !o.rooms || !o.rooms.length) return '';
      var typical = o.typical || src.some(function (x) { return x.typical; });
      function roomLines(x) {
        if (!(m.api && S.budgetApi)) return '';
        var rs = []; m.kit.forEach(function (k) { S.budgetApi.catRows(m.api, k.key).forEach(function (c) { if (c[0] === x.name) rs.push(c[4] + ' · ' + String(c[2]).replace('.', ',') + ' ' + c[3] + ' · ' + rub(c[8])); }); });
        return rs.length ? B.linesHtml(rs) : '';
      }
      var rows = o.rooms.map(function (x, i) {
        var open = !!ui$.rooms[i], g = open ? roomLines(x) : '';
        return '<div class="bg-rm' + (open ? ' is-open' : '') + (x.common ? ' bg-rm--common' : '') + '">' +
          '<button type="button" class="bg-rm__r" data-rm="' + i + '" aria-expanded="' + open + '">' +
            '<span class="bg-rm__n"><b>' + esc(x.name) + '</b><small>' + (x.common ? 'на всю квартиру' : F.area(x.area)) + '</small></span><b class="bg-rm__sum">' + rub(x.kit) + '</b><span class="bg-rm__a">' + (open ? '▴' : '▾') + '</span></button>' +
          (open ? '<div class="bg-goods">' + (g || '<small class="bg-mk__no">Позиции этой комнаты появятся после подбора</small>') + '</div>' : '') + '</div>';
      }).join('');
      return '<div class="fr-h"><b class="sq-group">По комнатам</b><span>' + rub(o.kit) + '</span></div>' +
        (typical ? '<small class="bg-note bg-note--l">Типовые зоны · загрузите план, чтобы считать точно</small>' : '') +
        '<div class="bg-list bg-rms">' + rows + '<div class="bg-rm bg-rm--sum"><span class="bg-rm__n"><b>Вся квартира</b><small>' + (m.area ? F.area(m.area) : '') + '</small></span><b class="bg-rm__sum">' + rub(o.kit) + '</b><span class="bg-rm__a"></span></div></div>';
    }
    function favRow() {
      var items = [];
      R.flats.list().forEach(function (fl) { var x = R.get(fl.id).interior; if (x && x.slots && x.imageUrl) items.push('<a class="bg-fv" href="interior.html?v=b&from=budget&flat=' + encodeURIComponent(fl.id) + '"><span style="background-image:url(' + esc(x.imageUrl) + ')"></span><b>' + esc(x.name || x.style) + '</b><small>интерьер</small></a>'); });
      R.favSets.list().forEach(function (x) { var n = (x.productIds || []).length; items.push('<a class="bg-fv" href="favorites.html"><span' + (x.cover ? ' style="background-image:url(' + esc(x.cover) + ')"' : '') + '><i>♥</i></span><b>' + esc(x.title) + '</b><small>подборка · ' + n + ' тов.</small></a>'); });
      R.fav.list().forEach(function (id) { var p = S.data.product(id); if (p && p.img) items.push('<a class="bg-fv" href="product.html?id=' + p.id + '"><span style="background-image:url(' + esc(p.img) + ')"><i>♡</i></span><b>' + esc(p.name) + '</b><small>' + F.rub(p.metod) + '</small></a>'); });
      if (!items.length) items.push('<a class="bg-fv bg-fv--add" href="market.html"><span>♡</span><b>Пока пусто</b><small>нажми ♡ в Маркете</small></a>');
      return '<div class="bg-h"><b>Избранное</b><a href="favorites.html">Все ›</a></div><div class="bg-fvs">' + items.join('') + '</div>';
    }
    /* что клиент должен знать про эти цифры: замена материала сюда не дойдёт (другой расчёт, другой интерьер) и площадь плана не совпадает с расчётом. Молча не складываем */
    function calcNotes(m) {
      var out = [], it = R.get().interior, planM2 = ((R.get().plan || {}).rooms || []).reduce(function (a, x) { return a + (x.m2 || 0); }, 0);   /* только свой сохранённый план: открытый пример Планировки клиента не касается */
      if (m.noSwap) out.push(m.noSwap === 'picks' ? 'Бюджет посчитан по подборке. Замена материалов его не меняет.' : 'Этот расчёт не связан с материалами Интерьера, замена материалов его не меняет.');
      else if (m.saved && it && it.slots && !R.boardOfCapsule(it, m.capsuleId)) {
        var c = S.data.capsule(m.capsuleId);
        out.push('Бюджет посчитан по капсуле «' + esc(c ? c.name : '') + '», а в Интерьере «' + esc(it.name || it.style || 'другой интерьер') + '». Замены в нём в этот бюджет не идут.' + (it.source === 'capsule' ? '' : ' <a href="scout.html?from=interior">Досчитать бюджет по этому интерьеру ›</a>'));
      }
      /* площадь квартиры сверяем так же, как площадь плана: Интерьер уже считает на неё, а этот бюджет — на свою */
      var fl = R.flats.active(), flatM2 = fl && fl.m2 > 0 ? fl.m2 : 0, off = planM2 && m.area && Math.abs(planM2 - m.area) > .5 ? ['в плане', Math.round(planM2 * 10) / 10] : flatM2 && m.area && Math.abs(flatM2 - m.area) > .5 ? ['у квартиры', Math.round(flatM2 * 10) / 10] : null;
      if (off) out.push('В расчёте ' + esc(F.area(m.area)) + ', ' + off[0] + ' ' + esc(F.area(off[1])) + '. Работы и материалы посчитаны на площадь расчёта. <a href="scout.html?from=budget' + (m.capsuleId ? '&capsule=' + encodeURIComponent(m.capsuleId) : '') + '">Пересчитать бюджет ›</a>');
      return out.map(function (n) { return '<small class="bg-note bg-note--l">' + n + '</small>'; }).join('');
    }
    function lower(t) { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); }
    /* «Пол: ламинат → керамогранит +368 875 ₽» */
    function changeText(c) { return c.slotName + ': ' + c.from + ' → ' + c.to + ' ' + (c.amount < 0 ? '−' : '+') + F.rub(Math.abs(c.amount)); }
    function draw() {
      var m = model();
      root.className = 'bg';
      if (m.partial) {
        var rows = m.kit.map(function (k) { return k.known ? kitRow(k, m, false) : row({ th: thumb(k, m), title: k.title, lock: true, go: 'scout.html?from=interior' }); }).join('');
        root.innerHTML = '<header class="bg-head"><a href="my.html?v=center" aria-label="Назад в Мой ремонт">‹</a><h1>Бюджет</h1><span></span></header><div class="bg-body">' +
          '<div class="bg-cards"><div class="bg-card bg-card--plan"><small>Известно</small><b>≈ ' + rub(m.sum) + '</b><small>' + m.known + ' из 9 категорий · материалы из Интерьера</small></div></div>' +
          '<a class="bg-btn bg-btn--a" href="scout.html?from=interior">Досчитать весь бюджет</a><small class="bg-note">работы, мебель и остальное — при расчёте; интерьер и план уже подставлены</small>' +
          '<div class="bg-h"><b>По категориям</b></div><div class="bg-list">' + rows + '</div>' +
          '<div class="bg-h"><b>Работы</b><small>посчитаем при расчёте</small></div>' + favRow() + '</div>';
        return;
      }
      if (m.empty) {
        root.innerHTML = '<header class="bg-head"><a href="my.html?v=center" aria-label="Назад в Мой ремонт">‹</a><h1>Бюджет</h1><span></span></header><div class="bg-body">' +
          '<div class="bg-empty"><b>Бюджет появится после расчёта ремонта</b><small>Посчитаем работы и комплектацию по твоей квартире</small>' +
          (m.plan ? '<button type="button" class="bg-btn" data-bud="buy">Рассчитать бюджет</button>' : '<a class="bg-btn" href="scout.html?from=budget">Рассчитать бюджет</a>') + '</div>' + favRow() + '</div>';
        return;
      }
      var T = m.totals, fig = m.figure, lock = false;
      if (m.kit[0].rooms) { var rs = sum(m.kit[0].rooms, 'plan'); if (rs !== m.kit[0].plan) console.warn('Отделка: комнаты ' + rs + ' ≠ строке ' + m.kit[0].plan); }
      var pct = fig ? Math.round(T.paid / fig * 100) : 0, left = fig === null ? null : Math.max(0, fig - T.paid);
      root.className = 'bg fr';
      root.innerHTML =
        '<header class="bg-head"><a href="my.html?v=center" aria-label="Назад в Мой ремонт">‹</a><h1>Бюджет</h1><span></span></header>' +
        '<div class="bg-body">' +
        /* план и факт (Алина 25.10): «Фактический» — это оплачено по Заказам; полоски — доля от плана */
        hero(m, fig, T, pct, left, lock) + calcNotes(m) +
        '<div class="fr-h"><b class="sq-group">По категориям</b>' + (m.full ? '<span class="bg-type" role="group" aria-label="Тип бюджета"><button type="button" data-bud-type="base" aria-pressed="' + (m.type !== 'premium') + '">База</button><button type="button" data-bud-type="premium" aria-pressed="' + (m.type === 'premium') + '">Премиум</button></span>' : '') + '</div>' +
        '<div class="bg-list">' + m.kit.map(function (k) { return kitRow(k, m, lock && k.key !== 'furniture'); }).join('') + '</div>' +
        '<div class="fr-h"><b class="sq-group">Строительные работы</b>' + (lock ? '' : '<span>' + rub(T.worksAndRough) + '</span>') + '</div>' +
        (!lock && !T.worksAndRough && (m.works || []).every(function (w) { return !w.plan; }) ? '<small class="bg-note bg-note--l">Без строительных работ: в расчёте выбрано «Делаю сам». Нужна смета работ — <a href="scout.html?from=budget">пересчитайте</a> с другим вариантом.</small>' : '') +
        (lock ? '<button type="button" class="bg-btn" data-bud="buy">✦ Узнать весь бюджет</button>' :
          '<div class="bg-list">' + m.works.map(function (w) {
            /* строки этапа — из серверной сметы (budget-api.workRows), без ответа сервера — примеры этапа из WORKS */
            var wo = !!ui$.works[w.key], api = m.api && S.budgetApi ? S.budgetApi.workRows(m.api) : null,
              lines = api ? (api[w.key] || []).map(function (l) { return l[0] + ' · ' + F.num(l[3]) + ' ' + l[1] + ' × ' + rub(l[2]) + ' = ' + rub(l[4]); }) : window.SOVE_BUDGET.workLines(w.key);
            return row({ th: '<span class="bg-th bg-th--n">' + (w.done ? '✓' : w.n) + '</span>', title: w.title, plan: w.plan, paid: 0, fin: lines.length ? 'w:' + w.key : null, plain: !lines.length, open: wo }) +
              (wo && lines.length ? '<div class="bg-goods">' + window.SOVE_BUDGET.linesHtml(lines) + '</div>' : '');
          }).join('') +
            (m.saved && !m.roughMat.sum ? '' : row({ th: '<span class="bg-th bg-th--n">＋</span>', title: 'Черновые материалы', plan: m.roughMat.sum, paid: 0, plain: true })) + '</div>' +
          roomsBlock(m) +
          /* общая кнопка «Скачать», потом формат — как на финальной странице расчёта (Алина 10.11); Excel формируется, PDF в прототипе нет */
          '<div class="fr-dl fr-dl--wide"><button type="button" class="btn btn--ghost" data-dl-toggle aria-expanded="false" aria-haspopup="true">Скачать ▾</button>' +
            '<div class="fr-dl__menu" hidden><button type="button" data-xls="kit">Материалы · Excel</button><button type="button" data-xls="works">Смета работ · Excel</button><button type="button" data-dl-pdf>PDF</button></div></div>') +
        favRow() + '</div>';
    }

    /* ── Excel как образец Алины (смета №684): настоящий .xlsx с оформлением образца — тёмные полосы шапки и этапов, ширины столбцов, суммы вида «3 224 148 ₽», закреплённая шапка. Два файла, две кнопки, один клик — одна загрузка.
       Материалы: ИТОГ · По комнатам · лист на категорию. Смета работ: один лист, группы по 5 этапам. Без контактов, промокодов, ссылок и фото ── */
    var XLS_ORDER = ['finish', 'light', 'sockets', 'plumbing', 'appliances', 'furniture', 'furniture_custom', 'doors', 'decor'], XLS_TITLE = { plumbing: 'Сантехника и оборудование' };
    var XLS_UNIT = { 'м²': 'кв.м.', 'м': 'м/п', 'шт': 'шт.' };
    /* цвета образца */
    var X_DARK = '434343', X_ACC = 'A05035', X_GR = '515151', X_INK = '1D1D1D', X_W = 'FFFFFF', X_INFO = 'F3F3F3', X_Z = 'F7F7F7';
    /* столбцы листа (столбец A — узкое поле, как в образце) и роль столбца в обычной строке */
    var X_LAY = { itog: { w: [38, 22.4, 22, 32.3], row: ['t', 'm0', 'm1', 'mg'], fix: true }, rooms: { w: [30, 8, 20, 20, 18], row: ['t', 'c', 'm0', 'm1', 'mg'], fix: true },
      cat: { w: [24, 20, 9, 8, 42, 15, 15, 16, 16], row: ['t', 't', 'c', 'c', 't', 'm0', 'm0', 'm0', 'm1'], fix: true }, works: { w: [54, 10, 14, 10, 17, 30], row: ['t', 'c', 'm0', 'c', 'm1', 'n'] } };
    /* b жирный · c цвет · f заливка · h выравнивание · r формат суммы · w перенос · e линия снизу · s размер шрифта · u полоса снизу */
    var X_ROLE = { t: { c: X_INK, w: 1 }, c: { c: X_GR, h: 'center' }, m0: { c: X_GR, h: 'center', r: 1 }, m1: { b: 1, c: X_INK, h: 'center', r: 1 }, mg: { b: 1, c: '2D6A4F', h: 'center', r: 1 }, n: { c: X_GR, w: 1, s: 9 } };
    /* вид строки: merge — на всю ширину листа, ht — высота; нет вида — обычная строка в полоску */
    var X_KIND = { brand: { merge: 1, ht: 54, st: { b: 1, s: 18, c: X_W, f: X_DARK, u: X_ACC } }, sub: { merge: 1, st: { c: '666666' } }, lvl: { merge: 1, st: { b: 1 } }, band: { merge: 1, ht: 25.5, st: { b: 1, c: X_W, f: X_DARK } },
      stageHead: { merge: 1, ht: 21, st: { b: 1, c: X_W, f: X_GR } }, date: { merge: 1, ht: 25.5, st: { b: 1, c: X_W, f: X_ACC } }, note: { merge: 1, wrap: 1, st: { c: '999999', s: 9, w: 1 } }, legal: { merge: 1, wrap: 1, st: { c: 'B7B7B7', s: 9, w: 1 } },
      il: { ht: 18, st: { c: '6B7280', f: X_INFO, w: 1 } }, iv: { ht: 25.5, st: { b: 1, c: '1E2228', f: X_INFO, h: 'left', e: 1 } }, head: { ht: 28.5, st: { b: 1, c: X_W, f: X_DARK, h: 'center', w: 1, e: 1 } },
      stage: { zebra: 1, num: { c: X_INK } }, total: { ht: 30, role: 1, st: { b: 1, c: X_W, f: X_ACC, e: 1 } }, dark: { ht: 25.5, role: 1, st: { b: 1, c: X_W, f: X_GR } }, per: { ht: 21, role: 1, st: { c: X_GR, f: X_Z, e: 1 } }, stageSum: { ht: 22.5, role: 1, st: { b: 1, c: X_INK, f: X_INFO, e: 1 }, num: { c: X_ACC } } };
    function rk(kind, row) { row.k = kind; return row; }
    function xmlText(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function xlSheet(name, rows, lay) { return { name: String(name).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31), rows: rows, lay: X_LAY[lay] }; }
    function colName(i) { return String.fromCharCode(65 + i); }
    /* стили книги: одинаковые описания — один стиль */
    function xlStyles() {
      var fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = [], xfs = [], seen = {};
      function idx(list, x) { var i = list.indexOf(x); if (i < 0) { list.push(x); i = list.length - 1; } return i; }
      function id(o) {
        var key = JSON.stringify(o); if (seen[key] !== undefined) return seen[key];
        var fo = idx(fonts, '<font>' + (o.b ? '<b/>' : '') + '<sz val="' + (o.s || 10) + '"/><color rgb="FF' + (o.c || '000000') + '"/><name val="Arial"/><family val="2"/></font>');
        var fi = o.f ? idx(fills, '<fill><patternFill patternType="solid"><fgColor rgb="FF' + o.f + '"/><bgColor indexed="64"/></patternFill></fill>') : 0;
        var bo = idx(borders, '<border><left/><right/><top/>' + (o.u ? '<bottom style="thick"><color rgb="FF' + o.u + '"/></bottom>' : o.e ? '<bottom style="thin"><color rgb="FFE5E5E5"/></bottom>' : '<bottom/>') + '<diagonal/></border>');
        xfs.push('<xf numFmtId="' + (o.r ? 164 : 0) + '" fontId="' + fo + '" fillId="' + fi + '" borderId="' + bo + '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"' + (o.h ? ' horizontal="' + o.h + '"' : '') + (o.w ? ' wrapText="1"' : '') + '/></xf>');
        return (seen[key] = xfs.length - 1);
      }
      id({});
      return { id: id, xml: function () {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#\\ ##0\\ &quot;₽&quot;"/></numFmts>' +
          '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts><fills count="' + fills.length + '">' + fills.join('') + '</fills><borders count="' + borders.length + '">' + borders.join('') + '</borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
      } };
    }
    /* лист: строка значений и вид строки → ячейки; высота строки с длинным текстом считается: Excel сам её не поднимает */
    function xlSheetXml(sh, first, sty, str) {
      var lay = sh.lay, n = lay.w.length, widthAll = lay.w.reduce(function (a, x) { return a + x; }, 0), zebra = 0, merges = [], freeze = 0;
      function linesOf(text, width) { return Math.max(1, Math.ceil(String(text).length / (width * 1.05))); }
      var data = sh.rows.map(function (row, i) {
        var r = i + 1, kind = X_KIND[row.k], cells = [], ht = kind && kind.ht || 21;
        if (!row.length) { zebra = 0; return ''; }
        if (row.k === 'head' && lay.fix) freeze = r;
        if (kind && kind.merge) {
          if (kind.st.f) cells.push('<c r="A' + r + '" s="' + sty.id(kind.st) + '"/>');
          merges.push('B' + r + ':' + colName(n) + r);
          if (kind.wrap) ht = linesOf(row[0], widthAll) * 13 + 4; else if (!kind.ht) ht = 16;
        }
        var z = zebra++ % 2 ? X_W : X_Z, cnt = kind && kind.merge ? n : Math.max(n, row.length);
        for (var c = 0; c < cnt; c++) {
          var v = c < row.length ? row[c] : '', role = X_ROLE[lay.row[c]] || X_ROLE.t, st;
          if (!kind || kind.zebra) { st = Object.assign({}, role, { f: z, e: 1 }, kind && typeof v === 'number' ? kind.num : null); if (st.w && typeof v === 'string' && v) ht = Math.max(ht, linesOf(v, lay.w[c]) * 13 + 8); }
          else if (kind.role) { st = Object.assign({}, kind.st, { r: role.r, h: c ? role.h || 'center' : 'left' }); if (kind.num && typeof v === 'number') st = Object.assign(st, kind.num); }
          else st = kind.st;
          var ref = colName(c + 1) + r, sid = sty.id(st);
          if (typeof v === 'number') cells.push('<c r="' + ref + '" s="' + sid + '"><v>' + Math.round(v * 10) / 10 + '</v></c>');
          else if (v === '' || v === null || v === undefined) cells.push('<c r="' + ref + '" s="' + sid + '"/>');
          else cells.push('<c r="' + ref + '" s="' + sid + '" t="s"><v>' + str(v) + '</v></c>');
        }
        if (kind && !kind.zebra) zebra = 0;
        return '<row r="' + r + '" ht="' + ht + '" customHeight="1">' + cells.join('') + '</row>';
      }).join('');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0"' + (first ? ' tabSelected="1"' : '') + ' workbookViewId="0">' +
        (freeze ? '<pane ySplit="' + freeze + '" topLeftCell="A' + (freeze + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (freeze + 1) + '" sqref="A' + (freeze + 1) + '"/>' : '') + '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>' +
        '<cols><col min="1" max="1" width="0.7" customWidth="1"/>' + lay.w.map(function (w, i) { return '<col min="' + (i + 2) + '" max="' + (i + 2) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' +
        '<sheetData>' + data + '</sheetData>' + (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map(function (x) { return '<mergeCell ref="' + x + '"/>'; }).join('') + '</mergeCells>' : '') + '</worksheet>';
    }
    /* архив .xlsx без сжатия: файл маленький, библиотека не нужна */
    var CRC_T = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function le(list) { var n = list.reduce(function (a, x) { return a + x[1]; }, 0), u = new Uint8Array(n), p = 0; list.forEach(function (x) { for (var i = 0; i < x[1]; i++) u[p++] = (x[0] >>> (8 * i)) & 255; }); return u; }
    function zipOf(files) {
      var enc = new TextEncoder(), parts = [], dir = [], pos = 0, d = new Date(), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      files.forEach(function (f) {
        var name = enc.encode(f[0]), body = enc.encode(f[1]), crc = crc32(body), same = [[20, 2], [0x0800, 2], [0, 2], [0, 2], [date, 2], [crc, 4], [body.length, 4], [body.length, 4], [name.length, 2], [0, 2]];
        var lh = le([[0x04034b50, 4]].concat(same)); parts.push(lh, name, body);
        dir.push(le([[0x02014b50, 4], [20, 2]].concat(same, [[0, 2], [0, 2], [0, 2], [0, 4], [pos, 4]])), name);
        pos += lh.length + name.length + body.length;
      });
      var size = dir.reduce(function (a, x) { return a + x.length; }, 0);
      return new Blob(parts.concat(dir, [le([[0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2], [size, 4], [pos, 4], [0, 2]])]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    function book(file, sheets) {
      var sty = xlStyles(), strs = [], seen = {}, refs = 0, list = sheets.filter(Boolean);
      function str(v) { var t = String(v); refs++; if (seen[t] === undefined) { seen[t] = strs.length; strs.push(t); } return seen[t]; }
      var xmls = list.map(function (sh, i) { return xlSheetXml(sh, i === 0, sty, str); }), head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      var files = [['[Content_Types].xml', head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          list.map(function (x, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'],
        ['_rels/.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
        ['xl/workbook.xml', head + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + list.map(function (x, i) { return '<sheet name="' + xmlText(x.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>'],
        ['xl/_rels/workbook.xml.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + list.map(function (x, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
          '<Relationship Id="rId' + (list.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId' + (list.length + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>']]
        .concat(xmls.map(function (x, i) { return ['xl/worksheets/sheet' + (i + 1) + '.xml', x]; }))
        .concat([['xl/styles.xml', sty.xml()], ['xl/sharedStrings.xml', head + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + refs + '" uniqueCount="' + strs.length + '">' + strs.map(function (t) { return '<si><t xml:space="preserve">' + xmlText(t) + '</t></si>'; }).join('') + '</sst>']]);
      var a = document.createElement('a'); a.href = URL.createObjectURL(zipOf(files)); a.download = file;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function fileNo() { var q = S.scout && S.scout.requests ? S.scout.requests()[0] : null; return q && q.number ? '_' + q.number : ''; }
    function xlsHead(m, title) {
      /* расчёт по картинкам сохраняется без капсулы (capsuleId: null): капсула доски к нему не относится */
      var f = R.flats.active() || {}, r = R.get(), boardId = r.interior && (r.interior.capsuleId || r.interior.baseCapsuleId), own = !m.boardRule && !m.full && !!r.budget && r.budget.capsuleId === null;
      /* строки материалов взяты с доски (своя или другая капсула, правило 5.1) — капсула доски; иначе капсула посчитанного бюджета */
      var id = m.boardRule ? boardId || null : own ? null : (m.full && m.capsuleId) || (r.budget && r.budget.capsuleId) || (r.scoutParams && r.scoutParams.capsuleId) || boardId || null, c = id ? S.data.capsule(id) : null;
      /* комнаты и санузлы — как их заполнил клиент, иначе из расчёта (те же, что в «По комнатам»); город — только если он известен */
      var rm = roomsModel(m), own0 = rm ? rm.rooms.filter(function (x) { return !x.common; }) : [];
      var nRooms = f.rooms === null || f.rooms === undefined ? own0.length || '' : f.rooms, nBaths = f.baths === null || f.baths === undefined ? (own0.length ? own0.filter(function (x) { return x.zone === 'bathroom'; }).length : '') : f.baths;
      /* серверный расчёт: «Кол-во комнат» — как в калькуляторе (формат квартиры: студия 1 … евро-5 5), санузлы — из расчёта */
      if (m.api && m.api.flat) { if (f.rooms === null || f.rooms === undefined) nRooms = m.api.flat.format_code || nRooms; if (f.baths === null || f.baths === undefined) nBaths = m.api.flat.bathrooms || nBaths; }
      return [rk('brand', ['SOVE.APP']), rk('sub', ['Платформа выгодного ремонта'])].concat(title ? [rk('sub', [title])] : []).concat([rk('lvl', [(m.type === 'premium' ? 'ПРЕМИУМ' : 'БАЗОВЫЙ') + (c && c.code ? ' Капсула ' + String(c.code).replace(/^К/, '') : own ? ' Подборка по картинкам' : '')]), rk('band', ['ИНФОРМАЦИЯ ОБ ОБЪЕКТЕ']),
        rk('il', ['Город', 'Площадь, м²', 'Кол-во комнат', 'Кол-во санузлов']), rk('iv', [f.city || 'Москва', m.area || '', nRooms, nBaths]), []]);
    }
    /* этапы всегда пять, как в образце: скрытый на экране нулевой этап здесь = 0 */
    function xlsStages(m) { var B = window.SOVE_BUDGET; return B.WORKS.map(function (w) { var x = m.works.filter(function (y) { return y.key === w[0]; })[0]; return { key: w[0], title: w[1], plan: x ? x.plan : 0, plan0: x && typeof x.plan0 === 'number' ? x.plan0 : x ? x.plan : 0, changes: x && x.changes || [] }; }); }
    function perM2(m, v) { return m.area ? Math.round(v / m.area) : ''; }
    /* строки листа категории: с доской — слот на комнату (суммы те же, что в «По комнатам»), количество по доле, у «компл.» пусто; иначе — строка на комнату из byCat по норме. По порядку комнат, рынок до рубля */
    function catRows(k, m, rm) {
      var B = window.SOVE_BUDGET, KB = window.SOVE_KB, b = R.get().interior, mk = (S.data.scout && S.data.scout.retailMarkup) || 1, rows = [], own = rm ? rm.rooms.filter(function (x) { return !x.common; }) : [], rule = B.ROOM_RULES[k.key] || null;
      var kk = k.plan ? (k.market || 0) / k.plan : mk, normName = k.byNorm || k.source === 'scout' || k.source === 'norm' || !TAG[k.source] ? 'по норме ₽/м² расчёта' : 'из блока ' + TAG[k.source].toLowerCase(), taken = {};
      /* счёт от нормы: на замену две строки (снято и поставлено, количество × цена настоящие), остаток комнаты — строкой нормы */
      if (k.byNorm && KB) (k.parts || []).forEach(function (p) {
        var s = KB.slot(p.slot), was = KB.item(p.base), now = KB.item(p.sku), sum0 = function (z) { return Object.keys(z).reduce(function (a, q) { return a + z[q]; }, 0); }, sW = sum0(p.was), sN = sum0(p.now);
        function line(i, name, it, qty, whole, v, sign, tail) { if (v) rows.push({ i: i, c: [name, s.name, it.unit === 'компл.' || !whole ? '' : Math.round(qty * v / whole * 10) / 10, it.unit === 'компл.' ? 'компл.' : (it.unit || ''), it.name + tail, Math.round(it.price * kk), it.price, sign * Math.round(v * kk), sign * v] }); }
        function both(i, name, w, n) { line(i, name, was, p.wasQty, sW, w, -1, ' (снято при замене)'); line(i, name, now, p.nowQty, sN, n, 1, ' (замена)'); taken[i] = (taken[i] || 0) + n - w; }
        if (rule && rule.common) return both(own.length, 'Общее', sW, sN);
        if (!own.length) return both(0, 'Вся квартира', sW, sN);
        var ws = B.mapToRooms(p.was, own, rule, p.only), ns = B.mapToRooms(p.now, own, rule, p.only);
        own.forEach(function (x, i) { both(i, x.name, ws[i], ns[i]); });
      });
      if (!k.byNorm && k.parts && k.parts.length && b && b.slots && KB) k.parts.forEach(function (p) {
        var s = KB.slot(p.slot), e = b.slots[p.slot], it = e && KB.item(e.sku); if (!it) return;
        var price = e.price || it.price, retail = Math.round(price * kk), sums = Object.keys(p.zones).reduce(function (a, z) { return a + p.zones[z]; }, 0); if (!sums) return;
        function add(i, name, v) {
          /* в комнате своя замена «только здесь»: её товар, количество по её цене */
          var ov = own[i] && b.roomSlots && b.roomSlots[own[i].key] && b.roomSlots[own[i].key][p.slot], io = ov && KB.item(ov.sku);
          if (io) { var pr = ov.price || io.price; rows.push({ i: i, c: [name, s.name, io.unit === 'компл.' ? '' : Math.round(v / pr * 10) / 10, io.unit === 'компл.' ? 'компл.' : (io.unit || ''), io.name, Math.round(pr * kk), pr, Math.round(v * kk), v] }); return; }
          var anyOv = Object.keys(b.roomSlots || {}).some(function (z) { return b.roomSlots[z][p.slot]; });   /* в сумме слота чужая цена: количество — по своей */
          rows.push({ i: i, c: [name, s.name, it.unit === 'компл.' ? '' : Math.round((anyOv ? v / price : (e.qty || 0) * v / sums) * 10) / 10, it.unit === 'компл.' ? 'компл.' : (it.unit || ''), it.name, retail, price, Math.round(v * kk), v] });
        }
        if (rule && rule.common) { add(own.length, 'Общее', sums); return; }
        if (!own.length) { add(0, 'Вся квартира', sums); return; }
        B.mapToRooms(p.zones, own, rule, p.only).forEach(function (v, i) { if (v) add(i, own[i].name, v); });
      });
      else if (m.api && S.budgetApi && !k.parts) {
        /* строки товаров серверного расчёта: комната, позиция, количество, цены (задача 2 запуска) */
        S.budgetApi.catRows(m.api, k.key).forEach(function (c) { rows.push({ i: rows.length, c: c }); });
      }
      else if (rm && rm.rooms.length) rm.rooms.forEach(function (x, i) {
        var keys = Object.keys(x.byCat || {}).filter(function (c) { return c === k.key || (k.key === 'furniture' && !B.KIT.some(function (q) { return q[0] === c; })); });
        keys.forEach(function (c) {
          var v = x.byCat[c] - (c === k.key ? taken[i] || 0 : 0); if (!v) return;
          rows.push({ i: i, c: [x.name, c === 'visuals' ? 'Подборка по вашим картинкам' : k.title, '', '', c === 'visuals' ? 'товары из каталога, список в расчёте' : normName, '', '', Math.round(v * kk), v] });
        });
      });
      if (k.byNorm && !(rm && rm.rooms.length)) { var rest0 = (k.plan || 0) - (taken[0] || 0); if (rest0) rows.push({ i: 0, c: ['Вся квартира', k.title, '', '', normName, '', '', Math.round(rest0 * kk), rest0] }); }
      if (!rows.length && k.plan) rows.push({ i: 0, c: ['Вся квартира', k.title, '', '', normName, '', '', k.market, k.plan] });
      rows.sort(function (a, z) { return a.i - z.i; });
      var diff = (k.market || 0) - rows.reduce(function (a, x) { return a + x.c[7]; }, 0); if (diff && rows.length) rows[rows.length - 1].c[7] += diff;
      return rows.map(function (x) { return x.c; });
    }
    function xlsKit(m) {
      var T = m.totals, rb = R.get().budget, d = new Date((rb && rb.ts) || Date.now()).toLocaleDateString('ru-RU'), rm = roomsModel(m), rough = (m.roughMat && m.roughMat.sum) || 0;
      var kit = XLS_ORDER.map(function (key) { return m.kit.filter(function (k) { return k.key === key; })[0]; }).filter(Boolean);
      var itog = xlsHead(m).concat([rk('head', ['КАТЕГОРИЯ', 'РЫНОЧНАЯ ЦЕНА', 'ЦЕНА МЕТОД', 'ВАША ЭКОНОМИЯ'])])
        .concat(kit.map(function (k) { return [XLS_TITLE[k.key] || k.title, k.market, k.plan, (k.market || 0) - (k.plan || 0)]; }))
        .concat([rk('total', ['ИТОГО ПО МАТЕРИАЛАМ', T.kitMarket, T.kit, T.saving]), rk('per', ['Цена за 1 м²', perM2(m, T.kitMarket), perM2(m, T.kit), perM2(m, T.saving)]), []])
        .concat(xlsStages(m).map(function (w) { return rk('stage', ['Этап. ' + w.title, '', '', w.plan]); }))
        .concat([rk('dark', ['ИТОГОВЫЙ РЕЗУЛЬТАТ', '', '', T.works]), ['Цена за черновой материал', '', '', rough], rk('total', ['ИТОГОВАЯ СУММА', '', '', T.worksAndRough]), ['Цена за 1 м²', '', '', perM2(m, T.worksAndRough)], [],
          rk('total', ['Ремонт с комплектацией', '', '', T.plan]), ['Цена за 1 м²', '', '', perM2(m, T.plan)], [],
          rk('note', ['*Цены ориентировочны для Москвы и МО.']), rk('date', ['Дата расчёта: ' + d]),
          rk('note', ['* В работы включены: стройбригада, подрядчики(сборщики мебели, монтаж дверей, потолочники и пр.), черновой материал. Цены ориентировочны для Москвы и МО.']),
          rk('note', ['* Базовый вариант отделки (натяжной потолок, без ровной подрезки напольного покрытия вдоль стен, укладка керамогранита не больше 60/120 и пр.). ']),
          rk('note', ['* Премиум вариант отделки (ГКЛ потолок, пол без плинтуса, укладка широкоформатного керамогранита с подгоном рисунка и пр.)']),
          rk('legal', ['•  Расчёт выполнен на основе данных, введённых пользователем; платформа не проверяет их достоверность и не несёт ответственности за отклонения результатов. Расчёт носит общий информационный характер, не является офертой (ст. 437 ГК РФ), сметой, проектной документацией или профессиональной рекомендацией. Платформа не выполняет строительные и ремонтные работы и не отвечает за их стоимость, сроки и результат.']),
          rk('legal', ['•  Обработка персональных данных осуществляется в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».'])]);
      /* «По комнатам» сразу после ИТОГА (ТЗ Алины, шаг 7): последняя строка таблицы — «Общее», итог отдельно ниже, сумма = «ИТОГО ПО МАТЕРИАЛАМ» */
      var roomsSheet = rm && rm.rooms.length ? xlSheet('По комнатам', [rk('head', ['Комната', 'м²', 'Материалы по рынку', 'Материалы METOD', 'Экономия'])]
        .concat(rm.rooms.map(function (y) { return [y.name, y.common ? '' : y.area, y.market, y.kit, y.saving]; }))
        .concat([[], rk('total', ['ИТОГО ПО МАТЕРИАЛАМ', m.area || '', rm.market, rm.kit, rm.saving])]), 'rooms') : null;
      var sheets = kit.map(function (k) {
        var t = XLS_TITLE[k.key] || k.title;
        /* шапка листа как в образце №684 */
        return xlSheet(t, [rk('brand', ['SOVE.APP']), rk('sub', ['Платформа выгодного ремонта']), [], rk('head', ['Комната', 'Тип', 'Кол-во', 'Ед', 'Наименование', 'Цена розница', 'Цена METOD', 'ИТОГ РОЗНИЦА', 'ИТОГ МЕТОД'])].concat(catRows(k, m, rm)).concat([rk('total', ['ИТОГО: ' + t, '', '', '', '', '', '', k.market, k.plan])]), 'cat');
      });
      return book('Soveapp_scout_plan_budget' + fileNo() + '.xlsx', [xlSheet('ИТОГ', itog, 'itog'), roomsSheet].concat(sheets));
    }
    function xlsWorks(m) {
      var B = window.SOVE_BUDGET, T = m.totals, rough = (m.roughMat && m.roughMat.sum) || 0, lines = m.workLines, swaps = m.workSwaps || [], stages = xlsStages(m);
      var rows = xlsHead(m, 'СМЕТА СТРОИТЕЛЬНЫХ РАБОТ').concat([rk('head', ['ТИП РАБОТ', 'ЕД. ИЗМ.', 'ЦЕНА ЗА ЕД.', 'ОБЪЁМ', 'ИТОГО', 'ПРИМЕЧАНИЕ'])]);
      function roomPart(s) { return s.room && window.SOVE_KB ? window.SOVE_KB.zone(s.room).name + ', ' : ''; }
      function swapNote(s) { return roomPart(s) + 'замена: ' + s.from + ' → ' + s.to; }
      stages.forEach(function (w) {
        rows.push(rk('stageHead', ['ЭТАП. ' + w.title.toUpperCase()]));
        if (lines) {
          /* построчно по объёмам плана: заменённая строка убрана, новая — с примечанием */
          lines.filter(function (l) { return B.lineStage(l, m.state) === w.key && !swaps.some(function (s) { return s.row === l.row; }); }).forEach(function (l) { rows.push([l.work, l.unit, l.price, l.qty, l.sum, '']); });
        } else if (m.api && S.budgetApi) {
          /* построчно из серверного расчёта (книга работ в коде) */
          (S.budgetApi.workRows(m.api)[w.key] || []).forEach(function (l) { rows.push([l[0], l[1], l[2], l[3], l[4], '']); });
        } else if (w.plan0) rows.push(['Работы этапа', '', '', '', w.plan0, 'по площади квартиры, построчная смета после загрузки плана']);
        swaps.forEach(function (s) {
          if (s.plusStage === w.key) rows.push([s.work, XLS_UNIT[s.unit] || s.unit, s.price, s.qty, s.plus, swapNote(s)]);
          /* снятая работа без своей строки сметы: цена базовой работы на её объём, строкой с минусом */
          w.changes.filter(function (c) { return c.swap === s; }).forEach(function (c) {
            var taken = (s.plusStage === w.key ? s.plus : 0) - c.amount;
            if (taken > 0 && !(lines && s.row)) rows.push([s.fromWork, XLS_UNIT[s.fromUnit] || s.fromUnit, s.fromPrice, s.fromQty, -taken, roomPart(s) + 'снято при замене: ' + s.from + ' → ' + s.to]);
          });
        });
        rows.push(rk('stageSum', ['Итого по этапу', '', '', '', w.plan]), []);
      });
      (m.workUnknown || []).forEach(function (u) { rows.push([u.slotName + ': ' + u.to, '', '', '', '', 'работа уточняется, в сумму не вошла']); });
      rows = rows.concat(stages.map(function (w) { return ['Этап. ' + w.title, '', '', '', w.plan]; }))
        .concat([rk('total', ['ИТОГО ПО РАБОТАМ', '', '', '', T.works]), rk('per', ['Цена за 1 м²', '', '', '', perM2(m, T.works)]), [], rk('stageHead', ['ИТОГОВЫЙ РЕЗУЛЬТАТ']), ['Черновые материалы, ставка за 1 м²', '', '', '', perM2(m, rough)], ['Черновые материалы, сумма', '', '', '', rough],
          rk('total', ['ИТОГОВАЯ СУММА', '', '', '', T.worksAndRough]), rk('per', ['Цена за 1 м²', '', '', '', perM2(m, T.worksAndRough)]), [],
          rk('note', ['*Цены для Москвы и МО. Расчёт выполнен без НДС.']), rk('note', ['*Сроки этапов по договору подряда, п. 4.1: демонтаж 15 · черновые 30 · инженерные 35–40 · предчистовые 30–35 · чистовые 45–50 раб. дн.']),
          rk('legal', ['•  Расчёт носит информационный характер и не является публичной офертой (ст. 437 ГК РФ).']), rk('legal', ['•  Стоимость работ действительна на дату расчёта и подлежит подтверждению после осмотра объекта.']), rk('legal', ['•  Объёмы работ вносятся на основании данных пользователя; платформа не проверяет их достоверность.'])]);
      return book('sove_scout_works_budget' + fileNo() + '.xlsx', [xlSheet('ИТОГ', rows, 'works')]);
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-fin')) { var fk = b.getAttribute('data-fin'); if (fk.indexOf('w:') === 0) { fk = fk.slice(2); ui$.works[fk] = !ui$.works[fk]; } else ui$.open[fk] = !ui$.open[fk]; draw(); return; }
      if (b.hasAttribute('data-rm')) { var rk = b.getAttribute('data-rm'); ui$.rooms[rk] = !ui$.rooms[rk]; draw(); return; }
      if (b.hasAttribute('data-dl-toggle')) { var dm = b.nextElementSibling, dop = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!dop)); if (dm) dm.hidden = dop; return; }
      if (b.hasAttribute('data-dl-pdf')) { b.parentNode.hidden = true; S.ui.toast('В прототипе PDF не формируется — скачайте Excel'); return; }
      if (b.hasAttribute('data-xls')) { if (b.parentNode.classList.contains('fr-dl__menu')) b.parentNode.hidden = true; if (b.getAttribute('data-xls') === 'works') xlsWorks(model()); else xlsKit(model()); return; }
      if (b.hasAttribute('data-bud') && b.tagName === 'A') e.preventDefault();
      if (b.hasAttribute('data-bud-type')) setTimeout(draw, 0);   /* сам переключатель — demo-flow (setBudgetType), здесь — перерисовка */
    });
    draw();
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) draw(); });
  };
})();
