/* Генерации — «+ Создать» по референсу Вики 23.10 («SOVEAPP — Генерации», экраны 2–4):
   Новая генерация (тип, помещение, стиль, палитра, уровень, план/референсы) → 4 варианта → выбранный вариант.
   В демо варианты собираются из капсул SOVEAPP: картинки, материалы и бюджет — настоящие данные капсул,
   порядок — по стилю и близости палитры. Токены не списываются. Виды: ?v=form | variants | pick. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, G = window.SOVE_GEN, R = S.repair;
  var root = document.getElementById('gn-root'); if (!root || !G) return;
  var KEY = 'sove.gen.new';
  var view = ui.qs('v') || 'form';

  var TYPES = [
    { id: 'plan', t: 'План в 3D', ic: 'cube' }, { id: 'capsule', t: 'Капсула', ic: 'sofa' }, { id: 'own', t: 'Своя капсула', ic: 'sliders' },
    { id: 'moodboard', t: 'Мудборд', ic: 'image' }, { id: 'room', t: 'Комната', ic: 'bed' }
  ];
  var ROOMS = ['Вся квартира', 'Гостиная', 'Кухня', 'Спальня', 'Детская', 'Ванная', 'Другое'];
  /* стиль → капсула SOVEAPP, на которой он показан */
  var STYLES = [
    { id: 'modern', t: 'Современный', cap: 'k7' }, { id: 'minimal', t: 'Минимализм', cap: 'k3' }, { id: 'classic', t: 'Классика', cap: 'k4' },
    { id: 'neo', t: 'Неоклассика', cap: 'k2' }, { id: 'organic', t: 'Органика', cap: 'k5' }, { id: 'art', t: 'Арт-классика', cap: 'k1' }
  ];
  var PALETTE = [
    { c: '#A4553B', t: 'Терракота' }, { c: '#E3D3C2', t: 'Песочный' }, { c: '#D9D7D3', t: 'Светло-серый' }, { c: '#5C6042', t: 'Оливковый' }, { c: '#2F2B28', t: 'Графит' }
  ];
  /* ⚠️ в макете «Эконом / Комфорт / Премиум»; у SOVEAPP два уровня комплектации — как в расчёте и классификаторе */
  var LEVELS = [{ id: 'base', t: 'Базовый' }, { id: 'premium', t: 'Премиум' }];
  var LETTERS = 'ABCD';
  var MAX_MB = 20;

  function blank() { return { type: 'capsule', room: 'Вся квартира', style: 'modern', colors: ['#A4553B'], level: 'base', files: [], variants: [], pick: 0, liked: {} }; }
  var st = (function () { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return blank(); } })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var qType = ui.qs('type'); if (view === 'form' && qType && TYPES.some(function (t) { return t.id === qType; })) { st.type = qType; save(); }
  /* «Пример ›» блока «Материалы»: готовые варианты мудборда без формы — неоклассика, оливковый и песочный (26.10) */
  var EXAMPLE = ui.qs('example') === '1';

  function setTitle(t) {
    document.body.setAttribute('data-title', t); document.title = t + ' — SOVEAPP';
    var el = document.querySelector('.appbar__title'); if (el) el.textContent = t;
    else document.addEventListener('DOMContentLoaded', function () { var x = document.querySelector('.appbar__title'); if (x) x.textContent = t; });
  }
  function caps() { return D.capsules.filter(function (c) { return !c.soon && c.pricePerM2; }); }
  /* ⚠️ цена Премиума есть только у К7 — чтобы варианты сравнивались честно, бюджет везде по Базовому, Премиум помечаем */
  function kit(c) { return c.pricePerM2; }
  function budgetOf(c) { return G.budget({ pricePerM2: kit(c) }, G.area()); }

  /* ---------- подбор четырёх вариантов: капсула выбранного стиля + три ближайшие по палитре ---------- */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function dist(a, b) { var x = rgb(a), y = rgb(b); return Math.sqrt(Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2)); }
  function score(c) { return st.colors.reduce(function (s, col) { return s + Math.min.apply(null, (c.palette || ['#888888']).map(function (p) { return dist(col, p); })); }, 0); }
  /* мудборд показывает образцы материалов капсулы; у К7 своих образцов в демо нет (data.js берёт их у К5) —
     в мудборд такую капсулу не берём, иначе два варианта выходят одинаковыми */
  function ownSwatches(c) { return (c.dna || []).length && (c.dna || []).every(function (s) { return s.indexOf('/' + c.id + '-') >= 0; }); }
  function compose() {
    var style = STYLES.filter(function (s) { return s.id === st.style; })[0], first = style && D.capsule(style.cap);
    var mb = st.type === 'moodboard';
    if (mb && first && !ownSwatches(first)) first = null;
    var rest = caps().filter(function (c) { return (!first || c.id !== first.id) && (!mb || ownSwatches(c)); }).sort(function (a, b) { return score(a) - score(b); });
    return (first ? [first] : []).concat(rest).slice(0, 4).map(function (c) { return c.id; });
  }
  function roomImg(c) {
    var want = { 'Спальня': 'Спальня', 'Ванная': 'Санузел', 'Детская': 'Спальня' }[st.room];
    var g = want && (c.gallery || []).filter(function (x) { return x.room === want; })[0];
    return g ? g.src : (c.wide || c.cover);
  }
  /* название варианта — как плитка стиля в форме; К6 нет среди плиток — его стиль из капсулы */
  var STYLE_EXTRA = { k6: 'Оливковая классика' };
  function styleName(c) { var s = STYLES.filter(function (x) { return x.cap === c.id; })[0]; return s ? s.t : (STYLE_EXTRA[c.id] || c.style); }
  function tone(c) { var t = c.tags || []; return t.indexOf('light') >= 0 ? 'Светлый' : t.indexOf('warm') >= 0 ? 'Тёплый' : 'Глубокий'; }
  function chips(c) { return [tone(c), String((c.materials || [''])[0]).split(',')[0], st.level === 'premium' ? 'Премиум' : 'Базовый']; }
  function pic(c, cls) {
    if (st.type === 'moodboard') return '<span class="' + cls + ' gn-mb">' + (c.dna || []).slice(0, 4).map(function (s) { return '<img src="' + esc(s) + '" alt="" loading="lazy">'; }).join('') + '</span>';
    var src = roomImg(c);
    return '<span class="' + cls + '"><img src="' + esc(src) + '"' + G.pos(c, src) + ' alt="" loading="lazy"></span>';
  }

  /* ---------- 1. Новая генерация ---------- */
  function sec(n, t, opt, body, id) {
    return '<section class="gn-sec"' + (id ? ' id="' + id + '"' : '') + '><header class="gn-sec__h"><span class="gn-sec__n">' + n + '</span><h2>' + esc(t) + '</h2>' + (opt ? '<span class="gn-sec__opt">Необязательно</span>' : '') + '</header>' + body + '</section>';
  }
  function viewForm() {
    setTitle('Новая генерация');
    var types = '<div class="gn-types" role="group" aria-label="Тип генерации">' + TYPES.map(function (t) {
      var on = t.id === st.type;
      return '<button type="button" class="gn-type' + (on ? ' is-on' : '') + '" data-type="' + t.id + '" aria-pressed="' + on + '">' + G.ic(t.ic, 24) + '<span>' + esc(t.t) + '</span></button>';
    }).join('') + '</div>';
    var rooms = '<div class="gn-chips" role="group" aria-label="Тип помещения">' + ROOMS.map(function (r) {
      var on = r === st.room;
      return '<button type="button" class="gn-chip' + (on ? ' is-on' : '') + '" data-room="' + esc(r) + '" aria-pressed="' + on + '">' + esc(r) + '</button>';
    }).join('') + '</div>';
    var styles = '<div class="gn-styles" role="group" aria-label="Стиль интерьера">' + STYLES.map(function (s) {
      var on = s.id === st.style, c = D.capsule(s.cap);
      return '<button type="button" class="gn-style' + (on ? ' is-on' : '') + '" data-style="' + s.id + '" aria-pressed="' + on + '"><span class="gn-style__pic"><img src="' + esc(c ? (c.wide || c.cover) : '') + '" alt="" loading="lazy"></span><span>' + esc(s.t) + '</span></button>';
    }).join('') + '</div>';
    var extra = st.colors.filter(function (c) { return !PALETTE.some(function (p) { return p.c.toLowerCase() === c.toLowerCase(); }); });
    var colors = '<div class="gn-colors" role="group" aria-label="Цветовая палитра">' + PALETTE.concat(extra.map(function (c) { return { c: c, t: 'Свой цвет ' + c }; })).map(function (p) {
      var on = st.colors.indexOf(p.c) >= 0;
      return '<button type="button" class="gn-color' + (on ? ' is-on' : '') + '" data-color="' + p.c + '" aria-pressed="' + on + '" aria-label="' + esc(p.t) + '" title="' + esc(p.t) + '"><i style="background:' + p.c + '"></i></button>';
    }).join('') + '<label class="gn-color gn-color--add" title="Свой цвет">' + G.ic('plus', 18) + '<span class="vh">Добавить свой цвет</span><input type="color" id="gn-pick" value="#B38756"></label></div>' +
      '<p class="gn-hint">До трёх цветов — по ним подберём капсулы</p>';
    var levels = '<div class="gn-seg" role="group" aria-label="Уровень комплектации">' + LEVELS.map(function (l) {
      var on = l.id === st.level;
      return '<button type="button" class="gn-chip' + (on ? ' is-on' : '') + '" data-level="' + l.id + '" aria-pressed="' + on + '">' + esc(l.t) + '</button>';
    }).join('') + '</div>';
    var files = '<label class="gn-drop">' + G.ic('upload', 22) + '<span><b>Загрузить план, фото или референсы</b><small>PNG, JPG, PDF до ' + MAX_MB + ' МБ</small></span>' +
      '<input type="file" id="gn-file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" multiple></label>' +
      (st.files.length ? '<ul class="gn-files">' + st.files.map(function (f, i) { return '<li><span>' + esc(f.name) + '</span><button type="button" data-drop="' + i + '" aria-label="Убрать ' + esc(f.name) + '">×</button></li>'; }).join('') + '</ul>' : '');
    root.innerHTML = '<div class="gn">' +
      sec(1, 'Тип генерации', false, types) + sec(2, 'Тип помещения', true, rooms) + sec(3, 'Стиль интерьера', false, styles) +
      sec(4, 'Цветовая палитра', false, colors) + sec(5, 'Уровень бюджета', false, levels) + sec(6, 'План / Референсы', true, files, 'gn-files') +
      '<div class="gn-go"><button type="button" class="gn-btn gn-btn--main" data-act="generate">' + G.ic('sparkles', 20) + '<span>' + (st.type === 'plan' ? 'Перейти к плану' : 'Сгенерировать') + '</span></button>' +
      '<p class="gn-hint">' + (st.type === 'plan' ? 'План → 3D — бесплатно: разметим план и соберём объёмную модель' : 'В демо варианты собираются из капсул SOVEAPP — токены не списываются') + '</p></div>' +
      '</div>';
    if (location.hash === '#gn-files') { var fs = document.getElementById('gn-files'); if (fs) setTimeout(function () { fs.scrollIntoView({ block: 'center' }); }, 50); }
  }

  function generate() {
    if (st.type === 'plan') { var f = window.SOVE_FLOW ? window.SOVE_FLOW.load() : {}; location.href = f.step >= 2 ? 'arrange.html?v=panel&flow=1' : 'plan-demo.html'; return; }
    st.variants = compose(); st.pick = 0; st.liked = {}; save();
    var go = root.querySelector('.gn-go'), STAGES = ['Разбираем параметры', 'Подбираем капсулы и материалы', 'Собираем варианты'], i = 0;
    go.innerHTML = '<div class="gn-busy" role="status" aria-live="polite"><span class="gn-busy__t">' + STAGES[0] + '…</span><span class="gn-busy__bar"><i style="width:20%"></i></span></div>';
    (function tick() {
      setTimeout(function () {
        i++;
        if (i < STAGES.length) { go.querySelector('.gn-busy__t').textContent = STAGES[i] + '…'; go.querySelector('.gn-busy__bar i').style.width = Math.round((i + 1) / STAGES.length * 100) + '%'; tick(); return; }
        location.href = 'gen-new.html?v=variants';
      }, 650);
    })();
  }

  /* ---------- 2. Варианты генерации ---------- */
  function viewVariants() {
    setTitle('Варианты генерации');
    if (!st.variants.length) { st.variants = compose(); save(); }
    var list = st.variants.map(function (id) { return D.capsule(id); }).filter(Boolean);
    root.innerHTML = '<div class="gn">' +
      '<p class="gn-lead">Мы создали ' + list.length + ' варианта интерьера на основе ваших параметров</p>' +
      '<div class="gn-vars">' + list.map(function (c, i) {
        var on = i === st.pick, liked = !!st.liked[i];
        return '<article class="gn-var' + (on ? ' is-on' : '') + '"><button type="button" class="gn-var__sel" data-pick="' + i + '" aria-pressed="' + on + '" aria-label="Вариант ' + LETTERS[i] + ': ' + esc(styleName(c)) + '"></button>' +
          '<header><b>Вариант ' + LETTERS[i] + '</b><button type="button" class="gn-heart' + (liked ? ' is-on' : '') + '" data-like="' + i + '" aria-pressed="' + liked + '" aria-label="В избранное">' + G.ic('heart', 18) + '</button></header>' +
          pic(c, 'gn-var__pic') +
          '<span class="gn-var__name">' + esc(styleName(c)) + '</span>' +
          '<span class="gn-var__chips">' + chips(c).map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</span>' +
          '<span class="gn-var__sum">≈ ' + budgetOf(c).text + '</span></article>';
      }).join('') + '</div>' +
      '<div class="gn-acts"><button type="button" class="gn-btn gn-btn--soft" data-act="compare">' + G.ic('bars', 18) + '<span>Сравнить варианты</span></button>' +
      '<button type="button" class="gn-btn gn-btn--main" data-act="choose"><span>Выбрать вариант ' + LETTERS[st.pick] + '</span>' + G.ic('chev', 18) + '</button></div>' +
      '<p class="gn-hint">Бюджет — ремонт под ключ ' + F.area(G.area()) + ' по ценам METOD: работы и комплектация капсулы' + (st.level === 'premium' ? '. Премиум считается отдельно — здесь бюджет Базового уровня' : '') + '</p>' +
      '</div>';
  }
  function compare() {
    var list = st.variants.map(function (id) { return D.capsule(id); }).filter(Boolean);
    ui.modal({ eyebrow: 'Варианты генерации', title: 'Сравнение вариантов',
      html: '<div class="gn-cmp">' + list.map(function (c, i) {
        return '<div class="gn-cmp__row"><img src="' + esc(roomImg(c)) + '"' + G.pos(c, roomImg(c)) + ' alt=""><div><b>Вариант ' + LETTERS[i] + ' · ' + esc(styleName(c)) + '</b>' +
          '<span>' + esc(c.name) + '</span><span>Комплектация ' + F.rub(kit(c)) + '/м² · ≈ ' + budgetOf(c).text + '</span>' +
          '<span>' + esc((c.materials || []).join(' · ')) + '</span></div></div>';
      }).join('') + '</div>',
      actions: [{ label: 'Закрыть', kind: 'ghost' }] });
  }

  /* ---------- 3. Выбранный вариант ---------- */
  var slide = 0;
  function shots(c) {
    var out = [], seen = {};
    [roomImg(c), c.wide, c.cover].concat((c.gallery || []).map(function (g) { return g.src; })).forEach(function (s) { if (s && !seen[s]) { seen[s] = 1; out.push(s); } });
    return out.slice(0, 8);
  }
  function viewPick() {
    setTitle('Выбранный вариант');
    if (!st.variants.length) { st.variants = compose(); save(); }
    var i = Math.max(0, Math.min(st.variants.length - 1, Number(ui.qs('i') || st.pick) || 0)), c = D.capsule(st.variants[i]);
    if (!c) { location.replace('gen-new.html'); return; }
    st.pick = i; save();
    var list = shots(c), liked = !!st.liked[i], b = budgetOf(c);
    var payload = { capsuleId: c.id, name: c.name, img: c.wide || c.cover, dna: c.dna || [], productIds: R ? R.capsuleProducts(c.id).map(function (p) { return p.id; }) : [] };
    /* мудборд: сначала сами материалы капсулы листом 2×2, ниже — как они выглядят в интерьере */
    var mb = st.type === 'moodboard' ? pic(c, 'gn-var__pic gn-pick__mb') + '<p class="gn-pick__mbcap">' + esc((c.materials || []).join(' · ')) + '</p>' : '';
    root.innerHTML = '<div class="gn gn--pick">' + mb +
      '<div class="gn-gal"><img src="' + esc(list[slide] || list[0]) + '"' + G.pos(c, list[slide] || list[0]) + ' alt="Вариант ' + LETTERS[i] + ': ' + esc(styleName(c)) + '" data-gal>' +
        '<button type="button" class="gn-gal__nav gn-gal__nav--prev" data-slide="-1" aria-label="Предыдущий кадр">' + G.ic('back', 18) + '</button>' +
        '<button type="button" class="gn-gal__nav gn-gal__nav--next" data-slide="1" aria-label="Следующий кадр">' + G.ic('chev', 18) + '</button>' +
        '<span class="gn-gal__n" data-gal-n>' + (slide + 1) + '/' + list.length + '</span>' +
        '<button type="button" class="gn-heart gn-heart--gal' + (liked ? ' is-on' : '') + '" data-like="' + i + '" aria-pressed="' + liked + '" aria-label="В избранное">' + G.ic('heart', 20) + '</button></div>' +
      '<div class="gn-pick__head"><h1>Вариант ' + LETTERS[i] + ' — ' + esc(styleName(c)) + '</h1><p>' + esc(c.concept) + ' Капсула «' + esc(c.name) + '».</p></div>' +
      '<div class="gn-pick__pal">' + G.dots(c, 'gk-dots gk-dots--lg') + '<span class="gn-var__chips">' + chips(c).map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</span></div>' +
      '<a class="gn-budget" href="scout.html?capsule=' + c.id + '&area=' + G.area() + '"><span class="gn-budget__ic">' + G.ic('coins', 22) + '</span><span><small>Ориентировочный бюджет</small><b>' + b.text + '</b></span>' + G.ic('chev', 18) + '</a>' +
      '<div class="gn-pick__acts">' +
        '<a class="gn-btn gn-btn--main" href="capsule.html?id=' + c.id + '#cap-goods">' + G.ic('cart', 20) + '<span>Открыть товары</span>' + G.ic('chev', 18) + '</a>' +
        (R ? R.saveButton('interior', payload, 'Перенести в бюджет', 'gn-btn gn-btn--soft gn-btn--doc') : '') +
        '<button type="button" class="gn-btn gn-btn--soft" data-act="album">' + G.ic('bookmark', 20) + '<span>Сохранить в альбом</span></button>' +
        '<a class="gn-btn gn-btn--soft" href="gen-new.html">' + G.ic('refresh', 20) + '<span>Создать ещё</span>' + G.ic('chev', 18) + '</a>' +
      '</div>' +
      '<p class="gn-note">' + G.ic('link', 18) + '<span>Решение можно сохранить в ваш проект и использовать в смете, подборе товаров и команде.</span></p>' +
      '</div>';
    /* у кнопки из repair.js свой текст — добавим иконку, как в макете */
    var doc = root.querySelector('.gn-btn--doc'); if (doc) doc.insertAdjacentHTML('afterbegin', G.ic('doc', 20));
  }
  function toAlbum() {
    var c = D.capsule(st.variants[st.pick]); if (!c) return;
    var all = {}; try { all = JSON.parse(localStorage.getItem('sove.gen.history') || '{}') || {}; } catch (e) {}
    var box = all.none = all.none || {}, kind = st.type === 'moodboard' ? 'materials' : 'visual';
    (box[kind] = box[kind] || []).unshift({ title: 'Вариант ' + LETTERS[st.pick] + ' — ' + styleName(c), src: kind === 'materials' && (c.dna || [])[0] ? c.dna[0] : roomImg(c), href: 'gen-new.html?v=pick&i=' + st.pick, ts: Date.now() });
    try { localStorage.setItem('sove.gen.history', JSON.stringify(all)); } catch (e) {}
    ui.toast('Сохранили в альбом генераций', 'ok');
  }

  /* ---------- события ---------- */
  root.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-type]'))) { st.type = x.dataset.type; save(); return viewForm(); }
    if ((x = e.target.closest('[data-room]'))) { st.room = x.dataset.room; save(); return viewForm(); }
    if ((x = e.target.closest('[data-style]'))) { st.style = x.dataset.style; save(); return viewForm(); }
    if ((x = e.target.closest('[data-level]'))) { st.level = x.dataset.level; save(); return viewForm(); }
    if ((x = e.target.closest('[data-color]'))) {
      var c = x.dataset.color, k = st.colors.indexOf(c);
      if (k >= 0) st.colors.splice(k, 1); else { st.colors.push(c); if (st.colors.length > 3) st.colors.shift(); }
      save(); return viewForm();
    }
    if ((x = e.target.closest('[data-drop]'))) { st.files.splice(+x.dataset.drop, 1); save(); return viewForm(); }
    if ((x = e.target.closest('[data-like]'))) { var li = x.dataset.like; st.liked[li] = !st.liked[li]; save(); x.classList.toggle('is-on', !!st.liked[li]); x.setAttribute('aria-pressed', !!st.liked[li]); if (st.liked[li]) ui.toast('Добавили в избранное', 'ok'); return; }
    if ((x = e.target.closest('[data-pick]'))) { st.pick = +x.dataset.pick; save(); return viewVariants(); }
    if ((x = e.target.closest('[data-slide]'))) {
      var cap = D.capsule(st.variants[st.pick]), list = shots(cap);
      slide = (slide + Number(x.dataset.slide) + list.length) % list.length;
      var gi = root.querySelector('[data-gal]'); gi.src = list[slide]; gi.style.objectPosition = list[slide] === cap.wide ? (cap.widePos || '') : ''; root.querySelector('[data-gal-n]').textContent = (slide + 1) + '/' + list.length; return;
    }
    if (!(x = e.target.closest('[data-act]'))) return;
    var a = x.dataset.act;
    if (a === 'generate') generate();
    else if (a === 'compare') compare();
    else if (a === 'choose') location.href = 'gen-new.html?v=pick&i=' + st.pick;
    else if (a === 'album') toAlbum();
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'gn-pick') { var c = e.target.value; if (st.colors.indexOf(c) < 0) { st.colors.push(c); if (st.colors.length > 3) st.colors.shift(); } save(); viewForm(); return; }
    if (e.target.id !== 'gn-file') return;
    var bad = [];
    Array.prototype.forEach.call(e.target.files || [], function (f) {
      var ok = /\.(png|jpe?g|pdf)$/i.test(f.name || '') || /^(image\/png|image\/jpeg|application\/pdf)$/.test(f.type || '');
      if (!ok) bad.push('«' + f.name + '» — нужен PNG, JPG или PDF'); else if (f.size > MAX_MB * 1024 * 1024) bad.push('«' + f.name + '» больше ' + MAX_MB + ' МБ');
      else if (st.files.length < 10) st.files.push({ name: String(f.name).slice(0, 80), size: f.size || 0 });
    });
    if (bad.length) ui.toast('Не подошло: ' + bad.join('; '), 'error');
    save(); viewForm();
  });

  if (EXAMPLE) { st = Object.assign(blank(), { type: 'moodboard', style: 'neo', colors: ['#5C6042', '#E3D3C2'] }); st.variants = compose(); save(); view = 'variants'; }
  ({ variants: viewVariants, pick: viewPick }[view] || viewForm)();
})();
