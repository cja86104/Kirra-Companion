'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Camera, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getClient, updateUserMetadata } from '@/lib/supabase/client';

const accountSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
});

type AccountForm = z.infer<typeof accountSchema>;

export default function AccountSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = getClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user?.id)
        .single();

      setAvatarUrl(profile?.avatar_url || null);

      return {
        fullName: profile?.full_name || '',
        email: user?.email || '',
      };
    },
  });

  const onSubmit = async (data: AccountForm) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update auth metadata
      await updateUserMetadata({ full_name: data.fullName });

      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Avatar updated');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload avatar';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your companions, memories, and conversations. Are you absolutely sure?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted. Goodbye!');
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your personal information
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar size="2xl">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Profile" />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getInitials('User')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="font-medium">Profile Photo</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                error={errors.fullName?.message}
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                disabled
                {...register('email')}
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!isDirty || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
