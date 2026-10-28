/* Кабинет: сводка, незавершённое, проекты, генерации, избранное, доступы и заявки, история токенов */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  function $(id) { return document.getElementById(id); }

  /* гость → вход, после кода вернём сюда — в тот же раздел (#leads, #projects, #tokens, #favorites) */
  if (!S.auth.require('account.html' + (/^#[\w-]+$/.test(location.hash) ? location.hash : ''))) { $('acc').hidden = true; $('acc-guest').hidden = false; return; }

  var KIND = { photo: 'Поиск по фото', render: 'Поиск по рендеру' };
  var STATUS = { done: ['Готово', 'badge--green'], running: ['Идёт поиск', 'badge--accent'], empty: ['Ничего не найдено', 'badge--line'], error: ['Не получилось', 'badge--line'] };
  var LEAD = { adept: 'Дизайн-проект', track: 'Ремонт под ключ', partner: 'Партнёрство' };
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
  var PLUS = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4v32M4 20h32"/></svg>';
  var PAY = { paid: ['Оплачен', 'badge--green'], pending: ['Ожидает оплаты', 'badge--line'], failed: ['Отказ банка', 'badge--line'] };
  var PAY_LIMIT = 5;
  var historyOpen = false, paymentsOpen = false, firstRender = true;

  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? forms[2] : b === 1 ? forms[0] : (b >= 2 && b <= 4) ? forms[1] : forms[2]; }
  function count(n, forms) { return F.num(n) + ' ' + plural(n, forms); }
  function time(ts) { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function empty(title, text, actions) {
    return '<div class="empty"><span class="empty__title">' + title + '</span><p class="text small">' + text + '</p><div class="row">' + actions + '</div></div>';
  }
  function projectGens(pr) {
    var ids = (pr.generationIds || []).slice();
    S.gens.list().forEach(function (g) { if (g.projectId === pr.id && ids.indexOf(g.id) < 0) ids.push(g.id); });
    return ids.filter(function (id) { return !!S.gens.get(id); });
  }

  /* ---------- шапка ---------- */
  function renderHead() {
    var u = S.auth.user();
    var how = u.kind === 'tg' ? 'через Telegram'
      : u.kind === 'email' ? 'по почте ' + u.email
      : 'по номеру ' + F.phone(u.phone);
    $('acc-eyebrow').textContent = S.auth.label();
    $('acc-who').textContent = 'Вы вошли ' + how;
    var sub = $('acc-sub'), on = S.metod.active();
    if (sub) { sub.innerHTML = '<i class="dot"></i>' + (on ? 'METOD активен до ' + F.dateLong(S.metod.until()) : 'Подписка METOD не оформлена'); sub.classList.toggle('is-on', on); }
    var id = $('acc-id'); if (id) id.setAttribute('aria-label', on ? 'Подписка METOD: продлить' : 'Оформить подписку METOD');
    var n = counts();
    document.querySelectorAll('#acc [data-n]').forEach(function (el) { var v = n[el.getAttribute('data-n')] || 0; el.textContent = v ? String(v) : ''; el.hidden = !v; });
    document.querySelectorAll('#acc [data-v]').forEach(function (el) { var k = el.getAttribute('data-v'); el.textContent = k === 'tokens' ? F.tokens(S.tokens.balance()) : k === 'metod' ? (on ? 'до ' + F.dateLong(S.metod.until()) : 'не оформлена') : ''; });
  }
  /* корзина и заказы живут в orders.js (здесь не подключён) — читаем его хранилище напрямую, как site.js для бейджа */
  function ordersState() { try { return JSON.parse(localStorage.getItem('sove.proto.orders.v1') || '{}'); } catch (e) { return {}; } }
  function counts() {
    var o = ordersState();
    return { projects: S.projects.list().length, generations: S.gens.list().length, favorites: S.favs.list().length, leads: S.leads.list().length,
      basket: (o.basket || []).length, orders: (o.orders || []).filter(function (x) { return !/^(received|cancelled|return|done)$/.test(x.status); }).length };
  }

  /* ---------- меню профиля: группы строк; разделы с подробностями переезжают под свою строку и раскрываются по тапу ---------- */
  var IC = {
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', cart: '<path d="M3 4h2l2.5 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', img: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="9" cy="9" r="1.5"/>', heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h3.2a1.8 1.8 0 0 1 0 3.6H9.5M9.5 13.1h3.7a1.8 1.8 0 0 1 0 3.6H9.5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
    crown: '<path d="M3 17l2-10 5 5 2-7 2 7 5-5 2 10zM3 20h18"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.1-2.1z"/>', store: '<path d="M4 10l1-5h14l1 5M4 10h16v10H4zM4 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M10 20v-5h4v5"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'
  };
  function ic(n) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  /* [иконка, подпись, ссылка или #раздел, ключ счётчика, ключ значения] */
  var GROUPS = [
    ['Ремонт', [['home', 'Мой ремонт', 'my.html'], ['box', 'Заказы', 'my.html?v=orders', 'orders'], ['cart', 'Корзина', 'my.html?v=basket', 'basket'], ['doc', 'Проекты', '#projects', 'projects'], ['img', 'Генерации', '#generations', 'generations'], ['heart', 'Избранное', '#favorites', 'favorites']]],
    ['Токены и подписка', [['coin', 'Токены', 'tokens.html?returnTo=account.html', null, 'tokens'], ['list', 'История токенов', '#tokens'], ['crown', 'Подписка METOD', 'metod.html?returnTo=account.html', null, 'metod'], ['shield', 'Доступы и заявки', '#leads', 'leads']]],
    ['Ещё', [['chat', 'Чаты', 'chats.html'], ['tool', 'На заказ', 'custom-order.html'], ['store', 'Кабинет поставщика', 'partner-cabinet.html']  /* точка входа поставщика по хендоффу дизайнера 21.10 — из профиля, без шестой вкладки */, ['users', 'ЛК команды', 'team.html']]]
  ];
  function buildMenu() {
    var host = $('acc-menu'); if (!host || host.children.length) return;
    host.innerHTML = GROUPS.map(function (g) {
      return '<div class="acc-group"><span class="acc-group__t">' + g[0] + '</span>' + g[1].map(function (r) {
        var fold = r[2].charAt(0) === '#', tag = fold ? 'button' : 'a';
        var attrs = fold ? ' type="button" data-fold="' + r[2].slice(1) + '" aria-expanded="false" aria-controls="' + r[2].slice(1) + '"' : ' href="' + r[2] + '"';
        return '<' + tag + ' class="acc-row"' + attrs + '><span class="acc-row__ic">' + ic(r[0]) + '</span><span class="acc-row__l">' + r[1] + '</span>' +
          (r[4] ? '<span class="acc-row__v" data-v="' + r[4] + '"></span>' : '') + (r[3] ? '<span class="acc-row__n" data-n="' + r[3] + '" hidden></span>' : '') + '<span class="acc-chev" aria-hidden="true">›</span></' + tag + '>';
      }).join('') + '</div>';
    }).join('');
    host.querySelectorAll('[data-fold]').forEach(function (b) {
      var sec = $(b.getAttribute('data-fold')); if (sec) b.insertAdjacentElement('afterend', sec);
      b.addEventListener('click', function () { openFold(b.getAttribute('data-fold')); });
    });
  }
  function openFold(id, force) {
    var sec = $(id), b = document.querySelector('[data-fold="' + id + '"]'); if (!sec) return;
    var open = force ? true : sec.hidden; sec.hidden = !open; if (b) b.setAttribute('aria-expanded', String(open));
    if (open && force && b) b.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- незавершённое ---------- */
  function renderPending() {
    var out = [];
    var d = S.draft.get('scout');
    if (d && typeof d === 'object' && !(Number(d.step) >= 5)) {
      var bits = [], c = D.capsule(d.capsuleId || d.capsule);
      if (Number(d.step) > 0) bits.push('шаг ' + Number(d.step) + ' из 5');
      if (c) bits.push('капсула «' + c.name + '»');
      if (Number(d.area) > 0) bits.push(F.area(Number(d.area)));
      out.push('<div class="notice"><div class="stack"><b>Расчёт бюджета не закончен</b><span class="small muted">' + (bits.length ? esc(bits.join(' · ')) + '. ' : '') + 'Введённые данные сохранены, продолжите с того же места.</span></div><a class="btn btn--dark btn--sm" href="scout.html">Продолжить</a></div>');
    }
    S.pay.list().filter(function (p) { return p.status === 'pending'; }).forEach(function (p) {
      var it = p.item || {};
      out.push('<div class="notice"><div class="stack"><b>Оплата не завершена</b><span class="small muted">' + esc(it.title || 'Заказ') + (it.price ? ' · <span class="num">' + F.rub(it.price) + '</span>' : '') + '. Деньги не списаны. Вернитесь к оплате или выберите другое.</span></div><a class="btn btn--dark btn--sm" href="pay.html?id=' + encodeURIComponent(p.id) + '">Вернуться к оплате</a></div>');
    });
    S.gens.list().filter(function (g) { return g.status === 'running'; }).forEach(function (g) {
      out.push('<div class="notice"><div class="stack"><b>Поиск ещё идёт</b><span class="small muted">' + esc(g.title || KIND[g.kind] || 'Генерация') + (g.cost ? ' · в резерве ' + F.tokens(g.cost) : '') + '. Если ничего не найдём, токены вернутся.</span></div><a class="btn btn--dark btn--sm" href="ai.html">Открыть</a></div>');
    });
    var box = $('acc-pending'); box.innerHTML = out.join(''); box.hidden = !out.length;
  }

  /* ---------- три цифры: токены · проекты · избранное (подробности — по строкам ниже) ---------- */
  function renderSummary() {
    var bal = S.tokens.balance(), exp = S.tokens.giftExpires(), gift = S.tokens.history().filter(function (o) { return o.type === 'gift'; })[0], n = counts();
    $('acc-summary').innerHTML =
      '<a class="acc-stat" href="tokens.html?returnTo=account.html" aria-label="Баланс: ' + F.tokens(bal) + '"><b>' + F.num(bal) + '</b><span>' + F.tokens(bal).replace(/^[\d\s−-]+/, '') + '</span></a>' +
      '<button type="button" class="acc-stat" data-open="projects"><b>' + n.projects + '</b><span>' + plural(n.projects, ['проект', 'проекта', 'проектов']) + '</span></button>' +
      '<button type="button" class="acc-stat" data-open="favorites"><b>' + n.favorites + '</b><span>в избранном</span></button>';
    var note = $('acc-note'), t = '';
    if (gift && exp && exp > Date.now()) t = 'Подарочные ' + F.tokens(gift.amount) + ' сгорят ' + F.dateLong(exp) + ', если их не потратить.';
    if (note) { note.textContent = t; note.hidden = !t; }
    $('acc-summary').querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openFold(b.getAttribute('data-open'), true); }); });
  }

  /* ---------- проекты ---------- */
  function projectCard(pr) {
    var c = D.capsule(pr.capsuleId), gn = projectGens(pr).length, pn = (pr.productIds || []).length;
    var area = pr.area || (pr.scout && pr.scout.area);
    var meta = [c ? c.name : 'Капсула не выбрана', area ? F.area(area) : null].filter(Boolean).join(' · ');
    return '<a class="pr-card" href="project.html?id=' + encodeURIComponent(pr.id) + '">' +
      '<div class="pr-card__pic">' + (c ? '<img src="' + c.cover + '" alt="Капсула ' + c.code + ': ' + esc(c.name) + '" loading="lazy"><span class="pr-card__code">' + c.code + '</span>' : '<span class="pr-card__nocap">капсула не выбрана</span>') + '</div>' +
      '<div class="pr-card__body"><span class="pr-card__name">' + esc(pr.name) + '</span>' +
      '<span class="small muted num">' + meta + '</span>' +
      (pr.scout && pr.scout.total ? '<span class="small">Смета ремонта: <span class="num">' + F.rub(pr.scout.total) + '</span></span>' : '<span class="small muted">Сметы пока нет</span>') +
      '<div class="pr-card__badges"><span class="badge badge--line">' + count(gn, ['генерация', 'генерации', 'генераций']) + '</span><span class="badge badge--line">' + count(pn, ['товар', 'товара', 'товаров']) + '</span></div>' +
      '</div></a>';
  }
  function renderProjects() {
    var list = S.projects.list().sort(function (a, b) { return b.ts - a.ts; }), box = $('acc-projects');
    $('acc-projects-note').textContent = list.length ? 'В проекте собираются смета, товары и генерации' : '';
    if (!list.length) {
      box.innerHTML = empty('Проектов пока нет', 'Проект — это одна квартира: в нём собираются смета ремонта, выбранные товары и генерации.',
        '<button class="btn btn--ghost" type="button" data-new-project>Создать проект</button><a class="btn btn--link" href="scout.html">Начать с расчёта бюджета</a>');
    } else {
      box.innerHTML = '<div class="grid grid--3 grid--gap-lg">' + list.map(projectCard).join('') +
        '<button class="pr-new" type="button" data-new-project>' + PLUS + '<span class="pr-new__title">Новый проект</span><span class="small muted">Название и капсула — остальное добавите позже</span></button></div>';
    }
    box.querySelectorAll('[data-new-project]').forEach(function (b) { b.addEventListener('click', newProject); });
  }
  function newProject() {
    var caps = D.capsules.filter(function (c) { return !c.soon; });
    var html = '<div class="field"><label for="np-name">Название</label><input class="input" id="np-name" maxlength="60" autocomplete="off" placeholder="Например, квартира на Лесной"><span class="field__error" id="np-error" hidden>Введите название — по нему вы найдёте проект в кабинете.</span></div>' +
      '<fieldset class="cap-pick"><legend>Капсула</legend><div class="cap-pick__grid">' +
      caps.map(function (c) { return '<label class="cap-pick__item"><input type="radio" name="np-capsule" value="' + c.id + '"><img src="' + c.cover + '" alt=""><span>' + c.code + '<small>' + esc(c.style) + '</small></span></label>'; }).join('') +
      '<label class="cap-pick__item is-active"><input type="radio" name="np-capsule" value="" checked><i class="cap-pick__none"></i><span>Пока без капсулы<small>выберу позже</small></span></label>' +
      '</div></fieldset>';
    var m = S.ui.modal({ eyebrow: 'Кабинет', title: 'Новый проект', html: html, actions: [
      { label: 'Создать проект', kind: 'primary', close: false, onClick: function (ev, api) {
        var input = api.el.querySelector('#np-name'), name = input.value.trim();
        if (!name) { input.closest('.field').classList.add('is-error'); api.el.querySelector('#np-error').hidden = false; input.focus(); return; }
        var picked = api.el.querySelector('input[name="np-capsule"]:checked');
        var pr = S.projects.create({ name: name, capsuleId: picked && picked.value ? picked.value : null });
        api.close(); location.href = 'project.html?id=' + encodeURIComponent(pr.id);
      } },
      { label: 'Отмена', kind: 'ghost' } ] });
    m.el.querySelectorAll('input[name="np-capsule"]').forEach(function (r) {
      r.addEventListener('change', function () { m.el.querySelectorAll('.cap-pick__item').forEach(function (l) { l.classList.toggle('is-active', l.contains(r) && r.checked); }); });
    });
    var nameInput = m.el.querySelector('#np-name');
    nameInput.addEventListener('input', function () { nameInput.closest('.field').classList.remove('is-error'); m.el.querySelector('#np-error').hidden = true; });
    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); m.el.querySelector('.modal__actions .btn').click(); } });
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
  function renderGens() {
    var list = S.gens.list(), box = $('acc-gens');
    $('acc-gens-all').hidden = false;            /* вход в список генераций нужен и когда их ещё нет */
    $('acc-gens-all').textContent = list.length > 3 ? 'Все генерации · ' + list.length : 'Все генерации';
    box.innerHTML = list.length
      ? '<div class="grid grid--3 grid--gap-lg">' + list.slice(0, 3).map(genCard).join('') + '</div>'
      : empty('Генераций пока нет', 'Загрузите фотографию предмета или рендер комнаты — найдём такие же и похожие товары в каталоге. Поиск по фото — ' + F.tokens(D.costs.photo) + ', по рендеру — ' + F.tokens(D.costs.render) + '.',
        '<a class="btn btn--ghost" href="ai.html">Найти товар по фото</a>');
  }

  /* ---------- избранное ---------- */
  function renderFavs() {
    var list = S.favs.list().map(function (id) { return D.product(id); }).filter(Boolean), box = $('acc-favs');
    $('acc-favs-more').hidden = !list.length;
    box.innerHTML = list.length
      ? '<div class="grid grid--4">' + list.map(function (p) { return '<div class="fav-item">' + S.ui.productCard(p) + '<button class="fav-item__btn" type="button" data-unfav="' + p.id + '" aria-label="Убрать из избранного: ' + esc(p.name) + '">' + HEART + '</button></div>'; }).join('') + '</div>'
      : empty('В избранном пусто', 'Отмечайте товары сердцем в каталоге и в результатах поиска — они соберутся здесь, с ценой METOD и розницей.',
        '<a class="btn btn--ghost" href="market.html">Перейти в каталог</a>');
    box.querySelectorAll('[data-unfav]').forEach(function (b) {
      b.addEventListener('click', function () { var id = Number(b.getAttribute('data-unfav')); S.favs.toggle(id); S.ui.toast('Убрали из избранного'); });
    });
  }

  /* ---------- доступы и заявки ---------- */
  function renderLeads() {
    var rows = [];
    if (S.metod.active()) {
      rows.push('<li><div class="stack"><span>Подписка METOD</span><span class="tiny muted">Контакты всех поставщиков открыты · до ' + F.dateLong(S.metod.until()) + '</span></div><span class="badge badge--green">Активна</span></li>');
    } else {
      rows.push('<li><div class="stack"><span>Подписка METOD</span><span class="tiny muted">Открывает контакты всех поставщиков и цены METOD</span></div><a class="link small" href="metod.html?returnTo=account.html">Выбрать тариф</a></li>');
      D.products.filter(function (p) { return S.metod.hasContact(p.id); }).forEach(function (p) {
        rows.push('<li><div class="stack"><span>Контакт поставщика</span><span class="tiny muted">' + esc(p.name) + '</span></div><a class="link small" href="product.html?id=' + p.id + '">Открыть</a></li>');
      });
    }
    /* выданные расчёты расчёта: оплаченный или бесплатный расчёт можно открыть снова, даже если его не сохранили в проект */
    var levels = (D.scoutAccess && D.scoutAccess.levels) || [];
    S.scout.requests().forEach(function (r) {
      var p = r.params || {}, c = D.capsule(p.capsuleId), lv = levels.filter(function (l) { return l.id === p.level; })[0];
      var bits = [];
      if (c) bits.push(c.name);
      if (lv) bits.push(lv.name);
      if (Number(p.area) > 0) bits.push(F.area(Number(p.area)));
      bits.push(S.scout.basisLabel(r.basis));
      rows.push('<li><div class="stack"><span>Расчёт бюджета · <span class="num">заявка № ' + esc(r.number) + '</span></span><span class="tiny muted">' + esc(bits.join(' · ')) + ' · <span class="num">' + F.dateLong(r.ts) + '</span></span></div>' +
        '<a class="link small" href="scout.html?request=' + encodeURIComponent(r.id) + '" aria-label="Открыть расчёт бюджета, заявка № ' + esc(r.number) + '">Открыть расчёт</a></li>');
    });
    var leads = S.leads.list();
    var leadsHtml = leads.length
      ? '<ul class="rows">' + leads.map(function (l) {
          var pr = l.projectId ? S.projects.get(l.projectId) : null;
          return '<li><div class="stack"><span>' + (LEAD[l.product] || 'Заявка') + '</span><span class="tiny muted num">' + F.dateLong(l.ts) + (pr ? ' · проект «' + esc(pr.name) + '»' : '') + '</span></div><span class="badge badge--line">' + esc(l.status || 'Заявка принята') + '</span></li>';
        }).join('') + '</ul>'
      : '<div class="empty"><span class="empty__title">Заявок пока нет</span><p class="text small">Когда вы оставите заявку на дизайн-проект, ремонт под ключ или партнёрство, здесь появится её статус.</p><div class="row"><a class="arrow-link" href="adept.html">О дизайн-проекте</a><a class="arrow-link" href="track.html">Об управлении ремонтом</a></div></div>';
    $('acc-leads').innerHTML =
      '<div class="col-6 acc-list rule-top"><h3 class="h4 acc-list__title">Доступы</h3><ul class="rows">' + rows.join('') + '</ul></div>' +
      '<div class="col-6 acc-list rule-top"><h3 class="h4 acc-list__title">Заявки</h3>' + leadsHtml + '</div>' + paymentsHtml();
    var more = $('acc-pay-more'); if (more) more.addEventListener('click', function () { paymentsOpen = true; renderLeads(); });
  }

  /* платежи в рублях: видно, что прошло, что ждёт оплаты, а где банк отказал и деньги не списаны. Нет платежей — блока нет */
  function paymentsHtml() {
    var list = S.pay.list().filter(function (p) { return p && p.item; });
    if (!list.length) return '';
    var shown = paymentsOpen ? list : list.slice(0, PAY_LIMIT);
    return '<div class="acc-list acc-list--wide rule-top" id="payments"><h3 class="h4 acc-list__title">Платежи</h3><ul class="rows">' + shown.map(function (p) {
      var it = p.item, st = PAY[p.status] || ['Не прошёл', 'badge--line'];
      var note = p.status === 'paid' ? '' : p.status === 'pending' ? ' · деньги не списаны, оплату можно завершить' : ' · деньги не списаны';
      var href = 'pay.html?id=' + encodeURIComponent(p.id);
      var link = p.status === 'paid' ? '' : '<a class="link small" href="' + href + '" aria-label="' + (p.status === 'pending' ? 'Вернуться к оплате' : 'Повторить оплату') + ': ' + esc(it.title || 'заказ') + '">' + (p.status === 'pending' ? 'Вернуться к оплате' : 'Повторить') + '</a>';
      return '<li><div class="stack"><span>' + esc(it.title || 'Заказ') + (it.price ? ' · <span class="num">' + F.rub(it.price) + '</span>' : '') + '</span>' +
        '<span class="tiny muted"><span class="num">' + F.dateLong(p.paidAt || p.ts) + ' · ' + time(p.paidAt || p.ts) + '</span>' + note + '</span></div>' +
        '<div class="acc-pay__side"><span class="badge ' + st[1] + '">' + st[0] + '</span>' + link + '</div></li>';
    }).join('') + '</ul>' +
      (list.length > PAY_LIMIT && !paymentsOpen ? '<div><button class="btn btn--link" type="button" id="acc-pay-more">Показать все платежи · ' + list.length + '</button></div>' : '') + '</div>';
  }

  /* ---------- история токенов: остаток считаем нарастающим итогом ---------- */
  function renderHistory() {
    var box = $('acc-history');
    var asc = S.tokens.history().map(function (o, i) { return [o, i]; }).sort(function (a, b) { return a[0].ts - b[0].ts || a[1] - b[1]; });
    if (!asc.length) {
      box.innerHTML = empty('Операций пока нет', 'Здесь появятся пополнения, списания за поиск и возвраты. Если поиск ничего не нашёл или сорвался, токены возвращаются автоматически.',
        '<a class="btn btn--ghost" href="tokens.html?returnTo=account.html">Пополнить баланс</a>');
      return;
    }
    var run = 0, rows = asc.map(function (x) { run += x[0].amount; return { op: x[0], after: run }; }).reverse();
    var LIMIT = 8, shown = historyOpen ? rows : rows.slice(0, LIMIT);
    box.innerHTML = '<table class="hist"><thead><tr><th scope="col">Дата</th><th scope="col">Операция</th><th scope="col" class="right">Изменение</th><th scope="col" class="right">Остаток</th></tr></thead><tbody>' +
      shown.map(function (r) {
        var op = r.op, plus = op.amount > 0;
        var note = op.type === 'reserve' ? 'в резерве до конца поиска' : op.refunded ? 'возвращено' : (op.type === 'gift' && op.expires) ? 'действуют до ' + F.dateLong(op.expires) : '';
        var when = F.date(op.ts) + ' · ' + time(op.ts);
        return '<tr><td class="hist__date">' + when + '</td>' +
          '<td>' + esc(op.reason || 'Операция') + (note ? '<span class="hist__note">' + note + '</span>' : '') + '<span class="hist__date-m">' + when + '</span></td>' +
          '<td class="right"><span class="hist__delta' + (plus ? ' green' : '') + '">' + (plus ? '+' : '−') + F.num(Math.abs(op.amount)) + '</span></td>' +
          '<td class="right"><span class="hist__after">' + F.num(r.after) + '</span></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="hist-foot"><p class="small muted">Если поиск ничего не нашёл или сорвался, токены возвращаются автоматически.</p>' +
      (rows.length > LIMIT && !historyOpen ? '<button class="btn btn--link" type="button" id="acc-history-more">Показать всю историю · ' + rows.length + '</button>' : '') + '</div>';
    var more = $('acc-history-more'); if (more) more.addEventListener('click', function () { historyOpen = true; renderHistory(); });
  }

  /* ---------- поиск, с которого ушли: доводим до результата (тот же срок, что на странице поиска) ---------- */
  var FINISH_FALLBACK = 9000, timers = {};
  function dueAt(g) { return (g.startedAt || g.ts || 0) + (g.duration || FINISH_FALLBACK); }
  function settle(id) {
    var g = S.gens.get(id); delete timers[id];
    if (!g || g.status !== 'running') return;
    if (g.sample === 'empty' || g.src === D.ai.emptySample.src) {
      if (g.opId) S.tokens.refund(g.opId, 'ничего не найдено'); else if (g.demo) S.demo.giveBack();
      S.gens.update(id, { status: 'empty', finishedAt: Date.now() });
      S.ui.toast('Поиск завершён: ничего не нашли. ' + (g.cost ? 'Токены вернулись на баланс.' : 'Пробный запуск вернули.'));
    } else {
      if (g.opId) S.tokens.commit(g.opId);
      S.gens.update(id, { status: 'done', finishedAt: Date.now(), result: g.result || (g.kind === 'render' ? { sample: true } : { items: D.ai.photoSample.items }) });
      S.ui.toast('Поиск завершён' + (g.cost ? ' · списано ' + F.tokens(g.cost) + ' · остаток ' + F.num(S.tokens.balance()) : ''), 'ok');
    }
  }
  function watchRunning() {
    S.gens.list().forEach(function (g) {
      if (g.status !== 'running' || timers[g.id]) return;
      timers[g.id] = setTimeout(function () { settle(g.id); }, Math.max(0, dueAt(g) - Date.now()));
    });
  }

  function render() {
    if (!S.auth.isIn()) return;
    try {
      buildMenu(); renderHead(); renderPending(); renderSummary(); renderProjects(); renderGens(); renderFavs(); renderLeads(); renderHistory();
    } catch (e) {
      console.error(e);
      $('acc-summary').innerHTML = '';
      $('acc-pending').hidden = false;
      $('acc-pending').innerHTML = '<div class="error-screen"><span class="h3">Не удалось открыть кабинет</span><p class="text">Данные на месте, токены не списывались. Обновите страницу — если не поможет, сбросьте данные прототипа внизу страницы.</p><div class="row"><button class="btn btn--ghost" type="button" onclick="location.reload()">Обновить страницу</button></div></div>';
    }
    if (firstRender) {
      firstRender = false;
      if (location.hash.length > 1) { var t = document.getElementById(location.hash.slice(1)); if (t && t.classList.contains('acc-fold')) openFold(t.id, true); else if (t) t.scrollIntoView(); }
    }
  }

  $('acc-logout').addEventListener('click', function () {
    S.ui.confirm({ title: 'Выйти из аккаунта?', text: 'Проекты, токены и генерации сохранятся — вернётесь к ним после входа по тому же номеру.', ok: 'Выйти',
      onOk: function () { S.auth.logout(); location.href = 'index.html'; } });
  });

  render(); watchRunning();
  S.onChange(function () { render(); watchRunning(); });
  /* ссылка с #якорем раздела на уже открытой странице (например, «История» из другого места) — раскрываем раздел без перезагрузки */
  window.addEventListener('hashchange', function () { var t = location.hash.length > 1 && document.getElementById(location.hash.slice(1)); if (t && t.classList.contains('acc-fold')) openFold(t.id, true); });
})();
