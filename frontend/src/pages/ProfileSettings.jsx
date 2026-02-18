import { useState, useEffect } from 'react';
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
  const [countryCode, setCountryCode] = useState(user?.country_code || '');
  const [country, setCountry] = useState(user?.country || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setMobile(user.mobile || '');
      setCountryCode(user.country_code || '');
      setCountry(user.country || '');
      setDateOfBirth(user.date_of_birth || '');
      setDefaultCurrency(user.default_currency || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${API}/users/me`,
        {
          name,
          mobile,
          country_code: countryCode,
          country,
          date_of_birth: dateOfBirth,
          default_currency: defaultCurrency
        },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to update profile';
      toast.error(message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await axios.post(`${API}/users/me/change-password`, { password }, { withCredentials: true });
      toast.success('Password changed successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to change password';
      toast.error(message);
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
            <div className="flex gap-2">
              <div className="w-1/4">
                <Label className="text-slate-300">Country Code</Label>
                <Input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+91"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="w-3/4">
                <Label className="text-slate-300">Mobile Number</Label>
                <Input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Country</Label>
              <Input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Default Currency</Label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="SGD">SGD</option>
              </select>
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
