/* Генерации — главная (ТЗ 22.10, п. 1). Вид — 1:1 из эталонов A–E (sove-ai-variants.js),
   вариант по умолчанию — из sove-ai-config.js, переключатель A–E сверху.
   Здесь нет товаров, корзины и квартиры: только заголовок, блоки генераций (в B их два — Вика 28.10), капсулы. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW;
  var CFG = window.SOVE_AI_CONFIG, V = window.SOVE_AI_VARIANTS;
  var root = document.getElementById('sa-root'); if (!root || !V) return;
  var VKEY = 'sove.ai.variant.v2';   /* v2: сброс выбора — у всех открывается B (22.10) */

  function variant() { if (!/[?&]variants=1/.test(location.search)) return 'B'; var v = null; try { v = localStorage.getItem(VKEY); } catch (e) {} return (V[v] || v === 'F') ? v : CFG.variant; }

  /* история генераций: sove.gen.history[квартира | none] = { plan, materials, visual } */
  function hist() {
    var all = {}; try { all = JSON.parse(localStorage.getItem('sove.gen.history') || '{}') || {}; } catch (e) {}
    var out = { plan: [], materials: [], visual: [] };
    Object.keys(all).forEach(function (k) { ['plan', 'materials', 'visual'].forEach(function (t) { out[t] = out[t].concat((all[k] || {})[t] || []); }); });
    return out;
  }
  function count(h) { return h.plan.length + h.materials.length + h.visual.length; }

  function price(g) {
    var p = CFG.GEN_PRICES[g];
    if (p === 0) return 'бесплатно';
    if (p === null || p === undefined) return '[N] токенов';
    return (CFG.fromPrice && CFG.fromPrice[g] ? 'от ' : '') + F.tokens(p) + (CFG.perFrame[g] ? (g === 'g5' ? ' за комнату' : ' за кадр') : '');
  }
  function tokensLabel() { return S.auth.isIn() ? F.tokens(S.tokens.balance()) : F.tokens(CFG.giftTokens) + ' 🎁'; }

  /* куда ведёт каждая генерация */
  /* Планировка всегда открывается с первой продающей страницы (ТЗ-planirovka 18.0, Алина), а не сразу с мебели */
  function planHref() { return 'plan-demo.html'; }
  /* Алина 26.10: мудборд живёт в Интерьере — «Мудборд по рендеру» и «Открыть мудборд» ведут в interior.html, а не в поиск по фото */
  var MOODBOARD = 'interior.html';
  var GEN = [
    { re: /^План → 3D/, href: function () { return planHref(); } },
    { re: /^Расстановка/, href: function () { return 'arrange.html?v=panel&flow=1'; } },
    { re: /^Мудборд по рендеру/, href: function () { return MOODBOARD; } },
    { re: /^Материал по фото/, href: function () { return 'ai.html?mode=photo'; } },
    { re: /^Примерка капсулы/, href: function () { return 'interior.html?tab=rooms'; } },
    { re: /^Своя капсула/, href: function () { return 'interior.html'; } },
    { re: /^Замена предмета/, href: function () { return 'result.html?gen=g6'; } },
    { re: /^Спальня/, href: function () { return 'interior.html?tab=rooms'; } },
    { re: /^Открыть мудборд/, href: function () { return MOODBOARD; } },
    /* карточки блока «Интерьер» (лента F; Алина 25.10) — туда же, куда в окне «Создать» */
    { re: /^Капсула SOVE/, href: function () { return 'interior.html'; } },
    { re: /^Своя картинка/, href: function () { return 'interior.html'; } },
    { re: /^Комнаты · рендеры/, href: function () { return 'interior.html?tab=rooms'; } }
  ];
  /* «Пример ›» блока «Материалы» (варианты A–F) — готовые варианты мудборда (gen-new.html?example=1), а не поиск по фото (26.10).
     Вика 28.10: «Пример ›» блока «2 Интерьеры» (interiorEx) — стартовый экран Интерьера «Так будет выглядеть результат» с К2 (?v=a),
     и при своей доске тоже. Не ?capsule=k2: он сразу собирает доску капсулы и списывает токены (гостя уводит на вход) */
  var BLOCK_HREF = { plan: 'plan-demo.html', materials: 'gen-new.html?type=moodboard&example=1', visual: 'interior.html?tab=rooms', interior: 'interior.html', interiorEx: 'interior.html?v=a' };
  var CAPS = { 'Изумрудная неоклассика': 'k2', 'Бургундский камень': 'k1', 'Минимализм с голубым': 'k3', 'Тёплая классика': 'k4', 'Органика в песочном': 'k5' };

  /* к какому блоку относится элемент: ближайший предок, в тексте которого ровно один из трёх блоков */
  function blockOf(el) {
    for (var n = el; n && n !== root; n = n.parentElement) {
      var t = n.textContent, hit = [['plan', 'Планировка'], ['materials', 'Материалы'], ['visual', 'Визуализации'], ['interior', 'Интерьер']].filter(function (b) { return t.indexOf(b[1]) >= 0; });
      if (hit.length === 1) return hit[0][0];
      if (hit.length > 1) return null;
    }
    return null;
  }
  function textOf(el) { var b = el.querySelector('b'); return (b ? b.textContent : el.textContent).trim(); }

  function wire(h) {
    root.querySelectorAll('.sai-body button, .sai-body a').forEach(function (el) {
      var t = el.textContent.replace(/\s+/g, ' ').trim(), tb = textOf(el);
      if (/＋ Создать/.test(t)) { el.setAttribute('data-create', ''); if (el.tagName === 'A') el.setAttribute('href', '#create'); return; }
      /* история блока: «Ваши планировки · 0 ›», «Мудборды · 0 ›», «история · 0 ›» */
      var hm = t.match(/^(Ваши )?(планировки|мудборды|рендеры|история)\s·\s\d+/i);
      if (hm) {
        var type = { 'планировки': 'plan', 'мудборды': 'materials', 'рендеры': 'visual' }[hm[2].toLowerCase()] || blockOf(el);
        if (type) { el.innerHTML = el.innerHTML.replace(/·\s\d+/, '· ' + h[type].length); el.setAttribute('data-hist', type); el.setAttribute('href', '#'); }
        return;
      }
      if (/^пример\s›/i.test(t)) { var bt = blockOf(el); if (bt) el.setAttribute('href', BLOCK_HREF[bt]); return; }
      if (/^Все 7/.test(t)) { el.setAttribute('href', 'capsules.html'); return; }
      var cap = Object.keys(CAPS).filter(function (n) { return tb === n; })[0];
      if (cap) { el.setAttribute('href', 'interior.html?capsule=' + CAPS[cap] + '&tab=rooms'); return; }
      for (var i = 0; i < GEN.length; i++) {
        if (GEN[i].re.test(tb)) {
          var href = GEN[i].href();
          if (el.tagName === 'A') el.setAttribute('href', href); else el.setAttribute('data-go', href);
          return;
        }
      }
    });
  }

  function header() {
    return '<header class="sai-hd"><div class="sai-hd__t">Генерации</div>' +
      '<div class="sai-hd__r"><span class="sai-hd__tok">' + esc(tokensLabel()) + '</span></div></header>';
  }
  function switcher(v) {
    return '<div class="sai-var" role="group" aria-label="Вариант главной"><span>вариант</span>' + 'ABCDEF'.split('').map(function (x) {
      return '<button type="button" data-var="' + x + '" class="' + (x === v ? 'is-on' : '') + '" aria-pressed="' + (x === v) + '">' + x + '</button>';
    }).join('') + '</div>';
  }
  /* мост к Дизайн-проект — после «Своей капсулы» или 5+ генераций */
  function adept(h) {
    var own = h.visual.some(function (x) { return x.gen === 'g5' || x.mode === 'own'; });
    if (!own && count(h) < 5) return '';
    return '<a class="sai-adept" href="adept.html"><b>Дизайнер доведёт до проекта с чертежами</b><span>промокод 5 000 ₽ для METOD · дизайн-проект ›</span></a>';
  }

  /* в заголовке: визуализация с товарами из Маркета и планировка (просьба Алины 22.10) —
     та же квартира ЖК PRIDE в «Изумрудной неоклассике», товары и цены METOD — из каталога */
  var HERO_TAGS = [{ id: 202, x: 52, y: 8 }, { id: 107, x: 5, y: 34 }, { id: 106, x: 50, y: 54 }];
  function heroViz() {
    var tags = HERO_TAGS.map(function (t) {
      var p = D.product(t.id); if (!p) return '';
      return '<span class="sai-hv__tag" style="left:' + t.x + '%;top:' + t.y + '%"><b>' + esc(p.name.split(',')[0]) + '</b>' + F.rub(p.metod) + '</span>';
    }).join('');
    return '<div class="sai-hv">' +
      '<a class="sai-hv__r" href="interior.html?tab=rooms"><img src="assets/img/demo/3-kuhnya-gostinaya.jpg" alt="Визуализация кухни-гостиной с товарами">' + tags +
        '<i>визуализация с товарами</i></a>' +
      '<a class="sai-hv__p" href="' + planHref() + '"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="Планировка квартиры в 3D"><i>планировка</i></a>' +
      '</div>';
  }

  /* вариант F — горизонтальная лента генераций (просьба Алины 22.10). Заголовок и капсулы — как в A,
     вместо трёх блоков одна лента из 6 карточек; фото живое, подписи тёмным на белом */
  var FEED = [
    { g: 'g1', grp: 'ПЛАНИРОВКА', c: '#2E6B4E', t: 'План → 3D', d: 'план, расстановка мебели', img: 'g-domik.jpg' },
    { g: 'g4', grp: 'ИНТЕРЬЕР', c: '#A24E32', t: 'Капсула SOVEAPP', d: 'ДНК, 12 материалов и комнаты дизайнера', img: 'k2-kitchen.jpg' },
    { g: 'g2', grp: 'ИНТЕРЬЕР', c: '#A24E32', t: 'Своя картинка → капсула', d: 'рендер, фото, Pinterest → ДНК и доска', img: 'k1-living.jpg' },
    { g: 'g5', grp: 'ИНТЕРЬЕР', c: '#A24E32', t: 'Комнаты · рендеры', d: 'на твоём плане · тап по материалу — замена', img: 'k5.jpg' }
  ];
  function variantF() {
    var tmp = document.createElement('div'); tmp.innerHTML = V.A;
    var kids = tmp.children, hero = kids[0].outerHTML, caps = kids[kids.length - 1].outerHTML;
    return hero +
      '<section class="sai-f"><div class="sai-f__h"><b>Что можно создать</b><span>' + FEED.length + ' генерации · листай ›</span></div>' +
      '<div class="sai-f__row">' + FEED.map(function (x) {
        return '<a class="sai-f__c" href="#"><span class="sai-f__pic" style="background-image:url(assets/img/sove-ai/' + x.img + ')"><i style="background:' + x.c + '">' + x.grp + '</i></span>' +
          '<span class="sai-f__b"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small><em class="' + (CFG.GEN_PRICES[x.g] === 0 ? 'is-free' : '') + '">' + esc(price(x.g)) + '</em></span></a>';
      }).join('') + '</div>' +
      '<div class="sai-f__hist"><a href="#">Планировки · 0 ›</a><a href="#">Капсулы · 0 ›</a></div></section>' + caps;
  }

  /* вариант B по референсам Вики 23.10 (утвердила B как основу): фото с товарами, «+ Создать» ведёт в новую генерацию
     (gen-new.html), светлые блоки, внизу капсулы SOVEAPP с палитрой; заголовка «Создай свой интерьер» в макете 27.10 нет.
     Вика 28.10 (макет): блоков два — «1 Планировка» (слева 3D-план, справа текст и «Перейти к планировке ›») и
     «2 Интерьеры» (бывшие 2 и 3 одним блоком: кадр комнаты + мудборд, ряд комнат, «Создай интерьер ›»). Третьего блока нет. */
  var G = window.SOVE_GEN;
  /* шапка блока: кружок с номером, заголовок, «Пример ›»; подпись под ними во всю ширину (Вика 28.10).
     В разметке подпись сразу за заголовком, ссылка — после: диктор читает их подряд; места на экране задают grid-area */
  function blockHead(n, t, sub, ex) {
    return '<header class="gai-blk__h"><span class="gai-blk__n">' + n + '</span><h2>' + esc(t) + '</h2><p>' + esc(sub) + '</p>' +
      '<a class="gai-blk__ex" href="' + esc(ex) + '" aria-label="Пример: ' + esc(t) + '">Пример ' + G.ic('chev', 14) + '</a></header>';
  }
  /* контурная кнопка-пилюля терракотой (Вика 28.10) */
  function pill(t, href, mod) {
    return '<a class="gai-pill' + (mod ? ' gai-pill--' + mod : '') + '" href="' + esc(href) + '"><span>' + esc(t) + '</span>' + G.ic('chev', 16) + '</a>';
  }
  /* «1 Планировка» (Вика 28.10): слева 3D-план квартиры, справа по центру — текст и «Перейти к планировке ›» */
  function planBlock() {
    return '<section class="gai-blk">' + blockHead(1, 'Планировка', 'План, расстановка мебели и комнат', BLOCK_HREF.plan) +
      '<div class="gai-plan"><a class="gai-plan__pic" href="' + esc(planHref()) + '"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="Планировка квартиры в 3D" loading="lazy"></a>' +
      '<div class="gai-plan__side"><p>Создайте план с&nbsp;учётом ваших помещений и&nbsp;мебели</p>' + pill('Перейти к планировке', planHref()) + '</div></div></section>';
  }
  /* шапка по скрину Вики 23.10: наша зелёная кухня-гостиная капсулы К2 «Изумрудная неоклассика» с подписями товаров
     этой же капсулы из каталога (цены METOD). x/y — точка на предмете, lx/ly — подпись справа, ax — правый край подписи слева (% кадра) */
  var HERO_CAP = 'k2';
  var HERO = [{ id: 202, t: 'Люстра «Шары»', x: 41, y: 17, lx: 51, ly: 5 }, { id: 107, x: 39, y: 47, ax: 33, ly: 27 }, { id: 106, t: 'Стул с подлокотниками', x: 51, y: 52, lx: 57, ly: 62 }];
  function heroShot() {
    var lines = [], labels = [];
    HERO.forEach(function (h) {
      var p = D.product(h.id); if (!p || (p.capsules || []).indexOf(HERO_CAP) < 0) return;
      var name = h.t || p.name.split(',')[0], left = h.ax !== undefined;
      var tx = left ? h.ax + 0.5 : h.lx - 0.5, ty = h.ly + 4.5;
      lines.push('<line x1="' + h.x + '" y1="' + h.y + '" x2="' + tx + '" y2="' + ty + '"/>');
      labels.push('<i class="gai-dot" style="left:' + h.x + '%;top:' + h.y + '%"></i>' +
        '<a class="gai-tag' + (left ? ' gai-tag--l' : '') + '" href="product.html?id=' + p.id + '" style="' + (left ? 'right:' + (100 - h.ax) : 'left:' + h.lx) + '%;top:' + h.ly + '%">' +
        '<span>' + esc(name) + '</span><b>' + F.rub(p.metod) + '</b></a>');
    });
    var c = D.capsule(HERO_CAP);
    return '<div class="gai-hero__pic"><img src="assets/img/demo/3-kuhnya-gostinaya.jpg" alt="Кухня-гостиная в капсуле «' + esc(c ? c.name : '') + '» с подписями товаров" width="824" height="1100">' +
      '<svg class="gai-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + lines.join('') + '</svg>' + labels.join('') +
      /* Алина 26.10: «визуализация с товарами» ведёт в Интерьер на комнаты (interior.html?tab=rooms) — без ?capsule=:
         он сразу собирает доску капсулы и списывает токены, гостя уводит на вход */
      '<a class="gai-hero__chip" href="interior.html?tab=rooms">' + G.ic('cube', 18) + '<span>Визуализация с товарами</span></a></div>';
  }
  /* «2 Интерьеры» (Вика 28.10: «соедини 2 и 3 как я сделала») — заменил карточку «2 Интерьер» из ветки Алины:
     слева кадр комнаты, справа мудборд материалов, ниже ряд комнат (тап меняет кадр слева), внизу «Создай интерьер ›» */
  var RM = [
    { t: 'Кухня-гостиная', img: '3-kuhnya-gostinaya' },
    { t: 'Спальня', img: '2-spalnya' },
    { t: 'Санузел', img: '4-sanuzel' },
    { t: 'Прихожая', img: '5-prihozhaya' }
  ];
  function interiorBlock() {
    return '<section class="gai-blk">' + blockHead(2, 'Интерьеры', 'Капсулы, материалы и визуализации в одном месте', BLOCK_HREF.interiorEx) +
      '<div class="gai-int"><span class="gai-int__pic"><img src="assets/img/demo/' + RM[0].img + '.jpg" alt="' + esc(RM[0].t) + '" data-rm-img loading="lazy"></span>' +
      '<span class="gai-int__pic gai-int__pic--mb"><img src="assets/img/sove-ai/mb-ref.jpg" alt="Мудборд материалов" loading="lazy"></span></div>' +
      '<div class="gai-rooms">' + RM.map(function (r, i) {
        return '<button type="button" class="gai-room' + (i === 0 ? ' is-on' : '') + '" data-rm="' + i + '" aria-pressed="' + (i === 0) + '">' +
          '<span class="gai-room__pic"><img src="assets/img/demo/' + r.img + '.jpg" alt="" loading="lazy"></span><span>' + esc(r.t) + '</span></button>';
      }).join('') + '</div>' + pill('Создай интерьер', BLOCK_HREF.interior, 'wide') + '</section>';
  }
  /* макет Вики 27.10: сверху фото с товарами во всю ширину — без шапки и заголовка; «+ Создать» на светлой подложке,
     которая наезжает на низ фото; под ней два блока и капсулы. Заголовок страницы — только для экранного диктора */
  function variantB() {
    var hero = '<section class="gai-hero"><h1 class="vh">Генерации</h1>' + heroShot() + '</section>';
    var create = '<a class="gai-create" href="gen-new.html">' + G.ic('plus', 22) + '<span>Создать</span></a>';
    var caps = D.capsules.filter(function (c) { return !c.soon && CAPS_ORDER.indexOf(c.id) >= 0; }).sort(function (a, b) { return CAPS_ORDER.indexOf(a.id) - CAPS_ORDER.indexOf(b.id); });
    var capsHtml = '<section class="gai-caps"><header class="gai-caps__h"><div><h2>Капсулы SOVEAPP</h2><p>Готовые интерьерные решения под разные стили</p></div><a href="capsules.html">Все ' + D.capsules.filter(function (c) { return !c.soon; }).length + ' ' + G.ic('chev', 14) + '</a></header>' +
      '<div class="gai-caps__row">' + caps.map(function (c) {
        return '<a class="gai-cap" href="interior.html?capsule=' + c.id + '"><span class="gai-cap__pic"><img src="' + esc(c.wide || c.cover) + '"' + G.pos(c, c.wide || c.cover) + ' alt="" loading="lazy"></span>' +
          '<b>' + esc(SHORT[c.id] || c.name) + '</b>' + G.dots(c) + '</a>';
      }).join('') + '</div></section>';
    return hero + '<div class="gai-sheet">' + create + '<div class="gai-stack">' + planBlock() + interiorBlock() + '</div>' + capsHtml + '</div>';
  }
  /* четыре капсулы, как в макете; короткие имена — как в эталонах Алины */
  var CAPS_ORDER = ['k2', 'k1', 'k3', 'k4'];
  var SHORT = { k1: 'Бургундский камень', k2: 'Изумрудная неоклассика', k3: 'Минимализм с голубым', k4: 'Тёплая классика', k5: 'Органика в песочном' };

  function render() {
    var v = variant(), h = hist(), n = 0;
    if (v === 'B' || !ui_variants()) {
      root.innerHTML = '<div class="sai-body gai">' + variantB() + '</div>' + adept(h);
      return;
    }
    /* прежние варианты A–F — только по ссылке sove-ai.html?variants=1 (Вика выбрала B 23.10) */
    var body = (v === 'F' ? variantF() : V[v]).replace(/\[N\] токенов/g, function () { n++; return price(n === 1 ? 'g2' : 'g3'); });
    root.innerHTML = switcher(v) + header() + '<div class="sai-body">' + body + '</div>' + adept(h);
    var b = root.querySelector('.sai-body');
    /* Алина 22.10: «Материал по фото» — не генерация, а поиск товара по фото в Маркете; из блока Материалы убираем */
    b.querySelectorAll('b').forEach(function (x) { if ((x.textContent || '').trim() === 'Материал по фото') { var el = x.closest('button, a') || x.parentNode; if (el && b.contains(el)) el.remove(); } });
    if (b.firstElementChild) b.firstElementChild.insertAdjacentHTML('afterend', heroViz());
    wire(h);
  }
  function ui_variants() { return /[?&]variants=1/.test(location.search); }

  function showHist(type) {
    var names = { plan: 'Ваши планировки', materials: 'Ваши капсулы', visual: 'Ваши комнаты', interior: 'Ваши капсулы' };
    var list = hist()[type] || [];   /* у «Интерьера» своей истории нет — пусто, а не ошибка */
    S.ui.modal({ eyebrow: 'История генераций', title: names[type] + ' · ' + list.length,
      html: list.length ? '<ul class="sai-hl">' + list.map(function (x) {
        return '<li><a href="' + esc(x.href || BLOCK_HREF[type]) + '">' + (x.src ? '<img src="' + esc(x.src) + '" alt="">' : '') +
          '<span><b>' + esc(x.title || 'Генерация') + '</b><i>' + (x.ts ? F.dateLong(x.ts) : '') + (x.status === 'draft' ? ' · не закончено' : '') + '</i></span></a></li>';
      }).join('') + '</ul>' : '<p class="text">Пока пусто — всё, что создашь, сохранится сюда.</p>',
      actions: [{ label: 'Закрыть', kind: 'ghost' }] });
  }

  root.addEventListener('click', function (e) {
    /* ряд комнат блока «Интерьеры»: тап меняет большой кадр слева (Вика 28.10) */
    var rm = e.target.closest('[data-rm]');
    if (rm) {
      var r = RM[+rm.dataset.rm], img = root.querySelector('[data-rm-img]');
      if (img) { img.src = 'assets/img/demo/' + r.img + '.jpg'; img.alt = r.t; }
      root.querySelectorAll('[data-rm]').forEach(function (b) { var on = b === rm; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      return;
    }
    var x = e.target.closest('[data-var]');
    if (x) { try { localStorage.setItem(VKEY, x.dataset.var); } catch (err) {} render(); return; }
    if (e.target.closest('[data-create]')) return;   /* шторку открывает sove-ai-create.js */
    x = e.target.closest('[data-hist]');
    if (x) { e.preventDefault(); showHist(x.dataset.hist); return; }
    x = e.target.closest('[data-go]');
    if (x) { location.href = x.dataset.go; return; }
    x = e.target.closest('a[href="#"]');
    if (x) e.preventDefault();
  });
  S.onChange(function () { var t = root.querySelector('.sai-hd__tok'); if (t) t.textContent = tokensLabel(); });
  render();
})();
