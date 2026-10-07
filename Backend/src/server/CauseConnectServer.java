package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import dao.CampaignDAO;
import dao.CampaignUpdateDAO;
import dao.ContributionDAO;
import dao.UserDAO;
import model.Campaign;
import model.CampaignUpdate;
import model.Contribution;
import model.User;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Executors;

public class CauseConnectServer {

    private static final int PORT = 8080;
    private static final Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd HH:mm:ss").create();
    private static final UserDAO userDAO = new UserDAO();
    private static final CampaignDAO campaignDAO = new CampaignDAO();
    private static final ContributionDAO contributionDAO = new ContributionDAO();
    private static final CampaignUpdateDAO updateDAO = new CampaignUpdateDAO();

    // In-memory sessions
    private static final Map<String, User> sessions = new HashMap<>();

    public static void main(String[] args) throws IOException {
        int port = PORT;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException ignored) {}
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // API Contexts
        server.createContext("/api/auth", new AuthHandler());
        server.createContext("/api/campaigns", new CampaignHandler());
        server.createContext("/api/contributions", new ContributionHandler());
        server.createContext("/api/updates", new CampaignUpdateHandler());
        server.createContext("/api/users", new UserHandler());
        server.createContext("/api/stats", new StatsHandler());

        // Static file handler for CrowdFund/
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(Executors.newFixedThreadPool(16));
        server.start();

        System.out.println("==================================================");
        System.out.println("  CauseConnect Backend Server Running!");
        System.out.println("  URL: http://localhost:" + port);
        System.out.println("  API: http://localhost:" + port + "/api");
        System.out.println("==================================================");
    }

    /* ---------- HTTP Utility Helpers ---------- */

    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
        exchange.getResponseHeaders().set("Access-Control-Max-Age", "86400");
    }

    private static void sendJson(HttpExchange exchange, int status, Object data) throws IOException {
        setCorsHeaders(exchange);
        byte[] bytes = gson.toJson(data).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sendError(HttpExchange exchange, int status, String message) throws IOException {
        JsonObject err = new JsonObject();
        err.addProperty("success", false);
        err.addProperty("error", message);
        sendJson(exchange, status, err);
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) {
                bos.write(buf, 0, n);
            }
            return bos.toString(StandardCharsets.UTF_8);
        }
    }

    private static JsonObject parseJsonObject(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        if (body == null || body.trim().isEmpty()) {
            return new JsonObject();
        }
        try {
            return JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception e) {
            return new JsonObject();
        }
    }

    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null || query.isEmpty()) return params;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                params.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                           URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            } else if (kv.length == 1) {
                params.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), "");
            }
        }
        return params;
    }

    /* ---------- Handlers ---------- */

    static class AuthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath(); // /api/auth/login, etc.
            if (path.endsWith("/login") && "POST".equalsIgnoreCase(method)) {
                JsonObject json = parseJsonObject(exchange);
                String email = json.has("email") ? json.get("email").getAsString().trim().toLowerCase() : "";
                String password = json.has("password") ? json.get("password").getAsString() : "";

                User user = userDAO.login(email, password);
                if (user != null) {
                    Map<String, Object> u = userToMap(user);
                    sendJson(exchange, 200, u);
                } else {
                    sendError(exchange, 401, "Invalid email or password.");
                }
            } else if (path.endsWith("/register") && "POST".equalsIgnoreCase(method)) {
                JsonObject json = parseJsonObject(exchange);
                String name = json.has("name") ? json.get("name").getAsString().trim() : "";
                String email = json.has("email") ? json.get("email").getAsString().trim().toLowerCase() : "";
                String password = json.has("password") ? json.get("password").getAsString() : "";
                String role = json.has("role") ? json.get("role").getAsString().trim().toUpperCase() : "CONTRIBUTOR";

                if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                    sendError(exchange, 400, "Name, email, and password are required.");
                    return;
                }

                User existing = userDAO.getUserByEmail(email);
                if (existing != null) {
                    sendError(exchange, 409, "An account with this email already exists.");
                    return;
                }

                User newUser = new User(name, email, password, role);
                boolean success = userDAO.register(newUser);
                if (success) {
                    User registered = userDAO.getUserByEmail(email);
                    sendJson(exchange, 201, userToMap(registered != null ? registered : newUser));
                } else {
                    sendError(exchange, 500, "Registration failed.");
                }
            } else {
                sendError(exchange, 404, "Auth endpoint not found.");
            }
        }
    }

    static class CampaignHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath(); // /api/campaigns or /api/campaigns/123 or /api/campaigns/123/updates or /api/campaigns/123/status
            String subpath = path.substring("/api/campaigns".length());
            if (subpath.startsWith("/")) subpath = subpath.substring(1);
            String[] parts = subpath.isEmpty() ? new String[0] : subpath.split("/");

            if ("GET".equalsIgnoreCase(method)) {
                if (parts.length == 0) {
                    // List campaigns
                    Map<String, String> query = parseQueryParams(exchange.getRequestURI().getQuery());
                    String status = query.get("status");
                    String creatorIdStr = query.get("creator_id");

                    List<Campaign> list;
                    if (creatorIdStr != null && !creatorIdStr.isEmpty()) {
                        try {
                            int cid = Integer.parseInt(creatorIdStr);
                            list = campaignDAO.getCampaignsByCreatorId(cid);
                        } catch (NumberFormatException e) {
                            list = campaignDAO.getAllCampaigns();
                        }
                    } else {
                        list = campaignDAO.getAllCampaigns();
                    }

                    List<Map<String, Object>> res = new ArrayList<>();
                    for (Campaign c : list) {
                        if (status != null && !status.isEmpty() && !c.getStatus().equalsIgnoreCase(status)) {
                            continue;
                        }
                        res.add(campaignToMap(c));
                    }
                    sendJson(exchange, 200, res);
                } else if (parts.length == 1) {
                    // Get campaign details
                    try {
                        int id = Integer.parseInt(parts[0]);
                        Campaign c = campaignDAO.getCampaignById(id);
                        if (c != null) {
                            Map<String, Object> m = campaignToMap(c);
                            m.put("contributions_count", contributionDAO.getContributionsByCampaignId(id).size());
                            m.put("updates_count", updateDAO.getUpdatesByCampaign(id).size());
                            sendJson(exchange, 200, m);
                        } else {
                            sendError(exchange, 404, "Campaign not found");
                        }
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid campaign ID");
                    }
                } else if (parts.length == 2 && "updates".equalsIgnoreCase(parts[1])) {
                    // Updates for campaign
                    try {
                        int id = Integer.parseInt(parts[0]);
                        List<CampaignUpdate> updates = updateDAO.getUpdatesByCampaign(id);
                        sendJson(exchange, 200, updates);
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid campaign ID");
                    }
                }
            } else if ("POST".equalsIgnoreCase(method)) {
                if (parts.length == 0) {
                    // Create campaign
                    JsonObject json = parseJsonObject(exchange);
                    if (!json.has("creator_id") || !json.has("title") || !json.has("goal_amount")) {
                        sendError(exchange, 400, "Missing required parameters");
                        return;
                    }
                    int creatorId = json.get("creator_id").getAsInt();
                    String title = json.get("title").getAsString().trim();
                    String description = json.has("description") ? json.get("description").getAsString().trim() : "";
                    double goal = json.get("goal_amount").getAsDouble();

                    Campaign c = new Campaign(creatorId, title, description, goal, "PENDING");
                    boolean created = campaignDAO.addCampaign(c);
                    if (created) {
                        List<Campaign> myCamps = campaignDAO.getCampaignsByCreatorId(creatorId);
                        Campaign latest = myCamps.isEmpty() ? c : myCamps.get(myCamps.size() - 1);
                        sendJson(exchange, 201, campaignToMap(latest));
                    } else {
                        sendError(exchange, 500, "Failed to create campaign");
                    }
                } else if (parts.length == 2 && "updates".equalsIgnoreCase(parts[1])) {
                    // Add update to campaign
                    try {
                        int campId = Integer.parseInt(parts[0]);
                        JsonObject json = parseJsonObject(exchange);
                        int creatorId = json.has("creator_id") ? json.get("creator_id").getAsInt() : 0;
                        String title = json.has("title") ? json.get("title").getAsString().trim() : "";
                        String message = json.has("message") ? json.get("message").getAsString().trim() : "";

                        CampaignUpdate cu = new CampaignUpdate(campId, creatorId, title, message);
                        boolean ok = updateDAO.addUpdate(cu);
                        if (ok) {
                            List<CampaignUpdate> list = updateDAO.getUpdatesByCampaign(campId);
                            sendJson(exchange, 201, list.isEmpty() ? cu : list.get(0));
                        } else {
                            sendError(exchange, 500, "Failed to add update");
                        }
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid campaign ID");
                    }
                }
            } else if ("PUT".equalsIgnoreCase(method)) {
                if (parts.length >= 1) {
                    try {
                        int campId = Integer.parseInt(parts[0]);
                        if (parts.length == 2 && "status".equalsIgnoreCase(parts[1])) {
                            // Update status (Admin approve/reject)
                            JsonObject json = parseJsonObject(exchange);
                            String status = json.has("status") ? json.get("status").getAsString().trim().toUpperCase() : "";
                            boolean ok = campaignDAO.updateCampaignStatus(campId, status);
                            if (ok) {
                                Map<String, Object> r = new HashMap<>();
                                r.put("success", true);
                                r.put("status", status);
                                sendJson(exchange, 200, r);
                            } else {
                                sendError(exchange, 500, "Failed to update status");
                            }
                        } else {
                            // Edit campaign details
                            Campaign c = campaignDAO.getCampaignById(campId);
                            if (c == null) {
                                sendError(exchange, 404, "Campaign not found");
                                return;
                            }
                            JsonObject json = parseJsonObject(exchange);
                            if (json.has("title")) c.setTitle(json.get("title").getAsString().trim());
                            if (json.has("description")) c.setDescription(json.get("description").getAsString().trim());
                            if (json.has("goal_amount")) c.setGoalAmount(json.get("goal_amount").getAsDouble());

                            boolean ok = campaignDAO.updateCampaign(c);
                            if (ok) {
                                sendJson(exchange, 200, campaignToMap(campaignDAO.getCampaignById(campId)));
                            } else {
                                sendError(exchange, 500, "Failed to update campaign");
                            }
                        }
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid campaign ID");
                    }
                }
            } else if ("DELETE".equalsIgnoreCase(method)) {
                if (parts.length >= 1) {
                    try {
                        int campId = Integer.parseInt(parts[0]);
                        boolean ok = campaignDAO.deleteCampaign(campId);
                        if (ok) {
                            Map<String, Object> r = new HashMap<>();
                            r.put("success", true);
                            sendJson(exchange, 200, r);
                        } else {
                            sendError(exchange, 404, "Campaign not found");
                        }
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid campaign ID");
                    }
                }
            }
        }
    }

    static class ContributionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            if ("GET".equalsIgnoreCase(method)) {
                Map<String, String> query = parseQueryParams(exchange.getRequestURI().getQuery());
                String campId = query.get("campaign_id");
                String userId = query.get("user_id");

                List<Contribution> list;
                if (campId != null && !campId.isEmpty()) {
                    try {
                        list = contributionDAO.getContributionsByCampaignId(Integer.parseInt(campId));
                    } catch (NumberFormatException e) {
                        list = new ArrayList<>();
                    }
                } else if (userId != null && !userId.isEmpty()) {
                    try {
                        list = contributionDAO.getContributionsByUserId(Integer.parseInt(userId));
                    } catch (NumberFormatException e) {
                        list = new ArrayList<>();
                    }
                } else {
                    list = contributionDAO.getAllContributions();
                }

                List<Map<String, Object>> res = new ArrayList<>();
                for (Contribution c : list) {
                    res.add(contributionToMap(c));
                }
                sendJson(exchange, 200, res);
            } else if ("POST".equalsIgnoreCase(method)) {
                JsonObject json = parseJsonObject(exchange);
                if (!json.has("campaign_id") || !json.has("user_id") || !json.has("amount")) {
                    sendError(exchange, 400, "Missing required parameters");
                    return;
                }

                int campaignId = json.get("campaign_id").getAsInt();
                int userId = json.get("user_id").getAsInt();
                double amount = json.get("amount").getAsDouble();

                Campaign c = campaignDAO.getCampaignById(campaignId);
                if (c == null) {
                    sendError(exchange, 404, "Campaign not found");
                    return;
                }

                if (!"APPROVED".equalsIgnoreCase(c.getStatus())) {
                    sendError(exchange, 400, "Contributions can only be made to approved campaigns.");
                    return;
                }

                Contribution contrib = new Contribution(campaignId, userId, amount);
                boolean ok = contributionDAO.addContribution(contrib);
                if (ok) {
                    List<Contribution> myContribs = contributionDAO.getContributionsByUserId(userId);
                    Contribution latest = myContribs.isEmpty() ? contrib : myContribs.get(myContribs.size() - 1);
                    sendJson(exchange, 201, contributionToMap(latest));
                } else {
                    sendError(exchange, 500, "Failed to record contribution");
                }
            } else if ("DELETE".equalsIgnoreCase(method)) {
                String path = exchange.getRequestURI().getPath();
                String idStr = path.substring("/api/contributions".length()).replace("/", "");
                try {
                    int id = Integer.parseInt(idStr);
                    boolean ok = contributionDAO.deleteContribution(id);
                    if (ok) {
                        Map<String, Object> r = new HashMap<>();
                        r.put("success", true);
                        sendJson(exchange, 200, r);
                        return;
                    }
                } catch (NumberFormatException ignored) {}
                sendError(exchange, 404, "Contribution not found");
            }
        }
    }

    static class CampaignUpdateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            if ("GET".equalsIgnoreCase(method)) {
                Map<String, String> query = parseQueryParams(exchange.getRequestURI().getQuery());
                String cid = query.get("campaign_id");

                List<CampaignUpdate> updates;
                if (cid != null && !cid.isEmpty()) {
                    try {
                        updates = updateDAO.getUpdatesByCampaign(Integer.parseInt(cid));
                    } catch (NumberFormatException e) {
                        updates = new ArrayList<>();
                    }
                } else {
                    updates = updateDAO.getAllUpdates();
                }

                List<Map<String, Object>> res = new ArrayList<>();
                for (CampaignUpdate u : updates) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("update_id", u.getUpdateId());
                    m.put("campaign_id", u.getCampaignId());
                    m.put("creator_id", u.getCreatorId());
                    m.put("title", u.getTitle());
                    m.put("message", u.getMessage());
                    m.put("update_date", u.getUpdateDate());
                    Campaign camp = campaignDAO.getCampaignById(u.getCampaignId());
                    m.put("campaign_title", camp != null ? camp.getTitle() : "Campaign #" + u.getCampaignId());
                    res.add(m);
                }
                sendJson(exchange, 200, res);
            } else if ("POST".equalsIgnoreCase(method)) {
                JsonObject json = parseJsonObject(exchange);
                int campaignId = json.get("campaign_id").getAsInt();
                int creatorId = json.has("creator_id") ? json.get("creator_id").getAsInt() : 0;
                String title = json.get("title").getAsString().trim();
                String message = json.get("message").getAsString().trim();

                CampaignUpdate u = new CampaignUpdate(campaignId, creatorId, title, message);
                boolean ok = updateDAO.addUpdate(u);
                if (ok) {
                    List<CampaignUpdate> list = updateDAO.getUpdatesByCampaign(campaignId);
                    sendJson(exchange, 201, list.isEmpty() ? u : list.get(0));
                } else {
                    sendError(exchange, 500, "Failed to create update");
                }
            } else if ("DELETE".equalsIgnoreCase(method)) {
                String path = exchange.getRequestURI().getPath();
                String idStr = path.substring("/api/updates".length()).replace("/", "");
                try {
                    int id = Integer.parseInt(idStr);
                    boolean ok = updateDAO.deleteUpdate(id);
                    if (ok) {
                        Map<String, Object> r = new HashMap<>();
                        r.put("success", true);
                        sendJson(exchange, 200, r);
                        return;
                    }
                } catch (NumberFormatException ignored) {}
                sendError(exchange, 404, "Update not found");
            }
        }
    }

    static class UserHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod();
            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();
            String idStr = path.substring("/api/users".length()).replace("/", "");

            if ("GET".equalsIgnoreCase(method)) {
                if (idStr.isEmpty()) {
                    List<User> users = userDAO.getAllUsers();
                    List<Map<String, Object>> res = new ArrayList<>();
                    for (User u : users) {
                        res.add(userToMap(u));
                    }
                    sendJson(exchange, 200, res);
                } else {
                    try {
                        int id = Integer.parseInt(idStr);
                        User u = userDAO.getUserById(id);
                        if (u != null) {
                            sendJson(exchange, 200, userToMap(u));
                        } else {
                            sendError(exchange, 404, "User not found");
                        }
                    } catch (NumberFormatException e) {
                        sendError(exchange, 400, "Invalid user ID");
                    }
                }
            } else if ("PUT".equalsIgnoreCase(method)) {
                try {
                    int id = Integer.parseInt(idStr);
                    User u = userDAO.getUserById(id);
                    if (u == null) {
                        sendError(exchange, 404, "User not found");
                        return;
                    }
                    JsonObject json = parseJsonObject(exchange);
                    if (json.has("name")) u.setName(json.get("name").getAsString().trim());
                    if (json.has("email")) u.setEmail(json.get("email").getAsString().trim().toLowerCase());
                    if (json.has("password") && !json.get("password").getAsString().trim().isEmpty()) {
                        u.setPassword(json.get("password").getAsString());
                    }
                    boolean ok = userDAO.updateuser(u);
                    if (ok) {
                        sendJson(exchange, 200, userToMap(userDAO.getUserById(id)));
                    } else {
                        sendError(exchange, 500, "Failed to update profile");
                    }
                } catch (NumberFormatException e) {
                    sendError(exchange, 400, "Invalid user ID");
                }
            } else if ("DELETE".equalsIgnoreCase(method)) {
                try {
                    int id = Integer.parseInt(idStr);
                    boolean ok = userDAO.deleteUser(id);
                    if (ok) {
                        Map<String, Object> r = new HashMap<>();
                        r.put("success", true);
                        sendJson(exchange, 200, r);
                    } else {
                        sendError(exchange, 404, "User not found");
                    }
                } catch (NumberFormatException e) {
                    sendError(exchange, 400, "Invalid user ID");
                }
            }
        }
    }

    static class StatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(200, -1);
                return;
            }

            List<Campaign> camps = campaignDAO.getAllCampaigns();
            List<Contribution> contribs = contributionDAO.getAllContributions();
            List<User> users = userDAO.getAllUsers();

            double totalRaised = 0.0;
            int active = 0;
            int pending = 0;
            for (Campaign c : camps) {
                totalRaised += c.getRaisedAmount();
                if ("APPROVED".equalsIgnoreCase(c.getStatus())) active++;
                else if ("PENDING".equalsIgnoreCase(c.getStatus())) pending++;
            }

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalRaised", totalRaised);
            stats.put("totalCampaigns", camps.size());
            stats.put("activeCampaigns", active);
            stats.put("pendingCampaigns", pending);
            stats.put("contributionsCount", contribs.size());
            stats.put("usersCount", users.size());

            sendJson(exchange, 200, stats);
        }
    }

     static class StaticFileHandler implements HttpHandler {
         @Override
          public void handle(HttpExchange exchange) throws IOException {
          String path = exchange.getRequestURI().getPath();

         if (path == null || path.equals("/")) {
            path = "/index.html";
        }

         File webRoot = new File(
            System.getProperty("user.dir"),
            "Frontend"
         );

         File targetFile = new File(
            webRoot,
            path.substring(1)
         );

         if (!targetFile.exists() || targetFile.isDirectory()) {
            exchange.sendResponseHeaders(404, -1);
            return;
         }

         String contentType = "text/plain";
        String name = targetFile.getName().toLowerCase();

         if (name.endsWith(".html")) {
            contentType = "text/html; charset=UTF-8";
         } else if (name.endsWith(".css")) {
            contentType = "text/css; charset=UTF-8";
         } else if (name.endsWith(".js")) {
            contentType = "application/javascript; charset=UTF-8";
         } else if (name.endsWith(".png")) {
            contentType = "image/png";
         } else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            contentType = "image/jpeg";
         } else if (name.endsWith(".svg")) {
            contentType = "image/svg+xml";
         } else if (name.endsWith(".json")) {
            contentType = "application/json";
         }

         byte[] bytes = Files.readAllBytes(targetFile.toPath());

         exchange.getResponseHeaders().set("Content-Type", contentType);
         setCorsHeaders(exchange);

         exchange.sendResponseHeaders(200, bytes.length);

         try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
         }
    }
}

    private static Map<String, Object> userToMap(User u) {
        Map<String, Object> map = new HashMap<>();
        map.put("user_id", u.getUserId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("role", u.getRole() != null ? u.getRole().toLowerCase() : "contributor");
        return map;
    }

    private static Map<String, Object> campaignToMap(Campaign c) {
        Map<String, Object> map = new HashMap<>();
        map.put("campaign_id", c.getCampaignId());
        map.put("creator_id", c.getCreatorId());
        map.put("title", c.getTitle());
        map.put("description", c.getDescription());
        map.put("goal_amount", c.getGoalAmount());
        map.put("raised_amount", c.getRaisedAmount());
        map.put("status", c.getStatus());

        String text = (c.getTitle() + " " + c.getDescription()).toLowerCase();
        String category = "Community";
        if (text.contains("education") || text.contains("school") || text.contains("book") || text.contains("student")) category = "Education";
        else if (text.contains("medical") || text.contains("health") || text.contains("surgery") || text.contains("hospital")) category = "Medical";
        else if (text.contains("flood") || text.contains("relief") || text.contains("emergency") || text.contains("disaster")) category = "Emergency";
        else if (text.contains("animal") || text.contains("dog") || text.contains("shelter") || text.contains("cat")) category = "Other";
        else if (text.contains("water") || text.contains("clean") || text.contains("green") || text.contains("solar")) category = "Environment";
        map.put("category", category);

        User creator = userDAO.getUserById(c.getCreatorId());
        if (creator != null) {
            map.put("creator_name", creator.getName());
        } else {
            map.put("creator_name", "Creator #" + c.getCreatorId());
        }
        return map;
    }

    private static Map<String, Object> contributionToMap(Contribution c) {
        Map<String, Object> map = new HashMap<>();
        map.put("contribution_id", c.getContributionId());
        map.put("campaign_id", c.getCampaignId());
        map.put("user_id", c.getUserId());
        map.put("amount", c.getAmount());
        map.put("contribution_date", c.getContributionDate());

        Campaign camp = campaignDAO.getCampaignById(c.getCampaignId());
        map.put("campaign_title", camp != null ? camp.getTitle() : "Campaign #" + c.getCampaignId());

        User user = userDAO.getUserById(c.getUserId());
        map.put("contributor_name", user != null ? user.getName() : "Anonymous Contributor");
        return map;
    }
}
