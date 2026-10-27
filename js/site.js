/* Shared behaviour: header scheme, navigation, rail, in-page scrolling,
   inline fields on sub-pages, contact form, reading-view switch, WebMCP. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return reduce.matches || root.getAttribute('data-motion') === 'reduce'; }

  /* ---------- reading view switch (?view=reading) ---------- */
  var params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'reading') {
    var readingHref = root.getAttribute('data-reading') || 'reading.html';
    var pageId = root.getAttribute('data-page') || '';
    window.location.replace(readingHref + (pageId ? '#' + pageId : ''));
    return;
  }
  if (params.get('motion') === 'reduce') root.setAttribute('data-motion', 'reduce');

  /* ---------- header scheme: dark over dark sections, light over paper ---------- */
  var headerH = function () { return parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 64; };
  function schemeAt() {
    var y = headerH() * 0.6;
    var sections = doc.querySelectorAll('[data-scheme-section]');
    var scheme = 'light';
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { scheme = sections[i].getAttribute('data-scheme-section'); }
    }
    if (root.getAttribute('data-scheme') !== scheme) root.setAttribute('data-scheme', scheme);
  }
  var schemeTick = false;
  function onScrollScheme() {
    if (schemeTick) return;
    schemeTick = true;
    window.requestAnimationFrame(function () { schemeTick = false; schemeAt(); railUpdate(); });
  }
  window.addEventListener('scroll', onScrollScheme, { passive: true });
  window.addEventListener('resize', onScrollScheme);
  doc.addEventListener('mtw:scheme', schemeAt);

  /* ---------- smooth in-page links, respecting reduced motion ---------- */
  function scrollToEl(el) {
    var top = el.getBoundingClientRect().top + window.scrollY - (el.classList.contains('slot') ? 0 : headerH() + 8);
    if (el.classList.contains('slot-hero')) top = 0;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-scroll]');
    if (!a) return;
    var target = doc.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    scrollToEl(target);
    try { if (history.replaceState) history.replaceState(null, '', a.getAttribute('href')); } catch (err) { /* file:// may refuse; the scroll already happened */ }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- navigation ---------- */
  var nav = doc.querySelector('.site-nav');
  if (nav) {
    var toggle = nav.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.getAttribute('data-open') === 'true';
        nav.setAttribute('data-open', open ? 'false' : 'true');
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    }
    var menu = nav.querySelector('.menu');
    if (menu) {
      var btn = menu.querySelector('button');
      function setMenu(open) { menu.setAttribute('data-open', open ? 'true' : 'false'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
      btn.addEventListener('click', function () { setMenu(menu.getAttribute('data-open') !== 'true'); });
      doc.addEventListener('click', function (e) { if (!menu.contains(e.target)) setMenu(false); });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') { setMenu(false); btn.focus(); }
      });
      menu.addEventListener('keydown', function (e) {
        var links = Array.prototype.slice.call(menu.querySelectorAll('.menu-panel a'));
        var i = links.indexOf(doc.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); if (menu.getAttribute('data-open') !== 'true') setMenu(true); (links[i + 1] || links[0]).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (links[i - 1] || links[links.length - 1]).focus(); }
      });
    }
  }

  /* ---------- rail: stage labels built from [data-rail-label] elements ---------- */
  var rail = doc.querySelector('.rail');
  var railTargets = [];
  if (rail) {
    railTargets = Array.prototype.slice.call(doc.querySelectorAll('[data-rail-label]'));
    railTargets.forEach(function (t, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'rail-item';
      b.setAttribute('aria-label', t.getAttribute('data-rail-label'));
      b.innerHTML = '<span class="rail-label" aria-hidden="true">' + t.getAttribute('data-rail-label') + '</span>';
      b.addEventListener('click', function () { scrollToEl(t); });
      rail.appendChild(b);
      void i;
    });
  }
  function railUpdate() {
    if (!rail || !railTargets.length) return;
    var line = Math.max(window.innerHeight, 400) * 0.5, active = 0;
    for (var i = 0; i < railTargets.length; i++) {
      if (railTargets[i].getBoundingClientRect().top < line) active = i;
    }
    Array.prototype.forEach.call(rail.children, function (b, i) {
      if (i === active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  /* ---------- inline fields (sub-pages) ---------- */
  var inlineFields = [];
  if (window.MTWField) {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-field-beat]'), function (holder) {
      var beat = parseInt(holder.getAttribute('data-field-beat'), 10) || 2;
      var viewBox = holder.getAttribute('data-viewbox') || undefined;
      var f = window.MTWField.create(holder, { mode: 'inline', viewBox: viewBox });
      f.apply(2);
      inlineFields.push({ api: f, beat: beat, holder: holder, done: false });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-glyph]'), function (holder) {
      holder.innerHTML = window.MTWField.glyph(parseInt(holder.getAttribute('data-glyph'), 10));
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-legend-holder]'), function (holder) {
      holder.innerHTML = window.MTWField.legendHTML(holder.getAttribute('data-legend-holder') !== 'notitle');
    });
    if (inlineFields.length) {
      var play = function (item) {
        if (item.done) return;
        item.done = true;
        window.setTimeout(function () { item.api.apply(item.beat); }, reduced() ? 0 : 450);
      };
      if ('IntersectionObserver' in window) {
        var fio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            inlineFields.forEach(function (item) { if (item.holder === en.target) { play(item); fio.unobserve(en.target); } });
          });
        }, { threshold: 0.35 });
        inlineFields.forEach(function (item) { fio.observe(item.holder); });
      } else {
        inlineFields.forEach(play);
      }
    }
    /* Approach page: step through the method by hand. */
    var control = doc.querySelector('.stage-control');
    if (control && inlineFields.length) {
      var item0 = inlineFields[0];
      var caption = doc.querySelector('.stage-caption');
      control.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-beat]');
        if (!b) return;
        Array.prototype.forEach.call(control.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        item0.done = true;
        item0.api.apply(parseInt(b.getAttribute('data-beat'), 10));
        if (caption) caption.textContent = b.getAttribute('data-caption') || '';
      });
      control.addEventListener('keydown', function (e) {
        var btns = Array.prototype.slice.call(control.querySelectorAll('button'));
        var i = btns.indexOf(doc.activeElement);
        if (i < 0) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); (btns[i + 1] || btns[0]).focus(); (btns[i + 1] || btns[0]).click(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); (btns[i - 1] || btns[btns.length - 1]).focus(); (btns[i - 1] || btns[btns.length - 1]).click(); }
      });
    }
  }

  /* ---------- contact form: client-side validation, mailto, no backend ---------- */
  var form = doc.querySelector('form[data-contact]');
  if (form) {
    var status = form.querySelector('.form-status');
    var fields = {
      name: { el: form.querySelector('#contact-name'), check: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name so I know who I am writing back to.'; } },
      email: { el: form.querySelector('#contact-email'), check: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter an email address I can reply to, such as name@company.com.'; } },
      message: { el: form.querySelector('#contact-message'), check: function (v) { return v.trim().length >= 20 ? '' : 'Please describe what needs to work better in at least a sentence or two.'; } }
    };
    function validate(key, show) {
      var f = fields[key], row = f.el.closest('.field-row'), err = row.querySelector('.field-error');
      var msg = f.check(f.el.value);
      if (show || row.getAttribute('data-invalid') === 'true') {
        row.setAttribute('data-invalid', msg ? 'true' : 'false');
        f.el.setAttribute('aria-invalid', msg ? 'true' : 'false');
        err.textContent = msg;
      }
      return !msg;
    }
    Object.keys(fields).forEach(function (k) {
      fields[k].el.addEventListener('blur', function () { validate(k, fields[k].el.value.trim() !== ''); });
      fields[k].el.addEventListener('input', function () { validate(k, false); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      Object.keys(fields).forEach(function (k) { var v = validate(k, true); if (!v) { ok = false; if (!first) first = fields[k].el; } });
      var submit = form.querySelector('button[type="submit"]');
      if (!ok) {
        status.setAttribute('data-state', 'error');
        status.textContent = 'A few details are missing. The fields that need attention are marked below.';
        first.focus();
        return;
      }
      submit.classList.add('btn-loading');
      submit.setAttribute('aria-disabled', 'true');
      var org = form.querySelector('#contact-org') ? form.querySelector('#contact-org').value.trim() : '';
      var body = 'From: ' + fields.name.el.value.trim() + (org ? ' (' + org + ')' : '') + '\nReply to: ' + fields.email.el.value.trim() + '\n\n' + fields.message.el.value.trim();
      var href = 'mailto:matt@makingthings.work?subject=' + encodeURIComponent('What needs to work better: ' + fields.name.el.value.trim()) + '&body=' + encodeURIComponent(body);
      window.setTimeout(function () {
        submit.classList.remove('btn-loading');
        submit.removeAttribute('aria-disabled');
        status.setAttribute('data-state', 'success');
        status.textContent = 'Thank you. Your email app should now open with the message ready to send. If it does not, write to matt@makingthings.work and include what you typed above.';
        status.focus();
        if (params.get('nomail') !== '1') window.location.href = href;
      }, reduced() ? 0 : 450);
    });
  }

  /* ---------- WebMCP (feature-detected; degrades to nothing) ---------- */
  if ('modelContext' in doc && doc.modelContext && typeof doc.modelContext.registerTool === 'function') {
    var contactUrl = root.getAttribute('data-contact-url') || 'contact.html';
    var noInput = { type: 'object', properties: {}, additionalProperties: false };
    doc.modelContext.registerTool({
      name: 'summarize_page',
      description: 'Return this Making Things Work page as plain text: the heading, the description, and the substantive statements marked for summary.',
      inputSchema: noInput,
      execute: async function () {
        var h1 = doc.querySelector('h1') ? doc.querySelector('h1').textContent.trim() : doc.title;
        var desc = doc.querySelector('meta[name="description"]');
        var items = Array.prototype.slice.call(doc.querySelectorAll('[data-summary]')).map(function (el) { return '- ' + el.textContent.trim().replace(/\s+/g, ' '); });
        return h1 + '\n' + (desc ? desc.getAttribute('content') : '') + '\n\n' + items.join('\n');
      }
    });
    doc.modelContext.registerTool({
      name: 'open_contact_form',
      description: 'Open the contact form so the visitor can tell Matthew Stark what needs to work better. Navigates to the contact page if the form is not on this page.',
      inputSchema: noInput,
      execute: async function () {
        var f = doc.querySelector('form[data-contact]');
        if (f) { f.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); var n = doc.querySelector('#contact-name'); if (n) n.focus(); return 'Contact form opened and focused.'; }
        window.location.href = contactUrl + '#form';
        return 'Navigating to the contact page.';
      }
    });
    doc.modelContext.registerTool({
      name: 'list_services',
      description: 'List the six practice areas of Making Things Work, what each one is for, and the page that describes it.',
      inputSchema: noInput,
      execute: async function () {
        var base = root.getAttribute('data-base') || '';
        return [
          'Agentic Team Modernization (' + base + 'agentic-team-modernization.html): redesign how a department works so people, conventional automation and agents each take the work they suit.',
          'Information Governance (' + base + 'information-governance.html): ownership, access and information practices so people, Copilot and agents work with the right data.',
          'Second Brains (' + base + 'second-brains.html): one maintained set of facts that Claude, Codex, Copilot and the team work from, with the organisational multiplexer.',
          'Move Data (' + base + 'move-data.html): migrations into, out of and between Microsoft 365, SharePoint, Power Platform, Azure and other systems.',
          'Agentic Cost Planning (' + base + 'agentic-cost-planning.html): what agentic work costs to build and to run, from Microsoft 365 usage, Claude and Codex telemetry and Foundry tracing in one plane.',
          'Roadmaps (' + base + 'roadmaps.html): hybrid AI and cloud roadmaps with the architecture to deliver them.'
        ].join('\n');
      }
    });
    if (window.MTWStage) {
      doc.modelContext.registerTool({
        name: 'go_to_beat',
        description: 'Scroll the page sequence to one of its beats and return that beat\'s heading and text.',
        inputSchema: { type: 'object', properties: { beat: { type: 'integer', minimum: 1, maximum: 12, description: 'Beat number, starting at 1.' } }, required: ['beat'], additionalProperties: false },
        execute: async function (input) {
          var n = Math.min(12, Math.max(1, parseInt(input && input.beat, 10) || 1));
          var slot = doc.querySelector('#beat-' + n);
          if (!slot) return 'Beat not found.';
          scrollToEl(slot);
          var h = slot.querySelector('h1, h2'), p = slot.querySelectorAll('p');
          return (h ? h.textContent.trim() : '') + '\n' + Array.prototype.map.call(p, function (x) { return x.textContent.trim(); }).join(' ');
        }
      });
    }
    if (doc.querySelector('.post-list')) {
      doc.modelContext.registerTool({
        name: 'list_posts',
        description: 'List the blog posts on this index page with their dates and links.',
        inputSchema: noInput,
        execute: async function () {
          return Array.prototype.map.call(doc.querySelectorAll('.post-list > li'), function (li) {
            var a = li.querySelector('h2 a'), t = li.querySelector('time');
            return (t ? t.textContent.trim() + '  ' : '') + a.textContent.trim() + '  ' + a.href;
          }).join('\n');
        }
      });
    }
    if (form) {
      doc.modelContext.registerTool({
        name: 'prefill_contact_form',
        description: 'Fill the contact form fields (name, email, organization, message) without sending. The visitor reviews and sends the message themselves.',
        inputSchema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, organization: { type: 'string' }, message: { type: 'string' } }, additionalProperties: false },
        execute: async function (input) {
          input = input || {};
          if (input.name) fields.name.el.value = input.name;
          if (input.email) fields.email.el.value = input.email;
          if (input.organization && form.querySelector('#contact-org')) form.querySelector('#contact-org').value = input.organization;
          if (input.message) fields.message.el.value = input.message;
          form.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
          return 'Form prefilled. Nothing was sent; the visitor can review and press Send.';
        }
      });
    }
  }

  schemeAt();
  railUpdate();
})();
