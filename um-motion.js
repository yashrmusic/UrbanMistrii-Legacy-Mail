/* Urban Mistrii — motion layer (um-motion.js).
   Vanilla JS, no libraries. See um-motion.css for technique credits. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. Loupe letter reveal: split the hero H1 into letters, staggered --- */
  var h1 = document.querySelector(".progressive-hero-copy h1");
  if (h1 && !reduced) {
    var words = h1.textContent.trim().split(/\s+/);
    var i = 0;
    h1.setAttribute("aria-label", h1.textContent.trim());
    h1.textContent = "";
    words.forEach(function (word, wi) {
      var w = document.createElement("span");
      w.className = "lx-word";
      w.setAttribute("aria-hidden", "true");
      word.split("").forEach(function (ch) {
        var s = document.createElement("span");
        s.className = "lx-letter";
        s.style.setProperty("--i", i++);
        s.textContent = ch;
        w.appendChild(s);
      });
      h1.appendChild(w);
      if (wi < words.length - 1) h1.appendChild(document.createTextNode(" "));
    });
  }

  if (reduced) return;

  /* --- Shared rAF loop --- */
  var hero = document.querySelector(".progressive-hero");
  var copy = document.querySelector(".progressive-hero-copy");
  var featLarge = document.querySelector(".progressive-feature:not(.progressive-feature-small)");
  var featSmall = document.querySelector(".progressive-feature-small");
  var caseGrid = document.querySelector(".case-file-grid");
  var caseLarge = document.querySelector(".case-file-large");
  var px = 0, py = 0, tx = 0, ty = 0; // pointer drift (current / target)

  if (hero) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener("mouseleave", function () { tx = 0; ty = 0; });
  }

  function frame() {
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    /* --- 2. Mariana depth parallax on the hero ---
       Layers at different depths: copy drifts least and fades,
       large image mid, small image (nearest plate) moves most.
       Small-image pointer drift is kept modest (12/10px) so it does
       not clip at the hero's right edge at extreme pointer positions. */
    if (hero) {
      var hr = hero.getBoundingClientRect();
      var p = Math.min(Math.max(-hr.top / hr.height, 0), 1); // 0..1 hero exit progress
      if (copy) {
        copy.style.transform = "translateY(" + (-30 * p + py * -6) + "px)";
        copy.style.opacity = String(1 - 0.55 * p);
      }
      if (featLarge) {
        featLarge.style.transform =
          "translate(" + (px * 10) + "px," + (py * 8 - 55 * p) + "px)";
      }
      if (featSmall) {
        featSmall.style.transform =
          "translate(" + (px * 12) + "px," + (py * 10 - 120 * p) + "px)";
      }
    }

    /* --- 3. Vesper pin-and-dock on the large case file ---
       The card is position:sticky (um-motion.css). As the grid's end
       approaches, it scales down slightly and dims: the "dock". */
    if (caseGrid && caseLarge) {
      var gr = caseGrid.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = gr.height - vh + 240;
      var done = Math.min(Math.max((88 - gr.top) / Math.max(total, 1), 0), 1);
      var dock = Math.max(0, (done - 0.72) / 0.28); // dock only in the last stretch
      var s = 1 - 0.045 * dock;
      caseLarge.style.transform = "scale(" + s + ")";
      caseLarge.style.filter = "brightness(" + (1 - 0.12 * dock) + ")";
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
