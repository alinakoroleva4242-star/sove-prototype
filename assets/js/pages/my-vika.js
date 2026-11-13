/* Мой ремонт — главный вид my.html. Схема 05.11 (Вика: «логика непонятна, пересобрать»; Валерия: «начинай»):
   шапка (объект, баланс, значки) → 4 шага План · Интерьер · Материалы · Бюджет, каждый ведёт в свой раздел → одна кнопка «что дальше»
   → план квартиры и «Изменить план» (в Планировку) → выбранный интерьер и «Сменить» → готовые комнаты → итог бюджета.
   Убраны: «+ Создать», круг «Ремонт собран», блок «Основа квартиры» (загрузка — в Планировке), «Следующие шаги».
   Данные — SOVE.repair; пока квартира пустая — показной пример. Прежние варианты Алины B–E — по ссылке my.html?variants=1. */
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
  /* шаги: каждый ведёт в свой раздел; next — текст кнопки «что дальше», пока шаг не пройден */
  var STEPS = [
    { t: 'План', ic: 'plan', href: 'plan-demo.html', next: 'Загрузить план' },
    { t: 'Интерьер', ic: 'doc', href: 'interior.html?view=visuals&from=my', next: 'Выбрать интерьер' },
    { t: 'Материалы', ic: 'bag', href: 'interior.html?view=materials&from=my', next: 'Подобрать материалы' },
    { t: 'Бюджет', ic: 'wallet', href: 'my.html?v=budget', next: 'Посчитать бюджет' }
  ];
  var COST = (D.ai && D.ai.costs && D.ai.costs.render) || 10;

  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }

  /* всё, что рисуем, — из одной модели: настоящая квартира или пример */
  function model() {
    var f = R.flats.active();
    if (!f) return {
      demo: true, name: 'Мой ремонт', line: 'ЖК PRIDE · Москва · 47,3 м²', hero: 'assets/img/capsules/hc/k4-main-2.jpg',
      steps: [true, false, false, false], plan: PLAN_DEMO, hasPlan: true,
      rooms: [ { key: 'bed', name: 'Спальня', src: 'assets/img/demo/2-spalnya.jpg' }, { key: 'liv', name: 'Кухня-гостиная' }, { key: 'bath', name: 'Санузел' }, { key: 'hall', name: 'Прихожая' } ],
      cart: 12, fav: 6, budget: null,
      interiors: [ { name: 'Изумрудная неоклассика', capsuleId: 'k2', sub: 'капсула SOVEAPP', img: 'assets/img/capsules/wide/k2.jpg', href: 'capsule.html?id=k2', current: true } ]
    };
    var r = R.get(f.id), pr = R.progress(f.id), cartT = R.cart.totals(f.id), favN = R.fav.list(f.id).length;
    /* интерьеры квартиры (созвон 28.10): R.interiors; комнаты «в цвете» — визуализации ТЕКУЩЕГО интерьера (старые кадры без метки интерьера — тоже) */
    var ints = R.interiors ? R.interiors.list(f.id) : [], curInt = ints.filter(function (x) { return x.current; })[0] || null, curId = curInt ? curInt.id : null;
    var rooms = R.rooms(f.id).map(function (x) {
      var list = (r.rooms[x.key] || []).filter(function (i) { return !curId || !i.interiorId || i.interiorId === curId; }), main = r.rooms[x.key + ':main'], it = list.filter(function (i) { return i.id === main; })[0] || list[0];
      return { key: x.key, name: x.name, src: it ? it.src : null };
    });
    var hero = (r.interior && r.interior.img) || (rooms.filter(function (x) { return x.src; })[0] || {}).src || 'assets/img/capsules/hc/k4-main-2.jpg';
    var inter = ints.map(function (x) {
      return { id: x.id, capsuleId: x.capsuleId, name: x.title, img: x.img, href: 'interior.html?v=b&from=my', current: x.current, mine: !x.capsuleId,
        sub: x.rooms + ' ' + pl(x.rooms, ['комната', 'комнаты', 'комнат']) + ' · ' + x.renders + ' ' + pl(x.renders, ['визуализация', 'визуализации', 'визуализаций']) };
    });
    /* полный бюджет любым путём — обычный расчёт, расчёт «из Интерьера», «Узнать» в Планировке: та же цифра, что в Бюджете и полосе */
    var BC = window.SOVE_BUDGET && window.SOVE_BUDGET.current ? window.SOVE_BUDGET.current() : null,
      btot = (BC && BC.full && BC.totals && BC.totals.plan) || (r.budget && r.budget.total) || 0;
    return {
      interiors: inter,
      demo: false, name: f.name || 'Мой ремонт', line: R.flatLine(f), hero: hero,
      steps: [pr.steps[0].done, !!r.interior || R.rendersCount(f.id) > 0, favN > 0 || cartT.count > 0 || !!(r.interior && (r.interior.productIds || []).length), !!btot],
      plan: (r.plan && r.plan.img) || PLAN_DEMO, hasPlan: !!r.plan,
      rooms: rooms.sort(function (a, b) { return (b.src ? 1 : 0) - (a.src ? 1 : 0); }),
      cart: cartT.qty, fav: favN, budget: btot ? Object.assign({}, r.budget, { total: btot }) : r.budget || null
    };
  }

  /* шапка: объект, баланс и значки Корзина · Избранное · Бюджет */
  function head(m) {
    var tok = S.auth.isIn() ? F.gens(S.tokens.balance()) : F.gens(S.data.gift.tokens);
    var icons = [['my.html?v=basket', 'cart', 'Корзина', m.cart], ['favorites.html', 'heart', 'Избранное', m.fav], ['my.html?v=budget', 'wallet', 'Бюджет', m.budget ? '₽' : 0]];
    return '<section class="mv-head"><span class="mv-head__bg" style="background-image:url(\'' + esc(m.hero) + '\')" aria-hidden="true"></span>' +
      '<div class="mv-head__top"><div class="mv-head__t"><h1>' + (m.demo || m.name === 'Моя квартира' ? 'Мой ремонт' : esc(m.name)) + '</h1>' +
        '<p>' + (m.line ? esc(m.line) + ' · ' : '') + '<a href="my.html?v=object">' + (m.line ? 'Изменить' : 'Указать адрес и площадь') + '</a></p></div>' +
        '<div class="mv-head__r"><a class="mv-tok" href="tokens.html">' + esc(tok) + ' ' + G.ic('gift', 14) + '</a>' +
          '<div class="mv-icons" role="group" aria-label="Корзина, избранное и бюджет">' + icons.map(function (x) {
            return '<a class="mv-ic" href="' + x[0] + '" aria-label="' + x[2] + (x[3] ? ': ' + x[3] : '') + '">' + G.ic(x[1], 19) + (x[3] ? '<i>' + esc(String(x[3])) + '</i>' : '') + '</a>';
          }).join('') + '</div></div></div></section>';
  }

  function steps(m) {
    var cur = m.steps.indexOf(false);
    return '<nav class="mv-steps" aria-label="Шаги ремонта">' + STEPS.map(function (x, i) {
      var on = m.steps[i];
      return '<a class="mv-step' + (on ? ' is-done' : '') + (i === cur ? ' is-cur' : '') + '" href="' + x.href + '" aria-label="' + x.t + (on ? ': готово' : '') + '">' +
        '<span class="mv-step__ic">' + G.ic(on ? 'check' : x.ic, 18) + '</span><span>' + x.t + '</span></a>';
    }).join('') + '</nav>';
  }

  /* одна кнопка «что дальше»: первый непройденный шаг; всё пройдено — «Оформить закупки» (корзина) */
  function nextBtn(m) {
    var i = m.steps.indexOf(false), s = i < 0 ? { next: 'Оформить закупки', href: 'my.html?v=basket' } : STEPS[i];
    return '<a class="mv-go" href="' + s.href + '">' + esc(s.next) + G.ic('arrow', 16) + '</a>';
  }

  /* план: свой — целиком; пример — размыт, готовые комнаты в цвете. «Изменить план» — сразу на загрузку в Планировке */
  function planCard(m) {
    var demoPlan = m.plan === PLAN_DEMO, done = {};
    m.rooms.forEach(function (r) { if (r.src) done[r.key] = true; });
    var layers = m.hasPlan && demoPlan ? Object.keys(ZONE).filter(function (k) { return done[k]; }).map(function (k) {
      return '<img class="mv-plan__on" src="' + PLAN_DEMO + '" alt="" style="clip-path:' + ZONE[k].clip + '">';
    }).join('') : '';
    var labels = demoPlan ? m.rooms.filter(function (r) { return ZONE[r.key]; }).map(function (r) {
      var z = ZONE[r.key];
      return '<a class="mv-pin' + (done[r.key] ? ' is-done' : '') + '" href="' + (done[r.key] ? 'my.html?v=visual' : 'interior.html?view=visuals&from=my') + '" style="left:' + z.x + '%;top:' + z.y + '%">' + G.ic(z.ic, 14) + esc(r.name) + '</a>';
    }).join('') : '';
    var whole = m.hasPlan && !demoPlan;
    var own = m.hasPlan && !m.demo;
    return '<section class="mv-card mv-plan"><header class="mv-card__h"><div><h2>План квартиры</h2><p>' + (own ? 'Цветом — комнаты, которые уже сгенерированы' : 'Загрузите план — он появится здесь') + '</p></div>' +
      '<a class="mv-btn-line" href="plan-demo.html?up=1">' + G.ic('upload', 16) + (own ? 'Изменить план' : 'Загрузить план') + '</a></header>' +
      '<div class="mv-plan__stage' + (whole ? ' is-whole' : '') + '"><img class="mv-plan__base" src="' + esc(m.plan) + '" alt="План квартиры">' + layers + labels + '</div></section>';
  }

  /* интерьер — только выбранный, общей карточкой; «Сменить» — в Интерьер, там шторка со всеми интерьерами квартиры */
  function interiorCard(m) {
    var cur = m.interiors.filter(function (x) { return x.current; })[0];
    if (!cur) return '<section class="mv-sec" id="mv-inter"><header class="mv-sec__h"><h2>Интерьер</h2></header>' +
      '<div class="mv-card mv-empty"><p>Интерьер ещё не выбран — выберите капсулу или загрузите свой рендер</p><a class="mv-btn-line" href="interior.html?from=my">Выбрать интерьер</a></div></section>';
    var cid = cur.capsuleId, c = cid && D.capsule ? D.capsule(cid) : null;
    return '<section class="mv-sec" id="mv-inter"><header class="mv-sec__h"><h2>Интерьер</h2><a class="mv-btn-line" href="' + (m.demo ? 'interior.html?from=my' : cur.href) + '">Сменить</a></header>' +
      '<div class="mv-inter">' + S.ui.capCard(Object.assign({}, c || {}, { name: cur.name, style: '', palette: c ? c.palette : [] }),
        { tag: 'a', href: m.demo ? cur.href : 'interior.html?v=b&from=my', size: 's', img: cur.img, alt: '', price: false, meta: esc(cur.sub), badge: cur.mine ? 'МОЙ' : '', label: cur.name + ' — открыть интерьер' }) + '</div></section>';
  }

  function roomsCard(m) {
    var n = m.rooms.filter(function (r) { return r.src; }).length;
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Комнаты</h2><a href="my.html?v=visual">' + n + ' из ' + m.rooms.length + ' в цвете ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-rooms">' + m.rooms.map(function (r) {
        var img = r.src || ('assets/img/demo/' + (ROOM_IMG[r.key] || '3-kuhnya-gostinaya') + '.jpg');
        return '<div class="mv-room' + (r.src ? ' is-done' : '') + '"><span class="mv-room__pic"><img src="' + esc(img) + '" alt="' + (r.src ? esc(r.name) : '') + '" loading="lazy"></span>' +
          '<b>' + esc(r.name) + '</b>' + (r.src ? '<span class="mv-room__ok">' + G.ic('check', 14) + 'готова</span>'
            : '<a class="mv-room__gen" href="interior.html?view=visuals&from=my" aria-label="Сгенерировать ' + esc(r.name) + ' · ' + COST + ' генераций"><span>Сгенерировать</span><span>' + G.ic('plus', 10) + ' ' + COST + '</span></a>') + '</div>';
      }).join('') + '</div></section>';
  }

  /* итог бюджета — та же цифра, что в Планировке и в полосе «Бюджет» (SOVE_FLOW.budgetLayers: Мебель · Материалы · Декор · Работы) */
  function budgetCard(m) {
    var FL = window.SOVE_FLOW, B = !m.demo && FL && FL.budgetLayers ? FL.budgetLayers() : null, tot = B && B.total ? B.total : m.budget && m.budget.total;
    var rows = B && B.total ? B.parts.map(function (x) {
      return '<div class="mv-bud__r' + (x.known ? '' : ' is-off') + '"><span>' + esc(x.t) + '</span><b>' + (x.known ? F.rub(x.value) : 'позже') + '</b></div>';
    }).join('') : '';
    var empty = !m.steps[0] ? 'Появится, когда будет план' : !m.steps[1] ? 'Появится, когда выберете интерьер' : 'Ещё не посчитан';
    return '<section class="mv-sec"><header class="mv-sec__h"><h2>Бюджет</h2><a href="my.html?v=budget">' + (tot ? 'Подробнее' : 'Посчитать') + ' ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="mv-card mv-bud">' + (tot ? rows + '<div class="mv-bud__t"><span>Итого' + (B && B.known < 4 ? ' · известно ' + B.known + ' из 4' : '') + '</span><b>≈ ' + F.rub(tot) + '</b></div>'
        : '<p class="mv-bud__empty">' + empty + '</p>') + '</div></section>';
  }

  function render(root) {
    var m = model();
    document.body.removeAttribute('data-repair-strip');
    var strip = document.getElementById('rp-strip'); if (strip) strip.remove();
    root.innerHTML = '<div class="mv">' + head(m) + steps(m) + nextBtn(m) + planCard(m) + interiorCard(m) + roomsCard(m) + budgetCard(m) + '</div>';
  }
  window.SOVE_MY_HOME = function (root) {
    render(root);
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) render(root); });
  };
})();
