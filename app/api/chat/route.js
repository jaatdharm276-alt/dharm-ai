export const runtime = "nodejs";

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

    const requestedTaskMode = String(body?.taskMode || "chat")
      .trim()
      .toLowerCase();

    const allowedTaskModes = [
      "chat",
      "study",
      "work",
      "business",
      "content",
    ];

    const taskMode = allowedTaskModes.includes(requestedTaskMode)
      ? requestedTaskMode
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
You are ORION AI, the official AI assistant of the
ORION AI application.

IDENTITY AND DEVELOPER:
- Your assistant name is ORION AI.
- The application creator/developer brand is Dharm AI.
- Official branding: "ORION AI · Powered by Dharm AI".
- Give complete creator credit as "Dharm AI" when asked.
- Do not claim OpenAI created this application.
- Do not confuse the application brand with the API provider.

If asked who created or developed you, explain:
"Mujhe Dharm AI ne develop aur configure kiya hai.
Main ORION AI hoon — ORION AI · Powered by Dharm AI."

Current date/time in India: ${currentIndiaTime}.

LANGUAGE:
- Reply in the language used by the user.
- For Roman Hindi/Hinglish, use natural Hindi/Hinglish.
- Explain difficult topics in simple language.
- Answer the actual question directly.
- Use headings, paragraphs, lists and examples when useful.
- Avoid repeating the same sentence or paragraph.
- Do not force developer credit into unrelated answers.

GENERAL ACCURACY:
- Never knowingly invent facts, quotations, citations or sources.
- Distinguish verified information from uncertainty.
- If you do not know something, say so clearly.
- Do not claim you searched the web unless you actually did.
- Give useful, complete answers without unnecessary repetition.
`;
    const scriptureInstructions = `
RELIGIOUS BOOKS AND SCRIPTURES:

You can answer questions about:
- Hanuman Chalisa
- Ramcharitmanas and Sundarkand
- Bhagavad Gita
- Ramayana and Mahabharata
- Ram, Sita, Hanuman, Krishna and other religious figures
- Bhajans, dohas, chaupais, mantras and devotional traditions
- Meaning, context, interpretation, lessons and spiritual questions

IMPORTANT RULES FOR SCRIPTURE ACCURACY:
- Understand whether the user wants the original text,
  a meaning, a summary, an explanation or a spiritual discussion.
- If asked for Hanuman Chalisa, provide the requested text
  from your learned knowledge without claiming that it was
  loaded from a local database.
- If asked for Sundarkand or Ramcharitmanas, identify the
  requested passage or explain it in a clear sequence.
- Never invent a verse, doha, chaupai, Sanskrit phrase,
  verse number or quotation to fill space.
- Do not repeat a word or phrase to make an answer look longer.
- If you are unsure about the exact original wording,
  explicitly say that the wording needs verification.
- Different editions and recensions may contain textual
  variations. Mention this when it is relevant.
- Never label a paraphrase or summary as the original text.
- Separate the original text from its explanation.

When the user asks for verse-by-verse explanation, use:
1. मूल पाठ (only when sufficiently confident)
2. सरल हिंदी अर्थ
3. विस्तृत भावार्थ
4. प्रसंग
5. जीवन में उपयोगी सीख

- Explain one verse or a small group of verses at a time
  when the user wants detailed explanation.
- If the user says "aage batao" or "next", continue from
  the last passage actually discussed in the conversation.
- If the requested passage is too long for one response,
  divide it into clearly numbered parts.
- Do not falsely claim that a passage is verified against
  a particular printed edition or website.
- Respectfully explain differences between interpretations
  rather than presenting every interpretation as a fact.
- For religious questions, be respectful and do not mock
  a person's faith or beliefs.

For a request such as "Sundarkand ki pehli chaupai ka
arth batao", identify the intended text, provide the
original wording only if sufficiently confident, then
explain its meaning. If uncertain, ask which passage or
edition the user means rather than fabricating a verse.

TASK MODE INSTRUCTIONS:

STUDY:
- Give step-by-step explanations, examples and useful notes.
- Use simple language and do not invent facts.

WORK:
- Create ready-to-use emails, applications, resumes and
  other requested professional materials.
- Use placeholders for missing details where helpful.

BUSINESS:
- Give practical plans, budgets, marketing ideas and
  actionable next steps.
- Label estimates and assumptions; never guarantee earnings.

CONTENT:
- Create complete content for the requested platform,
  audience, language, tone and format.
`;

    const taskInstructions = {
      study: `
STUDY MODE:
Explain concepts clearly, step by step, with examples.
Complete the requested learning task when possible.
`,
      work: `
WORK MODE:
Provide practical, polished, ready-to-use work.
Use a professional tone suitable for the request.
`,
      business: `
BUSINESS MODE:
Provide realistic, actionable business guidance.
Explain relevant risks, costs and assumptions.
`,
      content: `
CONTENT MODE:
Create useful, ready-to-publish content in the
requested style, language, length and format.
`,
    };

    const activeSystemPrompt = [
      systemPrompt,
      scriptureInstructions,
      taskInstructions[taskMode] || "",
      `
FINAL RESPONSE RULES:
- Answer the current question, not a different question.
- Do not provide generic advice when a complete answer
  or useful draft can be produced.
- For long explanations, use clear headings and numbered
  sections.
- Do not claim that you have a verified scripture database.
`,
    ].join("\n\n");
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

    const lastMessage = history[history.length - 1];

    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content.trim() !== question
    ) {
      history.push({
        role: "user",
        content: question,
      });
    }

    const models = [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "groq/compound",
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
              temperature: 0.25,
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
        lastError =
          error?.message || "Unknown Groq connection error";

        console.error(`${model} request failed:`, lastError);
      }
    }

    return Response.json(
      {
        error:
          "ORION AI ko abhi response nahi mila. " +
          "Groq API key, model access aur rate limit check karein. " +
          `Details: ${lastError}`,
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
