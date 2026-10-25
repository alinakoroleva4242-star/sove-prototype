/* materialsBoard(slots, dna, {height, selected, style, level}) — доска «фото-флэтлей» (ТЗ Интерьера, 4; эталон etalon-I2, вариант W1):
   366×560, фон-штукатурка 700px с виньеткой, 12 образцов внахлёст (9 фото-вырезок + 3 выкраски краски), повороты −4…+3°,
   номера 1–12, четыре подписи-выноски по углам (материал · слот · цена), внизу слева «ТЁПЛАЯ НЕОКЛАССИКА · ПРЕМИУМ».
   Тап по образцу — data-slot (экран открывает шторку замены). */
(function () {
  var UI = window.SOVE_MATUI = window.SOVE_MATUI || {};

  /* места образцов — как на эталоне: x, y, ширина, высота лица, поворот */
  var POS = {
    apron:      [24, 36, 118, 250, -2],
    floor:      [116, 86, 96, 236, 2],
    light:      [226, 44, 54, 170, 0],
    moldings:   [292, 74, 66, 260, 1],
    bathWalls:  [150, 318, 100, 92, -1],
    ceiling:    [234, 340, 80, 80, 2],
    floorTile:  [36, 330, 98, 98, 3],
    doors:      [300, 386, 52, 120, 0],
    plumbing:   [44, 432, 70, 90, -4],
    walls:      [140, 452, 70, 56, -2],
    accentWall: [214, 470, 56, 46, 3],
    hardware:   [268, 500, 34, 34, 0]
  };
  UI.BOARD_POS = POS;
  var ORDER = ['apron', 'floor', 'light', 'moldings', 'bathWalls', 'ceiling', 'floorTile', 'doors', 'plumbing', 'walls', 'accentWall', 'hardware'];
  /* выноски: слот → угол (x, y, выравнивание) */
  var CAPS = [['apron', 14, 12, 'l'], ['light', 262, 14, 'r'], ['floorTile', 14, 296, 'l'], ['plumbing', 250, 330, 'r']];
  var SHORT = { floor: 'пол', floorTile: 'плитка пола', walls: 'стены', accentWall: 'акцент', bathWalls: 'санузел', apron: 'фартук', doors: 'двери', moldings: 'плинтус', ceiling: 'потолок', plumbing: 'сантехника', light: 'свет', hardware: 'фурнитура' };
  var LEVEL_T = { base: 'БАЗА', premium: 'ПРЕМИУМ', mixed: 'СВОЁ' };

  UI.materialsBoard = function (slots, dna, o) {
    o = o || {};
    var KB = window.SOVE_KB, F = window.SOVE.fmt, esc = F.esc, H = o.height || 560;
    var tiles = ORDER.map(function (key) {
      var s = KB.slot(key), e = slots[key], it = e && KB.item(e.sku); if (!it) return '';
      var p = POS[key], shape = s.shape === 'plank' || s.shape === 'strip' ? 'rect' : s.shape;
      var tile = UI.sampleTile(it, p[2], p[3], { shape: shape, rot: p[4], num: s.num, flag: e.ok === false, selected: o.selected === key });
      return '<button type="button" class="mb-tile" data-slot="' + key + '" style="left:' + p[0] + 'px;top:' + p[1] + 'px" aria-label="' +
        esc(s.num + '. ' + s.name + ' — ' + it.name + (e.ok === false ? ', выбивается: ' + e.reason : '') + '. Заменить') + '">' + tile + '</button>';
    }).join('');
    var caps = CAPS.map(function (c) {
      var e = slots[c[0]], it = e && KB.item(e.sku); if (!it) return '';
      var price = it.unit === 'компл.' ? F.num(e.sum) : F.num(it.price) + '/' + it.unit;
      return '<span class="mb__cap mb__cap--' + c[3] + '" style="left:' + c[1] + 'px;top:' + c[2] + 'px"><b>' + esc(it.name.split(',')[0].toUpperCase()) + '</b><small>' + SHORT[c[0]] + ' · ' + price + '</small><i></i></span>';
    }).join('');
    var lv = o.level || (KB.levelOf ? KB.levelOf(slots) : 'premium');
    return '<div class="mb' + (o.cls ? ' ' + o.cls : '') + '" style="height:' + H + 'px">' + tiles + caps +
      '<small class="mb__t">' + esc(String(o.style || KB.STYLE).toUpperCase()) + ' · ' + LEVEL_T[lv] + '</small></div>';
  };
})();
