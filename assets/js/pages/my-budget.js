/* Мой ремонт → Бюджет (my.html?v=budget): структура как в расчёте Скаута (Soveapp_scout_plan_budget_626.xlsx, лист «ИТОГ»):
   Материалы по категориям (цена METOD, выгода) → Работы по этапам + черновой материал → итог. Супер просто; тотал всегда внизу (Алина 22.10).
   Свой бюджет квартиры — SOVE.repair.get().budget; пока его нет — показываем пример из того же файла с меткой «пример». */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, R = S.repair;
  /* пример: расчёт Скаута 22.10.2026 · Москва · 80 м² · 3 комнаты · 2 санузла · Премиум */
  var SAMPLE = {
    meta: 'Москва · 80 м² · 3 комнаты · 2 санузла', type: 'Премиум', date: '22.10.2026', area: 80,
    materials: [ ['Отделка', 1535270, 1337078], ['Освещение', 975505, 954211], ['Выключатели и розетки', 89980, 62986], ['Сантехника и оборудование', 537710, 537710],
                 ['Техника', 418288, 376459], ['Мебель покупная', 1767516, 1729856], ['Мебель заказная', 2533333, 1950667], ['Двери и перегородки', 234000, 213100], ['Текстиль и декор', 667800, 613854] ],
    works: [ ['Демонтаж и подготовка', 87000], ['Черновые работы', 900328], ['Инженерные работы', 550480], ['Предчистовые работы', 284744], ['Чистовые работы', 683698], ['Черновой материал', 1200000] ]
  };
  function model() {
    var b = R && R.get().budget, f = R && R.flats.active();
    if (b && b.total) {
      var mat = b.kitMetod || 0, wk = b.works || Math.max(0, b.total - mat);
      return { sample: false, meta: R.flatLine(f) || (f ? f.name : ''), type: b.type === 'premium' ? 'Премиум' : 'База', date: F.dateLong(b.ts), area: b.area || (f && f.m2),
        materials: [['Материалы', b.kitRetail || mat, mat]], works: [['Работы', wk]], total: b.total };
    }
    var m = Object.assign({ sample: true }, SAMPLE);
    m.total = sum(m.materials, 2) + sum(m.works, 1);
    return m;
  }
  function sum(list, i) { return list.reduce(function (a, r) { return a + r[i]; }, 0); }
  function rub(n) { return F.num(Math.round(n)) + ' ₽'; }

  window.SOVE_MY_BUDGET_SAMPLE = function () { var m = Object.assign({ sample: true }, SAMPLE); m.total = sum(m.materials, 2) + sum(m.works, 1); return m; };
  window.SOVE_MY_BUDGET = function (root) {
    function draw() {
      var m = model(), matM = sum(m.materials, 2), matR = sum(m.materials, 1), wk = sum(m.works, 1), save = matR - matM;
      root.className = 'mb';
      root.innerHTML =
        '<div class="mb-head"><a class="mb-back" href="my.html" aria-label="Назад в Мой ремонт">‹</a><div class="mb-head__b"><b>Бюджет</b><small>' + esc(m.meta) + '</small></div><span class="mb-type">' + m.type + '</span></div>' +
        (m.sample ? '<div class="mb-sample"><span>пример расчёта</span><a href="scout.html">Посчитать свой ›</a></div>' : '') +
        '<section class="mb-sec"><div class="mb-sec__h"><span>МАТЕРИАЛЫ</span><b>' + rub(matM) + '</b></div>' +
          (m.materials.length < 2 ? '' : m.materials.map(function (r) { return '<div class="mb-row"><span>' + esc(r[0]) + '</span><b>' + rub(r[2]) + '</b></div>'; }).join('')) +
          (save > 0 ? '<div class="mb-save">выгода с METOD · <b>' + rub(save) + '</b></div>' : '') + '</section>' +
        '<section class="mb-sec"><div class="mb-sec__h"><span>РАБОТЫ</span><b>' + rub(wk) + '</b></div>' +
          (m.works.length < 2 ? '' : m.works.map(function (r) { return '<div class="mb-row"><span>' + esc(r[0]) + '</span><b>' + rub(r[1]) + '</b></div>'; }).join('')) + '</section>' +
        '<a class="mb-scout" href="scout.html">Уточнить в Скауте ›</a>' +
        '<p class="mb-note">Цены ориентировочные · Москва и МО' + (m.date ? ' · расчёт ' + esc(m.date) : '') + '</p>' +
        '<div class="mb-total"><div><small>ИТОГО БЮДЖЕТ</small><b>' + rub(m.total) + '</b></div>' + (m.area ? '<span>' + rub(m.total / m.area) + ' / м²</span>' : '') + '</div>';
    }
    draw();
    window.addEventListener('sove:repair', function () { if (document.body.contains(root)) draw(); });
  };
})();
