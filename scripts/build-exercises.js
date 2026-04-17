#!/usr/bin/env node
/**
 * build-exercises.js
 * Reads all markdown files from exercises/ subdirectories,
 * parses YAML frontmatter, and compiles data/exercises.json.
 *
 * Usage: node scripts/build-exercises.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXERCISES_DIR = path.join(ROOT, 'exercises');
const VISUALS_DIR = path.join(ROOT, 'assets', 'visuals');
const OUTPUT_FILE = path.join(ROOT, 'data', 'exercises.json');

function resolveImagePath(id) { 
if (fs.existsSync(path.join(VISUALS_DIR, `${id}.png`))) {
  return `assets/visuals/${id}.png`;
}
  return null;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content.trim() };

  const yamlBlock = match[1];
  const body = match[2].trim();

  // Simple YAML parser for our specific schema (no nested objects except arrays)
  const meta = {};
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    if (!key || key.startsWith('#')) continue;

    // Handle arrays: [a, b, c] or []
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      meta[key] = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      meta[key] = value.slice(1, -1);
      continue;
    }

    // Handle numbers
    if (/^\d+$/.test(value)) {
      meta[key] = parseInt(value, 10);
      continue;
    }

    meta[key] = value;
  }

  return { meta, body };
}

function buildExercises() {
  const categories = ['yoga', 'taichi', 'cardio'];
  const exercises = [];
  let errors = 0;

  for (const category of categories) {
    const dir = path.join(EXERCISES_DIR, category);
    if (!fs.existsSync(dir)) {
      console.warn(`[WARN] Directory not found: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort();

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { meta, body } = parseFrontmatter(content);

      if (!meta.id) {
        console.error(`[ERROR] Missing id in ${filePath}`);
        errors++;
        continue;
      }

      const image = resolveImagePath(meta.id);

      exercises.push({ ...meta, image, description_it: body });
    }
  }

  // Ensure output directory exists
  const dataDir = path.join(ROOT, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exercises, null, 2), 'utf8');

  console.log(`✓ Built ${exercises.length} exercises → data/exercises.json`);
  if (errors > 0) console.error(`✗ ${errors} errors encountered`);
  return errors === 0;
}

const ok = buildExercises();
process.exit(ok ? 0 : 1);
