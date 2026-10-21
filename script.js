const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navShell = document.querySelector("[data-nav-shell]");
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");

/* #27 — the ticking clock strip was removed from the homepage;
   no live clock is rendered anywhere on the site. */

const updateHeader = () => {
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const closeMenu = () => {
  if (!header || !navToggle) {
    return;
  }

  header.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  const toggleLabel = navToggle.querySelector(".nav-toggle-label");
  if (toggleLabel) toggleLabel.textContent = "Menu";
  document.body.classList.remove("menu-open");
};

if (navToggle && header && navShell) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    const toggleLabel = navToggle.querySelector(".nav-toggle-label");
    if (toggleLabel) toggleLabel.textContent = isOpen ? "Close" : "Menu";
    document.body.classList.toggle("menu-open", isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!header.classList.contains("is-open")) {
      return;
    }

    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  navShell.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filters.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");

    projects.forEach((project) => {
      const shouldShow = filter === "all" || project.dataset.category === filter;
      project.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const revealTargets = document.querySelectorAll(
  ".section-grid, .project, .studio-copy, .process > div, .service-grid article, .press-cards article, .contact-panel, .case-study"
    + ", .updates, .update-list article"
    + ", .mf-hero, .mf-project-index, .mf-image-field, .mf-studio-index, .mf-service-index, .mf-press-strip"
    + ", .mf-contact-index, .mf-proof-strip, .mf-testimonial-strip, .mf-instagram-strip, .mf-project-row, .progressive-method"
    + ", .progressive-case-files, .case-file"
);

revealTargets.forEach((target) => target.setAttribute("data-reveal", ""));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0 }
);

revealTargets.forEach((target) => observer.observe(target));

/* Failsafe (audit fix #1): if anything has not been revealed shortly after
   load — no-scroll renders, full-page captures, crawlers, slow scripts —
   reveal all content and mark images loaded so nothing stays blank. */
window.setTimeout(() => {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
  document.querySelectorAll("img").forEach((img) => img.classList.add("loaded"));
}, 1500);

document.querySelectorAll("img").forEach((img) => {
  if (img.complete) {
    img.classList.add("loaded");
  } else {
    img.addEventListener("load", () => img.classList.add("loaded"));
  }
});

/* Card tilt removed 2026-10-19 (feature round): motion is cut to the
   single hero letter reveal; hover states live in CSS. */

window.addEventListener("pageshow", () => {
  if (window.location.hash) {
    document.querySelector(window.location.hash)?.scrollIntoView();
  }
});

const assistantKnowledge = [
  {
    match: ["start project", "enquiry", "inquiry", "brief", "project brief", "contact", "hire"],
    title: "Start a project",
    body: "The fastest route is the structured project enquiry form, where you can share the project type, location, stage, budget, and timeline.",
    actions: [
      { label: "Open enquiry form", href: "/start-project" },
      { label: "Review process", href: "/process" }
    ]
  },
  {
    match: ["services", "scope", "what do you do", "offer", "architecture", "interiors"],
    title: "Services and scope",
    body: "Urban Mistrii works across architecture, interiors, hospitality, workplace, retail, and development-led planning, with support ranging from concept to execution-aware design.",
    actions: [
      { label: "View services", href: "/services" },
      { label: "Read FAQ", href: "/faq" }
    ]
  },
  {
    match: ["process", "how do you work", "timeline", "stages", "workflow"],
    title: "Project process",
    body: "The studio usually moves from brief and alignment to concept, design development, and execution support so design quality survives real-world constraints.",
    actions: [
      { label: "See process", href: "/process" },
      { label: "Start a project", href: "/start-project" }
    ]
  },
  {
    match: ["portfolio", "work", "projects", "case studies", "published", "press"],
    title: "Work and press",
    body: "Browse selected work on the homepage, detailed project notes in the case studies, and publication coverage on the press page.",
    actions: [
      { label: "Case studies", href: "/projects/case-studies" },
      { label: "Press room", href: "/press" },
      { label: "Download portfolio", href: "/assets/urbanmistrii-portfolio.pdf" }
    ]
  },
  {
    match: ["faq", "questions", "where do you work", "when should we reach out", "do you support execution"],
    title: "Common questions",
    body: "The FAQ covers locations, project fit, timing, execution support, and what to include in a strong enquiry.",
    actions: [
      { label: "Open FAQ", href: "/faq" },
      { label: "View sectors", href: "/sectors" }
    ]
  },
  {
    match: ["sector", "typology", "residential", "hospitality", "workplace", "retail", "development"],
    title: "Project sectors",
    body: "Urban Mistrii’s work spans residences, hospitality, workplaces, retail, specialist interiors, and development-led layouts.",
    actions: [
      { label: "View sectors", href: "/sectors" },
      { label: "Browse work", href: "/#work" }
    ]
  },
  {
    match: ["careers", "job", "internship", "join", "team"],
    title: "Careers and team",
    body: "Open roles, application guidance, and the team login are all available on the website.",
    actions: [
      { label: "View careers", href: "/careers" },
      { label: "Team login", href: "/portal" }
    ]
  }
];

const defaultAssistantResponse = {
  title: "How can I help?",
  body: "I can point you to case studies, services, process, FAQ, sectors, careers, press coverage, or the project enquiry form.",
  actions: [
    { label: "Start a project", href: "/start-project" },
    { label: "View services", href: "/services" },
    { label: "Read FAQ", href: "/faq" }
  ]
};

const scoreAssistantEntry = (message, entry) =>
  entry.match.reduce((total, keyword) => total + (message.includes(keyword) ? keyword.length : 0), 0);

const getAssistantResponse = (message) => {
  const query = String(message || "").trim().toLowerCase();
  if (!query) return defaultAssistantResponse;

  const ranked = assistantKnowledge
    .map((entry) => ({ entry, score: scoreAssistantEntry(query, entry) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].entry : defaultAssistantResponse;
};

const createAssistant = () => {
  if (document.body.dataset.noAssistant === "true") return;

  const root = document.createElement("div");
  root.className = "site-assistant";
  root.innerHTML = `
    <button class="assistant-trigger" type="button" aria-label="Ask Urban Mistrii" aria-expanded="false" aria-controls="site-assistant-panel">
      <span class="assistant-trigger-label">Ask Urban Mistrii</span>
    </button>
    <section class="assistant-panel" id="site-assistant-panel" hidden aria-label="Website assistant">
      <div class="assistant-panel-head">
        <div>
          <p class="assistant-kicker">Website assistant</p>
          <h2>Need help finding the right page?</h2>
        </div>
        <button class="assistant-close" type="button" aria-label="Close assistant">Close</button>
      </div>
      <div class="assistant-thread" data-assistant-thread></div>
      <form class="assistant-form" data-assistant-form>
        <label>
          <span class="assistant-visually-hidden">Ask a question</span>
          <input name="message" type="text" placeholder="Ask about projects, services, process, FAQ, careers..." autocomplete="off">
        </label>
        <button type="submit">Ask</button>
      </form>
      <div class="assistant-shortcuts">
        <button type="button" data-assistant-prompt="I want to start a project">Start a project</button>
        <button type="button" data-assistant-prompt="Show me your services">Services</button>
        <button type="button" data-assistant-prompt="What kinds of projects do you do?">Project types</button>
        <button type="button" data-assistant-prompt="I have some common questions">FAQ</button>
      </div>
    </section>
  `;

  document.body.append(root);

  const trigger = root.querySelector(".assistant-trigger");
  const panel = root.querySelector(".assistant-panel");
  const close = root.querySelector(".assistant-close");
  const form = root.querySelector("[data-assistant-form]");
  const thread = root.querySelector("[data-assistant-thread]");
  const input = form.querySelector("input");

  const appendBubble = (type, content, actions = []) => {
    const bubble = document.createElement("article");
    bubble.className = `assistant-bubble assistant-bubble-${type}`;

    if (typeof content === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      bubble.append(paragraph);
    } else {
      const title = document.createElement("strong");
      const paragraph = document.createElement("p");
      title.textContent = content.title;
      paragraph.textContent = content.body;
      bubble.append(title, paragraph);
    }

    if (actions.length) {
      const links = document.createElement("div");
      links.className = "assistant-actions";
      actions.forEach((action) => {
        const link = document.createElement("a");
        link.href = action.href;
        link.textContent = action.label;
        if (action.href.endsWith(".pdf")) {
          link.setAttribute("download", "");
        }
        links.append(link);
      });
      bubble.append(links);
    }

    thread.append(bubble);
    thread.scrollTop = thread.scrollHeight;
  };

  const askAssistant = (message) => {
    appendBubble("user", message);
    const response = getAssistantResponse(message);
    appendBubble("assistant", response, response.actions || []);
  };

  const openAssistant = () => {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    if (!thread.children.length) {
      appendBubble("assistant", defaultAssistantResponse, defaultAssistantResponse.actions);
    }
    window.setTimeout(() => input.focus(), 40);
  };

  const closeAssistant = () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  };

  trigger.addEventListener("click", () => {
    if (panel.hidden) {
      openAssistant();
    } else {
      closeAssistant();
    }
  });

  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAssistant();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    askAssistant(message);
    input.value = "";
  });

  root.querySelectorAll("[data-assistant-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      askAssistant(button.dataset.assistantPrompt);
    });
  });

  thread.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeAssistant();
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !root.contains(event.target)) closeAssistant();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeAssistant();
  });
};

createAssistant();

const projectFilterButtons = document.querySelectorAll(".mf-project-filters button");
const projectRows = document.querySelectorAll(".mf-project-row");

projectFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    projectFilterButtons.forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
    });
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");

    projectRows.forEach((row) => {
      const shouldShow = filter === "all" || row.dataset.category === filter;
      row.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImg = lightbox?.querySelector(".lightbox-img");
const lightboxCaption = lightbox?.querySelector(".lightbox-caption");

let lightboxImages = [];
let lightboxIndex = 0;

const openLightbox = (img, caption) => {
  if (!lightbox || !lightboxImg) return;

  const allImages = document.querySelectorAll(
    ".mf-hero-project img, .mf-project-row img, .mf-image-field img"
  );
  lightboxImages = Array.from(allImages).map((i) => ({
    src: i.getAttribute("src"),
    alt: i.getAttribute("alt"),
    caption: i.closest("a, figure")?.querySelector("span, figcaption")?.textContent?.trim() || i.alt
  }));

  const clickedSrc = img.getAttribute("src");
  lightboxIndex = lightboxImages.findIndex((i) => i.src === clickedSrc);
  if (lightboxIndex === -1) lightboxIndex = 0;

  showLightboxImage();
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
};

const showLightboxImage = () => {
  if (!lightboxImages.length) return;
  const item = lightboxImages[lightboxIndex];
  lightboxImg.src = item.src;
  lightboxImg.alt = item.alt;
  lightboxCaption.textContent = item.caption;
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.style.overflow = "";
};

const navigateLightbox = (direction) => {
  if (!lightboxImages.length) return;
  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  showLightboxImage();
};

document.querySelectorAll(".mf-hero-project, .mf-project-row, .mf-image-field figure").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      e.preventDefault();
      openLightbox(e.target);
    }
  });
});

document.querySelectorAll(".mf-hero-project img, .mf-project-row img, .mf-image-field img").forEach((img) => {
  img.setAttribute("data-lightbox-target", "");
});

if (lightbox) {
  lightbox.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-prev")?.addEventListener("click", () => navigateLightbox(-1));
  lightbox.querySelector(".lightbox-next")?.addEventListener("click", () => navigateLightbox(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });
}

const backToTop = document.querySelector("[data-back-to-top]");

if (backToTop) {
  const toggleBackToTop = () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 600);
  };

  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  toggleBackToTop();

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const testimonialBlocks = document.querySelectorAll("[data-testimonials] blockquote");
const dotsContainer = document.querySelector("[data-testimonial-dots]");
let testimonialIndex = 0;

/* Testimonials are manual-only since 2026-10-19 (feature round):
   no auto-rotation, so nothing moves under the reader and
   prefers-reduced-motion is respected by default. */
if (testimonialBlocks.length && dotsContainer) {
  const showTestimonial = (index) => {
    testimonialBlocks.forEach((b) => b.classList.remove("is-visible"));
    dotsContainer.querySelectorAll("button").forEach((d) => d.classList.remove("is-active"));
    testimonialBlocks[index].classList.add("is-visible");
    dotsContainer.children[index].classList.add("is-active");
    testimonialIndex = index;
  };

  testimonialBlocks.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", `Testimonial ${i + 1}`);
    if (i === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => showTestimonial(i));
    dotsContainer.append(dot);
  });
}

const cursor = document.querySelector("[data-cursor]");

if (cursor && window.matchMedia("(pointer: fine)").matches) {
  const moveCursor = (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  };

  document.addEventListener("mousemove", moveCursor, { passive: true });

  document.querySelectorAll("a, button, input, textarea, [data-lightbox-target]").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hovering"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hovering"));
  });
}

/* Single-key shortcuts (W/S/C/P) removed 2026-10-19 (feature round):
   pressing P used to open the 2.5 MB portfolio PDF unprompted, and the
   keys collided with normal typing expectations. Navigation is via the
   header, footer and the mobile action bar. */

/* --- Mobile action bar (feature round) ---
   A slim bottom bar on small screens so the next step is always one
   tap away. Hidden on the enquiry form and confirmation pages, where
   the primary action is already on screen. */
(function () {
  var path = window.location.pathname;
  if (path.indexOf("start-project") !== -1 || path.indexOf("thank-you") !== -1) return;
  if (document.querySelector(".mobile-action-bar")) return;
  var bar = document.createElement("div");
  bar.className = "mobile-action-bar";
  document.body.classList.add("has-mab");
  bar.innerHTML =
    '<a class="mab-primary" href="/start-project">Start a project</a>' +
    '<a class="mab-whatsapp" href="https://wa.me/919953668560?text=Hello%20Urban%20Mistrii%2C%20I%20have%20a%20project%20enquiry." target="_blank" rel="noreferrer">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 21l1.6-4.7A9 9 0 1 1 8 19.5L3 21z"/></svg>' +
    '<span>WhatsApp</span></a>';
  document.body.appendChild(bar);
})();

/* --- Start-a-project brief wizard (feature round) ---
   The enquiry form is one FormSubmit form; this controller groups its
   fields into 4 steps, validates the current step before advancing,
   keeps progress in localStorage, pre-selects the project type from
   ?type=, and enriches the hidden lead_source with UTM + referrer so
   the studio can see where each enquiry came from. */
(function () {
  var form = document.querySelector("[data-wizard]");
  if (!form) return;
  var steps = Array.prototype.slice.call(form.querySelectorAll("[data-wizard-step]"));
  if (!steps.length) return;
  var current = 0;
  var KEY = "um-brief-v1";

  var source = form.querySelector('input[name="lead_source"]');
  if (source) {
    var q = new URLSearchParams(window.location.search);
    var bits = ["Website / Start Project page"];
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
      if (q.get(k)) bits.push(k + "=" + q.get(k));
    });
    if (document.referrer) {
      try {
        var host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname) bits.push("ref=" + host);
      } catch (e) { /* ignore */ }
    }
    source.value = bits.join(" | ");
  }

  var typeParam = new URLSearchParams(window.location.search).get("type");
  var typeSelect = form.querySelector('select[name="project_type"]');
  if (typeParam && typeSelect) {
    Array.prototype.forEach.call(typeSelect.options, function (opt) {
      if (opt.value.toLowerCase() === typeParam.toLowerCase()) typeSelect.value = opt.value;
    });
  }

  /* The brief guidance changes with the project type. */
  var typeHint = form.querySelector("[data-type-hint]");
  var HINTS = {
    "Restaurant / Cafe": "Helpful in the brief: covers, kitchen size, bar, and your target opening month.",
    "Bar / Nightlife": "Helpful in the brief: covers, bar length, licensing stage, and your target opening month.",
    "Residence": "Helpful in the brief: plot or flat size, floors, who will live here, and your move-in target.",
    "Farmhouse / Villa": "Helpful in the brief: plot size, floors, who will use it, and your move-in target.",
    "Workplace / Office": "Helpful in the brief: headcount, floors, and your move-in date.",
    "Retail": "Helpful in the brief: store size, frontage, and how many locations are planned.",
    "Group housing / Residential development": "Helpful in the brief: plot size, unit mix, and the approvals stage."
  };
  function updateHint() {
    if (typeHint && typeSelect) typeHint.textContent = HINTS[typeSelect.value] || "";
  }
  if (typeSelect) typeSelect.addEventListener("change", updateHint);
  updateHint();

  /* Enter inside a field must not submit a half-finished wizard. */
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit") {
      e.preventDefault();
    }
  });

  try {
    var saved = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    Object.keys(saved).forEach(function (name) {
      var field = form.querySelector('[name="' + name + '"]');
      if (field && !field.value) field.value = saved[name];
    });
  } catch (e) { /* ignore */ }

  form.addEventListener("input", function () {
    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll("input, select, textarea"), function (f) {
      if (f.name && f.type !== "hidden" && f.name !== "_honey") data[f.name] = f.value;
    });
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  });
  form.addEventListener("submit", function () {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  });

  var progress = form.querySelector("[data-wizard-progress]");
  var errorBox = form.querySelector("[data-wizard-error]");

  function show(step) {
    current = Math.max(0, Math.min(step, steps.length - 1));
    steps.forEach(function (s, i) { s.hidden = i !== current; });
    if (progress) {
      progress.textContent = "Step " + (current + 1) + " of " + steps.length;
      var fill = form.querySelector("[data-wizard-fill]");
      if (fill) fill.style.width = ((current + 1) / steps.length) * 100 + "%";
    }
    if (errorBox) errorBox.textContent = "";
    var first = steps[current].querySelector("input, select, textarea");
    if (first) first.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stepValid() {
    var required = steps[current].querySelectorAll("[required]");
    for (var i = 0; i < required.length; i++) {
      if (!required[i].value || !required[i].checkValidity()) {
        if (errorBox) errorBox.textContent = "Please complete the required fields in this step before continuing.";
        required[i].focus();
        return false;
      }
    }
    return true;
  }

  form.querySelectorAll("[data-wizard-next]").forEach(function (btn) {
    btn.addEventListener("click", function () { if (stepValid()) show(current + 1); });
  });
  form.querySelectorAll("[data-wizard-back]").forEach(function (btn) {
    btn.addEventListener("click", function () { show(current - 1); });
  });
  show(0);
})();

/* Case-study sector filters (projects/case-studies) */
(function () {
  var btns = document.querySelectorAll('[data-case-filter]');
  if (!btns.length) return;
  var items = document.querySelectorAll('.editorial-case[data-category]');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-case-filter');
      btns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      items.forEach(function (el) {
        el.classList.toggle('is-hidden', f !== 'all' && el.getAttribute('data-category') !== f);
      });
    });
  });
})();
