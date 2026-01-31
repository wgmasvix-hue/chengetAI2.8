
export enum AppView {
  OVERVIEW = 'OVERVIEW',
  TEACHING = 'TEACHING', // Pillar 1
  RESEARCH = 'RESEARCH', // Pillar 2
  COMMUNITY = 'COMMUNITY', // Pillar 3
  INnovation = 'INnovation', // Pillar 4: Heritage Digitization
  INDUSTRIALIZATION = 'INDUSTRIALIZATION', // Pillar 5: Smart Ops
  OPEN_ACCESS = 'OPEN_ACCESS', // Free Resource Hub
  DIGITAL_RESOURCES = 'DIGITAL_RESOURCES', // Unified Digital Panel
  AI_STUDIO = 'AI_STUDIO', // Librarian Tool Creator
  CATALOGUING = 'CATALOGUING',
  ASSISTANT = 'ASSISTANT',
  COLLECTION = 'COLLECTION',
  DISCOURSE = 'DISCOURSE', // Discussion Panels
  KOHA_DASHBOARD = 'KOHA_DASHBOARD', // Integrated ILS Dashboard
  TRENDING = 'TRENDING',
  STUDENT_PORTAL = 'STUDENT_PORTAL',
  SYSTEMS_ADMIN = 'SYSTEMS_ADMIN' 
}

export interface User {
  id: string;
  name: string;
  role: 'student' | 'staff';
  studentId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  timestamp: number;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface OpenResource {
  title: string;
  url: string;
  type: 'Journal' | 'eBook' | 'Database' | 'Archive';
  category: string;
  author?: string;
  year?: string;
  isZitesclic?: boolean;
  accessType?: 'Open Access' | 'Subscription';
}

export interface DigitalAsset {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: number;
  title: string;
  author: string;
  ddc: string;
  category: string;
  status: 'archived' | 'processing' | 'failed';
  preservationScore: number;
  url?: string;
  summary?: string;
  tags?: string[];
}

export interface CustomChatbot {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  category: 'Student Support' | 'Research Expert' | 'Heritage Guide' | 'Admin Logic';
  icon: string;
  version: string;
  groundedAssets: string[];
  backendUrl?: string; // Field for custom API integration
  isPublished?: boolean; // Visibility for students
}

export interface IoTModule {
  id: string;
  name: string;
  type: 'Environmental' | 'RFID Gate' | 'Occupancy' | 'Smart Shelf';
  status: 'active' | 'calibrating' | 'error';
  zone: string;
  dataStream: string;
  batteryLevel: number;
}

export interface MarcField {
  tag: string;
  ind1: string;
  ind2: string;
  subfields: Record<string, string>;
}

export interface MarcRecord {
  leader: string;
  fields: MarcField[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface DiscussionPanel {
  id: string;
  title: string;
  category: string;
  participantCount: number;
  lastActive: number;
  description: string;
}

export interface DiscussionMessage {
  id: string;
  sender: string;
  role: 'user' | 'expert' | 'model';
  content: string;
  timestamp: number;
}
