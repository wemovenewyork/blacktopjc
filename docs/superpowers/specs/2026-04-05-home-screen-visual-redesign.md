# Blacktop JC — Home Screen Visual Redesign

**Date:** 2026-04-05
**Direction:** Gritty streetball energy — let the court photos breathe, fire the glow system, use format/status color as card identity.

---

## Problem

The home screen feels too plain and generic. The root causes:

1. **Hero scrim at 0.72 opacity** buries the court background photo — the hero reads as flat black with text on it.
2. **Game card photo band scrim at 0.68** makes every card look like the same dark rectangle regardless of which court photo is behind it.
3. **Card borders at rgba(255,255,255,0.08)** are nearly invisible — cards don't read as cards.
4. **The glow/shadow system defined in `src/theme/index.ts`** (`Shadow.sm/md/lg`, `primaryGlow`, `cyanGlow`, etc.) is not used on any card or wrapper.
5. **Color is used only as tint** (`${color}15` backgrounds) — never as a fill or a border at meaningful opacity.

---

## Scope

Three components, no new dependencies, no schema changes:

- `src/screens/home/HomeScreen.tsx` — hero section + court cards in the Courts tab
- `src/components/common/GameCard.tsx` — game cards in the Games tab

---

## Design

### 1. Hero Section (`HomeScreen.tsx`)

| Property | Before | After |
|---|---|---|
| `heroBgScrim` backgroundColor | `rgba(0,0,0,0.72)` | `rgba(0,0,0,0.45)` |
| Stats bar top border color | `rgba(255,255,255,0.12)` | `Colors.borderRed` |
| Stats bar background | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.80)` |

**Add** a second scrim View positioned at the bottom 50% of the hero, with a vertical gradient effect: `backgroundColor` fading from `transparent` at top to `rgba(0,0,0,0.85)` at bottom. This keeps the stats bar readable while letting the top of the photo breathe. Implement as a `pointerEvents="none"` View with `position: absolute, bottom: 0, left: 0, right: 0, height: '60%', backgroundColor: 'rgba(0,0,0,0.55)'`. No new dependency — `expo-linear-gradient` is not in the project.

**Result:** The asphalt/court texture shows through the headline. The stats shelf reads as a scoreboard anchored below the image. The existing red glow on "RUN." now bleeds into a real photo.

---

### 2. GameCard (`GameCard.tsx`)

| Property | Before | After |
|---|---|---|
| `photoBandScrim` backgroundColor | `rgba(0,0,0,0.68)` | `rgba(0,0,0,0.48)` |
| `wrapper` borderColor | `rgba(255,255,255,0.08)` | `${formatColor}` at 0.25 opacity |
| `wrapper` shadow | none | `shadowColor: formatColor, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6` |
| `progressBg` height | 3 | 4 |
| ELO band chip text color | `Colors.textMuted` | `getEloColor(game.host.elo_rating, rated)` |

**Join button ("RUN"):** Change from outline-only to solid fill.
- `backgroundColor`: `formatColor` (solid, not transparent)
- Text color: `#000000` for light format colors (Open/green, 21/gold), `#FFFFFF` for dark (5v5/red, 3v3/blue)
- Keep `borderWidth: 1.5` and `borderColor: formatColor`

**Result:** Each game card has a distinct color identity matching its format. Court photos differentiate cards visually. The join button is unmistakably the primary action.

---

### 3. Court Cards in Home Feed (`HomeScreen.tsx`)

| Property | Before | After |
|---|---|---|
| `courtCard` borderColor | `rgba(255,255,255,0.06)` | `${statusColor}` at 0.20 opacity |
| `courtCard` backgroundColor | `#080808` | `#0C0C0C` |
| `courtGlowBar` elevation | 4 | 8 |
| Status badge backgroundColor | none | `${statusColor}15` |

**Add** `borderRightWidth: 1, borderRightColor: ${statusColor}25` to `courtThumbWrap` — connects the thumbnail edge to the card's color identity.

**Result:** Active ("GAME ON") courts have a green-tinted border and glow bar that makes them immediately scannable. Quiet courts recede. The color does the information hierarchy work.

---

## What Is Not Changing

- No new components, no new dependencies
- No changes to `src/theme/index.ts` — all colors already exist
- No changes to the Courts tab screen (`CourtsScreen.tsx`) in this pass
- No changes to navigation, data fetching, or business logic
- No changes to the onboarding/auth screens

---

## Files Affected

- `src/screens/home/HomeScreen.tsx`
- `src/components/common/GameCard.tsx`
