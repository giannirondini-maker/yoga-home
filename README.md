# Yoga@Home

Static web app in Italian for guided yoga, tai-chi, and cardio home sessions, designed for beginners over 60. No backend, no subscriptions.

## Features

- **Guided session** — generates a tailored 30-minute session (warm-up → cardio → tai-chi → yoga → cool-down)
- **Exercise library** — 60 exercises filterable by category and level
- **Progress tracking** — session history, streaks, weight log
- **Profile** — name, difficulty level, fitness goal
- **YouTube links** — each exercise opens a search on the Yoga with Adriene channel
- **Offline-ready** — no external runtime dependencies

## Project Structure

```
yoga-guer/
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       └── build.yml          # Automated build + deploy to GitHub Pages
├── exercises/
│   ├── yoga/                  # 20 markdown files
│   ├── taichi/                # 20 markdown files
│   └── cardio/                # 20 markdown files
├── assets/
│   └── visuals/               # Exercise images (<id>.png)
├── scripts/
│   └── build-exercises.js     # Compiles exercises/ → data/exercises.json
├── data/
│   └── exercises.json         # Auto-generated. Do not edit manually.
├── index.html
├── style.css
└── app.js
```

## Local Development

```bash
# Start the server (also accessible from the local network)
python3 -m http.server 8080 --bind 0.0.0.0

# Get the Mac's IP address (Wi-Fi)
ipconfig getifaddr en0

# Open on a mobile device
# http://<MAC_IP>:8080
```

## Adding Exercises

1. Create a `.md` file in the appropriate folder (`exercises/yoga/`, `exercises/taichi/`, `exercises/cardio/`)
2. Follow the frontmatter format defined in `CLAUDE.md`
3. Add the corresponding image at `assets/visuals/<id>.png`
4. Rebuild the database:

```bash
node scripts/build-exercises.js
```

5. Commit both files (`.md` + updated `data/exercises.json`)

The GitHub Actions workflow runs the build automatically on every push.

## Deploy to GitHub Pages

1. Create a repository on GitHub (e.g. `yoga-casa`)
2. Push the project to the `main` branch
3. Go to **Settings → Pages**
4. Set **Source** to **GitHub Actions**
5. Save and wait for deployment

The site will be available at `https://<username>.github.io/<repo>/`.

## Difficulty Levels

| Value | Label | Description |
|-------|-------|-------------|
| 1 | Base | Suitable for everyone, no experience required |
| 2 | Intermediate | Requires minimum balance or strength |
| 3 | Advanced | Requires coordination or higher strength |

## Session Structure (30 min)

| Phase | Duration | Content |
|-------|----------|---------|
| Warm-up | 5 min | 1 cardio + 1 tai-chi (Base level) |
| Cardio | 8 min | 3 cardio exercises |
| Tai-Chi | 8 min | 3 tai-chi movements |
| Yoga | 7 min | 3 active yoga poses |
| Cool-down | 5 min | 2 relaxing yoga poses (always Base level) |
