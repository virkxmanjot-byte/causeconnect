package dao;

import database.DBConnection;
import model.Campaign;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class CampaignDAO {

    public boolean addCampaign(Campaign campaign) {

        String sql = "INSERT INTO campaigns " +
                     "(creator_id, title, description, goal_amount, status) " +
                     "VALUES (?, ?, ?, ?, ?)";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setInt(1, campaign.getCreatorId());
            statement.setString(2, campaign.getTitle());
            statement.setString(3, campaign.getDescription());
            statement.setDouble(4, campaign.getGoalAmount());
            statement.setString(5, campaign.getStatus());

            int rows = statement.executeUpdate();

            return rows > 0;

        } catch (SQLException e) {

            System.out.println("Failed to add campaign.");
            e.printStackTrace();

            return false;
        }
    }

    public List<Campaign> getAllCampaigns() {

        List<Campaign> campaigns = new ArrayList<>();

        String sql = "SELECT * FROM campaigns";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {

            while (result.next()) {

                Campaign campaign = new Campaign(
                        result.getInt("campaign_id"),
                        result.getInt("creator_id"),
                        result.getString("title"),
                        result.getString("description"),
                        result.getDouble("goal_amount"),
                        result.getDouble("raised_amount"),
                        result.getString("status")
                );

                campaigns.add(campaign);
            }

        } catch (SQLException e) {

            System.out.println("Failed to retrieve campaigns.");
            e.printStackTrace();
        }

        return campaigns;
    }

    public boolean updateCampaignStatus(
            int campaignId,
            String status) {

        String sql =
                "UPDATE campaigns SET status = ? " +
                "WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, status);
            statement.setInt(2, campaignId);

            int rows = statement.executeUpdate();

            return rows > 0;

        } catch (SQLException e) {

            System.out.println(
                    "Failed to update campaign status."
            );

            e.printStackTrace();

            return false;
        }
    }

    public List<Campaign> getCampaignsByCreatorId(int creatorId) {

        List<Campaign> campaigns = new ArrayList<>();

        String sql =
                "SELECT * FROM campaigns WHERE creator_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setInt(1, creatorId);

            ResultSet result = statement.executeQuery();

            while (result.next()) {

                Campaign campaign = new Campaign(
                        result.getInt("campaign_id"),
                        result.getInt("creator_id"),
                        result.getString("title"),
                        result.getString("description"),
                        result.getDouble("goal_amount"),
                        result.getDouble("raised_amount"),
                        result.getString("status")
                );

                campaigns.add(campaign);
            }

        } catch (SQLException e) {

            System.out.println(
                    "Failed to retrieve creator campaigns."
            );

            e.printStackTrace();
        }

        return campaigns;
    }

    public Campaign getCampaignById(int campaignId) {
        String sql = "SELECT * FROM campaigns WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, campaignId);
            ResultSet result = statement.executeQuery();

            if (result.next()) {
                return new Campaign(
                        result.getInt("campaign_id"),
                        result.getInt("creator_id"),
                        result.getString("title"),
                        result.getString("description"),
                        result.getDouble("goal_amount"),
                        result.getDouble("raised_amount"),
                        result.getString("status")
                );
            }
        } catch (SQLException e) {
            System.out.println("Failed to retrieve campaign by id.");
            e.printStackTrace();
        }
        return null;
    }

    public boolean updateCampaign(Campaign campaign) {
        String sql = "UPDATE campaigns SET title = ?, description = ?, goal_amount = ? WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, campaign.getTitle());
            statement.setString(2, campaign.getDescription());
            statement.setDouble(3, campaign.getGoalAmount());
            statement.setInt(4, campaign.getCampaignId());

            int rows = statement.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.out.println("Failed to update campaign.");
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteCampaign(int campaignId) {
        // Also clean up dependent updates and contributions if needed
        String sqlUpdates = "DELETE FROM campaign_updates WHERE campaign_id = ?";
        String sqlContribs = "DELETE FROM contributions WHERE campaign_id = ?";
        String sqlCamp = "DELETE FROM campaigns WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection()) {
            try (PreparedStatement ps1 = connection.prepareStatement(sqlUpdates)) {
                ps1.setInt(1, campaignId);
                ps1.executeUpdate();
            }
            try (PreparedStatement ps2 = connection.prepareStatement(sqlContribs)) {
                ps2.setInt(1, campaignId);
                ps2.executeUpdate();
            }
            try (PreparedStatement ps3 = connection.prepareStatement(sqlCamp)) {
                ps3.setInt(1, campaignId);
                int rows = ps3.executeUpdate();
                return rows > 0;
            }
        } catch (SQLException e) {
            System.out.println("Failed to delete campaign.");
            e.printStackTrace();
            return false;
        }
    }
}