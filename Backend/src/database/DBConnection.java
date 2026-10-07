package database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {

    private static final String URL =
            System.getenv("DB_URL") != null ? System.getenv("DB_URL") : "jdbc:mysql://localhost:3306/crowdfunding";

    private static final String USER =
            System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "root";

    private static final String PASSWORD =
            System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "root";

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.out.println("MySQL Driver not found in classpath.");
        }
    }

    public static Connection getConnection() {

        try {

            Connection connection =
                    DriverManager.getConnection(
                            URL,
                            USER,
                            PASSWORD
                    );

            return connection;

        } catch (SQLException e) {

            System.out.println(
                    "Database connection failed: " + e.getMessage()
            );

            return null;
        }
    }
}