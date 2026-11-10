/* Мой ремонт — центр возврата (design/interior/TZ-interior.md, разделы 7 и 9; эталон etalon-MR): my.html?v=center.
   Шапка «Мой ремонт» + строка квартиры · кольцо «Ремонт готов на N из 3» (Планировка · Интерьер · Работы) · три карточки ·
   «Комнаты · N» · «Бюджет» — одна карточка-вход в my.html?v=budget (design/budget/TZ-budget.md: 9 категорий + 5 этапов, строки разворачиваются там) ·
   «Избранное» — сетка с переносом: интерьеры, «＋ свой интерьер», специалисты, подборки, товары с ♡. Мой ремонт ничего не хранит и не меняет — только показывает
   и ведёт в блок; выбор интерьера — общее окно выбора капсулы (оно и пишет). Интерьер выбран, если у квартиры есть текущий интерьер любого вида,
   в том числе капсула без материалов из окна выбора.
   Цифры — те же, что в полосе «Бюджет» над меню (SOVE_FLOW.budgetLayers; без плана — только то, что известно). */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, R = S.repair, FL = window.SOVE_FLOW; if (!R) return;
  var INT = 'interior.html?v=b&from=my';
  var LINK = { plan: 'plan-demo.html', works: 'my.html?v=budget&seg=w' };   /* работы живут в Бюджете (Алина 25.10) */

  function layers() {
    FL = window.SOVE_FLOW || FL;   /* demo-flow.js подключается после этого файла — берём при отрисовке, иначе дашборд не видит Планировку и бюджет расходится с полосой */
    var BL = FL && FL.budgetLayers && FL.budgetLayers(); if (BL) return BL;
    /* бюджет посчитан расчётом «из Интерьера» без Планировки — 4 слоя из 9 + 5 экрана Бюджета */
    var C = window.SOVE_BUDGET && window.SOVE_BUDGET.current && window.SOVE_BUDGET.current();
    if (C && C.full && C.totals.plan !== null) {
      var kv = {}; C.kit.forEach(function (k) { kv[k.key] = k.plan || 0; });
      return { C: C, known: 4, total: C.totals.plan, parts: [
        { key: 'furniture', t: 'Мебель', known: true, value: kv.furniture + kv.furniture_custom },
        { key: 'materials', src: 'interior', t: 'Материалы', known: true, value: kv.finish + kv.light + kv.sockets + kv.plumbing + kv.doors + kv.appliances },
        { key: 'decor', t: 'Декор и текстиль', known: true, value: kv.decor },
        { key: 'works', t: 'Работы', known: true, value: C.totals.worksAndRough } ] };
    }
    /* плана нет: известно только то, что собрано в Интерьере */
    var it = R.get().interior, own = R.ownMat && R.ownMat();
    var parts = [
      { key: 'furniture', t: 'Мебель', known: false, value: 0 },
      own ? { key: 'materials', src: 'interior', t: 'Материалы', known: own.known, value: own.value } : { key: 'materials', src: 'norm', t: 'Материалы', known: false, value: 0 },
      { key: 'decor', t: 'Декор и текстиль', known: false, value: 0 },
      { key: 'works', t: 'Работы', known: false, value: 0 }
    ];
    var known = parts.filter(function (x) { return x.known; });
    return { parts: parts, known: known.length, total: known.reduce(function (a, x) { return a + x.value; }, 0) };
  }
  function plural(n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }
  function card(o) {
    return '<section class="mc-card' + (o.dashed ? ' mc-card--dash' : '') + '"><div class="mc-card__h">' + (o.img ? '<span class="mc-card__pic" style="background-image:url(' + esc(o.img) + ')"></span>' : '<span class="mc-card__pic mc-card__pic--ph">' + (o.icon || '') + '</span>') +
      '<span class="mc-card__t"><span><b>' + esc(o.t) + '</b><em class="' + (o.done ? 'is-ok' : '') + '">' + (o.done ? '✓' : '○') + '</em></span><small>' + esc(o.sub) + '</small></span></div>' +
      '<div class="mc-card__f"><span><small>' + esc(o.label) + '</small><b>' + o.value + '</b></span>' + o.btn + '</div></section>';
  }
  /* бюджет — одна карточка-вход в my.html?v=budget (design/budget/TZ-budget.md): та же цифра, что в полосе «Бюджет»; строки и замены — там и в блоках */
  /* та же цифра, что в полосе «Бюджет» (repair.js, renderStrip): интерьера нет — «выбери интерьер» (Алина 24.10) или итог сохранённого
     расчёта; Интерьер на часть квартиры — известная сумма материалов; интерьер выбран, а сумм ещё нет (выбрана только капсула) —
     «посчитать», как в полосе, а не «≈ 0 ₽» */
  function budgetCard(B) {
    var C = B && B.C, paid = C ? C.totals.paid : 0, rb = R.get().budget, rbt = rb && rb.total || 0;
    var noInt = !C && !!FL && !!FL.interiorChosen && !FL.interiorChosen();
    var om = !C && !B.total && R.ownMat ? R.ownMat() : null, part = om && !om.known && om.part > 0 ? om.part : 0;
    var none = !noInt && !C && !part && !B.total;
    var sub = noInt ? (rbt ? 'по расчёту ремонта · весь — в Бюджете' : 'выбери интерьер — покажем бюджет') : C ? '9 категорий · 5 этапов работ'
      : part ? 'известно — материалы из Интерьера · весь — в Бюджете'
      : none ? (rbt ? 'по расчёту ремонта · весь — в Бюджете' : 'ещё не посчитан — рассчитаем в Бюджете')
      : 'известно ' + B.known + ' из 4 · весь — в Бюджете';
    var go = none && !rbt, val = noInt || none ? (rbt ? '≈ ' + F.rub(rbt) : noInt ? '—' : 'посчитать') : '≈ ' + F.rub(part || B.total);
    return '<a class="mc-bcard" href="my.html?v=budget"><span><b>Бюджет</b><small>' + sub + (paid ? ' · оплачено ' + F.rub(paid) : '') + '</small></span><em' + (go ? ' class="mc-bcard__go"' : '') + '>' + val + '</em><i>›</i></a>';
  }
  /* Избранное — вход в экран Избранного (Алина 25.10): сохранённые интерьеры квартир, специалисты, подборки товаров к интерьеру, «＋ свой интерьер»,
     товары с ♡. Сеткой с переносом, без прокрутки вбок (правило прототипа): первые пять и «＋ свой интерьер»; остальное — «Все · N ›» */
  var FAV_MAX = 5;
  function favGrid() {
    var ints = [], rest = [];
    /* текущий интерьер квартиры: доска — экран B Интерьера; выбранная капсула без материалов (лёгкая запись окна выбора) — Интерьер соберёт материалы */
    R.flats.list().forEach(function (fl) {
      var x = R.get(fl.id).interior, light = !!(x && !x.slots && x.capsuleId && x.type !== 'own'), img = x && (x.imageUrl || (light ? x.img : ''));
      var nm = x ? ((R.interiors ? R.interiors.list(fl.id) : []).filter(function (y) { return y.id === x.id; })[0] || {}).name || x.name || x.style : '';
      if (x && img && (x.slots || light)) ints.push('<a class="mc-fv" href="interior.html?' + (light ? '' : 'v=b&') + 'from=my&flat=' + encodeURIComponent(fl.id) + '"><span class="mc-fv__p" style="background-image:url(\'' + esc(img) + '\')"></span><b>' + esc(nm) + '</b><small>' + (light ? 'капсула · ' : 'интерьер · ') + esc(fl.name) + '</small></a>');
    });
    /* специалисты (♡ в разделе «Строители, дизайнеры и мастера») — наравне с подборками и товарами */
    if (R.favPros) R.favPros.list().forEach(function (x) {
      var w = String(x.name || '').replace(/[^A-Za-zА-Яа-яЁё0-9 ]/g, ' ').trim().split(/\s+/).filter(function (t) { return t.length > 2; }), ini = ((w[0] || '').charAt(0) + (w[1] || '').charAt(0)).toUpperCase() || '•';
      rest.push('<a class="mc-fv" href="executors.html' + (x.sec ? '?sec=' + encodeURIComponent(x.sec) : '') + '"><span class="mc-fv__p">' + esc(ini) + '<i>♥</i></span><b>' + esc(x.name) + '</b><small>специалист' + (x.what ? ' · ' + esc(x.what) : '') + '</small></a>');
    });
    R.favSets.list().forEach(function (x) { var n = (x.productIds || []).length; rest.push('<a class="mc-fv" href="favorites.html"><span class="mc-fv__p"' + (x.cover ? ' style="background-image:url(' + esc(x.cover) + ')"' : '') + '><i>♥</i></span><b>' + esc(x.title) + '</b><small>подборка · ' + n + ' тов.</small></a>'); });
    R.fav.list().forEach(function (id) { var p = S.data.product(id); if (p && p.img) rest.push('<a class="mc-fv" href="product.html?id=' + p.id + '"><span class="mc-fv__p" style="background-image:url(' + esc(p.img) + ')"><i>♡</i></span><b>' + esc(p.name) + '</b><small>' + F.rub(p.metod) + '</small></a>'); });
    var all = ints.concat(rest), shown = all.slice(0, FAV_MAX), at = Math.min(ints.length, shown.length);
    shown.splice(at, 0, '<a class="mc-fv mc-fv--add" href="interior.html?v=a&from=my"><span class="mc-fv__p">＋</span><b>Свой интерьер</b><small>картинка, фото, Pinterest</small></a>');
    return '<section class="mc-fav"><div class="mc-fav__h"><b>Избранное</b><a href="favorites.html">' + (all.length > FAV_MAX ? 'Все · ' + all.length + ' ›' : 'Все ›') + '</a></div><div class="mc-fav__row">' + shown.join('') + '</div></section>';
  }
  function roomsCard(it) {
    var rs = []; (it && it.renders || []).forEach(function (r) { if (r.img && !rs.some(function (x) { return x.room === r.room; })) rs.push(r); });
    if (!rs.length) return '';
    return '<section class="mc-mat"><div class="mc-mat__h"><b>Комнаты · ' + rs.length + '</b><small>замена предметов — на рендере</small></div><div class="mc-rooms">' +
      rs.map(function (r) { return '<a href="' + INT + '&room=' + window.SOVE_KB.zoneId(r.zone || window.SOVE_KB.zoneOf(r.room)) + '" style="background-image:url(' + esc(r.img) + ')"><span>' + esc(r.room) + '</span></a>'; }).join('') + '</div></section>';
  }
  /* текущий интерьер квартиры (R.get().interior) — любой: доска со slots, своя картинка или капсула, выбранная в окне, без материалов
     (лёгкая запись, общий договор 02.11); имя без кода — из R.interiors.list() */
  function curInterior(r) {
    var cur = r.interior || null; if (!cur) return null;
    var row = R.interiors ? R.interiors.list().filter(function (x) { return x.current; })[0] || null : null;
    var board = cur.slots ? cur : null;
    return { cur: cur, board: board, own: cur.type === 'own' || !cur.capsuleId,
      name: (row && row.name) || String(cur.name || cur.style || '').replace(/^К\d+\s*·\s*/, '') || 'Мой интерьер',
      img: (row && row.img) || cur.imageUrl || cur.img || '', level: (row && row.level) || cur.level || null, slots: board ? Object.keys(board.slots).length : 0, row: row };
  }
  /* смена интерьера — общее окно выбора на месте (data-mc-pick); без окна — каталог капсул с возвратом сюда */
  var PICK_HREF = 'capsules.html?pick=1&returnTo=' + encodeURIComponent('my.html?v=center');
  function pickBtn(label, acc) { return '<a class="mc-btn' + (acc ? ' mc-btn--acc' : '') + '" href="' + PICK_HREF + '" data-mc-pick>' + label + '</a>'; }
  function interiorCard(I, mat, matDecor, nRooms) {
    if (!I) return card({ t: 'Интерьер', done: false, img: null, icon: '◐', sub: 'капсула SOVEAPP или своя картинка', label: 'МАТЕРИАЛЫ И ДЕКОР', value: '—', btn: pickBtn('Выбрать', true), dashed: true });
    var PK = window.SOVE_MY_PICK, lv = I.level === 'premium' ? 'Премиум' : I.level === 'base' ? 'База' : '';
    var open = PK && PK.href && I.row ? PK.href(I.row) : I.board ? INT : 'interior.html?from=my';
    var sub = I.board ? [I.slots + ' ' + plural(I.slots, 'материал', 'материала', 'материалов'), nRooms + ' ' + plural(nRooms, 'комната', 'комнаты', 'комнат')]
      : [I.own ? 'свой интерьер' : 'капсула', lv, 'материалы не собраны'];
    return card({ t: 'Интерьер · ' + I.name, done: true, img: I.img || null, icon: '◐', sub: sub.filter(Boolean).join(' · '),
      label: 'МАТЕРИАЛЫ И ДЕКОР', value: I.board ? (mat.known ? '≈ ' + F.rub(matDecor) : 'часть квартиры') : '—',
      btn: '<div class="mc-card__acts">' + pickBtn('Сменить') + (I.board ? '<a class="mc-btn" href="' + esc(open) + '">Открыть</a>' : '<a class="mc-btn mc-btn--acc" href="' + esc(open) + '">Собрать материалы</a>') + '</div>' });
  }
  function view(root) {
    FL = window.SOVE_FLOW || FL;
    var f = R.flats.active(), r = R.get(), I = curInterior(r), P = FL && FL.planDoc && FL.planDoc(), B = layers();
    var plan = !!r.plan || !!P || !!(f && f.m2), works = !!(FL && FL.budgetFull && FL.budgetFull());
    var done = [plan, !!I, works].filter(Boolean).length, pct = Math.round(done / 3 * 100);
    var next = !plan ? 'осталось загрузить план' : !I ? 'осталось выбрать интерьер' : !works ? 'осталось узнать стоимость работ' : 'всё готово — можно к покупкам';
    var nRooms = I ? (I.cur.renders || []).filter(function (x) { return x.img && !x.angle; }).length : 0;
    var part = function (k) { return B.parts.filter(function (x) { return x.key === k; })[0] || {}; };
    var mat = part('materials'), dec = part('decor'), furn = part('furniture'), wk = part('works');
    var matDecor = (mat.known ? mat.value : 0) + (dec.known ? dec.value : 0), t = R.cart.totals();
    var line = f ? [f.jk ? 'ЖК ' + f.jk : '', f.rooms ? f.rooms + '-комн' : '', f.m2 ? F.area(f.m2) : ''].filter(Boolean).join(' · ') : '';
    root.innerHTML = '<header class="mc-head"><div><b>Мой ремонт</b><a class="pz-tok" href="account.html?v=tokens">' + esc(F.tokens(S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens)) + ' 🎁</a></div>' +
        '<small>' + esc(line || (f ? f.name : 'Моя квартира')) + '</small></header>' +
      '<div class="mc-body">' +
      '<div class="mc-ring"><span class="mc-ring__c" style="--p:' + pct + '%"><b>' + pct + '%</b></span><span><b>Ремонт готов на ' + done + ' из 3</b><small>' + next + '</small></span></div>' +
      card({ t: 'Планировка', done: plan, img: P ? P.T.img : (r.plan ? r.plan.img : null), icon: '⌂', sub: P ? P.T.count + ' ' + plural(P.T.count, 'предмет', 'предмета', 'предметов') + ' мебели · расставлено' : plan ? 'план загружен · мебель не расставлена' : 'план и расстановка мебели',
        label: 'МЕБЕЛЬ', value: furn.known ? F.rub(furn.value) : '—', btn: plan ? '<a class="mc-btn" href="' + LINK.plan + '">Изменить</a>' : '<a class="mc-btn mc-btn--acc" href="' + LINK.plan + '">Загрузить план</a>', dashed: !plan }) +
      interiorCard(I, mat, matDecor, nRooms) +
      card({ t: 'Работы', done: works, img: null, icon: '⚒', sub: 'черновые и чистовые по твоим материалам', label: 'РАБОТЫ', value: works ? F.rub(wk.value) : '—',
        btn: works ? '<a class="mc-btn" href="' + LINK.works + '">Открыть</a>' : '<a class="mc-btn mc-btn--acc" href="' + LINK.works + '">Узнать стоимость · 🎟</a>', dashed: !works }) +
      roomsCard(I && I.cur) + budgetCard(B) + favGrid() +
      '<div class="mc-acts"><button type="button" class="mc-btn2" data-pdf>↓ PDF квартиры</button><a class="mc-btn2" href="my.html?v=basket">🛒 Корзина · ' + (t.count || 0) + '</a></div>' +
      '</div>';
    root.querySelector('[data-pdf]').addEventListener('click', function () {
      if (P && FL.downloadSheet) FL.downloadSheet(function () { return P.T.img; }); else S.ui.toast('PDF квартиры соберём, когда будет план — пока есть PDF капсулы в Интерьере');
    });
  }
  window.SOVE_MY_CENTER = function (root) {
    document.body.classList.add('my-center'); root.className = 'wrap mc-root';
    view(root); window.addEventListener('sove:repair', function () { if (document.body.contains(root)) view(root); });
    /* «Выбрать» / «Сменить» интерьер — общее окно выбора капсулы на месте (window.SOVE_MY_PICK из my.js: запись, тост «Открыть»);
       «＋ Свой интерьер» в окне — экран своего интерьера. Без окна или Ctrl/Cmd-клик — обычная ссылка (каталог с возвратом сюда) */
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-mc-pick]'), PK = window.SOVE_MY_PICK;
      if (!a || !PK || !PK.open || !S.capsulePicker || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      PK.open({ own: true, onPick: function () { var b = root.querySelector('[data-mc-pick]'); if (b) try { b.focus({ preventScroll: true }); } catch (x) {} } });
    });
  };
})();
