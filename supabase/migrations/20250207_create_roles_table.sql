create type role_level as enum ('junior', 'mid', 'senior', 'lead', 'head');

create table roles (
    id uuid default gen_random_uuid() primary key,
    title varchar(100) not null,
    level role_level not null,
    min_salary decimal(12,2) not null,
    max_salary decimal(12,2) not null,
    department_id uuid references departments(id),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    check (min_salary <= max_salary)
);

-- Create a trigger to update the updated_at timestamp
create trigger set_timestamp
    before update on roles
    for each row
    execute procedure trigger_set_timestamp();