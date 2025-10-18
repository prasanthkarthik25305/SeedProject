
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  created_at: string;
  roles: Array<{ role: string }>;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles separately for each user
      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.user_id);

          return {
            ...user,
            roles: roles || []
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'rescue_team': return 'bg-blue-100 text-blue-700';
      case 'user': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'rescue_team': return UserCheck;
      default: return Users;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              const primaryRole = user.roles[0]?.role || 'user';
              const RoleIcon = getRoleIcon(primaryRole);
              
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <RoleIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">{user.phone || 'No phone'}</p>
                        <Badge className={getRoleColor(primaryRole)}>
                          {primaryRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Select
                      value={primaryRole}
                      onValueChange={(value) => updateUserRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="rescue_team">Rescue Team</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                There are currently no users in the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
