echo "deploy-script.sh --> fetching from git"
git fetch --all
git reset --hard origin/master
echo "deploy-script.sh --> update npm installs"
cd /home/ivyterrace/trailscape
npm install
cd /home/ivyterrace/trailscape/nodejs
npm install
echo "deploy-script.sh --> copy environment files"
cp -r /home/ivyterrace/trailscape/env/environments /home/ivyterrace/trailscape/src
cp /home/ivyterrace/trailscape/env/.env /home/ivyterrace/trailscape/nodejs
echo "deploy-script.sh --> build angular"
cd /home/ivyterrace/trailscape/angular
# ng build --prod --base-href /trailscape/
ng build --prod
cd /home/ivyterrace/trailscape
echo "deploy-script.sh --> complete"
echo "==========================================="
