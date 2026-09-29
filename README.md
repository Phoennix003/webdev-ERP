# webdev-ERP

ERP for DLSU-D ITPC.

Features:
Structure and design

- 4 pages: Login, Dashboard, Inventory, Officers, with a shared sidebar and one stylesheet
- Responsive layout (the sidebar becomes a top bar on phones and fits down to 320px)
- Nav icons, hover effects, page and modal animations, and a reduced-motion setting

Access

- Login with two accounts (admin and member), with an error on bad credentials
- Role-based access: admins get Add, Update qty, Toggle status, Delete and Reset demo data; members can only view
- Log Out clears the role

Data and logic

- Data saved in localStorage, so it persists across pages and refreshes
- Live dashboard stats (total items, low stock alerts, active officers) with animated counters
- Recent Activity log on the dashboard
- Search plus dropdown filters on Inventory and Officers
- Sortable columns (ascending and descending)
- Empty-state message when nothing matches
- Add forms with validation (required fields, non-negative whole-number quantity, no duplicate names)
- Click-to-view detail modal (closes with X, backdrop click or Esc)
- Update quantity, which changes Low Stock automatically
- Toggle officer status
- Confirm-before-delete
- Toast notifications
- Active nav highlighting
- Reset demo data button
- Names you type in are escaped, so they can't break the page

(Added Sept 28, 2026)

Design

- Colors sampled from the ITPC Facebook page (crimson #b62021, maroon, charcoal #262729, steel gray). All live in `:root` at the top of style.css.
- Fonts: Chakra Petch (angular/italic, closest free match to the banner lettering) + Barlow (body).
- Login: comic-panel red background, red glow that follows the mouse, brushed-steel "ITPC" wordmark, 2026/2027 red tags.

New features

- Login guard (pages redirect to login if not signed in)
- Show/Hide password, demo-account fill buttons, shake on wrong password
- User card in sidebar (name + role)

Dashboard:

- 4th stat (total units), stock-level bars, officers-per-committee bars, colored activity feed, personal greeting, quick-add buttons
- Edit for items and officers (same form as Add)
- Styled confirm dialog replaces browser confirm()/prompt()
- Undo after delete
- Export CSV (exports what's currently filtered)
- "Showing X of Y" counter, "/" shortcut to search
- Stock meter bars in the inventory table; initials avatars for officers
- Modal focus handling (Tab stays inside, focus returns on close)

Fixes:

- css/ and js/ paths in the HTML didn't match the flat file layout
- Dashboard could be opened without logging in
- Native prompt()/confirm() dialogs replaced
- Duplicate-name check no longer blocks saving an item you're editing
- Rebranded CSITPC -> ITPC (storage keys now itpc\_\*)

(Added Sept 29, 2026)

Events and dashboard

- Events page with a month calendar (colored dots per event type, click a day to filter), plus add/edit/delete for admins and view-only for members
- Dashboard widgets: Upcoming events and Low stock alerts

Backup and report

- Dashboard > Backup & reports: "Download backup" saves everything (inventory, officers, events, activity) as a .json file, so data survives clearing the browser or switching devices
- "Restore from backup" validates the file first (wrong app, bad quantities, duplicate ids are rejected and nothing changes), asks for confirmation, then replaces the current data. Admin only. Older backups without events still restore
- "Print report" opens report.html: a light-themed summary (stats, low stock, inventory, officers, upcoming events) for Print / Save as PDF

