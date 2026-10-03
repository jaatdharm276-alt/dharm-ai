
const HANUMAN_CHALISA = `॥ श्री हनुमते नमः ॥

॥ दोहा ॥
श्रीगुरु चरन सरोज रज, निज मन मुकुरु सुधारि।
बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि॥

बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार।
बल बुद्धि विद्या देहु मोहिं, हरहु कलेस बिकार॥

॥ चौपाई ॥
जय हनुमान ज्ञान गुन सागर।
जय कपीस तिहुँ लोक उजागर॥

राम दूत अतुलित बल धामा।
अंजनि-पुत्र पवनसुत नामा॥

महाबीर बिक्रम बजरंगी।
कुमति निवार सुमति के संगी॥

कंचन बरन बिराज सुबेसा।
कानन कुंडल कुंचित केसा॥

हाथ बज्र औ ध्वजा बिराजै।
काँधे मूँज जनेऊ साजै॥

शंकर सुवन केसरी नंदन।
तेज प्रताप महा जग वंदन॥

विद्यावान गुनी अति चातुर।
राम काज करिबे को आतुर॥

प्रभु चरित्र सुनिबे को रसिया।
राम लखन सीता मन बसिया॥

सूक्ष्म रूप धरि सियहिं दिखावा।
बिकट रूप धरि लंक जरावा॥

भीम रूप धरि असुर सँहारे।
रामचंद्र के काज सँवारे॥

लाय सजीवन लखन जियाए।
श्रीरघुबीर हरषि उर लाए॥

रघुपति कीन्ही बहुत बड़ाई।
तुम मम प्रिय भरतहि सम भाई॥

सहस बदन तुम्हरो जस गावैं।
अस कहि श्रीपति कंठ लगावैं॥

सनकादिक ब्रह्मादि मुनीसा।
नारद सारद सहित अहीसा॥

जम कुबेर दिगपाल जहाँ ते।
कवि कोविद कहि सके कहाँ ते॥

तुम उपकार सुग्रीवहिं कीन्हा।
राम मिलाय राज पद दीन्हा॥

तुम्हरो मंत्र विभीषण माना।
लंकेश्वर भए सब जग जाना॥

जुग सहस्र जोजन पर भानू।
लील्यो ताहि मधुर फल जानू॥

प्रभु मुद्रिका मेलि मुख माहीं।
जलधि लाँघि गए अचरज नाहीं॥

दुर्गम काज जगत के जेते।
सुगम अनुग्रह तुम्हरे तेते॥

राम दुआरे तुम रखवारे।
होत न आज्ञा बिनु पैसारे॥

सब सुख लहै तुम्हारी सरना।
तुम रक्षक काहू को डरना॥

आपन तेज सम्हारो आपै।
तीनों लोक हाँक तें काँपै॥

भूत पिशाच निकट नहिं आवै।
महाबीर जब नाम सुनावै॥

नासै रोग हरै सब पीरा।
जपत निरंतर हनुमत बीरा॥

संकट तें हनुमान छुड़ावै।
मन क्रम वचन ध्यान जो लावै॥

सब पर राम तपस्वी राजा।
तिन के काज सकल तुम साजा॥

और मनोरथ जो कोई लावै।
सोइ अमित जीवन फल पावै॥

चारों जुग परताप तुम्हारा।
है परसिद्ध जगत उजियारा॥

साधु संत के तुम रखवारे।
असुर निकंदन राम दुलारे॥

अष्ट सिद्धि नौ निधि के दाता।
अस बर दीन जानकी माता॥

राम रसायन तुम्हरे पासा।
सदा रहो रघुपति के दासा॥

तुम्हरे भजन राम को पावै।
जनम जनम के दुख बिसरावै॥

अंत काल रघुबर पुर जाई।
जहाँ जन्म हरि-भक्त कहाई॥

और देवता चित्त न धरई।
हनुमत सेइ सर्व सुख करई॥

संकट कटै मिटै सब पीरा।
जो सुमिरै हनुमत बलबीरा॥

जय जय जय हनुमान गोसाईं।
कृपा करहु गुरुदेव की नाईं॥

जो सत बार पाठ कर कोई।
छूटहि बंदि महा सुख होई॥

जो यह पढ़ै हनुमान चालीसा।
होय सिद्धि साखी गौरीसा॥

तुलसीदास सदा हरि चेरा।
कीजै नाथ हृदय महँ डेरा॥

॥ दोहा ॥
पवन तनय संकट हरन, मंगल मूरति रूप।
राम लखन सीता सहित, हृदय बसहु सुर भूप॥`;

function makeTextStream(text) {
  const encoder = new TextEncoder();
  const chunks = text.match(/[\s\S]{1,32}/g) || [text];
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      const packet = {
        choices: [{ delta: { content: chunks[index++] } }],
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(packet)}\n\n`)
      );
    },
  });
}

function streamResponse(stream, extraHeaders = {}) {
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...extraHeaders,
    },
  });
}

function wantsFullHanumanChalisa(question) {
  const q = String(question || "").toLowerCase();

  const mentionsChalisa =
    q.includes("hanuman chalisa") ||
    q.includes("हनुमान चालीसा") ||
    q.includes("हनुमानचालीसा");

  const asksForFull =
    /puri|poori|pura|poora|full|complete|likho|likh do|bhejo|पुरी|पूरी|संपूर्ण|पूरा|लिखो|लिख दो|पाठ|चालीसा सुनाओ/.test(
      q
    );

  return mentionsChalisa && asksForFull;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const question = String(body?.message || "").trim();

    if (!question) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (wantsFullHanumanChalisa(question)) {
      return streamResponse(makeTextStream(HANUMAN_CHALISA));
    }

    const q = question.toLowerCase();

    const currentIndiaTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

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
      const reply = `India mein abhi date aur time:\n\n${currentIndiaTime}\n\nTime zone: Asia/Kolkata (IST)`;
      return streamResponse(makeTextStream(reply));
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY nahi mili. Vercel → Settings → Environment Variables mein GROQ_API_KEY check karke redeploy karein.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are ORION AI, a careful, capable and friendly assistant. The original credit is Dharm AI.
Current date/time in India: ${currentIndiaTime}.
Respond naturally in the language used by the user. For Roman Hindi/Hinglish, answer in natural Hinglish or Hindi.
Answer directly and completely. Use headings, paragraphs, numbered lists and code blocks only when they help.
Never intentionally repeat the same paragraph, line, verse or list item. Before finishing, check for duplicated text and remove accidental repetition.
Do not invent quotations, scripture, exact lyrics, legal wording, live facts or sources. If asked for a complete Hanuman Chalisa, the server supplies a fixed text; otherwise explain religious text carefully and acknowledge uncertainty when needed.
Keep numbering and line breaks in lists and verses correct. Do not add stray numbers or commentary into a requested text.
For coding, give practical working code and explain important setup steps. Do not claim web search was performed unless it actually was.
Do not use Markdown code fences unless code is being shown.
`;

    const suppliedMessages = Array.isArray(body?.messages)
      ? body.messages
      : [];

    const history = suppliedMessages
      .filter(
        (item) =>
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.trim()
      )
      .slice(-20)
      .map((item) => ({
        role: item.role,
        content: item.content.slice(0, 12000),
      }));

    if (!history.length || history[history.length - 1].role !== "user") {
      history.push({ role: "user", content: question });
    }

    // Groq streams real tokens. If the first model is unavailable,
    // try the fallback before returning a response.
    const models = [
      "groq/compound",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    let lastError = "";
      
    for (const model of models) {
      try {
        const upstream = await fetch(
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
                { role: "system", content: systemPrompt },
                ...history,
              ],
              temperature: 0.35,
              max_tokens: 4096,
              stream: true,
            }),
          }
        );

        if (!upstream.ok) {
          const errorData = await upstream.json().catch(() => ({}));
          lastError =
            errorData?.error?.message ||
            `Groq API error (${upstream.status})`;

          console.error(`${model} failed before streaming:`, lastError);
          continue;
        }

        if (!upstream.body) {
          lastError = "Groq response stream missing.";
          continue;
        }

        return streamResponse(upstream.body, {
          "X-Orion-Model": model,
        });
      } catch (error) {
        lastError = error?.message || "Unknown Groq error";
        console.error(`${model} request failed:`, lastError);
      }
    }

    return Response.json(
      {
        error: `ORION AI ko abhi response nahi mila. API key, model access aur Groq rate limit check karein. Details: ${lastError}`,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("ORION AI chat route error:", error);

    return Response.json(
      {
        error:
          "Request process nahi ho saki. Page refresh karke dobara try karein.",
      },
      { status: 500 }
    );
  }
}
