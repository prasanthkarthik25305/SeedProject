
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, Loader2 } from "lucide-react";

interface Profile {
  government_id?: string;
  full_name: string;
  age?: number;
  height?: number;
  weight?: number;
  blood_group?: string;
  address?: string;
  occupation?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  phone?: string;
}

export const ProfileForm = () => {
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProfile(data);
        } else {
          // Create initial profile with user's metadata
          setProfile({
            full_name: user.user_metadata?.full_name || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Profile, value: string | number) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <User className="h-5 w-5 text-sky-500" />
        <h3 className="text-lg font-semibold">Personal Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            value={profile.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="government_id">Government ID</Label>
          <Input
            id="government_id"
            value={profile.government_id || ''}
            onChange={(e) => handleInputChange('government_id', e.target.value)}
            placeholder="Driver's License, SSN, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            value={profile.age || ''}
            onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
            placeholder="Your age"
            min="1"
            max="120"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={profile.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Your phone number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            value={profile.height || ''}
            onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || 0)}
            placeholder="Height in centimeters"
            min="1"
            max="300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={profile.weight || ''}
            onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
            placeholder="Weight in kilograms"
            min="1"
            max="500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blood_group">Blood Group</Label>
          <Select value={profile.blood_group || ''} onValueChange={(value) => handleInputChange('blood_group', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              {bloodGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            id="occupation"
            value={profile.occupation || ''}
            onChange={(e) => handleInputChange('occupation', e.target.value)}
            placeholder="Your occupation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="father_name">Father's Name</Label>
          <Input
            id="father_name"
            value={profile.father_name || ''}
            onChange={(e) => handleInputChange('father_name', e.target.value)}
            placeholder="Father's full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mother_name">Mother's Name</Label>
          <Input
            id="mother_name"
            value={profile.mother_name || ''}
            onChange={(e) => handleInputChange('mother_name', e.target.value)}
            placeholder="Mother's full name"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="guardian_name">Guardian's Name</Label>
          <Input
            id="guardian_name"
            value={profile.guardian_name || ''}
            onChange={(e) => handleInputChange('guardian_name', e.target.value)}
            placeholder="Guardian's full name (if applicable)"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={profile.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Your complete address"
            rows={3}
          />
        </div>
      </div>

      <Button 
        onClick={saveProfile} 
        disabled={saving || !profile.full_name}
        className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </>
        )}
      </Button>
    </div>
  );
};
