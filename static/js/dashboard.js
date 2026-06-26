// Dashboard: load data dari API 
async function loadDashboard() {
  try {
    const res  = await fetch('/api/dashboard');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();

    // Summary cards
    document.getElementById('totalBarang').textContent  = data.total_barang;
    document.getElementById('totalMasuk').textContent   = data.total_masuk;
    document.getElementById('totalKeluar').textContent  = data.total_keluar;
    document.getElementById('totalMenipis').textContent = data.total_menipis;

    // Tabel stok menipis
    const tbody = document.getElementById('tabelMenipis');
    if (data.stok_menipis.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3"><i class="bi bi-check-circle text-success me-1"></i>Semua stok aman</td></tr>';
    } else {
      tbody.innerHTML = data.stok_menipis.map(b => `
        <tr>
          <td><span class="badge bg-secondary">${b.kode_barang}</span></td>
          <td>${b.nama_barang}</td>
          <td>${b.kategori}</td>
          <td>
            <span class="${b.stok === 0 ? 'badge-stok-habis' : 'badge-stok-menipis'}">
              ${b.stok} ${b.satuan}
            </span>
          </td>
        </tr>`).join('');
    }

    // List transaksi terbaru
    const list = document.getElementById('listTransaksi');
    if (data.transaksi_terbaru.length === 0) {
      list.innerHTML = '<li class="list-group-item text-muted text-center py-3">Belum ada transaksi</li>';
    } else {
      list.innerHTML = data.transaksi_terbaru.map(t => {
        const isMasuk = t.jenis === 'masuk';
        return `
          <li class="list-group-item d-flex align-items-center gap-2 py-2">
            <span class="badge ${isMasuk ? 'bg-success' : 'bg-warning text-dark'} rounded-pill" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
              <i class="bi ${isMasuk ? 'bi-arrow-down' : 'bi-arrow-up'}"></i>
            </span>
            <div class="flex-grow-1 small">
              <div class="fw-semibold">${t.nama_barang}</div>
              <div class="text-muted">${t.tanggal} · ${isMasuk ? '+' : '-'}${t.jumlah} ${t.satuan || ''}</div>
            </div>
          </li>`;
      }).join('');
    }

  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

loadDashboard();
