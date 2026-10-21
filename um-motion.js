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
  var h1 = document.querySelector(".progressive-hero-copy h1");
  if (h1 && !reduced) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute("aria-label", h1.textContent.trim());
    h1.textContent = "";
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

  /* Layout can shift after images load; re-measure once everything is in. */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
