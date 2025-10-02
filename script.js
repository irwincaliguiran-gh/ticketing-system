/*
 * script.js
 * Shared client-side logic for the Ticketing System
 */

// ==== Configuration ====
// Change this to your Apps Script Web App URL
const BASE_URL = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';
// ==== Utility: SHA-256 Password Hashing ====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ==== Utility: Generic Fetch Wrapper ====
async function fetchApi(action, payload = {}) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

// ==== DOMContentLoaded: Init Handlers ====
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm')) initLogin();
  if (document.getElementById('signupForm')) initSignup();
  if (document.getElementById('ticketForm')) initTicketForm();
  if (document.getElementById('pendingUsersTbl')) initAdminPanel();
  if (document.getElementById('allTicketsTbl')) initAdminPanel();
  if (document.getElementById('userTicketsTbl')) initUserTickets();
  if (document.getElementById('ticketDetails')) initTicketDetails();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      location.href = 'index.html';
    });
  }

  // PDF Export button on view-tickets.html
  const exportBtn = document.getElementById('exportPdf');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      doc.html(document.querySelector('#userTicketsTbl'), {
        callback: () => doc.save('tickets.pdf'),
        margin: [40, 40, 40, 40],
        autoPaging: 'text'
      });
    });
  }
});

// ==== 1. Login Flow ====
function initLogin() {
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const user = form.loginUsername.value.trim();
    const pwHash = await hashPassword(form.loginPassword.value);

    fetchApi('login', { user, pwHash }).then(response => {
      if (!response.success) return alert(response.error);
      sessionStorage.setItem('username', response.user);
      sessionStorage.setItem('role', response.role);
      location.href = response.role === 'admin' ? 'admin.html' : 'home.html';
    });
  });

  document.getElementById('goSignup').addEventListener('click', () => {
    location.href = 'signup.html';
  });
}

// ==== 2. Signup Flow ====
function initSignup() {
  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      user: form.suUsername.value.trim(),
      email: form.suEmail.value.trim(),
      pwHash: await hashPassword(form.suPassword.value),
      contact: form.suContact.value.trim(),
      dept: form.suDept.value.trim()
    };

    fetchApi('createAccount', payload).then(ret => {
      if (ret.success) {
        alert('Account created. Awaiting admin approval.');
        location.href = 'index.html';
      } else {
        alert(ret.error);
      }
    });
  });
}

// ==== 3. Submit Ticket ====
function initTicketForm() {
  document.getElementById('ticketForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const ticketID = generateTicketID();
    const payload = {
      user: sessionStorage.getItem('username'),
      ticketID,
      projNumber: form.projNumber.value.trim(),
      projName: form.projName.value.trim(),
      projManager: form.projManager.value.trim(),
      budget: parseFloat(form.projBudget.value),
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      priority: form.priorityLevel.value,
      assignedTeam: form.assignedTeam.value.trim(),
      remarks: form.remarks.value.trim()
    };

    fetchApi('submitTicket', payload).then(ret => {
      if (ret.success) {
        alert('Ticket submitted!');
        form.reset();
      } else {
        alert(ret.error);
      }
    });
  });
}

function generateTicketID() {
  const dt = new Date();
  return (
    'T-' +
    dt
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)
  );
}

// ==== 4. Admin Panel (Pending Users & All Tickets) ====
function initAdminPanel() {
  loadPendingUsers();
  loadAllTickets();
  setInterval(loadPendingUsers, 5000);
  setInterval(loadAllTickets, 5000);
}

function loadPendingUsers() {
  fetchApi('getPendingUsers').then(renderPendingUsers);
}

function renderPendingUsers(users) {
  const tbody = document.querySelector('#pendingUsersTbl tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.Username}</td>
      <td>${u.Email}</td>
      <td>${u.Contact}</td>
      <td>${u.Department}</td>
      <td>
        <button class="btn btn-sm btn-success approve-user" data-user="${u.Username}">
          Approve
        </button>
      </td>`;
    tbody.append(tr);
  });

  document.querySelectorAll('.approve-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = btn.dataset.user;
      fetchApi('approveUser', { user }).then(() => loadPendingUsers());
    });
  });
}

function loadAllTickets() {
  fetchApi('getAllTickets').then(renderAllTickets);
}

function renderAllTickets(tickets) {
  const tbody = document.querySelector('#allTicketsTbl tbody');
  tbody.innerHTML = '';
  tickets.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.TicketID}</td>
      <td>${t.ProjectNumber}</td>
      <td>${t.ProjectName}</td>
      <td>${t.Status}</td>
      <td>
        <button class="btn btn-sm btn-primary approve-ticket" data-id="${t.TicketID}">Approve</button>
        <button class="btn btn-sm btn-danger delete-ticket" data-id="${t.TicketID}">Delete</button>
      </td>`;
    tbody.append(tr);
  });

  document.querySelectorAll('.approve-ticket').forEach(btn =>
    btn.addEventListener('click', () =>
      fetchApi('approveTicket', { ticketID: btn.dataset.id }).then(() => loadAllTickets())
    )
  );
  document.querySelectorAll('.delete-ticket').forEach(btn =>
    btn.addEventListener('click', () =>
      fetchApi('deleteTicket', { ticketID: btn.dataset.id }).then(() => loadAllTickets())
    )
  );

  if ($.fn.DataTable.isDataTable('#allTicketsTbl')) {
    $('#allTicketsTbl').DataTable().draw();
  } else {
    $('#allTicketsTbl').DataTable({ paging: true, autoWidth: false });
  }
}

// ==== 5. User Tickets & Search ====
function initUserTickets() {
  loadUserTickets();
  document.getElementById('searchInput').addEventListener('keyup', filterUserTickets);
}

function loadUserTickets() {
  const user = sessionStorage.getItem('username');
  fetchApi('getUserTickets', { user }).then(renderUserTickets);
}

function renderUserTickets(tickets) {
  const tbody = document.querySelector('#userTicketsTbl tbody');
  tbody.innerHTML = '';
  tickets.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.TicketID}</td>
      <td>${t.ProjectNumber}</td>
      <td>${t.ProjectName}</td>
      <td>${t.Status}</td>
      <td>
        <a href="ticket-details.html?ticketID=${t.TicketID}" class="btn btn-sm btn-info">View</a>
      </td>`;
    tbody.append(tr);
  });

  if ($.fn.DataTable.isDataTable('#userTicketsTbl')) {
    $('#userTicketsTbl').DataTable().draw();
  } else {
    $('#userTicketsTbl').DataTable({ paging: true, autoWidth: false });
  }
}

function filterUserTickets() {
  const term = document.getElementById('searchInput').value;
  $('#userTicketsTbl').DataTable().search(term).draw();
}

// ==== 6. Ticket Details Page ====
function initTicketDetails() {
  const params = new URLSearchParams(location.search);
  const ticketID = params.get('ticketID');
  fetchApi('getTicketByID', { ticketID }).then(renderTicketDetails);
  setInterval(() => fetchApi('getTicketByID', { ticketID }).then(renderTicketDetails), 5000);
}

function renderTicketDetails(t) {
  const container = document.getElementById('ticketDetails');
  container.innerHTML = `
    <div class="card">
      <div class="card-header bg-primary text-white">
        ${t.TicketID} — ${t.ProjectName}
      </div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item"><strong>Project #:</strong> ${t.ProjectNumber}</li>
        <li class="list-group-item"><strong>Manager:</strong> ${t.ProjectManager}</li>
        <li class="list-group-item"><strong>Budget:</strong> ₱${t.Budget.toLocaleString()}</li>
        <li class="list-group-item"><strong>Start:</strong> ${new Date(t.StartDate).toLocaleDateString()}</li>
        <li class="list-group-item"><strong>End:</strong> ${new Date(t.EndDate).toLocaleDateString()}</li>
        <li class="list-group-item"><strong>Priority:</strong> ${t.Priority}</li>
        <li class="list-group-item"><strong>Assigned Team:</strong> ${t.AssignedTeam}</li>
        <li class="list-group-item"><strong>Remarks:</strong> ${t.Remarks}</li>
        <li class="list-group-item"><strong>Status:</strong> ${t.Status}</li>
      </ul>
    </div>`;
}
