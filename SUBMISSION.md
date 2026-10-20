# Homework submission

- **Live app:** _pending — paste the deployed URL here_
- **Delete + Mine PR:** https://github.com/applifting-vsecourse/jirp13/pull/6
- **Moderation PR:** https://github.com/applifting-vsecourse/jirp13/pull/6 (same PR: it carries both features)
- **Where I check owner or role:** [apps/backend/src/modules/quack/services/quacks.service.ts:47-50](apps/backend/src/modules/quack/services/quacks.service.ts#L47-L50)
- **E2E test:** [apps/frontend/e2e/moderation.spec.ts](apps/frontend/e2e/moderation.spec.ts) (`pnpm --filter frontend test:e2e`)
- **My rule:** Permission checks (owner or role) are enforced on the server, in the service. The UI hiding a button is a convenience only: never trust the client or the request body for who may do what.
