// public/script.js

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

    // 1. Siapkan Gambar (Base64 atau URL)
    if (urlInput) {
        payload = urlInput;
    } else if (fileInput) {
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

    btn.disabled = true;
    btn.textContent = "Sedang Mengupload...";
    statusText.textContent = "Mengirim gambar ke server...";

    try {
        // 2. TAHAP 1: Submit Task
        const submitResponse = await fetch('/api/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submit', image: payload })
        });

        // Safe JSON Parsing (Mencegah error 'Unexpected token')
        const submitText = await submitResponse.text();
        let submitData;
        try {
            submitData = JSON.parse(submitText);
        } catch (e) {
            throw new Error("Server error (HTML response): " + submitText.substring(0, 50) + "...");
        }

        if (!submitResponse.ok || !submitData.success) {
            throw new Error(submitData.error || 'Gagal mengirim task.');
        }

        const taskId = submitData.task_id;
        statusText.textContent = "Memproses di AI... (Mohon tunggu)";
        
        // 3. TAHAP 2: Polling (Cek status berulang-ulang)
        let attempts = 0;
        const maxAttempts = 30; // Batas waktu tunggu (30 x 2 detik = 60 detik)
        
        const pollInterval = setInterval(async () => {
            attempts++;
            btn.textContent = `Memproses... (${attempts}s)`;
            
            try {
                const checkResponse = await fetch('/api/enhance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'retrieve', task_id: taskId })
                });

                const checkData = await checkResponse.json();
                
                if (checkData.status === 'succeeded') {
                    // BERHASIL
                    clearInterval(pollInterval);
                    document.getElementById('imgInput').src = checkData.input;
                    document.getElementById('imgOutput').src = checkData.output;
                    document.getElementById('downloadLink').href = checkData.output;
                    
                    resultContainer.classList.remove('hidden');
                    statusText.textContent = "Selesai! Gambar berhasil diperjelas.";
                    btn.disabled = false;
                    btn.textContent = "Perjelas Foto (HD)";
                } else if (checkData.status === 'failed') {
                    // GAGAL DARI AI
                    clearInterval(pollInterval);
                    throw new Error("AI gagal memproses gambar ini.");
                } else {
                    // MASIH PROSES (Waiting/Processing)
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        throw new Error("Waktu habis (Timeout). Coba lagi nanti.");
                    }
                    // Lanjut looping...
                }

            } catch (err) {
                clearInterval(pollInterval);
                handleError(err);
            }
        }, 2000); // Cek setiap 2 detik

    } catch (error) {
        handleError(error);
    }
}

function handleError(error) {
    console.error(error);
    document.getElementById('statusText').textContent = "Error: " + error.message;
    const btn = document.getElementById('enhanceBtn');
    btn.disabled = false;
    btn.textContent = "Perjelas Foto (HD)";
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
