-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    head_id UUID,
    deputy_head_id UUID,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    position TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL,
    end_date DATE,
    status TEXT CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')) DEFAULT 'active',
    employee_type TEXT CHECK (type IN ('full_time', 'part_time', 'contractor', 'intern')) DEFAULT 'full_time',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints for department heads
ALTER TABLE departments 
    ADD CONSTRAINT fk_head_id FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_deputy_head_id FOREIGN KEY (deputy_head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    deputy_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, employee_id)
);

-- Create indexes for better performance
CREATE INDEX idx_departments_head_id ON departments(head_id);
CREATE INDEX idx_departments_deputy_head_id ON departments(deputy_head_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_teams_department_id ON teams(department_id);
CREATE INDEX idx_teams_manager_id ON teams(manager_id);
CREATE INDEX idx_teams_deputy_manager_id ON teams(deputy_manager_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle department head transfers
CREATE OR REPLACE FUNCTION handle_department_head_transfer()
RETURNS TRIGGER AS $$
BEGIN
    -- If employee is a department head and is being transferred
    IF EXISTS (SELECT 1 FROM departments WHERE head_id = OLD.id) 
       AND NEW.department_id != OLD.department_id THEN
        -- Promote deputy to head if exists
        UPDATE departments 
        SET head_id = deputy_head_id,
            deputy_head_id = NULL
        WHERE head_id = OLD.id 
        AND deputy_head_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for department head transfers
CREATE TRIGGER handle_department_head_transfer
    BEFORE UPDATE ON employees
    FOR EACH ROW
    WHEN (OLD.department_id IS DISTINCT FROM NEW.department_id)
    EXECUTE FUNCTION handle_department_head_transfer();

-- Create function to handle team manager transfers
CREATE OR REPLACE FUNCTION handle_team_manager_transfer()
RETURNS TRIGGER AS $$
BEGIN
    -- If employee is a team manager and is being transferred
    IF EXISTS (SELECT 1 FROM teams WHERE manager_id = OLD.id)
       AND NEW.department_id != OLD.department_id THEN
        -- Promote deputy to manager if exists
        UPDATE teams 
        SET manager_id = deputy_manager_id,
            deputy_manager_id = NULL
        WHERE manager_id = OLD.id 
        AND deputy_manager_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for team manager transfers
CREATE TRIGGER handle_team_manager_transfer
    BEFORE UPDATE ON employees
    FOR EACH ROW
    WHEN (OLD.department_id IS DISTINCT FROM NEW.department_id)
    EXECUTE FUNCTION handle_team_manager_transfer();
