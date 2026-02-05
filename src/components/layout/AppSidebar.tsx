'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Bot,
    History,
    Users,
    Settings,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';

const navItems = [
    { href: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' as const },
    { href: '/dashboard', icon: Database, label: 'Datenübersicht' },
    { href: '/planner', icon: Bot, labelKey: 'nav.planner' as const },
    { href: '/history', icon: History, labelKey: 'nav.history' as const },
    { href: '/requirements', icon: CalendarClock, labelKey: 'nav.requirements' as const },
    { href: '/employees', icon: Users, labelKey: 'nav.employees' as const },
    { href: '/settings', icon: Settings, labelKey: 'nav.settings' as const },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "h-screen bg-[#0f172a] border-r border-white/10 flex flex-col transition-all duration-200",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">MS</span>
                        </div>
                        <span className="text-white font-semibold">MiraShift</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.labelKey ? t(item.labelKey) : item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
                {!collapsed && (
                    <p className="text-xs text-slate-500">
                        MiraShift AI Planner v1.0
                    </p>
                )}
            </div>
        </aside>
    );
}
