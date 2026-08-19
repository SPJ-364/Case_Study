# Inventory Management System

## Project Overview

The Inventory Management System is a web-based system designed
to manage inventory, monitor stock levels, provide inventory
alerts, and control access to different administrative areas.

The system is currently in the midterm development phase.

The midterm focuses on the development of the important frontend
and backend features required for the initial working prototype.
The system is not yet fully functional, and additional features
will be developed during succeeding phases.

---

## Client Feedback

During the presentation, the client suggested expanding the
original role structure from User and Admin into a more organized
administrative hierarchy.

## Administrative Hierarchy

Super Admin
│
├── Warehouse Admin
├── Staff Admin
└── Finance Admin

The Super Admin serves as the main administrator and oversees
the three specialized administrative areas.

---

## System Roles

### Super Admin

The Super Admin has overall system control.

Responsibilities:
- Manage Warehouse Admin
- Manage Staff Admin
- Manage Finance Admin
- Manage roles and permissions
- Monitor overall system activities
- Access all administrative areas

### Warehouse Admin

Responsible for warehouse and inventory operations.

Responsibilities:
- Inventory Management
- Supplier Management
- Stock Monitoring
- Inventory Alerts

### Staff Admin

Responsible for staff-related operations.

Responsibilities:
- Staff Management
- Security and Access Management
- Staff Information Management

### Finance Admin

Responsible for financial operations.

Responsibilities:
- Sales and Transaction Management
- Financial Records
- Financial Reports

---

## Midterm Features

### Authentication
- Login
- User authentication
- Role identification

### Inventory Management
- View inventory
- Add inventory
- Edit inventory
- Delete inventory

### Stock Monitoring
- Quantity monitoring
- Reorder level
- Low-stock detection
- Out-of-stock detection

### Alert System
- Low-stock alerts
- Reorder-level alerts
- Out-of-stock alerts

### Role-Based Access
- Super Admin
- Warehouse Admin
- Staff Admin
- Finance Admin

### Frontend
- React
- Dashboard
- Inventory interface
- Role-based navigation
- Alert interface

---

## Technology Stack

### Frontend
- React
- JavaScript
- HTML
- CSS

### Backend
- [Insert backend technology]

### Database
- [Insert database]

### Tools
- GitHub
- Git
- Visual Studio Code

---

## Team Roles

| Team Role | Responsibility |
|---|---|
| Project Manager | Coordinates tasks, requirements, integration, and progress |
| Scrum Master | Manages sprint process and GitHub workflow |
| Front-End Developer | Develops React frontend |
| Back-End Developer | Develops backend, database, authentication, and authorization |
| QA | Tests the system and reports bugs |
| Assistant Developer | Provides development and testing support |

---

## GitHub Workflow

The team uses GitHub Issues and a Project Board to manage
development tasks.

Task flow:

Backlog → To Do → In Progress → QA Testing → Done

Developers work on assigned tasks and submit completed work
for review and testing.

---

## Midterm Development Priorities

1. Authentication
2. React frontend
3. Super Admin hierarchy
4. Warehouse Admin functions
5. Inventory management
6. Alert System
7. Role-based access
8. Frontend-backend integration
9. QA testing

---

## Future Development

Additional features will be developed during succeeding phases.

Possible future features:
- Complete Staff Admin functionality
- Complete Finance Admin functionality
- Advanced financial reports
- Advanced warehouse management
- Additional notifications
- Advanced reporting
- Additional automation
