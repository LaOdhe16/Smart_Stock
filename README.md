# Smart Stock 📦
Sistem Manajemen Persediaan Barang — Flask + MySQL (XAMPP) + Vercel

---

## Struktur Proyek
```
Smart-Stock/
├── app.py                  # Backend Flask (routes + API)
├── database.sql            # Schema + data awal (jalankan di phpMyAdmin)
├── requirements.txt
├── vercel.json
├── .gitignore
├── templates/
│   ├── base.html           # Layout utama (sidebar + topbar)
│   ├── index.html          # Login
│   ├── dashboard.html
│   ├── data-barang.html
│   ├── transaksi.html
│   └── laporan.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── login.js
        ├── dashboard.js
        ├── data-barang.js
        ├── transaksi.js
        └── laporan.js
```

---

## Cara Menjalankan Lokal (XAMPP)

### 1. Setup Database
1. Buka XAMPP → Start **Apache** dan **MySQL**
2. Buka **phpMyAdmin** → http://localhost/phpmyadmin
3. Klik **Import** → pilih file `database.sql` → klik **Go**
4. Database `smartstock` + tabel + akun admin sudah terbuat

### 2. Setup Python
```bash
# Buat virtual environment
python -m venv venv

# Aktifkan (Windows)
venv\Scripts\activate
# Aktifkan (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Jalankan Flask
```bash
python app.py
```
Buka browser: **http://localhost:5000**

**Login default:** `admin` / `admin123`

---

## Deploy ke Vercel

### Persiapan
Karena Vercel tidak bisa konek ke MySQL lokal, gunakan database cloud:
- **PlanetScale** (MySQL-compatible, gratis) → https://planetscale.com
- **Railway** → https://railway.app
- **Aiven** → https://aiven.io

### Langkah Deploy
```bash
# 1. Push ke GitHub
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/username/smart-stock.git
git push -u origin main

# 2. Di Vercel (vercel.com)
#    - New Project → Import dari GitHub
#    - Framework: Other
#    - Set Environment Variables:
#      MYSQL_HOST     = host-dari-planetscale
#      MYSQL_USER     = username-db
#      MYSQL_PASSWORD = password-db
#      MYSQL_DB       = smartstock
#      SECRET_KEY     = random-string-panjang
```

---

## Akun Default
| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | Admin |

> Ganti password di tabel `users` setelah deploy!
