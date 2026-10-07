package model;

public class Campaign {

    private int campaignId;
    private int creatorId;
    private String title;
    private String description;
    private double goalAmount;
    private double raisedAmount;
    private String status;

    public Campaign(
            int campaignId,
            int creatorId,
            String title,
            String description,
            double goalAmount,
            double raisedAmount,
            String status) {

        this.campaignId = campaignId;
        this.creatorId = creatorId;
        this.title = title;
        this.description = description;
        this.goalAmount = goalAmount;
        this.raisedAmount = raisedAmount;
        this.status = status;
    }

    public Campaign(
            int creatorId,
            String title,
            String description,
            double goalAmount,
            String status) {

        this.creatorId = creatorId;
        this.title = title;
        this.description = description;
        this.goalAmount = goalAmount;
        this.raisedAmount = 0.0;
        this.status = status;
    }

    public int getCampaignId() {
        return campaignId;
    }

    public int getCreatorId() {
        return creatorId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public double getGoalAmount() {
        return goalAmount;
    }

    public double getRaisedAmount() {
        return raisedAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setCampaignId(int campaignId) {
        this.campaignId = campaignId;
    }

    public void setCreatorId(int creatorId) {
        this.creatorId = creatorId;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setGoalAmount(double goalAmount) {
        this.goalAmount = goalAmount;
    }

    public void setRaisedAmount(double raisedAmount) {
        this.raisedAmount = raisedAmount;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}