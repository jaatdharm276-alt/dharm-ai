export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
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
              "x-goog-api-key": process.env.GEMINI_API_KEY,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: message,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No response received.";

          return Response.json({ reply });
        }

        lastError =
          data?.error?.message ||
          `Gemini API error (${response.status})`;

        console.error(`${model} failed:`, data);
      } catch (error) {
        lastError = error.message;
        console.error(`${model} failed:`, error);
      }
    }

    return Response.json(
      {
        error:
          lastError ||
          "All Gemini models are currently unavailable.",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
