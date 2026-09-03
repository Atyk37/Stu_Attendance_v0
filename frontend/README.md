# Student Attendance System Setup

Follow these steps to run the project on another laptop.

## 1. Install the requirements

Install Node.js with npm, MySQL Server, and Git if you will clone the project.

Check the installation:

```bash
node --version
npm --version
mysql --version

```

## 2. Copy or clone the project

Clone the repository or copy the complete `Stu_Attendance_v0` folder to the new laptop.

Open a terminal in the project folder:

```bash
cd Stu_Attendance_v0
```

The project must contain these folders:

```text
backend/
frontend/
server/
```

## 3. Install project dependencies

Run `npm install` in each folder:

```bash
cd backend
npm install

cd ../server
npm install

cd ../frontend
npm install
```

## 4. Configure MySQL

Start MySQL. The application currently uses these settings in `backend/config/db.js`:

```text
Host: localhost
User: root
Password: root
Database: attendance_system
```

If the MySQL root password is different, update the `password` value in `backend/config/db.js`.

## 5. Create the database

From the project root, run:

```bash
mysql -u root -p < backend/database/schemaquery.sql
```

Enter the MySQL password when prompted. This creates the `attendance_system` database, creates the required tables, and inserts sample students.

**Warning:** The schema file deletes and recreates the application tables. Do not run it again if you need to preserve attendance data.

## 6. Test the database connection

```bash
cd backend
node config/test-db.js
```

You should see `MySQL Database connected successfully!`.

## 7. Start the backend server

Open Terminal 1 in the project root:

```bash
cd server
npm start
```

The backend runs at `http://localhost:3000`. Keep this terminal running.

## 8. Start the frontend

Open Terminal 2 in the project root:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## 9. Use the system

1. Choose **Lecturer Mode** and create an account.
2. Create and select a course.
3. Enroll students and open an attendance session.
4. Give the six-digit code to students.
5. Students use **Student Panel** to submit attendance.
6. Return to Lecturer Mode to view the monthly attendance report.

## 10. Build the frontend

```bash
cd frontend
npm run build
```

## Run on another device

For another device on the same network:

1. Find the host laptop IP address with `ipconfig` on Windows.
2. Start the backend and frontend.
3. Open `http://HOST_IP:5173` on the other device.
4. Allow Node.js through Windows Firewall if required.
5. Make sure ports `3000` and `5173` are allowed.

## Troubleshooting

- **Database connection failed:** Start MySQL and check `backend/config/db.js`.
- **Unknown database or table:** Run the schema command in step 5.
- **API connection refused:** Start the backend from the `server` folder.
- **Frontend cannot connect:** Keep both the backend and frontend terminals running.
