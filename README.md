# Professional Client Reminder Bot

🚀 **Full-Stack (SQLite/Node/React) Automation Suite**

This application allows business owners to manage clients and schedule automated reminders via **Email** and a **Professional WhatsApp Mock** delivery engine. Built with a focus on scalability, strict validation, and the **Senior Service Layer Pattern**.
---
## 🏗️ Architecture & Clean Code (Senior Practices)

###  Phase 1 — Backend (Logic-First)
- **Separation of Concerns**: Strictly uses the **Layered Architecture** (Routes → Controllers → Services → Models).
    - *Why:* Recruiter check: Controllers validate logic, Services handle "doing" things, Models handle data. Routes only handle URIs.
- **Strict Validation**: All incoming data is triple-checked using **Joi** (API level) and **Sequelize** (Database level).
    - *Why:* Ensures zero garbage data enters the system.
- **Exactly-Once Delivery**: The cron scheduler uses a atomic `sent` flag and tracked `retryCount` to guarantee reminders are never sent twice and failures are audited.

###  Phase 2 — Frontend (Modern UX)
- **Centralized API Layer**: No component talks directly to Axios. Every call is routed through `services/api.js`.
    - *Why:* Maximum maintainability. Changing a base URL happens in one file, not fifty.
- **Server-Side Pagination & Search**: Efficiently scales to thousands of records by processing search and chunks on the server.
- **State-of-the-Art UX**: Built with Tailwind CSS, featuring glassmorphism, micro-animations, and live-polling dashboards.

---

## 💬 WhatsApp Implementation (Interview Pitch)
In this project, **WhatsApp is implemented using a Professional Mock Service**.  
- **Cost Awareness**: Official WhatsApp APIs (Twilio/Meta) involve per-message costs and verification.
- **Pluggable Design**: I architected the `whatsappService.js` to return standard success/failure flags. Switching to a paid provider is a **10-second change** in the service layer, demonstrating production-ready thinking.

---

## 🚀 How to Run Locally

### 1. Backend Prep
```bash
cd backend
npm install
# Create .env (See .env.example)
npm start
```

### 2. Frontend Prep
```bash
cd frontend
npm install
npm run dev
```
---
## 📦 Features & Tech Stack
- **Node.js / Express**: High-performance REST API.
- **SQLite / Sequelize**: Robust relational data persistence (Free / No Setup).
- **node-cron**: Reliable 60-second execution heartbeat.
- **Vite / React 18**: Blazing fast frontend builds.
- **Tailwind 4.0**: cutting-edge styling.
---
*Built with professional discipline, automated retries, and clean audit trails.*
