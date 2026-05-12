const bcrypt = require('bcrypt');
const { User, ProjectMember, Discussion, Attachment, sequelize } = require('../models');
const { requireText } = require('../utils/validation');
const { safeDeleteUpload } = require('../middleware/upload');
const { deleteOwnedProjectsWithFiles } = require('../utils/projectCleanup');

const publicUserAttributes = ['id', 'name', 'email', 'username', 'role', 'profile_pic'];

const createUser = async (req, res) => {
    const name = requireText(req.body.name, 'Name');
    const email = requireText(req.body.email, 'Email');
    const username = requireText(req.body.username, 'Username');
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (name.error || email.error || username.error || password.length === 0) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const adminCount = await User.count({ where: { role: 'admin' } });
        const role = adminCount === 0 ? 'admin' : 'user';

        const user = await User.create({
            name: name.value,
            email: email.value,
            username: username.value,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            message: role === 'admin' ? 'User created successfully as first global admin' : 'User created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                profile_pic: user.profile_pic
            }
        });
    } catch (err) {
        res.status(400).json({ message: 'Email or username already exists.' });
    }
};

const showUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, { attributes: publicUserAttributes });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const getUserByUsername = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            attributes: ['name', 'username', 'email', 'profile_pic', 'role']
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const destroyUser = async (req, res) => {
    try {
        const target = await User.findByPk(req.params.id);
        if (!target) return res.status(404).json({ message: 'User not found' });

        const current = await User.findByPk(req.session.userId);
        if (!current) return res.status(401).json({ message: 'Unauthorized. Please log in.' });

        const deletingSelf = current.id === target.id;
        const isGlobalAdmin = current.role === 'admin';

        if (!deletingSelf && (!isGlobalAdmin || target.role === 'admin')) {
            return res.status(403).json({ message: 'Only a global admin can delete another non-admin user.' });
        }

        if (target.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last remaining global admin.' });
            }
        }

        await deleteOwnedProjectsWithFiles(target.id);

        const uploadedAttachments = await Attachment.findAll({ where: { uploaded_by: target.id } });
        const attachmentPaths = uploadedAttachments.map((attachment) => attachment.file_path);
        const profilePath = target.profile_pic;

        await sequelize.transaction(async (transaction) => {
            await ProjectMember.destroy({ where: { user_id: target.id }, transaction });
            await Discussion.destroy({ where: { user_id: target.id }, transaction });
            await Attachment.destroy({ where: { uploaded_by: target.id }, transaction });
            await User.destroy({ where: { id: target.id }, transaction });
        });

        for (const filePath of attachmentPaths) {
            await safeDeleteUpload(filePath);
        }
        await safeDeleteUpload(profilePath);

        if (deletingSelf) {
            req.session.destroy(() => {
                res.json({ message: 'User deleted successfully. Owned projects and related uploads were also deleted.' });
            });
            return;
        }

        res.json({ message: 'User deleted successfully. Owned projects and related uploads were also deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    createUser,
    showUser,
    getUserByUsername,
    destroyUser,
    publicUserAttributes
};
