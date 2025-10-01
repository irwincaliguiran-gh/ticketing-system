const API = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';
const user = localStorage.getItem('username');
document.getElementById('usr').textContent = user;

async function viewTickets() { await search(''); }

function toggleForm() {
  const f = document.getElementById('ticketForm');
  f.style.display = f.style.display==='none'?'block':'none';
}

async function submitTicket() {
  const title = document.getElementById('tTitle').value;
  const desc  = document.getElementById('tDesc').value;
  await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action:'submit', username:user, title, description:desc })
  });
  viewTickets();
}

async function search(q) {
  const query = q!==undefined ? q : document.getElementById('searchBox').value;
  const res = await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action:'search', query })
  });
  const { tickets } = await res.json();
  render(tickets);
}

function render(list) {
  const c = document.getElementById('content');
  c.innerHTML = list.map(t =>
    `<div><strong>${t.Title}</strong> – ${t.Description} [${t.Status}]</div>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', () => viewTickets());
