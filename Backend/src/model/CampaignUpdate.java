package model;

public class CampaignUpdate {

    private int  updateId;
    private int campaignId;
    private int creatorId;
    private String title;
    private String message;
    private String updateDate;

    public CampaignUpdate(int updateId, int campaignId, int creatorId, String title, String message, String updateDate) {
        this.updateId = updateId;
        this.campaignId = campaignId;
        this.creatorId = creatorId;
        this.title = title;
        this.message = message;
        this.updateDate = updateDate;
    }

    public CampaignUpdate(int campaignId, int creatorId, String title, String message) {
        this.campaignId = campaignId;
        this.creatorId = creatorId;
        this.title = title;
        this.message = message;
        
    }

    public int getUpdateId() {
        return updateId;
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

    public String getMessage() {
        return message;
    }

    public String getUpdateDate() {
        return updateDate;
    }

}
