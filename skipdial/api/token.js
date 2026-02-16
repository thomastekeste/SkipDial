// api/token.js — Generates Telnyx WebRTC Token
// Deploy to Vercel as a serverless function
// Env vars needed: TELNYX_API_KEY, TELNYX_CONNECTION_ID

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.TELNYX_API_KEY;
  const CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;

  if (!API_KEY || !CONNECTION_ID) {
    return res.status(500).json({ error: 'Missing TELNYX_API_KEY or TELNYX_CONNECTION_ID' });
  }

  try {
    // Step 1: Create an on-demand credential for this session
    const credRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ connection_id: CONNECTION_ID })
    });

    if (!credRes.ok) {
      const err = await credRes.text();
      return res.status(500).json({ error: 'Failed to create credential', detail: err });
    }

    const credData = await credRes.json();
    const credentialId = credData.data.id;
    const sipUsername = credData.data.sip_username;

    // Step 2: Generate a token from the credential
    const tokenRes = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({})
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(500).json({ error: 'Failed to create token', detail: err });
    }

    // Token comes back as plain text
    const token = await tokenRes.text();

    res.status(200).json({
      token: token,
      sip_username: sipUsername,
      credential_id: credentialId
    });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: err.message });
  }
};
