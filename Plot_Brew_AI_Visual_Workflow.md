\% Plot Brew AI Visual + Measurement Workflow % Generated on 2026-02-22
13:46 UTC

# Plot Brew Visual-First AI Layout Workflow

This document defines the simplified AI-directed layout system for Plot
Brew workbooks.

This version does NOT include automatic patch application.

Instead, the workflow is:

1)  Render pages
2)  Generate thumbnail contact sheets
3)  Export structured per-page measurements
4)  Give visuals + measurements to AI in chat
5)  Manually apply layout fixes

This keeps full creative control while giving AI precise data.

------------------------------------------------------------------------

# Philosophy

The AI acts as an Art Director, not an auto-editor.

-   AI visually inspects rendered pages.
-   AI consults measurement JSON for precision.
-   AI proposes specific HTML/CSS adjustments.
-   You manually apply changes.

No automatic CSS injection. No patch scripts. No uncontrolled
modifications.

------------------------------------------------------------------------

# Folder Structure

/base tokens.css components.css layout.css

/sections (optional) 01-intro.html 02-pattern-analysis.html

/scripts render-pages.js make-contact-sheets.js export-page-model.js

/out pages/ contact-sheets/ page-model/

------------------------------------------------------------------------

# Required Data Attributes

All layout-significant elements must include stable identifiers:

-   data-pb-id (unique, stable)
-   data-comp (component type)

Example:

```{=html}
<section class="pb-section" data-pb-id="section-02" data-comp="section">
```
```{=html}
</section>
```
::: {.pb-callout .pb-callout--tip data-pb-id="callout-07" data-comp="callout"}
:::

::: {.pb-answer data-pb-id="answer-03" data-comp="answer" data-lines="6"}
:::

```{=html}
<table class="pb-table pb-table--pattern" data-pb-id="table-02" data-comp="table">
```
```{=html}
</table>
```
IDs must remain stable across renders.

------------------------------------------------------------------------

# Scripts

## render-pages.js

-   Uses Playwright
-   Loads local Paged.js workbook URL
-   Outputs:

out/pages/page-001.png out/pages/page-002.png

------------------------------------------------------------------------

## make-contact-sheets.js

-   Generates thumbnail grids
-   Outputs:

out/contact-sheets/contact-sheet-01.png

------------------------------------------------------------------------

## export-page-model.js

Exports structured layout measurements per page:

out/page-model/page-001.json

Each page JSON includes:

For each element with data-comp or data-pb-id:

-   pbId
-   tag
-   classSummary
-   textSnippet (max 200 chars)
-   bbox {x, y, width, height} relative to page
-   computed subset:
    -   fontSize
    -   lineHeight
    -   marginTop
    -   marginBottom
    -   paddingTop
    -   paddingBottom
    -   display
    -   position
    -   breakBefore
    -   breakAfter
    -   breakInside
    -   overflow

Also include page-level summary:

-   page width
-   page height
-   total component count
-   largest vertical whitespace block

------------------------------------------------------------------------

# NPM Scripts

Add to package.json:

-   render
-   thumbs
-   model
-   ai-prep (render + thumbs + model)

Example:

npm run ai-prep

------------------------------------------------------------------------

# AI Iteration Workflow

Step 1: Run ai-prep.

Step 2: Give ChatGPT:

-   contact-sheet image
-   specific page PNG
-   page-model JSON for that page

Step 3: Ask:

"Based on visuals and measurements, diagnose layout imbalance and
propose minimal CSS/HTML changes."

Step 4: Manually apply suggested fixes.

Step 5: Re-run ai-prep and validate.

------------------------------------------------------------------------

# Codex Prompt (Visual + Measurement Only)

You are working in my Plot Brew workbook repository.

Goal: Build a visual-first AI layout pipeline without automatic
patching.

Tasks:

1)  Ensure layout-significant elements have:
    -   data-pb-id (stable unique id)
    -   data-comp (component type)
2)  Create scripts:

```{=html}
<!-- -->
```
A)  scripts/render-pages.js
    -   Playwright
    -   Output page screenshots
B)  scripts/make-contact-sheets.js
    -   Generate thumbnail grids
C)  scripts/export-page-model.js
    -   Export per-page JSON
    -   Include only elements with data-comp or data-pb-id
    -   Include bounding box and computed style subset

```{=html}
<!-- -->
```
3)  Add npm scripts:
    -   render
    -   thumbs
    -   model
    -   ai-prep
4)  Create Plot_Brew_AI_Visual_Workflow.md documentation explaining:
    -   How to run ai-prep
    -   Which files to give AI
    -   How to interpret page-model JSON
    -   Manual iteration process

Constraints:

-   No automatic patch application.
-   No CSS override injection system.
-   Keep scripts modular and testable.
-   Return diffs only.
