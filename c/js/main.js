/* CUST STEP · Demo C · main.js
   Stage layers, motion, navigation, page transitions, forms. No build step. */
(function () {
  "use strict";

  var SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;
  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var hasGSAP = !!(gsap && ST);

  if (!hasGSAP) {
    html.classList.remove("js");
    html.classList.add("no-js");
  } else {
    gsap.registerPlugin(ST);
  }
  html.dataset.ready = "1";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ------------------------------------------------------------------
     Grain: 128px noise tile generated at runtime
  ------------------------------------------------------------------ */
  (function grain() {
    var layers = $$(".grain");
    if (!layers.length) return;
    try {
      var c = document.createElement("canvas");
      c.width = c.height = 128;
      var ctx = c.getContext("2d");
      var img = ctx.createImageData(128, 128);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      var url = c.toDataURL("image/png");
      layers.forEach(function (l) { l.style.backgroundImage = "url(" + url + ")"; });
    } catch (e) { /* canvas blocked: skip grain */ }
  })();

  /* ------------------------------------------------------------------
     Lenis smooth scroll bound to the GSAP ticker
  ------------------------------------------------------------------ */
  var lenis = null;
  if (hasGSAP && !reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------
     Page transition curtain
  ------------------------------------------------------------------ */
  var curtain = $(".curtain[data-transition]");
  function curtainDone() { if (curtain) curtain.classList.add("is-done"); }
  function introCurtain(cb) {
    if (!curtain || !hasGSAP || reduced) {
      if (curtain && hasGSAP) gsap.set(curtain, { yPercent: -100 });
      curtainDone();
      cb();
      return;
    }
    gsap.to(curtain, {
      yPercent: -100, duration: 1, ease: "expo.inOut", delay: 0.15,
      onComplete: curtainDone,
    });
    gsap.delayedCall(0.55, cb);
  }
  function isInternal(a) {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(href)) return false;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return /\.html$|\/$/.test(url.pathname);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (a && a.getAttribute("href") === "#") { e.preventDefault(); return; } // placeholder store links
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isInternal(a) || !curtain || !hasGSAP || reduced) return;
    e.preventDefault();
    var href = a.href;
    closeMenu();
    curtain.classList.remove("is-done");
    gsap.fromTo(curtain, { yPercent: 100 }, {
      yPercent: 0, duration: 0.7, ease: "expo.inOut",
      onComplete: function () { location.href = href; },
    });
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && curtain) {
      if (hasGSAP) gsap.set(curtain, { yPercent: -100 });
      curtainDone();
    }
  });

  /* ------------------------------------------------------------------
     Header: hide on scroll down, solid after top, sliding indicator
  ------------------------------------------------------------------ */
  var header = $(".site-header");
  (function headerScroll() {
    if (!header) return;
    var last = 0, ticking = false;
    function onScroll() {
      var y = window.scrollY || 0;
      header.classList.toggle("is-solid", y > 40);
      if (!html.classList.contains("menu-open")) {
        header.classList.toggle("is-hidden", y > 240 && y > last + 2);
        if (y < last - 2) header.classList.remove("is-hidden");
      }
      last = y;
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
    onScroll();
  })();

  (function nav() {
    var gnb = $(".gnb");
    if (!gnb) return;
    var ind = $(".indicator", gnb);
    var links = $$(".gnb__link", gnb);
    var current = $(".gnb__item.is-current > .gnb__link", gnb) || $('.gnb__link[aria-current="page"]', gnb);
    function moveTo(el) {
      if (!ind) return;
      if (!el) { ind.style.opacity = "0"; return; }
      var g = gnb.getBoundingClientRect(), r = el.getBoundingClientRect();
      ind.style.width = r.width + "px";
      ind.style.transform = "translateX(" + (r.left - g.left) + "px)";
      ind.style.opacity = "1";
    }
    links.forEach(function (l) {
      l.addEventListener("mouseenter", function () { moveTo(l); });
      l.addEventListener("focus", function () { moveTo(l); });
    });
    gnb.addEventListener("mouseleave", function () { moveTo(current); });
    gnb.addEventListener("focusout", function (e) { if (!gnb.contains(e.relatedTarget)) moveTo(current); });
    window.addEventListener("resize", function () { moveTo(current); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTo(current); });
    moveTo(current);

    // dropdown
    $$(".gnb__item--drop", gnb).forEach(function (item) {
      var btn = $("button", item);
      var timer;
      function set(open) {
        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      btn.addEventListener("click", function () { set(!item.classList.contains("is-open")); });
      if (finePointer) {
        item.addEventListener("mouseenter", function () { clearTimeout(timer); set(true); });
        item.addEventListener("mouseleave", function () { timer = setTimeout(function () { set(false); }, 160); });
      }
      item.addEventListener("focusout", function (e) { if (!item.contains(e.relatedTarget)) set(false); });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { set(false); btn.focus(); }
      });
    });
  })();

  /* mobile overlay menu (inert while hidden) */
  var menu = $(".overlay-menu");
  var toggle = $(".menu-toggle");
  function openMenu() {
    if (!menu) return;
    html.classList.add("menu-open");
    menu.inert = false;
    menu.removeAttribute("aria-hidden");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "메뉴 닫기");
    if (lenis) lenis.stop();
    var first = $("a", menu);
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeMenu() {
    if (!menu || !html.classList.contains("menu-open")) return;
    html.classList.remove("menu-open");
    menu.inert = true;
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "메뉴 열기");
    if (lenis) lenis.start();
  }
  if (menu && toggle) {
    menu.inert = true;
    toggle.addEventListener("click", function () {
      html.classList.contains("menu-open") ? (closeMenu(), toggle.focus()) : openMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && html.classList.contains("menu-open")) { closeMenu(); toggle.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1080) closeMenu(); });
  }

  /* ------------------------------------------------------------------
     Hero intro (line mask + fade-in)
  ------------------------------------------------------------------ */
  function heroIntro() {
    var lines = $$(".hero .lineInner, .page-hero .lineInner");
    var fades = $$("[data-hero-fade]");
    if (!hasGSAP || reduced) {
      lines.forEach(function (l) { l.style.transform = "none"; });
      fades.forEach(function (f) { f.style.opacity = "1"; });
      return;
    }
    gsap.fromTo(lines, { y: 0, yPercent: 100 }, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.12 });
    gsap.fromTo(fades, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, delay: 0.35 });
  }

  /* ------------------------------------------------------------------
     Core object (three.js on capable desktops, poster/video otherwise)
  ------------------------------------------------------------------ */
  function hasWebGL2() {
    try { var c = document.createElement("canvas"); return !!c.getContext("webgl2"); } catch (e) { return false; }
  }
  function canRunCube() {
    if (reduced) return false;
    if (!window.matchMedia("(min-width: 900px)").matches) return false;
    var hc = navigator.hardwareConcurrency;
    if (typeof hc !== "number") hc = 8;
    if (hc <= 4) return false;
    return hasWebGL2();
  }
  (function coreObject() {
    var obj = $("[data-hero-cube]");
    if (!obj) return;
    var inner = $(".object__inner", obj);
    var zone = $(".cube-zone") || obj;

    function reveal() {
      if (!hasGSAP || reduced) { inner.style.opacity = "1"; inner.style.visibility = "visible"; return; }
      gsap.fromTo(inner, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: "expo.out" });
    }
    function posterFallback() {
      var desktopish = !reduced && window.matchMedia("(min-width: 900px)").matches;
      var poster = $(".object__poster", inner);
      if (desktopish) {
        // rotating glass-bean video layer (poster stays if the file is missing)
        var v = document.createElement("video");
        v.className = "object__video";
        v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
        v.poster = "assets/hero-poster.webp";
        v.preload = "metadata";
        var s = document.createElement("source");
        s.src = "assets/hero.mp4"; s.type = "video/mp4";
        v.appendChild(s);
        v.addEventListener("loadeddata", function () { if (poster) poster.style.opacity = "0"; });
        inner.appendChild(v);
        var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
        tryPlay();
        // autoplay can be blocked until the first interaction; retry once on scroll/pointer/visibility
        var retry = function () { if (v.paused) tryPlay(); };
        window.addEventListener("scroll", retry, { once: true, passive: true });
        window.addEventListener("pointerdown", retry, { once: true, passive: true });
        document.addEventListener("visibilitychange", retry);
      }
      reveal();
    }

    // Default hero object is the rendered glass-bean video (matches the approved look on every GPU).
    // The three.js bean stays available for review with ?3d=1.
    var want3D = /[?&]3d=1/.test(location.search);
    if (want3D && canRunCube()) {
      var url = new URL("core3d.js?v=20261001c", SCRIPT_SRC).href;
      import(url).then(function (mod) {
        var poster = $(".object__poster", inner);
        if (poster) poster.style.display = "none";
        mod.init(inner, { zone: zone, onReady: reveal });
      }).catch(function () { posterFallback(); });
    } else {
      posterFallback();
    }

    // scroll: drift up, shrink, then fade out past the cube zone
    if (hasGSAP && !reduced) {
      gsap.set(obj, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
      gsap.timeline({
        scrollTrigger: { trigger: zone, start: "top top", end: "bottom top", scrub: 1, invalidateOnRefresh: true },
      })
        .to(obj, { y: function () { return -window.innerHeight * 0.16; }, scale: 0.78, ease: "none", duration: 1 }, 0)
        .to(obj, { autoAlpha: 0, ease: "none", duration: 0.28 }, 0.72);
    }
  })();

  /* ------------------------------------------------------------------
     Scroll-driven stage: portal drift, dim
  ------------------------------------------------------------------ */
  function stageMotion() {
    if (!hasGSAP || reduced) return;
    var portal = $(".stage .portal");
    if (portal) {
      gsap.to(portal, {
        yPercent: -10, xPercent: 4, scale: 1.08, ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.5 },
      });
    }
    var dim = $(".stage .dim");
    $$("[data-dim-from]").forEach(function (sec) {
      if (!dim) return;
      var to = parseFloat(sec.getAttribute("data-dim-from")) || 0.5;
      gsap.fromTo(dim, { opacity: 0 }, {
        opacity: to, ease: "none", immediateRender: false,
        scrollTrigger: { trigger: sec, start: "top 80%", end: "bottom 30%", scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     Char splitter (keeps words intact for Korean line breaking)
  ------------------------------------------------------------------ */
  function splitChars(el) {
    var label = el.textContent.replace(/\s+/g, " ").trim();
    var chars = [];
    function walk(node, into) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { into.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span");
            w.className = "w";
            Array.from(p).forEach(function (ch) {
              var c = document.createElement("span");
              c.className = "c";
              var ci = document.createElement("span");
              ci.textContent = ch;
              c.appendChild(ci);
              w.appendChild(c);
              chars.push(ci);
            });
            into.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false);
          walk(n, clone);
          into.appendChild(clone);
        }
      });
    }
    var frag = document.createElement("span");
    frag.setAttribute("aria-hidden", "true");
    walk(el, frag);
    el.textContent = "";
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;
    el.appendChild(sr);
    el.appendChild(frag);
    return chars;
  }
  function charReveals() {
    $$("[data-split]").forEach(function (el) {
      if (!hasGSAP || reduced) return;
      var chars = splitChars(el);
      gsap.fromTo(chars, { yPercent: 110 }, {
        yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.022,
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     Rise / reveal / parallax
  ------------------------------------------------------------------ */
  function reveals() {
    if (!hasGSAP || reduced) return;
    ST.batch("[data-rise]", {
      start: "top 88%", once: true,
      onEnter: function (b) {
        gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: true });
      },
    });
    $$("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onComplete: function () { el.style.clipPath = "none"; },
      });
    });
    $$("[data-parallax]").forEach(function (img) {
      var amt = parseFloat(img.getAttribute("data-parallax")) || 6;
      gsap.fromTo(img, { yPercent: -amt }, {
        yPercent: amt, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     Pinned brand panels  [data-core-hold]
  ------------------------------------------------------------------ */
  function holdPanels() {
    $$("[data-core-hold]").forEach(function (hold) {
      var panels = $$(".panel", hold);
      var dots = $$(".hold__dot", hold);
      function setDot(i) { dots.forEach(function (d, k) { d.classList.toggle("is-active", k === i); }); }
      setDot(0);
      if (!hasGSAP || reduced) { hold.classList.add("is-static"); return; }
      var mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", function () {
        hold.classList.remove("is-static");
        gsap.set(panels.slice(1), { autoAlpha: 0, y: 70 });
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: hold, start: "top top", end: "+=260%", scrub: 1, pin: true, pinType: "transform",
            anticipatePin: 1,
            // each panel owns one unit of the timeline; the cross-fade is centred on the unit boundary
            onUpdate: function (self) { setDot(clamp(Math.floor(self.progress * panels.length + 0.02), 0, panels.length - 1)); },
          },
        });
        panels.forEach(function (p, i) {
          var img = $(".panel__media img", p);
          if (img) tl.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", duration: 1.4 }, Math.max(0, i - 0.2));
          if (i > 0) {
            tl.to(panels[i - 1], { autoAlpha: 0, y: -70, duration: 0.4, ease: "power2.in" }, i - 0.35)
              .fromTo(p, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, i - 0.05);
          }
        });
        tl.to({}, { duration: 0.01 }, panels.length); // total = panels.length units
        return function () { gsap.set(panels, { clearProps: "all" }); };
      });
      mm.add("(max-width: 899px)", function () {
        hold.classList.add("is-static");
        return function () { hold.classList.remove("is-static"); };
      });
    });
  }

  /* ------------------------------------------------------------------
     Horizontal process strip  [data-hscroll]
  ------------------------------------------------------------------ */
  function hscroll() {
    $$("[data-hscroll]").forEach(function (sec) {
      var track = $(".hscroll__track", sec);
      var bar = $(".hscroll__progress span", sec);
      if (!hasGSAP || reduced) { sec.classList.add("is-static"); return; }
      var mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", function () {
        sec.classList.remove("is-static");
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        gsap.to(track, {
          x: function () { return -dist(); }, ease: "none",
          scrollTrigger: {
            trigger: sec, start: "top top", end: function () { return "+=" + dist(); },
            scrub: 1, pin: true, pinType: "transform", invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) { if (bar) bar.style.transform = "scaleX(" + self.progress + ")"; },
          },
        });
      });
      mm.add("(max-width: 899px)", function () {
        sec.classList.add("is-static");
        return function () { sec.classList.remove("is-static"); };
      });
    });
  }

  /* ------------------------------------------------------------------
     Floating hover image for lists  [data-hover-list]
  ------------------------------------------------------------------ */
  function hoverLists() {
    if (!finePointer || !hasGSAP) return;
    $$("[data-hover-list]").forEach(function (list) {
      var rows = $$("[data-img]", list);
      if (!rows.length) return;
      var box = document.createElement("div");
      box.className = "float-img";
      box.setAttribute("aria-hidden", "true");
      var imgs = {};
      rows.forEach(function (r) {
        var src = r.getAttribute("data-img");
        if (imgs[src]) return;
        var im = new Image();
        im.alt = ""; im.decoding = "async"; im.loading = "lazy"; im.src = src;
        box.appendChild(im);
        imgs[src] = im;
      });
      document.body.appendChild(box);
      gsap.set(box, { xPercent: -50, yPercent: -60 });
      var dur = reduced ? 0.01 : 0.6;
      var qx = gsap.quickTo(box, "x", { duration: dur, ease: "power3" });
      var qy = gsap.quickTo(box, "y", { duration: dur, ease: "power3" });
      var rot = gsap.quickTo(box, "rotation", { duration: 0.8, ease: "power3" });
      var lastX = 0;
      list.addEventListener("pointermove", function (e) {
        qx(e.clientX); qy(e.clientY);
        if (!reduced) rot(clamp((e.clientX - lastX) * 0.4, -8, 8));
        lastX = e.clientX;
      });
      rows.forEach(function (r) {
        r.addEventListener("pointerenter", function (e) {
          if (!box.classList.contains("is-on")) { gsap.set(box, { x: e.clientX, y: e.clientY }); }
          var src = r.getAttribute("data-img");
          Object.keys(imgs).forEach(function (k) { imgs[k].classList.toggle("is-on", k === src); });
          box.classList.add("is-on");
        });
      });
      list.addEventListener("pointerleave", function () { box.classList.remove("is-on"); });
    });
  }

  /* ------------------------------------------------------------------
     Custom cursor label  [data-cursor-zone]
  ------------------------------------------------------------------ */
  function cursorZones() {
    var zones = $$("[data-cursor-zone]");
    if (!zones.length || !finePointer || !hasGSAP) return;
    var lab = document.createElement("div");
    lab.className = "cursor-label";
    lab.setAttribute("aria-hidden", "true");
    lab.innerHTML = '<span>VIEW</span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10 10 2M4 2h6v6"/></svg>';
    document.body.appendChild(lab);
    var dur = reduced ? 0.01 : 0.45;
    var qx = gsap.quickTo(lab, "x", { duration: dur, ease: "power3" });
    var qy = gsap.quickTo(lab, "y", { duration: dur, ease: "power3" });
    zones.forEach(function (z) {
      var text = z.getAttribute("data-cursor-label") || "VIEW";
      z.addEventListener("pointerenter", function (e) {
        lab.firstChild.textContent = text;
        gsap.set(lab, { x: e.clientX, y: e.clientY });
        lab.classList.add("is-on");
      });
      z.addEventListener("pointermove", function (e) { qx(e.clientX); qy(e.clientY); });
      z.addEventListener("pointerleave", function () { lab.classList.remove("is-on"); });
    });
  }

  /* ------------------------------------------------------------------
     Scroll-velocity blur  [data-velocity]
  ------------------------------------------------------------------ */
  function velocityBlur() {
    if (!hasGSAP || reduced || !finePointer) return;
    $$("[data-velocity]").forEach(function (el) {
      var proxy = { b: 0 };
      var blurTo = gsap.quickTo(proxy, "b", {
        duration: 0.5, ease: "power3",
        onUpdate: function () { el.style.setProperty("--vfx-blur", proxy.b.toFixed(2) + "px"); },
      });
      var idle;
      ST.create({
        trigger: el, start: "top bottom", end: "bottom top",
        onUpdate: function (self) {
          blurTo(clamp(Math.abs(self.getVelocity()) / 320, 0, 9));
          clearTimeout(idle);
          idle = setTimeout(function () { blurTo(0); }, 110);
        },
      });
    });
  }

  /* ------------------------------------------------------------------
     Counters  [data-count]
  ------------------------------------------------------------------ */
  function counters() {
    $$("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var pre = el.getAttribute("data-prefix") || "";
      var suf = el.getAttribute("data-suffix") || "";
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var fmt = function (v) {
        return pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      };
      if (!hasGSAP || reduced) { el.textContent = fmt(target); return; }
      el.textContent = fmt(0);
      var o = { v: 0 };
      ST.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: function () {
          gsap.to(o, {
            v: target, duration: 2.2, ease: "power3.out",
            onUpdate: function () { el.textContent = fmt(dec ? o.v : Math.round(o.v)); },
          });
        },
      });
    });
  }

  /* ------------------------------------------------------------------
     Misc scroll pieces: timeline line, procedure rail, bars
  ------------------------------------------------------------------ */
  function drawPieces() {
    if (!hasGSAP || reduced) return;
    $$("[data-draw-line]").forEach(function (wrap) {
      var line = $(".timeline__line span", wrap);
      if (!line) return;
      gsap.fromTo(line, { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top 70%", end: "bottom 70%", scrub: true },
      });
    });
    $$("[data-rail]").forEach(function (rail) {
      var bar = $(".rail__bar", rail);
      var nodes = $$(".rail__node", rail);
      var tl = gsap.timeline({ scrollTrigger: { trigger: rail, start: "top 75%", once: true } });
      tl.to(bar, { scaleX: 1, scaleY: 1, duration: 1.6, ease: "expo.inOut" });
      nodes.forEach(function (n, i) {
        tl.fromTo(n, { borderColor: "rgba(244,242,238,.24)", color: "#8f8a82" },
          { borderColor: "#ff6a2e", color: "#f4f2ee", duration: 0.4 }, 0.2 + i * 0.35);
      });
    });
    $$("[data-bars]").forEach(function (wrap) {
      gsap.to($$(".bar__fill", wrap), {
        scaleY: 1, duration: 1.4, ease: "expo.out", stagger: 0.1,
        scrollTrigger: { trigger: wrap, start: "top 80%", once: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     Accordions (FAQ, journal)
  ------------------------------------------------------------------ */
  function accordions() {
    $$("[data-acc]").forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      panel.hidden = true;
      panel.style.height = "0px";
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        if (!open) {
          panel.hidden = false;
          if (hasGSAP && !reduced) {
            gsap.fromTo(panel, { height: 0 }, { height: "auto", duration: 0.7, ease: "expo.out", onComplete: function () { ST.refresh(); } });
          } else { panel.style.height = "auto"; }
        } else {
          if (hasGSAP && !reduced) {
            gsap.to(panel, { height: 0, duration: 0.5, ease: "expo.out", onComplete: function () { panel.hidden = true; ST.refresh(); } });
          } else { panel.style.height = "0px"; panel.hidden = true; }
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Canvas: circuit particles (6 agents, right-angle turns, fading trails)
  ------------------------------------------------------------------ */
  function circuit() {
    var cv = $("canvas.circuit");
    if (!cv) return;
    if (reduced) { cv.remove(); return; }
    var ctx = cv.getContext("2d");
    var G = 44, W = 0, H = 0, raf = 0, running = false;
    var colors = ["255,106,46", "217,160,91", "201,242,77", "217,160,91", "244,242,238", "255,106,46"];
    var agents = [];
    function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    function snap(v) { return Math.round(v / G) * G; }
    function spawn(a) {
      a.x = snap(Math.random() * W); a.y = snap(Math.random() * H);
      var d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0];
      a.dx = d[0]; a.dy = d[1];
      a.speed = 0.7 + Math.random() * 0.9;
      a.run = 0; a.life = 0; a.max = 420 + Math.random() * 520;
      a.trail = [{ x: a.x, y: a.y }];
      return a;
    }
    function step(a) {
      a.x += a.dx * a.speed; a.y += a.dy * a.speed; a.run += a.speed; a.life++;
      if (a.run >= G) {
        a.run = 0; a.x = snap(a.x); a.y = snap(a.y);
        a.trail.push({ x: a.x, y: a.y });
        if (a.trail.length > 16) a.trail.shift();
        if (Math.random() < 0.34) {
          var s = Math.random() < 0.5 ? 1 : -1;
          var ndx = a.dy * s, ndy = a.dx * s;
          a.dx = ndx; a.dy = ndy;
        }
      }
      if (a.life > a.max || a.x < -G || a.y < -G || a.x > W + G || a.y > H + G) spawn(a);
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      agents.forEach(function (a, k) {
        var phase = Math.sin(Math.PI * (a.life / a.max));
        var pts = a.trail.concat([{ x: a.x, y: a.y }]);
        for (var i = 1; i < pts.length; i++) {
          var f = i / pts.length;
          ctx.strokeStyle = "rgba(" + colors[k] + "," + (0.16 * f * phase).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
        }
        ctx.fillStyle = "rgba(" + colors[k] + "," + (0.5 * phase).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.4, 0, Math.PI * 2); ctx.fill();
      });
    }
    function loop() { raf = requestAnimationFrame(loop); agents.forEach(step); draw(); }
    function update() {
      var go = !document.hidden;
      if (go && !running) { running = true; loop(); } else if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    resize();
    for (var i = 0; i < 6; i++) { var a = spawn({}); a.life = Math.random() * a.max * 0.6; agents.push(a); }
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", update);
    update();
  }

  /* ------------------------------------------------------------------
     Canvas: cursor trail (3 stacked strokes + end dot)
  ------------------------------------------------------------------ */
  function cursorTrail() {
    var cv = $("canvas.trail");
    if (!cv) return;
    if (reduced || !finePointer) { cv.remove(); return; }
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], raf = 0, running = false, LIFE = 280;
    function resize() {
      cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    var layers = [[15, "255,138,76", 0.07], [7, "255,138,76", 0.2], [3, "255,236,222", 0.85]];
    function path() {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      var l = pts[pts.length - 1];
      ctx.lineTo(l.x, l.y);
    }
    function frame() {
      var now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (pts.length < 2) { running = false; return; }
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      layers.forEach(function (L) {
        ctx.lineWidth = L[0];
        ctx.strokeStyle = "rgba(" + L[1] + "," + L[2] + ")";
        path(); ctx.stroke();
      });
      var e = pts[pts.length - 1];
      ctx.fillStyle = "rgba(255,244,236,.95)";
      ctx.beginPath(); ctx.arc(e.x, e.y, 3.25, 0, Math.PI * 2); ctx.fill();
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > 28) pts.shift();
      if (!running) { running = true; raf = requestAnimationFrame(frame); }
    }, { passive: true });
    resize();
    window.addEventListener("resize", resize);
  }

  /* ------------------------------------------------------------------
     Canvas: footer globe (lat/long every 10°, idle when off-screen)
  ------------------------------------------------------------------ */
  function globe() {
    var cv = $("canvas.globe");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var S = 0, rot = 0, raf = 0, visible = false, running = false, last = 0;
    var D = Math.PI / 180, TILT = 0.38;
    function resize() {
      S = cv.clientWidth || 600;
      cv.width = S * dpr; cv.height = S * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function proj(lat, lon) {
      var cl = Math.cos(lat), x = cl * Math.sin(lon + rot), y = Math.sin(lat), z = cl * Math.cos(lon + rot);
      var y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
      var z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
      return [S / 2 + x * S * 0.46, S / 2 - y2 * S * 0.46, z2];
    }
    function poly(fn, n, front, back) {
      var prev = fn(0);
      for (var i = 1; i <= n; i++) {
        var p = fn(i);
        var target = (p[2] + prev[2]) / 2 >= 0 ? front : back;
        target.push(prev[0], prev[1], p[0], p[1]);
        prev = p;
      }
    }
    function stroke(arr, alpha) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (var i = 0; i < arr.length; i += 4) { ctx.moveTo(arr[i], arr[i + 1]); ctx.lineTo(arr[i + 2], arr[i + 3]); }
      ctx.stroke();
    }
    function draw() {
      ctx.clearRect(0, 0, S, S);
      ctx.strokeStyle = "#f4f2ee";
      ctx.lineWidth = 1;
      var front = [], back = [];
      for (var lon = 0; lon < 360; lon += 10) {
        (function (L) { poly(function (i) { return proj((-90 + i * 4) * D, L * D); }, 45, front, back); })(lon);
      }
      for (var lat = -80; lat <= 80; lat += 10) {
        (function (A) { poly(function (i) { return proj(A * D, i * 4 * D); }, 90, front, back); })(lat);
      }
      stroke(back, 0.09 * 0.35);
      stroke(front, 0.09);
      ctx.globalAlpha = 0.14;
      ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return; // ~30fps is plenty
      last = t;
      rot += 0.0035;
      draw();
    }
    function update() {
      var go = visible && !document.hidden && !reduced;
      if (go && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    resize();
    window.addEventListener("resize", resize);
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; update(); }).observe(cv);
    document.addEventListener("visibilitychange", update);
  }

  /* ------------------------------------------------------------------
     Contact form (client-side validation, success state)
  ------------------------------------------------------------------ */
  function contactForm() {
    var form = $("#contact-form");
    if (!form) return;
    var success = $("#form-success");
    var rules = {
      company: function (v) { return v.trim().length >= 2 || "회사명 또는 이름을 입력해 주세요."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "올바른 이메일 주소를 입력해 주세요."; },
      phone: function (v) { return /^[0-9+\-\s()]{9,}$/.test(v.trim()) || "연락 가능한 번호를 입력해 주세요."; },
      type: function () { return !!form.querySelector('input[name="type"]:checked') || "문의 유형을 선택해 주세요."; },
      message: function (v) { return v.trim().length >= 10 || "내용을 10자 이상 적어 주세요."; },
      agree: function () { return form.agree.checked || "개인정보 수집·이용에 동의해 주세요."; },
    };
    function check(name) {
      var field = form.querySelector('[data-field="' + name + '"]');
      var input = form.elements[name];
      var val = input && input.value !== undefined ? input.value : "";
      var res = rules[name](val);
      var err = field.querySelector(".field__err");
      var ok = res === true;
      field.classList.toggle("is-invalid", !ok);
      err.textContent = ok ? "" : res;
      var targets = input && input.length && !input.tagName ? Array.prototype.slice.call(input) : [input];
      targets.forEach(function (t) { if (t && t.setAttribute) t.setAttribute("aria-invalid", ok ? "false" : "true"); });
      return ok;
    }
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var list = input.length && !input.tagName ? Array.prototype.slice.call(input) : [input];
      list.forEach(function (el) {
        el.addEventListener(el.type === "radio" || el.type === "checkbox" ? "change" : "blur", function () {
          var f = form.querySelector('[data-field="' + name + '"]');
          if (f.classList.contains("is-invalid") || el.type !== "radio") check(name);
        });
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        if (!check(name) && !firstBad) firstBad = name;
      });
      if (firstBad) {
        var el = form.elements[firstBad];
        el = el.length && !el.tagName ? el[0] : el;
        el.focus();
        return;
      }
      form.hidden = true;
      success.classList.add("is-on");
      var h = success.querySelector("h3");
      h.setAttribute("tabindex", "-1");
      h.focus();
      if (hasGSAP && !reduced) gsap.fromTo(success, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" });
      if (hasGSAP) ST.refresh();
    });
    var again = $("#form-again");
    if (again) again.addEventListener("click", function () {
      form.reset();
      $$(".field", form).forEach(function (f) { f.classList.remove("is-invalid"); });
      $$(".field__err", form).forEach(function (f) { f.textContent = ""; });
      success.classList.remove("is-on");
      form.hidden = false;
      form.elements.company.focus();
      if (hasGSAP) ST.refresh();
    });
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  accordions();
  contactForm();
  circuit();
  cursorTrail();
  globe();
  hoverLists();
  cursorZones();
  counters();
  if (hasGSAP) {
    charReveals();
    reveals();
    holdPanels();
    hscroll();
    velocityBlur();
    drawPieces();
    stageMotion();
    window.addEventListener("load", function () { ST.refresh(); });
  }
  introCurtain(heroIntro);
})();
