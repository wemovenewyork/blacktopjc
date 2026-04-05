# Home Screen Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Blacktop JC home screen feel like a gritty streetball app by letting court photos breathe, wiring up the existing glow system, and using format/status color as card identity.

**Architecture:** Pure style changes across two files — `HomeScreen.tsx` (hero + court cards) and `GameCard.tsx` (game cards). No new components, no new dependencies. All colors already exist in `src/theme/index.ts`.

**Tech Stack:** React Native 0.74, Expo 51, TypeScript. No tests to write — these are visual changes verified by running the app in the simulator.

---

## Files Modified

| File | What changes |
|---|---|
| `src/screens/home/HomeScreen.tsx` | Hero scrim opacity, bottom vignette View, stats bar colors, court card border/background/badge/thumbnail |
| `src/components/common/GameCard.tsx` | Photo band scrim, wrapper border + shadow, progress bar height, join button fill, ELO chip color |

---

## Task 1: Hero — reduce scrim + add bottom vignette + fix stats bar

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

### Context

The hero `ImageBackground` has two children that control how much of the court photo shows through:
1. `heroBgScrim` — a full-cover dark overlay (currently `rgba(0,0,0,0.72)`, way too dark)
2. The stats bar at the bottom has its own `backgroundColor: rgba(0,0,0,0.5)` and a top border at `rgba(255,255,255,0.12)`

We're adding a third overlay (bottom vignette) positioned at the bottom 60% only, so the top of the hero breathes while the stats area stays readable.

- [ ] **Step 1: Reduce the main scrim opacity**

In `HomeScreen.tsx`, find the `heroBgScrim` style (around line 455) and change its `backgroundColor`:

```typescript
heroBgScrim: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.45)', // was 0.72
},
```

- [ ] **Step 2: Add the bottom vignette View to the JSX**

Inside the `<ImageBackground>` block in `HomeScreen.tsx`, after the existing `<View style={styles.heroBgScrim} />` line, add:

```tsx
{/* Bottom vignette — keeps stats bar readable without burying the photo */}
<View style={styles.heroBottomVignette} pointerEvents="none" />
```

- [ ] **Step 3: Add the vignette style**

In the `StyleSheet.create` block, add after `heroBgScrim`:

```typescript
heroBottomVignette: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '60%',
  backgroundColor: 'rgba(0,0,0,0.55)',
},
```

- [ ] **Step 4: Update the stats bar border and background**

Find the `statsBar` style and update:

```typescript
statsBar: {
  flexDirection: 'row',
  borderTopWidth: 1,
  borderTopColor: Colors.borderRed, // was rgba(255,255,255,0.12)
  position: 'relative',
  backgroundColor: 'rgba(0,0,0,0.80)', // was rgba(0,0,0,0.5)
},
```

`Colors.borderRed` is already defined in `src/theme/index.ts` as `'rgba(255,0,51,0.4)'`.

- [ ] **Step 5: Run the app and verify**

```bash
cd /Users/haronwilson/blacktopjc
npx expo start --ios
```

Expected: The court photo background is visible behind "FIND YOUR RUN." The top half of the hero shows asphalt/court texture. The stats bar at the bottom reads clearly against a dark shelf. The red line separating the photo from the stats is visible.

- [ ] **Step 6: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat: hero scrim 0.72→0.45, add bottom vignette, red stats border"
```

---

## Task 2: Court cards in home feed — color-coded borders + badge fills

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

### Context

Court cards in the Courts tab are rendered inside a `FlatList` in `HomeScreen.tsx`. Each card already calls `getCourtStatus(item.id)` which returns `{ color, label }` where `color` is one of `Colors.success` (GAME ON), `Colors.secondary` (checkins present), or `Colors.textMuted` (QUIET).

Currently the card uses a hardcoded `rgba(255,255,255,0.06)` border and `#080808` background regardless of status. We're making active courts visually pop.

- [ ] **Step 1: Make the court card border dynamic**

Find the `<TouchableOpacity style={styles.courtCard}` in the Courts tab `renderItem`. Change to:

```tsx
<TouchableOpacity
  style={[styles.courtCard, { borderColor: `${color}33` }]}
  onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}
  activeOpacity={0.75}
>
```

`33` in hex = 20% opacity. `#00FF8833` on a GAME ON court gives a green border; `#55555533` on a QUIET court is nearly invisible — exactly the hierarchy we want.

- [ ] **Step 2: Update courtCard base background**

In the `StyleSheet.create` block, find `courtCard` and change `backgroundColor`:

```typescript
courtCard: {
  flexDirection: 'row',
  backgroundColor: '#0C0C0C', // was #080808
  borderRadius: 0,
  marginBottom: 6,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.06)', // default — overridden inline above
  overflow: 'hidden',
},
```

- [ ] **Step 3: Increase glow bar elevation**

Find `courtGlowBar` style and change `elevation`:

```typescript
courtGlowBar: {
  width: 4,
  shadowOffset: { width: 2, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 8,
  elevation: 8, // was 4
},
```

- [ ] **Step 4: Add background fill to status badge**

Find the `<View style={[styles.courtBadge, { borderColor: color }]}>` in the court card JSX and add `backgroundColor` to the inline style:

```tsx
<View style={[styles.courtBadge, { borderColor: color, backgroundColor: `${color}15` }]}>
```

- [ ] **Step 5: Add right border to thumbnail connecting it to card color**

Find `<View style={styles.courtThumbWrap}>` and add an inline style:

```tsx
<View style={[styles.courtThumbWrap, { borderRightWidth: 1, borderRightColor: `${color}40` }]}>
```

`40` in hex = 25% opacity.

- [ ] **Step 6: Run the app and verify**

```bash
npx expo start --ios
```

Navigate to the Courts tab. Expected: courts with active games have a visible green border, courts with checkins have a gold border, quiet courts are nearly invisible dark cards. The colored stripe on the left (glow bar) visually connects to the badge on the right.

- [ ] **Step 7: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat: court cards get color-coded borders + badge fills based on status"
```

---

## Task 3: GameCard — photo band scrim + wrapper border + shadow + progress bar

**Files:**
- Modify: `src/components/common/GameCard.tsx`

### Context

`GameCard.tsx` already has `formatColor` derived from `FORMAT_COLORS[game.format]`. The card uses this for the format badge and join button border — we're extending it to the card's own border and shadow, and reducing the photo scrim so court photos differentiate cards.

`FORMAT_COLORS`:
```typescript
const FORMAT_COLORS: Record<string, string> = {
  '5v5': Colors.primary,    // #FF0033 red
  '3v3': '#3B82F6',          // blue
  '21': Colors.secondary,   // #FFB800 gold
  'Open': Colors.success,   // #00FF88 green
};
```

- [ ] **Step 1: Reduce the photo band scrim**

Find `photoBandScrim` in the `StyleSheet.create` block:

```typescript
photoBandScrim: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.48)', // was 0.68
},
```

- [ ] **Step 2: Make wrapper border use formatColor**

The `wrapper` style currently has a hardcoded `borderColor`. We need to move `borderColor` to an inline style on the `<TouchableOpacity>` wrapper.

Find `<TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.wrapper}>` and change to:

```tsx
<TouchableOpacity
  onPress={handlePress}
  activeOpacity={0.9}
  style={[
    styles.wrapper,
    {
      borderColor: `${formatColor}40`,
      shadowColor: formatColor,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    },
  ]}
>
```

`40` in hex = 25% opacity for the border.

- [ ] **Step 3: Remove borderColor from the static wrapper style**

In `StyleSheet.create`, update `wrapper` to remove `borderColor` (it's now set inline):

```typescript
wrapper: {
  backgroundColor: '#070707',
  marginBottom: 8,
  borderWidth: 1,
  overflow: 'hidden',
  position: 'relative',
},
```

- [ ] **Step 4: Increase progress bar height**

Find `progressBg` in `StyleSheet.create`:

```typescript
progressBg: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
```

Also update `progressFill` to match:

```typescript
progressFill: { height: 4, borderRadius: 2 },
```

- [ ] **Step 5: Run the app and verify**

```bash
npx expo start --ios
```

Go to the Games tab. Expected: each game card has a faint colored border matching its format (red for 5v5, blue for 3v3, gold for 21, green for Open). Court photos are visible behind the time block and court name. The progress bar is slightly thicker and its glow is visible.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/GameCard.tsx
git commit -m "feat: game card border+shadow from formatColor, photo scrim 0.68→0.48, progress bar 3→4px"
```

---

## Task 4: GameCard — solid join button + ELO chip color

**Files:**
- Modify: `src/components/common/GameCard.tsx`

### Context

The "RUN" join button is currently outline-only (`backgroundColor: transparent`). We're making it a solid fill — the most tappable element on the card. Text color needs to be chosen per format since some colors (gold, green) are light and need black text.

For ELO color: `getEloColor` is already exported from `src/theme/index.ts`. The `GameCard` receives `game.host` which has `elo_rating` and `games_until_rated`. A player is "rated" when `games_until_rated <= 0`.

- [ ] **Step 1: Add join button text color map**

Near the top of `GameCard.tsx`, after the `FORMAT_COLORS` constant, add:

```typescript
const FORMAT_TEXT_COLORS: Record<string, string> = {
  '5v5': '#FFFFFF',
  '3v3': '#FFFFFF',
  '21': '#000000',
  'Open': '#000000',
};
```

- [ ] **Step 2: Derive join text color**

Inside the `GameCard` component function, after `const formatColor = FORMAT_COLORS[game.format] ?? Colors.primary;`, add:

```typescript
const joinTextColor = FORMAT_TEXT_COLORS[game.format] ?? '#FFFFFF';
```

- [ ] **Step 3: Update join button to solid fill**

Find the `<TouchableOpacity onPress={handleJoin}` block. The current `joinBg` animated value interpolates from `transparent` to `${formatColor}30`. Replace it entirely.

Remove this line:
```typescript
const joinBg = joinFillAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', `${formatColor}30`] });
```

Replace with:
```typescript
const joinBg = joinFillAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [`${formatColor}00`, formatColor],
});
```

This animates from fully transparent to a solid fill when tapped/joined.

- [ ] **Step 4: Update join button text color in JSX**

Find the `<Text style={[styles.joinText, { color: ... }]}>` inside the join button and update:

```tsx
<Text style={[styles.joinText, {
  color: game.my_rsvp === 'in' ? Colors.success : joinTextColor,
}]}>
  {game.my_rsvp === 'in' ? '✓ IN' : 'RUN'}
</Text>
```

- [ ] **Step 5: Import getEloColor in GameCard.tsx**

Find the import from `@/theme` at the top of `GameCard.tsx`:

```typescript
import { Colors, FontSize, Spacing } from '@/theme';
```

Change to:

```typescript
import { Colors, FontSize, Spacing, getEloColor } from '@/theme';
```

- [ ] **Step 6: Wire ELO chip color**

Inside the `GameCard` component, after `const timeInfo = formatGameTime(game.scheduled_at);`, add:

```typescript
const isRated = (game.host?.games_until_rated ?? 3) <= 0;
const eloColor = game.host ? getEloColor(game.host.elo_rating, isRated) : Colors.textMuted;
```

- [ ] **Step 7: Apply ELO color to chip text**

Find `<Text style={styles.eloBandText}>` inside the `eloBandChip` block and update:

```tsx
<Text style={[styles.eloBandText, { color: eloColor }]}>
  {game.elo_band.toUpperCase()}
</Text>
```

- [ ] **Step 8: Run the app and verify**

```bash
npx expo start --ios
```

Expected: The "RUN" button is now a solid fill — red for 5v5, blue for 3v3, gold for 21 (with black text), green for Open (with black text). Tapping it animates from transparent → solid fill. The ELO chip shows the tier's color (grey for Rookie, blue for Starter, green for All-Star, gold for MVP, red for Legend).

- [ ] **Step 9: Commit**

```bash
git add src/components/common/GameCard.tsx
git commit -m "feat: join button solid fill, ELO chip uses tier color"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Hero scrim ✓, bottom vignette ✓, stats bar border/bg ✓, court card border ✓, court card bg ✓, glow bar elevation ✓, badge fill ✓, thumb border ✓, game card photo scrim ✓, wrapper border ✓, wrapper shadow ✓, progress bar height ✓, join button fill ✓, ELO chip color ✓
- [x] **No placeholders** — all code blocks are complete and exact
- [x] **Type consistency** — `formatColor`, `joinTextColor`, `eloColor`, `getEloColor` all consistent across tasks
- [x] **Import** for `getEloColor` added in Task 4 Step 5 before it's used in Step 6
