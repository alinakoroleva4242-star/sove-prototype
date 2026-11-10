/* «Основа квартиры» — одно окно загрузки для всех входов (созвон 28.10; общий договор WP0, 02.11.2026): Мой ремонт · Планировка · Интерьер · Бюджет.
   SOVE.planUpload.open({
     entry: 'my' | 'interior' | 'budget' | 'plan',
     cards?: ['developer_plan', 'measured_plan', 'design_project', 'photo', 'own_render'] — набор карточек; не передан — по входу (ENTRY_CARDS):
       plan — план застройщика · обмерный; budget — + дизайн-проект (без фото); interior — + дизайн-проект · свой рендер; my — + дизайн-проект · фото;
       «Свой рендер» показываем, только если передан onRender,
     level?: карточка, которую подсветить,
     onDone(res), onRender(files, res)?, onNoPlan()?, noPlanLabel?, beforeLeave()?, demo = true, returnTo?, title?, sub?, renderPrice?, onClose(res)
   }) → { close, el, pick(level, files) }
   Окно — ЕДИНСТВЕННОЕ, кто пишет файл плана: R.save('plan', { level, img, file, size, rooms, source, ts }) — без новых комнат
   (тот же файл второй раз (имя + размер) объект не меняет и прежние комнаты сохраняет). Комнаты пишет только Планировка.
   Скан: scanHref(entry, returnTo) = plan-demo.html?from=<entry>&scan=1&returnTo=<адрес блока> — экран «Проверь план» Планировки, комнаты в R.plan,
   возврат в блок с scanned=1 и sessionStorage 'sove.plan.scanned' = { entry, ts, rooms }. Блок забирает итог lastScan(true) при старте страницы —
   тогда общий тост не показываем (блок показывает свой); иначе через 300 мс после загрузки окно само покажет тост «Комнаты сохранены…». Тост про комнаты — один.
   На входе 'plan' шага «Распознать» нет: onDone сразу, в res.files — исходные File (PDF тоже), Планировка распознаёт на месте.
   res = { kind: 'plan' | 'photo', level, basis: 'plan' | 'measure' | 'project' | 'photo', plan, file, size, files: [File], same, use?, scan?, demo? } → onDone.
     use — «Взять этот план» (план уже в объекте), scan — «Распознать комнаты» на входе 'plan', demo — пример ЖК PRIDE.
   «Свой рендер»: { kind: 'render', level: 'own_render', basis: 'render', files: [File], … } → только onRender, R.plan не трогаем.
   Пример ЖК PRIDE: план без комнат (sample: 'pride', картинка и имя DEMO); на входе 'plan' — res.demo (Планировка читает пример без API),
   на остальных — сразу на скан (комнаты примера — у Планировки, 47,0 м²).
   «Нет плана — найти ЖК»: onNoPlan() кнопкой (noPlanLabel — своя подпись) или на входах my и interior — zkHref = plan-demo.html?from=<entry>&zk=1&returnTo=<…>.
   beforeLeave() — перед уходом со страницы на скан или на поиск ЖК (сохранить черновик блока).
   «Фото квартиры» — не план: лежат в r.photos (до 8), уровень плана не меняют.
   Двойной тап: onDone / onRender / onNoPlan зовутся один раз, после закрытия — ни разу; гаснущее окно (180 мс) и прозрачный щит под ним
   (до SHIELD_MS) глотают второй тап — он не уходит на страницу.
   «Назад» со скана (страница из кэша вкладки, pageshow persisted) — окно возвращается к выбору, а не висит на «Открываем распознавание…». */
(function () {
  var S = window.SOVE; if (!S || !S.repair || !S.ui) return;
  var R = S.repair, F = S.fmt, esc = F.esc, ui = S.ui;
  var DEMO = { img: 'assets/img/demo/0-planirovka-po-ankete.jpg', file: 'ЖК PRIDE · пример плана', jk: 'PRIDE', sample: 'pride' };
  var MAX_PX = 1600, MAX_MB = 20, JPEG_Q = 0.85, PHOTO_PX = 900, PHOTO_MAX = 4;
  var BASIS = { developer_plan: 'plan', measured_plan: 'measure', design_project: 'project', photo: 'photo' };
  var ENTRY_NAME = { my: 'Мой ремонт', interior: 'Интерьер', budget: 'Бюджет', plan: 'Планировка' };
  var SCAN_KEY = 'sove.plan.scanned', SCAN_TTL = 10 * 60 * 1000;
  var SHIELD_MS = 350;                                                              /* окно гаснет 180 мс, щит держим дольше — на второй тап */
  /* прозрачный щит под закрывающимся окном до SHIELD_MS (окно уходит из DOM через 180 мс); новое окно ложится поверх щита */
  function shield(back) {
    var d = document.createElement('div'); d.className = 'pu-shield'; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:300;background:transparent;-webkit-tap-highlight-color:transparent;';
    function eat(e) { e.preventDefault(); e.stopPropagation(); }
    d.addEventListener('click', eat); d.addEventListener('mousedown', eat);
    if (back.parentNode) back.parentNode.insertBefore(d, back); else document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, SHIELD_MS);
  }
  var CARDS = [
    { id: 'developer_plan', t: 'План застройщика', s: 'бюджет примерно', hint: 'от застройщика, скрин из ДомКлик или фото бумажного', accept: 'image/*,application/pdf' },
    { id: 'measured_plan', t: 'Обмерный план', s: 'бюджет точнее', hint: 'с размерами — посчитаем точно', accept: 'image/*,application/pdf' },
    { id: 'design_project', t: 'Дизайн-проект', s: 'бюджет точный', hint: 'чертёж первым файлом, дальше рендеры', accept: 'image/*,application/pdf', multiple: true },
    { id: 'photo', t: 'Фото квартиры', s: 'если документов нет', hint: 'пустые комнаты — поймём объём, окна и ракурсы', accept: 'image/*', multiple: true },
    { id: 'own_render', t: 'Свой рендер', s: 'интерьер по картинке', hint: 'рендер, фото интерьера или Pinterest — соберём материалы', accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic', render: true }
  ];
  var ENTRY_CARDS = {
    my: ['developer_plan', 'measured_plan', 'design_project', 'photo'],
    budget: ['developer_plan', 'measured_plan', 'design_project'],
    plan: ['developer_plan', 'measured_plan'],
    interior: ['developer_plan', 'measured_plan', 'design_project', 'own_render']
  };
  var IC = {
    developer_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M11 16v4M15 12h5"/>',
    measured_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M15 12h5"/><path d="M7 20v-2M10 20v-1M13 20v-2M16 20v-1"/>',
    design_project: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 13l2 2 4-4"/>',
    photo: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-2.5h5L16 7"/><circle cx="12" cy="13.5" r="3.2"/>',
    own_render: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 20h16"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
  function card(id) { return CARDS.filter(function (c) { return c.id === id; })[0] || null; }
  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }
  function isImage(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(f.name || ''); }
  function isPdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); }
  function roomsM2(rooms) { return Math.round((rooms || []).reduce(function (a, r) { return a + (Number(r.m2) || 0); }, 0) * 10) / 10; }
  function isDemo(p) { return !!(p && (p.sample === DEMO.sample || p.file === DEMO.file)); }
  function planLine(p) {
    if (!p) return '';
    var n = (p.rooms || []).length, m2 = roomsM2(p.rooms);
    return [p.file || '', n ? n + ' ' + pl(n, ['комната', 'комнаты', 'комнат']) : 'комнаты не распознаны', m2 ? F.area(m2) : ''].filter(Boolean).join(' · ');
  }
  /* адрес этой страницы для возврата: без прежнего scanned=1 */
  function here() {
    var page = location.pathname.split('/').pop() || 'index.html', q = location.search || '';
    if (/[?&]scanned=/.test(q)) { var u = new URLSearchParams(q); u.delete('scanned'); q = u.toString() ? '?' + u.toString() : ''; }
    return page + q;
  }
  function scanHref(entry, rt) { return 'plan-demo.html?from=' + encodeURIComponent(entry || 'my') + '&scan=1&returnTo=' + encodeURIComponent(rt || here()); }
  function zkHref(entry, rt) { return 'plan-demo.html?from=' + encodeURIComponent(entry || 'my') + '&zk=1&returnTo=' + encodeURIComponent(rt || here()); }
  /* цена «Своего рендера» — из конфига Интерьера (ownRoom — одна комната, дальше дороже), если её нет — не пишем */
  function renderPrice(o) {
    if (typeof o.renderPrice === 'string') return o.renderPrice;
    if (o.renderPrice === false) return '';
    var P = window.SOVE_AI_CONFIG && window.SOVE_AI_CONFIG.INTERIOR_PRICES, n = P && P.ownRoom;
    return typeof n === 'number' && n > 0 && F.tokens ? 'от ' + F.tokens(n) : '';
  }

  /* итог скана Планировки (plan-demo.html?scan=1): { entry, from, n, rooms, m2, file, ts } или null; true — забрать (общий тост не покажем) */
  var scanTaken = false;
  function lastScan(take) {
    var x = null;
    try { x = JSON.parse(sessionStorage.getItem(SCAN_KEY) || 'null'); } catch (e) { x = null; }
    if (!x || typeof x !== 'object' || !x.ts || Date.now() - x.ts > SCAN_TTL || x.ts - Date.now() > 60000) return null;
    var p = null; try { p = R.get().plan; } catch (e) {}
    var rooms = (p && p.rooms) || [], n = typeof x.rooms === 'number' ? x.rooms : typeof x.n === 'number' ? x.n : rooms.length;
    var out = { entry: x.entry || x.from || null, from: x.entry || x.from || null, n: n, rooms: n, m2: typeof x.m2 === 'number' && x.m2 > 0 ? x.m2 : roomsM2(rooms), file: x.file || (p && p.file) || '', ts: x.ts };
    if (take === true) { scanTaken = true; try { sessionStorage.removeItem(SCAN_KEY); } catch (e) {} }
    return out;
  }
  function scanToast() {
    if (scanTaken) return;
    var x = lastScan(); if (!x) return;
    try { sessionStorage.removeItem(SCAN_KEY); } catch (e) {}
    ui.toast('Комнаты сохранены в Мой ремонт' + (x.n ? ' · ' + x.n + ' ' + pl(x.n, ['комната', 'комнаты', 'комнат']) : '') + (x.m2 ? ' · ' + F.area(x.m2) : ''), 'ok');
  }
  function bootScan() { setTimeout(scanToast, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootScan); else bootScan();

  /* картинка → JPEG не больше max px по длинной стороне (белая подложка для PNG с прозрачностью) */
  function shrink(file, max, q, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        try {
          var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
          done(c.toDataURL('image/jpeg', q));
        } catch (e) { done(fr.result); }
      };
      im.onerror = function () { done(null); };
      im.src = fr.result;
    };
    fr.onerror = function () { done(null); };
    fr.readAsDataURL(file);
  }
  /* файл в «Объект» (my.html?v=object) — тот же документ не дублируем */
  function addDoc(level, name, size) {
    var O = S.orders && S.orders.object; if (!O || !O.addDoc || !BASIS[level] || level === 'photo') return;
    var o = O.get(), has = ((o && o.documents) || []).some(function (d) { return d.name === name && (d.size || 0) === (size || 0); });
    if (!has) O.addDoc(level, name, size);
  }

  var active = null;
  function open(o) {
    o = o || {};
    if (active) active.close();
    var entry = ENTRY_NAME[o.entry] ? o.entry : 'my';
    var cards = (Array.isArray(o.cards) && o.cards.length ? o.cards : ENTRY_CARDS[entry]).map(card).filter(function (c) { return c && (!c.render || typeof o.onRender === 'function'); });
    if (!cards.length) cards = ENTRY_CARDS.my.map(card);
    var planCards = cards.some(function (c) { return BASIS[c.id] && c.id !== 'photo'; }), hasRender = cards.some(function (c) { return c.render; });
    var pick = o.level && cards.some(function (c) { return c.id === o.level; }) ? o.level : null;
    var returnTo = o.returnTo || here(), price = hasRender ? renderPrice(o) : '';
    var title = o.title || (hasRender ? 'Что загрузить?' : 'Основа квартиры');
    var sub0 = o.sub || (hasRender ? 'План — для метража и бюджета, свой рендер — для материалов' : 'Чем точнее основа — тем точнее бюджет');
    var st = { step: 'pick', error: '', level: null, saved: false, res: null, pendingFiles: null, pendingLevel: null, pendingDemo: false, busy: '', closed: false };
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var back = document.createElement('div'); back.className = 'pu-back'; back.setAttribute('data-pu-entry', entry);
    back.innerHTML = '<div class="pu" role="dialog" aria-modal="true" aria-labelledby="pu-t"><i class="pu__grip" aria-hidden="true"></i>' +
      '<div class="pu__h"><span><b class="pu__t" id="pu-t">' + esc(title) + '</b><small id="pu-sub">' + esc(sub0) + '</small></span><button type="button" class="pu__x" data-pu-close aria-label="Закрыть">×</button></div>' +
      '<div class="pu__body"></div><input type="file" class="pu__file" hidden></div>';
    var box = back.firstChild, body = back.querySelector('.pu__body'), input = back.querySelector('.pu__file');
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back.classList.add('is-open'); });

    function cur() { return R.get().plan || null; }
    function plate(p, ok) {
      return '<div class="pu-now' + (ok ? ' pu-now--ok' : '') + '"><span class="pu-now__pic"' + (p.img ? ' style="background-image:url(\'' + esc(p.img) + '\')"' : '') + '>' + (p.img ? '' : ic('check', 18)) + '</span>' +
        '<span class="pu-now__t"><b>' + ic('check', 14) + ' ' + (ok ? 'План сохранён в Мой ремонт' : esc(R.LEVEL[p.level] || 'План') + ' уже в Моём ремонте') + '</b><small>' + esc(ok ? [R.LEVEL[p.level] || '', p.file || ''].filter(Boolean).join(' · ') : planLine(p)) + '</small></span></div>';
    }
    /* план уже есть: взять его, а не загружать заново (ничего не спрашиваем дважды); нет комнат — распознать */
    function useBlock(p) {
      var b = [], noRooms = !(p.rooms && p.rooms.length);
      if (entry !== 'my' && planCards) b.push('<button type="button" class="pu-btn" data-pu-use>Взять этот план ›</button>');
      if (noRooms && p.img) {
        if (entry === 'plan') b.push('<button type="button" class="pu-btn2" data-pu-scan>Распознать комнаты</button>');
        else b.push('<a class="' + (entry === 'my' ? 'pu-btn' : 'pu-btn2') + '" href="' + esc(scanHref(entry, returnTo)) + '">Распознать комнаты ›</a>');
      }
      return b.length ? '<div class="pu-use">' + b.join('') + '<p class="pu-or">или загрузите другой</p></div>' : '';
    }
    function cardHtml(c, p) {
      var on = !!(p && p.level === c.id), hint = on ? 'загружен · ' + esc(p.file || '') + ' · заменить' : esc(c.hint) + (c.render && price ? ' · ' + esc(price) : '');
      return '<button type="button" class="pu-card' + (on ? ' is-on' : '') + (pick === c.id ? ' is-pick' : '') + '" data-pu-level="' + c.id + '">' +
        '<span class="pu-card__ic">' + ic(on ? 'check' : c.id, 20) + '</span><span class="pu-card__t"><b>' + c.t + '<small> · ' + c.s + '</small></b><small>' + hint + '</small></span><span class="pu-card__a" aria-hidden="true">›</span></button>';
    }
    function paint() {
      var p = cur(), html = '';
      if (st.step === 'pick') {
        var noPlan = typeof o.onNoPlan === 'function' ? '<button type="button" class="pu-link" data-pu-noplan>' + esc(o.noPlanLabel || 'Нет плана — найти ЖК ›') + '</button>'
          : (entry === 'my' || entry === 'interior') ? '<a class="pu-link" href="' + esc(zkHref(entry, returnTo)) + '">Нет плана — найти ЖК ›</a>' : '';
        var demo = o.demo !== false && planCards ? '<button type="button" class="pu-link" data-pu-demo>Пример: ЖК PRIDE</button>' : '';
        html = (p ? plate(p, false) + useBlock(p) : '') +
          '<div class="pu-cards" role="group" aria-label="Что загрузить">' + cards.map(function (c) { return cardHtml(c, p); }).join('') + '</div>' +
          (st.error ? '<p class="pu-err" role="alert">' + st.error + '</p>' : '') +
          '<p class="pu__f">' + (hasRender ? 'План: JPG, PNG или PDF до ' + MAX_MB + ' МБ · рендер: JPG или PNG' : 'JPG, PNG или PDF до ' + MAX_MB + ' МБ · PDF сохраним по имени, картинку — целиком') + '</p>' +
          (noPlan || demo ? '<div class="pu-alt">' + noPlan + demo + '</div>' : '');
      } else if (st.step === 'busy') {
        html = '<div class="pu-busy" role="status" aria-live="polite"><i></i><span>' + esc(st.busy || 'Сохраняем в Мой ремонт…') + '</span></div>';
      } else if (st.step === 'replace') {
        var f0 = st.pendingFiles[0], n0 = (p.rooms || []).length;
        html = '<div class="pu-ask"><b>Заменить план?</b><p>В Моём ремонте уже есть «' + esc(p.file || 'план') + '» и ' + n0 + ' ' + pl(n0, ['комната', 'комнаты', 'комнат']) + ' с площадями. ' +
          'С новым планом «' + esc(f0.name) + '» комнаты ' + (entry === 'plan' ? 'распознаем заново.' : 'нужно распознать заново в Планировке.') + '</p></div>' +
          '<button type="button" class="pu-btn" data-pu-replace>Заменить план</button><button type="button" class="pu-btn2" data-pu-keep>Оставить прежний</button>';
      } else if (st.step === 'rooms') {
        html = plate(p, true) + (p.img
          ? '<div class="pu-ask"><b>Найти комнаты на плане?</b><p>Найдём комнаты и площади на этом плане — проверите их и вернётесь в ' + esc(ENTRY_NAME[entry]) + '. Бесплатно.</p></div>' +
            '<a class="pu-btn" href="' + esc(scanHref(entry, returnTo)) + '">Распознать комнаты ›</a>'
          : '<p class="pu-note">PDF сохранили по имени. Чтобы найти комнаты, нужна картинка плана — JPG или PNG, подойдёт скриншот.</p>' +
            '<button type="button" class="pu-btn" data-pu-reimg>Загрузить картинкой</button>') +
          '<button type="button" class="pu-btn2" data-pu-skip>Пока без комнат</button>';
      }
      body.innerHTML = html;
      var sub = back.querySelector('#pu-sub'); if (sub) sub.textContent = st.step === 'rooms' ? 'Комнаты и площади — по вашему плану' : sub0;
      var first = st.step === 'pick' ? body.querySelector('.pu-card.is-pick') || body.querySelector('.pu-use .pu-btn') || body.querySelector('.pu-card') : body.querySelector('.pu-btn, .pu-btn2, button');
      if (first && first.focus) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }
    /* закрытое окно гаснет 180 мс (второй тап ловит его обработчик), дальше до SHIELD_MS — щит: второй тап не уходит на страницу */
    function close() {
      if (st.closed) return; st.closed = true;
      back.classList.remove('is-open'); back.classList.add('is-closing'); document.removeEventListener('keydown', onKey, true);
      var tt = back.querySelector('#pu-t'), ts = back.querySelector('#pu-sub'); if (tt) tt.removeAttribute('id'); if (ts) ts.removeAttribute('id');   /* следующее окно — со своими id */
      shield(back); setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 180);
      document.body.style.overflow = prevOverflow;
      if (active === api) active = null;
      /* toast:false — о сохранении скажет сам вход (Планировка — после «Всё верно»): тост окна закрывал плашку на «Проверь план» */
      if (st.saved && !st.toasted && o.toast !== false) { st.toasted = true; ui.toast(st.res && st.res.kind === 'photo' ? 'Фото сохранены в Мой ремонт' : 'План сохранён в Мой ремонт', 'ok'); }
      if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
      if (o.onClose) o.onClose(st.res);
    }
    /* итог окна — один раз: после закрытия (второй тап, × во время сохранения) колбэки не зовём —
       иначе Бюджет применит план дважды, а Планировка запустит распознавание второй раз */
    function finish(res) {
      if (st.closed) return;
      st.res = res; close();
      if (res && res.kind === 'render') { if (typeof o.onRender === 'function') o.onRender(res.files, res); return; }
      if (o.onDone) o.onDone(res);
    }
    /* уход со страницы (скан, поиск ЖК): черновик блока — beforeLeave, тост «сохранено» не нужен */
    function leaving() { st.toasted = true; if (typeof o.beforeLeave === 'function') try { o.beforeLeave(); } catch (e) {} }
    function go(href) { leaving(); st.busy = 'Открываем распознавание…'; st.step = 'busy'; paint(); location.href = href; }
    /* «Назад» со скана: страница вернулась из кэша вкладки — окно снова на выборе (план перечитываем: пример уже в объекте) */
    function reset() { if (st.closed) return; if (st.step === 'busy') { st.step = 'pick'; st.busy = ''; } paint(); }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var fs = [].filter.call(box.querySelectorAll('button:not([disabled]), a[href]'), function (el) { return el.getClientRects().length > 0; }); if (!fs.length) return;
      var i = fs.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && (i < 0 || i === fs.length - 1)) { e.preventDefault(); fs[0].focus(); }
    }
    document.addEventListener('keydown', onKey, true);

    /* выбор файлов: проверка типа и размера → план, фото или свой рендер */
    function onFiles(level, list) {
      if (st.closed) return;
      var files = [].slice.call(list || []), c = card(level); if (!files.length || !c) return;
      var imgOnly = level === 'photo' || !!c.render;
      var bad = files.filter(function (f) { return !(isImage(f) || (!imgOnly && isPdf(f))); })[0];
      if (bad) { st.error = 'Файл «' + esc(bad.name) + '» не подошёл: нужен ' + (imgOnly ? 'JPG или PNG' : 'JPG, PNG или PDF') + '.'; st.step = 'pick'; return paint(); }
      var big = files.filter(function (f) { return f.size > MAX_MB * 1024 * 1024; })[0];
      if (big) { st.error = 'Файл «' + esc(big.name) + '» весит ' + Math.ceil(big.size / 1024 / 1024) + ' МБ — больше ' + MAX_MB + ' МБ. Сожмите его или ' + (imgOnly ? 'сохраните картинку поменьше.' : 'сфотографируйте план.'); st.step = 'pick'; return paint(); }
      st.error = '';
      if (c.render) return finish({ kind: 'render', level: 'own_render', basis: 'render', plan: cur(), file: files[0].name, size: files[0].size || 0, files: [files[0]], same: false });
      if (level === 'photo') return savePhotos(files);
      planFiles(level, files);
    }
    function planFiles(level, files) {
      var f = files[0], p = cur(), same = !!(p && p.file === f.name && (p.size || 0) === (f.size || 0));
      if (same && p.level === level) return afterSave({ same: true, level: level, files: files });
      if (p && !same && p.rooms && p.rooms.length) { st.pendingFiles = files; st.pendingLevel = level; st.pendingDemo = false; st.step = 'replace'; return paint(); }
      savePlan(level, f, files);
    }
    function savePlan(level, f, files) {
      st.busy = ''; st.step = 'busy'; paint();
      var p = cur(), keep = !!(p && p.file === f.name && (p.size || 0) === (f.size || 0));
      function write(src) {
        R.flats.ensure();
        var data = { level: level, img: src || (keep ? p.img : null), file: f.name, size: f.size || 0, rooms: keep && p.rooms ? p.rooms : [], source: entry };
        if (keep) ['jk', 'variant', 'historyId', 'scan'].forEach(function (k) { if (p[k]) data[k] = p[k]; });
        R.save('plan', data, { force: true, silent: true });
        addDoc(level, f.name, f.size);
        st.saved = true;
        afterSave({ same: false, level: level, files: files });
      }
      if (isImage(f)) shrink(f, MAX_PX, JPEG_Q, function (src) { write(src); }); else write(null);
    }
    function afterSave(x) {
      if (st.closed) return;                                                         /* закрыли во время сохранения — файл в объекте, дальше не идём */
      var p = cur(), noRooms = !!(p && !(p.rooms && p.rooms.length));
      var res = { kind: 'plan', level: x.level, basis: BASIS[x.level], plan: p, file: p ? p.file : null, size: p ? p.size : 0, files: x.files || [], same: !!x.same };
      if (x.demo) res.demo = true;
      if (entry !== 'plan' && noRooms) {
        st.res = res;
        /* пример — сразу на «Проверь план»; Бюджет — тоже сразу, как в Планировке (Алина 10.11): чтение плана и согласование зон без вопроса
           «Найти комнаты?». PDF без картинки читать нечем — остаётся шаг с подсказкой */
        if (x.demo || (entry === 'budget' && p && p.img)) return go(scanHref(entry, returnTo));
        st.step = 'rooms'; return paint();
      }
      finish(res);
    }
    function savePhotos(files) {
      st.busy = ''; st.step = 'busy'; paint();
      var imgs = files.filter(isImage).slice(0, PHOTO_MAX), out = [], n = 0;
      imgs.forEach(function (f) {
        shrink(f, PHOTO_PX, 0.82, function (src) {
          if (src) out.push({ src: src, file: f.name, size: f.size || 0, ts: Date.now() });
          if (++n === imgs.length) done();
        });
      });
      function done() {
        var fl = R.flats.ensure(), r = R.get(fl.id);
        var old = (r.photos || []).filter(function (x) { return !out.some(function (y) { return y.file === x.file && y.size === x.size; }); });
        r.photos = old.concat(out).slice(-8); R.flats.update(fl.id, {});
        st.saved = out.length > 0;
        finish({ kind: 'photo', level: 'photo', basis: 'photo', plan: cur(), file: imgs.length > 1 ? imgs.length + ' ' + pl(imgs.length, ['файл', 'файла', 'файлов']) : (imgs[0] || {}).name || '', size: 0, files: imgs, srcs: out.map(function (x) { return x.src; }), same: false });
      }
      if (!imgs.length) { st.error = 'Нужны картинки: JPG или PNG.'; st.step = 'pick'; paint(); }
    }
    /* пример ЖК PRIDE: план без комнат (комнаты примера даёт «Проверь план» Планировки); прежний план с комнатами — сначала вопрос */
    function useDemo() {
      if (st.closed || st.step === 'busy') return;
      var p = cur();
      if (isDemo(p)) return afterSave({ same: true, level: p.level || 'developer_plan', files: [], demo: true });
      if (p && p.rooms && p.rooms.length) { st.pendingFiles = [{ name: DEMO.file, size: 0 }]; st.pendingLevel = 'developer_plan'; st.pendingDemo = true; st.step = 'replace'; return paint(); }
      saveDemo();
    }
    function saveDemo() {
      st.busy = ''; st.step = 'busy'; paint();
      R.flats.ensure();
      R.save('plan', { level: 'developer_plan', img: DEMO.img, file: DEMO.file, size: 0, rooms: [], jk: DEMO.jk, variant: 'Пример ЖК PRIDE', sample: DEMO.sample, source: entry }, { force: true, silent: true });
      st.saved = true; afterSave({ same: false, level: 'developer_plan', files: [], demo: true });
    }
    function planRes(extra) {
      var p = cur(); if (!p) return null;
      return Object.assign({ kind: 'plan', level: p.level, basis: BASIS[p.level] || 'plan', plan: p, file: p.file || null, size: p.size || 0, files: [], same: true }, extra);
    }

    back.addEventListener('click', function (e) {
      if (st.closed) { e.preventDefault(); e.stopPropagation(); return; }           /* окно гаснет: второй тап — ни onDone, ни перехода */
      if (e.target === back || e.target.closest('[data-pu-close]')) return close();
      var b = e.target.closest('[data-pu-level]');
      if (b) { st.level = b.getAttribute('data-pu-level'); var c = card(st.level); input.value = ''; input.accept = c.accept; input.multiple = !!c.multiple; input.click(); return; }
      if (e.target.closest('[data-pu-demo]')) return useDemo();
      if (e.target.closest('[data-pu-use]')) { var ru = planRes({ use: true }); if (ru) finish(ru); return; }
      if (e.target.closest('[data-pu-scan]')) { var rs = planRes({ use: true, scan: true }); if (rs) finish(rs); return; }
      if (e.target.closest('[data-pu-reimg]')) { var pp = cur(); st.level = pp && BASIS[pp.level] ? pp.level : 'developer_plan'; input.value = ''; input.accept = 'image/*'; input.multiple = false; input.click(); return; }
      if (e.target.closest('[data-pu-noplan]')) { st.toasted = true; close(); o.onNoPlan(); return; }
      if (e.target.closest('[data-pu-replace]')) { var fs = st.pendingFiles, lv = st.pendingLevel, dm = st.pendingDemo; if (!dm && !(fs && fs[0])) return; st.pendingFiles = null; st.pendingDemo = false; return dm ? saveDemo() : savePlan(lv, fs[0], fs); }
      if (e.target.closest('[data-pu-keep]')) { st.pendingFiles = null; st.pendingDemo = false; st.step = 'pick'; return paint(); }
      if (e.target.closest('[data-pu-skip]')) return finish(st.res);
      if (e.target.closest('a.pu-btn, a.pu-btn2, a.pu-link')) leaving();            /* уходим на скан или поиск ЖК — тост не нужен */
    });
    back.addEventListener('mousedown', function (e) { if (st.closed) e.preventDefault(); });   /* фокус остаётся там, куда его вернули */
    input.addEventListener('change', function () { var fs = input.files; if (fs && fs.length && st.level) onFiles(st.level, fs); });
    paint();
    var api = { close: close, el: back, pick: function (level, files) { onFiles(level, files); }, reset: reset };
    active = api;
    return api;
  }

  window.addEventListener('pageshow', function (e) { if (e.persisted && active && active.reset) active.reset(); });

  /* «Найти план у застройщика» — пока «скоро» (Алина 10.11): одна полоса в Планировке и в Бюджете, не нажимается */
  function zkSoon() {
    return '<div class="qs-opt qs-opt--soon"><span class="qs-opt__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg></span>' +
      '<span class="qs-opt__t"><b>Найти план у застройщика</b><small>ЖК, застройщик или адрес</small></span><span class="qs-soon">Скоро</span></div>';
  }
  S.planUpload = { zkSoon: zkSoon, open: open, CARDS: CARDS, BASIS: BASIS, DEMO: DEMO, ENTRY_CARDS: ENTRY_CARDS, scanHref: scanHref, zkHref: zkHref, lastScan: lastScan, here: here };
})();
