# Momentum - Employee Time & Attendance Management System

## Overview

Momentum is a corporate-grade web and mobile Progressive Web Application (PWA) designed for employee time and attendance management. The application enables secure and accurate "Punch In" and "Punch Out" from designated geographical locations using geofencing technology, while providing a powerful analytics dashboard for administrators.

## Target Audience

Companies with in-office and hybrid workforces seeking reliable, professional time tracking solutions.

## Core Philosophy

The application prioritizes professionalism, intuitive design, and high reliability. Data integrity and reporting accuracy are paramount to maintaining your company's momentum.

## Technology Stack

### Frontend
- **React** - Modern UI framework
- **Material-UI** - Professional component library
- **Redux Toolkit** - State management
- **Mapbox GL JS** - Map visualization and geofencing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database

### Mobile & PWA
- **Capacitor.js** - Native mobile features wrapper
- **Progressive Web App** - Cross-platform compatibility

### Deployment
- **Frontend**: Vercel or Netlify
- **Backend & Database**: AWS Cloud Services

## Key Features

### 🔐 User Authentication & Profiles
- Secure employee profile management
- Role-based access control (Admin/Employee)
- Department and geofence assignment

### ⏰ Employee Time Clock
- Simple "Punch In" and "Punch Out" interface
- Automatic location and timestamp capture
- Geofence validation for punch attempts
- Personal time history viewing

### 🗺️ Geofencing Administration
- Interactive map-based geofence creation
- Coordinate and radius-based location definition
- Employee-to-location assignment management

### 📊 Admin Dashboard & Reporting
- Real-time employee status monitoring
- Advanced filtering and search capabilities
- CSV report generation for:
  - Total hours worked
  - Overtime calculations
  - Off-site punch attempts

## Database Schema

### Tables Structure
- **users**: Employee profiles and authentication
- **departments**: Organizational structure
- **geofences**: Location definitions
- **punches**: Time tracking records

## Project Structure

```
Momentum/
├── frontend/          # React application
├── backend/           # Node.js/Express API
├── database/          # PostgreSQL schemas and migrations
├── mobile/            # Capacitor mobile configuration
├── docs/              # Documentation
└── deployment/        # Deployment configurations
```

## Development Roadmap

1. **Project Setup** - Initialize MERN stack foundation
2. **Database Design** - Implement PostgreSQL schema
3. **Backend API** - Build Express.js endpoints
4. **Frontend Application** - Develop React UI
5. **Geofencing Integration** - Implement Mapbox functionality
6. **Mobile PWA** - Configure Capacitor features
7. **Admin Dashboard** - Build reporting and analytics
8. **Documentation** - Create comprehensive guides
9. **Deployment** - Set up production pipeline
10. **Testing & Security** - Ensure production readiness

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Momentum

# Install dependencies
npm run install:all

# Set up environment variables
cp .env.example .env

# Initialize database
npm run db:setup

# Start development servers
npm run dev
```

## Contributing

Please read our contributing guidelines and code of conduct before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the project repository.

---

**Momentum** - Keeping your company's time tracking in perfect sync.