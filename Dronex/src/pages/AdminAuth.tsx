
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, Lock, UserIcon, AlertCircle, Settings, Database } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const AdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    try {
      console.log(`Checking admin role for user: ${userId}`);
      
      const { data, error } = await supabase.rpc('has_role', {
        check_user_id: userId,
        role_name: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      console.log('Admin role check result:', data);
      return data || false;
    } catch (error) {
      console.error('Error in checkAdminRole:', error);
      return false;
    }
  };

  const assignAdminRole = async (userId: string): Promise<boolean> => {
    try {
      console.log(`Assigning admin role to user: ${userId}`);
      
      // Directly insert admin role without checking first
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });

      if (roleError) {
        console.error('Error assigning admin role:', roleError);
        // If it's a duplicate key error, that's actually success
        if (roleError.code === '23505') {
          console.log('Admin role already exists (duplicate key), considering as success');
          return true;
        }
        return false;
      }

      console.log('Admin role assigned successfully');
      return true;
    } catch (error) {
      console.error('Error in assignAdminRole:', error);
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin auth state change:', event, session?.user?.id);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          setCheckingRole(true);
          try {
            const hasAdminRole = await checkAdminRole(session.user.id);
            
            if (hasAdminRole) {
              console.log('Admin role confirmed, redirecting to /admin');
              navigate("/admin");
            } else {
              console.log('No admin role found');
              toast({
                title: "Access Denied",
                description: "You don't have admin privileges. Please contact the system administrator.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
            }
          } catch (error) {
            console.error('Error during role verification:', error);
            toast({
              title: "Error",
              description: "Failed to verify admin privileges. Please try again.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
          } finally {
            setCheckingRole(false);
          }
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setCheckingRole(true);
        try {
          const hasAdminRole = await checkAdminRole(session.user.id);
          
          if (hasAdminRole) {
            navigate("/admin");
          } else {
            toast({
              title: "Access Denied",
              description: "You don't have admin privileges.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Error checking initial admin role:', error);
        } finally {
          setCheckingRole(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        console.error('Sign in error:', error);
      } else {
        console.log('Sign in successful, auth state change will handle redirect');
        toast({
          title: "Authentication Successful",
          description: "Verifying admin privileges...",
        });
      }
    } catch (err) {
      console.error('Unexpected sign in error:', err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (adminCode !== "DRONEX_ADMIN_2024") {
      setError("Invalid admin authorization code");
      setLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/admin-auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            admin_access: true,
          }
        }
      });

      if (error) {
        setError(error.message);
        console.error('Sign up error:', error);
      } else if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // Wait a moment for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Assign admin role with detailed logging
        console.log('Starting admin role assignment...');
        const roleAssigned = await assignAdminRole(data.user.id);
        console.log('Role assignment result:', roleAssigned);
        
        if (roleAssigned) {
          console.log('Admin role successfully assigned');
          toast({
            title: "Admin Account Created!",
            description: "Please check your email to verify your account before signing in.",
          });
        } else {
          console.error('Admin role assignment failed');
          toast({
            title: "Account Created",
            description: "Admin account created. Please verify your email and try signing in. If you cannot access admin features, contact support.",
          });
        }
      }
    } catch (err) {
      console.error('Unexpected sign up error:', err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user && checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Verifying admin privileges...</p>
        </div>
      </div>
    );
  }

  if (user && !checkingRole) {
    return null; // Will redirect or show error
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6 group">
            <Shield className="h-8 w-8 text-slate-600 group-hover:text-slate-700 transition-colors" />
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">
              DroneX Admin
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Administrative Portal</h1>
          <p className="text-gray-600">System management and control center</p>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-100/20">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Register Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  <Settings className="h-5 w-5 text-slate-600" />
                  <span>Admin Access</span>
                </CardTitle>
                <CardDescription>
                  Sign in to the administrative dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Administrator Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="admin@dronex.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Authenticating..." : "Access Control Panel"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  <Database className="h-5 w-5 text-slate-600" />
                  <span>Admin Registration</span>
                </CardTitle>
                <CardDescription>
                  Create a new administrator account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="System Administrator"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-code">Admin Authorization Code</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="admin-code"
                        type="password"
                        placeholder="Enter admin authorization code"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Contact system administrator for authorization code
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Administrator Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="admin@dronex.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Creating Admin..." : "Create Administrator"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-slate-600 hover:text-slate-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
