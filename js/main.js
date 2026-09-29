// ============================================================
// ITPC ERP — main.js
// One file shared by all 4 pages. Every setup function first checks
// that the elements it needs exist, so it simply does nothing on
// pages where they are missing.
//
// SECTIONS
//   A. Data (localStorage)        D. Search, filter & sort
//   B. Login, logout & roles      E. Inventory page
//   C. Small helpers              F. Officers page
//                                 G. Dashboard
//   I. Events + calendar (Events page and Dashboard widget)
//   J. Backup & restore (JSON)      K. Printable report
// ============================================================

// ============================================================
// A. DATA
// Inventory, officers and the activity log are saved in localStorage
// so they survive page changes. That is what lets the Dashboard show
// real numbers.
// ============================================================
const KEYS = {
  inventory: "itpc_inventory",
  officers: "itpc_officers",
  activity: "itpc_activity",
  events: "itpc_events",
  lastBackup: "itpc_last_backup", // when a backup was last downloaded (not part of the backup)
};

const LOW_STOCK_LIMIT = 5; // quantity at or below this = "Low stock"

const DEFAULT_INVENTORY = [
  {
    id: 1,
    name: "ITPC Org T-Shirts (S-XL)",
    category: "merchandise",
    quantity: 35,
  },
  {
    id: 2,
    name: "Tarpaulins (event banners)",
    category: "event-materials",
    quantity: 2,
  },
  {
    id: 3,
    name: "Certificate holders",
    category: "office-supplies",
    quantity: 15,
  },
  { id: 4, name: "ITPC lanyards", category: "merchandise", quantity: 48 },
  { id: 5, name: "Extension cords", category: "event-materials", quantity: 4 },
  {
    id: 6,
    name: "Bond paper (reams)",
    category: "office-supplies",
    quantity: 12,
  },
];

const DEFAULT_OFFICERS = [
  {
    id: 1,
    name: "Sample President",
    position: "president",
    committee: "Executive",
    status: "active",
  },
  {
    id: 2,
    name: "Sample Officer A",
    position: "committee-head",
    committee: "Events",
    status: "active",
  },
  {
    id: 3,
    name: "Sample Officer B",
    position: "member",
    committee: "Logistics",
    status: "inactive",
  },
  {
    id: 4,
    name: "Sample Officer C",
    position: "member",
    committee: "Events",
    status: "active",
  },
  {
    id: 5,
    name: "Sample Officer D",
    position: "committee-head",
    committee: "Logistics",
    status: "active",
  },
];

// Sample events are dated relative to today so the calendar always has
// something to show, whenever the demo is opened.
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

const DEFAULT_EVENTS = [
  {
    id: 1,
    title: "General Assembly",
    date: dateOffset(2),
    time: "13:00",
    location: "Main Auditorium",
    type: "meeting",
    description: "Semester kickoff with all officers and members.",
  },
  {
    id: 2,
    title: "Web Dev Workshop",
    date: dateOffset(5),
    time: "09:00",
    location: "Computer Lab 3",
    type: "workshop",
    description: "Hands-on HTML, CSS and JavaScript session.",
  },
  {
    id: 3,
    title: "Officers Meeting",
    date: dateOffset(9),
    time: "16:30",
    location: "ITPC Office",
    type: "meeting",
    description: "Budget and logistics planning.",
  },
  {
    id: 4,
    title: "ITPC Night",
    date: dateOffset(16),
    time: "18:00",
    location: "University Grounds",
    type: "social",
    description: "Annual org night with games and performances.",
  },
  {
    id: 5,
    title: "Tech Talk: Careers in IT",
    date: dateOffset(-4),
    time: "14:00",
    location: "Room 204",
    type: "seminar",
    description: "Guest speakers from partner companies.",
  },
];

const EVENT_TYPE_LABELS = {
  meeting: "Meeting",
  workshop: "Workshop",
  seminar: "Seminar",
  social: "Social",
};

// Turns the value stored in the data into the text we show on screen
const CATEGORY_LABELS = {
  merchandise: "Merchandise",
  "event-materials": "Event materials",
  "office-supplies": "Office supplies",
};

const POSITION_LABELS = {
  president: "President",
  "committee-head": "Committee head",
  member: "Member",
};

// Read a list from localStorage. If nothing is saved yet (or the saved
// data is broken), save the default list and use that instead.
function loadData(key, defaults) {
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      // broken data: fall through and use the defaults
    }
  }

  const copy = JSON.parse(JSON.stringify(defaults)); // a fresh copy
  saveData(key, copy);
  return copy;
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Next free id = highest id in the list + 1
function nextId(list) {
  let highest = 0;
  list.forEach((entry) => {
    if (entry.id > highest) highest = entry.id;
  });
  return highest + 1;
}

function getInventoryStatus(item) {
  return item.quantity <= LOW_STOCK_LIMIT ? "low" : "in-stock";
}

// Adds a line to the Recent Activity list on the Dashboard.
// `type` is "add", "edit" or "delete" (it decides the dot color).
function logActivity(message, type) {
  const entries = loadData(KEYS.activity, []);
  entries.unshift({
    message: message,
    type: type,
    time: new Date().toISOString(),
  });
  saveData(KEYS.activity, entries.slice(0, 10)); // keep only the latest 10
}

// ============================================================
// B. LOGIN, LOGOUT & ROLES
// NOTE: front-end only. This shows how role-based access BEHAVES;
// it is not real security (anyone can read these passwords here).
// ============================================================
const DUMMY_ACCOUNTS = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Admin",
  },
  {
    username: "member",
    password: "member123",
    role: "member",
    displayName: "Member",
  },
];

// sessionStorage is cleared when the tab closes, so it works well for "who is logged in".
function isLoggedIn() {
  return sessionStorage.getItem("userRole") !== null;
}

function isAdmin() {
  return sessionStorage.getItem("userRole") === "admin";
}

// If you open a page without logging in, go back to the login page.
function requireLogin() {
  const isLoginPage = document.getElementById("loginForm") !== null;

  if (!isLoginPage && !isLoggedIn()) {
    window.location.href = "index.html";
  }
}

// Adds class "is-admin" to <body>. The CSS then shows every .admin-only
// element (including table rows created later by JS).
function applyRole() {
  if (isAdmin()) document.body.classList.add("is-admin");
}

// Fills the small user card at the bottom of the sidebar
function showUserInSidebar() {
  const nameEl = document.getElementById("userName");
  if (!nameEl || !isLoggedIn()) return;

  const name = sessionStorage.getItem("userName");
  nameEl.textContent = name;
  document.getElementById("userAvatar").textContent = name.charAt(0);
  document.getElementById("userRole").textContent = isAdmin()
    ? "Administrator"
    : "View only";
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const passwordInput = document.getElementById("password");
  const card = document.getElementById("loginCard");
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop the page from reloading

    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value.trim();

    // find() returns the matching account, or undefined if none match
    const account = DUMMY_ACCOUNTS.find(
      (entry) => entry.username === username && entry.password === password,
    );

    if (!account) {
      errorEl.textContent = "Invalid username or password.";
      errorEl.hidden = false;

      // Shake the card: add the CSS class, then remove it after the animation
      card.classList.add("is-shaking");
      setTimeout(() => card.classList.remove("is-shaking"), 400);
      return;
    }

    sessionStorage.setItem("userRole", account.role);
    sessionStorage.setItem("userName", account.displayName);
    window.location.href = "dashboard.html";
  });

  // Show / Hide password button
  const toggle = document.getElementById("togglePassword");
  toggle.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggle.textContent = "Hide";
    } else {
      passwordInput.type = "password";
      toggle.textContent = "Show";
    }
  });

  // "Fill admin" / "Fill member" buttons copy a demo account into the form
  document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      const account = DUMMY_ACCOUNTS.find(
        (entry) => entry.username === button.dataset.demo,
      );
      document.getElementById("username").value = account.username;
      passwordInput.value = account.password;
    });
  });
}

// The red glow on the login screen follows the mouse.
// We only change two CSS variables (--mx and --my); the CSS draws the glow.
function setupLoginSpotlight() {
  const screen = document.getElementById("loginScreen");
  if (!screen) return;

  screen.addEventListener("mousemove", (event) => {
    screen.style.setProperty("--mx", event.clientX + "px");
    screen.style.setProperty("--my", event.clientY + "px");
  });
}

function setupLogout() {
  const link = document.getElementById("logoutLink");
  if (!link) return;

  link.addEventListener("click", () => {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
  });
}

// ============================================================
// C. SMALL HELPERS
// ============================================================

// Highlights the sidebar link of the page you are on
function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("is-active");
    }
  });
}

// Dates are stored as "YYYY-MM-DD" text (the same format <input type="date">
// uses). We build it from the LOCAL date on purpose: toISOString() uses UTC
// and can shift the day by one in timezones like Manila (UTC+8).
function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

// "2026-09-29" -> a Date at local midnight (new Date("2026-09-29") would be UTC)
function parseDateKey(key) {
  const parts = key.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// "13:00" -> "1:00 PM"
function formatEventTime(time) {
  if (!time) return "All day";
  const parts = time.split(":");
  const hour = Number(parts[0]);
  return (hour % 12 || 12) + ":" + parts[1] + (hour >= 12 ? " PM" : " AM");
}

function formatEventDate(key) {
  return parseDateKey(key).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Makes user-typed text safe before we put it inside innerHTML,
// so a name like <b>hi</b> shows as text instead of breaking the page.
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "Sample Officer" -> "SO" (used for the round avatar)
function initials(name) {
  const words = name.trim().split(" ");
  let letters = words[0].charAt(0);
  if (words.length > 1) letters += words[1].charAt(0);
  return letters.toUpperCase();
}

// Small message that appears at the bottom-right for 2.5 seconds
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(toastTimer); // restart the timer if two toasts overlap
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

// Numbers on the dashboard count up from 0 to the real value
function animateCount(element, target) {
  if (!element) return;

  const duration = 700; // milliseconds
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1); // 0 to 1
    element.textContent = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(tick); // run again on the next frame
  }

  requestAnimationFrame(tick);
}

// Modals (pop-up boxes): open/close by adding/removing the class "is-open"
function openModal(id) {
  document.getElementById(id).classList.add("is-open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("is-open");
}

// A modal closes with the X button, a click on the dark background, or Escape
function setupModalClosing() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".modal-close")) {
        closeModal(overlay.id);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach((overlay) => {
        closeModal(overlay.id);
      });
    }
  });
}

// Fills the "View details" modal. `rows` is a list of [label, value] pairs.
function openViewModal(title, rows) {
  document.getElementById("viewModalTitle").textContent = title;
  document.getElementById("viewModalBody").innerHTML = rows
    .map(
      (row) =>
        `<li><span>${escapeHTML(row[0])}</span><span>${escapeHTML(row[1])}</span></li>`,
    )
    .join("");
  openModal("viewModal");
}

// ============================================================
// D. SEARCH, FILTER & SORT (shared by Inventory and Officers)
// ============================================================

// Every table row carries data-* attributes (data-search, data-status ...).
// Searching/filtering just hides the rows that do not match.
// Returns applyFilters() so the page can run it again after re-rendering.
function setupTableFilters(tbody) {
  const searchInput = document.getElementById("searchInput");
  const selects = document.querySelectorAll(".toolbar-filters select");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");

  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    const rows = tbody.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      // 1. does the row's text contain the search term?
      const matchesSearch = row.dataset.search.includes(term);

      // 2. does the row match every dropdown that has a value chosen?
      let matchesFilters = true;
      selects.forEach((select) => {
        if (
          select.value &&
          row.dataset[select.dataset.filter] !== select.value
        ) {
          matchesFilters = false;
        }
      });

      const show = matchesSearch && matchesFilters;
      row.hidden = !show;
      if (show) visibleCount++;
    });

    emptyState.hidden = visibleCount > 0;
    resultCount.textContent = "Showing " + visibleCount + " of " + rows.length;
  }

  searchInput.addEventListener("input", applyFilters);
  selects.forEach((select) => select.addEventListener("change", applyFilters));

  // Press "/" to jump to the search box (unless you are already typing)
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "SELECT";

    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  return applyFilters;
}

// Returns a sorted COPY of the list (the saved data keeps its order).
// `state` = { key: "name", dir: "asc" }
function sortList(list, state, getValue) {
  const copy = list.slice();
  if (!state.key) return copy;

  const direction = state.dir === "asc" ? 1 : -1;

  copy.sort((a, b) => {
    const first = getValue(a, state.key);
    const second = getValue(b, state.key);

    if (typeof first === "number") {
      return (first - second) * direction; // numbers: subtract
    }
    return String(first).localeCompare(String(second)) * direction; // text: alphabetical
  });

  return copy;
}

// Clicking a column header sorts by it; clicking again flips the direction.
function setupSorting(state, render) {
  const headers = document.querySelectorAll("thead th[data-sort]");

  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;

      if (state.key === key && state.dir === "asc") {
        state.dir = "desc";
      } else {
        state.dir = "asc";
      }
      state.key = key;

      // aria-sort is what the CSS uses to show the little arrow
      headers.forEach((other) => other.removeAttribute("aria-sort"));
      header.setAttribute(
        "aria-sort",
        state.dir === "asc" ? "ascending" : "descending",
      );

      render();
    });
  });
}

// ============================================================
// E. INVENTORY PAGE
// ============================================================
function inventorySortValue(item, key) {
  if (key === "category") return CATEGORY_LABELS[item.category];
  if (key === "status") return getInventoryStatus(item);
  return item[key]; // name or quantity
}

// Builds the HTML of one table row. `maxQty` = the biggest quantity in the
// list, used to decide how full the small stock bar looks.
function inventoryRowHTML(item, maxQty) {
  const status = getInventoryStatus(item);
  const isLow = status === "low";
  const statusLabel = isLow ? "Low stock" : "In stock";
  const categoryLabel = CATEGORY_LABELS[item.category];
  const searchText = (
    item.name +
    " " +
    categoryLabel +
    " " +
    item.quantity +
    " " +
    statusLabel
  ).toLowerCase();
  const fillPercent = Math.round((item.quantity / maxQty) * 100);

  return `
    <tr data-id="${item.id}"
        data-category="${item.category}"
        data-status="${status}"
        data-search="${escapeHTML(searchText)}">
      <td>${escapeHTML(item.name)}</td>
      <td>${categoryLabel}</td>
      <td>
        <div class="qty-cell">
          <b>${item.quantity}</b>
          <span class="meter ${isLow ? "is-low" : ""}"><i style="width:${fillPercent}%"></i></span>
        </div>
      </td>
      <td><span class="status-badge ${isLow ? "status-low" : "status-ok"}">${statusLabel}</span></td>
      <td>
        <a href="#" class="view-link">View</a>
        <a href="#" class="edit-link admin-only">Edit</a>
        <a href="#" class="delete-link admin-only">Delete</a>
      </td>
    </tr>`;
}

function setupInventoryPage() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;

  let items = loadData(KEYS.inventory, DEFAULT_INVENTORY);
  const sortState = { key: null, dir: "asc" };
  let applyFilters = () => {};

  // Draws the whole table from the `items` list
  function render() {
    const sorted = sortList(items, sortState, inventorySortValue);

    let maxQty = 1;
    items.forEach((item) => {
      if (item.quantity > maxQty) maxQty = item.quantity;
    });

    tbody.innerHTML = sorted
      .map((item) => inventoryRowHTML(item, maxQty))
      .join("");
    applyFilters(); // keep the current search/filter after every redraw
  }

  applyFilters = setupTableFilters(tbody);
  setupSorting(sortState, render);

  // ---- Add / Edit form: ONE form used for both ----
  // editingId is null when adding, or the item's id when editing.
  let editingId = null;
  const form = document.getElementById("addItemForm");
  const errorEl = document.getElementById("addItemError");

  function openItemForm(item) {
    editingId = item ? item.id : null;

    document.getElementById("addItemTitle").textContent = item
      ? "Edit inventory item"
      : "Add inventory item";
    document.getElementById("addItemSubmit").textContent = item
      ? "Save changes"
      : "Add item";

    // Fill the fields with the item's values (or clear them when adding)
    document.getElementById("itemName").value = item ? item.name : "";
    document.getElementById("itemCategory").value = item
      ? item.category
      : "merchandise";
    document.getElementById("itemQuantity").value = item ? item.quantity : "";

    errorEl.hidden = true;
    openModal("addItemModal");
    document.getElementById("itemName").focus();
  }

  // ONE click listener on the table handles every View / Edit / Delete link.
  // (Rows are re-created on every render, so we listen on the table body
  //  instead of on each link. This is called "event delegation".)
  tbody.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();

    const id = Number(link.closest("tr").dataset.id);
    const item = items.find((entry) => entry.id === id);

    if (link.classList.contains("view-link")) {
      openViewModal("Item details", [
        ["Item name", item.name],
        ["Category", CATEGORY_LABELS[item.category]],
        ["Quantity", item.quantity],
        [
          "Status",
          getInventoryStatus(item) === "low" ? "Low stock" : "In stock",
        ],
      ]);
      return;
    }

    if (!isAdmin()) return; // View is for everyone; Edit and Delete are admin-only

    if (link.classList.contains("edit-link")) {
      openItemForm(item);
    }

    if (link.classList.contains("delete-link")) {
      if (!window.confirm('Delete "' + item.name + '"?')) return;

      items = items.filter((entry) => entry.id !== id); // keep everything except this one
      saveData(KEYS.inventory, items);
      logActivity('Deleted item "' + item.name + '"', "delete");
      render();
      showToast("Item deleted.");
    }
  });

  document
    .getElementById("addItemBtn")
    .addEventListener("click", () => openItemForm(null));

  // Runs when the form is submitted (for both Add and Edit)
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const name = document.getElementById("itemName").value.trim();
    const category = document.getElementById("itemCategory").value;
    const quantityText = document.getElementById("itemQuantity").value;
    const quantity = Number(quantityText);

    // Validation: check for problems first
    let problem = "";
    if (name === "" || quantityText === "") {
      problem = "Item name and quantity are required.";
    } else if (!Number.isInteger(quantity) || quantity < 0) {
      problem = "Quantity must be a whole number, 0 or higher.";
    } else if (
      items.some(
        (entry) =>
          entry.id !== editingId &&
          entry.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      // (entry.id !== editingId lets you save an item without changing its name)
      problem = "An item with that name already exists.";
    }

    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }

    if (editingId === null) {
      // ADD
      items.push({
        id: nextId(items),
        name: name,
        category: category,
        quantity: quantity,
      });
      logActivity('Added item "' + name + '" (' + quantity + ")", "add");
      showToast("Item added successfully.");
    } else {
      // EDIT
      const item = items.find((entry) => entry.id === editingId);
      item.name = name;
      item.category = category;
      item.quantity = quantity;
      logActivity('Edited item "' + name + '"', "edit");
      showToast("Changes saved.");
    }

    saveData(KEYS.inventory, items);
    render();
    closeModal("addItemModal");
  });

  render();

  // The Dashboard's "+ Add item" button links here with ?add=1 in the address
  if (isAdmin() && window.location.search === "?add=1") {
    openItemForm(null);
  }
}

// ============================================================
// F. OFFICERS PAGE
// (Same structure as the Inventory page)
// ============================================================
function officerSortValue(officer, key) {
  if (key === "position") return POSITION_LABELS[officer.position];
  return officer[key]; // name, committee or status
}

function officerRowHTML(officer) {
  const isActive = officer.status === "active";
  const statusLabel = isActive ? "Active" : "Inactive";
  const positionLabel = POSITION_LABELS[officer.position];
  const searchText = (
    officer.name +
    " " +
    positionLabel +
    " " +
    officer.committee +
    " " +
    statusLabel
  ).toLowerCase();

  return `
    <tr data-id="${officer.id}"
        data-position="${officer.position}"
        data-status="${officer.status}"
        data-search="${escapeHTML(searchText)}">
      <td>
        <div class="person">
          <span class="user-avatar">${escapeHTML(initials(officer.name))}</span>
          ${escapeHTML(officer.name)}
        </div>
      </td>
      <td>${positionLabel}</td>
      <td>${escapeHTML(officer.committee)}</td>
      <td><span class="status-badge ${isActive ? "status-ok" : "status-low"}">${statusLabel}</span></td>
      <td>
        <a href="#" class="view-link">View</a>
        <a href="#" class="edit-link admin-only">Edit</a>
        <a href="#" class="toggle-link admin-only">${isActive ? "Deactivate" : "Activate"}</a>
        <a href="#" class="delete-link admin-only">Delete</a>
      </td>
    </tr>`;
}

function setupOfficersPage() {
  const tbody = document.getElementById("officerTableBody");
  if (!tbody) return;

  let officers = loadData(KEYS.officers, DEFAULT_OFFICERS);
  const sortState = { key: null, dir: "asc" };
  let applyFilters = () => {};

  function render() {
    const sorted = sortList(officers, sortState, officerSortValue);
    tbody.innerHTML = sorted.map(officerRowHTML).join("");
    applyFilters();
  }

  applyFilters = setupTableFilters(tbody);
  setupSorting(sortState, render);

  // ---- Add / Edit form: one form, two modes ----
  let editingId = null;
  const form = document.getElementById("addOfficerForm");
  const errorEl = document.getElementById("addOfficerError");

  function openOfficerForm(officer) {
    editingId = officer ? officer.id : null;

    document.getElementById("addOfficerTitle").textContent = officer
      ? "Edit officer"
      : "Add officer";
    document.getElementById("addOfficerSubmit").textContent = officer
      ? "Save changes"
      : "Add officer";

    document.getElementById("officerName").value = officer ? officer.name : "";
    document.getElementById("officerPosition").value = officer
      ? officer.position
      : "member";
    document.getElementById("officerCommittee").value = officer
      ? officer.committee
      : "";

    errorEl.hidden = true;
    openModal("addOfficerModal");
    document.getElementById("officerName").focus();
  }

  tbody.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();

    const id = Number(link.closest("tr").dataset.id);
    const officer = officers.find((entry) => entry.id === id);

    if (link.classList.contains("view-link")) {
      openViewModal("Officer details", [
        ["Name", officer.name],
        ["Position", POSITION_LABELS[officer.position]],
        ["Committee", officer.committee],
        ["Status", officer.status === "active" ? "Active" : "Inactive"],
      ]);
      return;
    }

    if (!isAdmin()) return;

    if (link.classList.contains("edit-link")) {
      openOfficerForm(officer);
    }

    if (link.classList.contains("toggle-link")) {
      officer.status = officer.status === "active" ? "inactive" : "active";
      saveData(KEYS.officers, officers);
      logActivity("Set " + officer.name + " to " + officer.status, "edit");
      render();
      showToast(officer.name + " is now " + officer.status + ".");
    }

    if (link.classList.contains("delete-link")) {
      if (!window.confirm('Delete "' + officer.name + '"?')) return;

      officers = officers.filter((entry) => entry.id !== id);
      saveData(KEYS.officers, officers);
      logActivity('Deleted officer "' + officer.name + '"', "delete");
      render();
      showToast("Officer deleted.");
    }
  });

  document
    .getElementById("addOfficerBtn")
    .addEventListener("click", () => openOfficerForm(null));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const name = document.getElementById("officerName").value.trim();
    const position = document.getElementById("officerPosition").value;
    const committee = document.getElementById("officerCommittee").value.trim();

    let problem = "";
    if (name === "" || committee === "") {
      problem = "Name and committee are required.";
    } else if (
      officers.some(
        (entry) =>
          entry.id !== editingId &&
          entry.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      problem = "An officer with that name already exists.";
    }

    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }

    if (editingId === null) {
      // ADD (new officers start as active)
      officers.push({
        id: nextId(officers),
        name: name,
        position: position,
        committee: committee,
        status: "active",
      });
      logActivity('Added officer "' + name + '"', "add");
      showToast("Officer added successfully.");
    } else {
      // EDIT
      const officer = officers.find((entry) => entry.id === editingId);
      officer.name = name;
      officer.position = position;
      officer.committee = committee;
      logActivity('Edited officer "' + name + '"', "edit");
      showToast("Changes saved.");
    }

    saveData(KEYS.officers, officers);
    render();
    closeModal("addOfficerModal");
  });

  render();

  if (isAdmin() && window.location.search === "?add=1") {
    openOfficerForm(null);
  }
}

// ============================================================
// G. DASHBOARD
// ============================================================
function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderActivity() {
  const listEl = document.getElementById("activityList");
  const emptyEl = document.getElementById("activityEmpty");
  const entries = loadData(KEYS.activity, []);

  listEl.innerHTML = entries
    .map(
      (entry) => `
      <li>
        <span class="activity-dot is-${entry.type}"></span>
        <span class="msg">${escapeHTML(entry.message)}</span>
        <time>${formatTime(entry.time)}</time>
      </li>`,
    )
    .join("");

  emptyEl.hidden = entries.length > 0; // show the "no activity" text only when empty
}

// Draws a list of horizontal bars. `rows` = [{ label, value, className }].
// The CSS gives every bar width 0. A moment later we set the real width,
// and the CSS "transition" makes the bar grow smoothly.
function renderBars(listEl, rows, emptyText) {
  if (rows.length === 0) {
    listEl.innerHTML = "<li><small>" + emptyText + "</small></li>";
    return;
  }

  let max = 1;
  rows.forEach((row) => {
    if (row.value > max) max = row.value;
  });

  listEl.innerHTML = rows
    .map(
      (row) => `
      <li>
        <div class="bar-label"><span>${escapeHTML(row.label)}</span><span>${row.value}</span></div>
        <div class="bar-track"><i class="${row.className || ""}" data-width="${Math.round((row.value / max) * 100)}"></i></div>
      </li>`,
    )
    .join("");

  setTimeout(() => {
    listEl.querySelectorAll("i").forEach((bar) => {
      bar.style.width = bar.dataset.width + "%";
    });
  }, 60);
}

// Dashboard widget: items at or below the low-stock limit, emptiest first
function renderLowStock(items) {
  const listEl = document.getElementById("lowStockList");
  if (!listEl) return;

  const low = items
    .filter((item) => getInventoryStatus(item) === "low")
    .sort((a, b) => a.quantity - b.quantity);

  document.getElementById("lowStockEmpty").hidden = low.length > 0;

  listEl.innerHTML = low
    .map((item) => {
      const isOut = item.quantity === 0;
      const percent = Math.round((item.quantity / LOW_STOCK_LIMIT) * 100);
      return `
      <li>
        <div class="low-info">
          <strong>${escapeHTML(item.name)}</strong>
          <small>${escapeHTML(CATEGORY_LABELS[item.category] || item.category)}</small>
        </div>
        <span class="meter is-low"><i style="width:${percent}%"></i></span>
        <span class="status-badge status-low">${isOut ? "Out of stock" : item.quantity + " left"}</span>
      </li>`;
    })
    .join("");
}

function setupDashboard() {
  const totalEl = document.getElementById("statTotalItems");
  if (!totalEl) return;

  const items = loadData(KEYS.inventory, DEFAULT_INVENTORY);
  const officers = loadData(KEYS.officers, DEFAULT_OFFICERS);

  // Greeting with today's date
  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  document.getElementById("dashGreeting").textContent =
    "Welcome back, " +
    sessionStorage.getItem("userName") +
    ". Today is " +
    today +
    ".";

  // ---- The four number cards ----
  let totalUnits = 0;
  items.forEach((item) => {
    totalUnits += item.quantity;
  });

  const lowStockCount = items.filter(
    (item) => getInventoryStatus(item) === "low",
  ).length;
  const activeCount = officers.filter(
    (officer) => officer.status === "active",
  ).length;

  animateCount(totalEl, items.length);
  animateCount(document.getElementById("statTotalUnits"), totalUnits);
  animateCount(document.getElementById("statLowStock"), lowStockCount);
  animateCount(document.getElementById("statActiveOfficers"), activeCount);

  // ---- Stock level bars (biggest first, red when low) ----
  const sortedItems = items.slice().sort((a, b) => b.quantity - a.quantity);
  renderBars(
    document.getElementById("stockBars"),
    sortedItems.map((item) => ({
      label: item.name,
      value: item.quantity,
      className: getInventoryStatus(item) === "low" ? "is-low" : "is-ok",
    })),
    "No inventory items yet.",
  );

  // ---- Officers per committee: count how many officers share a committee ----
  const counts = {}; // example: { Events: 2, Logistics: 2 }
  officers.forEach((officer) => {
    const committee = officer.committee;
    counts[committee] = (counts[committee] || 0) + 1; // start at 0 if new, then add 1
  });

  const committeeRows = Object.keys(counts)
    .map((committee) => ({ label: committee, value: counts[committee] }))
    .sort((a, b) => b.value - a.value);

  renderBars(
    document.getElementById("committeeBars"),
    committeeRows,
    "No officers yet.",
  );

  renderActivity();
  renderUpcomingEvents();
  renderLowStock(items);

  // Admin-only button to restore the sample data before a demo
  document.getElementById("resetDataBtn").addEventListener("click", () => {
    if (!isAdmin()) return;
    if (
      !window.confirm(
        "Reset inventory, officers, events and activity to the sample data?",
      )
    )
      return;

    localStorage.removeItem(KEYS.inventory);
    localStorage.removeItem(KEYS.officers);
    localStorage.removeItem(KEYS.activity);
    localStorage.removeItem(KEYS.events);
    window.location.reload();
  });
}

// ============================================================
// I. EVENTS + CALENDAR
// Events page: a month calendar and a list of the events in that month.
// Clicking a day filters the list to that day (admins can add there).
// The Dashboard shows the next few upcoming events.
// ============================================================
function sortEventsByDate(list) {
  return list.slice().sort((a, b) => {
    const first = a.date + " " + (a.time || "");
    const second = b.date + " " + (b.time || "");
    return first.localeCompare(second);
  });
}

function eventCardHTML(event, todayKey) {
  const day = parseDateKey(event.date);
  const isPast = event.date < todayKey;
  const typeLabel = EVENT_TYPE_LABELS[event.type] || event.type;

  return `
    <li class="event-item ${isPast ? "is-past" : ""}" data-id="${event.id}">
      <div class="event-date">
        <b>${day.getDate()}</b>
        <span>${day.toLocaleDateString([], { month: "short" })}</span>
      </div>
      <div class="event-info">
        <strong>${escapeHTML(event.title)}</strong>
        <small>${escapeHTML(formatEventTime(event.time))} · ${escapeHTML(event.location)}</small>
        <span class="event-tag type-${escapeHTML(event.type)}">${escapeHTML(typeLabel)}</span>
      </div>
      <div class="event-actions">
        <a href="#" class="view-link">View</a>
        <a href="#" class="edit-link admin-only">Edit</a>
        <a href="#" class="delete-link admin-only">Delete</a>
      </div>
    </li>`;
}

function setupEventsPage() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  let events = loadData(KEYS.events, DEFAULT_EVENTS);
  const todayKey = toDateKey(new Date());
  const view = new Date(); // the month being shown
  view.setDate(1);
  let selectedKey = null; // clicked day, or null = whole month

  const monthLabel = document.getElementById("calMonth");
  const listEl = document.getElementById("eventList");
  const emptyEl = document.getElementById("eventsEmpty");
  const listTitle = document.getElementById("eventListTitle");
  const clearBtn = document.getElementById("clearDayBtn");

  // ---- Calendar grid ----
  function renderCalendar() {
    monthLabel.textContent = view.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });

    // Group events by day so each cell can look up its own quickly
    const byDay = {};
    events.forEach((event) => {
      (byDay[event.date] = byDay[event.date] || []).push(event);
    });

    const year = view.getFullYear();
    const month = view.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = "";
    for (let i = 0; i < firstWeekday; i++) {
      html += '<div class="cal-cell is-empty" aria-hidden="true"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(new Date(year, month, day));
      const dayEvents = byDay[key] || [];
      const classes = ["cal-cell"];
      if (key === todayKey) classes.push("is-today");
      if (key === selectedKey) classes.push("is-selected");

      // Up to 3 colored dots (one per event, colored by type)
      const dots = dayEvents
        .slice(0, 3)
        .map((e) => `<i class="dot type-${escapeHTML(e.type)}"></i>`)
        .join("");
      const more = dayEvents.length > 3 ? `<em>+${dayEvents.length - 3}</em>` : "";
      const label =
        key + (dayEvents.length ? ", " + dayEvents.length + " event(s)" : "");

      html += `
        <button type="button" class="${classes.join(" ")}" data-date="${key}" aria-label="${label}">
          <span class="cal-day">${day}</span>
          <span class="cal-dots">${dots}${more}</span>
        </button>`;
    }
    grid.innerHTML = html;
  }

  // ---- Event list (the selected day, or the whole visible month) ----
  function renderList() {
    const year = view.getFullYear();
    const month = view.getMonth();

    let shown = events.filter((event) => {
      if (selectedKey) return event.date === selectedKey;
      const d = parseDateKey(event.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    shown = sortEventsByDate(shown);

    listTitle.textContent = selectedKey
      ? "Events on " + formatEventDate(selectedKey)
      : "Events this month";
    clearBtn.hidden = !selectedKey;

    listEl.innerHTML = shown.map((e) => eventCardHTML(e, todayKey)).join("");
    emptyEl.hidden = shown.length > 0;
  }

  function render() {
    renderCalendar();
    renderList();
  }

  // ---- Month navigation ----
  function goToMonth(offset) {
    view.setMonth(view.getMonth() + offset);
    selectedKey = null; // a selected day from another month makes no sense
    render();
  }
  document.getElementById("calPrev").addEventListener("click", () => goToMonth(-1));
  document.getElementById("calNext").addEventListener("click", () => goToMonth(1));
  document.getElementById("calToday").addEventListener("click", () => {
    const now = new Date();
    view.setFullYear(now.getFullYear(), now.getMonth(), 1);
    selectedKey = null;
    render();
  });
  clearBtn.addEventListener("click", () => {
    selectedKey = null;
    render();
  });

  // Click a day: filter the list to it (click again to clear)
  grid.addEventListener("click", (event) => {
    const cell = event.target.closest(".cal-cell[data-date]");
    if (!cell) return;
    selectedKey = selectedKey === cell.dataset.date ? null : cell.dataset.date;
    render();
  });

  // ---- Add / Edit form: one form, two modes (same pattern as Inventory) ----
  let editingId = null;
  const form = document.getElementById("eventForm");
  const errorEl = document.getElementById("eventError");

  function openEventForm(event) {
    editingId = event ? event.id : null;

    document.getElementById("eventFormTitle").textContent = event
      ? "Edit event"
      : "Add event";
    document.getElementById("eventSubmit").textContent = event
      ? "Save changes"
      : "Add event";

    // New events default to the selected day, otherwise today
    document.getElementById("eventTitle").value = event ? event.title : "";
    document.getElementById("eventDate").value = event
      ? event.date
      : selectedKey || todayKey;
    document.getElementById("eventTime").value = event ? event.time : "";
    document.getElementById("eventType").value = event ? event.type : "meeting";
    document.getElementById("eventLocation").value = event ? event.location : "";
    document.getElementById("eventDescription").value = event
      ? event.description
      : "";

    errorEl.hidden = true;
    openModal("eventModal");
    document.getElementById("eventTitle").focus();
  }

  document
    .getElementById("addEventBtn")
    .addEventListener("click", () => openEventForm(null));

  form.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();

    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const type = document.getElementById("eventType").value;
    const location = document.getElementById("eventLocation").value.trim();
    const description = document.getElementById("eventDescription").value.trim();

    if (title === "" || date === "" || location === "") {
      errorEl.textContent = "Title, date and location are required.";
      errorEl.hidden = false;
      return;
    }

    // Same title on the same day is almost certainly a mistake
    const duplicate = events.some(
      (entry) =>
        entry.id !== editingId &&
        entry.date === date &&
        entry.title.toLowerCase() === title.toLowerCase(),
    );
    if (duplicate) {
      errorEl.textContent = "An event with this title already exists on that day.";
      errorEl.hidden = false;
      return;
    }

    const data = { title, date, time, type, location, description };

    if (editingId === null) {
      events.push({ id: nextId(events), ...data });
      logActivity('Added event "' + title + '"', "add");
      showToast("Event added.");
    } else {
      const existing = events.find((entry) => entry.id === editingId);
      Object.assign(existing, data);
      logActivity('Edited event "' + title + '"', "edit");
      showToast("Changes saved.");
    }
    saveData(KEYS.events, events);

    // Jump the calendar to the month of the saved event so it's visible
    const saved = parseDateKey(date);
    view.setFullYear(saved.getFullYear(), saved.getMonth(), 1);
    if (selectedKey) selectedKey = date;

    closeModal("eventModal");
    render();
  });

  // ---- View / Edit / Delete (event delegation on the list) ----
  listEl.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();

    const id = Number(link.closest(".event-item").dataset.id);
    const item = events.find((entry) => entry.id === id);
    if (!item) return;

    if (link.classList.contains("view-link")) {
      openViewModal(item.title, [
        ["Date", formatEventDate(item.date)],
        ["Time", formatEventTime(item.time)],
        ["Location", item.location],
        ["Type", EVENT_TYPE_LABELS[item.type] || item.type],
        ["Details", item.description || "—"],
      ]);
      return;
    }

    if (!isAdmin()) return; // View is for everyone; Edit and Delete are admin-only

    if (link.classList.contains("edit-link")) {
      openEventForm(item);
    }

    if (link.classList.contains("delete-link")) {
      if (!window.confirm('Delete "' + item.title + '"?')) return;
      events = events.filter((entry) => entry.id !== id);
      saveData(KEYS.events, events);
      logActivity('Deleted event "' + item.title + '"', "delete");
      render();
      showToast("Event deleted.");
    }
  });

  render();

  // Dashboard shortcut: events.html?add=1 opens the form straight away
  if (isAdmin() && window.location.search === "?add=1") {
    openEventForm(null);
  }
}

// Dashboard widget: the next 4 events from today onward
function renderUpcomingEvents() {
  const listEl = document.getElementById("upcomingEvents");
  if (!listEl) return;

  const todayKey = toDateKey(new Date());
  const events = loadData(KEYS.events, DEFAULT_EVENTS);
  const upcoming = sortEventsByDate(
    events.filter((event) => event.date >= todayKey),
  ).slice(0, 4);

  document.getElementById("upcomingEmpty").hidden = upcoming.length > 0;
  listEl.innerHTML = upcoming.map((e) => eventCardHTML(e, todayKey)).join("");

  // The dashboard list is read-only: hide the per-row action links
  listEl.querySelectorAll(".event-actions").forEach((el) => el.remove());
}

// ============================================================
// J. BACKUP & RESTORE (JSON)
// Everything lives in this browser's localStorage, so clearing site data
// wipes it. "Download backup" saves a .json file; "Restore" loads one back.
// A restore REPLACES the current data, so we validate the file first and
// ask for confirmation.
// ============================================================
const BACKUP_APP_ID = "itpc-erp";
const BACKUP_MAX_BYTES = 2 * 1024 * 1024; // 2 MB is far more than this app ever stores

function downloadFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildBackup() {
  return {
    app: BACKUP_APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      inventory: loadData(KEYS.inventory, DEFAULT_INVENTORY),
      officers: loadData(KEYS.officers, DEFAULT_OFFICERS),
      events: loadData(KEYS.events, DEFAULT_EVENTS),
      activity: loadData(KEYS.activity, []),
    },
  };
}

const isText = (value) => typeof value === "string";
const isCount = (value) => Number.isInteger(value) && value >= 0;

// Returns an error message (string) when the list is invalid, or null when OK.
// `check(entry)` returns true for a valid entry.
function checkList(list, label, check, needsUniqueIds) {
  if (!Array.isArray(list)) return label + " must be a list.";
  if (list.length > 5000) return label + " has too many entries.";

  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    if (!entry || typeof entry !== "object" || !check(entry)) {
      return label + " entry #" + (i + 1) + " is missing data or has a bad value.";
    }
    if (needsUniqueIds) {
      if (!isCount(entry.id) || seen.has(entry.id)) {
        return label + " entry #" + (i + 1) + " has a missing or duplicate id.";
      }
      seen.add(entry.id);
    }
  }
  return null;
}

// Checks a parsed backup file. Returns { error } or { data }.
function validateBackup(backup) {
  if (!backup || backup.app !== BACKUP_APP_ID || typeof backup.data !== "object" || !backup.data) {
    return { error: "This isn't an ITPC ERP backup file." };
  }
  const data = backup.data;

  // Inventory and officers are required; events and activity are optional
  // so older backups (made before Events existed) still restore.
  if (!data.inventory || !data.officers) {
    return { error: "The backup is missing inventory or officers." };
  }

  const problems = [
    checkList(
      data.inventory,
      "Inventory",
      (e) => isText(e.name) && e.name.trim() !== "" && e.category in CATEGORY_LABELS && isCount(e.quantity),
      true,
    ),
    checkList(
      data.officers,
      "Officers",
      (e) =>
        isText(e.name) && e.name.trim() !== "" && e.position in POSITION_LABELS &&
        isText(e.committee) && (e.status === "active" || e.status === "inactive"),
      true,
    ),
    data.events === undefined
      ? null
      : checkList(
          data.events,
          "Events",
          (e) =>
            isText(e.title) && e.title.trim() !== "" &&
            /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
            (e.time === "" || /^\d{2}:\d{2}$/.test(e.time)) &&
            e.type in EVENT_TYPE_LABELS && isText(e.location) && isText(e.description),
          true,
        ),
    data.activity === undefined
      ? null
      : checkList(data.activity, "Activity", (e) => isText(e.message) && isText(e.time), false),
  ].find((message) => message !== null);

  return problems ? { error: problems } : { data: data };
}

function setupBackupPanel() {
  const backupBtn = document.getElementById("backupBtn");
  if (!backupBtn) return;

  const restoreBtn = document.getElementById("restoreBtn");
  const fileInput = document.getElementById("restoreFile");
  const statusEl = document.getElementById("backupStatus");
  const lastEl = document.getElementById("lastBackup");

  function showStatus(message) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
  }

  function showLastBackup() {
    const saved = localStorage.getItem(KEYS.lastBackup);
    lastEl.textContent = saved
      ? "Last backup: " + formatTime(saved) + "."
      : "You haven't downloaded a backup yet.";
  }

  // Shown after a restore, because the page reloads to redraw everything
  const flash = sessionStorage.getItem("itpc_flash");
  if (flash) {
    sessionStorage.removeItem("itpc_flash");
    showToast(flash);
  }
  showLastBackup();

  backupBtn.addEventListener("click", () => {
    if (!isAdmin()) return;
    const backup = buildBackup();
    downloadFile(
      "itpc-erp-backup-" + toDateKey(new Date()) + ".json",
      JSON.stringify(backup, null, 2),
      "application/json",
    );
    localStorage.setItem(KEYS.lastBackup, backup.exportedAt);
    showLastBackup();
    showStatus("");
    showToast("Backup downloaded.");
  });

  restoreBtn.addEventListener("click", () => {
    if (isAdmin()) fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileInput.value = ""; // so choosing the same file again still fires "change"
    if (!file || !isAdmin()) return;
    showStatus("");

    if (file.size > BACKUP_MAX_BYTES) {
      showStatus("That file is too large to be an ITPC ERP backup.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showStatus("Couldn't read that file.");
    reader.onload = () => {
      let backup;
      try {
        backup = JSON.parse(reader.result);
      } catch (error) {
        showStatus("That file isn't valid JSON.");
        return;
      }

      const result = validateBackup(backup);
      if (result.error) {
        showStatus("Restore cancelled. " + result.error);
        return;
      }

      const data = result.data;
      const counts =
        data.inventory.length + " items, " + data.officers.length + " officers" +
        (data.events ? ", " + data.events.length + " events" : "");
      const when = backup.exportedAt ? " from " + formatTime(backup.exportedAt) : "";
      if (
        !window.confirm(
          "Restore " + counts + when + "?\n\nThis replaces your current data.",
        )
      ) {
        return;
      }

      saveData(KEYS.inventory, data.inventory);
      saveData(KEYS.officers, data.officers);
      if (data.events) saveData(KEYS.events, data.events);
      if (data.activity) saveData(KEYS.activity, data.activity.slice(0, 10));

      sessionStorage.setItem("itpc_flash", "Backup restored.");
      window.location.reload();
    };
    reader.readAsText(file);
  });
}

// ============================================================
// K. PRINTABLE REPORT (report.html)
// A clean, light-themed summary of everything. "Print / Save as PDF"
// uses the browser's print dialog; the toolbar is hidden by print CSS.
// ============================================================
function reportTable(headers, rows, emptyText) {
  if (rows.length === 0) return '<p class="report-empty">' + escapeHTML(emptyText) + "</p>";

  const head = headers.map((h) => "<th>" + escapeHTML(h) + "</th>").join("");
  const body = rows
    .map((cells) => "<tr>" + cells.map((c) => "<td>" + c + "</td>").join("") + "</tr>")
    .join("");
  return "<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
}

function setupReportPage() {
  const root = document.getElementById("report");
  if (!root) return;

  const items = loadData(KEYS.inventory, DEFAULT_INVENTORY);
  const officers = loadData(KEYS.officers, DEFAULT_OFFICERS);
  const events = loadData(KEYS.events, DEFAULT_EVENTS);
  const todayKey = toDateKey(new Date());

  const lowItems = items
    .filter((item) => getInventoryStatus(item) === "low")
    .sort((a, b) => a.quantity - b.quantity);
  const upcoming = sortEventsByDate(events.filter((e) => e.date >= todayKey));
  const activeCount = officers.filter((o) => o.status === "active").length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  document.getElementById("reportMeta").textContent =
    "Generated " +
    new Date().toLocaleString([], { dateStyle: "long", timeStyle: "short" }) +
    " by " + (sessionStorage.getItem("userName") || "Guest");

  const stats = [
    ["Inventory items", items.length],
    ["Total units", totalUnits],
    ["Low stock", lowItems.length],
    ["Active officers", activeCount + " / " + officers.length],
    ["Upcoming events", upcoming.length],
  ];
  document.getElementById("reportStats").innerHTML = stats
    .map((s) => "<div><b>" + escapeHTML(s[1]) + "</b><span>" + escapeHTML(s[0]) + "</span></div>")
    .join("");

  const stockLabel = (item) => (item.quantity === 0 ? "Out of stock" : getInventoryStatus(item) === "low" ? "Low stock" : "In stock");
  const stockCell = (item) =>
    getInventoryStatus(item) === "low"
      ? '<strong class="r-low">' + stockLabel(item) + "</strong>"
      : stockLabel(item);

  document.getElementById("reportLow").innerHTML = reportTable(
    ["Item", "Category", "Quantity"],
    lowItems.map((item) => [escapeHTML(item.name), escapeHTML(CATEGORY_LABELS[item.category]), String(item.quantity)]),
    "No items are at or below the low-stock limit (" + LOW_STOCK_LIMIT + ").",
  );

  document.getElementById("reportInventory").innerHTML = reportTable(
    ["Item", "Category", "Quantity", "Status"],
    items
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => [escapeHTML(item.name), escapeHTML(CATEGORY_LABELS[item.category]), String(item.quantity), stockCell(item)]),
    "No inventory items.",
  );

  document.getElementById("reportOfficers").innerHTML = reportTable(
    ["Name", "Position", "Committee", "Status"],
    officers
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((o) => [
        escapeHTML(o.name),
        escapeHTML(POSITION_LABELS[o.position]),
        escapeHTML(o.committee),
        o.status === "active" ? "Active" : "Inactive",
      ]),
    "No officers.",
  );

  document.getElementById("reportEvents").innerHTML = reportTable(
    ["Date", "Time", "Event", "Location", "Type"],
    upcoming.map((e) => [
      escapeHTML(formatEventDate(e.date)),
      escapeHTML(formatEventTime(e.time)),
      escapeHTML(e.title),
      escapeHTML(e.location),
      escapeHTML(EVENT_TYPE_LABELS[e.type]),
    ]),
    "No upcoming events.",
  );

  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

// ============================================================
// H. THEME (light / dark)
// The saved choice is applied by a tiny script in each page's <head>
// (so there's no flash). This only handles the toggle button.
// ============================================================
function setupThemeToggle() {
  const button = document.getElementById("themeToggle");
  if (!button) return;

  const root = document.documentElement;
  const isLight = () => root.getAttribute("data-theme") === "light";

  button.setAttribute("aria-pressed", isLight());

  button.addEventListener("click", () => {
    const next = isLight() ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("itpc_theme", next);
    button.setAttribute("aria-pressed", isLight());
  });
}

// ============================================================
// START — runs once the page's HTML has loaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  applyRole();
  showUserInSidebar();
  highlightActiveNav();
  setupThemeToggle();
  setupLoginForm();
  setupLoginSpotlight();
  setupLogout();
  setupModalClosing();
  setupInventoryPage();
  setupOfficersPage();
  setupEventsPage();
  setupDashboard();
  setupBackupPanel();
  setupReportPage();
});
