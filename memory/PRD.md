# CarePair MVP PRD

## Product
Multi-tenant clinic queue and waiting-time management SaaS using Supabase PostgreSQL, Auth, Realtime, and RLS.

## Current slice
- Doctor/clinic owner dashboard preserved
- Receptionist queue workspace preserved
- Public patient join and token tracking experience
- Separate platform admin dashboard for clinic approvals, status management, deletion confirmation, staff/usage overview, and revenue snapshot
- Supabase migration foundation with tenant-linked data, RLS, daily token uniqueness, billing usage uniqueness, and Realtime publication

## Deferred integration work
Connect visible demo actions to authenticated Supabase server actions/RPCs, seed demo accounts, and add token-scoped patient Realtime reads after Supabase environment variables are configured.