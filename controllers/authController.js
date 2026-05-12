const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User } = require('../models');
const { trimString } = require('../utils/validation');

const createSession = async (req, res) => {
    const login = trimString(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!login || !password) {
        return res.status(400).json({ message: 'Email/username and password are required' });
    }

    try {
        const user = await User.findOne({
            where: {
                [Op.or]: [{ email: login }, { username: login }]
            }
        });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid email or password' });

        req.session.userId = user.id;
        res.json({ message: 'Logged in successfully', role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteSession = (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out' });
    });
};

module.exports = {
    createSession,
    deleteSession
};
