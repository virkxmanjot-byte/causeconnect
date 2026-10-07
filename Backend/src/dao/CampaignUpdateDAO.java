package dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import database.DBConnection;
import model.CampaignUpdate;

public class CampaignUpdateDAO {
    public boolean addUpdate(CampaignUpdate update){

        String sql = "INSERT INTO campaign_updates " +
             "(campaign_id, creator_id, title, message) " +
             "VALUES (?, ?, ?, ?)";

        try(Connection connection =DBConnection.getConnection();
          PreparedStatement statement =connection.prepareStatement(sql)){

            statement.setInt(1,update.getCampaignId());
            statement.setInt(2,update.getCreatorId());
            statement.setString(3,update.getTitle());
            statement.setString(4,update.getMessage());

            int rows = statement.executeUpdate();

            return rows>0;
          }
          catch(SQLException e){
              System.out.println("Failed to add campaign update.");
              e.printStackTrace();
              return false;
          }
    }

    public List<CampaignUpdate> getUpdatesByCampaign(int campaignId){

        List<CampaignUpdate> updates = new ArrayList<>();

           String sql = "SELECT * FROM campaign_updates " +
             "WHERE campaign_id = ? " +
             "ORDER BY update_date DESC";

         try (Connection connection = DBConnection.getConnection();
            PreparedStatement statement = connection.prepareStatement(sql)){
            
            statement.setInt(1,campaignId);
            ResultSet resultSet = statement.executeQuery();
            
            while(resultSet.next()){
            
               CampaignUpdate update = new CampaignUpdate(
                    resultSet.getInt("update_id"),
                    resultSet.getInt("campaign_id"),
                    resultSet.getInt("creator_id"),
                    resultSet.getString("title"),
                    resultSet.getString("message"),
                    resultSet.getString("update_date")
                );
                updates.add(update);}
                
    }
                catch(SQLException e){
                    System.out.println("Failed to getcampaign updates.");
                    e.printStackTrace();
                }
                    return updates;
    }

    public List<CampaignUpdate> getAllUpdates() {
        List<CampaignUpdate> updates = new ArrayList<>();
        String sql = "SELECT * FROM campaign_updates ORDER BY update_date DESC";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {

            while (resultSet.next()) {
                CampaignUpdate update = new CampaignUpdate(
                        resultSet.getInt("update_id"),
                        resultSet.getInt("campaign_id"),
                        resultSet.getInt("creator_id"),
                        resultSet.getString("title"),
                        resultSet.getString("message"),
                        resultSet.getString("update_date")
                );
                updates.add(update);
            }
        } catch (SQLException e) {
            System.out.println("Failed to get all campaign updates.");
            e.printStackTrace();
        }
        return updates;
    }

    public boolean deleteUpdate(int updateId) {
        String sql = "DELETE FROM campaign_updates WHERE update_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, updateId);
            int rows = statement.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.out.println("Failed to delete campaign update.");
            e.printStackTrace();
            return false;
        }
    }
}
