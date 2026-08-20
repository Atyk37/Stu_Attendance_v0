import React, { useState } from 'react';

export default function TeacherProfile({ teacher, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} aria-label="Open teacher profile" style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #0056b3', backgroundColor: '#e3f2fd', color: '#0056b3', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
        {teacher.name?.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <section style={{ position: 'absolute', top: '52px', right: 0, zIndex: 10, width: '280px', padding: '18px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Teacher Profile</h3>
          <p style={{ margin: '8px 0', fontWeight: 'bold' }}>{teacher.name}</p>
          <p style={{ margin: '8px 0', color: '#666', fontSize: '13px' }}>{teacher.email}</p>
          <button type="button" onClick={onLogout} style={{ width: '100%', marginTop: '10px', padding: '9px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Log Out
          </button>
        </section>
      )}
    </div>
  );
}
