# Saint Joseph College of Baggao — Online Voting System

React + Vite frontend and Node.js + Express backend for department-based student elections.

## Included departments and logos
- CTE — College of Teacher Education
- CCJE — College of Criminal Justice Education
- CICS — College of Information and Computing Sciences
- CBM — College of Business and Management
- CAS — College of Arts and Sciences

The supplied college seal and five department logos are in `frontend/public/logos/`.

## Features
- Saint Joseph College of Baggao main branding and department logos
- Separate CTE, CCJE, CICS, CBM, and CAS elections
- Department-specific candidate lists, positions, voter lists, ballots, and results
- Student registration with department selection
- Admin dashboard with department selector and separate election settings
- JSON file database; **no SQLite or better-sqlite3**
- Password hashing and JWT-based login

## Requirements
- Node.js 18 or newer
- VS Code

## Start backend
Open a VS Code terminal:
```bash
cd online-voting-system/backend
npm install
npm start
```
API: http://localhost:5000

## Start frontend
Open a second VS Code terminal:
```bash
cd online-voting-system/frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Admin login
- Email: `admin@heu.edu.ph`
- Password: `Admin123!`

## JSON database
The backend creates `backend/data.json` automatically. It stores users, departments (as department codes), positions, candidates, elections, and votes. Back up this file regularly. Existing JSON records without a department are assigned to CTE when the server starts.

## Important deployment and election notes
This JSON-file database is suitable for a small demonstration, not a high-traffic or official election. For a real election, use institutional identity verification, HTTPS, protected secrets, backups, audit logging, independent security review, and a formally reviewed secret-ballot design. The demonstration records voter IDs with vote records and must not be represented as a production-grade anonymous ballot.
