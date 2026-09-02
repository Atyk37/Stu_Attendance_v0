CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS MonthlyAttendanceReport;
DROP TABLE IF EXISTS MonthlyAttendanceRecords;
DROP TABLE IF EXISTS AttendanceMonths;
DROP TABLE IF EXISTS Attendance;
DROP TABLE IF EXISTS AttendanceSessions;
DROP TABLE IF EXISTS Schedule;
DROP TABLE IF EXISTS Enrollments;
DROP TABLE IF EXISTS Classes;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Teachers;

SET FOREIGN_KEY_CHECKS = 1;

/*
    ============================================================
    Attendance System Database Schema
    ============================================================

    This schema is designed for a university attendance system.
    The database is built around these ideas:

    1. Teachers create classes for courses.
    2. Students are enrolled into those classes.
    3. A live attendance session is opened for a class.
    4. Students submit their attendance using a session code.
    5. Daily attendance is stored in Attendance.
    6. Monthly summaries are generated from daily data for report viewing.

    Relationship flow:
        Teachers -> Classes -> Courses
        Students -> Enrollments -> Classes
        AttendanceSessions -> Classes
        Attendance -> Enrollments
        AttendanceMonths -> Classes
        MonthlyAttendanceRecords -> Enrollments + AttendanceMonths

    Notes:
    - The most important relationship is Enrollments.
      It connects a student to a class.
    - Attendance is stored per enrollment, not just per student.
      This prevents duplicate attendance records across different classes.
    - Monthly tables are summary/reporting tables only.
      They are not the main source of daily attendance truth.
    ============================================================
*/

-- 1) Teachers table
-- Purpose: stores lecturer/teacher login accounts and basic profile info.
-- Important: each teacher can create many classes.
CREATE TABLE Teachers (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2) Students table
-- Purpose: stores all student profiles.
-- Important: student_code is the public attendance ID used by students.
CREATE TABLE Students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(30) UNIQUE NOT NULL,
    name_myanmar VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    telegram_id VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB;

-- 3) Courses table
-- Purpose: stores the master list of available subjects.
-- Important: a course is the subject itself, while a class is a specific course instance.
CREATE TABLE Courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(30) UNIQUE NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    is_elective BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

-- 4) Classes table
-- Purpose: represents a real class section for a course taught by a teacher.
-- Example: "CS-4223 Object-Oriented Design" taught by Teacher A in Semester VIII.
CREATE TABLE Classes (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    teacher_id INT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(30) DEFAULT 'L 202',
    academic_year VARCHAR(20) DEFAULT '2025-2026',
    semester VARCHAR(30) DEFAULT 'Semester VIII',

    CONSTRAINT fk_classes_course
        FOREIGN KEY (course_id) REFERENCES Courses(course_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5) Schedule table
-- Purpose: stores the timetable for each class.
-- Example: Monday 09:00-11:00 for a specific class.
CREATE TABLE Schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    day_of_week ENUM('MON', 'TUES', 'WED', 'THURS', 'FRI') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_lab BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_schedule_class
        FOREIGN KEY (class_id) REFERENCES Classes(class_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6) Enrollments table
-- Purpose: connects a student to a class.
-- This is the core bridge table in the system.
-- One student can enroll in many classes.
-- One class can contain many students.
CREATE TABLE Enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,

    CONSTRAINT fk_enrollment_student
        FOREIGN KEY (student_id) REFERENCES Students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enrollment_class
        FOREIGN KEY (class_id) REFERENCES Classes(class_id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_student_class (student_id, class_id)
) ENGINE=InnoDB;

-- 7) AttendanceSessions table
-- Purpose: stores active live attendance sessions for a class.
-- When a teacher opens attendance, a six-digit session code is generated.
-- Students must enter the correct session code and their student code.
CREATE TABLE AttendanceSessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    session_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_session_class
        FOREIGN KEY (class_id) REFERENCES Classes(class_id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_session_code (session_code)
) ENGINE=InnoDB;

-- 8) Attendance table
-- Purpose: stores the real daily attendance records.
-- A row means: this student enrolled in this class was marked present/absent on this date.
-- The enrollment_id ensures that the same student can have different attendance records in different classes.
CREATE TABLE Attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    session_id INT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT') NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attendance_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id) REFERENCES AttendanceSessions(session_id)
        ON DELETE SET NULL,

    UNIQUE KEY uq_enrollment_date (enrollment_id, attendance_date)
) ENGINE=InnoDB;

-- 9) AttendanceMonths table
-- Purpose: creates one monthly sheet per class.
-- This helps the teacher manage attendance reporting month by month.
CREATE TABLE AttendanceMonths (
    attendance_month_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id INT NOT NULL,
    month_start DATE NOT NULL,
    sheet_status ENUM('OPEN', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'OPEN',
    submitted_at DATETIME NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (attendance_month_id),
    UNIQUE KEY uq_attendance_month_class (class_id, month_start),

    CONSTRAINT fk_attendance_month_class
        FOREIGN KEY (class_id) REFERENCES Classes(class_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_attendance_month_start
        CHECK (DAYOFMONTH(month_start) = 1)
) ENGINE=InnoDB;

-- 10) MonthlyAttendanceRecords table
-- Purpose: stores month summary counts for each student enrolled in a class.
-- This is a reporting table, not the main source of daily attendance.
-- Only present_days and absent_days are kept here because the app does not need late/leave/payable breakdown in this version.
CREATE TABLE MonthlyAttendanceRecords (
    monthly_record_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    attendance_month_id INT UNSIGNED NOT NULL,
    enrollment_id INT NOT NULL,
    present_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    absent_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    teacher_remark VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (monthly_record_id),
    UNIQUE KEY uq_monthly_record_enrollment (attendance_month_id, enrollment_id),

    CONSTRAINT fk_monthly_record_month
        FOREIGN KEY (attendance_month_id) REFERENCES AttendanceMonths(attendance_month_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_monthly_record_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_monthly_record_counts
        CHECK (
            present_days >= 0 AND
            absent_days >= 0
        )
) ENGINE=InnoDB;

-- View for monthly report output
-- Purpose: gives a teacher-friendly view with student details and the summary values.
CREATE OR REPLACE VIEW MonthlyAttendanceReport AS
SELECT
    am.attendance_month_id,
    am.class_id,
    am.month_start,
    am.sheet_status,
    mar.monthly_record_id,
    mar.enrollment_id,
    s.student_id,
    s.student_code,
    s.name_myanmar,
    mar.present_days,
    mar.absent_days,
    mar.teacher_remark
FROM AttendanceMonths am
JOIN MonthlyAttendanceRecords mar
    ON mar.attendance_month_id = am.attendance_month_id
JOIN Enrollments e
    ON e.enrollment_id = mar.enrollment_id
JOIN Students s
    ON s.student_id = e.student_id;

-- Recommended indexes for speed
-- MySQL/MariaDB versions differ here, so check existence before creating them.
SET @idx_sql = CASE
    WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'AttendanceSessions'
            AND INDEX_NAME = 'idx_attendance_session_class') = 0
    THEN 'CREATE INDEX idx_attendance_session_class ON AttendanceSessions(class_id, is_active, expires_at)'
    ELSE 'SELECT 1'
END;
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_sql = CASE
    WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'Attendance'
            AND INDEX_NAME = 'idx_attendance_enrollment_date') = 0
    THEN 'CREATE INDEX idx_attendance_enrollment_date ON Attendance(enrollment_id, attendance_date)'
    ELSE 'SELECT 1'
END;
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_sql = CASE
    WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'Attendance'
            AND INDEX_NAME = 'idx_attendance_session_id') = 0
    THEN 'CREATE INDEX idx_attendance_session_id ON Attendance(session_id)'
    ELSE 'SELECT 1'
END;
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_sql = CASE
    WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'Enrollments'
            AND INDEX_NAME = 'idx_enrollment_class_id') = 0
    THEN 'CREATE INDEX idx_enrollment_class_id ON Enrollments(class_id)'
    ELSE 'SELECT 1'
END;
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_sql = CASE
    WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'Enrollments'
            AND INDEX_NAME = 'idx_enrollment_student_id') = 0
    THEN 'CREATE INDEX idx_enrollment_student_id ON Enrollments(student_id)'
    ELSE 'SELECT 1'
END;
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Example seed data
INSERT INTO Students (student_code, name_myanmar, email, username) VALUES
('KPTMYK-001340', 'မောင်ကျော်မောင်မောင်သူ', 'mthu35997@gmail.com', 'kyawmgmgthu'),
('KPTMYK-001342', 'မချစ်သက်အိမ်', 'chitthet.eain27@gmail.com', 'chittheteain'),
('KPTMYK-001343', 'မဆုရတနာစိုး', 'lilyhsuyadanasoe@gmail.com', 'hsuyadanasoe'),
('KPTMYK-001345', 'မသက်ဆောင်းခိုင်', 'thetsaungkhin@gmail.com', 'thetsaungkhin'),
('KPTMYK-001346', 'မမြတ်ဖြူဇင်', 'mmyatphyusin@gmail.com', 'myatphyusin'),
('KPTMYK-001347', 'မောင်ဘုန်းပြည့်ပိုင်', 'bhonepyae678paing@gmail.com', 'bhonepyaepaing'),
('KPTMYK-001349', 'မောင်မင်းဟိန်းမောင်မောင်', 'minheinmaungmaung4233@gmail.com', 'minheinmaungmaung'),
('KPTMYK-001351', 'မအေးသန္တာဖြွေး', 'ayethandarphwaye@gmail.com', 'ayethandarphway'),
('KPTMYK-001352', 'မဆုရိုးယုစစ်', 'sumoeyusan3543@gmail.com', 'sumoeyusan'),
('KPTMYK-001353', 'မလှလှဝင်း', 'hlahlawin55670@gmail.com', 'hlahlawin'),
('KPTMYK-001354', 'မဟဲဟဲဆု', 'hsuhsupalaw9@gmail.com', 'helhelhsu'),
('KPTMYK-001355', 'မအေမီဌေး', 'htayamy4@gmail.com', 'amihtay'),
('KPTMYK-001356', 'မသူရတီဖူး', 'thoneyatiphoo2004@gmail.com', 'thoneyatiphoo'),
('KPTMYK-001358', 'မကလျာဌေး', 'kalyarhtay13@gmail.com', 'kalyarhtay'),
('KPTMYK-001359', 'မပန်းခေတ်ဆု', 'pannkhit2023myk@gmail.com', 'pannkhithsu'),
('KPTMYK-001361', 'မောင်သန့်ဇင်ဖြိုး', 'thantzinphyo228753@gmail.com', 'thantzinphyo'),
('KPTMYK-001364', 'မသူဇင်ထွေး', 'thuzinhtwe1@gmail.com', 'thuzinhtwe'),
('KPTMYK-001365', 'မောင်နေမျိုးခန့်', 'naymyokhant78@gmail.com', 'naymyokhant'),
('KPTMYK-001367', 'မစိုးအိန္ဒြာဝင်း', 'soeeindrawin@gmail.com', 'soeeindrawin'),
('KPTMYK-001368', 'မောင်ကျော်စိုးဝင်း', 'kyawsoewinksw89@gmail.com', 'kyawsoewin'),
('KPTMYK-001370', 'မမသက်ပိုင်', 'maythetpaing2000.dc@gmail.com', 'maythetpaing'),
('KPTMYK-001374', 'မောင်သူစွမ်းအောင်', 'thuswanaung02@gmail.com', 'thuswanaung'),
('KPTMYK-001376', 'မောင်နန္ဒထွန်း', 'nanda345tun@gmail.com', 'nandatun'),
('KPTMYK-001377', 'မောင်လင်းလတ်ဖြိုး', 'linlitphyo2000@gmail.com', 'linlitphyo'),
('KPTMYK-001378', 'မကေသဇင်ဖူး', 'maythazinp237@gmail.com', 'kaythazinphoo'),
('KPTMYK-001381', 'မဆုမြတ်သဇင်', 'hsumyatthazin124@gmail.com', 'hsumyatthazin'),
('KPTMYK-001157', 'မအိန္ဒြာမြတ်မွန်သူ', 'eaindraymyat093@gmail.com', 'eaindraymyatmyanthu'),
('KPTMYK-001160', 'မယဉ်သူဇာလွင်', 'yinthuzar1160@gmail.com', 'yinthuzarlwin'),
('KPTMYK-001172', 'မမွန်မွန်စိုး', 'monmonsoe689@gmail.com', 'monmonsoe'),
('KPTMYK-001198', 'မနှင်းနန္ဒာထွေး', 'hninnandarhtwe2003@gmail.com', 'hninnandarhtwe'),
('KPTMYK-001207', 'မောင်အောင်ဆန်းဦး', 'aungsan.aung171@gmail.com', 'aungsanoo'),
('KPTMYK-001225', 'မကဆုန်မေ', 'kasonemay085@gmail.com', 'kasonemay'),
('KPTMYK-001241', 'မယွန်းမိမိဇော်', 'yoonmizaw344@gmail.com', 'yoonmimizaw'),
('KPTMYK-001244', 'မဇူးမိမိဖြိုး', 'zuemimiphyo969@gmail.com', 'zuemimiphyo'),
('KPTMYK-001248', 'မပုလဲသွယ်', 'pearlthwe2023@gmail.com', 'pearlthwe'),
('KPTMYK-001251', 'မဖြိုးသိင်္ဃီကျော်', 'phyotheingikyaw3124@gmail.com', 'phyotheingikyaw'),
('KPTMYK-001253', 'မောင်အောင်သူရကျော်', 'thu454909@gmail.com', 'aungthurakyaw'),
('KPTMYK-001261', 'မောင်မင်းဆွေညီ', 'minswenyi7@gmail.com', 'minswenyi'),
('KPTMYK-001262', 'မမေမြတ်နိုး', 'may634542@gmail.com', 'maymyatnoe');
INSERT INTO Courses (course_code, course_name, is_elective) VALUES
('CST-4211', 'Parallel and Distributed Computing', FALSE),
('CST-4242', 'Modeling and Simulation', FALSE),
('CS-4223', 'Object-Oriented Design and Development', FALSE),
('CS-4214', 'Advanced Artificial Intelligence', TRUE),
('CS-4225', 'Advanced Database System', FALSE),
('CS-4216', 'Strategies of Emerging Technology I', TRUE),
('CST-4257', 'Digital Business and E-Commerce Management', TRUE);

INSERT INTO Classes (course_id, teacher_name) VALUES
((SELECT course_id FROM Courses WHERE course_code = 'CST-4211'), 'ဒေါ်ပန်းမြတ်မွန်'),
((SELECT course_id FROM Courses WHERE course_code = 'CST-4242'), 'ဒေါ်ရှင်အိမ်စည်နွယ်'),
((SELECT course_id FROM Courses WHERE course_code = 'CS-4223'), 'ဒေါက်တာစိုင်းစောဟန်'),
((SELECT course_id FROM Courses WHERE course_code = 'CS-4214'), 'ဒေါ်သော်တာဦး'),
((SELECT course_id FROM Courses WHERE course_code = 'CS-4225'), 'ဒေါက်တာရည်မွန်သက်'),
((SELECT course_id FROM Courses WHERE course_code = 'CS-4216'), 'ဒေါက်တာအေးမြတ်မြတ်ပိုင်'),
((SELECT course_id FROM Courses WHERE course_code = 'CST-4257'), 'ဒေါ်မြတ်ဆုဦး');

INSERT INTO Schedule (class_id, day_of_week, start_time, end_time, is_lab) VALUES
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4257'), 'MON', '09:00:00', '11:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4211'), 'MON', '11:00:00', '12:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4216'), 'MON', '13:00:00', '14:00:00', TRUE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4242'), 'MON', '14:00:00', '16:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4223'), 'TUES', '09:00:00', '11:00:00', TRUE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4216'), 'TUES', '11:00:00', '12:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4257'), 'TUES', '13:00:00', '14:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4214'), 'TUES', '14:00:00', '15:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4211'), 'TUES', '15:00:00', '16:00:00', TRUE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4225'), 'WED', '09:00:00', '10:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4223'), 'WED', '10:00:00', '12:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4242'), 'WED', '13:00:00', '14:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4225'), 'WED', '14:00:00', '16:00:00', TRUE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4214'), 'THURS', '09:00:00', '10:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4211'), 'THURS', '10:00:00', '12:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4216'), 'THURS', '14:00:00', '16:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CST-4257'), 'FRI', '09:00:00', '10:00:00', FALSE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4214'), 'FRI', '10:00:00', '12:00:00', TRUE),
((SELECT class_id FROM Classes c JOIN Courses co ON c.course_id = co.course_id WHERE co.course_code = 'CS-4225'), 'FRI', '13:00:00', '14:00:00', FALSE);

INSERT INTO Enrollments (student_id, class_id)
SELECT s.student_id, c.class_id
FROM Students s
CROSS JOIN Classes c;
