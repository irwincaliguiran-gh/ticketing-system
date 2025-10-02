/*
 * script.js
 * Shared client-side logic for the Ticketing System
 */

// ==== Configuration ====
// Change this to your Apps Script Web App URL
const BASE_URL = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';
const SPREADSHEET_ID = '1hE2JpCKCFwBXNSN01dNIZpBrNid9MRkFnMUV5uPY-QI';
const DB = SpreadsheetApp.openById(SPREADSHEET_ID);
const SHEET_USERS    = DB.getSheetByName('Users');
const SHEET_PENDING  = DB.getSheetByName('PendingUsers');
const SHEET_TICKETS  = DB.getSheetByName('Tickets');


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
function doGet(e) {
  return ContentService
    .createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin','*');
}

function doPost(e) {
  const req   = JSON.parse(e.postData.contents);
  const action = req.action;
  let result   = { success: false, error: 'Unknown action' };

  try {
    switch (action) {
      case 'createAccount':    result = createAccount(req);     break;
      case 'login':            result = login(req);             break;
      case 'getPendingUsers':  result = getPendingUsers();      break;
      case 'approveUser':      result = approveUser(req.user);  break;
      case 'submitTicket':     result = submitTicket(req);      break;
      case 'getAllTickets':    result = getAllTickets();        break;
      case 'getUserTickets':   result = getUserTickets(req.user); break;
      case 'getTicketByID':    result = getTicketByID(req.ticketID); break;
      case 'approveTicket':    result = approveTicket(req.ticketID); break;
      case 'deleteTicket':     result = deleteTicket(req.ticketID);  break;
      default: break;
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin','*');
}


// ========== 1. ACCOUNT MANAGEMENT ==========

function createAccount(req) {
  const { user, email, pwHash, contact, dept } = req;

  // Check duplicate email in both Pending and Users
  const allEmails = [
    ...SHEET_PENDING.getRange(2,2, SHEET_PENDING.getLastRow()-1).getValues().flat(),
    ...SHEET_USERS.getRange(2,2, SHEET_USERS.getLastRow()-1).getValues().flat()
  ];
  if (allEmails.includes(email)) {
    return { success: false, error: 'Email already registered' };
  }

  // Append to PendingUsers: [Username, Email, Hash, Contact, Dept]
  SHEET_PENDING.appendRow([user, email, pwHash, contact, dept]);
  return { success: true };
}

function getPendingUsers() {
  const rows = SHEET_PENDING.getDataRange().getValues().slice(1);
  const keys = ['Username','Email','PasswordHash','Contact','Department'];
  return rows.map(r => Object.fromEntries(r.map((v,i) => [keys[i], v])));
}

function approveUser(username) {
  const data = SHEET_PENDING.getDataRange().getValues();
  const header = data.shift();
  const idx = data.findIndex(r => r[0] === username);
  if (idx < 0) throw new Error('Pending user not found');

  // Move row to Users sheet, set Approved=TRUE, Role='user'
  const row = data[idx];
  SHEET_USERS.appendRow([row[0], row[1], row[2], row[3], row[4], true, 'user']);

  // Delete from PendingUsers
  SHEET_PENDING.deleteRow(idx + 2);
  return { success: true };
}

function login(req) {
  const { user, pwHash } = req;
  const data = SHEET_USERS.getDataRange().getValues();
  const header = data.shift();

  for (const r of data) {
    const [u, email, hash, contact, dept, approved, role] = r;
    if (u === user && hash === pwHash && approved === true) {
      return { success: true, user, role };
    }
  }
  return { success: false, error: 'Invalid credentials or not approved' };
}


// ========== 2. TICKET OPERATIONS ==========

// Column layout in Tickets sheet:
// [Timestamp, TicketID, Username, ProjectNumber, ProjectName, ProjectManager,
//  Budget, StartDate, EndDate, Priority, AssignedTeam, Remarks, Status]

function submitTicket(req) {
  const {
    user, ticketID, projNumber, projName, projManager,
    budget, startDate, endDate, priority, assignedTeam, remarks
  } = req;

  // Check unique ProjectNumber
  const projNums = SHEET_TICKETS.getRange(2,4, SHEET_TICKETS.getLastRow()-1).getValues().flat();
  if (projNums.includes(projNumber)) {
    return { success: false, error: 'Project Number already exists' };
  }

  const now = new Date();
  SHEET_TICKETS.appendRow([
    now,
    ticketID,
    user,
    projNumber,
    projName,
    projManager,
    budget,
    startDate,
    endDate,
    priority,
    assignedTeam,
    remarks,
    'Pending'
  ]);
  return { success: true };
}

function getAllTickets() {
  const rows = SHEET_TICKETS.getDataRange().getValues().slice(1);
  const keys = [
    'Timestamp','TicketID','Username','ProjectNumber','ProjectName',
    'ProjectManager','Budget','StartDate','EndDate','Priority',
    'AssignedTeam','Remarks','Status'
  ];
  return rows.map(r => Object.fromEntries(r.map((v,i) => [keys[i], v])));
}

function getUserTickets(username) {
  const rows = SHEET_TICKETS.getDataRange().getValues().slice(1);
  const keys = [
    'Timestamp','TicketID','Username','ProjectNumber','ProjectName',
    'ProjectManager','Budget','StartDate','EndDate','Priority',
    'AssignedTeam','Remarks','Status'
  ];
  return rows
    .filter(r => r[2] === username)     // filter by Username column
    .map(r => Object.fromEntries(r.map((v,i) => [keys[i], v])));
}

function getTicketByID(ticketID) {
  const rows = SHEET_TICKETS.getDataRange().getValues().slice(1);
  const keys = [
    'Timestamp','TicketID','Username','ProjectNumber','ProjectName',
    'ProjectManager','Budget','StartDate','EndDate','Priority',
    'AssignedTeam','Remarks','Status'
  ];
  const row = rows.find(r => r[1] === ticketID);
  if (!row) throw new Error('Ticket not found');
  return Object.fromEntries(row.map((v,i) => [keys[i], v]));
}

function approveTicket(ticketID) {
  const data = SHEET_TICKETS.getDataRange().getValues();
  const header = data.shift();
  const idx = data.findIndex(r => r[1] === ticketID);
  if (idx < 0) throw new Error('Ticket not found');

  const sheetRow = idx + 2;                                    // account for header
  const statusCol = header.indexOf('Status') + 1;              // 1-based
  SHEET_TICKETS.getRange(sheetRow, statusCol).setValue('Approved');
  return { success: true };
}

function deleteTicket(ticketID) {
  const rows = SHEET_TICKETS.getDataRange().getValues().slice(1);
  const idx = rows.findIndex(r => r[1] === ticketID);
  if (idx < 0) throw new Error('Ticket not found');
  SHEET_TICKETS.deleteRow(idx + 2);                            // account for header
  return { success: true };
}
