const { User } = require('../models');

const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
    next();
};

const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Global admin access required.' });
        }
        req.currentUser = user;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const requireAdminPage = async (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user || user.role !== 'admin') return res.redirect('/dashboard');
        next();
    } catch (err) {
        res.redirect('/dashboard');
    }
};

module.exports = {
    requireLogin,
    requireAdmin,
    requireAdminPage
};
