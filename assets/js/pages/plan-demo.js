/* Блок «Планировка», сценарий 1 «3D + мебель» (ТЗ-planirovka, эталоны A1–A4):
   A1 какой план есть → A2 чтение плана → A3 проверь план → A4 вопросы по плану → расстановка (arrange.html).
   Разметку своего плана делает POST /ai/plan/markup; пример ЖК PRIDE показываем готовым, без вызова.
   Вопросы строятся по найденному в плане: чего в плане нет — не спрашиваем, варианты отсекаем по метражу. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW, D = S.data;
  var root = document.getElementById('pd-root'); if (!root) return;
  var P3 = window.SOVE_PLAN3D || { ok: false };
  var SRC = window.SOVE_ARRANGE || { rooms: [], flat: '' };
  var KIND = new URLSearchParams(location.search).get('scn') === 'project' ? 'project' : 'flow';

  /* пример ЖК PRIDE: комнаты из arrange-data.js, гостиная в плане — кухня-гостиная */
  var SAMPLE_ROOMS = SRC.rooms.filter(function (r) { return !r.part_of; })
    .map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; })
    .sort(function (a, b) { return b.m2 - a.m2; });
  var PLAN_IMG = 'assets/img/sove-ai/g-domik.jpg';
  /* подписи на плане примера: комнаты и техническая разметка (п. A3), координаты — в долях картинки */
  var SAMPLE_TAGS = [
    { t: 'Спальня · 14,4 м²', x: 24, y: 25 }, { t: 'Санузел · 5,6', x: 68, y: 22 },
    { t: 'Кухня-гостиная · 21,5 м²', x: 38, y: 74 }, { t: 'Прихожая · 5,5', x: 80, y: 57 },
    { t: '▮ несущая', x: 12, y: 50, k: 'wall' }, { t: '● стояк', x: 86, y: 12, k: 'riser' },
    { t: '▦ вентшахта', x: 60, y: 58, k: 'riser' }, { t: '◫ окно', x: 40, y: 94, k: 'win' }, { t: '⇥ вход', x: 92, y: 68, k: 'door' }
  ];
  /* что нашли в плане примера: ширина стены у стояка, проход у кровати, ниша, место под ванну */
  /* размеры кровати и с какой площади спальни их предлагаем (Вика 05.11: «160×200 маленькая, нужны 180, 200×200, 2×2,1 и 2×2,2»;
     пороги — Валерия 05.11: 200×200 от 15 м², 200×210 и 200×220 от 17 м²; раньше по ТЗ Алины — 140 / 160 от 10 м² / 180 от 13 м²) */
  var BED_SIZES = ['140×200', '160×200', '180×200', '200×200', '200×210', '200×220'];
  function bedMaxFor(m2) { return m2 >= 17 ? '200×220' : m2 >= 15 ? '200×200' : m2 >= 13 ? '180×200' : m2 >= 10 ? '160×200' : '140×200'; }
  var SAMPLE_FACTS = { bedMax: '160×200', bedWhy: 'не останется прохода 70 см', kitchenWall: 3.1, kitchenWide: false, niche: true, bathBoth: false, dineZone: 8 };

  var SOURCES = [
    { k: 'developer', t: 'План застройщика', d: 'из договора или с сайта ЖК', tag: 'бюджет примерно' },
    { k: 'measure', t: 'Обмерный план', d: 'после замера, точные размеры', tag: 'бюджет точнее' }
    /* «Дизайн-проект» и «Плана нет» с первого экрана убраны (Алина 24.10): проект загружают в Мой ремонт — ссылка внизу экрана */
  ];
  var ACCURACY = { developer: 'примерно', measure: 'точнее', project: 'точно', none: 'примерно' };

  var saved = FLOW.load();
  var st = { view: 'idle', source: 'developer', fileName: null, live: null, error: null, typical: null,
             noplan: { m2: '', rooms: 2 }, answers: {}, interior: null, state: null, mode: '3d', geo: null,
             rp: { purpose: null, who: '2', guests: 'не нужно', add: [] },
             seq: 0, entry: false, placingFrom: null,
             /* чтение своего плана: запрос (с .abort()), таймер ожидания, последняя запись для возврата, ошибка чтения, отсчёт повтора */
             req: null, tick: null, keep: null, err: null, cdLeft: 0,
             /* правки на «Проверь план» (PR2): подсказки серверу для перечитывания (rotation, flat_box_2d, is_plan, entrance_point_2d),
                типы комнат из списка (types; touched — какие человек выбрал сам, их по названию не подстраиваем), локальные повороты
                картинки (rot, градусы), лист с несколькими квартирами (sheet), режим тапа (pick), ответ «не план» (np), выбранная
                квартира на листе (flatPick), правки для переноса после «Прочитать ещё раз» (carry) */
             hints: {}, types: null, touched: null, rot: 0, sheet: null, pick: null, np: null, flatPick: null, carry: null };

  /* стадии чтения примера (локальная анимация) и честные стадии своего плана: отправка файла → ответ сервера */
  var READ_STAGES = ['Стены: несущие и перегородки', 'Комнаты и площади', 'Двери, окна, вход', 'Стояки и вентшахты'];
  var WAIT_STAGES = ['Отправляю файл', 'Ищу комнаты, стены и двери'];
  var MAX_MB = 20, PDF_MAX_MB = 10, FILE_ACCEPT = 'image/*,application/pdf,.heic,.heif';
  var STEP = { idle: 'plan', upload: 'plan', zk: 'plan', noplan: 'plan', error: 'plan', notplan: 'plan', reading: 'read', flats: 'read', rooms: 'check', brief: 'questions', placing: 'questions' };
  var Q = new URLSearchParams(location.search);
  var ZK = window.SOVE_ZK || null;

  /* без «‹ Шаг назад»: на первом экране и на вопросах, открытых сразу по ссылке (?replan=1 / ?tune=1, st.entry) — предыдущего шага нет */
  function noStep(h) { return h.replace(/<button[^>]*data-pz-step[^>]*>[^<]*<\/button>/, ''); }
  function head() { var h = FLOW.blockHead(KIND, STEP[st.view] || 'plan'); return st.view === 'brief' && st.entry ? noStep(h) : h; }
  function title(t, sub) { return '<div class="pz-title"><h2>' + esc(t) + '</h2>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>'; }
  function flatName() { return st.live ? (st.fileName || 'твой план') : st.typical ? 'типовой план · ' + F.area(st.typical.m2) : 'ЖК PRIDE · 47,3 м²'; }

  /* ── Первый экран — макет Вики 28.10: «← Назад» и генерации плашкой, «Планировка», блок «Что вы получите»
     (План → 3D интерьер → Бюджет), цветной пример с ценниками и бюджетом, «Загрузить план»,
     «Найди свой план у застройщика» (база — assets/js/kb/zk.js). Полосы шагов здесь нет: шаг 1 начинается с загрузки ── */
  var CAT = window.SOVE_ARRANGE_CATALOG || {};
  function plural(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }
  function mln(v) { return v === null || v === undefined ? '[сумма]' : (Math.round(v / 1e5) / 10).toFixed(1).replace('.', ','); }
  function headNoBar() { return head().replace(/<div class="pz-bar"[\s\S]*?<\/div>/, ''); }
  /* шапка первого экрана (Вика 28.10): на фоне страницы, без белой полосы; генерации — плашкой. На шагах шапка прежняя */
  function startHead() { return noStep(headNoBar()).replace('class="pz-head"', 'class="pz-head pz-head--start"'); }
  /* значки первого экрана линиями, цвет — в CSS (Вика 28.10); .f — заливка цветом кружка, чтобы стопки монет не просвечивали */
  var ICO = {
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M11 3.5V9M11 12.5v8M3.5 12.5H7M11 12.5h3.5M17.5 12.5h3"/></svg>',
    cube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    coins: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M12.5 12c0-1 1.9-1.8 4.25-1.8S21 11 21 12v6.2c0 1-1.9 1.8-4.25 1.8s-4.25-.8-4.25-1.8z"/>' +
      '<path d="M12.5 12c0 1 1.9 1.8 4.25 1.8S21 13 21 12M12.5 15.1c0 1 1.9 1.8 4.25 1.8S21 16.1 21 15.1"/>' +
      '<path class="f" d="M3 6c0-1.1 2.2-2 5-2s5 .9 5 2v12c0 1.1-2.2 2-5 2s-5-.9-5-2z"/><path d="M3 6c0 1.1 2.2 2 5 2s5-.9 5-2M3 10c0 1.1 2.2 2 5 2s5-.9 5-2M3 14c0 1.1 2.2 2 5 2s5-.9 5-2"/></svg>',
    arrow: '<svg viewBox="0 0 14 10" aria-hidden="true"><path d="M1 5h11.5M8.5 1.2L12.5 5l-4 3.8"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M4.5 14.5v3.75c0 .97.78 1.75 1.75 1.75h11.5c.97 0 1.75-.78 1.75-1.75V14.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>'
  };
  /* «Что вы получите» (Вика 28.10): три карточки в ряд со стрелками — что даст загрузка плана */
  var GETS = [
    { ic: 'plan', t: 'План', d: 'Удобная планировка' },
    { ic: 'cube', t: '3D интерьер', d: 'Ваш объект в\u00a0объёме' },
    { ic: 'coins', t: 'Бюджет', d: 'Примерная стоимость ремонта' }
  ];
  function gets() {
    return '<section class="pz-gets" aria-label="Что вы получите"><b class="pz-gets__k">Что вы получите</b>' +
      '<p class="pz-gets__s">Загрузите план — и до минуты получите:</p><div class="pz-gets__row">' +
      GETS.map(function (g, i) {
        return (i ? '<em class="pz-gets__ar">' + ICO.arrow + '</em>' : '') +
          '<div class="pz-gets__i"><i>' + ICO[g.ic] + '</i><span><b>' + esc(g.t) + '</b><small>' + esc(g.d) + '</small></span></div>';
      }).join('') + '</div></section>';
  }
  /* пример — ЖК PRIDE 2-комн 47,3 м² + «Изумрудная неоклассика»; бюджет считает Расчёт бюджета (SOVE_ZK.budgetExample) */
  function example() {
    var x = ZK && ZK.layout('pride-2k-47'); if (!x) return null;
    return { zk: x.zk, l: x.layout, b: ZK.budgetExample(x.layout), lay: ZK.layoutOf(x.layout), geo: ZK.markupOf(x.layout) };
  }
  /* ценники: предметы расстановки примера, цены — каталог Маркета (arrange-catalog.js); одинаковые — одной плашкой «×2»;
     не больше 8, самые дорогие. Координаты — в пикселях плана примера (те же, что у картинки 3D 730×610).
     Точка выноски у одинаковых — первый из них, а не середина между ними (Вика 28.10: линия ведёт к предмету) */
  function heroTags(E) {
    if (!E || !E.lay) return [];
    var by = {};
    E.lay.furniture.forEach(function (it) {
      var p = (CAT[it.label] || [])[0]; if (!p || !p.metod) return;
      var b = it.box, t = by[it.label] || (by[it.label] = { label: it.label, p: p, n: 0, x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, box: b });
      t.n++;
    });
    var ppm = E.geo && E.geo.px_per_m || 76.8;
    return Object.keys(by).map(function (k) {
      var t = by[k], b = t.box, name = t.label;
      if (/^Кровать$/.test(name)) name += ' ' + Math.round((b[2] - b[0]) / ppm * 100) + '×' + Math.round((b[3] - b[1]) / ppm * 100);
      if (t.n > 1) name += ' ×' + t.n;
      return { name: name, p: t.p, sum: t.p.metod * t.n, x: t.x, y: t.y };
    }).sort(function (a, b) { return b.sum - a.sum; }).slice(0, 8);
  }
  function hero(E) {
    var b = E && E.b, tags = heroTags(E);
    return '<div class="pz-hero" id="pd-hero">' +
      '<img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="Пример: 2-комнатная квартира 47 м² в 3D с мебелью, вид сверху">' +
      '<svg class="pz-hero__lines" aria-hidden="true"></svg>' +          /* линии-выноски от ценников к предметам (Вика 28.10) */
      '<span class="pz-hero__k">ПРИМЕР · 2-КОМН · 47 М²</span>' +
      tags.map(function (t, i) {
        /* на плашке одна цена — с подпиской METOD; обе цены — в карточке товара по тапу (Вика 28.10) */
        return '<button type="button" class="pz-price" data-tag="' + i + '" data-x="' + t.x + '" data-y="' + t.y + '"><small><i></i>' + esc(t.name) + '</small><b>' + esc(F.rub(t.sum)) + '</b></button>';
      }).join('') +
      /* неразрывные пробелы: на узком экране строка переносится только по « · », «2,8 млн» не разрывается */
      '<div class="pz-hero__bud"><span><b>Ремонт под ключ</b><em>мебель\u00a0' + mln(b && b.furniture) + ' · материалы\u00a0' + mln(b && b.materials) + ' · работы\u00a0' + mln(b && b.works) + '\u00a0млн</em></span>' +
        '<strong>≈ ' + mln(b && b.total) + ' млн ₽</strong></div></div>';
  }
  /* ценники на своих местах: картинка лежит «cover» — пересчитываем координаты под фактический размер.
     Вика 28.10: плашка встаёт рядом с предметом, к предмету ведёт линия с кружком. Плашки не налезают друг на друга,
     на метку «Пример» и на полосу бюджета и не закрывают точки других предметов; места нет — ценник не показываем; не больше 6 */
  function placeTags() {
    var el = document.getElementById('pd-hero'); if (!el) return;
    var W = el.clientWidth, H = el.clientHeight, k = Math.max(W / 730, H / 610), ox = (W - 730 * k) / 2, oy = (H - 610 * k) / 2;
    var bud = el.querySelector('.pz-hero__bud'), lab = el.querySelector('.pz-hero__k'), svg = el.querySelector('.pz-hero__lines');
    var bottom = H - (bud ? bud.offsetHeight : 84) - 6, G = 12, shown = 0, lines = '';
    var placed = lab ? [{ l: lab.offsetLeft, t: lab.offsetTop, w: lab.offsetWidth, h: lab.offsetHeight }] : [];
    var tags = [].slice.call(el.querySelectorAll('.pz-price'));
    var pts = tags.map(function (t) { return { x: ox + (+t.dataset.x) * k, y: oy + (+t.dataset.y) * k }; });
    function fits(c, w, h) {
      if (c.l < 6 || c.l + w > W - 6 || c.t < 6 || c.t + h > bottom) return false;
      return !placed.some(function (q) { return c.l < q.l + q.w + 4 && q.l < c.l + w + 4 && c.t < q.t + q.h + 4 && q.t < c.t + h + 4; });
    }
    /* сколько точек других предметов закрыла бы плашка */
    function covers(c, w, h, me) {
      return pts.filter(function (p, j) { return j !== me && p.y < bottom && p.x > c.l - 6 && p.x < c.l + w + 6 && p.y > c.t - 6 && p.y < c.t + h + 6; }).length;
    }
    tags.forEach(function (t, n) {
      t.hidden = false;                                /* скрытый ценник не измерить — сначала показываем */
      var w = t.offsetWidth, h = t.offsetHeight, x = pts[n].x, y = pts[n].y, pick = null, best = 1e9;
      /* места по порядку предпочтения: слева или справа от предмета (выше или ниже точки), сверху, снизу;
         s — край плашки, откуда идёт линия */
      var spots = [{ l: x - G - w, t: y - h + 4, s: 'r' }, { l: x + G, t: y - h + 4, s: 'l' },
                   { l: x - G - w, t: y - 4, s: 'r' }, { l: x + G, t: y - 4, s: 'l' },
                   { l: x - w * .6, t: y - G - h, s: 'b' }, { l: x - w * .4, t: y + G, s: 't' },
                   { l: x - 10, t: y + G, s: 't' }, { l: x - w + 10, t: y + G, s: 't' }];
      if (shown < 6 && x > 0 && x < W && y > 0 && y < bottom) {
        spots.forEach(function (c, i) {
          if (!fits(c, w, h)) return;
          var cost = i + 100 * covers(c, w, h, n);
          if (cost < best) { best = cost; pick = c; }
        });
      }
      t.hidden = !pick; if (!pick) return;
      shown++; placed.push({ l: pick.l, t: pick.t, w: w, h: h });
      t.style.left = pick.l + 'px'; t.style.top = pick.t + 'px';
      var side = pick.s === 'r' || pick.s === 'l';
      var sx = pick.s === 'r' ? pick.l + w : pick.s === 'l' ? pick.l : x, sy = pick.s === 'b' ? pick.t + h : pick.s === 't' ? pick.t : pick.t + h / 2;
      var cx = side ? x : sx, cy = side ? sy : y;      /* изгиб: от плашки вбок, потом к предмету */
      lines += '<path d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + '"/>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>';
    });
    if (svg) { svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = lines; }
  }
  /* карточка товара по ценнику: ♡ / 🛒 */
  function tagSheet(t) {
    var p = t.p, R = S.repair;
    if (R && R.registerProduct) R.registerProduct(p);
    var m = S.ui.modal({ eyebrow: t.name, title: p.name, html: '<div class="pz-tagsheet">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') +
        '<span><b>' + F.rub(p.metod) + ' <small>с подпиской METOD</small></b><em>' + F.rub(p.retail || p.metod) + ' <small>без подписки</small></em><small>' + esc(p.brand || '') + '</small></span></div>',
      actions: [{ label: '♡ В избранное', kind: 'ghost', onClick: function () { if (R) { R.flats.ensure(); if (!R.fav.has(p.id)) R.fav.toggle(p.id, true); R.flats.update(R.flats.active().id, {}); S.ui.toast('В избранном', 'ok'); } } },
                { label: '🛒 В корзину', onClick: function () { if (R) { R.flats.ensure(); if (!R.cart.has(p.id)) R.cart.add(p.id, 'market', true); R.flats.update(R.flats.active().id, {}); S.ui.toast('В корзине', 'ok'); } } }] });
    return m;
  }
  function zkSearch() {
    return '<b class="pz-or">ИЛИ НАЙДИ СВОЙ ПЛАН У ЗАСТРОЙЩИКА</b>' +
      '<form class="pz-zks" id="pd-zks" role="search">' + ICO.search + '<input id="pd-zkq" type="search" placeholder="ЖК, застройщик или адрес" autocomplete="off" aria-label="ЖК, застройщик или адрес" value="' + esc(st.zkQ || '') + '"></form>' +
      '<div id="pd-zkres" aria-live="polite">' + zkResults() + '</div>';
  }
  function zkResults() {
    if (!ZK || (st.zkQ || '').trim().length < 2) return '';
    var r = ZK.search(st.zkQ);
    if (!r.length) return '<section class="pz-card pz-zkno"><b>Такого ЖК пока нет</b>' +
      '<label class="pz-link pz-link--left"><input type="file" data-plan-file accept="' + FILE_ACCEPT + '" hidden>Загрузи план — добавим ЖК ›</label></section>';
    return '<div class="pz-zklist">' + r.map(function (z) {
      var n = z.layouts.filter(ZK.ready).length;
      return '<button type="button" class="pz-zkrow" data-zk="' + esc(z.id) + '"><span><b>' + esc(z.name) + '</b><small>' + esc([z.developer, z.city, z.address].join(' · ')) + '</small></span>' +
        '<em>' + (n ? n + ' в 3D' : 'скоро в 3D') + ' ›</em></button>';
    }).join('') + '</div>';
  }
  /* порядок по макету Вики 28.10: шапка → «Что вы получите» → пример с бюджетом → «Загрузить план» → поиск ЖК, ниже сразу
     полоса Корзина · Избранное · Бюджет. Ленты ЖК и сноски под поиском в макете нет (ЖК находится поиском, пример PRIDE —
     в «Загрузить план», дизайн-проект — там же) */
  function viewIdle() {
    return startHead() + gets() + hero(example()) +
      '<button type="button" class="pz-btn pz-btn--up" data-act="upload">' + ICO.up + 'Загрузить план</button>' +
      zkSearch();
  }
  /* ── Шаг 1 · Загрузи план (прежний A1): план застройщика / обмерный → загрузка → сканер ── */
  function viewUpload() {
    return head() + title('Загрузи план — покажем в 3D с мебелью', 'бесплатно · обычно до минуты') +
      '<div class="pz-src">' + SOURCES.map(function (s) {
        /* Алина: тёмная плашка источника — флаг s.dark (стиль .pz-src__i.is-dark в demo-flow.css) */
        return '<button type="button" class="pz-src__i' + (s.dark ? ' is-dark' : '') + (st.source === s.k ? ' is-on' : '') + '" data-src="' + s.k + '">' +
          '<span><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></span><em>' + esc(s.tag) + '</em></button>';
      }).join('') + '</div>' +
      /* любой файл плана: картинку сжимаем до 2000 px / 4 МБ сами (prepareImage), PDF и HEIC уходят как есть; больше 20 МБ не берём */
      '<label class="pz-btn"><input type="file" id="pd-file" data-plan-file accept="' + FILE_ACCEPT + '" hidden>Загрузить план</label>' +
      '<small class="pz-note pz-c">JPG, PNG, PDF или HEIC · до 20 МБ · фото плана тоже подойдёт</small>' +
      '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>' +
      /* дизайн-проект — здесь же, чертёж плана первым файлом: в «Моём ремонте» блока «Основа квартиры» больше нет (схема 05.11) */
      '<label class="pz-note pz-c pz-proj" data-proj><input type="file" data-plan-file accept="' + FILE_ACCEPT + '" hidden>Есть дизайн-проект? Загрузи чертёж плана — посчитаем точно ›</label>';
  }

  /* ── ЖК → его планировки (18.2) ── */
  function viewZk() {
    var z = ZK && ZK.get(st.zk); if (!z) { st.view = 'idle'; return viewIdle(); }
    var n = z.layouts.filter(ZK.ready).length;
    return headNoBar() + '<button type="button" class="pz-link pz-link--left" data-act="again">← К поиску</button>' +
      title(z.name, [z.city, z.address].join(' · ') + ' · ' + n + ' ' + plural(n, 'планировка', 'планировки', 'планировок') + ' уже в 3D') +
      '<div class="pz-zklays">' + z.layouts.map(function (l) {
        var ok = ZK.ready(l);
        return '<button type="button" class="pz-zklay' + (ok ? '' : ' is-off') + '"' + (ok ? ' data-zl="' + esc(l.id) + '"' : ' disabled') + '>' +
          '<span class="pz-zklay__img"' + (l.planImg ? ' style="background-image:url(' + esc(l.planImg) + ')"' : '') + '></span>' +
          '<span class="pz-zklay__t"><b>' + esc(l.type + (l.m2 ? ' · ' + F.area(l.m2) : '')) + '</b>' +
          '<small>этажи ' + esc(l.floors || '[этажи]') + (l.count ? ' · ' + l.count + ' квартир' : '') + '</small>' +
          '<em' + (ok ? '' : ' class="is-off"') + '>' + (ok ? '✓ готово в 3D с мебелью' : 'скоро в 3D') + '</em></span>' + (ok ? '<i>›</i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<label class="pz-note pz-c pz-zkadd"><input type="file" data-plan-file accept="' + FILE_ACCEPT + '" hidden>Нет твоей планировки? <u>Загрузи план ›</u> — добавим её в ЖК для всех соседей</label>';
  }
  /* выбрал планировку → сразу 3D с мебелью, без загрузки, сканера и «Проверь план» (18.2) */
  function pickLayout(id) {
    var x = ZK.layout(id); if (!x || !ZK.ready(x.layout)) return;
    var z = x.zk, l = x.layout, m = ZK.markupOf(l);
    var rooms = (m.rooms || []).filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
    FLOW.save({ zk: { id: z.id, layout: l.id, name: z.name, type: l.type, m2: l.m2 }, zkFound: true, source: 'developer', accuracy: ACCURACY.developer,
      state: ZK.FINISH_STATE[z.finish] || null, flat: z.name + ' · ' + F.area(l.m2), rooms: rooms, typical: false, live: null,
      answers: {}, brief: null, wallVariant: null, layoutHints: null, plan: 0, step: 5 });
    /* планировка из конвейера zk-admin — своя разметка и расстановка, экран мебели открываем как для своего плана */
    var own = l.layout !== 'arrange';
    if (own) FLOW.save({ live: { layout: l.layout, not_placed: l.notPlaced || [], ready: true, flat: z.name + ' · ' + l.type + ' · ' + F.area(l.m2), labeled: null, name: 'zk:' + l.id, key: 'zk:' + l.id } });
    FLOW.save({ backTo: 'zk' });                     /* «← Назад» с экрана мебели вернёт к планировкам этого ЖК */
    st.placingFrom = 'zk'; st.view = 'placing'; render();
    var seq = st.seq;
    setTimeout(function () { if (seq !== st.seq) return; location.href = 'arrange.html?v=panel&plan=0&flow=1&anim=1' + (own ? '&live=1' : ''); }, 700);
  }

  /* «Плана нет»: площадь и число комнат → типовой план → сразу вопросы */
  function viewNoplan() {
    return head() + title('Плана нет — соберём типовой', 'площадь и комнаты · бюджет примерно') +
      '<section class="pz-card"><label class="pz-field"><b>Площадь, м²</b>' +
        '<input class="input" id="pd-m2" type="number" inputmode="decimal" min="15" max="300" placeholder="например, 47" value="' + esc(st.noplan.m2) + '"></label>' +
        '<div class="pz-q__h"><b>Комнат</b></div><div class="pz-chips">' + ['студия', '1', '2', '3', '4+'].map(function (o, i) {
          return '<button type="button" class="pz-chip' + (st.noplan.rooms === i ? ' is-on' : '') + '" data-rooms="' + i + '">' + o + '</button>';
        }).join('') + '</div></section>' +
      '<button type="button" class="pz-btn" data-act="typical">Дальше</button>' +
      '<button type="button" class="pz-link" data-act="again">Назад</button>';
  }
  function typicalRooms(m2, n) {
    var r = [{ name: n === 0 ? 'Комната-студия' : 'Кухня-гостиная', m2: m2 * (n === 0 ? .62 : .4) }];
    var beds = Math.min(n, 4), bedShare = n === 0 ? 0 : .34;
    for (var i = 0; i < beds; i++) r.push({ name: i === 0 ? 'Спальня' : i === 1 && n >= 3 ? 'Детская' : 'Комната ' + (i + 1), m2: m2 * bedShare / beds });
    r.push({ name: 'Санузел', m2: Math.max(3.5, m2 * .1) }, { name: 'Прихожая', m2: Math.max(3.5, m2 * .1) });
    return r.map(function (x) { return { name: x.name, m2: Math.round(x.m2 * 10) / 10 }; });
  }

  /* ── A2 · Чтение плана ──
     Пример — локальная анимация по READ_STAGES. Свой план — честное ожидание: две стадии (отправка файла → ответ сервера),
     секунды и подсказка «обычно 30–60 с» (после минуты — «ждём до 3 минут»), полоса: 0–30 % — настоящий ход отправки,
     дальше плавно к 90 %, 100 % — только по ответу. Кнопка «Отменить» обрывает запрос. PDF и HEIC без картинки — плашкой */
  function filePlate(sub) {
    var ext = (st.live && st.live.kind === 'pdf') ? 'PDF' : (/\.([a-z0-9]+)$/i.exec(st.fileName || '') || [0, 'файл'])[1].toUpperCase();
    return '<div class="pz-pdf"><i>' + esc(ext) + '</i><span><b>' + esc(st.fileName || 'план') + '</b><small>' + esc(sub) + '</small></span></div>';
  }
  function viewReading() {
    var live = st.live, pic;
    if (!live) pic = '<div class="pz-plan pz-plan--scan"><img src="' + PLAN_IMG + '" alt=""><i class="pz-scan"></i></div>';
    else if (live.kind === 'image' && live.src) pic = '<div class="pz-plan pz-plan--scan"><img src="' + live.src + '" alt=""><i class="pz-scan"></i></div>';
    else pic = filePlate(live.kind === 'pdf' ? 'берём первый лист' : live.kind === 'raw' ? 'читаем как есть' : 'готовлю файл');
    var stages = live ? WAIT_STAGES : READ_STAGES;
    return head() + title('Читаю твой план', flatName()) + pic +
      '<div class="pz-prog"><i id="pd-bar"' + (live ? ' style="width:0"' : '') + '></i></div>' +
      '<ul class="pz-stages" id="pd-stages">' + stages.map(function (t, i) {
        return '<li class="' + (i === 0 ? 'is-now' : '') + '"><i>' + (i === 0 ? '◌' : '·') + '</i>' + esc(t) + '</li>';
      }).join('') + '</ul>' +
      (live ? '<p class="pz-wait" id="pd-wait" role="status" aria-live="off"><b>0 с</b> <span>обычно 30–60 с</span></p>' +
              '<button type="button" class="pz-link" data-act="cancel-read">Отменить</button>' : '');
  }
  function setStage(i, pct) {
    var bar = document.getElementById('pd-bar'); if (bar) bar.style.width = Math.min(100, pct !== undefined ? pct : (i + 1) * 25) + '%';
    document.querySelectorAll('#pd-stages li').forEach(function (li, k) {
      li.className = k < i ? 'is-done' : k === i ? 'is-now' : '';
      li.querySelector('i').textContent = k < i ? '✓' : k === i ? '◌' : '·';
    });
  }
  /* строка ожидания и полоса своего плана; up — доля отправленного (0–1), tUp — когда отправка закончилась */
  function paintWait(t0, up, tUp) {
    var sec = Math.floor((Date.now() - t0) / 1000), w = document.getElementById('pd-wait');
    var pct = tUp ? 30 + 60 * (1 - Math.exp(-((Date.now() - tUp) / 1000) / 45)) : 30 * up;
    setStage(tUp ? 1 : 0, Math.round(pct * 10) / 10);
    if (w) w.innerHTML = '<b>' + sec + ' с</b> <span>' + (sec >= 60 ? 'сложные планы читаются дольше — ждём до 3 минут' : 'обычно 30–60 с') + '</span>';
  }

  /* экран ошибки разметки: главная кнопка — по st.err.primary (повторить / другой файл / пример),
     «Повторить этот же файл» и «Другой файл» есть всегда; при частых загрузках — обратный отсчёт на кнопке */
  function viewError() {
    if (st.errKind === 'place') return head() + title('Не получилось расставить мебель', flatName()) +
      '<section class="pz-card"><b>' + esc(st.error) + '</b><p class="pz-note">План и ответы сохранены — попробуй ещё раз.</p></section>' +
      '<button type="button" class="pz-btn" data-act="retry">Попробовать ещё раз</button>' +
      '<button type="button" class="pz-link" data-act="to-brief">Назад к вопросам</button>';
    var er = st.err || { kind: 'unknown', text: st.error || 'Не получилось прочитать план — попробуй ещё раз или возьми другой файл.', primary: 'retry' };
    var canRetry = !!(st.live && (st.live.blob || st.live.small)), wait = er.kind === 'minute' && st.cdLeft > 0;
    var hint = /^(text|unknown|format)$/.test(er.kind) ? '<p class="pz-note">Подойдёт чёткий план из договора или с сайта застройщика: стены тёмные, комнаты подписаны. ' +
      'Фото под углом и скан с тенями читаются хуже.</p>' : '';
    var retryTxt = wait ? 'Повторить через ' + st.cdLeft + ' с' : 'Повторить этот же файл';
    var B = {
      retry: canRetry ? '<button type="button" class="pz-btn' + (wait ? ' is-wait' : '') + '" data-act="retry-read"' + (wait ? ' disabled' : '') + '>' + retryTxt + '</button>' : '',
      other: '<button type="button" class="pz-btn" data-act="again">Другой файл</button>',
      sample: '<button type="button" class="pz-btn" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>'
    };
    var L = {
      retry: canRetry ? '<button type="button" class="pz-link" data-act="retry-read"' + (wait ? ' disabled' : '') + '>' + retryTxt + '</button>' : '',
      other: '<button type="button" class="pz-link" data-act="again">Другой файл</button>',
      sample: '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>'
    };
    var main = B[er.primary] || B.other, order = ['retry', 'other', 'sample'].filter(function (k) { return k !== er.primary; });
    if (!main) { main = B.other; order = ['retry', 'sample']; }
    return head() + title('Не получилось разметить', st.fileName || '') +
      '<section class="pz-card" role="alert"><b>' + esc(er.text) + '</b>' + hint + '</section>' + main +
      order.map(function (k) { return L[k]; }).join('');
  }

  /* ── A3 · Проверь план ── */
  /* подпись комнаты: что увидело зрение. На обмерном плане и дизайн-проекте подписи — номера «1…4» (28.10, проверка
     на настоящем ИИ): номер человеку ничего не говорит, а тип скрыт — показываем тип («Санузел»), чтобы ошибку было видно
     и её можно было исправить названием */
  /* тип комнаты для списка: от зрения; «другое» уточняем по его же подписи (typeFromName), иначе остаётся «другое» */
  function liveRooms() {
    return (st.live.res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; })
      .map(function (r) {
        var word = r.label && /[а-яёa-z]/i.test(r.label) ? r.label : null;
        var type = r.type && r.type !== 'другое' ? r.type : (FLOW.typeFromName(r.label) || 'другое');
        return { name: word || FLOW.RU[r.type] || r.type || 'Помещение', m2: r.area_m2 || 0, recess: !!r.recess, type: type, id: r.id || null, label: r.label || '' };
      });
  }
  /* комнаты экрана с правками человека: название (st.names) и тип из списка (st.types) по порядку комнат */
  function rooms() {
    var base = st.live ? liveRooms() : st.typical ? st.typical.rooms : SAMPLE_ROOMS;
    return base.map(function (r, i) {
      var o = r;
      if (st.names && st.names[i]) o = Object.assign({}, o, { name: st.names[i] });
      if (st.types && st.types[i]) o = Object.assign({}, o, { type: st.types[i] });
      if (st.areas && st.areas[i] > 0) o = Object.assign({}, o, { m2: st.areas[i], m2Read: r.m2 });   /* m2Read — прочитанная, по ней 3D находит комнату */
      return o;
    });
  }
  /* названия и типы из списка «Проверь план» — перед перерисовкой (3D / 2D, «Назад», поворот), чтобы исправленное не терялось */
  function collectNames() {
    var ins = root.querySelectorAll('input[data-room]'); if (!ins.length) return;
    st.names = {};
    ins.forEach(function (inp) { st.names[+inp.dataset.room] = inp.value.trim(); });
    /* площадь руками: 1–300 м², запятая или точка; пусто или чушь — остаётся прочитанная */
    var read = st.live ? liveRooms() : st.typical ? st.typical.rooms : SAMPLE_ROOMS;   /* что прочитали — правкой не считаем */
    root.querySelectorAll('input[data-room-m2]').forEach(function (inp) {
      var v = parseFloat(String(inp.value).replace(',', '.')), k = +inp.dataset.roomM2, r0 = read[k] && read[k].m2;
      st.areas = st.areas || {};
      if (v >= 1 && v <= 300 && !(r0 && Math.abs(v - r0) < .05)) st.areas[k] = Math.round(v * 10) / 10; else delete st.areas[k];
    });
    var sels = root.querySelectorAll('select[data-type]');
    if (sels.length) { st.types = st.types || {}; sels.forEach(function (s) { st.types[+s.dataset.type] = s.value; }); }
  }
  /* типы помещений в списке — те, по которым сервер ставит мебель; незнакомый тип от зрения добавляем, чтобы не потерять */
  var TYPES = [['спальня', 'Спальня'], ['гостиная', 'Гостиная'], ['гостиная-кухня', 'Кухня-гостиная'], ['кухня', 'Кухня'], ['санузел', 'Санузел'],
               ['прихожая', 'Прихожая'], ['детская', 'Детская'], ['гардеробная', 'Гардеробная'], ['балкон', 'Балкон'], ['другое', 'Другое']];
  function typeSelect(i, cur) {
    var opts = TYPES.slice(); if (cur && !TYPES.some(function (t) { return t[0] === cur; })) opts.push([cur, cur]);
    return '<select class="pz-type" data-type="' + i + '" aria-label="Тип помещения">' + opts.map(function (t) {
      return '<option value="' + esc(t[0]) + '"' + (t[0] === cur ? ' selected' : '') + '>' + esc(t[1]) + '</option>';
    }).join('') + '</select>';
  }
  /* оценка чтения этого плана (FLOW.qualityOf: новый сервер — его quality, старый — по разметке); poor и путь по рамкам — экран «примерно» */
  function quality() { return st.live && st.live.res ? FLOW.qualityOf(st.live.res, st.live.w, st.live.h) : null; }
  function isPoor(q) { return !!q && (q.level === 'poor' || q.path === 'boxes'); }
  /* лист с несколькими квартирами: сохранённый целый лист (после вырезки по выбранной квартире) или текущий ответ */
  function sheetOf() {
    if (st.sheet) return st.sheet;
    var l = st.live; if (!l || !l.res) return null;
    var q = FLOW.qualityOf(l.res, l.w, l.h);
    return { src: l.src, w: l.w, h: l.h, flats: q.flats };
  }
  /* рамка квартиры в долях 0–1000: по найденным комнатам с полем 3% — план этажа, подписи
     и стрелки застройщика вокруг квартиры обрезаем */
  function liveCrop() {
    var bs = (st.live.res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; }).map(function (r) { return r.main_box_2d || r.box_2d; });
    if (!bs.length || !st.live.w) return null;
    var pad = 30, y1 = Math.max(0, Math.min.apply(null, bs.map(function (b) { return b[0]; })) - pad), x1 = Math.max(0, Math.min.apply(null, bs.map(function (b) { return b[1]; })) - pad);
    var y2 = Math.min(1000, Math.max.apply(null, bs.map(function (b) { return b[2]; })) + pad), x2 = Math.min(1000, Math.max.apply(null, bs.map(function (b) { return b[3]; })) + pad);
    return { x: x1, y: y1, w: (x2 - x1) / 1000, h: (y2 - y1) / 1000, x1: x1, y1: y1 };
  }
  /* разметка в долях 0–1000: комнаты [y1, x1, y2, x2], проёмы — точка [y, x] */
  function liveTags() {
    var res = st.live.res, names = rooms(), k = 0, out = [];
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      var b = r.main_box_2d || r.box_2d, nm = (names[k] || {}).name || r.label; k++;
      out.push({ t: nm + (r.area_m2 ? ' · ' + F.area(r.area_m2) : ''), x: (b[1] + b[3]) / 20, y: (b[0] + b[2]) / 20 });
    });
    (res.openings || []).forEach(function (o) {
      var p = o.point_2d || (o.span_2d ? [(o.span_2d[0][0] + o.span_2d[1][0]) / 2, (o.span_2d[0][1] + o.span_2d[1][1]) / 2] : null);
      if (!p) return;
      if (o.kind === 'window') out.push({ t: '◫ окно', x: p[1] / 10, y: p[0] / 10, k: 'win' });
      if (o.kind === 'entrance') out.push({ t: '⇥ вход', x: p[1] / 10, y: p[0] / 10, k: 'door' });
      /* двери между комнатами — точками, без подписи: видно, где проём, а план не зарастает плашками */
      if (o.kind === 'door' || o.kind === 'passage') out.push({ t: '', x: p[1] / 10, y: p[0] / 10, k: 'd' });
    });
    var c = liveCrop();
    if (c) out.forEach(function (t) { t.x = (t.x * 10 - c.x1) / (c.w * 10); t.y = (t.y * 10 - c.y1) / (c.h * 10); });
    /* плашки не вылезают за край плана */
    return out.map(function (t) { return Object.assign(t, { x: Math.max(12, Math.min(88, t.x)), y: Math.max(4, Math.min(96, t.y)) }); });
  }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; }
  /* 2D своего плана: серая картинка клиента (или картинка сервера, если он показал бы другую — PDF, HEIC, вырезка, поворот)
     и плашки поверх (комнаты, окна, вход, двери точками) по координатам разметки. pick — режим тапа «Отметить вход» */
  function plan2dHtml(pick) {
    var tags = st.live ? liveTags() : SAMPLE_TAGS, c = st.live ? liveCrop() : null;
    return '<div class="pz-plan' + (c ? ' pz-plan--live' : '') + (pick ? ' is-pick" data-pick-plan role="button" tabindex="0" aria-label="Тапни по наружной стене там, где входная дверь' : '') + '"' +
      (c ? ' style="aspect-ratio:' + Math.round(c.w * st.live.w) + ' / ' + Math.round(c.h * st.live.h) + ';max-width:' + maxW(c.w * st.live.w, c.h * st.live.h) + 'px"' : '') + '>' +
      '<img src="' + (st.live ? st.live.src : PLAN_IMG) + '" alt="План с разметкой комнат"' + (c ? ' style="width:' + (100000 / c.w / 1000) + '%;height:' + (100000 / c.h / 1000) +
        '%;left:' + (-c.x / (c.w * 10)) + '%;top:' + (-c.y / (c.h * 10)) + '%"' : '') + '>' + tags.map(function (t) {
        return '<span class="pz-tag' + (t.k ? ' pz-tag--' + t.k : '') + '" style="left:' + t.x + '%;top:' + t.y + '%"' + (t.t ? '' : ' aria-hidden="true"') + '>' + esc(t.t) + '</span>';
      }).join('') + (pick ? '' : seg()) + '</div>';
  }
  /* ширина картинки, при которой её высота не больше 560 px (на 1280 план на всю колонку был выше окна); на телефоне не мешает */
  function maxW(w, h) { return Math.max(200, Math.round(560 * (w > 0 && h > 0 ? w / h : 1))); }
  /* плашка «прочитано примерно»: причины словами (не больше двух) и ряд действий — отметить вход, повернуть, прочитать ещё раз;
     несколько квартир на листе — ещё «Другая квартира на листе». poor и путь по рамкам — плашка темнее */
  function qualityPlate(q, poor) {
    var why = FLOW.reasonsText(q, 2), sh = sheetOf();
    var acts = ['<button type="button" data-act="pick-entrance">Отметить вход</button>', '<button type="button" data-act="rotate">Повернуть</button>',
                '<button type="button" data-act="reread">Прочитать ещё раз</button>'];
    if (sh && sh.flats.length > 1) acts.push('<button type="button" data-act="to-flats">Другая квартира на листе</button>');
    return '<div class="pz-approx' + (poor ? ' is-poor' : '') + '" role="note"><p>' + esc('План прочитан примерно' + (why ? ': ' + why : '') + '. Проверь названия и вход — по ним расставим мебель.') + '</p>' +
      '<div class="pz-approx__acts">' + acts.join('') + '</div></div>';
  }
  function viewRooms() {
    var rs = rooms(), total = rs.reduce(function (a, r) { return a + (r.m2 || 0); }, 0);
    var q = quality(), poor = isPoor(q), pick = !!(st.live && st.pick === 'entrance');
    var sub = rs.length + ' ' + plural(rs.length, 'помещение', 'помещения', 'помещений') + ' · ' + total.toFixed(1).replace('.', ',') + ' м²' + (poor ? ' · прочитано примерно' : ' · названия и площадь можно исправить');
    /* режим «Отметить вход»: подсказка, только 2D и «Отмена» — одно действие на экране, тап по картинке */
    if (pick) return head() + title('Проверь план', sub) +
      '<div class="pz-pick" role="status"><b>Тапни по наружной стене там, где входная дверь</b><button type="button" class="pz-link" data-act="pick-cancel">Отмена</button></div>' +
      plan2dHtml(true) + '<p class="pz-note pz-c pz-pick__note">Вход поставим на ближайшую стену ближайшей комнаты</p>';
    /* после чтения квартира сразу в 3D (правки 13:40, п. 1); 2D — дополнительная кнопка. Прочитано примерно — 2D по умолчанию (show) */
    var plan = st.mode === '2d' || !P3.ok ? plan2dHtml(false) : '<div class="pz-plan pz-plan--3d"><div class="pz-3dslot"></div>' + seg() + '</div>';
    /* свой план: API отдаёт комнаты, окна, вход и двери — техническую разметку не показываем */
    var legend = st.live
      ? '<span><b>◫ окна</b> — у жилой комнаты обязательно</span><span><b>⇥ вход</b> и <b>● двери</b> — как нашли на плане</span>'
      : '<span><b>▮ несущие</b> — не двигаем</span><span><b class="is-blue">● ▦ стояки, шахты</b> — кухня и санузел у них</span>' +
        '<span><b>┆ перегородки</b> — можно двигать</span><span><b>◫ окна</b> — у жилой комнаты обязательно</span>';
    /* свой план прочитан не полностью — говорим прямо, что проверить, и даём исправить на месте (28.10: обмерный план и дизайн-проект молча давали «кривое» 3D) */
    var plate = q && (q.level !== 'ok' || poor) ? qualityPlate(q, poor) : '';
    return head() + title('Проверь план', sub) + plate +
      plan + '<div class="pz-legend">' + legend + '</div>' +
      '<section class="pz-card pz-rooms">' + rs.map(function (r, i) {
        /* площадь — тоже поле: план мог прочитаться неточно, человек правит руками (Вика 05.11) */
        return '<div><input class="input" data-room="' + i + '" value="' + esc(r.name) + '" aria-label="Название помещения">' + (st.live ? typeSelect(i, r.type) : '') +
          '<label class="pz-m2"><input class="input" data-room-m2="' + i + '" type="text" inputmode="decimal" value="' + (r.m2 ? String(Math.round(r.m2 * 10) / 10).replace('.', ',') : '') + '" placeholder="—" aria-label="Площадь, м²: ' + esc(r.name) + '"><span>м²</span></label></div>';
      }).join('') + '</section>' +
      '<button type="button" class="pz-btn" data-act="ok">' + (poor ? 'Дальше — расставим примерно' : 'Всё верно') + '</button>' +
      '<button type="button" class="pz-link" data-act="again">Другой план</button>';
  }
  /* ── экран «Это не похоже на план квартиры» (422 not_a_plan) и «План есть, но комнаты не нашлись» (422 no_rooms) ── */
  function humanDetail(d) {
    var s = String(d || '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
    if (!s || !/[а-яё]/i.test(s) || /not_a_plan|no_rooms|hints|is_plan|json|http/i.test(s)) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function viewNotplan() {
    var np = st.np || {}, noRooms = np.code === 'no_rooms', l = st.live, why = humanDetail(np.detail);
    var canRetry = !!(l && (l.prep || l.small)), sample = '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>';
    var pic = l && l.src && (l.kind === 'image' || l.fromServer) ? '<div class="pz-np"><img src="' + l.src + '" alt="Загруженный файл"></div>'
      : filePlate(noRooms ? 'комнаты не нашлись' : 'не похоже на план');
    if (noRooms) return head() + title('План есть, но комнаты не нашлись', st.fileName || '') + pic +
      '<section class="pz-card" role="alert"><b>' + esc(why || 'Стены видны, а ни одной комнаты распознать не удалось.') + '</b>' +
      '<p class="pz-note">Так бывает на бледном скане, фото под углом или плане без подписей. Чаще всего помогает повтор; если нет — план чётче: стены тёмные, комнаты подписаны.</p></section>' +
      (canRetry ? '<button type="button" class="pz-btn" data-act="retry-read">Повторить этот же файл</button><button type="button" class="pz-link" data-act="again">Другой файл</button>'
                : '<button type="button" class="pz-btn" data-act="again">Другой файл</button>') + sample;
    return head() + title('Это не похоже на план квартиры', st.fileName || '') + pic +
      '<section class="pz-card" role="alert"><b>' + esc(why ? 'Что увидели на картинке: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.' : 'Плана квартиры на картинке не нашли.') + '</b>' +
      '<ul class="pz-tips"><li>Нужен план сверху: стены, комнаты, двери.</li><li>Одна квартира, без таблиц и текста вокруг — или обрежь.</li><li>Из PDF — загрузи сам PDF, а не фото экрана.</li></ul></section>' +
      '<button type="button" class="pz-btn" data-act="again">Другой файл</button>' + sample +
      (canRetry ? '<button type="button" class="pz-link" data-act="force-plan">Это точно план — прочитать всё равно</button>' : '');
  }
  /* ── экран выбора квартиры на листе (ответ method "flats" или «Другая квартира на листе»): картинка целиком, рамки квартир кнопками ── */
  function viewFlats() {
    var sh = sheetOf(); if (!sh || !sh.flats.length) { st.view = 'upload'; return viewUpload(); }
    var pick = st.flatPick, none = pick === null || pick === undefined;
    return head() + title('На картинке несколько квартир', 'Тапни по своей — прочитаем только её') +
      '<div class="pz-plan pz-plan--sheet" style="aspect-ratio:' + (sh.w || 1000) + ' / ' + (sh.h || 1000) + ';max-width:' + maxW(sh.w, sh.h) + 'px">' + (sh.src ? '<img src="' + sh.src + '" alt="Лист с несколькими квартирами">' : '') +
      sh.flats.map(function (f, i) {
        var b = f.box_2d;
        return '<button type="button" class="pz-flat' + (pick === i ? ' is-on' : '') + '" data-flat="' + i + '" aria-pressed="' + (pick === i) + '" style="left:' + (b[1] / 10) + '%;top:' + (b[0] / 10) +
          '%;width:' + ((b[3] - b[1]) / 10) + '%;height:' + ((b[2] - b[0]) / 10) + '%"><b>' + esc(f.label || 'квартира ' + (i + 1)) + '</b></button>';
      }).join('') + '</div>' +
      '<button type="button" class="pz-btn' + (none ? ' is-wait' : '') + '" data-act="read-flat"' + (none ? ' aria-disabled="true"' : '') + '>Прочитать эту квартиру · ещё ~30 с</button>' +
      '<button type="button" class="pz-link" data-act="again">Другой файл</button>';
  }
  /* «Чертёж» рядом с 3D / 2D (plan-cad.js): чертёж CADCraft без мебели, как третья колонка сравнения 27.10, — листом поверх экрана */
  function cadBtn() { return window.SOVE_CAD && window.SOVE_CAD.ready() ? '<button type="button" class="pz-seg__cad" data-act="cad" aria-haspopup="dialog">Чертёж</button>' : ''; }
  function seg() {
    if (!P3.ok) return cadBtn() ? '<div class="pz-seg" role="group" aria-label="Вид плана">' + cadBtn() + '</div>' : '';
    var d3 = st.mode !== '2d';
    return '<div class="pz-seg" role="group" aria-label="Вид плана"><button type="button" data-mode="3d" aria-pressed="' + d3 + '">3D</button>' +
      '<button type="button" data-mode="2d" aria-pressed="' + !d3 + '">2D</button>' + cadBtn() + '</div>';
  }
  /* свой план — рамка из разметки с правками названий и типов (та же, что уйдёт в расстановку), пример — ЖК PRIDE */
  function openCad() {
    var C = window.SOVE_CAD; if (!C) return;
    if (st.live && st.live.res) C.open({ geo: FLOW.frameFromMarkup(editedRes(), st.live.w, st.live.h), furniture: [], title: '' });
    else C.open({ geo: geo(), furniture: [], title: st.typical ? '' : C.PRIDE_TITLE });
  }

  /* В1 «Что сейчас в квартире?» (анкета v2): первый вопрос A4, обязательный; меняет строки бюджета (раздел 12).
     У примера ЖК PRIDE состояние есть в документах застройщика — выбираем сами, с меткой. */
  var STATES = [
    { k: 'concrete_free', t: 'Бетон, стен нет', d: 'свободная планировка — перегородки построим где нужно' },
    { k: 'concrete_walls', t: 'Бетон, стены стоят', d: 'черновые работы полностью' },
    { k: 'whitebox', t: 'Предчистовая (white box)', d: 'стены и стяжка есть — черновых почти нет' },
    { k: 'finished', t: 'С отделкой / вторичка', d: 'нужен демонтаж и вывоз' }
  ];
  /* В1 (TZ-anketa): данные из документов застройщика есть только у примера ЖК PRIDE — «без отделки» */
  function docsState() { return !st.live && !st.typical ? { k: 'concrete_walls', t: 'без отделки' } : null; }
  /* свёрнуто (Алина 27.10): состояние выбрано — одна строка «Бетон, стены стоят · изменить ›», список по тапу.
     data-need — сюда ведёт подсказка «Заполни пункты выше» (needAnswers) */
  var stateOpen = false;
  function stateBlock() {
    var docs = docsState(), cur = STATES.filter(function (x) { return x.k === st.state; })[0];
    var headHtml = '<section class="pz-card pz-state" data-need="state"><div class="pz-q__h"><b>Что сейчас в квартире?</b>' + (docs ? '<em class="pz-why">в документах: ' + esc(docs.t) + '</em>' : '') + '</div>';
    if (cur && !stateOpen) return headHtml + '<button type="button" class="pz-state__i is-on pz-state__one" data-state-open aria-expanded="false"><span><b>' + esc(cur.t) + '</b><small>' + esc(cur.d) + '</small></span><em>изменить ›</em></button></section>';
    return headHtml +
      STATES.map(function (x) {
        return '<button type="button" class="pz-state__i' + (st.state === x.k ? ' is-on' : '') + '" data-state="' + x.k + '" aria-pressed="' + (st.state === x.k) + '"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></button>';
      }).join('') + '</section>';
  }

  /* геометрия для 3D: пример — из arrange-data.js, свой план — рамка из разметки, «плана нет» — типовая */
  function geo() {
    if (!st.geo) {
      if (st.live && st.live.res) st.geo = FLOW.frameFromMarkup(st.live.res, st.live.w, st.live.h);
      else if (st.typical) st.geo = P3.typicalGeo(st.typical.rooms);
      else st.geo = SRC;
    }
    return withAreas(st.geo);
  }
  /* площадь поправили руками — комната на 3D меняет размер (Валерия 05.11: «сам план не меняется, 3D — девочки это просили»).
     Двигаем наружную стену комнаты (снизу, сверху, справа или слева — где нет окон), на ту же долю, что и площадь;
     окна, двери, вход и стены с картинки на этой линии едут вместе с ней, боковые стены удлиняются. Соседей не трогаем.
     Комната без наружной стены (внутри квартиры) форму не меняет — новая площадь только в цифрах и бюджете */
  function withAreas(g) {
    var A = st.areas; if (!A || !Object.keys(A).length || !g || !g.rooms) return g;
    var base = rooms(), out = JSON.parse(JSON.stringify(g)), main = out.rooms.filter(function (r) { return !r.part_of && r.box; }), used = [];
    if (!main.length) return g;
    var T = 8, TW = 0.45 * (out.px_per_m || 60), SIDE = { s: 'south', n: 'north', e: 'east', w: 'west' }, IDX = { s: 3, n: 1, e: 2, w: 0 }, OUT = { s: 1, n: -1, e: 1, w: -1 };
    var ext = { w: Math.min.apply(null, main.map(function (r) { return r.box[0]; })), n: Math.min.apply(null, main.map(function (r) { return r.box[1]; })),
                e: Math.max.apply(null, main.map(function (r) { return r.box[2]; })), s: Math.max.apply(null, main.map(function (r) { return r.box[3]; })) };
    main.forEach(function (r) {
      var a0 = r.m2 || r.doc_m2, i = -1;
      base.forEach(function (x, k) { if (i < 0 && used.indexOf(k) < 0 && Math.abs((x.m2Read || x.m2 || 0) - (a0 || 0)) < .05) i = k; });
      if (i < 0) return; used.push(i);
      var a1 = A[i]; if (!(a1 > 0) || !(a0 > 0) || Math.abs(a1 - a0) < .05) return;
      var b = r.box, cand = ['s', 'n', 'e', 'w'].filter(function (e) { return Math.abs(b[IDX[e]] - ext[e]) < T; });
      if (!cand.length) return;
      var vert = function (e) { return e === 's' || e === 'n'; };
      var cross = function (bx, e) { return vert(e) ? bx[2] > b[0] - T && bx[0] < b[2] + T : bx[3] > b[1] - T && bx[1] < b[3] + T; };
      var winOn = function (e) { return (out.windows || []).concat(out.windows_2d || []).some(function (w) { var bx = w.box; return bx && (w.wall ? w.wall === SIDE[e] : true) && cross(bx, e) && Math.abs((vert(e) ? (bx[1] + bx[3]) / 2 : (bx[0] + bx[2]) / 2) - b[IDX[e]]) < TW * 2; }); };
      var e = cand.filter(function (x) { return !winOn(x); })[0] || cand[0], ax = vert(e) ? 1 : 0, at = b[IDX[e]];
      var d = (vert(e) ? b[3] - b[1] : b[2] - b[0]) * (a1 / a0 - 1) * OUT[e];
      b[IDX[e]] = at + d;
      /* что лежит на этой стене — едет; что упирается в неё концом — удлиняется */
      var move = function (bx) {
        if (!bx || !cross(bx, e)) return;
        var lo = bx[ax], hi = bx[ax + 2];
        if (Math.abs((lo + hi) / 2 - at) < TW) { bx[ax] += d; bx[ax + 2] += d; }
        else if (Math.abs(hi - at) < TW && lo < at) bx[ax + 2] += d;
        else if (Math.abs(lo - at) < TW && hi > at) bx[ax] += d;
      };
      ['windows', 'doors', 'windows_2d', 'doors_2d', 'walls_2d'].forEach(function (key) { (out[key] || []).forEach(function (o) { move(o.box); }); });
      r.m2Read = a0; r.m2 = a1; if (r.doc_m2) r.doc_m2 = a1;
    });
    return out;
  }
  /* подписи в 3D: комнаты (с исправленными названиями) и техническая разметка примера */
  function tags3d() {
    var g = geo(), base = rooms(), used = [], out = [];
    g.rooms.filter(function (r) { return !r.part_of; }).forEach(function (r) {
      var i = -1; base.forEach(function (x, k) { if (i < 0 && used.indexOf(k) < 0 && Math.abs((x.m2Read || x.m2 || 0) - (r.m2Read || r.m2 || r.doc_m2 || 0)) < .05) i = k; });
      if (i >= 0) used.push(i);
      var nm = i >= 0 ? base[i].name : r.name, m2 = i >= 0 ? base[i].m2 : (r.m2 || r.doc_m2);
      out.push({ t: esc(nm) + (m2 ? ' · ' + F.area(m2) : ''), px: [(r.box[0] + r.box[2]) / 2, (r.box[1] + r.box[3]) / 2] });
    });
    var W = .25 * g.px_per_m, all = g.rooms.map(function (r) { return r.box; });
    var minX = Math.min.apply(null, all.map(function (b) { return b[0]; }));
    /* стены с картинки: окно и вход — там, где они в стене 3D (windows_2d / doors_2d, в том числе вход, отмеченный вручную);
       чего там нет — по проёмам, как раньше */
    var img = !!(g.walls_2d && g.walls_2d.length);
    var wins = img && (g.windows_2d || []).length ? g.windows_2d : g.windows || [];
    var ents = img ? (g.doors_2d || []).filter(function (d) { return d.kind === 'entrance'; }) : [];
    if (!ents.length) ents = (g.doors || []).filter(function (d) { return d.kind === 'entrance'; });
    wins.slice(0, 1).forEach(function (w) { out.push({ t: '◫ окно', k: 'win', px: [(w.box[0] + w.box[2]) / 2, (w.box[1] + w.box[3]) / 2] }); });
    ents.forEach(function (d) { out.push({ t: '⇥ вход', k: 'door', px: [(d.box[0] + d.box[2]) / 2, (d.box[1] + d.box[3]) / 2] }); });
    if (!st.live && !st.typical) {
      /* пример ЖК PRIDE: несущая — наружная стена слева, стояк — угол санузла, вентшахта — у прихожей */
      var bath = g.rooms.filter(function (r) { return r.type === 'санузел'; })[0], hall = g.rooms.filter(function (r) { return r.type === 'прихожая' && !r.part_of; })[0];
      out.push({ t: '▮ несущая', k: 'wall', px: [minX - W / 2, (all[0][3] + all[all.length - 1][1]) / 2] });
      if (bath) out.push({ t: '● стояк', k: 'riser', px: [bath.box[2] - 50, bath.box[1] + 55] });
      if (hall) out.push({ t: '▦ вентшахта', k: 'riser', px: [hall.box[0] + 20, hall.box[3] - 10] });
    }
    return out;
  }
  var view3d = null;
  function mount3d() {
    var slot = root.querySelector('.pz-3dslot'); if (!slot) return;
    /* «Проверь план»: стандартный белый домик в изометрии — и для примера, и для своего плана */
    var opts = { geo: geo(), tags: tags3d(), items: [], height: 300, style: 'neutral',
      photo: null };                              /* интерьер ещё не выбран — стандартный белый домик (Алина 24.10) */
    if (!view3d) view3d = P3.create(slot, opts); else { view3d.mount(slot); view3d.update(opts); }
  }

  /* ── A4 · Вопросы по твоему плану ── */
  function find(re) { var r = rooms().filter(function (x) { return re.test(x.name.toLowerCase()); }); return r[0] || null; }
  function facts() {
    /* пример ЖК PRIDE — факты по его чертежу; площадь поправили руками — кровать и обеденную зону считаем по новой площади */
    if (!st.live && !st.typical) {
      /* кровать — по площади спальни и на примере (Вика 05.11: «160×200 очень маленькая»); обеденная зона — по чертежу, пока площадь не правили */
      var b0 = find(/спал/), m0 = b0 ? b0.m2 : 0, dr = find(/кух|студ/) || find(/гост|студ/), dineEdited = dr && dr.m2Read && Math.abs(dr.m2 - dr.m2Read) >= .05;
      return Object.assign({}, SAMPLE_FACTS, { bedMax: bedMaxFor(m0) }, dineEdited ? { dineZone: undefined } : {});
    }
    var bed = find(/спал/), bath = find(/сан|ванн/), live = st.live && liveRooms().some(function (r) { return r.recess; });
    var bm = bed ? bed.m2 : 0;
    return { bedMax: bedMaxFor(bm), bedWhy: 'не останется прохода 70 см',
      kitchenWall: null, niche: !!live, bathBoth: !!(bath && bath.m2 >= 6) };
  }
  /* таблица A4 ТЗ: показываем вопрос, только если в плане есть комната; варианты отсекаем по метражу.
     Площадь не пришла из разметки — ничего не отсекаем: не знаем — не решаем за человека */
  function area(r) { return r && r.m2 > 0 ? r.m2 : null; }
  function where(r) { return r.name.toLowerCase() + (area(r) ? ' ' + F.area(r.m2) : ''); }
  function questions() {
    var fx = facts(), bed = find(/спал/), liv = find(/гост|студ/), kit = find(/кух|студ/), bath = find(/сан|ванн/), q = [];
    var ORDER = BED_SIZES;
    if (bed) {
      var max = (area(bed) || !st.live) ? fx.bedMax : ORDER[ORDER.length - 1], cut = ORDER.slice(ORDER.indexOf(max) + 1);
      var short = function (o) { return /×200$/.test(o) ? o.split('×')[0] : o; };   /* «180», но «200×210» */
      q.push({ k: 'bed', t: 'Кровать', why: where(bed), rows: [ORDER.slice(0, ORDER.indexOf(max) + 1)], def: ['160×200'],
        note: cut.length ? short(cut[0]) + (cut.length > 1 ? ' и больше' : '') + ' не предлагаем — ' + fx.bedWhy : '' });
    }
    /* угловой — если есть угол ≥ 2,2 м: в прототипе — гостиная от 16 м² */
    /* раздел 5: «сдавать» → раскладной по умолчанию; гости 1–2 → раскладной обязательно */
    var rent = st.rp.purpose === 'сдавать', guest = st.rp.guests === '1' || st.rp.guests === '2';
    if (liv) {
      var corner = !area(liv) || liv.m2 >= 16, sleeperWhy = rent && guest ? 'раскладной — потому что сдаёшь и нужен гость' : guest ? 'раскладной — потому что нужен гость' : rent ? 'раскладной — потому что сдаёшь' : '';
      q.push({ k: 'sofa', t: 'Диван', why: where(liv), rows: [corner ? ['прямой', 'угловой'] : ['прямой'], guest ? ['раскладной'] : ['раскладной', 'нет']], def: ['прямой', rent || guest ? 'раскладной' : 'нет'],
        note: [corner ? '' : 'угловой не предлагаем — нет угла 2,2 м', sleeperWhy].filter(Boolean).join(' · ') });
    }
    /* на 6 — если обеденная зона ≥ 9 м²: у кухни-гостиной зона — половина комнаты, у отдельной кухни — вся кухня */
    var dineRoom = kit || liv;
    if (dineRoom) {
      var zone = fx.dineZone !== undefined ? fx.dineZone : area(dineRoom) ? (/гост|студ/.test(dineRoom.name.toLowerCase()) ? dineRoom.m2 / 2 : dineRoom.m2) : null;
      var six = zone === null || zone >= 9, eight = zone === null || zone >= 12, who = st.rp.who;   /* на 8 — зона от 12 м² (Валерия 05.11) */
      /* раздел 5: 1 → на 2; 2 + ребёнок → на 4; 3+ → на 6, если влезает, иначе на 4 */
      var tdef = who === '1' ? 'на 2' : who === '3+' && six ? 'на 6' : 'на 4';
      q.push({ k: 'table', t: 'Обеденный стол', why: dineRoom.name.toLowerCase(), rows: [eight ? ['на 2', 'на 4', 'на 6', 'на 8'] : six ? ['на 2', 'на 4', 'на 6'] : ['на 2', 'на 4']], def: [tdef],
        note: !six ? 'на 6 и 8 не предлагаем — зона меньше 9 м²' : !eight ? 'на 8 не предлагаем — зона меньше 12 м²' : '' });
    }
    /* П и остров — по ширине кухни; длину гарнитура считаем сами по стене у стояка */
    if (kit) {
      var wide = fx.kitchenWide !== undefined ? fx.kitchenWide : (!area(kit) || kit.m2 >= 12);
      q.push({ k: 'kitchen', t: 'Кухня', why: fx.kitchenWall ? 'стена у стояка ' + String(fx.kitchenWall).replace('.', ',') + ' м' : where(kit),
        rows: [wide ? ['прямая', 'Г-образная', 'П-образная', 'с островом'] : ['прямая', 'Г-образная'], ['холодильник встроенный', 'отдельный']], def: ['Г-образная', 'холодильник встроенный'],
        note: wide ? '' : 'П-образную и остров не предлагаем — кухня узкая' });
    }
    if (bath && fx.bathBoth) q.push({ k: 'bath', t: 'Санузел', why: where(bath), rows: [['душ', 'ванна']], def: ['душ'] });
    var wash = ['в санузле']; if (fx.niche) wash.push('колонна в нише прихожей'); wash.push('на кухне', 'в шкафу');
    if ((st.rp.add || []).indexOf('постирочная') >= 0) wash.push('отдельная постирочная');
    q.push({ k: 'wash', t: 'Стирка', why: bath ? where(bath) : 'план', rows: [wash], def: [fx.niche ? 'колонна в нише прихожей' : 'в санузле'] });
    return q;
  }
  /* плашка «Не спрашиваем» — не больше 2 строк: только то, что сняли по этому плану (эталон A4) */
  function skipped() {
    var fx = facts(), bath = find(/сан|ванн/), out = [];
    if (bath && !fx.bathBoth) out.push('душ или ванна — только душ по размерам');
    if (fx.niche) out.push('ниша в прихожей — шкаф ставим сами');
    return out.slice(0, 2);
  }
  function answer(q, row) {
    var pick = (st.answers[q.k] || [])[row];
    return pick !== undefined && q.rows[row].indexOf(pick) >= 0 ? pick : q.def[row];
  }
  /* анкета v2 (TZ-anketa-planirovka, 24.10 15:31): 4 группы, 12 вопросов строго по порядку; В1–В3 обязательные */
  function group(t) { return '<b class="pz-group">' + esc(t) + '</b>'; }
  function lifeQ(k, t, hint, opts, multi, sub, k2, opts2) {
    return '<section class="pz-card pz-q" data-need="' + k + '"><div class="pz-q__h pz-q__h--base"><b>' + esc(t) + '</b>' + (hint ? '<small class="pz-note">' + esc(hint) + '</small>' : '') + '</div>' +
      chips(k, opts, multi) + (sub ? '<small class="pz-rq__sub">' + esc(sub) + '</small>' + chips(k2, opts2) : '') + '</section>';
  }
  function required() { return !!st.state && !!st.rp.purpose && !!st.rp.who; }
  /* кнопка без ответов не мёртвая (Алина 26.10: «нужно уведомление — заполните пункты выше, не понятно иначе»):
     всплывает подсказка, экран едет к первому пропущенному вопросу и подсвечивает его */
  function needAnswers() {
    var miss = [];
    if (!st.state) miss.push({ k: 'state', t: 'что сейчас в квартире' });
    if (!st.rp.purpose) miss.push({ k: 'purpose', t: 'для чего ремонт' });
    if (!st.rp.who) miss.push({ k: 'who', t: 'кто живёт' });
    if (!miss.length) return false;
    S.ui.toast('Заполни пункты выше: ' + miss.map(function (m) { return m.t; }).join(', '));
    var el = root.querySelector('[data-need="' + miss[0].k + '"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('pz-need'); void el.offsetWidth; el.classList.add('pz-need');
      setTimeout(function () { el.classList.remove('pz-need'); }, 2600);
    }
    return true;
  }
  function viewBrief() {
    /* свой план: вариантов стен нет (arrange.js строит их только для примера ЖК PRIDE) — переключатель не показываем,
       иначе генерации списывались, а экран вариантов не открывался (найдено 28.10) */
    var qs = questions(), sk = skipped(), it = st.interior, rp = FLOW.replanOn() && !st.live, ok = required();
    return head() + title('Вопросы по твоему плану', '12 вопросов · больше половины уже заполнили по плану — проверь') +
      group('О квартире и жизни') + stateBlock() +
      lifeQ('purpose', 'Для чего ремонт', '', ['для себя', 'сдавать', 'продать']) +
      lifeQ('who', 'Кто живёт', '', ['1', '2', '2 + ребёнок', '3+'], 0, 'Место для гостей', 'guests', ['не нужно', '1', '2']) +
      lifeQ('add', 'Что важно', 'до 3', ['спальня отдельно', 'рабочее место', 'детская', 'гардеробная', 'постирочная', 'больше хранения'], 3) +
      group('Что ставим') +
      /* заполнено по плану — свёрнуто одной карточкой, «проверить ›» раскрывает вопросы */
      (!st.fitOpen ? '<section class="pz-card pz-q"><div class="pz-q__h"><b>Заполнили по плану</b><button type="button" class="pz-link pz-link--in" data-act="fit-open">изменить ›</button></div>' +
        '<small class="pz-note">' + esc(qs.map(function (q) { return q.t + ' — ' + q.rows.map(function (r, ri) { return answer(q, ri); }).filter(function (v) { return v && v !== 'нет'; }).join(', '); }).join(' · ')) + '</small></section>' :
      qs.map(function (q) {
        return '<section class="pz-card pz-q"><div class="pz-q__h"><b>' + esc(q.t) + '</b><em class="pz-why">в плане: ' + esc(q.why) + '</em></div>' +
          q.rows.map(function (row, ri) {
            return '<div class="pz-chips">' + row.map(function (o) {
              return '<button type="button" class="pz-chip' + (answer(q, ri) === o ? ' is-on' : '') + '" data-q="' + q.k + '" data-row="' + ri + '" data-o="' + esc(o) + '">' + esc(o) + '</button>';
            }).join('') + '</div>';
          }).join('') + (q.note ? '<small class="pz-note">' + esc(q.note) + '</small>' : '') + '</section>';
      }).join('')) +
      group('Интерьер') +
      '<section class="pz-card pz-q"><div class="pz-q__h"><b>Какой интерьер?</b><small class="pz-note">по нему подберём мебель</small></div>' +
        FLOW.interiorTiles(it) +
        '<small class="pz-note">свой интерьер: загрузи фото или рендер — найдём похожую мебель в Маркете</small>' +
        '<button type="button" class="pz-link pz-link--left' + (it ? '' : ' is-on') + '" data-act="later" aria-pressed="' + !it + '">Выберу позже — расставь по размерам</button></section>' +
      /* блок «Перепланировка и стены» — на своей подложке с заголовком (Алина 24.10) */
      '<section class="pz-wallsbox"><b class="pz-group">Перепланировка и стены</b>' +
        (st.live ? '<small class="pz-note">Для своего плана варианты стен пока не строим — их можно посмотреть на примере ЖК PRIDE.</small>' : replanBlock(rp)) + '</section>' +
      (sk.length ? '<div class="pz-skip"><b>Не спрашиваем:</b> ' + esc(sk.join(' · ')) + '</div>' : '') +
      (ok ? '' : '<small class="pz-note pz-c">Ответь на 3 вопроса сверху</small>') +
      /* «Пропустить — расставит SOVEAPP» убрана (Вика 05.11): ответы и так стоят по умолчанию, кнопка делала то же, что «Расставить мебель» */
      '<button type="button" class="pz-btn' + (ok ? '' : ' is-wait') + '" data-act="go"' + (ok ? '' : ' aria-disabled="true"') + '>' + (rp ? 'Показать варианты стен · ' + FLOW.priceTxt() : 'Расставить мебель') + '</button>';
  }

  /* ── В12 «Поменять стены?» — переключатель; дополнительных вопросов под ним нет (анкета v2) ── */
  function chips(k, opts, multi) {
    var cur = st.rp[k];
    return '<div class="pz-chips">' + opts.map(function (o) {
      var on = multi ? cur.indexOf(o) >= 0 : cur === o;
      return '<button type="button" class="pz-chip' + (on ? ' is-on' : '') + '" data-rp="' + k + '" data-o="' + esc(o) + '"' + (multi ? ' data-multi="' + multi + '"' : '') + ' aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('') + '</div>';
  }
  function replanBlock(on) {
    return '<label class="pz-toggle pz-toggle--walls' + (on ? ' is-on' : '') + '"><span><b>Поменять стены? · ' + FLOW.priceTxt() + '</b><small>кабинет, гардероб, ещё спальня · несущие и мокрые зоны не трогаем</small></span>' +
        '<input type="checkbox" data-replan' + (on ? ' checked' : '') + '><i></i></label>';
  }
  function sheet() { commit(); FLOW.save({ replanAnswers: st.rp }); FLOW.replanSheet(function () { go(true); }, function () { go(false); }); }

  function viewPlacing() {
    return head() + title('Расставляю мебель по нормам проходов', 'мебель встанет в твою 3D-квартиру') +
      '<div class="pz-prog"><i class="pz-prog__run"></i></div><small class="pz-note">Проверяю проходы, двери и окна…</small>';
  }
  function render() {
    var V = { reading: viewReading, rooms: viewRooms, brief: viewBrief, error: viewError, placing: viewPlacing, noplan: viewNoplan, zk: viewZk, upload: viewUpload,
              notplan: viewNotplan, flats: viewFlats };
    root.innerHTML = (V[st.view] || viewIdle)();
    if (st.view === 'rooms') mount3d();
    if (st.view === 'idle') {
      placeTags(); var hi = root.querySelector('#pd-hero img'); if (hi && !hi.complete) hi.addEventListener('load', placeTags);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeTags);   /* шрифт догрузился — ширина ценников другая */
    }
    /* лента «Выбери интерьер» (раздел 14): на A3 — да, на A1, A2, A4 — нет */
    /* в режиме тапа «Отметить вход» ленту прячем: на телефоне она закрывала низ плана */
    FLOW.interiorStrip({ show: st.view === 'rooms' && !st.pick, chosen: !!st.interior, onPick: function (it) { st.interior = it; render(); } });
    previewObject();
    bind();
  }
  /* шапка объекта — про план на экране, пока он не сохранён в объект */
  function previewObject() {
    if (S.objectBar && S.objectBar.previewPlan) S.objectBar.previewPlan(st.view === 'rooms' || st.view === 'brief' || st.view === 'placing' ? { rooms: rooms(), jk: st.live || st.typical ? '' : 'PRIDE' } : null);
  }

  /* все ответы A4 + интерьер → состояние сценария; ответы переиспользуют другие блоки (п. 9 ТЗ) */
  function answersOut() {
    var out = {}; questions().forEach(function (q) { out[q.k] = q.rows.map(function (r, i) { return answer(q, i); }); });
    return out;
  }
  /* sove.answers[flatId] — формат TZ-anketa-planirovka («Данные»); квартиры ещё может не быть — ключ draft */
  function saveAnswers(a) {
    var R = S.repair, fid = (R && R.flats.active() || {}).id || 'draft', all = {};
    try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {}
    delete all.plan; delete all.ts;                    /* старый формат первой версии анкеты — убираем */
    function first(k) { return (a[k] || [])[0]; }
    var K = { 'прямая': 'straight', 'Г-образная': 'L', 'П-образная': 'U', 'с островом': 'island' };
    var L = { 'в санузле': 'bathroom', 'колонна в нише прихожей': 'niche', 'на кухне': 'kitchen', 'в шкафу': 'closet', 'отдельная постирочная': 'room' };
    var IMP = { 'спальня отдельно': 'bedroom', 'рабочее место': 'workplace', 'детская': 'kids', 'гардеробная': 'wardrobe', 'постирочная': 'laundry', 'больше хранения': 'storage' };
    var on = FLOW.replanOn(), rp = st.rp;
    all[fid] = {
      state: st.state,
      bed: a.bed ? first('bed').split('×')[0] : null,
      sofa: a.sofa ? { shape: a.sofa[0] === 'угловой' ? 'corner' : 'straight', sleeper: a.sofa[1] !== 'нет' } : null,
      table: a.table ? +first('table').replace(/\D/g, '') : null,
      kitchen: a.kitchen ? { shape: K[a.kitchen[0]] || 'L', fridge: a.kitchen[1] === 'отдельный' ? 'free' : 'built-in' } : null,
      bath: a.bath ? (first('bath') === 'ванна' ? 'bath' : 'shower') : null,
      laundry: a.wash ? L[first('wash')] || 'bathroom' : null,
      interior: st.interior || null,
      replan: on,
      /* анкета v2: «О квартире и жизни» — всегда, не только для вариантов стен */
      purpose: rp.purpose ? { 'для себя': 'self', 'сдавать': 'rent', 'продать': 'sale' }[rp.purpose] : null,
      people: rp.who ? rp.who.replace(' + ребёнок', '+1') : null,
      guests: rp.guests ? (rp.guests === 'не нужно' ? 0 : +rp.guests) : null,
      important: (rp.add || []).slice(0, 3).map(function (x) { return IMP[x] || x; })
    };
    try { localStorage.setItem('sove.answers', JSON.stringify(all)); } catch (e) {}
  }
  function commit() {
    var a = answersOut(), imp = st.rp.add || [];
    /* анкета в расстановку целиком: кровать, диван (форма и раскладной), стол, кухня (форма и холодильник), санузел, стирка,
       рабочее место и «больше хранения» из «Что важно». Чего не спрашивали — умолчания в FLOW.briefFromAnswers */
    var brief = { bed: (a.bed || [])[0], sofa: (a.sofa || [])[0], sleeper: (a.sofa || [])[1], table: (a.table || [])[0],
      kitchen: (a.kitchen || [])[0], fridge: ((a.kitchen || [])[1] || '').replace(/^холодильник\s+/, ''),
      bath: (a.bath || ['душ'])[0], wash: (a.wash || [])[0], work: imp.indexOf('рабочее место') >= 0 ? 'да' : 'нет',
      storage: imp.indexOf('больше хранения') >= 0 || imp.indexOf('гардеробная') >= 0 };
    saveAnswers(a);
    FLOW.save({ brief: brief, answers: a, interior: st.interior, source: st.source, accuracy: ACCURACY[st.source], state: st.state,
      flat: flatName(), rooms: rooms(), typical: !!st.typical, plan: 0, step: 5 });
    return brief;
  }

  /* свой план: читаем размер, шлём на разметку, показываем подписанный план */
  /* «← Назад» с экрана мебели для СВОЕГО плана (Алина и Таня 27.10: «не возвращает назад, так и не прошли по нему»).
     Файл и разметка жили только в памяти вкладки, и при возврате человек попадал на первый экран — план приходилось
     загружать и распознавать заново. Теперь разметка и уменьшенная копия картинки (до 1600 px, JPEG) лежат
     в sessionStorage этой вкладки: «Назад» открывает вопросы с ответами, а «Проверь план» — тот же план */
  var LIVE_BACK = 'sove.plan.liveBack';
  /* уменьшенная копия картинки JPEG-ом, до max px по большей стороне — в хранилище браузера кладём только такие */
  function shrinkImg(src, max, done) {
    var im = new Image();
    im.onload = function () {
      try {
        var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        done(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { /* без копии «Проверь план» после возврата покажет подписанную картинку разметки */ }
    };
    im.src = src;
  }
  /* копия готова — дописываем её в уже сделанную запись (ответ-заготовка может прийти раньше, чем копия) */
  function shrinkLive(l) { if (!l.src) return; shrinkImg(l.src, 1600, function (s) { l.small = s; if (st.live === l && st.keep) keepLive(st.keep); }); }
  /* запись для возврата и перезагрузки: разметка (без картинки с подписями — она в FLOW.live), размеры, уменьшенная копия,
     имя и ключ файла, вид файла и экран (rooms · brief · error), на котором запись сделана */
  function keepLive(o) {
    var l = st.live; if (!l) return false;
    o = o || {}; st.keep = o;
    var res = null;
    if (l.res) { res = {}; Object.keys(l.res).forEach(function (k) { if (k !== 'labeled_png_base64' && k !== 'source_image_base64') res[k] = l.res[k]; }); }
    /* вместе с разметкой — оценка чтения, подсказки серверу, правки (названия, типы) и повороты: перезагрузка возвращает экран как был */
    var q = l.res ? FLOW.qualityOf(l.res, l.w, l.h) : null;
    try {
      var rec = JSON.stringify({ view: o.view || 'rooms', res: res, w: l.w || 0, h: l.h || 0, img: l.small || null,
        file: st.fileName || '', key: l.key || null, kind: l.kind || 'image', fromServer: !!l.fromServer, err: o.view === 'error' ? st.err : null,
        np: o.view === 'notplan' ? st.np : null, quality: q ? { level: q.level, path: q.path } : null, hints: st.hints || {},
        edits: { names: st.names || null, types: st.types || null, areas: st.areas || null }, rot: st.rot || 0 });
      sessionStorage.setItem(LIVE_BACK, rec);
      /* копия в localStorage — кадры ИИ в Интерьере из другой вкладки берут план отсюда (gen-live.js planInputs, Вика 05.11);
         не влезла в хранилище — молча без копии, чтобы не отнимать место у расстановки (FLOW.save ниже) */
      if (res && l.small) { try { if (rec.length < 1200000) localStorage.setItem(LIVE_BACK, rec); } catch (e2) { try { localStorage.removeItem(LIVE_BACK); } catch (e3) {} } }
      return true;
    } catch (e) { return false; }
  }
  /* подсказки, типы и повороты из записи; восстановленные типы считаем выбранными человеком — по названию их не подстраиваем */
  function restoreEdits(lb) {
    st.hints = lb.hints && typeof lb.hints === 'object' ? lb.hints : {};
    st.rot = lb.rot || 0; st.names = (lb.edits && lb.edits.names) || null; st.types = (lb.edits && lb.edits.types) || null; st.areas = (lb.edits && lb.edits.areas) || null;
    st.touched = null; if (st.types) { st.touched = {}; Object.keys(st.types).forEach(function (k) { st.touched[k] = true; }); }
  }
  function dropLive() { st.keep = null; try { sessionStorage.removeItem(LIVE_BACK); } catch (e) {} try { localStorage.removeItem(LIVE_BACK); } catch (e) {} }
  function readLiveBack() { try { return JSON.parse(sessionStorage.getItem(LIVE_BACK) || 'null'); } catch (e) { return null; } }
  /* обратный отсчёт на кнопке «Повторить через N с» (429: частые загрузки — сервер пускает снова через минуту) */
  var cdTimer = null;
  function stopCountdown() { if (cdTimer) clearInterval(cdTimer); cdTimer = null; st.cdLeft = 0; }
  function startCountdown(n) {
    stopCountdown(); st.cdLeft = n;
    cdTimer = setInterval(function () {
      st.cdLeft--;
      var bs = root.querySelectorAll('[data-act="retry-read"]');
      if (st.cdLeft <= 0) { stopCountdown(); bs.forEach(function (b) { b.textContent = 'Повторить этот же файл'; b.disabled = false; b.classList.remove('is-wait'); }); return; }
      bs.forEach(function (b) { b.textContent = 'Повторить через ' + st.cdLeft + ' с'; });
    }, 1000);
  }
  /* обрываем чтение: запрос, таймер и объект-ссылку картинки */
  function stopLive() {
    st.seq++;
    if (st.req) { st.req.abort(); st.req = null; }
    if (st.tick) { clearInterval(st.tick); st.tick = null; }
    stopCountdown();
  }
  function resetLive() {
    stopLive();
    if (st.live && st.live.src && /^blob:/.test(st.live.src)) try { URL.revokeObjectURL(st.live.src); } catch (e) {}
    st.live = null; st.err = null; st.error = null; st.errKind = null; dropLive();
    /* подсказки, типы, повороты и лист с квартирами относятся к файлу — уходят вместе с ним */
    st.hints = {}; st.types = null; st.touched = null; st.rot = 0; st.sheet = null; st.pick = null; st.np = null; st.flatPick = null; st.carry = null;
  }
  function failLive(err) { st.err = err; st.error = err.text; st.errKind = null; st.view = 'error'; render(); }
  function mb(n) { return FLOW.mbTxt(n); }
  /* файл из поля ввода (все три поля — один путь): тип по MIME или расширению, размер до запроса, подготовка → чтение */
  function acceptPlanFile(file) {
    var type = FLOW.fileType(file), isPdf = type === 'application/pdf', isHeic = /heic|heif/.test(type);
    resetLive(); st.typical = null; st.names = null; st.areas = null; st.geo = null; st.fileName = file.name;
    if (!type) return failLive({ kind: 'format', text: 'Этот формат не читается — нужен JPG, PNG, PDF или HEIC.', primary: 'other' });
    if (file.size > MAX_MB * 1024 * 1024) return failLive({ kind: 'big', text: 'Файл весит ' + mb(file.size) + ' МБ — больше ' + MAX_MB + ' МБ. Сохрани план картинкой поменьше или сделай скриншот.', primary: 'other' });
    if (isPdf && file.size > PDF_MAX_MB * 1024 * 1024) return failLive({ kind: 'big', text: 'PDF весит ' + mb(file.size) + ' МБ — больше ' + PDF_MAX_MB + ' МБ. Оставь один лист с планом или сделай скриншот.', primary: 'other' });
    var seq = st.seq;
    st.live = { kind: isPdf ? 'pdf' : 'prep', name: file.name }; st.view = 'reading'; render();
    FLOW.prepareImage(file).then(function (prep) {
      if (seq !== st.seq) return;                     /* отменили, пока готовили файл */
      if (prep.kind === 'raw' && prep.blob.size > PDF_MAX_MB * 1024 * 1024)
        return failLive({ kind: 'big', text: (isHeic ? 'HEIC' : 'Файл') + ' весит ' + mb(prep.blob.size) + ' МБ — больше ' + PDF_MAX_MB + ' МБ. Оставь один лист с планом или сделай скриншот.', primary: 'other' });
      startLive(prep);
    }).catch(function (e) {
      if (seq !== st.seq) return;
      failLive({ kind: e.kind || 'unknown', text: e.kind === 'big' ? e.message : 'Не получилось открыть файл — попробуй другой или сделай скриншот плана.', primary: 'other' });
    });
  }
  /* подготовленный файл → разметка на сервере → «Проверь план». prep: { kind, blob, name, w, h, src, key } (FLOW.prepareImage) */
  function startLive(prep) {
    FLOW.save({ zk: null });                         /* свой план — уже не планировка из базы ЖК */
    stopLive(); stopCountdown();
    st.errKind = null; st.err = null; st.error = null; st.typical = null; st.geo = null; st.state = null; dropLive();
    if (!/replan=1/.test(location.search)) FLOW.setReplan(false);
    st.fileName = st.fileName || prep.name;
    st.live = { prep: prep, blob: prep.blob, kind: prep.kind, key: prep.key, name: prep.name, src: prep.src, w: prep.w, h: prep.h, small: null };
    st.view = 'reading'; render();
    var seq = st.seq, live = st.live, t0 = Date.now(), up = 0, tUp = null;
    if (prep.kind === 'image') shrinkLive(live);     /* копия ≤ 1600 px — для возврата, перезагрузки и повтора этого же файла */
    /* подсказки серверу (поворот, выбранная квартира на листе, «это точно план», отмеченный вход) — только если есть что сказать */
    var hints = st.hints && Object.keys(st.hints).length ? st.hints : null;
    var req = FLOW.apiMarkup(prep.blob, { name: prep.name, hints: hints, onUpload: function (f) { up = f; if (f >= 1 && !tUp) tUp = Date.now(); } });
    st.req = req;
    st.tick = setInterval(function () {
      if (seq !== st.seq) { clearInterval(st.tick); return; }
      /* браузер не сообщает ход отправки (перехват запроса, некоторые прокси): через 2,5 с без событий считаем файл отправленным */
      if (!tUp && !up && Date.now() - t0 > 2500) tUp = Date.now();
      paintWait(t0, up, tUp);
    }, 500);
    function done() {
      if (st.tick) { clearInterval(st.tick); st.tick = null; }
      if (st.req === req) st.req = null;
    }
    req.then(function (res) {
      done();
      if (seq !== st.seq) return;                     /* нажали «Отменить» или «Шаг назад», пока читали план */
      setStage(2, 100);
      FLOW.resolveOpenings(res);                      /* комнаты получают id, проёмы — a_id / b_id / room_id: один раз, здесь */
      live.res = res;
      live.labeled = res.labeled_png_base64 ? 'data:image/png;base64,' + res.labeled_png_base64 : null;
      if (live.labeled) shrinkImg(live.labeled, 1200, function (s) { if (st.live === live) live.labeledSmall = s; });   /* копия для экранов после мебели */
      /* новый сервер: размер картинки, к которой относятся координаты и масштаб (image_size), и её копия, когда он показал бы
         другую картинку, чем прислали (PDF, HEIC, вырезка по квартире, поворот, выправленное фото) — тогда 2D рисуем по ней.
         Старый сервер этих полей не шлёт — всё как раньше */
      var size = Array.isArray(res.image_size) && res.image_size[0] > 0 && res.image_size[1] > 0 ? res.image_size : null;
      if (size) { live.w = size[0]; live.h = size[1]; }
      var srv = typeof res.source_image_base64 === 'string' && res.source_image_base64.length > 64 ? 'data:image/jpeg;base64,' + res.source_image_base64 : null;
      function show() {
        if (seq !== st.seq) return;
        var q = FLOW.qualityOf(res, live.w, live.h), hasRooms = (res.rooms || []).some(function (r) { return r.seeded !== false && r.box_2d; });
        /* несколько квартир на листе и непонятно, какая нужна (комнат нет) — сначала выбор квартиры */
        if (res.method === 'flats' || (!hasRooms && q.flats.length > 1)) { st.flatPick = null; st.view = 'flats'; keepLive({ view: 'flats' }); render(); return; }
        carryEdits();                                 /* правки до «Прочитать ещё раз» — по совпадению подписей */
        /* вход, отмеченный человеком раньше, ставим снова, если сервер и в этот раз его не нашёл */
        if (!q.entrance_found && st.hints.entrance_point_2d) markEntrance(st.hints.entrance_point_2d);
        st.pick = null; st.mode = isPoor(q) ? '2d' : '3d';     /* прочитано примерно — сначала 2D, он честнее домика */
        keepLive({ view: 'rooms' }); st.view = 'rooms'; render();
      }
      function withPicture(src, next) {
        var im = new Image();
        im.onload = function () { if (!size) { live.w = im.naturalWidth; live.h = im.naturalHeight; } live.src = src; shrinkLive(live); next(true); };
        im.onerror = function () { next(false); };
        im.src = src;
      }
      if (srv) return withPicture(srv, function (ok) { if (ok) live.fromServer = true; if (!live.w) { live.w = 1000; live.h = 1000; } show(); });
      if (live.kind === 'image' && live.w) return show();
      /* старый сервер, PDF и HEIC без картинки у браузера: размеры и картинка — из подписанной копии сервера */
      if (!live.labeled) { live.w = live.w || 1000; live.h = live.h || 1000; return show(); }
      withPicture(live.labeled, function (ok) { if (!ok) { live.w = live.w || 1000; live.h = live.h || 1000; } show(); });
    }).catch(function (e) {
      done();
      if (seq !== st.seq || (e && e.kind === 'abort')) return;
      /* 422 нового сервера: «не план» и «комнаты не нашлись» — свои экраны с советами, повтором и «это точно план» */
      if (e && e.status === 422 && /^(not_a_plan|no_rooms)$/.test(String(e.code || ''))) {
        st.np = { code: e.code, detail: String(e.message || '') }; st.view = 'notplan'; render();
        keepLive({ view: 'notplan' });                /* перезагрузка на этом экране — тот же экран, повтор из копии */
        return;
      }
      var er = FLOW.errorOf(e);
      if (er.kind === 'minute') startCountdown(60);   /* до отрисовки: кнопка сразу «Повторить через 60 с» и выключена */
      failLive(er);
      if (live.kind === 'image') keepLive({ view: 'error' });   /* перезагрузка на ошибке — тот же экран, повтор из копии */
    });
  }
  /* «Повторить этот же файл»: тот же подготовленный файл; после перезагрузки — из копии ≤ 1600 px в sessionStorage */
  function retryRead() {
    var l = st.live; if (!l) return;
    if (l.prep) return startLive(l.prep);
    if (!l.small) return;
    fetch(l.small).then(function (r) { return r.blob(); }).then(function (b) {
      var name = (st.fileName || 'plan').replace(/\.[a-z0-9]+$/i, '') + '.jpg';
      startLive({ kind: 'image', blob: b, name: name, w: l.w, h: l.h, src: l.small, key: l.key, small: l.small });
    }).catch(function () { failLive({ kind: 'unknown', text: 'Не получилось повторить — загрузи файл ещё раз.', primary: 'other' }); });
  }

  /* ── правки на «Проверь план» без запроса к серверу (PR2) ── */
  /* точка тапа по картинке 2D → доли 0–1000 всей картинки (на экране она показана вырезкой liveCrop) */
  function pointFromEvent(el, e) {
    var r = el.getBoundingClientRect(), c = liveCrop() || { x1: 0, y1: 0, w: 1, h: 1 };
    var fx = clamp((e.clientX - r.left) / (r.width || 1), 0, 1), fy = clamp((e.clientY - r.top) / (r.height || 1), 0, 1);
    return [c.y1 + fy * c.h * 1000, c.x1 + fx * c.w * 1000];
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* «Отметить вход»: ближайшая комната и её ближайшая сторона, точка на этой стене → проём entrance вместо найденного сервером.
     Рамка для 3D и расстановки пересчитывается локально (st.geo), точка запоминается подсказкой для перечитывания */
  function markEntrance(p) {
    var l = st.live, res = l && l.res; if (!res || !p) return false;
    var live = (res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; }); if (!live.length) return false;
    function gap(b) { var dy = Math.max(b[0] - p[0], 0, p[0] - b[2]), dx = Math.max(b[1] - p[1], 0, p[1] - b[3]); return dy * dy + dx * dx; }
    var best = null, bd = Infinity;
    live.forEach(function (r) { var d = gap(r.main_box_2d || r.box_2d); if (d < bd) { bd = d; best = r; } });
    var b = best.main_box_2d || best.box_2d;
    var sides = [['north', Math.abs(p[0] - b[0])], ['south', Math.abs(p[0] - b[2])], ['west', Math.abs(p[1] - b[1])], ['east', Math.abs(p[1] - b[3])]]
      .sort(function (x, y) { return x[1] - y[1]; });
    var side = sides[0][0], pt = side === 'north' ? [b[0], clamp(p[1], b[1], b[3])] : side === 'south' ? [b[2], clamp(p[1], b[1], b[3])]
      : side === 'west' ? [clamp(p[0], b[0], b[2]), b[1]] : [clamp(p[0], b[0], b[2]), b[3]];
    pt = [Math.round(pt[0] * 10) / 10, Math.round(pt[1] * 10) / 10];
    res.openings = (res.openings || []).filter(function (o) { return o.kind !== 'entrance'; });
    res.openings.unshift({ kind: 'entrance', a: best.type, a_id: best.id, room_id: best.id, wall: side, wall_of_a: side, point_2d: pt, width_m: 0.9, by_user: true });
    /* стены с картинки: 3D и «Чертёж» строятся по walls_2d / doors_2d — прежнюю створку входа заделываем, в точке входа режем
       стену и ставим створку (FLOW.cutEntrance; разбор 30.10: вход отмечался, а створка оставалась на старом месте) */
    FLOW.cutEntrance(res, l.w, l.h);
    st.hints.entrance_point_2d = pt; st.geo = null;
    return true;
  }
  /* «Повернуть»: картинка есть (своя или сервера) — поворот на холсте на 90° по часовой, координаты ответа пересчитываем
     (FLOW.rotateRes), повёрнутый JPEG становится файлом для «Прочитать ещё раз» — подсказка rotation не нужна; вырезка
     по квартире после этого — сам файл, подсказку flat_box_2d снимаем. Картинки нет (PDF или HEIC на старом сервере) —
     повтор того же файла с подсказкой rotation */
  function rotateLocal() {
    var l = st.live; if (!l || !l.res) return;
    if (!(l.src && (l.kind === 'image' || l.fromServer))) { st.hints.rotation = ((st.hints.rotation || 0) + 90) % 360; rememberEdits(); retryRead(); return; }
    var im = new Image(), seq = st.seq;
    function fail() { if (seq === st.seq) S.ui.toast('Не получилось повернуть картинку'); }
    im.onload = function () {
      if (seq !== st.seq || st.live !== l) return;
      var c = document.createElement('canvas'); c.width = im.naturalHeight; c.height = im.naturalWidth;
      try {
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(im, 0, 0);
      } catch (e) { return fail(); }
      c.toBlob(function (blob) {
        if (seq !== st.seq || st.live !== l) return;
        if (!blob) return fail();
        var name = (st.fileName || 'plan').replace(/\.[a-z0-9]+$/i, '') + '.jpg', src = URL.createObjectURL(blob), w = l.w, h = l.h, keep = st.sheet && st.sheet.src;
        if (l.src && /^blob:/.test(l.src) && l.src !== keep) try { URL.revokeObjectURL(l.src); } catch (e) {}
        l.prep = { kind: 'image', blob: blob, name: name, w: c.width, h: c.height, src: src, key: l.key };
        l.blob = blob; l.kind = 'image'; l.fromServer = false; l.src = src; l.small = null; l.labeled = null; l.labeledSmall = null;
        l.w = h; l.h = w; l.res = FLOW.resolveOpenings(FLOW.rotateRes(l.res));
        if (st.hints.entrance_point_2d) st.hints.entrance_point_2d = FLOW.rotatePoint(st.hints.entrance_point_2d);
        delete st.hints.flat_box_2d; delete st.hints.rotation;
        st.rot = (st.rot + 90) % 360; st.geo = null;
        shrinkLive(l); keepLive({ view: 'rooms' }); render();
      }, 'image/jpeg', 0.9);
    };
    im.onerror = fail;
    im.src = l.src;
  }
  /* правки человека переживают «Прочитать ещё раз»: до повтора запоминаем, что он менял, после ответа переносим
     по совпадению подписи комнаты (label) — только то, что отличалось от увиденного */
  function rememberEdits() {
    if (!st.live || !st.live.res) { st.carry = null; return; }
    st.carry = liveRooms().map(function (r, i) {
      return { label: r.label, name: st.names && st.names[i] && st.names[i] !== r.name ? st.names[i] : null, type: st.types && st.types[i] && st.types[i] !== r.type ? st.types[i] : null };
    }).filter(function (c) { return c.label && (c.name || c.type); });
  }
  function carryEdits() {
    var c = st.carry; st.carry = null; st.names = null; st.areas = null; st.types = null; st.touched = null;
    if (!c || !c.length || !st.live || !st.live.res) return;
    liveRooms().forEach(function (r, i) {
      var m = c.filter(function (x) { return x.label === r.label; })[0]; if (!m) return;
      if (m.name) (st.names = st.names || {})[i] = m.name;
      if (m.type) { (st.types = st.types || {})[i] = m.type; (st.touched = st.touched || {})[i] = true; }
    });
  }
  /* выбранная квартира на листе → повтор файлом целого листа с подсказкой flat_box_2d; лист запоминаем для «Другая квартира на листе» */
  function readFlat() {
    var sh = sheetOf(), l = st.live, f = sh && sh.flats[st.flatPick]; if (!f || !l) return;
    if (!st.sheet) st.sheet = { prep: l.prep || null, src: l.src, small: l.small, w: l.w, h: l.h, flats: sh.flats, kind: l.kind, fromServer: !!l.fromServer };
    else { l.prep = st.sheet.prep; l.small = st.sheet.small; l.w = st.sheet.w; l.h = st.sheet.h; }
    if (!l.prep && !l.small) { S.ui.toast('Лист не сохранился — загрузи файл ещё раз'); return; }
    st.hints.flat_box_2d = f.box_2d.map(Math.round); delete st.hints.rotation;
    st.names = null; st.areas = null; st.types = null; st.touched = null; st.carry = null; st.flatPick = null;
    retryRead();
  }

  /* свой план: рамка из разметки + ответы → расстановка на сервере → экран 5 */
  /* детскую расстановка обставляет как спальню (кровать, шкаф): правил для «детская» у сервера нет */
  var LAYOUT_TYPE = { 'детская': 'спальня' };
  /* разметка своего плана с правками «Проверь план» — её рамку получают расстановка (goLive) и «Чертёж» (openCad) */
  function editedRes() {
    var res = FLOW.resolveOpenings(JSON.parse(JSON.stringify(st.live.res))), k = 0;
    /* исправленное название меняет и тип комнаты — по типу сервер ставит мебель (28.10: на обмерном плане зрение
       видит только номера и путает типы); «другое» от зрения уточняем по его же подписи.
       Проёмы к комнатам привязаны по id (resolveOpenings сразу после ответа), поэтому смена типа их не трогает */
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      if (st.names && st.names[k]) r.label = st.names[k];
      /* тип — из списка на «Проверь план», иначе по исправленному названию; «другое» от зрения уточняем по его же подписи */
      var t = (st.types && st.types[k]) || FLOW.typeFromName(st.names && st.names[k] ? st.names[k] : r.type === 'другое' || !r.type ? r.label : '');
      if (t) r.type = LAYOUT_TYPE[t] || t;
      k++;
    });
    return res;
  }
  function goLive(brief, tail) {
    st.view = 'placing'; render();
    var live = st.live, res = editedRes(), seq = st.seq;
    var frame = withAreas(FLOW.frameFromMarkup(res, live.w, live.h)), q0 = FLOW.qualityOf(res, live.w, live.h);   /* площадь правили руками — мебель ставим в новый размер */
    FLOW.apiAuto(frame, FLOW.briefFromAnswers(brief)).then(function (out) {
      if (seq !== st.seq) return;                     /* нажали «Шаг назад», пока расставляли */
      var hosts = frame.rooms.filter(function (r) { return !r.part_of; });
      var total = hosts.reduce(function (a, r) { return a + (r.doc_m2 || 0); }, 0);
      /* в localStorage — уменьшенная копия разметки, не PNG в размер плана: фото или скан плана на несколько МБ не влезал,
         save молча не срабатывал, и экран мебели показывал прошлую расстановку (найдено 28.10). Проверяем, что записалось */
      var stamp = Date.now() + ':' + Math.random(), fkey = live.key || st.fileName, pack = function (img) {
        return { live: { layout: out.layout, not_placed: out.not_placed || [], ready: out.ready_for_render,
          flat: 'Твой план · ' + F.area(total) + ' · ' + hosts.length + ' помещения', labeled: img, name: st.fileName, key: fkey, stamp: stamp,
          /* как прочитан план и что человек поправил — для экранов после мебели и возврата */
          quality: { level: q0.level, path: q0.path }, hints: st.hints || {}, edits: { names: st.names || null, types: st.types || null, areas: st.areas || null }, rot: st.rot || 0 } };
      };
      /* расстановки других своих планов (arrange.js: «sove.arrange.layout.v2:<ключ файла>») — долой, место нужно под разметку;
         ключ этого файла и ключ примера PRIDE (без «:») остаются */
      var pre = 'sove.arrange.layout.v2:';
      try { Object.keys(localStorage).forEach(function (key) { if (key.indexOf(pre) === 0 && key !== pre + fkey) localStorage.removeItem(key); }); } catch (e) {}
      /* labeledSmall ещё не готов или копия не вышла — берём labeled (после «Шаг назад» это уже уменьшенная копия из restoreBack);
         не влезло — ниже повтор без картинки, иначе итог терял «Твой план с разметкой» при второй расстановке */
      if ((FLOW.save(pack(live.labeledSmall || live.labeled || null)).live || {}).stamp !== stamp || (FLOW.load().live || {}).stamp !== stamp) FLOW.save(pack(null));
      if ((FLOW.load().live || {}).stamp !== stamp) {
        st.error = 'Хранилище демо переполнено — удали загруженные файлы в «Мой ремонт» или очисти данные сайта.'; st.errKind = 'place'; st.view = 'error'; render(); return;
      }
      location.href = 'arrange.html?v=panel&flow=1&live=1' + (tail || '');
    }).catch(function (e) {
      if (seq !== st.seq) return;
      /* ответы и план на месте: экран ошибки предлагает повторить или вернуться к вопросам */
      st.error = 'Расстановка не удалась: ' + (e.message || 'сервер не ответил'); st.errKind = 'place'; st.view = 'error'; render();
    });
  }

  function startReading() {
    st.view = 'reading'; render();
    var i = 0, seq = st.seq;
    var tick = setInterval(function () {
      if (seq !== st.seq) { clearInterval(tick); return; }        /* нажали «Назад» — чтение отменено */
      i++; setStage(i);
      if (i >= READ_STAGES.length) { clearInterval(tick); st.view = 'rooms'; render(); }
    }, 700);
  }

  /* walls — после списания идём на «Варианты стен», иначе сразу на мебель */
  /* раздел 5 анкеты: ответы меняют расстановку и без перепланировки */
  function layoutFromAnswers() {
    var imp = st.rp.add || [];
    return {
      plan: imp.indexOf('рабочее место') >= 0 ? 2 : 0,   /* вариант «Больше хранения» убран (05.11) — хранение остаётся в ответах для стен */
      roomHint: imp.indexOf('детская') >= 0 || imp.indexOf('спальня отдельно') >= 0,      /* подсказка «Хочешь отдельную комнату?» */
      sturdy: st.rp.purpose === 'сдавать'                                                      /* флаг для подбора в Маркете: мебель прочнее */
    };
  }
  /* 0.1: «Расставить мебель» → лоадер «Расставляю мебель по нормам проходов» → мебель встаёт в ту же 3D-квартиру */
  function go(walls) {
    var brief = commit(), lay = layoutFromAnswers();
    FLOW.save({ replanAnswers: st.rp, wallVariant: null, layoutHints: lay, plan: lay.plan });
    var tail = (walls ? '&walls=1' : '') + '&anim=1';
    st.retryWalls = walls; st.placingFrom = 'brief';
    /* «← Назад» с экрана мебели вернёт к вопросам — и с примером, и со своим планом (keepLive выше).
       Не удалось сохранить свой план (переполнено хранилище) — как раньше, первый экран */
    var liveKept = st.live && st.live.res ? keepLive({ view: 'brief' }) : (dropLive(), false);
    FLOW.save({ backTo: st.live && !liveKept ? null : 'brief' });
    if (st.live && st.live.res) { goLive(brief, tail); return; }
    FLOW.save({ live: null });
    st.view = 'placing'; render();
    var seq = st.seq;                                /* «Шаг назад» с экрана «Расставляю мебель» — переход отменён */
    setTimeout(function () { if (seq !== st.seq) return; location.href = 'arrange.html?v=panel&plan=' + lay.plan + '&flow=1' + tail; }, 700);
  }

  function bind() {
    /* поля файла (три на разных экранах) слушает один обработчик на корне — см. ниже, вне bind(): здесь он регистрировался бы
       при каждой перерисовке и запускал разметку дважды (два платных вызова) */
    var zf = document.getElementById('pd-zks'), zq = document.getElementById('pd-zkq');
    function zkBind() {
      root.querySelectorAll('#pd-zkres [data-zk]').forEach(function (b) { b.addEventListener('click', function () { st.zk = b.dataset.zk; st.view = 'zk'; render(); window.scrollTo(0, 0); }); });
      root.querySelectorAll('#pd-zkres [data-act="noplan"]').forEach(function (b) { b.addEventListener('click', function () { st.source = 'none'; st.view = 'noplan'; render(); }); });
    }
    if (zq) zq.addEventListener('input', function () { st.zkQ = zq.value; document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    var tags = heroTags(example());
    root.querySelectorAll('[data-tag]').forEach(function (b) { b.addEventListener('click', function () { tagSheet(tags[+b.dataset.tag]); }); });
    if (zf) zf.addEventListener('submit', function (e) { e.preventDefault(); st.zkQ = zq.value; var r = ZK ? ZK.search(st.zkQ) : [];
      if (r.length === 1) { st.zk = r[0].id; st.view = 'zk'; render(); window.scrollTo(0, 0); return; }
      document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    zkBind();
    root.querySelectorAll('[data-zl]').forEach(function (b) { b.addEventListener('click', function () { pickLayout(b.dataset.zl); }); });
    /* дизайн-проект — свой вход (раздел 5 ТЗ), «плана нет» — площадь и комнаты */
    root.querySelectorAll('[data-proj]').forEach(function (l) { l.addEventListener('click', function () { st.source = 'project'; }); });
    root.querySelectorAll('[data-src]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.source = b.dataset.src;
        if (st.source === 'project') { location.href = FLOW.SCN.project.href; return; }
        if (st.source === 'none') { st.view = 'noplan'; }
        render();
      });
    });
    root.querySelectorAll('[data-rooms]').forEach(function (b) {
      b.addEventListener('click', function () { var m = document.getElementById('pd-m2'); st.noplan.m2 = m ? m.value : ''; st.noplan.rooms = +b.dataset.rooms; render(); });
    });
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'sample' || a === 'again' || a === 'typical') st.errKind = null;
        if (a === 'sample') { FLOW.save({ zk: null }); if (!/replan=1/.test(location.search)) FLOW.setReplan(false); resetLive(); st.geo = null; st.typical = null; st.names = null; st.areas = null; st.fileName = null; if (st.source === 'none') st.source = 'developer'; st.state = 'concrete_walls'; startReading(); }
        if (a === 'upload') { st.view = 'upload'; render(); window.scrollTo(0, 0); }
        /* «Другой файл» (ошибка) и «Другой план» («Проверь план») — на шаг загрузки, как у Алины (её A1 = наш 'upload');
           'idle' у нас — первая страница по макету Вики: туда ведут «← К поиску» и «Назад» без плана.
           Запрос, если шёл, обрываем; картинку и запись для возврата убираем */
        if (a === 'again') { st.view = /^(error|rooms|notplan|flats)$/.test(st.view) ? 'upload' : 'idle'; resetLive(); st.typical = null; st.names = null; st.areas = null; if (st.source === 'none') st.source = 'developer'; render(); }
        /* «Отменить» на чтении — запрос обрываем, назад к загрузке */
        if (a === 'cancel-read') { resetLive(); st.view = 'upload'; render(); window.scrollTo(0, 0); }
        /* «Повторить этот же файл» — без нового выбора файла */
        if (a === 'retry-read') { if (b.disabled) return; st.errKind = null; retryRead(); }
        if (a === 'typical') {
          var m2 = parseFloat(String((document.getElementById('pd-m2') || {}).value || '').replace(',', '.'));
          if (!(m2 >= 15 && m2 <= 300)) { var inp = document.getElementById('pd-m2'); if (inp) { inp.focus(); inp.setCustomValidity('Площадь от 15 до 300 м²'); inp.reportValidity(); } return; }
          st.noplan.m2 = m2; st.live = null; st.names = null; st.areas = null;
          st.typical = { m2: m2, rooms: typicalRooms(m2, st.noplan.rooms) }; st.geo = null; st.state = null;
          st.view = 'brief'; render();
        }
        if (a === 'ok') {
          collectNames();
          st.view = 'brief'; render(); window.scrollTo(0, 0);
        }
        if (a === 'cad') { collectNames(); openCad(); }
        /* правки на «Проверь план»: вход тапом, поворот, перечитать, другая квартира на листе; «не план» — настоять */
        if (a === 'pick-entrance') { collectNames(); st.pick = 'entrance'; render(); }
        if (a === 'pick-cancel') { st.pick = null; render(); }
        if (a === 'rotate') { collectNames(); rotateLocal(); }
        if (a === 'reread') { collectNames(); rememberEdits(); retryRead(); }
        if (a === 'to-flats') { collectNames(); st.flatPick = null; st.view = 'flats'; render(); window.scrollTo(0, 0); }
        if (a === 'read-flat') { if (st.flatPick === null || st.flatPick === undefined) { S.ui.toast('Сначала тапни по своей квартире'); return; } readFlat(); }
        if (a === 'force-plan') { st.hints.is_plan = true; st.np = null; retryRead(); }
        if (a === 'retry') { st.errKind = null; go(st.retryWalls); }
        if (a === 'to-brief') { st.errKind = null; st.view = 'brief'; render(); window.scrollTo(0, 0); }

        if (a === 'later') { st.interior = null; render(); }
        if (a === 'fit-open') { st.fitOpen = true; render(); }
        if (a === 'go') {
          if (needAnswers()) return;
          if (FLOW.replanOn() && !st.live) sheet(); else go(false);
        }
      });
    });
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { collectNames(); st.mode = b.dataset.mode; render(); });
    });
    /* тап по картинке 2D в режиме «Отметить вход» → вход на ближайшей стене, 3D и рамка пересчитаны */
    root.querySelectorAll('[data-pick-plan]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (!markEntrance(pointFromEvent(el, e))) return;
        st.pick = null; keepLive({ view: 'rooms' }); render(); S.ui.toast('Вход отмечен', 'ok');
      });
    });
    root.querySelectorAll('[data-flat]').forEach(function (b) { b.addEventListener('click', function () { st.flatPick = +b.dataset.flat; render(); }); });
    /* название → тип в списке подстраивается, пока человек не выбрал тип сам; правки сохраняем для перезагрузки по уходу из поля */
    root.querySelectorAll('input[data-room]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var i = +inp.dataset.room, sel = root.querySelector('select[data-type="' + i + '"]'), t = FLOW.typeFromName(inp.value);
        if (sel && t && !(st.touched && st.touched[i])) { sel.value = t; (st.types = st.types || {})[i] = t; }
      });
      inp.addEventListener('change', function () { collectNames(); if (st.live) keepLive({ view: 'rooms' }); });
    });
    root.querySelectorAll('select[data-type]').forEach(function (sel) {
      sel.addEventListener('change', function () { (st.touched = st.touched || {})[+sel.dataset.type] = true; collectNames(); if (st.live) keepLive({ view: 'rooms' }); });
    });
    /* площадь поправили — сохраняем и перерисовываем: сумма в подзаголовке и дальше вопросы, бюджет — по новой площади */
    root.querySelectorAll('input[data-room-m2]').forEach(function (inp) {
      inp.addEventListener('change', function () { collectNames(); if (st.live) keepLive({ view: 'rooms' }); render(); });
    });
    root.querySelectorAll('[data-state-open]').forEach(function (b) { b.addEventListener('click', function () { stateOpen = true; render(); }); });
    root.querySelectorAll('[data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        var was = st.state; st.state = b.dataset.state; stateOpen = false;
        /* «Бетон, стен нет» включает «Варианты стен» сам (ТЗ 4.1), можно выключить; свой план — нет: вариантов стен
           для него не строим, а включённая перепланировка добавляла шаг «Стены» в полосу */
        if (st.state === 'concrete_free' && was !== 'concrete_free' && !st.live) FLOW.setReplan(true);
        FLOW.save({ state: st.state }); render();
      });
    });
    root.querySelectorAll('[data-replan]').forEach(function (b) {
      b.addEventListener('change', function () { FLOW.setReplan(b.checked); render(); });
    });
    root.querySelectorAll('[data-rp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.rp, o = b.dataset.o, max = +b.dataset.multi || 0;
        if (max) { var l = st.rp[k], i = l.indexOf(o); if (i >= 0) l.splice(i, 1); else if (l.length < max) l.push(o); else { S.ui.toast('Можно выбрать до ' + max); return; } }
        else st.rp[k] = o;
        FLOW.save({ replanAnswers: st.rp }); render();
      });
    });
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = questions().filter(function (x) { return x.k === b.dataset.q; })[0];
        var a = st.answers[q.k] || (st.answers[q.k] = []); a[+b.dataset.row] = b.dataset.o; render();
      });
    });
    root.querySelectorAll('[data-cap]').forEach(function (b) {
      b.addEventListener('click', function () { st.interior = FLOW.capsuleInterior(b.dataset.cap); render(); });
    });
    root.querySelectorAll('[data-own-open]').forEach(function (b) {
      b.addEventListener('click', function () { FLOW.ownSheet(function (it) { st.interior = it; render(); }); });
    });
  }
  if (saved.interior && saved.step >= 4) st.interior = saved.interior;
  if (saved.state && /replan=1/.test(location.search)) st.state = saved.state;
  if (saved.replanAnswers) st.rp = saved.replanAnswers;
  /* вход «Перепланировка» (?replan=1): переключатель включён; план есть — сразу вопросы (ТЗ, п. 2) */
  if (new URLSearchParams(location.search).get('replan') === '1') { FLOW.setReplan(true); if (saved.rooms && saved.rooms.length) { st.view = 'brief'; st.entry = true; } }
  /* «Подстроить под тебя» с экрана мебели (?tune=1): анкета v2 по квартире из базы ЖК, без сканера; состояние — из «как сдаётся» */
  if (Q.get('tune') === '1' && saved.zk) { st.state = saved.state || st.state; st.interior = saved.interior || null; st.view = 'brief'; st.entry = true; }

  /* ── «Шаг назад» (Алина 26.10: «нет возврата на шаг назад простого»; 28.10: «Назад и шаг назад должны быть разными
     кнопками»). Шаги блока живут на одной странице: здесь перехватываем «Шаг назад» и ведём на предыдущий шаг.
     «← Назад» шапки (demo-flow.js) выводит из Планировки туда, откуда пришли ── */
  function backStep() {
    var v = st.view;
    if (v === 'upload' || v === 'zk' || v === 'noplan') return function () { st.view = 'idle'; };
    if (v === 'reading') return function () { resetLive(); st.view = 'upload'; };          /* запрос обрываем — чтение отменено */
    if (v === 'error') return function () { if (st.errKind) { st.errKind = null; st.view = 'brief'; } else { stopCountdown(); st.view = 'upload'; } };
    if (v === 'rooms' && st.pick) return function () { st.pick = null; };                 /* режим тапа «Отметить вход» — как «Отмена» */
    if (v === 'rooms') return function () { collectNames(); st.view = 'upload'; };
    if (v === 'notplan' || v === 'flats') return function () { st.view = 'upload'; };
    if (v === 'brief' && !st.entry) return function () { st.view = st.typical ? 'noplan' : 'rooms'; };
    /* «Расставляю мебель»: отменяем переход (go / goLive / pickLayout сверяют st.seq) и возвращаемся туда, откуда расставляли */
    if (v === 'placing') return function () { st.seq++; st.view = st.placingFrom || 'brief'; };
    return null;
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pz-step]'); if (!b) return;
    var f = backStep(); if (!f) return;
    e.stopPropagation(); f(); render(); window.scrollTo(0, 0);
  });
  /* «<» в шапке сайта — тот же шаг назад; нет шага — уходим со страницы (site.js) */
  window.SOVE.backStep = function () { var f = backStep(); if (!f) return false; f(); render(); window.scrollTo(0, 0); return true; };
  /* один обработчик на все поля файла (data-plan-file): регистрируется один раз, не в bind() — иначе разметка шла дважды.
     Поле очищаем, чтобы тот же файл можно было выбрать снова */
  root.addEventListener('change', function (e) {
    var inp = e.target.closest && e.target.closest('input[type=file][data-plan-file]'); if (!inp) return;
    var f = inp.files && inp.files[0]; inp.value = '';
    if (f) acceptPlanFile(f);
  });
  /* вернулись «Назад» с экрана мебели: страница загрузилась заново — открываем шаг, с которого ушли */
  function restoreBack() {
    if (saved.backTo === 'zk' && saved.zk && ZK && ZK.get(saved.zk.id)) { st.zk = saved.zk.id; st.view = 'zk'; return; }
    if (saved.backTo !== 'brief') return;
    st.state = saved.state || 'concrete_walls'; st.answers = saved.answers || {}; st.interior = saved.interior || null;
    if (saved.source) st.source = saved.source;        /* источник плана тоже как был (так восстанавливал «Назад» Алины 27.10) */
    if (saved.typical && saved.rooms) {
      st.typical = { m2: saved.rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0), rooms: saved.rooms.map(function (r) { return { name: r.name, m2: r.m2 }; }) };
    } else {
      var lb = readLiveBack();
      if (lb && lb.res) {
        var lab = saved.live && saved.live.labeled;   /* это уже уменьшенная копия разметки (goLive) — годится и как labeledSmall */
        st.live = liveFromBack(lb, lab);
        st.fileName = lb.file || st.fileName;
        restoreEdits(lb);                             /* подсказки, типы и повороты — как были на «Проверь план» */
      }
      /* названия комнат — только к своему плану, который удалось восстановить, или к примеру: иначе (новая вкладка без sessionStorage)
         на примере PRIDE оказывались названия своего плана и не совпадали с площадями */
      if (st.live || !saved.live) (saved.rooms || []).forEach(function (r, i) { (st.names = st.names || {})[i] = r.name; if (r.type && st.live) (st.types = st.types || {})[i] = r.type; });
    }
    st.view = 'brief';
  }
  /* свой план из записи sessionStorage (возврат «Назад», перезагрузка): разметка с id проёмов (старые записи без них — дополняем) */
  function liveFromBack(lb, lab) {
    return { res: lb.res ? FLOW.resolveOpenings(lb.res) : null, w: lb.w, h: lb.h, small: lb.img || null, src: lb.img || lab || '', labeled: lab || null,
      labeledSmall: lab || null, key: lb.key || null, kind: lb.kind || 'image', fromServer: !!lb.fromServer, name: lb.file || '' };
  }
  var nav = (window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  /* ?back=1 — явный возврат по ссылке, как в «Назад» Алины 27.10 */
  if ((nav.type === 'back_forward' || Q.get('back') === '1') && st.view === 'idle' && saved.backTo) restoreBack();
  /* Алина 27.10 («Назад из расстановки»): из расстановки — всегда на вопросы, даже если их не проходили
     (в расстановку пришли из Генераций): пример ЖК PRIDE, состояние — сохранённое или «бетон, стены стоят».
     Свой план, который не удалось сохранить для возврата (saved.live), — как раньше, первый экран */
  else if (Q.get('back') === '1' && st.view === 'idle' && !saved.backTo && !saved.live) { st.state = saved.state || 'concrete_walls'; st.view = 'brief'; }
  /* перезагрузили страницу на «Проверь план» или на ошибке чтения — показываем тот же экран из записи sessionStorage,
     а не первую страницу: файл и разметка не теряются, «Повторить этот же файл» работает из копии */
  else if (nav.type === 'reload' && st.view === 'idle') {
    var lb0 = readLiveBack();
    if (lb0 && lb0.view === 'rooms' && lb0.res && (lb0.img || lb0.kind !== 'image')) {
      st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.keep = { view: 'rooms' }; st.view = 'rooms';
      st.mode = isPoor(quality()) ? '2d' : '3d';
    }
    /* выбор квартиры на листе и «не план» — тоже возвращаем: файл и ответ не теряются */
    else if (lb0 && lb0.view === 'flats' && lb0.res && lb0.img) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.flatPick = null; st.keep = { view: 'flats' }; st.view = 'flats'; }
    else if (lb0 && lb0.view === 'notplan' && lb0.np && (lb0.img || lb0.kind !== 'image')) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.np = lb0.np; st.keep = { view: 'notplan' }; st.view = 'notplan'; }
    else if (lb0 && lb0.view === 'error' && lb0.err && lb0.img) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; st.err = lb0.err; st.error = lb0.err.text; st.view = 'error'; if (lb0.err.kind === 'minute') startCountdown(60); }
  }
  /* браузер вернул страницу из памяти как была — с экраном «Расставляю мебель» или «Читаю план»: показываем шаг до него
     (запрос чтения к этому моменту уже ничей — обрываем) */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    if (st.view === 'placing') { st.view = st.placingFrom || 'idle'; render(); }
    else if (st.view === 'reading') { resetLive(); st.view = 'upload'; render(); }
  });
  /* ?up=1 — «Изменить план» из Моего ремонта: сразу шаг загрузки (застройщика, обмерный или дизайн-проект) */
  if (Q.get('up') === '1' && st.view === 'idle') st.view = 'upload';
  render();
})();
