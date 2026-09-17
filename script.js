const toggle = document.querySelector("[data-theme-toggle]");
const toggleLabel = toggle?.querySelector(".theme-toggle-label") ?? null;
const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks
  .map((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return null;
    return document.querySelector(href);
  })
  .filter(Boolean);

const applyTheme = (theme) => {
  if (!toggle) return;

  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  toggle.dataset.themeToggle = isLight ? "light" : "dark";
  toggle.setAttribute(
    "aria-label",
    isLight ? "다크 모드로 전환" : "라이트 모드로 전환"
  );

  if (toggleLabel) {
    toggleLabel.textContent = isLight ? "Dark" : "Light";
  }

  try {
    localStorage.setItem("theme", isLight ? "light" : "dark");
  } catch {
    /* private mode 등에서 storage 접근 실패 시 무시 */
  }
};

const readStoredTheme = () => {
  try {
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

applyTheme(readStoredTheme());

if (toggle) {
  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

if (sections.length > 0 && navLinks.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
        if (isCurrent) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-35% 0px -50% 0px", threshold: [0.2, 0.4, 0.7] }
  );

  sections.forEach((section) => observer.observe(section));
}

const openModalTriggers = [...document.querySelectorAll("[data-modal-open]")];

const openStrengthModal = (modalId) => {
  const dialog = document.getElementById(modalId);
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
};

const closeStrengthModal = (dialog) => {
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  }
};

openModalTriggers.forEach((trigger) => {
  const modalId = trigger.getAttribute("data-modal-open");
  if (!modalId) return;

  const open = () => openStrengthModal(modalId);

  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
});

document.querySelectorAll("dialog.strength-modal").forEach((dialog) => {
  dialog.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeStrengthModal(dialog));
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeStrengthModal(dialog);
    }
  });
});
