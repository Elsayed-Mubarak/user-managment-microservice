var urls = {};
if (process.argv[2] && process.argv[2] == 'domain' && process.argv[3]) {
    // domain server
    let domainName = process.argv[3];
    urls = {
        saveFromCloud: domainName + '/media/v1/saveFromCloud',
        assignPromotionToUser: domainName + '/promotions/v1/assignPromotionToUser',
        generateNewArabSatCode: domainName + '/subscription/v1/generateNewArabSatCode',
        userInfoSubscription: domainName + '/subscription/v1/userInfoSubscription',
        countUserNotification: domainName + '/notification/v1/countUserNotification',
        countUserUnusedPromo: domainName + '/promotions/v1/countUserUnusedPromo',
        createNotification: domainName + '/notification/v1/createNotification',
        royalLogin: 'http://tooli.org/api/access/v2/login.php',
        randomcodedealar: 'http://tooli.org/api/access/v2/randomcodedealar.php',
        newsFeedService: domainName + '/feeds',
        rocketChatApi: 'https://stage2-chat.tooliserver.com:8443/api/v1/'
    }
} else {
    // default localhost
    urls = {
        saveFromCloud: 'http://localhost:8087/v1/saveFromCloud',
        assignPromotionToUser: 'http://localhost:3010/promotions/v1/assignPromotionToUser',
        generateNewArabSatCode: 'http://localhost:3002/subscription/v1/generateNewArabSatCode',
        userInfoSubscription: 'http://localhost:3002/subscription/v1/userInfoSubscription',
        countUserNotification: 'http://localhost:3009/notification/v1/countUserNotification',
        countUserUnusedPromo: 'http://localhost:3010/promotions/v1/countUserUnusedPromo',
        createNotification: 'http://localhost:3009/notification/v1/createNotification',
        royalLogin: 'http://tooli.org/api/access/v2/login.php',
        randomcodedealar: 'http://tooli.org/api/access/v2/randomcodedealar.php',
        newsFeedService: 'http://localhost:3016/feeds',
        rocketChatApi: 'https://stage2-chat.tooliserver.com:8443/api/v1/'
    }
}




exports.urls = urls; //add on exports