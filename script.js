const API = 'https://script.google.com/macros/s/AKfycbw1hL2ieVNC2dOmT2AwUgQgOgTPaNPFH1PfUZ1IDTkVmjygCUnxssirKt9F5Q3_j_JY/exec';

function show(id) {
  document.getElementById('loginForm').style.display = id==='loginForm'?'block':'none';
  document.getElementById('regForm').style.display    = id==='regForm'   ?'block':'none';
}

function hashPwd(p) {
  return CryptoJS.SHA256(p).toString();
}

async function signIn(e) {
  e.preventDefault();
  const email = document.getElementById('liEmail').value;
  const pwd   = hashPwd(document.getElementById('liPass').value);
  const res   = await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action:'login', email, password:pwd })
  });
  const { success, username, message } = await res.json();
  if (success) {
    localStorage.setItem('username', username);
    window.location.href = 'home.html';
  } else alert(message);
}

async function register(e) {
  e.preventDefault();
  const data = {
    action: 'register',
    username:   document.getElementById('reUser').value,
    email:      document.getElementById('reEmail').value,
    password:   hashPwd(document.getElementById('rePass').value),
    contact:    document.getElementById('reContact').value,
    department: document.getElementById('reDept').value
  };
  const res = await fetch(API, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const { message } = await res.json();
  alert(message);
}
