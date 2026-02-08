import { z } from "zod";
import { RunContext, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const GrammargraderSchema = z.object({ name: z.string(), user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.string(), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
const ParserSchema = z.object({ user_name: z.string(), attempt_number: z.number(), evaluator_type: z.enum(["grammar", "style", "structure", "content", "overall"]), current_essay: z.string(), previous_score: z.number(), previous_essay: z.string() });
type ParserOutput = z.infer<typeof ParserSchema>;
const StructuregraderSchema = z.object({ name: z.string(), user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.string(), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
const StylegraderSchema = z.object({ name: z.string(), user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.string(), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
const ContentgraderSchema = z.object({ name: z.string(), user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.enum(["Task Relevance", "Main Ideas & Development", "Support & Specificity", "Accuracy & Consistency", "Depth & Insight"]), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
const OverallgraderSchema = z.object({ user_name: z.string(), attempt_number: z.number(), score: z.number(), breakdown: z.array(z.object({ category_name: z.enum(["Task Achievement", "Coherence & Organization", "Cohesion & Flow", "Lexical Resource", "Grammar & Accuracy"]), deducted_points: z.number(), reason: z.string(), examples: z.array(z.string()) })), overview: z.string(), suggestions: z.array(z.string()) });
interface GrammargraderContext {
  inputOutputParsedCurrentEssay: string;
}
const grammargraderInstructions = (runContext: RunContext<GrammargraderContext>, _agent: Agent<GrammargraderContext>) => {
  const { inputOutputParsedCurrentEssay } = runContext.context;
  return `Grade the grammar of the ${inputOutputParsedCurrentEssay} and provide:
a single grammar score (0–100)
a locked 5-category deduction breakdown explaining point loss
an overview summarizing the essay + grammar problems + progress vs {{
≤5 actionable suggestions`
}
const grammargrader = new Agent({
  name: "GrammarGrader",
  instructions: grammargraderInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface ParserContext {
  workflowInputAsText: string;
}
const parserInstructions = (runContext: RunContext<ParserContext>, _agent: Agent<ParserContext>) => {
  const { workflowInputAsText } = runContext.context;
  return `You are a strict parser that converts one raw text variable into a clean JSON object for downstream evaluator routing. use ${workflowInputAsText} , extract the content found between the required delimiter pairs, normalize only what is necessary for routing, and output a single JSON object.`
}
const parser = new Agent({
  name: "Parser",
  instructions: parserInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.5,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface StructuregraderContext {
  inputOutputParsedCurrentEssay: string;
}
const structuregraderInstructions = (runContext: RunContext<StructuregraderContext>, _agent: Agent<StructuregraderContext>) => {
  const { inputOutputParsedCurrentEssay } = runContext.context;
  return `Evaluate the structure of the current submission  ${inputOutputParsedCurrentEssay} while considering the previous submission (if provided). Output:
name
score (0–100)
breakdown (5 locked categories with deductions + reasons + examples)
overview (summary of structure + key structural problems + comparison to previous)
suggestions (≤5)`
}
const structuregrader = new Agent({
  name: "StructureGrader",
  instructions: structuregraderInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface StylegraderContext {
  inputOutputParsedCurrentEssay: string;
}
const stylegraderInstructions = (runContext: RunContext<StylegraderContext>, _agent: Agent<StylegraderContext>) => {
  const { inputOutputParsedCurrentEssay } = runContext.context;
  return `Evaluate the writing style of the current submission ${inputOutputParsedCurrentEssay} while considering the previous submission {{ (if provided). Output:
name
score (0–100)
breakdown (locked 5 categories with deductions + reasons + examples)
overview (style-focused summary + comparison to previous)
suggestions (max 5)`
}
const stylegrader = new Agent({
  name: "StyleGrader",
  instructions: stylegraderInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface ContentgraderContext {
  inputOutputParsedCurrentEssay: string;
}
const contentgraderInstructions = (runContext: RunContext<ContentgraderContext>, _agent: Agent<ContentgraderContext>) => {
  const { inputOutputParsedCurrentEssay } = runContext.context;
  return `Evaluate the content quality of the current submission ${inputOutputParsedCurrentEssay} while considering the previous submission {{ (if provided). Produce:
name
score (0–100)
breakdown (exactly 5 locked categories with deductions + reasons + examples)
overview (summary of what the essay says + content problems + comparison to previous)
suggestions (≤5)`
}
const contentgrader = new Agent({
  name: "ContentGrader",
  instructions: contentgraderInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface OverallgraderContext {
  inputOutputParsedCurrentEssay: string;
}
const overallgraderInstructions = (runContext: RunContext<OverallgraderContext>, _agent: Agent<OverallgraderContext>) => {
  const { inputOutputParsedCurrentEssay } = runContext.context;
  return `Evaluate the overall quality of the current submission ${inputOutputParsedCurrentEssay} while considering the previous submission {{ (if provided). Produce:
name (category name)
score (0–100)
breakdown (exactly 5 fixed categories with deductions)
overview (summary + key problems + comparison to previous)
suggestions (0–5 actionable)`
}
const overallgrader = new Agent({
  name: "OverallGrader",
  instructions: overallgraderInstructions,
  model: "gpt-4.1-nano",
  outputType: "text" as const,
  modelSettings: {
    temperature: 0.75,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("ALLINONEAgent02", async () => {
    const state = {
      parser_rules: "Treat the input as plain text and preserve all line breaks inside essays/submissions. Extract text exactly between each start and end delimiter; do not infer, rewrite, or correct the essay content. Trim leading/trailing whitespace only for user_name and evaluator_type. For attempt_number, first_score, and second_score, trim whitespace and convert to numbers; if missing or not valid numbers, set them to 0. For evaluator_type, if it is not exactly grammar, style, structure, content, or overall, set it to overall. If any delimiter pair is missing, output that field as an empty string (scores and attempt_number become 0; evaluator_type becomes overall). Do not output explanations, comments, markdown, or extra keys.",
      parser_input_format: "Delimiters that may appear are <<<USER_NAME>>>...<<<END_USER_NAME>>>, <<<ATTEMPT_NUMBER>>>...<<<END_ATTEMPT_NUMBER>>>, <<<EVALUATOR_TYPE>>>...<<<END_EVALUATOR_TYPE>>>, <<<ESSAY>>>...<<<END_ESSAY>>>, <<<PREVIOUS_SCORE>>>...<<<END_PREVIOUS_SCORE>>>,, <<<PREVIOUS_ESSAY>>>...<<<END_PREVIOUS_ESSAY>>>",
      parser_return: "Return format: Return JSON only in this exact shape: {\"user_name\":\"\",\"attempt_number\":,\"evaluator_type\":\"\",\"current_essay\":\"\",\"previous_score\":0,\"previous_essay\":\"\"}.",
      scoring_rules: "if previouse essay exist, should reduce the strict level,Start from 100, be medium strick only deduct when the problem is serious,Deduct points across the 5 categories based only on errors actually present.  Avoid double-penalizing the same repeating pattern:  If the same error repeats many times, deduct once and label it “recurring”.  Severity guidance:  Minor issue, doesn’t block meaning: small deduction,  Moderate issue, noticeable but readable: medium deduction,  Major issue, harms clarity/understanding: larger deduction,  Score must be an integer from 0 to 100.  Sum of all deducted_points across the 5 categories must equal to 100 - score.deducted_points should not bigger than 10 in each category.",
      grammar_breakdown_rules: "Output must contain exactly 5 breakdown objects,Use these exact names and order in output:  Sentence Structure:Evaluates whether sentences are complete, clearly constructed, and free of fragments or run-on errors.  Verb Tense & Agreement:Checks correct and consistent verb tenses and proper subject–verb agreement.  Articles & Determiners:Assesses correct use of articles and determiners with singular, plural, and countable nouns.  Word Form & Prepositions:Examines whether correct word forms and appropriate prepositions are used in grammatical constructions.  Punctuation & Mechanics:Reviews punctuation, capitalization, and basic mechanical rules that affect grammatical clarity., each with:  category_name (one of the 5 locked names)  deducted_points (integer ≥ 0&&integer<10)  reason (1–2 short sentences)  examples (0–3 short examples; empty array allowed, should give an corrected version compare to original sentence)  If deducted_points is 0:  reason must be exactly: \"No significant issues found.\"  examples must be []  Examples must be short snippets; do not rewrite paragraphs.",
      grammar_overview: "Overview must be one paragraph containing:  1–2 sentence neutral summary of the essay’s message  Main grammar issues (from highest deductions)  Comparison:  If previous_essay exists: state improved / similar / declined and what changed  If not: explicitly say comparison isn’t possible",
      grammar_suggestion: "Provide 0–5 bullet-style items as strings in an array.  Must be actionable and grammar-focused.  Prioritize top deduction categories.  Do not rewrite the essay.  If giving a fix example, keep it to one sentence only.",
      style_breakdown_rules: "Breakdown must:  Always output exactly 5 items.  Use these exact category names every time, in this order:  Clarity & Precision:Evaluates how clearly ideas are expressed and whether sentences convey meaning directly without ambiguity or unnecessary complexity.  Vocabulary & Word Choice:Assesses the appropriateness, variety, and accuracy of words used to express ideas naturally and effectively.  Tone & Formality:Measures whether the writing maintains a consistent and appropriate tone for an academic or neutral context.  Flow & Transitions:Examines how smoothly ideas move from sentence to sentence and paragraph to paragraph using logical progression and transitions.  Conciseness & Redundancy:Evaluates whether the writing avoids unnecessary repetition, wordiness, or filler that weakens impact. .Categories must match exactly and appear in the same order.  Each item includes:  category_name, deducted_points (integer ≥ 0&&integer<10), reason (short; if 0 points → \"No significant issues found.\"), examples (0–3 short excerpts/paraphrases from the essay;should give an corrected version compare to original sentence; empty array allowed)",
      style_overview: "Overview must be one paragraph including:  1–2 sentences describing the essay’s style quality (readability + tone + flow)  The top style issues that caused deductions  Comparison to previous submission:  If previous exists: improved / similar / declined + what changed stylistically  If not: explicitly state no comparison",
      style_suggestion: "Suggestions must:  Be 0–5 items  Be actionable and style-focused  Prioritize the biggest deduction areas  Do not rewrite the whole essay  If showing an example rewrite: only one sentence, short",
      structure_breakdown_rules: "Don't make deducted_points higher than 10. Must always output exactly 5 breakdown objects in the fixed order. Use these exact category names, in this exact order, every time:  Task Response & Thesis  Paragraphing & Organization  Coherence  Cohesion  Conclusion & Overall Flow .Each breakdown item includes:  category_name (must match exactly)  deducted_points (integer ≥ 0&&integer<10)  reason (short; if 0 points, say “No significant issues found.”)  examples (0–3 short examples from the essay;should give an corrected version compare to original sentence; can be brief quotes or paraphrases; empty array allowed)",
      structure_overview: "One paragraph that includes:  1–2 sentences describing the essay’s structure (not grammar)  The main structural issues (from the categories with deductions)  Comparison to previous_essay if provided:  improved / similar / declined  mention what changed structurally (e.g., clearer thesis, better paragraphing, still weak conclusion)  If no previous_essay: explicitly say no comparison possible.",
      structure_suggestion: "Provide 0–5 actionable suggestions focused on structure.  Prioritize the highest-deduction categories.  Do not rewrite the entire essay.  If giving an example, keep it short (one sentence max).",
      content_breakdown_rules: "Must always output exactly 5 breakdown objects. Use these exact category names every time, in this order:  Task Relevance: addresses prompt/material; stays on topic; correct focus,Idea Clarity: clear main point; understandable claims; minimal ambiguity,Development & Support: sufficient explanation, examples, evidence, details,Logic & Coherence: logical flow; no contradictions; smooth progression of ideas,Depth & Originality: goes beyond surface-level; adds insight; avoids generic repetition .Must use the exact names and order above  Each breakdown item includes:  category_name (exact match)  deducted_points (strict:integer ≥ 0&&integer<5),  reason (short; if 0 then “No significant issues found.”)  examples (0–3 short excerpts/paraphrases from the essay;should give an corrected version compare to original sentence; empty array allowed)  Important: Sum of deducted_points across 5 categories must equal 100 - score.",
      content_overview: "One paragraph that includes:  1–2 sentence summary of the essay’s message (neutral, no rewriting)  Top content issues (based on the deductions). If previous essay exists: improvement/similar/declined + what changed in content quality  If no previous essay: explicitly say no comparison possible",
      content_suggestion: "Provide 0–5 actionable suggestions  Prioritize the biggest deduction categories  Suggestions must be specific actions (e.g., “Add one concrete example of X”)  Do not rewrite the whole essay; do not add new facts not in essay",
      overall_scoring_rules: "Start from 100 and deduct points across the 5 fixed categories below, based on what you observe in the current essay.  Locked 5 Overall categories (names must match exactly):  Task Achievement  Coherence & Organization  Cohesion & Flow  Lexical Resource  Grammar & Accuracy  Deduction approach:  Deduct for real issues only (don’t guess missing info).  Don’t double-penalize the same issue across multiple categories unless it truly affects both.  Recurring minor issue: deduct once and mark as recurring.  Major issue that blocks meaning: higher deduction.  Final:  score is an integer 0–100.  Sum of deducted points across all 5 categories must equal 100 - score.",
      overall_breakdown_rules: "ou must output exactly 5 breakdown objects, in the exact order above. Each breakdown object must include:  category_name (exact match)  deducted_points (integer ≥ 0&&ingeger<10)  reason (brief)  examples (0–3 short examples from the essay; paraphrase if needed)  If deducted_points = 0:  reason must be \"No significant issues found.\"  examples must be [],should give an corrected version compare to original sentence",
      overall_overview: "Overview must be one paragraph that includes:  1–2 sentence neutral summary of the essay’s message  1–2 sentence summary of the biggest weaknesses (from breakdown)  Comparison to previous submission:  If previous_essay exists: state improved / similar / declined and specify what changed (organization, clarity, grammar, etc.)  If missing: state no comparison possible",
      overall_suggestion: "Provide 0–5 actionable suggestions.  Prefer highest-impact improvements tied to the largest deductions.  Do not rewrite the full essay.  If you give an example, keep it to one sentence."
    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_69649a5a4524819083633d27a73aab0a09a42ea444bd0a03"
      }
    });
    const parserResultTemp = await runner.run(
      parser,
      [
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "input_text", text: `use ${state.parser_rules} as parsing rule.
          use ${state.parser_input_format} as the input format.
          use ${state.parser_return} as the return format` }
          ]
        }
      ],
      {
        context: {
          workflowInputAsText: workflow.input_as_text
        }
      }
    );
    conversationHistory.push(...parserResultTemp.newItems.map((item) => item.rawItem));

    if (!parserResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const parserResult = {
      output_text: JSON.stringify(parserResultTemp.finalOutput),
      output_parsed: parserResultTemp.finalOutput as unknown as ParserOutput
    };
    if (parserResult.output_parsed.evaluator_type == "grammar" && parserResult.output_parsed.current_essay || parserResult.output_parsed.previous_essay) {
      const grammargraderResultTemp = await runner.run(
        grammargrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `use ${state.scoring_rules} as scoring guideline.
            use ${state.grammar_breakdown_rules} for breakdown section.
            use ${state.grammar_overview} for overview section.
            use ${state.grammar_suggestion} for suggestion section. 
            Return JSON only.
            No extra keys
            No markdown, no commentary.` }
            ]
          }
        ],
        {
          context: {
            inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay
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
    } else if (parserResult.output_parsed.evaluator_type == "style" && parserResult.output_parsed.current_essay || parserResult.output_parsed.previous_essay) {
      const stylegraderResultTemp = await runner.run(
        stylegrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `use ${state.scoring_rules} as scoring guideline.
            use ${state.style_breakdown_rules} for breakdown section.
            use ${state.style_overview} for overview section.
            use ${state.style_suggestion} for suggestion section. 
            Return JSON only.
            No extra keys
            No markdown, no commentary.` }
            ]
          }
        ],
        {
          context: {
            inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay
          }
        }
      );
      conversationHistory.push(...stylegraderResultTemp.newItems.map((item) => item.rawItem));

      if (!stylegraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const stylegraderResult = {
        output_text: JSON.stringify(stylegraderResultTemp.finalOutput),
        output_parsed: stylegraderResultTemp.finalOutput
      };
      return stylegraderResult;
    } else if (parserResult.output_parsed.evaluator_type == "structure" && parserResult.output_parsed.current_essay) {
      const structuregraderResultTemp = await runner.run(
        structuregrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `use ${state.scoring_rules} as scoring guideline.
            use ${state.structure_breakdown_rules} for breakdown section.
            use ${state.structure_overview} for overview section.
            use ${state.structure_suggestion} for suggestion section. 
            Return JSON only.
            No extra keys
            No markdown, no commentary.` }
            ]
          }
        ],
        {
          context: {
            inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay
          }
        }
      );
      conversationHistory.push(...structuregraderResultTemp.newItems.map((item) => item.rawItem));

      if (!structuregraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const structuregraderResult = {
        output_text: JSON.stringify(structuregraderResultTemp.finalOutput),
        output_parsed: structuregraderResultTemp.finalOutput
      };
      return structuregraderResult;
    } else if (parserResult.output_parsed.evaluator_type == "content" && parserResult.output_parsed.current_essay) {
      const contentgraderResultTemp = await runner.run(
        contentgrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `use ${state.scoring_rules} as scoring guideline.
            use ${state.content_breakdown_rules} for breakdown section.
            use ${state.content_overview} for overview section.
            use ${state.content_suggestion} for suggestion section. 
            Return JSON only.
            No extra keys
            No markdown, no commentary.` }
            ]
          }
        ],
        {
          context: {
            inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay
          }
        }
      );
      conversationHistory.push(...contentgraderResultTemp.newItems.map((item) => item.rawItem));

      if (!contentgraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const contentgraderResult = {
        output_text: JSON.stringify(contentgraderResultTemp.finalOutput),
        output_parsed: contentgraderResultTemp.finalOutput
      };
      return contentgraderResult;
    } else {
      const overallgraderResultTemp = await runner.run(
        overallgrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `use ${state.overall_scoring_rules} as scoring guideline.
            use ${state.overall_breakdown_rules} for breakdown section.
            use ${state.overall_overview} for overview section.
            use ${state.overall_suggestion} for suggestion section. 
            Return JSON only.
            No extra keys
            No markdown, no commentary.` }
            ]
          }
        ],
        {
          context: {
            inputOutputParsedCurrentEssay: parserResult.output_parsed.current_essay
          }
        }
      );
      conversationHistory.push(...overallgraderResultTemp.newItems.map((item) => item.rawItem));

      if (!overallgraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const overallgraderResult = {
        output_text: JSON.stringify(overallgraderResultTemp.finalOutput),
        output_parsed: overallgraderResultTemp.finalOutput
      };
      return overallgraderResult;
    }
  });
}

// Wrapper function for backend integration
export async function callAgentA(
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
        error_message: 'Failed to get result from Agent A workflow'
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
      error_message: error instanceof Error ? error.message : 'Unknown error in Agent A'
    };
  }
}
