package dao;

import database.DBConnection;
import model.Contribution;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ContributionDAO {

    public boolean addContribution(Contribution contribution) {

        String checkSql =
                "SELECT status FROM campaigns WHERE campaign_id = ?";

        String insertSql =
                "INSERT INTO contributions " +
                "(campaign_id, user_id, amount) " +
                "VALUES (?, ?, ?)";

        String updateSql =
                "UPDATE campaigns " +
                "SET raised_amount = raised_amount + ? " +
                "WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement checkStatement =
                     connection.prepareStatement(checkSql);
             PreparedStatement insertStatement =
                     connection.prepareStatement(insertSql);
             PreparedStatement updateStatement =
                     connection.prepareStatement(updateSql)) {

            checkStatement.setInt(1, contribution.getCampaignId());

            ResultSet result = checkStatement.executeQuery();

            if (!result.next()) {
                System.out.println("Campaign not found.");
                return false;
            }

            String status = result.getString("status");

            if (!"APPROVED".equals(status)) {
                System.out.println("Contribution not allowed.");
                System.out.println("Campaign is not approved.");
                return false;
            }

            if (contribution.getAmount() <= 0) {
                System.out.println("Contribution amount must be greater than zero.");
                return false;
            }

            connection.setAutoCommit(false);

            try {
                insertStatement.setInt(1, contribution.getCampaignId());
                insertStatement.setInt(2, contribution.getUserId());
                insertStatement.setDouble(3, contribution.getAmount());
                insertStatement.executeUpdate();

                updateStatement.setDouble(1, contribution.getAmount());
                updateStatement.setInt(2, contribution.getCampaignId());
                updateStatement.executeUpdate();

                connection.commit();
                return true;

            } catch (SQLException e) {
                connection.rollback();
                throw e;
            }

        } catch (SQLException e) {
            System.out.println("Failed to add contribution.");
            e.printStackTrace();
            return false;
        }
    }

    public List<Contribution> getAllContributions() {

        List<Contribution> contributions = new ArrayList<>();

        String sql = "SELECT * FROM contributions";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {

            while (result.next()) {

                Contribution contribution = new Contribution(
                        result.getInt("contribution_id"),
                        result.getInt("campaign_id"),
                        result.getInt("user_id"),
                        result.getDouble("amount"),
                        result.getString("contribution_date")
                );

                contributions.add(contribution);
            }

        } catch (SQLException e) {
            System.out.println("Failed to retrieve contributions.");
            e.printStackTrace();
        }

        return contributions;
    }

    public List<Contribution> getContributionsByUserId(int userId) {

        List<Contribution> contributions = new ArrayList<>();

        String sql =
                "SELECT * FROM contributions WHERE user_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setInt(1, userId);

            ResultSet result = statement.executeQuery();

            while (result.next()) {

                Contribution contribution = new Contribution(
                        result.getInt("contribution_id"),
                        result.getInt("campaign_id"),
                        result.getInt("user_id"),
                        result.getDouble("amount"),
                        result.getString("contribution_date")
                );

                contributions.add(contribution);
            }

        } catch (SQLException e) {
            System.out.println("Failed to retrieve user contributions.");
            e.printStackTrace();
        }

        return contributions;
    }

    public List<Contribution> getContributionsByCampaignId(int campaignId) {

        List<Contribution> contributions = new ArrayList<>();

        String sql =
                "SELECT * FROM contributions " +
                "WHERE campaign_id = ? " +
                "ORDER BY contribution_date DESC";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setInt(1, campaignId);

            ResultSet result = statement.executeQuery();

            while (result.next()) {

                Contribution contribution = new Contribution(
                        result.getInt("contribution_id"),
                        result.getInt("campaign_id"),
                        result.getInt("user_id"),
                        result.getDouble("amount"),
                        result.getString("contribution_date")
                );

                contributions.add(contribution);
            }

        } catch (SQLException e) {
            System.out.println("Failed to retrieve campaign contributions.");
            e.printStackTrace();
        }

        return contributions;
    }

    public boolean deleteContribution(int contributionId) {

        String getSql =
                "SELECT campaign_id, amount " +
                "FROM contributions " +
                "WHERE contribution_id = ?";

        String deleteSql =
                "DELETE FROM contributions " +
                "WHERE contribution_id = ?";

        String updateSql =
                "UPDATE campaigns " +
                "SET raised_amount = raised_amount - ? " +
                "WHERE campaign_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement getStatement =
                     connection.prepareStatement(getSql);
             PreparedStatement deleteStatement =
                     connection.prepareStatement(deleteSql);
             PreparedStatement updateStatement =
                     connection.prepareStatement(updateSql)) {

            getStatement.setInt(1, contributionId);

            ResultSet result = getStatement.executeQuery();

            if (!result.next()) {
                System.out.println("Contribution not found.");
                return false;
            }

            int campaignId = result.getInt("campaign_id");
            double amount = result.getDouble("amount");

            connection.setAutoCommit(false);

            try {
                deleteStatement.setInt(1, contributionId);
                int rows = deleteStatement.executeUpdate();

                if (rows == 0) {
                    connection.rollback();
                    return false;
                }

                updateStatement.setDouble(1, amount);
                updateStatement.setInt(2, campaignId);
                updateStatement.executeUpdate();

                connection.commit();
                return true;

            } catch (SQLException e) {
                connection.rollback();
                throw e;
            }

        } catch (SQLException e) {
            System.out.println("Failed to delete contribution.");
            e.printStackTrace();
            return false;
        }
    }
}