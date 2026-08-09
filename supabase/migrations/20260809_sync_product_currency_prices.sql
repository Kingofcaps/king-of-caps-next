-- Le prix XOF est la source unique des conversions catalogue.
-- Cette reprise corrige uniquement les colonnes de prix dérivées déjà incohérentes.
update public.products
set price_eur = round(price_xof::numeric / 655.957)::integer * 100,
    price_usd = round(price_xof::numeric / 555.5555555556)::integer * 100
where price_eur is distinct from round(price_xof::numeric / 655.957)::integer * 100
   or price_usd is distinct from round(price_xof::numeric / 555.5555555556)::integer * 100;

create or replace function public.sync_product_currency_prices()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.price_xof := greatest(coalesce(new.price_xof, 0), 0);
  new.price_eur := round(new.price_xof::numeric / 655.957)::integer * 100;
  new.price_usd := round(new.price_xof::numeric / 555.5555555556)::integer * 100;
  return new;
end;
$$;

drop trigger if exists sync_product_currency_prices_before_write on public.products;

create trigger sync_product_currency_prices_before_write
before insert or update on public.products
for each row
execute function public.sync_product_currency_prices();
