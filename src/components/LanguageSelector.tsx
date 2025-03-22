
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { LANGUAGES } from '@/services/translationService';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onLanguageChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full"
    >
      <Card className="glass-card h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-primary/80" />
            Translation Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <RadioGroup value={selectedLanguage} onValueChange={onLanguageChange} className="space-y-3">
              {LANGUAGES.map((language) => (
                <div
                  key={language.code}
                  className={`flex items-center space-x-3 rounded-md p-3 transition-all ${
                    selectedLanguage === language.code
                      ? 'bg-primary/10 border border-primary/40'
                      : 'hover:bg-white/30 dark:hover:bg-black/30 border border-transparent'
                  }`}
                >
                  <RadioGroupItem 
                    value={language.code} 
                    id={`language-${language.code}`} 
                    className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  />
                  <Label
                    htmlFor={`language-${language.code}`}
                    className="flex-1 cursor-pointer"
                  >
                    {language.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LanguageSelector;
