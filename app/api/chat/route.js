
function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractTag(item, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const match = item.match(regex);
  return match ? decodeXml(match[1]) : "";
}

function getIndiaTime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "long",
  });
}

function isNewsQuestion(message) {
  return /(latest news|today'?s news|current news|breaking news|news today|news about|latest update|samachar|taaza khabar|taza khabar|aaj ki news|aaj ki khabar|taaja khabar|ताज़ा खबर|ताजा खबर|आज की खबर|आज की न्यूज़|आज की न्यूज|लेटेस्ट न्यूज़|current affairs|cricket score|live score|latest score|recent news)/i.test(
    message
  );
}

function getNewsQuery(message) {
  return message
    .replace(
      /(please|batao|bataye|bataiye|dikhao|dikhaye|mujhe|aaj ki|aaj ka|today'?s|today|latest|breaking|current|news|samachar|taaza|taza|khabar|khaba?r|ke baare mein|ke bare mein|about|headlines|kya hai|kya chal raha hai|की|का|के|आज|ताज़ा|ताजा|खबर|समाचार|न्यूज़|न्यूज|बताओ|बताइए|दिखाओ)/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function getLiveNews(userMessage) {
  const query = getNewsQuery(userMessage);

  // General news question par India ki Hindi headlines
  const isGenericNews =
    query.length < 3 ||
    /^(news|india|latest|today|headlines|samachar|khabar)$/i.test(
      query
    );

  const feedUrl = isGenericNews
    ? "https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi"
    : `https://news.google.com/rss/search?q=${encodeURIComponent(
        `${query} when:1d`
      )}&hl=hi&gl=IN&ceid=IN:hi`;

  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "ORION-AI-News/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`News feed error: ${response.status}`);
  }

  const xml = await response.text();
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

  const articles = items.slice(0, 8).map((item) => ({
    title: extractTag(item, "title"),
    link: extractTag(item, "link"),
    published: extractTag(item, "pubDate"),
  })).filter((article) => article.title && article.link);

  if (articles.length === 0) {
    return {
      reply:
        "Maaf, abhi is topic par koi news headline nahi mili. Thodi der baad dobara try karein.",
      hasLiveSources: false,
    };
  }

  let reply = isGenericNews
    ? `India ki latest news headlines:\n\n`
    : `"${query}" ke baare mein news headlines:\n\n`;

  articles.forEach((article, index) => {
    let publishedText = "";

    if (article.published) {
      const date = new Date(article.published);

      if (!Number.isNaN(date.getTime())) {
        publishedText = date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
    }

    reply += `${index + 1}. ${article.title}\n`;

    if (publishedText) {
      reply += `Published: ${publishedText} IST\n`;
    }

    reply += `Source link: ${article.link}\n\n`;
  });

  reply +=
    "Note: Ye live news feed ki headlines hain. Puri khabar aur context ke liye source link kholen.";

  return {
    reply,
    hasLiveSources: true,
  };
}

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

    // Date/time ka jawab bina Gemini API ke
    if (
      /(current time|current date|date and time|time right now|what time is it|today'?s date|today'?s time|aaj ki date|aaj ka date|aaj ka samay|abhi kitne baje|abhi ka time|samay batao|time aur date|date aur time|आज की तारीख|अभी कितने बजे)/i.test(
        userMessage
      )
    ) {
      return Response.json({
        reply:
          `India mein abhi date aur time:\n${getIndiaTime()}\n\n(Time zone: Asia/Kolkata, IST)`,
        hasLiveSources: false,
      });
    }

    // Latest news: Google News RSS, Gemini quota use nahi hoga
    if (isNewsQuestion(userMessage)) {
      try {
        const news = await getLiveNews(userMessage);
        return Response.json(news);
      } catch (error) {
        console.error("News feed error:", error);

        return Response.json({
          reply:
            "Maaf kijiye, abhi live news feed connect nahi ho pa rahi. Internet connection check karke thodi der baad dobara try karein.",
          hasLiveSources: false,
        });
      }
    }

    // Baaki sawalon ke liye Gemini API
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY missing hai. Vercel Environment Variables check karein.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, a helpful assistant.
Current India date and time: ${getIndiaTime()}.
Reply in the user's preferred language, including Hindi and Hinglish.
Never invent facts or claim to have searched the web when you have not.
For latest news, tell the user to ask for latest news headlines.
Be clear and honest if information is uncertain.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const apiMessage =
        data?.error?.message || "Gemini API request failed.";

      console.error("Gemini API error:", apiMessage);

      return Response.json(
        {
          error:
            response.status === 429
              ? "Gemini quota khatam hai. Latest news aur date/time phir bhi alag se kaam kar sakte hain."
              : "Gemini API request fail hui.",
          details: apiMessage,
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .filter(Boolean)
        .join("\n")
        .trim() || "Maaf kijiye, koi jawab nahi mila.";

    return Response.json({
      reply,
      hasLiveSources: false,
    });
  } catch (error) {
    console.error("ORION API error:", error);

    return Response.json(
      { error: "Server mein dikkat aayi. Dobara try karein." },
      { status: 500 }
    );
  }
}
