const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navShell = document.querySelector("[data-nav-shell]");
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");

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
    if (window.innerWidth > 720) {
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
