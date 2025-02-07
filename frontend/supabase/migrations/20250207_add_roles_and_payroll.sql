-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_salary DECIMAL(12,2) NOT NULL,
    salary_range_min DECIMAL(12,2) NOT NULL,
    salary_range_max DECIMAL(12,2) NOT NULL,
    level INTEGER NOT NULL, -- For seniority levels (e.g., 1 for junior, 2 for mid, 3 for senior)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create salary_history table to track salary changes
CREATE TABLE IF NOT EXISTS public.salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    old_salary DECIMAL(12,2),
    new_salary DECIMAL(12,2) NOT NULL,
    reason VARCHAR(255), -- e.g., 'promotion', 'annual_raise', 'role_change'
    effective_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add new columns to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id),
ADD COLUMN IF NOT EXISTS seniority_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_promotion_date DATE,
ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Create triggers for salary history
CREATE OR REPLACE FUNCTION log_salary_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.salary IS DISTINCT FROM NEW.salary THEN
        INSERT INTO public.salary_history (
            employee_id,
            old_salary,
            new_salary,
            reason,
            effective_date,
            notes
        ) VALUES (
            NEW.id,
            OLD.salary,
            NEW.salary,
            TG_ARGV[0],
            CURRENT_DATE,
            'Salary updated'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER employee_salary_change
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    WHEN (OLD.salary IS DISTINCT FROM NEW.salary)
    EXECUTE FUNCTION log_salary_change('salary_update');

-- Add RLS policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

-- Policies for roles table
CREATE POLICY "Allow read access to authenticated users"
    ON public.roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.roles
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Policies for role_permissions table
CREATE POLICY "Allow read access to authenticated users"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow write access to admin users"
    ON public.role_permissions
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Policies for salary_history table
CREATE POLICY "Allow read access to admin users and own records"
    ON public.salary_history
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
        OR
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

CREATE POLICY "Allow write access to admin users"
    ON public.salary_history
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));
