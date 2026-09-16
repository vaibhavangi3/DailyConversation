package com.dailyconversation.service;

import com.dailyconversation.analysis.GoogleAiAnalyzer;
import com.dailyconversation.api.ApiModels;
import com.dailyconversation.domain.Conversation;
import com.dailyconversation.domain.ConversationAnalysis;
import com.dailyconversation.importer.ConversationLinkImporter;
import com.dailyconversation.importer.ExtractedConversation;
import com.dailyconversation.repository.ConversationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationService {
    private final ConversationLinkImporter importer;
    private final GoogleAiAnalyzer analyzer;
    private final ConversationRepository repository;

    public ConversationService(ConversationLinkImporter importer, GoogleAiAnalyzer analyzer, ConversationRepository repository) {
        this.importer = importer;
        this.analyzer = analyzer;
        this.repository = repository;
    }

    public Conversation importConversation(String url) {
        String sourceUrl = url.trim();
        ExtractedConversation extracted = importer.importLink(sourceUrl);
        GoogleAiAnalyzer.AnalysisResult analysisResult = analyzer.analyze(extracted.transcript(), extracted.provider().label());
        ConversationAnalysis analysis = analysisResult.analysis();
        Instant now = Instant.now();
        String id = repository.findBySourceUrl(sourceUrl).map(Conversation::id).orElseGet(() -> UUID.randomUUID().toString());
        Conversation conversation = new Conversation(id, extracted.provider().label(), sourceUrl,
                analysis.title(), analysis.summary(), analysis.context(), analysis.keywords(), analysis.effortScore(),
                TranscriptMetrics.estimatedTokens(extracted.transcript(), true), TranscriptMetrics.estimatedTokens(extracted.transcript(), false),
                analysis.topic(), analysis.studyMethod(), analysis.difficulty(),
                analysis.estimatedMinutes(), now, now, analysisResult.status(), analysis.keyLearnings(), analysis.concepts(),
                analysis.nextSteps(), extracted.transcript());
        repository.save(conversation);
        return repository.findById(conversation.id()).orElse(conversation);
    }

    public List<Conversation> all() { return repository.findAll(); }
    public Conversation get(String id) { return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Conversation not found.")); }

    public Conversation reanalyze(String id) {
        Conversation existing = get(id);
        GoogleAiAnalyzer.AnalysisResult result = analyzer.analyze(existing.transcript(), existing.provider());
        ConversationAnalysis analysis = result.analysis();
        Conversation updated = new Conversation(
                existing.id(), existing.provider(), existing.sourceUrl(),
                analysis.title(), analysis.summary(), analysis.context(), analysis.keywords(), analysis.effortScore(),
                TranscriptMetrics.estimatedTokens(existing.transcript(), true), TranscriptMetrics.estimatedTokens(existing.transcript(), false), analysis.topic(),
                analysis.studyMethod(), analysis.difficulty(), analysis.estimatedMinutes(),
                existing.importedAt(), Instant.now(), result.status(),
                analysis.keyLearnings(), analysis.concepts(), analysis.nextSteps(), existing.transcript());
        repository.save(updated);
        return repository.findById(id).orElse(updated);
    }

    public ApiModels.StatsResponse stats() {
        List<ApiModels.TopicStat> topics = repository.topicStats();
        int minutes = topics.stream().mapToInt(ApiModels.TopicStat::minutes).sum();
        return new ApiModels.StatsResponse(repository.findAll().size(), minutes, topics.size(),
                topics.isEmpty() ? "—" : topics.get(0).topic(), topics, repository.providerStats(), repository.dailyLearningStats());
    }

    public List<ApiModels.LeaderboardEntry> leaderboard(String sort, String provider, String topic) {
        return repository.findAll().stream()
                .filter(item -> provider == null || provider.isBlank() || provider.equalsIgnoreCase(item.provider()))
                .filter(item -> topic == null || topic.isBlank() || topic.equalsIgnoreCase(item.topic()))
                .map(item -> new ApiModels.LeaderboardEntry(item.id(), item.title(), item.provider(), item.topic(), item.importedAt(),
                        item.estimatedMinutes(), item.inputTokens(), item.outputTokens(), item.effortScore()))
                .sorted((a, b) -> switch (sort == null ? "time" : sort.toLowerCase()) {
                    case "latest" -> b.importedAt().compareTo(a.importedAt());
                    case "input_tokens" -> Integer.compare(b.inputTokens(), a.inputTokens());
                    case "output_tokens" -> Integer.compare(b.outputTokens(), a.outputTokens());
                    case "effort" -> Integer.compare(b.effortScore(), a.effortScore());
                    default -> Integer.compare(b.estimatedMinutes(), a.estimatedMinutes());
                })
                .toList();
    }

    public void delete(String id) {
        get(id);
        repository.deleteById(id);
    }
}
