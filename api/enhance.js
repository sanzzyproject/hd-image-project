// api/enhance.js
const axios = require('axios');

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body; // Menerima URL atau Base64 string

  if (!image) {
    return res.status(400).json({ error: 'Image URL or Base64 is required' });
  }

  try {
    const result = await aienhancer(image);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// Fungsi utama dari snippet Anda (sedikit dimodifikasi untuk serverless)
async function aienhancer(image, { model = 3, settings = 'kRpBbpnRCD2nL2RxnnuoMo7MBc0zHndTDkWMl9aW+Gw=' } = {}) {
  let base64;

  // Cek apakah input adalah URL atau sudah Base64 murni (data:image...)
  if (/^https?:\/\//.test(image)) {
    const img = await axios.get(image, { responseType: 'arraybuffer' });
    base64 = Buffer.from(img.data).toString('base64');
  } else if (image.startsWith('data:image')) {
    // Jika input dari frontend adalah data URI scheme, ambil bagian base64-nya saja
    base64 = image.split(',')[1];
  } else {
    // Asumsikan raw base64 string
    base64 = image;
  }

  const headers = {
    authority: 'aienhancer.ai',
    accept: '*/*',
    'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
    'content-type': 'application/json',
    origin: 'https://aienhancer.ai',
    referer: 'https://aienhancer.ai/hd-picture-converter',
    'sec-ch-ua': '\'Chromium\';v=\'139\', \'Not;A=Brand\';v=\'99\'',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '\'Android\'',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
  };

  const create = await axios.post('https://aienhancer.ai/api/v1/r/image-enhance/create', {
    model,
    image: 'data:image/png;base64,' + base64,
    settings
  }, { headers });

  const taskId = create.data?.data?.id;
  if (!taskId) throw new Error('Gagal membuat task ID');

  // Polling status
  let attempts = 0;
  while (attempts < 30) { // Limit attempts agar tidak timeout di Vercel (max 60s)
    await new Promise(r => setTimeout(r, 2000));
    
    const result = await axios.post('https://aienhancer.ai/api/v1/r/image-enhance/result', {
      task_id: taskId
    }, { headers });

    const status = result.data?.data?.status;

    if (status === 'succeeded') {
      return {
        id: result.data.data.id,
        input: result.data.data.input,
        output: result.data.data.output,
        completed_at: result.data.data.completed_at
      };
    }
    if (status === 'failed') {
      throw new Error('Enhance gagal dari server pusat');
    }
    attempts++;
  }
  throw new Error('Timeout: Proses memakan waktu terlalu lama.');
}
