/* Страница капсулы: capsule.html?id=k1…k6 */
(function () {
  /* цена интерьера сразу в липкой панели — иначе на первом экране её нет */
  (function () {
    try {
      var id = new URLSearchParams(location.search).get('id');
      var cap = window.SOVE && SOVE.data.capsule(id);
      if (cap && cap.pricePerM2) {
        document.body.setAttribute('data-funnel-price', 'Интерьер от ' + SOVE.fmt.rub(cap.pricePerM2) + '/м²');
        document.body.setAttribute('data-funnel-target', 'scout.html?capsule=' + cap.id);
      }
    } catch (e) { /* без цены панель просто останется с кнопкой */ }
  })();

  var S = window.SOVE, root = document.getElementById('capsule-root');
  if (!root) return;
  if (!S || !S.data || !S.data.capsules) {
    root.innerHTML = '<section class="wrap section"><div class="error-screen"><h1 class="h3">Не удалось показать капсулу</h1><p class="small">Данные не загрузились. Обновите страницу — ничего не потеряется.</p><div><button class="btn btn--ghost btn--sm" type="button" onclick="location.reload()">Обновить страницу</button></div></div></section>';
    return;
  }
  var D = S.data, F = S.fmt, esc = F.esc;
  var rawId = S.ui.qs('id') || '';
  var id = rawId.toLowerCase();
  var c = D.capsule(id);

  function plural(n, one, few, many) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }
  function crumbs(last) { return '<nav class="crumbs cap-crumbs wrap" aria-label="Вы здесь"><a href="index.html">Главная</a><span aria-hidden="true">/</span><a href="capsules.html">Капсулы</a><span aria-hidden="true">/</span><span>' + esc(last) + '</span></nav>'; }
  function others(list, title) {
    return '<section class="wrap" aria-labelledby="cap-others-title"><div class="cap-block stack stack--8">' +
      '<div class="cap-block__head"><h2 class="h2" id="cap-others-title">' + title + '</h2><a class="btn btn--link" href="capsules.html">Все капсулы</a></div>' +
      '<div class="grid grid--5 grid--gap-lg cap-others">' + list.map(function (o) { return S.ui.capsuleCard(o); }).join('') + '</div></div></section>';
  }

  /* ---------- капсула не найдена ---------- */
  if (!c) {
    document.title = 'Капсула не найдена — SOVEAPP';
    root.innerHTML = crumbs('Не найдена') +
      '<section class="wrap cap-404"><span class="eyebrow">Ошибка в адресе</span><h1 class="h1">Капсула не найдена</h1>' +
      '<p class="lead">' + (rawId ? 'Капсулы с кодом «' + esc(rawId.slice(0, 24)) + '» у нас нет.' : 'В адресе не указан код капсулы.') + ' Возможно, ссылка устарела. Выберите капсулу из каталога — все они ниже.</p>' +
      '<div class="row"><a class="btn btn--primary" href="capsules.html">Все капсулы</a><a class="btn btn--ghost" href="index.html">На главную</a></div></section>' +
      others(D.capsules, 'Капсулы SOVEAPP');
    return;
  }

  document.title = c.code + ' · ' + c.name + ' — SOVEAPP';
  var soon = !!c.soon || !c.pricePerM2;
  var gallery = (c.gallery && c.gallery.length) ? c.gallery : [{ room: 'Интерьер', src: c.cover }];

  /* Подписи текстур. В data.js порядок materials не совпадает с порядком картинок dna,
     поэтому здесь своя раскладка: число — индекс в capsule.materials, строка — подпись того, что на текстуре. */
  var DNA_LABELS = {
    k1: [0, 2, 1, 'Ткань с орнаментом'],
    k2: [1, 'Мрамор тёмно-зелёный', 0, 'Дуб, ёлочка'],
    k3: ['Дуб выбеленный, ёлочка', 'Мрамор чёрно-белый', 1, 'Ткань голубая'],
    k4: [2, 0, 1, 'Шпон тёмный'],
    k5: ['Мрамор с тёплой прожилкой', 1, 'Бронза шлифованная', 0],
    k6: ['Дуб тёмный, ёлочка', 'Камень светлый', 'Плитка глазурованная', 'Плитка с чёрными вставками']
  };
  function dnaLabel(i) {
    var map = DNA_LABELS[c.id], v = map ? map[i] : i;
    if (typeof v === 'number') return (c.materials || [])[v] || '';
    return v || '';
  }

  /* ---------- первый экран ---------- */
  var arrowL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5 7.5 12l7 7"/></svg>';
  var arrowR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5l7 7-7 7"/></svg>';
  var many = gallery.length > 1;

  var galHtml =
    '<div class="cap-gal" id="cap-gal" role="group" aria-roledescription="галерея" aria-label="Фотографии капсулы ' + esc(c.code) + '">' +
    '<button type="button" class="cap-gal__frame" id="gal-frame"' + (many ? ' aria-label="Показать следующее фото"' : ' aria-label="Фото капсулы" disabled') + '>' +
    '<img id="gal-img" src="' + esc(gallery[0].src) + '" alt="Капсула ' + esc(c.code) + ', ' + esc(gallery[0].room.toLowerCase()) + '" width="1120" height="1400"></button>' +
    '<div class="cap-gal__cap"><p class="cap-gal__room" aria-live="polite"><b id="gal-room">' + esc(gallery[0].room) + '</b><span class="tiny muted num" id="gal-count">1 / ' + gallery.length + '</span>' +
    (many ? '<span class="tiny muted cap-gal__hint">листайте стрелками ← →</span>' : '') + '</p>' +
    (many ? '<div class="cap-gal__nav"><button type="button" id="gal-prev" aria-label="Предыдущее фото">' + arrowL + '</button><button type="button" id="gal-next" aria-label="Следующее фото">' + arrowR + '</button></div>' : '') + '</div>' +
    (many ? '<div class="cap-gal__thumbs" id="gal-thumbs">' + gallery.map(function (g, i) {
      return '<button type="button" class="cap-gal__thumb' + (i === 0 ? ' is-active' : '') + '" data-i="' + i + '" aria-label="' + esc(g.room) + ', фото ' + (i + 1) + ' из ' + gallery.length + '"' + (i === 0 ? ' aria-current="true"' : '') + '><img src="' + esc(g.src) + '" alt="" loading="lazy"></button>';
    }).join('') + '</div>' : '') +
    '</div>';

  var headHtml = '<div class="cap-head"><span class="eyebrow">' + esc(c.style) + (soon ? ' · скоро' : '') + '</span>' +
    '<span class="cap-code" aria-hidden="true">' + esc(c.code) + '</span>' +
    '<h1 class="cap-title"><span class="vh">Капсула ' + esc(c.code) + '. </span>' + esc(c.name) + '</h1></div>';

  var linkedProject = S.auth.isIn() ? S.projects.list().filter(function (p) { return p.capsuleId === c.id; })[0] : null;

  var infoHtml = '<div class="cap-info"><p class="lead">' + esc(c.concept) + '</p>' +
    (c.forWhom ? '<div class="cap-whom"><span class="eyebrow">Для кого</span><p class="text">' + esc(c.forWhom) + '</p></div>' : '');
  if (soon) {
    infoHtml += '<div class="cap-soon"><span class="h3">Капсула готовится</span>' +
      '<p class="text">Рендеры уже можно посмотреть. Цена за квадратный метр, товары и расчёт в Скауте появятся, когда соберём комплектацию.</p>' +
      '<div class="cap-cta"><a class="btn btn--primary btn--lg btn--block" href="capsules.html">Смотреть готовые капсулы</a></div></div>';
  } else {
    infoHtml += '<div class="cap-price"><div class="cap-price__row"><span class="cap-price__from">комплектация от</span><span class="big-num">' + F.rub(c.pricePerM2) + '/м²</span></div>' +
      '<div class="dim"><span>за 1 м² · базовый уровень</span></div>' +
      '<p class="tiny muted">В комплектации: ' + esc(D.scout.kitShares.map(function (k) { return k[0].toLowerCase(); }).join(', ')) + '.</p></div>' +
      '<div class="stack stack--3"><span class="label" id="cap-level-label">Уровень комплектации</span>' +
      '<div class="segmented cap-level" role="group" aria-labelledby="cap-level-label">' +
      '<button type="button" class="is-active" aria-pressed="true">Базовый<small class="num">от ' + F.rub(c.pricePerM2) + '/м²</small></button>' +
      '<button type="button" disabled aria-disabled="true">Премиум<small>данные готовятся</small></button></div></div>' +
      '<div class="cap-cta"><a class="btn btn--primary btn--lg btn--block" href="scout.html?capsule=' + c.id + '">Рассчитать ремонт в Скауте</a>' +
      (S.repair ? S.repair.saveButton('interior', { capsuleId: c.id, name: c.name, img: c.cover, dna: c.dna || [], productIds: S.repair.capsuleProducts(c.id).map(function (p) { return p.id; }) }, 'Сохранить мудборд в Мой ремонт', 'btn btn--dark btn--block') : '') +
      '<a class="btn btn--ghost btn--block" href="market.html?capsule=' + c.id + '">Все товары капсулы</a>' +
      '<p class="tiny muted">Скаут посчитает работы по этапам и комплектацию этой капсулы по вашей планировке.</p></div>' +
      (linkedProject ? '<div class="cap-inproject"><span class="small">Эта капсула выбрана в проекте «' + esc(linkedProject.name) + '»</span><a class="btn btn--link" href="project.html?id=' + encodeURIComponent(linkedProject.id) + '">Открыть проект</a></div>' : '');
  }
  infoHtml += '</div>';

  var html = crumbs(c.code) + '<section class="wrap cap-hero">' + headHtml + galHtml + infoHtml + '</section>';

  /* ---------- ДНК капсулы ---------- */
  var mats = c.materials || [];
  html += '<section class="wrap" aria-labelledby="cap-dna-title"><div class="cap-block stack stack--8">' +
    '<div class="cap-block__head"><div class="stack stack--3"><span class="eyebrow">Материалы и фактуры</span><h2 class="h2" id="cap-dna-title">ДНК капсулы</h2></div>' +
    '<p class="small muted">' + (mats.length ? 'В основе: ' + mats.map(function (m) { return esc(m.toLowerCase()); }).join(' · ') : 'Состав материалов уточняется — комплектация собирается.') + '</p></div>' +
    '<div class="grid grid--4 grid--gap-lg">' + (c.dna || []).slice(0, 4).map(function (src, i) {
      var label = dnaLabel(i);
      return '<figure class="cap-dna__tile"><img src="' + esc(src) + '" alt="Текстура' + (label ? ': ' + esc(label.toLowerCase()) : '') + '" loading="lazy" width="589" height="589">' +
        '<figcaption><span class="tiny muted num">0' + (i + 1) + '</span><span class="cap-dna__name">' + esc(label || 'Материал уточняется') + '</span></figcaption></figure>';
    }).join('') + '</div></div></section>';

  /* ---------- товары капсулы ---------- */
  if (!soon) {
    var items = D.products.filter(function (p) { return p.capsules && p.capsules.indexOf(c.id) >= 0; });
    var marketHref = 'market.html?capsule=' + c.id;
    html += '<section class="wrap" aria-labelledby="cap-goods-title"><div class="cap-block stack stack--8">' +
      '<div class="cap-block__head"><div class="stack stack--3"><span class="eyebrow">Маркет</span><h2 class="h2" id="cap-goods-title">Товары капсулы</h2>' +
      '<p class="small muted">' + (S.metod.active() ? 'У вас активна подписка METOD — зелёная цена действует для вас.' : 'Зелёная цена — по подписке METOD, зачёркнутая — розница. <a class="link" href="metod.html" style="white-space:nowrap">Что даёт METOD</a>') + '</p></div>' +
      (items.length ? '<a class="btn btn--link" href="' + marketHref + '">Все товары · ' + items.length + '</a>' : '') + '</div>' +
      (items.length
        ? '<div class="grid grid--4">' + items.slice(0, 8).map(function (p) { return S.ui.productCard(p); }).join('') + '</div>' +
          (items.length > 8 ? '<p class="small muted">Показаны 8 из ' + items.length + ' ' + plural(items.length, 'товара', 'товаров', 'товаров') + ' капсулы.</p>' : '')
        : '<div class="empty"><span class="empty__title">Товары этой капсулы ещё не выложены</span><span class="small muted">Пока можно посмотреть весь каталог партнёров.</span><a class="btn btn--ghost btn--sm" href="market.html">Открыть маркет</a></div>') +
      '</div></section>';

    /* ---------- что дальше ---------- */
    var adeptMin = Math.min.apply(null, D.adept.packages.map(function (p) { return p.rate; }));
    var worksMin = Math.min.apply(null, D.scout.states.map(function (s) { return s.rate; }));
    var paths = [
      { t: 'Примерить на своё фото', d: 'Загрузите фото комнаты или рендер — SOVEAPP AI найдёт похожие предметы в каталоге.', m: 'по фото — ' + F.tokens(D.costs.photo) + ', по рендеру — ' + F.tokens(D.costs.render), href: 'ai.html', a: 'Открыть SOVEAPP AI' },
      { t: 'Посчитать бюджет', d: 'Скаут разложит работы по этапам и посчитает комплектацию ' + c.code + ' по вашей планировке.', m: 'комплектация от ' + F.rub(c.pricePerM2) + '/м²', href: 'scout.html?capsule=' + c.id, a: 'К расчёту' },
      { t: 'Дизайн-проект', d: 'Дизайнер адаптирует капсулу под вашу квартиру: планировка, визуализации, чертежи.', m: 'Адепт · от ' + F.rub(adeptMin) + '/м²', href: 'adept.html?capsule=' + c.id, a: 'Об Адепте' },
      { t: 'Ремонт под ключ', d: 'Команда делает ремонт по капсуле. Этапы, акты и оплаты видны в кабинете.', m: 'Трек · работы от ' + F.rub(worksMin) + '/м²', href: 'track.html?capsule=' + c.id, a: 'О Треке' }
    ];
    html += '<section class="wrap" aria-labelledby="cap-next-title"><div class="cap-block stack stack--8">' +
      '<div class="cap-block__head"><div class="stack stack--3"><span class="eyebrow">Следующий шаг</span><h2 class="h2" id="cap-next-title">Что дальше</h2></div><p class="small muted">Начать можно с любого шага — капсула ' + esc(c.code) + ' перейдёт вместе с вами.</p></div>' +
      '<div class="grid grid--4 grid--gap-lg cap-paths">' + paths.map(function (p, i) {
        return '<a class="cap-path rule-top" href="' + p.href + '"><span class="cap-path__n" aria-hidden="true">0' + (i + 1) + '</span><h3 class="h4">' + esc(p.t) + '</h3><p class="small muted">' + esc(p.d) + '</p><span class="tiny muted num" style="white-space:normal">' + esc(p.m) + '</span><span class="arrow-link">' + esc(p.a) + '</span></a>';
      }).join('') + '</div></div></section>';
  }

  /* ---------- капсула в других комнатах (перенос блока «капсула в других проектах» с сайта) ---------- */
  if (!soon && c.slides && c.slides.length > 1) {
    var ROOM = { living: 'гостиная', bed: 'спальня', bath: 'санузел', hall: 'прихожая', dress: 'гардеробная', work: 'кабинет', other: 'ещё кадр' };
    html += '<section class="wrap" aria-labelledby="cap-rooms-title"><div class="cap-block stack stack--8">' +
      '<div class="cap-block__head"><div class="stack stack--3"><span class="eyebrow">Реализации</span>' +
      '<h2 class="h2" id="cap-rooms-title">Капсула в других комнатах</h2>' +
      '<p class="small muted">Те же материалы и палитра в разных помещениях — так капсула выглядит в собранных проектах.</p></div></div>' +
      '<div class="lane cap-rooms">' + c.slides.slice(0, 6).map(function (sl) {
        var m = /(living|bed|bath|hall|dress|work|other)/.exec(sl.src) || [];
        return '<figure class="cap-room"><img src="' + sl.src + '" alt="' + esc(c.code) + ', ' + esc(ROOM[m[1]] || 'интерьер') + '" loading="lazy">' +
          '<figcaption>' + esc(ROOM[m[1]] || 'интерьер') + '</figcaption></figure>';
      }).join('') + '</div></div></section>';
  }

  /* ---------- другие капсулы ---------- */
  html += others(D.capsules.filter(function (o) { return o.id !== c.id; }), 'Другие капсулы');
  root.innerHTML = html;

  /* ---------- поведение галереи ---------- */
  if (!many) return;
  var idx = 0, img = document.getElementById('gal-img'), room = document.getElementById('gal-room'), count = document.getElementById('gal-count');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('#gal-thumbs .cap-gal__thumb'));
  gallery.forEach(function (g) { var pre = new Image(); pre.src = g.src; });
  var swapTimer = null;
  function show(i) {
    i = (i + gallery.length) % gallery.length;
    if (i === idx) return;
    idx = i;
    var g = gallery[i];
    img.classList.add('is-swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      img.src = g.src; img.alt = 'Капсула ' + c.code + ', ' + g.room.toLowerCase();
      var done = function () { img.classList.remove('is-swap'); };
      if (img.complete) done(); else { img.onload = done; img.onerror = done; }
    }, 120);
    room.textContent = g.room; count.textContent = (i + 1) + ' / ' + gallery.length;
    thumbs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-active', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  }
  document.getElementById('gal-frame').addEventListener('click', function () { show(idx + 1); });
  document.getElementById('gal-prev').addEventListener('click', function () { show(idx - 1); });
  document.getElementById('gal-next').addEventListener('click', function () { show(idx + 1); });
  thumbs.forEach(function (t) { t.addEventListener('click', function () { show(Number(t.getAttribute('data-i'))); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (document.querySelector('.modal-back')) return;
    var drawer = document.querySelector('.drawer'); if (drawer && !drawer.hidden) return;
    e.preventDefault();
    show(idx + (e.key === 'ArrowRight' ? 1 : -1));
  });
  /* свайп на телефоне */
  var frame = document.getElementById('gal-frame'), x0 = null, swiped = false;
  frame.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; swiped = false; }, { passive: true });
  frame.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { swiped = true; show(idx + (dx < 0 ? 1 : -1)); }
  }, { passive: true });
  frame.addEventListener('click', function (e) { if (swiped) { e.stopImmediatePropagation(); swiped = false; } }, true);
})();
