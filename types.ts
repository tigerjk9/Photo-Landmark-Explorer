
export enum LoadingStep {
  IDLE = 'IDLE',
  IDENTIFYING = 'IDENTIFYING',
  FETCHING_HISTORY = 'FETCHING_HISTORY',
  GENERATING_SPEECH = 'GENERATING_SPEECH',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export interface GroundingSource {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface LandmarkInfo {
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface TourStop {
  landmarkInfo: LandmarkInfo;
  imageUrl: string;
  imageFile: File;
  history: string;
  sources: GroundingSource[];
  base64Audio: string;
}