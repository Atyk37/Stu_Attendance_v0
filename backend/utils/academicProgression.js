const semestersByYear = {
  'First Year': ['Semester I', 'Semester II'],
  'Second Year': ['Semester III', 'Semester IV'],
  'Third Year': ['Semester V', 'Semester VI'],
  'Fourth Year': ['Semester VII', 'Semester VIII'],
  'Final Year': ['Semester IX']
};

const nextPlacement = {
  'First Year|Semester I': { academic_year: 'First Year', semester: 'Semester II' },
  'First Year|Semester II': { academic_year: 'Second Year', semester: 'Semester III' },
  'Second Year|Semester III': { academic_year: 'Second Year', semester: 'Semester IV' },
  'Second Year|Semester IV': { academic_year: 'Third Year', semester: 'Semester V' },
  'Third Year|Semester V': { academic_year: 'Third Year', semester: 'Semester VI' },
  'Third Year|Semester VI': { academic_year: 'Fourth Year', semester: 'Semester VII' },
  'Fourth Year|Semester VII': { academic_year: 'Fourth Year', semester: 'Semester VIII' },
  'Fourth Year|Semester VIII': { academic_year: 'Final Year', semester: 'Semester IX' }
};

exports.academicYears = Object.keys(semestersByYear);
exports.semestersByYear = semestersByYear;
exports.isValidAcademicPlacement = (academicYear, semester) =>
  semestersByYear[academicYear]?.includes(semester) || false;
exports.getNextAcademicPlacement = (academicYear, semester) =>
  nextPlacement[`${academicYear}|${semester}`] || null;
