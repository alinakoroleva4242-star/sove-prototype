/* База знаний, слой 1: капсулы SOVE (design/interior/TZ-interior.md, раздел 9).
   Капсула = ДНК (7 цветов) + 12 материалов чистовой отделки (База / Премиум) + рендеры комнат — тот же формат, что у своей капсулы человека.
   Карточки, галереи и мебель — из общих данных прототипа (data.js, SOVE.data.capsules); здесь — ДНК, обложки по эталону, слоты,
   типовые рендеры по зонам с ракурсами (rooms[{room, zone, img, angles}]) и декор (decor[] — id товаров).
   Полностью оцифрованы две: «Изумрудная неоклассика» (k2, цифры раздела 9 ТЗ v2) и «Бургундский камень» (k1 — те же артикулы
   каталога, кроме пола: своих цен у материалов k1 нет). Остальные пять — обложка + ДНК + слоты База (артикулы k2).
   Коды К1–К7 в интерфейсе не показываем. */
(function () {
  var KB = window.SOVE_KB = window.SOVE_KB || {};
  var IMG = 'assets/img/interior/', CAP = 'assets/img/capsules/';

  /* ДНК — порядок и цвета с эталона etalon-I1 (k1–k5); k6, k7 на эталоне нет — цвета подобраны по материалам капсулы в data.js */
  function dna(list) { return list.map(function (x, i) { return { hex: x[0], name: x[1], role: i < 1 ? 'accent' : i < 3 ? 'second' : i < 5 ? 'base' : 'accent', share: [10, 15, 15, 30, 20, 5, 5][i] }; }); }
  var META = {
    k1: { short: 'Бургундский камень', cover: IMG + 'k1.jpg', warm: true,
      dna: dna([['#3B2A22', 'Тёмный орех'], ['#8E2F2A', 'Бордо'], ['#C9A27E', 'Дуб светлый'], ['#E8DCCB', 'Слоновая кость'], ['#6B7A4A', 'Олива'], ['#B9AC9C', 'Тауп'], ['#2E2A27', 'Графит']]),
      slots: { floor: ['fl-lam-oak', 'fl-parq-oak'] } },
    k2: { short: 'Изумрудная неоклассика', cover: IMG + 'k2.jpg', warm: true,
      dna: dna([['#3E5440', 'Изумруд'], ['#4A2C1C', 'Орех'], ['#C49A5B', 'Латунь'], ['#E9E1D4', 'Молочный'], ['#B9AC9C', 'Тауп'], ['#5E6B3E', 'Олива'], ['#2E2A27', 'Графит']]),
      slots: {} },
    k3: { short: 'Минимализм с голубым', cover: IMG + 'k3.jpg', warm: false,
      dna: dna([['#9DB4C0', 'Голубой'], ['#D9DEE2', 'Светло-серый'], ['#B8B8B8', 'Серый'], ['#F4F2EE', 'Белый'], ['#6B7A8A', 'Сизый'], ['#E9E1D4', 'Молочный'], ['#2E2A27', 'Графит']]) },
    k4: { short: 'Тёплая классика', cover: IMG + 'k4.jpg', warm: true,
      dna: dna([['#B4613F', 'Терракота'], ['#E2C7B8', 'Пудра'], ['#7A4B32', 'Корица'], ['#F3E4DB', 'Кремовый'], ['#C49A5B', 'Латунь'], ['#B9AC9C', 'Тауп'], ['#2E2A27', 'Графит']]) },
    k5: { short: 'Органика в песочном', cover: IMG + 'k5.jpg', warm: true,
      dna: dna([['#C9B8A6', 'Песок'], ['#E8DCCB', 'Лён'], ['#8A7A66', 'Какао'], ['#F4F2EE', 'Белый'], ['#5E6B3E', 'Олива'], ['#B9AC9C', 'Тауп'], ['#2E2A27', 'Графит']]) },
    k6: { cover: CAP + 'k6-main-1.jpg', warm: true,
      dna: dna([['#5E6B3E', 'Олива'], ['#3B2A22', 'Тёмный орех'], ['#E9E1D4', 'Молочный'], ['#C49A5B', 'Латунь'], ['#B9AC9C', 'Тауп'], ['#7A8A5A', 'Шалфей'], ['#2E2A27', 'Графит']]) },
    k7: { cover: CAP + 'k7-main-1.jpg', warm: true,
      dna: dna([['#D8B98A', 'Солнечный дуб'], ['#F4F2EE', 'Белый'], ['#E9E1D4', 'Молочный'], ['#B9AC9C', 'Тауп'], ['#8A7A66', 'Какао'], ['#C9A27E', 'Дуб светлый'], ['#2E2A27', 'Графит']]) }
  };
  /* название комнаты из галереи → название комнаты квартиры (repair.js DEFAULT_ROOMS) */
  var ROOM = { 'Гостиная-кухня': 'Кухня-гостиная', 'Гостиная': 'Кухня-гостиная', 'Кухня': 'Кухня-гостиная', 'Спальня': 'Спальня', 'Санузел': 'Санузел', 'Прихожая': 'Прихожая' };

  /* типовые рендеры капсулы по зонам (ТЗ Интерьера, 7): ракурсы — из галереи капсулы (data.js), первый — слайд комнаты */
  var GAL_ZONE = { 'Гостиная': 'kitchenLiving', 'Кухня': 'kitchenLiving', 'Гостиная-кухня': 'kitchenLiving', 'Спальня': 'bedroom', 'Санузел': 'bathroom', 'Прихожая': 'hall' };
  var HERO = { k2: IMG + 'k2-kitchen.jpg', k1: IMG + 'k1-bedroom.jpg' };   /* кадры эталонов: кухня k2, спальня k1 */

  KB.CAPSULES = (window.SOVE && window.SOVE.data ? window.SOVE.data.capsules : []).filter(function (c) { return META[c.id]; }).map(function (c) {
    var m = META[c.id], full = !!m.slots;
    var slots = {};
    KB.SLOTS.forEach(function (s) {
      var o = (m.slots || {})[s.key] || [];
      slots[s.key] = { base: o[0] || KB.mainFor(s.key, 'base').sku, premium: full ? (o[1] || KB.mainFor(s.key, 'premium').sku) : null };
    });
    var rooms = [];
    (c.slides || []).forEach(function (sl) {
      var r = ROOM[sl.room]; if (!r || rooms.some(function (x) { return x.room === r; })) return;
      rooms.push({ room: r, zone: KB.zoneOf ? KB.zoneOf(r) : null, img: sl.src, angles: [sl.src] });
    });
    (c.gallery || []).forEach(function (g) {
      var z = GAL_ZONE[g.room], r = z && rooms.filter(function (x) { return x.zone === z; })[0];
      if (r && r.angles.indexOf(g.src) < 0 && r.angles.length < 3) r.angles.push(g.src);
    });
    if (HERO[c.id]) { var hz = c.id === 'k1' ? 'bedroom' : 'kitchenLiving', hr = rooms.filter(function (x) { return x.zone === hz; })[0]; if (hr) { hr.img = HERO[c.id]; hr.angles = [HERO[c.id]].concat(hr.angles.filter(function (a) { return a !== HERO[c.id]; })).slice(0, 3); } }
    /* декор капсулы — товары «Текстиль и декор» из каталога прототипа с меткой капсулы */
    var decor = (window.SOVE.data.products || []).filter(function (p) { return p.category === 'Текстиль и декор' && (p.capsules || []).indexOf(c.id) >= 0; }).map(function (p) { return p.id; });
    return { id: c.id, name: m.short || c.name, fullName: c.name, style: c.style, designer: c.designer || null, cover: m.cover || c.cover, warm: m.warm, dna: m.dna, slots: slots, full: full, rooms: rooms, decor: decor };
  });
  /* порядок ленты — как на эталонах A0 и I1: Изумрудная неоклассика первой */
  var ORDER = ['k2', 'k1', 'k3', 'k4', 'k5', 'k6', 'k7'];
  KB.CAPSULES.sort(function (a, b) { return ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
  KB.capsule = function (id) { return KB.CAPSULES.filter(function (c) { return c.id === id; })[0] || null; };
})();
