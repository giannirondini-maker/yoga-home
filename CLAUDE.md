# CLAUDE.md — Yoga@Home

## Project

Static **Italian-language** web app for home yoga, tai-chi, and cardio sessions targeting seniors over 60. Hosted on **GitHub Pages**. No backend, no subscriptions.

**Target user:** Woman, 66 years old, beginner, Italian as primary language.

---

## Project Structure

```
yoga-guer/
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       └── build.yml          # Compiles exercises/ → data/exercises.json
├── exercises/
│   ├── yoga/                  # 20 markdown files
│   ├── taichi/                # 20 markdown files
│   └── cardio/                # 20 markdown files
├── scripts/
│   └── build-exercises.js     # Node: reads MD → writes data/exercises.json
├── data/
│   └── exercises.json         # Generated. DO NOT edit manually.
├── index.html                 # Entry point, UI in Italian
├── style.css
├── app.js                     # Logic: session generator, library, progress tracking
├── CLAUDE.md                  # This file
└── yoga-guer-findings.md      # Original research document
```

---

## Exercise Database

Each exercise is a markdown file in `exercises/<category>/`.

### Required Frontmatter

```yaml
---
id: yoga-01                      # unique, format: <category>-<number>
name_it: "Posa del Bambino"
name_en: "Child's Pose"
category: yoga                   # yoga | taichi | cardio
difficulty: 1                    # 1=Base | 2=Intermediate | 3=Advanced
phase: cooldown                  # warmup | cardio | taichi | yoga_active | cooldown
duration_sec: 60                 # estimated duration in seconds
equipment: []                    # [] | [chair] | [mat] | [chair, mat]
benefit_it: "Rilascio completo del corpo"
modification_it: "Eseguire seduta su una sedia, piegandosi in avanti"
safety_it: ""                    # leave empty if no specific warning
youtube_query: "child's pose for seniors yoga"
tags: [schiena, fianchi, rilassamento]
---

Detailed description in Italian of the exercise.
```

### Difficulty Levels

| Value | Label | Description |
|-------|-------|-------------|
| 1 | Base | Suitable for everyone, no experience required |
| 2 | Intermediate | Requires minimum balance or strength |
| 3 | Advanced | Requires coordination or higher strength |

### Session Phases (30 min)

| Phase | Duration | Content |
|-------|----------|---------|
| `warmup` | 5 min | 1 cardio + 1 taichi Base level |
| `cardio` | 8 min | 3 cardio exercises for chosen level |
| `taichi` | 8 min | 3 tai-chi movements for chosen level |
| `yoga_active` | 7 min | 3 active yoga poses for chosen level |
| `cooldown` | 5 min | 2 relaxing yoga poses (always Base level) |

---

## How to Add Exercises

1. Create a new `.md` file in the appropriate folder (`exercises/yoga/`, `exercises/taichi/`, `exercises/cardio/`)
2. Follow the frontmatter format above, assigning a unique progressive `id`
3. Run `node scripts/build-exercises.js` to regenerate `data/exercises.json`
4. Commit both files (`.md` + updated `data/exercises.json`)

The GitHub Actions workflow (`build.yml`) runs the build automatically on every push.

---

## App — Main Features

Everything in `app.js`, all UI text in Italian.

- **`loadExercises()`** — Loads `data/exercises.json` via fetch
- **`generateSession(difficulty)`** — Generates a 30-min session following the phase template
- **`renderSession(session)`** — Displays the session with YouTube links
- **`renderLibrary(filters)`** — Filterable library by category and level
- **`saveSession(session, notes, mood)`** — Saves to localStorage
- **`renderProgress()`** — Displays session history

### User Customization (localStorage)

```json
{
  "profilo": { "nome": "Maria", "livello": 1, "obiettivo": "perdita peso" },
  "sessioni": [{ "data": "2026-04-06", "durata": 30, "umore": 4, "note": "" }]
}
```

---

## Important Notes

- **Language:** all UI text and exercise content **must be in Italian**
- **Accessibility:** large fonts (min 18px body), high contrast, large buttons (min 48px touch target)
- **No build step for end users:** `data/exercises.json` is pre-generated and committed
- **YouTube:** use `youtube_query` to build YouTube search links, not direct embeds (to avoid CSP issues on GitHub Pages)
- **Mobile-first:** the target user is likely using a smartphone

---

## How to Iterate

```bash
# Local development (accessible from local network)
# 1) Start a server bound to all interfaces (LAN access):
python3 -m http.server 8080 --bind 0.0.0.0   # or: npx http-server -p 8080 -a 0.0.0.0

# 2) Get the Mac's IP address (Wi-Fi):
ipconfig getifaddr en0

# 3) On device (e.g. iPhone) open:
#    http://<MAC_IP>:8080
# Make sure Mac and iPhone are on the same Wi-Fi network, VPN disabled, and firewall allows incoming connections.

# Regenerate the exercise database after MD changes
node scripts/build-exercises.js

# Deploy
git push origin main          # GitHub Actions does the rest
```

## Publish to GitHub Pages

To publish from your own GitHub account:

1. Create a repository named `YOUR_USERNAME.github.io`.
2. Push this project to the repo's `main` branch.
3. Open the repository on GitHub and go to **Settings → Pages**.
4. Set **Source** to `Deploy from a branch`.
5. Set **Branch** to `main` and **Folder** to `/ (root)`.
6. Save and wait for deployment.

If you publish as a project repo instead, the site will be served from `https://YOUR_USERNAME.github.io/REPO_NAME/`.

## Profile controls

- When a profile is saved, show a compact summary inside the Profilo tab.
- Provide header actions to edit the profile, delete the saved profile, and reset progress data.
- Deleting the profile should clear `yogacasa_profilo` only.
- Resetting progress should clear `yogacasa_sessions` and `yogacasa_peso` only.

## Exercise images

- Each exercise has one image at `assets/visuals/<id>.png`.
- The build script (`scripts/build-exercises.js`) auto-detects the extension and writes the `image` field into `data/exercises.json`.
- The app displays the image full-width in the exercise modal and as a thumbnail in cards/rows.
