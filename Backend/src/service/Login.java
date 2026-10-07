package service;

import dao.UserDAO;
import model.User;

import java.util.Scanner;

public class Login {

    public static User loginUser(Scanner sc) {

        UserDAO userDAO = new UserDAO();

        System.out.println();
        System.out.println("--- Login ---");

        System.out.print("Enter email: ");
        String email = sc.nextLine();

        System.out.print("Enter password: ");
        String password = sc.nextLine();

        User user = userDAO.login(email, password);

        if (user != null) {

            System.out.println();
            System.out.println("Login successful!");
            System.out.println("Welcome, " + user.getName());

            return user;

        } else {

            System.out.println();
            System.out.println("Invalid email or password.");

            return null;
        }
    }
}
