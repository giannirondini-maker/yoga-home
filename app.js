/**
 * app.js — Yoga@Casa
 * Rule-based session generator + exercise library + progress tracker
 * All UI text in Italian. No external dependencies.
 */

'use strict';

// ===== CONSTANTS =====

const STORAGE_SESSIONS = 'yogacasa_sessions';
const STORAGE_PESO     = 'yogacasa_peso';
const STORAGE_PROFILO  = 'yogacasa_profilo';

const PHASE_CONFIG = [
  { key: 'warmup',      label: 'Riscaldamento',  icon: '🌅', duration: '5 min',  count: 2 },
  { key: 'cardio',      label: 'Cardio',          icon: '🚶', duration: '8 min',  count: 3 },
  { key: 'taichi',      label: 'Tai-Chi',         icon: '🌊', duration: '8 min',  count: 3 },
  { key: 'yoga_active', label: 'Yoga',            icon: '🧘', duration: '7 min',  count: 3 },
  { key: 'cooldown',    label: 'Rilassamento',    icon: '🌙', duration: '5 min',  count: 2 },
];

const CAT_ICON = { yoga: '🧘', taichi: '🌊', cardio: '🚶' };
const CAT_LABEL = { yoga: 'Yoga', taichi: 'Tai-Chi', cardio: 'Cardio' };
const LEVEL_LABEL = { 1: '⭐ Base', 2: '⭐⭐ Medio', 3: '⭐⭐⭐ Avanzato' };
const OBJECTIVE_LABEL = {
  perdita_peso: 'Perdita di peso',
  flessibilita: 'Migliorare la flessibilità',
  equilibrio: 'Equilibrio e stabilità',
  benessere: 'Benessere generale',
};
const MOOD_ICON = { 1: '😓', 2: '😐', 3: '🙂', 4: '😊', 5: '🌟' };

// ===== STATE =====

let allExercises = [];
let currentSession = null;
let selectedMood = null;
let profileEditMode = false;

// ===== INIT =====

document.addEventListener('DOMContentLoaded', async () => {
  allExercises = await loadExercises();
  setupNavigation();
  setupSessionView();
  setupLibraryView();
  setupProgressView();
  setupProfileView();
  setupHeaderProfileActions();
  loadProfile();
  renderProfileHeader();
  renderLibrary();
  renderProgress();
});

// ===== DATA LOADING =====

async function loadExercises() {
  try {
    const res = await fetch('data/exercises.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Impossibile caricare gli esercizi:', err);
    showError('Impossibile caricare gli esercizi. Assicurati di aprire l\'app da un server web.');
    return [];
  }
}

// ===== NAVIGATION =====

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav__btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveView(btn.dataset.view);
    });
  });
}

function setActiveView(viewId) {
  const navBtns = document.querySelectorAll('.nav__btn');
  navBtns.forEach(btn => {
    const isActive = btn.dataset.view === viewId;
    btn.classList.toggle('nav__btn--active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('view--active');
    v.hidden = true;
  });
  const view = document.getElementById(`view-${viewId}`);
  if (view) {
    view.classList.add('view--active');
    view.hidden = false;
  }
}

// ===== SESSION GENERATOR =====

function setupSessionView() {
  document.getElementById('btn-genera').addEventListener('click', () => {
    const difficulty = parseInt(document.getElementById('select-livello').value);
    currentSession = generateSession(difficulty);
    renderSession(currentSession);
    document.getElementById('session-container').hidden = false;
    document.getElementById('session-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('btn-nuova-sessione').addEventListener('click', () => {
    const difficulty = parseInt(document.getElementById('select-livello').value);
    currentSession = generateSession(difficulty, Date.now().toString());
    renderSession(currentSession);
  });

  document.getElementById('btn-salva-sessione').addEventListener('click', openSaveModal);
  document.getElementById('btn-chiudi-modal').addEventListener('click', closeSaveModal);
  document.getElementById('btn-conferma-salva').addEventListener('click', confirmSaveSession);

  document.getElementById('modal-overlay').addEventListener('click', () => {
    closeSaveModal();
    closeExerciseModal();
  });

  // Mood picker
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMood = parseInt(btn.dataset.mood);
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('mood-btn--selected'));
      btn.classList.add('mood-btn--selected');
    });
  });
}

/**
 * Generates a 30-min session following the phase template.
 * seed: optional string to vary selection (default: today's date for daily consistency)
 */
function generateSession(difficulty, seed = null) {
  const dateSeed = seed || new Date().toISOString().slice(0, 10);
  const rng = seededRandom(dateSeed + difficulty);

  const session = {
    date: new Date().toISOString().slice(0, 10),
    difficulty,
    phases: [],
  };

  for (const phaseConf of PHASE_CONFIG) {
    let pool;

    if (phaseConf.key === 'warmup') {
      // Warmup: 1 cardio difficulty=1 + 1 taichi difficulty=1
      const warmupCardio = allExercises.filter(e => e.category === 'cardio' && e.phase === 'warmup' && e.difficulty === 1);
      const warmupTaichi = allExercises.filter(e => e.category === 'taichi' && e.phase === 'warmup' && e.difficulty === 1);
      const picked = [
        pickOne(warmupCardio, rng) || pickOne(allExercises.filter(e => e.category === 'cardio' && e.difficulty === 1), rng),
        pickOne(warmupTaichi, rng) || pickOne(allExercises.filter(e => e.category === 'taichi' && e.difficulty === 1), rng),
      ].filter(Boolean);
      session.phases.push({ ...phaseConf, exercises: picked });
      continue;
    }

    if (phaseConf.key === 'cooldown') {
      // Cooldown: always difficulty=1 yoga restorative
      pool = allExercises.filter(e => e.category === 'yoga' && e.phase === 'cooldown' && e.difficulty === 1);
    } else if (phaseConf.key === 'yoga_active') {
      pool = allExercises.filter(e => e.category === 'yoga' && e.phase === 'yoga_active' && e.difficulty <= difficulty);
    } else {
      // cardio or taichi: match category + difficulty (allow 1 level below too)
      pool = allExercises.filter(e => e.category === phaseConf.key && e.phase === phaseConf.key && e.difficulty <= difficulty);
    }

    // Fallback: relax difficulty filter if pool too small
    if (pool.length < phaseConf.count) {
      const fallbackCat = phaseConf.key === 'yoga_active' ? 'yoga' : phaseConf.key;
      pool = allExercises.filter(e => e.category === fallbackCat);
    }

    session.phases.push({ ...phaseConf, exercises: pickN(pool, phaseConf.count, rng) });
  }

  session.exerciseIds = session.phases.flatMap(p => p.exercises.map(e => e.id));
  return session;
}

function renderSession(session) {
  document.getElementById('session-date').textContent = formatDate(session.date);
  const container = document.getElementById('session-phases');
  container.innerHTML = '';

  for (const phase of session.phases) {
    const phaseEl = document.createElement('div');
    phaseEl.className = 'phase';
    phaseEl.innerHTML = `
      <div class="phase__header">
        <span class="phase__icon">${phase.icon}</span>
        <span class="phase__name">${phase.label}</span>
        <span class="phase__duration">${phase.duration}</span>
      </div>
      <div class="phase__exercises">
        ${phase.exercises.map(ex => exerciseRowHTML(ex)).join('')}
      </div>
    `;
    // Click on exercise row → open detail modal
    phaseEl.querySelectorAll('.exercise-row').forEach(row => {
      row.addEventListener('click', () => openExerciseModal(row.dataset.id));
    });
    container.appendChild(phaseEl);
  }
}

function exerciseRowHTML(ex) {
  const duration = ex.duration_sec ? `${ex.duration_sec}s` : '';
  const thumbSrc = getExerciseVisualSrc(ex);
  const gifThumb = thumbSrc
    ? `<img class="exercise-row__gif" src="${thumbSrc}" alt="${ex.name_it}" width="48" height="48">`
    : `<span class="exercise-row__cat" aria-hidden="true">${CAT_ICON[ex.category] || '•'}</span>`;
  return `
    <div class="exercise-row" data-id="${ex.id}" role="button" tabindex="0"
         aria-label="Apri ${ex.name_it}">
      ${gifThumb}
      <div class="exercise-row__info">
        <div class="exercise-row__name">${ex.name_it}</div>
        <div class="exercise-row__meta">${ex.benefit_it || ''}</div>
      </div>
      <span class="exercise-row__level">${LEVEL_LABEL[ex.difficulty] || ''} ${duration}</span>
    </div>`;
}

// ===== SAVE SESSION =====

function openSaveModal() {
  if (!currentSession) return;
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('mood-btn--selected'));
  document.getElementById('note-sessione').value = '';
  document.getElementById('modal-salva').hidden = false;
  document.getElementById('modal-overlay').hidden = false;
}

function closeSaveModal() {
  document.getElementById('modal-salva').hidden = true;
  document.getElementById('modal-overlay').hidden = true;
}

function confirmSaveSession() {
  if (!currentSession) return;
  const note = document.getElementById('note-sessione').value.trim();
  const entry = {
    date: currentSession.date,
    difficulty: currentSession.difficulty,
    exercises: currentSession.exerciseIds || [],
    duration_min: 30,
    mood: selectedMood,
    notes: note,
  };
  const sessions = getSessions();
  sessions.unshift(entry);
  localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
  closeSaveModal();
  renderProgress();
  showToast('Sessione salvata! Ottimo lavoro! 🌟');
}

// ===== EXERCISE LIBRARY =====

function setupLibraryView() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      renderLibrary();
    });
  });
  document.getElementById('filter-livello').addEventListener('change', renderLibrary);
}

function renderLibrary() {
  const activeCat = document.querySelector('.filter-btn.filter-btn--active')?.dataset.filterCat || 'tutti';
  const level = parseInt(document.getElementById('filter-livello').value);

  let exercises = allExercises;
  if (activeCat !== 'tutti') exercises = exercises.filter(e => e.category === activeCat);
  if (level > 0) exercises = exercises.filter(e => e.difficulty === level);

  const grid = document.getElementById('exercise-grid');
  if (exercises.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><p>Nessun esercizio trovato</p></div>`;
    return;
  }

  grid.innerHTML = exercises.map(ex => {
    const thumbSrc = getExerciseVisualSrc(ex);
    const gifImg = thumbSrc
      ? `<img class="exercise-card__gif" src="${thumbSrc}" alt="${ex.name_it}" width="80" height="80">`
      : `<div class="exercise-card__icon">${CAT_ICON[ex.category] || '•'}</div>`;
    return `
    <div class="exercise-card" data-id="${ex.id}" role="button" tabindex="0"
         aria-label="Apri ${ex.name_it}">
      ${gifImg}
      <div class="exercise-card__name">${ex.name_it}</div>
      <div class="exercise-card__cat">${CAT_LABEL[ex.category] || ex.category}</div>
      <div class="exercise-card__level">${LEVEL_LABEL[ex.difficulty] || ''}</div>
    </div>
  `}).join('');

  grid.querySelectorAll('.exercise-card').forEach(card => {
    card.addEventListener('click', () => openExerciseModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openExerciseModal(card.dataset.id); });
  });
}

// ===== EXERCISE DETAIL MODAL =====

function openExerciseModal(id) {
  const ex = allExercises.find(e => e.id === id);
  if (!ex) return;

  const safetyHtml = ex.safety_it
    ? `<div class="safety-box">⚠️ ${ex.safety_it}</div>` : '';

  const modHtml = ex.modification_it
    ? `<div class="exercise-detail__section">
        <div class="exercise-detail__section-title">Modifica per principianti</div>
        <div class="exercise-detail__text">💡 ${ex.modification_it}</div>
       </div>` : '';

  const equipHtml = ex.equipment && ex.equipment.length > 0
    ? `<div class="exercise-detail__section">
        <div class="exercise-detail__section-title">Attrezzatura</div>
        <div class="exercise-detail__text">${ex.equipment.join(', ')}</div>
       </div>` : '';

  const tagsHtml = ex.tags && ex.tags.length > 0
    ? `<div class="exercise-detail__tags">${ex.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : '';

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((ex.youtube_query || ex.name_en || ex.name_it) + ' yoga with adriene')}`;

  const imgSrc = getExerciseVisualSrc(ex);
  const visualHtml = imgSrc
    ? `<div class="exercise-detail__image-wrap">
        <img class="exercise-detail__image" src="${imgSrc}" alt="${ex.name_it}">
       </div>` : '';

  document.getElementById('exercise-detail').innerHTML = `
    <div class="exercise-detail__header">
      <span class="exercise-detail__icon">${CAT_ICON[ex.category] || '•'}</span>
      <div>
        <div class="exercise-detail__title">${ex.name_it}</div>
        <div class="exercise-detail__meta">
          ${CAT_LABEL[ex.category] || ''} · ${LEVEL_LABEL[ex.difficulty] || ''} · ${ex.duration_sec ? ex.duration_sec + 's' : ''}
        </div>
      </div>
    </div>

    ${visualHtml}

    <div class="exercise-detail__section">
      <div class="exercise-detail__section-title">Come si fa</div>
      <div class="exercise-detail__text">${ex.description_it || ''}</div>
    </div>

    <div class="exercise-detail__section">
      <div class="exercise-detail__section-title">Beneficio</div>
      <div class="exercise-detail__text">${ex.benefit_it || ''}</div>
    </div>

    ${modHtml}
    ${equipHtml}
    ${safetyHtml}
    ${tagsHtml}

    <a class="exercise-detail__youtube" href="${youtubeUrl}" target="_blank" rel="noopener"
       aria-label="Cerca video su YouTube per ${ex.name_it}">
      ▶ Guarda il video su YouTube
    </a>
  `;

  document.getElementById('modal-esercizio').hidden = false;
  document.getElementById('modal-overlay').hidden = false;
}

function closeExerciseModal() {
  document.getElementById('modal-esercizio').hidden = true;
  document.getElementById('modal-overlay').hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-chiudi-esercizio')?.addEventListener('click', closeExerciseModal);
});

// ===== PROGRESS =====

function setupProgressView() {
  document.getElementById('btn-salva-peso').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('input-peso').value);
    if (!val || val < 30 || val > 300) { showToast('Inserisci un peso valido'); return; }
    const log = getPeso();
    log.unshift({ date: new Date().toISOString().slice(0, 10), kg: val });
    localStorage.setItem(STORAGE_PESO, JSON.stringify(log.slice(0, 100)));
    document.getElementById('input-peso').value = '';
    renderProgress();
  });
}

function renderProgress() {
  const sessions = getSessions();
  const peso = getPeso();

  // Stats
  const statsRow = document.getElementById('stats-row');
  const totalSessions = sessions.length;
  const totalMin = sessions.reduce((s, e) => s + (e.duration_min || 30), 0);
  const streak = calcStreak(sessions);
  statsRow.innerHTML = `
    <div class="stat"><div class="stat__value">${totalSessions}</div><div class="stat__label">Sessioni</div></div>
    <div class="stat"><div class="stat__value">${totalMin}</div><div class="stat__label">Minuti totali</div></div>
    <div class="stat"><div class="stat__value">${streak}</div><div class="stat__label">Giorni di fila</div></div>
  `;

  // Sessions log
  const sessionsLog = document.getElementById('sessions-log');
  if (sessions.length === 0) {
    sessionsLog.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📅</div><p>Nessuna sessione ancora. Inizia oggi!</p></div>';
  } else {
    sessionsLog.innerHTML = sessions.slice(0, 20).map(s => `
      <div class="session-entry">
        <span class="session-entry__date">${formatDate(s.date)}</span>
        <span class="session-entry__mood">${s.mood ? MOOD_ICON[s.mood] : '–'}</span>
        <span class="session-entry__note">${s.notes || LEVEL_LABEL[s.difficulty] || ''}</span>
      </div>
    `).join('');
  }

  // Peso log
  const pesoLog = document.getElementById('peso-log');
  if (peso.length === 0) {
    pesoLog.innerHTML = '<p style="color:var(--color-text-muted); font-size:var(--font-size-sm)">Nessun peso registrato ancora.</p>';
  } else {
    pesoLog.innerHTML = peso.slice(0, 10).map(p => `
      <div class="peso-entry">
        <span>${formatDate(p.date)}</span>
        <span><strong>${p.kg} kg</strong></span>
      </div>
    `).join('');
  }
}

// ===== PROFILE =====

function setupProfileView() {
  document.getElementById('btn-salva-profilo').addEventListener('click', () => {
    const profilo = {
      nome: document.getElementById('input-nome').value.trim(),
      eta: parseInt(document.getElementById('input-eta').value) || null,
      livello: parseInt(document.getElementById('select-livello-profilo').value),
      obiettivo: document.getElementById('select-obiettivo').value,
    };
    localStorage.setItem(STORAGE_PROFILO, JSON.stringify(profilo));
    profileEditMode = false;
    renderProfileHeader(profilo);
    document.getElementById('profile-saved').hidden = false;
    setTimeout(() => { document.getElementById('profile-saved').hidden = true; }, 2500);
    // Sync default difficulty selector
    document.getElementById('select-livello').value = profilo.livello;
  });
}

function setupHeaderProfileActions() {
  document.getElementById('btn-edit-profile-header').addEventListener('click', () => {
    profileEditMode = true;
    renderProfileHeader();
    setActiveView('profilo');
    document.getElementById('view-profilo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => {
      document.getElementById('input-nome').focus();
    });
  });

  document.getElementById('btn-delete-profile-header').addEventListener('click', () => {
    const ok = window.confirm('Vuoi eliminare il profilo salvato?');
    if (!ok) return;
    localStorage.removeItem(STORAGE_PROFILO);
    resetProfileForm();
    profileEditMode = false;
    renderProfileHeader(null);
    showToast('Profilo eliminato');
  });

  document.getElementById('btn-reset-progress-header').addEventListener('click', () => {
    const ok = window.confirm('Vuoi azzerare tutti i progressi salvati?');
    if (!ok) return;
    localStorage.removeItem(STORAGE_SESSIONS);
    localStorage.removeItem(STORAGE_PESO);
    renderProgress();
    showToast('Progressi azzerati');
  });
}

function loadProfile() {
  const profilo = getProfile();
  if (!profilo) {
    resetProfileForm();
    renderProfileHeader(null);
    return;
  }
  if (profilo.nome) document.getElementById('input-nome').value = profilo.nome;
  if (profilo.eta)  document.getElementById('input-eta').value = profilo.eta;
  if (profilo.livello) {
    document.getElementById('select-livello-profilo').value = profilo.livello;
    document.getElementById('select-livello').value = profilo.livello;
  }
  if (profilo.obiettivo) document.getElementById('select-obiettivo').value = profilo.obiettivo;
  renderProfileHeader(profilo);
}

function renderProfileHeader(profile = getProfile()) {
  const container = document.getElementById('header-profile');
  if (!container) return;
  const formCard = document.getElementById('profile-form-card');

  if (!profile) {
    container.hidden = true;
    if (formCard) formCard.hidden = false;
    return;
  }

  const parts = [];
  if (profile.eta) parts.push(`${profile.eta} anni`);
  if (profile.livello) parts.push(LEVEL_LABEL[profile.livello] || `Livello ${profile.livello}`);
  if (profile.obiettivo) parts.push(OBJECTIVE_LABEL[profile.obiettivo] || profile.obiettivo);

  document.getElementById('header-profile-name').textContent = profile.nome || 'Profilo personale';
  document.getElementById('header-profile-meta').textContent = parts.join(' · ') || 'Pronta per allenarti';
  container.hidden = false;
  if (formCard) formCard.hidden = !profileEditMode;
}

function resetProfileForm() {
  document.getElementById('input-nome').value = '';
  document.getElementById('input-eta').value = '';
  document.getElementById('select-livello-profilo').value = '1';
  document.getElementById('select-obiettivo').value = 'perdita_peso';
  document.getElementById('select-livello').value = '1';
}

// ===== STORAGE HELPERS =====

function getSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SESSIONS)) || []; }
  catch { return []; }
}
function getPeso() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PESO)) || []; }
  catch { return []; }
}
function getProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PROFILO)) || null; }
  catch { return null; }
}

// ===== UTILITY =====

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that gives numbers in [0, 1).
 */
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function() {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(arr, rng) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(arr, n, rng) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcStreak(sessions) {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let streak = 0;
  let prev = new Date().toISOString().slice(0, 10);
  for (const d of dates) {
    const diff = (new Date(prev) - new Date(d)) / 86400000;
    if (diff <= 1) { streak++; prev = d; }
    else break;
  }
  return streak;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1a1a1a; color:white; padding:14px 24px; border-radius:24px;
    font-size:16px; font-weight:600; z-index:999; box-shadow:0 4px 16px rgba(0,0,0,0.3);
    animation: fadeIn 0.2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(msg) {
  const el = document.getElementById('main-content');
  if (el) el.insertAdjacentHTML('afterbegin', `
    <div class="card card--warning" style="margin-top:16px">
      <strong>Attenzione:</strong> ${msg}
    </div>
  `);
}

function getExerciseVisualSrc(ex) {
  return ex.image || '';
}
