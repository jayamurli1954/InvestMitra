import { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ProfileSettings = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API}/users/me`, { name, mobile });
      setUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await axios.post(`${API}/users/me/change-password`, { password });
      toast.success('Password changed successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-slate-400">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Update Profile</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Mobile Number</Label>
              <Input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Update Profile</Button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label className="text-slate-300">New Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Change Password</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
