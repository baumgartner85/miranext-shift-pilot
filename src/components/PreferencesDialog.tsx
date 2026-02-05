'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreferencesStore, ShiftPreference, ShiftType, getDayName, getShiftTypeName } from '@/domain/preferences-store';
import { Plus, X, Home, Sun, Moon, Clock, MapPin, Edit2, Check, Trash2 } from 'lucide-react';

interface PreferencesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    userName: string;
    branches?: { id: string; name: string }[];
    jobPositions?: { id: string; name: string }[];
}

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mo-So
const DAY_ABBREV = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const SHIFT_TYPES: { type: ShiftType; icon: any; color: string }[] = [
    { type: 'early', icon: Sun, color: 'text-yellow-500' },
    { type: 'late', icon: Clock, color: 'text-orange-500' },
    { type: 'night', icon: Moon, color: 'text-blue-500' },
    { type: 'homeoffice', icon: Home, color: 'text-green-500' },
];

export function PreferencesDialog({
    open,
    onOpenChange,
    userId,
    userName,
    branches = [],
    jobPositions = [],
}: PreferencesDialogProps) {
    const { getPreferences, addPreference, removePreference } = usePreferencesStore();
    const preferences = getPreferences(userId);

    const [editingDay, setEditingDay] = useState<number | null>(null);
    const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>('any');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [note, setNote] = useState('');

    // Group preferences by day
    const prefsByDay = useMemo(() => {
        const map = new Map<number, ShiftPreference[]>();
        DAYS.forEach(d => map.set(d, []));
        preferences.forEach(p => {
            const existing = map.get(p.dayOfWeek) || [];
            existing.push(p);
            map.set(p.dayOfWeek, existing);
        });
        return map;
    }, [preferences]);

    const handleAddPreference = () => {
        if (editingDay === null) return;

        addPreference(userId, {
            dayOfWeek: editingDay,
            shiftType: selectedShiftType,
            branchId: selectedBranch || undefined,
            note: note || undefined,
        });

        // Reset form
        setEditingDay(null);
        setSelectedShiftType('any');
        setSelectedBranch('');
        setNote('');
    };

    const handleRemove = (prefId: string) => {
        removePreference(userId, prefId);
    };

    const getShiftIcon = (type: ShiftType) => {
        const shift = SHIFT_TYPES.find(s => s.type === type);
        if (!shift) return null;
        const Icon = shift.icon;
        return <Icon size={14} className={shift.color} />;
    };

    const getBranchName = (branchId?: string) => {
        if (!branchId) return null;
        return branches.find(b => b.id === branchId)?.name || branchId;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Dienstplanvorlieben - {userName}
                    </DialogTitle>
                </DialogHeader>

                {/* Weekly Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {DAYS.map(day => (
                                    <th
                                        key={day}
                                        className="p-2 text-center text-sm font-semibold border-b border-border min-w-[100px]"
                                    >
                                        {getDayName(day, 'de')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {DAYS.map(day => (
                                    <td
                                        key={day}
                                        className="p-2 border-b border-border align-top min-h-[120px]"
                                    >
                                        <div className="space-y-2">
                                            {/* Existing preferences for this day */}
                                            {prefsByDay.get(day)?.map(pref => (
                                                <div
                                                    key={pref.id}
                                                    className="group flex items-start gap-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            {pref.shiftType && getShiftIcon(pref.shiftType)}
                                                            <span className="font-medium">
                                                                {pref.shiftType ? getShiftTypeName(pref.shiftType, 'de') : 'Beliebig'}
                                                            </span>
                                                        </div>
                                                        {pref.branchId && (
                                                            <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                                                <MapPin size={10} />
                                                                {getBranchName(pref.branchId)}
                                                            </div>
                                                        )}
                                                        {pref.note && (
                                                            <div className="text-muted-foreground mt-1 truncate">
                                                                {pref.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    onClick={() => handleRemove(pref.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Löschen</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            ))}

                                            {/* Add button or form for this day */}
                                            {editingDay === day ? (
                                                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
                                                    {/* Shift Type Selection */}
                                                    <div className="flex gap-1 flex-wrap">
                                                        {SHIFT_TYPES.map(({ type, icon: Icon, color }) => (
                                                            <button
                                                                key={type}
                                                                onClick={() => setSelectedShiftType(type)}
                                                                className={`p-1.5 rounded ${selectedShiftType === type
                                                                        ? 'bg-blue-500/30 ring-1 ring-blue-500'
                                                                        : 'bg-slate-700/50 hover:bg-slate-700'
                                                                    }`}
                                                            >
                                                                <Icon size={14} className={color} />
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Branch Selection */}
                                                    {branches.length > 0 && (
                                                        <select
                                                            value={selectedBranch}
                                                            onChange={e => setSelectedBranch(e.target.value)}
                                                            className="w-full text-xs p-1 rounded bg-slate-800 border border-slate-600"
                                                        >
                                                            <option value="">Kein Standort</option>
                                                            {branches.map(b => (
                                                                <option key={b.id} value={b.id}>
                                                                    {b.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* Note */}
                                                    <Input
                                                        placeholder="Notiz..."
                                                        value={note}
                                                        onChange={e => setNote(e.target.value)}
                                                        className="h-7 text-xs"
                                                    />

                                                    {/* Actions */}
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 h-7 text-xs"
                                                            onClick={handleAddPreference}
                                                        >
                                                            <Check size={12} className="mr-1" />
                                                            Speichern
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs"
                                                            onClick={() => setEditingDay(null)}
                                                        >
                                                            <X size={12} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingDay(day)}
                                                    className="w-full p-2 rounded-lg border border-dashed border-slate-600 text-muted-foreground hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-1 text-xs"
                                                >
                                                    <Plus size={12} />
                                                    Hinzufügen
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <DialogFooter>
                    <div className="text-xs text-muted-foreground">
                        {preferences.length} Vorlieben gespeichert
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Schließen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
