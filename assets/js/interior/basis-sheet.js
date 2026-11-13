/* basisSheet(o) — всплывашка «Твоя квартира» (ТЗ Интерьера, 5; эталон etalon-A1): метраж для материалов и объём для рендеров.
   o = { pick: {kind:'capsule'|'own', name, img}, plan: {line} | null, basis, file, scope:'flat'|'rooms', zones:[{key,name}], picked:[keys], cost }
   Плашка выбранного · «✓ План из Планировки» (если есть) · ИЛИ ЗАГРУЗИТЬ — одна строка, открывает общее окно «Основа квартиры»
   (assets/js/plan-upload.js, созвон 28.10: загрузка везде одинаковая, итог — план в объекте Мой ремонт) ·
   С ЧЕМ РАБОТАЕМ: «Вся квартира / Комнаты» + чипы · «Собрать интерьер →» (это же списание) · «нет ничего — по площади и комнатам, примерно · 1 ракурс».
   Контракт с pages/interior.js не менялся: результат окна кладём в скрытый <input data-basis="plan|measure|project|photo"> и шлём change —
   interior.js читает basis, имя файла и картинки (рендеры проекта и фото комнат) как при обычном выборе файла. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};
  var BASIS_NAME = { plan: 'План застройщика', measure: 'Обмерный план', project: 'Дизайн-проект', photo: 'Фото квартиры' };
  var INPUTS = [['plan', 'image/*,application/pdf', false], ['measure', 'image/*,application/pdf', false], ['project', 'image/*,application/pdf', true], ['photo', 'image/*', true]];
  UI.basisSheet = function (o) {
    var esc = window.SOVE.fmt.esc;
    var on = o.basis && o.basis !== 'plan' && o.basis !== 'none' && o.file;
    var up = '<button type="button" class="bs-o bs-o--pu' + (on ? ' is-on' : '') + '" data-pu-open><span class="bs-o__ic">' + (on ? '✓' : '⇪') + '</span><span class="bs-o__t">' +
      (on ? '<b>' + esc(BASIS_NAME[o.basis] || 'Файл') + '</b><small>✓ ' + esc(o.file) + ' · заменить</small>' : '<b>План, обмер, дизайн-проект или фото</b><small>окно «Основа квартиры» — одно на весь SOVEAPP, план попадёт в Мой ремонт</small>') +
      '</span><span class="bs-o__a">›</span></button>' +
      INPUTS.map(function (i) { return '<input type="file" accept="' + i[1] + '" hidden data-basis="' + i[0] + '"' + (i[2] ? ' multiple' : '') + '>'; }).join('');
    var pick = o.pick.kind === 'capsule' ? 'Капсула «' + esc(o.pick.name) + '» · 0 генераций' : 'Своя картинка · на ней ' + esc(o.pick.room || 'интерьер');
    return '<i class="ss-grip"></i>' +
      '<div class="bs-h"><span><b class="ss-t">Твоя квартира</b><small>метраж для материалов и объём для рендеров в разных ракурсах</small></span><button type="button" class="sw-x" data-bs-close aria-label="Закрыть">✕</button></div>' +
      '<div class="bs-pick"><span style="background-image:url(' + esc(o.pick.img) + ')"></span><span><small>выбрано</small><b>' + pick + '</b></span></div>' +
      (o.plan ? '<button type="button" class="bs-o bs-o--plan' + (o.basis === 'plan' && !o.file ? ' is-on' : '') + '" data-basis-plan><span class="bs-o__ic">✓</span><span class="bs-o__t"><b>План из Планировки</b><small>' + esc(o.plan.line) + '</small></span><span class="bs-o__a">›</span></button>' : '') +
      '<small class="bs-l">' + (o.plan ? 'ИЛИ ЗАГРУЗИТЬ' : 'ЗАГРУЗИТЬ') + '</small>' + up +
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

  /* результат общего окна → скрытый input шторки (DataTransfer) → change, как при обычном выборе файла.
     План и обмер отдаём заглушкой с тем же именем (не картинкой): interior.js кладёт картинки из input в рендеры комнат —
     это для фото квартиры и рендеров проекта (ТЗ 14.8), а не для чертежа; имя файла и basis шторка получает как раньше. */
  function feed(sheet, basis, files) {
    var inp = sheet.querySelector('input[data-basis="' + basis + '"]'); if (!inp) return false;
    var list = basis === 'plan' || basis === 'measure' ? (files || []).slice(0, 1).map(function (f) { return new File([''], f.name, { type: 'application/octet-stream' }); }) : files;
    try { var dt = new DataTransfer(); (list || []).forEach(function (f) { dt.items.add(f); }); if (!dt.files.length) return false; inp.files = dt.files; }
    catch (e) { return false; }
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pu-open]'); if (!b) return;
    var sheet = b.closest('.bs'), PU = window.SOVE && window.SOVE.planUpload;
    if (!sheet) return;
    if (!PU) { var fb = sheet.querySelector('input[data-basis="plan"]'); if (fb) fb.click(); return; }   /* модуль не подключён — прежний выбор файла */
    PU.open({ entry: 'interior', onDone: function (res) {
      if (!res || !document.body.contains(sheet)) return;
      if (feed(sheet, res.basis, res.files)) return;
      var pb = sheet.querySelector('[data-basis-plan]'); if (pb && res.plan && res.plan.rooms && res.plan.rooms.length) pb.click();   /* пример PRIDE без файла — план из Планировки, если шторка его знает */
    } });
  });
})();
