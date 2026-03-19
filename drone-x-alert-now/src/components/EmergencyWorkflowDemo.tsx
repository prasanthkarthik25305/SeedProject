import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, MapPin, Navigation, Shield, Activity, 
  Zap, Users, Clock, CheckCircle, Play, Phone, 
  MessageCircle, Eye, Radio, Ambulance
} from 'lucide-react';
import { emergencyService, type EmergencyAlert, type RescueMission } from '@/services/emergencyService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmergencyWorkflowDemoProps {
  onComplete?: () => void;
}

export const EmergencyWorkflowDemo: React.FC<EmergencyWorkflowDemoProps> = ({
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyAlert | null>(null);
  const [rescueMission, setRescueMission] = useState<RescueMission | null>(null);
  const [demoLocation] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC
  const [canManuallyResolve, setCanManuallyResolve] = useState(false);
  const { toast } = useToast();

  const workflowSteps = [
    { title: "Hazard Detection", description: "AI detects emergency via voice/chat/video", icon: AlertTriangle },
    { title: "Safe Zone Analysis", description: "System finds nearest safe locations", icon: MapPin },
    { title: "Neighbor Alerts", description: "Notifying nearby users", icon: Users },
    { title: "Admin Notification", description: "Emergency portal alerted", icon: Shield },
    { title: "Rescue Dispatch", description: "Team deployed to location", icon: Ambulance },
    { title: "Mission Complete", description: "Emergency resolved", icon: CheckCircle },
  ];

  const runEmergencyWorkflow = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    try {
      // Step 1: Hazard Detection
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const hazard = await emergencyService.detectHazard(user.id, demoLocation, {
        type: 'fire',
        severity: 'high',
        source: 'ai_voice',
        description: 'Demo: Fire emergency detected via AI voice analysis',
        confidence: 0.9,
      });

      // Step 2: Safe Zone Analysis
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const safeZones = await emergencyService.getNearbySafeZones(demoLocation);

      // Step 3: Create Emergency Alerts
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const neighborAlert = await emergencyService.createEmergencyAlert(hazard.id, user.id, {
        alertType: 'neighbor_alert',
        message: 'EMERGENCY: Fire detected! Please be aware and evacuate if necessary.',
        urgencyLevel: 'high',
        triggeredBy: 'automatic',
      });

      const adminAlert = await emergencyService.createEmergencyAlert(hazard.id, user.id, {
        alertType: 'admin_alert',
        message: `EMERGENCY ALERT: Fire detected at ${demoLocation.lat}, ${demoLocation.lng}. Immediate response required.`,
        urgencyLevel: 'high',
        triggeredBy: 'automatic',
      });

      setEmergencyAlert(adminAlert);

      // Step 4: Admin Notification
      setCurrentStep(4);
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "🚨 Emergency Alert Received",
        description: "Admin portal has received the emergency alert.",
      });

      // Step 5: Rescue Dispatch
      setCurrentStep(5);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mission = await emergencyService.triggerRescueMission(adminAlert.id, 'rescue-team-1');
      setRescueMission(mission);

      toast({
        title: "🚑 Rescue Team Dispatched",
        description: "Rescue team has been deployed to the emergency location.",
      });

      // Step 6: Mission Complete
      setCurrentStep(6);
      setCanManuallyResolve(true);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Show both resolution options
      toast({
        title: "🎯 Resolution Options Available",
        description: "Emergency can be resolved manually by admin or automatically by system.",
      });

      // Auto-resolution will happen after 30 seconds (for demo)
      setTimeout(async () => {
        if (!canManuallyResolve) { // Only auto-resolve if not manually resolved
          const autoResolved = await emergencyService.autoResolveEmergency(adminAlert.id);
          
          if (autoResolved) {
            toast({
              title: "🤖 Auto-Resolution Triggered",
              description: "System automatically resolved the emergency based on conditions.",
            });
            setCanManuallyResolve(false);
          }

          if (onComplete) {
            onComplete();
          }
        }
      }, 30000); // 30 seconds for demo

    } catch (error) {
      console.error('Error in emergency workflow demo:', error);
      toast({
        title: "Demo Error",
        description: "Failed to complete the emergency workflow demo.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setEmergencyAlert(null);
    setRescueMission(null);
    setCanManuallyResolve(false);
    setIsRunning(false);
  };

  const handleManualResolve = async () => {
    if (!emergencyAlert) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await emergencyService.resolveEmergency(
        emergencyAlert.id, 
        user.id, 
        "Manually resolved by admin in demo"
      );

      toast({
        title: "✅ Manually Resolved",
        description: "Emergency manually resolved by administrator.",
      });

      setCanManuallyResolve(false);
      setIsRunning(false);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error in manual resolution:', error);
      toast({
        title: "Resolution Error",
        description: "Failed to manually resolve emergency.",
        variant: "destructive",
      });
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep && isRunning) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Emergency Response Workflow Demo
          </CardTitle>
          <CardDescription>
            Watch the complete emergency response system in action - from detection to resolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={runEmergencyWorkflow}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                  Running Demo...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Emergency Demo
                </>
              )}
            </Button>
            
            {canManuallyResolve && (
              <Button 
                onClick={handleManualResolve}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Manual Resolve
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={resetDemo}
              disabled={isRunning}
            >
              Reset
            </Button>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Workflow Progress</span>
                <span>{Math.round((currentStep / workflowSteps.length) * 100)}%</span>
              </div>
              <Progress value={(currentStep / workflowSteps.length) * 100} className="w-full" />
            </div>
          )}

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowSteps.map((step, index) => {
              const status = getStepStatus(index);
              const Icon = step.icon;
              
              return (
                <Card 
                  key={index}
                  className={`transition-all duration-300 ${
                    status === 'completed' ? 'bg-green-50 border-green-200' :
                    status === 'active' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'active' ? 'bg-blue-500 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant={
                        status === 'completed' ? 'default' :
                        status === 'active' ? 'secondary' :
                        'outline'
                      }>
                        {status === 'completed' ? 'Completed' :
                         status === 'active' ? 'Active' :
                         'Pending'}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Live Status Updates */}
          {(emergencyAlert || rescueMission) && (
            <div className="space-y-4">
              {emergencyAlert && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Emergency Alert Created</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Type:</strong> {emergencyAlert.alert_type.replace('_', ' ')}</p>
                      <p><strong>Urgency:</strong> {emergencyAlert.urgency_level}</p>
                      <p><strong>Status:</strong> {emergencyAlert.status}</p>
                      <p><strong>Location:</strong> {emergencyAlert.location.lat.toFixed(4)}, {emergencyAlert.location.lng.toFixed(4)}</p>
                      <p><strong>Recipients:</strong> {emergencyAlert.recipients.length} notified</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {rescueMission && (
                <Alert>
                  <Ambulance className="h-4 w-4" />
                  <AlertTitle>Rescue Mission Active</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Mission ID:</strong> {rescueMission.id.slice(0, 8)}...</p>
                      <p><strong>Status:</strong> {rescueMission.status.replace('_', ' ')}</p>
                      <p><strong>Team:</strong> {rescueMission.rescue_team_id}</p>
                      <p><strong>Equipment:</strong> {rescueMission.equipment.join(', ')}</p>
                      <p><strong>Assigned:</strong> {new Date(rescueMission.assigned_at).toLocaleTimeString()}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Demo Info */}
          <Alert>
            <MessageCircle className="h-4 w-4" />
            <AlertTitle>Resolution Options</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Emergency can be resolved in two ways:</p>
                <ol className="ml-4 list-decimal space-y-1 text-sm">
                  <li><strong>Manual Resolution:</strong> Admin clicks "Manual Resolve" button</li>
                  <li><strong>Auto-Resolution:</strong> System automatically resolves based on conditions:
                    <ul className="ml-4 list-disc space-y-1 text-xs mt-1">
                      <li>Rescue mission marked completed</li>
                      <li>Low urgency after 30 minutes</li>
                      <li>Medium urgency after 60 minutes</li>
                      <li>No user activity for 90 minutes</li>
                      <li>Hazard no longer detected</li>
                    </ul>
                  </li>
                </ol>
                {canManuallyResolve && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-800">
                      ⚠️ Manual resolve available! Auto-resolution in 30 seconds if not manually resolved.
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
