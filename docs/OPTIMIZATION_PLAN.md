# Backend Optimization Plan

## Phase 2: Actionable Optimization Plan

### Priority 1: Family Endpoint (Critical - 10s -> <1s target)

**File:** `server/routes/family.routes.js`

**Changes:**
1. Move pagination into MongoDB aggregation pipeline using `$skip` and `$limit`
2. Move search filter into MongoDB using `$match` with regex
3. Add `$facet` for parallel count + paginated results
4. Use projection to limit voter fields in $push
5. Add caching for family count per booth

**Expected Improvement:** 10s -> 500ms (95% reduction)

---

### Priority 2: Fields Existing Endpoint (High - 3.7s -> <500ms target)

**File:** `server/routes/voter.routes.js`

**Changes:**
1. Sample only from voters_111 (has 10k voters) instead of all ACs
2. Add projection to only fetch field names, not values
3. Cache the field list with 30-minute TTL
4. Use `findOne` with projection instead of `queryAllVoters`

**Expected Improvement:** 3.7s -> 200ms (94% reduction)

---

### Priority 3: Dashboard Stats Endpoint (High - 1.4s -> <500ms target)

**File:** `server/routes/rbac.js`

**Changes:**
1. Add caching for L0 dashboard stats with 5-minute TTL
2. Simplify buildDashboardAnalytics for initial load
3. Move heavy analytics to separate endpoint (lazy load)
4. Use pre-computed counts where possible

**Expected Improvement:** 1.4s -> 400ms (70% reduction)

---

### Priority 4: AC Overview Endpoint (Medium - 1.3s -> <500ms target)

**File:** `server/routes/rbac.js`

**Changes:**
1. Add caching for L0 AC overview with 5-minute TTL
2. Use MongoDB aggregation for user counts instead of in-memory loop
3. Parallelize voter and user queries

**Expected Improvement:** 1.3s -> 400ms (70% reduction)

---

## Implementation Summary

| Endpoint | Current | Target | Technique |
|----------|---------|--------|-----------|
| /api/families/:acId | 10s | <1s | DB pagination, $facet, caching |
| /api/voters/fields/existing | 3.7s | <500ms | Projection, single-AC sampling, caching |
| /api/rbac/dashboard/stats | 1.4s | <500ms | L0 caching, lazy analytics |
| /api/rbac/dashboard/ac-overview | 1.3s | <500ms | L0 caching, aggregation optimization |

## Cache Strategy

| Cache Key | TTL | Invalidation |
|-----------|-----|--------------|
| `ac:{acId}:families:count` | 15 min | On voter add/delete |
| `ac:{acId}:families:page:{page}` | 5 min | On voter add/delete |
| `global:fields:existing` | 30 min | On field add/delete |
| `L0:dashboard:stats` | 5 min | Time-based |
| `L0:ac:overview` | 5 min | Time-based |
