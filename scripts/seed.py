#!/usr/bin/env python3
"""Seed real Supabase demo data for CarePair (idempotent).
Creates: platform admin, 3 clinics (Sharma ACTIVE, Lakeside ACTIVE, Green Cross PENDING),
doctors/receptionists, sample patients, and a today-visit spread."""
import json, urllib.request, os, sys, time

TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
PROJ = 'bwomwxtzzhucrplntmtq'
URL = 'https://bwomwxtzzhucrplntmtq.supabase.co'
with open('/tmp/_keys.json') as f: KEYS = json.load(f)
SR = KEYS['service_role']

def http(method, url, body=None, headers=None):
    h = {'apikey': SR, 'Authorization': f'Bearer {SR}', 'Content-Type': 'application/json'}
    if headers: h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        r = urllib.request.urlopen(req); return r.status, json.loads(r.read().decode() or 'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]

def sql(query):
    data = json.dumps({'query': query}).encode()
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{PROJ}/database/query',
        data=data, headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json', 'User-Agent': 'supabase-cli/1.0'}, method='POST')
    try:
        r = urllib.request.urlopen(req); return json.loads(r.read().decode() or 'null')
    except urllib.error.HTTPError as e:
        raise Exception(f'SQL error {e.code}: {e.read().decode()[:400]}\nSQL: {query[:200]}')

def upsert_user(email, password, name):
    # Check if exists
    code, res = http('GET', f'{URL}/auth/v1/admin/users?per_page=200')
    if code == 200:
        for u in res.get('users', []):
            if u['email'] == email: return u['id']
    code, res = http('POST', f'{URL}/auth/v1/admin/users', {
        'email': email, 'password': password, 'email_confirm': True,
        'user_metadata': {'name': name}
    })
    if code not in (200, 201):
        raise Exception(f'create user failed {code}: {res}')
    return res['id']

print('== Seeding CarePair ==')

# ---- Platform admin ----
admin_id = upsert_user('admin@CarePair.local', 'Admin@2026', 'Platform Admin')
print('admin', admin_id)

# ---- Clinics ----
CLINICS = [
    {'slug': 'sharma-demo', 'name': 'Sharma Demo Clinic', 'doctor_name': 'Dr. Sharma', 'address': '124 MG Road, Bengaluru', 'city': 'Bengaluru', 'phone': '+91 98450 12345', 'fee': 300, 'status': 'active',
     'owner': ('sharma@CarePair.local', 'Doctor@2026', 'Dr. Sharma'),
     'recep': ('reception.sharma@CarePair.local', 'Reception@2026', 'Priya Nair')},
    {'slug': 'lakeside-family-care', 'name': 'Lakeside Family Care', 'doctor_name': 'Dr. Anita Rao', 'address': '18 Lakeside Rd, Pune', 'city': 'Pune', 'phone': '+91 90000 55511', 'fee': 400, 'status': 'active',
     'owner': ('anita@CarePair.local', 'Doctor@2026', 'Dr. Anita Rao'),
     'recep': ('reception.lakeside@CarePair.local', 'Reception@2026', 'Karthik Iyer')},
    {'slug': 'green-cross', 'name': 'Green Cross Clinic', 'doctor_name': 'Dr. Vikram Shah', 'address': 'Andheri West, Mumbai', 'city': 'Mumbai', 'phone': '+91 90000 77722', 'fee': 500, 'status': 'pending_approval',
     'owner': ('vikram@CarePair.local', 'Doctor@2026', 'Dr. Vikram Shah'),
     'recep': None},
]

for c in CLINICS:
    owner_id = upsert_user(*c['owner'])
    c['owner_id'] = owner_id
    if c['recep']:
        c['recep_id'] = upsert_user(*c['recep'])

# Upsert clinics table
for c in CLINICS:
    rows = sql(f"select id from public.clinics where slug='{c['slug']}';")
    if rows:
        cid = rows[0]['id']
        sql(f"update public.clinics set name=$${c['name']}$$, doctor_name=$${c['doctor_name']}$$, address=$${c['address']}$$, city=$${c['city']}$$, phone=$${c['phone']}$$, consultation_fee={c['fee']}, status='{c['status']}', owner_user_id='{c['owner_id']}', updated_at=now() where id='{cid}';")
    else:
        rows = sql(f"insert into public.clinics(name, owner_user_id, address, phone, consultation_fee, status, slug, doctor_name, city) values($${c['name']}$$, '{c['owner_id']}', $${c['address']}$$, $${c['phone']}$$, {c['fee']}, '{c['status']}', '{c['slug']}', $${c['doctor_name']}$$, $${c['city']}$$) returning id;")
        cid = rows[0]['id']
    c['id'] = cid
    # Ensure queue_status exists
    sql(f"insert into public.queue_status(clinic_id, is_paused) values('{cid}', false) on conflict (clinic_id) do nothing;")
    # Profiles
    sql(f"insert into public.profiles(id, email, name, role, clinic_id) values('{c['owner_id']}', '{c['owner'][0]}', $${c['owner'][2]}$$, 'clinic_owner', '{cid}') on conflict (id) do update set clinic_id='{cid}', role='clinic_owner', name=$${c['owner'][2]}$$;")
    if c.get('recep_id'):
        sql(f"insert into public.profiles(id, email, name, role, clinic_id) values('{c['recep_id']}', '{c['recep'][0]}', $${c['recep'][2]}$$, 'receptionist', '{cid}') on conflict (id) do update set clinic_id='{cid}', role='receptionist', name=$${c['recep'][2]}$$;")

# Platform admin profile
sql(f"insert into public.profiles(id, email, name, role, clinic_id) values('{admin_id}', 'admin@CarePair.local', 'Platform Admin', 'platform_admin', null) on conflict (id) do update set role='platform_admin', clinic_id=null;")

print('Clinics:', [(c['slug'], c['id']) for c in CLINICS])

# ---- Sample visits for Sharma Demo (today) ----
sharma = next(c for c in CLINICS if c['slug'] == 'sharma-demo')
lakeside = next(c for c in CLINICS if c['slug'] == 'lakeside-family-care')

def seed_visits_for(clinic, samples):
    cid = clinic['id']
    # Clear today's visits so seed is idempotent (only touches our clinic — RLS bypassed via service role)
    sql(f"delete from public.billing_usage where clinic_id='{cid}' and usage_date=current_date;")
    sql(f"delete from public.visits where clinic_id='{cid}' and visit_date=current_date;")
    # Also drop patients created just for today's seed
    sql(f"delete from public.patients where clinic_id='{cid}' and name in (" + ",".join(f"$${s['name']}$$" for s in samples) + ");")
    for idx, s in enumerate(samples, start=1):
        p = sql(f"insert into public.patients(clinic_id, name, age, phone, area) values('{cid}', $${s['name']}$$, {s['age']}, $${s['phone']}$$, $${s['area']}$$) returning id;")
        pid = p[0]['id']
        called = "now()-interval '40 minutes'" if s['status'] != 'waiting' else 'null'
        started = "now()-interval '30 minutes'" if s['status'] in ('consulting','completed') else 'null'
        finished = "now()-interval '15 minutes'" if s['status'] == 'completed' else 'null'
        dur = s.get('duration','null')
        v = sql(f"insert into public.visits(clinic_id, patient_id, doctor_id, token_number, status, called_at, consultation_started_at, consultation_finished_at, consultation_duration) values('{cid}', '{pid}', '{clinic['owner_id']}', {idx}, '{s['status']}', {called}, {started}, {finished}, {dur}) returning id;")
        vid = v[0]['id']
        if s['status'] == 'completed':
            # Create billing usage row
            sql(f"insert into public.billing_usage(visit_id, clinic_id, amount) values('{vid}', '{cid}', 2.50) on conflict(visit_id) do nothing;")

sharma_samples = [
    {'name':'Rahul Mehta','age':32,'phone':'+91 98111 11111','area':'Latur','status':'completed','duration':522},
    {'name':'Amit Verma','age':41,'phone':'+91 98111 22222','area':'Ausa','status':'completed','duration':678},
    {'name':'Priya Shah','age':27,'phone':'+91 98111 33333','area':'Udgir','status':'consulting'},
    {'name':'Sneha Rao','age':35,'phone':'+91 98111 44444','area':'Latur Road','status':'waiting'},
    {'name':'Karan Joshi','age':29,'phone':'+91 98111 55555','area':'Latur','status':'waiting'},
]
lakeside_samples = [
    {'name':'Aditi Kulkarni','age':45,'phone':'+91 90111 11111','area':'Kothrud','status':'completed','duration':612},
    {'name':'Rohit Deshmukh','age':38,'phone':'+91 90111 22222','area':'Baner','status':'waiting'},
]

seed_visits_for(sharma, sharma_samples)
seed_visits_for(lakeside, lakeside_samples)

# Add historical completed visits (yesterday) for Sharma for calendar/analytics
sharma_id = sharma['id']
sql(f"delete from public.billing_usage where clinic_id='{sharma_id}' and usage_date=current_date-1;")
sql(f"delete from public.visits where clinic_id='{sharma_id}' and visit_date=current_date-1;")
for i in range(1, 8):
    p = sql(f"insert into public.patients(clinic_id, name, age, phone, area) values('{sharma_id}', $$Historical Patient {i}$$, {20+i*3}, $$+91 90000 000{i:02d}$$, $$Latur$$) returning id;")
    pid = p[0]['id']
    v = sql(f"insert into public.visits(clinic_id, patient_id, doctor_id, token_number, visit_date, status, called_at, consultation_started_at, consultation_finished_at, consultation_duration) values('{sharma_id}', '{pid}', '{sharma['owner_id']}', {i}, current_date-1, 'completed', now()-interval '1 day', now()-interval '1 day', now()-interval '1 day', {500+i*30}) returning id;")
    sql(f"insert into public.billing_usage(visit_id, clinic_id, amount, usage_date) values('{v[0]['id']}', '{sharma_id}', 2.50, current_date-1) on conflict(visit_id) do nothing;")

print('== Done. Login credentials ==')
print('  admin@CarePair.local / Admin@2026 (platform admin)')
print('  sharma@CarePair.local / Doctor@2026 (doctor - Sharma)')
print('  reception.sharma@CarePair.local / Reception@2026 (receptionist - Sharma)')
print('  anita@CarePair.local / Doctor@2026 (doctor - Lakeside)')
print('  reception.lakeside@CarePair.local / Reception@2026 (receptionist - Lakeside)')
print('  vikram@CarePair.local / Doctor@2026 (doctor - Green Cross, PENDING)')
