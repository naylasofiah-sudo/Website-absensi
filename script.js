// ========== KONFIGURASI ==========
// GANTI DENGAN URL APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFJ-y2hDHY_nkOZqgssmPZbx5nJmBEkjPEtJ1kh3zBod91p65fP770JnZc_FAx40xF7A/exec';

// ========== VARIABEL GLOBAL ==========
let fotoData = null;
let videoStream = null;
let selectedMataKuliah = '';

// ========== ELEMEN DOM ==========
const welcomePage = document.getElementById('welcomePage');
const presensiPage = document.getElementById('presensiPage');
const selectedMatkulSpan = document.getElementById('selectedMatkul');
const nimInput = document.getElementById('nim');
const namaInput = document.getElementById('nama');
const ambilFotoBtn = document.getElementById('ambilFotoBtn');
const submitBtn = document.getElementById('submitBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const photoResultDiv = document.getElementById('photoResult');
const statusDiv = document.getElementById('statusMessage');
const backBtn = document.getElementById('backBtn');

// ========== FUNGSI: PILIH MATA KULIAH ==========
function pilihMataKuliah(matkul) {
    selectedMataKuliah = matkul;
    selectedMatkulSpan.textContent = matkul;
    
    welcomePage.style.display = 'none';
    presensiPage.style.display = 'block';
    
    resetForm();
    startCamera();
}

// ========== FUNGSI: KEMBALI KE DAFTAR ==========
function kembaliKeDaftar() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    presensiPage.style.display = 'none';
    welcomePage.style.display = 'block';
    
    fotoData = null;
    selectedMataKuliah = '';
}

// ========== FUNGSI: AKSES KAMERA ==========
async function startCamera() {
    try {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }
        });
        video.srcObject = videoStream;
        await video.play();
        
        ambilFotoBtn.disabled = false;
        
    } catch (error) {
        console.error("Error kamera:", error);
        showStatus("Tidak dapat mengakses kamera. Pastikan izin diberikan.", "error");
        ambilFotoBtn.disabled = true;
    }
}

// ========== FUNGSI: AMBIL FOTO ==========
function ambilFoto() {
    if (!video.videoWidth || !video.videoHeight) {
        showStatus("Kamera belum siap. Tunggu sebentar.", "error");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    fotoData = canvas.toDataURL('image/jpeg', 0.7);
    
    photoResultDiv.style.display = 'block';
    ambilFotoBtn.innerHTML = '✓ Foto Tersimpan';
    ambilFotoBtn.style.background = '#4caf50';
    
    checkFormComplete();
}

// ========== FUNGSI: CEK KELENGKAPAN FORM ==========
function checkFormComplete() {
    const nim = nimInput.value.trim();
    const nama = namaInput.value.trim();
    
    if (nim && nama && fotoData && selectedMataKuliah) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

// ========== FUNGSI: TAMPILKAN STATUS ==========
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    if (type !== 'loading') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.className = 'status';
        }, 5000);
    }
}

// ========== FUNGSI: KIRIM PRESENSI ==========
async function kirimPresensi() {
    const nim = nimInput.value.trim();
    const nama = namaInput.value.trim();
    
    if (!nim || !nama || !fotoData || !selectedMataKuliah) {
        showStatus("Lengkapi semua data dan foto!", "error");
        return false;
    }
    
    showStatus("⏳ Mengirim data presensi...", "loading");
    
    submitBtn.disabled = true;
    ambilFotoBtn.disabled = true;
    
    // Buat data dengan format FORM URL ENCODED
    const formData = new URLSearchParams();
    formData.append('nim', nim);
    formData.append('nama', nama);
    formData.append('mataKuliah', selectedMataKuliah);
    formData.append('foto', fotoData);
    formData.append('waktu', new Date().toISOString());
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });
        
        const result = await response.text();
        console.log("Response dari server:", result);
        
        if (result === 'SUKSES' || result.includes('SUKSES')) {
            showStatus("✅ Presensi berhasil! Data telah tersimpan.", "success");
            resetForm();
            return true;
        } else {
            showStatus("❌ Presensi gagal: " + result, "error");
            submitBtn.disabled = false;
            ambilFotoBtn.disabled = false;
            return false;
        }
        
    } catch (error) {
        console.error("Error saat mengirim:", error);
        showStatus("❌ Gagal mengirim data. Cek koneksi internet.", "error");
        submitBtn.disabled = false;
        ambilFotoBtn.disabled = false;
        return false;
    }
}

// ========== FUNGSI: RESET FORM ==========
function resetForm() {
    nimInput.value = '';
    namaInput.value = '';
    fotoData = null;
    photoResultDiv.style.display = 'none';
    ambilFotoBtn.innerHTML = '📷 Ambil Foto';
    ambilFotoBtn.style.background = '#ff9800';
    submitBtn.disabled = true;
    
    // Restart kamera
    startCamera();
}

// ========== EVENT LISTENERS ==========
document.querySelectorAll('.matkul-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const matkul = btn.getAttribute('data-matkul');
        pilihMataKuliah(matkul);
    });
});

backBtn.addEventListener('click', kembaliKeDaftar);
nimInput.addEventListener('input', checkFormComplete);
namaInput.addEventListener('input', checkFormComplete);
ambilFotoBtn.addEventListener('click', ambilFoto);
submitBtn.addEventListener('click', kirimPresensi);

// ========== CEK DUKUNGAN KAMERA ==========
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showStatus("Browser Anda tidak mendukung akses kamera. Gunakan Chrome, Firefox, atau Safari.", "error");
    ambilFotoBtn.disabled = true;
}
