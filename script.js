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

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Kurzer Hinweis unten im Bild
const toastEl = document.querySelector(".toast");
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}

// Schreibmaschinen-Effekt im Hero
const typedEl = document.querySelector(".typed");
const words = ["Websites", "Apps", "Discord-Bots", "Roblox-Scripts", "Automatisierungen", "Browser-Games"];
if (!reducedMotion) {
  let w = 0, c = words[0].length, deleting = true;
  const tick = () => {
    const word = words[w];
    c += deleting ? -1 : 1;
    typedEl.textContent = word.slice(0, c);
    let delay = deleting ? 45 : 85;
    if (!deleting && c === word.length) { deleting = true; delay = 1800; }
    else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 2200);
}

// Laufband: Inhalt verdoppeln für nahtlose Schleife
const track = document.querySelector(".marquee-track");
track.innerHTML += track.innerHTML;
[...track.children].slice(track.children.length / 2).forEach((el) => el.setAttribute("aria-hidden", "true"));

// Formular
const form = document.querySelector(".form");
// Nach dem Absenden auf danke.html weiterleiten (funktioniert lokal und auf GitHub Pages)
form.querySelector('input[name="redirect"]').value = new URL("danke.html", location.href).href;

// Karten füllen den Projekttyp vor
const typeSelect = form.querySelector('select[name="projekttyp"]');
document.querySelectorAll(".card[data-type]").forEach((card) =>
  card.addEventListener("click", () => {
    typeSelect.value = card.dataset.type;
    saveDraft();
    toast(`Projekttyp „${card.dataset.type}“ ausgewählt`);
  })
);

// Zeichenzähler
const textarea = form.querySelector("textarea");
const countEl = document.getElementById("count");
const updateCount = () => {
  countEl.textContent = textarea.value.length;
  countEl.parentElement.classList.toggle("warn", textarea.value.length > 2800);
};
textarea.addEventListener("input", updateCount);

// Entwurf im Browser speichern (bleibt auf dem Gerät)
const DRAFT_KEY = "stackly-draft";
const draftFields = ["name", "email", "projekttyp", "deadline", "beispiel", "beschreibung"];
function saveDraft() {
  try {
    const data = Object.fromEntries(draftFields.map((n) => [n, form.elements[n].value]));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}
try {
  const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  if (draft) draftFields.forEach((n) => { if (draft[n]) form.elements[n].value = draft[n]; });
} catch {}
updateCount();
form.addEventListener("input", saveDraft);

// Formular prüfen und absenden
const errorBox = form.querySelector(".form-error");
form.addEventListener("submit", (e) => {
  errorBox.textContent = "";
  if (!form.checkValidity()) {
    e.preventDefault();
    const firstInvalid = form.querySelector(":invalid");
    const messages = {
      beschreibung: "Bitte beschreibe dein Projekt mit mindestens 20 Zeichen.",
      email: "Bitte gib eine gültige E-Mail-Adresse an.",
      beispiel: "Bitte gib einen gültigen Link an (mit https://).",
      datenschutz: "Bitte stimme der Datenschutzerklärung zu.",
    };
    errorBox.textContent = messages[firstInvalid.name] || "Bitte fülle alle Pflichtfelder korrekt aus.";
    firstInvalid.focus();
    return;
  }
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
  // Ladezustand beim Absenden
  const btn = form.querySelector('button[type="submit"]');
  btn.classList.add("loading");
  btn.textContent = "Wird gesendet…";
});

// Navigation, Fortschrittsbalken und Nach-oben-Button beim Scrollen
const nav = document.querySelector(".nav");
const progress = document.querySelector(".progress");
const toTop = document.querySelector(".to-top");
const onScroll = () => {
  nav.classList.toggle("scrolled", scrollY > 20);
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  toTop.classList.toggle("show", scrollY > 600);
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();
toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

// Scroll-Reveal mit gestaffelter Verzögerung
document.querySelectorAll(".section h2, .section-sub, .form, details").forEach((el) => el.classList.add("reveal"));
document.querySelectorAll(".grid, .steps, .features").forEach((group) => {
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
