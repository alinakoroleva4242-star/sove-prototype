/* Первый экран главной — как до отката 03.11 (версия 7d7dc7f): Вика 03.11 20:07 «сделай верх вот такой» (скрин: фото с метками
   товаров, «Пример расчёта бюджета», «Ваш ремонт» с суммой, тонкий ползунок, «Ваша выгода с подпиской METOD» со знаком
   «Метод ремонта», кнопка «Рассчитать свой ремонт»). Вариант A (7 фото с товарами) + карточка 1, без выбора вариантов.
   Остальная главная — версия 30.10 (pages/home3.js рисует этот экран первым через SOVE.homeFirst).
   Классы hf-* — свои, чтобы не смешаться со стилями первого экрана 30.10 (hc-*) в pages/home3.css. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('home3');
  if (!root) return;
  function $(id) { return document.getElementById(id); }
  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }

  /* иконки в духе Ionicons на сайте */
  var IC = {
    bag: '<path d="M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
    albums: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M7 5h10M9 2h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    /* ряд преимуществ под кнопкой (макет Вики, вариант 2): стопка, молния, коробка */
    layers: '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function chev(d) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>'; }
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- пример расчёта: один интерьер, одна сумма ---------- */
  /* интерьер первого экрана — «Тёплая классика с терракотом» (у него размечены товары на кадре гостиной-кухни) */
  var CAP = D.capsule('k4') || D.capsules.filter(function (c) { return !c.soon && !c.designer && c.pricePerM2; })[0];
  /* одна сумма по Базовому (Вика 23.10): работы — новостройка без отделки, комплектация — капсула по ценам METOD */
  var BASE_STATE = D.scout.states.filter(function (x) { return x.id === 'concrete'; })[0] || D.scout.states[0];
  var AREA_MIN = 36, AREA_MAX = 84, AREA_DEF = 45;
  /* во сколько раз комплект дороже без подписки: считаем по товарам капсул — отсюда «Ваша выгода» */
  var sumRetail = 0, sumMetod = 0;
  D.products.forEach(function (p) { if (p.capsules && p.capsules.length) { sumRetail += p.retail; sumMetod += p.metod; } });
  var noMetodK = sumMetod ? sumRetail / sumMetod : 1.2;
  function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
  function budget(a) { return mln((BASE_STATE.rate + D.scout.roughRate(BASE_STATE.id) + CAP.pricePerM2) * a) + '\u00a0млн\u00a0₽'; }   /* черновые сверху — только при включённом флаге */
  function gain(a) { return 'до\u00a0' + F.num(Math.round((CAP.pricePerM2 * noMetodK - CAP.pricePerM2) * a / 10000) * 10000).replace(/ /g, '\u00a0') + '\u00a0₽'; }
  /* подпись про квартиру — коротко, чтобы на телефоне шла одной мелкой строкой */
  function flatName(a) { return a < 41 ? 'Студия' : a < 56 ? '1-комнатная' : a < 71 ? '2-комнатная' : '3-комнатная'; }
  function clampArea(a) { a = Math.round(Number(a) || AREA_DEF); return Math.min(AREA_MAX, Math.max(AREA_MIN, a)); }

  /* ---------- 7 фото одного интерьера ----------
     Первый кадр — гостиная-кухня с разметкой товаров (D.ai.renderMarks), дальше широкий кадр и галерея капсулы
     (облегчённые копии capsules/hc). k4-hall-1.jpg — тот же снимок, что k4-main-1.jpg (сверено по md5 02.11): второй раз не берём. */
  var MARK = (D.ai.renderMarks || {})[CAP.id] || null;
  /* метки товаров на кадре k4-living-1 сверены глазами 02.11 и поправлены в data.js (renderMarks.k4: люстра, диван, столик, пол).
     OFF_MARKS — запасной выключатель для метки, которая встанет не на свою вещь: «товар@рамка» по адресу кадра */
  var OFF_MARKS = {};   /* 02.11: разметку k4 в data.js поправили по кадру — прятать нечего; механизм оставлен на случай новых промахов */
  function markOk(src, o) {
    var off = [];
    Object.keys(OFF_MARKS).forEach(function (k) { if (String(src).slice(-k.length) === k) off = OFF_MARKS[k]; });
    var it = (o.items || [])[0];
    return !!it && off.indexOf(it.id + '@' + (o.box || []).join(',')) < 0;
  }
  var DUP = { 'k4-hall-1': true, 'k4-main-3': true };   /* k4-main-3 снят с того же ракурса, что k4-living-1 (сверка 02.11: при листании выглядел повтором) */
  var FRAMES = [];
  if (MARK && MARK.src) FRAMES.push({ src: MARK.src, room: ((CAP.slides || []).filter(function (s) { return s.src === MARK.src; })[0] || {}).room || '',
    marks: (MARK.objects || []).filter(function (o) { return markOk(MARK.src, o); }) });
  if (CAP.wide) FRAMES.push({ src: CAP.wide, room: 'Гостиная' });
  (CAP.gallery || []).forEach(function (g) {
    var m = /capsules\/([a-z0-9-]+)\.jpg$/.exec(g.src);
    if (!m || m[1] === CAP.wideFrom || DUP[m[1]]) return;
    FRAMES.push({ src: 'assets/img/capsules/hc/' + m[1] + '.jpg', room: g.room });
  });
  if (!FRAMES.length) FRAMES.push({ src: CAP.cover, room: '' });
  FRAMES = FRAMES.slice(0, 7);

  /* ---------- варианты первого экрана для сравнения ---------- */
  var HEROES = {
    a: { t: 'карусель 7 фото с товарами', carousel: true, goods: true },
    b: { t: 'карусель 7 фото без товаров', carousel: true, goods: false },
    c: { t: 'одно фото с товарами', carousel: false, goods: true },
    d: { t: 'одно фото без товаров', carousel: false, goods: false }
  };
  var CARDS = { 1: 'простая', 2: 'плашка и три преимущества', 3: 'декоративная, с волнами' };   /* во всех трёх — знак «Метод ремонта» вместо короны */

  /* ---------- первый экран: разметка ---------- */
  function frameAlt(f, i, n) { return 'Интерьер «' + CAP.name + '»' + (f.room ? ': ' + f.room.toLowerCase() : '') + (n > 1 ? ', фото ' + (i + 1) + ' из ' + n : ''); }
  function heroHTML(v) {
    var H = HEROES[v.hero], n = H.carousel ? FRAMES.length : 1, f = FRAMES[0];
    return '<div class="hf-hero' + (H.carousel ? ' hf-hero--carousel' : '') + '" id="hf-hero"' + (H.carousel ? ' role="region" aria-roledescription="карусель"' : ' role="group"') + ' aria-label="Интерьер «' + esc(CAP.name) + '»">' +
      '<img class="hf-hero__img is-wait" id="hf-img" src="' + f.src + '" alt="' + esc(frameAlt(f, 0, n)) + '" decoding="async" fetchpriority="high">' +
      (H.goods ? '<div class="hf-marks" id="hf-marks"></div>' +
        /* значок, а не надпись на фото: список товаров этого интерьера — блок «Товары капсулы» на её странице */
        '<a class="hf-goods" href="capsule.html?id=' + CAP.id + '#cap-goods" aria-label="Товары интерьера" title="Товары интерьера">' + ic('bag', 20) + '</a>' +
        '<div class="hf-pop" id="hf-pop" role="dialog" aria-label="Товар в кадре" hidden></div>' : '') +
      (H.carousel ? '<span class="hf-nav">' +
          '<button type="button" class="hf-nav__b" data-hc="-1" aria-label="Предыдущее фото">' + chev(-1) + '</button>' +
          '<button type="button" class="hf-nav__b hf-nav__b--on" data-hc="1" aria-label="Следующее фото">' + chev(1) + '</button></span>' +
        '<span class="hf-pager" id="hf-pager" aria-hidden="true">' + FRAMES.map(function (x, i) { return '<i' + (i ? '' : ' class="is-on"') + '></i>'; }).join('') + '</span>' : '') +
      '</div>';
  }
  /* логотип «Метод ремонта» вместо короны (Алина 30.10: «на баннере можно тонко лого Метод ремонта вместо короны»;
     файл «Лого метод.png» из папки логотипов на Диске, прислала Алина 02.11) — красится цветом акцента через маску.
     Валерия 02.11: «надо на главной» — знак во всех трёх вариантах карточки, короны на главной нет */
  var METOD_MARK = '<span class="hf-mark3" aria-hidden="true"><i class="hf-mark3__logo"></i></span>';
  var WAVE = '<svg class="hf-wave" viewBox="0 0 220 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 92C46 70 78 104 124 78S190 22 220 30"/><path d="M0 104C52 84 86 114 132 90S196 40 220 46"/><path d="M28 120C72 100 110 118 150 98S204 62 220 66"/></svg>';
  function cardHTML(v) {
    var c = v.card;
    var head = '<span class="hf-card__k">Пример расчёта бюджета</span>' +
      '<div class="hf-card__head"><h1 class="hf-card__t">Ваш ремонт <b class="hf-sum" id="plan-sum"></b></h1>' +
        '<span class="hf-card__m2" id="plan-m2"></span></div>' +
      '<input type="range" class="hf-range" id="plan-range" min="' + AREA_MIN + '" max="' + AREA_MAX + '" step="1" value="' + AREA_DEF + '" aria-label="Площадь квартиры, м²">' +
      '<p class="hf-card__sub" id="plan-area"></p>';
    var save;
    if (c === '2') {
      save = '<a class="hf-save hf-save--2" href="metod.html">' + METOD_MARK +
        '<span class="hf-save__lbl">Выгода<br>с подпиской METOD</span>' +
        '<span class="hf-save__val"><b id="hf-save"></b><em>Закрытые цены поставщиков и&nbsp;готовые решения</em></span></a>';
    } else if (c === '3') {
      save = '<a class="hf-save hf-save--3" href="metod.html" aria-label="Выгода с подпиской METOD — подробнее о подписке">' + METOD_MARK +
        '<span class="hf-save__txt"><small>Выгода с подпиской METOD</small><b id="hf-save"></b><em>Закрытые цены поставщиков и&nbsp;готовые решения</em></span>' +
        '<span class="hf-save__i" aria-hidden="true">' + ic('info', 20) + '</span></a>';
    } else {
      save = '<a class="hf-save hf-save--1" href="metod.html">' + METOD_MARK +
        '<span class="hf-save__txt"><small>Ваша выгода с подпиской METOD</small><b id="hf-save"></b><em>Закрытые цены поставщиков и&nbsp;готовые решения</em></span></a>';
    }
    var go = '<a class="hf-go" id="plan-go" href="scout.html?capsule=' + CAP.id + '&amp;state=' + BASE_STATE.id + '">Рассчитать свой ремонт ' + ic('arrow', 20) + '</a>';
    var plus = c === '2' ? '<ul class="hf-plus">' +
      /* неразрывный пробел после «и» и в «под ключ»: на узких экранах союз не висит в конце строки */
      '<li><i>' + ic('layers', 18) + '</i><span><b>Бюджет</b> под&nbsp;ключ</span></li>' +
      '<li><i>' + ic('bolt', 18) + '</i><span><b>Реальные</b> цены партнёров</span></li>' +
      '<li><i>' + ic('cube', 18) + '</i><span><b>Экономия</b> времени и&nbsp;бюджета</span></li></ul>' : '';
    return '<div class="hf-card hf-card--' + c + '">' + (c === '3' ? WAVE : '') + head + save + go + plus + '</div>';
  }
  function firstHTML(v) {
    return '<section class="hf hf--h' + v.hero + ' hf--c' + v.card + '" id="scout-card" aria-label="Пример расчёта бюджета ремонта">' +
      heroHTML(v) + cardHTML(v) + '</section>';
  }

  /* ---------- первый экран: поведение ---------- */
  var dims = {};   /* размеры кадров: нужны, чтобы точки товаров легли на вещи при обрезке object-fit: cover */
  /* куда поставить точки: перебираем сдвиг кадра (object-position) и выбираем тот, при котором видно больше всего
     размеченных вещей; точка стоит внутри рамки товара, не у края и не под кнопками на фото */
  function fitMarks(objs, nw, nh, W, H, avoid) {
    var s = Math.max(W / nw, H / nh), rw = nw * s, rh = nh * s, M = 24, best = null;
    var steps = []; for (var t = 0; t <= 20; t++) steps.push(t / 20);
    var xs = rw > W + 1 ? steps : [0.5], ys = rh > H + 1 ? steps : [0.5];
    function blocked(x, y) { return avoid.some(function (r) { return x > r[0] && x < r[2] && y > r[1] && y < r[3]; }); }
    xs.forEach(function (px) {
      ys.forEach(function (py) {
        var ox = (W - rw) * px, oy = (H - rh) * py, pts = [], cost = 0;
        objs.forEach(function (o, k) {
          var b = o.box || [0, 0, 0, 0];
          var x0 = ox + b[0] / 100 * rw, y0 = oy + b[1] / 100 * rh, bw = b[2] / 100 * rw, bh = b[3] / 100 * rh;
          var cx = x0 + bw / 2, cy = y0 + bh / 2;
          var lx = Math.max(x0 + bw * .2, M), hx = Math.min(x0 + bw * .8, W - M), ly = Math.max(y0 + bh * .2, M), hy = Math.min(y0 + bh * .8, H - M);
          if (lx > hx || ly > hy) return;
          var cand = [[Math.min(Math.max(cx, lx), hx), Math.min(Math.max(cy, ly), hy)]];
          for (var i = 0; i <= 4; i++) for (var j = 0; j <= 4; j++) cand.push([lx + (hx - lx) * i / 4, ly + (hy - ly) * j / 4]);
          var pick = null;
          cand.forEach(function (p) {
            if (blocked(p[0], p[1])) return;
            if (pts.some(function (q) { return Math.abs(q.x - p[0]) < 30 && Math.abs(q.y - p[1]) < 30; })) return;
            var d = Math.sqrt((p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy));
            if (!pick || d < pick.d) pick = { x: p[0], y: p[1], d: d };
          });
          if (!pick) return;
          pts.push({ k: k, x: pick.x, y: pick.y }); cost += pick.d / Math.max(bw, bh, 1);
        });
        var score = pts.length * 1000 - cost * 10 - Math.abs(px - .5) - Math.abs(py - .5);
        if (!best || score > best.score) best = { score: score, px: px, py: py, pts: pts };
      });
    });
    return best;
  }

  function mountHero(v) {
    var H = HEROES[v.hero], hero = $('hf-hero'), img = $('hf-img');
    var noop = { destroy: function () {}, layout: function () {} };
    if (!hero || !img) return noop;
    var marksBox = $('hf-marks'), pop = $('hf-pop');
    var list = H.carousel ? FRAMES : FRAMES.slice(0, 1);
    var idx = 0, loadId = 0, ready = {}, timer = null, hold = 0, hover = false, alive = true, popFor = -1;
    function frame() { return list[idx]; }
    function controlsRects() {
      var hr = hero.getBoundingClientRect();
      return [].slice.call(hero.querySelectorAll('.hf-goods, .hf-nav, .hf-pager')).map(function (el) {
        var r = el.getBoundingClientRect(), pad = 18;
        return [r.left - hr.left - pad, r.top - hr.top - pad, r.right - hr.left + pad, r.bottom - hr.top + pad];
      });
    }
    function layout() {
      if (!alive) return;
      var f = frame();
      if (!marksBox || !f.marks || !f.marks.length) { if (marksBox) marksBox.innerHTML = ''; img.style.objectPosition = ''; return; }
      var d = dims[f.src] || { w: img.naturalWidth, h: img.naturalHeight };
      var W = hero.clientWidth, Hh = hero.clientHeight;
      if (!d.w || !d.h || !W || !Hh) return;
      var best = fitMarks(f.marks, d.w, d.h, W, Hh, controlsRects());
      if (!best) return;
      img.style.objectPosition = (best.px * 100).toFixed(1) + '% ' + (best.py * 100).toFixed(1) + '%';
      marksBox.innerHTML = best.pts.map(function (pt) {
        var o = f.marks[pt.k], p = D.product(o.items[0].id);
        return '<button type="button" class="hf-dot' + (pt.k === popFor ? ' is-on' : '') + '" data-mark="' + pt.k + '" style="left:' + pt.x.toFixed(1) + 'px;top:' + pt.y.toFixed(1) + 'px"' +
          ' aria-label="' + esc(o.name + (p ? ' — ' + p.name : '')) + '" aria-expanded="' + (pt.k === popFor) + '"><i></i></button>';
      }).join('');
      placePop();
    }
    /* карточка товара не закрывает саму вещь: точка в нижней половине кадра — карточка сверху, в верхней — снизу */
    function placePop() {
      if (!pop || popFor < 0) return;
      var dot = hero.querySelector('.hf-dot[data-mark="' + popFor + '"]');
      pop.classList.toggle('hf-pop--top', !!dot && parseFloat(dot.style.top) > hero.clientHeight / 2);
    }
    function onLoad() {
      if (!alive) return;
      var src = img.getAttribute('src');
      ready[src] = true;
      if (img.naturalWidth) dims[src] = { w: img.naturalWidth, h: img.naturalHeight };
      hero.classList.remove('is-loading');
      layout();
      if (img.classList.contains('is-wait')) { img.classList.remove('is-wait'); img.classList.add('is-in'); }
    }
    img.addEventListener('load', onLoad);
    img.addEventListener('error', function () { hero.classList.remove('is-loading'); img.classList.remove('is-wait'); });
    if (img.complete && img.naturalWidth) onLoad();

    /* карточка товара по нажатию на точку — та же, что была у разбора рендера на главной */
    function closePop(back) {
      if (!pop || pop.hidden) return;
      pop.hidden = true; pop.innerHTML = ''; hero.classList.remove('has-pop');
      var was = popFor; popFor = -1;
      [].forEach.call(hero.querySelectorAll('.hf-dot'), function (b) { b.classList.remove('is-on'); b.setAttribute('aria-expanded', 'false'); });
      if (back) { var b = hero.querySelector('.hf-dot[data-mark="' + was + '"]'); if (b) b.focus(); }
    }
    function openPop(k) {
      var o = (frame().marks || [])[k], p = o && D.product(o.items[0].id);
      if (!p || !pop) return;
      var mine = (p.capsules || []).indexOf(CAP.id) >= 0, inMy = S.my.hasProduct(p.id);
      /* точное совпадение — «из этого интерьера» (фото и есть эта капсула), близкое — честно называем похожим */
      var from = o.items[0].match === 'exact' && mine ? ' · из этого интерьера' : ' · похожий в каталоге';
      pop.innerHTML = '<a class="rnd__prod" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="">' +
        '<span class="rnd__pbody"><b>' + esc(p.name) + '</b>' +
        '<i>' + F.rub(p.metod) + ' с METOD' + (p.retail > p.metod ? ' <s>' + F.rub(p.retail) + '</s>' : '') + '</i>' +
        '<u>' + esc(o.name) + from + '</u></span></a>' +
        '<button type="button" class="btn btn--ghost btn--sm rnd__add' + (inMy ? ' is-on' : '') + '" data-my-add="' + p.id + '" aria-pressed="' + inMy + '">' + (inMy ? 'В моём ремонте' : 'В мой ремонт') + '</button>' +
        '<button type="button" class="hf-pop__x" data-pop-x aria-label="Закрыть карточку товара">' + ic('close', 18) + '</button>';
      popFor = k; placePop();
      pop.hidden = false; hero.classList.add('has-pop');
      [].forEach.call(hero.querySelectorAll('.hf-dot'), function (b) { var on = Number(b.getAttribute('data-mark')) === k; b.classList.toggle('is-on', on); b.setAttribute('aria-expanded', String(on)); });
    }

    function syncDots() { [].forEach.call(hero.querySelectorAll('.hf-pager i'), function (d, i) { d.classList.toggle('is-on', i === idx); }); }
    function preload(n) {
      var f = list[(n + list.length) % list.length];
      if (ready[f.src]) return;
      var p = new Image();
      p.onload = function () { ready[f.src] = true; dims[f.src] = { w: p.naturalWidth, h: p.naturalHeight }; };
      p.src = f.src;
    }
    function show(n) {
      idx = (n + list.length) % list.length;
      var f = frame(), id = ++loadId;
      closePop(false);
      if (marksBox) marksBox.innerHTML = '';
      function swap() {
        if (!alive || id !== loadId) return;
        img.style.objectPosition = '';
        img.classList.remove('is-in', 'is-wait'); void img.offsetWidth;
        img.src = f.src; img.alt = frameAlt(f, idx, list.length);
        img.classList.add('is-in');
        syncDots();
        if (img.complete && img.naturalWidth) onLoad();
        preload(idx + 1); preload(idx + 2); preload(idx - 1);
      }
      if (ready[f.src]) swap();
      else {
        /* кадр меняется, только когда фото уже загружено: на телефоне по LTE иначе мелькает пустое место */
        hero.classList.add('is-loading');
        var p = new Image();
        p.onload = p.onerror = function () { ready[f.src] = true; if (p.naturalWidth) dims[f.src] = { w: p.naturalWidth, h: p.naturalHeight }; swap(); };
        p.src = f.src;
      }
    }
    function touch() { hold = Date.now() + 12000; }

    hero.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-hc]');
      if (nav) { touch(); show(idx + Number(nav.getAttribute('data-hc'))); return; }
      var dot = e.target.closest('[data-mark]');
      if (dot) { touch(); var k = Number(dot.getAttribute('data-mark')); if (k === popFor) closePop(false); else openPop(k); return; }
      if (e.target.closest('[data-pop-x]')) { closePop(true); return; }
      if (popFor >= 0 && !e.target.closest('.hf-pop') && !e.target.closest('.hf-goods')) closePop(false);
    });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popFor >= 0) { closePop(true); return; }
      if (H.carousel && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('.hf-nav')) { touch(); show(idx + (e.key === 'ArrowRight' ? 1 : -1)); }
    });
    if (H.carousel) {
      /* фото листаются сами каждые 5 с; после нажатия — пауза 12 с; при «меньше движения», наведении и открытой карточке товара — стоят */
      timer = setInterval(function () {
        if (!alive || calm || hover || document.hidden || Date.now() < hold || popFor >= 0 || hero.classList.contains('is-loading')) return;
        show(idx + 1);
      }, 5000);
      hero.addEventListener('mouseenter', function () { hover = true; });
      hero.addEventListener('mouseleave', function () { hover = false; });
      /* свайп по кадру листает фото этого интерьера, страница вбок не едет */
      var x0 = null, y0 = null;
      hero.addEventListener('touchstart', function (e) {
        if (e.target.closest('.hf-pop, .hf-dot, .hf-goods, .hf-nav')) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      hero.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { touch(); show(idx + (dx < 0 ? 1 : -1)); }
      });
      preload(1); preload(list.length - 1);
    }
    return {
      layout: layout,
      destroy: function () { alive = false; if (timer) clearInterval(timer); }
    };
  }

  /* все суммы, которые может показать ползунок: по самой широкой подбираем кегль заголовка */
  var SUMS = [];
  for (var sa = AREA_MIN; sa <= AREA_MAX; sa++) { if (SUMS.indexOf(budget(sa)) < 0) SUMS.push(budget(sa)); }
  /* сдвинутый ползунок помним в этой вкладке (перезагрузка, смена варианта в плашке выбора), но в «Мой ремонт»
     не пишем: S.my.set меняет и площадь активной квартиры. В «Мой ремонт» площадь уходит только по кнопке «Рассчитать». */
  var AREA_DRAFT = 'homeArea';
  function startArea() {
    var base = (S.my.get() || {}).area || null, d = null;
    try { d = S.draft.get(AREA_DRAFT); } catch (e) { d = null; }
    /* площадь в «Моём ремонте» с тех пор поменялась (расчёт, план) — она главнее старого положения ползунка */
    if (d && d.a && (d.base || null) === base) return clampArea(d.a);
    return clampArea(base || AREA_DEF);
  }
  function rememberArea(a) {
    try { S.draft.set(AREA_DRAFT, { a: a, base: (S.my.get() || {}).area || null }); } catch (e) {}
  }

  function mountCard() {
    var range = $('plan-range'), go = $('plan-go');
    if (!range) return { fit: function () {}, flush: function () {} };
    range.value = startArea();
    /* заголовок с суммой держим в одну строку. Кегль подбираем один раз — по самой широкой сумме и площади —
       при загрузке, смене ширины и загрузке шрифтов, а не на каждое движение ползунка: иначе строка дрожит на полпикселя */
    function widestSum(el) {
      var probe = el.cloneNode(false), best = SUMS[0], bw = -1;
      probe.removeAttribute('id'); probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none';
      el.parentNode.appendChild(probe);
      SUMS.forEach(function (s) { probe.textContent = s; var w = probe.getBoundingClientRect().width; if (w > bw) { bw = w; best = s; } });
      el.parentNode.removeChild(probe);
      return best;
    }
    function fitHead() {
      var head = root.querySelector('.hf-card__head'), t = head && head.querySelector('.hf-card__t'), sum = $('plan-sum'), m2 = $('plan-m2');
      if (!t || !sum) return;
      var keepSum = sum.textContent, keepM2 = m2 ? m2.textContent : '';
      t.style.fontSize = '';
      sum.textContent = widestSum(sum);
      if (m2) m2.textContent = AREA_MAX + '\u00a0м²';   /* цифры площади моноширинные: любая двузначная занимает столько же */
      var size = parseFloat(getComputedStyle(t).fontSize) || 28;
      /* заголовок сжимается в строке рядом с площадью, поэтому меряем переполнение его самого, а не всей строки */
      while (size > 18 && (t.scrollWidth > t.clientWidth + 1 || head.scrollWidth > head.clientWidth + 1)) { size -= 0.5; t.style.fontSize = size + 'px'; }
      sum.textContent = keepSum;
      if (m2) m2.textContent = keepM2;
    }
    var keep = 0;
    function update() {
      var a = clampArea(range.value);
      setText('plan-sum', budget(a));
      setText('plan-m2', a + '\u00a0м²');
      setText('plan-area', flatName(a) + ' · Базовый, ' + BASE_STATE.note);
      setText('hf-save', gain(a));
      range.style.setProperty('--fill', ((a - AREA_MIN) / (AREA_MAX - AREA_MIN) * 100).toFixed(1) + '%');
      range.setAttribute('aria-valuetext', a + ' м², ремонт ' + budget(a).replace(/\u00a0/g, ' '));
      if (go) go.href = 'scout.html?area=' + a + '&capsule=' + CAP.id + '&state=' + BASE_STATE.id;
    }
    range.addEventListener('input', function () {
      update();
      clearTimeout(keep); keep = setTimeout(function () { keep = 0; rememberArea(clampArea(range.value)); }, 250);
    });
    range.addEventListener('change', function () { clearTimeout(keep); keep = 0; rememberArea(clampArea(range.value)); });
    if (go) go.addEventListener('click', function () { var a = clampArea(range.value); S.my.set({ area: a }); rememberArea(a); });
    update();
    fitHead();
    /* flush — при смене варианта в плашке выбора: положение ползунка, сдвинутого только что, не теряется */
    return { fit: fitHead, flush: function () { if (keep) { clearTimeout(keep); keep = 0; rememberArea(clampArea(range.value)); } } };
  }

  function mountFirst(v) {
    var hero = mountHero(v), card = mountCard();
    return { destroy: function () { card.flush(); hero.destroy(); }, layout: function () { card.fit(); hero.layout(); } };
  }

  var VIEW = { hero: 'a', card: '1' };
  S.homeFirst = {
    html: function () { return firstHTML(VIEW); },
    mount: function () {
      var cur = mountFirst(VIEW), rz = 0;
      window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { cur.layout(); }, 80); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { cur.layout(); });
      return cur;
    }
  };
})();
