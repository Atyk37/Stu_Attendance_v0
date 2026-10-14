CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Attendance;
DROP TABLE IF EXISTS AttendanceSessions;
DROP TABLE IF EXISTS Enrollments;
DROP TABLE IF EXISTS Classes;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Teachers;
SET FOREIGN_KEY_CHECKS = 1;

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
    username VARCHAR(50) NOT NULL
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
    teacher_id INT NOT NULL,
    academic_year VARCHAR(20) DEFAULT 'First Year',
    semester VARCHAR(30) DEFAULT 'Semester I',

    CONSTRAINT fk_classes_course
        FOREIGN KEY (course_id) REFERENCES Courses(course_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES Teachers(teacher_id)
        ON DELETE RESTRICT
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
    session_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT') NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attendance_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id) REFERENCES AttendanceSessions(session_id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_enrollment_date (enrollment_id, attendance_date)
) ENGINE=InnoDB;

CREATE INDEX idx_session_class ON AttendanceSessions(class_id, is_active, expires_at);
CREATE INDEX idx_attendance_enrollment_date ON Attendance(enrollment_id, attendance_date);
CREATE INDEX idx_attendance_session ON Attendance(session_id);
CREATE INDEX idx_enrollment_class ON Enrollments(class_id);
CREATE INDEX idx_enrollment_student ON Enrollments(student_id);
