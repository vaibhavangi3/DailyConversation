package com.dailyconversation.api;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class ApiModels {
    private ApiModels() { }

    public record ImportRequest(@NotBlank String url) { }

    public record ConversationResponse(
            String id,
            String provider,
            String sourceUrl,
            String title,
            String summary,
            String context,
            List<String> keywords,
            int effortScore,
            int inputTokens,
            int outputTokens,
            String topic,
            String studyMethod,
            String difficulty,
            int estimatedMinutes,
            Instant importedAt,
            Instant analyzedAt,
            String analysisStatus,
            List<String> keyLearnings,
            List<String> concepts,
            List<String> nextSteps,
            List<String> missingContext,
            List<String> frictionPoints,
            List<String> userCorrections,
            List<String> clarificationPoints,
            String betterFirstPrompt,
            String transcript) { }

    public record StatsResponse(
            int conversationCount,
            int learningMinutes,
            int topicCount,
            String topTopic,
            List<TopicStat> topics,
            List<ProviderStat> providers,
            List<DailyLearningStat> dailyLearning) { }

    public record TopicStat(String topic, int minutes, int count) { }
    public record ProviderStat(String provider, int count) { }
    public record DailyLearningStat(String date, int minutes, int count) { }
    public record LeaderboardEntry(String id, String title, String provider, String topic, Instant importedAt,
                                   int estimatedMinutes, int inputTokens, int outputTokens, int effortScore) { }
}
