import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, Lock, UserIcon, AlertCircle, Users, Activity } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const RescueTeamAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkRescueTeamRole = async (userId: string): Promise<boolean> => {
    try {
      console.log(`Checking rescue team role for user: ${userId}`);
      
      const { data, error } = await supabase.rpc('has_role', {
        check_user_id: userId,
        role_name: 'rescue_team'
      });

      if (error) {
        console.error('Error checking rescue team role:', error);
        return false;
      }

      console.log('Rescue team role check result:', data);
      return data || false;
    } catch (error) {
      console.error('Error in checkRescueTeamRole:', error);
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Rescue team auth state change:', event, session?.user?.id);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          setCheckingRole(true);
          try {
            const hasRescueTeamRole = await checkRescueTeamRole(session.user.id);
            
            if (hasRescueTeamRole) {
              console.log('Rescue team role confirmed, redirecting to /rescue-team');
              navigate("/rescue-team");
            } else {
              console.log('No rescue team role found after retries');
              toast({
                title: "Access Denied",
                description: "You don't have rescue team privileges. Please contact the system administrator.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
            }
          } catch (error) {
            console.error('Error during role verification:', error);
            toast({
              title: "Error",
              description: "Failed to verify rescue team privileges. Please try again.",
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
          const hasRescueTeamRole = await checkRescueTeamRole(session.user.id);
          
          if (hasRescueTeamRole) {
            navigate("/rescue-team");
          } else {
            toast({
              title: "Access Denied",
              description: "You don't have rescue team privileges.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Error checking initial rescue team role:', error);
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
          description: "Verifying rescue team privileges...",
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

    try {
      const redirectUrl = `${window.location.origin}/rescue-team-auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            team_name: teamName,
            specialization: specialization,
            contact_phone: contactPhone,
          }
        }
      });

      if (error) {
        setError(error.message);
        console.error('Sign up error:', error);
      } else if (data.user) {
        console.log('User created, creating rescue team profile and assigning role...');
        
        // Wait a moment for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Create rescue team profile
        const { error: teamError } = await supabase
          .from('rescue_teams')
          .insert({
            user_id: data.user.id,
            team_name: teamName,
            specialization: specialization,
            contact_phone: contactPhone,
            contact_email: email,
          });

        // Assign rescue_team role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'rescue_team',
          });

        if (teamError || roleError) {
          console.error('Error creating team profile or role:', teamError || roleError);
          toast({
            title: "Warning",
            description: "Account created but team setup failed. Please contact support.",
            variant: "destructive",
          });
        } else {
          console.log('Rescue team profile and role assigned successfully');
        }

        toast({
          title: "Rescue Team Account Created!",
          description: "Please check your email to verify your account before signing in.",
        });
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Verifying rescue team privileges...</p>
        </div>
      </div>
    );
  }

  if (user && !checkingRole) {
    return null; // Will redirect or show error
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6 group">
            <Shield className="h-8 w-8 text-orange-500 group-hover:text-orange-600 transition-colors" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
              DroneX Rescue
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rescue Team Portal</h1>
          <p className="text-gray-600">Join our emergency response network</p>
        </div>

        <Card className="border-orange-100 shadow-xl shadow-orange-100/20">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Join Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  <span>Team Sign In</span>
                </CardTitle>
                <CardDescription>
                  Access your rescue team dashboard  
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Team Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="team@rescue.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-orange-200 focus:border-orange-400"
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
                        className="pl-10 border-orange-200 focus:border-orange-400"
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
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Access Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span>Join Rescue Network</span>
                </CardTitle>
                <CardDescription>
                  Register your rescue team with DroneX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Team Leader Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 border-orange-200 focus:border-orange-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="team-name"
                        type="text"
                        placeholder="Alpha Rescue Team"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="pl-10 border-orange-200 focus:border-orange-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      type="text"
                      placeholder="Search & Rescue, Medical, Fire, etc."
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="border-orange-200 focus:border-orange-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Team Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="team@rescue.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 border-orange-200 focus:border-orange-400"
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
                        className="pl-10 border-orange-200 focus:border-orange-400"
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
                        className="pl-10 border-orange-200 focus:border-orange-400"
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
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    disabled={loading}
                  >
                    {loading ? "Creating Team..." : "Join Rescue Network"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-orange-600 hover:text-orange-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RescueTeamAuth;
