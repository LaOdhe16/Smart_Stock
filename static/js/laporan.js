// Laporan 
const HEADER_CONFIG = {
  stok: {
    cols: ['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Harga', 'Stok', 'Stok Min', 'Status'],
    title: 'Laporan Stok Barang'
  },
  transaksi: {
    cols: ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Kategori', 'Jenis', 'Jumlah', 'Satuan', 'Petugas', 'Keterangan'],
    title: 'Laporan Transaksi'
  },
  masuk: {
    cols: ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Kategori', 'Jumlah', 'Satuan', 'Petugas', 'Keterangan'],
    title: 'Laporan Barang Masuk'
  },
  keluar: {
    cols: ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Kategori', 'Jumlah', 'Satuan', 'Petugas', 'Keterangan'],
    title: 'Laporan Barang Keluar'
  }
};

async function tampilkanLaporan() {
  const jenis    = document.getElementById('jenisLaporan').value;
  const tglAwal  = document.getElementById('tglAwal').value;
  const tglAkhir = document.getElementById('tglAkhir').value;

  const params = new URLSearchParams({ jenis });
  if (tglAwal)  params.append('tgl_awal',  tglAwal);
  if (tglAkhir) params.append('tgl_akhir', tglAkhir);

  try {
    const res  = await fetch(`/api/laporan?${params}`);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    renderLaporan(jenis, data, tglAwal, tglAkhir);
  } catch (err) {
    showToast('Gagal memuat laporan', 'danger');
  }
}

function renderLaporan(jenis, data, tglAwal, tglAkhir) {
  const cfg   = HEADER_CONFIG[jenis];
  const now   = new Date();
  const bln   = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const nowStr = `${now.getDate()} ${bln[now.getMonth()]} ${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Title & generate date
  document.getElementById('titleTabel').textContent  = cfg.title;
  document.getElementById('judulCetak').textContent  = cfg.title;
  document.getElementById('tglGenerate').textContent = `Digenerate: ${nowStr}`;

  // Periode label (print)
  if (tglAwal || tglAkhir) {
    document.getElementById('periodeLabel').textContent = `Periode: ${tglAwal || '-'} s/d ${tglAkhir || '-'}`;
  } else {
    document.getElementById('periodeLabel').textContent = 'Semua periode';
  }

  // Header tabel
  document.getElementById('headerLaporan').innerHTML =
    `<tr>${cfg.cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

  // Body
  const tbody = document.getElementById('bodyLaporan');
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cfg.cols.length}" class="text-center py-4 text-muted">Tidak ada data untuk parameter yang dipilih</td></tr>`;
  } else if (jenis === 'stok') {
    tbody.innerHTML = data.map((b, i) => {
      const menipis = b.stok <= b.stok_min;
      const habis   = b.stok === 0;
      const badge   = habis   ? `<span class="badge-stok-habis">Habis</span>`
                    : menipis ? `<span class="badge-stok-menipis">Menipis</span>`
                    :           `<span class="badge-stok-aman">Aman</span>`;
      return `<tr>
        <td>${i+1}</td>
        <td><span class="badge bg-secondary">${b.kode_barang}</span></td>
        <td>${b.nama_barang}</td>
        <td>${b.kategori}</td>
        <td>${b.satuan}</td>
        <td>${rupiah(b.harga)}</td>
        <td class="fw-bold ${menipis ? 'text-danger' : ''}">${b.stok}</td>
        <td>${b.stok_min}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  } else {
    tbody.innerHTML = data.map((t, i) => {
      const isMasuk = t.jenis === 'masuk';
      const jenisBadge = `<span class="badge ${isMasuk ? 'bg-success' : 'bg-warning text-dark'}">${isMasuk ? 'Masuk' : 'Keluar'}</span>`;
      const cols = jenis === 'transaksi'
        ? `<td>${t.tanggal}</td><td>${t.kode_barang}</td><td>${t.nama_barang}</td><td>${t.kategori}</td><td>${jenisBadge}</td><td>${t.jumlah}</td><td>${t.satuan}</td><td>${t.petugas||'-'}</td><td>${t.keterangan||'-'}</td>`
        : `<td>${t.tanggal}</td><td>${t.kode_barang}</td><td>${t.nama_barang}</td><td>${t.kategori}</td><td>${t.jumlah}</td><td>${t.satuan}</td><td>${t.petugas||'-'}</td><td>${t.keterangan||'-'}</td>`;
      return `<tr><td>${i+1}</td>${cols}</tr>`;
    }).join('');
  }

  // Summary cards
  if (jenis === 'stok') {
    document.getElementById('sumTotal').textContent   = data.length;
    document.getElementById('sumTotalLabel').textContent = 'Total Item';
    document.getElementById('sumMasuk').textContent   = data.reduce((a, b) => a + b.stok, 0);
    document.getElementById('sumKeluar').textContent  = data.reduce((a, b) => a + (b.harga * b.stok), 0).toLocaleString('id-ID');
    document.getElementById('sumMenipis').textContent = data.filter(b => b.stok <= b.stok_min).length;
  } else {
    const masukData  = data.filter(t => t.jenis === 'masuk');
    const keluarData = data.filter(t => t.jenis === 'keluar');
    document.getElementById('sumTotal').textContent   = data.length;
    document.getElementById('sumTotalLabel').textContent = 'Total Transaksi';
    document.getElementById('sumMasuk').textContent   = masukData.reduce((a, t) => a + t.jumlah, 0);
    document.getElementById('sumKeluar').textContent  = keluarData.reduce((a, t) => a + t.jumlah, 0);
    document.getElementById('sumMenipis').textContent = masukData.length + '/' + keluarData.length;
  }

  // Footer (total row untuk stok)
  const tfoot = document.getElementById('footerLaporan');
  if (jenis === 'stok' && data.length > 0) {
    const totalStok = data.reduce((a, b) => a + b.stok, 0);
    tfoot.innerHTML = `<tr><td colspan="6" class="text-end">Total Stok Keseluruhan:</td><td>${totalStok}</td><td colspan="2"></td></tr>`;
  } else {
    tfoot.innerHTML = '';
  }
}

// Event listeners 
document.getElementById('btnTampilkan').addEventListener('click', tampilkanLaporan);

document.getElementById('btnCetak').addEventListener('click', () => {
  document.querySelector('.print-header').classList.remove('d-none');
  window.print();
  document.querySelector('.print-header').classList.add('d-none');
});

// Load default (stok) saat halaman dibuka 
tampilkanLaporan();
