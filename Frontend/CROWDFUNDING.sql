CREATE DATABASE CrowdFunding;
USE CrowdFunding;
SELECT * FROM contributions;
SHOW TABLES;
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
);
CREATE TABLE campaigns (
    campaign_id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    goal_amount DECIMAL(10,2) NOT NULL,
    raised_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,

    FOREIGN KEY (creator_id) REFERENCES users(user_id)
);
CREATE TABLE contributions (
    contribution_id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE TABLE campaign_updates (
    update_id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    creator_id INT,
    title VARCHAR(200),
    message TEXT,
    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
SHOW TABLES;
DESCRIBE users;
DESCRIBE campaigns;
DESCRIBE contributions;
INSERT INTO users (name, email, password, role)
VALUES
('Alice Creator', 'alice@test.com', 'test123', 'CREATOR'),
('Bob Contributor', 'bob@test.com', 'test123', 'CONTRIBUTOR'),
('Admin User', 'admin@test.com', 'test123', 'ADMIN');
SELECT * FROM users;
INSERT INTO campaigns
    (creator_id, title, description, goal_amount, status)
VALUES
    (1,
     'Education for Poor Children',
     'Fundraising to provide educational materials to children.',
     50000.00,
     'APPROVED');
     SELECT * FROM campaigns;
     INSERT INTO contributions
    (campaign_id, user_id, amount)
VALUES
    (1, 2, 5000.00);
    SELECT * FROM contributions;
    SELECT
    u.name AS contributor,
    c.title AS campaign,
    co.amount,
    co.contribution_date
FROM contributions co
JOIN users u
    ON co.user_id = u.user_id
JOIN campaigns c
    ON co.campaign_id = c.campaign_id;
    UPDATE users
SET password = '1234'
WHERE email IN (
    'alice@test.com',
    'bob@test.com',
    'admin@test.com'
);
SELECT campaign_id, creator_id, title, status
FROM campaigns;