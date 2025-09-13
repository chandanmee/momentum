# Complete Postman Testing Guide for Momentum API

Here's a comprehensive guide to test your Momentum backend API using Postman. Your backend is running on **http://localhost:5000**.

## 🚀 Getting Started

### Base URL
```
http://localhost:5000/api
```

### Environment Variables (Recommended)
Create a Postman environment with:
- `base_url`: `http://localhost:5000/api`
- `health_url`: `http://localhost:5000/health` (Note: Health endpoint is NOT under /api)
- `access_token`: (will be set automatically after login)
- `refresh_token`: (will be set automatically after login)

## 📋 API Endpoints to Test

### 1. Health Check Endpoints

**API Health Check**
- **Method**: `GET`
- **URL**: `{{health_url}}` or `http://localhost:5000/health`
- **Headers**: None required
- **Expected Response**: 200 OK with server status, uptime, and environment info
- **⚠️ Important**: Use `/health` NOT `/api/health`

**API Information**
- **Method**: `GET`
- **URL**: `{{base_url}}/info`
- **Headers**: None required
- **Expected Response**: ❌ **Currently Not Available** - Route exists in code but not mounted in server.js
- **Status**: 404 - Route not found

### 2. Authentication Endpoints

**Register User**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body** (JSON):
```json
{
  "employee_id": "EMP001",
  "name": "John Doe",
  "email": "john.doe@company.com",
  "password": "Password123!",
  "role": "employee",
  "phone": "+1234567890"
}
```
- **✅ Successful Registration Example**:
- The above example has been tested and works successfully
- Returns user data with JWT token for authentication

**Validation Requirements**:
- Employee ID: 3-50 characters (required)
- Name: 2-100 characters (required)
- Email: Valid email format (required)
- Password: At least 8 characters with lowercase, uppercase, number, and special character (required)
- Role: Optional (admin, employee, manager) - defaults to 'employee'
- Phone: Optional phone number
- Department ID: Optional positive integer
- Geofence ID: Optional positive integer

**Expected Response** (201 Created):
```json
{
  "status": "success",
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": 1,
      "employee_id": "EMP001",
      "name": "John Doe",
      "email": "john.doe@company.com",
      "role": "employee",
      "department_id": null,
      "geofence_id": null,
      "is_active": true
    }
  }
}
 ```

**Login User**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (JSON):
```json
{
  "email": "john.doe@company.com",
  "password": "Password123!"
}
```
- **✅ Working Example**:
- Use the same credentials from the successful registration above

**🔑 Admin Login Credentials**
- **Email**: `admin@momentum.com`
- **Password**: `admin123`
- **Employee ID**: `ADMIN001`
- **Role**: `admin`
- **Access**: Full system access including user management, reports, and all administrative functions

**Admin Login Body**:
```json
{
  "email": "admin@momentum.com",
  "password": "admin123"
}
```
- **Expected Response** (200 OK):
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": 1,
      "employee_id": "EMP001",
      "name": "John Doe",
      "email": "john.doe@company.com",
      "role": "employee",
      "department_id": null,
      "geofence_id": null,
      "is_active": true
    }
  }
}
```
- **Validation Requirements**:
  - Email: Must be valid email format
  - Password: Minimum 6 characters
- **Expected Response**: 200 OK with tokens and user data
- **Common Issues**:
- **400 error**: Check email format and password length
- **429 error (Too Many Requests)**: Rate limited - wait 15 minutes or restart backend server
- **Postman Issues**: 
  - Ensure Content-Type is set to "application/json"
  - Use raw JSON body, not form-data
  - Check for extra spaces or hidden characters in email/password
- **User must be registered first** before login
- **Server Status**: Ensure backend server is running on port 5000

**Post-response Script** (to save tokens):
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.token);
    pm.environment.set("refresh_token", response.refreshToken);
}
```

**Get Current User**
- **Method**: `GET`
- **URL**: `{{base_url}}/auth/me`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Expected Response**: 200 OK with user profile data

**Refresh Token**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body**: Include refresh token in cookies or body (check your implementation)
- **Expected Response**: 200 OK with new access token

**Update Profile**
- **Method**: `PATCH`
- **URL**: `{{base_url}}/auth/profile`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (JSON):
```json
{
  "name": "John Updated",
  "phone": "+1987654321"
}
```
- **Expected Response**: 200 OK with updated user data

**Change Password**
- **Method**: `PATCH`
- **URL**: `{{base_url}}/auth/change-password`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (JSON):
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```
- **Expected Response**: 200 OK with success message

**Logout**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/logout`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Expected Response**: 200 OK with logout confirmation

**Auth Status Check**
- **Method**: `GET`
- **URL**: `{{base_url}}/auth/status`
- **Headers**: None required
- **Expected Response**: 200 OK with service status

### 🌐 Other Available Endpoints

### 👥 Users API - `{{base_url}}/users`
**Access**: Admin/Manager only (except own profile)

#### Available Endpoints:
- **GET** `/api/users` - Get all users (with pagination, search, filtering)
  - Query params: `page`, `limit`, `search`, `role`, `department_id`, `is_active`, `sort_by`, `sort_order`
- **GET** `/api/users/:id` - Get single user (admin or own profile)
   Example
   **URL**: `{{base_url}}/users/2` (replace 2 with actual user ID) 
- **POST** `/api/users` - Create new user (admin only)
- **PATCH** `/api/users/:id` - Update user (admin only)
- **DELETE** `/api/users/:id` - Delete user (admin only)

#### User Creation Fields:
- `employee_id` (required): 3-50 characters
- `name` (required): 2-100 characters
- `email` (required): Valid email format
- `password` (required): Min 8 chars with uppercase, lowercase, number, special char
- `role` (required): admin, employee, or manager
- `department_id` (optional): Valid department ID
- `geofence_id` (optional): Valid geofence ID
- `phone` (optional): Phone number

### ⏰ Punches API - `{{base_url}}/punches`
**Access**: All authenticated users

#### Available Endpoints:
- **GET** `/api/punches/status` - Get current punch status and today's summary
- **POST** `/api/punches/in` - Punch in (requires location)
- **PATCH** `/api/punches/out` - Punch out (requires location)
- **GET** `/api/punches` - Get user's punch history (with pagination)
- **GET** `/api/punches/all` - Get all punches (admin/manager only)
- **GET** `/api/punches/:id` - Get single punch details

#### Punch Fields:
- `latitude` (required): GPS latitude
- `longitude` (required): GPS longitude
- `notes` (optional): Additional notes

#### Features:
- Geofence validation for location-based punching
- Automatic hours calculation
- Prevents duplicate punch-ins
- Today's work summary

### 📍 Geofences API - `{{base_url}}/geofences`
**Access**: All authenticated users (view), Admin only (create/update/delete)

#### Available Endpoints:
- **GET** `/api/geofences` - Get all geofences (with pagination, search)
- **GET** `/api/geofences/:id` - Get single geofence details
- **POST** `/api/geofences` - Create new geofence (admin only)
- **PATCH** `/api/geofences/:id` - Update geofence (admin only)
- **DELETE** `/api/geofences/:id` - Delete geofence (admin only)
- **POST** `/api/geofences/:id/validate` - Validate location against geofence
- **GET** `/api/geofences/stats/overview` - Get geofence statistics (admin/manager)

#### Geofence Fields:
- `name` (required): 2-100 characters
- `latitude` (required): GPS latitude
- `longitude` (required): GPS longitude
- `radius_meters` (required): Radius in meters (10-10000)
- `description` (optional): Max 500 characters
- `address` (optional): Physical address
- `is_active` (optional): Boolean, defaults to true

### 🏢 Departments API - `{{base_url}}/departments`
**Access**: All authenticated users (view), Admin only (create/update/delete)

#### Available Endpoints:
- **GET** `/api/departments` - Get all departments (with pagination, search)
- **GET** `/api/departments/:id` - Get single department details
- **POST** `/api/departments` - Create new department (admin only)
- **PATCH** `/api/departments/:id` - Update department (admin only)
- **DELETE** `/api/departments/:id` - Delete department (admin only)
- **GET** `/api/departments/stats/overview` - Get department statistics (admin/manager)
- **GET** `/api/departments/:id/employees` - Get department employees

#### Department Fields:
- `name` (required): 2-100 characters
- `description` (optional): Max 500 characters
- `manager_id` (optional): Valid user ID with manager/admin role
- `is_active` (optional): Boolean, defaults to true

### 📊 Reports API - `{{base_url}}/reports`
**Access**: Admin/Manager only

#### Available Endpoints:
- **GET** `/api/reports/attendance` - Attendance summary report
  - Query params: `start_date`, `end_date`, `user_id`, `department_id`, `format` (json/csv)
- **GET** `/api/reports/overtime` - Overtime hours report
  - Query params: `start_date`, `end_date`, `user_id`, `department_id`, `overtime_threshold`, `format`
- **GET** `/api/reports/daily` - Daily attendance report
  - Query params: `date`, `department_id`, `format`
- **GET** `/api/reports/summary` - Overall system summary
- **GET** `/api/reports/export` - Export reports in various formats

#### Report Features:
- Date range filtering
- Department and user filtering
- CSV export capability
- Overtime calculations
- Summary statistics
- Real-time daily attendance tracking

#### Common Query Parameters:
- `page`, `limit` - Pagination
- `search` - Text search
- `sort_by`, `sort_order` - Sorting
- `start_date`, `end_date` - Date filtering (YYYY-MM-DD format)
- `format` - Response format (json/csv)

## 🔧 Testing Tips

### Authentication Flow
1. Start with **Register** or **Login** to get tokens
2. Use the **access_token** in Authorization header for protected routes
3. Test **Refresh Token** when access token expires
4. Test **Logout** to clear session

### Error Testing
- Try invalid credentials for login
- Test with missing required fields
- Test with malformed data
- Test protected routes without authentication
- Test with expired tokens

### Validation Testing
- **Email**: Must be valid email format
- **Password**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Employee ID**: 3-50 characters
- **Name**: 2-100 characters

### Expected Error Responses
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (duplicate data)
- **500**: Internal Server Error

## 📝 Sample Postman Collection Structure

```
Momentum API
├── Health Checks
│   ├── API Health
│   └── API Info
├── Authentication
│   ├── Register
│   ├── Login
│   ├── Get Current User
│   ├── Refresh Token
│   ├── Update Profile
│   ├── Change Password
│   ├── Logout
│   └── Auth Status
└── Other Modules
    ├── Users
    ├── Punches
    ├── Geofences
    ├── Departments
    └── Reports
```

## 🔍 Quick Test Sequence

### Basic Authentication Flow
1. **Health Check**: `GET /health` (Note: root level, not /api/health)
2. **Register**: `POST /api/auth/register` (create a test user)
3. **Login**: `POST /api/auth/login` (get tokens)
4. **Get Profile**: `GET /api/auth/me` (verify authentication)
5. **Update Profile**: `PATCH /api/auth/profile`
6. **Change Password**: `PATCH /api/auth/change-password`
7. **Logout**: `POST /api/auth/logout`

### Error Testing Sequence
1. **Invalid Login**: Try wrong credentials
2. **Unauthorized Access**: Access `/api/auth/me` without token
3. **Invalid Data**: Send malformed registration data
4. **Duplicate Registration**: Try registering same email twice

## 📚 Additional Notes

- **JWT Tokens**: Stored in HTTP-only cookies for security
- **Rate Limiting**: Authentication endpoints have rate limiting enabled
- **CORS**: Configured for frontend at `http://localhost:3000`
- **Validation**: Comprehensive input validation on all endpoints
- **Logging**: All authentication events are logged
- **Security**: Passwords are hashed with bcrypt

Start with the authentication endpoints first, as most other endpoints will require valid JWT tokens for access!

## 🛠️ Troubleshooting

### Common Issues
1. **500 Error on /auth/me**: Make sure cookie-parser is installed and configured
2. **CORS Errors**: Ensure frontend URL is in CORS whitelist
3. **Token Issues**: Check if tokens are being sent in correct format
4. **Database Errors**: Verify database connection and table structure

### Debug Tips
- Check backend console logs for detailed error messages
- Use Postman Console to view request/response details
- Verify environment variables are set correctly
- Test endpoints in order (health → register → login → protected routes)
- **Important**: Health endpoint is at `/health`, not `/api/health`
- All other endpoints are under `/api` prefix

### Common Issues

**❌ "Cannot GET /api/health" Error**
- **Problem**: Using wrong URL `/api/health`
- **Solution**: Use `/health` instead (no `/api` prefix)
- **Correct URL**: `http://localhost:5000/health`

**❌ "Route not found" for other endpoints**
- **Problem**: Missing `/api` prefix for authentication routes
- **Solution**: Ensure all auth routes use `/api/auth/` prefix
- **Example**: `http://localhost:5000/api/auth/login`

**❌ "Cannot GET /api/info" Error**
- **Problem**: `/info` endpoint exists in routes/index.js but not mounted in server.js
- **Status**: Currently unavailable (404 error expected)
- **Note**: The route code exists but isn't accessible until properly mounted

**❌ Login Validation Errors (400 Bad Request)**
- **Problem**: "Please provide a valid email, Password must be at least 6 characters long"
- **Common Causes**:
  - Email format invalid (must be proper email format)
  - Password too short (minimum 6 characters for login)
  - Missing required fields
  - **Postman-specific**: Using form-data instead of raw JSON
  - **Postman-specific**: Content-Type not set to "application/json"
  - **Postman-specific**: Extra spaces or hidden characters in JSON
- **Solution**: 
  - Verify email format and password meets minimum requirements
  - In Postman: Use Body → raw → JSON, set Content-Type to "application/json"
  - Copy-paste exact JSON without modifications
- **Note**: Registration has stricter password requirements (8+ chars with complexity)

**❌ Rate Limiting Errors (429 Too Many Requests)**
- **Problem**: "Too Many Requests" after multiple failed attempts
- **Cause**: Backend has rate limiting (50 requests per 15 minutes per IP)
- **Solution**: 
  - Wait 15 minutes for rate limit to reset
  - Or restart the backend server to reset counters
  - Use `node server.js` in backend directory