// api/enhance.js
const axios = require('axios');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, image, task_id, model = 3 } = req.body;

  // Header yang meniru browser agar tidak diblokir
  const headers = {
    authority: 'aienhancer.ai',
    accept: '*/*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type': 'application/json',
    origin: 'https://aienhancer.ai',
    referer: 'https://aienhancer.ai/hd-picture-converter',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
  };

  try {
    // --- AKSI 1: SUBMIT GAMBAR BARU ---
    if (action === 'submit') {
      if (!image) return res.status(400).json({ error: 'Image required' });

      let base64 = image;
      // Bersihkan prefix data url jika ada
      if (image.startsWith('data:image')) {
        base64 = image.split(',')[1];
      } else if (/^https?:\/\//.test(image)) {
        // Jika URL, download dulu
        const imgParams = await axios.get(image, { responseType: 'arraybuffer' });
        base64 = Buffer.from(imgParams.data).toString('base64');
      }

      const create = await axios.post('https://aienhancer.ai/api/v1/r/image-enhance/create', {
        model,
        image: 'data:image/png;base64,' + base64,
        settings: 'kRpBbpnRCD2nL2RxnnuoMo7MBc0zHndTDkWMl9aW+Gw=' 
      }, { headers });

      if (create.data?.data?.id) {
        return res.status(200).json({ success: true, task_id: create.data.data.id });
      } else {
        throw new Error('Gagal mendapatkan Task ID dari server AI.');
      }
    }

    // --- AKSI 2: CEK STATUS (POLLING) ---
    else if (action === 'retrieve') {
      if (!task_id) return res.status(400).json({ error: 'Task ID required' });

      const result = await axios.post('https://aienhancer.ai/api/v1/r/image-enhance/result', {
        task_id: task_id
      }, { headers });

      const data = result.data?.data;
      
      // Kirim status apa adanya ke frontend (waiting, processing, succeeded, failed)
      return res.status(200).json({ 
        status: data?.status || 'unknown',
        output: data?.output || null,
        input: data?.input || null
      });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error("Backend Error:", error.message);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
