import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api';

const emptyForm = {
  name: '',
  name_myanmar: '',
  student_code: '',
  email: '',
  username: '',
  academic_year: 'First Year',
  semester: 'Semester I'
};

const semestersByYear = {
  'First Year': ['Semester I', 'Semester II'],
  'Second Year': ['Semester III', 'Semester IV'],
  'Third Year': ['Semester V', 'Semester VI'],
  'Fourth Year': ['Semester VII', 'Semester VIII'],
  'Final Year': ['Semester IX']
};
const academicYears = Object.keys(semestersByYear);
const nextPlacementByCohort = {
  'First Year|Semester I': { academic_year: 'First Year', semester: 'Semester II' },
  'First Year|Semester II': { academic_year: 'Second Year', semester: 'Semester III' },
  'Second Year|Semester III': { academic_year: 'Second Year', semester: 'Semester IV' },
  'Second Year|Semester IV': { academic_year: 'Third Year', semester: 'Semester V' },
  'Third Year|Semester V': { academic_year: 'Third Year', semester: 'Semester VI' },
  'Third Year|Semester VI': { academic_year: 'Fourth Year', semester: 'Semester VII' },
  'Fourth Year|Semester VII': { academic_year: 'Fourth Year', semester: 'Semester VIII' },
  'Fourth Year|Semester VIII': { academic_year: 'Final Year', semester: 'Semester IX' }
};

async function fetchStudents(token) {
  const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load students.');
  return data.students;
}

function AdminPanel({ admin }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [rosterYear, setRosterYear] = useState('all');
  const [rosterSemester, setRosterSemester] = useState('all');
  const [feedback, setFeedback] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentActionId, setStudentActionId] = useState(null);
  const [promotionCohort, setPromotionCohort] = useState({
    academic_year: 'First Year',
    semester: 'Semester I'
  });
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchStudents(admin.token)
      .then((list) => {
        if (active) setStudents(list);
      })
      .catch((error) => {
        if (active) setFeedback({ success: false, message: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [admin.token]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) =>
      (rosterYear === 'all' || student.academic_year === rosterYear)
      && (rosterSemester === 'all' || student.semester === rosterSemester)
      && (!query || [student.name, student.name_myanmar, student.student_code, student.email, student.username]
        .some((value) => value?.toLowerCase().includes(query)))
    );
  }, [rosterSemester, rosterYear, search, students]);
  const cohortStudents = useMemo(
    () => students.filter((student) =>
      student.academic_year === promotionCohort.academic_year
      && student.semester === promotionCohort.semester
    ),
    [promotionCohort, students]
  );
  const nextCohort = nextPlacementByCohort[`${promotionCohort.academic_year}|${promotionCohort.semester}`];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setCredentials(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.token}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to register student.');

      setCredentials(data.student);
      setForm(emptyForm);
      setFeedback({ success: true, message: data.message });
      try {
        setStudents(await fetchStudents(admin.token));
      } catch (error) {
        setFeedback({
          success: true,
          message: `Student registered, but the roster could not be refreshed: ${error.message}`
        });
      }
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateActivationCode = async (student) => {
    setStudentActionId(student.student_id);
    setFeedback(null);
    setCredentials(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/students/${student.student_id}/activation-code`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${admin.token}` }
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create an activation code.');
      setCredentials({
        student_code: student.student_code,
        email: student.email,
        activation_code: data.activation_code
      });
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    } finally {
      setStudentActionId(null);
    }
  };

  const startEditing = (student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || '',
      name_myanmar: student.name_myanmar || '',
      student_code: student.student_code || '',
      email: student.email || '',
      username: student.username || '',
      academic_year: student.academic_year || '',
      semester: student.semester || '',
      password: ''
    });
    setFeedback(null);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setStudentActionId(editingStudent.student_id);
    setFeedback(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/students/${editingStudent.student_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update student.');

      setStudents((current) => current.map((student) =>
        student.student_id === data.student.student_id
          ? { ...student, ...data.student }
          : student
      ));
      setEditingStudent(null);
      setEditForm({ ...emptyForm, password: '' });
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    } finally {
      setStudentActionId(null);
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name || student.name_myanmar} (${student.student_code})? This also permanently deletes their enrollments and attendance records.`
    );
    if (!confirmed) return;

    setStudentActionId(student.student_id);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/students/${student.student_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete student.');

      setStudents((current) => current.filter((item) => item.student_id !== student.student_id));
      if (editingStudent?.student_id === student.student_id) setEditingStudent(null);
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    } finally {
      setStudentActionId(null);
    }
  };

  const handlePromoteCohort = async () => {
    if (!nextCohort || cohortStudents.length === 0) return;
    const confirmed = window.confirm(
      `Move all ${cohortStudents.length} students in ${promotionCohort.academic_year}, ${promotionCohort.semester} to ${nextCohort.academic_year}, ${nextCohort.semester}?`
    );
    if (!confirmed) return;

    setPromoting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/students/cohort/promotion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.token}`
        },
        body: JSON.stringify(promotionCohort)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to advance this student cohort.');

      const promotedIds = new Set(data.student_ids);
      setStudents((current) => current.map((student) =>
        promotedIds.has(student.student_id)
          ? { ...student, ...data.to }
          : student
      ));
      if (editingStudent && promotedIds.has(editingStudent.student_id)) {
        setEditingStudent((current) => ({ ...current, ...data.to }));
        setEditForm((current) => ({ ...current, ...data.to }));
      }
      setFeedback({ success: true, message: data.message });
    } catch (error) {
      setFeedback({ success: false, message: error.message });
    } finally {
      setPromoting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800">Admin Dashboard</h3>
        <p className="mt-2 text-slate-600">Welcome, {admin.name}. Add students and manage their portal access.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-800">Students on roster</p>
            <p className="mt-1 text-2xl font-bold text-blue-950">{students.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">Accounts ready to sign in</p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {students.filter((student) => student.account_created_at).length}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-xl font-bold text-slate-800">Advance a student cohort</h4>
        <p className="mt-1 text-sm text-slate-600">
          Select a study year and semester to move all matching students to the next semester. Previous class and attendance records stay unchanged.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Current study year
            <select
              className={inputClass}
              value={promotionCohort.academic_year}
              onChange={(event) => {
                const year = event.target.value;
                setPromotionCohort({ academic_year: year, semester: semestersByYear[year][0] });
              }}
            >
              {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Current semester
            <select
              className={inputClass}
              value={promotionCohort.semester}
              onChange={(event) => setPromotionCohort({ ...promotionCohort, semester: event.target.value })}
            >
              {semestersByYear[promotionCohort.academic_year].map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            <strong>{cohortStudents.length}</strong> matching student{cohortStudents.length === 1 ? '' : 's'}
            {nextCohort && <> · Next: {nextCohort.academic_year}, {nextCohort.semester}</>}
            {!nextCohort && ' · This is the final semester; there is no next semester.'}
          </p>
          <button
            type="button"
            onClick={handlePromoteCohort}
            disabled={promoting || saving || studentActionId !== null || cohortStudents.length === 0 || !nextCohort}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {promoting ? 'Advancing cohort…' : 'Advance all matching students'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Matching codes: {cohortStudents.length
            ? `${cohortStudents.slice(0, 8).map((student) => student.student_code).join(', ')}${cohortStudents.length > 8 ? `, and ${cohortStudents.length - 8} more` : ''}`
            : 'None'}
        </p>
      </section>

      {feedback && (
        <p className={`rounded-xl p-4 text-sm font-semibold ${feedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-xl font-bold text-slate-800">Add a student</h4>
        <p className="mt-1 text-sm text-slate-600">Add the student to the roster, then share their one-time activation code privately.</p>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Student name
            <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoComplete="name" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Myanmar name
            <input className={inputClass} value={form.name_myanmar} onChange={(event) => setForm({ ...form, name_myanmar: event.target.value })} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Student code
            <input className={inputClass} value={form.student_code} onChange={(event) => setForm({ ...form, student_code: event.target.value })} required autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Email (login)
            <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Username
            <input className={inputClass} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required autoComplete="username" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Study year
            <select
              className={inputClass}
              value={form.academic_year}
              onChange={(event) => setForm({
                ...form,
                academic_year: event.target.value,
                semester: semestersByYear[event.target.value][0]
              })}
              required
            >
              {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Semester
            <select
              className={inputClass}
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: event.target.value })}
              required
            >
              {semestersByYear[form.academic_year].map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving || promoting} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Adding…' : 'Add student'}
            </button>
          </div>
        </form>

        {credentials && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">Student activation details — share these privately</p>
            <p className="mt-2">Email: {credentials.email}</p>
            <p>Student code: {credentials.student_code}</p>
            <p>One-time activation code: <strong>{credentials.activation_code}</strong></p>
            <p className="mt-2 text-emerald-800">The code works once and expires in 7 days. The student creates their own password.</p>
            <button type="button" onClick={() => setCredentials(null)} className="mt-3 font-semibold underline underline-offset-2">
              Hide activation details
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-800">Student roster</h4>
            <p className="mt-1 text-sm text-slate-600">
              Showing {filteredStudents.length} of {students.length} students. Search by name, code, email, or username.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className={inputClass}
              type="search"
              placeholder="Search students"
              aria-label="Search students"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className={inputClass}
              aria-label="Filter by study year"
              value={rosterYear}
              onChange={(event) => {
                const year = event.target.value;
                setRosterYear(year);
                if (rosterSemester !== 'all'
                    && year !== 'all'
                    && !semestersByYear[year].includes(rosterSemester)) {
                  setRosterSemester('all');
                }
              }}
            >
              <option value="all">All study years</option>
              {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select
              className={inputClass}
              aria-label="Filter by semester"
              value={rosterSemester}
              onChange={(event) => setRosterSemester(event.target.value)}
            >
              <option value="all">All semesters</option>
              {(rosterYear === 'all'
                ? [...new Set(Object.values(semestersByYear).flat())]
                : semestersByYear[rosterYear]
              ).map((semester) => <option key={semester} value={semester}>{semester}</option>)}
            </select>
          </div>
        </div>
        {editingStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget && studentActionId !== editingStudent.student_id) {
                setEditingStudent(null);
              }
            }}
          >
            <section
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-student-title"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h5 id="edit-student-title" className="text-xl font-bold text-slate-800">
                    Edit {editingStudent.name || editingStudent.student_code}
                  </h5>
                  <p className="mt-1 text-sm text-slate-600">
                    Leave the password blank to keep it unchanged.
                    {!editingStudent.account_created_at && ' Set a password to create their login account.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={studentActionId === editingStudent.student_id}
                  aria-label="Close edit student dialog"
                  className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleUpdate} className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Student name
                  <input className={inputClass} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required autoComplete="name" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Myanmar name
                  <input className={inputClass} value={editForm.name_myanmar} onChange={(event) => setEditForm({ ...editForm, name_myanmar: event.target.value })} required />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Student code
                  <input className={inputClass} value={editForm.student_code} onChange={(event) => setEditForm({ ...editForm, student_code: event.target.value })} required />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Email (login)
                  <input className={inputClass} type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required autoComplete="email" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Username
                  <input className={inputClass} value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} required autoComplete="username" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Study year
                  <select
                    className={inputClass}
                    value={editForm.academic_year || ''}
                    onChange={(event) => {
                      const year = event.target.value;
                      setEditForm({
                        ...editForm,
                        academic_year: year,
                        semester: semestersByYear[year]?.includes(editForm.semester)
                          ? editForm.semester
                          : ''
                      });
                    }}
                  >
                    <option value="">Unassigned</option>
                    {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Semester
                  <select
                    className={inputClass}
                    value={editForm.semester || ''}
                    onChange={(event) => setEditForm({ ...editForm, semester: event.target.value })}
                    disabled={!editForm.academic_year}
                  >
                    <option value="">Unassigned</option>
                    {(semestersByYear[editForm.academic_year] || []).map((semester) => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  {editingStudent.account_created_at ? 'New password (optional)' : 'Password to create login (optional)'}
                  <input className={inputClass} type="password" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} minLength={editForm.password ? 6 : undefined} autoComplete="new-password" />
                </label>
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <button type="submit" disabled={studentActionId === editingStudent.student_id} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
                    {studentActionId === editingStudent.student_id ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setEditingStudent(null)} disabled={studentActionId === editingStudent.student_id} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        {loading ? (
          <p className="mt-5 text-sm text-slate-600">Loading students…</p>
        ) : students.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No students registered yet.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No students match that search.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Code</th>
                  <th className="px-3 py-3 font-semibold">Study year</th>
                  <th className="px-3 py-3 font-semibold">Semester</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Username</th>
                  <th className="px-3 py-3 font-semibold">Login access</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.student_id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-3">
                      <p className="font-medium">{student.name || student.name_myanmar}</p>
                      {student.name && <p className="text-xs text-slate-500">{student.name_myanmar}</p>}
                    </td>
                    <td className="px-3 py-3">{student.student_code}</td>
                    <td className="px-3 py-3">{student.academic_year || 'Unassigned'}</td>
                    <td className="px-3 py-3">{student.semester || 'Unassigned'}</td>
                    <td className="px-3 py-3">{student.email}</td>
                    <td className="px-3 py-3">{student.username}</td>
                    <td className="px-3 py-3">
                      {student.account_created_at
                        ? <span className="font-medium text-emerald-700">Ready</span>
                        : student.account_student_id
                          ? <span className="font-medium text-amber-700">Pending activation</span>
                          : <span className="font-medium text-slate-500">No account</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        {!student.account_created_at && student.account_student_id && (
                          <button
                            type="button"
                            onClick={() => handleRegenerateActivationCode(student)}
                            disabled={studentActionId !== null || promoting}
                            className="font-semibold text-blue-700 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            New code
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditing(student)}
                          disabled={studentActionId !== null || promoting}
                          className="font-semibold text-blue-700 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          disabled={studentActionId !== null || promoting}
                          className="font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          {studentActionId === student.student_id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default AdminPanel;
