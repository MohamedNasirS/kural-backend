# Responsive Components

Reusable components that handle mobile, tablet, and desktop layouts automatically.

## Quick Start

```tsx
import {
  ResponsiveTable,
  ResponsiveTabsList,
  ResponsiveSelect,
  TruncatedText,
  ResponsiveButtonGroup,
  ResponsiveStatGrid,
  useIsMobile,
} from "@/components/responsive";
```

---

## Components

### 1. ResponsiveTable

Wraps tables with horizontal scroll on mobile/tablet.

```tsx
// Before (overflow on mobile)
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>

// After (scrollable on mobile)
<ResponsiveTable minWidth="600px">
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
  </Table>
</ResponsiveTable>
```

**Props:**
- `minWidth` - Minimum width before scroll (default: "600px")
- `showScrollHint` - Show arrow indicator on mobile (default: true)

---

### 2. ResponsiveTabsList

Tabs that wrap into grid or scroll horizontally on mobile.

```tsx
// Before (cramped/overlapping on mobile)
<Tabs>
  <TabsList className="grid grid-cols-6">
    <TabsTrigger value="a">Tab A</TabsTrigger>
    <TabsTrigger value="b">Tab B</TabsTrigger>
    ...
  </TabsList>
</Tabs>

// After - Grid Mode (wraps into rows)
<Tabs>
  <ResponsiveTabsList columns={{ default: 2, sm: 3, lg: 6 }}>
    <TabsTrigger value="a">Tab A</TabsTrigger>
    <TabsTrigger value="b">Tab B</TabsTrigger>
    ...
  </ResponsiveTabsList>
</Tabs>

// After - Scroll Mode (horizontal scroll)
<Tabs>
  <ResponsiveTabsList scrollable>
    <TabsTrigger value="a">Tab A</TabsTrigger>
    ...
  </ResponsiveTabsList>
</Tabs>
```

**Props:**
- `columns` - Grid columns at breakpoints: `{ default: 2, sm: 3, md: 4, lg: 6 }`
- `scrollable` - Use horizontal scroll instead of grid (default: false)

---

### 3. ResponsiveSelect

Select that's full-width on mobile, fixed-width on desktop.

```tsx
// Before (hardcoded width overflows)
<SelectTrigger className="w-[280px]">

// After (responsive)
<ResponsiveSelect
  value={value}
  onValueChange={setValue}
  placeholder="Select..."
  desktopWidth="280px"
  options={[
    { value: "a", label: "Option A" },
    { value: "b", label: "Long Option B", shortLabel: "Opt B" },
  ]}
/>

// Or just the trigger
<ResponsiveSelectTrigger mdWidth="250px" lgWidth="300px">
  <SelectValue placeholder="Select..." />
</ResponsiveSelectTrigger>
```

---

### 4. TruncatedText

Text that truncates with tooltip.

```tsx
// Before (text overflows)
<td>{longBoothName}</td>

// After (truncates with tooltip)
<td>
  <TruncatedText
    text={longBoothName}
    mobileMaxWidth="120px"
    tabletMaxWidth="200px"
    desktopMaxWidth="300px"
    showTooltip
  />
</td>

// Simple version using Tailwind classes
<SimpleTruncate mobile="max-w-[100px]" md="max-w-[200px]">
  {longText}
</SimpleTruncate>
```

---

### 5. ResponsiveButtonGroup

Button group that collapses to dropdown on mobile.

```tsx
// Before (buttons get cut off)
<div className="flex gap-2">
  <Button>Create User</Button>
  <Button>Export</Button>
  <Button>Settings</Button>
</div>

// After (collapses to dropdown on mobile)
<ResponsiveButtonGroup
  mobileVisibleCount={1}
  tabletVisibleCount={2}
  buttons={[
    { label: "Create User", icon: <Plus />, onClick: handleCreate },
    { label: "Export", icon: <Download />, onClick: handleExport },
    { label: "Settings", icon: <Settings />, onClick: handleSettings },
  ]}
/>

// Simple version (just wraps)
<SimpleResponsiveButtons>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</SimpleResponsiveButtons>
```

---

### 6. ResponsiveGrid

Grid with responsive columns.

```tsx
// Stat cards
<ResponsiveStatGrid>
  <StatCard title="Users" value={100} />
  <StatCard title="Active" value={80} />
  <StatCard title="New" value={20} />
  <StatCard title="Total" value={200} />
</ResponsiveStatGrid>

// Custom grid
<ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }} gap="md">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</ResponsiveGrid>
```

---

### 7. ResponsiveChartContainer

Charts with responsive heights.

```tsx
// Before (fixed height)
<ResponsiveContainer width="100%" height={400}>
  <LineChart>...</LineChart>
</ResponsiveContainer>

// After (responsive height)
<ResponsiveChartContainer
  mobileHeight={250}
  tabletHeight={300}
  desktopHeight={400}
>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart>...</LineChart>
  </ResponsiveContainer>
</ResponsiveChartContainer>

// Or use the hook
const chartHeight = useResponsiveChartHeight({
  mobile: 250,
  tablet: 300,
  desktop: 400,
});

<ResponsiveContainer width="100%" height={chartHeight}>
  <LineChart>...</LineChart>
</ResponsiveContainer>
```

---

## Hooks

### useIsMobile

```tsx
const isMobile = useIsMobile(); // true if < 640px
const isMobile = useIsMobile(768); // true if < 768px
```

### useBreakpoint

```tsx
const breakpoint = useBreakpoint();
// Returns: "mobile" | "sm" | "md" | "lg" | "xl" | "2xl"

if (breakpoint === "mobile") {
  // Mobile specific logic
}
```

### useResponsiveChartHeight

```tsx
const height = useResponsiveChartHeight({
  mobile: 200,
  tablet: 300,
  desktop: 400,
});
```

---

## Migration Guide

### Step 1: Find hardcoded widths

Search for patterns like:
- `w-[XXXpx]`
- `min-w-[XXXpx]`
- `max-w-[XXXpx]`

### Step 2: Find non-responsive grids

Search for:
- `grid-cols-5`
- `grid-cols-6`
- Without `sm:`, `md:`, `lg:` variants

### Step 3: Find tables without wrappers

Look for `<Table>` without `<ResponsiveTable>` wrapper.

### Step 4: Apply components

Replace with responsive variants following examples above.

---

## Files to Update

Priority order:
1. `src/pages/l0/UserManagement.tsx` - 5 tabs, table
2. `src/pages/l1/ACDetailedDashboard.tsx` - 6 tabs, selects
3. `src/pages/mla/MLADashboard.tsx` - Tables, charts
4. `src/pages/l2/Dashboard.tsx` - Tables, booth names
5. `src/pages/l0/VoterFieldManager.tsx` - Tabs, buttons
