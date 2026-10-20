// Mobile-Menü
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
menuBtn.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

document.getElementById("year").textContent = new Date().getFullYear();

// Nach dem Absenden auf danke.html weiterleiten (funktioniert lokal und auf GitHub Pages)
const form = document.querySelector(".form");
form.querySelector('input[name="_next"]').value = new URL("danke.html", location.href).href;

// Formular prüfen
const errorBox = form.querySelector(".form-error");
form.addEventListener("submit", (e) => {
  errorBox.textContent = "";
  if (!form.checkValidity()) {
    e.preventDefault();
    const firstInvalid = form.querySelector(":invalid");
    errorBox.textContent =
      firstInvalid.name === "beschreibung"
        ? "Bitte beschreibe dein Projekt mit mindestens 20 Zeichen."
        : "Bitte fülle alle Pflichtfelder korrekt aus.";
    firstInvalid.focus();
    return;
  }
  // Ladezustand beim Absenden
  const btn = form.querySelector('button[type="submit"]');
  btn.classList.add("loading");
  btn.textContent = "Wird gesendet…";
});

// Navigation beim Scrollen
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 20);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Scroll-Reveal mit gestaffelter Verzögerung
document.querySelectorAll(".section h2, .section-sub, .form, details").forEach((el) => el.classList.add("reveal"));
document.querySelectorAll(".grid, .steps").forEach((group) => {
  [...group.children].forEach((child, i) => {
    child.classList.add("reveal");
    child.style.setProperty("--delay", `${i * 0.08}s`);
  });
});
const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
    // Verzögerung nach dem Einblenden entfernen, damit Hover sofort reagiert
    setTimeout(() => entry.target.style.removeProperty("--delay"), 1000);
  }),
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Karten: Lichtpunkt folgt der Maus
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});
