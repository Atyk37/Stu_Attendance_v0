const express = require('express');
const cors = require('cors');

const teacherRoutes = require('../backend/routes/teacherRoutes');
const studentRoutes = require('../backend/routes/studentRoutes');
const adminRoutes = require('../backend/routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// API Route Mounts
app.use('/api/lecturer', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
	res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
