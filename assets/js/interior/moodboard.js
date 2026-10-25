/* moodboard(slots, dna, {zones, label, selected, height, corner}) — corner: разметка в правый верхний угол доски (уровень База / Премиум); — мудборд 366×520 (ТЗ Интерьера, 6.4; эталон etalon-B1, приём Mattoboard):
   фон-штукатурка 700px с виньеткой, 8 образцов внахлёст (фото-вырезки sw/ — реальные образцы, повороты −3…+3°, номера 1–8)
   и 2 малярные выкраски краски; внизу слева «ВСЯ КВАРТИРА · 12 МАТЕРИАЛОВ · ПРЕМИУМ». Показываются только материалы выбранной зоны
   (rooms[] слота). Тап по образцу — data-slot (экран открывает шторку замены). Зона шире 10 материалов — остальные в списке ниже. */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};

  /* места — как на эталоне B1: x, y, ширина, высота лица, поворот */
  var BIG = [[22, 30, 112, 232, -2], [114, 76, 92, 222, 2], [218, 40, 52, 160, 0], [282, 66, 64, 244, 1],
    [144, 300, 96, 88, -1], [228, 324, 80, 72, 2], [34, 310, 92, 92, 3], [292, 360, 50, 114, 0]];
  var SMALL = [[136, 424, 66, 52, -2], [206, 440, 52, 42, 3]];
  /* доска 400 px экрана «Материалы» (эталон etalon-final-3): 7 мест, малярных выкрасок нет */
  var BIG400 = [[20, 30, 110, 230, -2], [112, 70, 90, 220, 2], [214, 36, 52, 150, 0], [276, 60, 62, 230, 1], [140, 300, 94, 86, -1], [236, 316, 78, 70, 2], [30, 300, 92, 92, 3]];
  /* кто куда: крупные места — фото-образцы по убыванию «веса» на доске; малярные выкраски — стены и акцент */
  var PRIORITY = ['apron', 'floor', 'light', 'plumbing', 'bathWalls', 'doors', 'floorTile', 'hardware', 'ceiling', 'moldings', 'walls', 'accentWall'];
  var PAINT = ['walls', 'accentWall'];
  UI.MOOD_PRIORITY = PRIORITY;

  UI.moodboard = function (slots, dna, o) {
    o = o || {};
    var KB = window.SOVE_KB, esc = window.SOVE.fmt.esc, keys = KB.slotsFor(o.zones).map(function (s) { return s.key; });
    var f4 = o.height === 400, PL = f4 ? BIG400 : BIG;
    var small = f4 ? [] : PAINT.filter(function (k) { return keys.indexOf(k) >= 0; }).slice(0, 2);
    var big = PRIORITY.filter(function (k) { return keys.indexOf(k) >= 0 && small.indexOf(k) < 0; }).slice(0, PL.length);
    function tile(key, p, num) {
      var s = KB.slot(key), e = slots[key], it = e && KB.item(e.sku); if (!it) return '';
      var t = UI.sampleTile(it, p[2], p[3], { rot: p[4], thickness: 5, num: num, flag: e.ok === false, selected: o.selected === key });
      /* data-tip — подпись при наведении: «Пол · заменить» */
      return '<button type="button" class="mb-tile" data-slot="' + key + '" data-tip="' + esc((UI.slotShort ? UI.slotShort(key) : s.name) + ' · заменить ⇄') + '" style="left:' + p[0] + 'px;top:' + p[1] + 'px" aria-label="' +
        esc((num ? num + '. ' : '') + s.name + ' — ' + it.name + (e.ok === false ? ', выбивается: ' + e.reason : '') + '. Заменить') + '">' + t + '</button>';
    }
    var html = big.map(function (k, i) { return tile(k, PL[i], f4 ? null : i + 1); }).join('') + small.map(function (k, i) { return tile(k, SMALL[i], null); }).join('');
    /* .mb__in — слой 366 px по центру: координаты образцов совпадают с эталоном при любой ширине колонки */
    return '<div class="mb mb--b"' + (o.height ? ' style="height:' + o.height + 'px"' : '') + '><div class="mb__in">' + html +
      '<small class="mb__t' + (f4 ? ' mb__t--top' : '') + '">' + esc(String(o.label || '').toUpperCase()) + '</small></div>' + (o.corner || '') + '</div>';
  };
})();
