from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_mysqldb import MySQL
from functools import wraps
from datetime import datetime, date
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'smartstock-secret-2024')

# MySQL Config (XAMPP lokal / env vars untuk produksi) 
app.config['MYSQL_HOST']     = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER']     = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB']       = os.environ.get('MYSQL_DB', 'smartstock')
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# Helper: login required 
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


#  HALAMAN (render template)
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=session.get('username'))

@app.route('/data-barang')
@login_required
def data_barang():
    return render_template('data-barang.html', user=session.get('username'))

@app.route('/transaksi')
@login_required
def transaksi():
    return render_template('transaksi.html', user=session.get('username'))

@app.route('/laporan')
@login_required
def laporan():
    return render_template('laporan.html', user=session.get('username'))


#  API AUTH
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username dan password wajib diisi'}), 400

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
    user = cur.fetchone()
    cur.close()

    if user:
        session['user_id']  = user['id']
        session['username'] = user['username']
        session['nama']     = user['nama']
        return jsonify({'success': True, 'redirect': '/dashboard'})
    else:
        return jsonify({'success': False, 'message': 'Username atau password salah'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'redirect': '/login'})


#  API BARANG
@app.route('/api/barang', methods=['GET'])
@login_required
def get_barang():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM barang ORDER BY nama_barang ASC")
    data = cur.fetchall()
    cur.close()
    return jsonify(data)

@app.route('/api/barang', methods=['POST'])
@login_required
def add_barang():
    d = request.get_json()
    required = ['kode_barang', 'nama_barang', 'kategori', 'satuan']
    for r in required:
        if not d.get(r):
            return jsonify({'success': False, 'message': f'{r} wajib diisi'}), 400

    cur = mysql.connection.cursor()
    # cek kode duplikat
    cur.execute("SELECT id FROM barang WHERE kode_barang = %s", (d['kode_barang'],))
    if cur.fetchone():
        cur.close()
        return jsonify({'success': False, 'message': 'Kode barang sudah digunakan'}), 409

    cur.execute("""
        INSERT INTO barang (kode_barang, nama_barang, kategori, satuan, harga, stok, stok_min, keterangan)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        d['kode_barang'], d['nama_barang'], d['kategori'],
        d['satuan'],
        d.get('harga', 0),
        d.get('stok', 0),
        d.get('stok_min', 10),
        d.get('keterangan', '')
    ))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Barang berhasil ditambahkan'})

@app.route('/api/barang/<int:id>', methods=['PUT'])
@login_required
def update_barang(id):
    d = request.get_json()
    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE barang SET nama_barang=%s, kategori=%s, satuan=%s,
        harga=%s, stok_min=%s, keterangan=%s
        WHERE id=%s
    """, (
        d['nama_barang'], d['kategori'], d['satuan'],
        d.get('harga', 0), d.get('stok_min', 10),
        d.get('keterangan', ''), id
    ))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Barang berhasil diperbarui'})

@app.route('/api/barang/<int:id>', methods=['DELETE'])
@login_required
def delete_barang(id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM barang WHERE id = %s", (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Barang berhasil dihapus'})


#  API TRANSAKSI
@app.route('/api/transaksi', methods=['GET'])
@login_required
def get_transaksi():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT t.*, b.kode_barang, b.nama_barang
        FROM transaksi t
        JOIN barang b ON t.barang_id = b.id
        ORDER BY t.tanggal DESC, t.id DESC
        LIMIT 200
    """)
    data = cur.fetchall()
    cur.close()
    # serialize date
    for row in data:
        if isinstance(row.get('tanggal'), date):
            row['tanggal'] = row['tanggal'].isoformat()
    return jsonify(data)

@app.route('/api/transaksi', methods=['POST'])
@login_required
def add_transaksi():
    d = request.get_json()
    barang_id = d.get('barang_id')
    jenis     = d.get('jenis')
    jumlah    = int(d.get('jumlah', 0))
    tanggal   = d.get('tanggal', date.today().isoformat())

    if not barang_id or not jenis or jumlah <= 0:
        return jsonify({'success': False, 'message': 'Data tidak lengkap'}), 400

    cur = mysql.connection.cursor()
    cur.execute("SELECT stok FROM barang WHERE id = %s", (barang_id,))
    barang = cur.fetchone()
    if not barang:
        cur.close()
        return jsonify({'success': False, 'message': 'Barang tidak ditemukan'}), 404

    stok_baru = barang['stok'] + jumlah if jenis == 'masuk' else barang['stok'] - jumlah
    if stok_baru < 0:
        cur.close()
        return jsonify({'success': False, 'message': f'Stok tidak cukup. Stok saat ini: {barang["stok"]}'}), 400

    cur.execute("""
        INSERT INTO transaksi (barang_id, jenis, jumlah, tanggal, keterangan, petugas)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (barang_id, jenis, jumlah, tanggal, d.get('keterangan', ''), session.get('nama', 'Admin')))

    cur.execute("UPDATE barang SET stok = %s WHERE id = %s", (stok_baru, barang_id))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Transaksi berhasil disimpan', 'stok_baru': stok_baru})

@app.route('/api/transaksi/<int:id>', methods=['DELETE'])
@login_required
def delete_transaksi(id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM transaksi WHERE id = %s", (id,))
    t = cur.fetchone()
    if not t:
        cur.close()
        return jsonify({'success': False, 'message': 'Transaksi tidak ditemukan'}), 404

    # kembalikan stok
    delta = t['jumlah'] if t['jenis'] == 'keluar' else -t['jumlah']
    cur.execute("UPDATE barang SET stok = stok + %s WHERE id = %s", (delta, t['barang_id']))
    cur.execute("DELETE FROM transaksi WHERE id = %s", (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Transaksi dihapus & stok dikembalikan'})


#  API DASHBOARD & LAPORAN
@app.route('/api/dashboard', methods=['GET'])
@login_required
def api_dashboard():
    cur = mysql.connection.cursor()

    cur.execute("SELECT COUNT(*) as total FROM barang")
    total_barang = cur.fetchone()['total']

    cur.execute("SELECT COALESCE(SUM(jumlah),0) as total FROM transaksi WHERE jenis='masuk'")
    total_masuk = cur.fetchone()['total']

    cur.execute("SELECT COALESCE(SUM(jumlah),0) as total FROM transaksi WHERE jenis='keluar'")
    total_keluar = cur.fetchone()['total']

    cur.execute("SELECT COUNT(*) as total FROM barang WHERE stok <= stok_min")
    total_menipis = cur.fetchone()['total']

    cur.execute("SELECT * FROM barang WHERE stok <= stok_min ORDER BY stok ASC LIMIT 10")
    stok_menipis = cur.fetchall()

    cur.execute("""
        SELECT t.*, b.kode_barang, b.nama_barang
        FROM transaksi t JOIN barang b ON t.barang_id = b.id
        ORDER BY t.tanggal DESC, t.id DESC LIMIT 10
    """)
    transaksi_terbaru = cur.fetchall()
    for row in transaksi_terbaru:
        if isinstance(row.get('tanggal'), date):
            row['tanggal'] = row['tanggal'].isoformat()
    cur.close()

    return jsonify({
        'total_barang':    total_barang,
        'total_masuk':     int(total_masuk),
        'total_keluar':    int(total_keluar),
        'total_menipis':   total_menipis,
        'stok_menipis':    stok_menipis,
        'transaksi_terbaru': transaksi_terbaru
    })

@app.route('/api/laporan', methods=['GET'])
@login_required
def api_laporan():
    jenis    = request.args.get('jenis', 'stok')
    tgl_awal = request.args.get('tgl_awal', '')
    tgl_akhir = request.args.get('tgl_akhir', '')

    cur = mysql.connection.cursor()

    if jenis == 'stok':
        cur.execute("SELECT * FROM barang ORDER BY nama_barang")
        data = cur.fetchall()
    elif jenis in ('transaksi', 'masuk', 'keluar'):
        sql = """
            SELECT t.*, b.kode_barang, b.nama_barang, b.kategori, b.satuan
            FROM transaksi t JOIN barang b ON t.barang_id = b.id
            WHERE 1=1
        """
        params = []
        if jenis in ('masuk', 'keluar'):
            sql += " AND t.jenis = %s"
            params.append(jenis)
        if tgl_awal:
            sql += " AND t.tanggal >= %s"
            params.append(tgl_awal)
        if tgl_akhir:
            sql += " AND t.tanggal <= %s"
            params.append(tgl_akhir)
        sql += " ORDER BY t.tanggal DESC, t.id DESC"
        cur.execute(sql, params)
        data = cur.fetchall()
        for row in data:
            if isinstance(row.get('tanggal'), date):
                row['tanggal'] = row['tanggal'].isoformat()
    else:
        data = []

    cur.close()
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True, port=5001)
