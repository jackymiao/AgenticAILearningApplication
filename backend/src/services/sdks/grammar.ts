import { z } from "zod";
import { RunContext, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const GrammargraderSchema = z.object({ name: z.string(), user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.string(), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
const ParserSchema = z.object({ meta: z.object({ user_name: z.string(), attempt_number: z.number() }), current_essay: z.string(), previous_essay: z.string(), previous_score: z.number() });
type ParserOutput = z.infer<typeof ParserSchema>;
interface GrammargraderContext {
  inputOutputParsedCurrentEssay: string;
  inputOutputParsedPreviousEssay: string;
}
const grammargraderInstructions = (runContext: RunContext<GrammargraderContext>, _agent: Agent<GrammargraderContext>) => {
  const { inputOutputParsedCurrentEssay, inputOutputParsedPreviousEssay } = runContext.context;
  return `Evaluate the grammar quality of the current submission ${inputOutputParsedCurrentEssay} while considering the ${inputOutputParsedPreviousEssay} (if provided). Produce:
name (category name)
score (0–100)
breakdown (deductions with reasons + examples)
overview (summary of essay + main grammar problems + comparison to previous attempt)
suggestions (max 5, actionable)`
}
const grammargrader = new Agent({
  name: "GrammarGrader",
  instructions: grammargraderInstructions,
  model: "gpt-4.1-nano",
  outputType: GrammargraderSchema,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const parser = new Agent({
  name: "Parser",
  instructions: "You are a parser/normalizer node. Your job is to take safe input, safely parse JSON strings, apply defaults, and return one normalized JSON object for the next node. You must compare CURRENT vs PREVIOUS for progress tracking, but score CURRENT only.Return JSON only. No extra text.",
  model: "gpt-4.1-nano",
  outputType: ParserSchema,
  modelSettings: {
    temperature: 0.5,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("MultiAgentGrammar02", async () => {
    const state = {
      parser_input_format: "<<<USER_NAME>>>...<<<END_USER_NAME>>> <<<ATTEMPT_NUMBER>>>...<<<END_ATTEMPT_NUMBER>>> <<<ESSAY>>>...<<<END_ESSAY>>> <<<FIRST_SCORE>>>...<<<END_FIRST_SCORE>>> <<<SECOND_SCORE>>>...<<<END_SECOND_SCORE>>> <<<FIRST_SUBMISSION>>>...<<<END_FIRST_SUBMISSION>>> <<<SECOND_SUBMISSION>>>...<<<END_SECOND_SUBMISSION>>>(text, may be multiline)",
      parser_task: "Extract these fields and return them in a single JSON object:  meta.user_name (string)  meta.attempt_number (number)  current_essay (string)  previous_essay (string)  previous_result.grammar_score (number)  previous_result.suggestions_registry (array of objects)  each object: id (string), category (string), status (string)  evaluation_rules (string)",
      parser_extraction_rules: "Extract the content between each delimiter pair exactly.  Essays and rules may contain multiple lines—preserve them exactly (don’t trim internal whitespace).  For META and PREVIOUS_RESULT, attempt to parse the extracted content as JSON:  If JSON parsing succeeds:  meta.user_name = parsed user_name or \"\" if missing  meta.attempt_number = parsed attempt_number as a number, or 0 if missing/invalid  previous_result.grammar_score = parsed grammar_score as a number, or 0 if missing/invalid  previous_result.suggestions_registry = parsed suggestions_registry if it’s an array; otherwise []  If JSON parsing fails:  set meta.user_name to \"\"  set meta.attempt_number to 0  set previous_result.grammar_score to 0  set previous_result.suggestions_registry to []  If any delimiter block is missing, set that field to a safe default:  missing essay/rules blocks → \"\"  missing registry → []  missing numbers → 0  Always return all fields with the exact keys shown below.  Do not add any explanations, comments, markdown, or extra text outside the JSON.",
      parser_return: "{   \"meta\": {     \"user_name\": \"\",     \"attempt_number\": 0   },   \"current_essay\": \"\",   \"previous_essay\": \"\",   \"previous_result\": {     \"grammar_score\": 0,     \"suggestions_registry\": []   },   }",
      input_rules: "You will receive:  user_name  attempt_number  essay (current submission text)  previous_essay (optional; may be empty)  previous_score (optional; may be empty)  Rules:  If previous_essay is missing/empty, still score normally, but in the overview say: \"No previous submission provided for comparison.\"  If previous_score is missing, do not invent it.",
      grammar_scoring_rules: "Start at 100  Deduct points across the 5 fixed categories based on actual issues found.  The same repeated mistake pattern should not be deducted repeatedly; deduct once and mark it as recurring in the reason, don't be too strict.  Final score is integer 0–100.  Total deductions must equal 100 - score.",
      breakdown_rules: "Must always output exactly 5 breakdown objects.  Categories must appear in the exact order listed above.  Each breakdown item must include:  category_name (must match exactly)  deducted_points (10 > integer ≥ 0)  reason (short explanation; if 0 points, say “No significant issues found.”)  examples (0–3 short examples; empty array allowed)",
      overview_rules: "Overview must be one paragraph that includes:  A 1–2 sentence summary of what the essay is saying (content-neutral, no rewriting)  The top grammar problems (from breakdown)  If previous submission exists: a comparison statement:  improved / same / worse  mention what changed (e.g., fewer tense errors, still run-ons)  If previous submission does not exist: explicitly say no comparison possible.",
      suggestion_rules: "Suggestions must be:  No more than 5  Each suggestion must be actionable  Prefer pattern-level advice (fix recurring issues)  Do not rewrite the full essay  If you include example fixes, keep it one sentence only and only for illustration."
    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_696570b560d48190b3151ebaff206a970afa5540c182b2e9"
      }
    });
    const parserResultTemp = await runner.run(
      parser,
      [
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "input_text", text: `you need to use ${state.parser_input_format} to parse the  {{ ,and follow the ${state.parser_task} as your task` }
          ]
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: `extract the content base on ${state.parser_extraction_rules}, and return the output by following ${state.parser_return} format` }
          ]
        }
      ]
    );
    conversationHistory.push(...parserResultTemp.newItems.map((item) => item.rawItem));

    if (!parserResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const parserResult = {
      output_text: JSON.stringify(parserResultTemp.finalOutput),
      output_parsed: parserResultTemp.finalOutput as unknown as ParserOutput
    };
    const grammargraderResultTemp = await runner.run(
      grammargrader,
      [
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "input_text", text: `consider ${state.input_rules} to to process input. 
          use ${state.grammar_scoring_rules} as guideline of scoring. 
          use ${state.breakdown_rules} for breakdown section. 
          use ${state.overview_rules} for overview section.
          use ${state.suggestion_rules} for suggestion section.
          ` }
          ]
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: `score = 100 - total deducted_points. Output JSON only (no markdown, no commentary).
          Do not add extra keys.` }
          ]
        }
      ],
      {
        context: {
          inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay,
          inputOutputParsedPreviousEssay: parserResult.output_parsed.previous_essay
        }
      }
    );
    conversationHistory.push(...grammargraderResultTemp.newItems.map((item) => item.rawItem));

    if (!grammargraderResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const grammargraderResult = {
      output_text: JSON.stringify(grammargraderResultTemp.finalOutput),
      output_parsed: grammargraderResultTemp.finalOutput
    };
    return grammargraderResult;
  });
}

// Wrapper function for backend integration
export async function callGrammarAgent(
  userName: string,
  essay: string,
  category: string,
  attemptNumber?: number,
  projectCode?: string,
  wordLimit?: number,
  previousAttempts?: any[]
) {
  try {
    const firstPrevious = previousAttempts?.[0];
    const previousScore = firstPrevious?.score || 0;
    const previousEssay = firstPrevious?.essay_snapshot || '';
    
    // Format input with new delimiter format
    const inputText = `<<<USER_NAME>>>${userName}<<<END_USER_NAME>>>` +
      `<<<ATTEMPT_NUMBER>>>${attemptNumber || 1}<<<END_ATTEMPT_NUMBER>>>` +
      `<<<EVALUATOR_TYPE>>>${category}<<<END_EVALUATOR_TYPE>>>` +
      `<<<ESSAY>>>${essay}<<<END_ESSAY>>>` +
      `<<<PREVIOUS_SCORE>>>${previousScore}<<<END_PREVIOUS_SCORE>>>` +
      `<<<PREVIOUS_ESSAY>>>${previousEssay}<<<END_PREVIOUS_ESSAY>>>`;
    
    const workflow = { input_as_text: inputText };
    const result = await runWorkflow(workflow);

    if (!result || !result.output_parsed) {
      return {
        status: 'error' as const,
        error_message: 'Failed to get result from Grammar Agent workflow'
      };
    }

    const score = (result.output_parsed as any).score ?? null;

    return {
      status: 'success' as const,
      result_json: result.output_parsed,
      score: score
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error_message: error instanceof Error ? error.message : 'Unknown error in Grammar Agent'
    };
  }
}
