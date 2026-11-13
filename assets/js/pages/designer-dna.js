/* Кабинет дизайнера (правки Алины 12.11): ДНК капсулы = 7 цветов + 12 материалов чистовой отделки (design/DNK-kapsuly.md, методология SOVE AI, раздел 8);
   разбор рендеров с ИИ (тот же вызов, что в блоке «Интерьер»: SOVE.genLive.analyze → /ai/dna_job), загрузка готовой спецификации, раздел «Каталог». */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var root = document.getElementById('da-root');
  var st = DC.st, ROLE = DC.ROLE, S = DC.S, esc = DC.esc, ui = DC.ui, ic = DC.ic, F = DC.F, POS = DC.POS;
  /* 12 слотов доски Интерьера (kb/finish-slots.js) — в порядке номеров */
  var SLOTS = [['floor', 1, 'Пол'], ['floorTile', 2, 'Плитка пола'], ['walls', 3, 'Стены'], ['accentWall', 4, 'Акцентная стена'], ['bathWalls', 5, 'Плитка санузла'], ['apron', 6, 'Фартук кухни'], ['doors', 7, 'Двери'], ['moldings', 8, 'Плинтус и молдинги'],
    ['ceiling', 9, 'Потолок'], ['plumbing', 10, 'Сантехника'], ['light', 11, 'Свет'], ['hardware', 12, 'Фурнитура и розетки']];
  var SRC = { ai: 'распознал ИИ', designer: 'выбрал дизайнер', spec: 'из спецификации' };
  function slotDef(key) { return SLOTS.filter(function (s) { return s[0] === key; })[0]; }
  /* материал слота из спецификации: первый основной товар позиции, привязанной к слоту (слот позиции — в «Справочниках») */
  function fromSpec(code, num) {
    var rows = DC.rowsFor(code, 'база') || [];
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r.role !== 'alt' && r.product && r.pos && POS[r.pos] && POS[r.pos].slot === num) return { product: r.product, guess: r.product.name || '', source: 'spec' }; }
    return null;
  }
  function slotVal(code, key) { var m = st.meta[code] || {}, v = m.slots && m.slots[key]; return v && (v.product || v.guess) ? v : fromSpec(code, slotDef(key)[1]); }
  DC.slotsMissing = function (code) { return SLOTS.filter(function (s) { return !slotVal(code, s[0]); }).map(function (s) { return s[2]; }); };
  var basePassport = DC.passportIssues;
  DC.passportIssues = function (code) { var out = basePassport ? basePassport(code) : [], n = DC.slotsMissing(code).length; if (n) out.push('материалов ДНК: ' + (12 - n) + ' из 12'); return out; };
  function setSlot(code, key, v) { var m = DC.meta(code); m.slots = m.slots || {}; if (v) m.slots[key] = v; else delete m.slots[key]; DC.saveMeta(); DC.paint(); }

  function merge2(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function photo(file, max) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .82)); }; im.onerror = function () { ok(''); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
  /* ДНК капсулы — как на странице капсулы sove.app: «Цветовая гамма» и «Материалы», у каждого описание и лента карточек с фото и подписью */
  var DSRC = { ai: 'собрал ИИ по рендерам', renders: 'цвета распознаны по рендерам', designer: 'задано дизайнером' };
  DC.dnaExtra = null;
  /* цвета ДНК распознаются сами по рендерам (палитра по пикселям, бесплатно, без ИИ): у черновика сохраняются, у опубликованной — только показываются */
  st.autoDna = st.autoDna || {}; var dnaTried = {};
  function autoColors(code, can) {
    var m = st.meta[code] || {};
    if (dnaTried[code] || (m.dna && m.dna.length === 7) || !readable(code).length || !DC.buildDna) return;
    dnaTried[code] = true;
    DC.buildDna(code).then(function (d) {
      if (!d || d.length < 7) return;
      if (can) { var mm = DC.meta(code); mm.dna = d.slice(0, 7); mm.dnaSource = 'renders'; DC.saveMeta(); } else st.autoDna[code] = d.slice(0, 7);
      DC.paint();
    }, function () {});
  }
  DC.dnaBlock = function (code, can) {
    autoColors(code, can);
    var m = st.meta[code] || {}, dna = m.dna && m.dna.length === 7 ? m.dna : (st.autoDna && st.autoDna[code]) || null, names = m.dnaNames || [], ph = m.dnaPhotos || [], busy = st.aiBusy === code, dis = can ? '' : ' disabled';
    var src = '<div class="dn-src">' + /* Алина 13.11: в ДНК без текста — только кнопки и карточки */
      (can ? (busy ? '<div class="dp-stage"><span class="dp-spin"></span>Разбираю рендеры…</div>' : '<div class="dr-btns"><button type="button" class="dr-sbtn dn-ai-b" data-act="ai-fill">✦ ' + (dna ? 'Пересобрать с ИИ' : 'Собрать по рендерам') + '</button>' + '<button type="button" class="dr-sbtn" data-act="dna-manual">' + (dna ? 'Изменить цвета' : 'Внести вручную') + '</button></div>') : '') + '</div>';
    var colors = dna ? dna.map(function (h, i) {
      return '<button type="button" class="dn-card" data-act="dna-color" data-i="' + i + '"' + dis + '><span class="dn-card__pic" style="background:' + esc(h) + (ph[i] ? ';background-image:' + esc(DC.cssUrl(ph[i])) : '') + '"></span><span class="dn-card__t">' + esc(names[i] || h) + '</span></button>';
    }).join('') : '';
    var finish = SLOTS.map(function (s) {
      var v = slotVal(code, s[0]), p = v && v.product, img = (p && p.img) || (v && v.img) || '';
      return '<button type="button" class="dn-card' + (v ? '' : ' is-empty') + '" data-act="slot" data-k="' + s[0] + '"><span class="dn-card__pic"' + (img ? ' style="background-image:' + esc(DC.cssUrl(img)) + '"' : v && v.color ? ' style="background:' + esc(v.color) + '"' : '') + '>' + (img || (v && v.color) ? '' : '<i>' + s[1] + '</i>') + '</span><span class="dn-card__t">' + s[2] + '</span><span class="dn-card__s">' + (v ? esc(p ? p.name : v.guess) : 'не заполнено') + '</span></button>';
    }).join('');
    /* мебель — из материалов капсулы: основные товары категорий «Мебель…» с фото */
    var seen = {}, furn = (DC.rowsFor(code, st.level) || []).filter(function (r) { var P = r.pos && POS[r.pos], pr = r.product; if (r.role === 'alt' || !P || !/мебель/i.test(P.cat || '') || !pr || !pr.img || seen[pr.name]) return false; seen[pr.name] = 1; return true; });
    var fAI = (m.dnaFurn || []).filter(function (x) { return x && x.name; });
    var furnitureAI = fAI.map(function (x, i) { var im = x.product && x.product.img; return '<button type="button" class="dn-card" data-act="dna-furn" data-i="' + i + '"><span class="dn-card__pic"' + (im ? ' style="background-image:' + esc(DC.cssUrl(im)) + '"' : x.color ? ' style="background:' + esc(x.color) + '"' : '') + '></span><span class="dn-card__t">' + esc(x.name) + '</span><span class="dn-card__s">' + (x.product ? esc(x.product.name) : 'распознал ИИ') + '</span></button>'; }).join('');
    var furniture = furn.length ? furn.map(function (r) { return '<div class="dn-card"><span class="dn-card__pic" style="background-image:' + esc(DC.cssUrl(r.product.img)) + '"></span><span class="dn-card__t">' + esc(POS[r.pos].name) + '</span><span class="dn-card__s">' + esc(DC.rowRoom(code, r)) + '</span></div>'; }).join('') : '';
    var f = st.dnaF || 'colors', TABS = [['colors', 'Цвета', dna ? 7 : 0], ['furniture', 'Мебель', furn.length + fAI.length], ['finish', 'Отделка', 12 - DC.slotsMissing(code).length]];
    var text = null; /* описания цветов и материалов убраны */
    return '<section class="dp-card dn-dna"><h2>ДНК</h2>' + (DC.noteBlock ? DC.noteBlock(code, 'passport', 'dna', 'Интерьер · ДНК') : '') + src +
      '<div class="dn-f">' + TABS.map(function (t) { return '<button type="button" class="' + (t[0] === f ? 'is-on' : '') + '" data-act="dna-f" data-f="' + t[0] + '">' + t[1] + ' <span>' + t[2] + '</span></button>'; }).join('') + '</div>' +
      (text ? '<textarea class="input dn-txt" rows="2" data-pf="' + text[0] + '" placeholder="' + text[1] + '"' + dis + '>' + esc(m[text[0]] || '') + '</textarea>' : '') +
      '<div class="dn-strip">' + (f === 'colors' ? colors : f === 'furniture' ? furnitureAI + furniture : finish) + '</div></section>';
  };
  DC.acts['dna-f'] = function (b) { st.dnaF = b.getAttribute('data-f'); DC.paint(); };
  /* мебель, которую распознал ИИ: добавить в материалы интерьера или убрать из ДНК */
  DC.acts['dna-furn'] = function (b) {
    var code = st.cap, i = Number(b.getAttribute('data-i')), x = ((st.meta[code] || {}).dnaFurn || [])[i]; if (!x) return; var can = DC.canEdit(code);
    function drop() { var mm = DC.meta(code); mm.dnaFurn.splice(i, 1); DC.saveMeta(); DC.paint(); }
    DC.sheet({ title: x.name, html: '<p class="small muted">Распознал ИИ по рендеру' + (x.product ? ' и подобрал в каталоге: ' + esc(x.product.name) : '. Товара в каталоге не подобрал') + '.</p>', actions: !can ? [{ label: 'Закрыть', kind: 'primary' }] : [
      { label: x.product ? 'Добавить в материалы' : 'Подобрать в каталоге', kind: 'primary', onClick: function () {
        if (x.product) { var id = DC.matAdd(code, x.product); drop(); DC.openMaterial(code, id, { focus: 'zones' }); }
        else DC.openSearch(x.name, 'Мебель из ДНК', x.name, function (p) { var id2 = DC.matAdd(code, p); drop(); DC.openMaterial(code, id2, { focus: 'zones' }); });
      } }, { label: 'Убрать из ДНК', onClick: drop }, { label: 'Отмена', kind: 'link' }] });
  };
  DC.acts['dna-color'] = function (b) {
    var code = st.cap, i = Number(b.getAttribute('data-i')), m = DC.meta(code); if (!DC.canEdit(code)) return;
    var h = m.dna[i], nm = (m.dnaNames || [])[i] || '', pic = (m.dnaPhotos || [])[i] || '';
    var sh = DC.sheet({ title: 'Цвет ' + (i + 1) + ' из 7', html: '<div class="dn-cedit"><input type="color" id="dn-ch" value="' + esc(h) + '"><span id="dn-cp" class="dn-card__pic" style="background:' + esc(h) + (pic ? ';background-image:' + esc(DC.cssUrl(pic)) : '') + '"></span></div>' +
      DC.field('dn-cn', 'Название', nm, 'Например: бургундский, кремовый') + '<div class="dr-btns"><label class="dr-sbtn dp-file">' + (pic ? 'Заменить фото' : '＋ Фото выкраса') + '<input type="file" accept="image/*" id="dn-cf"></label>' + (pic ? '<button type="button" class="dr-sbtn is-quiet" id="dn-cx">Убрать фото</button>' : '') + '</div>',
      actions: [{ label: 'Сохранить', kind: 'primary', onClick: function (ev, api) {
        m.dna[i] = api.el.querySelector('#dn-ch').value.toUpperCase(); m.dnaNames = m.dnaNames || []; m.dnaNames[i] = api.el.querySelector('#dn-cn').value.trim(); m.dnaPhotos = m.dnaPhotos || []; m.dnaPhotos[i] = pic; m.dnaSource = m.dnaSource || 'designer'; DC.saveMeta(); DC.paint();
      } }] });
    var cp = sh.el.querySelector('#dn-cp');
    sh.el.querySelector('#dn-ch').addEventListener('input', function (e) { cp.style.backgroundColor = e.target.value; });
    sh.el.querySelector('#dn-cf').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) photo(f, 400).then(function (u) { pic = u; cp.style.backgroundImage = DC.cssUrl(u); }); });
    var cx = sh.el.querySelector('#dn-cx'); if (cx) cx.addEventListener('click', function () { pic = ''; cp.style.backgroundImage = 'none'; });
  };
  DC.acts['dna-manual'] = function () {
    var code = st.cap, m = DC.meta(code), cur = m.dna && m.dna.length === 7 ? m.dna.slice() : ['#F2EDE4', '#E3D9CB', '#C8B8A4', '#9C8672', '#6B5646', '#3A2F28', '#A24E32'], nms = (m.dnaNames || []).slice();
    var sh = DC.sheet({ title: 'Цветовая гамма', html: '<p class="small muted">' + (m.dna ? 'Поменяйте цвета и названия.' : 'Стартовые цвета — заготовка, замените на цвета капсулы.') + ' Порядок: сначала основа (стены, потолок), потом второй цвет, в конце акценты.</p><div class="dn-mrows">' +
      cur.map(function (h, i) { return '<div class="dn-mrow"><input type="color" data-mc="' + i + '" value="' + esc(h) + '"><input class="input" data-mn="' + i + '" value="' + esc(nms[i] || '') + '" placeholder="Название цвета ' + (i + 1) + '"></div>'; }).join('') + '</div>',
      actions: [{ label: 'Сохранить', kind: 'primary', onClick: function (ev, api) {
        m.dna = cur.map(function (h, i) { return api.el.querySelector('[data-mc="' + i + '"]').value.toUpperCase(); }); m.dnaNames = cur.map(function (h, i) { return api.el.querySelector('[data-mn="' + i + '"]').value.trim(); }); m.dnaSource = 'designer'; DC.saveMeta(); DC.paint(); ui.toast('Цветовая гамма сохранена');
      } }, { label: 'Отмена', kind: 'link' }] });
  };
  /* сверху первой вкладки — файлы интерьера: дизайн-проект, планировка, спецификация (Алина 12.11: «где дизайнер грузит дизайн-проект») */
  /* нижний раздел «Интерьера»: спецификация — загруженная сразу раскладывается в раздел товаров (вкладка «Материалы») */
  function specBlock(code) {
    var m = st.meta[code] || {}, can = DC.canEdit(code), f = m.sheet_file || m.spec_file, sm = m.sheet_stats;
    return '<section class="dp-card dn-sblock"><h2>Материалы</h2>' +
      (f ? '<p class="da-sub">Загружена: <b>' + esc(f) + '</b>' + (sm ? ' · в раздел товаров добавлено ' + DC.plural(sm.n, 'строка', 'строки', 'строк') + (sm.noRoom ? ', без комнаты — ' + sm.noRoom : '') + (sm.noPos ? ', без позиции — ' + sm.noPos : '') : '') + '.</p>' : '<p class="da-sub">Загрузите спецификацию — товары сами встанут в раздел «Спецификация» по комнатам и позициям.</p>') +
      '<div class="dr-btns">' + (can ? '<label class="dr-sbtn dp-file">' + (f ? 'Загрузить другую' : '＋ Спецификация · PDF, Excel, CSV') + '<input type="file" accept=".pdf,.xlsx,.xls,.csv" data-specany="1"></label>' : '') + (f ? '<button type="button" class="dr-sbtn" data-act="tab" data-tab="rows">Открыть товары</button>' : '') + '</div></section>';
  }
  root.addEventListener('change', function (e) { var t = e.target; if (t.getAttribute && t.getAttribute('data-apt-sel')) { st.apt = t.value; st.flat = ({ studio: 'studio', euro2: 'k1', euro3: 'k2', euro4: 'k3', euro5: 'k4' })[t.value] || ''; DC.paint(); } });
  root.addEventListener('change', function (e) {
    var t = e.target; if (!t.getAttribute('data-specany') || !t.files || !t.files[0]) return;
    var code = st.cap, f = t.files[0]; if (!DC.canEdit(code)) return;
    if (/\.pdf$/i.test(f.name)) { st.tab = 'rows'; DC.paint(); var i = root.querySelector('[data-spec]'); if (i) { var dt = new DataTransfer(); dt.items.add(f); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); } }
    else readSheetFile(f).then(function (raw) { importPreview(code, mapRows(code, raw), f.name); }, function (er) { ui.toast('Таблица не прочиталась: ' + er.message, 'error'); });
  });
  /* внизу первой вкладки — отправка на проверку; после проверки главного дизайнера здесь «Опубликована» */
  var basePassportTab = DC.capTabs.passport;
  DC.capTabs.passport = function (code, level) {
    var html = basePassportTab(code, level); html = html.slice(0, html.lastIndexOf('</div>')) + specBlock(code) + '</div>'; if (ROLE.chief) return html;
    var s = DC.statusOf(code), v = DC.versionOf(code), body = '';
    if (s === 'draft' || s === 'fix') {
      var bl = DC.blockers ? DC.blockers(code) : [];
      body = (bl.length ? '<p class="da-sub">Чтобы отправить, исправьте обязательное: ' + DC.plural(bl.length, 'замечание', 'замечания', 'замечаний') + '. <button type="button" class="dn-link" data-act="tab" data-tab="check">Открыть «Проверку»</button></p>' : '<p class="da-sub">Обязательное заполнено — можно отправлять главному дизайнеру.</p>') +
        '<button type="button" class="btn btn--primary btn--block" data-act="st-send"' + (bl.length ? ' disabled' : '') + '>' + (s === 'fix' ? 'Отправить снова' : 'Отправить на проверку') + '</button>';
    } else if (s === 'review') body = '<div class="dn-state is-wait"><b>На проверке</b><span>Главный дизайнер смотрит версию ' + v + '. Когда проверка пройдёт, капсула станет «Опубликована».</span></div>';
    else if (s === 'pub') body = '<div class="dn-state is-ok"><b>✓ Опубликована</b><span>Версия ' + v + ' на витрине. Чтобы поменять — «Внести изменения» вверху.</span></div>';
    else body = '<div class="dn-state"><b>' + esc(DC.statusLabel(s)) + '</b><span>Только просмотр.</span></div>';
    return html + '<section class="dp-card dn-send">' + body + '</section>';
  };
  DC.acts.slot = function (b) {
    var code = st.cap, key = b.getAttribute('data-k'), d = slotDef(key), v = slotVal(code, key), can = DC.canEdit(code), spec = fromSpec(code, d[1]), own = (st.meta[code] || {}).slots && st.meta[code].slots[key];
    var p = v && v.product;
    var m = DC.sheet({ title: d[1] + ' · ' + d[2], html: '<p class="small muted">Материал ДНК · по нему собирается доска и визуализации' + (can ? '' : ' · только просмотр') + '</p>' +
      (v ? '<div class="dr-mini"><span class="da-opt__pic"' + (p && p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><span class="da-opt__b"><b>' + esc(p ? p.name : v.guess) + '</b><span>' + SRC[v.source || 'designer'] + '</span></span><span class="da-opt__pr">' + (p && DC.price(p) ? F.rub(DC.price(p)) : '') + '</span></div>' : '<div class="da-ok">Материал не выбран.</div>') +
      (can ? '<div class="dr-btns"><button type="button" class="dr-sbtn" data-s="cat">' + (v ? '⇄ Заменить из каталога' : 'Подобрать в каталоге') + '</button><button type="button" class="dr-sbtn" data-s="link">Ссылкой</button>' + (spec && own ? '<button type="button" class="dr-sbtn" data-s="spec">Взять из спецификации</button>' : '') + (own ? '<button type="button" class="dr-sbtn is-quiet" data-s="clear">Очистить</button>' : '') + '</div>' +
        '<div class="dr-btns"><label class="dr-sbtn dp-file">' + (v && v.img ? 'Заменить фото' : '＋ Фото материала') + '<input type="file" accept="image/*" id="dn-si"></label></div>' +
        '<div class="field"><label for="dn-g">Или словами</label><input class="input" id="dn-g" placeholder="Например: дуб светлый, матовый" value="' + esc(own && !own.product ? own.guess : '') + '"></div>' : ''),
      actions: can ? [{ label: 'Сохранить', kind: 'primary', onClick: function (ev, api) { var t = api.el.querySelector('#dn-g').value.trim(); if (t) setSlot(code, key, { guess: t, source: 'designer' }); } }] : [{ label: 'Закрыть', kind: 'primary' }] });
    var si = m.el.querySelector('#dn-si'); if (si) si.addEventListener('change', function () { var f = si.files[0]; if (!f) return; photo(f, 520).then(function (u) { var t = m.el.querySelector('#dn-g').value.trim(); m.close(); setSlot(code, key, merge2(own || {}, { img: u, guess: t || (own && own.guess) || (p && p.name) || d[2], source: (own && own.source) || 'designer' })); ui.toast('Фото материала добавлено'); }); });
    m.el.addEventListener('click', function (e) {
      var s = e.target.closest('[data-s]'); if (!s) return; var a = s.getAttribute('data-s'); m.close();
      if (a === 'cat') DC.openSearch('Материал ДНК из каталога', d[2], v && !p ? v.guess : d[2], function (product) { setSlot(code, key, { product: product, guess: product.name, source: 'designer' }); ui.toast('Материал выбран'); });
      else if (a === 'link') DC.openLink(d[2], p, function (product) { setSlot(code, key, { product: product, guess: product.name, source: 'designer' }); });
      else if (a === 'spec' || a === 'clear') setSlot(code, key, null);
    });
  };

  /* ── разбор рендеров с ИИ ── */
  function zoneSlot(t) {
    t = String(t || '').toLowerCase();
    var R = [[/фартук|apron|backsplash/, 'apron'], [/акцент|accent/, 'accentWall'], [/(санузл|ванн|bath).*(стен|плитк|wall|tile)|(стен|плитк|wall).*(санузл|ванн|bath)/, 'bathWalls'], [/плитка пол|floor.?tile|керамогранит.*пол|пол.*(санузл|плитк)/, 'floorTile'], [/плинтус|молдинг|mold|baseboard/, 'moldings'],
      [/потол|ceiling/, 'ceiling'], [/двер|door/, 'doors'], [/сантех|plumb|смесител|раковин/, 'plumbing'], [/свет|light|люстр|lamp/, 'light'], [/фурнитур|розет|hardware|ручк/, 'hardware'], [/пол|floor|паркет|ламинат/, 'floor'], [/стен|wall|краск|обои/, 'walls']];
    for (var i = 0; i < R.length; i++) if (R[i][0].test(t)) return R[i][1];
    return '';
  }
  var FURN = /мебел|диван|кресл|стул|стол(?!еш)|кроват|шкаф|тумб|комод|стеллаж|пуф|консол|банкет|гарнитур|sofa|couch|armchair|chair|stool|table|bed\b|wardrobe|cabinet|shel[fv]|nightstand|dresser|ottoman|furniture|bench/i;
  var lastNames = [];
  function cap1(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function readable(code) { return DC.renders(code).map(function (r) { return r.url; }).filter(function (u) { return /^data:|^assets\//.test(u); }); }
  DC.aiCard = function (code, can) {
    if (!can) return '';
    var n = DC.renders(code).length, busy = st.aiBusy === code;
    return '<section class="dp-card dn-ai"><h2>✦ ДНК по рендерам</h2><p class="da-sub">' + (n ? 'Стиль, название, описание, 7 цветов и материалы ДНК ИИ заполняет сам при загрузке рендеров. Всё можно поправить руками.' : 'Загрузите рендеры — ИИ сам заполнит стиль, название, описание, 7 цветов и материалы ДНК.') + '</p>' +
      (busy ? '<div class="dp-stage"><span class="dp-spin"></span>Разбираю рендеры… до минуты</div>' : n ? '<button type="button" class="dr-sbtn dp-auto" data-act="ai-fill">Пересобрать по рендерам</button>' : '') + '</section>';
  };
  DC.acts['ai-fill'] = function () { DC.aiFill(st.cap, false); };
  /* auto = сразу после загрузки рендеров: заполняем всё без окна выбора */
  DC.aiFill = function (code, auto) {
    var src = readable(code)[0];
    if (!src) { if (auto) return; ui.toast('Эти рендеры лежат на сервере, браузер их прочитать не может — загрузите файлы рендеров', 'error'); return; }
    var live = S.genLive && S.genLive.isOn && S.genLive.isOn();
    st.aiBusy = code; DC.paint();
    (live ? S.genLive.analyze(src) : Promise.reject(new Error('off'))).then(function (a) { return a && a.ai ? a : null; }).catch(function () { return null; }).then(function (a) {
      /* 7 цветов: палитра ИИ, а если ИИ не ответил — палитра по пикселям всех рендеров */
      lastNames = a && a.dna ? a.dna.map(function (c) { return c.name || ''; }) : [];
      return (a && a.dna ? Promise.resolve(a.dna.map(function (c) { return c.hex; })) : DC.buildDna(code)).then(function (dna) { return { a: a, dna: dna }; }, function () { return { a: a, dna: null }; });
    }).then(function (r) { st.aiBusy = ''; DC.paint(); proposal(code, r.a, r.dna, auto); });
  };
  function proposal(code, a, dna, auto) {
    var ai = a && a.ai, items = [], slots = {}, furnAI = [];
    if (ai) {
      if (ai.title) { items.push(['style', 'Стиль', cap1(ai.title)]); items.push(['name', 'Название', cap1(ai.title)]); }
      var desc = [ai.tagline, ai.combination].filter(Boolean).join(' '); if (desc) items.push(['description', 'Общее описание', desc]);
      var board = (ai.boards || []).filter(function (b) { return b.materials && b.materials.length; })[0];
      /* мебель: всё, что ИИ увидел на рендере и что не отделка — диван, кресло, стол, кровать… */
      if (board) board.materials.forEach(function (mt) { var t = (mt.zone || '') + ' ' + (mt.name || ''); if (!FURN.test(t) || furnAI.some(function (x) { return x.name === (mt.name || ''); })) return; var p0 = (mt.products || [])[0]; furnAI.push({ name: cap1(mt.name || ''), color: /^#[0-9a-f]{6}$/i.test(mt.color || '') ? mt.color : '', source: 'ai', product: p0 ? { source: 'catalog', id: p0.id, name: p0.name || '', brand: p0.brand || '', price_metod: DC.num(p0.price), price_retail: 0, img: p0.img || '', url: p0.url || '' } : null }); });
      if (board) board.materials.forEach(function (mt) { if (FURN.test((mt.zone || '') + ' ' + (mt.name || ''))) return; var k = zoneSlot((mt.zone || '') + ' ' + (mt.name || '')); if (!k || slots[k]) return; var p = (mt.products || [])[0]; slots[k] = { guess: mt.name || '', color: /^#[0-9a-f]{6}$/i.test(mt.color || '') ? mt.color : '', source: 'ai', product: p ? { source: 'catalog', id: p.id, name: p.name || '', brand: p.brand || '', price_metod: DC.num(p.price), price_retail: 0, img: p.img || '', url: p.url || '' } : null }; });
    }
    var sk = Object.keys(slots);
    if (!ai && !dna) { ui.toast('Разобрать не получилось — заполните поля сами', 'error'); return; }
    /* keep = автозаполнение: заполняем только пустое, то, что дизайнер уже задал, не трогаем */
    function apply(on, keep) {
      var m = DC.meta(code), nm = DC.meta(code).name;
      items.forEach(function (i) { if (on(i[0]) && !(keep && m[i[0]] && !(i[0] === 'name' && nm === 'Новая капсула'))) m[i[0]] = i[2]; });
      if (dna && on('dna') && !(keep && m.dna && m.dna.length === 7)) { m.dna = dna.slice(0, 7); m.dnaNames = (lastNames || []).slice(0, 7); m.dnaSource = ai ? 'ai' : 'renders'; }
      if (sk.length && on('slots')) { m.slots = m.slots || {}; sk.forEach(function (k) { if (!(keep && m.slots[k])) m.slots[k] = slots[k]; }); }
      if (furnAI.length && on('furn') && !(keep && m.dnaFurn && m.dnaFurn.length)) m.dnaFurn = furnAI;
      DC.saveMeta(); DC.paint();
    }
    if (auto) { apply(function () { return true; }, true); ui.toast(ai ? 'ДНК заполнена по рендерам — проверьте и поправьте, если нужно' : 'ИИ сейчас не ответил — по рендерам собраны только 7 цветов', ai ? '' : 'error'); return; }
    var html = '<p class="small muted">' + (ai ? 'Отметьте, что принять. Потом всё можно поправить руками.' : 'ИИ сейчас не ответил — получилось собрать только цвета по рендерам. Стиль, название и материалы заполните сами.') + '</p><div class="dn-prop">' +
      items.map(function (i) { return '<label class="dn-pi"><input type="checkbox" data-p="' + i[0] + '" checked><span><b>' + i[1] + '</b><span>' + esc(i[2]) + '</span></span></label>'; }).join('') +
      (dna ? '<label class="dn-pi"><input type="checkbox" data-p="dna" checked><span><b>7 цветов</b><span class="dn-sw">' + dna.map(function (h) { return '<i style="background:' + esc(h) + '"></i>'; }).join('') + '</span></span></label>' : '') +
      (sk.length ? '<label class="dn-pi"><input type="checkbox" data-p="slots" checked><span><b>Материалы · ' + sk.length + ' из 12</b><span>' + sk.map(function (k) { return esc(slotDef(k)[2] + ': ' + (slots[k].product ? slots[k].product.name : slots[k].guess)); }).join('<br>') + '</span></span></label>' : '') +
      (furnAI.length ? '<label class="dn-pi"><input type="checkbox" data-p="furn" checked><span><b>Мебель · ' + furnAI.length + '</b><span>' + furnAI.map(function (x) { return esc(x.name + (x.product ? ': ' + x.product.name : '')); }).join('<br>') + '</span></span></label>' : '') + '</div>';
    DC.sheet({ title: 'Разобрали рендеры', html: html, actions: [{ label: 'Заполнить выбранное', kind: 'primary', onClick: function (ev, api) {
      apply(function (k) { var el = api.el.querySelector('[data-p="' + k + '"]'); return !!(el && el.checked); }); ui.toast('Заполнено — проверьте и поправьте, если нужно');
    } }, { label: 'Не сейчас', kind: 'link' }] });
  }

  /* ── как заполнить спецификацию: сгенерировать · загрузить файл · подгрузить таблицу · руками ── */
  function lvName(l) { return DC.LEVELS.filter(function (x) { return x[0] === l; })[0][1]; }
  function curRoom(code) { var rs = DC.realRooms(code); return rs.indexOf(st.room) >= 0 ? st.room : rs[0] || ''; }
  /* типы квартир: какие комнаты капсулы покрывают тип и сколько позиций заполнено; недостающее подбирает ИИ (материалы ДНК + каталог) */
  function aptSrc(code, room) {
    var have = DC.realRooms(code);
    if (have.indexOf(room) >= 0) return [room];
    if (room === 'Кухня-гостиная') return have.filter(function (r) { return r === 'Гостиная' || r === 'Кухня'; });
    if (room === 'Гостиная' || room === 'Кухня') return have.indexOf('Кухня-гостиная') >= 0 ? ['Кухня-гостиная'] : [];
    return [];
  }
  function aptBlock(code, can) {
    if (!DC.aptTypes) return '';
    var types = DC.aptTypes(), cur = types.filter(function (t) { return t.code === st.apt; })[0] || null, job = st.specJob && st.specJob.code === code;
    function stat(t) { var n = 0, mm = 0, seen = {}; t.rooms.forEach(function (r) { var src = aptSrc(code, r); (src.length ? src : [r]).forEach(function (x) { if (seen[x]) return; seen[x] = 1; var f = DC.roomFill(code, st.level, x); n += f.n; mm += f.m; }); }); return { n: n, m: mm }; }
    var chips = '<div class="dn-f dn-f--5"><button type="button" class="' + (cur ? '' : 'is-on') + '" data-act="apt" data-apt="">Все комнаты</button>' + types.map(function (t) { var s0 = stat(t); return '<button type="button" class="' + (cur && t.code === cur.code ? 'is-on' : '') + '" data-act="apt" data-apt="' + t.code + '">' + esc(t.name) + ' <span>' + (s0.m ? Math.round(100 * s0.n / s0.m) + '%' : '—') + '</span></button>'; }).join('') + '</div>';
    if (!cur) return '<section class="dp-card dn-apt"><h2>Тип квартиры<span>выберите — ниже останутся комнаты этого типа</span></h2>' + chips + '</section>';
    var cnt = {}; cur.rooms.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
    var rows = Object.keys(cnt).map(function (r) {
      var src = aptSrc(code, r), f = (src.length ? src : [r]).reduce(function (a, x) { var y = DC.roomFill(code, st.level, x); return { n: a.n + y.n, m: a.m + y.m }; }, { n: 0, m: 0 });
      return '<div class="dk-kvr"><span>' + esc(r) + (cnt[r] > 1 ? ' × ' + cnt[r] : '') + (src.length && src[0] !== r ? ' <i class="dn-apt__src">= ' + esc(src.join(' + ')) + '</i>' : !src.length ? ' <i class="dn-apt__src is-new">нет в капсуле</i>' : '') + '</span><b>' + f.n + ' из ' + f.m + '</b></div>';
    }).join('');
    return '<section class="dp-card dn-apt"><h2>Тип квартиры<span>товары под тип подбирает ИИ</span></h2>' + chips + rows +
      (cur.rooms.some(function (r) { return cnt[r] > 1; }) ? '<p class="small muted">Одинаковые комнаты получают одни товары, количество считается на каждую.</p>' : '') +
      (can && !job ? '<div class="dr-btns"><button type="button" class="btn btn--primary btn--small" data-act="apt-fill" data-apt="' + cur.code + '">✦ Подобрать товары для «' + esc(cur.name) + '»</button></div>' : '') + '</section>';
  }
  /* комнаты списка «Материалов» для выбранного типа: комнаты типа (из капсулы или новые) + «Общее» */
  DC.aptRooms = function (code) {
    var t = st.apt && DC.aptTypes ? DC.aptTypes().filter(function (x) { return x.code === st.apt; })[0] : null, all = DC.capRooms(code);
    if (!t) return all;
    var out = [], cnt = {};
    t.rooms.forEach(function (r) { var src = aptSrc(code, r); (src.length ? src : [r]).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); if (src.length <= 1) cnt[x] = (cnt[x] || 0) + 1; }); });
    out.push('Общее');
    var list = [];   /* две спальни в типе квартиры — в списке «Спальня» и «Спальня 2» */
    DC.ROOM_NAMES.forEach(function (r) { if (out.indexOf(r) < 0) return; list.push(r); for (var i = 2; i <= (cnt[r] || 1); i++) list.push(r + ' ' + i); });
    return list;
  };
  DC.acts.apt = function (b) { st.apt = b.getAttribute('data-apt'); DC.paint(); };
  DC.acts['apt-fill'] = function (b) {
    var code = st.cap, t = DC.aptTypes().filter(function (x) { return x.code === b.getAttribute('data-apt'); })[0], rooms = [];
    if (!t) { DC.acts['sp-gen']({ getAttribute: function () { return '*'; } }); return; }
    t.rooms.forEach(function (r) { var src = aptSrc(code, r); (src.length ? src : [r]).forEach(function (x) { if (rooms.indexOf(x) < 0) rooms.push(x); }); });
    DC.acts['sp-gen']({ getAttribute: function () { return rooms.join('|'); } });
  };
  /* верх «Материалов» — одна панель: для какой квартиры · ✦ заполнить пустое · остальные способы свёрнуты */
  DC.rowsTop = function (code) {
    var m = st.meta[code] || {}, can = DC.canEdit(code), room = curRoom(code), job = st.specJob && st.specJob.code === code ? st.specJob : null;
    var types = DC.aptTypes ? DC.aptTypes() : [], cur = types.filter(function (t) { return t.code === st.apt; })[0] || null;
    st.apt = ''; st.flat = ''; var sel = ''; /* поле «Квартира» с вкладки убрано (Алина 13.11): бюджет по типам квартир — внизу, отличия по типам — в карточке материала */
    var bud = ''; /* сводку сборки карточек Алина убрала с экрана 13.11 («это всё лишнее»); сверка доступна из кода: DC.matCheck(code) */
    var catalog = '<div class="dn-cat-top"><label for="dn-sq">Каталог</label><input class="input" id="dn-sq" placeholder="Найти товар: название, бренд, категория" value="' + esc(st.sQ || '') + '" autocomplete="off">' +
      (st.sQ ? '<p class="pj-mut">' + (can ? 'Нажмите товар — откроется карточка материала: выберите зоны, и он встанет в интерьер.' : 'Интерьер закрыт для правок. Нажмите товар — предложу внести изменения и добавить его.') + '</p>' : '') + specResults() + '</div>';
    if (!can) return bud + '<section class="dp-card dn-bar">' + catalog + '</section>';
    if (job) return bud + '<section class="dp-card dn-bar">' + sel + '<div class="dp-stage"><span class="dp-spin"></span>' + esc(job.text) + '</div></section>';
    var open = !!st.waysOpen;
    var ways = open ? '<div class="dn-ways">' +
      '<div class="dn-way"><b>Загрузить таблицу</b><span>Excel, CSV или Google-таблица.</span><div class="dr-btns"><label class="dr-sbtn dp-file">Файл<input type="file" accept=".xlsx,.xls,.csv" data-sheet="1"></label><button type="button" class="dr-sbtn" data-act="sp-gsheet">Ссылкой</button><button type="button" class="dr-sbtn is-quiet" data-act="sp-tpl">Шаблон</button></div></div>' +
      '<div class="dn-way"><b>Загрузить PDF спецификации</b><span>' + (m.spec_file ? 'Загружена: «' + esc(m.spec_file) + '». ' : '') + 'Разложу по комнатам и позициям (в прототипе демо-разбор).</span><div class="dr-btns"><label class="dr-sbtn dp-file">' + (m.spec_file ? 'Другой файл' : 'PDF') + '<input type="file" accept=".pdf" data-spec="1"></label></div></div></div>' : '';
    return bud + '<section class="dp-card dn-bar">' + catalog + sel +
      '<div class="dn-bar__acts"><button type="button" class="btn btn--primary btn--small" data-act="apt-fill" data-apt="' + (cur ? cur.code : '') + '">✦ Заполнить пустое с ИИ</button><button type="button" class="dr-sbtn" data-act="ways">' + (open ? 'Скрыть' : 'Таблица или PDF') + '</button></div>' +
      '<p class="dn-bar__hint">ИИ ставит товары только в пустые позиции: отделку — из ДНК, остальное — из каталога. То, что уже стоит, не трогает.</p>' + ways + '</section>';
  };
  DC.acts.ways = function () { st.waysOpen = !st.waysOpen; DC.paint(); };
  function specResults() {
    var q = (st.sQ || '').trim(); if (q.length < 2) return '';
    if (st.sBusy) return '<div class="da-ok">Ищу…</div>';
    if (st.sErr) return '<div class="da-err">Каталог не ответил (' + esc(st.sErr) + ').</div>';
    var r = st.sRes; if (!r || !r.items.length) return '<div class="da-ok">Ничего не нашлось.</div>';
    return '<div class="dr-tiles dn-cat">' + r.items.map(function (p, i) { return '<button type="button" class="dr-tile" data-act="c-prod" data-src="spec" data-i="' + i + '"><span class="dr-tile__pic"' + (p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><b>' + esc(p.name) + '</b><span class="da-row__p">' + esc(p.brand || '') + '</span><span class="da-row__r">' + (DC.price(p) ? '<em>' + F.rub(DC.price(p)) + '</em>' : '<span class="is-none">нет цены</span>') + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') + '</span></button>'; }).join('') + '</div>' +
      (r.total > r.items.length ? '<p class="da-sub">Первые ' + r.items.length + ' из ' + F.num(r.total) + ' — уточните запрос.</p>' : '');
  }
  var sSeq = 0, sTimer = null;
  function specRun() {
    var q = (st.sQ || '').trim(); if (q.length < 2 || !DC.API) { st.sRes = null; st.sBusy = false; DC.paint(); keepFocus('dn-sq'); return; }
    var my = ++sSeq; st.sBusy = true; st.sErr = ''; DC.paint(); keepFocus('dn-sq');
    DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(q) + '&page_size=12').then(function (d) { if (my !== sSeq) return; st.sRes = { items: d.items || [], total: d.total || 0 }; st.sBusy = false; DC.paint(); keepFocus('dn-sq'); })
      .catch(function (e) { if (my !== sSeq) return; st.sBusy = false; st.sErr = e.message; DC.paint(); keepFocus('dn-sq'); });
  }
  function keepFocus(id) { var i = document.getElementById(id); if (i && st.typing === id) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  root.addEventListener('input', function (e) { if (e.target.id !== 'dn-sq') return; st.sQ = e.target.value; st.typing = 'dn-sq'; clearTimeout(sTimer); sTimer = setTimeout(specRun, 400); });
  root.addEventListener('focusout', function (e) { if (e.target.id === 'dn-sq' || e.target.id === 'dn-cq') setTimeout(function () { if (document.activeElement !== e.target) st.typing = ''; }, 0); });

  /* очередь запросов к каталогу: по 3 одновременно, с прогрессом */
  function runJobs(code, jobs, text, worker, done) {
    var i = 0, fin = 0, ok = 0; st.specJob = { code: code, text: text + ' · 0 из ' + jobs.length }; DC.paint();
    function next() {
      if (i >= jobs.length) return; var j = jobs[i++];
      worker(j).then(function (r) { if (r) ok++; }, function () {}).then(function () { fin++; st.specJob.text = text + ' · ' + fin + ' из ' + jobs.length; var el = root.querySelector('.dn-bar .dp-stage, .dn-spec .dp-stage'); if (el) el.lastChild.textContent = st.specJob.text; if (fin === jobs.length) { st.specJob = null; DC.saveEdits(); DC.paint(); done(ok); } else next(); });
    }
    if (!jobs.length) { st.specJob = null; DC.paint(); done(0); return; }
    for (var k = 0; k < 3; k++) next();
  }
  /* генерация: пустые позиции комнаты → материал ДНК (если позиция — слот отделки) или первый товар каталога с ценой и фото */
  DC.acts['sp-gen'] = function (b) {
    var code = st.cap, level = st.level, r = b.getAttribute('data-room'), rooms = r === '*' ? DC.realRooms(code) : r.split('|'), jobs = [], m = st.meta[code] || {};
    rooms.forEach(function (room) { DC.roomCells(code, level, room).forEach(function (c) { if (!c.main && c.pos && !POS[c.pos].hidden) jobs.push([room, c.pos]); }); });
    if (!jobs.length) { ui.toast('Пустых позиций нет — всё заполнено'); return; }
    var fromDna = 0;
    jobs = jobs.filter(function (j) {
      var sl = POS[j[1]].slot, key = sl && SLOTS.filter(function (s) { return s[1] === sl; })[0], v = key && m.slots && m.slots[key[0]];
      if (v && v.product) { DC.addRow(code, level, { pos: j[1], room: j[0], product: v.product, origin: 'gen' }); fromDna++; return false; }
      return true;
    });
    runJobs(code, jobs, 'Подбираю товары каталога', function (j) {
      return DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(POS[j[1]].name) + '&page_size=6').then(function (d) {
        var its = d.items || [], it = its.filter(function (x) { return DC.price(x) && x.img; })[0] || its[0];
        if (!it) return false; DC.addRow(code, level, { pos: j[1], room: j[0], product: DC.catProduct(it), origin: 'gen' }); return true;
      });
    }, function (ok) { var n = ok + fromDna; ui.toast(n ? 'Сгенерировано: ' + DC.plural(n, 'позиция', 'позиции', 'позиций') + (fromDna ? ' (из ДНК — ' + fromDna + ')' : '') + ' · уровень ' + lvName(level) + '. Проверьте метки «сгенерировано»' : 'Каталог ничего не нашёл'); });
  };

  /* ── таблица: Excel / CSV / Google ── */
  var COLS = [['room', /комнат|помещ|зона|room/], ['pos', /позиц|тип|position/], ['name', /товар|наимен|назван|name|модел|артик/], ['brand', /бренд|произв|brand|поставщ/], ['metod', /metod|метод|закрыт|партн/], ['price', /цен|розниц|стоим|price|retail/],
    ['url', /ссылк|url|link|сайт/], ['img', /фото|изобр|картин|img|image|photo/], ['level', /уровен|level|база|премиум/], ['share', /дол|share/]];
  function parseCsv(t) {
    var rows = [], row = [], cell = '', q = false, sep = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (var i = 0; i < t.length; i++) { var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function xlsxLib() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = function () { ok(window.XLSX); }; s.onerror = function () { no(new Error('не загрузилась библиотека Excel — сохраните таблицу как CSV')); }; document.head.appendChild(s); });
  }
  function readSheetFile(file) {
    if (/\.csv$/i.test(file.name)) return file.text().then(parseCsv);
    return Promise.all([xlsxLib(), file.arrayBuffer()]).then(function (r) { var wb = r[0].read(r[1], { type: 'array' }); return r[0].utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }); });
  }
  function moneyCell(v) { var n = Number(String(v == null ? '' : v).replace(/[^\d.,]/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n) : 0; }
  /* строки таблицы → строки состава: шапка — первая строка, где нашлась колонка товара или позиции */
  function mapRows(code, raw) {
    var hi = -1, idx = {};
    for (var r = 0; r < Math.min(raw.length, 10) && hi < 0; r++) {
      var h = {}; raw[r].forEach(function (cell, ci) { var t = String(cell || '').toLowerCase(); COLS.forEach(function (c) { if (h[c[0]] == null && c[1].test(t)) { if (c[0] === 'price' && /metod|метод|закрыт|партн/.test(t)) return; h[c[0]] = ci; } }); });
      if (h.name != null || h.pos != null) { hi = r; idx = h; }
    }
    if (hi < 0) return { err: 'Не нашла шапку: нужна колонка «Товар» или «Позиция».' };
    var out = [], capRooms = DC.realRooms(code);
    raw.slice(hi + 1).forEach(function (row) {
      var g = function (k) { return idx[k] == null ? '' : String(row[idx[k]] == null ? '' : row[idx[k]]).trim(); };
      var name = g('name'), posT = g('pos'); if (!name && !posT) return;
      var title = posT || name, sr = DC.splitRoom(title), room = DC.roomName(g('room')) || sr.room || '';
      var pos = POS[posT] ? posT : (DC.KB.list.filter(function (p) { return p.name.toLowerCase() === posT.toLowerCase(); })[0] || {}).code || DC.resolvePos(title, room, '') || DC.guessPos(title, room, '') || (name !== title ? DC.resolvePos(name, room, '') : '');
      if (!room && pos && POS[pos].rooms.length === 1) room = POS[pos].rooms[0];
      var lv = g('level').toLowerCase(), levels = /прем|prem/.test(lv) ? ['премиум'] : /баз|base/.test(lv) ? ['база'] : [st.level];
      var url = g('url'), product = name ? { source: url ? 'link' : 'table', id: null, name: name, brand: g('brand'), url: url, img: /^https?:/.test(g('img')) ? g('img') : '', price_retail: moneyCell(g('price')), price_metod: moneyCell(g('metod')) } : null;
      out.push({ title: title, room: room, pos: pos, levels: levels, product: product, share: Number(g('share').replace(',', '.')) > 0 ? Number(g('share').replace(',', '.')) : 1, newRoom: room && capRooms.indexOf(room) < 0 });
    });
    return { rows: out };
  }
  /* таблица спецификации → сразу в раздел товаров (Алина 12.11: «если загружена спецификация, её подгружает в раздел товаров») */
  function importPreview(code, res, src) {
    if (res.err) { ui.toast(res.err, 'error'); return; }
    var rows = res.rows; if (!rows.length) { ui.toast('В таблице нет строк с товарами', 'error'); return; }
    rows.forEach(function (r) { r.levels.forEach(function (l) { DC.addRow(code, l, { pos: r.pos, room: r.room, product: r.product, share: r.share, origin: 'import', position: r.pos ? POS[r.pos].name : r.title, title: r.title }); }); });
    var sm = { n: rows.length, noRoom: rows.filter(function (r) { return !r.room; }).length, noPos: rows.filter(function (r) { return !r.pos; }).length };
    var m = DC.meta(code); m.sheet_file = src; m.sheet_stats = sm; DC.saveMeta(); DC.paint();
    ui.toast('Спецификация в разделе товаров: ' + DC.plural(sm.n, 'строка', 'строки', 'строк') + (sm.noRoom || sm.noPos ? ' · проверьте ' + (sm.noRoom + sm.noPos) + ' без комнаты или позиции' : ''));
  }
  DC.acts['sp-tpl'] = function () {
    var csv = '﻿Комната;Позиция;Товар;Бренд;Цена;Цена METOD;Ссылка;Фото;Уровень;Доля\nСпальня;Люстра;Люстра в французском стиле 80 см;Maytoni;36000;30600;https://…;https://…;База;1\nКухня-гостиная;Диван;Прямой диван 220 см;LAVSIT;89000;75650;https://…;https://…;Премиум;1\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'shablon-specifikacii.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };
  DC.acts['sp-gsheet'] = function () {
    var code = st.cap;
    DC.sheet({ title: 'Google-таблица ссылкой', html: '<p class="small muted">Доступ «Все, у кого есть ссылка — читатель». Берётся первый лист.</p>' + DC.field('dn-gs', 'Ссылка на таблицу', '', 'https://docs.google.com/spreadsheets/d/…', 'url') + '<p class="field__error" id="dn-gse" hidden></p>',
      actions: [{ label: 'Прочитать', kind: 'primary', close: false, onClick: function (ev, api) {
        var u = api.el.querySelector('#dn-gs').value.trim(), id = (u.match(/\/d\/([\w-]{20,})/) || [])[1], err = api.el.querySelector('#dn-gse'), gid = (u.match(/[#&?]gid=(\d+)/) || [])[1];
        if (!id) { err.textContent = 'Это не ссылка на Google-таблицу'; err.hidden = false; return; }
        err.textContent = 'Читаю…'; err.hidden = false;
        fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=csv' + (gid ? '&gid=' + gid : '')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function (t) { if (/^\s*<!doctype|<html/i.test(t)) throw new Error('доступ'); api.close(); importPreview(code, mapRows(code, parseCsv(t)), 'Google-таблица'); })
          .catch(function () { err.textContent = 'Таблица не открылась. Откройте доступ по ссылке или скачайте её как Excel (Файл → Скачать) и загрузите файлом.'; });
      } }] });
  };
  root.addEventListener('change', function (e) {
    var t = e.target, code = st.cap; if (!t.files || !t.files[0] || !DC.canEdit(code)) return;
    if (t.getAttribute('data-sheet')) { var f = t.files[0]; readSheetFile(f).then(function (raw) { importPreview(code, mapRows(code, raw), f.name); }, function (er) { ui.toast('Таблица не прочиталась: ' + er.message, 'error'); }); return; }
    if (!t.getAttribute('data-spec')) return;
    /* PDF в прототипе не читается: демо — ключевые пустые позиции комнат получают первый товар каталога */
    DC.meta(code).spec_file = t.files[0].name; DC.saveMeta();
    var KEY = { 'Кухня-гостиная': ['sofa', 'dining_table'], 'Гостиная': ['sofa'], 'Кухня': ['dining_table'], 'Спальня': ['bed', 'chandelier'], 'Детская': ['bed'], 'Кабинет': ['chairs'], 'Санузел': ['toilet', 'basin'], 'Прихожая': ['mirror'], 'Гардеробная': ['wardrobe'], 'Постирочная': ['washer'] }, jobs = [];
    DC.realRooms(code).forEach(function (room) { (KEY[room] || []).forEach(function (p) { if (!DC.roomCells(code, st.level, room).some(function (c) { return c.pos === p && c.main; })) jobs.push([room, p]); }); });
    runJobs(code, jobs, 'Раскладываю спецификацию по комнатам', function (j) { return DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(POS[j[1]].name) + '&page_size=1').then(function (d) { var it = (d.items || [])[0]; if (!it) return false; DC.LEVELS.forEach(function (l) { DC.addRow(code, l[0], { pos: j[1], room: j[0], product: DC.catProduct(it), origin: 'spec' }); }); return true; }); },
      function (ok) { ui.toast(ok ? 'Из спецификации добавлено: ' + DC.plural(ok, 'позиция', 'позиции', 'позиций') + ' (демо-разбор)' : 'Новых позиций не добавилось — ключевые уже заполнены'); });
  });

  /* ── раздел «Каталог» ── */
  var QUICK = ['Диван', 'Кровать', 'Люстра', 'Керамогранит', 'Краска', 'Смеситель', 'Ламинат', 'Дверь'];
  function catView() {
    var q = st.cQ || '', res = st.cRes, h = DC.head('Каталог', 'Товары Маркета с ценой METOD и розницей. Нажмите товар — поставлю его в вашу капсулу.');
    var top = '<input class="input" id="dn-cq" placeholder="Название, бренд или категория" value="' + esc(q) + '" autocomplete="off"><div class="da-chips">' + QUICK.map(function (x) { return DC.chip('c-quick', x, x, q === x); }).join('') + '</div>';
    var body = !q ? DC.okBox('Введите запрос или выберите подсказку.') : st.cBusy ? DC.okBox('Ищу…') : st.cErr ? '<div class="da-err">Каталог не ответил (' + esc(st.cErr) + ').</div>' : !res || !res.items.length ? DC.okBox('Ничего не нашлось.') :
      '<div class="dr-tiles dn-cat">' + res.items.map(function (p, i) { return '<button type="button" class="dr-tile" data-act="c-prod" data-i="' + i + '"><span class="dr-tile__pic"' + (p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><b>' + esc(p.name) + '</b><span class="da-row__p">' + esc([p.brand, p.category].filter(Boolean).join(' · ')) + '</span><span class="da-row__r">' + (DC.price(p) ? '<em>' + F.rub(DC.price(p)) + '</em>' : '<span class="is-none">нет цены</span>') + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') + '</span></button>'; }).join('') + '</div>' +
      (res.total > res.items.length ? '<p class="da-sub">Показаны первые ' + res.items.length + ' из ' + F.num(res.total) + ' — уточните запрос.</p>' : '');
    return h + top + body;
  }
  var cSeq = 0, cTimer = null;
  function catRun() {
    var q = (st.cQ || '').trim(); if (q.length < 2 || !DC.API) { st.cRes = null; st.cBusy = false; DC.paint(); return; }
    var my = ++cSeq; st.cBusy = true; st.cErr = ''; DC.paint(); refocus();
    DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(q) + '&page_size=24').then(function (d) { if (my !== cSeq) return; st.cRes = { items: d.items || [], total: d.total || 0 }; st.cBusy = false; DC.paint(); refocus(); })
      .catch(function (e) { if (my !== cSeq) return; st.cBusy = false; st.cErr = e.message; DC.paint(); });
  }
  function refocus() { var i = document.getElementById('dn-cq'); if (i && document.activeElement !== i && st.cTyping) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  root.addEventListener('input', function (e) { if (e.target.id !== 'dn-cq') return; st.cQ = e.target.value; st.cTyping = true; st.typing = 'dn-cq'; clearTimeout(cTimer); cTimer = setTimeout(catRun, 400); });
  DC.acts['c-quick'] = function (b) { st.cQ = b.getAttribute('data-v'); st.cTyping = false; catRun(); };
  DC.acts['c-prod'] = function (b) {
    var fromSpec = b.getAttribute('data-src') === 'spec', p = (fromSpec ? st.sRes : st.cRes).items[Number(b.getAttribute('data-i'))], caps = (st.caps || []).filter(function (c) { return (ROLE.chief || DC.designerOf(c.code) === ROLE.who) && DC.canEdit(c.code); });
    if (fromSpec && DC.matAdd && DC.openMaterial) { /* каталог на вкладке «Материалы»: товар сразу становится карточкой материала */
      if (!DC.canEdit(st.cap)) { /* опубликованный интерьер: предлагаем создать черновик следующей версии и добавить товар */
        var cd = st.cap, stt = DC.statusOf(cd), mine = DC.mineCap(cd) && stt === 'pub';
        DC.sheet({ title: 'Интерьер закрыт для правок', html: '<p class="text">' + (mine ? 'Он опубликован. Чтобы добавить «' + esc(p.name) + '», создайте черновик следующей версии — клиенты останутся на опубликованной.' : 'Сейчас его менять нельзя: он на проверке или закрыт главным дизайнером.') + '</p>',
          actions: mine ? [{ label: 'Внести изменения и добавить', kind: 'primary', onClick: function () { DC.setStatus(cd, 'next', 'Создан черновик новой версии'); var id2 = DC.matAdd(cd, DC.catProduct(p)); st.sQ = ''; st.sRes = null; DC.paint(); (function (i) { var x = DC.matById(cd, i); if (x && !x.position && DC.askPos) DC.askPos(cd, i, function () { DC.openMaterial(cd, i, { focus: 'zones' }); }); else DC.openMaterial(cd, i, { focus: 'zones' }); })(id2); } }, { label: 'Отмена', kind: 'link' }] : [{ label: 'Понятно', kind: 'primary' }] });
        return;
      }
      var nid = DC.matAdd(st.cap, DC.catProduct(p)); st.sQ = ''; st.sRes = null; DC.paint(); var nx = DC.matById(st.cap, nid), cc = st.cap; if (nx && !nx.position && DC.askPos) DC.askPos(cc, nid, function () { DC.openMaterial(cc, nid, { focus: 'zones' }); }); else DC.openMaterial(cc, nid, { focus: 'zones' }); return;
    }
    var info = '<div class="dr-mini"><span class="da-opt__pic"' + (p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><span class="da-opt__b"><b>' + esc(p.name) + '</b><span>' + esc(p.brand || '') + '</span></span><span class="da-opt__pr">' + (DC.price(p) ? F.rub(DC.price(p)) : '—') + '</span></div>';
    if (!caps.length) { DC.sheet({ title: 'Поставить в капсулу', html: info + '<div class="da-ok">Сейчас нет капсул, открытых для правок. У опубликованной капсулы нажмите «Внести изменения» — появится черновик новой версии.</div>', actions: [{ label: 'Понятно', kind: 'primary' }] }); return; }
    var m = DC.sheet({ title: 'Поставить в капсулу', html: info + '<div id="dn-put"></div>', actions: [{ label: 'Поставить', kind: 'primary', close: false, onClick: function (ev, api) {
      var v = function (id) { return api.el.querySelector('#' + id).value; }, code = v('dn-pc'), room = v('dn-pr'), pos = v('dn-pp');
      if (!pos) { ui.toast('Выберите позицию', 'error'); return; }
      DC.LEVELS.forEach(function (l) { if (l[0] === v('dn-pl') || v('dn-pl') === 'both') DC.addRow(code, l[0], { pos: pos, room: room, product: DC.catProduct(p) }); });
      api.close(); DC.paint(); ui.toast('Товар поставлен: ' + DC.capName(code) + ' · ' + room + ' · ' + POS[pos].name);
    } }, { label: 'Отмена', kind: 'link' }] });
    var box = m.el.querySelector('#dn-put'), cur = { code: fromSpec && caps.some(function (c) { return c.code === st.cap; }) ? st.cap : caps[0].code, room: fromSpec ? curRoom(st.cap) : '' };
    function draw() {
      var rooms = DC.capRooms(cur.code).filter(Boolean); if (rooms.indexOf(cur.room) < 0) cur.room = rooms[0];
      var poss = DC.KB.list.filter(function (x) { return !x.hidden && x.rooms.indexOf(cur.room) >= 0; });
      function sel(id, label, opts, val) { return '<div class="field"><label for="' + id + '">' + label + '</label><select class="input" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; }
      box.innerHTML = sel('dn-pc', 'Капсула', caps.map(function (c) { return [c.code, DC.capName(c.code) || c.code]; }), cur.code) + sel('dn-pl', 'Уровень', [['both', 'База и Премиум'], ['база', 'Только База'], ['премиум', 'Только Премиум']], 'both') +
        sel('dn-pr', 'Комната', rooms.map(function (r) { return [r, r]; }), cur.room) + sel('dn-pp', 'Позиция', [['', 'выберите']].concat(poss.map(function (x) { return [x.code, x.name + ' · ' + x.cat]; })), '');
    }
    box.addEventListener('change', function (e) { if (e.target.id === 'dn-pc') { cur.code = e.target.value; DC.LEVELS.forEach(function (l) { DC.loadTable(cur.code, l[0]); }); draw(); } else if (e.target.id === 'dn-pr') { cur.room = e.target.value; draw(); } });
    draw();
  };
  DC.sections.catalog = catView; if (ROLE.chief) DC.sections['my-catalog'] = catView;
  DC.paint();
})();
