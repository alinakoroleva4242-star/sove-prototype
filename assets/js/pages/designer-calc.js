/* Формулы количества — из «WEB · Калькулятор MOD» (листы «Калькулятор 4», «Отделка», «Освещение», «Выключатели и розетки»,
   «Сантехника и оборудование», «Техника», «Мебель_покупная», «Мебель заказная», «Двери и перегородки», «Текстиль и декор»), 13.11.
   Коэффициенты — из строк «Проект 1» (К1). У других капсул в калькуляторе свои строки и могут быть свои коэффициенты — пока берём К1.

   Входные данные квартиры (лист «Калькулятор 4»):
     S — площадь, м²;  P — погонный метр = S / 3;  стены: База 3 × S, Премиум 3,2 × S;
     тип квартиры t = 1 Студия · 2 Евро-2 · 3 Евро-3 · 4 Евро-4 · 5 Евро-5 (= «Кол-во помещений»);  B — санузлов.
   Округление как в калькуляторе: ROUNDUP — до целого, у плитки, столешницы, карнизов и плинтуса — до 0,1. */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  function up(x, d) { var k = Math.pow(10, d || 0); return Math.ceil(x * k - 1e-9) / k; }
  function byT(arr) { return function (c) { return arr[c.t - 1] || 0; }; }
  var bedrooms = function (c) { return Math.max(0, c.t - 1); }, bedroomsMin1 = function (c) { return Math.max(1, c.t - 1); };

  /* area — формула на всю квартиру; per — штуки в каждой зоне материала (функция от зоны) */
  var F = {
    walls:           { area: function (c) { return up(0.5 * c.walls); },              txt: '0,5 × площадь стен' },
    tech_paint:      { area: function (c) { return up(0.35 * c.walls); },             txt: '0,35 × площадь стен' },
    accent_wall:     { area: function (c) { return up(0.05 * c.walls); },             txt: '0,05 × площадь стен' },
    floor:           { area: function (c) { return up(0.7 * c.S); },                  txt: '0,7 × площадь' },
    floor_tile:      { area: function (c) { return up((c.walls + c.S) * 0.06, 1); },  txt: '0,06 × (стены + площадь)' },
    bath_walls:      { area: function (c) { return up((c.walls + c.S) * 0.06, 1); },  txt: '0,06 × (стены + площадь)' },
    backsplash:      { area: function (c) { return up((c.walls + c.S) * 0.06, 1); },  txt: '0,06 × (стены + площадь)' },
    grout:           { area: function (c) { return up(0.1 * c.S); },                  txt: '0,1 × площадь' },
    countertop:      { area: function (c) { return up(0.47 * c.P, 1); },              txt: '0,47 × погонный метр' },
    ceiling_cornice: { area: function (c) { return up(3.2 * c.P, 1); },               txt: '3,2 × погонный метр' },
    baseboard:       { area: function (c) { return up(1.2 * c.P, 1); },               txt: '1,2 × погонный метр' },
    e_cornice:       { area: function (c) { return c.lv === 'premium' ? c.t : 0; },  txt: 'Премиум — по числу комнат, База — нет' },
    mirror_custom:   { area: function () { return 1; },                                txt: '1 на квартиру' },
    recessed:        { area: function (c) { return up(0.44 * c.S); },                 txt: '0,44 × площадь' },
    recessed_wet:    { area: function (c) { return up(0.08 * c.S); },                 txt: '0,08 × площадь' },
    island_light:    { area: byT([0, 2, 2, 2, 2]),                                     txt: 'Студия 0, Евро-2…5 — 2' },
    sockets:         { area: function (c) { return up(0.45 * c.S + 8); },             txt: '0,45 × площадь + 8' },
    switches:        { area: function (c) { return up(0.065 * c.S) + up(0.07 * c.S) + up(0.05 * c.S); }, txt: '(0,065 + 0,07 + 0,05) × площадь' },
    pass_switches:   { area: function (c) { return up(0.0075 * c.S) + up(0.03 * c.S) + up(0.02 * c.S) + up(0.0035 * c.S); }, txt: '(0,0075 + 0,03 + 0,02 + 0,0035) × площадь' },
    low_current:     { area: function (c) { return up(0.1 * c.S) + up(0.0045 * c.S) + 1; }, txt: '(0,1 + 0,0045) × площадь + 1 ТВ' },
    thermostat:      { area: function () { return 1; },                                txt: '1 на квартиру' },
    frames:          { area: function (c) { return frames(c); },                       txt: 'по числу механизмов: 1–5 постов в долях 0,5 / 0,3 / 0,15 / 0,4 / 0,1' },
    kitchen_set:     { area: function (c) { return up(0.25 * c.P, 1); },              txt: '0,25 × погонный метр' },
    wardrobe:        { area: function (c) { return up(0.5 * c.P, 1); },               txt: '0,5 × погонный метр' },
    bath_cabinet:    { area: function (c) { return up(0.125 * c.P * c.B, 1); },       txt: '0,125 × погонный метр × санузлы' }, /* Алина 13.11: второй санузел — вторая тумба; в калькуляторе множителя нет */
    tv_zone:         { area: function (c) { return up(0.125 * c.P, 1); },             txt: '0,125 × погонный метр' },
    door:            { area: function (c) { return c.B + (c.t - 1); },                txt: 'санузлы + (тип квартиры − 1)' },
    door_hw:         { area: function (c) { return c.B + (c.t - 1) + 1; },            txt: 'двери + двустворчатая' },
    double_door:     { area: function () { return 1; },                                txt: '1 на квартиру' },
    glass_partition: { area: byT([1, 0, 1, 2, 3]),                                     txt: 'Студия 1, Евро-2 0, Евро-3 1, Евро-4 2, Евро-5 3' },
    fridge: { area: function () { return 1; }, txt: '1' }, dishwasher: { area: function () { return 1; }, txt: '1 — 45 см до Евро-2, 60 см с Евро-3' },
    oven: { area: function () { return 1; }, txt: '1 — с СВЧ от 60 м²' }, microwave: { area: function () { return 1; }, txt: '1' }, hob: { area: function () { return 1; }, txt: '1' },
    hood: { area: function () { return 1; }, txt: '1' }, washer: { area: function () { return 1; }, txt: '1' }, tv: { area: function () { return 1; }, txt: '1 — 43" до 40 м², 50" до 60 м², 55" больше' },
    kitchen_sink: { area: function () { return 1; }, txt: '1' }, kitchen_mixer: { area: function () { return 1; }, txt: '1' },
    sofa: { area: function () { return 1; }, txt: '1 — размер по типу квартиры' }, coffee_table: { area: function () { return 1; }, txt: '1' }, tv_stand: { area: function () { return 1; }, txt: '1' },
    armchair: { area: byT([0, 1, 1, 1, 1]), txt: 'Студия 0, Евро-2…5 — 1' }, dining_table: { area: byT([0, 0, 1, 1, 1]), txt: 'Студия и Евро-2 — 0, с Евро-3 — 1 (d80, с Евро-4 d120)' },
    chairs: { area: byT([0, 0, 4, 4, 4]), txt: 'Студия и Евро-2 — 0, с Евро-3 — 4' }, bar_stools: { area: byT([0, 2, 2, 2, 2]), txt: 'Студия 0, Евро-2…5 — 2' },
    console: { area: byT([0, 1, 1, 1, 1]), txt: 'Студия 0, Евро-2…5 — 1' }, curtains: { area: function () { return 1; }, txt: '1 комплект — по площади 20–30 … 100–120 м²' },
    painting: { area: function () { return 1; }, txt: '1' },
    /* штуки по зонам */
    chandelier: { per: function (c, room) { return room === 'Спальня' ? bedrooms(c) : room === 'Санузел' ? c.B : 1; }, txt: 'гостиная 1, спальни — по числу спален, санузел — по числу санузлов' },
    sconce:     { per: function (c, room) { return room === 'Санузел' ? 2 * c.B : room === 'Гостиная' ? 2 : 1; }, txt: 'санузел 2 × санузлы, гостиная 2, прихожая 1' },
    floor_lamp: { per: function (c, room) { return room === 'Спальня' ? (c.t > 1 ? 1 : 0) : 1; }, txt: 'гостиная 1, спальня 1 (в студии 0)' },
    table_lamp: { per: function (c, room) { return room === 'Спальня' ? bedroomsMin1(c) : 1; }, txt: 'по числу спален, в студии 1' },
    bed:        { per: function (c) { return bedroomsMin1(c); }, txt: 'по числу спален, в студии 1' },
    bedside:    { per: function (c) { return bedroomsMin1(c); }, txt: 'по числу спален, в студии 1' },
    pouf:       { per: function (c, room) { return room === 'Прихожая' ? (c.S < 60 ? 1 : 2) : room === 'Спальня' ? [0, 1, 2, 3, 3][c.t - 1] : 1; }, txt: 'прихожая 1 (от 60 м² — 2), спальня 0/1/2/3/3 по типу квартиры' },
    rug:        { per: function (c) { return c.t > 1 ? 1 : 0; }, txt: 'по 1 в зоне, в студии 0' },
    blinds:     { per: function () { return 1; }, txt: '1 в зоне' }
  };
  /* сантехника санузла — на каждый санузел */
  ['bathtub', 'shower', 'shower_screen', 'drain', 'toilet', 'installation', 'flush', 'basin', 'basin_mixer', 'vanity', 'bath_mirror', 'hygienic', 'towel_warmer'].forEach(function (k) { F[k] = { area: function (c) { return c.B; }, txt: 'по числу санузлов' }; });

  function frames(c) {
    var M = F.sockets.area(c) + F.switches.area(c) + F.pass_switches.area(c) + F.low_current.area(c) + 1, sh = [0.5, 0.3, 0.15, 0.4, 0.1], tot = 1.45;
    var f2 = Math.floor(sh[1] / tot * M / 2), f3 = Math.floor(sh[2] / tot * M / 3), f4 = Math.floor(sh[3] / tot * M / 4), f5 = Math.floor(sh[4] / tot * M / 5);
    return M - (2 * f2 + 3 * f3 + 4 * f4 + 5 * f5) + f2 + f3 + f4 + f5;
  }

  /* квартира для расчёта: из планировки или эталон (Евро-2, 45 м²) */
  DC.calcCtx = function (code, level, flat) {
    var pl = DC.matPlan ? DC.matPlan(code) : { area: 45, rooms: [] }, rooms = pl.rooms || [];
    var bed = rooms.filter(function (r) { return r.type === 'Спальня' || r.type === 'Детская' || r.type === 'Кабинет'; }).length, bath = rooms.filter(function (r) { return r.type === 'Санузел'; }).length;
    var T = { studio: 1, k1: 2, k2: 3, k3: 4, k4: 5 }, t = flat && T[flat] ? T[flat] : Math.min(5, Math.max(1, bed + 1));
    var S = flat ? ({ 1: 30, 2: 45, 3: 65, 4: 90, 5: 110 })[t] : Number(pl.area) || 45, lv = level === 'премиум' || level === 'premium' ? 'premium' : 'base';
    return { S: S, P: S / 3, walls: (lv === 'premium' ? 3.2 : 3) * S, t: t, B: Math.max(1, flat ? (t >= 4 ? 2 : 1) : bath), lv: lv, real: !!pl.real && !flat };
  };
  DC.calcHas = function (pos) { return !!F[pos]; };
  /* позиции, у которых по калькулятору от ТИПА квартиры меняется число штук (а не от площади) */
  /* сантехника санузла — по числу санузлов (в калькуляторе «Кол-во санузлов»); у типов квартир по умолчанию: до Евро-3 — 1, Евро-4 и Евро-5 — 2 (ДОПУЩЕНИЕ, в калькуляторе это отдельный ввод) */
  var BY_TYPE = { bath_cabinet: 1, bathtub: 1, shower: 1, shower_screen: 1, drain: 1, toilet: 1, installation: 1, flush: 1, basin: 1, basin_mixer: 1, vanity: 1, bath_mirror: 1, hygienic: 1, towel_warmer: 1, island_light: 1, armchair: 1, dining_table: 1, chairs: 1, bar_stools: 1, console: 1, chandelier: 1, table_lamp: 1, floor_lamp: 1, bed: 1, bedside: 1, pouf: 1, rug: 1, door: 1, door_hw: 1, glass_partition: 1, e_cornice: 1 };
  DC.calcByType = function (pos) { return !!BY_TYPE[pos]; };
  /* количество материала на квартиру и по зонам. zones: [{room, share}]; доля зоны умножает только «площадные» формулы */
  DC.calcQty = function (pos, zones, ctx) {
    var f = F[pos]; if (!f) return null;
    zones = zones && zones.length ? zones : [{ room: '', share: 1 }];
    if (f.per) { var by = {}, tot = 0; zones.forEach(function (z) { var q = f.per(ctx, z.room); by[z.room] = q; tot += q; }); return { q: tot, by: by, txt: f.txt }; }
    var total = f.area(ctx), sh = zones.reduce(function (s, z) { return s + (z.share || 1); }, 0), by2 = {};
    /* формула — на всю квартиру; если материал стоит в части зон с долями, делим поровну на зоны с учётом доли */
    zones.forEach(function (z) { by2[z.room] = sh ? total * (z.share || 1) / sh : 0; });
    return { q: total, by: by2, txt: f.txt };
  };
  DC.calcInputs = function (ctx) { return 'площадь ' + DC.ruNum(Math.round(ctx.S * 10) / 10) + ' м² · стены ' + DC.ruNum(Math.round(ctx.walls)) + ' м² · погонный метр ' + DC.ruNum(Math.round(ctx.P * 10) / 10) + ' · ' + ['Студия', 'Евро-2', 'Евро-3', 'Евро-4', 'Евро-5'][ctx.t - 1] + ' · санузлов ' + ctx.B; };
})();
