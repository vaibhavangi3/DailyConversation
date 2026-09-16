package com.dailyconversation.domain;

import java.util.List;

public record ConversationAnalysis(
        String title,
        String topic,
        String summary,
        String context,
        List<String> keywords,
        int effortScore,
        List<String> keyLearnings,
        List<String> concepts,
        String studyMethod,
        int estimatedMinutes,
        String difficulty,
        List<String> nextSteps) {
    public static ConversationAnalysis fallback(String transcript, String provider) {
        return fallback(transcript, provider, false);
    }

    public static ConversationAnalysis fallback(String transcript, String provider, boolean noApiKey) {
        int words = transcript.trim().isEmpty() ? 0 : transcript.trim().split("\\s+").length;
        int minutes = Math.max(5, Math.min(180, Math.round(words / 160f) + 5));
        String firstLine = transcript.lines().map(String::trim).filter(line -> !line.isBlank()).findFirst()
                .orElse("Learning session from " + provider);
        String title = firstLine.length() > 72 ? firstLine.substring(0, 69) + "..." : firstLine;
        String summary = noApiKey
                ? "Imported from " + provider + ". Add a Google AI key to generate a richer learning summary."
                : "Imported from " + provider + ". AI analysis unavailable — re-analyse to try again.";
        return new ConversationAnalysis(
                title,
                "Uncategorised",
                summary,
                "The imported conversation is available for review, but a richer context analysis could not be generated.",
                List.of("learning", "conversation"),
                Math.min(100, Math.max(0, Math.round(Math.min(100, words / 8f)))),
                List.of("Review the imported conversation and capture the main idea."),
                List.of("Imported conversation"),
                "Guided conversation",
                minutes,
                "Medium",
                List.of("Write one question you can now answer without assistance."));
    }
}
