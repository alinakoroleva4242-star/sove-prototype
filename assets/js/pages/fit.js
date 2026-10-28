/* Примерка товара в комнате: фото комнаты + вещь из каталога.
   В прототипе генерации нет — показываем, как сценарий выглядит и что получает человек. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var root = document.getElementById('fit-root');
  var COST = 0;                                    /* примерка бесплатна: платный только разбор рендера */

  /* товар по ссылке: пример из data.js или живой каталог (SOVE.catalog); страница строится после ответа */
  var resolve = function (id) { return S.catalog ? S.catalog.resolve(id) : Promise.resolve(D.product(id)); };
  resolve(ui.qs('product')).catch(function () { return null; }).then(function (product) {
    if (product) return main(product);
    var ids = (S.my.get().productIds || []).slice(0, 4);
    return Promise.all(ids.map(function (id) { return resolve(id).catch(function () { return null; }); })).then(function (mine) { askWhat(mine.filter(Boolean)); });
  });
  function askWhat(mine) {              /* без товара в ссылке спрашиваем, что примеряем */
    root.innerHTML = '<div class="fit__head"><span class="eyebrow">Примерка · Генерации</span>' +
      '<h1 class="h2">Что примеряем?</h1>' +
      '<p class="text">Выберите вещь в каталоге или возьмите из «Моего ремонта» — покажем, как она встанет в вашей комнате.</p></div>' +
      (mine.length ? '<div class="fit__mine">' + mine.map(function (x) {
        return '<a class="fit__prod" href="fit.html?product=' + x.id + '"><img src="' + x.img + '" alt="">' +
          '<span><b>' + esc(x.name) + '</b><i>' + F.rub(x.metod) + ' с METOD</i></span></a>';
      }).join('') + '</div>' : '') +
      '<a class="btn btn--primary btn--block fit__tocat" href="market.html">Открыть каталог</a>';
  }
  function main(product) {
  var ROOMS = [
    { id: 'k1', title: 'Гостиная, капсула К1', src: 'assets/img/slides/k1-living-1.jpg' },
    { id: 'k5', title: 'Гостиная, капсула К5', src: 'assets/img/slides/k5-living-1.jpg' },
    { id: 'k7', title: 'Гостиная, капсула К7', src: 'assets/img/slides/k7-living-1.jpg' }
  ].filter(function (r) { return !!r.src; });

  var st = { view: 'idle', room: null, x: 50, y: 74, scale: 1, genId: null };

  function head() {
    return '<div class="fit__head"><span class="eyebrow">Примерка · Генерации</span>' +
      '<h1 class="h2">Как вещь встанет в вашей комнате</h1>' +
      '<p class="text">Загрузите фотографию комнаты — поставим в неё выбранный товар. Это черновой вид: он помогает понять масштаб и сочетание, а не заменяет дизайн-проект.</p></div>';
  }

  function productRow() {
    return '<a class="fit__prod" href="product.html?id=' + product.id + '">' +
      '<img src="' + product.img + '" alt="">' +
      '<span><b>' + esc(product.name) + '</b>' +
      '<i>' + F.rub(product.metod) + ' с METOD · <s>' + F.rub(product.retail) + '</s> у поставщика</i></span></a>';
  }

  function viewIdle() {
    return head() + productRow() +
      '<div class="fit__pick">' +
        '<label class="fit__up"><input type="file" accept="image/*" id="fit-file" hidden>' +
        '<b>Загрузить фото комнаты</b><span>Снимите комнату целиком, при дневном свете</span></label>' +
        '<div class="fit__samples"><span class="fit__sub">Или возьмите пример</span><div class="fit__lane">' +
          ROOMS.map(function (r, i) { return '<button type="button" class="fit__sample" data-room="' + i + '"><img src="' + r.src + '" alt="" loading="lazy"><span>' + esc(r.title) + '</span></button>'; }).join('') +
        '</div></div>' +
      '</div>' +
      '<p class="fit__cost">Примерка бесплатна — токены нужны только для разбора рендера интерьера.</p>';
  }

  function viewRun() {
    return head() + productRow() +
      '<div class="fit__run"><div class="fit__bar"><i id="fit-bar"></i></div><span id="fit-stage">Разбираю комнату</span></div>';
  }

  function viewDone() {
    return head() +
      '<div class="fit__stage" id="fit-stage-box">' +
        '<img class="fit__room" src="' + st.room.src + '" alt="' + esc(st.room.title) + '">' +
        '<img class="fit__item" id="fit-item" src="' + product.img + '" alt="' + esc(product.name) + '">' +
        '<span class="fit__mark">черновая примерка</span>' +
      '</div>' +
      '<label class="fit__size"><span>Размер вещи</span><input type="range" id="fit-scale" min="50" max="170" value="' + Math.round(st.scale * 100) + '"></label>' +
      '<p class="fit__hint">Перетащите вещь пальцем, размер — ползунком. Так понятнее, влезает ли она в проход.</p>' +
      productRow() +
      '<div class="fit__acts">' +
        '<button type="button" class="btn btn--primary btn--block" data-act="add">' + (S.my.hasProduct(product.id) ? 'Уже в моём ремонте' : 'В мой ремонт') + '</button>' +
        '<a class="btn btn--ghost btn--block" href="product.html?id=' + product.id + '">Узнать, где купить</a>' +
        '<button type="button" class="btn btn--link" data-act="again">Другая комната</button>' +
      '</div>';
  }

  function paint() {
    root.innerHTML = st.view === 'run' ? viewRun() : st.view === 'done' ? viewDone() : viewIdle();
    if (st.view === 'done') bindDone();
    if (st.view === 'idle') bindIdle();
  }

  function start(room) {
    st.room = room;
    st.view = 'run';
    paint();
    var bar = document.getElementById('fit-bar'), label = document.getElementById('fit-stage');
    var steps = ['Разбираю комнату', 'Ищу место для вещи', 'Собираю кадр'], t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / 3400);
      if (bar) bar.style.width = (k * 100).toFixed(1) + '%';
      if (label) label.textContent = steps[Math.min(steps.length - 1, Math.floor(k * steps.length))];
      if (k < 1) requestAnimationFrame(frame);
      else {
        var gen = S.gens.add({ kind: 'fit', title: product.name + ' · ' + room.title, src: room.src, status: 'done', cost: 0, result: { productId: product.id } });
        st.genId = gen.id; st.view = 'done'; paint();
      }
    }
    requestAnimationFrame(frame);
  }

  function bindIdle() {
    root.querySelectorAll('[data-room]').forEach(function (b) {
      b.addEventListener('click', function () { start(ROOMS[Number(b.getAttribute('data-room'))]); });
    });
    var file = document.getElementById('fit-file');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { ui.toast('Нужен снимок комнаты — файл с изображением'); return; }
      start({ id: 'own', title: 'Ваша комната', src: URL.createObjectURL(f) });
    });
  }

  function bindDone() {
    var box = document.getElementById('fit-stage-box'), item = document.getElementById('fit-item');
    var range = document.getElementById('fit-scale');

    function place() {
      item.style.left = st.x + '%';
      item.style.top = st.y + '%';
      item.style.width = (38 * st.scale).toFixed(1) + '%';
    }
    place();

    var drag = false;
    box.addEventListener('pointerdown', function (e) {
      if (e.target !== item) return;
      drag = true; item.setPointerCapture(e.pointerId); item.classList.add('is-drag'); e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var r = box.getBoundingClientRect();
      st.x = Math.max(10, Math.min(90, (e.clientX - r.left) / r.width * 100));
      st.y = Math.max(20, Math.min(96, (e.clientY - r.top) / r.height * 100));
      place(); e.preventDefault();
    });
    box.addEventListener('pointerup', function () { drag = false; item.classList.remove('is-drag'); });

    range.addEventListener('input', function () { st.scale = Number(range.value) / 100; place(); });

    root.querySelector('[data-act="add"]').addEventListener('click', function (e) {
      S.my.addProduct(product.id);
      e.target.textContent = 'Уже в моём ремонте';
      ui.toast('Добавили в «Мой ремонт»');
    });
    root.querySelector('[data-act="again"]').addEventListener('click', function () {
      st.view = 'idle'; st.x = 50; st.y = 74; st.scale = 1; paint();
    });
  }

  paint();
  }
})();
