
import React, { useState, useEffect } from 'react';
import { useWordPress } from '@/context/WordPressContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { translatePost } from '@/services/translationService';
import { publishTranslatedPost } from '@/services/wordpressService';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Globe, XCircle, RefreshCcw } from 'lucide-react';

interface TranslationProcessProps {
  selectedLanguage: string;
  onTranslationComplete: () => void;
}

type TranslationStatus = 'idle' | 'translating' | 'publishing' | 'completed' | 'error';

const TranslationProcess: React.FC<TranslationProcessProps> = ({ 
  selectedLanguage, 
  onTranslationComplete 
}) => {
  const { selectedPosts, credentials } = useWordPress();
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [retryCount, setRetryCount] = useState(0);
  const [aborted, setAborted] = useState(false);

  const totalPosts = selectedPosts.length;
  const currentPost = selectedPosts[currentPostIndex];
  
  const MAX_RETRIES = 3;
  
  // Start the translation process
  useEffect(() => {
    if (status === 'idle' && selectedPosts.length > 0) {
      startTranslation();
    }
  }, []);
  
  const startTranslation = async () => {
    if (selectedPosts.length === 0) {
      toast.error('No posts selected for translation');
      return;
    }
    
    if (!selectedLanguage) {
      toast.error('Please select a target language');
      return;
    }
    
    if (!credentials) {
      toast.error('WordPress connection lost');
      return;
    }
    
    setStatus('translating');
    setCurrentPostIndex(0);
    setProgress(0);
    setResults({ success: 0, failed: 0 });
    setRetryCount(0);
    setAborted(false);
    
    await processNextPost();
  };
  
  const processNextPost = async () => {
    // Safety check to prevent infinite loops
    if (aborted) {
      return;
    }
    
    if (currentPostIndex >= totalPosts) {
      // All posts processed
      setStatus('completed');
      return;
    }
    
    const post = selectedPosts[currentPostIndex];
    
    try {
      // Reset retry count for new post
      setRetryCount(0);
      
      // Start translation
      setStatus('translating');
      toast.info(`Translating post: ${post.title}`);
      
      const { title: translatedTitle, content: translatedContent } = await translatePost(
        post.title,
        post.content,
        selectedLanguage,
        (translationProgress) => {
          // Calculate overall progress: current post progress + completed posts
          const overallProgress = 
            ((currentPostIndex / totalPosts) + (translationProgress / 100 / totalPosts)) * 100;
          setProgress(overallProgress);
        }
      );
      
      // Publish the translated post
      setStatus('publishing');
      toast.info(`Publishing translation for: ${post.title}`);
      
      await publishTranslatedPost(
        credentials,
        post.id,
        translatedTitle,
        translatedContent,
        selectedLanguage
      );
      
      // Update results
      setResults(prev => ({ ...prev, success: prev.success + 1 }));
      toast.success(`Successfully translated and published: ${post.title}`);
      
      // Move to next post
      setCurrentPostIndex(prev => prev + 1);
      
      // Process next post
      await processNextPost();
      
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        toast.warning(`Retry attempt ${retryCount + 1} for post: ${post.title}`);
        
        // Wait a moment before retrying
        setTimeout(() => {
          processNextPost(); // Retry the same post
        }, 3000);
      } else {
        // Max retries exceeded, move to next post
        setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
        toast.error(`Failed to translate post after ${MAX_RETRIES} attempts: ${post.title}`);
        
        // Move to next post
        setCurrentPostIndex(prev => prev + 1);
        setRetryCount(0);
        
        // Continue with next post
        await processNextPost();
      }
    }
  };
  
  const abortTranslation = () => {
    setAborted(true);
    setStatus('error');
    toast.error('Translation process aborted');
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to translate';
      case 'translating':
        return `Translating post ${currentPostIndex + 1} of ${totalPosts}${retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : ''}`;
      case 'publishing':
        return `Publishing translation ${currentPostIndex + 1} of ${totalPosts}`;
      case 'completed':
        return 'Translation completed';
      case 'error':
        return 'Translation aborted';
      default:
        return '';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="w-full"
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-primary/80" />
            Translation Process
          </CardTitle>
          <CardDescription>
            {getStatusText()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Current post info */}
          {status !== 'idle' && status !== 'completed' && status !== 'error' && currentPost && (
            <div className="space-y-1 bg-white/20 dark:bg-black/20 p-3 rounded-md">
              <div className="font-medium line-clamp-1">{currentPost.title}</div>
              <div className="text-sm text-muted-foreground line-clamp-1">
                {status === 'translating' ? 'Translating content...' : 'Publishing...'}
                {retryCount > 0 && status === 'translating' && (
                  <span className="ml-2 text-amber-500">
                    <RefreshCcw className="inline h-3 w-3 mr-1 animate-spin" />
                    Retry {retryCount}/{MAX_RETRIES}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Results summary */}
          {(status === 'completed' || status === 'error') && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8 p-4">
                <div className="text-center">
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold mt-2">{results.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="text-2xl font-bold mt-2">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                {results.success > 0 ? (
                  <p>Your translated posts have been published successfully!</p>
                ) : (
                  <p>No posts were successfully translated. Please try again.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2">
          {status === 'idle' && (
            <Button
              onClick={startTranslation}
              disabled={selectedPosts.length === 0 || !selectedLanguage}
              className="flex items-center gap-1"
            >
              Start Translation <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {(status === 'translating' || status === 'publishing') && (
            <Button 
              onClick={abortTranslation}
              variant="destructive"
              className="flex items-center gap-1"
            >
              Abort Translation <XCircle className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {(status === 'completed' || status === 'error') && (
            <Button 
              onClick={onTranslationComplete}
              className="flex items-center gap-1"
            >
              Start New Translation <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TranslationProcess;
