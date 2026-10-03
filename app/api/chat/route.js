
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const MODEL = "openai/gpt-oss-120b";

export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY Vercel settings mein nahi mili." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const message =
      body.message ||
      body.prompt ||
      body.input ||
      "";

    const history = Array.isArray(body.history)
      ? body.history
      : Array.isArray(body.messages)
      ? body.messages
      : [];

    if (!message && history.length === 0) {
      return NextResponse.json(
        { error: "Pehle apna message likho." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are ORION AI, a helpful and intelligent AI assistant.
Your original creator's app name is Dharm AI.
Answer naturally, accurately, and helpfully.
Reply in the same language the user uses.
For Hindi written in Roman letters, reply in simple Hinglish.
Use clear formatting, headings, and lists when useful.
Never claim you searched the internet unless a search tool was used.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
        .filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        )
        .slice(-20)
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
    ];

    if (message) {
      messages.push({ role: "user", content: message });
    }

    const lowerMessage = String(message).toLowerCase();
    
    const needsSearch =
      /\b(latest|today|current|live|news|weather|cricket score|stock price|breaking news|recent|aaj ki khabar|taaza khabar|mausam|abhi ka|live score)\b/i.test(
        lowerMessage
      );

    const requestBody = {
      model: MODEL,
      messages,
      temperature: 0.6,
      max_completion_tokens: 4096,
    };

    if (needsSearch) {
      requestBody.tools = [
        { type: "browser_search" },
      ];
    }

    let response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let data = await response.json();

    if (!response.ok) {
      // Agar browser search tool available na ho,
      // to bina search ke normal answer try karo.
      if (needsSearch && requestBody.tools) {
        const fallbackBody = { ...requestBody };
        delete fallbackBody.tools;

        response = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        });

        data = await response.json();
      }
    }

    if (!response.ok) {
      console.error("Groq API error:", data);

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "Groq API se response nahi mila. API key aur usage limits check karo.",
        },
        { status: response.status || 500 }
      );
    }
    
    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return NextResponse.json(
        {
          error:
            "AI ka jawab khali aaya. Dobara message bhejkar dekho.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      response: reply,
      answer: reply,
    });
  } catch (error) {
    console.error("ORION route error:", error);

    return NextResponse.json(
      {
        error:
          "Server mein dikkat aayi. Thodi der baad dobara try karo.",
      },
      { status: 500 }
    );
  }
}
  
