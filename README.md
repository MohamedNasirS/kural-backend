# Kural - Election Campaign Management System

A comprehensive full-stack election campaign management platform for managing Assembly Constituencies (AC) in Tamil Nadu, India. The system provides role-based dashboards, voter management, survey operations, and real-time analytics.

---

## Features

### Multi-Role Dashboard System
- **L0 (Super Admin)**: System-wide administration, user management, global analytics
- **L1 (ACIM)**: Multi-AC management, cross-constituency comparison, moderator oversight
- **L2 (ACI)**: Single AC operations, voter/family management, survey deployment
- **MLA Dashboard**: Election insights, booth sentiment analysis, historical trends
- **War Room (L9)**: Advanced analytics, predictive modeling, geographic intelligence

### Core Functionality
- **Voter Management**: Per-AC voter databases with custom fields, family grouping
- **Survey System**: Dynamic form builder, master data integration, mobile app support
- **Booth Operations**: Agent assignment, real-time activity tracking, performance metrics
- **Analytics & Reports**: Demographics, booth performance, survey trends, export capabilities
- **MLA War Room**: Election results analysis, booth sentiment, competitor tracking

### Technical Highlights
- Sharded data architecture (per-AC collections)
- Multi-layer caching with precomputed statistics
- Session-based authentication with MongoDB store
- Role-based access control (RBAC) with AC isolation
- Real-time activity monitoring
- Mobile app API support

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js 18, Express.js, MongoDB, Mongoose |
| **Authentication** | express-session, connect-mongo, bcryptjs |
| **Deployment** | PM2 (cluster mode), GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.x or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sheik-md-ali/kural-backend.git
   cd kural-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env` file in root directory:
   ```env
   PORT=4000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/kuralapp
   SESSION_SECRET=your-secret-key
   CLIENT_ORIGIN=http://localhost:8080
   ```

4. **Setup database with test data**
   ```bash
   node server/scripts/setupRBAC.js
   ```

5. **Start development servers**

   Terminal 1 - Backend:
   ```bash
   node server/index.js
   ```

   Terminal 2 - Frontend:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:4000/api

---

## Project Structure

```
kural-backend/
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/              # Route-based pages by role
│   │   ├── l0/             # Super Admin pages
│   │   ├── l1/             # ACIM pages
│   │   ├── l2/             # ACI pages
│   │   ├── l9/             # War Room pages
│   │   ├── mla/            # MLA Dashboard pages
│   │   └── shared/         # Shared components
│   ├── components/         # Reusable components
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts
│   ├── lib/                # Utilities
│   └── App.tsx             # Route definitions
│
├── server/                 # Backend (Express.js)
│   ├── routes/             # API route handlers
│   │   └── mla/            # MLA-specific routes
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # Express middleware
│   ├── utils/              # Helper utilities
│   ├── config/             # Configuration
│   ├── scripts/            # Database utilities
│   └── index.js            # Server entry point
│
├── docs/                   # Documentation
├── public/                 # Static assets
└── dist/                   # Production build output
```

---

## Available Scripts

### Development

```bash
# Start frontend dev server (port 8080)
npm run dev

# Start backend server (port 4000)
node server/index.js

# Start backend in cluster mode
node server/cluster.js
```

### Build

```bash
# Production build
npm run build

# Development build
npm run build:dev

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run linter
npm run lint
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# View E2E test report
npm run test:e2e:report
```

### Database

```bash
# Setup RBAC with test users
node server/scripts/setupRBAC.js

# Seed admin user
node server/scripts/seedAdmin.js
```

---

## Test Credentials

| Role | Email/Phone | Password |
|------|-------------|----------|
| Super Admin (L0) | admin@kuralapp.com | admin123 |
| ACIM Master (L1) | acimmaster@kuralapp.com | acim123 |
| ACI-119 (L2) | aci119@kuralapp.com | aci123 |
| ACI-111 (L2) | testaci111@test.com | test123 |
| MLA-116 | mla116@kuralapp.com | mla123 |
| Booth Agent | 9999999001 | agent123 |

---

## API Documentation

### Swagger UI

Interactive API documentation is available via Swagger UI:

- **Development**: http://localhost:4000/api-docs
- **OpenAPI Spec**: http://localhost:4000/api-docs.json

The Swagger documentation includes:
- All API endpoints with request/response schemas
- Authentication requirements
- Role-based access information
- Try-it-out functionality for testing endpoints

### API Overview

The backend provides RESTful APIs organized by domain:

| Endpoint | Description |
|----------|-------------|
| `/api/auth` | Authentication (login, logout, session) |
| `/api/voters` | Voter CRUD and field management |
| `/api/families` | Family aggregation and details |
| `/api/surveys` | Survey form management |
| `/api/survey-responses` | Survey response handling |
| `/api/dashboard` | Statistics and analytics |
| `/api/reports` | Reports generation |
| `/api/rbac` | User and booth management |
| `/api/mla-dashboard` | MLA-specific analytics |
| `/api/mobile-app` | Mobile app support |
| `/api/master-data` | Master data sections |
| `/api/health` | Health checks |

For detailed API documentation, see [docs/system_architecture.md](docs/system_architecture.md).

---

## Role-Based Access Control

The system implements a 5-tier role hierarchy:

| Role | Description | Access Scope |
|------|-------------|--------------|
| **L0** | Super Admin | All ACs, all features |
| **L1** | ACIM (AC In-charge Manager) | All ACs (operational) |
| **L2** | ACI (AC In-charge) | Single assigned AC |
| **MLA** | Member of Legislative Assembly | Single AC (dashboard) |
| **BoothAgent** | Field Agent | Assigned booths only |

**Important**: L2, MLA, and BoothAgent users have an `assignedAC` field that restricts data access to their assigned constituency only.

---

## Data Architecture

### Sharded Collections

Voter data is sharded across per-AC collections for scalability:

```
voters_101, voters_102, voters_108, ..., voters_126
surveyresponses_{AC_ID}
mobileappanswers_{AC_ID}
boothagentactivities_{AC_ID}
```

### Caching Strategy

Multi-layer caching for optimal performance:

1. **In-Memory Cache**: Quick lookups (1-30 min TTL)
2. **Precomputed Stats**: Background-computed dashboard data (5 min refresh)
3. **Real-time Queries**: Fallback for uncached requests

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://...` |
| `SESSION_SECRET` | Session encryption key | Random string |
| `CLIENT_ORIGIN` | Allowed frontend origins | `http://localhost:8080` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_COOKIE_DOMAIN` | Cookie domain | None |
| `SESSION_COOKIE_SAMESITE` | Cookie SameSite policy | `lax` |
| `LOG_LEVEL` | Logging verbosity | `info` |

---

## Local API Proxy Configuration

When the Express API runs on a port other than `4000`, tell Vite where to forward `/api` calls by adding a `.env` file in the project root:

```env
VITE_DEV_API_PROXY_TARGET=http://localhost:4001
```

You can also override the Vite dev server port with `VITE_DEV_SERVER_PORT` if `8080` is occupied.

---

## Production Deployment

### Server Requirements

- Node.js 18.x
- MongoDB 6.x
- PM2 for process management
- 2+ CPU cores (for cluster mode)
- 2GB+ RAM

### Deployment

```bash
# Build frontend
npm run build

# Start with PM2 cluster mode
pm2 start server/cluster.js --name kural-backend

# View logs
pm2 logs kural-backend
```

### CI/CD

Push to `main` branch triggers automatic deployment via GitHub Actions.

---

## Documentation

- **[System Architecture](docs/system_architecture.md)** - Detailed architecture, APIs, and database schema
- **[Server Configuration](docs/server_config.md)** - Production server setup
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and conventions

---

## Assembly Constituencies

The system manages 21 Assembly Constituencies in Tamil Nadu:

- **Active**: AC 101, 102, 108-126
- **Excluded**: AC 103-107

Each AC has its own:
- Voter collection (`voters_{AC_ID}`)
- Survey responses (`surveyresponses_{AC_ID}`)
- Mobile app data (`mobileappanswers_{AC_ID}`)
- Agent activity logs (`boothagentactivities_{AC_ID}`)

---

## Contributing

1. Follow existing code patterns and conventions
2. Use TypeScript for frontend code
3. Add proper error handling
4. Test with multiple role types
5. Update documentation for new features

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines.

---

## License

Proprietary - All rights reserved.

---

## Support

For issues and feature requests, please contact the development team or open an issue in the repository.
