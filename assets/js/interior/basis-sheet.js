/* basisSheet(o) — всплывашка «Твоя квартира» (ТЗ Интерьера, 5; эталон etalon-A1): метраж для материалов и объём для рендеров.
   o = { pick: {kind:'capsule'|'own', name, img, room}, plan: {line} | null, basis, file, scope:'flat'|'rooms', zones:[{key,name}], picked:[keys],
         level: 'base'|'premium', costText, note, scanHref }
   Вид вопросов — общий (assets/css/q-style.css, договор частей 02.11): строки .qs-opt, сегменты .qs-seg, комнаты пилюлями .qs-chips с переносом.
   Выбранное · «План квартиры» (если в объекте план с комнатами) · «Загрузить план» — одно окно загрузки (assets/js/plan-upload.js; его открывает
   pages/interior.js по data-pu-open) · план без комнат — «найти комнаты» сканом Планировки (data-bs-scan) ·
   С ЧЕМ РАБОТАЕМ: «Вся квартира / Комнаты» + комнаты · ТИП РЕМОНТА: База / Премиум · «Собрать интерьер · цена» (это же списание).
   Скрытые input[data-basis] — запасной выбор файла, если окна загрузки на странице нет (interior.js читает их событием change).
   «Фото квартиры» в Интерьере не предлагаем (остаётся в Моём ремонте). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  var BASIS_NAME = { plan: 'План застройщика', measure: 'Обмерный план', project: 'Дизайн-проект', photo: 'Фото квартиры' };
  var INPUTS = [['plan', 'image/*,application/pdf', false], ['measure', 'image/*,application/pdf', false], ['project', 'image/*,application/pdf', true]];
  function svg(d) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var IC_PLAN = svg('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M11 16v4M15 12h5"/>');
  var IC_UP = svg('<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 20h16"/>');
  function seg(attr, items, cur, label) {
    return '<div class="qs-seg" role="group" aria-label="' + label + '">' + items.map(function (x) {
      var on = cur === x[0];
      return '<button type="button"' + (on ? ' class="is-on"' : '') + ' ' + attr + '="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + (x[2] ? '<small>' + x[2] + '</small>' : '') + '</button>';
    }).join('') + '</div>';
  }
  UI.basisSheet = function (o) {
    var esc = window.SOVE.fmt.esc;
    var planOn = !!(o.plan && o.basis === 'plan' && !o.file), on = !!(o.basis && o.basis !== 'none' && o.file);
    var pick = o.pick.kind === 'capsule' ? 'Капсула «' + esc(o.pick.name) + '»' : 'Своя картинка · на ней ' + esc(o.pick.room || 'интерьер');
    var planRow = o.plan ? '<button type="button" class="qs-opt' + (planOn ? ' is-on' : '') + '" data-basis-plan aria-pressed="' + planOn + '"><span class="qs-opt__ic">' + IC_PLAN + '</span>' +
      '<span class="qs-opt__t"><b>План квартиры</b><small>' + esc(o.plan.line) + '</small></span><span class="qs-opt__ok" aria-hidden="true"></span></button>' : '';
    var upRow = '<button type="button" class="qs-opt' + (on ? ' is-on' : '') + '" data-pu-open aria-pressed="' + on + '" aria-haspopup="dialog"><span class="qs-opt__ic">' + (on ? IC_PLAN : IC_UP) + '</span><span class="qs-opt__t">' +
      (on ? '<b>' + esc(BASIS_NAME[o.basis] || 'План') + '</b><small>' + esc(o.file) + ' · заменить</small>'
        : '<b>' + (o.plan ? 'Загрузить другой план' : 'Загрузить план') + '</b><small>план застройщика, обмерный или дизайн-проект — комнаты и метраж точно</small>') + '</span>' +
      (on ? '<span class="qs-opt__ok" aria-hidden="true"></span>' : '<span class="qs-opt__go" aria-hidden="true">›</span>') + '</button>' +
      INPUTS.map(function (i) { return '<input type="file" accept="' + i[1] + '" hidden data-basis="' + i[0] + '"' + (i[2] ? ' multiple' : '') + '>'; }).join('');
    var scan = o.scanHref ? '<a class="bs-scan" href="' + esc(o.scanHref) + '" data-bs-scan>План без комнат — найти комнаты на плане ›</a>' : '';
    var none = o.basis && o.basis !== 'none' ? '<button type="button" class="bs-none" data-basis-none>собрать без плана — по площади и типовым комнатам, примерно</button>' : '';
    return '<i class="ss-grip"></i>' +
      '<div class="bs-h"><span><b class="ss-t">Твоя квартира</b><small>метраж для материалов и объём для визуализаций в разных ракурсах</small></span><button type="button" class="sw-x" data-bs-close aria-label="Закрыть">✕</button></div>' +
      '<div class="bs-pick"><span style="background-image:url(' + esc(o.pick.img) + ')"></span><span><small>выбрано</small><b>' + pick + '</b></span></div>' +
      '<small class="bs-l">ОСНОВА</small><div class="qs-list">' + planRow + upRow + '</div>' + scan +
      '<small class="bs-l">С ЧЕМ РАБОТАЕМ</small>' +
      seg('data-scope', [['flat', 'Вся квартира', 'все комнаты'], ['rooms', 'Комнаты', 'выбрать ниже']], o.scope, 'С чем работаем') +
      '<div class="qs-chips" role="group" aria-label="Комнаты">' + o.zones.map(function (z) {
        var sel = o.scope === 'flat' || o.picked.indexOf(z.key) >= 0;
        return '<button type="button" class="qs-chip' + (sel ? ' is-on' : '') + '" data-room="' + z.key + '" aria-pressed="' + sel + '">' + (sel ? '✓ ' : '') + esc(z.name) + '</button>';
      }).join('') + '</div>' +
      '<small class="bs-l">ТИП РЕМОНТА</small>' + seg('data-level', [['base', 'База'], ['premium', 'Премиум']], o.level === 'premium' ? 'premium' : 'base', 'Тип ремонта') +
      '<button type="button" class="mt-btn" data-build' + (o.scope === 'rooms' && !o.picked.length ? ' disabled' : '') + '>Собрать интерьер' + (o.costText ? ' · ' + esc(o.costText) : '') + '</button>' +
      (o.note ? '<small class="bs-note">' + esc(o.note) + '</small>' : '') + none;
  };
})();
