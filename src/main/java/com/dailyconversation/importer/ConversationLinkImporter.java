package com.dailyconversation.importer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ConversationLinkImporter {
    private static final int MAX_RESPONSE_BYTES = 6_000_000;
    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "chatgpt.com", "www.chatgpt.com", "chat.openai.com", "gemini.google.com", "claude.ai", "www.claude.ai");
    // Matches "role": "user"/"assistant" followed by content in the same JSON neighbourhood.
    // Uses (?:[^"\\]|\\.)* — the standard JSON-string pattern — so apostrophes, ?, etc. all work.
    private static final Pattern RSC_ROLE_CONTENT = Pattern.compile(
            "\"(?<role>user|assistant|human|model)\"\\s*[,:]\\s*\"(?<content>(?:[^\"\\\\]|\\\\.){3,15000})\"",
            Pattern.CASE_INSENSITIVE);
    // ChatGPT "parts" array format: "parts":["message text"]
    private static final Pattern RSC_PARTS = Pattern.compile(
            "\"(?<role>user|assistant)\"(?:(?!\"role\")[\\s\\S]){1,800}?\"parts\"\\s*:\\s*\\[\"(?<content>(?:[^\"\\\\]|\\\\.){3,15000})\"\\]",
            Pattern.CASE_INSENSITIVE);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    private final ObjectMapper objectMapper;

    public ConversationLinkImporter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ExtractedConversation importLink(String rawUrl) {
        URI uri = parseAndValidate(rawUrl);
        Provider provider = providerFor(uri.getHost());
        try {
            HttpResponse<String> response = fetchSharedPage(uri);
            if (response.statusCode() != 200) {
                throw new IllegalArgumentException("The shared page returned HTTP " + response.statusCode() + ". Check that it is public.");
            }
            if (response.body().getBytes().length > MAX_RESPONSE_BYTES) {
                throw new IllegalArgumentException("The shared page is larger than the supported 6 MB limit.");
            }
            return new ExtractedConversation(provider, extractTranscript(response.body(), provider));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("The shared page request was interrupted.");
        } catch (IOException exception) {
            throw new IllegalArgumentException("The shared page could not be reached (" + exception.getClass().getSimpleName() + "). Check that the link is public and try again.");
        }
    }

    private HttpResponse<String> fetchSharedPage(URI initialUri) throws IOException, InterruptedException {
        URI current = initialUri;
        for (int attempt = 0; attempt < 4; attempt++) {
            HttpRequest request = HttpRequest.newBuilder(current)
                    .timeout(Duration.ofSeconds(20))
                    .header("User-Agent", "DailyConversation/1.0 (learning journal)")
                    .header("Accept", "text/html,application/xhtml+xml")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 300 || response.statusCode() >= 400) return response;

            String location = response.headers().firstValue("location").orElse("");
            URI redirected = location.isBlank() ? null : current.resolve(location);
            if (redirected == null || !isAllowedHost(redirected) || !"https".equalsIgnoreCase(redirected.getScheme())) {
                throw new IllegalArgumentException("The shared page redirected to an unsupported URL. Please use the original public share link.");
            }
            current = redirected;
        }
        throw new IllegalArgumentException("The shared page redirected too many times. Please use the final public share link.");
    }

    private URI parseAndValidate(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl.trim());
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!isAllowedHost(uri)) {
                throw new IllegalArgumentException("Use a public HTTPS share link from ChatGPT, Gemini, or Claude.");
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("That does not look like a valid share URL.");
        }
    }

    private boolean isAllowedHost(URI uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        return "https".equalsIgnoreCase(uri.getScheme()) && ALLOWED_HOSTS.contains(host);
    }

    private Provider providerFor(String host) {
        if (host.contains("openai") || host.contains("chatgpt")) return Provider.OPENAI;
        if (host.contains("google")) return Provider.GOOGLE;
        return Provider.ANTHROPIC;
    }

    private String extractTranscript(String html, Provider provider) {
        List<String> messages = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        extractReactRouterStream(html, messages, seen);
        if (messages.isEmpty()) {
            for (JsonNode root : findEmbeddedJsonRoots(html)) {
                collectMessages(root, messages, seen);
            }
        }
        if (messages.isEmpty()) collectRscMessages(html, messages, seen);
        if (!messages.isEmpty()) return String.join("\n\n", messages);

        Document document = Jsoup.parse(html);
        document.select("script, style, nav, header, footer, svg").remove();
        String visibleText = document.body() == null ? "" : document.body().text();
        String cleaned = visibleText.replaceAll("\\s+", " ").trim();
        if (cleaned.isBlank() || cleaned.length() < 40 || cleaned.matches("(?i).*(enable javascript|loading\\.{0,3}|sign in to continue).*")) {
            throw new IllegalArgumentException("The provider returned a page without transcript data. Confirm the link is public and copied from the provider's Share option.");
        }
        return cleaned.length() > 100_000 ? cleaned.substring(0, 100_000) : cleaned;
    }

    private void extractReactRouterStream(String html, List<String> messages, Set<String> seen) {
        int index = 0;
        while ((index = html.indexOf("streamController.enqueue(", index)) != -1) {
            int start = index + "streamController.enqueue(".length();
            while (start < html.length() && Character.isWhitespace(html.charAt(start))) {
                start++;
            }
            if (start >= html.length()) break;
            char quote = html.charAt(start);
            if (quote != '"' && quote != '\'' && quote != '`') {
                index = start;
                continue;
            }
            int pos = start + 1;
            boolean escaped = false;
            while (pos < html.length()) {
                char c = html.charAt(pos);
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == quote) {
                    break;
                }
                pos++;
            }
            if (pos < html.length() && html.charAt(pos) == quote) {
                String rawLiteral = html.substring(start, pos + 1);
                parseStreamChunk(rawLiteral, quote, messages, seen);
                index = pos + 1;
            } else {
                index = start + 1;
            }
        }
    }

    private void parseStreamChunk(String rawLiteral, char quote, List<String> messages, Set<String> seen) {
        try {
            String unescaped;
            if (quote == '"') {
                JsonNode textNode = objectMapper.readTree(rawLiteral);
                if (!textNode.isTextual()) return;
                unescaped = textNode.asText();
            } else {
                unescaped = rawLiteral.substring(1, rawLiteral.length() - 1)
                        .replace("\\n", "\n")
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\");
            }
            unescaped = unescaped.trim();
            if (!unescaped.startsWith("[") || !unescaped.endsWith("]")) {
                return;
            }
            JsonNode parsedArray = objectMapper.readTree(unescaped);
            if (!parsedArray.isArray()) return;
            extractFromRootArray((ArrayNode) parsedArray, messages, seen);
        } catch (Exception ignored) {
        }
    }

    private void extractFromRootArray(ArrayNode rootArray, List<String> messages, Set<String> seen) {
        int linearConvKeyIndex = -1;
        int messageKeyIndex = -1;
        int authorKeyIndex = -1;
        int roleKeyIndex = -1;
        int contentKeyIndex = -1;
        int partsKeyIndex = -1;

        for (int i = 0; i < rootArray.size(); i++) {
            JsonNode item = rootArray.get(i);
            if (item.isTextual()) {
                String text = item.asText();
                if ("linear_conversation".equals(text)) linearConvKeyIndex = i;
                else if ("message".equals(text)) messageKeyIndex = i;
                else if ("author".equals(text)) authorKeyIndex = i;
                else if ("role".equals(text)) roleKeyIndex = i;
                else if ("content".equals(text)) contentKeyIndex = i;
                else if ("parts".equals(text)) partsKeyIndex = i;
            }
        }

        boolean foundAny = false;
        if (linearConvKeyIndex != -1) {
            String linearProp = "_" + linearConvKeyIndex;
            JsonNode linearList = null;
            for (JsonNode item : rootArray) {
                if (item.isObject() && item.has(linearProp)) {
                    int listIndex = item.get(linearProp).asInt(-1);
                    if (listIndex >= 0 && listIndex < rootArray.size()) {
                        linearList = rootArray.get(listIndex);
                        break;
                    }
                }
            }
            if (linearList != null && linearList.isArray()) {
                for (JsonNode nodeRef : linearList) {
                    int nodeIndex = nodeRef.asInt(-1);
                    if (nodeIndex >= 0 && nodeIndex < rootArray.size()) {
                        JsonNode node = rootArray.get(nodeIndex);
                        if (processLinearNode(node, rootArray, messageKeyIndex, authorKeyIndex, roleKeyIndex,
                                contentKeyIndex, partsKeyIndex, messages, seen)) {
                            foundAny = true;
                        }
                    }
                }
            }
        }

        if (!foundAny && authorKeyIndex != -1 && contentKeyIndex != -1) {
            String authorProp = "_" + authorKeyIndex;
            String contentProp = "_" + contentKeyIndex;
            for (JsonNode item : rootArray) {
                if (item.isObject() && item.has(authorProp) && item.has(contentProp)) {
                    processLinearNode(item, rootArray, -1, authorKeyIndex, roleKeyIndex,
                            contentKeyIndex, partsKeyIndex, messages, seen);
                }
            }
        }
    }

    private boolean processLinearNode(JsonNode node, ArrayNode rootArray,
                                      int messageKeyIndex, int authorKeyIndex, int roleKeyIndex,
                                      int contentKeyIndex, int partsKeyIndex,
                                      List<String> messages, Set<String> seen) {
        if (node == null || !node.isObject()) return false;

        JsonNode msgNode = node;
        if (messageKeyIndex != -1 && node.has("_" + messageKeyIndex)) {
            int msgIndex = node.get("_" + messageKeyIndex).asInt(-1);
            if (msgIndex >= 0 && msgIndex < rootArray.size()) {
                msgNode = rootArray.get(msgIndex);
            }
        }
        if (!msgNode.isObject()) return false;

        String role = "";
        if (authorKeyIndex != -1 && msgNode.has("_" + authorKeyIndex)) {
            int authorIndex = msgNode.get("_" + authorKeyIndex).asInt(-1);
            if (authorIndex >= 0 && authorIndex < rootArray.size()) {
                JsonNode authorNode = rootArray.get(authorIndex);
                if (roleKeyIndex != -1 && authorNode.has("_" + roleKeyIndex)) {
                    int rIdx = authorNode.get("_" + roleKeyIndex).asInt(-1);
                    if (rIdx >= 0 && rIdx < rootArray.size() && rootArray.get(rIdx).isTextual()) {
                        role = rootArray.get(rIdx).asText();
                    }
                }
            }
        }

        if (!role.equalsIgnoreCase("user") && !role.equalsIgnoreCase("assistant")
                && !role.equalsIgnoreCase("human") && !role.equalsIgnoreCase("model")) {
            return false;
        }

        String content = "";
        if (contentKeyIndex != -1 && msgNode.has("_" + contentKeyIndex)) {
            int cIdx = msgNode.get("_" + contentKeyIndex).asInt(-1);
            if (cIdx >= 0 && cIdx < rootArray.size()) {
                JsonNode contentNode = rootArray.get(cIdx);
                if (partsKeyIndex != -1 && contentNode.has("_" + partsKeyIndex)) {
                    JsonNode partsVal = contentNode.get("_" + partsKeyIndex);
                    content = resolveParts(partsVal, rootArray);
                }
            }
        }

        content = content.trim();
        if (content.isEmpty() || "Original custom instructions no longer available".equals(content)) {
            return false;
        }

        String formatted = formatMessage(role, content);
        if (formatted != null && seen.add(formatted)) {
            messages.add(formatted);
            return true;
        }
        return false;
    }

    private String resolveParts(JsonNode partsVal, ArrayNode rootArray) {
        if (partsVal == null || partsVal.isNull()) return "";
        if (partsVal.isNumber()) {
            int idx = partsVal.asInt(-1);
            if (idx >= 0 && idx < rootArray.size()) {
                JsonNode target = rootArray.get(idx);
                return resolveTargetToText(target, rootArray);
            }
        } else if (partsVal.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode elem : partsVal) {
                sb.append(resolveTextOrRef(elem, rootArray));
            }
            return sb.toString();
        } else if (partsVal.isTextual()) {
            return partsVal.asText();
        }
        return "";
    }

    private String resolveTargetToText(JsonNode target, ArrayNode rootArray) {
        if (target == null || target.isNull()) return "";
        if (target.isTextual()) return target.asText();
        if (target.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode elem : target) {
                sb.append(resolveTextOrRef(elem, rootArray));
            }
            return sb.toString();
        }
        return "";
    }

    private String resolveTextOrRef(JsonNode elem, ArrayNode rootArray) {
        if (elem == null || elem.isNull()) return "";
        if (elem.isTextual()) return elem.asText();
        if (elem.isNumber()) {
            int idx = elem.asInt(-1);
            if (idx >= 0 && idx < rootArray.size()) {
                JsonNode target = rootArray.get(idx);
                if (target.isTextual()) return target.asText();
            }
        }
        return "";
    }

    private List<JsonNode> findEmbeddedJsonRoots(String html) {
        List<JsonNode> roots = new ArrayList<>();
        Document document = Jsoup.parse(html);
        for (org.jsoup.nodes.Element script : document.select("script")) {
            String content = script.data().trim();
            if (content.isBlank()) content = script.html().trim();
            if (!script.id().equals("__NEXT_DATA__") && !"application/json".equalsIgnoreCase(script.attr("type"))
                    && !(content.startsWith("{") || content.startsWith("["))) continue;
            try {
                JsonNode root = objectMapper.readTree(content);
                if (root != null) roots.add(root);
            } catch (Exception ignored) {
            }
        }
        return roots;
    }

    private void collectRscMessages(String html, List<String> messages, Set<String> seen) {
        // Try ChatGPT "parts" array format first (more specific)
        Matcher partsMatcher = RSC_PARTS.matcher(html);
        while (partsMatcher.find()) {
            String role = partsMatcher.group("role");
            String content = unescape(partsMatcher.group("content"));
            String entry = formatMessage(role, content);
            if (entry != null && seen.add(entry)) messages.add(entry);
        }
        if (!messages.isEmpty()) return;
        // Fall back to generic role:content pattern
        Matcher matcher = RSC_ROLE_CONTENT.matcher(html);
        while (matcher.find()) {
            String role = matcher.group("role");
            String content = unescape(matcher.group("content"));
            String entry = formatMessage(role, content);
            if (entry != null && seen.add(entry)) messages.add(entry);
        }
    }

    private String unescape(String s) {
        return s.replace("\\n", "\n").replace("\\t", "\t").replace("\\\"", "\"").replace("\\\\", "\\").trim();
    }

    private void collectMessages(JsonNode node, List<String> messages, Set<String> seen) {
        if (node == null || node.isNull()) return;
        if (node.isObject()) {
            String role = text(node, "role");
            if (role.isBlank()) role = text(node, "sender");
            if (role.isBlank()) role = text(node, "from");
            if (role.isBlank() && node.get("author") != null) role = text(node.get("author"), "role");
            String content = extractContent(node.get("content"));
            if (content.isBlank()) content = extractContent(node.get("parts"));
            if (content.isBlank()) content = extractContent(node.get("text"));
            String entry = formatMessage(role, content);
            if (entry != null && seen.add(entry)) messages.add(entry);
            Iterator<JsonNode> values = node.elements();
            while (values.hasNext()) collectMessages(values.next(), messages, seen);
        } else if (node.isArray()) {
            for (JsonNode child : node) collectMessages(child, messages, seen);
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? value.asText() : "";
    }

    private String formatMessage(String role, String content) {
        if (role == null || role.isBlank() || content == null || content.isBlank()) return null;
        if (!(role.equalsIgnoreCase("user") || role.equalsIgnoreCase("assistant")
                || role.equalsIgnoreCase("human") || role.equalsIgnoreCase("model"))) return null;
        String label = role.substring(0, 1).toUpperCase(Locale.ROOT) + role.substring(1).toLowerCase(Locale.ROOT);
        return label + ": " + content;
    }

    private String extractContent(JsonNode content) {
        if (content == null || content.isNull()) return "";
        if (content.isTextual()) return content.asText().trim();
        if (content.isArray()) {
            List<String> parts = new ArrayList<>();
            for (JsonNode part : content) {
                if (part.isTextual()) parts.add(part.asText());
                else if (part.has("text")) parts.add(part.get("text").asText());
            }
            return String.join("", parts).trim();
        }
        if (content.isObject() && content.has("parts")) return extractContent(content.get("parts"));
        return "";
    }
}
