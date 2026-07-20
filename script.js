const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navShell = document.querySelector("[data-nav-shell]");
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");
const localTime = document.querySelector("[data-local-time]");

const updateLocalTime = () => {
  if (!localTime) return;

  localTime.textContent = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
};

if (localTime) {
  updateLocalTime();
  window.setInterval(updateLocalTime, 1000);
}

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
  document.body.classList.remove("menu-open");
};

if (navToggle && header && navShell) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
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

    filters.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

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
  { threshold: 0.14 }
);

revealTargets.forEach((target) => observer.observe(target));

document.querySelectorAll("img").forEach((img) => {
  if (img.complete) {
    img.classList.add("loaded");
  } else {
    img.addEventListener("load", () => img.classList.add("loaded"));
  }
});

document.querySelectorAll(".mf-hero-project[data-tilt]").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -6;
    const rotateY = (x - centerX) / centerX * 6;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(600px) rotateX(0) rotateY(0)";
  });
});

window.addEventListener("pageshow", () => {
  if (window.location.hash) {
    document.querySelector(window.location.hash)?.scrollIntoView();
  }
});

const assistantKnowledge = [
  {
    match: ["start project", "enquiry", "inquiry", "brief", "project brief", "contact", "hire"],
    title: "Start a project",
    body: "The fastest route is the structured project enquiry form, where visitors can share project type, location, stage, budget, and timeline.",
    actions: [
      { label: "Open lead form", href: "/start-project" },
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
    body: "Visitors can browse selected work on the homepage, deeper project notes in case studies, and publication coverage through the press page.",
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
    body: "Careers information, application guidance, and the team entry point all live on the public site now.",
    actions: [
      { label: "View careers", href: "/careers" },
      { label: "Team login", href: "/portal" }
    ]
  }
];

const defaultAssistantResponse = {
  title: "How can I help?",
  body: "I can guide visitors to case studies, services, process, FAQ, sectors, careers, press coverage, or the project enquiry form.",
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
    <button class="assistant-trigger" type="button" aria-expanded="false" aria-controls="site-assistant-panel">
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

    projectFilterButtons.forEach((b) => b.classList.remove("is-active"));
    button.classList.add("is-active");

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
let testimonialTimer;

if (testimonialBlocks.length && dotsContainer) {
  testimonialBlocks.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", `Testimonial ${i + 1}`);
    if (i === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => showTestimonial(i));
    dotsContainer.append(dot);
  });

  const showTestimonial = (index) => {
    testimonialBlocks.forEach((b) => b.classList.remove("is-visible"));
    dotsContainer.querySelectorAll("button").forEach((d) => d.classList.remove("is-active"));
    testimonialBlocks[index].classList.add("is-visible");
    dotsContainer.children[index].classList.add("is-active");
    testimonialIndex = index;
    resetTestimonialTimer();
  };

  const resetTestimonialTimer = () => {
    clearInterval(testimonialTimer);
    testimonialTimer = setInterval(() => {
      showTestimonial((testimonialIndex + 1) % testimonialBlocks.length);
    }, 5000);
  };

  resetTestimonialTimer();
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

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.key.toLowerCase()) {
    case "w":
      e.preventDefault();
      document.querySelector("#work")?.scrollIntoView({ behavior: "smooth" });
      break;
    case "s":
      e.preventDefault();
      document.querySelector("#studio")?.scrollIntoView({ behavior: "smooth" });
      break;
    case "c":
      e.preventDefault();
      document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
      break;
    case "p":
      e.preventDefault();
      window.open("/assets/urbanmistrii-portfolio.pdf", "_blank");
      break;
  }
});
