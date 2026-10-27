/* The task field: one request opens into named glass nodes. Across the beats
   the same nodes change owner (person, agent, rules), a review node appears,
   sources and controls attach, one exception pauses a node and routes it to
   an owner, and the nodes reconnect as a running workflow over the systems
   the business already has. Four industry examples change the tasks, sources,
   controls and owner. Plain script, no modules: it runs from file:// too. */
(function (global) {
  'use strict';

  var COL = 300, ROW = 190, NW = 200, NH = 104;
  var LANE_Y = { H: -230, A: 0, R: 230 }, LPX = 215;
  var ROLE = { person: 'Person', agent: 'Agent', rules: 'Rules', review: 'Review' };
  var LANE_NAME = { H: 'People', A: 'Agents', R: 'Rules' };

  /* Grid slots: col 0..2, row 0..2. The review node takes the slot marked isNew and appears at beat 5.
     kind: context (the task the exception hits and the first agent step), prepare (second agent step),
     approve (stays with a person), records (the rules step). */
  var INDUSTRIES = [
    {
      id: 'utility', name: 'Utilities field training', short: 'Field training',
      request: ['An apprentice\'s in-field', 'evaluation arrives'],
      owner: 'Training specialist',
      sources: ['Training ledger', 'Curriculum', 'Evaluation form'],
      controls: { source: 'Owned by the training team', permission: 'Personal records: this program only', approval: 'Only the mentor approves' },
      systems: ['Microsoft 365', 'Power Platform', 'Second brain', 'Copilot'],
      tasks: [
        { id: 'receive',  label: ['Receive the', 'evaluation'],          col: 0, row: 0, after: 'rules',  lane: 'R', lc: 0 },
        { id: 'context',  label: ['Find the apprentice\'s', 'training record'], col: 1, row: 0, after: 'agent', lane: 'A', lc: 1, friction: 'missing context', kind: 'context' },
        { id: 'check',    label: ['Check it against', 'the curriculum'],  col: 2, row: 0, after: 'agent',  lane: 'A', lc: 2, friction: 'repeated entry' },
        { id: 'prepare',  label: ['Prepare the', 'progress summary'],     col: 0, row: 1, after: 'agent',  lane: 'A', lc: 3, kind: 'prepare' },
        { id: 'flag',     label: ['Flag a gap', 'to the mentor'],         col: 1, row: 1, after: 'person', lane: 'H', lc: 4, friction: 'waiting' },
        { id: 'approve',  label: ['Approve the', 'qualification step'],   col: 2, row: 1, after: 'person', lane: 'H', lc: 6, kind: 'approve' },
        { id: 'records',  label: ['Update the', 'training ledger'],       col: 0, row: 2, after: 'rules',  lane: 'R', lc: 7, friction: 'repeated entry', kind: 'records' },
        { id: 'notify',   label: ['Notify the', 'manager'],               col: 1, row: 2, after: 'rules',  lane: 'R', lc: 7, lc2: 8 },
        { id: 'review',   label: ['Review the', 'summary'],               col: 2, row: 2, after: 'review', lane: 'H', lc: 5, isNew: true }
      ]
    },
    {
      id: 'insurance', name: 'Insurance content migration', short: 'Content migration',
      request: ['A batch of policy pages', 'leaves the old system'],
      owner: 'Migration lead',
      sources: ['Mapping rules', 'Template library', 'Source inventory'],
      controls: { source: 'Owned by the content team', permission: 'Draft pages: never public', approval: 'Only the content owner releases' },
      systems: ['Content platform', 'Azure', 'Second brain', 'Claude and Codex'],
      tasks: [
        { id: 'receive',  label: ['Inventory the', 'source pages'],       col: 0, row: 0, after: 'rules',  lane: 'R', lc: 0 },
        { id: 'context',  label: ['Find the', 'mapping rules'],           col: 1, row: 0, after: 'agent',  lane: 'A', lc: 1, friction: 'missing context', kind: 'context' },
        { id: 'check',    label: ['Extract content', 'and metadata'],     col: 2, row: 0, after: 'agent',  lane: 'A', lc: 2, friction: 'repeated entry' },
        { id: 'prepare',  label: ['Transform to', 'the target template'], col: 0, row: 1, after: 'agent',  lane: 'A', lc: 3, kind: 'prepare' },
        { id: 'flag',     label: ['Validate against', 'the source'],      col: 1, row: 1, after: 'rules',  lane: 'R', lc: 4, friction: 'waiting' },
        { id: 'approve',  label: ['Approve the', 'batch'],                col: 2, row: 1, after: 'person', lane: 'H', lc: 6, kind: 'approve' },
        { id: 'records',  label: ['Deploy', 'the batch'],                 col: 0, row: 2, after: 'rules',  lane: 'R', lc: 7, kind: 'records' },
        { id: 'notify',   label: ['Report the', 'exceptions'],            col: 1, row: 2, after: 'rules',  lane: 'R', lc: 8, friction: 'lost in handoff' },
        { id: 'review',   label: ['Review the', 'transformed pages'],     col: 2, row: 2, after: 'review', lane: 'H', lc: 5, isNew: true }
      ]
    },
    {
      id: 'legal', name: 'Legal services case information', short: 'Case information',
      request: ['A closing-book order arrives', 'from a deal team'],
      owner: 'Deal team lead',
      sources: ['Matters system', 'Document repository', 'Precedent index'],
      controls: { source: 'Owned by knowledge management', permission: 'Ethical walls apply', approval: 'Only the responsible partner releases' },
      systems: ['Microsoft 365', 'Line-of-business system', 'Second brain', 'Copilot'],
      tasks: [
        { id: 'receive',  label: ['Receive', 'the order'],                col: 0, row: 0, after: 'rules',  lane: 'R', lc: 0 },
        { id: 'context',  label: ['Find the', 'final documents'],         col: 1, row: 0, after: 'agent',  lane: 'A', lc: 2, friction: 'missing context', kind: 'context' },
        { id: 'check',    label: ['Check the', 'ethical wall'],           col: 2, row: 0, after: 'rules',  lane: 'R', lc: 1 },
        { id: 'prepare',  label: ['Assemble the', 'closing book'],        col: 0, row: 1, after: 'agent',  lane: 'A', lc: 3, kind: 'prepare' },
        { id: 'flag',     label: ['Verify', 'completeness'],              col: 1, row: 1, after: 'rules',  lane: 'R', lc: 4, friction: 'waiting' },
        { id: 'approve',  label: ['Approve', 'the release'],              col: 2, row: 1, after: 'person', lane: 'H', lc: 6, kind: 'approve' },
        { id: 'records',  label: ['Record', 'the order'],                 col: 0, row: 2, after: 'rules',  lane: 'R', lc: 7, friction: 'repeated entry', kind: 'records' },
        { id: 'notify',   label: ['Deliver and', 'notify the team'],      col: 1, row: 2, after: 'rules',  lane: 'R', lc: 8, friction: 'lost in handoff' },
        { id: 'review',   label: ['Review the', 'assembled book'],        col: 2, row: 2, after: 'review', lane: 'H', lc: 5, isNew: true }
      ]
    },
    {
      id: 'nonprofit', name: 'Nonprofit collaboration', short: 'Grant reporting',
      request: ['A grant report is due', 'to a funder'],
      owner: 'Program lead',
      sources: ['Grant agreement', 'Last report', 'Program updates'],
      controls: { source: 'Owned by the program team', permission: 'Funder data stays in its site', approval: 'Only the director approves' },
      systems: ['Microsoft 365', 'Finance system', 'Second brain', 'Copilot'],
      tasks: [
        { id: 'receive',  label: ['Gather updates', 'from the teams'],    col: 0, row: 0, after: 'rules',  lane: 'R', lc: 0, friction: 'waiting' },
        { id: 'context',  label: ['Find the funder\'s', 'format and last report'], col: 1, row: 0, after: 'agent', lane: 'A', lc: 1, friction: 'missing context', kind: 'context' },
        { id: 'check',    label: ['Reconcile the', 'figures with finance'], col: 2, row: 0, after: 'rules', lane: 'R', lc: 3, friction: 'repeated entry' },
        { id: 'prepare',  label: ['Draft the', 'narrative'],              col: 0, row: 1, after: 'agent',  lane: 'A', lc: 2, kind: 'prepare' },
        { id: 'flag',     label: ['Program lead', 'reviews'],             col: 1, row: 1, after: 'person', lane: 'H', lc: 4 },
        { id: 'approve',  label: ['Director', 'approves'],                col: 2, row: 1, after: 'person', lane: 'H', lc: 6, kind: 'approve' },
        { id: 'records',  label: ['File it in the', 'grants library'],    col: 0, row: 2, after: 'rules',  lane: 'R', lc: 7, kind: 'records' },
        { id: 'notify',   label: ['Send it to', 'the funder'],            col: 1, row: 2, after: 'rules',  lane: 'R', lc: 8, friction: 'lost in handoff' },
        { id: 'review',   label: ['Review the', 'draft'],                 col: 2, row: 2, after: 'review', lane: 'H', lc: 5, isNew: true }
      ]
    }
  ];

  /* Beat flags. 1 hero (request card), 2 open plus friction, 3 rules step, 4 agent steps,
     5 review node, 6 sources and controls, 7 exception, 8 lanes. */
  var BEATS = {
    1: { mode: 'hero',  flags: [] },
    2: { mode: 'grid',  flags: ['open', 'friction'] },
    3: { mode: 'grid',  flags: ['open', 'friction', 'rules'] },
    4: { mode: 'grid',  flags: ['open', 'friction', 'rules', 'agents', 'legend'] },
    5: { mode: 'grid',  flags: ['open', 'friction', 'rules', 'agents', 'legend', 'review'] },
    6: { mode: 'grid',  flags: ['open', 'friction', 'rules', 'agents', 'legend', 'review', 'controls'] },
    7: { mode: 'grid',  flags: ['open', 'friction', 'rules', 'agents', 'legend', 'review', 'controls', 'exception'] },
    8: { mode: 'lanes', flags: ['open', 'rules', 'agents', 'legend', 'review', 'lanes'] }
  };
  var FLAGS = ['open', 'friction', 'rules', 'agents', 'legend', 'review', 'controls', 'exception', 'lanes'];
  /* Camera per beat: scale and the world point to keep at the stage anchor. */
  var CAMERA = {
    1: { s: 0.7, fx: 0, fy: 0 },
    2: { s: 1.15, fx: 0, fy: 0 },
    3: { s: 1.15, fx: 0, fy: 20 },
    4: { s: 1.25, fx: -110, fy: -80 },
    5: { s: 1.22, fx: 90, fy: 50 },
    6: { s: 1.0, fx: -150, fy: -10 },
    7: { s: 1.0, fx: -150, fy: -100 },
    8: { s: 0.6, fx: -200, fy: 70 }
  };

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function gridPos(t) { return { x: (t.col - 1) * COL, y: (t.row - 1) * ROW }; }
  function lanePos(t) { return { x: ((t.lc2 !== undefined ? t.lc2 : t.lc) - 4) * LPX, y: LANE_Y[t.lane] }; }
  function order(ind) { return ind.tasks.slice().sort(function (a, b) { return (a.lc2 !== undefined ? a.lc2 : a.lc) - (b.lc2 !== undefined ? b.lc2 : b.lc); }); }
  function byKind(ind, kind) { return ind.tasks.filter(function (t) { return t.kind === kind; })[0]; }

  function create(stage, opts) {
    opts = opts || {};
    var world = h('div', 'world');
    var camera = stage.querySelector('.camera') || stage.appendChild(h('div', 'camera'));
    camera.appendChild(world);

    var wires = s('svg', { class: 'wires', viewBox: '-800 -450 1600 900', 'aria-hidden': 'true', focusable: 'false' });
    var defs = s('defs');
    var marker = s('marker', { id: 'wf-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    marker.appendChild(s('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'currentColor' }));
    defs.appendChild(marker);
    wires.appendChild(defs);
    var gLanes = s('g', { class: 'w-lanes' });
    var gRules = s('g', { class: 'w-rules' });
    var gLeaders = s('g', { class: 'w-leaders' });
    var gRoute = s('g', { class: 'w-route' });
    var gEx = s('g', { class: 'w-exception' });
    [gLanes, gRules, gLeaders, gRoute, gEx].forEach(function (g) { wires.appendChild(g); });
    world.appendChild(wires);

    var laneLabels = h('div', 'lane-labels');
    world.appendChild(laneLabels);
    var docs = h('div', 'docs');
    world.appendChild(docs);
    var request = h('div', 'request glass');
    world.appendChild(request);
    var nodesEl = h('div', 'nodes');
    world.appendChild(nodesEl);
    var ownerChip = h('div', 'owner-chip glass');
    world.appendChild(ownerChip);
    var systems = h('div', 'systems');
    world.appendChild(systems);

    var state = { beat: 0, industry: INDUSTRIES[0], exception: null, view: null, nodes: {}, docEls: [] };

    function buildIndustry(ind) {
      nodesEl.innerHTML = '';
      state.nodes = {};
      ind.tasks.forEach(function (t, i) {
        var n = h('div', 'node');
        n.setAttribute('data-id', t.id);
        n.setAttribute('data-role', 'person');
        n.setAttribute('data-hidden', 'true');
        n.style.setProperty('--i', i);
        var inner = h('div', 'node-in glass');
        var role = h('span', 'role', ROLE.person);
        var label = h('span', 'label');
        label.appendChild(h('span', '', t.label[0]));
        label.appendChild(h('span', '', t.label[1]));
        inner.appendChild(role);
        inner.appendChild(label);
        if (t.friction) {
          var f = h('span', 'friction');
          f.appendChild(h('i', 'dot'));
          f.appendChild(h('span', 'f-label', t.friction));
          inner.appendChild(f);
        }
        var ctl = h('span', 'control');
        inner.appendChild(ctl);
        n.appendChild(inner);
        nodesEl.appendChild(n);
        state.nodes[t.id] = n;
      });
      request.innerHTML = '';
      var rq = h('p', 'request-text');
      rq.appendChild(h('span', '', ind.request[0]));
      rq.appendChild(h('span', '', ind.request[1]));
      request.appendChild(rq);
      request.appendChild(h('p', 'request-sub', 'Illustrative example: ' + ind.name.toLowerCase()));
      docs.innerHTML = '';
      var title = h('p', 'docs-title', 'Sources');
      docs.appendChild(title);
      state.docEls = ind.sources.map(function (name, i) {
        var d = h('div', 'doc glass');
        d.style.setProperty('--i', i);
        d.appendChild(h('span', 'doc-shape'));
        d.appendChild(h('span', 'doc-label', name));
        docs.appendChild(d);
        return d;
      });
      var own = h('p', 'docs-owner');
      own.appendChild(h('i', 'lock'));
      own.appendChild(h('span', '', ind.controls.source));
      docs.appendChild(own);
      ownerChip.innerHTML = '';
      ownerChip.appendChild(h('span', 'role', 'Owner'));
      ownerChip.appendChild(h('span', 'label', ind.owner));
      systems.innerHTML = '';
      systems.appendChild(h('span', 'systems-title', 'Runs on the systems already in place'));
      ind.systems.forEach(function (sys) { systems.appendChild(h('span', 'chip', sys)); });
      laneLabels.innerHTML = '';
      ['H', 'A', 'R'].forEach(function (l) {
        var el = h('span', 'lane-label', LANE_NAME[l]);
        el.style.top = (450 + LANE_Y[l] - 95) + 'px';
        el.style.left = '-176px';
        laneLabels.appendChild(el);
      });
      gLanes.innerHTML = '';
      ['H', 'A', 'R'].forEach(function (l, k) {
        gLanes.appendChild(s('rect', { class: 'lane-band' + (k % 2 ? ' alt' : ''), x: -990, y: LANE_Y[l] - 100, width: 1980, height: 200, rx: 4 }));
      });
    }

    function roleAt(t, b) {
      var f = b.flags;
      if (t.isNew) return 'review';
      if (t.after === 'rules' && t.kind === 'records' && f.indexOf('rules') >= 0) return 'rules';
      if (t.after === 'rules' && f.indexOf('lanes') >= 0) return 'rules';
      if (t.after === 'agent' && f.indexOf('agents') >= 0) return 'agent';
      if (t.after === 'rules' && t.kind !== 'records' && f.indexOf('agents') >= 0) return 'rules';
      return 'person';
    }
    function focusAt(b) {
      var ind = state.industry;
      if (b === 4) return [byKind(ind, 'context').id, byKind(ind, 'prepare').id];
      if (b === 5) return [byKind(ind, 'approve').id, 'review'];
      if (b === 7) return [byKind(ind, 'context').id];
      return null;
    }
    function pathBetween(a, b, side) {
      /* orthogonal hook from a's right edge to b's left edge in world coordinates */
      var ax = a.x + NW / 2, ay = a.y, bx = b.x - NW / 2, by = b.y;
      if (Math.abs(ay - by) < 1) return 'M ' + ax + ' ' + ay + ' H ' + bx;
      var mx = side === 'left' ? (ax + 24) : ((ax + bx) / 2);
      return 'M ' + ax + ' ' + ay + ' H ' + mx + ' V ' + by + ' H ' + bx;
    }

    function drawRules(ind, on) {
      gRules.innerHTML = '';
      if (!on) return;
      var rec = byKind(ind, 'records');
      var prev = ind.tasks.filter(function (t) { return t.kind === 'approve'; })[0];
      var a = gridPos(prev), b = gridPos(rec);
      var d = 'M ' + a.x + ' ' + (a.y + NH / 2) + ' V ' + (a.y + NH / 2 + 58) + ' H ' + (b.x + NW / 2 + 18) + ' V ' + b.y + ' H ' + (b.x + NW / 2);
      var p = s('path', { class: 'rule-path', d: d, pathLength: '1', 'marker-end': 'url(#wf-arrow)' });
      gRules.appendChild(p);
      var t = s('text', { class: 'rule-text', x: b.x + NW / 2 + 34, y: a.y + NH / 2 + 58 + 18 });
      t.textContent = 'rules: when approved, write the record';
      gRules.appendChild(t);
    }
    function drawLeaders(ind, on) {
      gLeaders.innerHTML = '';
      if (!on) return;
      var ctx = gridPos(byKind(ind, 'context')), prep = gridPos(byKind(ind, 'prepare'));
      var targets = [ctx, prep, ctx];
      var gridLeft = -COL - NW / 2, topEdge = -ROW - NH / 2;
      state.docEls.forEach(function (d, i) {
        var y = -300 + i * 96; /* doc chip centre y in world coords */
        var to = targets[i];
        var path;
        if (to.x <= gridLeft + NW) {
          path = 'M -560 ' + y + ' H ' + (gridLeft - 40) + ' V ' + (to.y + (i === 1 ? 0 : -22)) + ' H ' + (to.x - NW / 2);
        } else {
          var over = topEdge - 26 - i * 16, xin = to.x + (i === 2 ? 34 : -34);
          path = 'M -560 ' + y + ' H ' + (gridLeft - 40 - i * 14) + ' V ' + over + ' H ' + xin + ' V ' + (to.y - NH / 2);
        }
        var p = s('path', { class: 'leader', d: path, pathLength: '1' });
        p.style.setProperty('--i', i);
        gLeaders.appendChild(p);
      });
    }
    function drawException(ind, on) {
      gEx.innerHTML = '';
      ownerChip.setAttribute('data-on', on ? 'true' : 'false');
      if (!on) return;
      var c = gridPos(byKind(ind, 'context'));
      var ox = c.x, oy = -390;
      ownerChip.style.transform = 'translate(' + (800 + ox - 110) + 'px, ' + (450 + oy - 26) + 'px)';
      var up = 'M ' + (c.x - 40) + ' ' + (c.y - NH / 2) + ' V ' + (oy + 30);
      var down = 'M ' + (c.x + 40) + ' ' + (oy + 30) + ' V ' + (c.y - NH / 2);
      gEx.appendChild(s('path', { class: 'ex-path ex-up', d: up, pathLength: '1', 'marker-end': 'url(#wf-arrow)' }));
      gEx.appendChild(s('path', { class: 'ex-path ex-down', d: down, pathLength: '1', 'marker-end': 'url(#wf-arrow)' }));
      var t = s('text', { class: 'ex-text', x: c.x - 52, y: (oy + c.y) / 2 + 4 });
      t.textContent = 'missing source';
      gEx.appendChild(t);
      var t2 = s('text', { class: 'ex-text ex-text-right', x: c.x + 52, y: (oy + c.y) / 2 + 4 });
      t2.textContent = 'resolved, back to work';
      gEx.appendChild(t2);
    }
    function drawRoute(ind, on) {
      gRoute.innerHTML = '';
      if (!on) return;
      var seq = order(ind), d = '', prev = null;
      seq.forEach(function (t) {
        var p = lanePos(t);
        if (prev) {
          if (Math.abs(prev.y - p.y) < 1) d += ' M ' + (prev.x + NW / 2) + ' ' + prev.y + ' H ' + (p.x - NW / 2);
          else d += ' M ' + (prev.x + NW / 2) + ' ' + prev.y + ' H ' + (p.x - NW / 2 - 30) + ' V ' + p.y + ' H ' + (p.x - NW / 2);
        }
        prev = p;
      });
      gRoute.appendChild(s('path', { class: 'route', d: d.trim(), pathLength: '1' }));
      var pulse = s('circle', { class: 'route-pulse', r: '5' });
      pulse.style.offsetPath = 'path("' + d.trim() + '")';
      gRoute.appendChild(pulse);
    }

    function apply(n) {
      var b = BEATS[n] || BEATS[8];
      var ind = state.industry;
      state.beat = n;
      var flags = b.flags.slice();
      if (state.view === 'today' && n >= 3 && n < 8) flags = ['open', 'friction'];
      if (state.exception === true && flags.indexOf('open') >= 0 && n < 8) { if (flags.indexOf('exception') < 0) flags.push('exception'); }
      if (state.exception === false) flags = flags.filter(function (f) { return f !== 'exception'; });
      var mode = b.mode;
      world.setAttribute('data-mode', mode);
      FLAGS.forEach(function (f) { world.classList.toggle('f-' + f, flags.indexOf(f) >= 0); });
      var focus = focusAt(n);
      var fb = { flags: flags };
      var ctxId = byKind(ind, 'context').id;
      ind.tasks.forEach(function (t) {
        var el = state.nodes[t.id];
        var p = mode === 'lanes' ? lanePos(t) : (mode === 'grid' ? gridPos(t) : { x: 0, y: 0 });
        el.style.transform = 'translate(' + (800 + p.x - NW / 2) + 'px, ' + (450 + p.y - NH / 2) + 'px)';
        var hidden = mode === 'hero' || (t.isNew && flags.indexOf('review') < 0);
        el.setAttribute('data-hidden', hidden ? 'true' : 'false');
        var role = roleAt(t, fb);
        el.setAttribute('data-role', role);
        el.querySelector('.role').textContent = ROLE[role];
        el.setAttribute('data-focus', hidden ? 'none' : (focus ? (focus.indexOf(t.id) >= 0 ? 'in' : 'out') : 'none'));
        el.setAttribute('data-paused', flags.indexOf('exception') >= 0 && t.id === ctxId ? 'true' : 'false');
        var ctl = el.querySelector('.control');
        var ctlText = '';
        if (flags.indexOf('controls') >= 0) {
          if (t.id === ctxId) ctlText = ind.controls.permission;
          if (t.kind === 'approve') ctlText = ind.controls.approval;
        }
        ctl.textContent = ctlText;
        el.setAttribute('data-control', ctlText ? 'true' : 'false');
      });
      var cam = CAMERA[n] || CAMERA[8];
      stage.style.setProperty('--beat-s', cam.s);
      stage.style.setProperty('--fx', cam.fx);
      stage.style.setProperty('--fy', cam.fy);
      drawRules(ind, flags.indexOf('rules') >= 0 && mode === 'grid');
      drawLeaders(ind, flags.indexOf('controls') >= 0 && flags.indexOf('exception') < 0 && mode === 'grid');
      drawException(ind, flags.indexOf('exception') >= 0 && mode === 'grid');
      drawRoute(ind, mode === 'lanes');
      var ctrls = stage.querySelector('.stage-controls');
      if (ctrls) ctrls.setAttribute('data-beat', String(n));
      return api;
    }

    /* Controls: industry selector, today/redesigned, exception trigger. */
    function buildControls() {
      var wrap = h('div', 'stage-controls');
      var group = h('div', 'ctl-group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Industry example');
      INDUSTRIES.forEach(function (ind, i) {
        var btn = h('button', 'ctl', ind.short);
        btn.type = 'button';
        btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        btn.setAttribute('data-industry', ind.id);
        btn.addEventListener('click', function () { setIndustry(ind.id); });
        group.appendChild(btn);
      });
      wrap.appendChild(group);
      var g2 = h('div', 'ctl-group');
      g2.setAttribute('role', 'group');
      g2.setAttribute('aria-label', 'Compare');
      var today = h('button', 'ctl', 'Today');
      today.type = 'button'; today.setAttribute('aria-pressed', 'false'); today.setAttribute('data-view', 'today');
      var redo = h('button', 'ctl', 'Redesigned');
      redo.type = 'button'; redo.setAttribute('aria-pressed', 'true'); redo.setAttribute('data-view', 'redesigned');
      today.addEventListener('click', function () { setView('today'); });
      redo.addEventListener('click', function () { setView(null); });
      g2.appendChild(today); g2.appendChild(redo);
      wrap.appendChild(g2);
      var g3 = h('div', 'ctl-group');
      var ex = h('button', 'ctl ctl-ex', 'Trigger an exception');
      ex.type = 'button'; ex.setAttribute('aria-pressed', 'false');
      ex.addEventListener('click', function () { setException(state.exception === true || (state.exception === null && state.beat === 7) ? false : true); });
      g3.appendChild(ex);
      wrap.appendChild(g3);
      stage.appendChild(wrap);
      state.ctl = { wrap: wrap, today: today, redo: redo, ex: ex };
    }
    function setIndustry(id) {
      var ind = INDUSTRIES.filter(function (x) { return x.id === id; })[0];
      if (!ind || ind === state.industry) return;
      state.industry = ind;
      world.setAttribute('data-swapping', 'true');
      Array.prototype.forEach.call(state.ctl.wrap.querySelectorAll('[data-industry]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-industry') === id ? 'true' : 'false'); });
      window.setTimeout(function () {
        buildIndustry(ind);
        apply(state.beat);
        window.requestAnimationFrame(function () { world.setAttribute('data-swapping', 'false'); });
      }, opts.reduced && opts.reduced() ? 0 : 220);
      document.dispatchEvent(new CustomEvent('mtw:industry', { detail: { id: id, name: ind.name } }));
    }
    function setView(v) {
      state.view = v;
      state.ctl.today.setAttribute('aria-pressed', v === 'today' ? 'true' : 'false');
      state.ctl.redo.setAttribute('aria-pressed', v === 'today' ? 'false' : 'true');
      apply(state.beat);
    }
    function setException(on) {
      state.exception = on;
      state.ctl.ex.setAttribute('aria-pressed', on ? 'true' : 'false');
      state.ctl.ex.textContent = on ? 'Restore the route' : 'Trigger an exception';
      apply(state.beat);
    }

    function fit() {
      var w = stage.clientWidth, hh = stage.clientHeight, narrow = w < 900;
      var f = narrow ? Math.min((w - 16) / 1600, (hh * 0.55) / 900) : Math.min((w * 0.72) / 1600, (hh - 130) / 900);
      f = Math.max(0.3, Math.min(1.2, f));
      stage.style.setProperty('--fit', f.toFixed(3));
      stage.style.setProperty('--cx', narrow ? '50%' : '58%');
      stage.style.setProperty('--cy', narrow ? '38%' : '50%');
    }

    buildIndustry(state.industry);
    buildControls();
    var legendHolder = stage.querySelector('[data-legend-holder]');
    if (legendHolder) legendHolder.innerHTML = legendHTML(true);

    var api = {
      apply: function (n) {
        /* entering beat 7 by scroll arms the exception; leaving it clears a manual state */
        if (n === 7 && state.exception === false) state.exception = null;
        if (n !== 7 && state.exception === true) { /* keep a manual exception until the visitor restores it */ }
        if (state.ctl) { state.ctl.ex.setAttribute('aria-pressed', (n === 7 && state.exception !== false) || state.exception === true ? 'true' : 'false'); state.ctl.ex.textContent = ((n === 7 && state.exception !== false) || state.exception === true) ? 'Restore the route' : 'Trigger an exception'; }
        return apply(n);
      },
      ground: function (n) { return n === 1 ? 'plate' : 'stage'; },
      legend: function (n) { return n >= 4; },
      resize: fit,
      setIndustry: setIndustry,
      setView: setView,
      setException: setException,
      world: world,
      probe: function () {
        var out = { beat: state.beat, industry: state.industry.id, mode: world.getAttribute('data-mode'), flags: world.className, camera: getComputedStyle(camera).transform, nodes: {} };
        Object.keys(state.nodes).forEach(function (id) {
          var r = state.nodes[id].getBoundingClientRect();
          out.nodes[id] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), role: state.nodes[id].getAttribute('data-role'), hidden: state.nodes[id].getAttribute('data-hidden'), focus: state.nodes[id].getAttribute('data-focus') };
        });
        return out;
      }
    };
    return api;
  }

  function legendHTML(withTitle) {
    var items = [['person', 'Person'], ['agent', 'Agent'], ['rules', 'Rules'], ['review', 'New review work']];
    var out = '<div class="legend">';
    if (withTitle) out += '<p class="legend-title">Who does each task after the redesign</p>';
    out += '<ul>';
    items.forEach(function (it) { out += '<li><span class="swatch" data-role="' + it[0] + '"></span><span>' + it[1] + '</span></li>'; });
    return out + '</ul></div>';
  }

  global.MTWScenes = global.MTWScenes || {};
  global.MTWScenes.field = { create: create, INDUSTRIES: INDUSTRIES, BEATS: BEATS, legendHTML: legendHTML };
})(window);
