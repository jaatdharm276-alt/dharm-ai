
export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || !String(message).trim()) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const userMessage = String(message).trim();

    // India ka current date aur time
    const now = new Date();
    const currentIndiaTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    // Date/time ke sawalon ka jawab API ke bina
    const asksCurrentDateTime =
      /(current time|current date|date and time|time right now|what time is it|today'?s date|today'?s time|aaj ki date|aaj ka date|aaj ka samay|abhi kitne baje|abhi ka time|samay batao|time aur date|date aur time)/i.test(
        userMessage
      );

    if (asksCurrentDateTime) {
      return Response.json({
        reply: `India mein abhi date aur time:\n${currentIndiaTime}\n\n(Time zone: Asia/Kolkata, IST)`,
        hasLiveSources: false,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY missing hai. Vercel Project Settings mein Environment Variables check karein.",
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
- For current date/time, use the supplied India time.
- For latest news, current public figures, cricket scores,
  sports results, prices, weather, government announcements,
  technology updates and changing facts, use Google Search
  grounding whenever relevant.
- Search for current information about people when asked
  about their current role, recent activity or latest news.
- Prefer recent, reliable and verifiable information.
- Never invent search results, sources, facts or live updates.
- If live information cannot be verified, say so honestly.
- Only show sources actually returned by Google Search grounding.
- Keep answers clear, useful and easy to understand.
`;
    
    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
    ];

    let lastError = "Gemini API request failed.";

    for (const model of models) {
      let response;

      try {
        response = await fetch(
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
                  parts: [{ text: userMessage }],
                },
              ],
              tools: [
                {
                  google_search: {},
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
          }
        );
      } catch (error) {
        console.error("Network error:", error);

        return Response.json(
          {
            error:
              "Internet ya Gemini server se connection nahi ho paya. Dobara try karein.",
          },
          { status: 503 }
        );
      }

      let data;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const apiMessage =
          data?.error?.message ||
          `Gemini API error (${response.status})`;

        console.error(`${model} error:`, apiMessage);
        lastError = apiMessage;

        // Quota khatam ho to doosre models ko bhi
        // baar-baar call nahi karna.
        if (response.status === 429) {
          return Response.json(
            {
              error:
                "Gemini API ki request limit ya quota khatam ho gaya hai. Google AI Studio mein Usage aur Rate Limits check karein. Quota available hone par dobara try karein.",
              details: apiMessage,
            },
            { status: 429 }
          );
        }

        // API key ya project permission ki problem
        if (response.status === 401 || response.status === 403) {
          return Response.json(
            {
              error:
                "Gemini API key, project access ya billing/permission check karein.",
              details: apiMessage,
            },
            { status: response.status }
          );
        }

        // Model unavailable ho to agla model try karein.
        if (
          response.status === 404 ||
          response.status === 400
        ) {
          continue;
        }

        return Response.json(
          {
            error: "Gemini API request fail ho gayi.",
            details: apiMessage,
          },
          { status: 502 }
        );
      }
      
      const candidate = data?.candidates?.[0];

      const reply = (
        candidate?.content?.parts
          ?.map((part) => part.text || "")
          .filter(Boolean)
          .join("\n") || ""
      ).trim();

      if (!reply) {
        lastError =
          "Gemini se khaali response mila. Dobara try karein.";
        continue;
      }

      // Google Search grounding se mile asli sources
      const groundingChunks =
        candidate?.groundingMetadata?.groundingChunks || [];

      const sources = [];
      const seenUrls = new Set();

      for (const chunk of groundingChunks) {
        const webSource = chunk?.web;

        if (
          webSource?.uri &&
          !seenUrls.has(webSource.uri)
        ) {
          seenUrls.add(webSource.uri);

          sources.push(
            `- ${webSource.title || "Source"}: ${webSource.uri}`
          );
        }
      }

      let finalReply = reply;

      if (sources.length > 0) {
        finalReply += "\n\nSources:\n" + sources.join("\n");
      }

      return Response.json({
        reply: finalReply,
        hasLiveSources: sources.length > 0,
      });
    }

    return Response.json(
      {
        error:
          "Koi available Gemini model request complete nahi kar saka.",
        details: lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      {
        error: "Server mein dikkat aayi. Dobara try karein.",
      },
      { status: 500 }
    );
  }
}
