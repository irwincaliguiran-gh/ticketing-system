const API = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';

function show(id) {
  ['login','register'].forEach(f =>
    document.getElementById(f).style.display = (f===id?'block':'none')
  );
}

function hashPwd(p) {
  return CryptoJS.SHA256(p).toString();
}

// Sign in (username/password)
async function signIn(e) {
  e.preventDefault();
  const username = document.getElementById('liUser').value;
  const password = hashPwd(document.getElementById('liPass').value);
  const res = await fetch(API, {
    method:'POST',
    body: JSON.stringify({ action:'login', username, password })
  });
  const { success, username:usr, message } = await res.json();
  if (success) {
    localStorage.setItem('username', usr);
    window.location.href = 'home.html';
  } else alert(message);
}

// Register new user
async function register(e) {
  e.preventDefault();
  const data = {
    action:     'register',
    username:   document.getElementById('reUser').value,
    email:      document.getElementById('reEmail').value,
    password:   hashPwd(document.getElementById('rePass').value),
    contact:    document.getElementById('reContact').value,
    department: document.getElementById('reDept').value
  };
  const res = await fetch(API, { method:'POST', body: JSON.stringify(data) });
  const { message } = await res.json();
  alert(message);
}
