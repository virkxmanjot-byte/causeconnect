package model;

public class Contribution {

    private int contributionId;
    private int campaignId;
    private int userId;
    private double amount;
    private String contributionDate;

    public Contribution(
            int contributionId,
            int campaignId,
            int userId,
            double amount,
            String contributionDate) {

        this.contributionId = contributionId;
        this.campaignId = campaignId;
        this.userId = userId;
        this.amount = amount;
        this.contributionDate = contributionDate;
    }

    public Contribution(
            int campaignId,
            int userId,
            double amount) {

        this.campaignId = campaignId;
        this.userId = userId;
        this.amount = amount;
    }

    public int getContributionId() {
        return contributionId;
    }

    public int getCampaignId() {
        return campaignId;
    }

    public int getUserId() {
        return userId;
    }

    public double getAmount() {
        return amount;
    }

    public String getContributionDate() {
        return contributionDate;
    }

    public void setContributionId(int contributionId) {
        this.contributionId = contributionId;
    }

    public void setContributionDate(String contributionDate) {
        this.contributionDate = contributionDate;
    }
}