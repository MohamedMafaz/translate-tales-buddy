import { toast } from 'sonner';

// Language options for translation
export const LANGUAGES = [
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
];

// Multiple API keys for fallback
const API_KEYS = [
  'AIzaSyCFrwQrb3-31P1IX_w90RfMIPmEFZ8FJEM',
  'AIzaSyCEnM63PvBjm3O8nWgdsQYOihVQESQMFzg',
  'AIzaSyAR4hfspHTUvwsVNKq6DzCU8vvFcYAaK00'
];

// Regular expressions for identifying HTML content
const IMAGE_REGEX = /<img[^>]+>/g;
const VIDEO_REGEX = /<video[^>]+>.*?<\/video>/gs;
const IFRAME_REGEX = /<iframe[^>]+>.*?<\/iframe>/gs;
const HTML_TAG_REGEX = /<[^>]+>/g;

// Function to extract HTML elements and replace them with placeholders
const extractHtmlElements = (content: string): { text: string, elements: string[], placeholders: string[] } => {
  const elements: string[] = [];
  const placeholders: string[] = [];
  
  // Extract images, videos, iframes, and other HTML elements
  const allRegexes = [IMAGE_REGEX, VIDEO_REGEX, IFRAME_REGEX];
  
  let modifiedContent = content;
  
  allRegexes.forEach((regex) => {
    modifiedContent = modifiedContent.replace(regex, (match) => {
      const placeholder = `{{HTML_ELEMENT_${elements.length}}}`;
      elements.push(match);
      placeholders.push(placeholder);
      return placeholder;
    });
  });
  
  return { text: modifiedContent, elements, placeholders };
};

// Function to restore HTML elements from placeholders
const restoreHtmlElements = (translatedText: string, elements: string[], placeholders: string[]): string => {
  let restoredText = translatedText;
  
  placeholders.forEach((placeholder, index) => {
    restoredText = restoredText.replace(placeholder, elements[index]);
  });
  
  return restoredText;
};

// Split content into manageable chunks
const splitContentIntoChunks = (content: string, maxLength = 1000): string[] => {
  if (content.length <= maxLength) return [content];
  
  // Extract HTML elements to protect them
  const { text, elements, placeholders } = extractHtmlElements(content);
  
  // Split by natural paragraph breaks when possible
  const paragraphs = text.split(/(?:\r?\n){2,}/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  paragraphs.forEach(paragraph => {
    if ((currentChunk.length + paragraph.length) < maxLength) {
      currentChunk += paragraph + '\n\n';
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = paragraph + '\n\n';
    }
  });
  
  if (currentChunk) chunks.push(currentChunk);
  
  // Restore HTML elements in each chunk
  return chunks.map(chunk => restoreHtmlElements(chunk, elements, placeholders));
};

// Ensures that the translation ends with a period if needed
const ensureProperEnding = (translation: string): string => {
  const trimmed = translation.trim();
  if (trimmed.length > 0 && !trimmed.match(/[.!?]$/)) {
    return trimmed + '.';
  }
  return trimmed;
};

// Translation function with retry mechanism and API key rotation
export const translateContent = async (
  content: string, 
  targetLanguage: string, 
  isTitle = false
): Promise<string> => {
  let lastError: Error | null = null;
  
  // Try each API key
  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    
    try {
      console.log(`Attempting translation with API key ${i + 1}/${API_KEYS.length}`);
      
      // Extract and protect HTML elements
      const { text: extractedText, elements, placeholders } = extractHtmlElements(content);
      
      // Clean up HTML entities and excess whitespace
      const cleanedText = extractedText
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Different prompt based on whether it's a title or content
      let prompt;
      
      if (isTitle) {
        prompt = `
          Translate the following title into ${targetLanguage}.
          Keep it concise and accurate.
          Return only the translated title:
          
          ${cleanedText}
        `;
      } else {
        prompt = `
          Translate the following content into ${targetLanguage}. 
          Maintain the original meaning, tone, and style.
          Keep sentence structure similar where possible.
          Ensure each sentence ends with proper punctuation.
          Do not translate or modify any placeholder tags like {{HTML_ELEMENT_0}}.
          Return only the translated content:
          
          ${cleanedText}
        `;
      }
      
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
          }
        }),
        // Add a timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Check for valid API response
      if (!data.candidates || 
          !data.candidates[0] || 
          !data.candidates[0].content || 
          !data.candidates[0].content.parts) {
        console.error('Unexpected API response format:', data);
        throw new Error('Unexpected API response format');
      }
      
      const translatedText = data.candidates[0].content.parts[0].text;
      
      // Restore HTML elements
      const finalTranslation = restoreHtmlElements(translatedText, elements, placeholders);
      
      // Ensure proper sentence endings
      return ensureProperEnding(finalTranslation);
      
    } catch (error) {
      console.error(`Translation error with API key ${i + 1}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's the last API key, throw the error
      if (i === API_KEYS.length - 1) {
        throw lastError;
      }
      
      // Otherwise, continue to the next API key
      console.log(`Switching to next API key ${i + 2}/${API_KEYS.length}`);
      // Small delay before trying the next key
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // This should never be reached due to the throw in the last iteration
  throw new Error('All API keys exhausted. Unable to translate content.');
};

// Function to translate a post title and content
export const translatePost = async (
  title: string, 
  content: string, 
  targetLanguage: string,
  onProgress?: (progress: number) => void
): Promise<{ title: string, content: string }> => {
  try {
    // Translate title (pass isTitle=true)
    const translatedTitle = await translateContent(title, targetLanguage, true);
    onProgress?.(25);
    
    // Split content into manageable chunks
    const contentChunks = splitContentIntoChunks(content);
    let translatedContent = '';
    
    // Translate each chunk
    for (let i = 0; i < contentChunks.length; i++) {
      const chunk = contentChunks[i];
      
      try {
        const translatedChunk = await translateContent(chunk, targetLanguage, false);
        translatedContent += translatedChunk + ' ';
        
        // Update progress
        const progressPercentage = 25 + (75 * (i + 1) / contentChunks.length);
        onProgress?.(progressPercentage);
      } catch (error) {
        console.error(`Failed to translate chunk ${i+1}/${contentChunks.length}:`, error);
        
        // Continue with other chunks despite this failure
        translatedContent += `[TRANSLATION ERROR: ${error instanceof Error ? error.message : 'Unknown error'}] `;
        
        // Update progress even for failed chunk
        const progressPercentage = 25 + (75 * (i + 1) / contentChunks.length);
        onProgress?.(progressPercentage);
      }
    }
    
    return {
      title: translatedTitle,
      content: translatedContent.trim()
    };
  } catch (error) {
    console.error('Post translation error:', error);
    throw error;
  }
};
