/*
 * script.js
 * Shared client-side logic for the Ticketing System
 */

// ==== Configuration ====
// Change this to your Apps Script Web App URL
const BASE_URL = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';
// Configuration
const BASE_URL = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec';

// SHA-256 hashing
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Generic fetch wrapper
async function fetchApi(action, data={}) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action, ...data })
  });
  return res.json();
}

// Init handlers
document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('loginForm')) initLogin();
  if (document.getElementById('signupForm')) initSignup();
  if (document.getElementById('ticketForm')) initTicketForm();
  if (document.getElementById('pendingUsersTbl')) initAdminPanel();
  if (document.getElementById('allTicketsTbl')) initAdminPanel();
  if (document.getElementById('userTicketsTbl')) initUserTickets();
  if (document.getElementById('ticketDetails')) initTicketDetails();

  const lb = document.getElementById('logoutBtn');
  if (lb) lb.addEventListener('click', ()=>{
    sessionStorage.clear();
    location.href = 'index.html';
  });

  const eb = document.getElementById('exportPdf');
  if (eb) eb.addEventListener('click', ()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt',format:'letter'});
    doc.html(document.querySelector('#userTicketsTbl'), {
      callback: ()=>doc.save('tickets.pdf'),
      margin:[40,40,40,40], autoPaging:'text'
    });
  });
});

// 1. Login
function initLogin() {
  document.getElementById('loginForm')
    .addEventListener('submit', async e=>{
      e.preventDefault();
      const f = e.target;
      const user = f.loginUsername.value.trim();
      const pwHash = await hashPassword(f.loginPassword.value);
      fetchApi('login',{user,pwHash}).then(res=>{
        if (!res.success) return alert(res.error);
        sessionStorage.setItem('username',res.user);
        sessionStorage.setItem('role',res.role);
        location.href = res.role==='admin'?'admin.html':'home.html';
      });
    });
  document.getElementById('goSignup')
    .addEventListener('click',()=>location.href='signup.html');
}

// 2. Signup
function initSignup() {
  document.getElementById('signupForm')
    .addEventListener('submit', async e=>{
      e.preventDefault();
      const f = e.target;
      const data = {
        user: f.suUsername.value.trim(),
        email: f.suEmail.value.trim(),
        pwHash: await hashPassword(f.suPassword.value),
        contact: f.suContact.value.trim(),
        dept: f.suDept.value.trim()
      };
      fetchApi('createAccount',data).then(r=>{
        if (r.success) {
          alert('Account created. Await admin approval.');
          location.href='index.html';
        } else alert(r.error);
      });
    });
}

// 3. Submit Ticket
function initTicketForm() {
  document.getElementById('ticketForm')
    .addEventListener('submit', e=>{
      e.preventDefault();
      const f = e.target;
      const ticketID = 'T-'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
      const data = {
        user: sessionStorage.getItem('username'),
        ticketID,
        projNumber: f.projNumber.value.trim(),
        projName: f.projName.value.trim(),
        projManager: f.projManager.value.trim(),
        budget: parseFloat(f.projBudget.value),
        startDate: f.startDate.value,
        endDate: f.endDate.value,
        priority: f.priorityLevel.value,
        assignedTeam: f.assignedTeam.value.trim(),
        remarks: f.remarks.value.trim()
      };
      fetchApi('submitTicket',data).then(r=>{
        if (r.success) {
          alert('Ticket submitted!');
          f.reset();
        } else alert(r.error);
      });
    });
}

// 4. Admin Panel
function initAdminPanel() {
  loadPendingUsers();
  loadAllTickets();
  setInterval(loadPendingUsers,5000);
  setInterval(loadAllTickets,5000);
}

function loadPendingUsers() {
  fetchApi('getPendingUsers').then(users=>{
    const tb = document.querySelector('#pendingUsersTbl tbody');
    tb.innerHTML = '';
    users.forEach(u=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.Username}</td>
        <td>${u.Email}</td>
        <td>${u.Contact}</td>
        <td>${u.Department}</td>
        <td>
          <button class="btn btn-sm btn-success approve-user"
            data-user="${u.Username}">
            Approve
          </button>
        </td>`;
      tb.append(tr);
    });
    document.querySelectorAll('.approve-user')
      .forEach(b=>b.addEventListener('click', ()=> {
        fetchApi('approveUser',{user:b.dataset.user})
          .then(()=>loadPendingUsers());
      }));
  });
}

function loadAllTickets() {
  fetchApi('getAllTickets').then(ts=>{
    const tb = document.querySelector('#allTicketsTbl tbody');
    tb.innerHTML = '';
    ts.forEach(t=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.TicketID}</td>
        <td>${t.ProjectNumber}</td>
        <td>${t.ProjectName}</td>
        <td>${t.Status}</td>
        <td>
          <button class="btn btn-sm btn-primary approve-ticket"
            data-id="${t.TicketID}">Approve</button>
          <button class="btn btn-sm btn-danger delete-ticket"
            data-id="${t.TicketID}">Delete</button>
        </td>`;
      tb.append(tr);
    });
    document.querySelectorAll('.approve-ticket')
      .forEach(b=>b.addEventListener('click', ()=>{
        fetchApi('approveTicket',{ticketID:b.dataset.id})
          .then(()=>loadAllTickets());
      }));
    document.querySelectorAll('.delete-ticket')
      .forEach(b=>b.addEventListener('click', ()=>{
        fetchApi('deleteTicket',{ticketID:b.dataset.id})
          .then(()=>loadAllTickets());
      }));
    if ($.fn.DataTable.isDataTable('#allTicketsTbl')) {
      $('#allTicketsTbl').DataTable().draw();
    } else {
      $('#allTicketsTbl').DataTable({paging:true,autoWidth:false});
    }
  });
}

// 5. User Tickets & Search
function initUserTickets() {
  loadUserTickets();
  document.getElementById('searchInput')
    .addEventListener('keyup', ()=> {
      $('#userTicketsTbl').DataTable()
        .search(document.getElementById('searchInput').value)
        .draw();
    });
}

function loadUserTickets() {
  const user = sessionStorage.getItem('username');
  fetchApi('getUserTickets',{user}).then(ts=>{
    const tb = document.querySelector('#userTicketsTbl tbody');
    tb.innerHTML = '';
    ts.forEach(t=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.TicketID}</td>
        <td>${t.ProjectNumber}</td>
        <td>${t.ProjectName}</td>
        <td>${t.Status}</td>
        <td>
          <a href="ticket-details.html?ticketID=${t.TicketID}"
             class="btn btn-sm btn-info">View</a>
        </td>`;
      tb.append(tr);
    });
    if ($.fn.DataTable.isDataTable('#userTicketsTbl')) {
      $('#userTicketsTbl').DataTable().draw();
    } else {
      $('#userTicketsTbl').DataTable({paging:true,autoWidth:false});
    }
  });
}

// 6. Ticket Details
function initTicketDetails() {
  const params = new URLSearchParams(location.search);
  const id     = params.get('ticketID');
  fetchApi('getTicketByID',{ticketID:id})
    .then(renderDetails);
  setInterval(()=>{
    fetchApi('getTicketByID',{ticketID:id})
      .then(renderDetails);
  },5000);
}

function renderDetails(t) {
  const c = document.getElementById('ticketDetails');
  c.innerHTML = `
    <div class="card">
      <div class="card-header bg-primary text-white">
        ${t.TicketID} — ${t.ProjectName}
      </div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item">
          <strong>Project #:</strong> ${t.ProjectNumber}
        </li>
        <li class="list-group-item">
          <strong>Manager:</strong> ${t.ProjectManager}
        </li>
        <li class="list-group-item">
          <strong>Budget:</strong> ₱${t.Budget.toLocaleString()}
        </li>
        <li class="list-group-item">
          <strong>Start:</strong> ${new Date(t.StartDate).toLocaleDateString()}
        </li>
        <li class="list-group-item">
          <strong>End:</strong> ${new Date(t.EndDate).toLocaleDateString()}
        </li>
        <li class="list-group-item">
          <strong>Priority:</strong> ${t.Priority}
        </li>
        <li class="list-group-item">
          <strong>Assigned Team:</strong> ${t.AssignedTeam}
        </li>
        <li class="list-group-item">
          <strong>Remarks:</strong> ${t.Remarks}
        </li>
        <li class="list-group-item">
          <strong>Status:</strong> ${t.Status}
        </li>
      </ul>
    </div>`;
}
