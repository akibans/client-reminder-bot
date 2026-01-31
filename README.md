# Professional Client Reminder Web Application

🚀 **Resume-Grade Full-Stack (SQLite/Node/React) Project**

This application allows business owners to manage clients and schedule automated reminders via Email and a Professional WhatsApp Mock delivery engine. Built with a focus on scalability, clean architecture, and professional coding standards.

## 🏗️ Tech Stack

**Frontend:**
- **React 18** (Vite Project)
- **Tailwind CSS** (Modern utility-first styling)
- **Axios** (API requests)

**Backend:**
- **Node.js & Express.js** (REST API)
- **SQLite & Sequelize** (Relational Data Persistence)
- **Nodemailer** (Real Gmail SMTP Integration)
- **node-cron** (Job Scheduling Heartbeat)

## 💬 WhatsApp Implementation (HR & Interview Pitch)
In this project, **WhatsApp is implemented using a Professional Mock Service**.
- **The Rationale**: Official WhatsApp APIs are paid and highly restricted for development. Using a mock allows for full development of the business logic without incurring costs.
- **The Architecture**: I have built a clean, decoupled service layer. The backend logic, scheduler, and database audit trails are identical to a production system.
- **The Scalability**: Replacing the mock with a live Twilio or Meta API is a simple configuration change in `config/whatsapp.js`. This demonstrates high-level architectural thinking and cost-awareness.

## 📂 Project Structure
```bash
client-reminder-bot/
├── backend/            # Business Logic & API
│   ├── config/         # DB, Mail & WhatsApp Config
│   ├── models/         # Database Schemas (Sequelize)
│   ├── routes/         # API Endpoints
│   ├── controllers/    # Request Handling
│   ├── jobs/           # Cron Scheduler Heartbeat
│   └── server.js       # Entry Point
```

## 🚀 Usage Flow
1. **Add Client**: Name, Email, Phone.
2. **Create Reminder**: Select clients, choose method, and set time.
3. **Automation**: The scheduler runs every 60s to check for pending tasks.
4. **Audit**: All messages are logged with `sentAt` timestamps and delivery statuses.

---
*Built strictly following professional software development practices.*
