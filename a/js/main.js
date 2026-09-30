/* CUST STEP · Demo A "SOLID GROUND" · shared script */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var MOTION = hasGsap && !reduce;

  root.classList.add('js');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (MOTION) root.classList.add('motion');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ------------------------------------------------------------ Lenis */
  var lenis = null;
  if (MOTION && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------ header */
  var header = $('.site-header');
  var lastY = window.scrollY || 0;
  function onScroll(y, dir) {
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 40);
    if (root.classList.contains('menu-open')) return;
    if (dir > 0 && y > 160) header.classList.add('is-hidden');
    else if (dir < 0 || y <= 160) header.classList.remove('is-hidden');
  }
  if (lenis) {
    lenis.on('scroll', function (l) { onScroll(l.scroll, l.direction); });
  } else {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      onScroll(y, y > lastY ? 1 : y < lastY ? -1 : 0);
      lastY = y;
    }, { passive: true });
  }
  onScroll(window.scrollY || 0, 0);
  if (header) header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });

  /* ------------------------------------------------------------ mobile menu */
  var menuBtn = $('.menu-btn');
  var mmenu = $('#mmenu');
  function setMenu(open) {
    if (!menuBtn || !mmenu) return;
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mmenu.setAttribute('aria-hidden', String(!open));
    if (open) {
      mmenu.removeAttribute('inert');
      if (lenis) lenis.stop();
      header.classList.remove('is-hidden');
      var first = $('a', mmenu);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    } else {
      mmenu.setAttribute('inert', '');
      if (lenis) lenis.start();
    }
  }
  if (menuBtn && mmenu) {
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    $$('a', mmenu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.matchMedia('(min-width: 1280px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------ anchors + placeholder links */
  var toast;
  function showToast(msg) {
    if (!toast) {
      toast = document.createElement('div');
      toast.setAttribute('role', 'status');
      toast.style.cssText = 'position:fixed;left:50%;bottom:28px;z-index:160;transform:translate(-50%,20px);opacity:0;padding:14px 22px;border-radius:999px;background:#15100b;border:1px solid rgba(201,163,106,.5);color:#f3ede4;font-size:14px;transition:opacity .5s cubic-bezier(.22,.8,.2,1),transform .5s cubic-bezier(.22,.8,.2,1);max-width:calc(100vw - 32px);text-align:center;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(function () { toast.style.opacity = '1'; toast.style.transform = 'translate(-50%,0)'; });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%,20px)'; }, 2600);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a.hasAttribute('data-placeholder-link')) {
      e.preventDefault();
      showToast('판매처 링크는 실제 운영 시 연결됩니다.');
      return;
    }
    var href = a.getAttribute('href');
    if (href && href.length > 1 && href.charAt(0) === '#') {
      var t = document.getElementById(href.slice(1));
      if (t) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -90, duration: 1.4 });
        else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        if (href === '#main') t.setAttribute('tabindex', '-1'), t.focus({ preventScroll: true });
      }
    }
  });

  /* ------------------------------------------------------------ word split */
  function splitWords(el) {
    if (!el) return [];
    if (el.getAttribute('data-split-done')) return $$('.w__i', el);
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map(function (w) {
      return '<span class="w" aria-hidden="true"><span class="w__i">' + esc(w) + '</span></span>';
    }).join(' ');
    el.setAttribute('data-split-done', '1');
    return $$('.w__i', el);
  }

  /* ============================================================ HERO (index) */
  function initHero() {
    var hero = $('.hero');
    if (!hero) return;
    var video = $('.hero__video', hero);
    var media = $('.hero__media', hero);
    var dim = $('.hero__dim', hero);
    var hint = $('.hero__hint', hero);
    var b1 = $('.hero__band--1', hero);
    var b2 = $('.hero__band--2', hero);
    var b3 = $('.hero__band--3', hero);

    /* --- scroll-scrubbed video: Blob -> object URL, lerp currentTime --- */
    var duration = 0, target = 0, display = 0, seeking = false, running = false, ready = false;
    function setStatic() {
      ready = false;
      hero.classList.add('hero--static');
      if (video) { video.removeAttribute('src'); }
    }
    function loop() {
      if (!ready) { running = false; return; }
      var diff = target - display;
      display = Math.abs(diff) < 0.002 ? target : display + diff * 0.12;
      if (!seeking && Math.abs(video.currentTime - display) > 0.01) {
        seeking = true;
        video.currentTime = display;
      }
      if (display === target && !seeking) { running = false; return; } // rest when idle
      requestAnimationFrame(loop);
    }
    function kick() {
      if (ready && !running) { running = true; requestAnimationFrame(loop); }
    }
    if (!video || reduce || location.protocol === 'file:' || !window.fetch || !hasGsap) {
      setStatic();
    } else {
      video.addEventListener('loadedmetadata', function () {
        duration = video.duration || 0;
        ready = duration > 0 && isFinite(duration);
        if (!ready) { setStatic(); return; }
        // iOS: prime the decoder so seeks paint frames
        var p = video.play();
        if (p && p.then) p.then(function () { video.pause(); kick(); }).catch(function () { kick(); });
        else kick();
      });
      video.addEventListener('seeked', function () { seeking = false; if (ready) kick(); });
      video.addEventListener('error', setStatic);
      fetch('assets/hero.mp4')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function (blob) {
          if (!blob.size || (blob.type && blob.type.indexOf('video') !== 0)) throw new Error('not a video');
          video.src = URL.createObjectURL(blob);
          video.load();
        })
        .catch(setStatic);
    }

    if (!MOTION) return; // static fallback: CSS stacks band 1 + CTA

    hero.classList.add('is-anim');
    var titleWords = splitWords($('.hero__title', hero));
    var stepWords = $$('.hero__steps .w__i', hero);
    var arrows = $$('.step-arrow', hero);

    // intro (load)
    gsap.timeline({ delay: 0.15 })
      .fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'power3.out' })
      .fromTo($$('.eyebrow, .hero__sub', b1), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out' }, 0.35)
      .fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'power2.out' }, 0.9);

    // scroll story, total length = 1 = pinned +=250%
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: true,
        anticipatePin: 1,
        onUpdate: function (self) { target = self.progress * duration; kick(); }
      }
    });
    tl.fromTo(media, { scale: 1 }, { scale: 1.08, duration: 1 }, 0)
      .fromTo(hint, { opacity: 1 }, { opacity: 0, duration: 0.05, immediateRender: false }, 0.02)
      // band 1 (0 - 0.3)
      .fromTo(b1, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.08, ease: 'power1.in' }, 0.22)
      // band 2 (0.35 - 0.65)
      .fromTo(b2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, 0.35)
      .fromTo(stepWords, { yPercent: 110 }, { yPercent: 0, duration: 0.08, stagger: 0.03, ease: 'power3.out' }, 0.35)
      .fromTo(arrows, { scaleX: 0 }, { scaleX: 1, duration: 0.06, stagger: 0.03, ease: 'power2.out' }, 0.37)
      .fromTo($('.hero__steps-cap', b2), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.45)
      .to(b2, { autoAlpha: 0, y: -50, duration: 0.06, ease: 'power1.in' }, 0.59)
      // dim towards .75
      .fromTo(dim, { opacity: 0 }, { opacity: 0.75, duration: 0.4 }, 0.6)
      // band 3 (0.7 - 1)
      .fromTo(b3, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.7)
      .to({}, { duration: 0.001 }, 0.999);
  }

  /* ============================================================ WHO (pin expand) */
  function initWho() {
    var who = $('.who');
    if (!who || !MOTION) return;
    var stage = $('.who__stage', who);
    var box = $('.pin-box', who);
    var img = $('.pin-box__img', who);
    var dimEl = $('.pin-box__dim', who);
    var label = $('.who__label', who);
    var cards = $$('.how-card', who);
    var mm = gsap.matchMedia();

    mm.add('(min-width: 1025px)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: 'top top', end: '+=250%', pin: true, scrub: 1.5, anticipatePin: 1 }
      });
      tl.fromTo(box, { width: '40vw', height: '24vw', borderRadius: 14 }, { width: '100vw', height: '100vh', borderRadius: 0, duration: 1, ease: 'power2.inOut' }, 0)
        .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
        .fromTo(dimEl, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0.8)
        .fromTo(label, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 1)
        .fromTo(cards, { y: 150, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.15, ease: 'power3.out' }, 1.1)
        .to({}, { duration: 0.35 });
    });

    mm.add('(max-width: 1024px)', function () {
      var st = { trigger: box, start: 'top 92%', end: 'top 25%', scrub: 1 };
      gsap.fromTo(box, { width: '82%', borderRadius: 14 }, { width: '100%', borderRadius: 0, ease: 'none', scrollTrigger: st });
      gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: box, start: 'top 92%', end: 'top 25%', scrub: 1 } });
      gsap.fromTo(label, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: box, start: 'top 55%', once: true } });
      cards.forEach(function (c) {
        gsap.fromTo(c, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
      });
    });
  }

  /* ============================================================ WHAT WE MAKE (tabs + Swiper) */
  function initMake() {
    var make = $('.make');
    if (!make) return;
    var tabs = $$('[role="tab"]', make);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var inView = false;
    var current = 0;

    function animateTitle(slide) {
      if (!MOTION || !slide) return;
      var t = $('.mask__i', slide);
      if (t) gsap.fromTo(t, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'power3.out', delay: 0.1, overwrite: true });
      var rest = $$('.make-slide__kicker, .make-slide__desc, .link-arrow', slide);
      gsap.fromTo(rest, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.25, overwrite: true });
    }

    var swipers = panels.map(function (panel) {
      var el = $('.make-swiper', panel);
      var fill = $('.swiper-progress-fill', panel);
      var count = $('.make-count b', panel);
      if (!window.Swiper || !el) return null;
      var sw = new window.Swiper(el, {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        speed: 900,
        rewind: true,
        autoplay: reduce ? false : { delay: 4000, disableOnInteraction: false },
        navigation: { prevEl: $('.ctrl-prev', panel), nextEl: $('.ctrl-next', panel) },
        keyboard: { enabled: false },
        a11y: { prevSlideMessage: '이전 슬라이드', nextSlideMessage: '다음 슬라이드', slideLabelMessage: '{{index}} / {{slidesLength}}' },
        observer: true,
        observeParents: true,
        on: {
          autoplayTimeLeft: function (s, time, progress) {
            if (fill) fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, 1 - progress)) + ')';
          },
          slideChange: function (s) {
            if (count) count.textContent = pad(s.realIndex + 1);
            animateTitle(s.slides[s.activeIndex]);
          }
        }
      });
      if (sw.autoplay && sw.autoplay.stop) sw.autoplay.stop();
      if (reduce && fill) fill.style.transform = 'scaleX(1)';
      return sw;
    });

    function syncAutoplay() {
      swipers.forEach(function (sw, j) {
        if (!sw || !sw.autoplay || reduce) return;
        if (j === current && inView) { if (!sw.autoplay.running) sw.autoplay.start(); }
        else if (sw.autoplay.running) sw.autoplay.stop();
      });
    }

    function activate(i, focus) {
      current = i;
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      var sw = swipers[i];
      if (sw) { sw.update(); sw.slideTo(0, 0); }
      var count = $('.make-count b', panels[i]);
      if (count) count.textContent = '01';
      if (focus) tabs[i].focus();
      if (MOTION) {
        gsap.fromTo(panels[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', overwrite: true });
        if (sw) animateTitle(sw.slides[sw.activeIndex]);
      }
      syncAutoplay();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { if (i !== current) activate(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); activate(n, true); }
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        syncAutoplay();
      }, { threshold: 0.25 }).observe(make);
    } else {
      inView = true;
    }
    activate(0);
  }

  /* ============================================================ COUNTERS (odometer) */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    els.forEach(function (el) {
      var n = parseInt(el.getAttribute('data-count'), 10) || 0;
      var str = n.toLocaleString('en-US');
      var digits = str.replace(/\D/g, '').length;
      var seen = 0;
      var html = '<span class="sr-only">' + str + '</span><span class="odo" aria-hidden="true">';
      str.split('').forEach(function (ch) {
        if (/\d/.test(ch)) {
          var spins = digits - seen; // rightmost digits spin more
          seen++;
          var col = '';
          for (var r = 0; r <= spins; r++) for (var d = 0; d < 10; d++) col += '<span>' + d + '</span>';
          html += '<span class="odo__d"><span class="odo__col" data-to="' + (spins * 10 + parseInt(ch, 10)) + '">' + col + '</span></span>';
        } else {
          html += '<span class="odo__sep">' + ch + '</span>';
        }
      });
      html += '</span>';
      el.innerHTML = html;
    });

    function roll(el) {
      $$('.odo__col', el).forEach(function (c, i) {
        c.style.transitionDelay = (i * 0.07) + 's';
        c.style.transform = 'translateY(-' + c.getAttribute('data-to') + 'em)';
      });
    }
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(roll); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { roll(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================ JOURNAL SWIPER (index) */
  function initJournalSwiper() {
    var el = $('.journal-swiper');
    if (!el || !window.Swiper) return;
    new window.Swiper(el, {
      slidesPerView: 1.15,
      spaceBetween: 20,
      speed: 900,
      grabCursor: true,
      pagination: { el: $('.swiper-pagination', el), type: 'progressbar' },
      a11y: { prevSlideMessage: '이전 글', nextSlideMessage: '다음 글' },
      breakpoints: {
        700: { slidesPerView: 2.2, spaceBetween: 32 },
        1200: { slidesPerView: 3.4, spaceBetween: 48 }
      }
    });
  }

  /* ============================================================ SUBPAGE HERO */
  function initPageHero() {
    var ph = $('.page-hero');
    if (!ph || !MOTION) return;
    var words = splitWords($('.page-hero__title', ph));
    var img = $('.page-hero__bg img', ph);
    gsap.timeline({ delay: 0.1 })
      .fromTo(img, { scale: 1.14 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0)
      .fromTo($('.eyebrow', ph), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
      .fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'power3.out' }, 0.3)
      .fromTo($$('.page-hero__sub, .breadcrumb', ph), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }, 0.7);
    gsap.to($('.page-hero__bg', ph), {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ============================================================ REVEALS */
  function initReveals() {
    if (!MOTION) return;
    $$('[data-split]').forEach(function (el) {
      var w = splitWords(el);
      gsap.fromTo(w, { yPercent: 110 }, {
        yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
    $$('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el, { y: 40, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 1.1, ease: 'power3.out',
        delay: parseFloat(el.getAttribute('data-delay')) || 0,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true }
      });
    });
  }

  /* ============================================================ MATERIAL: drawn process lines */
  function initDraw() {
    var paths = $$('[data-draw]');
    if (!paths.length || !MOTION) return;
    paths.forEach(function (p, i) {
      var step = p.closest('.proc-step') || p;
      var node = step.querySelector('.proc-step__node');
      gsap.fromTo(p, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: step, start: 'top 85%', end: 'top 45%', scrub: 1 }
      });
      if (node) gsap.fromTo(node, { scale: 0 }, { scale: 1, duration: 0.8, ease: 'back.out(2)', delay: i * 0.05, scrollTrigger: { trigger: step, start: 'top 85%', once: true } });
    });
  }

  /* ============================================================ BRAND: timeline */
  function initTimeline() {
    var tlEl = $('.timeline');
    if (!tlEl) return;
    var items = $$('.tl-item', tlEl);
    if (!MOTION) { items.forEach(function (i) { i.classList.add('is-active'); }); return; }
    gsap.fromTo($('.timeline__line', tlEl), { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: tlEl, start: 'top 60%', end: 'bottom 60%', scrub: 1 }
    });
    items.forEach(function (it) {
      ScrollTrigger.create({
        trigger: it, start: 'top 60%',
        onEnter: function () { it.classList.add('is-active'); },
        onLeaveBack: function () { it.classList.remove('is-active'); }
      });
    });
  }

  /* ============================================================ PARTNERS: steps line */
  function initSteps() {
    var steps = $$('[data-step]');
    if (!steps.length || !MOTION) return;
    gsap.fromTo(steps, { '--p': 0 }, {
      '--p': 1, duration: 1.2, stagger: 0.25, ease: 'power2.inOut',
      scrollTrigger: { trigger: steps[0].parentNode, start: 'top 75%', once: true }
    });
  }

  /* ============================================================ IMPACT: ring */
  function initRing() {
    var ring = $('[data-ring]');
    if (!ring || !MOTION) return;
    var arc = $('.ring__arc', ring);
    var nodes = $$('.ring__node', ring);
    var labels = $$('.ring__node-label', ring);
    var arrows = $$('.ring__arrow', ring);
    var tl = gsap.timeline({ scrollTrigger: { trigger: ring, start: 'top 75%', end: 'center 45%', scrub: 1 } });
    tl.fromTo(arc, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
    nodes.forEach(function (n, i) {
      tl.fromTo(n, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.12, ease: 'back.out(2)' }, i * 0.25)
        .fromTo(labels[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, i * 0.25 + 0.04);
    });
    arrows.forEach(function (a, i) {
      tl.fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.08 }, i * 0.25 + 0.12);
    });
    gsap.fromTo($('.ring__center', ring), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: ring, start: 'top 70%', once: true } });
  }

  /* ============================================================ QUALITY: FAQ accordion */
  function initFaq() {
    $$('.faq details').forEach(function (d) {
      var sum = $('summary', d);
      var body = $('.faq__a', d);
      if (!sum || !body || !MOTION) return;
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open) {
          gsap.to(body, { height: 0, opacity: 0, duration: 0.5, ease: 'power3.inOut', onComplete: function () { d.open = false; gsap.set(body, { clearProps: 'height,opacity' }); if (lenis) lenis.resize(); ScrollTrigger.refresh(); } });
        } else {
          d.open = true;
          gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'power3.out', onComplete: function () { gsap.set(body, { clearProps: 'height' }); if (lenis) lenis.resize(); ScrollTrigger.refresh(); } });
        }
      });
    });
  }

  /* ============================================================ CONTACT: form */
  function initForm() {
    var form = $('#contact-form');
    if (!form) return;
    var success = $('#contact-success');
    var reset = $('#contact-reset');
    var F = function (n) { return form.querySelector('[name="' + n + '"]'); };
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var phoneRe = /^[0-9+\-\s()]{9,20}$/;

    function setErr(input, id, msg) {
      var err = document.getElementById(id);
      if (err) err.textContent = msg || '';
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    var rules = [
      function () { var i = F('name'); return setErr(i, 'e-name', i.value.trim().length < 2 ? '회사명 또는 이름을 입력해 주세요.' : ''); },
      function () { var i = F('email'); var v = i.value.trim(); return setErr(i, 'e-email', !v ? '이메일을 입력해 주세요.' : !emailRe.test(v) ? '이메일 형식을 확인해 주세요.' : ''); },
      function () { var i = F('phone'); var v = i.value.trim(); return setErr(i, 'e-phone', !v ? '연락처를 입력해 주세요.' : !phoneRe.test(v) || v.replace(/\D/g, '').length < 9 ? '숫자와 하이픈으로 입력해 주세요. 예) 010-1234-5678' : ''); },
      function () { var checked = form.querySelector('input[name="type"]:checked'); var first = form.querySelector('input[name="type"]'); return setErr(first, 'e-type', checked ? '' : '문의 유형을 선택해 주세요.'); },
      function () { var i = F('message'); return setErr(i, 'e-msg', i.value.trim().length < 10 ? '내용을 10자 이상 적어 주세요.' : ''); },
      function () { var i = F('agree'); return setErr(i, 'e-agree', i.checked ? '' : '개인정보 수집·이용에 동의해 주세요.'); }
    ];
    var map = { name: 0, email: 1, phone: 2, type: 3, message: 4, agree: 5 };
    form.addEventListener('input', function (e) {
      var idx = map[e.target.name];
      if (idx !== undefined && e.target.getAttribute('aria-invalid') === 'true') rules[idx]();
    });
    form.addEventListener('change', function (e) {
      var idx = map[e.target.name];
      if (idx === 3 || idx === 5) rules[idx]();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = rules.map(function (r) { return r(); });
      var firstBad = ok.indexOf(false);
      if (firstBad > -1) {
        var names = ['name', 'email', 'phone', 'type', 'message', 'agree'];
        var el = form.querySelector('[name="' + names[firstBad] + '"]');
        if (el) {
          if (lenis) lenis.scrollTo(el, { offset: -160, duration: 0.8 });
          el.focus({ preventScroll: !!lenis });
        }
        return;
      }
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      if (lenis) lenis.scrollTo(success, { offset: -140, duration: 1 });
      else success.scrollIntoView({ block: 'center' });
      if (MOTION) {
        gsap.fromTo(success, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' });
        gsap.fromTo($$('path, circle', success), { strokeDasharray: 120, strokeDashoffset: 120 }, { strokeDashoffset: 0, duration: 1.2, stagger: 0.2, ease: 'power2.out', delay: 0.2 });
      }
      if (lenis) lenis.resize();
      if (hasGsap) ScrollTrigger.refresh();
    });
    if (reset) reset.addEventListener('click', function () {
      form.reset();
      $$('[aria-invalid]', form).forEach(function (i) { i.setAttribute('aria-invalid', 'false'); });
      $$('.field__err', form).forEach(function (p) { p.textContent = ''; });
      success.hidden = true;
      form.hidden = false;
      F('name').focus();
      if (hasGsap) ScrollTrigger.refresh();
    });
  }

  /* ------------------------------------------------------------ boot (pin order matters) */
  initHero();
  initWho();
  initPageHero();
  initMake();
  initCounters();
  initJournalSwiper();
  initReveals();
  initDraw();
  initTimeline();
  initSteps();
  initRing();
  initFaq();
  initForm();

  if (hasGsap) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
