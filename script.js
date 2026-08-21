// --- Service Worker Registration for Offline Mode ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Offline Service Worker Registered'))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// --- State & Unique ID Management ---
const STORAGE_KEY = 'budget_planner_app_data_v1';

function generateUniqueId() {
  return 'BP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading budget data:', e);
    }
  }
  return {
    userId: generateUniqueId(),
    income: 5000,
    transactions: []
  };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- DOM Elements ---
const incomeInput = document.getElementById('incomeInput');
const updateIncomeBtn = document.getElementById('updateIncomeBtn');
const totalSpentText = document.getElementById('totalSpentText');
const remainingText = document.getElementById('remainingText');
const savingsText = document.getElementById('savingsText');
const needsStat = document.getElementById('needsStat');
const wantsStat = document.getElementById('wantsStat');
const needsBar = document.getElementById('needsBar');
const wantsBar = document.getElementById('wantsBar');
const expenseForm = document.getElementById('expenseForm');
const transactionList = document.getElementById('transactionList');
const txCount = document.getElementById('txCount');
const syncIdInput = document.getElementById('syncIdInput');

// Modals
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const copySyncCodeBtn = document.getElementById('copySyncCodeBtn');
const importSyncCodeBtn = document.getElementById('importSyncCodeBtn');

// --- Calculation & UI Updates ---
function updateDashboard() {
  incomeInput.value = state.income;
  syncIdInput.value = state.userId;

  const needsTarget = state.income * 0.50;
  const wantsTarget = state.income * 0.30;
  const savingsTarget = state.income * 0.20;

  const needsSpent = state.transactions
    .filter(t => t.type === 'Need')
    .reduce((sum, t) => sum + t.amount, 0);

  const wantsSpent = state.transactions
    .filter(t => t.type === 'Want')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = needsSpent + wantsSpent;
  const remainingCash = state.income - totalSpent - savingsTarget;

  totalSpentText.textContent = `₹${totalSpent.toLocaleString()}`;
  remainingText.textContent = `₹${remainingCash.toLocaleString()}`;
  savingsText.textContent = `₹${savingsTarget.toLocaleString()}`;

  // Needs Bar
  needsStat.textContent = `₹${needsSpent.toLocaleString()} / ₹${needsTarget.toLocaleString()}`;
  const needsPct = Math.min((needsSpent / needsTarget) * 100, 100) || 0;
  needsBar.style.width = `${needsPct}%`;
  needsBar.style.backgroundColor = needsSpent > needsTarget ? 'var(--danger-color)' : 'var(--needs-color)';

  // Wants Bar
  wantsStat.textContent = `₹${wantsSpent.toLocaleString()} / ₹${wantsTarget.toLocaleString()}`;
  const wantsPct = Math.min((wantsSpent / wantsTarget) * 100, 100) || 0;
  wantsBar.style.width = `${wantsPct}%`;
  wantsBar.style.backgroundColor = wantsSpent > wantsTarget ? 'var(--danger-color)' : 'var(--wants-color)';

  renderTransactions();
}

function renderTransactions() {
  transactionList.innerHTML = '';
  txCount.textContent = `${state.transactions.length} items`;

  if (state.transactions.length === 0) {
    transactionList.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">No expenses logged yet.</div>`;
    return;
  }

  state.transactions.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-details">
        <span class="tx-title">${escapeHtml(tx.note)}</span>
        <div class="tx-meta">
          <span class="badge ${tx.type === 'Need' ? 'badge-need' : 'badge-want'}">${tx.type}</span>
          <span>• ${tx.category}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount">₹${tx.amount.toLocaleString()}</span>
        <button class="delete-btn" onclick="promptDelete(${tx.id})" aria-label="Delete">🗑️</button>
      </div>
    `;
    transactionList.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// --- Interactions ---
updateIncomeBtn.addEventListener('click', () => {
  const val = parseFloat(incomeInput.value);
  if (!isNaN(val) && val >= 0) {
    state.income = val;
    saveState();
    updateDashboard();
  }
});

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const type = document.getElementById('expenseType').value;
  const category = document.getElementById('expenseCategory').value;
  const note = document.getElementById('expenseNote').value.trim();

  if (amount > 0 && note !== '') {
    state.transactions.unshift({
      id: Date.now(),
      amount,
      type,
      category,
      note
    });

    saveState();
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
    updateDashboard();
  }
});

// Deletion
window.promptDelete = function(id) {
  state.pendingDeleteId = id;
  deleteModal.classList.add('active');
};

cancelDeleteBtn.addEventListener('click', () => {
  state.pendingDeleteId = null;
  deleteModal.classList.remove('active');
});

confirmDeleteBtn.addEventListener('click', () => {
  if (state.pendingDeleteId !== null) {
    state.transactions = state.transactions.filter(t => t.id !== state.pendingDeleteId);
    state.pendingDeleteId = null;
    deleteModal.classList.remove('active');
    saveState();
    updateDashboard();
  }
});

// --- Settings & Cross-Browser Import/Export ---
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

exportPdfBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
  window.print();
});

// Copy Data Code for Other Browsers
copySyncCodeBtn.addEventListener('click', () => {
  const payload = btoa(JSON.stringify(state));
  navigator.clipboard.writeText(payload);
  alert('Backup code copied! Paste this into "Import Backup Code" in any other browser.');
});

// Import Data Code from Other Browsers
importSyncCodeBtn.addEventListener('click', () => {
  const code = prompt('Paste the Backup Code from your other browser:');
  if (code) {
    try {
      const decoded = JSON.parse(atob(code));
      if (decoded && decoded.transactions) {
        state = decoded;
        saveState();
        updateDashboard();
        alert('Data successfully synced across browser!');
      }
    } catch (err) {
      alert('Invalid backup code.');
    }
  }
});

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  themeIcon.textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('budget_planner_theme', isLight ? 'light' : 'dark');
});

if (localStorage.getItem('budget_planner_theme') === 'light') {
  document.body.classList.add('light-mode');
  themeIcon.textContent = '☀️';
}

updateDashboard();
