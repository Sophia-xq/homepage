const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const cursor = document.querySelector(".cursor-dot");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  root.dataset.theme = "dark";
  toggle?.setAttribute("aria-pressed", "true");
}

toggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme === "dark" ? "dark" : "";
  localStorage.setItem("theme", nextTheme);
  toggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
});

window.addEventListener("pointermove", (event) => {
  if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;
  cursor.classList.add("is-active");
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
});

document.querySelectorAll("a, button").forEach((item) => {
  item.addEventListener("pointerenter", () => cursor?.classList.add("is-hovering"));
  item.addEventListener("pointerleave", () => cursor?.classList.remove("is-hovering"));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".section, .project, .profile-panel").forEach((element) => {
  element.classList.add("reveal");
  observer.observe(element);
});
