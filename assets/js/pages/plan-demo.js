/* Блок «Планировка», сценарий 1 «3D + мебель» (ТЗ-planirovka, эталоны A1–A4; саммари созвона 30.10, договор частей 02.11):
   План (первый экран, загрузка — общее окно SOVE.planUpload, вход 'plan'; чтение) → A3 проверь план → A4 вопросы по плану →
   расстановка (arrange.html). Файл плана в объект пишет окно загрузки, комнаты — только Планировка, один раз, по «Всё верно».
   План уже в объекте — заново не просим: «План уже в Моём ремонте · Продолжить / Заменить».
   Разметку своего плана делает POST /ai/plan/markup; пример ЖК PRIDE показываем готовым, без вызова.
   Интерьер — общее окно SOVE.capsulePicker через SOVE_FLOW (demo-flow.js): капсула и «База | Премиум» пишутся в объект там.
   Вопросы строятся по найденному в плане: чего в плане нет — не спрашиваем, варианты отсекаем по метражу. Вид вопросов — q-style.css. */
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
  var SAMPLE_FACTS = { bedMax: '160×200', bedWhy: 'не останется прохода 70 см', kitchenWall: 3.1, kitchenWide: false, niche: true, bathBoth: false, dineZone: 8 };

  /* загрузка — общее окно (договор, п. 3): в Планировке только план застройщика и обмерный (саммари 30.10, п. 1);
     дизайн-проект и фото квартиры загружают в Моём ремонте */
  var PU_CARDS = ['developer_plan', 'measured_plan'];
  var LEVEL_SRC = { developer_plan: 'developer', measured_plan: 'measure', design_project: 'project' };
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
  /* шаги полосы (саммари 30.10, п. 3 — четыре: План · Проверка · Вопросы · Мебель): загрузка, поиск ЖК и чтение — шаг «План» */
  var STEP = { idle: 'plan', zk: 'plan', noplan: 'plan', error: 'plan', notplan: 'plan', reading: 'plan', flats: 'plan', scan: 'plan', rooms: 'check', brief: 'questions', placing: 'furniture' };
  var Q = new URLSearchParams(location.search);
  var ZK = window.SOVE_ZK || null;

  /* ── Режим скана (договор, п. 4): plan-demo.html?from=<блок>&scan=1&returnTo=<адрес блока>. План в объект уже положило
     окно загрузки (Бюджет, Интерьер, Мой ремонт); здесь его читают тем же чтением, показывают тот же «Проверь план»
     и по «Всё верно — вернуться в <блок>» одной записью кладут комнаты в объект. Сразу после входа scan=1 в адресе меняем
     на scan=2 («скан начат, сам не запускать»): перезагрузка, рамка телефона на компьютере (она копирует адрес фрейма
     в phone.html?p=…), «Назад» / «Вперёд» и та же ссылка в новой вкладке остаются сканом, но второго платного чтения
     без нажатия нет. Само чтение стартует только со свежей ссылки блока: scan=1 и обычный переход ── */
  var FROM = Q.get('from') || '';
  var RET_NAME = { budget: 'Бюджет', interior: 'Интерьер', my: 'Мой ремонт' };
  var RET_DEF = { budget: 'scout.html', interior: 'interior.html', my: 'my.html?v=object' };
  var PAGE_NAME = { 'scout.html': 'Бюджет', 'interior.html': 'Интерьер', 'my.html': 'Мой ремонт' };
  /* только своя страница вида «имя.html?…» — та же проверка, что safeReturn в capsules.js; в сам скан и в рамку телефона не возвращаем */
  function safeReturn(rt) { return (rt && /^[a-z0-9_-]+\.html(\?[a-z0-9_=&%.+-]*)?$/i.test(rt) && !/^(plan-demo|phone)\.html/i.test(rt)) ? rt : null; }
  var RET_TO = safeReturn(Q.get('returnTo')) || RET_DEF[FROM] || null;
  var RET_LABEL = RET_NAME[FROM] || (RET_TO && PAGE_NAME[RET_TO.split('?')[0]]) || '';
  var SCAN_MARK = 'sove.plan.scanRet', SCANNED_KEY = 'sove.plan.scanned';
  function readMark() { try { return JSON.parse(sessionStorage.getItem(SCAN_MARK) || 'null'); } catch (e) { return null; } }
  var NAV = (window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var MARK = readMark();
  var SCAN_Q = Q.get('scan') || '';
  var RET = (SCAN_Q === '1' || SCAN_Q === '2') && !!RET_TO;
  /* скан из Бюджета (Алина 10.11): человек остаётся в Бюджете — шапка «Бюджет», полоса его шагов (шаг 1 из 3), вместо 3D и зон —
     то, что влияет на расчёт: общая площадь, помещения, санузлы; названия, типы и площади можно поправить */
  var BUD = RET && FROM === 'budget';
  var SCAN_START = RET && SCAN_Q === '1' && !/^(reload|back_forward)$/.test(NAV.type || '');
  /* поиск ЖК из другого блока (окно загрузки «Нет плана — найти ЖК ›» на входах my и interior): plan-demo.html?from=<блок>&zk=1&returnTo=…
     Сверху поиск, выбранная планировка одной записью ложится планом с комнатами в объект — и назад в блок (scanned=1, тост там) */
  var ZKRET = !RET && Q.get('zk') === '1' && !!RET_NAME[FROM] && !!RET_TO;

  /* без «‹ Шаг назад»: на первом экране и на вопросах, открытых сразу по ссылке (?replan=1 / ?tune=1, st.entry) — предыдущего шага нет */
  function noStep(h) { return h.replace(/<button[^>]*data-pz-step[^>]*>[^<]*<\/button>/, ''); }
  function head() {
    var h = FLOW.blockHead(KIND, STEP[st.view] || 'plan');
    /* скан — два шага (план · проверка), токены здесь не тратятся — плашки токенов нет; на первом шаге «Шаг назад» = «← Назад» */
    if (BUD) return noStep(h.replace(/<div class="pz-bar"[\s\S]*?<\/div>/, budBar()).replace(/<a class="pz-tok"[\s\S]*?<\/a>/, '').replace('>Планировка</h1>', '>Бюджет</h1>'));
    if (RET) { h = h.replace(/<div class="pz-bar"[\s\S]*?<\/div>/, scanBar(st.view === 'rooms' ? 2 : 1)).replace(/<a class="pz-tok"[\s\S]*?<\/a>/, ''); return st.view === 'scan' ? noStep(h) : h; }
    /* поиск ЖК из блока — побочный заход: без полосы шагов и токенов; «Шаг назад» — только со списка планировок к поиску */
    if (ZKRET) { h = h.replace(/<div class="pz-bar"[\s\S]*?<\/div>/, '').replace(/<a class="pz-tok"[\s\S]*?<\/a>/, ''); return st.view === 'zk' ? h : noStep(h); }
    return st.view === 'brief' && st.entry ? noStep(h) : h;
  }
  function budBar() {
    return '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><span class="pz-bar__i is-now"></span><span class="pz-bar__i"></span><span class="pz-bar__i"></span><small>шаг 1 из 3</small></div>';
  }
  function scanBar(step) {
    for (var i = 1, bars = ''; i <= 2; i++) bars += '<span class="pz-bar__i' + (i < step ? ' is-done' : i === step ? ' is-now' : '') + '"></span>';
    return '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="2" aria-valuenow="' + step + '">' + bars + '<small>шаг ' + step + ' из 2</small></div>';
  }
  function title(t, sub) { return '<div class="pz-title"><h2>' + esc(t) + '</h2>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>'; }
  function flatName() { return st.live ? (st.fileName || 'твой план') : st.typical ? 'типовой план · ' + F.area(st.typical.m2) : RET && st.fileName ? st.fileName : 'ЖК PRIDE · 47,0 м²'; }   /* пример — площадь по комнатам (решение 02.11) */
  /* имя файла в подзаголовке и в тексте: длинное (без пробелов оно не переносится и уходит за край) — середина
     многоточием, начало, конец и расширение на месте: «Планировка_квартиры…финальный_v7.png». Полное имя — на плашке файла */
  var FILE_MAX = 36;
  function fileLabel(n) {
    var s = String(n || ''), a = Array.from(s);         /* по символам: эмодзи в имени не рвём пополам */
    if (a.length <= FILE_MAX) return s;
    var ext = (/\.[a-z0-9]{1,5}$/i.exec(s) || [''])[0];
    var base = a.slice(0, a.length - ext.length), keep = FILE_MAX - ext.length - 1, head = Math.ceil(keep * 0.6);
    return base.slice(0, head).join('').replace(/[\s_.·-]+$/, '') + '…' + base.slice(base.length - (keep - head)).join('').replace(/^[\s_.·-]+/, '') + ext;
  }

  /* ── Первый экран — макет Вики 28.10: «← Назад» и токены плашкой, «Планировка», блок «Что вы получите»
     (План → 3D интерьер → Бюджет), цветной пример с ценниками и бюджетом, «Загрузить план»,
     «Найди свой план у застройщика» (база — assets/js/kb/zk.js). Полосы шагов здесь нет: шаг 1 начинается с загрузки ── */
  var CAT = window.SOVE_ARRANGE_CATALOG || {};
  function plural(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }
  function mln(v) { return v === null || v === undefined ? '[сумма]' : (Math.round(v / 1e5) / 10).toFixed(1).replace('.', ','); }
  function headNoBar() { return head().replace(/<div class="pz-bar"[\s\S]*?<\/div>/, ''); }
  /* шапка первого экрана (Вика 28.10): на фоне страницы, без белой полосы; токены — плашкой. На шагах шапка прежняя */
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
  /* has — план уже в объекте: не просим загрузить его снова */
  function gets(has) {
    return '<section class="pz-gets" aria-label="Что вы получите"><b class="pz-gets__k">Что вы получите</b>' +
      '<p class="pz-gets__s">' + (has ? 'По этому плану до минуты получите:' : 'Загрузите план — и до минуты получите:') + '</p><div class="pz-gets__row">' +
      GETS.map(function (g, i) {
        return (i ? '<em class="pz-gets__ar">' + ICO.arrow + '</em>' : '') +
          '<div class="pz-gets__i"><i>' + ICO[g.ic] + '</i><span><b>' + esc(g.t) + '</b><small>' + esc(g.d) + '</small></span></div>';
      }).join('') + '</div></section>';
  }
  /* пример — ЖК PRIDE 2-комн (47,0 м² по комнатам; в базе ЖК — 47,3) + «Изумрудная неоклассика»; бюджет считает Расчёт бюджета (SOVE_ZK.budgetExample) */
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
      /* только итог: разбивка «мебель · материалы · работы» из примера не совпадала с суммами по ходу Планировки (сверка 02.11) */
      '<div class="pz-hero__bud"><span><b>Ремонт под ключ</b><em>пример расчёта, ваша сумма — по плану</em></span>' +
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
  /* поиск ЖК: под кнопкой загрузки (макет Вики 28.10) или сверху — в поиске ЖК из другого блока (bare: без «ИЛИ …») */
  function zkSearch(bare) {
    if (!bare && S.planUpload && S.planUpload.zkSoon) return S.planUpload.zkSoon();   /* пока «скоро» (Алина 10.11) — та же полоса, что в Бюджете */
    return (bare ? '' : '<b class="pz-or">ИЛИ НАЙДИ СВОЙ ПЛАН У ЗАСТРОЙЩИКА</b>') +
      '<form class="pz-zks" id="pd-zks" role="search">' + ICO.search + '<input id="pd-zkq" type="search" placeholder="ЖК, застройщик или адрес" autocomplete="off" aria-label="ЖК, застройщик или адрес" value="' + esc(st.zkQ || '') + '"></form>' +
      '<div id="pd-zkres" aria-live="polite">' + zkResults() + '</div>';
  }
  /* ЖК не нашёлся: загрузить план (общее окно) или «Плана нет» — типовой по площади; в поиске из блока — назад в блок.
     Кнопки списка — data-zk-act: список перерисовывается без общей перерисовки, их слушает zkBind */
  /* данные ЖК: заглушка базы («[застройщик]», «[этажи]») или пусто — не показываем (данных нет — не выдумываем и не светим скобки) */
  function real(v) { var s = String(v === null || v === undefined ? '' : v).trim(); return !!s && !/^\[[^\]]*\]$/.test(s); }
  function zkLine(parts) { return parts.filter(real).join(' · '); }
  function zkResults() {
    if (!ZK || (st.zkQ || '').trim().length < 2) return '';
    /* ЖК-заглушки базы («[ЖК 2]») в поиске не показываем — их заменят настоящие ЖК */
    var r = ZK.search(st.zkQ).filter(function (z) { return real(z.name); });
    if (!r.length) return '<section class="pz-card pz-zkno"><b>Такого ЖК пока нет</b>' + (ZKRET
      ? '<button type="button" class="pz-link pz-link--left" data-zk-act="leave">' + esc('Вернуться в ' + RET_LABEL) + ' ›</button>'
      : '<button type="button" class="pz-link pz-link--left" data-zk-act="upload">Загрузи план — добавим ЖК ›</button>' +
        '<button type="button" class="pz-link pz-link--left" data-zk-act="noplan">Плана нет — соберём типовой по площади ›</button>') + '</section>';
    return '<div class="pz-zklist">' + r.map(function (z) {
      var n = z.layouts.filter(ZK.ready).length;
      var sub = zkLine([z.developer, z.city, z.address]);
      return '<button type="button" class="pz-zkrow" data-zk="' + esc(z.id) + '"><span><b>' + esc(z.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
        '<em>' + (n ? n + ' в 3D' : 'скоро в 3D') + ' ›</em></button>';
    }).join('') + '</div>';
  }
  /* порядок по макету Вики 28.10: шапка → «Что вы получите» → пример с бюджетом → «Загрузить план» → поиск ЖК, ниже сразу
     полоса Корзина · Избранное · Бюджет. «Загрузить план» открывает общее окно (план застройщика, обмерный, пример ЖК PRIDE,
     «Нет плана — найти ЖК»); отдельной страницы загрузки больше нет. План уже в объекте — сверху его карточка с одним
     главным действием, кнопки загрузки нет (ничего не спрашиваем дважды). Скрытое поле — запасной путь без окна */
  function viewIdle() {
    if (ZKRET) return viewZkRet();
    var p = objPlan();
    return startHead() + (p ? planCard(p) : '') + gets(!!p) + hero(example()) +
      (p ? '' : '<button type="button" class="pz-btn pz-btn--up" data-act="upload">' + ICO.up + 'Загрузить план</button>') +
      zkSearch() + '<input type="file" id="pd-file" data-plan-file accept="' + FILE_ACCEPT + '" hidden>';
  }
  /* поиск ЖК из другого блока: поиск сверху, выбранная планировка — в объект и назад в блок */
  function viewZkRet() {
    return head() + title('Найди свой план у застройщика', 'выбери планировку — вернём в «' + RET_LABEL + '»') + zkSearch(true) +
      '<button type="button" class="pz-link" data-act="leave">' + esc('Вернуться в ' + RET_LABEL) + '</button>';
  }
  /* ── план уже в объекте (Мой ремонт): что это за план и одно главное действие по его виду ──
     zk — планировка ЖК; sample — пример ЖК PRIDE с комнатами; markup — свой план, прочитанный в Планировке (разметка в объекте);
     rooms — комнаты без геометрии (3D примерное, по площадям); image — картинка без комнат; pdf — ни картинки, ни комнат */
  function objPlanKind(p) {
    if (!p) return null;
    var n = (p.rooms || []).length, x = p.zk && p.zk.layout && ZK ? ZK.layout(p.zk.layout) : null;
    if (n && x && ZK.ready(x.layout)) return 'zk';
    if (isSamplePlan(p)) return n ? 'sample' : 'image';
    if (n && p.markup && p.markup.res && p.img) return 'markup';
    if (n) return 'rooms';
    return p.img ? 'image' : 'pdf';
  }
  /* прочитан ли этот план в этой вкладке (запись чтения того же файла) — тогда «Проверить комнаты» без нового запроса.
     Пример ЖК PRIDE — прочитан ли он в этой вкладке (st.sampleDone, запись sove.plan.sampleBack): «Шаг назад» с «Проверь план»
     не превращает его снова в «комнаты не распознаны» */
  function readyRead(p) {
    if (!p) return false;
    if (isSamplePlan(p)) return !RET && !!st.sampleDone;
    if (st.live && st.live.res && st.live.res.method !== 'flats' && st.fileName === p.file) return true;
    var lb = readLiveBack();
    return !!(lb && lb.res && lb.res.method !== 'flats' && lb.file === (p.file || '') && (lb.size || 0) === (p.size || 0) && (lb.img || lb.kind !== 'image'));
  }
  function reuseRead(p) {
    if (!readyRead(p) || isSamplePlan(p)) return false;
    if (st.live && st.live.res && st.fileName === p.file) { st.view = 'rooms'; return true; }
    var lb = readLiveBack();
    if (restoreLiveView(Object.assign({}, lb, { view: 'rooms' }))) { st.fileSize = lb.size || 0; return true; }
    return false;
  }
  /* картинка плана в объекте — сам план (файл из окна загрузки, прочитанная копия), а не снимок 3D с мебелью: его кладёт
     сохранение расстановки, когда своей картинки у плана не было (типовой план, PDF, «Сохранить» без файла) — такой не распознаём */
  function planPicture(p) {
    if (!p || !p.img || !p.file || p.level === 'none') return false;
    if (p.historyId) {
      try {
        var h = JSON.parse(localStorage.getItem('sove.plan.history') || '{}') || {}, hit = null;
        Object.keys(h).forEach(function (k) { (Array.isArray(h[k]) ? h[k] : []).forEach(function (x) { if (x && x.id === p.historyId) hit = x; }); });
        if (hit && hit.planImg && hit.planImg === p.img) return false;
      } catch (e) {}
    }
    return true;
  }
  /* основа плана словами: у типового плана по площади («Плана нет», уровень none — в repair.js «Без плана») — «Типовой план» */
  function levelTitle(p) { return p && p.level === 'none' ? 'Типовой план' : (S.repair.LEVEL[p && p.level] || 'План'); }
  function planCard(p) {
    var k = objPlanKind(p), n = (p.rooms || []).length, m2 = planM2(p);
    var line = [p.file ? fileLabel(p.file) : '', n ? n + ' ' + plural(n, 'комната', 'комнаты', 'комнат') : readyRead(p) ? 'комнаты найдены — проверь' : 'комнаты не распознаны', m2 ? F.area(m2) : ''].filter(Boolean).join(' · ');
    function btn(act, t) { return '<button type="button" class="pz-btn" data-act="' + act + '">' + esc(t) + '</button>'; }
    function link(act, t) { return '<button type="button" class="pz-link" data-act="' + act + '">' + esc(t) + '</button>'; }
    var main, more = '';
    if (k === 'image') main = readyRead(p) ? btn('to-rooms', 'Проверить комнаты') : isSamplePlan(p) ? btn('scan-plan', 'Распознать комнаты')
      : btn('scan-plan', 'Распознать комнаты') + '<small class="pz-note pz-c">обычно до минуты</small>';
    else if (k === 'pdf') main = '<p class="pz-has__note">Картинки плана нет — комнаты по нему не прочитать. Загрузи JPG или PNG, подойдёт скриншот листа.</p>' + btn('upload', 'Загрузить план');
    else { main = btn('use-plan', 'Продолжить с этим планом'); if (k === 'markup' || k === 'sample') more = link('see-plan', 'Посмотреть план'); }
    /* комнаты без разметки: расстановка — примерная (как у типового плана), вопросы — по площадям этих комнат. Картинка самого
       плана в объекте есть (например, разметка скана не поместилась в память) — распознаём её же, второй раз план не просим */
    if (k === 'rooms' && planPicture(p)) {
      main = '<p class="pz-has__note">Комнаты есть, а разметки плана нет — мебель расставим примерно, по площадям комнат. Для точной расстановки распознаем комнаты по этой картинке.</p>' + main;
      more = link('scan-plan', 'Распознать комнаты по этой картинке');
    } else if (k === 'rooms') main = '<p class="pz-has__note">Картинки плана с разметкой нет — мебель расставим примерно, по площадям комнат. Для точной расстановки загрузи план.</p>' + main;
    return '<section class="pz-card pz-has" aria-label="План в Моём ремонте"><div class="pz-has__row">' +
      '<span class="pz-has__pic"' + (p.img ? ' style="background-image:url(\'' + esc(p.img) + '\')"' : '') + '>' + (p.img ? '' : '<i>' + esc((/\.([a-z0-9]{2,5})$/i.exec(p.file || '') || [0, 'план'])[1].toUpperCase()) + '</i>') + '</span>' +
      '<span class="pz-has__t"><b><i aria-hidden="true">✓</i> ' + esc(levelTitle(p) + ' уже в Моём ремонте') + '</b><small>' + esc(line) + '</small></span></div>' +
      main + '<div class="pz-has__links">' + more + (k === 'pdf' ? '' : link('upload', 'Заменить план')) + '</div></section>';
  }
  /* ── общее окно загрузки (договор, п. 3): вход 'plan', карточки «План застройщика» и «Обмерный», пример ЖК PRIDE,
     «Нет плана — найти ЖК» (поиск на этой странице). Файл плана в объект пишет окно (с вопросом «Заменить план?», если там
     комнаты), сюда приходит исходный файл — то же чтение, что всегда. Окна нет (скрипт не загрузился) — скрытое поле файла */
  function openUpload() {
    var U = S.planUpload, p = objPlan();
    if (!U || !U.open) { var inp = document.getElementById('pd-file'); if (inp) inp.click(); else { st.view = 'idle'; render(); } return; }
    /* toast:false — о сохранении комнат Планировка скажет сама после «Всё верно» (тост окна закрывал плашку на «Проверь план»);
       replace — план в объекте уже есть, окно открыто «Заменить план». Оба — подсказки окну (WP0), без них всё работает как раньше */
    U.open({ entry: 'plan', cards: PU_CARDS, level: p && PU_CARDS.indexOf(p.level) >= 0 ? p.level : SRC_LEVEL[st.source] || 'developer_plan', onDone: uploaded, onNoPlan: toZk,
      toast: false, replace: !!p });
  }
  function uploaded(res) {
    if (!res) return;
    st.errKind = null; stopCountdown(); st.typical = null;
    if (res.level && LEVEL_SRC[res.level]) st.source = LEVEL_SRC[res.level];
    if (res.demo) { startSample(); return; }             /* пример: окно положило его план без комнат, комнаты даст «Проверь план» */
    var p = objPlan(), f = !res.use && res.files && res.files[0];
    if (f) {
      if (res.same && p && reuseRead(p)) { render(); window.scrollTo(0, 0); return; }   /* тот же файл уже прочитан — без нового запроса */
      /* тот же файл, его разметка уже в объекте (прочитан раньше или в другой вкладке) — «Проверь план» по ней, без платного чтения */
      if (res.same && p && objPlanKind(p) === 'markup' && liveFromPlan(p)) {
        st.fileSize = p.size || 0; st.source = LEVEL_SRC[p.level] || st.source; st.view = 'rooms'; keepLive({ view: 'rooms' }); render(); window.scrollTo(0, 0); return;
      }
      acceptPlanFile(f); return;
    }
    if (!p) { st.view = 'idle'; render(); return; }
    usePlan(p, !!res.scan);
  }
  /* «Взять этот план» (окно) и «Распознать комнаты»: картинка без комнат — чтение (пример — без API), PDF — просим картинку, с комнатами — дальше */
  function usePlan(p, scan) {
    var k = objPlanKind(p);
    if (k === 'image' || (scan && p.img)) {
      if (isSamplePlan(p)) { startSample(); return; }
      if (reuseRead(p)) { render(); window.scrollTo(0, 0); return; }
      readObjPlan(p); return;
    }
    if (k === 'pdf') { st.view = 'idle'; render(); S.ui.toast('Нужна картинка плана — JPG или PNG'); return; }
    continuePlan(p);
  }
  /* «Продолжить с этим планом»: комнаты уже проверены — сразу к вопросам; планировка ЖК — сразу мебель (18.2) */
  function continuePlan(p) {
    var k = objPlanKind(p); if (!k) return;
    if (k === 'image' || k === 'pdf') { usePlan(p); return; }
    if (k === 'zk') { pickLayout(p.zk.layout, true); return; }
    freshPlan();
    if (k === 'markup') { if (!liveFromPlan(p)) { st.view = 'idle'; render(); return; } st.fileSize = p.size || 0; }
    else if (k === 'sample') { resetLive(); st.typical = null; st.geo = null; st.fileName = null; st.names = namesOf(p); st.sampleDone = true; }
    else { resetLive(); st.geo = null; st.typical = { m2: planM2(p), rooms: p.rooms.map(function (r) { return { name: r.name, m2: +r.m2 > 0 ? +r.m2 : 0 }; }), obj: true }; }
    st.source = LEVEL_SRC[p.level] || 'developer';
    toBrief();
  }
  /* «Посмотреть план» — «Проверь план» по сохранённому: свой — по разметке из объекта, пример — без анимации чтения */
  function seePlan(p) {
    var k = objPlanKind(p);
    if (k === 'markup') { if (!liveFromPlan(p)) return; st.fileSize = p.size || 0; }
    else if (k === 'sample') { resetLive(); st.typical = null; st.geo = null; st.fileName = null; st.names = namesOf(p); st.sampleDone = true; }
    else return;
    st.source = LEVEL_SRC[p.level] || 'developer'; st.view = 'rooms'; render(); window.scrollTo(0, 0);
  }
  /* исправленные названия комнат примера — по порядку (комнаты примера в объекте в том же порядке, что SAMPLE_ROOMS) */
  function namesOf(p) {
    var rs = (p && p.rooms) || [], out = null;
    if (rs.length !== SAMPLE_ROOMS.length) return null;
    rs.forEach(function (r, i) { if (r.name && r.name !== SAMPLE_ROOMS[i].name) (out = out || {})[i] = r.name; });
    return out;
  }
  /* новый заход в сценарий своим планом или примером — не планировка ЖК; перепланировка — только если пришли за ней */
  function freshPlan() { if (RET || ZKRET) return; FLOW.save({ zk: null }); if (!/replan=1/.test(location.search)) FLOW.setReplan(false); }
  /* «Нет плана — найти ЖК ›» в окне: поиск на этой же странице */
  function toZk() {
    st.view = 'idle'; render();
    var q = document.getElementById('pd-zkq'); if (!q) return;
    q.scrollIntoView({ block: 'center' }); try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); }
  }

  /* ── Скан, шаг 1 из 2: план в объекте и одно главное действие. Сюда попадаем, когда читать сразу нечего (плана нет,
     файл сохранён только по имени — PDF или HEIC, картинка не открылась), после «Отменить» / «‹ Шаг назад» и когда комнаты уже есть ── */
  function scanNote(t, sub) { return '<section class="pz-card" role="status"><b>' + esc(t) + '</b>' + (sub ? '<p class="pz-note">' + esc(sub) + '</p>' : '') + '</section>'; }
  function scanPic(p) {
    var ext = (/\.([a-z0-9]+)$/i.exec(p.file || '') || [0, p.img ? 'план' : 'файл'])[1].toUpperCase();
    return (p.img ? '<div class="pz-np"><img src="' + esc(p.img) + '" alt="План квартиры"></div>' : '') +
      '<div class="pz-pdf"><i>' + esc(ext) + '</i><span><b>' + esc(p.file || 'План квартиры') + '</b><small>' + esc(levelTitle(p) + ' · в Моём ремонте') + '</small></span></div>';
  }
  function viewScan() {
    var p = objPlan(), back = RET_LABEL ? 'Вернуться в ' + RET_LABEL : 'Вернуться';
    var h = head() + title('Распознаём комнаты', RET_LABEL ? 'потом вернём в ' + RET_LABEL : '');
    var leave = '<button type="button" class="pz-link" data-act="leave">Вернуться без комнат</button>';
    /* другой файл плана — через общее окно загрузки (договор, п. 3: файл плана в объект пишет только оно), читаем здесь же */
    function pick(t) { return '<button type="button" class="pz-btn" data-act="scan-upload">' + esc(t || 'Загрузить картинку плана') + '</button>'; }
    if (!p) return h + scanNote('В Моём ремонте пока нет плана', 'Загрузи план — найдём комнаты и вернём в «' + (RET_LABEL || 'блок') + '». Есть и пример ЖК PRIDE.') +
      pick('Загрузить план') + '<button type="button" class="pz-link" data-act="leave">' + esc(back) + '</button>';
    var sample = isSamplePlan(p), n = (p.rooms || []).length;
    /* уже прочитали на этой странице (или открыли по сохранённой разметке) — к проверке без нового запроса */
    var ready = st.live ? !!(st.live.res && st.live.res.method !== 'flats' && liveRooms().length) : sample && st.sampleDone;
    if (st.scanMsg === 'broken') return h + scanPic(p) + scanNote('Картинка плана не открылась', 'Загрузи её ещё раз — JPG или PNG.') + pick() + leave;
    /* комнаты уже есть, проверять нечего — возвращаемся без записи: ничего не меняли, тоста «сохранены» в блоке не будет */
    if (!sample && n && !ready) return h + scanPic(p) + scanNote('Комнаты уже в Моём ремонте', n + ' ' + plural(n, 'комната', 'комнаты', 'комнат') + (planM2(p) ? ' · ' + F.area(planM2(p)) : '') + ' — их и возьмём.') +
      '<button type="button" class="pz-btn" data-act="leave">' + esc(back) + '</button>' + (p.img ? '<button type="button" class="pz-link" data-act="rescan">Распознать заново</button>' : '');
    /* без картинки: формат — по расширению (PDF, HEIC — окно не сделало из него картинку), без расширения — просто «файл» */
    if (!sample && !p.img && !ready) {
      var fmt = (/\.([a-z0-9]{2,5})$/i.exec(p.file || '') || [0, ''])[1].toUpperCase();
      return h + scanPic(p) + scanNote('Нужна картинка плана — JPG или PNG', (fmt === 'PDF' ? 'PDF' : fmt ? 'Файл ' + fmt : 'Файл') +
        ' сохранён только по имени, по нему комнаты не прочитать. Подойдёт скриншот листа или фото плана сверху.') + pick() + leave;
    }
    /* план с картинкой (или пример): распознать или, если уже прочитан, проверить */
    return h + scanPic(p) + (ready ? scanNote('Комнаты распознаны', 'Проверь названия и площади — и вернёмся в «' + (RET_LABEL || 'блок') + '».') +
        '<button type="button" class="pz-btn" data-act="to-rooms">Проверить комнаты</button>'
      : scanNote('Комнаты ещё не распознаны', 'Найдём комнаты и площади на этом плане — проверишь и вернёшься в «' + (RET_LABEL || 'блок') + '».') +
        '<button type="button" class="pz-btn" data-act="scan-plan">Распознать комнаты</button>' + (sample ? '' : '<small class="pz-note pz-c">обычно до минуты</small>')) + leave;
  }

  /* ── ЖК → его планировки (18.2) ── */
  function viewZk() {
    var z = ZK && ZK.get(st.zk); if (!z) { st.view = 'idle'; return viewIdle(); }
    var n = z.layouts.filter(ZK.ready).length;
    /* планировка без типа (заглушка базы) — не карточка, а ничего: тип и площадь даст команда; с типом, но без разметки — «скоро в 3D» */
    var lays = z.layouts.filter(function (l) { return ZK.ready(l) || real(l.type); });
    var where = zkLine([z.city, z.address]);
    return (ZKRET ? head() : headNoBar()) + '<button type="button" class="pz-link pz-link--left" data-act="to-search">← К поиску</button>' +
      title(z.name, (where ? where + ' · ' : '') + n + ' ' + plural(n, 'планировка', 'планировки', 'планировок') + ' уже в 3D') +
      '<div class="pz-zklays">' + lays.map(function (l) {
        var ok = ZK.ready(l), mk = ok && ZK.markupOf(l), m2 = mk ? layoutM2(l, zkRooms(mk)) : l.m2;   /* та же площадь, что дальше в плане и тосте */
        /* этажи и число квартир — только настоящие; нет — строку не пишем */
        var meta = [real(l.floors) ? 'этажи ' + l.floors : '', l.count ? l.count + ' квартир' : ''].filter(Boolean).join(' · ');
        return '<button type="button" class="pz-zklay' + (ok ? '' : ' is-off') + '"' + (ok ? ' data-zl="' + esc(l.id) + '"' : ' disabled') + '>' +
          '<span class="pz-zklay__img"' + (l.planImg ? ' style="background-image:url(' + esc(l.planImg) + ')"' : '') + '></span>' +
          '<span class="pz-zklay__t"><b>' + esc((real(l.type) ? l.type : 'Планировка') + (m2 ? ' · ' + F.area(m2) : '')) + '</b>' +
          (meta ? '<small>' + esc(meta) + '</small>' : '') +
          '<em' + (ok ? '' : ' class="is-off"') + '>' + (ok ? '✓ готово в 3D с мебелью' : 'скоро в 3D') + '</em></span>' + (ok ? '<i>›</i>' : '') + '</button>';
      }).join('') + '</div>' +
      (ZKRET ? '<button type="button" class="pz-note pz-c pz-zkadd" data-act="leave">Нет твоей планировки? <u>' + esc('Вернуться в ' + RET_LABEL) + ' ›</u></button>'
        : '<button type="button" class="pz-note pz-c pz-zkadd" data-act="upload">Нет твоей планировки? <u>Загрузи план ›</u> — добавим её в ЖК для всех соседей</button>');
  }
  /* выбрал планировку → сразу 3D с мебелью, без загрузки, сканера и «Проверь план» (18.2). Планировка ЖК — план квартиры:
     в объект одной записью (комнаты пишет только Планировка); там другой план с комнатами — сначала «Заменить план?».
     inObj — план уже в объекте («Продолжить с этим планом»). Поиск из другого блока — запись и назад в блок */
  function zkRooms(m) {
    return (m.rooms || []).filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
  }
  function pickLayout(id, inObj) {
    var x = ZK.layout(id); if (!x || !ZK.ready(x.layout)) return;
    var z = x.zk, l = x.layout, rooms = zkRooms(ZK.markupOf(l));
    if (inObj) { openLayout(z, l, rooms); return; }
    /* не записали («Оставить прежний» в «Заменить план?» или память демо переполнена) — остаёмся на списке планировок:
       дальше идём только с планом, который лежит в объекте */
    writeZk(z, l, rooms, function (written) {
      if (!written) return;
      if (ZKRET) { finishZk(); return; }
      openLayout(z, l, rooms);
    });
  }
  function writeZk(z, l, rooms, then) {
    var R = S.repair; if (!R) { then(false); return; }
    var cur = objPlan();
    if (cur && cur.zk && cur.zk.layout === l.id && (cur.rooms || []).length) { then(true); return; }   /* уже этот план — второй раз не пишем */
    var data = { level: 'developer_plan', file: z.name + ' · ' + l.type, size: 0, img: l.planImg || null, jk: z.name, zk: { id: z.id, layout: l.id },
      rooms: rooms.map(function (r) { return { name: r.name, m2: +r.m2 > 0 ? Math.round(r.m2 * 10) / 10 : null, type: FLOW.typeFromName(r.name) || null }; }),
      source: RET_NAME[FROM] ? FROM : 'plan' };
    function put() {
      R.save('plan', data, { force: true, silent: true });
      var ok = planStored();
      if (!ok) S.ui.toast('Память демо переполнена — план не сохранился. Удали загруженные файлы в «Мой ремонт» или очисти данные сайта.');
      then(ok);
    }
    if (cur && (cur.rooms || []).length && !isSamplePlan(cur)) { askReplace(cur, 'планировкой «' + z.name + ' · ' + l.type + '»', put, function () { then(false); }); return; }
    put();
  }
  /* площадь планировки ЖК — сумма её комнат, как у плана в объекте и полоски объекта (пример PRIDE — 47,0 м², решение 02.11);
     комнат нет — площадь из базы ЖК */
  function layoutM2(l, rooms) {
    var s = Math.round((rooms || []).reduce(function (a, r) { return a + (+r.m2 || 0); }, 0) * 10) / 10;
    return s > 0 ? s : l.m2;
  }
  function openLayout(z, l, rooms) {
    var m2 = layoutM2(l, rooms);
    /* состояние квартиры: паспорт объекта; там пусто — как сдаёт ЖК («без отделки» → «Бетон, стены стоят»), и оно же — в паспорт:
       с ним считаем бюджет на экране мебели, Бюджет не спросит «Что сейчас в квартире?» второй раз */
    var R = S.repair, f = R && R.flats.active(), zs = ZK.FINISH_STATE[z.finish] || null, fs = f && knownState(f.state) ? f.state : null;
    if (!fs && f && knownState(zs)) R.flats.update(f.id, { state: zs });
    FLOW.save({ zk: { id: z.id, layout: l.id, name: z.name, type: l.type, m2: m2 }, zkFound: true, source: 'developer', accuracy: ACCURACY.developer,
      state: fs || zs, flat: z.name + ' · ' + F.area(m2), rooms: rooms, typical: false, live: null,
      answers: {}, picks: {}, brief: null, wallVariant: null, layoutHints: null, plan: 0, step: 5 });
    /* планировка из конвейера zk-admin — своя разметка и расстановка, экран мебели открываем как для своего плана */
    var own = l.layout !== 'arrange';
    if (own) FLOW.save({ live: { layout: l.layout, not_placed: l.notPlaced || [], ready: true, flat: z.name + ' · ' + l.type + ' · ' + F.area(m2), labeled: null, name: 'zk:' + l.id, key: 'zk:' + l.id } });
    FLOW.save({ backTo: 'zk' });                     /* «← Назад» с экрана мебели вернёт к планировкам этого ЖК */
    st.zk = z.id; st.placingFrom = 'zk'; st.view = 'placing'; render();
    var seq = st.seq;
    setTimeout(function () { if (seq !== st.seq) return; location.href = 'arrange.html?v=panel&plan=0&flow=1&anim=1' + (own ? '&live=1' : ''); }, 700);
  }
  /* поиск ЖК из блока: план с комнатами в объекте — сигнал блоку (тост покажет он) и назад без записи в истории */
  function finishZk() {
    var p = objPlan(), n = ((p && p.rooms) || []).length;
    try { sessionStorage.setItem(SCANNED_KEY, JSON.stringify({ entry: FROM || null, from: FROM || null, ts: Date.now(), rooms: n, n: n, m2: planM2(p), file: (p && p.file) || '' })); } catch (e) {}
    location.replace(withScanned(RET_TO));
  }
  /* в объекте другой план с комнатами — заменить только с согласия (как в окне загрузки) */
  function askReplace(cur, what, yes, no) {
    var n = (cur.rooms || []).length, m2 = planM2(cur);
    S.ui.modal({ title: 'Заменить план в Моём ремонте?',
      text: 'Там уже «' + fileLabel(cur.file || 'план') + '» · ' + n + ' ' + plural(n, 'комната', 'комнаты', 'комнат') + (m2 ? ' · ' + F.area(m2) : '') +
        '. Заменить его ' + what + '? Прежний план и его комнаты уйдут.',
      actions: [{ label: 'Заменить план', kind: 'primary', onClick: yes }, { label: 'Оставить прежний', kind: 'ghost', onClick: no }] });
  }

  /* «Плана нет»: площадь и число комнат → типовой план → сразу вопросы */
  function viewNoplan() {
    return head() + title('Плана нет — соберём типовой', 'площадь и комнаты · бюджет примерно') +
      '<section class="pz-card"><label class="pz-field"><b>Площадь, м²</b>' +
        '<input class="input" id="pd-m2" type="number" inputmode="decimal" min="15" max="300" placeholder="например, 47" value="' + esc(st.noplan.m2) + '"></label>' +
        '<div class="pz-q__h"><b>Комнат</b></div><div class="qs-chips">' + ['студия', '1', '2', '3', '4+'].map(function (o, i) {
          return '<button type="button" class="qs-chip' + (st.noplan.rooms === i ? ' is-on' : '') + '" data-rooms="' + i + '" aria-pressed="' + (st.noplan.rooms === i) + '">' + o + '</button>';
        }).join('') + '</div></section>' +
      '<button type="button" class="pz-btn" data-act="typical">Дальше</button>' +
      '<button type="button" class="pz-link" data-act="again">Назад</button>';
  }
  /* доли комнат нормируем к введённой площади: сумма комнат = площадь квартиры (раньше 52 м² давали 48,8 — в объект и бюджет шла чужая площадь).
     Округление до 0,1 м² — остаток в первую, самую большую комнату */
  function typicalRooms(m2, n) {
    var r = [{ name: n === 0 ? 'Комната-студия' : 'Кухня-гостиная', m2: m2 * (n === 0 ? .62 : .4) }];
    var beds = Math.min(n, 4), bedShare = n === 0 ? 0 : .34;
    for (var i = 0; i < beds; i++) r.push({ name: i === 0 ? 'Спальня' : i === 1 && n >= 3 ? 'Детская' : 'Комната ' + (i + 1), m2: m2 * bedShare / beds });
    r.push({ name: 'Санузел', m2: Math.max(3.5, m2 * .1) }, { name: 'Прихожая', m2: Math.max(3.5, m2 * .1) });
    var sum = r.reduce(function (a, x) { return a + x.m2; }, 0), k = sum > 0 ? m2 / sum : 1;
    var out = r.map(function (x) { return { name: x.name, m2: Math.round(x.m2 * k * 10) / 10 }; });
    var rest = Math.round((m2 - out.reduce(function (a, x) { return a + x.m2; }, 0)) * 10) / 10;
    if (rest) out[0].m2 = Math.round((out[0].m2 + rest) * 10) / 10;
    return out;
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
    /* скан примера — та картинка плана, что лежит в объекте (её показывало окно загрузки) */
    if (!live) pic = '<div class="pz-plan pz-plan--scan"><img src="' + esc(RET && st.scanOf && st.scanOf.img || PLAN_IMG) + '" alt=""><i class="pz-scan"></i></div>';
    else if (live.kind === 'image' && live.src) pic = '<div class="pz-plan pz-plan--scan"><img src="' + live.src + '" alt=""><i class="pz-scan"></i></div>';
    else pic = filePlate(live.kind === 'pdf' ? 'берём первый лист' : live.kind === 'raw' ? 'читаем как есть' : 'готовлю файл');
    var stages = live ? WAIT_STAGES : READ_STAGES;
    return head() + title(BUD ? 'Читаем план' : 'Читаю твой план', fileLabel(flatName())) + pic +
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
    if (st.errKind === 'place') return head() + title('Не получилось расставить мебель', fileLabel(flatName())) +
      '<section class="pz-card"><b>' + esc(st.error) + '</b><p class="pz-note">План и ответы сохранены — попробуй ещё раз.</p></section>' +
      '<button type="button" class="pz-btn" data-act="retry">Попробовать ещё раз</button>' +
      '<button type="button" class="pz-link" data-act="to-brief">Назад к вопросам</button>';
    var er = st.err || { kind: 'unknown', text: st.error || 'Не получилось прочитать план — попробуй ещё раз или возьми другой файл.', primary: 'retry' };
    var canRetry = !!(st.live && (st.live.blob || st.live.small)), wait = er.kind === 'minute' && st.cdLeft > 0;
    var hint = /^(text|unknown|format)$/.test(er.kind) ? '<p class="pz-note">Подойдёт чёткий план из договора или с сайта застройщика: стены тёмные, комнаты подписаны. ' +
      'Фото под углом и скан с тенями читаются хуже.</p>' : '';
    var retryTxt = wait ? 'Повторить через ' + st.cdLeft + ' с' : 'Повторить этот же файл';
    /* скан: пример ЖК PRIDE чужой план в объект не положит — вместо него возврат в блок без комнат */
    var B = {
      retry: canRetry ? '<button type="button" class="pz-btn' + (wait ? ' is-wait' : '') + '" data-act="retry-read"' + (wait ? ' disabled' : '') + '>' + retryTxt + '</button>' : '',
      other: '<button type="button" class="pz-btn" data-act="again">Другой файл</button>',
      sample: RET ? '<button type="button" class="pz-btn" data-act="leave">Вернуться без комнат</button>' : '<button type="button" class="pz-btn" data-act="sample">Взять пример: ЖК PRIDE, 47,0 м²</button>'
    };
    var L = {
      retry: canRetry ? '<button type="button" class="pz-link" data-act="retry-read"' + (wait ? ' disabled' : '') + '>' + retryTxt + '</button>' : '',
      other: '<button type="button" class="pz-link" data-act="again">Другой файл</button>',
      sample: RET ? '<button type="button" class="pz-link" data-act="leave">Вернуться без комнат</button>' : '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,0 м²</button>'
    };
    var main = B[er.primary] || B.other, order = ['retry', 'other', 'sample'].filter(function (k) { return k !== er.primary; });
    if (!main) { main = B.other; order = ['retry', 'sample']; }
    return head() + title('Не получилось разметить', fileLabel(st.fileName)) +
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
      if (BUD && st.m2s && st.m2s[i] > 0) o = Object.assign({}, o, { m2: st.m2s[i] });   /* площадь поправили на проверке Бюджета */
      return o;
    });
  }
  /* названия и типы из списка «Проверь план» — перед перерисовкой (3D / 2D, «Назад», поворот), чтобы исправленное не терялось */
  function collectNames() {
    var ins = root.querySelectorAll('input[data-room]'); if (!ins.length) return;
    st.names = {};
    ins.forEach(function (inp) { st.names[+inp.dataset.room] = inp.value.trim(); });
    var sels = root.querySelectorAll('select[data-type]');
    if (sels.length) { st.types = st.types || {}; sels.forEach(function (s) { st.types[+s.dataset.type] = s.value; }); }
  }
  /* проверка Бюджета: площадь помещения правят в поле — запоминаем и сразу пересчитываем сводку */
  function budFacts(rs) {
    var total = rs.reduce(function (a, r) { return a + (r.m2 || 0); }, 0), wet = rs.filter(function (r) { return /сан|ванн|туал|с\/у|wc/i.test((r.type || '') + ' ' + (r.name || '')); }).length;
    function row(k, v) { return '<div><span>' + k + '</span><b>' + v + '</b></div>'; }
    return row('Общая площадь', total.toFixed(1).replace('.', ',') + ' м²') + row('Помещений', rs.length) + row('Санузлов', wet);
  }
  root.addEventListener('input', function (e) {
    var inp = e.target; if (!BUD || !inp.matches || !inp.matches('input[data-m2]')) return;
    var v = parseFloat(String(inp.value).replace(',', '.'));
    (st.m2s = st.m2s || {})[+inp.dataset.m2] = v > 0 && v < 1000 ? Math.round(v * 10) / 10 : 0;
    var box = document.getElementById('pd-budfacts'); if (box) box.innerHTML = budFacts(rooms());
  });
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
    var sub = rs.length + ' ' + plural(rs.length, 'помещение', 'помещения', 'помещений') + ' · ' + total.toFixed(1).replace('.', ',') + ' м²' + (poor ? ' · прочитано примерно' : ' · названия можно исправить');
    /* режим «Отметить вход»: подсказка, только 2D и «Отмена» — одно действие на экране, тап по картинке */
    if (pick) return head() + title('Проверь план', sub) +
      '<div class="pz-pick" role="status"><b>Тапни по наружной стене там, где входная дверь</b><button type="button" class="pz-link" data-act="pick-cancel">Отмена</button></div>' +
      plan2dHtml(true) + '<p class="pz-note pz-c pz-pick__note">Вход поставим на ближайшую стену ближайшей комнаты</p>';
    /* скан из Бюджета: без 3D и зон — план с подписями, сводка «что влияет на расчёт» и список помещений с правкой площади */
    /* скан из Бюджета (Алина 10.11): шаг не удлиняем — под ним план с распознанными зонами, поверх всплывающее окно
       «Проверьте зоны»: что влияет на расчёт и помещения с правкой названия, типа и площади */
    if (BUD) return head() + title('План прочитан', fileLabel(flatName())) +
      plan2dHtml(false).replace(/<div class="pz-seg"[\s\S]*?<\/div>/, '') +
      '<div class="pz-sheet-back pz-sheet-back--bud"><div class="pz-sheet pz-sheet--bud" role="dialog" aria-modal="true" aria-labelledby="pd-zones-t"><i class="pz-sheet__grip"></i>' +
        '<b class="pz-sheet__t" id="pd-zones-t">Проверьте зоны</b><small class="pz-note">распознали по плану — по ним считаем бюджет; неверное исправьте</small>' +
        (q && (q.level !== 'ok' || poor) ? qualityPlate(q, poor) : '') +
        '<section class="pz-budfacts" id="pd-budfacts">' + budFacts(rs) + '</section>' +
        '<section class="pz-rooms pz-rooms--bud">' + rs.map(function (r, i) {
          return '<div><input class="input" data-room="' + i + '" value="' + esc(r.name) + '" aria-label="Название помещения">' + (st.live ? typeSelect(i, r.type) : '') +
            '<label class="pz-m2"><input class="input" data-m2="' + i + '" type="text" inputmode="decimal" maxlength="6" value="' + (r.m2 ? String(Math.round(r.m2 * 10) / 10).replace('.', ',') : '') + '" aria-label="Площадь, м²"><span>м²</span></label></div>';
        }).join('') + '</section>' +
        '<button type="button" class="pz-btn" data-act="ok">Всё верно — к вопросам</button>' +
        '<button type="button" class="pz-link" data-act="leave">Ввести площадь вручную</button>' +
      '</div></div>';
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
        return '<div><input class="input" data-room="' + i + '" value="' + esc(r.name) + '" aria-label="Название помещения">' + (st.live ? typeSelect(i, r.type) : '') +
          '<b>' + (r.m2 ? F.area(r.m2) : '— м²') + '</b></div>';
      }).join('') + '</section>' +
      /* скан: файл плана выбирали в блоке — вместо «Другой план» возврат без комнат */
      (RET ? '<button type="button" class="pz-btn" data-act="ok">' + esc(RET_LABEL ? 'Всё верно — вернуться в ' + RET_LABEL : 'Всё верно — вернуться') + '</button>' +
             '<button type="button" class="pz-link" data-act="leave">Вернуться без комнат</button>'
        /* интерьер выбран (в объекте или здесь) — его карточка, тип ремонта и «Сменить ›»; не выбран — плашка снизу */
        : (st.interior ? FLOW.interiorLine(st.interior) : '') +
          '<button type="button" class="pz-btn" data-act="ok">' + (poor ? 'Дальше — расставим примерно' : 'Всё верно') + '</button>' +
          '<button type="button" class="pz-link" data-act="again">Другой план</button>');
  }
  /* ── экран «Это не похоже на план квартиры» (422 not_a_plan) и «План есть, но комнаты не нашлись» (422 no_rooms) ── */
  function humanDetail(d) {
    var s = String(d || '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
    if (!s || !/[а-яё]/i.test(s) || /not_a_plan|no_rooms|hints|is_plan|json|http/i.test(s)) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function viewNotplan() {
    var np = st.np || {}, noRooms = np.code === 'no_rooms', l = st.live, why = humanDetail(np.detail);
    var canRetry = !!(l && (l.prep || l.small)), sample = RET ? '<button type="button" class="pz-link" data-act="leave">Вернуться без комнат</button>'
      : '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,0 м²</button>';
    var pic = l && l.src && (l.kind === 'image' || l.fromServer) ? '<div class="pz-np"><img src="' + l.src + '" alt="Загруженный файл"></div>'
      : filePlate(noRooms ? 'комнаты не нашлись' : 'не похоже на план');
    if (noRooms) return head() + title('План есть, но комнаты не нашлись', fileLabel(st.fileName)) + pic +
      '<section class="pz-card" role="alert"><b>' + esc(why || 'Стены видны, а ни одной комнаты распознать не удалось.') + '</b>' +
      '<p class="pz-note">Так бывает на бледном скане, фото под углом или плане без подписей. Чаще всего помогает повтор; если нет — план чётче: стены тёмные, комнаты подписаны.</p></section>' +
      (canRetry ? '<button type="button" class="pz-btn" data-act="retry-read">Повторить этот же файл</button><button type="button" class="pz-link" data-act="again">Другой файл</button>'
                : '<button type="button" class="pz-btn" data-act="again">Другой файл</button>') + sample;
    return head() + title('Это не похоже на план квартиры', fileLabel(st.fileName)) + pic +
      '<section class="pz-card" role="alert"><b>' + esc(why ? 'Что увидели на картинке: ' + why.charAt(0).toLowerCase() + why.slice(1) + '.' : 'Плана квартиры на картинке не нашли.') + '</b>' +
      '<ul class="pz-tips"><li>Нужен план сверху: стены, комнаты, двери.</li><li>Одна квартира, без таблиц и текста вокруг — или обрежь.</li><li>Из PDF — загрузи сам PDF, а не фото экрана.</li></ul></section>' +
      '<button type="button" class="pz-btn" data-act="again">Другой файл</button>' + sample +
      (canRetry ? '<button type="button" class="pz-link" data-act="force-plan">Это точно план — прочитать всё равно</button>' : '');
  }
  /* ── экран выбора квартиры на листе (ответ method "flats" или «Другая квартира на листе»): картинка целиком, рамки квартир кнопками ── */
  function viewFlats() {
    var sh = sheetOf(); if (!sh || !sh.flats.length) { st.view = RET ? 'scan' : 'idle'; return RET ? viewScan() : viewIdle(); }
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
  function docsState() { return !st.live && !st.typical && !FLOW.load().zk ? { k: 'concrete_walls', t: 'без отделки' } : null; }
  /* ── известное подставляем с меткой (решение 02.11; «ничего не спрашиваем дважды»). Три вопроса (решение 26.10) остаются
     обязательными; ответ, подставленный без человека, помечен: «из объекта» — из паспорта квартиры и прошлых ответов этой
     квартиры (sove.answers), «подобрано SOVEAPP» — умолчание SOVEAPP или данные застройщика. Выбрал сам — метки нет.
     Имя — «SOVEAPP», не «SOVE» (решение Вики 22.10: отдельное «SOVE» не зарегистрировано; так и «Пропустить — расставит SOVEAPP») ── */
  var FROM_TXT = { obj: 'из объекта', sove: 'подобрано SOVEAPP', zk: 'подобрано SOVEAPP · по ЖК' };
  function fromTag(k) {
    var f = st.from && st.from[k]; if (!f) return '';
    if (f === 'docs') { var d = docsState(); return d ? '<em class="pz-why">в документах: ' + esc(d.t) + '</em>' : ''; }
    return FROM_TXT[f] ? '<em class="pz-from' + (f === 'obj' ? '' : ' is-sove') + '">' + FROM_TXT[f] + '</em>' : '';
  }
  var PURPOSE_RU = { self: 'для себя', rent: 'сдавать', sale: 'продать' }, PEOPLE_RU = { '1': '1', '2': '2', '2+1': '2 + ребёнок', '3+': '3+' };
  /* прошлые ответы этой квартиры (saveAnswers); до квартиры — черновик */
  function flatAnswers() {
    var R = S.repair, f = R && R.flats.active(), all = {};
    try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {}
    var a = (f && all[f.id]) || all.draft || null;
    return a && typeof a === 'object' ? a : null;
  }
  /* пример ЖК PRIDE, который лежит в объекте (окно загрузки, «Всё верно» — Бюджет, Интерьер, Мой ремонт, Планировка), — уже план
     этой квартиры, а не чужой образец: состояние квартиры для него — из паспорта объекта и пишется туда */
  function sampleIsFlat() { return !st.live && !st.typical && !FLOW.load().zk && isSamplePlan(objPlan()); }
  /* планируем свою квартиру (свой план, типовой по площади, планировка ЖК, пример в объекте), а не просто смотрим пример —
     её состояние берём из объекта и пишем туда */
  function ownFlat() { return !!(st.live || st.typical || FLOW.load().zk) || sampleIsFlat(); }
  function knownState(k) { return STATES.some(function (x) { return x.k === k; }); }
  /* состояние квартиры из паспорта объекта — только когда планируем свою квартиру */
  function flatState() { var R = S.repair, f = R && R.flats.active(); return ownFlat() && f && knownState(f.state) ? f.state : null; }
  /* состояние — в паспорт объекта (паспорт — единственный источник: Бюджет и Мой ремонт не спросят снова). Пишем известное:
     выбранное здесь, из объекта, из документов застройщика примера, как сдаёт ЖК. Умолчание SOVEAPP («Пропустить», когда данных нет)
     не пишем — его никто не выбирал. Квартиры ещё нет («Плана нет» без объекта) — ответ создаёт черновик квартиры (repair.js:
     первое действие с данными). Пример, который только смотрим (в объекте другой план), — не эта квартира, не пишем */
  function stateToFlat() {
    var R = S.repair; if (!R || !knownState(st.state) || !ownFlat() || (st.from && st.from.state === 'sove')) return;
    var f = R.flats.active() || R.flats.ensure();
    if (f.state !== st.state) R.flats.update(f.id, { state: st.state });
  }
  /* «Что ставим» (кровать, диван, стол, кухня, санузел, стирка), выбранные человеком, — из ответов этой квартиры (picks):
     повторный вход и перезагрузка их не теряют. Умолчания по плану не храним — они пересчитываются по ответам «О квартире» */
  function prefillBrief() {
    var R = S.repair, f = R && R.flats.active(), a = flatAnswers(), by = st.byUser || (st.byUser = {}), from = st.from = {}, fl = FLOW.load(), own = ownFlat();
    /* auto — какие ответы в прошлый раз подставил SOVEAPP, а не выбрал человек: метка снова «подобрано», а не «из объекта» */
    var auto = a && a.auto && typeof a.auto === 'object' ? a.auto : {};
    if (!by.state) {
      /* своя квартира: паспорт объекта (выбрано в Бюджете, Моём ремонте, здесь), иначе прошлый ответ этой квартиры (до квартиры —
         черновик ответов), иначе как сдаёт ЖК; документы застройщика примера — только когда состояния у квартиры нет */
      var fs = own && f && knownState(f.state) ? f.state : null, as = own && !fs && a && knownState(a.state) ? a.state : null;
      var zs = fl.zk && knownState(fl.state) ? fl.state : null;
      if (fs || as) { st.state = fs || as; from.state = !fs && auto.state ? 'sove' : 'obj'; }
      else if (zs) { st.state = zs; from.state = 'zk'; }
      else if (docsState()) { st.state = docsState().k; from.state = 'docs'; }
      else st.state = null;
    }
    if (!by.purpose) { var pu = a && PURPOSE_RU[a.purpose]; st.rp.purpose = pu || null; if (pu) from.purpose = auto.purpose ? 'sove' : 'obj'; }
    if (!by.who) { var pe = a && PEOPLE_RU[a.people]; st.rp.who = pe || '2'; from.who = pe && !auto.who ? 'obj' : 'sove'; }
    if (!by.format) { var fm = formatOfFlat(); st.rp.format = fm || 'делаю сам'; from.format = fm ? 'obj' : 'sove'; }
    if (!by.guests) { var g = a ? (a.guests === 0 ? 'не нужно' : a.guests === 1 || a.guests === 2 ? String(a.guests) : null) : null; st.rp.guests = g || 'не нужно'; from.guests = g && !auto.guests ? 'obj' : 'sove'; }
    if (!by.fit) { var pk = a && a.picks && typeof a.picks === 'object' ? a.picks : null; st.answers = pk ? JSON.parse(JSON.stringify(pk)) : {}; }
  }
  /* к вопросам: известное — подставлено, экран сверху */
  function toBrief() { prefillBrief(); st.view = 'brief'; render(); window.scrollTo(0, 0); }
  /* свёрнуто (Алина 27.10): состояние выбрано — одна строка «Бетон, стены стоят · изменить ›», список по тапу.
     data-need — сюда ведёт подсказка «Заполни пункты выше» (needAnswers). Строки — общий вид вопросов (q-style .qs-opt) */
  var stateOpen = false;
  function stateBlock() {
    var cur = STATES.filter(function (x) { return x.k === st.state; })[0];
    var headHtml = '<section class="pz-card pz-state" data-need="state"><div class="pz-q__h"><b>Что сейчас в квартире?</b>' + fromTag('state') + '</div>';
    if (cur && !stateOpen) return headHtml + '<button type="button" class="qs-opt is-on pz-state__one" data-state-open aria-expanded="false"><span class="qs-opt__t"><b>' + esc(cur.t) + '</b><small>' + esc(cur.d) + '</small></span><em>изменить ›</em></button></section>';
    return headHtml + '<div class="qs-list">' +
      STATES.map(function (x) {
        var on = st.state === x.k;
        return '<button type="button" class="qs-opt' + (on ? ' is-on' : '') + '" data-state="' + x.k + '" aria-pressed="' + on + '"><span class="qs-opt__t"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></span>' +
          '<span class="qs-opt__ok" aria-hidden="true"></span></button>';
      }).join('') + '</div></section>';
  }

  /* геометрия для 3D: пример — из arrange-data.js, свой план — рамка из разметки, «плана нет» — типовая */
  function geo() {
    if (st.geo) return st.geo;
    if (st.live && st.live.res) st.geo = FLOW.frameFromMarkup(st.live.res, st.live.w, st.live.h);
    else if (st.typical) st.geo = P3.typicalGeo(st.typical.rooms);
    else st.geo = SRC;
    return st.geo;
  }
  /* подписи в 3D: комнаты (с исправленными названиями) и техническая разметка примера */
  function tags3d() {
    var g = geo(), base = rooms(), used = [], out = [];
    g.rooms.filter(function (r) { return !r.part_of; }).forEach(function (r) {
      var i = -1; base.forEach(function (x, k) { if (i < 0 && used.indexOf(k) < 0 && Math.abs((x.m2 || 0) - (r.m2 || r.doc_m2 || 0)) < .05) i = k; });
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
    if (!st.live && !st.typical) return SAMPLE_FACTS;
    var bed = find(/спал/), bath = find(/сан|ванн/), live = st.live && liveRooms().some(function (r) { return r.recess; });
    var bm = bed ? bed.m2 : 0;
    return { bedMax: bm >= 13 ? '180×200' : bm >= 10 ? '160×200' : '140×200', bedWhy: 'не останется прохода 70 см',
      kitchenWall: null, niche: !!live, bathBoth: !!(bath && bath.m2 >= 6) };
  }
  /* таблица A4 ТЗ: показываем вопрос, только если в плане есть комната; варианты отсекаем по метражу.
     Площадь не пришла из разметки — ничего не отсекаем: не знаем — не решаем за человека */
  function area(r) { return r && r.m2 > 0 ? r.m2 : null; }
  function where(r) { return r.name.toLowerCase() + (area(r) ? ' ' + F.area(r.m2) : ''); }
  function questions() {
    var fx = facts(), bed = find(/спал/), liv = find(/гост|студ/), kit = find(/кух|студ/), bath = find(/сан|ванн/), q = [];
    var ORDER = ['140×200', '160×200', '180×200'];
    if (bed) {
      var max = (area(bed) || !st.live) ? fx.bedMax : '180×200', cut = ORDER.slice(ORDER.indexOf(max) + 1);
      /* 160×200 не проходит по метражу (спальня меньше 10 м²) — по умолчанию самая большая из разрешённых, а не запрещённая */
      q.push({ k: 'bed', t: 'Кровать', why: where(bed), rows: [ORDER.slice(0, ORDER.indexOf(max) + 1)], def: [ORDER.indexOf(max) >= 1 ? '160×200' : max],
        note: cut.length ? cut.map(function (o) { return o.split('×')[0]; }).join(', ') + ' не предлагаем — ' + fx.bedWhy : '' });
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
      var six = zone === null || zone >= 9, who = st.rp.who;
      /* раздел 5: 1 → на 2; 2 + ребёнок → на 4; 3+ → на 6, если влезает, иначе на 4 */
      var tdef = who === '1' ? 'на 2' : who === '3+' && six ? 'на 6' : 'на 4';
      q.push({ k: 'table', t: 'Обеденный стол', why: dineRoom.name.toLowerCase(), rows: [six ? ['на 2', 'на 4', 'на 6'] : ['на 2', 'на 4']], def: [tdef],
        note: six ? '' : 'на 6 не предлагаем — зона меньше 9 м²' });
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
  /* ответ строки: выбранное человеком, если вариант ещё доступен, иначе умолчание; умолчание вне вариантов — первый вариант
     (в сводке «Заполнили по плану» и в расстановке — только то, что можно выбрать) */
  function answer(q, row) {
    var pick = (st.answers[q.k] || [])[row], opts = q.rows[row], d = q.def[row];
    return pick !== undefined && pick !== null && opts.indexOf(pick) >= 0 ? pick : opts.indexOf(d) >= 0 ? d : opts[0];
  }
  /* анкета v2 (TZ-anketa-planirovka, 24.10 15:31): 4 группы, 12 вопросов строго по порядку; В1–В3 обязательные */
  function group(t) { return '<b class="pz-group">' + esc(t) + '</b>'; }
  /* «сам / с дизайнером» (саммари стр. 1) — те же три ответа, что в Бюджете (data.scout.formats); хранится в квартире (flat.format) */
  var FORMAT_RU = ['делаю сам', 'нужен дизайн-проект', 'ремонт под ключ'], FORMAT_ID = { 'делаю сам': 'self', 'нужен дизайн-проект': 'adept', 'ремонт под ключ': 'track' };
  function formatOfFlat() { var R = S.repair, f = R && R.flats.active(); var id = f && f.format; for (var k in FORMAT_ID) if (FORMAT_ID[k] === id) return k; return null; }
  function lifeQ(k, t, hint, opts, multi, sub, k2, opts2) {
    return '<section class="pz-card pz-q" data-need="' + k + '"><div class="pz-q__h pz-q__h--base"><b>' + esc(t) + '</b>' + (hint ? '<small class="pz-note">' + esc(hint) + '</small>' : '') + fromTag(k) + '</div>' +
      chips(k, opts, multi) + (sub ? '<div class="pz-q__sub"><small class="pz-rq__sub">' + esc(sub) + '</small>' + fromTag(k2) + '</div>' + chips(k2, opts2) : '') + '</section>';
  }
  function required() { return !!st.state && !!st.rp.purpose && !!st.rp.who; }
  /* кнопка без ответов не мёртвая (Алина 26.10: «нужно уведомление — заполните пункты выше, не понятно иначе»):
     всплывает подсказка, экран едет к первому пропущенному вопросу и подсвечивает его */
  /* каких из трёх обязательных ответов нет — для подсказки над кнопкой и для тоста */
  function missing() {
    var miss = [];
    if (!st.state) miss.push({ k: 'state', t: 'что сейчас в квартире' });
    if (!st.rp.purpose) miss.push({ k: 'purpose', t: 'для чего ремонт' });
    if (!st.rp.who) miss.push({ k: 'who', t: 'кто живёт' });
    return miss;
  }
  function needAnswers() {
    var miss = missing();
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
       иначе токены списывались, а экран вариантов не открывался (найдено 28.10) */
    var qs = questions(), sk = skipped(), it = st.interior, rp = FLOW.replanOn() && !st.live, ok = required();
    return head() + title('Вопросы по твоему плану', '12 вопросов · больше половины уже заполнили по плану — проверь') +
      group('О квартире и жизни') + stateBlock() +
      lifeQ('purpose', 'Для чего ремонт', '', ['для себя', 'сдавать', 'продать']) +
      lifeQ('format', 'Как будешь делать ремонт', 'сумма не меняется — подскажем следующий шаг', FORMAT_RU) +
      lifeQ('who', 'Кто живёт', '', ['1', '2', '2 + ребёнок', '3+'], 0, 'Место для гостей', 'guests', ['не нужно', '1', '2']) +
      lifeQ('add', 'Что важно', 'до 3', ['спальня отдельно', 'рабочее место', 'детская', 'гардеробная', 'постирочная', 'больше хранения'], 3) +
      group('Что ставим') +
      /* заполнено по плану — свёрнуто одной карточкой, «проверить ›» раскрывает вопросы */
      (!st.fitOpen ? '<section class="pz-card pz-q"><div class="pz-q__h"><b>Заполнили по плану</b><button type="button" class="pz-link pz-link--in" data-act="fit-open">изменить ›</button></div>' +
        '<small class="pz-note">' + esc(qs.map(function (q) { return q.t + ' — ' + q.rows.map(function (r, ri) { return answer(q, ri); }).filter(function (v) { return v && v !== 'нет'; }).join(', '); }).join(' · ')) + '</small></section>' :
      qs.map(function (q) {
        return '<section class="pz-card pz-q"><div class="pz-q__h"><b>' + esc(q.t) + '</b><em class="pz-why">в плане: ' + esc(q.why) + '</em></div>' +
          q.rows.map(function (row, ri) {
            return '<div class="qs-chips">' + row.map(function (o) {
              var on = answer(q, ri) === o;
              return '<button type="button" class="qs-chip' + (on ? ' is-on' : '') + '" data-q="' + q.k + '" data-row="' + ri + '" data-o="' + esc(o) + '" aria-pressed="' + on + '">' + esc(o) + '</button>';
            }).join('') + '</div>';
          }).join('') + (q.note ? '<small class="pz-note">' + esc(q.note) + '</small>' : '') + '</section>';
      }).join('')) +
      group('Интерьер') + (it
        /* интерьер уже выбран (в объекте — в любом блоке, или здесь): вопрос не задаём, показываем выбранный и «Сменить ›» */
        ? '<section class="pz-card pz-q pz-q--int"><div class="pz-q__h"><b>Интерьер выбран</b><small class="pz-note">по нему подберём мебель</small></div>' + FLOW.interiorLine(it) + '</section>'
        : '<section class="pz-card pz-q"><div class="pz-q__h"><b>Какой интерьер?</b><small class="pz-note">по нему подберём мебель</small></div>' +
          FLOW.interiorPick({ inline: true }) +
          '<small class="pz-note">свой интерьер: загрузи фото или рендер — найдём похожую мебель в Маркете</small>' +
          '<button type="button" class="pz-link pz-link--left is-on" data-act="later" aria-pressed="true">Выберу позже — расставь по размерам</button></section>') +
      /* блок «Перепланировка и стены» — на своей подложке с заголовком (Алина 24.10) */
      '<section class="pz-wallsbox"><b class="pz-group">Перепланировка и стены</b>' +
        (st.live ? '<small class="pz-note">Для своего плана варианты стен пока не строим — их можно посмотреть на примере ЖК PRIDE.</small>' : replanBlock(rp)) + '</section>' +
      (sk.length ? '<div class="pz-skip"><b>Не спрашиваем:</b> ' + esc(sk.join(' · ')) + '</div>' : '') +
      /* подсказка называет, чего не хватает: часть ответов уже подставлена из объекта, «3 вопроса» сбивали с толку */
      (ok ? '' : '<small class="pz-note pz-c">' + esc('Осталось ответить: ' + missing().map(function (m) { return m.t; }).join(', ')) + '</small>') +
      '<button type="button" class="pz-btn' + (ok ? '' : ' is-wait') + '" data-act="go"' + (ok ? '' : ' aria-disabled="true"') + '>' + (rp ? 'Показать варианты стен' : 'Расставить мебель') + '</button>' +
      (rp ? '' : '<button type="button" class="pz-link" data-act="skip">Пропустить — расставит SOVEAPP</button>');
  }

  /* ── В12 «Поменять стены?» — переключатель; дополнительных вопросов под ним нет (анкета v2) ── */
  function chips(k, opts, multi) {
    var cur = st.rp[k] || (multi ? [] : null);
    return '<div class="qs-chips">' + opts.map(function (o) {
      var on = multi ? cur.indexOf(o) >= 0 : cur === o;
      return '<button type="button" class="qs-chip' + (on ? ' is-on' : '') + '" data-rp="' + k + '" data-o="' + esc(o) + '"' + (multi ? ' data-multi="' + multi + '"' : '') + ' aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('') + '</div>';
  }
  function replanBlock(on) {
    return '<label class="pz-toggle pz-toggle--walls' + (on ? ' is-on' : '') + '"><span><b>Поменять стены?</b><small>кабинет, гардероб, ещё спальня · несущие и мокрые зоны не трогаем</small></span>' +
        '<input type="checkbox" data-replan' + (on ? ' checked' : '') + '><i></i></label>';
  }
  function sheet() { commit(); FLOW.save({ replanAnswers: st.rp }); FLOW.replanSheet(function () { go(true); }, function () { go(false); }); }

  function viewPlacing() {
    return head() + title('Расставляю мебель по нормам проходов', 'мебель встанет в твою 3D-квартиру') +
      '<div class="pz-prog"><i class="pz-prog__run"></i></div><small class="pz-note">Проверяю проходы, двери и окна…</small>';
  }
  function render() {
    var V = { reading: viewReading, rooms: viewRooms, brief: viewBrief, error: viewError, placing: viewPlacing, noplan: viewNoplan, zk: viewZk,
              notplan: viewNotplan, flats: viewFlats, scan: viewScan };
    root.innerHTML = (V[st.view] || viewIdle)();
    keepSample();                                     /* пример: открыт ли «Проверь план» и правки — для «Шаг назад» и перезагрузки */
    keepTypical();                                    /* типовой план на вопросах — для перезагрузки */
    /* свой план: запись чтения знает, на каком экране он открыт (проверка или вопросы) — перезагрузка вернёт тот же */
    if (!RET && st.live && st.live.res && (st.view === 'rooms' || st.view === 'brief') && (!st.keep || st.keep.view !== st.view)) keepLive({ view: st.view });
    if (st.view === 'rooms') mount3d();
    if (st.view === 'idle') {
      placeTags(); var hi = root.querySelector('#pd-hero img'); if (hi && !hi.complete) hi.addEventListener('load', placeTags);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeTags);   /* шрифт догрузился — ширина ценников другая */
    }
    /* лента «Выбери интерьер» (раздел 14): на A3 — да, на A1, A2, A4 — нет */
    /* в режиме тапа «Отметить вход» ленту прячем: на телефоне она закрывала низ плана; в скане ленты нет — интерьер выбирают в блоке */
    FLOW.interiorStrip({ show: st.view === 'rooms' && !st.pick && !RET, chosen: !!st.interior, onPick: function (it) { st.interior = it; render(); } });
    bind();
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
      important: (rp.add || []).slice(0, 3).map(function (x) { return IMP[x] || x; }),
      /* выбранное человеком в «Что ставим» (вид экрана) и что из «О квартире» подставил SOVEAPP — для следующего входа */
      picks: JSON.parse(JSON.stringify(st.answers || {})), auto: autoKeys(['state', 'purpose', 'who', 'guests'])
    };
    try { localStorage.setItem('sove.answers', JSON.stringify(all)); } catch (e) {}
  }
  /* ответы, которые подставил SOVEAPP (умолчание, «Пропустить»), а человек не выбирал: { purpose: true, … } */
  function autoKeys(keys) {
    var out = {}, from = st.from || {};
    keys.forEach(function (k) { if (from[k] === 'sove') out[k] = true; });
    return out;
  }
  /* «Для чего ремонт», «Кто живёт», «Место для гостей» — в ответы квартиры сразу по нажатию (sove.answers, тот же формат, что saveAnswers):
     перезагрузка или новый заход не спросят снова — ответ вернётся с меткой «из объекта» (подставленное SOVEAPP — с «подобрано») */
  function rememberLife() {
    var R = S.repair, fid = (R && R.flats.active() || {}).id || 'draft', all = {}, rp = st.rp;
    try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {}
    var a = all[fid] && typeof all[fid] === 'object' ? all[fid] : (all[fid] = {});
    if (rp.purpose) a.purpose = { 'для себя': 'self', 'сдавать': 'rent', 'продать': 'sale' }[rp.purpose] || a.purpose || null;
    if (rp.who) a.people = rp.who.replace(' + ребёнок', '+1');
    if (rp.guests) a.guests = rp.guests === 'не нужно' ? 0 : +rp.guests;
    var au = a.auto && typeof a.auto === 'object' ? a.auto : (a.auto = {}), now = autoKeys(['purpose', 'who', 'guests']);
    ['purpose', 'who', 'guests'].forEach(function (k) { if (now[k]) au[k] = true; else delete au[k]; });
    try { localStorage.setItem('sove.answers', JSON.stringify(all)); } catch (e) {}
  }
  /* «Что ставим» — в ответы квартиры сразу по нажатию: перезагрузка на вопросах и новый заход их не теряют */
  function rememberPicks() {
    var R = S.repair, fid = (R && R.flats.active() || {}).id || 'draft', all = {};
    try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {}
    var a = all[fid] && typeof all[fid] === 'object' ? all[fid] : (all[fid] = {});
    a.picks = JSON.parse(JSON.stringify(st.answers || {}));
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
    /* «Расставить мебель» и «Пропустить»: состояние, с которым расставляем, — в паспорт (раньше — только по тапу, и Бюджет
       спрашивал «Что сейчас в квартире?» второй раз). До ответов: квартира-черновик, если её не было, получает их под своим id */
    stateToFlat();
    saveAnswers(a);
    FLOW.save({ brief: brief, answers: a, picks: JSON.parse(JSON.stringify(st.answers || {})), auto: autoKeys(['state', 'purpose', 'who', 'guests']), interior: st.interior, source: st.source, accuracy: ACCURACY[st.source], state: st.state,
      flat: flatName(), rooms: rooms(), typical: !!st.typical, plan: 0, step: 5 });
    return brief;
  }

  /* свой план: читаем размер, шлём на разметку, показываем подписанный план */
  /* «← Назад» с экрана мебели для СВОЕГО плана (Алина и Таня 27.10: «не возвращает назад, так и не прошли по нему»).
     Файл и разметка жили только в памяти вкладки, и при возврате человек попадал на первый экран — план приходилось
     загружать и распознавать заново. Теперь разметка и уменьшенная копия картинки (до 1600 px, JPEG) лежат
     в sessionStorage этой вкладки: «Назад» открывает вопросы с ответами, а «Проверь план» — тот же план */
  /* скан держит свою запись того же формата: прочитанное в скане не всплывает в обычной Планировке и не стирает её запись.
     Уход из скана без «Всё верно» запись не стирает — снова «Распознать комнаты» этого же плана открывает её без запроса */
  var LIVE_BACK = RET ? 'sove.plan.scanLive' : 'sove.plan.liveBack';
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
      sessionStorage.setItem(LIVE_BACK, JSON.stringify({ view: o.view || 'rooms', res: res, w: l.w || 0, h: l.h || 0, img: l.small || null,
        file: st.fileName || '', key: l.key || null, kind: l.kind || 'image', fromServer: !!l.fromServer, err: o.view === 'error' ? st.err : null,
        np: o.view === 'notplan' ? st.np : null, quality: q ? { level: q.level, path: q.path } : null, hints: st.hints || {},
        edits: { names: st.names || null, types: st.types || null }, rot: st.rot || 0,
        /* размер файла и (в скане) подпись плана объекта, по которому читали: запись другого плана не подходит */
        size: st.fileSize || 0, sig: RET && st.scanOf ? st.scanOf.sig || null : null }));
      return true;
    } catch (e) { return false; }
  }
  /* подсказки, типы и повороты из записи; восстановленные типы считаем выбранными человеком — по названию их не подстраиваем */
  function restoreEdits(lb) {
    st.hints = lb.hints && typeof lb.hints === 'object' ? lb.hints : {};
    st.rot = lb.rot || 0; st.names = (lb.edits && lb.edits.names) || null; st.types = (lb.edits && lb.edits.types) || null;
    st.touched = null; if (st.types) { st.touched = {}; Object.keys(st.types).forEach(function (k) { st.touched[k] = true; }); }
  }
  function dropLive() { st.keep = null; try { sessionStorage.removeItem(LIVE_BACK); } catch (e) {} }
  function readLiveBack() { try { return JSON.parse(sessionStorage.getItem(LIVE_BACK) || 'null'); } catch (e) { return null; } }
  /* пример ЖК PRIDE в обычной Планировке (у скана своя запись — keepScan): прочитан ли в этой вкладке, исправленные названия и
     открыт ли сейчас «Проверь план». «‹ Шаг назад», «Проверить комнаты» и перезагрузка на «Проверь план» не проигрывают чтение
     заново и не теряют правки. Свой план или типовой на экране — пример не открыт (view null), его прочитанность и правки остаются */
  var SAMPLE_BACK = 'sove.plan.sampleBack';
  function readSampleBack() { try { var x = JSON.parse(sessionStorage.getItem(SAMPLE_BACK) || 'null'); return x && typeof x === 'object' ? x : null; } catch (e) { return null; } }
  function keepSample() {
    if (RET || ZKRET) return;
    var sb = readSampleBack(), other = !!(st.live || st.typical);
    if (!sb && (other || !st.sampleDone)) return;            /* пример в этой вкладке не читали — записывать нечего */
    /* экран примера: «Проверь план» или вопросы (открытые по ссылке ?replan / ?tune — не наши, их вернёт сама ссылка);
       «Расставляю мебель» — тот же шаг, что был перед ним */
    var sv = st.view === 'rooms' || (st.view === 'brief' && !st.entry) ? st.view : st.view === 'placing' && sb && sb.view === 'brief' ? 'brief' : null;
    var rec = other || !st.sampleDone ? { done: !!(sb && sb.done), names: (sb && sb.names) || null, view: null }
      : { done: true, names: st.names || null, view: sv };
    if (sb && JSON.stringify(sb) === JSON.stringify(rec)) return;
    try { sessionStorage.setItem(SAMPLE_BACK, JSON.stringify(rec)); } catch (e) {}
  }
  /* исправленные названия примера из записи вкладки */
  function sampleNames() { var sb = readSampleBack(); return (sb && sb.names) || null; }
  /* перезагрузили на «Проверь план» или на вопросах примера — тот же экран с правками, без анимации чтения */
  function restoreSampleBack() {
    var sb = readSampleBack(); if (!sb || !sb.done || (sb.view !== 'rooms' && sb.view !== 'brief')) return false;
    st.sampleDone = true; st.names = sb.names || null;
    if (sb.view === 'brief') { prefillBrief(); st.view = 'brief'; return true; }
    st.view = 'rooms';
    return true;
  }
  /* типовой план на вопросах («Плана нет» по площади или комнаты объекта без картинки): перезагрузка возвращает те же вопросы,
     площадь и комнаты заново не спрашиваем */
  var TYP_BACK = 'sove.plan.typicalBack';
  function keepTypical() {
    if (RET || ZKRET) return;
    try {
      if (st.typical && st.view === 'brief' && !st.entry) sessionStorage.setItem(TYP_BACK, JSON.stringify({ typical: st.typical, noplan: st.noplan, source: st.source || null }));
      else if (st.view !== 'placing') sessionStorage.removeItem(TYP_BACK);
    } catch (e) {}
  }
  function restoreTypicalBack() {
    var x = null; try { x = JSON.parse(sessionStorage.getItem(TYP_BACK) || 'null'); } catch (e) {}
    if (!x || !x.typical || !(x.typical.rooms || []).length) return false;
    st.typical = x.typical; st.geo = null; if (x.noplan) st.noplan = x.noplan; if (x.source) st.source = x.source;
    prefillBrief(); st.view = 'brief';
    return true;
  }
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
  /* файл из поля ввода (все три поля — один путь): тип по MIME или расширению, размер до запроса, подготовка → чтение.
     o.name, o.size — подпись и размер файла (картинка плана из объекта: имя и размер того, что положило окно — запись «Всё верно»
     ляжет в тот же план), o.custom — в скане картинку выбрали своим полем (окна загрузки нет), в объект она ляжет со своим именем и размером */
  function acceptPlanFile(file, o) {
    var type = FLOW.fileType(file), isPdf = type === 'application/pdf', isHeic = /heic|heif/.test(type);
    resetLive(); st.typical = null; st.names = null; st.geo = null; st.fileName = (o && o.name) || file.name; st.fileSize = (o && o.size) || file.size || 0;
    st.scanCustom = !!(o && o.custom); st.scanMsg = null;
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
    /* свой план — уже не планировка из базы ЖК; скан — побочный заход из другого блока, сценарий Планировки не трогаем */
    if (!RET) FLOW.save({ zk: null });
    stopLive(); stopCountdown();
    st.errKind = null; st.err = null; st.error = null; st.typical = null; st.geo = null; st.state = null; dropLive();
    if (!RET && !/replan=1/.test(location.search)) FLOW.setReplan(false);
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
        keepLive({ view: 'rooms' }); st.view = 'rooms'; render(); window.scrollTo(0, 0);
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
    var c = st.carry; st.carry = null; st.names = null; st.types = null; st.touched = null;
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
    st.names = null; st.types = null; st.touched = null; st.carry = null; st.flatPick = null;
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
    var frame = FLOW.frameFromMarkup(res, live.w, live.h), q0 = FLOW.qualityOf(res, live.w, live.h);
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
          quality: { level: q0.level, path: q0.path }, hints: st.hints || {}, edits: { names: st.names || null, types: st.types || null }, rot: st.rot || 0 } };
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
      /* без кода ошибки («ошибка 503») — человеку он ничего не говорит; заголовок экрана уже «Не получилось расставить мебель» */
      st.error = 'Сервер не ответил — это не из-за плана.'; st.errKind = 'place'; st.view = 'error'; render();
    });
  }

  function startReading() {
    st.view = 'reading'; st.sampleDone = false; render();
    var i = 0, seq = st.seq;
    var tick = setInterval(function () {
      if (seq !== st.seq) { clearInterval(tick); return; }        /* нажали «Назад» — чтение отменено */
      i++; setStage(i);
      /* новый шаг — с его начала: полоска объекта, появившаяся при записи плана, иначе закрывала шапку шага */
      if (i >= READ_STAGES.length) { clearInterval(tick); st.sampleDone = true; st.view = 'rooms'; if (RET) keepScan(); render(); window.scrollTo(0, 0); }
    }, 700);
  }
  /* пример ЖК PRIDE — локальная анимация чтения, без API; комнаты — SAMPLE_ROOMS (47,0 м²) */
  function startSample() {
    if (!RET) { FLOW.save({ zk: null }); if (!/replan=1/.test(location.search)) FLOW.setReplan(false); }
    resetLive(); st.geo = null; st.typical = null; st.names = null; st.fileName = RET && st.scanOf ? st.scanOf.file : null;
    if (st.source === 'none') st.source = 'developer'; st.state = 'concrete_walls';
    if (RET) { startReading(); return; }
    /* названия: правки этой вкладки, иначе проверенные в объекте (пример уже лежит там с комнатами) */
    var po = objPlan(), objNames = isSamplePlan(po) ? namesOf(po) : null;
    /* пример уже прочитан в этой вкладке — сразу «Проверь план» с прежними правками, без повторной анимации (у скана — своя запись) */
    if (st.sampleDone) { st.names = sampleNames() || objNames; st.view = 'rooms'; render(); window.scrollTo(0, 0); return; }
    st.names = objNames; startReading();
  }

  /* ── План объекта (SOVE.repair, договор п. 3–4): файл пишет окно загрузки, комнаты — Планировка по «Всё верно».
     Одна запись R.save('plan'): в скане — {...план объекта, rooms}, в обычной Планировке — план, который сейчас проверили ── */
  var SAMPLE_PLAN = { file: 'ЖК PRIDE · пример плана', img: 'assets/img/demo/0-planirovka-po-ankete.jpg' };
  var SRC_LEVEL = { developer: 'developer_plan', measure: 'measured_plan', project: 'design_project' };
  function samplePlan() { var U = S.planUpload && S.planUpload.DEMO; return { file: (U && U.file) || SAMPLE_PLAN.file, img: (U && U.img) || SAMPLE_PLAN.img }; }
  function objPlan() { var R = S.repair; return R && R.flats.active() ? R.get().plan || null : null; }
  /* пример ЖК PRIDE в объекте: окно загрузки (sample), имя примера или старая запись Планировки (jk PRIDE без файла) */
  function isSamplePlan(p) { return !!p && (p.sample === 'pride' || p.file === samplePlan().file || (p.jk === 'PRIDE' && !p.file)); }
  function planM2(p) { return Math.round(((p && p.rooms) || []).reduce(function (a, r) { return a + (+r.m2 || 0); }, 0) * 10) / 10; }
  function planSummary(p) { return p ? { n: (p.rooms || []).length, m2: planM2(p), file: p.file || '' } : null; }
  /* подпись плана объекта: имя, размер и сама картинка (длина и FNV-хэш строки) — прочитанное в скане относится только к нему */
  function planSig(p) {
    if (!p) return '';
    var s = String(p.img || ''), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return [p.file || '', p.size || 0, s.length, h.toString(16)].join('|');
  }
  /* что читаем в скане — запомнить, чтобы запись легла в тот же план (имя, размер, уровень, источник, подпись) */
  function planId(p) { return { file: p.file || null, size: p.size || 0, level: p.level || 'developer_plan', source: p.source || FROM || null, sample: isSamplePlan(p), img: p.img || null, sig: planSig(p) }; }
  /* комнаты экрана «Проверь план» с правками человека → формат объекта {name, m2, type} */
  function planRooms() {
    return rooms().map(function (r) {
      return { name: String(r.name || '').trim() || 'Помещение', m2: +r.m2 > 0 ? Math.round(r.m2 * 10) / 10 : null, type: r.type || FLOW.typeFromName(r.name) || null };
    });
  }
  /* разметка своего плана — те же поля, что keepLive (без картинок base64): по ней план открывается снова без запроса */
  function markupOf() {
    var l = st.live; if (!l || !l.res) return null;
    var res = {}; Object.keys(l.res).forEach(function (k) { if (k !== 'labeled_png_base64' && k !== 'source_image_base64') res[k] = l.res[k]; });
    var q = FLOW.qualityOf(l.res, l.w, l.h);
    return { res: res, w: l.w || 0, h: l.h || 0, key: l.key || null, kind: l.kind || 'image', fromServer: !!l.fromServer, quality: q ? { level: q.level, path: q.path } : null,
      hints: st.hints || {}, edits: { names: st.names || null, types: st.types || null }, rot: st.rot || 0 };
  }
  /* «один раз»: то же самое второй раз не пишем — время плана не меняется, бюджет не становится «устаревшим» */
  function samePlanData(a, b) {
    if (!a || !b) return false;
    var ok = ['level', 'file', 'size', 'img', 'sample', 'jk', 'key', 'source'].every(function (k) { return (a[k] || null) === (b[k] || null); });
    return ok && JSON.stringify(a.rooms || []) === JSON.stringify(b.rooms || []) && JSON.stringify(a.markup || null) === JSON.stringify(b.markup || null);
  }
  /* запись легла в localStorage (repair.js глотает переполнение молча) — сверяем время и комнаты */
  function planStored() {
    try {
      var R = S.repair, f = R.flats.active(), p = R.get().plan, all = JSON.parse(localStorage.getItem('sove.repair.v1') || '{}');
      var s = all.repair && all.repair[f.id] && all.repair[f.id].plan;
      return !!(s && p && s.ts === p.ts && JSON.stringify(s.rooms || []) === JSON.stringify(p.rooms || []));
    } catch (e) { return false; }
  }
  function writePlanRooms() {
    var R = S.repair; if (!R || st.typical) return null;     /* типовой план («Плана нет») в объект не пишем */
    var cur = objPlan(), rs = planRooms(), live = st.live && st.live.res ? st.live : null, data;
    var scan = { by: live ? 'markup' : 'sample', quality: live ? (FLOW.qualityOf(live.res, live.w, live.h) || {}).level || null : null, ts: Date.now() };
    if (RET) {
      /* скан: тот же план объекта, к нему — комнаты; план в другой вкладке сменился — пишем в тот, что читали */
      var of = st.scanOf || planId(cur || {}), same = !!cur && (of.sample ? isSamplePlan(cur) : cur.file === of.file);
      var base = same ? cur : { level: of.level, file: of.file, size: of.size, source: of.source, img: of.img };
      if (!same && of.sample) base.sample = 'pride';
      data = Object.assign({}, base, { rooms: rs, scan: scan });
      if (live) {
        /* картинка в объекте остаётся, если читали её же; другая картинка (после перезагрузки — по имени файла), поворот
           или картинка сервера — копия прочитанной: разметка должна лечь на ту картинку, по которой её сделали */
        var custom = st.scanCustom || !!(st.fileName && of.file && st.fileName !== of.file);
        var keepPic = base.img && !custom && !st.rot && !live.fromServer;
        data.img = keepPic ? base.img : (live.small || base.img || null);
        /* картинку выбрали своим полем (окна загрузки не было) — в объекте её имя и размер, а не прежнего файла */
        if (custom && st.fileName) { data.file = st.fileName; data.size = st.fileSize || 0; }
        data.key = live.key || base.key || null; data.markup = markupOf();
      }
    } else if (!live) {
      /* пример ЖК PRIDE: в объект — только если там нет плана или там тоже пример; твой план примером не затираем */
      if (cur && !isSamplePlan(cur)) return null;
      var smp = samplePlan();
      data = Object.assign({}, cur || {}, { level: (cur && cur.level) || 'developer_plan', file: smp.file,
        img: cur && cur.img && !/^data:/.test(cur.img) ? cur.img : smp.img, sample: 'pride', jk: (cur && cur.jk) || 'PRIDE',
        rooms: rs, source: (cur && cur.source) || 'plan', scan: scan });
    } else {
      /* свой файл: тот же, что уже в объекте (имя и размер), — дописываем; другой — новый план с этой картинкой и разметкой */
      var same2 = !!cur && !!cur.file && cur.file === st.fileName && (!cur.size || !st.fileSize || cur.size === st.fileSize), b2 = same2 ? cur : {};
      data = Object.assign({}, b2, { level: (same2 && cur.level) || SRC_LEVEL[st.source] || 'developer_plan', file: st.fileName || 'План квартиры',
        size: st.fileSize || b2.size || 0, img: live.small || b2.img || null, rooms: rs, source: b2.source || 'plan', key: live.key || null,
        markup: markupOf(), scan: scan });
    }
    if (samePlanData(cur, data)) return planSummary(cur);
    /* переполнено хранилище — повтор без разметки, потом без картинки (запись всё равно одна: прежняя не легла) */
    var tries = [data], ok = false;
    if (data.markup) tries.push(Object.assign({}, data, { markup: null }));
    if (data.img && /^data:/.test(data.img)) tries.push(Object.assign({}, data, { markup: null, img: null }));
    for (var i = 0; i < tries.length && !ok; i++) {
      R.save('plan', tries[i], { force: true, silent: true });
      ok = planStored();
      if (ok && i && !tries[i].img && data.img) S.ui.toast('Комнаты сохранены, картинка плана не поместилась в память демо');
    }
    if (!ok) { S.ui.toast('Память демо переполнена — комнаты не сохранились. Удали загруженные файлы в «Мой ремонт» или очисти данные сайта.'); return null; }
    return planSummary(R.get().plan);
  }

  /* ── скан: старт, возврат в блок ── */
  /* запись вкладки о скане: какой план читаем (подпись) и, для примера, прочитан ли он и исправленные названия —
     после перезагрузки пример открывается на «Проверь план» с правками, без повторной анимации и без API */
  function keepScan() {
    var o = st.scanOf;
    try { sessionStorage.setItem(SCAN_MARK, JSON.stringify({ from: FROM, returnTo: RET_TO, ts: Date.now(),
      of: o ? { file: o.file, size: o.size, level: o.level, source: o.source, sample: o.sample, sig: o.sig || null } : null,
      sample: o && o.sample ? { done: !!st.sampleDone, names: st.names || null } : null })); } catch (e) {}
  }
  function endScan() { try { sessionStorage.removeItem(SCAN_MARK); } catch (e) {} }
  /* план из объекта: пример — без API; комнаты уже есть — к проверке по сохранённой разметке или к возврату;
     картинка — то же чтение, что у ручной загрузки (POST /ai/plan/markup, один за заход); PDF без картинки — просим картинку */
  function startScan(force) {
    var p = objPlan(); st.scanMsg = null;
    if (!p) { st.view = 'scan'; render(); return; }
    st.scanOf = planId(p); keepScan();
    if (isSamplePlan(p)) { startSample(); return; }
    if (p.rooms && p.rooms.length && !force) {
      if (liveFromPlan(p)) { st.view = 'rooms'; keepLive({ view: 'rooms' }); } else st.view = 'scan';
      render(); return;
    }
    if (!p.img) { st.view = 'scan'; render(); return; }
    readObjPlan(p);
  }
  /* сохранённая разметка плана объекта → «Проверь план» без запроса (формат тот же, что у записи для возврата) */
  function liveFromPlan(p) {
    var m = p.markup; if (!m || !m.res || !p.img) return false;
    resetLive(); st.typical = null; st.geo = null;
    st.live = liveFromBack({ res: JSON.parse(JSON.stringify(m.res)), w: m.w, h: m.h, img: p.img, file: p.file, key: m.key || p.key, kind: m.kind, fromServer: m.fromServer }, null);
    st.fileName = p.file || null; restoreEdits(m); st.mode = isPoor(quality()) ? '2d' : '3d';
    return true;
  }
  /* картинка плана из объекта (dataURL окна загрузки или путь) → файл → acceptPlanFile, дальше всё как у ручной загрузки */
  function readObjPlan(p) {
    resetLive(); st.typical = null; st.names = null; st.geo = null;
    st.fileName = p.file || 'План квартиры'; st.live = { kind: 'prep', name: st.fileName }; st.view = 'reading'; render();
    var seq = st.seq;
    fetch(p.img).then(function (r) { if (!r.ok) throw new Error('img ' + r.status); return r.blob(); }).then(function (b) {
      if (seq !== st.seq) return;                     /* отменили, пока доставали картинку */
      var type = /^image\/(png|webp|gif|bmp)$/.test(b.type) ? b.type : 'image/jpeg';
      var name = String(p.file || 'plan').replace(/\.[a-z0-9]+$/i, '') + '.' + (type === 'image/jpeg' ? 'jpg' : type.split('/')[1]);
      acceptPlanFile(new File([b], name, { type: type }), { name: p.file, size: p.size || 0 });
    }).catch(function () { if (seq !== st.seq) return; resetLive(); st.scanMsg = 'broken'; st.view = 'scan'; render(); });
  }
  function withScanned(u) { return /[?&]scanned=1(&|$)/.test(u) ? u : u + (u.indexOf('?') >= 0 ? '&' : '?') + 'scanned=1'; }
  /* «Всё верно — вернуться в <блок>»: одна запись, сигнал блоку (тост покажет он сам) и возврат без записи в истории */
  function finishScan() {
    var sum = writePlanRooms();
    if (!sum) return;                                 /* не легло в хранилище — тост уже показан, остаёмся на проверке */
    try { sessionStorage.setItem(SCANNED_KEY, JSON.stringify({ entry: FROM || null, from: FROM || null, ts: Date.now(), rooms: sum.n, n: sum.n, m2: sum.m2, file: sum.file })); } catch (e) {}
    stopLive(); endScan(); dropLive();               /* комнаты и разметка теперь в объекте — запись вкладки не нужна */
    location.replace(withScanned(RET_TO));
  }
  /* «Вернуться без комнат», «Вернуться в <блок>» (комнаты уже были) и «← Назад»: в блок без записи и без сигнала «сохранено»;
     пришли из него — назад по истории. Прочитанное не стираем: снова «Распознать комнаты» этого плана — без нового запроса */
  function leave() {
    stopLive(); endScan();
    /* скан Бюджета: «Вернуться без комнат» / «← Назад» — в анкету Бюджета (шаг 2) с ручным вводом площади, а не на прежний экран (Алина 10.11) */
    if (BUD) { location.replace(RET_TO + (RET_TO.indexOf('?') >= 0 ? '&' : '?') + 'manual=1'); return; }
    var ref = null; try { var u = new URL(document.referrer); if (u.origin === location.origin) ref = u.pathname.split('/').pop() + u.search; } catch (e) {}
    if (history.length > 1 && ref === RET_TO) history.back(); else location.replace(RET_TO);
  }
  /* скан: другой файл плана («Загрузить картинку плана», «Другой файл») — общее окно загрузки, вход 'plan': файл в объект
     пишет окно (с вопросом «Заменить план?», если там уже комнаты), выбранный файл сразу отдаёт сюда — читаем его здесь же,
     PDF тоже. Окна нет (скрипт не загрузился) — своё поле файла: картинка ляжет в объект со своим именем и размером */
  var SCAN_CARDS = ['developer_plan', 'measured_plan', 'design_project'];
  function scanUpload() {
    var U = S.planUpload, p = objPlan();
    if (U && U.open) { U.open({ entry: 'plan', cards: SCAN_CARDS, level: (p && p.level) || 'developer_plan', onDone: scanPicked, toast: false, replace: !!p }); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (inp.parentNode) inp.parentNode.removeChild(inp);
      if (f) { st.errKind = null; stopCountdown(); acceptPlanFile(f, { custom: true }); }
    });
    document.body.appendChild(inp); inp.click();
  }
  function scanPicked(res) {
    var p = objPlan(); if (!res) return;
    st.errKind = null; stopCountdown(); st.scanMsg = null;
    if (!p) { resetLive(); st.view = 'scan'; render(); return; }
    var f = !res.use && !res.demo && res.files && res.files[0];
    if (f && !isSamplePlan(p)) { st.scanOf = planId(p); keepScan(); acceptPlanFile(f, { name: p.file || f.name }); return; }
    /* «Взять этот план», «Распознать комнаты», пример — как при входе: пример без API, картинка — чтение, PDF — просьба о картинке */
    if (res.use && !p.img && !isSamplePlan(p) && !(p.rooms && p.rooms.length)) S.ui.toast('Нужна картинка плана — JPG или PNG');
    startScan(!!res.scan);
  }
  /* обычная Планировка, свой файл: в объекте другой план с комнатами (не пример) — сначала вопрос, как в окне загрузки.
     «Оставить прежний» — остаёмся на «Проверь план»: дальше (вопросы, мебель, бюджет) идём только с планом, который лежит в объекте.
     Прежний план — «‹ Шаг назад» → «Продолжить с этим планом» */
  function otherPlanWithRooms() {
    var cur = objPlan();
    if (!st.live || !st.live.res || st.typical || !cur || !(cur.rooms && cur.rooms.length) || isSamplePlan(cur)) return null;
    var same = !!cur.file && cur.file === st.fileName && (!cur.size || !st.fileSize || cur.size === st.fileSize);
    return same ? null : cur;
  }
  function checkedOk() {
    /* комнаты легли в объект (записали сейчас, а не то же самое второй раз) — один тост об этом; окно загрузки на входе plan
       своего тоста «План сохранён» больше не просит (toast:false) */
    function next() {
      var p0 = objPlan(), t0 = p0 ? p0.ts : null, sum = writePlanRooms(), p1 = objPlan();
      toBrief();
      if (sum && p1 && p1.ts !== t0) S.ui.toast('Комнаты сохранены в Мой ремонт · ' + sum.n + ' ' + plural(sum.n, 'комната', 'комнаты', 'комнат') + (sum.m2 ? ' · ' + F.area(sum.m2) : ''), 'ok');
    }
    var cur = otherPlanWithRooms(); if (!cur) return next();
    askReplace(cur, 'этим планом с проверенными комнатами', next, function () {});
  }

  /* walls — после списания идём на «Варианты стен», иначе сразу на мебель */
  /* раздел 5 анкеты: ответы меняют расстановку и без перепланировки */
  function layoutFromAnswers() {
    var imp = st.rp.add || [];
    return {
      plan: imp.indexOf('рабочее место') >= 0 ? 2 : (imp.indexOf('больше хранения') >= 0 || imp.indexOf('гардеробная') >= 0) ? 1 : 0,
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
    /* список ЖК перерисовывается при вводе без общей перерисовки — его кнопки (data-zk, data-zk-act) слушаем здесь */
    function zkBind() {
      root.querySelectorAll('#pd-zkres [data-zk]').forEach(function (b) { b.addEventListener('click', function () { st.zk = b.dataset.zk; st.view = 'zk'; render(); window.scrollTo(0, 0); }); });
      root.querySelectorAll('#pd-zkres [data-zk-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.getAttribute('data-zk-act');
          if (a === 'upload') openUpload();
          if (a === 'noplan') { st.source = 'none'; st.view = 'noplan'; render(); window.scrollTo(0, 0); }
          if (a === 'leave') leave();
        });
      });
    }
    if (zq) zq.addEventListener('input', function () { st.zkQ = zq.value; document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    var tags = heroTags(example());
    root.querySelectorAll('[data-tag]').forEach(function (b) { b.addEventListener('click', function () { tagSheet(tags[+b.dataset.tag]); }); });
    if (zf) zf.addEventListener('submit', function (e) { e.preventDefault(); st.zkQ = zq.value; var r = ZK ? ZK.search(st.zkQ) : [];
      if (r.length === 1) { st.zk = r[0].id; st.view = 'zk'; render(); window.scrollTo(0, 0); return; }
      document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    zkBind();
    root.querySelectorAll('[data-zl]').forEach(function (b) { b.addEventListener('click', function () { pickLayout(b.dataset.zl); }); });
    root.querySelectorAll('[data-rooms]').forEach(function (b) {
      b.addEventListener('click', function () { var m = document.getElementById('pd-m2'); st.noplan.m2 = m ? m.value : ''; st.noplan.rooms = +b.dataset.rooms; render(); });
    });
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'sample' || a === 'again' || a === 'typical') st.errKind = null;
        if (a === 'sample') startSample();
        /* «Загрузить план», «Заменить план» — общее окно загрузки (отдельной страницы загрузки нет) */
        if (a === 'upload') openUpload();
        /* «Другой файл» (ошибка) и «Другой план» («Проверь план») — на первый экран и сразу окно загрузки; «Назад» с «Плана нет» —
           на первый экран. Запрос, если шёл, обрываем; картинку и запись для возврата убираем. Скан — другой файл через общее
           окно загрузки (закрыли окно, ничего не выбрав, — остаёмся на этом экране) */
        if (a === 'again' && RET) scanUpload();
        else if (a === 'again') {
          var reopen = /^(error|rooms|notplan|flats)$/.test(st.view);
          resetLive(); st.typical = null; st.names = null; if (st.source === 'none') st.source = 'developer'; st.view = 'idle'; render(); window.scrollTo(0, 0);
          if (reopen) openUpload();
        }
        if (a === 'to-search') { st.view = 'idle'; render(); var q = document.getElementById('pd-zkq'); if (q) { q.scrollIntoView({ block: 'center' }); try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); } } }
        /* «Отменить» на чтении — запрос обрываем, назад на первый экран (скан — к своему первому шагу) */
        if (a === 'cancel-read') { resetLive(); st.view = RET ? 'scan' : 'idle'; render(); window.scrollTo(0, 0); }
        /* скан: распознать план объекта (rescan — даже если комнаты уже есть), к проверке без нового запроса, другой файл, возврат в блок.
           Обычная Планировка: план из объекта — «Распознать комнаты», «Продолжить с этим планом», «Посмотреть план» */
        if ((a === 'scan-plan' || a === 'rescan') && RET) startScan(a === 'rescan');
        else if (a === 'scan-plan') { var po = objPlan(); if (po) usePlan(po, true); }
        if (a === 'use-plan') { var pu = objPlan(); if (pu) continuePlan(pu); }
        if (a === 'see-plan') { var ps = objPlan(); if (ps) seePlan(ps); }
        if (a === 'scan-upload') scanUpload();
        /* «Проверить комнаты»: скан — прочитанное на этой странице; обычная Планировка — план объекта, уже прочитанный в этой вкладке:
           пример — без анимации и с правками, свой — по записи чтения (нового запроса нет; записи нет — первый экран как был) */
        if (a === 'to-rooms') {
          var pt = !RET && objPlan();
          if (pt && isSamplePlan(pt)) { startSample(); return; }
          if (pt && !reuseRead(pt)) { render(); return; }
          st.view = 'rooms'; render(); window.scrollTo(0, 0);
        }
        if (a === 'leave' || a === 'return') leave();
        /* «Повторить этот же файл» — без нового выбора файла */
        if (a === 'retry-read') { if (b.disabled) return; st.errKind = null; retryRead(); }
        if (a === 'typical') {
          var m2 = parseFloat(String((document.getElementById('pd-m2') || {}).value || '').replace(',', '.'));
          if (!(m2 >= 15 && m2 <= 300)) { var inp = document.getElementById('pd-m2'); if (inp) { inp.focus(); inp.setCustomValidity('Площадь от 15 до 300 м²'); inp.reportValidity(); } return; }
          freshPlan(); resetLive(); st.noplan.m2 = m2; st.names = null;
          st.typical = { m2: m2, rooms: typicalRooms(m2, st.noplan.rooms) }; st.geo = null;
          toBrief();
        }
        /* «Всё верно»: комнаты — в объект одной записью (договор, п. 4); скан — сразу назад в блок, иначе к вопросам
           (другой план с комнатами в объекте — сначала «Заменить план?») */
        if (a === 'ok') {
          collectNames();
          if (RET) { finishScan(); return; }
          checkedOk();
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
        /* «Пропустить — расставит SOVEAPP»: чего нет — подставляем и помечаем «подобрано» (в ответы квартиры — с этим признаком,
           следующий вход не выдаст их за выбор человека); состояние без данных в паспорт не пишем (stateToFlat) */
        if (a === 'skip') {
          var fr = st.from || (st.from = {});
          st.answers = {};
          if (!st.rp.purpose) { st.rp.purpose = 'для себя'; fr.purpose = 'sove'; }
          if (!st.rp.who) { st.rp.who = '2'; fr.who = 'sove'; }
          if (!st.rp.guests) { st.rp.guests = 'не нужно'; fr.guests = 'sove'; }
          if (!st.state) { var ds = docsState(); st.state = ds ? ds.k : 'concrete_walls'; fr.state = ds ? 'docs' : 'sove'; }
          go(false);
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
        /* пример — запись маленькая, держим правку сразу: перезагрузка до ухода из поля её не теряет */
        if (!st.live && !st.typical && !RET) { collectNames(); keepSample(); }
      });
      /* свой план — в запись чтения; пример в скане — в запись вкладки о скане, пример в Планировке — в свою (перезагрузка не теряет правки) */
      inp.addEventListener('change', function () { collectNames(); if (st.live) keepLive({ view: 'rooms' }); else if (RET) keepScan(); else if (!st.typical) keepSample(); });
    });
    root.querySelectorAll('select[data-type]').forEach(function (sel) {
      sel.addEventListener('change', function () { (st.touched = st.touched || {})[+sel.dataset.type] = true; collectNames(); if (st.live) keepLive({ view: 'rooms' }); });
    });
    root.querySelectorAll('[data-state-open]').forEach(function (b) { b.addEventListener('click', function () { stateOpen = true; render(); }); });
    root.querySelectorAll('[data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        var was = st.state; st.state = b.dataset.state; stateOpen = false;
        (st.byUser = st.byUser || {}).state = true; if (st.from) delete st.from.state;
        /* «Бетон, стен нет» включает «Варианты стен» сам (ТЗ 4.1), можно выключить; свой план — нет: вариантов стен
           для него не строим, а включённая перепланировка добавляла шаг «Стены» в полосу */
        if (st.state === 'concrete_free' && was !== 'concrete_free' && !st.live) FLOW.setReplan(true);
        FLOW.save({ state: st.state });
        /* своя квартира (и пример, ставший её планом) — состояние в паспорт объекта сразу: другие блоки не спросят снова */
        stateToFlat();
        render();
      });
    });
    root.querySelectorAll('[data-replan]').forEach(function (b) {
      b.addEventListener('change', function () { FLOW.setReplan(b.checked); render(); });
    });
    root.querySelectorAll('[data-rp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.rp, o = b.dataset.o, max = +b.dataset.multi || 0;
        if (max) { var l = st.rp[k] || (st.rp[k] = []), i = l.indexOf(o); if (i >= 0) l.splice(i, 1); else if (l.length < max) l.push(o); else { S.ui.toast('Можно выбрать до ' + max); return; } }
        else st.rp[k] = o;
        (st.byUser = st.byUser || {})[k] = true; if (st.from) delete st.from[k];      /* выбрал сам — метка «из объекта» / «подобрано SOVEAPP» уходит */
        if (k === 'purpose' || k === 'who' || k === 'guests') rememberLife();
        if (k === 'format' && S.repair && FORMAT_ID[o]) { var ff = S.repair.flats.ensure(); S.repair.flats.update(ff.id, { format: FORMAT_ID[o] }); }
        FLOW.save({ replanAnswers: st.rp }); render();
      });
    });
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = questions().filter(function (x) { return x.k === b.dataset.q; })[0];
        var a = st.answers[q.k] || (st.answers[q.k] = []); a[+b.dataset.row] = b.dataset.o;
        (st.byUser = st.byUser || {}).fit = true; rememberPicks(); render();
      });
    });
    /* карточки капсул, «Все интерьеры», «＋ Свой интерьер» и «Сменить ›» слушает demo-flow.js (общее окно выбора капсулы) */
  }
  /* интерьер — из объекта (капсула или свой, выбранные в любом блоке: Планировка не спрашивает заново); квартиры нет — выбор сценария */
  st.interior = FLOW.currentInterior ? FLOW.currentInterior() : (saved.interior || null);
  /* ответ «Что сейчас в квартире» этого сценария; у квартиры в паспорте уже есть состояние — берём его (prefillBrief, «из объекта») */
  if (saved.state && /replan=1/.test(location.search) && !flatState()) { st.state = saved.state; st.byUser = { state: true }; }
  if (saved.replanAnswers) st.rp = saved.replanAnswers;
  /* вход «Перепланировка» (?replan=1): переключатель включён; план есть — сразу вопросы (ТЗ, п. 2) */
  if (!RET && !ZKRET && new URLSearchParams(location.search).get('replan') === '1') { FLOW.setReplan(true); if (saved.rooms && saved.rooms.length) { prefillBrief(); st.view = 'brief'; st.entry = true; } }
  /* «Подстроить под тебя» с экрана мебели (?tune=1): анкета v2 по квартире из базы ЖК, без сканера; состояние — из объекта или «как сдаётся» */
  if (!RET && !ZKRET && Q.get('tune') === '1' && saved.zk) { prefillBrief(); st.view = 'brief'; st.entry = true; }

  /* ── «Шаг назад» (Алина 26.10: «нет возврата на шаг назад простого»; 28.10: «Назад и шаг назад должны быть разными
     кнопками»). Шаги блока живут на одной странице: здесь перехватываем «Шаг назад» и ведём на предыдущий шаг.
     «← Назад» шапки (demo-flow.js) выводит из Планировки туда, откуда пришли ── */
  function backStep() {
    var v = st.view;
    /* скан: «Шаг назад» — на первый шаг скана (чтение обрываем, прочитанное остаётся для «Проверить комнаты»); с него — «← Назад» в блок */
    if (RET) {
      if (v === 'reading') return function () { resetLive(); st.view = 'scan'; };
      if (v === 'rooms' && st.pick) return function () { st.pick = null; };
      if (v === 'rooms') return function () { collectNames(); if (st.live) keepLive({ view: 'rooms' }); else keepScan(); st.view = 'scan'; };
      if (v === 'error' || v === 'notplan' || v === 'flats') return function () { stopCountdown(); st.view = 'scan'; };
      return null;
    }
    /* шаг «План» — первый экран (загрузка — окно на нём); прочитанное остаётся: «Проверить комнаты» откроет его без нового запроса */
    if (v === 'zk' || v === 'noplan') return function () { st.view = 'idle'; };
    if (v === 'reading') return function () { resetLive(); st.view = 'idle'; };            /* запрос обрываем — чтение отменено */
    if (v === 'error') return function () { if (st.errKind) { st.errKind = null; st.view = 'brief'; } else { stopCountdown(); st.view = 'idle'; } };
    if (v === 'rooms' && st.pick) return function () { st.pick = null; };                 /* режим тапа «Отметить вход» — как «Отмена» */
    if (v === 'rooms') return function () { collectNames(); if (st.live && st.live.res) keepLive({ view: 'rooms' }); st.view = 'idle'; };
    if (v === 'notplan' || v === 'flats') return function () { st.view = 'idle'; };
    /* с вопросов — на проверку плана; типовой по площади — к площади, типовой из комнат объекта — на первый экран */
    if (v === 'brief' && !st.entry) return function () { st.view = st.typical ? (st.typical.obj ? 'idle' : 'noplan') : 'rooms'; };
    /* «Расставляю мебель»: отменяем переход (go / goLive / pickLayout сверяют st.seq) и возвращаемся туда, откуда расставляли */
    if (v === 'placing') return function () { st.seq++; st.view = st.placingFrom || 'brief'; };
    return null;
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pz-step]'); if (!b) return;
    var f = backStep(); if (!f) return;
    e.stopPropagation(); f(); render(); window.scrollTo(0, 0);
  });
  /* скан и поиск ЖК из блока: «← Назад» — в блок из returnTo, без записи (точка входа Планировки тут ни при чём) */
  root.addEventListener('click', function (e) {
    if (!RET && !ZKRET) return;
    var b = e.target.closest && e.target.closest('[data-pz-back]'); if (!b) return;
    e.stopPropagation(); leave();
  });
  /* один обработчик на все поля файла (data-plan-file): регистрируется один раз, не в bind() — иначе разметка шла дважды.
     Поле очищаем, чтобы тот же файл можно было выбрать снова. В скане это другая картинка того же плана */
  root.addEventListener('change', function (e) {
    var inp = e.target.closest && e.target.closest('input[type=file][data-plan-file]'); if (!inp) return;
    var f = inp.files && inp.files[0]; inp.value = '';
    if (f) acceptPlanFile(f, RET ? { custom: true } : null);
  });
  /* вернулись «Назад» с экрана мебели: страница загрузилась заново — открываем шаг, с которого ушли */
  function restoreBack() {
    if (saved.backTo === 'zk' && saved.zk && ZK && ZK.get(saved.zk.id)) { st.zk = saved.zk.id; st.view = 'zk'; return; }
    if (saved.backTo !== 'brief') return;
    /* «Что ставим» — выбранное человеком (picks); старая запись без picks — все ответы, как раньше */
    st.state = saved.state || 'concrete_walls'; st.answers = saved.picks || saved.answers || {}; st.interior = FLOW.currentInterior ? FLOW.currentInterior() : (saved.interior || null);
    /* ответы этого же прохода — без меток «из объекта»; подставленное SOVEAPP («Пропустить», умолчания) — снова с «подобрано»
       и не считается выбором человека (состояние-умолчание в паспорт не уходит) */
    var au = saved.auto || {};
    st.byUser = {}; st.from = {};
    ['state', 'purpose', 'who', 'guests'].forEach(function (k) { if (au[k]) st.from[k] = 'sove'; else st.byUser[k] = true; });
    if (saved.source) st.source = saved.source;        /* источник плана тоже как был (так восстанавливал «Назад» Алины 27.10) */
    if (saved.typical && saved.rooms) {
      st.typical = { m2: saved.rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0), rooms: saved.rooms.map(function (r) { return { name: r.name, m2: r.m2 }; }) };
    } else {
      var lb = readLiveBack();
      if (lb && lb.res) {
        var lab = saved.live && saved.live.labeled;   /* это уже уменьшенная копия разметки (goLive) — годится и как labeledSmall */
        st.live = liveFromBack(lb, lab);
        st.fileName = lb.file || st.fileName; st.fileSize = lb.size || 0;
        restoreEdits(lb);                             /* подсказки, типы и повороты — как были на «Проверь план» */
      }
      /* названия комнат — только к своему плану, который удалось восстановить, или к примеру: иначе (новая вкладка без sessionStorage)
         на примере PRIDE оказывались названия своего плана и не совпадали с площадями */
      if (st.live || !saved.live) (saved.rooms || []).forEach(function (r, i) { (st.names = st.names || {})[i] = r.name; if (r.type && st.live) (st.types = st.types || {})[i] = r.type; });
    }
    /* состояние сменили в другом блоке (Бюджет, Мой ремонт), пока были на мебели, — паспорт объекта главнее ответа этого прохода
       (тогда и метка «из объекта»); совпало с ответом прохода — как было, без метки */
    var fst = flatState();
    if (fst) {
      var other = fst !== st.state || st.from.state === 'sove';
      st.state = fst;
      if (other) { st.from.state = 'obj'; delete st.byUser.state; } else st.byUser.state = true;
    }
    st.view = 'brief';
  }
  /* свой план из записи sessionStorage (возврат «Назад», перезагрузка): разметка с id проёмов (старые записи без них — дополняем) */
  function liveFromBack(lb, lab) {
    return { res: lb.res ? FLOW.resolveOpenings(lb.res) : null, w: lb.w, h: lb.h, small: lb.img || null, src: lb.img || lab || '', labeled: lab || null,
      labeledSmall: lab || null, key: lb.key || null, kind: lb.kind || 'image', fromServer: !!lb.fromServer, name: lb.file || '' };
  }
  /* перезагрузили страницу на «Проверь план» или на ошибке чтения — тот же экран из записи sessionStorage, а не первая
     страница: файл и разметка не теряются, «Повторить этот же файл» работает из копии. true — экран восстановлен */
  function restoreLiveBack() {
    var lb0 = readLiveBack(); if (!lb0) return false;
    var ok = restoreLiveView(lb0);
    if (ok) st.fileSize = lb0.size || 0;
    return ok;
  }
  function restoreLiveView(lb0) {
    if ((lb0.view === 'rooms' || lb0.view === 'brief') && lb0.res && (lb0.img || lb0.kind !== 'image')) {
      st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.keep = { view: lb0.view }; st.view = 'rooms';
      st.mode = isPoor(quality()) ? '2d' : '3d';
      /* перезагрузили на вопросах своего плана — те же вопросы: известное подставлено, выбранное в «Что ставим» — из ответов квартиры */
      if (lb0.view === 'brief') { prefillBrief(); st.view = 'brief'; }
      return true;
    }
    /* выбор квартиры на листе и «не план» — тоже возвращаем: файл и ответ не теряются */
    if (lb0.view === 'flats' && lb0.res && lb0.img) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.flatPick = null; st.keep = { view: 'flats' }; st.view = 'flats'; return true; }
    if (lb0.view === 'notplan' && lb0.np && (lb0.img || lb0.kind !== 'image')) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; restoreEdits(lb0); st.np = lb0.np; st.keep = { view: 'notplan' }; st.view = 'notplan'; return true; }
    if (lb0.view === 'error' && lb0.err && lb0.img) { st.live = liveFromBack(lb0, null); st.fileName = lb0.file || null; st.err = lb0.err; st.error = lb0.err.text; st.view = 'error'; if (lb0.err.kind === 'minute') startCountdown(60); return true; }
    return false;
  }
  /* скан. Адрес: scan=1 → scan=2 сразу (дальше этот адрес сам чтение не запускает). Прочитанное этой вкладкой для того же
     плана объекта (подпись) — тот же экран без запроса: перезагрузка, рамка телефона, «Назад» / «Вперёд», уход без «Всё верно»
     и новый заход из блока (на свежем заходе прошлую ошибку связи не показываем — читаем заново). Пример — без API, после
     перезагрузки сразу «Проверь план» с исправленными названиями. Свежая ссылка блока — читаем сразу (один платный запрос);
     иначе свой план без записи — шаг 1, читаем только по кнопке «Распознать комнаты» */
  var scanGo = null;
  function initScan() {
    if (SCAN_Q === '1') try { var u = new URL(location.href); u.searchParams.set('scan', '2'); history.replaceState(history.state, '', u.pathname.split('/').pop() + u.search + u.hash); } catch (e) {}
    st.view = 'scan';
    var p = objPlan(); if (!p) { endScan(); dropLive(); return; }
    st.scanOf = planId(p);
    var lb = readLiveBack(), mine = !!(lb && lb.sig && lb.sig === st.scanOf.sig && !isSamplePlan(p));
    if (mine && !(SCAN_START && lb.view === 'error') && restoreLiveBack()) { keepScan(); return; }
    if (lb) dropLive();                               /* прочитан другой план или прошлая ошибка — запись не нужна */
    if (isSamplePlan(p)) {
      var m = !SCAN_START && MARK && MARK.of && MARK.of.sig === st.scanOf.sig && MARK.sample;
      if (m && m.done) { st.sampleDone = true; st.names = m.names || null; st.fileName = p.file || null; st.state = 'concrete_walls'; st.view = 'rooms'; keepScan(); return; }
      scanGo = function () { startScan(false); }; return;
    }
    keepScan();
    /* комнаты уже есть — проверка по сохранённой разметке без запроса или «Комнаты уже в Моём ремонте» */
    if (SCAN_START || (p.rooms && p.rooms.length)) scanGo = function () { startScan(false); };
  }
  var nav = NAV;
  /* итог прошлого скана — для блока, не для Планировки: общий тост окна загрузки здесь не показываем */
  if (S.planUpload && S.planUpload.lastScan) S.planUpload.lastScan(true);
  /* пример уже читали в этой вкладке (запись sove.plan.sampleBack) — повторно не проигрываем, правки названий на месте */
  if (!RET && !ZKRET && (readSampleBack() || {}).done) st.sampleDone = true;
  if (RET) initScan();
  else if (ZKRET) { /* поиск ЖК из блока: всегда первый экран поиска, сценарий Планировки не восстанавливаем */ }
  /* ?back=1 — явный возврат по ссылке, как в «Назад» Алины 27.10 */
  else if ((nav.type === 'back_forward' || Q.get('back') === '1') && st.view === 'idle' && saved.backTo) restoreBack();
  /* Алина 27.10 («Назад из расстановки»): из расстановки — всегда на вопросы, даже если их не проходили
     (в расстановку пришли из Генераций): пример ЖК PRIDE, состояние — сохранённое или по документам («бетон, стены стоят»).
     Свой план, который не удалось сохранить для возврата (saved.live), — как раньше, первый экран */
  else if (Q.get('back') === '1' && st.view === 'idle' && !saved.backTo && !saved.live) { if (saved.state && !flatState()) { st.state = saved.state; st.byUser = { state: true }; } prefillBrief(); st.view = 'brief'; }
  /* перезагрузка на «Проверь план»: свой план — из записи чтения, пример — из своей записи с правками названий */
  else if (nav.type === 'reload' && st.view === 'idle') { if (!restoreLiveBack() && !restoreTypicalBack()) restoreSampleBack(); }
  if (!RET && MARK) endScan();                      /* запись прошлого скана этой вкладки больше не нужна */
  /* браузер вернул страницу из памяти как была — с экраном «Расставляю мебель» или «Читаю план»: показываем шаг до него
     (запрос чтения к этому моменту уже ничей — обрываем) */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    if (st.view === 'placing') { st.view = st.placingFrom || 'idle'; render(); }
    else if (st.view === 'reading') { resetLive(); st.view = RET ? 'scan' : 'idle'; render(); }
  });
  if (scanGo) scanGo(); else render();
})();
