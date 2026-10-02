
export async function POST(req) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");

      return Response.json(
        {
          error:
            "API key missing. Vercel Environment Variables mein GEMINI_API_KEY set karo."
        },
        { status: 500 }
      );
    }

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
    ];

    let lastError = "Gemini se jawab nahi mila.";

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
              contents: [
                {
                  role: "user",
                  parts: [{ text: message.trim() }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 8192,
              },
            }),
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `Gemini API error (${response.status})`;

          console.error(`${model} failed:`, {
            status: response.status,
            error: lastError,
          });

          continue;
        }

        const candidates = data?.candidates || [];

        const reply = candidates
          .flatMap((candidate) => candidate?.content?.parts || [])
          .map((part) => part?.text || "")
          .filter(Boolean)
          .join("");

        if (reply.trim()) {
          console.log(`${model} response successful.`);

          return Response.json({
            reply: reply.trim(),
            model,
          });
        }

        const finishReason =
          candidates[0]?.finishReason || "UNKNOWN";

        const blockReason =
          data?.promptFeedback?.blockReason;

        lastError = blockReason
          ? `Prompt blocked by Gemini: ${blockReason}`
          : `Gemini ne text response nahi diya. Finish reason: ${finishReason}`;

        console.error(`${model} returned no text:`, {
          finishReason,
          blockReason,
        });

      } catch (error) {
        lastError =
          error?.message || "Gemini se connection nahi ho paya.";

        console.error(`${model} request failed:`, lastError);
      }
    }

    return Response.json(
      {
        error: lastError,
      },
      { status: 503 }
    );

  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      {
        error: "Request process nahi ho saki. Dobara try karo.",
      },
      { status: 500 }
    );
  }
}
