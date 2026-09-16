package com.dailyconversation.api;

import com.dailyconversation.domain.Conversation;
import com.dailyconversation.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ConversationController {
    private final ConversationService service;

    public ConversationController(ConversationService service) { this.service = service; }

    @GetMapping("/conversations")
    public List<ApiModels.ConversationResponse> conversations() { return service.all().stream().map(this::response).toList(); }

    @GetMapping("/conversations/{id}")
    public ApiModels.ConversationResponse conversation(@PathVariable String id) { return response(service.get(id)); }

    @PostMapping("/conversations/import")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiModels.ConversationResponse importConversation(@Valid @RequestBody ApiModels.ImportRequest request) {
        return response(service.importConversation(request.url()));
    }

    @PostMapping("/conversations/{id}/reanalyze")
    public ApiModels.ConversationResponse reanalyze(@PathVariable String id) {
        return response(service.reanalyze(id));
    }

    @GetMapping("/stats")
    public ApiModels.StatsResponse stats() { return service.stats(); }

    @GetMapping("/leaderboard")
    public List<ApiModels.LeaderboardEntry> leaderboard(
            @RequestParam(defaultValue = "time") String sort,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) String topic) {
        return service.leaderboard(sort, provider, topic);
    }

    @DeleteMapping("/conversations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    private ApiModels.ConversationResponse response(Conversation conversation) {
        return new ApiModels.ConversationResponse(conversation.id(), conversation.provider(), conversation.sourceUrl(),
                conversation.title(), conversation.summary(), conversation.context(), conversation.keywords(), conversation.effortScore(), conversation.inputTokens(), conversation.outputTokens(),
                conversation.topic(), conversation.studyMethod(),
                conversation.difficulty(), conversation.estimatedMinutes(), conversation.importedAt(), conversation.analyzedAt(),
                conversation.analysisStatus(), conversation.keyLearnings(), conversation.concepts(), conversation.nextSteps(),
                conversation.transcript());
    }
}
