
import { toast } from 'sonner';

export type WordPressCredentials = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

export type Post = {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  slug: string;
  date: string;
  link: string;
  selected?: boolean;
};

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
    const response = await fetch(`${formattedUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return !!data.id;
  } catch (error) {
    console.error('Connection test failed:', error);
    toast.error('Failed to connect to WordPress site. Please check your credentials.');
    throw error;
  }
};

export const fetchPosts = async (credentials: WordPressCredentials): Promise<Post[]> => {
  const { siteUrl, username, appPassword } = credentials;
  const formattedUrl = validateSiteUrl(siteUrl);
  
  try {
    const response = await fetch(`${formattedUrl}/wp-json/wp/v2/posts?per_page=100&order=desc&orderby=date`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }
    
    const posts = await response.json();
    return posts.map((post: Post) => ({
      ...post,
      selected: false,
      title: post.title.rendered,
      content: post.content.rendered,
      excerpt: post.excerpt.rendered
    }));
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    toast.error('Failed to fetch posts. Please check your connection.');
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
    // First, get the original post to ensure we have all needed metadata
    const originalPostResponse = await fetch(`${formattedUrl}/wp-json/wp/v2/posts/${originalPostId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`)
      }
    });
    
    if (!originalPostResponse.ok) {
      throw new Error(`Failed to fetch original post: ${originalPostResponse.status}`);
    }
    
    const originalPost = await originalPostResponse.json();
    
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
    
    const createResponse = await fetch(`${formattedUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create translated post: ${createResponse.status}`);
    }
    
    const newPost = await createResponse.json();
    return newPost.id;
  } catch (error) {
    console.error('Failed to publish translated post:', error);
    toast.error('Failed to publish translated post');
    throw error;
  }
};
