# UC Capstone Project Management

University of Canberra capstone project platform with Student, Convenor, Sponsor, Mentor and Tutor access.

## Requirements

Node.js 22.13+ and pnpm. React 19, TypeScript and Vinext provide the interface/server framework. Cloudflare Workers, D1 and private R2 provide hosting, shared records and documents. Supabase Auth supplies standard password authentication.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173. On a login page choose **Use demonstration**. Fictional usernames: `student`, `convener`, `sponsor`, `mentor`, `tutor`. Shared demo password: `Capstone2026!`. Demonstration data stays in the browser and does not grant real-account access.

For shared records, copy `.env.example` to `.dev.vars` and provide your authentication settings. Apply `drizzle/0000_platform.sql` to the local D1 database using Wrangler. The catalogue import helper generates idempotent SQL from the supplied 66-entry project catalogue. Never commit passwords, local databases or environment files.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm test:server
pnpm test:e2e
pnpm build
```

Browser tests use Google Chrome. Tests and migrations are retained because they are part of maintaining the application.

## Deployment

Create your Cloudflare D1 database and private R2 bucket, then replace the placeholder database ID and bucket name in `wrangler.jsonc`. Configure authentication secrets and allowed verification/reset return URLs for your deployed domain. Apply migrations and import the catalogue, build with `pnpm build`, then deploy with `pnpm deploy`.

No real convenor is pre-approved. An authorised verified initial administrator and verified email delivery are required before real-user launch. Backups are manual; scheduled backups and object-storage recovery require an operational policy. Account membership currently supports one role. Official academic grading remains outside this application.

## GitHub

This folder is a standalone source export with no previous Git history. Create a new repository **from this folder**, not its parent. Initialise Git here, review the staged files, and push to your own GitHub repository. The ignore rules exclude dependencies, generated data, credentials and assistant metadata. Environment examples contain blank values only.

## Features

- Five role dashboards. Students sign up and verify their email before signing in; staff permissions require convenor approval.
- Sponsor proposals and convenor review/publication.
- Student-created groups, three ranked preferences and versioned EOIs.
- Convenor allocation review with sponsor decisions and conflict checks.
- Scoped messages, document versions, tasks, notifications and audit reports.
- Manual private backup snapshots and isolated restore tooling.

See `docs/asset-provenance.md` for branding and third-party asset attribution. Required third-party licences are retained.

## Demonstration-only deployment

Run `pnpm build:demo`, then `pnpm deploy` to publish a browser-local demonstration. This selects `wrangler.demo.jsonc` and does not bind the shared database or file storage. Do not add authentication-provider secrets to this demo Worker. Use the normal build/configuration for the future full service.

## Workflow corrections (29 October 2026)

- Rejected EOIs can be revised and resubmitted. A recorded group-specific extension lasts 72 hours after rejection, or until the original deadline if later; convenors can manage further exceptions. Older saved demo rejections use the recorded decision time, so refreshing does not extend the window.
- Students can edit their display name/skills; leaders can rename their group. Submitted application snapshots remain unchanged until resubmission.
- Tutor access is limited to tutoring interests, assignment information, communications and notifications. Convenors administer proposals and allocations without access to student workspaces, project files or project conversations.
- Administrative exports exclude student work; full operational backups must be managed outside the convenor portal. Historical snapshots without the authorised convenor identity cannot be downloaded from the portal.
- Proposal submission/review, sponsor requests and forwarded application decisions have explicit delivery/status feedback. Opening notification details marks it read.
- The guide has role-specific instructions. Reset clearly explains the browser-local data it clears, including uploaded demonstration files.

The demonstration is available at https://uc-capstone-demo.uc-capstone-portal.workers.dev. Requests and activity are shared between role logins in one browser only; they are not delivered to other devices or emailed.

