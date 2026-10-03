
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const question = String(body?.message || "").trim();

    if (!question) {
      return Response.json(
        { error: "Pehle apna message likho." },
        { status: 400 }
      );
    }

    const currentIndiaTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const q = question.toLowerCase();

    const dateTimeKeywords = [
      "current time",
      "current date",
      "date and time",
      "aaj ki date",
      "aaj ka date",
      "aaj ka time",
      "abhi time",
      "abhi ka time",
      "abhi ki date",
      "samay batao",
      "kitne baje",
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
        reply: `India mein abhi date aur time:\n\n${currentIndiaTime}\n\nTime zone: Asia/Kolkata (IST)`,
        hasLiveSources: false,
        sources: [],
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY nahi mili. Vercel Settings mein API key check karo.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, an intelligent and helpful assistant.
The app is powered by Dharm AI.

Current date and time in India: ${currentIndiaTime}

Response rules:
- Answer directly and naturally in the user's language.
- For Roman Hindi, use simple, natural Hinglish.
- For Hindi, use readable Hindi.
- Format answers with proper paragraphs, headings and lists when useful.
- Never wrap a normal answer inside Markdown code fences.
- Never output standalone triple-backtick lines in normal answers.
- Avoid unnecessary introductions, repeated conclusions and unrelated disclaimers.
- Do not add a disclaimer unless it is genuinely needed for accuracy or safety.
- For coding requests, provide complete and usable code when appropriate.
- For current events, use web search when available.
- Never invent facts, sources, search results or links.
- If current information cannot be verified, clearly say so.
- Keep answers relevant to the user's actual question.
`;

    const models = [
      "groq/compound",
      "openai/gpt-oss-20b",
    ];

    let lastError = "Unknown error";

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
              temperature: 0.5,
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

        // Remove accidental code fences around normal answers.
        reply = reply
          .replace(
            /^\s*```(?:markdown|md|text)\s*\n?/i,
            ""
          )
          .replace(/\n?```\s*$/i, "")
          .replace(/^\s*```\s*$/gm, "")
          .trim();

        // Collect links only when the answer actually includes them.
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
          "today news",
          "today's news",
          "latest update",
          "live score",
          "current price",
          "today weather",
          "latest",
          "abhi ki news",
          "aaj ki news",
          "taaza khabar",
          "आज की खबर",
          "ताज़ा खबर",
          "ताजा खबर",
          "recent news",
          "news today",
        ];

        const asksLive = liveKeywords.some((word) =>
          q.includes(word)
        );

        if (index > 0 && asksLive) {
          reply +=
            "\n\nNote: Live web search verify nahi ho saki, isliye latest information ko kisi reliable source se check kar lena.";
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
          "Groq se response nahi mila. API key, model access aur usage limits check karo. Details: " +
          lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("ORION Chat API error:", error);

    return Response.json(
      {
        error:
          "Request process nahi ho saki. Dobara try karo.",
      },
      { status: 500 }
    );
  }
}
