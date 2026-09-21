# Phase 2 helper: print only non-secret Supabase configuration keys.
# Never echo SUPABASE_DB_PASSWORD.

Write-Host "Auction XI Phase 2 — Supabase configuration check"
Write-Host "Expected host: aws-0-ap-northeast-1.pooler.supabase.com"
Write-Host "Expected port: 5432"
Write-Host "Expected database: postgres"
Write-Host "Expected username: postgres.efmavglmkavnzcfsdacl"
Write-Host "Expected SSL mode: require"
Write-Host "Do not print or log SUPABASE_DB_PASSWORD."
