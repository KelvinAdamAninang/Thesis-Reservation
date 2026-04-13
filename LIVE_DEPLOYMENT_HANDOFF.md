# Live Deployment Handoff (Temporary)

## Introduction
Our live deployment is currently in a sensitive state because dependency versions are not fully stable across environments, which can lead to installation failures or runtime inconsistencies during updates/restarts. The main pressure points are package compatibility (especially gRPC/Pydantic-related dependencies), production environment consistency, and making sure core reservation workflows remain healthy while the app is running.

I will be away for a bit, so this note is a quick guide for how the team can keep the system stable and reduce disruption for users.

## What Help Is Needed While I Am Away
1. Monitor live app health at least twice daily.
   - Confirm login works for Admin and Student accounts.
   - Confirm reservation creation and approval actions are working.
   - Confirm calendar events load correctly.

2. Use the fixed dependency set for any reinstall/redeploy.
   - Prefer `requirements_FIXED.txt` over the old `requirements.txt`.
   - After install, run `pip check` and confirm there are no broken requirements.

3. Watch logs for deployment/runtime errors.
   - Check Gunicorn/host logs for import errors, dependency errors, and API failures.
   - Prioritize errors involving `grpcio`, `grpcio-status`, `pydantic-core`, and Google API libraries.

4. Verify required environment variables stay valid.
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`

5. Keep the scheduler behavior under observation.
   - Ensure daily auto-cancel checks for `concept-approved` reservations continue running.
   - Report any missed auto-cancel windows immediately.

## Suggested Daily Quick Checklist
- Open live app and test login.
- Create a test reservation and confirm expected status flow.
- Check calendar rendering and event statuses.
- Review logs for errors/warnings.
- Confirm no dependency or import failures after any restart.

## Escalation Rule
If there is a production blocker (users cannot log in, cannot reserve, or approvals fail), prioritize service restoration first (rollback/restart with known-good settings), then document what happened for follow-up.

## Temporary Owner Notes
Please keep a short incident log (time, issue, action taken, outcome). This will help me continue quickly when I return.
