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

  // Admin-only button to restore the sample data before a demo
  document.getElementById("resetDataBtn").addEventListener("click", () => {
    if (!isAdmin()) return;
    if (
      !window.confirm(
        "Reset inventory, officers and activity to the sample data?",
      )
    )
      return;

    localStorage.removeItem(KEYS.inventory);
    localStorage.removeItem(KEYS.officers);
    localStorage.removeItem(KEYS.activity);
    window.location.reload();
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
  setupLoginForm();
  setupLoginSpotlight();
  setupLogout();
  setupModalClosing();
  setupInventoryPage();
  setupOfficersPage();
  setupDashboard();
});
