# Web Subsystem

Purpose: Build the mobile-first React PWA for workout logging, exercise discovery, progress charts, and offline-tolerant interaction.

Return to the root instructions before changing shared contracts: [../CLAUDE.md](../CLAUDE.md).

## Key Files
| What | Where |
|------|-------|
| Current scaffold entry | `../src/main.ts` |
| Planned React entry | `../src/main.tsx` |
| Planned app shell | `../src/App.tsx` |
| Planned styles | `../src/index.css`, `../src/style.css` during scaffold transition |
| Planned routes | `../src/pages/` |
| Planned components | `../src/components/` |
| Planned hooks | `../src/hooks/` |
| Planned state stores | `../src/stores/` |
| Planned app libraries | `../src/lib/` |
| Static/PWA assets | `../public/` |
| Deployment guide | `../DEPLOYMENT.md` |

## Allowed Patterns
### Keep set logging instant
Use plain state for the log path and avoid animation wrappers around weight, reps, and save controls.

```tsx
function SetLogger({ onSave }: { onSave: (set: DraftSet) => Promise<void> }) {
  const [weightLb, setWeightLb] = useState('135')
  const [reps, setReps] = useState(8)

  return (
    <form onSubmit={(event) => {
      event.preventDefault()
      void onSave({ weight_lb: Number(weightLb), reps })
    }}>
      <input inputMode="decimal" value={weightLb} onChange={(event) => setWeightLb(event.target.value)} />
      <button type="button" onClick={() => setReps((value) => Math.max(1, value - 1))}>-</button>
      <output>{reps}</output>
      <button type="button" onClick={() => setReps((value) => value + 1)}>+</button>
      <button type="submit">Save set</button>
    </form>
  )
}
```

### Put math in libraries
Keep charts and cards presentational. Put PR, volume, and streak rules in `src/lib/`.

```ts
export function volumeForSet(set: { weight_lb: number; reps: number }) {
  return set.weight_lb * set.reps
}
```

### Use typed route params
Validate route params before querying Supabase or Dexie.

```tsx
const { slug } = useParams()
if (!slug) return <Navigate to="/exercises" replace />
```

### Design for iPhone Safari first
Use fixed bottom navigation, safe-area padding, and minimum 56px touch targets on the log path.

```css
.bottom-nav {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.log-button {
  min-height: 56px;
}
```

## Forbidden Patterns
### Do not animate the log path
Animations are reserved for delight moments, not repeated input.

```tsx
// Forbidden
<motion.button whileTap={{ scale: 0.9 }} onClick={saveSet}>
  Save set
</motion.button>
```

### Do not put Supabase calls directly in page components
Use hooks or `src/lib/` wrappers so offline behavior and cache invalidation stay consistent.

```tsx
// Forbidden
function SessionPage() {
  const save = () => supabase.from('sets').insert({ weight_lb: 135, reps: 8 })
  return <button onClick={save}>Save</button>
}
```

### Do not make exercise images mandatory
Unmatched catalog items must render clean text cards.

```tsx
// Forbidden
if (!exercise.image_url) throw new Error('Missing exercise image')
```

### Do not hardcode desktop-first dimensions
The app is installable from iPhone Safari and must not assume pointer hover or wide viewports.

```tsx
// Forbidden
<main className="mx-auto w-[1200px] grid grid-cols-4">
```

## What NOT to Do
- Do not change package configuration from this subsystem doc. Coordinate package changes through the root workflow.
- Do not add auth UI unless the database plan changes from single-user to multi-user with RLS.
- Do not store raw Supabase errors directly in user-facing toasts. Map them to actionable messages.
- Do not let chart or card animation delay set saving, rest timer starts, or navigation out of an active session.
- Do not use external image URLs directly for long-term exercise images. Upload durable copies to Supabase Storage.
