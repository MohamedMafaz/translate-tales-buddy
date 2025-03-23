
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

/**
 * Creates a new translated post in WordPress
 */
export const publishTranslatedPost = async (
  credentials: WordPressCredentials,
  originalPostId: number,
  translatedTitle: string,
  translatedContent: string,
  language_code: string,
  featuredImageUrl?: string,
  metaDescription?: string,
  originalPermalink?: string
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
    
    // Setup language parameters for various multilingual plugins
    // Prepare meta fields for the post
    const meta: Record<string, any> = {
      ...originalPost.meta,
    };
    
    // Set language for Polylang
    meta.polylang_current_language = language_code;
    
    // If meta description is provided, add it for SEO plugins
    if (metaDescription) {
      meta._yoast_wpseo_metadesc = metaDescription; // Yoast SEO
      meta._aioseo_description = metaDescription; // All in One SEO
      meta._seopress_titles_desc = metaDescription; // SEOPress
    }
    
    // Create the translated post
    const postData: Record<string, any> = {
      title: translatedTitle,
      content: translatedContent,
      status: 'publish',
      slug: `${originalPost.slug}-${language_code.toLowerCase()}`, // Append language code to slug
      categories: originalPost.categories,
      tags: originalPost.tags,
      meta: meta
    };
    
    // Add featured image if available
    if (featuredImageUrl) {
      // Try to find the media item ID from the URL
      try {
        const mediaResponse = await fetch(
          `${formattedUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(featuredImageUrl)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
            },
            signal: AbortSignal.timeout(15000)
          }
        );
        
        if (mediaResponse.ok) {
          const mediaItems = await mediaResponse.json();
          if (mediaItems && mediaItems.length > 0) {
            postData.featured_media = mediaItems[0].id;
          }
        }
      } catch (mediaError) {
        console.warn("Error fetching featured image:", mediaError);
        // Continue without setting featured image
      }
    }
    
    // If original permalink is provided, store it as metadata for reference
    if (originalPermalink) {
      meta._translated_original_url = originalPermalink;
    }
    
    console.log(`Creating translated post with slug: ${postData.slug} in language: ${language_code}`);
    
    // Set language headers for various multilingual plugins
    const headers: Record<string, string> = {
      'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
      'Content-Type': 'application/json',
      'X-WP-Lang': language_code // For WPML and some custom setups
    };
    
    // For Polylang REST specific header
    headers['X-Polylang-Language'] = language_code;
    
    const createResponse = await fetch(`${formattedUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: headers,
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
