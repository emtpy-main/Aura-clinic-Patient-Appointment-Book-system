# Aura Clinic Operations Node - Patient Appointment Booking System

A secure, high-performance patient scheduling and clinical operations management system built on a monochromatic dark-mode MERN stack. Features real-time state synchronization, concurrency protection at the database level, and comprehensive slot consoles for clinicians.

---

## 💻 Tech Stack & Dependencies

The system is designed with a decoupled architecture containing a RESTful backend API node and a client-side Vite-based React SPA.

### Backend (Node.js & Express)
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database ODM:** Mongoose (MongoDB)
* **Real-time Server:** Socket.io
* **Security:** JWT (JSON Web Tokens) & Bcryptjs (password hashing)
* **Utility:** Dotenv (environment variables management)

### Frontend (React.js)
* **Build Tool:** Vite
* **Libraries:** React, React Router DOM (client routing)
* **Styling:** Tailwind CSS (monochromatic dark theme)
* **Icons:** React Icons
* **Real-time Client:** Socket.io-client

---

## ✨ Features Implemented

### 1. Secure Authentication & Authorization
* JWT-based secure signup and login flows for distinct user roles: `patient`, `doctor`, and `admin`.
* Custom route guarding and API middleware checking to restrict doctor scheduling panels or patient booking grids.

### 2. Clinician Slot Scheduler Console
* Bulk generation of time slots by specifying custom date ranges, daily operating start/end hours, and incremental slot sizes (e.g. 30 minutes, 1 hour).
* **Duplicate Date Protection:** Prevents clinicians from accidentally generating duplicate slot blocks for dates that already contain schedules.
* **Past Date Block:** Rejects generating any slots for past dates (prior to today) in both backend controllers and frontend inputs.

### 3. Patient Booking Grid & Dashboard
* Chronological slot selection grid on selected dates.
* Disables and highlights booked or unavailable slots, preventing overlaps.
* Dynamic table views splitting appointments into:
  - **Upcoming Appointments:** Sorted chronologically (nearest upcoming first).
  - **Past Consultations:** Sorted reverse-chronologically (most recent visits first).

### 4. Interactive Slots Console (Doctor Controls)
* Toggling slot availability dynamically between `available` and `unavailable` statuses.
* Safe slot deletion (vacant slots can be deleted, while booked slots are locked to preserve medical/billing history).
* **Agenda Auto-Advance:** Automatically advances the Daily Agenda tab's selected calendar date to the closest future date containing locked appointments if today's agenda is empty.

### 5. Doctor-Led Rescheduling & Real-time Alerts
* Multi-operation rescheduling that releases the patient's current slot, locks the chosen slot, updates the appointment record, and dispatches a database notification.
* WebSocket-powered real-time event broadcasting (`slots-changed`, `appointments-changed`, `notifications-changed`).
* Live Patient alert feed cards allowing patients to view clinician notes, mark alerts as read, or delete them.

---

## 📁 Project Directory Structure

```text
jaypee/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Controllers (Auth, Slots, Appointments)
│   │   ├── middleware/    # JWT Auth & role checks
│   │   ├── models/        # Mongoose Models (User, Doctor, Slot, etc.)
│   │   └── server.js      # Express server & socket configs
│   ├── tests/             # Automation test scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable layouts & Route guards
│   │   ├── context/       # Auth state providers
│   │   ├── pages/         # Screen pages (Home, Dashboards, Booking)
│   │   └── App.jsx        # Routing tree setup
│   └── package.json
└── README.md              # Documentation
```

---

## 🚀 Local Setup Instructions

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+ recommended)
* [MongoDB](https://www.mongodb.com/) running locally on port `27017`

### Step 1: Configure Backend API Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the `backend/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/clinic-booking
   JWT_SECRET=your_super_secret_jwt_key_here
   ```
4. Start the backend development server:
   ```bash
   # For standard node execution
   npm start

   # For auto-reloading node process (nodemon)
   npm run dev
   ```

### Step 2: Configure Frontend React SPA
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at `http://localhost:5173`.

---

## 🧪 Running the Test Suite

The system includes automated tests built in Node.js to verify core controllers, concurrency locks, and guard constraints. Make sure the backend server is running on port `5000` before starting:

1. **Concurrency Lock Test:** (Ensures double booking is prevented at database layer)
   ```bash
   node backend/tests/concurrency.test.js
   ```
2. **Rescheduling & Approvals Test:** (Checks status transitions, approvals, and rescheduling updates)
   ```bash
   node backend/tests/approval.test.js
   ```
3. **Slot Console Validation Test:** (Checks duplicate slot blocking, past-date blocks, availability toggling, and deletion constraints)
   ```bash
   node backend/tests/slots-management.test.js
   ```

---

## 🐳 Docker Deployment (Backend Node)

The backend Express server can be fully containerized for deployment.

### 1. Build the Docker Image
To build the image locally on Docker Desktop, navigate to the `backend/` directory and run:
```bash
docker build -t clinic-backend:latest .
```

### 2. Run the Container
Run the container in detached mode mapping host port `5000` to container port `5000`. 

* **Connecting to Host-Local MongoDB:** Since `127.0.0.1` inside a container points to the container itself, use `host.docker.internal` to connect to MongoDB running on your host machine:
  ```bash
  docker run -d -p 5000:5000 --name clinic-api -e MONGODB_URI=mongodb://host.docker.internal:27017/clinic-booking -e JWT_SECRET=your_jwt_secret_key clinic-backend:latest
  ```

* **Connecting to Cloud MongoDB (Atlas):** Simply pass your cloud connection URI:
  ```bash
  docker run -d -p 5000:5000 --name clinic-api -e MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/clinic-booking -e JWT_SECRET=your_jwt_secret_key clinic-backend:latest
  ```

