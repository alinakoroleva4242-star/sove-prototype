/* ЛК команды — перенос раздела /team/*: вход, платформа, аккаунты, дизайн-проекты и ремонты под ключ, поддержка.
   На сайте это шесть отдельных экранов; в прототипе они собраны в один с вкладками,
   состав блоков и тексты — с сайта. Цифры платформы приходят с сервера, поэтому в прототипе
   показываем только то, что есть локально, и честно это подписываем. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var root = document.getElementById('tm-root'); if (!root) return;
  var KEY = 'sove.proto.teamIn';
  var inside = false;
  try { inside = localStorage.getItem(KEY) === '1'; } catch (e) {}
  var tab = 'home';

  var TABS = [
    { id: 'home', t: 'Платформа' },
    { id: 'adept', t: 'Дизайн-проекты' },
    { id: 'track', t: 'Ремонты под ключ' },
    { id: 'support', t: 'Поддержка' },
    { id: 'members', t: 'Аккаунты' }
  ];

  function login() {
    return '<div class="stack stack--3"><span class="eyebrow">Только для сотрудников</span><h1 class="h1">Вход в ЛК команды</h1>' +
      '<p class="text">Логин и пароль вашего личного аккаунта. Общего пароля на роль нет — у каждого сотрудника свой вход.</p></div>' +
      '<form class="stack stack--4" id="tm-form">' +
        '<div class="field"><label for="tm-login">Логин</label><input class="input" id="tm-login" autocomplete="username"></div>' +
        '<div class="field"><label for="tm-pass">Пароль</label><input class="input" id="tm-pass" type="password" autocomplete="current-password">' +
        '<p class="field__error" id="tm-err" hidden></p></div>' +
        '<button class="btn btn--primary btn--block" type="submit">Войти</button>' +
      '</form>' +
      '<p class="small muted">Прототип: вход не проверяется, данные никуда не уходят.</p>';
  }

  function nums() {
    var leads = S.leads.list() || [], pays = (S.pay && S.pay.list) ? S.pay.list() : [];
    var paid = pays.filter(function (p) { return p.status === 'paid'; });
    return '<div class="tm-nums">' +
      '<div class="tm-num"><b>' + F.num(leads.length) + '</b><span>заявок в этом браузере</span></div>' +
      '<div class="tm-num"><b>' + F.num(paid.length) + '</b><span>оплат прошло</span></div>' +
      '<div class="tm-num"><b>' + F.num((S.projects.list() || []).length) + '</b><span>проектов создано</span></div>' +
      '</div>' +
      '<p class="small muted">Настоящие цифры платформы — люди, оплаты за день и месяц — приходят с сервера. В прототипе сервера нет, поэтому показываем только локальные данные.</p>';
  }

  function sourceRows() {
    var leads = S.leads.list() || [];
    if (!leads.length) return '<p class="fav-empty">Заявок пока нет.</p>';
    var by = {};
    leads.forEach(function (l) { var k = l.product || 'другое'; by[k] = (by[k] || 0) + 1; });
    return '<div class="pb-list">' + Object.keys(by).map(function (k) {
      return '<div class="pb-item"><b>' + esc(k) + '</b><span>' + by[k] + '</span></div>';
    }).join('') + '</div>';
  }

  function projectRows(kind) {
    var list = (S.projects.list() || []);
    var leads = (S.leads.list() || []).filter(function (l) { return new RegExp(kind, 'i').test(l.product || ''); });
    if (!list.length && !leads.length) {
      return '<p class="fav-empty">Пока нет проектов с активным ' + (kind === 'adept' ? 'дизайн-проектом' : 'ремонтом под ключ') + '.</p>';
    }
    return '<div class="pb-list">' +
      list.map(function (p) {
        var c = D.capsule(p.capsuleId);
        return '<a class="pb-item" href="project.html?id=' + p.id + '"><b>' + esc(p.name) + '</b>' +
          '<span>' + (c ? esc(c.name) + ' · ' : '') + (p.area ? F.area(p.area) : 'площадь не указана') + '</span></a>';
      }).join('') +
      leads.map(function (l) {
        return '<div class="pb-item"><b>' + esc(l.name || 'заявка') + '</b><span>' + esc(l.phone || '') + ' · ' + esc(l.status || '') + '</span></div>';
      }).join('') +
      '</div>';
  }

  function support() {
    var leads = (S.leads.list() || []);
    return '<section class="pb"><span class="pb__k">Поддержка SOVEAPP</span><b class="pb__t">Обращения</b>' +
      (leads.length
        ? '<div class="pb-list">' + leads.slice(0, 8).map(function (l) {
            return '<div class="pb-item"><b>' + esc(l.name || 'без имени') + '</b><span>' + esc(l.product || '') + '<br>' + esc(l.status || '') + '</span></div>';
          }).join('') + '</div>'
        : '<p class="fav-empty">Обращений пока нет.</p>') +
      '<a class="btn btn--ghost btn--sm" href="chats.html?kind=support">Открыть чат поддержки</a></section>';
  }

  function members() {
    return '<section class="pb"><span class="pb__k">Аккаунты команды</span><b class="pb__t">Личный логин на каждого</b>' +
      '<p class="text">Вместо общего пароля на роль у каждого сотрудника свой вход: видно, кто что менял, и доступ можно закрыть одному человеку.</p>' +
      '<div class="pb-list">' +
        '<div class="pb-item"><b>Роли</b><span>руководство · менеджер проекта · поддержка</span></div>' +
        '<div class="pb-item"><b>Доступ</b><span>выдаёт и закрывает руководство</span></div>' +
        '<div class="pb-item"><b>Журнал</b><span>действия сотрудников сохраняются</span></div>' +
      '</div>' +
      '<p class="small muted">Список сотрудников приходит с сервера — в прототипе его нет.</p></section>';
  }

  function view() {
    if (tab === 'adept') return '<section class="pb"><span class="pb__k">Дизайн-проект</span><b class="pb__t">Мои дизайн-проекты</b>' + projectRows('adept') + '</section>';
    if (tab === 'track') return '<section class="pb"><span class="pb__k">Ремонт под ключ</span><b class="pb__t">Мои ремонты под ключ</b>' + projectRows('track') + '</section>';
    if (tab === 'support') return support();
    if (tab === 'members') return members();
    return nums() +
      '<section class="pb"><span class="pb__k">Заявки</span><b class="pb__t">По источникам</b>' + sourceRows() + '</section>' +
      '<div class="tm-grid">' +
        '<a class="tm-tile" href="partner-admin.html"><b>Заявки партнёров</b><span>категория, регион, источник</span></a>' +
        '<a class="tm-tile" href="chats.html?kind=support"><b>Поддержка SOVEAPP</b><span>обращения клиентов</span></a>' +
      '</div>';
  }

  function paint() {
    if (!inside) { root.innerHTML = login(); bindLogin(); return; }
    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">ЛК команды</span><h1 class="h1">Рабочий кабинет</h1>' +
      '<p class="text">Платформа, дизайн-проекты и ремонты под ключ, поддержка и аккаунты сотрудников.</p></div>' +
      '<div class="lane co-chips">' + TABS.map(function (t) {
        return '<button type="button" class="chip' + (t.id === tab ? ' is-on' : '') + '" data-tab="' + t.id + '">' + esc(t.t) + '</button>';
      }).join('') + '</div>' +
      view() +
      '<button type="button" class="btn btn--link" id="tm-out">Выйти</button>';
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); paint(); });
    });
    var out = document.getElementById('tm-out');
    if (out) out.addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      inside = false; paint();
    });
  }

  function bindLogin() {
    var f = document.getElementById('tm-form'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = document.getElementById('tm-login').value.trim(), err = document.getElementById('tm-err');
      if (!l) { err.hidden = false; err.textContent = 'Введите логин.'; return; }
      try { localStorage.setItem(KEY, '1'); } catch (e2) {}
      inside = true; paint(); ui.toast('Вы вошли в ЛК команды');
    });
  }
  paint();
})();
