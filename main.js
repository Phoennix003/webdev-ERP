// ============================================================
// ITPC ERP main.js
// One file shared by all 4 pages. Every setup function checks that
// the elements it needs exist, so it simply does nothing elsewhere.
//
// SECTIONS
//   A. Data layer (localStorage)   D. Table helpers (filter, sort, modals)
//   B. Login, logout & roles       E. Inventory page
//   C. Small UI helpers            F. Officers page
//                                  G. Dashboard (live stats + activity)
// ============================================================

// ============================================================
// A. DATA LAYER
// Inventory, officers and the activity log are saved in localStorage
// so they survive page changes. That's what lets the Dashboard show
// real numbers instead of hardcoded ones.
// ============================================================
const KEYS = {
  inventory: "csitpc_inventory",
  officers: "csitpc_officers",
  activity: "csitpc_activity",
};

const LOW_STOCK_LIMIT = 5; // quantity at or below this = "Low Stock"

const DEFAULT_INVENTORY = [
  {
    id: 1,
    name: "CSITPC Org T-Shirts (S-XL)",
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
    name: "Certificate Holders",
    category: "office-supplies",
    quantity: 15,
  },
];

const DEFAULT_OFFICERS = [
  {
    id: 1,
    name: "Sample Officer A",
    position: "committee-head",
    committee: "Events",
    status: "active",
  },
  {
    id: 2,
    name: "Sample Officer B",
    position: "member",
    committee: "Logistics",
    status: "inactive",
  },
];

const CATEGORY_LABELS = {
  merchandise: "Merchandise",
  "event-materials": "Event Materials",
  "office-supplies": "Office Supplies",
};

const POSITION_LABELS = {
  president: "President",
  "committee-head": "Committee Head",
  member: "Member",
};

function loadData(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    // Storage blocked or data corrupted — fall back to defaults below.
  }
  const copy = JSON.parse(JSON.stringify(defaults));
  saveData(key, copy);
  return copy;
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Ignore: the page still works for this visit, it just won't persist.
  }
}

function nextId(list) {
  return list.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
}

function getInventoryStatus(item) {
  return item.quantity <= LOW_STOCK_LIMIT ? "low" : "in-stock";
}

function logActivity(message) {
  const entries = loadData(KEYS.activity, []);
  entries.unshift({ message: message, time: new Date().toISOString() });
  saveData(KEYS.activity, entries.slice(0, 8)); // keep only the latest 8
}

// ============================================================
// B. LOGIN, LOGOUT & ROLES
// NOTE: front-end only. This shows how role-based access BEHAVES;
// it is not real security (anyone can read these credentials here).
// ============================================================
const DUMMY_ACCOUNTS = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "member", password: "member123", role: "member" },
];

function getRole() {
  try {
    return sessionStorage.getItem("userRole") || "member";
  } catch (error) {
    return "member";
  }
}

function isAdmin() {
  return getRole() === "admin";
}

// Adds class "is-admin" to <body>; the CSS then reveals every
// .admin-only element (including rows created later by JS).
function applyRole() {
  if (isAdmin()) document.body.classList.add("is-admin");
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorEl = document.getElementById("loginError");

    const account = DUMMY_ACCOUNTS.find(
      (entry) => entry.username === username && entry.password === password,
    );

    if (!account) {
      errorEl.textContent = "Invalid username or password.";
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    try {
      sessionStorage.setItem("userRole", account.role);
    } catch (error) {
      // If storage is blocked the user just stays in the member view.
    }
    window.location.href = "dashboard.html";
  });
}

function setupLogout() {
  const link = document.getElementById("logoutLink");
  if (!link) return;

  link.addEventListener("click", () => {
    try {
      sessionStorage.removeItem("userRole");
    } catch (error) {
      // nothing to clear
    }
  });
}

// ============================================================
// C. SMALL UI HELPERS
// ============================================================

// FEATURE 1: Active nav highlighting
function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
}

// Escape user-typed text before putting it into innerHTML, so a name
// like <b>hi</b> shows as text instead of breaking the page.
function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

// FEATURE 6 (part): toast messages
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(toastTimer); // restart the timer if toasts overlap
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

// Animated counters for the dashboard stat cards
function animateCount(element, target) {
  if (!element) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion || target === 0) {
    element.textContent = target;
    return;
  }

  const duration = 700;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // fast start, gentle finish
    element.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ============================================================
// D. TABLE HELPERS (shared by Inventory and Officers pages)
// ============================================================

// FEATURE 3 (part): modals. Close with the X, a click on the dark
// backdrop, or the Escape key.
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("is-open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("is-open");
}

function setupModalClosing() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".modal-close")) {
        overlay.classList.remove("is-open");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach((overlay) => {
        overlay.classList.remove("is-open");
      });
    }
  });
}

// Fills the shared "view details" modal. `rows` is a list of [label, value].
function openViewModal(title, rows) {
  document.getElementById("viewModalTitle").textContent = title;
  document.getElementById("viewModalBody").innerHTML = rows
    .map(
      ([label, value]) =>
        `<li><strong>${escapeHTML(label)}:</strong> ${escapeHTML(value)}</li>`,
    )
    .join("");
  openModal("viewModal");
}

// FEATURE 2: search + filters. Returns applyFilters() so the page can
// re-run it every time the table is re-rendered. Also toggles the
// "No results" empty state.
function setupTableFilters(tbody) {
  const searchInput = document.getElementById("searchInput");
  const selects = document.querySelectorAll(".toolbar-filters select");
  const emptyState = document.getElementById("emptyState");

  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    tbody.querySelectorAll("tr").forEach((row) => {
      const matchesSearch = row.dataset.search.includes(term);
      const matchesFilters = Array.from(selects).every(
        (select) =>
          !select.value || row.dataset[select.dataset.filter] === select.value,
      );
      const show = matchesSearch && matchesFilters;

      row.hidden = !show;
      if (show) visibleCount++;
    });

    emptyState.hidden = visibleCount > 0;
  }

  searchInput.addEventListener("input", applyFilters);
  selects.forEach((select) => select.addEventListener("change", applyFilters));

  return applyFilters;
}

// Sorting: returns a sorted COPY of the list (the saved data keeps its order).
function sortList(list, state, getValue) {
  if (!state.key) return list.slice();

  const direction = state.dir === "asc" ? 1 : -1;

  return list.slice().sort((a, b) => {
    const first = getValue(a, state.key);
    const second = getValue(b, state.key);

    if (typeof first === "number" && typeof second === "number") {
      return (first - second) * direction;
    }
    return (
      String(first).localeCompare(String(second), undefined, {
        sensitivity: "base",
      }) * direction
    );
  });
}

// Clicking a header cycles that column between ascending and descending.
function setupSorting(state, render) {
  const headers = document.querySelectorAll("thead th[data-sort]");

  function sortBy(header) {
    const key = header.dataset.sort;
    state.dir = state.key === key && state.dir === "asc" ? "desc" : "asc";
    state.key = key;

    headers.forEach((other) => other.removeAttribute("aria-sort"));
    header.setAttribute(
      "aria-sort",
      state.dir === "asc" ? "ascending" : "descending",
    );
    render();
  }

  headers.forEach((header) => {
    header.tabIndex = 0; // reachable with the keyboard
    header.addEventListener("click", () => sortBy(header));
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        sortBy(header);
      }
    });
  });
}

// ============================================================
// E. INVENTORY PAGE
// ============================================================
function inventorySortValue(item, key) {
  if (key === "category")
    return CATEGORY_LABELS[item.category] || item.category;
  if (key === "status") return getInventoryStatus(item);
  return item[key];
}

function inventoryRowHTML(item) {
  const status = getInventoryStatus(item);
  const statusLabel = status === "low" ? "Low Stock" : "In Stock";
  const statusClass = status === "low" ? "status-low" : "status-ok";
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
  const searchText =
    `${item.name} ${categoryLabel} ${item.quantity} ${statusLabel}`.toLowerCase();

  return `
    <tr data-id="${item.id}"
        data-category="${escapeHTML(item.category)}"
        data-status="${status}"
        data-search="${escapeHTML(searchText)}">
      <td>${escapeHTML(item.name)}</td>
      <td>${escapeHTML(categoryLabel)}</td>
      <td>${item.quantity}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td>
        <a href="#" class="view-link">View</a>
        <a href="#" class="edit-link admin-only">Update qty</a>
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

  function render() {
    const sorted = sortList(items, sortState, inventorySortValue);
    tbody.innerHTML = sorted.map(inventoryRowHTML).join("");
    applyFilters(); // keep the current search/filter after every re-render
  }

  applyFilters = setupTableFilters(tbody);
  setupSorting(sortState, render);

  // FEATURE 3 + 6 + extras: one click listener on the table body handles
  // every View / Update qty / Delete link, including rows added later.
  tbody.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();

    const id = Number(link.closest("tr").dataset.id);
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    if (link.classList.contains("view-link")) {
      const status =
        getInventoryStatus(item) === "low" ? "Low Stock" : "In Stock";
      openViewModal("Item details", [
        ["Item name", item.name],
        ["Category", CATEGORY_LABELS[item.category] || item.category],
        ["Quantity", item.quantity],
        ["Status", status],
      ]);
      return;
    }

    if (!isAdmin()) return; // View is open to everyone; the rest is admin-only

    if (link.classList.contains("edit-link")) {
      const answer = window.prompt(
        `New quantity for "${item.name}":`,
        item.quantity,
      );
      if (answer === null) return; // cancelled

      const quantity = Number(answer.trim());
      if (answer.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
        showToast("Enter a whole number, 0 or higher.");
        return;
      }

      item.quantity = quantity;
      saveData(KEYS.inventory, items);
      logActivity(`Updated "${item.name}" quantity to ${quantity}`);
      render();
      showToast("Quantity updated.");
    }

    if (link.classList.contains("delete-link")) {
      if (!window.confirm(`Delete "${item.name}"?`)) return;

      items = items.filter((entry) => entry.id !== id);
      saveData(KEYS.inventory, items);
      logActivity(`Deleted item "${item.name}"`);
      render();
      showToast("Item deleted.");
    }
  });

  // FEATURE 4: add item with validation
  const addBtn = document.getElementById("addItemBtn");
  const form = document.getElementById("addItemForm");
  const errorEl = document.getElementById("addItemError");

  addBtn.addEventListener("click", () => {
    errorEl.hidden = true;
    openModal("addItemModal");
    document.getElementById("itemName").focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const name = document.getElementById("itemName").value.trim();
    const category = document.getElementById("itemCategory").value;
    const quantityText = document.getElementById("itemQuantity").value;
    const quantity = Number(quantityText);

    let problem = "";
    if (!name || quantityText === "") {
      problem = "Item name and quantity are required.";
    } else if (!Number.isInteger(quantity) || quantity < 0) {
      problem = "Quantity must be a whole number, 0 or higher.";
    } else if (
      items.some((entry) => entry.name.toLowerCase() === name.toLowerCase())
    ) {
      problem = "An item with that name already exists.";
    }

    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }

    items.push({
      id: nextId(items),
      name: name,
      category: category,
      quantity: quantity,
    });
    saveData(KEYS.inventory, items);
    logActivity(`Added item "${name}" (${quantity})`);

    render();
    form.reset();
    closeModal("addItemModal");
    showToast("Item added successfully.");
  });

  render();
}

// ============================================================
// F. OFFICERS PAGE
// ============================================================
function officerSortValue(officer, key) {
  if (key === "position")
    return POSITION_LABELS[officer.position] || officer.position;
  return officer[key];
}

function officerRowHTML(officer) {
  const isActive = officer.status === "active";
  const statusLabel = isActive ? "Active" : "Inactive";
  const statusClass = isActive ? "status-ok" : "status-low";
  const positionLabel = POSITION_LABELS[officer.position] || officer.position;
  const searchText =
    `${officer.name} ${positionLabel} ${officer.committee} ${statusLabel}`.toLowerCase();

  return `
    <tr data-id="${officer.id}"
        data-position="${escapeHTML(officer.position)}"
        data-status="${escapeHTML(officer.status)}"
        data-search="${escapeHTML(searchText)}">
      <td>${escapeHTML(officer.name)}</td>
      <td>${escapeHTML(positionLabel)}</td>
      <td>${escapeHTML(officer.committee)}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td>
        <a href="#" class="view-link">View</a>
        <a href="#" class="toggle-link admin-only">Toggle status</a>
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

  tbody.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();

    const id = Number(link.closest("tr").dataset.id);
    const officer = officers.find((entry) => entry.id === id);
    if (!officer) return;

    if (link.classList.contains("view-link")) {
      openViewModal("Officer details", [
        ["Name", officer.name],
        ["Position", POSITION_LABELS[officer.position] || officer.position],
        ["Committee", officer.committee],
        ["Status", officer.status === "active" ? "Active" : "Inactive"],
      ]);
      return;
    }

    if (!isAdmin()) return;

    if (link.classList.contains("toggle-link")) {
      officer.status = officer.status === "active" ? "inactive" : "active";
      saveData(KEYS.officers, officers);
      logActivity(`Set ${officer.name} to ${officer.status}`);
      render();
      showToast(`${officer.name} is now ${officer.status}.`);
    }

    if (link.classList.contains("delete-link")) {
      if (!window.confirm(`Delete "${officer.name}"?`)) return;

      officers = officers.filter((entry) => entry.id !== id);
      saveData(KEYS.officers, officers);
      logActivity(`Deleted officer "${officer.name}"`);
      render();
      showToast("Officer deleted.");
    }
  });

  // FEATURE 4: add officer with validation
  const addBtn = document.getElementById("addOfficerBtn");
  const form = document.getElementById("addOfficerForm");
  const errorEl = document.getElementById("addOfficerError");

  addBtn.addEventListener("click", () => {
    errorEl.hidden = true;
    openModal("addOfficerModal");
    document.getElementById("officerName").focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const name = document.getElementById("officerName").value.trim();
    const position = document.getElementById("officerPosition").value;
    const committee = document.getElementById("officerCommittee").value.trim();

    let problem = "";
    if (!name || !committee) {
      problem = "Name and committee are required.";
    } else if (
      officers.some((entry) => entry.name.toLowerCase() === name.toLowerCase())
    ) {
      problem = "An officer with that name already exists.";
    }

    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }

    officers.push({
      id: nextId(officers),
      name: name,
      position: position,
      committee: committee,
      status: "active",
    });
    saveData(KEYS.officers, officers);
    logActivity(`Added officer "${name}"`);

    render();
    form.reset();
    closeModal("addOfficerModal");
    showToast("Officer added successfully.");
  });

  render();
}

// ============================================================
// G. DASHBOARD — live stats + recent activity
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
        <span>${escapeHTML(entry.message)}</span>
        <time datetime="${escapeHTML(entry.time)}">${escapeHTML(formatTime(entry.time))}</time>
      </li>`,
    )
    .join("");

  emptyEl.hidden = entries.length > 0;
}

function setupDashboard() {
  const totalEl = document.getElementById("statTotalItems");
  if (!totalEl) return;

  const items = loadData(KEYS.inventory, DEFAULT_INVENTORY);
  const officers = loadData(KEYS.officers, DEFAULT_OFFICERS);

  animateCount(totalEl, items.length);
  animateCount(
    document.getElementById("statLowStock"),
    items.filter((item) => getInventoryStatus(item) === "low").length,
  );
  animateCount(
    document.getElementById("statActiveOfficers"),
    officers.filter((officer) => officer.status === "active").length,
  );

  renderActivity();

  // Admin-only helper so you can restore the sample data before a demo.
  document.getElementById("resetDataBtn").addEventListener("click", () => {
    if (!isAdmin()) return;
    if (
      !window.confirm(
        "Reset inventory, officers and activity to the sample data?",
      )
    )
      return;

    try {
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // nothing to reset
    }
    window.location.reload();
  });
}

// ============================================================
// START — runs once the page's HTML has loaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyRole();
  highlightActiveNav();
  setupLoginForm();
  setupLogout();
  setupModalClosing();
  setupInventoryPage();
  setupOfficersPage();
  setupDashboard();
});
