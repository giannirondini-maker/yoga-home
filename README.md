# Yoga@Casa

App web statica in italiano per sessioni di yoga, tai-chi e cardio a casa, pensata per principianti over 60. Nessun backend, nessun abbonamento.

## Funzionalità

- **Sessione guidata** — genera una sessione da 30 minuti su misura (riscaldamento → cardio → tai-chi → yoga → rilassamento)
- **Libreria esercizi** — 60 esercizi filtrabili per categoria e livello
- **Progressi** — storico sessioni, streak, log del peso
- **Profilo** — nome, livello di difficoltà, obiettivo
- **Link YouTube** — ogni esercizio apre una ricerca sul canale Yoga with Adriene
- **Offline-ready** — nessuna dipendenza esterna a runtime

## Struttura del progetto

```
yoga-guer/
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       └── build.yml          # Build automatica + deploy su GitHub Pages
├── exercises/
│   ├── yoga/                  # 20 file markdown
│   ├── taichi/                # 20 file markdown
│   └── cardio/                # 20 file markdown
├── assets/
│   └── visuals/               # Immagini esercizi (<id>.png)
├── scripts/
│   └── build-exercises.js     # Compila exercises/ → data/exercises.json
├── data/
│   └── exercises.json         # Generato automaticamente. Non modificare.
├── index.html
├── style.css
└── app.js
```

## Sviluppo locale

```bash
# Avvia il server (accessibile anche dalla rete locale)
python3 -m http.server 8080 --bind 0.0.0.0

# Ottieni l'IP del Mac (Wi-Fi)
ipconfig getifaddr en0

# Apri sul dispositivo mobile
# http://<IP_MAC>:8080
```

## Aggiungere esercizi

1. Crea un file `.md` nella cartella appropriata (`exercises/yoga/`, `exercises/taichi/`, `exercises/cardio/`)
2. Segui il formato frontmatter definito in `CLAUDE.md`
3. Aggiungi l'immagine corrispondente in `assets/visuals/<id>.png`
4. Rigenera il database:

```bash
node scripts/build-exercises.js
```

5. Commit di entrambi i file (`.md` + `data/exercises.json` aggiornato)

Il workflow GitHub Actions esegue la build automaticamente ad ogni push.

## Deploy su GitHub Pages

1. Crea un repository su GitHub
2. Fai push del progetto sul branch `main`
3. Vai su **Settings → Pages**
4. Scegli **Deploy from a branch** → `main` → `/ (root)`
5. Salva e attendi il deploy

Il sito sarà disponibile su `https://<username>.github.io/<repo>/`.

## Livelli di difficoltà

| Livello | Etichetta | Descrizione |
|---------|-----------|-------------|
| 1 | Base | Per tutti, nessuna esperienza richiesta |
| 2 | Medio | Richiede minimo equilibrio o forza |
| 3 | Avanzato | Richiede coordinazione o forza maggiore |

## Struttura della sessione (30 min)

| Fase | Durata | Contenuto |
|------|--------|-----------|
| Riscaldamento | 5 min | 1 cardio + 1 tai-chi Base |
| Cardio | 8 min | 3 esercizi cardio |
| Tai-Chi | 8 min | 3 movimenti tai-chi |
| Yoga | 7 min | 3 pose yoga attive |
| Rilassamento | 5 min | 2 pose yoga rilassanti (sempre Base) |
