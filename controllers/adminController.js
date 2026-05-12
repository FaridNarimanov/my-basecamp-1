const { User } = require('../models');
const { publicUserAttributes } = require('./userController');

const listUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: publicUserAttributes,
            order: [['id', 'ASC']]
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const makeAdmin = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role !== 'user' && user.role !== 'admin') {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        user.role = 'admin';
        await user.save();
        res.json({ message: 'User promoted to global admin.' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const removeAdmin = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role !== 'admin') return res.status(400).json({ message: 'User is not a global admin.' });

        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
            return res.status(400).json({ message: 'Cannot remove the last remaining global admin.' });
        }

        user.role = 'user';
        await user.save();
        res.json({ message: 'Global admin role removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    listUsers,
    makeAdmin,
    removeAdmin
};
