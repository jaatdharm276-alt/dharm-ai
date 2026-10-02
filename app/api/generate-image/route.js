
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Gemini API key nahi mili. Vercel Settings > Environment Variables mein GEMINI_API_KEY add karein."
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return Response.json(
        { error: "Image banane ke liye prompt likhein." },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return Response.json(
        {
          error: "Prompt 4000 characters se chhota rakhein."
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Create an actual high-quality image based on this prompt. Do not only describe it. Prompt: " +
                    prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        }),
        signal: AbortSignal.timeout(55000)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini image API error:", result);

      return Response.json(
        {
          error:
            result?.error?.message ||
            "Gemini image generation fail hui. API key, model access aur quota check karein."
        },
        { status: 502 }
      );
    }

    const parts =
      result?.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find(
      (part) => part?.inlineData?.data
    );

    if (!imagePart) {
      const textMessage = parts
        .filter((part) => part?.text)
        .map((part) => part.text)
        .join("\n");

      return Response.json(
        {
          error:
            textMessage ||
            "Gemini se image nahi mili. Dobara try karein."
        },
        { status: 502 }
      );
    }

    const imageData = imagePart.inlineData.data;
    const mimeType =
      imagePart.inlineData.mimeType || "image/jpeg";

    return Response.json({
      success: true,
      message: "Aapki image taiyar hai! ✨",
      image: `data:${mimeType};base64,${imageData}`
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return Response.json(
      {
        error:
          error?.name === "TimeoutError"
            ? "Image banane mein zyada samay laga. Dobara try karein."
            : error?.message ||
              "Image generate karte waqt technical problem aa gayi."
      },
      { status: 500 }
    );
  }
}
