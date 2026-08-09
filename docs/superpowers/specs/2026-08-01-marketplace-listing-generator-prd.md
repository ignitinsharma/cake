# PRD: Marketplace Listing Generator

**Working name:** Cake
**Date:** 2026-08-01
**Status:** Approved v1

## 1. Problem Statement

Sellers on Indian marketplaces (Myntra, Flipkart, Amazon India, Meesho, Snapdeal, Nykaa) must download each platform's blank upload template (Excel/CSV with 50-150 columns), manually fill product data, map their own data into platform-specific schemas, and re-upload. Listing the same product on 3 platforms means entering the same data 3 times in 3 different formats. Manual mapping produces upload rejections, wasted hours, and delayed listings.

## 2. Goals & Non-Goals

### Goals
- Enter product data **once** (form or own-CSV import) → generate ready-to-upload files for 5-6 platforms
- Prompt users only for fields mandatory for the chosen platform + category; auto-fill everything else (defaults, computed values, category attributes)
- Produce platform-compliant files (correct columns, order, format) that pass upload validation

### Non-Goals (v1)
- Image hosting/storage (users fill image URLs in the platform portal after download)
- Inventory/price sync after listing (post-v1)
- Order management, payments, analytics dashboards
- Mobile apps
- Agency/multi-client features

## 3. Target Users & Personas

| Persona | Behavior | Needs |
|---|---|---|
| Solo seller | 1-20 products/mo, non-technical, hates Excel | Simple form, instant file, zero jargon |
| D2C brand owner | 50-1000 SKUs, has catalog in Shopify/Spreadsheet | Bulk import, one-shot multi-platform generation |
| Agency/catalog manager (future) | Multi-client, thousands of SKUs | Bulk ops, per-client templates (post-v1) |

v1 serves solo + brand via the same architecture (form + import both feed the standard model).

## 4. Core Concepts

1. **Standard Product Model** — neutral schema holding everything to list a product: identity (title, description, brand, category), pricing (MRP, selling price), variants (SKU, size, color, stock, weight, dimensions), compliance (HSN, GST rate), extras (material, care instructions).
2. **Platform Templates (data files)** — each platform's upload schema declared as data: per column → name, type, required/optional, per-category rules, default value, source (standard field or computed formula).
3. **Platform Adapters (thin code)** — per-platform rendering: column order, value formatting, category-ID lookup, special validations (e.g., Myntra brand codes).
4. **Category Mapping** — our category taxonomy + mapping table (our category → platform category ID/path) per platform.
5. **Generator Engine** — takes (product, platform, category) → validates → renders one row per variant → outputs CSV/XLSX with exact platform column order.

## 5. End-to-End User Workflow

```
Sign up (collects company details: business name, GSTIN, brand)
→ Dashboard (my products)
→ New product: pick platform → pick category (Clothes > Men's/Women's Wear > T-shirts)
→ Dynamic form: only mandatory fields for that platform+category combo
→ Review/edit product
→ Generate: pick platform → system flags missing mandatory fields for that platform → download CSV/XLSX
→ History of generated files
```

**Form-only flow (decided):** no blank-template download, no upload-back. The form is the product — users never touch Excel.

**Key rule:** the form is per-platform, the data is not. Generating to a second platform only asks for fields that platform additionally requires.

## 6. What We Ask the User (India-specific)

Principle: **ask the minimum, auto-fill the rest.** Seller-level data is asked once (profile), never per product.

### Asked once (Seller Profile)
- Business name, GSTIN, seller ID/code per platform
- Return address, warehouse PIN code
- Brand name(s) they sell

### Asked per product (form)
| Field | Why | Notes |
|---|---|---|
| Product title | mandatory everywhere | |
| Description | mandatory (Myntra/Flipkart) | |
| Brand | mandatory (Myntra brand codes!) | Myntra requires approved brand; we validate against brand list |
| Category | drives template + auto-fills | user picks from our tree; we map per platform |
| MRP (INR) | mandatory (max retail price) | |
| Selling price (INR) | mandatory | |
| Variants: size, color, SKU, stock | variant rows | |
| Weight (g) + dimensions | shipping/courier fields | |
| HSN code | GST compliance | auto-suggested from category, user confirms |
| Material, care instructions | apparel category attributes | optional but commonly mandatory on Myntra |

### Never asked (auto-filled)
- Platform category IDs, attribute codes, size chart codes
- HSN/GST defaults (from category)
- Column ordering, file format, header names
- Defaults like currency (INR), country (India), tax codes

## 7. Features by Phase

### Phase 1 — Core loop (MVP)
- Auth: email/password (NextAuth), user-scoped data
- Signup collects company details: business name, GSTIN, brand (platform seller IDs deferred to profile settings)
- DB schema: users, products, variants, categories, category-platform mappings
- Standard product model + dynamic form editor
- **3 platforms fully done: Flipkart, Myntra, Amazon** (proves the loop)
- Generator engine: validation + CSV & XLSX output
- Product list dashboard + generation history
- Missing-mandatory-field warnings before download

### Phase 2 — Import + breadth
- CSV import wizard: upload → header auto-guess (fuzzy match) → mapping confirmation UI → preview → load
- 5 more platforms (Meesho, Snapdeal, Nykaa, Ajio, FirstCry) shallow-but-valid
- Category mapping expanded to top ~50 categories

### Phase 3 — Hardening
- Full per-platform validation (enums, formats, SKU uniqueness, URL format)
- Template versioning (audit which template version generated each file)
- Batch generation (select N products → files)

### Phase 4 — Post-v1 (separate PRD later)
- Image hosting/CDN, relisting, price/inventory sync, agency mode

## 8. Technical Architecture

```
Next.js (App Router, TypeScript, Vercel)
├── /app            — auth, dashboard, product editor, import wizard, history
├── /lib/engine     — generator: validate → render → serialize (CSV/XLSX via xlsx)
├── /lib/adapters   — per-platform adapters (myntra.ts, flipkart.ts, ...)
├── /data/templates — platform template JSON (columns, rules, defaults, sources)
├── /data/taxonomy  — category tree + platform mappings
└── DB: Postgres (Prisma) — users, products, variants, mappings, generations
```

- CSV parsing: `papaparse`; XLSX read/write: `xlsx` (SheetJS)
- Import auto-mapping: fuzzy header match against standard field aliases
- Platform-specific logic lives in data (templates JSON) + thin adapters; engine stays generic

## 9. Data Model (sketch)

- `User` — id, email, passwordHash
- `SellerProfile` — userId, businessName, gstin, brandName, returnAddress, warehousePin
- `Product` — id, userId, title, description, brand, categoryId, hsn, gstRate, attributes JSON
- `Variant` — id, productId, sku, size, color, mrp, price, stock, weightGrams, dimensions JSON
- `Category` — id, name, parentId, isLeaf, defaultHsn, defaultGstRate
- `CategoryPlatformMapping` — categoryId, platform, platformCategoryId, platformCategoryPath
- `PlatformTemplate` — id, platform, version, schema JSON
- `Generation` — id, userId, productId, platform, templateVersion, fileName, createdAt

## 10. Error Handling & Testing

- **Errors:** per-field validation with user-facing messages before generation; import mapping preview catches wrong maps before load; template version pinned per generation
- **Testing:** generator unit tests (standard product → exact CSV row assertion); template schema tests (every mandatory column has source or default); adapter tests per platform; one self-check per platform rendering a sample product to a valid file

## 11. Success Metrics

- Entry → valid file time (target < 5 min per product)
- Upload acceptance rate on first attempt
- Activation: products created per new user; generations per user/week
- Files generated per platform

## 12. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Platform templates change → stale files | Template versioning; data-only updates |
| Category IDs & brand codes drift | Mapping table as data, monthly review |
| Messy imported CSVs | Mapping preview, aliases, sample rows |
| Shallow templates → rejections | Phase 2 templates validated against real platform rules |
| Myntra requires approved brand codes; new sellers may lack them | Validate + warn clearly, allow custom brand entry with note |

### Open questions
1. Real template schemas to be researched from public seller docs (Myntra seller portal, Flipkart Seller Hub, Amazon Seller Central) during Phase 1 — authenticated-portal-only docs are out of reach; public template files are findable. Templates are structured as data so they can be deepened/updated without code changes.
