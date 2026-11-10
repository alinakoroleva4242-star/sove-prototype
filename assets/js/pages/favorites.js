/* «Избранное» — перенос экрана /marketplace/favorites: папки и сохранённые товары.
   Папки живут в этом браузере; товар лежит в одной папке, по умолчанию — «Все».
   Сверху (Алина 25.10): «Интерьеры» — текущие интерьеры квартир (доска или выбранная капсула) и «＋ свой интерьер», «Подборки» — блоки товаров
   к интерьеру целиком (R.favSets; позже — посты Ленты METOD), «Специалисты» — ♡ из раздела «Строители, дизайнеры и мастера» (R.favPros,
   саммари созвона п. 12: наравне с товарами и подборками), ниже — товары по папкам. Избранное — квартиры из Моего ремонта (repair.js).
   favorites.html#fv-pros — сразу к специалистам (ссылка из тоста «Специалист в Избранном · Открыть»). */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui;
  var root = document.getElementById('fv-root'); if (!root) return;
  var KEY = 'sove.proto.favFolders';
  var cur = 'all';

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function folders() { var st = load(); return st.folders || []; }
  function placement() { var st = load(); return st.place || {}; }
  function setState(folders, place) { save({ folders: folders, place: place }); }

  function inFolder(id) { return placement()[id] || 'all'; }
  /* товары избранного: примеры из data.js или живой каталог (SOVE.catalog), ответы кэшируем по id */
  var cache = {};
  function resolveAll() {
    var ids = S.favs.list().filter(function (id) { return !(id in cache); });
    return Promise.all(ids.map(function (id) {
      return (S.catalog ? S.catalog.resolve(id) : Promise.resolve(D.product(id))).then(function (p) { cache[id] = p || null; }).catch(function () { cache[id] = null; });
    }));
  }
  function items() {
    var list = S.favs.list().map(function (id) { return cache[id] || D.product(id); }).filter(Boolean);
    return cur === 'all' ? list : list.filter(function (p) { return inFolder(p.id) === cur; });
  }

  var openSet = null;
  /* текущий интерьер каждой квартиры: доска — в Интерьер на экран B; выбранная капсула без материалов (лёгкая запись окна выбора) —
     в Интерьер, он соберёт материалы. Имя — как в списке интерьеров Моего ремонта (без кода капсулы) */
  function interiors() {
    var R = S.repair; if (!R) return '';
    var cards = R.flats.list().map(function (fl) {
      var x = R.get(fl.id).interior; if (!x) return '';
      var sum = (R.interiors ? R.interiors.list(fl.id) : []).filter(function (y) { return y.id === x.id; })[0] || {};
      var img = x.imageUrl || x.img || sum.img || '', light = !x.slots, name = sum.name || x.name || x.style || 'Мой интерьер';
      if (!img) return '';
      var href = 'interior.html?' + (light ? '' : 'v=b&') + 'flat=' + encodeURIComponent(fl.id);
      return '<a class="fv-int" href="' + href + '"><span style="background-image:url(\'' + esc(img) + '\')"></span><b>' + esc(name) + '</b><small>' + esc(fl.name) + (light ? ' · материалы не собраны' : '') + '</small></a>';
    }).join('');
    return '<div class="stack stack--3"><h2 class="h3">Интерьеры</h2><div class="fv-ints">' + cards +
      '<a class="fv-int fv-int--add" href="interior.html?v=a"><span>＋</span><b>Свой интерьер</b><small>картинка, фото, Pinterest</small></a></div></div>';
  }
  function sets() {
    var R = S.repair; if (!R || !R.favSets) return '';
    var list = R.favSets.list();
    return '<div class="stack stack--3"><h2 class="h3">Подборки' + (list.length ? ' · ' + list.length : '') + '</h2>' + (list.length ? list.map(function (x) {
      var ps = (x.productIds || []).map(function (id) { return D.product(id); }).filter(Boolean), sum = ps.reduce(function (a, p) { return a + p.metod; }, 0), on = openSet === x.id;
      return '<div class="fv-set"><button type="button" class="fv-set__h" data-set="' + esc(x.id) + '" aria-expanded="' + on + '"><span class="fv-set__pic" style="background-image:url(' + esc(x.cover || (ps[0] || {}).img || '') + ')"></span>' +
        '<span class="fv-set__t"><b>' + esc(x.title) + '</b><small>' + ps.length + ' ' + (ps.length % 10 === 1 && ps.length % 100 !== 11 ? 'товар' : ps.length % 10 >= 2 && ps.length % 10 <= 4 && (ps.length % 100 < 10 || ps.length % 100 >= 20) ? 'товара' : 'товаров') + ' · ' + F.rub(sum) + '</small></span><i>' + (on ? '▴' : '▾') + '</i></button>' +
        '<div class="fv-set__strip">' + ps.slice(0, 6).map(function (p) { return '<a href="product.html?id=' + p.id + '" style="background-image:url(' + esc(p.img) + ')" aria-label="' + esc(p.name) + '"></a>'; }).join('') + '</div>' +
        (on ? '<div class="fav-grid">' + ps.map(function (p) { return ui.productCard(p); }).join('') + '</div>' : '') +
        '<div class="fv-set__acts"><button type="button" class="btn btn--primary btn--sm" data-set-cart="' + esc(x.id) + '">🛒 Все в корзину</button><button type="button" class="btn btn--link" data-set-off="' + esc(x.id) + '">Убрать</button></div></div>';
    }).join('') : '<p class="fav-empty">Сохрани блок товаров к интерьеру целиком — кнопка «♡ Товары к интерьеру» в Интерьере. Подборки из Ленты METOD появятся здесь после подключения канала.</p>') + '</div>';
  }
  /* специалисты: снимок карточки (имя, что делает, скидка, раздел) освежаем данными раздела, если специалист там ещё есть */
  function initials(name) {
    var w = String(name || '').replace(/[^A-Za-zА-Яа-яЁё0-9 ]/g, ' ').trim().split(/\s+/).filter(function (x) { return x.length > 2; });
    return ((w[0] || '').charAt(0) + (w[1] || '').charAt(0)).toUpperCase() || '•';
  }
  function pros() {
    var R = S.repair; if (!R || !R.favPros) return '';
    var X = window.SOVE_EXECUTORS || {}, items = X.items || [], secs = X.sections || [];
    var list = R.favPros.list().map(function (p) {
      var x = items.filter(function (y) { return y.id === p.id; })[0];
      return x ? Object.assign({}, p, { name: x.name, what: x.what, disc: x.disc || '', sec: x.sec }) : p;
    });
    function secName(id) { return (secs.filter(function (z) { return z.id === id; })[0] || {}).t || ''; }
    return '<div class="stack stack--3 fv-prosec" id="fv-pros"><h2 class="h3">Специалисты' + (list.length ? ' · ' + list.length : '') + '</h2>' +
      (list.length ? '<div class="fv-pros">' + list.map(function (p) {
        var chat = 'chats.html?kind=partner&partner=' + encodeURIComponent(p.id) + '&name=' + encodeURIComponent(p.name);
        var sub = [p.what, secName(p.sec)].filter(Boolean).join(' · ');
        return '<article class="fv-pro"><a class="fv-pro__top" href="executors.html' + (p.sec ? '?sec=' + encodeURIComponent(p.sec) : '') + '">' +
          '<span class="fv-pro__ava" aria-hidden="true">' + esc(initials(p.name)) + '</span>' +
          '<span class="fv-pro__t"><b>' + esc(p.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
          (p.disc ? '<span class="fv-pro__disc">' + esc(p.disc) + '</span>' : '') + '</a>' +
          '<div class="fv-pro__acts"><a class="btn btn--primary btn--sm" href="' + chat + '">Оставить заявку</a>' +
          '<button type="button" class="btn btn--link" data-pro-off="' + esc(p.id) + '" aria-label="Убрать из Избранного: ' + esc(p.name) + '">Убрать</button></div></article>';
      }).join('') + '</div>' : '<p class="fav-empty">Нажмите ♡ на карточке в разделе «Строители, дизайнеры и мастера» — специалист появится здесь.</p>') +
      '<a class="arrow-link fv-pros__all" href="executors.html">Строители, дизайнеры и мастера</a></div>';
  }
  function paint() {
    var fs = folders(), list = items();
    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">Каталог товаров</span><h1 class="h1">Избранное</h1>' +
      '<p class="text">Интерьеры, подборки товаров к интерьеру, специалисты и отдельные товары.</p></div>' +
      interiors() + sets() + pros() + '<h2 class="h3">Товары</h2>' +

      '<div class="fav-folders">' +
        '<button type="button" class="chip' + (cur === 'all' ? ' is-on' : '') + '" data-f="all">Все</button>' +
        fs.map(function (f) { return '<button type="button" class="chip' + (cur === f ? ' is-on' : '') + '" data-f="' + esc(f) + '">' + esc(f) + '</button>'; }).join('') +
        '<button type="button" class="chip" data-new>+ папка</button>' +
      '</div>' +

      (cur !== 'all'
        ? '<div class="row row--gap"><button type="button" class="btn btn--link" data-rename>Переименовать</button>' +
          '<button type="button" class="btn btn--link" data-drop>Удалить папку</button></div>'
        : '') +

      (list.length
        ? '<div class="fav-grid">' + list.map(function (p) {
            return ui.productCard(p) +
              '<div class="vh"></div>';
          }).join('') + '</div>' +
          (fs.length ? '<div class="stack stack--3"><h2 class="h3">Разложить по папкам</h2><div class="stack stack--0">' +
            list.map(function (p) {
              return '<label class="ac-row"><img src="' + p.img + '" alt="">' +
                '<span class="ac-row__body"><b>' + esc(p.name) + '</b><span>' + F.rub(p.metod) + ' с METOD</span></span>' +
                '<select class="input input--sm" data-place="' + p.id + '"><option value="all">Все</option>' +
                fs.map(function (f) { return '<option value="' + esc(f) + '"' + (inFolder(p.id) === f ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('') +
                '</select></label>';
            }).join('') + '</div></div>' : '')
        : '<p class="fav-empty">' + (cur === 'all'
            ? 'Пока пусто. Нажмите сердечко на товаре в каталоге — он появится здесь.'
            : 'В этой папке пока пусто.') + '</p>') +

      '<a class="btn btn--ghost btn--block" href="market.html">Открыть каталог</a>';

    root.querySelectorAll('[data-set]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-set'); openSet = openSet === id ? null : id; paint(); }); });
    root.querySelectorAll('[data-set-cart]').forEach(function (b) { b.addEventListener('click', function () { var x = S.repair.favSets.list().filter(function (y) { return y.id === b.getAttribute('data-set-cart'); })[0]; if (x) S.repair.cart.addMany(x.productIds, 'market'); }); });
    root.querySelectorAll('[data-pro-off]').forEach(function (b) { b.addEventListener('click', function () { S.repair.favPros.toggle({ id: b.getAttribute('data-pro-off') }); }); });   /* → 'sove:repair' → paint */
    root.querySelectorAll('[data-set-off]').forEach(function (b) { b.addEventListener('click', function () { var x = S.repair.favSets.list().filter(function (y) { return y.id === b.getAttribute('data-set-off'); })[0]; if (x) { S.repair.favSets.toggle(x); paint(); } }); });
    root.querySelectorAll('[data-f]').forEach(function (b) {
      b.addEventListener('click', function () { cur = b.getAttribute('data-f'); paint(); });
    });
    var nb = root.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', function () {
      ui.prompt ? null : null;
      var m = ui.modal({ eyebrow: 'Избранное', title: 'Новая папка',
        html: '<div class="field"><label for="fv-name">Название</label><input class="input" id="fv-name" maxlength="30" placeholder="Например, кухня"></div>',
        actions: [ { label: 'Создать', kind: 'primary', close: false, onClick: function (ev, api) {
          var v = api.el.querySelector('#fv-name').value.trim(); if (!v) return;
          var fs2 = folders(); if (fs2.indexOf(v) < 0) fs2.push(v);
          setState(fs2, placement()); api.close(); cur = v; paint();
        } }, { label: 'Отмена', kind: 'ghost' } ] });
      return m;
    });
    var rn = root.querySelector('[data-rename]');
    if (rn) rn.addEventListener('click', function () {
      ui.modal({ eyebrow: 'Папка', title: 'Переименовать',
        html: '<div class="field"><label for="fv-rn">Новое название</label><input class="input" id="fv-rn" maxlength="30" value="' + esc(cur) + '"></div>',
        actions: [ { label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
          var v = api.el.querySelector('#fv-rn').value.trim(); if (!v) return;
          var fs2 = folders().map(function (f) { return f === cur ? v : f; });
          var pl = placement(); Object.keys(pl).forEach(function (k) { if (pl[k] === cur) pl[k] = v; });
          setState(fs2, pl); api.close(); cur = v; paint();
        } }, { label: 'Отмена', kind: 'ghost' } ] });
    });
    var dr = root.querySelector('[data-drop]');
    if (dr) dr.addEventListener('click', function () {
      ui.modal({ eyebrow: 'Папка', title: 'Удалить папку?',
        text: 'Товары останутся в избранном — они просто вернутся в «Все».',
        actions: [ { label: 'Удалить', kind: 'primary', onClick: function () {
          var fs2 = folders().filter(function (f) { return f !== cur; });
          var pl = placement(); Object.keys(pl).forEach(function (k) { if (pl[k] === cur) delete pl[k]; });
          setState(fs2, pl); cur = 'all'; paint();
        } }, { label: 'Отмена', kind: 'ghost' } ] });
    });
    root.querySelectorAll('[data-place]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var pl = placement(); pl[sel.getAttribute('data-place')] = sel.value;
        setState(folders(), pl); ui.toast('Переложили'); paint();
      });
    });
    /* #fv-pros: страница рисуется после загрузки товаров — сам якорь браузера не срабатывает, прокручиваем один раз */
    if (!hashDone && location.hash === '#fv-pros') { var pe = root.querySelector('#fv-pros'); if (pe) { hashDone = true; pe.scrollIntoView({ block: 'start', behavior: 'instant' }); } }
  }
  var hashDone = false;
  function refresh() { resolveAll().then(paint); }
  if (S.favs.list().length) root.innerHTML = '<div class="stack stack--3"><span class="eyebrow">Каталог товаров</span><h1 class="h1">Избранное</h1><p class="text">Загружаем сохранённые товары…</p></div>';
  refresh();
  window.addEventListener('sove:my', refresh);
  window.addEventListener('sove:repair', paint);
  if (S.onChange) S.onChange(refresh);
})();
