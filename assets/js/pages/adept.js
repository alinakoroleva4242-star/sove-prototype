/* Дизайн-проект: капсула, пакет, площадь → цена; заявка без онлайн-оплаты */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  function $(id) { return document.getElementById(id); }
  var NB = ' ';
  var DRAFT = 'adept', AREA_MIN = 20, AREA_MAX = 150, PARTS = 6;

  var capsules = D.capsules.filter(function (c) { return !c.soon; });
  var packages = D.adept.packages;
  var project = S.ui.qs('project') ? S.projects.get(S.ui.qs('project')) : null;
  var scout = project && project.scout ? project.scout : null;

  function clampArea(v) { v = Math.round(Number(v)); return isFinite(v) && v > 0 ? Math.min(AREA_MAX, Math.max(AREA_MIN, v)) : null; }
  function validCapsule(id) { return capsules.some(function (c) { return c.id === id; }) ? id : null; }

  /* ---------- состояние: адрес → проект → черновик → по умолчанию ---------- */
  var draft = S.draft.get(DRAFT) || {};
  if ((draft.projectId || null) !== (project ? project.id : null)) draft = { name: draft.name, phone: draft.phone, comment: draft.comment };
  var st = {
    capsuleId: validCapsule(S.ui.qs('capsule')) || validCapsule(project && project.capsuleId) || validCapsule(draft.capsuleId) || 'k4',
    packageId: packages.some(function (p) { return p.id === draft.packageId; }) ? draft.packageId : packages[0].id,
    area: clampArea(draft.area) || clampArea(scout ? scout.area : project && project.area) || 45,
    mode: draft.mode === 'parts' ? 'parts' : 'once'
  };
  if (!packages.some(function (p) { return p.id === st.packageId; })) st.packageId = packages[0].id;
  var sending = false;

  function capsule() { return D.capsule(st.capsuleId); }
  function pack() { return packages.filter(function (p) { return p.id === st.packageId; })[0]; }
  function price() { return Math.round(pack().rate * st.area / 500) * 500; }
  function perMonth() { return Math.round(price() / PARTS); }

  /* ---------- первый экран ---------- */
  var k4 = D.capsule('k4'); if (k4) $('ad-cap').textContent = k4.name;
  var rates = packages.map(function (p) { return p.rate; });
  $('ad-facts').innerHTML = [
    ['от' + NB + F.rub(Math.min.apply(null, rates)) + '/м²', 'цена зависит от пакета'],
    [packages.map(function (p) { return p.term; })[0], 'срок пакета «' + packages[0].name + '»'],
    [packages.length + ' пакета', 'от планировки до полной спецификации']
  ].map(function (f) { return '<div class="rule-top stack stack--2"><span class="mid-num">' + f[0] + '</span><span class="tiny muted">' + f[1] + '</span></div>'; }).join('');

  /* уже есть заявка на Дизайн-проект */
  function paintTop() {
    var mine = S.leads.list().filter(function (l) { return l.product === 'adept' && (!project || l.projectId === project.id); })[0];
    var top = $('ad-top');
    if (!mine) { top.hidden = true; top.innerHTML = ''; return; }
    top.innerHTML = '<div class="notice"><span class="small">Вы уже оставляли заявку на дизайн-проект ' + F.dateLong(mine.ts) + (project ? ' по' + NB + 'проекту «' + esc(project.name) + '»' : '') + '. Статус: ' + esc((mine.status || 'Заявка принята').toLowerCase()) + '. Можно отправить новую, если условия изменились.</span><a class="btn btn--ghost btn--sm" href="account.html#leads">Посмотреть в кабинете</a></div>';
    top.hidden = false;
  }

  /* ---------- капсула ---------- */
  function paintCapsule() {
    var c = capsule();
    $('ad-chips').innerHTML = capsules.map(function (x) {
      var on = x.id === st.capsuleId;
      return '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-capsule="' + x.id + '" aria-pressed="' + on + '" title="' + esc(x.name) + '">' + esc(x.code) + '</button>';
    }).join('');
    $('ad-capsule-info').innerHTML = '<b>' + esc(c.name) + '.</b> <span class="muted">' + esc(c.concept) + '</span> <a class="link" href="capsule.html?id=' + c.id + '">Смотреть капсулу</a>';
    var scoutHref = 'scout.html?capsule=' + c.id + (project ? '&project=' + encodeURIComponent(project.id) : '');
    if (scout) {
      var sc = D.capsule(scout.capsuleId), other = scout.capsuleId && scout.capsuleId !== c.id;
      $('ad-scout').innerHTML = '<div class="notice ad-notice"><span class="stack stack--2"><span class="small">Бюджет из расчёта: <b class="num">' + F.rub(scout.total) + '</b> · <span class="num">' + F.area(scout.area) + '</span>' + (sc ? ' · ' + esc(sc.code) : '') + '</span>' +
        '<span class="tiny muted">' + (other ? 'Расчёт сделан для ' + esc(sc ? sc.code : 'другой капсулы') + '. Для ' + esc(c.code) + ' бюджет будет другим — пересчитайте бюджет.' : 'Проект «' + esc(project.name) + '». Расчёт передадим дизайнеру вместе с заявкой.') + '</span></span>' +
        '<a class="arrow-link" href="' + scoutHref + '">' + (other ? 'Пересчитать бюджет' : 'Открыть расчёт') + '</a></div>';
    } else {
      $('ad-scout').innerHTML = '<p class="ad-scout-hint"><span>Сначала посчитайте бюджет' + NB + '— дизайнер получит его вместе с заявкой.</span><a class="arrow-link" href="' + scoutHref + '">Посчитать бюджет</a></p>';
    }
  }

  /* ---------- пакеты ---------- */
  function paintPackages() {
    $('ad-packages').innerHTML = packages.map(function (p) {
      var on = p.id === st.packageId;
      return '<button type="button" class="option' + (on ? ' is-active' : '') + '" data-package="' + p.id + '" aria-pressed="' + on + '">' +
        '<span class="ad-pk__state">' + (on ? 'Выбран' : '') + '</span>' +
        '<span class="option__title">' + esc(p.name) + '</span>' +
        '<span class="ad-pk__rate num">' + F.rub(p.rate) + '/м²</span>' +
        '<span class="option__note">Срок: ' + esc(p.term) + '</span>' +
        '<span class="ad-pk__list">' + p.includes.map(function (i) { return '<span>' + esc(i) + '</span>'; }).join('') + '</span></button>';
    }).join('');
  }

  /* ---------- площадь и итог ---------- */
  var range = $('ad-area');
  range.min = AREA_MIN; range.max = AREA_MAX;
  function paintArea() {
    range.value = st.area;
    range.style.setProperty('--fill', ((st.area - AREA_MIN) / (AREA_MAX - AREA_MIN) * 100) + '%');
    range.setAttribute('aria-valuetext', F.area(st.area));
    $('ad-area-out').textContent = F.area(st.area);
    $('ad-area-note').textContent = scout && clampArea(scout.area) === st.area ? 'Площадь взята из расчёта бюджета. Можно изменить.' : 'Квартира больше ' + AREA_MAX + NB + 'м²? Выберите ' + AREA_MAX + ' и' + NB + 'напишите площадь в' + NB + 'комментарии' + NB + '— менеджер пересчитает.';
  }
  function paintSum() {
    var c = capsule(), p = pack(), parts = st.mode === 'parts';
    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (b) {
      var on = b.getAttribute('data-mode') === st.mode; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('ad-price').textContent = parts ? 'от' + NB + F.rub(perMonth()) + ' в' + NB + 'месяц' : F.rub(price());
    $('ad-price-note').textContent = parts
      ? 'Всего ' + F.rub(price()) + ', расчёт на ' + PARTS + NB + 'месяцев. Условия рассрочки уточняются.'
      : F.rub(p.rate) + '/м² × ' + F.area(st.area) + ', округлено до 500' + NB + '₽';
    $('ad-sum-rows').innerHTML = rowsHtml([['Капсула', c.name], ['Пакет', p.name], ['Площадь', F.area(st.area)], ['Срок', p.term]]);
  }
  function nb(v) { return String(v).replace(/ /g, NB); }
  function rowsHtml(rows) { return rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><span' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + esc(r[1]) + '</span></div>'; }).join(''); }

  function saveDraft() {
    S.draft.set(DRAFT, { projectId: project ? project.id : null, capsuleId: st.capsuleId, packageId: st.packageId, area: st.area, mode: st.mode,
      name: $('ad-name').value, phone: $('ad-phone').value, comment: $('ad-comment').value });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-capsule],[data-package],[data-mode]'); if (!b || sending) return;
    if (b.hasAttribute('data-capsule')) { st.capsuleId = b.getAttribute('data-capsule'); paintCapsule(); var again = document.querySelector('[data-capsule="' + st.capsuleId + '"]'); if (again) again.focus(); }
    else if (b.hasAttribute('data-package')) { st.packageId = b.getAttribute('data-package'); paintPackages(); var pk = document.querySelector('[data-package="' + st.packageId + '"]'); if (pk) pk.focus(); }
    else st.mode = b.getAttribute('data-mode');
    paintSum(); saveDraft();
  });
  range.addEventListener('input', function () { st.area = clampArea(range.value) || st.area; paintArea(); paintSum(); });
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
  var phone = $('ad-phone'), nameEl = $('ad-name');
  phone.addEventListener('input', function () { phone.value = phoneFormat(phoneDigits(phone.value)); });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (!phoneDigits(phone.value)) phone.value = ''; });

  if (draft.name) nameEl.value = draft.name;
  if (draft.comment) $('ad-comment').value = draft.comment;
  var user = S.auth.user();
  phone.value = phoneFormat(phoneDigits(draft.phone || (user && user.phone) || ''));

  var CHECKS = {
    name: function () { return nameEl.value.trim().length >= 2 ? '' : 'Напишите, как к' + NB + 'вам обращаться'; },
    phone: function () { var n = phoneDigits(phone.value).length; return n === 10 ? '' : n ? 'В номере не хватает цифр: нужно 10 после +7' : 'Укажите телефон' + NB + '— по нему позвонит менеджер'; },
    agree: function () { return $('ad-agree').checked ? '' : 'Отметьте согласие' + NB + '— без него не можем принять заявку'; }
  };
  function setError(name, text) {
    var box = document.querySelector('#lead [data-field="' + name + '"]'), err = $('ad-' + name + '-err'), c = $('ad-' + name);
    box.classList.toggle('is-error', !!text); err.textContent = text || ''; err.hidden = !text;
    if (text) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  }
  ['name', 'phone'].forEach(function (n) {
    var el = $('ad-' + n);
    el.addEventListener('input', function () { setError(n, ''); saveDraft(); });
    el.addEventListener('blur', function () { if (el.value.trim() && CHECKS[n]()) setError(n, CHECKS[n]()); });
  });
  $('ad-comment').addEventListener('input', saveDraft);
  $('ad-agree').addEventListener('change', function () { setError('agree', ''); });

  function showDone(lead) {
    var c = D.capsule(lead.capsuleId), p = packages.filter(function (x) { return x.id === lead.packageId; })[0];
    $('ad-done-text').innerHTML = 'Позвоним по' + NB + 'номеру <span class="num">' + phoneFormat(phoneDigits(lead.phone)) + '</span>, уточним детали и' + NB + 'согласуем состав работ. Оплата' + NB + '— только после этого. Статус заявки виден в' + NB + 'кабинете, в' + NB + 'разделе «Заявки».';
    $('ad-done-rows').innerHTML = rowsHtml([['Капсула', c.name], ['Пакет', p.name + ' · ' + p.term], ['Площадь', F.area(lead.area)],
      [lead.payMode === 'parts' ? 'Цена, рассрочка' : 'Цена', lead.payMode === 'parts' ? nb(F.rub(lead.price)) + ' · от' + NB + nb(F.rub(Math.round(lead.price / PARTS))) + '/мес' : nb(F.rub(lead.price))]]
      .concat(project ? [['Проект', project.name]] : []).concat(scout ? [['Бюджет из расчёта', nb(F.rub(scout.total))]] : []).concat([['Имя', lead.name]]));
    $('calc').hidden = true; $('ad-top').hidden = true;
    (document.querySelector('.app-hero__cta') || {}).hidden = true; /* якорь на форму больше некуда вести */
    $('ad-done').hidden = false;
    $('ad-done').scrollIntoView({ block: 'start' });
    $('ad-done-title').focus({ preventScroll: true });
  }

  $('lead').addEventListener('submit', function (e) {
    e.preventDefault(); if (sending) return;
    var first = null;
    ['name', 'phone', 'agree'].forEach(function (n) { var t = CHECKS[n](); setError(n, t); if (t && !first) first = n; });
    if (first) { $('ad-' + first).focus(); return; }
    sending = true;
    var btn = $('ad-submit'); btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      var lead = null;
      try {
        lead = S.leads.add({ product: 'adept', capsuleId: st.capsuleId, packageId: st.packageId, area: st.area, price: price(), payMode: st.mode,
          name: nameEl.value.trim(), phone: '+7' + phoneDigits(phone.value), comment: $('ad-comment').value.trim(), projectId: project ? project.id : null,
          scoutTotal: scout ? scout.total : null });
      } catch (err) { lead = null; }
      sending = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      if (!lead) { S.ui.toast('Заявка не отправилась: браузер не дал сохранить данные. Форма на месте — попробуйте ещё раз', 'error'); return; }
      S.draft.clear(DRAFT);
      showDone(lead);
    }, 700);
  });

  /* кнопка в итоге ведёт к форме; когда форма уже на экране, вторая терракотовая кнопка не нужна */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { document.querySelector('.ad-sum__cta').classList.toggle('is-off', en[0].isIntersecting); }, { rootMargin: '-25% 0px -25% 0px' }).observe($('lead'));
  }

  /* ---------- старт ---------- */
  paintTop(); paintCapsule(); paintPackages(); paintArea(); paintSum();

  /* перенос с сайта (adept.tsx): сравнение пакетов, 6 шагов работы и этапы проекта */
  (function () {
    var COMPARE = [
      ['Планировка + мебель', 1, 1, 1],
      ['ИИ-рендеры ключевых зон', 1, 1, 1],
      ['Планы света / розеток', 0, 1, 1],
      ['Эскизный 3D-план', 0, 0, 1],
      ['Точная спецификация', 0, 0, 1]
    ];
    var HOW = [
      'Выбираете капсулу и пакет — фиксируете площадь',
      'Присылаете план БТИ, обмер или фото комнат',
      'Дизайн-проект адаптирует капсулу под вашу планировку',
      'Согласуете планировку и визуализации',
      'Получаете чертежи и спецификацию материалов',
      'Открывается доступ к скидкам партнёров на 6 месяцев'
    ];
    var STAGES = [
      ['Договор', 'условия, сроки и состав работ'],
      ['Планировка', 'расстановка мебели под вашу квартиру'],
      ['Визуализации проекта', 'рендеры ключевых зон'],
      ['Чертежи', 'рабочая документация для бригады']
    ];
    var t = document.getElementById('ad-table');
    if (t) {
      t.innerHTML = '<div class="ad-table__row ad-table__row--head"><span>Позиция</span><span>Стартовый</span><span>Базовый</span><span>Оптимальный</span></div>' +
        COMPARE.map(function (r) {
          return '<div class="ad-table__row"><span>' + esc(r[0]) + '</span>' +
            [1, 2, 3].map(function (i) { return '<span class="' + (r[i] ? 'is-yes' : 'is-no') + '">' + (r[i] ? '✓' : '—') + '</span>'; }).join('') +
            '</div>';
        }).join('');
    }
    var h = document.getElementById('ad-how6');
    if (h) h.innerHTML = HOW.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var st2 = document.getElementById('ad-stages');
    if (st2) st2.innerHTML = STAGES.map(function (x, i) {
      return '<div class="pb-item"><b>' + (i + 1) + ' · ' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>';
    }).join('');
  })();

})();
