module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.TELNYX_API_KEY;
  const CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;
  const FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER;

  if (!API_KEY || !CONNECTION_ID) {
    return res.status(500).json({ error: 'Missing TELNYX_API_KEY or TELNYX_CONNECTION_ID' });
  }

  try {
    let credentialId = process.env.TELNYX_CREDENTIAL_ID;

    if (!credentialId) {
      const credRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ connection_id: CONNECTION_ID })
      });
      if (!credRes.ok) {
        const err = await credRes.text();
        return res.status(500).json({ error: 'Failed to create credential', detail: err });
      }
      const credData = await credRes.json();
      credentialId = credData.data.id;
      console.warn('Created new telephony credential:', credentialId, '— set TELNYX_CREDENTIAL_ID env var to reuse it');
    }

    const tokenRes = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({})
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(500).json({ error: 'Failed to create token', detail: err });
    }
    const token = await tokenRes.text();
    res.status(200).json({ token, credential_id: credentialId, from_number: FROM_NUMBER || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
