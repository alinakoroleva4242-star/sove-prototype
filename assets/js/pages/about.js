/* Об экосистеме: все числа на странице — из SOVE.data, в разметке их нет. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;
  function plural(n, one, few, many) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }
  function set(key, html) { document.querySelectorAll('[data-f="' + key + '"]').forEach(function (el) { el.innerHTML = html; }); }

  var ready = D.capsules.filter(function (c) { return !c.soon; });
  var soon = D.capsules.length - ready.length;
  var minM2 = Math.min.apply(null, ready.map(function (c) { return c.pricePerM2; }));
  set('caps-ready', ready.length + ' ' + plural(ready.length, 'капсула', 'капсулы', 'капсул') + (soon ? ' (ещё ' + soon + ' ' + plural(soon, 'готовится', 'готовятся', 'готовятся') + ')' : ''));
  set('caps-from', 'от ' + F.rub(minM2) + '/м²');

  var st = D.scout.stages.length;
  set('stages', st + ' ' + plural(st, 'этапу', 'этапам', 'этапам'));

  var packs = D.adept.packages, minRate = Math.min.apply(null, packs.map(function (p) { return p.rate; }));
  set('adept-count', packs.length + ' ' + plural(packs.length, 'пакет', 'пакета', 'пакетов'));
  set('adept-from', 'от ' + F.rub(minRate) + '/м²');

  set('cost-photo', F.tokens(D.costs.photo));
  set('cost-render', F.tokens(D.costs.render));
  set('demo', D.demoLimit + ' ' + plural(D.demoLimit, 'пробный запуск', 'пробных запуска', 'пробных запусков'));
  set('gift', F.tokens(D.gift.tokens) + ' на ' + D.gift.days + ' ' + plural(D.gift.days, 'день', 'дня', 'дней'));

  var discs = D.products.map(function (p) { return p.discount; });
  set('discounts', Math.min.apply(null, discs) + '–' + Math.max.apply(null, discs) + ' %');
  set('categories', D.categories.map(F.esc).join(', '));

  set('plans', D.metodPlans.map(function (p) {
    return '<div><span>' + p.months + ' ' + plural(p.months, 'месяц', 'месяца', 'месяцев') + '</span><span class="mid-num">' + F.rub(p.price) + '</span></div>';
  }).join(''));
  /* у кого подписка уже есть — говорим об этом, а не продаём заново */
  function metodState() {
    var note = document.getElementById('metod-active'), cta = document.getElementById('metod-cta');
    if (!note || !cta) return;
    var on = S.metod.active(), days = S.metod.daysLeft();
    note.hidden = !on;
    note.textContent = on ? 'Ваша подписка активна до ' + F.dateLong(S.metod.until()) + ' — ещё ' + days + ' ' + plural(days, 'день', 'дня', 'дней') + '.' : '';
    cta.textContent = on ? 'Продлить подписку' : 'Выбрать тариф';
  }
  metodState();
  S.onChange(metodState);
})();
