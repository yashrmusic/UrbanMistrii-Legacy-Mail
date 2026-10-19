/* Urban Mistrii — motion layer (um-motion.js).
   Vanilla JS, no libraries. See um-motion.css for technique credits.
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
})();
