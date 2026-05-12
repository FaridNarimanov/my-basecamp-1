const express = require('express');
const projectController = require('../controllers/projectController');
const memberController = require('../controllers/memberController');
const discussionController = require('../controllers/discussionController');
const taskController = require('../controllers/taskController');
const attachmentController = require('../controllers/attachmentController');
const { requireLogin } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const { attachmentUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/projects', requireLogin, projectController.listProjects);
router.post('/projects', requireLogin, projectController.createProject);
router.get('/projects/:id', requireLogin, requireProjectAccess, projectController.showProject);
router.put('/projects/:id', requireLogin, requireProjectAccess, projectController.updateProject);
router.delete('/projects/:id', requireLogin, projectController.destroyProject);
router.get('/projects/:id/details', requireLogin, requireProjectAccess, projectController.showProjectDetails);

router.get('/projects/:id/members', requireLogin, requireProjectAccess, memberController.listMembers);
router.post('/projects/:id/members', requireLogin, requireProjectAccess, memberController.addMember);
router.delete('/projects/:id/members/:username', requireLogin, requireProjectAccess, memberController.removeMember);
router.patch('/projects/:id/members/:username/role', requireLogin, requireProjectAccess, memberController.updateMemberRole);

router.get('/projects/:id/discussions', requireLogin, requireProjectAccess, discussionController.listDiscussions);
router.post('/projects/:id/discussions', requireLogin, requireProjectAccess, discussionController.createDiscussion);

router.get('/projects/:id/tasks', requireLogin, requireProjectAccess, taskController.listTasks);
router.post('/projects/:id/tasks', requireLogin, requireProjectAccess, taskController.createTask);
router.patch('/tasks/:taskId', requireLogin, taskController.updateTask);

router.get('/projects/:id/attachments', requireLogin, requireProjectAccess, attachmentController.listAttachments);
router.post('/projects/:id/attachments', requireLogin, requireProjectAccess, attachmentUpload.single('file'), attachmentController.createAttachment);
router.delete('/projects/:id/attachments/:attachmentId', requireLogin, requireProjectAccess, attachmentController.destroyAttachment);

module.exports = router;
