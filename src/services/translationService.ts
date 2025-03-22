
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

// Split content into sentences, preserving HTML
const splitIntoSentences = (content: string): string[] => {
  // Extract HTML elements to protect them from being split
  const { text, elements, placeholders } = extractHtmlElements(content);
  
  // Split content by periods, ensuring they're actual sentence endings
  // This is a simplistic approach - a more advanced NLP solution would be better
  const sentenceRegex = /([^.!?]+[.!?]+)/g;
  const sentences = text.match(sentenceRegex) || [text];
  
  // Restore HTML elements in each sentence
  return sentences.map(sentence => restoreHtmlElements(sentence, elements, placeholders));
};

// Ensures that the translation ends with a period if needed
const ensureProperEnding = (translation: string): string => {
  const trimmed = translation.trim();
  if (trimmed.length > 0 && !trimmed.match(/[.!?]$/)) {
    return trimmed + '.';
  }
  return trimmed;
};

// Key for Google Gemini API
// Note: In a production app, this should be stored securely
const API_KEY = 'AlzaSy-3FY7wxvYc_RqYyjFVVgHB4QOauRBPqsu';

// Translation function using Gemini API
export const translateContent = async (content: string, targetLanguage: string): Promise<string> => {
  try {
    // Extract and protect HTML elements
    const { text: extractedText, elements, placeholders } = extractHtmlElements(content);
    
    // Clean up HTML entities and excess whitespace
    const cleanedText = extractedText
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Prepare the prompt for Gemini API
    const prompt = `
      Translate the following content into ${targetLanguage}. 
      Maintain the original meaning, tone, and style.
      Keep sentence structure similar where possible.
      Ensure each sentence ends with proper punctuation.
      Do not translate or modify any placeholder tags like {{HTML_ELEMENT_0}}.
      
      Content to translate:
      ${cleanedText}
    `;
    
    // Call Gemini API (simplified example)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
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
      })
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const data = await response.json();
    const translatedText = data.candidates[0].content.parts[0].text;
    
    // Restore HTML elements
    const finalTranslation = restoreHtmlElements(translatedText, elements, placeholders);
    
    // Ensure proper sentence endings
    return ensureProperEnding(finalTranslation);
    
  } catch (error) {
    console.error('Translation error:', error);
    toast.error('Failed to translate content');
    throw error;
  }
};

// Function to translate a post title and content
export const translatePost = async (
  title: string, 
  content: string, 
  targetLanguage: string,
  onProgress?: (progress: number) => void
): Promise<{ title: string, content: string }> => {
  try {
    // Translate title
    const translatedTitle = await translateContent(title, targetLanguage);
    onProgress?.(25);
    
    // Split content into manageable chunks (to handle API limits)
    const contentChunks = splitIntoSentences(content);
    let translatedContent = '';
    
    // Translate each chunk
    for (let i = 0; i < contentChunks.length; i++) {
      const chunk = contentChunks[i];
      const translatedChunk = await translateContent(chunk, targetLanguage);
      translatedContent += translatedChunk + ' ';
      
      // Update progress
      const progressPercentage = 25 + (75 * (i + 1) / contentChunks.length);
      onProgress?.(progressPercentage);
    }
    
    return {
      title: translatedTitle,
      content: translatedContent.trim()
    };
  } catch (error) {
    console.error('Post translation error:', error);
    toast.error('Failed to translate post');
    throw error;
  }
};
