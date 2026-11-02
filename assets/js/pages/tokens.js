/* Пополнение: выбор одной позиции (пакет по зонам, METOD или токены поштучно), заказ, переход к оплате.
   Решение созвона 28.10: оплата за зоны / интерьер, замены входят в пакет; в подписке — один интерьер, бесплатных токенов нет. Цены пакетов — пример (data.js). */
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
  var cameFromWork = returnTo && !/^(metod|tokens|account)\.html/i.test(returnTo);

  /* позиции: всё из данных */
  var items = {}, PKGS = D.packages || [];
  PKGS.forEach(function (p) {
    items['package:' + p.id] = { key: 'package:' + p.id, item: { kind: 'package', id: p.id, title: p.title, price: p.price, zones: p.zones === undefined ? null : p.zones, note: p.note || '' }, includes: p.includes || [] };
  });
  D.tokenPacks.forEach(function (p) {
    items['pack:' + p.id] = { key: 'pack:' + p.id, item: { kind: 'pack', id: p.id, title: F.tokens(p.tokens), price: p.price, tokens: p.tokens }, perToken: p.price / p.tokens };
  });
  D.metodPlans.forEach(function (m) {
    items['metod:' + m.id] = { key: 'metod:' + m.id, item: { kind: 'metod', id: m.id, title: 'METOD · ' + months(m.months), price: m.price, months: m.months }, perMonth: m.price / m.months };
  });

  /* предвыбор: адрес → сохранённый перед входом выбор → «1 зона» (первый пакет) */
  var saved = S.draft.get('checkout');
  function pick() {
    var pack = S.ui.qs('pack'), plan = S.ui.qs('plan'), pkg = S.ui.qs('package');
    if (pkg && items['package:' + pkg]) return 'package:' + pkg;
    if (pack && items['pack:' + pack]) return 'pack:' + pack;
    if (plan && items['metod:' + plan]) return 'metod:' + plan;
    if (saved && items[saved.kind + ':' + saved.id]) return saved.kind + ':' + saved.id;
    return PKGS.length ? 'package:' + PKGS[0].id : (items['pack:p300'] ? 'pack:p300' : Object.keys(items)[0]);
  }
  var current = pick();

  var form = document.getElementById('tk-form');
  var packsBox = document.getElementById('tk-packs'), plansBox = document.getElementById('tk-plans'), pkgBox = document.getElementById('tk-packages');
  var agree = document.getElementById('tk-agree'), payBtn = document.getElementById('tk-pay'), payHint = document.getElementById('tk-pay-hint');
  var bar = document.getElementById('tk-bar'), order = document.getElementById('order');
  var busy = false;

  /* тексты, зависящие от данных и адреса */
  document.getElementById('tk-return-note').hidden = !cameFromWork;
  document.getElementById('tk-pack-desc').textContent = 'Поиск по фото стоит ' + F.tokens(D.costs.photo) + ', поиск по рендеру — ' + F.tokens(D.costs.render) + '.';
  if (returnTo) document.getElementById('tk-metod-link').href = 'metod.html?returnTo=' + encodeURIComponent(returnTo);

  function zonesWord(z) { return z === null ? 'все комнаты' : plural(z, 'зона', 'зоны', 'зон'); }

  function option(o) {
    var it = o.item, note = it.kind === 'pack' ? kop(o.perToken) + ' за токен' : (it.months === 1 ? F.rub(o.perMonth) : '≈ ' + F.rub(o.perMonth)) + ' в месяц';
    var title = it.kind === 'pack' ? it.title : months(it.months);
    return '<label class="option tk-opt" data-key="' + o.key + '">' +
      '<input type="radio" name="item" value="' + o.key + '">' +
      '<span class="tk-opt__mark" aria-hidden="true"></span>' +
      '<span class="tk-opt__main"><span class="option__title num">' + F.esc(title) + '</span><span class="option__note num">' + note + '</span></span>' +
      '<span class="tk-opt__price num">' + F.rub(it.price) + '</span></label>';
  }
  /* карточка пакета по зонам: название, что входит, цена */
  function pkgCard(o) {
    var it = o.item;
    return '<label class="option tk-opt tk-pkg" data-key="' + o.key + '">' +
      '<input type="radio" name="item" value="' + o.key + '">' +
      '<span class="tk-pkg__head"><span class="tk-opt__mark" aria-hidden="true"></span><span class="option__title">' + F.esc(it.title) + '</span><span class="tk-opt__price num">' + F.rub(it.price) + '</span></span>' +
      '<span class="option__note">' + F.esc(it.note) + '</span>' +
      '<ul class="tk-pkg__list">' + o.includes.map(function (s) { return '<li>' + F.esc(s) + '</li>'; }).join('') + '</ul>' +
      '</label>';
  }
  if (pkgBox) pkgBox.innerHTML = PKGS.map(function (p) { return pkgCard(items['package:' + p.id]); }).join('');
  packsBox.innerHTML = D.tokenPacks.map(function (p) { return option(items['pack:' + p.id]); }).join('');
  plansBox.innerHTML = D.metodPlans.map(function (m) { return option(items['metod:' + m.id]); }).join('');

  function selfUrl() {
    var it = items[current].item;
    return 'tokens.html?' + (it.kind === 'pack' ? 'pack=' : it.kind === 'package' ? 'package=' : 'plan=') + it.id + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : '');
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
    if (it.kind === 'package') {
      title = 'Пакет «' + it.title + '»';
      note = 'Материалы, визуализации и замены ' + (it.zones === null ? 'во всех комнатах одной квартиры' : it.zones === 1 ? 'в одной комнате' : 'в ' + plural(it.zones, 'комнате', 'комнатах', 'комнатах')) + '. Повторные действия в оплаченной зоне бесплатны.';
      rows += row('Пакет', F.rub(it.price));
      rows += row('Зон в пакете', zonesWord(it.zones));
      rows += row('Замены и ракурсы', 'включены');
      if (it.zones !== null) rows += row('Цена за зону', F.rub(Math.round(it.price / it.zones)));
      var chip = inn && S.tokens.packageChip ? S.tokens.packageChip() : null;
      if (chip) rows += row('Сейчас активен', chip);
      done = 'Пакет включим сразу после подтверждения оплаты';
    } else if (it.kind === 'pack') {
      title = it.title;
      note = 'Хватит на ' + plural(Math.floor(it.tokens / D.costs.photo), 'поиск', 'поиска', 'поисков') + ' по фото или ' + Math.floor(it.tokens / D.costs.render) + ' по рендеру. Токены не сгорают.';
      rows += row('Пакет токенов', F.rub(it.price));
      rows += row('Цена за токен', kop(o.perToken));
      if (inn) {
        rows += row('Сейчас на балансе', F.tokens(S.tokens.balance()));
        rows += row('Баланс после оплаты', F.tokens(S.tokens.balance() + it.tokens));
      } else {
        rows += row('Зачислим после оплаты', '+' + F.tokens(it.tokens));
      }
      done = 'Токены зачислим сразу после подтверждения оплаты';
    } else {
      var active = S.metod.active(), from = active ? S.metod.until() : Date.now();
      title = 'Подписка METOD · ' + months(it.months);
      note = 'Контакты всех поставщиков и закрытый клуб в Telegram на весь срок. Один интерьер в подарок: все комнаты, замены включены.';
      rows += row('Подписка на ' + months(it.months), F.rub(it.price));
      rows += row('Выходит в месяц', (it.months === 1 ? '' : '≈ ') + F.rub(o.perMonth));
      rows += row(active ? 'Продлим до' : 'Будет активна до', dateYear(from + it.months * 30 * DAY));
      rows += row('Бонус подписки', (D.metodBonus && D.metodBonus.label) || 'один интерьер');
      if (inn && S.tokens.giftExpires && S.tokens.giftExpires()) rows += row('Подарочные токены', 'сгорят при оплате');
      done = 'Подписку и бонусный интерьер включим сразу после подтверждения оплаты';
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

  var lastIn = S.auth.isIn(), lastBal = S.tokens.balance(), lastMetod = S.metod.until(), lastPk = S.tokens.packageChip ? S.tokens.packageChip() : null;
  S.onChange(function () {
    if (busy) return;
    var a = S.auth.isIn(), b = S.tokens.balance(), m = S.metod.until(), p = S.tokens.packageChip ? S.tokens.packageChip() : null;
    if (a !== lastIn || b !== lastBal || m !== lastMetod || p !== lastPk) { lastIn = a; lastBal = b; lastMetod = m; lastPk = p; render(); }
  });

  render();
})();
