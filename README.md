# Professional Client Reminder Web Application

🚀 **Resume-Grade MERN Stack Project**

This application allows business owners to manage clients and schedule automated reminders via Email (and WhatsApp ready). Built with a focus on scalability, clean architecture, and professional coding standards.

## 🏗️ Tech Stack

**Frontend:**
- **React 18** (Vite Project)
- **Tailwind CSS** (Modern utility-first styling)
- **Axios** (API requests)
- **React Router** (Navigation)

**Backend:**
- **Node.js & Express.js** (REST API)
- **MongoDB & Mongoose** (Database)
- **Nodemailer** (Email Service)
- **node-cron** (Job Scheduling)

## 📂 Project Structure

```bash
client-reminder-bot/
├── backend/            # Business Logic & API
│   ├── config/         # DB & Mail Config
│   ├── models/         # Database Schemas
│   ├── routes/         # API Endpoints
│   ├── controllers/    # Request Handling
│   ├── jobs/           # Cron Scheduler
│   └── server.js       # Entry Point
│
├── frontend/           # Client-Side UI
│   ├── src/
│   │   ├── components/ # Reusable UI (Forms, Navbar)
│   │   ├── pages/      # Route Views (Dashboard, AddClient)
│   │   └── services/   # API Integration
│   └── tailwind.config.js
```

## 🧱 Setup Guide

### 1. Backend Setup
1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install`
3. Configure Environment:
   - Update `.env` with your **MongoDB URI** and **Email Credentials**.
4. Start Server: `npm start`
   - *Runs on http://localhost:5000*

### 2. Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Start Dev Server: `npm run dev`
   - *Runs on http://localhost:5173* (or 5174)

## 🚀 Usage Flow
1. **Add Client**: Enter Name, Email, Phone.
2. **Create Reminder**:
   - Select one or multiple clients.
   - Choose Method (Email/WhatsApp).
   - Set Date & Time.
3. **Automation**: The backend scheduler checks every minute and sends emails automatically.

---
*Built strictly following professional software development practices.*
