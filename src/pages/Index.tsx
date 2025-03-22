
import React, { useState } from 'react';
import { WordPressProvider } from '@/context/WordPressContext';
import ConnectionForm from '@/components/ConnectionForm';
import PostList from '@/components/PostList';
import LanguageSelector from '@/components/LanguageSelector';
import TranslationProcess from '@/components/TranslationProcess';
import { useWordPress } from '@/context/WordPressContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Install framer-motion for animations
<lov-add-dependency>framer-motion@latest</lov-add-dependency>

const AppContent = () => {
  const { isConnected, selectedPosts } = useWordPress();
  const [selectedLanguage, setSelectedLanguage] = useState('zh');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };
  
  const handleTranslationComplete = () => {
    setIsTranslating(false);
  };
  
  const startTranslation = () => {
    if (selectedPosts.length === 0) {
      toast.error('Please select at least one post to translate');
      return;
    }
    
    if (!selectedLanguage) {
      toast.error('Please select a target language');
      return;
    }
    
    setIsTranslating(true);
  };
  
  return (
    <div>
      {/* Connection form */}
      <ConnectionForm />
      
      {/* Post selection and translation UI */}
      {isConnected && (
        <motion.div 
          className="mt-8 space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {!isTranslating ? (
            <>
              <div className="text-center mb-8">
                <motion.h2 
                  className="text-2xl font-semibold" 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  Select Posts to Translate
                </motion.h2>
                <motion.p 
                  className="text-muted-foreground mt-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  Choose the posts you want to translate and select your target language
                </motion.p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PostList />
                </div>
                <div className="lg:col-span-1">
                  <LanguageSelector 
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                  />
                  
                  <motion.div 
                    className="mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <button
                      onClick={startTranslation}
                      disabled={selectedPosts.length === 0}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2
                        ${selectedPosts.length === 0 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg'
                        }`}
                    >
                      <span>Translate {selectedPosts.length} Selected Posts</span>
                      {selectedPosts.length > 0 && (
                        <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                          {selectedPosts.length}
                        </span>
                      )}
                    </button>
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            <TranslationProcess 
              selectedLanguage={selectedLanguage}
              onTranslationComplete={handleTranslationComplete}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

const Index = () => {
  return (
    <WordPressProvider>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 dark:from-slate-900 dark:to-gray-900 pb-20">
        <motion.div 
          className="container mx-auto pt-12 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold mb-4">WordPress Translation Tool</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect to your WordPress site and translate posts to multiple languages 
              using advanced AI translation
            </p>
          </motion.div>
          
          <motion.div 
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AppContent />
          </motion.div>
        </motion.div>
      </div>
    </WordPressProvider>
  );
};

export default Index;
