
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Camera, MapPin, Bot, Users, AlertTriangle, Zap, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check current auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: <Camera className="h-8 w-8 text-sky-500" />,
      title: "AI-Powered Detection",
      description: "Real-time object and person detection using advanced YOLO algorithms for emergency situations."
    },
    {
      icon: <MapPin className="h-8 w-8 text-sky-500" />,
      title: "Live GPS Tracking",
      description: "Precise location tracking and navigation assistance for rescue teams and emergency contacts."
    },
    {
      icon: <Bot className="h-8 w-8 text-sky-500" />,
      title: "AI Assistant",
      description: "Intelligent emergency response assistant that understands natural language and provides instant help."
    },
    {
      icon: <Users className="h-8 w-8 text-sky-500" />,
      title: "Rescue Coordination",
      description: "Seamless coordination between users, emergency contacts, and professional rescue teams."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Sign Up & Profile Setup",
      description: "Create your account and add emergency contacts for instant notifications."
    },
    {
      step: "02",
      title: "Access Live Feeds",
      description: "Monitor drone camera feeds with AI-powered detection for real-time situational awareness."
    },
    {
      step: "03",
      title: "Emergency Detection",
      description: "Our AI automatically identifies emergency situations and alerts relevant parties."
    },
    {
      step: "04",
      title: "Rescue Coordination",
      description: "Professional rescue teams receive alerts with precise location data for rapid response."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-sky-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-sky-500" />
              <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
                DroneX
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" className="text-sky-600 hover:text-sky-700">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-sky-100 text-sky-700 hover:bg-sky-200">
            <Zap className="h-4 w-4 mr-1" />
            AI-Powered Disaster Response
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-sky-800 to-sky-600 bg-clip-text text-transparent">
              DroneX: Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
              Disaster Management Solution
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Revolutionary AI-driven platform combining live drone feeds, real-time detection, 
            and intelligent emergency response to save lives during disasters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!user && (
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-lg px-8 py-6 h-auto transform hover:scale-105 transition-all">
                  Get Started Now
                </Button>
              </Link>
            )}
            <Link to="/ai-assistant">
              <Button size="lg" variant="outline" className="border-sky-300 text-sky-600 hover:bg-sky-50 text-lg px-8 py-6 h-auto transform hover:scale-105 transition-all">
                Try AI Assistant
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-sky-600 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced technology meets emergency response for unparalleled disaster management capabilities.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-sky-100 hover:shadow-xl hover:shadow-sky-100/50 transition-all duration-300 group hover:-translate-y-2">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 p-3 bg-sky-50 rounded-full group-hover:bg-sky-100 transition-colors">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-sky-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-sky-600 bg-clip-text text-transparent">
              How DroneX Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, efficient, and life-saving emergency response in four easy steps.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <Card className="border-sky-100 hover:shadow-xl hover:shadow-sky-100/50 transition-all duration-300 hover:-translate-y-2">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-full flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">
                      {step.step}
                    </div>
                    <CardTitle className="text-lg mb-2">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center leading-relaxed">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-sky-300 to-sky-400 transform -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Alert Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-700 mb-2">Emergency Response Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg text-red-600 mb-6">
                In case of emergency, our AI assistant is available 24/7 to provide immediate assistance 
                and coordinate with rescue teams. Every second counts.
              </CardDescription>
              <Link to="/ai-assistant">
                <Button className="bg-red-600 hover:bg-red-700 text-white px-8">
                  Access Emergency AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-sky-400" />
                <span className="text-xl font-bold">DroneX</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Revolutionary disaster management platform powered by AI technology.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>AI Detection</li>
                <li>Live GPS Tracking</li>
                <li>Emergency Response</li>
                <li>Rescue Coordination</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Safety Guidelines</li>
                <li>Emergency Contacts</li>
                <li>24/7 AI Assistant</li>
                <li>Help Center</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
                <li>Compliance</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 DroneX. All rights reserved.</p>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Global Emergency Response Network</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
