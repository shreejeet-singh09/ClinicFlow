# ClinicFlow

Supabase-first multi-tenant clinic queue MVP. MongoDB is not used.

## Environment

Add these variables to `.env.local` (and Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Apply `supabase/migrations/0001_clinicflow.sql` in the Supabase SQL editor, then seed demo users/profiles from a trusted server-side script using the service role key. Never expose that key to the browser.

The current interface includes doctor/receptionist views, a separate platform admin dashboard with approval, suspension, reactivation, delete confirmation, and revenue snapshot, live queue states, pause/resume affordance, patient QR join preview, daily metrics, calendar analytics, estimated consultation revenue, and capped SaaS usage. Connect the displayed actions to Supabase server actions/RPCs after adding project credentials.