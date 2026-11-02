/* Продавцы товара: один бренд — несколько складов (Таня 29.10: «это должен быть единый DECARO, но как у нас есть
   зона доставки, с какого склада — выбрать одного или другого продавца»).
   SOVE.sellers.canon(brand)  — единое имя бренда: DECARO СПБ / DECARO МСК / Decaro → «DECARO»
   SOVE.sellers.variants(brand) — исходные написания бренда в каталоге (для поиска brand_in), у обычных брендов — null
   SOVE.sellers.list(product) → [{id, name, city, delivery, priceDelta, note, metod}] — продавцы товара (у обычного товара один = бренд)
   SOVE.sellers.chosen(product) — выбранный продавец (запомненный по товару или по умолчанию: товар DECARO СПБ — склад СПб)
   SOVE.sellers.pick(product) — продавец для строки корзины: выбранный, если продавцов ≥ 2; иначе null (группа по бренду, как раньше)
   Подключать после data.js / site.js и до catalog-api.js. Выбор хранится в этом браузере (sove.sellers.v1). */
(function () {
  var S = window.SOVE || (window.SOVE = {});
  var KEY = 'sove.sellers.v1';

  /* бренды с несколькими складами-продавцами. Пример до данных реестра партнёров: склады и доставка — по реестру
     (DECARO МСК — «По всей РФ», DECARO СПБ — отдельный контакт), цены у складов одинаковые — так решено 29.10 */
  var MULTI = {
    DECARO: {
      name: 'DECARO',
      aliases: ['DECARO', 'DECARO СПБ', 'DECARO МСК', 'Decaro'],
      sellers: [
        { id: 'decaro-msk', name: 'DECARO · Москва', city: 'Москва', delivery: 'Доставка по всей России', priceDelta: 0, note: 'пример до данных реестра', raw: ['DECARO', 'DECARO МСК'] },
        { id: 'decaro-spb', name: 'DECARO · Санкт-Петербург', city: 'Санкт-Петербург', delivery: 'Санкт-Петербург и ЛО', priceDelta: 0, note: 'пример до данных реестра', raw: ['DECARO СПБ'] }
      ]
    }
  };

  /* один бренд под разными написаниями в каталоге, продавец один (Лера 30.10: склеить, как DECARO) —
     поиск по всем написаниям (brand_in), на витрине и в акциях одно имя */
  var SAME = {
    'Schneider Electric': ['Schneider Electric', 'SCHNEIDER ELECTRIC', 'SHNIEDER', 'SCHNEIDER-PRO', 'Schneider'],
    'KUPPERSBUSCH': ['KUPPERSBUSCH', 'KUPPERSBUSH', 'Kuppersbusch'],
    'ORAC DECOR': ['ORAC DECOR', 'ORAC DECOR АКЦИЯ', 'Orac Decor', 'Orac Decor акция', 'OracDecor']
  };
  function key(b) { return String(b || '').toUpperCase().replace(/Ё/g, 'Е').replace(/[^A-ZА-Я0-9]+/g, ''); }
  var SAME_BY = {};
  Object.keys(SAME).forEach(function (k) { SAME[k].forEach(function (a) { SAME_BY[key(a)] = k; }); });
  /* ключ бренда → запись MULTI: «DECARO СПБ» → DECAROСПБ → DECARO */
  var BY = {};
  Object.keys(MULTI).forEach(function (k) { MULTI[k].aliases.forEach(function (a) { BY[key(a)] = MULTI[k]; }); });
  function multiOf(brand) { return BY[key(brand)] || null; }

  /* единое имя бренда: сначала свой список складов, затем общий справочник партнёров (partner-cats.js), иначе как есть */
  function canon(brand) {
    var b = String(brand || '').trim(), m = multiOf(b);
    if (m) return m.name;
    if (SAME_BY[key(b)]) return SAME_BY[key(b)];
    var P = window.SOVE_PARTNERS;
    if (P && typeof P.canon === 'function') { try { var c = P.canon(b); if (c) { var mc = multiOf(c); return mc ? mc.name : String(c); } } catch (e) {} }
    return b;
  }
  function variants(brand) {
    var m = multiOf(brand) || multiOf(canon(brand));
    if (m) return m.aliases.slice();
    var sk = SAME_BY[key(brand)] || SAME_BY[key(canon(brand))];
    if (sk) return SAME[sk].slice();
    var P = window.SOVE_PARTNERS;
    if (P && typeof P.variants === 'function') { try { var v = P.variants(brand); if (v && v.length > 1) return v.slice(); } catch (e) {} }
    return null;
  }

  function rawBrand(p) { return p ? (p.brandRaw || p.brand || '') : ''; }
  function basePrice(p) { return Number(p.metod || p.retail || 0); }
  function copy(s, p) { return { id: s.id, name: s.name, city: s.city || '', delivery: s.delivery || '', priceDelta: Number(s.priceDelta) || 0, note: s.note || '', metod: basePrice(p) + (Number(s.priceDelta) || 0) }; }

  function list(p) {
    if (!p) return [];
    var m = multiOf(rawBrand(p)) || multiOf(p.brand);
    if (m) return m.sellers.map(function (s) { return copy(s, p); });
    /* примеры data.js: свои поставщики (у части товаров двое — с выбором) */
    if (p.suppliers && p.suppliers.length) return p.suppliers.map(function (s) {
      return { id: s.id, name: s.name, city: s.city || '', delivery: s.delivery || p.delivery || '', priceDelta: (Number(s.metod) || basePrice(p)) - basePrice(p), note: s.note || '', metod: Number(s.metod) || basePrice(p) };
    });
    /* обычный товар — один продавец = бренд */
    return [{ id: 's-' + p.id, name: p.brand || 'Поставщик', city: '', delivery: p.delivery || '', priceDelta: 0, note: '', metod: basePrice(p) }];
  }
  /* по умолчанию: у складского бренда — склад из исходного бренда (DECARO СПБ → СПб), иначе первый; у прочих — самый дешёвый */
  function defaultId(p) {
    var all = list(p); if (!all.length) return null;
    var m = multiOf(rawBrand(p)) || multiOf(p.brand);
    if (m) {
      var k = key(rawBrand(p)), hit = m.sellers.filter(function (s) { return (s.raw || []).some(function (r) { return key(r) === k; }); })[0];
      return (hit || m.sellers[0]).id;
    }
    return all.slice().sort(function (a, b) { return a.metod - b.metod; })[0].id;
  }
  function get(p, id) { return list(p).filter(function (s) { return s.id === id; })[0] || null; }

  /* выбор продавца по товару — в этом браузере */
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function choose(pid, id) { var st = store(); st[pid] = id; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function chosenId(p) { if (!p) return null; var id = store()[p.id]; return id && get(p, id) ? id : defaultId(p); }
  function chosen(p) { return get(p, chosenId(p)); }
  /* продавец для строки корзины и заказа: только если выбор есть (продавцов ≥ 2) */
  function pick(p) { return list(p).length > 1 ? short(chosen(p)) : null; }
  /* что кладём в строку корзины: самодостаточно — экрану корзины sellers.js не нужен */
  function short(s) { return s ? { id: s.id, name: s.name, city: s.city || '', delivery: s.delivery || '', priceDelta: Number(s.priceDelta) || 0 } : null; }

  S.sellers = { canon: canon, variants: variants, list: list, get: get, defaultId: defaultId, chosenId: chosenId, chosen: chosen, choose: choose, pick: pick, short: short, multi: function (p) { return list(p).length > 1; } };
})();
