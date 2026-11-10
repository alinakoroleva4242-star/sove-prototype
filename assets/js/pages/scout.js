/* Бюджет (Расчёт ремонта), v3 — общий договор частей 02.11.2026, саммари созвона 28.10 (пп. 1–12).
   Поток: объект «Моего ремонта» (SOVE.repair — паспорт, единственный источник) → пропуск известного → «Тип и формат» → результат.
   Шаги внутри: 1 Интерьер · 2 Состояние · 3 Площадь · 4 Тип и формат · 5 Результат. Шаг 1–3, данные которого известны из объекта
   или адреса и который человек ещё не открывал (st.auto[n] = true), не показываем; «Тип и формат» — всегда. Объект знает капсулу,
   состояние и площадь — сразу один экран «тип ремонта + формат» → «✦ Рассчитать бюджет» → результат.
   Интерьер — общее окно выбора (SOVE.capsulePicker, вход 'budget'): оно само пишет выбор в объект (apply) по «Выбрать»;
   капсула из адреса (?capsule= с главной и карточек) — только предвыбор в окне, выбирает человек. Тип ремонта (База / Премиум) —
   в окне и сегментом на шаге 4 (тоже через apply). «＋ Свой интерьер» в окне — подборка по своим картинкам (только в расчёте).
   План — общее окно «Основа квартиры» (SOVE.planUpload, вход 'budget': план застройщика, обмерный, дизайн-проект); комнаты распознаёт
   Планировка (plan-demo.html?from=budget&scan=1&returnTo=…) — Бюджет берёт их из R.get().plan.rooms и показывает один тост.
   Доступ к результату — по правилам платформы (SOVE.scout): первый расчёт бесплатно, по подписке METOD бесплатно, открытая пара
   «капсула + тип ремонта» пересчитывается бесплатно, иначе счёт в рублях (токены не участвуют).
   Черновик мастера — SOVE.draft('scout'): «Назад» и перезагрузка возвращают на тот же шаг, в том числе на результат и счёт. */
(function () {
  var S = window.SOVE;
  var stage = document.getElementById('scout-stage');
  var stepsEl = document.getElementById('scout-steps');
  if (!stage || !stepsEl) return;
  if (!S || !S.data || !S.data.scout) {
    stage.innerHTML = '<div class="error-screen"><p class="h4">Не удалось открыть расчёт</p><p class="small">Данные для расчёта не загрузились. Введённое не потеряно — обновите страницу.</p><div><button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">Обновить страницу</button></div></div>';
    return;
  }
  var D = S.data, F = S.fmt, esc = F.esc, SC = D.scout, R = S.repair || null;

  /* тип ремонта — «База | Премиум», как в окне выбора интерьера, Планировке и Моём ремонте.
     Комплектация Премиума — по pricePerM2Premium капсулы; у капсулы её нет (k1–k6) — по цене Базы, в результате пометка */
  var LEVEL_SHORT = { base: 'База', premium: 'Премиум' };
  var LEVELS = [{ id: 'base' }, { id: 'premium' }];
  function perM2(c, level) { return (level === 'premium' && c.pricePerM2Premium) || c.pricePerM2; }
  function sameAsBase(c, level) { return level === 'premium' && !!c && !c.pricePerM2Premium; }
  var STEPS = ['Интерьер', 'Состояние', 'Площадь', 'Тип и формат', 'Результат'];
  /* имя капсулы — короткое, как в окне выбора, Интерьере и Планировке (SOVE_KB); кодов К1–К7 в интерфейсе нет */
  function capName(id) {
    var P = S.capsulePicker; if (P && P.name) return P.name(id);
    if (R && R.capName) return R.capName(id);
    var c = D.capsule(id); return c ? c.name : '';
  }

  /* классификатор SOVEAPP — что входит в Базу и Премиум (Вика 21.10): данные в assets/js/classifier.js */
  function clsHtml(level) {
    var C = S.classifier; if (!C || !C.sections) return '<p class="small muted">Классификатор не загрузился.</p>';
    var other = level === 'premium' ? 'base' : 'premium', otherName = other === 'premium' ? 'в Премиуме' : 'в Базе';
    return '<div class="cls-seg" role="group" aria-label="Тип ремонта">' + LEVELS.map(function (l) { return '<button type="button" class="cls-seg__b' + (l.id === level ? ' is-on' : '') + '" data-cls-level="' + l.id + '" aria-pressed="' + (l.id === level) + '">' + LEVEL_SHORT[l.id] + '</button>'; }).join('') + '</div>' +
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
    plus: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    doc: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>'
  };

  /* ---------- состояние ---------- */
  /* auto — шаги 1–3, данные которых взяты из объекта, адреса или плана: на экран их не выводим, пока человек сам их не откроет (false);
     planSig — подпись комнат плана объекта, уже взятых в черновик: те же комнаты не ложатся второй раз поверх правок */
  function blank() { return { step: 1, capsuleId: null, source: 'capsule', visuals: null, level: 'base', stateId: null, plan: null, planFile: null, planLevel: null, formatId: 'self', area: 0, prefilledFrom: null, savedProjectId: null, pendingSave: 0,
    gate: false, issued: null, payId: null, pendingPay: 0, auto: {}, planSig: null }; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function okCapsule(id) { var c = id && D.capsule(id); return c && !c.soon && c.pricePerM2 ? c : null; }

  var saved = S.draft.get('scout');
  var hadDraft = !!(saved && typeof saved === 'object');
  var st = Object.assign(blank(), hadDraft ? saved : {});
  var restored = hadDraft;
  var roomSeq = 0, visRecog = null, restoredNote = false, focusAfter = null, payError = '', stateOpen = false;
  var urlPick = null;     /* капсула из адреса — предвыбор окна, пока человек не выбрал интерьер сам */
  var selfDepth = 0;      /* свои записи в объект: события 'sove:repair' от них не перерисовывают шаг второй раз */

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
    if (st.plan) st.plan.rooms.forEach(function (r) { var m = /^n(\d+)$/.exec(r.id || ''); if (m) roomSeq = Math.max(roomSeq, Number(m[1])); });
    if (st.plan) st.plan.rooms.forEach(function (r) { if (!r.id) r.id = 'n' + (++roomSeq); r.area = (typeof r.area === 'number' && r.area > 0) ? r.area : null; });
    if (!st.auto || typeof st.auto !== 'object' || Array.isArray(st.auto)) st.auto = {};
    if (typeof st.planSig !== 'string') st.planSig = null;
    /* результат и счёт тоже восстанавливаем (было Math.min(3, …) — перезагрузка результата кидала на «Параметры»):
       шаг дальше ограничит maxStep — 5 только при выданном расчёте, 4 при открытом счёте */
    st.step = Math.min(5, Math.max(1, Number(st.step) || 1));
  })();

  /* ---------- объект «Моего ремонта» — единственный источник (П1): что в нём есть, не спрашиваем ---------- */
  function flat() { return R ? R.flats.active() : null; }
  function objPlan() { var f = flat(); return f ? R.get(f.id).plan || null : null; }
  /* капсула расчёта: капсула текущего интерьера объекта (своего — его основа), иначе квартиры; без квартиры — что выбрано в окне (S.my у гостя) */
  function objectCapsule() {
    var f = flat(), it = f ? R.get(f.id).interior : null, id = it ? (it.capsuleId || it.baseCapsuleId || null) : null;
    if (!id && f) id = f.capsuleId || null;
    if (!id && !f && S.capsulePicker && S.capsulePicker.current) { try { id = S.capsulePicker.current().capsuleId; } catch (e) { id = null; } }
    return okCapsule(id) ? id : null;
  }
  /* капсула, которая и есть текущий интерьер объекта (не основа своего интерьера): только её тип можно менять через окно —
     иначе apply сделал бы текущей лёгкую запись капсулы вместо своего интерьера человека */
  function currentCapsule() { var f = flat(), it = f ? R.get(f.id).interior : null; return it ? (it.capsuleId || null) : f ? (f.capsuleId || null) : null; }
  /* текущий интерьер объекта — свой, собранный на основе этой капсулы (Интерьер, «изменить материалы»): считаем по цене капсулы и так и подписываем */
  function ownBase() { var f = flat(), it = f ? R.get(f.id).interior : null; return !!it && !it.capsuleId && !!st.capsuleId && it.baseCapsuleId === st.capsuleId && !isVis(); }
  /* тип ремонта: квартира (его пишет окно выбора) → бюджет Планировки; без квартиры — расчёт (S.my) */
  function objectLevel() {
    var f = flat(), bp = f ? R.get(f.id).budgetPlan : null, l = (f && f.budgetType) || (bp && bp.type) || null;
    if (!l && !f) { try { l = S.my.get().level; } catch (e) { l = null; } }
    return l === 'premium' || l === 'base' ? l : null;
  }
  /* состояние квартиры → состояние расчёта. У квартиры одно «С отделкой» (finished), у расчёта — «Вторичка» (65 000 ₽/м²) и «Чистовая
     отделка» (50 000): уточнение расчёт держит в квартире (stateDetail), в сохранённом бюджете или в параметрах расчёта. Без уточнения
     «С отделкой» спрашиваем (id: null, unsure) — не подставляем ставку наугад. Состояния нет — тоже спрашиваем, «Бетон» не подставляем */
  var STATE_MY = (R && R.flats.STATE_MY) || { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'finish' };
  var MY_STATE = (R && R.flats.MY_STATE) || { concrete: 'concrete_walls', pre: 'whitebox', finish: 'finished', secondary: 'finished' };
  function fits(id, fs) { return !!id && !!byId(SC.states, id) && (STATE_MY[fs] === id || MY_STATE[id] === fs); }
  function objectState() {
    var f = flat(); if (!f) return { id: null };
    var r = R.get(f.id), fs = f.state || (r.base && r.base.state) || null;
    if (!fs || !STATE_MY[fs]) return { id: null };
    var cands = [f.stateDetail, r.budget && r.budget.stateId, r.scoutParams && r.scoutParams.stateId];
    for (var i = 0; i < cands.length; i++) if (fits(cands[i], fs)) return { id: cands[i], fs: fs };
    if (fs === 'finished') return { id: null, fs: fs, unsure: true };
    return { id: STATE_MY[fs], fs: fs };
  }
  /* ответ «Что сейчас в квартире» — в паспорт: состояние квартиры (зеркало S.my → flat.state) и уточнение «Вторичка / Чистовая» */
  function keepState() {
    if (!st.stateId) return;
    selfWrite(function () {
      try { if (S.my) S.my.set({ stateId: st.stateId }); } catch (e) {}
      var f = flat(); if (!f) return;
      var want = MY_STATE[st.stateId] === 'finished' ? st.stateId : null;
      if ((f.stateDetail || null) !== want) R.flats.update(f.id, { stateDetail: want });
    });
  }
  /* площадь — в паспорт по «Далее» с шага «Площадь» (зеркало S.my → flat.m2): в следующий раз шаг не спросим */
  function keepArea() {
    var ar = totalArea(); if (!(ar > 0)) return;
    selfWrite(function () { try { if (S.my) S.my.set({ area: ar }); } catch (e) {} });
  }
  function selfWrite(fn) { selfDepth++; try { fn(); } finally { selfDepth--; } }
  function mark(n) { if (st.auto[n] !== false) st.auto[n] = true; }
  function manualWhole(area, src) { return { mode: 'manual', fileName: null, meta: null, src: src || 'user', rooms: [ { id: 'n' + (++roomSeq), name: 'Вся квартира', area: area > 0 ? Math.round(area * 10) / 10 : null } ] }; }
  function roomsSig(rooms) { return rooms.map(function (r) { return String(r.name || '') + ':' + Math.round(Number(r.m2) * 10) / 10; }).join('|'); }
  function planFromRooms(p, rooms) { return { mode: 'plan', fileName: (p && p.file) || null, meta: null, rooms: rooms.map(function (r) { return { id: 'n' + (++roomSeq), name: r.name || 'Помещение', area: Math.round(Number(r.m2) * 10) / 10 }; }) }; }
  /* план объекта → черновик: комнаты с площадями (их пишет только Планировка) или площадь квартиры; force — поверх правок черновика.
     → { rooms: true }, если пришли новые комнаты (вернулись со скана, план заменили) — тогда один тост */
  function syncPlan(force) {
    var f = flat(), out = { rooms: false }; if (!f) return out;
    var p = objPlan(), rooms = p && Array.isArray(p.rooms) ? p.rooms.filter(function (x) { return Number(x.m2) > 0; }) : [];
    st.planFile = p ? p.file || null : null; st.planLevel = p ? p.level || null : null;
    if (rooms.length) {
      var sig = roomsSig(rooms);
      if (force || sig !== st.planSig || !st.plan) {
        out.rooms = st.planSig !== null && sig !== st.planSig;
        st.plan = planFromRooms(p, rooms); st.planSig = sig;
      }
      mark(3);
    } else if (st.plan && st.plan.mode === 'plan') { st.plan = null; st.planSig = null; }   /* план объекта сменился, комнат в нём пока нет */
    if (!st.plan && f.m2 > 0) { st.plan = manualWhole(f.m2, 'object'); mark(3); }
    return out;
  }
  function prefillFromObject(force) {
    var cap = objectCapsule(); if (cap) { st.capsuleId = cap; mark(1); }
    /* «как будете делать ремонт» — ответ квартиры (его же спрашивает Планировка): второй раз не переспрашиваем, а подставляем */
    var ff = R && R.flats.active(); if (ff && ff.format && byId(SC.formats, ff.format)) st.formatId = ff.format;
    var lv = objectLevel(); if (lv) st.level = lv;
    var os = objectState();
    if (os.id) { st.stateId = os.id; mark(2); }
    else if (os.fs && st.stateId && !fits(st.stateId, os.fs)) st.stateId = null;   /* в квартире другое состояние — прежний ответ не годится */
    return syncPlan(force);
  }

  /* проект из адреса (кабинет, прежний путь): считаем для него и сохраняем в него — данные проекта, не объекта */
  var qProject = S.ui.qs('project');
  var project = (qProject && S.auth.isIn()) ? S.projects.get(qProject) : null;
  var loadPlan = { rooms: false };
  if (project && st.prefilledFrom !== project.id) {
    var ps = project.scout;
    if (ps) { st = Object.assign(blank(), { capsuleId: okCapsule(ps.capsuleId) ? ps.capsuleId : null, stateId: byId(SC.states, ps.stateId) ? ps.stateId : null, formatId: byId(SC.formats, ps.formatId) ? ps.formatId : 'self' }); }
    if (!st.capsuleId && okCapsule(project.capsuleId)) st.capsuleId = project.capsuleId;
    var pArea = (ps && ps.area) || project.area;
    if (ps && Array.isArray(ps.rooms) && ps.rooms.length) st.plan = { mode: 'manual', fileName: null, meta: null, rooms: ps.rooms.map(function (r) { return { id: 'n' + (++roomSeq), name: r.name, area: Number(r.area) || null }; }) };
    else if (pArea && !st.plan) st.plan = manualWhole(Number(pArea), 'object');
    st.prefilledFrom = project.id; st.step = 1; restored = false;
  } else if (!project) loadPlan = prefillFromObject(false);

  /* капсула из адреса (главная, карточка капсулы, каталог): только предвыбор в окне выбора — шаг «Интерьер» не пропускаем и ничего не пишем;
     выбирает человек кнопкой «Выбрать». Без модуля окна (запасной путь каталога capsules.html?pick=1) — как раньше, капсула сразу в расчёт */
  var qCapsule = (S.ui.qs('capsule') || '').toLowerCase();
  if (!project && okCapsule(qCapsule) && (isVis() || qCapsule !== st.capsuleId)) {
    if (S.capsulePicker) { urlPick = qCapsule; st.auto[1] = false; st.step = 1; }
    else { st.capsuleId = qCapsule; st.source = 'capsule'; st.savedProjectId = null; st.gate = false; }
  }

  /* пришли с главной: площадь из мини-калькулятора — известна (шаг «Площадь» пропускаем), но комнаты плана объекта точнее и главнее;
     состояние с главной всегда «Бетон» (база суммы, не ответ человека) — только предвыбор: шаг «Состояние» покажем со списком */
  (function fromHome() {
    var qa = Number(S.ui.qs('area')), qs = S.ui.qs('state'), os0 = project ? { id: null } : objectState();
    if (qs && byId(SC.states, qs) && !st.stateId && !(os0.fs && !fits(qs, os0.fs))) { st.stateId = qs; stateOpen = true; }   /* в квартире «С отделкой» — «Бетон» с главной не подставляем */
    if (qa >= 10 && qa <= 999 && !(st.plan && st.plan.mode === 'plan') && (!st.plan || st.plan.rooms.length === 1)) { st.plan = manualWhole(qa, 'url'); mark(3); }
  })();

  /* пришли из Планировки (ТЗ Планировки, 17.2 «гибрид»): весь бюджет уже куплен там — подставляем план, состояние,
     интерьер и тип из квартиры (SOVE.scout.fromRepair) и ничего не переспрашиваем; ?step=result — сразу последняя страница */
  var qFromPlan = S.ui.qs('from') === 'plan' && R ? (S.ui.qs('flat') || (R.flats.active() || {}).id || '') : null;
  /* пришли из Бюджета Моего ремонта по «Досчитать весь бюджет» (Алина 26.10): всё известное — из объекта, как при обычном входе;
     спрашиваем только неизвестное, «Тип и формат» — всегда (решение 30.10). Расчёт — по обычным правилам доступа */
  var qFromInt = S.ui.qs('from') === 'interior' && R ? ((R.flats.active() || {}).id || '') : null;
  if (qFromInt !== null && !(hadDraft && saved.fromInterior === qFromInt && st.fromInterior === qFromInt)) {
    st = Object.assign(blank(), { fromInterior: qFromInt }); restored = false; stateOpen = false; urlPick = null;
    loadPlan = prefillFromObject(true);
  }
  if (qFromPlan !== null) {
    var fp = S.scout.fromRepair(qFromPlan), cap0 = okCapsule(fp.capsuleId) ? fp.capsuleId : (D.capsules.filter(function (x) { return okCapsule(x.id) && !x.designer; })[0] || {}).id;
    st = Object.assign(blank(), { capsuleId: cap0, stateId: byId(SC.states, fp.stateId) ? fp.stateId : 'concrete', level: fp.level === 'premium' ? 'premium' : 'base', formatId: 'self',
      plan: { mode: 'manual', fileName: null, meta: null, rooms: (fp.rooms && fp.rooms.length ? fp.rooms : [{ name: 'Вся квартира', m2: fp.area }]).map(function (r) { return { id: 'n' + (++roomSeq), name: r.name, area: Number(r.m2 || r.area) || null }; }) },
      fromPlan: qFromPlan, step: 4, volumes: fp.volumes || null, auto: { 1: true, 2: true, 3: true } });   /* объёмы плана: работы по позициям, а не ставка × м² */
    restored = false; urlPick = null;
  } else { delete st.fromPlan; delete st.volumes; if (qFromInt === null) delete st.fromInterior; }  /* обычный вход — без бесплатного пересчёта из Планировки */

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
  function roomsCount() { return st.plan ? st.plan.rooms.filter(function (r) { return r.area > 0 && !isWhole(r); }).length : 0; }
  function breakdownHtml() {
    var w = wholeRoom(), parts = partsArea(); if (!w || !(parts > 0)) return '';
    var rest = Math.round((w.area - parts) * 10) / 10;
    return rest < 0 ? '<span class="scout-rooms__warn">Площади помещений больше общей на ' + F.area(-rest) + ' — проверьте цифры</span>'
      : 'Помещения — разбивка внутри общей площади: ' + F.area(parts) + ' из ' + F.area(w.area) + (rest > 0 ? ', остальное — ' + F.area(rest) : '');
  }
  function flatOk() { return !!st.plan && totalArea() > 0 && !st.plan.rooms.some(function (r) { return r.bad; }); }
  function valid(n) {
    if (n === 1) return !visRecog && (isVis() || !!(okCapsule(st.capsuleId) && st.level));
    if (n === 2) return !!st.stateId;
    if (n === 3) return flatOk();
    if (n === 4) return !!byId(SC.formats, st.formatId);
    return validInputs() && issuedOk();
  }
  function validInputs() { return valid(1) && valid(2) && valid(3); }
  /* результат открыт, только когда расчёт выдан по правилам доступа и параметры с тех пор не менялись */
  /* три шага (Алина 10.11): 1 — интерьер и план, 2 — вопросы одной страницей (экран 4), 3 — итог (экран 5).
     Экраны 2 и 3 (состояние, площадь) в полосу шагов не входят: состояние выбирают в карточке вопроса, площадь — экран правки по «изменить ›» */
  function maxStep() { if (!valid(1)) return 1; return validInputs() && valid(4) && issuedOk() ? 5 : 4; }
  /* пропуск известного: шаг 1–3 не на экране, если данные взяты из объекта или адреса и шаг заполнен; текущий шаг виден всегда */
  function autoSkip(n) { return n >= 1 && n <= 3 && !!st.auto[n] && valid(n); }
  function hiddenStep(n) { return (n === 2 || n === 3) && n !== st.step; }
  function visibleSteps() { return [1, 2, 3, 4, 5].filter(function (n) { return !hiddenStep(n); }); }
  function nextFrom(n) { return n < 4 ? 4 : 5; }
  function prevFrom(n) { return n === 5 ? 4 : n === 4 ? 1 : n === 1 ? 1 : 4; }
  function startStep() {
    st.step = Math.min(st.step, maxStep());
    if (st.step === 2 || st.step === 3) st.step = 4;       /* экраны правки — не шаги: возвращаемся в вопросы */
  }
  startStep();
  /* со счёта уходят на вход и оплату, со скана Планировки (scanned=1) — возврат ожидаем, напоминание не нужно */
  restoredNote = restored && !st.gate && !st.pendingSave && !(st.step === 5 && issuedOk()) && !S.ui.qs('area') && !S.ui.qs('scanned') && (st.step > 1 || !!st.stateId || !!st.plan) && !urlPick;

  function persist() {
    st.area = totalArea();
    var copy = JSON.parse(JSON.stringify(st));
    if (copy.plan) copy.plan.rooms.forEach(function (r) { delete r.bad; delete r.raw; });
    S.draft.set('scout', copy);
  }
  function touch() { st.savedProjectId = null; persist(); }
  function here() { return 'scout.html' + location.search; }
  /* адрес без разового: капсула, площадь и состояние с главной уже в черновике, scanned — сигнал скана. Иначе перезагрузка
     снова подставила бы площадь с главной поверх правок, а «Назад» из истории — старую капсулу */
  function cleanUrl() {
    try {
      var q = new URLSearchParams(location.search), had = false;
      ['capsule', 'area', 'state', 'scanned', 'manual'].forEach(function (k) { if (q.has(k)) { q.delete(k); had = true; } });
      if (had) { var s = q.toString(); history.replaceState(history.state, '', 'scout.html' + (s ? '?' + s : '') + location.hash); }
      return had;
    } catch (e) { return false; /* адрес не обновился — не страшно, всё есть в черновике */ }
  }
  function scanHref() { var rt = here(); return S.planUpload && S.planUpload.scanHref ? S.planUpload.scanHref('budget', rt) : 'plan-demo.html?from=budget&scan=1&returnTo=' + encodeURIComponent(rt); }

  /* ---------- расчёт ---------- */
  function levelOf(c) { return { id: st.level, name: LEVEL_SHORT[st.level] || LEVEL_SHORT.base, sameAsBase: !isVis() && sameAsBase(c, st.level) }; }
  /* город и что считаем (Алина 10.11): строительная смета (работы) — пока только по Москве; в другом городе — только комплектация */
  function scope() { return st.city !== 'msk' ? 'kit' : (st.scope || 'full'); }   /* «комплектация и работы» — только Москва; город не выбран — пока комплектация */
  function cityOfFlat() { var f = flat(), c = f && String(f.city || '').trim(); return !c ? null : /москв/i.test(c) ? 'msk' : 'other'; }
  /* цель ремонта — общий ответ квартиры с Планировкой (sove.answers[квартира].purpose): там спросили — здесь не спрашиваем заново */
  var PURPOSE = [['self', 'для себя'], ['rent', 'сдавать'], ['sale', 'продать']];
  function answersOf() { var f = flat(), all = {}; try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {} return { all: all, id: (f && f.id) || 'draft' }; }
  function purposeOfFlat() { var a = answersOf(), x = a.all[a.id]; return x && x.purpose || null; }
  function savePurpose(v) { var a = answersOf(); var x = a.all[a.id] && typeof a.all[a.id] === 'object' ? a.all[a.id] : (a.all[a.id] = {}); x.purpose = v; if (x.auto) delete x.auto.purpose; try { localStorage.setItem('sove.answers', JSON.stringify(a.all)); } catch (e) {} }
  if (!st.city && cityOfFlat()) { st.city = cityOfFlat(); st.auto.city = true; }
  if (!st.purpose && purposeOfFlat()) { st.purpose = purposeOfFlat(); st.auto.purpose = true; }
  function calc() {
    var s = byId(SC.states, st.stateId), area = totalArea(), VW = S.scout.planWorks(st.volumes, s.id, st.level, area);
    var works = scope() === 'kit' ? 0 : VW ? VW.total : s.rate * area, c = null, lines = null, kitMetod, kitRetail;
    if (isVis()) { var vk = visKit(area); kitMetod = vk.kitMetod; kitRetail = vk.kitRetail; lines = vk.lines; }
    else { c = D.capsule(st.capsuleId); kitMetod = perM2(c, st.level) * area; kitRetail = kitMetod * SC.retailMarkup; }   /* как S.scout.estimate и Бюджет Моего ремонта */
    var total = works + kitMetod;
    return { capsule: c, visuals: lines, state: s, level: levelOf(c), format: byId(SC.formats, st.formatId), area: area, plan: VW,
      works: works, kitMetod: kitMetod, kitRetail: kitRetail, total: total, perM2: total / area,
      save: kitRetail - kitMetod, savePct: kitRetail > 0 ? Math.round((kitRetail - kitMetod) / kitRetail * 100) : 0 };
  }

  /* ---------- доступ к расчёту (правила платформы — SOVE.scout) ---------- */
  function accessParams() {
    var rooms = st.plan ? st.plan.rooms.filter(function (r) { return typeof r.area === 'number' && r.area > 0; }).length : 0;
    var m = st.plan && st.plan.meta;
    return { capsuleId: srcId(), level: st.level, stateId: st.stateId, area: totalArea(), rooms: rooms, bathrooms: (m && m.bathrooms) || 0, formatId: st.formatId };
  }
  function sig() { return JSON.stringify([accessParams(), scope()]); }   /* сменили «что считаем» — расчёт выдаём заново */
  function issuedRequest() {
    if (!st.issued) return null;
    return S.scout.requests().filter(function (r) { return r.id === st.issued.requestId; })[0] || null;
  }
  function issuedOk() { return !!st.issued && st.issued.sig === sig() && !!issuedRequest(); }
  function accessNow() { return (isVis() || okCapsule(st.capsuleId)) ? S.scout.access(accessParams()) : null; }
  function isPayable(a) { return !!a && (a.kind === 'paid' || a.kind === 'recalc-paid'); }
  function exampleMark() { return D.scoutAccess && D.scoutAccess.pricesAreExamples; }
  function pairName() { if (isVis()) return 'Подборка по вашим картинкам'; var c = okCapsule(st.capsuleId); return c ? capName(c.id) + ' · ' + LEVEL_SHORT[st.level] : ''; }
  /* шаг 4: строка над кнопкой и подпись кнопки */
  function accessLine() {
    var a = accessNow(); if (!a) return '';
    if (a.kind === 'first-free') return 'Первый расчёт бесплатно';
    if (a.kind === 'metod') return 'Бесплатно по подписке METOD';
    if (a.kind === 'opened') return 'Капсула уже открыта — пересчёт бесплатный';
    if (a.kind === 'repeat' && !sameScope(a.request)) return 'Капсула уже открыта — пересчёт бесплатный';
    if (a.kind === 'repeat') return 'Такой расчёт у вас уже есть — заявка № ' + a.request.number + ' от ' + F.dateLong(a.request.ts);
    if (isPayable(a)) return (a.kind === 'paid' ? 'Открытие расчёта ' : 'Пересчёт ') + pairName() + ' — ' + F.rub(a.price) + (exampleMark() ? ' (пример цены)' : '');
    return 'Цена для этой капсулы не задана';
  }
  /* «✦» — расчёт бюджета тоже генерация, как «✦ Сгенерировать»; правила доступа прежние (П5 не трогаем до ответа команды) */
  function nextLabel() {
    var a = accessNow(); if (!a) return 'Получить бюджет';
    return a.kind === 'repeat' ? 'Получить бюджет' : isPayable(a) ? 'Перейти к счёту' : a.kind === 'unavailable' ? 'Далее' : 'Получить бюджет';
  }
  function resultData(r) { return { area: r.area, works: r.works, kitMetod: r.kitMetod, kitRetail: r.kitRetail, total: r.total, sameAsBase: !!r.level.sameAsBase, scope: scope() }; }
  /* заявка посчитана с тем же «что считаем» (с работами / только комплектация)? Сменили — это пересчёт, а не «такой расчёт уже есть» */
  function sameScope(rq) { return !!rq && ((rq.result && rq.result.scope) || 'full') === scope(); }
  /* выдать расчёт: новая заявка Расчёт бюджета (basis) или уже существующая (повтор — новую не создаём).
     Расчёт — первое действие с данными: квартира-черновик, площадь и состояние — в паспорт (второй раз не спросим).
     Капсулу и тип ремонта сюда не пишем: их пишет только окно выбора (apply) по «Выбрать» и сегмент типа */
  function issue(basis, existing) {
    var req = existing || S.scout.register(accessParams(), resultData(calc()), basis);
    st.issued = { requestId: req.id, sig: sig() }; st.gate = false; st.payId = null; st.pendingPay = 0; st.step = 5;
    var rr = calc();
    selfWrite(function () {
      if (R) R.flats.ensure();
      S.my.set({ area: rr.area, stateId: st.stateId, total: rr.total, works: rr.works, kitMetod: rr.kitMetod, kitRetail: rr.kitRetail });
      keepState();
      /* первый расчёт квартиры — сразу в «Мой ремонт» (сверка 02.11: новичок посчитал, а «Мой ремонт» писал «Бюджет появится после
         расчёта»); бюджет уже есть — замена только кнопкой «Сохранить в Мой ремонт» с вопросом «Заменить?» (ТЗ 22.10: бюджет квартиры один) */
      if (R && !st.fromInterior) { var f0 = R.flats.active(), r0 = f0 ? R.get(f0.id) : null; if (r0 && !r0.budget) R.save('budget', budgetData(rr), { force: true, silent: true }); }
      /* из Бюджета Моего ремонта: расчёт и есть весь бюджет квартиры — параметры расчёта в паспорт, бюджет «посчитан» (Бюджет строит 9 + 5 по ним) */
      if (st.fromInterior && R) {
        var rp1 = R.get(st.fromInterior);
        if (rp1) {
          rp1.scoutParams = { stateId: st.stateId, area: rr.area, capsuleId: st.capsuleId, level: st.level, rooms: st.plan ? st.plan.rooms.map(function (r) { return { name: r.name, m2: r.area }; }) : [], byRooms: byRoomsData(rr) };
          rp1.budgetPlan = Object.assign({}, rp1.budgetPlan || {}, { full: true, type: st.level, ts: Date.now(), source: 'scout' });
          R.flats.update(st.fromInterior, {});
        }
      }
      /* из Планировки: правки расчёта сразу меняют бюджет квартиры — Планировка, Мой ремонт и полоса «Бюджет» (17.2) */
      if (st.fromPlan !== undefined && st.fromPlan !== null && R) {
        var fid = st.fromPlan || (R.flats.active() || {}).id, rp = fid ? R.get(fid) : null;
        if (rp) {
          rp.scoutParams = { stateId: st.stateId, area: rr.area, capsuleId: st.capsuleId, level: st.level, rooms: st.plan ? st.plan.rooms.map(function (r) { return { name: r.name, m2: r.area }; }) : [], byRooms: byRoomsData(rr) };
          if (rp.budgetPlan) rp.budgetPlan.type = st.level;
          if (window.SOVE_FLOW && window.SOVE_FLOW.refreshBudget) window.SOVE_FLOW.refreshBudget(); else R.flats.update(fid, {});
        }
      }
    });
    persist(); return req;
  }
  /* новый шаг — линия шагов видна под закреплёнными шапкой и полоской «Квартира · Интерьер» (полоска, появившись после выбора
     в окне, докручивает страницу на свою высоту — линия уходила под неё) */
  function topBars() {
    var h = 0;
    ['site-header', 'object-bar'].forEach(function (id) {
      var el = document.getElementById(id); if (!el || el.hidden) return;
      var pos = getComputedStyle(el).position; if (pos === 'sticky' || pos === 'fixed') h += el.getBoundingClientRect().height;
    });
    return h;
  }
  function toTop() {
    var top = document.getElementById('scout-head').getBoundingClientRect().top + window.pageYOffset - topBars();
    if (window.pageYOffset > top) window.scrollTo(0, Math.max(0, top));
  }
  function showStep() { restoredNote = false; focusAfter = '#scout-h'; render(); toTop(); }
  /* кнопка шага 4: ведём по веткам доступа */
  function proceed() {
    if (needAnswers()) return;
    if (!validInputs()) return;
    /* из Планировки весь бюджет уже оплачен — пересчёт бесплатный, без экрана-счёта */
    if (st.fromPlan !== undefined && st.fromPlan !== null) { var ap = S.scout.access(accessParams()); issue('plan', ap.kind === 'repeat' ? ap.request : null); showStep(); return; }
    var a = S.scout.access(accessParams());
    if (a.kind === 'repeat' && sameScope(a.request)) { issue(null, a.request); showStep(); return; }
    if (a.kind === 'repeat') { issue('opened'); showStep(); return; }   /* та же пара, другое «что считаем» — новый расчёт без оплаты */
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
    if (n === 1) { if (isVis()) return 'по картинкам'; var c1 = okCapsule(st.capsuleId); return c1 ? capName(c1.id) : ''; }
    if (n === 2) { var s0 = byId(SC.states, st.stateId); return s0 ? s0.name.toLowerCase() : ''; }
    if (n === 3) { var ar = totalArea(); return ar > 0 ? F.area(ar) : ''; }
    if (n === 4) {
      if (st.gate && st.step === 4) return isPayable(accessNow()) ? 'после оплаты' : 'по подписке METOD';
      var f0 = byId(SC.formats, st.formatId); return (isVis() ? '' : LEVEL_SHORT[st.level] + (f0 ? ' · ' : '')) + (f0 ? f0.name.toLowerCase() : '');
    }
    return (st.step === 5 && valid(5)) ? F.rub(calc().total) : '';
  }
  /* линия шагов — только шаги на экране, номера по порядку; остались «Тип и формат» и «Результат» — линию не показываем */
  function renderSteps() {
    var max = maxStep(), vis = visibleSteps(), k = vis.length;
    stepsEl.style.setProperty('--n', String(k));
    stepsEl.hidden = st.step === 2 || st.step === 3;
    document.getElementById('scout-head').classList.toggle('is-bare', st.step === 2 || st.step === 3);   /* без линии шагов — без пустого места над вопросом */
    /* «‹» слева от полосы — на шаг назад (Алина 10.11: видно, что вернуться можно); на первом шаге его нет */
    var prev = prevFrom(st.step), backBtn = prev < st.step ? '<button type="button" class="scout-steps__back" data-step="' + prev + '" aria-label="На шаг назад">‹</button>' : '';
    if (stepsEl.hidden) vis = [1, 4, 5]; k = vis.length;
    stepsEl.innerHTML = backBtn + vis.map(function (n, i) {
      /* «Тип и формат» заполнен по умолчанию («Делаю сам») — пройденным считаем только после расчёта, иначе точка закрашена до первого захода */
      var cur = n === st.step, done = !cur && n < 5 && valid(n) && n <= max && (n < 4 || issuedOk()), val = stepValue(n);
      /* полоса как в Планировке (Алина 10.11): пройденное — зелёным, текущий шаг — терракотой, справа «шаг N из K»; вернулся назад — видно куда */
      return '<button type="button" data-step="' + n + '" class="' + (cur ? 'is-current' : done ? 'is-done' : '') + (n < st.step ? ' is-past' : '') + '"' + (n > max ? ' disabled' : '') + (cur ? ' aria-current="step"' : '') +
        ' aria-label="Шаг ' + (i + 1) + ' из ' + k + ': ' + esc(STEPS[n - 1]) + (val ? ' — ' + esc(val) : '') + '"><b>Шаг ' + (i + 1) + '</b><span>' + esc(STEPS[n - 1]) + '</span><em class="scout-steps__val num">' + esc(val) + '</em></button>';
    }).join('') + '<small class="scout-steps__n">шаг ' + (vis.indexOf(st.step) + 1) + ' из ' + k + '</small>';
  }

  /* ---------- общий низ шага: Назад / Далее ---------- */
  /* предварительная сумма видна, как только известны состояние и площадь, и уточняется по ходу */
  function estimate() {
    var s0 = byId(SC.states, st.stateId), ar = totalArea(); if (!s0 || !(ar > 0)) return '';
    var c = okCapsule(st.capsuleId), VW = S.scout.planWorks(st.volumes, s0.id, st.level, ar), wk = scope() === 'kit' ? 0 : VW ? VW.total : s0.rate * ar;
    function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
    if (isVis()) return 'Предварительно: ' + mln(wk + visKit(ar).kitMetod) + ' млн ₽';
    if (c) return 'Предварительно: ' + mln(wk + perM2(c, st.level) * ar) + ' млн ₽';
    var ps = D.capsules.filter(function (x) { return okCapsule(x.id) && !x.designer; }).map(function (x) { return perM2(x, st.level); });
    return 'Предварительно: от ' + mln(wk + Math.min.apply(null, ps) * ar) + ' до ' + mln(wk + Math.max.apply(null, ps) * ar) + ' млн ₽';
  }
  function hint() {
    var n = st.step;
    if (n === 4 && missing().length) return 'Заполните: ' + missing().map(function (m) { return m.t; }).join(', ');
    if (valid(n)) return n === 4 ? accessLine() : estimate();
    if (n === 2) return 'Выберите, что сейчас в квартире';
    if (n === 3) return (!st.plan ? 'Укажите площадь: загрузите план или впишите вручную' : (st.plan.rooms.some(function (r) { return r.bad; }) ? 'Исправьте площадь, отмеченную красным' : 'Укажите площадь хотя бы одного помещения'));
    if (n === 1) return visRecog ? 'Подбираем товары по картинкам…' : 'Выберите интерьер — капсулу SOVEAPP или свои картинки';
    return '';
  }
  function bar() {
    var n = st.step, back = n !== 1 ? '<button type="button" class="btn btn--ghost" data-act="back">Назад</button>' : '';
    if (n === 5) return '<div class="scout-bar scout-bar--result"><div class="scout-bar__in">' + back + saveButton() + '</div></div>';
    return '<div class="scout-bar"><div class="scout-bar__in">' + back +
      '<span class="scout-bar__hint small muted" id="scout-hint" aria-live="polite">' + esc(hint()) + '</span>' +
      '<button type="button" class="btn btn--primary" data-act="next"' + (valid(n) ? '' : ' disabled') + '>' + (n === 4 ? nextLabel() : n === 1 ? 'Далее' : 'Готово') + '</button></div></div>';
  }
  function updateBar() {
    var next = stage.querySelector('[data-act="next"]'), h = document.getElementById('scout-hint');
    if (next) next.disabled = !valid(st.step);
    if (h) h.textContent = hint();
  }
  function stepHead(title, text) {
    return '<div class="stack stack--2 scout-step__head"><h2 class="h2" id="scout-h" tabindex="-1">' + title + '</h2>' + (text ? '<p class="text">' + text + '</p>' : '') + '</div>';
  }

  /* ---------- свои картинки («＋ Свой интерьер» в окне выбора): подбираем похожие товары каталога, капсула не нужна ----------
     В прототипе распознавания нет — подборка из товаров каталога прототипа, одни и те же картинки дают ту же подборку */
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
  function stopVis() { if (visRecog && visRecog.timer) clearTimeout(visRecog.timer); visRecog = null; }
  function onVisFiles(list) {
    var files = Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name || ''); }).slice(0, 12);
    if (!files.length) { S.ui.toast('Нужны картинки: JPG, PNG или WEBP', 'error'); return; }
    var meta = files.map(function (f) { return { name: String(f.name || 'картинка').slice(0, 80), size: f.size || 0 }; });
    stopVis(); visRecog = { stage: 0, files: meta, timer: null };
    if (st.step !== 1) { st.step = 1; st.gate = false; }       /* картинки выбрали из окна на шаге 4 — подбор виден на шаге «Интерьер» */
    focusAfter = '#scout-h'; render();
    (function tick() {
      visRecog.timer = setTimeout(function () {
        if (!visRecog) return;
        visRecog.stage += 1;
        if (visRecog.stage < VIS_STAGES.length) { render(); tick(); return; }
        st.visuals = { files: visRecog.files, items: composeVisuals(visRecog.files) };
        st.source = 'visuals'; urlPick = null; visRecog = null; touch(); focusAfter = '[data-int-open]'; render();
        S.ui.toast('Подобрали ' + st.visuals.items.length + ' ' + pl(st.visuals.items.length, ['товар', 'товара', 'товаров']) + ' по вашим картинкам — капсула не нужна', 'ok');
      }, 900);
    })();
  }
  /* поле выбора картинок — вне сцены (сцена перерисовывается): «＋ Свой интерьер» открывает его синхронно в нажатии, иначе iOS не покажет выбор */
  var visInput = document.getElementById('scout-vis-file');
  if (!visInput) { visInput = document.createElement('input'); visInput.type = 'file'; visInput.id = 'scout-vis-file'; visInput.accept = 'image/*'; visInput.multiple = true; visInput.hidden = true; document.body.appendChild(visInput); }
  visInput.addEventListener('change', function () { onVisFiles(visInput.files); visInput.value = ''; });

  /* ---------- окно выбора интерьера (SOVE.capsulePicker) ----------
     Окно само записывает выбор в объект (apply) — сюда приходит готовый выбор: капсула и тип ремонта. Без модуля — каталог с возвратом */
  /* выбранная капсула — сразу интерьер квартиры (шапка «Интерьер», Мой ремонт, Планировка): та же запись, что у окна (apply) (Алина 10.11) */
  function applyCapsule(id) {
    var P = S.capsulePicker; if (!P || !P.apply || !okCapsule(id)) return;
    selfWrite(function () { P.apply({ capsuleId: id, level: st.level }, { entry: 'budget' }); });
  }
  function openPicker(focusSel) {
    var P = S.capsulePicker;
    if (!P) { location.href = 'capsules.html?pick=1&returnTo=' + encodeURIComponent(here()); return; }
    var cur = urlPick || (!isVis() && okCapsule(st.capsuleId) ? st.capsuleId : undefined);   /* капсула из адреса — предвыбор, пока человек не выбрал сам */
    P.open({ entry: 'budget', current: cur, level: st.level, own: true,
      onOwn: function () { if (!visRecog) visInput.click(); },
      onPick: function (res) {
        if (!res || !okCapsule(res.capsuleId)) return;
        urlPick = null; stopVis();
        st.capsuleId = res.capsuleId; st.source = 'capsule'; capsOpen = false; st.level = res.level === 'premium' ? 'premium' : 'base';
        applyCapsule(st.capsuleId);
        touch(); focusAfter = focusSel || '[data-int-open]'; render();
      } });
  }
  /* тип ремонта с шага 4 — та же запись, что у окна (apply): квартира, интерьер, расчёт и бюджет Планировки с одним типом */
  function setLevel(v) {
    v = v === 'premium' ? 'premium' : 'base'; if (v === st.level) return;
    st.level = v; touch();
    selfWrite(function () {
      var P = S.capsulePicker, cap = !isVis() && okCapsule(st.capsuleId) ? st.capsuleId : null;
      if (P && P.apply && cap && currentCapsule() === cap) P.apply({ capsuleId: cap, level: v }, { entry: 'budget' });
      else if (S.my) S.my.set({ level: v });
    });
    focusAfter = '[data-level="' + v + '"]'; render();
  }

  /* ---------- окно «Основа квартиры» (plan-upload.js): план застройщика, обмерный, дизайн-проект — без фото ----------
     Файл плана пишет окно, комнаты — Планировка (скан). onClose — на любое закрытие: и после «Пока без комнат», и на «×»
     с шага «Распознать комнаты», когда план уже в объекте (раньше Бюджет об этом не узнавал) */
  function openPlanWindow(focus) {
    if (!S.planUpload) { S.ui.toast('Загрузка плана сейчас недоступна — впишите площадь вручную', 'error'); return; }
    S.planUpload.open({ entry: 'budget', cards: ['developer_plan', 'measured_plan', 'design_project'],
      beforeLeave: function () { persist(); },
      onClose: function (res) {
        if (res && res.kind && res.kind !== 'plan') return;
        var ch = syncPlan(!!(res && res.use));   /* «Взять этот план» — комнаты плана поверх ручного ввода */
        touch(); focusAfter = focus || '[data-plan-open]'; render();
        if (ch.rooms || (res && res.use && st.plan && st.plan.mode === 'plan')) roomsToast();
      } });
  }
  function roomsToast(x) {
    var n = st.plan && st.plan.mode === 'plan' ? roomsCount() : x ? x.n : 0, m2 = st.plan && st.plan.mode === 'plan' ? totalArea() : x ? x.m2 : 0;
    if (n || m2) S.ui.toast('Комнаты из плана: ' + [n || '', m2 ? F.area(m2) : ''].filter(Boolean).join(' · '), 'ok');
  }

  /* ---------- шаг 1: интерьер ----------
     Ничего не выбрано — широкая плитка «＋ Выбрать интерьер» сверху (открывает окно). Выбрано — карточка как в окне и «＋ Другой интерьер»,
     под ними тип ремонта одной строкой со «Сменить». Ниже — одна кнопка загрузки плана (окно с тремя вариантами) */
  function addTile(wide, title, sub) {
    return '<button type="button" class="scout-int__add' + (wide ? ' scout-int__add--wide' : '') + '" data-int-open aria-haspopup="dialog">' +
      '<span class="scout-int__plus" aria-hidden="true">' + ICON.plus + '</span><span class="scout-int__tt"><b>' + title + '</b><small>' + sub + '</small></span></button>';
  }
  function ownCard(o) {
    return '<div class="scout-int__vis' + (o.on ? ' is-on' : '') + '"' + (o.busy ? ' aria-busy="true"' : '') + '><span class="scout-int__pic">' +
        (o.img ? '<img src="' + esc(o.img) + '" alt="" loading="lazy" width="560" height="430">' : '<i class="scout-int__spin" aria-hidden="true"></i>') +
        (o.on ? '<span class="scout-int__ok" aria-hidden="true">' + ICON.check + '</span>' : '') + '</span>' +
      '<span class="scout-int__b"><b class="scout-int__name">' + esc(o.name) + '</b><small>' + o.sub + '</small>' + (o.foot || '') + '</span></div>';
  }
  function capCard(c) {
    var sub = ownBase() ? 'свой интерьер на её основе' : null;
    var html = S.capsulePicker && S.capsulePicker.card ? S.capsulePicker.card(c, { active: true, compact: true, tag: 'div', level: st.level, sub: sub })   /* уменьшенная (Алина 10.11) */
      : ownCard({ on: true, img: c.wide || c.cover, name: capName(c.id), sub: esc(sub || c.style || '') });
    return '<div class="scout-int__card">' + html + '</div>';
  }
  function visCard() {
    var first = st.visuals && st.visuals.items[0] && D.product(st.visuals.items[0].id), n = st.visuals ? st.visuals.items.length : 0;
    return ownCard({ on: true, img: first ? first.img : '', name: 'Свой интерьер', sub: 'По вашим картинкам · ' + n + ' ' + pl(n, ['товар', 'товара', 'товаров']) });
  }
  function busyCard() {
    var i = Math.min(visRecog.stage, VIS_STAGES.length - 1);
    return ownCard({ busy: true, name: 'Свой интерьер', sub: esc(VIS_STAGES[i]) + '…',
      foot: '<span class="scout-int__bar" role="presentation"><i style="width:' + Math.round((visRecog.stage + 1) / VIS_STAGES.length * 100) + '%"></i></span>' });
  }
  function interiorSlot() {
    var c = !isVis() && okCapsule(st.capsuleId), hasVis = !!(st.visuals && st.visuals.items.length);
    if (visRecog) return '<div class="scout-int">' + busyCard() + addTile(false, 'Другой интерьер', 'Капсула SOVEAPP') + '</div>';
    if (isVis()) return '<div class="scout-int">' + visCard() + addTile(false, 'Другой интерьер', 'Капсула или картинки') + '</div>' +
      '<div class="scout-int__acts"><button type="button" class="btn btn--link" data-act="drop-visuals">Убрать картинки</button></div>';
    var useVis = hasVis ? '<div class="scout-int__acts"><button type="button" class="btn btn--link" data-act="use-visuals">Считать по картинкам</button><button type="button" class="btn btn--link" data-act="drop-visuals">Убрать картинки</button></div>' : '';
    if (!c) return '<div class="scout-int">' + addTile(true, 'Выбрать интерьер', 'Капсула SOVEAPP или свои картинки') + '</div>' + useVis;
    return '<div class="scout-int">' + capCard(c) + addTile(false, 'Другой интерьер', 'Капсула или свои картинки') + '</div>' +
      '<div class="scout-lv"><span class="scout-lv__k">Тип ремонта</span><b class="scout-lv__v">' + LEVEL_SHORT[st.level] + '</b>' +
        '<button type="button" class="scout-lv__go" data-int-open aria-haspopup="dialog" aria-label="Сменить тип ремонта">Сменить</button></div>' + useVis;
  }
  /* одна кнопка загрузки — окно «Основа квартиры» с тремя вариантами («техпаспорт» убран, саммари п. 1) */
  function planRow() {
    var fromPlan = !!st.plan && st.plan.mode === 'plan', file = fromPlan ? (st.plan.fileName || st.planFile) : st.planFile, n = fromPlan ? roomsCount() : 0;
    var sub = fromPlan ? [esc(file || 'план из Моего ремонта'), n ? n + ' ' + pl(n, ['помещение', 'помещения', 'помещений']) : '', F.area(totalArea()), 'заменить'].filter(Boolean).join(' · ')
      : file ? esc(file) + ' · комнаты распознаем в Планировке'
      : 'С планом или дизайн-проектом бюджет точнее · необязательно';
    return '<button type="button" class="qs-opt scout-plan-row' + (fromPlan ? ' is-done' : '') + '" data-plan-open aria-haspopup="dialog">' +
      '<span class="qs-opt__ic">' + (fromPlan ? ICON.check : ICON.doc) + '</span>' +
      '<span class="qs-opt__t"><b>Загрузить план или дизайн‑проект</b><small>' + sub + '</small></span><span class="qs-opt__go" aria-hidden="true">›</span></button>';   /* неразрывный дефис: «дизайн‑проект» не рвётся */
  }
  function zkSoon() { return S.planUpload && S.planUpload.zkSoon ? S.planUpload.zkSoon() : ''; }   /* «Найти план у застройщика · скоро» — как в Планировке */
  /* шаг 1: снизу всплывающая лента капсул (Алина 10.11 — «клиент на этом шаге видит все капсулы»): тап по карточке — выбрать,
     «Все ›» — окно выбора с фильтрами, «×» — свернуть в «✦ Капсулы». Прокрутка вбок — только внутри ленты, страница не уезжает.
     Топа по популярности в данных нет — показываем все капсулы SOVEAPP по порядку каталога */
  /* лента не сворачивается, пока интерьер не выбран; выбрал — сворачивается в «✦ Капсулы», открыл снова — можно свернуть «×» (Алина 10.11) */
  var capsOpen = false;
  function capsRow() {
    var P = S.capsulePicker, ids = D.capsules.filter(function (c) { return okCapsule(c.id); }).map(function (c) { return c.id; });
    if (!P || !P.card || !ids.length) return '';
    var chosen = isVis() || !!okCapsule(st.capsuleId);
    if (chosen && !capsOpen) return '<aside class="scout-caps is-folded"><button type="button" class="scout-caps__fab" data-act="caps-open">✦ Капсулы · ' + ids.length + '</button></aside>';
    return '<aside class="scout-caps" aria-label="Капсулы SOVEAPP"><div class="scout-caps__h"><b>Капсулы SOVEAPP</b>' +
        '<button type="button" class="scout-caps__all" data-int-open aria-haspopup="dialog">Все · ' + ids.length + ' ›</button>' +
        (chosen ? '<button type="button" class="scout-caps__x" data-act="caps-fold" aria-label="Свернуть">×</button>' : '') + '</div>' +
      '<div class="scout-caps__row">' + ids.map(function (id) {
        return P.card(id, { compact: true, active: !isVis() && st.capsuleId === id, level: st.level, attrs: 'data-cap-pick="' + id + '"' });
      }).join('') + '</div></aside>';
  }
  /* лента над нижней кнопкой: отступ от низа = высота панели «Далее»; под лентой — место, чтобы она не закрывала строки плана */
  function placeCaps() {
    var el = stage.querySelector('.scout-caps'), bar = stage.querySelector('.scout-bar'); if (!el) return;
    var fixedBar = bar && getComputedStyle(bar).position === 'fixed';
    el.style.bottom = fixedBar ? (window.innerHeight - bar.getBoundingClientRect().top + 8) + 'px' : '';
    var pad = stage.querySelector('.scout-caps-pad'); if (pad) pad.style.height = (el.getBoundingClientRect().height + 16) + 'px';
    var on = el.querySelector('.cpk-card.is-on'), row = el.querySelector('.scout-caps__row');
    if (on && row) row.scrollLeft = on.offsetLeft - 8;
  }
  function viewStart() {
    return '<div class="scout-step scout-step--start">' +
      stepHead('Выберите интерьер', isVis() ? 'Считаем по вашим картинкам: подобрали похожие товары из каталога. Капсула не нужна.' : 'Капсула задаёт комплектацию: отделку, мебель, свет и сантехнику. Цена — за м² по ценам METOD.') +
      interiorSlot() +
      '<div class="stack stack--2 scout-plan-box"><span class="eyebrow">План квартиры</span>' + planRow() + zkSoon() + '</div>' +
      '<div class="scout-caps-pad" aria-hidden="true"></div>' + capsRow() + bar() + '</div>';
  }

  /* ---------- шаг 2: состояние — строки общего вида вопросов (q-style) ---------- */
  function stateOpt(s, on, one) {
    return '<button type="button" class="qs-opt scout-state' + (on ? ' is-on' : '') + (one ? ' scout-state--one' : '') + '" ' + (one ? 'data-state-open aria-expanded="false"' : 'data-state="' + s.id + '" aria-pressed="' + on + '"') + '>' +
      '<span class="qs-opt__t"><b>' + esc(s.name) + '</b><small>' + esc(s.note) + '</small></span>' +
      '<span class="qs-opt__aside"><b class="num">' + F.rub(s.rate) + '/м²</b>' + (s.estimate ? '<small class="badge badge--line">предварительный</small>' : '') + (one ? '<small class="scout-state__ch">изменить ›</small>' : '') + '</span>' +
      (one ? '' : '<span class="qs-opt__ok" aria-hidden="true"></span>') + '</button>';
  }
  function viewStateStep() {
    /* свёрнуто (Алина 27.10): состояние выбрано — одна строка «Бетон · 60 000 ₽/м² · изменить ›», список — по тапу */
    var one = st.stateId && !stateOpen ? byId(SC.states, st.stateId) : null;
    var hasEst = one ? !!one.estimate : SC.states.some(function (s) { return s.estimate; });
    var os = objectState(), note = os.unsure && !st.stateId ? '<p class="small muted scout-foot">В Моём ремонте отмечено «С отделкой» — выберите, что ближе: от этого зависит ставка работ.</p>' : '';
    return '<div class="scout-step scout-step--state">' +
      stepHead('Что сейчас в квартире?', 'Ставка работ бригады зависит от состояния стен — независимо от интерьера и типа ремонта.') + note +
      (one ? stateOpt(one, true, true) : '<div class="qs-list scout-states" role="group" aria-label="Что сейчас в квартире">' + SC.states.map(function (s) { return stateOpt(s, s.id === st.stateId, false); }).join('') + '</div>') +
      (hasEst ? '<p class="small muted scout-foot">«Предварительный» — ставку работ команда SOVEAPP ещё уточняет.</p>' : '') +
      bar() + '</div>';
  }

  /* ---------- шаг 3: площадь ---------- */
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
  /* один вид на все входы: сверху одна кнопка загрузки; план без комнат — подсказка и «Распознать комнаты» (скан Планировки, возврат сюда);
     ниже — помещения: из плана (можно поправить) или вручную */
  function viewPlanStep() {
    var f = flat();
    if (!st.plan) st.plan = manualWhole(f && f.m2 > 0 ? f.m2 : null, f && f.m2 > 0 ? 'object' : 'user');
    var fromPlan = st.plan.mode === 'plan', RP = objPlan(), lvl = R && st.planLevel ? (R.LEVEL[st.planLevel] || '') : '', body;
    if (fromPlan) {
      var pic = RP && RP.img ? '<figure class="col-7 stack stack--3"><div class="card scout-plan scout-plan--img"><img src="' + esc(RP.img) + '" alt="План квартиры"></div>' +
        '<figcaption class="small muted">Из Моего ремонта' + (lvl ? ' · ' + esc(lvl) : '') + '</figcaption></figure>' : '';
      body = '<div class="split scout-plan-grid">' + pic +
        '<div class="col-' + (pic ? '5' : '7') + ' stack"><h3 class="h4">Помещения</h3><p class="small muted">Комнаты и площади — из плана в Моём ремонте. Проверьте: их можно поправить, лишнее удалить, недостающее добавить.</p>' + roomsEditor() +
        '<p class="small muted"><button type="button" class="btn btn--link scout-inline" data-act="reset-plan">Ввести площадь вручную</button></p></div></div>';
    } else {
      var note = st.planFile ? '<div class="notice scout-plan-note"><span class="small">План «' + esc(st.planFile) + '» сохранён в Мой ремонт. Комнаты распознает Планировка — или впишите площадь ниже.</span><a class="arrow-link" href="' + esc(scanHref()) + '">Распознать комнаты</a></div>' : '';
      body = note + '<div class="split"><div class="col-7 stack stack--3">' + roomsEditor() + '</div></div>';
    }
    return '<div class="scout-step scout-step--area">' +
      stepHead('Площадь квартиры', fromPlan ? 'Площади — из комнат вашего плана: проверьте и поправьте.' : 'Впишите площадь квартиры — от неё считаем работы и комплектацию. Помещения можно добавить для точности.') +
      planRow() + zkSoon() + body + bar() + '</div>';
  }

  /* ---------- шаг 4: тип ремонта и формат — всегда; известное из объекта — сводкой сверху со «Сменить» / «Изменить» ---------- */
  function baseSummary() {
    var c = !isVis() && okCapsule(st.capsuleId), s = byId(SC.states, st.stateId), ar = totalArea(), n = roomsCount(), img = '', nm = '';
    if (isVis()) { var first = D.product(st.visuals.items[0].id), k = st.visuals.items.length; img = first ? first.img : ''; nm = 'По вашим картинкам · ' + k + ' ' + pl(k, ['товар', 'товара', 'товаров']); }
    else if (c) { img = c.wide || c.cover; nm = capName(c.id); }
    var areaSub = st.plan && st.plan.mode === 'plan' ? (n ? n + ' ' + pl(n, ['помещение', 'помещения', 'помещений']) + ' из плана' : 'из плана') : n > 1 ? n + ' ' + pl(n, ['помещение', 'помещения', 'помещений']) : '';
    function row(k, v, act) { return '<li class="scout-base__r"><span class="scout-base__k">' + k + '</span><span class="scout-base__v">' + v + '</span>' + act + '</li>'; }
    return '<ul class="scout-base" aria-label="Что знаем о квартире">' +
      row('Интерьер', (img ? '<img class="scout-base__pic" src="' + esc(img) + '" alt="" width="36" height="36" loading="lazy">' : '') + '<span class="scout-base__t"><b>' + esc(nm || '—') + '</b>' + (c && ownBase() ? '<small>свой интерьер на её основе</small>' : '') + '</span>', '<button type="button" class="scout-base__go" data-int-open aria-haspopup="dialog" aria-label="Сменить интерьер">Сменить</button>') +
      row('Площадь', '<span class="scout-base__t"><b class="num">' + (ar > 0 ? F.area(ar) : '—') + '</b>' + (areaSub ? '<small>' + areaSub + '</small>' : '') + '</span>', '<button type="button" class="scout-base__go" data-base-go="3" aria-label="Изменить площадь">Изменить</button>') +
      row('Состояние', '<b>' + esc(s ? s.name : '—') + '</b>', '<button type="button" class="scout-base__go" data-base-go="2" aria-label="Изменить состояние">Изменить</button>') +
    '</ul>';
  }
  function levelSeg() {
    var c = okCapsule(st.capsuleId);
    function sub(l) { var v = c ? (l === 'premium' ? c.pricePerM2Premium : c.pricePerM2) : 0; return v ? 'от ' + F.num(v) + ' ₽/м²' : l === 'premium' && c ? 'цена — в расчёте' : ''; }
    return '<section class="qs scout-q" aria-labelledby="scout-type-t"><div class="qs__h"><h3 class="qs__t" id="scout-type-t">Тип ремонта</h3></div>' +
      '<div class="scout-type"><div class="qs-seg" role="group" aria-labelledby="scout-type-t">' + LEVELS.map(function (l) {
        var on = st.level === l.id, s0 = sub(l.id);
        return '<button type="button" data-level="' + l.id + '" aria-pressed="' + on + '">' + LEVEL_SHORT[l.id] + (s0 ? '<small>' + s0 + '</small>' : '') + '</button>';
      }).join('') + '</div><button type="button" class="arrow-link scout-cls-link" data-classifier="1">Что входит</button></div></section>';
  }
  /* ── шаг 2: вопросы одной страницей в виде Планировки — заголовок, группы, белая карточка на вопрос; известное — одной строкой с «изменить ›».
     План загружен — площадь и комнаты подставлены по нему (метка «по плану»), из Моего ремонта — «из объекта» ── */
  function missing() {
    var m = [];   /* в порядке экрана — подсказка и прокрутка ведут к первому незаполненному сверху */
    if (!st.city) m.push({ k: 'city', t: 'город' });
    if (!valid(3)) m.push({ k: 3, t: 'площадь' });
    if (!valid(2)) m.push({ k: 2, t: 'что сейчас в квартире' });
    if (!st.purpose) m.push({ k: 'purpose', t: 'для чего ремонт' });
    if (!needsNow().length) m.push({ k: 'needs', t: 'как будете делать ремонт' });
    return m;
  }
  /* кнопка расчёта не мёртвая: тост, экран едет к первому пропущенному вопросу и подсвечивает его (как в Планировке) */
  function needAnswers() {
    var m = missing(); if (!m.length) return false;
    S.ui.toast('Заполните пункты выше: ' + m.map(function (x) { return x.t; }).join(', '));
    var el = stage.querySelector('[data-need="' + m[0].k + '"]');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('sq-need'); void el.offsetWidth; el.classList.add('sq-need'); setTimeout(function () { el.classList.remove('sq-need'); }, 2600); }
    return true;
  }
  function byPlan() { return !!st.plan && st.plan.mode === 'plan' && valid(3); }
  /* все подписи анкеты — с большой буквы (Алина 10.11) */
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function sqGroup(t) { return '<b class="sq-group">' + t + '</b>'; }
  function sqFrom(n) { return n === 3 && byPlan() ? '<em class="sq-from">По плану</em>' : st.auto[n] && valid(n) ? '<em class="sq-from">Из объекта</em>' : ''; }
  function sqCard(need, title, aside, body) {
    return '<section class="sq-card"' + (need ? ' data-need="' + need + '"' : '') + '><div class="sq-card__h"><b>' + title + '</b>' + (aside || '') + '</div>' + body + '</section>';
  }
  function sqOne(attr, main, sub, act, empty, pic) {
    return '<button type="button" class="sq-one' + (empty ? ' is-empty' : '') + '" ' + attr + '>' + (pic ? '<img class="sq-one__pic" src="' + esc(pic) + '" alt="" width="44" height="44" loading="lazy">' : '') + '<span class="sq-one__t"><b>' + cap(main) + '</b>' + (sub ? '<small>' + cap(sub) + '</small>' : '') + '</span><em>' + cap(act) + ' ›</em></button>';
  }
  /* без плана (Алина 10.11): площадь — поле прямо в карточке, ниже комнаты и санузлы. Есть план — площадь из него одной строкой с «изменить ›».
     Комнаты и санузлы пишем в квартиру (flat.layout, flat.rooms, flat.baths): Мой ремонт и Планировка не спросят снова */
  /* 1к и евро-2 — одно и то же (Алина 10.11): одна кнопка на пару; число — жилые комнаты */
  var LAYOUTS = [['studio', 'студия', 0], ['1k', '1к · евро-2', 1], ['2k', '2к · евро-3', 2], ['3k', '3к · евро-4', 3], ['4k', '4к · евро-5', 4]];
  function layoutNow() { var f = flat(), v = st.layout || (f && f.layout) || null; return LAYOUTS.some(function (x) { return x[0] === v; }) ? v : null; }
  function bathsNow() { var f = flat(); return st.baths || (f && f.baths) || null; }
  function multiRooms() { return st.plan && st.plan.rooms.filter(function (r) { return r.area > 0; }).length > 1; }
  function sqArea() {
    var ar = totalArea(), n = roomsCount();
    if (byPlan() || multiRooms()) {
      /* план загружен — комнаты и санузлы считываем с него, вопросы «Сколько комнат» и «Сколько санузлов» не задаём (Алина 10.11) */
      var wet = st.plan.rooms.filter(function (r) { return r.area > 0 && /сан|ванн|туал|с\/у|wc/i.test(r.name || ''); }).length;
      var sub = [n ? n + ' ' + pl(n, ['помещение', 'помещения', 'помещений']) : '', wet ? wet + ' ' + pl(wet, ['санузел', 'санузла', 'санузлов']) : '', byPlan() ? 'из плана' : ''].filter(Boolean).join(' · ');
      /* распознанные комнаты — как было: список помещений с площадями, их можно поправить, удалить, добавить; внизу «ввести вручную ›» (Алина 10.11) */
      /* «Добавить помещение» в анкете не показываем — зоны берём из плана (Алина 10.11) */
      return sqCard(3, 'Площадь', sqFrom(3), '<small class="sq-note">' + cap(sub) + '</small>' + roomsEditor().replace('<button type="button" class="btn btn--link" data-act="add-room">Добавить помещение</button>', '') +
        '<button type="button" class="sq-link sq-manual" data-act="area-manual">Ввести площадь вручную ›</button>');
    }
    var v = ar > 0 ? String(Math.round(ar * 10) / 10).replace('.', ',') : '';
    var f = flat(), lay = layoutNow(), bt = bathsNow();
    return sqCard(3, 'Площадь квартиры', sqFrom(3),
        '<label class="sq-area"><input class="input" id="sq-area" data-area-q type="text" inputmode="decimal" maxlength="6" placeholder="например, 45" value="' + v + '" aria-label="Площадь квартиры, м²"><span>м²</span></label>' +
        '<div class="sq-plan-ask"><span><b>С планом бюджет точнее</b><small>Комнаты, санузлы и стены возьмём из плана или дизайн-проекта — ничего не придётся вписывать</small></span>' +
          '<button type="button" class="sq-plan-ask__go" data-plan-open aria-haspopup="dialog">Загрузить план</button></div>') +
      sqCard('', 'Сколько комнат', f && f.layout && !st.layout ? '<em class="sq-from">Из объекта</em>' : '', sqChips('data-layout', LAYOUTS.map(function (x) { return [x[0], x[1]]; }), lay)) +
      sqCard('', 'Сколько санузлов', f && f.baths && !st.baths ? '<em class="sq-from">Из объекта</em>' : '', sqChips('data-baths', [['1', '1'], ['2', '2'], ['3', '3']], bt ? String(bt) : null));
  }
  function sqState() {
    var cur = byId(SC.states, st.stateId), body;
    function line(x) { return esc(x.note); }   /* только подпись, без ставки за м² (Алина 10.11) */
    if (cur && !stateOpen) body = sqOne('data-state-open aria-expanded="false"', esc(cur.name), line(cur), 'изменить');
    else body = '<div class="sq-list" role="group" aria-label="Что сейчас в квартире">' + SC.states.map(function (x) {
      var on = x.id === st.stateId;
      return '<button type="button" class="sq-one sq-one--opt' + (on ? ' is-on' : '') + '" data-state="' + x.id + '" aria-pressed="' + on + '"><span class="sq-one__t"><b>' + esc(x.name) + '</b><small>' + line(x) + '</small></span></button>';
    }).join('') + '</div>';
    return sqCard(2, 'Что сейчас в квартире?', sqFrom(2), body);
  }
  function sqChips(attr, opts, cur, off) {
    return '<div class="qs-chips">' + opts.map(function (o) {
      var on = o[0] === cur, dis = off && off(o[0]);
      return '<button type="button" class="qs-chip" ' + attr + '="' + o[0] + '" aria-pressed="' + on + '"' + (dis ? ' disabled' : '') + '>' + esc(cap(o[1])) + '</button>';
    }).join('') + '</div>';
  }
  function sqCity() {
    return sqCard('city', 'Город', st.auto.city ? '<em class="sq-from">Из объекта</em>' : '', sqChips('data-city', [['msk', 'Москва'], ['other', 'другой город']], st.city) +
      (st.city === 'other' ? '<small class="sq-note">Строительную смету пока считаем только по Москве — посчитаем комплектацию</small>' : ''));
  }
  /* выбранный на шаге 1 интерьер и тип ремонта — ещё раз в блоке «Ремонт», с «сменить ›» (окно выбора капсулы, в нём и тип) (Алина 10.11) */
  function sqInterior() {
    var c = !isVis() && okCapsule(st.capsuleId), lv = LEVEL_SHORT[st.level] || LEVEL_SHORT.base;
    if (isVis()) { var first = D.product(st.visuals.items[0].id), k = st.visuals.items.length;
      return sqCard('', 'Интерьер', '', sqOne('data-int-open aria-haspopup="dialog"', 'По вашим картинкам', k + ' ' + pl(k, ['товар', 'товара', 'товаров']), 'сменить', false, first ? first.img : '')); }
    return sqCard('', 'Интерьер и тип ремонта', '', c
      ? sqOne('data-int-open aria-haspopup="dialog"', esc(capName(c.id)), 'Тип ремонта · ' + lv + (ownBase() ? ' · свой интерьер на её основе' : ''), 'сменить', false, c.wide || c.cover)
      : sqOne('data-int-open aria-haspopup="dialog"', 'не выбран', 'капсула SOVEAPP или свои картинки', 'выбрать', true));
  }
  function sqPurpose() {
    return sqCard('purpose', 'Для чего ремонт', st.auto.purpose ? '<em class="sq-from">Из объекта</em>' : '', sqChips('data-purpose', PURPOSE, st.purpose));
  }
  /* что входит в бюджет (Алина 10.11): «комплектация + работы» — только Москва. Тип ремонта (База / Премиум) здесь не повторяем —
     его выбирают вместе с интерьером, он виден в карточке «Интерьер и тип ремонта» */
  function sqLevel() {
    var sc = scope();
    var get = sc === 'kit' ? 'Получите только комплектацию по капсуле: отделку, мебель, свет и сантехнику — без работ'
      : 'Получите комплектацию по капсуле и строительную смету: работы бригады по вашей квартире';
    return sqCard('', 'Что посчитать', '<button type="button" class="sq-link" data-classifier="1">Что входит ›</button>',
      sqChips('data-scope', (st.city === 'msk' ? [['full', 'комплектация и работы']] : []).concat([['kit', 'комплектация']]), sc) +   /* вариант с работами открывается только для Москвы (Алина 10.11) */
      '<small class="sq-note">' + get + '</small>');
  }
  /* «Как будете делать ремонт?» — обязательный, классифицирует заявку (Алина 10.11): «делаю сам» — один; «нужен дизайн-проект» и
     «нужна бригада» — можно оба. В квартиру: leadNeeds ['self'] | ['design', 'crew'] и format — adept, если нужен дизайн-проект, иначе self
     (его читают следующие шаги). В квартире уже есть format из Планировки — подставляем: self → «делаю сам», adept → «нужен дизайн-проект» */
  var NEEDS = [['self', 'делаю сам'], ['design', 'нужен дизайн-проект'], ['crew', 'нужна бригада']];
  function needsNow() {
    if (st.needs) return st.needs;
    var f = flat(); if (f && f.leadNeeds && f.leadNeeds.length) return f.leadNeeds;
    return f && f.format === 'adept' ? ['design'] : f && f.format === 'self' ? ['self'] : [];
  }
  function setNeed(k) {
    var cur = needsNow().slice(), i = cur.indexOf(k);
    if (k === 'self') cur = i >= 0 ? [] : ['self'];
    else { cur = cur.filter(function (x) { return x !== 'self'; }); i = cur.indexOf(k); if (i >= 0) cur.splice(i, 1); else cur.push(k); }
    st.needs = cur; st.formatId = cur.indexOf('design') >= 0 ? 'adept' : 'self';
    if (R && R.flats.active()) selfWrite(function () { R.flats.update(R.flats.active().id, { leadNeeds: cur, format: st.formatId }); });
  }
  function sqFormat() {
    var cur = needsNow();
    return sqCard('needs', 'Как будете делать ремонт?', '',
      '<div class="qs-chips">' + NEEDS.map(function (o) {
        var on = cur.indexOf(o[0]) >= 0;
        return '<button type="button" class="qs-chip" data-need-pick="' + o[0] + '" aria-pressed="' + on + '">' + esc(cap(o[1])) + '</button>';
      }).join('') + '</div><small class="sq-note">Дизайнера и бригаду можно выбрать вместе</small>');
  }
  function viewFinish() {
    var auto = byPlan() ? ' · часть заполнили по плану — проверьте' : (st.auto[2] && valid(2)) || (st.auto[3] && valid(3)) ? ' · часть взяли из Моего ремонта — проверьте' : '';
    /* наверху — только интерьер и тип ремонта (выбраны на шаге 1); «Что посчитать», «Для чего ремонт», «Как будете делать» — в конце (Алина 10.11) */
    var body = sqGroup('Интерьер') + sqInterior() +
      sqGroup('О квартире') + sqCity() + sqArea() + sqState() +
      sqGroup('Ремонт') + (isVis() ? '' : sqLevel()) + sqPurpose() + sqFormat();
    var k = body.split('class="sq-card"').length - 1;   /* число вопросов — сколько карточек на экране (без плана их больше) */
    return '<div class="scout-step scout-step--finish sq">' +
      '<div class="sq-title"><h2 id="scout-h" tabindex="-1">Вопросы для расчёта</h2><span>' + k + ' ' + pl(k, ['вопрос', 'вопроса', 'вопросов']) + auto + '</span></div>' +
      body + bar() + '</div>';
  }


  /* ---------- счёт вместо результата: пара «капсула + тип ремонта» ещё не открыта ---------- */
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
  function viewInvoice() {
    if (isVis()) return viewInvoiceVis();
    var a = S.scout.access(accessParams()), c = D.capsule(st.capsuleId), cn = capName(c.id), lvn = LEVEL_SHORT[st.level], s = byId(SC.states, st.stateId);
    var payable = isPayable(a), recalc = a.kind === 'recalc-paid', soveCap = (c.type || 'sove') === 'sove';
    var def = (D.scoutAccess.defaults[c.type || 'sove'] || {});
    var metodHref = 'metod.html?returnTo=' + encodeURIComponent(here());
    var title = !payable ? 'Цена для этой капсулы не задана' : recalc ? 'Пересчёт по капсуле «' + esc(cn) + '» — по счёту' : 'Откройте расчёт по капсуле «' + esc(cn) + '»';
    var text = !payable ? 'Открыть расчёт по капсуле «' + esc(cn) + '»' + ' за оплату пока нельзя: цена уточняется. Параметры мы сохранили.'
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
          '<div class="scout-invoice__cap"><img src="' + c.cover + '" alt="Капсула «' + esc(cn) + '»" width="72" height="90"><div class="stack stack--2"><span class="eyebrow">Что открывается</span><span class="h4">' + esc(cn) + '</span><span class="small muted">' + esc(lvn) + '</span></div></div>' +
          '<div class="rows rows--tight"><div><span>Тип ремонта</span><span>' + esc(lvn) + '</span></div><div><span>Площадь</span><span class="num">' + F.area(totalArea()) + '</span></div><div><span>Состояние</span><span>' + esc(s.name) + '</span></div></div>' +
          (payable
            ? '<div class="scout-invoice__sum"><span class="small muted">К оплате</span><span class="row scout-invoice__price"><span class="mid-num num">' + F.rub(a.price) + '</span>' + (exampleMark() ? '<span class="badge badge--line">пример цены</span>' : '') + '</span></div>' +
              '<p class="small muted">Оплата рублями по счёту. Генерации не списываются.</p>'
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
    if (!R || !(st.step === 5 && valid(5))) return '';
    var r = calc(), d = budgetData(r), f0 = R.flats.active(), b0 = f0 ? R.get(f0.id).budget : null;
    /* этот расчёт уже в бюджете квартиры (сохранён сразу при выдаче или кнопкой) — ведём туда, а не предлагаем сохранить ещё раз */
    if (b0 && b0.total === d.total && b0.type === d.type) return '<a class="btn btn--primary scout-save" href="my.html?v=budget">Бюджет в Моём ремонте ›</a>';
    return R.saveButton('budget', d, 'Сохранить в Мой ремонт', 'btn btn--primary scout-save');
  }
  /* экран Бюджета без Планировки строит 9 + 5 и «По комнатам» из этого сохранения (my-budget.js, fromSaved): состояние, комнаты и разбивка — вместе с итогами */
  function budgetData(r) {
    return { type: st.level === 'premium' ? 'premium' : 'base', capsuleId: st.capsuleId, stateId: st.stateId, area: r.area, works: r.works, kitMetod: r.kitMetod, kitRetail: r.kitRetail, total: r.total,
      rooms: st.plan ? st.plan.rooms.filter(function (x) { return x.area > 0; }).map(function (x) { return { name: x.name, m2: x.area }; }) : [], byRooms: byRoomsData(r) };
  }
  function saveButton() {
    /* пришли из Бюджета Моего ремонта — расчёт уже в бюджете квартиры, возвращаем туда */
    if (st.fromInterior && st.step === 5 && valid(5)) return '<a class="btn btn--primary scout-save" href="my.html?v=budget">Открыть бюджет</a>';
    if (R && st.step === 5 && valid(5)) return repairButton();
    if (st.savedProjectId && S.projects.get(st.savedProjectId)) return '<a class="btn btn--primary scout-save" href="project.html?id=' + encodeURIComponent(st.savedProjectId) + '">Открыть проект</a>';
    return '<button type="button" class="btn btn--primary scout-save" data-act="save">Сохранить в проект</button>';
  }
  /* результат по картинкам: шапка и строки подборки */
  function resCapHtml(r) {
    var c = r.capsule;
    if (c) return '<div class="scout-res__cap"><img src="' + c.cover + '" alt="Капсула «' + esc(capName(c.id)) + '»" width="72" height="90"><div class="stack stack--2"><span class="eyebrow">Капсула</span><span class="scout-res__capname">' + esc(capName(c.id)) + '</span></div></div>';
    var first = r.visuals[0] && r.visuals[0].p, n = r.visuals.length;
    return '<div class="scout-res__cap">' + (first ? '<img src="' + first.img + '" alt="" width="72" height="90">' : '') + '<div class="stack stack--2"><span class="eyebrow">По вашим картинкам</span><span class="scout-res__capname">Подборка из каталога · ' + n + ' ' + pl(n, ['товар', 'товара', 'товаров']) + '</span></div></div>';
  }
  function visLinesHtml(r) {
    return r.visuals.map(function (l) {
      var q = (l.qty > 1 || l.perM2) ? ' <span class="muted num">× ' + l.qty + (l.perM2 ? ' м²' : ' шт.') + '</span>' : '';
      return '<li class="scout-line scout-line--kit"><span class="scout-line__name"><a class="link" href="product.html?id=' + l.p.id + '">' + esc(l.p.name) + '</a>' + q + '</span><span class="scout-line__pct"></span><span class="scout-line__retail num strike muted">' + F.rub(l.retail) + '</span><span class="scout-line__sum num green">' + F.rub(l.metod) + '</span></li>';
    }).join('');
  }
  /* ---------- «По комнатам» (созвон 28.10): бюджет по комнатам в одном стиле, суммы сходятся с r.works и r.kitMetod ----------
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
          /* по комнатам — только комплектация, бюджета на работы здесь нет (Алина 10.11); работы — в итоге и «Работы по этапам» */
          '<span class="rb-room__vals"><span class="rb-room__v rb-room__v--t"><small class="muted">Материалы и комплектация</small><b class="num">' + F.rub(x.kit) + '</b></span></span>' +
          '<span class="rb-room__ch" aria-hidden="true">▾</span>' +
        '</button>' +
        '<ul class="rb-cats" id="rb-cats-' + i + '" hidden>' + (cats || '<li class="rb-cat"><span class="rb-cat__n muted">Комплектации в этой комнате нет</span></li>') +
          '<li class="rb-cat rb-cat--sum"><span class="rb-cat__n">Комплектация комнаты</span><b class="rb-cat__v num">' + F.rub(x.kit) + '</b></li></ul>' +
      '</li>';
    }).join('');
    return '<section class="stack scout-rooms-b" aria-labelledby="scout-rooms-t">' +
      '<div class="scout-detail__head"><h3 class="h3" id="scout-rooms-t">По комнатам</h3><span class="small muted">' + n + ' ' + pl(n, ['комната', 'комнаты', 'комнат']) + ' · один стиль</span></div>' +
      (o.typical ? '<p class="small muted rb-note">Типовые зоны · загрузите план, чтобы считать точно.</p>' : '<p class="small muted rb-note">Нажмите на комнату — покажем комплектацию по категориям.</p>') +
      '<div class="rb-head rb-grid" aria-hidden="true"><span>Комната</span><span class="rb-room__vals"><span>Материалы и комплектация</span></span><span></span></div>' +
      '<ul class="rb-list">' + rows + '</ul>' +
      '<div class="rb-sum rb-grid"><span class="rb-room__name"><b>Вся квартира</b><small class="muted num">' + F.area(r.area) + '</small></span>' +
        '<span class="rb-room__vals"><span class="rb-room__v rb-room__v--t"><small class="muted">Материалы и комплектация</small><b class="num">' + F.rub(o.kit) + '</b></span></span><span></span></div>' +
    '</section>';
  }
  function viewResult() {
    var r = calc(), c = r.capsule, rq = issuedRequest();
    /* цифры берём из заявки Расчёт бюджета: повторный расчёт показывает ровно то, что было выдано */
    if (rq && rq.result && rq.result.total > 0 && rq.result.area === r.area && sameScope(rq)) {
      r.works = rq.result.works; r.kitMetod = rq.result.kitMetod; r.kitRetail = rq.result.kitRetail; r.total = rq.result.total;
      r.perM2 = r.total / r.area; r.save = r.kitRetail - r.kitMetod; r.savePct = Math.round(r.save / r.kitRetail * 100);
    }
    var reqLine = rq ? '<p class="small scout-req"><b class="num">Заявка на расчёт № ' + rq.number + '</b><br>основание: ' + esc(S.scout.basisLabel(rq.basis)) + ', <span class="muted" style="white-space:nowrap">' + esc(F.dateLong(rq.ts)) + '</span></p>' : '';
    /* Премиум у капсулы без своей цены Премиума (k1–k6) — по ценам Базы; у k7 цена Премиума есть (83 000 ₽/м²) — пометки нет */
    var premiumNote = (r.level.sameAsBase && !r.visuals) ? '<div class="notice"><span class="small">В прототипе сумма для Премиума посчитана как для Базы — данные калькулятора подключаются на сервере.</span></div>' : '';
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
        '<h3 class="h3">' + (c ? 'Адаптируем «' + esc(capName(c.id)) + '» под вашу квартиру' : 'Соберём дизайн-проект по вашим картинкам') + '</h3><p class="small muted grow">' + (c ? 'Дизайнер переложит капсулу на вашу планировку' : 'Дизайнер разложит подборку по вашей планировке') + ': расстановка, визуализации, чертежи. Расчёт бюджета передадим вместе с заявкой. От <span class="num">' + F.rub(adeptFrom) + '/м²</span>.</p><span class="arrow-link">Перейти к дизайн-проекту</span></a>',
      track: '<a class="card card--pad card--link scout-next" href="track.html' + tail + '"><span class="row row--between"><span class="eyebrow">Ремонт под ключ</span>' + (st.formatId === 'track' ? '<span class="badge badge--line">ваш формат</span>' : '') + '</span>' +
        '<h3 class="h3">Сделаем ремонт по этому расчёту</h3><p class="small muted grow">Команда SOVEAPP ведёт работы по этапам из сметы. Акты, сроки и оплаты видны в личном кабинете.</p><span class="arrow-link">Перейти к ремонту под ключ</span></a>',
      /* «Делаю сам» (саммари п. 12): раздел специалистов — мастера на отдельные работы; текст карточки — на согласование с Алиной */
      masters: '<a class="card card--pad card--link scout-next" href="executors.html?sec=masters"><span class="row row--between"><span class="eyebrow">Строители, дизайнеры и мастера</span>' + (st.formatId === 'self' ? '<span class="badge badge--line">ваш формат</span>' : '') + '</span>' +
        '<h3 class="h3">Мастера на отдельные работы</h3><p class="small muted grow">Партнёры METOD для отдельных работ — заявка уходит в чат с мастером.</p><span class="arrow-link">Выбрать мастера</span></a>'
    };
    var order = st.formatId === 'self' ? ['masters', 'adept'] : st.formatId === 'track' ? ['track', 'adept'] : ['adept', 'track'];
    var nextLead = st.formatId === 'self' ? 'Вы делаете ремонт сами: сохраните расчёт — смета и список товаров останутся в Моём ремонте. Для отдельных работ — мастера-партнёры METOD.'
      : st.formatId === 'track' ? 'Вы выбрали ремонт под ключ — расчёт уйдёт в ремонт под ключ вместе с заявкой.' : 'Вы выбрали дизайн-проект — расчёт уйдёт в дизайн-проект вместе с заявкой.';

    /* ── финальная страница в логике раздела «Бюджет» Моего ремонта (Алина 10.11): плановый бюджет → по категориям (9 строк B.KIT) →
       по комнатам (только комплектация) → строительные работы одной суммой на объект (5 этапов B.WORKS). Цифры те же, что уйдут в «Бюджет»
       при сохранении: категории = Σ byCat по комнатам, этапы — 7 этапов расчёта в 5 этапов договора (как fromSaved в my-budget.js) ── */
    var B = window.SOVE_BUDGET, split = roomsSplit(r), rooms = split ? split.rooms : [];
    var kv = {}; rooms.forEach(function (x) { Object.keys(x.byCat || {}).forEach(function (k) { kv[k] = (kv[k] || 0) + (Number(x.byCat[k]) || 0); }); });
    var KIT = r.visuals ? [['visuals', 'Подборка по вашим картинкам']] : ((B && B.KIT) || []);
    var catTitle = {}; KIT.forEach(function (k) { catTitle[k[0]] = k[1]; });
    function frHead(t, sum) { return '<div class="fr-h"><b class="sq-group">' + t + '</b>' + (sum !== null && sum !== undefined ? '<span class="num">' + F.rub(sum) + '</span>' : '') + '</div>'; }
    function frList(items) {
      return '<section class="sq-card fr-list">' + items.map(function (x) {
        var kids = (x.kids || []).filter(function (k) { return k[1] > 0; });
        var body0 = '<span class="fr-r__n"><b>' + esc(x.name) + '</b>' + (x.sub ? '<small>' + x.sub + '</small>' : '') + '</span><b class="fr-r__v num">' + F.rub(x.sum) + '</b>';
        /* раскрытие витриной позиций или строками работ — как в «Бюджете» Моего ремонта (Алина 10.11) */
        if (x.html) return '<div class="fr-it"><button type="button" class="fr-r" data-fr-toggle aria-expanded="false">' + (x.num ? '<span class="fr-r__num">' + x.num + '</span>' : '') + body0 + '<span class="fr-r__a" aria-hidden="true">▾</span></button>' +
          '<div class="fr-kids fr-kids--goods" hidden>' + x.html + '</div></div>';
        var body = '<span class="fr-r__n"><b>' + esc(x.name) + '</b>' + (x.sub ? '<small>' + x.sub + '</small>' : '') + '</span><b class="fr-r__v num">' + F.rub(x.sum) + '</b>';
        if (!kids.length) return '<div class="fr-it"><div class="fr-r">' + body + '<span class="fr-r__a"></span></div></div>';
        return '<div class="fr-it"><button type="button" class="fr-r" data-fr-toggle aria-expanded="false">' + body + '<span class="fr-r__a" aria-hidden="true">▾</span></button>' +
          '<div class="fr-kids" hidden>' + kids.map(function (k) { return '<div class="fr-kid"><span>' + esc(k[0]) + '</span><b class="num">' + F.rub(k[1]) + '</b></div>'; }).join('') + '</div></div>';
      }).join('') + '</section>';
    }
    var capId = c ? c.id : '';
    var catItems = KIT.map(function (k) {
      return { name: k[1], sum: kv[k[0]] || 0, html: B && B.goodsHtml && capId ? B.goodsHtml(B.capsuleGoods(capId, k[0], st.level), 'Позиции этой категории появятся после подбора') : '', kids: rooms.map(function (x) { return [x.name, (x.byCat || {})[k[0]] || 0]; }) };
    }).filter(function (x) { return x.sum > 0; });
    var roomItems = rooms.map(function (x) {
      return { name: x.name, sub: '<span class="num">' + F.area(x.area) + '</span>', sum: x.kit, html: B && B.goodsHtml && capId ? B.goodsHtml(B.roomGoods(capId, x.zone, st.level), 'Позиции этой комнаты появятся после подбора') : '', kids: KIT.map(function (k) { return [k[1], (x.byCat || {})[k[0]] || 0]; }) };
    });
    /* работы — общая сумма на объект, по комнатам не делим */
    var W7 = {}; stageRows.forEach(function (x) { W7[x[0]] = x[2]; });
    var secondary = st.stateId === 'secondary';
    var wv = { demolition: secondary ? W7['Демонтаж'] || 0 : 0, rough: (secondary ? 0 : W7['Демонтаж'] || 0) + (W7['Стены и перегородки'] || 0),
      engineering: (W7['Водоснабжение и канализация'] || 0) + (W7['Электрика, свет, двери'] || 0), prefinish: 0, finish_works: (W7['Полы'] || 0) + (W7['Потолки'] || 0) + (W7['Финальная сдача'] || 0) };
    var workItems = ((B && B.WORKS) || []).map(function (w, i) { return { n: i + 1, key: w[0], name: w[1], sum: Math.round(wv[w[0]] || 0) }; }).filter(function (w) { return w.sum > 0; });   /* n — номер этапа договора, как в «Бюджете» */
    var wd = Math.round(r.works) - workItems.reduce(function (a, w) { return a + w.sum; }, 0); if (wd && workItems.length) workItems[workItems.length - 1].sum += wd;   /* округление — в последний этап */
    var worksHtml = r.works > 0
      ? frHead('Строительные работы', r.works) +
        frList(workItems.map(function (w) { var ln = B.workLines ? B.workLines(w.key) : []; return { num: w.n, name: w.name, sum: w.sum, html: ln.length ? B.linesHtml(ln) : '' }; })).replace('<section class="sq-card fr-list">', '<section class="sq-card fr-list"><small class="sq-note">Общая сумма на объект · по комнатам не делится</small>').replace(/<\/section>$/, planWorksHtml + '</section>')
      : frHead('Строительные работы', null) + '<section class="sq-card"><small class="sq-note">' + (st.city === 'msk'
          ? 'Выбрана только комплектация. <button type="button" class="sq-link sq-link--in" data-act="edit">Посчитать с работами ›</button>'
          : 'Строительную смету считаем по Москве') + '</small></section>';
    var vFirst = r.visuals && r.visuals[0] && r.visuals[0].p;
    var heroImg = c ? (c.wide || c.cover) : vFirst ? vFirst.img : '', heroName = c ? esc(capName(c.id)) : 'Подборка из каталога';
    var nRooms = roomsCount(), layX = LAYOUTS.filter(function (x) { return x[0] === layoutNow(); })[0], bathsN = byPlan() ? rooms.filter(function (x) { return x.zone === 'bathroom'; }).length : bathsNow();
    var heroChips = [r.visuals ? '' : esc(r.level.name), '<span class="num">' + F.area(r.area) + '</span>', st.city === 'msk' ? 'Москва' : '', esc(r.state.name),
      byPlan() && nRooms ? nRooms + ' ' + pl(nRooms, ['помещение', 'помещения', 'помещений']) : layX ? esc(cap(layX[1])) : '',
      bathsN ? bathsN + ' ' + pl(bathsN, ['санузел', 'санузла', 'санузлов']) : ''].filter(Boolean);

    return '<div class="scout-step scout-step--result sq fr">' +
      '<div class="sq-title"><h2 id="scout-h" tabindex="-1">Ваш бюджет</h2></div>' +
      (savedPr ? '<div class="notice notice--ok" role="status"><span class="small"><b>Расчёт сохранён в проект «' + esc(savedPr.name) + '».</b> Он появился в кабинете вместе с капсулой и площадью.</span><a class="btn btn--dark btn--sm" href="project.html?id=' + encodeURIComponent(savedPr.id) + '">Открыть проект</a></div>' : '') +
      premiumNote +

      /* продающая карточка итога (Алина 10.11): фото выбранного интерьера, параметры квартиры и плановый бюджет — светлая, фото не затемняем */
      '<section class="sq-card fr-hero">' +
        (heroImg ? '<span class="fr-hero__pic"><img src="' + esc(heroImg) + '" alt="" loading="lazy"></span>' : '') +
        '<div class="fr-hero__b">' +
          '<div class="fr-hero__top"><small class="fr-k">' + (r.visuals ? 'Интерьер по вашим картинкам' : 'Интерьер') + '</small><b class="fr-hero__name">' + heroName + '</b></div>' +
          '<div class="fr-chips">' + heroChips.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>' +
          '<div class="fr-hero__sum"><small class="fr-k">Плановый бюджет</small>' +
            '<div class="fr-total__row"><b class="fr-big num">' + F.rub(r.total) + '</b><span class="fr-per num">' + F.rub(r.perM2) + '/м²</span></div>' +
            '<div class="fr-parts"><span>Комплектация <b class="num">' + F.rub(r.kitMetod) + '</b></span>' + (r.works > 0 ? '<span>Работы <b class="num">' + F.rub(r.works) + '</b></span>' : '') + '</div>' +
            (r.save > 0 ? '<div class="fr-save"><span>Экономия с подпиской METOD</span><b class="num">−' + F.rub(r.save) + '</b></div>' : '') +
          '</div>' +
        '</div>' +
      '</section>' +

      (catItems.length ? frHead('По категориям', r.kitMetod) + frList(catItems) : '') +
      (roomItems.length ? frHead('По комнатам', r.kitMetod) + (split && split.typical ? '<small class="sq-note fr-note">Типовые зоны · загрузите план, чтобы считать точно</small>' : '') + frList(roomItems) : '') +
      worksHtml +

      '<div class="fr-acts">' + saveButton() +
        /* одна кнопка «Скачать» с выбором формата и рядом «Открыть в Моём ремонте» (Алина 10.11); в прототипе файл не формируется */
        '<div class="fr-acts__row"><div class="fr-dl"><button type="button" class="btn btn--ghost" data-act="dl-toggle" aria-expanded="false" aria-haspopup="true">Скачать ▾</button>' +
          '<div class="fr-dl__menu" hidden><button type="button" data-act="pdf">PDF</button><button type="button" data-act="xls">Excel</button></div></div>' +
        '<a class="btn btn--ghost" href="my.html?v=budget">Открыть бюджет в Моём ремонте</a></div>' +
        '<small class="sq-note fr-acts__note">В Моём ремонте можно заменить позиции бюджета</small>' +
        '<button type="button" class="sq-link" data-act="edit">Изменить параметры ›</button>' +
      '</div>' +
      '<p class="small muted scout-disclaimer">Предварительный расчёт. Точная смета — по дизайн-проекту.</p>' +

      /* «Дальше» — сжато, двумя строками (Алина 10.11): есть дизайн-проект — подключаем строителей и мастеров;
         дизайн-проекта нет — зовём в Планировку (если плана нет) и в Интерьер */
      (function () {
        var hasDP = st.planLevel === 'design_project', hasPlan = !!st.planFile || byPlan();
        function nx(href, t, sub) { return '<a class="fr-nx" href="' + href + '"><span class="fr-r__n"><b>' + t + '</b><small>' + sub + '</small></span><span class="fr-nx__a" aria-hidden="true">›</span></a>'; }
        var rowsN = hasDP
          ? nx('executors.html?sec=builders', 'Строители', 'Бригада на ремонт по вашему дизайн-проекту') + nx('executors.html?sec=masters', 'Мастера', 'На отдельные работы')
          : (hasPlan ? '' : nx('plan-demo.html', 'Планировка', 'Загрузите план — бюджет станет точнее')) + nx('interior.html', 'Интерьер', 'Соберите интерьер под свою квартиру');
        return frHead('Дальше', null) + '<section class="sq-card fr-list fr-nexts">' + rowsN + '</section>' +
          '<button type="button" class="sq-link fr-restart" data-act="restart">Начать новый расчёт ›</button>';
      })() +
      bar() + '</div>';
  }

  /* ---------- отрисовка ---------- */
  function render() {
    if (st.step <= 3) st.auto[st.step] = false;   /* шаг на экране — человек его видел: из линии шагов он больше не пропадает, «Назад» ведёт на него */
    renderHead(); renderSteps();
    var note = restoredNote ? '<p class="small muted scout-restored">Вернули ваш незаконченный расчёт — продолжайте с того же места. <button type="button" class="btn btn--link" data-act="restart">Начать заново</button></p>' : '';
    var html = st.step === 1 ? viewStart() : st.step === 2 ? viewStateStep() : st.step === 3 ? viewPlanStep() : st.step === 4 ? (st.gate ? viewInvoice() : viewFinish()) : viewResult();
    stage.innerHTML = note + html;
    document.body.classList.toggle('scout-is-result', st.step === 5);
    if (st.step === 1) placeCaps();
    if (focusAfter) { var el = stage.querySelector(focusAfter); if (el) { try { el.focus({ preventScroll: focusAfter === '#scout-h' }); } catch (e) { el.focus(); } } focusAfter = null; }
  }
  function go(n) {
    n = Math.min(Math.max(1, n), maxStep());
    if (visRecog) stopVis();
    st.step = n; st.gate = false; payError = ''; restoredNote = false;
    focusAfter = '#scout-h'; render(); persist(); toTop();
  }

  /* ---------- сохранение в проект (кабинет, прежний путь) ---------- */
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
    S.ui.confirm({ title: 'Начать новый расчёт?', text: 'Очистим этот расчёт. План, интерьер и состояние квартиры снова возьмём из Моего ремонта; сохранённые расчёты останутся.', ok: 'Начать заново',
      onOk: function () {
        stopVis(); S.draft.clear('scout');
        var keepInt = st.fromInterior;
        st = blank(); if (keepInt !== undefined && qFromInt !== null) st.fromInterior = keepInt;
        if (project) st.prefilledFrom = project.id; else prefillFromObject(true);
        urlPick = null; stateOpen = false; startStep();
        restoredNote = false; focusAfter = '#scout-h'; render(); persist(); window.scrollTo(0, 0);
      } });
  }

  /* ---------- события ---------- */
  window.addEventListener('resize', function () { if (st.step === 1) placeCaps(); });
  stepsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b || b.disabled) return;
    go(Number(b.getAttribute('data-step')));
  });
  stage.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    /* карточка выбранной капсулы — нажатие тоже открывает окно (для клавиатуры и чтения с экрана — кнопки «Другой интерьер» и «Сменить») */
    if (!t && e.target.closest('.scout-int__card')) { openPicker('[data-int-open]'); return; }
    if (!t || t.disabled) return;
    var v;
    if (t.hasAttribute('data-int-open')) { openPicker(t.closest('.scout-base') ? '.scout-base [data-int-open]' : '[data-int-open]'); return; }
    if (t.hasAttribute('data-plan-open')) { openPlanWindow('[data-plan-open]'); return; }
    if ((v = t.getAttribute('data-base-go'))) { go(Number(v)); return; }
    if ((v = t.getAttribute('data-level'))) { setLevel(v); return; }
    if (t.hasAttribute('data-state-open')) { stateOpen = true; focusAfter = '[data-state="' + st.stateId + '"]'; render(); return; }
    if ((v = t.getAttribute('data-state'))) { if (byId(SC.states, v)) { st.stateId = v; stateOpen = false; touch(); keepState(); focusAfter = '[data-state-open]'; render(); } return; }
    if ((v = t.getAttribute('data-cap-pick'))) { if (okCapsule(v)) { urlPick = null; stopVis(); st.capsuleId = v; st.source = 'capsule'; capsOpen = false; applyCapsule(v); touch(); focusAfter = '[data-cap-pick="' + v + '"]'; render(); } return; }
    if (t.hasAttribute('data-fr-toggle')) { var fo = t.getAttribute('aria-expanded') === 'true', fk = t.nextElementSibling; t.setAttribute('aria-expanded', String(!fo)); if (fk) fk.hidden = fo; return; }
    if ((v = t.getAttribute('data-need-pick'))) { setNeed(v); touch(); focusAfter = '[data-need-pick="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-layout'))) { var lx = LAYOUTS.filter(function (x) { return x[0] === v; })[0]; if (lx) { st.layout = v; if (R && R.flats.active()) selfWrite(function () { R.flats.update(R.flats.active().id, { layout: v, rooms: lx[2] }); }); touch(); focusAfter = '[data-layout="' + v + '"]'; render(); } return; }
    if ((v = t.getAttribute('data-baths'))) { st.baths = +v; if (R && R.flats.active()) selfWrite(function () { R.flats.update(R.flats.active().id, { baths: +v }); }); touch(); focusAfter = '[data-baths="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-city'))) { st.city = v; st.auto.city = false; if (v === 'msk' && R && R.flats.active() && !R.flats.active().city) selfWrite(function () { R.flats.update(R.flats.active().id, { city: 'Москва' }); }); touch(); focusAfter = '[data-city="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-scope'))) { st.scope = v; touch(); focusAfter = '[data-scope="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-purpose'))) { st.purpose = v; st.auto.purpose = false; savePurpose(v); touch(); focusAfter = '[data-purpose="' + v + '"]'; render(); return; }
    if ((v = t.getAttribute('data-format'))) { st.formatId = v; if (R && R.flats.active()) selfWrite(function () { R.flats.update(R.flats.active().id, { format: v }); }); touch(); focusAfter = '[data-format="' + v + '"]'; render(); return; }
    if (t.getAttribute('data-classifier')) { openClassifier(st.level); return; }
    if (t.hasAttribute('data-room-toggle')) { var open = t.getAttribute('aria-expanded') === 'true', ul = document.getElementById(t.getAttribute('aria-controls')); t.setAttribute('aria-expanded', String(!open)); t.closest('.rb-room').classList.toggle('is-open', !open); if (ul) ul.hidden = open; return; }
    var act = t.getAttribute('data-act'); if (!act) return;
    if (act === 'next') {
      if (st.step === 4) { proceed(); return; }
      if (st.step === 2) keepState();                 /* предвыбор с главной («Бетон») подтверждён «Далее» — это ответ */
      if (st.step === 3 && !(st.fromPlan !== undefined && st.fromPlan !== null)) keepArea();
      go(nextFrom(st.step));
    }
    else if (act === 'pay') payOpen();
    else if (act === 'ungate') go(4);
    else if (act === 'back') go(prevFrom(st.step));
    else if (act === 'edit') go(4);
    else if (act === 'upload') openPlanWindow('[data-plan-open]');
    else if (act === 'reset-plan') { st.plan = manualWhole(totalArea() || null, 'user'); touch(); focusAfter = '[data-room-area]'; render(); }
    else if (act === 'add-room') { var id = 'n' + (++roomSeq); while (byId(st.plan.rooms, id)) id = 'n' + (++roomSeq); st.plan.rooms.push({ id: id, name: '', area: null }); st.plan.src = 'user'; touch(); focusAfter = '#rn-' + id; render(); }
    else if (act === 'del-room') { var row = t.closest('[data-room]'); if (row && st.plan.rooms.length > 1) { st.plan.rooms = st.plan.rooms.filter(function (r) { return r.id !== row.getAttribute('data-room'); }); st.plan.src = 'user'; touch(); focusAfter = '[data-act="add-room"]'; render(); } }
    else if (act === 'use-visuals') { if (st.visuals && st.visuals.items.length) { st.source = 'visuals'; touch(); focusAfter = '[data-int-open]'; render(); } }
    else if (act === 'drop-visuals') { st.visuals = null; st.source = 'capsule'; touch(); focusAfter = '[data-int-open]'; render(); }
    else if (act === 'vis-to-my') { if (st.visuals) { st.visuals.items.forEach(function (it) { S.my.addProduct(it.id); }); S.ui.toast('Подборка в «Мой ремонт» — ' + st.visuals.items.length + ' ' + pl(st.visuals.items.length, ['товар', 'товара', 'товаров']), 'ok'); } }
    else if (act === 'save') save();
    else if (act === 'dl-toggle') { var dm = t.nextElementSibling, dopen = t.getAttribute('aria-expanded') === 'true'; t.setAttribute('aria-expanded', String(!dopen)); if (dm) dm.hidden = dopen; }
    else if (act === 'pdf' || act === 'xls') { var dmn = t.closest('.fr-dl__menu'); if (dmn) { dmn.hidden = true; var dt = dmn.previousElementSibling; if (dt) dt.setAttribute('aria-expanded', 'false'); } S.ui.toast('В прототипе файл не формируется'); }
    else if (act === 'restart') restart();
    else if (act === 'area-manual') { st.plan = manualWhole(totalArea() || null, 'user'); st.auto[3] = false; touch(); focusAfter = '#sq-area'; render(); }
    else if (act === 'caps-fold' || act === 'caps-open') { capsOpen = act === 'caps-open'; render(); }
  });
  stage.addEventListener('input', function (e) {
    /* площадь без плана — поле в карточке вопросов: пишем сразу, без перерисовки (курсор не прыгает), подсказку над кнопкой обновляем */
    if (e.target.hasAttribute && e.target.hasAttribute('data-area-q')) {
      var a = parseFloat(String(e.target.value).replace(',', '.')), ok = a > 0 && a <= MAX_ROOM;
      st.plan = manualWhole(ok ? a : null, 'user'); st.auto[3] = false; touch(); if (ok) keepArea(); updateBar(); return;
    }
    var row = e.target.closest('[data-room]'); if (!row || !st.plan) return;
    var room = byId(st.plan.rooms, row.getAttribute('data-room')); if (!room) return;
    st.plan.src = 'user';
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
    touch(); renderSteps(); updateBar();
  });
  stage.addEventListener('focusout', function (e) {
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-room-area') || !st.plan) return;
    var row = e.target.closest('[data-room]'), room = row && byId(st.plan.rooms, row.getAttribute('data-room'));
    if (room && !room.bad) { room.raw = null; e.target.value = room.area ? String(room.area).replace('.', ',') : ''; }
  });

  /* объект поменялся не здесь (полоска «Интерьер не выбран» → окно, план дописался после «×», другая вкладка) — подтягиваем и перерисовываем.
     Свои записи (selfWrite), Планировка (from=plan, свои параметры) и ввод в поле площади не трогаем */
  function snap() { return JSON.stringify([st.capsuleId, st.source, st.level, st.stateId, st.planSig, st.planFile, st.plan && st.plan.mode, totalArea()]); }
  function onObject() {
    if (selfDepth || project || (st.fromPlan !== undefined && st.fromPlan !== null)) return;
    var a = document.activeElement; if (a && stage.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    var before = snap(), ch = prefillFromObject(false);
    if (snap() === before) return;
    if (st.step > maxStep()) st.step = maxStep();
    persist(); render();
    if (ch.rooms) roomsToast();
  }
  window.addEventListener('sove:repair', onObject);
  window.addEventListener('sove:capsule', function (e) {
    var d = e.detail || {};
    if (!selfDepth && okCapsule(d.capsuleId) && isVis()) st.source = 'capsule';   /* выбрали капсулу в окне с полоски — считаем по ней */
    if (d.capsuleId) urlPick = null;
    onObject();
  });

  /* вернулись со скана Планировки (plan-demo.html?…&scan=1 → scanned=1): итог забираем сами — общий тост окна не нужен, тост про комнаты один */
  var scanRes = S.planUpload && S.planUpload.lastScan ? S.planUpload.lastScan(true) : null;
  if (S.ui.qs('manual') && valid(1)) { st.step = 4; if (st.plan && st.plan.mode === 'plan' && !(totalArea() > 0)) st.plan = null; }   /* из скана «ввести вручную» — в анкету */
  if (scanRes) syncPlan(true);   /* план проверили — его комнаты поверх прежнего ручного ввода */
  if (scanRes && S.ui.qs('scanned') && st.step !== 5 && valid(1)) st.step = 4;
  if (scanRes && st.plan && st.plan.mode === 'plan') keepArea();   /* площадь плана — в квартиру (шапка «· 47 м²»), а не прежняя вписанная */   /* план проверили — сразу к вопросам (Алина 10.11); интерьер не выбран — остаёмся на шаге 1 */
  var fromUrl = cleanUrl();

  /* вернулись с оплаты, входа или METOD при открытом счёте: пара открыта — сразу показываем результат */
  var issuedOnLoad = resolveGate();
  if (qFromPlan !== null && S.ui.qs('step') === 'result' && validInputs()) { var ap0 = S.scout.access(accessParams()); issue('plan', ap0.kind === 'repeat' ? ap0.request : null); }
  if (issuedOnLoad) { restoredNote = false; persist(); }
  render();
  /* площадь, состояние и капсула с главной уже убраны из адреса — держим их в черновике (перезагрузка их не теряет);
     просто открытая страница черновик не создаёт — иначе перезагрузка показала бы «Вернули ваш незаконченный расчёт» */
  if (fromUrl) persist();
  if (issuedOnLoad) setTimeout(function () { S.ui.toast('Расчёт открыт · заявка на расчёт № ' + issuedOnLoad.number, 'ok'); }, 300);
  else if (st.gate && st.pendingPay) {
    var freshPay = Date.now() - st.pendingPay < 30 * 60 * 1000;
    st.pendingPay = 0; persist();
    if (freshPay && S.auth.isIn()) setTimeout(payOpen, 350);      /* гость нажал «Оплатить», вошёл — продолжаем оплату */
  }
  if (scanRes || loadPlan.rooms) setTimeout(function () { roomsToast(scanRes); }, 300);
  /* капсула из адреса — окно выбора с предвыбором; ничего не записано, пока человек не нажал «Выбрать» */
  if (urlPick && S.capsulePicker) setTimeout(function () { if (urlPick && st.step === 1 && !S.capsulePicker.isOpen()) openPicker('[data-int-open]'); }, 120);

  /* вернулись со входа после «Сохранить в проект» — доводим сохранение до конца */
  if (st.pendingSave) {
    var fresh = Date.now() - st.pendingSave < 30 * 60 * 1000;
    st.pendingSave = 0; persist();
    if (fresh && S.auth.isIn() && st.step === 5 && valid(5)) setTimeout(save, 350);
  }
})();
