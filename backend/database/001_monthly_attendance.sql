CREATE TABLE IF NOT EXISTS AttendanceMonths (
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
    FOREIGN KEY (class_id) REFERENCES Classes (class_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_attendance_month_start
    CHECK (DAYOFMONTH(month_start) = 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS MonthlyAttendanceRecords (
  monthly_record_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_month_id INT UNSIGNED NOT NULL,
  enrollment_id INT NOT NULL,
  present_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  absent_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  late_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  leave_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  payable_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  teacher_remark VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (monthly_record_id),
  UNIQUE KEY uq_monthly_record_enrollment (attendance_month_id, enrollment_id),
  CONSTRAINT fk_monthly_record_month
    FOREIGN KEY (attendance_month_id) REFERENCES AttendanceMonths (attendance_month_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_monthly_record_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES Enrollments (enrollment_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_monthly_record_counts
    CHECK (present_days >= 0 AND absent_days >= 0 AND late_days >= 0 AND leave_days >= 0 AND payable_days >= 0)
) ENGINE=InnoDB;

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
  mar.late_days,
  mar.leave_days,
  mar.payable_days,
  mar.teacher_remark
FROM AttendanceMonths am
JOIN MonthlyAttendanceRecords mar
  ON mar.attendance_month_id = am.attendance_month_id
JOIN Enrollments e
  ON e.enrollment_id = mar.enrollment_id
JOIN Students s
  ON s.student_id = e.student_id;
