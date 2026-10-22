/* Трек: капсула → что сделаем → площадь → оценка «от» → этапы → заявка. Онлайн-оплаты нет */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  function $(id) { return document.getElementById(id); }
  var NB = ' ';
  var DRAFT = 'track', AREA_MIN = 20, AREA_MAX = 200;

  var capsules = D.capsules.filter(function (c) { return !c.soon && c.pricePerM2; });
  var finish = D.scout.states.filter(function (s) { return s.id === 'finish'; })[0];
  var stages = D.scout.stages;
  var project = S.ui.qs('project') ? S.projects.get(S.ui.qs('project')) : null;
  var scout = project && project.scout ? project.scout : null;

  function clampArea(v) { v = Math.round(Number(v)); return isFinite(v) && v > 0 ? Math.min(AREA_MAX, Math.max(AREA_MIN, v)) : null; }
  function validCapsule(id) { return capsules.some(function (c) { return c.id === id; }) ? id : null; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }

  /* ---------- состояние: адрес → проект → черновик → по умолчанию ---------- */
  var draft = S.draft.get(DRAFT) || {};
  if ((draft.projectId || null) !== (project ? project.id : null)) draft = { name: draft.name, phone: draft.phone, comment: draft.comment };
  var st = {
    capsuleId: validCapsule(S.ui.qs('capsule')) || validCapsule(project && project.capsuleId) || validCapsule(draft.capsuleId) || validCapsule('k4') || capsules[0].id,
    area: clampArea(draft.area) || clampArea(scout ? scout.area : project && project.area) || 45
  };
  var sending = false, done = false;

  function capsule() { return D.capsule(st.capsuleId); }
  function kit() { return capsule().pricePerM2 * st.area; }
  function works() { return finish.rate * st.area; }
  function total() { return kit() + works(); }
  function scoutHref() { return 'scout.html?capsule=' + st.capsuleId + (project ? '&project=' + encodeURIComponent(project.id) : ''); }
  function rowsHtml(rows) { return rows.map(function (r) { return '<div' + (r[2] ? ' class="' + r[2] + '"' : '') + '><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>'; }).join(''); }
  function nb(s) { return String(s).replace(/ /g, NB); }

  /* ---------- первый экран, тексты из данных ---------- */
  var k4 = D.capsule('k4'); if (k4) $('tr-cap').textContent = k4.name;
  $('tr-what-stages').textContent = stages.length + NB + plural(stages.length, 'этап', 'этапа', 'этапов') + ': от' + NB + '«' + stages[0][0].toLowerCase() + '» до' + NB + '«' + stages[stages.length - 1][0].toLowerCase() + '», в' + NB + 'порядке сметы.';
  $('tr-stages-title').textContent = stages.length + NB + plural(stages.length, 'этап', 'этапа', 'этапов') + ' — и' + NB + 'доля каждого в' + NB + 'работах';

  function paintTop() {
    var mine = S.leads.list().filter(function (l) { return l.product === 'track' && (!project || l.projectId === project.id); })[0];
    var top = $('tr-top');
    if (!mine || done) { top.hidden = true; top.innerHTML = ''; return; }
    top.innerHTML = '<div class="notice"><span class="small">Вы уже оставляли заявку на Трек ' + F.dateLong(mine.ts) + (project ? ' по' + NB + 'проекту «' + esc(project.name) + '»' : '') + '. Статус: ' + esc((mine.status || 'Заявка принята').toLowerCase()) + '. Можно отправить новую, если условия изменились.</span><a class="btn btn--ghost btn--sm" href="account.html#leads">Посмотреть в кабинете</a></div>';
    top.hidden = false;
  }

  /* ---------- капсула ---------- */
  function paintCapsule() {
    var c = capsule();
    $('tr-chips').innerHTML = capsules.map(function (x) {
      var on = x.id === st.capsuleId;
      return '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-capsule="' + x.id + '" aria-pressed="' + on + '" title="' + esc(x.name) + '">' + esc(x.code) + '</button>';
    }).join('');
    $('tr-capsule-info').innerHTML = '<h3 class="h3">' + esc(c.name) + '</h3><p class="text">' + esc(c.concept) + '</p>' +
      '<div class="tr-materials">' + (c.materials || []).map(function (m) { return '<span class="badge badge--line">' + esc(m) + '</span>'; }).join('') + '</div>' +
      '<p class="small muted">Комплектация от' + NB + '<span class="num">' + F.rub(c.pricePerM2) + '/м²</span> по' + NB + 'ценам METOD</p>' +
      '<a class="arrow-link" href="capsule.html?id=' + c.id + '">Смотреть капсулу</a>';
    var img = $('tr-capsule-img'); img.src = c.cover; img.alt = 'Интерьер капсулы ' + c.code + ': ' + c.name;
  }

  /* ---------- площадь, оценка, этапы ---------- */
  var range = $('tr-area');
  range.min = AREA_MIN; range.max = AREA_MAX;
  function paintEstimate() {
    var c = capsule();
    range.value = st.area;
    range.style.setProperty('--fill', ((st.area - AREA_MIN) / (AREA_MAX - AREA_MIN) * 100) + '%');
    range.setAttribute('aria-valuetext', F.area(st.area));
    $('tr-area-out').textContent = F.area(st.area);
    $('tr-price').textContent = 'от' + NB + F.rub(total());
    $('tr-bar-price').textContent = 'от' + NB + F.rub(total());
    $('tr-scout-link').href = scoutHref(); $('tr-done-scout').href = scoutHref();
    $('tr-est-rows').innerHTML = rowsHtml([
      ['Комплектация ' + c.name + ' · ' + nb(F.rub(c.pricePerM2)) + '/м²', nb(F.rub(kit()))],
      ['Работы, ' + finish.name.toLowerCase() + ' · ' + nb(F.rub(finish.rate)) + '/м²', nb(F.rub(works()))],
      ['Итого за ' + nb(F.area(st.area)), 'от' + NB + nb(F.rub(total())), 'is-total']]);
    $('tr-stages').innerHTML = stages.map(function (s, i) {
      return '<li><span class="tr-stage__n num">' + (i + 1) + '</span><span class="tr-stage__name">' + esc(s[0]) + '</span><span class="bar" aria-hidden="true"><i style="width:' + s[1] + '%"></i></span><span class="tr-stage__pct num">' + s[1] + NB + '%</span><span class="tr-stage__sum num">от' + NB + F.rub(works() * s[1] / 100) + '</span></li>';
    }).join('');
    $('tr-lead-rows').innerHTML = rowsHtml([['Капсула', c.name], ['Площадь', nb(F.area(st.area))], ['Оценка', 'от' + NB + nb(F.rub(total()))]]
      .concat(project ? [['Проект', project.name]] : []).concat(scout ? [['Расчёт Скаута', nb(F.rub(scout.total))]] : []));
    if (scout) {
      var sc = D.capsule(scout.capsuleId), same = scout.capsuleId === st.capsuleId && clampArea(scout.area) === st.area;
      $('tr-scout').innerHTML = '<div class="notice tr-notice"><span class="stack stack--2"><span class="small">Расчёт из Скаута: <b class="num">' + F.rub(scout.total) + '</b> · <span class="num">' + F.area(scout.area) + '</span>' + (sc ? ' · ' + esc(sc.code) : '') + '</span>' +
        '<span class="tiny muted">' + (same ? 'Проект «' + esc(project.name) + '». Передадим расчёт менеджеру вместе с заявкой.' : 'Расчёт сделан для других условий. Оценка ниже' + NB + '— для выбранной капсулы и' + NB + 'площади.') + '</span></span>' +
        '<a class="arrow-link" href="' + scoutHref() + '">' + (same ? 'Открыть расчёт' : 'Пересчитать в Скауте') + '</a></div>';
    } else $('tr-scout').innerHTML = '';
  }

  function saveDraft() {
    S.draft.set(DRAFT, { projectId: project ? project.id : null, capsuleId: st.capsuleId, area: st.area, name: $('tr-name').value, phone: $('tr-phone').value, comment: $('tr-comment').value });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-capsule]'); if (!b || sending) return;
    st.capsuleId = b.getAttribute('data-capsule'); paintCapsule(); paintEstimate(); saveDraft();
    var again = document.querySelector('[data-capsule="' + st.capsuleId + '"]'); if (again) again.focus();
  });
  range.addEventListener('input', function () { st.area = clampArea(range.value) || st.area; paintEstimate(); });
  range.addEventListener('change', saveDraft);

  /* ---------- форма ---------- */
  function phoneDigits(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (d.charAt(0) === '7' || d.charAt(0) === '8') d = d.slice(1);
    if (d.length > 10 && (d.charAt(0) === '7' || d.charAt(0) === '8')) d = d.slice(1);
    return d.slice(0, 10);
  }
  function phoneFormat(d) {
    if (!d) return '';
    var out = '+7 (' + d.slice(0, 3);
    if (d.length > 3) out += ') ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }
  var phone = $('tr-phone'), nameEl = $('tr-name');
  phone.addEventListener('input', function () { phone.value = phoneFormat(phoneDigits(phone.value)); });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (!phoneDigits(phone.value)) phone.value = ''; });

  if (draft.name) nameEl.value = draft.name;
  if (draft.comment) $('tr-comment').value = draft.comment;
  var user = S.auth.user();
  phone.value = phoneFormat(phoneDigits(draft.phone || (user && user.phone) || ''));

  var CHECKS = {
    name: function () { return nameEl.value.trim().length >= 2 ? '' : 'Напишите, как к' + NB + 'вам обращаться'; },
    phone: function () { var n = phoneDigits(phone.value).length; return n === 10 ? '' : n ? 'В номере не хватает цифр: нужно 10 после +7' : 'Укажите телефон' + NB + '— по нему позвонит менеджер'; },
    agree: function () { return $('tr-agree').checked ? '' : 'Отметьте согласие' + NB + '— без него не можем принять заявку'; }
  };
  function setError(name, text) {
    var box = document.querySelector('#lead [data-field="' + name + '"]'), err = $('tr-' + name + '-err'), c = $('tr-' + name);
    box.classList.toggle('is-error', !!text); err.textContent = text || ''; err.hidden = !text;
    if (text) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  }
  ['name', 'phone'].forEach(function (n) {
    var el = $('tr-' + n);
    el.addEventListener('input', function () { setError(n, ''); saveDraft(); });
    el.addEventListener('blur', function () { if (el.value.trim() && CHECKS[n]()) setError(n, CHECKS[n]()); });
  });
  $('tr-comment').addEventListener('input', saveDraft);
  $('tr-agree').addEventListener('change', function () { setError('agree', ''); });

  function showDone(lead) {
    var c = D.capsule(lead.capsuleId);
    done = true;
    $('tr-done-text').innerHTML = 'Позвоним по' + NB + 'номеру <span class="num">' + phoneFormat(phoneDigits(lead.phone)) + '</span> и' + NB + 'договоримся о' + NB + 'замере. Дальше' + NB + '— договор и' + NB + 'финальная смета; первый платёж' + NB + '— только после них. Статус заявки виден в' + NB + 'кабинете, в' + NB + 'разделе «Заявки».';
    $('tr-done-rows').innerHTML = rowsHtml([['Капсула', c.name], ['Площадь', nb(F.area(lead.area))], ['Оценка', 'от' + NB + nb(F.rub(lead.price))]]
      .concat(project ? [['Проект', project.name]] : []).concat(scout ? [['Расчёт Скаута', nb(F.rub(scout.total))]] : []).concat([['Имя', lead.name]]));
    $('tr-body').hidden = true; $('tr-top').hidden = true; $('tr-bar').hidden = true;
    (document.querySelector('.app-hero__cta') || {}).hidden = true; /* якорь на форму больше некуда вести */
    $('tr-done').hidden = false;
    $('tr-done').scrollIntoView({ block: 'start' });
    $('tr-done-title').focus({ preventScroll: true });
  }

  $('lead').addEventListener('submit', function (e) {
    e.preventDefault(); if (sending) return;
    var first = null;
    ['name', 'phone', 'agree'].forEach(function (n) { var t = CHECKS[n](); setError(n, t); if (t && !first) first = n; });
    if (first) { $('tr-' + first).focus(); return; }
    sending = true;
    var btn = $('tr-submit'); btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      var lead = null;
      try {
        lead = S.leads.add({ product: 'track', capsuleId: st.capsuleId, area: st.area, price: total(), priceFrom: true, stateId: finish.id,
          name: nameEl.value.trim(), phone: '+7' + phoneDigits(phone.value), comment: $('tr-comment').value.trim(), projectId: project ? project.id : null,
          scoutTotal: scout ? scout.total : null });
      } catch (err) { lead = null; }
      sending = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      if (!lead) { S.ui.toast('Заявка не отправилась: браузер не дал сохранить данные. Форма на месте — попробуйте ещё раз', 'error'); return; }
      S.draft.clear(DRAFT);
      showDone(lead);
    }, 700);
  });

  /* ---------- закреплённая кнопка на телефоне: прячется, когда форма уже на экране ---------- */
  var bar = $('tr-bar'); bar.hidden = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { if (!done) bar.hidden = en[0].isIntersecting; }, { rootMargin: '0px 0px -120px 0px' }).observe($('lead'));
  }

  /* ---------- старт ---------- */
  paintTop(); paintCapsule(); paintEstimate();
})();

/* трекер и дневник стройки — перенос с сайта (track.tsx, constants/track-data.ts).
   Цифры демо-проекта: капсула К4, 45 м², как в данных сайта. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc;
  var box = document.getElementById('tr-tracker'), diary = document.getElementById('tr-diary');
  if (!box && !diary) return;
  var BUDGET = { total: 4870552, adept: 267000, works: 2250000, complect: 2353552 };
  var DIARY = [
    { fresh: true, week: 'Недели 5–6 · 2 дек', t: 'Черновые работы, 63 %', d: 'Выровняли стены и стяжку пола во всех комнатах. Развели черновую электрику по проекту. Начали штробить под сантехнику в санузле.', photos: '3 фото прогресса' },
    { week: 'Недели 3–4 · 18 ноя', t: 'Демонтаж завершён', d: 'Снесли ненужные перегородки по плану, вывезли мусор. Подготовили стены под черновые работы.', photos: '2 фото' },
    { week: 'Недели 1–2 · 4 ноя', t: 'Старт: замеры, подготовка', d: 'Завезли инструмент и материалы. Согласовали график работ. Оформили пропуска в ЖК.', photos: '1 фото' },
    { week: 'Фаза проекта · 20 окт', t: 'Проект готов, стройка стартует', d: 'Переход из Адепта в стройку — первый отчёт команды.', photos: '' }
  ];

  if (box) box.innerHTML =
    '<div class="tm-nums">' +
      '<div class="tm-num"><b>24 / 90</b><span>рабочих дней пройдено · до 15 декабря</span></div>' +
      '<div class="tm-num"><b>63 %</b><span>прогресс проекта</span></div>' +
      '<div class="tm-num"><b>3 / 12</b><span>месяцев оплаты внесено</span></div>' +
    '</div>' +
    '<section class="pb"><span class="pb__k">Плановый бюджет по договору</span><b class="pb__t">' + F.rub(BUDGET.total) + '</b>' +
      '<div class="pb-list">' +
        '<div class="pb-item"><b>Дизайн-проект (Адепт)</b><span>' + F.rub(BUDGET.adept) + '</span></div>' +
        '<div class="pb-item"><b>Строительные работы</b><span>' + F.rub(BUDGET.works) + '</span></div>' +
        '<div class="pb-item"><b>Комплектация</b><span>' + F.rub(BUDGET.complect) + '</span></div>' +
      '</div>' +
      '<p class="small muted">Пример по капсуле К4 на 45 м² — те же цифры, что в демо-проекте на сайте.</p>' +
    '</section>';

  if (diary) diary.innerHTML = '<div class="stack stack--4">' + DIARY.map(function (e) {
    return '<article class="di' + (e.fresh ? ' di--fresh' : '') + '">' +
      (e.fresh ? '<span class="di__flag">свежий</span>' : '') +
      '<span class="di__week">' + esc(e.week) + '</span>' +
      '<b class="di__t">' + esc(e.t) + '</b>' +
      '<p class="di__d">' + esc(e.d) + '</p>' +
      (e.photos ? '<span class="di__photos">' + esc(e.photos) + '</span>' : '') +
      '</article>';
  }).join('') + '</div>';
})();
