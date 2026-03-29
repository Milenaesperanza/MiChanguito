-- Ejecutar en Supabase → SQL Editor

-- Tabla de comercios
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Tabla de tickets (una compra completa)
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  store_name text not null,
  purchase_date date not null default current_date,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Tabla de items (cada producto dentro de un ticket)
create table if not exists ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Vista para comparación de precios por producto y comercio
create or replace view price_comparison as
select
  ti.name as product_name,
  t.store_name,
  ti.price,
  t.purchase_date,
  t.id as ticket_id
from ticket_items ti
join tickets t on t.id = ti.ticket_id
order by ti.name, ti.price asc;

-- Comercios de ejemplo para Argentina
insert into stores (name) values
  ('Coto'),
  ('Carrefour'),
  ('Dia'),
  ('Jumbo'),
  ('Changomas'),
  ('La Anonima'),
  ('Vea')
on conflict (name) do nothing;

-- Row Level Security: para cuenta compartida, todas las filas son visibles
-- Si en el futuro quieren cuentas individuales, se activa RLS por user_id
alter table tickets enable row level security;
alter table ticket_items enable row level security;
alter table stores enable row level security;

create policy "lectura publica" on tickets for select using (true);
create policy "escritura publica" on tickets for insert with check (true);
create policy "actualizacion publica" on tickets for update using (true);
create policy "borrado publica" on tickets for delete using (true);

create policy "lectura publica" on ticket_items for select using (true);
create policy "escritura publica" on ticket_items for insert with check (true);
create policy "actualizacion publica" on ticket_items for update using (true);
create policy "borrado publica" on ticket_items for delete using (true);

create policy "lectura publica" on stores for select using (true);
create policy "escritura publica" on stores for insert with check (true);
