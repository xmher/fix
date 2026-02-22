\% Plot Brew AI Component Architecture + Codex Prompt % Generated on
2026-02-22 13:05 UTC

# Plot Brew AI-Directed Layout System

This document defines the component-based architecture for Plot Brew
workbooks and provides a ready-to-use Codex prompt to implement the
system.

------------------------------------------------------------------------

# Why Component-Based Layout

Instead of letting AI modify random HTML blocks across one massive file,
we standardize reusable components:

-   Callouts
-   Answer boxes
-   Tables
-   Checklists
-   Dividers
-   Exercise wrappers

AI can redesign sections freely --- but only using approved components.
This gives it creative control without breaking design consistency.

------------------------------------------------------------------------

# Folder Structure

/base tokens.css components.css layout.css

/sections 01-intro.html 02-pattern-analysis.html 03-callouts.html

/scripts render-section.js export-section-model.js make-thumbnails.js

/dist full-workbook.html

------------------------------------------------------------------------

# Approved Components

## 1) Callout

::: {.pb-callout .pb-callout--tip data-comp="callout" data-variant="tip"}
::: pb-callout__label
Plot Brew Tip
:::

::: pb-callout__body
...
:::
:::

Variants: - tip - pitfall - example - definition

------------------------------------------------------------------------

## 2) Answer Box

::: {.pb-answer data-comp="answer" data-lines="6"}
:::

Height is controlled via CSS variables:

.pb-answer\[data-lines="6"\] { min-height: calc(var(--pb-answer-line) \*
6 + var(--pb-answer-pad) \* 2); }

------------------------------------------------------------------------

## 3) Table

```{=html}
<table class="pb-table pb-table--pattern" data-comp="table" data-variant="pattern">
```
...
```{=html}
</table>
```

------------------------------------------------------------------------

# Measurement Export Strategy

The measurement script should:

-   Export only elements with data-comp
-   Capture:
    -   Bounding box (x, y, width, height)
    -   Computed styles (font-size, margin, padding, break rules,
        overflow)
    -   Text snippet
-   Output per-page JSON files:

out/page-model/page-01.json

------------------------------------------------------------------------

# AI Layout Loop

1)  Render section
2)  Generate screenshots + thumbnails
3)  Export measurement JSON
4)  AI scans images and flags visual problems
5)  AI consults measurement JSON
6)  AI outputs structured patch instructions
7)  Apply patches to CSS or section HTML
8)  Re-render and validate

------------------------------------------------------------------------

# Codex Prompt (Copy & Paste)

You are working on Plot Brew's component-based AI layout system.

Goal: Refactor the workbook into reusable layout components and create
scripts that support an AI-directed render → analyze → patch loop.

Tasks:

1)  Create base CSS architecture:
    -   base/tokens.css (spacing, typography variables)
    -   base/components.css (pb-callout, pb-answer, pb-table, etc.)
    -   base/layout.css (page flow and break rules)
2)  Refactor HTML:
    -   Replace repeated patterns with standardized pb-\* components.
    -   Add data-comp attributes to each layout-significant block.
    -   Ensure components are self-contained.
3)  Create scripts:
    -   render-section.js (renders one section to PNG via Playwright)
    -   export-section-model.js (exports measurement JSON for data-comp
        elements)
    -   make-thumbnails.js (generates contact sheet images)
4)  Ensure export-section-model.js includes:
    -   component identifier
    -   bounding box relative to page
    -   computed style subset
    -   short text snippet
5)  Add npm scripts:
    -   render:section
    -   export:model
    -   thumbs
    -   ai-loop (render + export + thumbs)
6)  Update documentation explaining:
    -   Allowed components
    -   How AI may modify layout (CSS overrides preferred over HTML
        rewrite)
    -   How to iterate safely

Return diffs only. Include comments in new scripts.

------------------------------------------------------------------------

# Final Notes

The AI should not invent new design primitives. It should only combine
and adjust approved components.

This keeps:

-   Visual consistency
-   Predictable layout behavior
-   Scalable redesign across sections
-   Clean automation pipeline
