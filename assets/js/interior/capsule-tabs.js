/* capsuleTabs(tab) — «Доска · ДНК + 12 материалов» ↔ «Комнаты · рендеры · токенов» (ТЗ Интерьера, 4; эталон etalon-I2). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  UI.capsuleTabs = function (tab) {
    var b = function (key, t, sub) { return '<button type="button" role="tab" data-tab="' + key + '" aria-selected="' + (tab === key) + '"><b>' + t + '</b><small>' + sub + '</small></button>'; };
    return '<div class="ct" role="tablist" aria-label="Моя капсула">' + b('board', 'Доска', 'ДНК + 12 материалов') + b('rooms', 'Комнаты', 'рендеры · токенов') + '</div>';
  };
})();
