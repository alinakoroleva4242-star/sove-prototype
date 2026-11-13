/* METOD: статус подписки, цифры из данных, тарифы, примеры цен, вопросы */
(function () {
  /* METOD = лента «Метод ремонта» (Алина 03–04.11): подписка оформляется в ленте, отдельной страницы нет; ?buy= и ?returnTo= переносим */
  var _q = new URLSearchParams(location.search), _buy = _q.get('buy') || _q.get('plan'), _rt = _q.get('returnTo');
  location.replace('feed.html' + (_buy || _rt ? '?' + [_buy ? 'buy=' + encodeURIComponent(_buy) : '', _rt ? 'returnTo=' + encodeURIComponent(_rt) : ''].filter(Boolean).join('&') : ''));
  return;

  var S = window.SOVE, D = S.data, F = S.fmt;

  function safeReturn(v) { return v && /^[a-z0-9_-]+\.html([?#][^\s<>"'\\]*)?$/i.test(v) ? v : null; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return n + ' ' + ((a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many); }
  function months(n) { return plural(n, 'месяц', 'месяца', 'месяцев'); }
  function dateYear(ts) { var d = new Date(ts); return F.dateLong(ts) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }

  var returnTo = safeReturn(S.ui.qs('returnTo'));
  var rtParam = '&returnTo=' + encodeURIComponent(returnTo || 'metod.html');

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
  /* подарок подписки (ТЗ 04.11, правило 17): METOD на 6 месяцев и «Навсегда» — тариф «Твоя квартира», 25 генераций, один раз при оплате */
  document.getElementById('mt-ai-text').textContent = 'METOD на 6 месяцев и «Навсегда» дарит тариф «Твоя квартира» — 25 генераций, один раз при оплате. На 1 и 3 месяца подарка нет. Генерации не сгорают.';
  document.getElementById('mt-pack-link').href = 'tokens.html' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '');

  /* примеры цен: товары с самой большой скидкой */
  document.getElementById('mt-products').innerHTML = D.products.slice().sort(function (a, b) { return b.discount - a.discount || a.id - b.id; }).slice(0, 4).map(function (p) { return S.ui.productCard(p); }).join('');

  /* вопросы — только то, что известно */
  var pack = (D.gen && D.gen.topup && D.gen.topup[0]) || { price: 49, tokens: 1 };
  var faq = [
    ['Сколько генераций входит в подписку?', 'METOD на 6 месяцев и «Навсегда» — 25 генераций в подарок (тариф «Твоя квартира»), один раз при оплате. На 1 и 3 месяца — без подарка. Генерации не сгорают.'],
    ['На что тратить подарочные генерации?', 'На любые действия: план, материалы, бюджет, комнаты, ракурсы, замены — одно действие = одна генерация, на любые квартиры.'],
    ['Бюджет по капсуле — платный?', 'По подписке METOD бюджет по капсулам SOVEAPP считается без списаний. Без подписки — один раз за подарочную генерацию, дальше нужна подписка. Капсулы дизайнеров и свой интерьер — 1 генерация для всех.'],
    ['Что будет, когда подписка закончится?', 'Контакты поставщиков в карточках закроются. Купленные генерации и пакеты, разово открытые контакты, проекты и избранное останутся в кабинете.'],
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
    if (returnTo && !/^metod\.html/i.test(returnTo)) {
      html += '<div class="notice"><span class="small">После оплаты вернём вас на экран, с которого вы пришли, — фото и параметры сохранены. На 6 месяцев — 25 генераций в подарок; нужны только генерации — пакет по зонам или генерации.</span><a class="btn btn--ghost btn--sm" href="tokens.html?returnTo=' + encodeURIComponent(returnTo) + '">Пакеты и генерации</a></div>';
    }
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
        '<a class="btn ' + (isBest ? 'btn--primary' : 'btn--ghost') + ' btn--block" href="tokens.html?plan=' + p.id + rtParam + '" aria-label="' + (active ? 'Продлить на ' : 'Оформить на ') + months(p.months) + '">' + (active ? 'Продлить' : 'Оформить') + '</a>' +
        '</article>';
    }).join('');
  }
  renderState();

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
    ['25 генераций в подарок', 'на 6 месяцев и «Навсегда» — тариф «Твоя квартира» один раз при оплате']
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
