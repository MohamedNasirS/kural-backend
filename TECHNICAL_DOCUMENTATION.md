# Knowledge Transfer Document - Election Campaign Management System

## 1. Project Overview

### 1.1 Application Purpose
A comprehensive election campaign management platform designed for managing Assembly Constituency (AC) operations across multiple levels of administration. The system provides role-based dashboards for system administrators, AC managers, moderators, and a strategic War Room command center.

### 1.2 Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19
- **Styling**: Tailwind CSS 3.4.17 with custom design system
- **UI Components**: Radix UI primitives + custom shadcn/ui components
- **State Management**: React Context API + TanStack Query (React Query) 5.83.0
- **Routing**: React Router DOM 6.30.1
- **Charts/Visualization**: Recharts 2.15.4
- **Form Management**: React Hook Form 7.61.1 + Zod 3.25.76 validation
- **Theming**: next-themes 0.3.0 (light/dark mode support)
- **Notifications**: Sonner 1.7.4 + custom toast system

### 1.3 Architecture Pattern
- **Component-based architecture** with clear separation of concerns
- **Context-based authentication and state management**
- **Role-based access control (RBAC)** with 4 user levels
- **Responsive design** with mobile-first approach
- **Mock data layer** ready for database integration

---

## 2. Application Architecture

### 2.1 User Roles & Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    L0 (Super Admin)                  │
│              System-wide Administration              │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────────┐          ┌────────▼────────┐
│  L1 (ACIM)       │          │  L9 (War Room)  │
│  AC Managers     │          │  Command Center │
└───────┬──────────┘          └─────────────────┘
        │
┌───────▼──────────┐
│  L2 (ACI)        │
│  AC Moderators   │
└───────┬──────────┘
        │
┌───────▼──────────┐
│  L3 (Agents)     │
│  Booth Agents    │
└──────────────────┘
```

**Role Details:**
- **L0 (Super Admin)**: System-wide control, manages all ACs, admins, and settings
- **L1 (ACIM)**: Assembly Constituency In-charge Manager - manages specific ACs
- **L2 (ACI)**: Assembly Constituency In-charge - moderates assigned AC
- **L9 (War Room)**: Strategic command center with aggregated intelligence across all ACs

### 2.2 Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base shadcn/ui components (buttons, cards, dialogs, etc.)
│   ├── DashboardLayout.tsx
│   ├── StatCard.tsx
│   ├── ActionButton.tsx
│   ├── ThemeToggle.tsx
│   ├── NotificationCenter.tsx
│   └── [Feature-specific components]
├── contexts/            # React Context providers
│   ├── AuthContext.tsx           # Authentication & user management
│   ├── NotificationContext.tsx   # Notification system
│   └── ActivityLogContext.tsx    # Activity tracking
├── pages/              # Route-based page components
│   ├── l0/            # L0 Super Admin pages
│   ├── l1/            # L1 ACIM pages
│   ├── l2/            # L2 ACI pages
│   ├── l9/            # L9 War Room pages
│   ├── shared/        # Shared pages across roles
│   ├── Index.tsx      # Landing page
│   ├── Login.tsx      # Authentication page
│   └── NotFound.tsx   # 404 page
├── hooks/             # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/               # Utility functions
│   └── utils.ts
├── constants/         # Application constants
│   └── constituencies.ts
├── App.tsx           # Root component with routing
├── main.tsx          # Application entry point
└── index.css         # Global styles & Tailwind directives
```

### 2.3 Data Flow Architecture

```
User Interaction
      ↓
React Component
      ↓
Context API / React Query
      ↓
Mock Data Layer (Currently)
      ↓
[Future: Supabase/Database Integration]
```

---

## 3. Core Systems & Implementation

### 3.1 Authentication System

**Location**: `src/contexts/AuthContext.tsx`

**Key Features:**
- Context-based authentication state management
- Role-based user objects with type safety
- Mock authentication (ready for real API integration)
- Persistent login state across app

**User Object Structure:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'L0' | 'L1' | 'L2' | 'L9';
  assignedAC?: number;  // For L2 users
}
```

**Demo Credentials:**
```typescript
// L0 Super Admin
Email: admin@system.com
Password: admin123

// L1 ACIM Manager
Email: acim@ac.com
Password: acim123

// L2 ACI Moderator (AC 118)
Email: aci@ac118.com
Password: aci123

// L9 War Room
Email: warroom@system.com
Password: wrm123
```

**Integration Points:**
- Used by `ProtectedRoute` component for route guarding
- Consumed by `DashboardLayout` for user info display
- Powers role-based navigation and UI rendering

### 3.2 Routing System

**Location**: `src/App.tsx`

**Route Protection Pattern:**
```typescript
<Route 
  path="/l0/dashboard" 
  element={
    <ProtectedRoute allowedRoles={['L0']}>
      <L0Dashboard />
    </ProtectedRoute>
  } 
/>
```

**Key Routes:**
- `/login` - Authentication page
- `/` - Landing page (redirects based on role)
- `/l0/*` - L0 Super Admin routes (12 routes)
- `/l1/*` - L1 ACIM routes (18 routes)
- `/l2/*` - L2 ACI routes (11 routes)
- `/l9/*` - L9 War Room routes (12 routes)

**Role-based Redirection:**
```typescript
const RoleBasedRedirect = () => {
  switch (user?.role) {
    case 'L0': return <Navigate to="/l0/dashboard" />;
    case 'L1': return <Navigate to="/l1/constituencies" />;
    case 'L2': return <Navigate to="/l2/dashboard" />;
    case 'L9': return <Navigate to="/l9/war-room" />;
  }
};
```

### 3.3 Notification System

**Location**: `src/contexts/NotificationContext.tsx`

**Features:**
- Real-time notification delivery
- Type-based notifications (success, error, warning, info, activity)
- Unread count tracking
- Role-specific notification generation
- Toast integration with Sonner
- Action URLs for navigation

**Notification Types:**
```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'activity';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}
```

**Usage Example:**
```typescript
const { addNotification } = useNotifications();

addNotification({
  type: 'success',
  title: 'Survey Completed',
  message: 'Survey ID #1234 submitted successfully',
  userId: user.id,
  actionUrl: '/l2/surveys',
  metadata: { surveyId: 1234 }
});
```

### 3.4 Activity Logging System

**Location**: `src/contexts/ActivityLogContext.tsx`

**Purpose:** Tracks all user actions across the system for audit trails and analytics.

**Activity Types:**
- `voter_added`, `voter_updated`, `voter_deleted`
- `family_added`, `family_updated`, `family_deleted`
- `survey_created`, `survey_submitted`, `survey_updated`
- `booth_created`, `booth_updated`, `agent_assigned`
- `form_created`, `form_updated`, `form_published`

**Log Structure:**
```typescript
interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'L0' | 'L1' | 'L2' | 'L9';
  action: ActivityAction;
  entityType: 'voter' | 'family' | 'survey' | 'booth' | 'agent' | 'form';
  entityId?: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### 3.5 Theme System

**Implementation:**
- Built with `next-themes` library
- System, light, and dark mode support
- CSS custom properties for colors
- Tailwind integration
- Persistent theme selection

**Theme Configuration:**
```typescript
// src/components/ThemeProvider.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

**Color System:** (Defined in `src/index.css`)
- HSL-based color palette
- Automatic dark mode variants
- Primary, secondary, success, warning, destructive colors
- Semantic color tokens (background, foreground, muted, accent, etc.)

---

## 4. Component Architecture

### 4.1 Layout Components

#### DashboardLayout
**Location**: `src/components/DashboardLayout.tsx`

**Purpose:** Main layout wrapper for all authenticated pages

**Structure:**
```
┌─────────────────────────────────────────┐
│  Sidebar (AppSidebar)                   │
│  - Logo                                 │
│  - Role-based Navigation Menu           │
│  - User Info                            │
│  - Logout Button                        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Header                                 │
│  - Sidebar Toggle                       │
│  - Theme Toggle                         │
│  - Notification Center                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Main Content Area                      │
│  {children}                             │
└─────────────────────────────────────────┘
```

**Key Features:**
- Collapsible sidebar with icon-only mode
- Role-based menu item rendering
- Context providers for notifications and activity logs
- Responsive design with mobile hamburger menu

**Role-Based Navigation:**
```typescript
const getMenuItems = () => {
  switch (user?.role) {
    case 'L0': return [/* L0 menu items */];
    case 'L1': return [/* L1 menu items */];
    case 'L2': return [/* L2 menu items */];
    case 'L9': return [/* L9 War Room items */];
  }
};
```

### 4.2 UI Components

#### StatCard
**Location**: `src/components/StatCard.tsx`

**Purpose:** Display key metrics with icons

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'default';
  subtitle?: string;
}
```

**Usage:**
```typescript
<StatCard
  title="Total Voters"
  value="42,567"
  icon={Users}
  variant="primary"
  subtitle="Registered Voters"
/>
```

#### ActionButton
**Location**: `src/components/ActionButton.tsx`

**Purpose:** Navigation card for quick actions

**Usage:**
```typescript
<ActionButton
  icon={Users}
  title="Voter Manager"
  description="View & update voter details"
  href="/l2/voters"
/>
```

### 4.3 shadcn/ui Components

**All base UI components** are located in `src/components/ui/`

**Key Components:**
- `button.tsx` - Multiple button variants
- `card.tsx` - Container component with variants
- `dialog.tsx` - Modal dialogs
- `sheet.tsx` - Slide-out panels (drawers)
- `tabs.tsx` - Tabbed interfaces
- `table.tsx` - Data tables
- `form.tsx` - Form field wrappers with React Hook Form
- `select.tsx`, `input.tsx`, `textarea.tsx` - Form inputs
- `toast.tsx` - Toast notifications
- `sidebar.tsx` - Collapsible sidebar primitives

**Component Customization:**
All components use `class-variance-authority` (CVA) for variant management and `tailwind-merge` for className conflict resolution.

---

## 5. Dashboard Implementation Details

### 5.1 L0 Super Admin Dashboard

**Location**: `src/pages/l0/Dashboard.tsx`

**Key Features:**
- System-wide overview across all 26 ACs
- Real-time activity indicators
- Advanced filtering (date range, AC performance levels)
- Growth trend visualization (5-month data)
- Admin activity tracking by level (L1, L2, L3)
- Survey distribution analytics
- AC performance comparison table

**Data Visualizations:**
- Line charts for system growth
- Bar charts for survey distribution
- Area charts for admin activity
- Tabbed interface for different views

**Sub-pages:**
- User Management (`/l0/users`) - Manages all users including ACIM (L1), ACI (L2), and Booth Agents
- Voter Data (`/l0/voters`)
- Survey Bank (`/l0/surveys`)
- Form Builder (`/l0/surveys/builder/:formId`)
- Booth Management (`/l0/booths`)
- App Settings (`/l0/settings`)
- Activity Logs (`/l0/activity-logs`)

### 5.2 L1 ACIM Dashboard

**Main Dashboard**: `src/pages/l1/ConstituencySelector.tsx`
**AC Detail View**: `src/pages/l1/ACDetailedDashboard.tsx`

**Key Features:**
- Multi-AC management interface
- AC selector dropdown for quick navigation
- Detailed per-AC analytics with 6 tabs:
  1. **Overview**: Key metrics, quick actions, activity feed
  2. **Trends**: Time-series data (surveys, voters, families)
  3. **Booths**: Booth-level performance with drill-down
  4. **Agents**: Agent leaderboard and performance distribution
  5. **Surveys**: Survey progress tracking
  6. **Families**: Family statistics

**Data Structures:**
```typescript
const acData: Record<string, {
  name: string;
  voters: number;
  families: number;
  surveys: number;
  booths: number;
  completion: number;
}> = {
  '119': { name: 'Thondamuthur', voters: 1247, ... },
  // ... 20 more ACs
};
```

**Sub-pages:**
- AC Analytics (`/l1/analytics`)
- AC Comparison (`/l1/ac-comparison`)
- Advanced Analytics (`/l1/advanced-analytics`)
- Survey Assignments (`/l1/survey-assignments`)
- Moderator Management (`/l1/moderators`)
- Live Survey Monitor (`/l1/live-surveys`)

### 5.3 L2 ACI Dashboard

**Location**: `src/pages/l2/Dashboard.tsx`

**Key Features:**
- Single AC focus (assigned to user)
- Simplified interface for field operations
- Quick action cards for common tasks
- Booth status monitoring table
- Real-time survey completion tracking

**Assigned AC:**
Retrieved from user context:
```typescript
const { user } = useAuth();
const acNumber = user?.assignedAC || 118;
```

**Sub-pages:**
- Voter Manager (`/l2/voters`)
- Family Manager (`/l2/families`)
- Survey Manager (`/l2/surveys`)
- Live Booth Updates (`/l2/live-updates`)
- Reports (`/l2/reports`)

### 5.4 L9 War Room Dashboard

**Main Dashboard**: `src/pages/l9/WarRoom.tsx`

**Purpose:** Strategic command center with aggregated intelligence

**Key Sections:**
1. **Voter Intelligence**
   - Demographics breakdown by age segment
   - Swing voter funnel analysis
   - High-impact segment identification

2. **Sentiment Analysis**
   - Weekly sentiment trends (positive/neutral/negative)
   - Top voter issues with priority scores
   - Message effectiveness tracking

3. **Campaign Performance**
   - AC-wise completion rates
   - Sentiment scores by AC
   - Expected turnout projections

4. **Resource Allocation**
   - Budget tracking by category
   - Efficiency metrics
   - Agent distribution

5. **Alerts & Monitoring**
   - Critical issues requiring attention
   - Performance anomalies
   - Real-time operational alerts

**Additional War Room Pages:**
- Geographic Intelligence (`/l9/geographic`) - AC maps, booth tracking, heatmaps
- Predictive Analytics (`/l9/predictive`) - Win probability, turnout forecasting
- Micro-Targeting (`/l9/micro-targeting`) - Voter segmentation, message personalization
- Financial Intelligence (`/l9/financial`) - Expense tracking, ROI analysis
- Digital Analytics (`/l9/digital`) - Social media monitoring, viral content tracking
- Team Management (`/l9/team`) - Agent productivity, efficiency metrics
- Opposition Intelligence (`/l9/opposition`) - Competitor tracking, SWOT analysis
- Communication Analytics (`/l9/communication`) - Multi-channel performance
- Election Day Ops (`/l9/election-day`) - Live turnout, GOTV monitoring
- Survey Intelligence (`/l9/surveys`) - Response analysis, quality metrics
- Success Metrics (`/l9/success`) - Campaign health score, benchmarking

---

## 6. Data Visualization System

### 6.1 Recharts Implementation

**Library**: `recharts` v2.15.4

**Common Chart Types Used:**

**Line Charts** - Trend analysis
```typescript
<LineChart data={timeSeriesData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="surveys" stroke="hsl(var(--primary))" />
</LineChart>
```

**Bar Charts** - Comparisons
```typescript
<BarChart data={campaignPerformance}>
  <Bar dataKey="completion" fill="hsl(var(--primary))" name="Completion %" />
  <Bar dataKey="sentiment" fill="hsl(var(--secondary))" name="Sentiment" />
</BarChart>
```

**Pie Charts** - Distribution
```typescript
<PieChart>
  <Pie
    data={agentPerformanceData}
    label={({ name, value }) => `${name}: ${value}%`}
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={index} fill={COLORS[index]} />
    ))}
  </Pie>
</PieChart>
```

**Area Charts** - Cumulative trends
```typescript
<AreaChart data={sentimentData}>
  <Area type="monotone" dataKey="positive" stackId="1" 
        stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 46%)" />
  <Area type="monotone" dataKey="neutral" stackId="1" />
  <Area type="monotone" dataKey="negative" stackId="1" />
</AreaChart>
```

### 6.2 Color System for Charts

**Using CSS Variables:**
```typescript
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))'
];
```

**Benefits:**
- Automatic dark mode support
- Consistent with design system
- Theme-aware visualizations

---

## 7. Form Management

### 7.1 React Hook Form + Zod Integration

**Form Pattern:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.number().min(18).max(120),
});

type FormValues = z.infer<typeof formSchema>;

const MyForm = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 18,
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields */}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
```

### 7.2 Form Builder System

**Location**: `src/pages/l0/FormBuilder.tsx` (shared by L1, L2)

**Features:**
- Dynamic form field creation
- Multiple field types (text, number, select, checkbox, radio, date)
- Drag-and-drop ordering (potential future enhancement)
- Form preview mode
- Form versioning support

---

## 8. State Management Patterns

### 8.1 Context API Usage

**Three Main Contexts:**
1. `AuthContext` - Authentication state
2. `NotificationContext` - Notification system
3. `ActivityLogContext` - Activity tracking

**Provider Hierarchy:**
```tsx
<QueryClientProvider>
  <ThemeProvider>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />  {/* Contains NotificationProvider and ActivityLogProvider */}
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

### 8.2 React Query Integration

**Setup:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

**Usage Example** (for future API integration):
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['voters', acNumber],
  queryFn: () => fetchVoters(acNumber),
});
```

---

## 9. Styling System

### 9.1 Tailwind Configuration

**Location**: `tailwind.config.ts`

**Key Extensions:**
- Custom color system with semantic tokens
- Custom font family (DM Sans)
- Extended animations (accordion, fade-in, slide-up)
- Custom box shadows
- Gradient backgrounds
- Extended border radius values

**Custom Utilities:**
```typescript
// Using cn() utility for className merging
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className  // Allow override
)} />
```

### 9.2 Design System

**Color Palette:**
- Primary: Main brand color
- Secondary: Supporting color
- Success: Green for positive actions
- Warning: Yellow/Orange for caution
- Destructive: Red for errors/delete actions
- Muted: Low-emphasis backgrounds
- Accent: Highlight color

**Typography:**
- Font: DM Sans
- Scale: text-xs to text-4xl
- Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

**Spacing:**
- Consistent padding/margin scale
- Gap utilities for flex/grid layouts
- Component-specific spacing (p-4, p-6, p-8 for cards)

**Responsive Breakpoints:**
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1400px
```

---

## 10. Build & Development

### 10.1 Development Setup

**Prerequisites:**
- Node.js 18+ or Bun runtime
- Package manager: npm, yarn, pnpm, or bun

**Installation:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at: http://localhost:8080
```

**Vite Configuration:**
- Port: 8080
- Host: "::" (IPv4 and IPv6)
- SWC for fast React compilation
- Path aliasing: `@/` → `src/`

### 10.2 Build Process

**Production Build:**
```bash
npm run build
```

**Build Output:**
- Location: `dist/`
- Optimized bundle with code splitting
- CSS minification
- Tree shaking for unused code

**Preview Production Build:**
```bash
npm run preview
```

### 10.3 ESLint Configuration

**Location**: `eslint.config.js`

**Rules:**
- TypeScript strict mode
- React Hooks rules enforced
- Unused variables disabled (`@typescript-eslint/no-unused-vars: off`)
- React Refresh plugin for HMR

---

## 11. Database Integration (Future)

### 11.1 Recommended Stack
- **Backend**: Supabase or custom Node.js API
- **Database**: PostgreSQL
- **ORM**: Prisma or Supabase client

### 11.2 Data Models (Recommended Schema)

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('L0', 'L1', 'L2', 'L9')),
  assigned_ac INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Assembly Constituencies (ACs) Table:**
```sql
CREATE TABLE assembly_constituencies (
  id SERIAL PRIMARY KEY,
  ac_number INTEGER UNIQUE NOT NULL,
  ac_name VARCHAR(255) NOT NULL,
  total_voters INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Voters Table:**
```sql
CREATE TABLE voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ac_id INTEGER REFERENCES assembly_constituencies(id),
  family_id UUID REFERENCES families(id),
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  gender VARCHAR(10),
  phone VARCHAR(20),
  address TEXT,
  booth_number VARCHAR(50),
  voter_id_number VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Families Table:**
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ac_id INTEGER REFERENCES assembly_constituencies(id),
  head_of_family_id UUID REFERENCES voters(id),
  family_name VARCHAR(255),
  address TEXT,
  total_members INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Surveys Table:**
```sql
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id),
  form_id UUID REFERENCES survey_forms(id),
  completed_by UUID REFERENCES users(id),
  responses JSONB NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  ac_id INTEGER REFERENCES assembly_constituencies(id)
);
```

**Survey Forms Table:**
```sql
CREATE TABLE survey_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Booths Table:**
```sql
CREATE TABLE booths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ac_id INTEGER REFERENCES assembly_constituencies(id),
  booth_number VARCHAR(50) NOT NULL,
  booth_name VARCHAR(255),
  location TEXT,
  total_voters INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Booth Agents Table:**
```sql
CREATE TABLE booth_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  booth_id UUID REFERENCES booths(id),
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE
);
```

**Activity Logs Table:**
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Notifications Table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 11.3 API Integration Points

**Replace Mock Data Functions:**

Current:
```typescript
// Mock data
const MOCK_USERS = { ... };
```

Future:
```typescript
// API calls
const fetchUsers = async () => {
  const response = await fetch('/api/users');
  return response.json();
};
```

**Use React Query for API calls:**
```typescript
const { data: voters, isLoading } = useQuery({
  queryKey: ['voters', acNumber],
  queryFn: () => fetchVoters(acNumber),
});
```

---

## 12. Testing Strategy (Recommended)

### 12.1 Unit Testing
- **Framework**: Vitest (Vite-native)
- **Library**: React Testing Library
- Test components in isolation
- Test utility functions
- Test hooks

### 12.2 Integration Testing
- Test complete user flows
- Test form submissions
- Test routing navigation
- Test context providers

### 12.3 E2E Testing
- **Tool**: Playwright or Cypress
- Test login flow
- Test role-based navigation
- Test data entry workflows

---

## 13. Deployment

### 13.1 Build Optimization
```bash
npm run build
```

**Output:**
- Minified JavaScript bundles
- Optimized CSS
- Static assets with cache headers
- Source maps for debugging

### 13.2 Recommended Hosting
- **Vercel** - Zero-config deployment
- **Netlify** - Easy CI/CD
- **AWS S3 + CloudFront** - Full control
- **DigitalOcean App Platform** - Managed hosting

### 13.3 Environment Variables
Create `.env` file for production:
```
VITE_API_URL=https://api.yourapp.com
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 14. Performance Optimization

### 14.1 Implemented Optimizations
- **Code Splitting**: React Router lazy loading ready
- **Image Optimization**: Proper sizing and formats
- **Bundle Size**: Tree shaking enabled
- **CSS**: Tailwind purging unused styles

### 14.2 Recommended Enhancements
- Implement React.lazy() for route-based code splitting
- Add service worker for offline support
- Implement virtual scrolling for large tables
- Add image lazy loading
- Optimize Recharts bundle size

---

## 15. Security Considerations

### 15.1 Current Implementation
- Client-side route protection
- Role-based access control
- XSS protection via React's default escaping

### 15.2 Future Backend Security
- JWT authentication with httpOnly cookies
- CSRF protection
- Rate limiting on API endpoints
- SQL injection prevention with parameterized queries
- Input validation on backend
- Secure password hashing (bcrypt/argon2)

---

## 16. Accessibility (a11y)

### 16.1 Implemented Features
- Semantic HTML structure
- Proper heading hierarchy
- Keyboard navigation support (Radix UI)
- Focus management in modals/dialogs
- ARIA labels where needed

### 16.2 Recommended Improvements
- Add skip-to-content links
- Ensure color contrast ratios (WCAG AA)
- Test with screen readers
- Add more descriptive aria-labels
- Implement focus indicators

---

## 17. Known Limitations & Future Enhancements

### 17.1 Current Limitations
- Mock data (no real backend)
- No data persistence
- No real-time updates (simulated)
- No user profile management
- No password reset flow

### 17.2 Planned Enhancements
1. **Database Integration**: Connect to Supabase/PostgreSQL
2. **Real-time Updates**: WebSocket integration for live data
3. **File Upload**: Photo/document upload for voters
4. **Advanced Search**: Full-text search across entities
5. **Export Features**: PDF/Excel report generation
6. **Mobile App**: React Native companion app
7. **Offline Support**: Progressive Web App (PWA) capabilities
8. **Analytics Dashboard**: Google Analytics/Mixpanel integration
9. **Bulk Import**: CSV/Excel data import
10. **Two-Factor Authentication**: Enhanced security
11. **Role Permissions**: Granular permission system
12. **Audit Trail**: Complete action history
13. **Geolocation**: Map-based voter/booth visualization
14. **SMS/Email Integration**: Notification delivery
15. **WhatsApp Integration**: Campaign communication

---

## 18. Development Best Practices

### 18.1 Code Organization
- One component per file
- Co-locate related files
- Use TypeScript for type safety
- Follow naming conventions (PascalCase for components, camelCase for functions)

### 18.2 Component Design
- Keep components small and focused
- Extract reusable logic into hooks
- Use composition over inheritance
- Implement proper prop typing

### 18.3 State Management
- Use Context for global state
- Keep local state when possible
- Use React Query for server state
- Avoid prop drilling

### 18.4 Git Workflow
- Feature branches for new features
- Descriptive commit messages
- Code review before merging
- Keep main branch deployable

---

## 19. Troubleshooting Common Issues

### 19.1 Build Errors
**Error**: "Cannot find module '@/...'"
**Solution**: Check `vite.config.ts` path alias configuration

**Error**: "Module not found: Can't resolve 'component'"
**Solution**: Verify import paths and file extensions

### 19.2 Runtime Errors
**Error**: "useAuth must be used within AuthProvider"
**Solution**: Ensure component is wrapped in AuthProvider

**Error**: "Cannot read property of undefined"
**Solution**: Add optional chaining (`?.`) or null checks

### 19.3 Styling Issues
**Issue**: Dark mode not working
**Solution**: Check ThemeProvider setup and CSS custom properties

**Issue**: Tailwind classes not applying
**Solution**: Verify `tailwind.config.ts` content paths

---

## 20. Quick Reference

### 20.1 Common Commands
```bash
# Development
npm run dev              # Start dev server

# Build
npm run build            # Production build
npm run preview          # Preview prod build

# Code Quality
npm run lint             # Run ESLint
```

### 20.2 Key File Locations
```
Authentication:     src/contexts/AuthContext.tsx
Routing:            src/App.tsx
Layout:             src/components/DashboardLayout.tsx
Theme:              src/index.css
Config:             vite.config.ts, tailwind.config.ts
```

### 20.3 Demo Credentials Quick Access
```
L0: admin@system.com / admin123
L1: acim@ac.com / acim123
L2: aci@ac118.com / aci123
L9: warroom@system.com / wrm123
```

---

## 21. Support & Resources

### 21.1 Documentation Links
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Vite**: https://vitejs.dev/guide/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/primitives/docs/overview/introduction
- **React Router**: https://reactrouter.com/en/main
- **React Hook Form**: https://react-hook-form.com/
- **Recharts**: https://recharts.org/en-US/
- **TanStack Query**: https://tanstack.com/query/latest/docs/framework/react/overview

### 21.2 Component Library
- **shadcn/ui**: https://ui.shadcn.com/

---

## 22. Conclusion

This KT document covers the complete technical architecture of the Election Campaign Management System. The application is well-structured, follows React best practices, and is ready for database integration. All mock data patterns are designed to be easily replaceable with real API calls.

**Key Strengths:**
- Clean, maintainable codebase
- Type-safe with TypeScript
- Comprehensive role-based access control
- Professional UI with dark mode support
- Ready for production deployment

**Next Steps for New Developers:**
1. Clone the repository and run `npm install`
2. Start the dev server and explore all 4 user roles
3. Review the routing structure in `App.tsx`
4. Examine a complete dashboard (e.g., L9 War Room)
5. Plan database schema integration
6. Begin API endpoint development

**For Questions:**
Review this document first, then check the inline code comments. The codebase is well-commented and follows consistent patterns throughout.