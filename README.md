# EduuRise Academy – Tuition Management App (MERN)

A private tuition app for **one tutor and their enrolled students**.
Stack: **MongoDB Atlas + Express + React (Vite + Tailwind) + Node.js**. UI follows the Stitch "EduuRise Academy" design.

## 1. Run it on your computer

Needs **Node.js 18+**.

```bash
cd tuition-app
npm install          # installs the "concurrently" helper
npm run install-all  # installs server + client packages
npm run dev          # API on http://localhost:5000, app on http://localhost:5173
```

Open **http://localhost:5173**.

### Logins
| Who | Login | Password |
|---|---|---|
| Tutor | `geethanjalireddy31@gmail.com` | `Tutor@123` |

The tutor account is created automatically the first time the server connects to MongoDB.
Change the email and password in `server/.env` (`TUTOR_EMAIL`, `TUTOR_PASSWORD`) **before the first run**. After that, change them from **Profile** in the app.

**Optional: sample data.** Run `npm run seed:demo` to add 4 students (phone `9000000001`–`9000000004`, password `student123`), plus packages, fees, homework and tests.
To wipe students and start clean: `npm run seed:reset --prefix server` (this keeps the tutor).

## 2. Configuration – `server/.env`

| Key | What it is |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string (database `tuition_app`). It is already filled in. |
| `JWT_SECRET` | Any long random text. **Change this before going live.** |
| `TUTOR_*` | The first tutor login |
| `TZ` | `Asia/Kolkata`, so class times are generated in IST |

**MongoDB Atlas:** under *Network Access*, allow your IP address (or `0.0.0.0/0` when you deploy).
`.env` holds your database password and is in `.gitignore`. **Never push it to GitHub.**

## 3. Deploy (one server)

```bash
npm run build   # builds React into client/dist
npm start       # Express serves the API and the built app on PORT
```

On Render or Railway:
- Build command: `npm run install-all && npm run build`
- Start command: `npm start`
- Add the same variables from `server/.env` in the host's dashboard.

Uploaded files (homework, notes, answer sheets) are saved in `server/uploads`. On free hosts that folder is wiped on every redeploy. For permanent storage, switch the upload helper (`server/src/utils/helpers.js`) to Cloudinary or S3.

## 4. How it works

- **Class packages.** Assigning a package (for example 12 classes, Mon/Wed/Fri at 6 PM) auto-creates the class sessions. **Mark as Completed** (or *Present* in Attendance) deducts 1 class.
- Completed, remaining, cancelled, rescheduled and absent counts are always calculated from the sessions themselves, so they never go out of sync.
- **Absent, Cancelled or Rescheduled without a new date** does not use up a class. A makeup class is added at the end of the package automatically.
- **Fees are manual.** Add a fee as *Pending*, then click **Mark paid** (Cash/UPI/Bank) when you receive the money. That generates a receipt number, and the receipt page can be printed or saved as PDF.
- **Student registration** → the account is active immediately and the student is logged in; no tutor approval needed.
- **Notifications** (in-app) are sent for: a class within the next 24 hours, schedule changes, new homework, test dates, pending fees, low class balance (2 or fewer, configurable), announcements and results.
- Only the tutor can change data. Students can only submit homework and edit their contact details.

## 5. Project structure

```
server/  Express API
  src/models      User, Package, ClassSession, Payment, Homework, Submission, Material, Test, Result, Announcement, Notification, Settings
  src/routes      auth, students, packages, sessions, payments, homework (+materials), tests, misc (announcements, notifications, settings, dashboards)
  src/index.js    app entry, tutor auto-create, class-reminder job
client/  React app
  src/pages/public   Landing, Login, Register, Pending
  src/pages/tutor    Dashboard, Students, StudentForm, StudentDetail, PackagePage, Classes, Attendance, Payments, Assignments, Tests, Announcements, Profile
  src/pages/student  Home, MyClasses, Homework, Materials, Payments, Results, Profile
```
