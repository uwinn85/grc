import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { NfcTagEntity } from '@/types/nfc';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Lock, LogOut, User, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { MetricCards } from '@/components/admin/MetricCards';
import { TagTable } from '@/components/admin/TagTable';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [tags, setTags] = useState<NfcTagEntity[]>([]);
  const [totalTaps, setTotalTaps] = useState<number>(0);
  const [newTagId, setNewTagId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() === 'jagres' && password === 'Kontolodon123!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_logged_in', 'true');
      toast.success('Selamat datang, Admin Jagres!');
    } else {
      toast.error('Username atau kata sandi admin salah.');
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_logged_in');
    toast.info('Berhasil keluar dari dashboard.');
  }

  async function fetchMetrics() {
    setLoading(true);

    const { data: tagList, error } = await supabase
      .from('nfc_tags')
      .select('id, type, business_name, google_place_id, is_active, total_taps, hub_config, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal mengambil data: ' + error.message);
    }

    const list = (tagList as NfcTagEntity[]) || [];
    setTags(list);
    
    const aggregateTaps = list.reduce((sum, item) => sum + (Number(item.total_taps) || 0), 0);
    setTotalTaps(aggregateTaps);
    
    setLoading(false);
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagId.trim()) return;

    const formattedId = newTagId.trim().toUpperCase();
    const { error } = await supabase
      .from('nfc_tags')
      .insert([{ id: formattedId, is_active: false }]);

    if (!error) {
      toast.success(`Tag ${formattedId} berhasil didaftarkan!`);
      setNewTagId('');
      fetchMetrics();
    } else {
      if (error.code === '23505') {
        toast.error(`Tag ID "${formattedId}" sudah pernah didaftarkan sebelumnya.`);
      } else {
        toast.error(`Error (${error.code || 'DB'}): ${error.message}`);
      }
    }
  }

  // Edit/Ganti ID Tag dari Admin
  async function handleUpdateTagId(oldId: string, newId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('nfc_tags')
        .update({ id: newId })
        .eq('id', oldId);

      if (error) {
        if (error.code === '23505') {
          toast.error(`ID "${newId}" sudah digunakan oleh tag lain.`);
        } else {
          toast.error(`Gagal mengubah ID: ${error.message}`);
        }
        return false;
      }

      toast.success(`ID Tag berhasil diubah dari ${oldId} menjadi ${newId}`);
      fetchMetrics();
      return true;
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mengubah ID.');
      return false;
    }
  }

  // Hapus Tag dari Admin
  async function handleDeleteTag(tagId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('nfc_tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        toast.error(`Gagal menghapus tag: ${error.message}`);
        return false;
      }

      toast.success(`Tag ${tagId} berhasil dihapus.`);
      fetchMetrics();
      return true;
    } catch {
      toast.error('Terjadi kesalahan saat menghapus tag.');
      return false;
    }
  }

  const activeUnits = tags.filter((t) => t.is_active).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-slate-200 bg-white shadow-xl rounded-3xl p-2 animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md mb-3">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Admin Control Center</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Masukkan kredensial admin untuk memonitor fleet tag.</p>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Username
                </label>
                <Input
                  type="text"
                  placeholder="Username admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="Kata sandi admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer mt-2"
              >
                Masuk ke Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">NFC Fleet Management</h1>
            <span className="text-[10px] font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-full">
              Admin: jagres
            </span>
          </div>
          <p className="text-sm text-slate-500">Monitoring status aktivasi unit akrilik dan metrik interaksi tap.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="rounded-xl">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-xs font-semibold"
            title="Keluar"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Keluar
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <MetricCards totalUnits={tags.length} activeUnits={activeUnits} totalTaps={totalTaps} />

      {/* Input Tag ID Baru */}
      <Card className="border-slate-200 rounded-2xl bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pre-Generate Tag ID Fisik</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTag} className="flex gap-2">
            <Input
              placeholder="Contoh: TAG-A101"
              value={newTagId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagId(e.target.value)}
              className="max-w-xs font-mono uppercase text-sm rounded-xl"
              required
            />
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Daftarkan Tag
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabel Inventaris */}
      <TagTable
        tags={tags}
        onUpdateTagId={handleUpdateTagId}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
}
