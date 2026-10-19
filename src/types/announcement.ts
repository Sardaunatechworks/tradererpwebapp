export type AnnouncementSeverity = 'info' | 'important' | 'maintenance';
export type AnnouncementStatus = 'draft' | 'published' | 'scheduled' | 'expired' | 'archived';
export type AnnouncementAudience = 'all' | 'owners' | 'staff';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  severity: AnnouncementSeverity;
  status: AnnouncementStatus;
  target_audience: AnnouncementAudience;
  starts_at: string;
  expires_at: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  severity: AnnouncementSeverity;
  status: AnnouncementStatus;
  target_audience: AnnouncementAudience;
  starts_at: string;
  expires_at?: string | null;
}
