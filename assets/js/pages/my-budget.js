/* Мой ремонт → Бюджет (my.html?v=budget, &seg=w — к работам) — design/budget/TZ-budget.md; вид — по рендеру «Бюджет» Алины 25.10 (проще эталонов K/W):
   две карточки «Плановый бюджет · Оплачено», «Экономия с подпиской METOD», «По категориям» — 9 строк «оплачено / план» с полоской, «Работы» — 5 этапов + черновые, Excel.
   Как смета ремонта: 9 категорий комплектации + 5 этапов работ + черновые материалы. Бюджет ничего не хранит и не меняет — показывает:
   строка = выбор в своём блоке (ИНТЕРЬЕР / ПЛАНИРОВКА / МАРКЕТ) или норма (ПО НОРМЕ), тап ведёт в блок, «← Бюджет» возвращает сюда.
   Цифры — SOVE_BUDGET.current() (budget.js): totals.plan = карточка «Плановый бюджет» = полоса «Бюджет» = дашборд = PDF = Excel.
   Бюджет формируется только после расчёта бюджета (Алина 25.10): до него — пустой экран с одной кнопкой «Рассчитать бюджет», примера нет. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, R = S.repair;
  var IMG = 'assets/img/interior/';
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
    /* до расчёта: если собран Интерьер — показываем, что уже известно (строки ИНТЕРЬЕР), остальное серым и «Досчитать весь бюджет» (Алина 26.10) */
    if (!C || !C.full) { var it = R.get().interior; if (it && it.slots) return partial(it); var sv = fromSaved(); if (sv) return sv; return { empty: true, plan: !!C }; }
    var f = R.flats.active(), BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers ? window.SOVE_FLOW.budgetLayers() : null;
    C.meta = [f && f.name, C.area ? F.area(C.area) : '', C.P && C.P.rooms ? C.P.rooms.filter(function (r) { return !/сан|ванн|прих|балкон|лодж|корид/i.test(r.name); }).length + ' комн.' : ''].filter(Boolean).join(' · ');
    C.figure = C.full ? C.totals.plan : BL ? BL.total : null;
    if (C.full && BL && BL.total !== C.totals.plan) console.warn('Бюджет: полоса ' + BL.total + ' ≠ экран ' + C.totals.plan);
    return C;
  }

  /* без Планировки и без расчёта «из Интерьера», но расчёт сохранён кнопкой «Сохранить в Мой ремонт» (rp.budget: works, kitMetod, total, byRooms)
     или есть rp.scoutParams.byRooms — экран строится из них: та же итоговая цифра, что в полосе (rp.budget.total), категории = Σ byCat по комнатам
     (нет разбивки — доли расчёта), этапы — 7 этапов расчёта в 5 этапов договора (как fromScout), черновые материалы отдельно не выделяем.
     «Рассчитать бюджет» остаётся только когда расчёта нет вообще. */
  function fromSaved() {
    var B = window.SOVE_BUDGET, SC = S.data && S.data.scout, r = R.get(), b = r.budget && r.budget.total > 0 ? r.budget : null;
    var br = (b && b.byRooms && b.byRooms.length ? b.byRooms : null) || (r.scoutParams && r.scoutParams.byRooms && r.scoutParams.byRooms.length ? r.scoutParams.byRooms : null);
    if (!B || !SC || (!b && !br)) return null;
    var rsum = function (f) { return br ? br.reduce(function (a, x) { return a + (Number(x[f]) || 0); }, 0) : 0; };
    var total = Math.round(b ? b.total : rsum('total')), works = Math.round(b && typeof b.works === 'number' ? b.works : rsum('works')), kitMetod = Math.round(b && typeof b.kitMetod === 'number' ? b.kitMetod : total - works);
    if (!(total > 0)) return null;
    var mk = SC.retailMarkup || 1, kv = {};
    if (br && br[0] && br[0].byCat) br.forEach(function (x) { Object.keys(x.byCat || {}).forEach(function (k) { kv[k] = (kv[k] || 0) + (Number(x.byCat[k]) || 0); }); });
    else SC.kitShares.forEach(function (k) { kv[B.kitKey(k[0]) || k[0]] = kitMetod * k[1] / 100; });
    var known = B.KIT.map(function (k) { return k[0]; });
    Object.keys(kv).forEach(function (k) { if (known.indexOf(k) < 0) { kv.furniture = (kv.furniture || 0) + kv[k]; delete kv[k]; } });   /* «по картинкам» — в мебель */
    var kit = B.KIT.map(function (k) { var v = Math.round(kv[k[0]] || 0); return { key: k[0], title: k[1], plan: v, market: Math.round(v * mk), paid: 0, source: 'scout', accuracy: 'примерно' }; });
    var W = {}; SC.stages.forEach(function (x) { W[x[0]] = works * x[1] / 100; });
    var stId = (b && b.stateId) || (S.my && S.my.get().stateId), secondary = stId === 'secondary';
    var wv = { demolition: secondary ? W['Демонтаж'] || 0 : 0, rough: (secondary ? 0 : W['Демонтаж'] || 0) + (W['Стены и перегородки'] || 0), engineering: (W['Водоснабжение и канализация'] || 0) + (W['Электрика, свет, двери'] || 0), prefinish: 0, finish_works: (W['Полы'] || 0) + (W['Потолки'] || 0) + (W['Финальная сдача'] || 0) };
    var wl = B.WORKS.map(function (w, i) { return { key: w[0], n: i + 1, title: w[1], plan: Math.round(wv[w[0]] || 0), days: w[2], examples: w[3], done: false }; }).filter(function (w) { return w.plan > 0; });
    var tk = sum(kit, 'plan'), tw = sum(wl, 'plan'), diff = total - tk - tw;
    if (diff && wl.length) { wl[wl.length - 1].plan += diff; tw += diff; }   /* копейки округления — в последний этап: «Плановый бюджет» = итог полосы */
    var tm = sum(kit, 'market'), f = R.flats.active(), area = (b && b.area) || rsum('area') || null;
    var rooms = br ? br.map(function (x) { return { name: x.name, zone: x.zone, zoneName: (B.ZONE_NAME || {})[x.zone] || 'Спальня', area: x.area, works: x.works, kit: x.kit, total: x.total, byCat: x.byCat || {}, typical: !!x.typical }; }) : null;
    if (rooms && rooms.length) { var rd = total - rooms.reduce(function (a, x) { return a + x.total; }, 0), lr = rooms[rooms.length - 1]; if (rd) { lr.works += rd; lr.total += rd; } }
    return { saved: true, full: false, type: (b && b.type) || 'base', kit: kit, works: wl, roughMat: { sum: 0, rate: null }, area: area, state: stId || null, savedRooms: rooms,
      totals: { kit: tk, kitMarket: tm, saving: Math.max(0, tm - tk), works: tw, worksAndRough: tw, plan: tk + tw, paid: 0, perM2: area ? Math.round((tk + tw) / area) : null }, figure: tk + tw,
      meta: [f && f.name, area ? F.area(area) : '', rooms ? rooms.length + ' ' + plural(rooms.length, 'комната', 'комнаты', 'комнат') : ''].filter(Boolean).join(' · ') };
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
  function hrefOf(k) {
    var hl = SLOT_OF[k.key];
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
        var it = KB.item(b.slots[s.key].sku); if (it) out.push({ p: UI.product(it), bg: UI.tileBg(it, 44, 44), sub: s.name, sum: R.materialsSum('flat', { board: b, slot: s.key }) });
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
      var goods = lock ? [] : goodsOf(k, m), open = !!ui$.open[k.key];
      var html = row({ th: thumb(k, m), title: k.title + (goods.length ? ' · ' + goods.length : ''), plan: k.plan, paid: k.paid, fin: lock ? null : k.key, lock: lock, open: open, href: '#' });
      if (lock || !open) return html;
      return html + '<div class="bg-goods">' + window.SOVE_BUDGET.goodsHtml(goods, 'Позиции этой категории появятся после подбора') + '</div>';
    }
    /* «По комнатам» (созвон 28.10): те же цифры, что в строках выше, разложенные по комнатам плана в одном стиле (SOVE_BUDGET.byRooms, budget.js).
       Комнаты — из расчёта (rp.scoutParams.byRooms), иначе из плана квартиры (R.planZones), иначе типовые зоны по площади с пометкой.
       Суммы — из строк этого экрана (9 категорий + 5 этапов + черновые), поэтому Σ комнат = «Плановый бюджет». «Заменить материалы ›» — в Интерьер с зоной. */
    function roomsSrc() {
      var r = R.get(), br = r.scoutParams && r.scoutParams.byRooms;
      if (br && br.length) return br.map(function (x) { return { name: x.name, zone: x.zone, area: x.area, typical: !!x.typical }; });
      var pz = R.planZones();
      if (pz.exact && pz.units && pz.units.length) return pz.units.map(function (u) { return { name: u.name, zone: u.type, area: u.m2 }; });
      return [];
    }
    function roomsBlock(m) {
      var B = window.SOVE_BUDGET, KB = window.SOVE_KB, T = m.totals; if (!B || !B.byRooms || T.plan === null) return '';
      var src = m.savedRooms || roomsSrc(), o;
      if (m.savedRooms) { var sr = m.savedRooms, tt = function (f) { return sr.reduce(function (a, x) { return a + x[f]; }, 0); }; o = { rooms: sr, typical: false, works: tt('works'), kit: tt('kit'), total: tt('total') }; }   /* строки из сохранённого расчёта — как в Расчёте */
      else o = B.byRooms({ rooms: src, area: m.area, works: T.works || 0, roughMat: (m.roughMat && m.roughMat.sum) || 0, cats: m.kit.map(function (k) { return { key: k.key, title: k.title, sum: k.plan || 0 }; }) });
      if (!o.rooms.length) return '';
      var typical = o.typical || src.some(function (x) { return x.typical; });   /* типовые зоны расчёта (плана нет) — та же пометка, что в Расчёте */
      if (o.total !== T.plan) console.warn('По комнатам: Σ комнат ' + o.total + ' ≠ план ' + T.plan);
      var seen = {}, titles = {}; m.kit.forEach(function (k) { titles[k.key] = k.title; });
      var ff = R.flats.active() || {}, itx = R.get().interior, capId = (itx && (itx.capsuleId || itx.baseCapsuleId)) || ff.capsuleId || '';
      function vals(x) {
        /* по комнатам — только комплектация; работы — одна сумма на объект (Алина 10.11, как на финальной странице расчёта) */
        return '<b class="bg-rm__sum">' + rub(x.kit) + '</b>';
      }
      var rows = o.rooms.map(function (x, i) {
        seen[x.zone] = (seen[x.zone] || 0) + 1; var key = seen[x.zone] === 1 ? x.zone : x.zone + '-' + seen[x.zone];   /* как в R.planZones: первая комната типа — ключ зоны, дальше тип-2 */
        var open = !!ui$.rooms[i], href = 'interior.html?v=b&from=budget&zone=' + encodeURIComponent(x.zone) + '&room=' + encodeURIComponent(KB && KB.zoneId ? KB.zoneId(key) : key);
        var cats = Object.keys(x.byCat).filter(function (k) { return x.byCat[k] > 0; }).map(function (k) { return '<div class="bg-rm__c"><span>' + esc(titles[k] || k) + '</span><b>' + rub(x.byCat[k]) + '</b></div>'; }).join('');
        return '<div class="bg-rm' + (open ? ' is-open' : '') + '">' +
          '<button type="button" class="bg-rm__r" data-rm="' + i + '" aria-expanded="' + open + '">' +
            '<span class="bg-rm__n"><b>' + esc(x.name) + '</b><small>' + F.area(x.area) + '</small></span>' + vals(x) + '<span class="bg-rm__a">' + (open ? '▴' : '▾') + '</span></button>' +
          (open ? '<div class="bg-goods">' + B.goodsHtml(B.roomGoods(capId, x.zone, m.type), 'Позиции этой комнаты появятся после подбора') + '</div>' : '') +
        '</div>';
      }).join('');
      var n = o.rooms.length;
      return '<div class="fr-h"><b class="sq-group">По комнатам</b><span>' + rub(o.kit) + '</span></div>' +
        (typical ? '<small class="bg-note bg-note--l">Типовые зоны · загрузите план, чтобы считать точно</small>' : '') +
        '<div class="bg-list bg-rms">' + rows + '<div class="bg-rm bg-rm--sum"><span class="bg-rm__n"><b>Вся квартира</b><small>' + (m.area ? F.area(m.area) : '') + '</small></span>' + vals(o) + '<span class="bg-rm__a"></span></div></div>';
    }
    /* внизу — карусель Избранного (как «Популярные товары» на рендере): интерьеры квартир, подборки и товары с ♡; «Все ›» — экран Избранного */
    function favRow() {
      var items = [];
      R.flats.list().forEach(function (fl) { var x = R.get(fl.id).interior; if (x && x.slots && x.imageUrl) items.push('<a class="bg-fv" href="interior.html?v=b&from=budget&flat=' + encodeURIComponent(fl.id) + '"><span style="background-image:url(' + esc(x.imageUrl) + ')"></span><b>' + esc(x.name || x.style) + '</b><small>интерьер</small></a>'); });
      R.favSets.list().forEach(function (x) { var n = (x.productIds || []).length; items.push('<a class="bg-fv" href="favorites.html"><span' + (x.cover ? ' style="background-image:url(' + esc(x.cover) + ')"' : '') + '><i>♥</i></span><b>' + esc(x.title) + '</b><small>подборка · ' + n + ' тов.</small></a>'); });
      R.fav.list().forEach(function (id) { var p = S.data.product(id); if (p && p.img) items.push('<a class="bg-fv" href="product.html?id=' + p.id + '"><span style="background-image:url(' + esc(p.img) + ')"><i>♡</i></span><b>' + esc(p.name) + '</b><small>' + F.rub(p.metod) + '</small></a>'); });
      if (!items.length) items.push('<a class="bg-fv bg-fv--add" href="market.html"><span>♡</span><b>Пока пусто</b><small>нажми ♡ в Маркете</small></a>');
      return '<div class="bg-h"><b>Избранное</b><a href="favorites.html">Все ›</a></div><div class="bg-fvs">' + items.join('') + '</div>';
    }
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
          (m.plan ? '<button type="button" class="bg-btn" data-bud="buy">✦ Рассчитать бюджет</button>' : '<a class="bg-btn" href="scout.html?from=budget">✦ Рассчитать бюджет</a>') + '</div>' + favRow() + '</div>';   /* «✦» — расчёт бюджета тоже генерация, как в Бюджете (scout.js) */
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
        hero(m, fig, T, pct, left, lock) +
        '<div class="fr-h"><b class="sq-group">По категориям</b>' + (m.full ? '<span class="bg-type" role="group" aria-label="Тип бюджета"><button type="button" data-bud-type="base" aria-pressed="' + (m.type !== 'premium') + '">База</button><button type="button" data-bud-type="premium" aria-pressed="' + (m.type === 'premium') + '">Премиум</button></span>' : '') + '</div>' +
        '<div class="bg-list">' + m.kit.map(function (k) { return kitRow(k, m, lock && k.key !== 'furniture'); }).join('') + '</div>' +
        '<div class="fr-h"><b class="sq-group">Строительные работы</b>' + (lock ? '' : '<span>' + rub(T.worksAndRough) + '</span>') + '</div>' +
        (lock ? '<button type="button" class="bg-btn" data-bud="buy">✦ Узнать весь бюджет</button>' :
          '<div class="bg-list">' + m.works.map(function (w) {
            var wo = !!ui$.works[w.key], lines = window.SOVE_BUDGET.workLines(w.key);
            return row({ th: '<span class="bg-th bg-th--n">' + (w.done ? '✓' : w.n) + '</span>', title: w.title, plan: w.plan, paid: 0, fin: lines.length ? 'w:' + w.key : null, plain: !lines.length, open: wo }) +
              (wo && lines.length ? '<div class="bg-goods">' + window.SOVE_BUDGET.linesHtml(lines) + '</div>' : '');
          }).join('') +
            (m.saved && !m.roughMat.sum ? '' : row({ th: '<span class="bg-th bg-th--n">＋</span>', title: 'Черновые материалы', plan: m.roughMat.sum, paid: 0, plain: true })) + '</div>' +
          roomsBlock(m) +
          /* общая кнопка «Скачать», потом формат — как на финальной странице расчёта (Алина 10.11); Excel формируется, PDF в прототипе нет */
          '<div class="fr-dl fr-dl--wide"><button type="button" class="btn btn--ghost" data-dl-toggle aria-expanded="false" aria-haspopup="true">Скачать ▾</button>' +
            '<div class="fr-dl__menu" hidden><button type="button" data-dl-pdf>PDF</button><button type="button" data-xls>Excel</button></div></div>') +
        favRow() + '</div>';
    }

    /* Excel в формате расчёта (SpreadsheetML — открывается в Excel): лист ИТОГ + лист на каждую категорию */
    function xls(m) {
      var T = m.totals, x = function (v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
      function cell(v) { return typeof v === 'number' ? '<Cell><Data ss:Type="Number">' + Math.round(v) + '</Data></Cell>' : '<Cell><Data ss:Type="String">' + x(v) + '</Data></Cell>'; }
      function row(a) { return '<Row>' + a.map(cell).join('') + '</Row>'; }
      function sheet(name, rows) { return '<Worksheet ss:Name="' + x(name).slice(0, 31) + '"><Table>' + rows.map(row).join('') + '</Table></Worksheet>'; }
      var itog = [['Смета SOVEAPP'], ['Объект', m.meta || ''], ['Площадь, м²', m.area || ''], ['Тип', m.type === 'premium' ? 'Премиум' : 'База'], [],
        ['Категория', 'Рыночная цена', 'Цена METOD', 'Ваша экономия']].concat(m.kit.map(function (k) { return [k.title, k.market, k.plan, k.market - k.plan]; }))
        .concat([['Итого комплектация', T.kitMarket, T.kit, T.saving], [], ['Этап работ', 'Срок', 'Сумма']]).concat(m.works.map(function (w) { return [w.title, w.days, w.plan]; }))
        .concat([['Итого по работам', '', T.works], ['Черновые материалы', m.roughMat.rate ? m.roughMat.rate + ' ₽/м²' : '', m.roughMat.sum], ['Итого работы', '', T.worksAndRough], [],
          ['ИТОГО', '', T.plan], ['₽/м²', '', T.perM2], [], ['[сноски и дисклеймеры — дословно из Excel расчёта]']]);
      var KB = window.SOVE_KB, b = R.get().interior;
      var sheets = m.kit.map(function (k) {
        var head = [['Тип продукта', 'Кол-во', 'Ед', 'Наименование', 'Цена розница', 'Цена METOD', 'Итог']], rows = [];
        if (k.source === 'interior' && b && b.slots && KB) KB.SLOTS.filter(function (s) { return s.budgetCat === k.key; }).forEach(function (s) {
          var e = b.slots[s.key], it = KB.item(e.sku); if (it) rows.push([s.name, e.qty || it.qty || '', it.unit || '', it.name, Math.round((e.price || it.price) * (window.SOVE.data.scout.retailMarkup || 1)), e.price || it.price, R.materialsSum('flat', { board: b, slot: s.key })]);
        });
        if (!rows.length) rows.push([k.title, '', '', TAG[k.source] === 'ПО НОРМЕ' ? 'по норме ₽/м² расчёта' : 'из блока ' + TAG[k.source].toLowerCase(), k.market, k.plan, k.plan]);
        return sheet(k.title, head.concat(rows).concat([['Итого', '', '', '', '', '', k.plan]]));
      });
      var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
        sheet('ИТОГ', itog) + sheets.join('') + '</Workbook>';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' })); a.download = 'soveapp-smeta.xls';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return T.plan;
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-fin')) { var fk = b.getAttribute('data-fin'); if (fk.indexOf('w:') === 0) { fk = fk.slice(2); ui$.works[fk] = !ui$.works[fk]; } else ui$.open[fk] = !ui$.open[fk]; draw(); return; }
      if (b.hasAttribute('data-rm')) { var rk = b.getAttribute('data-rm'); ui$.rooms[rk] = !ui$.rooms[rk]; draw(); return; }
      if (b.hasAttribute('data-dl-toggle')) { var dm = b.nextElementSibling, dop = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!dop)); if (dm) dm.hidden = dop; return; }
      if (b.hasAttribute('data-dl-pdf')) { b.parentNode.hidden = true; S.ui.toast('В прототипе файл не формируется'); return; }
      if (b.hasAttribute('data-xls')) { if (b.parentNode.classList.contains('fr-dl__menu')) b.parentNode.hidden = true; xls(model()); return; }
      if (b.hasAttribute('data-bud') && b.tagName === 'A') e.preventDefault();
      if (b.hasAttribute('data-bud-type')) setTimeout(draw, 0);   /* сам переключатель — demo-flow (setBudgetType), здесь — перерисовка */
    });
    draw();
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) draw(); });
  };
})();
