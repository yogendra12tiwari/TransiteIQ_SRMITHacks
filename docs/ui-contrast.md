# TransitIQ — UI Contrast Verification (WCAG 2.1 AA)

| Foreground       | Background    | FG Hex    | BG Hex    | Contrast Ratio | WCAG AA (4.5:1) | WCAG AAA (7.0:1)   | Usage                           |
| ---------------- | ------------- | --------- | --------- | -------------- | --------------- | ------------------ | ------------------------------- |
| `--text`         | `--bg`        | `#111827` | `#FFFFFF` | 16.9:1         | ✅ Pass         | ✅ Pass            | Primary text on page background |
| `--text`         | `--surface`   | `#111827` | `#F5F7FA` | 16.0:1         | ✅ Pass         | ✅ Pass            | Primary text on cards, sheets   |
| `--text-muted`   | `--bg`        | `#4B5563` | `#FFFFFF` | 7.5:1          | ✅ Pass         | ✅ Pass            | Secondary labels, captions      |
| `--text-muted`   | `--surface`   | `#4B5563` | `#F5F7FA` | 7.1:1          | ✅ Pass         | ✅ Pass            | Secondary text on cards         |
| `--primary-text` | `--primary`   | `#FFFFFF` | `#0F5BD8` | 6.02:1         | ✅ Pass         | ❌ (Large text ok) | Primary buttons, active tabs    |
| `--low`          | `--bg`        | `#1B7F3B` | `#FFFFFF` | 5.2:1          | ✅ Pass         | ❌                 | Low risk text / badge text      |
| `--medium`       | `--bg`        | `#B45309` | `#FFFFFF` | 4.7:1          | ✅ Pass         | ❌                 | Medium risk text / badge text   |
| `--high`         | `--bg`        | `#B91C1C` | `#FFFFFF` | 6.3:1          | ✅ Pass         | ❌                 | High risk text / badge text     |
| `--text`         | `--info-bg`   | `#111827` | `#EAF1FE` | 15.2:1         | ✅ Pass         | ✅ Pass            | Informational banners           |
| `--text`         | `--warn-bg`   | `#111827` | `#FFF4E0` | 15.5:1         | ✅ Pass         | ✅ Pass            | Warning banners                 |
| `--text`         | `--danger-bg` | `#111827` | `#FDECEC` | 14.8:1         | ✅ Pass         | ✅ Pass            | Error banners                   |
| `--focus`        | `--bg`        | `#111827` | `#FFFFFF` | 16.9:1         | ✅ Pass         | ✅ Pass            | 3px interactive focus ring      |

### Compliance Notes:

- Target ratio for body text (16px) is **4.5:1**. Every pair meets or exceeds 4.5:1.
- Primary button text has **6.02:1**, well exceeding the 4.5:1 threshold.
- Risk colors (`--low`, `--medium`, `--high`) are **always accompanied by an icon and text label**, ensuring zero reliance on color perception alone.
