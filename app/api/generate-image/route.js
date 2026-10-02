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
            "Gemini API key nahi mili. Vercel Environment Variables mein GEMINI_API_KEY add karein."
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
          error:
            "Prompt bahut lamba hai. Kripya 4000 characters se kam likhein."
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-image",
          input:
            "Generate a high-quality image based on this user prompt. " +
            "Create the image itself, not just a description. " +
            "Prompt: " +
            prompt,
          response_format: {
            type: "image",
            mime_type: "image/png",
            aspect_ratio: "1:1",
            image_size: "1K"
          }
        }),
        signal: AbortSignal.timeout(55000)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini image API error:", result);

      const message =
        result?.error?.message ||
        "Gemini image generation request fail ho gayi.";

      return Response.json(
        { error: message },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    let imageData = result?.output_image?.data;
    let mimeType =
      result?.output_image?.mime_type || "image/png";

    // Agar image output_image ke bajay steps mein aaye.
    if (!imageData && Array.isArray(result?.steps)) {
      for (const step of result.steps) {
        if (step?.type !== "model_output") continue;

        for (const item of step?.content || []) {
          if (item?.type === "image" && item?.data) {
            imageData = item.data;
            mimeType = item.mime_type || "image/png";
            break;
          }
        }

        if (imageData) break;
      }
    }

    if (!imageData) {
      console.error(
        "Gemini response mein image nahi mili:",
        JSON.stringify(result).slice(0, 1500)
      );

      return Response.json(
        {
          error:
            "Gemini ne image return nahi ki. Dobara try karein ya API/model availability check karein."
        },
        { status: 502 }
      );
    }

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
