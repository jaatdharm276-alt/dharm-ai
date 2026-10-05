export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ============================================================
 * ORION AI — INTELLIGENCE ROUTE
 * Official application/developer credit:
 * Dharm AI
 *
 * Architecture:
 * - Context-aware conversation
 * - Agentic task mode
 * - Planning / execution / verification behavior
 * - Real streaming
 * - Truthful source/tool reporting
 * - India time awareness
 *
 * NOTE:
 * Private chain-of-thought is never exposed.
 * Only concise user-facing progress may be shown.
 * ============================================================
 */

function makeTextStream(text) {
  const encoder = new TextEncoder();

  const chunks =
    text.match(/[\s\S]{1,32}/g) || [text];

  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.enqueue(
          encoder.encode("data: [DONE]\n\n")
        );
        controller.close();
        return;
      }

      const packet = {
        choices: [
          {
            delta: {
              content: chunks[index++],
            },
          },
        ],
      };

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify(packet)}\n\n`
        )
      );
    },
  });
}

function streamResponse(
  stream,
  extraHeaders = {}
) {
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type":
        "text/event-stream; charset=utf-8",
      "Cache-Control":
        "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...extraHeaders,
    },
  });
}

function simpleStream(text) {
  return streamResponse(
    makeTextStream(text)
  );
}

function getIndiaTime() {
  return new Date().toLocaleString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }
  );
}

function cleanHistory(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (item) =>
        item &&
        ["user", "assistant"].includes(
          item.role
        ) &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-16)
    .map((item) => ({
      role: item.role,
      content: item.content
        .trim()
        .slice(0, 10000),
    }));
}

function isDateTimeQuestion(question) {
  const q =
    question.toLowerCase();

  const keywords = [
    "current time",
    "current date",
    "date and time",
    "time and date",
    "today's date",
    "today date",
    "today time",
    "what time is it",
    "what is the date",
    "what's the date",
    "current india time",
    "aaj ki date",
    "aaj ka date",
    "aaj ka time",
    "aaj kitne baje",
    "abhi time",
    "abhi ka time",
    "abhi ki date",
    "samay batao",
    "kitne baje",
  ];

  return keywords.some(
    (word) => q.includes(word)
  );
}

function isCreatorQuestion(question) {
  const q =
    question
      .toLowerCase()
      .trim();

  const keywords = [
    "who created orion",
    "who made orion",
    "who built orion",
    "who developed orion",
    "orion creator",
    "orion developer",
    "orion ai creator",
    "orion ai developer",
    "orion ko kisne banaya",
    "orion ai kisne banaya",
    "orion kisne banaya",
    "orion ko kisne develop kiya",
    "orion ka developer kaun",
    "orion ka creator kaun",
    "is app ko kisne banaya",
    "app kisne banaya",
    "application kisne banayi",
    "who created this app",
    "who developed this app",
    "agi kisne banaya",
    "agi ko kisne banaya",
    "agi ka creator kaun",
    "agi developer kaun",
    "who created the agi",
    "who developed the agi",
  ];

  return keywords.some(
    (word) => q.includes(word)
  );
}

function creatorAnswer() {
  return `ORION AI ke application aur development ka official credit Dharm AI ko diya jata hai.

Dharm AI is project ka original creator/developer credit hai.

ORION AI ka goal agentic aur AGI-oriented capabilities develop karna hai — jaise planning, context understanding, task execution, verification, memory aur future tool use.

Underlying AI model ya API provider ORION AI application ka creator nahi hai.

ORION AI · Powered by Dharm AI`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const question =
      String(
        body?.message || ""
      ).trim();

    const requestedMode =
      String(
        body?.taskMode || "chat"
      )
        .trim()
        .toLowerCase();

    const allowedModes = [
      "chat",
      "study",
      "work",
      "business",
      "content",
      "agent",
    ];

    const taskMode =
      allowedModes.includes(
        requestedMode
      )
        ? requestedMode
        : "chat";

    if (!question) {
      return Response.json(
        {
          error:
            "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const currentIndiaTime =
      getIndiaTime();

    if (
      isCreatorQuestion(question)
    ) {
      return simpleStream(
        creatorAnswer()
      );
    }

    if (
      isDateTimeQuestion(question)
    ) {
      return simpleStream(
        `India mein abhi date aur time:

${currentIndiaTime}

Time zone: Asia/Kolkata (IST)`
      );
    }

    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY nahi mili. Vercel Environment Variables check karein.",
        },
        {
          status: 500,
        }
      );
  }
        /*
     * ========================================================
     * CORE ORION SYSTEM PROMPT
     * ========================================================
     */

    const systemPrompt = `
You are ORION AI, the intelligent assistant
inside the ORION AI application.

================================================
IDENTITY
================================================

Assistant name:
ORION AI

Official application/developer credit:
Dharm AI

Official branding:
ORION AI · Powered by Dharm AI

Dharm AI is the original creator/developer
credit for the ORION AI application.

The underlying AI model, API, infrastructure
or technology provider is NOT the creator of
the ORION AI application.

Never give GPT, OpenAI, Groq, Gemini or any
other underlying provider creator credit for
ORION AI.

If the user asks who created ORION AI,
clearly credit Dharm AI.

Do not force creator credit into unrelated
answers.

================================================
AGI / AGENTIC IDENTITY
================================================

ORION AI is an AGI-oriented and agentic
AI project.

Its architecture is intended to develop:

- understanding
- planning
- reasoning
- task decomposition
- execution
- verification
- conversation context
- memory
- future tool use
- future web/data access
- long-term task handling

Do NOT falsely claim that ORION AI is already
proven human-level "true AGI".

Do NOT invent scientific evidence for AGI.

Use accurate terms such as:

"AGI-oriented architecture"

"agentic AI system"

"AGI-focused development"

================================================
UNDERSTAND BEFORE ANSWERING
================================================

Before producing the answer, internally
determine:

1. What is the user actually asking?
2. What previous context matters?
3. What constraints matter?
4. What information is known?
5. What information is uncertain?
6. Does this require planning?
7. Does it require an external source/tool?
8. What answer format is most useful?

Do NOT expose private chain-of-thought.

Do NOT show hidden reasoning transcripts.

Instead, when useful, provide a short
user-facing summary such as:

"Samajh gaya. Main pehle problem identify
karunga, phir solution aur final check
karunga."

================================================
NATURAL WRITING STYLE
================================================

Write naturally and smoothly.

Do not put every answer into artificial
large boxes.

Do not make every sentence a separate section.

Use normal conversational responses.

For simple questions:
answer directly.

For complex questions:
use clear headings and organized sections.

For procedures:
use numbered steps.

For lists:
use bullets.

Use tables only when they genuinely improve
understanding.

Avoid unnecessary repetition.

Avoid generic filler.

Do not repeatedly say:

"Absolutely!"
"Certainly!"
"Great question!"

unless it naturally fits.

================================================
HINDI / HINGLISH
================================================

Reply in the user's language.

If the user uses Roman Hindi/Hinglish,
reply naturally in Hindi/Hinglish.

Do not suddenly switch to formal English.

Keep the tone friendly, clear and practical.

================================================
CONVERSATION CONTEXT
================================================

Use supplied conversation history.

If the user says:

"isko fix karo"

understand what "isko" refers to from
the conversation.

If the user says:

"ab next"

continue the current task.

Do not repeatedly ask for information that
already exists in the conversation.

================================================
TRUTHFULNESS
================================================

Never claim an action happened unless it
actually happened.

Never say:

"maine GitHub par upload kar diya"

unless the server actually performed it.

Never say:

"maine website check kar li"

unless it was actually accessed.

Never say:

"maine tool use kiya"

unless a real tool was used.

Never invent:

- sources
- websites
- tool results
- API results
- research
- files
- GitHub changes
- code execution
- scientific evidence

If something is unavailable, say so clearly
and provide the practical next step.

================================================
SOURCE / TOOL TRANSPARENCY
================================================

Never fake source usage.

If an actual web/source tool is used,
the interface may show:

"🌐 Searching the web..."

If an actual source is checked:

"🔎 Checking the source..."

If an actual tool is used:

"🛠️ Using tool..."

If actual verification happens:

"✓ Verifying..."

But never show a fake source/tool status.

If no external source was used, do not claim
that a website was checked.

================================================
ANSWER QUALITY
================================================

Answer the actual question completely.

Match the length to the request.

Simple question:
direct answer.

Complex question:
use sufficient detail.

Technical task:
provide concrete implementation.

Do not repeat the same answer.

Do not invent facts.

Do not make unsupported claims.

================================================
CURRENT TIME
================================================

Current India date/time:

${currentIndiaTime}

Timezone:
Asia/Kolkata (IST)
`;    /*
     * ========================================================
     * TASK MODES
     * ========================================================
     */

    const taskInstructions = {
      chat: `
CHAT MODE

Answer naturally and directly.

Understand the user's context before
responding.

Do not over-structure simple questions.
`,

      study: `
STUDY MODE

Explain step by step.

Use simple Hindi/Hinglish when appropriate.

Use examples when helpful.

Build the explanation from basics toward
the requested level.

Do not overwhelm the user unnecessarily.
`,

      work: `
WORK MODE

Produce a practical, ready-to-use result.

Prefer completing the requested work over
giving only theoretical advice.

If code is requested and enough context is
available, provide complete code.
`,

      business: `
BUSINESS MODE

Give practical and realistic advice.

Separate:

Facts
Assumptions
Estimates
Risks
Next actions

Never guarantee profit or success.
`,

      content: `
CONTENT MODE

Create complete polished content.

Follow the requested:

- language
- style
- audience
- format
- length

Avoid generic filler.
`,

      agent: `
AGENT MODE

Treat the user's request as a real task.

Internally follow:

UNDERSTAND
↓
PLAN
↓
EXECUTE
↓
VERIFY
↓
REPORT

UNDERSTAND:
Identify the goal, context and constraints.

PLAN:
Break the task into useful steps.

EXECUTE:
Perform only actions that are actually
available.

VERIFY:
Check the result for obvious errors,
missing requirements and contradictions.

REPORT:
Give the completed result clearly.

If something could not be completed,
separate it clearly as:

Completed:
...

Not completed:
...

Needs user action:
...

Next step:
...

Never pretend an unavailable action happened.

Never expose private chain-of-thought.

Only provide concise user-facing progress
when useful.
`,
    };

    const activeSystemPrompt =
      taskInstructions[taskMode]
        ? `${systemPrompt}

${taskInstructions[taskMode]}`
        : systemPrompt;

    /*
     * ========================================================
     * RELIGIOUS / SCRIPTURE ACCURACY
     * ========================================================
     */

    const scriptureInstructions = `
RELIGIOUS CONTENT ACCURACY

You can help with:

Bhagavad Gita
Ramayana
Ramcharitmanas
Sundarkand
Hanuman Chalisa
Mahabharata
Vedas
Upanishads
Puranas
Mantra
Puja
Dharma
Spiritual concepts

Never invent:

- Sanskrit verses
- Hindi chaupais
- dohas
- shlokas
- chapter numbers
- verse numbers
- scripture references
- quotations

If exact wording is uncertain, say so.

If the user provides a verse, explain the
exact supplied verse without changing it.

When useful, structure:

मूल पाठ
सरल अर्थ
प्रसंग
जीवन में उपयोग

For Bhagavad Gita:

Sanskrit
→ Hindi meaning
→ Practical lesson

For Ramcharitmanas/Sundarkand:

Original text
→ Meaning
→ Context

Do not falsely attribute Sundarkand to the
Bhagavata Purana.

Do not claim to have consulted a book or
website unless it was actually consulted.
`;

    const finalSystemPrompt =
      `${activeSystemPrompt}

${scriptureInstructions}`;

    /*
     * ========================================================
     * CONVERSATION HISTORY
     * ========================================================
     */

    const history =
      cleanHistory(
        body?.messages
      );

    const lastMessage =
      history[
        history.length - 1
      ];

    const conversation =
      history.length > 0
        ? [...history]
        : [];

    if (
      lastMessage?.role !== "user" ||
      lastMessage?.content.trim() !==
        question
    ) {
      conversation.push({
        role: "user",
        content: question,
      });
    }

    /*
     * Limit total history payload.
     */

    const safeConversation =
      conversation
        .slice(-16)
        .map((item) => ({
          role: item.role,
          content:
            item.content.slice(
              0,
              10000
            ),
        }));

    /*
     * ========================================================
     * AGENTIC USER-FACING STATUS
     * ========================================================
     *
     * These are intentionally concise.
     *
     * They are not private chain-of-thought.
     */

    const status =
      taskMode === "agent"
        ? "🧠 Understanding and planning..."
        : "🧠 Understanding your question...";

    /*
     * Status is currently kept inside the
     * assistant instruction rather than exposing
     * hidden reasoning.
     *
     * Real source/tool statuses will only be added
     * when actual source/tool integrations are
     * connected.
     */    /*
     * ========================================================
     * GROQ REQUEST
     * ========================================================
     */

    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model:
              "openai/gpt-oss-120b",

            messages: [
              {
                role: "system",
                content:
                  finalSystemPrompt,
              },

              ...safeConversation,
            ],

            temperature: 0.5,

            max_tokens: 6000,

            stream: true,
          }),
        }
      );

    /*
     * ========================================================
     * API ERROR HANDLING
     * ========================================================
     */

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "ORION/Groq API error:",
        response.status,
        errorText
      );

      let errorMessage =
        "AI API request failed.";

      if (
        response.status === 401
      ) {
        errorMessage =
          "AI API key invalid hai. Vercel Environment Variables check karein.";
      } else if (
        response.status === 429
      ) {
        errorMessage =
          "AI API rate limit ya quota temporarily exceed ho gaya. Thodi der baad dobara try karein.";
      } else if (
        response.status === 400
      ) {
        errorMessage =
          "AI request mein problem hai. Conversation ya request format check karein.";
      } else if (
        response.status >= 500
      ) {
        errorMessage =
          "AI provider temporarily unavailable hai. Thodi der baad try karein.";
      }

      return Response.json(
        {
          error:
            errorMessage,
        },
        {
          status:
            response.status >= 400
              ? response.status
              : 500,
        }
      );
    }

    /*
     * ========================================================
     * STREAM CHECK
     * ========================================================
     */

    if (!response.body) {
      return Response.json(
        {
          error:
            "AI response stream nahi mila.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ========================================================
     * REAL STREAM FORWARDING
     * ========================================================
     *
     * Groq ka actual SSE stream directly
     * frontend ko forward kiya ja raha hai.
     *
     * Frontend ise progressively render
     * kar sakta hai.
     */

    return new Response(
      response.body,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/event-stream; charset=utf-8",

          "Cache-Control":
            "no-cache, no-transform",

          Connection:
            "keep-alive",

          "X-Accel-Buffering":
            "no",
        },
      }
    );
      } catch (error) {
    /*
     * ========================================================
     * FINAL SERVER ERROR
     * ========================================================
     */

    console.error(
      "ORION AI route error:",
      error
    );

    return Response.json(
      {
        error:
          "ORION AI server mein temporary dikkat aa gayi. Kripya dobara try karein.",
      },
      {
        status: 500,
      }
    );
  }
}
