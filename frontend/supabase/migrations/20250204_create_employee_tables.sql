-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    position VARCHAR(255),
    department_id UUID REFERENCES public.departments(id),
    location VARCHAR(255),
    time_zone VARCHAR(100),
    start_date DATE,
    salary DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create employee_skills table
CREATE TABLE IF NOT EXISTS public.employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    skill VARCHAR(255) NOT NULL,
    proficiency_level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create employee_equipment table
CREATE TABLE IF NOT EXISTS public.employee_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255),
    notes TEXT,
    assigned_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create employee_onboarding table
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    completed_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create triggers to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at
    BEFORE UPDATE ON public.employee_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_equipment_updated_at
    BEFORE UPDATE ON public.employee_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_onboarding_updated_at
    BEFORE UPDATE ON public.employee_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Allow read access to all authenticated users"
    ON public.departments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.departments
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Create policies for employees and related tables
CREATE POLICY "Allow read access to all authenticated users"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.employees
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Repeat similar policies for skills, equipment, and onboarding tables
CREATE POLICY "Allow read access to all authenticated users"
    ON public.employee_skills
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.employee_skills
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Allow read access to all authenticated users"
    ON public.employee_equipment
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.employee_equipment
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Allow read access to all authenticated users"
    ON public.employee_onboarding
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.employee_onboarding
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
