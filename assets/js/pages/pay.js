/* Тестовая страница оплаты: три ответа «банка» и возврат на сайт.
   Зачисление делает SOVE.pay.confirm — ровно один раз, сколько бы раз страницу ни открывали. */
(function () {
  var S = window.SOVE, F = S.fmt;
  var root = document.getElementById('pay-root');
  var id = S.ui.qs('id');
  var CHECK_MS = 2500;

  function safeReturn(v) { return v && /^[a-z0-9_-]+\.html([?#][^\s<>"'\\]*)?$/i.test(v) ? v : null; }
  function dateYear(ts) { var d = new Date(ts); return F.dateLong(ts) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function time(ts) { var d = new Date(ts); return dateYear(ts) + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function backLabel(url) {
    var page = (url || '').split(/[?#]/)[0];
    return ({ 'ai.html': 'Вернуться к поиску', 'generation.html': 'Вернуться к результату', 'generations.html': 'Вернуться к генерациям', 'scout.html': 'Вернуться к расчёту',
      'product.html': 'Вернуться к товару', 'market.html': 'Вернуться в каталог', 'metod.html': 'Вернуться к METOD', 'project.html': 'Вернуться в проект',
      'capsule.html': 'Вернуться к капсуле', 'account.html': 'Вернуться в кабинет', 'my.html': 'Вернуться к заказу' })[page] || 'Вернуться';
  }
  function retryUrl(pm) {
    var it = pm.item, rt = pm.returnTo && pm.returnTo !== 'account.html' ? '&returnTo=' + encodeURIComponent(pm.returnTo) : '';
    if (it.kind === 'pack') return 'tokens.html?pack=' + encodeURIComponent(it.id) + rt;
    if (it.kind === 'metod') return 'tokens.html?plan=' + encodeURIComponent(it.id) + rt;
    return safeReturn(pm.returnTo) || 'market.html';
  }
  function orderTitle(pm) {
    var it = pm.item;
    if (it.kind === 'metod') return 'Подписка ' + it.title;
    if (it.kind === 'contact') return it.title || 'Контакт поставщика';
    if (it.kind === 'scout') return it.title || 'Открытие расчёта Скаут';
    if (it.kind === 'order') return it.title || 'Заказ поставщику';
    return 'Пакет · ' + it.title;
  }

  function show(html, status) {
    root.innerHTML = '<div class="pay-state" data-state="' + status + '">' + html + '</div>';
    var h = root.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }
  function rows(list) { return '<div class="rows rows--tight pay-rows">' + list.map(function (r) { return '<div><span>' + r[0] + '</span><span class="num">' + F.esc(r[1]) + '</span></div>'; }).join('') + '</div>'; }
  function on(sel, fn) { var el = root.querySelector(sel); if (el) el.addEventListener('click', fn); }

  /* ---------- экраны ---------- */
  function notFound() {
    document.title = 'Платёж не найден — SOVEAPP';
    show('<span class="pay-status">Платёж не найден</span>' +
      '<h1 class="pay-title">Не нашли такой заказ</h1>' +
      '<p class="text">Ссылка устарела или открыта в другом браузере. Деньги по ней не списывались. Соберите заказ заново — это минута.</p>' +
      '<div class="pay-actions"><a class="btn btn--primary btn--block" href="tokens.html">Выбрать пакет или подписку</a><a class="btn btn--ghost btn--block" href="my.html">В «Мой ремонт»</a></div>', 'notfound');
  }

  function needLogin() {
    show('<span class="pay-status">Нужен вход</span>' +
      '<h1 class="pay-title">Войдите, чтобы продолжить оплату</h1>' +
      '<p class="text">Заказ сохранён. После входа по коду из SMS вернём вас на эту страницу.</p>' +
      '<div class="pay-actions"><a class="btn btn--primary btn--block" href="auth.html?returnTo=' + encodeURIComponent('pay.html?id=' + id) + '">Войти</a></div>', 'login');
  }

  function formScreen(pm) {
    document.title = 'Оплата заказа — SOVEAPP';
    show('<span class="pay-status">Ожидает оплаты</span>' +
      '<h1 class="pay-title">Оплата заказа</h1>' +
      rows([['Заказ', orderTitle(pm)], ['Получатель', 'SOVEGROUP'], ['Номер заказа', pm.id]]) +
      '<div class="pay-sum"><span class="small muted">К оплате</span><span class="pay-sum__n num">' + F.rub(pm.item.price) + '</span></div>' +
      '<p class="pay-note">Карту вводить не нужно, деньги не списываются. Кнопки ниже — три ответа банка: оплата прошла, отказ, окно закрыли.</p>' +
      '<div class="pay-actions">' +
      '<button class="btn btn--primary btn--lg btn--block" type="button" data-act="ok">Оплатить ' + F.rub(pm.item.price) + '</button>' +
      '<button class="btn btn--ghost btn--block" type="button" data-act="fail">Банк отказал</button>' +
      '<button class="btn btn--link" type="button" data-act="close">Закрыть окно оплаты</button>' +
      '</div>', 'form');
    on('[data-act=ok]', function () { checking(pm); });
    on('[data-act=fail]', function () { S.pay.fail(pm.id, 'failed'); failed(S.pay.get(pm.id)); });
    on('[data-act=close]', function () { closed(pm); });
  }

  var checkingNow = false;
  function checking(pm) {
    if (checkingNow) return; checkingNow = true;
    document.title = 'Проверяем оплату — SOVEAPP';
    show('<span class="pay-status">Банк обрабатывает платёж</span>' +
      '<h1 class="pay-title">Проверяем оплату…</h1>' +
      '<div class="progress pay-progress" role="progressbar" aria-label="Проверка оплаты"><i></i></div>' +
      '<p class="text">Ждём подтверждение от банка. Обычно это несколько секунд — не закрывайте страницу.</p>' +
      rows([['Заказ', orderTitle(pm)], ['Сумма', F.rub(pm.item.price)]]), 'checking');
    var bar = root.querySelector('.pay-progress > i');
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = '100%'; }); });
    setTimeout(function () {
      var paid = S.pay.confirm(pm.id);
      checkingNow = false;
      if (paid && paid.status === 'paid') success(paid, true); else failed(S.pay.get(pm.id) || pm);
    }, CHECK_MS);
  }

  function success(pm, fresh) {
    var it = pm.item, big, sub, back = safeReturn(pm.returnTo) || 'account.html';
    if (it.kind === 'pack') { big = 'Готово: +' + F.tokens(it.tokens); sub = (fresh ? 'Баланс: ' : 'Сейчас на балансе: ') + F.tokens(S.tokens.balance()); }
    else if (it.kind === 'metod') {
      big = S.metod.active() ? 'METOD активен до ' + dateYear(S.metod.until()) : 'Подписка METOD оплачена';
      sub = S.metod.active() ? 'Контакты всех поставщиков открыты. Осталось дней: ' + S.metod.daysLeft() + '.' : 'Срок этой подписки уже закончился.';
    } else if (it.kind === 'scout') {
      big = 'Расчёт открыт';
      sub = 'Параметры расчёта сохранены. Вернитесь в Скаут — сразу покажем результат. Пересчёты по этой капсуле и типу ремонта больше не оплачиваются.';
    } else if (it.kind === 'order') {
      big = 'Оплата на мультисчёте';
      sub = 'Банк разделил платёж: часть поставщика и комиссия SOVEAPP. Поставщик получит свою часть после «Получен» по условиям оферты. Статус заказа обновлён.';
    } else { big = 'Контакт открыт'; sub = 'Телефон и мессенджер поставщика теперь видны в карточке товара.'; }
    document.title = 'Оплата прошла — SOVEAPP';
    show('<span class="pay-status pay-status--ok">Оплата прошла</span>' +
      '<div class="pay-result"><h1 class="pay-title">' + F.esc(big) + '</h1><p class="' + (it.kind === 'pack' ? 'pay-result__big' : 'text') + '">' + F.esc(sub) + '</p></div>' +
      (fresh ? '' : '<div class="notice notice--ok"><span class="small">Этот заказ уже оплачен ' + F.esc(time(pm.paidAt || pm.ts)) + '. Повторно ничего не списали и не зачислили.</span></div>') +
      rows([['Заказ', orderTitle(pm)], ['Сумма', F.rub(it.price)], ['Оплачен', time(pm.paidAt || pm.ts)], ['Номер заказа', pm.id]]) +
      '<div class="pay-actions"><a class="btn btn--primary btn--lg btn--block" href="' + F.esc(back) + '">' + backLabel(back) + '</a>' +
      (/^account\.html/.test(back) ? '' : '<a class="btn btn--link" href="account.html">В кабинет</a>') + '</div>', 'paid');
  }

  function failed(pm) {
    var what = pm.item.kind === 'pack' ? 'Токены не зачислены.' : pm.item.kind === 'metod' ? 'Подписка не включена.' : pm.item.kind === 'scout' ? 'Расчёт не открыт.' : pm.item.kind === 'order' ? 'Заказ остаётся подтверждённым и ждёт оплаты.' : 'Контакт не открыт.';
    document.title = 'Оплата не прошла — SOVEAPP';
    show('<span class="pay-status pay-status--error">Банк отказал</span>' +
      '<h1 class="pay-title">Оплата не прошла. Деньги не списаны</h1>' +
      '<p class="text">Банк отклонил операцию. ' + what + ' Попробуйте ещё раз или оплатите другой картой — заказ соберём с теми же параметрами.</p>' +
      rows([['Заказ', orderTitle(pm)], ['Сумма', F.rub(pm.item.price)]]) +
      '<div class="pay-actions"><a class="btn btn--primary btn--lg btn--block" href="' + F.esc(retryUrl(pm)) + '">Попробовать снова</a><a class="btn btn--link" href="account.html">В кабинет</a></div>', 'failed');
  }

  function closed(pm) {
    document.title = 'Оплата не завершена — SOVEAPP';
    show('<span class="pay-status">Окно оплаты закрыто</span>' +
      '<h1 class="pay-title">Оплата не завершена</h1>' +
      '<p class="text">Деньги не списаны. Заказ сохранён и ждёт оплаты — к нему можно вернуться сейчас или позже из кабинета.</p>' +
      rows([['Заказ', orderTitle(pm)], ['Сумма', F.rub(pm.item.price)]]) +
      '<div class="pay-actions"><button class="btn btn--primary btn--lg btn--block" type="button" data-act="back">Вернуться к оплате</button><a class="btn btn--ghost btn--block" href="account.html">В кабинет</a></div>', 'closed');
    on('[data-act=back]', function () { var cur = S.pay.get(pm.id); if (cur && cur.status === 'paid') success(cur, false); else formScreen(cur || pm); });
  }

  /* ---------- вход на страницу ---------- */
  /* оплатили в соседней вкладке — показываем успех, второй раз не зачисляем */
  S.onChange(function () {
    var cur = id ? S.pay.get(id) : null, st = root.querySelector('.pay-state');
    if (cur && cur.status === 'paid' && st && /^(form|closed)$/.test(st.getAttribute('data-state'))) success(cur, false);
  });

  var pm = id ? S.pay.get(id) : null;
  if (!pm || !pm.item) notFound();
  else if (pm.status === 'paid') success(pm, false);
  else if (!S.auth.isIn()) needLogin();
  else if (pm.status === 'pending') formScreen(pm);
  else failed(pm);
})();
