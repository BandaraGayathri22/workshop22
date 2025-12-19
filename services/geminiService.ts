
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, MessagePart } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function* sendMessageStream(
  history: Message[],
  currentMessage: string,
  image?: { data: string; mimeType: string }
) {
  const model = 'gemini-3-pro-preview';
  
  // Format history for the API
  // Note: Gemini API expectations for history usually involve an array of { role, parts }
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: msg.parts ? msg.parts : [{ text: msg.content }]
  }));

  const userParts: MessagePart[] = [{ text: currentMessage }];
  if (image) {
    userParts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data.split(',')[1] || image.data
      }
    });
  }

  contents.push({
    role: 'user',
    parts: userParts
  });

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        // Optional: systemInstruction can be added if needed via initial message or specific setup
      }
    });

    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      yield c.text || "";
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateTitle(message: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this chat request into a short 2-4 word title: "${message}"`,
      config: {
        maxOutputTokens: 20
      }
    });
    return response.text?.trim().replace(/^["']|["']$/g, '') || "New Chat";
  } catch {
    return "New Chat";
  }
}
