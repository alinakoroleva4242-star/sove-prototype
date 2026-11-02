/* Расчёт ремонта (Расчёт бюджета), v2: три шага — Квартира → Интерьер → Результат. «Формат участия» вынесен из мастера (на цифры не влияет). Доступ к результату — по правилам платформы (SOVE.scout):
   первый расчёт бесплатно, по подписке METOD бесплатно, открытая пара «капсула + тип ремонта» пересчитывается бесплатно,
   иначе счёт в рублях (токены не участвуют). Состояние мастера живёт в SOVE.draft('scout') и восстанавливается при загрузке. */
(function () {
  var S = window.SOVE;
  var stage = document.getElementById('scout-stage');
  var stepsEl = document.getElementById('scout-steps');
  if (!stage || !stepsEl) return;
  if (!S || !S.data || !S.data.scout) {
    stage.innerHTML = '<div class="error-screen"><p class="h4">Не удалось открыть расчёт</p><p class="small">Данные для расчёта не загрузились. Введённое не потеряно — обновите страницу.</p><div><button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">Обновить страницу</button></div></div>';
    return;
  }
  var D = S.data, F = S.fmt, esc = F.esc, SC = D.scout;

  /* тип ремонта: названия — из SOVE.data.scoutAccess.levels, описания — здесь.
     sameAsBase: данных калькулятора для уровня нет, сумма считается по формулам Базового (в результате есть пометка) */
  var LEVEL_NOTES = {
    base: { note: 'Материалы и бренды базового классификатора SOVEAPP. Цена комплектации — из капсулы.' },
    premium: { note: 'Материалы и бренды классом выше. Отдельный тип ремонта: открывается отдельно от Базового.', sameAsBase: true }
  };
  var LEVELS = ((D.scoutAccess && D.scoutAccess.levels) || [ { id: 'base', name: 'Базовый' }, { id: 'premium', name: 'Премиум' } ]).map(function (l) {
    var x = LEVEL_NOTES[l.id] || {}; return { id: l.id, name: l.name, note: x.note || '', sameAsBase: !!x.sameAsBase };
  });
  var STEPS = ['Капсула', 'Состояние', 'Параметры', 'Формат', 'Результат'];

  /* классификатор SOVEAPP — что входит в Базовый и Премиум (Вика 21.10): данные в assets/js/classifier.js,
     генерация tools/gen_classifier.py из services/api/ai_knowledge/classifier.md */
  function clsHtml(level) {
    var C = S.classifier; if (!C || !C.sections) return '<p class="small muted">Классификатор не загрузился.</p>';
    var other = level === 'premium' ? 'base' : 'premium', otherName = other === 'premium' ? 'в Премиуме' : 'в Базовом';
    return '<div class="cls-seg" role="group" aria-label="Тип ремонта">' + LEVELS.map(function (l) { return '<button type="button" class="cls-seg__b' + (l.id === level ? ' is-on' : '') + '" data-cls-level="' + l.id + '" aria-pressed="' + (l.id === level) + '">' + esc(l.name) + '</button>'; }).join('') + '</div>' +
      '<div class="cls-list">' + C.sections.map(function (sec) {
        return '<div class="cls-sec"><h3 class="h4 cls-sec__t">' + esc(sec.title) + '</h3>' + sec.rows.map(function (r) {
          return '<div class="cls-row"><span class="cls-row__k">' + esc(r.item) + '</span><b class="cls-row__v">' + esc(r[level] || '—') + '</b>' + (r[other] ? '<span class="cls-row__o small muted">' + otherName + ': ' + esc(r[other]) + '</span>' : '') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      '<p class="small muted">Цены — ориентиры классификатора SOVEAPP за единицу. Итог посчитаем по вашей планировке.</p>';
  }
  function openClassifier(level) {
    var api = S.ui.modal({ eyebrow: 'Классификатор SOVEAPP', title: 'Что входит в ремонт', html: clsHtml(level), actions: [{ label: 'Понятно', kind: 'primary' }] });
    api.el.addEventListener('click', function (e) { var b = e.target.closest('[data-cls-level]'); if (!b) return; api.el.querySelector('.modal__body').innerHTML = clsHtml(b.getAttribute('data-cls-level')); });
  }
  var MAX_ROOM = 999;

  var ICON = {
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plan: '<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 8h36v32H30M22 40H6V8M24 8v14M24 30v10M24 22h-6M42 24H32"/></svg>'
  };

  /* ---------- состояние ---------- */
  function blank() { return { step: 1, capsuleId: null, source: 'capsule', visuals: null, level: 'base', stateId: null, plan: null, planFile: null, planLevel: null, formatId: 'self', area: 0, prefilledFrom: null, savedProjectId: null, pendingSave: 0,
    gate: false, issued: null, payId: null, pendingPay: 0 }; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function okCapsule(id) { var c = id && D.capsule(id); return c && !c.soon && c.pricePerM2 ? c : null; }

  var saved = S.draft.get('scout');
  var hadDraft = !!(saved && typeof saved === 'object');
  var st = Object.assign(blank(), hadDraft ? saved : {});
  var roomSeq = 0, visRecog = null, restoredNote = false, focusAfter = null, payError = '';

  (function sanitize() {
    if (!okCapsule(st.capsuleId)) st.capsuleId = null;
    if (st.source !== 'visuals') st.source = 'capsule';
    if (!st.visuals || !Array.isArray(st.visuals.files) || !Array.isArray(st.visuals.items)) st.visuals = null;
    if (st.visuals) st.visuals.items = st.visuals.items.filter(function (it) { return it && D.product(it.id); });
    if (st.source === 'visuals' && !(st.visuals && st.visuals.items.length)) st.source = 'capsule';
    if (!byId(LEVELS, st.level)) st.level = 'base';
    st.gate = !!st.gate;
    if (!st.issued || typeof st.issued !== 'object' || !st.issued.requestId) st.issued = null;
    if (!byId(SC.states, st.stateId)) st.stateId = null;
    if (!byId(SC.formats, st.formatId)) st.formatId = 'self';
    if (st.plan && (!Array.isArray(st.plan.rooms) || !st.plan.rooms.length)) st.plan = null;
    if (st.plan && st.plan.mode !== 'plan' && st.plan.mode !== 'manual') st.plan.mode = 'manual';   /* прежние режимы file/sample (имитация распознавания) — теперь ручной ввод */
    if (st.plan) st.plan.rooms.forEach(function (r) { if (!r.id) r.id = 'n' + (++roomSeq); r.area = (typeof r.area === 'number' && r.area > 0) ? r.area : null; });
    st.step = Math.min(3, Math.max(1, Number(st.step) || 1));
  })();

  /* проект из адреса: считаем для него и сохраняем в него */
  var qProject = S.ui.qs('project');
  var project = (qProject && S.auth.isIn()) ? S.projects.get(qProject) : null;
  if (project && st.prefilledFrom !== project.id) {
    var ps = project.scout;
    if (ps) { st = Object.assign(blank(), { capsuleId: okCapsule(ps.capsuleId) ? ps.capsuleId : null, stateId: byId(SC.states, ps.stateId) ? ps.stateId : null, formatId: byId(SC.formats, ps.formatId) ? ps.formatId : null }); }
    if (!st.capsuleId && okCapsule(project.capsuleId)) st.capsuleId = project.capsuleId;
    var pArea = (ps && ps.area) || project.area;
    if (ps && Array.isArray(ps.rooms) && ps.rooms.length) st.plan = { mode: 'manual', fileName: null, meta: null, rooms: ps.rooms.map(function (r) { return { id: 'n' + (++roomSeq), name: r.name, area: Number(r.area) || null }; }) };
    else if (pArea && !st.plan) st.plan = { mode: 'manual', fileName: null, meta: null, rooms: [ { id: 'n' + (++roomSeq), name: 'Вся квартира', area: Number(pArea) } ] };
    st.prefilledFrom = project.id; st.step = 1;
  }

  /* капсула из адреса важнее черновика: человек пришёл с карточки капсулы */
  var qCapsule = (S.ui.qs('capsule') || '').toLowerCase();
  if (okCapsule(qCapsule) && st.capsuleId !== qCapsule) { st.capsuleId = qCapsule; st.source = 'capsule'; st.savedProjectId = null; st.gate = false; }

  /* пришли с главной: площадь и состояние уже выбраны в мини-калькуляторе */
  (function fromHome() {
    var qa = Number(S.ui.qs('area')), qs = S.ui.qs('state');
    if (qs && byId(SC.states, qs) && !st.stateId) st.stateId = qs;
    if (qa >= 10 && qa <= 999 && !st.plan) st.plan = { mode: 'manual', fileName: null, meta: null, rooms: [ { id: 'n' + (++roomSeq), name: 'Вся квартира', area: Math.round(qa * 10) / 10 } ] };
  })();

  /* пришли из Планировки (ТЗ Планировки, 17.2 «гибрид»): весь бюджет уже куплен там — подставляем план, состояние,
     интерьер и тип из квартиры (SOVE.scout.fromRepair) и ничего не переспрашиваем; ?step=result — сразу последняя страница */
  var qFromPlan = S.ui.qs('from') === 'plan' && S.repair ? (S.ui.qs('flat') || (S.repair.flats.active() || {}).id || '') : null;
  /* пришли из Бюджета по «Досчитать весь бюджет» (Алина 26.10): интерьер уже собран — подставляем капсулу, план и тип из квартиры
     и начинаем с «Состояния» — единственного, чего мы не знаем. Расчёт — по обычным правилам доступа (не бесплатный пересчёт) */
  var qFromInt = S.ui.qs('from') === 'interior' && S.repair ? ((S.repair.flats.active() || {}).id || '') : null;
  if (qFromInt !== null) {
    var fi = S.scout.fromRepair(qFromInt), capI = okCapsule(fi.capsuleId) ? fi.capsuleId : (D.capsules.filter(function (x) { return okCapsule(x.id) && !x.designer; })[0] || {}).id;
    st = Object.assign(blank(), { capsuleId: capI, stateId: byId(SC.states, fi.stateId) ? fi.stateId : 'concrete', level: fi.level === 'premium' ? 'premium' : 'base', formatId: 'self',
      plan: fi.rooms && fi.rooms.length ? { mode: 'manual', fileName: null, meta: null, rooms: fi.rooms.map(function (r) { return { id: 'n' + (++roomSeq), name: r.name, area: Number(r.m2 || r.area) || null }; }) } : st.plan,
      fromInterior: qFromInt, step: 2 });
  }
  if (qFromPlan !== null) {
    var fp = S.scout.fromRepair(qFromPlan), cap0 = okCapsule(fp.capsuleId) ? fp.capsuleId : (D.capsules.filter(function (x) { return okCapsule(x.id) && !x.designer; })[0] || {}).id;
    st = Object.assign(blank(), { capsuleId: cap0, stateId: byId(SC.states, fp.stateId) ? fp.stateId : 'concrete', level: fp.level === 'premium' ? 'premium' : 'base', formatId: 'self',
      plan: { mode: 'manual', fileName: null, meta: null, rooms: (fp.rooms && fp.rooms.length ? fp.rooms : [{ name: 'Вся квартира', m2: fp.area }]).map(function (r) { return { id: 'n' + (++roomSeq), name: r.name, area: Number(r.m2 || r.area) || null }; }) },
      fromPlan: qFromPlan, step: 4, volumes: fp.volumes || null });   /* объёмы плана: работы по позициям, а не ставка × м² */
  } else { delete st.fromPlan; delete st.volumes; if (qFromInt === null) delete st.fromInterior; }  /* обычный вход в Расчёт бюджета — без бесплатного пересчёта из Планировки */

  /* «Вся квартира» — общая площадь, она не меняется; помещения ниже — разбивка внутри неё и к общей не прибавляются (Вика 21.10) */
  function isWhole(r) { return /^(вся\s+квартира|вся\s+площадь|общая(\s+площадь)?|квартира\s+целиком)$/i.test(String(r.name || '').trim()); }
  function wholeRoom() { return st.plan ? st.plan.rooms.filter(function (r) { return isWhole(r) && typeof r.area === 'number' && r.area > 0; })[0] : null; }
  function partsArea() {
    var sum = 0; (st.plan ? st.plan.rooms : []).forEach(function (r) { if (!isWhole(r) && typeof r.area === 'number' && r.area > 0) sum += r.area; });
    return Math.round(sum * 10) / 10;
  }
  function totalArea() {
    if (!st.plan) return 0;
    var w = wholeRoom(); if (w) return Math.round(w.area * 10) / 10;
    return partsArea();
  }
  function breakdownHtml() {
    var w = wholeRoom(), parts = partsArea(); if (!w || !(parts > 0)) return '';
    var rest = Math.round((w.area - parts) * 10) / 10;
    return rest < 0 ? '<span class="scout-rooms__warn">Площади помещений больше общей на ' + F.area(-rest) + ' — проверьте цифры</span>'
      : 'Помещения — разбивка внутри общей площади: ' + F.area(parts) + ' из ' + F.area(w.area) + (rest > 0 ? ', остальное — ' + F.area(rest) : '');
  }
  function flatOk() { return !!st.stateId && !!st.plan && totalArea() > 0 && !st.plan.rooms.some(function (r) { return r.bad; }); }
  function valid(n) {
    if (n === 1) return !visRecog && (isVis() || !!(okCapsule(st.capsuleId) && st.level));
    if (n === 2) return !!st.stateId;
    if (n === 3) return flatOk();
    if (n === 4) return !!byId(SC.formats, st.formatId);
    return validInputs() && issuedOk();
  }
  function validInputs() { return valid(1) && valid(2) && valid(3); }
  /* шаг 3 открыт, только когда расчёт выдан по правилам доступа и параметры с тех пор не менялись */
  function maxStep() { for (var i = 1; i <= 4; i++) if (!valid(i)) return i; return issuedOk() ? 5 : 4; }
  st.step = Math.min(st.step, maxStep());
  restoredNote = hadDraft && !st.gate && !st.pendingSave && !(st.step === 5 && issuedOk()) && !S.ui.qs('area') && (st.step > 1 || !!st.stateId || !!st.plan);   /* со счёта уходят на вход и оплату — возврат ожидаем, напоминание не нужно */

  function persist() {
    st.area = totalArea();
    var copy = JSON.parse(JSON.stringify(st));
    if (copy.plan) copy.plan.rooms.forEach(function (r) { delete r.bad; delete r.raw; });
    S.draft.set('scout', copy);
  }
  function touch() { st.savedProjectId = null; persist(); }
  function here() { return 'scout.html' + location.search; }
  function syncUrl() {
    try {
      var q = new URLSearchParams(location.search);
      if (st.capsuleId && !isVis()) q.set('capsule', st.capsuleId); else q.delete('capsule');
      var s = q.toString(); history.replaceState(null, '', 'scout.html' + (s ? '?' + s : ''));
    } catch (e) { /* адрес не обновился — не страшно, капсула есть в черновике */ }
  }

  /* ---------- расчёт ---------- */
  function calc() {
    var s = byId(SC.states, st.stateId), area = totalArea(), VW = S.scout.planWorks(st.volumes, s.id, st.level, area);
    var works = VW ? VW.total : s.rate * area, c = null, lines = null, kitMetod, kitRetail;
    if (isVis()) { var vk = visKit(area); kitMetod = vk.kitMetod; kitRetail = vk.kitRetail; lines = vk.lines; }
    else { c = D.capsule(st.capsuleId); kitMetod = c.pricePerM2 * area; kitRetail = kitMetod * SC.retailMarkup; }
    var total = works + kitMetod;
    return { capsule: c, visuals: lines, state: s, level: byId(LEVELS, st.level), format: byId(SC.formats, st.formatId), area: area, plan: VW,
      works: works, kitMetod: kitMetod, kitRetail: kitRetail, total: total, perM2: total / area,
      save: kitRetail - kitMetod, savePct: kitRetail > 0 ? Math.round((kitRetail - kitMetod) / kitRetail * 100) : 0 };
  }

  /* ---------- доступ к расчёту (правила платформы — SOVE.scout) ---------- */
  function accessParams() {
    var rooms = st.plan ? st.plan.rooms.filter(function (r) { return typeof r.area === 'number' && r.area > 0; }).length : 0;
    var m = st.plan && st.plan.meta;
    return { capsuleId: srcId(), level: st.level, stateId: st.stateId, area: totalArea(), rooms: rooms, bathrooms: (m && m.bathrooms) || 0, formatId: st.formatId };
  }
  function sig() { return JSON.stringify(accessParams()); }
  function issuedRequest() {
    if (!st.issued) return null;
    return S.scout.requests().filter(function (r) { return r.id === st.issued.requestId; })[0] || null;
  }
  function issuedOk() { return !!st.issued && st.issued.sig === sig() && !!issuedRequest(); }
  function accessNow() { return (isVis() || okCapsule(st.capsuleId)) ? S.scout.access(accessParams()) : null; }
  function isPayable(a) { return !!a && (a.kind === 'paid' || a.kind === 'recalc-paid'); }
  function exampleMark() { return D.scoutAccess && D.scoutAccess.pricesAreExamples; }
  function pairName() { if (isVis()) return 'Подборка по вашим картинкам'; var c = okCapsule(st.capsuleId); return c ? c.name + ' · ' + byId(LEVELS, st.level).name : ''; }
  /* шаг 1: одна спокойная строка — что ждёт клиента для выбранной пары */
  function pairLine() {
    var a = accessNow();
    if (!a) return '<p class="small muted scout-access" id="scout-access">Выберите капсулу — покажем условия расчёта.</p>';
    var t = a.kind === 'first-free' ? 'первый расчёт бесплатно'
      : a.kind === 'metod' ? 'бесплатно по подписке METOD'
      : (a.kind === 'opened' || a.kind === 'repeat') ? 'уже открыта, пересчёт бесплатный'
      : isPayable(a) ? (a.kind === 'paid' ? 'открытие ' : 'пересчёт ') + '<span class="num">' + F.rub(a.price) + '</span>' + (exampleMark() ? ' <span class="badge badge--line">пример цены</span>' : '')
      : 'цена не задана — расчёт доступен по подписке METOD';
    return '<p class="small scout-access" id="scout-access"><span class="muted">' + esc(pairName()) + ':</span> ' + t + '</p>';
  }
  /* шаг 4: строка над кнопкой и подпись кнопки */
  function accessLine() {
    var a = accessNow(); if (!a) return '';
    if (a.kind === 'first-free') return 'Первый расчёт бесплатно';
    if (a.kind === 'metod') return 'Бесплатно по подписке METOD';
    if (a.kind === 'opened') return 'Капсула уже открыта — пересчёт бесплатный';
    if (a.kind === 'repeat') return 'Такой расчёт у вас уже есть — заявка № ' + a.request.number + ' от ' + F.dateLong(a.request.ts);
    if (isPayable(a)) return (a.kind === 'paid' ? 'Открытие расчёта ' : 'Пересчёт ') + pairName() + ' — ' + F.rub(a.price) + (exampleMark() ? ' (пример цены)' : '');
    return 'Цена для этой капсулы не задана';
  }
  function nextLabel() {
    var a = accessNow(); if (!a) return 'Рассчитать';
    return a.kind === 'repeat' ? 'Открыть расчёт' : isPayable(a) ? 'Перейти к счёту' : a.kind === 'unavailable' ? 'Далее' : 'Рассчитать';
  }
  function resultData(r) { return { area: r.area, works: r.works, kitMetod: r.kitMetod, kitRetail: r.kitRetail, total: r.total, sameAsBase: !!r.level.sameAsBase }; }
  /* выдать расчёт: новая заявка Расчёт бюджета (basis) или уже существующая (повтор — новую не создаём) */
  function issue(basis, existing) {
    var req = existing || S.scout.register(accessParams(), resultData(calc()), basis);
    st.issued = { requestId: req.id, sig: sig() }; st.gate = false; st.payId = null; st.pendingPay = 0; st.step = 5;
    var rr = calc(); S.my.set({ capsuleId: isVis() ? null : st.capsuleId, level: st.level, area: rr.area, stateId: st.stateId, total: rr.total, works: rr.works, kitMetod: rr.kitMetod, kitRetail: rr.kitRetail });
    /* из Интерьера: расчёт и есть весь бюджет квартиры — параметры расчёта в паспорт, бюджет «посчитан» (Бюджет строит 9 + 5 по ним) */
    if (st.fromInterior && S.repair) {
      var R1 = S.repair, rp1 = R1.get(st.fromInterior);
      if (rp1) {
        rp1.scoutParams = { stateId: st.stateId, area: rr.area, capsuleId: st.capsuleId, level: st.level, rooms: st.plan ? st.plan.rooms.map(function (r) { return { name: r.name, m2: r.area }; }) : [], byRooms: byRoomsData(rr) };
        rp1.budgetPlan = Object.assign({}, rp1.budgetPlan || {}, { full: true, type: st.level, ts: Date.now(), source: 'scout' });
        R1.flats.update(st.fromInterior, {});
      }
    }
    /* из Планировки: правки расчёта сразу меняют бюджет квартиры — Планировка, Мой ремонт и полоса «Бюджет» (17.2) */
    if (st.fromPlan !== undefined && st.fromPlan !== null && S.repair) {
      var R = S.repair, fid = st.fromPlan || (R.flats.active() || {}).id, rp = fid ? R.get(fid) : null;
      if (rp) {
        rp.scoutParams = { stateId: st.stateId, area: rr.area, capsuleId: st.capsuleId, level: st.level, rooms: st.plan ? st.plan.rooms.map(function (r) { return { name: r.name, m2: r.area }; }) : [], byRooms: byRoomsData(rr) };
        if (rp.budgetPlan) rp.budgetPlan.type = st.level;
        if (window.SOVE_FLOW && window.SOVE_FLOW.refreshBudget) window.SOVE_FLOW.refreshBudget(); else R.flats.update(fid, {});
      }
    }
    persist(); return req;
  }
  function showStep() {
    restoredNote = false; focusAfter = '#scout-h'; render();
    var top = document.getElementById('scout-head').getBoundingClientRect().top + window.pageYOffset;
    if (window.pageYOffset > top) window.scrollTo(0, top);
  }
  /* кнопка шага 4: ведём по веткам доступа */
  function proceed() {
    if (!validInputs()) return;
    /* из Планировки весь бюджет уже оплачен — пересчёт бесплатный, без экрана-счёта */
    if (st.fromPlan !== undefined && st.fromPlan !== null) { var ap = S.scout.access(accessParams()); issue('plan', ap.kind === 'repeat' ? ap.request : null); showStep(); return; }
    var a = S.scout.access(accessParams());
    if (a.kind === 'repeat') { issue(null, a.request); showStep(); return; }
    if (a.kind === 'first-free' || a.kind === 'metod' || a.kind === 'opened') { issue(a.kind); showStep(); return; }
    st.gate = true; payError = ''; persist(); showStep();            /* paid | recalc-paid | unavailable → экран-счёт */
  }
  function payItemId() { return srcId() + '-' + st.level; }
  function payOpen() {
    if (!validInputs()) return;
    var a = S.scout.access(accessParams());
    if (!isPayable(a)) { proceed(); return; }                        /* условия изменились (METOD, пара открыта) — счёт не нужен */
    if (!S.auth.isIn()) { st.pendingPay = Date.now(); persist(); S.ui.needAuth('Войдите, чтобы оплатить расчёт', here()); return; }
    var old = st.payId ? S.pay.get(st.payId) : null;
    var pm = (old && old.status === 'pending' && old.item && old.item.id === payItemId() && old.item.price === a.price) ? old
      : S.pay.create({ kind: 'scout', id: payItemId(), title: (a.kind === 'paid' ? 'Открытие расчёта · ' : 'Пересчёт · ') + pairName(), price: a.price, capsuleId: srcId(), level: st.level }, here());
    st.payId = pm.id; st.pendingPay = 0; persist();
    location.href = 'pay.html?id=' + encodeURIComponent(pm.id);
  }
  /* вернулись на страницу с открытым счётом (после оплаты, входа или оформления METOD): true — расчёт выдан */
  function resolveGate() {
    if (!st.gate) return null;
    if (!validInputs()) { st.gate = false; return null; }
    var a = S.scout.access(accessParams());
    if (a.kind === 'repeat') return issue(null, a.request);
    var pm = st.payId ? S.pay.get(st.payId) : null;
    if (pm && pm.status === 'paid' && pm.item && pm.item.capsuleId === srcId() && pm.item.level === st.level) return issue('paid');
    if (a.kind === 'first-free' || a.kind === 'metod' || a.kind === 'opened') return issue(a.kind);
    if (pm && pm.status !== 'pending') { payError = 'Оплата не прошла — деньги не списаны, расчёт не открыт. Попробуйте ещё раз или оплатите другой картой.'; st.payId = null; }
    return null;
  }

  /* ---------- шапка страницы и шаги ---------- */
  function renderHead() {
    var t = document.getElementById('scout-title'), lead = document.getElementById('scout-lead'), head = document.getElementById('scout-head');
    /* макет Вики 23.10: под шапкой сразу линия шагов, заголовок страницы — только для чтения с экрана */
    t.className = 'vh';
    lead.hidden = true;
    head.classList.add('is-compact');
    if (project) document.getElementById('scout-crumbs').innerHTML = '<a href="account.html#projects">Кабинет</a><span aria-hidden="true">/</span><a href="project.html?id=' + encodeURIComponent(project.id) + '">' + esc(project.name) + '</a><span aria-hidden="true">/</span><span>Расчёт ремонта</span>';
  }
  function stepValue(n) {
    if (n === 1) { if (isVis()) return 'по картинкам'; var c1 = okCapsule(st.capsuleId); return c1 ? c1.name : ''; }
    if (n === 2) { var s0 = byId(SC.states, st.stateId); return s0 ? s0.name.toLowerCase() : ''; }
    if (n === 3) { var ar = totalArea(); return ar > 0 ? F.area(ar) : ''; }
    if (n === 4) { if (st.gate && st.step === 4) return isPayable(accessNow()) ? 'после оплаты' : 'по подписке METOD'; var f0 = byId(SC.formats, st.formatId); return f0 ? f0.name.toLowerCase() : ''; }
    return (st.step === 5 && valid(5)) ? F.rub(calc().total) : '';
  }
  function renderSteps() {
    var max = maxStep();
    stepsEl.innerHTML = STEPS.map(function (name, i) {
      var n = i + 1, cur = n === st.step, done = !cur && n < 5 && valid(n) && n <= max, val = stepValue(n);
      return '<button type="button" data-step="' + n + '" class="' + (cur ? 'is-current' : done ? 'is-done' : '') + '"' + (n > max ? ' disabled' : '') + (cur ? ' aria-current="step"' : '') +
        ' aria-label="Шаг ' + n + ' из 5: ' + esc(name) + (val ? ' — ' + esc(val) : '') + '"><b>Шаг ' + n + '</b><span>' + esc(name) + '</span><em class="scout-steps__val num">' + esc(val) + '</em></button>';
    }).join('');
  }

  /* ---------- общий низ шага: Назад / Далее ---------- */
  /* предварительная сумма видна с первого шага и уточняется по ходу */
  function estimate() {
    var s0 = byId(SC.states, st.stateId), ar = totalArea(); if (!s0 || !(ar > 0)) return '';
    var c = okCapsule(st.capsuleId), VW = S.scout.planWorks(st.volumes, s0.id, st.level, ar), wk = VW ? VW.total : s0.rate * ar;
    function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
    if (isVis()) return 'Предварительно: ' + mln(wk + visKit(ar).kitMetod) + ' млн ₽';
    if (c) return 'Предварительно: ' + mln(wk + c.pricePerM2 * ar) + ' млн ₽';
    var ps = D.capsules.filter(function (x) { return okCapsule(x.id) && !x.designer; }).map(function (x) { return x.pricePerM2; });
    return 'Предварительно: от ' + mln(wk + Math.min.apply(null, ps) * ar) + ' до ' + mln(wk + Math.max.apply(null, ps) * ar) + ' млн ₽';
  }
  function hint() {
    var n = st.step;
    if (valid(n)) return n === 4 ? accessLine() : estimate();
    if (n === 2) return 'Выберите, что сейчас в квартире';
    if (n === 3) return (!st.plan ? 'Укажите площадь: загрузите план или впишите вручную' : (st.plan.rooms.some(function (r) { return r.bad; }) ? 'Исправьте площадь, отмеченную красным' : 'Укажите площадь хотя бы одного помещения'));
    if (n === 1) {
      if (visRecog) return 'Подбираем товары по картинкам…';
      return (st.plan && st.plan.mode === 'plan') ? 'Выберите капсулу — посчитаем её под ваши размеры' : 'Выберите капсулу или загрузите план и свои картинки';
    }
    return '';
  }
  function bar() {
    var n = st.step, back = n > 1 ? '<button type="button" class="btn btn--ghost" data-act="back">Назад</button>' : '';
    if (n === 5) return '<div class="scout-bar scout-bar--result"><div class="scout-bar__in">' + back + saveButton() + '</div></div>';
    return '<div class="scout-bar"><div class="scout-bar__in">' + back +
      '<span class="scout-bar__hint small muted" id="scout-hint" aria-live="polite">' + esc(hint()) + '</span>' +
      '<button type="button" class="btn btn--primary" data-act="next"' + (valid(n) ? '' : ' disabled') + '>' + (n === 4 ? nextLabel() : 'Далее') + '</button></div></div>';
  }
  function updateBar() {
    var next = stage.querySelector('[data-act="next"]'), h = document.getElementById('scout-hint');
    if (next) next.disabled = !valid(st.step);
    if (h) h.textContent = hint();
  }
  function stepHead(title, text) {
    return '<div class="stack stack--3 scout-step__head"><h2 class="h2" id="scout-h" tabindex="-1">' + title + '</h2>' + (text ? '<p class="text">' + text + '</p>' : '') + '</div>';
  }

  /* ---------- шаг 1: «+ технический проект», «+ свои визуалы», или капсула (голосовое Вики 22.10) ----------
     Технический проект (обмерный план, чертежи) — берём из него размеры, выбранная капсула считается под них.
     Свои визуалы (картинки из Pinterest) — подбираем похожие товары из каталога, капсула не нужна, метры — на шаге «Параметры».
     В прототипе распознавание — имитация: план — пример планировки, подборка — товары каталога прототипа. */
  /* тексты кнопок — как в макете Вики 23.10 («Загрузить техпаспорт / план», «Моя капсула»), под ними — коротко, что будет */
  function srcSvg(d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 22) + '" height="' + (w || 22) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var SRC_IC = { plus: srcSvg('<path d="M12 5v14M5 12h14"/>'), doc: srcSvg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    image: srcSvg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>'), chev: srcSvg('<path d="M9 5l7 7-7 7"/>', 18) };
  var VIS_STAGES = ['Разбираю картинки', 'Нахожу предметы', 'Подбираю товары из каталога'];
  /* что ищем на картинках: категория, начало подкатегории, сколько позиций и штук; отделка — на долю площади (м²) */
  var VIS_PLAN = [
    { cat: 'Мебель', sub: 'Диваны', n: 1 }, { cat: 'Мебель', sub: 'Кресла', n: 1 }, { cat: 'Мебель', sub: 'Столы', n: 1 },
    { cat: 'Мебель', sub: 'Кровати', n: 1 }, { cat: 'Мебель', sub: 'Стулья', n: 1, qty: 4 },
    { cat: 'Освещение', sub: 'Люстры', n: 1 }, { cat: 'Освещение', sub: 'Подвесы', n: 1, qty: 2 },
    { cat: 'Сантехника', sub: 'Смесители', n: 1 }, { cat: 'Сантехника', sub: 'Раковины', n: 1 }, { cat: 'Сантехника', sub: 'Унитазы', n: 1 },
    { cat: 'Отделка', sub: 'Напольные', n: 1, perM2: 0.85 }, { cat: 'Отделка', sub: 'Керамогранит', n: 1, perM2: 0.2 },
    { cat: 'Техника', sub: '', n: 1 }, { cat: 'Текстиль и декор', sub: '', n: 1 }
  ];
  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }
  function isVis() { return st.source === 'visuals' && !!st.visuals && st.visuals.items.length > 0; }
  function srcId() { return isVis() ? 'visuals' : st.capsuleId; }
  function hashOf(files) { var h = 2166136261 >>> 0; files.forEach(function (f) { var t = String(f.name) + ':' + (f.size || 0); for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }); return h; }
  /* одни и те же картинки — та же подборка */
  function composeVisuals(files) {
    var seed = hashOf(files) || 1, used = {}, items = [];
    VIS_PLAN.forEach(function (row) {
      var pool = D.products.filter(function (p) { var price = p.metod || p.retail; return p.category === row.cat && (!row.sub || String(p.subcat || '').indexOf(row.sub) === 0) && p.img && !used[p.id] && price > 0 && price <= 300000; });
      for (var k = 0; k < row.n && pool.length; k++) {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        var p = pool.splice(seed % pool.length, 1)[0]; used[p.id] = true;
        items.push({ id: p.id, qty: row.qty || 1, perM2: row.perM2 || 0 });
      }
    });
    return items;
  }
  function visKit(area) {
    var kitMetod = 0, kitRetail = 0, lines = [];
    (st.visuals ? st.visuals.items : []).forEach(function (it) {
      var p = D.product(it.id); if (!p) return;
      var qty = it.perM2 ? Math.max(1, Math.round(area * it.perM2)) : (it.qty || 1);
      var m = (p.metod || p.retail) * qty, rt = (p.retail || p.metod) * qty;
      kitMetod += m; kitRetail += rt; lines.push({ p: p, qty: qty, perM2: !!it.perM2, metod: m, retail: rt });
    });
    return { kitMetod: kitMetod, kitRetail: kitRetail, lines: lines };
  }
  function srcHtml() {
    /* план — из общего окна «Основа квартиры» (plan-upload.js): лежит в Моём ремонте; комнаты и площади даёт только Планировка */
    var fromPlan = !!st.plan && st.plan.mode === 'plan', doneT = fromPlan || !!st.planFile;
    var roomsN = fromPlan ? st.plan.rooms.filter(function (r) { return r.area > 0 && !isWhole(r); }).length : 0;
    var noteT = fromPlan ? esc(st.plan.fileName || 'план') + ' · ' + (roomsN ? roomsN + ' ' + pl(roomsN, ['помещение', 'помещения', 'помещений']) + ' · ' : '') + F.area(totalArea()) + ' · заменить'
      : st.planFile ? esc(st.planFile) + ' · комнаты — после Планировки · заменить'
      : 'размеры из плана';
    var vis = st.visuals, busyV = !!visRecog, doneV = !busyV && !!vis && vis.items.length > 0;
    var noteV = busyV ? esc(VIS_STAGES[Math.min(visRecog.stage, VIS_STAGES.length - 1)]) + '…'
      : doneV ? vis.files.length + ' ' + pl(vis.files.length, ['картинка', 'картинки', 'картинок']) + ' · подобрали ' + vis.items.length + ' ' + pl(vis.items.length, ['товар', 'товара', 'товаров']) + ' из каталога' + (isVis() ? '' : ' · сейчас считаем по капсуле')
      : 'по вашим картинкам';
    function opt(kind, title, note, busy, done, on, icon) {
      return '<button type="button" class="scout-src__opt' + (done ? ' is-done' : '') + (on ? ' is-on' : '') + (busy ? ' is-busy' : '') + '" data-own="' + kind + '"' + (busy ? ' aria-busy="true"' : '') + '>' +
        '<span class="scout-src__ic">' + (done ? ICON.check : SRC_IC[icon]) + '</span>' +
        '<span class="scout-src__txt"><span class="scout-src__t">' + title + '</span><span class="scout-src__n">' + note + '</span></span><span class="scout-src__ch" aria-hidden="true">' + SRC_IC.chev + '</span></button>';
    }
    function prog(stage, total) { return '<div class="progress scout-src__bar" role="presentation"><i style="width:' + Math.round((stage + 1) / total * 100) + '%"></i></div>'; }
    var actsV = doneV ? '<div class="scout-src__acts">' + (isVis() ? '' : '<button type="button" class="btn btn--link" data-act="use-visuals">Считать по картинкам</button>') +
      '<button type="button" class="btn btn--link" data-act="drop-visuals">Убрать картинки</button></div>' : '';
    return '<div class="scout-src" role="group" aria-label="Загрузить своё">' +
      '<div class="scout-src__item">' + opt('tech', 'Загрузить техпаспорт / план', noteT, false, doneT, doneT, 'doc') + '</div>' +
      '<div class="scout-src__item">' + opt('visuals', 'Моя капсула', noteV, busyV, doneV, isVis(), 'image') + (busyV ? prog(visRecog.stage, VIS_STAGES.length) : '') + actsV + '</div>' +
      '<input type="file" id="scout-vis-file" accept="image/*" multiple hidden>' +
    '</div>';
  }
  /* общее окно «Основа квартиры» (plan-upload.js, созвон 28.10): план сохраняется в Мой ремонт; после закрытия берём из квартиры
     комнаты с площадями (их даёт Планировка) — иначе остаётся ручной ввод с подсказкой */
  function openPlanWindow(focus) {
    if (!S.planUpload) { S.ui.toast('Загрузка плана сейчас недоступна — впишите площади вручную', 'error'); return; }
    S.planUpload.open({ entry: 'budget', onDone: function () { applyPlan(); focusAfter = focus; render(); } });
  }
  function applyPlan() {
    var p = S.repair && S.repair.get().plan; if (!p) return;
    var rooms = (p.rooms || []).filter(function (r) { return Number(r.m2) > 0; });
    st.planFile = p.file || null; st.planLevel = p.level || null;
    if (rooms.length) {
      st.plan = { mode: 'plan', fileName: p.file || null, meta: null, rooms: rooms.map(function (r) { return { id: 'n' + (++roomSeq), name: r.name || 'Помещение', area: Math.round(Number(r.m2) * 10) / 10 }; }) };
      S.ui.toast('Нашли ' + rooms.length + ' ' + pl(rooms.length, ['помещение', 'помещения', 'помещений']) + ' · ' + F.area(totalArea()) + '. Проверьте площади.', 'ok');
    } else if (!st.plan || st.plan.mode !== 'manual') {
      st.plan = { mode: 'manual', fileName: null, meta: null, rooms: [ { id: 'n' + (++roomSeq), name: 'Вся квартира', area: null } ] };
    }
    touch();
  }
  function stopVis() { if (visRecog && visRecog.timer) clearTimeout(visRecog.timer); visRecog = null; }
  function onVisFiles(list) {
    var files = Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name || ''); }).slice(0, 12);
    if (!files.length) { S.ui.toast('Нужны картинки: JPG, PNG или WEBP', 'error'); return; }
    var meta = files.map(function (f) { return { name: String(f.name || 'картинка').slice(0, 80), size: f.size || 0 }; });
    stopVis(); visRecog = { stage: 0, files: meta, timer: null }; focusAfter = '[data-own="visuals"]'; render();
    (function tick() {
      visRecog.timer = setTimeout(function () {
        if (!visRecog) return;
        visRecog.stage += 1;
        if (visRecog.stage < VIS_STAGES.length) { render(); tick(); return; }
        st.visuals = { files: visRecog.files, items: composeVisuals(visRecog.files) };
        st.source = 'visuals'; visRecog = null; touch(); syncUrl(); focusAfter = '[data-own="visuals"]'; render();
        S.ui.toast('Подобрали ' + st.visuals.items.length + ' ' + pl(st.visuals.items.length, ['товар', 'товара', 'товаров']) + ' по вашим картинкам — капсула не нужна', 'ok');
      }, 900);
    })();
  }
  /* счёт для расчёта по картинкам: правила те же, что у капсул SOVEAPP (первый бесплатно, дальше — METOD) */
  function viewInvoiceVis() {
    var a = S.scout.access(accessParams()), s0 = byId(SC.states, st.stateId), payable = isPayable(a), n = st.visuals.items.length;
    var metodHref = 'metod.html?returnTo=' + encodeURIComponent(here());
    var title = payable ? 'Откройте расчёт по вашим картинкам' : 'Расчёт по картинкам — с подпиской METOD';
    var text = 'Первый бесплатный расчёт уже использован. Расчёты по картинкам, как и по капсулам SOVEAPP, бесплатны с подпиской METOD. Параметры мы сохранили — после оформления сразу покажем расчёт.';
    var main = payable ? '<button type="button" class="btn btn--primary btn--lg scout-invoice__pay" data-act="pay">Оплатить ' + F.rub(a.price) + ' и получить расчёт</button>'
      : '<a class="btn btn--primary btn--lg scout-invoice__pay" href="' + esc(metodHref) + '">Оформить METOD</a>';
    return '<div class="scout-step scout-step--invoice">' + stepHead(title, text) +
      '<div class="split"><div class="col-7 card card--pad stack stack--6 scout-invoice">' +
        '<div class="row row--between scout-invoice__top"><span class="eyebrow">' + (payable ? 'Счёт · открытие расчёта' : 'Расчёт по счёту недоступен') + '</span><span class="badge badge--line">шаг «Результат» закрыт</span></div>' +
        '<div class="rows rows--tight"><div><span>Подборка по картинкам</span><span class="num">' + n + ' ' + pl(n, ['товар', 'товара', 'товаров']) + '</span></div><div><span>Площадь</span><span class="num">' + F.area(totalArea()) + '</span></div><div><span>Состояние</span><span>' + esc(s0 ? s0.name : '') + '</span></div></div>' +
        '<div class="scout-invoice__actions">' + main + '<button type="button" class="btn btn--link" data-act="ungate">Назад к параметрам</button></div>' +
      '</div></div>' +
      '<div class="scout-bar scout-bar--result"><div class="scout-bar__in">' + (payable ? '<button type="button" class="btn btn--primary" data-act="pay">Оплатить ' + F.rub(a.price) + '</button>' : '<a class="btn btn--primary" href="' + esc(metodHref) + '">Оформить METOD</a>') + '</div></div></div>';
  }
  /* результат по картинкам: шапка и строки подборки */
  function resCapHtml(r) {
    var c = r.capsule;
    if (c) return '<div class="scout-res__cap"><img src="' + c.cover + '" alt="Капсула «' + esc(c.name) + '»" width="72" height="90"><div class="stack stack--2"><span class="eyebrow">Капсула</span><span class="scout-res__capname">' + esc(c.name) + '</span></div></div>';
    var first = r.visuals[0] && r.visuals[0].p, n = r.visuals.length;
    return '<div class="scout-res__cap">' + (first ? '<img src="' + first.img + '" alt="" width="72" height="90">' : '') + '<div class="stack stack--2"><span class="eyebrow">По вашим картинкам</span><span class="scout-res__capname">Подборка из каталога · ' + n + ' ' + pl(n, ['товар', 'товара', 'товаров']) + '</span></div></div>';
  }
  function visLinesHtml(r) {
    return r.visuals.map(function (l) {
      var q = (l.qty > 1 || l.perM2) ? ' <span class="muted num">× ' + l.qty + (l.perM2 ? ' м²' : ' шт.') + '</span>' : '';
      return '<li class="scout-line scout-line--kit"><span class="scout-line__name"><a class="link" href="product.html?id=' + l.p.id + '">' + esc(l.p.name) + '</a>' + q + '</span><span class="scout-line__pct"></span><span class="scout-line__retail num strike muted">' + F.rub(l.retail) + '</span><span class="scout-line__sum num green">' + F.rub(l.metod) + '</span></li>';
    }).join('');
  }

  /* ---------- шаг 1: капсула и уровень ---------- */
  /* карточки по макету Вики 23.10: широкий кадр, название, стиль, палитра, цена за м²; фильтр по тегам капсул (data.js); без кодов К1–К7 (Алина 26.10) */
  var CAP_FILTERS = [{ id: 'all', t: 'Все' }, { id: 'light', t: 'Светлые' }, { id: 'modern', t: 'Современные' }, { id: 'warm', t: 'Тёплые' }, { id: 'classic', t: 'Классика' }];
  var capFilter = 'all';
  function viewCapsule() {
    var shown = D.capsules.filter(function (c) { return capFilter === 'all' || (c.tags || []).indexOf(capFilter) >= 0 || c.id === st.capsuleId; });
    var caps = shown.map(function (c) {
      var on = !isVis() && c.id === st.capsuleId, off = !!c.soon || !c.pricePerM2;
      return '<button type="button" class="scout-cap' + (on ? ' is-active' : '') + '" data-capsule="' + c.id + '" aria-pressed="' + on + '"' + (off ? ' disabled' : '') + '>' +
        '<span class="scout-cap__pic"><img src="' + (c.wide || c.cover) + '"' + (c.wide && c.widePos ? ' style="object-position:' + c.widePos + '"' : '') + ' alt="Капсула «' + esc(c.name) + '»: ' + esc(c.style.toLowerCase()) + '" loading="lazy" width="560" height="430"><span class="scout-cap__check">' + ICON.check + '</span></span>' +
        '<span class="scout-cap__body"><span class="scout-cap__name">' + esc(c.name) + '</span><span class="scout-cap__style">' + esc(c.style) + '</span>' +
        '<span class="scout-cap__foot"><span class="scout-cap__dots" aria-hidden="true">' + (c.palette || []).map(function (h) { return '<i style="background:' + h + '"></i>'; }).join('') + '</span>' +
        (off ? '<span class="badge badge--line scout-cap__soon">скоро</span>' : '<span class="scout-cap__price num">от <b>' + F.num(c.pricePerM2) + '</b>\u00a0₽/м²</span>') + '</span></span></button>';
    }).join('');
    var filters = '<div class="scout-filt" role="group" aria-label="Фильтр капсул">' + CAP_FILTERS.map(function (f) {
      var on = f.id === capFilter;
      return '<button type="button" class="scout-filt__b' + (on ? ' is-on' : '') + '" data-cap-filter="' + f.id + '" aria-pressed="' + on + '">' + esc(f.t) + '</button>';
    }).join('') + '</div>';
    var cur = okCapsule(st.capsuleId);
    var INFO_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';
    var levels = LEVELS.map(function (l) {
      var on = l.id === st.level;
      /* значок «Что входит» — отдельная кнопка рядом с карточкой (кнопка в кнопке недопустима) */
      return '<div class="scout-level"><button type="button" class="option' + (on ? ' is-active' : '') + '" data-level="' + l.id + '" aria-pressed="' + on + '">' +
        '<span class="option__title">' + esc(l.name) + '</span><span class="option__note">' + esc(l.note) + '</span></button>' +
        '<button type="button" class="scout-level__info" data-cls-open="' + l.id + '" aria-label="Что входит в ' + esc(l.name) + '">' + INFO_IC + '<span>Что входит</span></button></div>';
    }).join('');
    var vis = isVis();
    return '<div class="scout-step">' +
      stepHead('Выберите капсулу', vis ? 'Сейчас считаем по вашим картинкам. Нажмите на капсулу, чтобы считать по ней.' : 'Капсула задаёт комплектацию: отделку, мебель, свет и сантехнику. Цена — за квадратный метр по ценам METOD.') +
      srcHtml() + filters +
      '<div class="scout-caps' + (vis ? ' is-muted' : '') + '">' + caps + '</div>' +
      (vis ? '<div class="stack scout-block">' + pairLine() + '</div>'
        : '<div class="stack scout-block"><h3 class="h4">Тип ремонта</h3><div class="scout-levels">' + levels + '</div><button type="button" class="arrow-link scout-cls-link" data-classifier="1">Что входит в Базовый и Премиум</button>' + pairLine() + '</div>') +
      bar() + '</div>';
  }

  /* ---------- шаг 2: состояние ---------- */
  var stateOpen = false;   /* список состояний раскрыт */
  function viewState() {
    var opts = SC.states.map(function (s) {
      var on = s.id === st.stateId;
      return '<button type="button" class="option scout-state' + (on ? ' is-active' : '') + '" data-state="' + s.id + '" aria-pressed="' + on + '">' +
        '<span class="scout-state__main"><span class="option__title">' + esc(s.name) + '</span><span class="option__note">' + esc(s.note) + '</span></span>' +
        '<span class="scout-state__rate"><span class="mid-num num">' + F.rub(s.rate) + '/м²</span>' + (s.estimate ? '<span class="badge badge--line">предварительный</span>' : '') + '</span></button>';
    }).join('');
    /* свёрнуто (Алина 27.10): состояние выбрано — одна строка «Бетон · 60 000 ₽/м² · изменить», список — по тапу;
       у предварительной ставки и в свёрнутой строке значок «предварительный», сноска — только когда значок виден */
    var one = st.stateId && !stateOpen ? byId(SC.states, st.stateId) : null;
    var hasEst = one ? !!one.estimate : SC.states.some(function (s) { return s.estimate; });
    /* один заголовок шага (Вика 22.10: верхний дубль «Что сейчас в квартире» убран); пояснение — под ним */
    return '<section class="stack stack--4 scout-sub"><div class="stack stack--2"><h2 class="h3" id="scout-h" tabindex="-1">Что сейчас в квартире</h2>' +
      '<p class="text">Ставка работ бригады зависит от состояния стен — независимо от капсулы и уровня.</p></div>' +
      (one ? '<button type="button" class="option scout-state is-active scout-state--one" data-state-open aria-expanded="false">' +
        '<span class="scout-state__main"><span class="option__title">' + esc(one.name) + '</span><span class="option__note">' + esc(one.note) + '</span></span>' +
        '<span class="scout-state__rate"><span class="mid-num num">' + F.rub(one.rate) + '/м²</span>' + (one.estimate ? '<span class="badge badge--line">предварительный</span>' : '') + '<span class="scout-state__ch">изменить ›</span></span></button>'
        : '<div class="scout-states">' + opts + '</div>') +
      (hasEst ? '<p class="small muted scout-foot">«Предварительный» — ставку работ команда SOVEAPP ещё уточняет.</p>' : '') + '</section>';
  }

  /* ---------- шаг 3: планировка ---------- */
  function roomsEditor() {
    var rooms = st.plan.rooms;
    var rows = rooms.map(function (r) {
      var val = r.raw != null ? r.raw : (r.area ? String(r.area).replace('.', ',') : '');
      return '<div class="scout-room' + (r.bad ? ' is-bad' : '') + '" data-room="' + r.id + '">' +
        '<label class="scout-vh" for="rn-' + r.id + '">Название помещения</label><input class="input" id="rn-' + r.id + '" data-room-name type="text" maxlength="40" autocomplete="off" placeholder="Название" value="' + esc(r.name) + '">' +
        '<label class="scout-vh" for="ra-' + r.id + '">Площадь, м²</label><input class="input input--num" id="ra-' + r.id + '" data-room-area type="text" inputmode="decimal" maxlength="6" autocomplete="off" placeholder="0" value="' + esc(val) + '">' +
        '<button type="button" class="scout-room__del" data-act="del-room" aria-label="Удалить помещение' + (r.name ? ' «' + esc(r.name) + '»' : '') + '"' + (rooms.length < 2 ? ' disabled' : '') + '>' + ICON.close + '</button></div>';
    }).join('');
    return '<div class="scout-rooms">' +
      '<div class="scout-rooms__head tiny muted"><span>Помещение</span><span class="right">Площадь, м²</span><span></span></div>' + rows +
      '<p class="field__error" id="scout-area-err"' + (rooms.some(function (r) { return r.bad; }) ? '' : ' hidden') + '>Площадь — число от 0,1 до ' + MAX_ROOM + ', например 12,5.</p>' +
      '<div class="scout-rooms__foot"><button type="button" class="btn btn--link" data-act="add-room">Добавить помещение</button>' +
      '<div class="scout-rooms__total"><span class="eyebrow">Общая площадь</span><span class="mid-num num" id="scout-total">' + F.area(totalArea()) + '</span></div></div>' +
      '<p class="tiny muted scout-rooms__note" id="scout-breakdown"' + (breakdownHtml() ? '' : ' hidden') + '>' + breakdownHtml() + '</p></div>';
  }
  function viewPlan() {
    /* Вика 23.10: план загружают в самом начале (шаг 1), здесь загрузки нет — только площади.
       Из Интерьера («Досчитать весь бюджет») шаг 1 пропускается — там, как у Алины, загрузка плана, пример или площади вручную */
    if (!st.plan && !st.fromInterior) st.plan = { mode: 'manual', fileName: null, meta: null, rooms: [ { id: 'n' + (++roomSeq), name: 'Вся квартира', area: null } ] };
    var fromPlan = st.plan && st.plan.mode === 'plan';
    var head = '<div class="stack stack--2"><h3 class="h3">Площадь квартиры</h3><p class="text">' + (fromPlan ? 'Площади — из комнат вашего плана: проверьте и поправьте.' : !st.plan ? 'Загрузите план — он сохранится в Мой ремонт, комнаты распознает Планировка. Плана под рукой нет — впишите площадь вручную.' : 'Впишите площадь квартиры. Помещения можно добавить для точности.') + '</p></div>';
    var body;
    if (!st.plan) {
      body = '<div class="split"><div class="col-8 stack">' +
        '<button type="button" class="uploader scout-up" data-act="upload">' + ICON.plan +
        '<span class="uploader__title">Загрузить план квартиры</span><span class="small muted">план застройщика, обмерный или дизайн-проект · JPG, PNG или PDF</span></button>' +
        '<div class="row scout-plan-alt"><button type="button" class="btn btn--link" data-act="manual">Ввести площади вручную</button></div>' +
        '</div>' + planAside() + '</div>';
    } else {
      var p = st.plan, manual = p.mode === 'manual', RP = S.repair && S.repair.get().plan, lvl = S.repair && st.planLevel ? (S.repair.LEVEL[st.planLevel] || '') : '';
      var src = fromPlan ? 'План: ' + esc(p.fileName || 'из Моего ремонта') : 'Площади введены вручную';
      /* из Интерьера шага 1 нет — план загружают и меняют здесь (как у Алины) */
      var top = st.fromInterior ? '<div class="row row--between scout-plan-src"><span class="small"><b>' + src + '</b></span><button type="button" class="btn btn--link" data-act="' + (manual ? 'upload' : 'reset-plan') + '">' + (manual ? 'Загрузить планировку' : 'Заменить планировку') + '</button></div>'
        : manual ? '' : '<div class="row row--between scout-plan-src"><span class="small"><b>' + src + '</b></span><button type="button" class="btn btn--link" data-step-go="1">Заменить на шаге 1</button></div>';
      /* план сохранён, но комнат в нём ещё нет — ручной ввод и подсказка, откуда возьмутся комнаты */
      var note = manual && st.planFile ? '<div class="notice scout-plan-note"><span class="small">План «' + esc(st.planFile) + '» сохранён в Мой ремонт. Комнаты появятся после распознавания в Планировке.</span><a class="arrow-link" href="plan-demo.html?from=budget">Распознать ›</a></div>' : '';
      if (manual) {
        /* Вика 22.10: блок «Где взять площади» убран; вместо «посчитаем на замере» — «не входят в расчёт» */
        body = top + note + '<div class="split"><div class="col-7 stack stack--3">' + roomsEditor() + '<p class="small muted">Двери и окна не входят в расчёт.</p></div></div>';
      } else {
        var pic = RP && RP.img ? '<figure class="col-7 stack stack--3"><div class="card scout-plan scout-plan--img"><img src="' + esc(RP.img) + '" alt="План квартиры"></div>' +
          '<figcaption class="small muted">Из Моего ремонта' + (lvl ? ' · ' + esc(lvl) : '') + '</figcaption></figure>' : '';
        body = top + '<div class="split scout-plan-grid">' + pic +
          '<div class="col-' + (pic ? '5' : '7') + ' stack"><h3 class="h4">Помещения</h3><p class="small muted">Комнаты и площади — из Планировки. Проверьте: их можно поправить, лишнее удалить, недостающее добавить.</p>' + roomsEditor() + '</div></div>';
      }
    }
    return '<section class="stack stack--4 scout-sub">' + head + body + '</section>';
  }
  function viewStateStep() {
    return '<div class="scout-step stack stack--10">' + viewState() + bar() + '</div>';
  }
  function viewPlanStep() {
    return '<div class="scout-step stack stack--10">' + stepHead('Параметры объекта', st.plan && st.plan.mode === 'plan' ? 'Площади — из комнат вашего плана в Моём ремонте.'
      : st.fromInterior && !st.plan ? 'Загрузите план — комнаты распознает Планировка. Или введите площади вручную.' : 'Площадь квартиры и помещений — от неё считаем работы и комплектацию.') +
      viewPlan() + bar() + '</div>';
  }

  function planAside() {
    return '<aside class="col-4 rule-top stack stack--3 scout-aside"><h3 class="h4">Что возьмём из плана</h3>' +
      '<ul class="stack stack--2 small muted scout-ticks"><li>Помещения и их площади</li><li>Количество санузлов, дверей и окон</li><li>Общую площадь для сметы</li></ul>' +
      '<p class="small muted">Результат можно поправить вручную перед расчётом.</p></aside>';
  }

  /* ---------- шаг 4: формат ---------- */
  function viewFormat() {
    var opts = SC.formats.map(function (f) {
      var on = f.id === st.formatId;
      return '<button type="button" class="option scout-format' + (on ? ' is-active' : '') + '" data-format="' + f.id + '" aria-pressed="' + on + '"><span class="option__title">' + esc(f.name) + '</span><span class="option__note">' + esc(f.note) + '</span></button>';
    }).join('');
    return '<div class="scout-step">' +
      stepHead('Как будете делать ремонт?', 'Сумма от этого не меняется — подскажем подходящий следующий шаг.') +
      '<div class="scout-formats">' + opts + '</div>' + bar() + '</div>';
  }

  /* ---------- счёт вместо результата: пара «капсула + тип ремонта» ещё не открыта ---------- */
  function viewInvoice() {
    if (isVis()) return viewInvoiceVis();
    var a = S.scout.access(accessParams()), c = D.capsule(st.capsuleId), lv = byId(LEVELS, st.level), s = byId(SC.states, st.stateId);
    var payable = isPayable(a), recalc = a.kind === 'recalc-paid', soveCap = (c.type || 'sove') === 'sove';
    var def = (D.scoutAccess.defaults[c.type || 'sove'] || {});
    var metodHref = 'metod.html?returnTo=' + encodeURIComponent(here());
    var title = !payable ? 'Цена для этой капсулы не задана' : recalc ? 'Пересчёт по капсуле «' + esc(c.name) + '» — по счёту' : 'Откройте расчёт по капсуле «' + esc(c.name) + '»';
    var text = !payable ? 'Открыть расчёт по капсуле «' + esc(c.name) + '»' + ' за оплату пока нельзя: цена уточняется. Параметры мы сохранили.'
      : (soveCap ? 'Первый бесплатный расчёт уже использован. ' : 'Расчёты по дизайнерским капсулам открываются по счёту. ') +
        'Пара «капсула + тип ремонта» открывается один раз' + (def.recalc ? '.' : ' — дальше пересчёты по ней бесплатны.') + ' Параметры вводить заново не нужно: расчёт покажем сразу после оплаты.';
    var payLabel = payable ? 'Оплатить ' + F.rub(a.price) + ' и получить расчёт' : '';
    var main = payable
      ? '<button type="button" class="btn btn--primary btn--lg scout-invoice__pay" data-act="pay">' + payLabel + '</button>'
      : '<a class="btn btn--primary btn--lg scout-invoice__pay" href="' + esc(metodHref) + '">Оформить METOD</a>';
    var showMetod = soveCap && !S.metod.active();
    return '<div class="scout-step scout-step--invoice">' +
      stepHead(title, text) +
      '<div class="split">' +
        '<div class="col-7 card card--pad stack stack--6 scout-invoice">' +
          '<div class="row row--between scout-invoice__top"><span class="eyebrow">' + (payable ? 'Счёт · ' + (recalc ? 'пересчёт' : 'открытие расчёта') : 'Расчёт по счёту недоступен') + '</span><span class="badge badge--line">шаг «Результат» закрыт</span></div>' +
          '<div class="scout-invoice__cap"><img src="' + c.cover + '" alt="Капсула «' + esc(c.name) + '»" width="72" height="90"><div class="stack stack--2"><span class="eyebrow">Что открывается</span><span class="h4">' + esc(c.name) + '</span><span class="small muted">' + esc(lv.name) + '</span></div></div>' +
          '<div class="rows rows--tight"><div><span>Тип ремонта</span><span>' + esc(lv.name) + '</span></div><div><span>Площадь</span><span class="num">' + F.area(totalArea()) + '</span></div><div><span>Состояние</span><span>' + esc(s.name) + '</span></div></div>' +
          (payable
            ? '<div class="scout-invoice__sum"><span class="small muted">К оплате</span><span class="row scout-invoice__price"><span class="mid-num num">' + F.rub(a.price) + '</span>' + (exampleMark() ? '<span class="badge badge--line">пример цены</span>' : '') + '</span></div>' +
              '<p class="small muted">Оплата рублями по счёту. Токены не списываются.</p>'
            : '<p class="small muted">' + (soveCap ? 'По подписке METOD расчёты по капсулам SOVEAPP бесплатны — цена открытия для них не нужна.' : 'Как только цена появится, расчёт можно будет открыть по счёту.') + '</p>') +
          (payError ? '<div class="notice notice--error" role="alert"><span class="small">' + esc(payError) + '</span></div>' : '') +
          '<div class="scout-invoice__actions">' + main + '<button type="button" class="btn btn--link" data-act="ungate">Назад к параметрам</button></div>' +
        '</div>' +
        (showMetod && payable ? '<aside class="col-5 rule-top stack stack--3 scout-aside"><h3 class="h4">Или оформите METOD — расчёты по капсулам SOVEAPP бесплатны</h3>' +
          '<p class="small muted">С подпиской открываются цены METOD, контакты поставщиков и полная смета по позициям. После оформления вернём вас сюда и сразу покажем расчёт.</p>' +
          '<a class="arrow-link" href="' + esc(metodHref) + '">Перейти к METOD</a></aside>' : '') +
      '</div>' +
      '<div class="scout-bar scout-bar--result"><div class="scout-bar__in">' + (payable
        ? '<button type="button" class="btn btn--primary" data-act="pay">' + payLabel + '</button>'
        : '<a class="btn btn--primary" href="' + esc(metodHref) + '">Оформить METOD</a>') + '</div></div>' +
      '</div>';
  }

  /* ---------- шаг 5: результат ---------- */
  function targetProjectId() { return st.savedProjectId || (project ? project.id : null); }
  /* ТЗ «Мой ремонт» 22.10: бюджет квартиры — один, новое сохранение спрашивает «Заменить текущий бюджет?» */
  function repairButton() {
    if (!S.repair || !(st.step === 5 && valid(5))) return '';
    var r = calc();
    /* экран Бюджета без Планировки строит 9 + 5 и «По комнатам» из этого сохранения (my-budget.js, fromSaved): состояние, комнаты и разбивка — вместе с итогами */
    return S.repair.saveButton('budget', { type: st.level === 'premium' ? 'premium' : 'base', capsuleId: st.capsuleId, stateId: st.stateId, area: r.area, works: r.works, kitMetod: r.kitMetod, kitRetail: r.kitRetail, total: r.total,
      rooms: st.plan ? st.plan.rooms.filter(function (x) { return x.area > 0; }).map(function (x) { return { name: x.name, m2: x.area }; }) : [], byRooms: byRoomsData(r) }, 'Сохранить в Мой ремонт', 'btn btn--primary scout-save');
  }
  function saveButton() {
    /* пришли из Бюджета — расчёт уже в бюджете квартиры, возвращаем туда */
    if (st.fromInterior && st.step === 5 && valid(5)) return '<a class="btn btn--primary scout-save" href="my.html?v=budget">Открыть бюджет</a>';
    if (S.repair && st.step === 5 && valid(5)) return repairButton();
    if (st.savedProjectId && S.projects.get(st.savedProjectId)) return '<a class="btn btn--primary scout-save" href="project.html?id=' + encodeURIComponent(st.savedProjectId) + '">Открыть проект</a>';
    return '<button type="button" class="btn btn--primary scout-save" data-act="save">Сохранить в проект</button>';
  }
  /* ---------- «По комнатам» (созвон 28.10): бюджет по комнатам шага 3 в одном стиле, суммы сходятся с r.works и r.kitMetod ----------
     Разбивка — SOVE_BUDGET.byRooms (budget.js): категории — по применимости к зоне (сантехника — санузел и кухня, техника — кухня,
     двери — поровну, остальное — по площади), «Вся квартира» отдельно не показываем — её остаток уходит по комнатам пропорционально.
     Комнат нет — типовые зоны по площади с пометкой. Те же данные уходят в паспорт квартиры (rp.scoutParams.byRooms) для экрана Бюджета. */
  function roomsSplit(r) {
    var B = window.SOVE_BUDGET; if (!B || !B.byRooms || !(r.area > 0)) return null;
    var rooms = st.plan ? st.plan.rooms.filter(function (x) { return typeof x.area === 'number' && x.area > 0 && !isWhole(x); }).map(function (x) { return { name: x.name || 'Помещение', area: x.area }; }) : [];
    var cats = r.visuals ? [{ key: 'visuals', title: 'Подборка по вашим картинкам', sum: r.kitMetod }]
      : SC.kitShares.map(function (k) { return { key: B.kitKey(k[0]) || k[0], title: k[0], sum: r.kitMetod * k[1] / 100 }; });
    return B.byRooms({ rooms: rooms, area: r.area, works: r.works, cats: cats });
  }
  function byRoomsData(r) {
    var o = roomsSplit(r); if (!o) return null;
    return o.rooms.map(function (x) { return { name: x.name, zone: x.zone, area: x.area, works: x.works, kit: x.kit, total: x.total, byCat: x.byCat, typical: o.typical || undefined }; });
  }
  function roomsHtml(r) {
    var o = roomsSplit(r); if (!o || !o.rooms.length) return '';
    var titles = {}; (r.visuals ? [] : SC.kitShares).forEach(function (k) { titles[window.SOVE_BUDGET.kitKey(k[0]) || k[0]] = k[0]; }); titles.visuals = 'Подборка по вашим картинкам';
    var n = o.rooms.length;
    var rows = o.rooms.map(function (x, i) {
      var cats = Object.keys(x.byCat).filter(function (k) { return x.byCat[k] > 0; }).map(function (k) {
        return '<li class="rb-cat"><span class="rb-cat__n">' + esc(titles[k] || k) + '</span><b class="rb-cat__v num">' + F.rub(x.byCat[k]) + '</b></li>';
      }).join('');
      return '<li class="rb-room">' +
        '<button type="button" class="rb-room__row rb-grid" data-room-toggle aria-expanded="false" aria-controls="rb-cats-' + i + '">' +
          '<span class="rb-room__name"><b>' + esc(x.name) + '</b><small class="muted">' + esc(x.zoneName.toLowerCase()) + ' · <span class="num">' + F.area(x.area) + '</span></small></span>' +
          '<span class="rb-room__vals"><span class="rb-room__v"><small class="muted">Работы</small><b class="num">' + F.rub(x.works) + '</b></span>' +
          '<span class="rb-room__v"><small class="muted">Материалы и комплектация</small><b class="num">' + F.rub(x.kit) + '</b></span>' +
          '<span class="rb-room__v rb-room__v--t"><small class="muted">Итого</small><b class="num">' + F.rub(x.total) + '</b></span></span>' +
          '<span class="rb-room__ch" aria-hidden="true">▾</span>' +
        '</button>' +
        '<ul class="rb-cats" id="rb-cats-' + i + '" hidden>' + (cats || '<li class="rb-cat"><span class="rb-cat__n muted">Комплектации в этой комнате нет</span></li>') +
          '<li class="rb-cat rb-cat--sum"><span class="rb-cat__n">Комплектация комнаты</span><b class="rb-cat__v num">' + F.rub(x.kit) + '</b></li></ul>' +
      '</li>';
    }).join('');
    return '<section class="stack scout-rooms-b" aria-labelledby="scout-rooms-t">' +
      '<div class="scout-detail__head"><h3 class="h3" id="scout-rooms-t">По комнатам</h3><span class="small muted">' + n + ' ' + pl(n, ['комната', 'комнаты', 'комнат']) + ' · один стиль</span></div>' +
      (o.typical ? '<p class="small muted rb-note">Типовые зоны · загрузите план, чтобы считать точно.</p>' : '<p class="small muted rb-note">Нажмите на комнату — покажем комплектацию по категориям.</p>') +
      '<div class="rb-head rb-grid" aria-hidden="true"><span>Комната</span><span class="rb-room__vals"><span>Работы</span><span>Материалы и комплектация</span><span>Итого</span></span><span></span></div>' +
      '<ul class="rb-list">' + rows + '</ul>' +
      '<div class="rb-sum rb-grid"><span class="rb-room__name"><b>Вся квартира</b><small class="muted num">' + F.area(r.area) + '</small></span>' +
        '<span class="rb-room__vals"><span class="rb-room__v"><small class="muted">Работы</small><b class="num">' + F.rub(o.works) + '</b></span>' +
        '<span class="rb-room__v"><small class="muted">Материалы и комплектация</small><b class="num">' + F.rub(o.kit) + '</b></span>' +
        '<span class="rb-room__v rb-room__v--t"><small class="muted">Итого</small><b class="num">' + F.rub(o.total) + '</b></span></span><span></span></div>' +
    '</section>';
  }
  function viewResult() {
    var r = calc(), c = r.capsule, rq = issuedRequest();
    /* цифры берём из заявки Расчёт бюджета: повторный расчёт показывает ровно то, что было выдано */
    if (rq && rq.result && rq.result.total > 0 && rq.result.area === r.area) {
      r.works = rq.result.works; r.kitMetod = rq.result.kitMetod; r.kitRetail = rq.result.kitRetail; r.total = rq.result.total;
      r.perM2 = r.total / r.area; r.save = r.kitRetail - r.kitMetod; r.savePct = Math.round(r.save / r.kitRetail * 100);
    }
    var reqLine = rq ? '<p class="small scout-req"><b class="num">Заявка на расчёт № ' + rq.number + '</b><br>основание: ' + esc(S.scout.basisLabel(rq.basis)) + ', <span class="muted" style="white-space:nowrap">' + esc(F.dateLong(rq.ts)) + '</span></p>' : '';
    var premiumNote = (r.level.sameAsBase && !r.visuals) ? '<div class="notice"><span class="small">В прототипе сумма для Премиума посчитана как для Базового — данные калькулятора подключаются на сервере.</span></div>' : '';
    var savedPr = st.savedProjectId ? S.projects.get(st.savedProjectId) : null;
    var pid = targetProjectId();
    var tail = c ? '?capsule=' + c.id + (pid ? '&project=' + encodeURIComponent(pid) : '') : (pid ? '?project=' + encodeURIComponent(pid) : '');

    /* по плану — суммы этапов из позиций Scout; без плана — доли ставки за м² */
    var stageRows = r.plan ? r.plan.stages.filter(function (s) { return s[1] > 0; }).map(function (s) { return [s[0], Math.round(s[1] / r.works * 100), s[1]]; })
      : SC.stages.map(function (s) { return [s[0], s[1], r.works * s[1] / 100]; });
    var stages = stageRows.map(function (s) {
      return '<li class="scout-line scout-line--stage"><span class="scout-line__name">' + esc(s[0]) + '</span><span class="bar" aria-hidden="true"><i style="width:' + s[1] + '%"></i></span><span class="scout-line__pct num muted">' + s[1] + ' %</span><span class="scout-line__sum num">' + F.rub(s[2]) + '</span></li>';
    }).join('');
    var V = st.volumes, planWorksHtml = r.plan ? '<details class="scout-plan"><summary>Работы по вашему плану · ' + r.plan.lines.length + ' позиций</summary>' +
      '<p class="tiny muted">По комнатам плана: стены ' + F.area(V.walls) + ' за вычетом дверей и окон, пол ' + F.area(V.floor_dry) + ', санузлы ' + F.area(V.walls_bath) + ' стен, плинтус ' + String(V.plinth_m).replace('.', ',') + ' м, потолки ' + String(V.h).replace('.', ',') + ' м. Расценки — Scout на ' + esc((r.plan.date || '').split('-').reverse().join('.')) + '.</p>' +
      '<ul class="scout-plan__list">' + r.plan.lines.map(function (l) {
        return '<li><span>' + esc(l.work) + '<small class="num">' + String(l.qty).replace('.', ',') + ' ' + esc(l.unit) + ' × ' + F.rub(l.price) + '</small></span><b class="num">' + F.rub(l.sum) + '</b></li>';
      }).join('') + '</ul></details>' : '';
    var kit = r.visuals ? visLinesHtml(r) : SC.kitShares.map(function (k) {
      return '<li class="scout-line scout-line--kit"><span class="scout-line__name">' + esc(k[0]) + '</span><span class="scout-line__pct num muted">' + k[1] + ' %</span><span class="scout-line__retail num strike muted">' + F.rub(r.kitRetail * k[1] / 100) + '</span><span class="scout-line__sum num green">' + F.rub(r.kitMetod * k[1] / 100) + '</span></li>';
    }).join('');

    var adeptFrom = Math.min.apply(null, D.adept.packages.map(function (p) { return p.rate; }));
    var cards = {
      adept: '<a class="card card--pad card--link scout-next" href="adept.html' + tail + '"><span class="row row--between"><span class="eyebrow">Дизайн-проект</span>' + (st.formatId === 'adept' ? '<span class="badge badge--line">ваш формат</span>' : '') + '</span>' +
        '<h3 class="h3">' + (c ? 'Адаптируем «' + esc(c.name) + '» под вашу квартиру' : 'Соберём дизайн-проект по вашим картинкам') + '</h3><p class="small muted grow">' + (c ? 'Дизайнер переложит капсулу на вашу планировку' : 'Дизайнер разложит подборку по вашей планировке') + ': расстановка, визуализации, чертежи. Расчёт бюджета передадим вместе с заявкой. От <span class="num">' + F.rub(adeptFrom) + '/м²</span>.</p><span class="arrow-link">Перейти к дизайн-проекту</span></a>',
      track: '<a class="card card--pad card--link scout-next" href="track.html' + tail + '"><span class="row row--between"><span class="eyebrow">Ремонт под ключ</span>' + (st.formatId === 'track' ? '<span class="badge badge--line">ваш формат</span>' : '') + '</span>' +
        '<h3 class="h3">Сделаем ремонт по этому расчёту</h3><p class="small muted grow">Команда SOVEAPP ведёт работы по этапам из сметы. Акты, сроки и оплаты видны в личном кабинете.</p><span class="arrow-link">Перейти к ремонту под ключ</span></a>'
    };
    var order = st.formatId === 'track' ? ['track', 'adept'] : ['adept', 'track'];
    var nextLead = st.formatId === 'self' ? 'Вы делаете ремонт сами: сохраните расчёт — смета и список товаров останутся в кабинете. Если понадобится помощь, расчёт можно передать дальше.'
      : st.formatId === 'track' ? 'Вы выбрали ремонт под ключ — расчёт уйдёт в ремонт под ключ вместе с заявкой.' : 'Вы выбрали дизайн-проект — расчёт уйдёт в дизайн-проект вместе с заявкой.';

    return '<div class="scout-step scout-step--result">' +
      '<h2 class="scout-vh" id="scout-h" tabindex="-1">Результат расчёта</h2>' +
      (savedPr ? '<div class="notice notice--ok" role="status"><span class="small"><b>Расчёт сохранён в проект «' + esc(savedPr.name) + '».</b> Он появился в кабинете вместе с капсулой и площадью.</span><a class="btn btn--dark btn--sm" href="project.html?id=' + encodeURIComponent(savedPr.id) + '">Открыть проект</a></div>' : '') +
      reqLine + premiumNote +

      '<div class="dark scout-res">' +
        '<div class="scout-res__head">' +
          resCapHtml(r) +
          '<dl class="scout-res__meta"><div><dt class="eyebrow">' + (r.visuals ? 'Источник' : 'Тип ремонта') + '</dt><dd>' + (r.visuals ? 'ваши картинки' : esc(r.level.name)) + '</dd></div><div><dt class="eyebrow">Площадь</dt><dd class="num">' + F.area(r.area) + '</dd></div><div><dt class="eyebrow">Состояние</dt><dd>' + esc(r.state.name) + '</dd></div></dl>' +
        '</div>' +
        '<div class="scout-res__main">' +
          '<div class="stack stack--3"><span class="eyebrow">Ремонт с комплектацией</span><span class="big-num scout-res__total">' + F.rub(r.total) + '</span></div>' +
          '<div class="stack stack--3 scout-res__per"><span class="eyebrow">За квадратный метр</span><span class="mid-num">' + F.rub(r.perM2) + '</span></div>' +
        '</div>' +
        '<div class="dim" aria-hidden="true"><span>' + F.area(r.area) + '</span></div>' +
        '<div class="scout-res__parts">' +
          '<div class="stack stack--2"><span class="eyebrow">Работы</span><span class="mid-num">' + F.rub(r.works) + '</span><span class="small muted">' + (r.plan ? 'по вашему плану · <span class="num">' + F.rub(Math.round(r.works / r.area)) + '/м²</span>'
            : '<span class="num">' + F.rub(r.state.rate) + '/м²</span>' + (r.state.estimate ? ' · ставка предварительная' : '')) + '</span></div>' +
          '<div class="stack stack--2"><span class="eyebrow">Комплектация по ценам METOD</span><span class="mid-num">' + F.rub(r.kitMetod) + '</span><span class="small muted"><span class="num strike">' + F.rub(r.kitRetail) + '</span> в рознице</span></div>' +
          '<div class="stack stack--2"><span class="eyebrow">Экономия с METOD</span><span class="mid-num scout-res__save">' + F.rub(r.save) + '</span><span class="small muted num">−' + r.savePct + ' % к рознице</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="scout-actions">' + saveButton() +
        '<button type="button" class="btn btn--ghost" data-act="pdf">Скачать PDF</button>' +
        '<span class="small muted scout-actions__note">' + (S.auth.isIn() ? (project && !savedPr ? 'Сохраним в проект «' + esc(project.name) + '».' : '') : 'Для сохранения понадобится вход — расчёт не потеряется.') + '</span>' +
        '<button type="button" class="btn btn--link" data-act="edit">Изменить параметры</button>' +
      '</div>' +

      '<div class="split scout-detail">' +
        '<section class="col-6 stack" aria-labelledby="scout-stages-t"><div class="scout-detail__head"><h3 class="h3" id="scout-stages-t">Работы по этапам</h3></div>' +
          '<ol class="scout-lines">' + stages + '<li class="scout-line scout-line--sum"><span class="scout-line__name">Все работы</span><span class="scout-line__sum num">' + F.rub(r.works) + '</span></li></ol>' + planWorksHtml + '</section>' +
        '<section class="col-6 stack" aria-labelledby="scout-kit-t"><div class="scout-detail__head"><h3 class="h3" id="scout-kit-t">' + (c ? 'Комплектация по категориям' : 'Подборка по вашим картинкам') + '</h3>' + (c ? '<a class="arrow-link" href="market.html?capsule=' + c.id + '">Смотреть позиции капсулы</a>' : '<button type="button" class="arrow-link scout-cls-link" data-act="vis-to-my">Добавить в «Мой ремонт»</button>') + '</div>' +
          '<ul class="scout-lines">' + kit + '<li class="scout-line scout-line--kit scout-line--sum"><span class="scout-line__name">Вся комплектация</span><span class="scout-line__pct"></span><span class="scout-line__retail num strike muted">' + F.rub(r.kitRetail) + '</span><span class="scout-line__sum num green">' + F.rub(r.kitMetod) + '</span></li></ul>' +
          '<p class="tiny muted">Зачёркнута розничная цена, зелёным — цена METOD. ' + (S.metod.active() ? 'Ваша подписка METOD активна.' : 'Цены METOD действуют с подпиской.') + '</p>' +
          (S.metod.active() ? '' : '<p class="small scout-full">Полная смета по позициям с контактами поставщиков — <a class="link" href="metod.html?returnTo=' + encodeURIComponent(here()) + '">по подписке METOD</a>.</p>') + '</section>' +
      '</div>' +
      roomsHtml(r) +
      '<p class="small muted scout-disclaimer">Предварительный расчёт. Точная смета — после замера.</p>' +

      '<section class="stack stack--6 scout-nexts" aria-labelledby="scout-next-t"><div class="stack stack--3"><h2 class="h2" id="scout-next-t">Дальше</h2><p class="text">' + nextLead + '</p></div>' +
        '<div class="grid grid--2">' + cards[order[0]] + cards[order[1]] + '</div>' +
        '<div><button type="button" class="btn btn--link" data-act="restart">Начать новый расчёт</button></div></section>' +
      bar() + '</div>';
  }

  /* ---------- отрисовка ---------- */
  function render() {
    renderHead(); renderSteps();
    var note = restoredNote ? '<p class="small muted scout-restored">Вернули ваш незаконченный расчёт — продолжайте с того же места. <button type="button" class="btn btn--link" data-act="restart">Начать заново</button></p>' : '';
    var html = st.step === 1 ? viewCapsule() : st.step === 2 ? viewStateStep() : st.step === 3 ? viewPlanStep() : st.step === 4 ? (st.gate ? viewInvoice() : viewFormat()) : viewResult();
    stage.innerHTML = note + html;
    document.body.classList.toggle('scout-is-result', st.step === 5);
    if (focusAfter) { var el = stage.querySelector(focusAfter); if (el) { try { el.focus({ preventScroll: focusAfter === '#scout-h' }); } catch (e) { el.focus(); } } focusAfter = null; }
  }
  function go(n) {
    n = Math.min(Math.max(1, n), maxStep());
    if (visRecog) stopVis();
    st.step = n; st.gate = false; payError = ''; restoredNote = false;
    persist(); focusAfter = '#scout-h'; render();
    var top = document.getElementById('scout-head').getBoundingClientRect().top + window.pageYOffset;
    if (window.pageYOffset > top) window.scrollTo(0, top);
  }

  /* ---------- сохранение ---------- */
  function writeTo(id) {
    var r = calc(), pr = S.projects.get(id);
    if (!pr) { S.ui.toast('Проект не найден. Расчёт не сохранён — выберите другой проект.', 'error'); return; }
    var rooms = st.plan.rooms.filter(function (x) { return x.area > 0; }).map(function (x) { return { name: x.name || 'Помещение', area: x.area }; });
    S.projects.update(id, { capsuleId: r.capsule ? r.capsule.id : null, area: r.area,
      scout: { capsuleId: r.capsule ? r.capsule.id : null, source: r.visuals ? 'visuals' : 'capsule', items: r.visuals ? r.visuals.map(function (l) { return { id: l.p.id, qty: l.qty }; }) : null, level: st.level, stateId: st.stateId, formatId: st.formatId, area: r.area, rooms: rooms,
        works: Math.round(r.works), kitMetod: Math.round(r.kitMetod), kitRetail: Math.round(r.kitRetail), total: Math.round(r.total), requestNumber: (issuedRequest() || {}).number || null } });
    st.savedProjectId = id; st.pendingSave = 0; persist(); render();
    S.ui.toast('Расчёт сохранён в проект «' + pr.name + '»', 'ok');
  }
  function save() {
    if (!valid(3)) return;
    if (!S.auth.isIn()) { st.pendingSave = Date.now(); persist(); S.ui.needAuth('Войдите, чтобы сохранить расчёт', here()); return; }
    if (project) writeTo(project.id); else S.ui.pickProject(writeTo);
  }
  function restart() {
    S.ui.confirm({ title: 'Начать новый расчёт?', text: 'Очистим выбранные параметры и площади. Расчёты, уже сохранённые в проектах, останутся.', ok: 'Начать заново',
      onOk: function () { stopVis(); S.draft.clear('scout'); st = blank(); if (project) st.prefilledFrom = project.id; restoredNote = false; syncUrl(); focusAfter = '#scout-h'; render(); window.scrollTo(0, 0); } });
  }

  /* ---------- события ---------- */
  stepsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b || b.disabled) return;
    go(Number(b.getAttribute('data-step')));
  });
  stage.addEventListener('click', function (e) {
    var t = e.target.closest('button, a'); if (!t || t.disabled) return;
    var v;
    if ((v = t.getAttribute('data-step-go'))) { go(Number(v)); return; }
    if ((v = t.getAttribute('data-cap-filter'))) { capFilter = v; focusAfter = '[data-cap-filter="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-capsule'))) { if (okCapsule(v)) { st.capsuleId = v; st.source = 'capsule'; touch(); syncUrl(); focusAfter = '[data-capsule="' + v + '"]'; render(); } return; }
    if ((v = t.getAttribute('data-level'))) { st.level = v; touch(); focusAfter = '[data-level="' + v + '"]'; render(); return; }
    if (t.hasAttribute('data-state-open')) { stateOpen = true; render(); return; }
    if ((v = t.getAttribute('data-state'))) { st.stateId = v; stateOpen = false; touch(); focusAfter = '[data-state-open]'; render(); return; }
    if ((v = t.getAttribute('data-format'))) { st.formatId = v; touch(); focusAfter = '[data-format="' + v + '"]'; render(); return; }
    if (t.getAttribute('data-classifier')) { openClassifier(st.level); return; }
    if ((v = t.getAttribute('data-cls-open'))) { openClassifier(v); return; }
    if ((v = t.getAttribute('data-own'))) {
      if (v === 'tech') openPlanWindow('[data-own="tech"]');
      else if (v === 'visuals' && !visRecog) { var vf = document.getElementById('scout-vis-file'); if (vf) vf.click(); }
      return;
    }
    if (t.hasAttribute('data-room-toggle')) { var open = t.getAttribute('aria-expanded') === 'true', ul = document.getElementById(t.getAttribute('aria-controls')); t.setAttribute('aria-expanded', String(!open)); t.closest('.rb-room').classList.toggle('is-open', !open); if (ul) ul.hidden = open; return; }
    var act = t.getAttribute('data-act'); if (!act) return;
    /* из Интерьера план и капсула уже есть — после «Состояния» сразу расчёт (если площади в порядке), без «Параметров» и «Формата» */
    if (act === 'next' && st.fromInterior && st.step === 2 && validInputs()) { proceed(); return; }
    if (act === 'next') { if (st.step === 4) proceed(); else go(st.step + 1); }
    else if (act === 'pay') payOpen();
    else if (act === 'ungate') go(2);
    else if (act === 'back') go(st.step - 1);
    else if (act === 'edit') go(1);
    else if (act === 'upload') openPlanWindow('[data-room-area]');
    else if (act === 'manual') { st.plan = { mode: 'manual', fileName: null, meta: null, rooms: ['Гостиная', 'Спальня', 'Санузел'].map(function (n) { return { id: 'n' + (++roomSeq), name: n, area: null }; }) }; touch(); focusAfter = '[data-room-area]'; render(); }
    else if (act === 'reset-plan') { st.plan = null; st.planFile = null; st.planLevel = null; touch(); focusAfter = '[data-act="upload"]'; render(); }
    else if (act === 'add-room') { var id = 'n' + (++roomSeq); while (byId(st.plan.rooms, id)) id = 'n' + (++roomSeq); st.plan.rooms.push({ id: id, name: '', area: null }); touch(); focusAfter = '#rn-' + id; render(); }
    else if (act === 'del-room') { var row = t.closest('[data-room]'); if (row && st.plan.rooms.length > 1) { st.plan.rooms = st.plan.rooms.filter(function (r) { return r.id !== row.getAttribute('data-room'); }); touch(); focusAfter = '[data-act="add-room"]'; render(); } }
    else if (act === 'use-visuals') { if (st.visuals && st.visuals.items.length) { st.source = 'visuals'; touch(); syncUrl(); focusAfter = '[data-own="visuals"]'; render(); } }
    else if (act === 'drop-visuals') { st.visuals = null; st.source = 'capsule'; touch(); syncUrl(); focusAfter = '[data-own="visuals"]'; render(); }
    else if (act === 'vis-to-my') { if (st.visuals) { st.visuals.items.forEach(function (it) { S.my.addProduct(it.id); }); S.ui.toast('Подборка в «Мой ремонт» — ' + st.visuals.items.length + ' ' + pl(st.visuals.items.length, ['товар', 'товара', 'товаров']), 'ok'); } }
    else if (act === 'save') save();
    else if (act === 'pdf') S.ui.toast('В прототипе файл не формируется');
    else if (act === 'restart') restart();
  });
  stage.addEventListener('input', function (e) {
    var row = e.target.closest('[data-room]'); if (!row || !st.plan) return;
    var room = byId(st.plan.rooms, row.getAttribute('data-room')); if (!room) return;
    if (e.target.hasAttribute('data-room-name')) { room.name = e.target.value.slice(0, 40); touch(); return; }
    if (!e.target.hasAttribute('data-room-area')) return;
    var raw = e.target.value, s = raw.replace(/\s/g, '').replace(',', '.');
    var num = s === '' ? null : (/^\d+(\.\d*)?$/.test(s) ? parseFloat(s) : NaN);
    room.bad = num !== null && (isNaN(num) || num > MAX_ROOM);
    room.area = (num === null || room.bad || !(num > 0)) ? null : Math.round(num * 10) / 10;
    room.raw = raw;
    row.classList.toggle('is-bad', !!room.bad);
    var err = document.getElementById('scout-area-err'); if (err) err.hidden = !st.plan.rooms.some(function (r) { return r.bad; });
    var tot = document.getElementById('scout-total'); if (tot) tot.textContent = F.area(totalArea());
    var bd = document.getElementById('scout-breakdown'); if (bd) { var bh = breakdownHtml(); bd.innerHTML = bh; bd.hidden = !bh; }
    var lab = stage.querySelector('[data-plan-area="' + room.id + '"]'); if (lab) lab.textContent = room.area ? F.area(room.area) : '— м²';
    touch(); renderSteps(); updateBar();
  });
  stage.addEventListener('focusout', function (e) {
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-room-area') || !st.plan) return;
    var row = e.target.closest('[data-room]'), room = row && byId(st.plan.rooms, row.getAttribute('data-room'));
    if (room && !room.bad) { room.raw = null; e.target.value = room.area ? String(room.area).replace('.', ',') : ''; }
  });
  stage.addEventListener('change', function (e) {
    if (e.target.id === 'scout-vis-file') { onVisFiles(e.target.files); e.target.value = ''; }
  });

  /* вернулись с оплаты, входа или METOD при открытом счёте: пара открыта — сразу показываем результат */
  var issuedOnLoad = resolveGate();
  if (qFromPlan !== null && S.ui.qs('step') === 'result' && validInputs()) { var ap0 = S.scout.access(accessParams()); issue('plan', ap0.kind === 'repeat' ? ap0.request : null); }
  if (issuedOnLoad) { restoredNote = false; persist(); }
  render();
  if (issuedOnLoad) setTimeout(function () { S.ui.toast('Расчёт открыт · заявка на расчёт № ' + issuedOnLoad.number, 'ok'); }, 300);
  else if (st.gate && st.pendingPay) {
    var freshPay = Date.now() - st.pendingPay < 30 * 60 * 1000;
    st.pendingPay = 0; persist();
    if (freshPay && S.auth.isIn()) setTimeout(payOpen, 350);      /* гость нажал «Оплатить», вошёл — продолжаем оплату */
  }

  /* вернулись со входа после «Сохранить в проект» — доводим сохранение до конца */
  if (st.pendingSave) {
    var fresh = Date.now() - st.pendingSave < 30 * 60 * 1000;
    st.pendingSave = 0; persist();
    if (fresh && S.auth.isIn() && st.step === 5 && valid(5)) setTimeout(save, 350);
  }
})();
