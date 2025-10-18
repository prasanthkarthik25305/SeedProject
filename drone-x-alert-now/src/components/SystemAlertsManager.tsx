
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, CheckCircle, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SystemAlert {
  id: string;
  admin_id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export const SystemAlertsManager = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    alert_type: '',
    title: '',
    message: '',
    severity: 'medium'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load system alerts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('system_alerts')
        .insert({
          admin_id: user.id,
          ...newAlert
        });

      if (error) throw error;

      toast({
        title: "Alert Created",
        description: "System alert has been created successfully",
      });
      
      setIsDialogOpen(false);
      setNewAlert({ alert_type: '', title: '', message: '', severity: 'medium' });
      loadAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert Resolved",
        description: "Alert has been marked as resolved",
      });
      
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Alerts</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create System Alert</DialogTitle>
              <DialogDescription>
                Create a new system alert to notify users of important information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="alert_type">Alert Type</Label>
                <Select value={newAlert.alert_type} onValueChange={(value) => setNewAlert({...newAlert, alert_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select value={newAlert.severity} onValueChange={(value) => setNewAlert({...newAlert, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  value={newAlert.title}
                  onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                  placeholder="Alert title"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                  placeholder="Alert message"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAlert}>
                  Create Alert
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border-sky-100">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {alert.title}
                  </CardTitle>
                  <CardDescription>
                    {alert.alert_type} • {new Date(alert.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  {alert.is_resolved ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{alert.message}</p>
              {!alert.is_resolved && (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => resolveAlert(alert.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
