
import React, { useState, useEffect } from 'react';
import { useWordPress } from '@/context/WordPressContext';
import { translatePost } from '@/services/translationService';
import { publishTranslatedPost } from '@/services/wordpressService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Globe, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LANGUAGES } from '@/services/translationService';

type TranslationProcessProps = {
  selectedLanguage: string;
  onTranslationComplete: () => void;
};

const TranslationProcess: React.FC<TranslationProcessProps> = ({
  selectedLanguage,
  onTranslationComplete,
}) => {
  const { selectedPosts, credentials } = useWordPress();
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translationResults, setTranslationResults] = useState<Array<{ success: boolean; message: string }>>([]);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!credentials || selectedPosts.length === 0 || !isTranslating || cancelRequested) {
      return;
    }

    const translateCurrentPost = async () => {
      if (currentPostIndex >= selectedPosts.length) {
        // All posts processed
        setIsTranslating(false);
        setProgress(100); // Ensure progress reaches 100% when complete
        toast.success(`Translation complete! ${translationResults.filter(r => r.success).length} posts translated.`);
        return;
      }

      const currentPost = selectedPosts[currentPostIndex];
      
      try {
        setProgress(0);
        
        // Update progress as translation progresses
        const handleProgress = (progressPercent: number) => {
          // Scale progress to account for the current post index
          const overallProgress = ((currentPostIndex / selectedPosts.length) * 100) + 
                                  (progressPercent / selectedPosts.length);
          setProgress(Math.min(overallProgress, 99)); // Cap at 99% until fully complete
        };

        // Get the language code directly from the selectedLanguage (which should already be the code like 'de', 'zh')
        const languageCode = selectedLanguage;
        
        // Find the language name for translation service
        const languageObj = LANGUAGES.find(lang => lang.code === languageCode);
        const languageName = languageObj?.name || languageCode;
        
        console.log(`Starting translation of post: ${currentPost.title} to language: ${languageName}`);
        console.log(`Using language code for WordPress: ${languageCode}`);
        
        const translatedPost = await translatePost(
          currentPost.title, 
          currentPost.content, 
          languageName,
          handleProgress
        );
        
        if (cancelRequested) {
          setIsTranslating(false);
          return;
        }
        
        console.log(`Publishing translated post: ${translatedPost.title} with language code: ${languageCode}`);
        // Publish the translated post with language code
        const newPostId = await publishTranslatedPost(
          credentials,
          currentPost.id,
          translatedPost.title,
          translatedPost.content,
          languageCode
        );
        
        setTranslationResults(prev => [
          ...prev, 
          { 
            success: true, 
            message: `Translated and published: ${translatedPost.title} (ID: ${newPostId})` 
          }
        ]);
        
        // Move to the next post
        setCurrentPostIndex(prev => prev + 1);
        setRetryCount(0); // Reset retry count for next post
        
      } catch (error) {
        console.error('Translation error:', error);
        
        if (retryCount < MAX_RETRIES && !cancelRequested) {
          // Retry with backoff
          setRetryCount(prev => prev + 1);
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          
          toast.warning(`Translation attempt ${retryCount + 1}/${MAX_RETRIES} failed. Retrying in ${delay/1000}s...`);
          
          setTimeout(() => {
            // Don't increment currentPostIndex, just retry
            translateCurrentPost();
          }, delay);
        } else {
          // Max retries reached or cancel requested, move to next post
          setTranslationResults(prev => [
            ...prev, 
            { 
              success: false, 
              message: `Failed to translate: ${currentPost.title} (Error: ${error instanceof Error ? error.message : 'Unknown error'})` 
            }
          ]);
          
          setCurrentPostIndex(prev => prev + 1);
          setRetryCount(0); // Reset retry count for next post
        }
      }
    };

    // Small delay to allow UI to update
    const timeoutId = setTimeout(() => {
      translateCurrentPost();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentPostIndex, selectedPosts, credentials, selectedLanguage, isTranslating, cancelRequested, retryCount]);

  const handleCancel = () => {
    setCancelRequested(true);
    setIsTranslating(false);
    toast.info("Translation process cancelled");
  };

  const handleComplete = () => {
    onTranslationComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto"
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Globe className="h-5 w-5" />
            Translation Process
          </CardTitle>
          <CardDescription className="text-center">
            {isTranslating 
              ? `Translating post ${currentPostIndex + 1} of ${selectedPosts.length}`
              : `Completed translating ${translationResults.filter(r => r.success).length} of ${selectedPosts.length} posts`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Current Post Info */}
          {isTranslating && currentPostIndex < selectedPosts.length && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-medium mb-1 truncate">
                {selectedPosts[currentPostIndex].title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {selectedPosts[currentPostIndex].slug}
              </p>
            </div>
          )}
          
          {/* Results List */}
          {translationResults.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
              <h3 className="font-medium text-sm sticky top-0 bg-background pb-2">Translation Results:</h3>
              {translationResults.map((result, index) => (
                <div 
                  key={index}
                  className={`text-sm p-2 rounded-lg flex items-start gap-2 ${
                    result.success ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 
                    'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                  }`}
                >
                  {result.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <span className="flex-1">{result.message}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          {isTranslating ? (
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TranslationProcess;
