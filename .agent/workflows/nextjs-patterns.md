---
description: Next.js App Router patterns and guidelines for miranext-shift-pilot
---

# Next.js App Router Patterns

Reference document for Next.js architecture patterns.

---

## Route Groups

Use parenthesized route groups for layout and security boundaries:

```
app/
├── (sidebar-layout)/        # Main authenticated interface
│   ├── layout.tsx           # Enforces auth + sidebar UI
│   └── admin/
│       └── layout.tsx       # Additional admin check
├── auth/                    # Public routes
└── api/                     # API routes
```

**Principles:**
- Route groups = security boundaries
- Auth in layouts, NOT pages
- Max 2-3 levels of nesting

---

## Component Architecture

### 4-Layer Data Flow

```
Page → Section → Data Component → Client Component
```

```tsx
// 1. Page (page.tsx) - Layout only
export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <OverviewSection />
      <TrendsSection />
    </div>
  );
}

// 2. Section (sections/*-section.tsx) - Suspense boundary
export async function OverviewSection() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <Overview />
    </Suspense>
  );
}

// 3. Data Component (Server)
export async function Overview() {
  const data = await getOverviewData();
  return <OverviewChart data={data} />;
}

// 4. Client Component
'use client';
export function OverviewChart({ data }: { data: ChartData }) {
  return <ResponsiveContainer>...</ResponsiveContainer>;
}
```

---

## Server vs Client

### "use client" Triggers

Only add when you need:
1. React State (`useState`, `useEffect`)
2. Browser APIs (`localStorage`)
3. Event Handlers (`onClick`)
4. Next.js Client Hooks (`useRouter`)
5. Client-only libraries

### Keep as Server Components

- Data fetching
- Database queries
- Static content
- `<Link>` components

---

## Loading States

### Structure-Matching Skeletons

```tsx
export default function Loading() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="h-[500px] animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-48" />
        </CardHeader>
      </Card>
    </div>
  );
}
```

Match the exact structure of the final UI.

---

## Data Fetching

### Use Server Actions for:
- Initial page data
- Form submissions
- User mutations

### Use API Routes for:
- Webhooks
- Streaming
- Cron jobs
- File downloads

```tsx
// ❌ WRONG
fetch('/api/get-user')

// ✅ CORRECT
const user = await getUserData(); // Server action
```

---

## Security

### Layout-Level Auth

```tsx
// app/(sidebar-layout)/layout.tsx
export default async function Layout({ children }) {
  await requireAuth();
  return <>{children}</>;
}
```

Never put auth checks in individual pages.

---

## Anti-Patterns

❌ Auth checks in pages (use layouts)
❌ "use client" at page level
❌ API routes for data fetching
❌ Single Suspense for entire page
❌ Generic loading spinners
