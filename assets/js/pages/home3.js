/* Главная приложения: расчёт Скаута, разделы нынешнего сайта одной лентой.
   Прежние варианты A/B/C сведены в одну страницу; там, где подача спорная (разбор рендера),
   варианты переключаются прямо в блоке. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('home3');

  /* иконки в духе Ionicons на сайте */
  var IC = {
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8zM19 15l.6 1.6 1.6.6-1.6.6L19 19.5l-.6-1.6-1.6-.6 1.6-.6z"/>',
    bag: '<path d="M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
    albums: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M7 5h10M9 2h6"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/>',
    wand: '<path d="M4 20l10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 9l.6 1.4 1.4.6-1.4.6L19 13l-.6-1.4-1.4-.6 1.4-.6z"/>',
    build: '<path d="M14 6l4 4-9 9H5v-4zM12 8l4 4"/>',
    ribbon: '<circle cx="12" cy="8" r="5"/><path d="M9 12l-2 9 5-3 5 3-2-9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',
    handshake: '<path d="M3 11l4-4h4l3 3M21 11l-4-4h-3M7 11l5 5 2-2M10 14l2 2 3-3"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    grid: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  var IMG = { ai: 'assets/img/capsules/k6-main-1.jpg', market: 'assets/img/capsules/k2-main-2.jpg', capsules: 'assets/img/capsules/k1-kitchen.jpg', scout: 'assets/img/capsules/k4-main-1.jpg', adept: 'assets/img/capsules/k3-main-1.jpg', track: 'assets/img/capsules/k4-main-3.jpg', hero: 'assets/img/capsules/k1-main-1.jpg', metod: 'assets/img/capsules/k2-main-1.jpg' };

  /* ---------- данные разделов нынешнего сайта ---------- */
  var adeptFrom = Math.min.apply(null, D.adept.packages.map(function (p) { return p.rate; }));
  var trackFrom = Math.min.apply(null, D.scout.states.map(function (s) { return s.rate; }));
  var T = {
    ai: { k: 'ИИ генерации', t: 'SOVEAPP AI', d: 'Визуализации за секунды', href: 'sove-ai.html', ic: 'sparkles', img: IMG.ai },
    fit: { k: 'Примерка', t: 'Вещь в вашей комнате', d: 'Фото комнаты — и товар встаёт в кадр', href: 'fit.html', ic: 'sparkles', img: 'assets/img/slides/k5-living-1.jpg' },
    market: { k: 'Скидки партнёров', t: 'SOVEAPP маркет', d: 'Закрытые цены партнёров', href: 'market.html', ic: 'bag', img: IMG.market },
    capsules: { k: 'Вдохновение', t: 'Капсулы', d: 'Готовые интерьеры с названиями', href: 'capsules.html', ic: 'albums', img: IMG.capsules },
    adept: { k: 'Дизайн-проект', t: 'АДЕПТ', d: 'Капсула в дизайн-проект', href: 'adept.html', ic: 'wand', img: IMG.adept, lock: true, price: 'от ' + F.rub(adeptFrom) + '/м²' },
    track: { k: 'Ремонт под ключ', t: 'ТРЕК', d: 'От проекта до ключей', href: 'track.html', ic: 'build', img: IMG.track, lock: true, price: 'работы от ' + F.rub(trackFrom) + '/м²' },
    metod: { k: 'Подписка', t: 'METOD', d: 'Клуб и скидки партнёров', href: 'metod.html', ic: 'ribbon', lock: true, img: IMG.metod, price: 'от ' + F.rub(D.metodPlans[0].price) + ' в месяц' },
    about: { k: 'Экосистема', t: 'О\u00a0SOVE', d: 'Как всё устроено', href: 'about.html', ic: 'info', img: 'assets/img/capsules/k5-main-1.jpg' }
  };
  var PART = [ { t: 'Стать партнёром', d: 'Поставщикам и брендам', href: 'partner.html', ic: 'handshake' }, { t: 'Разместить капсулу', d: 'Дизайнерам: заявки на Адепт', href: 'partner.html?who=designer', ic: 'home' } ];

  /* ---------- Скаут на главной: кадр квартиры тянется за ползунком площади ---------- */
  var capsK = D.capsules.filter(function (c) { return !c.soon && !c.designer && c.pricePerM2; });
  var minKit = Math.min.apply(null, capsK.map(function (c) { return c.pricePerM2; })), maxKit = Math.max.apply(null, capsK.map(function (c) { return c.pricePerM2; }));
  var rates = D.scout.states.map(function (x) { return x.rate; }), minRate = Math.min.apply(null, rates), maxRate = Math.max.apply(null, rates);
  function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
  /* во сколько раз комплект дороже без подписки: считаем по товарам капсул */
  var sumRetail = 0, sumMetod = 0;
  D.products.forEach(function (p) { if (p.capsules && p.capsules.length) { sumRetail += p.retail; sumMetod += p.metod; } });
  var noMetodK = sumMetod ? sumRetail / sumMetod : 1.2;
  function rangeFor(a) { return mln((minRate + minKit) * a) + '–' + mln((maxRate + maxKit) * a) + '\u00a0млн\u00a0₽'; }
  function rangeRetail(a) { return mln((minRate + minKit * noMetodK) * a) + '–' + mln((maxRate + maxKit * noMetodK) * a) + '\u00a0млн\u00a0₽'; }
  function scoutHTML() {
    return '<section class="sc-card sc-card--home fview" id="scout-card" aria-label="Скаут: расчёт бюджета">' +
      '<div class="fview__stage" id="flat-stage" aria-hidden="true">' +
        '<img class="fview__l" id="flat-a" alt=""><img class="fview__l" id="flat-b" alt="">' +
        '<span class="fview__badge" id="flat-badge"></span><span class="fview__dots" id="flat-dots"></span>' +
      '</div>' +
      '<div class="fview__body"><span class="sc-card__k">Скаут · расчёт бюджета</span>' +
      '<h1 class="sc-card__t">Ваш ремонт <b id="plan-sum"></b></h1>' +
      '<span class="fview__sum"><span id="plan-area"></span></span>' +
      '<label class="plan__range"><span class="plan__val" id="plan-val"></span>' +
        '<input type="range" id="plan-range" min="36" max="84" step="1" value="45" aria-label="Площадь квартиры">' +
        '</label>' +
      '<div class="fview__sw" role="group" aria-label="Цена с подпиской или без">' +
        '<button type="button" class="fview__sw-b is-on" data-metod="1">С подпиской METOD</button>' +
        '<button type="button" class="fview__sw-b" data-metod="0">Без подписки</button>' +
      '</div>' +
      '<span class="fview__nometod" id="plan-alt"></span>' +
      '<a class="btn btn--primary fview__go" id="plan-go" href="scout.html">Уточнить</a></div></section>';
  }
  /* сколько экономит подписка на той же площади: разница розницы и цен METOD */
  function saving(a) {
    var lo = mln((minKit * noMetodK - minKit) * a), hi = mln((maxKit * noMetodK - maxKit) * a);
    return (lo === hi ? lo : lo + '–' + hi) + '\u00a0млн\u00a0₽';
  }
  var withMetod = true;

  function bindScout() {
    /* пять рендеров одной капсулы: картинка тянется вместе с ползунком, между кадрами — переход */
    /* кадры берём из капсулы, а не из сухих планов квартир: человек видит интерьер, а не схему */
    var SHOTS = [ { a: 36, src: 'assets/img/capsules/k6-hall-1.jpg', n: 'студия' }, { a: 45, src: 'assets/img/capsules/k6-bed-1.jpg', n: '1-комн.' },
                  { a: 65, src: 'assets/img/capsules/k6-main-1.jpg', n: '2-комн.' }, { a: 76, src: 'assets/img/capsules/k6-main-3.jpg', n: '3-комн.' }, { a: 84, src: 'assets/img/capsules/k6-main-4.jpg', n: '3-комн.' } ];
    SHOTS.forEach(function (s) { var i = new Image(); i.src = s.src; });
    var stage = document.getElementById('flat-stage'), range = document.getElementById('plan-range');
    var imgA = document.getElementById('flat-a'), imgB = document.getElementById('flat-b');
    var badge = document.getElementById('flat-badge'), dots = document.getElementById('flat-dots');
    dots.innerHTML = SHOTS.map(function () { return '<i></i>'; }).join('');
    var my = S.my.get(); if (my.area) range.value = Math.min(84, Math.max(36, my.area));
    var pair = -1;

    function segment(a) {
      var i = 0; while (i < SHOTS.length - 2 && a >= SHOTS[i + 1].a) i++;
      var from = SHOTS[i], to = SHOTS[i + 1];
      return { i: i, from: from, to: to, t: Math.max(0, Math.min(1, (a - from.a) / (to.a - from.a))) };
    }
    function setPair(seg) {
      if (pair === seg.i) return;
      pair = seg.i; imgA.src = seg.from.src; imgB.src = seg.to.src;
    }
    function paint(seg) {
      /* переход занимает середину пути: кадр держится чётким, смена быстрая и заметная */
      var t = seg.t, k = Math.max(0, Math.min(1, (t - 0.34) / 0.32)), e = k * k * (3 - 2 * k);
      var blur = (2.6 * Math.sin(Math.PI * k)).toFixed(2);
      imgA.style.opacity = String(Math.max(0, 1 - e * 1.4));
      imgA.style.transform = 'scale(' + (1 + 0.16 * e).toFixed(3) + ') translateX(' + (-4 * e).toFixed(2) + '%)';
      imgA.style.filter = 'blur(' + blur + 'px)';
      imgB.style.opacity = String(Math.min(1, e * 1.4));
      imgB.style.transform = 'scale(' + (1.16 - 0.16 * e).toFixed(3) + ') translateX(' + (4 * (1 - e)).toFixed(2) + '%)';
      imgB.style.filter = 'blur(' + blur + 'px)';
    }
    function update() {
      var a = Number(range.value), seg = segment(a);
      setPair(seg); paint(seg);
      document.getElementById('plan-sum').textContent = withMetod ? rangeFor(a) : rangeRetail(a);
      document.getElementById('plan-alt').textContent = withMetod
        ? 'без подписки — ' + rangeRetail(a)
        : 'с подпиской METOD — ' + rangeFor(a) + ', экономия ' + saving(a);
      var near = seg.t < 0.5 ? seg.from : seg.to;
      var capName1 = (D.capsule('k1') || {}).name || '';
      document.getElementById('plan-area').textContent = (withMetod ? 'с подпиской METOD · ' : 'по розничным ценам · ') + near.n + ' · ' + capName1;
      fitHead();
      var val = document.getElementById('plan-val');
      if (val) {
        val.textContent = a + ' м²';
        var k = (a - 36) / (84 - 36);
        val.style.left = 'calc(' + (k * 100).toFixed(1) + '% + ' + (11 - k * 22).toFixed(1) + 'px)';  /* поправка на ширину бегунка */
      }
      document.getElementById('plan-go').href = 'scout.html?area=' + a;
      badge.textContent = a + ' м²';
      dots.querySelectorAll('i').forEach(function (d, i) { d.classList.toggle('is-on', SHOTS[i] === near); });
    }
    /* размытие живёт только во время движения: замер — показываем ближайший кадр чётко */
    var settleT = null;
    function settle() {
      var seg = segment(Number(range.value)), near = seg.t < 0.5 ? imgA : imgB;
      [imgA, imgB].forEach(function (im) {
        im.style.filter = 'blur(0px)';
        im.style.opacity = im === near ? '1' : '0';
        im.style.transform = im === near ? 'scale(1)' : im.style.transform;
      });
    }
    /* заголовок с суммой держим в одну строку: подбираем самый крупный кегль, который влезает */
    function fitHead() {
      var head = document.querySelector('.sc-card--home .sc-card__t');
      if (!head) return;
      var size = 20;
      head.style.fontSize = size + 'px';
      while (size > 12 && head.scrollWidth > head.clientWidth + 1) { size -= 0.5; head.style.fontSize = size + 'px'; }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHead);
    window.addEventListener('resize', fitHead);

    var sw = document.querySelector('.fview__sw');
    if (sw) sw.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-metod]'); if (!btn) return;
      withMetod = btn.getAttribute('data-metod') === '1';
      sw.querySelectorAll('.fview__sw-b').forEach(function (b) {
        b.classList.toggle('is-on', b === btn);
      });
      update();
    });

    range.addEventListener('input', function () {
      update();
      clearTimeout(settleT);
      settleT = setTimeout(settle, 200);
    });
    setTimeout(settle, 60);
    document.getElementById('plan-go').addEventListener('click', function () { S.my.set({ area: Number(range.value) }); });
    update();
  }

  /* ---------- общие кусочки ---------- */
  function tile(x, cls) {
    return '<a class="tile' + (x.dark ? ' tile--dark' : '') + (cls ? ' ' + cls : '') + '" href="' + x.href + '">' + (x.img ? '<img src="' + x.img + '" alt="" loading="lazy">' : '') +
      (x.lock ? '<span class="tile__lock">' + ic('lock', 14) + '</span>' : '') +
      '<span class="tile__k">' + esc(x.k) + '</span><span class="tile__t">' + ic(x.ic, 20) + esc(x.t) + '</span><span class="tile__d">' + esc(x.d) + '</span></a>';
  }
  /* поиск товара и камера — в каждой версии главной */
  function searchHTML() {
    return '<form class="search hsearch" role="search" action="market.html" method="get"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>' +
      '<label class="vh" for="home-q">Поиск товара</label><input id="home-q" name="q" type="search" placeholder="Найти товар" autocomplete="off" enterkeyhint="search">' +
      '<a class="hsearch__cam" href="ai.html?mode=photo" aria-label="Найти товар по фото" title="Найти товар по фото"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></a></form>';
  }
  /* карусель капсул — выбор интерьера для баннера Адепта, стоит под ним */
  function capsLane() {
    var caps = D.capsules.filter(function (c) { return !c.soon; }).slice(0, 6);
    return '<section class="feed feed--caps"><div class="feed__head"><h2 class="h2">Выберите интерьер</h2><a class="btn btn--link" href="capsules.html">Все интерьеры</a></div><div class="lane" id="caps-lane">' +
      caps.map(function (c, i) {
        return '<button class="capc" type="button" data-cap="' + c.id + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' +
          '<span class="capc__pic"><img src="' + c.cover + '" alt="" loading="lazy"><b>' + esc(c.name) + '</b></span>' +
          '<span>от ' + F.rub(c.pricePerM2) + '/м²</span></button>';
      }).join('') +
      '</div></section>';
  }
  /* вход в воронку Адепта: баннер монтируется после отрисовки */
  function adeptSlot() { return '<section class="feed feed--adept"><div id="home-adept"></div></section>'; }
  /* маркет внизу главной: товары сеткой, а не каруселью — это главный раздел */
  /* подпись с ценой у краёв кадра обрезается — прижимаем её внутрь рамки */
  function boxCls(o) {
    return (o.box[1] + o.box[3] > 88 ? ' is-low' : '') +
      (o.box[0] < 12 ? ' is-left' : o.box[0] + o.box[2] > 88 ? ' is-right' : '');
  }
  /* разбор рендера: кадр с рамками на предметах, выбор своего кадра или чужого */
  function renderBlock() {
    var R = D.ai.renderSample, OBJ = R.objects;
    function pm(o) { var p = D.product(o.items[0].id); return p ? p.metod : 0; }
    function pr(o) { var p = D.product(o.items[0].id); return p ? p.retail : 0; }
    var sum = OBJ.reduce(function (a, o) { return a + pm(o); }, 0);
    var ret = OBJ.reduce(function (a, o) { return a + pr(o); }, 0);
    var MARKS = D.ai.renderMarks || {};
    /* кадр для ленты берём тот, на котором размечены предметы, иначе первый слайд капсулы */
    function capSrc(c) { return (MARKS[c.id] || {}).src || c.slides[0].src; }
    var caps = D.capsules.filter(function (c) { return !c.soon && c.slides && c.slides.length; });
    return '<section class="feed feed--render"><div class="rnd">' +
      '<div class="rnd__head"><span class="rnd__k">Есть проект от дизайнера?</span>' +
      '<b class="rnd__t">Принесите рендеры — проверим смету</b>' +
      '<span class="rnd__d">Найдём те же вещи у партнёров и покажем, где переплата</span></div>' +
      '<div class="rnd__stage"><img src="' + R.src + '" alt="Рендер интерьера с отмеченными предметами">' +
        OBJ.map(function (o, i) {
          return '<button type="button" class="rnd__box' + boxCls(o) + '" data-obj="' + i + '" aria-label="' + esc(o.name) + ', ' + F.rub(pm(o)) + '"' +
            ' style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%;--i:' + i + '">' +
            '<i>' + o.n + '</i><em>' + F.rub(pm(o)) + '</em></button>';
        }).join('') +
        '<span class="rnd__sum" data-full="' + OBJ.length + ' предмета · ' + F.rub(sum) + ' с METOD">' + OBJ.length + ' предмета · ' + F.rub(sum) + ' с METOD <s>' + F.rub(ret) + '</s></span>' +
      '</div>' +
      '<div class="rnd__card" id="rnd-card"><span class="rnd__hint">Наведите на предмет — покажем, что это за вещь и почём</span></div>' +
      '<div class="rnd__pick"><label class="rnd__own"><input type="file" accept="image/*" hidden data-render-file><b>Мой рендер</b><span>из галереи или камерой</span></label>' +
        '<button type="button" class="rnd__ex is-on" data-cap="' + R.capsule + '" data-src="' + R.src + '"><img src="' + R.src + '" alt="" loading="lazy"><span>' + esc(capName(R.capsule)) + '</span></button>' +
        caps.filter(function (c) { return c.id !== R.capsule; }).map(function (c) {
          return '<button type="button" class="rnd__ex" data-cap="' + c.id + '" data-src="' + capSrc(c) + '"><img src="' + capSrc(c) + '" alt="" loading="lazy"><span>' + esc(c.name) + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="rnd__foot"><a class="btn btn--primary btn--block" href="ai.html?mode=render">Проверить смету</a>' +
      '<span class="rnd__note">разбор рендера — 10 токенов, поиск по фото предмета бесплатно</span></div>' +
      '</div></section>';
  }
  /* разбор рендера, вариант B: один предмет опознан бесплатно, остальные — по кнопке */
  function renderOne() {
    var R = D.ai.renderSample, OBJ = R.objects, o = OBJ[1];
    var p = D.product(o.items[0].id);
    var cap = p && p.capsules && p.capsules.length ? D.capsule(p.capsules[0]) : null;
    return '<section class="feed feed--render"><div class="rnd rnd--one">' +
      '<div class="rnd__head"><span class="rnd__k">SOVEAPP AI · разбор рендера</span>' +
      '<b class="rnd__t">Один предмет узнаём бесплатно</b>' +
      '<span class="rnd__d">Загрузите рендер — покажем вещь и цену у партнёров. Полный разбор кадра — по токенам.</span></div>' +
      '<div class="rnd__stage"><img src="' + R.src + '" alt="Рендер интерьера, один предмет отмечен">' +
        '<span class="rnd__box is-on" style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%"><i>1</i></span>' +
        '<span class="rnd__sum">в кадре ещё ' + (OBJ.length - 1) + ' предмета</span></div>' +
      (p ? '<div class="rnd__card"><a class="rnd__prod" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="">' +
        '<span class="rnd__pbody"><b>' + esc(p.name) + '</b>' +
        '<i>' + F.rub(p.metod) + ' с METOD <s>' + F.rub(p.retail) + '</s></i>' +
        '<u>' + esc(o.name) + (cap ? ' · из капсулы «' + esc(cap.name) + '»' : '') + '</u></span></a>' +
        '<button type="button" class="btn btn--ghost btn--sm rnd__add" data-my-add="' + p.id + '">' +
        (S.my.hasProduct(p.id) ? 'В моём ремонте' : 'В мой ремонт') + '</button></div>' : '') +
      '<div class="rnd__foot"><a class="btn btn--primary btn--block" href="ai.html?mode=render">Полный разбор кадра</a>' +
      '<a class="btn btn--link" href="ai.html?mode=photo">Поиск по фото предмета — бесплатно</a></div>' +
      '</div></section>';
  }
  /* разбор рендера, вариант C: полосу ведут по кадру, под ней проявляются вещи и цены */
  function renderXray() {
    var R = D.ai.renderSample, OBJ = R.objects;
    return '<section class="feed feed--render"><div class="rnd rnd--xray">' +
      '<div class="rnd__head"><span class="rnd__k">SOVEAPP AI · разбор рендера</span>' +
      '<b class="rnd__t">Потяните полосу — увидите цены</b>' +
      '<span class="rnd__d">Так же разберём ваш рендер: найдём вещи у партнёров и соберём смету</span></div>' +
      '<div class="rnd__stage" id="xr-stage"><img class="xr__gray" src="' + R.src + '" alt="Рендер интерьера">' +
        '<img class="xr__color" id="xr-color" src="' + R.src + '" alt="" aria-hidden="true">' +
        OBJ.map(function (o, i) {
          var p = D.product(o.items[0].id);
          return '<span class="rnd__box xr__box" data-i="' + i + '" data-top="' + o.box[1] + '" data-bot="' + (o.box[1] + o.box[3]) + '"' +
            ' style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%">' +
            '<em>' + (p ? F.rub(p.metod) : '') + '</em></span>';
        }).join('') +
        '<span class="xr__line" id="xr-line"><i></i><b class="xr__grip" aria-hidden="true"></b></span>' +
        '<span class="rnd__sum" id="xr-sum"></span>' +
      '</div>' +
      '<div class="rnd__foot"><a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать мой рендер</a>' +
      '<span class="rnd__note">поиск по фото предмета — бесплатно</span></div>' +
      '</div></section>';
  }
  /* три подачи разбора рендера живут в одном блоке: переключатель стоит прямо над карточкой */
  var RVIEWS = [
    { id: 'frames', t: 'Рамки', make: renderBlock },
    { id: 'one', t: 'Один предмет', make: renderOne },
    { id: 'xray', t: 'Рентген', make: renderXray }
  ];
  function capName(id) { var c = D.capsule(id); return c ? c.name : ''; }
  function renderTabs() {
    return '<div class="rsw"><span class="rsw__label">Разбор рендера — вариант подачи</span>' +
      '<div class="rsw__tabs" role="tablist" aria-label="Как показываем разбор рендера">' +
      RVIEWS.map(function (v, i) {
        return '<button type="button" class="rsw__tab' + (i ? '' : ' is-on') + '" role="tab" aria-selected="' + (i ? 'false' : 'true') + '" data-rv="' + v.id + '">' + esc(v.t) + '</button>';
      }).join('') + '</div>' +
      RVIEWS.map(function (v, i) {
        return '<div class="rsw__pane' + (i ? ' is-off' : '') + '" data-rv="' + v.id + '">' + v.make() + '</div>';
      }).join('') + '</div>';
  }
  function renderArea() {
    var gen = myRender();
    if (gen) return renderStatus(gen);
    return renderTabs();
  }
  /* если разбор рендера уже запущен или готов — на главной показываем его состояние */
  function myRender() {
    var list = (S.gens && S.gens.list) ? S.gens.list().filter(function (g) { return g.kind === 'render'; }) : [];
    return list.length ? list[0] : null;
  }
  function renderStatus(gen) {
    var objs = (gen.result && gen.result.objects) || D.ai.renderSample.objects;
    var total = objs.length;
    var mine = S.my.get().productIds || [];
    var done = objs.filter(function (o) {
      return (o.items || []).some(function (it) { return mine.indexOf(it.id) >= 0; });
    }).length;
    var running = gen.status === 'running';
    return '<section class="feed feed--render"><div class="rnd rnd--cont">' +
      '<div class="rnd__row"><img class="rnd__mini" src="' + (gen.src || D.ai.renderSample.src) + '" alt="">' +
      '<span class="rnd__rbody"><span class="rnd__k">' + (running ? 'Разбор идёт' : 'Ваш разбор') + '</span>' +
      '<b>' + esc(gen.title || 'Рендер интерьера') + '</b>' +
      '<i>' + (running ? 'ищем предметы и цены — это занимает около минуты'
                       : 'из ' + total + ' предметов ' + done + ' уже в вашем ремонте') + '</i>' +
      '<span class="rnd__bar"><em style="width:' + (running ? 40 : Math.round(done / total * 100)) + '%"></em></span></span></div>' +
      '<div class="rnd__foot">' +
      (running ? '<a class="btn btn--ghost btn--block" href="generations.html">Посмотреть, как идёт</a>'
               : '<a class="btn btn--primary btn--block" href="generation.html?id=' + gen.id + '">Открыть смету</a>' +
                 '<a class="btn btn--link" href="market.html">Дособрать в маркете</a>') +
      '</div></div></section>';
  }
  /* Трек ещё не запущен: баннер со словом «Скоро» ведёт на ознакомительную страницу */
  function trackSoon() {
    return '<section class="feed feed--track"><a class="soon" href="track.html">' +
      '<span class="soon__pic"><img src="' + IMG.track + '" alt="" loading="lazy"><span class="soon__flag">Скоро</span></span>' +
      '<span class="soon__body"><span class="soon__k">ТРЕК · ремонт под ключ</span><b>Ремонт по вашему проекту — под присмотром</b>' +
      '<span class="soon__d">Сметы, график работ, приёмка этапов и один ответственный. Готовим запуск — посмотрите, как будет устроено.</span>' +
      '<span class="btn btn--ghost btn--sm">Как это будет</span></span></a></section>';
  }
  /* блок партнёров — общий хвост лентой */
  /* Партнёрам: пустое место в интерьере и пустая карточка в ленте капсул —
     по тапу видно, как туда встаёт товар поставщика или капсула дизайнера */
  function ownCapShot() {
    var c = D.capsules.filter(function (x) { return x.designer && x.slides && x.slides.length; })[0];
    if (!c) return D.ai.renderSample.src;
    var bed = c.slides.filter(function (sl) { return /bed/.test(sl.src); })[0];
    return (bed || c.slides[0]).src;
  }
  function partnersSlot() {
    var R = D.ai.renderSample;
    var SLOT = [56, 38, 40, 50];                                 /* свободный угол кадра — туда и встаёт вещь партнёра */
    var caps = D.capsules.filter(function (c) { return !c.soon && c.slides && c.slides.length; }).slice(0, 3);
    var clients = 3000;
    return '<div class="prt" id="prt">' +
        '<div class="prt__card" data-prt="good">' +
          '<div class="prt__stage"><img class="prt__bg" src="' + R.src + '" alt="Интерьер капсулы" loading="lazy">' +
            '<span class="prt__slot" style="--x:' + SLOT[0] + '%;--y:' + SLOT[1] + '%;--w:' + SLOT[2] + '%;--h:' + SLOT[3] + '%">' +
              '<button type="button" class="prt__plus" data-slot aria-label="Как сюда попадает товар партнёра">+</button></span>' +
          '</div>' +
          '<div class="prt__body"><span class="prt__k">Поставщикам и брендам</span>' +
            '<b>Ваш товар — внутри готовых интерьеров</b>' +
            '<i>Не строка в каталоге, а вещь в капсуле, которую собирают клиенты: ' + F.num(clients) + '+ смотрят капсулы каждый месяц</i>' +
            '<a class="btn btn--dark btn--sm" href="partner.html">Стать партнёром</a></div>' +
        '</div>' +
        '<div class="prt__card" data-prt="caps">' +
          '<div class="prt__lane">' +
            caps.map(function (c) { return '<span class="prt__cap"><img src="' + c.slides[0].src + '" alt="" loading="lazy"><em>' + esc(c.name) + '</em></span>'; }).join('') +
            '<button type="button" class="prt__cap prt__cap--empty" data-capslot aria-label="Как разместить свою капсулу">' +
              '<img src="' + ownCapShot() + '" alt="" loading="lazy"><b aria-hidden="true">+</b><em>ваша</em></button>' +
          '</div>' +
          '<div class="prt__body"><span class="prt__k">Дизайнерам</span>' +
            '<b>Ваша капсула — в общем каталоге интерьеров</b>' +
            '<i>Интерьер попадает в каталог, а заявки на проект приходят вам</i>' +
            '<a class="btn btn--dark btn--sm" href="partner.html?who=designer">Разместить капсулу</a></div>' +
        '</div>' +
      '</div>' +
      '<a class="prt__about" href="about.html"><span><b>О SOVEAPP</b><i>как устроена экосистема</i></span>' + ic('arrow', 18) + '</a>';
  }


  function partnersHTML() {
    return '<section class="feed feed--partners"><div class="feed__head"><h2 class="h2">Партнёрам</h2></div>' +
      partnersSlot() + '</section>';
  }

  /* ---------- разделы: названия и подписи дословно с родной главной сайта
       (apps/web/src/app/index.tsx, массив SECTIONS) ---------- */
  var NAV = [
    { id: 'ai', k: 'ИИ генерации', t: 'SOVEAPP AI', d: 'ИИ визуализации за секунды', href: 'sove-ai.html', ic: 'sparkles', img: 'assets/img/capsules/k3-main-3.jpg', group: 'Попробуй сразу', free: true },
    { id: 'market', k: 'Товары со скидками', t: 'SOVEAPP маркет', d: 'Закрытые акции и цены от партнёров', href: 'market.html', ic: 'bag', img: 'assets/img/capsules/k7-main-2.jpg', group: 'Попробуй сразу', free: true },
    { id: 'capsules', k: 'Вдохновение', t: 'Капсулы', d: 'Готовые решения, из которых собираешь своё', href: 'capsules.html', ic: 'albums', img: 'assets/img/capsules/k3-main-2.jpg', group: 'Вдохновись и прикинь' },
    { id: 'scout', k: 'Расчёт бюджета', t: 'Скаут', d: 'Бюджет и спецификация под твою капсулу', href: 'scout.html', ic: 'calc', img: 'assets/img/capsules/k6-main-1.jpg', group: 'Вдохновись и прикинь' },
    { id: 'adept', k: 'Дизайн-проект', t: 'АДЕПТ', d: 'Адаптация капсулы в дизайн-проект', href: 'adept.html', ic: 'wand', img: IMG.adept, lock: true, group: 'Сделай по-настоящему' },
    { id: 'track', k: 'Ремонт под ключ', t: 'ТРЕК', d: 'Бюджет — проект — реализация', href: 'track.html', ic: 'build', img: 'assets/img/capsules/k3-hall-1.jpg', lock: true, group: 'Сделай по-настоящему' },
    { id: 'metod', k: 'Подписка', t: 'METOD', d: 'Закрытый клуб с огромными возможностями', href: 'metod.html', ic: 'ribbon', img: 'assets/img/capsules/k3-bed-2.jpg', lock: true, group: 'Клуб и доверие' },
    { id: 'about', k: 'Экосистема', t: 'Об экосистеме', d: 'Как устроена экосистема выгодного ремонта', href: 'about.html', ic: 'info', img: 'assets/img/capsules/k3-hall-2.jpg', group: 'Клуб и доверие' }
  ];
  function groups() {
    var out = [], seen = {};
    NAV.forEach(function (x) { if (!seen[x.group]) { seen[x.group] = 1; out.push(x.group); } });
    return out;
  }

  /* ---------- мини-каталог маркета на главной ---------- */
  function marketGrid() {
    /* берём по кругу из разных категорий и подкатегорий: иначе наверх лезут одни светильники,
       потому что скидка 30 % есть только у них */
    var pool = D.products.filter(function (p) { return p.white; });
    var byCat = {}, cats = [];
    pool.slice().sort(function (a, b) { return b.discount - a.discount; }).forEach(function (p) {
      if (!byCat[p.category]) { byCat[p.category] = []; cats.push(p.category); }
      byCat[p.category].push(p);
    });
    var white = [], lastSub = {}, guard = 0;
    while (white.length < 6 && guard++ < 400) {
      var moved = false;
      cats.forEach(function (c) {
        if (white.length >= 6) return;
        var list = byCat[c];
        var i = 0;
        while (i < list.length && list[i].subcat === lastSub[c]) i++;   /* не две подряд из одной полки */
        if (i >= list.length) i = 0;
        if (!list.length) return;
        var p = list.splice(i, 1)[0];
        lastSub[c] = p.subcat; white.push(p); moved = true;
      });
      if (!moved) break;
    }
    var save = white.reduce(function (s2, p) { return Math.max(s2, p.retail - p.metod); }, 0);
    return '<section class="feed feed--market"><div class="feed__head"><h2 class="h2">SOVEAPP маркет</h2><a class="btn btn--link" href="market.html">Весь каталог</a></div>' +
      '<p class="feed__note">Цена поставщика и ваша цена с подпиской METOD' + (save ? ': выгода до ' + F.rub(save) + ' на одной вещи' : '') + '</p>' +
      '<div class="mk-grid">' + white.map(function (p) { return S.ui.productCard(p); }).join('') + '</div>' +
      '<a class="btn btn--ghost btn--block mk-more" href="market.html">Показать весь каталог</a></section>';
  }

  /* Акции партнёров — платное продвижение, помечено по 289-ФЗ. Три подачи на выбор. */
  var AKEY = 'sove.proto.promoView';
  var avid = 'lane';
  try { var av = localStorage.getItem(AKEY); if (av) avid = av; } catch (e) {}

  function promoCard(p) {
    return '<a class="promo-c" href="product.html?id=' + p.id + '">' +
      '<span class="promo-c__pic"><img src="' + p.img + '" alt="" loading="lazy">' +
        '<i class="promo-c__star">★</i><i class="promo-c__off">−' + p.discount + ' %</i></span>' +
      '<b>' + esc(p.name) + '</b>' +
      '<span class="promo-c__price">' + F.rub(p.metod) + '<s>' + F.rub(p.retail) + '</s></span>' +
      '<i class="promo-c__adv">Продвижение · до ' + esc(D.promo[p.id].until) + '</i></a>';
  }
  /* подача 1 — карусель со стрелками */
  function promoLane(list) {
    return '<div class="promo-wrap">' +
      '<button type="button" class="promo-nav promo-nav--prev" data-promo="-1" aria-label="Предыдущие акции">' + ic('back', 16) + '</button>' +
      '<button type="button" class="promo-nav promo-nav--next" data-promo="1" aria-label="Следующие акции">' + ic('arrow', 16) + '</button>' +
      '<div class="promo-row" id="promo-row">' + list.map(promoCard).join('') + '</div></div>';
  }
  /* подача 2 — как в каталоге: сетка обычных карточек товара */
  function promoGrid(list) {
    return '<div class="mk-grid promo-grid">' + list.slice(0, 4).map(function (p) { return S.ui.productCard(p); }).join('') + '</div>' +
      '<a class="btn btn--ghost btn--block mk-more" href="market.html?promo=1">Все акции партнёров</a>';
  }
  /* подача 3 — один товар крупно, остальные мелко */
  function promoHero(list) {
    var top = list[0], rest = list.slice(1, 4);
    if (!top) return '';
    return '<a class="promo-hero" href="product.html?id=' + top.id + '">' +
        '<span class="promo-hero__pic"><img src="' + top.img + '" alt="" loading="lazy"></span>' +
        '<span class="promo-hero__b"><i class="promo-hero__brand">' + esc(top.brand || 'партнёр') + '</i>' +
          '<b>' + esc(top.name) + '</b>' +
          '<span class="promo-c__price">' + F.rub(top.metod) + '<s>' + F.rub(top.retail) + '</s></span>' +
          '<i class="promo-c__adv">Продвижение · до ' + esc(D.promo[top.id].until) + '</i></span>' +
        '<i class="promo-hero__off">−' + top.discount + ' %</i></a>' +
      '<div class="promo-mini">' + rest.map(function (p) {
        return '<a class="promo-mini__b" href="product.html?id=' + p.id + '">' +
          '<span class="promo-mini__pic"><img src="' + p.img + '" alt="" loading="lazy"><i>−' + p.discount + ' %</i></span>' +
          '<b>' + esc(p.name) + '</b></a>';
      }).join('') + '</div>';
  }
  var AVIEWS = [
    { id: 'lane', t: 'Карусель', make: promoLane },
    { id: 'grid', t: 'Каталогом', make: promoGrid },
    { id: 'hero', t: 'Один крупно', make: promoHero }
  ];
  function promoBody() {
    var list = D.promoList().slice(0, 6);
    var v = AVIEWS.filter(function (x) { return x.id === avid; })[0] || AVIEWS[0];
    return v.make(list);
  }
  function promoShelf() {
    if (!D.promoList().length) return '';
    return '<section class="feed feed--promo"><div class="feed__head"><h2 class="h2">Акции партнёров</h2>' +
      '<a class="btn btn--link" href="market.html?promo=1">Все акции</a></div>' +
      '<p class="feed__note">Партнёры подняли эти позиции — цена держится до конца недели. Это продвижение, отмечаем честно.</p>' +
      '<div class="prt-sw" role="group" aria-label="Подача акций">' + AVIEWS.map(function (v) {
        return '<button type="button" class="prt-sw__b' + (v.id === avid ? ' is-on' : '') + '" data-av="' + v.id + '">' + esc(v.t) + '</button>';
      }).join('') + '</div>' +
      '<div id="promo-body">' + promoBody() + '</div></section>';
  }

  /* стрелки и подсветка краёв: листаем по одной карточке */
  function bindPromo() {
    var row = document.getElementById('promo-row'); if (!row) return;
    var wrap = row.parentNode;
    function edges() {
      var max = row.scrollWidth - row.clientWidth - 1;
      wrap.classList.toggle('at-start', row.scrollLeft <= 1);
      wrap.classList.toggle('at-end', row.scrollLeft >= max);
    }
    row.addEventListener('scroll', edges, { passive: true });
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-promo]'); if (!b) return;
      var card = row.firstElementChild; if (!card) return;
      var step = card.getBoundingClientRect().width + 12;
      row.scrollBy({ left: step * Number(b.getAttribute('data-promo')), behavior: 'smooth' });
    });
    edges();
  }

  /* ---------- разделы: три подачи ---------- */
  /* состав и названия разделов — как на родной главной сайта, вместе с маркетом */
  var SECS = NAV.slice();

  /* Партнёры — два входа: поставщикам и дизайнерам.
     В варианте «Список» они стоят блоком под маркетом, в «Двух главных» — рядом с разделами. */
  /* фото от команды: образец камня, чертёж планировки, каска */
  var PARTNERS = [
    { id: 'sup', t: 'Поставщикам', d: 'Товары и цены в каталог METOD', href: 'partner.html', ic: 'handshake', img: 'assets/img/partners/sup.jpg' },
    { id: 'des', t: 'Дизайнерам', d: 'Капсула в общий каталог интерьеров', href: 'partner.html?who=designer', ic: 'home', img: 'assets/img/partners/des.jpg' },
    { id: 'bld', t: 'Строителям', d: 'Объекты и бригады в Треке', href: 'partner.html?who=builder', ic: 'build', img: 'assets/img/partners/bld.jpg' }
  ];

  var PKEY = 'sove.proto.prtView';
  var pvid = 'tiles';
  try { var pv = localStorage.getItem(PKEY); if (pv) pvid = pv; } catch (e) {}

  /* подача 1 — плитки с фото */
  function prtTiles() {
    return '<div class="prt2">' + PARTNERS.map(function (x) {
      return '<a class="prt2__b" href="' + x.href + '">' +
        '<img src="' + x.img + '" alt="" loading="lazy">' +
        '<span class="prt2__t"><i>' + ic(x.ic, 15) + '</i><b>' + esc(x.t) + '</b><em>' + esc(x.d) + '</em></span></a>';
    }).join('') + '</div>';
  }
  /* подача 2 — строки с миниатюрами */
  function prtRows() {
    return '<div class="prtr">' + PARTNERS.map(function (x) {
      return '<a class="prtr__b" href="' + x.href + '">' +
        '<span class="prtr__pic"><img src="' + x.img + '" alt="" loading="lazy"></span>' +
        '<span class="prtr__body"><b>' + esc(x.t) + '</b><i>' + esc(x.d) + '</i></span>' +
        '<span class="prtr__go">' + ic('arrow', 16) + '</span></a>';
    }).join('') + '</div>';
  }
  /* подача 3 — компактные кнопки без фото */
  function prtChips() {
    /* три маленькие кнопки с фото в один ряд */
    return '<div class="prtc">' + PARTNERS.map(function (x) {
      return '<a class="prtc__b" href="' + x.href + '">' +
        '<span class="prtc__pic"><img src="' + x.img + '" alt="" loading="lazy">' +
          '<i class="prtc__ico">' + ic(x.ic, 13) + '</i></span>' +
        '<b>' + esc(x.t) + '</b></a>';
    }).join('') + '</div>';
  }

  var PVIEWS = [
    { id: 'tiles', t: 'Плитки', make: prtTiles },
    { id: 'rows', t: 'Строки', make: prtRows },
    { id: 'chips', t: 'Кнопки', make: prtChips }
  ];
  function partnersBody() {
    var v = PVIEWS.filter(function (x) { return x.id === pvid; })[0] || PVIEWS[0];
    return v.make();
  }
  /* партнёры теми же квадратами — для подачи «Квадраты» */
  function partnersSquares() {
    /* фото, а не значки: по рендеру Вики партнёрские карточки живые */
    return '<section class="feed feed--prt2"><div class="feed__head"><h3 class="h3">Партнёрам</h3></div>' +
      '<div class="prt-ph">' + PARTNERS.map(function (x) {
        return '<a class="prt-ph__b" href="' + x.href + '">' +
          '<span class="prt-ph__pic"><img src="' + x.img + '" alt="" loading="lazy"></span>' +
          '<b>' + esc(x.t) + '</b></a>';
      }).join('') + '</div></section>';
  }




  function partnersBlock() {
    return '<section class="feed feed--prt2"><div class="feed__head"><h2 class="h2">Партнёрам</h2></div>' +
      '<p class="feed__note">Поставщики дают закрытые цены, дизайнеры — капсулы, строители берут объекты. Заявка в четыре шага.</p>' +
      '<div class="prt-sw" role="group" aria-label="Подача блока партнёров">' + PVIEWS.map(function (v) {
        return '<button type="button" class="prt-sw__b' + (v.id === pvid ? ' is-on' : '') + '" data-pv="' + v.id + '">' + esc(v.t) + '</button>';
      }).join('') + '</div>' +
      '<div id="prt-body">' + partnersBody() + '</div></section>';
  }

  function sbtn(x) {
    return '<a class="sbtn" href="' + x.href + '">' +
      '<span class="sbtn__pic"><img src="' + x.img + '" alt="" loading="lazy">' +
        '<i class="sbtn__ico">' + ic(x.ic, 15) + '</i></span>' +
      '<span class="sbtn__b"><b>' + esc(x.t) + (x.lock ? '<i class="sbtn__lock">' + ic('lock', 11) + '</i>' : '') + '</b>' +
        '<i>' + esc(x.price || x.d) + '</i></span>' +
      '<span class="sbtn__go">' + ic('arrow', 16) + '</span></a>';
  }

  /* разделы идут группами с подписями — как на родной главной сайта */
  function byGroup(list) {
    var out = [], by = {};
    list.forEach(function (x) {
      if (!by[x.group]) { by[x.group] = { name: x.group, items: [] }; out.push(by[x.group]); }
      by[x.group].items.push(x);
    });
    return out;
  }
  function groupLabel(g) {
    var free = g.items.every(function (x) { return x.free; });
    return '<span class="grp__label">' + esc(g.name) + (free ? ' · бесплатно' : '') + '</span>';
  }
  function secButtons(inSheet) {
    return byGroup(SECS).map(function (g) {
      return '<section class="grp grp--btns">' + groupLabel(g) +
        '<div class="sbtns' + (inSheet ? ' sbtns--sheet' : '') + '">' + g.items.map(sbtn).join('') + '</div></section>';
    }).join('');
  }

  /* вариант 2 — те же полки, внутри сетка карточек */
  /* три подачи значка на карточке: ?ico=a кружок с новым значком, b значок у названия,
     c слово-функция плашкой. Выбор временный, для показа команде. */
  var ICO = (new URLSearchParams(location.search).get('ico')) || 'a';

  function tcard(x) {
    var lock = x.lock ? '<i class="tgrid__lock">' + ic('lock', 11) + '</i>' : '';
    var onPic = ICO === 'a' ? '<i class="tgrid__ico">' + sqIc(x.id, 16) + '</i>'
      : ICO === 'c' ? '<i class="tgrid__word">' + esc(SQ_FN[x.id] || x.k || x.t) + '</i>' : '';
    var byName = ICO === 'b' ? '<i class="tgrid__mini">' + sqIc(x.id, 15) + '</i>' : '';
    return '<a class="tgrid__b" href="' + x.href + '">' +
      '<span class="tgrid__pic"><img src="' + x.img + '" alt="" loading="lazy">' +
        onPic + lock + '</span>' +
      '<span class="tgrid__t"><b>' + byName + esc(x.t) + '</b><i>' + esc(x.price || x.d) + '</i></span></a>';
  }
  /* Вика 25.09: пока люди не знают брендовых имён, подписывать квадраты функцией
     («ИИ-генерации», «Калькулятор»), а фирменное имя показывать при наведении.
     Переключатель ниже позволяет посмотреть оба порядка. */
  /* подписи по-русски и по смыслу: человеку должно быть понятно без расшифровки */
  var SQ_FN = {
    ai: 'Генерации', market: 'Каталог товаров', capsules: 'Интерьерные решения', scout: 'Бюджетный просчёт',
    adept: 'Дизайн-проект', track: 'Управление ремонтом', metod: 'Закрытый клуб METOD Ремонта', about: 'Строительные компании',
    sup: 'Поставщикам', des: 'Дизайнерам', bld: 'Строителям'
  };


  /* Свой набор для квадратов: линейные знаки, по одному на раздел.
     В общем наборе у Трека и Строителей был один и тот же карандаш — здесь развели. */
  /* Набор значков по образцу Вики (скриншоты 12.10): предметные, не метафоры —
     вихрь генерации, тележка, кресло с торшером, калькулятор, план квартиры,
     инструменты, звезда за ограждением, звенья цепи. */
  /* Значки по образцу Вики (скриншот прототипа 12.10): предметные, а не метафоры.
     Линия тонкая и одинаковой толщины, рисунок вписан в поле 24×24 с полями. */
  /* Значки по образцу Вики (скриншот прототипа 12.10): предметные, а не метафоры.
     Линии не должны сходиться ближе толщины штриха — иначе на 42 px всё сливается. */
  var SQ_IC = {
    ai: '<path d="M13.7 12.0A7.4 7.4 0 0 1 15.4 20.8" fill="#f8eeec"/><path d="M12.8 13.5A7.4 7.4 0 0 1 6.1 19.3" fill="#a75f42"/><path d="M11.2 13.5A7.4 7.4 0 0 1 2.7 10.6" fill="#f8eeec"/><path d="M10.3 12.0A7.4 7.4 0 0 1 8.6 3.2" fill="#a75f42"/><path d="M11.1 10.5A7.4 7.4 0 0 1 17.9 4.7" fill="#f8eeec"/><path d="M12.8 10.5A7.4 7.4 0 0 1 21.3 13.4" fill="#a75f42"/>',
    market: '<path d="M2.6 4.2h2.2l2.6 10h9.4l2.2-7.2H6.4" fill="#a75f42"/><path d="M8.6 10.6h8.2"/><circle cx="9.6" cy="19.2" r="1.4"/><circle cx="16.8" cy="19.2" r="1.4"/>',
    capsules: '<g transform="translate(-0.2 2.4) scale(0.7)"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z" fill="#a75f42"/><path d="M5 18v2M19 18v2"/></g><path d="M16.6 10a2.6 2.6 0 0 1 2.6-3.6A2.6 2.6 0 0 1 21.8 10z"/><path d="M19.2 10v8.8"/><path d="M17.4 19.2h3.6"/>',
    scout: '<rect x="5.2" y="2.8" width="13.6" height="18.4" rx="2.2"/><rect x="7.8" y="5.6" width="8.4" height="3" rx="1" fill="#a75f42"/><rect x="7.8" y="11.4" width="8.4" height="6.8" rx="1" fill="#f8eeec"/><path d="M12 11.4v6.8M7.8 14.8h8.4"/>',
    adept: '<path d="M3.6 4.6h9.8v4.6h7v10.2H3.6z" fill="#f8eeec"/><path d="M13.6 13.4h7v6.2h-7z" fill="#a75f42"/><path d="M3.6 13.4h3.4M10.8 13.4h2.6" stroke="#a75f42"/><path d="M9.8 4.6v2.8M9.8 10.6v9" stroke="#a75f42"/>',
    track: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" fill="#a75f42"/>',
    metod: '<path d="m12 5 1.9 3.9 4.3.6-3.1 3 .7 4.3L12 14.8l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#a75f42"/><path d="M3.6 5v14M20.4 5v14"/>',
    /* Вика 21.10: «Экосистема» стала «Строительные компании» — дом и башенный кран */
    about: '<path d="M2.8 20.6V8.2h8v12.4" fill="#f8eeec"/><path d="M5 11.4h3.6M5 14.6h3.6M5 17.8h3.6"/><path d="M2 20.6h20"/><path d="M19.6 20.6V8.4"/><path d="M10.8 4.2h10.8"/><rect x="17.6" y="5.8" width="4" height="2.6" rx=".6" fill="#a75f42"/><path d="M13.6 4.2v4M12.6 8.2h2"/>',
    sup: '<rect x="8.4" y="3.6" width="7.6" height="16.8" rx="1.8" fill="#a75f42"/><path d="M10.4 8h3.6M10.4 11.4h3.6M10.4 14.8h3.6"/><path d="M6.6 5.6 3.8 16.8a1.8 1.8 0 0 0 1.3 2.2l1.3.3"/><path d="m17.8 5.6 2.8 11.2a1.8 1.8 0 0 1-1.3 2.2l-1.3.3"/>',
    des: '<path d="M5.4 5.6a2 2 0 0 1 2-2h8.8v13.2H7.4a2 2 0 0 0-2 2z" fill="#f8eeec"/><path d="M5.4 5.6v13.2a2 2 0 0 0 2 2h8.8"/><path d="M8.6 8h4.6M8.6 11.4h4.6"/><path d="m21.2 2.8 1.2 1.2-5.8 5.8-1.8.6.6-1.8z" fill="#a75f42"/>',
    bld: '<path d="M2.6 17.4a1 1 0 0 1 1-1h16.8a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1H3.6a1 1 0 0 1-1-1z" fill="#a75f42"/><path d="M9.8 11.4V5.6a1.2 1.2 0 0 1 1.2-1.2h2a1.2 1.2 0 0 1 1.2 1.2v5.8"/><path d="M4.8 16.4v-3.2a6.4 6.4 0 0 1 5-6.2"/><path d="M14.2 7a6.4 6.4 0 0 1 5 6.2v3.2"/>'
  };



  function sqIc(id, size) {
    var path = SQ_IC[id];
    if (!path) return ic('albums', size);
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + path + '</svg>';
  }

  /* подача «квадраты» по референсу: линейная иконка в тонкой рамке, подпись под квадратом */
  function sqcard(x) {
    var label = SQ_FN[x.id] || x.t;
    return '<a class="sq__b" href="' + x.href + '">' +
      '<span class="sq__box">' + sqIc(x.id, 42) +
        (x.lock ? '<i class="sq__lock">' + ic('lock', 10) + '</i>' : '') + '</span>' +
      '<b class="sq__cap">' + esc(label) + '</b>' +
      '<span class="sq__tip" role="note"><b>' + esc(x.t) + '</b>' +
        (x.d ? '<i>' + esc(x.d) + '</i>' : '') + '</span></a>';
  }
  /* Вика 21.10: в ряду «Сделай по-настоящему» «Строительные компании» (бывшая «Экосистема»)
     идут перед «Закрытым клубом»; подсказка при наведении — по новой подписи квадрата */
  function swapClubAndBuilders(items) {
    var ids = items.map(function (x) { return x.id; }), a = ids.indexOf('metod'), b = ids.indexOf('about');
    if (a < 0 || b < 0) return items;
    var out = items.slice(), about = {};
    Object.keys(items[b]).forEach(function (k) { about[k] = items[b][k]; });
    about.t = 'Строительные компании'; about.d = 'Подрядчики и застройщики экосистемы SOVEAPP';
    out[a] = about; out[b] = items[a];
    return out;
  }
  function secSquares() {
    /* прошлая раскладка: по четыре в ряд; между рядами — две подписи родных групп */
    var half = Math.ceil(SECS.length / 2);
    var rows = [
      { label: 'Попробуй сразу · бесплатно', items: SECS.slice(0, half) },
      { label: 'Сделай по-настоящему', items: swapClubAndBuilders(SECS.slice(half)) }
    ];
    return rows.map(function (r) {
        return '<section class="grp grp--btns grp--sq">' +
          '<span class="grp__label">' + esc(r.label) + '</span>' +
          '<div class="sq">' + r.items.map(sqcard).join('') + '</div></section>';
      }).join('');
  }
  function secIcons() {
    return byGroup(SECS).map(function (g) {
      return '<section class="grp grp--btns">' + groupLabel(g) +
        '<div class="tgrid">' + g.items.map(tcard).join('') + '</div></section>';
    }).join('');
  }

  /* вариант «карусель» — один ряд, листается вбок, снизу точки */
  /* вариант «два главных» — SOVEAPP AI и маркет крупно, остальные мелкой сеткой */
  var HERO_IDS = ['ai', 'market'];
  function secHero() {
    var big = SECS.filter(function (x) { return HERO_IDS.indexOf(x.id) >= 0; });
    var rest = SECS.filter(function (x) { return HERO_IDS.indexOf(x.id) < 0; });
    function mini(x) {
      return '<a class="mini6__b" href="' + x.href + '">' +
        '<img src="' + x.img + '" alt="" loading="lazy">' +
        (x.lock ? '<i class="mini6__lock">' + ic('lock', 9) + '</i>' : '') +
        '<span class="mini6__cap"><i>' + ic(x.ic, 12) + '</i><b>' + esc(x.t) + '</b></span></a>';
    }
    return '<section class="grp grp--btns">' + groupLabel({ name: big[0].group, items: big }) +
      '<div class="duo">' + big.map(function (x) {
        return '<a class="duo__b" href="' + x.href + '">' +
          '<img src="' + x.img + '" alt="" loading="lazy">' +
          '<span class="duo__t"><i>' + ic(x.ic, 15) + '</i><b>' + esc(x.t) + '</b></span></a>';
      }).join('') + '</div></section>' +
      byGroup(rest).map(function (g) {
        return '<section class="grp grp--btns">' + groupLabel(g) +
          '<div class="mini6 mini6--pair">' + g.items.map(mini).join('') + '</div></section>';
      }).join('');
  }

  /* вариант 3 — те же кнопки прячутся в меню, которое выезжает снизу */
  function secSheet() {
    /* кнопка видна издалека и показывает, что внутри: превью разделов и счётчик */
    var pv = SECS.slice(0, 5), rest = SECS.length - pv.length;
    return '<button type="button" class="smenu" data-sheet>' +
      '<span class="smenu__top">' +
        '<span class="smenu__b"><b>Все разделы</b><i>SOVEAPP AI, капсулы, Адепт, Трек, METOD</i></span>' +
      '</span>' +
      '<span class="smenu__lane">' + pv.map(function (x) {
        return '<span class="smenu__pv"><img src="' + x.img + '" alt="" loading="lazy"></span>';
      }).join('') + (rest > 0 ? '<span class="smenu__pv smenu__pv--more">+' + rest + '</span>' : '') + '</span>' +
      '<span class="smenu__cta">Открыть меню' + ic('arrow', 16) + '</span></button>';
  }

  /* выезжающее меню: тянется вниз пальцем, закрывается по фону и Esc */
  function openSheet() {
    var back = document.createElement('div');
    back.className = 'sh-back';
    back.innerHTML = '<div class="sh" role="dialog" aria-modal="true" aria-label="Разделы">' +
      '<span class="sh__grip" aria-hidden="true"></span>' +
      '<div class="sh__head"><b>Разделы</b><button type="button" class="sh__x" aria-label="Закрыть">×</button></div>' +
      secButtons(true) + '</div>';
    document.body.appendChild(back);
    var card = back.querySelector('.sh');
    requestAnimationFrame(function () { back.classList.add('is-in'); });

    function close() {
      back.classList.remove('is-in');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { back.remove(); }, 280);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.sh__x').addEventListener('click', close);
    card.addEventListener('click', toggleShelf);

    /* потянуть вниз — закрыть; тянем только за верх шторки, иначе перехватываются нажатия на кнопки */
    var grab = back.querySelector('.sh__grip'), head = back.querySelector('.sh__head');
    var y0 = null;
    function onDown(e) {
      if (e.target.closest('.sh__x')) return;
      y0 = e.clientY; card.style.transition = 'none';
    }
    function onMove(e) {
      if (y0 === null) return;
      var dy = Math.max(0, e.clientY - y0);
      if (dy > 4 && e.target.setPointerCapture && !e.target.hasPointerCapture(e.pointerId)) {
        try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
      }
      card.style.transform = 'translateY(' + dy + 'px)';
    }
    function onUp(e) {
      if (y0 === null) return;
      var dy = Math.max(0, e.clientY - y0);
      y0 = null; card.style.transition = ''; card.style.transform = '';
      if (dy > 90) close();
    }
    [grab, head].forEach(function (el) {
      if (!el) return;
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
    return close;
  }

  var SVIEWS = [
    { id: 'flat', t: 'Список', make: function () { return secButtons(false); } },
    { id: 'hero', t: 'Два главных', make: secHero },
    { id: 'icons', t: 'Иконки', make: secIcons },
    { id: 'squares', t: 'Квадраты', make: secSquares }
  ];
  /* подача одна — квадраты; служебный выбор вариантов убран из прототипа */
  var VKEY = 'sove.proto.secView';
  var vid = 'squares';
  function sections() {
    var v = SVIEWS.filter(function (x) { return x.id === vid; })[0] || SVIEWS[0];
    return '<section class="feed feed--sec" id="sec-slot">' + v.make() + '</section>';
  }
  /* служебная плашка сравнения — в продукт не идёт */
  function viewSwitch() {
    return '<div class="vsw"><div class="vsw__in" role="group" aria-label="Варианты подачи разделов">' +
      SVIEWS.map(function (v) {
        return '<button type="button" data-sv="' + v.id + '" class="' + (v.id === vid ? 'is-active' : '') + '">' + esc(v.t) + '</button>';
      }).join('') + '</div></div>';
  }


  /* ---------- карточка снизу по нажатию на квадрат ----------
     На телефоне пузырёк при наведении не работает, поэтому тап открывает
     карточку снизу: что это за раздел и одна кнопка перехода. */
  function sqSheet() {
    var veil = document.createElement('div'); veil.className = 'sq-veil';
    var sheet = document.createElement('div'); sheet.className = 'sq-sheet'; sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil); document.body.appendChild(sheet);

    function close() {
      sheet.classList.remove('is-open'); veil.classList.remove('is-open');
      sheet.setAttribute('aria-hidden', 'true');
    }
    function open(x) {
      sheet.innerHTML = '<button type="button" class="sq-sheet__x" aria-label="Закрыть">×</button>' +
        '<span class="sq-sheet__grip"></span>' +
        '<span class="sq-sheet__k">' + esc(SQ_FN[x.id] || '') + '</span>' +
        '<b class="sq-sheet__t">' + esc(x.t) + '</b>' +
        (x.d ? '<p class="sq-sheet__d">' + esc(x.d) + '</p>' : '') +
        (x.price ? '<p class="sq-sheet__p">' + esc(x.price) + '</p>' : '') +
        '<a class="btn btn--primary btn--block" href="' + x.href + '">Открыть ' + esc(x.t) + '</a>';
      sheet.classList.add('is-open'); veil.classList.add('is-open');
      sheet.setAttribute('aria-hidden', 'false');
      sheet.querySelector('.sq-sheet__x').addEventListener('click', close);
    }
    veil.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    return { open: open, close: close };
  }
  var sqs = null;

  /* ---------- интерьерные капсулы: две карточки и переход ко всем ---------- */
  function capsBlock() {
    var list = D.capsules.filter(function (c) { return !c.soon && !c.designer; }).slice(0, 2);
    if (!list.length) return '';
    return '<section class="feed feed--caps"><div class="feed__head"><h2 class="h2">Интерьерные капсулы</h2>' +
      '<a class="btn btn--link" href="capsules.html">Все</a></div>' +
      '<div class="caps2">' + list.map(function (c) {
        return '<a class="caps2__b" href="capsule.html?id=' + c.id + '">' +
          '<span class="caps2__pic"><img src="' + c.cover + '" alt="" loading="lazy"></span>' +
          '<b>' + esc(c.name) + '</b><i>' + esc(c.style || 'Материалы и комплектация') + '</i></a>';
      }).join('') + '</div>' +
      '<a class="btn btn--ghost btn--block caps2__more" href="capsules.html">Показать все капсулы</a></section>';
  }

  /* ---------- SOVEAPP маркет: баннер акции месяца и четыре товара со звёздочкой ---------- */
  function promoBanner() {
    var list = (D.promoList ? D.promoList() : []).filter(function (p) { return p && p.white; }).slice(0, 4);
    if (!list.length) list = D.products.filter(function (p) { return p.white && p.discount >= 20; }).slice(0, 4);
    var lead = list[0] || {};
    var save = list.reduce(function (max, x) { return Math.max(max, x.retail - x.metod); }, 0);
    return '<section class="feed feed--mk"><div class="feed__head"><h2 class="h2">SOVEAPP маркет</h2>' +
      '<a class="btn btn--link" href="market.html">Весь каталог</a></div>' +

      /* баннер на фоне интерьерного кадра: логотип партнёра и акция поверх — согласованный
         вариант (Вика 21.10: «верни тот красивый»); карточный вариант и переключатель ?bn=2 убраны */
      '<a class="mkp" href="market.html?promo=1">' +
        '<img class="mkp__bg" src="assets/img/partners/promo-bg.jpg" alt="" loading="lazy">' +
        '<span class="mkp__veil"></span>' +
        '<span class="mkp__in">' +
          '<span class="mkp__logo">' + esc((lead.brand || 'ПАРТНЁР').toUpperCase()) + '</span>' +
          '<b class="mkp__t">Акция месяца</b>' +
          (save ? '<i class="mkp__save">Выгода до ' + F.rub(save) + '</i>' : '') +
          '<u class="mkp__go">Смотреть условия</u>' +
        '</span>' +
      '</a>' +

      '<div class="mk-grid mk-grid--promo">' + list.map(function (x) { return S.ui.productCard(x); }).join('') + '</div>' +
      '<a class="btn btn--ghost btn--block mk-more" href="market.html">Показать все товары</a></section>';
  }

  /* ---------- главная ---------- */
  function home() {
    return scoutHTML() + sections() +
      '<div id="prt-top">' + (vid === 'squares' ? partnersSquares() : (vid === 'hero' || vid === 'icons') ? partnersBlock() : '') + '</div>' +
      capsBlock() + promoBanner() +
      '<div id="prt-bottom">' + (vid === 'flat' ? partnersBlock() : '') + '</div>';
  }

  root.innerHTML = home();
  bindScout();
  bindPromo();
  bindSqHint();
  /* служебное переключение подачи + вызов выезжающего меню */
  root.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-sv]');
    if (sw) {
      vid = sw.getAttribute('data-sv');
      try { localStorage.setItem(VKEY, vid); } catch (e2) {}
      var slot = root.querySelector('#sec-slot');
      var v = SVIEWS.filter(function (x) { return x.id === vid; })[0];
      if (slot && v) { slot.innerHTML = v.make(); bindSqHint(); }
      var top = root.querySelector('#prt-top'), bot = root.querySelector('#prt-bottom');
      if (top) top.innerHTML = (vid === 'squares') ? partnersSquares() : (vid === 'hero' || vid === 'icons') ? partnersBlock() : '';
      if (bot) bot.innerHTML = (vid === 'flat') ? partnersBlock() : '';
      root.querySelectorAll('[data-sv]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-sv') === vid); });
      return;
    }
    var av = e.target.closest('[data-av]');
    if (av) {
      avid = av.getAttribute('data-av');
      try { localStorage.setItem(AKEY, avid); } catch (e2) {}
      root.querySelectorAll('[data-av]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-av') === avid); });
      var body = root.querySelector('#promo-body');
      if (body) { body.innerHTML = promoBody(); bindPromo(); }
      return;
    }
    var pv = e.target.closest('[data-pv]');
    if (pv) {
      pvid = pv.getAttribute('data-pv');
      try { localStorage.setItem(PKEY, pvid); } catch (e2) {}
      root.querySelectorAll('[data-pv]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-pv') === pvid); });
      root.querySelectorAll('#prt-body').forEach(function (box) { box.innerHTML = partnersBody(); });
      return;
    }
    if (e.target.closest('[data-sheet]')) { openSheet(); return; }
    toggleShelf(e);
  });

  /* Вика 25.09: подпись — что это, а фирменное имя всплывает баннером при наведении
     или долгом нажатии пальцем. Тап по кнопке при этом работает как обычно. */
  function bindSqHint() {
    if (!sqs) sqs = sqSheet();
    var all = SECS.concat(PARTNERS);
    root.querySelectorAll('.sq__b').forEach(function (el) {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      /* Алина 22.10: тап по значку сразу открывает раздел, без всплывающей карточки снизу */
    });
  }

  /* полка: открывается одна за раз, остальные закрываются */
  function toggleShelf(e) {
    var h = e.target.closest('.shelf__h'); if (!h) return;
    var box = h.closest('.shelves'), item = h.closest('.shelf'), was = item.classList.contains('is-open');
    box.querySelectorAll('.shelf').forEach(function (s) {
      s.classList.remove('is-open');
      var b = s.querySelector('.shelf__h'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    if (!was) { item.classList.add('is-open'); h.setAttribute('aria-expanded', 'true'); }
  }

  /* подсказки в строке поиска: товары, разделы и бренды при наборе */
  S.ui.suggest(document.getElementById('home-q'));

  /* Партнёрам: тап по карточке показывает, как в интерьер встаёт товар, а в ленту — капсула */
  (function () {
    var box = document.getElementById('prt'); if (!box) return;
    var cards = [].slice.call(box.querySelectorAll('.prt__card'));
    /* плюс в кадре: рамка отзывается и объясняет, как товар туда попадает */
    var plus = box.querySelector('[data-slot]');
    if (plus) plus.addEventListener('click', function (e) {
      e.stopPropagation();
      var slot = plus.closest('.prt__slot');
      slot.classList.remove('is-ping'); void slot.offsetWidth; slot.classList.add('is-ping');
      var inCaps = D.products.filter(function (p) { return p.capsules && p.capsules.length; }).length;
      S.ui.modal({
        eyebrow: 'Поставщикам и брендам',
        title: 'Как товар попадает в кадр',
        html: '<div class="pb-list">' +
          '<div class="pb-item"><b>1 · Реестр METOD</b><span>заявка в четыре шага, модерация</span></div>' +
          '<div class="pb-item"><b>2 · Скидка от РРЦ</b><span>закрытая цена для участников клуба</span></div>' +
          '<div class="pb-item"><b>3 · Каталог</b><span>ссылка или прайс — позиции подтянутся сами</span></div>' +
          '<div class="pb-item"><b>4 · Капсула</b><span>дизайнер ставит вещь в интерьер, её собирают клиенты</span></div>' +
        '</div>' +
        '<p class="mtd__gain">Сейчас в капсулах ' + inCaps + ' позиций партнёров.</p>',
        actions: [ { label: 'Стать партнёром', kind: 'primary', href: 'partner.html' },
                   { label: 'Как это видит клиент', kind: 'ghost', href: 'market.html' },
                   { label: 'Не сейчас', kind: 'link' } ]
      });
    });

    /* плюс в ленте капсул: объясняем, как попасть в каталог интерьеров */
    var capPlus = box.querySelector('[data-capslot]');
    if (capPlus) capPlus.addEventListener('click', function (e) {
      e.stopPropagation();
      var card = capPlus.closest('.prt__card');
      card.classList.add('is-on');
      capPlus.classList.remove('is-ping'); void capPlus.offsetWidth; capPlus.classList.add('is-ping');
      S.ui.modal({
        eyebrow: 'Дизайнерам',
        title: 'Как разместить свою капсулу',
        html: '<div class="pb-list">' +
          '<div class="pb-item"><b>1 · Заявка</b><span>анкета дизайнера и ссылка на портфолио</span></div>' +
          '<div class="pb-item"><b>2 · Капсула</b><span>рендеры комнат, список материалов и товаров</span></div>' +
          '<div class="pb-item"><b>3 · Модерация</b><span>проверяем состав и цены комплектации</span></div>' +
          '<div class="pb-item"><b>4 · Каталог</b><span>интерьер встаёт рядом с остальными, заявки на проект идут вам</span></div>' +
        '</div>' +
        '<p class="mtd__gain">Сейчас в каталоге ' + D.capsules.filter(function (c) { return !c.soon; }).length + ' интерьеров.</p>',
        actions: [ { label: 'Разместить капсулу', kind: 'primary', href: 'partner.html?who=designer' },
                   { label: 'Посмотреть каталог интерьеров', kind: 'ghost', href: 'capsules.html' },
                   { label: 'Не сейчас', kind: 'link' } ]
      });
    });
    /* первый показ сам: когда блок доехал до экрана, вещь встаёт в кадр */
    if (window.IntersectionObserver && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach(function (c) {
        new IntersectionObserver(function (es, obs) {
          es.forEach(function (en) {
            if (!en.isIntersecting) return;
            obs.unobserve(en.target);
            setTimeout(function () { en.target.classList.add('is-on'); }, en.target.getAttribute('data-prt') === 'good' ? 450 : 900);
          });
        }, { threshold: 0.45 }).observe(c);
      });
    }
  })();

  /* переключатель подачи разбора рендера: показываем одну панель из трёх */
  (function () {
    var box = root.querySelector('.rsw'); if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.rsw__tab'); if (!b) return;
      var id = b.getAttribute('data-rv');
      box.querySelectorAll('.rsw__tab').forEach(function (t) {
        var on = t === b;
        t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      box.querySelectorAll('.rsw__pane').forEach(function (p) {
        p.classList.toggle('is-off', p.getAttribute('data-rv') !== id);
      });
    });
  })();
  /* рентген-полоса: ведём пальцем, подсвечиваем то, что попало под неё */
  (function () {
    var stage = document.getElementById('xr-stage'), line = document.getElementById('xr-line'), sum = document.getElementById('xr-sum');
    var color = document.getElementById('xr-color');
    if (!stage || !line) return;
    var boxes = [].slice.call(stage.querySelectorAll('.xr__box'));
    var OBJ = D.ai.renderSample.objects;
    function put(y) {
      y = Math.max(4, Math.min(96, y));
      line.style.top = y + '%';
      if (color) color.style.clipPath = 'inset(' + y.toFixed(1) + '% 0 0 0)';   /* ниже полосы кадр уже «проявлен» */
      var found = 0, total = 0;
      boxes.forEach(function (b) {
        var t = Number(b.getAttribute('data-top'));
        /* предмет остаётся отмеченным, как только полоса его прошла: находки накапливаются */
        var on = y <= t + 4;
        b.classList.toggle('is-on', on);
        if (on) { found++; var p = D.product(OBJ[Number(b.getAttribute('data-i'))].items[0].id); total += p ? p.metod : 0; }
      });
      sum.textContent = found ? 'найдено ' + found + ' из ' + boxes.length + ' · ' + F.rub(total)
        : 'потяните полосу вверх по кадру';
    }
    function fromEvent(e) {
      var r = stage.getBoundingClientRect();
      put((e.clientY - r.top) / r.height * 100);
    }
    /* полоса движется только пока её держат: за курсором без нажатия не бегает */
    var drag = false;
    function stop() { drag = false; stage.classList.remove('is-drag'); }
    stage.addEventListener('pointerdown', function (e) {
      drag = true; stage.classList.add('is-drag'); stage.setPointerCapture(e.pointerId); fromEvent(e); e.preventDefault();
    });
    stage.addEventListener('pointermove', function (e) { if (!drag) return; fromEvent(e); e.preventDefault(); });
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);
    put(88);
  })();

  /* выбор кадра в блоке «Есть проект от дизайнера?»: меняем картинку, рамки — только у размеченного кадра */
  (function () {
    var stage = document.querySelector('.rnd:not(.rnd--xray):not(.rnd--one) .rnd__stage');
    var pick = document.querySelector('.rnd__pick');
    if (!stage || !pick) return;
    var img = stage.querySelector('img'), card = document.getElementById('rnd-card');
    var marked = D.ai.renderSample.capsule;

    /* плашку с итогом ставим в тот угол кадра, где она меньше всего мешает ценам */
    function placeSum() {
      var sum = stage.querySelector('.rnd__sum'); if (!sum) return;
      var marks = [].slice.call(stage.querySelectorAll('.rnd__box i, .rnd__box em'));
      var best = null;
      ['bl', 'tl', 'br', 'tr'].forEach(function (pos) {
        sum.className = 'rnd__sum rnd__sum--' + pos;
        var r = sum.getBoundingClientRect(), n = 0;
        marks.forEach(function (m) {
          var x = m.getBoundingClientRect();
          if (!(x.right < r.left - 6 || r.right < x.left - 6 || x.bottom < r.top - 6 || r.bottom < x.top - 6)) n++;
        });
        if (!best || n < best.n) best = { pos: pos, n: n };
      });
      sum.className = 'rnd__sum rnd__sum--' + best.pos;
    }
    placeSum();
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cap]'); if (!b) return;
      pick.querySelectorAll('[data-cap]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      var src = b.getAttribute('data-src'), id = b.getAttribute('data-cap');
      var pre = new Image();
      pre.onload = function () { img.style.opacity = '0'; setTimeout(function () { img.src = src; img.style.opacity = '1'; }, 160); };
      pre.src = src;
      var set = id === marked ? { objects: D.ai.renderSample.objects } : (D.ai.renderMarks || {})[id];
      stage.classList.toggle('is-plain', !set);
      var sum = stage.querySelector('.rnd__sum');
      if (set) {
        /* перерисовываем рамки под выбранный кадр */
        stage.querySelectorAll('[data-obj]').forEach(function (x) { x.remove(); });
        var total = 0;
        set.objects.forEach(function (o, n) {
          var p = D.product(o.items[0].id); total += p ? p.metod : 0;
          var el = document.createElement('button');
          el.type = 'button'; el.className = 'rnd__box' + boxCls(o); el.setAttribute('data-obj', n);
          el.setAttribute('aria-label', o.name + (p ? ', ' + F.rub(p.metod) : ''));
          el.style.cssText = '--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%;--i:' + n;
          el.innerHTML = '<i>' + o.n + '</i><em>' + (p ? F.rub(p.metod) : '') + '</em>';
          stage.insertBefore(el, sum);
        });
        window.__rndObjects = set.objects; window.__rndCap = id;
        if (sum) { sum.textContent = set.objects.length + ' предмета · ' + F.rub(total) + ' с METOD'; placeSum(); }
        if (card) card.innerHTML = '<span class="rnd__hint">Наведите на предмет — покажем, что это за вещь и почём</span>';
      } else {
        if (sum) sum.textContent = 'этот кадр разберём так же';
        if (card) card.innerHTML = '<span class="rnd__hint">Нажмите «Проверить смету» — разберём этот кадр и соберём список вещей с ценами</span>';
      }
      var go = document.querySelector('.rnd__foot .btn--primary');
      if (go) go.href = 'ai.html?mode=render&capsule=' + id;
    });
  })();

  /* разбор рендера: наведение или тап по предмету показывает товар из капсулы */
  (function () {
    var card = document.getElementById('rnd-card'), stage = document.querySelector('.rnd:not(.rnd--xray) .rnd__stage');
    if (!card || !stage) return;
    var hint = card.innerHTML, cur = -1;
    function objs() { return window.__rndObjects || D.ai.renderSample.objects; }
    function show(i) {
      var o = objs()[i]; if (!o) return;
      cur = i;
      var p = D.product(o.items[0].id);
      /* точное совпадение подписываем капсулой, близкое — честно называем похожим */
      var here = D.capsule(window.__rndCap || D.ai.renderSample.capsule);
      var mine = p && p.capsules && here && p.capsules.indexOf(here.id) >= 0;
      var from = o.items[0].match === 'exact' && mine ? ' · из капсулы «' + esc(here.name) + '»' : ' · похожий в каталоге';
      card.innerHTML = p ?
        '<a class="rnd__prod" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="">' +
        '<span class="rnd__pbody"><b>' + esc(p.name) + '</b>' +
        '<i>' + F.rub(p.metod) + ' с METOD <s>' + F.rub(p.retail) + '</s></i>' +
        '<u>' + esc(o.name) + from + '</u></span></a>' +
        '<button type="button" class="btn btn--ghost btn--sm rnd__add" data-my-add="' + p.id + '">' +
        (S.my.hasProduct(p.id) ? 'В моём ремонте' : 'В мой ремонт') + '</button>'
        : hint;
      stage.querySelectorAll('[data-obj]').forEach(function (b) { b.classList.toggle('is-on', Number(b.getAttribute('data-obj')) === i); });
    }
    stage.addEventListener('pointerover', function (e) {
      var b = e.target.closest('[data-obj]');
      if (b && e.pointerType === 'mouse') show(Number(b.getAttribute('data-obj')));
    });
    stage.addEventListener('click', function (e) {
      var b = e.target.closest('[data-obj]'); if (!b) return;
      var i = Number(b.getAttribute('data-obj'));
      if (i === cur) { cur = -1; card.innerHTML = hint; stage.querySelectorAll('[data-obj]').forEach(function (x) { x.classList.remove('is-on'); }); }
      else show(i);
    });
  })();

  if (S.adeptBanner) S.adeptBanner(document.getElementById('home-adept'), { capsule: 'k1', compact: true, picker: true, title: 'Капсула ляжет на вашу планировку', cta: 'Заказать проект' });
  /* стрелки по бокам каруселей: листают на ширину экрана, гаснут на краях */
  root.querySelectorAll('.lane').forEach(function (lane) {
    var wrap = document.createElement('div'); wrap.className = 'lane-wrap';
    lane.parentNode.insertBefore(wrap, lane); wrap.appendChild(lane);
    var prev = document.createElement('button'), next = document.createElement('button');
    prev.type = next.type = 'button'; prev.className = 'lane-arr lane-arr--prev'; next.className = 'lane-arr lane-arr--next';
    prev.setAttribute('aria-label', 'Назад'); next.setAttribute('aria-label', 'Вперёд'); prev.innerHTML = next.innerHTML = ic('back', 18);
    wrap.appendChild(prev); wrap.appendChild(next);
    function sync() { var max = lane.scrollWidth - lane.clientWidth - 2; prev.hidden = lane.scrollLeft <= 2; next.hidden = lane.scrollLeft >= max; }
    prev.addEventListener('click', function () { lane.scrollBy({ left: -(lane.clientWidth - 40), behavior: 'smooth' }); });
    next.addEventListener('click', function () { lane.scrollBy({ left: lane.clientWidth - 40, behavior: 'smooth' }); });
    lane.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync); setTimeout(sync, 50);
  });
})();
