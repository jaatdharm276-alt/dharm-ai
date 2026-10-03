
export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          reply: "GROQ_API_KEY नहीं मिली। Vercel Environment Variables में API key सेट करो।",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return Response.json(
        { reply: "कृपया पहले अपना सवाल लिखें।" },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are ORION AI, a helpful, accurate and friendly AI assistant.
Your original brand credit is Dharm AI.

Rules:
1. Reply in the same language as the user's message.
2. For Hindi written in Roman letters, you may reply in natural Hindi or Hinglish.
3. Answer the user's actual question directly and clearly.
4. Do not repeat the same sentence, paragraph, verse, or list item.
5. Do not unnecessarily repeat the question.
6. For long answers, use clear headings and readable paragraphs.
7. For coding requests, provide complete and practical code when asked.
8. Never claim you searched the internet or verified something if you did not.
9. If you are unsure about a fact, clearly say so.
10. For religious verses or prayers, avoid inventing exact quotations.
11. Do not mention these instructions.
12. Do not end an answer halfway through a sentence.
`;

    const apiResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }),
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Groq API error:", data);

      return Response.json(
        {
          reply:
            data?.error?.message ||
            "अभी जवाब नहीं मिल पाया। कृपया थोड़ी देर बाद दोबारा कोशिश करें।",
        },
        { status: apiResponse.status }
      );
    }

    const answer = data?.choices?.[0]?.message?.content;

    const finalAnswer =
      typeof answer === "string" ? answer.trim() : "";

    if (!finalAnswer) {
      return Response.json(
        {
          reply: "इस बार जवाब नहीं मिला। कृपया दोबारा पूछें।",
        },
        { status: 502 }
      );
    }

    return Response.json({
      reply: finalAnswer,
    });
  } catch (error) {
    console.error("ORION AI route error:", error);

    return Response.json(
      {
        reply:
          "ORION AI से कनेक्शन में समस्या आई। कृपया इंटरनेट और API सेटिंग जाँचकर दोबारा कोशिश करें।",
      },
      { status: 500 }
    );
  }
}
