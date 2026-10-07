import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, CardHeader, CardBody, Badge, Button, Confirm,
  Input, Textarea, useToast, StatRow,
} from '../components/ui';
import {
  User, Lock, Settings, Store, Bell, Receipt,
  Save, X, Edit, KeyRound, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AvatarUpload } from '../components/Avatar';
import { fmt } from '../utils/formatters';
import type { PageId } from '../components/Layout';

interface Props { subPage: PageId; userName: string; userRole: 'admin' | 'staff'; onNavigate: (p: PageId) => void; }

export default function ProfilePage({ subPage, userName, userRole, onNavigate }: Props) {
  if (subPage === 'change-password') return <ChangePasswordPage onNavigate={onNavigate} />;
  if (subPage === 'settings') return <SettingsPage userName={userName} userRole={userRole} onNavigate={onNavigate} />;
  return <MyProfilePage userRole={userRole} />;
}

function AccountSection({ userName, userRole, onNavigate }: { userName: string; userRole: 'admin' | 'staff'; onNavigate: (p: PageId) => void }) {
  const { logout, employee, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <User className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 tracking-tight">Account</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <AvatarUpload
            name={userName}
            src={employee?.avatarUrl}
            size="md"
            onChange={async url => {
              await updateProfile({ avatarUrl: url });
              toast.success(url ? 'Profile photo updated.' : 'Profile photo removed.');
            }}
            onError={msg => toast.error(msg)}
          />
          <div>
            <p className="font-bold text-slate-900">{userName}</p>
            <Badge variant={userRole === 'admin' ? 'admin' : 'staff'}>
              {userRole === 'admin' ? 'System Administrator' : 'Staff Member'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={() => onNavigate('profile')} icon={<User className="w-4 h-4" />}>My Profile</Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('change-password')} icon={<KeyRound className="w-4 h-4" />}>Change Password</Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmLogout(true)} icon={<LogOut className="w-4 h-4" />}>Sign Out</Button>
        </div>
      </CardBody>

      <Confirm
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => { void logout().then(() => navigate('/login')); }}
        title="Sign Out?"
        message="You will be signed out of the system and returned to the login screen."
        confirmLabel="Sign Out"
        danger
      />
    </Card>
  );
}

function MyProfilePage({ userRole }: { userRole: 'admin' | 'staff' }) {
  const { employee, updateProfile } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    phone: employee?.phone ?? '',
  });

  // Keep the form in sync once the employee record resolves.
  useEffect(() => {
    if (employee) setForm({ name: employee.name, phone: employee.phone });
  }, [employee]);

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card><CardBody className="p-10 text-center text-slate-500 text-sm">Loading your profile…</CardBody></Card>
      </div>
    );
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Full name is required.'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      toast.success('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (dataUrl: string | null) => {
    await updateProfile({ avatarUrl: dataUrl });
    toast.success(dataUrl ? 'Profile photo updated.' : 'Profile photo removed.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your personal account settings and information" />
      <Card>
        <CardBody className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left border-b border-slate-100 pb-8">
            <AvatarUpload
              name={employee.name}
              src={employee.avatarUrl}
              size="lg"
              onChange={handleAvatar}
              onError={msg => toast.error(msg)}
            />
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{employee.name}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <Badge variant={userRole === 'admin' ? 'admin' : 'staff'}>
                  {userRole === 'admin' ? 'System Administrator' : 'Staff Member'}
                </Badge>
                <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> ALMS System
                </span>
              </div>
            </div>
          </div>

          {editing ? (
            <div className="space-y-5">
              <Input label="Full Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} icon={<User className="w-4 h-4 text-slate-400" />} />
              <Input label="Email Address" type="email" value={employee.email} disabled />
              <Input label="Phone Number" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} />
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => { setEditing(false); setForm({ name: employee.name, phone: employee.phone }); }} icon={<X className="w-4 h-4" />}>Cancel</Button>
                <Button variant="primary" loading={saving} onClick={handleSave} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-6">
                <StatRow label="Employee ID" value={employee.id} mono />
                <StatRow label="Full Name" value={employee.name} />
                <StatRow label="Email Address" value={employee.email} />
                <StatRow label="Phone Number" value={employee.phone || '—'} />
                <StatRow label="System Role" value={userRole === 'admin' ? 'Administrator' : 'Cashier / Staff'} />
                <StatRow label="Date Joined" value={employee.joined ? fmt.date(employee.joined) : '—'} />
              </div>
              <Button variant="outline" onClick={() => setEditing(true)} icon={<Edit className="w-4 h-4" />}>Edit Profile Information</Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ChangePasswordPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const toast = useToast();
  const { changePassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current || !form.newPass || !form.confirm) { toast.error('All fields are required.'); return; }
    if (form.newPass !== form.confirm) { toast.error('New passwords do not match.'); return; }
    if (form.newPass.length < 8) { toast.error('Password must be at least 8 characters long.'); return; }

    setSaving(true);
    try {
      await changePassword(form.newPass);
      toast.success('Account password changed successfully.');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <PageHeader title="Security Settings" subtitle="Update your account password" />
      <Card>
        <CardBody className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 mb-2 text-slate-700 font-semibold border-b border-slate-100 pb-4">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>Change Password</span>
            </div>
            <Input label="Current Password" type="password" placeholder="Enter current password"
              value={form.current} onChange={e => setForm(p=>({...p,current:e.target.value}))} />
            <Input label="New Password" type="password" placeholder="Minimum 8 characters"
              value={form.newPass} onChange={e => setForm(p=>({...p,newPass:e.target.value}))} />
            <Input label="Confirm New Password" type="password" placeholder="Repeat new password"
              value={form.confirm} onChange={e => setForm(p=>({...p,confirm:e.target.value}))} />
              
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
              <p className="text-xs text-slate-700 font-bold mb-2 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Password Requirements
              </p>
              <ul className="text-xs text-slate-600 space-y-1 ml-5 list-disc">
                <li>Minimum of 8 characters in length</li>
                <li>Recommend mixing uppercase, lowercase, numbers</li>
                <li>Never share your credentials with anyone</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => onNavigate('profile')}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>Update Password</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function SettingsPage({ userName, userRole, onNavigate }: { userName: string; userRole: 'admin' | 'staff'; onNavigate: (p: PageId) => void }) {
  const toast = useToast();

  if (userRole === 'staff') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title="Personal Settings" subtitle="Configure your local preferences" />
        <AccountSection userName={userName} userRole={userRole} onNavigate={onNavigate} />
        <Card>
          <CardBody className="p-8 text-center">
            <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">No System Settings Available</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              System configuration, business profiles, and notification preferences are restricted to Administrators. Please contact your manager to make system-wide changes.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="System Settings" subtitle="Configure global system preferences and business rules" />

      <AccountSection userName={userName} userRole={userRole} onNavigate={onNavigate} />

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Store className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 tracking-tight">Business Profile</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Registered Business Name" defaultValue="ALMS Water Refilling Station & Laundry Shop" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Number" defaultValue="(082) 222-4570" />
            <Input label="Public Email Address" type="email" defaultValue="almswaterrefillingstation@gmail.com" />
          </div>
          <Textarea label="Physical Address" defaultValue="Blk 18, Lot 20, Mint St., Countryville Executive Homes, Cabantian, Davao City" rows={2} />
          <div className="pt-2">
            <Button onClick={() => toast.success('Business information updated successfully.')} variant="primary" icon={<Save className="w-4 h-4" />}>Save Information</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 tracking-tight">Notification Preferences</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">SMS Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Automatically send SMS to customers when laundry is ready</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">Email Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Send electronic receipts and order updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Low Stock Alerts</p>
              <p className="text-xs text-slate-500 mt-0.5">Alert administrators when inventory items fall below reorder level</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="pt-2">
            <Button onClick={() => toast.success('Notification preferences saved.')} variant="outline" icon={<Save className="w-4 h-4" />}>Save Preferences</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 tracking-tight">Receipt Configuration</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Receipt Header Text" defaultValue="ALMS Water Refilling Station & Laundry Shop" />
          <Textarea label="Receipt Footer Note" defaultValue="Thank you for your business! Please keep this receipt as proof of transaction. Valid for 30 days." rows={3} />
          <div className="pt-2">
            <Button onClick={() => toast.success('Receipt templates updated.')} variant="outline" icon={<Save className="w-4 h-4" />}>Save Configuration</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
