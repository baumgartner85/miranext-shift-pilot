'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreferencesDialog } from '@/components/PreferencesDialog';
import {
    Users,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Search,
    User,
    Mail,
    Briefcase,
    MapPin,
    Eye,
    EyeOff,
    Settings2
} from 'lucide-react';

interface AplanoUser {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    email?: string;
    isInactive?: boolean;
    jobPositions?: string[];
    branches?: string[];
}

interface AplanoContract {
    id: string;
    userId: string;
    totalHours: number;
    validFrom: string;
    validTo?: string;
}

export default function EmployeesPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const { getActiveAdapter } = useSettingsStore();
    const activeAdapter = mounted ? getActiveAdapter() : null;

    const [users, setUsers] = useState<AplanoUser[]>([]);
    const [contracts, setContracts] = useState<Map<string, AplanoContract>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AplanoUser | null>(null);
    const [preferencesOpen, setPreferencesOpen] = useState(false);

    const fetchData = async () => {
        if (!activeAdapter?.apiToken) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/aplano/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiToken: activeAdapter.apiToken }),
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            setUsers(data.users || []);

            // Build contracts map
            const contractMap = new Map<string, AplanoContract>();
            (data.contracts || []).forEach((c: AplanoContract) => {
                contractMap.set(c.userId, c);
            });
            setContracts(contractMap);
        } catch (err) {
            setError('Fehler beim Laden der Mitarbeiter');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeAdapter?.isConnected) {
            fetchData();
        }
    }, [activeAdapter?.isConnected]);

    const filteredUsers = users.filter(user => {
        // Filter out deleted placeholder users (now handled by API, but keep as safety)
        const email = user.email || '';
        if (email.startsWith('deleted-')) return false;

        // Filter by active/inactive status
        if (!showInactive && user.isInactive) return false;

        // Use displayName for search, fallback to firstName/lastName
        const fullName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`;
        return fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Count only active users for the badge
    const activeCount = users.filter(u => !u.isInactive && !(u.email || '').startsWith('deleted-')).length;
    const inactiveCount = users.filter(u => u.isInactive && !(u.email || '').startsWith('deleted-')).length;
    const displayedUsers = filteredUsers;

    // Show loading skeleton before hydration
    if (!mounted) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </div>
        );
    }

    if (!activeAdapter?.isConnected) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users size={24} />
                    {t('nav.employees')}
                </h1>

                <Card className="border-amber-500/50 bg-amber-500/10">
                    <CardContent className="py-6 text-center">
                        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
                        <p className="font-medium">Keine Verbindung zu Aplano</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bitte konfigurieren Sie zuerst das Planungstool in den{' '}
                            <a href="/settings" className="text-blue-500 hover:underline">Einstellungen</a>.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users size={24} />
                    {t('nav.employees')}
                </h1>
                <Button
                    variant="outline"
                    onClick={fetchData}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                        <RefreshCw size={18} className="mr-2" />
                    )}
                    Aktualisieren
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                    placeholder="Mitarbeiter suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="py-3">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Stats and Filter */}
            <div className="flex items-center gap-4 justify-between flex-wrap">
                <div className="flex gap-3">
                    <Badge variant="outline" className="text-sm py-1 px-3">
                        {activeCount} Aktiv
                    </Badge>
                    {inactiveCount > 0 && (
                        <Badge variant="outline" className="text-sm py-1 px-3 opacity-60">
                            {inactiveCount} Inaktiv
                        </Badge>
                    )}
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowInactive(!showInactive)}
                                className={showInactive ? 'text-amber-400' : 'text-muted-foreground'}
                            >
                                {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
                                <span className="ml-2 text-sm">
                                    {showInactive ? 'Inaktive ausblenden' : 'Inaktive anzeigen'}
                                </span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{showInactive ? 'Klicken um inaktive Mitarbeiter auszublenden' : 'Klicken um inaktive Mitarbeiter anzuzeigen'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* User List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedUsers.map(user => {
                        const contract = contracts.get(user.id);
                        const status = user.isInactive ? 'inactive' : 'active';
                        return (
                            <Card key={user.id} className={`hover:border-blue-500/50 transition-colors ${user.isInactive ? 'opacity-50' : ''}`}>
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${user.isInactive ? 'bg-slate-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                            {(user.firstName?.[0] || '')}{(user.lastName?.[0] || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-lg truncate">
                                                    {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unbekannt'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge
                                                    variant={status === 'active' ? 'default' : 'secondary'}
                                                    className={status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400'}
                                                >
                                                    {status === 'active' ? 'Aktiv' : 'Inaktiv'}
                                                </Badge>
                                            </div>
                                            {user.email && (
                                                <div className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-2">
                                                    <Mail size={12} />
                                                    {user.email}
                                                </div>
                                            )}
                                            {contract && (
                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Briefcase size={12} />
                                                    {contract.totalHours}h/Woche
                                                </div>
                                            )}
                                            {user.jobPositions && user.jobPositions.length > 0 && (
                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <User size={12} />
                                                    {user.jobPositions.join(', ')}
                                                </div>
                                            )}
                                            {user.branches && user.branches.length > 0 && (
                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <MapPin size={12} />
                                                    {user.branches.join(', ')}
                                                </div>
                                            )}
                                            {/* Preferences Button */}
                                            <div className="mt-3 pt-2 border-t border-slate-700">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full text-xs"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setPreferencesOpen(true);
                                                                }}
                                                            >
                                                                <Settings2 size={14} className="mr-2" />
                                                                Dienstplanvorlieben
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Schichtpräferenzen für diesen Mitarbeiter verwalten</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Preferences Dialog */}
            {selectedUser && (
                <PreferencesDialog
                    open={preferencesOpen}
                    onOpenChange={setPreferencesOpen}
                    userId={selectedUser.id}
                    userName={selectedUser.displayName || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || 'Unbekannt'}
                />
            )}
        </div>
    );
}
