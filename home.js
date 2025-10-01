const API = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';

const user = localStorage.getItem('username');
document.getElementById('usr').textContent = user;

async function viewTickets() {
  const res = await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'search', query:'' })
  });
  const { tickets } = await res.json();
  render(tickets);
}

function toggleForm() {
  const f = document.getElementById('ticketForm');
  f.style.display = (f.style.display==='none'?'block':'none');
}

async function submitTicket() {
  const title = document.getElementById('tTitle').value;
  const desc  = document.getElementById('tDesc').value;
  await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'submit', username:user, title, description:desc })
  });
  viewTickets();
}

async function search() {
  const q   = document.getElementById('searchBox').value;
  const res = await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'search', query:q })
  });
  const { tickets } = await res.json();
  render(tickets);
}

function render(list) {
  document.getElementById('content').innerHTML =
    list.map(t =>
      `<div class="card mb-2 p-3">
         <strong>${t.Title}</strong><br>${t.Description}
         <span class="badge badge-secondary float-right">${t.Status}</span>
       </div>`).join('');
}

document.addEventListener('DOMContentLoaded', viewTickets);
