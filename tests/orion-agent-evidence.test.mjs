import test from "node:test";
import assert from "node:assert/strict";
import {
  appendRelevantSourceCitations,
  buildAgentEvidenceAnswer,
  buildObjectiveSearchQuery,
  isRelevantAgentSource,
  filterRelevantAgentSources,
} from "../lib/orion-agent-evidence.mjs";

const objective = "भारत और जापान में Industry 5.0 के विकास की तुलना करो। 2022 से 2026 तक Robotics, AI और Automation के वास्तविक आँकड़े खोजो।";

test("builds a readable partial answer from relevant web evidence", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "get_india_datetime", result: { timezone: "Asia/Kolkata", current: "Saturday, 14 November 2026 at 7:06 pm IST" } },
    { name: "search_web", result: { results: [
      { title: "Japan Industry 5.0 robotics AI", url: "https://example.org/japan-industry", content: "Japan is investing in Industry 5.0 robotics and AI automation." },
    ] } },
  ] });
  assert.doesNotMatch(answer, /Japan is investing/);
  assert.match(answer, /कोई तथ्यात्मक दावा/);
  assert.match(answer, /Asia\/Kolkata/);
  assert.match(answer, /https:\/\/example\.org/);
  assert.match(answer, /आंशिक परिणाम/);
});

test("rejects unrelated general country pages for a specific research task", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "India - Wikipedia", url: "https://en.wikipedia.org/wiki/India", content: "India is a country in South Asia and the world's most populous country." },
    ] } },
  ] });
  assert.match(answer, /मुख्य विषय से मेल खाने वाला/);
  assert.doesNotMatch(answer, /wikipedia\.org/);
});

test("removes bracketed citation artifacts from snippets", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "Industry 5.0 India Japan", url: "https://example.org/i5", content: "Industry 5.0 [20] in India and Japan [[21]] supports robotics." },
    ] } },
  ] });
  assert.doesNotMatch(answer, /\[\[?\d+/);
});

test("accepts aligned search suggestions but discards unrelated model-generated queries", () => {
  const aligned = buildObjectiveSearchQuery(objective, "Industry 5.0 robotics Japan");
  assert.match(aligned, /Industry 5.0/);
  assert.match(aligned, /Japan/);
  assert.match(aligned, /robotics/);
  const unrelated = buildObjectiveSearchQuery(objective, "Kansas City Royals baseball");
  assert.match(unrelated, /Industry 5.0/);
  assert.doesNotMatch(unrelated, /Kansas City|Royals|baseball/);
});

test("requires topical overlap in source text and rejects URL-only keyword matches", () => {
  assert.equal(isRelevantAgentSource({ title: "India", content: "India is a country." }, objective), false);
  assert.equal(isRelevantAgentSource({ title: "Industry 5.0 Japan robotics", content: "Japan uses robotics and AI automation." }, objective), true);
  assert.equal(isRelevantAgentSource({ title: "Official research page", content: "", description: "", url: "https://example.org/industry-5.0-japan-robotics" }, objective), false);
  assert.equal(isRelevantAgentSource({ title: "Industry 5.0 Japan robotics", content: "", url: "https://example.org/unrelated" }, objective), true);
});

test("does not leak an unverified draft when the verifier fails", async () => {
  const { buildPartialRecoveryAnswer } = await import("../lib/orion-agent-recovery.mjs");
  const answer = buildPartialRecoveryAnswer({
    draft: "ABB opened a factory in 2022 and productivity increased by 40%.",
    failureStage: "verification",
    toolResults: [{ name: "search_web", result: { results: [
      { title: "Industry 5.0 market overview", url: "https://example.org/industry-5" },
    ] } }],
  });
  assert.doesNotMatch(answer, /ABB opened/);
  assert.doesNotMatch(answer, /40%/);
  assert.match(answer, /Verification पूरी न होने/);
  assert.match(answer, /https:\/\/example\.org\/industry-5/);
});

test("evidence fallback lists relevant sources without asserting their snippets as facts", () => {
  const answer = buildAgentEvidenceAnswer({ objective, toolResults: [
    { name: "search_web", result: { results: [
      { title: "Industry 5.0 Japan robotics", url: "https://example.org/japan", content: "Unsupported claim that output rose 99%." },
    ] } },
  ] });
  assert.match(answer, /https:\/\/example\.org\/japan/);
  assert.doesNotMatch(answer, /output rose 99%/);
  assert.match(answer, /कोई तथ्यात्मक दावा/);
});

test("appends exact HTTPS URLs from relevant collected sources", () => {
  const answer = "PIB भारत सरकार की मीडिया सूचना एजेंसी है।";
  const result = appendRelevantSourceCitations(answer, [
    { name: "search_web", result: { results: [
      { title: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx", content: "Press Information Bureau disseminates information about Government policies, programmes and initiatives." },
      { title: "Unrelated weather page", url: "https://weather.example.com/", content: "Hourly weather in another city." },
      { title: "Insecure mirror", url: "http://www.pib.gov.in/old", content: "Press Information Bureau government news." },
    ] } },
  ], "Press Information Bureau PIB भारत सरकार की भूमिका");
  assert.match(result, /https:\/\/www\.pib\.gov\.in\/PressReleasePage\.aspx/);
  assert.doesNotMatch(result, /weather\.example\.com/);
  assert.doesNotMatch(result, /http:\/\/www\.pib\.gov\.in/);
});

test("does not invent citations when no relevant HTTPS result exists", () => {
  const answer = "स्रोत उपलब्ध नहीं हैं।";
  const result = appendRelevantSourceCitations(answer, [
    { name: "search_web", result: { results: [
      { title: "Unrelated source", url: "https://weather.example.com/", content: "Weather forecast." },
    ] } },
  ], "Press Information Bureau PIB government communications");
  assert.equal(result, answer);
});

test("does not duplicate a source URL already present in the answer", () => {
  const answer = "PIB information. https://www.pib.gov.in/";
  const result = appendRelevantSourceCitations(answer, [
    { name: "search_web", result: { results: [
      { title: "Press Information Bureau", url: "https://www.pib.gov.in/", content: "Press Information Bureau government information media." },
    ] } },
  ], "Press Information Bureau PIB government information");
  assert.equal((result.match(/https:\/\/www\.pib\.gov\.in\//g) || []).length, 1);
});


test("enriches search candidates before applying topical relevance filtering", async () => {
  const candidates = [
    { title: "Services | National Portal of India", snippet: "Official services portal", url: "https://www.india.gov.in/services" },
    { title: "Unrelated sports results", snippet: "Cricket scores", url: "https://sports.example.org/" },
  ];
  let enrichmentSawAllCandidates = false;
  const relevant = await (await import("../lib/orion-agent-evidence.mjs")).enrichThenFilterAgentSources(
    candidates,
    "Name one category listed under Services by Category on india.gov.in",
    async (sources) => {
      enrichmentSawAllCandidates = sources.length === 2;
      return [
        { ...sources[0], contentMode: "full_page", content: "Services by Category Education & Learning Health & Wellness" },
        { ...sources[1], contentMode: "full_page", content: "Cricket scores and sports fixtures" },
      ];
    },
  );
  assert.equal(enrichmentSawAllCandidates, true);
  assert.equal(relevant.length, 1);
  assert.match(relevant[0].content, /Education & Learning/);
});

test("filters irrelevant search results before they are sent to the model", () => {
  const sources = filterRelevantAgentSources([
    { title: "Press Information Bureau", content: "The Press Information Bureau is the nodal agency of Government of India." },
    { title: "Kansas City Royals", content: "Latest Major League Baseball team news and updates." },
  ], "What is the role of Press Information Bureau PIB in India?");
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, "Press Information Bureau");
});

test("does not append unrelated lexical matches when verifier already cited a retrieved official source", () => {
  const answer = "PIB role. https://www.pib.gov.in/Content/224_5_AboutPIB.aspx";
  const result = appendRelevantSourceCitations(answer, [{ name: "search_web", result: { results: [
    { title: "About PIB", url: "https://www.pib.gov.in/Content/224_5_AboutPIB.aspx", content: "Press Information Bureau Government of India media information." },
    { title: "Overview of Press Information Bureau", url: "https://www.scribd.com/document/509405000/pib", content: "Press Information Bureau mass media public sphere." },
  ] } }], "Press Information Bureau PIB India role");
  assert.doesNotMatch(result, /scribd\\.com/);
});
