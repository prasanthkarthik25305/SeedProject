import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-lg text-gray-600 mb-6">Oops! Page not found</p>
          <p className="text-sm text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-sky-600 hover:bg-sky-700"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
