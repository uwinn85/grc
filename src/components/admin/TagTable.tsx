import React, { useState } from 'react';
import type { NfcTagEntity } from '@/types/nfc';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TagTableProps {
  tags: NfcTagEntity[];
  onUpdateTagId: (oldId: string, newId: string) => Promise<boolean>;
  onDeleteTag: (tagId: string) => Promise<boolean>;
}

export function TagTable({ tags, onUpdateTagId, onDeleteTag }: TagTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newIdVal, setNewIdVal] = useState<string>('');
  const [savingId, setSavingId] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (id: string) => {
    setEditingId(id);
    setNewIdVal(id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewIdVal('');
  };

  const saveEdit = async (oldId: string) => {
    const formatted = newIdVal.trim().toUpperCase();
    if (!formatted || formatted === oldId) {
      cancelEdit();
      return;
    }
    setSavingId(true);
    const ok = await onUpdateTagId(oldId, formatted);
    setSavingId(false);
    if (ok) {
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Yakin ingin menghapus permanen Tag ID "${id}" dari database?`)) {
      return;
    }
    setDeletingId(id);
    await onDeleteTag(id);
    setDeletingId(null);
  };

  return (
    <Card className="border-slate-200 overflow-hidden rounded-2xl bg-white shadow-xs">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-48 font-semibold">ID Tag</TableHead>
            <TableHead className="font-semibold">Tipe Produk</TableHead>
            <TableHead className="font-semibold">Nama Bisnis</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-center font-semibold">Total Tap</TableHead>
            <TableHead className="text-right font-semibold">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                Belum ada tag yang terdaftar. Gunakan form di atas untuk mendaftarkan tag baru.
              </TableCell>
            </TableRow>
          ) : (
            tags.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-semibold text-xs">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={newIdVal}
                        onChange={(e) => setNewIdVal(e.target.value)}
                        className="h-8 w-28 text-xs font-mono uppercase bg-white border-blue-400 focus-visible:ring-blue-500"
                        autoFocus
                        disabled={savingId}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveEdit(item.id)}
                        disabled={savingId}
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Simpan ID"
                      >
                        {savingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={savingId}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="Batal"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                        {item.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                        title="Edit Tag ID"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={item.type === 'DIRECT_REVIEW' ? 'default' : 'secondary'} className="text-[10px]">
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm text-slate-800">{item.business_name || '-'}</TableCell>
                <TableCell>
                  {item.is_active ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px]">
                      Unclaimed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center font-semibold text-slate-900">
                  {item.total_taps || 0}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={`/manage/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 transition-colors shadow-xs"
                    >
                      Buka CMS
                    </a>
                    <a
                      href={`/t/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-black p-1 hover:underline mr-1"
                    >
                      Meja <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Hapus Tag Permanen"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
