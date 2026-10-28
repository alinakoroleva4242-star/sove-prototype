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
  function model() {
    var B = window.SOVE_BUDGET, C = B && B.current ? B.current() : null;
    /* до расчёта: если собран Интерьер — показываем, что уже известно (строки ИНТЕРЬЕР), остальное серым и «Досчитать весь бюджет» (Алина 26.10) */
    if (!C || !C.full) { var it = R.get().interior; return it && it.slots ? partial(it) : { empty: true, plan: !!C }; }
    var f = R.flats.active(), BL = window.SOVE_FLOW && window.SOVE_FLOW.budgetLayers ? window.SOVE_FLOW.budgetLayers() : null;
    C.meta = [f && f.name, C.area ? F.area(C.area) : '', C.P && C.P.rooms ? C.P.rooms.filter(function (r) { return !/сан|ванн|прих|балкон|лодж|корид/i.test(r.name); }).length + ' комн.' : ''].filter(Boolean).join(' · ');
    C.figure = C.full ? C.totals.plan : BL ? BL.total : null;
    if (C.full && BL && BL.total !== C.totals.plan) console.warn('Бюджет: полоса ' + BL.total + ' ≠ экран ' + C.totals.plan);
    return C;
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

  var ui$ = { open: { finish: true } };   /* раскрытые категории */
  window.SOVE_MY_BUDGET = function (root) {
    if (new URLSearchParams(location.search).get('seg') === 'w') setTimeout(function () { var h = root.querySelectorAll('.bg-h')[1]; if (h) h.scrollIntoView({ block: 'start' }); }, 60);   /* &seg=w — сразу к работам */
    /* строка как на рендере «Бюджет» (Алина 25.10, «проще, меньше текста»): круглая миниатюра · название · «оплачено / план» · полоска · % · ›.
       Метки источника, легенду и плашку-правило убрали; куда ведёт строка — тот же блок-источник */
    function row(o) {
      var pct = o.plan ? Math.round((o.paid || 0) / o.plan * 100) : 0;
      var body = (o.th || '') + '<span class="bg-r__b"><b>' + esc(o.title) + (o.fin ? ' <em>' + (o.open ? '▴' : '▾') + '</em>' : '') + '</b>' +
        (o.lock ? '<small class="is-lock">посчитаем при расчёте</small>' : '<small><b>' + rub(o.paid || 0) + '</b> / ' + rub(o.plan) + '</small><i class="bg-bar"><i style="width:' + Math.min(100, pct) + '%"></i></i>') + '</span>' +
        (o.lock ? '' : '<small class="bg-r__p">' + pct + '%</small>') + '<span class="bg-r__a">›</span>';
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
      return out;
    }
    function kitRow(k, m, lock) {
      var goods = lock ? [] : goodsOf(k, m), open = !!ui$.open[k.key];
      var html = row({ th: thumb(k, m), title: k.title + (goods.length ? ' · ' + goods.length : ''), plan: k.plan, paid: k.paid, href: hrefOf(k) || 'interior.html?v=b&from=budget', fin: goods.length ? k.key : null, lock: lock, open: open });
      if (!goods.length || !open) return html;
      return html + '<div class="bg-goods">' + goods.map(function (g) {
        var p = g.p;
        return '<div class="bg-p"><a class="bg-p__pic" href="product.html?id=' + p.id + '" style="' + (g.bg ? 'background:' + g.bg : 'background-image:url(' + esc(p.img) + ')') + '"></a>' +
          '<a class="bg-p__b" href="product.html?id=' + p.id + '"><small>' + esc(g.sub) + '</small><b>' + esc(p.name) + '</b><em>' + rub(g.sum) + '</em></a><span class="bg-p__a">' + R.btns(p, 'budget') + '</span></div>';
      }).join('') +
        (k.key === 'finish' && k.rooms ? '<div class="bg-rooms">' + k.rooms.map(function (r) { return '<a href="interior.html?v=b&room=' + r.id + '&from=budget"><span>' + esc(r.name) + '</span><span><b>' + rub(r.plan) + '</b><i>›</i></span></a>'; }).join('') + '</div>' : '') +
        '<a class="bg-goods__go" href="' + (hrefOf(k) || 'interior.html?v=b&from=budget') + '">' + (k.source === 'interior' ? 'Заменить в Интерьере ›' : k.source === 'planirovka' ? 'Изменить в Планировке ›' : 'В Маркет ›') + '</a></div>';
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
          (m.plan ? '<button type="button" class="bg-btn" data-bud="buy">Рассчитать бюджет</button>' : '<a class="bg-btn" href="scout.html?from=budget">Рассчитать бюджет</a>') + '</div>' + favRow() + '</div>';
        return;
      }
      var T = m.totals, fig = m.figure, lock = false;
      if (m.kit[0].rooms) { var rs = sum(m.kit[0].rooms, 'plan'); if (rs !== m.kit[0].plan) console.warn('Отделка: комнаты ' + rs + ' ≠ строке ' + m.kit[0].plan); }
      var pct = fig ? Math.round(T.paid / fig * 100) : 0, left = fig === null ? null : Math.max(0, fig - T.paid);
      root.className = 'bg';
      root.innerHTML =
        '<header class="bg-head"><a href="my.html?v=center" aria-label="Назад в Мой ремонт">‹</a><h1>Бюджет</h1><span></span></header>' +
        '<div class="bg-body">' +
        /* план и факт (Алина 25.10): «Фактический» — это оплачено по Заказам; полоски — доля от плана */
        '<div class="bg-cards"><div class="bg-card"><small>Плановый бюджет</small><b>' + rub(fig) + '</b><i class="bg-bar"><i style="width:' + Math.min(100, pct) + '%"></i></i><small>Использовано ' + pct + '%</small><b class="bg-card__s">' + rub(T.paid) + '</b></div>' +
          '<div class="bg-card"><small>Фактический бюджет</small><b>' + rub(T.paid) + '</b><i class="bg-bar"><i style="width:' + Math.min(100, pct) + '%"></i></i><small>Осталось</small><b class="bg-card__s">' + rub(left) + ' <em>' + (100 - Math.min(100, pct)) + '%</em></b></div></div>' +
        (!lock && T.saving > 0 ? '<div class="bg-save"><b>Экономия с подпиской METOD</b><b>−' + rub(T.saving) + '</b></div>' : '') +
        '<div class="bg-h"><b>По категориям</b>' + (m.full ? '<span class="bg-type" role="group" aria-label="Тип бюджета"><button type="button" data-bud-type="base" aria-pressed="' + (m.type !== 'premium') + '">База</button><button type="button" data-bud-type="premium" aria-pressed="' + (m.type === 'premium') + '">Премиум</button></span>' : '') + '</div>' +
        '<div class="bg-list">' + m.kit.map(function (k) { return kitRow(k, m, lock && k.key !== 'furniture'); }).join('') + '</div>' +
        '<div class="bg-h"><b>Работы</b>' + (lock ? '' : '<small>' + rub(T.worksAndRough) + '</small>') + '</div>' +
        (lock ? '<button type="button" class="bg-btn" data-bud="buy">✦ Узнать весь бюджет</button>' :
          '<div class="bg-list">' + m.works.map(function (w) { return row({ th: '<span class="bg-th bg-th--n">' + (w.done ? '✓' : w.n) + '</span>', title: w.title, plan: w.plan, paid: 0, href: 'scout.html?from=budget&stage=' + w.key }); }).join('') +
            row({ th: '<span class="bg-th bg-th--n">＋</span>', title: 'Черновые материалы', plan: m.roughMat.sum, paid: 0, href: 'scout.html?from=budget' }) + '</div>' +
          '<button type="button" class="bg-btn" data-xls>Скачать смету · Excel</button>') +
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
      if (b.hasAttribute('data-fin')) { var fk = b.getAttribute('data-fin'); ui$.open[fk] = !ui$.open[fk]; draw(); return; }
      if (b.hasAttribute('data-xls')) { xls(model()); return; }
      if (b.hasAttribute('data-bud') && b.tagName === 'A') e.preventDefault();
      if (b.hasAttribute('data-bud-type')) setTimeout(draw, 0);   /* сам переключатель — demo-flow (setBudgetType), здесь — перерисовка */
    });
    draw();
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) draw(); });
  };
})();
