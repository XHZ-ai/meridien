// Utility functions for keyword matching algorithm using Jaro-Winkler
import jaroWinkler from 'talisman/metrics/jaro-winkler';

/**
 * Calculate string similarity score using Jaro-Winkler distance
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Validation
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    console.error('Invalid input types for similarity calculation:', { 
      str1Type: typeof str1,
      str2Type: typeof str2 
    });
    return 0;
  }
  
  // Handle empty strings
  if (!str1 || !str2) return 0;
  
  try {
    // Simple case - exact match
    if (str1 === str2) return 1.0;

    // Check if one contains the other
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;
    
    // Calculate Jaro-Winkler similarity
    const similarity = jaroWinkler(str1, str2);
    
    // Adjust to make sure it fits in our range (0.7 to 0.79 for "close" matches)
    if (similarity >= 0.5 && similarity < 0.8) {
      return 0.7 + (similarity - 0.5) * 0.09 / 0.3; // Scale to 0.7-0.79 range
    }
    
    return similarity;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    // Fallback to a very basic similarity check
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 0; // Avoid division by zero
    
    let sameChars = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) sameChars++;
    }
    
    return sameChars / maxLength;
  }
}

/**
 * Preprocess keywords: lowercase, remove accents, trim and cleanup
 * @param keyword The keyword to preprocess
 * @returns Cleaned keyword
 */
export function preprocessKeyword(keyword: string): string {
  if (typeof keyword !== 'string') {
    console.error('Invalid keyword type:', typeof keyword);
    return '';
  }
  
  try {
    // Convert to lowercase
    let result = keyword.toLowerCase();
    
    // Remove accents
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remove punctuation and extra spaces
    result = result.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
    
    return result;
  } catch (error) {
    console.error('Error preprocessing keyword:', error);
    return keyword.toLowerCase().trim();
  }
}

/**
 * Calculate the match score between a list of keywords and a tool's keywords
 * @param gptKeywords Keywords extracted from user input
 * @param toolKeywordsString Comma-separated keywords from the tool
 * @returns Match score between 0 and 1
 */
export function calculateMatchScore(gptKeywords: string[], toolKeywordsString: string): number {
  if (!toolKeywordsString || !gptKeywords || !gptKeywords.length) return 0;
  
  try {
    console.log('Calculating match score:');
    console.log('- GPT keywords:', gptKeywords);
    console.log('- Tool keywords string:', toolKeywordsString);
    
    // Convert tool keywords string to array
    const toolKeywords = toolKeywordsString
      .split(',')
      .map(kw => preprocessKeyword(kw.trim()))
      .filter(kw => kw);
    
    console.log('- Processed tool keywords:', toolKeywords);
    
    // Preprocess GPT keywords
    const processedGptKeywords = gptKeywords.map(kw => preprocessKeyword(kw));
    console.log('- Processed GPT keywords:', processedGptKeywords);
    
    // Calculate weighted scores for each GPT keyword
    const weightedScores = processedGptKeywords.map(gptKw => {
      if (!gptKw) return 0;
      
      let bestScore = 0;
      let bestMatch = '';
      
      // Find best match among tool keywords
      for (const toolKw of toolKeywords) {
        const similarity = calculateSimilarity(gptKw, toolKw);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = toolKw;
        }
      }
      
      // Apply dynamic weighting based on match strength
      let weightedScore = bestScore;
      if (bestScore >= 0.7) {
        weightedScore *= 3.5; // Strong match gets 3.5x weight
      } else if (bestScore >= 0.5) {
        weightedScore *= 2.5; // Good match gets 2.5x weight
      } else if (bestScore >= 0.3) {
        weightedScore *= 1.5; // Moderate match gets 1.5x weight
      }
      
      console.log(`- Keyword "${gptKw}" best match: "${bestMatch}" with score: ${bestScore}`);
      console.log(`- After weighting: ${weightedScore}`);
      return weightedScore;
    });
    
    console.log('- Weighted scores:', weightedScores);
    
    // Count weights for proper weighted average
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const score of weightedScores) {
      totalWeight += 1; // Each keyword has base weight of 1
      weightedSum += score;
    }
    
    console.log('- Weighted sum:', weightedSum);
    console.log('- Total weight:', totalWeight);
    
    // Calculate weighted average
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    console.log('- Final weighted match score:', finalScore);
    
    // Ensure score is between 0 and 1
    return Math.min(1, Math.max(0, finalScore));
  } catch (error) {
    console.error('Error in match score calculation:', error);
    return 0; // Default to 0 on error
  }
}

/**
 * Attempt to extract keywords from a raw response string when JSON parsing fails
 * @param rawResponse The raw response string from OpenAI
 * @returns Array of extracted keywords or empty array if extraction fails
 */
function extractKeywordsFromRawResponse(rawResponse: string): string[] {
  try {
    // Try to match an array pattern with either single or double quotes
    const arrayMatch = rawResponse.match(/\[([\s\S]*)\]/);
    if (arrayMatch) {
      // Extract the array content
      const arrayContent = arrayMatch[1];
      
      // Split by commas and clean up each item
      return arrayContent
        .split(',')
        .map(item => {
          // Remove quotes and trim whitespace
          const cleaned = item.trim().replace(/^["']|["']$/g, '');
          return cleaned;
        })
        .filter(item => item && item.length > 0);
    }
    
    // If no array pattern found, try to find quoted strings
    const quotedStrings = rawResponse.match(/["'](.*?)["']/g);
    if (quotedStrings) {
      return quotedStrings
        .map(str => str.replace(/^["']|["']$/g, ''))
        .filter(str => str && str.length > 0);
    }
    
    // Last resort: just split by commas or line breaks
    return rawResponse
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item && item.length > 0 && item.length < 50); // Reasonable keyword length
  } catch (error) {
    console.error('Error in fallback keyword extraction:', error);
    return [];
  }
}

/**
 * Extract keywords from user input using OpenAI
 * @param input User's search input
 * @param openai OpenAI instance
 * @returns Array of extracted keywords
 */
export async function extractKeywordsWithAI(input: string, openai: any): Promise<string[]> {
  try {
    console.log("Sending to OpenAI for keyword extraction:", input);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es utilisé pour aider un moteur de recherche d'outils d'intelligence artificielle à trouver les meilleurs outils en fonction de ce que l'utilisateur cherche à accomplir.

Ta mission est d'extraire entre 3 et 6 mots-clés **fonctionnels**, **concrets** et **précis** à partir de la description d'une tâche, en **français**.

🎯 Ces mots-clés seront ensuite comparés automatiquement avec les mots-clés associés à chaque outil dans notre base de données. Le système de matching repose sur une **similarité lexicale** (algorithme de type Levenshtein ou Jaro), donc les mots doivent être **courts, clairs et bien choisis**, sans ambiguïté.

---

Règles importantes :
- Retourne UNIQUEMENT un tableau JSON de mots-clés, sans introduction, explication ou texte autour
- Chaque mot-clé doit représenter une **action concrète ou un résultat fonctionnel** que l'IA peut accomplir (ex : "génération d'images", "automatisation d'emails", "résumé de texte")
- Utilise seulement des expressions courtes (1 à 3 mots maximum), simples et claires
- N'utilise **jamais** les mots "IA", "intelligence artificielle", "outil", "technologie", "solution" ou des termes vagues comme "optimisation", "efficacité", "performance"
- **Évite les termes ambigus** ou trop généraux (ex : "image" seul peut donner de faux matchs avec "imagination")
- Choisis uniquement des mots qui pourraient **réellement être utilisés dans une base d'outils IA**

---

Exemple :
Task: "Je veux créer une vidéo à partir d'un script pour mes réseaux sociaux"
→ Réponse attendue : ["création de vidéo", "script vidéo", "contenu social", "montage automatique"]

---

Voici la tâche de l'utilisateur :
"${input}"
"${input}"`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    // Check if we have a valid response
    if (!response?.choices?.[0]?.message?.content) {
      console.error("Empty or invalid response from OpenAI");
      return [];
    }

    const rawResponse = response.choices[0].message.content.trim();
    console.log("Raw OpenAI response:", rawResponse);

    // Return empty array if response is empty
    if (!rawResponse) {
      console.error("Empty response content from OpenAI");
      return [];
    }

    try {
      // First attempt: Try parsing as a JSON object
      const parsed = JSON.parse(rawResponse);

      // Handle different response formats
      if (Array.isArray(parsed)) {
        return parsed.filter(keyword => typeof keyword === 'string' && keyword.length > 0);
      } else if (typeof parsed === 'object') {
        // Look for an array property in the object
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            return parsed[key].filter(keyword => typeof keyword === 'string' && keyword.length > 0);
          }
        }
      }

      console.warn("No valid keyword array found in parsed JSON response");
      
      // If we get here, try the fallback extraction
      return extractKeywordsFromRawResponse(rawResponse);
      
    } catch (parseError) {
      console.warn("Initial JSON parsing failed, attempting fallback extraction:", parseError);
      
      // Try fallback extraction method
      const extractedKeywords = extractKeywordsFromRawResponse(rawResponse);
      
      if (extractedKeywords.length > 0) {
        console.log("Successfully extracted keywords using fallback method:", extractedKeywords);
        return extractedKeywords;
      }
      
      console.error("All keyword extraction attempts failed");
      return [];
    }
  } catch (error) {
    console.error('Error in keyword extraction process:', error);
    return [];
  }
}
