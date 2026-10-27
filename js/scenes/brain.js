/* Second Brains: an original low-poly brain (Blender) drawn as a dark facet
   shell with a wireframe and vertex nodes. Regions (sources, decisions, rules,
   chronology, methods) light selectively when a concrete task approaches; the
   camera moves into the lit region and resolves it into traceable context
   cards with owners; other contexts light different regions; a changed source
   marks dependent context for review; then the multiplexer routes a chosen
   piece of work by role through steps and review. Illustrative content. */
(function (global) {
  'use strict';
  var T = global.THREE, B = global.MTWSceneBase, C = B.COLORS;

  var REGIONS = ['sources', 'decisions', 'rules', 'methods', 'chronology'];
  var REGION_NAME = { sources: 'Sources', decisions: 'Decisions', rules: 'Rules', methods: 'Methods', chronology: 'Chronology' };
  function regionOf(p, meshName) {
    if (meshName !== 'Brain') return 'chronology';
    if (p.z < -0.34) return 'sources';
    if (p.z > 0.36) return 'chronology';
    if (p.y > 0.40) return 'decisions';
    if (p.x > 0.44) return 'rules';
    if (p.x < -0.44) return 'methods';
    return 'core';
  }
  var CONTEXTS = {
    status:   { name: 'Project status', task: 'Prepare the project status report', lit: ['sources', 'decisions', 'methods'],
      cards: [{ r: 'sources', text: 'Current milestones, from the project tracker', owner: 'Owner: project lead' }, { r: 'decisions', text: 'Decision record: the scope change agreed last month', owner: 'Owner: steering group' }, { r: 'methods', text: 'Report format: the agreed template and tone', owner: 'Owner: PMO' }],
      output: 'Status report draft, every figure linked to its source, the project lead reviews', moved: 'sources', movedText: 'Milestones changed since the last refresh' },
    research: { name: 'Research', task: 'Brief the team on a new regulation', lit: ['sources', 'methods', 'rules'],
      cards: [{ r: 'sources', text: 'Source set: the regulation and two commentaries', owner: 'Owner: legal' }, { r: 'rules', text: 'Rule: cite the primary source and flag uncertainty', owner: 'Owner: legal' }, { r: 'methods', text: 'Method: the brief structure used last time', owner: 'Owner: research lead' }],
      output: 'Brief with citations, the research lead reviews', moved: 'sources', movedText: 'A commentary was withdrawn' },
    devops:   { name: 'DevOps', task: 'Explain why last night\'s deployment failed', lit: ['chronology', 'rules', 'methods'],
      cards: [{ r: 'chronology', text: 'Timeline: the last five deployments and their outcomes', owner: 'Owner: platform team' }, { r: 'rules', text: 'Rule: no deployment without a passing test run', owner: 'Owner: platform lead' }, { r: 'methods', text: 'Runbook: rollback and diagnosis steps', owner: 'Owner: platform team' }],
      output: 'Diagnosis with the runbook step that applies, the platform lead reviews', moved: 'chronology', movedText: 'A deployment record is missing' },
    casework: { name: 'Case chronology', task: 'Prepare the chronology for a hearing', lit: ['chronology', 'sources', 'decisions'],
      cards: [{ r: 'chronology', text: 'Events in order, each linked to its evidence', owner: 'Owner: the responsible lawyer' }, { r: 'sources', text: 'Evidence set: correspondence, contracts, statements', owner: 'Owner: the case team' }, { r: 'decisions', text: 'Disputed entries stay marked as disputed', owner: 'Owner: the responsible lawyer' }],
      output: 'Chronology with every entry traced, the lawyer reviews', moved: 'sources', movedText: 'A statement was superseded' }
  };
  var ROLES = {
    lead:    { name: 'Project lead', flows: ['Prepare the weekly report', 'Update the risk register', 'Draft the steering summary'], steps: ['Gather this week\'s updates', 'Draft in the agreed format', 'Review: project lead', 'Publish to the team'] },
    analyst: { name: 'Analyst', flows: ['Research a new supplier', 'Compare two proposals', 'Summarise a source set'], steps: ['Define the bounded objective', 'Search with the permitted tools', 'Review: analyst', 'Record the result'] },
    partner: { name: 'Partner', flows: ['Prepare the case chronology', 'Bundle the evidence', 'Draft the client update'], steps: ['Gather the evidence set', 'Order and link the events', 'Review: responsible lawyer', 'File the chronology'] }
  };
  var POSES = {
    1: { x: 0.9, y: 3.1, z: 8.8, tx: 0.6, ty: 2.5, tz: 0, fov: 34, sh: 0.13 },
    2: { x: 1.8, y: 3.4, z: 7.6, tx: 0.6, ty: 2.5, tz: 0, fov: 34, sh: 0.13 },
    3: { x: 2.8, y: 3.2, z: 6.8, tx: 1.2, ty: 2.5, tz: 0.4, fov: 34, sh: 0.13 },
    4: { x: 2.0, y: 3.4, z: 9.0, tx: 0.7, ty: 2.7, tz: 0.8, fov: 32, sh: 0.09 },
    5: { x: 2.6, y: 3.4, z: 7.4, tx: 0.8, ty: 2.5, tz: 0, fov: 34, sh: 0.13 },
    6: { x: 2.0, y: 3.4, z: 9.0, tx: 0.7, ty: 2.7, tz: 0.8, fov: 32, sh: 0.09 },
    7: { x: 3.8, y: 3.6, z: 11, tx: 1.8, ty: 2.3, tz: 0, fov: 34, sh: 0.08 },
    8: { x: 0.6, y: 4.6, z: 13, tx: 0.8, ty: 2.1, tz: 0, fov: 34, sh: 0.06 }
  };

  function create(stage, opts) {
    var base = B.create(stage, opts);
    var state = { beat: 0, context: 'status', role: 'lead', moved: false, loaded: false };
    if (!base.ok) return { apply: function (n) { state.beat = n; }, ground: function () { return 'stage'; }, legend: function () { return false; }, probe: function () { return { beat: state.beat, webgl: false }; } };
    var scene = base.scene, mat = base.mat;
    base.lights();
    base.floor(80);

    var group = new T.Group();
    group.position.set(0.6, 2.5, 0);
    group.rotation.y = Math.PI;
    scene.add(group);
    var lit = { sources: 0, decisions: 0, rules: 0, methods: 0, chronology: 0, core: 0 };
    var buffers = [];      /* { attr, regions[] } for lines and points */
    var centroids = {};    /* region -> local Vector3 */
    var dirty = true;
    var cDim = new T.Color(C.tealDark).multiplyScalar(0.55), cLit = new T.Color(C.tealLight);

    function build(gltf) {
      var brain = null;
      gltf.scene.traverse(function (o) { if (o.isMesh && o.name === 'Brain') brain = o; });
      var box = new T.Box3().setFromObject(brain);
      var size = box.getSize(new T.Vector3());
      var s = 2.9 / Math.max(size.x, size.y, size.z);
      var sums = {}, counts = {};
      gltf.scene.traverse(function (o) {
        if (!o.isMesh) return;
        var geo = o.geometry.clone();
        geo.applyMatrix4(o.matrixWorld);
        geo.scale(s, s, s);
        var half = { x: size.x * s / 2, y: size.y * s / 2, z: size.z * s / 2 };
        /* surface */
        var surf = new T.Mesh(geo, new T.MeshStandardMaterial({ color: C.g800, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.62, flatShading: true }));
        surf.castShadow = true;
        group.add(surf);
        /* edges and points with per-vertex colours by region */
        var edges = new T.EdgesGeometry(geo, 8);
        var pos = edges.attributes.position, regs = [], cols = new Float32Array(pos.count * 3);
        for (var i = 0; i < pos.count; i++) {
          var p = new T.Vector3(pos.getX(i) / half.x, pos.getY(i) / half.y, pos.getZ(i) / half.z);
          regs.push(regionOf(p, o.name));
        }
        edges.setAttribute('color', new T.BufferAttribute(cols, 3));
        var lines = new T.LineSegments(edges, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
        group.add(lines);
        buffers.push({ attr: edges.attributes.color, regions: regs });
        var pgeo = new T.BufferGeometry();
        pgeo.setAttribute('position', geo.attributes.position.clone());
        var pregs = [], pcols = new Float32Array(geo.attributes.position.count * 3);
        for (var j = 0; j < geo.attributes.position.count; j++) {
          var q = new T.Vector3(geo.attributes.position.getX(j) / half.x, geo.attributes.position.getY(j) / half.y, geo.attributes.position.getZ(j) / half.z);
          var r = regionOf(q, o.name);
          pregs.push(r);
          if (!sums[r]) { sums[r] = new T.Vector3(); counts[r] = 0; }
          sums[r].add(new T.Vector3(geo.attributes.position.getX(j), geo.attributes.position.getY(j), geo.attributes.position.getZ(j))); counts[r]++;
        }
        pgeo.setAttribute('color', new T.BufferAttribute(pcols, 3));
        var pts = new T.Points(pgeo, new T.PointsMaterial({ vertexColors: true, size: 0.07, transparent: true, opacity: 0.95, sizeAttenuation: true }));
        group.add(pts);
        buffers.push({ attr: pgeo.attributes.color, regions: pregs });
      });
      REGIONS.forEach(function (r) { centroids[r] = counts[r] ? sums[r].multiplyScalar(1 / counts[r]) : new T.Vector3(); });
      state.loaded = true;
      placeRegionAnnos();
      dirty = true;
      base.invalidate();
    }
    function localToWorld(v) { return group.localToWorld(v.clone()); }
    function recolor() {
      var tmp = new T.Color();
      buffers.forEach(function (b) {
        var arr = b.attr.array;
        for (var i = 0; i < b.regions.length; i++) {
          var k = lit[b.regions[i]] || 0;
          tmp.copy(cDim).lerp(cLit, 0.18 + 0.82 * k);
          arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b;
        }
        b.attr.needsUpdate = true;
      });
    }
    function setLit(list, dur) {
      REGIONS.forEach(function (r) { base.tween(lit, (function (o) { o[r] = list.indexOf(r) >= 0 ? 1 : 0; return o; })({}), dur || 0.8, 0, function () { dirty = true; }); });
    }

    /* annotations */
    var regionAnno = {};
    REGIONS.forEach(function (r) { regionAnno[r] = base.addAnnotation(REGION_NAME[r], new T.Vector3(), 'role'); });
    function placeRegionAnnos() {
      var off = { sources: new T.Vector3(0, 0.25, 0.75), decisions: new T.Vector3(0, 0.6, 0), rules: new T.Vector3(-0.8, 0.1, 0), methods: new T.Vector3(0.8, 0.1, 0), chronology: new T.Vector3(0, -0.1, -0.85) };
      REGIONS.forEach(function (r) { regionAnno[r].pos.copy(localToWorld(centroids[r].clone().add(off[r]))); });
    }
    var aTask = base.addAnnotation('', new T.Vector3(5.2, 3.6, 2.4), 'big');
    var cardAnnos = [0, 1, 2].map(function () { return base.addAnnotation('', new T.Vector3(), 'left card'); });
    var aOutput = base.addAnnotation('', new T.Vector3(1.4, 1.35, 2.0), 'above');
    var aMoved = base.addAnnotation('', new T.Vector3(), 'warn right');
    var aReview = base.addAnnotation('Status output marked: needs review before it is used', new T.Vector3(1.4, 1.35, 2.0), 'warn above');
    var flowAnnos = [0, 1, 2].map(function () { return base.addAnnotation('', new T.Vector3(), 'left'); });
    var stepAnnos = [0, 1, 2, 3].map(function () { return base.addAnnotation('', new T.Vector3(), 'left'); });
    var CAT_X = 3.2;
    var aRole = base.addAnnotation('', new T.Vector3(CAT_X, 4.3, 0), 'role');
    var aCatalog = base.addAnnotation('Shared workflows for this role', new T.Vector3(CAT_X, 3.95, 0), 'left');
    var aRulesMx = base.addAnnotation('Permitted tools and approvals come from the rules region', new T.Vector3(), 'left');
    /* beat 8: two example lists to the right of the brain, case work above, research below */
    var caseAnnos = ['Case chronology: events linked to evidence', 'Disputed entries stay visible as disputed', 'Nothing is decided by the system'].map(function (t, i) { return base.addAnnotation(t, new T.Vector3(1.7, 4.2 - i * 0.48, 1.5), 'left'); });
    var rdAnnos = ['Bounded research: a stated objective', 'Permitted tools only', 'A budget and a stopping condition', 'Reviewable output, sources attached'].map(function (t, i) { return base.addAnnotation(t, new T.Vector3(1.7, 2.3 - i * 0.48, 1.5), 'left'); });
    var runner = new T.Mesh(new T.SphereGeometry(0.12, 18, 18), new T.MeshStandardMaterial({ color: C.tealLight, emissive: C.tealLight, emissiveIntensity: 0.7 }));
    runner.visible = false; scene.add(runner);
    var runLine = base.line([new T.Vector3(), new T.Vector3()], C.teal, 0); scene.add(runLine);
    var runT = { t: 0 };

    function ctx() { return CONTEXTS[state.context]; }
    function placeCards() {
      var c = ctx();
      var off = { sources: new T.Vector3(0.9, -0.2, 1.1), decisions: new T.Vector3(1.6, 0.2, 0.3), rules: new T.Vector3(0.2, 0.3, 0.9), methods: new T.Vector3(-1.5, -0.35, 0.4), chronology: new T.Vector3(1.0, 0.6, -0.3) };
      c.cards.forEach(function (card, i) {
        var a = cardAnnos[i];
        a.el.textContent = '';
        var t = document.createElement('span'); t.textContent = card.text;
        var o = document.createElement('span'); o.className = 'owner'; o.textContent = card.owner;
        a.el.appendChild(t); a.el.appendChild(o);
        if (state.loaded) a.pos.copy(localToWorld(centroids[card.r].clone().add(off[card.r])));
        a.pos.x += 0.4;
      });
      aTask.el.textContent = c.task;
      aOutput.el.textContent = c.output;
      var m = c.cards.filter(function (x) { return x.r === c.moved; })[0];
      aMoved.el.textContent = c.movedText + '. Dependent output needs review.';
      /* the review flag sits to the left of the card of the source that moved */
      if (state.loaded && m) { aMoved.pos.copy(localToWorld(centroids[m.r].clone().add(off[m.r]))); aMoved.pos.x += 0.28; }
    }
    function placeFlows() {
      var r = ROLES[state.role];
      aRole.el.textContent = r.name;
      r.flows.forEach(function (f, i) { flowAnnos[i].el.textContent = f; flowAnnos[i].pos.set(CAT_X, 3.55 - i * 0.42, 0); flowAnnos[i].el.classList.toggle('sel', i === 0); });
      r.steps.forEach(function (s, i) { stepAnnos[i].el.textContent = s; stepAnnos[i].pos.set(CAT_X, 1.75 - i * 0.42, 0); });
      if (state.loaded) aRulesMx.pos.copy(localToWorld(centroids.rules.clone().add(new T.Vector3(-0.3, 0.2, 0.4))));
      runLine.geometry.setFromPoints([new T.Vector3(1.6, 2.5, 0.6), new T.Vector3(CAT_X - 0.2, 3.55, 0)]);
    }

    function apply(n) {
      state.beat = n;
      controls.setAttribute('data-beat', String(n));
      base.moveCamera(POSES[n] || POSES[8]);
      var c = ctx();
      placeCards(); placeFlows();
      /* regions */
      if (n <= 2) setLit(n === 2 ? REGIONS : [], 0.9);
      else if (n <= 6) setLit(c.lit, 0.9);
      else if (n === 7) setLit(['rules', 'methods', 'sources'], 0.9);
      else setLit(REGIONS, 0.9);
      REGIONS.forEach(function (r, i) { base.showAnnotation(regionAnno[r], n === 2 || n === 8 || (n >= 3 && n <= 6 && c.lit.indexOf(r) >= 0), 0.5 + i * 0.12); });
      /* task approaches at beat 3 */
      base.showAnnotation(aTask, n >= 3 && n <= 6, 0.3);
      if (n === 3) { aTask.pos.set(5.2, 3.6, 2.4); base.tween(aTask.pos, { x: 2.1, y: 3.7, z: 1.9 }, 1.4, 0.2); }
      else if (n >= 4 && n <= 6) aTask.pos.set(2.1, 3.7, 1.9);
      cardAnnos.forEach(function (a, i) { base.showAnnotation(a, n >= 4 && n <= 6, 0.8 + i * 0.3); });
      base.showAnnotation(aOutput, (n === 4 || n === 5) || (n === 6 && !state.moved && false), 1.7);
      base.showAnnotation(aMoved, n === 6, 1.0);
      base.showAnnotation(aReview, n === 6, 1.8);
      /* multiplexer at 7 */
      base.showAnnotation(aRole, n === 7, 0.4);
      base.showAnnotation(aCatalog, n === 7, 0.5);
      flowAnnos.forEach(function (a, i) { base.showAnnotation(a, n === 7, 0.7 + i * 0.15); });
      stepAnnos.forEach(function (a, i) { base.showAnnotation(a, n === 7, 1.6 + i * 0.45); });
      base.showAnnotation(aRulesMx, n === 7, 1.2);
      runner.visible = n === 7;
      base.tween(runLine.material, { opacity: n === 7 ? 0.8 : 0 }, 0.5, n === 7 ? 0.8 : 0);
      if (n === 7) { runT.t = 0; base.tween(runT, { t: 1 }, 1.6, 0.9, function () { runner.position.lerpVectors(new T.Vector3(1.6, 2.5, 0.6), new T.Vector3(CAT_X - 0.2, 3.55, 0), runT.t); }); }
      /* examples at 8 */
      caseAnnos.forEach(function (a, i) { base.showAnnotation(a, n === 8, 0.6 + i * 0.2); });
      rdAnnos.forEach(function (a, i) { base.showAnnotation(a, n === 8, 0.9 + i * 0.2); });
      base.invalidate();
    }

    /* controls: context (beats 3 to 6), role (7) */
    var controls = document.createElement('div'); controls.className = 'stage-controls';
    var g1 = document.createElement('div'); g1.className = 'ctl-group ctl-context'; g1.setAttribute('role', 'group'); g1.setAttribute('aria-label', 'Context');
    Object.keys(CONTEXTS).forEach(function (id) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ctl'; b.textContent = CONTEXTS[id].name; b.setAttribute('aria-pressed', id === state.context ? 'true' : 'false'); b.setAttribute('data-context', id);
      b.addEventListener('click', function () { state.context = id; Array.prototype.forEach.call(g1.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply(state.beat); });
      g1.appendChild(b);
    });
    var g2 = document.createElement('div'); g2.className = 'ctl-group ctl-role'; g2.setAttribute('role', 'group'); g2.setAttribute('aria-label', 'Role');
    Object.keys(ROLES).forEach(function (id) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ctl'; b.textContent = ROLES[id].name; b.setAttribute('aria-pressed', id === state.role ? 'true' : 'false'); b.setAttribute('data-role', id);
      b.addEventListener('click', function () { state.role = id; Array.prototype.forEach.call(g2.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply(state.beat); });
      g2.appendChild(b);
    });
    controls.appendChild(g1); controls.appendChild(g2); stage.appendChild(controls);

    /* ambient: a slow turn in the hero, and a soft breathing of the lit regions */
    base.ambient.push(function (now) {
      if (state.beat === 1) group.rotation.y = Math.PI + Math.sin(now / 5200) * 0.22; else group.rotation.y += (Math.PI - group.rotation.y) * 0.08;
      if (state.loaded) { placeRegionAnnos(); placeCards(); }
      return state.beat === 1 || Math.abs(group.rotation.y - Math.PI) > 0.002;
    });
    base.update = function () { if (dirty && state.loaded) { recolor(); dirty = false; } };

    /* load the asset: embedded data first (file:// safe), then the file */
    var loader = new T.GLTFLoader();
    var src = global.MTW_BRAIN_GLB || 'assets/brain.glb';
    loader.load(src, function (gltf) { build(gltf); apply(state.beat || 1); }, undefined, function () { stage.setAttribute('data-webgl', 'off'); });

    return {
      apply: apply, resize: base.resize,
      ground: function () { return 'stage'; }, legend: function () { return false; },
      probe: function () { return { beat: state.beat, context: state.context, role: state.role, loaded: state.loaded, lit: lit, webgl: true, camera: base.pose, annotations: base.annotations.filter(function (a) { return a.on; }).map(function (a) { return a.el.textContent; }) }; }
    };
  }
  global.MTWScenes = global.MTWScenes || {};
  global.MTWScenes.brain = { create: create };
})(window);
