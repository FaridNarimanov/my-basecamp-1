const { Project, ProjectMember } = require('../models');

const getProjectAccess = async (projectId, userId) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    if (project.user_id === userId) {
        return { project, role: 'owner', isOwner: true, isAdmin: true };
    }

    const membership = await ProjectMember.findOne({
        where: { project_id: projectId, user_id: userId }
    });

    if (!membership) return null;

    return {
        project,
        membership,
        role: membership.role,
        isOwner: false,
        isAdmin: membership.role === 'admin'
    };
};

const requireProjectAccess = async (req, res, next) => {
    try {
        const access = await getProjectAccess(req.params.id, req.session.userId);
        if (!access) return res.status(403).json({ message: 'Access denied.' });
        req.projectAccess = access;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    getProjectAccess,
    requireProjectAccess
};
