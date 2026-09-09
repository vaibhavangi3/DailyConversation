package com.dailyconversation.importer;

public enum Provider {
    OPENAI("OpenAI", "ChatGPT"),
    GOOGLE("Google", "Gemini"),
    ANTHROPIC("Anthropic", "Claude");

    private final String label;
    private final String product;

    Provider(String label, String product) {
        this.label = label;
        this.product = product;
    }

    public String label() { return label; }
    public String product() { return product; }
}
