/* Блок 2 «Материалы» (design/materialy/TZ-materialy.md): S3 первый экран → R1 разбор и ДНК → R2 доска отделки
   ↔ R3 замена (шторка) ↔ R4 Маркет с ДНК. Виды — ?v=s3|r1|r2|r4; демо из ленты примеров — &demo=1 (без токенов и паспорта).
   Паспорт квартиры — «Мой ремонт» (repair.js): interior = {type:'own', source, imageUrl, dna, style, level, scope, slots, …}.
   Бюджет — общий (П6): «Материалы» известны только при охвате всей квартиры; та же цифра в полосе «Бюджет».
   Токены — только за доску (раздел 9): 1 помещение 10, 2 — 15, 3 — 20, вся квартира 25; расширить охват — разница. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, ui = S.ui, R = S.repair, KB = window.SOVE_KB, UI = window.SOVE_MATUI;
  var root = document.getElementById('mt-root'); if (!root || !KB || !UI) return;

  var PRICE = { 1: 10, 2: 15, 3: 20, all: 25 };
  var IMG = 'assets/img/materialy/';
  var EXAMPLES = [
    { key: 'living', t: 'гостиная', img: IMG + 'ex-living.jpg', src: IMG + 'render-living.jpg' },
    { key: 'bath', t: 'санузел', img: IMG + 'ex-bath.jpg', src: IMG + 'ex-bath.jpg' },
    { key: 'bedroom', t: 'спальня', img: IMG + 'ex-bedroom.jpg', src: IMG + 'ex-bedroom.jpg' },
    { key: 'hall', t: 'прихожая', img: IMG + 'ex-hall.jpg', src: IMG + 'ex-hall.jpg' }
  ];
  /* короткие имена для строки «не видно на фото» */
  var SHORT = { doors: 'двери', moldings: 'плинтус', ceiling: 'потолок', hardware: 'розетки', light: 'свет', floor: 'пол', floorTile: 'плитка пола', walls: 'стены', accentWall: 'акцентная стена', bathWalls: 'плитка санузла', apron: 'фартук', plumbing: 'сантехника' };
  var SRC_T = { render: 'твой рендер', photo: 'твоё фото', pinterest: 'картинка из Pinterest', project: 'дизайн-проект', scratch: 'собрано с нуля', example: 'пример' };

  var Q = new URLSearchParams(location.search), DEMO = Q.get('demo') === '1';
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ── аналитика (раздел 12): события в localStorage['sove.events'], у каждого zk_id, layout_id, flatId ── */
  function track(name, props) {
    var fl = window.SOVE_FLOW ? window.SOVE_FLOW.load() : {}, zk = fl.zk || {}, f = R.flats.active();
    var ev = Object.assign({ name: name, ts: Date.now(), zk_id: zk.id || null, layout_id: zk.layout || null, flatId: f ? f.id : null, demo: DEMO }, props || {});
    try { var a = JSON.parse(localStorage.getItem('sove.events') || '[]'); a.push(ev); localStorage.setItem('sove.events', JSON.stringify(a.slice(-500))); } catch (e) {}
  }

  /* ── паспорт ── */
  function passport() { var f = R.flats.active(), it = f ? R.get().interior : null; return it && it.type === 'own' && it.slots ? it : null; }
  function planInfo() {
    var f = R.flats.active(), r = f ? R.get() : {}, m2 = r.plan && r.plan.rooms ? r.plan.rooms.reduce(function (a, x) { return a + (x.m2 || 0); }, 0) : 0;
    if (m2) return { exact: true, area: Math.round(m2 * 10) / 10 };
    if (f && f.m2) return { exact: false, area: f.m2 };
    return { exact: false, area: KB.AREA };
  }
  /* сумма слота на площадь квартиры: данные ТЗ — на 47 м², иначе пропорционально */
  function scaleSlots(slots, area) {
    Object.keys(slots).forEach(function (k) {
      var it = KB.item(slots[k].sku); if (!it) return;
      var fx = it.unit === 'компл.' || area === KB.AREA ? 1 : area / KB.AREA;
      slots[k].sum = fx === 1 ? it.sum : Math.round(it.sum * fx / 100) * 100;
      slots[k].qty = fx === 1 ? it.qty : Math.round(it.qty * fx * 10) / 10;
      slots[k].price = it.price; slots[k].unit = it.unit; slots[k].level = it.level;
    });
    return slots;
  }

  /* суммы переключателя: вся доска на База / на Премиум на площадь квартиры */
  function levelSums(area) {
    var one = function (lv) { var s = {}; KB.SLOTS.forEach(function (x) { s[x.key] = KB.slotEntry(KB.mainFor(x.key, lv)); }); return KB.sum(scaleSlots(s, area)); };
    return { base: one('base'), premium: one('premium') };
  }

  /* состояние экрана: черновик разбора (до оплаты доски) — в sessionStorage; доска — в паспорте или в демо */
  var draft = ss('sove.mat.draft') || null;
  var board = DEMO ? ss('sove.mat.demo') : passport();
  var st = { view: Q.get('v') || null, open: null, sel: {}, swap: null, mk: { dnaOn: true, onlyOk: false, level: null, sort: null, q: '' }, picked: null };
  if (!st.view) st.view = board && !DEMO ? 'r2' : 's3';
  if ((st.view === 'r2' || st.view === 'r4') && !board) st.view = draft && draft.analysis ? 'r1' : 's3';
  if (st.view === 'r1' && !draft) st.view = 's3';

  function go(v, extra) { location.href = 'materialy.html?v=' + v + (DEMO ? '&demo=1' : '') + (extra || ''); }
  function balance() { return S.auth.isIn() ? S.tokens.balance() : S.data.gift.tokens; }

  /* ── шапка блока: «← Назад» · токены · «Материалы» · 4 сегмента, «шаг 2 из 4» ── */
  function head() {
    var rt = encodeURIComponent('materialy.html' + location.search);
    return '<header class="pz-head"><div class="pz-head__top"><button type="button" class="pz-back" data-pz-back>← Назад</button>' +
      '<a class="pz-tok" href="tokens.html?returnTo=' + rt + '">' + esc(F.tokens(balance())) + ' 🎁</a></div>' +
      '<h1 class="pz-head__t">Материалы</h1>' +
      '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow="2"><span class="pz-bar__i is-done"></span><span class="pz-bar__i is-now"></span><span class="pz-bar__i"></span><span class="pz-bar__i"></span><small>шаг 2 из 4</small></div></header>';
  }
  function dnaStrip(dna) { return '<span class="mt-dna">' + dna.map(function (c) { return '<i style="background:' + c.hex + '"></i>'; }).join('') + '</span>'; }
  function upload(label, cls, src) { return '<label class="' + cls + '">' + label + '<input type="file" accept="image/*" hidden data-up="' + (src || 'render') + '"></label>'; }

  /* ════════ S3 · первый экран ════════ */
  function viewS3() {
    var demo = scaleSlots(KB.complete(KB.DNA, KB.FOUND, 'premium'), KB.AREA), pl = planInfo();
    var hasPlan = pl.exact || !!(window.SOVE_FLOW && window.SOVE_FLOW.load().toSave);
    return head() +
      '<div class="mt-hero"><h2 class="mt-h2">Нравится интерьер? Вот из чего он</h2><p class="mt-sub">сдвинь — увидишь материалы любой картинки с ценами</p></div>' +
      '<div class="ba" data-ba style="--pos:46%">' +
        '<div class="ba__under">' + UI.materialsBoard(demo, KB.DNA, { height: 480, pills: true, noDna: true, cls: 'mb--flat' }) + '</div>' +
        '<div class="ba__over"><img src="' + IMG + 'render-living.jpg" alt="Рендер гостиной в тёплой неоклассике" draggable="false"></div>' +
        '<span class="ba__lbl ba__lbl--l">РЕНДЕР</span><span class="ba__lbl ba__lbl--r">МАТЕРИАЛЫ</span>' +
        '<div class="ba__line"><span class="ba__knob" role="slider" tabindex="0" aria-label="Рендер или материалы" aria-valuemin="10" aria-valuemax="90" aria-valuenow="46">‹ ›</span></div>' +
        '<div class="ba__bar">' + dnaStrip(KB.DNA) + '<small>ДНК · 12 МАТЕРИАЛОВ · 1 ПОМЕЩЕНИЕ</small><b>10 🎟</b></div>' +
      '</div>' +
      upload('⇪ Загрузить рендер или фото', 'mt-btn') +
      '<div class="mt-ladder" role="list" aria-label="Цена доски по охвату">' +
        [[10, '1 помещение'], [15, '2 помещения'], [20, '3 помещения'], [25, 'вся квартира']].map(function (x, i) {
          return '<span class="mt-ladder__i' + (i ? '' : ' is-on') + '" role="listitem"><b>' + x[0] + ' 🎟</b><small>' + x[1] + '</small></span>'; }).join('') + '</div>' +
      '<div class="mt-ex"><div class="mt-ex__row">' + EXAMPLES.map(function (e) {
        return '<button type="button" class="mt-ex__i" data-example="' + e.key + '" aria-label="Пример: ' + e.t + '"><img src="' + e.img + '" alt="" loading="lazy"><small>' + e.t + '</small></button>'; }).join('') + '</div>' +
        '<p class="mt-note">или попробуй на примере — нажми на картинку</p></div>' +
      (hasPlan ? '<div class="mt-plan mt-plan--ok"><b>✓ План есть — посчитаем материалы точно</b></div>'
        : '<section class="mt-plan"><img class="mt-plan__img" src="' + IMG + 'mini-plan.jpg" alt="" loading="lazy">' +
          '<div class="mt-plan__t"><b>Посчитать бюджет материалов</b><p>загрузи план или дизайн-проект (чертежи и рендеры) — разберём материалы с рендеров, метраж с чертежей и посчитаем сумму</p>' +
          '<div class="mt-plan__btns"><a class="mt-btn2" href="plan-demo.html" data-plan-up>⇪ План квартиры</a>' +
          '<label class="mt-btn2">⇪ Дизайн-проект<input type="file" accept="application/pdf,image/*" hidden data-up="project"></label></div>' +
          '<small>бесплатно · можно позже · бюджет сразу попадёт в Мой ремонт</small></div></section>') +
      '<p class="mt-gift">50 🎟 в подарок — хватит на всю квартиру · <button type="button" class="mt-link" data-scratch>нет картинки? собрать с нуля ›</button></p>';
  }

  /* ════════ R1 · разбор и ДНК ════════ */
  function viewR1() {
    var d = draft, a = d.analysis;
    if (d.error) return head() + '<section class="mt-err"><img src="' + esc(d.img) + '" alt=""><b>Не видим интерьер на картинке — попробуй другую</b>' + upload('⇪ Другая картинка', 'mt-btn') +
      '<button type="button" class="mt-link" data-example="living">или возьми пример</button></section>';
    if (!a) return head() + '<section class="mt-load"><div class="mt-r1img"><img src="' + esc(d.img) + '" alt="Твоя картинка"><i class="mt-skel"></i></div>' +
      '<div class="mt-skel-row"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="mt-load__t">Разбираем ДНК… 3 сек</b></section>';
    var scratch = d.source === 'scratch', sc = d.scope || { n: 'all', rooms: [] }, cost = PRICE[sc.n];
    var foundKeys = scratch ? [] : Object.keys(a.found || {}), lv = a.level || 'base';
    var miss = ['doors', 'moldings', 'ceiling', 'hardware', 'light'].concat(KB.SLOTS.map(function (s) { return s.key; }))   /* порядок строки — как в ТЗ */
      .filter(function (k, i, a) { return a.indexOf(k) === i && foundKeys.indexOf(k) < 0; }).map(function (k) { return SHORT[k]; });
    var rooms = R.rooms();
    return head() +
      (scratch ? '' : '<div class="mt-r1img mt-r1img--done"><img src="' + esc(d.img) + '" alt="Твоя картинка"><span class="mt-tag">' + (d.source === 'photo' ? 'ТВОЁ ФОТО' : 'ТВОЙ РЕНДЕР') + ' · РАЗОБРАН ЗА ' + Math.max(1, Math.round((a.ms || 3000) / 1000)) + ' СЕК</span></div>') +
      (scratch ? scratchQs(d) : '') +
      '<section class="mt-sec"><h2 class="mt-h2 mt-h2--30">ДНК твоего интерьера</h2><p class="mt-sub">' + esc(a.style) + ' · 7 цветов, вокруг которых строится вся отделка</p>' +
        '<div class="mt-plaster">' + UI.dnaFan(a.dna, { picked: st.picked }) + '</div>' +
        (st.picked !== null ? '<div class="mt-shades" role="group" aria-label="Соседние оттенки"><small>' + esc(a.dna[st.picked].name) + ' — выбери оттенок</small><div>' +
          UI.dnaShades(a.dna[st.picked].hex).map(function (h) { return '<button type="button" data-shade="' + h + '" style="background:' + h + '" aria-label="Оттенок ' + h + '"></button>'; }).join('') + '</div></div>' : '') +
        '<p class="mt-share">60% основа · 30% второй цвет · 10% акцент</p></section>' +
      (scratch ? '' : '<section class="mt-sec"><h3 class="mt-h3">Нашли на картинке · ' + foundKeys.length + ' из 12 · <span>чистовая отделка</span></h3><div class="mt-found">' +
        KB.SLOTS.filter(function (s) { return foundKeys.indexOf(s.key) >= 0; }).map(function (s) {
          var it = KB.mainFor(s.key, lv), c = KB.dnaColor(a.dna, s.dna);
          return '<div class="mt-found__i">' + UI.sampleTile(it, 74, 60, { shape: 'rect', thickness: 3 }) + '<b>' + esc(s.name + ' · ' + (c ? c.name.toLowerCase() : '')) + '</b><small>✓ ' + Math.round(a.found[s.key].confidence * 100) + '%</small></div>';
        }).join('') + '</div><p class="mt-note">не видно на фото: ' + esc(miss.join(', ')) + ' — подберёт SOVE под ДНК</p></section>') +
      '<section class="mt-sec"><h3 class="mt-h3">Сколько помещений собрать</h3><div class="mt-scope">' +
        [[1, '1 помещение'], [2, '2'], [3, '3'], ['all', 'Вся квартира']].map(function (x) {
          return '<button type="button" class="chip' + (sc.n == x[0] ? ' is-on' : '') + '" data-scope="' + x[0] + '" aria-pressed="' + (sc.n == x[0]) + '">' + x[1] + ' · ' + PRICE[x[0]] + ' 🎟</button>'; }).join('') + '</div>' +
        (sc.n !== 'all' ? '<div class="mt-rooms"><small>какие — выбери ' + sc.n + '</small><div>' + rooms.map(function (r) {
          var on = sc.rooms.indexOf(r.name) >= 0; return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-room="' + esc(r.name) + '" aria-pressed="' + on + '">' + esc(r.name) + '</button>'; }).join('') + '</div></div>' : '') +
      '</section>' +
      '<button type="button" class="mt-btn" data-build' + (sc.n !== 'all' && sc.rooms.length !== sc.n ? ' disabled' : '') + '>Собрать доску отделки · ' + cost + ' 🎟</button>' +
      '<p class="mt-note mt-c">разбор ДНК бесплатно · у тебя ' + balance() + ' 🎟</p>';
  }
  /* «С нуля»: 3 вопроса вместо картинки (раздел 5.2) */
  function scratchQs(d) {
    var a = d.answers || {};
    var q = function (key, opts) { return '<div class="mt-q">' + opts.map(function (o) { return '<button type="button" class="chip' + (a[key] === o ? ' is-on' : '') + '" data-ans="' + key + '" data-v="' + o + '" aria-pressed="' + (a[key] === o) + '">' + o + '</button>'; }).join('') + '</div>'; };
    var off = (a.light && a.light !== 'светлое') || (a.temp && a.temp !== 'тёплое') || (a.base && a.base !== 'дерево');
    return '<section class="mt-sec"><h2 class="mt-h2 mt-h2--30">Собрать с нуля</h2><p class="mt-sub">три вопроса — и SOVE соберёт ДНК</p>' +
      q('light', ['светлое', 'тёмное']) + q('temp', ['тёплое', 'холодное']) + q('base', ['дерево', 'камень']) +
      (off ? '<p class="mt-note">в прототипе оцифрована одна ДНК — тёплая неоклассика; показываем её</p>' : '') + '</section>';
  }

  /* ════════ R2 · доска отделки ════════ */
  function boardState() { return { slots: board.slots, dna: board.dna, exact: planInfo().exact }; }
  function viewR2() {
    var b = board, whole = !b.scope || b.scope.whole, pl = planInfo(), lv = KB.levelOf(b.slots), bad = KB.SLOTS.filter(function (s) { return b.slots[s.key].ok === false; });
    return head() +
      '<div class="mt-src"><span>' + esc(SRC_T[b.source] || 'твой рендер') + (b.ms ? ' · разобрали за ' + Math.max(1, Math.round(b.ms / 1000)) + ' сек' : '') + '</span>' +
        '<b>' + esc(cap(b.style || KB.STYLE)) + '</b>' + (DEMO ? '<em>пример · без токенов</em>' : upload('Другое фото', 'mt-link')) + '</div>' +
      '<div class="mt-boardwrap">' + UI.materialsBoard(b.slots, b.dna, { style: b.style }) + '</div>' +
      (whole ? UI.levelSwitch(lv, { exact: pl.exact, sum: KB.sum(b.slots), sums: levelSums(pl.area) }) : '<div class="lv lv--off" role="group" aria-label="Уровень бюджета">' +
        '<button type="button" data-level="base" aria-pressed="' + (lv === 'base') + '"><b>База</b></button><button type="button" data-level="premium" aria-pressed="' + (lv === 'premium') + '"><b>Премиум</b></button><button type="button" data-level="mixed" aria-pressed="' + (lv === 'mixed') + '"><b>Своё</b><small>смешать</small></button></div>') +
      (bad.length ? '<button type="button" class="mt-check is-bad" data-open="' + bad[0].key + '">! ' + bad.length + ' ' + plural(bad.length, 'материал выбивается', 'материала выбиваются', 'материалов выбиваются') + ' из ДНК — посмотреть</button>'
        : '<p class="mt-check">✓ все 12 материалов в цветах одной ДНК — сочетаются</p>') +
      (whole ? '' : '<div class="mt-part"><span>Доска на ' + b.scope.rooms.length + ' из ' + R.rooms().length + ' зон: ' + esc(b.scope.rooms.join(', ')) + '. Суммы — когда доска на всю квартиру.</span>' +
        '<button type="button" class="mt-btn2" data-extend>Достроить квартиру · ' + (PRICE.all - (b.tokensSpent || 0)) + ' 🎟</button></div>') +
      (whole ? UI.specList(b.slots, b.dna, { exact: pl.exact, open: st.open, sel: st.sel, demo: DEMO }) : unitSpec(b)) +
      (Object.keys(st.sel).length ? '<button type="button" class="mt-btn2 mt-wide" data-cart-sel>В корзину · выбрано ' + Object.keys(st.sel).length + '</button>' : '') +
      '<div class="mt-actions">' +
        (DEMO ? upload('⇪ Собрать по своей картинке', 'mt-btn2') : '<button type="button" class="mt-btn2" data-save>' + (b.savedAt ? '✓ Сохранено в Мой ремонт' : 'Сохранить в Мой ремонт') + '</button>') +
        '<button type="button" class="mt-btn2" data-story>✦ Мудборд для сторис · [N] 🎟</button>' +
        '<a class="mt-btn" href="result.html" data-next>Дальше: визуализации →</a></div>';
  }
  /* доска не на всю квартиру: цены за единицу, без сумм (раздел 10) */
  function unitSpec(b) {
    return '<section class="sp"><div class="sp__h"><b>Чистовая отделка · 12</b><small>цены за единицу</small></div>' + KB.SLOTS.map(function (s) {
      var it = KB.item(b.slots[s.key].sku), c = KB.dnaColor(b.dna, s.dna);
      return '<div class="sp-row"><span class="sp-row__main">' + UI.sampleTile(it, 44, 44, { shape: s.shape === 'circle' ? 'circle' : 'rect', thickness: 3 }) +
        '<span class="sp-row__t"><b><i class="sp-dot" style="background:' + (c ? c.hex : '#ccc') + '"></i>' + esc(UI.slotLabel(s, b.dna)) + '</b><small>' + esc(it.name) + '</small></span>' +
        '<span class="sp-row__sum">' + UI.unitPrice(it) + '</span></span><button type="button" class="sp-row__swap" data-swap="' + s.key + '">⇄ заменить</button></div>';
    }).join('') + '</section>';
  }

  /* ════════ R4 · Маркет с ДНК ════════ */
  function viewR4() {
    var slot = KB.slot(Q.get('slot')) ? Q.get('slot') : 'floor', s = KB.slot(slot);
    return '<header class="pz-head mk-head"><div class="pz-head__top"><button type="button" class="pz-back" data-to-board>← К доске</button>' +
      '<span class="pz-tok">' + esc(F.tokens(balance())) + ' 🎁</span></div><h1 class="pz-head__t">Маркет · ' + esc(s.name) + '</h1></header>' +
      '<div data-mk-body>' + UI.marketDnaFilter(slot, Object.assign({}, st.mk, boardState())) + '</div>';
  }

  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, a, b, c) { var m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }

  function render() {
    root.innerHTML = st.view === 'r1' ? viewR1() : st.view === 'r2' ? viewR2() : st.view === 'r4' ? viewR4() : viewS3();
    var ba = root.querySelector('[data-ba]');
    if (ba) UI.beforeAfterSlider(ba, { start: 46, min: 10, max: 90, onDrag: function (p, moved) { if (moved) track('mat_slider_drag', { pos: Math.round(p) }); } });
    if (st.view === 'r2' && Q.get('swap') && !st.swap) openSwap(Q.get('swap'));
  }

  /* ── загрузка картинки → R1: сжимаем до 1000 px, разбор (бесплатно) ── */
  function readFile(file, source) {
    if (source === 'project' && /pdf/i.test(file.type)) {
      track('mat_project_upload', { kind: 'pdf' });
      ui.toast('Дизайн-проект PDF разберём на сервере: рендеры по зонам, метраж с чертежей. В прототипе — загрузи рендер картинкой');
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        startAnalysis(c.toDataURL('image/jpeg', .82), source === 'project' ? 'project' : /pinterest/i.test(file.name) ? 'pinterest' : source === 'render' ? 'render' : 'photo');
      };
      im.onerror = function () { draft = { img: '', source: source, error: true }; ss('sove.mat.draft', draft); go('r1'); };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function startAnalysis(img, source) {
    track('mat_upload', { source: source });
    draft = { img: img, source: source, analysis: null, scope: { n: 'all', rooms: [] } }; ss('sove.mat.draft', draft);
    if (DEMO || st.view !== 'r1') { location.href = 'materialy.html?v=r1'; return; }
    render(); analyze();
  }
  function analyze() {
    if (!draft || draft.analysis || draft.error || draft.source === 'scratch') return;
    KB.analyzeInterior(draft.img).then(function (a) {
      draft.analysis = a; ss('sove.mat.draft', draft); track('mat_dna_ready', { ms: a.ms, source: draft.source }); render();
    }).catch(function () { draft.error = true; ss('sove.mat.draft', draft); render(); });
  }

  /* ── R1 → доска: окно списания (как «Варианты стен» Планировки), резерв → списано ── */
  function buildSheet(cost, title, done) {
    var inn = S.auth.isIn(), bal = balance(), enough = bal >= cost, rt = encodeURIComponent('materialy.html' + location.search);
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="mt-sheet-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="mt-sheet-t">' + esc(title) + '</b><small class="pz-sheet__s">12 материалов чистовой отделки под твою ДНК · замены и уровни потом бесплатно</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + cost + ' 🎟</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(F.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough ? '<button type="button" class="pz-btn" data-sheet="go">' + (inn ? 'Собрать · ' : 'Войти и собрать · ') + cost + ' 🎟</button>'
              : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      if (!e.target.closest('[data-sheet="go"]')) return;
      close();
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      var op = S.tokens.reserve(cost, title, 'materials'); if (!op) { ui.toast('Не хватает токенов'); return; }
      S.tokens.commit(op); done(cost);
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var f = back.querySelector('.pz-btn'); if (f) f.focus();
  }
  function build() {
    var a = draft.analysis, sc = draft.scope, cost = PRICE[sc.n];
    buildSheet(cost, 'Доска отделки · ' + (sc.n === 'all' ? 'вся квартира' : sc.n + ' ' + plural(sc.n, 'помещение', 'помещения', 'помещений')), function (paid) {
      var pl = planInfo(), slots = scaleSlots(KB.complete(a.dna, draft.source === 'scratch' ? {} : a.found, a.level || 'base'), pl.area);
      board = { type: 'own', source: draft.source, imageUrl: draft.source === 'scratch' ? null : draft.img, dna: a.dna, style: a.style, level: KB.levelOf(slots),
        scope: { rooms: sc.n === 'all' ? R.rooms().map(function (r) { return r.name; }) : sc.rooms, whole: sc.n === 'all' }, slots: slots,
        boardGeneratedAt: Date.now(), tokensSpent: paid, ms: a.ms, name: 'Свой интерьер · ' + a.style, img: draft.source === 'scratch' ? null : draft.img };
      persist(); ss('sove.mat.draft', null);
      track('mat_board_generated', { scope: sc.n, rooms: board.scope.rooms, tokens: paid });
      go('r2');
    });
  }
  /* паспорт: interior квартиры в Моём ремонте; бюджет «Материалы» = сумма слотов (только вся квартира) */
  function persist() {
    board.level = KB.levelOf(board.slots); board.materialsSum = KB.sum(board.slots); board.ts = Date.now();
    if (!DEMO) board.productIds = KB.SLOTS.map(function (s) { return UI.product(KB.item(board.slots[s.key].sku)).id; });
    if (DEMO) { ss('sove.mat.demo', board); return; }
    var f = R.flats.ensure(), r = R.get(f.id); r.interior = board; R.flats.update(f.id, {});
  }

  /* ── замена слота (R3 / R4): образец, сумма, паспорт; «Отменить» возвращает прежнее ── */
  function swapTo(slot, sku, from) {
    var prev = JSON.parse(JSON.stringify(board.slots[slot])), it = KB.item(sku), s = KB.slot(slot), lv0 = KB.levelOf(board.slots);
    board.slots[slot] = KB.slotEntry(it, 'user', null);
    scaleSlots(board.slots, planInfo().area); KB.recheck(board.slots, board.dna); persist();
    var e = board.slots[slot];
    track('mat_swap_done', { slot: slot, level: it.level, ok: e.ok, from: from });
    if (lv0 !== KB.levelOf(board.slots) && KB.levelOf(board.slots) === 'mixed') track('mat_level_switch', { level: 'mixed', auto: true });
    return { text: s.name + ' заменён' + (/а$/.test(s.name) ? 'а' : '') + ' · ' + (e.ok ? '✓ сочетается' : '! ' + e.reason), slot: slot, prev: prev };
  }
  function undoToast(t) {
    R.toast(t.text, { label: 'Отменить', onClick: function () {
      board.slots[t.slot] = t.prev; KB.recheck(board.slots, board.dna); persist(); render(); ui.toast('Вернули как было', 'ok');
    } });
  }

  /* ── R3 шторка ── */
  function openSwap(slot) {
    st.swap = { slot: slot, dnaOnly: true, material: null };
    track('mat_swap_open', { slot: slot });
    var back = document.createElement('div'); back.className = 'sw-back'; back.innerHTML = '<div class="sw" role="dialog" aria-modal="true" aria-label="Замена материала"><i class="pz-sheet__grip"></i><div data-sw-body></div></div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var mbt = root.querySelector('.mb'); if (mbt) mbt.classList.add('is-dim');
    function paint() { back.querySelector('[data-sw-body]').innerHTML = UI.swapSheet(slot, Object.assign({ dnaOnly: st.swap.dnaOnly, material: st.swap.material }, boardState())); }
    function close() { back.remove(); document.body.style.overflow = ''; st.swap = null; history.replaceState(null, '', 'materialy.html?v=r2' + (DEMO ? '&demo=1' : '')); var m = root.querySelector('.mb'); if (m) m.classList.remove('is-dim'); }
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.closest('[data-sw-close]')) return close();
      var b;
      if ((b = e.target.closest('[data-sw-dna]'))) { st.swap.dnaOnly = !st.swap.dnaOnly; return paint(); }
      if ((b = e.target.closest('[data-sw-mat]'))) { var m = b.getAttribute('data-sw-mat'); st.swap.material = st.swap.material === m ? null : m; return paint(); }
      if ((b = e.target.closest('[data-pick]'))) {
        var sku = b.getAttribute('data-pick'); if (board.slots[slot].sku === sku) return close();
        var t = swapTo(slot, sku, 'sheet'); close(); render(); undoToast(t); return;
      }
      if ((b = e.target.closest('[data-market]'))) { close(); track('mat_market_open', { slot: slot }); go('r4', '&slot=' + slot); }
    });
    history.replaceState(null, '', 'materialy.html?v=r2&swap=' + slot + (DEMO ? '&demo=1' : ''));
    paint();
  }

  /* ── события ── */
  root.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-up]'); if (inp && inp.files && inp.files[0]) { readFile(inp.files[0], inp.getAttribute('data-up')); inp.value = ''; return; }
    if (e.target.closest('[data-mk-ok]')) { st.mk.onlyOk = e.target.checked; paintMk(); }
  });
  root.addEventListener('input', function (e) { if (e.target.closest('[data-mk-q]')) { st.mk.q = e.target.value; clearTimeout(paintMk.t); paintMk.t = setTimeout(function () { paintMk(true); }, 200); } });
  function paintMk(keepFocus) {
    var body = root.querySelector('[data-mk-body]'); if (!body) return;
    var pos = keepFocus ? root.querySelector('[data-mk-q]').selectionStart : null;
    body.innerHTML = UI.marketDnaFilter(Q.get('slot') || 'floor', Object.assign({}, st.mk, boardState()));
    if (keepFocus) { var q = root.querySelector('[data-mk-q]'); q.focus(); q.setSelectionRange(pos, pos); }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button, a, [data-example]'); if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-example')) {
      var ex = EXAMPLES.filter(function (x) { return x.key === b.getAttribute('data-example'); })[0] || EXAMPLES[0];
      track('mat_example_open', { example: ex.key });
      /* демо R2: доска примера без токенов и паспорта */
      var demo = { type: 'own', source: 'example', imageUrl: ex.src, dna: KB.DNA, style: KB.STYLE, scope: { rooms: [], whole: true },
        slots: scaleSlots(KB.complete(KB.DNA, KB.FOUND, 'premium'), KB.AREA), ms: 2600 };
      ss('sove.mat.demo', demo); location.href = 'materialy.html?v=r2&demo=1'; return;
    }
    if (b.hasAttribute('data-scratch')) {
      track('mat_upload', { source: 'scratch' });
      draft = { img: null, source: 'scratch', answers: { light: 'светлое', temp: 'тёплое', base: 'дерево' }, scope: { n: 'all', rooms: [] },
        analysis: { dna: KB.DNA.map(function (c) { return Object.assign({}, c); }), style: KB.STYLE, level: 'base', found: {}, ms: 0 } };
      ss('sove.mat.draft', draft); location.href = 'materialy.html?v=r1'; return;
    }
    if (b.hasAttribute('data-plan-up')) { track('mat_plan_upload', {}); return; }
    if (b.hasAttribute('data-ans')) { draft.answers[b.getAttribute('data-ans')] = b.getAttribute('data-v'); ss('sove.mat.draft', draft); return render(); }
    if (b.hasAttribute('data-dna')) { var i = +b.getAttribute('data-dna'); st.picked = st.picked === i ? null : i; return render(); }
    if (b.hasAttribute('data-shade')) {
      var c = draft.analysis.dna[st.picked]; c.hex = b.getAttribute('data-shade'); ss('sove.mat.draft', draft);
      track('mat_dna_color_edit', { color: c.key, hex: c.hex }); return render();
    }
    if (b.hasAttribute('data-scope')) {
      var n = b.getAttribute('data-scope'); draft.scope = { n: n === 'all' ? 'all' : +n, rooms: [] }; ss('sove.mat.draft', draft);
      track('mat_scope_select', { scope: n }); return render();
    }
    if (b.hasAttribute('data-room')) {
      var nm = b.getAttribute('data-room'), rs = draft.scope.rooms, k = rs.indexOf(nm);
      if (k >= 0) rs.splice(k, 1); else { rs.push(nm); if (rs.length > draft.scope.n) rs.shift(); }
      ss('sove.mat.draft', draft); return render();
    }
    if (b.hasAttribute('data-build')) return build();
    /* R2 */
    if (b.closest('.mb-tile')) { var sl = b.closest('.mb-tile').getAttribute('data-slot'); return openSwap(sl); }
    if (b.hasAttribute('data-swap')) return openSwap(b.getAttribute('data-swap'));
    if (b.hasAttribute('data-open')) { var o = b.getAttribute('data-open'); st.open = st.open === o ? null : o; render(); var row = root.querySelector('[data-row="' + o + '"]'); if (row && b.classList.contains('mt-check')) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (b.hasAttribute('data-check')) { var ck = b.getAttribute('data-check'); if (st.sel[ck]) delete st.sel[ck]; else st.sel[ck] = 1; return render(); }
    if (b.hasAttribute('data-cart-sel')) {
      var nAdd = 0; Object.keys(st.sel).forEach(function (k2) { var p = UI.product(KB.item(board.slots[k2].sku)); if (!R.cart.has(p.id)) { R.cart.add(p.id, 'materials', true); nAdd++; } });
      R.flats.update(R.flats.ensure().id, {});
      R.toast('В корзине · ' + nAdd + ' ' + plural(nAdd, 'материал', 'материала', 'материалов'), { label: 'Открыть', href: 'my.html?v=basket' });
      track('mat_add_to_cart', { n: nAdd }); st.sel = {}; return render();
    }
    if (b.hasAttribute('data-level')) {
      var lv = b.getAttribute('data-level');
      if (lv === 'mixed') { if (KB.levelOf(board.slots) !== 'mixed') ui.toast('Замени любой материал на другой уровень — включится «Своё»'); return; }
      var mb = root.querySelector('.mb'); if (mb) mb.classList.add('is-flip');
      setTimeout(function () {
        KB.SLOTS.forEach(function (s) { var cur = board.slots[s.key]; board.slots[s.key] = KB.slotEntry(KB.mainFor(s.key, lv), cur.source === 'user' ? 'sove' : cur.source, cur.confidence); });
        scaleSlots(board.slots, planInfo().area); KB.recheck(board.slots, board.dna); persist(); track('mat_level_switch', { level: lv }); render();
        var m2 = root.querySelector('.mb'); if (m2) { m2.classList.add('is-flip-in'); setTimeout(function () { m2.classList.remove('is-flip-in'); }, 160); }
      }, 150);
      return;
    }
    if (b.hasAttribute('data-save')) {
      persist(); board.savedAt = Date.now(); persist(); track('mat_save', {});
      R.toast('Заодно собрали: ✓ ДНК и 12 материалов отделки → Мой ремонт · Материалы', { label: 'Открыть', href: 'my.html#sec-interior' }); return render();
    }
    if (b.hasAttribute('data-story')) { ui.toast('Мудборд для сторис — цену назначим, кнопка заработает'); return; }
    if (b.hasAttribute('data-next')) { track('mat_next', {}); return; }
    if (b.hasAttribute('data-extend')) {
      var diff = PRICE.all - (board.tokensSpent || 0);
      buildSheet(diff, 'Достроить квартиру', function (paid) {
        board.scope = { rooms: R.rooms().map(function (r) { return r.name; }), whole: true }; board.tokensSpent = (board.tokensSpent || 0) + paid;
        persist(); track('mat_scope_select', { scope: 'all', extend: true }); render(); ui.toast('Доска на всю квартиру · суммы в бюджете', 'ok');
      });
      return;
    }
    /* R4 */
    if (b.hasAttribute('data-to-board')) return go('r2');
    if (b.hasAttribute('data-mk-dna')) { st.mk.dnaOn = !st.mk.dnaOn; return paintMk(); }
    if (b.hasAttribute('data-mk-level')) { var l = b.getAttribute('data-mk-level'); st.mk.level = st.mk.level === l ? null : l; return paintMk(); }
    if (b.hasAttribute('data-mk-sort')) { st.mk.sort = st.mk.sort === 'asc' ? 'desc' : st.mk.sort === 'desc' ? null : 'asc'; return paintMk(); }
    if (b.hasAttribute('data-mk-brand')) { ui.toast('Бренды появятся, когда материалы придут из каталога Маркета'); return; }
    if (b.hasAttribute('data-mk-take')) {
      var slot = Q.get('slot') || 'floor', t = swapTo(slot, b.getAttribute('data-mk-take'), 'market');
      track('mat_market_add', { slot: slot, sku: b.getAttribute('data-mk-take') });
      ss('sove.mat.toast', t); go('r2'); return;
    }
  });

  if (st.view === 'r2' && !DEMO && board && !board.ts) persist();
  track('mat_open', { entry: Q.get('from') || (document.referrer ? document.referrer.split('/').pop().split('?')[0] : 'direct'), view: st.view });
  render();
  if (st.view === 'r1') analyze();
  var pend = st.view === 'r2' ? ss('sove.mat.toast') : null; if (pend) { ss('sove.mat.toast', null); setTimeout(function () { undoToast(pend); }, 300); }
})();
