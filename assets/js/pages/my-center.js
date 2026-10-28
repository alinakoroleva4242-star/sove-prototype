/* Мой ремонт — центр возврата (design/interior/TZ-interior.md, разделы 7 и 9; эталон etalon-MR): my.html?v=center.
   Шапка «Мой ремонт» + строка квартиры · кольцо «Ремонт готов на N из 3» (Планировка · Интерьер · Работы) · три карточки ·
   «Комнаты · N» · «Бюджет» — одна карточка-вход в my.html?v=budget (design/budget/TZ-budget.md: 9 категорий + 5 этапов, строки разворачиваются там) ·
   «Избранное» — карусель: интерьеры, «＋ свой интерьер», товары с ♡. Мой ремонт ничего не хранит и не меняет — только показывает и ведёт в блок.
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
     расчёта; Интерьер на часть квартиры — известная сумма материалов, а не «≈ 0 ₽» */
  function budgetCard(B) {
    var C = B && B.C, paid = C ? C.totals.paid : 0, rb = R.get().budget, rbt = rb && rb.total || 0;
    var noInt = !C && !!FL && !!FL.interiorChosen && !FL.interiorChosen();
    var om = !C && !B.total && R.ownMat ? R.ownMat() : null, part = om && !om.known && om.part > 0 ? om.part : 0;
    var sub = noInt ? (rbt ? 'по расчёту ремонта · весь — в Бюджете' : 'выбери интерьер — покажем бюджет') : C ? '9 категорий · 5 этапов работ'
      : part ? 'известно — материалы из Интерьера · весь — в Бюджете' : 'известно ' + B.known + ' из 4 · весь — в Бюджете';
    var val = noInt ? (rbt ? '≈ ' + F.rub(rbt) : '—') : '≈ ' + F.rub(part || B.total);
    return '<a class="mc-bcard" href="my.html?v=budget"><span><b>Бюджет</b><small>' + sub + (paid ? ' · оплачено ' + F.rub(paid) : '') + '</small></span><em>' + val + '</em><i>›</i></a>';
  }
  /* Избранное — пока карусель-вход (Алина 25.10): сохранённые интерьеры квартир, подборки товаров к интерьеру, «＋ свой интерьер», товары с ♡; «Все ›» — экран Избранного */
  function favCarousel() {
    var items = [];
    R.flats.list().forEach(function (fl) { var x = R.get(fl.id).interior; if (x && x.slots && x.imageUrl) items.push('<a class="mc-fv" href="interior.html?v=b&from=my&flat=' + encodeURIComponent(fl.id) + '"><span class="mc-fv__p" style="background-image:url(' + esc(x.imageUrl) + ')"></span><b>' + esc(x.name || x.style) + '</b><small>интерьер · ' + esc(fl.name) + '</small></a>'); });
    R.favSets.list().forEach(function (x) { var n = (x.productIds || []).length; items.push('<a class="mc-fv" href="favorites.html"><span class="mc-fv__p"' + (x.cover ? ' style="background-image:url(' + esc(x.cover) + ')"' : '') + '><i>♥</i></span><b>' + esc(x.title) + '</b><small>подборка · ' + n + ' тов.</small></a>'); });
    items.push('<a class="mc-fv mc-fv--add" href="interior.html?v=a"><span class="mc-fv__p">＋</span><b>Свой интерьер</b><small>картинка, фото, Pinterest</small></a>');
    R.fav.list().forEach(function (id) { var p = S.data.product(id); if (p && p.img) items.push('<a class="mc-fv" href="product.html?id=' + p.id + '"><span class="mc-fv__p" style="background-image:url(' + esc(p.img) + ')"><i>♡</i></span><b>' + esc(p.name) + '</b><small>' + F.rub(p.metod) + '</small></a>'); });
    return '<section class="mc-fav"><div class="mc-fav__h"><b>Избранное</b><a href="favorites.html">Все ›</a></div><div class="mc-fav__row">' + items.join('') + '</div></section>';
  }
  function roomsCard(it) {
    var rs = []; (it && it.renders || []).forEach(function (r) { if (r.img && !rs.some(function (x) { return x.room === r.room; })) rs.push(r); });
    if (!rs.length) return '';
    return '<section class="mc-mat"><div class="mc-mat__h"><b>Комнаты · ' + rs.length + '</b><small>замена предметов — на рендере</small></div><div class="mc-rooms">' +
      rs.map(function (r) { return '<a href="' + INT + '&room=' + window.SOVE_KB.zoneId(r.zone || window.SOVE_KB.zoneOf(r.room)) + '" style="background-image:url(' + esc(r.img) + ')"><span>' + esc(r.room) + '</span></a>'; }).join('') + '</div></section>';
  }
  function view(root) {
    FL = window.SOVE_FLOW || FL;
    var f = R.flats.active(), r = R.get(), it = r.interior && r.interior.slots ? r.interior : null, P = FL && FL.planDoc && FL.planDoc(), B = layers();
    var plan = !!r.plan || !!P || !!(f && f.m2), works = !!(FL && FL.budgetFull && FL.budgetFull());
    var done = [plan, !!it, works].filter(Boolean).length, pct = Math.round(done / 3 * 100);
    var next = !plan ? 'осталось загрузить план' : !it ? 'осталось выбрать интерьер' : !works ? 'осталось узнать стоимость работ' : 'всё готово — можно к покупкам';
    var nRooms = it ? (it.renders || []).filter(function (x) { return x.img && !x.angle; }).length : 0;
    var part = function (k) { return B.parts.filter(function (x) { return x.key === k; })[0] || {}; };
    var mat = part('materials'), dec = part('decor'), furn = part('furniture'), wk = part('works');
    var matDecor = (mat.known ? mat.value : 0) + (dec.known ? dec.value : 0), t = R.cart.totals();
    var line = f ? [f.jk ? 'ЖК ' + f.jk : '', f.rooms ? f.rooms + '-комн' : '', f.m2 ? F.area(f.m2) : ''].filter(Boolean).join(' · ') : '';
    root.innerHTML = '<header class="mc-head"><div><b>Мой ремонт</b><a class="pz-tok" href="tokens.html">' + esc(F.tokens(S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens)) + ' 🎁</a></div>' +
        '<small>' + esc(line || (f ? f.name : 'Моя квартира')) + '</small></header>' +
      '<div class="mc-body">' +
      '<div class="mc-ring"><span class="mc-ring__c" style="--p:' + pct + '%"><b>' + pct + '%</b></span><span><b>Ремонт готов на ' + done + ' из 3</b><small>' + next + '</small></span></div>' +
      card({ t: 'Планировка', done: plan, img: P ? P.T.img : (r.plan ? r.plan.img : null), icon: '⌂', sub: P ? P.T.count + ' ' + plural(P.T.count, 'предмет', 'предмета', 'предметов') + ' мебели · расставлено' : plan ? 'план загружен · мебель не расставлена' : 'план и расстановка мебели',
        label: 'МЕБЕЛЬ', value: furn.known ? F.rub(furn.value) : '—', btn: plan ? '<a class="mc-btn" href="' + LINK.plan + '">Изменить</a>' : '<a class="mc-btn mc-btn--acc" href="' + LINK.plan + '">Загрузить план</a>', dashed: !plan }) +
      card({ t: it ? 'Интерьер · ' + (it.name || it.style) : 'Интерьер', done: !!it, img: it ? it.imageUrl : null, icon: '◐', sub: it ? '12 материалов · ' + nRooms + ' ' + plural(nRooms, 'комната', 'комнаты', 'комнат') : 'капсула SOVEAPP или своя картинка',
        label: 'МАТЕРИАЛЫ И ДЕКОР', value: it && mat.known ? '≈ ' + F.rub(matDecor) : it ? 'часть квартиры' : '—', btn: it ? '<a class="mc-btn" href="' + INT + '">Изменить</a>' : '<a class="mc-btn mc-btn--acc" href="interior.html?v=a">Выбрать</a>', dashed: !it }) +
      card({ t: 'Работы', done: works, img: null, icon: '⚒', sub: 'черновые и чистовые по твоим материалам', label: 'РАБОТЫ', value: works ? F.rub(wk.value) : '—',
        btn: works ? '<a class="mc-btn" href="' + LINK.works + '">Открыть</a>' : '<a class="mc-btn mc-btn--acc" href="' + LINK.works + '">Узнать стоимость · 🎟</a>', dashed: !works }) +
      roomsCard(it) + budgetCard(B) + favCarousel() +
      '<div class="mc-acts"><button type="button" class="mc-btn2" data-pdf>↓ PDF квартиры</button><a class="mc-btn2" href="my.html?v=basket">🛒 Корзина · ' + (t.count || 0) + '</a></div>' +
      '</div>';
    root.querySelector('[data-pdf]').addEventListener('click', function () {
      if (P && FL.downloadSheet) FL.downloadSheet(function () { return P.T.img; }); else S.ui.toast('PDF квартиры соберём, когда будет план — пока есть PDF капсулы в Интерьере');
    });
  }
  window.SOVE_MY_CENTER = function (root) {
    document.body.classList.add('my-center'); root.className = 'wrap mc-root';
    view(root); window.addEventListener('sove:repair', function () { if (document.body.contains(root)) view(root); });
  };
})();
