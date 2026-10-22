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
  var RETURN_NAMES = { 'scout.html': 'в Скаут', 'adept.html': 'в Адепт', 'track.html': 'в Трек', 'project.html': 'в проект', 'account.html': 'в кабинет' };
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
  all.forEach(function (c) { if (styles.indexOf(c.style) < 0) styles.push(c.style); });
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
  function priceRow(c) {
    return c.soon || !c.pricePerM2
      ? '<p class="cap-card__price"><span class="tiny muted">комплектация</span><span class="small muted">собирается</span></p>'
      : '<p class="cap-card__price"><span class="tiny muted">комплектация от</span><span class="mid-num">' + F.rub(c.pricePerM2) + '/м²</span></p>';
  }
  function picHtml(c) {
    return '<img src="' + esc(c.cover) + '" alt="Интерьер капсулы ' + esc(c.code) + ': ' + esc(c.style.toLowerCase()) + '" loading="lazy" width="960" height="1200">' +
      (c.soon ? '<span class="badge badge--line cap-card__soon">скоро</span>' : '') +
      '<span class="cap-card__code" aria-hidden="true">' + esc(c.code) + '</span>';
  }
  function bodyHtml(c) {
    return '<div class="cap-card__body"><span class="eyebrow">' + esc(c.style) + '</span>' +
      '<h2 class="cap-card__name"><span class="vh">' + esc(c.code) + '. </span>' + esc(c.name) + '</h2>' + priceRow(c) + '</div>';
  }
  function card(c) {
    if (pick) {
      if (c.soon) {
        return '<div class="cap-card is-off" aria-disabled="true"><div class="cap-card__pic">' + picHtml(c) + '</div>' + bodyHtml(c) +
          '<div class="cap-card__pickline"><span class="small muted">Выбрать пока нельзя — капсула готовится</span></div></div>';
      }
      var isCur = c.id === current;
      return '<a class="cap-card cap-card--pick' + (isCur ? ' is-current' : '') + '" href="' + esc(withCapsule(returnTo, c.id)) + '" aria-label="Выбрать капсулу ' + esc(c.code) + ' · ' + esc(c.name) + '">' +
        '<div class="cap-card__pic">' + picHtml(c) + '</div>' + bodyHtml(c) +
        '<div class="cap-card__pickline">' + (isCur ? '<span class="small muted">Выбрана сейчас</span>' : '<span></span>') + '<span class="arrow-link">Выбрать ' + esc(c.code) + '</span></div></a>';
    }
    var view = 'capsule.html?id=' + c.id;
    return '<article class="cap-card">' +
      '<a class="cap-card__pic" href="' + view + '" tabindex="-1" aria-hidden="true">' + picHtml(c) + '</a>' + bodyHtml(c) +
      '<div class="cap-card__links"><a class="btn btn--link" href="' + view + '" aria-label="Смотреть капсулу ' + esc(c.code) + '">Смотреть</a>' +
      (c.soon ? '<span class="small muted">расчёт появится позже</span>' : '<a class="arrow-link" href="scout.html?capsule=' + c.id + '" aria-label="Рассчитать ремонт с капсулой ' + esc(c.code) + '">Рассчитать</a>') + '</div></article>';
  }

  function renderGrid() {
    var list = all.filter(function (c) { return !active || c.style === active; });
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="empty__title">В этом стиле капсул пока нет</span><span class="small muted">Посмотрите остальные — их можно адаптировать под себя в Адепте.</span><button type="button" class="btn btn--ghost btn--sm" data-style="">Показать все капсулы</button></div>';
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

  renderFilter(); renderGrid();
})();
