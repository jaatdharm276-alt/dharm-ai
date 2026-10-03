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

    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY missing hai. Vercel Settings > Environment Variables mein key add karke Production redeploy karein.",
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
- Give clear, direct and useful answers.
- Use the supplied India time for date/time questions.
- Never invent news, facts, sources or URLs.
- Be honest when you cannot verify current information.
- For news, distinguish known information from unverified information.
- Format answers clearly with paragraphs and lists where helpful.
`;

    // Current fallback models
    const models = [
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ];

    let lastError = "";
    let lastStatus = 503;

    for (const model of models) {
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
          lastStatus = response.status;
          lastError =
            data?.error?.message ||
            `Groq API error (${response.status})`;

          console.error(
            `Groq model ${model} failed with status ${response.status}:`,
            lastError
          );

          // Invalid API key: another model won't fix authentication.
          if (response.status === 401) {
            return Response.json(
              {
                error:
                  "Groq API key invalid hai. Vercel mein GROQ_API_KEY ki Value ko check karein. Zaroorat ho to Groq Console se nayi key banakar existing variable ki Value replace karein, phir Production redeploy karein.",
                code: "INVALID_API_KEY",
              },
              { status: 401 }
            );
          }

          if (response.status === 403) {
            return Response.json(
              {
                error:
                  "Groq API access denied hai. Groq account, key permissions aur model access check karein.",
                code: "ACCESS_DENIED",
              },
              { status: 403 }
            );
          }

          // Try the next model for other errors.
          continue;
        }

        const reply = String(
          data?.choices?.[0]?.message?.content || ""
        ).trim();

        if (!reply) {
          lastError = "Groq se khaali response mila.";
          continue;
        }

        return Response.json({
          reply,
          hasLiveSources: false,
          sources: [],
          model,
        });
      } catch (error) {
        lastError = error?.message || "Unknown error";
        console.error(`Groq model ${model} failed:`, lastError);
      }
    }

    if (lastStatus === 429) {
      return Response.json(
        {
          error:
            "Groq ki rate limit ya quota filhaal khatam hai. Thodi der baad dobara try karein. Details: " +
            lastError,
          code: "RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        error:
          "Groq se response nahi mila. Vercel logs aur Groq account check karein. Details: " +
          lastError,
        code: "GROQ_REQUEST_FAILED",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      {
        error: "Request process nahi ho saki. Dobara try karein.",
      },
      { status: 500 }
    );
  }
}
