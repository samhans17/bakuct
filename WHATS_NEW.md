# BakuCT — What's New

_Last updated: 2026-07-12_

This document summarises the recent changes to the BakuCT Transport Management
System: a new **two-role login system**, a **weekly entry lock**, **restricted
deletion** for the data-entry user, and **automated weekly database backups**.

---

## 1. Overview

Previously the app had a single `admin` login that could see and do everything.
It now supports **two roles**:

| Role      | Login                | What it's for                                             |
|-----------|----------------------|-----------------------------------------------------------|
| **Admin** | `admin` / `bakuct2024` | Full access — sees everything, can edit/delete anything.  |
| **Entry** | `entry` / `entry2024`  | Day-to-day data entry. Restricted view, add-only, weekly lock. |

The role is decided at login. The rest of the app automatically adjusts to what
that role is allowed to see and do.

---

## 2. The Entry (data-entry) user

The Entry user is meant for someone who records daily transactions but should
**not** see the full business financials or be able to remove historical data.

### What the Entry user CAN do
- Log in and use the app.
- **Add** entries, expenses, vehicles, rates, parties, and payments.
- See **today's totals** (income / expense / profit) in the header and dashboard.
- See and manage the **current week's** entries (so mistakes can be fixed before
  the week locks — see the Friday lock below).
- **Delete its own entries** — but only ones it created, and only while unlocked.

### What the Entry user CANNOT do
- ❌ See any **all-time / historical** figures (no all-time totals, no vehicle
  performance history, no party account balances).
- ❌ Change the dashboard **date range** — it is locked to today.
- ❌ See other days' data — the entry/expense lists only show the current period.
- ❌ **Delete** expenses, vehicles, rates, parties, or payments.
- ❌ **Delete other people's entries** (e.g. anything the Admin created).
- ❌ **Delete locked entries** (past the weekly Friday cut-off).

### Permissions at a glance

| Action                          | Admin | Entry                              |
|---------------------------------|:-----:|------------------------------------|
| Add entries / expenses / etc.   |  ✅   | ✅                                 |
| See all-time & historical totals|  ✅   | ❌ (today only)                    |
| Change dashboard date range     |  ✅   | ❌ (locked to today)               |
| Delete own **unlocked** entry   |  ✅   | ✅                                 |
| Delete someone else's entry     |  ✅   | ❌                                 |
| Delete a **locked** entry       |  ✅   | ❌                                 |
| Delete expenses/parties/etc.    |  ✅   | ❌                                 |

A badge in the header shows **"Entry Mode — Today Only"** so it's always clear
which role is active.

---

## 3. The weekly Friday lock

Entries lock on a **weekly cycle** so historical records can't be changed after
the week is closed.

- The Entry user can freely add and delete **its own** entries during the
  **current open week**.
- **Every Friday (end of day)** that week's entries **lock permanently**.
- After locking, the Entry user can **no longer delete** those entries, and they
  drop out of its view.
- **Admin always bypasses the lock** — Admin can delete any entry at any time.

### Example timeline

```
Sat → Thu   Entry user adds / deletes its own entries freely
Fri (EOD)   The week's entries LOCK
Sat (new)   A new open week begins; last week's entries are locked & hidden
```

The "open week" runs from **Saturday through the following Friday**. The cut-off
is calculated the same way on both the server and the browser, so they always
agree. (Dates are handled in UTC — tell us if you'd prefer Pakistan local time.)

---

## 4. Automated weekly database backups

A backup script keeps a rolling copy of the database so nothing is ever lost.

- Script: **`backup.js`** (in the project root).
- Creates a safe, timestamped copy of `bakuct.db` into the **`backups/`** folder.
- Uses SQLite's online-backup method, so it's **safe to run while the app is live**.
- **Keeps only the 2 most recent backups** (≈ 2 weeks); older ones are deleted
  automatically.

### How it's scheduled (on the AWS server)

A weekly `cron` job runs the script every **Saturday at 2:00 AM** (right after
the Friday lock closes, so each backup captures a full completed week):

```cron
0 2 * * 6 cd /home/ubuntu/bakuct && /usr/bin/node backup.js >> /home/ubuntu/bakuct/backups/backup.log 2>&1
```

- Run it manually anytime: `node backup.js`
- Want more history? Change `const KEEP = 2;` at the top of `backup.js`.
- Every run is logged to `backups/backup.log`.

---

## 5. How it looks / behaves now

**On login**, the app checks the role and configures itself:

- **Admin** — the app looks and works exactly as before: full dashboard, all
  date ranges, all-time summaries, and delete buttons everywhere.

- **Entry** — a streamlined, day-focused view:
  - Header shows a **"Entry Mode — Today Only"** badge and **today's** income /
    expense / profit.
  - Dashboard shows **today's** figures only; the date-range selector, "All Time
    Summary", vehicle performance, and party account panels are hidden.
  - The **Entries** list shows the current week; each entry the user created
    shows a delete button, while entries it can't remove show a 🔒 lock icon.
  - The **Parties** tab shows contact details only (no cumulative account
    balances).
  - Attempting a disallowed delete is blocked both in the screen and on the
    server (returns a clear "not allowed" message).

---

## 6. Technical summary (for reference)

### Backend — `server.js`
- Added a `role` column to the `users` table; created the `entry` user.
- Login now returns the user's role.
- A lightweight role gate reads an `X-User-Role` header and enforces rules per
  request (blocks disallowed deletes with `403`).
- Added a `created_by` column to `entries` to track who created each one.
- `GET /api/entries` returns only the current open week for the Entry role.
- `GET /api/expenses` and the dashboard are scoped to today for the Entry role;
  all-time / cumulative figures are withheld from the Entry role.
- `DELETE /api/entries/:id` verifies **ownership** and the **weekly lock** for
  the Entry role (Admin bypasses both).
- Shared `getOpenWeekStart()` helper defines the weekly cut-off.

### Frontend — `public/js/app.js`, `public/index.html`, `public/css/styles.css`
- Stores the role after login and sends it on every request.
- A `role-entry` mode hides the all-time/date-range/cumulative panels and the
  delete buttons on data the Entry user may not remove.
- The entries list renders a delete button only for the Entry user's own,
  unlocked entries (others show a 🔒 badge).
- Header totals show **today's** figures for the Entry role.
- Added an "Entry Mode" header badge.

### New file — `backup.js`
- Online, timestamped database backup with automatic 2-backup retention.

---

## 7. Credentials & quick reference

| Role  | Username | Password     |
|-------|----------|--------------|
| Admin | `admin`  | `bakuct2024` |
| Entry | `entry`  | `entry2024`  |

> Tip: change these passwords for production. Ask us and we'll wire up a simple
> way to manage them.

**App:** runs under PM2 (`bakuct`) on port `3002`, behind nginx.
**Backups:** `backups/` folder, weekly via cron, 2 kept.
