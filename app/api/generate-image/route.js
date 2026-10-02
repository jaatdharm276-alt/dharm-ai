
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
                    "Generate an actual image, not just a text description. Create a high-quality image based on this request: " +
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

      const apiMessage =
        result?.error?.message ||
        "Gemini image generation fail hui.";

      return Response.json(
        { error: apiMessage },
        { status: 502 }
      );
    }

    const parts =
      result?.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find(
      (part) =>
        part?.inlineData?.data &&
        part?.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart) {
      const textMessage = parts
        .filter((part) => part?.text)
        .map((part) => part.text)
        .join("\n");

      console.error(
        "Gemini returned no image:",
        textMessage || result?.promptFeedback || result
      );

      return Response.json(
        {
          error:
            textMessage ||
            "Gemini ne image nahi bheji. API model access, billing aur quota check karein."
        },
        { status: 502 }
      );
    }

    const imageData = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType;

    return Response.json({
      success: true,
      message: "Aapki image taiyar hai! ✨",
      image: `data:${mimeType};base64,${imageData}`
    });
  } catch (error) {
    console.error("Image generation error:", error);

    const isTimeout =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    return Response.json(
      {
        error: isTimeout
          ? "Image banane mein zyada samay laga. Dobara try karein."
          : error?.message ||
            "Image generate karte waqt technical problem aa gayi."
      },
      { status: 500 }
    );
  }
}
