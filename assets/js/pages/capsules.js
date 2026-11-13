/* Каталог капсул: фильтр по стилю, крупные карточки, режим выбора (?pick=1&returnTo=scout.html) */
(function () {
  var S = window.SOVE;
  var grid = document.getElementById('caps-grid');
  if (!grid) return;
  if (!S || !S.data || !S.data.capsules) {
    grid.innerHTML = '<div class="error-screen" style="grid-column:1/-1"><p class="h4">Не удалось показать капсулы</p><p class="small">Данные каталога не загрузились. Обновите страницу.</p><div><button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">Обновить страницу</button></div></div>';
    return;
  }
  var D = S.data, F = S.fmt, esc = F.esc;
  var all = D.capsules.slice();

  function plural(n, one, few, many) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }

  /* ---------- режим выбора ---------- */
  /* returnTo принимаем только как относительный name.html (допускаем простой ?query) — никаких схем, слэшей и доменов */
  function safeReturn(rt) { return (rt && /^[a-z0-9_-]+\.html(\?[a-z0-9_=&%.+-]*)?$/i.test(rt)) ? rt : null; }
  function withCapsule(rt, id) { var parts = rt.split('?'); var q = new URLSearchParams(parts[1] || ''); q.set('capsule', id); return parts[0] + '?' + q.toString(); }
  var pick = S.ui.qs('pick') === '1';
  var returnTo = pick ? (safeReturn(S.ui.qs('returnTo')) || 'scout.html') : null;
  var current = pick ? (S.ui.qs('capsule') || '').toLowerCase() : '';
  var RETURN_NAMES = { 'scout.html': 'в расчёт бюджета', 'adept.html': 'в дизайн-проект', 'track.html': 'в управление ремонтом', 'project.html': 'в проект', 'account.html': 'в кабинет' };
  var backLabel = pick ? (RETURN_NAMES[returnTo.split('?')[0]] || 'назад') : '';

  if (pick) {
    document.title = 'Выберите капсулу — SOVEAPP';
    document.getElementById('caps-title').textContent = 'Выберите капсулу';
    document.getElementById('caps-crumb').textContent = 'Выбор капсулы';
    document.getElementById('caps-lead').textContent = 'Нажмите на карточку — вернём вас ' + backLabel + ' с выбранной капсулой. Расчёт и введённые данные сохранятся';
    var note = document.getElementById('caps-pick');
    note.hidden = false;
    note.innerHTML = '<span class="small">Вы выбираете капсулу для расчёта. Капсула «скоро» пока недоступна: у неё нет комплектации.</span>' +
      '<a class="btn btn--link" href="' + esc(returnTo) + '">Вернуться ' + esc(backLabel) + ' без выбора</a>';
    var next = document.getElementById('caps-next'); if (next) next.hidden = true;
  }

  /* ---------- три цифры под баннером, как на сайте ---------- */
  var ready = all.filter(function (c) { return !c.soon && c.pricePerM2; });
  var avg = ready.length ? Math.round(ready.reduce(function (a, c) { return a + c.pricePerM2; }, 0) / ready.length / 1000) : 0;
  var perCapsule = Math.round(D.products.filter(function (p) { return p.capsules && p.capsules.length; }).length / Math.max(1, ready.length));
  var fact = document.getElementById('caps-fact');
  if (fact) fact.innerHTML =
    '<div class="tm-num"><b>+1</b><span>новая капсула каждый месяц</span></div>' +
    '<div class="tm-num"><b>~' + avg + ' т.р.</b><span>средняя цена комплектации за м²</span></div>' +
    '<div class="tm-num"><b>~190</b><span>товаров в каждой капсуле</span></div>';

  /* ---------- фильтр по стилю ---------- */
  var styles = [];
  function collectStyles() { all.forEach(function (c) { if (c.style && styles.indexOf(c.style) < 0) styles.push(c.style); }); }
  collectStyles();
  var active = S.ui.qs('style'); if (styles.indexOf(active) < 0) active = '';
  var filterBox = document.getElementById('caps-filter'), countBox = document.getElementById('caps-count');

  function renderFilter() {
    var chips = [{ key: '', label: 'Все', n: all.length }].concat(styles.map(function (s) { return { key: s, label: s, n: all.filter(function (c) { return c.style === s; }).length }; }));
    filterBox.innerHTML = chips.map(function (ch) {
      var on = ch.key === active;
      return '<button type="button" class="chip' + (on ? ' is-active' : '') + '" aria-pressed="' + on + '" data-style="' + esc(ch.key) + '">' + esc(ch.label) + ' <i>' + ch.n + '</i></button>';
    }).join('');
  }

  /* ---------- карточки ---------- */
  /* сама карточка — единая SOVE.ui.capCard (cap-card.js), как в «Расчёте ремонта» (Вика 03.11): фото, название, стиль,
     палитра, «от N ₽/м²»; на телефоне одна в ряд — крупная (l). Строка ссылок и строка выбора — прежние, под карточкой */
  function card(c) {
    if (pick) {
      if (c.soon) {
        return '<div class="cap-card">' + S.ui.capCard(c, { tag: 'div', size: 'l', off: true, attrs: { 'aria-disabled': 'true' } }) +
          '<div class="cap-card__pickline"><span class="small muted">Выбрать пока нельзя — капсула готовится</span></div></div>';
      }
      var isCur = c.id === current, href = withCapsule(returnTo, c.id);
      return '<div class="cap-card">' + S.ui.capCard(c, { href: href, size: 'l', on: isCur, label: 'Выбрать капсулу «' + c.name + '»' }) +
        '<div class="cap-card__pickline">' + (isCur ? '<span class="small muted">Выбрана сейчас</span>' : '<span></span>') +
        '<a class="arrow-link" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">Выбрать</a></div></div>';
    }
    var view = 'capsule.html?id=' + c.id;
    return '<article class="cap-card">' + S.ui.capCard(c, { href: view, size: 'l', off: false }) +
      '<div class="cap-card__links"><a class="btn btn--link" href="' + view + '" aria-label="Смотреть капсулу «' + esc(c.name) + '»">Смотреть</a>' +
      (c.soon ? '<span class="small muted">расчёт появится позже</span>' : '<a class="arrow-link" href="scout.html?capsule=' + c.id + '" aria-label="Рассчитать ремонт с капсулой «' + esc(c.name) + '»">Рассчитать</a>') + '</div></article>';
  }

  function renderGrid() {
    var list = all.filter(function (c) { return !active || c.style === active; });
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="empty__title">В этом стиле капсул пока нет</span><span class="small muted">Посмотрите остальные — их можно адаптировать под себя в дизайн-проекте.</span><button type="button" class="btn btn--ghost btn--sm" data-style="">Показать все капсулы</button></div>';
    } else { grid.innerHTML = list.map(card).join(''); }
    countBox.textContent = active ? ('Показано ' + list.length + ' из ' + all.length) : (all.length + ' ' + plural(all.length, 'капсула', 'капсулы', 'капсул'));
  }

  function setStyle(s) {
    active = styles.indexOf(s) >= 0 ? s : '';
    try { var q = new URLSearchParams(location.search); if (active) q.set('style', active); else q.delete('style'); var qs = q.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
    renderFilter(); renderGrid();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-style]') : null;
    if (!b) return;
    var key = b.getAttribute('data-style');
    setStyle(key);
    var again = filterBox.querySelector('[data-style="' + (window.CSS && CSS.escape ? CSS.escape(active) : active) + '"]'); if (again) again.focus();
  });

  /* новая капсула или цена пришли с сервера, пока страница открывалась (data.js) */
  window.addEventListener('sove:capsules', function () { all = D.capsules.slice(); collectStyles(); renderFilter(); renderGrid(); });

  renderFilter(); renderGrid();
})();
