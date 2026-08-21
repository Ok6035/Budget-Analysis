// --- State Management ---
let state = {
  income: 5000,
  transactions: [
    { id: 1, amount: 1200, type: 'Need', category: 'Grocery', note: 'Monthly Supplies' },
    { id: 2, amount: 450, type: 'Want', category: 'Food', note: 'Weekend Dinner' }
  ],
  pendingDeleteId: null
};

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

// Modals & Triggers
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// --- Calculations & Updates ---
function updateDashboard() {
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

  // Render Metric Texts
  totalSpentText.textContent = `₹${totalSpent.toLocaleString()}`;
  remainingText.textContent = `₹${remainingCash.toLocaleString()}`;
  savingsText.textContent = `₹${savingsTarget.toLocaleString()}`;

  // Needs Progress
  needsStat.textContent = `₹${needsSpent.toLocaleString()} / ₹${needsTarget.toLocaleString()}`;
  const needsPct = Math.min((needsSpent / needsTarget) * 100, 100) || 0;
  needsBar.style.width = `${needsPct}%`;
  needsBar.style.backgroundColor = needsSpent > needsTarget ? 'var(--danger-color)' : 'var(--needs-color)';

  // Wants Progress
  wantsStat.textContent = `₹${wantsSpent.toLocaleString()} / ₹${wantsTarget.toLocaleString()}`;
  const wantsPct = Math.min((wantsSpent / wantsTarget) * 100, 100) || 0;
  wantsBar.style.width = `${wantsPct}%`;
  wantsBar.style.backgroundColor = wantsSpent > wantsTarget ? 'var(--danger-color)' : 'var(--wants-color)';

  // Transaction List Rendering
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

// --- Event Handlers ---
updateIncomeBtn.addEventListener('click', () => {
  const val = parseFloat(incomeInput.value);
  if (!isNaN(val) && val >= 0) {
    state.income = val;
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

    // Clear form inputs
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
    updateDashboard();
  }
});

// --- Deletion Double Verification Modal ---
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
    updateDashboard();
  }
});

// --- Settings & PDF Export ---
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

exportPdfBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
  window.print();
});

// --- Theme Toggle ---
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  themeIcon.textContent = isLight ? '☀️' : '🌙';
});

// Touch Zoom Prevention
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

// Initial Setup
updateDashboard();

