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

**Warning:** The schema file deletes and recreates the application tables, including admin accounts. Do not run it again if you need to preserve attendance data.

## 6. Test the database connection

```bash
cd backend
node config/test-db.js
```

You should see `MySQL Database connected successfully!`.

## 7. Create an admin account

Create the first admin account after setting up the database:

```bash
cd backend
npm run create-admin
```

Follow the prompts for the admin name, email, and password. Keep the credentials private. Admin accounts are not created through the sign-in page.

## 8. Start the backend server

Open Terminal 1 in the project root:

```bash
cd server
npm start
```

The backend runs at `http://localhost:3000`. Keep this terminal running.

## 9. Start the frontend

Open Terminal 2 in the project root:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## 10. Use the system

1. Sign in as **Admin** with the credentials created in step 7.
2. Register students from the admin dashboard, then use the roster’s **Edit** and **Delete** actions to maintain their details. Deleting a student also permanently removes their enrollments and attendance records.
3. Give the student their email, student code, and initial password privately.
4. Students choose **Student**, then sign in with those details. They cannot create their own accounts.
5. Choose **Teacher** to create an account, create and select a course, enroll students, and open an attendance session.
6. Give the six-digit attendance code to students so they can submit attendance.
7. Return to Teacher mode to view the monthly attendance report.

## 11. Build the frontend

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
