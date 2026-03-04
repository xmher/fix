# WORKBOOK LAYOUT & FORMATTING SPECIFICATION
## For AI-Generated HTML Workbooks (Pager.js)

---

## PAGE SETUP

- **Page size:** US Letter (8.5" × 11")
- **Margins:** 0.75" all sides (adjust as needed per workbook)
- **Content area:** 7.0" × 9.5"
- **Navigation bar:** Present on EVERY page (top strip with section links)
- **Footer:** Present on EVERY page (section name + page number)

---

## SECTION & PAGE STRUCTURE

### Major Sections
- Every major section (e.g. "Dialogue Craft", "Story Structure", "Romance Beats") starts on a **new page**.
- The first page of every section is a **cover page**: section title centred both horizontally and vertically, larger font, with a subtitle in italics beneath it. No other content on this page.

### Worksheet / Chapter Log Pages
- Always start on a **dedicated fresh page**. Never share a page with teaching content above.
- These pages contain answer boxes, checkboxes, radio buttons, and tables — all of which should fill the page properly.

---

## ELEMENT-SPECIFIC RULES

### Headers / Section Titles (h1, h2, h3)
- If a heading lands on a page with **less than ~1/3 of the page remaining**, push the heading to the **next page**.
- A heading must never appear alone at the bottom of a page without content following it.

### Paragraphs / Body Text
- Normal flow. No special rules beyond standard orphan/widow avoidance.
- A single line of a paragraph should never be stranded alone at the top or bottom of a page.

### Italic Lead-in / Epigraph Quotes
- It is fine for an epigraph to appear on its own at the top of a page, separated from the content that follows.
- It does NOT need to be glued to the content below it.

### Callout Boxes (vocabulary, key terms, principles, insight boxes)
- **Fewer than 6 items:** Keep the entire box together on one page. If it won't fit, push it to the next page.
- **6+ items:** OK to split across pages, but keep at least 3 items on each side of the break.
- If pushing a callout box to the next page leaves a gap, see "Empty Space Rules" below.

### Answer Boxes / Write-Here Fields
- **Multiple answer boxes on a page (2-3 questions):** Expand them evenly to fill the page. Exception: if a question clearly requires only a one-sentence answer, keep it small and let the others expand more.
- **Single answer box at the end of a natural section/subsection (around the halfway mark of a page):** Expand it to fill the rest of the page.
- **Single answer box that's the last question and requires substantial writing:** Give it its own full page.
- Answer boxes should NEVER be awkwardly small when there's available space on the page.

### Tables
- **Avoid splitting** across pages when possible.
- If a table MUST split (because it's very long), **repeat the header row** on the continuation page.
- Prefer pushing short tables to the next page over splitting them.

### Checkbox / Radio Button Groups
- **Never split** from their question label. The question and ALL its options must stay together on the same page.
- If the group won't fit on the current page, push the entire group (question + all options) to the next page.

### Two-Column Layouts
- **Never split across pages.** Both columns must appear on the same page.
- If a two-column layout won't fit, push the entire layout to the next page.

---

## EMPTY SPACE RULES

### Small Gap (under ~1 inch remaining at bottom of page)
- **After a natural section or subsection end:** Leave the gap — it looks intentional.
- **Mid-section (not a natural break):** Absorb the space. Options in priority order:
  1. Expand answer boxes above to fill the gap
  2. Add slightly more spacing between elements on the page
  3. Pull a small element down from the previous page (rarely needed)

### Medium Gap (1-2 inches remaining)
- Look at context. If there are answer boxes on the page, stretch them.
- If it's a pure text page, consider pulling content down or adjusting element spacing.
- A 2-inch gap at the end of a major section's last page is acceptable — it signals completion.

### Large Gap (over 2 inches remaining / page less than ~60% full)
- First ask: is there genuinely more content that belongs on this page? If the content is naturally complete (e.g. two callout boxes that cover the topic), the gap is acceptable.
- If the gap is caused by a page break pushing content to the next page unnecessarily, THAT is a problem. Fix by: adjusting what breaks where, expanding answer boxes, or rethinking element sizing.
- Only add content (exercises, note areas, reflection questions) if it's genuinely useful to the reader — never add padding for padding's sake.

### Pages That Can't Be Filled
Sometimes a page simply doesn't have enough content to fill it — two callout boxes that take up 60% of the page and there's nothing else to add. This is fine. Do NOT:
- Artificially stretch callout boxes or text blocks just to fill space
- Add filler content that doesn't serve the reader
- Increase padding to absurd levels to close a gap

If a page has its natural content and there's empty space at the bottom, ask: "Is there a genuinely useful exercise, question, or note area that belongs here?" If yes, add it. If no, leave the space. A clean page with breathing room is better than a page stuffed with padding.

### General Principle
**Empty space should always look intentional, never accidental.** A gap after a section ending = fine. A gap in the middle of a teaching sequence = fine if the content is naturally complete. A gap caused by a bad page break pushing content away = broken.

---

## DECISION PRIORITY ORDER

When conflicts arise (e.g. keeping a callout box together creates a gap, but splitting it looks bad), use this priority:

1. **Never orphan a heading** — headings must always have content below them on the same page
2. **Never split checkbox/radio groups** from their question
3. **Never split two-column layouts** across pages
4. **Keep callout boxes together** (unless 6+ items)
5. **Expand answer boxes** to absorb available space
6. **Avoid table splits** (but allow with repeated headers if necessary)
7. **Minimise empty space** — but only when it looks accidental

---

## HOW TO USE WITH MEASUREMENT REPORT

When you receive a measurement report from `measure_pages.py`, cross-reference each flagged issue against these rules:

**🔴 SPLIT element** → Check: Is this a callout with 6+ items (allowed), a table (allowed with header repeat), or something else (probably needs fixing)?

**⚠️ DANGER ZONE** → Check: Is the element a checkbox group or heading (must move to next page), or a paragraph (probably fine)?

**⚠️ ORPHAN RISK** → Check: Is it a heading (definitely move it), an epigraph (fine to leave), or a paragraph (check for widow/orphan)?

**Page with >25% empty space** → Check: is the content on this page naturally complete? If yes (e.g. two callout boxes that fully cover the topic), the gap is fine — leave it. If the gap exists because a page break pushed content away, that's a real problem to fix.

**Page with >40% empty space** → Same logic but more scrutiny. A section cover page or a page with naturally complete content is fine. A page that's mostly empty because a callout box got pushed to the next page is broken.

---

## EXAMPLE FIXES BY SCENARIO

**Scenario:** Callout box with 4 items starts at 70% of the page and won't fit.
**Fix:** Push entire box to next page. If the gap left behind is mid-section, expand any answer boxes above it. If it's after a section end, leave the gap.

**Scenario:** Three answer boxes on a page, page is only 60% full.
**Fix:** Expand all three boxes evenly to fill the page (unless one is a one-sentence answer, then expand the other two more).

**Scenario:** Heading lands at 85% of the page with one line of text below it.
**Fix:** Push heading + following content to the next page (less than 1/3 page remaining).

**Scenario:** Table with 12 rows won't fit on the current page (only 30% remaining).
**Fix:** Push table to next page. If it still doesn't fit on one page, split with repeated headers.

**Scenario:** Checkbox group with 6 options lands at 80% of the page.
**Fix:** Push entire group (question + all 6 options) to next page. Never split.
