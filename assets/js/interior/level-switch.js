/* levelSwitch(level, {sums, sum, exact}) — «База ≈ 266 500 ₽ | Премиум ≈ 682 600 ₽» (ТЗ v2, 5.4; эталон etalon-v2-V2).
   Два сегмента. После ручной замены другого уровня (level = 'mixed') оба неактивны, над ними «своё сочетание · ≈ <сумма>».
   Без sums (доска на комнату без площади) — сегменты без сумм. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.levelSwitch = function (level, o) {
    o = o || {};
    var F = window.SOVE.fmt, ap = o.exact ? '' : '≈ ';
    var b = function (key, t) {
      return '<button type="button" data-level="' + key + '" aria-pressed="' + (level === key) + '"><b>' + t + '</b>' + (o.sums ? '<small>' + ap + F.rub(o.sums[key]) + '</small>' : '') + '</button>';
    };
    /* three — три сегмента База · Премиум · Своё (эталон I2): «Своё» включается само после ручной замены другого уровня */
    if (o.three) return '<div class="lv lv--3" role="group" aria-label="Уровень">' + b('base', 'База') + b('premium', 'Премиум') +
      '<button type="button" data-level="mixed" aria-pressed="' + (level === 'mixed') + '"' + (level === 'mixed' ? '' : ' disabled') + '><b>Своё</b>' + (o.sums && level === 'mixed' && o.sum != null ? '<small>' + ap + F.rub(o.sum) + '</small>' : '') + '</button></div>';
    return (level === 'mixed' ? '<small class="lv-own">своё сочетание' + (o.sum != null ? ' · ' + ap + F.rub(o.sum) : '') + '</small>' : '') +
      '<div class="lv" role="group" aria-label="Уровень бюджета">' + b('base', 'База') + b('premium', 'Премиум') + '</div>';
  };
})();
