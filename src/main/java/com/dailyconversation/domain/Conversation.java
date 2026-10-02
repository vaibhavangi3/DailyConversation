package com.dailyconversation.domain;

import java.time.Instant;
import java.util.List;

public record Conversation(
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
