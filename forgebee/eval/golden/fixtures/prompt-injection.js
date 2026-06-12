// GOLDEN FIXTURE (synthetic) — planted LLM-app issues for review-prompt.
// Expected findings: untrusted user input concatenated into the system prompt
// (prompt-injection trust boundary), and a tool call executed on raw model
// output with no validation.

const { runModel, runSql } = require('./llm');

async function answerQuestion(userQuestion) {
  // planted: untrusted user input interpolated straight into the system prompt
  const systemPrompt =
    'You are a helpful DB assistant. The user asks: ' + userQuestion +
    '. Reply with a SQL query to run.';

  const modelOutput = await runModel({ system: systemPrompt, maxTokens: undefined }); // planted: no token cap

  // planted: tool/action executed on raw model output with no validation/allowlist
  const rows = await runSql(modelOutput.text);
  return rows;
}

module.exports = { answerQuestion };
