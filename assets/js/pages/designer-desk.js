/* Кабинеты дизайнеров, шаг 8: Проекты, Цены, Деньги, Документы, Профиль, Дизайнеры и обе Главные.
   Проекты, начисления и выплаты — ДЕМО-ДАННЫЕ (ТЗ: «моки»): клиенты, суммы и проценты условные, настоящие придут с сервера. Хранятся в браузере. */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var st = DC.st, ROLE = DC.ROLE, esc = DC.esc, ui = DC.ui, ic = DC.ic, F = DC.F, head = DC.head, okBox = DC.okBox;
  var DAY = 864e5, STAGES = ['Анкета', 'Планировка (2 варианта + 1 правка)', 'Материалы', 'Визуализации (до 3 замен)', 'Чертежи', 'Спецификация'];
  /* состав и сроки тарифов — «Регламент Адепт» с sove.app (v5): то, что клиент получает по каждому тарифу */
  var INCL = {
    start: { term: '7 раб. дней до 50 м², 10 — до 80 м²', list: ['План с расстановкой мебели — 1 вариант', 'ИИ-рендеры — 1–2 на помещение', 'Плановый бюджет со спецификацией'] }, /* Алина 13.11: в регламенте v5 у Стартового нет рендеров, бюджет внутренний */
    base: { term: 'до 25 рабочих дней', list: ['План с расстановкой мебели — 1 вариант', 'Схема сантехники', 'Схема управления освещением', 'Схема розеток', 'ИИ-рендеры — 1–2 на помещение', 'Плановый бюджет со спецификацией'] },
    optimal: { term: 'до 35 рабочих дней', list: ['Обмерный план с 3D-видом по размерам клиента', 'Расстановка мебели — 2 варианта', 'Схемы демонтажа и монтажа', 'Схема отделки стен', 'Схема сантехники', 'Схема напольного покрытия', 'Схема тёплого пола', 'Схема потолков', 'Схема освещения', 'Схема управления освещением', 'Схема розеток', 'Схема дверей и проёмов', 'Схема стен санузла и декоративных стен', 'ИИ-рендеры — 1–2 на помещение', 'Плановый бюджет со спецификацией'] }
  };
  function inclHtml(id, open) { var x = INCL[id]; if (!x) return ''; return '<details class="dk-incl"' + (open ? ' open' : '') + '><summary>Что входит · ' + x.list.length + '</summary><ul>' + x.list.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul><span class="dr-qty">Срок по регламенту: ' + esc(x.term) + '</span></details>'; }
  var TARIFFS = [['start', 'Стартовый', 2000, 'комплектация ремонта от застройщика'], ['base', 'Базовый', 2600, 'вайтбокс без перепланировки'], ['optimal', 'Оптимальный', 4000, 'бетон или вайтбокс с перепланировкой']]; /* ставки SOVE, ₽/м² — из ТЗ */
  var PEOPLE = []; Object.keys(DC.DESIGNER).forEach(function (k) { if (PEOPLE.indexOf(DC.DESIGNER[k]) < 0) PEOPLE.push(DC.DESIGNER[k]); });
  function me() { return ROLE.who; }
  function capsOf(who) { return Object.keys(DC.DESIGNER).filter(function (k) { return DC.DESIGNER[k] === who; }); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  function ru(d) { return d ? new Date(d).toLocaleDateString('ru-RU') : '—'; }
  function tarName(id) { if (id === 'indiv') return 'Индивидуальный'; return (TARIFFS.filter(function (t) { return t[0] === id; })[0] || TARIFFS[0])[1]; }
  function demo() { return '<p class="dk-demo">Демо-данные: клиенты, суммы и проценты условные.</p>'; }

  /* ── данные (демо) ── */
  function desk() {
    var d = DC.db('desk', null); if (d) { if (DC.projMigrate) d.projects.forEach(DC.projMigrate); return d; }
    d = DC.store().extra.desk = { projects: [], prices: {}, accruals: [], payouts: [], profiles: {} };
    var now = Date.now(), names = [['Анна', 'Москва', 54], ['Игорь', 'Санкт-Петербург', 72], ['Мария', 'Москва', 41]], n = 0;
    PEOPLE.forEach(function (who, wi) {
      var caps = capsOf(who);
      names.forEach(function (c, i) {
        var doneTo = [2, 4, 6][i], t = TARIFFS[(i + wi) % 3];
        d.projects.push({ id: 'p' + (++n), designer: who, client_name: c[0], capsule: caps[i % caps.length], tariff: t[0], area: c[2] + wi * 3, city: c[1], personal: false, wait: i === 1, chiefNote: '',
          stages: STAGES.map(function (s, k) { return { n: k + 1, done: k < doneTo, due: iso(now + (k - doneTo) * 7 * DAY + (i === 0 ? 2 : 9) * DAY), files: [], note: '' }; }) });
        if (i === 2) d.accruals.push({ id: 'a' + n, designer: who, date: iso(now - 20 * DAY), type: 'adept', what: 'АДЕПТ по капсуле', capsule: caps[i % caps.length], sale_amount: t[2] * (c[2] + wi * 3), pct: 10, status: 'подтверждено' });
      });
      d.payouts.push({ designer: who, month: iso(now - 45 * DAY).slice(0, 7), amount: Math.round(86000 * 0.03), status: 'выплачено', receipt_url: '' });
    });
    return d;
  }
  function amount(a) { return Math.round(a.sale_amount * a.pct / 100); }
  DC.deskApi = { desk: function () { return desk(); }, save: function () { DC.saveStore(); }, tarName: tarName, ru: ru, iso: iso, extras: function (who) { return price(who).extras; }, indiv: function (who) { var d = DC.store().extra.desk, pr = d && d.prices && d.prices[who]; return (pr && pr.indiv) || []; } }; /* без desk(): иначе проекты → цены → проекты по кругу */ /* для кабинета проекта (designer-project.js) */
  /* начисления дизайнера. Генерации с капсулой не оплачиваются; «Корзина товаров, собранная по вашим капсулам» — скоро (в старых данных браузера такие строки скрываем) */
  function accOf(who) { return desk().accruals.filter(function (a) { return a.designer === who && a.type !== 'generation' && a.type !== 'cart'; }); }
  /* цены дизайнера по умолчанию пустые — заполняет сам; цены, сохранённые в браузере раньше, один раз обнуляются (Алина 13.11: «цены все обнули») */
  function price(who) {
    var d = desk();
    if (!d.prices[who] || !d.prices[who].zeroed) { d.prices[who] = { tariffs: {}, extras: [], zeroed: true }; TARIFFS.forEach(function (t) { d.prices[who].tariffs[t[0]] = { rate: '', term: '' }; }); }
    return d.prices[who];
  }
  function profile(who) { var d = desk(); if (!d.profiles[who]) d.profiles[who] = { designer: who, photo: '', name: who, about: '', cities: [], tags: [], portfolio: [], accepting: true, per_month: '' }; return d.profiles[who]; }
  function save() { DC.saveStore(); }
  DC.deskReset = function () { delete DC.store().extra.desk; save(); };

  /* ── проекты ── */
  function stageNow(p) { var i = p.stages.filter(function (s) { return s.done; }).length; return i >= p.stages.length ? null : p.stages[i]; }
  function stName(s) { return s.name || STAGES[s.n - 1].split(' (')[0]; }
  function pStatus(p) { return !stageNow(p) ? 'готов' : p.wait ? 'ждём клиента' : 'в работе'; }
  function daysLeft(p) { var s = stageNow(p); return s && s.due ? Math.ceil((new Date(s.due).getTime() - Date.now()) / DAY) : null; }
  function burning(p) { var d = daysLeft(p); return d !== null && d <= 3 && d >= 0; }
  function overdue(p) { var d = daysLeft(p); return d !== null && d < 0; }
  function projRow(p, chief) {
    var s = stageNow(p), d = daysLeft(p), stt = pStatus(p);
    return '<button type="button" class="dk-proj" data-act="p-open" data-id="' + p.id + '"><span class="dk-proj__t"><b>' + esc(p.client_name) + (p.personal ? ' · личный' : '') + '</b><span class="dk-st dk-st--' + (stt === 'готов' ? 'ok' : stt === 'ждём клиента' ? 'wait' : 'work') + '">' + stt + '</span></span>' +
      '<span>' + (chief ? esc(p.designer) + ' · ' : '') + esc(p.capsule ? DC.capName(p.capsule) || 'капсула' : 'без капсулы') + ' · ' + tarName(p.tariff) + '</span>' +
      '<span>' + (s ? 'этап ' + s.n + ' из ' + p.stages.length + ' · ' + esc(stName(s)) + (s.due ? ' · до ' + ru(s.due) : '') : 'проект сдан') + (overdue(p) ? ' · <i class="dk-hot">просрочка ' + DC.plural(-d, 'день', 'дня', 'дней') + '</i>' : burning(p) ? ' · <i class="dk-hot">горит</i>' : '') + '</span></button>';
  }
  function projList(who) {
    var all = desk().projects.filter(function (p) { return !who || p.designer === who; }), f = st.pF || '', chief = !who;
    var list = all.filter(function (p) { return (!f || (f === 'hot' ? burning(p) : f === 'late' ? overdue(p) : pStatus(p) === 'готов')) && (!chief || !st.pWho || p.designer === st.pWho); });
    var chips = '<div class="da-chips">' + [['', 'Все'], ['hot', 'Горят']].concat(chief ? [['late', 'Просрочены']] : [['done', 'Готовы']]).map(function (o) { return DC.chip('p-f', o[0], o[1], f === o[0]); }).join('') + '</div>' +
      (chief ? '<div class="da-chips">' + [['', 'Все дизайнеры']].concat(PEOPLE.map(function (w) { return [w, w]; })).map(function (o) { return DC.chip('p-who', o[0], o[1], (st.pWho || '') === o[0]); }).join('') + '</div>' : '');
    return chips + (list.length ? '<div class="dk-list">' + list.map(function (p) { return projRow(p, chief); }).join('') + '</div>' : okBox(all.length ? 'Под фильтр ничего не подошло.' : 'Проектов пока нет.'));
  }
  function projCard(p, readonly) {
    var dis = readonly ? ' disabled' : '';
    return '<a class="da-back" href="#" data-act="p-back">' + ic('back', 16) + 'Проекты</a>' + head(p.client_name + (p.personal ? ' · личный проект' : ''), (readonly ? esc(p.designer) + ' · ' : '') + 'Контакты клиента в кабинете не показываются.') + demo() +
      '<div class="dk-kv"><div><span>Капсула</span><b>' + esc(p.capsule ? DC.capName(p.capsule) || '—' : 'без капсулы') + '</b></div><div><span>Тариф</span><b>' + tarName(p.tariff) + '</b></div><div><span>Площадь</span><b>' + esc(p.area) + ' м²</b></div><div><span>Город</span><b>' + esc(p.city || '—') + '</b></div><div><span>Статус</span><b>' + pStatus(p) + '</b></div></div>' +
      (readonly ? '' : '<label class="dr-check"><input type="checkbox" data-pj="wait" data-id="' + p.id + '"' + (p.wait ? ' checked' : '') + '> Ждём клиента</label>') +
      '<div class="dk-stages">' + p.stages.map(function (s, i) {
        return '<div class="dk-stage' + (s.done ? ' is-done' : '') + '"><label class="dr-check"><input type="checkbox" data-pj="done" data-id="' + p.id + '" data-n="' + i + '"' + (s.done ? ' checked' : '') + dis + '> <b>' + s.n + '. ' + esc(STAGES[i]) + '</b></label>' +
          '<div class="dk-stage__f"><label>Дедлайн<input class="input" type="date" data-pj="due" data-id="' + p.id + '" data-n="' + i + '" value="' + esc(s.due || '') + '"' + dis + '></label>' +
          '<label>Комментарий<input class="input" data-pj="note" data-id="' + p.id + '" data-n="' + i + '" value="' + esc(s.note || '') + '"' + dis + '></label></div>' +
          '<div class="dk-files">' + s.files.map(function (f) { return '<span class="dr-b">' + esc(f) + '</span>'; }).join('') + (readonly ? (s.files.length ? '' : '<span class="dr-qty">файлов нет</span>') : '<label class="dr-sbtn dp-file">＋ файл<input type="file" multiple data-pj="file" data-id="' + p.id + '" data-n="' + i + '"></label>') + '</div></div>';
      }).join('') + '</div>' +
      (readonly ? '<div class="field"><label for="dk-cn">Комментарий главного дизайнера</label><textarea class="input" id="dk-cn" rows="3" data-pj="chiefNote" data-id="' + p.id + '">' + esc(p.chiefNote || '') + '</textarea></div>' : (p.chiefNote ? '<div class="da-note"><b>Комментарий главного дизайнера</b><span>' + esc(p.chiefNote) + '</span></div>' : ''));
  }
  function byId(id) { return desk().projects.filter(function (p) { return p.id === id; })[0]; }
  function viewProjects(who) {
    var p = st.proj ? byId(st.proj) : null;
    if (p && (who ? p.designer === who : true)) return (DC.projView || projCard)(p, !who);
    return '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + (who ? 'Проекты' : 'Все проекты') + '</h1><p class="da-sub">' + (who ? 'Проекты клиентов по вашим капсулам и личные проекты.' : 'Проекты всех дизайнеров — только просмотр и ваш комментарий.') + '</p></div>' +
      (who ? '<button type="button" class="btn btn--primary btn--small da-new" data-act="p-new">＋ Личный проект</button>' : '') + '</div>' + demo() + projList(who);
  }
  DC.acts['p-open'] = function (b) { st.proj = b.getAttribute('data-id'); DC.paint(); window.scrollTo(0, 0); };
  DC.acts['p-back'] = function () { st.proj = null; DC.paint(); };
  DC.acts['p-f'] = function (b) { st.pF = b.getAttribute('data-v'); DC.paint(); };
  DC.acts['p-who'] = function (b) { st.pWho = b.getAttribute('data-v'); DC.paint(); };
  DC.acts['p-new'] = function () {
    var caps = capsOf(me()).concat(Object.keys(st.meta).filter(function (k) { return st.meta[k].custom && st.meta[k].designer === me(); }));
    DC.sheet({ title: 'Личный проект', html: '<p class="small muted">В витрину не попадает — только в ваш кабинет.</p>' + DC.field('dk-n', 'Имя клиента', '') + DC.field('dk-a', 'Площадь, м²', '', '', 'decimal') + DC.field('dk-c', 'Город', '') +
      '<div class="field"><label for="dk-k">Капсула (необязательно)</label><select class="input" id="dk-k"><option value="">без капсулы</option>' + caps.map(function (c) { return '<option value="' + esc(c) + '">' + esc(DC.capName(c) || c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="dk-t">Тариф</label><select class="input" id="dk-t">' + TARIFFS.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></div>',
      actions: [{ label: 'Создать', kind: 'primary', close: false, onClick: function (ev, api) {
        var v = function (id) { return api.el.querySelector('#' + id).value.trim(); }, area = Number(v('dk-a').replace(',', '.'));
        if (!v('dk-n')) { ui.toast('Напишите имя клиента', 'error'); return; } if (!(area > 0)) { ui.toast('Укажите площадь', 'error'); return; }
        var p = { id: 'p' + Date.now().toString(36), designer: me(), client_name: v('dk-n'), capsule: v('dk-k'), tariff: v('dk-t'), area: area, city: v('dk-c'), personal: true, wait: false, chiefNote: '', stages: STAGES.map(function (s, k) { return { n: k + 1, done: false, due: '', files: [], note: '' }; }) };
        if (DC.projNew) DC.projNew(p); desk().projects.unshift(p); save(); api.close(); st.proj = p.id; DC.paint(); ui.toast('Личный проект создан');
      } }] });
  };

  /* ── цены ── */
  function viewPrices(who, readonly) {
    var pr = price(who), dis = readonly ? ' disabled' : '';
    var rows = TARIFFS.map(function (t) {
      var x = pr.tariffs[t[0]], low = Number(x.rate) > 0 && Number(x.rate) < t[2];
      return '<div class="dk-tar"><b>' + t[1] + ' <span class="dk-tar__w">(' + t[3] + ')</span></b><span class="dr-qty">ставка SOVE ' + F.num(t[2]) + ' ₽/м²</span><div class="dk-tar__f"><label>₽/м²<input class="input" inputmode="numeric" data-pr="rate" data-t="' + t[0] + '" value="' + esc(x.rate) + '"' + dis + '></label><label>Срок, дней<input class="input" inputmode="numeric" data-pr="term" data-t="' + t[0] + '" value="' + esc(x.term) + '" placeholder="' + esc({ start: 'регламент: 7–10', base: 'регламент: до 25', optimal: 'регламент: до 35' }[t[0]] || 'не указан') + '"' + dis + '></label></div>' + inclHtml(t[0]) +
        (low ? '<p class="dp-warn">! ниже ставок SOVE — опубликуем после согласования</p>' : '') + '</div>';
    }).join('');
    function lines(l, ph) { return (pr[l] || []).map(function (e, i) { var a = ' data-l="' + l + '" data-i="' + i + '"'; return '<div class="dk-ex"><input class="input" data-ex="name"' + a + ' value="' + esc(e.name) + '" placeholder="' + ph + '"' + dis + '><input class="input" inputmode="numeric" data-ex="price"' + a + ' value="' + esc(e.price) + '" placeholder="Цена, ₽"' + dis + '><input class="input" data-ex="unit"' + a + ' value="' + esc(e.unit) + '" placeholder="за что: м², шт…"' + dis + '><input class="input" inputmode="numeric" data-ex="term"' + a + ' value="' + esc(e.term || '') + '" placeholder="Срок, дней"' + dis + '>' + (readonly ? '' : '<button type="button" data-act="ex-del"' + a + ' aria-label="Убрать строку">✕</button>') + '</div>'; }).join(''); }
    var extras = lines('extras', 'Название услуги').replace(/class="dk-ex"/g, 'class="dk-ex dk-ex--sm"'), indiv = lines('indiv', 'Что: дизайн-проект, авторский надзор…');
    var preview = '<section class="dp-card dk-prev"><h2>Так увидит клиент</h2><p class="da-sub">' + esc(profile(who).name || who) + ' · дизайн-проект по капсуле</p>' + TARIFFS.map(function (t) { var x = pr.tariffs[t[0]]; return '<div class="dk-kvr"><span>' + t[1] + ' <i class="dk-tar__w">(' + t[3] + ')</i></span><b>' + (Number(x.rate) > 0 ? F.num(Number(x.rate)) + ' ₽/м²' : '—') + (x.term ? ' · ' + esc(x.term) + ' дн.' : '') + '</b></div>' + inclHtml(t[0]); }).join('') +
      kvr(pr.extras, 'Доп. услуги') + kvr(pr.indiv, 'Индивидуальный проект') + '</section>';
    return '<section class="dp-card"><h2>Ставки по тарифам капсул</h2>' + rows +
      '<details class="dk-sub dk-sub--sm dk-exd"' + (st.exOpen ? ' open' : '') + '><summary><b>Доп. услуги к тарифам · ' + (pr.extras || []).length + '</b><span class="da-sub">Название, цена, за что и срок в днях.</span></summary>' + (extras || '<p class="da-sub">Пока нет.</p>') + (readonly ? '' : '<div class="dr-btns"><button type="button" class="dr-sbtn" data-act="ex-add" data-l="extras">＋ Доп. услуга</button></div>') + '</details></section>' +
      '<section class="dp-card"><h2>Индивидуальные проекты</h2><p class="da-sub">Проект не по капсуле, с нуля. Добавьте строки своего прайса — любые услуги.</p>' + (indiv || '') + (readonly ? '' : '<div class="dr-btns"><button type="button" class="dr-sbtn" data-act="ex-add" data-l="indiv">＋ Строка прайса</button></div>') + '</section>' + preview;
  }
  /* строки прайса на показ: «Доп. услуги» / «Индивидуальный проект» */
  function kvr(list, cap) { var l = (list || []).filter(function (e) { return e.name; }); return l.length ? '<div class="dk-kvr__cap">' + cap + '</div>' + l.map(function (e) { return '<div class="dk-kvr"><span>' + esc(e.name) + '</span><b>' + (Number(e.price) > 0 ? F.num(Number(e.price)) + ' ₽' : '—') + (e.unit ? ' / ' + esc(e.unit) : '') + (e.term ? ' · ' + esc(e.term) + ' дн.' : '') + '</b></div>'; }).join('') : ''; }
  function listOf(b) { var pr = price(me()), l = b.getAttribute('data-l') || 'extras'; pr[l] = pr[l] || []; return pr[l]; }
  document.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('dk-exd')) st.exOpen = e.target.open; }, true);
  DC.acts['ex-add'] = function (b) { var l = listOf(b); l.push(b.getAttribute('data-l') === 'indiv' && !l.length ? { name: 'Индивидуальный дизайн-проект', price: '', unit: 'м²', term: '' } : { name: '', price: '', unit: '', term: '' }); save(); DC.paint(); };
  DC.acts['ex-del'] = function (b) { listOf(b).splice(Number(b.getAttribute('data-i')), 1); save(); DC.paint(); };

  /* ── деньги ── */
  /* ── реферальная программа: продажи товаров по интерьерам дизайнера. Ставку задаёт SOVE — в прототипе её нет, не выдумываем ── */
  function refBlock(who, short) { /* вся программа — «скоро» (Алина 13.11): без счётчиков и цифр, только как будет работать */
    var head = '<div class="rf-h"><b>Реферальная программа</b><span class="dk-st dk-st--plain">скоро</span></div><p class="rf-t">Клиент покупает товары из ваших интерьеров на витрине — вам начисление с каждой покупки.</p>';
    if (short) return '<section class="rf rf--short rf--soon">' + head + '<button type="button" class="dk-all" data-act="h-sec" data-s="money">Как это будет ›</button></section>';
    return '<section class="rf rf--soon">' + head +
      '<ol class="rf-steps"><li><b>Интерьер на витрине</b><span>Клиент видит ваши интерьеры в разделе капсул и в вашей карточке исполнителя.</span></li><li><b>Клиент покупает товары интерьера</b><span>Через Маркет — по закрытым ценам SOVE App, корзиной или по одному товару.</span></li><li><b>Вам начисление</b><span>Процент с каждой оплаченной покупки, ставку задаёт SOVE. Выплата — раз в месяц вместе с остальными начислениями.</span></li></ol></section>';
  }
  function viewMoney(who) {
    var d = desk(), acc = accOf(who), pay = d.payouts.filter(function (p) { return p.designer === who; });
    var due = acc.filter(function (a) { return a.status === 'подтверждено' || a.status === 'в выплате'; }).reduce(function (s, a) { return s + amount(a); }, 0), paid = d.payouts.filter(function (p) { return p.designer === who && p.status === 'выплачено'; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0) /* сходится со списком «Выплаты по месяцам» */;
    if (!acc.length) return refBlock(who) + okBox('Начислений пока нет.');
    return demo() + refBlock(who) + '<div class="dk-cards"><div class="dk-card dk-card--dark"><span>К выплате</span><b>' + F.rub(due) + '</b></div><div class="dk-card"><span>Выплачено за всё время</span><b>' + F.rub(paid) + '</b></div></div>' +
      '<section class="da-group"><div class="da-group__h"><b>Начисления</b><span>' + acc.length + '</span></div><div class="da-issues">' + acc.map(function (a) {
        return '<div class="rv-d"><b>' + esc(a.what) + ' · ' + esc(DC.capName(a.capsule) || '') + '</b><span>' + ru(a.date) + ' · продажа ' + F.rub(a.sale_amount) + ' · ' + a.pct + '% · начислено <b>' + F.rub(amount(a)) + '</b></span><span class="dk-st dk-st--' + (a.status === 'выплачено' ? 'ok' : a.status === 'возврат' ? 'hot' : 'wait') + '">' + esc(a.status) + '</span></div>';
      }).join('') + '</div></section>' +
      '<section class="da-group"><div class="da-group__h"><b>Выплаты по месяцам</b><span>' + pay.length + '</span></div><div class="da-issues">' + (pay.length ? pay.map(function (p, i) {
        return '<div class="rv-d"><b>' + new Date(p.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) + ' · ' + F.rub(p.amount) + '</b><span>' + esc(p.status) + (p.receipt_url ? ' · чек: ' + esc(p.receipt_url) : '') + '</span></div>';
      }).join('') : '<div class="da-ok">Выплат пока не было.</div>') + '</div></section><p class="da-sub">Ставки начислений задаёт SOVE — здесь они только показываются.</p>';
  }

  /* ── документы ── */
  function viewDocs(who) {
    var pay = desk().payouts.filter(function (p) { return p.designer === who; });
    function row(t, s, act) { return '<div class="dk-doc"><span><b>' + t + '</b><span>' + s + '</span></span>' + (act || '<button type="button" class="dr-sbtn" data-act="doc-none">Открыть</button>') + '</div>'; }
    return '<div class="da-issues">' + row('Договор с SOVE', 'действующий договор') + pay.map(function (p) { return row('Акт за ' + new Date(p.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }), F.rub(p.amount)); }).join('') +
      pay.filter(function (p) { return p.receipt_url; }).map(function (p) { return row('Чек', esc(p.receipt_url)); }).join('') + row('Регламент капсулы', 'PDF · правила подготовки капсулы') +
      row('Реквизиты', 'только просмотр — меняет SOVE', '<a class="dr-sbtn dk-a" href="chats.html?kind=support">Написать в SOVE</a>') + '</div><p class="da-sub">В прототипе самих файлов нет — только список.</p>';
  }
  DC.acts['doc-none'] = function () { ui.toast('В прототипе файла нет'); };

  /* ── профиль ── */
  function profCard(pf, who) {
    var caps = capsOf(who).length;
    return '<div class="dk-pcard"><span class="dk-ava"' + (pf.photo ? ' style="background-image:' + esc(DC.cssUrl(pf.photo)) + '"' : '') + '>' + (pf.photo ? '' : esc((pf.name || who).charAt(0))) + '</span><span class="dk-pcard__b"><b>' + esc(pf.name || who) + '</b><span>' + (pf.cities.length ? esc(pf.cities.join(', ')) : 'город не указан') + ' · ' + DC.plural(caps, 'капсула', 'капсулы', 'капсул') + '</span>' +
      (pf.tags.length ? '<span class="dr-bs">' + pf.tags.map(function (t) { return '<span class="dr-b">' + esc(t) + '</span>'; }).join('') + '</span>' : '') + '<span class="dk-st dk-st--' + (pf.accepting ? 'ok' : 'wait') + '">' + (pf.accepting ? 'принимаю заказы' : 'пауза') + '</span></span></div>';
  }
  function profFilled(pf) { return !!(pf.photo && pf.about && pf.cities.length && pf.tags.length && (pf.portfolio.length || (pf.works || []).length)); }
  function viewProfile(who, readonly) {
    var pf = profile(who), dis = readonly ? ' disabled' : '';
    return '<section class="dp-card"><h2>О себе</h2><div class="dk-ph"><span class="dk-ava"' + (pf.photo ? ' style="background-image:' + esc(DC.cssUrl(pf.photo)) + '"' : '') + '>' + (pf.photo ? '' : esc((pf.name || who).charAt(0))) + '</span>' + (readonly ? '' : '<label class="dr-sbtn dp-file">' + (pf.photo ? 'Заменить фото' : '＋ Фото') + '<input type="file" accept="image/*" data-pfile="photo"></label>') + '</div>' +
      '<div class="field"><label for="dk-pn">Имя</label><input class="input" id="dk-pn" data-pp="name" value="' + esc(pf.name) + '"' + dis + '></div><div class="field"><label for="dk-pa">О себе</label><textarea class="input" id="dk-pa" rows="3" data-pp="about"' + dis + '>' + esc(pf.about) + '</textarea></div>' +
      '<div class="field"><label for="dk-pc">Города (через запятую)</label><input class="input" id="dk-pc" data-pp="cities" value="' + esc(pf.cities.join(', ')) + '"' + dis + '></div><div class="field"><label for="dk-pt">Теги стиля (через запятую)</label><input class="input" id="dk-pt" data-pp="tags" value="' + esc(pf.tags.join(', ')) + '"' + dis + '></div></section>' +
      /* портфолио — проектами, на самом Профиле (дублей нет) */
      '<section class="dp-card"><h2>Загруженность</h2><label class="dr-check"><input type="checkbox" data-pp="accepting"' + (pf.accepting ? ' checked' : '') + dis + '> Принимаю заказы</label><div class="field"><label for="dk-pm">Проектов в месяц</label><input class="input" id="dk-pm" inputmode="numeric" data-pp="per_month" value="' + esc(pf.per_month) + '" placeholder="не указано"' + dis + '></div></section>' +
      '<section class="dp-card"><h2>Карточка в «Строители, дизайнеры и мастера»</h2>' + profCard(pf, who) + '</section>';
  }
  DC.acts['pf-del'] = function (b) { profile(me()).portfolio.splice(Number(b.getAttribute('data-i')), 1); save(); DC.paint(); };

  /* ── Б6. дизайнеры ── */
  function load(who) { var d = desk(), work = d.projects.filter(function (p) { return p.designer === who && stageNow(p); }).length, pf = profile(who); return { work: work, limit: pf.per_month, pause: !pf.accepting }; }
  function capStat(who) { var c = capsOf(who).concat(Object.keys(st.meta).filter(function (k) { return st.meta[k].custom && st.meta[k].designer === who; })), pub = c.filter(function (k) { return DC.statusOf(k) === 'pub'; }).length; return { pub: pub, work: c.length - pub, list: c }; }
  function viewDesigners() {
    var who = st.dWho;
    if (who && PEOPLE.indexOf(who) >= 0) {
      var cs = capStat(who), pr = price(who), low = TARIFFS.filter(function (t) { var r = Number(pr.tariffs[t[0]].rate); return r > 0 && r < t[2]; });
      return '<a class="da-back" href="#" data-act="dz-back">' + ic('back', 16) + 'Дизайнеры</a>' + head(who, 'Профиль, капсулы, проекты и цены. Денег, договоров и реквизитов здесь нет.') + '<section class="dp-card"><h2>Профиль</h2>' + profCard(profile(who), who) + (profile(who).about ? '<p class="da-sub">' + esc(profile(who).about) + '</p>' : '') + '</section>' +
        '<section class="dp-card"><h2>Капсулы<span>' + cs.list.length + '</span></h2>' + cs.list.map(function (k) { return '<div class="dk-kvr"><span>' + esc(DC.capName(k) || k) + '</span><b>' + esc(DC.statusLabel(DC.statusOf(k))) + ' · версия ' + DC.versionOf(k) + '</b></div>'; }).join('') + '</section>' +
        '<section class="dp-card"><h2>Проекты</h2>' + demo() + '<div class="dk-list">' + desk().projects.filter(function (p) { return p.designer === who; }).map(function (p) { return projRow(p, false); }).join('') + '</div></section>' +
        '<section class="dp-card"><h2>Цены' + (low.length ? '<span class="dp-warn">ниже SOVE: ' + low.map(function (t) { return t[1]; }).join(', ') + '</span>' : '') + '</h2>' + TARIFFS.map(function (t) { var x = pr.tariffs[t[0]]; return '<div class="dk-kvr"><span>' + t[1] + ' <i class="dk-tar__w">(' + t[3] + ')</i></span><b>' + F.num(Number(x.rate) || 0) + ' ₽/м²' + (Number(x.rate) < t[2] ? ' · ниже SOVE' : '') + '</b></div>'; }).join('') + '</section>';
    }
    return head('Дизайнеры', 'Капсулы, проекты и загруженность. Денег, договоров и реквизитов здесь нет.') + '<div class="dk-list">' + PEOPLE.map(function (w) {
      var cs = capStat(w), l = load(w), pf = profile(w);
      return '<button type="button" class="dk-proj dk-dz" data-act="dz-open" data-who="' + esc(w) + '"><span class="dk-ava"' + (pf.photo ? ' style="background-image:' + esc(DC.cssUrl(pf.photo)) + '"' : '') + '>' + (pf.photo ? '' : esc(w.charAt(0))) + '</span><span class="dk-dz__b"><b>' + esc(w) + '</b><span>капсул: ' + cs.pub + ' опубликовано / ' + cs.work + ' в работе</span><span>проектов в работе: ' + l.work + (l.limit ? ' из ' + esc(l.limit) + ' в месяц' : '') + ' · ' + (l.pause ? 'пауза' : 'принимает заказы') + '</span><span>последний вход: нет данных</span></span></button>';
    }).join('') + '</div>';
  }
  DC.acts['dz-open'] = function (b) { st.dWho = b.getAttribute('data-who'); DC.paint(); window.scrollTo(0, 0); };
  DC.acts['dz-back'] = function () { st.dWho = null; DC.paint(); };

  /* ── главные ── */
  function todo(act, attrs, title, text, hot) { return '<button type="button" class="dk-todo' + (hot ? ' is-hot' : '') + '" data-act="' + act + '"' + (attrs || '') + '><b>' + title + '</b><span>' + text + '</span></button>'; }
  function myCaps(who) { return (st.caps || []).filter(function (c) { return DC.designerOf(c.code) === who; }); }
  function capMini(c) { return '<button type="button" class="dk-proj" data-act="h-cap" data-cap="' + esc(c.code) + '"><span class="dk-proj__t"><b>' + esc(DC.capName(c.code)) + '</b><span class="da-st da-st--' + DC.statusOf(c.code) + '">' + esc(DC.statusLabel(DC.statusOf(c.code))) + '</span></span><span>версия ' + DC.versionOf(c.code) + '</span></button>'; }
  /* портфолио на Профиле: проект = несколько фото. Он всегда виден в карточке исполнителя («Исполнители»);
     на витрину интерьеров — по желанию, и только когда у интерьера заполнены материалы */
  function works(pf) { if (!pf.works) pf.works = []; return pf.works; }
  function workState(w) {
    if (!w.cap || !st.meta[w.cap]) return ['', 'только портфолио'];
    var stt = DC.statusOf(w.cap); return stt === 'pub' ? ['ok', 'на витрине'] : ['wait', 'для витрины — заполните материалы'];
  }
  function portfolioBlock(who) {
    var pf = profile(who), ws = works(pf), used = {}; ws.forEach(function (w) { w.photos.forEach(function (u) { used[u] = 1; }); });
    var loose = pf.portfolio.filter(function (u) { return !used[u]; });
    var tiles = ws.map(function (w, i) {
      var s2 = workState(w);
      return '<div class="dk-work"><button type="button" class="dk-int__pic" data-act="' + (w.cap && st.meta[w.cap] ? 'h-cap" data-cap="' + esc(w.cap) : 'pf-shop" data-i="' + i) + '" style="background-image:' + esc(DC.cssUrl(w.photos[0] || '')) + '" aria-label="' + esc(w.name) + '"></button><b>' + esc(w.name) + '</b><span class="dk-work__m">' + w.photos.length + ' из 12 фото</span>' +
        (w.photos.length < 12 ? '<label class="dk-work__x dp-file">＋ Добавить фото<input type="file" accept="image/*" multiple data-pfile="workadd" data-i="' + i + '"></label>' : '') +
        '<span class="dk-st' + (s2[0] ? ' dk-st--' + s2[0] : ' dk-st--plain') + '">' + s2[1] + '</span>' +
        (w.cap && st.meta[w.cap] ? '' : '<button type="button" class="dk-all dk-work__a" data-act="pf-shop" data-i="' + i + '">Выложить на витрину ›</button>') + '<button type="button" class="dk-work__x" data-act="pf-wdel" data-i="' + i + '">Убрать</button></div>';
    }).join('') + loose.map(function (u) { return '<div class="dk-work"><span class="dk-int__pic" style="background-image:' + esc(DC.cssUrl(u)) + '"></span></div>'; }).join('');
    return '<section class="da-group"><div class="da-group__h"><b>Портфолио</b><span>видно в вашей карточке в «Исполнителях»</span></div>' +
      (tiles ? '<div class="dk-ints">' + tiles + '</div>' : '<div class="da-issues"><div class="da-ok">Загрузите фото своих проектов — заказчики увидят их в вашей карточке.</div></div>') +
      '<p class="da-sub">В одном проекте — до 12 фото.</p><label class="dr-sbtn dp-file">＋ Проект в портфолио<input type="file" accept="image/*" multiple data-pfile="work"></label></section>';
  }
  /* после загрузки: проект уже в портфолио; витрина — по желанию */
  function offerShop(i, fresh) {
    var pf = profile(me()), w = works(pf)[i]; if (!w) return;
    DC.sheet({ title: fresh ? 'Проект добавлен в портфолио' : 'Выложить на витрину интерьеров',
      html: '<p class="small muted">' + (fresh ? 'Его увидят в вашей карточке в разделе «Исполнители». ' : '') + 'Хотите выложить его ещё и на витрину интерьеров? Это необязательно. Чтобы попасть на витрину, нужно заполнить материалы интерьера — после этого его проверит главный дизайнер.</p>' + DC.field('dk-wn', 'Название проекта', w.name, 'Например: Квартира на Ленинском'),
      actions: [{ label: 'Выложить на витрину', kind: 'primary', onClick: function (ev, api) {
        var nm = api.el.querySelector('#dk-wn').value.trim(); if (nm) w.name = nm;
        DC.newCapsule(); var code = st.cap, m = DC.meta(code);
        m.name = w.name; m.renders = w.photos.map(function (u) { return { room: '', angle: 'Общий вид', url: u }; }); m.fromPortfolio = true; w.cap = code;
        st.caps.forEach(function (c) { if (c.code === code) c.name = w.name; });
        try { DC.saveMeta(); } catch (er) { /* не влезло в хранилище */ } save(); DC.paint(true); window.scrollTo(0, 0);
        ui.toast('Интерьер создан из портфолио — заполните материалы, чтобы попасть на витрину'); if (DC.aiFill) DC.aiFill(code, true);
      } }, { label: 'Только портфолио', kind: 'link', onClick: function (ev, api) { var nm = api.el.querySelector('#dk-wn').value.trim(); if (nm) { w.name = nm; save(); DC.paint(); } if (fresh) ui.toast('Проект в портфолио — виден в карточке исполнителя'); } }] });
  }
  DC.acts['pf-wdel'] = function (b) {
    var pf = profile(me()), i = Number(b.getAttribute('data-i')), w = works(pf)[i]; if (!w) return;
    DC.sheet({ title: 'Убрать проект из портфолио?', html: '<p class="small muted">«' + esc(w.name) + '» пропадёт из вашей карточки в «Исполнителях».' + (w.cap && st.meta[w.cap] ? ' Интерьер для витрины останется в разделе «Интерьеры».' : '') + '</p>',
      actions: [{ label: 'Убрать', kind: 'primary', onClick: function () { pf.portfolio = pf.portfolio.filter(function (u) { return w.photos.indexOf(u) < 0; }); works(pf).splice(i, 1); save(); DC.paint(); } }, { label: 'Оставить', kind: 'link' }] });
  };
  DC.acts['pf-shop'] = function (b) { offerShop(Number(b.getAttribute('data-i')), false); };
  /* Главная дизайнера = профиль: как вас видят клиенты, интерьеры на витрине, цены; ниже проекты и деньги */
  function viewHome(who) {
    if (!st.caps) return head('Главная', '') + okBox('Загружаю…');
    var pf = profile(who), pr = price(who), caps = myCaps(who), d = desk(), projs = d.projects.filter(function (p) { return p.designer === who; }), cards = [];
    var fix = caps.filter(function (c) { return DC.statusOf(c.code) === 'fix'; });
    if (fix.length) cards.push(todo('h-sec', ' data-s="caps"', 'Нужны правки · ' + fix.length, esc(DC.capName(fix[0].code)), true));
    var hot = projs.filter(function (p) { return burning(p) || overdue(p); });
    if (hot.length) cards.push(todo('h-proj', ' data-id="' + hot[0].id + '"', 'Этап проекта горит', esc(hot[0].client_name) + ' · этап ' + stageNow(hot[0]).n + ' из ' + hot[0].stages.length + ' · до ' + ru(stageNow(hot[0]).due), true));
    if (!profFilled(pf)) cards.push(todo('h-sec', ' data-s="profile"', 'Профиль не заполнен', 'фото, о себе, города, стиль, портфолио'));
    var hero = '<section class="dk-hero"><div class="dk-hero__top"><span class="dk-ava dk-ava--l"' + (pf.photo ? ' style="background-image:' + esc(DC.cssUrl(pf.photo)) + '"' : '') + '>' + (pf.photo ? '' : esc((pf.name || who).charAt(0))) + '</span>' +
      '<span class="dk-hero__b"><b>' + esc(pf.name || who) + '</b><span>Дизайнер' + (pf.cities.length ? ' · ' + esc(pf.cities.join(', ')) : '') + '</span><span class="dk-st dk-st--' + (pf.accepting ? 'ok' : 'wait') + '">' + (pf.accepting ? 'принимаю заказы' : 'пауза') + '</span></span></div>' +
      (pf.tags.length ? '<span class="dr-bs">' + pf.tags.map(function (t) { return '<span class="dr-b">' + esc(t) + '</span>'; }).join('') + '</span>' : '') +
      (pf.about ? '<p class="dk-hero__about">' + esc(pf.about) + '</p>' : '') +
      '<button type="button" class="dr-sbtn" data-act="h-sec" data-s="profile">Изменить профиль</button></section>';
    var refS = refBlock(who, true);
    var shop = '<section class="da-group"><div class="da-group__h"><b>Интерьеры на витрине</b><button type="button" class="dk-all" data-act="h-sec" data-s="caps">Все ›</button></div>' +
      (caps.length ? '<div class="dk-ints">' + caps.map(function (c) { var img = DC.cover(c.code), stt = DC.statusOf(c.code); return '<button type="button" class="dk-int" data-act="h-cap" data-cap="' + esc(c.code) + '"><span class="dk-int__pic"' + (img ? ' style="background-image:' + esc(DC.cssUrl(img)) + '"' : '') + '></span><b>' + esc(DC.capName(c.code)) + '</b><span class="da-st da-st--' + stt + '">' + esc(DC.statusLabel(stt)) + '</span></button>'; }).join('') + '</div>'
        : '<div class="da-issues"><div class="da-ok">Интерьеров пока нет</div></div>') + '<button type="button" class="dr-sbtn" data-act="h-new">＋ Новый интерьер</button></section>';
    var prices = '<section class="dp-card"><h2>Цены<button type="button" class="dk-all" data-act="h-sec" data-s="prices">Изменить ›</button></h2>' + TARIFFS.map(function (t) { var x = pr.tariffs[t[0]]; return '<div class="dk-kvr"><span>Дизайн-проект · ' + t[1] + ' <i class="dk-tar__w">(' + t[3] + ')</i></span><b>' + (Number(x.rate) > 0 ? F.num(Number(x.rate)) + ' ₽/м²' : '—') + (x.term ? ' · ' + esc(x.term) + ' дн.' : '') + '</b></div>' + inclHtml(t[0]); }).join('') +
      kvr(pr.extras, 'Доп. услуги') + kvr(pr.indiv, 'Индивидуальный проект') + '</section>';
    var near = projs.filter(stageNow).sort(function (a, b) { return String(stageNow(a).due).localeCompare(String(stageNow(b).due)); }).slice(0, 3);
    var acc = accOf(who), due = acc.filter(function (a) { return a.status === 'подтверждено' || a.status === 'в выплате'; }).reduce(function (s, a) { return s + amount(a); }, 0), paid = d.payouts.filter(function (p) { return p.designer === who && p.status === 'выплачено'; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0) /* сходится со списком «Выплаты по месяцам» */;
    return hero + (cards.length ? '<div class="dk-todos">' + cards.join('') + '</div>' : '') + portfolioBlock(who) + shop + refS + prices +
      '<section class="da-group"><div class="da-group__h"><b>Проекты</b><button type="button" class="dk-all" data-act="h-sec" data-s="projects">Все ›</button></div>' + (near.length ? '<div class="dk-list">' + near.map(function (p) { return projRow(p, false); }).join('') + '</div>' : '<div class="da-issues"><div class="da-ok">Проектов в работе нет</div></div>') + '</section>' +
      '<section class="da-group"><div class="da-group__h"><b>Выплаты</b><button type="button" class="dk-all" data-act="h-sec" data-s="money">Подробнее ›</button></div>' + (acc.length ? '<div class="dk-cards"><div class="dk-card dk-card--dark"><span>К выплате</span><b>' + F.rub(due) + '</b></div><div class="dk-card"><span>Выплачено за всё время</span><b>' + F.rub(paid) + '</b></div></div>' + demo() : '<div class="da-issues"><div class="da-ok">Начислений пока нет</div></div>') + '</section>';
  }
  function viewChiefHome() {
    var h = head('Главная', 'Что требует вашего внимания.');
    if (!st.caps) return h + okBox('Загружаю…');
    var q = DC.reviewQueue ? DC.reviewQueue() : [], d = desk(), hot = d.projects.filter(function (p) { return burning(p) || overdue(p); }), qn = DC.qualityCount ? DC.qualityCount() : 0;
    return h + '<div class="dk-todos">' + todo('h-sec', ' data-s="review"', 'На проверке · ' + q.length, q.length ? esc(DC.capName(q[0].code)) + ' · ' + (DC.waitText ? DC.waitText((st.meta[q[0].code] || {}).sentAt) : '') : 'очередь пуста', q.length > 0) +
      todo('h-sec', ' data-s="allprojects"', 'Проекты горят · ' + hot.length, hot.length ? esc(hot[0].designer) + ' · ' + esc(hot[0].client_name) + ' · демо' : 'горящих нет', hot.length > 0) +
      todo('h-sec', ' data-s="quality"', 'Ошибки данных · ' + qn, 'цена 0, нет фото, строки без комнаты или позиции, повторы') + '</div>' +
      '<section class="da-group"><div class="da-group__h"><b>Загрузка дизайнеров</b><span>демо</span></div><div class="da-issues">' + PEOPLE.map(function (w) { var l = load(w); return '<div class="rv-d"><b>' + esc(w) + '</b><span>проектов в работе: ' + l.work + ' · лимит: ' + (l.limit ? esc(l.limit) + ' в месяц' : 'не указан') + ' · ' + (l.pause ? 'пауза' : 'принимает заказы') + '</span></div>'; }).join('') + '</div></section>';
  }
  DC.acts['h-sec'] = function (b) { var s = b.getAttribute('data-s'); DC.goSec(ROLE.chief && /^(caps|money|profile|projects)$/.test(s) ? 'my-' + s : s); };
  DC.acts['h-cap'] = function (b) { st.sec = ROLE.chief ? 'my-caps' : 'caps'; st.screen = 'cap'; st.cap = b.getAttribute('data-cap'); st.tab = 'passport'; DC.LEVELS.forEach(function (l) { DC.loadTable(st.cap, l[0]); }); DC.paint(true); window.scrollTo(0, 0); };
  DC.acts['h-proj'] = function (b) { st.proj = b.getAttribute('data-id'); DC.goSec(ROLE.chief ? 'my-projects' : 'projects'); };
  DC.acts['h-new'] = function () { st.sec = ROLE.chief ? 'my-caps' : 'caps'; DC.newCapsule(); };

  /* ── разделы ── */
  function wrap(title, sub, body) { return head(title, sub) + body; }
  function reg(id, fn) { DC.sections[id] = fn; if (ROLE.chief) DC.sections['my-' + id] = fn; }
  if (ROLE.chief) { DC.sections.home = viewChiefHome; DC.sections['my-home'] = function () { return viewHome(me()); }; DC.sections.allprojects = function () { return viewProjects(null); }; DC.sections.designers = viewDesigners; }
  else DC.sections.home = function () { return viewHome(me()); };
  reg('projects', function () { return viewProjects(me()); });
  reg('prices', function () { return wrap('Цены', 'Ваши ставки за дизайн-проект по капсуле и дополнительные услуги.', viewPrices(me())); });
  reg('money', function () { return wrap('Выплаты', 'Начисления и выплаты.', viewMoney(me())); });
  reg('docs', function () { return wrap('Документы', 'Договор, акты, чеки, реквизиты и регламент.', viewDocs(me())); });
  reg('profile', function () { return wrap('Профиль', 'Так вас увидят клиенты в разделе «Строители, дизайнеры и мастера».', viewProfile(me())); });

  /* ── правки полей ── */
  var root = document.getElementById('da-root');
  function img(file, max) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .8)); }; im.onerror = function () { ok(''); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
  root.addEventListener('change', function (e) {
    var t = e.target, g = function (a) { return t.getAttribute(a); }, list = function (v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
    if (g('data-pj')) {
      var p = byId(g('data-id')), f = g('data-pj'), n = Number(g('data-n')); if (!p) return;
      if (f === 'chiefNote') { if (!ROLE.chief) return; p.chiefNote = t.value.trim(); save(); ui.toast('Комментарий сохранён'); return; }
      if (p.designer !== me()) return;
      if (f === 'wait') p.wait = t.checked; else if (f === 'done') p.stages[n].done = t.checked; else if (f === 'due') p.stages[n].due = t.value; else if (f === 'note') p.stages[n].note = t.value.trim();
      else if (f === 'file') Array.prototype.forEach.call(t.files || [], function (x) { p.stages[n].files.push(x.name); });
      save(); DC.paint(); return;
    }
    if (g('data-pr')) { var v = t.value.trim().replace(/\s/g, ''); price(me()).tariffs[g('data-t')][g('data-pr')] = g('data-pr') === 'rate' ? (Number(v) > 0 ? Number(v) : '') : v; save(); DC.paint(); return; }
    if (g('data-ex')) { var pl = price(me()), ln = g('data-l') || 'extras'; pl[ln] = pl[ln] || []; pl[ln][Number(g('data-i'))][g('data-ex')] = t.value.trim(); save(); DC.paint(); return; }
    if (g('data-pp')) { var pf = profile(me()), k = g('data-pp'); pf[k] = k === 'accepting' ? t.checked : (k === 'cities' || k === 'tags') ? list(t.value) : t.value.trim(); save(); DC.paint(); return; }
    if (g('data-pfile') === 'workadd') {
      var pfa = profile(me()), wa = works(pfa)[Number(g('data-i'))], fa = Array.prototype.slice.call(t.files || []); if (!wa || !fa.length) return;
      var room = 12 - wa.photos.length; if (fa.length > room) ui.toast('В проекте до 12 фото — добавлю первые ' + room);
      Promise.all(fa.slice(0, room).map(function (x) { return img(x, 560); })).then(function (urls) { wa.photos = wa.photos.concat(urls.filter(Boolean)).slice(0, 12); try { save(); } catch (er) { /* хранилище браузера полное */ } DC.paint(); });
      return;
    }
    if (g('data-pfile') === 'work') {
      var pfw = profile(me()), fl = Array.prototype.slice.call(t.files || []).slice(0, 12); if (!fl.length) return;
      Promise.all(fl.map(function (x) { return img(x, 560); })).then(function (urls) {
        urls = urls.filter(Boolean); if (!urls.length) return;
        var ws = works(pfw); ws.push({ id: 'w' + Date.now().toString(36), name: 'Проект ' + (ws.length + 1), photos: urls, cap: null });
        try { save(); } catch (er) { /* хранилище браузера полное */ } DC.paint(); offerShop(ws.length - 1, true);
      });
      return;
    }
    if (g('data-pfile')) {
      var pf2 = profile(me()), files = Array.prototype.slice.call(t.files || []);
      Promise.all(files.map(function (x) { return img(x, g('data-pfile') === 'photo' ? 240 : 560); })).then(function (urls) { urls = urls.filter(Boolean); if (g('data-pfile') === 'photo') pf2.photo = urls[0] || pf2.photo; else pf2.portfolio = pf2.portfolio.concat(urls).slice(0, 12); save(); DC.paint(); });
      return;
    }
    if (g('data-rc') != null) { var pays = desk().payouts.filter(function (x) { return x.designer === me(); }), py = pays[Number(g('data-rc'))]; if (py && t.files[0]) { py.receipt_url = t.files[0].name; save(); DC.paint(); ui.toast('Чек загружен'); } }
  });
  DC.paint();
})();
