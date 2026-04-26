# Database migrations

Each numbered file is a one-shot SQL script that brings the schema
forward by one step. They are idempotent (safe to re-run) thanks to
`if not exists` / `drop policy if exists` / etc.

## Applying to a new project (e.g. staging)

**Quick path** — paste each file's contents into the Supabase SQL
editor in numerical order, run each.

**CLI path** — once per project:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push           # applies anything in this folder not yet on remote
```

After applying, also create a private Storage bucket named `books`
(Storage tab → New bucket → Private). The Storage policies in
`0001_init.sql` reference that bucket name.

## Adding a new migration

Create the next-numbered file and put your DDL in it. Re-run via
either path above. Bumping `package.json` to a new app version is
helpful so you can correlate code + schema state.
