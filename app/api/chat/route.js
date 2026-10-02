
export async function POST(req) {
  try {
    const { message } = await req.json();
    const question = String(message || "").trim();

    if (!question) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Current India date and time: Gemini ki zaroorat nahi
    const now = new Date();

    const currentIndiaTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const q = question.toLowerCase();

    const dateTimeKeywords = [
      "current time",
      "current date",
      "time and date",
      "date and time",
      "aaj ki date",
      "aaj ka date",
      "aaj ka time",
      "abhi time",
      "abhi ka time",
      "abhi ki date",
      "samay batao",
      "kitne baje",
      "today's date",
      "today date",
      "today time",
      "what time is it",
      "what is the date",
      "what's the date",
      "current india time",
      "aaj ka din",
    ];

    const asksDateTime = dateTimeKeywords.some((word) =>
      q.includes(word)
    );

    if (asksDateTime) {
      return Response.json({
        reply:
          "India mein abhi date aur time:\n\n" +
          currentIndiaTime +
          "\n\nTime zone: Asia/Kolkata (IST)",
        hasLiveSources: false,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY missing hai. Vercel Environment Variables mein API key add karein.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, an intelligent assistant.

Current date and time in India:
${currentIndiaTime}

Rules:
- Reply in the user's language, including Hindi and Hinglish.
- For current date/time, use the supplied India time.
- For latest news, current events, government announcements,
  sports scores, prices, weather, technology updates, current
  public information and other changing facts, use Google Search
  grounding when relevant.
- Search for recent information instead of relying only on memory.
- Clearly mention dates when discussing news.
- Never invent live information, search results, or sources.
- If live information cannot be verified, explain that honestly.
- Give a direct and useful answer.
`;

    // Current supported models; first try the economical model
    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ];

    let lastError = "";
    let quotaError = false;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: question }],
                },
              ],
              tools: [{ google_search: {} }],
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `Gemini API error (${response.status})`;

          const status = data?.error?.status;
          const isQuota =
            response.status === 429 ||
            status === "RESOURCE_EXHAUSTED";

          if (isQuota) quotaError = true;

          console.error(`${model} failed:`, lastError);
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

        // Search sources from Google's grounding metadata
        const chunks =
          data?.candidates?.[0]?.groundingMetadata
            ?.groundingChunks || [];

        const sources = [];
        const seen = new Set();

        for (const chunk of chunks) {
          const web = chunk?.web;

          if (web?.uri && !seen.has(web.uri)) {
            seen.add(web.uri);
            sources.push({
              title: web.title || "Source",
              url: web.uri,
            });
          }
        }

        if (sources.length) {
          reply += "\n\nSources:\n";
          reply += sources
            .map((source) => `- ${source.title}: ${source.url}`)
            .join("\n");
        }

        return Response.json({
          reply,
          hasLiveSources: sources.length > 0,
          sources,
        });
      } catch (error) {
        lastError = error?.message || "Unknown error";
        console.error(`${model} failed:`, lastError);
      }
    }

    if (quotaError) {
      return Response.json(
        {
          error:
            "Gemini API ki quota ya rate limit khatam ho gayi hai. Google AI Studio mein Usage aur Rate Limits check karein. Agar free quota available nahi hai, to quota reset hone ka wait karein ya billing enable karein. Is waqt live news verify nahi ho paayi.",
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        error:
          "Gemini se response nahi mila. API key, model access aur Vercel logs check karein. Details: " +
          lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      { error: "Request process nahi ho saki. Dobara try karein." },
      { status: 500 }
    );
  }
                }
