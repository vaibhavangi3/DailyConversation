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
            String transcript) { }

    public record StatsResponse(
            int conversationCount,
            int learningMinutes,
            int topicCount,
            String topTopic,
            List<TopicStat> topics,
            List<ProviderStat> providers) { }

    public record TopicStat(String topic, int minutes, int count) { }
    public record ProviderStat(String provider, int count) { }
}
