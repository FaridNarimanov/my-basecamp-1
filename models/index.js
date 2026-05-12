const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Discussion = require('./Discussion');
const Task = require('./Task');
const Attachment = require('./Attachment');

User.hasMany(Project, { foreignKey: 'user_id', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

Project.belongsToMany(User, {
    through: ProjectMember,
    foreignKey: 'project_id',
    otherKey: 'user_id',
    as: 'members'
});
User.belongsToMany(Project, {
    through: ProjectMember,
    foreignKey: 'user_id',
    otherKey: 'project_id',
    as: 'memberProjects'
});

Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'memberships' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'projectMemberships' });

Project.hasMany(Discussion, { foreignKey: 'project_id', as: 'discussions' });
Discussion.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Discussion.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Discussion, { foreignKey: 'user_id', as: 'discussions' });

Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

Project.hasMany(Attachment, { foreignKey: 'project_id', as: 'attachments' });
Attachment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Attachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
User.hasMany(Attachment, { foreignKey: 'uploaded_by', as: 'uploadedAttachments' });

module.exports = {
    sequelize,
    User,
    Project,
    ProjectMember,
    Discussion,
    Task,
    Attachment
};
