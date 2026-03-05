// Review SDK for essay grading
import { z } from "zod";
import { RunContext, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const ParserSchema = z.object({ previous_essay: z.string(), current_essay: z.string() });
const CategoryDetailSchema = z.object({
  score: z.number(),
  overview_good: z.array(z.string()),
  overview_improve: z.array(z.string()),
  suggestions: z.array(z.string())
});
const IntegratorSchema = z.object({ 
  final_score: z.number(), 
  details: z.object({ 
    content: CategoryDetailSchema, 
    structure: CategoryDetailSchema, 
    mechanics: CategoryDetailSchema 
  }) 
});
interface ContentgraderContext {
  stateCurrentEssay: string;
  statePreviousEssay: string;
}
const contentgraderInstructions = (runContext: RunContext<ContentgraderContext>, _agent: Agent<ContentgraderContext>) => {
  const { stateCurrentEssay, statePreviousEssay } = runContext.context;
  return `Evaluate ${stateCurrentEssay} for originality, creativity, engagement, and depth of reflection.
If ${statePreviousEssay} exists and is non-empty, read it only to determine whether strengths or weaknesses in originality, creativity, engagement, or depth are recurring. Reflect this insight briefly in the overview or suggestions if relevant. Do NOT output comparison fields.
Scoring uses five rubric bands that represent qualitative levels of performance.
0 → Off-topic, lacks originality, no creativity, no engagement, and no meaningful reflection.
25 → Some original or creative ideas are present, but the story is limited in engagement or depth of thinking.
50 → The story shows clear originality and creativity and is somewhat engaging, with emerging thoughtful elements.
75 → The story is original, creative, and engaging, demonstrating clear depth and meaningful reflection.
100 → The story is highly original, imaginative, attention-grabbing, and strongly thought-provoking.
Score assignment must follow two steps.
First determine which rubric band best describes the essay.
Second assign a precise integer score within that band's numeric range.
Use the following band ranges.
Band 0: score must be between 0 and 24. Band 25: score must be between 25 and 49. Band 50: score must be between 50 and 74. Band 75: score must be between 75 and 99. Band 100: score must be exactly 100.
Examples of valid scoring:
An essay with weak originality and little reflection may receive a score such as 18. An essay with some creative ideas but limited engagement may receive a score such as 30. An essay with clear originality and moderate reflection may receive a score such as 63. An essay that is highly engaging and reflective may receive a score such as 88. An exceptional and deeply thought-provoking essay receives 100.
The score must always remain inside the correct band range.
Focus feedback strictly on the following dimensions: originality, creativity, engagement, and depth of reflection.
Do NOT mention structure, grammar, organization, clarity, branding, or technical writing issues.
Do NOT rewrite the essay.
Feedback should be concise and actionable.
Return only one block using the exact delimiters and keys below. Do not include any extra text before or after the block.
<<<CONTENT_RESULT_START>>> score: <integer between 0 and 100 following the band rules>
overview_good: <2-4 bullets>
overview_improve: <2-4 bullets>
suggestions: <maximum 5 items>
<<<CONTENT_RESULT_END>>>`
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
  return `Evaluate ${stateCurrentEssay} for the organization and development of narrative elements.
The five narrative elements are setting, theme, mood, character, and plot.
If ${statePreviousEssay} exists and is non-empty, read it only to determine whether strengths or weaknesses in the development or clarity of these narrative elements are recurring or improving. Reflect this insight briefly in the overview or suggestions if relevant. Do NOT output comparison fields.
Scoring uses five rubric bands that represent qualitative levels of narrative development.
0 → Narrative elements are missing, extremely unclear, or incoherent.
25 → A few narrative elements are included, but they are unclear or incomplete.
50 → Most narrative elements (setting, theme, mood, character, plot) are present with basic clarity.
75 → All key narrative elements are clearly presented and logically connected.
100 → All narrative elements are skillfully developed, cohesive, and enhance the overall storytelling impact.
Score assignment must follow two steps.
First determine which rubric band best describes the essay.
Second assign a precise integer score within that band's numeric range.
Use the following band ranges.
Band 0: score must be between 0 and 24. Band 25: score must be between 25 and 49. Band 50: score must be between 50 and 74. Band 75: score must be between 75 and 99. Band 100: score must be exactly 100.
Examples of valid scoring:
If narrative elements are mostly missing or confusing, the score may be something like 10 or 18. If some elements appear but are incomplete or weakly developed, the score may be something like 30 or 40. If most elements exist with basic clarity but limited connection, the score may be something like 60 or 68. If all elements are clear and connected but not highly refined, the score may be something like 82 or 90. If the narrative elements are exceptionally cohesive and impactful, the score is 100.
The score must always remain inside the correct band range.
Focus feedback strictly on the following aspects: clarity of the five narrative elements; completeness of development; logical connection between elements; cohesion and storytelling impact.
Do NOT comment on grammar, sentence structure, or writing mechanics.
Do NOT rewrite the essay.
Feedback should be concise and actionable.
Return only one block using the exact delimiters and keys below. Do not include any extra text before or after the block.
<<<STRUCTURE_RESULT_START>>> score: <integer between 0 and 100 following the band rules>
overview_good: <2-4 bullets>
overview_improve: <2-4 bullets>
suggestions: <max 5 items total>
<<<STRUCTURE_RESULT_END>>>
`
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
If ${statePreviousEssay} exists and is non-empty, read it only to determine whether recurring mechanical patterns (grammar, sentence control, punctuation, word choice, fluency) are recurring or improving. Reflect this insight briefly in the overview or suggestions if relevant. Do NOT output comparison fields.
Scoring uses five rubric bands that represent qualitative levels of language control and clarity.
0 → Language is frequently unclear or incorrect; errors severely affect meaning and readability.
25 → Basic English is used with noticeable errors that sometimes affect meaning. Limited descriptive language.
50 → Generally clear English with some errors; some descriptive or narrative language is used.
75 → Clear and mostly accurate English with effective descriptive and narrative language. Minor errors do not affect meaning.
100 → Vivid, fluent, and precise narrative language with accurate grammar, punctuation, and mechanics throughout.
Score assignment must follow two steps.
First determine which rubric band best describes the essay.
Second assign a precise integer score within that band's numeric range.
Use the following band ranges.
Band 0: score must be between 0 and 24. Band 25: score must be between 25 and 49. Band 50: score must be between 50 and 74. Band 75: score must be between 75 and 99. Band 100: score must be exactly 100.
Examples of valid scoring:
If language errors frequently disrupt meaning and readability, the score may be something like 12 or 18. If basic English is understandable but errors are noticeable and occasionally affect meaning, the score may be something like 30 or 42. If the writing is generally clear but still contains recurring grammatical or sentence control issues, the score may be something like 58 or 65. If the writing is clear and mostly accurate with effective descriptive language and only minor errors, the score may be something like 82 or 90. If the language is vivid, fluent, precise, and nearly error-free throughout, the score is 100.
The score must always remain inside the correct band range.
Focus feedback strictly on the following aspects: grammar and agreement sentence control (run-ons, fragments, clarity) punctuation and formatting word choice, precision, and concision fluency and descriptive effectiveness
Focus on patterns that affect readability and credibility rather than isolated typos.
Do NOT comment on structure, narrative elements, originality, or storytelling depth.
Do NOT rewrite the essay.
Feedback should be concise and actionable.
Return only one block using the exact delimiters and keys below. Do not include any extra text before or after the block.
<<<MECHANICS_RESULT_START>>> score: <integer between 0 and 100 following the band rules>
overview_good: <2-4 bullets>
overview_improve: <2-4 bullets>
suggestions: <max 5 items total>
<<<MECHANICS_RESULT_END>>>
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
  return `Read ${stateFinalScore} and the plain-text outputs from ${stateContentGraderOutput}, ${stateStructureGraderOutput}, and ${stateMechanicsGraderOutput}, each formatted with delimiters. 

Parse each grader block to extract:
- The integer score
- The bullet list under overview_good (array of strings)
- The bullet list under overview_improve (array of strings)
- The numbered suggestions (array of strings)

Do not generate, edit, summarize, or reinterpret any feedback—only extract and restructure existing content. 

Use state.final_score directly without recalculation. 

Return EXACTLY this JSON structure:
{
  "final_score": <number from stateFinalScore>,
  "details": {
    "content": {
      "score": <number>,
      "overview_good": [<string>, ...],
      "overview_improve": [<string>, ...],
      "suggestions": [<string>, ...]
    },
    "structure": {
      "score": <number>,
      "overview_good": [<string>, ...],
      "overview_improve": [<string>, ...],
      "suggestions": [<string>, ...]
    },
    "mechanics": {
      "score": <number>,
      "overview_good": [<string>, ...],
      "overview_improve": [<string>, ...],
      "suggestions": [<string>, ...]
    }
  }
}

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
  model: "gpt-4.1",
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
          ...conversationHistory
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
          ...conversationHistory
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
          ...conversationHistory
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

      let integratorParsed: any = integratorResultTemp.finalOutput;
      
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
      // The integrator returns { final_score, details }, so extract just the details
      const categoryDetails = integratorParsed?.details || integratorParsed;
      
      return {
        final_score: state.final_score,
        details: categoryDetails
      };    } else {
      const endResult = {
        message: "Sorry — I really like to evaluate essays that you have already written. I can’t help write or generate an essay for you. Please rewrite it and submit your essay, then you can try again.",
        code: "INVALID_REQUEST"
      };
      return endResult;
    }
  });
}
