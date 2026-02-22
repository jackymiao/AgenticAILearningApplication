// Review SDK for essay grading
import { z } from "zod";
import { RunContext, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const ParserSchema = z.object({ previous_essay: z.string(), current_essay: z.string() });
const IntegratorSchema = z.object({ final_score: z.number(), details: z.object({ content: z.string(), structure: z.string(), mechanics: z.string() }) });
interface ContentgraderContext {
  stateCurrentEssay: string;
  statePreviousEssay: string;
}
const contentgraderInstructions = (runContext: RunContext<ContentgraderContext>, _agent: Agent<ContentgraderContext>) => {
  const { stateCurrentEssay, statePreviousEssay } = runContext.context;
  return `Evaluate ${stateCurrentEssay} for originality, creativity, engagement, and depth of reflection. If ${statePreviousEssay} exists and is non-empty, read it only to determine whether strengths or weaknesses in originality, creativity, engagement, or depth are recurring. Reflect that insight briefly in the overview and suggestions if relevant. Do NOT output comparison fields.Scoring must follow this exact restricted scale:0 → Off-topic, lacks originality, no creativity, no engagement, no meaningful reflection.25 → Some original or creative ideas are present, but the story is limited in engagement or depth of thinking.
50 → The story shows clear originality and creativity and is somewhat engaging, with emerging thoughtful elements.
75 → The story is original, creative, and engaging, demonstrating clear depth and meaningful reflection.
100 → The story is highly original, imaginative, attention-grabbing, and strongly thought-provoking.
The score MUST be one of these values only: 0, 25, 50, 75, or 100.`
}
const contentgrader = new Agent({
  name: "ContentGrader",
  instructions: contentgraderInstructions,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface StructuregraderContext {
  stateCurrentEssay: string;
  statePreviousEssay: string;
}
const structuregraderInstructions = (runContext: RunContext<StructuregraderContext>, _agent: Agent<StructuregraderContext>) => {
  const { stateCurrentEssay, statePreviousEssay } = runContext.context;
  return `Evaluate the organization and development of narrative elements in ${stateCurrentEssay}.
The five narrative elements are: setting;theme;mood;character;plot.
If ${statePreviousEssay} exists and is non-empty, read it only to determine whether strengths or weaknesses in the development or clarity of these narrative elements have improved or persisted. Reflect that insight briefly in the overview and suggestions. Do NOT output comparison fields.
Scoring must follow this exact restricted scale:
0 → Narrative elements are missing, extremely unclear, or incoherent.
25 → A few narrative elements are included, but they are unclear or incomplete.
50 → Most narrative elements (setting, theme, mood, character, plot) are present with basic clarity.
75 → All key narrative elements are clearly presented and logically connected.
100 → All narrative elements are skillfully developed, cohesive, and enhance the overall storytelling impact.
The score MUST be one of these values only: 0, 25, 50, 75, or 100.`
}
const structuregrader = new Agent({
  name: "StructureGrader",
  instructions: structuregraderInstructions,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const parser = new Agent({
  name: "Parser",
  instructions: `Goal: Convert input text into JSON with previous_essay and current_essay.
What to do:
Extract text between <<<CURRENT_START>>> and <<<CURRENT_END>>> as current_essay. Preserve paragraph breaks. Trim leading/trailing whitespace.
Extract text between <<<PREVIOUS_START>>> and <<<PREVIOUS_END>>> only if both delimiters exist and the extracted text contains at least 1 non-whitespace character. Otherwise set previous_essay = null.
Ignore any text outside delimiters. Do not grade. Do not add commentary.
Output JSON only.
{
  \"previous_essay\": \"string|null\",
  \"current_essay\": \"string\"
}`,
  model: "gpt-4.1-nano",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface MechanicsContext {
  stateCurrentEssay: string;
  statePreviousEssay: string;
}
const mechanicsInstructions = (runContext: RunContext<MechanicsContext>, _agent: Agent<MechanicsContext>) => {
  const { stateCurrentEssay, statePreviousEssay } = runContext.context;
  return `Evaluate the language mechanics and clarity of ${stateCurrentEssay}.
If ${statePreviousEssay} exists and is non-empty, read it only to determine whether recurring mechanical patterns (grammar, sentence control, punctuation, word choice, fluency) have improved or persisted. Reflect that insight briefly in the overview and suggestions. Do NOT output comparison fields.
Scoring must follow this exact restricted scale:
0 → Language is frequently unclear or incorrect; errors severely affect meaning and readability.
25 → Basic English is used with noticeable errors that sometimes affect meaning. Limited descriptive language.
50 → Generally clear English with some errors; some descriptive or narrative language is used.
75 → Clear and mostly accurate English with effective descriptive and narrative language. Minor errors do not affect meaning.
100 → Vivid, fluent, and precise narrative language with accurate grammar, punctuation, and mechanics throughout.
The score MUST be one of these values only: 0, 25, 50, 75, or 100.
`
}
const mechanics = new Agent({
  name: "Mechanics ",
  instructions: mechanicsInstructions,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface IntegratorContext {
  stateFinalScore: string;
  stateContentGraderOutput: string;
  stateStructureGraderOutput: string;
  stateMechanicsGraderOutput: string;
}
const integratorInstructions = (runContext: RunContext<IntegratorContext>, _agent: Agent<IntegratorContext>) => {
  const { stateFinalScore, stateContentGraderOutput, stateStructureGraderOutput, stateMechanicsGraderOutput } = runContext.context;
  return `Read ${stateFinalScore} and the plain-text outputs from ${stateContentGraderOutput}, ${stateStructureGraderOutput}, and ${stateMechanicsGraderOutput}, each formatted with delimiters. Parse each grader block to extract the integer score, the bullet lists under overview_good and overview_improve, and the numbered suggestions. Do not generate, edit, summarize, or reinterpret any feedback—only extract and restructure existing content. Use state.final_score directly without recalculation. Assemble and return a single JSON object containing the final score and all parsed grader results. Output JSON only.
Preserve wording exactly as in grader outputs.
If a grader block is missing, use score 0 and empty arrays.
Do not add weights, explanations, or extra fields.
Output valid JSON only, no extra text.`
}
const integrator = new Agent({
  name: "Integrator",
  instructions: integratorInstructions,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface FinalscoreContext {
  stateContentGraderOutput: string;
  stateStructureGraderOutput: string;
  stateMechanicsGraderOutput: string;
}
const finalscoreInstructions = (runContext: RunContext<FinalscoreContext>, _agent: Agent<FinalscoreContext>) => {
  const { stateContentGraderOutput, stateStructureGraderOutput, stateMechanicsGraderOutput } = runContext.context;
  return `Read the already-generated grader outputs from ${stateContentGraderOutput}, ${stateStructureGraderOutput}, and ${stateMechanicsGraderOutput}. Extract only the score from each block. Do not parse overviews or suggestions, and do not generate any new feedback. Calculate the final score using fixed internal weights: content = 0.33, structure = 0.33, mechanics = 0.33, using final_score = round(content_score*0.33 + structure_score*0.33 + mechanics_score*0.33). Output the result in a delimiter format consistent with other grader nodes.`
}
const finalscore = new Agent({
  name: "FinalScore",
  instructions: finalscoreInstructions,
  model: "gpt-4.1-nano",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const guardrail = new Agent({
  name: "GuardRail",
  instructions: "If the input asks the agent to write, generate, translate an essay, or contains any request that is not an actual essay submission, you should only return error message in text,\"error\", other than that, you just need to return the input text without any changes.",
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("FiveAgents", async () => {
    const state = {
      previous_essay: null,
      current_essay: null,
      content_grader_output: null,
      content_score: null,
      structure_grader_output: null,
      structure_score: null,
      mechanics_grader_output: null,
      mechanics_score: null,
      parsed_result: {
        content: {
          score: null,
          overview: {
            good: [],
            improve: []
          },
          suggestions: []
        },
        structure: {
          score: null,
          overview: {
            good: [],
            improve: []
          },
          suggestions: []
        },
        mechanics: {
          score: null,
          overview: {
            good: [],
            improve: []
          },
          suggestions: []
        }
      },
      final_score: null,
      input_content: null
    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_69846b7ac64c8190b90154c87498b0090330e01668a3d731"
      }
    });
    const guardrailResultTemp = await runner.run(
      guardrail,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...guardrailResultTemp.newItems.map((item) => item.rawItem));

    if (!guardrailResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const guardrailResult = {
      output_text: guardrailResultTemp.finalOutput ?? ""
    };
    if (guardrailResult.output_text != "error") {
      const parserResultTemp = await runner.run(
        parser,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...parserResultTemp.newItems.map((item) => item.rawItem));

      if (!parserResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const parserResult = {
        output_text: typeof parserResultTemp.finalOutput === 'string' ? parserResultTemp.finalOutput : JSON.stringify(parserResultTemp.finalOutput),
        output_parsed: typeof parserResultTemp.finalOutput === 'string' ? JSON.parse(parserResultTemp.finalOutput) : parserResultTemp.finalOutput
      };
      state.previous_essay = parserResult.output_parsed.previous_essay;
      state.current_essay = parserResult.output_parsed.current_essay;
      const contentgraderResultTemp = await runner.run(
        contentgrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `Focus feedback strictly on:originality;creativity;engagement;depth of reflection.
Do NOT mention structure, grammar, organization, clarity, branding, or technical writing issues.
Do NOT rewrite the essay. Keep feedback concise and actionable.
Return only one block using the exact delimiters and keys below; no extra text before or after.
<<<CONTENT_RESULT_START>>> score: <0 | 25 | 50 | 75 | 100> overview_good:
<2-4 bullets> overview_improve:
<2-4 bullets> suggestions:
<max 5 items total>
... <<<CONTENT_RESULT_END>>>` }
            ]
          }
        ],
        {
          context: {
            stateCurrentEssay: state.current_essay,
            statePreviousEssay: state.previous_essay
          }
        }
      );
      conversationHistory.push(...contentgraderResultTemp.newItems.map((item) => item.rawItem));

      if (!contentgraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const contentgraderResult = {
        output_text: contentgraderResultTemp.finalOutput ?? ""
      };
      state.content_grader_output = contentgraderResult.output_text;
      const structuregraderResultTemp = await runner.run(
        structuregrader,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `Focus feedback strictly on:clarity of the five narrative elements; completeness of development; logical connection between elements; cohesion and storytelling impact.
Do NOT comment on grammar, sentence structure, or writing mechanics. Do NOT rewrite the essay. Keep feedback concise and actionable.
Return only the following block using the exact delimiters and keys, with no extra text.
<<<STRUCTURE_RESULT_START>>> score: <0 | 25 | 50 | 75 | 100> overview_good:
<2-4 bullets> overview_improve:
<2-4 bullets> suggestions:
<max 5 items total>
... <<<STRUCTURE_RESULT_END>>>
Formatting rules: Use - for bullets. Use numbered 1) format for suggestions. Do not add any additional sections or labels.` }
            ]
          }
        ],
        {
          context: {
            stateCurrentEssay: state.current_essay,
            statePreviousEssay: state.previous_essay
          }
        }
      );
      conversationHistory.push(...structuregraderResultTemp.newItems.map((item) => item.rawItem));

      if (!structuregraderResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const structuregraderResult = {
        output_text: structuregraderResultTemp.finalOutput ?? ""
      };
      state.structure_grader_output = structuregraderResult.output_text;
      const mechanicsResultTemp = await runner.run(
        mechanics,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `Focus feedback strictly on:grammar and agreement; sentence control (run-ons, fragments, clarity);punctuation and formatting; word choice, precision, and concision; fluency and descriptive effectiveness;
Focus on patterns that affect readability and credibility rather than isolated typos.
Do NOT comment on structure, narrative elements, originality, or storytelling depth. Do NOT rewrite the essay. Keep feedback concise and actionable.
Return only the following block using the exact delimiters and keys, with no extra text.
<<<MECHANICS_RESULT_START>>> score: <0 | 25 | 50 | 75 | 100> overview_good:
<2-4 bullets> overview_improve:
<2-4 bullets> suggestions:
<max 5 items total>
... <<<MECHANICS_RESULT_END>>>
Formatting rules: Use - for bullets. Use numbered 1) format for suggestions. Do not add any additional sections or labels.` }
            ]
          }
        ],
        {
          context: {
            stateCurrentEssay: state.current_essay,
            statePreviousEssay: state.previous_essay
          }
        }
      );
      conversationHistory.push(...mechanicsResultTemp.newItems.map((item) => item.rawItem));

      if (!mechanicsResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const mechanicsResult = {
        output_text: mechanicsResultTemp.finalOutput ?? ""
      };
      state.mechanics_grader_output = mechanicsResult.output_text;
      const finalscoreResultTemp = await runner.run(
        finalscore,
        [
          ...conversationHistory,
          {
            role: "user",
            content: [
              { type: "input_text", text: `Return only the following block, with no extra text before or after.
            <<<FINAL_SCORE_START>>>
            final_score: <0-100 integer>
            <<<FINAL_SCORE_END>>>
            Formatting rules:
            final_score must be a single integer line
            Do not include weights, explanations, or component scores
            Do not add any additional sections or keys` }
            ]
          }
        ],
        {
          context: {
            stateContentGraderOutput: state.content_grader_output,
            stateStructureGraderOutput: state.structure_grader_output,
            stateMechanicsGraderOutput: state.mechanics_grader_output
          }
        }
      );
      conversationHistory.push(...finalscoreResultTemp.newItems.map((item) => item.rawItem));

      if (!finalscoreResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const finalscoreResult = {
        output_text: finalscoreResultTemp.finalOutput ?? ""
      };
      
      // Parse final score from text with delimiters
      const finalScoreText = finalscoreResult.output_text;
      let parsedFinalScore = 0;
      const scoreMatch = finalScoreText.match(/<<<FINAL_SCORE_START>>>\s*(\d+)\s*<<<FINAL_SCORE_END>>>/);
      if (scoreMatch) {
        parsedFinalScore = parseInt(scoreMatch[1], 10);
      } else {
        // Try parsing as plain number if no delimiters
        const numMatch = finalScoreText.match(/\d+/);
        parsedFinalScore = numMatch ? parseInt(numMatch[0], 10) : 0;
      }
      
      state.final_score = parsedFinalScore;
      
      const integratorResultTemp = await runner.run(
        integrator,
        [
          ...conversationHistory
        ],
        {
          context: {
            stateFinalScore: state.final_score.toString(),
            stateContentGraderOutput: state.content_grader_output,
            stateStructureGraderOutput: state.structure_grader_output,
            stateMechanicsGraderOutput: state.mechanics_grader_output
          }
        }
      );
      conversationHistory.push(...integratorResultTemp.newItems.map((item) => item.rawItem));

      if (!integratorResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      let integratorParsed = integratorResultTemp.finalOutput;
      
      // If integrator returns a string, parse it as JSON
      if (typeof integratorParsed === 'string') {
        try {
          integratorParsed = JSON.parse(integratorParsed);
        } catch (e) {
          console.error('Failed to parse integrator output:', e);
          integratorParsed = integratorResultTemp.finalOutput;
        }
      }
      
      // Return the final result with score and category details
      return {
        final_score: state.final_score,
        details: integratorParsed
      };    } else {
      const endResult = {
        message: "Sorry — I really like to evaluate essays that you have already written. I can’t help write or generate an essay for you. Please rewrite it and submit your essay, then you can try again.",
        code: "INVALID_REQUEST"
      };
      return endResult;
    }
  });
}
