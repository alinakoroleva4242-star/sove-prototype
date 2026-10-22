/* Экран 1 сценария: план квартиры → разметка комнат, дверей и окон → четыре вопроса анкеты.
   Разметку в бою делает POST /ai/plan/markup (один вызов зрения ≈ 0,0002 $); здесь показываем
   готовый результат по плану ЖК PRIDE, чтобы пройти сценарий без оплаты. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW;
  var root = document.getElementById('pd-root'); if (!root) return;
  var SRC = window.SOVE_ARRANGE || { rooms: [], flat: '' };

  var ROOMS = SRC.rooms.filter(function (r) { return !r.part_of; });
  var st = { view: 'idle', fileName: null, live: null, error: null,
             brief: FLOW.load().brief || { bed: '160×200', sofa: 'раскладной, до 220 см', work: 'да', bath: 'душ' } };
  /* live — свой план клиента: файл, размер, ответ разметки и картинка с подписями.
     Разметка на сервере — один вызов зрения ≈ 0,001 $; расстановка бесплатна. */

  var READ_STAGES = ['Читаю стены…', 'Нахожу комнаты и считаю площади…', 'Ищу двери, окна и вход…', 'Проверяю ниши и углы вне квартиры…'];

  function head(sub) {
    return FLOW.stepsBar(1) +
      '<div class="df-head"><h1 class="h2">Ваш план квартиры</h1>' +
      '<p class="small muted">' + esc(sub) + '</p></div>';
  }

  function viewIdle() {
    return head('Шаг 1 из 3 · фото плана из договора или скрин с сайта застройщика') +
      '<label class="pl-drop df-drop"><input type="file" id="pd-file" accept="image/*,application/pdf" hidden>' +
        '<b>Загрузить план</b><span>PNG, JPG, PDF · до 20 МБ</span>' +
        '<span class="pl-drop__hint">перетащите файл или нажмите, чтобы выбрать</span></label>' +
      '<button type="button" class="btn btn--ghost btn--block" data-act="sample">Взять план ЖК PRIDE, 47,3 м²</button>' +
      '<p class="small muted">Разметка плана бесплатна. Платные только картинки интерьера на третьем шаге.</p>';
  }

  function viewReading() {
    return head(st.fileName || 'план ЖК PRIDE') +
      '<div class="pl-read"><div class="pl-read__bar"><i id="pd-bar"></i></div><span id="pd-stage">' + READ_STAGES[0] + '</span></div>' +
      '<img class="df-plan is-dim" src="' + (st.live ? st.live.src : 'assets/img/demo/0-plan-razmetka.jpg') + '" alt="">';
  }

  function viewError() {
    return head(st.fileName || '') +
      '<section class="pb df-err"><span class="pb__k">Не получилось разметить</span><b class="pb__t">' + esc(st.error) + '</b>' +
      '<p class="text">Подойдёт чёткий план из договора или с сайта застройщика: стены тёмные, комнаты подписаны. ' +
      'Фото под углом и скан с тенями читаются хуже.</p>' +
      '<div class="lane"><button type="button" class="btn btn--primary btn--sm" data-act="again">Другой файл</button>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="sample">Взять план PRIDE</button></div></section>';
  }

  function liveRooms() {
    return (st.live.res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; })
      .map(function (r) { return { name: r.label || FLOW.RU[r.type] || r.type || 'Помещение', m2: r.area_m2 || 0, recess: !!r.recess }; });
  }
  function liveNote() {
    var res = st.live.res, ops = res.openings || [];
    var n = function (k) { return ops.filter(function (o) { return o.kind === k; }).length; };
    var parts = [];
    if (liveRooms().some(function (r) { return r.recess; })) parts.push('есть ниша под встроенный шкаф');
    if ((res.outside || []).length) parts.push('угол вне квартиры отмечен');
    parts.push(n('window') + ' окн., ' + (n('door') + n('passage')) + ' двер.' + (n('entrance') ? ', вход' : ''));
    return parts.join(' · ') + '.';
  }
  function viewRooms() {
    var rooms = st.live ? liveRooms() : ROOMS;
    var total = rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0);
    return head('Шаг 1 из 3 · проверьте, что комнаты названы верно') +
      '<img class="df-plan" src="' + (st.live ? st.live.labeled : 'assets/img/demo/0-plan-razmetka.jpg') + '" alt="План с размеченными комнатами, дверями и окнами">' +
      '<section class="pb"><span class="pb__k">Нашли ' + rooms.length + ' помещения · ' + F.area(total) + '</span>' +
        '<ul class="df-rooms">' + rooms.map(function (r, i) {
          return '<li><input class="input input--sm" data-room="' + i + '" value="' + esc(r.name) + '" aria-label="Название помещения">' +
            '<span>' + F.area(r.m2 || 0) + '</span></li>';
        }).join('') + '</ul>' +
        '<p class="small muted">' + (st.live ? esc(liveNote()) :
          'Ниша в прихожей распознана как место под встроенный шкаф. Угол справа внизу — вне квартиры. 2 окна, 3 двери и вход — отмечены.') + '</p>' +
        '<button type="button" class="btn btn--link btn--sm" data-act="again">Другой план</button></section>' +
      '<button type="button" class="btn btn--primary btn--block" data-act="ok">Всё верно, дальше</button>';
  }

  var Q = [
    { k: 'bed', t: 'Кровать', o: ['140×200', '160×200', '180×200'] },
    { k: 'sofa', t: 'Диван', o: ['прямой, до 200 см', 'раскладной, до 220 см', 'угловой'] },
    { k: 'work', t: 'Рабочее место дома', o: ['да', 'нет'] },
    { k: 'bath', t: 'В санузле', o: ['душ', 'ванна'] }
  ];
  function viewBrief() {
    return head('Шаг 1 из 3 · четыре вопроса — и расставим мебель по нормам') +
      Q.map(function (q) {
        return '<section class="pb df-q"><span class="pb__k">' + esc(q.t) + '</span><div class="lane">' + q.o.map(function (o) {
          return '<button type="button" class="chip' + (st.brief[q.k] === o ? ' is-on' : '') + '" data-q="' + q.k + '" data-o="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') + '</div></section>';
      }).join('') +
      '<p class="small muted">Это сокращённая анкета. В полной — 7 разделов: кухня, хранение, стирка, свет, материалы.</p>' +
      '<button type="button" class="btn btn--primary btn--block" data-act="go">Расставить мебель</button>' +
      '<button type="button" class="btn btn--link btn--sm" data-act="back">Назад к плану</button>';
  }

  function viewPlacing() {
    return head(st.fileName || '') +
      '<div class="pl-read"><div class="pl-read__bar"><i style="width:70%"></i></div><span>Расставляю мебель по анкете и нормам проходов…</span></div>';
  }
  function render() {
    root.innerHTML = st.view === 'reading' ? viewReading() : st.view === 'rooms' ? viewRooms()
      : st.view === 'brief' ? viewBrief() : st.view === 'error' ? viewError()
      : st.view === 'placing' ? viewPlacing() : viewIdle();
    bind();
  }

  /* свой план: читаем размер, шлём на разметку, показываем подписанный план */
  function startLive(file) {
    st.fileName = file.name; st.error = null; st.live = { file: file, src: URL.createObjectURL(file) };
    st.view = 'reading'; render();
    var i = 0, tick = setInterval(function () {
      i = Math.min(i + 1, READ_STAGES.length - 1);
      var bar = document.getElementById('pd-bar'), stage = document.getElementById('pd-stage');
      if (bar) bar.style.width = Math.min(90, 25 + i * 20) + '%';
      if (stage) stage.textContent = READ_STAGES[i];
    }, 1500);
    FLOW.imageSize(file).then(function (size) {
      st.live.w = size.w; st.live.h = size.h;
      return FLOW.apiMarkup(file);
    }).then(function (res) {
      clearInterval(tick);
      st.live.res = res;
      st.live.labeled = 'data:image/png;base64,' + res.labeled_png_base64;
      st.view = 'rooms'; render();
    }).catch(function (e) {
      clearInterval(tick);
      st.error = e.status === 429 ? 'Дневной лимит разметок исчерпан — попробуйте завтра или возьмите пример.'
        : e.status === 415 ? 'Нужна картинка: PNG или JPG. PDF пока не принимаем.'
        : (e.message || 'сервер не ответил');
      st.view = 'error'; render();
    });
  }

  /* свой план: рамка из разметки + анкета → расстановка на сервере → экран 2 */
  function goLive() {
    st.view = 'placing'; render();
    var live = st.live;
    var names = {};
    liveRooms().forEach(function (r, i) { var inp = document.querySelector('[data-room="' + i + '"]'); if (inp) names[i] = inp.value; });
    var res = JSON.parse(JSON.stringify(live.res));
    var k = 0;
    (res.rooms || []).forEach(function (r) { if (r.seeded !== false && r.box_2d) { if (st.names && st.names[k]) r.label = st.names[k]; k++; } });
    var frame = FLOW.frameFromMarkup(res, live.w, live.h);
    var brief = FLOW.briefFromAnswers(st.brief);
    FLOW.apiAuto(frame, brief).then(function (out) {
      var total = frame.rooms.filter(function (r) { return !r.part_of; }).reduce(function (a, r) { return a + (r.doc_m2 || 0); }, 0);
      FLOW.save({ brief: st.brief, step: 2, live: {
        layout: out.layout, not_placed: out.not_placed || [], ready: out.ready_for_render,
        flat: 'Ваш план · ' + F.area(total) + ' · ' + frame.rooms.filter(function (r) { return !r.part_of; }).length + ' помещения',
        labeled: live.labeled, name: st.fileName } });
      location.href = 'arrange.html?v=panel&flow=1&live=1';
    }).catch(function (e) {
      st.error = 'Расстановка не удалась: ' + (e.message || 'сервер не ответил'); st.view = 'error'; render();
    });
  }

  function startReading(name) {
    st.fileName = name; st.view = 'reading'; render();
    var i = 0, bar = document.getElementById('pd-bar'), stage = document.getElementById('pd-stage');
    var tick = setInterval(function () {
      i++;
      if (bar) bar.style.width = Math.min(100, i * 25) + '%';
      if (stage && READ_STAGES[i]) stage.textContent = READ_STAGES[i];
      if (i >= READ_STAGES.length) { clearInterval(tick); st.view = 'rooms'; render(); }
    }, 650);
  }

  function bind() {
    var file = document.getElementById('pd-file');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type || '')) { st.fileName = f.name; st.error = 'Нужна картинка: PNG или JPG. PDF пока не принимаем.'; st.view = 'error'; render(); return; }
      startLive(f);
    });
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'sample') { st.live = null; st.error = null; startReading(null); }
        if (a === 'again') { st.view = 'idle'; st.live = null; st.error = null; render(); }
        if (a === 'ok') {
          st.names = {};
          root.querySelectorAll('[data-room]').forEach(function (inp) { st.names[+inp.dataset.room] = inp.value.trim(); });
          st.view = 'brief'; render();
        }
        if (a === 'back') { st.view = 'rooms'; render(); }
        if (a === 'go') {
          if (st.live && st.live.res) { goLive(); return; }
          FLOW.save({ brief: st.brief, plan: FLOW.planFor(st.brief), step: 2, live: null });
          location.href = 'arrange.html?v=panel&plan=' + FLOW.planFor(st.brief) + '&flow=1';
        }
      });
    });
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () { st.brief[b.dataset.q] = b.dataset.o; render(); });
    });
  }
  render();
})();
