import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContactAvatar } from '@/components/ui/contact-avatar';
import { initializeStorageBucket } from '@/utils/storage';

export const DebugPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in first",
          variant: "destructive",
        });
        return;
      }

      // Test contacts fetch
      const { data: contacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id);

      console.log('Contacts:', contacts);
      console.log('Contacts error:', contactsError);

      // Test storage bucket
      const bucketInitialized = await initializeStorageBucket();
      console.log('Storage bucket initialized:', bucketInitialized);

      // Test chat messages
      const { data: messages, error: messagesError } = await supabase
        .from('emergency_chat_messages')
        .select('*')
        .limit(5);

      console.log('Messages:', messages);
      console.log('Messages error:', messagesError);

      setResults([
        { name: 'User', data: user },
        { name: 'Contacts', data: contacts, error: contactsError },
        { name: 'Messages', data: messages, error: messagesError },
        { name: 'Storage Bucket', data: bucketInitialized }
      ]);

      toast({
        title: "Debug complete",
        description: "Check console for detailed results",
      });

    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Debug failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testContactAvatar = () => {
    setResults([
      {
        name: 'Test Avatar',
        component: (
          <div className="flex gap-4">
            <ContactAvatar
              name="Test Contact"
              photoUrl="https://via.placeholder.com/150"
              size={64}
              showOnlineStatus={true}
              isOnline={true}
            />
            <ContactAvatar
              name="No Photo"
              photoUrl={null}
              size={48}
              gender="male"
              showOnlineStatus={true}
              isOnline={false}
            />
          </div>
        )
      }
    ]);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testDatabaseConnection} disabled={loading}>
            {loading ? 'Testing...' : 'Test Database'}
          </Button>
          <Button onClick={testContactAvatar} variant="outline">
            Test Avatars
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="p-3 border rounded">
                <h4 className="font-medium mb-2">{result.name}</h4>
                {result.component ? (
                  result.component
                ) : (
                  <div className="space-y-2">
                    {result.error && (
                      <div className="text-red-600 text-sm">
                        Error: {JSON.stringify(result.error)}
                      </div>
                    )}
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};