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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
    href: string;
    icon: React.ComponentType<{ size?: number }>;
    labelKey?: string;
    label?: string;
}

interface NavSection {
    titleKey?: string;
    title?: string;
    icon?: React.ComponentType<{ size?: number }>;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        items: [
            { href: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
            { href: '/dashboard', icon: Database, label: 'Datenübersicht' },
            { href: '/planner', icon: Bot, labelKey: 'nav.planner' },
            { href: '/history', icon: History, labelKey: 'nav.history' },
            { href: '/requirements', icon: CalendarClock, labelKey: 'nav.requirements' },
            { href: '/employees', icon: Users, labelKey: 'nav.employees' },
        ],
    },
    },
{
    items: [
        { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
    ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <TooltipProvider delayDuration={0}>
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setCollapsed(!collapsed)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {collapsed ? 'Erweitern' : 'Einklappen'}
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {navSections.map((section, sIdx) => (
                        <div key={sIdx}>
                            {/* Section header */}
                            {section.titleKey && !collapsed && (
                                <div className="flex items-center gap-2 px-3 pt-4 pb-2">
                                    {section.icon && <section.icon size={14} />}
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        {t(section.titleKey as Parameters<typeof t>[0])}
                                    </span>
                                </div>
                            )}
                            {section.titleKey && collapsed && (
                                <div className="border-t border-white/10 my-2 mx-2" />
                            )}
                            {/* Items */}
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const label = item.labelKey
                                    ? t(item.labelKey as Parameters<typeof t>[0])
                                    : item.label || '';

                                const link = (
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
                                        {!collapsed && <span>{label}</span>}
                                    </Link>
                                );

                                if (collapsed) {
                                    return (
                                        <Tooltip key={item.href}>
                                            <TooltipTrigger asChild>
                                                {link}
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                {label}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return link;
                            })}
                        </div>
                    ))}
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
        </TooltipProvider>
    );
}
