/* Общее для экранов блока «Планировка»: шапка с полосой шагов и состояние сценария (анкета, выбранная капсула), которое
   живёт в localStorage между страницами. Платных вызовов здесь нет. */
(function () {
  var KEY = 'sove.demo.flow.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(patch) {
    var cur = load(); Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    return cur;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* ── шапка блока «Планировка» (ТЗ-planirovka, ред. 24.10 13:30, п. 1): «← Назад», токены, заголовок,
     полоса шагов. Таблеток сценариев нет: сценарий один — План · Чтение · Проверка · Вопросы · Мебель (5),
     с перепланировкой между Вопросами и Мебелью встаёт «Варианты стен» (6). Дизайн-проект — свой вход, 3 шага. */
  var SCN = { project: { href: 'plan-demo.html?scn=project', n: 3 } };
  /* перепланировка включена: пришли с ?replan=1 или включили переключатель (sove.answers[flatId].replan) */
  function replanOn() { return new URLSearchParams(location.search).get('replan') === '1' || !!load().replan; }
  function setReplan(on) { save({ replan: !!on }); }
  /* номер шага по имени: plan · read · check · questions · walls · furniture */
  function stepOf(name) {
    var list = ['plan', 'read', 'check', 'questions'].concat(replanOn() ? ['walls'] : [], ['furniture']);
    return list.indexOf(name) + 1;
  }
  /* дизайн блока утверждён 24.10: вариант А «как в эталоне» (варианты Б и В убраны) */
  var STEP_NAMES = { plan: 'План', read: 'Чтение', check: 'Проверка', questions: 'Вопросы', walls: 'Стены', furniture: 'Мебель' };
  function stepList(kind) { return kind === 'project' ? ['plan', 'read', 'furniture'] : ['plan', 'read', 'check', 'questions'].concat(replanOn() ? ['walls'] : [], ['furniture']); }
  /* done — экран итога: все отрезки полосы зелёные (эталон A6) */
  function blockHead(kind, step, done) {
    var list = stepList(kind), total = list.length, bars = '';
    if (typeof step === 'string') step = stepOf(step);
    for (var i = 1; i <= total; i++) bars += '<span class="pz-bar__i' + (i < step || done ? ' is-done' : i === step ? ' is-now' : '') + '"></span>';
    /* токены: вошёл — баланс; не вошёл — подарок за регистрацию (50), как в эталоне */
    var S = window.SOVE, bal = S && S.tokens ? S.fmt.tokens(S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens) : '';
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var tok = bal ? '<a class="pz-tok" href="tokens.html?returnTo=' + rt + '">' + esc(bal) + ' 🎁</a>' : '';
    return '<header class="pz-head">' +
      '<div class="pz-head__top"><span class="pz-head__nav"><button type="button" class="pz-back" data-pz-back>← Назад</button>' +
        '<button type="button" class="pz-back pz-back--step" data-pz-step>‹ Шаг назад</button></span>' + tok + '</div>' +
      '<h1 class="pz-head__t">Планировка</h1>' +
      '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="' + step + '">' + bars +
        '<small>шаг ' + step + ' из ' + total + '</small></div>' +
      '</header>';
  }

  /* ── «← Назад» и «Шаг назад» — разные кнопки (Алина 28.10: «Назад и шаг назад должны быть разными кнопками»).
     «← Назад» выводит из Планировки туда, откуда в неё пришли (Генерации, Мой ремонт…), «Шаг назад» — на предыдущий шаг.
     Шаги внутри plan-demo.html и arrange.html ведут сами страницы (перехватывают «Шаг назад» раньше), здесь — переходы между страницами.
     Откуда пришли — запоминаем на входе в блок: детали (вход, токены, оплата, рамка телефона) и сами шаги Планировки не считаются.
     Точка входа — только на страницах блока; на остальных с этой шапкой (result.html, Генерации) «← Назад» — как раньше */
  var PLAN_PAGE = /\/(plan-demo|arrange|plan-save)\.html$/.test(location.pathname);
  var ENTRY = 'sove.plan.entry', PAGE_RE = /^[a-z0-9_-]+\.html$/i, INNER = /^(plan-demo|arrange|plan-save|auth|tokens|phone|pay|metod)\.html$/i;
  /* страница из адреса (referrer): только свой origin и имя вида «страница.html» с параметрами; чужой сайт, пустой
     адрес или деталь блока — null. Так в точку входа не попадёт чужой адрес (referrer проверялся по подстроке хоста) */
  function pageOf(href) {
    var u; try { u = new URL(href); } catch (e) { return null; }
    var name = u.pathname.split('/').pop();
    return u.origin === location.origin && PAGE_RE.test(name) && !INNER.test(name) ? name + u.search : null;
  }
  function sameSite(href) { try { return new URL(href).origin === location.origin; } catch (e) { return false; } }
  /* записанное тоже проверяем — переход делаем только на свою страницу вида «имя.html?…» */
  function entryOk(v) { var m = /^([^?#]+)(\?[^#]*)?$/.exec(v || ''); return !!(m && PAGE_RE.test(m[1]) && !INNER.test(m[1])); }
  (function () {
    var to = PLAN_PAGE ? pageOf(document.referrer) : null;
    if (to) try { sessionStorage.setItem(ENTRY, to); } catch (e) { /* без памяти — в Генерации */ }
  })();
  function entryPage() { var to = null; try { to = sessionStorage.getItem(ENTRY); } catch (e) {} return entryOk(to) ? to : 'sove-ai.html'; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pz-back]'); if (!b) return;
    /* не страница блока (Визуализации, Генерации) — назад по истории со своего сайта, иначе в Генерации */
    if (!PLAN_PAGE) { if (history.length > 1 && sameSite(document.referrer)) history.back(); else location.href = 'sove-ai.html'; return; }
    /* расстановка вне сценария (открыли из Мой ремонт) — назад по истории, как раньше */
    if (/arrange\.html/.test(location.pathname) && !/flow=1/.test(location.search)) { if (history.length > 1) history.back(); else location.href = 'sove-ai.html'; return; }
    var to = entryPage();
    /* страницу Планировки открыли прямо со страницы входа — назад по истории, без лишней записи; иначе (пришли с шага
       Планировки, после входа) переход: «назад по истории» замкнул бы круг первая страница → мебель → … */
    if (history.length > 1 && pageOf(document.referrer) === to) history.back(); else location.href = to;
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pz-step]'); if (!b) return;
    if (/arrange\.html/.test(location.pathname)) {
      /* расстановка вне сценария (открыли из «Мой ремонт», без flow=1): шага «Вопросы» перед ней не было — назад по истории
         со своего сайта, иначе в «Мой ремонт»; вести на вопросы с чужими ответами было бы ложным шагом */
      if (!/flow=1/.test(location.search)) { if (history.length > 1 && sameSite(document.referrer)) history.back(); else location.href = 'my.html'; return; }
      /* мебель и «Варианты стен» → шаг «Вопросы» (Алина 27.10: plan-demo.html?back=1). Пришли туда со страницы Планировки —
         та же запись истории (вопросы восстанавливает plan-demo.js), иначе заменяем запись, чтобы «назад» не вёл снова в расстановку */
      if (history.length > 1 && /plan-demo\.html/.test(document.referrer)) history.back(); else location.replace('plan-demo.html?back=1');
      return;
    }
    /* «Моя планировка» → мебель */
    if (/plan-save\.html/.test(location.pathname)) {
      if (history.length > 1 && /arrange\.html/.test(document.referrer)) history.back();
      else location.href = 'arrange.html?v=panel&flow=1' + (load().live ? '&live=1' : '');
      return;
    }
    /* у шага нет предыдущего на этой странице (вопросы, открытые с экрана мебели) — назад по истории */
    if (history.length > 1) history.back(); else location.href = entryPage();
  });

  /* ── цена «Вариантов стен» в токенах (открытое решение № 1 ТЗ: Алина 24.10 — «например, 10») ── */
  var REPLAN_PRICE = 10;
  /* подпись цены: «+10 токенов» (Алина 24.10) */
  function priceTxt() { return '+' + REPLAN_PRICE + ' токенов'; }
  /* ключ генерации: тот же план и те же ответы — второй раз не списываем (ТЗ 4.3) */
  function replanKey() { var f = load(); return JSON.stringify([f.flat || '', f.source || '', f.replanAnswers || {}]); }
  /* окно списания (эталон B2c). onGen — после списания (или если уже оплачено), onSkip — «Без перепланировки» */
  function replanSheet(onGen, onSkip) {
    var S = window.SOVE, inn = S.auth.isIn(), bal = inn ? S.tokens.balance() : S.data.gift.tokens;
    var paid = load().replanPaid === replanKey(), enough = !inn || bal >= REPLAN_PRICE;
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-sheet-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-sheet-t">Варианты стен</b><small class="pz-sheet__s">3 варианта под твою жизнь · только то, что разрешено технически</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + (paid ? 'уже оплачено' : priceTxt(true)) + '</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(S.fmt.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough || paid
        ? '<button type="button" class="pz-btn" data-sheet="gen">' + (paid ? 'Показать варианты' : (inn ? 'Сгенерировать · ' : 'Войти и сгенерировать · ') + priceTxt()) + '</button>'
        : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<button type="button" class="pz-link" data-sheet="skip"><u>Без перепланировки — сразу мебель</u></button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-sheet]'); if (!b) return;
      close();
      if (b.dataset.sheet === 'skip') { setReplan(false); return onSkip && onSkip(); }
      if (paid) return onGen();
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      /* списываем один раз: резерв → генерация (в прототипе заглушки, ошибок нет) → списано; при ошибке — refund */
      var op = S.tokens.reserve(REPLAN_PRICE, 'Планировка · варианты стен', 'replan');
      if (!op) { S.ui.toast('Не хватает токенов'); return; }
      S.tokens.commit(op); save({ replanPaid: replanKey() });
      document.querySelectorAll('.pz-tok').forEach(function (el) { el.textContent = S.fmt.tokens(S.tokens.balance()) + ' 🎁'; });
      onGen();
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var f = back.querySelector('[data-sheet="gen"], .pz-btn'); if (f) f.focus();
  }

  /* ── «Какой интерьер?»: плитка «＋ Свой интерьер» + капсулы (прямоугольные, только названия) ──
     общая для вопросов (A4), мебели по размерам (A5а) и «сменить интерьер» (A5б) */
  var CAPS = ['k2', 'k1', 'k3', 'k4', 'k5'];
  /* названия капсул в выборе интерьера — открытый вопрос ТЗ (№ 3); пока полные названия из data.js вместо заглушки «[название]» */
  function capName(id) { var k = window.SOVE_KB && SOVE_KB.capsule(id), c = window.SOVE && SOVE.data.capsule(id); return k ? k.name : c ? c.name : 'Капсула'; }   /* настоящие названия капсул вместо «[название]»; сначала — как в Интерьере (kb), чтобы у капсулы было одно имя */
  function interiorTiles(it, dark) {
    var D = window.SOVE.data;
    return '<div class="pz-caps' + (dark ? ' is-dark' : '') + '">' +
      '<button type="button" class="pz-cap pz-cap--own' + (it && it.type === 'own' ? ' is-on' : '') + '" data-own-open><span class="pz-cap__img">＋<small>фото или рендер</small></span><b>' + (it && it.type === 'own' ? esc(it.name) : 'Свой интерьер') + '</b></button>' +
      CAPS.map(function (id) {
        var c = D.capsule(id); if (!c) return '';
        return '<button type="button" class="pz-cap' + (it && it.id === id ? ' is-on' : '') + '" data-cap="' + id + '"><span class="pz-cap__img" style="background-image:url(' + esc(c.cover) + ')"></span><b>' + esc(capName(id)) + '</b></button>';
      }).join('') + '</div>';
  }
  function capsuleInterior(id) { var c = window.SOVE.data.capsule(id); return c ? { type: 'capsule', id: c.id, name: capName(c.id) } : null; }
  /* «＋ Свой интерьер»: три способа (п. A4) — фото или рендер, ведомость / спецификация, ссылка */
  function ownSheet(done) {
    var m = window.SOVE.ui.modal({ eyebrow: 'Свой интерьер', title: 'Как покажешь интерьер?',
      html: '<div class="pz-own">' +
        '<label class="pz-own__i"><input type="file" accept="image/*" hidden data-own="photo"><b>📷 Фото или рендер</b><small>найдём похожую мебель и материалы</small></label>' +
        '<label class="pz-own__i"><input type="file" accept="application/pdf,image/*,.xlsx,.xls" hidden data-own="spec"><b>📄 Ведомость или спецификация</b><small>из дизайн-проекта — берём ровно то, что в проекте</small></label>' +
        '<div class="pz-own__i"><b>🔗 Ссылка</b><small>Pinterest, сайт — как фото</small><div class="pz-own__url"><input class="input" type="url" placeholder="https://" data-own-url><button type="button" class="pz-chip is-on" data-own="link">Готово</button></div></div>' +
      '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    var NAMES = { photo: 'Свой интерьер · по фото', spec: 'Свой интерьер · по ведомости', link: 'Свой интерьер · по ссылке' };
    function pick(how) { m.close(); done({ type: 'own', how: how, name: NAMES[how] }); }
    m.el.querySelectorAll('input[type=file][data-own]').forEach(function (inp) {
      inp.addEventListener('change', function () { if (inp.files && inp.files[0]) pick(inp.getAttribute('data-own')); });
    });
    m.el.querySelector('button[data-own="link"]').addEventListener('click', function () {
      var u = m.el.querySelector('[data-own-url]'); if (!u.value.trim()) { u.focus(); return; } pick('link');
    });
  }

  /* ── лента «Выбери интерьер» (ТЗ-planirovka, раздел 14): одна на все экраны, пока интерьер не выбран.
     Прилипает снизу над полосой «Корзина · Избранное · Бюджет». Показываем на A3, вариантах стен, A5а, A6
     и дашборде Моего ремонта; на A2 и A4 — нет. «×» сворачивает в «✦ Интерьер» до следующего экрана.
     opts: { show, onPick(interior) } — onPick: экран перестраивает мебель и бюджет */
  var stripOpts = null, stripFolded = false;
  function interiorChosen() { var R = window.SOVE && window.SOVE.repair; return !!(load().interior || (R && R.get().interior)); }
  function interiorStrip(opts) {
    stripOpts = opts || {}; stripFolded = false; drawStrip(); setTimeout(drawStrip, 0);
  }
  function drawStrip() {
    var el = document.getElementById('pz-istrip');
    /* на экране уже есть выбор интерьера на месте бюджета — липкую ленту не показываем, чтобы не закрывала визуализации */
    var on = stripOpts && stripOpts.show !== false && !('chosen' in stripOpts ? stripOpts.chosen : interiorChosen()) && !document.querySelector('.pz-ipick');
    document.body.classList.toggle('has-istrip', !!on);
    if (!on) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'pz-istrip'; el.setAttribute('aria-label', 'Выбери интерьер'); document.body.appendChild(el); }
    el.className = 'pz-istrip' + (stripFolded ? ' is-folded' : '');
    if (stripFolded) { el.innerHTML = '<button type="button" class="pz-istrip__fab" data-is="open">✦ Интерьер</button>'; return; }
    el.innerHTML = '<div class="pz-istrip__h"><b>Выбери интерьер — покажем бюджет</b>' +
        '<button type="button" data-is="all" aria-label="Все интерьеры">›</button><button type="button" data-is="fold" aria-label="Скрыть">×</button></div>' + stripList();
  }
  function stripList() {
    return '<div class="pz-istrip__l"><button type="button" class="pz-istrip__t pz-istrip__t--own" data-is="own"><span>＋</span><b>Свой</b></button>' +
      CAPS.map(function (id) {
        var c = window.SOVE.data.capsule(id); if (!c) return '';
        return '<button type="button" class="pz-istrip__t" data-is-cap="' + id + '"><span style="background-image:url(' + esc(c.cover) + ')"></span><b>' + esc(capName(id)) + '</b></button>';
      }).join('') + '</div>';
  }
  /* выбор интерьера: записываем в сценарий и в Мой ремонт → Интерьер (+25% готовности), тост, экран перестраивается */
  /* доска Интерьера (со slots) — собранная и оплаченная в Интерьере; запись Планировки проще, поверх доски её не пишем */
  function board() { var R = window.SOVE && window.SOVE.repair, b = R && R.flats.active() ? R.get().interior : null; return b && b.slots ? b : null; }
  /* доска уже есть, а в Планировке интерьер не выбран — берём капсулу доски, а не спрашиваем заново (выбор затирал доску, её приходилось собирать снова) */
  function adoptBoard() { var b = board(), it = b && b.capsuleId && !load().interior ? capsuleInterior(b.capsuleId) : null; if (it) save({ interior: it }); }
  function pickInterior(it) {
    var S = window.SOVE, R = S.repair;
    save({ interior: it });
    if (R) {
      var c = it.type === 'capsule' ? S.data.capsule(it.id) : null, b = board();
      /* та же капсула, что на доске Интерьера, — доску оставляем; другая — это новый выбор, доска уходит в историю */
      if (!(b && c && b.capsuleId === c.id)) R.save('interior', { capsuleId: c ? c.id : null, name: it.name, img: c ? c.cover : null, dna: c ? c.dna : [],
        productIds: c ? R.capsuleProducts(c.id).map(function (p) { return p.id; }) : [] }, { force: true, silent: true });
    }
    if (stripOpts) stripOpts.chosen = true; drawStrip();
    S.ui.toast('Мебель подобрана под ' + (it.type === 'capsule' ? '«' + it.name + '»' : 'свой интерьер') + ' · бюджет точнее', 'ok');
    if (stripOpts && stripOpts.onPick) stripOpts.onPick(it);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pz-istrip [data-is], #pz-istrip [data-is-cap], .pz-ipick [data-is], .pz-ipick [data-is-cap]'); if (!b) return;
    var a = b.getAttribute('data-is'), cap = b.getAttribute('data-is-cap');
    if (cap) return pickInterior(capsuleInterior(cap));
    if (a === 'fold') { stripFolded = true; drawStrip(); }
    if (a === 'open') { stripFolded = false; drawStrip(); }
    if (a === 'own') ownSheet(pickInterior);
    if (a === 'all') {
      var m = window.SOVE.ui.modal({ eyebrow: 'Интерьер', title: 'Все интерьеры', html: interiorTiles(null), actions: [{ label: 'Закрыть', kind: 'link' }] });
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); pickInterior(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(pickInterior); });
    }
  });

  /* мебель под интерьер вне экрана расстановки (A6): у предмета — товар капсулы той же подкатегории, иначе прежняя цена */
  var SUBCAT_BY = [[/прикроватная тумба/, 'Тумбы'], [/тумба под раковину/, 'Мебель для ванной'], [/кроват/, 'Кровати'], [/диван/, 'Диваны'],
    [/кресл/, 'Кресла'], [/комод/, 'Комоды'], [/обеденный стол/, 'Столы обеденные'], [/журнальн/, 'Столы журнальные'], [/стул/, 'Стулья'],
    [/ванна/, 'Ванны'], [/унитаз/, 'Унитазы'], [/раковин/, 'Раковины'], [/холодильник/, 'Холодильники'], [/вытяжк/, 'Вытяжки']];
  function furnitureSum(goods, interior) {
    var R = window.SOVE.repair, caps = interior && interior.type === 'capsule' && R ? R.capsuleProducts(interior.id) : [];
    return (goods || []).reduce(function (a, g) {
      var l = String(g.label || '').toLowerCase(), sub = (SUBCAT_BY.filter(function (x) { return x[0].test(l); })[0] || [])[1];
      var p = sub ? caps.filter(function (x) { return x.subcat === sub; })[0] : null;
      return a + (p ? p.metod : g.metod || 0);
    }, 0);
  }

  /* ── финал блока (ТЗ-planirovka, раздел 15): «Сохранить в Мой ремонт» · «↓ Скачать планировку» · «↗ Поделиться» ·
     «✦ Дальше: визуализации». Один компонент planFinish() на A5а, A5б, A6 и в плитке Моего ремонта.
     Данные берём из состояния сценария (toSave пишет экран мебели), бюджет — budget.js. ── */
  var SOURCE_LEVEL = { developer: 'developer_plan', measure: 'measured_plan', none: 'none', project: 'design_project' };
  var HKEY = 'sove.plan.history';
  function planDoc() {
    var f = load(), T = f.toSave; if (!T) return null;
    var S = window.SOVE, A = window.SOVE_ARRANGE || { rooms: [] }, INT = f.interior || null, V = T.variant;
    var rooms = f.rooms && f.rooms.length ? f.rooms : A.rooms.filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
    var geo = T.geo || A, furniture = INT ? furnitureSum(T.goods, INT) : T.furniture;
    var R0 = window.SOVE.repair, fl0 = R0 && R0.flats.active(), bp0 = fl0 ? R0.get().budgetPlan : null;
    /* параметры расчёта: из квартиры (правки в расчёте) или из Планировки — план, состояние, интерьер, тип */
    var STATE = { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'secondary' };
    var sp = fl0 && R0.get().scoutParams ? Object.assign({}, R0.get().scoutParams) : { stateId: STATE[f.state] || 'concrete',
      area: Math.round(rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0) * 10) / 10, capsuleId: INT && INT.type === 'capsule' ? INT.id : null, level: bp0 && bp0.type || 'base' };
    if (bp0 && bp0.type) sp.level = bp0.type;
    /* работы — ставкой расчёта × м², как у Алины: объёмов по плану и чертежа в Планировке нет (28.10) */
    var budget = window.SOVE_BUDGET ? window.SOVE_BUDGET.compute({ scout: sp, geo: geo, rooms: rooms, state: f.state || 'concrete_walls', type: bp0 && bp0.type || 'base', interior: INT,
      kitchenLen: T.kitchenLen, furniture: furniture, partitions: V ? V.partitions : null, accuracy: f.accuracy || 'примерно' }) : { lines: [], total: null, type: 'base' };
    return { T: T, INT: INT, V: V, rooms: rooms, geo: geo, furniture: furniture, budget: budget, flatName: f.flat || 'ЖК PRIDE · 47,3 м²',
      source: f.source || 'developer', state: f.state || 'concrete_walls', accuracy: f.accuracy || 'примерно', answers: f.answers || null };
  }
  /* сохранение: план, расстановка, интерьер, ответы, бюджет (11 строк), запись в «Мои планировки»; то же второй раз — без дубля */
  function savePlan() {
    var S = window.SOVE, R = S.repair, P = planDoc(); if (!P || !R) return null;
    var T = P.T, INT = P.INT, V = P.V, flat = R.flats.ensure(), r = R.get(flat.id), all = {};
    try { all = JSON.parse(localStorage.getItem(HKEY) || '{}') || {}; } catch (e) {}
    var list = all[flat.id] || (all[flat.id] = []);
    var key = JSON.stringify([P.flatName, T.arrangement, V && V.id, INT && (INT.id || INT.name), T.items.map(function (i) { return i.box.map(Math.round).join(','); })]);
    var rec = list.filter(function (x) { return x.key === key; })[0], dup = !!rec;
    if (!rec) { rec = { id: 'pl-' + Date.now().toString(36), key: key, flatId: flat.id, type: V ? 'replan' : '3d', variant: V ? V.letter : null, createdAt: Date.now() }; list.unshift(rec); }
    Object.assign(rec, { planImg: T.img, layout: T.items, arrangement: T.arrangement, interiorId: INT ? (INT.id || INT.type) : null, interiorName: INT ? INT.name : null,
      items: INT ? T.goods : null, count: T.count, budget: INT ? { lines: P.budget.lines, total: P.budget.total, type: P.budget.type } : null, flat: P.flatName, answers: P.answers });
    list.forEach(function (x) { x.isMain = x === rec; });
    try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch (e) { list.forEach(function (x) { if (x !== rec) x.planImg = null; }); try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch (e2) {} }
    r.base = { historyId: rec.id, source: P.source, accuracy: P.accuracy, state: P.state };
    r.replan = V ? { historyId: rec.id, variant: V.letter, approval: V.approval } : null;
    /* мебель и бюджет сохраняем только с интерьером: без него цены мебели и бюджета нет (Алина 24.10) */
    if (INT) r.budgetPlan = { lines: P.budget.lines, type: P.budget.type, total: P.budget.total, ts: Date.now(), full: !!(r.budgetPlan && r.budgetPlan.full), furniture: P.furniture };
    r.progress = INT ? 50 : 25;
    /* доску Интерьера сохранение плана не перезаписывает: она полнее и собрана позже выбора в Планировке */
    if (INT && !board()) {
      var c = INT.type === 'capsule' ? S.data.capsule(INT.id) : null;
      R.save('interior', { capsuleId: c ? c.id : null, name: INT.name, img: c ? c.cover : null, dna: c ? c.dna : [], productIds: c ? R.capsuleProducts(c.id).map(function (p) { return p.id; }) : [] }, { force: true, silent: true });
    }
    R.save('plan', { level: SOURCE_LEVEL[P.source] || 'developer_plan', img: T.img, rooms: P.rooms, variant: T.arrangement, jk: T.live ? '' : 'PRIDE', historyId: rec.id }, { force: true, silent: true });
    save({ savedKey: key });
    return { flatId: flat.id, dup: dup, rec: rec };
  }
  /* тост с двумя действиями: «Открыть» и сразу «Дальше: визуализации ›» (15.1) */
  function savedToast(text) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast toast--ok rp-toast pz-toast2';
    t.innerHTML = '<span>' + esc(text) + '</span><a href="my.html">Открыть</a><button type="button" data-pf="visual">Дальше: визуализации ›</button>';
    box.appendChild(t); setTimeout(function () { t.remove(); }, 6500);
  }

  /* ── скачать: PDF (эталон D1), PNG, план с размерами для бригады ── */
  function fileBase(P) {
    var d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var m = String(P.flatName).match(/([\d,]+)\s*м²/), jk = P.T.live ? 'мой-план' : 'PRIDE';
    return 'SOVEAPP_' + jk + '_' + (m ? m[1] : '') + 'м2_планировка_' + date;
  }
  function absUrl(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function rub(v) { return v === null || v === undefined ? '[сумма] ₽' : window.SOVE.fmt.rub(v); }
  function printDoc(title, body) {
    var w = window.open('', '_blank'); if (!w) { window.SOVE.ui.toast('Разреши всплывающие окна, чтобы сохранить PDF'); return; }
    w.document.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;600;800&display=swap">' +
      '<style>@page{size:A4;margin:14mm}body{margin:0;font-family:Montserrat,Arial,sans-serif;color:#1E1C1A}.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #E6E1DA;padding-bottom:8px}' +
      '.logo{font:600 26px "Cormorant Garamond",Georgia,serif;letter-spacing:.35em}.h small{color:#6B655F;font-size:11px}h1{font:600 20px Montserrat;margin:14px 0 2px}.sub{color:#6B655F;font-size:12px;margin:0 0 10px}' +
      'img.plan{width:100%;border-radius:8px;display:block}.rooms{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.rooms div{background:#F4F2EE;border-radius:6px;padding:6px 8px;font-size:10px;color:#6B655F}.rooms b{display:block;font-size:14px;color:#1E1C1A}' +
      '.list{font-size:11px}.list div{display:flex;justify-content:space-between;border-bottom:1px solid #EEE9E3;padding:4px 0}.tot{display:flex;justify-content:space-between;font-weight:800;font-size:13px;margin:8px 0}' +
      '.foot{margin-top:14px;font-size:9px;color:#8E867E}svg{width:100%;height:auto}</style></head><body>' + body +
      '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>');
    w.document.close();
  }
  function headHtml(sub) {
    var d = new Date().toLocaleDateString('ru-RU');
    return '<div class="h"><span><span class="logo">SOVEAPP</span> <small>' + esc(sub) + '</small></span><small>' + d + '</small></div>';
  }
  function pdfPlan(getImg) {
    var P = planDoc(); if (!P) return;
    var T = P.T, img = getImg && getImg() || T.img, rest = Math.max(0, (T.goods || []).length - 4), d = new Date().toLocaleDateString('ru-RU');
    printDoc(fileBase(P), headHtml('планировка и мебель') +
      '<h1>' + esc(P.flatName) + '</h1><p class="sub">' + esc((P.INT ? P.INT.name + ' · ' : '') + '«' + T.arrangement + '» · ' + T.count + ' предметов') + '</p>' +
      (img ? '<img class="plan" src="' + esc(absUrl(img)) + '" alt="">' : '') +
      '<div class="rooms">' + P.rooms.slice(0, 4).map(function (r) { return '<div><b>' + String(r.m2 || '').replace('.', ',') + '</b>' + esc(r.name.toLowerCase()) + '</div>'; }).join('') + '</div>' +
      /* без интерьера — только план и расстановка, без цен мебели и бюджета */
      (P.INT ? '<div class="tot"><span>Мебель</span><span>≈ ' + rub(P.furniture) + '</span></div><div class="list">' +
      (T.goods || []).slice(0, 4).map(function (g) { return '<div><span>' + esc(g.label + ' · ' + String(g.room || '').toLowerCase()) + '</span><span>' + rub(g.metod) + '</span></div>'; }).join('') +
      (rest ? '<div><span>ещё ' + rest + ' предметов …</span><span></span></div>' : '') + '</div>' : '') +
      (P.INT && budgetFull() ? '<div class="tot"><span>Ремонт под ключ</span><span>≈ ' + rub(P.budget.total) + '</span></div>' : '') +
      '<div class="foot">Сделано в SOVEAPP · sove.app<br>Расстановка по нормам проходов. Перед стройкой проверьте размеры по обмеру. Цены METOD на ' + d + '.</div>');
  }
  /* план с размерами: вид сверху, комнаты с размерами, мебель с габаритами в мм — для бригады */
  function pdfDims() {
    var P = planDoc(); if (!P) return;
    var g = P.geo, ppm = g.px_per_m, rooms = g.rooms || [], items = P.T.items || [], all = rooms.map(function (r) { return r.box; });
    var x1 = Math.min.apply(null, all.map(function (b) { return b[0]; })) - 30, y1 = Math.min.apply(null, all.map(function (b) { return b[1]; })) - 30;
    var x2 = Math.max.apply(null, all.map(function (b) { return b[2]; })) + 30, y2 = Math.max.apply(null, all.map(function (b) { return b[3]; })) + 30;
    var mm = function (px) { return Math.round(px / ppm * 1000); };
    var svg = '<svg viewBox="' + [x1, y1, x2 - x1, y2 - y1].join(' ') + '" xmlns="http://www.w3.org/2000/svg" font-family="Montserrat,Arial">' +
      rooms.map(function (r) { var b = r.box; return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '" fill="#fff" stroke="#1E1C1A" stroke-width="3"/>' +
        (r.part_of ? '' : '<text x="' + (b[0] + 6) + '" y="' + (b[1] + 16) + '" font-size="12" font-weight="700">' + esc(r.type === 'гостиная' ? 'Кухня-гостиная' : r.name) + ' · ' + mm(b[2] - b[0]) + '×' + mm(b[3] - b[1]) + '</text>'); }).join('') +
      items.map(function (it) { var b = it.box, w = b[2] - b[0], h = b[3] - b[1]; return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + w + '" height="' + h + '" fill="#EEEAE3" stroke="#6B655F"/>' +
        '<text x="' + ((b[0] + b[2]) / 2) + '" y="' + ((b[1] + b[3]) / 2 + 3) + '" font-size="7" text-anchor="middle" fill="#1E1C1A">' + esc(it.label) + ' ' + mm(w) + '×' + mm(h) + '</text>'; }).join('') + '</svg>';
    printDoc(fileBase(P) + '_размеры', headHtml('план с размерами · для бригады') + '<h1>' + esc(P.flatName) + '</h1><p class="sub">размеры в мм · «' + esc(P.T.arrangement) + '»</p>' + svg +
      '<div class="foot">Сделано в SOVEAPP · sove.app<br>Перед стройкой проверьте размеры по обмеру.</div>');
  }
  /* PNG: чистая картинка плана, «sove.app» мелко в поле под картинкой — не на плане */
  function pngPlan(getImg) {
    var P = planDoc(); if (!P) return;
    var src = getImg && getImg() || P.T.img; if (!src) return;
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      var pad = 40, foot = 56, c = document.createElement('canvas'); c.width = im.naturalWidth + pad * 2; c.height = im.naturalHeight + pad + foot;
      var x = c.getContext('2d'); x.fillStyle = '#F4F2EE'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, pad, pad);
      x.fillStyle = '#8E867E'; x.font = '500 18px Montserrat, Arial, sans-serif'; x.textAlign = 'right'; x.fillText('sove.app', c.width - pad, c.height - 20);
      var a = document.createElement('a'); a.download = fileBase(P) + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    };
    im.src = src;
  }
  function downloadSheet(getImg) {
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-dl-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-dl-t">Скачать планировку</b><small class="pz-sheet__s">файл в оформлении SOVEAPP · на самом плане никаких знаков</small>' +
      '<button type="button" class="pz-dl" data-dl="pdf"><b>PDF · 1 страница</b><small>3D-план с мебелью, площади, мебель с ценами, итог ремонта</small></button>' +
      '<button type="button" class="pz-dl" data-dl="png"><b>PNG · картинка</b><small>для мессенджеров — чистый 3D-план</small></button>' +
      '<button type="button" class="pz-dl" data-dl="dims"><b>План с размерами · PDF</b><small>вид сверху, размеры мебели в мм — для бригады</small></button>' +
      '<button type="button" class="pz-link" data-dl="close">Отмена</button></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-dl]'); if (!b) return; close();
      var k = b.dataset.dl; if (k === 'pdf') pdfPlan(getImg); if (k === 'png') pngPlan(getImg); if (k === 'dims') pdfDims();
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
  }
  /* «↗ Поделиться»: картинка плана + ссылка (заглушка sove.app/p/<id>) системным меню; нет меню — скачиваем PNG */
  function sharePlan(getImg) {
    var P = planDoc(); if (!P) return;
    var src = getImg && getImg() || P.T.img, url = 'https://sove.app/p/demo';
    if (!navigator.share) { pngPlan(getImg); return; }
    fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      var file = new File([b], fileBase(P) + '.png', { type: b.type || 'image/png' });
      var data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title: 'Моя планировка · SOVEAPP', url: url } : { title: 'Моя планировка · SOVEAPP', url: url };
      return navigator.share(data);
    }).catch(function () {});
  }
  /* «Дальше: визуализации»: без интерьера — сначала выбор интерьера; перед переходом — автосохранение (15.3) */
  function goVisual() {
    adoptBoard();
    var f = load();
    if (!f.interior) {
      var m = window.SOVE.ui.modal({ eyebrow: 'Сначала интерьер', title: 'В каком интерьере показать комнаты?', html: interiorTiles(null), actions: [{ label: 'Отмена', kind: 'link' }] });
      function go(it) { save({ interior: it }); goVisual(); }
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); go(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(go); });
      return;
    }
    if (finishOpts && finishOpts.before) finishOpts.before();
    var r = savePlan();
    window.SOVE.ui.toast('Сохранено в Мой ремонт', 'ok');
    /* как у Алины: в Интерьер на комнаты без ?capsule= — с ним Интерьер сразу собирал доску и молча списывал 10 токенов, гостя уводил на вход */
    setTimeout(function () { location.href = 'interior.html?from=plan&tab=rooms&flat=' + encodeURIComponent(r ? r.flatId : ''); }, 600);
  }
  var finishOpts = null;
  /* opts: { getImg() — картинка 3D-плана сейчас; before() — экран дописывает расстановку; after(res) — после сохранения } */
  function planFinish(opts) {
    finishOpts = opts || {};
    var thumbs = ['2-spalnya', '3-kuhnya-gostinaya', '4-sanuzel', '5-prihozhaya'];
    return '<section class="pz-finish">' +
      (finishOpts.noSave ? '' : '<button type="button" class="pz-btn" data-pf="save">Сохранить в Мой ремонт</button>') +

      '<button type="button" class="pz-visual" data-pf="visual"><span class="pz-visual__t"><b>✦ Дальше: визуализации</b><small>Покажем каждую комнату в интерьере · ' + priceTxt() + ' за комнату</small>' +
        '<span class="pz-visual__th">' + thumbs.map(function (t) { return '<i style="background-image:url(assets/img/demo/' + t + '.jpg)"></i>'; }).join('') + '</span></span><em>›</em></button>' +
      /* одно «Дальше» на экране (методология, П2): скачать, поделиться и перепланировка — в «Ещё» */
      /* Алина: экран добавил перепланировку в «Ещё» — подпись «…, стены» */
      '<button type="button" class="pz-link" data-pf="more">Ещё ⋯ скачать, поделиться' + (finishOpts.more && finishOpts.more.length ? ', стены' : '') + '</button>' +
      '</section>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pf]'); if (!b) return;
    var a = b.getAttribute('data-pf'), o = finishOpts || {};
    if (a === 'visual') { if (b.closest('.toast')) b.closest('.toast').remove(); return goVisual(); }
    if (a === 'more') return moreSheet(o);
    if (o.before) o.before();
    if (a === 'save') {
      var r = savePlan(); if (!r) return;
      savedToast(r.dup ? '✓ Уже сохранено в Мой ремонт' : '✓ Сохранено в Мой ремонт');
      if (o.after) o.after(r);
    }
    if (a === 'download') downloadSheet(o.getImg);
    if (a === 'share') sharePlan(o.getImg);
  });

  /* «Ещё ⋯»: скачать, поделиться и то, что добавил экран (opts.more: [{ label, onClick }]) */
  function moreSheet(o) {
    var items = [{ label: '↓ Скачать планировку', onClick: function () { if (o.before) o.before(); downloadSheet(o.getImg); } },
      { label: '↗ Поделиться', onClick: function () { if (o.before) o.before(); sharePlan(o.getImg); } }].concat(o.more || []);
    var m = window.SOVE.ui.modal({ eyebrow: 'Планировка', title: 'Ещё', html: '<div class="pz-more">' + items.map(function (x, i) {
      return '<button type="button" class="pz-btn2" data-more="' + i + '">' + x.label + '</button>'; }).join('') + '</div>', actions: [{ label: 'Закрыть', kind: 'link' }] });
    m.el.querySelectorAll('[data-more]').forEach(function (b) { b.addEventListener('click', function () { m.close(); items[+b.dataset.more].onClick(); }); });
  }

  /* ── список товаров с выбором галочками (ТЗ-planirovka, раздел 16): один компонент на все списки блока,
     дальше — Генерации и Мой ремонт. rows: [{ p: товар, label, room, pick? }]; opts: { key, title, rerender, limit }.
     Обычный режим — ♡ / 🛒 у каждого товара и «Выбрать»; режим выбора — галочки, «Выбрать все», панель снизу. ── */
  var PL = {};
  function plState(key) { return PL[key] || (PL[key] = { on: false, sel: {}, all: false, rows: [], opts: {} }); }
  function productList(rows, opts) {
    var R = window.SOVE.repair, F = window.SOVE.fmt, st = plState(opts.key || 'list'); st.rows = rows; st.opts = opts;
    var withP = rows.filter(function (r) { return r.p; }), sum = withP.reduce(function (a, r) { return a + (r.p.metod || 0); }, 0);
    /* цены всегда две: с подпиской METOD и без (Алина 24.10) */
    var sumR = withP.reduce(function (a, r) { return a + (r.p.retail || r.p.metod || 0); }, 0);
    var shown = st.on || st.all || !opts.limit ? rows : rows.slice(0, opts.limit), nSel = Object.keys(st.sel).length, key = esc(opts.key || 'list');
    var html = '<section class="pz-card pz-goods pz-pl' + (st.on ? ' is-sel' : '') + '" data-pl="' + key + '">' +
      '<div class="pz-goods__h"><b>' + esc(opts.title) + ' · ' + rows.length + '</b>' +
        (st.on ? '<span class="pz-pl__ctl"><button type="button" data-pl-act="all">' + (nSel === withP.length ? 'Снять все' : 'Выбрать все · ' + withP.length) + '</button><button type="button" data-pl-act="done">Готово</button></span>'
               : '<span class="pz-pl__ctl"><span class="pz-2p"><b>≈ ' + F.rub(sum) + '</b><small>без подписки ' + F.rub(sumR) + '</small></span><button type="button" data-pl-act="select">Выбрать</button></span>') + '</div>' +
      shown.map(function (r, i) {
        var on = !!st.sel[i], inCart = r.p && R.cart.has(r.p.id);
        return '<div class="pz-good' + (st.on ? ' is-sel' : '') + (on ? ' is-on' : '') + '"' + (st.on && r.p ? ' data-pl-row="' + i + '" role="checkbox" aria-checked="' + on + '" tabindex="0"' : '') + '>' +
          (st.on ? '<i class="pz-check" aria-hidden="true">' + (on ? '✓' : '') + '</i>' : '') +
          (r.p ? '<img src="' + esc(r.p.img) + '" alt="" loading="lazy">' : '<i class="pz-good__ph"></i>') +
          '<span class="pz-good__t"' + (!st.on && r.pick !== undefined ? ' data-pick="' + r.pick + '" role="button" tabindex="0"' : '') + '><b>' + esc(r.label) + '</b><small>' + esc(String(r.room || '').toLowerCase()) + (inCart ? ' · <em>в корзине</em>' : '') + '</small></span>' +
          (r.p ? R.price(r.p) + (st.on ? '' : '<span class="pz-good__act">' + R.btns(r.p, 'market') + '</span>') : '<small class="pz-note">нет в Маркете</small>') +
          '</div>';
      }).join('') +
      (!st.on && opts.limit && rows.length > opts.limit ? '<button type="button" class="pz-link" data-pl-act="more">' + (st.all ? 'Свернуть' : 'Все ' + rows.length + ' предметов ›') + '</button>' : '') +
      '</section>' +
      '<div class="pz-pl__quick"><button type="button" class="pz-btn2" data-pl-act="cart-all" data-pl="' + key + '">Всё в корзину · ' + withP.length + '</button>' +
        '<button type="button" class="pz-link" data-pl-act="fav-all" data-pl="' + key + '">♡ Всё в избранное</button></div>';
    setTimeout(function () { plPanel(opts.key || 'list'); }, 0);
    return html;
  }
  /* выбранные строки → id товаров; одинаковые предметы на плане (две тумбы) — две штуки */
  function selIds(st, all) {
    var ids = []; st.rows.forEach(function (r, i) { if (r.p && (all || st.sel[i])) ids.push(r.p.id); }); return ids;
  }
  /* панель действий снизу (над полосой) — только в режиме выбора */
  function plPanel(key) {
    var st = plState(key), el = document.getElementById('pz-plbar'), F = window.SOVE.fmt;
    document.body.classList.toggle('has-plbar', st.on);
    if (!st.on) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'pz-plbar'; el.className = 'pz-plbar'; document.body.appendChild(el); }
    var n = Object.keys(st.sel).length, sum = Object.keys(st.sel).reduce(function (a, i) { var r = st.rows[i]; return a + (r && r.p ? r.p.metod : 0); }, 0);
    el.setAttribute('data-pl', key);
    el.innerHTML = '<b>' + (n ? 'Выбрано ' + n + ' · ≈ ' + F.rub(sum) : 'Выбери товары') + '</b>' +
      '<div><button type="button" class="pz-btn" data-pl-act="to-cart"' + (n ? '' : ' disabled') + '>🛒 В корзину · ' + n + '</button>' +
      '<button type="button" class="pz-btn2" data-pl-act="to-fav"' + (n ? '' : ' disabled') + '>♡ В избранное · ' + n + '</button></div>';
  }
  function plural3(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }
  /* в корзину: уже лежащие не добавляем второй раз; в избранное — избранное активной квартиры */
  function plToCart(ids) {
    var R = window.SOVE.repair; R.flats.ensure();
    /* уже лежащие в корзине не добавляем и количество не меняем (16.4); новые — по числу предметов на плане */
    var had = {}; ids.forEach(function (id) { had[id] = R.cart.has(id); });
    ids.forEach(function (id) { if (!had[id]) R.cart.add(id, 'market', true); });
    R.flats.update(R.flats.active().id, {});                    /* сохраняет корзину и сразу обновляет полосу */
    R.toast(ids.length + ' ' + plural3(ids.length, 'товар', 'товара', 'товаров') + ' в корзине', { label: 'Оформить', href: 'my.html?v=basket' });
  }
  function plToFav(ids) {
    var R = window.SOVE.repair; R.flats.ensure();
    ids.filter(function (id, i) { return ids.indexOf(id) === i; }).forEach(function (id) { if (!R.fav.has(id)) R.fav.toggle(id, true); });
    R.toast(ids.length + ' ' + plural3(ids.length, 'товар', 'товара', 'товаров') + ' в избранном', { label: 'Открыть', href: 'favorites.html' });
  }
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('[data-pl-row]');
    var b = e.target.closest && e.target.closest('[data-pl-act]');
    if (!row && !b) return;
    var host = (row || b).closest('[data-pl]') || b, key = host.getAttribute('data-pl') || 'list', st = plState(key), re = st.opts.rerender || function () {};
    if (row) { var i = row.getAttribute('data-pl-row'); if (st.sel[i]) delete st.sel[i]; else st.sel[i] = 1; return re(); }
    var a = b.getAttribute('data-pl-act'); e.preventDefault();
    if (a === 'select') { st.on = true; st.sel = {}; }
    if (a === 'done') { st.on = false; st.sel = {}; }
    if (a === 'more') st.all = !st.all;
    if (a === 'all') { var withP = st.rows.map(function (r, i) { return r.p ? i : -1; }).filter(function (i) { return i >= 0; }); if (Object.keys(st.sel).length === withP.length) st.sel = {}; else withP.forEach(function (i) { st.sel[i] = 1; }); }
    if (a === 'to-cart' || a === 'to-fav') { var ids = selIds(st, false); if (!ids.length) return; (a === 'to-cart' ? plToCart : plToFav)(ids); st.on = false; st.sel = {}; }
    if (a === 'cart-all') plToCart(selIds(st, true));
    if (a === 'fav-all') plToFav(selIds(st, true));
    re();
  });
  document.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && e.target.matches && e.target.matches('[data-pl-row]')) { e.preventDefault(); e.target.click(); } });

  /* ── бюджет за токены (раздел 17): бесплатно — только «Мебель на всю квартиру»; полный бюджет из 11 строк —
     «✦ Узнать весь бюджет · +10 токенов» → подтверждение → списание → генерация со стадиями → в Мой ремонт
     (budgetPlan.full). Дальше пересчёт бесплатный. Цена — та же константа, что у вариантов стен (Алина 24.10: «+10 токенов»). ── */
  function budgetFull() { var R = window.SOVE.repair; return !!(R && R.flats.active() && R.get().budgetPlan && R.get().budgetPlan.full); }
  /* полный бюджет куплен — держим строки актуальными при любых изменениях (бесплатно) */
  function refreshBudget() {
    var R = window.SOVE.repair, P = planDoc(); if (!budgetFull() || !P || !P.INT || !window.SOVE_BUDGET) return;   /* без расчёта и без интерьера не затираем итог */
    var bp = R.get().budgetPlan; Object.assign(bp, { lines: P.budget.lines, total: P.budget.total, type: P.budget.type, furniture: P.furniture, ts: Date.now() });
    R.flats.update(R.flats.active().id, {});
  }
  function setBudgetType(type) {
    var R = window.SOVE.repair; if (!budgetFull()) return;
    R.get().budgetPlan.type = type === 'premium' ? 'premium' : 'base'; refreshBudget();
  }
  /* бюджет по методологии (П6): сумма известных слоёв — Мебель · Материалы · Декор и текстиль · Работы, «известно N из 4».
     Мебель — из расстановки, материалы — по выбранному интерьеру (бесплатно), декор — после визуализаций,
     работы — за токены через Расчёт бюджета (П5). Одна цифра «итого» — и здесь, и в полосе «Бюджет» над меню. */
  function budgetLayers() {
    if (!interiorChosen()) return null;                /* без интерьера бюджета нет */
    var P = window.SOVE_BUDGET && planDoc(); if (!P) return null;
    var R = window.SOVE.repair, r = R && R.flats.active() ? R.get() : {}, L = {};
    P.budget.lines.forEach(function (l) { L[l.key] = l.value || 0; });
    var INT = P.INT || (r.interior ? { name: r.interior.name } : null), renders = R && R.flats.active() ? R.rendersCount() : 0, OWN = R && R.flats.active() && R.ownMat ? R.ownMat() : null;
    var parts = [
      /* мебель — расстановка Планировки + разница от предметов, заменённых на рендерах Интерьера (ТЗ Интерьера, 3: уровень 3 меняет строку «Мебель») */
      { key: 'furniture', t: 'Мебель', sub: P.T.count + ' ' + plural3(P.T.count, 'предмет', 'предмета', 'предметов') + ' по расстановке', known: true, value: P.furniture + (r.interior && r.interior.objectDelta || 0) },
      /* «Материалы» — один источник (ТЗ Интерьера, 9): interior — сумма товаров капсулы (только вся квартира), norm — нормы расчёта, метка «план».
         Цифры не складываются и рядом не показываются; «дороже нормы» не пишем */
      OWN ? { key: 'materials', src: 'interior', t: 'Материалы', sub: OWN.known ? 'по выбору · 12 позиций' : OWN.zones === 1 ? '1 комната' : OWN.zones + ' из ' + OWN.total + ' зон', known: OWN.known, value: OWN.value }
        : { key: 'materials', src: 'norm', t: 'Материалы', sub: INT ? 'план · по интерьеру «' + INT.name + '»' : 'план · пол, стены, плитка, свет', known: !!INT, value: L.finish_mat + L.plumbing + L.electric + L.kitchen },
      { key: 'decor', t: 'Декор и текстиль', sub: renders ? 'по визуализациям' : 'после визуализаций', known: renders > 0, value: L.decor },
      { key: 'works', t: 'Работы', sub: 'черновые и чистовые · Расчёт бюджета', known: budgetFull(), value: (L.demolition || 0) + L.rough_works + (L.partitions || 0) + L.rough_mat + L.finish_works }
    ];
    /* полный бюджет куплен — 4 слоя = свёртка 9 категорий + 5 этапов (design/budget/TZ-budget.md): итог = totals.plan экрана Бюджета, одна цифра везде */
    var C = budgetFull() && window.SOVE_BUDGET.current ? window.SOVE_BUDGET.current() : null;
    if (C && C.totals.plan !== null) {
      var kv = {}; C.kit.forEach(function (k) { kv[k.key] = k.plan || 0; });
      parts[0].value = kv.furniture + kv.furniture_custom;
      parts[1] = Object.assign({}, parts[1], { known: true, value: kv.finish + kv.light + kv.sockets + kv.plumbing + kv.doors + kv.appliances });
      parts[2] = Object.assign({}, parts[2], { known: true, value: kv.decor });
      parts[3] = Object.assign({}, parts[3], { known: true, value: C.totals.worksAndRough });
    }
    var known = parts.filter(function (x) { return x.known; }), tot = known.reduce(function (a, x) { return a + (x.value || 0); }, 0);
    if (C && C.totals.plan !== null && tot !== C.totals.plan) console.warn('Бюджет: 4 слоя ' + tot + ' ≠ totals.plan ' + C.totals.plan);
    return { P: P, parts: parts, known: known.length, total: tot, type: P.budget.type, C: C };
  }
  /* карточка бюджета: только когда интерьер выбран (Алина 24.10), без него — подсказка в ленте интерьеров.
     В Моём ремонте (opts.full) после расчёта работ — ещё переключатель База / Премиум */
  function budgetCard(opts) {
    opts = opts || {};
    /* интерьер не выбран — на месте бюджета выбор интерьера (лента та же, что снизу) */
    if (!interiorChosen()) return planDoc() ? '<section class="pz-card pz-bud pz-ipick"><div class="pz-bud__h"><b>Выбери интерьер — покажем бюджет</b>' +
      '<button type="button" class="pz-bud__go" data-is="all">Все ›</button></div>' + stripList() + '</section>' : '';
    var B = budgetLayers(); if (!B) return '';
    var R = window.SOVE.repair, fid = R && R.flats.active() ? R.flats.active().id : '';
    var act = {
      materials: '<a class="pz-bud__go" href="' + esc((R && R.LINK && R.LINK.materials) || 'my.html') + '">Подобрать ›</a>',
      decor: '<button type="button" class="pz-bud__go" data-pf="visual">Визуализации ›</button>',
      works: '<button type="button" class="pz-bud__go pz-bud__go--pay" data-bud="buy">Узнать · ' + priceTxt() + '</button>'
    };
    return '<section class="pz-card pz-bud"><div class="pz-bud__h"><b>Бюджет квартиры</b><small>известно ' + B.known + ' из 4</small></div>' +
      (opts.full && budgetFull() ? '<div class="pz-btype" role="group" aria-label="Тип бюджета"><button type="button" data-bud-type="base" aria-pressed="' + (B.type !== 'premium') + '">База</button><button type="button" data-bud-type="premium" aria-pressed="' + (B.type === 'premium') + '">Премиум</button></div>' : '') +
      B.parts.map(function (x) {
        return '<div class="pz-bud__r' + (x.known ? '' : ' is-off') + '"><i>' + (x.known ? '✓' : '○') + '</i><span><b>' + esc(x.t) + '</b><small>' + esc(x.sub) + '</small></span>' +
          (x.known ? '<em>' + rub(x.value) + '</em>' : act[x.key]) + '</div>';
      }).join('') +
      '<div class="pz-bud__t"><span>Итого ' + (B.known < 4 ? 'сейчас' : '') + '</span><b>≈ ' + rub(B.total) + '</b></div>' +
      (B.known < 4 ? '<small class="pz-note">станет точнее</small>' : '') +
      (budgetFull() ? '<a class="pz-link pz-link--left" href="scout.html?from=plan&flat=' + encodeURIComponent(fid) + '&step=result">Подробно в расчёте ›</a>' : '') +
      '</section>';
  }
  var budgetOnDone = null;
  function buyBudget(done) {
    var S = window.SOVE, inn = S.auth.isIn(), bal = inn ? S.tokens.balance() : S.data.gift.tokens, enough = !inn || bal >= REPLAN_PRICE;
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="pz-bud-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="pz-bud-t">Стоимость работ</b><small class="pz-sheet__s">черновые и чистовые работы по твоему плану считает Расчёт бюджета · дальше пересчёт бесплатный</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + priceTxt() + '</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(S.fmt.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough ? '<button type="button" class="pz-btn" data-bs="go">' + (inn ? 'Рассчитать · ' : 'Войти и рассчитать · ') + priceTxt() + '</button>'
              : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<button type="button" class="pz-link" data-bs="no">Не сейчас</button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-bs]'); if (!b) return; close();
      if (b.dataset.bs !== 'go') return;
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      /* списание один раз: резерв → расчёт → списано; не получилось — токены вернём */
      var op = S.tokens.reserve(REPLAN_PRICE, 'Планировка · стоимость работ', 'budget');
      if (!op) { S.ui.toast('Не хватает токенов'); return; }
      document.querySelectorAll('.pz-tok').forEach(function (el) { el.textContent = S.fmt.tokens(S.tokens.balance()) + ' 🎁'; });
      budgetStages(function () { S.tokens.commit(op); if (done) done(); });
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
  }
  /* генерация 3–5 с со стадиями, затем 11 строк — в Мой ремонт */
  function budgetStages(done) {
    var STAGES = ['Считаю работы по м²', 'Материалы по интерьеру', 'Сантехника и свет', 'Готово'];
    var o = document.createElement('div'); o.className = 'pz-sheet-back pz-gen';
    o.innerHTML = '<div class="pz-sheet"><b class="pz-sheet__t">Считаю стоимость работ</b><div class="pz-prog"><i id="pz-gen-bar"></i></div><ul class="pz-stages" id="pz-gen-st">' +
      STAGES.map(function (t, i) { return '<li class="' + (i ? '' : 'is-now') + '"><i>' + (i ? '·' : '◌') + '</i>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    document.body.appendChild(o); var i = 0;
    var tick = setInterval(function () {
      i++; var bar = o.querySelector('#pz-gen-bar'); if (bar) bar.style.width = Math.min(100, i / STAGES.length * 100) + '%';
      o.querySelectorAll('#pz-gen-st li').forEach(function (li, k) { li.className = k < i ? 'is-done' : k === i ? 'is-now' : ''; li.querySelector('i').textContent = k < i ? '✓' : k === i ? '◌' : '·'; });
      if (i >= STAGES.length) {
        clearInterval(tick);
        var R = window.SOVE.repair, P = planDoc(), f = R.flats.ensure(), r = R.get(f.id);
        r.budgetPlan = Object.assign({}, r.budgetPlan || {}, { lines: P.budget.lines, total: P.budget.total, type: P.budget.type, furniture: P.furniture, full: true, ts: Date.now() });
        R.flats.update(f.id, {});
        setTimeout(function () { o.remove(); window.SOVE.ui.toast('Стоимость работ готова · сохранена в Мой ремонт', 'ok'); if (done) done(); }, 400);
      }
    }, 800);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-bud], [data-bud-type]'); if (!b) return;
    if (b.hasAttribute('data-bud-type')) { setBudgetType(b.getAttribute('data-bud-type')); if (budgetOnDone) budgetOnDone(); return; }
    /* весь бюджет считается только с интерьером: нет интерьера — сначала выбор, потом окно оплаты (Алина 24.10) */
    adoptBoard();
    if (!load().interior) {
      var m = window.SOVE.ui.modal({ eyebrow: 'Сначала интерьер', title: 'Под какой интерьер считать работы?', html: interiorTiles(null), actions: [{ label: 'Отмена', kind: 'link' }] });
      var then = function (it) { pickInterior(it); setTimeout(function () { buyBudget(budgetOnDone); }, 300); };
      m.el.querySelectorAll('[data-cap]').forEach(function (x) { x.addEventListener('click', function () { m.close(); then(capsuleInterior(x.dataset.cap)); }); });
      m.el.querySelector('[data-own-open]').addEventListener('click', function () { m.close(); ownSheet(then); });
      return;
    }
    buyBudget(budgetOnDone);
  });

  /* какой вариант расстановки отвечает анкете: правила те же, что в API, здесь — три
     заранее посчитанных набора из arrange-data.js */
  function planFor(brief) {
    if (!brief) return 0;
    if (brief.work === 'да' && brief.bath === 'ванна') return 2;   /* «С рабочим местом» */
    if (brief.work === 'нет') return 1;                            /* «Больше хранения» */
    return 0;                                                      /* «Как советует SOVEAPP» */
  }
  /* ── рамка планировки из разметки: перенос ai_plan_markup.layout_frame ──────
     Разметка приходит в долях 0–1000 ([y, x]), а расстановке нужны пиксели плана
     [x1, y1, x2, y2]. Ниша — своя «комната» с part_of, дверь — зона 0,9 м поперёк
     проёма (у входной — только внутрь), окно — полоса стены 0,3 м. */
  var RU = { 'спальня': 'Спальня', 'санузел': 'Санузел', 'прихожая': 'Прихожая', 'гостиная': 'Гостиная',
             'гостиная-кухня': 'Кухня-гостиная', 'кухня': 'Кухня', 'детская': 'Детская',
             'гардеробная': 'Гардеробная', 'балкон': 'Балкон', 'другое': 'Помещение' };
  /* масштаб, если сервер его не прислал (28.10: маршрут отдавал разметку без scale_px_per_m, и демо считало любой план
     шириной 9 м — у обмерного плана и дизайн-проекта мебель «не входила по метражу»). Берём площади комнат с плана
     (их читает зрение) против площади в пикселях: у разметки по стенам — area_px рабочей копии шириной до 400 px,
     у разметки по рамкам — рамка зрения. Медиана по комнатам; квартира уже 2 м или шире 60 м — не верим.
     Балкон и лоджию (вне контура, площадь на плане своя) и крошечные зоны (меньше 1 % рабочей копии — обрезки у стояков)
     не считаем: они и масштаб, и «разброс» сбивали на ровном плане */
  function roomScales(res, W, H) {
    var f = Math.min(1, 400 / W), tiny = 0.01 * (W * f) * (H * f), k = [];
    (res.rooms || []).forEach(function (r) {
      var m2 = +r.area_m2, b = r.box_2d, px = 0;
      if (!(m2 > 0.5) || r.seeded === false || r.type === 'балкон' || /балкон|лодж/i.test(r.label || '')) return;
      if (r.area_px > 0) { if (r.area_px < tiny) return; px = r.area_px / (f * f); }
      else if (b) px = (b[3] - b[1]) / 1000 * W * ((b[2] - b[0]) / 1000 * H);
      if (px > 0) k.push(Math.sqrt(px / m2));
    });
    return k.sort(function (a, b) { return a - b; });
  }
  function scaleFromRooms(res, W, H) {
    var k = roomScales(res, W, H);
    if (!k.length) return null;
    var n = k.length, med = n % 2 ? k[(n - 1) / 2] : (k[n / 2 - 1] + k[n / 2]) / 2, wide = W / med;
    return wide > 2 && wide < 60 ? { ppm: med, spread: k[n - 1] / k[0] } : null;
  }
  /* насколько разметке можно верить — для предупреждения на «Проверь план»:
     scale — откуда масштаб (server / areas / guess — площадей на плане нет и сервер масштаб не прислал),
     boxes — стены не разобраны, комнаты рамками от зрения,
     odd — площади комнат с плана не сходятся с найденными зонами больше чем вдвое по стороне (зоны порезаны мебелью):
     с масштабом сервера — каждая комната против него, без — разброс между комнатами; площади есть, а масштаб по ним
     не сошёлся (квартира уже 2 м или шире 60 м) — тоже odd */
  function markupQuality(res, W, H) {
    var ppm = +res.scale_px_per_m || 0, s = ppm ? null : scaleFromRooms(res, W, H), k = roomScales(res, W, H), n = k.length;
    var hasArea = (res.rooms || []).some(function (r) { return r.seeded !== false && +r.area_m2 > 0; });
    var spread = !n ? 1 : ppm ? Math.max(k[n - 1] / ppm, ppm / k[0]) : k[n - 1] / k[0];
    return { scale: ppm ? 'server' : s || hasArea ? 'areas' : 'guess', boxes: res.method === 'boxes',
             odd: res.method !== 'boxes' && (spread > 2 || (hasArea && !ppm && !s)) };
  }
  /* ── честная оценка чтения для «Проверь план» (PR2) ──
     Новый сервер присылает quality {level: ok | approx | poor, path: walls | boxes | flats, reasons: [коды]…}; старый — нет,
     тогда собираем её из markupQuality: рамки → approx + walls_unresolved, зоны не сходятся → poor + areas_mismatch,
     масштаб угадан → approx + no_scale; вход — по проёмам. Вход, отмеченный человеком, лежит в openings — ему верим
     больше, чем коду no_entrance от сервера: причину снимаем, и если причин не осталось, план по стенам считаем ok */
  var REASON_RU = {
    no_scale: 'на плане нет площадей — размеры в 3D примерные',
    areas_mismatch: 'площади комнат не сходятся с найденными зонами',
    no_entrance: 'вход не нашли — отметь его',
    no_windows: 'окна не нашли',
    walls_unresolved: 'стены не разобрались — комнаты показаны прямоугольниками',
    rooms_unseeded: 'часть комнат не легла на план',
    openings_dropped: 'часть дверей не подтвердилась',
    labels_uncertain: 'подписи комнат могли перепутаться — проверь названия',
    multiple_flats: 'на листе несколько квартир',
    pro_failed: 'проверка сильной моделью не сработала'
  };
  function qualityOf(res, W, H) {
    res = res || {};
    var ops = res.openings || [], hasEntrance = ops.some(function (o) { return o.kind === 'entrance'; }), hasWindow = ops.some(function (o) { return o.kind === 'window'; });
    var flats = Array.isArray(res.flats) ? res.flats.filter(function (f) { return f && Array.isArray(f.box_2d) && f.box_2d.length === 4; }) : [];
    var q = res.quality, out;
    if (q && typeof q === 'object' && q.level) {
      out = { level: /^(ok|approx|poor)$/.test(q.level) ? q.level : 'approx', path: /^(walls|boxes|flats)$/.test(q.path) ? q.path : (res.method === 'boxes' ? 'boxes' : res.method === 'flats' ? 'flats' : 'walls'),
              reasons: (Array.isArray(q.reasons) ? q.reasons : []).filter(function (c) { return typeof c === 'string'; }), server: true };
    } else if (res.method === 'flats') {
      out = { level: 'poor', path: 'flats', reasons: ['multiple_flats'], server: false };
    } else {
      var m = markupQuality(res, W > 0 ? W : 1000, H > 0 ? H : 1000), reasons = [], level = 'ok';
      if (m.boxes) { reasons.push('walls_unresolved'); level = 'approx'; }
      if (m.odd) { reasons.push('areas_mismatch'); level = 'poor'; }
      if (m.scale === 'guess') { reasons.push('no_scale'); if (level === 'ok') level = 'approx'; }
      if (!hasEntrance) { reasons.push('no_entrance'); if (level === 'ok') level = 'approx'; }
      if (flats.length > 1) reasons.push('multiple_flats');
      out = { level: level, path: res.method === 'boxes' ? 'boxes' : 'walls', reasons: reasons, server: false };
    }
    if (hasEntrance) out.reasons = out.reasons.filter(function (c) { return c !== 'no_entrance'; });
    if (!out.reasons.length && out.level !== 'ok' && out.path === 'walls') out.level = 'ok';
    out.entrance_found = hasEntrance; out.windows_found = hasWindow; out.flats = flats;
    return out;
  }
  /* причины словами: только известные коды, не больше max (по умолчанию двух) */
  function reasonsText(q, max) {
    return ((q && q.reasons) || []).map(function (c) { return REASON_RU[c]; }).filter(Boolean).slice(0, max || 2).join(', ');
  }
  /* ── поворот ответа разметки на 90° по часовой вместе с картинкой (кнопка «Повернуть» без запроса к серверу) ──
     Точка [y, x] в долях 0–1000 → [x, 1000 − y]; рамка [y1, x1, y2, x2] → [x1, 1000 − x2, x2, 1000 − x1];
     стороны north → east → south → west → north («south-east» — по частям). Обходим весь ответ: box_2d / main_box_2d /
     flat_box_2d (комнаты, ниши, квартиры, outside, dropped), point_2d, span_2d, polygon, wall / wall_of_a / wall_of_b /
     side / position; image_size меняет стороны. Подписанная картинка сервера к повёрнутому ответу не подходит — убираем */
  var SIDE_CW = { north: 'east', east: 'south', south: 'west', west: 'north' };
  function rotateSide(s) { return String(s).split('-').map(function (p) { return SIDE_CW[p] || p; }).join('-'); }
  function rotatePoint(p) { return [p[1], 1000 - p[0]]; }
  function rotateBox(b) { return [b[1], 1000 - b[2], b[3], 1000 - b[0]]; }
  function rotateRes(res) {
    var BOX = { box_2d: 1, main_box_2d: 1, flat_box_2d: 1 }, SIDE = { wall: 1, wall_of_a: 1, wall_of_b: 1, side: 1, position: 1 };
    function nums(v, n) { return Array.isArray(v) && v.length === n && v.every(function (x) { return typeof x === 'number' && isFinite(x); }); }
    function walk(o) {
      if (Array.isArray(o)) return o.map(walk);
      if (!o || typeof o !== 'object') return o;
      var out = {};
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (k === 'labeled_png_base64' || k === 'source_image_base64') return;   /* картинки сервера к повёрнутому ответу не подходят */
        if (BOX[k] && nums(v, 4)) out[k] = rotateBox(v);
        else if (k === 'point_2d' && nums(v, 2)) out[k] = rotatePoint(v);
        else if (k === 'span_2d' && Array.isArray(v) && v.length === 2 && nums(v[0], 2) && nums(v[1], 2)) {
          var a = rotatePoint(v[0]), b = rotatePoint(v[1]);          /* первая точка — меньшая: рамки окна считаются от неё */
          out[k] = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];
        }
        else if (k === 'polygon' && Array.isArray(v)) out[k] = v.map(function (p) { return nums(p, 2) ? rotatePoint(p) : p; });
        else if (k === 'image_size' && nums(v, 2)) out[k] = [v[1], v[0]];
        else if (k === 'along' && (v === 'x' || v === 'y')) out[k] = v === 'x' ? 'y' : 'x';   /* ось проёма doors_2d / windows_2d */
        else if (SIDE[k] && typeof v === 'string') out[k] = rotateSide(v);
        else out[k] = walk(v);
      });
      return out;
    }
    return walk(res);
  }
  /* точка проёма в долях 0–1000: середина отрезка, если точки нет */
  function openingPoint(o) {
    return o.point_2d || (o.span_2d ? [(o.span_2d[0][0] + o.span_2d[1][0]) / 2, (o.span_2d[0][1] + o.span_2d[1][1]) / 2] : null);
  }
  /* ── проёмы привязаны к комнатам по id, а не по типу ──
     Раньше дверь знала только типы комнат (a / b): когда человек на «Проверь план» исправлял «Спальня» → «Кухня-гостиная»,
     тип менялся, и проёмы приходилось переписывать одним проходом по старым типам (а две комнаты одного типа путались).
     Теперь сразу после ответа сервера каждая комната получает id (с сервера, иначе r0, r1…), а каждый проём — a_id / b_id /
     room_id: с сервера, если он их прислал, иначе по типу и близости к точке проёма. Делается один раз; переименование
     комнаты id не меняет. Типы (room / a / b) остаются — по ним откат там, где id нет (старый сервер) */
  function resolveOpenings(res) {
    if (!res) return res;
    var rooms = res.rooms || [];
    rooms.forEach(function (r, i) { if (!r.id) r.id = 'r' + i; });
    var live = rooms.filter(function (r) { return r.seeded !== false && r.box_2d; });
    function has(id) { return !!id && rooms.some(function (r) { return r.id === id; }); }
    function gap(p, b) { var dy = Math.max(b[0] - p[0], 0, p[0] - b[2]), dx = Math.max(b[1] - p[1], 0, p[1] - b[3]); return dy * dy + dx * dx; }
    /* комната этого типа, ближайшая к точке; skip = 1 — вторая по близости (дверь между двумя комнатами одного типа) */
    function pick(type, p, skip) {
      var c = live.filter(function (r) { return r.type === type; }); if (!c.length) return null;
      if (c.length > 1 && p) c.sort(function (x, y) { return gap(p, x.main_box_2d || x.box_2d) - gap(p, y.main_box_2d || y.box_2d); });
      return c[Math.min(skip || 0, c.length - 1)].id;
    }
    (res.openings || []).forEach(function (o) {
      var p = openingPoint(o), same = !!o.b && o.a === o.b;
      if (!has(o.a_id)) o.a_id = o.a ? pick(o.a, p, 0) : null;
      if (!has(o.b_id)) o.b_id = o.b ? pick(o.b, p, same ? 1 : 0) : null;
      if (!has(o.room_id)) o.room_id = (o.room ? pick(o.room, p, 0) : null) || o.a_id || null;
    });
    return res;
  }
  function frameFromMarkup(res, W, H) {
    var est = res.scale_px_per_m ? null : scaleFromRooms(res, W, H);
    var ppm = +(res.scale_px_per_m || (est && est.ppm) || (W / 9));
    function px(b) { return [Math.round(b[1] / 1000 * W), Math.round(b[0] / 1000 * H), Math.round(b[3] / 1000 * W), Math.round(b[2] / 1000 * H)]; }
    var rooms = [], windows = [], doors = [];
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      var name = r.label || RU[r.type] || (r.type || 'Помещение');
      rooms.push({ id: r.id, name: name, type: r.type, box: px(r.main_box_2d || r.box_2d), doc_m2: r.area_m2 });
      /* part_id — id хозяина: две комнаты с одним названием не делят ниши (чертёж, разбор 30.10); part_of — имя, как раньше */
      if (r.recess) rooms.push({ name: 'Ниша: ' + name, type: r.type, part_of: name, part_id: r.id || null, box: px(r.recess.box_2d),
        doc_m2: Math.round((r.recess.depth_m || 0) * (r.recess.width_m || 0) * 10) / 10, contains: r.recess.contains });
    });
    var clear = 0.9 * ppm, wall = 0.3 * ppm;
    /* разметка по рамкам (стены не разобраны): у окна только точка в середине стены, у двери — без стороны.
       Окну даём 1,2 м вдоль стены, двери сторону — по тому, на какой стороне рамки комнаты лежит точка.
       Рамку комнаты ищем по id (a_id), по типу — только если id нет */
    var boxOf = {}, boxOfType = {};
    (res.rooms || []).forEach(function (r) {
      if (!r.box_2d) return;
      if (r.id && !boxOf[r.id]) boxOf[r.id] = r.main_box_2d || r.box_2d;
      if (!boxOfType[r.type]) boxOfType[r.type] = r.main_box_2d || r.box_2d;
    });
    function sideOf(o) {
      var b = (o.a_id && boxOf[o.a_id]) || boxOfType[o.a], p = o.point_2d; if (!b || !p) return null;
      var d = [['north', Math.abs(p[0] - b[0])], ['south', Math.abs(p[0] - b[2])], ['west', Math.abs(p[1] - b[1])], ['east', Math.abs(p[1] - b[3])]];
      d.sort(function (x, y) { return x[1] - y[1]; });
      return d[0][0];
    }
    (res.openings || []).forEach(function (o) {
      if (o.kind === 'window' && !o.span_2d && o.point_2d && o.wall) {
        var hy = 600 * ppm / H, hx = 600 * ppm / W, p = o.point_2d;   /* полуширина 0,6 м в долях 0–1000 */
        o = Object.assign({}, o, { span_2d: o.wall === 'north' || o.wall === 'south' ? [[p[0], p[1] - hx], [p[0], p[1] + hx]] : [[p[0] - hy, p[1]], [p[0] + hy, p[1]]] });
      }
      if (o.kind === 'door' && !o.wall_of_a && !o.wall) o = Object.assign({}, o, { wall_of_a: sideOf(o) });
      if (o.kind === 'window' && o.span_2d) {
        var ay = o.span_2d[0][0], ax = o.span_2d[0][1], by = o.span_2d[1][0], bx = o.span_2d[1][1], box;
        if (ay === by) box = [ax / 1000 * W, ay / 1000 * H - wall / 2, bx / 1000 * W, by / 1000 * H + wall / 2];
        else box = [ax / 1000 * W - wall / 2, ay / 1000 * H, bx / 1000 * W + wall / 2, by / 1000 * H];
        windows.push({ room: o.a, room_id: o.room_id || o.a_id || null, wall: o.wall, box: box.map(Math.round) });
      } else if (o.kind === 'door' || o.kind === 'passage' || o.kind === 'entrance') {
        if (!o.point_2d) return;
        var cy = o.point_2d[0] / 1000 * H, cx = o.point_2d[1] / 1000 * W;
        var half = Math.max(0.4, +(o.width_m || 0.9)) * ppm / 2, side = o.wall_of_a || o.wall, box2;
        if (o.kind === 'entrance') {
          box2 = { east: [cx - clear, cy - half, cx, cy + half], west: [cx, cy - half, cx + clear, cy + half],
                   south: [cx - half, cy - clear, cx + half, cy], north: [cx - half, cy, cx + half, cy + clear] }[side] ||
                 [cx - half, cy - clear, cx + half, cy + clear];
        } else if (side === 'north' || side === 'south') box2 = [cx - half, cy - clear, cx + half, cy + clear];
        else box2 = [cx - clear, cy - half, cx + clear, cy + half];
        doors.push({ kind: o.kind, a: o.a, b: o.b, a_id: o.a_id || null, b_id: o.b_id || null, box: box2.map(Math.round) });
      }
    });
    var frame = { px_per_m: Math.round(ppm * 100) / 100, rooms: rooms, windows: windows, doors: doors,
             outside: (res.outside || []).map(function (p) { return { box: px(p.box_2d) }; }) };
    var img = imageWalls(res, px, ppm);
    if (img) { frame.walls_2d = img.walls; frame.doors_2d = img.doors; frame.windows_2d = img.windows; }
    return frame;
  }
  /* ── стены с картинки плана (сервер 29.10: walls_2d / doors_2d / windows_2d) ──
     Прямоугольники стен с уже вырезанными дверями и окнами — по ним рисуют чертёж и 3D, а не стены, достроенные из рамок
     комнат (лист девочек 29.10: «квадрат» у санузла, ступеньки на стенах, 3D не совпадало с чертежом). В рамку — в пикселях
     картинки, как остальное: walls_2d [{ box }], doors_2d [{ box, along, kind, a, b, a_id, b_id }], windows_2d [{ box, along,
     room, room_id, wall }]; along — вдоль какой оси идёт проём. Окно и дверь сервер отдаёт тем куском стены, что вырезал, а он
     бывает тоньше самой стены (PDF 29.10: окно — линия стекла 5 см в стене 25 см, над и под ней пусто; PRIDE: окно у наружной
     грани, за ним пустая ниша). Такой проём дотягиваем до граней стены по косякам — кускам стены у его концов (их край — в 5 см
     от конца проёма), — но не дальше 0,35 м в каждую сторону: глубокий простенок с нишей под батарею (лист девочек, 0,45 м)
     не заполняем. Стен в ответе нет (старый сервер, пример PRIDE) — полей в рамке нет, всё как раньше */
  var FIT_TOL_M = 0.05, FIT_MAX_M = 0.35;
  function swapXY(b) { return [b[1], b[0], b[3], b[2]]; }
  function fitOpening(box, alongX, walls, ppm) {
    if (!alongX) return swapXY(fitOpening(swapXY(box), true, walls.map(swapXY), ppm));
    var tol = Math.max(1, FIT_TOL_M * ppm), far = FIT_MAX_M * ppm;
    /* косяк у конца проёма: куски стены, примыкающие к этому концу, — цепочкой от проёма по толщине стены */
    function jamb(x, left) {
      var js = walls.filter(function (w) { return Math.abs((left ? w[2] : w[0]) - x) <= tol; }), b0 = box[1], b1 = box[3], found = false, grew = true;
      while (grew) {
        grew = false;
        js.forEach(function (j) {
          if (j[1] > b1 + tol || j[3] < b0 - tol) return;
          found = true;
          if (j[1] < b0) { b0 = j[1]; grew = true; }
          if (j[3] > b1) { b1 = j[3]; grew = true; }
        });
      }
      return found ? [b0, b1] : null;
    }
    /* оба косяка — общая их часть (у угла один косяк — перпендикулярная стена, её длину не берём) */
    var L = jamb(box[0], true), R = jamb(box[2], false), B = L && R ? [Math.max(L[0], R[0]), Math.min(L[1], R[1])] : L || R;
    if (!B || B[0] > B[1]) return box;
    var y0 = Math.min(B[0], box[1]), y1 = Math.max(B[1], box[3]);
    walls.forEach(function (w) {                              /* на другие стены не залезаем */
      if (Math.min(w[2], box[2]) - Math.max(w[0], box[0]) <= tol) return;
      if (w[3] <= box[1] && w[3] > y0) y0 = w[3];
      if (w[1] >= box[3] && w[1] < y1) y1 = w[1];
    });
    return [box[0], box[1] - y0 <= far ? y0 : box[1], box[2], y1 - box[3] <= far ? y1 : box[3]];
  }
  function imageWalls(res, px, ppm) {
    function ok(b) { return Array.isArray(b) && b.length === 4 && b.every(function (v) { return typeof v === 'number' && isFinite(v); }); }
    function pxN(b) { return px([Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])]); }
    function real(b) { return b[2] > b[0] && b[3] > b[1]; }
    function axis(o, b) { return o.along === 'x' || o.along === 'y' ? o.along : (b[2] - b[0] >= b[3] - b[1] ? 'x' : 'y'); }
    var walls = (Array.isArray(res.walls_2d) ? res.walls_2d : []).filter(function (w) { return w && ok(w.box_2d); }).map(function (w) { return pxN(w.box_2d); }).filter(real);
    if (!walls.length) return null;
    var doors = [], windows = [];
    (Array.isArray(res.doors_2d) ? res.doors_2d : []).forEach(function (d) {
      if (!d || !ok(d.box_2d)) return;
      var b = pxN(d.box_2d), al = axis(d, b); if (!real(b)) return;
      doors.push({ box: fitOpening(b, al === 'x', walls, ppm), along: al, kind: d.kind || 'door', a: d.a || null, b: d.b || null, a_id: d.a_id || null, b_id: d.b_id || null });
    });
    (Array.isArray(res.windows_2d) ? res.windows_2d : []).forEach(function (w) {
      if (!w || !ok(w.box_2d)) return;
      var b = pxN(w.box_2d), al = axis(w, b); if (!real(b)) return;
      windows.push({ box: fitOpening(b, al === 'x', walls, ppm), along: al, room: w.room || null, room_id: w.room_id || null, wall: w.wall || null });
    });
    return { walls: walls.map(function (b) { return { box: b }; }), doors: doors, windows: windows };
  }
  /* ── «Отметить вход» по стенам с картинки (разбор 30.10: вход менялся только в проёмах, а 3D и чертёж строятся
     из walls_2d / doors_2d — створка оставалась на старом месте). Всё в долях 0–1000 [ymin, xmin, ymax, xmax].
     1) Прежняя створка входа уходит из doors_2d. Своя (поле cut — что вырезали) возвращает вырезанные куски; створка сервера
        заделывается куском стены, если стену там резали: у её конца вплотную кусок той же стены (косяк) — толщина по косякам.
        Нет косяков вплотную — это разрыв, нарисованный на плане, он остаётся разрывом.
     2) Новая — как дверь в cut_openings сервера (ai_plan_markup.py): 0,9 м вдоль стены, на которой точка (сторона комнаты
        wall), по толщине ближайшего куска стены этой оси вместе со слоями той же стены вплотную (штриховка даёт 2–3 слоя).
        Точка отметки лежит на рамке комнаты, а стена бывает в 0,3 м от неё, поэтому вырез строим по самой стене, а не ±0,4 м
        от точки; вдоль — в пределах стороны комнаты, чтобы проём не уходил в угол. Створка — вырезанное место:
        { box_2d, along, kind: 'entrance', a, a_id, wall, cut }. Стен с картинки нет — ответ не трогаем */
  function cutEntrance(res, W, H) {
    var src = res && Array.isArray(res.walls_2d) ? res.walls_2d : null;
    if (!src || !src.length || !(W > 0) || !(H > 0)) return res;
    var est = res.scale_px_per_m ? null : scaleFromRooms(res, W, H);
    var ppm = +(res.scale_px_per_m || (est && est.ppm) || (W / 9)), mx = ppm / W * 1000, my = ppm / H * 1000;   /* 1 м в долях по x и y */
    function ok(b) { return Array.isArray(b) && b.length === 4 && b.every(function (v) { return typeof v === 'number' && isFinite(v); }); }
    function nb(b) { return [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])]; }
    function r2(b) { return b.map(function (v) { return Math.round(v * 100) / 100; }); }
    function over(a0, a1, b0, b1) { return Math.min(a1, b1) - Math.max(a0, b0); }
    var rects = src.filter(function (w) { return w && ok(w.box_2d); }).map(function (w) { return nb(w.box_2d); });
    /* оси куска: ax — стена идёт вдоль x (горизонтальная); la/lb — индексы вдоль, ta/tb — поперёк (толщина) */
    function axes(ax) { return ax ? { la: 1, lb: 3, ta: 0, tb: 2, ul: mx, ut: my } : { la: 0, lb: 2, ta: 1, tb: 3, ul: my, ut: mx }; }
    /* слои той же стены вплотную к полосе [t0, t1] — цепочкой: кусок идёт вдоль стены (вдоль длиннее, чем поперёк) и перекрывает
       проём [s0, s1] хотя бы наполовину — проёма или своей длины (короткий слой у косяка). Перегородка, упёршаяся в стену
       поперёк, вдоль короче, чем поперёк, — в толщину не попадает */
    function layers(t0, t1, s0, s1, A) {
      var tol = 0.02 * A.ut, grew = true;
      while (grew) {
        grew = false;
        rects.forEach(function (r) {
          var len = r[A.lb] - r[A.la], ov = over(r[A.la], r[A.lb], s0, s1);
          if (len / A.ul < (r[A.tb] - r[A.ta]) / A.ut || (ov < 0.5 * (s1 - s0) && ov < 0.5 * len)) return;
          if (r[A.tb] < t0 - tol || r[A.ta] > t1 + tol) return;
          if (r[A.ta] < t0 && t1 - r[A.ta] <= 0.8 * A.ut) { t0 = r[A.ta]; grew = true; }
          if (r[A.tb] > t1 && r[A.tb] - t0 <= 0.8 * A.ut) { t1 = r[A.tb]; grew = true; }
        });
      }
      return [t0, t1];
    }
    /* вырезать прямоугольник c из всех кусков: (что осталось, что вырезано) — как _cut сервера. Обрезки не выбрасываем
       (сервер убирает тоньше 3 см): вырезанное ровно дополняет оставшееся, и повторная отметка возвращает стену как была */
    function cut(c) {
      var keep = [], parts = [];
      rects.forEach(function (r) {
        var i = [Math.max(r[0], c[0]), Math.max(r[1], c[1]), Math.min(r[2], c[2]), Math.min(r[3], c[3])];
        if (i[0] >= i[2] || i[1] >= i[3]) { keep.push(r); return; }
        parts.push(i);
        [[r[0], r[1], i[0], r[3]], [i[2], r[1], r[2], r[3]], [i[0], r[1], i[2], i[1]], [i[0], i[3], i[2], r[3]]].forEach(function (p) {
          if (p[2] - p[0] > 1e-6 && p[3] - p[1] > 1e-6) keep.push(p);
        });
      });
      rects = keep;
      return parts;
    }
    /* 1) прежняя створка входа: заделать, если стену резали */
    function closeGap(b, along) {
      var ax = along === 'x' ? true : along === 'y' ? false : (b[3] - b[1]) / mx >= (b[2] - b[0]) / my, A = axes(ax), tol = 0.02 * A.ul, tt = 0.02 * A.ut;
      /* косяк у конца створки: куски стены (вдоль не короче 0,25 м — короткие уступы у проёма в толщину не берём), кончающиеся
         у этого конца, — цепочкой по толщине от створки: все слои стены */
      function jamb(end, left) {
        var js = rects.filter(function (r) { return Math.abs((left ? r[A.lb] : r[A.la]) - end) <= tol && (r[A.lb] - r[A.la]) / A.ul >= 0.25; });
        var t0 = b[A.ta], t1 = b[A.tb], found = false, grew = true;
        while (grew) {
          grew = false;
          js.forEach(function (j) {
            if (j[A.tb] < t0 - tt || j[A.ta] > t1 + tt) return;
            found = true;
            if (j[A.ta] < t0 && t1 - j[A.ta] <= 0.8 * A.ut) { t0 = j[A.ta]; grew = true; }
            if (j[A.tb] > t1 && j[A.tb] - t0 <= 0.8 * A.ut) { t1 = j[A.tb]; grew = true; }
          });
        }
        return found ? [t0, t1] : null;
      }
      var L = jamb(b[A.la], true), R = jamb(b[A.lb], false), T = L && R ? [Math.max(L[0], R[0]), Math.min(L[1], R[1])] : L || R;
      if (!T || T[1] - T[0] <= 0) return null;
      var out = b.slice(); out[A.ta] = T[0]; out[A.tb] = T[1];
      /* косяк только с одной стороны: щель до ближайшего куска той же стены с другой (до 0,3 м) тоже заделываем — разрыв
         на плане бывает шире створки сервера (лист девочек: 12 см у входа), и в стене оставалась прорезь */
      function reach(left) {
        var best = null;
        rects.forEach(function (r) {
          if (over(r[A.ta], r[A.tb], T[0], T[1]) <= 0) return;
          var d = left ? out[A.la] - r[A.lb] : r[A.la] - out[A.lb];
          if (d > 0 && d <= 0.3 * A.ul && (!best || d < best.d)) best = { d: d, v: left ? r[A.lb] : r[A.la] };
        });
        return best;
      }
      var gl = L ? null : reach(true), gr = R ? null : reach(false);
      if (gl) out[A.la] = gl.v;
      if (gr) out[A.lb] = gr.v;
      return out;
    }
    var doors = (Array.isArray(res.doors_2d) ? res.doors_2d : []).filter(function (d) {
      if (!d || d.kind !== 'entrance') return true;
      if (Array.isArray(d.cut)) d.cut.forEach(function (p) { if (p && ok(p.box_2d)) rects.push(nb(p.box_2d)); });
      else if (ok(d.box_2d)) { var back = closeGap(nb(d.box_2d), d.along); if (back) rects.push(back); }
      return false;
    });
    /* 2) новая створка в точке входа */
    var o = (res.openings || []).filter(function (x) { return x && x.kind === 'entrance' && Array.isArray(x.point_2d) && x.point_2d.length === 2; })[0];
    var py = o ? +o.point_2d[0] : 0, px = o ? +o.point_2d[1] : 0, w = o ? Math.min(+o.width_m || 0.9, 1.0) : 0.9;
    var side = o ? o.wall_of_a || o.wall : null, ax = side === 'north' || side === 'south' ? true : side === 'east' || side === 'west' ? false : null;
    var dist = function (r, A) { var p = A.ta === 0 ? py : px; return Math.max(r[A.ta] - p, 0, p - r[A.tb]) / A.ut; };
    /* кусок стены этой оси (вдоль длиннее, чем поперёк, толщина до 0,8 м) не дальше 0,8 м от точки поперёк;
       gapM — насколько он может не доставать до проёма [s0, s1] вдоль: 0 — перекрывает его хотя бы на 0,2 м */
    var nearest = function (A, s0, s1, gapM) {
      function along(r) { return over(r[A.la], r[A.lb], s0, s1); }
      return rects.filter(function (r) {
        var len = (r[A.lb] - r[A.la]) / A.ul, thick = (r[A.tb] - r[A.ta]) / A.ut;
        return len >= thick && thick <= 0.8 && dist(r, A) <= 0.8 && (gapM ? along(r) >= -gapM * A.ul : along(r) >= 0.2 * A.ul);
      }).sort(function (p1, p2) { return dist(p1, A) - dist(p2, A) || along(p2) - along(p1); })[0] || null;
    };
    if (o && ax === null) {                               /* стороны нет — ось по ближайшему куску, как у сервера */
      var hx = nearest(axes(true), px - w / 2 * mx, px + w / 2 * mx), hy = nearest(axes(false), py - w / 2 * my, py + w / 2 * my);
      ax = !!hx && (!hy || dist(hx, axes(true)) <= dist(hy, axes(false)));
    }
    var A = axes(ax), half = w / 2 * A.ul, c0 = A.la === 1 ? px : py;
    /* вдоль — в пределах стороны своей комнаты: тап у угла не уводит проём в соседнюю стену */
    var room = o ? (res.rooms || []).filter(function (x) { return x && x.id && x.id === (o.a_id || o.room_id); })[0] : null;
    var rb = room ? nb(room.main_box_2d || room.box_2d || []) : null;
    if (rb && ok(rb) && rb[A.lb] - rb[A.la] >= 2 * half) c0 = Math.max(rb[A.la] + half, Math.min(rb[A.lb] - half, c0));
    var s0 = c0 - half, s1 = c0 + half, near = o ? nearest(A, s0, s1, 0) : null, T = null;
    if (near) T = layers(near[A.ta], near[A.tb], s0, s1, A);
    else if (o) {
      /* стены в точке нет — вход нарисован разрывом (план застройщика): толщина — по куску стены у разрыва, до 1 м вдоль */
      var jam = nearest(A, s0, s1, 1.0);
      if (jam) T = layers(jam[A.ta], jam[A.tb], jam[A.la], jam[A.lb], A);
    }
    if (T) {
      var c = []; c[A.la] = s0; c[A.lb] = s1; c[A.ta] = T[0]; c[A.tb] = T[1];
      var parts = cut(c);
      doors.push({ box_2d: r2(c), along: ax ? 'x' : 'y', kind: 'entrance', a: o.a || null, b: null, a_id: o.a_id || o.room_id || null,
        b_id: null, wall: side || null, by_user: !!o.by_user, cut: parts.map(function (p) { return { box_2d: r2(p) }; }) });
    }
    res.walls_2d = rects.map(function (q) { return { box_2d: r2(q) }; });
    res.doors_2d = doors;
    return res;
  }
  /* расстановка (/ai/layout/auto) отдаёт только комнаты, окна, двери и «вне квартиры» — стены с картинки возвращаем из нашей рамки */
  function carryWalls(lay, frame) {
    if (!lay || !frame || !frame.walls_2d) return lay;
    ['walls_2d', 'doors_2d', 'windows_2d'].forEach(function (k) { if (!lay[k] && frame[k]) lay[k] = frame[k]; });
    return lay;
  }
  /* расстановка вернула комнаты, окна и двери без id (сервер их потерял) — возвращаем id по типу и рамке из нашей же рамки */
  function restoreIds(lay, frame) {
    if (!lay || !frame) return lay;
    function same(a, b) { return a && b && a.length === 4 && a.every(function (v, i) { return Math.abs(v - b[i]) < 1.5; }); }
    [['rooms', ['id']], ['windows', ['room_id']], ['doors', ['a_id', 'b_id']]].forEach(function (x) {
      var k = x[0], keys = x[1], src = frame[k] || [];
      (lay[k] || []).forEach(function (it) {
        if (keys.every(function (kk) { return it[kk]; })) return;
        var m = src.filter(function (s) { return same(s.box, it.box) && (k !== 'rooms' || s.type === it.type); })[0];
        if (m) keys.forEach(function (kk) { if (!it[kk] && m[kk]) it[kk] = m[kk]; });
      });
    });
    return lay;
  }

  /* тип комнаты по названию, которое человек исправил на «Проверь план»: мебель сервер ставит по типу (спальня,
     гостиная / кухня, санузел, прихожая), а зрение путает типы на плане без подписей (у обмерного — только номера).
     Детская — как спальня (кровать, шкаф). Слово не узнали — тип остаётся от зрения */
  function typeFromName(name) {
    var s = ' ' + String(name || '').toLowerCase().replace(/ё/g, 'е') + ' ';
    if (/кухн[а-я]*[\s-]*гост|гост[а-я]*[\s-]*кухн|студи/.test(s)) return 'гостиная-кухня';
    if (/санузел|сан\.?\s*узел|с\/у|ванн|туалет|уборн|душев/.test(s)) return 'санузел';
    if (/прихож|коридор|холл|тамбур/.test(s)) return 'прихожая';
    if (/гардероб/.test(s)) return 'гардеробная';
    if (/балкон|лодж/.test(s)) return 'балкон';
    if (/кухн/.test(s)) return 'кухня';
    if (/гостин|[^а-я]зал[^а-я]/.test(s)) return 'гостиная';
    if (/детск/.test(s)) return 'детская';           /* в списке типов — «Детская»; мебель расставляем как в спальне (goLive) */
    if (/спальн/.test(s)) return 'спальня';
    return null;
  }

  /* анкета → формат brief, который читает /ai/layout/auto (bedroom · storage · kitchen · living · bathroom · laundry).
     Раньше кухня, холодильник и стол были зашиты («Г-образная», «встроенный», «на 4»), а рабочее место — всегда «нет»;
     теперь берём ответы человека, где вопрос есть, а где вопроса нет — прежние умолчания.
     brief: { bed, sofa, sleeper, table, kitchen, fridge, bath, wash, work, storage } — собирает commit() в plan-demo.js */
  function briefFromAnswers(a) {
    a = a || {};
    var sofa = a.sofa === 'угловой' ? 'угловой' : 'прямой, до 200 см';
    if (a.sleeper === 'раскладной') sofa += ', раскладной';
    var zones = ['прихожая', 'спальня']; if (a.storage) zones.push('гостиная');   /* «больше хранения» — стеллаж и в гостиной */
    return {
      rooms: { kitchen_format: 'кухня-гостиная (единое пространство)' },
      kitchen: { shape: a.kitchen || 'Г-образная', front_m: '2–3', fridge: a.fridge === 'отдельный' ? 'отдельный' : 'встроенный' },
      living: { dining_table: 'стол ' + (a.table || 'на 4'), sofa: sofa, tv: true, extra: 'место для хранения' },
      bedroom: { bed: a.bed || '160×200', nightstands: 2, wardrobe: 'шкаф', workplace: a.work === 'да', tv: false },
      bathroom: { shower: a.bath === 'ванна' ? '' : 'встроенный', bathtub: a.bath === 'ванна', wc: 'подвесной', sink: 'накладная' },
      storage: { zones: zones },
      /* стирка не в санузле (ниша прихожей, кухня, шкаф, постирочная) — машину в санузел не ставим */
      laundry: { appliances: !a.wash || a.wash === 'в санузле' ? ['стиральная машина'] : [] }
    };
  }

  /* ── файл плана: тип, ключ, подготовка к отправке ──
     Принимаем JPG, PNG, WebP, GIF, BMP, HEIC и PDF. У HEIC с Android тип часто пустой — смотрим на расширение */
  var EXT_TYPE = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
                   heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' };
  function extOf(name) { var m = /\.([a-z0-9]+)$/i.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; }
  /* тип файла по MIME или расширению; '' — не наш формат */
  function fileType(file) {
    var t = String(file && file.type || '').toLowerCase(), byExt = EXT_TYPE[extOf(file && file.name)] || '';
    if (t === 'application/pdf' || /^image\/(jpe?g|png|webp|gif|bmp|heic|heif)$/.test(t)) return t;
    if (!t || t === 'application/octet-stream' || /^image\//.test(t)) return byExt;
    return '';
  }
  function baseName(name) { return String(name || '').replace(/\.[a-z0-9]+$/i, '') || 'plan'; }
  /* ключ файла — 16 hex: FNV-1a 32 бит дважды (разные начальные значения) по размеру, имени и первым/последним 64 КБ.
     Нужен, чтобы расстановки двух разных файлов с одинаковым именем (image.jpg с телефона) не делили одну запись.
     crypto.subtle здесь недоступен — демо открывают по http */
  function readBytes(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (ok, no) { var fr = new FileReader(); fr.onload = function () { ok(new Uint8Array(fr.result)); }; fr.onerror = function () { no(fr.error); }; fr.readAsArrayBuffer(blob); });
  }
  function fnv1a(bytes, h) { for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function hex8(n) { return ('00000000' + n.toString(16)).slice(-8); }
  function fileKey(file) {
    var K = 65536, size = file.size || 0, head = file.slice(0, Math.min(K, size)), tail = size > K ? file.slice(Math.max(K, size - K)) : null;
    var meta = []; String(size + ':' + (file.name || '')).split('').forEach(function (c) { var code = c.charCodeAt(0); meta.push(code & 255, code >> 8); });
    return Promise.all([readBytes(head), tail ? readBytes(tail) : Promise.resolve(new Uint8Array(0))]).then(function (parts) {
      var h1 = 0x811c9dc5, h2 = 0x050c5d1f;
      [new Uint8Array(meta)].concat(parts).forEach(function (b) { h1 = fnv1a(b, h1); h2 = fnv1a(b, h2 ^ 0xa5a5a5a5); });
      return hex8(h1) + hex8(h2);
    }).catch(function () { return hex8(fnv1a(new Uint8Array(meta), 0x811c9dc5)) + hex8(size >>> 0); });
  }
  /* подготовка к отправке → { kind: 'image' | 'pdf' | 'raw', blob, name, w, h, src, key }.
     PDF уходит как есть (kind 'pdf'). Картинку браузер открывает сам: открылась — рисуем на холст с белой подложкой
     (PNG с прозрачностью) и отдаём JPEG не больше 2000 px по стороне и 4 МБ (качество 0,9 → 0,82 → 0,72, потом 1600 px);
     EXIF-поворот браузер применяет сам, поэтому «что отправили = что показываем». Не открылась (HEIC в Chrome, битый
     файл) — kind 'raw': файл как есть, тип по расширению (пустой тип ушёл бы как octet-stream и получил 415) */
  var SEND_PX = [2000, 1600], SEND_Q = [0.9, 0.82, 0.72], SEND_MAX = 4 * 1024 * 1024, RAW_MAX = 10 * 1024 * 1024;
  function prepareImage(file) {
    return fileKey(file).then(function (key) {
      var name = file.name || 'plan', type = fileType(file);
      if (type === 'application/pdf') return { kind: 'pdf', blob: file, name: name, w: 0, h: 0, src: null, key: key };
      return new Promise(function (ok, no) {
        var url = URL.createObjectURL(file), im = new Image();
        im.onerror = function () {
          URL.revokeObjectURL(url);
          var blob = type && type !== file.type ? new File([file], name, { type: type }) : file;
          ok({ kind: 'raw', blob: blob, name: name, w: 0, h: 0, src: null, key: key });
        };
        im.onload = function () {
          URL.revokeObjectURL(url);
          var W = im.naturalWidth, H = im.naturalHeight, steps = [];
          SEND_PX.forEach(function (px) { SEND_Q.forEach(function (q) { steps.push({ px: px, q: q }); }); });
          function fallback() {
            /* холст не сработал — отправляем оригинал, если он проходит по размеру сервера */
            if (file.size <= RAW_MAX) return ok({ kind: 'image', blob: file, name: name, w: W, h: H, src: URL.createObjectURL(file), key: key });
            var e = new Error('Файл весит ' + mbTxt(file.size) + ' МБ — больше 10 МБ. Сохрани план картинкой поменьше или сделай скриншот.'); e.kind = 'big'; no(e);
          }
          function step(i) {
            var s = steps[i], k = Math.min(1, s.px / Math.max(W, H)), c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
            try {
              var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
              c.toBlob(function (blob) {
                if (!blob) return fallback();
                if (blob.size > SEND_MAX && i + 1 < steps.length) return step(i + 1);
                ok({ kind: 'image', blob: blob, name: baseName(name) + '.jpg', w: c.width, h: c.height, src: URL.createObjectURL(blob), key: key });
              }, 'image/jpeg', s.q);
            } catch (e) { fallback(); }
          }
          step(0);
        };
        im.src = url;
      });
    });
  }
  function mbTxt(bytes) { return String(Math.round(bytes / 1024 / 1024 * 10) / 10).replace('.', ','); }

  /* ── вызовы API того же сервера; на стенде /api/ проксируется на API, как на сайте ──
     Разметка — XMLHttpRequest, а не fetch: нужен ход отправки файла (полоса ожидания), таймаут и отмена.
     o: { name, hints, projectId, timeoutMs, onUpload(доля 0–1) }. Возвращает Promise с методом .abort().
     Ошибка: e.kind = 'timeout' | 'net' (нет ответа, статус 0) | 'http' | 'abort', e.status, e.code (поле code
     или detail.code из JSON), текст — detail / error.message, как раньше */
  var MARKUP_TIMEOUT_MS = 200000;   // сервер отвечает не позже 170 с; сложный план (БТИ, этаж) читается до 2–2,5 мин
  function markupTimeout() { var v = 0; try { v = parseInt(sessionStorage.getItem('sove.plan.timeoutMs'), 10) || 0; } catch (e) {} return v > 0 ? v : MARKUP_TIMEOUT_MS; }
  function apiMarkup(blob, o) {
    o = o || {};
    var xhr = new XMLHttpRequest();
    var p = new Promise(function (ok, no) {
      var fd = new FormData(); fd.append('file', blob, o.name || blob.name || 'plan.jpg');
      if (o.hints) fd.append('hints', typeof o.hints === 'string' ? o.hints : JSON.stringify(o.hints));
      xhr.open('POST', '/api/ai/plan/markup' + (o.projectId ? '?project_id=' + encodeURIComponent(o.projectId) : ''));
      xhr.timeout = o.timeoutMs || markupTimeout();
      xhr.responseType = 'text';
      if (xhr.upload && o.onUpload) {
        xhr.upload.onprogress = function (e) { if (e.lengthComputable && e.total) o.onUpload(Math.min(1, e.loaded / e.total)); };
        xhr.upload.onload = function () { o.onUpload(1); };
      }
      function fail(kind, msg) { var e = new Error(msg); e.kind = kind; e.status = 0; no(e); }
      xhr.onload = function () {
        var j = null; try { j = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300) return ok(j);
        var msg = (j && (j.detail || (j.error && j.error.message))) || ('ошибка ' + xhr.status);
        if (typeof msg !== 'string') msg = JSON.stringify(msg);
        var e = new Error(msg); e.kind = 'http'; e.status = xhr.status;
        e.code = String((j && (j.code || (j.detail && j.detail.code) || (j.error && j.error.code))) || '');
        no(e);
      };
      xhr.onerror = function () { fail('net', 'нет связи'); };
      xhr.ontimeout = function () { fail('timeout', 'сервер не ответил'); };
      xhr.onabort = function () { fail('abort', 'отменено'); };
      xhr.send(fd);
    });
    p.abort = function () { try { xhr.abort(); } catch (e) {} };
    return p;
  }
  /* человеческий текст ошибки разметки и главное действие экрана → { kind, text, primary: 'retry' | 'other' | 'sample' }.
     429 от нас — частые загрузки (минута, обратный отсчёт) или дневной лимит; 413 — файл больше 10 МБ; 415 — формат;
     502/504 — API за nginx не отвечает; 503 или слова провайдера — перегрузка ИИ; «баланс / пополни / API_KEY» —
     кончились деньги или ключ у провайдера: это к команде; статус 0 — нет связи или таймаут.
     «ошибка NNN» — наш же текст по коду ответа, не слова сервера: показываем общий */
  function errorOf(e) {
    e = e || {};
    var m = String(e.message || ''); if (/^ошибка \d+$/i.test(m)) m = '';
    var s = e.status, code = String(e.code || '');
    function R(kind, text, primary) { return { kind: kind, text: text, primary: primary }; }
    if (e.kind === 'timeout') return R('timeout', 'Сервер не ответил за 3 минуты — такое бывает при перегрузке, файл в порядке.', 'retry');
    if (e.kind === 'net' || (s === 0 && e.kind !== 'abort')) return R('net', 'Нет связи — проверь интернет и повтори.', 'retry');
    if (s === 429) return /rate_minute/i.test(code) || /минут/i.test(m)
      ? R('minute', 'Слишком много загрузок подряд — подожди минуту.', 'retry')
      : R('day', 'Дневной лимит разметок исчерпан — попробуй завтра или возьми пример.', 'sample');
    if (s === 413) return R('big', 'Файл больше 10 МБ — сохрани один лист или сделай скриншот.', 'other');
    /* коды нового сервера (plan_input): HEIC без декодера, битый PDF, подсказки не разобраны */
    if (/heic_unsupported/i.test(code)) return R('format', 'HEIC не прочитался — сохрани план как JPG или сделай скриншот.', 'other');
    if (/bad_pdf/i.test(code)) return R('format', 'PDF не открылся — сохрани лист картинкой или сделай скриншот.', 'other');
    if (/bad_hints/i.test(code)) return R('hints', 'Подсказки к плану не применились — прочитай его ещё раз.', 'retry');
    if (s === 415) return R('format', 'Этот формат не читается — нужен JPG, PNG, PDF или HEIC.', 'other');
    if (/баланс|пополни|API_KEY/i.test(m)) return R('money', 'Распознавание недоступно — сообщи команде.', 'sample');
    if (s === 502 || s === 504) return R('down', 'Сервер распознавания недоступен — попробуй через пару минут.', 'retry');
    if (s === 503 || /Error code|Provider|OpenRouter|timed? ?out/i.test(m)) return R('busy', 'Распознавание перегружено — попробуй ещё раз через минуту.', 'retry');
    if (/[а-яё]/i.test(m)) return R('text', m, 'other');
    return R('unknown', 'Не получилось прочитать план — попробуй ещё раз или возьми другой файл.', 'retry');
  }
  function apiAuto(frame, brief) {
    return fetch('/api/ai/layout/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frame, brief: brief }) }).then(unwrap).then(function (out) {
        if (out && out.layout) { restoreIds(out.layout, frame); carryWalls(out.layout, frame); }
        return out;
      });
  }
  function unwrap(r) {
    return r.text().then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) {}
      if (r.ok) return j;
      var msg = (j && (j.detail || (j.error && j.error.message))) || ('ошибка ' + r.status);
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      var e = new Error(msg); e.status = r.status; throw e;
    });
  }
  function imageSize(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url); };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('не удалось прочитать картинку')); };
      im.src = url;
    });
  }

  window.SOVE_FLOW = { load: load, save: save, blockHead: blockHead, SCN: SCN, REPLAN_PRICE: REPLAN_PRICE, priceTxt: priceTxt, replanSheet: replanSheet, replanOn: replanOn, setReplan: setReplan, stepOf: stepOf, interiorTiles: interiorTiles, interiorStrip: interiorStrip, budgetCard: function (o) { budgetOnDone = o && o.rerender || null; return budgetCard(o); }, budgetFull: budgetFull, budgetLayers: budgetLayers, refreshBudget: refreshBudget, productList: productList, planFinish: planFinish, planDoc: planDoc, savePlan: savePlan, downloadSheet: downloadSheet, furnitureSum: furnitureSum, interiorChosen: interiorChosen, capsuleInterior: capsuleInterior, ownSheet: ownSheet, planFor: planFor,
    frameFromMarkup: frameFromMarkup, markupQuality: markupQuality, qualityOf: qualityOf, reasonsText: reasonsText, REASON_RU: REASON_RU,
    rotateRes: rotateRes, rotatePoint: rotatePoint, typeFromName: typeFromName, briefFromAnswers: briefFromAnswers, apiMarkup: apiMarkup, apiAuto: apiAuto,
    imageSize: imageSize, RU: RU, resolveOpenings: resolveOpenings, restoreIds: restoreIds, carryWalls: carryWalls, cutEntrance: cutEntrance, prepareImage: prepareImage, fileKey: fileKey, fileType: fileType,
    errorOf: errorOf, mbTxt: mbTxt, MARKUP_TIMEOUT_MS: MARKUP_TIMEOUT_MS };
})();
