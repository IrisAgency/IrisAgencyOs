# Component Color Audit & Modifiability Report

This document outlines the color sources for key components in the IRIS Agency OS and their modifiability status via the Admin Branding Panel.

## Legend
*   ✅ **Yes**: Fully customizable via the Admin Panel (uses CSS variables).
*   ⚠️ **Partial**: Partially customizable (mix of variables and hardcoded values).
*   ❌ **No**: Hardcoded values (requires code changes to modify).

## Component Audit Table

| Component / Widget | Color Source | Hover Behavior | Modifiable? | Implementation Details |
| :--- | :--- | :--- | :--- | :--- |
| **Sidebar (Background)** | `var(--sidebar-bg)` | N/A | ✅ Yes | Controlled by "Sidebar Color" setting. |
| **Sidebar (Active Item)** | `var(--brand-primary)` | N/A | ✅ Yes | Controlled by "Primary Color" setting. |
| **Sidebar (Inactive Item)** | `text-slate-400` | `hover:text-white` `hover:bg-white/5` | ❌ No | Hardcoded white text and semi-transparent white background on hover. |
| **Sidebar (Logo)** | `var(--brand-primary)` | N/A | ✅ Yes | Falls back to primary color if no image is uploaded. |
| **Header (Background)** | `bg-white` | N/A | ❌ No | Hardcoded to white (`#ffffff`). |
| **Header (Search Input)** | `var(--brand-primary)` | `focus:ring-iris-red` | ✅ Yes | Focus ring uses primary color. |
| **Header (Notification Dot)** | `var(--brand-primary)` | N/A | ✅ Yes | Uses `bg-iris-red` (mapped to primary). |
| **Header (Bell Icon)** | `text-slate-500` | `hover:text-slate-700` | ❌ No | Hardcoded slate color darken on hover. |
| **AI Assistant Button** | `var(--brand-primary)` + `rose-600` | `hover:shadow-lg` `hover:shadow-iris-red/30` | ⚠️ Partial | Gradient from Primary Color to hardcoded Rose-600. Shadow uses primary color. |
| **Primary Buttons** | `var(--brand-primary)` | `hover:bg-iris-red/90` | ✅ Yes | Uses opacity change on hover (90% of primary color). |
| **Secondary Buttons** | `border-slate-300` | `hover:bg-slate-50` | ❌ No | Hardcoded slate border and background on hover. |
| **Data Tables (Background)** | `bg-white` | N/A | ❌ No | Hardcoded to white. |
| **Data Tables (Headers)** | `bg-slate-50` | N/A | ❌ No | Hardcoded to Slate-50. |
| **Data Tables (Rows)** | `bg-white` | `hover:bg-slate-50` | ❌ No | Hardcoded slate-50 background on hover. |
| **KPI / Stat Cards** | `bg-white` | `hover:shadow-md` | ❌ No | Hardcoded to white with Slate borders. Shadow increases on hover. |
| **Text (Headings)** | `text-slate-900` | N/A | ❌ No | Hardcoded to Slate-900. |
| **Text (Body)** | `text-slate-500` | N/A | ❌ No | Hardcoded to Slate-500. |
| **Trend Icons (Up/Down)** | `emerald-500` / `rose-500` | N/A | ❌ No | Hardcoded semantic colors for positive/negative trends. |
| **Login Page (Background)** | `bg-slate-50` | N/A | ❌ No | Hardcoded (unless a background image is added). |
| **Login Page (Button)** | `bg-slate-900` | `hover:bg-slate-800` | ❌ No | Hardcoded slate-900 (Note: Login button is NOT using primary brand color currently). |
| **Login Page (Inputs)** | `bg-slate-50` | `focus:ring-indigo-500` | ❌ No | Hardcoded indigo focus ring (should be primary). |
| **Upload Area** | `border-slate-300` | `hover:border-iris-red` `hover:bg-iris-red/5` | ✅ Yes | Uses primary color for border and background tint on hover. |

## Technical Note on Modifiability

The application uses a hybrid approach:

1.  **Brand Variables**: Key identity elements (Sidebar, Primary Actions, Accents) use CSS variables defined in `config/branding.config.ts` and mapped in `tailwind.config.js`. These update instantly when changed in the Admin Panel.
    *   `--brand-primary`
    *   `--brand-secondary`
    *   `--brand-sidebar`
    *   `--brand-bg` (Currently mapped but not widely used in components)

2.  **Utility Classes**: Structural elements (Cards, Tables, Backgrounds) use standard Tailwind utility classes (e.g., `bg-white`, `text-slate-500`). These are **not** currently hooked into the branding system.

### How to Make More Components Modifiable
To make components like "KPI Cards" or "Tables" modifiable, their hardcoded classes (e.g., `bg-white`) would need to be replaced with semantic classes (e.g., `bg-iris-bg`) that map to the branding variables.
