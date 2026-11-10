/* Пополнение: выбор одной позиции (тариф, докупка или METOD), заказ, переход к оплате.
   Документ «Генерации SOVE — тарифы и экономика» (03.11): ✦ генерации и ⇄ замены, три тарифа по результату и докупка; СБП — по умолчанию. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;
  var DAY = 864e5;

  /* returnTo принимаем только как адрес страницы этого сайта */
  function safeReturn(v) { return v && /^[a-z0-9_-]+\.html([?#][^\s<>"'\\]*)?$/i.test(v) ? v : null; }
  function months(n) { var a = n % 100, b = n % 10; return n + ' ' + ((a > 10 && a < 20) ? 'месяцев' : b === 1 ? 'месяц' : (b >= 2 && b <= 4) ? 'месяца' : 'месяцев'); }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return n + ' ' + ((a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many); }
  function kop(n) { return n.toFixed(2).replace('.', ',') + ' ₽'; }
  function dateYear(ts) { var d = new Date(ts); return F.dateLong(ts) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }

  var returnTo = safeReturn(S.ui.qs('returnTo'));
  /* всё про генерации живёт в Профиль → Баланс (Алина 03.11): страница тарифов не нужна:
     тариф или докупка (?pack=) — сразу к оплате из Баланса */
  /* METOD (?plan=) оформляется на странице METOD — страница тарифов больше не открывается совсем */
  var pk = S.ui.qs('pack'), pl = S.ui.qs('plan'), rtQ = returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : '';
  location.replace(pl ? 'feed.html?buy=' + encodeURIComponent(pl) : 'account.html?v=tokens' + (pk ? '&buy=' + encodeURIComponent(pk) : '') + rtQ);
  return;
  var cameFromWork = returnTo && !/^(metod|tokens|account)\.html/i.test(returnTo);

  /* позиции: тарифы и докупка (kind 'pack': генерации и замены) и METOD — всё из данных */
  var items = {}, PLANS = D.genPlans || [], TOPS = D.genTopups || [];
  PLANS.concat(TOPS).forEach(function (p) {
    items['pack:' + p.id] = { key: 'pack:' + p.id, plan: PLANS.indexOf(p) >= 0, src: p, item: { kind: 'pack', id: p.id, title: p.title, price: p.price, tokens: p.gens, swaps: p.swaps } };
  });
  D.metodPlans.forEach(function (m) {
    items['metod:' + m.id] = { key: 'metod:' + m.id, item: { kind: 'metod', id: m.id, title: 'METOD · ' + months(m.months), price: m.price, months: m.months }, perMonth: m.price / m.months };
  });

  /* предвыбор: адрес → сохранённый перед входом выбор → «1 зона» (первый пакет) */
  var saved = S.draft.get('checkout');
  function pick() {
    var pack = S.ui.qs('pack'), plan = S.ui.qs('plan'), pkg = S.ui.qs('package');
    if (pack && items['pack:' + pack]) return 'pack:' + pack;
    if (plan && items['metod:' + plan]) return 'metod:' + plan;
    if (saved && items[saved.kind + ':' + saved.id]) return saved.kind + ':' + saved.id;
    var main = PLANS.filter(function (p) { return p.main; })[0] || PLANS[0];
    return main ? 'pack:' + main.id : Object.keys(items)[0];
  }
  var current = pick();

  var form = document.getElementById('tk-form');
  var packsBox = document.getElementById('tk-packs'), plansBox = document.getElementById('tk-plans'), pkgBox = document.getElementById('tk-packages');
  var agree = document.getElementById('tk-agree'), payBtn = document.getElementById('tk-pay'), payHint = document.getElementById('tk-pay-hint');
  var bar = document.getElementById('tk-bar'), order = document.getElementById('order');
  var busy = false;

  /* тексты, зависящие от данных и адреса */
  /* подпись «вернём на тот же экран» убрана из шапки (Алина 03.11) */
  if (returnTo) document.getElementById('tk-metod-link').href = 'metod.html?returnTo=' + encodeURIComponent(returnTo);

  function units(it) { return [it.tokens ? '✦ ' + F.tokens(it.tokens) : '', it.swaps ? '⇄ ' + F.swaps(it.swaps) : ''].filter(Boolean).join(' · '); }
  /* строка докупки и подписки: название, что входит, цена */
  function option(o) {
    var it = o.item, title = it.kind === 'pack' ? it.title : months(it.months);
    var note = it.kind === 'pack' ? units(it) + (it.tokens ? ' · ' + F.rub(Math.round(it.price / it.tokens)) + ' за генерацию' : '') : (it.months === 1 ? F.rub(o.perMonth) : '≈ ' + F.rub(o.perMonth)) + ' в месяц' + (D.metodBonus && it.months >= D.metodBonus.minMonths ? ' · «Твоя квартира» в подарок' : '');
    return '<label class="option tk-opt" data-key="' + o.key + '">' +
      '<input type="radio" name="item" value="' + o.key + '">' +
      '<span class="tk-opt__mark" aria-hidden="true"></span>' +
      '<span class="tk-opt__main"><span class="option__title num">' + F.esc(title) + '</span><span class="option__note num">' + note + '</span></span>' +
      '<span class="tk-opt__price num">' + F.rub(it.price) + '</span></label>';
  }
  /* карточка тарифа: название, генерации и замены, цена за генерацию */
  function pkgCard(o) {
    var it = o.item, p = o.src;
    return '<label class="option tk-opt tk-pkg" data-key="' + o.key + '">' +
      '<input type="radio" name="item" value="' + o.key + '">' +
      '<span class="tk-pkg__head"><span class="tk-opt__mark" aria-hidden="true"></span><span class="option__title">' + F.esc(it.title) + (p.main ? ' · главный' : '') + '</span><span class="tk-opt__price num">' + F.rub(it.price) + '</span></span>' +
      '<span class="option__note">' + F.rub(p.perGen) + ' за генерацию</span>' +
      '<ul class="tk-pkg__list"><li>✦ ' + F.tokens(p.gens) + '</li><li>⇄ ' + F.swaps(p.swaps) + ' · ' + F.esc(p.swapsNote) + '</li></ul>' +
      '</label>';
  }
  if (pkgBox) pkgBox.innerHTML = PLANS.map(function (p) { return pkgCard(items['pack:' + p.id]); }).join('');
  packsBox.innerHTML = TOPS.map(function (p) { return option(items['pack:' + p.id]); }).join('');
  plansBox.innerHTML = D.metodPlans.map(function (m) { return option(items['metod:' + m.id]); }).join('');

  function selfUrl() {
    var it = items[current].item;
    return 'tokens.html?' + (it.kind === 'pack' ? 'pack=' : 'plan=') + it.id + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : '');
  }

  function row(label, value) { return '<div><span>' + label + '</span><span class="num">' + value + '</span></div>'; }

  function render() {
    var o = items[current], it = o.item, inn = S.auth.isIn();
    form.querySelectorAll('.tk-opt').forEach(function (el) {
      var on = el.getAttribute('data-key') === current;
      el.classList.toggle('is-active', on);
      el.querySelector('input').checked = on;
    });

    var rows = '', note = '', title = '', done = '';
    if (it.kind === 'pack') {
      title = it.title;
      note = (o.plan ? 'Тариф: ' : 'Докупка: ') + units(it) + '. Генерации и замены не сгорают, тратятся на любые ваши квартиры.';
      rows += row(o.plan ? 'Тариф' : 'Докупка', F.rub(it.price));
      if (it.tokens) rows += row('✦ Генерации', '+' + F.num(it.tokens));
      if (it.swaps) rows += row('⇄ Замены', '+' + F.num(it.swaps));
      if (it.tokens) rows += row('За генерацию', F.rub(Math.round(it.price / it.tokens)));
      if (inn) rows += row('Баланс после оплаты', '✦ ' + F.num(S.tokens.balance() + (it.tokens || 0)) + ' · ⇄ ' + F.num((S.tokens.swaps ? S.tokens.swaps() : 0) + (it.swaps || 0)));
      rows += row('Оплата', 'СБП · или картой');
      done = 'Генерации и замены зачислим сразу после подтверждения оплаты';
    } else {
      var active = S.metod.active(), from = active ? S.metod.until() : Date.now();
      title = 'Подписка METOD · ' + months(it.months);
      var gift = D.metodBonus && it.months >= D.metodBonus.minMonths;
      note = 'Контакты всех поставщиков и закрытый клуб в Telegram на весь срок.' + (gift ? ' «Твоя квартира» в подарок: 16 генераций и 8 замен.' : '');
      rows += row('Подписка на ' + months(it.months), F.rub(it.price));
      rows += row('Выходит в месяц', (it.months === 1 ? '' : '≈ ') + F.rub(o.perMonth));
      rows += row(active ? 'Продлим до' : 'Будет активна до', dateYear(from + it.months * 30 * DAY));
      rows += row('Подарок', gift ? '✦ 16 · ⇄ 12' : 'нет');
      rows += row('Оплата', 'СБП · или картой');
      done = gift ? 'Подписку и подарок включим сразу после подтверждения оплаты' : 'Подписку включим сразу после подтверждения оплаты';
    }
    document.getElementById('tk-item-title').textContent = title;
    document.getElementById('tk-item-note').textContent = note;
    document.getElementById('tk-rows').innerHTML = rows;
    document.getElementById('tk-total').textContent = F.rub(it.price);
    document.getElementById('tk-guest').hidden = inn;
    payBtn.textContent = 'Оплатить ' + F.rub(it.price);
    document.getElementById('tk-bar-title').textContent = title;
    document.getElementById('tk-bar-price').textContent = F.rub(it.price);

    var back = cameFromWork ? 'Вернём вас на экран, с которого вы пришли, — всё сохранено.' : (returnTo && /^metod\.html/i.test(returnTo) ? 'Вернём вас на страницу METOD.' : 'Вернём вас в кабинет.');
    var steps = inn
      ? ['Откроется страница оплаты банка.', done + '.', back]
      : ['Попросим войти по коду из SMS. Выбор сохранится.', 'Откроется страница оплаты банка.', done + '. ' + back];
    document.getElementById('tk-next').innerHTML = steps.map(function (s) { return '<li>' + s + '</li>'; }).join('');

    syncPay();
    try { history.replaceState(null, '', selfUrl()); } catch (e) {}
  }

  function syncPay() {
    payBtn.disabled = !agree.checked;
    payHint.hidden = agree.checked;
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'item' && items[e.target.value]) { current = e.target.value; render(); }
    if (e.target === agree) syncPay();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy || !agree.checked) return;
    var it = items[current].item;
    if (!S.auth.isIn()) {
      S.draft.set('checkout', { kind: it.kind, id: it.id, agreed: true, returnTo: returnTo });
      S.ui.needAuth('Войдите, чтобы оплатить', selfUrl());
      return;
    }
    /* защита от двойного нажатия: второй платёж не создаётся */
    busy = true; payBtn.classList.add('is-loading'); payBtn.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      var pm = S.pay.create(it, returnTo || 'account.html');
      S.draft.clear('checkout');
      location.href = 'pay.html?id=' + encodeURIComponent(pm.id);
    }, 500);
  });

  /* вернулись кнопкой «назад» из оплаты — кнопка снова рабочая */
  window.addEventListener('pageshow', function (e) { if (e.persisted) { busy = false; payBtn.classList.remove('is-loading'); payBtn.removeAttribute('aria-busy'); } });

  /* после входа возвращаем отмеченное согласие */
  if (saved && saved.agreed && S.auth.isIn()) agree.checked = true;

  /* телефон: плашка с выбором видна, пока заказ за пределами экрана */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { bar.hidden = en[0].isIntersecting; }, { threshold: 0.05 }).observe(order);
  }

  var lastIn = S.auth.isIn(), lastBal = S.tokens.balance(), lastMetod = S.metod.until(), lastPk = (S.tokens.swaps ? S.tokens.swaps() : 0);
  S.onChange(function () {
    if (busy) return;
    var a = S.auth.isIn(), b = S.tokens.balance(), m = S.metod.until(), p = (S.tokens.swaps ? S.tokens.swaps() : 0);
    if (a !== lastIn || b !== lastBal || m !== lastMetod || p !== lastPk) { lastIn = a; lastBal = b; lastMetod = m; lastPk = p; render(); }
  });

  render();
})();
