git fetch --all
git reset --hard origin/master
cp -r ~/env/environments ~/angular/src
cp ~/env/.env ~/nodejs
sudo docker-compose down
sudo docker system prune -a -f
sudo docker-compose up --build --detach