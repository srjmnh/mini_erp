create table employee_role_history (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references auth.users(id),
    role_id uuid references roles(id),
    salary decimal(12,2) not null,
    effective_from timestamp with time zone not null,
    effective_to timestamp with time zone,
    promotion_notes text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create a trigger to update the updated_at timestamp
create trigger set_timestamp
    before update on employee_role_history
    for each row
    execute procedure trigger_set_timestamp();

-- Add indexes for better query performance
create index idx_employee_role_history_employee_id on employee_role_history(employee_id);
create index idx_employee_role_history_effective_dates on employee_role_history(effective_from, effective_to);