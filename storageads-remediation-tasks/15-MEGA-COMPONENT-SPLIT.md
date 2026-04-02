# 15 — Split Mega-Components (1,500–2,364 LOC Each)

## Severity: MEDIUM (maintenance nightmare + performance liability)
## Estimated Hours: 8-12

---

## Context

16 facility tab components range from 1,500 to 2,364 lines each. `gbp-full.tsx` alone is 2,364 lines with 50+ `useState` hooks. These are unmaintainable, untestable, and cause unnecessary re-renders.

---

## Step 1: Inventory All Mega-Components

```bash
# Find all files over 500 lines
find src/ -name "*.tsx" -o -name "*.ts" | while read f; do
  LINES=$(wc -l < "$f")
  if [ "$LINES" -gt 500 ]; then
    echo "$LINES $f"
  fi
done | sort -rn
```

Record every file over 500 lines. The audit identified 16 facility tab components — find them all.

---

## Step 2: Prioritize by LOC and Complexity

Split in this order:
1. `gbp-full.tsx` (2,364 LOC, 50+ useState) — highest priority
2. Any other file over 2,000 LOC
3. Files between 1,500-2,000 LOC
4. Files between 1,000-1,500 LOC
5. Files between 500-1,000 LOC (lower priority, do if time permits)

---

## Step 3: Analyze Before Splitting

For each mega-component, before writing any code:

1. **Count hooks:** `grep -c "useState\|useEffect\|useMemo\|useCallback\|useRef" [FILE]`
2. **Identify logical sections:** Read through and identify natural groupings (e.g., "form section", "chart section", "table section", "modal section")
3. **Identify shared state:** Which `useState` values are used by multiple sections? These stay in the parent.
4. **Identify isolated state:** Which `useState` values are only used by one section? These move to the child.

---

## Step 4: Splitting Strategy

### Rule 1: Extract by Feature, Not by UI Element

**Wrong:** `<Header />`, `<Body />`, `<Footer />`
**Right:** `<GBPListingOverview />`, `<GBPReviewsSection />`, `<GBPPostsManager />`, `<GBPInsightsChart />`

### Rule 2: Move Isolated State Down

If a `useState` is only used within one section, move it into that section's component:

```typescript
// Before: 50 useState in parent
const [showReviewModal, setShowReviewModal] = useState(false);
const [selectedReview, setSelectedReview] = useState(null);
// ... only used in the reviews section

// After: State lives in GBPReviewsSection
function GBPReviewsSection({ facilityId }: { facilityId: string }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  // ...
}
```

### Rule 3: Use Custom Hooks for Shared Logic

If multiple sections need the same data or logic, extract it into a custom hook:

```typescript
// src/hooks/use-gbp-data.ts
export function useGBPData(facilityId: string) {
  const [listing, setListing] = useState<GBPListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch logic
  }, [facilityId]);

  return { listing, loading, error, refetch };
}
```

### Rule 4: Pass Only What's Needed via Props

Don't pass the entire parent state object. Pass specific values and callbacks:

```typescript
// Wrong
<GBPReviewsSection parentState={state} />

// Right
<GBPReviewsSection
  facilityId={facilityId}
  onReviewReply={handleReviewReply}
/>
```

---

## Step 5: Split `gbp-full.tsx` (Detailed Guide)

This is the primary target. Here's the expected structure after splitting:

```
src/components/facility/gbp/
├── GBPTab.tsx              // Parent (~100-200 lines, orchestrates sections)
├── GBPListingOverview.tsx  // Listing info, hours, attributes
├── GBPReviewsSection.tsx   // Reviews list, reply, analytics
├── GBPPostsManager.tsx     // Post creation, scheduling, history
├── GBPInsightsChart.tsx    // Performance metrics, charts
├── GBPPhotosSection.tsx    // Photo management
├── GBPQASection.tsx        // Questions & answers
├── hooks/
│   ├── use-gbp-listing.ts  // Data fetching for listing
│   ├── use-gbp-reviews.ts  // Data fetching for reviews
│   └── use-gbp-posts.ts    // Data fetching for posts
└── types.ts                // Shared types for GBP components
```

The parent `GBPTab.tsx` should look like:

```typescript
export function GBPTab({ facilityId }: { facilityId: string }) {
  const { listing, loading } = useGBPListing(facilityId);

  if (loading) return <TabSkeleton />;

  return (
    <div className="space-y-6">
      <GBPListingOverview listing={listing} />
      <GBPReviewsSection facilityId={facilityId} />
      <GBPPostsManager facilityId={facilityId} />
      <GBPInsightsChart facilityId={facilityId} />
      <GBPPhotosSection facilityId={facilityId} />
      <GBPQASection facilityId={facilityId} />
    </div>
  );
}
```

---

## Step 6: Apply Same Pattern to All Other Mega-Components

For each remaining mega-component:

1. Create a subdirectory under the component's current location
2. Identify 3-6 logical sections
3. Extract each section into its own file
4. Extract shared data fetching into custom hooks
5. Keep the parent under 200 lines
6. Keep each child under 400 lines

---

## Step 7: Update Imports

After splitting, update all imports throughout the codebase:

```bash
# Find all files that import the old mega-component
grep -rn "from.*gbp-full\|import.*GBPFull" src/ --include="*.ts" --include="*.tsx"
```

Update to import from the new parent component.

---

## Step 8: Verify Lazy Loading Still Works

The audit noted that all 16 facility tabs use `React.lazy()`. After splitting, verify the lazy import still works:

```bash
grep -rn "React.lazy\|lazy(" src/ --include="*.tsx" | grep -i "gbp\|facility"
```

The lazy import should point to the new parent component, not the old file.

---

## Verification

```bash
# 1. No files over 500 lines in facility tab components
find src/components/facility -name "*.tsx" | while read f; do
  LINES=$(wc -l < "$f")
  if [ "$LINES" -gt 500 ]; then
    echo "STILL TOO LARGE: $LINES $f"
  fi
done
# Expected: No output

# 2. gbp-full.tsx no longer exists (or is under 200 lines)
if [ -f src/components/facility/gbp-full.tsx ]; then
  LINES=$(wc -l < src/components/facility/gbp-full.tsx)
  echo "gbp-full.tsx: $LINES lines"
fi
# Expected: Either doesn't exist or < 200 lines

# 3. No component has 50+ useState hooks
find src/ -name "*.tsx" | while read f; do
  COUNT=$(grep -c "useState" "$f")
  if [ "$COUNT" -gt 15 ]; then
    echo "TOO MANY HOOKS ($COUNT): $f"
  fi
done
# Expected: No output

# 4. Build passes
npm run build 2>&1 | tail -5
# Expected: No errors

# 5. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
# Expected: No errors
```

---

## Commit

```
fix: 15 split 16 mega-components into focused subcomponents

Break gbp-full.tsx (2,364 LOC, 50+ useState) and 15 other mega-
components into focused subcomponents under 400 LOC each. Extract
shared state into custom hooks. Parent components orchestrate
sections without owning all state.
```
