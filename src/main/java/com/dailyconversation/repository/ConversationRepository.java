package com.dailyconversation.repository;

import com.dailyconversation.api.ApiModels;
import com.dailyconversation.domain.Conversation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class ConversationRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ConversationRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(Conversation conversation) {
        jdbc.update("""
                INSERT INTO conversations (id, provider, source_url, title, summary, topic, study_method, difficulty,
                estimated_minutes, imported_at, analyzed_at, analysis_status, key_learnings_json, concepts_json,
                next_steps_json, transcript) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_url) DO UPDATE SET title=excluded.title, summary=excluded.summary, topic=excluded.topic,
                study_method=excluded.study_method, difficulty=excluded.difficulty, estimated_minutes=excluded.estimated_minutes,
                analyzed_at=excluded.analyzed_at, analysis_status=excluded.analysis_status,
                key_learnings_json=excluded.key_learnings_json, concepts_json=excluded.concepts_json,
                next_steps_json=excluded.next_steps_json, transcript=excluded.transcript
                """,
                conversation.id(), conversation.provider(), conversation.sourceUrl(), conversation.title(), conversation.summary(),
                conversation.topic(), conversation.studyMethod(), conversation.difficulty(), conversation.estimatedMinutes(),
                conversation.importedAt().toString(), conversation.analyzedAt() == null ? null : conversation.analyzedAt().toString(),
                conversation.analysisStatus(), json(conversation.keyLearnings()), json(conversation.concepts()),
                json(conversation.nextSteps()), conversation.transcript());
    }

    public List<Conversation> findAll() {
        return jdbc.query("SELECT * FROM conversations ORDER BY imported_at DESC", this::map);
    }

    public Optional<Conversation> findById(String id) {
        return jdbc.query("SELECT * FROM conversations WHERE id = ?", this::map, id).stream().findFirst();
    }

    public Optional<Conversation> findBySourceUrl(String sourceUrl) {
        return jdbc.query("SELECT * FROM conversations WHERE source_url = ?", this::map, sourceUrl).stream().findFirst();
    }

    public List<ApiModels.TopicStat> topicStats() {
        return jdbc.query("SELECT topic, SUM(estimated_minutes) minutes, COUNT(*) count FROM conversations GROUP BY topic ORDER BY minutes DESC",
                (rs, rowNum) -> new ApiModels.TopicStat(rs.getString("topic"), rs.getInt("minutes"), rs.getInt("count")));
    }

    public List<ApiModels.ProviderStat> providerStats() {
        return jdbc.query("SELECT provider, COUNT(*) count FROM conversations GROUP BY provider ORDER BY count DESC",
                (rs, rowNum) -> new ApiModels.ProviderStat(rs.getString("provider"), rs.getInt("count")));
    }

    private Conversation map(ResultSet rs, int rowNum) throws SQLException {
        return new Conversation(rs.getString("id"), rs.getString("provider"), rs.getString("source_url"),
                rs.getString("title"), rs.getString("summary"), rs.getString("topic"), rs.getString("study_method"),
                rs.getString("difficulty"), rs.getInt("estimated_minutes"), Instant.parse(rs.getString("imported_at")),
                rs.getString("analyzed_at") == null ? null : Instant.parse(rs.getString("analyzed_at")),
                rs.getString("analysis_status"), readList(rs.getString("key_learnings_json")),
                readList(rs.getString("concepts_json")), readList(rs.getString("next_steps_json")), rs.getString("transcript"));
    }

    private String json(List<String> values) {
        try { return objectMapper.writeValueAsString(values); }
        catch (Exception exception) { throw new IllegalStateException("Could not serialize analysis", exception); }
    }

    private List<String> readList(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (Exception exception) { return List.of(); }
    }
}
