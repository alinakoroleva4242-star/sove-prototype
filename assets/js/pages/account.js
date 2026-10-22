/* Профиль: 4 варианта дизайна на выбор (эталоны — design/profile/profile-A…D.html, данные — из их <script>).
   Переключатель вариантов — временный, потом оставим один. ⚙ → настройки (account.html?v=settings) */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc;
  function $(id) { return document.getElementById(id); }

  /* гость → вход, после кода вернём сюда */
  if (!S.auth.require('account.html' + location.search)) { $('acc').hidden = true; $('acc-guest').hidden = false; return; }

  var VIEW = ({ settings: 'settings', tokens: 'tokens' })[new URLSearchParams(location.search).get('v')] || 'home';

  /* настройки — своё маленькое хранилище прототипа */
  var KEY = 'sove.proto.profile.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  var P = Object.assign({ name: '', email: '', phone: '', addresses: [], notify: { push: true, sms: true, email: false } }, load());
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function row(label, sub, side, attrs) {
    var tag = attrs && /href=/.test(attrs) ? 'a' : attrs ? 'button' : 'div';
    return '<' + tag + ' class="acc-row"' + (tag === 'button' ? ' type="button"' : '') + (attrs || '') + '><span class="acc-row__b"><span class="acc-row__l">' + label + '</span>' + (sub ? '<span class="acc-row__s">' + sub + '</span>' : '') + '</span>' +
      (side || '') + (tag !== 'div' ? '<span class="acc-chev" aria-hidden="true">›</span>' : '') + '</' + tag + '>';
  }
  function time(ts) { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  /* ---------- данные макетов (как в <script> файлов design/profile) ---------- */
  var G = '#2E6B4E', M = '#6B655F', I = '#1E1C1A', T = '#A24E32';
  var L = { metod: 'metod.html?returnTo=account.html', topup: 'tokens.html?returnTo=account.html', my: 'my.html', add: 'my.html?v=new', seen: 'market.html', gear: 'account.html?v=settings' };
  var SEEN = [ { name: 'Торшер латунный', tone: '#C9A48E' }, { name: 'Комод, орех', tone: '#9E8775' }, { name: 'Смеситель', tone: '#A7A196' }, { name: 'Кровать 160', tone: '#C9B8A6' } ];
  /* шестерёнка настроек — обычная, вместо «солнышка» из макетов (просьба Алины 21.10) */
  var GEAR = function (stroke, w) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'; };
  function gear(cls, stroke, w) { return '<a class="' + cls + '" href="' + L.gear + '" aria-label="Настройки">' + GEAR(stroke, w) + '</a>'; }
  function kv(r) { return '<div class="pa-kv"><span>' + r.k + '</span><b style="color:' + r.c + '">' + r.v + '</b></div>'; }
  function heart() { return '<button type="button" class="pv-heart" aria-label="В избранное">♡</button>'; }

  /* общий бюджет квартиры из расчёта Скаута, уже сохранённый в «Мой ремонт» — внизу каждой карточки квартиры (просьба Алины 22.10).
     inLink — карточка сама ссылка, вложенную ссылку не ставим */
  function budgetBox(type, inLink) {
    var tag = inLink ? 'span' : 'a';
    if (!type) return '<div class="pv-bud pv-bud--none"><div class="pv-bud__h"><span class="pv-bud__c">ОБЩИЙ БЮДЖЕТ</span></div><div class="pv-bud__m">не рассчитан</div>' +
      '<' + tag + ' class="pv-link12"' + (inLink ? '' : ' href="scout.html"') + '>Рассчитать в Скауте →</' + tag + '></div>';
    return '<div class="pv-bud"><div class="pv-bud__h"><span class="pv-bud__c">ОБЩИЙ БЮДЖЕТ · ИЗ СКАУТА</span><span class="pv-bud__ok">✓ в Моём ремонте</span></div>' +
      '<div class="pv-bud__sum">[сумма] ₽</div><div class="pv-bud__m">' + type + ' · расчёт Скаута</div>' +
      '<' + tag + ' class="pv-link12"' + (inLink ? '' : ' href="my.html?v=budget"') + '>Открыть бюджет →</' + tag + '></div>';
  }
  function noBudget(r) { return r.k !== 'Бюджет'; }

  /* шапка A и D: «Профиль», справа токены и ⚙ */
  function headWhite() {
    return '<div class="pa-head"><div class="pa-head__t">Профиль</div><div class="pa-head__r"><a class="pa-chip" href="' + L.topup + '">50 токенов</a>' + gear('pa-gear', I) + '</div></div>';
  }
  function seenStrip(w, h) {
    return '<div class="pa-sec"><div class="pa-sec__h"><div class="pv-cap">ВЫ СМОТРЕЛИ</div><a class="pv-link12" href="' + L.seen + '">Все ›</a></div>' +
      '<div class="pa-carousel">' + SEEN.map(function (p) {
        return '<div class="pa-prod"><div class="pa-prod__pic" style="background:' + p.tone + '">' + heart() + '</div><div class="pa-prod__price">[цена] ₽</div><div class="pa-prod__m">цена METOD</div><div class="pa-prod__n">' + p.name + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- A · Карточки ---------- */
  var FLATS_A = [
    { name: 'Моя квартира', data: 'ЖК SLAVA · Москва · 45 м²', level: 'Дизайн-проект ✓', budget: 'Премиум', tone: '#B98A72', rows: [
      { k: 'Основа', v: 'Дизайн-проект ✓', c: G }, { k: 'Интерьер', v: 'Капсула «Бургундский камень»', c: I }, { k: 'Бюджет', v: '[сумма] ₽ ✓', c: G },
      { k: 'Рендеры сохранены', v: '3 из 12', c: I }, { k: 'Избранное · Корзина', v: '14 · 6', c: I }, { k: 'История генераций', v: '25 ›', c: T } ] },
    { name: 'Дом', data: 'КП Отрада · МО · 120 м²', level: 'План застройщика', budget: 'База / Премиум', tone: '#A7A196', rows: [
      { k: 'Основа', v: 'План застройщика', c: I }, { k: 'Интерьер', v: 'не выбран', c: M }, { k: 'Бюджет', v: 'не рассчитан', c: M }, { k: 'История генераций', v: '7 ›', c: T } ] }
  ];
  function flatTop(f, lvlCls) {
    return '<div class="pa-flat__top"><div class="pa-flat__pic" style="background:' + f.tone + '"></div><div class="pa-flat__b"><div class="pa-flat__n">' + f.name + '</div><div class="pa-flat__d">' + f.data + '</div>' +
      '<div class="pa-tags"><span class="pa-tag ' + (lvlCls || 'pa-tag--ok') + '">' + f.level + '</span><span class="pa-tag pa-tag--b">' + f.budget + '</span></div></div></div>';
  }
  function variantA() {
    return '<div class="pv pv--A">' + headWhite() + '<div class="pa-body">' +
      '<div class="pa-metod"><div class="pa-metod__top"><div class="pv-cap">ПОДПИСКА METOD</div><div class="pa-on">● активна</div></div><div class="pa-metod__until">до [дата окончания]</div>' +
        '<div class="pa-metod__d">Лента клуба и закрытые цены в Маркете · выгода [сумма] ₽</div><a class="pa-metod__a" href="' + L.metod + '">Управлять подпиской</a></div>' +
      '<div class="pa-tok"><div class="pv-cap pv-cap--dk">ТОКЕНЫ</div><div class="pa-tok__n"><span>50</span><span>токенов</span></div><div class="pa-tok__d">Подарочные 50 токенов сгорят 20 ноября</div>' +
        '<div class="pa-tok__btns"><a class="pa-btn pa-btn--t" href="' + L.topup + '">Пополнить</a><a class="pa-btn pa-btn--o" href="account.html?v=tokens">История токенов</a></div></div>' +
      '<div class="pa-flats"><div class="pv-cap">МОИ КВАРТИРЫ</div>' + FLATS_A.map(function (f, i) {
        return '<div class="pa-flat">' + flatTop(f) + '<div class="pa-flat__rows">' + f.rows.filter(noBudget).map(kv).join('') + '</div>' + budgetBox(i ? null : 'Премиум') + '<a class="pa-flat__open" href="' + L.my + '">Открыть Мой ремонт →</a></div>';
      }).join('') + '<a class="pa-add" href="' + L.add + '">+ Добавить квартиру</a></div>' +
      seenStrip() + '</div></div>';
  }

  /* ---------- B · Компактный ---------- */
  function st(name, done) { return { name: name, done: done }; }
  var FLATS_B = [
    { name: 'Моя квартира', data: 'ЖК SLAVA · Москва · 45 м² · Дизайн-проект ✓', budget: 'Премиум', steps: [st('Основа', true), st('Интерьер', true), st('Бюджет', true), st('Покупки', false)],
      chips: ['Рендеры 3 из 12', 'Корзина 6', 'История 25'], next: 'Следующий шаг: оформить корзину →' },
    { name: 'Дом', data: 'КП Отрада · МО · 120 м² · План застройщика', budget: 'База / Премиум', steps: [st('Основа', true), st('Интерьер', false), st('Бюджет', false), st('Покупки', false)],
      chips: ['История 7'], next: 'Следующий шаг: выбрать интерьер →' }
  ];
  function variantB() {
    return '<div class="pv pv--B"><div class="pb-head"><div class="pb-id"><div class="pb-ava">ИФ</div><div class="pb-id__b"><div class="pb-id__n">Имя Фамилия</div><div class="pb-id__p">+7 [телефон]</div></div>' + gear('pb-gear', '#FFFFFF') + '</div>' +
      '<div class="pb-tiles"><div class="pb-tile"><div class="pb-tile__c">METOD</div><div class="pb-on">● активна</div><div class="pb-tile__s">лента клуба · закрытые цены</div><div class="pb-tile__s">до [дата]</div><a class="pb-tile__a" href="' + L.metod + '">Управлять подпиской</a></div>' +
        '<div class="pb-tile"><div class="pb-tile__c">ТОКЕНЫ</div><div class="pb-tile__n">50</div><div class="pb-tile__s">сгорят 20 ноября</div><a class="pb-tile__a" href="' + L.topup + '">+ Пополнить</a></div></div></div>' +
      '<div class="pb-body"><div class="pb-sec"><div class="pa-sec__h"><div class="pv-cap">МОИ КВАРТИРЫ</div><a class="pv-link12" href="' + L.add + '">+ Добавить</a></div>' + FLATS_B.map(function (f, i) {
        return '<a class="pb-flat" href="' + L.my + '"><div class="pb-flat__top"><div class="pb-flat__b"><div class="pa-flat__n">' + f.name + '</div><div class="pa-flat__d">' + f.data + '</div></div><span class="pa-tag pa-tag--b">' + f.budget + '</span></div>' +
          '<div class="pb-steps">' + f.steps.map(function (s) { return '<div class="pb-step' + (s.done ? ' is-on' : '') + '"><i></i><span>' + s.name + '</span></div>'; }).join('') + '</div>' +
          '<div class="pb-chips">' + f.chips.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' +
          '<div class="pb-next">' + f.next + '</div>' + budgetBox(i ? null : 'Премиум', true) + '<div class="pb-open">Открыть Мой ремонт →</div></a>';
      }).join('') + '</div>' +
      '<div class="pb-sec"><div class="pa-sec__h"><div class="pv-cap">ВЫ СМОТРЕЛИ</div><a class="pv-link12" href="' + L.seen + '">Все ›</a></div><div class="pb-seen">' + SEEN.map(function (p) {
        return '<div class="pa-prod"><div class="pa-prod__pic pb-pic" style="background:' + p.tone + '">' + heart() + '</div><div class="pa-prod__price">[цена] ₽</div><div class="pa-prod__m">цена METOD</div><div class="pa-prod__n">' + p.name + '</div></div>';
      }).join('') + '</div></div></div></div>';
  }

  /* ---------- C · Редакционный ---------- */
  var FLATS_C = [
    { name: 'Моя квартира', data: 'ЖК SLAVA · Москва · 45 м² · интерьер: капсула «Бургундский камень»', budget: 'Премиум', level: 'ДИЗАЙН-ПРОЕКТ ✓', tone: '#B98A72',
      stats: [{ k: 'РЕНДЕРЫ', v: '3 из 12', c: I }, { k: 'ИСТОРИЯ', v: '25 ›', c: T }] },
    { name: 'Дом', data: 'КП Отрада · МО · 120 м² · интерьер не выбран', budget: 'База / Премиум', level: 'ПЛАН ЗАСТРОЙЩИКА', tone: '#A7A196',
      stats: [{ k: 'РЕНДЕРЫ', v: '0', c: M }, { k: 'ИСТОРИЯ', v: '7 ›', c: T }] }
  ];
  function variantC() {
    return '<div class="pv pv--C"><div class="pc-head"><div class="pc-head__b"><div class="pc-eyebrow">ПРОФИЛЬ</div><div class="pc-name">Имя Фамилия</div></div>' + gear('pa-gear', I, 1.6) + '</div>' +
      '<div class="pc-strip"><div class="pc-strip__l"><div class="pc-cap">METOD</div><div class="pc-on">Активна до [дата]</div><div class="pc-s">Лента клуба и закрытые цены</div><a class="pv-link12" href="' + L.metod + '">Управлять</a></div>' +
        '<div class="pc-strip__r"><div class="pc-cap">ТОКЕНЫ</div><div class="pc-num">50</div><div class="pc-s">подарочные сгорят 20 ноября</div><span class="pv-link12"><a href="' + L.topup + '">Пополнить</a> · <a href="account.html?v=tokens">История</a></span></div></div>' +
      '<div class="pc-body"><div class="pc-sec"><div class="pc-sec__h"><div class="pc-h">Мои квартиры</div><a class="pv-link12" href="' + L.add + '">+ Добавить</a></div>' + FLATS_C.map(function (f, i) {
        return '<a class="pc-flat" href="' + L.my + '"><div class="pc-flat__pic" style="background:' + f.tone + '"><span>' + f.level + '</span></div><div class="pc-flat__b">' +
          '<div class="pc-flat__top"><div class="pc-flat__n">' + f.name + '</div><div class="pc-flat__bud">' + f.budget + '</div></div><div class="pa-flat__d">' + f.data + '</div>' +
          '<div class="pc-stats" style="grid-template-columns: repeat(' + f.stats.length + ', minmax(0, 1fr))">' + f.stats.map(function (s) { return '<div><div class="pc-stats__k">' + s.k + '</div><div class="pc-stats__v" style="color:' + s.c + '">' + s.v + '</div></div>'; }).join('') + '</div>' +
          budgetBox(i ? null : 'Премиум', true) + '<div class="pc-open">Открыть Мой ремонт →</div></div></a>';
      }).join('') + '</div>' +
      '<div class="pc-sec pc-sec--seen"><div class="pc-sec__h"><div class="pc-h">Вы смотрели</div><a class="pv-link12" href="' + L.seen + '">Все ›</a></div><div class="pc-carousel">' + SEEN.map(function (p) {
        return '<div class="pc-prod"><div class="pc-prod__pic" style="background:' + p.tone + '">' + heart() + '</div><div class="pc-prod__n">' + p.name + '</div><div class="pc-prod__p">[цена] ₽ <span>METOD</span></div></div>';
      }).join('') + '</div></div></div></div>';
  }

  /* ---------- D · История в объекте ---------- */
  var ROWS_D = [ { k: 'Основа', v: 'Дизайн-проект ✓', c: G }, { k: 'Интерьер', v: 'Капсула «Бургундский камень»', c: I }, { k: 'Избранное · Корзина', v: '14 · 6', c: I } ];
  var THUMBS = [ { room: 'Кухня-гостиная', tone: '#B98A72', saved: true }, { room: 'Кухня-гостиная', tone: '#9E8775', own: true }, { room: 'Спальня', tone: '#8FA0A8', saved: true },
                 { room: 'Спальня', tone: '#C9A48E' }, { room: 'Санузел', tone: '#A7A196', saved: true }, { room: 'Санузел', tone: '#C9B8A6' } ];
  function variantD() {
    var f1 = { name: 'Моя квартира', data: 'ЖК SLAVA · Москва · 45 м²', level: 'Дизайн-проект ✓', budget: 'Премиум', tone: '#B98A72' };
    var f2 = { name: 'Дом', data: 'КП Отрада · МО · 120 м²', level: 'План застройщика', budget: 'База / Премиум', tone: '#A7A196' };
    return '<div class="pv pv--D">' + headWhite() + '<div class="pd-body">' +
      '<div class="pd-two"><div class="pd-metod"><div class="pv-cap pv-cap--10">ПОДПИСКА METOD</div><div class="pd-on">● активна</div><div class="pd-s">лента клуба и закрытые цены · до [дата]</div><a class="pv-link12" href="' + L.metod + '">Управлять</a></div>' +
        '<div class="pd-tok"><div class="pv-cap pv-cap--10 pv-cap--dk">ТОКЕНЫ</div><div class="pd-tok__n">50</div><div class="pd-s pd-s--dk">сгорят 20 ноября</div><span class="pv-link12 pd-tok__a"><a href="' + L.topup + '">Пополнить</a> · <a href="account.html?v=tokens">История</a></span></div></div>' +
      '<div class="pv-cap pd-cap">МОИ КВАРТИРЫ</div>' +
      '<div class="pa-flat pd-flat pd-flat--main">' + flatTop(f1) + '<div class="pa-flat__rows">' + ROWS_D.map(kv).join('') + '</div>' +
        '<div class="pd-hist"><div class="pa-sec__h"><div class="pv-cap">ИСТОРИЯ ГЕНЕРАЦИЙ · 25</div><a class="pv-link12" href="' + L.my + '">Вся ›</a></div>' +
          '<div class="pd-seg"><div><b>Бюджет</b><span>5</span></div><div><b>Планировка</b><span>3</span></div><div><b>Материалы</b><span>5</span></div><div class="is-on"><b>Визуализации</b><span>12</span></div></div>' +
          '<div class="pd-chips"><span class="is-on">Все</span><span>Кухня-гостиная · 5</span><span>Спальня · 4</span><span>Санузел · 2</span></div>' +
          '<div class="pd-thumbs">' + THUMBS.map(function (t) {
            return '<div class="pd-th"><div class="pd-th__pic" style="background:' + t.tone + '">' + (t.saved ? '<span class="pd-th__saved">✓ в МР</span>' : '') + (t.own ? '<span class="pd-th__own">Мой проект</span>' : '') + '</div><div class="pd-th__r">' + t.room + '</div></div>';
          }).join('') + '</div></div>' +
        budgetBox('Премиум') + '<a class="pa-flat__open" href="' + L.my + '">Открыть Мой ремонт →</a></div>' +
      '<div class="pa-flat pd-flat">' + flatTop(f2, 'pa-tag--plain') + '<div class="pa-flat__rows">' +
        kv({ k: 'Интерьер', v: 'не выбран', c: M }) + kv({ k: 'История генераций', v: '7 · развернуть ▾', c: T }) + '</div>' + budgetBox(null) +
        '<a class="pa-flat__open" href="' + L.my + '">Открыть Мой ремонт →</a></div>' +
      '<a class="pa-add" href="' + L.add + '">+ Добавить квартиру</a>' +
      seenStrip() + '</div></div>';
  }

  /* ---------- E · Квартиры в ряд: квартиры листаются вбок, под выбранной — её история генераций списком вниз (просьба Алины 21.10) ---------- */
  var FLATS_E = [
    { name: 'Моя квартира', data: 'ЖК SLAVA · Москва · 45 м²', level: 'Дизайн-проект ✓', budget: 'Премиум', tone: '#B98A72', count: 25, feed: [
      { t: 'Кухня-гостиная · Бургундский камень', kind: 'Визуализация', date: '21 окт', saved: true, tone: '#B98A72' },
      { t: 'Расчёт · Премиум · [сумма] ₽', kind: 'Бюджет', date: '21 окт', saved: false, tone: '#E2EEE6' },
      { t: 'Спальня · Минимализм с голубым', kind: 'Визуализация', date: '20 окт', saved: false, tone: '#8FA0A8' },
      { t: 'Примерка капсулы · Тёплая классика', kind: 'Материалы', date: '19 окт', saved: false, tone: '#C9A48E' } ] },
    { name: 'Дом', data: 'КП Отрада · МО · 120 м²', level: 'План застройщика', budget: 'База / Премиум', tone: '#A7A196', count: 7, feed: [] }
  ];
  var E_KINDS = ['Все', 'Бюджет', 'Планировка', 'Материалы', 'Визуализация'];
  var eFlat = 0, eKind = 'Все';
  function feedE() {
    var f = FLATS_E[eFlat], list = f.feed.filter(function (x) { return eKind === 'Все' || x.kind === eKind; });
    return '<div class="pe-feed"><div class="pa-sec__h"><div class="pv-cap">ИСТОРИЯ ГЕНЕРАЦИЙ · ' + f.count + '</div><a class="pv-link12" href="' + L.my + '">Вся ›</a></div>' +
      '<div class="pe-for">' + f.name + '</div>' +
      '<div class="pd-chips">' + E_KINDS.map(function (k) { return '<span role="button" tabindex="0" data-e-kind="' + k + '"' + (k === eKind ? ' class="is-on"' : '') + '>' + k + '</span>'; }).join('') + '</div>' +
      (list.length ? '<div class="pe-list">' + list.map(function (x, i) {
        return '<div class="pe-item"><div class="pe-item__pic" style="background:' + x.tone + '"></div><div class="pe-item__b"><div class="pe-item__t">' + x.t + '</div><div class="pe-item__m">' + x.kind + ' · ' + x.date + '</div>' +
          (x.saved ? '<span class="pe-item__saved">✓ в Мой ремонт</span>' : '<button type="button" class="pe-item__save" data-e-save="' + f.feed.indexOf(x) + '">Сохранить в Мой ремонт</button>') + '</div></div>';
      }).join('') + '</div>' : '<div class="pe-empty">Здесь появятся генерации этой квартиры</div>') + '</div>';
  }
  function variantE() {
    return '<div class="pv pv--E">' + headWhite() + '<div class="pd-body">' +
      '<div class="pd-two"><div class="pd-metod"><div class="pv-cap pv-cap--10">ПОДПИСКА METOD</div><div class="pd-on">● активна</div><div class="pd-s">лента клуба и закрытые цены · до [дата]</div><a class="pv-link12" href="' + L.metod + '">Управлять подпиской</a></div>' +
        '<div class="pd-tok"><div class="pv-cap pv-cap--10 pv-cap--dk">ТОКЕНЫ</div><div class="pd-tok__n">50</div><div class="pd-s pd-s--dk">сгорят 20 ноября</div><span class="pv-link12 pd-tok__a"><a href="' + L.topup + '">Пополнить</a> · <a href="account.html?v=tokens">История</a></span></div></div>' +
      '<div class="pa-sec"><div class="pa-sec__h"><div class="pv-cap">МОИ КВАРТИРЫ</div><span class="pe-count">' + FLATS_E.length + '</span></div><div class="pe-flats">' + FLATS_E.map(function (f, i) {
        return '<div class="pe-flat' + (i === eFlat ? ' is-on' : '') + '" role="button" tabindex="0" data-e-flat="' + i + '"><div class="pe-flat__pic" style="background:' + f.tone + '"></div><div class="pe-flat__b"><div class="pa-flat__n">' + f.name + '</div><div class="pa-flat__d">' + f.data + '</div>' +
          '<div class="pa-tags"><span class="pa-tag ' + (i ? 'pa-tag--plain' : 'pa-tag--ok') + '">' + f.level + '</span><span class="pa-tag pa-tag--b">' + f.budget + '</span></div>' +
          '</div>' + budgetBox(i ? null : 'Премиум') + '<div class="pe-flat__f"><a class="pe-flat__open" href="' + L.my + '">Открыть Мой ремонт →</a></div></div>';
      }).join('') + '<a class="pe-add" href="' + L.add + '">+ Добавить квартиру</a></div></div>' +
      '<div id="pe-feed">' + feedE() + '</div>' +
      seenStrip() + '</div></div>';
  }
  function bindE(root) {
    root.querySelectorAll('[data-e-flat]').forEach(function (c) {
      function pick(e) { if (e.target.closest('a')) return; eFlat = Number(c.getAttribute('data-e-flat')); eKind = 'Все'; root.querySelectorAll('[data-e-flat]').forEach(function (x) { x.classList.toggle('is-on', x === c); }); drawFeed(root); }
      c.addEventListener('click', pick); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    });
    drawFeed(root, true);
  }
  function drawFeed(root, bindOnly) {
    var box = root.querySelector('#pe-feed'); if (!box) return;
    if (!bindOnly) box.innerHTML = feedE();
    box.querySelectorAll('[data-e-kind]').forEach(function (b) { b.addEventListener('click', function () { eKind = b.getAttribute('data-e-kind'); drawFeed(root); }); });
    box.querySelectorAll('[data-e-save]').forEach(function (b) { b.addEventListener('click', function () { FLATS_E[eFlat].feed[Number(b.getAttribute('data-e-save'))].saved = true; drawFeed(root); S.ui.toast('Сохранено в Мой ремонт', 'ok'); }); });
  }

  /* ---------- переключатель вариантов (запоминается) ---------- */
  var PV_KEY = 'sove.proto.profileVariant';
  var VARIANTS = { A: variantA, B: variantB, C: variantC, D: variantD, E: variantE };
  /* «Исходный» — Профиль до правок 21.10, отдельной страницей account-old.html */
  try { if (VIEW === 'home' && localStorage.getItem('sove.proto.profileVariant') === '0') { location.replace('account-old.html'); return; } } catch (e) {}
  var old = $('pv-old'); if (old) old.addEventListener('click', function () { setPv('0'); });
  function getPv() { try { var v = localStorage.getItem(PV_KEY); return VARIANTS[v] ? v : 'A'; } catch (e) { return 'A'; } }
  function setPv(v) { try { localStorage.setItem(PV_KEY, v); } catch (e) {} }
  function renderVariant() {
    var v = getPv();
    $('pv-root').innerHTML = VARIANTS[v]();
    document.body.setAttribute('data-pv', v);
    document.querySelectorAll('[data-pv]').forEach(function (b) { if (b.tagName === 'BUTTON') { var on = b.getAttribute('data-pv') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); } });
    if (v === 'E') bindE($('pv-root'));
    $('pv-root').querySelectorAll('.pv-heart').forEach(function (b) { b.addEventListener('click', function () { b.textContent = b.textContent === '♡' ? '♥' : '♡'; }); });
  }

  /* ---------- история токенов: списания (по умолчанию) · пополнения · все — из настоящего журнала операций ---------- */
  var TOK_TABS = [['out', 'Списания'], ['in', 'Пополнения'], ['all', 'Все']], tokTab = 'out';
  function renderTokensView() {
    var ops = S.tokens.history();
    var out = ops.filter(function (o) { return o.amount < 0; }), inn = ops.filter(function (o) { return o.amount > 0; });
    var spent = out.reduce(function (n, o) { return n + (o.refunded ? 0 : -o.amount); }, 0);
    var list = tokTab === 'out' ? out : tokTab === 'in' ? inn : ops;
    var EMPTY = { out: 'Списаний пока нет. Здесь будет каждая генерация: что запускали, когда и сколько токенов ушло. Если генерация не удалась, токены вернутся — это тоже будет видно.', in: 'Пополнений пока нет.', all: 'Операций пока нет.' };
    $('acc-tokens').innerHTML =
      '<div class="pv pt"><div class="pt-sum"><div class="pt-sum__c"><span>Баланс</span><b>' + F.tokens(S.tokens.balance()) + '</b></div><div class="pt-sum__c"><span>Списано всего</span><b>' + F.tokens(spent) + '</b></div></div>' +
      '<div class="pt-tabs" role="tablist">' + TOK_TABS.map(function (t) { return '<button type="button" role="tab" data-tt="' + t[0] + '" aria-selected="' + (t[0] === tokTab) + '"' + (t[0] === tokTab ? ' class="is-on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="pt-list">' + list.map(function (o) {
        var plus = o.amount > 0, note = o.type === 'reserve' && !o.refunded ? 'в резерве, пока идёт генерация' : o.refunded ? 'вернулись на баланс' : (o.type === 'gift' && o.expires ? 'сгорят ' + F.dateLong(o.expires) : '');
        return '<div class="pt-op"><div class="pt-op__b"><div class="pt-op__t">' + esc(o.reason || 'Операция') + '</div><div class="pt-op__m">' + F.dateLong(o.ts) + ' · ' + time(o.ts) + (note ? ' · ' + note : '') + '</div></div>' +
          '<div class="pt-op__a' + (plus ? ' is-plus' : '') + (o.refunded ? ' is-back' : '') + '">' + (plus ? '+' : '−') + F.num(Math.abs(o.amount)) + '</div></div>';
      }).join('') + '</div>' : '<div class="pt-empty">' + EMPTY[tokTab] + '</div>') +
      '<a class="pa-btn pa-btn--t pt-top" href="tokens.html?returnTo=' + encodeURIComponent('account.html?v=tokens') + '">Пополнить</a></div>';
    $('acc-tokens').querySelectorAll('[data-tt]').forEach(function (b) { b.addEventListener('click', function () { tokTab = b.getAttribute('data-tt'); renderTokensView(); }); });
  }

  /* ---------- настройки ---------- */
  function renderSettings() {
    var u = S.auth.user() || {};
    var phone = P.phone || u.phone, email = P.email || u.email;
    var sw = function (k, label) { return '<label class="acc-row acc-sw"><span class="acc-row__l">' + label + '</span><input type="checkbox" data-notify="' + k + '"' + (P.notify[k] ? ' checked' : '') + '><i aria-hidden="true"></i></label>'; };
    $('acc-settings').innerHTML =
      '<section class="wrap"><div class="acc-group"><h2 class="acc-group__t">Личные данные</h2>' +
        row('Имя', P.name ? esc(P.name) : 'Не указано', '', ' data-edit="name"') +
        row('Телефон', phone ? F.phone(phone) : 'Не указан', '', ' data-edit="phone"') +
        row('Почта', email ? esc(email) : 'Не указана', '', ' data-edit="email"') + '</div></section>' +
      '<section class="wrap"><div class="acc-group"><h2 class="acc-group__t">Адреса доставки</h2>' +
        P.addresses.map(function (a, i) { return row(esc(a), '', '<button class="acc-x" type="button" data-addr-del="' + i + '" aria-label="Удалить адрес">×</button>'); }).join('') +
        '<button class="acc-row acc-add" type="button" id="acc-addr-add"><span class="acc-row__l">+ Добавить адрес</span></button></div></section>' +
      '<section class="wrap"><div class="acc-group"><h2 class="acc-group__t">Способы оплаты</h2>' +
        row('Visa ••4417') +
        '<button class="acc-row acc-add" type="button" id="acc-card-add"><span class="acc-row__l">+ Привязать карту</span></button></div></section>' +
      '<section class="wrap"><div class="acc-group"><h2 class="acc-group__t">Уведомления</h2>' + sw('push', 'Пуш-уведомления') + sw('sms', 'SMS') + sw('email', 'Письма на почту') + '</div></section>' +
      '<section class="wrap"><div class="acc-exit"><button class="btn btn--ghost" type="button" id="acc-logout">Выйти</button></div></section>';
    var root = $('acc-settings');
    root.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { edit(b.getAttribute('data-edit')); }); });
    root.querySelectorAll('[data-notify]').forEach(function (c) { c.addEventListener('change', function () { P.notify[c.getAttribute('data-notify')] = c.checked; persist(); }); });
    root.querySelectorAll('[data-addr-del]').forEach(function (b) { b.addEventListener('click', function () { P.addresses.splice(Number(b.getAttribute('data-addr-del')), 1); persist(); renderSettings(); }); });
    $('acc-addr-add').addEventListener('click', function () { edit('address'); });
    $('acc-card-add').addEventListener('click', function () { S.ui.toast('В прототипе карта не привязывается'); });
    $('acc-logout').addEventListener('click', function () {
      S.ui.confirm({ title: 'Выйти из аккаунта?', text: 'Объекты, токены и генерации сохранятся — вернётесь к ним после входа по тому же номеру.', ok: 'Выйти',
        onOk: function () { S.auth.logout(); location.href = 'index.html'; } });
    });
  }
  function edit(k) {
    var u = S.auth.user() || {};
    var cfg = { name: ['Имя', P.name, 'Как к вам обращаться', 'text'], phone: ['Телефон', P.phone || u.phone || '', '+7', 'tel'], email: ['Почта', P.email || u.email || '', 'name@mail.ru', 'email'], address: ['Адрес доставки', '', 'Город, улица, дом, квартира', 'text'] }[k];
    S.ui.modal({ title: cfg[0], html: '<div class="field"><input class="input" id="acc-edit" type="' + cfg[3] + '" value="' + esc(cfg[1] || '') + '" placeholder="' + esc(cfg[2]) + '" autocomplete="off"></div>', actions: [
      { label: 'Сохранить', kind: 'primary', onClick: function (ev, api) {
        var v = api.el.querySelector('#acc-edit').value.trim();
        if (k === 'address') { if (v) P.addresses.push(v); } else P[k] = v;
        persist(); renderSettings();
      } },
      { label: 'Отмена', kind: 'ghost' } ] });
  }


  if (VIEW === 'tokens') {
    $('pv-pick').hidden = true; $('pv-root').hidden = true; $('acc-tokens-wrap').hidden = false;
    document.title = 'История токенов — SOVE App';
    renderTokensView(); S.onChange(renderTokensView);
  } else if (VIEW === 'settings') {
    $('pv-pick').hidden = true; $('pv-root').hidden = true; $('acc-settings-wrap').hidden = false;
    document.title = 'Настройки — SOVE App';
    renderSettings();
  } else {
    document.querySelectorAll('#pv-pick [data-pv]').forEach(function (b) { b.addEventListener('click', function () { setPv(b.getAttribute('data-pv')); renderVariant(); window.scrollTo(0, 0); }); });
    renderVariant();
  }
})();
