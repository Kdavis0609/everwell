-- Create function to check if a column exists in a table
-- This is used by the application to detect schema capabilities

create or replace function public.introspect_column_exists(table_name text, col_name text)
returns boolean 
language plpgsql 
stable 
as $$
begin
  return exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
      and table_name = introspect_column_exists.table_name
      and column_name = introspect_column_exists.col_name
  );
end $$;

-- Grant execute permission to authenticated users
grant execute on function public.introspect_column_exists(text, text) to authenticated;
