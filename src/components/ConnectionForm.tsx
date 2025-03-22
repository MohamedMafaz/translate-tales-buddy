
import React, { useState } from 'react';
import { useWordPress } from '@/context/WordPressContext';
import { testConnection, fetchPosts, validateSiteUrl } from '@/services/wordpressService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, Key, User } from 'lucide-react';

const ConnectionForm: React.FC = () => {
  const { setCredentials, setPosts, clearConnection, isConnected } = useWordPress();
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const formattedUrl = validateSiteUrl(siteUrl);
      const credentials = { siteUrl: formattedUrl, username, appPassword };
      
      // Test connection
      const isConnected = await testConnection(credentials);
      
      if (isConnected) {
        // Fetch posts if connection is successful
        const posts = await fetchPosts(credentials);
        
        // Update context
        setCredentials(credentials);
        setPosts(posts);
        
        toast.success(`Connected to ${formattedUrl} successfully!`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-center">WordPress Connected</CardTitle>
            <CardDescription className="text-center">
              You are now connected to your WordPress site
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={clearConnection} 
              className="w-full"
            >
              Disconnect
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Connect to WordPress</CardTitle>
          <CardDescription className="text-center">
            Enter your WordPress site URL and credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-primary/70" />
                <label htmlFor="siteUrl" className="text-sm font-medium">
                  WordPress Site URL
                </label>
              </div>
              <Input
                id="siteUrl"
                placeholder="https://yoursite.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                required
                className="bg-white/50 dark:bg-black/50"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-primary/70" />
                <label htmlFor="username" className="text-sm font-medium">
                  Admin Username
                </label>
              </div>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/50 dark:bg-black/50"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-primary/70" />
                <label htmlFor="appPassword" className="text-sm font-medium">
                  Application Password
                </label>
              </div>
              <Input
                id="appPassword"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
                className="bg-white/50 dark:bg-black/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Generate an application password in your WordPress dashboard
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Connecting...
                </span>
              ) : (
                <span className="flex items-center">
                  Connect <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConnectionForm;
