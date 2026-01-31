# Professional Project Architecture

This project follows a strict **Separation of Concerns (SoC)** architecture, a standard practiced by senior developers to ensure scalability, testability, and maintainability.

---

## 🏗️ Backend Structure (`backend/`)

- **`config/`**: Contains core configurations like Database initialization.
    - *Why:* Keeps environmental logic separated from business logic.
- **`controllers/`**: Handles incoming API requests, validates inputs (using Joi), and coordinates responses.
    - *Why:* Ensures that the Routes remain clean and only handle URIs.
- **`services/`**: The "workhorse" of the application. Contains specific logic for Email and WhatsApp.
    - *Special Case (WhatsApp Mock):* Decoupled to allow instant replacement with Twilio/Meta in production without touching core code.
- **`jobs/`**: Contains background processes like the `reminderScheduler`.
    - *Why:* Cron-based automation should never block the main API response cycle.
- **`models/`**: Defines the SQLite schema using Sequelize ORM.
    - *Why:* Centralizes data integrity and relationships (e.g., Client ↔ Reminder).
- **`routes/`**: Defines the API surface (`/api/clients`, `/api/reminders`).

---

## 🎨 Frontend Structure (`frontend/`)

- **Vite & React**: Chosen for state-of-the-art performance and build speed.
- **`services/api.js`**: Centralized Axios instance.
    - *Why:* No Axios calls should live inside UI components (Senior practice: Maintainability).
- **Tailwind CSS**: Utility-first styling for a premium, responsive UI.

---

## �️ Recruitment Highlights

1.  **Strict Validation (Phase 1.5)**: Every database entry is validated via Sequelize and Joi. Invalid data never touches the disk.
2.  **Environment Isolation (Phase 1.3)**: sensitive keys (SMTP/Twilio) are isolated in `.env`, demonstrated by a professional `.gitignore`.
3.  **Scheduler Reliability (Phase 1.11)**: Uses a `sent` flag and `retryCount` to guarantee "Exactly Once" or tracked failure delivery—preventing duplicate reminders.
4.  **Decoupled Services (Phase 1.6)**: Services return results (true/false) instead of throwing errors to prevent the scheduler from crashing.
