/* Результат генерации SOVEAPP AI: generation.html?id=<id>. Данные — SOVE.gens, примеры распознавания — SOVE.data.ai. */
(function () {
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt;
  var root = document.getElementById('gen-root'); if (!root) return;
  var id = S.ui.qs('id');
  var SELF = 'generation.html' + (id ? '?id=' + encodeURIComponent(id) : '');
  var FINISH_FALLBACK = 9000; /* у старых записей нет своей длительности — берём самую долгую (поиск по рендеру) */
  /* срок тот же, что на странице поиска (ai.js): начало + длительность самого поиска */
  function dueAt(g) { return (g.startedAt || g.ts || 0) + (g.duration || FINISH_FALLBACK); }
  var DRAFT_SAVE = 'generation-save';

  var KIND = { photo: 'Поиск по фото', render: 'Поиск по рендеру' };
  var W_OBJ = ['предмет', 'предмета', 'предметов'], W_ITEM = ['товар', 'товара', 'товаров'];
  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }
  function countWord(n, forms) { return F.num(n) + ' ' + plural(n, forms); }

  function objectsOf(g) { var r = g.result || {}; return r.objects || (r.sample ? D.ai.renderSample.objects : null); }
  function sceneSrc(g) { var r = g.result || {}; return (r.sample && !r.objects) ? D.ai.renderSample.src : (g.src || D.ai.renderSample.src); }
  function productsOf(items) { return (items || []).map(function (it) { var p = D.product(it.id); return p ? { p: p, tag: it.match === 'exact' ? 'exact' : 'near' } : null; }).filter(Boolean); }

  /* ---------- общие куски ---------- */
  function crumbs(last) {
    return '<nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">Главная</a><span aria-hidden="true">/</span><a href="generations.html">Генерации</a>' +
      (last ? '<span aria-hidden="true">/</span><span aria-current="page">' + F.esc(last) + '</span>' : '') + '</nav>';
  }
  function badge(g) {
    if (g.status === 'running') return '<span class="badge badge--accent">идёт поиск</span>';
    if (g.status === 'empty') return '<span class="badge badge--line">ничего не найдено</span>';
    if (g.status === 'error') return '<span class="badge gen-badge--danger">ошибка</span>';
    return '<span class="badge badge--green">готово</span>';
  }
  function chargeLine(g) {
    var t = g.cost ? F.tokens(g.cost) : '';
    var bal = S.auth.isIn() ? ' <span class="muted">· на балансе ' + F.num(S.tokens.balance()) + '</span>' : '';
    if (g.status === 'running') return g.cost ? '<b>В резерве ' + t + '</b> <span class="muted">· спишем, только если что-то найдём</span>' : '<b>Пробный запуск</b> <span class="muted">· токены не нужны</span>';
    if (g.status === 'empty' || g.status === 'error') return g.cost ? '<b>Токены возвращены</b> <span class="muted">· ' + t + ' снова на балансе</span>' : '<b>Пробный запуск возвращён</b>';
    return g.cost ? '<b>Списано ' + t + '</b>' + bal : '<b>Пробный запуск</b> <span class="muted">· токены не списывались</span>';
  }
  function head(g, actions) {
    var pr = g.projectId ? S.projects.get(g.projectId) : null;
    return '<header class="gen-head">' +
      '<div class="gen-head__text">' +
        '<h1 class="gen-title"><span class="eyebrow">' + (KIND[g.kind] || 'Поиск') + ' · ' + F.dateLong(g.ts) + '</span> <span class="gen-title__name">' + F.esc(g.title || 'Без названия') + '</span></h1>' +
        '<p class="gen-charge">' + badge(g) + '<span class="small num-line">' + chargeLine(g) + '</span></p>' +
        (pr ? '<p class="small muted">Сохранено в проект <a class="link" href="project.html?id=' + encodeURIComponent(pr.id) + '">' + F.esc(pr.name) + '</a></p>' : '') +
      '</div>' +
      (actions ? '<div class="gen-actions">' + actions + '</div>' : '') +
    '</header>';
  }
  function doneActions(g) {
    var pr = g.projectId ? S.projects.get(g.projectId) : null;
    var again = '<a class="btn btn--ghost" href="ai.html?mode=' + encodeURIComponent(g.kind || 'photo') + '">Повторить поиск</a>';
    if (pr) return '<a class="btn btn--primary" href="project.html?id=' + encodeURIComponent(pr.id) + '">Открыть проект</a>' +
      '<button type="button" class="btn btn--ghost" data-act="save">Перенести в другой проект</button>' + again;
    return '<button type="button" class="btn btn--primary" data-act="save">Сохранить в проект</button>' + again;
  }

  /* ---------- результат: рендер с предметами ---------- */
  function renderScene(g, objs) {
    var total = 0; objs.forEach(function (o) { total += productsOf(o.items).length; });
    var frames = objs.map(function (o) {
      var n = productsOf(o.items).length, b = o.box || [0, 0, 0, 0];
      return '<button type="button" class="gen-frame" data-obj="' + o.n + '" style="left:' + b[0] + '%;top:' + b[1] + '%;width:' + b[2] + '%;height:' + b[3] + '%" aria-label="Предмет ' + o.n + ': ' + F.esc(o.name) + ', ' + (n ? countWord(n, W_ITEM) : 'в каталоге похожего нет') + '"><span class="marker">' + o.n + '</span></button>';
    }).join('');
    var list = objs.map(function (o) {
      var items = productsOf(o.items);
      return '<section class="gen-object" id="obj-' + o.n + '" data-obj="' + o.n + '" aria-labelledby="obj-title-' + o.n + '">' +
        '<div class="gen-object__head rule-top"><span class="marker">' + o.n + '</span><h2 class="h4 grow" id="obj-title-' + o.n + '">' + F.esc(o.name) + '</h2><span class="small muted num">' + (items.length ? countWord(items.length, W_ITEM) : 'нет в каталоге') + '</span></div>' +
        (items.length
          ? '<div class="grid gen-object__grid">' + items.map(function (x) { return S.ui.productCard(x.p, { tag: x.tag }); }).join('') + '</div>'
          : '<div class="gen-none hatch"><span class="gen-none__title">В каталоге похожего нет</span><span class="small muted">Предмет распознали, но у партнёров SOVEAPP такого пока нет. В черновую смету он не входит.</span></div>') +
      '</section>';
    }).join('');
    return '<section class="split gen-result" aria-label="Результат поиска">' +
      '<figure class="col-5 sticky gen-scene stack stack--3">' +
        '<div class="gen-scene__pic"><img src="' + F.esc(sceneSrc(g)) + '" alt="' + F.esc(g.title || 'Рендер') + ': найденные предметы отмечены рамками" width="960" height="1200">' + frames + '</div>' +
        '<figcaption class="dim"><span>' + countWord(objs.length, W_OBJ) + ' · ' + countWord(total, W_ITEM) + '</span></figcaption>' +
        '<p class="tiny muted">Нажмите на рамку, чтобы перейти к товарам для этого предмета.</p>' +
      '</figure>' +
      '<div class="col-7 gen-objects">' + list + '</div>' +
    '</section>' + estimate(g, objs);
  }

  function estimate(g, objs) {
    var rows = [], retail = 0, metod = 0;
    objs.forEach(function (o) {
      var first = productsOf(o.items)[0];
      if (!first) { rows.push('<li><span class="gen-est-row is-none"><span class="marker">' + o.n + '</span><span class="gen-est-row__name"><b>' + F.esc(o.name) + '</b><small>в каталоге похожего нет — в смету не входит</small></span><span class="gen-est-row__price"><span class="muted">—</span></span></span></li>'); return; }
      retail += first.p.retail; metod += first.p.metod;
      rows.push('<li><a class="gen-est-row" href="product.html?id=' + first.p.id + '"><span class="marker">' + o.n + '</span>' +
        '<span class="gen-est-row__name"><b>' + F.esc(o.name) + '</b><small>' + F.esc(first.p.name) + '</small></span>' +
        '<span class="gen-est-row__price"><span class="green num">' + F.rub(first.p.metod) + '</span><span class="tiny muted strike num">' + F.rub(first.p.retail) + '</span></span></a></li>');
    });
    if (!retail) return '';
    var save = retail - metod, pct = Math.round(save / retail * 100);
    var metodNote = S.metod.active()
      ? '<p class="tiny muted">Подписка METOD активна — контакты поставщиков открыты в карточках товаров.</p>'
      : '<p class="tiny muted">Цены METOD действуют по подписке. <a class="link" href="metod.html?returnTo=' + encodeURIComponent(SELF) + '">Оформить METOD</a></p>';
    return '<section class="gen-estimate" aria-labelledby="est-title">' +
      '<div class="gen-estimate__head"><span class="eyebrow">Черновая смета</span><h2 class="h2" id="est-title">Если взять первый товар для каждого предмета</h2></div>' +
      '<div class="split">' +
        '<ul class="col-7 rows gen-est-rows">' + rows.join('') + '</ul>' +
        '<div class="col-5 card card--pad gen-sum">' +
          '<div class="gen-sum__line"><span class="small muted">В рознице</span><span class="mid-num strike muted">' + F.rub(retail) + '</span></div>' +
          '<div class="gen-sum__main"><span class="small muted">По ценам METOD</span><span class="big-num green">' + F.rub(metod) + '</span></div>' +
          '<div class="gen-sum__line rule-top"><span class="small muted">Экономия</span><span class="mid-num">' + F.rub(save) + ' <span class="small muted num">· ' + pct + ' %</span></span></div>' +
          '<button type="button" class="btn btn--ghost btn--block" data-act="download">Скачать смету</button>' +
          '<p class="tiny muted">Предварительно: без доставки, сборки и монтажа. Товар в каждой строке можно заменить на похожий.</p>' + metodNote +
        '</div>' +
      '</div></section>';
  }

  /* ---------- результат: аналоги по фото ---------- */
  function renderItems(g) {
    var items = productsOf((g.result || {}).items);
    var exact = items.filter(function (x) { return x.tag === 'exact'; }).length, near = items.length - exact;
    var note = [];
    if (exact) note.push(exact + ' ' + plural(exact, ['точное совпадение', 'точных совпадения', 'точных совпадений']));
    if (near) note.push(near + ' ' + plural(near, ['похожий', 'похожих', 'похожих']));
    return '<section class="split gen-result" aria-label="Результат поиска">' +
      '<figure class="col-4 sticky gen-source stack stack--3">' + sourcePic(g) + '<figcaption class="dim"><span>Ваше фото</span></figcaption></figure>' +
      '<div class="col-8 stack stack--6">' +
        '<div class="gen-object__head rule-top"><h2 class="h3 grow">Нашли ' + countWord(items.length, W_ITEM) + '</h2><span class="small muted">' + note.join(' · ') + '</span></div>' +
        '<div class="grid gen-items">' + items.map(function (x) { return S.ui.productCard(x.p, { tag: x.tag }); }).join('') + '</div>' +
        '<p class="small muted">Цена METOD — для подписчиков, зачёркнутая — розница. Контакты поставщика — в карточке товара.</p>' +
      '</div></section>';
  }
  function sourcePic(g, cls) {
    return g.src ? '<div class="gen-source__pic' + (cls ? ' ' + cls : '') + '"><img src="' + F.esc(g.src) + '" alt="' + F.esc(g.title || 'Исходное изображение') + '">' + (cls === 'is-running' ? '<span class="gen-run" aria-hidden="true"><i></i></span>' : '') + '</div>'
      : '<div class="ph gen-source__ph">изображение не сохранилось</div>';
  }

  /* ---------- состояния без результата ---------- */
  function stateScreen(g, body) {
    return '<section class="split gen-state">' +
      '<figure class="col-4 gen-source stack stack--3">' + sourcePic(g, g.status === 'running' ? 'is-running' : '') + '<figcaption class="dim"><span>Исходное изображение</span></figcaption></figure>' +
      '<div class="col-7 gen-state__body stack stack--6">' + body + '</div></section>';
  }
  function renderEmpty(g) {
    var mode = encodeURIComponent(g.kind || 'photo');
    return stateScreen(g,
      '<h2 class="h2">Ничего не нашли · ' + (g.cost ? 'токены возвращены' : 'пробный запуск возвращён') + '</h2>' +
      '<p class="text">На изображении не получилось выделить мебель, свет или отделку. ' + (g.cost ? F.tokens(g.cost) + ' вернулись на баланс — поиск без результата бесплатный.' : 'Пробный запуск не потрачен.') + '</p>' +
      '<ul class="rows rows--tight gen-tips"><li><span>Предмет виден целиком и ничем не перекрыт</span></li><li><span>Ровный свет, без сильных бликов и размытия</span></li><li><span>' + (g.kind === 'render' ? 'Общий план комнаты, а не фрагмент отделки' : 'В кадре один предмет, а не вся комната') + '</span></li></ul>' +
      '<div class="row"><a class="btn btn--primary" href="ai.html?mode=' + mode + '">Повторить поиск</a><a class="btn btn--ghost" href="generations.html">Все генерации</a></div>');
  }
  function renderError(g) {
    var mode = encodeURIComponent(g.kind || 'photo');
    return stateScreen(g,
      '<div class="error-screen"><h2 class="h3">Поиск не удался · ' + (g.cost ? 'токены возвращены' : 'пробный запуск возвращён') + '</h2>' +
      '<p class="text">' + F.esc(g.error || 'Сервис распознавания не ответил вовремя.') + ' ' + (g.cost ? F.tokens(g.cost) + ' вернулись на баланс.' : 'Пробный запуск не потрачен.') + ' Попробуйте ещё раз — с тем же или другим изображением.</p></div>' +
      '<div class="row"><a class="btn btn--primary" href="ai.html?mode=' + mode + '">Повторить поиск</a><a class="btn btn--ghost" href="generations.html">Все генерации</a></div>');
  }
  function renderRunning(g) {
    return stateScreen(g,
      '<h2 class="h2">Поиск ещё идёт</h2>' +
      '<p class="text">Можно уйти со страницы — результат появится в Генерациях, а эта страница обновится сама. ' + (g.cost ? F.tokens(g.cost) + ' в резерве: спишем их, только если что-то найдём.' : '') + '</p>' +
      '<ol class="stages"><li class="is-done">Изображение загружено</li><li class="is-now">' + (g.kind === 'render' ? 'Находим предметы на рендере' : 'Распознаём предмет') + '</li><li>Подбираем товары в каталоге партнёров</li></ol>' +
      '<div class="row"><a class="btn btn--ghost" href="ai.html">Открыть SOVEAPP AI</a><a class="btn btn--link" href="generations.html">Все генерации</a></div>');
  }
  function renderNotFound() {
    document.title = 'Генерация не найдена — SOVEAPP';
    return crumbs('Не найдена') +
      '<section class="gen-missing stack stack--6"><span class="eyebrow">SOVEAPP AI</span><h1 class="h1">Генерация не найдена</h1>' +
      '<p class="lead">Возможно, ссылка устарела или данные прототипа сбросили. Генерации хранятся только в том браузере, где их запускали.</p>' +
      '<div class="row"><a class="btn btn--primary" href="generations.html">Все генерации</a><a class="btn btn--ghost" href="ai.html">Новая генерация</a></div></section>';
  }

  /* ---------- сборка страницы ---------- */
  var lastSig = null;
  function signature(g) {
    return JSON.stringify([g, S.auth.isIn(), S.tokens.balance(), S.metod.active(), S.projects.list().map(function (p) { return [p.id, p.name]; })]);
  }
  function render(force) {
    var g = id ? S.gens.get(id) : null;
    try {
      if (!g) { if (lastSig !== 'none' || force) { root.innerHTML = renderNotFound(); lastSig = 'none'; } return; }
      var sig = signature(g); if (sig === lastSig && !force) return; lastSig = sig;
      document.title = (g.title || 'Генерация') + ' — генерация — SOVEAPP';
      var objs = objectsOf(g), hasItems = g.result && g.result.items && productsOf(g.result.items).length;
      var body, actions = '';
      if (g.status === 'running') body = renderRunning(g);
      else if (g.status === 'error') body = renderError(g);
      else if (g.status === 'empty' || (!objs && !hasItems)) body = renderEmpty(g);
      else { actions = doneActions(g); body = objs ? renderScene(g, objs) : renderItems(g); }
      root.innerHTML = crumbs(g.title || 'Генерация') + head(g, actions) + body +
        (actions ? '<div class="gen-back rule-top"><a class="arrow-link" href="generations.html">Все генерации</a></div>' : '');
    } catch (e) {
      console.error(e);
      root.innerHTML = crumbs('Ошибка') + '<div class="error-screen"><h1 class="h3">Не удалось показать результат</h1>' +
        '<p class="text">Данные генерации не прочитались. Токены при этом повторно не списывались. Обновите страницу или вернитесь в ленту.</p>' +
        '<div class="row"><button type="button" class="btn btn--ghost" data-act="reload">Обновить страницу</button><a class="btn btn--link" href="generations.html">Все генерации</a></div></div>';
    }
  }

  /* ---------- действия ---------- */
  function saveToProject() {
    var g = S.gens.get(id); if (!g) return;
    if (!S.auth.isIn()) {
      var m = S.ui.needAuth('Войдите, чтобы сохранить результат в проект', SELF);
      var go = m.el.querySelector('.modal__actions a'); if (go) go.addEventListener('click', function () { S.draft.set(DRAFT_SAVE, id); });
      return;
    }
    S.ui.pickProject(function (pid) {
      var cur = S.gens.get(id), target = S.projects.get(pid); if (!cur || !target) return;
      if (cur.projectId === pid) { S.ui.toast('Генерация уже в проекте «' + target.name + '»'); return; }
      var moved = !!cur.projectId, old = moved ? S.projects.get(cur.projectId) : null;
      if (old) S.projects.update(old.id, { generationIds: (old.generationIds || []).filter(function (x) { return x !== id; }) });
      S.gens.attach(id, pid);
      S.ui.toast((moved ? 'Перенесли в проект «' : 'Сохранили в проект «') + target.name + '»', 'ok');
    });
  }
  root.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'save') saveToProject();
      if (a === 'download') S.ui.toast('В прототипе файл не формируется');
      if (a === 'reload') location.reload();
      return;
    }
    var frame = e.target.closest('.gen-frame');
    if (frame) {
      var n = frame.getAttribute('data-obj'), target = document.getElementById('obj-' + n);
      root.querySelectorAll('.gen-frame.is-active, .gen-object.is-active').forEach(function (el) { el.classList.remove('is-active'); });
      frame.classList.add('is-active');
      if (target) { target.classList.add('is-active'); target.scrollIntoView({ block: 'start' }); }
    }
  });
  /* рамка ↔ блок предмета подсвечивают друг друга */
  function hot(e, on) {
    var el = e.target.closest ? e.target.closest('[data-obj]') : null; if (!el) return;
    var n = el.getAttribute('data-obj');
    root.querySelectorAll('[data-obj="' + n + '"]').forEach(function (x) { x.classList.toggle('is-hot', on); });
  }
  root.addEventListener('mouseover', function (e) { hot(e, true); });
  root.addEventListener('mouseout', function (e) { hot(e, false); });
  root.addEventListener('focusin', function (e) { hot(e, true); });
  root.addEventListener('focusout', function (e) { hot(e, false); });

  /* ---------- поиск, с которого ушли: доводим до результата ---------- */
  var timer = null;
  function settle() {
    timer = null;
    var g = S.gens.get(id); if (!g || g.status !== 'running') return;
    if (g.sample === 'empty' || g.src === D.ai.emptySample.src) {
      if (g.opId) S.tokens.refund(g.opId, 'ничего не найдено'); else if (g.demo || (!g.cost && !S.auth.isIn())) S.demo.giveBack();
      S.gens.update(id, { status: 'empty', finishedAt: Date.now() });
      S.ui.toast('Поиск завершён: ничего не нашли. ' + (g.cost ? 'Токены вернулись на баланс.' : 'Пробный запуск вернули.'));
    } else {
      if (g.opId) S.tokens.commit(g.opId);
      S.gens.update(id, { status: 'done', finishedAt: Date.now(), result: g.result || (g.kind === 'render' ? { sample: true } : { items: D.ai.photoSample.items }) });
      S.ui.toast('Поиск завершён' + (g.cost && S.auth.isIn() ? ' · списано ' + F.tokens(g.cost) + ' · остаток ' + F.num(S.tokens.balance()) : ''), 'ok');
    }
  }
  function watchRunning() {
    var g = id ? S.gens.get(id) : null;
    if (!g || g.status !== 'running' || timer) return;
    timer = setTimeout(settle, Math.max(0, dueAt(g) - Date.now()));
  }

  render(true); watchRunning();
  S.onChange(function () { render(false); watchRunning(); });

  /* вернулись со входа, куда ушли с кнопки «Сохранить в проект» */
  if (S.auth.isIn() && id && S.draft.get(DRAFT_SAVE) === id) {
    S.draft.clear(DRAFT_SAVE);
    var g0 = S.gens.get(id); if (g0 && g0.status === 'done') saveToProject();
  }
})();
