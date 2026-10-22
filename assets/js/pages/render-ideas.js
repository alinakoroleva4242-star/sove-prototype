/* Витрина идей блока «Разбор рендера» для главной. Эскизы на настоящих данных прототипа. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var R = D.ai.renderSample, OBJ = R.objects;
  var root = document.getElementById('ri-list');

  function price(o) { var p = D.product(o.items[0].id); return p ? p.metod : 0; }
  function retail(o) { var p = D.product(o.items[0].id); return p ? p.retail : 0; }
  var sumMetod = OBJ.reduce(function (s, o) { return s + price(o); }, 0);
  var sumRetail = OBJ.reduce(function (s, o) { return s + retail(o); }, 0);
  var mln = function (n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ',') + ' млн'; };

  function wrap(n, title, note, html) {
    return '<section class="ri__block"><h2 class="ri__n">' + n + ' · ' + esc(title) + '</h2>' +
      '<p class="ri__d">' + esc(note) + '</p>' + html + '</section>';
  }

  /* 1 — сколько стоит этот рендер */
  function i1() {
    return '<div class="rc rc--1"><img src="' + R.src + '" alt="">' +
      '<div class="rc__body"><span class="rc__k">SOVEAPP AI · разбор рендера</span>' +
      '<b class="rc__t">В этом кадре ' + OBJ.length + ' предмета</b>' +
      '<span class="rc__sum">' + F.rub(sumMetod) + ' <s>' + F.rub(sumRetail) + '</s></span>' +
      '<span class="rc__d">столько стоит собрать его у партнёров с METOD</span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Загрузить свой рендер</a></div></div>';
  }

  /* 2 — рамки вспыхивают сами */
  function i2() {
    return '<div class="rc rc--frames"><div class="rc__stage"><img src="' + R.src + '" alt="">' +
      OBJ.map(function (o, i) {
        return '<span class="rf" style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%;--i:' + i + '"><i>' + o.n + '</i></span>';
      }).join('') +
      '<span class="rc__count">найдено 3 из 4 · ' + F.rub(sumMetod - price(OBJ[3])) + '</span></div>' +
      '<div class="rc__body"><b class="rc__t">Кадр разбирается на предметы</b>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать мой кадр</a></div></div>';
  }

  /* 3 — конверт с проектом */
  function i3() {
    return '<div class="rc rc--env"><div class="env"><span class="env__paper"><img src="' + R.src + '" alt=""></span><span class="env__flap"></span></div>' +
      '<div class="rc__body"><span class="rc__k">Есть проект от дизайнера?</span>' +
      '<b class="rc__t">Принесите рендеры — проверим смету</b>' +
      '<span class="rc__d">Найдём те же вещи у партнёров и покажем, где переплата</span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Проверить смету</a></div></div>';
  }

  /* 4 — рентген-полоса */
  function i4() {
    return '<div class="rc rc--xray"><div class="rc__stage"><img src="' + R.src + '" alt="">' +
      '<span class="xray"><i></i></span>' +
      OBJ.slice(0, 2).map(function (o) { return '<span class="rf is-on" style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%"><em>' + F.rub(price(o)) + '</em></span>'; }).join('') +
      '</div><div class="rc__body"><b class="rc__t">Проведите по кадру — увидите цены</b>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать кадр</a></div></div>';
  }

  /* 5 — примеры вместо загрузки */
  function i5() {
    var caps = D.capsules.filter(function (c) { return !c.soon && c.slides && c.slides.length; }).slice(0, 4);
    return '<div class="rc"><div class="rc__body"><span class="rc__k">SOVEAPP AI · разбор рендера</span>' +
      '<b class="rc__t">Разберём любой кадр — хоть чужой</b></div>' +
      '<div class="rlane">' + caps.map(function (c) {
        return '<a class="rlane__i" href="ai.html?mode=render"><img src="' + c.slides[0].src + '" alt=""><span>разобрать</span></a>';
      }).join('') + '</div>' +
      '<div class="rc__body"><a class="btn btn--ghost btn--block" href="ai.html?mode=render">Загрузить свой</a></div></div>';
  }

  /* 6 — смета собирается на глазах */
  function i6() {
    return '<div class="rc rc--list"><div class="rc__split"><img src="' + R.src + '" alt="">' +
      '<ul class="rlist">' + OBJ.map(function (o, i) {
        return '<li style="--i:' + i + '"><span>' + esc(o.name) + '</span><b>' + F.rub(price(o)) + '</b></li>';
      }).join('') + '<li class="rlist__more"><span>и ещё 18 позиций</span></li></ul></div>' +
      '<div class="rc__body"><span class="rc__sum">' + F.rub(sumMetod) + ' <s>' + F.rub(sumRetail) + '</s></span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Собрать смету по моему кадру</a></div></div>';
  }

  /* 7 — проверка сметы дизайнера */
  function i7() {
    return '<div class="rc rc--cmp"><div class="rc__body"><span class="rc__k">Проверка сметы</span>' +
      '<b class="rc__t">Столько же, но дешевле</b></div>' +
      '<table class="rtab"><thead><tr><th>Позиция</th><th>у дизайнера</th><th>у нас</th></tr></thead><tbody>' +
      OBJ.slice(0, 3).map(function (o) {
        return '<tr><td>' + esc(o.name) + '</td><td class="rtab__old">' + F.rub(retail(o)) + '</td><td class="rtab__new">' + F.rub(price(o)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="rc__body"><span class="rc__d">Разница по трём позициям — ' + F.rub(sumRetail - sumMetod) + '</span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Проверить мою смету</a></div></div>';
  }

  /* 8 — соберите такой же */
  function i8() {
    return '<a class="rc rc--same" href="ai.html?mode=render"><img src="' + R.src + '" alt="">' +
      '<span class="rc__over"><b>Соберём такой же</b><em>' + mln(sumMetod * 7) + ' ₽ за комплект</em><span class="btn btn--light btn--sm">Разобрать мой кадр</span></span></a>';
  }

  /* 9 — оглавление кадра */
  function i9() {
    return '<div class="rc rc--toc"><div class="toc"><img class="toc__strip" src="' + R.src + '" alt="">' +
      '<ul class="toc__list">' + OBJ.map(function (o) {
        return '<li><span>' + esc(o.name.split(' ')[0]) + ' ' + esc(o.name.split(' ')[1] || '') + '</span><i></i><b>' + F.rub(price(o)) + '</b></li>';
      }).join('') + '<li class="toc__sum"><span>итого</span><i></i><b>' + F.rub(sumMetod) + '</b></li></ul></div>' +
      '<div class="rc__body"><span class="rc__d">Цены у партнёров с подпиской METOD, розница — ' + F.rub(sumRetail) + '</span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать свой рендер</a></div></div>';
  }

  /* 10 — калька с выносками */
  function i10() {
    return '<div class="rc rc--trace"><div class="rc__stage"><img src="' + R.src + '" alt="">' +
      '<span class="trace"></span>' +
      OBJ.slice(0, 3).map(function (o, i) {
        return '<span class="tnote" style="--x:' + (o.box[0] + o.box[2] / 2) + '%;--y:' + (o.box[1] + o.box[3] / 2) + '%;--s:' + i + '"><em>' + o.n + '</em><span>' + esc(o.name) + '<b>' + F.rub(price(o)) + '</b></span></span>';
      }).join('') + '</div>' +
      '<div class="rc__body"><b class="rc__t">Ваш рендер разберём так же</b>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать рендер</a></div></div>';
  }

  /* 11 — лупа под пальцем */
  function i11() {
    return '<div class="rc rc--lens"><div class="rc__stage"><img src="' + R.src + '" alt="">' +
      '<span class="lens"><img src="' + R.src + '" alt="">' +
      OBJ.slice(1, 3).map(function (o) { return '<i class="rf is-on" style="--x:' + o.box[0] + '%;--y:' + o.box[1] + '%;--w:' + o.box[2] + '%;--h:' + o.box[3] + '%"></i>'; }).join('') +
      '</span><span class="rc__count">под пальцем: 2 из 4 · ' + F.rub(price(OBJ[1]) + price(OBJ[2])) + '</span></div>' +
      '<div class="rc__body"><b class="rc__t">Прижмите палец — кадр просветится</b>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Разобрать кадр</a></div></div>';
  }

  /* 12 — разбор сохранённого */
  function i12() {
    var caps = D.capsules.filter(function (c) { return !c.soon && c.slides && c.slides.length; }).slice(0, 3);
    return '<div class="rc"><div class="rc__body"><b class="rc__t">Выберите кадр — соберём смету</b></div>' +
      '<div class="rlane"><label class="rlane__own"><input type="file" accept="image/*" hidden><b>Из моей галереи</b><span>фото или рендер</span></label>' +
      caps.map(function (c) { return '<a class="rlane__i" href="ai.html?mode=render"><img src="' + c.slides[0].src + '" alt=""><span>' + esc(c.code) + '</span></a>'; }).join('') +
      '</div></div>';
  }

  /* 13 — один предмет бесплатно */
  function i13() {
    var p = D.product(OBJ[1].items[0].id);
    return '<div class="rc rc--one"><div class="rc__stage"><img src="' + R.src + '" alt="">' +
      '<span class="rf is-on" style="--x:' + OBJ[1].box[0] + '%;--y:' + OBJ[1].box[1] + '%;--w:' + OBJ[1].box[2] + '%;--h:' + OBJ[1].box[3] + '%"><i>1</i></span></div>' +
      '<div class="rc__body"><span class="rc__k">один предмет — бесплатно</span>' +
      '<div class="rone"><img src="' + p.img + '" alt=""><span><b>' + esc(p.name) + '</b><i>' + F.rub(p.metod) + ' <s>' + F.rub(p.retail) + '</s></i></span></div>' +
      '<span class="rc__d">в кадре ещё 3 предмета</span>' +
      '<a class="btn btn--primary btn--block" href="ai.html?mode=render">Полный разбор · 10 токенов</a></div></div>';
  }

  /* 14 — ваш разбор продолжается */
  function i14() {
    return '<div class="rc rc--cont"><div class="rc__row"><img class="rc__mini" src="' + R.src + '" alt="">' +
      '<span><b>Ваш разбор</b><i>из 24 предметов 6 уже в ремонте</i>' +
      '<span class="rbar"><em style="width:25%"></em></span></span></div>' +
      '<div class="rc__body"><a class="btn btn--primary btn--block" href="generations.html">Открыть смету</a>' +
      '<a class="btn btn--link" href="market.html">Дособрать в маркете</a></div></div>';
  }

  /* 15 — совмещённый: конверт от дизайнера + выбор кадра, обводка по контуру предметов */
  function outline(list, withPrice) {
    return '<svg class="ol" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      list.map(function (o, i) {
        return '<polygon class="ol__p" style="--i:' + i + '" points="' + o.poly + '"/>';
      }).join('') + '</svg>' +
      (withPrice ? list.map(function (o) {
        var pts = o.poly.split(' ').map(function (p) { return p.split(',').map(Number); });
        var cx = pts.reduce(function (a, p) { return a + p[0]; }, 0) / pts.length;
        var cy = pts.reduce(function (a, p) { return a + p[1]; }, 0) / pts.length;
        return '<span class="olp" style="--x:' + cx.toFixed(1) + '%;--y:' + cy.toFixed(1) + '%">' + F.rub(price(o)) + '</span>';
      }).join('') : '');
  }
  function i15() {
    var caps = D.capsules.filter(function (c) { return !c.soon && c.slides && c.slides.length; }).slice(0, 3);
    return '<div class="rc rc--mix">' +
      '<div class="rc__body rc__body--top"><span class="rc__k">Есть проект от дизайнера?</span>' +
      '<b class="rc__t">Принесите рендеры — проверим смету</b>' +
      '<span class="rc__d">Найдём те же вещи у партнёров и покажем, где переплата</span></div>' +
      '<div class="rc__stage rc__stage--mix"><img src="' + R.src + '" alt="">' + outline(OBJ.slice(0, 3), true) +
      '<span class="rc__count">' + OBJ.length + ' предмета · ' + F.rub(sumMetod) + ' с METOD</span></div>' +
      '<div class="rlane"><label class="rlane__own"><input type="file" accept="image/*" hidden><b>Мой рендер</b><span>из галереи или камерой</span></label>' +
      caps.map(function (c) { return '<a class="rlane__i" href="ai.html?mode=render"><img src="' + c.slides[0].src + '" alt=""><span>' + esc(c.code) + '</span></a>'; }).join('') +
      '</div>' +
      '<div class="rc__body"><a class="btn btn--primary btn--block" href="ai.html?mode=render">Проверить смету</a></div></div>';
  }

  var IDEAS = [
    [1, 'Сколько стоит этот рендер', 'Цифра вместо описания: столько стоит собрать этот кадр у партнёров.', i1],
    [2, 'Кадр разбирается сам', 'Рамки вспыхивают по очереди, счётчик набегает.', i2],
    [3, 'Конверт с проектом', 'Для тех, у кого дизайнер уже есть.', i3],
    [4, 'Рентген-полоса', 'Полосу тянут пальцем, за ней проявляются цены.', i4],
    [5, 'Примеры вместо загрузки', 'Нечего загружать — разберите чужой кадр.', i5],
    [6, 'Смета собирается на глазах', 'Строки падают одна за другой, внизу итог.', i6],
    [7, 'Проверка сметы дизайнера', 'Две колонки: у дизайнера и у нас.', i7],
    [8, 'Соберите такой же', 'Обещание результата вместо описания функции.', i8],
    [9, 'Оглавление кадра', 'Язык сметы: точечные линейки и табличные цифры.', i9],
    [10, 'Калька с выносками', 'Кадр, размеченный от руки, как у дизайнера.', i10],
    [11, 'Лупа под пальцем', 'Прижал палец — кадр просвечивается.', i11],
    [12, 'Разбор сохранённого', 'Запуск прямо с главной, в один тап.', i12],
    [13, 'Один предмет бесплатно', 'Показываем формат результата до оплаты.', i13],
    [14, 'Ваш разбор продолжается', 'Для повторных заходов: вернуться в смету.', i14],
    [15, '12 + 3: конверт и выбор кадра', 'Совмещено: рендеры от дизайнера, выбор кадра и обводка по контуру предметов.', i15]
  ];

  root.innerHTML = IDEAS.map(function (x) { return wrap(x[0], x[1], x[2], x[3]()); }).join('');
})();
