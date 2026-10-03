
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

    const now = new Date();

    const currentIndiaTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const q = question.toLowerCase();

    // Date/time questions
    const dateTimeKeywords = [
      "current time", "current date", "time and date",
      "date and time", "aaj ki date", "aaj ka date",
      "aaj ka time", "abhi time", "abhi ka time",
      "abhi ki date", "samay batao", "kitne baje",
      "today's date", "today date", "today time",
      "what time is it", "what is the date",
      "what's the date", "current india time", "aaj ka din",
      "abhi kitna baj", "aaj ki tareekh"
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
        sources: [],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY missing hai. Vercel ke Environment Variables mein API key add karein.",
        },
        { status: 500 }
      );
    }

    // Current information / live search questions
    const liveKeywords = [
      "latest news", "live news", "today news",
      "aaj ki news", "aaj ki khabar", "taaza khabar",
      "ताजा खबर", "आज की खबर", "आज की न्यूज़",
      "breaking news", "current news", "recent news",
      "latest update", "live score", "today match",
      "share price", "stock price", "weather today",
      "latest", "today", "abhi ki khabar",
      "current affairs", "news today", "2026 news"
    ];

    const asksLiveInfo = liveKeywords.some((word) =>
      q.includes(word)
    );

    const systemPrompt = `
You are ORION AI, an intelligent assistant.

Current date and time in India:
${currentIndiaTime}

Rules:
- Reply in the user's language, including Hindi and Hinglish.
- For date/time questions, use the supplied India time.
- For news, current events, current affairs, government announcements,
  sports results, current prices, weather, technology updates, or
  other changing information, use Google Search grounding.
- For a question about today's or latest news, actively search the web.
- Prioritize recent, reliable sources and clearly mention publication dates.
- Do not invent news, dates, quotations, search results, or links.
- If reliable current information is unavailable, say so honestly.
- Answer directly and clearly.
- Do not claim that you searched unless search grounding was actually used.
`;

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
                  parts: [
                    {
                      text: asksLiveInfo
                        ? "Google Search se abhi ki taza aur verified information dhoondo. " +
                          "News ke liye publication date aur source zaroor do. Sawal: " +
                          question
                        : question,
                    },
                  ],
                },
              ],
              tools: [{ google_search: {} }],
              generationConfig: {
                temperature: 0.4,
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

          if (
            response.status === 429 ||
            status === "RESOURCE_EXHAUSTED"
          ) {
            quotaError = true;
          }

          console.error(`${model} failed:`, lastError);
          continue;
        }

        const candidate = data?.candidates?.[0];

        let reply =
          candidate?.content?.parts
            ?.map((part) => part.text || "")
            .filter(Boolean)
            .join("\n")
            .trim() || "";

        if (!reply) {
          lastError = "Gemini se khaali response mila.";
          continue;
        }

        // Extract Google Search grounding sources
        const chunks =
          candidate?.groundingMetadata?.groundingChunks || [];

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

        // Append sources only if not already included in answer
        if (sources.length > 0) {
          reply += "\n\nSources:\n";
          reply += sources
            .map(
              (source) =>
                `- ${source.title}: ${source.url}`
            )
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
            "Gemini API ki quota ya rate limit available nahi hai. Google AI Studio mein Usage aur Rate Limits check karein. Is waqt live news verify nahi ho paayi.",
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
      {
        error:
          "Request process nahi ho saki. Dobara try karein.",
      },
      { status: 500 }
    );
  }
}
