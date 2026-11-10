/* METOD: статус подписки, цифры из данных, тарифы, примеры цен, вопросы */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;

  function safeReturn(v) { return v && /^[a-z0-9_-]+\.html([?#][^\s<>"'\\]*)?$/i.test(v) ? v : null; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return n + ' ' + ((a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many); }
  function months(n) { return plural(n, 'месяц', 'месяца', 'месяцев'); }
  function dateYear(ts) { var d = new Date(ts); return F.dateLong(ts) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }

  var returnTo = safeReturn(S.ui.qs('returnTo'));
  /* METOD = лента «Метод ремонта» (Алина 03.11): подписка оформляется в ленте, отдельной страницы нет */
  var bq = S.ui.qs('buy') || S.ui.qs('plan');
  location.replace('feed.html' + (bq ? '?buy=' + encodeURIComponent(bq) : ''));
  return;

  var plans = D.metodPlans.map(function (m) { return { id: m.id, months: m.months, price: m.price, perMonth: m.price / m.months }; });
  var base = plans.filter(function (p) { return p.months === 1; })[0] || plans[0];
  var best = plans.reduce(function (a, b) { return b.perMonth < a.perMonth ? b : a; });
  var discounts = D.products.map(function (p) { return p.discount; });
  var dMin = Math.min.apply(null, discounts), dMax = Math.max.apply(null, discounts);
  var range = dMin === dMax ? dMax + ' %' : dMin + '–' + dMax + ' %';

  /* первый экран */
  var terms = plans.map(function (p) { return p.months; });
  document.getElementById('mt-terms').textContent = terms.length > 1 ? terms.slice(0, -1).join(', ') + ' или\u00a0' + months(terms[terms.length - 1]).replace(' ', '\u00a0') : months(terms[0]);
  var k2 = D.capsule('k2'); if (k2) document.getElementById('mt-cap').textContent = k2.name;
  document.getElementById('mt-facts').innerHTML = [
    [range, 'скидки партнёров в каталоге'],
    ['от ' + F.rub(best.perMonth), 'в месяц при оплате за ' + months(best.months)],
    [terms.join(' · '), 'месяцев — срок на выбор']
  ].map(function (f) { return '<div class="rule-top stack stack--2"><span class="mid-num">' + f[0] + '</span><span class="tiny muted">' + f[1] + '</span></div>'; }).join('');
  /* подарок METOD (тарифы генераций, 03.11): «Твоя квартира» 16 ✦ + 8 ⇄ — только на 6 месяцев, один раз за оплату */
  document.getElementById('mt-ai-text').textContent = 'При оплате на 6 месяцев — тариф «Твоя квартира» в подарок: 16 генераций и 8 замен, один раз за оплату. На 1 и 3 месяца подарка генераций нет.';
  document.getElementById('mt-pack-link').href = 'account.html?v=tokens';

  /* примеры цен: товары с самой большой скидкой */
  document.getElementById('mt-products').innerHTML = D.products.slice().sort(function (a, b) { return b.discount - a.discount || a.id - b.id; }).slice(0, 4).map(function (p) { return S.ui.productCard(p); }).join('');

  /* вопросы — только то, что известно */
  var faq = [
    ['Входят ли генерации в подписку?', 'При оплате на 6 месяцев — тариф «Твоя квартира» в подарок: 16 генераций и 8 замен, один раз за оплату. На 1 и 3 месяца подарка нет. Генерации и замены не сгорают.'],
    ['Что будет, когда подписка закончится?', 'Контакты поставщиков в карточках закроются. Генерации и замены, разово открытые контакты, проекты и избранное останутся в кабинете.'],
    ['Можно продлить заранее?', 'Да. Новый срок прибавится к текущему — оставшиеся дни не пропадут. Оплата разовая, за выбранный срок; будет ли автопродление — уточняется.'],
    ['Можно открыть один контакт без подписки?', D.singleAccess ? 'Да, разовый доступ к контакту стоит ' + F.rub(D.singleAccess.price || D.singleAccess) + '.' : 'Разовый доступ к контакту предусмотрен, его цена уточняется. С METOD открыты контакты сразу всех поставщиков.']
  ];
  document.getElementById('mt-faq').innerHTML = faq.map(function (q) { return '<details><summary><span>' + q[0] + '</span><span class="mt-faq__sign" aria-hidden="true"></span></summary><p class="mt-faq__a">' + q[1] + '</p></details>'; }).join('');

  /* зависит от входа и подписки */
  function renderState() {
    var active = S.metod.active(), top = document.getElementById('mt-top'), html = '';
    if (active) {
      html += '<div class="notice notice--ok"><span><b>Подписка активна до ' + dateYear(S.metod.until()) + '</b> · ' + (S.metod.daysLeft() === 1 ? 'остался ' : 'осталось ') + plural(S.metod.daysLeft(), 'день', 'дня', 'дней') + '</span><a class="btn btn--dark btn--sm" href="#plans">Продлить</a></div>';
    }
    /* блок «После оплаты вернём вас… · Тарифы генераций» убран: METOD выглядит одинаково, откуда бы ни пришли (Алина 03.11) */
    top.innerHTML = html; top.hidden = !html;

    document.getElementById('mt-plan-cards').innerHTML = plans.map(function (p) {
      var isBest = p.id === best.id && plans.length > 1;
      var save = base.price * p.months - p.price;
      var until = (active ? S.metod.until() : Date.now()) + p.months * 30 * 864e5;
      return '<article class="mt-plan' + (isBest ? ' is-best' : '') + '">' +
        '<div class="mt-plan__head"><h3 class="eyebrow">' + months(p.months) + '</h3>' + (isBest ? '<span class="badge">выгоднее всего</span>' : '') + '</div>' +
        '<div class="mt-plan__price"><span class="big-num">' + F.rub(p.price) + '</span><span class="small muted num">' + (p.months === 1 ? '' : '≈ ') + F.rub(p.perMonth) + ' в месяц</span></div>' +
        '<div class="mt-plan__facts small">' +
        '<span>' + (active ? 'Продлим до ' : 'Будет активна до ') + '<b class="num">' + dateYear(until) + '</b></span>' +
        '<span class="muted">' + (save > 0 ? 'На ' + F.rub(save) + ' дешевле, чем платить по месяцу' : 'Чтобы попробовать и открыть нужные контакты') + '</span>' +
        '</div>' +
        '<a class="btn ' + (isBest ? 'btn--primary' : 'btn--ghost') + ' btn--block" href="#" data-mt-buy="' + p.id + '" aria-label="' + (active ? 'Продлить на ' : 'Оформить на ') + months(p.months) + '">' + (active ? 'Продлить' : 'Оформить') + '</a>' +
        '</article>';
    }).join('');
  }
  renderState();

  /* оплата METOD прямо отсюда, без страницы тарифов (Алина 03.11: «это дубль»); гостя — на вход и обратно сюда же с ?buy= */
  function buy(id) {
    var m = D.metodPlans.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    if (!S.auth.isIn()) { S.ui.needAuth('Войдите, чтобы оплатить', 'metod.html?buy=' + id + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : '')); return; }
    var pm = S.pay.create({ kind: 'metod', id: m.id, title: 'METOD · ' + months(m.months), price: m.price, months: m.months }, returnTo || 'metod.html');
    location.href = 'pay.html?id=' + encodeURIComponent(pm.id);
  }
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-mt-buy]'); if (a) { e.preventDefault(); buy(a.getAttribute('data-mt-buy')); } });
  var buyId = S.ui.qs('buy');
  if (buyId) { try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]buy=[^&]*/, '').replace(/^&/, '?')); } catch (e) {} buy(buyId); }

  var lastKey = String(S.auth.isIn()) + S.metod.until();
  S.onChange(function () { var k = String(S.auth.isIn()) + S.metod.until(); if (k !== lastKey) { lastKey = k; renderState(); } });

  /* что внутри клуба и три двери — состав перенесён с сайта (metod.tsx) */
  var INSIDE = [
    ['Анонс закрытых акций', 'эксклюзивные, только подписчикам — скидка в клубе'],
    ['Мудборды от дизайнера', 'готовые наборы: палитра, материалы, референсы (раз в неделю)'],
    ['Подборка товаров — каждый день', 'курируемые товары со скидками: свет, мебель, отделка'],
    ['Отзывы о поставщиках', 'из первых рук: кто с кем работал и какое качество'],
    ['Общение среди участников', '3000+ человек, которые делают ремонт']
  ];
  var DOORS = [
    ['Скидки по всему маркетплейсу', 'цены и прямые контакты всех брендов-партнёров открываются сразу'],
    ['Клуб 3000+', 'закрытый доступ к сообществу и материалам клуба'],
    ['«Твоя квартира» в подарок', '16 генераций и 8 замен при оплате на 6 месяцев, один раз за оплату']
  ];
  var clubEl = document.getElementById('mt-club');
  if (clubEl) clubEl.innerHTML = '<div class="pb-list">' + INSIDE.map(function (x) {
    return '<div class="pb-item"><b>' + F.esc(x[0]) + '</b><span>' + F.esc(x[1]) + '</span></div>';
  }).join('') + '</div>';
  var doorsEl = document.getElementById('mt-doors');
  if (doorsEl) doorsEl.innerHTML = '<div class="pb-list">' + DOORS.map(function (x, i) {
    return '<div class="pb-item"><b>' + (i + 1) + ' · ' + F.esc(x[0]) + '</b><span>' + F.esc(x[1]) + '</span></div>';
  }).join('') + '</div>';

})();

/* цифры под обложкой: бренды и диапазон скидок берём из каталога прототипа */
(function () {
  var S = window.SOVE, D = S.data;
  var brands = {}; D.products.forEach(function (p) { if (p.brand && p.brand !== 'на заказ') brands[p.brand] = 1; });
  var ds = D.products.map(function (p) { return p.discount; }).filter(function (d) { return d > 0; });
  var el1 = document.getElementById('mt-brands'), el2 = document.getElementById('mt-disc');
  if (el1) el1.textContent = Object.keys(brands).length + '+';
  if (el2 && ds.length) el2.textContent = 'до ' + Math.max.apply(null, ds) + ' %';
})();
