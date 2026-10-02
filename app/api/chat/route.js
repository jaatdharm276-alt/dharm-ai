
export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || !String(message).trim()) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY environment variable missing hai." },
        { status: 500 }
      );
    }

    // India ka current date aur time
    const currentIndiaTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long"
    });

    const systemPrompt = `
You are ORION AI, an intelligent and helpful assistant.
Current date and time in India: ${currentIndiaTime}.

Instructions:
- Reply in the language the user prefers, including Hindi and Hinglish.
- Use the current date and time above when asked about today's date,
  current time, today, tomorrow, yesterday, or recent dates.
- For current events, latest news, current people information,
  cricket scores, sports results, prices, technology updates,
  weather, government announcements, and other changing facts,
  use Google Search grounding whenever relevant.
- Prefer recent and reliable information.
- Clearly distinguish verified facts from uncertainty.
- Never invent live information, search results, dates, or sources.
- If current information cannot be verified, say so honestly.
- Keep answers clear, useful, and easy to understand.
- Do not claim that you searched the web unless search grounding
  actually returned search information.
`;

  const models = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash"
];  

    let lastError = null;
   
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: String(message).trim() }]
                }
              ],
              tools: [
                {
                  google_search: {}
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `Gemini API error (${response.status})`;

          console.error(`${model} failed:`, data);
          continue;
        }

        let reply =
          data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .filter(Boolean)
            .join("\n")
            .trim() || "";

        if (!reply) {
          lastError = "Gemini se khaali response mila.";
          continue;
        }

        // Search se mile sources ko jawab ke saath dikhana
        const groundingChunks =
          data?.candidates?.[0]?.groundingMetadata
            ?.groundingChunks || [];

        const sources = [];
        const seenUrls = new Set();

        for (const chunk of groundingChunks) {
          const webSource = chunk?.web;

          if (webSource?.uri && !seenUrls.has(webSource.uri)) {
            seenUrls.add(webSource.uri);

            sources.push(
              `- ${webSource.title || "Source"}: ${webSource.uri}`
            );
          }
        }

        if (sources.length > 0) {
          reply += "\n\nSources:\n" + sources.join("\n");
        }

        return Response.json({
          reply,
          hasLiveSources: sources.length > 0
        });
      } catch (error) {
        lastError = error?.message || "Unknown error";
        console.error(`${model} failed:`, error);
      }
    }
    
    return Response.json(
      {
        error:
          lastError ||
          "Abhi Gemini models available nahi hain. Baad mein dobara try karein."
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      { error: "Something went wrong. Dobara try karein." },
      { status: 500 }
    );
  }
}
