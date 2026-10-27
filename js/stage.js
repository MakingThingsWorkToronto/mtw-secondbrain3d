/* Pinned-stage beat controller, scene-agnostic.
   A .sequence holds one sticky .stage[data-stage][data-scene] and a column of
   .slot cards. A slot becomes the active beat when its card's top crosses 88%
   of the viewport height (rAF-throttled scroll listener, gated by an
   IntersectionObserver). The controller sets data-beat on the stage and calls
   the registered scene's apply(beat). Scenes register themselves on
   window.MTWScenes[name] = { create: function (stage, opts) -> api } where api
   has apply(n), and optionally ground(n), legend(n), probe(). Native scroll
   only: no wheel handling, no continuation, no snapping. */
(function () {
  'use strict';
  var stage = document.querySelector('.stage[data-stage]');
  if (!stage) return;
  var name = stage.getAttribute('data-scene') || 'field';
  var scenes = window.MTWScenes || {};
  var factory = scenes[name];
  if (!factory) { stage.setAttribute('data-scene-state', 'missing'); return; }

  var seq = stage.closest('.sequence');
  var slots = Array.prototype.slice.call(seq.querySelectorAll('.slot'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return reduce.matches || document.documentElement.getAttribute('data-motion') === 'reduce'; }
  var index = stage.querySelector('.beat-index');
  var current = 0, ticking = false, watching = true;

  var api = factory.create(stage, { beats: slots.length, reduced: reduced });

  function threshold() { return Math.max(window.innerHeight, 400) * 0.88; }

  function measure() {
    var t = threshold(), idx = 0;
    for (var i = 1; i < slots.length; i++) {
      var card = slots[i].querySelector('.card') || slots[i];
      if (card.getBoundingClientRect().top < t) idx = i; else break;
    }
    setBeat(idx + 1);
  }

  function setBeat(n) {
    if (n === current) return;
    var prev = current;
    current = n;
    stage.setAttribute('data-beat', String(n));
    var ground = api.ground ? api.ground(n) : (n === 1 ? 'plate' : 'stage');
    stage.setAttribute('data-ground', ground);
    stage.setAttribute('data-legend', api.legend && api.legend(n) ? 'true' : 'false');
    stage.setAttribute('data-scheme-section', 'dark');
    api.apply(n, prev);
    if (index) {
      Array.prototype.forEach.call(index.querySelectorAll('a'), function (a, i) {
        if (i + 1 === n) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    slots.forEach(function (s, i) { s.setAttribute('data-active', i + 1 === n ? 'true' : 'false'); });
    document.dispatchEvent(new CustomEvent('mtw:beat', { detail: { beat: n, scene: name } }));
    document.dispatchEvent(new CustomEvent('mtw:scheme'));
  }

  function onScroll() {
    if (!watching || ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; measure(); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      watching = entries[0].isIntersecting;
      if (watching) measure();
    }, { rootMargin: '25% 0px' });
    io.observe(seq);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { if (api.resize) api.resize(); });

  /* Beat index: anchor jumps work without JS; with JS they respect reduced motion. */
  if (index) {
    index.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#beat-"]');
      if (!a) return;
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY;
      if (target.classList.contains('slot-hero')) top = 0;
      window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
      try { if (history.replaceState) history.replaceState(null, '', a.getAttribute('href')); } catch (err) { /* file:// may refuse */ }
    });
  }

  /* The rendered plate: mark the stage when it loads. */
  var plateImg = stage.querySelector('.stage-plate img');
  function plateReady() { stage.setAttribute('data-plate', plateImg && plateImg.naturalWidth > 0 ? 'true' : 'false'); }
  if (plateImg) {
    if (plateImg.complete) plateReady();
    plateImg.addEventListener('load', plateReady);
    plateImg.addEventListener('error', function () { stage.setAttribute('data-plate', 'false'); });
  }

  if (api.resize) api.resize();
  measure();
  if (current === 0) setBeat(1);

  window.MTWStage = {
    stage: stage,
    scene: api,
    get beat() { return current; },
    setBeat: setBeat,
    measure: measure,
    slots: slots,
    probe: function () { return api.probe ? api.probe() : { beat: current }; }
  };
})();
