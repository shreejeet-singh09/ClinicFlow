-- Allow anon patient page (/join/[slug]) to read basic details of ACTIVE clinics only.
-- Non-active clinics remain invisible to anon; inactive/suspended/pending never leak.
create policy if not exists clinic_public_read
on public.clinics
for select
to anon, authenticated
using (status = 'active');
