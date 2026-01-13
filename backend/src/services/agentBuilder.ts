import type { AgentCallParams, AgentCallResult, Project, ReviewCategory } from '../types.js';
import { callAgentA } from './sdks/agentA.js';
import { callGrammarAgent } from './sdks/grammar.js';
import { callStructureAgent } from './sdks/structure.js';
import { callStyleAgent } from './sdks/style.js';
import { callContentAgent } from './sdks/content.js';

/**
 * Call the appropriate OpenAI Agent SDK based on agent ID and category
 */
export async function callAgent(agentId: string, params: AgentCallParams): Promise<AgentCallResult> {
  try {
    const { userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts } = params;
    
    // Agent A handles all categories with one SDK
    if (agentId === 'asst_preset_agent_a_001') {
      return await callAgentA(userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts);
    }

    // Agent B uses category-specific SDKs
    if (category === 'grammar') {
      return await callGrammarAgent(userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts);
    } else if (category === 'structure') {
      return await callStructureAgent(userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts);
    } else if (category === 'style') {
      return await callStyleAgent(userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts);
    } else if (category === 'content') {
      return await callContentAgent(userName, essay, category, attemptNumber, projectCode, wordLimit, previousAttempts);
    } else {
      return {
        status: 'error',
        error_message: `Unknown category: ${category}`
      };
    }

  } catch (error) {
    console.error('Agent call error:', error);
    return {
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Failed to call agent'
    };
  }
}

/**
 * Select the correct agent ID based on project configuration and category
 * Returns a placeholder ID - actual routing happens in callAgent()
 */
export function selectAgentId(project: Project, category: ReviewCategory): string {
  if (project.agent_mode === 'agent_a') {
    return 'asst_preset_agent_a_001';
  }
  
  // Agent B mode - return category-specific placeholder
  const agentIds: Record<ReviewCategory, string> = {
    grammar: 'asst_preset_grammar_001',
    structure: 'asst_preset_structure_001',
    style: 'asst_preset_style_001',
    content: 'asst_preset_content_001'
  };
  
  return agentIds[category];
}
