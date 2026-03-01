#!/usr/bin/env python3
"""
Page Break & Element Measurement Tool for Pager.js HTML Workbooks
=================================================================
Run this AFTER your HTML is built. It opens the HTML in a headless browser,
simulates the exact print layout, and reports:

1. Where every page break falls
2. Every element's position, height, and which page it's on
3. Elements that are SPLIT across page breaks
4. Elements dangerously close to a break (orphan/widow risk)
5. How much empty space is left at the bottom of each page

Usage:
    python3 measure_pages.py your_workbook.html [--output report.txt] [--json report.json]

Page setup defaults to US Letter (8.5" x 11") with 0.75" margins on all sides.
Override with flags: --width 8.5 --height 11 --margin-top 0.75 etc.
"""

import argparse
import json
import sys
import os
from playwright.sync_api import sync_playwright

# ─── CONFIGURATION ───────────────────────────────────────────────────────────

# US Letter in inches
DEFAULT_WIDTH = 8.5
DEFAULT_HEIGHT = 11.0
DEFAULT_MARGIN_TOP = 0.75
DEFAULT_MARGIN_BOTTOM = 0.75
DEFAULT_MARGIN_LEFT = 0.75
DEFAULT_MARGIN_RIGHT = 0.75
DPI = 96  # CSS px per inch (browser default)

# How close to a page break edge counts as "danger zone" (in px)
DANGER_ZONE_PX = 40  # ~0.4 inches

# CSS selectors to measure — customize these to match YOUR HTML classes
# Format: (friendly_name, css_selector)
ELEMENT_SELECTORS = [
    ("Section Header",       "h1, h2, h3, h4, h5, h6"),
    ("Paragraph",            "p"),
    ("Callout Box",          ".callout-box, .callout, .info-box, .vocabulary-box, .key-terms, blockquote"),
    ("Answer Box",           ".answer-box, .answer-field, .write-here, .input-box, textarea, input[type='text']"),
    ("Table",                "table"),
    ("Checklist / Radio",    ".checklist, .checkbox-group, .radio-group"),
    ("Ordered List",         "ol"),
    ("Unordered List",       "ul"),
    ("Image",                "img"),
    ("Figure / Diagram",     "figure, .diagram, .figure"),
    ("Page Break (explicit)","[style*='page-break'], .page-break, .pagebreak"),
    ("Navigation Bar",       ".nav-bar, .navigation, nav"),
    ("Footer",               "footer, .page-footer, .footer"),
    ("Italic Lead-in",       ".lead-in, .epigraph, .pullquote"),
    ("Divider / HR",         "hr, .divider, .separator"),
    # Catch-all for any div with a border (likely a box element)
    ("Bordered Box (auto)",  "div[style*='border'], div[class*='box'], div[class*='card']"),
]


def inches_to_px(inches):
    return inches * DPI


def measure_html(html_path, page_width_in, page_height_in,
                 margin_top_in, margin_bottom_in, margin_left_in, margin_right_in,
                 custom_selectors=None):
    """
    Opens the HTML in a headless browser and measures every element's
    position relative to the paged layout.
    """

    content_height_px = inches_to_px(page_height_in - margin_top_in - margin_bottom_in)
    content_width_px = inches_to_px(page_width_in - margin_left_in - margin_right_in)
    page_height_px = inches_to_px(page_height_in)

    abs_path = os.path.abspath(html_path)
    file_url = f"file://{abs_path}"

    selectors = ELEMENT_SELECTORS[:]
    if custom_selectors:
        selectors.extend(custom_selectors)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": int(inches_to_px(page_width_in)), "height": 800}
        )
        page.goto(file_url, wait_until="networkidle")

        # Wait for any web fonts / images to load
        page.wait_for_timeout(1500)

        # ─── Inject measurement script ───────────────────────────────
        results = page.evaluate(f"""
        () => {{
            const CONTENT_H = {content_height_px};
            const PAGE_H = {page_height_px};
            const MARGIN_TOP = {inches_to_px(margin_top_in)};
            const MARGIN_BOTTOM = {inches_to_px(margin_bottom_in)};
            const DANGER_ZONE = {DANGER_ZONE_PX};

            const selectors = {json.dumps([(name, sel) for name, sel in selectors])};

            // Get all elements matching our selectors
            let allElements = [];
            for (const [name, selector] of selectors) {{
                try {{
                    const els = document.querySelectorAll(selector);
                    els.forEach((el, idx) => {{
                        const rect = el.getBoundingClientRect();
                        const scrollTop = window.scrollY || document.documentElement.scrollTop;
                        const absTop = rect.top + scrollTop;
                        const absBottom = absTop + rect.height;

                        // Which page does the TOP of this element land on?
                        const pageStart = Math.floor(absTop / CONTENT_H) + 1;
                        // Which page does the BOTTOM land on?
                        const pageEnd = Math.floor((absBottom - 1) / CONTENT_H) + 1;

                        // Position within its starting page
                        const posInPage = absTop % CONTENT_H;
                        // How much space remains on that page below this element
                        const spaceBelow = CONTENT_H - (absBottom % CONTENT_H);
                        const spaceAbove = posInPage;

                        // Is it split across pages?
                        const isSplit = pageEnd > pageStart;

                        // Is it in the danger zone (close to bottom of page)?
                        const remainingOnPage = CONTENT_H - posInPage;
                        const isDangerZone = !isSplit && (CONTENT_H - (absBottom % CONTENT_H)) < DANGER_ZONE && (absBottom % CONTENT_H) !== 0;
                        const isOrphaned = posInPage > (CONTENT_H - DANGER_ZONE);

                        // Get a preview of the text content
                        let textPreview = (el.textContent || '').trim().substring(0, 80);
                        if ((el.textContent || '').trim().length > 80) textPreview += '...';

                        // Get the tag and classes for identification
                        const tag = el.tagName.toLowerCase();
                        const classes = el.className || '';

                        allElements.push({{
                            type: name,
                            tag: tag,
                            classes: typeof classes === 'string' ? classes : '',
                            index: idx,
                            textPreview: textPreview,
                            absTop: Math.round(absTop * 100) / 100,
                            absBottom: Math.round(absBottom * 100) / 100,
                            height: Math.round(rect.height * 100) / 100,
                            width: Math.round(rect.width * 100) / 100,
                            pageStart: pageStart,
                            pageEnd: pageEnd,
                            positionInPage: Math.round(posInPage * 100) / 100,
                            spaceRemainingOnPage: Math.round((CONTENT_H - (absBottom % CONTENT_H)) * 100) / 100,
                            isSplit: isSplit,
                            isDangerZone: isDangerZone,
                            isOrphaned: isOrphaned,
                        }});
                    }});
                }} catch(e) {{
                    // Skip invalid selectors
                }}
            }}

            // Deduplicate: same DOM element matching multiple selectors
            const seen = new Set();
            allElements = allElements.filter(e => {{
                const key = e.absTop + '-' + e.absBottom + '-' + e.height + '-' + e.width + '-' + e.tag;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }});

            // Sort by vertical position
            allElements.sort((a, b) => a.absTop - b.absTop);

            // Calculate page-level stats
            const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            const totalPages = Math.ceil(totalHeight / CONTENT_H);
            let pageStats = [];
            for (let pg = 1; pg <= totalPages; pg++) {{
                const pageTop = (pg - 1) * CONTENT_H;
                const pageBottom = pg * CONTENT_H;
                // Find elements on this page
                const onPage = allElements.filter(e => e.pageStart === pg || e.pageEnd === pg);
                // Last element ending on this page
                const lastOnPage = onPage.filter(e => e.pageEnd === pg);
                let lastBottom = pageTop;
                for (const e of lastOnPage) {{
                    if (e.absBottom > lastBottom && e.absBottom <= pageBottom) {{
                        lastBottom = e.absBottom;
                    }}
                }}
                const emptySpace = pageBottom - lastBottom;
                const splitElements = onPage.filter(e => e.isSplit);

                pageStats.push({{
                    page: pg,
                    emptySpaceAtBottom: Math.round(emptySpace * 100) / 100,
                    emptySpaceInches: Math.round((emptySpace / {DPI}) * 100) / 100,
                    elementCount: onPage.length,
                    splitCount: splitElements.length,
                }});
            }}

            return {{
                totalPages: totalPages,
                totalHeightPx: totalHeight,
                contentHeightPerPage: CONTENT_H,
                elements: allElements,
                pageStats: pageStats,
            }};
        }}
        """)

        browser.close()

    return results


def format_report(results, page_height_in, margin_top_in, margin_bottom_in):
    """Format the measurement results into a readable report."""
    lines = []
    content_h = results['contentHeightPerPage']

    lines.append("=" * 80)
    lines.append("  PAGE BREAK & ELEMENT MEASUREMENT REPORT")
    lines.append("=" * 80)
    lines.append(f"  Total pages: {results['totalPages']}")
    lines.append(f"  Total document height: {results['totalHeightPx']}px")
    lines.append(f"  Content area per page: {content_h}px ({content_h/DPI:.2f} inches)")
    lines.append("")

    # ─── PAGE SUMMARY ─────────────────────────────────────────────
    lines.append("─" * 80)
    lines.append("  PAGE SUMMARY")
    lines.append("─" * 80)
    for ps in results['pageStats']:
        status = ""
        if ps['emptySpaceAtBottom'] > content_h * 0.4:
            status = "  ⚠️  >40% empty — consider reflow"
        elif ps['emptySpaceAtBottom'] > content_h * 0.25:
            status = "  📐 >25% empty"
        if ps['splitCount'] > 0:
            status += f"  🔴 {ps['splitCount']} element(s) SPLIT across break"

        lines.append(f"  Page {ps['page']:3d}  |  {ps['elementCount']:3d} elements  |  "
                      f"Empty: {ps['emptySpaceAtBottom']:6.1f}px ({ps['emptySpaceInches']:.2f}\")  {status}")
    lines.append("")

    # ─── PROBLEMS: SPLIT ELEMENTS ─────────────────────────────────
    splits = [e for e in results['elements'] if e['isSplit']]
    if splits:
        lines.append("─" * 80)
        lines.append("  🔴 SPLIT ACROSS PAGE BREAK (elements broken between pages)")
        lines.append("─" * 80)
        for e in splits:
            lines.append(f"  [{e['type']}] <{e['tag']}> pages {e['pageStart']}→{e['pageEnd']}  "
                          f"height={e['height']:.0f}px")
            lines.append(f"    Text: \"{e['textPreview']}\"")
            if e['classes']:
                lines.append(f"    Class: {e['classes']}")
            lines.append("")
    else:
        lines.append("  ✅ No elements split across page breaks")
        lines.append("")

    # ─── PROBLEMS: DANGER ZONE ────────────────────────────────────
    dangers = [e for e in results['elements'] if e['isDangerZone']]
    if dangers:
        lines.append("─" * 80)
        lines.append(f"  ⚠️  DANGER ZONE (within {DANGER_ZONE_PX}px of page bottom)")
        lines.append("─" * 80)
        for e in dangers:
            lines.append(f"  [{e['type']}] <{e['tag']}> page {e['pageStart']}  "
                          f"only {e['spaceRemainingOnPage']:.0f}px from break")
            lines.append(f"    Text: \"{e['textPreview']}\"")
            lines.append("")

    # ─── PROBLEMS: ORPHANED (starting near bottom) ────────────────
    orphans = [e for e in results['elements'] if e['isOrphaned'] and not e['isSplit']]
    if orphans:
        lines.append("─" * 80)
        lines.append(f"  ⚠️  ORPHAN RISK (element starts near bottom of page)")
        lines.append("─" * 80)
        for e in orphans:
            lines.append(f"  [{e['type']}] <{e['tag']}> starts at {e['positionInPage']:.0f}px on page {e['pageStart']}  "
                          f"({content_h - e['positionInPage']:.0f}px remaining)")
            lines.append(f"    Text: \"{e['textPreview']}\"")
            lines.append("")

    # ─── FULL ELEMENT LIST ────────────────────────────────────────
    lines.append("─" * 80)
    lines.append("  FULL ELEMENT MAP (all measured elements, top to bottom)")
    lines.append("─" * 80)
    lines.append(f"  {'Type':<25} {'Tag':<8} {'Page':>4} {'PosInPg':>8} {'Height':>8} {'Remaining':>10}  Preview")
    lines.append(f"  {'-'*25} {'-'*8} {'-'*4} {'-'*8} {'-'*8} {'-'*10}  {'-'*30}")

    current_page = 0
    for e in results['elements']:
        if e['pageStart'] != current_page:
            current_page = e['pageStart']
            lines.append(f"  {'─── PAGE ' + str(current_page) + ' ':─<90}")

        flag = ""
        if e['isSplit']:
            flag = " 🔴SPLIT"
        elif e['isDangerZone']:
            flag = " ⚠️CLOSE"
        elif e['isOrphaned']:
            flag = " ⚠️ORPHAN"

        preview = e['textPreview'][:40]
        lines.append(f"  {e['type']:<25} {e['tag']:<8} {e['pageStart']:>4} "
                      f"{e['positionInPage']:>7.0f}px {e['height']:>7.0f}px "
                      f"{e['spaceRemainingOnPage']:>9.0f}px  {preview}{flag}")

    lines.append("")
    lines.append("=" * 80)
    lines.append("  END OF REPORT")
    lines.append("=" * 80)

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Measure page breaks in HTML workbooks")
    parser.add_argument("html_file", help="Path to the HTML file to measure")
    parser.add_argument("--output", "-o", help="Save text report to file")
    parser.add_argument("--json", "-j", help="Save raw JSON data to file", dest="json_file")
    parser.add_argument("--width", type=float, default=DEFAULT_WIDTH, help="Page width in inches")
    parser.add_argument("--height", type=float, default=DEFAULT_HEIGHT, help="Page height in inches")
    parser.add_argument("--margin-top", type=float, default=DEFAULT_MARGIN_TOP)
    parser.add_argument("--margin-bottom", type=float, default=DEFAULT_MARGIN_BOTTOM)
    parser.add_argument("--margin-left", type=float, default=DEFAULT_MARGIN_LEFT)
    parser.add_argument("--margin-right", type=float, default=DEFAULT_MARGIN_RIGHT)
    parser.add_argument("--danger-zone", type=int, default=DANGER_ZONE_PX,
                        help="Pixels from page edge to flag as danger zone")

    args = parser.parse_args()

    danger_zone = args.danger_zone

    if not os.path.exists(args.html_file):
        print(f"Error: File not found: {args.html_file}")
        sys.exit(1)

    print(f"Measuring: {args.html_file}")
    print(f"Page: {args.width}\" × {args.height}\" with margins T:{args.margin_top}\" B:{args.margin_bottom}\" L:{args.margin_left}\" R:{args.margin_right}\"")
    print(f"Content area: {args.width - args.margin_left - args.margin_right:.2f}\" × {args.height - args.margin_top - args.margin_bottom:.2f}\"")
    print()

    results = measure_html(
        args.html_file,
        args.width, args.height,
        args.margin_top, args.margin_bottom,
        args.margin_left, args.margin_right,
    )

    report = format_report(results, args.height, args.margin_top, args.margin_bottom)
    print(report)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"\nText report saved to: {args.output}")

    if args.json_file:
        with open(args.json_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"JSON data saved to: {args.json_file}")


if __name__ == "__main__":
    main()
