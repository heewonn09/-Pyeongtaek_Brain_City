const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, phone, date, time, floor } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: '필수 항목 누락' });
  }

  const text = [
    '[일레븐타워 방문예약]',
    `성함: ${name}`,
    `연락처: ${phone}`,
    `날짜: ${date || '미정'}`,
    `시간: ${time || '미정'}`,
    `관심층: ${floor || '미지정'}`,
  ].join('\n');

  const apiKey    = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const toPhone   = (process.env.TO_PHONE   || '').replace(/\D/g, '');
  const fromPhone = (process.env.FROM_PHONE || '').replace(/\D/g, '');

  const dateStr   = new Date().toISOString();
  const salt      = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(dateStr + salt).digest('hex');
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${dateStr}, salt=${salt}, signature=${signature}`;

  try {
    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify({
        message: { to: toPhone, from: fromPhone, text },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Solapi 오류:', JSON.stringify(data));
      return res.status(500).json({ ok: false, error: data.message || 'SMS 전송 실패' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('SMS 전송 오류:', err.message || err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
