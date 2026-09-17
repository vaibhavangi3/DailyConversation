export interface ConversationResponse {
  id: string;
  provider: string;
  sourceUrl: string;
  title: string;
  summary: string;
  context: string;
  keywords: string[];
  effortScore: number;
  inputTokens: number;
  outputTokens: number;
  topic: string;
  studyMethod: string;
  difficulty: string;
  estimatedMinutes: number;
  importedAt: string;
  analyzedAt: string | null;
  analysisStatus: string;
  keyLearnings: string[];
  concepts: string[];
  nextSteps: string[];
  transcript: string;
}

export interface TopicStat {
  topic: string;
  minutes: number;
  count: number;
}

export interface ProviderStat {
  provider: string;
  count: number;
}

export interface DailyLearningStat {
  date: string;
  minutes: number;
  count: number;
}

export interface StatsResponse {
  conversationCount: number;
  learningMinutes: number;
  topicCount: number;
  topTopic: string;
  topics: TopicStat[];
  providers: ProviderStat[];
  dailyLearning: DailyLearningStat[];
}

export interface LeaderboardEntry {
  id: string;
  title: string;
  provider: string;
  topic: string;
  importedAt: string;
  estimatedMinutes: number;
  inputTokens: number;
  outputTokens: number;
  effortScore: number;
}

export interface ImportRequest {
  url: string;
}
