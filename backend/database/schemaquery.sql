CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

SET FOREIGN_KEY_CHECKS = 0;
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
    Minimal but suitable attendance schema for this application.
    Main idea:
      Teachers -> Classes -> Courses
      Students -> Enrollments -> Classes
      AttendanceSessions -> Classes
      Attendance -> Enrollments

    This keeps the system efficient and removes extra monthly summary tables that are not required for the app flow.
*/

CREATE TABLE Teachers (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE Students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(30) UNIQUE NOT NULL,
    name_myanmar VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    telegram_id VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE Courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(30) UNIQUE NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    is_elective BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

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

CREATE INDEX idx_session_class ON AttendanceSessions(class_id, is_active, expires_at);
CREATE INDEX idx_attendance_enrollment_date ON Attendance(enrollment_id, attendance_date);
CREATE INDEX idx_attendance_session ON Attendance(session_id);
CREATE INDEX idx_enrollment_class ON Enrollments(class_id);
CREATE INDEX idx_enrollment_student ON Enrollments(student_id);

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
