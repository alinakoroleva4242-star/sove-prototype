/* SOVEAPP AI — витрина раздела (/ai на сайте) в формате приложения:
   «Твой карманный дизайнер», кадр до/после, три цифры, шесть модулей со статусами,
   загрузка своего снимка и «Как это работает». Сам поиск живёт в ai.html (= /ai/search). */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('gn-root'); if (!root) return;

  var MODULES = [
    ['01', 'Поиск товаров', 'Фото товара → 3–5 аналогов · рендер → все товары с разбивкой и сметой', 'готов', 'ai.html?mode=photo'],
    ['02', 'ДНК-паспорт', 'Рендер → мудборд из 12–13 позиций, база и премиум, PDF', 'к запуску', ''],
    ['03', 'Замена предмета', '«Поменяй люстру» — точечная замена с подбором аналогов', 'к запуску', ''],
    ['04', 'Планировка', 'План → точный dollhouse и рендеры комнат в выбранной капсуле', 'к запуску · финал', 'plan.html'],
    ['05', 'Примерка капсул', 'Наложение К1–К7 на вашу планировку', 'в доработке', 'fit.html'],
    ['06', 'Визуализации с нуля', 'План + референсы + текст → 2–3 варианта', 'позже', '']
  ];
  var HOW = [
    ['Кинули фото', 'Фото товара или рендер интерьера — прямо в браузере, без установки.'],
    ['ИИ подобрал за ~40 секунд', 'Ядро находит аналоги со скидками и собирает смету по разбивке.'],
    ['Открыли контакты', 'По METOD или разовой оплатой — где купить дешевле, с контактом продавца.']
  ];

  var sample = D.ai.renderSample;
  var объекты = (sample.objects || []).slice(0, 3).map(function (o) {
    var p = D.product(o.items[0].id);
    return p ? { name: o.name, price: p.metod } : null;
  }).filter(Boolean);

  root.innerHTML =
    '<div class="stack stack--3"><span class="eyebrow">SOVEAPP AI</span>' +
    '<h1 class="h1">Твой карманный дизайнер</h1>' +
    '<p class="text">Актуальный каталог под рукой — ИИ находит, что подходит именно вам, за секунды. Шесть модулей от поиска до визуализаций плюс планировщик.</p>' +
    '<a class="btn btn--primary btn--block" href="ai.html?mode=photo">Попробовать</a></div>' +

    /* кадр до/после — как на сайте: пустой рендер превращается в товары с ценниками */
    '<section class="gn-ba"><div class="gn-ba__side"><img src="' + sample.src + '" alt="Рендер интерьера"><span>до<i>пустой рендер</i></span></div>' +
      '<div class="gn-ba__side gn-ba__side--after"><div class="gn-ba__tags">' +
        объекты.map(function (o) { return '<span>' + esc(o.name) + ' · ' + F.rub(o.price) + '</span>'; }).join('') +
      '</div><span>после<i>товары + ценники</i></span></div></section>' +

    '<div class="tm-nums">' +
      '<div class="tm-num"><b>живой</b><span>каталог товаров</span></div>' +
      '<div class="tm-num"><b>~40 сек</b><span>анализ</span></div>' +
      '<div class="tm-num"><b>6 модулей</b><span>+ планировщик</span></div>' +
    '</div>' +

    '<div class="stack stack--4"><h2 class="h2">6 инструментов</h2>' +
      '<div class="gn-grid">' + MODULES.map(function (m) {
        var live = !!m[4];
        var inner = '<span class="gn-mod__top"><i>' + m[0] + '</i><span class="gn-mod__st' + (m[3] === 'готов' ? ' is-live' : '') + '">' + esc(m[3]) + '</span></span>' +
          '<b>' + esc(m[1]) + '</b><span class="gn-mod__d">' + esc(m[2]) + '</span>';
        return live
          ? '<a class="gn-mod" href="' + m[4] + '">' + inner + '</a>'
          : '<div class="gn-mod gn-mod--dim">' + inner + '</div>';
      }).join('') + '</div></div>' +

    '<section class="pb"><span class="pb__k">Попробуйте на своём фото прямо сейчас</span>' +
      '<label class="pl-drop"><input type="file" id="gn-file" accept="image/*" hidden>' +
      '<b>Перетащите фото или рендер сюда</b><span>или нажмите, чтобы выбрать файл</span>' +
      '<span class="pl-drop__hint">поиск по фото бесплатный · разбор рендера — ' + F.tokens(D.costs.render) + '</span></label>' +
    '</section>' +

    '<div class="stack stack--4"><h2 class="h2">Как это работает</h2>' +
      '<div class="pb-list">' + HOW.map(function (h, i) {
        return '<div class="pb-item"><b>' + (i + 1) + ' · ' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div>';
      }).join('') + '</div></div>' +

    '<div class="tm-grid">' +
      '<a class="tm-tile" href="generations.html"><b>Мои генерации</b><span>история подборов и баланс токенов</span></a>' +
      '<a class="tm-tile" href="tokens.html"><b>Токены</b><span>пакет или подписка METOD 1:1</span></a>' +
    '</div>';

  /* свой файл сразу уводит в рабочий экран поиска */
  var file = document.getElementById('gn-file');
  if (file) file.addEventListener('change', function () {
    if (!file.files || !file.files[0]) return;
    location.href = 'ai.html?mode=photo';
  });
  var drop = root.querySelector('.pl-drop');
  if (drop) {
    ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) location.href = 'ai.html?mode=photo';
    });
  }
})();
