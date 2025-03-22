
import React, { useState } from 'react';
import { useWordPress } from '@/context/WordPressContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { CheckCheck, Filter, Search, X } from 'lucide-react';

const PostList: React.FC = () => {
  const { posts, togglePostSelection, selectedPosts, selectAllPosts, unselectAllPosts } = useWordPress();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter posts based on search term
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full"
    >
      <Card className="glass-card h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">WordPress Posts</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedPosts.length} of {posts.length} selected
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-white/50 dark:bg-black/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={selectAllPosts}
              className="flex items-center gap-1"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Select All</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={unselectAllPosts}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No posts found
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-3 rounded-md transition-all ${
                      post.selected 
                        ? 'bg-primary/10 border border-primary/40' 
                        : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`post-${post.id}`}
                        checked={post.selected}
                        onCheckedChange={() => togglePostSelection(post.id)}
                        className="mt-1"
                      />
                      <div className="space-y-1 flex-1">
                        <label
                          htmlFor={`post-${post.id}`}
                          className="font-medium cursor-pointer hover:text-primary"
                        >
                          {post.title}
                        </label>
                        
                        <div 
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: post.excerpt }}
                        />
                        
                        <div className="text-xs text-muted-foreground">
                          Published: {new Date(post.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {filteredPosts.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-muted-foreground">
                    No posts matching "{searchTerm}"
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PostList;
