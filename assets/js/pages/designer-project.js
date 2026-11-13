/* Кабинет проекта дизайнера (АДЕПТ). Собран по пяти реальным чатам проектов, анкете клиента, «Регламенту АДЕПТ v5» и памятке по обмерам —
   выводы в design/kabinet-proekta-nablyudeniya.md. Проекты в прототипе — ДЕМО, хранятся в браузере.
   Что на экране: срок в рабочих днях и чей ход · этапы по тарифу с версиями файлов и счётчиком правок · исходные данные по памятке ·
   журнал решений · вопросы клиента и строителей · доп. услуги · шаблоны сообщений. */
(function () {
  var DC = window.SOVE_DC; if (!DC || !DC.deskApi) return;
  var st = DC.st, esc = DC.esc, ui = DC.ui, ic = DC.ic, A = DC.deskApi, root = document.getElementById('da-root'), DAY = 864e5;

  /* Этапы проекта (Алина 13.11, по чатам клиентов): Старт → Планировка → Материалы → Визуализации из этих материалов → Чертежи → Спецификация.
     Состав по тарифу — из регламента АДЕПТ v5. Сроки этапов внутри общего срока тарифа — ДОПУЩЕНИЕ по чатам
     (планировка 7 раб. дней; коллажи 14 → материалы 5 + визуализации 9; чертежи со спецификацией 14 → 10 + 4). */
  var STAGES6 = [['intake', 'Старт'], ['plan', 'Планировка'], ['materials', 'Материалы'], ['visual', 'Визуализации'], ['draw', 'Чертежи'], ['spec', 'Спецификация']];
  var TARIFF = {
    start:   { total: function (p) { return Number(p.area) > 50 ? 10 : 7; }, days: { plan: 0, spec: 0 }, what: { plan: 'План с расстановкой мебели — 1 вариант', visual: 'ИИ-рендеры 1–2 на помещение — из выбранных материалов', spec: 'Плановый бюджет со спецификацией' } },
    base:    { total: function () { return 25; }, days: { plan: 7, materials: 4, visual: 8, draw: 4, spec: 2 }, what: { plan: 'План с расстановкой мебели — 1 вариант', materials: 'Материалы интерьера и до 3 замен: свет, сантехника, мебель', visual: 'ИИ-рендеры 1–2 на помещение — из выбранных материалов', draw: 'Схемы сантехники, управления светом и розеток', spec: 'Плановый бюджет со спецификацией' } },
    optimal: { total: function () { return 35; }, days: { plan: 7, materials: 5, visual: 9, draw: 10, spec: 4 }, what: { plan: 'План с расстановкой мебели — 2 варианта', materials: 'Материалы интерьера и до 3 замен: свет, сантехника, мебель', visual: 'ИИ-рендеры 1–2 на помещение — из выбранных материалов', draw: 'Альбом эскизных схем', spec: 'Плановый бюджет со спецификацией' } }
  };
  /* индивидуальный проект: все этапы, состав — как в Оптимальном, срок дизайнер ставит сам; дни этапов — в тех же долях, что у Оптимального */
  var OPT_D = TARIFF.optimal.days;
  function indivTerm(p) { var l = (A.indiv ? A.indiv(p.designer) : []).filter(function (e) { return Number(e.term) > 0; }); return l.length ? Number(l[0].term) : 0; }
  TARIFF.indiv = { total: function (p) { return indivTerm(p); }, days: function (p) { var t = indivTerm(p), o = {}; Object.keys(OPT_D).forEach(function (k) { o[k] = t ? Math.max(1, Math.round(t * OPT_D[k] / 35)) : 0; }); return o; }, what: { plan: 'Варианты расстановки мебели — по договору', materials: 'Материалы и замены — по договору', visual: 'Визуализации по помещениям', draw: 'Альбом чертежей — по договору', spec: 'Спецификация и бюджет' } };
  var ROUNDS = { plan: ['round', 1], materials: ['swap', 3], draw: ['round', 1] };
  /* схемы альбома по тарифу — регламент */
  var SHEETS = {
    base: ['Схема размещения сантехники', 'Схема управления освещением', 'Схема розеток'],
    optimal: ['Обмерный план с 3D-видом', 'Расстановка мебели', 'Демонтаж', 'Монтаж', 'Отделка стен', 'Сантехника', 'Напольное покрытие', 'Тёплый пол', 'Потолки', 'Освещение', 'Управление освещением', 'Розетки', 'Двери и проёмы', 'Стены санузла и декоративные элементы']
  };
  function plan(p) {
    var T = TARIFF[p.tariff] || TARIFF.optimal, D0 = typeof T.days === 'function' ? T.days(p) : T.days, tot = T.total(p) || 0, D = {};
    STAGES6.forEach(function (x) { if (x[0] === 'intake') return; D[x[0]] = D0[x[0]] ? D0[x[0]] : tot ? Math.max(1, Math.round(tot * OPT_D[x[0]] / 35)) : 0; });
    return { total: T.total, stages: STAGES6.map(function (x) { var r = ROUNDS[x[0]] || ['', 0]; return [x[0], x[1], x[0] === 'intake' ? 0 : D[x[0]], r[0], r[1], T.what[x[0]] || '']; }) };
  }
  function buildStages(p, doneKeys, prev) {
    var pl = plan(p), now = new Date(), gap = false;
    return pl.stages.map(function (x, i) {
      var o = (prev || []).filter(function (y) { return y.key === x[0]; })[0] || {};
      if (!doneKeys[x[0]]) gap = true; else if (gap) doneKeys[x[0]] = 0; /* этапы сдаются по порядку */
      return { n: i + 1, key: x[0], name: x[1], days: x[2], kind: x[3] || '', limit: x[4] || 0, used: o.used || 0, what: x[5] || '', done: !!doneKeys[x[0]], doneAt: o.doneAt || (doneKeys[x[0]] ? iso(now.getTime() - (6 + (pl.stages.length - i) * 5) * DAY) : ''), due: o.due || '', files: o.files || [], fixes: o.fixes || [], note: o.note || '' };
    });
  }
  /* что должно быть до старта — регламент (этап 6) и памятка по обмерному плану */
  var INTAKE = [['anketa', 'Анкета клиента'], ['photo', 'Фото и видео объекта'], ['measure', 'План БТИ или обмерный план']];
  var SCEN = [['A', 'A · есть БТИ и обмерный план'], ['B', 'B · обмерный план есть, БТИ позже'], ['C', 'C · есть только БТИ — до чертежей нужен обмер'], ['D', 'D · стены ещё строятся — не рекомендуется']];
  /* чего нет в анкете, а в каждом проекте спрашивают в переписке */
  var ASK = [['doors', 'Высота дверей', '2 / 2,1 / 2,3 м'], ['radiators', 'Радиаторы и окна', 'оставляем или меняем'], ['ac', 'Кондиционеры', 'настенные или канальные, есть ли проект'], ['warm', 'Тёплый пол', 'в каких зонах, водяной или электрический'], ['curtains', 'Шторы', 'электрокарниз, жалюзи, ниша'], ['balcony', 'Балкон', 'входит ли в проект'], ['family', 'Кто живёт', 'дети и возраст, пожилые, животные'], ['decider', 'Кто ещё решает', 'супруг, родители — и как быстро отвечают'], ['build', 'Стройка', 'когда заходят строители, контакт прораба'], ['dislike', 'Что не нравится в интерьере', 'цвета, отделка, конкретные предметы']];
  /* доп. опции из регламента; цен в прототипе нет — берутся из прайса доп. услуг */
  var EXTRA = [['plan', 'Ещё один вариант планировки', 'plan'], ['visual', 'Ещё один вариант визуализаций', 'visual'], ['round', 'Доп. круг правок по схемам', 'draw'], ['up', 'Переход на тариф выше', '']];

  function iso(d) { d = new Date(d); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); } /* дата по местному времени */
  function today() { return new Date(new Date().toDateString()); }
  function wd(a, b) { /* рабочих дней от a до b, без a */ var n = 0, d = new Date(new Date(a).toDateString()), e = new Date(new Date(b).toDateString()); while (d < e) { d = new Date(d.getTime() + DAY); var k = d.getDay(); if (k !== 0 && k !== 6) n++; } return n; }
  function addWd(a, n) { var d = new Date(new Date(a).toDateString()); while (n > 0) { d = new Date(d.getTime() + DAY); var k = d.getDay(); if (k !== 0 && k !== 6) n--; } return d; }

  /* миграция: старые демо-проекты (v1 — 6 галочек, v2 — этапы «Коллажи», «Чертежи и бюджет», «Сдача») → шесть этапов v3 */
  var MAP2 = { intake: ['intake'], plan: ['plan'], collage: ['materials', 'visual'], draw: ['draw', 'spec'], final: ['spec'] };
  DC.projMigrate = function (p) {
    if (p.anketa === undefined && p.intake && p.intake.anketa) p.anketa = { at: p.startedAt || iso(Date.now()), name: 'Анкета клиента.pdf', url: '' }; /* демо: анкета заполнена, файла нет */
    if (p.v === 3 && p.stages.length !== STAGES6.length) { /* у всех тарифов одинаковые шесть этапов: сданный поздний этап = сданы все до него */
      var last = -1; STAGES6.forEach(function (x, i) { if (p.stages.some(function (y) { return y.key === x[0] && y.done; })) last = i; });
      var dk = {}; STAGES6.forEach(function (x, i) { if (i <= last) dk[x[0]] = 1; }); p.stages = buildStages(p, dk, p.stages);
    }
    if (p.v === 3) { var pw = {}; plan(p).stages.forEach(function (x) { pw[x[0]] = x[5]; }); p.stages.forEach(function (x) { if (pw[x.key] != null) x.what = pw[x.key]; }); } /* подписи этапов — всегда из тарифа */
    if (p.v === 3) { var gp = false; p.stages.forEach(function (x) { if (!x.done) gp = true; else if (gp) { x.done = false; x.doneAt = ''; } }); return p; }
    var now = today(), done = {};
    if (p.v === 2) (p.stages || []).forEach(function (x) { if (x.done) (MAP2[x.key] || []).forEach(function (k) { done[k] = 1; }); });
    else {
      var old = p.stages || [], d = old.filter(function (x) { return x.done; }).length, keys = STAGES6.map(function (x) { return x[0]; }), n = old.length ? Math.round(d / old.length * keys.length) : 0;
      if (d && !n) n = 1; if (d < old.length && n >= keys.length) n = keys.length - 1;
      keys.slice(0, n).forEach(function (k) { done[k] = 1; });
      p.startedAt = n > 0 ? iso(now.getTime() - (6 + n * 6) * DAY) : ''; p.paused = 0; p.waitSince = p.wait ? iso(now.getTime() - 2 * DAY) : '';
      p.intake = {}; INTAKE.forEach(function (x) { p.intake[x[0]] = n > 0; }); p.scenario = n > 0 ? 'A' : ''; p.ask = {}; p.brief = '';
      p.decisions = []; p.questions = []; p.extras = [];
    }
    p.stages = buildStages(p, done, p.v === 2 ? p.stages : null);
    var c = cur(p); if (c && !c.due && p.startedAt && c.days) c.due = iso(addWd(today(), Math.max(1, c.days - 2)));
    p.level = p.level || 'база'; p.flat = p.flat || flatOf(p.area); p.swaps = p.swaps || {}; p.plans = p.plans || []; p.renders = p.renders || {}; p.sheets = p.sheets || {};
    p.v = 3; return p;
  };
  DC.projNew = function (p) { p.stages = []; p.v = 0; p.startedAt = ''; p.intake = {}; p.ask = {}; p.decisions = []; p.questions = []; p.extras = []; return DC.projMigrate(p); };
  function flatOf(area) { var a = Number(area) || 45; return a <= 35 ? 1 : a <= 55 ? 2 : a <= 80 ? 3 : a <= 100 ? 4 : 5; }
  function cur(p) { var i = p.stages.filter(function (s) { return s.done; }).length; return i >= p.stages.length ? null : p.stages[i]; }
  function pausedNow(p) { return p.wait && p.waitSince ? wd(p.waitSince, today()) : 0; }
  function spent(p) { return p.startedAt ? Math.max(0, wd(p.startedAt, today()) - (p.paused || 0) - pausedNow(p)) : 0; }
  function byId(id) { return A.desk().projects.filter(function (p) { return p.id === id; })[0]; }
  function proj() { return st.proj ? byId(st.proj) : null; }
  function save() { A.save(); }
  function missing(p) { return INTAKE.filter(function (x) { return x[0] === 'anketa' ? !p.anketa : !p.intake[x[0]]; }); }

  /* ── шапка: срок и чей ход ── */
  function clock(p, ro) {
    var total = plan(p).total(p) || 0, s = cur(p), sp = spent(p);
    if (!total) return '<section class="pj-clock is-wait"><b>Срок не задан</b><span>Укажите срок индивидуального проекта в Ценах — этапы разложатся сами.</span></section>';
    var pct = Math.min(100, Math.round(sp / total * 100)), late = sp > total;
    if (!s) return '<section class="pj-clock is-done"><b>Проект сдан</b><span>' + (p.startedAt ? 'Занял ' + DC.plural(sp, 'рабочий день', 'рабочих дня', 'рабочих дней') + ' из ' + total + '.' : '') + '</span></section>';
    if (!p.startedAt) return '<section class="pj-clock is-wait"><b>Срок ещё не идёт</b><span>По регламенту ' + DC.plural(total, 'рабочий день', 'рабочих дня', 'рабочих дней') + ' считаются с даты, когда подтверждён полный комплект данных.' + (missing(p).length ? ' Не хватает: ' + missing(p).length + '.' : '') + '</span></section>';
    var turn = p.wait ? 'Ждём клиента' + (pausedNow(p) ? ' · ' + DC.plural(pausedNow(p), 'рабочий день', 'рабочих дня', 'рабочих дней') : '') : 'В работе у дизайнера';
    return '<section class="pj-clock' + (late ? ' is-late' : p.wait ? ' is-wait' : '') + '"><div class="pj-clock__t"><b>День ' + sp + ' из ' + total + '</b><span>рабочих · старт ' + A.ru(p.startedAt) + '</span></div>' +
      '<span class="da-bar pj-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<div class="pj-turn"><span class="dk-st dk-st--' + (p.wait ? 'wait' : 'work') + '">' + turn + '</span>' + ((p.paused || 0) + pausedNow(p) ? '<span class="pj-mut">паузы по клиенту: ' + ((p.paused || 0) + pausedNow(p)) + ' раб. дн. — в срок не входят</span>' : '') + '</div>' +
      (late ? '<p class="dp-warn">! Срок по тарифу вышел. Напишите клиенту новую дату.</p>' : '') +
      (ro ? '' : '<div class="dr-btns">' + (p.wait ? '<button type="button" class="btn btn--primary btn--small" data-act="pj-back">Клиент ответил — продолжаем</button>' : '<button type="button" class="dr-sbtn" data-act="pj-wait">Отправили клиенту — ждём ответ</button>') + '<button type="button" class="dr-sbtn" data-act="pj-tpl">Шаблоны сообщений</button></div>') + '</section>';
  }

  /* ── этапы ── */
  function drop(attrs, title, hint, accept, multi) { return '<label class="pw-drop"><span class="pw-drop__ic" aria-hidden="true">⇪</span><b>' + title + '</b><span>' + hint + '</span><input type="file"' + (accept ? ' accept="' + accept + '"' : '') + (multi === false ? '' : ' multiple') + ' ' + attrs + '></label>'; }
  function filesHtml(s, ro, id, i, title, hint, accept) {
    var fs = s.files.map(function (f) { return typeof f === 'string' ? { name: f, at: '' } : f; }), last = fs[fs.length - 1], older = fs.slice(0, -1).reverse();
    return '<div class="pj-files">' + (last ? '<div class="pj-file is-cur"><b>' + esc(last.name) + '</b><span>актуальная версия' + (last.at ? ' · ' + A.ru(last.at) : '') + '</span></div>' : '<p class="pj-mut">Файлов пока нет.</p>') +
      (older.length ? '<details class="pj-old"><summary>Прошлые версии · ' + older.length + '</summary>' + older.map(function (f) { return '<div class="pj-file"><b>' + esc(f.name) + '</b><span>' + (f.at ? A.ru(f.at) : '') + '</span></div>'; }).join('') + '</details>' : '') +
      (ro ? '' : drop('data-px="file" data-n="' + i + '"', last ? 'Загрузить новую версию' : (title || 'Загрузить файл'), hint || 'Перетащите сюда или нажмите · PDF', accept || '.pdf,application/pdf')) + '</div>';
  }
  function fixesHtml(p, s, ro, i) {
    if (!s.limit) return '';
    var swap = s.kind === 'swap', left = Math.max(0, s.limit - s.used), open = s.fixes || [];
    var headT = swap ? 'Замены: использовано ' + s.used + ' из ' + s.limit : 'Бесплатный круг правок: ' + (left ? 'не использован' : 'использован');
    var list = open.length ? '<div class="pj-fixes">' + open.map(function (f, k) { return '<div class="pj-fix"><i>' + (k + 1) + '</i><span>' + esc(f) + '</span>' + (ro ? '' : '<button type="button" data-act="pj-fix-del" data-n="' + i + '" data-k="' + k + '" aria-label="Убрать">✕</button>') + '</div>'; }).join('') + '</div>' : '';
    var over = swap ? s.used + open.length > s.limit : !left && open.length > 0;
    return '<div class="pj-box"><div class="pj-box__h"><b>' + headT + '</b>' + (swap ? '<span class="pj-mut">свет, сантехника, мебель</span>' : '<span class="pj-mut">все пожелания одним списком</span>') + '</div>' + list +
      (ro ? '' : '<div class="pj-add"><input class="input" data-fix-in="' + i + '" placeholder="' + (swap ? 'Что меняем: например, люстра в спальне' : 'Пункт правки: например, рабочее место в гостиную') + '"><button type="button" class="dr-sbtn" data-act="pj-fix-add" data-n="' + i + '">Добавить</button></div>') +
      (over ? '<p class="dp-warn">! Сверх тарифа — это доп. услуга. Скажите клиенту до начала работы.</p>' : '') +
      (!ro && open.length ? '<button type="button" class="btn btn--primary btn--small" data-act="pj-fix-ok" data-n="' + i + '">Клиент подтвердил список</button>' : '') + '</div>';
  }
  /* ── работа над проектом прямо здесь: квартира проекта, материалы интерьера с заменами клиента, количество и спецификация ── */
  var FL = ['Студия', 'Евро-2', 'Евро-3', 'Евро-4', 'Евро-5'], FK = ['studio', 'k1', 'k2', 'k3', 'k4'];
  function pctx(p, lvl) { var S = Number(p.area) || 45, t = p.flat || flatOf(S), lv = (lvl || p.level) === 'премиум' ? 'premium' : 'base'; return { S: S, P: S / 3, walls: (lv === 'premium' ? 3.2 : 3) * S, t: t, B: t >= 4 ? 2 : 1, lv: lv, real: true }; }
  function pmats(p) { return p.capsule && DC.materials ? (DC.materials(p.capsule) || null) : null; }
  /* товар материала в проекте: замена клиента → вариант для типа квартиры → База/Премиум */
  function pprod(p, m) {
    if (p.swaps[m.id]) return p.swaps[m.id];
    var lv = (p.pick && p.pick[m.id]) || (p.level === 'премиум' ? 'premium' : 'base'), v = m.by_flat ? m.by_flat[FK[(p.flat || 2) - 1]] : null;
    function pick(x) { return lv === 'premium' ? (x.premium === 'same' || !x.premium ? x.base : x.premium) : x.base; }
    if (v === 'none') return null; if (v && typeof v === 'object' && pick(v)) return pick(v);
    return pick(m);
  }
  function pqty(p, m) {
    if (!m.zones.length) return 0; var ctx = pctx(p);
    if (DC.calcHas && DC.calcHas(m.position)) { var r = DC.calcQty(m.position, m.zones, ctx); return r ? r.q : 0; }
    return m.zones.length;
  }
  function specRows(p) {
    var ms = pmats(p); if (!ms) return null;
    return ms.filter(function (m) { return m.zones.length; }).map(function (m) { var pr = pprod(p, m), q = pr ? pqty(p, m) : 0; return { m: m, p: pr, q: q, sum: pr ? DC.price(pr) * q : 0 }; }).filter(function (r) { return r.p && r.q > 0; });
  }
  function img(file, max) { return new Promise(function (ok) { if (!/^image\//.test(file.type)) { ok(''); return; } var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .8)); }; im.onerror = function () { ok(''); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
  function cssU(u) { return DC.cssUrl(u); }
  function swapsUsed(p) { return Object.keys(p.swaps || {}).length; }

  /* Планировка: варианты (картинки или PDF), клиент выбирает один */
  function bodyPlan(p, s, i, ro) {
    var n = p.tariff === 'optimal' ? 2 : 1;
    return '<p class="pj-mut">' + esc(s.what) + '. Загрузите вариант' + (n > 1 ? 'ы' : '') + ' и отметьте, какой выбрал клиент.</p>' +
      (p.plans.length ? '<div class="pw-grid">' + p.plans.map(function (f, k) { var on = p.planChosen === k; return '<div class="pw-tile' + (on ? ' is-on' : '') + '">' + (f.url ? '<span class="pw-pic" style="background-image:' + esc(cssU(f.url)) + '"></span>' : '<span class="pw-pic is-file">PDF</span>') + '<b>Вариант ' + (k + 1) + '</b><span>' + esc(f.name) + '</span>' + (ro ? '' : '<span class="dr-btns">' + (on ? '<i class="pw-ok">выбран клиентом</i>' : '<button type="button" class="dr-sbtn" data-act="pw-plan-pick" data-k="' + k + '">Клиент выбрал</button>') + '<button type="button" class="dk-work__x" data-act="pw-plan-del" data-k="' + k + '">убрать</button></span>') + '</div>'; }).join('') + '</div>' : '') +
      (ro ? '' : drop('data-pw="plan"', p.plans.length ? 'Загрузить ещё вариант' : 'Загрузить вариант планировки', 'Перетащите сюда или нажмите · JPG, PNG или PDF', 'image/*,.pdf')) + fixesHtml(p, s, ro, i);
  }
  /* Материалы: материалы интерьера под тип и уровень квартиры; замена клиента — из каталога, до 3 по тарифу */
  function pth(x, tag, on) { return '<span class="pw-th' + (on ? ' is-on' : '') + '"' + (x && x.img ? ' style="background-image:' + esc(cssU(x.img)) + '"' : '') + '>' + (tag ? '<i>' + tag + '</i>' : '') + '</span>'; }
  function matRow(p, m, ro, q) {
    var lv = (p.pick && p.pick[m.id]) || (p.level === 'премиум' ? 'premium' : 'base'), sw = p.swaps[m.id], b0 = m.base, p0 = m.premium === 'same' || !m.premium ? m.base : m.premium, alts = (m.alts[lv] || []).filter(function (a) { return a && a.img; }), pr = pprod(p, m);
    var sum = q != null && pr ? DC.price(pr) * q : null;
    var dis = ro ? ' disabled' : '', own = p.pick && p.pick[m.id];
    function lvBtn(x, tag, key) { return '<button type="button" class="pw-lvb" data-act="pw-lv" data-id="' + esc(m.id) + '" data-lv="' + key + '" aria-pressed="' + (lv === key && !sw) + '" title="' + (key === 'base' ? 'База' : 'Премиум') + '"' + dis + '>' + pth(x, tag, lv === key && !sw) + '</button>'; }
    return '<div class="pw-mat2' + (sw ? ' is-sw' : '') + '"><div class="pw-mat2__l">' + lvBtn(b0, 'Б', 'base') + (m.premium === 'same' ? '' : lvBtn(p0, 'П', 'premium')) + '</div>' +
      '<div class="pw-mat2__b"><b>' + esc(m.title || '') + (own && !sw ? ' <em class="pw-own">' + (own === 'premium' ? 'Премиум' : 'База') + '</em>' : '') + '</b><span>' + esc((pr && pr.name) || '') + '</span>' + (sw ? '<i>замена клиента</i>' : '') +
      (q != null ? '<span class="pw-mat2__p">' + DC.ruNum(Math.round(q * 10) / 10) + ' ' + DC.matUnit(m) + ' × ' + DC.F.rub(DC.price(pr)) + '</span>' : '<span class="pw-mat2__p">База ' + (DC.price(b0) ? DC.F.rub(DC.price(b0)) : '—') + ' · Премиум ' + (m.premium === 'same' ? 'такой же' : DC.price(p0) ? DC.F.rub(DC.price(p0)) : '—') + '</span>') +
      (alts.length ? '<button type="button" class="pw-alts" data-act="pw-pick" data-id="' + esc(m.id) + '"' + dis + '>' + alts.slice(0, 5).map(function (a) { return pth(a, '', sw && DC.sameProduct && DC.sameProduct(a, sw)); }).join('') + '<em>замен ' + alts.length + ' ›</em></button>' : '<span class="pw-alts is-none">замен в интерьере нет — из каталога</span>') + '</div>' +
      '<div class="pw-mat2__a">' + (sum != null ? '<b class="pw-mat2__s">' + DC.F.rub(Math.round(sum)) + '</b>' : '') + (ro ? '' : '<button type="button" class="dr-sbtn" data-act="pw-pick" data-id="' + esc(m.id) + '">Заменить</button>' + (sw ? '<button type="button" class="dk-work__x" data-act="pw-unswap" data-id="' + esc(m.id) + '">вернуть</button>' : '')) + '</div></div>';
  }
  function bodyMaterials(p, s, i, ro) {
    var ms = pmats(p); if (!p.capsule) return '<p class="pj-mut">У проекта не выбран интерьер — материалов нет.</p>';
    if (!ms) return '<div class="da-ok">Загружаю материалы интерьера…</div>';
    var used = swapsUsed(p), lim = s.limit || 3, cats = [], by = {}, lv = p.level === 'премиум' ? 'premium' : 'base';
    ms.forEach(function (m) { if (!m.zones.length) return; var pr = pprod(p, m); if (!pr || !pqty(p, m)) return; var c = m.category || 'Другое'; if (!by[c]) { by[c] = []; cats.push(c); } by[c].push(m); });
    return '<p class="pj-mut">Материалы «' + esc(DC.capName(p.capsule) || 'интерьера') + '» для ' + FL[(p.flat || 2) - 1] + '. В проекте — ' + esc(p.level) + '. Замен клиента ' + used + ' из ' + lim + '.</p>' +
      (used > lim ? '<p class="dp-warn">! Замен больше, чем в тарифе — это доп. услуга.</p>' : '') +
      cats.map(function (c) {
        return '<div class="pw-cat"><b>' + esc(c) + '</b><div class="pw-mats">' + by[c].map(function (m) { return matRow(p, m, ro);
        }).join('') + '</div></div>';
      }).join('');
  }
  /* Визуализации: по комнатам, из материалов этой комнаты */
  function bodyVisual(p, s, i, ro) {
    var ms = pmats(p) || [], rooms = p.capsule ? DC.realRooms(p.capsule) : ['Кухня-гостиная', 'Спальня', 'Санузел', 'Прихожая'];
    return '<p class="pj-mut">' + esc(s.what || 'Визуализации по комнатам') + '. Рядом — материалы комнаты, из которых собирается картинка.</p><p class="pj-ai">На ИИ-рендерах подпись: «ИИ-рендер, не визуализация. Размеры и состав — по чертежам».</p>' +
      rooms.map(function (r) {
        var rs = p.renders[r] || [], mats = ms.filter(function (m) { return m.zones.some(function (z) { return z.room === r; }); }).map(function (m) { return pprod(p, m); }).filter(function (x) { return x && x.img; }).slice(0, 8);
        return '<div class="pw-room"><div class="pw-room__h"><b>' + esc(r) + '</b><span class="pj-mut">' + (rs.length ? DC.plural(rs.length, 'картинка', 'картинки', 'картинок') : 'нет картинок') + '</span></div>' +
          (mats.length ? '<div class="pw-sw">' + mats.map(function (x) { return '<span style="background-image:' + esc(cssU(x.img)) + '" title="' + esc(x.name) + '"></span>'; }).join('') + '</div>' : '') +
          (rs.length ? '<div class="pw-grid">' + rs.map(function (u, k) { return '<div class="pw-tile"><span class="pw-pic" style="background-image:' + esc(cssU(u)) + '"></span>' + (ro ? '' : '<button type="button" class="dk-work__x" data-act="pw-r-del" data-room="' + esc(r) + '" data-k="' + k + '">убрать</button>') + '</div>'; }).join('') + '</div>' : '') +
          (ro ? '' : '<label class="dr-sbtn dp-file">＋ Картинка<input type="file" accept="image/*" multiple data-pw="render" data-room="' + esc(r) + '"></label>') + '</div>';
      }).join('');
  }
  /* Чертежи: листы альбома по тарифу + PDF */
  function bodyDraw(p, s, i, ro) {
    var list = SHEETS[p.tariff === 'indiv' ? 'optimal' : p.tariff] || SHEETS.optimal, n = list.filter(function (x) { return p.sheets[x]; }).length;
    return '<p class="pj-mut">' + esc(s.what) + '. Листов готово: ' + n + ' из ' + list.length + '.</p><div class="pw-sheets">' + list.map(function (x) { return '<label class="dr-check"><input type="checkbox" data-pw="sheet" data-k="' + esc(x) + '"' + (p.sheets[x] ? ' checked' : '') + (ro ? ' disabled' : '') + '> ' + esc(x) + '</label>'; }).join('') + '</div>' +
      filesHtml(s, ro, p.id, i, 'Загрузить чертежи', 'Перетащите сюда или нажмите · PDF альбома') + fixesHtml(p, s, ro, i);
  }
  /* Спецификация: собирается сама из материалов проекта, количество — по калькулятору на квартиру проекта */
  function bodySpec(p, s, i, ro) {
    var rows = specRows(p); if (!p.capsule) return '<p class="pj-mut">У проекта не выбран интерьер.</p>'; if (!rows) return '<div class="da-ok">Загружаю материалы…</div>';
    var cats = [], by = {}, tot = 0; rows.forEach(function (r) { var c = r.m.category || 'Другое'; if (!by[c]) { by[c] = []; cats.push(c); } by[c].push(r); tot += r.sum; });
    return '<p class="pj-mut">Собрана из материалов интерьера под ' + FL[(p.flat || 2) - 1] + ', ' + esc(p.area) + ' м². Нажмите на позицию — выбрать из замен интерьера или из каталога.</p>' +
      '<div class="pw-spec2">' + cats.map(function (c) { var cs = by[c].reduce(function (a, r) { return a + r.sum; }, 0);
        return '<section class="pw-sc"><div class="pw-sc__h"><b>' + esc(c) + '</b><span>' + DC.F.rub(Math.round(cs)) + '</span></div><div class="pw-mats">' + by[c].map(function (r) { return matRow(p, r.m, ro, r.q);
        }).join('') + '</div></section>'; }).join('') +
      '<div class="pw-spec__t"><span>Итого, ' + esc(p.level) + '</span><b>' + DC.F.rub(Math.round(tot)) + '</b></div></div>' +
      '<div class="pw-sub">Своя спецификация файлом</div>' + filesHtml(s, ro, p.id, i, 'Загрузить спецификацию', 'Если ведёте её у себя · PDF или Excel', '.pdf,.xlsx,.xls,.csv') + check(p);
  }
  /* выбор товара позиции: основной и замены интерьера картинками — или любой товар из каталога */
  DC.acts['pw-pick'] = function (b) {
    var p = proj(), id = b.getAttribute('data-id'), m = p && (pmats(p) || []).filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var lv = p.level === 'премиум' ? 'premium' : 'base', sw = p.swaps[id], main = (function () { var keep = p.swaps[id]; delete p.swaps[id]; var x = pprod(p, m); if (keep) p.swaps[id] = keep; return x; })();
    /* варианты — всё, что уже заполнено в интерьере: эта позиция (основной, Премиум, замены, товары под типы квартир, другие карточки той же позиции), потом остальное из той же категории */
    var all = pmats(p) || [], seen = {};
    function prods(x) { var o = [x.base, x.premium === 'same' ? null : x.premium].concat(x.alts.base || [], x.alts.premium || []); if (x.by_flat) Object.keys(x.by_flat).forEach(function (k) { var v = x.by_flat[k]; if (v && typeof v === 'object') o.push(v.base, v.premium === 'same' ? null : v.premium); }); if (x.by_index) Object.keys(x.by_index).forEach(function (r) { Object.keys(x.by_index[r]).forEach(function (n) { var v = x.by_index[r][n]; if (v) o.push(v.base, v.premium); }); }); return o.filter(Boolean); }
    function uniq(list) { return list.filter(function (x) { var k = (x.source || '') + (x.id || x.name); if (seen[k]) return false; seen[k] = 1; return true; }); }
    var mine = uniq([main].concat(prods(m), [].concat.apply([], all.filter(function (x) { return x.id !== m.id && x.position && x.position === m.position; }).map(prods))));
    var cat = uniq([].concat.apply([], all.filter(function (x) { return x.id !== m.id && x.category === m.category && x.position !== m.position; }).map(prods)));
    var opts = mine.concat(cat), cur = sw || main;
    function tile(x, k) { var on = DC.sameProduct ? DC.sameProduct(x, cur) : x === cur; return '<button type="button" class="pw-opt' + (on ? ' is-on' : '') + '" data-k="' + k + '"><span style="background-image:' + esc(x.img ? cssU(x.img) : 'none') + '"></span><b>' + esc((x.name || '').slice(0, 60)) + '</b><i>' + (DC.price(x) ? DC.F.rub(DC.price(x)) : 'нет цены') + (k === 0 ? ' · основной' : '') + '</i></button>'; }
    var sh = DC.sheet({ title: m.title || 'Позиция', html: '<p class="small muted">Из материалов интерьера «' + esc(DC.capName(p.capsule) || '') + '»</p>' +
      '<div class="pw-opts__h">Из интерьера · ' + mine.length + '</div><div class="pw-opts">' + mine.map(function (x, k) { return tile(x, k); }).join('') + '</div>' +
      '<div class="pw-opts__h">Замены из каталога</div><div class="pw-opts" id="pw-cat-opts"><div class="da-empty">Подбираю…</div></div>' +
      (cat.length ? '<details class="pw-opts__more"><summary>Ещё из «' + esc(m.category || '') + '» · ' + cat.length + '</summary><div class="pw-opts">' + cat.map(function (x, k) { return tile(x, mine.length + k); }).join('') + '</div></details>' : ''), actions: [
      { label: 'Найти в каталоге', onClick: function () { DC.openSearch((m.title || '') + ' · каталог', DC.capName(p.capsule) || '', m.title || '', function (pr) { set(pr); }); } }, { label: 'Отмена', kind: 'link' }] });
    function set(pr) { if (k0(pr)) delete p.swaps[id]; else p.swaps[id] = pr; decide(p, (m.title || '') + ': ' + (k0(pr) ? 'основной товар' : pr.name), 'Спецификация'); save(); DC.paint(); ui.toast('Позиция обновлена'); }
    function k0(pr) { return DC.sameProduct ? DC.sameProduct(pr, main) : pr === main; }
    /* замены из каталога — сами, по позиции: товары с фото и ценой, та же позиция справочника */
    var kind = String((main && main.name) || '').split(/[\s,.(]+/).filter(function (w) { return w.length > 3 && !/\d/.test(w) && /^[а-яё]/i.test(w); })[0] || '';
    var qs = [m.title].concat(kind && kind.toLowerCase() !== String(m.title || '').toLowerCase() ? [kind] : []).filter(Boolean);
    Promise.all(qs.map(function (q) { return DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(q) + '&page_size=24').then(function (d) { return d.items || []; }, function () { return []; }); })).then(function (lists) {
      var box = sh.el.querySelector('#pw-cat-opts'); if (!box) return;
      var raw = [].concat.apply([], lists).filter(function (x) { return x.img && (DC.num(x.price_metod) || DC.num(x.price_retail)); }).map(DC.catProduct);
      var kw = kind.toLowerCase().slice(0, 5);
      var items = raw.filter(function (x) { var pc = DC.posOfProduct ? DC.posOfProduct(x) : ''; return pc ? pc === m.position : (kw && String(x.name || '').toLowerCase().indexOf(kw) >= 0); });
      items = uniq(items).slice(0, 12);
      if (!items.length) { box.innerHTML = '<div class="da-empty">В каталоге не нашлось — попробуйте «Найти в каталоге».</div>'; return; }
      var base = opts.length; opts = opts.concat(items); box.innerHTML = items.map(function (x, k) { return tile(x, base + k); }).join('');
    });
    sh.el.addEventListener('click', function (e) { var x = e.target.closest('.pw-opt[data-k]'); if (!x) return; sh.close(); set(opts[Number(x.getAttribute('data-k'))]); });
  };
  function stageBody(p, s, i, ro) {
    return s.key === 'plan' ? bodyPlan(p, s, i, ro) : s.key === 'materials' ? bodyMaterials(p, s, i, ro) : s.key === 'visual' ? bodyVisual(p, s, i, ro) : s.key === 'draw' ? bodyDraw(p, s, i, ro) : s.key === 'spec' ? bodySpec(p, s, i, ro) : '';
  }
  function stageHtml(p, s, i, ro) {
    var c = cur(p), isCur = c && c.n === s.n;
    var open = st.pwOpen === s.key;
    if (s.done) return '<div class="pj-stage is-done' + (open ? ' is-open' : '') + '"><div class="pj-stage__h"><span class="pj-stage__n">✓</span><button type="button" class="pj-stage__b pw-tog" data-act="pw-open" data-k="' + s.key + '"><b>' + esc(s.name) + '</b><span>' + (s.key === 'intake' ? (s.doneAt ? A.ru(s.doneAt) : '') : (s.doneAt ? 'сдан ' + A.ru(s.doneAt) : 'сдан') + ' · ' + (open ? 'свернуть' : 'открыть')) + '</span></button>' + (ro ? '' : '<button type="button" class="dk-work__x" data-act="pj-undo" data-n="' + i + '">вернуть</button>') + '</div>' + (open && s.key !== 'intake' ? stageBody(p, s, i, true) : '') + '</div>';
    if (!isCur) return '<div class="pj-stage is-next"><span class="pj-stage__n">' + s.n + '</span><span class="pj-stage__b"><b>' + esc(s.name) + '</b><span>' + (s.days ? DC.plural(s.days, 'рабочий день', 'рабочих дня', 'рабочих дней') : 'без срока') + (s.what ? ' · ' + esc(s.what) : '') + '</span></span></div>';
    var left = s.due ? Math.ceil((new Date(s.due).getTime() - today().getTime()) / DAY) : null;
    var body = s.key === 'intake' ? '<p class="pj-mut">Проверьте исходные данные ниже. Срок пойдёт после подтверждения полного комплекта.</p>' + (ro ? '' : '<button type="button" class="btn btn--primary btn--small" data-act="pj-start"' + (missing(p).length ? ' disabled' : '') + '>Данные полные — запустить срок</button>' + (missing(p).length ? '<button type="button" class="dr-sbtn" data-act="pj-start" data-risk="1">Начать с неполными данными — риски клиента</button>' : ''))
      : stageBody(p, s, i, ro) + (ro ? '' : '<div class="dr-btns"><button type="button" class="btn btn--primary btn--small" data-act="pj-done" data-n="' + i + '">' + (s.key === 'spec' ? 'Проект сдан клиенту' : 'Клиент утвердил этап — дальше') + '</button><button type="button" class="dr-sbtn" data-act="pw-client">Показать клиенту</button></div>');
    return '<div class="pj-stage is-cur"><div class="pj-stage__h"><span class="pj-stage__n">' + s.n + '</span><span class="pj-stage__b"><b>' + esc(s.name) + '</b><span>' + (s.days ? DC.plural(s.days, 'рабочий день', 'рабочих дня', 'рабочих дней') + (s.due ? ' · до ' + A.ru(s.due) : '') : 'сейчас') + (left !== null && s.days ? (left < 0 ? ' · <i class="dk-hot">просрочка ' + DC.plural(-left, 'день', 'дня', 'дней') + '</i>' : left <= 3 ? ' · <i class="dk-hot">осталось ' + DC.plural(left, 'день', 'дня', 'дней') + '</i>' : '') : '') + '</span></span></div>' + body + '</div>';
  }
  /* проверка спецификации перед сдачей — пять реальных жалоб из одного проекта */
  var CHECK = [['links', 'Все ссылки открываются'], ['rooms', 'У каждой позиции указана комната'], ['qty', 'Количества сходятся с чертежами (рамки и механизмы тоже)'], ['city', 'Поставщики возят в город клиента'], ['contact', 'Контакты менеджеров поставщиков отвечают']];
  function check(p) { p.check = p.check || {}; return '<div class="pj-box"><div class="pj-box__h"><b>Проверка спецификации перед сдачей</b></div>' + CHECK.map(function (c) { return '<label class="dr-check"><input type="checkbox" data-px="check" data-k="' + c[0] + '"' + (p.check[c[0]] ? ' checked' : '') + '> ' + c[1] + '</label>'; }).join('') + '</div>'; }

  /* ── исходные данные ── */
  function intakeHtml(p, ro) {
    var dis = ro ? ' disabled' : '', miss = missing(p).length, open = st.pjIn != null ? st.pjIn : !p.startedAt, an = p.anketa;
    var anRow = '<div class="dk-doc pj-an"><span><b>Анкета клиента</b><span>' + (an ? 'заполнена ' + A.ru(an.at) : 'клиент ещё не заполнил') + '</span></span>' +
      (an ? '<a class="dr-sbtn" href="' + esc(an.url || '#') + '" target="_blank" rel="noopener"' + (an.url ? '' : ' data-act="pj-an-none"') + '>PDF ›</a>' : '') +
      (ro ? '' : '<label class="dr-sbtn dp-file">' + (an ? 'Заменить' : '＋ PDF анкеты') + '<input type="file" accept=".pdf,application/pdf" data-px="anketa"></label>') + '</div>';
    return '<section class="dp-card pj-sec"><button type="button" class="pj-sec__h" data-act="pj-tog" data-k="pjIn" aria-expanded="' + open + '"><b>Исходные данные</b><span class="' + (miss ? 'dp-warn' : 'pj-ok') + '">' + (miss ? 'не хватает: ' + miss : 'комплект полный') + '</span></button>' + (open ?
      anRow + '<div class="pj-checks">' + INTAKE.filter(function (x) { return x[0] !== 'anketa'; }).map(function (x) { return '<label class="dr-check"><input type="checkbox" data-px="intake" data-k="' + x[0] + '"' + (p.intake[x[0]] ? ' checked' : '') + dis + '> ' + x[1] + '</label>'; }).join('') + '</div>' : '') + '</section>';
  }

  /* ── решения, вопросы, доп. услуги ── */
  function listSec(key, title, count, body) { var open = !!st[key]; return '<section class="dp-card pj-sec"><button type="button" class="pj-sec__h" data-act="pj-tog" data-k="' + key + '" aria-expanded="' + open + '"><b>' + title + '</b><span class="pj-mut">' + count + '</span></button>' + (open ? body : '') + '</section>'; }
  function decisionsHtml(p, ro) {
    var body = (p.decisions.length ? '<div class="pj-log">' + p.decisions.slice().reverse().map(function (d) { return '<div class="pj-log__i"><span>' + A.ru(d.at) + (d.stage ? ' · ' + esc(d.stage) : '') + '</span><b>' + esc(d.text) + '</b></div>'; }).join('') + '</div>' : '<p class="pj-mut">Сюда попадает всё, что клиент подтвердил: выбранный вариант, список правок, замены.</p>') +
      (ro ? '' : '<div class="pj-add"><input class="input" id="pj-dec" placeholder="Решение: например, двери 2,3 м по всей квартире"><button type="button" class="dr-sbtn" data-act="pj-dec-add">Записать</button></div>');
    return listSec('pjDec', 'Решения', p.decisions.length, body);
  }
  /* доп. услуги — из прайса дизайнера (Цены). Услуги регламента добавляются в прайс сами, цену задаёт дизайнер */
  function priceList(p) {
    var list = A.extras(p.designer); for (var q = list.length - 1; q >= 0; q--) if (list[q].key === 'collage') list.splice(q, 1); /* старое название услуги */ EXTRA.forEach(function (x) { if (!list.some(function (e) { return e.key === x[0]; })) list.push({ key: x[0], name: x[1], price: '', unit: '', term: '' }); });
    return list.filter(function (e) { return e.name; });
  }
  function rub(n) { return Number(n) > 0 ? DC.F.rub(Number(n)) : ''; }
  function extrasHtml(p, ro) {
    var c = cur(p), list = priceList(p), noPrice = list.filter(function (e) { return !(Number(e.price) > 0); }).length;
    var body = (noPrice && !ro ? '<p class="dp-warn">! Без цены: ' + noPrice + '. <a href="#" data-act="h-sec" data-s="prices">Задать цены ›</a></p>' : '') + list.map(function (x, k) {
      var id = x.key || 'u' + k, e = p.extras.filter(function (y) { return y.key === id; })[0], ex = EXTRA.filter(function (y) { return y[0] === x.key; })[0], now = c && ex && ex[2] && c.key === ex[2];
      var pr = e ? rub(e.price) : rub(x.price);
      return '<div class="dk-doc"><span><b>' + esc(x.name) + '</b><span>' + (pr ? pr + (x.unit ? ' / ' + esc(x.unit) : '') + (x.term ? ' · ' + esc(x.term) + ' дн.' : '') : 'цена не задана') + (e ? ' · ' + esc(e.status) + ' ' + A.ru(e.at) : now ? ' · подходит к этому этапу' : '') + '</span></span>' +
        (ro ? '' : e ? (e.status === 'предложено' ? '<button type="button" class="dr-sbtn" data-act="pj-ex-paid" data-k="' + id + '">Оплачено</button>' : '') : '<button type="button" class="dr-sbtn" data-act="pj-ex" data-k="' + id + '" data-p="' + esc(x.price) + '" data-name="' + esc(x.name) + '"' + (pr ? '' : ' disabled') + '>Предложить</button>') + '</div>';
    }).join('');
    return listSec('pjEx', 'Доп. услуги', p.extras.length || '', body);
  }

  /* сверху проекта — его основа: интерьер по капсуле (материалы, спецификация и бюджет берутся из него) или рендеры индивидуального проекта */
  function baseBlock(p, ro) {
    if (p.tariff === 'indiv' && !p.capsule) {
      var rs = p.ownRenders || [];
      return '<section class="pw-base"><div class="pw-base__h"><b>Рендеры проекта</b><span class="pj-mut">индивидуальный проект — не по капсуле</span></div>' +
        (rs.length ? '<div class="pw-grid">' + rs.map(function (u, k) { return '<div class="pw-tile"><span class="pw-pic" style="background-image:' + esc(cssU(u)) + '"></span>' + (ro ? '' : '<button type="button" class="dk-work__x" data-act="pw-own-del" data-k="' + k + '">убрать</button>') + '</div>'; }).join('') + '</div>' : '<p class="pj-mut">Загрузите рендеры — по ним ИИ соберёт ДНК и подберёт материалы из каталога.</p>') +
        (ro ? '' : drop('data-pw="own"', 'Загрузить рендеры', 'Перетащите сюда или нажмите · JPG или PNG', 'image/*')) +
        (ro ? '' : '<button type="button" class="dr-sbtn" data-act="pw-cap-pick">Или взять готовый интерьер</button>') + '</section>' + (st.pwCapPick === p.id ? capCaro(p, ro) : '');
    }
    /* интерьер выбран — карточка с фото и «Сменить»; не выбран или меняем — карусель, как сверху «Материалов» */
    if (p.capsule && st.pwCapPick !== p.id) {
      var img0 = DC.cover ? DC.cover(p.capsule) : '';
      return '<section class="pw-base"><span class="pw-base__pic"' + (img0 ? ' style="background-image:' + esc(cssU(img0)) + '"' : '') + '></span><span class="pw-base__b"><span class="pj-mut">Интерьер проекта</span><b>' + esc(DC.capName(p.capsule) || 'Интерьер') + '</b><span class="pj-mut">Материалы, спецификация и бюджет — из этого интерьера</span>' +
        (ro ? '' : '<button type="button" class="dr-sbtn" data-act="pw-cap-pick">Сменить</button>') + '</span></section>';
    }
    return capCaro(p, ro);
  }
  function capCaro(p, ro) {
    var caps = (st.caps || []).filter(function (c) { return !/^(archive|hidden)$/.test(DC.statusOf(c.code)) || c.code === p.capsule; });
    return '<section class="pw-base pw-base--caro"><div class="pw-base__h"><b>' + (p.capsule ? 'Интерьер проекта' : 'Выберите интерьер') + '</b><span class="pj-mut">материалы, спецификация и бюджет — из выбранного интерьера</span></div>' +
      (p.capsule ? '<button type="button" class="btn btn--link pw-base__x" data-act="pw-cap-pick">Отмена</button>' : '') + '<div class="da-caro" role="group" aria-label="Интерьер проекта">' + caps.map(function (c) { var img = DC.cover(c.code), on = c.code === p.capsule; return '<button type="button" class="da-caro__i' + (on ? ' is-on' : '') + '" data-act="pw-cap-set" data-cap="' + esc(c.code) + '" aria-pressed="' + on + '"' + (ro ? ' disabled' : '') + '><span class="da-caro__pic"' + (img ? ' style="background-image:' + esc(cssU(img)) + '"' : '') + '></span><b>' + esc(DC.capName(c.code) || 'Интерьер') + '</b></button>'; }).join('') + '</div></section>';
  }
  DC.acts['pw-cap-pick'] = function () { var p = proj(); if (!p) return; st.pwCapPick = st.pwCapPick === p.id ? '' : p.id; DC.paint(); };
  DC.acts['pw-cap-set'] = function (b) {
    var p = proj(), code = b.getAttribute('data-cap'); if (!p || code === p.capsule) return;
    function go() { st.pwCapPick = ''; p.capsule = code; p.swaps = {}; DC.LEVELS.forEach(function (l) { DC.loadTable(code, l[0]); }); decide(p, 'Интерьер проекта: ' + DC.capName(code), ''); save(); DC.paint(); ui.toast('Интерьер проекта — «' + DC.capName(code) + '»'); }
    if (!swapsUsed(p)) { go(); return; }
    DC.sheet({ title: 'Сменить интерьер?', html: '<p class="small muted">Замены клиента (' + swapsUsed(p) + ') сбросятся: материалы и спецификация возьмутся из «' + esc(DC.capName(code)) + '».</p>', actions: [{ label: 'Сменить', kind: 'primary', onClick: go }, { label: 'Отмена', kind: 'link' }] });
  };
  DC.acts['pw-cap'] = function () {
    var p = proj(); if (!p) return; var caps = (st.caps || []).filter(function (c) { return !/^(archive|hidden)$/.test(DC.statusOf(c.code)); });
    var sh = DC.sheet({ title: 'Интерьер проекта', html: '<p class="small muted">Материалы, спецификация и бюджет проекта возьмутся из него. Замены клиента сбросятся.</p><div class="pw-caps">' + caps.map(function (c) { var img = DC.cover(c.code); return '<button type="button" class="pw-capi' + (c.code === p.capsule ? ' is-on' : '') + '" data-code="' + esc(c.code) + '"><span style="background-image:' + esc(img ? cssU(img) : 'none') + '"></span><b>' + esc(DC.capName(c.code)) + '</b></button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    sh.el.querySelector('.pw-caps').addEventListener('click', function (e) {
      var b = e.target.closest('[data-code]'); if (!b) return; var code = b.getAttribute('data-code'); sh.close(); if (code === p.capsule) return;
      p.capsule = code; p.swaps = {}; DC.LEVELS.forEach(function (l) { DC.loadTable(code, l[0]); }); decide(p, 'Интерьер проекта: ' + DC.capName(code), ''); save(); DC.paint(); ui.toast('Интерьер проекта — «' + DC.capName(code) + '»');
    });
  };
  function headCtl(p, ro) {
    var dis = ro ? ' disabled' : '';
    function seg(name, val, opts) { return '<div class="da-seg pw-seg">' + opts.map(function (o) { return '<button type="button" class="' + (String(val) === String(o[0]) ? 'is-on' : '') + '" data-act="pw-set" data-f="' + name + '" data-v="' + o[0] + '"' + dis + '>' + o[1] + '</button>'; }).join('') + '</div>'; }
    return '<section class="pw-head"><div class="pw-head__r"><span>Тариф</span>' + seg('tariff', p.tariff, [['start', 'Стартовый'], ['base', 'Базовый'], ['optimal', 'Оптимальный'], ['indiv', 'Индивидуальный']]) + '</div>' +
      (p.tariff === 'indiv' ? '<div class="pw-head__r"><span>Срок</span><span class="pw-head__t">' + (indivTerm(p) ? '<b>' + DC.plural(indivTerm(p), 'рабочий день', 'рабочих дня', 'рабочих дней') + '</b> из ваших цен' : 'не задан в ценах') + (ro ? '' : ' · <a href="#" data-act="h-sec" data-s="prices">' + (indivTerm(p) ? 'Изменить' : 'Задать') + ' ›</a>') + '</span></div>' : '') +
      '<div class="pw-head__r"><span>Уровень</span>' + seg('level', p.level, [['база', 'База'], ['премиум', 'Премиум']]) + '</div>' +
      '<div class="pw-head__r"><span>Квартира</span><span class="pw-head__q"><select class="input" data-pw="flat"' + dis + '>' + FL.map(function (n, k) { return '<option value="' + (k + 1) + '"' + ((p.flat || 2) === k + 1 ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><input class="input" inputmode="decimal" data-pw="area" value="' + esc(p.area) + '"' + dis + '><i>м²</i></span></div>' +
      '<div class="pw-steps">' + STAGES6.map(function (x) { var sg = p.stages.filter(function (y) { return y.key === x[0]; })[0]; return '<span class="' + (!sg ? 'is-out' : sg.done ? 'is-done' : cur(p) && cur(p).key === x[0] ? 'is-cur' : '') + '">' + x[1] + '</span>'; }).join('') + '</div></section>';
  }
  /* «Для клиента»: всё, что сделано в проекте, одной лентой */
  DC.acts['pw-client'] = function () {
    var p = proj(); if (!p) return;
    var chosen = p.planChosen != null ? p.plans[p.planChosen] : p.plans[0], rows = specRows(p) || [], tot = rows.reduce(function (a, r) { return a + r.sum; }, 0), rooms = Object.keys(p.renders).filter(function (r) { return (p.renders[r] || []).length; });
    var h = '<p class="small muted">' + esc(DC.capName(p.capsule) || '') + ' · ' + FL[(p.flat || 2) - 1] + ', ' + esc(p.area) + ' м² · ' + esc(p.level) + ' · тариф «' + A.tarName(p.tariff) + '»</p>' +
      '<section class="pw-cl"><h3>Планировка</h3>' + (chosen ? (chosen.url ? '<img src="' + esc(chosen.url) + '" alt="">' : '<p>' + esc(chosen.name) + '</p>') : '<p class="pj-mut">ещё нет</p>') + '</section>' +
      '<section class="pw-cl"><h3>Материалы</h3><div class="pw-sw is-big">' + rows.filter(function (r) { return r.p.img; }).slice(0, 24).map(function (r) { return '<span style="background-image:' + esc(cssU(r.p.img)) + '" title="' + esc(r.m.title + ': ' + r.p.name) + '"></span>'; }).join('') + '</div></section>' +
      '<section class="pw-cl"><h3>Визуализации</h3>' + (rooms.length ? rooms.map(function (r) { return '<b>' + esc(r) + '</b><div class="pw-grid">' + p.renders[r].map(function (u) { return '<span class="pw-pic" style="background-image:' + esc(cssU(u)) + '"></span>'; }).join('') + '</div>'; }).join('') : '<p class="pj-mut">ещё нет</p>') + '</section>' +
      '<section class="pw-cl"><h3>Чертежи</h3>' + (function () { var dr = p.stages.filter(function (y) { return y.key === 'draw'; })[0]; var f = dr && dr.files.length ? dr.files[dr.files.length - 1] : null; return f ? '<p>' + esc(f.name || f) + '</p>' : '<p class="pj-mut">ещё нет</p>'; })() + '</section>' +
      '<section class="pw-cl"><h3>Спецификация</h3><p>' + DC.plural(rows.length, 'позиция', 'позиции', 'позиций') + ' · итого <b>' + DC.F.rub(Math.round(tot)) + '</b></p></section>';
    DC.sheet({ title: 'Проект для клиента', html: h, actions: [{ label: 'Закрыть', kind: 'primary' }] });
  };
  DC.projView = function (p, ro) {
    DC.projMigrate(p);
    return '<a class="da-back" href="#" data-act="p-back">' + ic('back', 16) + 'Проекты</a>' +
      '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + esc(p.client_name) + (p.personal ? ' · личный проект' : '') + '</h1><p class="da-sub">' + (ro ? esc(p.designer) + ' · ' : '') + esc(p.capsule ? DC.capName(p.capsule) || 'интерьер' : 'без интерьера') + ' · ' + A.tarName(p.tariff) + ' · ' + esc(p.area) + ' м²' + (p.city ? ' · ' + esc(p.city) : '') + '</p></div></div>' +
      '<p class="dk-demo">Демо-проект: клиент и даты условные.</p>' + baseBlock(p, ro) + headCtl(p, ro) + clock(p, ro) +
      intakeHtml(p, ro) + '<section class="pj-stages">' + p.stages.map(function (s, i) { return stageHtml(p, s, i, ro); }).join('') + '</section>' +
      decisionsHtml(p, ro) + extrasHtml(p, ro) +
      (ro ? '<div class="field"><label for="dk-cn">Комментарий главного дизайнера</label><textarea class="input" id="dk-cn" rows="3" data-pj="chiefNote" data-id="' + p.id + '">' + esc(p.chiefNote || '') + '</textarea></div>' : (p.chiefNote ? '<div class="da-note"><b>Комментарий главного дизайнера</b><span>' + esc(p.chiefNote) + '</span></div>' : ''));
  };

  /* ── действия ── */
  function act(name, fn) { DC.acts[name] = function (b) { var p = proj(); if (!p) return; fn(p, b); save(); DC.paint(); }; }
  function dueFor(p, s) { return s.days ? iso(addWd(today(), s.days)) : ''; }
  function decide(p, text, stage) { p.decisions.push({ at: iso(Date.now()), text: text, stage: stage || '' }); }
  act('pj-tog', function (p, b) { var k = b.getAttribute('data-k'), def = k === 'pjIn' ? !p.startedAt : false; st[k] = !(st[k] != null ? st[k] : def); });
  act('pj-wait', function (p) { p.wait = true; p.waitSince = iso(Date.now()); ui.toast('Срок остановлен, пока ждём клиента'); });
  act('pj-back', function (p) { var d = pausedNow(p); p.paused = (p.paused || 0) + d; p.wait = false; p.waitSince = ''; var s = cur(p); if (s && s.due && d) s.due = iso(addWd(s.due, d)); ui.toast(d ? 'Срок продлён на ' + DC.plural(d, 'рабочий день', 'рабочих дня', 'рабочих дней') : 'Продолжаем'); });
  act('pj-start', function (p, b) {
    var s = cur(p); if (!s || s.key !== 'intake') return;
    if (b.getAttribute('data-risk')) decide(p, 'Старт с неполными данными, риски на клиенте. Не хватает: ' + missing(p).map(function (x) { return x[1]; }).join('; '), 'Старт');
    p.startedAt = iso(Date.now()); s.done = true; s.doneAt = p.startedAt; var n = cur(p); if (n) n.due = dueFor(p, n); st.pjIn = false; ui.toast('Срок пошёл с сегодняшнего дня');
  });
  act('pj-done', function (p, b) {
    var s = p.stages[Number(b.getAttribute('data-n'))]; if (!s) return;
    if (s.key === 'plan' && !p.plans.length) { ui.toast('Сначала загрузите вариант планировки', 'error'); return; } if (s.key === 'plan' && p.planChosen == null) { ui.toast('Отметьте, какой вариант выбрал клиент', 'error'); return; }
    s.done = true; s.doneAt = iso(Date.now()); decide(p, 'Этап «' + s.name + '» утверждён клиентом', s.name);
    if (p.wait) { p.paused = (p.paused || 0) + pausedNow(p); p.wait = false; p.waitSince = ''; }
    var n = cur(p); if (n) n.due = dueFor(p, n); ui.toast(n ? 'Дальше: ' + n.name : 'Проект сдан');
  });
  act('pj-undo', function (p, b) { var i = Number(b.getAttribute('data-n')); p.stages.forEach(function (s, k) { if (k >= i) { s.done = false; s.doneAt = ''; } }); if (i === 0) p.startedAt = ''; });
  act('pj-fix-add', function (p, b) { var i = Number(b.getAttribute('data-n')), el = root.querySelector('[data-fix-in="' + i + '"]'), t = el ? el.value.trim() : ''; if (!t) { ui.toast('Напишите пункт', 'error'); return; } p.stages[i].fixes.push(t); });
  act('pj-fix-del', function (p, b) { p.stages[Number(b.getAttribute('data-n'))].fixes.splice(Number(b.getAttribute('data-k')), 1); });
  act('pj-fix-ok', function (p, b) {
    var s = p.stages[Number(b.getAttribute('data-n'))]; if (!s || !s.fixes.length) return;
    decide(p, (s.kind === 'swap' ? 'Замены: ' : 'Правки: ') + s.fixes.join('; '), s.name); s.used += s.kind === 'swap' ? s.fixes.length : 1; s.fixes = [];
    if (p.wait) { p.paused = (p.paused || 0) + pausedNow(p); p.wait = false; p.waitSince = ''; } ui.toast('Список записан в решения');
  });
  act('pj-dec-add', function (p) { var el = root.querySelector('#pj-dec'), t = el ? el.value.trim() : ''; if (!t) return; var s = cur(p); decide(p, t, s ? s.name : ''); });
  act('pj-q-add', function (p) { var v = function (id) { var e = root.querySelector('#' + id); return e ? e.value.trim() : ''; }; if (!v('pj-qt')) { ui.toast('Напишите вопрос', 'error'); return; } p.questions.push({ at: iso(Date.now()), from: v('pj-qf'), ref: v('pj-qr'), text: v('pj-qt'), answer: '' }); });
  act('pj-ex', function (p, b) { p.extras.push({ key: b.getAttribute('data-k'), name: b.getAttribute('data-name'), price: b.getAttribute('data-p'), at: iso(Date.now()), status: 'предложено' }); decide(p, 'Предложена доп. услуга: ' + b.getAttribute('data-name') + ' — ' + rub(b.getAttribute('data-p')), ''); });
  DC.acts['pj-an-none'] = function () { ui.toast('Файл анкеты в демо не приложен', 'error'); };
  act('pj-ex-paid', function (p, b) { p.extras.forEach(function (e) { if (e.key === b.getAttribute('data-k')) e.status = 'оплачено'; }); });

  act('pw-own-del', function (p, b) { (p.ownRenders || []).splice(Number(b.getAttribute('data-k')), 1); });
  act('pw-cap-off', function (p) { p.capsule = ''; p.swaps = {}; });
  act('pw-open', function (p, b) { var k = b.getAttribute('data-k'); st.pwOpen = st.pwOpen === k ? '' : k; });
  act('pw-set', function (p, b) {
    var f = b.getAttribute('data-f'), v = b.getAttribute('data-v');
    if (f === 'tariff') { if (p.tariff === v) return; var done = {}; p.stages.forEach(function (x) { if (x.done) done[x.key] = 1; }); p.tariff = v; p.stages = buildStages(p, done, p.stages); decide(p, 'Тариф: ' + A.tarName(v), ''); }
    else p[f] = v;
  });
  act('pw-plan-pick', function (p, b) { p.planChosen = Number(b.getAttribute('data-k')); decide(p, 'Клиент выбрал вариант планировки ' + (p.planChosen + 1), 'Планировка'); });
  act('pw-plan-del', function (p, b) { var k = Number(b.getAttribute('data-k')); p.plans.splice(k, 1); if (p.planChosen === k) p.planChosen = null; else if (p.planChosen > k) p.planChosen--; });
  act('pw-lv', function (p, b) {
    var id = b.getAttribute('data-id'), k = b.getAttribute('data-lv'), def = p.level === 'премиум' ? 'premium' : 'base'; p.pick = p.pick || {};
    if (p.swaps[id]) delete p.swaps[id];
    if (k === def) delete p.pick[id]; else p.pick[id] = k;
  });
  act('pw-unswap', function (p, b) { delete p.swaps[b.getAttribute('data-id')]; });
  act('pw-r-del', function (p, b) { var r = b.getAttribute('data-room'); (p.renders[r] || []).splice(Number(b.getAttribute('data-k')), 1); });
  DC.acts['pw-swap'] = function (b) {
    var p = proj(), id = b.getAttribute('data-id'), m = p && (pmats(p) || []).filter(function (x) { return x.id === id; })[0]; if (!m) return;
    DC.openSearch('Замена клиента · ' + (m.title || ''), (DC.capName(p.capsule) || '') + ' · ' + FL[(p.flat || 2) - 1], m.title || '', function (pr) {
      p.swaps[id] = pr; decide(p, 'Замена: ' + (m.title || '') + ' → ' + pr.name, 'Материалы'); var s2 = p.stages.filter(function (x) { return x.key === 'materials'; })[0]; if (s2) s2.used = swapsUsed(p); save(); DC.paint(); ui.toast('Замена сохранена');
    });
  };
  root.addEventListener('change', function (e) {
    var t = e.target, w = t.getAttribute && t.getAttribute('data-pw'), p = proj(); if (!w || !p) return;
    if (w === 'flat') { p.flat = Number(t.value); save(); DC.paint(); return; }
    if (w === 'term') { var td = Math.round(Number(String(t.value).replace(',', '.'))) || 0; p.termDays = td || ''; var dn = {}; p.stages.forEach(function (x) { if (x.done) dn[x.key] = 1; }); var old = p.stages; p.stages = buildStages(p, dn, old.map(function (x) { var y = {}; Object.keys(x).forEach(function (k) { y[k] = x[k]; }); y.due = ''; return y; })); var c = cur(p); if (c && p.startedAt && c.days) c.due = dueFor(p, c); save(); DC.paint(); return; }
    if (w === 'area') { var a = Number(String(t.value).replace(',', '.')); if (a > 0) { p.area = a; save(); DC.paint(); } return; }
    if (w === 'sheet') { p.sheets[t.getAttribute('data-k')] = t.checked; save(); DC.paint(); return; }
    var files = Array.prototype.slice.call(t.files || []); if (!files.length) return;
    Promise.all(files.map(function (f) { return img(f, 1000).then(function (u) { return { name: f.name, url: u }; }); })).then(function (fs) {
      if (w === 'plan') fs.forEach(function (f) { p.plans.push({ name: f.name, url: f.url, at: iso(Date.now()) }); });
      else if (w === 'own') { p.ownRenders = (p.ownRenders || []).concat(fs.filter(function (f) { return f.url; }).map(function (f) { return f.url; })); }
      else if (w === 'render') { var r = t.getAttribute('data-room'); p.renders[r] = (p.renders[r] || []).concat(fs.filter(function (f) { return f.url; }).map(function (f) { return f.url; })); }
      try { save(); } catch (er) { ui.toast('Хранилище браузера заполнено — картинки не сохранились', 'error'); } DC.paint();
    });
  });
  root.addEventListener('change', function (e) {
    var t = e.target, f = t.getAttribute && t.getAttribute('data-px'), p = proj(); if (!f || !p) return;
    if (f === 'anketa') { var fl = t.files && t.files[0]; if (!fl) return; var fr = new FileReader(); fr.onload = function () { p.anketa = { at: iso(Date.now()), name: fl.name, url: fl.size < 1.5e6 ? fr.result : '' }; try { save(); } catch (er) { p.anketa.url = ''; save(); ui.toast('Файл большой — в демо сохранилось только имя', 'error'); } DC.paint(); }; fr.readAsDataURL(fl); return; }
    var k = t.getAttribute('data-k');
    if (f === 'intake') p.intake[k] = t.checked; else if (f === 'check') { p.check = p.check || {}; p.check[k] = t.checked; }
    else if (f === 'scenario') p.scenario = t.value; else if (f === 'brief') p.brief = t.value.trim(); else if (f === 'ask') p.ask[k] = t.value.trim();
    else if (f === 'answer') p.questions[Number(k)].answer = t.value.trim();
    else if (f === 'file') { var s = p.stages[Number(t.getAttribute('data-n'))]; Array.prototype.forEach.call(t.files || [], function (x) { s.files.push({ name: x.name, at: iso(Date.now()) }); }); }
    save(); if (f !== 'brief' && f !== 'ask') DC.paint();
  });

  /* ── шаблоны сообщений: тексты повторяются в каждом проекте почти дословно ── */
  DC.acts['pj-tpl'] = function () {
    var p = proj(); if (!p) return; var s = cur(p), nm = p.client_name, total = plan(p).total(p), two = p.tariff === 'optimal';
    var T = [
      ['Старт', nm + ', добрый день! Анкета принята, данные полные — запускаем проект. Срок по тарифу — ' + total + ' рабочих дней, время на ваши ответы и согласования в него не входит. Первый этап — планировка' + (s && s.days ? ', пришлём до ' + A.ru(s.due || dueFor(p, s)) : '') + '. Референсы присылайте сюда: что нравится и что точно нет.'],
      ['Планировка', nm + ', добрый день! Направляю ' + (two ? 'два варианта' : 'вариант') + ' планировки с расстановкой мебели. ' + (two ? 'Напишите, какой берём за основу и что в нём изменить. ' : '') + 'В тариф входит один круг правок — соберите, пожалуйста, все пожелания одним сообщением.'],
      ['ИИ-рендеры', nm + ', добрый день! Отправляю ИИ-рендеры по помещениям. Важно: это ИИ-рендеры, а не визуализации — они показывают стиль, мебель и материалы, а размеры и состав берутся из чертежей. В тариф входит до трёх замен: свет, сантехника, мебель.'],
      ['Чертежи', nm + ', добрый день! Отправляю альбом, спецификацию и бюджет. Посмотрите особенно электрику: розетки и выключатели проще поменять сейчас. Предлагаю созвон с показом экрана — напишите удобные день и время.'],
      ['Напоминание', nm + ', добрый день! Ждём ваш ответ по проекту. Пока ждём, срок не идёт — продолжим в день, когда вы ответите.'],
      ['Сверх тарифа', nm + ', это пожелание выходит за рамки тарифа: бесплатные правки уже использованы. Можем сделать как доп. услугу — пришлю стоимость, или оставляем как есть.']
    ];
    var m = DC.sheet({ title: 'Шаблоны сообщений', html: '<p class="small muted">Нажмите «Скопировать» и вставьте в чат с клиентом.</p>' + T.map(function (x, i) { return '<div class="pj-tpl"><b>' + x[0] + '</b><p>' + esc(x[1]) + '</p><button type="button" class="dr-sbtn" data-copy="' + i + '">Скопировать</button></div>'; }).join(''), actions: [{ label: 'Закрыть', kind: 'primary' }] });
    m.el.addEventListener('click', function (e) { var b = e.target.closest('[data-copy]'); if (!b) return; var t = T[Number(b.getAttribute('data-copy'))][1]; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { ui.toast('Скопировано'); }, function () { ui.toast('Не получилось скопировать — выделите текст вручную', 'error'); }); });
  };
})();
