const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (req.path.endsWith('.html') && req.path.length > 5) {
        const cleanPath = req.path.slice(0, -5);
        const query = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : '';
        return res.redirect(301, cleanPath + query);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'basecamp_dev_secret_change_in_prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

const db = new sqlite3.Database('./basecamp.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'user', profile_pic TEXT, username TEXT UNIQUE)");
    db.run("ALTER TABLE users ADD COLUMN username TEXT", () => {
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    });
    db.run("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, user_id INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS project_members (project_id INTEGER, user_id INTEGER, role TEXT, PRIMARY KEY(project_id, user_id))");
    db.run("CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, user_id INTEGER, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, content TEXT, is_completed BOOLEAN DEFAULT 0)");
    db.run("CREATE TABLE IF NOT EXISTS attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, file_name TEXT, file_path TEXT, uploaded_by INTEGER)");
});

const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized. Please log in." });
    next();
};

const requireProjectAccess = (req, res, next) => {
    db.get(`
        SELECT p.id FROM projects p
        WHERE p.id = ? AND (
            p.user_id = ?
            OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
        )
    `, [req.params.id, req.session.userId, req.session.userId], (err, row) => {
        if (err || !row) return res.status(403).json({ message: "Access denied." });
        next();
    });
};

const allowedProjectRoles = new Set(['admin', 'viewer']);

const trimString = (value) => typeof value === 'string' ? value.trim() : '';

const requireText = (value, fieldName) => {
    const trimmed = trimString(value);
    if (!trimmed) return { error: `${fieldName} is required.` };
    return { value: trimmed };
};

const normalizeProjectRole = (role) => {
    const normalized = trimString(role).toLowerCase();
    return allowedProjectRoles.has(normalized) ? normalized : null;
};

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
    });
});

const uploadDir = path.resolve(__dirname, 'public', 'uploads');
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

const makeUpload = (allowedTypes) => multer({
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
            return cb(new Error('Unsupported file type. Allowed types are PNG, JPEG, WebP, and PDF.'));
        }
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExtensions = allowedExtensionsByType.get(file.mimetype);
        if (!allowedExtensions || !allowedExtensions.has(ext)) {
            return cb(new Error('File extension does not match the uploaded file type.'));
        }
        cb(null, true);
    }
});

const attachmentUpload = makeUpload(allowedAttachmentTypes);
const avatarUpload = makeUpload(allowedAvatarTypes);

const resolveUploadFilePath = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return null;
    const resolved = path.resolve(__dirname, 'public', `.${filePath}`);
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

app.get('/', (req, res) => { res.redirect('/login'); });

app.post('/users', async (req, res) => {
    const name = requireText(req.body.name, 'Name');
    const email = requireText(req.body.email, 'Email');
    const username = requireText(req.body.username, 'Username');
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.error || email.error || username.error || password.length === 0) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (name, email, username, password) VALUES (?, ?, ?, ?)",
            [name.value, email.value, username.value, hashedPassword], function(err) {
            if (err) return res.status(400).json({ message: "Email or username already exists." });
            res.status(201).json({ message: "User created successfully" });
        });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

app.post('/sessions', (req, res) => {
    const login = trimString(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!login || !password) return res.status(400).json({ message: "Email/username and password are required" });
    db.get("SELECT * FROM users WHERE email = ? OR username = ?", [login, login], async (err, user) => {
        if (err || !user) return res.status(401).json({ message: "Invalid email or password" });
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.userId = user.id;
            res.json({ message: "Logged in successfully", role: user.role });
        } else res.status(401).json({ message: "Invalid email or password" });
    });
});

app.delete('/sessions', (req, res) => { req.session.destroy(); res.json({ message: "Logged out" }); });

app.get('/projects', requireLogin, (req, res) => {
    db.all(`
        SELECT p.*, u.email as creator_email, 'owner' as relation, 'owner' as user_role,
               (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) + 1 as member_count,
               (SELECT COUNT(*) FROM discussions WHERE project_id = p.id) as discussion_count
        FROM projects p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?
        UNION
        SELECT p.*, u.email as creator_email, 'shared' as relation, pm.role as user_role,
               (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) + 1 as member_count,
               (SELECT COUNT(*) FROM discussions WHERE project_id = p.id) as discussion_count
        FROM projects p JOIN project_members pm ON p.id = pm.project_id
        JOIN users u ON p.user_id = u.id WHERE pm.user_id = ?
    `, [req.session.userId, req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

app.post('/projects', requireLogin, (req, res) => {
    const name = requireText(req.body.name, 'Project name');
    const description = requireText(req.body.description, 'Description');
    if (name.error || description.error) {
        return res.status(400).json({ message: "Project name and description are required." });
    }
    db.run("INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)",
        [name.value, description.value, req.session.userId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.status(201).json({ message: "Project created", id: this.lastID });
    });
});

app.put('/projects/:id', requireLogin, requireProjectAccess, (req, res) => {
    const name = requireText(req.body.name, 'Project name');
    const description = requireText(req.body.description, 'Description');
    if (name.error || description.error) {
        return res.status(400).json({ message: "Project name and description are required." });
    }
    
    db.get(`
        SELECT p.user_id as owner_id, pm.role 
        FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
        WHERE p.id = ?
    `, [req.session.userId, req.params.id], (err, accessInfo) => {
        if (err || !accessInfo) return res.status(404).json({ message: "Project not found" });

        const isOwner = accessInfo.owner_id === req.session.userId;
        const isAdmin = accessInfo.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied. Only owner and admins can edit project details." });
        }

        db.run("UPDATE projects SET name = ?, description = ? WHERE id = ?",
            [name.value, description.value, req.params.id], function(err) {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ message: "Project updated successfully" });
        });
    });
});

app.delete('/projects/:id', requireLogin, async (req, res) => {
    try {
        const project = await dbGet("SELECT id FROM projects WHERE id = ? AND user_id = ?", [req.params.id, req.session.userId]);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const attachments = await dbAll("SELECT file_path FROM attachments WHERE project_id = ?", [req.params.id]);

        await dbRun("BEGIN TRANSACTION");
        try {
            await dbRun("DELETE FROM project_members WHERE project_id = ?", [req.params.id]);
            await dbRun("DELETE FROM discussions WHERE project_id = ?", [req.params.id]);
            await dbRun("DELETE FROM tasks WHERE project_id = ?", [req.params.id]);
            await dbRun("DELETE FROM attachments WHERE project_id = ?", [req.params.id]);
            await dbRun("DELETE FROM projects WHERE id = ? AND user_id = ?", [req.params.id, req.session.userId]);
            await dbRun("COMMIT");
        } catch (err) {
            await dbRun("ROLLBACK");
            throw err;
        }

        for (const attachment of attachments) {
            await safeDeleteUpload(attachment.file_path);
        }

        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Database error" });
    }
});

app.get('/projects/:id', requireLogin, requireProjectAccess, (req, res) => {
    db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, project) => {
        if (err || !project) return res.status(404).json({ message: "Project not found." });
        res.json(project);
    });
});

app.get('/projects/:id/details', requireLogin, requireProjectAccess, (req, res) => {
    db.get(`SELECT p.*, u.email as creator_email, u.username as creator_username
            FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
        [req.params.id], (err, project) => {
        if (err || !project) return res.status(404).json({ message: "Project not found" });
        res.json(project);
    });
});

app.post('/projects/:id/members', requireLogin, requireProjectAccess, (req, res) => {
    const username = requireText(req.body.username, 'Username');
    const role = normalizeProjectRole(req.body.role);
    if (username.error) return res.status(400).json({ message: "Username is required." });
    if (!role) return res.status(400).json({ message: "Invalid role. Allowed roles are admin and viewer." });

    db.get("SELECT id FROM users WHERE username = ?", [username.value], (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found in the system." });
        
        db.get(`
            SELECT p.user_id as owner_id, pm.role as my_role 
            FROM projects p 
            LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
            WHERE p.id = ?
        `, [req.session.userId, req.params.id], (err, accessInfo) => {
            if (err || !accessInfo) return res.status(404).json({ message: "Project not found" });

            const isOwner = accessInfo.owner_id === req.session.userId;
            const isAdmin = accessInfo.my_role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: "Access denied. Only owner and admins can add members." });
            }

            if (accessInfo.owner_id === user.id) {
                return res.status(400).json({ message: "This user is already the project owner." });
            }

            db.run("INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
                [req.params.id, user.id, role], function(err) {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json({ message: `Member (@${username.value}) successfully added as ${role}!` });
            });
        });
    });
});

app.get('/projects/:id/members', requireLogin, requireProjectAccess, (req, res) => {
    db.all(`
        SELECT u.name, u.username, u.profile_pic, u.email, 'Owner' as role
        FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?
        UNION
        SELECT u.name, u.username, u.profile_pic, u.email, pm.role
        FROM project_members pm JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ? AND pm.user_id != (SELECT user_id FROM projects WHERE id = ?)
    `, [req.params.id, req.params.id, req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

app.delete('/projects/:id/members/:username', requireLogin, requireProjectAccess, (req, res) => {
    db.get("SELECT id FROM users WHERE username = ?", [req.params.username], (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found." });

        db.get(`
            SELECT p.user_id as owner_id, pm.role 
            FROM projects p 
            LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
            WHERE p.id = ?
        `, [req.session.userId, req.params.id], (err, accessInfo) => {
            if (err || !accessInfo) return res.status(404).json({ message: "Project not found" });

            const isOwner = accessInfo.owner_id === req.session.userId;
            const isAdmin = accessInfo.role === 'admin';

            if (!isOwner && !isAdmin && req.session.userId !== user.id) {
                return res.status(403).json({ message: "Only project owner or admins can remove members." });
            }

            if (accessInfo.owner_id === user.id) {
                return res.status(400).json({ message: "Cannot remove the project owner." });
            }

            db.run("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", [req.params.id, user.id], function(err) {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json({ message: "Member removed successfully" });
            });
        });
    });
});

app.patch('/projects/:id/members/:username/role', requireLogin, requireProjectAccess, (req, res) => {
    const role = normalizeProjectRole(req.body.role);
    if (!role) return res.status(400).json({ message: "Invalid role. Allowed roles are admin and viewer." });
    
    db.get("SELECT id FROM users WHERE username = ?", [req.params.username], (err, targetUser) => {
        if (err || !targetUser) return res.status(404).json({ message: "User not found." });

        db.get(`
            SELECT p.user_id as owner_id, pm.role as my_role
            FROM projects p 
            LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
            WHERE p.id = ?
        `, [req.session.userId, req.params.id], (err, accessInfo) => {
            if (err || !accessInfo) return res.status(404).json({ message: "Project not found" });

            const isOwner = accessInfo.owner_id === req.session.userId;
            const isAdmin = accessInfo.my_role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: "Only project owner or admins can change roles." });
            }

            if (accessInfo.owner_id === targetUser.id) {
                return res.status(400).json({ message: "Cannot change the role of the project owner." });
            }

            db.run("UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?", [role, req.params.id, targetUser.id], function(err) {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json({ message: `Member role updated to ${role}!` });
            });
        });
    });
});

app.get('/projects/:id/discussions', requireLogin, requireProjectAccess, (req, res) => {
    db.all(`SELECT d.*, u.name as user_name, u.username, u.profile_pic, u.email as user_email
            FROM discussions d JOIN users u ON d.user_id = u.id
            WHERE d.project_id = ? ORDER BY d.created_at DESC`,
        [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

app.post('/projects/:id/discussions', requireLogin, requireProjectAccess, (req, res) => {
    const content = requireText(req.body.content, 'Discussion content');
    if (content.error) return res.status(400).json({ message: "Discussion content is required." });

    db.run("INSERT INTO discussions (project_id, user_id, content) VALUES (?, ?, ?)",
        [req.params.id, req.session.userId, content.value], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.status(201).json({ message: "Discussion added" });
    });
});

app.get('/projects/:id/tasks', requireLogin, requireProjectAccess, (req, res) => {
    db.all("SELECT * FROM tasks WHERE project_id = ? ORDER BY id DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

app.post('/projects/:id/tasks', requireLogin, requireProjectAccess, (req, res) => {
    const content = requireText(req.body.content, 'Task content');
    if (content.error) return res.status(400).json({ message: "Task content is required." });

    db.run("INSERT INTO tasks (project_id, content) VALUES (?, ?)",
        [req.params.id, content.value], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.status(201).json({ message: "Task added", id: this.lastID });
    });
});

app.patch('/tasks/:taskId', requireLogin, async (req, res) => {
    try {
        const task = await dbGet("SELECT id, project_id FROM tasks WHERE id = ?", [req.params.taskId]);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const access = await dbGet(`
            SELECT p.id FROM projects p
            WHERE p.id = ? AND (
                p.user_id = ?
                OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
            )
        `, [task.project_id, req.session.userId, req.session.userId]);

        if (!access) return res.status(403).json({ message: "Access denied." });

        await dbRun("UPDATE tasks SET is_completed = ? WHERE id = ?", [req.body.is_completed ? 1 : 0, req.params.taskId]);
        res.json({ message: "Task updated" });
    } catch (err) {
        res.status(500).json({ message: "Database error" });
    }
});

app.get('/projects/:id/attachments', requireLogin, requireProjectAccess, (req, res) => {
    db.get(`
        SELECT p.user_id as owner_id, pm.role 
        FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
        WHERE p.id = ?
    `, [req.session.userId, req.params.id], (err, accessInfo) => {
        if (err || !accessInfo) return res.status(404).json({ message: "Project not found" });
        
        let role = 'viewer';
        if (accessInfo.owner_id === req.session.userId) role = 'owner';
        else if (accessInfo.role) role = accessInfo.role;

        db.all("SELECT * FROM attachments WHERE project_id = ? ORDER BY id DESC", [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ attachments: rows, role: role });
        });
    });
});

app.delete('/projects/:id/attachments/:attachmentId', requireLogin, requireProjectAccess, async (req, res) => {
    try {
        const accessInfo = await dbGet(`
        SELECT p.user_id as owner_id, pm.role 
        FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ? 
        WHERE p.id = ?
        `, [req.session.userId, req.params.id]);
        if (!accessInfo) return res.status(404).json({ message: "Not found" });

        const isOwner = accessInfo.owner_id === req.session.userId;
        const isAdmin = accessInfo.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Only project owner or admins can delete files." });
        }

        const file = await dbGet("SELECT file_path FROM attachments WHERE id = ? AND project_id = ?", [req.params.attachmentId, req.params.id]);
        if (!file) return res.status(404).json({ message: "File not found" });

        await safeDeleteUpload(file.file_path);
        await dbRun("DELETE FROM attachments WHERE id = ? AND project_id = ?", [req.params.attachmentId, req.params.id]);
        res.json({ message: "File deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Database error" });
    }
});

app.post('/projects/:id/attachments', requireLogin, requireProjectAccess, attachmentUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const filePath = '/uploads/' + req.file.filename;
    db.run("INSERT INTO attachments (project_id, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?)",
        [req.params.id, cleanOriginalFileName(req.file.originalname), filePath, req.session.userId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.status(201).json({ message: "File uploaded successfully" });
    });
});

app.get('/profile', requireLogin, (req, res) => {
    db.get("SELECT name, email, profile_pic, username FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    });
});

app.put('/profile', requireLogin, async (req, res) => {
    const name = requireText(req.body.name, 'Name');
    const email = requireText(req.body.email, 'Email');
    const username = requireText(req.body.username, 'Username');
    const oldPassword = typeof req.body.oldPassword === 'string' ? req.body.oldPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    const hasNewPassword = typeof req.body.newPassword === 'string' && req.body.newPassword.length > 0;
    if (name.error || email.error || username.error) {
        return res.status(400).json({ message: "Name, email, and username are required." });
    }

    try {
        db.get("SELECT id FROM users WHERE username = ? AND id != ?", [username.value, req.session.userId], async (err, existing) => {
            if (err) return res.status(500).json({ message: "Database error" });
            if (existing) return res.status(400).json({ message: "This username is already taken." });
            if (hasNewPassword) {
                db.get("SELECT password FROM users WHERE id = ?", [req.session.userId], async (err, user) => {
                    if (err || !user) return res.status(404).json({ message: "User not found" });
                    const match = await bcrypt.compare(oldPassword, user.password);
                    if (!match) return res.status(401).json({ message: "Incorrect current password." });
                    const hashed = await bcrypt.hash(newPassword, 10);
                    db.run("UPDATE users SET name=?, email=?, username=?, password=? WHERE id=?",
                        [name.value, email.value, username.value, hashed, req.session.userId], function(err) {
                        if (err) return res.status(500).json({ message: "Database error" });
                        res.json({ message: "Profile and password updated successfully!" });
                    });
                });
            } else {
                db.run("UPDATE users SET name=?, email=?, username=? WHERE id=?",
                    [name.value, email.value, username.value, req.session.userId], function(err) {
                    if (err) return res.status(500).json({ message: "Database error" });
                    res.json({ message: "Profile updated successfully!" });
                });
            }
        });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

app.post('/profile/picture', requireLogin, avatarUpload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const filePath = '/uploads/' + req.file.filename;
    db.get("SELECT profile_pic FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found" });
        const oldPath = user.profile_pic;

        db.run("UPDATE users SET profile_pic = ? WHERE id = ?", [filePath, req.session.userId], async function(err) {
            if (err) return res.status(500).json({ message: "Database error" });
            if (oldPath && oldPath !== filePath) {
                try {
                    await safeDeleteUpload(oldPath);
                } catch (deleteErr) {
                    console.error('Could not delete old profile picture:', deleteErr.message);
                }
            }
            res.json({ message: "Profile picture updated!", filePath });
        });
    });
});

app.get('/api/users/:username', requireLogin, (req, res) => {
    db.get("SELECT name, username, email, profile_pic, role FROM users WHERE username = ?",
        [req.params.username], (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File is too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: "File upload error." });
    }

    if (err && err.message && err.message.startsWith('Unsupported file type')) {
        return res.status(400).json({ message: err.message });
    }

    next(err);
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
