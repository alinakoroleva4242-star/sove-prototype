/* 3D-вид квартиры для блока «Планировка» (ТЗ-planirovka, правки 13:40, п. 1): после чтения плана
   квартира сразу в 3D — стены из разметки, полы по типу комнаты, мебель объёмом. Вид — как
   design/planirovka/img/g-domik.jpg: сверху с лёгким наклоном, тёмные срезы стен, деревянный пол.
   Данные те же, что у 2D-расстановки: рамки в пикселях плана [x1, y1, x2, y2] и px_per_m.
   three.js r128 подключается страницей — своя копия assets/js/vendor/three.min.js (MIT): на сервере демо CSP пускает только свои скрипты. Один вид = один WebGL-контекст: экран держит
   объект вида и переставляет его холст при перерисовке, а не создаёт новый. */
(function () {
  var T = window.THREE;
  var WALL_H = 0.95, SILL_H = 0.45;                         /* срез стен ниже потолка — видно комнаты */
  /* «стандартный домик» (Алина 24.10): пока интерьер не выбран — белый макет в изометрии, стены 2,7 м,
     как в design/planirovka/fx (эффект 1). С выбором интерьера — цвет интерьера (фото-рендер или 3D) */
  var CLAY_H = 2.7, CLAY_SILL = 0.85, CLAY = 0xFFFFFF;
  function isClay(o) { return o.style !== 'interior' && !o.photo; }

  /* ── текстуры полов: рисуем на холсте, без файлов ── */
  var texCache = {};
  function canvasTex(key, draw, rep) {
    if (texCache[key]) return texCache[key];
    var c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d'));
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; t.encoding = T.sRGBEncoding; t.userData = { rep: rep };
    return (texCache[key] = t);
  }
  /* пол в цвете интерьера: оттенок и светлота дерева из палитры капсулы */
  function woodTex(f) {
    f = f || { h: 22, s: 32, l: 22 };
    return canvasTex('wood:' + f.h + ':' + f.s + ':' + f.l, function (g) {
      g.fillStyle = 'hsl(' + f.h + ',' + f.s + '%,' + (f.l - 6) + '%)'; g.fillRect(0, 0, 256, 256);
      /* ёлочка: дощечки 16×64 под 45° */
      g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.translate(-256, -256);
      for (var y = 0; y < 512; y += 16) for (var x = 0; x < 512; x += 64) {
        var off = (y / 16) % 2 ? 32 : 0, l = f.l + Math.floor(Math.random() * 12);
        g.fillStyle = 'hsl(' + (f.h + Math.random() * 6) + ',' + (f.s + Math.random() * 10) + '%,' + l + '%)';
        g.fillRect(x + off, y, 63, 15);
      }
      g.restore();
    }, 1.6);
  }
  function tileTex() {
    return canvasTex('tile', function (g) {
      g.fillStyle = '#e9e6e1'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#cfcac3'; g.lineWidth = 3;
      for (var i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    }, 1.2);
  }
  /* интерьер не выбран — план нейтральный: светло-серый пол без цвета капсулы (эталоны A3, A5а) */
  function grayWoodTex() {
    return canvasTex('wood-gray', function (g) {
      g.fillStyle = '#cfcbc6'; g.fillRect(0, 0, 256, 256);
      g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.translate(-256, -256);
      for (var y = 0; y < 512; y += 16) for (var x = 0; x < 512; x += 64) {
        var off = (y / 16) % 2 ? 32 : 0; g.fillStyle = 'hsl(30,4%,' + (74 + Math.random() * 8) + '%)'; g.fillRect(x + off, y, 63, 15);
      }
      g.restore();
    }, 1.6);
  }
  function floorMat(type, name, neutral, pal) {
    var n = String(type || name || '').toLowerCase();
    var t = /сан|ванн|туал|душ/.test(n) ? tileTex() : /балкон|лодж/.test(n) ? tileTex() : neutral ? grayWoodTex() : woodTex(pal && pal.floor);
    return new T.MeshStandardMaterial({ map: t, roughness: .85, metalness: 0 });
  }

  /* ── мебель: высота и цвет по названию ── */
  /* высокое срезаем по высоте стен (вид-разрез, как в эталоне): иначе шкаф закрывает перегородки */
  var HEIGHT = [[/шкаф|гардероб|пенал|холодильн|колонна|стеллаж/, .9], [/кроват/, .5], [/диван|кресл/, .75], [/обед|стол|рабоч/, .75],
    [/тумб|комод/, .5], [/мойк|плит|варочн|посудом|углов|модул|кухн/, .9], [/унитаз/, .45], [/ванна|душ/, .6], [/раковин/, .85],
    [/тв|телевиз/, .5], [/сушит/, .9]];
  var HEIGHT_FULL = [[/шкаф|гардероб|пенал|холодильн|колонна|стеллаж/, 2.1], [/душ/, 2.0]];
  function HEIGHT_REAL(label) { var l = String(label || '').toLowerCase(); for (var i = 0; i < HEIGHT_FULL.length; i++) if (HEIGHT_FULL[i][0].test(l)) return HEIGHT_FULL[i][1]; return heightOf(label); }
  function heightOf(label) { var l = String(label || '').toLowerCase(); for (var i = 0; i < HEIGHT.length; i++) if (HEIGHT[i][0].test(l)) return HEIGHT[i][1]; return .6; }
  /* палитры интерьера: ткань, дерево, акцент; без интерьера — серые габариты */
  var PALETTE = {
    k2: { soft: '#2f5d50', wood: '#5a3d2b', light: '#e9e4dc', metal: '#b08d57', floor: { h: 22, s: 32, l: 22 } },
    k1: { soft: '#6d2330', wood: '#3b2a22', light: '#ece6df', metal: '#b08d57', floor: { h: 18, s: 30, l: 18 } },
    k3: { soft: '#8fb3cc', wood: '#cfc7bd', light: '#f2f2f0', metal: '#c0c4c8', floor: { h: 32, s: 18, l: 66 } },
    k4: { soft: '#a8553a', wood: '#7a5236', light: '#efe6da', metal: '#b08d57', floor: { h: 26, s: 36, l: 36 } },
    k5: { soft: '#c9b79a', wood: '#a88560', light: '#f1ebe1', metal: '#9b8a72', floor: { h: 34, s: 30, l: 58 } },
    own: { soft: '#7d7368', wood: '#6b5444', light: '#ece7e0', metal: '#a59a8c', floor: { h: 28, s: 22, l: 40 } }
  };
  function colorOf(label, pal) {
    var l = String(label || '').toLowerCase();
    if (/кроват|диван|кресл|пуф/.test(l)) return pal.soft;
    if (/унитаз|раковин|ванна|душ|мойк|холодильн|посудом|стирк|сушит/.test(l)) return pal.light;
    if (/тв|телевиз/.test(l)) return '#1f1f1f';
    return pal.wood;
  }

  function View(host, opts) {
    this.host = host; this.opts = {}; this.yaw = 0; this.tilt = .28; this.zoom = 1;
    this.wrap = document.createElement('div'); this.wrap.className = 'p3d';
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputEncoding = T.sRGBEncoding;
    this.wrap.appendChild(this.renderer.domElement);
    this.labels = document.createElement('div'); this.labels.className = 'p3d__labels'; this.wrap.appendChild(this.labels);
    this.scene = new T.Scene();
    this.hemi = new T.HemisphereLight(0xffffff, 0x8a7f74, .95); this.scene.add(this.hemi);
    var sun = new T.DirectionalLight(0xffffff, .55); sun.position.set(-2, 12, -1.5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
    this.sun = sun; this.scene.add(sun); this.scene.add(sun.target);
    this.camera = new T.OrthographicCamera(-5, 5, 5, -5, .1, 100);
    this.root = new T.Group(); this.scene.add(this.root);
    this.items = new T.Group(); this.scene.add(this.items);
    this.ray = new T.Raycaster(); this.floor = new T.Plane(new T.Vector3(0, 1, 0), 0);
    this.bindPointer();
    this.mount(host); this.update(opts);
  }
  View.prototype.mount = function (host) {
    this.host = host; host.appendChild(this.wrap); this.resize();
  };
  View.prototype.resize = function () {
    var w = this.host.clientWidth || 358, ph = this.opts.photo, h = ph ? Math.round(w * ph.h / ph.w) : (this.opts.height || 340);
    this.renderer.setSize(w, h); this.w = w; this.h = h; this.fit(); this.draw();
  };

  /* ── геометрия квартиры: стены = расширенные на толщину стены комнаты минус сами комнаты,
     растром 5 см; проёмы дверей вырезаем, окна — низкий подоконник ── */
  /* фото-рендер квартиры как основа (пример ЖК PRIDE, эталоны A3/A5): картинка лежит на полу ровно
     по рамке плана [0, 0, w, h] в пикселях разметки; стены и мебель уже на фото, поверх — габариты и рамки.
     gray — серый вариант для «Мебели по размерам» (A5а). */
  var photoCache = {};
  function photoTex(src, gray, done) {
    var key = src + (gray ? ':g' : '');
    if (photoCache[key]) return done(photoCache[key]);
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      var g = c.getContext('2d'); g.drawImage(img, 0, 0);
      if (gray) {
        var d = g.getImageData(0, 0, c.width, c.height), a = d.data;
        for (var i = 0; i < a.length; i += 4) { var l = Math.min(255, (a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11) * 1.12 + 10); a[i] = a[i + 1] = a[i + 2] = l; }
        g.putImageData(d, 0, 0);
      }
      var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
      photoCache[key] = t; done(t);
    };
    img.src = src;
  }
  View.prototype.buildPhoto = function (geo) {
    var self = this, ph = this.opts.photo, ppm = geo.px_per_m;
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.bounds = { x1: 0, y1: 0, x2: ph.w, y2: ph.h, ppm: ppm }; this.cx = ph.w / 2; this.cy = ph.h / 2;
    var plane = new T.Mesh(new T.PlaneGeometry(ph.w / ppm, ph.h / ppm), new T.MeshBasicMaterial({ color: 0xffffff }));
    plane.rotation.x = -Math.PI / 2; this.root.add(plane);
    photoTex(ph.src, this.opts.style !== 'interior', function (t) { plane.material.map = t; plane.material.needsUpdate = true; self.draw(); });
    /* новые перегородки варианта стен — терракотовые полосы поверх фото */
    (geo.partitions || []).forEach(function (b) {
      var m = new T.Mesh(new T.BoxGeometry((b[2] - b[0]) / ppm, .04, (b[3] - b[1]) / ppm), new T.MeshBasicMaterial({ color: 0xa24e32 }));
      m.position.set(self.wx((b[0] + b[2]) / 2), .03, self.wz((b[1] + b[3]) / 2)); self.root.add(m);
    });
    this.fit();
  };
  View.prototype.buildFlat = function (geo) {
    if (this.opts.photo) return this.buildPhoto(geo);
    var self = this, clay = isClay(this.opts); while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.wallH = clay ? CLAY_H : WALL_H; var WH = this.wallH, SH = clay ? CLAY_SILL : SILL_H;
    /* домик: свет сбоку — у белых стен появляются свет и тень, как у макета */
    this.hemi.intensity = clay ? .5 : .95; this.sun.intensity = clay ? .62 : .55;
    if (clay) this.sun.position.set(-4, 10, 7); else this.sun.position.set(-2, 12, -1.5);   /* у домика солнце сбоку-спереди — две видимые стороны стен разного тона */
    var ppm = geo.px_per_m, W = Math.round(.25 * ppm), cell = .05 * ppm;
    var rooms = geo.rooms || [], all = rooms.map(function (r) { return r.box; });
    var x1 = Math.min.apply(null, all.map(function (b) { return b[0]; })) - W, y1 = Math.min.apply(null, all.map(function (b) { return b[1]; })) - W;
    var x2 = Math.max.apply(null, all.map(function (b) { return b[2]; })) + W, y2 = Math.max.apply(null, all.map(function (b) { return b[3]; })) + W;
    this.bounds = { x1: x1, y1: y1, x2: x2, y2: y2, ppm: ppm };
    this.cx = (x1 + x2) / 2; this.cy = (y1 + y2) / 2;
    var nx = Math.ceil((x2 - x1) / cell), ny = Math.ceil((y2 - y1) / cell), grid = new Uint8Array(nx * ny);
    function inBox(px, py, b, pad) { pad = pad || 0; return px >= b[0] - pad && px <= b[2] + pad && py >= b[1] - pad && py <= b[3] + pad; }
    var wins = windowRects(geo, W);
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var px = x1 + (i + .5) * cell, py = y1 + (j + .5) * cell, inRoom = false, near = false;
      for (var k = 0; k < all.length; k++) { if (inBox(px, py, all[k])) { inRoom = true; break; } if (inBox(px, py, all[k], W)) near = true; }
      /* перегородки варианта стен стоят внутри комнат */
      if ((geo.partitions || []).some(function (b) { return inBox(px, py, b); })) { grid[j * nx + i] = 3; continue; }
      if (inRoom || !near) continue;
      if ((geo.outside || []).some(function (o) { return inBox(px, py, o.box); })) continue;
      if ((geo.doors || []).some(function (d) { return inBox(px, py, d.box); })) continue;
      grid[j * nx + i] = wins.some(function (b) { return inBox(px, py, b, cell * .6); }) ? 2 : 1;
    }
    /* склеиваем клетки в прямоугольники: сначала строки, потом одинаковые строки подряд */
    var wallMat = [side(), side(), new T.MeshStandardMaterial({ color: clay ? CLAY : 0x1e1c1a, roughness: .9 }), side(), side(), side()];
    function side() { return new T.MeshStandardMaterial({ color: clay ? CLAY : 0x9c958d, roughness: .95 }); }
    /* новая перегородка — терракотовый срез, чтобы изменение варианта было видно */
    var partMat = [side(), side(), new T.MeshStandardMaterial({ color: 0xa24e32, roughness: .9 }), side(), side(), side()];
    var glass = new T.MeshStandardMaterial({ color: 0xbfd6e6, roughness: .2, metalness: .1, transparent: true, opacity: .55 });
    var runs = {};
    for (var jj = 0; jj < ny; jj++) {
      var i0 = 0;
      while (i0 < nx) {
        var v = grid[jj * nx + i0]; if (!v) { i0++; continue; }
        var i1 = i0; while (i1 + 1 < nx && grid[jj * nx + i1 + 1] === v) i1++;
        var key = i0 + ':' + i1 + ':' + v, prev = runs[key];
        if (prev && prev.j1 === jj - 1) prev.j1 = jj; else runs[key + ':' + jj] = runs[key] = { i0: i0, i1: i1, j0: jj, j1: jj, v: v };
        i0 = i1 + 1;
      }
    }
    var seen = [];
    Object.keys(runs).forEach(function (k) { var r = runs[k]; if (seen.indexOf(r) < 0) seen.push(r); });
    seen.forEach(function (r) {
      var bx1 = x1 + r.i0 * cell, bx2 = x1 + (r.i1 + 1) * cell, by1 = y1 + r.j0 * cell, by2 = y1 + (r.j1 + 1) * cell;
      var h = r.v === 2 ? SH : WH;
      var m = new T.Mesh(new T.BoxGeometry((bx2 - bx1) / ppm, h, (by2 - by1) / ppm), r.v === 3 ? partMat : wallMat);
      m.position.set(self.wx((bx1 + bx2) / 2), h / 2, self.wz((by1 + by2) / 2)); m.castShadow = m.receiveShadow = true; self.root.add(m);
      if (r.v === 2) {
        var g = new T.Mesh(new T.BoxGeometry((bx2 - bx1) / ppm, WH - SH, (by2 - by1) / ppm * .35), glass);
        if (bx2 - bx1 < by2 - by1) g.geometry = new T.BoxGeometry((bx2 - bx1) / ppm * .35, WH - SH, (by2 - by1) / ppm);
        g.position.set(m.position.x, SH + (WH - SH) / 2, m.position.z); self.root.add(g);
      }
    });
    /* полы комнат */
    rooms.forEach(function (r) {
      var b = r.box, w = (b[2] - b[0]) / ppm, d = (b[3] - b[1]) / ppm;
      var mat = clay ? new T.MeshStandardMaterial({ color: 0xCFC5B7, roughness: .95 }) : floorMat(r.type, r.name, self.opts.style !== 'interior', PALETTE[self.opts.interiorId] || PALETTE.own), t = mat.map;
      if (t) { mat.map = t.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(w / t.userData.rep, d / t.userData.rep); }
      var f = new T.Mesh(new T.PlaneGeometry(w, d), mat); f.rotation.x = -Math.PI / 2;
      f.position.set(self.wx((b[0] + b[2]) / 2), 0.001, self.wz((b[1] + b[3]) / 2)); f.receiveShadow = true; self.root.add(f);
    });
    /* подложка под квартирой — светлая, как поле картинки */
    var base = new T.Mesh(new T.PlaneGeometry((x2 - x1) / ppm + 1.2, (y2 - y1) / ppm + 1.2), new T.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 1 }));
    base.rotation.x = -Math.PI / 2; base.position.set(0, -0.01, 0); base.receiveShadow = true; this.root.add(base);
    this.fit();
  };
  /* окно — полоса стены комнаты на той стороне, где оно стоит (как в 2D-расстановке) */
  function windowRects(geo, W) {
    return (geo.windows || []).map(function (w) {
      var r = (geo.rooms || []).filter(function (x) { return !x.part_of && (String(x.type || x.name).toLowerCase() === String(w.room).toLowerCase() || String(x.name).toLowerCase() === String(w.room).toLowerCase()); })[0];
      var s = w.box; if (!r) return s;
      var b = r.box;
      if (w.wall === 'west') return [b[0] - W, Math.max(s[1], b[1]), b[0], Math.min(s[3], b[3])];
      if (w.wall === 'east') return [b[2], Math.max(s[1], b[1]), b[2] + W, Math.min(s[3], b[3])];
      if (w.wall === 'north') return [Math.max(s[0], b[0]), b[1] - W, Math.min(s[2], b[2]), b[1]];
      if (w.wall === 'south') return [Math.max(s[0], b[0]), b[3], Math.min(s[2], b[2]), b[3] + W];
      return s;
    });
  }
  View.prototype.wx = function (px) { return (px - this.cx) / this.bounds.ppm; };
  View.prototype.wz = function (py) { return (py - this.cy) / this.bounds.ppm; };
  View.prototype.toPlan = function (v) { return [v.x * this.bounds.ppm + this.cx, v.z * this.bounds.ppm + this.cy]; };

  /* ── мебель: коробка по рамке, у кровати и дивана — матрас и спинка ── */
  View.prototype.buildItems = function () {
    var self = this, o = this.opts, ppm = this.bounds.ppm;
    while (this.items.children.length) this.items.remove(this.items.children[0]);
    if (o.hideItems || !o.items) return;
    var pal = PALETTE[o.interiorId] || PALETTE.own, sizes = o.style !== 'interior';
    if (o.photo) return this.buildPhotoItems();
    (o.items || []).forEach(function (it) {
      var b = it.box, w = Math.max(.05, (b[2] - b[0]) / ppm), d = Math.max(.05, (b[3] - b[1]) / ppm), h = heightOf(it.label);
      var bad = o.bad && o.bad[it.id], on = o.picked === it.id;
      var clay = isClay(o), col = clay ? '#FBF9F6' : sizes ? '#e3dfd9' : colorOf(it.label, pal);
      if (clay) h = Math.max(.35, HEIGHT_REAL(it.label));
      var mat = new T.MeshStandardMaterial({ color: col, roughness: .8, transparent: sizes && !clay, opacity: sizes && !clay ? .92 : 1,
        emissive: on ? 0xa24e32 : bad ? 0xd9822b : 0x000000, emissiveIntensity: on ? .35 : bad ? .45 : 0 });
      var g = new T.Group(); g.userData.id = it.id;
      var body = new T.Mesh(new T.BoxGeometry(w, h, d), mat); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; body.userData.id = it.id; g.add(body);
      var l = String(it.label || '').toLowerCase();
      if (!sizes && /кроват/.test(l)) {
        var mt = new T.Mesh(new T.BoxGeometry(w * .94, .12, d * .8), new T.MeshStandardMaterial({ color: pal.light, roughness: .9 }));
        mt.position.set(0, h + .06, d * .08); mt.castShadow = true; mt.userData.id = it.id; g.add(mt);
      }
      if (!sizes && /диван/.test(l)) {
        var bk = new T.Mesh(new T.BoxGeometry(w, .35, Math.min(.25, d * .3)), mat); bk.position.set(0, h + .17, -d / 2 + Math.min(.25, d * .3) / 2); bk.castShadow = true; bk.userData.id = it.id; g.add(bk);
      }
      if (sizes || on || bad) {
        var e = new T.LineSegments(new T.EdgesGeometry(body.geometry), new T.LineBasicMaterial({ color: on ? 0xa24e32 : bad ? 0xd9822b : clay ? 0xC9C2B9 : 0x6b655f }));
        e.position.copy(body.position); g.add(e);
      }
      g.position.set(self.wx((b[0] + b[2]) / 2), 0, self.wz((b[1] + b[3]) / 2));
      self.items.add(g);
    });
  };

  /* поверх фото: A5а — белые габариты с обводкой; A5б — мебель уже на фото, рисуем только рамку
     выбранного, замечания и то, что человек сдвинул со своего места (полупрозрачно) */
  View.prototype.buildPhotoItems = function () {
    var self = this, o = this.opts, ppm = this.bounds.ppm, sizes = o.style !== 'interior';
    (o.items || []).forEach(function (it) {
      var b = it.box, w = Math.max(.05, (b[2] - b[0]) / ppm), d = Math.max(.05, (b[3] - b[1]) / ppm);
      var on = o.picked === it.id, bad = o.bad && o.bad[it.id], moved = o.moved && o.moved[it.id];
      var show = sizes || moved;
      var g = new T.Group(); g.userData.id = it.id;
      var body = new T.Mesh(new T.BoxGeometry(w, .02, d), new T.MeshBasicMaterial({ color: sizes ? 0xffffff : 0xe9d9cc, transparent: true, opacity: show ? (sizes ? .9 : .6) : 0, depthWrite: false }));
      body.position.y = .02; body.userData.id = it.id; g.add(body);
      if (show || on || bad) {
        var col = on ? 0xa24e32 : bad ? 0xd9822b : 0x4a4540;
        var e = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, .02, d)), new T.LineBasicMaterial({ color: col }));
        e.position.y = .03; g.add(e);
        if (on || bad) { var e2 = e.clone(); e2.scale.set(1 + .04 / w, 1, 1 + .04 / d); g.add(e2); }
      }
      g.position.set(self.wx((b[0] + b[2]) / 2), 0, self.wz((b[1] + b[3]) / 2));
      self.items.add(g);
    });
  };

  /* ── камера: орто сверху с наклоном, вращение по кругу пальцем по пустому месту ── */
  View.prototype.fit = function () {
    if (!this.bounds || !this.w) return;
    var b = this.bounds, wm = (b.x2 - b.x1) / b.ppm, dm = (b.y2 - b.y1) / b.ppm;
    var diag = Math.sqrt(wm * wm + dm * dm), aspect = this.w / this.h, cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    /* габарит квартиры, повёрнутой на yaw, в кадре: ширина целиком, глубина — с поправкой на наклон */
    var wr = Math.abs(wm * cy) + Math.abs(dm * sy), dr = Math.abs(wm * sy) + Math.abs(dm * cy);
    var WH = this.wallH || WALL_H;
    var half = this.opts.photo ? Math.max(wm / 2 / aspect, dm / 2) : Math.max(wr / 2 / aspect, (dr * Math.cos(this.tilt) + WH * Math.sin(this.tilt)) / 2) * 1.06;
    var c = this.camera; c.left = -half * aspect; c.right = half * aspect; c.top = half; c.bottom = -half; c.zoom = this.zoom;
    var r = 30, t = this.opts.photo ? 0 : this.tilt;
    if (this.opts.photo) { c.position.set(0, r, 0); c.up.set(0, 0, -1); }
    else { c.position.set(sy * Math.sin(t) * r, Math.cos(t) * r, cy * Math.sin(t) * r); c.up.set(0, 1, 0); }
    c.lookAt(0, 0, 0); c.updateProjectionMatrix();
    this.sun.shadow.camera.left = -diag; this.sun.shadow.camera.right = diag; this.sun.shadow.camera.top = diag; this.sun.shadow.camera.bottom = -diag;
    this.sun.shadow.camera.updateProjectionMatrix();
  };
  View.prototype.draw = function () {
    if (!this.bounds) return;
    this.renderer.render(this.scene, this.camera);
    this.drawLabels();
  };
  /* подписи HTML поверх 3D: комнаты, разметка (A3), габариты (A5а) — по точке плана */
  View.prototype.drawLabels = function () {
    var self = this, tags = this.opts.tags || [];
    this.labels.innerHTML = tags.map(function (t) {
      var v = new T.Vector3(self.wx(t.px[0]), t.y || (isClay(self.opts) ? 1 : WALL_H * .2), self.wz(t.px[1])).project(self.camera);
      var x = (v.x + 1) / 2 * self.w, y = (1 - v.y) / 2 * self.h;
      x = Math.max(34, Math.min(self.w - 34, x)); y = Math.max(10, Math.min(self.h - 10, y));
      return '<span class="pz-tag' + (t.k ? ' pz-tag--' + t.k : '') + '" style="left:' + x + 'px;top:' + y + 'px">' + t.t + '</span>';
    }).join('');
  };
  View.prototype.update = function (opts) {
    var prev = this.opts; this.opts = Object.assign({}, prev, opts);
    var restyle = ('style' in opts && opts.style !== prev.style) || ('interiorId' in opts && opts.interiorId !== prev.interiorId) || ('photo' in opts && opts.photo !== prev.photo);
    /* сменился вид (домик ↔ цвет) — ставим его камеру по умолчанию */
    if (restyle || !this.bounds) { var c0 = isClay(this.opts); this.yaw = c0 ? Math.PI / 4 : 0; this.tilt = c0 ? .8 : .28; }
    if ((opts.geo && opts.geo !== prev.geo) || restyle) this.buildFlat(this.opts.geo);
    if ('photo' in opts && !!opts.photo !== !!prev.photo) this.resize();
    if ('zoom' in opts) this.zoom = opts.zoom || 1;
    this.buildItems(); this.fit(); this.draw();
  };
  /* «мебель встаёт на места» (ТЗ Планировки, 0.1): предметы опускаются сверху по очереди, 1–2 с */
  View.prototype.dropIn = function (ms, done) {
    var self = this, kids = this.items.children.slice(), t0 = performance.now(), step = Math.min(60, (ms || 1400) / Math.max(1, kids.length) / 1.5), dur = 420;
    kids.forEach(function (g) { g.userData.y0 = g.position.y; g.position.y = 2.6; });
    var over = false;
    function finish() { if (over) return; over = true; kids.forEach(function (g) { g.position.y = g.userData.y0; }); self.draw(); if (done) done(); }
    /* страховка: в фоновой вкладке кадры не идут — по таймеру всё равно ставим мебель на места */
    setTimeout(finish, (ms || 1400) + kids.length * 0 + 900);
    (function frame(now) {
      if (over) return;
      var all = true;
      kids.forEach(function (g, i) {
        var k = Math.max(0, Math.min(1, (now - t0 - i * step) / dur)); if (k < 1) all = false;
        var e = 1 - Math.pow(1 - k, 3) + (k < 1 ? Math.sin(k * Math.PI) * .04 : 0);        /* мягкое приземление с лёгким отскоком */
        g.position.y = g.userData.y0 + (1 - e) * 2.6;
      });
      self.draw();
      if (!all) requestAnimationFrame(frame); else finish();
    })(t0);
  };
  View.prototype.reset = function () { var c0 = isClay(this.opts); this.yaw = c0 ? Math.PI / 4 : 0; this.tilt = c0 ? .8 : .28; this.fit(); this.draw(); };

  /* ── указатель: предмет — тащим по полу (колбэки экрана), пусто — крутим квартиру ── */
  View.prototype.hit = function (e) {
    var r = this.renderer.domElement.getBoundingClientRect();
    var m = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(m, this.camera);
    var hits = this.ray.intersectObjects(this.items.children, true), p = new T.Vector3();
    this.ray.ray.intersectPlane(this.floor, p);
    return { id: hits.length ? hits[0].object.userData.id : null, plan: this.toPlan(p) };
  };
  View.prototype.bindPointer = function () {
    var self = this, el = this.renderer.domElement, drag = null;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) {
      var h = self.hit(e), o = self.opts;
      if (h.id !== null && h.id !== undefined && o.onItemDown) { drag = { item: true }; o.onItemDown(h.id, h.plan); }
      else drag = { x: e.clientX, y: e.clientY, yaw: self.yaw, tilt: self.tilt, moved: false };
      el.setPointerCapture(e.pointerId); e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (drag.item) { if (self.opts.onItemMove) self.opts.onItemMove(self.hit(e).plan); return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (self.opts.photo) return;                                 /* фото-рендер не крутим */
      self.yaw = drag.yaw - dx * .01; self.tilt = Math.max(.05, Math.min(1.05, drag.tilt + dy * .006)); self.fit(); self.draw();
    });
    el.addEventListener('pointerup', function () {
      if (drag && drag.item && self.opts.onItemUp) self.opts.onItemUp();
      if (drag && !drag.item && !drag.moved && self.opts.onEmpty) self.opts.onEmpty();
      drag = null;
    });
  };
  /* картинка вида для сохранения и PDF */
  View.prototype.snapshot = function () { this.draw(); try { return this.renderer.domElement.toDataURL('image/jpeg', .86); } catch (e) { return null; } };

  /* ── типовой план «Плана нет»: комнаты полосами, вход через прихожую ── */
  function typicalGeo(rooms) {
    var ppm = 50, big = rooms.filter(function (r) { return !/сан|прих/i.test(r.name); }), small = rooms.filter(function (r) { return /сан|прих/i.test(r.name); });
    var D = 4.6, x = 0, out = [], doors = [];
    big.forEach(function (r) { var w = Math.max(2.4, r.m2 / D); out.push({ name: r.name, type: r.name.toLowerCase(), box: [x * ppm, 0, (x + w) * ppm, D * ppm], m2: r.m2 }); x += w + .25; });
    var total = x - .25, D2 = 2.2, x2 = 0, wsum = small.reduce(function (a, r) { return a + r.m2 / D2; }, 0), k = total / Math.max(wsum, 1);
    small.forEach(function (r) { var w = r.m2 / D2 * k; out.push({ name: r.name, type: r.name.toLowerCase(), box: [x2 * ppm, (D + .25) * ppm, (x2 + w) * ppm, (D + .25 + D2) * ppm], m2: r.m2 }); x2 += w + .25; });
    var hall = out.filter(function (r) { return /прих/i.test(r.name); })[0];
    if (hall) {
      out.forEach(function (r) {
        if (r === hall) return;
        var a = Math.max(r.box[0], hall.box[0]), b = Math.min(r.box[2], hall.box[2]); if (b - a < 1 * ppm) return;
        var cx = (a + b) / 2, y = r.box[3] < hall.box[1] ? (r.box[3] + hall.box[1]) / 2 : (r.box[1] + hall.box[3]) / 2;
        doors.push({ kind: 'door', box: [cx - .45 * ppm, y - .5 * ppm, cx + .45 * ppm, y + .5 * ppm] });
      });
      var hx = (hall.box[0] + hall.box[2]) / 2; doors.push({ kind: 'entrance', box: [hx - .45 * ppm, hall.box[3] - .1 * ppm, hx + .45 * ppm, hall.box[3] + .5 * ppm] });
    }
    var windows = big.map(function (r) { var b = out.filter(function (x) { return x.name === r.name; })[0].box; return { room: r.name, wall: 'north', box: [b[0] + .4 * ppm, b[1] - .3 * ppm, b[2] - .4 * ppm, b[1]] }; });
    return { px_per_m: ppm, rooms: out, windows: windows, doors: doors, outside: [] };
  }

  window.SOVE_PLAN3D = {
    ok: !!T && (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })(),
    create: function (host, opts) { return new View(host, opts); },
    typicalGeo: typicalGeo
  };
})();
