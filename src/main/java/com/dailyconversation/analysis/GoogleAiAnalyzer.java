package com.dailyconversation.analysis;

import com.dailyconversation.domain.ConversationAnalysis;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Service
public class GoogleAiAnalyzer {
    private static final Logger log = LoggerFactory.getLogger(GoogleAiAnalyzer.class);
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final String apiKey;
    private final String model;
    private final String baseUrl;

    public GoogleAiAnalyzer(ObjectMapper objectMapper,
                            @Value("${google.ai.api-key}") String apiKey,
                            @Value("${google.ai.model}") String model,
                            @Value("${google.ai.base-url}") String baseUrl) {
        this.objectMapper = objectMapper;
        // Strip accidental surrounding quotes (e.g. key="AIza..." in .properties)
        this.apiKey = apiKey == null ? "" : apiKey.trim().replaceAll("^\"|\"$", "");
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public AnalysisResult analyze(String transcript, String provider) {
        if (apiKey == null || apiKey.isBlank()) {
            return new AnalysisResult(ConversationAnalysis.fallback(transcript, provider, true), "FALLBACK_NO_API_KEY");
        }
        String prompt = """
                You are a conversation optimization analyst. Analyze this AI chat transcript and return ONLY valid JSON.
                Schema: {"title":"string","topic":"string","summary":"string","context":"string","keywords":["string"],"effortScore":number,"keyLearnings":["string"],"concepts":["string"],"studyMethod":"string","estimatedMinutes":number,"difficulty":"Beginner|Intermediate|Advanced","nextSteps":["string"],"missingContext":["string"],"frictionPoints":["string"],"userCorrections":["string"],"clarificationPoints":["string"],"betterFirstPrompt":"string"}
                The context must be a clear summary of no more than 100 words. Return 4 to 8 concise keywords. Identify the user's goal, compare the earliest meaningful request with requirements revealed later, detect genuine corrections/clarifications and avoidable back-and-forth, and write a better first prompt using only details actually revealed later. Never invent requirements. Do not confuse normal conversational refinement with avoidable friction.
                Score effortScore from 0 to 100 using only observable user effort: depth of questions, meaningful follow-ups, attempts, corrections, reflection, and application. Do not infer intelligence, motivation, identity, or worth. If evidence is limited, use a middle score and say so in context.
                Infer estimatedMinutes from the depth and length of the exchange. Keep other arrays concise (3 to 6 items).
                Do not include markdown fences or extra keys. Provider: %s
                Transcript:
                %s
                """.formatted(provider, transcript.length() > 100_000 ? transcript.substring(0, 100_000) : transcript);
        try {
            String body = objectMapper.writeValueAsString(new Request(
                    List.of(new Content(List.of(new Part(prompt)))), new GenerationConfig("application/json")));
            URI endpoint = URI.create(baseUrl + "/models/" + model + ":generateContent");
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.error("Google AI returned HTTP {}: {}", response.statusCode(), response.body());
                throw new IllegalArgumentException("Google AI returned HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode partsNode = root.path("candidates").path(0).path("content").path("parts");
            String text = "";
            if (partsNode.isArray()) {
                for (JsonNode part : partsNode) {
                    if (part.has("text") && !part.path("thought").asBoolean(false)) {
                        text = part.get("text").asText();
                        if (!text.isBlank()) break;
                    }
                }
            }
            if (text.isBlank()) {
                text = partsNode.path(0).path("text").asText();
            }
            if (text.isBlank()) throw new IllegalArgumentException("Google AI returned no text");
            String json = text.replaceFirst("^```json\\s*", "").replaceFirst("\\s*```$", "").trim();
            ConversationAnalysis parsed = objectMapper.readValue(json, ConversationAnalysis.class);
            return new AnalysisResult(withSafeEffort(parsed, transcript), "ANALYZED");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("Google AI analysis was interrupted; saving a fallback summary");
            return new AnalysisResult(ConversationAnalysis.fallback(transcript, provider), "FALLBACK_AI_ERROR");
        } catch (IOException | RuntimeException exception) {
            log.warn("Google AI analysis failed: {}; saving a fallback summary", exception.getMessage());
            return new AnalysisResult(ConversationAnalysis.fallback(transcript, provider), "FALLBACK_AI_ERROR");
        }
    }

    public record AnalysisResult(ConversationAnalysis analysis, String status) { }

    private ConversationAnalysis withSafeEffort(ConversationAnalysis analysis, String transcript) {
        if (analysis.effortScore() > 0) {
            return new ConversationAnalysis(analysis.title(), analysis.topic(), analysis.summary(), analysis.context(),
                    analysis.keywords(), Math.min(100, analysis.effortScore()), analysis.keyLearnings(), analysis.concepts(),
                    analysis.studyMethod(), analysis.estimatedMinutes(), analysis.difficulty(), analysis.nextSteps(), safe(analysis.missingContext()), safe(analysis.frictionPoints()), safe(analysis.userCorrections()), safe(analysis.clarificationPoints()), analysis.betterFirstPrompt() == null ? "" : analysis.betterFirstPrompt());
        }
        int userTurns = 0;
        int userWords = 0;
        for (String line : transcript.split("\\R")) {
            if (line.trim().toLowerCase().startsWith("user:") || line.trim().toLowerCase().startsWith("human:")) {
                userTurns++;
                userWords += line.trim().split("\\s+").length - 1;
            }
        }
        int score = Math.min(95, Math.max(10, 10 + userTurns * 8 + Math.min(35, userWords / 8)));
        return new ConversationAnalysis(analysis.title(), analysis.topic(), analysis.summary(), analysis.context(),
                analysis.keywords(), score, analysis.keyLearnings(), analysis.concepts(), analysis.studyMethod(),
                analysis.estimatedMinutes(), analysis.difficulty(), analysis.nextSteps());
    }

    private List<String> safe(List<String> value) { return value == null ? List.of() : value; }

    private record Request(List<Content> contents, GenerationConfig generationConfig) { }
    private record Content(List<Part> parts) { }
    private record Part(String text) { }
    private record GenerationConfig(String responseMimeType) { }
}
