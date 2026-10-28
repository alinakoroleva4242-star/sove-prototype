/* Генерации: лента поисков Генерациях. Данные — SOVE.gens, цены — SOVE.data.costs. */
(function () {
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt;
  var RETURN = 'generations.html';
  var FINISH_FALLBACK = 9000; /* у старых записей нет своей длительности — берём самую долгую (поиск по рендеру) */
  /* срок тот же, что на странице поиска (ai.js): начало + длительность самого поиска */
  function dueAt(g) { return (g.startedAt || g.ts || 0) + (g.duration || FINISH_FALLBACK); }

  var elWallet = document.getElementById('gens-wallet');
  var elToolbar = document.getElementById('gens-toolbar');
  var elFilters = document.getElementById('gens-filters');
  var elSummary = document.getElementById('gens-summary');
  var elList = document.getElementById('gens-list');
  if (!elList) return;

  var KIND = { photo: 'По фото', render: 'По рендеру' };
  var FILTERS = [ { key: 'all', label: 'Все' }, { key: 'photo', label: 'По фото' }, { key: 'render', label: 'По рендеру' } ];
  var filter = S.ui.qs('kind'); if (!KIND[filter]) filter = 'all';

  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }
  function countWord(n, forms) { return F.num(n) + ' ' + plural(n, forms); }
  var W_GEN = ['генерация', 'генерации', 'генераций'], W_OBJ = ['предмет', 'предмета', 'предметов'], W_ITEM = ['товар', 'товара', 'товаров'];
  var DEMO_WORDS = { 1: 'один пробный запуск', 2: 'два пробных запуска', 3: 'три пробных запуска', 4: 'четыре пробных запуска', 5: 'пять пробных запусков' };

  function status(g) {
    var paid = !!g.cost;
    if (g.status === 'running') return { text: 'идёт поиск', cls: 'badge--accent' };
    if (g.status === 'empty') return { text: 'ничего не найдено · ' + (paid ? 'токены возвращены' : 'запуск возвращён'), cls: 'badge--line' };
    if (g.status === 'error') return { text: 'ошибка · ' + (paid ? 'токены возвращены' : 'запуск возвращён'), cls: 'gen-badge--danger' };
    return { text: 'готово', cls: 'badge--green' };
  }
  function costLine(g) {
    if (!g.cost) return '<span class="small muted">пробный запуск</span>';
    var t = F.tokens(g.cost);
    if (g.status === 'empty' || g.status === 'error') return '<span class="small muted"><span class="num strike">' + t + '</span> возвращены</span>';
    if (g.status === 'running') return '<span class="small num">' + t + ' <span class="muted">в резерве</span></span>';
    return '<span class="small num">' + t + '</span>';
  }
  function objectsOf(g) { var r = g.result || {}; return r.objects || (r.sample ? D.ai.renderSample.objects : null); }
  function foundLine(g) {
    if (g.status !== 'done') return '';
    var objs = objectsOf(g), r = g.result || {};
    if (objs) { var n = 0; objs.forEach(function (o) { n += (o.items || []).length; }); return countWord(objs.length, W_OBJ) + ' · ' + countWord(n, W_ITEM); }
    if (r.items) return countWord(r.items.length, W_ITEM) + ' в каталоге';
    return '';
  }

  function card(g) {
    var st = status(g), pr = g.projectId ? S.projects.get(g.projectId) : null, found = foundLine(g);
    var pic = g.src
      ? '<img src="' + F.esc(g.src) + '" alt="' + F.esc(g.title || 'Исходное изображение') + '" loading="lazy">'
      : '<div class="ph gen-card__ph">изображение не сохранилось</div>';
    return '<a class="gen-card' + (g.status === 'running' ? ' is-running' : '') + '" href="generation.html?id=' + encodeURIComponent(g.id) + '">' +
      '<div class="gen-card__pic">' + pic + (g.status === 'running' ? '<span class="gen-card__run" aria-hidden="true"><i></i></span>' : '') + '</div>' +
      '<div class="gen-card__body">' +
        '<div class="gen-card__meta"><span class="eyebrow">' + (KIND[g.kind] || 'Поиск') + '</span><span class="tiny muted num">' + F.date(g.ts) + '</span></div>' +
        '<span class="gen-card__title">' + F.esc(g.title || 'Без названия') + '</span>' +
        (found ? '<span class="small muted">' + found + '</span>' : '') +
        '<span class="gen-card__status"><span class="badge ' + st.cls + '">' + st.text + '</span></span>' +
        '<div class="gen-card__foot">' + costLine(g) + (pr ? '<span class="small muted gen-card__project">' + F.esc(pr.name) + '</span>' : '') + '</div>' +
      '</div></a>';
  }

  /* ---------- баланс справа от заголовка ---------- */
  function renderWallet() {
    var prices = 'Поиск по фото — ' + D.costs.photo + ', по рендеру — ' + F.tokens(D.costs.render);
    if (S.auth.isIn()) {
      elWallet.innerHTML =
        '<span class="tiny muted">Баланс</span>' +
        '<span class="mid-num">' + F.tokens(S.tokens.balance()) + '</span>' +
        '<span class="tiny muted gens-wallet__hint">' + prices + '</span>' +
        '<a class="btn btn--link gens-wallet__link" href="tokens.html?returnTo=' + encodeURIComponent(RETURN) + '">Пополнить</a>';
    } else {
      elWallet.innerHTML =
        '<span class="tiny muted">Пробные запуски без регистрации</span>' +
        '<span class="mid-num">демо: ' + S.demo.left() + ' из ' + D.demoLimit + '</span>' +
        '<span class="tiny muted gens-wallet__hint">После входа подарим ' + F.tokens(D.gift.tokens) + ' на генерации</span>' +
        '<a class="btn btn--link gens-wallet__link" href="auth.html?returnTo=' + encodeURIComponent(RETURN) + '">Войти</a>';
    }
  }

  /* ---------- фильтры ---------- */
  function renderFilters(all) {
    elFilters.innerHTML = FILTERS.map(function (f) {
      var n = f.key === 'all' ? all.length : all.filter(function (g) { return g.kind === f.key; }).length;
      return '<button type="button" class="chip' + (f.key === filter ? ' is-active' : '') + '" data-kind="' + f.key + '" aria-pressed="' + (f.key === filter) + '">' + f.label + ' <span class="num gens-filters__n">' + n + '</span></button>';
    }).join('');
  }
  elFilters.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kind]'); if (!b) return;
    filter = b.getAttribute('data-kind');
    try { history.replaceState(null, '', filter === 'all' ? RETURN : RETURN + '?kind=' + filter); } catch (err) {}
    render();
    var again = elFilters.querySelector('[data-kind="' + filter + '"]'); if (again) again.focus();
  });

  /* ---------- пустые состояния ---------- */
  function sampleFigure() {
    var s = D.ai.renderSample;
    return '<figure class="gens-sample stack stack--3" aria-hidden="true">' +
      '<div class="gens-sample__pic"><img src="' + s.src + '" alt="" width="960" height="1200">' +
      s.objects.map(function (o) { return '<span class="gens-sample__box" style="left:' + o.box[0] + '%;top:' + o.box[1] + '%;width:' + o.box[2] + '%;height:' + o.box[3] + '%"><span class="marker">' + o.n + '</span></span>'; }).join('') +
      '</div><figcaption class="dim"><span>Пример · ' + F.esc(s.title) + '</span></figcaption></figure>';
  }
  function emptyGuest() {
    var left = S.demo.left();
    var words = DEMO_WORDS[D.demoLimit] || (D.demoLimit + ' пробных запусков');
    var head, text, action;
    if (left > 0) {
      head = 'Попробуйте Генерации — ' + words + ' без регистрации';
      text = 'Загрузите фото предмета или рендер комнаты. Найдём такие же или похожие товары в каталоге партнёров и покажем цены. Осталось ' + left + ' из ' + D.demoLimit + '.';
      action = '<a class="btn btn--primary" href="ai.html">Попробовать Генерации</a>';
    } else {
      head = 'Пробные запуски закончились';
      text = 'Войдите по коду из SMS — подарим ' + F.tokens(D.gift.tokens) + ' на генерации. Поиск по фото стоит ' + F.tokens(D.costs.photo) + ', по рендеру — ' + F.tokens(D.costs.render) + '.';
      action = '<a class="btn btn--primary" href="auth.html?returnTo=' + encodeURIComponent('ai.html') + '">Войти и получить токены</a>';
    }
    return '<div class="gens-empty">' +
      '<div class="gens-empty__text stack stack--6"><span class="eyebrow">Здесь пока пусто</span><h2 class="h2">' + head + '</h2><p class="text">' + text + '</p>' +
      '<div class="row">' + action + '</div>' +
      '<ul class="gens-empty__facts">' +
        '<li class="rule-top"><span class="mid-num">' + F.tokens(D.costs.photo) + '</span><span class="tiny muted">поиск по фото предмета</span></li>' +
        '<li class="rule-top"><span class="mid-num">' + F.tokens(D.costs.render) + '</span><span class="tiny muted">поиск по рендеру комнаты</span></li>' +
      '</ul></div>' + sampleFigure() + '</div>';
  }
  function emptyUser() {
    return '<div class="gens-empty">' +
      '<div class="gens-empty__text stack stack--6"><span class="eyebrow">Здесь пока пусто</span><h2 class="h2">Здесь появятся ваши поиски</h2>' +
      '<p class="text">Загрузите фото предмета или рендер комнаты — найдём такие же или похожие товары в каталоге партнёров. Каждый результат сохранится в этой ленте, его можно положить в проект.</p>' +
      '<div class="row"><a class="btn btn--primary" href="ai.html">Новая генерация</a></div>' +
      '<ul class="gens-empty__facts">' +
        '<li class="rule-top"><span class="mid-num">' + F.tokens(D.costs.photo) + '</span><span class="tiny muted">поиск по фото предмета</span></li>' +
        '<li class="rule-top"><span class="mid-num">' + F.tokens(D.costs.render) + '</span><span class="tiny muted">поиск по рендеру комнаты</span></li>' +
        '<li class="rule-top"><span class="mid-num">' + F.tokens(S.tokens.balance()) + '</span><span class="tiny muted">сейчас на балансе</span></li>' +
      '</ul></div>' + sampleFigure() + '</div>';
  }
  function emptyFilter() {
    var photo = filter === 'photo';
    return '<div class="empty"><span class="empty__title">' + (photo ? 'Поисков по фото пока нет' : 'Поисков по рендеру пока нет') + '</span>' +
      '<p class="small muted">' + (photo ? 'Сфотографируйте предмет — найдём такой же или похожий. ' + F.tokens(D.costs.photo) + ' за поиск.' : 'Загрузите рендер или фото комнаты — разберём на предметы и подберём товары. ' + F.tokens(D.costs.render) + ' за поиск.') + '</p>' +
      '<a class="arrow-link" href="ai.html?mode=' + filter + '">' + (photo ? 'Найти по фото' : 'Найти по рендеру') + '</a></div>';
  }

  /* ---------- лента ---------- */
  function render() {
    try {
      renderWallet();
      var all = S.gens.list();
      if (!all.length) {
        elToolbar.hidden = true; elSummary.hidden = true;
        elList.innerHTML = S.auth.isIn() ? emptyUser() : emptyGuest();
        return;
      }
      elToolbar.hidden = false;
      renderFilters(all);
      var shown = filter === 'all' ? all : all.filter(function (g) { return g.kind === filter; });

      var spent = 0, back = 0, running = 0;
      all.forEach(function (g) { var c = g.cost || 0; if (g.status === 'done') spent += c; else if (g.status === 'running') running += 1; else back += c; });
      var parts = [countWord(all.length, W_GEN)];
      if (spent) parts.push('списано ' + F.tokens(spent));
      if (back) parts.push('возвращено ' + F.tokens(back));
      if (running) parts.push(running === 1 ? 'один поиск ещё идёт' : 'поисков в работе: ' + running);
      elSummary.textContent = parts.join(' · ');
      elSummary.hidden = false;

      elList.innerHTML = shown.length
        ? '<div class="grid grid--3 grid--gap-lg gens-grid">' + shown.map(card).join('') + '</div>'
        : emptyFilter();
    } catch (e) {
      console.error(e);
      elToolbar.hidden = true; elSummary.hidden = true;
      elList.innerHTML = '<div class="error-screen"><h2 class="h3">Не удалось показать генерации</h2>' +
        '<p class="text">Данные ленты не прочитались. Токены при этом не списывались. Обновите страницу — если не поможет, сбросьте данные прототипа внизу страницы.</p>' +
        '<div class="row"><button type="button" class="btn btn--ghost" onclick="location.reload()">Обновить страницу</button></div></div>';
    }
  }

  /* ---------- поиск, с которого ушли: доводим до результата ---------- */
  var timers = {};
  function settle(id) {
    var g = S.gens.get(id); delete timers[id];
    if (!g || g.status !== 'running') return;
    var nothing = g.sample === 'empty' || g.src === D.ai.emptySample.src;
    if (nothing) {
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
    S.gens.list().forEach(function (g) {
      if (g.status !== 'running' || timers[g.id]) return;
      timers[g.id] = setTimeout(function () { settle(g.id); }, Math.max(0, dueAt(g) - Date.now()));
    });
  }

  render(); watchRunning();
  S.onChange(function () { render(); watchRunning(); });
})();
