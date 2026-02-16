module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body || !body.data) return res.status(200).json({ ok: true });

  const eventType = body.data.event_type;
  const payload = body.data.payload;
  const API_KEY = process.env.TELNYX_API_KEY;

  try {
    switch (eventType) {
      case 'call.machine.detection.ended': {
        const result = payload.result;
        if (result === 'machine' && API_KEY) {
          const vmUrl = process.env.VM_DROP_AUDIO_URL;
          if (vmUrl) {
            const r = await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/playback_start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
              body: JSON.stringify({ audio_url: vmUrl, overlay: false })
            });
            if (!r.ok) console.error('Playback start failed:', await r.text());
          } else {
            const r = await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
              body: JSON.stringify({})
            });
            if (!r.ok) console.error('Machine hangup failed:', await r.text());
          }
        }
        break;
      }

      case 'call.playback.ended': {
        if (API_KEY) {
          const r = await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({})
          });
          if (!r.ok) console.error('Post-playback hangup failed:', await r.text());
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return res.status(200).json({ ok: true });
};
