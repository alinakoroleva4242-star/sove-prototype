/* Визуализации · «Примерка капсулы» (Г4 в ТЗ Алины design/sove-ai/TZ-sove-ai.md, ветка alina/materialy):
   Капсула → Комнаты → Интерьер → Сохранить.
   В бою кадры рисуют POST /ai/plan/dollhouse и POST /ai/zone/generate (≈ 7 ₽ за картинку, 20–25 с). В демо нейросеть
   не вызывается: К2 — кадры пилота 16.10 по квартире PRIDE, остальные капсулы — эталонные кадры капсулы по комнатам.
   «Товары в комнате» — настоящие товары капсулы из каталога (GET /marketplace/search, бесплатно); без сети — примеры data.js.
   «Своя капсула» (?gen=g5) и «Замена предмета» (?gen=g6) — следующие сценарии, пока экран «готовим».
   Свой план (?live=1) — прежний экран: что уйдёт в генерацию и честная цена, кнопка выключена. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW, R = S.repair, CAT = S.catalog;
  var root = document.getElementById('rs-root'); if (!root) return;
  var COST = (D.ai && D.ai.costs && D.ai.costs.render) || 10;
  var GEN = S.ui.qs('gen') || 'g4';
  var flow = FLOW.load();
  var LIVE = (S.ui.qs('live') && flow.live && flow.live.layout) ? flow.live : null;

  /* кадры пилота 16.10: квартира PRIDE в К2 по расстановке клиента */
  var PILOT = {
    bed: { img: '2-spalnya', fixed: '6-spalnya-pravka-komandoy', note: 'кровать у северной стены с тумбами, шкаф на востоке, стол у окна' },
    liv: { img: '3-kuhnya-gostinaya', note: 'кухня Г у восточной стены, диван на юге, ТВ напротив' },
    bath: { img: '4-sanuzel', note: 'душ в дальнем углу, подвесной унитаз, стирка за дверцей' },
    hall: { img: '5-prihozhaya', note: 'встроенный шкаф в нише, рифлёное бронзовое стекло' }
  };
  var STEPS = ['Капсула', 'Комнаты', 'Интерьер', 'Сохранить'];

  /* ---------- данные ---------- */
  function capsules() { return D.capsules.filter(function (c) { return !c.soon; }); }
  function capName(c) { return c.code + ' · ' + c.name; }
  /* комнаты — из «Планировки» (или из плана в Моём ремонте); плана нет — четыре типовые, «примерно по площади» */
  var HAS_PLAN = !!(flow.rooms && flow.rooms.length) || (R && R.level && R.level() !== 'none');
  function planRooms() {
    var list = flow.rooms && flow.rooms.length ? flow.rooms.map(function (r) { return { kind: R.roomKey(r.name), name: r.name, m2: r.m2 }; })
      : R.rooms().map(function (r) { return { kind: r.key, name: r.name, m2: r.m2 }; });
    var seen = {};
    return list.map(function (r) { var n = seen[r.kind] = (seen[r.kind] || 0) + 1; return Object.assign(r, { id: n > 1 ? r.kind + n : r.kind }); });
  }
  var ROOMS = planRooms();
  var RE = { liv: /гост|кух/i, bed: /спал/i, bath: /сан|ван/i, hall: /прих|холл|корид/i };
  function pilot(c, r) { return c.id === 'k2' && r.id === r.kind && PILOT[r.kind] ? PILOT[r.kind] : null; }
  function frame(c, r) {
    var pl = pilot(c, r);
    if (pl) return 'assets/img/demo/' + (st.fixed[r.id] && pl.fixed ? pl.fixed : pl.img) + '.jpg';
    var re = RE[r.kind] || new RegExp(String(r.name).slice(0, 5), 'i');
    var s = (c.slides || []).filter(function (x) { return re.test(x.room); })[0] || (c.gallery || []).filter(function (x) { return re.test(x.room); })[0];
    return s ? s.src : (c.wide || c.cover);
  }
  /* мудборд: у капсулы свои образцы материалов (у К7 в демо их нет — data.js берёт у К5, такие не показываем) */
  function swatches(c) { var d = c.dna || []; return d.length && d.every(function (s) { return s.indexOf('/' + c.id + '-') >= 0; }) ? d.slice(0, 4) : []; }

  /* товары капсулы → комната по названию; отделка — в мудборд; розетки, двери и мебель на заказ в комнаты не выводим */
  var SKIP = /Выключател|Двери|заказн/i;
  var ROOM_RE = [
    ['bath', /унитаз|инсталляц|раковин|ванн|душ|смесител(?!.*кух)|полотенцесуш|смыв|гигиен|стирал/i],
    ['bed', /кроват|прикроват|комод|матрас|покрывал|плед|настольн|(^|[^а-яё])бра([^а-яё]|$)/i],
    ['hall', /прихож|вешал|обувн|банкетк|зеркал|консол|ключниц/i],
    ['liv', /диван|кресл|журнальн|обеден|кухон|стол|стул|телевиз|духов|вытяж|холодил|посудомо|микроволн|варочн|мойк|смесител.*кух|люстр|торшер|ков[её]р|картин|пуф|подвесн/i]
  ];
  function roomOf(p) {
    if (!p || !p.img || SKIP.test(p.category || '')) return null;
    if (p.category === 'Отделка') return 'mat';
    /* тип товара обычно в начале названия («Круглый пуф … для ванной») — сначала смотрим первые 4 слова, потом всё название */
    var name = String(p.name || ''), headWords = name.split(/\s+/).slice(0, 4).join(' ');
    for (var pass = 0; pass < 2; pass++) {
      var t = pass ? name : headWords;
      for (var i = 0; i < ROOM_RE.length; i++) if (ROOM_RE[i][1].test(t)) return ROOM_RE[i][0];
    }
    return null;
  }
  var goods = {};
  function loadGoods(c) {
    if (goods[c.id]) return;
    var g = goods[c.id] = { ready: false, items: [] };
    function local() { return R.capsuleProducts(c.id); }
    var p = CAT && CAT.enabled ? CAT.search({ capsule_id: c.code, page_size: 120 }).then(function (d) { return d.items || []; }) : Promise.reject(new Error('нет сети'));
    p.catch(function () { return local(); }).then(function (items) {
      g.items = items && items.length ? items : local(); g.ready = true;
      if (st.view === 'result' && st.cap === c.id) render();
    });
  }
  function pick(c, kind, n) {
    var g = goods[c.id]; if (!g || !g.ready) return null;
    var seen = {}, out = [];
    g.items.forEach(function (p) {
      if (roomOf(p) !== kind) return;
      var k = String(p.name).toLowerCase().replace(/[^а-яёa-z0-9]/g, '').slice(0, 24); if (seen[k]) return; seen[k] = 1;
      out.push(p);
    });
    return out.slice(0, n || 8);
  }

  /* ---------- состояние сценария ---------- */
  var qCap = S.ui.qs('capsule'), fromPlan = S.ui.qs('from') === 'plan';
  var flowCap = flow.interior && flow.interior.type === 'capsule' ? flow.interior.id : null;
  var saved = flow.tryon || null;
  var st = { view: 'capsule', cap: qCap || flowCap || null, sel: {}, busy: {}, ver: {}, cmd: {}, fixed: {}, open: {}, savedAll: false, entry: null };
  ROOMS.forEach(function (r) { st.sel[r.id] = true; });
  if (qCap && D.capsule(qCap)) { st.view = 'rooms'; st.entry = 'rooms'; }            /* с полосы капсул — шаг «Капсула» пропускаем */
  else if (fromPlan && flowCap) { st.view = 'rooms'; st.entry = 'rooms'; }            /* из «Планировки»: интерьер уже выбран */
  /* уже сгенерировано с этой капсулой — сразу результат, второй раз не списываем */
  if (saved && saved.cap === st.cap && (S.ui.qs('step') === 'result' || st.view === 'rooms')) {
    st.sel = {}; (saved.rooms || []).forEach(function (id) { st.sel[id] = true; });
    if (S.ui.qs('step') === 'result') st.view = 'result';
  }
  /* вернулись со входа — комнаты, которые были отмечены до него */
  var qRooms = S.ui.qs('rooms');
  if (qRooms) { st.sel = {}; qRooms.split(',').forEach(function (id) { if (id) st.sel[id] = true; }); }
  function cap() { return D.capsule(st.cap); }
  function chosen() { return ROOMS.filter(function (r) { return st.sel[r.id]; }); }
  function payKey() { return st.cap + ':' + chosen().map(function (r) { return r.id; }).join(','); }

  /* ---------- шапка блока: «← Назад», токены, «Визуализации», полоса шагов ---------- */
  function head(step, done) {
    var bars = '';
    for (var i = 1; i <= STEPS.length; i++) bars += '<span class="pz-bar__i' + (i < step || done ? ' is-done' : i === step ? ' is-now' : '') + '"></span>';
    var inn = S.auth.isIn(), bal = F.tokens(inn ? S.tokens.balance() : D.gift.tokens);
    var rt = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return '<header class="pz-head">' +
      '<div class="pz-head__top"><button type="button" class="pz-back" data-pz-back>← Назад</button><a class="pz-tok" href="tokens.html?returnTo=' + rt + '">' + esc(bal) + ' 🎁</a></div>' +
      '<h1 class="pz-head__t">Визуализации</h1>' +
      '<div class="pz-bar" role="progressbar" aria-valuemin="1" aria-valuemax="' + STEPS.length + '" aria-valuenow="' + step + '">' + bars +
        '<small>' + esc(STEPS[step - 1]) + ' · шаг ' + step + ' из ' + STEPS.length + '</small></div></header>';
  }
  function title(t, sub) { return '<div class="pz-title"><h2>' + esc(t) + '</h2>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>'; }
  function dots(c) { return '<span class="tr-dots">' + (c.palette || []).slice(0, 5).map(function (h) { return '<i style="background:' + esc(h) + '"></i>'; }).join('') + '</span>'; }

  /* ---------- 1. Капсула: сеткой, без прокрутки вбок ---------- */
  function viewCapsule() {
    return head(1) + title('Какую капсулу примерить?', 'покажем твои комнаты в её интерьере') +
      '<div class="tr-caps">' + capsules().map(function (c) {
        var on = st.cap === c.id, sw = swatches(c);
        return '<button type="button" class="tr-cap' + (on ? ' is-on' : '') + '" data-cap="' + c.id + '" aria-pressed="' + on + '">' +
          '<span class="tr-cap__pic"><img src="' + esc(c.wide || c.cover) + '" alt="" loading="lazy"></span>' +
          '<span class="tr-cap__b"><b>' + esc(c.code) + ' · ' + esc(c.name) + '</b>' +
            (sw.length ? '<span class="tr-mini">' + sw.map(function (s) { return '<img src="' + esc(s) + '" alt="" loading="lazy">'; }).join('') + '</span>' : dots(c)) +
            '<small>' + esc((c.materials || []).slice(0, 3).join(' · ')) + '</small></span></button>';
      }).join('') + '</div>' +
      '<button type="button" class="pz-btn' + (st.cap ? '' : ' is-wait') + '" data-act="to-rooms"' + (st.cap ? '' : ' aria-disabled="true"') + '>Дальше — комнаты</button>';
  }

  /* ---------- 2. Комнаты и цена ---------- */
  function viewRooms() {
    var c = cap(), n = chosen().length, paid = saved && saved.key === payKey();
    return head(2) + title('Какие комнаты показать?', capName(c)) +
      (HAS_PLAN ? '' : '<section class="pz-card tr-noplan"><b>Плана пока нет</b><small class="pz-note">покажем примерно по площади — типовые комнаты. Свой план — точнее.</small>' +
        '<a class="pz-link pz-link--left" href="plan-demo.html">Загрузить план ›</a></section>') +
      '<div class="tr-rooms">' + ROOMS.map(function (r) {
        var on = !!st.sel[r.id];
        /* без кадров капсулы: их человек увидит после оплаты */
        return '<button type="button" class="tr-room' + (on ? ' is-on' : '') + '" data-room="' + esc(r.id) + '" aria-pressed="' + on + '">' +
          '<i class="tr-room__ch">✓</i><span><b>' + esc(r.name) + '</b><small>' + (r.m2 ? F.area(r.m2) : 'примерно') + '</small></span></button>';
      }).join('') + '</div>' +
      '<section class="pz-card tr-price"><div><b>' + n + ' ' + plural(n, 'кадр', 'кадра', 'кадров') + ' комнат</b><small>' + F.tokens(COST) + ' за кадр · 20–25 секунд каждый</small></div>' +
        '<b>' + (paid ? 'уже оплачено' : F.tokens(COST * n)) + '</b></section>' +
      '<button type="button" class="pz-btn' + (n ? '' : ' is-wait') + '" data-act="pay"' + (n ? '' : ' aria-disabled="true"') + '>' + (paid ? 'Показать интерьер' : 'Примерить · ' + F.tokens(COST * n)) + '</button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small>';
  }
  function plural(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }

  /* окно оплаты — как «Варианты стен» в Планировке: цена, баланс, вход / пополнение */
  function paySheet() {
    var n = chosen().length; if (!n) { S.ui.toast('Выбери хотя бы одну комнату'); return; }
    if (saved && saved.key === payKey()) { generate(false); return; }
    var inn = S.auth.isIn(), bal = inn ? S.tokens.balance() : D.gift.tokens, cost = COST * n, enough = !inn || bal >= cost;
    var rt = encodeURIComponent('result.html?gen=g4&capsule=' + st.cap + '&rooms=' + chosen().map(function (r) { return r.id; }).join(','));
    var back = document.createElement('div'); back.className = 'pz-sheet-back';
    back.innerHTML = '<div class="pz-sheet" role="dialog" aria-modal="true" aria-labelledby="tr-sheet-t"><i class="pz-sheet__grip"></i>' +
      '<b class="pz-sheet__t" id="tr-sheet-t">Примерка капсулы</b><small class="pz-sheet__s">' + esc(capName(cap())) + ' · ' + n + ' ' + plural(n, 'кадр', 'кадра', 'кадров') + ' комнат</small>' +
      '<div class="pz-sheet__row"><span>Стоимость</span><b>' + F.tokens(cost) + '</b></div>' +
      '<div class="pz-sheet__row pz-sheet__row--plain"><span>У тебя</span><b>' + esc(F.tokens(bal)) + (inn ? '' : ' 🎁') + '</b></div>' +
      (!inn ? '<small class="pz-note">50 подарочных токенов — после входа по номеру телефона</small>' : '') +
      (enough ? '<button type="button" class="pz-btn" data-sheet="gen">' + (inn ? 'Сгенерировать · ' : 'Войти и сгенерировать · ') + F.tokens(cost) + '</button>'
        : '<a class="pz-btn" href="tokens.html?returnTo=' + rt + '">Пополнить</a>') +
      '<button type="button" class="pz-link" data-sheet="close"><u>Отмена</u></button>' +
      '<small class="pz-note pz-c">не получится — токены вернём</small></div>';
    function close() { back.remove(); document.body.style.overflow = ''; }
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('[data-sheet]'); if (!b) return;
      close();
      if (b.dataset.sheet !== 'gen') return;
      if (!inn) { location.href = 'auth.html?returnTo=' + rt; return; }
      var op = S.tokens.reserve(cost, 'Визуализации · примерка ' + cap().code, 'tryon'); if (!op) { S.ui.toast('Не хватает токенов'); return; }
      S.tokens.commit(op);
      generate(true);
    });
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
  }

  /* ---------- 3. Генерация: стадии по кадру (в бою 20–25 с на кадр) ---------- */
  function generate(fresh) {
    var c = cap(), list = chosen();
    loadGoods(c);
    if (!fresh) { st.view = 'result'; render(); window.scrollTo(0, 0); return; }
    var stages = ['Собираю мудборд капсулы'].concat(list.map(function (r) { return 'Рисую: ' + r.name.toLowerCase(); }), ['Подбираю товары в комнаты']), i = 0;
    st.view = 'gen'; render(); window.scrollTo(0, 0);
    (function tick() {
      var bar = document.getElementById('tr-bar'), t = document.getElementById('tr-stage');
      if (bar) bar.style.width = Math.round((i + 1) / stages.length * 100) + '%';
      if (t) t.textContent = stages[i] + '…';
      if (++i <= stages.length) { setTimeout(tick, 700); return; }
      saved = { cap: c.id, rooms: list.map(function (r) { return r.id; }), key: payKey(), ts: Date.now() };
      FLOW.save({ tryon: saved, interior: { type: 'capsule', id: c.id, name: c.name } });
      toHistory(c, list);
      st.view = 'result'; render(); window.scrollTo(0, 0);
    })();
  }
  function viewGen() {
    return head(3) + title('Рисую твои комнаты', capName(cap())) +
      '<div class="pz-prog"><i id="tr-bar" style="width:5%"></i></div><small class="pz-note" id="tr-stage">Начинаю…</small>';
  }
  /* результат сразу в историю SOVE AI (общее правило 3 ТЗ) */
  function toHistory(c, list) {
    var all = {}; try { all = JSON.parse(localStorage.getItem('sove.gen.history') || '{}') || {}; } catch (e) {}
    var box = all.none = all.none || {};
    (box.visual = box.visual || []).unshift({ title: 'Примерка · ' + c.code + ' ' + c.name, src: frame(c, list[0]), href: 'result.html?gen=g4&capsule=' + c.id + '&step=result', ts: Date.now() });
    try { localStorage.setItem('sove.gen.history', JSON.stringify(all)); } catch (e) {}
  }

  /* ---------- 4. Интерьер: кадры, товары в комнате, мудборд, всё в корзину ---------- */
  function goodsBlock(c, r) {
    var list = pick(c, r.kind, 8);
    if (list === null) return '<small class="pz-note tr-goods__wait">Подбираю товары капсулы…</small>';
    if (!list.length) return '<small class="pz-note">Товаров капсулы для этой комнаты в каталоге пока нет</small>';
    list.forEach(function (p) { R.registerProduct(p); });
    var open = !!st.open[r.id];
    return '<button type="button" class="tr-goods__t" data-open="' + esc(r.id) + '" aria-expanded="' + open + '">Товары в комнате · ' + list.length + '<i>' + (open ? '−' : '+') + '</i></button>' +
      (open ? '<div class="tr-goods">' + list.map(function (p) { return R.card(p, { source: 'render', where: p.brand || p.category }); }).join('') + '</div>' : '');
  }
  function roomCard(c, r) {
    var busy = st.busy[r.id], src = frame(c, r), pl = pilot(c, r);
    return '<article class="df-card" id="rc-' + esc(r.id) + '">' +
      '<div class="df-card__img' + (busy ? ' is-busy' : '') + '"><img src="' + esc(src) + '" alt="' + esc(r.name) + ' в капсуле ' + esc(c.name) + '">' +
        (busy ? '<div class="df-wait"><i></i><span>' + esc(busy) + '</span></div>' : '') +
        (st.ver[r.id] ? '<span class="df-ver">v' + st.ver[r.id] + '</span>' : '') + '</div>' +
      '<div class="df-card__body"><b>' + esc(r.name) + '</b>' + (pl ? '<p class="small muted">' + esc(pl.note) + '</p>' : '') +
        '<div class="lane df-actions">' +
          '<button type="button" class="chip" data-regen="' + esc(r.id) + '"' + (busy ? ' disabled' : '') + '>↻ Перегенерировать · ' + F.tokens(COST) + '</button>' +
          '<button type="button" class="chip" data-cmd="' + esc(r.id) + '"' + (busy ? ' disabled' : '') + '>Поправить командой</button>' +
        '</div>' +
        (st.cmd[r.id] !== undefined ? '<div class="df-cmd"><input class="input" data-cmd-in="' + esc(r.id) + '" placeholder="Например: убери консоль у двери" value="' + esc(st.cmd[r.id]) + '">' +
          '<button type="button" class="btn btn--primary btn--sm" data-cmd-go="' + esc(r.id) + '">Применить · ' + F.tokens(COST) + '</button></div>' : '') +
        '<div class="tr-goods__box">' + goodsBlock(c, r) + '</div>' +
        (!busy ? R.saveButton('render', { room: r.name, src: src }, 'Сохранить кадр в Мой ремонт', 'btn btn--ghost btn--sm btn--block') : '') +
      '</div></article>';
  }
  function moodboard(c) {
    var sw = swatches(c), mats = pick(c, 'mat', 6) || [];
    mats.forEach(function (p) { R.registerProduct(p); });
    var payload = { capsuleId: c.id, name: c.name, img: c.wide || c.cover, dna: c.dna || [], productIds: [] };
    return '<section class="pz-card tr-mb"><b class="tr-mb__t">Мудборд капсулы</b>' +
      (sw.length ? '<span class="tr-mb__grid">' + sw.map(function (s) { return '<img src="' + esc(s) + '" alt="" loading="lazy">'; }).join('') + '</span>' : dots(c)) +
      '<small class="pz-note">' + esc((c.materials || []).join(' · ')) + '</small>' +
      (mats.length ? '<div class="tr-goods">' + mats.map(function (p) { return R.card(p, { source: 'render', where: p.brand || 'Отделка' }); }).join('') + '</div>' : '') +
      R.saveButton('interior', payload, 'Сохранить мудборд в Мой ремонт', 'btn btn--ghost btn--sm btn--block') + '</section>';
  }
  function allIds(c) {
    var ids = [];
    chosen().forEach(function (r) { (pick(c, r.kind, 8) || []).forEach(function (p) { if (ids.indexOf(p.id) < 0) ids.push(p.id); }); });
    return ids;
  }
  function viewResult() {
    var c = cap(), list = chosen(), ids = allIds(c), house = c.id === 'k2' && !LIVE;
    return head(st.savedAll ? 4 : 3, st.savedAll) + title('Твоя квартира в интерьере', capName(c) + (c.id === 'k2' ? ' · по твоей расстановке' : '')) +
      (house ? '<section class="df-house"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="3D-домик всей квартиры">' +
        '<p class="small muted">3D-домик: все комнаты на своих местах, ниша со шкафом, двери и вход как на плане.</p></section>' : '') +
      '<div class="df-cards">' + list.map(function (r) { return roomCard(c, r); }).join('') + '</div>' +
      moodboard(c) +
      '<div class="tr-final">' +
        '<button type="button" class="pz-btn" data-act="cart-all"' + (ids.length ? '' : ' disabled') + '>🛒 Всё в корзину · ' + ids.length + '</button>' +
        '<button type="button" class="pz-btn pz-btn--ghost tr-btn2" data-act="save-all">' + (st.savedAll ? '✓ Сохранено в Мой ремонт' : 'Сохранить всё в Мой ремонт') + '</button>' +
        (st.savedAll ? '<a class="tr-next" href="scout.html?capsule=' + esc(c.id) + '">Дальше: бюджет ремонта в этой капсуле ›</a>' : '') +
        '<div class="tr-final__links"><a class="pz-link" href="arrange.html?v=panel&flow=1">Изменить расстановку</a><button type="button" class="pz-link" data-act="other">Другая капсула</button></div>' +
      '</div>';
  }

  /* ---------- Своя капсула и Замена предмета: следующие сценарии ---------- */
  function viewSoon() {
    var t = GEN === 'g5' ? 'Своя капсула' : 'Замена предмета';
    var d = GEN === 'g5' ? 'соберёшь мудборд по категориям — стены, пол, камень, металл, текстиль, мебель — и увидишь комнаты в нём'
      : 'выберешь кадр, зону — стены, пол, свет или мебель — и три товара на замену, увидишь «до / после»';
    return head(1) + title(t, 'готовим этот сценарий') +
      '<section class="pz-card"><b>Скоро</b><p class="pz-note">' + esc(d) + '.</p></section>' +
      '<a class="pz-btn" href="result.html?gen=g4">Пока — примерить готовую капсулу</a>';
  }

  /* свой план: картинки интерьера — платный шаг (≈7 ₽ за кадр), на демо не запускаем. Показываем, что уйдёт в генерацию */
  function liveView() {
    var rooms = (LIVE.layout.rooms || []).filter(function (r) { return !r.part_of; });
    var n = rooms.length, cost = COST * n;
    return head(2) + title('Твоя квартира в интерьере', ((flow.interior && flow.interior.name) ? flow.interior.name + ' · ' : '') + 'по твоей расстановке') +
      (LIVE.labeled ? '<section class="df-house"><img src="' + LIVE.labeled + '" alt="Твой план с разметкой">' : '<section class="df-house">') +
      '<p class="small muted">' + esc(LIVE.flat) + ' · расстановка: ' + (LIVE.layout.furniture || []).length + ' предметов' +
      (LIVE.ready ? ' · проверка норм пройдена' : ' · есть замечания к расстановке') + '</p></section>' +
      '<section class="pb"><span class="pb__k">Что сгенерируем</span><b class="pb__t">' + n + ' кадра комнат · ' + F.tokens(cost) + '</b>' +
      '<ul class="df-list">' + rooms.map(function (r) { return '<li>' + esc(r.name) + ' <span>' + F.area(r.doc_m2 || 0) + '</span></li>'; }).join('') + '</ul>' +
      '<p class="text">Кадры рисуются по твоей расстановке и выбранной капсуле: ровно те предметы на тех местах. Одна картинка — ' + F.tokens(COST) + ' ≈ 7 ₽, 20–25 секунд.</p>' +
      '<button type="button" class="btn btn--primary btn--block" disabled>Сгенерировать · ' + F.tokens(cost) + '</button>' +
      '<p class="small muted">На демо генерация своего плана выключена: это платный вызов. Готовый пример — на плане ЖК PRIDE.</p>' +
      '<a class="btn btn--link btn--sm" href="result.html?gen=g4">Примерить на примере PRIDE</a></section>' +
      '<div class="df-foot"><a class="btn btn--ghost" href="arrange.html?v=panel&flow=1&live=1">Изменить расстановку</a>' +
      '<a class="btn btn--primary" href="market.html">Собрать комплектацию</a></div>';
  }

  function render() {
    var V = { capsule: viewCapsule, rooms: viewRooms, gen: viewGen, result: viewResult };
    if (LIVE) root.innerHTML = liveView();
    else if (GEN === 'g5' || GEN === 'g6') root.innerHTML = viewSoon();
    else { if (!cap() && st.view !== 'capsule') st.view = 'capsule'; root.innerHTML = V[st.view](); }
    if (R && R.sync) R.sync(root);
  }

  /* имитация перегенерации: три подписи по 1,2 с — столько же ступеней показывает боевой маршрут */
  function wait(id, stages, done) {
    var i = 0;
    st.busy[id] = stages[0]; render();
    var t = setInterval(function () {
      i++;
      if (i < stages.length) { st.busy[id] = stages[i]; var el = document.querySelector('#rc-' + id + ' .df-wait span'); if (el) el.textContent = stages[i]; return; }
      clearInterval(t); delete st.busy[id]; done(); render();
      var card = document.getElementById('rc-' + id); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 1200);
  }
  /* перегенерация и правка командой — по кадру, списываем как в бою (10 токенов) */
  function spend(why) {
    if (!S.auth.isIn()) { S.auth.require(); return false; }
    var op = S.tokens.reserve(COST, why, 'tryon'); if (!op) { S.ui.toast('Не хватает токенов — пополни баланс'); return false; }
    S.tokens.commit(op); return true;
  }

  root.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-pz-back]'))) {
      /* «← Назад» — на предыдущий шаг сценария; с первого шага и при входе сразу на комнаты — назад по истории */
      var to = st.view === 'result' ? 'rooms' : st.view === 'rooms' && st.entry !== 'rooms' ? 'capsule' : null;
      if (!to || LIVE || GEN !== 'g4') return;
      e.stopPropagation(); st.view = to; render(); window.scrollTo(0, 0); return;
    }
    if ((x = e.target.closest('[data-cap]'))) { st.cap = x.dataset.cap; render(); return; }
    if ((x = e.target.closest('[data-room]'))) { st.sel[x.dataset.room] = !st.sel[x.dataset.room]; render(); return; }
    if ((x = e.target.closest('[data-open]'))) { st.open[x.dataset.open] = !st.open[x.dataset.open]; render(); return; }
    if ((x = e.target.closest('[data-regen]'))) {
      var id = x.dataset.regen; if (!spend('Визуализации · перегенерация кадра')) return;
      wait(id, ['Беру вырез домика…', 'Собираю промпт по расстановке…', 'Рисую кадр…'], function () { st.ver[id] = (st.ver[id] || 1) + 1; });
      return;
    }
    if ((x = e.target.closest('[data-cmd]'))) {
      var cid = x.dataset.cmd; st.cmd[cid] = st.cmd[cid] === undefined ? '' : undefined; render();
      var inp = document.querySelector('[data-cmd-in="' + cid + '"]'); if (inp) inp.focus(); return;
    }
    if ((x = e.target.closest('[data-cmd-go]'))) {
      var gid = x.dataset.cmdGo, text = (st.cmd[gid] || '').trim();
      if (!text) { var gi = document.querySelector('[data-cmd-in="' + gid + '"]'); if (gi) gi.focus(); return; }
      if (!spend('Визуализации · правка командой')) return;
      delete st.cmd[gid];
      wait(gid, ['Понимаю команду: «' + text.slice(0, 40) + '»…', 'Меняю только это, остальное как есть…', 'Рисую кадр…'], function () { st.fixed[gid] = true; st.ver[gid] = (st.ver[gid] || 1) + 1; });
      return;
    }
    if (!(x = e.target.closest('[data-act]'))) return;
    var a = x.dataset.act;
    if (a === 'to-rooms') { if (!st.cap) { S.ui.toast('Выбери капсулу'); return; } st.view = 'rooms'; render(); window.scrollTo(0, 0); }
    else if (a === 'pay') paySheet();
    else if (a === 'other') { st.view = 'capsule'; st.entry = null; render(); window.scrollTo(0, 0); }
    else if (a === 'cart-all') { var ids = allIds(cap()); if (ids.length) { R.cart.addMany(ids, 'render'); render(); } }
    else if (a === 'save-all') {
      var c = cap();
      chosen().forEach(function (r) { R.save('render', { room: r.name, src: frame(c, r) }, { silent: true }); });
      R.save('interior', { capsuleId: c.id, name: c.name, img: c.wide || c.cover, dna: c.dna || [], productIds: allIds(c) }, { done: function () { st.savedAll = true; render(); } });
    }
  });
  root.addEventListener('input', function (e) { var i = e.target.closest('[data-cmd-in]'); if (i) st.cmd[i.dataset.cmdIn] = i.value; });
  root.addEventListener('keydown', function (e) {
    var i = e.target.closest('[data-cmd-in]'); if (!i || e.key !== 'Enter') return;
    var go = document.querySelector('[data-cmd-go="' + i.dataset.cmdIn + '"]'); if (go) go.click();
  });
  window.addEventListener('sove:repair', function () { if (R && R.sync) R.sync(root); });
  /* у части товаров каталога фото по ссылке партнёра не открывается — вместо значка битой картинки пустая плашка */
  root.addEventListener('error', function (e) {
    var img = e.target; if (!img || img.tagName !== 'IMG' || !img.closest('.rp-card__pic')) return;
    img.closest('.rp-card__pic').classList.add('tr-noimg'); img.remove();
  }, true);

  if (st.view === 'result' && cap()) loadGoods(cap());
  FLOW.save({ step: 3 });
  render();
})();
