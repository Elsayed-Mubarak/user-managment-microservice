mkdir -p /opt/Tooli-Node/user-management
cd /opt/Tooli-Node/user-management

git checkout develop
git pull
npm install
sleep 120s

cd /opt/Tooli-Node/user-management/bin/
pm2 delete www-user-management
pm2 start www-user-management.js -- domain https://stage.tooliserver.com
exit