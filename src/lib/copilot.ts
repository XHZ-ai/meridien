import OpenAI from 'openai';
import { supabase } from './supabase';
import { deductCredits, CREDIT_COSTS } from './credits';
import { redirectToUpgrade } from './upgradeRedirect';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Optimization {
  id: string;
  title: string;
  problem: string;
  description: string;
  workflow_fit: string;
  name: string;
}

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  created_at: string;
}

interface NewConversationResponse {
  conversation_id: string;
  messages: Message[];
}

export async function getOrCreateConversation(userId: string, optimizationId: string): Promise<NewConversationResponse> {
  try {
    console.log(`Checking for existing conversation - userId: ${userId}, optimizationId: ${optimizationId}`);
    
    // First, try to get the existing conversation
    const { data: existingConversation, error: getError } = await supabase
      .from('copilot_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('optimization_id', optimizationId)
      .maybeSingle();

    if (getError && getError.code !== 'PGRST116') {
      console.error('Error checking for existing conversation:', getError);
      throw getError;
    }

    let conversationId: string;

    if (existingConversation) {
      // Use existing conversation if found
      conversationId = existingConversation.id;
      console.log('Found existing conversation:', conversationId);
    } else {
      // Double-check if conversation exists before creating to avoid race conditions
      const { data: doubleCheckConversation, error: doubleCheckError } = await supabase
        .from('copilot_conversations')
        .select('id')
        .eq('user_id', userId)
        .eq('optimization_id', optimizationId)
        .maybeSingle();
        
      if (doubleCheckConversation) {
        // Conversation was created by another process in the meantime
        console.log('Found conversation during double-check:', doubleCheckConversation.id);
        conversationId = doubleCheckConversation.id;
      } else {
        // Try to create a new conversation with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`Attempt ${retryCount + 1} to create conversation`);
            
            // Double-check if conversation exists before creating to avoid race conditions
            const { data: doubleCheckConversation, error: doubleCheckError } = await supabase
              .from('copilot_conversations')
              .select('id')
              .eq('user_id', userId)
              .eq('optimization_id', optimizationId)
              .maybeSingle();
              
            if (doubleCheckConversation) {
              // Conversation was created by another process in the meantime
              console.log('Found conversation during double-check:', doubleCheckConversation.id);
              conversationId = doubleCheckConversation.id;
              break;
            }
            
            const { data: newConversation, error: insertError } = await supabase
              .from('copilot_conversations')
              .insert([{
                user_id: userId,
                optimization_id: optimizationId
              }])
              .select('id')
              .single();

            if (insertError) {
              if (insertError.code === '23505') { // Duplicate key error
                console.log('Duplicate key error, checking if conversation exists');
                
                // Try to fetch the existing conversation again using maybeSingle()
                const { data: retryConversation, error: retryError } = await supabase
                  .from('copilot_conversations')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('optimization_id', optimizationId)
                  .maybeSingle();

                if (retryError && retryError.code !== 'PGRST116') {
                  console.error('Error fetching conversation after duplicate key error:', retryError);
                  retryCount++;
                  if (retryCount === maxRetries) throw retryError;
                  await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                  continue;
                }
                
                if (retryConversation) {
                  console.log('Found conversation after duplicate key error:', retryConversation.id);
                  conversationId = retryConversation.id;
                  break;
                } else {
                  // No conversation found, continue retry loop
                  console.log('No conversation found after duplicate key error, retrying...');
                  retryCount++;
                  if (retryCount === maxRetries) throw new Error('Failed to create or find conversation after duplicate key error');
                  await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                  continue;
                }
              }
              
              console.error(`Insert error on attempt ${retryCount + 1}:`, insertError);
              retryCount++;
              if (retryCount === maxRetries) throw insertError;
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
              continue;
            }

            console.log('Created new conversation:', newConversation.id);
            conversationId = newConversation.id;
            break;
          } catch (err) {
            console.error(`Error on attempt ${retryCount + 1}:`, err);
            retryCount++;
            if (retryCount === maxRetries) throw err;
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          }
        }
        
        if (!conversationId) {
          throw new Error('Failed to create or find conversation after all retries');
        }
      }
    }

    // Get messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('copilot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    return {
      conversation_id: conversationId,
      messages: messages || []
    };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    throw error;
  }
}

export async function getOptimizationDetails(optimizationId: string): Promise<Optimization | null> {
  try {
    const { data, error } = await supabase
      .from('task_history')
      .select('id, title, problem, description, workflow_fit, name')
      .eq('id', optimizationId)
      .single();

    if (error) {
      console.error('Error fetching optimization details:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getOptimizationDetails:', error);
    return null;
  }
}

export async function saveMessage(conversationId: string, sender: 'user' | 'copilot', content: string): Promise<Message | null> {
  try {
    console.log(`Saving message for conversation ${conversationId} from ${sender}`);
    const { data, error } = await supabase
      .from('copilot_messages')
      .insert([{
        conversation_id: conversationId,
        sender,
        content
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      throw error;
    }

    console.log(`Message saved with ID ${data.id}`);
    return data;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return null;
  }
}

// Fonction pour récupérer la mémoire de la conversation
async function getConversationMemory(conversationId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('copilot_conversations')
      .select('memory')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation memory:', error);
      return null;
    }

    return data?.memory || null;
  } catch (error) {
    console.error('Error in getConversationMemory:', error);
    return null;
  }
}

// Fonction pour mettre à jour la mémoire de la conversation
async function updateConversationMemory(conversationId: string, memory: string): Promise<boolean> {
  try {
    console.log(`🧠 Updating memory for conversation ${conversationId}:`, memory);
    
    const { error } = await supabase
      .from('copilot_conversations')
      .update({ memory })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation memory:', error);
      return false;
    }

    console.log(`✅ Memory updated successfully for conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error('Error in updateConversationMemory:', error);
    return false;
  }
}

// Fonction pour extraire et traiter les mises à jour de mémoire depuis la réponse GPT
function extractMemoryUpdate(gptResponse: string): string | null {
  try {
    // Chercher des patterns de mise à jour de mémoire
    const memoryPatterns = [
      /\[MEMORY_UPDATE\](.*?)\[\/MEMORY_UPDATE\]/s,
      /\*\*MEMORY:\*\*(.*?)(?:\*\*|$)/s,
      /Memory update:(.*?)(?:\n|$)/i
    ];

    for (const pattern of memoryPatterns) {
      const match = gptResponse.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Essayer de détecter du JSON dans la réponse
    const jsonMatch = gptResponse.match(/\{[^}]*"memory"[^}]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.memory) {
          return parsed.memory;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting memory update:', error);
    return null;
  }
}

// Fonction pour générer automatiquement une mise à jour de mémoire basée sur la conversation
function generateMemoryUpdate(messages: Message[], optimization: Optimization): string {
  try {
    // Récupérer les derniers messages pour comprendre le contexte
    const recentMessages = messages.slice(-4); // 4 derniers messages
    const userMessages = recentMessages.filter(m => m.sender === 'user');
    const copilotMessages = recentMessages.filter(m => m.sender === 'copilot');
    
    // Construire une mémoire basique
    const memoryData = {
      optimization_title: optimization.title,
      tool_name: optimization.name,
      last_user_question: userMessages.length > 0 ? userMessages[userMessages.length - 1].content.substring(0, 100) : null,
      conversation_stage: messages.length <= 2 ? 'beginning' : messages.length <= 6 ? 'middle' : 'advanced',
      total_exchanges: Math.floor(messages.length / 2),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(memoryData);
  } catch (error) {
    console.error('Error generating memory update:', error);
    return `Conversation about ${optimization.title} with ${optimization.name} - ${messages.length} messages exchanged`;
  }
}

// ⚠️ IMPORTANT: Cette fonction déduit automatiquement 1 crédit par appel
// Elle ne doit être appelée QUE pour les vraies interactions avec Copilot
export async function getCopilotResponse(
  conversationId: string, 
  messages: Message[], 
  optimization: Optimization
): Promise<string> {
  try {
    console.log(`Generating copilot response for conversation ${conversationId}`);
    
    // 🪙 DÉDUCTION DES CRÉDITS POUR CHAQUE REQUÊTE COPILOT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error fetching authenticated user:', authError);
      throw new Error('Authentication required for Copilot queries');
    }
    
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    // Déduire les crédits AVANT de générer la réponse
    console.log('🪙 Deducting credits for Copilot query...');
    const creditResult = await deductCredits(userId, CREDIT_COSTS.COPILOT_QUERY);
    
    if (!creditResult.success) {
      // Au lieu de throw, on peut logger l'erreur et laisser l'appelant gérer
      console.error(`Credit deduction failed: ${creditResult.message}`);
      throw new Error(`Insufficient credits: ${creditResult.message}`);
    }

    console.log(`✅ Credits deducted successfully. Remaining: ${creditResult.remaining_credits}`);
    
    // Get user's daily description for more context
    let userDailyDescription = '';
    
    const { data: userData, error: userError } = await supabase
      .from('user_profile_ai')
      .select('daily_description')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      // Continue without user description rather than failing
    } else {
      userDailyDescription = userData?.daily_description || '';
    }

    // 🧠 RÉCUPÉRER LA MÉMOIRE DE LA CONVERSATION
    const conversationMemory = await getConversationMemory(conversationId);
    console.log('Current conversation memory:', conversationMemory);
    
    // Get only the 3 most recent messages for better context
    const recentMessages = messages.slice(-3);
    
    // Format messages for OpenAI
    const formattedMessages = [
      {
        role: "system",
        content: `You are Lynor Copilot, an expert AI assistant designed to help users implement AI optimization solutions.

Current Optimization Context:
- Title: ${optimization.title}
- Problem: ${optimization.problem}
- Solution: ${optimization.description} 
- Workflow Fit: ${optimization.workflow_fit}
- AI Tool: ${optimization.name}

User Daily Activities Context:
${userDailyDescription}

🧠 CONVERSATION MEMORY:
${conversationMemory ? `Current memory: ${conversationMemory}` : 'No previous memory stored.'}

Your task is to guide the user through implementing this optimization in a step-by-step, conversational manner. You must:
1. Be extremely practical and concrete
2. Break down complex tasks into smaller steps
3. Provide clear instructions, examples, and tips
4. Be patient, encouraging, and adapt to the user's level of expertise
5. Stay focused on the specific optimization at hand
6. Answer any questions related to the implementation process
7. Keep responses concise and actionable - avoid long paragraphs when possible

🧠 MEMORY MANAGEMENT - OBLIGATOIRE:
- VOUS DEVEZ ABSOLUMENT inclure [MEMORY_UPDATE]nouvelle_memoire[/MEMORY_UPDATE] à la fin de CHAQUE réponse. utilise uniquement les infos donné par l'user directement pour mettre a jour la memoire !
- La mémoire doit contenir: progrès fait, préférences utilisateur découvertes, obstacles rencontrés, prochaines étapes prévues
- Gardez la mémoire concise mais informative (max 200 mots)
- Format: [MEMORY_UPDATE]Progrès: [détails]. Préférences: [détails]. Obstacles: [détails]. Prochaines étapes: [détails].[/MEMORY_UPDATE]

When starting a new conversation, introduce yourself briefly and outline the first 2-3 steps to get started with the optimization.

Always be friendly but concise. Avoid unnecessary explanations unless the user asks for them.`
      },
      ...recentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ];

    console.log(`Sending ${formattedMessages.length} messages to OpenAI`);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500, // Limit response length for more focused answers
    });

    const copilotResponse = response.choices[0]?.message?.content || 
      "I'm sorry, I'm having trouble generating a response right now. Let's try again.";
    
    console.log(`Received response from OpenAI: ${copilotResponse.substring(0, 50)}...`);

    // 🧠 EXTRAIRE ET TRAITER LES MISES À JOUR DE MÉMOIRE
    let memoryUpdate = extractMemoryUpdate(copilotResponse);
    
    // Si aucune mise à jour explicite n'est trouvée, générer une mise à jour automatique
    if (!memoryUpdate) {
      console.log('🧠 No explicit memory update found, generating automatic update...');
      memoryUpdate = generateMemoryUpdate([...messages], optimization);
    }
    
    if (memoryUpdate) {
      console.log('🧠 Memory update detected:', memoryUpdate);
      const updateSuccess = await updateConversationMemory(conversationId, memoryUpdate);
      if (!updateSuccess) {
        console.error('Failed to update conversation memory');
      }
    }

    // Nettoyer la réponse des balises de mémoire avant de la sauvegarder
    let cleanResponse = copilotResponse
      .replace(/\[MEMORY_UPDATE\].*?\[\/MEMORY_UPDATE\]/gs, '')
      .replace(/\*\*MEMORY:\*\*.*?(?=\*\*|$)/gs, '')
      .replace(/Memory update:.*?(?:\n|$)/gi, '')
      .trim();

    // Save response to database
    const savedMessage = await saveMessage(conversationId, 'copilot', cleanResponse);
    console.log(`Saved copilot response with ID: ${savedMessage?.id || 'unknown'}`);

    return cleanResponse;
  } catch (error) {
    console.error('Error in getCopilotResponse:', error);
    
    // Si l'erreur est liée aux crédits, la propager
    if (error instanceof Error && error.message.includes('Insufficient credits')) {
      throw error;
    }
    
    return "Sorry, I encountered an error. Please try again in a moment.";
  }
}