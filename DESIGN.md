# Design System — Cake

## 1. Visual Theme & Atmosphere

Cake is a marketplace listing generator (India) with a clean, professional aesthetic anchored by a vibrant amber primary color (`#F59E0B`) on a pure white canvas. Inter serves as the body font with tight letter-spacing on headings, creating a crisp, modern voice.

**Key Characteristics:**

- Inter at weight 700–800 for headings — bold, tight letter-spacing
- Amber (`#F59E0B`) primary buttons with white text — vibrant, confident
- Darker amber (`#D97706`) for hover states
- Inter body at weight 400–500 — readable, neutral
- Near-black (`#0a0a0a`) primary text, gray (`#6b7280`) body text
- Subtle grid background pattern on hero sections
- No shadows — depth from borders only
- Light mode only — no dark mode

## 2. Color Palette & Roles

### Primary (Amber)

- **Primary Amber** (`#F59E0B`): Primary CTA buttons, focus rings, active states
- **Primary Dark** (`#D97706`): Hover state for primary buttons
- **White** (`#ffffff`): Background, button text on amber
- **Light Gray** (`#f9fafb`): Subtle background sections, surfaces
- **Border Gray** (`#e5e7eb`): All borders, dividers, secondary buttons

### Text Colors

- **Foreground** (`#0a0a0a`): Headings, primary text, labels
- **Foreground Muted** (`#6b7280`): Body text, descriptions, subtitles
- **Foreground Secondary** (`#9ca3af`): Tertiary text, placeholders, captions

### Semantic

- **Success** (`#16a34a`): Success states, positive indicators
- **Danger** (`#ef4444`): Error, destructive actions
- **Warning** (`#f59e0b`): Warnings

### Surfaces

- **Background** (`#ffffff`): Page background, card backgrounds
- **Surface** (`#f9fafb`): Light background sections, hover states
- **Surface Hover** (`#f3f4f6`): Hover state for surfaces
- **Grid Line** (`rgba(0,0,0,0.04)`): Hero grid pattern lines

### Removed Colors

- All monochrome/black primary colors replaced with amber (`#F59E0B`)
- All dark mode colors removed
- Primary accent is now amber — consistent across all components

## 3. Typography Rules

### Font Families

- **Headings**: `Inter`, weight 600–700
- **Body / UI**: `Inter`, weight 400–500, fallbacks: `sans-serif`

### Hierarchy

| Role            | Font     | Size              | Weight | Line Height | Letter Spacing | Usage |
| --------------- | -------- | ----------------- | ------ | ----------- | -------------- | ----- |
| Display         | Inter    | 3.5rem (56px)     | 700    | 1.2         | -0.02em        | Hero headings |
| H1              | Inter    | 2.5rem (40px)     | 700    | 1.35        | -0.015em       | Page headings |
| H2              | Inter    | 2rem (32px)       | 700    | 1.35        | -0.01em        | Section headings |
| H3              | Inter    | 1.5rem (24px)     | 600    | 1.4         | -0.005em       | Card titles |
| H4              | Inter    | 1.25rem (20px)    | 600    | 1.5         | 0              | Subsection titles |
| Body-lg         | Inter    | 1.125rem (18px)   | 400    | 1.7         | 0              | Lead paragraphs |
| Body            | Inter    | 1rem (16px)       | 400    | 1.7         | 0              | Default body text |
| Body-sm         | Inter    | 0.875rem (14px)   | 400    | 1.6         | 0              | Small text, captions |
| Label           | Inter    | 0.75rem (12px)    | 500    | 1.5         | 0.05em         | Badges, labels |

### Principles

- **Weight 600–700 for headings**: Inter SemiBold/Bold for display headings — authoritative.
- **Tight letter-spacing**: Negative letter-spacing on headings creates dense, impactful text.
- **Weight 400–500 for body**: Inter Regular/Medium for readable, neutral body text.

## 4. Component Stylings

### Buttons

**Primary Amber**

- Background: `#F59E0B` (Primary Amber)
- Text: `#ffffff` (White), weight 500, size 0.875rem
- Padding: 0.625rem 1.25rem (10px 20px)
- Radius: 0.5rem (8px)
- Border: None
- Hover: Background `#D97706`
- Active: Background `#B45309`
- Focus: Ring with amber color
- No shadow, no gradient

**Secondary Outlined**

- Background: `#ffffff` (White)
- Text: `#374151` (Gray-700), weight 500, size 0.875rem
- Padding: 0.625rem 1.25rem (10px 20px)
- Radius: 0.5rem (8px)
- Border: 1px solid `#e5e7eb`
- Hover: Background `#f9fafb`
- Active: Background `#f3f4f6`
- No shadow

**Button Sizes**

| Size | Padding | Font Size | Use Case |
|------|---------|-----------|----------|
| sm | 0.375rem 0.75rem | 0.75rem | Small actions |
| md (default) | 0.625rem 1.25rem | 0.875rem | Standard buttons |
| lg | 0.75rem 1.5rem | 1rem | Prominent CTAs |

### Input Fields

- Border-radius: 0.5rem (`rounded-lg`)
- Default border: `1px solid #e5e7eb`
- Focus: `ring-2 ring-[#F59E0B]/20 border-[#F59E0B]`
- Height: 2.5rem (h-10)
- Background: White
- No shadow

### Cards & Containers

- Radius: 0.75rem (12px, `rounded-xl`)
- Border: `1px solid #e5e7eb`
- Background: White
- Padding: 1.5rem (24px)
- No shadow — depth from border only
- Hover: Border color `#d1d5db`

### Feature Pills/Badges

- Background: `#f9fafb`
- Border: `1px solid #e5e7eb`
- Radius: 9999px (full)
- Padding: 0.375rem 0.875rem
- Font: 0.875rem, weight 500
- Icon: Small icon left of text

### Modals/Dialogs

- Border-radius: 0.75rem (`rounded-xl`)
- Border: `1px solid #e5e7eb`
- Overlay: `bg-black/50`
- No shadow

### Navigation

- Background: White, sticky
- Border-bottom: `1px solid #e5e7eb`
- Links: Weight 500, muted foreground, hover foreground (black)
- Active: Foreground (black)
- CTA in nav: Primary button style (amber fill)

### Grid Background Pattern

- Subtle grid lines behind hero sections
- Line color: `rgba(0,0,0,0.04)`
- Grid cell size: 64px × 64px
- Implemented via CSS `background-image` with linear-gradient

## 5. Layout Principles

### Spacing System

- Base unit: 4px (Tailwind default)
- Use standard Tailwind spacing scale

### Border Radius Scale

- Buttons/Inputs: 0.5rem (8px, `rounded-lg`)
- Cards: 0.75rem (12px, `rounded-xl`)
- Pills/Badges: 9999px (full, `rounded-full`)
- Avatars/Icons: 50% (circle)

## 6. Depth & Elevation

| Level           | Treatment                | Use |
| --------------- | ------------------------ | --- |
| Flat (Level 0)  | No shadow                | Default |
| Border (Level 1)| `1px solid #e5e7eb`      | Cards, inputs, sections |

**Shadow Philosophy**: No shadows. Depth comes from borders and whitespace only.

## 7. Do's and Don'ts

### Do

- Use Inter weight 600–700 for headings
- Apply tight letter-spacing on headings (`-0.02em` to `-0.01em`)
- Use Primary Amber (`#F59E0B`) for primary CTAs with white text
- Use subtle borders (`#e5e7eb`) for depth
- Apply grid background pattern on hero sections
- Use Inter weight 400–500 for body text
- Use amber for input focus rings
- Keep all UI consistent with the amber primary accent

### Don't

- Don't use black for primary buttons/accents
- Don't use shadows — borders only
- Don't use dark mode
- Don't use arbitrary amber shades — use the defined `#F59E0B` / `#D97706`
- Don't use `rounded-full` on inputs/cards — use `rounded-lg` or `rounded-xl`
- Don't use heavy font weights (800+) — 700 is max for Inter
- Don't use ultra-tight line-height (0.85) — use 1.1+

## 8. Responsive Behavior

### Breakpoints

| Name    | Width      | Key Changes   |
| ------- | ---------- | ------------- |
| Mobile  | <576px     | Single column |
| Tablet  | 576–992px  | 2-column      |
| Desktop | 992–1440px | Full layout   |
| Large   | >1440px    | Expanded      |

## 9. Tailwind Implementation Reference

> Copy-paste ready. Use these exact class strings — do not invent alternatives.

### Colors (Tailwind arbitrary values)

```
Near Black text:           text-[#0a0a0a]
Amber primary:             bg-[#F59E0B]
Amber dark:                bg-[#D97706]
White bg:                   bg-white
Muted text:                 text-[#6b7280]
Secondary text:             text-[#9ca3af]
Border:                     border-[#e5e7eb]
Surface bg:                 bg-[#f9fafb]
Surface hover:              bg-[#f3f4f6]
```

### OR use brand tokens (preferred)

```
Foreground:                text-brand-foreground
Foreground muted:          text-brand-foreground-muted
Primary bg:                bg-brand-primary
Primary foreground:        text-brand-primary-foreground
Border:                    border-brand-border
Surface:                   bg-brand-surface
Success:                   text-brand-success
Danger:                    text-brand-danger
```

### Typography classes

```
Display:
font-bold text-5xl md:text-6xl lg:text-7xl leading-tight tracking-tight

H1:
font-bold text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight

H2:
font-bold text-2xl md:text-3xl leading-snug tracking-tight

H3:
font-semibold text-xl leading-snug tracking-tight

Body:
font-normal text-base leading-relaxed

Body muted:
font-normal text-base text-muted-foreground leading-relaxed

Label:
font-medium text-xs uppercase tracking-wider
```

### Component patterns

```tsx
// Primary CTA button
<button className="bg-[#F59E0B] text-white font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-[#D97706] transition-colors">

// Secondary button
<button className="bg-white text-gray-700 font-medium text-sm px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">

// Standard card
<div className="rounded-xl border border-gray-200 bg-white p-6">

// Feature pill
<span className="bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 text-sm font-medium">

// Input field
<input className="rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]">

// Badge / tag
<span className="bg-gray-100 text-gray-700 font-medium text-sm px-3 py-1 rounded-full">

// Modal / Dialog
<DialogContent className="rounded-xl border border-gray-200">

// Nav hover item
<div className="hover:bg-gray-50 rounded-lg transition-colors">

// Grid background (CSS)
background-image: linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
background-size: 64px 64px;
```

### Rules for AI agents

1. NEVER use indigo/amber arbitrary colors — use the defined primary amber (`#F59E0B`) consistently
2. NEVER use shadows — borders only
3. NEVER use dark mode
4. NEVER use `rounded-full` on inputs/cards — use `rounded-lg` or `rounded-xl`
5. NEVER use font-extrabold (800) — max font-bold (700) for Inter
6. ALWAYS use amber (`#F59E0B`) for primary buttons
7. ALWAYS use outlined style for secondary buttons
8. ALWAYS use subtle borders (`#e5e7eb`) for cards and inputs
9. ALWAYS apply grid background on hero sections
10. ALWAYS use Inter font — no other fonts

---

## 10. Agent Prompt Guide

### Quick Color Reference

- Primary button: Amber (`#F59E0B`) with white text
- Primary hover: Dark amber (`#D97706`)
- Text: Near Black (`#0a0a0a`)
- Background: White (`#ffffff`)
- Secondary button: White with gray border
- Body text: Gray (`#6b7280`)
- Borders: Light gray (`#e5e7eb`)
- Surface: Light gray (`#f9fafb`)

### Example Component Prompts

- "Create hero: white background with subtle grid pattern. Headline at 56px Inter weight 700, tight letter-spacing, #0a0a0a text. Amber pill CTA (#F59E0B, rounded-lg, white text). Secondary outlined button with gray border."
- "Build a card: rounded-xl, 1px solid #e5e7eb, white background. Title at 24px Inter weight 600, body at 16px weight 400, gray text."

### Iteration Guide

1. Inter 600–700 for headings with tight letter-spacing
2. Amber (#F59E0B) for primary buttons — white text
3. Outlined secondary buttons with gray borders
4. No shadows — borders only for depth
5. Grid background pattern on hero sections
6. Amber primary accent — consistent across all components
7. Light mode only — no dark mode
