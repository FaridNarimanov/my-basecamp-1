# Welcome to My Basecamp 1
***

## Task

The goal of this project is to build a simplified Basecamp-style project management web application.

The challenge was to create a working full-stack application where users can register, log in, create projects, manage project members, communicate inside projects, manage tasks, upload attachments, and view user profiles.

This version follows the **My Basecamp 1** requirements, so the interface is kept simple and static: no hover effects, transitions, animations, transforms, or smooth scrolling.

## Description

My Basecamp 1 is a project collaboration platform built with **Node.js**, **Express**, **SQLite**, and plain HTML/CSS/JavaScript.

The application includes:

- User registration and login
- Login with either email or username
- Password hashing with bcrypt
- Session-based authentication
- Project creation and editing
- Project dashboard with filters:
  - All projects
  - Created by me
  - Shared with me
- Project roles:
  - Owner
  - Admin
  - Viewer
- Add members to a project by username
- Change member roles between admin and viewer
- Remove members from a project
- Project discussion section
- Project task section
- Task completion system
- Project attachment upload
- Attachment deletion by owner/admin
- Profile editing
- Profile picture upload
- Public user profile pages
- Clicking a username opens that user's profile page
- Profile page shows:
  - Profile picture
  - Full name
  - Username
  - Role
  - Email

### Security Features

Several security improvements were added to make the application safer and more realistic.

Implemented protections include:

- **SQL Injection protection**
  - SQLite queries use parameterized statements instead of directly concatenating user input.

- **Password security**
  - Passwords are hashed using bcrypt before being stored in the database.
  - Plain-text passwords are never stored.

- **Session protection**
  - Sessions use `httpOnly` cookies.
  - `sameSite: 'lax'` is enabled.
  - Secure cookies are enabled automatically in production mode.

- **Authentication checks**
  - Protected routes require the user to be logged in.

- **Project access control**
  - Users can only access projects they own or projects where they are members.

- **IDOR protection**
  - Task updates check whether the task belongs to a project the current user can access.
  - Users cannot update tasks from projects they do not belong to.

- **Role tampering protection**
  - Project member roles are validated on the backend.
  - Only `admin` and `viewer` are accepted as member roles.
  - Arbitrary roles such as `owner`, `superadmin`, or invalid text are rejected.

- **File upload protection**
  - Upload size is limited to 5MB.
  - Allowed attachment types:
    - PNG
    - JPEG
    - WebP
    - PDF
  - Profile pictures only allow image files.
  - File MIME type and extension must match.
  - Uploaded files are saved with random safe filenames.
  - Original filenames are cleaned before being stored for display.

- **Path traversal protection**
  - File deletion is restricted to the `public/uploads` directory.
  - Uploaded files are safely resolved before deletion.

- **XSS protection**
  - User-controlled profile data is rendered safely using DOM methods and `textContent`.
  - User profile images are only loaded from `/uploads/`.
  - Invalid profile image paths fall back to a default avatar.

- **Database cleanup**
  - When a project is deleted, related project members, discussions, tasks, attachments, and uploaded files are cleaned up.

## Installation

Clone the repository and install dependencies:

```bash
npm install
````

Required dependencies include:

```bash
express
sqlite3
bcrypt
express-session
multer
```

The SQLite database file is created automatically when the server starts.
You do not need to manually create the database.

Start the server:

```bash
node server.js
```

The application will run on:

```bash
http://localhost:8080
```

## Usage

Open the app in your browser:

```bash
http://localhost:8080
```

### Main flow

1. Register a new account.
2. Log in using your email or username.
3. Create a new project.
4. Open the project from the dashboard.
5. Add discussions, tasks, and attachments.
6. Add other users to the project by username.
7. Manage members from the project settings page.
8. Click a username to view that user's profile.
9. Edit your own profile and upload a profile picture.

### Project Roles

#### Owner

The project creator is the owner.

The owner can:

* Edit project name and description
* Delete the project
* Add members
* Remove members
* Change member roles
* Upload attachments
* Delete attachments
* Create discussions
* Create and complete tasks

#### Admin

An admin can:

* Edit project name and description
* Add members
* Remove members
* Change member roles
* Upload attachments
* Delete attachments
* Create discussions
* Create and complete tasks

#### Viewer

A viewer can:

* View the project
* Read discussions
* View tasks
* View members
* View attachments
* Participate in project features allowed by the application

## Project Structure

```bash
.
├── server.js
├── package.json
├── public
│   ├── create_project.html
│   ├── dashboard.html
│   ├── edit_profile.html
│   ├── edit_project.html
│   ├── login.html
│   ├── project.html
│   ├── register.html
│   ├── style.css
│   ├── user_profile.html
│   └── uploads
```

## Database

The project uses SQLite.

The following tables are created automatically:

* users
* projects
* project_members
* discussions
* tasks
* attachments

The database file should not be committed or submitted unless specifically required.

Recommended ignored files:

```bash
node_modules/
basecamp.db
public/uploads/
.env
```

## The Core Team

Farid Narimanov

<span><i>Made at <a href="https://qwasar.io">Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt="Qwasar SV -- Software Engineering School's Logo" src="https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png" width="20px" /></span>