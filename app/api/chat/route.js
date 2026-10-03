
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req) {
  try {
    const body = await req.json();

    const question = String(body?.message || "").trim();
    const requestedMode = String(body?.taskMode || "chat")
      .trim()
      .toLowerCase();

    const allowedModes = [
      "chat",
      "study",
      "work",
      "business",
      "content",
    ];

    const taskMode = allowedModes.includes(requestedMode)
      ? requestedMode
      : "chat";

    if (!question) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const currentIndiaTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    });

    const q = question.toLowerCase();

    const dateTimeKeywords = [
      "current time",
      "current date",
      "date and time",
      "time and date",
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
    ];

    if (dateTimeKeywords.some((word) => q.includes(word))) {
      return streamResponse(
        makeTextStream(
          `India mein abhi date aur time:\n\n${currentIndiaTime}\n\nTime zone: Asia/Kolkata (IST)`
        )
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY nahi mili. Vercel Settings mein Environment Variables check karein.",
        },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are ORION AI, an intelligent assistant in the ORION AI
application, powered by Dharm AI.

IDENTITY:
- Your assistant name is ORION AI.
- Application creator/developer credit is Dharm AI.
- Official branding: ORION AI · Powered by Dharm AI.
- If asked who created this application, clearly credit Dharm AI.
- Do not force creator credit into unrelated answers.

LANGUAGE:
- Reply in the language the user uses.
- For Roman Hindi/Hinglish, reply naturally in Hindi or Hinglish.
- Be respectful, clear, helpful and direct.
- Follow the exact question. Do not offer unnecessary options
  when the user has asked for a direct answer.

RELIGIOUS TEXT AND SCRIPTURE ACCURACY:
- Help with Hanuman Chalisa, Sundarkand, Ramcharitmanas,
  Bhagavad Gita, Ramayana, Mahabharata, Vedas, Upanishads,
  Puranas, bhajans, prayers, stories and religious concepts.
- Explain verses and chaupais in simple Hindi when requested.
- If the user asks for the complete text of a known scripture
  or prayer, provide it only to the extent you can reproduce it
  accurately.
- Never invent a Sanskrit verse, Hindi chaupai, doha, quotation,
  verse number, chapter number or scripture reference.
- Never repeat filler words or fake verses just to make an
  answer longer.
- Do not substitute a summary for the original text without
  telling the user.
- Keep original text separate from its explanation.
- Clearly label sections as "मूल पाठ", "सरल अर्थ",
  "प्रसंग" and "जीवन में उपयोग" when relevant.
- For explanations, explain the meaning line by line if asked.
- For Sundarkand, distinguish the original Ramcharitmanas text
  from explanations, summaries and interpretations.
- For Bhagavad Gita, distinguish the Sanskrit shloka from
  its Hindi meaning and practical lesson.
- Do not incorrectly claim that Sundarkand belongs to the
  Bhagavata Purana. Identify Ramcharitmanas or another source
  accurately when known.
- Different editions may have spelling or numbering variations.
  Mention that when relevant.
- If you are uncertain about the exact original wording or
  reference, say so clearly instead of fabricating it.
- If the user provides a verse, explain that exact provided
  verse without changing its wording.
- Do not repeatedly ask the user to select options when the
  request is already clear.
- When asked for karma-based meaning, explain practical lessons
  about duty, intention, courage, humility, devotion and conduct
  only where relevant to the actual verse or episode.
- Do not pretend to have consulted a book or website unless
  a source was actually consulted.

ANSWER QUALITY:
- Answer the user's actual question completely.
- For "arth batao", explain the supplied or confidently known
  original verse line by line in simple Hindi.
- For "karm se samjhao", explain the practical lesson of the
  actual verse, without replacing the original meaning.
- For long answers, use clear headings and numbered sections.
- Do not repeat paragraphs.
- Do not fabricate sources, quotations or historical claims.
- If the exact requested passage is uncertain, explain the
  limitation and ask for the verse or a reliable source rather
  than creating fake text.

TASK MODES:
- study: provide clear explanations, notes and worked examples.
- work: provide ready-to-use professional drafts and plans.
- business: provide practical plans, steps, risks and assumptions.
- content: create complete content matching the requested format.
- chat: answer the user's question normally.

Current date/time in India: ${currentIndiaTime}.
`;

    const taskInstructions = {
      study: `
Explain the topic step by step.
Use simple Hindi/Hinglish when appropriate.
Include examples and accurate references where known.
`,
      work: `
Provide a useful, ready-to-use work product.
Use a professional tone and clear formatting.
`,
      business: `
Give practical, realistic steps and clearly identify estimates.
Do not guarantee profits or results.
`,
      content: `
Create complete, clearly structured content in the
requested language, style and format.
`,
    };

    const activeSystemPrompt = taskInstructions[taskMode]
      ? `${systemPrompt}\n\n${taskInstructions[taskMode]}`
      : systemPrompt;

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
      .slice(-16)
      .map((item) => ({
        role: item.role,
        content: item.content.slice(0, 10000),
      }));

    if (
      !history.length ||
      history[history.length - 1].role !== "user" ||
      history[history.length - 1].content.trim() !== question
    ) {
      history.push({
        role: "user",
        content: question,
      });
    }

    const models = [
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
                {
                  role: "system",
                  content: activeSystemPrompt,
                },
                ...history,
              ],
              temperature: 0.2,
              max_tokens: 6000,
              stream: true,
            }),
          }
        );

        if (!upstream.ok) {
          const errorData = await upstream.json().catch(() => ({}));

          lastError =
            errorData?.error?.message ||
            `Groq API error (${upstream.status})`;

          console.error(`${model} failed:`, lastError);
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
        error:
          "ORION AI ko response nahi mila. Groq API key, model access aur rate limit check karein. Details: " +
          lastError,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("ORION AI route error:", error);

    return Response.json(
      {
        error:
          "Request process nahi ho saki. Page refresh karke dobara try karein.",
      },
      { status: 500 }
    );
  }
        }
                              
