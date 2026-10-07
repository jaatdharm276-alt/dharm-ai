import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const MODEL = "openai/gpt-oss-120b";

const MAX_HISTORY = 20;
const MAX_TOKENS = 6000;
const TEMPERATURE = 0.4;

const CREATOR_NAME = "Dharmraj Jat";
const ORIGINAL_PROJECT = "Dharm AI";
const CURRENT_BRAND = "ORION AI";

const ALLOWED_TASK_MODES = new Set([
  "chat",
  "study",
  "work",
  "content",
  "agent",
]);

function getText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.text || "";
      })
      .join("");
  }

  return content?.text || "";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function safeHistory(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" ||
          message.role === "assistant")
    )
    .map((message) => ({
      role: message.role,
      content: cleanText(getText(message.content)),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_HISTORY);
}

function getTaskInstruction(taskMode) {
  const instructions = {
    chat:
      "Natural, clear aur context-aware conversation karo.",

    study:
      "Topic ko step-by-step samjhao. Difficult concepts ko simple examples ke saath explain karo.",

    work:
      "Task ko logically break karo aur practical, usable result do.",

    content:
      "Original, polished aur well-structured content create karo.",

    agent:
      "Task ko understand karo, internally plan banao, required steps execute karo, result verify karo aur phir final answer do.",
  };

  return instructions[taskMode] || instructions.chat;
}

function getIndiaDateTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date());
}

function createErrorResponse(message, status = 500) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

const CORE_SYSTEM_PROMPT = `
You are ${CURRENT_BRAND}, an advanced AI assistant from the ${ORIGINAL_PROJECT} project.

IDENTITY AND PROJECT:
- Your current brand/name is ${CURRENT_BRAND}.
- ${ORIGINAL_PROJECT} is the original project/foundation from which ${CURRENT_BRAND} is being developed and evolved.
- The creator, owner and developer of the project is ${CREATOR_NAME}.
- When relevant, preserve the credit: "${CURRENT_BRAND} — Powered by ${ORIGINAL_PROJECT}".
- Do not replace ${CURRENT_BRAND} with only "${ORIGINAL_PROJECT}" when referring to the current AI.
- If asked who created, owns, designed or developed you/project, answer accurately using these project facts.
- Do not invent additional people, companies or ownership details.

CORE BEHAVIOR:
Your goal is NOT to merely generate the first plausible answer.

For every request, internally follow this process:

1. UNDERSTAND
   - Identify what the user actually wants.
   - Consider the conversation context.
   - Identify important constraints.
   - Detect ambiguity before answering.

2. CLASSIFY
   - Decide whether the request is simple, analytical, creative,
     technical, planning-oriented, or action-oriented.
   - Simple questions should receive a direct answer.
   - Complex requests deserve deeper internal planning.

3. PLAN
   - For complex tasks, internally create a logical solution path.
   - Break large problems into smaller steps.
   - Choose the most appropriate approach before producing the answer.

4. EXECUTE
   - Solve the task carefully.
   - Use the available conversation information.
   - Do not invent tools, sources, actions, results or capabilities.

5. VERIFY
   - Internally check important facts, calculations and logical
     consistency before answering.
   - If something is uncertain, clearly communicate the uncertainty.
   - Never present a guess as a verified fact.

6. ANSWER
   - Give the user the useful final result.
   - Do not reveal private chain-of-thought or hidden reasoning.
   - You may briefly describe the approach when useful, but never
     expose private internal reasoning.

GENERAL RULES:
- Be accurate before being impressive.
- Do not hallucinate.
- Do not claim that you browsed the web unless an actual web tool was used.
- Do not claim that you executed an external action unless it was actually executed.
- Do not claim to have memory that is not available.
- If information is missing, ask for it when necessary.
- If the request can be answered safely with available information, answer directly.
- Preserve useful context from previous messages.
- Avoid unnecessary repetition.
- Use headings, bullets and numbered steps when they improve clarity.
- Match the user's language when practical.
- For Hindi/Hinglish questions, respond naturally in Hindi/Hinglish.
- For technical questions, provide practical and precise guidance.
- For complex tasks, prioritize structured problem solving.
- Do not claim that an unavailable tool or capability exists.
- Do not claim image generation, web browsing, code execution or autonomous
  external actions unless the application actually provides that capability.

IMPORTANT:
The internal reasoning process must remain private.
Never output hidden chain-of-thought, internal deliberations,
private scratch work, or token-by-token reasoning.

${CURRENT_BRAND} should behave as an AGI-oriented assistant architecture,
but must NOT claim to be true AGI unless that has actually been
demonstrated and verified.
`;

function buildSystemPrompt(taskMode) {
  const taskInstruction =
    getTaskInstruction(taskMode);

  return [
    CORE_SYSTEM_PROMPT,
    "",
    "CURRENT TASK MODE:",
    taskInstruction,
    "",
    "CURRENT INDIA DATE AND TIME:",
    getIndiaDateTime(),
  ].join("\n");
}

const CREATOR_KEYWORDS = [
  "who created you",
  "who made you",
  "who developed you",
  "who is your developer",
  "who designed you",
  "who built you",
  "who made orion ai",
  "who designed orion ai",
  "who built orion ai",
  "who made dharm ai",
  "who designed dharm ai",
  "who built dharm ai",
  "creator kaun",
  "developer kaun",
  "developer kon",
  "tumhara developer",
  "tumhe kisne banaya",
  "tumhe kisne develop",
  "aapko kisne banaya",
  "aapko kisne develop",
  "kisne banaya",
  "kisne banayi",
  "kisne banaye",
  "kisne develop",
  "develop kisne",
  "design kisne kiya",
  "design kisne ki",
  "kisne design kiya",
  "kisne design ki",
  "banane wala kaun",
  "banane wale kaun",
  "banaya kisne",
  "banaya kon",
  "banaya kaun",
  "owner kaun",
  "owner kon",
  "malik kaun",
  "malik kon",
  "dovloper",
];function isCreatorQuestion(message) {
  const text = cleanText(message).toLowerCase();

  return CREATOR_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
}

function getCreatorResponse(message) {
  const text = cleanText(message).toLowerCase();

  const asksAboutDharmAI =
    text.includes("dharm ai") ||
    text.includes("dharm-ai");

  const asksAboutOrion =
    text.includes("orion ai") ||
    text.includes("orion");

  if (asksAboutDharmAI && !asksAboutOrion) {
    return [
      `${ORIGINAL_PROJECT} ko ${CREATOR_NAME} ne banaya hai.`,
      "",
      `${ORIGINAL_PROJECT} original project hai, jisse ${CURRENT_BRAND} ko develop aur evolve kiya ja raha hai.`,
      "",
      `${CREATOR_NAME} hi ${ORIGINAL_PROJECT} aur ${CURRENT_BRAND} dono ke creator, owner aur developer hain.`,
    ].join("\n");
  }

  if (asksAboutOrion) {
    return [
      `${CURRENT_BRAND}, ${ORIGINAL_PROJECT} project se develop aur evolve kiya ja raha hai.`,
      "",
      `${CURRENT_BRAND} ka foundation ${ORIGINAL_PROJECT} project hai.`,
      "",
      `${CREATOR_NAME} hi ${ORIGINAL_PROJECT} aur ${CURRENT_BRAND} ke creator, owner aur developer hain.`,
    ].join("\n");
  }

  return [
    `Main ${CURRENT_BRAND} hoon.`,
    "",
    `Mujhe ${ORIGINAL_PROJECT} project se develop aur evolve kiya ja raha hai.`,
    "",
    `${CREATOR_NAME} ${ORIGINAL_PROJECT} aur ${CURRENT_BRAND} ke creator, owner aur developer hain.`,
  ].join("\n");
}

function detectSpecialRequest(message) {
  const text = cleanText(message).toLowerCase();

  if (
    isCreatorQuestion(text) ||
    text.includes("who are you") ||
    text.includes("tum kaun ho") ||
    text.includes("aap kaun ho") ||
    text.includes("what is your name") ||
    text.includes("your name")
  ) {
    return "creator";
  }

  return null;
}

function normalizeMessages(history, userMessage) {
  const messages = [];

  for (const message of history) {
    if (
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      continue;
    }

    const content = cleanText(
      getText(message.content)
    );

    if (!content) {
      continue;
    }

    messages.push({
      role: message.role,
      content,
    });
  }

  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

function buildGroqPayload({
  systemPrompt,
  history,
  userMessage,
}) {
  return {
    model: MODEL,

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },

      ...normalizeMessages(
        history,
        userMessage
      ),
    ],

    temperature: TEMPERATURE,

    max_tokens: MAX_TOKENS,

    stream: true,
  };
}

function getGroqHeaders() {
  return {
    "Content-Type": "application/json",

    Authorization:
      `Bearer ${process.env.GROQ_API_KEY}`,
  };
}

function createStreamFromGroq(response) {
  const encoder =
    new TextEncoder();

  const decoder =
    new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader =
        response.body.getReader();

      let buffer = "";

      try {
        while (true) {
          const {
            value,
            done,
          } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(
            value,
            {
              stream: true,
            }
          );

          const lines =
            buffer.split("\n");

          buffer =
            lines.pop() || "";

          for (const line of lines) {
            const trimmed =
              line.trim();

            if (!trimmed) {
              continue;
            }

            if (
              !trimmed.startsWith(
                "data:"
              )
            ) {
              continue;
            }

            const data =
              trimmed
                .slice(5)
                .trim();

            if (
              !data ||
              data === "[DONE]"
            ) {
              continue;
            }

            try {
              const parsed =
                JSON.parse(data);

              const content =
                parsed
                  ?.choices?.[0]
                  ?.delta?.content;

              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(
                      {
                        choices: [
                          {
                            delta: {
                              content,
                            },
                          },
                        ],
                      }
                    )}\n\n`
                  )
                );
              }
            } catch {
              // Ignore incomplete SSE chunks.
            }
          }
        }

        if (buffer.trim()) {
          const trimmed =
            buffer.trim();

          if (
            trimmed.startsWith(
              "data:"
            )
          ) {
            const data =
              trimmed
                .slice(5)
                .trim();

            if (
              data &&
              data !== "[DONE]"
            ) {
              try {
                const parsed =
                  JSON.parse(data);

                const content =
                  parsed
                    ?.choices?.[0]
                    ?.delta?.content;

                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify(
                        {
                          choices: [
                            {
                              delta: {
                                content,
                              },
                            },
                          ],
                        }
                      )}\n\n`
                    )
                  );
                }
              } catch {
                // Ignore malformed final chunk.
              }
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            "data: [DONE]\n\n"
          )
        );

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
            }function createTextStream(text) {
  const encoder =
    new TextEncoder();

  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify(
            {
              choices: [
                {
                  delta: {
                    content: text,
                  },
                },
              ],
            }
          )}\n\n`
        )
      );

      controller.enqueue(
        encoder.encode(
          "data: [DONE]\n\n"
        )
      );

      controller.close();
    },
  });
}

function streamResponse(stream) {
  return new Response(
    stream,
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
}

function validateEnvironment() {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      ok: false,

      error:
        "GROQ_API_KEY is not configured.",
    };
  }

  return {
    ok: true,
  };
}

async function callGroq({
  systemPrompt,
  history,
  userMessage,
}) {
  const environment =
    validateEnvironment();

  if (!environment.ok) {
    throw new Error(
      environment.error
    );
  }

  const payload =
    buildGroqPayload({
      systemPrompt,
      history,
      userMessage,
    });

  const response =
    await fetch(
      GROQ_API_URL,
      {
        method: "POST",

        headers:
          getGroqHeaders(),

        body: JSON.stringify(
          payload
        ),

        cache: "no-store",
      }
    );

  if (!response.ok) {
    let errorMessage =
      `Groq API error (${response.status})`;

    try {
      const data =
        await response.json();

      errorMessage =
        data?.error?.message ||
        data?.message ||
        errorMessage;
    } catch {
      // Keep fallback error.
    }

    throw new Error(
      errorMessage
    );
  }

  if (!response.body) {
    throw new Error(
      "Groq returned an empty response stream."
    );
  }

  return response;
}

function getRequestData(body) {
  const message =
    cleanText(body?.message);

  let taskMode =
    cleanText(body?.taskMode) ||
    "chat";

  if (
    !ALLOWED_TASK_MODES.has(
      taskMode
    )
  ) {
    taskMode = "chat";
  }

  const history =
    safeHistory(
      body?.messages
    );

  return {
    message,
    taskMode,
    history,
  };
}

function buildAgentInstruction() {
  return `
AGENT MODE:

Treat the request as a task that may require multiple logical
steps.

Internally:

UNDERSTAND
- Determine the actual objective.
- Identify constraints and missing information.

PLAN
- Break the task into the smallest useful steps.
- Decide what should be solved first.

EXECUTE
- Work through the required steps using the information and
  capabilities actually available to you.

VERIFY
- Check the result for contradictions, obvious mistakes and
  missing requirements.

REPORT
- Give the user the final useful result.
- Do not expose private chain-of-thought.
- If something could not actually be performed, say so clearly.
`;
}

function buildPlanningInstruction() {
  return `
PLANNING MODE:

When the request requires planning:

- Understand the desired outcome first.
- Identify constraints.
- Create a practical sequence of steps.
- Prefer realistic actions over vague advice.
- Mention assumptions when they materially affect the result.
- End with a clear next action when appropriate.
`;
}

function buildTechnicalInstruction() {
  return `
TECHNICAL MODE:

For technical requests:

- Preserve the user's existing architecture when possible.
- Avoid unnecessary rewrites.
- Check syntax and logic carefully.
- Explain exactly where code belongs.
- Never claim code was tested unless it was actually tested.
- Never invent APIs, package names or configuration values.
`;
}

function buildAnalysisInstruction() {
  return `
ANALYSIS MODE:

For comparison or analytical requests:

- Identify the important criteria.
- Compare the relevant options fairly.
- Separate facts from assumptions.
- Explain trade-offs.
- Give a clear recommendation only when the available evidence
  supports one.
`;
}

function getResponseMode(
  message,
  taskMode
) {
  const text =
    cleanText(message)
      .toLowerCase();

  if (
    taskMode === "agent"
  ) {
    return "agent";
  }

  if (
    text.includes("plan") ||
    text.includes("planning") ||
    text.includes("roadmap") ||
    text.includes("steps") ||
    text.includes("kaise")
  ) {
    return "planning";
  }

  if (
    text.includes("code") ||
    text.includes("coding") ||
    text.includes("javascript") ||
    text.includes("react") ||
    text.includes("next.js") ||
    text.includes("bug") ||
    text.includes("error")
  ) {
    return "technical";
  }

  if (
    text.includes("compare") ||
    text.includes("difference") ||
    text.includes("vs")
  ) {
    return "analysis";
  }

  return "direct";
}

function getModeInstruction(
  responseMode
) {
  switch (responseMode) {
    case "agent":
      return buildAgentInstruction();

    case "planning":
      return buildPlanningInstruction();

    case "technical":
      return buildTechnicalInstruction();

    case "analysis":
      return buildAnalysisInstruction();

    default:
      return "";
  }
}function buildFinalSystemPrompt(
  taskMode,
  userMessage
) {
  const responseMode =
    getResponseMode(
      userMessage,
      taskMode
    );

  return [
    buildSystemPrompt(
      taskMode
    ),

    "",

    `RESPONSE MODE: ${responseMode}`,

    "",

    getModeInstruction(
      responseMode
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleChatRequest(
  body
) {
  const {
    message,
    taskMode,
    history,
  } = getRequestData(body);

  if (!message) {
    return createErrorResponse(
      "Message is required.",
      400
    );
  }

  const specialRequest =
    detectSpecialRequest(
      message
    );

  if (
    specialRequest ===
    "creator"
  ) {
    return streamResponse(
      createTextStream(
        getCreatorResponse(
          message
        )
      )
    );
  }

  const finalSystemPrompt =
    buildFinalSystemPrompt(
      taskMode,
      message
    );

  const response =
    await callGroq({
      systemPrompt:
        finalSystemPrompt,

      history,

      userMessage:
        message,
    });

  return streamResponse(
    createStreamFromGroq(
      response
    )
  );
}

export async function POST(
  request
) {
  try {
    let body;

    try {
      body =
        await request.json();
    } catch {
      return createErrorResponse(
        "Invalid JSON request.",
        400
      );
    }

    return await handleChatRequest(
      body
    );
  } catch (error) {
    console.error(
      "ORION API ERROR:",
      error
    );

    return createErrorResponse(
      error?.message ||
        "ORION AI request failed.",
      500
    );
  }
}
