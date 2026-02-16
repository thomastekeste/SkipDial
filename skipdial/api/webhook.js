// api/webhook.js — Telnyx Webhook Handler
// Receives real-time call events from Telnyx
// Handles: call.answered, call.machine.detection.ended, call.hangup, etc.
// These events are forwarded to the frontend via Server-Sent Events (SSE)

// In-memory event store (for Vercel serverless — use Redis for production)
const events = [];
const MAX_EVENTS = 100;

function addEvent(evt) {
  events.push({ ...evt, timestamp: Date.now() });
  if (events.length > MAX_EVENTS) events.shift();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = poll for events (frontend polls this)
  if (req.method === 'GET') {
    const since = parseInt(req.query.since || '0');
    const newEvents = events.filter(e => e.timestamp > since);
    return res.status(200).json({ events: newEvents });
  }

  // POST = Telnyx sends webhook events here
  if (req.method === 'POST') {
    const body = req.body;
    
    if (!body || !body.data) {
      return res.status(200).json({ ok: true });
    }

    const eventType = body.data.event_type;
    const payload = body.data.payload;

    console.log(`[Webhook] ${eventType}`, JSON.stringify(payload).substring(0, 200));

    // Process different event types
    switch (eventType) {
      case 'call.initiated':
        addEvent({
          type: 'call_initiated',
          call_control_id: payload.call_control_id,
          to: payload.to,
          from: payload.from,
          direction: payload.direction
        });
        break;

      case 'call.answered':
        addEvent({
          type: 'call_answered',
          call_control_id: payload.call_control_id,
          to: payload.to,
          answered_by: 'human' // Will be refined by AMD
        });
        break;

      case 'call.machine.detection.ended':
        // AMD result — was it a human or machine?
        const result = payload.result; // human, machine, not_sure
        addEvent({
          type: 'amd_result',
          call_control_id: payload.call_control_id,
          result: result, // 'human', 'machine', 'not_sure'
          to: payload.to
        });

        // If machine detected, auto-drop VM or hangup
        if (result === 'machine') {
          const API_KEY = process.env.TELNYX_API_KEY;
          const vmUrl = process.env.VM_DROP_AUDIO_URL;

          if (vmUrl && API_KEY) {
            // Play pre-recorded VM
            await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/playback_start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
              },
              body: JSON.stringify({ audio_url: vmUrl, overlay: false })
            });

            addEvent({
              type: 'vm_dropped',
              call_control_id: payload.call_control_id,
              to: payload.to
            });
          } else {
            // No VM configured — just hangup
            if (API_KEY) {
              await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({})
              });
            }
            addEvent({
              type: 'machine_hangup',
              call_control_id: payload.call_control_id,
              to: payload.to
            });
          }
        }
        break;

      case 'call.hangup':
        addEvent({
          type: 'call_ended',
          call_control_id: payload.call_control_id,
          to: payload.to,
          hangup_cause: payload.hangup_cause,
          hangup_source: payload.hangup_source,
          duration: payload.duration_secs
        });
        break;

      case 'call.playback.ended':
        // VM drop finished playing — now hangup
        const API_KEY2 = process.env.TELNYX_API_KEY;
        if (API_KEY2) {
          await fetch(`https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/hangup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY2}`
            },
            body: JSON.stringify({})
          });
        }
        addEvent({
          type: 'vm_complete',
          call_control_id: payload.call_control_id
        });
        break;

      default:
        addEvent({
          type: eventType,
          call_control_id: payload?.call_control_id,
          raw: eventType
        });
    }

    // Telnyx expects 200 OK
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
