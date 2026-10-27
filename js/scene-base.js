/* Shared base for the Three.js scenes: renderer in the stage, a camera with
   tweened poses per beat, a tween queue on the signature curve, HTML
   annotations projected from world positions, WebGL detection with a poster
   fallback, and reduced-motion instant states. Scenes register on
   window.MTWScenes[name] = { create(stage, opts) }. Requires vendor/three.iife.js. */
(function (global) {
  'use strict';
  var T = global.THREE;
  var COLORS = { teal: 0x1A9BA1, tealDark: 0x12747A, tealLight: 0x5FC4C9, ink: 0x141414, paper: 0xFAFAFA, g800: 0x1F1F1F, g700: 0x333333, g600: 0x4E4E4E, g500: 0x757575, g400: 0x9A9A9A, g300: 0xCCCCCC, warning: 0xD9A441, error: 0xD9534F, success: 0x1FA97A };

  function easeSignature(t) { /* approximates cubic-bezier(.32,.72,0,1) */ return 1 - Math.pow(1 - t, 3.2) * (1 - 0.15 * t); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function Tweens(reduced) {
    this.list = [];
    this.reduced = reduced;
  }
  Tweens.prototype.add = function (obj, from, to, dur, delay, onUpdate, ease) {
    var keys = Object.keys(to);
    var start = {};
    keys.forEach(function (k) { start[k] = from && from[k] !== undefined ? from[k] : obj[k]; });
    if (this.reduced()) { keys.forEach(function (k) { obj[k] = to[k]; }); if (onUpdate) onUpdate(1); return; }
    /* cancel tweens on the same object and keys */
    this.list = this.list.filter(function (tw) { return !(tw.obj === obj && tw.keys.some(function (k) { return keys.indexOf(k) >= 0; })); });
    this.list.push({ obj: obj, keys: keys, start: start, to: to, dur: dur || 0.9, delay: delay || 0, t0: null, onUpdate: onUpdate, ease: ease || easeSignature });
  };
  Tweens.prototype.step = function (now) {
    /* iterate a snapshot so tweens added from a callback survive, then drop the finished ones by identity */
    var active = false, finished = [], snapshot = this.list.slice();
    snapshot.forEach(function (tw) {
      if (tw.t0 === null) tw.t0 = now;
      var e = (now - tw.t0) / 1000 - tw.delay;
      if (e < 0) { active = true; return; }
      var u = clamp(e / tw.dur, 0, 1), k = tw.ease(u);
      tw.keys.forEach(function (key) { tw.obj[key] = tw.start[key] + (tw.to[key] - tw.start[key]) * k; });
      if (tw.onUpdate) tw.onUpdate(k);
      if (u < 1) active = true; else finished.push(tw);
    });
    if (finished.length) this.list = this.list.filter(function (tw) { return finished.indexOf(tw) < 0; });
    return active;
  };

  function webglOk() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }

  function createBase(stage, opts) {
    var reduced = opts && opts.reduced ? opts.reduced : function () { return false; };
    var base = { stage: stage, reduced: reduced, ok: webglOk(), tweens: new Tweens(reduced), annotations: [], ambient: [] };
    stage.setAttribute('data-webgl', base.ok ? 'on' : 'off');
    var layer = document.createElement('div');
    layer.className = 'annotations';
    stage.appendChild(layer);
    base.layer = layer;
    if (!base.ok) return base;

    var canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    stage.insertBefore(canvas, stage.firstChild);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(COLORS.ink, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.NoToneMapping;
    renderer.outputColorSpace = T.SRGBColorSpace;
    var scene = new T.Scene();
    scene.background = new T.Color(COLORS.ink);
    var camera = new T.PerspectiveCamera(34, 16 / 9, 0.1, 400);
    var pose = { x: 0, y: 6, z: 14, tx: 0, ty: 0, tz: 0, fov: 34 };
    base.renderer = renderer; base.scene = scene; base.camera = camera; base.pose = pose; base.canvas = canvas;

    var needs = true, raf = null, last = 0;
    function frame(now) {
      raf = null;
      var active = base.tweens.step(now);
      if (base.stepAnnotations(now)) active = true;
      var amb = false;
      if (!reduced()) base.ambient.forEach(function (fn) { if (fn(now)) amb = true; });
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.tx, pose.ty, pose.tz);
      if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
      if (pose.sh !== undefined && Math.abs(pose.sh - base.shift) > 0.0005) { base.shift = pose.sh; base.applyOffset(); }
      if (base.update) base.update(now);
      renderer.render(scene, camera);
      base.placeAnnotations();
      last = now;
      if (active || amb || needs) { needs = false; raf = requestAnimationFrame(frame); }
    }
    base.invalidate = function () { needs = true; if (!raf) raf = requestAnimationFrame(frame); };
    /* view offset: the projection centre sits right of the stage centre by this
       fraction of the width at desktop widths, so the object clears the copy
       column. A pose may carry its own `sh`, tweened with the camera. */
    base.shift = 0.13; pose.sh = 0.13;
    base.applyOffset = function () {
      var w = stage.clientWidth, h = stage.clientHeight;
      var sh = w < 900 ? 0 : Math.round(base.shift * w);
      camera.setViewOffset(w, h, -sh, 0, w, h);
      camera.updateProjectionMatrix();
    };
    base.setShift = function (v) { base.shift = v; pose.sh = v; base.applyOffset(); base.invalidate(); };
    base.resize = function () {
      var w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      base.applyOffset();
      base.invalidate();
    };
    base.moveCamera = function (to, dur, delay) {
      base.tweens.add(pose, null, to, dur === undefined ? 1.1 : dur, delay || 0);
      base.invalidate();
    };
    base.tween = function (obj, to, dur, delay, onUpdate, ease) { base.tweens.add(obj, null, to, dur, delay, onUpdate, ease); base.invalidate(); };

    /* annotations: HTML labels that follow a world position */
    var v = new T.Vector3();
    base.addAnnotation = function (text, position, cls) {
      var el = document.createElement('div');
      el.className = 'anno ' + (cls || '');
      if (typeof text === 'string') el.textContent = text; else el.appendChild(text);
      el.setAttribute('data-on', 'false');
      layer.appendChild(el);
      var a = { el: el, pos: position.clone ? position.clone() : new T.Vector3(position.x, position.y, position.z), on: false, offset: { x: 0, y: 0 } };
      base.annotations.push(a);
      return a;
    };
    /* timed on the render clock, not on timers, so captures and throttling cannot stall a switch */
    base.showAnnotation = function (a, on, delay) {
      if (!delay || reduced()) { a.pending = null; a.on = on; a.el.setAttribute('data-on', on ? 'true' : 'false'); return; }
      a.pending = { on: on, at: performance.now() + delay * 1000 };
      base.invalidate();
    };
    base.stepAnnotations = function (now) {
      var busy = false;
      base.annotations.forEach(function (a) {
        if (!a.pending) return;
        if (now >= a.pending.at) { a.on = a.pending.on; a.el.setAttribute('data-on', a.on ? 'true' : 'false'); a.pending = null; }
        else busy = true;
      });
      return busy;
    };
    /* Labels stay inside the safe area of the stage: clear of the header,
       the beat index on the right and the edges. The anchor follows the
       label's translate class (left, right, above, or centred). */
    base.placeAnnotations = function () {
      var w = stage.clientWidth, h = stage.clientHeight;
      var padL = 16, padT = 76, padB = 16;
      /* the beat index: its numbers column always, its expanded name only across its own vertical band */
      var bi = stage.querySelector('.beat-index'), band = null;
      if (bi && w >= 900) { var br = bi.getBoundingClientRect(), sr = stage.getBoundingClientRect(); band = { y1: br.top - sr.top - 8, y2: br.bottom - sr.top + 8 }; }
      base.annotations.forEach(function (a) {
        v.copy(a.pos).project(camera);
        var behind = v.z > 1;
        var x = (v.x * 0.5 + 0.5) * w + a.offset.x, y = (-v.y * 0.5 + 0.5) * h + a.offset.y;
        if (a.on && !behind) {
          var cl = a.el.classList, ax = cl.contains('left') ? 0 : (cl.contains('right') ? 1 : 0.5), ay = cl.contains('above') ? 1 : (cl.contains('below') ? 0 : 0.5);
          var ww = a.el.offsetWidth, hh = a.el.offsetHeight;
          var top0 = y - ay * hh, padR = w < 900 ? 16 : ((band && top0 + hh > band.y1 && top0 < band.y2) ? 212 : 88);
          var left = clamp(x - ax * ww, padL, Math.max(padL, w - padR - ww));
          var top = clamp(y - ay * hh, padT, Math.max(padT, h - padB - hh));
          x = left + ax * ww; y = top + ay * hh;
        }
        a.el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
        a.el.style.visibility = behind ? 'hidden' : 'visible';
      });
    };

    /* materials */
    base.mat = {
      ink: new T.MeshStandardMaterial({ color: COLORS.g800, roughness: 0.55, metalness: 0.05 }),
      slab: new T.MeshStandardMaterial({ color: COLORS.g700, roughness: 0.5, metalness: 0.08 }),
      paper: new T.MeshStandardMaterial({ color: COLORS.paper, roughness: 0.45, metalness: 0.0 }),
      teal: new T.MeshStandardMaterial({ color: COLORS.teal, roughness: 0.4, metalness: 0.1 }),
      tealGlow: new T.MeshStandardMaterial({ color: COLORS.teal, emissive: COLORS.teal, emissiveIntensity: 0.55, roughness: 0.35 }),
      tealDark: new T.MeshStandardMaterial({ color: COLORS.tealDark, roughness: 0.5 }),
      warning: new T.MeshStandardMaterial({ color: COLORS.warning, emissive: COLORS.warning, emissiveIntensity: 0.35, roughness: 0.5 }),
      glass: new T.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.25, metalness: 0.0, transmission: 0.0, transparent: true, opacity: 0.14, side: T.DoubleSide }),
      floor: new T.MeshStandardMaterial({ color: COLORS.ink, roughness: 0.8, metalness: 0.0 })
    };
    base.line = function (points, color, opacity) {
      var g = new T.BufferGeometry().setFromPoints(points);
      var m = new T.LineBasicMaterial({ color: color || COLORS.teal, transparent: true, opacity: opacity === undefined ? 0.9 : opacity });
      return new T.Line(g, m);
    };
    base.lights = function () {
      var key = new T.DirectionalLight(0xFFFFFF, 2.2);
      key.position.set(-6, 12, 8);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -18; key.shadow.camera.right = 18; key.shadow.camera.top = 18; key.shadow.camera.bottom = -18;
      key.shadow.camera.near = 1; key.shadow.camera.far = 60;
      key.shadow.bias = -0.0008;
      scene.add(key);
      var rim = new T.PointLight(COLORS.teal, 60, 40, 1.6);
      rim.position.set(10, 5, -8);
      scene.add(rim);
      var amb = new T.AmbientLight(0xFFFFFF, 0.55);
      scene.add(amb);
      var hemi = new T.HemisphereLight(0x8fb8bb, 0x0a0a0a, 0.35);
      scene.add(hemi);
      return { key: key, rim: rim, amb: amb };
    };
    base.floor = function (size) {
      var f = new T.Mesh(new T.PlaneGeometry(size || 80, size || 80), base.mat.floor);
      f.rotation.x = -Math.PI / 2;
      f.position.y = -0.01;
      f.receiveShadow = true;
      scene.add(f);
      scene.fog = new T.Fog(COLORS.ink, 18, 60);
      return f;
    };
    window.addEventListener('resize', base.resize);
    base.resize();
    return base;
  }

  global.MTWSceneBase = { create: createBase, COLORS: COLORS, ease: easeSignature };
  global.MTWScenes = global.MTWScenes || {};
})(window);
