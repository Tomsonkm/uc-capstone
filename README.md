# UC Capstone Project Management

A capstone project platform for University of Canberra students, convenors, sponsors, mentors and tutors. It brings project proposals, group formation, expressions of interest (EOIs), allocations and project communication into one application.

[Open the website](https://uc-capstone.uc-capstone-portal.workers.dev/) · [Source repository](https://github.com/Tomsonkm/uc-capstone)

## Features

- Separate student and staff access, with five role-specific dashboards.
- Email/password signup, email verification, password recovery and remember-me sessions through Supabase Auth.
- Project catalogue with requirements, skills, deliverables and availability. The supplied S2 2026 catalogue contains 66 populated entries.
- Student groups of 3–4 members, accepted invitations, editable profiles and group names.
- Available-student search by username, name, email or skill. Grouped students and existing invitations are excluded.
- Leader-confirmed group deletion before any EOI submission or project allocation.
- Saved unit selection: **9785 (Undergraduate)** or **11522 (Postgraduate)**, including before an application round opens.
- Three ranked project preferences, suitability statements, proposed approaches, submission history and permitted resubmission after rejection.
- Convenor-controlled sponsor review, allocation drafts, mentor/tutor assignment and duplicate-allocation checks.
- Authorised communication channels, a shared project workspace, document versions, tasks and in-app notifications.

## Roles and access

| Role | Main responsibilities |
| --- | --- |
| Student | Form a group, submit preferences, view allocation results and use assigned project communication and documents. |
| Convenor | Review proposals and EOIs, forward applications to sponsors, manage accounts and rounds, and finalise allocations. |
| Sponsor | Manage their own proposals, decide on forwarded applications and work with their assigned student groups. |
| Mentor | Express mentoring interest, support assigned projects and communicate with students and the convenor. |
| Tutor | Express tutoring interest, view assignment information and communicate with the convenor. |

Students can access the platform after email verification. Staff permissions require convenor approval. Users cannot grant themselves administrative access. Convenors and tutors do not have access to student project workspaces or project files. Official grading remains in the university's separate systems.

## Project workflow

1. A sponsor submits a proposal for convenor review.
2. The convenor approves, requests changes or rejects it, then publishes approved projects.
3. Students form a group and submit three ranked preferences before the deadline, with skills and suitability information.
4. The convenor reviews applications and forwards project-specific EOIs to the linked sponsor where required.
5. The sponsor records acceptance or rejection for the convenor.
6. The convenor reviews and confirms the project and mentor allocation, with tutor assignment where applicable.
7. Students receive an in-app notification and access their assigned project workspace.

Allocation is based on suitability and convenor judgement, rather than submission order. Rejected groups can revise and resubmit within the permitted deadline or an authorised extension.

## Technology and storage

| Component | Technology |
| --- | --- |
| Interface | React 19 and TypeScript |
| Application framework and build | Vinext and Vite |
| Hosting and server routes | Cloudflare Workers |
| Authentication | Supabase Auth |
| Shared application records | Cloudflare D1 |
| Private uploaded files | Cloudflare R2 |
| Tests | Vitest, Testing Library and Playwright |

Real-account records remain in cloud storage after sign-out and can be accessed from another device after signing in. Supabase manages authentication credentials; D1 stores application records, and private R2 stores uploaded files.

The optional **demonstration mode** uses fictional accounts and browser-local data. Its activity is separate from real accounts and is not shared with other devices. The current website supports both modes; the word `demo` in its address does not mean real-account activity is stored locally.

## Run locally

Requirements: **Node.js 22.13+**, **pnpm**, and Google Chrome for browser tests. The package-manager version is declared in `package.json`.

```sh
git clone https://github.com/Tomsonkm/uc-capstone.git
cd uc-capstone
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

### Explore the fictional demonstration

On a login page, select **Use demonstration**. The public fictional usernames are `student`, `convener`, `sponsor`, `mentor` and `tutor`; their shared demonstration password is `Capstone2026!`. These credentials do not authenticate to the real-account service.

### Configure real-account development

1. Copy `.env.example` to `.dev.vars` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for a Supabase project you control.
2. Configure the D1 and private R2 bindings in `wrangler.jsonc`. The checked-in resource identifiers belong to this project; replace them when using another Cloudflare account.
3. Initialise the local database:

   ```sh
   pnpm exec wrangler d1 migrations apply uc-capstone --local
   ```

4. Create an `outputs` folder, then generate and import the supplied project catalogue:

   ```sh
   node scripts/catalogue-import.mjs outputs/catalogue-import.sql
   pnpm exec wrangler d1 execute uc-capstone --local --file outputs/catalogue-import.sql
   ```

5. Configure Supabase's Site URL and allowed redirect URLs for the local address. Confirmation uses `/auth/confirm`; recovery uses `/auth/confirm?next=/reset-password`.
6. Configure custom SMTP for verification and recovery emails. Open the newest email link in the same browser and device that initiated the request.

Cloud-hosted development services need their own authorised Cloudflare configuration. Local D1/R2 development data is separate from the deployed application's data.

No initial convenor is automatically approved. An authorised operator must verify the intended administrator's email ownership and provision that account's D1 permissions before staff approvals can be managed through the portal.

## Validate changes

```sh
pnpm typecheck
pnpm test
pnpm test:server
pnpm test:e2e
pnpm build
```

The suites cover workflow rules, server permissions, persistence, role access and browser interactions. Browser tests use Google Chrome. Never use real passwords or production recovery links in automated tests.

## Deploy to Cloudflare

Cloudflare Workers Builds is connected to **Tomsonkm/uc-capstone**, with **main** as the production branch. Pushing a commit to `main` triggers a build and deployment to the **uc-capstone** Worker. Check the build result in Cloudflare before assuming a commit is live.

| Build setting | Value |
| --- | --- |
| Production Worker | `uc-capstone` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `pnpm run build` |
| Deploy command | `npx wrangler deploy` |

The build generates Cloudflare deployment configuration for the application. For a local manual deployment, `pnpm deploy` explicitly uses `dist/server/wrangler.json`. The configuration includes `keep_vars: true` to retain runtime variables managed through the Cloudflare dashboard. Private credentials remain outside GitHub.

For a new shared-service deployment:

1. Sign in to the intended Cloudflare account and configure the Worker name, D1 database and private R2 bucket in `wrangler.jsonc`.
2. Apply the database migrations and import the catalogue into the intended remote database using Wrangler's `--remote` option. Review the target before changing cloud records.
3. Build and deploy:

   ```sh
   pnpm build
   pnpm deploy
   ```

4. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the deployed Worker's private runtime configuration. Keep deployment credentials and SMTP passwords outside the repository.
5. Set Supabase's Site URL to the deployed origin and allow both callback URLs:

   ```text
   https://YOUR-HOST/auth/confirm
   https://YOUR-HOST/auth/confirm?next=/reset-password
   ```

6. Verify signup, inbox delivery, recovery, approved-role access and private file handling before inviting users. Configure an application round before accepting EOIs.

The production address is **https://uc-capstone.uc-capstone-portal.workers.dev/**. Supabase's Site URL and confirmation/recovery redirect allowlist must use this origin; changing the Worker name does not update Supabase automatically. The previous `uc-capstone-demo` address is no longer the production address.

For authorised alternate deployments, `CAPSTONE_CONFIG` can select a private configuration before `pnpm build`. Check the generated Worker's name and bindings before deployment.

For a separate browser-local demonstration, use `pnpm build:demo` followed by `pnpm deploy`. This selects `wrangler.demo.jsonc` without D1/R2 bindings. Give it a different Worker name before deployment so it does not replace the shared-service website at the current address.

## Repository layout

```text
app/         Server routes and application entry points
src/         Interface, domain rules, services and styles
server/      Authentication, permissions, persistence and uploads
public/      Public assets
drizzle/    Database migrations
scripts/     Runtime, catalogue import and restore utilities
tests/       Browser tests
docs/        Asset attribution
```

Environment files, local deployment settings, dependencies, build output, local databases and private attachments are excluded through `.gitignore`. Commit the lockfile, tests, migrations and required licences.

## Operational notes

- Each account currently has one application role.
- Authentication emails depend on the configured SMTP provider. A successful request does not prove inbox delivery.
- Project sponsors must be linked to active sponsor accounts before receiving EOI review requests.
- Convenor exports contain administrative information and exclude student project work. Full database/file backup, scheduling and recovery remain operator responsibilities.
- `scripts/restore-backup.mjs` validates a snapshot or restores it into a new local SQLite file; it does not overwrite an existing database or restore R2 file contents.

See [asset provenance](docs/asset-provenance.md) for University branding and third-party asset attribution. Required third-party licences are retained.
