/* Кабинет дизайнера, шаг 4: вкладка «Паспорт» капсулы и мастер «＋ Новая капсула» (4 шага, автосохранение).
   Всё хранится в браузере (meta капсулы в хранилище v2). Чтение плана и подпись рендеров в мастере — мок: настоящий разбор будет на сервере. */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var st = DC.st, ROLE = DC.ROLE, esc = DC.esc, ui = DC.ui, ic = DC.ic;
  var ANGLES = ['Общий вид', 'От входа', 'От окна', 'Деталь'];
  /* папки рендеров на Диске («Концепции», подпапки — комнаты) */
  var DRIVE = { 'К1': '1SL3p2N1FUWKcHgTA6mtIAGirzHWVaici', 'К2': '1bH62fjrOlWwffvflitCzkA9YgVItFZno', 'К3': '1GN06qArRg-ZQHaPKsGJtajdwkxd2nTdl', 'К4': '1BSxtDqhUGI0uBpjMQ81vfKnqE2ndXcJQ', 'К5': '1fVvqB6gFiLHOq9LBYpuSHxSp0i8dej4M',
    'К6': '1sBtg8CSPQPebNVjkLo5I8M24TfXZeeM6', 'К7': '1NPXsl_sO_bTNmqZnriUf-MMo9Ertl-y2', 'К8': '1Emn-M0aswXik5fGbH_JrLqXDNVSpm3mf', 'К9': '1nW6AeSmsT-wcbHMKCILJVhdURoSnvQdj' };
  /* рендеры капсул, что уже лежат в прототипе (assets/img/capsules): у К1–К6 подписаны комнатами в имени файла, у К7–К9 — общие */
  var LOCAL_ROOM = { bath: 'Санузел', bed: 'Спальня', hall: 'Прихожая', kitchen: 'Кухня', living: 'Гостиная', main: '' };
  function localRenders(code) {
    var n = Number(String(code).replace(/\D/g, '')), out = [], P = 'assets/img/capsules/k' + n + '-';
    function add(kind, cnt, single) { for (var i = 1; i <= cnt; i++) out.push({ room: LOCAL_ROOM[kind], angle: ANGLES[0], url: P + kind + (single ? '' : '-' + i) + '.jpg' }); }
    if (!(n >= 1 && n <= 9) || !DRIVE[code]) return out;
    /* К9: восемь рендеров разложены по зонам вручную, по самим картинкам (Алина 12.11: «рендеры разложи по зонам сам») */
    if (n === 9) { [['Кухня-гостиная', 'Общий вид'], ['Кухня-гостиная', 'Деталь'], ['Кухня-гостиная', 'От входа'], ['Спальня', 'Общий вид'], ['Спальня', 'Деталь'], ['Прихожая', 'Общий вид'], ['Санузел', 'Общий вид'], ['Гардеробная', 'Общий вид']].forEach(function (x, i) { out.push({ room: x[0], angle: x[1], url: P + 'main-' + (i + 1) + '.jpg' }); }); return out; }
    /* К1–К6: общие рендеры разложены по зонам вручную, по самим картинкам (Алина 12.11: «во всех капсулах рендеры разбери по зонам») */
    var MAIN = {
      1: [['Кухня', 'Общий вид'], ['Кухня', 'Деталь'], ['Гостиная', 'Общий вид'], ['Гостиная', 'Деталь']],
      2: [['Кухня', 'Общий вид'], ['Гостиная', 'Общий вид'], ['Гостиная', 'От окна'], ['Гостиная', 'Деталь']],
      3: [['Гостиная', 'Общий вид'], ['Кухня', 'Общий вид'], ['Гостиная', 'От входа'], ['Гостиная', 'Деталь']],
      4: [['Гостиная', 'От входа'], ['Гостиная', 'Общий вид'], ['Кухня', 'Общий вид'], ['Гостиная', 'От окна']],
      5: [['Кухня', 'От входа'], ['Кухня', 'Общий вид'], ['Кухня', 'От окна'], ['Кухня', 'Деталь']],
      6: [['Гостиная', 'Деталь'], ['Гостиная', 'От входа'], ['Гостиная', 'Общий вид'], ['Кухня', 'Общий вид']]
    };
    if (n <= 6) { MAIN[n].forEach(function (x, i) { out.push({ room: x[0], angle: x[1], url: P + 'main-' + (i + 1) + '.jpg' }); }); add('bed', 2); add('bath', 2); add('hall', 2); if (n === 1) { add('kitchen', 1, true); add('living', 1, true); } } else add('main', 8);
    return out;
  }
  DC.renders = function (code) { return renders(code); }; DC.realRooms = function (code) { return realRooms(code); };
  DC.localCover = function (code) { var r = localRenders(code); return r.length ? r[0].url : ''; };
  function renders(code) { var m = st.meta[code]; return m && m.renders ? m.renders : localRenders(code); }
  function ownRenders(code) { var m = DC.meta(code); if (!m.renders) m.renders = localRenders(code); return m.renders; }
  function realRooms(code) { return DC.capRooms(code).filter(function (r) { return r && r !== 'Общее'; }); }
  function driveUrl(code) { var m = st.meta[code] || {}; return m.drive_folder != null ? m.drive_folder : (DRIVE[code] ? 'https://drive.google.com/drive/folders/' + DRIVE[code] : ''); }
  function live(code) { return st.live[code] || {}; }
  function aboutOf(code) { var m = st.meta[code] || {}; return m.about != null ? m.about : (live(code).about || ''); }
  function descOf(code) { var m = st.meta[code] || {}; return m.description != null ? m.description : (live(code).description || ''); } /* по умолчанию — «концепция» капсулы с сайта */
  function styleOf(code) { var m = st.meta[code] || {}; return m.style != null ? m.style : (live(code).style || ''); }

  DC.passportIssues = function (code) {
    var m = st.meta[code] || {}, out = [], rs = renders(code);
    if (!(m.dna && m.dna.length === 7)) out.push('нет ДНК');
    var miss = realRooms(code).filter(function (room) { return !rs.some(function (r) { return r.room === room; }); });
    if (miss.length) out.push('нет рендера: ' + miss.join(', '));
    if (!(m.plan && m.plan.file)) out.push('нет планировки');
    return out;
  };
  DC.roomsNoRender = function (code) { var rs = renders(code); return realRooms(code).filter(function (room) { return !rs.some(function (r) { return r.room === room; }); }); };

  /* картинка файла → уменьшенный JPEG в data-URL (чтобы помещалось в хранилище браузера) */
  function fileToUrl(file, max) {
    return new Promise(function (ok, no) {
      if (!/^image\//.test(file.type)) return ok('');
      var fr = new FileReader(); fr.onerror = no;
      fr.onload = function () { var img = new Image(); img.onerror = no; img.onload = function () { var k = Math.min(1, (max || 640) / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .8)); }; img.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  /* палитра 7 цветов с картинки (canvas, k-means). Картинки с чужого сервера браузер прочитать не даёт — тогда ошибка */
  function hex(c) { return '#' + c.map(function (v) { var x = Math.round(Math.max(0, Math.min(255, v))).toString(16); return x.length < 2 ? '0' + x : x; }).join('').toUpperCase(); }
  function pixelsOf(src) {
    return new Promise(function (ok, no) {
      var img = new Image(); img.onerror = function () { no(new Error('load')); };
      img.onload = function () { try { var k = Math.min(1, 72 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height); var d = x.getImageData(0, 0, c.width, c.height).data, out = []; for (var i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]); ok(out); } catch (e) { no(new Error('read')); } };
      img.src = src;
    });
  }
  function kmeans(px, k) {
    var sorted = px.slice().sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); }), cen = [], cnt = [];
    for (var i = 0; i < k; i++) cen.push(sorted[Math.floor((i + .5) / k * sorted.length)].slice());
    for (var it = 0; it < 8; it++) {
      var acc = cen.map(function () { return [0, 0, 0]; }); cnt = cen.map(function () { return 0; });
      px.forEach(function (p) { var best = 0, bd = 1e9; cen.forEach(function (c, j) { var d = (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]) + (p[2] - c[2]) * (p[2] - c[2]); if (d < bd) { bd = d; best = j; } }); acc[best][0] += p[0]; acc[best][1] += p[1]; acc[best][2] += p[2]; cnt[best]++; });
      cen = cen.map(function (c, j) { return cnt[j] ? acc[j].map(function (v) { return v / cnt[j]; }) : c; });
    }
    return cen.map(function (c, j) { return { hex: hex(c), n: cnt[j] }; }).sort(function (a, b) { return b.n - a.n; }).map(function (c) { return c.hex; });
  }
  function buildDna(code) {
    var srcs = renders(code).map(function (r) { return r.url; }).filter(function (u) { return /^data:|^assets\//.test(u); }).slice(0, 6);
    if (!srcs.length) return Promise.reject(new Error('нет рендеров, которые можно прочитать: загрузите файлы рендеров'));
    return Promise.all(srcs.map(function (u) { return pixelsOf(u).catch(function () { return []; }); })).then(function (all) {
      var px = []; all.forEach(function (a) { px = px.concat(a); });
      if (px.length < 100) throw new Error('рендеры не прочитались');
      return kmeans(px, 7);
    });
  }
  DC.buildDna = buildDna;
  function assembleDna(code) {
    st.dnaBusy = true; DC.paint();
    buildDna(code).then(function (d) { DC.meta(code).dna = d; DC.saveMeta(); st.dnaBusy = false; DC.paint(); ui.toast('ДНК собрана по рендерам — цвета можно поправить'); })
      .catch(function (e) { st.dnaBusy = false; DC.paint(); ui.toast('ДНК не собралась: ' + e.message, 'error'); });
  }

  /* ── блоки паспорта (общие для вкладки и мастера) ── */
  function nb(code, ref, label) { return DC.noteBlock ? DC.noteBlock(code, 'passport', ref, label) : ''; } /* замечания главного дизайнера к блоку */
  function blockAbout(code, can) {
    var dis = can ? '' : ' disabled';
    return '<section class="dp-card"><h2>О капсуле</h2>' + nb(code, 'about', 'Интерьер · О капсуле') +
      '<div class="field"><label for="dp-name">Название</label><input class="input" id="dp-name" data-pf="name" value="' + esc(DC.capName(code)) + '"' + dis + '></div>' +
      '<div class="field"><label for="dp-style">Стиль</label><input class="input" id="dp-style" data-pf="style" value="' + esc(styleOf(code)) + '" placeholder="Например: неоклассика"' + dis + '></div>' +
      '<div class="field"><label for="dp-desc">Общее описание</label><textarea class="input" id="dp-desc" data-pf="description" rows="4" placeholder="Идея интерьера, настроение, главные материалы"' + dis + '>' + esc(descOf(code)) + '</textarea></div>' +
      '<div class="field"><label for="dp-about">Для кого</label><textarea class="input" id="dp-about" data-pf="about" rows="3"' + dis + '>' + esc(aboutOf(code)) + '</textarea></div></section>';
  }
  function blockDna(code, can) {
    if (DC.dnaBlock) return DC.dnaBlock(code, can); /* ДНК как на sove.app — designer-dna.js */
    var m = st.meta[code] || {}, d = m.dna && m.dna.length === 7 ? m.dna : null;
    var body = d ? '<div class="dp-dna">' + d.map(function (h, i) { return '<label class="dp-sw" style="background:' + esc(h) + '" title="' + esc(h) + '"><input type="color" value="' + esc(h) + '" data-dna="' + i + '"' + (can ? '' : ' disabled') + '><span>' + esc(h) + '</span></label>'; }).join('') + '</div>' +
      (can ? '<p class="da-sub">Нажмите на цвет, чтобы поменять.</p><div class="dr-btns"><button type="button" class="dr-sbtn" data-act="dna">Пересобрать по рендерам</button></div>' : '')
      : '<p class="dp-warn">! нет ДНК</p>' + (can ? '<button type="button" class="btn btn--primary btn--small dp-auto" data-act="dna"' + (st.dnaBusy ? ' disabled' : '') + '>' + (st.dnaBusy ? 'Собираю…' : 'Собрать ДНК по рендерам') + '</button>' : '');
    return '<section class="dp-card"><h2>ДНК<span>7 цветов и 12 материалов</span></h2>' + nb(code, 'dna', 'Интерьер · ДНК') + body + (DC.dnaExtra ? DC.dnaExtra(code, can) : '') + '</section>';
  }
  function renderCard(code, r, i, can, rooms) {
    var isCover = DC.cover(code) === r.url;
    return '<div class="dp-r"><span class="dp-r__pic" style="background-image:' + esc(DC.cssUrl(r.url)) + '">' + (isCover ? '<i>обложка</i>' : '') + '</span>' +
      (can ? '<select class="input" data-rr="' + i + '" aria-label="Комната"><option value="">не разложен</option>' + rooms.map(function (x) { return '<option' + (x === r.room ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<select class="input" data-ra="' + i + '" aria-label="Ракурс">' + ANGLES.map(function (a) { return '<option' + (a === r.angle ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>' +
        '<span class="dp-r__acts">' + (isCover ? '' : '<button type="button" data-act="r-cover" data-i="' + i + '">Обложкой</button>') + '<button type="button" data-act="r-del" data-i="' + i + '" aria-label="Убрать рендер">✕</button></span>'
        : '<span class="dp-r__t">' + esc(r.angle || '') + '</span>') + '</div>';
  }
  function blockRenders(code, can) {
    var rs = renders(code), rooms = realRooms(code), groups = rooms.concat(['']);
    var html = groups.map(function (room) {
      var list = rs.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return (x.r.room || '') === room; });
      if (!room && !list.length) return '';
      return '<div class="dp-rg"><div class="dp-rg__h"><b>' + esc(room || 'Не разложены по комнатам') + '</b>' + (room && !list.length ? '<span class="dp-warn">! нет рендера</span>' : '<span>' + list.length + '</span>') + '</div>' +
        (list.length ? '<div class="dp-rs">' + list.map(function (x) { return renderCard(code, x.r, x.i, can, rooms); }).join('') + '</div>' : '') + '</div>';
    }).join('');
    return '<section class="dp-card"><h2>Рендеры по комнатам<span>' + rs.length + '</span></h2>' + nb(code, 'renders', 'Интерьер · Рендеры') + (rooms.length ? '' : '<p class="da-sub">Комнат пока нет: они появятся из планировки или из состава.</p>') + html +
      (can ? '<div class="dr-btns"><label class="dr-sbtn dp-file">＋ Файлы рендеров<input type="file" accept="image/*" multiple data-up="renders"></label></div>' +
        '<div class="field"><label for="dp-drive">Папка рендеров на Диске</label><input class="input" id="dp-drive" data-pf="drive_folder" value="' + esc(driveUrl(code)) + '" placeholder="https://drive.google.com/…" inputmode="url"></div>'
        : (driveUrl(code) ? '<p class="da-sub">Папка на Диске: <a href="' + esc(driveUrl(code)) + '" target="_blank" rel="noopener">открыть</a></p>' : '')) + '</section>';
  }
  function blockPlan(code, can) {
    var m = st.meta[code] || {}, pl = m.plan || { file: '', rooms: [] }, types = DC.ROOM_NAMES.filter(function (r) { return r !== 'Общее'; });
    var file = pl.file ? (pl.url ? '<span class="dp-plan" style="background-image:' + esc(DC.cssUrl(pl.url)) + '"></span>' : '') + '<p class="da-sub">Файл: <b>' + esc(pl.file) + '</b>' + (pl.mock ? ' · комнаты прочитаны условно (демо-разметка), проверьте' : '') + '</p>' : '<p class="dp-warn">! нет планировки</p>';
    var rows = (pl.rooms || []).map(function (r, i) {
      return '<div class="dp-pr"><select class="input" data-pt="' + i + '" aria-label="Комната"' + (can ? '' : ' disabled') + '>' + types.map(function (t) { return '<option' + (t === r.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
        '<label>м² <input class="input" inputmode="decimal" data-pm="' + i + '" value="' + esc(r.floor_m2 == null ? '' : DC.ruNum(r.floor_m2)) + '"' + (can ? '' : ' disabled') + '></label><label>окон <input class="input" inputmode="numeric" data-pw="' + i + '" value="' + esc(r.windows == null ? '' : r.windows) + '"' + (can ? '' : ' disabled') + '></label>' +
        (can ? '<button type="button" data-act="p-del" data-i="' + i + '" aria-label="Убрать комнату">✕</button>' : '') + '</div>';
    }).join('');
    if (!pl.file) file = '<p class="dp-warn">! нет планировки</p><p class="da-sub">Загрузите планировку объекта или дизайн-проект (PDF) — из него возьмём комнаты и площади для расчёта материалов.</p>';
    return '<section class="dp-card"><h2>Планировка или дизайн-проект</h2>' + nb(code, 'plan', 'Интерьер · Планировка') + file + (rows ? '<div class="dp-prs">' + rows + '</div>' : '') +
      (can ? '<div class="dr-btns"><label class="dr-sbtn dp-file">' + (pl.file ? 'Заменить файл' : '＋ Планировка или дизайн-проект') + '<input type="file" accept="image/*,.pdf" data-up="plan"></label><button type="button" class="dr-sbtn" data-act="p-add">＋ комната</button></div>' : '') + '</section>';
  }
  DC.capTabs.passport = function (code) {
    var can = DC.canEdit(code);
    return '<div class="dp" data-dp="' + esc(code) + '">' + (DC.aiCard ? DC.aiCard(code, can) : '') + blockAbout(code, can) + blockDna(code, can) + blockRenders(code, can) + blockPlan(code, can) + '</div>';
  };

  /* ── правки паспорта ── */
  var root = document.getElementById('da-root');
  function capOf(el) { var h = el.closest('[data-dp]'); return h ? h.getAttribute('data-dp') : st.cap; }
  function numRu(v) { var n = Number(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : null; }
  root.addEventListener('change', function (e) {
    var t = e.target, code = capOf(t); if (!code || !t.closest('[data-dp]')) return;
    if (!DC.canEdit(code)) return;
    var m = DC.meta(code), g = function (a) { return t.getAttribute(a); };
    if (g('data-pf')) { m[g('data-pf')] = t.value.trim(); DC.saveMeta(); if (g('data-pf') === 'name') DC.paint(); return; }
    if (g('data-dna') != null) { m.dna[Number(g('data-dna'))] = t.value.toUpperCase(); DC.saveMeta(); DC.paint(); return; }
    if (g('data-rr') != null) { ownRenders(code)[Number(g('data-rr'))].room = t.value; DC.saveMeta(); DC.paint(); return; }
    if (g('data-ra') != null) { ownRenders(code)[Number(g('data-ra'))].angle = t.value; DC.saveMeta(); return; }
    if (g('data-pt') != null) { m.plan.rooms[Number(g('data-pt'))].type = t.value; DC.saveMeta(); DC.paint(); return; }
    if (g('data-pm') != null) { m.plan.rooms[Number(g('data-pm'))].floor_m2 = numRu(t.value); DC.saveMeta(); return; }
    if (g('data-pw') != null) { m.plan.rooms[Number(g('data-pw'))].windows = numRu(t.value); DC.saveMeta(); return; }
    if (g('data-wz')) { m[g('data-wz')] = t.type === 'checkbox' ? t.checked : t.value; DC.saveMeta(); DC.paint(); return; }
    if (g('data-up')) {
      var files = Array.prototype.slice.call(t.files || []); if (!files.length) return;
      if (g('data-up') === 'renders') {
        Promise.all(files.map(function (f) { return fileToUrl(f, 640); })).then(function (urls) { var rs = ownRenders(code); urls.filter(Boolean).forEach(function (u) { rs.push({ room: '', angle: ANGLES[0], url: u }); }); try { DC.saveMeta(); } catch (er) { /* не влезло в хранилище */ } DC.paint(); ui.toast('Рендеры добавлены — ИИ заполняет ДНК'); if (DC.aiFill) DC.aiFill(code, true); });
      } else if (g('data-up') === 'plan') {
        fileToUrl(files[0], 900).then(function (u) { m.plan = m.plan || { rooms: [] }; m.plan.file = files[0].name; m.plan.url = u; DC.saveMeta(); DC.paint(); readPlan(code, 'Планировка'); });
      } else { m[g('data-up')] = files[0].name; DC.saveMeta(); DC.paint(); if (g('data-up') === 'project_file') readPlan(code, 'Дизайн-проект'); } /* проект и спецификация: в прототипе хранится только имя файла */
    }
  });
  DC.acts.dna = function () { assembleDna(st.cap); };
  DC.acts['r-cover'] = function (b) { DC.meta(st.cap).cover = ownRenders(st.cap)[Number(b.getAttribute('data-i'))].url; DC.saveMeta(); DC.paint(); ui.toast('Обложка выбрана'); };
  DC.acts['r-del'] = function (b) { var rs = ownRenders(st.cap), i = Number(b.getAttribute('data-i')); if (DC.meta(st.cap).cover === rs[i].url) DC.meta(st.cap).cover = ''; rs.splice(i, 1); DC.saveMeta(); DC.paint(); };
  DC.acts['p-add'] = function () { var m = DC.meta(st.cap); m.plan = m.plan || { file: '', rooms: [] }; m.plan.rooms.push({ type: 'Спальня', name: '', floor_m2: null, windows: null }); DC.saveMeta(); DC.paint(); };
  DC.acts['p-del'] = function (b) { DC.meta(st.cap).plan.rooms.splice(Number(b.getAttribute('data-i')), 1); DC.saveMeta(); DC.paint(); };

  /* ── мастер «＋ Новая капсула» ── */
  var STEPS = ['Загрузи', 'ДНК', 'Состав', 'Проверь и отправь'];
  DC.newCapsule = function () {
    var code = 'N' + Date.now().toString(36).toUpperCase(), m = DC.meta(code);
    m.custom = true; m.wizard = 1; m.status = 'draft'; m.version = 1; m.designer = ROLE.who; m.name = 'Новая капсула'; m.renders = []; m.plan = { file: '', rooms: [] }; m.about = ''; m.style = ''; m.drive_folder = ''; m.createdAt = new Date().toISOString();
    DC.saveMeta(); st.caps = (st.caps || []).concat([{ code: code, name: m.name }]);
    DC.LEVELS.forEach(function (l) { DC.loadTable(code, l[0]); });
    st.screen = 'cap'; st.cap = code; st.tab = 'passport'; DC.paint(true); window.scrollTo(0, 0);
  };
  function step1Errors(code) {
    var m = st.meta[code], e = [];
    if (!m.renders.length) e.push('Загрузите рендеры всех зон');
    if (!m.plan.file) e.push('Загрузите планировку объекта');
    if (!m.rights) e.push('Отметьте, что объект ваш и его можно публиковать');
    return e;
  }
  function wizardBody(code) {
    var m = st.meta[code], n = m.wizard, h = '';
    if (n === 1) {
      var up = function (key, label, hint, accept, multi) { var val = key === 'renders' ? (m.renders.length ? DC.plural(m.renders.length, 'файл', 'файла', 'файлов') : '') : key === 'plan' ? m.plan.file : (m[key] || ''); return '<label class="dp-up' + (val ? ' is-done' : '') + '"><b>' + label + '</b><span>' + (val ? esc(val) : hint) + '</span><input type="file" accept="' + accept + '"' + (multi ? ' multiple' : '') + ' data-up="' + key + '"></label>'; };
      h = '<section class="dp-card"><h2>Обязательно</h2>' + up('renders', 'Рендеры всех зон', 'Картинки, можно несколько', 'image/*', true) + up('plan', 'Планировка объекта', 'Картинка или PDF', 'image/*,.pdf') + '</section>' +
        '<section class="dp-card"><h2>По желанию</h2>' + up('project_file', 'Дизайн-проект', 'PDF', '.pdf') + up('spec_file', 'Спецификация', 'PDF или Excel — состав разложится сам', '.pdf,.xls,.xlsx') + '</section>' +
        '<label class="dr-check dp-rights"><input type="checkbox" data-wz="rights"' + (m.rights ? ' checked' : '') + '> Проект мой, имею право публиковать</label><p class="da-sub">Адрес и имя клиента в капсулу не попадают.</p>';
      if (st.wzStage) h += '<div class="dp-stage"><span class="dp-spin"></span>' + esc(st.wzStage) + '</div>';
      else if (m.parsed) h += '<p class="da-sub"><b>Прочитано.</b> Проверьте комнаты и подписи рендеров — их можно поменять.</p>' + blockPlan(code, true) + blockRenders(code, true);
    } else if (n === 2) h = (DC.aiCard ? DC.aiCard(code, true) : '') + blockDna(code, true) + blockAbout(code, true) + '<section class="dp-card"><h2>Обложка</h2>' + (DC.cover(code) ? '<span class="dp-plan" style="background-image:' + esc(DC.cssUrl(DC.cover(code))) + '"></span>' : '<p class="dp-warn">! обложка не выбрана</p>') + '<div class="dp-rs">' + m.renders.map(function (r, i) { return '<button type="button" class="dp-r__pick' + (DC.cover(code) === r.url ? ' is-on' : '') + '" data-act="r-cover" data-i="' + i + '" style="background-image:' + esc(DC.cssUrl(r.url)) + '" aria-label="Сделать обложкой"></button>'; }).join('') + '</div></section>';
    else if (n === 3) h = /* переключателя База/Премиум нет (Алина 13.11): в строке материала обе цены рядом */
      (st.wzStage ? '<div class="dp-stage"><span class="dp-spin"></span>' + esc(st.wzStage) + '</div>' : m.spec_file ? '<p class="da-sub">Строки из спецификации «' + esc(m.spec_file) + '» разложены по комнатам — проверьте. Это демо-разбор: настоящий будет на сервере.</p>' : '<p class="da-sub">Спецификации нет — откройте позицию и нажмите «Подобрать»: покажу 5 товаров каталога.</p>') + DC.viewRooms(code, st.level);
    else { var bl = DC.blockers ? DC.blockers(code) : []; h = (DC.viewCheckV2 ? DC.viewCheckV2(code, st.level) : DC.viewCheck(code, st.level, DC.issues(code, st.level))) + '<div class="dp-send"><button type="button" class="btn btn--primary btn--block" data-act="wz-send"' + (bl.length ? ' disabled' : '') + '>Отправить на проверку</button>' + (bl.length ? '<p class="da-sub">Сначала исправьте обязательное: ' + DC.plural(bl.length, 'замечание', 'замечания', 'замечаний') + '.</p>' : '') + '</div>'; }
    return h;
  }
  DC.acts['wz-del'] = function () { DC.delDraft(st.cap); };
  DC.wizard = function (code) {
    var m = st.meta[code], n = m.wizard;
    var bar = '<ol class="dp-steps">' + STEPS.map(function (t, i) { var k = i + 1; return '<li class="' + (k === n ? 'is-on' : k < n ? 'is-done' : '') + '"><button type="button" data-act="wz-go" data-n="' + k + '"' + (k < n ? '' : ' disabled') + '><i>' + (k < n ? '✓' : k) + '</i><span>' + t + '</span></button></li>'; }).join('') + '</ol>';
    return '<a class="da-back" href="' + esc(DC.listHref()) + '" data-act="list">' + ic('back', 16) + 'Капсулы</a>' +
      '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + esc(m.name || 'Новая капсула') + '</h1><p class="da-sub">Шаг ' + n + ' из 4 · сохраняется само</p></div></div>' + bar +
      '<div class="dp" data-dp="' + esc(code) + '">' + wizardBody(code) + '</div>' +
      (n < 4 ? '<div class="dp-next">' + (n > 1 ? '<button type="button" class="btn btn--ghost" data-act="wz-go" data-n="' + (n - 1) + '">Назад</button>' : '') + '<button type="button" class="btn btn--primary" data-act="wz-next"' + (st.wzStage ? ' disabled' : '') + '>Дальше</button></div>' : '<div class="dp-next"><button type="button" class="btn btn--ghost" data-act="wz-go" data-n="3">Назад</button></div>') +
      '<button type="button" class="dp-del" data-act="wz-del">Удалить черновик</button>';
  };
  /* после загрузки планировки или дизайн-проекта: комнаты с площадью и окнами читаются сами (в прототипе — мок по эталонной квартире), количество материалов пересчитывается */
  function readPlan(code, what) {
    var m = DC.meta(code), E = DC.ETALON; m.plan = m.plan || { file: '', rooms: [] };
    if (m.plan.rooms.some(function (r) { return Number(r.floor_m2) > 0; })) { ui.toast(what + ' загружен' + (what === 'Планировка' ? 'а' : '') + ' — количество пересчитано по комнатам плана'); DC.paint(); return; }
    ui.toast('Читаю ' + (what === 'Планировка' ? 'планировку' : 'дизайн-проект') + '…');
    setTimeout(function () {
      m.plan.rooms = Object.keys(E.rooms).map(function (r) { return { type: r, name: r, floor_m2: Math.round(E.area * E.rooms[r][0] * 10) / 10, windows: E.rooms[r][1] }; }); m.plan.mock = true;
      DC.saveMeta(); DC.paint(); ui.toast('Прочитано комнат: ' + m.plan.rooms.length + ' — количество материалов посчитано. Проверьте площади');
    }, 1200);
  }
  function setStep(code, n) { DC.meta(code).wizard = n; DC.saveMeta(); DC.paint(); window.scrollTo(0, 0); }
  /* мок чтения плана: комнаты эталонной квартиры (доли из примера справочника форматов), рендеры — по кругу */
  function parseMock(code) {
    var m = DC.meta(code), E = DC.ETALON;
    st.wzStage = 'Читаю план…'; DC.paint();
    setTimeout(function () {
      m.plan.rooms = Object.keys(E.rooms).map(function (r) { return { type: r, name: r, floor_m2: Math.round(E.area * E.rooms[r][0] * 10) / 10, windows: E.rooms[r][1] }; }); m.plan.mock = true;
      st.wzStage = 'Подписываю рендеры…'; DC.paint();
      setTimeout(function () { var rooms = m.plan.rooms.map(function (r) { return r.type; }); m.renders.forEach(function (r, i) { if (!r.room) r.room = rooms[i % rooms.length]; }); m.parsed = true; if (!m.cover && m.renders[0]) m.cover = m.renders[0].url; st.wzStage = ''; DC.saveMeta(); DC.paint(); }, 1200);
    }, 1200);
  }
  /* мок спецификации: по одной ключевой позиции на комнату — первый товар каталога по названию позиции */
  var SPEC_POS = { 'Кухня-гостиная': ['sofa', 'dining_table'], 'Гостиная': ['sofa'], 'Кухня': ['dining_table'], 'Спальня': ['bed', 'chandelier'], 'Детская': ['bed'], 'Кабинет': ['chairs'], 'Санузел': ['toilet', 'basin'], 'Прихожая': ['mirror'], 'Гардеробная': ['wardrobe'], 'Постирочная': ['washer'] };
  function specMock(code) {
    var m = DC.meta(code), jobs = [];
    m.plan.rooms.forEach(function (r) { (SPEC_POS[r.type] || []).forEach(function (p) { jobs.push([r.type, p]); }); });
    st.wzStage = 'Раскладываю спецификацию по комнатам…'; DC.paint();
    var chain = Promise.resolve();
    jobs.forEach(function (j) {
      chain = chain.then(function () { return DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(DC.POS[j[1]].name) + '&page_size=1').then(function (d) { var it = (d.items || [])[0]; if (it) DC.LEVELS.forEach(function (l) { DC.addRow(code, l[0], { pos: j[1], room: j[0], product: DC.catProduct(it), origin: 'spec' }); }); }).catch(function () { /* каталог не ответил — позиция останется пустой */ }); });
    });
    chain.then(function () { m.specDone = true; st.wzStage = ''; DC.saveMeta(); DC.paint(); });
  }
  DC.acts['wz-go'] = function (b) { setStep(st.cap, Number(b.getAttribute('data-n'))); };
  DC.acts['wz-next'] = function () {
    var code = st.cap, m = DC.meta(code), n = m.wizard;
    if (n === 1) {
      var e = step1Errors(code); if (e.length) { ui.toast(e[0], 'error'); return; }
      if (!m.parsed) { parseMock(code); return; }
      if (!m.plan.rooms.length) { ui.toast('В планировке нет комнат', 'error'); return; }
      var miss = DC.roomsNoRender(code); if (miss.length) { ui.toast('! нет рендера: ' + miss.join(', '), 'error'); return; }
      setStep(code, 2); if (!(m.dna && m.dna.length === 7)) assembleDna(code);
    } else if (n === 2) {
      if (!(m.dna && m.dna.length === 7)) { ui.toast('Соберите ДНК по рендерам', 'error'); return; }
      if (!String(m.name || '').trim() || m.name === 'Новая капсула') { ui.toast('Дайте капсуле название', 'error'); return; }
      setStep(code, 3); if (m.spec_file && !m.specDone && DC.API) specMock(code);
    } else if (n === 3) setStep(code, 4);
  };
  DC.acts['wz-send'] = function () { var code = st.cap; DC.meta(code).wizard = null; DC.setStatus(code, 'review', 'Капсула отправлена на проверку'); };
})();
