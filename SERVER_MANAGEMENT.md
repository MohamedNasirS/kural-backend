# Server Management Guide

## Quick Start

### Start the Backend Server
```powershell
cd C:\kurral\kural-backend
node server/index.js
```

The server will start on **port 4000** and display:
```
Auth server listening on port 4000
```

### Start the Frontend
```powershell
cd C:\kurral\kural-backend
npm run dev
```

The frontend will start on **port 8080** (or 5173) and display the local URL.

## Common Issues & Solutions

### Issue 1: Port 4000 Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution - Find and Kill the Process:**
```powershell
# Find process using port 4000
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object OwningProcess

# Kill the process (replace XXXX with the PID)
taskkill /F /PID XXXX

# Or do both in one command:
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess -Unique | ForEach-Object { taskkill /F /PID $_.OwningProcess }
```

### Issue 2: Server Stops After Starting

**Symptoms:**
- Server starts but immediately stops
- Cannot connect to API endpoints

**Solution - Start in a New Window:**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\kurral\kural-backend; node server/index.js" -WindowStyle Normal
```

This opens a new PowerShell window that keeps running.

### Issue 3: MongoDB Connection Failed

**Error Message:**
```
MongoServerError: Authentication failed
```

**Solution:**
1. Check your `.env` file in the `server` folder
2. Verify `MONGODB_URI` is correct
3. Ensure MongoDB server is running and accessible

```env
MONGODB_URI=mongodb://username:password@host:port/database?authSource=database
```

## Verify Server is Running

### Check if Port 4000 is in Use
```powershell
netstat -ano | findstr :4000
```

Expected output:
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       XXXX
TCP    [::]:4000              [::]:0                 LISTENING       XXXX
```

### Test API Endpoints

#### Health Check
```powershell
Invoke-RestMethod -Uri 'http://localhost:4000/api/health' -Method GET
```

Expected response:
```json
{ "status": "ok" }
```

#### Dashboard Stats
```powershell
Invoke-RestMethod -Uri 'http://localhost:4000/api/dashboard/stats/119' -Method GET
```

Expected response:
```json
{
  "acId": 119,
  "totalVoters": 20001,
  "totalFamilies": 4761,
  "surveysCompleted": 0,
  "totalBooths": 299,
  "boothStats": [...]
}
```

#### Voters List
```powershell
Invoke-RestMethod -Uri 'http://localhost:4000/api/voters/119?limit=5' -Method GET
```

Expected response:
```json
{
  "voters": [...],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 20001,
    "pages": 4001
  }
}
```

## Running Both Frontend & Backend

### Option 1: Two Separate Terminals

**Terminal 1 - Backend:**
```powershell
cd C:\kurral\kural-backend
node server/index.js
```

**Terminal 2 - Frontend:**
```powershell
cd C:\kurral\kural-backend
npm run dev
```

### Option 2: One Command (Background Server)

```powershell
# Start backend in background window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\kurral\kural-backend; node server/index.js" -WindowStyle Normal

# Wait for server to start
Start-Sleep -Seconds 2

# Start frontend in current terminal
npm run dev
```

## Stop the Server

### Stop Backend Server

**If running in current terminal:**
- Press `Ctrl + C`

**If running in another window:**
```powershell
# Find the process
Get-Process node | Where-Object {$_.MainWindowTitle -like "*server*"}

# Or kill all node processes
Get-Process node | Stop-Process -Force

# Or kill by port
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Stop Frontend (Vite)

**If running in current terminal:**
- Press `Ctrl + C`

**If running in another window:**
```powershell
# Kill Vite process
Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.CommandLine -like "*vite*"} | Stop-Process -Force
```

## Environment Configuration

### Backend `.env` (in `server` folder)
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173,http://localhost:8080
MONGODB_URI=mongodb://username:password@host:port/database?authSource=database
```

### Frontend `.env` (in root folder)
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Troubleshooting Checklist

- [ ] Is MongoDB running and accessible?
- [ ] Is port 4000 free or in use by another process?
- [ ] Are environment variables set correctly in `.env`?
- [ ] Is the backend server running? (Check with netstat)
- [ ] Can you access http://localhost:4000/api/health?
- [ ] Is the frontend running? (Check browser console)
- [ ] Are there any CORS errors in browser console?
- [ ] Is `CLIENT_ORIGIN` in backend `.env` matching frontend URL?

## Useful Commands Reference

```powershell
# Check all listening ports
netstat -ano | findstr LISTENING

# Check specific port
netstat -ano | findstr :4000

# List all node processes
Get-Process node

# Kill specific process by PID
taskkill /F /PID XXXX

# Kill all node processes
Get-Process node | Stop-Process -Force

# Test API with curl
curl http://localhost:4000/api/health

# Test API with Invoke-RestMethod (PowerShell)
Invoke-RestMethod -Uri 'http://localhost:4000/api/health'

# View server logs (if running in background)
Get-Content -Path "path/to/logfile" -Wait
```

## Production Deployment

For production, consider using:
- **PM2** for Node.js process management
- **Nginx** as reverse proxy
- **Environment variables** for configuration
- **Logging** to file instead of console
- **HTTPS** for secure connections

### Example PM2 Setup
```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start server/index.js --name "kural-backend"

# View logs
pm2 logs kural-backend

# Restart server
pm2 restart kural-backend

# Stop server
pm2 stop kural-backend
```

## Summary

✅ Backend runs on port **4000**
✅ Frontend runs on port **8080** or **5173**
✅ MongoDB connection required for backend
✅ API endpoints: `/api/health`, `/api/dashboard/stats/:acId`, `/api/voters/:acId`
✅ Use environment variables for configuration
✅ Check port availability before starting server

**Current Status:**
- 🟢 Server running on port 4000
- 🟢 Total Voters: 20,001
- 🟢 Total Booths: 299
- 🟢 API endpoints working
- 🟢 Ready for development/testing
