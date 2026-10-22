/* Мой ремонт — главный вид my.html по ТЗ design/moy-remont/TZ-moy-remont.md, шаг 1 (п. 8):
   шапка + дашборд по эталонам B–E (вид — assets/js/my-etalons.js, собирается из design/moy-remont/etalon-*.html),
   переключатель вариантов сверху, по умолчанию D (⚠️ — в CFG). Данные эталона пока показные; живые цифры — шаг 2 (repairProgress). */
(function () {
  var S = window.SOVE, ui = S.ui, esc = S.fmt.esc, R = S.repair, ET = window.SOVE_MY_ETALONS;
  if (!ET) return;
  var CFG = window.SOVE_MY_CONFIG = Object.assign({
    variant: 'D',                       /* ⚠️ вариант дашборда выбирает Алина; по умолчанию D — проявка во весь экран */
    links: {                            /* куда ведут кнопки эталона, пока нет своих экранов */
      generate: 'result.html?gen=g4',   /* «✦ Сгенерировать · 10», метки комнат ✦ */
      moodboard: 'sove-ai.html',        /* ⚠️ «✦ Сгенерировать мудборд» — отдельного экрана мудборда пока нет, ведём в SOVE AI */
      capsules: 'capsules.html', scout: 'scout.html', object: 'my.html?v=object', upload: 'my.html?v=object'
    }
  }, window.SOVE_MY_CONFIG || {});
  var NAMES = { B: 'B · Комнаты', C: 'C · Дашборд', D: 'D · Проявка', E: 'E · Шторка' };
  var KEY = 'sove.my.dashVariant';
  function variant() { try { var v = localStorage.getItem(KEY); if (ET[v]) return v; } catch (e) {} return CFG.variant; }
  function setVariant(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function picker(v) {
    return '<div class="myv-pick" role="tablist" aria-label="Варианты дизайна"><span class="myv-pick__cap">варианты дизайна</span><div class="myv-pick__grid">' +
      Object.keys(NAMES).map(function (k) { return '<button type="button" role="tab" data-myv="' + k + '" aria-selected="' + (k === v) + '"' + (k === v ? ' class="is-on"' : '') + '>' + NAMES[k] + '</button>'; }).join('') + '</div></div>';
  }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function go(href) { return function (e) { e.preventDefault(); location.href = href; }; }

  /* кнопки и ссылки эталона → экраны прототипа (по подписи, как в sove-ai.js) */
  function wire(root) {
    var L = CFG.links;
    root.querySelectorAll('.myv-page button, .myv-page a').forEach(function (el) {
      var t = txt(el), h = null;
      if (el.closest('[data-my="pros"]')) return;                       /* дизайнер / стройка — свои ссылки */
      if (/^＋ Создать/.test(t)) { el.addEventListener('click', function (e) { e.preventDefault(); if (window.SOVE_AI_CREATE) SOVE_AI_CREATE.open(); }); return; }
      if (/^Моя квартира/.test(t) && el.tagName !== 'A') return;
      if (t === 'изменить') h = L.object;
      else if (/Сгенерировать мудборд/.test(t)) h = L.moodboard;
      else if (/Сгенерировать/.test(t)) h = L.generate;
      else if (/^Все капсулы/.test(t)) h = L.capsules;
      else if (/^История генераций/.test(t)) { histLink(el); return; }
      else if (/Посчитать|Уточнить в Скауте|Бюджет/.test(t) && el.tagName === 'A') h = L.scout;
      else if (/Загрузить/.test(t)) h = L.upload;
      if (h) { if (el.tagName === 'A') el.setAttribute('href', h); el.addEventListener('click', go(h)); }
    });
    /* метки комнат на проявке: ✦ — сгенерировать эту комнату */
    root.querySelectorAll('.myv-page span').forEach(function (s) { if (/^✦ /.test(txt(s)) && !s.children.length) { s.style.cursor = 'pointer'; s.setAttribute('role', 'button'); s.addEventListener('click', go(L.generate)); } });
    /* «Моя квартира ▾» — переключатель квартир + «+ Добавить квартиру» */
    root.querySelectorAll('.myv-page div, .myv-page b').forEach(function (d) { if (!d.children.length && /^Моя квартира ▾$/.test(txt(d))) { d.style.cursor = 'pointer'; d.setAttribute('role', 'button'); d.setAttribute('tabindex', '0'); d.addEventListener('click', flats); } });
  }
  /* ---------- история генераций живёт здесь, в «Моём ремонте» (Алина 22.10): список по блокам, у каждой «Сохранить» ---------- */
  var BLOCK = { render: 'Комнаты', photo: 'Комнаты', scout: 'Бюджет' };
  function histItems() {
    var g = S.gens.list().filter(function (x) { return x.status === 'done'; }).map(function (x) {
      var t = x.title || (x.kind === 'photo' ? 'Поиск по фото' : 'Поиск по рендеру');
      if (/^План/.test(t)) return { id: x.id, block: 'Основа', t: t, ts: x.ts, src: x.src, kind: 'plan', data: { level: 'developer_plan', img: x.src, rooms: [] } };
      return { id: x.id, block: BLOCK[x.kind] || 'Комнаты', t: t, ts: x.ts, src: x.src, kind: 'render', data: { room: x.room || t || 'Комната', src: x.src } };
    });
    var sc = S.scout.requests().filter(function (r) { return r.result && r.result.total; }).map(function (r) {
      var p = r.params || {}, c = S.data.capsule(p.capsuleId);
      return { id: r.id, block: 'Бюджет', t: 'Расчёт Скаута' + (c ? ' · ' + c.name : ''), ts: r.ts, src: c && c.cover, sum: r.result.total, kind: 'budget',
        data: { type: p.level === 'premium' ? 'premium' : 'base', area: r.result.area || p.area, works: r.result.works, kitMetod: r.result.kitMetod, kitRetail: r.result.kitRetail, total: r.result.total } };
    });
    return g.concat(sc).sort(function (a, b) { return b.ts - a.ts; });
  }
  function histLink(el) {
    var n = histItems().length, sp = el.querySelector('span');
    if (sp) sp.textContent = 'История генераций · ' + n;
    el.setAttribute('href', '#history');
    el.addEventListener('click', function (e) { e.preventDefault(); openHistory(); });
  }
  function openHistory() {
    var list = histItems(), F = S.fmt, saved = {}; try { saved = JSON.parse(localStorage.getItem('sove.my.histSaved') || '{}'); } catch (e) {}
    var html = list.length ? '<div class="myh">' + ['Основа', 'Интерьер', 'Комнаты', 'Бюджет'].map(function (b) {
        var rows = list.filter(function (x) { return x.block === b; }); if (!rows.length) return '';
        return '<div class="myh__g"><span class="myh__c">' + b.toUpperCase() + ' · ' + rows.length + '</span>' + rows.map(function (x) {
          return '<div class="myh__it"><span class="myh__pic"' + (x.src ? ' style="background-image:url(' + esc(x.src) + ')"' : '') + '></span><span class="myh__b"><b>' + esc(x.t) + '</b><small>' + F.dateLong(x.ts) + (x.sum ? ' · ' + F.rub(x.sum) : '') + '</small></span>' +
            (saved[x.id] ? '<span class="myh__ok">✓ в ремонте</span>' : '<button type="button" class="myh__save" data-h="' + x.id + '">Сохранить</button>') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>'
      : '<p class="small muted">Пока пусто. Всё, что сгенерируешь — здесь или в SOVE AI, — появится в этом списке по блокам: Основа, Интерьер, Комнаты, Бюджет.</p>';
    var m = ui.modal({ title: 'История генераций', html: html, actions: [{ label: 'Закрыть', kind: 'link' }] });
    m.el.querySelectorAll('[data-h]').forEach(function (b) { b.addEventListener('click', function () {
      var x = list.filter(function (i) { return i.id === b.getAttribute('data-h'); })[0]; if (!x || !R) return;
      R.save(x.kind, x.data, { done: function () { saved[x.id] = Date.now(); try { localStorage.setItem('sove.my.histSaved', JSON.stringify(saved)); } catch (e) {} b.outerHTML = '<span class="myh__ok">✓ в ремонте</span>'; } });
    }); });
  }

  /* ---------- шапка: «загрузи план» — от основы заполняется всё остальное (Алина 22.10). Окно — аккуратная шторка, текста минимум ---------- */
  var KINDS = [ { id: 'developer_plan', t: 'План застройщика', s: 'примерно' }, { id: 'measured_plan', t: 'Обмерный план', s: 'точнее' }, { id: 'design_project', t: 'Дизайн-проект', s: 'точно' } ];
  var UP_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>';
  var DOC_IC = { developer_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M11 16v4M15 12h5"/>',
                 measured_plan: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h7V4M15 12h5"/><path d="M7 20v-2M10 20v-1M13 20v-2M16 20v-1"/>',
                 design_project: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 13l2 2 4-4"/>' };
  function uploadBar(page) {
    var head = page.firstElementChild && page.firstElementChild.firstElementChild; if (!head) return;
    var lvl = R ? R.level() : 'none', bar = document.createElement('div');
    bar.className = 'myup-bar';
    bar.innerHTML = lvl === 'none'
      ? '<button type="button" class="myup-cta" data-up>' + UP_IC + '<span><b>Загрузи план квартиры</b><small>застройщика, обмерный или дизайн-проект — остальное заполним сами</small></span></button>'
      : '<button type="button" class="myup-done" data-up><i>✓</i>' + esc(R.LEVEL[lvl]) + '<span>сменить</span></button>';
    head.style.borderBottom = '0';
    head.insertAdjacentElement('afterend', bar);
    bar.querySelector('[data-up]').addEventListener('click', function () { openUpload(); });
  }
  /* ---------- Основа квартиры: 3 плитки и шкала точности — по тому, что загружено (ТЗ п. 4.1; вид — плитки эталона) ---------- */
  var RANK = { none: 0, developer_plan: 1, measured_plan: 2, design_project: 3 };
  var ACC = [ ['—', 'загрузи план — посчитаем бюджет'], ['примерно', 'загрузи обмерный план или дизайн-проект — посчитаем точнее'], ['точнее', 'загрузи дизайн-проект — посчитаем точно'], ['точно', 'бюджет считаем по твоему проекту'] ];
  function baseBlock(page) {
    var title = [].filter.call(page.querySelectorAll('b'), function (b) { return txt(b) === 'Основа квартиры'; })[0]; if (!title) return;
    var box = title.closest('div[style*="border-radius: 16px"]') || title.parentNode.parentNode;
    var plan = R && R.get().plan, lvl = plan ? plan.level : 'none', n = RANK[lvl] || 0;
    box.querySelectorAll('b').forEach(function (b) {
      var k = KINDS.filter(function (x) { return x.t === txt(b); })[0]; if (!k) return;
      var tile = b.parentNode, on = k.id === lvl;
      var pic = on ? (plan.img ? '<span style="height: 64px; border-radius: 8px; background: url(' + esc(plan.img) + ') center / cover"></span>'
          : '<span style="height: 64px; border-radius: 8px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #2E6B4E"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + DOC_IC[k.id] + '</svg><small style="font-size: 8px; color: #6B655F; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">' + esc(plan.file || '') + '</small></span>')
        : '<span style="height: 64px; border-radius: 8px; border: 1.5px dashed #CFC6BC; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #A24E32">⇪</span>';
      tile.style.background = on ? '#E2EEE6' : '#F4F2EE';
      tile.style.cursor = 'pointer';
      tile.innerHTML = pic + '<b style="font-size: 11px; line-height: 1.15">' + k.t + '</b><small style="font-size: 9px; color: #6B655F; line-height: 1.2">бюджет ' + (k.id === 'design_project' ? 'точный' : k.s) + '</small>' +
        (on ? '<small style="font-size: 10px; font-weight: 800; color: #2E6B4E">✓ загружен</small>' : '<small style="font-size: 10px; font-weight: 800; color: #A24E32">Загрузить ›</small>');
      tile.onclick = function () { openUpload(k.id); };
    });
    var segs = box.querySelectorAll('div[style*="repeat(3"] > span');
    if (segs.length === 3) segs.forEach(function (sp, i) { sp.style.background = i < n ? '#2E6B4E' : '#E6E1DA'; });
    var cap = [].filter.call(box.querySelectorAll('small'), function (x) { return /^точность бюджета/.test(txt(x)); })[0];
    if (cap) cap.innerHTML = 'точность бюджета: <b style="color: #1E1C1A">' + ACC[n][0] + '</b> · ' + ACC[n][1] +
      (lvl === 'design_project' ? '<br><span style="color: #2E6B4E; font-weight: 700">файлы проекта разложим по блокам сами</span>' : '');
  }

  function openUpload(preset) {
    var cur = R ? R.level() : 'none';
    var el = document.createElement('div'); el.className = 'myup';
    el.innerHTML = '<div class="myup__back" data-x></div><div class="myup__sheet" role="dialog" aria-modal="true" aria-labelledby="myup-t"><span class="myup__grip"></span>' +
      '<div class="myup__h"><b id="myup-t">Что у тебя есть?</b><button type="button" class="myup__x" data-x aria-label="Закрыть">×</button></div>' +
      '<div class="myup__grid">' + KINDS.map(function (k) {
        return '<button type="button" class="myup__k' + (k.id === cur ? ' is-on' : '') + '" data-k="' + k.id + '"><span class="myup__ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + DOC_IC[k.id] + '</svg></span><b>' + k.t + '</b><small>' + (k.id === cur ? '✓ загружен' : 'бюджет ' + k.s) + '</small></button>';
      }).join('') + '</div>' +
      '<small class="myup__f">PNG, JPG или PDF</small><input type="file" accept="image/png,image/jpeg,application/pdf" hidden></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    var kind = null, input = el.querySelector('input');
    if (preset) setTimeout(function () { var b = el.querySelector('[data-k="' + preset + '"]'); if (b) b.classList.add('is-pick'); }, 0);
    function close() { el.classList.remove('is-open'); setTimeout(function () { el.remove(); }, 200); document.removeEventListener('keydown', esc_); }
    function esc_(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc_);
    el.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    el.querySelectorAll('[data-k]').forEach(function (b) { b.addEventListener('click', function () { kind = b.getAttribute('data-k'); input.value = ''; input.click(); }); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0]; if (!f || !kind || !R) return;
      function done(img) { close(); R.save('plan', { level: kind, img: img || null, file: f.name, rooms: [] }, { done: function () { ui.toast('Основа обновлена · бюджет точнее', 'ok'); } }); }
      if (/^image\//.test(f.type) && f.size < 3e6) { var rd = new FileReader(); rd.onload = function () { done(rd.result); }; rd.readAsDataURL(f); } else done(null);
    });
  }

  function flats() {
    var list = R ? R.flats.list() : [], act = R && R.flats.active();
    var m = ui.modal({ title: 'Мои квартиры', html: '<div class="rp-pick">' + (list.length ? list.map(function (f) {
        return '<button type="button" class="rp-pick__b" data-flat="' + f.id + '"><b>' + esc(f.name) + (act && act.id === f.id ? ' ✓' : '') + '</b><span>' + esc(R.flatLine(f) || 'данных пока нет') + '</span></button>';
      }).join('') : '<p class="small muted">Квартира появится сама при первом сохранении.</p>') + '</div>',
      actions: [{ label: '+ Добавить квартиру', kind: 'primary', onClick: function () { if (R) { var f = R.flats.add(); R.flats.setActive(f.id); } } }, { label: 'Закрыть', kind: 'link' }] });
    m.el.querySelectorAll('[data-flat]').forEach(function (b) { b.addEventListener('click', function () { R.flats.setActive(b.getAttribute('data-flat')); m.close(); }); });
  }

  function render(root) {
    var v = variant();
    root.className = 'myv';
    root.innerHTML = picker(v) + '<div class="myv-page">' + ET[v] + '</div>';
    root.querySelectorAll('[data-myv]').forEach(function (b) { b.addEventListener('click', function () { setVariant(b.getAttribute('data-myv')); render(root); window.scrollTo(0, 0); }); });
    wire(root);
    uploadBar(root.querySelector('.myv-page'));
    baseBlock(root.querySelector('.myv-page'));
  }
  window.SOVE_MY_HOME = function (root) { render(root); window.addEventListener('sove:repair', function () { if (document.body.contains(root)) render(root); }); };
})();
