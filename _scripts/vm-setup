
# create backend .env file, only if not already created otherwise risk overwritting manually created entries
if [ ! -f ~/nodejs/.env ]
then
  echo "nodejs/.env not found, new one created."
  touch ~/nodejs/.env
  echo "# these lines to be replaced manually - remember ctrl-shift-v for pasting into terminal window" >> ~nodejs/.env
  echo MONGODB_PASSWORD= >> ~/nodejs/.env
  echo AUTH_KEY= >> ~/nodejs/.env
  echo PORT=8080 >> ~/nodejs/.env
  echo DEBUG=false >> ~/nodejs/.env
  echo GEOTIFF_PATH=/data >> ~/nodejs/.env
  echo "WARNING: Must set MONGODB_PASSWORD and AUTH_KEY manually in ~/nodejs/.env"
else
  echo "nodejs/.env found, skipping create."
fi

# create frontend environment file
# in this case we delete whats there and overwrite
IP_ADDRESS=$(curl ipinfo.io/ip)
touch temp
echo "export const environment" = { >> temp
echo "  production: true", >> temp
echo "  BACKEND_HOST: '${IP_ADDRESS}', " >> temp
echo "  BACKEND_PORT: 8080" >> temp
echo "};" >> temp
sudo rm ~/angular/src/environments/environment.prod.ts
sudo cp temp ~/angular/src/environments/environment.prod.ts
sudo rm temp 

# mount the persistent disk - do this after attaching to the disk in the console
# $ sudo lsblk --> to check persitent disk name ('sdb') 
sudo mkdir ~/data
# mount read-only disk
sudo mount -o discard,defaults,noload /dev/sdc ~/data
# mount read/write disk
# sudo mount -o discard,defaults /dev/sdc ~/data

# change permissions
sudo chmod -R 777 ~/angular
sudo chmod -R 777 ~/nodejs

# docker
# sudo docker-compose build
# sudo docker-compose up -d

# aliases seem to need to do this at the end of the file for them to stick??
sudo rm ~/.bash_aliases
touch ~/.bash_aliases
echo alias ll=\"ls -al\" >> ~/.bash_aliases
echo alias fe=\"cd ~/angular\" >> ~/.bash_aliases
echo alias be=\"cd ~/nodejs\" >> ~/.bash_aliases
source ~/.bash_aliases
alias
