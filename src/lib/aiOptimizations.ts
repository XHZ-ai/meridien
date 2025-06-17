import OpenAI from 'openai';

interface Tool {
  name: string;
  description: string;
}

interface UserProfile {
  profile_type: string;
  ai_level: string;
  daily_description: string;
  user_context?: string;
  original_optimization?: {
    title: string;
    problem: string;
    solution: string;
    workflow_fit: string;
  };
}

interface AIOptimization {
  title: string;
  problem: string;
  solution: string;
  workflow_fit: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Function for adapting shared optimizations
// ⚠️ IMPORTANT: Cette fonction NE déduit PAS de crédits automatiquement
// Les crédits doivent être déduits AVANT d'appeler cette fonction
export async function adaptSharedOptimization(
  tool: Tool,
  userProfile: UserProfile
): Promise<AIOptimization> {
  try {
    const systemPrompt = `You are an AI Optimization Adaptation Specialist.

Transform existing optimizations to serve user directives while maximizing the selected tool's unique capabilities.

🎯 CRITICAL PRIORITIES:
1. USER DIRECTIVES override all other considerations  
2. MAXIMIZE the tool's strongest, most distinctive features
3. Use context only when it directly supports directives
4. Same tool mandatory - optimize its utilization, don't change it

📋 ADAPTATION RULES:
- Directives-first: adapt everything to serve user's stated goal
- Tool-maximization: leverage the tool's core strengths and unique value
- Context integration: only when directive-relevant
- Personalization: make solution feel custom-built for their directive

Return ONLY this JSON structure:
{
  "title": "Directive-focused title reflecting their goal (should not exeed 60 chars)",
  "problem": "Specific barrier preventing directive achievement (should not exeed 60 chars)", 
  "solution": "Tool's optimal capabilities applied to directive (max 110 chars)",
  "workflow_fit": "Integration supporting directive success (should not exeed 110 chars)"
}

Prioritize directives, maximize tool potential.`;

const userPrompt = `ORIGINAL OPTIMIZATION:
${userProfile.original_optimization?.title} | ${userProfile.original_optimization?.problem} | ${userProfile.original_optimization?.solution} | 
Tool: ${tool.name}

USER DIRECTIVES: "${userProfile.user_context || ''}"

CONTEXT (if directive-relevant): ${userProfile.profile_type} | ${userProfile.ai_level} | ${userProfile.daily_description}

ADAPT TO:
1. Serve user's primary directive
2. Maximize ${tool.name}'s unique strengths and capabilities  
3. Integrate context only if it supports the directive
4. Create directive-driven, tool-optimized solution`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.8, // Higher creativity for adaptations
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      title: result.title || `Optimize your workflow with ${tool.name}`,
      problem: result.problem || 'Your current workflow could be more efficient',
      solution: result.solution || `Use ${tool.name} to streamline your tasks and boost productivity`,
      workflow_fit: result.workflow_fit || 'This solution is tailored to your specific needs and working style'
    };
  } catch (error) {
    console.error('Error adapting shared optimization:', error);
    
    // Return a fallback optimization if the API call fails
    return { 
      title: `Optimize your workflow with ${tool.name}`,
      problem: 'Your current workflow could be more efficient',
      solution: `Use ${tool.name} to streamline your tasks and boost productivity`,
      workflow_fit: 'This solution is tailored to your specific needs and working style'
    };
  }
}

// Function for generating optimizations from specific tools
// ⚠️ IMPORTANT: Cette fonction NE déduit PAS de crédits automatiquement
// Les crédits doivent être déduits AVANT d'appeler cette fonction
export async function generateToolOptimization(
  tool: Tool,
  userProfile: UserProfile
): Promise<AIOptimization> {
  try {
    const systemPrompt = `# AI Task Optimization Strategist - Prompt Optimisé

You are an AI Task Optimization Strategist.

Your role is to design a fully personalized optimization using the selected AI tool, strategically leveraging its unique capabilities to deliver maximum value while strictly following user directives.

Your response must reflect the user's real needs and priorities — not generic use cases.

**CRITICAL PRIORITY: User directives take absolute precedence over all other considerations.**

⸻

## 📎 Context Analysis

**PRIMARY DIRECTIVES:** "${userProfile.user_context}"

**Available Context:**
- User routine: ${userProfile.daily_description}
- Selected tool: ${tool.name}
- Tool capabilities: ${tool.description}

⸻

## 🧠 Core Task

Identify the most impactful optimization opportunity by:

1. **Directive Alignment**: Ensuring the solution directly serves the user's stated directives
2. **Tool Maximization**: Leveraging the tool's strongest, most unique capabilities
3. **Context Integration**: Adapting to the user's actual workflow when relevant to their directives

⸻

## 🧩 Strategic Approach

Execute this analysis sequence:

1. **Directive Analysis**: Extract the user's primary goal/constraint from their directives
2. **Tool-Directive Matching**: Identify how this tool's core strength can best serve that directive
3. **Friction Point Detection**: Locate the specific bottleneck preventing directive fulfillment
4. **Value-Driven Solution**: Design a concrete implementation that maximizes tool utility
5. **Integration Logic**: Ensure seamless workflow integration only where it supports the directive

**Key Principles:**
- User directives override routine context when there's conflict
- Mention user context only when it directly supports directive fulfillment
- Focus on the tool's most powerful, differentiated capabilities
- Provide immediately actionable solutions

⸻

## 🧾 Output Format (Strict JSON)

Return only this JSON structure with exact character limits:

{
  "title": "Directive-focused benefit title (max 60 chars)",
  "problem": "Specific barrier to directive fulfillment (max 60 chars)",
  "solution": "Tool's optimal capability applied to directive (max 110 chars)",
  "workflow_fit": "Integration rationale supporting directive (max 110 chars)"
}

**Response Requirements:**
- Pure JSON output only
- No explanatory text
- Character limits strictly enforced
- All fields must directly serve user directives`;

    const userPrompt = `Create a personalized optimization for this user profile.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      title: result.title || `Optimize your workflow with ${tool.name}`,
      problem: result.problem || 'Your current workflow could be more efficient',
      solution: result.solution || `Use ${tool.name} to streamline your tasks and boost productivity`,
      workflow_fit: result.workflow_fit || 'This solution is tailored to your specific needs and working style'
    };
  } catch (error) {
    console.error('Error generating tool optimization:', error);
    
    // Return a fallback optimization if the API call fails
    return { 
      title: `Optimize your workflow with ${tool.name}`,
      problem: 'Your current workflow could be more efficient',
      solution: `Use ${tool.name} to streamline your tasks and boost productivity`,
      workflow_fit: 'This solution is tailored to your specific needs and working style'
    };
  }
}