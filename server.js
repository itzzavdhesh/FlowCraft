import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
}

const ai = new GoogleGenAI({ apiKey });

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Missing or invalid prompt parameter." });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a flowchart representing: "${prompt}". 
Output MUST be a valid JSON array of blocks conforming to this TypeScript Block interface:
interface Block {
  id: string;
  type: 'terminator' | 'process' | 'decision' | 'io';
  label: string;
  targetId?: string; // Target block ID for standard blocks (terminator, process, io)
  yesLabel?: string; // Optional, default is "Yes" for decision blocks
  noLabel?: string;  // Optional, default is "No" for decision blocks
  yesTargetId?: string; // Target block ID for Yes path of decision block
  noTargetId?: string;  // Target block ID for No path of decision block
}

Rules:
1. Make sure to generate a complete logical flow from start (terminator) to end (terminator).
2. Connect blocks using unique random IDs for "id", and ensure "targetId", "yesTargetId", and "noTargetId" reference valid block IDs to form a connected directed tree/flow.
3. Decision blocks must have "yesTargetId" and "noTargetId" and must not use "targetId".
4. Ensure the output is strictly a valid JSON array, do not wrap it in markdown codeblocks (no \`\`\`json).`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    const blocks = JSON.parse(text);
    res.json(blocks);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "Failed to generate flowchart using Gemini AI. " + error.message });
  }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
