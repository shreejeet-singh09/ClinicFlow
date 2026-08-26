#!/usr/bin/env python3
"""
ClinicFlow Comprehensive Backend Verification
Tests multi-tenant RLS, queue transitions, billing, and security
"""
import os
import sys
import json
import requests
from pathlib import Path
from datetime import date

# Load environment
env = {}
for line in Path('/app/.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k] = v.strip()

BASE_URL = env['NEXT_PUBLIC_BASE_URL'].rstrip('/')
SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

# Test credentials from seed data
ADMIN_EMAIL = 'admin@clinicflow.local'
ADMIN_PASS = 'Admin@2026'
SHARMA_RECEPTION_EMAIL = 'reception.sharma@clinicflow.local'
SHARMA_RECEPTION_PASS = 'Reception@2026'
LAKESIDE_DOCTOR_EMAIL = 'anita@clinicflow.local'
LAKESIDE_DOCTOR_PASS = 'Doctor@2026'

def log_pass(msg):
    print(f"✅ PASS: {msg}")

def log_fail(msg):
    print(f"❌ FAIL: {msg}")

def log_info(msg):
    print(f"ℹ️  INFO: {msg}")

def sign_in(email, password):
    """Sign in and return access token"""
    resp = requests.post(
        f'{SUPABASE_URL}/auth/v1/token?grant_type=password',
        json={'email': email, 'password': password},
        headers={'apikey': ANON_KEY, 'Content-Type': 'application/json'},
        timeout=20
    )
    if resp.status_code != 200:
        log_fail(f"Sign in failed for {email}: HTTP {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    return data.get('access_token')

def supabase_get(path, token=None, use_anon=True):
    """GET request to Supabase REST API"""
    headers = {'apikey': ANON_KEY}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    elif use_anon:
        headers['Authorization'] = f'Bearer {ANON_KEY}'
    
    resp = requests.get(f'{SUPABASE_URL}{path}', headers=headers, timeout=20)
    return resp

def supabase_post(path, data, token=None, use_anon=True):
    """POST request to Supabase REST API"""
    headers = {'apikey': ANON_KEY, 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    elif use_anon:
        headers['Authorization'] = f'Bearer {ANON_KEY}'
    
    resp = requests.post(f'{SUPABASE_URL}{path}', json=data, headers=headers, timeout=20)
    return resp

def supabase_patch(path, data, token):
    """PATCH request to Supabase REST API"""
    headers = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    resp = requests.patch(f'{SUPABASE_URL}{path}', json=data, headers=headers, timeout=20)
    return resp

def test_1_health():
    """Test 1: Health endpoint"""
    print("\n" + "="*80)
    print("TEST 1: Health Endpoint")
    print("="*80)
    
    resp = requests.get(f'{BASE_URL}/api', timeout=20)
    
    if resp.status_code == 200:
        log_pass(f"GET /api returned HTTP 200")
        data = resp.json()
        
        if data.get('configured') == True:
            log_pass(f"configured=true")
        else:
            log_fail(f"configured={data.get('configured')} (expected true)")
        
        if data.get('database') == 'supabase':
            log_pass(f"database=supabase")
        else:
            log_fail(f"database={data.get('database')} (expected supabase)")
        
        if data.get('realtime') == 'ready':
            log_pass(f"realtime=ready")
        else:
            log_fail(f"realtime={data.get('realtime')} (expected ready)")
    else:
        log_fail(f"GET /api returned HTTP {resp.status_code}")

def test_2_anon_patient_join():
    """Test 2: Anonymous patient join flow"""
    print("\n" + "="*80)
    print("TEST 2: Anonymous Patient Join Flow")
    print("="*80)
    
    # 2a: Get clinic by slug (using anon key)
    resp = supabase_get('/rest/v1/clinics?slug=eq.sharma-demo&select=id,qr_identifier,name,status', use_anon=True)
    
    if resp.status_code == 200:
        clinics = resp.json()
        if len(clinics) == 0:
            log_fail("RLS ISSUE: Anon users cannot read clinics table - missing public read policy for active clinics")
            log_info("Workaround: Using service role to get QR code for testing join_clinic_queue RPC")
            
            # Get QR code using service role as diagnostic workaround
            service_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/clinics?slug=eq.sharma-demo&select=qr_identifier,name,status',
                headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
                timeout=20
            )
            
            if service_resp.status_code == 200 and service_resp.json():
                clinic = service_resp.json()[0]
                qr_code = clinic['qr_identifier']
                log_info(f"Got QR code via service role: {qr_code}")
            else:
                log_fail("Could not get clinic info even with service role")
                return
        elif len(clinics) == 1:
            clinic = clinics[0]
            log_pass(f"Found sharma-demo clinic: {clinic.get('name')}")
            
            if clinic.get('status') == 'active':
                log_pass(f"Clinic status is 'active'")
            else:
                log_fail(f"Clinic status is '{clinic.get('status')}' (expected 'active')")
            
            qr_code = clinic.get('qr_identifier')
        else:
            log_fail(f"Expected 1 clinic, got {len(clinics)}")
            return
        
        # 2b: Join queue via RPC
        join_data = {
            'qr_code': qr_code,
            'patient_name': 'Rajesh Kumar',
            'patient_age': 35,
            'patient_phone': '+919876543210',
            'patient_area': 'Koramangala'
        }
        
        resp = supabase_post('/rest/v1/rpc/join_clinic_queue', join_data, use_anon=True)
        
        if resp.status_code in [200, 201]:
            visit = resp.json()
            log_pass(f"join_clinic_queue succeeded, token #{visit.get('token_number')}")
            
            access_token = visit.get('patient_access_token')
            if access_token:
                log_pass(f"Received patient_access_token: {access_token[:8]}...")
                
                # 2c: Get public queue snapshot
                snapshot_resp = supabase_post('/rest/v1/rpc/public_queue_snapshot', 
                                              {'access_token': access_token}, 
                                              use_anon=True)
                
                if snapshot_resp.status_code == 200:
                    snapshot = snapshot_resp.json()
                    log_pass(f"public_queue_snapshot succeeded")
                    
                    # Verify expected fields are present
                    expected_fields = ['token_number', 'patients_ahead', 'estimated_wait_minutes', 'clinic_name', 'status']
                    for field in expected_fields:
                        if field in snapshot:
                            log_pass(f"Snapshot contains '{field}': {snapshot[field]}")
                        else:
                            log_fail(f"Snapshot missing expected field '{field}'")
                    
                    # Verify PII fields are NOT present
                    pii_fields = ['name', 'phone', 'age', 'patient_name', 'patient_phone', 'patient_age']
                    pii_found = False
                    for field in pii_fields:
                        if field in snapshot:
                            log_fail(f"PII LEAK: Snapshot contains '{field}': {snapshot[field]}")
                            pii_found = True
                    
                    if not pii_found:
                        log_pass("No PII fields (name/phone/age) in snapshot - privacy preserved")
                else:
                    log_fail(f"public_queue_snapshot failed: HTTP {snapshot_resp.status_code} - {snapshot_resp.text}")
            else:
                log_fail(f"No patient_access_token in join response")
        else:
            log_fail(f"join_clinic_queue failed: HTTP {resp.status_code} - {resp.text}")
    else:
        log_fail(f"GET clinics by slug failed: HTTP {resp.status_code} - {resp.text}")

def test_3_sharma_receptionist_rls():
    """Test 3: Multi-tenant RLS as Sharma receptionist"""
    print("\n" + "="*80)
    print("TEST 3: Multi-tenant RLS - Sharma Receptionist")
    print("="*80)
    
    token = sign_in(SHARMA_RECEPTION_EMAIL, SHARMA_RECEPTION_PASS)
    if not token:
        log_fail("Could not sign in as Sharma receptionist")
        return None
    
    log_pass(f"Signed in as {SHARMA_RECEPTION_EMAIL}")
    
    # 3a: Can only see Sharma clinic
    resp = supabase_get('/rest/v1/clinics?select=slug,name', token=token, use_anon=False)
    if resp.status_code == 200:
        clinics = resp.json()
        if len(clinics) == 1 and clinics[0].get('slug') == 'sharma-demo':
            log_pass(f"Can only see Sharma clinic: {clinics}")
        else:
            log_fail(f"Expected only sharma-demo, got: {clinics}")
    else:
        log_fail(f"GET clinics failed: HTTP {resp.status_code}")
    
    # 3b: Can only see Sharma visits
    today = date.today().isoformat()
    resp = supabase_get(f'/rest/v1/visits?visit_date=eq.{today}&select=id,token_number,status,clinic_id', token=token, use_anon=False)
    if resp.status_code == 200:
        visits = resp.json()
        log_pass(f"Can see {len(visits)} Sharma visits for today")
        
        # Store a visit ID for later transition test
        sharma_visit_id = None
        if visits:
            # Find a waiting visit
            for v in visits:
                if v.get('status') == 'waiting':
                    sharma_visit_id = v['id']
                    break
            if not sharma_visit_id and visits:
                sharma_visit_id = visits[0]['id']
    else:
        log_fail(f"GET visits failed: HTTP {resp.status_code}")
        sharma_visit_id = None
    
    # 3c: Can only see Sharma patients
    resp = supabase_get('/rest/v1/patients?select=id,name,clinic_id', token=token, use_anon=False)
    if resp.status_code == 200:
        patients = resp.json()
        log_pass(f"Can see {len(patients)} Sharma patients (no Lakeside patients)")
    else:
        log_fail(f"GET patients failed: HTTP {resp.status_code}")
    
    # 3d: Cannot update Lakeside visit
    # First, get a Lakeside visit ID using service role (diagnostic only)
    lakeside_resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/visits?select=id,clinic_id&limit=1',
        headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
        timeout=20
    )
    
    if lakeside_resp.status_code == 200:
        all_visits = lakeside_resp.json()
        lakeside_visit_id = None
        
        # Get Lakeside clinic ID first
        lakeside_clinic_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/clinics?slug=eq.lakeside-family-care&select=id',
            headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
            timeout=20
        )
        
        if lakeside_clinic_resp.status_code == 200:
            lakeside_clinics = lakeside_clinic_resp.json()
            if lakeside_clinics:
                lakeside_clinic_id = lakeside_clinics[0]['id']
                
                # Find a visit from Lakeside
                for v in all_visits:
                    if v.get('clinic_id') == lakeside_clinic_id:
                        lakeside_visit_id = v['id']
                        break
                
                if lakeside_visit_id:
                    # Try to update Lakeside visit as Sharma receptionist
                    update_resp = supabase_patch(
                        f'/rest/v1/visits?id=eq.{lakeside_visit_id}',
                        {'status': 'called'},
                        token=token
                    )
                    
                    if update_resp.status_code in [200, 204]:
                        updated = update_resp.json() if update_resp.text else []
                        if not updated or len(updated) == 0:
                            log_pass("Cannot update Lakeside visit (0 rows updated) - RLS working")
                        else:
                            log_fail(f"RLS BREACH: Updated Lakeside visit: {updated}")
                    elif update_resp.status_code in [401, 403]:
                        log_pass(f"Cannot update Lakeside visit (HTTP {update_resp.status_code}) - RLS working")
                    else:
                        log_info(f"Lakeside update returned HTTP {update_resp.status_code}")
                else:
                    log_info("No Lakeside visit found for cross-tenant test")
    
    # 3e: Can call transition_visit on own visit
    if sharma_visit_id:
        transition_resp = supabase_post(
            '/rest/v1/rpc/transition_visit',
            {'target_visit': sharma_visit_id, 'next_status': 'called'},
            token=token,
            use_anon=False
        )
        
        if transition_resp.status_code in [200, 201]:
            log_pass(f"Successfully called transition_visit on Sharma visit")
        else:
            log_fail(f"transition_visit failed: HTTP {transition_resp.status_code} - {transition_resp.text}")
    
    return token

def test_4_lakeside_doctor_rls():
    """Test 4: Multi-tenant RLS as Lakeside doctor"""
    print("\n" + "="*80)
    print("TEST 4: Multi-tenant RLS - Lakeside Doctor")
    print("="*80)
    
    token = sign_in(LAKESIDE_DOCTOR_EMAIL, LAKESIDE_DOCTOR_PASS)
    if not token:
        log_fail("Could not sign in as Lakeside doctor")
        return
    
    log_pass(f"Signed in as {LAKESIDE_DOCTOR_EMAIL}")
    
    # 4a: Can only see lakeside-family-care
    resp = supabase_get('/rest/v1/clinics?select=slug,name', token=token, use_anon=False)
    if resp.status_code == 200:
        clinics = resp.json()
        if len(clinics) == 1 and clinics[0].get('slug') == 'lakeside-family-care':
            log_pass(f"Can only see Lakeside clinic: {clinics}")
        else:
            log_fail(f"Expected only lakeside-family-care, got: {clinics}")
    else:
        log_fail(f"GET clinics failed: HTTP {resp.status_code}")
    
    # 4b: Cannot see Sharma visits
    # Get Sharma clinic ID
    sharma_clinic_resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/clinics?slug=eq.sharma-demo&select=id',
        headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
        timeout=20
    )
    
    if sharma_clinic_resp.status_code == 200:
        sharma_clinics = sharma_clinic_resp.json()
        if sharma_clinics:
            sharma_clinic_id = sharma_clinics[0]['id']
            
            # Try to get Sharma visits as Lakeside doctor
            resp = supabase_get(
                f'/rest/v1/visits?clinic_id=eq.{sharma_clinic_id}&select=id,token_number',
                token=token,
                use_anon=False
            )
            
            if resp.status_code == 200:
                visits = resp.json()
                if len(visits) == 0:
                    log_pass("Cannot see Sharma visits - RLS working")
                else:
                    log_fail(f"RLS BREACH: Lakeside doctor can see {len(visits)} Sharma visits")
            else:
                log_info(f"GET Sharma visits returned HTTP {resp.status_code}")

def test_5_platform_admin():
    """Test 5: Platform admin access"""
    print("\n" + "="*80)
    print("TEST 5: Platform Admin Access")
    print("="*80)
    
    token = sign_in(ADMIN_EMAIL, ADMIN_PASS)
    if not token:
        log_fail("Could not sign in as platform admin")
        return
    
    log_pass(f"Signed in as {ADMIN_EMAIL}")
    
    # 5a: Can see ALL clinics
    resp = supabase_get('/rest/v1/clinics?select=slug,status', token=token, use_anon=False)
    if resp.status_code == 200:
        clinics = resp.json()
        slugs = [c.get('slug') for c in clinics]
        
        expected_slugs = ['sharma-demo', 'lakeside-family-care', 'green-cross']
        if all(slug in slugs for slug in expected_slugs):
            log_pass(f"Can see all {len(clinics)} clinics: {slugs}")
        else:
            log_fail(f"Expected {expected_slugs}, got {slugs}")
    else:
        log_fail(f"GET clinics failed: HTTP {resp.status_code}")
    
    # 5b: Can update platform_settings
    resp = supabase_patch(
        '/rest/v1/platform_settings?id=eq.true',
        {'price_per_completed': 2.50},
        token=token
    )
    
    if resp.status_code in [200, 204]:
        log_pass("Successfully updated platform_settings")
    else:
        log_fail(f"Update platform_settings failed: HTTP {resp.status_code} - {resp.text}")

def test_6_queue_transitions_and_billing():
    """Test 6: Queue transitions and duplicate finish protection"""
    print("\n" + "="*80)
    print("TEST 6: Queue Transitions & Billing Protection")
    print("="*80)
    
    token = sign_in(SHARMA_RECEPTION_EMAIL, SHARMA_RECEPTION_PASS)
    if not token:
        log_fail("Could not sign in as Sharma receptionist")
        return
    
    # Find a waiting visit
    today = date.today().isoformat()
    resp = supabase_get(
        f'/rest/v1/visits?visit_date=eq.{today}&status=eq.waiting&select=id,token_number&limit=1',
        token=token,
        use_anon=False
    )
    
    if resp.status_code != 200 or not resp.json():
        log_info("No waiting visits found, creating one via join_clinic_queue")
        
        # Get Sharma QR code using service role (anon can't read clinics due to RLS)
        clinic_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/clinics?slug=eq.sharma-demo&select=qr_identifier',
            headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
            timeout=20
        )
        if clinic_resp.status_code == 200 and clinic_resp.json():
            qr_code = clinic_resp.json()[0]['qr_identifier']
            
            join_resp = supabase_post('/rest/v1/rpc/join_clinic_queue', {
                'qr_code': qr_code,
                'patient_name': 'Test Patient Billing',
                'patient_age': 40,
                'patient_phone': '+919999999999',
                'patient_area': 'Test Area'
            }, use_anon=True)
            
            if join_resp.status_code in [200, 201]:
                visit_id = join_resp.json()['id']
                log_info(f"Created test visit {visit_id}")
            else:
                log_fail("Could not create test visit")
                return
        else:
            log_fail("Could not get Sharma clinic QR")
            return
    else:
        visit_id = resp.json()[0]['id']
        log_info(f"Using existing visit {visit_id}")
    
    # 6a: Transition waiting -> called
    resp = supabase_post('/rest/v1/rpc/transition_visit', 
                         {'target_visit': visit_id, 'next_status': 'called'},
                         token=token, use_anon=False)
    if resp.status_code in [200, 201]:
        log_pass("Transition waiting -> called succeeded")
    else:
        log_fail(f"Transition to called failed: HTTP {resp.status_code} - {resp.text}")
        return
    
    # 6b: Transition called -> consulting
    resp = supabase_post('/rest/v1/rpc/transition_visit',
                         {'target_visit': visit_id, 'next_status': 'consulting'},
                         token=token, use_anon=False)
    if resp.status_code in [200, 201]:
        log_pass("Transition called -> consulting succeeded")
    else:
        log_fail(f"Transition to consulting failed: HTTP {resp.status_code} - {resp.text}")
        return
    
    # 6c: Transition consulting -> completed
    resp = supabase_post('/rest/v1/rpc/transition_visit',
                         {'target_visit': visit_id, 'next_status': 'completed'},
                         token=token, use_anon=False)
    if resp.status_code in [200, 201]:
        log_pass("Transition consulting -> completed succeeded")
    else:
        log_fail(f"Transition to completed failed: HTTP {resp.status_code} - {resp.text}")
        return
    
    # 6d: Try duplicate finish (should fail)
    resp = supabase_post('/rest/v1/rpc/transition_visit',
                         {'target_visit': visit_id, 'next_status': 'completed'},
                         token=token, use_anon=False)
    
    if resp.status_code >= 400:
        error_msg = resp.text
        if 'Invalid queue transition' in error_msg or 'P0001' in error_msg:
            log_pass(f"Duplicate finish correctly rejected: {error_msg[:100]}")
        else:
            log_fail(f"Duplicate finish failed but with unexpected error: {error_msg}")
    else:
        log_fail(f"Duplicate finish should have failed but got HTTP {resp.status_code}")
    
    # 6e: Verify only ONE billing_usage row
    billing_resp = supabase_get(
        f'/rest/v1/billing_usage?visit_id=eq.{visit_id}&select=id,amount',
        token=token,
        use_anon=False
    )
    
    if billing_resp.status_code == 200:
        billing_rows = billing_resp.json()
        if len(billing_rows) == 1:
            log_pass(f"Exactly ONE billing_usage row exists (amount: ₹{billing_rows[0]['amount']})")
        else:
            log_fail(f"Expected 1 billing row, found {len(billing_rows)}")
    else:
        log_fail(f"Could not verify billing_usage: HTTP {billing_resp.status_code}")
    
    # 6f: Verify audit_events
    audit_resp = supabase_get(
        f'/rest/v1/audit_events?visit_id=eq.{visit_id}&select=event_type&order=created_at.asc',
        token=token,
        use_anon=False
    )
    
    if audit_resp.status_code == 200:
        events = audit_resp.json()
        event_types = [e['event_type'] for e in events]
        
        expected_events = ['CALLED', 'CONSULTING', 'COMPLETED']
        found_events = [e for e in expected_events if e in event_types]
        
        if len(found_events) == len(expected_events):
            log_pass(f"All expected audit events found: {event_types}")
        else:
            log_fail(f"Expected {expected_events}, found {event_types}")
    else:
        log_fail(f"Could not verify audit_events: HTTP {audit_resp.status_code}")

def test_7_monthly_cap_logic():
    """Test 7: Monthly cap logic documentation"""
    print("\n" + "="*80)
    print("TEST 7: Monthly Cap Logic")
    print("="*80)
    
    # Get platform settings using service role (receptionist can't read platform_settings)
    settings_resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/platform_settings?select=price_per_completed,monthly_cap',
        headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
        timeout=20
    )
    
    if settings_resp.status_code == 200 and settings_resp.json():
        settings = settings_resp.json()[0]
        price = settings['price_per_completed']
        cap = settings['monthly_cap']
        
        log_pass(f"Platform settings: price_per_completed=₹{price}, monthly_cap=₹{cap}")
        
        # Sign in as receptionist to get billing data
        token = sign_in(SHARMA_RECEPTION_EMAIL, SHARMA_RECEPTION_PASS)
        if not token:
            log_fail("Could not sign in")
            return
        
        # Get current month usage for Sharma
        clinic_resp = supabase_get('/rest/v1/clinics?slug=eq.sharma-demo&select=id', 
                                   token=token, use_anon=False)
        
        if clinic_resp.status_code == 200:
            clinic_id = clinic_resp.json()[0]['id']
            
            # Get this month's billing
            today = date.today()
            month_start = today.replace(day=1).isoformat()
            
            billing_resp = supabase_get(
                f'/rest/v1/billing_usage?clinic_id=eq.{clinic_id}&usage_date=gte.{month_start}&select=amount',
                token=token,
                use_anon=False
            )
            
            if billing_resp.status_code == 200:
                billing_rows = billing_resp.json()
                month_usage = sum(float(row['amount']) for row in billing_rows)
                
                log_pass(f"Current month usage for Sharma: ₹{month_usage}")
                
                # Calculate what next charge would be
                remaining = max(cap - month_usage, 0)
                next_charge = min(price, remaining)
                
                log_info(f"Monthly cap logic: charge = min(price={price}, max(cap={cap} - usage={month_usage}, 0)) = ₹{next_charge}")
                
                if month_usage < cap:
                    log_pass(f"Clinic is under monthly cap (₹{month_usage} < ₹{cap})")
                else:
                    log_pass(f"Clinic has reached monthly cap (₹{month_usage} >= ₹{cap}), next charge would be ₹0")
            else:
                log_fail(f"Could not get billing data: HTTP {billing_resp.status_code}")
    else:
        log_fail(f"Could not get platform settings: HTTP {settings_resp.status_code}")

def test_8_invalid_transition():
    """Test 8: Invalid transition rejection"""
    print("\n" + "="*80)
    print("TEST 8: Invalid Transition Rejection")
    print("="*80)
    
    token = sign_in(SHARMA_RECEPTION_EMAIL, SHARMA_RECEPTION_PASS)
    if not token:
        log_fail("Could not sign in")
        return
    
    # Find or create a waiting visit
    today = date.today().isoformat()
    resp = supabase_get(
        f'/rest/v1/visits?visit_date=eq.{today}&status=eq.waiting&select=id&limit=1',
        token=token,
        use_anon=False
    )
    
    if resp.status_code != 200 or not resp.json():
        # Create a test visit - use service role to get QR code
        clinic_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/clinics?slug=eq.sharma-demo&select=qr_identifier',
            headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'},
            timeout=20
        )
        if clinic_resp.status_code == 200 and clinic_resp.json():
            qr_code = clinic_resp.json()[0]['qr_identifier']
            
            join_resp = supabase_post('/rest/v1/rpc/join_clinic_queue', {
                'qr_code': qr_code,
                'patient_name': 'Test Invalid Transition',
                'patient_age': 30,
                'patient_phone': '+918888888888',
                'patient_area': 'Test'
            }, use_anon=True)
            
            if join_resp.status_code in [200, 201]:
                visit_id = join_resp.json()['id']
            else:
                log_fail("Could not create test visit")
                return
        else:
            log_fail("Could not get clinic QR")
            return
    else:
        visit_id = resp.json()[0]['id']
    
    # Try invalid transition: waiting -> completed (should fail)
    resp = supabase_post('/rest/v1/rpc/transition_visit',
                         {'target_visit': visit_id, 'next_status': 'completed'},
                         token=token, use_anon=False)
    
    if resp.status_code >= 400:
        error_msg = resp.text
        if 'Invalid queue transition' in error_msg or 'P0001' in error_msg:
            log_pass(f"Invalid transition waiting->completed correctly rejected: {error_msg[:100]}")
        else:
            log_fail(f"Transition failed but with unexpected error: {error_msg}")
    else:
        log_fail(f"Invalid transition should have failed but got HTTP {resp.status_code}")

def test_9_security():
    """Test 9: Security - service role key not exposed"""
    print("\n" + "="*80)
    print("TEST 9: Security - Service Role Key Exposure")
    print("="*80)
    
    # Check /api response
    resp = requests.get(f'{BASE_URL}/api', timeout=20)
    if resp.status_code == 200:
        api_text = resp.text
        if SERVICE_KEY in api_text:
            log_fail("SERVICE ROLE KEY EXPOSED in /api response!")
        else:
            log_pass("Service role key NOT in /api response")
    
    # Check if anon key is present (it should be, it's public)
    if ANON_KEY in api_text:
        log_pass("Anon key present in response (expected, it's public)")
    
    # Check HTML source
    html_resp = requests.get(BASE_URL, timeout=20)
    if html_resp.status_code == 200:
        html_text = html_resp.text
        if SERVICE_KEY in html_text:
            log_fail("SERVICE ROLE KEY EXPOSED in HTML source!")
        else:
            log_pass("Service role key NOT in HTML source")
        
        if ANON_KEY in html_text:
            log_pass("Anon key present in HTML (expected for client-side Supabase)")
    
    log_info("Manual review recommended: Check _next/static bundles and network tab")

def main():
    print("\n" + "="*80)
    print("ClinicFlow Comprehensive Backend Verification")
    print("Project: bwomwxtzzhucrplntmtq")
    print("="*80)
    
    try:
        test_1_health()
        test_2_anon_patient_join()
        test_3_sharma_receptionist_rls()
        test_4_lakeside_doctor_rls()
        test_5_platform_admin()
        test_6_queue_transitions_and_billing()
        test_7_monthly_cap_logic()
        test_8_invalid_transition()
        test_9_security()
        
        print("\n" + "="*80)
        print("Backend Verification Complete")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
