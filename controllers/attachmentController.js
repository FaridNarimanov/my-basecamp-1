const { Attachment } = require('../models');
const { cleanOriginalFileName, safeDeleteUpload } = require('../middleware/upload');

const listAttachments = async (req, res) => {
    try {
        const access = req.projectAccess;
        const attachments = await Attachment.findAll({
            where: { project_id: access.project.id },
            order: [['id', 'DESC']]
        });

        res.json({ attachments, role: access.role });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

const createAttachment = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const filePath = '/uploads/' + req.file.filename;
        await Attachment.create({
            project_id: req.projectAccess.project.id,
            file_name: cleanOriginalFileName(req.file.originalname),
            file_path: filePath,
            uploaded_by: req.session.userId
        });
        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (err) {
        await safeDeleteUpload('/uploads/' + req.file.filename);
        res.status(500).json({ message: 'Database error' });
    }
};

const destroyAttachment = async (req, res) => {
    try {
        const access = req.projectAccess;
        if (!access.isOwner && !access.isAdmin) {
            return res.status(403).json({ message: 'Only project owner or admins can delete files.' });
        }

        const file = await Attachment.findOne({
            where: { id: req.params.attachmentId, project_id: access.project.id }
        });
        if (!file) return res.status(404).json({ message: 'File not found' });

        await safeDeleteUpload(file.file_path);
        await file.destroy();
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
};

module.exports = {
    listAttachments,
    createAttachment,
    destroyAttachment
};
