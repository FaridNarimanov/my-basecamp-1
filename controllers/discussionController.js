const { Discussion, User } = require('../models');
const { requireText } = require('../utils/validation');

const formatDateForClient = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (part) => String(part).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

const listDiscussions = async (req, res) => {
    try {
        const discussions = await Discussion.findAll({
            where: { project_id: req.projectAccess.project.id },
            include: [{ model: User, as: 'user', attributes: ['name', 'username', 'profile_pic', 'email'] }],
            order: [['created_at', 'DESC']]
        });

        res.json(discussions.map((discussion) => ({
            id: discussion.id,
            project_id: discussion.project_id,
            user_id: discussion.user_id,
            content: discussion.content,
            created_at: formatDateForClient(discussion.created_at),
            user_name: discussion.user ? discussion.user.name : '',
            username: discussion.user ? discussion.user.username : '',
            profile_pic: discussion.user ? discussion.user.profile_pic : '',
            user_email: discussion.user ? discussion.user.email : ''
        })));
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const createDiscussion = async (req, res) => {
    const content = requireText(req.body.content, 'Discussion content');
    if (content.error) return res.status(400).json({ message: 'Discussion content is required.' });

    try {
        await Discussion.create({
            project_id: req.projectAccess.project.id,
            user_id: req.session.userId,
            content: content.value
        });
        res.status(201).json({ message: 'Discussion added' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    listDiscussions,
    createDiscussion
};
