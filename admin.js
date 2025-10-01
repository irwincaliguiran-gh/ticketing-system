const API = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';

async function loadPending() {
  const res = await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'listPending' })
  });
  const { users } = await res.json();
  const html = users.map(u =>
    `<div>
      ${u.Username} (${u.Email}) – ${u.Department}
      <button onclick="approve('${u.Email}')">Approve</button>
    </div>`
  ).join('');
  document.getElementById('pendingList').innerHTML = html;
}

async function approve(email) {
  await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'approve', email })
  });
  loadPending();
}

document.addEventListener('DOMContentLoaded', loadPending);
