---
description: Repository-wide coding standards and patterns for miranext-shift-pilot
---

# MiraNext Shift Pilot - Coding Standards

Diese Regeln gelten für das **gesamte Repository**.

---

## 1. Tech Stack (Miranext Core)

| Bereich | Technologie | Version |
|---------|-------------|---------|
| **Framework** | Next.js mit App Router | 16.x |
| **React** | React | 19.x |
| **UI Library** | shadcn/ui + Tailwind CSS | Latest |
| **Styling** | Tailwind CSS | 4.x |
| **State Management** | Zustand | Latest |
| **ORM** | Drizzle | Latest |
| **Auth** | NextAuth.js (Credentials Provider) | Latest |
| **Icons** | lucide-react | - |
| **E2E Tests** | Playwright | Latest |

> [!CAUTION]
> **Keine DOM Tests!** Nur Playwright E2E Tests mit semantischen ARIA-Selektoren.

---

## 2. Internationalisierung (i18n)

**ALLE** UI-Texte müssen mehrsprachig sein (DE/EN) via `LanguageContext`.

### Pattern

```tsx
// ❌ FALSCH
<Button>Save</Button>

// ✅ RICHTIG
const { t } = useLanguage();
<Button>{t('common.save')}</Button>
```

### Translation Keys Format

```typescript
export const translations = {
  de: {
    common: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      loading: 'Wird geladen...',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      loading: 'Loading...',
    },
  },
};
```

---

## 3. Next.js App Router Patterns

### Route Organization

```
app/
├── (sidebar-layout)/        # Authenticated interface
│   ├── layout.tsx           # Auth + Sidebar
│   └── [feature]/page.tsx
├── auth/                    # Public routes
└── api/                     # API routes
```

### Security: Auth in Layouts

```tsx
// app/(sidebar-layout)/layout.tsx
export default async function Layout({ children }) {
  await requireAuth();
  return <Sidebar>{children}</Sidebar>;
}
```

### 4-Layer Component Pattern

```
Page → Section → Data Component → Client Component
```

### "use client" NUR bei:
- React State/Effects
- Browser APIs
- Event Handlers
- Next.js Client Hooks

---

## 4. Design System (Dark Mode First)

### Farben

| Element | Class/Value |
|---------|-------------|
| **Sidebar BG** | `bg-[#0f172a]` |
| **Primary BG** | `bg-slate-900` |
| **Cards** | `bg-slate-800` |
| **Borders** | `border-slate-700/50` |
| **Accent** | `text-blue-500` |

### shadcn/ui Components

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
```

---

## 5. State Management (Zustand)

```typescript
import { create } from 'zustand';

export const useShiftStore = create<ShiftStore>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
```

---

## 6. Database (Drizzle)

```typescript
import { drizzle } from 'drizzle-orm/...';
import * as schema from './schema';

export const db = drizzle(connection, { schema });
```

---

## 7. File Structure

```
src/
├── app/                     # Next.js App Router
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Sidebar, Header
│   └── [feature]/           # Feature components
├── context/
│   └── LanguageContext.tsx  # i18n
├── db/
│   ├── schema.ts            # Drizzle schema
│   └── index.ts             # DB client
├── domain/                  # Types & stores
├── i18n/                    # Translations
└── lib/                     # Utilities
```

---

## Quick Checklist

- [ ] Alle Texte in i18n (DE/EN)
- [ ] Auth in Layouts
- [ ] "use client" nur wenn nötig
- [ ] Dark Mode (slate-800/900)
- [ ] shadcn/ui Components
- [ ] Playwright E2E Tests
- [ ] Zustand für Client State
- [ ] Drizzle für DB
