const STATUS = {
  neu: "Neu",
  pruefung: "In Prüfung",
  angenommen: "Angenommen",
  in_arbeit: "In Arbeit",
  fertig: "Fertig",
  abgelehnt: "Abgelehnt",
};
const TABS = {
  anfragen: ["neu", "pruefung", "abgelehnt"],
  auftraege: ["angenommen", "in_arbeit", "fertig"],
  alle: Object.keys(STATUS),
};

const $ = (id) => document.getElementById(id);
const views = { login: $("login-view"), message: $("message-view"), app: $("app-view") };
const show = (name) => Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtDate = (d, withTime) =>
  d ? new Date(d).toLocaleString("de-DE", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }) : "–";
const pill = (status) => `<span class="pill st-${status}">${STATUS[status] || status}</span>`;

const toastEl = document.querySelector(".toast");
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function message(title, text, withLogout) {
  $("message-title").textContent = title;
  $("message-text").textContent = text;
  $("message-logout").hidden = !withLogout;
  show("message");
}

// ---------- Setup ----------
const { supabaseUrl, supabaseAnonKey } = window.STACKLY_CONFIG || {};
if (!supabaseUrl || supabaseUrl.includes("DEIN-PROJEKT") || !window.supabase) {
  message("Noch nicht eingerichtet", "Trage in config.js deine Supabase-URL und den anon key ein (siehe README).");
  throw new Error("Supabase nicht konfiguriert");
}
const db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let requests = [];
let team = [];
let currentTab = "anfragen";
let selectedId = null;

// ---------- Login ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.querySelector(".login-msg");
  const email = e.target.email.value.trim();
  msg.className = "login-msg";
  msg.textContent = "Sende Link…";
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: location.href.split("#")[0] },
  });
  if (error) {
    msg.classList.add("err");
    msg.textContent = "Das hat nicht geklappt. Ist die E-Mail als Team-Mitglied angelegt?";
  } else {
    msg.textContent = "Check dein Postfach – der Login-Link ist unterwegs.";
  }
});

const logout = async () => { await db.auth.signOut(); location.reload(); };
$("logout").addEventListener("click", logout);
$("message-logout").addEventListener("click", logout);

// Supabase-Abfragen nicht direkt im Auth-Callback ausführen (sonst blockiert supabase-js)
db.auth.onAuthStateChange((_event, session) => setTimeout(() => start(session), 0));

let started = false;
async function start(session) {
  if (!session) return show("login");
  if (started) return;
  started = true;
  message("Lade Dashboard…", "Einen Moment.");

  const { data: members, error } = await db.from("team_members").select("email, name").order("name");
  if (error) {
    started = false;
    return message("Fehler beim Laden", `Die Datenbank hat nicht geantwortet (${error.message}). Lade die Seite neu.`, true);
  }
  if (!members?.length) {
    started = false;
    return message("Kein Zugriff", `${session.user.email} ist kein Team-Mitglied. Frag einen Admin, dich in team_members einzutragen.`, true);
  }
  team = members;
  $("user-email").textContent = session.user.email;
  $("d-assign").innerHTML = `<option value="">– niemand –</option>` +
    team.map((m) => `<option value="${esc(m.email)}">${esc(m.name || m.email)}</option>`).join("");
  show("app");
  await load();
  subscribe();
}

// ---------- Daten ----------
async function load() {
  const { data, error } = await db.from("requests").select("*").order("created_at", { ascending: false });
  if (error) return toast("Laden fehlgeschlagen");
  requests = data;
  render();
}

function subscribe() {
  db.channel("requests")
    .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, (payload) => {
      if (payload.eventType === "INSERT") toast(`Neue Anfrage von ${payload.new.name}`);
      load();
    })
    .subscribe();
}

async function update(id, changes, note) {
  const { error } = await db.from("requests").update(changes).eq("id", id);
  if (error) return toast("Speichern fehlgeschlagen");
  Object.assign(requests.find((r) => r.id === id), changes);
  render();
  openDetail(id);
  toast(note || "Gespeichert");
}

// ---------- Ansicht ----------
const statusFilter = $("filter-status");
statusFilter.innerHTML += Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
$("d-status-select").innerHTML = Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const type = $("filter-type").value;
  const status = statusFilter.value;
  return requests.filter((r) =>
    TABS[currentTab].includes(r.status) &&
    (!type || r.projekttyp === type) &&
    (!status || r.status === status) &&
    (!q || [r.name, r.email, r.beschreibung, r.notiz].some((f) => f?.toLowerCase().includes(q)))
  );
}

function render() {
  const count = (...s) => requests.filter((r) => s.includes(r.status)).length;
  $("s-neu").textContent = count("neu");
  $("s-pruefung").textContent = count("pruefung");
  $("s-aktiv").textContent = count("angenommen", "in_arbeit");
  $("s-fertig").textContent = count("fertig");

  const rows = filtered();
  $("list").innerHTML = rows.length
    ? rows.map((r, i) => `
      <button class="item" data-id="${r.id}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <span class="item-name">${esc(r.name)}<small>${esc(r.email)}</small></span>
        <span class="item-type muted">${esc(r.projekttyp)}</span>
        <span class="item-desc">${esc(r.beschreibung)}</span>
        ${pill(r.status)}
        <span class="item-date">${fmtDate(r.created_at)}</span>
      </button>`).join("")
    : `<div class="empty">Keine Einträge in dieser Ansicht.</div>`;
}

$("list").addEventListener("click", (e) => {
  const item = e.target.closest(".item");
  if (item) openDetail(item.dataset.id);
});

document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => setTab(tab.dataset.tab))
);
function setTab(name) {
  currentTab = name;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  render();
}

// Kennzahlen springen in die passende Ansicht
document.querySelectorAll(".stat").forEach((s) =>
  s.addEventListener("click", () => {
    const jump = s.dataset.jump;
    statusFilter.value = jump === "aktiv" ? "" : jump;
    setTab(["neu", "pruefung"].includes(jump) ? "anfragen" : "auftraege");
  })
);

["search", "filter-type", "filter-status"].forEach((id) => $(id).addEventListener("input", render));

// ---------- Details ----------
const drawer = $("drawer");
const backdrop = $("backdrop");
const dForm = $("d-form");

function openDetail(id) {
  const r = requests.find((x) => x.id === id);
  if (!r) return;
  selectedId = id;
  $("d-status").className = `pill st-${r.status}`;
  $("d-status").textContent = STATUS[r.status];
  $("d-name").textContent = r.name;
  $("d-meta").textContent = `Eingegangen ${fmtDate(r.created_at, true)} · zuletzt geändert ${fmtDate(r.updated_at, true)}`;
  $("d-email").textContent = r.email;
  $("d-email").href = `mailto:${r.email}`;
  $("d-type").textContent = r.projekttyp;
  $("d-deadline").textContent = fmtDate(r.deadline);
  $("d-example").innerHTML = /^https?:\/\//.test(r.beispiel || "")
    ? `<a href="${esc(r.beispiel)}" target="_blank" rel="noopener noreferrer">${esc(r.beispiel)}</a>`
    : "–";
  $("d-desc").textContent = r.beschreibung;
  dForm.status.value = r.status;
  dForm.zugewiesen.value = r.zugewiesen || "";
  dForm.notiz.value = r.notiz || "";
  $("d-reply").href = `mailto:${r.email}?subject=${encodeURIComponent(`Deine Stackly-Anfrage (${r.projekttyp})`)}&body=${encodeURIComponent(`Hallo ${r.name},\n\n`)}`;
  drawer.classList.add("open");
  backdrop.classList.add("open");
}

function closeDetail() {
  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  selectedId = null;
}
$("d-close").addEventListener("click", closeDetail);
backdrop.addEventListener("click", closeDetail);
addEventListener("keydown", (e) => e.key === "Escape" && closeDetail());

dForm.addEventListener("submit", (e) => {
  e.preventDefault();
  update(selectedId, {
    status: dForm.status.value,
    zugewiesen: dForm.zugewiesen.value || null,
    notiz: dForm.notiz.value.trim() || null,
  });
});

document.querySelectorAll("[data-set]").forEach((btn) =>
  btn.addEventListener("click", () =>
    update(selectedId, { status: btn.dataset.set }, btn.dataset.set === "angenommen" ? "Als Auftrag angenommen" : "Abgelehnt")
  )
);

$("d-delete").addEventListener("click", async () => {
  const r = requests.find((x) => x.id === selectedId);
  if (!r || !confirm(`Anfrage von ${r.name} endgültig löschen?`)) return;
  const { error } = await db.from("requests").delete().eq("id", r.id);
  if (error) return toast("Löschen fehlgeschlagen");
  requests = requests.filter((x) => x.id !== r.id);
  closeDetail();
  render();
  toast("Gelöscht");
});

// ---------- CSV-Export ----------
$("export").addEventListener("click", () => {
  const cols = ["created_at", "status", "name", "email", "projekttyp", "deadline", "beispiel", "beschreibung", "zugewiesen", "notiz"];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(";"), ...filtered().map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `stackly-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
