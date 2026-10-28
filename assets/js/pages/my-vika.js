/* Мой ремонт — главный вид my.html по макету Вики 25.10 («Ремонт оживает»): шапка с прогрессом, четыре шага,
   план квартиры (готовые комнаты в цвете, остальное размыто), комнаты, основа квартиры, «Сохранённое» и три значка
   Корзина · Избранное · Бюджет. Данные — SOVE.repair; пока квартира пустая — показной пример, как на макете.
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

  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }

  /* всё, что рисуем, — из одной модели: настоящая квартира или пример с макета */
  function model() {
    var f = R.flats.active();
    if (!f) return {
      demo: true, name: 'Мой ремонт', line: 'ЖК PRIDE · Москва · 47,3 м²', hero: 'assets/img/capsules/hc/k4-main-2.jpg',
      steps: [true, false, false, false], plan: PLAN_DEMO, hasPlan: true, level: 'developer_plan',
      rooms: [ { key: 'bed', name: 'Спальня', src: 'assets/img/demo/2-spalnya.jpg' }, { key: 'liv', name: 'Кухня-гостиная' }, { key: 'bath', name: 'Санузел' }, { key: 'hall', name: 'Прихожая' } ],
      saved: { gens: 4, budgets: 2, picks: 12 }, cart: 12, fav: 6, budget: null,
      interiors: [
        { kind: 'caps', name: 'Изумрудная неоклассика', sub: 'капсула SOVEAPP', img: 'assets/img/capsules/wide/k2.jpg', href: 'capsule.html?id=k2', fav: true },
        { kind: 'metod', name: 'Кухня в орехе и латуни', sub: 'подборка дизайнера', img: 'assets/img/capsules/hc/k2-main-1.jpg', href: 'metod.html', fav: true },
        { kind: 'mine', name: 'Мой рендер', sub: 'загружен 20.10.2026', img: 'assets/img/capsules/hc/k4-main-2.jpg', href: 'my.html?v=visual', mine: true },
        { kind: 'caps', name: 'Современный минимализм', sub: 'капсула SOVEAPP', img: 'assets/img/capsules/wide/k7.jpg', href: 'capsule.html?id=k7' }
      ],
      next: { gens: 8, budget: '2 варианта · от 1,2 млн ₽' }
    };
    var r = R.get(f.id), pr = R.progress(f.id), cartT = R.cart.totals(f.id), favN = R.fav.list(f.id).length;
    var rooms = R.rooms(f.id).map(function (x) {
      var list = r.rooms[x.key] || [], main = r.rooms[x.key + ':main'], it = list.filter(function (i) { return i.id === main; })[0] || list[0];
      return { key: x.key, name: x.name, src: it ? it.src : null };
    });
    var hero = (r.interior && r.interior.img) || (rooms.filter(function (x) { return x.src; })[0] || {}).src || 'assets/img/capsules/hc/k4-main-2.jpg';
    /* интерьеры квартиры: сохранённый мудборд, свои рендеры, дальше — капсулы SOVEAPP для выбора */
    var inter = [];
    if (r.interior) inter.push({ kind: r.interior.capsuleId ? 'caps' : 'mine', name: r.interior.name || 'Мой интерьер', sub: r.interior.capsuleId ? 'капсула SOVEAPP · выбрана' : 'мой интерьер', img: r.interior.img, href: r.interior.capsuleId ? 'capsule.html?id=' + r.interior.capsuleId : 'my.html?v=visual', fav: true, mine: !r.interior.capsuleId });
    Object.keys(r.rooms).forEach(function (k) { if (k.indexOf(':') < 0) (r.rooms[k] || []).filter(function (x) { return x.mine && x.from !== 'interior'; }).forEach(function (x) { inter.push({ kind: 'mine', name: 'Мой рендер', sub: 'загружен ' + F.dateLong(x.ts), img: x.src, href: 'my.html?v=visual', mine: true }); }); });
    ['k2', 'k7', 'k4', 'k1'].forEach(function (id) { var c = D.capsule(id); if (c && inter.length < 4 && !(r.interior && r.interior.capsuleId === id)) inter.push({ kind: 'caps', name: c.name, sub: 'капсула SOVEAPP', img: c.wide || c.cover, href: 'capsule.html?id=' + id }); });
    var gensN = R.rendersCount(f.id) + (S.gens ? S.gens.list().length : 0);
    /* полный бюджет любым путём — обычный расчёт, расчёт «из Интерьера», «Узнать» в Планировке: та же цифра, что в Бюджете и полосе */
    var BC = window.SOVE_BUDGET && window.SOVE_BUDGET.current ? window.SOVE_BUDGET.current() : null,
      btot = r.budget && r.budget.total || (BC && BC.full && BC.totals && BC.totals.plan) || 0;
    return {
      interiors: inter.slice(0, 4),
      next: { gens: gensN, budget: btot ? 'от ' + (Math.round(btot / 100000) / 10).toFixed(1).replace('.', ',') + ' млн ₽' : 'посчитать за 2 минуты' },
      demo: false, name: f.name || 'Мой ремонт', line: R.flatLine(f), hero: hero,
      steps: [pr.steps[0].done, !!r.interior || R.rendersCount(f.id) > 0, favN > 0 || cartT.count > 0 || !!(r.interior && (r.interior.productIds || []).length), !!btot],
      plan: (r.plan && r.plan.img) || PLAN_DEMO, hasPlan: !!r.plan, level: R.level(f.id),
      rooms: rooms.sort(function (a, b) { return (b.src ? 1 : 0) - (a.src ? 1 : 0); }),
      saved: { gens: R.rendersCount(f.id) + (r.interior ? 1 : 0), budgets: btot ? 1 : 0, picks: favN }, cart: cartT.qty, fav: favN, budget: r.budget || (btot ? { total: btot } : null)
    };
  }

  function head(m) {
    var done = m.steps.filter(Boolean).length, pct = Math.round(done / 4 * 100), C = 2 * Math.PI * 30;
    var ring = '<svg class="mv-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30"/><circle cx="36" cy="36" r="30" class="mv-ring__on" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
    var tok = S.auth.isIn() ? F.tokens(S.tokens.balance()) : F.tokens(50);
    var icons = [['my.html?v=basket', 'cart', 'Корзина', m.cart], ['favorites.html', 'heart', 'Избранное', m.fav], ['my.html?v=budget', 'wallet', 'Бюджет', m.budget ? '₽' : 0]];
    return '<section class="mv-head"><span class="mv-head__bg" style="background-image:url(\'' + esc(m.hero) + '\')" aria-hidden="true"></span>' +
      '<div class="mv-head__top"><div class="mv-head__t"><h1>' + (m.demo || m.name === 'Моя квартира' ? 'Мой ремонт' : esc(m.name)) + '</h1>' +
        '<p>' + (m.line ? esc(m.line) + ' · ' : '') + '<a href="my.html?v=object">' + (m.line ? 'Изменить' : 'Указать адрес и площадь') + '</a></p></div>' +
        '<div class="mv-head__r"><a class="mv-create" href="gen-new.html">' + G.ic('plus', 16) + 'Создать</a>' +
          '<a class="mv-tok" href="tokens.html">' + esc(tok) + ' ' + G.ic('gift', 14) + '</a>' +
          '<div class="mv-icons" role="group" aria-label="Корзина, избранное и бюджет">' + icons.map(function (x) {
            return '<a class="mv-ic" href="' + x[0] + '" aria-label="' + x[2] + (x[3] ? ': ' + x[3] : '') + '">' + G.ic(x[1], 19) + (x[3] ? '<i>' + esc(String(x[3])) + '</i>' : '') + '</a>';
          }).join('') + '</div></div></div>' +
      '<div class="mv-prog"><div class="mv-prog__ring">' + ring + '<span><b>' + pct + '%</b><small>готово</small></span></div>' +
        '<div class="mv-prog__t"><h2>' + (pct === 100 ? 'Ремонт собран' : 'Ремонт оживает') + '</h2><p>' + (pct === 100 ? 'Все шаги пройдены — можно оформлять закупки' : 'Заполните все шаги, чтобы увидеть полную картину вашего интерьера') + '</p></div></div></section>';
  }

  function steps(m) {
    var S4 = [['Основа квартиры', 'План квартиры', 'check'], ['Интерьер', 'Генерация интерьера', 'doc'], ['Материалы', 'Подбор материалов', 'bag'], ['Бюджет', 'Бюджет и закупки', 'wallet']];
    var HREF = ['my.html?v=object', 'sove-ai.html', 'market.html', 'my.html?v=budget'];
    var cur = m.steps.indexOf(false);
    return '<nav class="mv-steps" aria-label="Шаги ремонта">' + S4.map(function (x, i) {
      var on = m.steps[i];
      return '<a class="mv-step' + (on ? ' is-done' : '') + (i === cur ? ' is-cur' : '') + '" href="' + HREF[i] + '"' + (on ? ' aria-label="' + x[1] + ': готово"' : '') + '>' +
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
      '<a class="mv-btn-line" href="my.html?v=object">' + G.ic('upload', 16) + (own ? 'Заменить план' : 'Загрузить план') + '</a></header>' +
      '<div class="mv-plan__stage' + (whole ? ' is-whole' : '') + '"><img class="mv-plan__base" src="' + esc(m.plan) + '" alt="План квартиры">' + layers + labels + '</div></section>';
  }

  function roomsCard(m) {
    var n = m.rooms.filter(function (r) { return r.src; }).length;
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Комнаты</h2><a href="my.html?v=visual">' + n + ' из ' + m.rooms.length + ' в цвете ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-rooms">' + m.rooms.map(function (r) {
        var img = r.src || ('assets/img/demo/' + (ROOM_IMG[r.key] || '3-kuhnya-gostinaya') + '.jpg');
        return '<div class="mv-room' + (r.src ? ' is-done' : '') + '"><span class="mv-room__pic"><img src="' + esc(img) + '" alt="' + (r.src ? esc(r.name) : '') + '" loading="lazy"></span>' +
          '<b>' + esc(r.name) + '</b>' + (r.src ? '<span class="mv-room__ok">' + G.ic('check', 14) + 'готова</span>'
            : '<a class="mv-room__gen" href="interior.html?tab=rooms&room=' + encodeURIComponent(r.name) + '" aria-label="Сгенерировать ' + esc(r.name) + ' · ' + COST + ' токенов"><span>Сгенерировать</span><span>' + G.ic('plus', 10) + ' ' + COST + '</span></a>') + '</div>';
      }).join('') + '</div></section>';
  }

  function basesCard(m) {
    return '<section class="mv-sec"><header class="mv-sec__h"><div><h2>Основа квартиры</h2><p>Чем точнее основа — тем точнее бюджет</p></div><a href="my.html?v=object">Все способы ' + G.ic('arrow', 14) + '</a></header>' +
      '<div class="mv-bases">' + BASES.map(function (b) {
        var on = m.level === b.level;
        return '<a class="mv-base' + (on ? ' is-on' : '') + '" href="my.html?v=object"><span class="mv-base__ic">' + G.ic(b.ic, 16) + '</span><span class="mv-base__h"><b>' + b.t + '</b><small>' + b.s + '</small></span>' +
          '<span class="mv-base__pic"><img src="' + b.img + '" alt="" loading="lazy"></span><span class="mv-base__go">' + G.ic(on ? 'check' : 'arrow', 16) + '</span></a>';
      }).join('') + '</div></section>';
  }

  var IFILT = [['all', 'Все'], ['caps', 'Капсулы'], ['metod', 'Подборки METOD'], ['mine', 'Мои']], ifilt = 'all';
  function interiorCard(m) {
    var list = m.interiors.filter(function (x) { return ifilt === 'all' || x.kind === ifilt; });
    var savedN = m.interiors.length;
    return '<section class="mv-sec" id="mv-inter"><header class="mv-sec__h"><h2>Интерьер</h2><a href="my.html?v=visual">Сохранённое · ' + savedN + ' ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-chips" role="group" aria-label="Какие интерьеры показать">' + IFILT.map(function (f) {
        return '<button type="button" class="mv-chip' + (f[0] === ifilt ? ' is-on' : '') + '" data-ifilt="' + f[0] + '" aria-pressed="' + (f[0] === ifilt) + '">' + f[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="mv-inter"><a class="mv-up" href="gen-new.html?type=own#gn-files">' + G.ic('plus', 22) + '<b>Загрузить свой интерьер</b><small>рендер или фото</small></a>' +
      list.map(function (x) {
        return '<a class="mv-int" href="' + esc(x.href) + '"><span class="mv-int__pic"><img src="' + esc(x.img) + '" alt="" loading="lazy">' + (x.mine ? '<i class="mv-int__mine">МОЙ</i>' : '') +
          (x.fav ? '<i class="mv-int__fav" aria-label="В избранном">' + G.ic('heart', 14) + '</i>' : '') + '</span><b>' + esc(x.name) + '</b><small>' + esc(x.sub) + '</small></a>';
      }).join('') + (list.length ? '' : '<p class="mv-inter__empty">Здесь пока пусто</p>') + '</div></section>';
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
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Следующие шаги</h2></header><div class="mv-next">' + items.map(function (x) {
      return '<a class="mv-nx" href="' + x[0] + '"><span class="mv-nx__h"><span class="mv-nx__ic">' + G.ic(x[1], 18) + '</span><b>' + x[2] + '</b></span><span class="mv-nx__f">' + x[3] + '<span class="mv-nx__go">' + G.ic('arrow', 14) + '</span></span></a>';
    }).join('') + '</div></section>';
  }

  function render(root) {
    var m = model();
    document.body.removeAttribute('data-repair-strip');
    var strip = document.getElementById('rp-strip'); if (strip) strip.remove();
    root.innerHTML = '<div class="mv">' + head(m) + steps(m) + planCard(m) + roomsCard(m) + basesCard(m) + interiorCard(m) + nextCard(m) + '</div>';
  }
  window.SOVE_MY_HOME = function (root) {
    render(root);
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) render(root); });
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-ifilt]'); if (!b) return; ifilt = b.getAttribute('data-ifilt'); render(root); var sec = document.getElementById('mv-inter'); if (sec) { var f = sec.querySelector('[data-ifilt="' + ifilt + '"]'); if (f) f.focus(); } });
  };
})();
