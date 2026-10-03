
export async function POST(req) {
  try {
    const body = await req.json();
    const question = String(body?.message || "").trim();

    if (!question) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // India date and time
    const currentIndiaTime = new Date().toLocaleString("en-IN", {
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

    if (dateTimeKeywords.some((word) => q.includes(word))) {
      return Response.json({
        reply:
          "India mein abhi date aur time:\n\n" +
          currentIndiaTime +
          "\n\nTime zone: Asia/Kolkata (IST)",
        hasLiveSources: false,
        sources: [],
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY missing hai. Vercel Settings > Environment Variables mein GROQ_API_KEY add karein, phir redeploy karein.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, a helpful intelligent assistant.

Current date and time in India:
${currentIndiaTime}

Rules:
- Reply in the user's language, including Hindi and Hinglish.
- Give direct, useful, clear answers.
- For latest news, current events, government announcements,
  sports scores, prices, weather and technology updates,
  use web search when available.
- Never invent live information or sources.
- If current information cannot be verified, say so honestly.
- Include dates for news and current events.
- Include source links when web search provides them.
`;

    // Try web-search-capable model first, then fallback chat model.
    const models = [
      "groq/compound",
      "openai/gpt-oss-20b",
    ];

    let lastError = "";

    for (let index = 0; index < models.length; index++) {
      const model = models[index];

      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: question,
                },
              ],
              temperature: 0.6,
              max_tokens: 4096,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `Groq API error (${response.status})`;

          console.error(`${model} failed:`, lastError);
          continue;
        }

        let reply = String(
          data?.choices?.[0]?.message?.content || ""
        ).trim();

        if (!reply) {
          lastError = "Groq se khaali response mila.";
          continue;
        }

        // Extract URLs included in the answer.
        const urls = [
          ...new Set(
            reply.match(/https?:\/\/[^\s)\]>]+/g) || []
          ),
        ];

        const sources = urls.map((url) => ({
          title: url,
          url,
        }));

        const liveKeywords = [
          "latest news",
          "breaking news",
          "today's news",
          "today news",
          "latest update",
          "live score",
          "current price",
          "today weather",
          "latest",
          "abhi ki news",
          "aaj ki news",
          "taaza khabar",
          "ताज़ा खबर",
          "आज की खबर",
          "ताजा खबर",
          "current events",
          "recent news",
          "news today",
        ];

        const asksLive = liveKeywords.some((word) =>
          q.includes(word)
        );

        if (index > 0 && asksLive) {
          reply +=
            "\n\nNote: Live web search abhi available nahi thi, " +
            "isliye is jawab ko latest verified news na maanein.";
        }

        return Response.json({
          reply,
          hasLiveSources: index === 0 && sources.length > 0,
          sources: index === 0 ? sources : [],
          model,
        });
      } catch (error) {
        lastError = error?.message || "Unknown error";
        console.error(`${model} failed:`, lastError);
      }
    }

    return Response.json(
      {
        error:
          "Groq se response nahi mila. API key aur account ki rate limits check karein. Details: " +
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
  
