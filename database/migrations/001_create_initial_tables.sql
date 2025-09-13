-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create geofences table
CREATE TABLE geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT valid_radius CHECK (radius_meters > 0 AND radius_meters <= 10000)
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee',
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    geofence_id INTEGER REFERENCES geofences(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'employee', 'manager'))
);

-- Create punches table
CREATE TABLE punches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    punch_in_time TIMESTAMP WITH TIME ZONE,
    punch_out_time TIMESTAMP WITH TIME ZONE,
    punch_in_lat DECIMAL(10, 8),
    punch_in_lon DECIMAL(11, 8),
    punch_out_lat DECIMAL(10, 8),
    punch_out_lon DECIMAL(11, 8),
    punch_in_address TEXT,
    punch_out_address TEXT,
    is_valid_geofence_in BOOLEAN DEFAULT false,
    is_valid_geofence_out BOOLEAN DEFAULT false,
    geofence_id INTEGER REFERENCES geofences(id) ON DELETE SET NULL,
    total_hours DECIMAL(5, 2),
    break_duration INTEGER DEFAULT 0, -- in minutes
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_punch_in_lat CHECK (punch_in_lat IS NULL OR (punch_in_lat >= -90 AND punch_in_lat <= 90)),
    CONSTRAINT valid_punch_in_lon CHECK (punch_in_lon IS NULL OR (punch_in_lon >= -180 AND punch_in_lon <= 180)),
    CONSTRAINT valid_punch_out_lat CHECK (punch_out_lat IS NULL OR (punch_out_lat >= -90 AND punch_out_lat <= 90)),
    CONSTRAINT valid_punch_out_lon CHECK (punch_out_lon IS NULL OR (punch_out_lon >= -180 AND punch_out_lon <= 180)),
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled', 'adjusted')),
    CONSTRAINT valid_punch_times CHECK (punch_out_time IS NULL OR punch_out_time > punch_in_time)
);

-- Create user_sessions table for session management
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- Create audit_logs table for tracking changes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Create reports table for saved reports
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    filters JSONB,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB,
    last_generated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_report_type CHECK (report_type IN ('attendance', 'overtime', 'geofence_violations', 'employee_summary', 'department_summary'))
);

-- Create notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_notification_type CHECK (type IN ('info', 'warning', 'error', 'success', 'punch_reminder', 'geofence_violation'))
);

-- Create indexes for better performance
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_geofence_id ON users(geofence_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

CREATE INDEX idx_punches_user_id ON punches(user_id);
CREATE INDEX idx_punches_punch_in_time ON punches(punch_in_time);
CREATE INDEX idx_punches_punch_out_time ON punches(punch_out_time);
CREATE INDEX idx_punches_geofence_id ON punches(geofence_id);
CREATE INDEX idx_punches_status ON punches(status);
CREATE INDEX idx_punches_created_at ON punches(created_at);

CREATE INDEX idx_geofences_is_active ON geofences(is_active);
CREATE INDEX idx_geofences_deleted_at ON geofences(deleted_at);

CREATE INDEX idx_departments_deleted_at ON departments(deleted_at);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_user_sessions_expire ON user_sessions(expire);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_punches_updated_at BEFORE UPDATE ON punches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate total hours
CREATE OR REPLACE FUNCTION calculate_punch_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.punch_out_time IS NOT NULL AND NEW.punch_in_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.punch_out_time - NEW.punch_in_time)) / 3600.0;
        
        -- Calculate overtime (assuming 8 hours is standard work day)
        IF NEW.total_hours > 8 THEN
            NEW.overtime_hours = NEW.total_hours - 8;
        ELSE
            NEW.overtime_hours = 0;
        END IF;
        
        -- Update status to completed
        NEW.status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic hours calculation
CREATE TRIGGER calculate_punch_hours_trigger BEFORE INSERT OR UPDATE ON punches
    FOR EACH ROW EXECUTE FUNCTION calculate_punch_hours();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create audit triggers for important tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_punches_trigger
    AFTER INSERT OR UPDATE OR DELETE ON punches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_geofences_trigger
    AFTER INSERT OR UPDATE OR DELETE ON geofences
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create views for common queries
CREATE VIEW active_employees AS
SELECT 
    u.id,
    u.employee_id,
    u.name,
    u.email,
    u.role,
    d.name as department_name,
    g.name as geofence_name,
    u.is_active,
    u.last_login,
    u.created_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN geofences g ON u.geofence_id = g.id
WHERE u.deleted_at IS NULL AND u.is_active = true;

CREATE VIEW current_punches AS
SELECT 
    p.id,
    p.user_id,
    u.name as employee_name,
    u.employee_id,
    p.punch_in_time,
    p.punch_out_time,
    p.total_hours,
    p.overtime_hours,
    p.is_valid_geofence_in,
    p.is_valid_geofence_out,
    g.name as geofence_name,
    p.status,
    p.created_at
FROM punches p
JOIN users u ON p.user_id = u.id
LEFT JOIN geofences g ON p.geofence_id = g.id
WHERE p.status = 'active' OR (p.status = 'completed' AND DATE(p.punch_in_time) = CURRENT_DATE);

-- Insert default data
INSERT INTO departments (name, description) VALUES 
('Administration', 'Administrative and management staff'),
('Human Resources', 'HR and employee relations'),
('Information Technology', 'IT support and development'),
('Operations', 'Daily operations and logistics'),
('Sales', 'Sales and customer relations'),
('Marketing', 'Marketing and communications');

-- Create default admin user (password: admin123)
INSERT INTO users (employee_id, name, email, password_hash, role, department_id) VALUES 
('ADMIN001', 'System Administrator', 'admin@momentum.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'admin', 1);

COMMIT;