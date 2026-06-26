// State 
let allTransaksi   = [];
let allBarang      = [];
let hapusId        = null;
const modalT       = new bootstrap.Modal(document.getElementById('modalTransaksi'));
const modalHapusT  = new bootstrap.Modal(document.getElementById('modalHapusTransaksi'));

// Load data 
async function loadAll() {
  try {
    const [resT, resB] = await Promise.all([
      fetch('/api/transaksi'),
      fetch('/api/barang')
    ]);
    if (resT.status === 401) { window.location.href = '/login'; return; }
    allTransaksi = await resT.json();
    allBarang    = await resB.json();
    renderTabel(allTransaksi);
    populatePilihBarang();
  } catch (err) {
    showToast('Gagal memuat data', 'danger');
  }
}

// Render tabel transaksi 
function renderTabel(data) {
  const tbody = document.getElementById('tabelTransaksi');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada data transaksi</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((t, i) => {
    const isMasuk = t.jenis === 'masuk';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${t.tanggal}</td>
        <td><span class="badge bg-secondary">${t.kode_barang}</span></td>
        <td>${t.nama_barang}</td>
        <td>
          <span class="badge ${isMasuk ? 'bg-success' : 'bg-warning text-dark'}">
            <i class="bi ${isMasuk ? 'bi-arrow-down' : 'bi-arrow-up'} me-1"></i>
            ${isMasuk ? 'Masuk' : 'Keluar'}
          </span>
        </td>
        <td class="fw-semibold ${isMasuk ? 'text-success' : 'text-warning'}">${isMasuk ? '+' : '-'}${t.jumlah}</td>
        <td class="text-muted small">${t.keterangan || '-'}</td>
        <td>${t.petugas || '-'}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger" onclick="konfirmasiHapus(${t.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

// Filter 
function applyFilter() {
  const q       = document.getElementById('searchTransaksi').value.toLowerCase();
  const jenis   = document.getElementById('filterJenis').value;
  const tanggal = document.getElementById('filterTanggal').value;

  const filtered = allTransaksi.filter(t => {
    const matchQ = t.nama_barang.toLowerCase().includes(q) || t.kode_barang.toLowerCase().includes(q);
    const matchJ = jenis   ? t.jenis === jenis        : true;
    const matchD = tanggal ? t.tanggal === tanggal    : true;
    return matchQ && matchJ && matchD;
  });
  renderTabel(filtered);
}

['searchTransaksi', 'filterJenis', 'filterTanggal'].forEach(id => {
  document.getElementById(id).addEventListener('input', applyFilter);
  document.getElementById(id).addEventListener('change', applyFilter);
});

document.getElementById('btnResetFilter').addEventListener('click', () => {
  document.getElementById('searchTransaksi').value = '';
  document.getElementById('filterJenis').value     = '';
  document.getElementById('filterTanggal').value   = '';
  renderTabel(allTransaksi);
});

// Populate dropdown barang di modal 
function populatePilihBarang() {
  const sel = document.getElementById('pilihBarang');
  sel.innerHTML = '<option value="">-- Pilih Barang --</option>'
    + allBarang.map(b => `<option value="${b.id}" data-stok="${b.stok}" data-satuan="${b.satuan}">${b.kode_barang} - ${b.nama_barang}</option>`).join('');
}

document.getElementById('pilihBarang').addEventListener('change', function () {
  const opt = this.options[this.selectedIndex];
  const wrapper = document.getElementById('infoStokWrapper');
  if (this.value) {
    document.getElementById('stokSaatIni').textContent = `${opt.dataset.stok} ${opt.dataset.satuan}`;
    wrapper.style.display = 'block';
  } else {
    wrapper.style.display = 'none';
  }
});

// Set tanggal hari ini di modal 
document.getElementById('modalTransaksi').addEventListener('show.bs.modal', () => {
  document.getElementById('tanggalTransaksi').value = new Date().toISOString().split('T')[0];
  document.getElementById('jumlahTransaksi').value  = 1;
  document.getElementById('pilihBarang').value      = '';
  document.getElementById('keteranganTransaksi').value = '';
  document.getElementById('infoStokWrapper').style.display = 'none';
  document.querySelector('input[name="jenisTransaksi"][value="masuk"]').checked = true;
});

// Simpan transaksi
document.getElementById('btnSimpanTransaksi').addEventListener('click', async () => {
  const barang_id = document.getElementById('pilihBarang').value;
  const jenis     = document.querySelector('input[name="jenisTransaksi"]:checked').value;
  const jumlah    = parseInt(document.getElementById('jumlahTransaksi').value);
  const tanggal   = document.getElementById('tanggalTransaksi').value;
  const ket       = document.getElementById('keteranganTransaksi').value.trim();

  if (!barang_id) { showToast('Pilih barang terlebih dahulu!', 'warning'); return; }
  if (!jumlah || jumlah < 1) { showToast('Jumlah harus minimal 1!', 'warning'); return; }
  if (!tanggal) { showToast('Tanggal wajib diisi!', 'warning'); return; }

  try {
    const res  = await fetch('/api/transaksi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ barang_id: parseInt(barang_id), jenis, jumlah, tanggal, keterangan: ket })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      modalT.hide();
      loadAll();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan', 'danger');
  }
});

// Hapus transaksi 
function konfirmasiHapus(id) {
  hapusId = id;
  modalHapusT.show();
}

document.getElementById('btnKonfirmasiHapusTransaksi').addEventListener('click', async () => {
  if (!hapusId) return;
  try {
    const res  = await fetch(`/api/transaksi/${hapusId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      modalHapusT.hide();
      loadAll();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan', 'danger');
  }
});

// Init 
loadAll();
