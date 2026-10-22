/* Проект: шапка, смета Скаута, товары, генерации, следующие шаги, удаление */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('pr-root');
  var id = S.ui.qs('id');
  var leaving = false;

  /* гость → вход, вернём на этот же проект */
  if (!S.auth.require()) {
    root.innerHTML = '<section class="wrap wrap--narrow section stack stack--6"><div class="page-head"><span class="eyebrow">Проект</span><p class="h2">Переходим ко входу</p></div><p class="lead">Проекты открываются после входа по коду из SMS. После входа вернём вас сюда.</p><div class="row"><a class="btn btn--ghost" href="auth.html?returnTo=' + encodeURIComponent('project.html' + location.search) + '">Войти</a></div></section>';
    return;
  }

  var KIND = { photo: 'Поиск по фото', render: 'Поиск по рендеру' };
  var STATUS = { done: ['Готово', 'badge--green'], running: ['Идёт поиск', 'badge--accent'], empty: ['Ничего не найдено', 'badge--line'], error: ['Не получилось', 'badge--line'] };
  var LEVEL = { base: 'уровень «Базовый»', premium: 'уровень «Премиум»' };

  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }
  function count(n, forms) { return F.num(n) + ' ' + plural(n, forms); }
  function empty(title, text, actions) {
    return '<div class="empty"><span class="empty__title">' + title + '</span><p class="text small">' + text + '</p><div class="row">' + actions + '</div></div>';
  }
  function head(idAttr, title, side) {
    return '<div class="cab-section__head"><h2 class="h2" id="' + idAttr + '">' + title + '</h2>' + (side || '') + '</div>';
  }
  function projectGens(pr) {
    var ids = (pr.generationIds || []).slice();
    S.gens.list().forEach(function (g) { if (g.projectId === pr.id && ids.indexOf(g.id) < 0) ids.push(g.id); });
    return ids.map(function (gid) { return S.gens.get(gid); }).filter(Boolean).sort(function (a, b) { return b.ts - a.ts; });
  }

  /* ---------- не найден ---------- */
  function notFound() {
    document.title = 'Проект не найден — SOVEAPP';
    root.innerHTML = '<section class="wrap wrap--narrow section stack stack--6"><div class="page-head"><span class="eyebrow">Проект</span><h1 class="h1">Проект не найден</h1></div>' +
      '<p class="lead">Возможно, проект удалён или ссылка открыта в другом браузере: в прототипе проекты хранятся только там, где их создали. Токены и генерации на месте.</p>' +
      '<div class="row"><a class="btn btn--ghost" href="account.html#projects">К моим проектам</a><a class="btn btn--link" href="scout.html">Рассчитать ремонт заново</a></div></section>';
  }

  /* ---------- шапка ---------- */
  function headHtml(pr, c, area) {
    var capsFact = c
      ? '<div class="rule-top stack stack--2"><span class="mid-num">' + c.name + '</span><span class="tiny muted">' + esc(c.name) + '</span><div class="row"><a class="arrow-link" href="capsule.html?id=' + c.id + '">О капсуле</a>' + (pr.scout ? '' : '<button class="btn btn--link" type="button" data-capsule>Сменить</button>') + '</div></div>'
      : '<div class="rule-top stack stack--2"><span class="mid-num">Без капсулы</span><span class="tiny muted">Капсула задаёт стиль, материалы и цену комплектации</span><button class="btn btn--link" type="button" data-capsule>Выбрать капсулу</button></div>';
    var areaFact = area
      ? '<div class="rule-top stack stack--2"><span class="mid-num">' + F.area(area) + '</span><span class="tiny muted">' + (pr.scout ? 'площадь из расчёта Скаута' : 'площадь квартиры') + '</span></div>'
      : '<div class="rule-top stack stack--2"><span class="mid-num">Площадь не указана</span><span class="tiny muted">Появится после расчёта в Скауте</span></div>';
    var cap = [c ? c.name : null, area ? F.area(area) : null].filter(Boolean).join(' · ');
    return '<div class="wrap pr-crumbs"><nav class="crumbs" aria-label="Путь"><a href="account.html">Кабинет</a><span aria-hidden="true">/</span><a href="account.html#projects">Проекты</a><span aria-hidden="true">/</span><span>' + esc(pr.name) + '</span></nav></div>' +
      '<section class="wrap pr-head">' +
      '<div class="pr-head__text stack stack--6">' +
      '<div class="pr-head__title"><span class="eyebrow">Проект · создан ' + F.dateLong(pr.ts) + '</span><h1 class="h1">' + esc(pr.name) + '</h1><button class="btn btn--link" type="button" data-rename>Переименовать</button></div>' +
      '<div class="pr-facts">' + capsFact + areaFact + '</div>' +
      '</div>' +
      '<figure class="pr-head__pic stack stack--3">' + (c ? '<img src="' + c.cover + '" alt="Капсула ' + c.name + ': ' + esc(c.name) + '" width="1120" height="896">' : '<div class="hatch">Обложка появится, когда выберете капсулу</div>') +
      (cap ? '<figcaption class="dim"><span>' + cap + '</span></figcaption>' : '') + '</figure>' +
      '</section>';
  }

  /* ---------- смета ---------- */
  function estimateHtml(pr, c, area) {
    var s = pr.scout, scoutHref = 'scout.html?project=' + encodeURIComponent(pr.id) + (pr.capsuleId ? '&capsule=' + encodeURIComponent(pr.capsuleId) : '');
    if (!s) {
      return '<section class="wrap cab-section" id="estimate" aria-labelledby="est-title">' + head('est-title', 'Смета Скаута') +
        '<div class="est-cta"><div class="stack stack--3"><span class="h3">Сметы пока нет</span><p class="text small">Загрузите планировку — Скаут посчитает работы по этапам и комплектацию' + (c ? ' капсулы ' + c.name : '') + ' в ценах METOD и в рознице. Расчёт сохранится в этом проекте.</p></div>' +
        '<a class="btn btn--primary" href="' + scoutHref + '">Посчитать ремонт</a></div></section>';
    }
    var st = D.scout.states.filter(function (x) { return x.id === s.stateId; })[0];
    var gain = (s.kitRetail || 0) - (s.kitMetod || 0);
    var meta = [st ? st.name.toLowerCase() : null, LEVEL[s.level] || null, area ? F.area(area) : null].filter(Boolean).join(' · ');
    var max = Math.max.apply(null, D.scout.stages.map(function (x) { return x[1]; }));
    var stages = s.works ? '<div class="est__stages"><span class="eyebrow">Работы по этапам</span><ul>' + D.scout.stages.map(function (x) {
      return '<li><span>' + esc(x[0]) + ' <span class="muted num">· ' + x[1] + ' %</span></span><span class="num">' + F.rub(s.works * x[1] / 100) + '</span><span class="bar" aria-hidden="true"><i style="width:' + Math.round(x[1] / max * 100) + '%"></i></span></li>';
    }).join('') + '</ul></div>' : '';
    return '<section class="wrap cab-section" id="estimate" aria-labelledby="est-title">' + head('est-title', 'Смета Скаута', meta ? '<span class="small muted">' + esc(meta.charAt(0).toUpperCase() + meta.slice(1)) + '</span>' : '') +
      '<div class="est"><div class="est__main">' +
      '<div class="est__total"><span class="eyebrow">Бюджет ремонта</span><span class="big-num">' + F.rub(s.total || 0) + '</span>' + (area && s.total ? '<span class="small muted num">' + F.rub(s.total / area) + ' за м² · работы и комплектация</span>' : '') + '</div>' +
      '<ul class="rows">' +
      (s.works ? '<li><span>Работы' + (st ? ' · <span class="num">' + F.rub(st.rate) + '/м²</span>' : '') + '</span><span class="num">' + F.rub(s.works) + '</span></li>' : '') +
      (s.kitMetod ? '<li><span>Комплектация по ценам METOD</span><span class="num green">' + F.rub(s.kitMetod) + '</span></li>' : '') +
      (s.kitRetail ? '<li><span>Та же комплектация в рознице</span><span class="num strike muted">' + F.rub(s.kitRetail) + '</span></li>' : '') +
      (gain > 0 ? '<li><span>Экономия с METOD</span><span class="num green"><b>' + F.rub(gain) + '</b></span></li>' : '') +
      '</ul>' +
      (S.metod.active() ? '' : '<p class="small muted">Цены METOD действуют с подпиской. <a class="link" href="metod.html?returnTo=' + encodeURIComponent('project.html?id=' + pr.id) + '">Выбрать тариф</a></p>') +
      '<div class="est__foot"><a class="btn btn--ghost" href="' + scoutHref + '">Пересчитать</a><span class="tiny muted">Расчёт предварительный: точные объёмы даст дизайн-проект</span></div>' +
      '</div>' + stages + '</div></section>';
  }

  /* ---------- товары ---------- */
  function productsHtml(pr) {
    var marketHref = 'market.html' + (pr.capsuleId ? '?capsule=' + encodeURIComponent(pr.capsuleId) : '');
    var list = (pr.productIds || []).map(function (pid) { return D.product(pid); }).filter(Boolean);
    var body;
    if (!list.length) {
      body = empty('Товаров пока нет', 'Добавляйте товары из каталога и из результатов поиска SOVEAPP AI — здесь соберётся список с ценами METOD и итогом.',
        '<a class="btn btn--ghost" href="' + marketHref + '">' + (pr.capsuleId ? 'Товары капсулы в каталоге' : 'Перейти в каталог') + '</a>');
    } else {
      var m = 0, r = 0; list.forEach(function (p) { m += p.metod; r += p.retail; });
      body = '<div class="grid grid--4">' + list.map(function (p) {
        return '<div class="pr-item">' + S.ui.productCard(p) + '<button class="pr-item__remove" type="button" data-remove="' + p.id + '" aria-label="Убрать из проекта: ' + esc(p.name) + '">Убрать</button></div>';
      }).join('') + '</div>' +
        '<div class="pr-sum">' +
        '<div class="pr-sum__cell rule-top"><span class="mid-num green">' + F.rub(m) + '</span><span class="tiny muted">по ценам METOD · ' + count(list.length, ['товар', 'товара', 'товаров']) + '</span></div>' +
        '<div class="pr-sum__cell rule-top"><span class="mid-num strike muted">' + F.rub(r) + '</span><span class="tiny muted">в рознице</span></div>' +
        '<div class="pr-sum__cell rule-top"><span class="mid-num">' + F.rub(r - m) + '</span><span class="tiny muted">экономия с METOD</span></div>' +
        '</div><p class="tiny muted" style="margin-top:var(--s4)">Итог — за одну единицу каждого товара. Количество и метраж считает смета Скаута.</p>';
    }
    return '<section class="wrap cab-section" id="products" aria-labelledby="prod-title">' + head('prod-title', 'Товары в проекте', list.length ? '<a class="btn btn--link" href="' + marketHref + '">Добавить товары</a>' : '') + body + '</section>';
  }

  /* ---------- генерации ---------- */
  function genCard(g) {
    var st = STATUS[g.status] || STATUS.done;
    var note = !g.cost ? '' : g.status === 'done' ? 'списано ' + F.tokens(g.cost) : g.status === 'running' ? 'в резерве ' + F.tokens(g.cost) : 'токены возвращены';
    return '<a class="gen-card" href="generation.html?id=' + encodeURIComponent(g.id) + '">' +
      '<div class="gen-card__pic">' + (g.src ? '<img src="' + esc(g.src) + '" alt="' + esc(g.title || '') + '" loading="lazy">' : '') + '</div>' +
      '<div class="gen-card__body"><div class="gen-card__top"><span class="eyebrow">' + (KIND[g.kind] || 'Генерация') + '</span><span class="badge ' + st[1] + '">' + st[0] + '</span></div>' +
      '<span class="gen-card__title">' + esc(g.title || 'Без названия') + '</span>' +
      '<span class="gen-card__meta tiny muted">' + F.dateLong(g.ts) + (note ? ' · ' + note : '') + '</span></div></a>';
  }
  function gensHtml(pr) {
    var list = projectGens(pr);
    var body = list.length
      ? '<div class="grid grid--3 grid--gap-lg">' + list.map(genCard).join('') + '</div>'
      : empty('Генераций в проекте нет', 'Найдите мебель с фотографии или рендера и нажмите «Сохранить в проект» — результат появится здесь. Поиск по фото — ' + F.tokens(D.costs.photo) + ', по рендеру — ' + F.tokens(D.costs.render) + '.',
        '<a class="btn btn--ghost" href="ai.html">Найти товар по фото</a>');
    return '<section class="wrap cab-section" id="generations" aria-labelledby="gens-title">' + head('gens-title', 'Генерации проекта', list.length ? '<a class="btn btn--link" href="ai.html">Новый поиск</a>' : '') + body + '</section>';
  }

  /* ---------- дальше ---------- */
  function nextHtml(pr) {
    var q = '?project=' + encodeURIComponent(pr.id);
    var leads = S.leads.list().filter(function (l) { return l.projectId === pr.id; });
    function sent(product) { var l = leads.filter(function (x) { return x.product === product; })[0]; return l ? '<span class="badge badge--line">' + esc(l.status || 'Заявка принята') + ' · ' + F.dateLong(l.ts) + '</span>' : ''; }
    var pk = D.adept.packages.slice().sort(function (a, b) { return a.rate - b.rate; })[0];
    return '<section class="wrap cab-section" id="next" aria-labelledby="next-title">' + head('next-title', 'Дальше', '<span class="small muted">' + (pr.scout ? 'Расчёт передадим вместе с заявкой — заново вводить не придётся' : 'Сначала посчитайте ремонт — расчёт уйдёт вместе с заявкой') + '</span>') +
      '<div class="grid grid--2 grid--gap-lg">' +
      '<div class="next-card"><span class="next-card__n">3</span><h3 class="h3">Адепт · дизайн-проект</h3><p class="small muted">Дизайнер адаптирует капсулу под вашу квартиру: планировка, визуализации, чертежи.' + (pk ? ' От <span class="num">' + F.rub(pk.rate) + '/м²</span>, срок ' + esc(pk.term) + '.' : '') + '</p>' + sent('adept') +
      '<a class="btn ' + (pr.scout ? 'btn--primary' : 'btn--ghost') + '" href="adept.html' + q + '">Заказать дизайн-проект</a></div>' +
      '<div class="next-card"><span class="next-card__n">4</span><h3 class="h3">Трек · ремонт под ключ</h3><p class="small muted">Команда делает ремонт. Этапы, акты и оплаты видны в кабинете.</p>' + sent('track') +
      '<a class="btn btn--ghost" href="track.html' + q + '">Ремонт под ключ</a></div>' +
      '</div></section>';
  }

  /* ---------- окна ---------- */
  function rename(pr) {
    var m = S.ui.modal({ eyebrow: 'Проект', title: 'Переименовать', html: '<div class="field"><label for="rn-name">Название</label><input class="input" id="rn-name" maxlength="60" autocomplete="off" value="' + esc(pr.name) + '"><span class="field__error" id="rn-error" hidden>Введите название — по нему вы найдёте проект в кабинете.</span></div>',
      actions: [ { label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var input = api.el.querySelector('#rn-name'), name = input.value.trim();
        if (!name) { input.closest('.field').classList.add('is-error'); api.el.querySelector('#rn-error').hidden = false; input.focus(); return; }
        api.close(); if (name !== pr.name) { S.projects.update(pr.id, { name: name }); S.ui.toast('Название сохранено', 'ok'); }
      } }, { label: 'Отмена', kind: 'ghost' } ] });
    var input = m.el.querySelector('#rn-name'); input.select();
    input.addEventListener('input', function () { input.closest('.field').classList.remove('is-error'); m.el.querySelector('#rn-error').hidden = true; });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); m.el.querySelector('.modal__actions .btn').click(); } });
  }
  function pickCapsule(pr) {
    var caps = D.capsules.filter(function (c) { return !c.soon; });
    var html = '<fieldset class="cap-pick"><legend>Капсула проекта</legend><div class="cap-pick__grid">' +
      caps.map(function (c) { var on = c.id === pr.capsuleId; return '<label class="cap-pick__item' + (on ? ' is-active' : '') + '"><input type="radio" name="pc-capsule" value="' + c.id + '"' + (on ? ' checked' : '') + '><img src="' + c.cover + '" alt=""><span>' + c.name + '<small>' + esc(c.style) + '</small></span></label>'; }).join('') +
      '</div></fieldset><p class="small muted">Капсулу можно поменять, пока нет сметы. После расчёта она меняется через «Пересчитать».</p>';
    var m = S.ui.modal({ eyebrow: 'Проект', title: 'Выберите капсулу', html: html, actions: [
      { label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var picked = api.el.querySelector('input[name="pc-capsule"]:checked');
        if (!picked) { S.ui.toast('Выберите одну из капсул', 'error'); return; }
        api.close(); S.projects.update(pr.id, { capsuleId: picked.value }); S.ui.toast('Капсула ' + D.capsule(picked.value).code + ' сохранена в проекте', 'ok');
      } }, { label: 'Отмена', kind: 'ghost' } ] });
    m.el.querySelectorAll('input[name="pc-capsule"]').forEach(function (r) {
      r.addEventListener('change', function () { m.el.querySelectorAll('.cap-pick__item').forEach(function (l) { l.classList.toggle('is-active', l.contains(r) && r.checked); }); });
    });
  }
  function removeProject(pr) {
    S.ui.confirm({ title: 'Удалить проект «' + pr.name + '»?', text: 'Смета и список товаров проекта удалятся. Генерации останутся в общей ленте, токены не меняются. Вернуть проект будет нельзя.', ok: 'Удалить проект',
      onOk: function () {
        leaving = true;
        S.gens.list().forEach(function (g) { if (g.projectId === pr.id) S.gens.update(g.id, { projectId: null }); });
        S.projects.remove(pr.id);
        location.href = 'account.html#projects';
      } });
  }

  /* ---------- сборка ---------- */
  function render() {
    if (leaving || !S.auth.isIn()) return;
    var pr = id ? S.projects.get(id) : null;
    if (!pr) { notFound(); return; }
    try {
      var c = D.capsule(pr.capsuleId), area = pr.area || (pr.scout && pr.scout.area) || null;
      document.title = pr.name + ' — проект — SOVEAPP';
      root.innerHTML = headHtml(pr, c, area) + estimateHtml(pr, c, area) + productsHtml(pr) + gensHtml(pr) + nextHtml(pr) +
        '<section class="wrap cab-section"><div class="pr-danger rule-top"><span class="small muted">Проект хранит смету, товары и генерации одной квартиры.</span><button class="btn btn--link" type="button" data-delete>Удалить проект</button></div></section>';
    } catch (e) {
      console.error(e);
      root.innerHTML = '<section class="wrap wrap--narrow section"><div class="error-screen"><h1 class="h3">Не удалось открыть проект</h1><p class="text">Данные проекта на месте, токены не списывались. Обновите страницу или вернитесь в кабинет.</p><div class="row"><button class="btn btn--ghost" type="button" onclick="location.reload()">Обновить страницу</button><a class="btn btn--link" href="account.html#projects">В кабинет</a></div></div></section>';
      return;
    }
    root.querySelector('[data-rename]').addEventListener('click', function () { rename(pr); });
    root.querySelector('[data-delete]').addEventListener('click', function () { removeProject(pr); });
    root.querySelectorAll('[data-capsule]').forEach(function (b) { b.addEventListener('click', function () { pickCapsule(pr); }); });
    root.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pid = Number(b.getAttribute('data-remove')), p = D.product(pid);
        S.projects.update(pr.id, { productIds: (pr.productIds || []).filter(function (x) { return Number(x) !== pid; }) });
        S.ui.toast('Убрали из проекта' + (p ? ': ' + p.name : ''));
      });
    });
  }

  render();
  S.onChange(render);
})();
