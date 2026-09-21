# Phase 2 — Supabase Configuration Contract

## Connection values (non-secret)

```dotenv
SUPABASE_URL=https://efmavglmkavnzcfsdacl.supabase.co
SUPABASE_DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USERNAME=postgres.efmavglmkavnzcfsdacl
SUPABASE_DB_SSLMODE=require
```

## Secret

```dotenv
SUPABASE_DB_PASSWORD=CHANGE_ME
```

Never store the real password in this design package.

## Recommended JDBC datasource

```properties
spring.datasource.url=jdbc:postgresql://${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=${SUPABASE_DB_SSLMODE}
spring.datasource.username=${SUPABASE_DB_USERNAME}
spring.datasource.password=${SUPABASE_DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver
```

The user has chosen the Supabase shared/session pooler. The application should not use the
transaction pooler (6543) as its primary ORM datasource.

## Secrets policy

- Real values live only in local environment/secret storage.
- `config/.env.example` may contain placeholders and non-secret connection components.
- `config/.env` must not be printed by Antigravity, CI logs or documentation output.
- Never put database passwords into `frontend/.env` or any `VITE_*` variable.
- Never commit secret keys or database passwords.
- Supabase publishable/secret API keys are not required for the direct JDBC database path.
  Keep them separate from the database password.

## Database initialization strategy

Phase 2 uses repository-tracked SQL migrations plus JPA/Hibernate validation.
Antigravity must choose one deterministic migration mechanism and document how it runs.
Do not combine multiple auto-schema mechanisms that can race or silently rewrite tables.

Preferred implementation order:
1. PostgreSQL driver + Spring Data JPA.
2. Apply SQL migration files to Supabase.
3. Start Spring Boot with schema validation (`ddl-auto=validate`) after migration is proven.
4. Seed the 369-player dataset idempotently.
5. Add persistence integration tests.
