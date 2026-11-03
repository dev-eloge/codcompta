import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    isSuperAdmin: boolean;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface Flash {
    success?: string | null;
    warning?: string | null;
}

export type GoalMetric = 'profit' | 'revenue';

export type GoalStatus = 'upcoming' | 'in_progress' | 'reached' | 'missed';

export interface GoalProgress {
    id: number;
    title: string;
    metric: GoalMetric;
    target: number;
    from: string;
    to: string;
    label: string;
    days: number;
    days_elapsed: number;
    days_left: number;
    achieved: number;
    percent: number;
    remaining: number;
    expected_percent: number;
    pace: 'on_track' | 'behind' | null;
    per_day_target: number;
    per_day_needed: number;
    status: GoalStatus;
}

export interface SharedData {
    name: string;
    flash?: Flash;
    quote: { message: string; author: string };
    auth: Auth;
    impersonation?: { merchant: string } | null;
    goals?: GoalProgress[];
    push?: { publicKey: string | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
