# Hiretivo — Agent Instructions

This project has two authoritative rule files. Read both before writing any code.

## Required reading

1. **`CLAUDE.md`** — All development rules: stack, TypeScript, components, modules, forms, state, API routes, naming, styling, git. Follow every rule exactly.
2. **`DESIGN.md`** — Visual design system: colors, typography, spacing, buttons, cards, animations. No UI code without reading this first.

## Always-on skills

Load the **ponytail** skill (`skill({ name: "ponytail" })`) at the start of every session. It enforces YAGNI, stdlib-first, minimal code on all coding tasks. Do not add unrequested abstractions, boilerplate, or speculative features.

## Feature / new code

Before building any feature or multi-step task:
1. Load the **brainstorming** skill (`skill({ name: "brainstorming" })`) to explore intent, requirements, and design before implementation.
2. For any multi-step task, load **writing-plans** (`skill({ name: "writing-plans" })`) to produce a plan before touching code.

## Debugging

For any bug investigation, test failure, or unexpected behavior:
1. Load the relevant skill *before* touching code — **systematic-debugging** (`skill({ name: "systematic-debugging" })`) for general bugs, or **investigate** (`skill({ name: "investigate" })`) for gstack root-cause analysis.
2. The **iron law**: no fixes without root cause — patching symptoms without identifying root cause is a second bug, not a fix.
3. Follow the skill's process exactly (investigate → analyze → hypothesize → implement). Do not skip to implementation.

## Non-negotiable

- Follow CLAUDE.md and DESIGN.md as if they are hard constraints, not suggestions.
- **UI rule (always):** before creating ANY UI, read DESIGN.md and apply it — amber `#F59E0B` primaries, no shadows (borders only), Inter only, light mode only, `rounded-lg` inputs / `rounded-xl` cards. Build **clean, neat, reusable** components: reuse existing components first, extract shared markup into components rather than repeating it. Never invent colors or patterns not defined in DESIGN.md.
- When in doubt between two approaches, pick the one consistent with these files.
- Never invent colors, patterns, or abstractions not defined in these files.
