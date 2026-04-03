/**
 * generate-wordlist.mjs
 *
 * Downloads a curated 5-letter English word list and writes
 * app/src/words/wordlist.ts, applying the filtering rules from
 * spec-game-design.md Section 4.3:
 *
 *   - Common, recognisable English words only
 *   - No proper nouns or abbreviations
 *   - No plural forms of 4-letter or shorter root words
 *     (e.g. 'plans' is excluded because 'plan' is a real 4-letter word;
 *      'grass' is kept because 'gras' is not a word)
 *
 * Source: the original Wordle answers list (pre-NYT) — 2315 words hand-curated
 * for being common, everyday English words. This list already excludes most
 * plurals and all proper nouns; the plural filter below is an additional
 * safety net.
 *
 * Requires Node.js 18+ (uses built-in fetch).
 * Run with:  node scripts/generate-wordlist.mjs
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/**
 * Original Wordle answers alphabetical list — 2315 common English 5-letter words.
 * Curated by Josh Wardle (Wordle author) to be everyday recognisable words.
 * Mirrored by cfreshman: https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b
 */
const WORDLE_ANSWERS_URL =
  'https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt'

/**
 * 10 000 most-common English words (first20hours/google-10000-english, no profanity).
 * Used only to build a stem reference for plural detection. Using a frequency-based
 * list (rather than a full dictionary) avoids false positives: rare 4-letter words
 * like 'bras', 'gras', 'gros' are not in the top 10 000, so 'brass', 'grass',
 * 'gross' are correctly kept. Common roots like 'plan', 'bird', 'word', 'card' ARE
 * in the top 10 000, so 'plans', 'birds', 'words', 'cards' are correctly removed.
 * https://github.com/first20hours/google-10000-english
 */
const DICT_URL =
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchLines(url, label) {
  console.log(`Fetching ${label} …`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} fetching ${url}\n` +
        'If this URL has changed, update WORDLE_ANSWERS_URL or DICT_URL in scripts/generate-wordlist.mjs',
    )
  }
  const text = await res.text()
  return text
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Returns true if `word` is a plain plural of a ≤4-letter root word.
 *
 * Logic: word ends in 's' AND the stem (word minus the trailing 's') is
 * 4 letters or fewer AND the stem exists in the English dictionary.
 *
 * Examples:
 *   'plans' → stem 'plan' (4 letters, in dict) → true  ❌ excluded
 *   'grass' → stem 'gras' (4 letters, NOT in dict) → false ✅ kept
 *   'press' → stem 'pres' (4 letters, NOT in dict) → false ✅ kept
 *   'words' → stem 'word' (4 letters, in dict) → true  ❌ excluded
 *   'nurse' → doesn't end in 's' but even if we check: not a plural → false ✅ kept
 */
function isPluralOfShorterWord(word, shortWordSet) {
  if (!word.endsWith('s')) return false
  const stem = word.slice(0, -1) // remove trailing 's'
  if (stem.length > 4) return false // only flag plurals of ≤4-letter roots
  return shortWordSet.has(stem)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [answerLines, dictLines] = await Promise.all([
    fetchLines(WORDLE_ANSWERS_URL, 'Wordle answers (cfreshman)'),
    fetchLines(DICT_URL, 'English dictionary (dwyl)'),
  ])

  // Build the stem reference — only the most common English words of ≤4 letters.
  // Restricting to the first STEM_FREQ_LIMIT entries (by frequency) prevents false
  // positives: rare 4-letter words like 'bras'/'gras' are outside this window, so
  // 'brass'/'grass' are correctly kept, while everyday roots like 'plan'/'bird'/'word'
  // are well inside it.
  const STEM_FREQ_LIMIT = 1000
  const shortWordSet = new Set(
    dictLines
      .slice(0, STEM_FREQ_LIMIT)
      .filter((w) => w.length <= 4 && /^[a-z]+$/.test(w)),
  )
  console.log(
    `\nStem reference: ${shortWordSet.size.toLocaleString()} English words of 1–4 letters`,
  )

  // Validate & deduplicate the raw answer lines
  const candidates = [...new Set(answerLines.filter((w) => /^[a-z]{5}$/.test(w)))]
  console.log(`Words in source list: ${candidates.length}`)

  // Separate the plurals so we can log them for review
  const removed = candidates.filter((w) => isPluralOfShorterWord(w, shortWordSet))
  const kept = candidates.filter((w) => !isPluralOfShorterWord(w, shortWordSet)).sort()

  if (removed.length > 0) {
    console.log(`\nRemoved ${removed.length} plural(s):`)
    console.log('  ' + removed.sort().join(', '))
  } else {
    console.log('\nNo plurals found in source list — source was already well-curated.')
  }

  console.log(`\nFinal word count: ${kept.length}`)

  // ---------------------------------------------------------------------------
  // Write TypeScript output
  // ---------------------------------------------------------------------------

  const header = [
    '// Auto-generated by scripts/generate-wordlist.mjs — do not edit by hand.',
    '// Re-run the script to regenerate: node scripts/generate-wordlist.mjs',
    '//',
    '// Source: Original Wordle answers list (cfreshman, MIT-compatible)',
    '// Filter: plural forms of ≤4-letter root words excluded (spec-game-design.md §4.3)',
    `// Word count: ${kept.length}`,
    '',
  ].join('\n')

  const body = [
    'const WORD_LIST: Set<string> = new Set([',
    ...kept.map((w) => `  '${w}',`),
    '])',
    '',
    'export default WORD_LIST',
    '',
  ].join('\n')

  const output = header + body

  const outPath = join(__dirname, '../app/src/words/wordlist.ts')
  writeFileSync(outPath, output, 'utf8')

  console.log(`\nWritten to ${outPath}`)
  console.log('Done.')
}

main().catch((err) => {
  console.error('\nERROR:', err.message)
  process.exit(1)
})
