const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { trimString } = require('../utils/validation');

const uploadDir = path.resolve(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedAttachmentTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const allowedAvatarTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const allowedExtensionsByType = new Map([
    ['image/png', new Set(['.png'])],
    ['image/jpeg', new Set(['.jpg', '.jpeg'])],
    ['image/webp', new Set(['.webp'])],
    ['application/pdf', new Set(['.pdf'])]
]);
const maxUploadSize = 5 * 1024 * 1024;

const cleanOriginalFileName = (name) => {
    const base = path.basename(trimString(name)).replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '_');
    return base || 'uploaded-file';
};

const makeUpload = (allowedTypes, typeListMessage) => multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || '').toLowerCase();
            cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
        }
    }),
    limits: { fileSize: maxUploadSize },
    fileFilter: (req, file, cb) => {
        if (!allowedTypes.has(file.mimetype)) {
            return cb(new Error(`Unsupported file type. Allowed types are ${typeListMessage}.`));
        }
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExtensions = allowedExtensionsByType.get(file.mimetype);
        if (!allowedExtensions || !allowedExtensions.has(ext)) {
            return cb(new Error('File extension does not match the uploaded file type.'));
        }
        cb(null, true);
    }
});

const attachmentUpload = makeUpload(allowedAttachmentTypes, 'PNG, JPEG, WebP, and PDF');
const avatarUpload = makeUpload(allowedAvatarTypes, 'PNG, JPEG, and WebP');

const resolveUploadFilePath = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return null;
    const resolved = path.resolve(__dirname, '..', 'public', `.${filePath}`);
    return resolved.startsWith(uploadDir + path.sep) ? resolved : null;
};

const safeDeleteUpload = async (filePath) => {
    const resolved = resolveUploadFilePath(filePath);
    if (!resolved) return;
    try {
        await fs.promises.unlink(resolved);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
};

const uploadErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ message: 'File upload error.' });
    }

    if (err && err.message && (
        err.message.startsWith('Unsupported file type') ||
        err.message === 'File extension does not match the uploaded file type.'
    )) {
        return res.status(400).json({ message: err.message });
    }

    next(err);
};

module.exports = {
    attachmentUpload,
    avatarUpload,
    cleanOriginalFileName,
    safeDeleteUpload,
    uploadErrorHandler,
    uploadDir
};
