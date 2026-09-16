package com.dailyconversation.repository;

import com.dailyconversation.api.ApiModels;
import com.dailyconversation.domain.Conversation;
import com.dailyconversation.service.TranscriptMetrics;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
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
        ensureAnalysisColumns();
    }

    public void save(Conversation conversation) {
        jdbc.update("""
                INSERT INTO conversations (id, provider, source_url, title, summary, context, keywords_json, effort_score, input_tokens, output_tokens, topic, study_method, difficulty,
                estimated_minutes, imported_at, analyzed_at, analysis_status, key_learnings_json, concepts_json,
                next_steps_json, transcript) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_url) DO UPDATE SET title=excluded.title, summary=excluded.summary, context=excluded.context,
                keywords_json=excluded.keywords_json, effort_score=excluded.effort_score, input_tokens=excluded.input_tokens, output_tokens=excluded.output_tokens, topic=excluded.topic,
                study_method=excluded.study_method, difficulty=excluded.difficulty, estimated_minutes=excluded.estimated_minutes,
                analyzed_at=excluded.analyzed_at, analysis_status=excluded.analysis_status,
                key_learnings_json=excluded.key_learnings_json, concepts_json=excluded.concepts_json,
                next_steps_json=excluded.next_steps_json, transcript=excluded.transcript
                """,
                conversation.id(), conversation.provider(), conversation.sourceUrl(), conversation.title(), conversation.summary(), conversation.context(), json(conversation.keywords()), conversation.effortScore(), conversation.inputTokens(), conversation.outputTokens(),
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

    public List<ApiModels.DailyLearningStat> dailyLearningStats() {
        return jdbc.query("SELECT substr(imported_at, 1, 10) date, SUM(estimated_minutes) minutes, COUNT(*) count FROM conversations GROUP BY date ORDER BY date DESC",
                (rs, rowNum) -> new ApiModels.DailyLearningStat(rs.getString("date"), rs.getInt("minutes"), rs.getInt("count")));
    }

    private Conversation map(ResultSet rs, int rowNum) throws SQLException {
        return new Conversation(rs.getString("id"), rs.getString("provider"), rs.getString("source_url"),
                rs.getString("title"), rs.getString("summary"), rs.getString("context"), readList(rs.getString("keywords_json")), rs.getInt("effort_score"),
                rs.getInt("input_tokens") > 0 ? rs.getInt("input_tokens") : TranscriptMetrics.estimatedTokens(rs.getString("transcript"), true),
                rs.getInt("output_tokens") > 0 ? rs.getInt("output_tokens") : TranscriptMetrics.estimatedTokens(rs.getString("transcript"), false), rs.getString("topic"), rs.getString("study_method"),
                rs.getString("difficulty"), rs.getInt("estimated_minutes"), Instant.parse(rs.getString("imported_at")),
                rs.getString("analyzed_at") == null ? null : Instant.parse(rs.getString("analyzed_at")),
                rs.getString("analysis_status"), readList(rs.getString("key_learnings_json")),
                readList(rs.getString("concepts_json")), readList(rs.getString("next_steps_json")), rs.getString("transcript"));
    }

    private void ensureAnalysisColumns() {
        addColumnIfMissing("context", "TEXT NOT NULL DEFAULT ''");
        addColumnIfMissing("keywords_json", "TEXT NOT NULL DEFAULT '[]'");
        addColumnIfMissing("effort_score", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing("input_tokens", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing("output_tokens", "INTEGER NOT NULL DEFAULT 0");
    }

    private void addColumnIfMissing(String name, String definition) {
        Integer columnCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM pragma_table_info('conversations') WHERE name = ?", Integer.class, name);
        boolean exists = columnCount != null && columnCount > 0;
        if (!exists) {
            try { jdbc.execute("ALTER TABLE conversations ADD COLUMN " + name + " " + definition); }
            catch (DataAccessException ignored) { }
        }
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
