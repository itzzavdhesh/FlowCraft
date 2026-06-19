/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { Block, ShapeType } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? (window as any).__GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are a flowchart generator. Given a description, return ONLY a valid JSON array of block objects with no markdown, no explanation, and no code fences.

Each block must follow one of these shapes:
- terminator: { id, type: "terminator", label, targetId? }
- process:    { id, type: "process",    label, targetId? }
- decision:   { id, type: "decision",   label, yesLabel, noLabel, yesTargetId?, noTargetId? }
- io:         { id, type: "io",         label, targetId? }

Rules:
- Always start with a terminator block labeled "Start" and end with one labeled "End".
- Use short IDs like "b1", "b2", etc.
- Wire blocks via targetId / yesTargetId / noTargetId using those IDs.
- Return ONLY the raw JSON array. No prose, no markdown.`;

export async function generateFlowchart(description: string): Promise<Block[]> {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Add it to your .env file.');
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a flowchart for: ${description}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
    },
  });

  const raw = response.text?.trim() ?? '';

  // Strip accidental markdown fences if the model adds them
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response was not a JSON array. Please try again.');
  }

  // Validate and filter to well-formed blocks only
  const validTypes: ShapeType[] = ['terminator', 'process', 'decision', 'io'];
  const blocks = (parsed as Block[]).filter(
    (b) => b && typeof b.id === 'string' && typeof b.label === 'string' && validTypes.includes(b.type)
  );

  if (blocks.length === 0) {
    throw new Error('No valid blocks returned. Please try a different description.');
  }

  return blocks;
}