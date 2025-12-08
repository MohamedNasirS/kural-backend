# Bug List - Deep Testing Report

**Testing Date:** December 8, 2025
**Tested By:** Automated Testing
**Test Environment:** localhost:8080 (Frontend) / localhost:4000 (Backend)
**Last Updated:** December 8, 2025

---

## Fixed Bugs

### BUG-001: Booth Filter Not Working - Voter Manager (L0 & L1)
**Severity:** Critical
**Status:** FIXED
**Location:** L0 Voter Field Manager & L1 AC Family Manager
**URL:** `/l0/voter-field-manager` and `/l1/ac-family-manager`

**Description:**
When selecting a specific booth from the dropdown filter, the table shows "No voters found for the selected filters" even though the dropdown clearly shows the voter count for that booth.

**Root Cause:**
The frontend was sending `String(booth.boothNo)` (e.g., "1") instead of the proper `booth.boothId` (e.g., "BOOTH1-111") to the backend API.

**Fix Applied:**
- Updated `src/pages/l0/VoterFieldManager.tsx` to use `booth.boothId || \`BOOTH${booth.boothNo}-${selectedAC}\`` as the SelectItem value
- Updated `src/pages/l1/ACFamilyManager.tsx` with the same fix
- Added `boothId?: string` to the booth type definitions

---

### BUG-002: Booth Agent Creation - "Booth not found or inactive" Error
**Severity:** Critical
**Status:** FIXED
**Location:** L0 & L2 Booth Agent Management
**URL:** `/shared/booth-agent-management`

**Description:**
When attempting to create a new booth agent, the system returns a 404 error "Booth not found or inactive" even though the booth is visible and selectable in the dropdown.

**Root Cause:**
The backend only searched for active booths (`isActive: true`). If a booth was soft-deleted (inactive) but still had the same boothCode, creating a new booth would fail due to the unique constraint on `boothCode`.

**Fix Applied:**
- Updated `server/routes/rbac.js` to check for inactive booths before creating a new one
- If an inactive booth with the same code exists, it's reactivated instead of creating a duplicate

---

### BUG-003: Survey Form Creation Redirects to Wrong Page
**Severity:** Medium
**Status:** FIXED
**Location:** L0/L1/L2 Survey Forms Builder
**URL:** `/l2/surveys/builder/new`

**Description:**
After successfully creating a survey form, the page redirects to Survey Manager (`/l2/surveys`) instead of Survey Forms (`/l2/survey-forms`).

**Root Cause:**
The `redirectPath` variable in `FormBuilder.tsx` was pointing to the survey manager pages instead of the survey forms pages.

**Fix Applied:**
- Updated `src/pages/l0/FormBuilder.tsx` to redirect to:
  - L0: `/l0/survey-bank`
  - L1: `/l1/survey-forms`
  - L2: `/l2/survey-forms`

---

### BUG-004: Survey Responses Display Question IDs Instead of Text
**Severity:** Medium
**Status:** FIXED
**Location:** L2 ACI Survey Manager View
**URL:** `/l2/surveys`

**Description:**
When viewing survey response details, questions are displayed as numeric IDs (e.g., "1763578321009") instead of the actual question text.

**Root Cause:**
The survey response API was returning raw answers without populating the question text from the survey form definition.

**Fix Applied:**
- Added `populateQuestionText()` helper function to `server/routes/surveyResponse.routes.js`
- The function fetches the survey form and maps questionIds to their actual question text
- Updated both endpoints (`/` and `/:acId`) to populate question text before returning responses

---

## Previously Fixed Bugs

### FIXED-001: AC Restriction for ACI Survey Form Creation
**Status:** FIXED
**Location:** L2 Survey Forms Builder

**Description:**
ACI users can now only create surveys for their assigned AC. The AC selection is automatically set and disabled, preventing ACI from creating surveys for other ACs.

---

### FIXED-002: Booth Dropdown Loading in Add Booth Agent Dialog
**Status:** FIXED
**Location:** L0 & L2 Booth Agent Management

**Description:**
The booth dropdown now loads all booths correctly when the Add Booth Agent dialog is opened. The booth agent creation now works properly (see BUG-002 fix).

---

## Summary

| Bug ID | Description | Severity | Status |
|--------|-------------|----------|--------|
| BUG-001 | Booth Filter Not Working | Critical | **FIXED** |
| BUG-002 | Booth Agent Creation Error | Critical | **FIXED** |
| BUG-003 | Survey Form Redirect | Medium | **FIXED** |
| BUG-004 | Question IDs in Survey View | Medium | **FIXED** |

---

## Files Modified

### Frontend Changes
1. `src/pages/l0/VoterFieldManager.tsx`
   - Line 132: Updated booth type to include `boothId?: string`
   - Line 846: Changed SelectItem value to use `booth.boothId`

2. `src/pages/l1/ACFamilyManager.tsx`
   - Line 42: Updated booth type to include `boothId?: string`
   - Line 175: Changed SelectItem value to use `booth.boothId`

3. `src/pages/l0/FormBuilder.tsx`
   - Lines 81-82: Updated `redirectPath` to correct survey forms URLs

### Backend Changes
1. `server/routes/rbac.js`
   - Lines 901-915: Added logic to check for and reactivate inactive booths

2. `server/routes/surveyResponse.routes.js`
   - Lines 17-64: Added `populateQuestionText()` helper function
   - Lines 210-234, 300-324: Updated response mapping to populate question text

---

## Testing Notes

- Frontend fixes take effect immediately via Vite hot reload
- Backend fixes require server restart to take effect
- Run `node server/index.js` to restart the backend after pulling changes

---

## Verification Report - December 8, 2025

All bugs have been verified as **FIXED** using AC 111 (Mettupalayam) test data.

### Verification Results

| Bug ID | Test Case | Expected Result | Actual Result | Status |
|--------|-----------|-----------------|---------------|--------|
| BUG-001 | Select booth "211-Government Primary School" | Filter voters to 106 | Filtered from 10,003 to 106 voters | **VERIFIED** |
| BUG-002 | Create new booth agent in AC 111 | Agent created successfully | Agent "Test Agent" created with ID BOOTH4-111-1 | **VERIFIED** |
| BUG-003 | Create survey form and submit | Redirect to `/l2/survey-forms` | Correctly redirected to Survey Forms page | **VERIFIED** |
| BUG-004 | View survey response details | Show question text | Shows "Q1: what is your fav num" instead of numeric ID | **VERIFIED** |

### Additional Features Verified

| Feature | Status | Notes |
|---------|--------|-------|
| Activity Logs | Working | Activity table shows logs, summary counts ACI user activities |
| Family Manager | Working | 2,713 families loaded, detail drawer shows members and demographics |
| Mobile App Responses | Working | Page functional, filters work, no data currently in database |
| Survey Manager | Working | Survey responses displayed with question text |

### Test Credentials Used

```
ACI (L2) - AC 111:
  Email: testaci111@test.com
  Password: test123

Super Admin (L0):
  Email: admin@kuralapp.com
  Password: admin123
```
