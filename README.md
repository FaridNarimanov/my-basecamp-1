# Welcome to My Basecamp 1
***

## Task
The problem this project addresses is the need for teams to have a centralized, intuitive platform for collaboration and project management. Teams often struggle with scattered communication, lost files, and unorganized task lists across different applications.

The main challenge of this project was architecting a robust relational database to handle complex associations between users, projects, discussions, tasks, and file attachments. Additionally, implementing secure authentication and a dynamic Role-Based Access Control (RBAC) system—differentiating between project Owners, Admins, and Viewers—required careful backend logic, API routing, and session management.

## Description
I solved this problem by building a full-stack web application using Node.js and Express, powered by an SQLite database (`basecamp.db`). The frontend is built with vanilla HTML, CSS, and JavaScript, focusing on a clean, modern, minimalist, and highly responsive user interface without relying on heavy frontend frameworks.

Key features include:
* **User Authentication & Profiles:** Secure registration, login, and comprehensive profile management (including avatar uploads and password updates).
* **Project Dashboard:** A centralized view to manage and filter projects (All, Created by me, Shared with me).
* **Collaboration Tools:** Dedicated sections for discussion boards, interactive task checklists, and file attachment sharing within each project.
* **Member Management:** Granular access control allowing project owners to invite users and dynamically assign or revoke 'Admin' and 'Viewer' roles.

## Installation
To install and set up the project locally, ensure you have Node.js installed on your machine. 

Clone the repository, navigate to the project directory, and install the necessary dependencies:
```bash
npm install
```
*Note: The `public/uploads` directory is required for handling profile pictures and project file attachments. Ensure this directory exists in your local environment.*

## Usage
Start the Node.js server by running the following command in your terminal:
```bash
node server.js
```
Once the server is running, open your web browser and navigate to the local server address (typically `http://localhost:3000`). From there, you can register a new account, create your first project, and start collaborating.

### The Core Team
* Farid Narimanov

<span><i>Made at <a href="https://qwasar.io">Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt="Qwasar SV -- Software Engineering School's Logo" src="https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png" width="20px" /></span>