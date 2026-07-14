-- Run this migration when 20260713_add_order_number_function.sql was already executed.
grant execute on function public.next_order_number() to service_role;
