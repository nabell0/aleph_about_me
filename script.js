const toggle = document.querySelector("[data-theme-toggle]");
const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const applyTheme = (theme) => {
  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  toggle.dataset.themeToggle = isLight ? "light" : "dark";
  toggle.setAttribute("aria-label", isLight ? "다크 모드로 전환" : "라이트 모드로 전환");
  toggle.querySelector(".theme-toggle-label").textContent = isLight ? "Dark" : "Light";
  localStorage.setItem("theme", isLight ? "light" : "dark");
};

applyTheme(localStorage.getItem("theme") === "light" ? "light" : "dark");

toggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
});

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
