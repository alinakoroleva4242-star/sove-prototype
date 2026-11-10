/* Мой ремонт — главный вид my.html по макету Вики 25.10 («Ремонт оживает»): шапка с прогрессом, четыре шага,
   план квартиры (готовые комнаты в цвете, остальное размыто), комнаты, основа квартиры, «Сохранённое» и три значка
   Корзина · Избранное · Бюджет. Данные — SOVE.repair; пока квартира пустая — показной пример, как на макете.
   «Интерьеры» (созвон 28.10, пп. 6–8): карточки как в Бюджете (SOVE.capsulePicker.card), по две в ряд, текущий — первым, с меткой и обводкой;
   другой — кнопкой «Сделать текущим» (остаёмся здесь); «＋ Новый интерьер» и шаг «Интерьер» открывают общее окно выбора капсулы
   (window.SOVE_MY_PICK из my.js); без окна — прежние ссылки. Загрузка плана — общее окно «Основа квартиры», вход 'my', возврат со скана сюда.
   Прежние варианты Алины B–E — по ссылке my.html?variants=1. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, R = S.repair, G = window.SOVE_GEN;
  if (!R || !G || /[?&]variants=1/.test(location.search)) return;
  window.SOVE_MY_VIKA = true;

  var PLAN_DEMO = 'assets/img/demo/1-domik-vsya-kvartira.jpg';
  /* комнаты на демо-плане (% кадра 1100×919): зона для «проявки» и место метки */
  var ZONE = {
    bed: { clip: 'inset(3% 49% 49% 7%)', x: 27, y: 27, ic: 'bed' },
    bath: { clip: 'inset(3% 13% 59% 51%)', x: 70, y: 17, ic: 'drop' },
    hall: { clip: 'inset(41% 13% 39% 51%)', x: 72, y: 51, ic: 'hanger' },
    liv: { clip: 'inset(51% 23% 2% 7%)', x: 40, y: 76, ic: 'sofa' }
  };
  var ROOM_IMG = { liv: '3-kuhnya-gostinaya', bed: '2-spalnya', bath: '4-sanuzel', hall: '5-prihozhaya' };
  var BASES = [
    { level: 'developer_plan', t: 'План застройщика', s: 'Бюджет примерно', img: 'assets/img/demo/0-planirovka-po-ankete.jpg', ic: 'plan' },
    { level: 'measured_plan', t: 'Обмерный план', s: 'Бюджет точнее', img: 'assets/img/partners/des.jpg', ic: 'doc' },
    { level: 'design_project', t: 'Дизайн-проект', s: 'Бюджет точный', img: 'assets/img/capsules/hc/k4-main-2.jpg', ic: 'sofa' }
  ];
  var COST = (D.ai && D.ai.costs && D.ai.costs.render) || 10;
  var LV = { base: 'База', premium: 'Премиум' };
  function pick() { return window.SOVE_MY_PICK || null; }
  function intHref(x) { var P = pick(); return P && P.href ? P.href(x) : 'interior.html?v=b&from=my'; }

  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }

  /* короткое имя капсулы — как в Интерьере и окне выбора (SOVE_KB), иначе из data.js; коды К1–К7 не показываем */
  function capName(id) { var P = pick(); if (P && P.name) return P.name(id); var c = D.capsule(id); return R.capName ? R.capName(id) : (c ? c.name : ''); }

  /* всё, что рисуем, — из одной модели: настоящая квартира или пример с макета.
     Пример (квартиры ещё нет) помечен «Пример» и не выдаёт себя за данные человека: без счётчиков корзины и избранного, без сумм и дат (проверка 02.11) */
  function model() {
    var f = R.flats.active();
    if (!f) return {
      demo: true, name: 'Мой ремонт', line: 'ЖК PRIDE · Москва · 47,0 м²', hero: 'assets/img/capsules/hc/k4-main-2.jpg',
      steps: [false, false, false, false], plan: PLAN_DEMO, hasPlan: true, level: null,
      rooms: [ { key: 'bed', name: 'Спальня', src: 'assets/img/demo/2-spalnya.jpg' }, { key: 'liv', name: 'Кухня-гостиная' }, { key: 'bath', name: 'Санузел' }, { key: 'hall', name: 'Прихожая' } ],
      cart: 0, fav: 0, budget: null,
      interiors: [
        { kind: 'caps', name: capName('k2'), sub: 'капсула SOVEAPP', img: 'assets/img/capsules/wide/k2.jpg', href: 'capsule.html?id=k2' },
        { kind: 'metod', name: 'Кухня в орехе и латуни', sub: 'подборка дизайнера', img: 'assets/img/capsules/hc/k2-main-1.jpg', href: 'metod.html' },
        { kind: 'mine', name: 'Свой рендер', sub: 'картинка интерьера, который нравится', img: 'assets/img/capsules/hc/k4-main-2.jpg', href: 'interior.html?v=a&from=my', mine: true },
        { kind: 'caps', name: capName('k7'), sub: 'капсула SOVEAPP', img: 'assets/img/capsules/wide/k7.jpg', href: 'capsule.html?id=k7' }
      ],
      next: { gens: 0, budget: 'посчитать за 2 минуты' }
    };
    var r = R.get(f.id), pr = R.progress(f.id), cartT = R.cart.totals(f.id), favN = R.fav.list(f.id).length;
    /* интерьеры квартиры (созвон 28.10, схема v2): список R.interiors, текущий — первым; комнаты «в цвете» — визуализации ТЕКУЩЕГО интерьера
       (старые кадры без метки интерьера — тоже) */
    var ints = R.interiors ? R.interiors.list(f.id) : [], curInt = ints.filter(function (x) { return x.current; })[0] || null, curId = curInt ? curInt.id : null;
    var rooms = R.rooms(f.id).map(function (x) {
      var list = (r.rooms[x.key] || []).filter(function (i) { return !curId || !i.interiorId || i.interiorId === curId; }), main = r.rooms[x.key + ':main'], it = list.filter(function (i) { return i.id === main; })[0] || list[0];
      return { key: x.key, name: x.name, src: it ? it.src : null };
    });
    var hero = (r.interior && r.interior.img) || (rooms.filter(function (x) { return x.src; })[0] || {}).src || 'assets/img/capsules/hc/k4-main-2.jpg';
    /* имя — без кода капсулы (R.interiors.list: name); выбранная капсула без материалов (light) — «материалы не собраны», ведёт в Интерьер собрать */
    var inter = ints.slice().sort(function (a, b) { return (b.current ? 1 : 0) - (a.current ? 1 : 0); }).map(function (x) {
      return { kind: x.capsuleId ? 'caps' : 'mine', id: x.id, name: x.name || x.title, img: x.img, href: intHref(x), current: x.current, mine: x.type === 'own',
        light: !!x.light, level: x.level || null, capsuleId: x.capsuleId || null,
        sub: x.light ? 'материалы не собраны' : x.rooms + ' ' + pl(x.rooms, ['комната', 'комнаты', 'комнат']) + ' · ' + x.renders + ' ' + pl(x.renders, ['визуализация', 'визуализации', 'визуализаций']) };
    });
    var gensN = R.rendersCount(f.id) + (S.gens ? S.gens.list().length : 0);
    /* полный бюджет любым путём — обычный расчёт, расчёт «из Интерьера», «Узнать» в Планировке: та же цифра, что в Бюджете и полосе */
    var BC = window.SOVE_BUDGET && window.SOVE_BUDGET.current ? window.SOVE_BUDGET.current() : null,
      btot = r.budget && r.budget.total || (BC && BC.full && BC.totals && BC.totals.plan) || 0;
    /* шаги «Ремонт оживает»: план квартиры — загруженный план (метры из анкеты планом не считаем); генерация интерьера —
       собранный интерьер (материалы, ДНК, своя картинка) или кадры, а не одна выбранная капсула (сверка 02.11: у пустой квартиры было «50% готово») */
    return {
      interiors: inter, curHref: curInt ? intHref(curInt) : null,
      next: { gens: gensN, budget: btot ? 'от ' + (Math.round(btot / 100000) / 10).toFixed(1).replace('.', ',') + ' млн ₽' : 'посчитать за 2 минуты' },
      demo: false, name: f.name || 'Мой ремонт', line: R.flatLine(f), hero: hero,
      steps: [!!r.plan, (!!r.interior && !(r.interior.type === 'capsule' && !r.interior.slots && !(r.interior.dna && r.interior.dna.length) && !(r.interior.productIds && r.interior.productIds.length))) || R.rendersCount(f.id) > 0, favN > 0 || cartT.count > 0 || !!(r.interior && (r.interior.productIds || []).length), !!btot],
      plan: (r.plan && r.plan.img) || PLAN_DEMO, hasPlan: !!r.plan, level: R.level(f.id),
      rooms: rooms.sort(function (a, b) { return (b.src ? 1 : 0) - (a.src ? 1 : 0); }),
      saved: { gens: R.rendersCount(f.id) + (r.interior ? 1 : 0), budgets: btot ? 1 : 0, picks: favN }, cart: cartT.qty, fav: favN, budget: r.budget || (btot ? { total: btot } : null)
    };
  }

  function head(m) {
    var done = m.steps.filter(Boolean).length, pct = Math.round(done / 4 * 100), C = 2 * Math.PI * 30;
    var ring = '<svg class="mv-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30"/><circle cx="36" cy="36" r="30" class="mv-ring__on" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
    var tok = '✦ ' + F.num(S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens);
    var icons = [['my.html?v=basket', 'cart', 'Корзина', m.cart], ['favorites.html', 'heart', 'Избранное', m.fav], ['my.html?v=budget', 'wallet', 'Бюджет', m.budget ? '₽' : 0]];
    return '<section class="mv-head"><span class="mv-head__bg" style="background-image:url(\'' + esc(m.hero) + '\')" aria-hidden="true"></span>' +
      '<div class="mv-head__top"><div class="mv-head__t"><h1>' + (m.demo || m.name === 'Моя квартира' ? 'Мой ремонт' : esc(m.name)) + '</h1>' +
        /* пример (квартиры нет): метка «Пример» и путь к своей квартире — анкета, а не пустой экран объекта */
        (m.demo ? '<p><span class="mv-demo">Пример</span> ' + esc(m.line) + ' · <a href="my.html?v=new">Добавить свою квартиру</a></p>'
          : '<p>' + (m.line ? esc(m.line) + ' · ' : '') + '<a href="my.html?v=object">' + (m.line ? 'Изменить' : 'Указать адрес и площадь') + '</a></p>') + '</div>' +
        '<div class="mv-head__r"><a class="mv-create" href="gen-new.html">' + G.ic('plus', 16) + 'Создать</a>' +
          '<a class="mv-tok" href="account.html?v=tokens">' + esc(tok) + ' ' + G.ic('gift', 14) + '</a>' +
          '<div class="mv-icons" role="group" aria-label="Корзина, избранное и бюджет">' + icons.map(function (x) {
            return '<a class="mv-ic" href="' + x[0] + '" aria-label="' + x[2] + (x[3] ? ': ' + x[3] : '') + '">' + G.ic(x[1], 19) + (x[3] ? '<i>' + esc(String(x[3])) + '</i>' : '') + '</a>';
          }).join('') + '</div></div></div>' +
      '<div class="mv-prog"><div class="mv-prog__ring">' + ring + '<span><b>' + pct + '%</b><small>готово</small></span></div>' +
        '<div class="mv-prog__t"><h2>' + (pct === 100 ? 'Ремонт собран' : 'Ремонт оживает') + '</h2><p>' + (pct === 100 ? 'Все шаги пройдены — можно оформлять закупки' : 'Заполните все шаги, чтобы увидеть полную картину вашего интерьера') + '</p></div></div></section>';
  }

  function steps(m) {
    var S4 = [['Основа квартиры', 'План квартиры', 'check'], ['Интерьер', 'Генерация интерьера', 'doc'], ['Материалы', 'Подбор материалов', 'bag'], ['Бюджет', 'Бюджет и закупки', 'wallet']];
    /* шаг «Интерьер»: не выбран — окно выбора капсулы (data-cap-pick, запасной путь — SOVE AI); выбран — открыть текущий интерьер */
    var HREF = ['my.html?v=object', m.curHref || 'sove-ai.html', 'market.html', 'my.html?v=budget'];
    var cur = m.steps.indexOf(false);
    return '<nav class="mv-steps" aria-label="Шаги ремонта">' + S4.map(function (x, i) {
      var on = m.steps[i];
      return '<a class="mv-step' + (on ? ' is-done' : '') + (i === cur ? ' is-cur' : '') + '" href="' + HREF[i] + '"' + (i === 1 && !m.curHref ? ' data-cap-pick' : '') + (on ? ' aria-label="' + x[1] + ': готово"' : '') + '>' +
        '<span class="mv-step__ic">' + G.ic(on ? 'check' : ['plan', 'doc', 'bag', 'wallet'][i], 18) + '</span><span>' + x[1].replace(' ', '<br>') + '</span></a>';
    }).join('') + '</nav>';
  }

  function planCard(m) {
    var demoPlan = m.plan === PLAN_DEMO, done = {};
    m.rooms.forEach(function (r) { if (r.src) done[r.key] = true; });
    var layers = m.hasPlan && demoPlan ? Object.keys(ZONE).filter(function (k) { return done[k]; }).map(function (k) {
      return '<img class="mv-plan__on" src="' + PLAN_DEMO + '" alt="" style="clip-path:' + ZONE[k].clip + '">';
    }).join('') : '';
    var labels = demoPlan ? m.rooms.filter(function (r) { return ZONE[r.key]; }).map(function (r) {
      var z = ZONE[r.key];
      return '<a class="mv-pin' + (done[r.key] ? ' is-done' : '') + '" href="' + (done[r.key] ? 'my.html?v=visual' : 'interior.html?tab=rooms') + '" style="left:' + z.x + '%;top:' + z.y + '%">' + G.ic(z.ic, 14) + esc(r.name) + '</a>';
    }).join('') : '';
    var whole = m.hasPlan && !demoPlan;
    var own = m.hasPlan && !m.demo;   /* как на макете: пока своего плана нет — «Заполните план…» и «Загрузить план» */
    return '<section class="mv-card mv-plan"><header class="mv-card__h"><div><h2>План квартиры</h2><p>' + (own ? 'Цветом — комнаты, которые уже сгенерированы' : 'Заполните план — и он появится здесь') + '</p></div>' +
      '<a class="mv-btn-line" href="my.html?v=object" data-plan-up>' + G.ic('upload', 16) + (own ? 'Заменить план' : 'Загрузить план') + '</a></header>' +
      '<div class="mv-plan__stage' + (whole ? ' is-whole' : '') + '"><img class="mv-plan__base" src="' + esc(m.plan) + '" alt="План квартиры">' + layers + labels + '</div></section>';
  }

  function roomsCard(m) {
    var n = m.rooms.filter(function (r) { return r.src; }).length;
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Комнаты</h2><a href="my.html?v=visual">' + n + ' из ' + m.rooms.length + ' в цвете ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-rooms">' + m.rooms.map(function (r) {
        var img = r.src || ('assets/img/demo/' + (ROOM_IMG[r.key] || '3-kuhnya-gostinaya') + '.jpg');
        return '<div class="mv-room' + (r.src ? ' is-done' : '') + '"><span class="mv-room__pic"><img src="' + esc(img) + '" alt="' + (r.src ? esc(r.name) : '') + '" loading="lazy"></span>' +
          '<b>' + esc(r.name) + '</b>' + (r.src ? '<span class="mv-room__ok">' + G.ic('check', 14) + 'готова</span>'
            : '<a class="mv-room__gen" href="interior.html?tab=rooms&room=' + encodeURIComponent(r.name) + '" aria-label="Сгенерировать ' + esc(r.name) + '"><span>Сгенерировать</span><span>' + G.ic('plus', 10) + '</span></a>') + '</div>';
      }).join('') + '</div></section>';
  }

  function basesCard(m) {
    return '<section class="mv-sec"><header class="mv-sec__h"><div><h2>Основа квартиры</h2><p>Чем точнее основа — тем точнее бюджет</p></div><a href="my.html?v=object">Все способы ' + G.ic('arrow', 14) + '</a></header>' +
      '<div class="mv-bases">' + BASES.map(function (b) {
        var on = m.level === b.level;
        return '<a class="mv-base' + (on ? ' is-on' : '') + '" href="my.html?v=object" data-plan-up="' + b.level + '"><span class="mv-base__ic">' + G.ic(b.ic, 16) + '</span><span class="mv-base__h"><b>' + b.t + '</b><small>' + b.s + '</small></span>' +
          '<span class="mv-base__pic"><img src="' + b.img + '" alt="" loading="lazy"></span><span class="mv-base__go">' + G.ic(on ? 'check' : 'arrow', 16) + '</span></a>';
      }).join('') + '</div></section>';
  }

  /* карточка интерьера — та же, что в Бюджете и окне выбора (SOVE.capsulePicker.card): картинка, имя, тип ремонта, обводка у текущего;
     без модуля — своя разметка .mv-icard на тех же токенах */
  function intCard(x, o) {
    var CP = S.capsulePicker, sub = [LV[x.level] || '', x.sub || ''].filter(Boolean).join(' · ');
    if (CP && CP.card) return CP.card({ name: x.name, img: x.img }, { active: !!o.active, badge: o.badge || '', sub: sub, foot: o.foot || '', tag: o.tag, href: o.href, attrs: o.attrs || '' });
    var inner = '<span class="mv-icard__pic"><img src="' + esc(x.img || '') + '" alt="" loading="lazy">' + (o.badge ? '<i class="mv-icard__badge">' + esc(o.badge) + '</i>' : '') + '</span>' +
      '<span class="mv-icard__b"><b>' + esc(x.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + (o.foot || '') + '</span>';
    return o.tag === 'a' ? '<a class="mv-icard' + (o.active ? ' is-on' : '') + '" href="' + esc(o.href || '#') + '" ' + (o.attrs || '') + '>' + inner + '</a>'
      : '<button type="button" class="mv-icard" ' + (o.attrs || '') + '>' + inner + '</button>';
  }
  /* «＋ Новый интерьер»: окно выбора — капсула SOVEAPP или «Свой интерьер» (свой рендер разбирает Интерьер); без окна — экран SOVE AI.
     Пока текущий интерьер — капсула без материалов, новая капсула встаёт на её место (правило одной лёгкой записи) — плитка так и называется: «Сменить капсулу» */
  function newTile(href, title, sub, icon) {
    return '<a class="mv-new" href="' + href + '" data-cap-pick>' + G.ic(icon || 'plus', 22) + '<b>' + esc(title) + '</b><small>' + esc(sub) + '</small></a>';
  }
  /* «Интерьеры» квартиры: все R.interiors, текущий первым — с меткой «Текущий», галочкой и обводкой, ведёт в Интерьер;
     другой — «Сделать текущим» (R.interiors.setCurrent, остаёмся здесь); «＋ Новый интерьер» — круг заново, прежние остаются */
  function interiorCard(m) {
    if (m.demo) return interiorCardDemo(m);
    /* выбранная капсула без материалов у объекта одна (ядро, правило одной лёгкой записи): новый выбор встаёт на её место — говорим об этом на плитке.
       Она текущая — плитка «Сменить капсулу»; она не текущая — «Новый интерьер» с подписью, чьё место займёт */
    var list = m.interiors, n = list.length, light = list.filter(function (x) { return x.light; })[0] || null;
    var tile = light && light.current ? newTile('sove-ai.html', 'Сменить капсулу', 'или добавить свой интерьер', 'swap')
      : newTile('sove-ai.html', 'Новый интерьер', light ? 'новая капсула встанет вместо «' + light.name + '» — у неё нет материалов' : 'капсула SOVEAPP или свой рендер');
    return '<section class="mv-sec" id="mv-inter"><header class="mv-sec__h"><div><h2>Интерьеры</h2><p>' + (n > 1 ? 'По текущему — материалы, визуализации и бюджет. Нажмите на другой, чтобы сделать его текущим' : n && light ? 'Капсула выбрана — материалы и визуализации под неё соберёт Интерьер' : n ? 'Можно добавить ещё один интерьер и сравнить' : 'Один объект можно проработать в нескольких интерьерах') + '</p></div></header>' +
      '<div class="cpk-grid mv-ints">' + list.map(function (x) {
        return x.current
          ? intCard(x, { active: true, badge: 'Текущий', tag: 'a', href: x.href, foot: '<span class="mv-icard__go">' + (x.light ? 'Собрать материалы ›' : 'Открыть ›') + '</span>', attrs: 'aria-label="' + esc(x.name) + ' — текущий интерьер, открыть"' })
          : intCard(x, { badge: x.mine ? 'Мой' : '', tag: 'button', foot: '<span class="mv-icard__go mv-icard__go--mk">Сделать текущим</span>', attrs: 'data-make-current="' + esc(x.id) + '" aria-label="' + esc(x.name) + ' — сделать текущим"' });
      }).join('') + tile +
      (n ? '' : '<p class="mv-inter__empty">Интерьера пока нет — выберите капсулу или загрузите свой рендер</p>') + '</div></section>';
  }
  var IFILT = [['all', 'Все'], ['caps', 'Капсулы'], ['metod', 'Подборки METOD'], ['mine', 'Мои']], ifilt = 'all';
  function interiorCardDemo(m) {
    var list = m.interiors.filter(function (x) { return ifilt === 'all' || x.kind === ifilt; });
    var savedN = m.interiors.length;
    return '<section class="mv-sec" id="mv-inter"><header class="mv-sec__h"><h2>Интерьеры</h2><a href="my.html?v=visual">Сохранённое · ' + savedN + ' ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-chips" role="group" aria-label="Какие интерьеры показать">' + IFILT.map(function (f) {
        return '<button type="button" class="mv-chip' + (f[0] === ifilt ? ' is-on' : '') + '" data-ifilt="' + f[0] + '" aria-pressed="' + (f[0] === ifilt) + '">' + f[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="cpk-grid mv-ints">' + list.map(function (x) {
        return intCard(x, { tag: 'a', href: x.href, foot: x.fav ? '<span class="mv-icard__go">' + G.ic('heart', 14) + ' в Избранном</span>' : '' });
      }).join('') + newTile('sove-ai.html', 'Новый интерьер', 'капсула SOVEAPP или свой рендер') + (list.length ? '' : '<p class="mv-inter__empty">Здесь пока пусто</p>') + '</div></section>';
  }
  function nextCard(m) {
    var thumbs = ['2-spalnya', '3-kuhnya-gostinaya', '4-sanuzel'].map(function (n) { return '<img src="assets/img/demo/' + n + '.jpg" alt="">'; }).join('');
    var who = function (n, plus) { return '<span class="mv-who">' + Array.apply(null, Array(n)).map(function () { return '<i>' + G.ic('user', 14) + '</i>'; }).join('') + (plus ? '<i class="mv-who__plus">' + G.ic('plus', 12) + '</i>' : '') + '</span>'; };
    var items = [
      ['sove-ai.html', 'sparkles', 'Генерации интерьера', '<span class="mv-thumbs">' + thumbs + (m.next.gens ? '<b>' + m.next.gens + '</b>' : '') + '</span>'],
      ['my.html?v=budget', 'coins', 'Бюджет и смета', '<span class="mv-next__chip">' + esc(m.next.budget) + '</span>'],
      ['adept.html', 'user', 'Подключить дизайнера', who(2, true)],
      ['track.html', 'case', 'Подключить строительную компанию', who(1, true)]
    ];
    /* под шагами — одна строка в раздел специалистов (саммари п. 12): без отдельной плитки, чтобы не перегружать */
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Следующие шаги</h2></header><div class="mv-next">' + items.map(function (x) {
      return '<a class="mv-nx" href="' + x[0] + '"><span class="mv-nx__h"><span class="mv-nx__ic">' + G.ic(x[1], 18) + '</span><b>' + x[2] + '</b></span><span class="mv-nx__f">' + x[3] + '<span class="mv-nx__go">' + G.ic('arrow', 14) + '</span></span></a>';
    }).join('') + '</div><a class="mv-pros" href="executors.html">' + G.ic('user', 16) + '<span>Строители, дизайнеры и мастера METOD</span>' + G.ic('chev', 14) + '</a></section>';
  }

  /* под «Интерьерами» — строки из варианта «Проявка» версии 1 (Алина 03.11): Бюджет · История генераций · подключи профи */
  var RIC = {
    budget: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M8 15h3"/>',
    orders: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    hist: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    des: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/>',
    bld: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'
  };
  function nextRows(m) {
    var bud = m.budget && m.budget.total;
    function row(href, ic, t, d, go) {
      return '<a class="mv-row" href="' + href + '"><span class="mv-row__ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + RIC[ic] + '</svg></span>' +
        '<span class="mv-row__t"><b>' + t + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</span><b class="mv-row__go">' + go + '</b></a>';
    }
    return '<section class="mv-sec mv-rows">' +
      row('my.html?v=budget', 'budget', 'Бюджет', bud ? esc(m.next.budget) + ' · сохранён здесь' : 'не посчитан · сохранится сюда', bud ? 'Открыть ›' : 'Посчитать ›') +
      /* Заказы — здесь, в Моём ремонте: покупки для этой квартиры (Алина 03.11) */
      (function () { var O = S.orders, n = O && O.list ? O.list().length : 0;
        return row('my.html?v=orders', 'orders', 'Заказы' + (n ? ' · ' + n : ''), n ? 'покупки, доставки и чаты' : 'пока нет · появятся после оплаты корзины', '›'); })() +
      row('generations.html', 'hist', 'История генераций · ' + (m.next.gens || 0), '', '›') +
      '<small class="mv-rows__note">если нужно — подключи профи, всё собранное здесь передадим</small>' +
      row('adept.html', 'des', 'Подключить дизайнера', 'готовый проект с рабочими чертежами', '›') +
      row('track.html', 'bld', 'Подключить строителей или мастеров', 'ТРЕК · стройка, закупки и приёмка', '›') +
      '</section>';
  }

  /* «Избранное» — блок из варианта «Проявка» версии 1 как есть (Алина 03.11): фильтры, «Загрузить свой интерьер»,
     сохранённые ♥ капсула / подборка METOD / мой рендер, «✦ Сгенерировать мудборд», «Все капсулы ›». Данные пока показные, как в версии 1 */
  var FAV_V1 = "<div style=\"display: flex; flex-direction: column; gap: 10px\"><div style=\"display: flex; justify-content: space-between; align-items: baseline\"><b style=\"font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 600\">Избранное</b><small style=\"font-size: 11px; color: #6B655F\">сохранённое · 4</small></div>\n<div style=\"display: flex; gap: 6px; overflow: hidden\"><span style=\"flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 15px; display: flex; align-items: center; font-size: 11px; font-weight: 700; background: #1E1C1A; color: #FFFFFF\">Все</span><span style=\"flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 15px; display: flex; align-items: center; font-size: 11px; font-weight: 700; background: #FFFFFF; border: 1px solid #E6DCD0\">Капсулы</span><span style=\"flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 15px; display: flex; align-items: center; font-size: 11px; font-weight: 700; background: #FFFFFF; border: 1px solid #E6DCD0\">Подборки METOD</span><span style=\"flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 15px; display: flex; align-items: center; font-size: 11px; font-weight: 700; background: #FFFFFF; border: 1px solid #E6DCD0\">Мои</span></div>\n<div style=\"display: flex; gap: 8px; overflow: hidden; margin-right: -12px\"><a href=\"interior.html?v=a\" style=\"flex: 0 0 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border-radius: 14px; border: 1.5px dashed #D9B8A5; background: #FBF4EF; text-decoration: none; color: #1E1C1A; text-align: center; padding: 8px\"><span style=\"color: #A24E32\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 16V4M7 9l5-5 5 5\"/><path d=\"M4 16v4h16v-4\"/></svg></span><b style=\"font-size: 11px; line-height: 1.2\">Загрузить свой интерьер</b><small style=\"font-size: 9px; color: #8A7F74\">рендер или фото</small></a><a href=\"capsules.html\" style=\"flex: 0 0 132px; display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; background: #FFFFFF; text-decoration: none; color: #1E1C1A; box-shadow: 0 6px 16px rgba(120,80,50,.08)\"><span style=\"position: relative; height: 110px; background: url(assets/img/moy-remont/k2.jpg) center / cover\"><span style=\"position: absolute; left: 6px; top: 6px; font-size: 8px; font-weight: 800; letter-spacing: 1px; padding: 3px 6px; border-radius: 5px; background: rgba(255,255,255,.94)\">КАПСУЛА</span><span style=\"position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; border-radius: 11px; background: rgba(255,255,255,.94); color: #A24E32; font-size: 11px; display: flex; align-items: center; justify-content: center\">♥</span></span><span style=\"padding: 8px 9px 10px; display: flex; flex-direction: column; gap: 2px\"><b style=\"font-size: 11px; line-height: 1.2\">Изумрудная неоклассика</b><small style=\"font-size: 9px; color: #8A7F74\">капсула SOVE</small></span></a><a href=\"favorites.html\" style=\"flex: 0 0 132px; display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; background: #FFFFFF; text-decoration: none; color: #1E1C1A; box-shadow: 0 6px 16px rgba(120,80,50,.08)\"><span style=\"position: relative; height: 110px; background: url(assets/img/moy-remont/k2-kitchen.jpg) center / cover\"><span style=\"position: absolute; left: 6px; top: 6px; font-size: 8px; font-weight: 800; letter-spacing: 1px; padding: 3px 6px; border-radius: 5px; background: rgba(255,255,255,.94)\">METOD</span><span style=\"position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; border-radius: 11px; background: rgba(255,255,255,.94); color: #A24E32; font-size: 11px; display: flex; align-items: center; justify-content: center\">♥</span></span><span style=\"padding: 8px 9px 10px; display: flex; flex-direction: column; gap: 2px\"><b style=\"font-size: 11px; line-height: 1.2\">Кухня в орехе и латуни</b><small style=\"font-size: 9px; color: #8A7F74\">подборка дизайнера</small></span></a><a href=\"interior.html?v=a\" style=\"flex: 0 0 132px; display: flex; flex-direction: column; border-radius: 14px; overflow: hidden; background: #FFFFFF; text-decoration: none; color: #1E1C1A; box-shadow: 0 6px 16px rgba(120,80,50,.08)\"><span style=\"position: relative; height: 110px; background: url(assets/img/moy-remont/k1-living.jpg) center / cover\"><span style=\"position: absolute; left: 6px; top: 6px; font-size: 8px; font-weight: 800; letter-spacing: 1px; padding: 3px 6px; border-radius: 5px; background: rgba(255,255,255,.94)\">МОЙ</span><span style=\"position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; border-radius: 11px; background: rgba(255,255,255,.94); color: #A24E32; font-size: 11px; display: flex; align-items: center; justify-content: center\">♥</span></span><span style=\"padding: 8px 9px 10px; display: flex; flex-direction: column; gap: 2px\"><b style=\"font-size: 11px; line-height: 1.2\">Мой рендер</b><small style=\"font-size: 9px; color: #8A7F74\">загружен 20.10</small><b style=\"font-size: 9px; color: #A24E32; margin-top: 3px\">✦ Сгенерировать мудборд</b></span></a></div>\n<div style=\"display: flex; justify-content: space-between; align-items: center\"><small style=\"font-size: 9px; color: #8A7F74; max-width: 70%\">сюда попадает всё, что ты сохранил ♥ в Капсулах, Ленте METOD и SOVE AI</small><a href=\"capsules.html\" style=\"font-size: 11px; font-weight: 700; color: #A24E32; text-decoration: none\">Все капсулы ›</a></div></div>";
  function favCarousel() { return '<section class="mv-sec mv-fav1">' + FAV_V1 + '</section>'; }

  function render(root) {
    var m = model();
    /* внизу — плашка «Корзина · Избранное · Бюджет», как в версии 1 (Алина 03.11) */
    document.body.setAttribute('data-repair-strip', ''); if (R.renderStrip) R.renderStrip();
    root.innerHTML = '<div class="mv">' + head(m) + steps(m) + planCard(m) + roomsCard(m) + basesCard(m) + interiorCard(m) + favCarousel() + nextRows(m) + '</div>';
  }
  window.SOVE_MY_HOME = function (root) {
    render(root);
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) render(root); });
    /* my.html#mv-inter («Все интерьеры · N» с экрана объекта): страница рисуется скриптом — к секции прокручиваем сами, один раз */
    if (location.hash === '#mv-inter') { var sec0 = document.getElementById('mv-inter'); if (sec0) setTimeout(function () { sec0.scrollIntoView({ block: 'start', behavior: 'instant' }); }, 0); }
    /* «Загрузить план» и плитки основы — общее окно «Основа квартиры» (plan-upload.js, созвон 28.10): вход 'my' — все четыре карточки,
       после «Распознать комнаты» скан Планировки возвращает сюда; без модуля — прежний экран объекта */
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-plan-up]'); if (!a || !S.planUpload) return;
      e.preventDefault(); S.planUpload.open({ entry: 'my', level: a.getAttribute('data-plan-up') || null, returnTo: 'my.html' });
    });
    /* «＋ Новый интерьер» и шаг «Интерьер» — общее окно выбора на месте; без окна (или Ctrl/Cmd-клик) — обычная ссылка */
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-cap-pick]'), P = pick(); if (!a || !P || !S.capsulePicker || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      P.open({ own: true, onPick: function () { var c = root.querySelector('#mv-inter .is-on'); if (c) try { c.focus({ preventScroll: true }); } catch (x) {} } });
    });
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-ifilt]'); if (!b) return; ifilt = b.getAttribute('data-ifilt'); render(root); var sec = document.getElementById('mv-inter'); if (sec) { var f = sec.querySelector('[data-ifilt="' + ifilt + '"]'); if (f) f.focus(); } });
    /* другой интерьер квартиры → «Сделать текущим» (R.interiors.setCurrent): остаёмся в Моём ремонте — карточка встаёт первой с меткой «Текущий»,
       полоска объекта и бюджет — по нему; прежний остаётся со своими материалами и визуализациями. Тост — «Открыть» в Интерьер */
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-make-current]'); if (!b || !R.interiors) return;
      var id = b.getAttribute('data-make-current'), it = R.interiors.list().filter(function (x) { return x.id === id; })[0]; if (!it) return;
      S.ui.confirm({ title: 'Сделать текущим?', text: '«' + it.name + '» станет текущим интерьером квартиры: материалы, визуализации и бюджет — по нему. Прежний останется со своими материалами и визуализациями.',
        ok: 'Сделать текущим', onOk: function () {
          R.interiors.setCurrent(id);
          var now = R.interiors.list().filter(function (x) { return x.id === id; })[0] || it;
          R.toast('Текущий интерьер — «' + now.name + '»', { label: 'Открыть', href: intHref(now) });
          setTimeout(function () { var c = root.querySelector('#mv-inter .is-on'); if (c) try { c.focus({ preventScroll: true }); } catch (x) {} }, 0);
        } });
    });
  };
})();
