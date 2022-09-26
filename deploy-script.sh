# BE CAREFUL UPDATING THIS FILE ON THE VM AND THEN RUNNING IT
# CHANGES WILL BE OVERWRITTEN BY THE GIT COPY
RED='\033[0;31m'
YELLOW_BOLD='\033[1;33m'
NC='\033[0m'     # No Colour
echo "${YELLOW_BOLD}deploy-script.sh --> fetching from git${NC}"
git fetch --all
git reset --hard origin/master
echo "${YELLOW_BOLD}deploy-script.sh --> update npm installs${NC}"
cd /home/ivyterrace/trailscape
npm install
cd /home/ivyterrace/trailscape/nodejs
npm install
echo "${YELLOW_BOLD}deploy-script.sh --> copy environment files${NC}"
cp -r /home/ivyterrace/trailscape/env/environments /home/ivyterrace/trailscape/src
cp /home/ivyterrace/trailscape/env/.env /home/ivyterrace/trailscape/nodejs
echo "${YELLOW_BOLD}deploy-script.sh --> build angular${NC}"
cd /home/ivyterrace/trailscape
# ng build --prod --base-href /trailscape/
# ng build --prod
# fix memory issue per: https://upmostly.com/angular/fixing-angular-build-memory-issues
npm run build-prod
cd /home/ivyterrace/trailscape
echo "${YELLOW_BOLD}deploy-script.sh --> complete${NC}"
