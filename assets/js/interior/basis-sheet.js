/* basisSheet(o) — всплывашка «Твоя квартира» (ТЗ Интерьера, 5; эталон etalon-A1): метраж для материалов и объём для рендеров.
   o = { pick: {kind:'capsule'|'own', name, img}, plan: {line} | null, basis, file, scope:'flat'|'rooms', zones:[{key,name}], picked:[keys], cost }
   Плашка выбранного · «✓ План из Планировки» (если есть) · ИЛИ ЗАГРУЗИТЬ: план / обмер / дизайн-проект / фото квартиры ·
   С ЧЕМ РАБОТАЕМ: «Вся квартира / Комнаты» + чипы · «Собрать интерьер →» (это же списание) · «нет ничего — по площади и комнатам, примерно · 1 ракурс». */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  var UPLOADS = [
    ['plan', '⇪', 'План квартиры', 'от застройщика, скрин из ДомКлик или фото бумажного', 'image/*,application/pdf'],
    ['measure', '📐', 'Обмерный план', 'с размерами — посчитаем точно', 'image/*,application/pdf'],
    ['project', 'PDF', 'Дизайн-проект', 'чертежи и рендеры · материалы возьмём с рендеров', 'image/*,application/pdf'],
    ['photo', '📷', 'Фото квартиры', 'если документов нет: пустые комнаты — поймём объём, окна и ракурсы', 'image/*']
  ];
  UI.basisSheet = function (o) {
    var esc = window.SOVE.fmt.esc;
    var row = function (u) {
      var on = o.basis === u[0] && o.file;
      return '<label class="bs-o' + (on ? ' is-on' : '') + '"><input type="file" accept="' + u[4] + '" hidden data-basis="' + u[0] + '"' + (u[0] === 'project' || u[0] === 'photo' ? ' multiple' : '') + '>' +
        '<span class="bs-o__ic">' + (on ? '✓' : u[1]) + '</span><span class="bs-o__t"><b>' + u[2] + '</b><small>' + (on ? '✓ ' + esc(o.file) : u[3]) + '</small></span><span class="bs-o__a">›</span></label>';
    };
    var pick = o.pick.kind === 'capsule' ? 'Капсула «' + esc(o.pick.name) + '» · 0 токенов' : 'Своя картинка · на ней ' + esc(o.pick.room || 'интерьер');
    return '<i class="ss-grip"></i>' +
      '<div class="bs-h"><span><b class="ss-t">Твоя квартира</b><small>метраж для материалов и объём для рендеров в разных ракурсах</small></span><button type="button" class="sw-x" data-bs-close aria-label="Закрыть">✕</button></div>' +
      '<div class="bs-pick"><span style="background-image:url(' + esc(o.pick.img) + ')"></span><span><small>выбрано</small><b>' + pick + '</b></span></div>' +
      (o.plan ? '<button type="button" class="bs-o bs-o--plan' + (o.basis === 'plan' && !o.file ? ' is-on' : '') + '" data-basis-plan><span class="bs-o__ic">✓</span><span class="bs-o__t"><b>План из Планировки</b><small>' + esc(o.plan.line) + '</small></span><span class="bs-o__a">›</span></button>' : '') +
      '<small class="bs-l">' + (o.plan ? 'ИЛИ ЗАГРУЗИТЬ' : 'ЗАГРУЗИТЬ') + '</small>' + UPLOADS.map(row).join('') +
      '<small class="bs-l">С ЧЕМ РАБОТАЕМ</small>' +
      '<div class="bs-seg" role="group"><button type="button" data-scope="flat" aria-pressed="' + (o.scope === 'flat') + '"><b>Вся квартира</b><small>все комнаты</small></button>' +
        '<button type="button" data-scope="rooms" aria-pressed="' + (o.scope === 'rooms') + '"><b>Комнаты</b><small>выбрать ниже</small></button></div>' +
      '<div class="bs-chips">' + o.zones.map(function (z) {
        var on = o.scope === 'flat' || o.picked.indexOf(z.key) >= 0;
        return '<button type="button" class="bs-chip' + (on ? ' is-on' : '') + '" data-room="' + z.key + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + esc(z.name) + '</button>';
      }).join('') + '</div>' +
      (o.enough ? '<button type="button" class="mt-btn" data-build' + (o.scope === 'rooms' && !o.picked.length ? ' disabled' : '') + '>Собрать интерьер →' + (o.cost ? ' · ' + UI.fmtTokens(o.cost) + '' : '') + '</button>'
        : '<a class="mt-btn" href="tokens.html?returnTo=' + encodeURIComponent('interior.html') + '">Пополнить · не хватает ' + window.SOVE.fmt.tokens(o.lack) + '</a>') +
      '<button type="button" class="bs-none" data-basis-none>нет ничего — по площади и комнатам, примерно · 1 ракурс</button>';
  };
})();
