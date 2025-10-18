import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, Wifi } from 'lucide-react';

interface QRCodeGeneratorProps {
  streamUrl: string;
  streamName: string;
}

export const QRCodeGenerator = ({ streamUrl, streamName }: QRCodeGeneratorProps) => {
  return (
    <Card className="border-sky-100">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Smartphone className="h-5 w-5 mr-2" />
          Connect Mobile Device
        </CardTitle>
        <CardDescription>
          Scan this QR code with your mobile device to connect and start streaming
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg border-2 border-sky-200">
          <QRCodeSVG
            value={streamUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Wifi className="h-4 w-4 mr-1" />
            Stream: {streamName}
          </div>
          <p className="text-xs text-gray-500 max-w-xs">
            Open your camera app and point it at the QR code to connect your mobile device
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
