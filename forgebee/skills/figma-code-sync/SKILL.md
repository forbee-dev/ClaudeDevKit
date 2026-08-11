---
name: figma-code-sync
description: Use when reconciling a Figma design-system file against the code that ships — auditing a component page, fixing drift, or onboarding a newly built component. Enforces code-as-source-of-truth, value-by-value diffing, and the Figma Plugin API traps that each cost a debugging cycle. Trigger on "check Figma against code", "the Figma is wrong", "sync the design system", "add this component to the design system", or any request to change a design-system file.
version: 1.0.0
---

# Figma ↔ Code Sync

## Objective

Bring a Figma design-system file into agreement with the code that actually ships, one component at a time, with every changed value traceable to a line of source.

This skill is the portable method. Project specifics — file keys, page inventories, token spec paths, the local defect history — belong in a project-level skill in that repo's `.claude/skills/`. Read that first when it exists; this skill is what you fall back on and what a new project starts from.

**Composes with `figma-use`** — that skill is a mandatory prerequisite before any `use_figma` call. Load both.

## THE ONE LAW

**Code is the source of truth. Figma is derived from it — never the reverse, and never from a screenshot.**

You do not design during a sync. Read the source, extract declared values, transcribe them. If a value cannot be traced to a line of source it does **not** go in the file — flag it as unverified and say what you looked for.

Three corollaries:

- **When a doc note disagrees with the code, the code wins and the note gets corrected.** Documentation drifts faster than either side.
- **Fixes go in Figma, not in the theme.** Production code is read-only reference during a sync. If you find a genuine source bug, report it — do not fix it in the same pass.
- **Leave genuinely open decisions open.** Recording a conflict is a correct output. Resolving it unilaterally is not.

## Never

- Never eyeball the canvas — dump node properties programmatically and diff numerically
- Never pick a plausible value when the source is silent; flag it unverified
- Never approximate from a reference screenshot — decode the real asset
- Never blanket-sweep a page for one defect class; every rule below has a legitimate exception
- Never declare a value absent from the codebase after a single grep spelling
- Never write to a file the project marks read-only reference

## Part A — audit or fix an existing page

One page at a time. Finish and verify before starting the next.

1. **Find the production reference.** A mature file names the authoritative source on the page itself. If none exists, locate it by component name and record what you found, so the next pass starts from it.
2. **Read that source — and its neighbours.** Values split routinely across a base class and a modifier; reading only the base gives you half a value.
3. **Dump the Figma node tree programmatically.** Emit sizes, fills, strokes, radii, padding, gaps, font metrics.
4. **Diff value by value, and write the diff down.** The written diff is what makes the pass reviewable.
5. **Fix only deviations.** Each fix cites a line.
6. **Verify** (see below).
7. **Record the audit** (see below).

### Free checks — run these before reading any source

Cheapest signal first, because they need no source access:

- **Annotation versus drawing.** Compare the page's own annotation text against the drawn nodes. A mismatch proves one of them is wrong — it does not tell you which. Both directions occur.
- **Local frame where an instance belongs.** A frame named like a component but whose type is not `INSTANCE` drifts precisely because it does not inherit.
- **Opaque white wrappers.** A container with a white fill the source never declares is almost always an artifact of frame creation, not a design decision.

### Defect priors — check these before hypothesising

These are the drift classes that recur across projects. Each carries its own counter-case, and the counter-case is the part that matters: a rule applied blindly manufactures new defects.

| # | Prior | The exception that makes it dangerous |
|---|---|---|
| 1 | **Label colour inverted against its surface.** Palettes usually flip the label at a defined step. | A light label on a *brand* colour is often correct by declaration. Check the fill before darkening any label. |
| 2 | **Dark-surface component recoloured for a light board.** `background: transparent` or near-white values mean it belongs on dark. | Add the dark backdrop as page scenery, not as a component fill. |
| 3 | **`AUTO` line-height replacing a declared value.** Makes every box a few pixels short. | `AUTO` is *correct* where the source declares none. Match per **selector**, never per font-size — one size commonly carries several ratios. |
| 4 | **Positioning split across base class and modifier.** Half-applied offsets are the symptom. | — |
| 5 | **A consumer's scoped override baked into a shared component.** Shared component = shared value; scoped value = instance override. | — |
| 6 | **Near-identical values conflated.** Two greys one step apart, two hexes differing in a digit. | Verify they are genuinely the same in source before unifying. Distinct-but-close is common and deliberate. |
| 7 | **Auto-width text overflowing its parent.** | `textAutoResize === 'WIDTH_AND_HEIGHT' && width > parent.width` → set `'HEIGHT'` plus `layoutSizingHorizontal = 'FILL'`. |
| 8 | **Heading structure mis-modelled.** Read the template, not the visual weight. | SEO-load-bearing. One `h1` per page, never skip a level. |
| 9 | **Glyph substituted for a real icon.** A text character standing in for an icon asset. | Check the project's icon registry for the true name. |
| 10 | **Solid fill where the source declares a gradient.** | Figma paints fills bottom-up: `[base, overlay]`. |
| 11 | **Wrong container clips.** ⚠️ **Invisible to a property diff** — every value can be correct and the component still renders wrong. | Check which selector actually carries `overflow`. Treat any negative-offset child (badge, ribbon, bleed) as a signal to verify its ancestors' clipping, and model negative margins that exist purely to create clearance for it. Margins do not collapse in flex, so a gap plus a child margin **sum**. |
| 12 | **Framework preset versus same-named utility class.** Two layers can define `text-xl` with different values. | Establish which layer owns the element *before* resolving any class name. See `wp-design-system` for the WordPress case, where `theme.json` and SCSS collide by name. |

## Verification

- **Node reads are authoritative.** Render endpoints lag mutations. If a render looks wrong, re-read properties before "fixing" again.
- **Screenshots are for shape, not colour.** Small geometry and low-contrast pairs are unreadable at thumbnail scale — confirm colour from `fills[0]`.
- **Computed-box cross-check — the strongest signal a fix is right.** After setting padding and line-height, the element height should equal the CSS box. Landing on the exact expected height confirms both inputs at once.
- Component-set screenshots exclude page-level scenery. Expected, not a defect.

## Figma Plugin API traps

Each of these costs a debugging cycle the first time.

| Trap | Rule |
|---|---|
| `createFrame()` / `createAutoLayout()` default to **opaque white** | Always `fills = []`. |
| `layoutPositioning = 'ABSOLUTE'` throws without an auto-layout parent | Set it **after** `appendChild`, then `x`/`y`. |
| Auto-layout overrides `x`/`y` | Set `layoutPositioning = 'ABSOLUTE'` first to place freely. |
| `resize()` does **not** scale children | Use `rescale(factor)`. |
| Hug sizing | `counterAxisSizingMode = 'AUTO'` / `primaryAxisSizingMode = 'AUTO'`. `layoutSizingVertical` throws on non-auto-layout parents. |
| A leftover `FILL` collapses heights to 1px | Set `'HUG'` explicitly. |
| `combineAsVariants` does not lay variants out | Re-apply `layoutMode` plus sizing on the set afterwards. |
| `createNodeFromSvg` sizes to **path bounds, not viewBox** | Add a transparent anchor `<rect>` matching the viewBox before resizing. |
| Instance-internal nodes cannot be removed | Mutate the **master**. Guard with `try`/`catch`; skip nodes having an `INSTANCE` ancestor. |
| Editing a variable | **Resolve by name first** and check whether it is a primitive or a semantic alias. Re-aliasing a shared primitive silently corrupts every consumer of it. |
| Font mutation | `getStyledTextSegments(['fontName'])` → `loadFontAsync` each → then mutate. Load the target style before assigning it. |
| Rotated nodes — writing | Rotation moves the bounding box. Position by measuring `absoluteBoundingBox` and iterating, with the correct sign. |
| Rotated nodes — **reading** ⚠️ | **Figma `rotation` is counter-clockwise-positive; CSS `rotate()` is clockwise-positive.** CSS `rotate(90deg)` reads as **−90** in Figma. Comparing the two numerically makes correct nodes look inverted. Judge rotation direction from a screenshot, never from the raw number. |
| **`mainComponent.name` returns the VARIANT, not the set** ⚠️ | The set name is `mainComponent.parent.name`. Matching a set name against `mainComponent.name` finds **zero** instances on pages that all have one — which breaks the "local frame where an instance belongs" check specifically, reporting every properly instanced section as redrawn. |
| Removal versus `visible: false` | An override that **removes** a node leaves no `visible: false` anywhere. Confirm it by walking the subtree and comparing node counts against an un-overridden control instance. The obvious test returns nothing and looks like a failure. |
| Template placeholders (`{{mustache}}` and similar) | A file's own convention for dynamic content. **Not** defects. |
| Localised copy on page mockups | Faithful to the cited live page. Message IDs are usually the source language — never promote a localised literal to a component's canonical label. |

## Before declaring a value ABSENT from the codebase

Absence is a strong claim. Grep **shorthand and longhand and named utilities** — at least three spellings — before making it. A narrow grep that matched only the shorthand property is a classic way to "prove" a value does not exist while a utility class sets its longhand form two files away.

For radius, also check per-corner longhands, `@extend`ed utilities, and variables. For colour, also check scoped variables, CSS custom properties, and base64 data URIs.

**Census hygiene:**

1. **Always exclude vendored trees** — `node_modules/`, `vendor/`. Framework packages ship their own token files whose values look first-party and will make a genuinely unused token appear used, or inflate a usage count several times over.
2. **Watch substring false positives.** A bare number matches inside unrelated hex values and lengths. Anchor the pattern to the property, not the number.
3. **Prefer the token spec over any grep.** A reconciled `tokens.json` / `tokens.md` is authoritative, immune to both errors above, and frequently already records the answer — including which tokens have zero consumers. Cite the spec; use grep only to corroborate it.

## Where the audit record goes

**The repo is the source of truth for documentation. Figma gets a summary only.**

Exhaustive notes inside Figma grow doc frames until they force component frames to be repositioned — at which point the audit record damages the file it documents.

**1. Figma doc note — a short status line, 2–3 sentences, ceiling ~400 characters:**

```
<date> code-audit: <n> defects fixed (<3–5 word themes>). <n> items open.
Full record: <path to the repo audit file>
```

Never paste `file:line` lists or per-defect enumerations into Figma. If a previous note is stale or over-long, **replace** it — never append a contradiction.

**2. Repo audit file — the full detail**, one `## <page name>` section each:

- every defect with its `file:line` and old → new value
- what was verified already correct, which proves it was checked
- deliberate non-changes, with the reason
- unverified values, and what you looked for
- escalations: globals, masters outside your scope, and any source bugs found

⚠️ **One file per agent or batch. Never share one markdown file between concurrent writers.** Read-before-write tooling cannot serialise concurrent appends: a completed file gets destroyed by a `Write` where an append was intended, heredoc appends hit permission guards, and anchored `Edit` fails repeatedly with "file has been modified since read" because peers append faster than a read-edit round trip. Merge into one file at the end, by a single writer, after all writes have stopped.

## Part B — onboard a NEW component

Do this while building the component, not after.

1. **Build it** to the project's conventions first.
2. **Decompose before drawing.** For each visual part, ask whether it is an existing component. If yes, **instance it** — never redraw (prior #1 in the free checks).
3. **Promote anything reused** — see the promotion test below.
4. **Write the brief** from the project's template. Fill every key; use `n/a` rather than deleting a key. Record the commit SHA you verified against.
5. **Create the page** with the variant set plus a doc frame naming the production source.
6. **Declare the heading level** against the project's heading contract.
7. **Declare compliance** where the component carries regulated or commercial content.
8. **Run the project's pre-push gate** (token-name lints, token drift, SEO suite).
9. **Run Part A against your own new page.** This is where transcription errors surface. Do not skip it.

### When to promote a shared component

All three must hold:

1. It appears in **2+ independent consumers** — or 2+ places in one file, which is the strongest case, since it means one author already duplicated it.
2. Its **internal structure is stable** — same parts, same order.
3. It is **not** merely a type step or a spacing value. Those belong in tokens.

**Do not build a component when its variant axis is genuinely undefined in code.** Record the finding instead. Several implementations sharing zero declarations is a reason to leave it unbuilt, not a reason to invent a normal form.

When properties genuinely differ per consumer, model **per-consumer, not normalised** — a single fixed form would make a live consumer wrong.

## Status Reporting

When your work concludes, report exactly one of `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`, as the last non-empty line. Unverified values and recorded-but-unresolved conflicts are `DONE_WITH_CONCERNS`, not `DONE`.
