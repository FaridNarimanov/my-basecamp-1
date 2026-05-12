const { Attachment, Discussion, Project, ProjectMember, Task, sequelize } = require('../models');
const { safeDeleteUpload } = require('../middleware/upload');

const deleteProjectWithRelations = async (projectId, transaction = null) => {
    const attachments = await Attachment.findAll({ where: { project_id: projectId }, transaction });
    const filePaths = attachments.map((attachment) => attachment.file_path);

    await ProjectMember.destroy({ where: { project_id: projectId }, transaction });
    await Discussion.destroy({ where: { project_id: projectId }, transaction });
    await Task.destroy({ where: { project_id: projectId }, transaction });
    await Attachment.destroy({ where: { project_id: projectId }, transaction });
    await Project.destroy({ where: { id: projectId }, transaction });

    return filePaths;
};

const deleteOwnedProjectsWithFiles = async (ownerId) => {
    const projects = await Project.findAll({ where: { user_id: ownerId } });
    const allFilePaths = [];

    await sequelize.transaction(async (transaction) => {
        for (const project of projects) {
            const filePaths = await deleteProjectWithRelations(project.id, transaction);
            allFilePaths.push(...filePaths);
        }
    });

    for (const filePath of allFilePaths) {
        await safeDeleteUpload(filePath);
    }
};

module.exports = {
    deleteProjectWithRelations,
    deleteOwnedProjectsWithFiles
};
