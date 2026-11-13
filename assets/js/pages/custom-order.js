/* «Мебель и решения на заказ» — перенос экрана /marketplace/custom-order.
   Эти партнёры изготавливают под объект, в общем каталоге их нет: заявка уходит в чат с партнёром.
   ?partner=<id> — страница бренда (Вика 05.11: «когда проваливаешься в бренд — картинка от этой компании»; Таня 06.11: кнопки «Что нужно?» лишние, только «Просчитать проект» и загрузка чертежа): фото, чертёж, заявка.
   В демо файл никуда не уходит: в чат попадает его имя, как у скрепки в переписке.
   Фото — работы партнёра из нашего каталога; у эксклюзивного мебельного — его фото из таблицы METOD (лист «Акции»);
   у кого их нет, пока не пришлёт партнёр: у кухонь пример с подписью, у остальных место под фото. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('co-root'); if (!root) return;
  var CO = D.customOrder || { categories: [], partners: [] };
  var cur = S.ui.qs('cat') || 'all';
  if (cur !== 'all' && CO.categories.indexOf(cur) < 0) cur = 'all'; /* старая ссылка на прежнее название категории */
  var CAT = 'https://storage.yandexcloud.net/sove-catalog-images/catalog/all/';
  var PHOTOS = {
    'pilotage': ['assets/img/partners/exclusive-kitchen.jpg'],
    'kuhni-layt': ['be5396cadd12b760', '8129789088cdc21d', '4477a9b4857bff9b', 'dba7752dc622c1bf'],
    'sgib': ['84377a0be1f5847a', 'ed0ad2fb8002fb0e', 'a2b7b230c5b72b01', 'a4545a170cff0506']
  };
  var KITCHEN_EXAMPLE = 'assets/img/moy-remont/mr-kitchen.jpg';
  var DRAW_ACCEPT = 'image/*,.pdf,.dwg,.dxf', DRAW_RE = /\.(pdf|dwg|dxf|jpe?g|png|heic|heif|webp)$/i, DRAW_MB = 20;
  var brand = CO.partners.filter(function (p) { return p.id === S.ui.qs('partner'); })[0] || null;

  function cards() {
    var list = cur === 'all' ? CO.partners : CO.partners.filter(function (p) { return p.category === cur; });
    if (!list.length) return '<p class="text muted">В этой категории партнёров пока нет.</p>';
    return '<div class="co-grid">' + list.map(function (p) {
      return '<a class="co" href="custom-order.html?partner=' + encodeURIComponent(p.id) + (cur !== 'all' ? '&cat=' + encodeURIComponent(cur) : '') + '">' +
        '<span class="co__flag">на заказ</span>' +
        '<b class="co__name">' + esc(p.name) + '</b>' +
        '<span class="co__cat">' + esc(p.category) + '</span>' +
        '<span class="co__note">' + esc(p.note) + '</span>' +
        '<span class="co__cta">Подробнее</span></a>';
    }).join('') + '</div>';
  }

  /* ── страница бренда ── */
  function photosBlock(p) {
    var pics = (PHOTOS[p.id] || []).map(function (x) { return x.indexOf('/') < 0 ? CAT + x + '.jpg' : x; });
    if (!pics.length) {
      if (p.category !== 'Кухни и мебель на заказ') return '<div class="cob-ph"><span>Фото работ партнёра появятся здесь</span></div>';
      return '<figure class="cob-pic"><img class="cob-main" src="' + KITCHEN_EXAMPLE + '" alt="Пример кухни"><figcaption class="cob-tag">Пример. Фото работ партнёра появятся здесь</figcaption></figure>';
    }
    return '<div class="cob-pics"><img class="cob-main" id="cob-main" src="' + esc(pics[0]) + '" alt="Работа партнёра ' + esc(p.name) + '">' +
      (pics.length < 2 ? '' : '<div class="cob-ths">' + pics.map(function (src, i) {
        return '<button type="button" class="cob-th' + (i ? '' : ' is-on') + '" data-pic="' + esc(src) + '" aria-label="Фото ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>') + '</div>';
  }
  function paintBrand(p) {
    var key = 'custom-order.' + p.id, file = (S.draft.get(key) || {}).file || '';
    document.title = p.name + ' — SOVEAPP';
    root.innerHTML = '<div class="cob">' +
      '<a class="cob-back" href="custom-order.html' + (cur !== 'all' ? '?cat=' + encodeURIComponent(cur) : '') + '">‹ Все партнёры</a>' +
      photosBlock(p) +
      '<div class="stack stack--2"><span class="eyebrow">' + esc(p.category) + '</span><h1 class="h2">' + esc(p.name) + '</h1><span class="co__note">' + esc(p.note) + '</span></div>' +
      '<div class="cob-acts"><input type="file" hidden id="cob-file" accept="' + DRAW_ACCEPT + '">' +
        '<button type="button" class="btn btn--ghost btn--lg btn--block" id="cob-pick"></button>' +
        '<div class="cob-state" id="cob-state"></div>' +
        '<button type="button" class="btn btn--primary btn--lg btn--block" id="cob-send">Просчитать проект</button></div>' +
      '<p class="cob-hint">Заявка уйдёт партнёру в чат здесь, в SOVEAPP. Цену и срок обсудите с ним напрямую.</p></div>';
    function paintFile(err) {
      document.getElementById('cob-pick').textContent = file ? 'Заменить чертёж' : 'Загрузить чертёж';
      document.getElementById('cob-state').innerHTML = (err ? '<p class="field__error" role="alert">' + esc(err) + '</p>' : '') +
        (file ? '<div class="cob-picked"><span>Чертёж: <b>' + esc(file) + '</b></span><button type="button" id="cob-drop">Убрать</button></div>'
          : err ? '' : '<p class="cob-hint">PDF, DWG, DXF или фото до ' + DRAW_MB + ' МБ. Нет чертежа — уточните размеры в чате.</p>');
      var drop = document.getElementById('cob-drop');
      if (drop) drop.addEventListener('click', function () { file = ''; S.draft.clear(key); paintFile(); });
    }
    paintFile();
    var fi = document.getElementById('cob-file');
    document.getElementById('cob-pick').addEventListener('click', function () { fi.click(); });
    fi.addEventListener('change', function () {
      var f = fi.files && fi.files[0]; fi.value = ''; if (!f) return;
      if (!DRAW_RE.test(f.name)) return paintFile('Файл «' + f.name + '» не подходит. Нужен PDF, DWG, DXF или фото.');
      if (f.size > DRAW_MB * 1048576) return paintFile('Файл «' + f.name + '» весит ' + Math.ceil(f.size / 1048576) + ' МБ — больше ' + DRAW_MB + ' МБ. Сожмите его или сфотографируйте чертёж.');
      file = f.name; S.draft.set(key, { file: file }); paintFile();
    });
    root.querySelectorAll('[data-pic]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.getElementById('cob-main').src = b.getAttribute('data-pic');
        root.querySelectorAll('[data-pic]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });
    var main = root.querySelector('.cob-main');
    if (main) main.addEventListener('error', function () { var box = main.closest('.cob-pics, .cob-pic'); if (box) box.outerHTML = '<div class="cob-ph"><span>Фото работ партнёра появятся здесь</span></div>'; });
    document.getElementById('cob-send').addEventListener('click', function () {
      S.draft.clear(key);
      location.href = 'chats.html?kind=partner&partner=' + encodeURIComponent(p.id) + '&name=' + encodeURIComponent(p.name) + '&req=' + encodeURIComponent('Заявка: просчитать проект') + (file ? '&file=' + encodeURIComponent(file) : '');
    });
  }

  function chips() {
    var all = ['all'].concat(CO.categories);
    return '<div class="lane co-chips">' + all.map(function (c) {
      var on = c === cur;
      return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' +
        (c === 'all' ? 'Все' : esc(c)) + '</button>';
    }).join('') + '</div>';
  }

  function paint() {
    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">Каталог товаров</span>' +
      '<h1 class="h1">Мебель и решения на заказ</h1>' +
      '<p class="text">Эти партнёры изготавливают под ваш объект, а не продают готовое: цену и срок обсуждаете напрямую. В общем каталоге их нет.</p></div>' +
      chips() + cards() +
      '<a class="btn btn--ghost btn--block" href="market.html">Готовые товары в каталоге</a>';
    root.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { cur = b.getAttribute('data-cat'); paint(); });
    });
  }
  if (brand) paintBrand(brand); else paint();
})();
