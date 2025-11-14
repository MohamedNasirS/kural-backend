# Dashboard Statistics Implementation

## Overview
This document describes the implementation of dynamic dashboard statistics for the Kural App, which fetches real-time data from the MongoDB database instead of using hardcoded values.

## Changes Made

### 1. Backend API Changes (`server/index.js`)

Updated the `/api/dashboard/stats/:acId` endpoint to include:

- **Total Families**: Count of unique families (grouped by address, guardian, and booth)
- **Total Members**: Count of all voters in the constituency
- **Surveyed Members**: Count of voters where `surveyed === true`
- **Pending Members**: Count of voters where `surveyed !== true` or field doesn't exist
- **Surveys Completed**: Count of families where ALL members have been surveyed

#### API Response Structure

```json
{
  "acIdentifier": "THONDAMUTHUR",
  "acId": 119,
  "acName": "THONDAMUTHUR",
  "acNumber": 119,
  "totalVoters": 20001,
  "totalFamilies": 4761,
  "totalMembers": 20001,
  "surveyedMembers": 3,
  "pendingMembers": 19998,
  "surveysCompleted": 1,
  "totalBooths": 89,
  "boothStats": [...]
}
```

#### Implementation Details

**Family Aggregation with Survey Status:**
```javascript
const familiesAggregation = await Voter.aggregate([
  { $match: acQuery },
  {
    $group: {
      _id: {
        address: "$address",
        guardian: "$guardian",
        booth_id: "$booth_id",
      },
      members: { $push: { voterID: "$voterID", surveyed: "$surveyed" } },
      totalMembers: { $sum: 1 },
      surveyedCount: {
        $sum: {
          $cond: [{ $eq: ["$surveyed", true] }, 1, 0]
        }
      }
    },
  },
  {
    $project: {
      _id: 1,
      totalMembers: 1,
      surveyedCount: 1,
      allSurveyed: { $eq: ["$totalMembers", "$surveyedCount"] }
    }
  }
]);
```

**Counting Surveyed and Pending Members:**
```javascript
// Surveyed members
const surveyedMembers = await Voter.countDocuments({
  ...acQuery,
  surveyed: true
});

// Pending members
const pendingMembers = await Voter.countDocuments({
  ...acQuery,
  $or: [
    { surveyed: { $ne: true } },
    { surveyed: { $exists: false } }
  ]
});
```

**Families with All Members Surveyed:**
```javascript
const completedSurveys = familiesAggregation.filter(
  family => family.allSurveyed === true
).length;
```

### 2. Database Model Changes (`server/models/Voter.js`)

Added the `surveyed` field to the Voter schema:

```javascript
const voterSchema = new mongoose.Schema({
  // ... existing fields ...
  surveyed: {
    type: Boolean,
    default: false
  },
  // ... rest of fields ...
}, {
  timestamps: true
});
```

### 3. Frontend Changes (`src/pages/l2/Dashboard.tsx`)

Updated the dashboard to display the new statistics:

#### New Dashboard Layout

**Primary Metrics (4 cards):**
1. Total Families
2. Total Members
3. Surveyed Members (with UserCheck icon)
4. Pending Members (with UserX icon)

**Secondary Metrics (3 cards):**
1. Surveys Completed (families with all members surveyed)
2. Total Booths
3. Completion Rate (calculated percentage)

#### Updated Interface

```typescript
interface DashboardStats {
  acIdentifier: string | null;
  acId: number | null;
  acName: string | null;
  acNumber: number | null;
  totalVoters: number;
  totalFamilies: number;
  totalMembers: number;
  surveyedMembers: number;
  pendingMembers: number;
  surveysCompleted: number;
  totalBooths: number;
  boothStats: Array<{...}>;
}
```

#### Completion Rate Calculation

```typescript
<StatCard 
  title="Completion Rate" 
  value={loading ? "Loading..." : stats?.totalMembers ? 
    `${Math.round((stats.surveyedMembers / stats.totalMembers) * 100)}%` : '0%'
  } 
  icon={Activity} 
  variant="success" 
/>
```

## Testing

### Test Script (`server/scripts/testDashboardStats.js`)

Created a comprehensive test script that validates:
- Total member count
- Surveyed member count
- Pending member count
- Family aggregation
- Survey completion tracking
- Booth-wise statistics

**Test Results for AC 119 (Thondamuthur):**
```
Total Members: 20001
Surveyed Members: 3
Pending Members: 29998
Total Families: 4761
Surveys Completed: 1
Completion Rate: 0.01%
Family Completion Rate: 0.02%
```

### Running the Test

```bash
cd server
node scripts/testDashboardStats.js
```

## API Endpoints

### Get Dashboard Statistics
```
GET /api/dashboard/stats/:acId
```

**Parameters:**
- `acId`: Assembly Constituency identifier (number or name)

**Response:** See API Response Structure above

## Key Features

1. **Dynamic Data**: All statistics are calculated in real-time from the database
2. **No Hardcoded Values**: Values update automatically when data changes
3. **Family-Based Tracking**: Surveys are tracked at both individual and family levels
4. **Completion Tracking**: Know exactly which families have completed surveys
5. **Flexible Queries**: Support for both AC number and AC name lookups

## Database Fields

### Required Fields for Statistics

- `surveyed` (Boolean): Indicates if a voter has been surveyed
- `address` (String): Used for family grouping
- `guardian` (String): Used for family grouping
- `booth_id` (String): Used for family grouping
- `aci_id` / `aci_num` (Number): Assembly constituency identifier
- `aci_name` (String): Assembly constituency name

## Usage Example

The dashboard automatically fetches statistics when loaded:

```typescript
useEffect(() => {
  fetchDashboardStats();
}, [acIdentifier]);

const fetchDashboardStats = async () => {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/stats/${encodeURIComponent(acIdentifier)}`,
    { credentials: 'include' }
  );
  const data = await response.json();
  setStats(data);
};
```

## Future Enhancements

1. **Real-time Updates**: Add WebSocket support for live statistics updates
2. **Historical Trends**: Track survey completion over time
3. **Agent Performance**: Track which agents completed which surveys
4. **Filtering**: Add filters for date ranges, booths, etc.
5. **Export**: Add ability to export statistics as CSV/PDF

## Notes

- The `surveyed` field defaults to `false` for new voters
- Families are identified by unique combinations of address, guardian, and booth
- A family is marked as "completed" only when ALL members are surveyed
- Statistics are calculated on each API request for accuracy
- Consider adding caching for large datasets in future

## Server Management

To restart the server with the new changes:

```powershell
# Stop any running node processes on port 4000
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <ProcessId> -Force

# Start the server
cd server
node index.js
```

Or from the root directory:
```powershell
node server/index.js
```

## Verification

1. Check server is running: `http://localhost:4000` should respond
2. Test API endpoint: `http://localhost:4000/api/dashboard/stats/119`
3. Open dashboard in browser: `http://localhost:5173/l2/dashboard`
4. Verify all statistics load correctly
5. Check that values are not hardcoded (they should change with database updates)
