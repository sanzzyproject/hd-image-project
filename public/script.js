async function processImage() {
    const urlInput = document.getElementById('imageUrl').value;
    const fileInput = document.getElementById('imageFile').files[0];
    const statusText = document.getElementById('statusText');
    const btn = document.getElementById('enhanceBtn');
    const resultContainer = document.getElementById('resultContainer');

    // Reset UI
    statusText.textContent = "";
    resultContainer.classList.add('hidden');

    let payload = null;

    // Validasi Input
    if (urlInput) {
        payload = urlInput;
    } else if (fileInput) {
        // Konversi file ke Base64
        statusText.textContent = "Membaca file...";
        try {
            payload = await toBase64(fileInput);
        } catch (e) {
            statusText.textContent = "Gagal membaca file.";
            return;
        }
    } else {
        alert("Harap masukkan URL atau Upload gambar.");
        return;
    }

    // Set Loading State
    btn.disabled = true;
    btn.textContent = "Sedang Memproses... (±10 detik)";
    statusText.textContent = "Mengirim ke AI server...";

    try {
        const response = await fetch('/api/enhance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: payload })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan pada server');
        }

        // Tampilkan Hasil
        document.getElementById('imgInput').src = data.input;
        document.getElementById('imgOutput').src = data.output;
        document.getElementById('downloadLink').href = data.output;
        
        resultContainer.classList.remove('hidden');
        statusText.textContent = "Selesai!";

    } catch (error) {
        console.error(error);
        statusText.textContent = "Error: " + error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = "Perjelas Foto (HD)";
    }
}

// Helper: Convert File to Base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
