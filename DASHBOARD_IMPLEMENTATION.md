# Dashboard Statistics - MongoDB Query Implementation

## Overview
This implementation fetches real-time voter statistics for Thondamuthur Assembly Constituency (AC 119) from MongoDB and displays them on the dashboard.

## Changes Made

### 1. Database Model Update (`server/models/Voter.js`)
- Added `aci_num` field to the Voter schema to support the assembly constituency number field
- Now supports both `aci_num` (preferred) and `aci_id` (fallback) for backward compatibility

### 2. API Endpoint Update (`server/index.js`)
- Updated `/api/dashboard/stats/:acId` endpoint to query voters using both `aci_num` and `aci_id`
- Query uses `$or` operator for flexibility: `{ $or: [{ aci_num: acId }, { aci_id: acId }] }`
- Returns:
  - `totalVoters`: Count of all voters for the AC
  - `totalFamilies`: Unique families grouped by address, guardian, and booth_id
  - `surveysCompleted`: Count of active surveys for the AC
  - `totalBooths`: Unique booth count
  - `boothStats`: Array of booth-wise voter statistics (top 10)

### 3. Frontend Dashboard Update (`src/pages/l2/Dashboard.tsx`)
- Replaced hard-coded values with dynamic data from API
- Added state management for stats, loading, and error states
- Implemented `fetchDashboardStats()` function to fetch data on component mount
- Added number formatting with commas for better readability
- Added loading states and error handling with user-friendly messages
- Updated Booth Status Monitor table to display real booth data

### 4. Verification Script (`server/scripts/checkThondamuthurStats.js`)
- Created a utility script to verify database queries
- Tests multiple query methods:
  - `{ aci_num: 119, aci_name: "THONDAMUTHUR" }` (recommended)
  - `{ aci_num: 119 }` (by number only)
  - `{ aci_id: 119 }` (fallback)
- Displays sample document fields to verify data structure
- Shows booth count and family count for verification

## MongoDB Query

### Mongoose (Used in API)
```javascript
const totalVoters = await Voter.countDocuments({ 
  $or: [
    { aci_num: 119 },
    { aci_id: 119 }
  ]
});
```

### MongoDB Shell (Direct Query)
```javascript
db.voters.countDocuments({ aci_num: 119, aci_name: "THONDAMUTHUR" })
```

## Testing

### 1. Test the Verification Script
Run the script to verify your database has the correct data:
```bash
cd server
node scripts/checkThondamuthurStats.js
```

### 2. Start the Backend Server
```bash
cd server
node index.js
```

### 3. Test the API Endpoint
Open your browser or use curl:
```bash
curl http://localhost:4000/api/dashboard/stats/119
```

Expected response:
```json
{
  "acId": 119,
  "totalVoters": 1247,
  "totalFamilies": 342,
  "surveysCompleted": 156,
  "totalBooths": 89,
  "boothStats": [...]
}
```

### 4. Start the Frontend
```bash
npm run dev
```

Navigate to the L2 Dashboard and verify that real data is displayed.

## Data Fields

### Voter Collection Fields Used
- `aci_num`: Assembly Constituency Number (119 for Thondamuthur)
- `aci_id`: Assembly Constituency ID (alternative field)
- `aci_name`: Assembly Constituency Name ("THONDAMUTHUR")
- `boothno`: Booth number
- `boothname`: Booth location name
- `booth_id`: Unique booth identifier
- `address`: Voter address (used for family grouping)
- `guardian`: Guardian/father name (used for family grouping)

## Troubleshooting

### If Total Voters Shows 0:
1. Run the verification script to check which field exists in your database
2. Check if data uses `aci_num` or `aci_id`
3. Verify the constituency name matches exactly (case-sensitive)

### If API Returns Error:
1. Check MongoDB connection in `.env` file
2. Ensure MongoDB is running
3. Check server logs for detailed error messages

### If Frontend Shows "Loading..." Forever:
1. Check browser console for errors
2. Verify API_BASE_URL is correct in `src/lib/api.ts`
3. Check CORS settings in backend
4. Verify the API endpoint is accessible

## Environment Variables Required

### Backend (`.env`)
```env
MONGODB_URI=mongodb://127.0.0.1:27017/kuralapp
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## API Response Format

```typescript
interface DashboardStats {
  acId: number;
  totalVoters: number;
  totalFamilies: number;
  surveysCompleted: number;
  totalBooths: number;
  boothStats: Array<{
    boothNo: number;
    boothName: string;
    boothId: string;
    voters: number;
  }>;
}
```

## Notes

- The query now supports both `aci_num` and `aci_id` for backward compatibility
- Family count is calculated by grouping voters with the same address, guardian, and booth_id
- Booth stats are limited to top 10 booths, sorted by booth number
- All counts are real-time from the database
- Numbers are formatted with commas for better readability (e.g., 1,247)
