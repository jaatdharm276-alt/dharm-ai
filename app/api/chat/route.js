
export async function POST(req) {
  try {
    const { message } = await req.json();
    const question = String(message || "").trim();

    if (!question) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // India current date and time — no Gemini quota needed
    const indiaTime = () =>
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "long",
      });

    if (
      /(current time|current date|date and time|what time is it|today'?s date|aaj ki date|aaj ka date|aaj ka time|abhi kitne baje|samay batao|date aur time|आज की तारीख|अभी कितने बजे)/i.test(
        question
      )
    ) {
      return Response.json({
        reply:
          `India mein abhi date aur time:\n${indiaTime()}\n\nTime zone: Asia/Kolkata (IST)`,
        hasLiveSources: false,
      });
    }

    // Live news via Google News RSS — does not use Gemini quota
    if (
      /(latest news|live news|today'?s news|breaking news|latest headlines|technology news|tech news|cricket news|political news|narendra modi.*news|news batao|taaza khabar|taaza news|aaj ki khabar|aaj ki news|ताज़ा खबर|ताजा खबर|आज की खबर|लेटेस्ट न्यूज़)/i.test(
        question
      )
    ) {
      const query = encodeURIComponent(question);
      const rssUrl =
        `https://news.google.com/rss/search?q=${query}&hl=hi&gl=IN&ceid=IN:hi`;

      const rssResponse = await fetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 ORION-AI/1.0" },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });

      if (!rssResponse.ok) {
        throw new Error("News feed request failed");
      }

      const xml = await rssResponse.text();

      const decode = (value) =>
        value
          .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&apos;/g, "'");

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .slice(0, 8)
        .map((match) => {
          const item = match[1];
          const get = (tag) => {
            const found = item.match(
              new RegExp(`<${tag}[^>]*>([\\\\s\\\\S]*?)<\\\\/${tag}>`, "i")
            );
            return found ? decode(found[1].trim()) : "";
          };

          return {
            title: get("title"),
            link: get("link"),
            date: get("pubDate"),
            source: get("source"),
          };
        })
        .filter((item) => item.title && item.link);

      if (!items.length) {
        return Response.json({
          reply:
            "Abhi is sawal ke liye news results nahi mile. Thodi der baad dobara try karein.",
          hasLiveSources: false,
        });
      }

      const reply =
        `Google News se mili taaza headlines:\n\n` +
        items
          .map(
            (item, i) =>
              `${i + 1}. ${item.title}\n` +
              (item.source ? `Source: ${item.source}\n` : "") +
              (item.date ? `Date: ${item.date}\n` : "") +
              `Link: ${item.link}`
          )
          .join("\n\n");

      return Response.json({
        reply,
        hasLiveSources: true,
      });
    }

    // Gemini for other questions, with Google Search grounding
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Vercel Environment Variables mein GEMINI_API_KEY missing hai." },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, a helpful assistant.
Current date and time in India: ${indiaTime()}.
Reply in the user's preferred language, including Hindi and Hinglish.
Use Google Search grounding for current facts whenever useful.
Never invent current events, sources, or search results.
If live search was not performed, be honest about it.
`;

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
    ];

    let lastError = "";

    for (const model of models) {
      try {
        const apiResponse = await fetch(
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
                  parts: [{ text: question }],
                },
              ],
              tools: [{ google_search: {} }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
            signal: AbortSignal.timeout(45000),
          }
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          lastError = data?.error?.message || `API error ${apiResponse.status}`;
          console.error(`${model}:`, lastError);

          // Quota error usually affects the same project/key.
          if (apiResponse.status === 429) break;
          continue;
        }

        const candidate = data?.candidates?.[0];
        let reply = (candidate?.content?.parts || [])
          .map((part) => part.text || "")
          .filter(Boolean)
          .join("\n")
          .trim();

        if (!reply) {
          lastError = "Gemini returned an empty response.";
          continue;
        }

        const chunks =
          candidate?.groundingMetadata?.groundingChunks || [];
        const sources = [];
        const seen = new Set();

        for (const chunk of chunks) {
          const web = chunk?.web;
          if (web?.uri && !seen.has(web.uri)) {
            seen.add(web.uri);
            sources.push(`- ${web.title || "Source"}: ${web.uri}`);
          }
        }

        if (sources.length) {
          reply += "\n\nSources:\n" + sources.join("\n");
        }

        return Response.json({
          reply,
          hasLiveSources: sources.length > 0,
        });
      } catch (error) {
        lastError = error?.message || "Unknown error";
        console.error(`${model} request failed:`, lastError);
      }
    }

    return Response.json(
      {
        error:
          lastError.includes("quota") || lastError.includes("Quota")
            ? "Gemini ki API quota khatam hai. Date/time aur Google News headlines alag se kaam kar sakte hain. Baaki AI answers ke liye quota reset ya billing check karein."
            : `Gemini API se jawab nahi mila. ${lastError}`,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("ORION route error:", error);

    return Response.json(
      { error: "Request fail hui. Internet check karke dobara try karein." },
      { status: 500 }
    );
  }
          }
            
