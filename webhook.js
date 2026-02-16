const events = [];
const MAX_EVENTS = 200;

function addEvent(evt) {
  events.push({ ...evt, timestamp: Date.now() });
  if (events.length > MAX_EVENTS) events.shift();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const since = parseInt(req.query.since || '0');
    const newEvents = events.filter(e => e.timestamp > since);
    return res.status(200).json({ events: newEvents });
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!body || !body.data) return res.status(200).json({ ok: true });

    const eventType = body.data.event_type;
    const payload = body.data.payload;

    switch (eventType) {
      case 'call.initiated':
        addEvent({ type: 'call_initiated', call_control_id: payload.call_control_id, to: payload.to, from: payload.from, direction: payload.direction });
        break;

      case 'call.answered':
        addEvent({ type: 'call_answered', call_control_id: payload.call_control_id, to: payload.to });
        break;

      case 'call.machine.detection.ended':
        const result = payload.result;
        addEvent({ type: 'amd_result', call_control_id: payload.call_control_id, result, to: payload.to });

        if (result === 'machine') {
          const API_KEY = process.env.TELNYX_API_KEY;
          const vmUrl = process.env.VM_DROP_AUDIO_URL;
          if (vmUrl && API_KEY) {
            await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/playback_start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
              body: JSON.stringify({ audio_url: vmUrl, overlay: false })
            });
            addEvent({ type: 'vm_dropped', call_control_id: payload.call_control_id, to: payload.to });
          } else if (API_KEY) {
            await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
              body: JSON.stringify({})
            });
            addEvent({ type: 'machine_hangup', call_control_id: payload.call_control_id, to: payload.to });
          }
        }
        break;

      case 'call.hangup':
        addEvent({ type: 'call_ended', call_control_id: payload.call_control_id, to: payload.to, hangup_cause: payload.hangup_cause, duration: payload.duration_secs });
        break;

      case 'call.playback.ended':
        const API_KEY2 = process.env.TELNYX_API_KEY;
        if (API_KEY2) {
          await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY2}` },
            body: JSON.stringify({})
          });
        }
        addEvent({ type: 'vm_complete', call_control_id: payload.call_control_id });
        break;

      default:
        addEvent({ type: eventType, call_control_id: payload?.call_control_id });
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
