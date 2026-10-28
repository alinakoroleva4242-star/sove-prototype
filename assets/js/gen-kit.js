/* Генерации — общие кусочки экранов «Генерации» по референсам Вики 23.10:
   линейные иконки, бюджет капсулы на площадь (та же формула, что на главной и в расчёте), площадь квартиры. */
(function () {
  var S = window.SOVE, D = S.data;
  var P = {
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    plan: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M3.5 12h7v8.5M10.5 3.5V8M14 12h6.5M14 12v3"/>',
    swap: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    sparkles: '<path d="M10 3l1.7 4.8L16.5 9.5l-4.8 1.7L10 16l-1.7-4.8L3.5 9.5l4.8-1.7z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>',
    sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 17v2M19 17v2"/>',
    sliders: '<path d="M5 4v6M5 14v6M12 4v3M12 11v9M19 4v9M19 17v3"/><path d="M3 10h4M10 7h4M17 13h4"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10.5" r="1.8"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    bars: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.6L20.5 7H6.6"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    crown: '<path d="M4 18h16M5 15l-1-8 5 4 3-6 3 6 5-4-1 8z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    drop: '<path d="M12 3.5c3 3.6 5.5 6.6 5.5 10a5.5 5.5 0 0 1-11 0c0-3.4 2.5-6.4 5.5-10z"/>',
    hanger: '<path d="M12 7.5a2 2 0 1 1 2-2M12 7.5v1.5L3.5 15.5a1.2 1.2 0 0 0 .8 2.1h15.4a1.2 1.2 0 0 0 .8-2.1L12 9"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M9 12h6"/>',
    wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 7l11-3v3M16 13.5h2"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9zM12 9c1.5-3 5-3.5 5-1.5S14 9 12 9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4.2-5.3 7.5-5.3s6.2 1.7 7.5 5.3"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17v.4"/>',
    case: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
    box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'
  };
  function ic(n, s) {
    return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + (P[n] || '') + '</svg>';
  }
  var rates = D.scout.states.map(function (x) { return x.rate; });
  var minRate = Math.min.apply(null, rates), maxRate = Math.max.apply(null, rates);
  function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
  /* бюджет ремонта в капсуле: работы (от лёгкого до тяжёлого состояния) + комплектация по ценам METOD */
  function budget(c, area) {
    var lo = (minRate + c.pricePerM2) * area, hi = (maxRate + c.pricePerM2) * area;
    return { lo: lo, hi: hi, text: mln(lo) + '–' + mln(hi) + ' млн ₽' };
  }
  function area() { var a = Number((S.my && S.my.get().area) || 0); return a > 0 ? a : 45; }
  var TAGS = { light: 'Светлые', modern: 'Современные', warm: 'Тёплые', classic: 'Классика' };
  function dots(c, cls) {
    return '<span class="' + (cls || 'gk-dots') + '" aria-label="Палитра капсулы">' + (c.palette || []).map(function (h) { return '<i style="background:' + h + '"></i>'; }).join('') + '</span>';
  }
  function pos(c, src) { return c && c.widePos && src === c.wide ? ' style="object-position:' + c.widePos + '"' : ''; }
  window.SOVE_GEN = { ic: ic, budget: budget, mln: mln, area: area, TAGS: TAGS, dots: dots, pos: pos };
})();
