'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore, AdapterType } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Settings,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    Database,
    Bot,
    RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const {
        adapters,
        activeAdapterId,
        geminiApiKey,
        addAdapter,
        updateAdapter,
        removeAdapter,
        setActiveAdapter,
        setGeminiApiKey
    } = useSettingsStore();

    const [newAdapter, setNewAdapter] = useState({
        name: 'Aplano',
        type: 'aplano' as AdapterType,
        apiToken: '',
        baseUrl: 'https://web.aplano.de/papi/v1',
    });
    const [testingConnection, setTestingConnection] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleAddAdapter = () => {
        if (!newAdapter.apiToken) return;

        addAdapter({
            ...newAdapter,
        });

        setNewAdapter({
            name: 'Aplano',
            type: 'aplano',
            apiToken: '',
            baseUrl: 'https://web.aplano.de/papi/v1',
        });
    };

    const handleTestConnection = async (index: number) => {
        setTestingConnection(index);
        setTestResult(null);

        const adapter = adapters[index];

        try {
            const response = await fetch('/api/adapters/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: adapter.type,
                    apiToken: adapter.apiToken,
                    baseUrl: adapter.baseUrl,
                }),
            });

            const result = await response.json();
            setTestResult(result);

            updateAdapter(index, {
                isConnected: result.success,
                lastSync: result.success ? new Date().toISOString() : undefined,
                lastError: result.success ? undefined : result.message,
            });
        } catch (error) {
            setTestResult({ success: false, message: 'Verbindungsfehler' });
        } finally {
            setTestingConnection(null);
        }
    };

    if (!mounted) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
            </div>

            <Tabs defaultValue="adapters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="adapters" className="flex items-center gap-2">
                        <Database size={16} />
                        Planungstools
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Bot size={16} />
                        KI-Konfiguration
                    </TabsTrigger>
                </TabsList>

                {/* Adapter Configuration Tab */}
                <TabsContent value="adapters" className="space-y-6 mt-6">
                    {/* Existing Adapters */}
                    {adapters.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Konfigurierte Tools</h2>
                            {adapters.map((adapter, index) => (
                                <Card key={index} className={adapter.name === activeAdapterId ? 'border-blue-500' : ''}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <CardTitle className="text-lg">{adapter.name}</CardTitle>
                                                <Badge variant={adapter.isConnected ? 'default' : 'destructive'}>
                                                    {adapter.isConnected ? (
                                                        <><CheckCircle2 size={14} className="mr-1" /> Verbunden</>
                                                    ) : (
                                                        <><XCircle size={14} className="mr-1" /> Getrennt</>
                                                    )}
                                                </Badge>
                                                {adapter.name === activeAdapterId && (
                                                    <Badge variant="secondary">Aktiv</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {adapter.name !== activeAdapterId && adapter.isConnected && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setActiveAdapter(index)}
                                                    >
                                                        Aktivieren
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTestConnection(index)}
                                                    disabled={testingConnection === index}
                                                >
                                                    {testingConnection === index ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <RefreshCw size={16} />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeAdapter(index)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardDescription>
                                            {adapter.type === 'aplano' && 'Aplano Dienstplanung'}
                                            {adapter.lastSync && ` • Letzte Sync: ${new Date(adapter.lastSync).toLocaleString('de-DE')}`}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div>
                                                <Label>API Token</Label>
                                                <Input
                                                    type="password"
                                                    value={adapter.apiToken}
                                                    onChange={(e) => updateAdapter(index, { apiToken: e.target.value })}
                                                    placeholder="Bearer Token eingeben..."
                                                />
                                            </div>
                                            <div>
                                                <Label>Base URL</Label>
                                                <Input
                                                    value={adapter.baseUrl || ''}
                                                    onChange={(e) => updateAdapter(index, { baseUrl: e.target.value })}
                                                    placeholder="https://web.aplano.de/papi/v1"
                                                />
                                            </div>
                                            {adapter.lastError && (
                                                <p className="text-sm text-red-500">{adapter.lastError}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Add New Adapter */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus size={20} />
                                Neues Planungstool hinzufügen
                            </CardTitle>
                            <CardDescription>
                                Verbinden Sie Aplano oder andere Dienstplanungstools.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        value={newAdapter.name}
                                        onChange={(e) => setNewAdapter({ ...newAdapter, name: e.target.value })}
                                        placeholder="z.B. Aplano Radiologie"
                                    />
                                </div>
                                <div>
                                    <Label>Typ</Label>
                                    <select
                                        value={newAdapter.type}
                                        onChange={(e) => setNewAdapter({ ...newAdapter, type: e.target.value as AdapterType })}
                                        className="w-full h-10 px-3 rounded-md border bg-background"
                                    >
                                        <option value="aplano">Aplano</option>
                                        <option value="deputy">Deputy (Coming Soon)</option>
                                        <option value="manual">Manuell</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label>API Token</Label>
                                <Input
                                    type="password"
                                    value={newAdapter.apiToken}
                                    onChange={(e) => setNewAdapter({ ...newAdapter, apiToken: e.target.value })}
                                    placeholder="Bearer Token aus Aplano → Mein Profil → API-Zugang erstellen"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Erstellen Sie den Token in Aplano: Anmelden → Mein Profil → API-Zugang erstellen
                                </p>
                            </div>
                            <div>
                                <Label>Base URL (optional)</Label>
                                <Input
                                    value={newAdapter.baseUrl}
                                    onChange={(e) => setNewAdapter({ ...newAdapter, baseUrl: e.target.value })}
                                    placeholder="https://web.aplano.de/papi/v1"
                                />
                            </div>
                            <Button
                                onClick={handleAddAdapter}
                                disabled={!newAdapter.apiToken}
                                className="w-full"
                            >
                                <Plus size={16} className="mr-2" />
                                Tool hinzufügen
                            </Button>
                        </CardContent>
                    </Card>

                    {testResult && (
                        <Card className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-2">
                                    {testResult.success ? (
                                        <CheckCircle2 className="text-green-500" />
                                    ) : (
                                        <XCircle className="text-red-500" />
                                    )}
                                    <span>{testResult.message}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* AI Configuration Tab */}
                <TabsContent value="ai" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot size={20} />
                                Gemini AI Konfiguration
                            </CardTitle>
                            <CardDescription>
                                API-Schlüssel für die KI-gestützte Dienstplanoptimierung.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Gemini API Key</Label>
                                <Input
                                    type="password"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="AIza..."
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Erstellen Sie einen API-Key auf{' '}
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                    >
                                        Google AI Studio
                                    </a>
                                </p>
                            </div>
                            {geminiApiKey && (
                                <div className="flex items-center gap-2 text-green-500">
                                    <CheckCircle2 size={16} />
                                    <span className="text-sm">API Key konfiguriert</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
