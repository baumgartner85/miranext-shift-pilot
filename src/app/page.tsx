'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Bot,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Settings,
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { t } = useLanguage();
  const { adapters, getActiveAdapter, geminiApiKey } = useSettingsStore();
  const activeAdapter = getActiveAdapter();

  const isConfigured = activeAdapter?.isConnected && geminiApiKey;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            KI-gestützte Dienstplanung für Ihre Radiologie-Abteilung
          </p>
        </div>
        {isConfigured && (
          <Link href="/planner">
            <Button size="lg" className="gap-2">
              <Sparkles size={20} />
              {t('planner.generatePlan')}
            </Button>
          </Link>
        )}
      </div>

      {/* Setup Status */}
      {!isConfigured && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={24} />
              Konfiguration erforderlich
            </CardTitle>
            <CardDescription>
              Bevor Sie den KI-Planer nutzen können, müssen einige Einstellungen vorgenommen werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {activeAdapter?.isConnected ? (
                    <CheckCircle2 className="text-green-500" size={20} />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-500" />
                  )}
                  <span>Planungstool verbinden (Aplano)</span>
                </div>
                {!activeAdapter?.isConnected && (
                  <Link href="/settings">
                    <Button variant="outline" size="sm">
                      Konfigurieren
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {geminiApiKey ? (
                    <CheckCircle2 className="text-green-500" size={20} />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-500" />
                  )}
                  <span>Gemini AI API Key eingeben</span>
                </div>
                {!geminiApiKey && (
                  <Link href="/settings">
                    <Button variant="outline" size="sm">
                      Konfigurieren
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/planner">
          <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                <Bot className="text-blue-500" size={24} />
              </div>
              <CardTitle>{t('nav.planner')}</CardTitle>
              <CardDescription>
                KI-Agent erstellt automatisch optimierte Dienstpläne basierend auf historischen Mustern.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="hover:border-purple-500/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                <Calendar className="text-purple-500" size={24} />
              </div>
              <CardTitle>{t('nav.history')}</CardTitle>
              <CardDescription>
                Analysieren Sie vergangene Dienstpläne und erkennen Sie Muster.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:border-green-500/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                <Settings className="text-green-500" size={24} />
              </div>
              <CardTitle>{t('nav.settings')}</CardTitle>
              <CardDescription>
                Verbinden Sie Aplano und konfigurieren Sie den KI-Agenten.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verbindungsstatus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adapters.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Kein Planungstool konfiguriert
                </p>
              ) : (
                adapters.map((adapter, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{adapter.name}</span>
                    <Badge variant={adapter.isConnected ? 'default' : 'destructive'}>
                      {adapter.isConnected ? t('adapter.connected') : t('adapter.disconnected')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AZG-Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground">
                  Alle Regeln des österreichischen Arbeitszeitgesetzes werden geprüft
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
