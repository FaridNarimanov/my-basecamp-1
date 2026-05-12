const { Project, User, ProjectMember, Discussion, Attachment, sequelize } = require('../models');
const { requireText } = require('../utils/validation');
const { deleteProjectWithRelations } = require('../utils/projectCleanup');
const { safeDeleteUpload } = require('../middleware/upload');

const projectToDashboardJson = async (project, relation, userRole) => {
    const [memberCount, discussionCount] = await Promise.all([
        ProjectMember.count({ where: { project_id: project.id } }),
        Discussion.count({ where: { project_id: project.id } })
    ]);

    return {
        id: project.id,
        name: project.name,
        description: project.description,
        user_id: project.user_id,
        creator_email: project.owner ? project.owner.email : '',
        relation,
        user_role: userRole,
        member_count: memberCount + 1,
        discussion_count: discussionCount
    };
};

const listProjects = async (req, res) => {
    try {
        const ownedProjects = await Project.findAll({
            where: { user_id: req.session.userId },
            include: [{ model: User, as: 'owner', attributes: ['email'] }]
        });
        const memberships = await ProjectMember.findAll({
            where: { user_id: req.session.userId },
            include: [{
                model: Project,
                as: 'project',
                include: [{ model: User, as: 'owner', attributes: ['email'] }]
            }]
        });

        const rows = [];
        for (const project of ownedProjects) {
            rows.push(await projectToDashboardJson(project, 'owner', 'owner'));
        }
        for (const membership of memberships) {
            if (membership.project) {
                rows.push(await projectToDashboardJson(membership.project, 'shared', membership.role));
            }
        }

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const createProject = async (req, res) => {
    const name = requireText(req.body.name, 'Project name');
    const description = requireText(req.body.description, 'Description');
    if (name.error || description.error) {
        return res.status(400).json({ message: 'Project name and description are required.' });
    }

    try {
        const project = await Project.create({
            name: name.value,
            description: description.value,
            user_id: req.session.userId
        });
        res.status(201).json({ message: 'Project created', id: project.id });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const updateProject = async (req, res) => {
    const name = requireText(req.body.name, 'Project name');
    const description = requireText(req.body.description, 'Description');
    if (name.error || description.error) {
        return res.status(400).json({ message: 'Project name and description are required.' });
    }

    try {
        const access = req.projectAccess;
        if (!access || (!access.isOwner && !access.isAdmin)) {
            return res.status(403).json({ message: 'Access denied. Only owner and admins can edit project details.' });
        }

        await access.project.update({ name: name.value, description: description.value });
        res.json({ message: 'Project updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const destroyProject = async (req, res) => {
    try {
        const project = await Project.findOne({ where: { id: req.params.id, user_id: req.session.userId } });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        let filePaths = [];
        await sequelize.transaction(async (transaction) => {
            filePaths = await deleteProjectWithRelations(project.id, transaction);
        });

        for (const filePath of filePaths) {
            await safeDeleteUpload(filePath);
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const showProject = async (req, res) => {
    try {
        const project = req.projectAccess.project;
        res.json({
            id: project.id,
            name: project.name,
            description: project.description,
            user_id: project.user_id
        });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const showProjectDetails = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id, {
            include: [{ model: User, as: 'owner', attributes: ['email', 'username'] }]
        });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        res.json({
            id: project.id,
            name: project.name,
            description: project.description,
            user_id: project.user_id,
            creator_email: project.owner ? project.owner.email : '',
            creator_username: project.owner ? project.owner.username : ''
        });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    listProjects,
    createProject,
    updateProject,
    destroyProject,
    showProject,
    showProjectDetails
};
