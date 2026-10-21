/* Urban Mistrii — motion layer (um-motion.js).
   Vanilla JS for the hero letter reveal. The homepage adds Lenis smooth
   scroll and GSAP ScrollTrigger reveals, vendored in /vendor (gsap 3.12.5,
   lenis 1.3.23). Without those globals, or with reduced motion, the
   existing CSS/IntersectionObserver reveals in script.js still apply.
   2026-10-19 (feature round): cut to ONE motion moment per Claude's
   roadmap — the Loupe hero letter reveal stays; the Mariana depth
   parallax and the Vesper pin-and-dock were removed (they also carried
   a never-ending rAF loop). */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Loupe letter reveal: split the hero H1 into letters, staggered --- */
  var h1 = document.querySelector(".progressive-hero-copy .progressive-headline");
  if (h1 && !reduced) {
    var words = h1.textContent.trim().split(/\s+/);
    /* The line is a paragraph, where aria-label is ignored, so screen readers
       get a visually hidden copy of the text instead of the split letters. */
    var spoken = document.createElement("span");
    spoken.className = "lx-sr";
    spoken.textContent = h1.textContent.trim();
    h1.textContent = "";
    h1.appendChild(spoken);
    words.forEach(function (word, wi) {
      var w = document.createElement("span");
      w.className = "lx-word";
      w.setAttribute("aria-hidden", "true");
      word.split("").forEach(function (ch) {
        var s = document.createElement("span");
        s.className = "lx-letter";
        /* Stagger per word, not per letter: letters in one word rise together. */
        s.style.setProperty("--i", wi);
        s.textContent = ch;
        w.appendChild(s);
      });
      h1.appendChild(w);
      if (wi < words.length - 1) h1.appendChild(document.createTextNode(" "));
    });
  }

  /* --- Press credit: once the headline lands, the rule draws down and the
     publication names arrive in turn. Timing lives in um-motion.css. --- */
  var press = document.querySelector(".progressive-press");
  if (press && !reduced) {
    var headlineWords = h1 ? h1.querySelectorAll(".lx-word").length : 0;
    press.style.setProperty("--press-delay", headlineWords * 70 + 200 + "ms");
    Array.prototype.forEach.call(press.querySelectorAll("span"), function (name, i) {
      name.style.setProperty("--n", i);
    });
    press.classList.add("is-sequenced");
  }

  /* --- Project hand-off: on a cross-document view transition, the image the
     visitor clicked morphs into the project page hero, which carries the same
     view-transition-name in styles.css. Browsers without support just navigate. */
  var handoffImage = null;
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href^="/projects/"]');
    handoffImage = link ? link.querySelector("img") : null;
  });
  window.addEventListener("pageswap", function (e) {
    if (e.viewTransition && handoffImage) handoffImage.style.viewTransitionName = "project-hero";
  });
  /* Coming back through the back/forward cache: drop the name so it can't collide. */
  window.addEventListener("pageshow", function () {
    if (handoffImage) handoffImage.style.viewTransitionName = "";
    handoffImage = null;
  });

  /* --- Homepage: Lenis smooth scroll + GSAP ScrollTrigger reveals --- */
  var isHome = document.body.classList.contains("modus-home");
  if (!isHome || reduced || !window.gsap || !window.ScrollTrigger || !window.Lenis) return;

  gsap.registerPlugin(ScrollTrigger);

  /* Lenis drives scrolling from GSAP's ticker so there is one rAF loop,
     and ScrollTrigger re-measures on every smoothed scroll frame. */
  var lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* script.js marks these with data-reveal for the CSS/IO fallback. Remove
     the attribute so GSAP owns their entrance instead of the CSS transition. */
  var revealSelector = [
    ".mf-section-label",
    ".mf-project-row",
    ".case-file",
    ".progressive-method article",
    ".mf-service-list a",
    ".mf-image-field figure",
    ".mf-studio-copy p",
    ".mf-contact-copy"
  ].join(", ");

  var revealItems = Array.prototype.slice.call(document.querySelectorAll(revealSelector));
  revealItems.forEach(function (el) { el.removeAttribute("data-reveal"); });
  gsap.set(revealItems, { opacity: 0, y: 28 });

  revealItems.forEach(function (el) {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });

  /* Photographs unveil from the bottom edge while settling from a slight zoom.
     The inset on the sides tracks the zoom so the image never spills past its
     frame. CSS hover transitions are paused until the tween hands back. */
  var unveilImages = Array.prototype.slice.call(document.querySelectorAll(".mf-project-row img, .case-file img"));
  unveilImages.forEach(function (img) {
    gsap.fromTo(img,
      { clipPath: "inset(100% 3.7% 3.7% 3.7%)", scale: 1.08, transition: "none" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        scale: 1,
        duration: 1.2,
        ease: "power3.out",
        clearProps: "clipPath,transform,transition",
        scrollTrigger: { trigger: img, start: "top 88%", once: true }
      });
  });

  /* Hero photographs are the first paint, so they are never hidden: they open
     from a slightly inset frame and settle as the headline arrives. */
  gsap.fromTo(".progressive-feature img",
    { clipPath: "inset(3% 3% 3% 3%)", scale: 1.06 },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      duration: 1.6,
      ease: "power2.out",
      stagger: 0.15,
      clearProps: "clipPath,transform"
    });

  /* Layout can shift after images load; re-measure once everything is in. */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
