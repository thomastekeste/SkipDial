module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.TELNYX_API_KEY;
  const FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER;
  const CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;
  if (!API_KEY) return res.status(500).json({ error: 'Missing TELNYX_API_KEY' });

  const BASE_URL = process.env.VERCEL_URL
    ? 'https://' + process.env.VERCEL_URL
    : 'https://' + (req.headers['x-forwarded-host'] || req.headers.host);

  const { action, to, call_control_id } = req.body || {};

  try {
    if (action === 'dial') {
      if (!to) return res.status(400).json({ error: 'Missing "to" phone number' });
      const dialRes = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          connection_id: CONNECTION_ID,
          to: to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').replace(/^1/, '')}`,
          from: FROM_NUMBER,
          answering_machine_detection: 'detect_beep',
          answering_machine_detection_config: {
            total_analysis_time_millis: 5000,
            after_greeting_silence_millis: 800,
            between_words_silence_millis: 50,
            greeting_duration_millis: 3500,
            initial_silence_millis: 3500,
            maximum_number_of_words: 5,
            silence_threshold: 256
          },
          webhook_url: `${BASE_URL}/api/webhook`,
          timeout_secs: 30
        })
      });
      const dialData = await dialRes.json();
      if (!dialRes.ok) return res.status(500).json({ error: 'Dial failed', detail: dialData });
      return res.status(200).json({
        success: true,
        call_control_id: dialData.data.call_control_id,
        call_leg_id: dialData.data.call_leg_id,
        call_session_id: dialData.data.call_session_id
      });
    }

    if (action === 'hangup') {
      if (!call_control_id) return res.status(400).json({ error: 'Missing call_control_id' });
      await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/hangup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({})
      });
      return res.status(200).json({ success: true, action: 'hangup' });
    }

    if (action === 'vm_drop') {
      if (!call_control_id) return res.status(400).json({ error: 'Missing call_control_id' });
      const vmUrl = process.env.VM_DROP_AUDIO_URL;
      if (vmUrl) {
        await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/playback_start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
          body: JSON.stringify({ audio_url: vmUrl, overlay: false })
        });
        return res.status(200).json({ success: true, action: 'vm_drop' });
      } else {
        await fetch(`https://api.telnyx.com/v2/calls/${call_control_id}/actions/hangup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
          body: JSON.stringify({})
        });
        return res.status(200).json({ success: true, action: 'hangup_no_vm' });
      }
    }

    return res.status(400).json({ error: 'Unknown action. Use: dial, hangup, vm_drop' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
