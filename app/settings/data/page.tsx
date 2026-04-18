'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download,
  FileJson,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/supabase/client';
import type { DataExport, DataExportInsert } from '@/types/database';

export default function DataPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    companions: 0,
    messages: 0,
    memories: 0,
    conversations: 0,
  });
  const supabase = getClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load previous exports
      const { data: exportsData } = await supabase
        .from('data_exports')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(5);

      if (exportsData) {
        setExports(exportsData as DataExport[]);
      }

      // Load stats
      const [companionsRes, messagesRes, memoriesRes, conversationsRes] = await Promise.all([
        supabase.from('companions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('companion_memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        companions: companionsRes.count || 0,
        messages: messagesRes.count || 0,
        memories: memoriesRes.count || 0,
        conversations: conversationsRes.count || 0,
      });

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestExport = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create export request
      const { data, error } = await supabase
        .from('data_exports')
        .insert({
          user_id: user.id,
          status: 'pending',
        } satisfies DataExportInsert)
        .select()
        .single();

      if (error) throw error;

      toast.success('Export requested! We\'ll notify you when it\'s ready.');
      
      // Refresh exports list
      setExports(prev => [data as DataExport, ...prev]);

    } catch (error) {
      console.error('Failed to request export:', error);
      toast.error('Failed to request export');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
          <CardDescription>
            Overview of all data stored in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Companions', value: stats.companions, icon: '🧑‍🤝‍🧑' },
              { label: 'Messages', value: stats.messages.toLocaleString(), icon: '💬' },
              { label: 'Memories', value: stats.memories.toLocaleString(), icon: '🧠' },
              { label: 'Conversations', value: stats.conversations, icon: '📝' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your data in JSON format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileJson className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Full Data Export</p>
                <p className="text-sm text-muted-foreground">
                  Includes companions, conversations, memories, and settings
                </p>
              </div>
            </div>
            <Button onClick={requestExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Request Export
                </>
              )}
            </Button>
          </div>

          {/* Previous Exports */}
          {exports.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Previous Exports</h4>
              {exports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(exp.status)}
                    <div>
                      <p className="text-sm font-medium capitalize">{exp.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(exp.requested_at)}
                      </p>
                    </div>
                  </div>
                  {exp.status === 'completed' && exp.file_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={exp.file_url} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Data Retention</CardTitle>
          <CardDescription>
            How long we keep your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              Messages and conversations are kept indefinitely while your account is active
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              Exported data files are available for 7 days after creation
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              Deleted accounts are permanently erased within 30 days
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
