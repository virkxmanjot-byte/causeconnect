package dao;

import database.DBConnection;
import model.User;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class UserDAO {

    public User login(String email, String password) {

        String sql =
                "SELECT * FROM users WHERE email = ? AND password = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, email);
            statement.setString(2, password);

            ResultSet result = statement.executeQuery();

            if (result.next()) {

                return new User(
                        result.getInt("user_id"),
                        result.getString("name"),
                        result.getString("email"),
                        result.getString("password"),
                        result.getString("role")
                );
            }

        } catch (SQLException e) {

            System.out.println("Login failed.");
            e.printStackTrace();
        }

        return null;
    }

    public boolean updateuser(User user){
        String sql = (user.getPassword() != null && !user.getPassword().isEmpty())
                ? "UPDATE users SET name=?, email=?, password=? WHERE user_id=?"
                : "UPDATE users SET name=?, email=? WHERE user_id=?";

        try(Connection connection=DBConnection.getConnection();
            PreparedStatement statement=
                    connection.prepareStatement(sql)){

            statement.setString(1, user.getName());
            statement.setString(2, user.getEmail());
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                statement.setString(3, user.getPassword());
                statement.setInt(4, user.getUserId());
            } else {
                statement.setInt(3, user.getUserId());
            }

            int rows = statement.executeUpdate();
            return rows > 0;
        }
        catch (SQLException e){
            System.out.println("Profile Update failed."); 
            e.printStackTrace();
            return false;
        }
    }

    public boolean register(User user) {
        String sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            statement.setString(1, user.getName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPassword());
            statement.setString(4, user.getRole() != null ? user.getRole().toUpperCase() : "CONTRIBUTOR");

            int rows = statement.executeUpdate();
            if (rows > 0) {
                try (ResultSet generatedKeys = statement.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        // User model doesn't have setUserId, but constructor with id can be used if needed
                    }
                }
                return true;
            }
        } catch (SQLException e) {
            System.out.println("Registration failed: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    public User getUserById(int userId) {
        String sql = "SELECT * FROM users WHERE user_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);
            ResultSet result = statement.executeQuery();

            if (result.next()) {
                return new User(
                        result.getInt("user_id"),
                        result.getString("name"),
                        result.getString("email"),
                        result.getString("password"),
                        result.getString("role")
                );
            }
        } catch (SQLException e) {
            System.out.println("Failed to fetch user by id.");
            e.printStackTrace();
        }
        return null;
    }

    public User getUserByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, email);
            ResultSet result = statement.executeQuery();

            if (result.next()) {
                return new User(
                        result.getInt("user_id"),
                        result.getString("name"),
                        result.getString("email"),
                        result.getString("password"),
                        result.getString("role")
                );
            }
        } catch (SQLException e) {
            System.out.println("Failed to fetch user by email.");
            e.printStackTrace();
        }
        return null;
    }

    public List<User> getAllUsers() {
        List<User> list = new ArrayList<>();
        String sql = "SELECT * FROM users";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {

            while (result.next()) {
                list.add(new User(
                        result.getInt("user_id"),
                        result.getString("name"),
                        result.getString("email"),
                        result.getString("password"),
                        result.getString("role")
                ));
            }
        } catch (SQLException e) {
            System.out.println("Failed to fetch all users.");
            e.printStackTrace();
        }
        return list;
    }

    public boolean deleteUser(int userId) {
        String sql = "DELETE FROM users WHERE user_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);
            int rows = statement.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.out.println("Failed to delete user.");
            e.printStackTrace();
            return false;
        }
    }
}