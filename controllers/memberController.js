const { User, ProjectMember } = require('../models');
const { requireText, normalizeProjectRole } = require('../utils/validation');

const addMember = async (req, res) => {
    const username = requireText(req.body.username, 'Username');
    const role = normalizeProjectRole(req.body.role);
    if (username.error) return res.status(400).json({ message: 'Username is required.' });
    if (!role) return res.status(400).json({ message: 'Invalid role. Allowed roles are admin and viewer.' });

    try {
        const user = await User.findOne({ where: { username: username.value } });
        if (!user) return res.status(404).json({ message: 'User not found in the system.' });

        const access = req.projectAccess;
        if (!access.isOwner && !access.isAdmin) {
            return res.status(403).json({ message: 'Access denied. Only owner and admins can add members.' });
        }

        if (access.project.user_id === user.id) {
            return res.status(400).json({ message: 'This user is already the project owner.' });
        }

        await ProjectMember.upsert({
            project_id: access.project.id,
            user_id: user.id,
            role
        });

        res.json({ message: `Member (@${username.value}) successfully added as ${role}!` });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const listMembers = async (req, res) => {
    try {
        const owner = await User.findByPk(req.projectAccess.project.user_id, {
            attributes: ['name', 'username', 'profile_pic', 'email']
        });
        const memberships = await ProjectMember.findAll({
            where: { project_id: req.projectAccess.project.id },
            include: [{ model: User, as: 'user', attributes: ['name', 'username', 'profile_pic', 'email'] }]
        });

        const rows = [];
        if (owner) {
            rows.push({
                name: owner.name,
                username: owner.username,
                profile_pic: owner.profile_pic,
                email: owner.email,
                role: 'Owner'
            });
        }

        for (const membership of memberships) {
            if (!membership.user || membership.user_id === req.projectAccess.project.user_id) continue;
            rows.push({
                name: membership.user.name,
                username: membership.user.username,
                profile_pic: membership.user.profile_pic,
                email: membership.user.email,
                role: membership.role
            });
        }

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const removeMember = async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const access = req.projectAccess;
        if (!access.isOwner && !access.isAdmin && req.session.userId !== user.id) {
            return res.status(403).json({ message: 'Only project owner or admins can remove members.' });
        }

        if (access.project.user_id === user.id) {
            return res.status(400).json({ message: 'Cannot remove the project owner.' });
        }

        await ProjectMember.destroy({
            where: { project_id: access.project.id, user_id: user.id }
        });

        res.json({ message: 'Member removed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const updateMemberRole = async (req, res) => {
    const role = normalizeProjectRole(req.body.role);
    if (!role) return res.status(400).json({ message: 'Invalid role. Allowed roles are admin and viewer.' });

    try {
        const targetUser = await User.findOne({ where: { username: req.params.username } });
        if (!targetUser) return res.status(404).json({ message: 'User not found.' });

        const access = req.projectAccess;
        if (!access.isOwner && !access.isAdmin) {
            return res.status(403).json({ message: 'Only project owner or admins can change roles.' });
        }

        if (access.project.user_id === targetUser.id) {
            return res.status(400).json({ message: 'Cannot change the role of the project owner.' });
        }

        const membership = await ProjectMember.findOne({
            where: { project_id: access.project.id, user_id: targetUser.id }
        });
        if (!membership) return res.status(404).json({ message: 'Member not found.' });

        membership.role = role;
        await membership.save();
        res.json({ message: `Member role updated to ${role}!` });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    addMember,
    listMembers,
    removeMember,
    updateMemberRole
};
