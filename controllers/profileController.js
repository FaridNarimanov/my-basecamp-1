const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User } = require('../models');
const { requireText } = require('../utils/validation');
const { safeDeleteUpload } = require('../middleware/upload');

const showProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ['name', 'email', 'profile_pic', 'username']
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const updateProfile = async (req, res) => {
    const name = requireText(req.body.name, 'Name');
    const email = requireText(req.body.email, 'Email');
    const username = requireText(req.body.username, 'Username');
    const oldPassword = typeof req.body.oldPassword === 'string' ? req.body.oldPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    const hasNewPassword = typeof req.body.newPassword === 'string' && req.body.newPassword.length > 0;

    if (name.error || email.error || username.error) {
        return res.status(400).json({ message: 'Name, email, and username are required.' });
    }

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingUsername = await User.findOne({
            where: {
                username: username.value,
                id: { [Op.ne]: req.session.userId }
            }
        });
        if (existingUsername) return res.status(400).json({ message: 'This username is already taken.' });

        if (hasNewPassword) {
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match) return res.status(401).json({ message: 'Incorrect current password.' });
            user.password = await bcrypt.hash(newPassword, 10);
        }

        user.name = name.value;
        user.email = email.value;
        user.username = username.value;
        await user.save();

        res.json({ message: hasNewPassword ? 'Profile and password updated successfully!' : 'Profile updated successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const updateProfilePicture = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const filePath = '/uploads/' + req.file.filename;
        const oldPath = user.profile_pic;

        user.profile_pic = filePath;
        await user.save();

        if (oldPath && oldPath !== filePath) {
            try {
                await safeDeleteUpload(oldPath);
            } catch (deleteErr) {
                console.error('Could not delete old profile picture:', deleteErr.message);
            }
        }

        res.json({ message: 'Profile picture updated!', filePath });
    } catch (err) {
        await safeDeleteUpload('/uploads/' + req.file.filename);
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    showProfile,
    updateProfile,
    updateProfilePicture
};
