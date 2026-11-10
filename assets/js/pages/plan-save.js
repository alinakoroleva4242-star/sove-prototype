/* A6 «Моя планировка» (ТЗ-planirovka, п. A6 и 4.6, эталоны A6 и B5): что сохранится в Мой ремонт —
   основа, интерьер, перепланировка, 3D с расстановкой, готовность — и полный бюджет «ремонт под ключ»
   из 11 строк (budget.js). «Сохранить» пишет в Мой ремонт и в историю планировок (раздел 8):
   запись остаётся навсегда, новая становится основной. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, D = S.data, FLOW = window.SOVE_FLOW, R = S.repair, B = window.SOVE_BUDGET, P3 = window.SOVE_PLAN3D;
  var root = document.getElementById('ps-root'); if (!root) return;
  var FL = FLOW.load(), T = FL.toSave;
  if (!T) { root.innerHTML = FLOW.blockHead('flow', 'plan') + '<section class="pz-card"><b>Планировки ещё нет</b><a class="pz-btn" href="plan-demo.html">Загрузить план</a></section>'; return; }

  var SOURCE = { developer: 'план застройщика', measure: 'обмерный план', none: 'типовой план', project: 'дизайн-проект' };
  var LEVEL = { developer: 'developer_plan', measure: 'measured_plan', none: 'none', project: 'design_project' };
  var STATE = { concrete_free: 'бетон, стен нет', concrete_walls: 'бетон, стены стоят', whitebox: 'предчистовая', finished: 'с отделкой' };
  var src = FL.source || 'developer', state = FL.state || 'concrete_walls', INT = FL.interior || null, V = T.variant;
  var rooms = FL.rooms && FL.rooms.length ? FL.rooms : (window.SOVE_ARRANGE.rooms || []).filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
  var flatName = FL.flat || 'ЖК PRIDE · 47,0 м²';
  var geo = T.geo || window.SOVE_ARRANGE;
  var budget;
  /* бюджет пересчитывается при выборе интерьера из ленты (раздел 14): мебель — по товарам интерьера, строки — «по интерьеру» */
  /* бюджет — тем же калькулятором, что расчёт и итог блока (demo-flow): ставка состояния и цена капсулы за м² (SOVE.scout.estimate).
     Без него считалось по нормам budget-norms.js, а там пусто — строки «[сумма] ₽» и нет итога (Валерия 02.11: «бери из калькулятора») */
  /* состояние квартиры → состояние расчёта; своё имя: STATE выше — подписи для строки «Основа» (второе var STATE их затирало — «concrete») */
  var SCOUT_STATE = { concrete_free: 'concrete', concrete_walls: 'concrete', whitebox: 'pre', finished: 'secondary' };
  function levelNow() { return FLOW.levelNow ? FLOW.levelNow() : 'base'; }
  function scoutParams() {
    var R = window.SOVE && window.SOVE.repair, own = R && R.flats && R.flats.active() && R.get().scoutParams;
    var p = own ? Object.assign({}, own, { level: levelNow() }) : { stateId: SCOUT_STATE[state] || 'concrete', capsuleId: INT && INT.type === 'capsule' ? INT.id : null, level: levelNow(),
      area: Math.round(rooms.reduce(function (a, r) { return a + (r.m2 || 0); }, 0) * 10) / 10 };
    /* по планировке (Алина 02.11): объёмы плана из расстановки — работы по позициям Scout, площадь и комнаты плана */
    if (T.volumes && T.volumes.area) { p.volumes = T.volumes; p.area = Math.round(T.volumes.area * 10) / 10; }
    return p;
  }
  function compute() {
    var furniture = INT ? FLOW.furnitureSum(T.goods, INT) : T.furniture;
    /* тип ремонта — один на объект (тот же, что в карточке бюджета и окне выбора капсулы): одна цифра «итого» */
    budget = B.compute({ scout: scoutParams(), geo: geo, rooms: rooms, state: state, type: levelNow(), interior: INT, kitchenLen: T.kitchenLen, furniture: furniture,
      partitions: V ? V.partitions : null, accuracy: FL.accuracy || 'примерно' });
  }
  compute();
  var saved = false;

  function rub(v) { return v === null ? '[сумма] ₽' : F.rub(v); }
  function row(ok, t, sub, right, cls) {
    return '<div class="ps-row"><i class="ps-row__ic' + (ok ? '' : ' is-warn') + '">' + (ok ? '✓' : '!') + '</i><span><b>' + t + '</b><small>' + sub + '</small></span><em class="' + (cls || '') + '">' + right + '</em></div>';
  }
  function rows() {
    var out = [];
    out.push(row(true, 'Основа: ' + esc(SOURCE[src] || SOURCE.developer), esc(flatName + ' · ' + (STATE[state] || '')), esc(FL.accuracy || 'примерно')));
    if (INT) out.push(row(true, 'Интерьер: ' + esc(INT.name), 'мебель и материалы интерьера', 'в Интерьер'));
    if (V) out.push(row(true, 'Перепланировка: вариант ' + esc(V.letter), esc(V.name.toLowerCase() + ', ' + V.text.split(',').pop().trim()),
      V.approval === 'required' ? 'нужно согласование' : 'без согласования', V.approval === 'required' ? 'is-warn' : ''));
    out.push(row(true, '3D + расстановка', esc('«' + T.arrangement + '» · ' + T.count + ' предметов' + (V ? ' на новом плане' : '')), 'на плане'));
    out.push(row(true, 'Готовность ремонта', INT ? 'шаги «Основа» и «Интерьер»' : 'шаг «Основа»', INT ? '+50%' : '+25%', 'is-green'));
    if (V) out.push(row(false, 'Чертежи для стройки', 'перегородки, электрика, сантехника', 'Дизайн-проект'));
    /* кнопка сохранения — в той же карточке, что и список «что сохранится» */
    var btn = saved ? '<a class="pz-btn2 ps-save" href="my.html">✓ Сохранено в Мой ремонт · Открыть ›</a>'
      : '<button type="button" class="pz-btn ps-save" data-pf="save">Сохранить в Мой ремонт</button>';
    return '<section class="pz-card ps-rows">' + out.join('') + btn + '</section>';
  }
  function render() {
    FLOW.refreshBudget();
    FLOW.interiorStrip({ chosen: !!INT, onPick: function (it) { INT = it; compute(); render(); } });
    root.innerHTML = FLOW.blockHead('flow', 'furniture', true) +
      '<div class="pz-title"><h2>Моя планировка</h2><span>' + esc((V ? 'вариант ' + V.letter : flatName) + ' · вот что сохранится в Мой ремонт') + '</span></div>' +
      /* интерьер не выбран — белый домик в 3D (как на экране мебели), а не серое фото */
      (!INT && P3 && P3.ok ? '<div class="ps-img" id="ps-3d"></div>' : T.img ? '<div class="ps-img' + (INT ? '' : ' is-gray') + '"><img src="' + esc(T.img) + '" alt="Моя планировка в 3D"></div>' : '') +
      rows() +
      /* мебель на всю квартиру со списком (галочки, раздел 16) */
      FLOW.productList((T.goods || []).map(function (g) { return { p: D.product(g.id), label: g.label, room: g.room }; }), { key: 'a6-goods', title: 'Товары мебели', limit: 4, rerender: render }) +
      FLOW.planFinish({ noSave: true, getImg: function () { return T.img; }, after: function () { saved = true; render(); } }) +
      '<small class="pz-note pz-c">файл в оформлении SOVEAPP</small>' +
      /* бюджет — под визуализациями и только с интерьером (Алина 24.10) */
      FLOW.budgetCard({ rerender: function () { compute(); render(); } }) +
      (V ? '<a class="pz-replan" href="adept.html"><b>Дизайнер</b> доведёт вариант ' + esc(V.letter) + ' до чертежей для бригады · промокод 5 000 ₽ · <u>Подробнее ›</u></a>' +
        (T.others && T.others.length ? '<small class="pz-note pz-c">варианты ' + esc(T.others.join(' и ')) + ' останутся в Генерациях · Ваши планировки</small>' : '') : '');
    var slot = document.getElementById('ps-3d');
    if (slot) {
      var opts = { geo: geo3d(), items: T.items || [], style: 'sizes', height: 300 };
      if (!view3d) view3d = P3.create(slot, opts); else { view3d.mount(slot); view3d.update(opts); }   /* один вид — один WebGL-контекст */
    }
    bind();
  }
  /* 3D «Моей планировки»: свой план — его окна, двери и стены с картинки (walls_2d / doors_2d / windows_2d), как на экране
     мебели; запись без них (старая) и пример ЖК PRIDE — окна и двери примера, как раньше */
  var view3d = null, GEO3D = null;
  function geo3d() {
    if (GEO3D) return GEO3D;
    var A = window.SOVE_ARRANGE, g = T.geo || A;
    GEO3D = { px_per_m: g.px_per_m, rooms: g.rooms, windows: (T.geo && T.geo.windows) || A.windows || [], doors: (T.geo && T.geo.doors) || A.doors || [],
      outside: (T.geo && T.geo.outside) || A.outside || [], partitions: V ? V.partitions : [] };
    if (T.geo && T.geo.walls_2d && T.geo.walls_2d.length) { GEO3D.walls_2d = T.geo.walls_2d; GEO3D.doors_2d = T.geo.doors_2d || []; GEO3D.windows_2d = T.geo.windows_2d || []; }
    return GEO3D;
  }

  function bind() {}
  /* пришли с экрана мебели после «Сохранить в Мой ремонт» — показываем итог и тост (15.1) */
  if (FL.justSaved) { saved = true; FLOW.save({ justSaved: false }); }
  render();
  if (saved) setTimeout(function () {
    var box = document.querySelector('.toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toasts' }));
    var t = document.createElement('div'); t.className = 'toast toast--ok rp-toast pz-toast2';
    t.innerHTML = '<span>✓ Сохранено в Мой ремонт</span><a href="my.html">Открыть</a><button type="button" data-pf="visual">Дальше: визуализации ›</button>';
    box.appendChild(t); setTimeout(function () { t.remove(); }, 6500);
  }, 50);
})();
