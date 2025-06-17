import OpenAI from 'openai';
import { supabase } from './supabase';
import { extractKeywordsWithAI } from './keywordMatching';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Interface for tools with embeddings
export interface ToolWithEmbedding {
  id: number;
  name: string;
  description: string;
  url: string;
  logo: string;
  category: string;
  pricing: string;
  keywords: string;
  embedding: number[];
  matchScore?: number;
  isAdded?: boolean;
}

// Cache pour les embeddings et API key validation
const embeddingCache = new Map<string, number[]>();
const apiKeyValidationCache = { valid: false, lastCheck: 0, cacheDuration: 5 * 60 * 1000 }; // 5 minutes

// Cache pour les outils avec embeddings (évite les requêtes répétées)
let toolsCache: { data: any[], timestamp: number } | null = null;
const TOOLS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Verify the OpenAI API key is valid (avec cache)
 */
export async function verifyApiKey(): Promise<boolean> {
  const now = Date.now();
  
  // Utiliser le cache si valide et récent
  if (apiKeyValidationCache.valid && 
      (now - apiKeyValidationCache.lastCheck) < apiKeyValidationCache.cacheDuration) {
    return true;
  }
  
  try {
    // Test simple et rapide avec l'API embeddings
    await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test'
    });
    apiKeyValidationCache.valid = true;
    apiKeyValidationCache.lastCheck = now;
    return true;
  } catch (error) {
    apiKeyValidationCache.valid = false;
    apiKeyValidationCache.lastCheck = now;
    return false;
  }
}

/**
 * Hash simple et rapide pour les requêtes
 */
function hashQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Génération d'embedding optimisée avec cache en mémoire ET Supabase
 */
export async function generateEmbedding(query: string): Promise<number[]> {
  const hash = hashQuery(query);

  // 1. Vérifier le cache en mémoire d'abord (plus rapide)
  if (embeddingCache.has(hash)) {
    console.log('[MEMORY CACHE HIT] Embedding loaded from memory');
    return embeddingCache.get(hash)!;
  }

  // 2. Vérifier le cache Supabase
  const { data: existing } = await supabase
    .from('query_embeddings')
    .select('embedding')
    .eq('hash', hash)
    .maybeSingle();

  if (existing?.embedding) {
    console.log('[SUPABASE CACHE HIT] Embedding loaded from Supabase');
    embeddingCache.set(hash, existing.embedding);
    return existing.embedding;
  }

  // 3. Générer avec OpenAI
  try {
    console.log('Generating new embedding via OpenAI...');
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim()
    });

    const embedding = response.data[0].embedding;
    
    // Stocker dans les deux caches
    embeddingCache.set(hash, embedding);
    
    // Stocker en arrière-plan sans attendre
    supabase.from('query_embeddings').insert({
      hash,
      query,
      embedding
    }).then(() => console.log('Embedding cached to Supabase'));

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calcul de similarité cosinus optimisé avec validation précoce
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  // Validation rapide
  if (!vec1?.length || !vec2?.length || vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  // Calcul optimisé en une seule boucle
  for (let i = 0; i < vec1.length; i++) {
    const v1 = vec1[i];
    const v2 = vec2[i];
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  const magnitude = Math.sqrt(mag1 * mag2);
  return magnitude === 0 ? 0 : Math.max(0, Math.min(1, dotProduct / magnitude));
}

/**
 * Fallback optimisé par mots-clés
 */
async function findToolsByKeywords(query: string, userId: string): Promise<ToolWithEmbedding[]> {
  console.log('Using keyword fallback for:', query);
  
  const keywords = await extractKeywordsWithAI(query, openai);
  if (!keywords?.length) throw new Error('Failed to extract keywords');
  
  // Utiliser le cache d'outils si disponible
  let tools;
  if (toolsCache && (Date.now() - toolsCache.timestamp) < TOOLS_CACHE_DURATION) {
    tools = toolsCache.data;
  } else {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, description, url, logo, category, pricing, keywords');
    
    if (error) throw error;
    tools = data || [];
    toolsCache = { data: tools, timestamp: Date.now() };
  }
  
  // Scoring optimisé avec mots-clés en minuscules
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  const toolsWithScores = tools.map(tool => {
    let score = 0;
    const toolName = tool.name.toLowerCase();
    const toolDesc = tool.description.toLowerCase();
    const toolKeywords = (tool.keywords || '').toLowerCase();
    
    lowerKeywords.forEach(keyword => {
      if (toolName.includes(keyword)) score += 0.5;
      if (toolDesc.includes(keyword)) score += 0.3;
      if (toolKeywords.includes(keyword)) score += 0.7;
    });
    
    return {
      ...tool,
      embedding: [],
      matchScore: Math.min(1, score / 2)
    };
  });
  
  return toolsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

/**
 * Récupération optimisée des outils avec cache
 */
async function getToolsWithEmbeddings() {
  // Utiliser le cache si valide et contient des outils avec embeddings
  if (toolsCache && 
      (Date.now() - toolsCache.timestamp) < TOOLS_CACHE_DURATION &&
      toolsCache.data.some(tool => tool.embedding_generated)) {
    console.log('[TOOLS CACHE HIT] Using cached tools data');
    return toolsCache.data.filter(tool => tool.embedding_generated);
  }

  console.log('Fetching fresh tools data...');
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, description, url, logo, category, pricing, keywords, embedding')
    .eq('embedding_generated', true);
  
  if (error) throw error;
  
  // Mettre en cache tous les outils (pas seulement ceux avec embeddings)
  // pour réutiliser dans le fallback keywords
  const allToolsResponse = await supabase
    .from('tools')
    .select('id, name, description, url, logo, category, pricing, keywords, embedding, embedding_generated');
  
  if (!allToolsResponse.error) {
    toolsCache = { data: allToolsResponse.data || [], timestamp: Date.now() };
  }
  
  return data || [];
}

/**
 * Calcul de similarité en parallèle par batches
 */
function calculateSimilaritiesBatch(
  queryEmbedding: number[], 
  tools: any[], 
  batchSize: number = 50
): any[] {
  const results: any[] = [];
  
  for (let i = 0; i < tools.length; i += batchSize) {
    const batch = tools.slice(i, i + batchSize);
    
    const batchResults = batch.map(tool => {
      let embedding: number[] = [];
      
      try {
        embedding = Array.isArray(tool.embedding) ? tool.embedding : JSON.parse(tool.embedding);
      } catch {
        console.warn(`Invalid embedding for tool ${tool.name}`);
        return { ...tool, matchScore: 0 };
      }
      
      if (!Array.isArray(embedding) || embedding.length === 0) {
        return { ...tool, matchScore: 0 };
      }
      
      const similarity = calculateCosineSimilarity(queryEmbedding, embedding);
      return { ...tool, matchScore: similarity };
    });
    
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Fonction principale optimisée
 */
export async function findSimilarTools(query: string, userId: string): Promise<ToolWithEmbedding[]> {
  const startTime = Date.now();
  console.log(`🚀 findSimilarTools START: "${query}" for user ${userId}`);
  
  try {
    // 1. Vérification API key en parallèle avec génération d'embedding
    const [isApiKeyValid, queryEmbedding] = await Promise.allSettled([
      verifyApiKey(),
      generateEmbedding(query)
    ]);
    
    if (isApiKeyValid.status === 'rejected' || !isApiKeyValid.value) {
      console.log('⚠️ API key invalid, using keyword fallback');
      return await findToolsByKeywords(query, userId);
    }
    
    if (queryEmbedding.status === 'rejected') {
      console.log('⚠️ Embedding generation failed, using keyword fallback');
      return await findToolsByKeywords(query, userId);
    }
    
    const embedding = queryEmbedding.value;
    console.log(`✅ Query embedding generated (${embedding.length}D) in ${Date.now() - startTime}ms`);
    
    // 2. Récupération des outils avec cache
    const toolsWithEmbeddings = await getToolsWithEmbeddings();
    
    if (!toolsWithEmbeddings.length) {
      console.log('⚠️ No tools with embeddings, using keyword fallback');
      return await findToolsByKeywords(query, userId);
    }
    
    console.log(`📊 Processing ${toolsWithEmbeddings.length} tools with embeddings`);
    
    // 3. Calcul de similarité optimisé par batches
    const toolsWithScores = calculateSimilaritiesBatch(embedding, toolsWithEmbeddings);
    
    // 4. Tri et filtrage initial
    toolsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    const highScoreTools = toolsWithScores.filter(t => (t.matchScore || 0) >= 0.75);
    console.log(`🎯 Found ${highScoreTools.length} high-quality matches (≥0.75)`);
    
    // 5. Fallback par mots-clés si nécessaire (en parallèle)
    let finalResults = toolsWithScores;
    
    if (highScoreTools.length < 3) {
      console.log('🔄 Adding keyword matches as fallback...');
      
      try {
        const keywordMatches = await findToolsByKeywords(query, userId);
        const highScoreIds = new Set(highScoreTools.map(t => t.id));
        
        const additionalMatches = keywordMatches
          .filter(tool => !highScoreIds.has(tool.id) && (tool.matchScore || 0) > 0.5)
          .slice(0, 5 - highScoreTools.length)
          .map(tool => ({ ...tool, matchScore: 0.74 }));
        
        finalResults = [...toolsWithScores, ...additionalMatches];
        finalResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        
        console.log(`➕ Added ${additionalMatches.length} keyword matches`);
      } catch (error) {
        console.warn('Keyword fallback failed:', error);
      }
    }
    
    // 6. Récupération des outils utilisateur en parallèle (non-bloquant)
    const userToolsPromise = supabase
      .from('user_tools')
      .select('tool_id')
      .eq('user_id', userId);
    
    // 7. Marquage des outils déjà ajoutés
    try {
      const { data: userTools } = await userToolsPromise;
      if (userTools?.length) {
        const addedToolIds = new Set(userTools.map(ut => ut.tool_id));
        finalResults.forEach(tool => {
          tool.isAdded = addedToolIds.has(tool.id);
        });
      }
    } catch (error) {
      console.warn('Failed to fetch user tools:', error);
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`🏁 findSimilarTools COMPLETED in ${executionTime}ms - returning ${finalResults.length} tools`);
    console.log(`📈 Top 3 scores: ${finalResults.slice(0, 3).map(t => `${t.name}:${t.matchScore?.toFixed(3)}`).join(', ')}`);
    
    return finalResults;
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ findSimilarTools FAILED after ${executionTime}ms:`, error);
    
    // Fallback final
    try {
      return await findToolsByKeywords(query, userId);
    } catch (fallbackError) {
      console.error('Final fallback failed:', fallbackError);
      throw error;
    }
  }
}

/**
 * Filtrage optimisé avec seuils adaptatifs
 */
export function filterToolsBySimilarity(
  tools: ToolWithEmbedding[], 
  threshold: number = 0.75
): ToolWithEmbedding[] {
  if (!tools.length) return [];
  
  // Tri initial si nécessaire
  const sortedTools = [...tools].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  
  // Application de seuils adaptatifs
  const thresholds = [threshold, 0.7, 0.65, 0.6, 0.5, 0.4];
  
  for (const currentThreshold of thresholds) {
    const filtered = sortedTools.filter(tool => (tool.matchScore || 0) >= currentThreshold);
    
    if (filtered.length >= 3) {
      console.log(`🔍 Applied threshold ${currentThreshold}: ${filtered.length} tools`);
      return filtered;
    }
  }
  
  // Retourner au moins les 3 meilleurs si disponibles
  const topTools = sortedTools.slice(0, Math.min(3, sortedTools.length));
  console.log(`🔍 Fallback: returning top ${topTools.length} tools regardless of threshold`);
  return topTools;
}