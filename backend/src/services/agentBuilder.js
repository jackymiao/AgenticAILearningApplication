import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Call an Agent Builder agent with essay grading parameters
 * @param {string} agentId - The Agent Builder agent ID
 * @param {object} params - Parameters including userName, essay, category, attemptNumber, projectCode
 * @returns {Promise<object>} Agent response with result_json
 */
export async function callAgent(agentId, params) {
  try {
    const { userName, essay, category, attemptNumber, projectCode, wordLimit } = params;
    
    // Prepare the message for the agent
    const message = `Grade this essay for the ${category} category.
    
Project Code: ${projectCode}
Student Name: ${userName}
Attempt: ${attemptNumber}
Word Limit: ${wordLimit || 'Not specified'}
Category: ${category}

Essay:
${essay}

Please provide your grading feedback in JSON format.`;

    // Call the agent using OpenAI's API
    // Note: Agent Builder agents are accessed via the Assistants API
    const thread = await openai.beta.threads.create();
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });
    
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: agentId
    });
    
    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    if (runStatus.status !== 'completed') {
      throw new Error(`Agent run failed with status: ${runStatus.status}`);
    }
    
    // Get the agent's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new Error('No response from agent');
    }
    
    const responseText = lastMessage.content[0]?.text?.value || '';
    
    // Try to parse JSON from the response
    let resultJson;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultJson = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, wrap the text response
        resultJson = {
          feedback: responseText,
          category: category
        };
      }
    } catch (parseError) {
      // If parsing fails, return the raw text
      resultJson = {
        feedback: responseText,
        category: category
      };
    }
    
    return {
      status: 'success',
      result_json: resultJson,
      score: resultJson.score || null
    };
    
  } catch (error) {
    console.error('Agent call error:', error);
    return {
      status: 'error',
      error_message: error.message || 'Failed to call agent'
    };
  }
}

/**
 * Select the correct agent ID based on project configuration and category
 * @param {object} project - Project configuration
 * @param {string} category - Review category (grammar/structure/style/content)
 * @returns {string} Agent ID to use
 */
export function selectAgentId(project, category) {
  if (project.agent_mode === 'agent_a') {
    return project.agent_a_id;
  }
  
  // Agent B mode - category-specific agents
  const agentIdMap = {
    grammar: project.agent_b_grammar_id,
    structure: project.agent_b_structure_id,
    style: project.agent_b_style_id,
    content: project.agent_b_content_id
  };
  
  return agentIdMap[category];
}
