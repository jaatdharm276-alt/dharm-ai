import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const MODEL =
  "openai/gpt-oss-120b";

const MAX_HISTORY = 20;

const MAX_TOKENS = 6000;

const TEMPERATURE = 0.4;

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
      content: cleanText(
        getText(message.content)
      ),
    }))
    .filter(
      (message) =>
        message.content.length > 0
    )
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

  return (
    instructions[taskMode] ||
    instructions.chat
  );
}

function getIndiaDateTime() {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long",
    }
  ).format(new Date());
}

function createErrorResponse(
  message,
  status = 500
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  );
}
const CORE_SYSTEM_PROMPT = `
You are ORION AI, an advanced AI assistant created for thoughtful,
useful and reliable assistance.

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
- Do not claim that you browsed the web unless an actual web tool
  was used.
- Do not claim that you executed an external action unless it was
  actually executed.
- Do not claim to have memory that is not available.
- If information is missing, ask for it when necessary.
- If the request can be answered safely with available information,
  answer directly.
- Preserve useful context from previous messages.
- Avoid unnecessary repetition.
- Use headings, bullets and numbered steps when they improve clarity.
- Match the user's language when practical.
- For Hindi/Hinglish questions, respond naturally in Hindi/Hinglish.
- For technical questions, provide practical and precise guidance.
- For complex tasks, prioritize structured problem solving.

IMPORTANT:
The internal reasoning process must remain private.
Never output hidden chain-of-thought, internal deliberations,
private scratch work, or token-by-token reasoning.

ORION AI should behave as an AGI-oriented assistant architecture,
but must NOT claim to be true AGI unlessthat has actually been
demonstrated and verified.
`;

function buildSystemPrompt(
  taskMode
) {
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
  "creator",
  "kisne banaya",
  "kiske dwara banaya",
  "who made you",
  "who created you",
  "who developed you",
  "who is your developer",
  "developer kaun hai",
  "tumhara developer kaun hai",
  "tumhe kisne banaya",
  "dovloper",
  "developer",
  "owner kaun hai",
];

function isCreatorQuestion(message) {
  const text = cleanText(message)
    .toLowerCase();

  return CREATOR_KEYWORDS.some(
    (keyword) =>
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
      "Dharm AI ko Dharmraj Jat ne banaya hai.",
      "",
      "Dharm AI original project hai, jisse ORION AI ko develop aur evolve kiya ja raha hai.",
      "",
      "Dharmraj Jat hi Dharm AI aur ORION AI dono ke creator hain.",
    ].join("\n");
  }

  if (asksAboutOrion) {
    return [
      "ORION AI, Dharm AI project se develop aur evolve kiya ja raha hai.",
      "",
      "ORION AI ka foundation Dharm AI project hai.",
      "",
      "Dharmraj Jat hi Dharm AI aur ORION AI dono ke creator hain.",
    ].join("\n");
  }

  return [
    "Main ORION AI hoon.",
    "",
    "Mujhe Dharm AI project se develop aur evolve kiya ja raha hai.",
    "",
    "Dharm AI aur ORION AI dono ke creator Dharmraj Jat hain.",
  ].join("\n");
}

function detectSpecialRequest(message) {
  const text = cleanText(message)
    .toLowerCase();

  if (isCreatorQuestion(text)) {
    return "creator";
  }

  return null;
}

function normalizeMessages(
  history,
  userMessage
) {
  const messages = [];

  for (const message of history) {
    if (
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      continue;
    }

    messages.push({
      role: message.role,
      content: message.content,
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

    temperature:
      TEMPERATURE,

    max_tokens:
      MAX_TOKENS,

    stream: true,
  };
}

function getGroqHeaders() {
  return {
    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${process.env.GROQ_API_KEY}`,
  };
}
function createStreamFromGroq(
  response
) {
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
                  ?.delta
                  ?.content;

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
              // Ignore incomplete SSE data.
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
                    ?.delta
                    ?.content;

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
}

function createTextStream(
  text
) {
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

  const taskMode =
    cleanText(body?.taskMode) ||
    "chat";

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

function createThinkingMessage(
  taskMode
) {
  if (taskMode === "agent") {
    return "Understanding the task and planning the best approach...";
  }

  return "Understanding your request...";
}

function shouldUseSpecialResponse(
  message
) {
  return Boolean(
    detectSpecialRequest(
      message
    )
  );
}
function getResponseMode(
  message,
  taskMode
) {
  const text =
    cleanText(message)
      .toLowerCase();

  if (taskMode === "agent") {
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
    text.includes("next.js")
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
}

function buildFinalSystemPrompt(
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
       getCreatorResponse(message)
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
