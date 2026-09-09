package com.dailyconversation.domain;

import java.time.Instant;
import java.util.List;

public record Conversation(
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
