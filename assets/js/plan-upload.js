/* «Основа квартиры» — одно окно загрузки плана для четырёх входов (созвон 28.10): Мой ремонт · Планировка · Интерьер · Бюджет.
   SOVE.planUpload.open({ entry: 'my'|'interior'|'budget'|'plan', level?: карточка, которую подсветить, onDone(res), onClose() })
   Итог везде один — план в объекте SOVE.repair: R.save('plan', { level, img, file, size, rooms, source, ts }).
   Комнаты окно не распознаёт — их даёт Планировка (plan-demo.html?from=<entry>); без комнат показываем шаг «Распознать комнаты».
   Тот же файл второй раз (имя + размер) объект не меняет. «Фото квартиры» — не план: лежат в r.photos, уровень плана не меняют.
   res = { kind: 'plan'|'photo', level, basis: 'plan'|'measure'|'project'|'photo', plan, file, size, files: [File], same }
   Вход 'plan' зарезервирован (то же окно), пока нигде не подключён. */
(function () {
  var S = window.SOVE; if (!S || !S.repair || !S.ui) return;
  var R = S.repair, F = S.fmt, esc = F.esc, ui = S.ui;
  var DEMO = { img: 'assets/img/demo/0-planirovka-po-ankete.jpg', file: 'ЖК PRIDE · пример плана', jk: 'PRIDE' };
  var MAX_PX = 1600, MAX_MB = 20, JPEG_Q = 0.85, PHOTO_PX = 900, PHOTO_MAX = 4;
  var BASIS = { developer_plan: 'plan', measured_plan: 'measure', design_project: 'project', photo: 'photo' };
  var ENTRY_NAME = { my: 'Мой ремонт', interior: 'Интерьер', budget: 'Бюджет', plan: 'Планировка' };
  var CARDS = [
    { id: 'developer_plan', t: 'План застройщика', s: 'бюджет примерно', hint: 'от застройщика, скрин из ДомКлик или фото бумажного', accept: 'image/*,application/pdf' },
    { id: 'measured_plan', t: 'Обмерный план', s: 'бюджет точнее', hint: 'с размерами — посчитаем точно', accept: 'image/*,application/pdf' },
    { id: 'design_project', t: 'Дизайн-проект', s: 'бюджет точный', hint: 'чертёж первым файлом, дальше рендеры', accept: 'image/*,application/pdf', multiple: true },
    { id: 'photo', t: 'Фото квартиры', s: 'если документов нет', hint: 'пустые комнаты — поймём объём, окна и ракурсы', accept: 'image/*', multiple: true }
  ];
  var IC = {
    developer_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M11 16v4M15 12h5"/>',
    measured_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M15 12h5"/><path d="M7 20v-2M10 20v-1M13 20v-2M16 20v-1"/>',
    design_project: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 13l2 2 4-4"/>',
    photo: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-2.5h5L16 7"/><circle cx="12" cy="13.5" r="3.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 20h16"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
  function card(id) { return CARDS.filter(function (c) { return c.id === id; })[0] || null; }
  function pl(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }
  function isImage(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(f.name || ''); }
  function isPdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); }
  function roomsM2(rooms) { return Math.round((rooms || []).reduce(function (a, r) { return a + (Number(r.m2) || 0); }, 0) * 10) / 10; }
  function planLine(p) {
    if (!p) return '';
    var n = (p.rooms || []).length, m2 = roomsM2(p.rooms);
    return [p.file || '', n ? n + ' ' + pl(n, ['комната', 'комнаты', 'комнат']) : 'комнаты не распознаны', m2 ? F.area(m2) : ''].filter(Boolean).join(' · ');
  }

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

  function open(o) {
    o = o || {};
    var entry = ENTRY_NAME[o.entry] ? o.entry : 'my', pick = card(o.level) ? o.level : null;
    var demoHref = 'plan-demo.html?from=' + entry;
    var st = { step: 'pick', error: '', level: null, saved: false, res: null, pendingFiles: null, pendingLevel: null };
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var back = document.createElement('div'); back.className = 'pu-back'; back.setAttribute('data-pu-entry', entry);
    back.innerHTML = '<div class="pu" role="dialog" aria-modal="true" aria-labelledby="pu-t"><i class="pu__grip" aria-hidden="true"></i>' +
      '<div class="pu__h"><span><b class="pu__t" id="pu-t">Основа квартиры</b><small id="pu-sub">Чем точнее основа — тем точнее бюджет</small></span><button type="button" class="pu__x" data-pu-close aria-label="Закрыть">×</button></div>' +
      '<div class="pu__body"></div><input type="file" class="pu__file" hidden></div>';
    var body = back.querySelector('.pu__body'), input = back.querySelector('.pu__file');
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back.classList.add('is-open'); });

    function cur() { return R.get().plan || null; }
    function paint() {
      var p = cur(), html = '';
      if (st.step === 'pick') {
        html = (p ? '<div class="pu-now"><span class="pu-now__pic"' + (p.img ? ' style="background-image:url(\'' + esc(p.img) + '\')"' : '') + '>' + (p.img ? '' : ic('check', 18)) + '</span>' +
            '<span class="pu-now__t"><b>' + ic('check', 14) + ' ' + esc(R.LEVEL[p.level] || 'План') + ' уже в Моём ремонте</b><small>' + esc(planLine(p)) + '</small></span></div>' : '') +
          '<div class="pu-cards" role="group" aria-label="Что загрузить">' + CARDS.map(function (c) {
            var on = p && p.level === c.id;
            return '<button type="button" class="pu-card' + (on ? ' is-on' : '') + (pick === c.id ? ' is-pick' : '') + '" data-pu-level="' + c.id + '">' +
              '<span class="pu-card__ic">' + ic(on ? 'check' : c.id, 20) + '</span><span class="pu-card__t"><b>' + c.t + '<small> · ' + c.s + '</small></b><small>' + (on ? 'загружен · ' + esc(p.file || '') + ' · заменить' : c.hint) + '</small></span><span class="pu-card__a" aria-hidden="true">›</span></button>';
          }).join('') + '</div>' +
          (st.error ? '<p class="pu-err" role="alert">' + st.error + '</p>' : '') +
          '<p class="pu__f">JPG, PNG или PDF до ' + MAX_MB + ' МБ · PDF сохраним по имени, картинку — целиком</p>' +
          '<div class="pu-alt"><a class="pu-link" href="' + demoHref + '">Нет плана — найти ЖК ›</a><button type="button" class="pu-link" data-pu-demo>Пример: ЖК PRIDE</button></div>';
      } else if (st.step === 'busy') {
        html = '<div class="pu-busy" role="status" aria-live="polite"><i></i><span>Сохраняем в Мой ремонт…</span></div>';
      } else if (st.step === 'replace') {
        var f0 = st.pendingFiles[0], n0 = (p.rooms || []).length;
        html = '<div class="pu-ask"><b>Заменить план?</b><p>В Моём ремонте уже есть «' + esc(p.file || 'план') + '» и ' + n0 + ' ' + pl(n0, ['комната', 'комнаты', 'комнат']) + ' с площадями. ' +
          'С новым планом «' + esc(f0.name) + '» комнаты нужно распознать заново в Планировке.</p></div>' +
          '<button type="button" class="pu-btn" data-pu-replace>Заменить план</button><button type="button" class="pu-btn2" data-pu-keep>Оставить прежний</button>';
      } else if (st.step === 'rooms') {
        html = '<div class="pu-now pu-now--ok"><span class="pu-now__pic"' + (p && p.img ? ' style="background-image:url(\'' + esc(p.img) + '\')"' : '') + '>' + (p && p.img ? '' : ic('check', 18)) + '</span>' +
            '<span class="pu-now__t"><b>' + ic('check', 14) + ' План сохранён в Мой ремонт</b><small>' + esc(R.LEVEL[p.level] || '') + ' · ' + esc(p.file || '') + '</small></span></div>' +
          '<div class="pu-ask"><b>Распознать комнаты</b><p>Планировка найдёт комнаты и площади по этому плану — бюджет и материалы посчитаем точно, а не примерно.</p></div>' +
          '<a class="pu-btn" href="' + demoHref + '">Распознать в Планировке ›</a><button type="button" class="pu-btn2" data-pu-skip>Пока без комнат</button>';
      }
      body.innerHTML = html;
      var sub = back.querySelector('#pu-sub'); if (sub) sub.textContent = st.step === 'rooms' ? 'Комнаты и площади — из Планировки' : 'Чем точнее основа — тем точнее бюджет';
      var first = body.querySelector(st.step === 'pick' ? '.pu-card.is-pick, .pu-card' : '.pu-btn, .pu-btn2, button'); if (first && first.focus) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }
    function close() {
      if (!back.parentNode) return;
      back.classList.remove('is-open'); document.removeEventListener('keydown', onKey);
      setTimeout(function () { back.remove(); }, 180);
      document.body.style.overflow = prevOverflow;
      if (st.saved && !st.toasted) { st.toasted = true; ui.toast(st.res && st.res.kind === 'photo' ? 'Фото сохранены в Мой ремонт' : 'План сохранён в Мой ремонт', 'ok'); }
      if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
      if (o.onClose) o.onClose(st.res);
    }
    function finish(res) { st.res = res; close(); if (o.onDone) o.onDone(res); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);

    /* выбор файлов: проверка типа и размера → план или фото */
    function onFiles(level, list) {
      var files = [].slice.call(list || []), c = card(level); if (!files.length || !c) return;
      var bad = files.filter(function (f) { return !(isImage(f) || (level !== 'photo' && isPdf(f))); })[0];
      if (bad) { st.error = 'Файл «' + esc(bad.name) + '» не подошёл: нужен ' + (level === 'photo' ? 'JPG или PNG' : 'JPG, PNG или PDF') + '.'; st.step = 'pick'; return paint(); }
      var big = files.filter(function (f) { return f.size > MAX_MB * 1024 * 1024; })[0];
      if (big) { st.error = 'Файл «' + esc(big.name) + '» весит ' + Math.ceil(big.size / 1024 / 1024) + ' МБ — больше ' + MAX_MB + ' МБ. Сожмите его или сфотографируйте план.'; st.step = 'pick'; return paint(); }
      st.error = '';
      if (level === 'photo') return savePhotos(files);
      planFiles(level, files);
    }
    function planFiles(level, files) {
      var f = files[0], p = cur(), same = !!(p && p.file === f.name && (p.size || 0) === (f.size || 0));
      if (same && p.level === level) return afterSave({ same: true, level: level, files: files });
      if (p && !same && p.rooms && p.rooms.length) { st.pendingFiles = files; st.pendingLevel = level; st.step = 'replace'; return paint(); }
      savePlan(level, f, files);
    }
    function savePlan(level, f, files) {
      st.step = 'busy'; paint();
      var p = cur(), keep = !!(p && p.file === f.name && (p.size || 0) === (f.size || 0));
      function write(src) {
        R.flats.ensure();
        var data = { level: level, img: src || (keep ? p.img : null), file: f.name, size: f.size || 0, rooms: keep && p.rooms ? p.rooms : [], source: entry };
        if (keep) ['jk', 'variant', 'historyId'].forEach(function (k) { if (p[k]) data[k] = p[k]; });
        R.save('plan', data, { force: true, silent: true });
        addDoc(level, f.name, f.size);
        st.saved = true;
        afterSave({ same: false, level: level, files: files });
      }
      if (isImage(f)) shrink(f, MAX_PX, JPEG_Q, function (src) { write(src); }); else write(null);
    }
    function afterSave(x) {
      var p = cur();
      var res = { kind: 'plan', level: x.level, basis: BASIS[x.level], plan: p, file: p ? p.file : null, size: p ? p.size : 0, files: x.files || [], same: !!x.same };
      if (p && !(p.rooms && p.rooms.length)) { st.res = res; st.step = 'rooms'; return paint(); }
      finish(res);
    }
    function savePhotos(files) {
      st.step = 'busy'; paint();
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
    /* пример ЖК PRIDE: demo-план с комнатами из примера расчёта; в Интерьер отдаём его как файл, чтобы шторка сработала как с обычной загрузкой */
    function useDemo() {
      var sp = S.data && S.data.scout && S.data.scout.samplePlan, rooms = sp ? sp.rooms.map(function (r) { return { name: r.name, m2: r.area }; }) : [];
      var fake = { name: DEMO.file, size: 0, src: DEMO.img, type: 'image/jpeg', jk: DEMO.jk };
      var p = cur(), same = !!(p && p.file === fake.name);
      function go(files) {
        if (same && p.level === 'developer_plan') return afterSave({ same: true, level: 'developer_plan', files: files });
        st.step = 'busy'; paint();
        R.flats.ensure();
        R.save('plan', { level: 'developer_plan', img: DEMO.img, file: DEMO.file, size: 0, rooms: rooms, jk: DEMO.jk, variant: 'Пример ЖК PRIDE', source: entry }, { force: true, silent: true });
        st.saved = true; afterSave({ same: false, level: 'developer_plan', files: files });
      }
      if (entry !== 'interior' || typeof fetch !== 'function' || typeof File !== 'function') return go([]);
      st.step = 'busy'; paint();
      fetch(DEMO.img).then(function (r) { return r.blob(); }).then(function (b) { go([new File([b], 'PRIDE-plan.jpg', { type: 'image/jpeg' })]); }).catch(function () { go([]); });
    }

    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.closest('[data-pu-close]')) return close();
      var b = e.target.closest('[data-pu-level]');
      if (b) { st.level = b.getAttribute('data-pu-level'); var c = card(st.level); input.value = ''; input.accept = c.accept; input.multiple = !!c.multiple; input.click(); return; }
      if (e.target.closest('[data-pu-demo]')) return useDemo();
      if (e.target.closest('[data-pu-replace]')) { var fs = st.pendingFiles, lv = st.pendingLevel; st.pendingFiles = null; return savePlan(lv, fs[0], fs); }
      if (e.target.closest('[data-pu-keep]')) { st.pendingFiles = null; st.step = 'pick'; return paint(); }
      if (e.target.closest('[data-pu-skip]')) return finish(st.res);
      if (e.target.closest('a.pu-btn, a.pu-link')) { st.toasted = true; }   /* уходим в Планировку — тост не нужен */
    });
    input.addEventListener('change', function () { var fs = input.files; if (fs && fs.length && st.level) onFiles(st.level, fs); });
    paint();
    return { close: close, el: back, pick: function (level, files) { onFiles(level, files); } };
  }

  S.planUpload = { open: open, CARDS: CARDS, BASIS: BASIS, DEMO: DEMO };
})();
