const express = require('express');
const path = require('path');
const session = require('express-session');
const { sequelize } = require('./models');
const { requireAdminPage } = require('./middleware/auth');
const { uploadErrorHandler } = require('./middleware/upload');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const projectRoutes = require('./routes/projectRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (req.path.endsWith('.html') && req.path.length > 5) {
        const cleanPath = req.path.slice(0, -5);
        const query = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : '';
        return res.redirect(301, cleanPath + query);
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'basecamp_dev_secret_change_in_prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/admin', requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use(authRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use(projectRoutes);
app.use(profileRoutes);

app.use(uploadErrorHandler);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
});

const start = async () => {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
};

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
