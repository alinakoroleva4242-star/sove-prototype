/* «Планировка в интерьере» — перенос сценария /ai/plan (SOVEAPP AI · Plan Render).
   Разбор контура и контрольное превью бесплатны, платный — только рендер интерьера.
   Это макет сценария для веб-приложения: настоящий Plan Render живёт в своём контуре. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var root = document.getElementById('pl-root'); if (!root) return;

  var FORMATS = 'PNG, JPG, WEBP, HEIC, TIFF, PDF · до 20 МБ';
  var caps = D.capsules.filter(function (c) { return !c.soon; });
  var st = {
    view: 'idle',            /* idle → reading → rooms → render */
    fileName: null, src: null,
    rooms: null,
    capsuleId: ui.qs('capsule') || 'k1',
    calls: 0                 /* платные вызовы: разбор плана их не тратит */
  };

  function capsule() { return D.capsule(st.capsuleId) || caps[0]; }
  function totalArea() { return Math.round(st.rooms.reduce(function (a, r) { return a + (Number(r.area) || 0); }, 0) * 10) / 10; }

  function head() {
    return '<div class="stack stack--3"><span class="eyebrow">SOVEAPP AI · Plan Render</span>' +
      '<h1 class="h1">Планировка в интерьере</h1>' +
      '<p class="text">Загрузите план квартиры — разберём контур, покажем комнаты с площадями и наложим выбранную капсулу. Разбор и контрольное превью бесплатны.</p></div>';
  }
  function meter() {
    return '<p class="pl-meter"><b>' + st.calls + '</b> платных вызовов · распознавание и превью не тратят токены</p>';
  }

  function viewIdle() {
    return head() +
      '<label class="pl-drop"><input type="file" id="pl-file" accept="image/*,application/pdf" hidden>' +
        '<b>Загрузить планировку</b><span>' + FORMATS + '</span>' +
        '<span class="pl-drop__hint">перетащите файл сюда или нажмите, чтобы выбрать</span></label>' +
      '<button type="button" class="btn btn--ghost btn--block" data-act="sample">Взять пример планировки</button>' +
      meter();
  }

  function viewReading() {
    return head() +
      '<div class="pl-read"><div class="pl-read__bar"><i id="pl-bar"></i></div>' +
      '<span id="pl-stage">Разбираю контур…</span></div>' +
      '<p class="small muted">' + esc(st.fileName || 'пример планировки') + '</p>';
  }

  function viewRooms() {
    var c = capsule();
    return head() +
      '<section class="pb"><span class="pb__k">Лист планировки</span><b class="pb__t">Нашли ' + st.rooms.length + ' помещения · ' + F.area(totalArea()) + '</b>' +
        '<div class="pl-rooms" id="pl-rooms">' + st.rooms.map(function (r, i) {
          return '<label class="pl-room"><span>' + esc(r.name) + '</span>' +
            '<input class="input input--sm" inputmode="decimal" data-room="' + i + '" value="' + r.area + '"><i>м²</i></label>';
        }).join('') + '</div>' +
        '<p class="small muted">Редактор геометрии: площади можно поправить — итог пересчитается.</p>' +
        '<button type="button" class="btn btn--link" data-act="again">Заменить план</button>' +
      '</section>' +

      '<section class="pb"><span class="pb__k">Капсула и комплектация</span><b class="pb__t">В каком интерьере показать</b>' +
        '<div class="lane co-chips">' + caps.map(function (x) {
          return '<button type="button" class="chip' + (x.id === st.capsuleId ? ' is-on' : '') + '" data-cap="' + x.id + '">' + esc(x.name.split(' ')[0]) + '</button>';
        }).join('') + '</div>' +
        '<p class="small muted">' + esc(c.name) + ' · комплектация по ценам METOD, ' + F.rub(c.pricePerM2) + '/м²</p>' +
      '</section>' +

      '<div class="stack stack--3">' +
        '<button type="button" class="btn btn--primary btn--block" data-act="render">Показать планировку в интерьере · ' + F.tokens(D.costs.render) + '</button>' +
        '<a class="btn btn--ghost btn--block" href="scout.html?area=' + totalArea() + '&capsule=' + st.capsuleId + '">Посчитать бюджет по этому плану</a>' +
      '</div>' + meter();
  }

  function viewRender() {
    var c = capsule();
    var shot = (c.slides && c.slides.length ? c.slides[0].src : D.ai.renderSample.src);
    return head() +
      '<figure class="pl-shot"><img src="' + shot + '" alt="Планировка в интерьере капсулы ' + esc(c.code) + '">' +
      '<figcaption>' + esc(c.name) + ' · ' + F.area(totalArea()) + '</figcaption></figure>' +
      '<div class="pb-list">' + st.rooms.map(function (r) {
        return '<div class="pb-item"><b>' + esc(r.name) + '</b><span>' + F.area(r.area) + ' · ' + F.rub(Math.round(c.pricePerM2 * r.area)) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="stack stack--3">' +
        '<a class="btn btn--primary btn--block" href="scout.html?area=' + totalArea() + '&capsule=' + st.capsuleId + '">Собрать смету в Скауте</a>' +
        '<a class="btn btn--ghost btn--block" href="adept.html?capsule=' + st.capsuleId + '">Адаптировать проект в Адепте</a>' +
        '<button type="button" class="btn btn--link" data-act="again">Другая планировка</button>' +
      '</div>' + meter();
  }

  function paint() {
    root.innerHTML = st.view === 'reading' ? viewReading() : st.view === 'rooms' ? viewRooms() : st.view === 'render' ? viewRender() : viewIdle();
    bind();
    if (st.view === 'reading') run();
  }

  function run() {
    var bar = document.getElementById('pl-bar'), label = document.getElementById('pl-stage');
    var steps = ['Разбираю контур…', 'Ищу стены и проёмы', 'Считаю площади комнат'], t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / 2600);
      if (bar) bar.style.width = (k * 100).toFixed(1) + '%';
      if (label) label.textContent = steps[Math.min(steps.length - 1, Math.floor(k * steps.length))];
      if (k < 1) requestAnimationFrame(frame);
      else {
        st.rooms = D.scout.samplePlan.rooms.map(function (r) { return { name: r.name, area: r.area }; });
        st.view = 'rooms'; paint();
      }
    }
    requestAnimationFrame(frame);
  }

  function bind() {
    var file = document.getElementById('pl-file');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      if (f.size > 20 * 1024 * 1024) { ui.toast('Файл больше 20 МБ'); return; }
      st.fileName = f.name; st.view = 'reading'; paint();
    });
    var drop = root.querySelector('.pl-drop');
    if (drop) {
      ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
      drop.addEventListener('drop', function (e) {
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
        st.fileName = f.name; st.view = 'reading'; paint();
      });
    }
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'sample') { st.fileName = 'пример планировки'; st.view = 'reading'; paint(); }
        if (a === 'again') { st.view = 'idle'; st.rooms = null; st.fileName = null; paint(); }
        if (a === 'render') {
          if (S.auth.isIn() && !S.tokens.canAfford(D.costs.render)) { ui.needTokens(D.costs.render, 'plan.html'); return; }
          st.calls++; st.view = 'render'; paint();
        }
      });
    });
    root.querySelectorAll('[data-cap]').forEach(function (b) {
      b.addEventListener('click', function () { st.capsuleId = b.getAttribute('data-cap'); paint(); });
    });
    root.querySelectorAll('[data-room]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var v = parseFloat(String(inp.value).replace(',', '.'));
        st.rooms[Number(inp.getAttribute('data-room'))].area = isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0;
        paint();
      });
    });
  }
  paint();
})();
