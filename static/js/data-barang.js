// State 
let allBarang     = [];
let editId        = null;
let hapusId       = null;
const modalBarang = new bootstrap.Modal(document.getElementById('modalBarang'));
const modalHapus  = new bootstrap.Modal(document.getElementById('modalHapus'));

// Load data 
async function loadBarang() {
  try {
    const res = await fetch('/api/barang');
    if (res.status === 401) { window.location.href = '/login'; return; }
    allBarang = await res.json();
    renderTabel(allBarang);
    updateKategoriFilter(allBarang);
  } catch (err) {
    console.error(err);
    showToast('Gagal memuat data barang', 'danger');
  }
}

// Render tabel 
function renderTabel(data) {
  const tbody = document.getElementById('tabelBarang');
  document.getElementById('jumlahData').textContent = `${data.length} data`;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada data yang cocok</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((b, i) => {
    const menipis = b.stok <= b.stok_min;
    const habis   = b.stok === 0;
    const badge   = habis   ? `<span class="badge-stok-habis">Habis</span>`
                  : menipis ? `<span class="badge-stok-menipis"><i class="bi bi-exclamation-triangle-fill me-1"></i>Menipis</span>`
                  :           `<span class="badge-stok-aman"><i class="bi bi-check-circle me-1"></i>Aman</span>`;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="badge bg-secondary">${b.kode_barang}</span></td>
        <td class="fw-semibold">${b.nama_barang}</td>
        <td>${b.kategori}</td>
        <td>${b.satuan}</td>
        <td>${rupiah(b.harga)}</td>
        <td><span class="fw-bold ${menipis ? 'text-danger' : 'text-dark'}">${b.stok}</span></td>
        <td>${badge}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editBarang(${b.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="konfirmasiHapus(${b.id}, '${b.nama_barang.replace(/'/g, "\\'")}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

// Filter 
function filterBarang() {
  const q       = document.getElementById('searchBarang').value.toLowerCase();
  const kat     = document.getElementById('filterKategori').value;
  const stokF   = document.getElementById('filterStok').value;

  const filtered = allBarang.filter(b => {
    const matchSearch = b.nama_barang.toLowerCase().includes(q) || b.kode_barang.toLowerCase().includes(q);
    const matchKat    = kat    ? b.kategori === kat : true;
    const matchStok   = stokF === 'menipis' ? b.stok <= b.stok_min
                      : stokF === 'aman'    ? b.stok >  b.stok_min
                      : true;
    return matchSearch && matchKat && matchStok;
  });

  renderTabel(filtered);
}

['searchBarang', 'filterKategori', 'filterStok'].forEach(id => {
  document.getElementById(id).addEventListener('input', filterBarang);
  document.getElementById(id).addEventListener('change', filterBarang);
});

// Update dropdown kategori 
function updateKategoriFilter(data) {
  const unique = [...new Set(data.map(b => b.kategori))].sort();
  const sel    = document.getElementById('filterKategori');
  const dl     = document.getElementById('listKategori');

  // dropdown filter
  sel.innerHTML = '<option value="">Semua Kategori</option>'
    + unique.map(k => `<option value="${k}">${k}</option>`).join('');

  // datalist modal
  dl.innerHTML = unique.map(k => `<option value="${k}">`).join('');
}

// Reset form modal 
function resetForm() {
  editId = null;
  document.getElementById('editId').value        = '';
  document.getElementById('kodeBarang').value    = '';
  document.getElementById('namaBarang').value    = '';
  document.getElementById('kategoriBarang').value = '';
  document.getElementById('satuanBarang').value  = 'pcs';
  document.getElementById('stokBarang').value    = '0';
  document.getElementById('hargaBarang').value   = '0';
  document.getElementById('stokMin').value       = '10';
  document.getElementById('keteranganBarang').value = '';
  document.getElementById('kodeBarang').disabled = false;
  document.getElementById('stokBarang').disabled = false;
  document.getElementById('modalTitle').innerHTML = '<i class="bi bi-box me-2"></i>Tambah Barang';
}

// Buka modal tambah 
document.getElementById('btnTambahBarang').addEventListener('click', () => {
  resetForm();
  modalBarang.show();
});

document.getElementById('modalBarang').addEventListener('hidden.bs.modal', resetForm);

// Edit barang 
function editBarang(id) {
  const b = allBarang.find(x => x.id === id);
  if (!b) return;
  editId = id;
  document.getElementById('editId').value          = id;
  document.getElementById('kodeBarang').value      = b.kode_barang;
  document.getElementById('namaBarang').value      = b.nama_barang;
  document.getElementById('kategoriBarang').value  = b.kategori;
  document.getElementById('satuanBarang').value    = b.satuan;
  document.getElementById('stokBarang').value      = b.stok;
  document.getElementById('hargaBarang').value     = b.harga;
  document.getElementById('stokMin').value         = b.stok_min;
  document.getElementById('keteranganBarang').value = b.keterangan || '';

  // kode & stok tidak bisa diubah lewat form edit (gunakan transaksi untuk stok)
  document.getElementById('kodeBarang').disabled   = true;
  document.getElementById('stokBarang').disabled   = true;
  document.getElementById('modalTitle').innerHTML  = '<i class="bi bi-pencil me-2"></i>Edit Barang';
  modalBarang.show();
}

// Simpan (tambah / edit) 
document.getElementById('btnSimpanBarang').addEventListener('click', async () => {
  const payload = {
    kode_barang:  document.getElementById('kodeBarang').value.trim(),
    nama_barang:  document.getElementById('namaBarang').value.trim(),
    kategori:     document.getElementById('kategoriBarang').value.trim(),
    satuan:       document.getElementById('satuanBarang').value,
    stok:         parseInt(document.getElementById('stokBarang').value) || 0,
    harga:        parseFloat(document.getElementById('hargaBarang').value) || 0,
    stok_min:     parseInt(document.getElementById('stokMin').value) || 10,
    keterangan:   document.getElementById('keteranganBarang').value.trim()
  };

  if (!payload.kode_barang || !payload.nama_barang || !payload.kategori) {
    showToast('Kode, nama, dan kategori wajib diisi!', 'warning');
    return;
  }

  try {
    const url    = editId ? `/api/barang/${editId}` : '/api/barang';
    const method = editId ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      modalBarang.hide();
      loadBarang();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan', 'danger');
  }
});

// Hapus 
function konfirmasiHapus(id, nama) {
  hapusId = id;
  document.getElementById('namaHapus').textContent = nama;
  modalHapus.show();
}

document.getElementById('btnKonfirmasiHapus').addEventListener('click', async () => {
  if (!hapusId) return;
  try {
    const res  = await fetch(`/api/barang/${hapusId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      modalHapus.hide();
      loadBarang();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Terjadi kesalahan', 'danger');
  }
});

// Init 
loadBarang();
