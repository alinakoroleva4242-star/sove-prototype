/* scopeSheet({img, dna, room, scope, balance, prices, scratch}) — окно 1б «Для чего собираем?» (ТЗ v2, раздел 4; эталон etalon-v2-V1b).
   Превью картинки · «✓ картинка загружена · на ней <комната>» · «ДНК разберём бесплатно»; два варианта-радио:
   «Вся квартира» (по умолчанию) и «Только эта комната»; кнопка «Собрать доску · N токенов» — это и есть списание.
   Не хватает токенов — «Пополнить». Разметка шторки; затемнение и закрытие — у экрана. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.scopeSheet = function (o) {
    var esc = window.SOVE.fmt.esc, cost = o.prices[o.scope], enough = o.balance >= cost;
    var opt = function (key, t, sub) {
      var on = o.scope === key;
      return '<label class="ss-opt' + (on ? ' is-on' : '') + '"><input type="radio" name="mt-scope" value="' + key + '"' + (on ? ' checked' : '') + ' data-scope="' + key + '">' +
        '<i class="ss-radio"></i><span><b>' + t + '</b><small>' + esc(sub) + '</small></span><b class="ss-p">' + UI.fmtTokens(o.prices[key]) + '</b></label>';
    };
    var pic = o.img ? '<span class="ss-pic" style="background-image:url(' + o.img + ')"></span>'
      : '<span class="ss-pic ss-pic--dna">' + UI.dnaBar(o.dna) + '</span>';
    return '<i class="ss-grip"></i>' +
      '<div class="ss-up">' + pic + '<span><small class="ss-ok">' + (o.scratch ? '✓ ответы приняты · соберём ДНК' : '✓ картинка загружена · на ней ' + esc(o.room)) + '</small>' +
        '<small>ДНК разберём бесплатно</small></span></div>' +
      '<b class="ss-t" id="ss-t">Для чего собираем?</b>' +
      opt('flat', 'Вся квартира', 'все 12 материалов отделки · полный бюджет') +
      opt('room', 'Только эта комната', o.room + ' · можно достроить потом') +
      (enough ? '<button type="button" class="mt-btn" data-build>Собрать доску · ' + UI.fmtTokens(cost) + '</button>'
        : '<a class="mt-btn" href="tokens.html?returnTo=' + encodeURIComponent('interior.html') + '">Пополнить</a>') +
      '<small class="ss-note">у тебя ' + window.SOVE.fmt.tokens(o.balance) + ' · ' + (enough ? 'готово за 10 секунд' : 'не хватает ' + window.SOVE.fmt.tokens((cost - o.balance)) + '') + '</small>';
  };
})();
