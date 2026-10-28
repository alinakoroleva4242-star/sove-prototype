/* Чертёж плана в DXF (R12, метры) — открывается в CADCraft и AutoCAD (проверено cadcraft-cli info / convert).
   Слои: ROOMS — контуры комнат (Г-образные — одним контуром), LABELS — название, площадь и размеры,
   DOORS / WINDOWS — проёмы. Кириллица — \U+XXXX, как пишет сам AutoCAD.
   SOVE_DXF.text(vol) → строка DXF; SOVE_DXF.download(vol, имя) — скачать файл. */
(function () {
  function u(t) { return String(t).replace(/[^\x20-\x7e]/g, function (c) { return '\\U+' + ('0000' + c.charCodeAt(0).toString(16).toUpperCase()).slice(-4); }); }
  function n(v) { return String(Math.round(v * 1000) / 1000); }
  function ru(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
  function poly(pts, layer) {
    var s = '0\nPOLYLINE\n8\n' + layer + '\n66\n1\n70\n1\n10\n0\n20\n0\n30\n0\n';
    pts.forEach(function (p) { s += '0\nVERTEX\n8\n' + layer + '\n10\n' + n(p[0]) + '\n20\n' + n(p[1]) + '\n30\n0\n'; });
    return s + '0\nSEQEND\n8\n' + layer + '\n';
  }
  function text(x, y, t, h) {
    return '0\nTEXT\n8\nLABELS\n10\n' + n(x) + '\n20\n' + n(y) + '\n30\n0\n40\n' + n(h) + '\n1\n' + u(t) + '\n72\n1\n11\n' + n(x) + '\n21\n' + n(y) + '\n31\n0\n';
  }
  function rect(b, k, top, layer) { return poly([[b[0] / k, top - b[1] / k], [b[2] / k, top - b[1] / k], [b[2] / k, top - b[3] / k], [b[0] / k, top - b[3] / k]], layer); }

  function dxfText(V) {
    if (!V || !V.rooms || !V.rooms.length || !window.SOVE_VOLUMES) return null;
    var k = V.ppm, tol = 0.15 * k, top = 0;
    V.rooms.forEach(function (r) { [r.box].concat(r.parts || []).forEach(function (b) { top = Math.max(top, b[1] / k, b[3] / k); }); });
    var body = '';
    V.rooms.forEach(function (r) {
      var pts = window.SOVE_VOLUMES.outline([r.box].concat(r.parts || []), tol);
      if (pts.length >= 3) body += poly(pts.map(function (p) { return [p[0] / k, top - p[1] / k]; }), 'ROOMS');
      var b = r.box, cx = (b[0] + b[2]) / 2 / k, cy = top - (b[1] + b[3]) / 2 / k, w = Math.abs(b[2] - b[0]) / k, d = Math.abs(b[3] - b[1]) / k;
      var hgt = Math.max(0.12, Math.min(0.25, Math.min(w, d) / 8));
      body += text(cx, cy + hgt * 0.8, r.name + ' ' + ru(r.m2) + ' м²', hgt) + text(cx, cy - hgt * 0.9, ru(w) + ' × ' + ru(d) + ' м', hgt * 0.8);
    });
    /* дверь — тонкая отметка шириной с проём посередине зоны прохода (зона в рамке плана — это место для открывания) */
    (V.doors || []).forEach(function (d) {
      if (!d.at) return;
      var half = d.width * k / 2, th = 0.06 * k, c = d.at;
      var b = d.axis === 'x' ? [c[0] - half, c[1] - th, c[0] + half, c[1] + th] : [c[0] - th, c[1] - half, c[0] + th, c[1] + half];
      body += rect(b, k, top, 'DOORS');
    });
    (V.windows || []).forEach(function (w) { if (w.box) body += rect(w.box, k, top, 'WINDOWS'); });
    return '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n' +
      '0\nSECTION\n2\nENTITIES\n' + body + '0\nENDSEC\n0\nEOF\n';
  }
  function download(V, name) {
    var t = dxfText(V); if (!t) return false;
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([t], { type: 'application/dxf' }));
    a.href = url; a.download = (name || 'SOVEAPP_план') + '.dxf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return true;
  }
  window.SOVE_DXF = { text: dxfText, download: download };
})();
