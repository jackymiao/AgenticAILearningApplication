// Preset Agent Builder Agent IDs
// Replace these with your actual Agent Builder SDK IDs

export const PRESET_AGENT_IDS = {
  agent_a: 'asst_preset_agent_a_001',
  agent_b: {
    grammar: 'asst_preset_grammar_001',
    structure: 'asst_preset_structure_001',
    style: 'asst_preset_style_001',
    content: 'asst_preset_content_001'
  }
} as const;

export type AgentMode = 'agent_a' | 'agent_b';
