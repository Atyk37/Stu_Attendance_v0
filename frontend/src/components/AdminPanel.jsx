import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api';

const emptyForm = {
  name: '',
  name_myanmar: '',
  student_code: '',
  email: '',
  username: '',
  password: ''
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
  const [feedback, setFeedback] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentActionId, setStudentActionId] = useState(null);

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
    if (!query) return students;
    return students.filter((student) =>
      [student.name, student.name_myanmar, student.student_code, student.email, student.username]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [search, students]);

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

      setCredentials({ ...data.student, password: form.password });
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

  const startEditing = (student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || '',
      name_myanmar: student.name_myanmar || '',
      student_code: student.student_code || '',
      email: student.email || '',
      username: student.username || '',
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
      setEditForm(emptyForm);
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

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800">Admin Dashboard</h3>
        <p className="mt-2 text-slate-600">Welcome, {admin.name}. Register students and manage their portal access.</p>
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

      {feedback && (
        <p className={`rounded-xl p-4 text-sm font-semibold ${feedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-xl font-bold text-slate-800">Register a student</h4>
        <p className="mt-1 text-sm text-slate-600">Create the student roster entry and sign-in account together.</p>
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
            Initial password
            <input className={inputClass} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} autoComplete="new-password" />
            <span className="font-normal text-slate-500">At least 6 characters. Share it with the student privately.</span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Registering…' : 'Register student'}
            </button>
          </div>
        </form>

        {credentials && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">Student login details — share these privately</p>
            <p className="mt-2">Name: {credentials.name}</p>
            <p>Email: {credentials.email}</p>
            <p>Student code: {credentials.student_code}</p>
            <p>Password: {credentials.password}</p>
            <p className="mt-2 text-emerald-800">The password is shown only here. It cannot be retrieved from the student list.</p>
            <button type="button" onClick={() => setCredentials(null)} className="mt-3 font-semibold underline underline-offset-2">
              Hide login details
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-800">Student roster</h4>
            <p className="mt-1 text-sm text-slate-600">Search by name, student code, email, or username.</p>
          </div>
          <input
            className={`${inputClass} sm:max-w-xs`}
            type="search"
            placeholder="Search students"
            aria-label="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {editingStudent && (
          <form onSubmit={handleUpdate} className="mt-5 grid gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h5 className="font-semibold text-slate-800">Edit {editingStudent.name || editingStudent.student_code}</h5>
              <p className="mt-1 text-xs text-slate-600">
                Leave the password blank to keep it unchanged.
                {!editingStudent.account_created_at && ' Set a password to create their login account.'}
              </p>
            </div>
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
              {editingStudent.account_created_at ? 'New password (optional)' : 'Password to create login (optional)'}
              <input className={inputClass} type="password" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} minLength={editForm.password ? 6 : undefined} autoComplete="new-password" />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={studentActionId === editingStudent.student_id} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
                {studentActionId === editingStudent.student_id ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setEditingStudent(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">
                Cancel
              </button>
            </div>
          </form>
        )}
        {loading ? (
          <p className="mt-5 text-sm text-slate-600">Loading students…</p>
        ) : students.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No students registered yet.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No students match that search.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Code</th>
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
                    <td className="px-3 py-3">{student.email}</td>
                    <td className="px-3 py-3">{student.username}</td>
                    <td className="px-3 py-3">
                      {student.account_created_at
                        ? <span className="font-medium text-emerald-700">Ready</span>
                        : <span className="font-medium text-amber-700">No account</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEditing(student)}
                          disabled={studentActionId !== null}
                          className="font-semibold text-blue-700 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          disabled={studentActionId !== null}
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
