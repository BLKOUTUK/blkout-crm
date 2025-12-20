import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function getDaysUntil(date: string | Date): number {
  const now = new Date()
  const then = new Date(date)
  const diffMs = then.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Organization type labels
export const orgTypeLabels: Record<string, string> = {
  grassroots_community: 'Grassroots & Community',
  policy_advocacy: 'Policy & Advocacy',
  government_public_sector: 'Government',
  international_ngo: 'International NGO',
  funder_foundation: 'Funder/Foundation',
  academic_research: 'Academic & Research',
  healthcare_provider: 'Healthcare',
  media_cultural: 'Media & Cultural',
  corporate: 'Corporate',
  other: 'Other',
}

// Organization type icons
export const orgTypeIcons: Record<string, string> = {
  grassroots_community: '🌱',
  policy_advocacy: '📣',
  government_public_sector: '🏛',
  international_ngo: '🌍',
  funder_foundation: '💰',
  academic_research: '🎓',
  healthcare_provider: '🏥',
  media_cultural: '📺',
  corporate: '🏢',
  other: '📋',
}

// Relationship type labels
export const relationshipLabels: Record<string, string> = {
  coalition_member: 'Coalition Member',
  strategic_partner: 'Strategic Partner',
  funder: 'Funder',
  policy_ally: 'Policy Ally',
  service_partner: 'Service Partner',
  research_collaborator: 'Research Collaborator',
  media_partner: 'Media Partner',
  sponsor: 'Sponsor',
  prospect: 'Prospect',
  dormant: 'Dormant',
  former: 'Former',
}

// Grant stage labels
export const grantStageLabels: Record<string, string> = {
  research: 'Research',
  preparing: 'Preparing',
  submitted: 'Submitted',
  under_review: 'Under Review',
  interview: 'Interview',
  decision_pending: 'Decision Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  active: 'Active',
  reporting: 'Reporting',
  completed: 'Completed',
}

// Grant stage colors
export const grantStageColors: Record<string, string> = {
  research: 'bg-gray-100 text-gray-800',
  preparing: 'bg-blue-100 text-blue-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  under_review: 'bg-purple-100 text-purple-800',
  interview: 'bg-pink-100 text-pink-800',
  decision_pending: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-500',
  active: 'bg-emerald-100 text-emerald-800',
  reporting: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-teal-100 text-teal-800',
}

// Priority colors
export const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

// Status colors
export const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-500',
  developing: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-orange-100 text-orange-800',
  ended: 'bg-red-100 text-red-800',
}
