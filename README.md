# My Basecamp 1

My Basecamp 1 is a simplified Basecamp-style project management application built as part of the Qwasar curriculum.

The project focuses on authentication, project management, MVC architecture, ORM usage, user/admin permissions, secure file uploads, and clean backend separation.

## Tech Stack

- Node.js
- Express.js
- SQLite
- Sequelize ORM
- bcrypt
- express-session
- multer
- HTML
- CSS
- JavaScript

## Description

The app allows users to register, log in, create and manage projects, add members, assign project roles, create discussions and tasks, upload attachments, and manage user profiles.

The backend follows an MVC-style structure and uses Sequelize as the ORM for SQLite instead of raw `sqlite3` queries.

## Main Features

- User registration
- Login with email or username
- Logout
- Dashboard
- Create, show, edit, and delete projects
- Add project members by username
- Remove project members
- Change project member role between admin and viewer
- Discussions
- Tasks and task completion
- Attachments with upload validation
- Profile edit
- Profile picture upload
- User profile page
- User create, show, and destroy
- Global admin set/remove
- Admin panel at `/admin`

## Admin System

- The first registered user automatically becomes the first global admin.
- Later users are created as normal users by default.
- Global admins can manage users from the admin panel.
- Normal users cannot access admin pages or admin API actions.
- The last remaining global admin cannot be deleted or demoted.

## MVC Structure

```text
server.js
config/
  database.js
models/
  User.js
  Project.js
  ProjectMember.js
  Discussion.js
  Task.js
  Attachment.js
  index.js
controllers/
  authController.js
  userController.js
  adminController.js
  projectController.js
  memberController.js
  discussionController.js
  taskController.js
  attachmentController.js
  profileController.js
routes/
  authRoutes.js
  userRoutes.js
  adminRoutes.js
  projectRoutes.js
  profileRoutes.js
middleware/
  auth.js
  projectAccess.js
  upload.js
utils/
  projectCleanup.js
  validation.js
public/
  admin.html
  create_project.html
  dashboard.html
  edit_profile.html
  edit_project.html
  login.html
  project.html
  register.html
  style.css
  user_profile.html
````

`server.js` only initializes Express, configures middleware, serves static files, mounts routes, syncs Sequelize, and starts the server.

## ORM

The app uses Sequelize with SQLite.

Models:

* User
* Project
* ProjectMember
* Discussion
* Task
* Attachment

Associations include:

* User has many Projects
* Project belongs to User as owner
* Project belongs to many Users through ProjectMember
* Project has many Discussions, Tasks, and Attachments
* Discussion belongs to User
* Attachment belongs to User as uploader

## User Routes

* `POST /users` creates a user
* `GET /users/:id` shows a user without password hashes
* `GET /api/users/:username` supports the frontend user profile page
* `DELETE /users/:id` deletes a user when permitted

User deletion rules:

* A user can delete their own account.
* A global admin can delete any non-admin user.
* The last remaining global admin cannot be deleted.
* Owned projects are deleted with their members, discussions, tasks, attachments, and uploaded files.
* Profile pictures and attachments are deleted only through safe paths inside `public/uploads`.

## Global Admin Routes

* `PATCH /users/:id/admin` makes a user a global admin
* `DELETE /users/:id/admin` removes global admin status
* `GET /admin/users` lists users for the admin page

Project member roles are separate from the global `users.role`.

## Security

* Passwords are hashed with bcrypt.
* Passwords are not trimmed before hashing or comparison.
* Session cookies use `httpOnly` and `sameSite: 'lax'`.
* Sequelize model methods are used instead of raw SQL.
* Upload size is limited to 5MB.
* Attachments allow PNG, JPEG/JPG, WebP, and PDF.
* Profile pictures allow PNG, JPEG/JPG, and WebP.
* Stored upload filenames are random.
* Original filenames are cleaned before display.
* Upload deletion is restricted to `public/uploads`.
* Project access checks protect project routes.
* Task, attachment, member, and project routes include IDOR protection.

## Runtime Files

The following files and folders are generated locally and should not be committed:

* `basecamp.db`
* `public/uploads/`
* `node_modules/`
* `.env`

## Installation

```bash
npm install
```

## Usage

```bash
node server.js
```

Open:

```text
http://localhost:8080
```

Register the first user to create the first global admin. Later users are normal users by default.

Admin users can access:

```text
http://localhost:8080/admin
```

## Core Team

* Farid Narimanov

## Note

Educational project built as part of the Qwasar My Basecamp curriculum.
