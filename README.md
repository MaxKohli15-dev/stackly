# Stackly

Statische Website, auf der Besucher kostenlos Anfragen für Websites, Apps, Bots und Scripts stellen können. Läuft auf GitHub Pages.

## 1. Datenbank (Supabase) einrichten
Das Formular speichert Anfragen in einer eigenen Supabase-Datenbank, das Team sieht sie unter `dashboard.html`.

1. Auf [supabase.com](https://supabase.com) kostenlos ein Projekt anlegen, Region **Central EU (Frankfurt)**.
2. **SQL Editor → New query**: Inhalt von `supabase/schema.sql` einfügen und **Run**.
3. Team-Mitglieder eintragen (im SQL Editor):
   ```sql
   insert into public.team_members (email, name) values ('du@beispiel.de', 'Dein Name');
   ```
   und unter **Authentication → Users → Add user → Send invitation** dieselbe E-Mail einladen.
4. **Authentication → URL Configuration**: Site URL `https://maxkohli15-dev.github.io/stackly/dashboard.html` eintragen und dieselbe Adresse bei *Redirect URLs* hinzufügen.
5. **Project Settings → API**: `Project URL` und `anon public` Key in `config.js` eintragen.

Login im Dashboard per Magic Link: E-Mail eingeben, Link aus dem Postfach anklicken. Nur Adressen aus `team_members` sehen Daten.

## 2. Auf GitHub Pages veröffentlichen
1. Neues Repository auf github.com anlegen (z. B. `stackly`).
2. Alle Dateien hochladen (`index.html`, `danke.html`, `styles.css`, `script.js`).
3. Im Repo: **Settings → Pages → Branch: `main` / `(root)` → Save**.
4. Nach ca. 1 Minute ist die Seite unter `https://DEIN-NAME.github.io/stackly/` online.
