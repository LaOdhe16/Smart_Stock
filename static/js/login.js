// Toggle password visibility 
document.getElementById('togglePass').addEventListener('click', function () {
  const pw   = document.getElementById('password');
  const icon = document.getElementById('eyeIcon');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    pw.type = 'password';
    icon.className = 'bi bi-eye';
  }
});

// Remember me 
const rememberMe = document.getElementById('rememberMe');
const savedUser  = localStorage.getItem('ss_remember_user');
if (savedUser) {
  document.getElementById('username').value = savedUser;
  rememberMe.checked = true;
}

// Login 
async function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const alertEl  = document.getElementById('alert-login');
  const btnLogin = document.getElementById('btnLogin');

  alertEl.classList.add('d-none');

  if (!username || !password) {
    alertEl.textContent = 'Username dan password wajib diisi!';
    alertEl.classList.remove('d-none');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

  try {
    const res  = await fetch('/api/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      if (rememberMe.checked) localStorage.setItem('ss_remember_user', username);
      else                    localStorage.removeItem('ss_remember_user');
      window.location.href = data.redirect;
    } else {
      alertEl.textContent = data.message || 'Login gagal';
      alertEl.classList.remove('d-none');
    }
  } catch (err) {
    alertEl.textContent = 'Koneksi ke server gagal. Pastikan Flask berjalan.';
    alertEl.classList.remove('d-none');
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Masuk';
  }
}

document.getElementById('btnLogin').addEventListener('click', doLogin);

// Enter key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
