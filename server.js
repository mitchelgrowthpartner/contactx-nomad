require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());

const VOICEFLOW_API_KEY = process.env.VOICEFLOW_API_KEY || 'xxxxxxxxxxx';

app.post('/api/chat', async (req, res) => {
    const { message, sessionID = 'contactx_demo_user' } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const vfResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${sessionID}/interact`, {
            method: 'POST',
            headers: {
                'Authorization': VOICEFLOW_API_KEY,
                'versionID': 'development', // 🚨 Changed to Development to pull your latest canvas instantly!
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                action: {
                    type: 'text',
                    payload: message
                },
                config: {
                    tts: true, // 🚨 Force Voiceflow to generate the ElevenLabs MP3
                    stripSSML: true
                }
            })
        });

        const traces = await vfResponse.json();

        // 👉 THE X-RAY: This will print Voiceflow's raw brain to your VS Code terminal!
        console.log("Raw Voiceflow Data:", JSON.stringify(traces, null, 2));

        let responseText = "";
        let audioUrl = null;

        // Loop through all traces Voiceflow sends back
        for (const trace of traces) {

            // 1. Extract the Text
            if (trace.type === 'text' || trace.type === 'speak') {
                if (trace.payload && trace.payload.message) {
                    responseText += trace.payload.message + " ";
                }
            }

            // 2. THE BULLETPROOF AUDIO HUNTER
            if (trace.payload) {
                // Sometimes Voiceflow puts it right on the payload
                if (trace.payload.src) {
                    audioUrl = trace.payload.src;
                }
                // 🚨 Sometimes they hide it inside an 'audio' object!
                else if (trace.payload.audio && trace.payload.audio.src) {
                    audioUrl = trace.payload.audio.src;
                }
            }
        }

        // 3. Format the raw "gibberish" so Chrome knows it is an MP3 file
        if (audioUrl) {
            audioUrl = audioUrl.replace(/\s/g, '');

            if (!audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
                audioUrl = 'data:audio/mpeg;base64,' + audioUrl;
            }
        }

        // 4. Send the perfect package back to your frontend
        res.json({
            text: responseText.trim(),
            audio: audioUrl
        });

    } catch (error) {
        console.error("Voiceflow API Error:", error);
        res.status(500).json({ error: "Failed to communicate with the AI brain." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure Contact-X Server running on port ${PORT}`));
