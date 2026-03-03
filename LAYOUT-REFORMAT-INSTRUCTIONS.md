# Layout Reformat Instructions — Round 1

## Page Dimensions
- Page content area: **919px tall (9.57in)**
- Page size: 8.5in × 11in, margins: 65px top, 72px sides and bottom

---

## Step 1: Add `.labeled-section` CSS

Add this to the stylesheet. See `option-a-page-break-test.html` for a confirmed working reference.

```css
/* Flowing labeled section — replaces rigid insight-box for large reference content */
.labeled-section {
    border-left: 4px solid var(--theme-color);
    padding: 0 0 0 20px;
    margin: 1.5rem 0 0.75rem 0;
    /* NO break-inside: avoid — content flows freely across pages */
}

.labeled-section .insight-label,
.labeled-section .example-label,
.labeled-section .box-label {
    break-after: avoid; /* keeps label with first paragraph */
}

.labeled-section p {
    margin-bottom: 0.75rem;
    line-height: 1.75;
    text-align: left;
}
.labeled-section p:last-child { margin-bottom: 0; }

/* Colour variants for romance/fantasy phase sections */
.labeled-section.romance-phase {
    border-left-color: var(--color-romance);
}
.labeled-section.fantasy-phase {
    border-left-color: var(--color-fantasy);
}
```

---

## Step 2: Convert Large Rigid Boxes to `.labeled-section`

For each box listed below, change the class from `insight-box` (or `example-box`, `romance-box`, `fantasy-box`) to `labeled-section`. Find them by their label text inside `<span class="insight-label">`, `<span class="example-label">`, or `<span class="box-label">`.

### What to Convert

**"How to Use This Guide" section:**
- "Craft Includes"
- "Quick-Fill" (analysis level box)
- "Standard" (analysis level box — if it's an insight-box)
- "Deep-Dive" (analysis level box)

**"Craft Toolkit" section (all the reference content):**
- "The Three-Act Framework"
- "Key Story Beats to Recognize"
- "What Every Scene Needs"
- "Scene-Level Techniques"
- "Creating Tension"
- "Controlling Pace"
- "Character Essentials"
- "Showing Character"
- "Sentence Techniques"
- "Description & Detail"
- "Dialogue Principles"
- "Dialogue Techniques"

**"How to Use These Chapter Logs" section:**
- "What to Track in Every Chapter"
- "Specific Things to Notice"

**Romance Arc Tracking — "What to Look For" boxes:**
- "What to Look For in Phase 2"
- "What to Look For in Phase 3"
- "What to Look For in Phase 4"

**Fantasy Plot Tracking — "What to Look For" boxes:**
- "What to Look For in Act 2A"
- "What to Look For in Act 2B"
- "What to Look For in Act 3"

**Romance phase intro boxes** (change from `.romance-box` to `.labeled-section .romance-phase`):
- "Phase 2: Falling in Love (25–50%)"
- "Phase 3: Retreating from Love (50–75%)"
- "Phase 4: Fighting for Love (75–100%)"

**Fantasy phase intro boxes** (change from `.fantasy-box` to `.labeled-section .fantasy-phase`):
- "Act 2A: Fun & Games (25–50%)"
- "Act 2B: Bad Guys Close In (50–75%)"
- "Act 3: The Finale (75–100%)"

**Trope Execution section:**
- "What Makes a Trope Work"

**Trope analysis `.example-box` elements (Macro Tropes subsection):**
- "Enemies to Lovers: The Four Phases"
- "Fated Mates / Soul Bonds"
- "Slow Burn: The Art of Delayed Gratification"
- "Morally Grey Hero: The Tightrope"
- "Forbidden Love: Why They Can't"

**Trope analysis `.example-box` elements (Micro Tropes subsection):**
- "\"Who Did This To You?\""
- "Wound Tending / Injury Care"
- "The Training Scene"

**Spice & Intimacy section:**
- "What to Analyse in Intimacy Scenes"
- "What Creates Verbal Chemistry"
- "Techniques to Look For"

**Craft Moves section:**
- "How to Extract Usable Lessons"

**Synthesis section:**
- "Questions to Drive Your Synthesis"

**Appendix — Glossary `.quick-ref` boxes (the LARGE ones):**
- "Structure & Integration" (glossary)
- "Diagnostic Terms" (glossary)
- "Romantic Structure" (glossary)

**Appendix — Trope Dictionary `.example-box` elements (ALL of them):**
Convert every `.example-box` in the Trope Dictionary section. These are all the trope definition cards: Enemies to Lovers, Forced Proximity, Fated Mates, Slow Burn, Forbidden Love, Morally Grey, Second Chance, Hidden Identity, Fake Relationship, Captive/Captor, Royal/Commoner, Redemption Arc, Mutual Pining, and all Micro Trope entries.

### What to KEEP as Rigid Boxes (DO NOT convert)

- **`.principle-card`** elements — "The Goal", "The Romance Promise", "The Dual-Engine Genre", "What You're Really Learning", "One Last Thing". These are small featured callouts. The box IS the design.
- **`.pitfall-box`** — "Common Pitfalls to Notice". Small callout.
- **`.word-bank`** — "Macro Trope Word Bank", "Micro Trope Word Bank". Visual reference cards.
- **`.quick-ref`** in Key Terms section — "Essential Vocabulary", "Dual-Arc Vocabulary". These are compact definition blocks that work as boxes.
- **"Heat Level Scale"** `.quick-ref` — this is a compact numbered scale that works as a box.
- **Phase 1 intro boxes** — "Phase 1: Setup & Attraction (0–25%)" (romance) and "Act 1: The Setup (0–25%)" (fantasy). These are the FIRST phase in each section and are small enough to keep rigid.
- **Any box that's clearly short** (under ~4 paragraphs / ~300px). If in doubt, leave it.

---

## Step 3: Audit `break-before` Classes

The HTML has ~58 `break-before` instances. Many were added to work around rigid boxes. After converting to labeled-sections, content will flow differently and some of these breaks will create NEW empty gaps.

### Keep `break-before` on:
- **Section title pages** (`.section-title-page.break-before`) — intentional full-page section dividers
- **Major section headings** (`<h2 class="break-before">`) for new topics — Macro Tropes, Micro Tropes, Heat Level Progression, Banter & Verbal Chemistry, Technique Collection, Dual-Arc Validation Toolkit, Dual-Arc Glossary, etc.
- **Beat tracking tables** (`<table class="beat-table ... break-before">`) — these need their own pages
- **Craft Toolkit topic wrappers** (`<div class="break-before">` and `<div class="break-before craft-compact">`) — these separate each craft topic, which is intentional
- **Write-area page starters** — headings like "Fantasy midpoint event..." and "How do they connect?" that start pages of write-in boxes

### Review and likely REMOVE `break-before` from:
After the box conversion, some content that was being pushed to new pages because a box didn't fit will now flow naturally. These `break-before` instances may now create unnecessary gaps:

- `<h3 class="break-before">The Emotional Mirror</h3>` — review
- `<h3 class="break-before">Integration Deep Questions</h3>` — review
- `<h4 class="break-before">Applying the Through-Thread to Your Own Writing</h4>` — review
- Any `break-before` on an element that directly follows a section that's now been converted to `.labeled-section` — the break may no longer be needed since the content before it will flow to fill the page

**General rule:** If `break-before` is on a heading followed by write-areas, keep it. If it's on a heading followed by flowing text that was pushed forward by a rigid box, it probably needs removing. When in doubt, keep it — we can remove in Round 2 after seeing the render.

---

## Step 4: Fix Tables

These are independent of the box conversion.

### Pattern Used Worksheet Table
Find the table with columns "Pattern Used" | "How It Appears in This Book (Notes)".
- Currently has 1 example row (Crucible Quest) + 3 blank rows
- **Change to 8 rows**, one per pattern, with names pre-filled:
  1. Crucible Quest (keep existing example text)
  2. Symbiotic Magic
  3. Antagonist's Leverage
  4. Political Marriage / Bargain
  5. Mirrored Wounds
  6. Secret Identity
  7. Power Synergy
  8. Prophecy of Union
- Row height: `1.05in` each
- Add `style="break-inside: avoid;"` to the table

### Technique Collection Tables
Find both tables near "Technique Collection" heading.
- Table 1: Category (Opening Hook, Opening Hook, Sensory Description, Tension Building, Emotional Moment) + columns "The Quote/Example" and "Why It Works"
- Table 2: Same structure with (Dialogue/Banter, Action Sequence, Chapter Ending, World-Building, Plot Twist)
- Add `style="break-inside: avoid;"` to both tables
- Increase row heights from `1.5in` to `1.8in`

### Heat Level Progression Table
Find the table with columns `#` | `Chapter` | `Heat Level` | `Scene Type` | `What Changed After?`.
There are two of these tables (rows 1-4 and rows 5-7). The second one (rows 5-7) has 3 rows that don't fill the page.
- Increase row heights on the second table to fill the page. Calculate: (919px - header ~64px - margins) / 3 ≈ `2.8in` per row
- Add `break-inside: avoid` to both heat level tables

### Banter/Chemistry Collection Table
Find the table with columns `Chapter` | `The Exchange` | `Technique`.
- Add `style="break-inside: avoid;"`
- Increase row heights to fill the page. 5 rows + header: (919px - ~44px header) / 5 ≈ `1.7in` per row

### Pitfall Diagnosis Table
Find the table with columns `Pitfall` | `Present?` | `Evidence / Where You Noticed It`.
- The insight-box "Structural Pitfall Diagnosis" above this table should get `class="break-before"` added (so the whole section starts on a fresh page) and `margin-top` changed from `1.5rem` to `0`
- Add `break-inside: avoid` to the table
- Increase row heights from `0.8in` to `1.4in`

---

## Step 5: Fix Chapter Log Bottom Border

The last write box (`.write-space-md`) on every chapter log page 2 (pages 26-84, even numbers) extends to 1px from the page edge, clipping its bottom border.

Find the CSS for `.write-space-md` min-height (likely `min-height: 2.4in` or similar) inside the chapter log context and reduce by ~3-4px. For example: `2.4in` → `2.35in`.

This fixes all 30 chapter log pages at once.

---

## Summary

1. Add `.labeled-section` CSS
2. Convert ~50 large boxes to `.labeled-section` (listed by label text above)
3. Audit ~58 `break-before` instances (keep section dividers, remove box workarounds)
4. Fix 6 tables (pattern, technique ×2, heat level, banter, pitfall)
5. Fix chapter log bottom border CSS

After these changes, the user will re-render, re-measure, and come back for Round 2 (write-area sizing, reflection questions, fine-tuning).
