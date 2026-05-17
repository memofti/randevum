# Supabase Migrations

Schema, RLS policy'leri, RPC fonksiyonları ve cron job'lar **uzaktaki Supabase dashboard'unda** yönetiliyor. Lokal `supabase/migrations/` klasörü yok — değişiklikler MCP veya dashboard üzerinden uygulanıyor.

## Tam migration listesini lokale çekmek

```bash
# Supabase CLI kurulu değilse:
brew install supabase/tap/supabase

# Proje root'unda:
supabase login
supabase link --project-ref mqaqwqomabsctozeuryf
supabase db pull           # remote → supabase/migrations/ olarak indir
```

Bu komut tüm migration geçmişini SQL dosyası olarak `supabase/migrations/` altına çeker. Sonrasında git'e commit edersen tam bir schema snapshot'ına sahip olursun.

## Uygulanmış migration'lar (2026-05-16 itibariyle)

| Tarih | İsim |
|-------|------|
| 2026-03-25 | initial_schema |
| 2026-03-25 | add_update_policies |
| 2026-04-03 | ads_and_media |
| 2026-04-08 | storage_setup |
| 2026-04-11 | loyalty_and_realtime |
| 2026-05-09 | payment_mode_and_auto_confirm |
| 2026-05-10 | qr_checkin |
| 2026-05-10 | admin_revenue_and_commission |
| 2026-05-10 | waiting_list_and_invoices |
| 2026-05-10 | kvkk_and_unsubscribe |
| 2026-05-13 | staff_avatar_and_login_fields |
| 2026-05-13 | enable_realtime_appointments_notifications |
| 2026-05-13 | realtime_platform_settings |
| 2026-05-13 | platform_settings_insert_policy |
| 2026-05-13 | ad_packages_and_purchases |
| 2026-05-13 | plan_limits_write_policy |
| 2026-05-14 | add_plan_limits_businesses_to_realtime |
| 2026-05-15 | auth_helpers_and_fix_search_path |
| 2026-05-15 | seed_auth_users_for_demo_profiles |
| 2026-05-15 | rls_role_based_overhaul |
| 2026-05-15 | ad_expiry_cron |
| 2026-05-15 | coupons_table_and_rpc |
| 2026-05-15 | push_subscriptions_unique_endpoint |
| 2026-05-15 | fix_broken_cron_jobs |
| 2026-05-15 | reviews_require_completed_appointment |
| 2026-05-15 | appointments_double_booking_unique |
| 2026-05-15 | businesses_closed_dates |
| 2026-05-15 | storage_media_policies_tighten |
| 2026-05-15 | delete_my_account_rpc |
| 2026-05-15 | create_walkin_customer_rpc |
| 2026-05-15 | reviews_auto_update_rating |
| 2026-05-15 | staff_action_rpcs |
| 2026-05-15 | staff_appointments_rpc |
| 2026-05-15 | staff_sessions_and_bcrypt_v2 |
| 2026-05-16 | lock_down_staff_sessions |
| 2026-05-16 | restrict_security_definer_function_execute |
| 2026-05-16 | restore_is_admin_owns_business_execute |
| 2026-05-16 | rls_initplan_optimization |
| 2026-05-16 | add_fk_indexes_and_drop_unused |
| 2026-05-17 | ad_credits_kontör_and_enforce_max_30_days |
| 2026-05-17 | ad_packages_enforce_duration_impressions_regional |

## Project bilgileri

- **Project ref:** `mqaqwqomabsctozeuryf`
- **Region:** eu-central-1
- **URL:** `https://mqaqwqomabsctozeuryf.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/mqaqwqomabsctozeuryf
