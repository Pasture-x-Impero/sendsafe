

# Rebrand to SendSafe + Norwegian Language Toggle

## Overview
Rename the app from "DraftGuard" to "SendSafe" across the entire codebase, and add an English/Norwegian language toggle in the header/navbar.

---

## Part 1: Internationalization (i18n) System

Create a lightweight translation system using React Context -- no external libraries needed.

**New files:**
- `src/i18n/translations.ts` -- all English and Norwegian strings in a single dictionary
- `src/i18n/LanguageContext.tsx` -- React context + provider with a `useLanguage()` hook storing the selected language in localStorage

**Translation dictionary will cover all user-facing text across:**
- Navbar links ("How it works", "Why SendSafe", "Pricing", "Get started")
- Hero section (headline, subheadline, CTAs, preview card content)
- How It Works section (steps and descriptions)
- Why SendSafe section (title, reasons, descriptions)
- Pricing section (plan names, features, CTAs)
- Footer (CTA, tagline, copyright)
- Onboarding flow (all 5 steps -- welcome, goal, tone, upload, success)
- Dashboard sidebar labels
- Dashboard pages (Leads, Drafts, Approval Queue, Sent, Settings -- headings, labels, table headers, button text, mock review text)

## Part 2: Language Toggle in Header

- Add a toggle button in `Navbar.tsx` (between the nav links and "Get started" button) showing "EN | NO" with the active language highlighted
- Add a similar toggle in `DashboardLayout.tsx` sidebar (at the bottom)

## Part 3: Rebrand DraftGuard to SendSafe

Replace every occurrence of "DraftGuard" with "SendSafe" in:

| File | Changes |
|------|---------|
| `index.html` | Page title and meta tags |
| `src/components/Navbar.tsx` | Logo text |
| `src/components/DashboardLayout.tsx` | Sidebar logo text |
| `src/components/landing/Hero.tsx` | Preview card label |
| `src/components/landing/WhyDraftGuard.tsx` | Section title, description (also rename file to `WhySendSafe.tsx`) |
| `src/components/landing/Footer.tsx` | Footer text and copyright |
| `src/pages/Onboarding.tsx` | Welcome text, goal question |
| `src/pages/Index.tsx` | Update import if component renamed |
| `src/pages/dashboard/ApprovalPage.tsx` | Email body mentioning DraftGuard |
| `src/pages/dashboard/SettingsPage.tsx` | Page description |
| `src/i18n/translations.ts` | All translation strings use "SendSafe" |

Update project memory/knowledge with the new brand name.

---

## Technical Details

**Translation approach:**
```text
translations = {
  en: {
    "nav.howItWorks": "How it works",
    "nav.why": "Why SendSafe",
    ...
  },
  no: {
    "nav.howItWorks": "Slik fungerer det",
    "nav.why": "Hvorfor SendSafe",
    ...
  }
}
```

**LanguageContext** provides:
- `language` (current: "en" | "no")
- `setLanguage()` (toggle function)
- `t(key)` (translation lookup function)

**Provider** wraps the app in `App.tsx`.

**All components** will import `useLanguage()` and replace hardcoded strings with `t("key")` calls.

**File changes summary:** ~15 files modified, 2 new files created, 1 file renamed.

