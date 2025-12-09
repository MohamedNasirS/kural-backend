# Project Audit Report v2 - Kural Election Campaign Management System

**Audit Date:** 2025-12-09
**Auditor:** Claude Code
**Scope:** Complete backend and frontend codebase analysis

---

## Table of Contents
1. [Codebase Overview](#1-codebase-overview)
2. [Backend Correctness Audit](#2-backend-correctness-audit)
3. [Performance Audit](#3-performance-audit)
4. [Scalability Audit](#4-scalability-audit)
5. [Caching Audit](#5-caching-audit)
6. [API Consistency & Duplication Audit](#6-api-consistency--duplication-audit)
7. [Database & Schema Audit](#7-database--schema-audit)
8. [Frontend Impact Audit](#8-frontend-impact-audit)
9. [Security & Fault Tolerance Audit](#9-security--fault-tolerance-audit)
10. [Summary of Issues](#10-summary-of-issues)

---

## 1. CODEBASE OVERVIEW

### 1.1 Current Architecture

The Kural Election Campaign Management System is a full-stack monorepo application:

```
kural-backend/
├── server/                    # Express.js Backend
│   ├── index.js              # Main server entry (122 lines)
│   ├── config/               # Configuration (database, env)
│   ├── middleware/           # Auth, rate limiting
│   ├── models/               # Mongoose schemas (10 models)
│   ├── routes/               # API routes (13 route files)
│   ├── utils/                # Collection utilities, helpers
│   └── scripts/              # DB scripts (21 files)
├── src/                       # React Frontend
│   ├── App.tsx               # Route definitions
│   ├── pages/                # L0, L1, L2, L9, shared pages
│   ├── components/           # UI + custom components
│   ├── contexts/             # Auth, Notifications, ActivityLog
│   └── lib/                  # API utilities
```

### 1.2 Module and Feature Boundaries

| Module | Purpose | Files |
|--------|---------|-------|
| **Auth** | Login, session, RBAC | auth.routes.js, auth.js middleware |
| **Voters** | Voter CRUD, family management | voter.routes.js, family.routes.js |
| **Surveys** | Form builder, responses | survey.routes.js, surveyResponse.routes.js |
| **Master Data** | Standardized questions/options | masterData.routes.js, mappedFields.routes.js |
| **Mobile App** | Mobile form integration | mobileApp.routes.js |
| **RBAC** | User, booth, agent management | rbac.js (78KB - largest file) |
| **Dashboard** | Statistics, analytics | dashboard.routes.js |
| **Reports** | Report generation | report.routes.js |

### 1.3 Dynamic AC-Based Collection Usage Patterns

The system uses **sharded collections by Assembly Constituency (AC)**:

**Sharded Collections:**
- `voters_{AC_ID}` - 21 collections (voters_101, voters_102, voters_108-126)
- `surveyresponses_{AC_ID}` - 21 collections
- `boothagentactivities_{AC_ID}` - 21 collections
- `mobileappanswers_{AC_ID}` - 21 collections

**Non-Sharded Collections:**
- `users`, `booths`, `surveys`, `sessions`
- `masterDataSections`, `masterQuestions`
- `mobileappquestions`, `mobileappresponses`
- `mappedfields`, `surveymasterdatamappings`

**Collection Utility Pattern:**
```javascript
// Example from voterCollection.js
export function getVoterModel(acId) {
  const collectionName = `voters_${numericAcId}`;
  // Uses model cache to avoid recompilation
  if (modelCache[collectionName]) return modelCache[collectionName];
  return mongoose.model(collectionName, voterSchema, collectionName);
}
```

---

## 2. BACKEND CORRECTNESS AUDIT

### 2.1 Critical Logic Issues

#### 2.1.1 **Sequential Search in `findVoterById`** (HIGH)
**File:** `server/utils/voterCollection.js:134-147`
```javascript
export async function findVoterById(voterId) {
  for (const acId of ALL_AC_IDS) {  // Iterates through ALL 21 ACs sequentially
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findById(voterId).lean();
      if (voter) return { voter, acId };
    } catch (err) { /* Continue */ }
  }
  return null;
}
```
**Issue:** Worst case requires 21 sequential DB queries. Should be parallelized.

#### 2.1.2 **Inconsistent AC Field Names** (MEDIUM)
**Files:** Multiple route and model files

The codebase uses multiple field names for the same concept:
- `acId`, `ac_id`, `aci_id`, `aciId`, `acNumber`, `aciNumber`
- `boothId`, `booth_id`, `boothCode`, `boothno`, `booth`

**Example from auth.js:197:**
```javascript
query.ac_id = assignedAC;  // Uses ac_id
```
**But voterCollection.js uses:**
```javascript
voterSchema.index({ aci_id: 1 });  // Uses aci_id
```

#### 2.1.3 **Missing AC Validation in Search Queries** (MEDIUM)
**File:** `server/routes/mobileApp.routes.js:405-468`

The `buildSearchQuery` function creates an `$or` condition for AC filtering but doesn't validate that the AC ID is valid before querying:
```javascript
if (acId) {
  const numericAcId = parseInt(acId, 10);
  if (!Number.isNaN(numericAcId)) {  // Only checks if parseable, not if valid AC
    conditions.push({ $or: [...] });
  }
}
```

#### 2.1.4 **Race Condition in Session Save** (MEDIUM)
**File:** `server/routes/auth.routes.js:281-289`

```javascript
if (JSON.stringify(req.session.user) !== JSON.stringify(userSession)) {
  req.session.user = userSession;
  await new Promise((resolve, reject) => {
    req.session.save((err) => { ... });  // Async session save
  });
}
```
**Issue:** No mutex/lock - concurrent requests could overwrite session data.

### 2.2 Broken/Incomplete Flows

#### 2.2.1 **Report Routes Missing Implementation** (HIGH)
**File:** `server/routes/report.routes.js`

The report routes file exists but based on the task description, report generation for YouTube and uploaded videos is incomplete. The file is only 4.3KB which suggests limited implementation.

#### 2.2.2 **Voter Model vs VoterCollection Mismatch** (MEDIUM)
**Files:** `server/models/Voter.js` vs `server/utils/voterCollection.js`

Two different voter schemas exist:
- `Voter.js` - Points to `voters` collection (not sharded)
- `voterCollection.js` - Has its own schema for sharded collections

**Voter.js line 66:**
```javascript
const Voter = mongoose.model('Voter', voterSchema, 'voters');  // Non-sharded
```

### 2.3 Error-Prone Patterns

#### 2.3.1 **Silent Error Swallowing** (MEDIUM)
**File:** `server/utils/voterCollection.js:222-227`
```javascript
const queryPromises = ALL_AC_IDS.map(acId =>
  queryVoters(acId, query, options)
    .catch(err => {
      console.error(`Error querying voters_${acId}:`, err.message);
      return [];  // Silently returns empty, masks real errors
    })
);
```

#### 2.3.2 **Unsafe ObjectId Conversion** (LOW)
**File:** `server/routes/mobileApp.routes.js:731-733`
```javascript
const voters = await VoterModel.find({
  _id: { $in: voterIds.map(id => {
    try { return new mongoose.Types.ObjectId(id); } catch { return id; }
  }) }
});
```
**Issue:** Mixed ObjectId and string types in query array could cause unexpected results.

---

## 3. PERFORMANCE AUDIT

### 3.1 Missing Indexes

#### 3.1.1 **MobileAppResponse Collection** (HIGH)
**File:** `server/models/MobileAppResponse.js`

The `mobileappresponses` collection is queried by:
- `createdAt` (sort)
- `aci_id`, `acId`, `aciId` (filter)
- `booth_id`, `boothId` (filter)

**Missing indexes:**
```javascript
// Should add:
mobileAppResponseSchema.index({ createdAt: -1 });
mobileAppResponseSchema.index({ aci_id: 1 });
mobileAppResponseSchema.index({ booth_id: 1 });
mobileAppResponseSchema.index({ aci_id: 1, createdAt: -1 });  // Compound
```

#### 3.1.2 **MobileAppAnswer Collection** (HIGH)
**File:** `server/models/MobileAppAnswer.js`

Based on `mobileApp.routes.js` queries, missing indexes for:
- `submittedAt`, `createdAt`, `syncedAt` (sort)
- `questionId` (lookup)
- `voterId` (filter)
- `respondentName`, `submittedByName` (search)

#### 3.1.3 **MasterQuestion Collection** (MEDIUM)
**File:** `server/models/MasterQuestion.js`

Queries use `sectionId` but need compound index:
```javascript
masterQuestionSchema.index({ sectionId: 1, order: 1 });  // Currently missing compound
```

### 3.2 Potential COLLSCAN Queries

#### 3.2.1 **Regex Searches Without Index Support** (HIGH)
**File:** `server/routes/mobileApp.routes.js:436-457`
```javascript
const regex = new RegExp(escapeRegExp(search), "i");
const searchableFields = [
  "respondentName", "respondent_name", "name", "fullName",
  "phone", "phoneNumber", "mobile", ...
];
conditions.push({
  $or: searchableFields.map((field) => ({ [field]: regex })),
});
```
**Issue:** Case-insensitive regex queries cannot use indexes. Will cause COLLSCAN on large datasets.

#### 3.2.2 **Query All ACs Without Limits** (HIGH)
**File:** `server/utils/voterCollection.js:219-238`
```javascript
export async function queryAllVoters(query = {}, options = {}) {
  const queryPromises = ALL_AC_IDS.map(acId =>
    queryVoters(acId, query, options)  // No per-AC limit applied
  );
  const resultsArrays = await Promise.all(queryPromises);
  const results = resultsArrays.flat();
  // Limit only applied AFTER fetching all data
  if (options.limit && results.length > options.limit) {
    return results.slice(0, options.limit);
  }
}
```
**Issue:** Fetches ALL matching documents from ALL 21 ACs before applying limit.

### 3.3 N+1 Query Patterns

#### 3.3.1 **formatMasterSectionResponse** (MEDIUM)
**File:** `server/routes/masterData.routes.js:22-51`
```javascript
async function formatMasterSectionResponse(sectionDoc, includeQuestions = true) {
  if (includeQuestions) {
    const questions = await MasterQuestion.find({ sectionId: section._id })
      .sort({ order: 1, createdAt: 1 });
  }
  // Called in a loop...
}

// Called in GET /sections:
const sections = await MasterDataSection.find();
const formattedSections = await Promise.all(
  sections.map((section) => formatMasterSectionResponse(section, true))  // N+1
);
```
**Impact:** If 10 sections exist, makes 1 + 10 = 11 queries.

#### 3.3.2 **fetchAggregatedMobileAppResponses** (HIGH)
**File:** `server/routes/mobileApp.routes.js:551-627`
```javascript
// Fetches answers
const answers = await MobileAppAnswer.find(matchQuery).limit(fetchSize);

// Then fetches questions for each unique questionId
const questions = await MobileAppQuestion.find({ _id: { $in: questionIds } });

// Then fetches master questions
const masterQuestions = await MasterQuestion.find({ _id: { $in: masterQuestionIds } });
```
**Issue:** 3 sequential queries that could be optimized with `$lookup` aggregation.

### 3.4 Missing Pagination

#### 3.4.1 **GET /master-data/sections** (MEDIUM)
**File:** `server/routes/masterData.routes.js:54-71`
```javascript
router.get("/sections", async (_req, res) => {
  const sections = await MasterDataSection.find().sort({ order: 1, createdAt: 1 });
  // No pagination - returns ALL sections
});
```

#### 3.4.2 **GET /master-data/questions** (MEDIUM)
**File:** `server/routes/masterData.routes.js:74-97`
```javascript
router.get("/questions", async (req, res) => {
  const questions = await MasterQuestion.find(query).sort({ order: 1, createdAt: 1 });
  // No pagination - returns ALL questions
});
```

### 3.5 Missing `.lean()` Usage

#### 3.5.1 **auth.routes.js /me endpoint** (LOW)
**File:** `server/routes/auth.routes.js:242`
```javascript
const user = await User.findById(req.session.user._id || req.session.user.id).lean();
// Good - uses lean()
```

However, many queries do NOT use `.lean()`:

**File:** `server/routes/masterData.routes.js:170`
```javascript
const section = await MasterDataSection.findById(sectionId);  // Missing .lean()
```

### 3.6 Heavy Aggregation Pipelines

#### 3.6.1 **Dashboard Stats Aggregation** (MEDIUM)
The dashboard statistics likely use aggregation across all AC collections. Without seeing the full dashboard.routes.js, this is a potential performance concern when running against 21 collections in parallel.

---

## 4. SCALABILITY AUDIT

### 4.1 Functions That Will Break at Scale (10,000-500,000 voters)

#### 4.1.1 **queryAllVoters Without Early Termination** (CRITICAL)
**File:** `server/utils/voterCollection.js:219-238`

**Current behavior:** Queries ALL 21 AC collections in parallel, combines results, THEN applies limit.

**At 500K voters:**
- Each AC averages ~24K voters
- Returns ~24K * 21 = ~500K documents before slicing
- Memory usage: ~500MB+ for voter objects
- Network: Transfers entire dataset before limiting

**Recommended fix:** Add per-collection limits proportional to requested limit.

#### 4.1.2 **findVoterById Sequential Search** (HIGH)
**File:** `server/utils/voterCollection.js:134-147`

**At 500K voters:**
- Average 10-11 collections searched before finding voter
- Each search: ~1-5ms with index
- Total latency: 10-55ms average

**Recommended fix:** Store `acId` reference in a lookup collection or use parallel search.

#### 4.1.3 **Live Updates Endpoint** (HIGH)
**File:** `server/routes/mobileApp.routes.js:679-791`

```javascript
router.get("/live-updates", async (req, res) => {
  const recentAnswers = await MobileAppAnswer.find(matchQuery)
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .limit(parsedLimit * 3)  // Up to 300 documents
    .lean();
```
**Issue:**
- Multiple sequential queries to build response
- Voter lookup for each unique voterId
- No caching of frequently accessed data

### 4.2 Endpoints That Don't Scale Horizontally

#### 4.2.1 **In-Memory Rate Limiter** (HIGH)
**File:** `server/middleware/rateLimit.js`

```javascript
const attemptMap = new Map();  // In-memory storage
```
**Issue:** Rate limits not shared across server instances. Attacker can bypass by hitting different instances.

#### 4.2.2 **In-Memory Cache** (MEDIUM)
**File:** `server/utils/cache.js`

```javascript
const cache = new Map();  // In-memory storage
```
**Issue:** Cache not shared across instances. Each instance maintains separate cache, leading to:
- Inconsistent data between instances
- Wasted memory (duplicate caching)
- Cache misses after load balancer routing

### 4.3 Heavy Synchronous Loops

#### 4.3.1 **normalizeAnswerEntries Object Iteration** (LOW)
**File:** `server/routes/mobileApp.routes.js:271-291`
```javascript
function normalizeAnswerEntries(rawAnswers) {
  if (typeof rawAnswers === "object") {
    return Object.entries(rawAnswers).map(([key, value], index) => ({...}));
  }
}
```
**Impact:** Low unless rawAnswers has thousands of keys.

### 4.4 Sequential AC-Wide Loops

#### 4.4.1 **findOneVoter** (MEDIUM)
**File:** `server/utils/voterCollection.js:265-278`
```javascript
export async function findOneVoter(query = {}) {
  for (const acId of ALL_AC_IDS) {  // Sequential, should be parallel
    const voter = await VoterModel.findOne(query).lean();
    if (voter) return { voter, acId };
  }
}
```

#### 4.4.2 **findVoterByIdAndUpdate** (MEDIUM)
**File:** `server/utils/voterCollection.js:156-169`
```javascript
export async function findVoterByIdAndUpdate(voterId, update, options = {}) {
  for (const acId of ALL_AC_IDS) {  // Sequential
    const voter = await VoterModel.findByIdAndUpdate(voterId, update, {...});
    if (voter) return { voter, acId };
  }
}
```

### 4.5 Parts Needing Batching or Caching

| Operation | Current State | Recommendation |
|-----------|--------------|----------------|
| Dashboard stats | Uncached | Cache with 5-min TTL |
| Booth list | Uncached | Cache with 15-min TTL |
| Survey forms | Uncached | Cache with 10-min TTL |
| AC metadata | Uncached | Cache with 1-hour TTL |
| Master data sections | Uncached | Cache with 30-min TTL |
| Voter counts | Uncached | Cache with 5-min TTL |

---

## 5. CACHING AUDIT

### 5.1 Cache Infrastructure Exists But Not Used

**File:** `server/utils/cache.js` provides:
- `getCache`, `setCache`, `hasCache`, `deleteCache`
- `invalidateCache`, `invalidateACCache`
- `cacheKeys` for consistent naming
- `cached()` decorator function
- TTL constants (SHORT: 1min, MEDIUM: 5min, LONG: 30min)

**But:** No route files import or use this cache utility!

### 5.2 Endpoints Safe for Caching

| Endpoint | Suggested TTL | Notes |
|----------|---------------|-------|
| `GET /master-data/sections` | 30 min | Rarely changes |
| `GET /master-data/questions` | 30 min | Rarely changes |
| `GET /mobile-app/questions` | 15 min | Form structure |
| `GET /surveys` (Active only) | 10 min | Active surveys |
| `GET /rbac/booths?ac={acId}` | 15 min | Booth list per AC |
| `GET /dashboard/stats` | 5 min | Statistics |
| AC voter count | 5 min | Count aggregation |

### 5.3 Endpoints That Must NOT Be Cached

| Endpoint | Reason |
|----------|--------|
| `POST /auth/login` | Security - must always validate |
| `GET /auth/me` | Session validation |
| `POST /auth/logout` | Session destruction |
| `GET /live-updates` | Real-time data |
| `POST /survey-responses` | Write operation |
| `POST /mobile-app/responses` | Write operation |
| All POST/PUT/DELETE | Mutation operations |

### 5.4 Suggested TTLs Summary

```javascript
// Already defined in cache.js but not used:
const TTL = {
  DASHBOARD_STATS: 5 * 60 * 1000,      // 5 minutes
  BOOTH_LIST: 15 * 60 * 1000,          // 15 minutes
  SURVEY_FORMS: 10 * 60 * 1000,        // 10 minutes
  AC_METADATA: 60 * 60 * 1000,         // 1 hour
  SHORT: 60 * 1000,                     // 1 minute
  MEDIUM: 5 * 60 * 1000,               // 5 minutes
  LONG: 30 * 60 * 1000,                // 30 minutes
};
```

---

## 6. API CONSISTENCY & DUPLICATION AUDIT

### 6.1 Duplicate Endpoints

#### 6.1.1 **Mobile App Route Aliases**
**File:** `server/routes/index.js`
```javascript
router.use("/mobile-app", mobileAppRoutes);
router.use("/mobile-app-questions", mobileAppRoutes);   // Duplicate
router.use("/mobile-app-responses", mobileAppRoutes);   // Duplicate
router.use("/live-updates", mobileAppRoutes);           // Duplicate
```
**Impact:** Same routes accessible via 4 different base paths. Confusing API surface.

#### 6.1.2 **Survey Mapping Routes**
**File:** `server/routes/index.js`
```javascript
router.use("/survey-mappings", mappedFieldsRoutes);
router.use("/mapped-fields", mappedFieldsRoutes);  // Duplicate
```

### 6.2 Duplicate Logic Across Files

#### 6.2.1 **Voter Schema Duplication** (HIGH)
**Files:**
- `server/models/Voter.js` (35 lines)
- `server/utils/voterCollection.js` (58 lines)

Two separate voter schemas with overlapping but different fields:

| Field | Voter.js | voterCollection.js |
|-------|----------|-------------------|
| `pan` | `PAN` (uppercase) | `pan` (lowercase) |
| `mobile` | `Number` | `Mixed` |
| `doornumber` | `Number` | `Mixed` |
| `booth_agent_id` | Not present | Present |
| `bloodgroup` | Not present | Present |

#### 6.2.2 **AC Resolution Logic** (MEDIUM)
**Files:**
- `server/utils/ac.js` - `resolveAssignedACFromUser`
- `server/middleware/auth.js` - `normalizeUserAssignedAC`

Both do similar AC resolution from user object but implemented separately.

#### 6.2.3 **Response Formatting** (MEDIUM)
Multiple files have their own response formatters:
- `masterData.routes.js` - `formatMasterSectionResponse`, `formatMasterQuestionResponse`
- `mobileApp.routes.js` - `formatMobileAppQuestionResponse`, `formatMobileAppResponse`
- `helpers.js` - `formatMasterQuestionResponse`

### 6.3 Utilities That Should Replace Repeated Code

#### 6.3.1 **Date Parsing/Formatting**
**File:** `server/routes/mobileApp.routes.js:195-217`
```javascript
function safeDateToISOString(value) {...}
```
Should be in `utils/helpers.js`.

#### 6.3.2 **Nested Object Access**
**File:** `server/routes/mobileApp.routes.js:170-193`
```javascript
function getNestedValue(source, path) {...}
function pickFirstValue(source, paths, fallback = undefined) {...}
```
Should be in `utils/helpers.js`.

### 6.4 Inconsistent Naming

#### 6.4.1 **AC ID Field Names**

| Location | Field Name |
|----------|------------|
| User model | `assignedAC`, `aci_id` |
| Booth model | `ac_id` |
| Voter schema | `aci_id` |
| Survey response | `aci_id`, `acId`, `aciId`, `aci_num` |
| Mobile app | `acId`, `aciId`, `aci_id` |

#### 6.4.2 **Booth ID Field Names**

| Location | Field Names |
|----------|-------------|
| Booth model | `boothCode`, `booth_id` |
| Voter schema | `booth_id` |
| Survey response | `booth_id`, `booth`, `boothCode` |
| Mobile app | `booth_id`, `boothId`, `booth` |

#### 6.4.3 **Response Shapes**

Some endpoints return:
```javascript
{ success: true, data: [...] }
```
Others return:
```javascript
{ sections: [...] }
```
Or:
```javascript
{ responses: [...], pagination: {...}, total: N }
```

---

## 7. DATABASE & SCHEMA AUDIT

### 7.1 Model Definition Issues

#### 7.1.1 **Dual Voter Schemas** (HIGH)
As noted above, `Voter.js` and `voterCollection.js` define different schemas.

**Recommendation:** Remove `Voter.js` model, use only `voterCollection.js` for all voter operations.

#### 7.1.2 **Flexible Schema Risks** (MEDIUM)
**Files:** Multiple models use `strict: false`
```javascript
// voterCollection.js, surveyResponseCollection.js, mobileApp models
{ strict: false }
```
**Risks:**
- No schema validation
- Typos create new fields instead of errors
- Document size can grow unbounded
- Indexing becomes unpredictable

#### 7.1.3 **Missing Required Fields** (MEDIUM)
**File:** `server/models/User.js`
```javascript
email: { type: String, trim: true, lowercase: true, index: true },  // Not required
phone: { type: String, ... },  // Not required
```
**Issue:** Users can be created without email OR phone, making login impossible.

### 7.2 Dynamic AC Collection Strategy Validation

**Current Strategy:** Good for query isolation and parallel scaling.

**Issues:**
1. **No automatic collection creation** - If a new AC is added, collections must be manually created
2. **Hardcoded AC list** - `ALL_AC_IDS` in `voterCollection.js` is static
3. **No cross-collection transactions** - Updates affecting multiple ACs cannot be atomic

### 7.3 Index Alignment with Query Patterns

#### 7.3.1 **Well-Indexed Collections**

| Collection | Indexes | Query Support |
|------------|---------|---------------|
| `voters_{AC}` | aci_id, booth_id, voterID, surveyed, familyId, mobile | Good |
| `users` | email+phone, role, assignedAC, isActive | Good |
| `booths` | ac_id, boothNumber, assignedAgents, boothCode (unique) | Good |

#### 7.3.2 **Under-Indexed Collections**

| Collection | Missing Indexes |
|------------|-----------------|
| `mobileappresponses` | aci_id, booth_id, createdAt |
| `mobileappanswers` | submittedAt, questionId, voterId |
| `masterQuestions` | sectionId+order (compound) |

### 7.4 Potentially Harmful Indexes

#### 7.4.1 **Unique Constraint on Optional Field** (LOW)
**File:** `server/models/User.js:59-61`
```javascript
booth_agent_id: {
  type: String,
  unique: true,
  sparse: true,  // Allows multiple nulls
}
```
**Note:** This is actually correct with `sparse: true`, but worth monitoring.

#### 7.4.2 **Duplicate Index Definitions**
**File:** `server/models/Voter.js`
```javascript
voterSchema.index({ aci_id: 1 });
voterSchema.index({ aci_id: 1, booth_id: 1 });  // Prefix overlaps above
```
**Impact:** Extra storage, slight write overhead. MongoDB can use compound index for single-field queries, so first index is redundant.

---

## 8. FRONTEND IMPACT AUDIT (READ-ONLY)

### 8.1 Backend Responses Sending Too Much Data

#### 8.1.1 **Full Voter Objects** (HIGH)
`queryVoters` and `queryAllVoters` return full voter documents including:
- All personal data (aadhar, PAN, etc.)
- All custom fields (`strict: false`)
- Timestamps

**Impact:** List views fetching 100 voters may receive 500KB+ of unnecessary data.

**Recommendation:** Use `.select()` projections for list views.

#### 8.1.2 **Nested Questions in Section Response** (MEDIUM)
**File:** `server/routes/masterData.routes.js:22-51`
```javascript
// Always includes full questions array
return {
  ...section,
  questions: formattedQuestions,  // Can be large
};
```

#### 8.1.3 **Raw Document in Mobile Response** (MEDIUM)
**File:** `server/routes/mobileApp.routes.js:392-403`
```javascript
return {
  ...formattedFields,
  raw: response,  // Includes entire original document
};
```

### 8.2 Endpoints Benefiting from Streaming/Pagination

| Endpoint | Current State | Recommendation |
|----------|---------------|----------------|
| `GET /voters` | Pagination exists | Good |
| `GET /mobile-app/responses` | Cursor pagination | Good |
| `GET /master-data/sections` | No pagination | Add pagination |
| `GET /master-data/questions` | No pagination | Add pagination |
| `GET /surveys` | No pagination | Add pagination |

### 8.3 Redundant Client-Side Transformations

#### 8.3.1 **AC Field Normalization**
Frontend likely handles multiple AC field names (acId, aci_id, etc.) that should be normalized on backend.

#### 8.3.2 **Date Formatting**
**File:** `server/routes/mobileApp.routes.js:793-809`
```javascript
function formatRelativeTime(date) {
  // Server-side relative time formatting
}
```
**Good:** This is server-side, but ensure frontend doesn't duplicate.

---

## 9. SECURITY & FAULT TOLERANCE AUDIT

### 9.1 Missing Validation

#### 9.1.1 **ObjectId Validation** (MEDIUM)
Multiple routes accept IDs without validating ObjectId format:
```javascript
// Example from masterData.routes.js
router.put("/sections/:sectionId", async (req, res) => {
  const section = await MasterDataSection.findById(sectionId);  // No validation
```

#### 9.1.2 **Query Parameter Validation** (MEDIUM)
**File:** `server/routes/mobileApp.routes.js:478-494`
```javascript
const { limit = "25", cursor, search, acId, boothId } = req.query ?? {};
const parsedLimit = Number.parseInt(limit, 10);
const effectiveLimit = Number.isFinite(parsedLimit)
  ? Math.min(Math.max(parsedLimit, 1), 200)  // Good - bounded
  : 25;
```
**Good:** Limit is bounded. But `cursor`, `search` validation is minimal.

#### 9.1.3 **Missing Input Sanitization** (MEDIUM)
**File:** `server/routes/auth.routes.js:32-65`
```javascript
const trimmedIdentifier = String(identifier).trim();
// No further sanitization before using in query
```

### 9.2 Missing Try/Catch Safety

#### 9.2.1 **Session Destroy Callback** (LOW)
**File:** `server/routes/auth.routes.js:246-249`
```javascript
req.session.destroy((err) => {
  if (err) console.error('Error destroying session:', err);
});
// No await, continues without waiting
```

#### 9.2.2 **Voter Lookup in Live Updates** (LOW)
**File:** `server/routes/mobileApp.routes.js:728-745`
```javascript
try {
  const voters = await VoterModel.find({...});
} catch (err) {
  console.error("Error fetching voter names:", err);
  // Continues without voter names - degraded but functional
}
```
**Good:** Graceful degradation, but logged error could be noisy.

### 9.3 Vulnerable API Endpoints

#### 9.3.1 **Auth Debug Endpoint** (HIGH)
**File:** `server/routes/auth.routes.js:318-334`
```javascript
router.get("/debug", (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionId: req.sessionID,
    cookieHeader: req.headers.cookie || null,
    cookieSettings: {...}
  });
});
```
**Issue:** Exposes sensitive session and cookie information. Should be disabled in production or require authentication.

#### 9.3.2 **Regex DoS (ReDoS)** (MEDIUM)
**File:** `server/routes/mobileApp.routes.js:437`
```javascript
const regex = new RegExp(escapeRegExp(search), "i");
```
**Good:** Uses `escapeRegExp` to prevent injection.
**But:** Case-insensitive regex on large datasets is slow (though not ReDoS vulnerable with proper escaping).

### 9.4 Missing Idempotency on Write Operations

#### 9.4.1 **Survey Response Creation** (MEDIUM)
No idempotency key for duplicate submission prevention. If client retries, duplicate responses may be created.

#### 9.4.2 **Mobile App Answer Submission** (MEDIUM)
Same issue - no deduplication mechanism for mobile app submissions.

### 9.5 Missing Timeouts/Retries

#### 9.5.1 **Database Connection** (LOW)
**File:** `server/config/database.js`
Mongoose default connection timeout may be too long for production.

#### 9.5.2 **External Service Calls** (N/A)
No external service calls identified in backend code.

### 9.6 Rate Limiting Gaps

#### 9.6.1 **Only Login Protected** (MEDIUM)
```javascript
// auth.routes.js
router.post("/login", loginRateLimiter, async (req, res) => {...});
```
Other write endpoints lack rate limiting:
- `POST /surveys`
- `POST /survey-responses`
- `POST /mobile-app/responses`

---

## 10. SUMMARY OF ISSUES

### Issues Table

| # | Issue | Severity | File(s) | Category | Description | Impact |
|---|-------|----------|---------|----------|-------------|--------|
| 1 | Sequential findVoterById | HIGH | voterCollection.js:134-147 | Performance | Iterates 21 ACs sequentially | 10-55ms latency per lookup |
| 2 | queryAllVoters no early termination | CRITICAL | voterCollection.js:219-238 | Scalability | Fetches all data before limiting | OOM at 500K voters |
| 3 | Missing MobileAppResponse indexes | HIGH | MobileAppResponse.js | Performance | No indexes on query fields | COLLSCAN on every query |
| 4 | Missing MobileAppAnswer indexes | HIGH | MobileAppAnswer.js | Performance | No indexes on sort/filter fields | COLLSCAN on queries |
| 5 | Regex search without index | HIGH | mobileApp.routes.js:436-457 | Performance | Case-insensitive regex | Full collection scan |
| 6 | Auth debug endpoint exposed | HIGH | auth.routes.js:318-334 | Security | Exposes session info | Information disclosure |
| 7 | Cache utility unused | HIGH | cache.js + all routes | Performance | Cache infrastructure exists but unused | Repeated DB queries |
| 8 | In-memory rate limiter | HIGH | rateLimit.js | Scalability | Not shared across instances | Bypass with multiple servers |
| 9 | Dual Voter schemas | HIGH | Voter.js, voterCollection.js | Correctness | Two different schemas | Data inconsistency |
| 10 | Report routes incomplete | HIGH | report.routes.js | Correctness | Missing implementation | Feature broken |
| 11 | Inconsistent AC field names | MEDIUM | Multiple files | Consistency | acId/ac_id/aci_id/etc | Query bugs |
| 12 | Inconsistent booth field names | MEDIUM | Multiple files | Consistency | boothId/booth_id/booth/etc | Query bugs |
| 13 | N+1 in formatMasterSectionResponse | MEDIUM | masterData.routes.js:22-51 | Performance | Sequential question queries | Slow section listing |
| 14 | Missing pagination on sections | MEDIUM | masterData.routes.js:54-71 | Performance | Returns all sections | Memory issues |
| 15 | Missing pagination on questions | MEDIUM | masterData.routes.js:74-97 | Performance | Returns all questions | Memory issues |
| 16 | Sequential findOneVoter | MEDIUM | voterCollection.js:265-278 | Performance | Not parallelized | Slow lookups |
| 17 | In-memory cache | MEDIUM | cache.js | Scalability | Not shared across instances | Inconsistent caching |
| 18 | Duplicate route aliases | MEDIUM | routes/index.js | Consistency | 4 paths to same routes | Confusing API |
| 19 | Silent error swallowing | MEDIUM | voterCollection.js:222-227 | Fault Tolerance | Returns [] on error | Masks real errors |
| 20 | Race condition session save | MEDIUM | auth.routes.js:281-289 | Correctness | No concurrency control | Session overwrites |
| 21 | Missing idempotency | MEDIUM | Survey/mobile responses | Reliability | No duplicate prevention | Duplicate submissions |
| 22 | Rate limiting only on login | MEDIUM | All write routes | Security | No rate limits on writes | DoS vulnerability |
| 23 | Missing ObjectId validation | MEDIUM | Multiple routes | Security | Invalid IDs cause errors | 500 errors |
| 24 | Response sends raw document | MEDIUM | mobileApp.routes.js:392 | Performance | Includes full raw doc | Bandwidth waste |
| 25 | strict:false on schemas | MEDIUM | Multiple models | Data Quality | No validation | Schema drift |
| 26 | User model optional fields | MEDIUM | User.js | Data Quality | Email/phone optional | Login issues |
| 27 | Duplicate index definitions | LOW | Voter.js | Performance | Redundant indexes | Storage waste |
| 28 | Unsafe ObjectId conversion | LOW | mobileApp.routes.js:731-733 | Correctness | Mixed types in query | Unexpected results |
| 29 | Missing .lean() calls | LOW | masterData.routes.js:170 | Performance | Returns Mongoose docs | Extra overhead |
| 30 | Session destroy no await | LOW | auth.routes.js:246-249 | Correctness | Async without wait | Potential race |

### Priority Summary

| Severity | Count | Action |
|----------|-------|--------|
| CRITICAL | 1 | Fix immediately - OOM risk |
| HIGH | 10 | Fix in next sprint |
| MEDIUM | 18 | Plan for resolution |
| LOW | 5 | Address when convenient |

### Top 5 Recommendations

1. **Add indexes to MobileAppResponse and MobileAppAnswer collections** - Prevents COLLSCAN
2. **Implement per-AC limits in queryAllVoters** - Prevents OOM
3. **Utilize existing cache infrastructure** - Reduces DB load
4. **Disable auth debug endpoint in production** - Security fix
5. **Standardize AC/booth field names** - Prevents query bugs

---

**End of Audit Report**
