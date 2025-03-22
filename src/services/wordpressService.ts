
import { toast } from 'sonner';
import { WPPostData } from '@/context/WordPressContext';

export type WordPressCredentials = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

export type Post = WPPostData;

export const validateSiteUrl = (url: string): string => {
  // Remove trailing slash if present
  let formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // Ensure URL has http or https
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  
  return formattedUrl;
};

export const testConnection = async (credentials: WordPressCredentials): Promise<boolean> => {
  const { siteUrl, username, appPassword } = credentials;
  const formattedUrl = validateSiteUrl(siteUrl);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${formattedUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to connect: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return !!data.id;
  } catch (error) {
    console.error('Connection test failed:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      toast.error('Connection timed out. Please check your WordPress site URL and try again.');
    } else {
      toast.error('Failed to connect to WordPress site. Please check your credentials.');
    }
    throw error;
  }
};

export const fetchPosts = async (credentials: WordPressCredentials): Promise<Post[]> => {
  const { siteUrl, username, appPassword } = credentials;
  const formattedUrl = validateSiteUrl(siteUrl);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(`${formattedUrl}/wp-json/wp/v2/posts?per_page=100&order=desc&orderby=date`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch posts: ${response.status} - ${errorText}`);
    }
    
    const posts = await response.json();
    return posts;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      toast.error('Request to fetch posts timed out. Your WordPress site might be slow to respond.');
    } else {
      toast.error('Failed to fetch posts. Please check your connection.');
    }
    throw error;
  }
};

export const publishTranslatedPost = async (
  credentials: WordPressCredentials,
  originalPostId: number,
  translatedTitle: string,
  translatedContent: string,
  language: string
): Promise<number> => {
  const { siteUrl, username, appPassword } = credentials;
  const formattedUrl = validateSiteUrl(siteUrl);
  
  try {
    console.log(`Getting original post details for ID: ${originalPostId}`);
    // First, get the original post to ensure we have all needed metadata
    const originalPostResponse = await fetch(`${formattedUrl}/wp-json/wp/v2/posts/${originalPostId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      },
      signal: AbortSignal.timeout(30000)
    });
    
    if (!originalPostResponse.ok) {
      throw new Error(`Failed to fetch original post: ${originalPostResponse.status}`);
    }
    
    const originalPost = await originalPostResponse.json();
    console.log(`Original post fetched: ${originalPost.slug}`);
    
    // Create the translated post
    const postData = {
      title: translatedTitle,
      content: translatedContent,
      status: 'publish',
      slug: `${originalPost.slug}-${language.toLowerCase()}`, // Append language code to slug
      categories: originalPost.categories,
      tags: originalPost.tags,
      meta: {
        ...originalPost.meta,
        polylang_current_language: language // Set Polylang language
      }
    };
    
    console.log(`Creating translated post with slug: ${postData.slug}`);
    const createResponse = await fetch(`${formattedUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData),
      signal: AbortSignal.timeout(60000)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create translated post: ${createResponse.status} - ${errorText}`);
    }
    
    const newPost = await createResponse.json();
    console.log(`Successfully created post with ID: ${newPost.id}`);
    return newPost.id;
  } catch (error) {
    console.error('Failed to publish translated post:', error);
    toast.error('Failed to publish translated post');
    throw error;
  }
};
