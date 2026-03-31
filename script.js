// ========== KONFIGURASI ==========
// Ganti dengan URL Google Apps Script Anda
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5hBEacAKKv1jzq9M3HNRHUdhLh42VeiYxASoZ9pFZy3jGqltuLUSnSK5bSMF9F6IIhQ/exec';

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
    
    // Pindah ke halaman presensi
    welcomePage.style.display = 'none';
    presensiPage.style.display = 'block';
    
    // Reset form
    resetForm();
    
    // Mulai kamera
    startCamera();
}

// ========== FUNGSI: KEMBALI KE DAFTAR MATA KULIAH ==========
function kembaliKeDaftar() {
    // Matikan kamera
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // Kembali ke halaman welcome
    presensiPage.style.display = 'none';
    welcomePage.style.display = 'block';
    
    // Reset variabel
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
        
        // Aktifkan tombol ambil foto
        ambilFotoBtn.disabled = false;
        console.log("Kamera siap");
        
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

    // Set ukuran canvas sesuai video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Gambar frame video ke canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Konversi ke base64 (kualitas 70% agar ukuran lebih kecil)
    fotoData = canvas.toDataURL('image/jpeg', 0.7);
    
    // Tampilkan indikator
    photoResultDiv.style.display = 'block';
    ambilFotoBtn.innerHTML = '✓ Foto Tersimpan';
    ambilFotoBtn.style.background = '#4caf50';
    
    // Cek kelengkapan form
    checkFormComplete();
    
    console.log("Foto berhasil diambil, ukuran:", Math.round(fotoData.length / 1024), "KB");
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

// ========== FUNGSI: UPLOAD FOTO KE GOOGLE DRIVE ==========
async function uploadFotoKeDrive(fotoBase64, nim, nama, matkul) {
    // Karena Google Apps Script kita akan handle upload foto ke Drive
    // Data akan dikirim bersama dengan informasi lainnya
    // Apps Script akan memisahkan foto dan menyimpannya ke Drive
    
    const data = {
        nim: nim,
        nama: nama,
        mataKuliah: matkul,
        foto: fotoBase64,
        waktu: new Date().toISOString()
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log("Data terkirim ke Google Sheets");
        return true;
        
    } catch (error) {
        console.error("Error saat mengirim:", error);
        return false;
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
    
    const success = await uploadFotoKeDrive(fotoData, nim, nama, selectedMataKuliah);
    
    if (success) {
        showStatus("✅ Presensi berhasil! Data telah tersimpan.", "success");
        resetForm();
        return true;
    } else {
        showStatus("❌ Gagal mengirim data. Coba lagi.", "error");
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
// Tombol mata kuliah
document.querySelectorAll('.matkul-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const matkul = btn.getAttribute('data-matkul');
        pilihMataKuliah(matkul);
    });
});

// Tombol kembali
backBtn.addEventListener('click', kembaliKeDaftar);

// Input form
nimInput.addEventListener('input', checkFormComplete);
namaInput.addEventListener('input', checkFormComplete);

// Tombol ambil foto
ambilFotoBtn.addEventListener('click', ambilFoto);

// Tombol submit
submitBtn.addEventListener('click', kirimPresensi);

// Cek dukungan kamera
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showStatus("Browser Anda tidak mendukung akses kamera. Gunakan Chrome, Firefox, atau Safari.", "error");
    ambilFotoBtn.disabled = true;
}
