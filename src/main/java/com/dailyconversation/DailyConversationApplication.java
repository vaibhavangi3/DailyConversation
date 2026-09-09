package com.dailyconversation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class DailyConversationApplication {
    public static void main(String[] args) {
        createDatabaseDirectory();
        SpringApplication.run(DailyConversationApplication.class, args);
    }

    private static void createDatabaseDirectory() {
        try {
            String configuredPath = System.getenv().getOrDefault("DB_PATH", "data/daily-conversation.db");
            Path databasePath = Path.of(configuredPath).toAbsolutePath();
            if (databasePath.getParent() != null) Files.createDirectories(databasePath.getParent());
        } catch (Exception exception) {
            throw new IllegalStateException("Could not prepare the database directory.", exception);
        }
    }
}
