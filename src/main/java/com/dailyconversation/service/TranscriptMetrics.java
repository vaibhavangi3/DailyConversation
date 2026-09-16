package com.dailyconversation.service;

import java.util.Locale;

public final class TranscriptMetrics {
    private TranscriptMetrics() { }

    public static int estimatedTokens(String transcript, boolean userMessages) {
        int words = 0;
        for (String line : transcript.split("\\R")) {
            String normalized = line.trim().toLowerCase(Locale.ROOT);
            boolean user = normalized.startsWith("user:") || normalized.startsWith("human:");
            boolean assistant = normalized.startsWith("assistant:") || normalized.startsWith("model:");
            if ((userMessages && user) || (!userMessages && assistant)) {
                String content = line.substring(line.indexOf(':') + 1).trim();
                if (!content.isBlank()) words += content.split("\\s+").length;
            }
        }
        return words == 0 ? 0 : Math.max(1, Math.round(words * 1.3f));
    }
}
