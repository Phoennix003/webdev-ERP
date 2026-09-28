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
