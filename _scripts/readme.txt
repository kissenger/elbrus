Scripts
=======

1) git-install
   -----------
Installs git, add remote repository and downloads elbrus repo - update script for new repo
Run this one first to get the basic file structure

2) docker-install
   --------------
Installs docker and docker-compose.

3) vm-setup
   --------
mounts the persistent disk, sets up aliases
creates backend .env file if there is already one there (to avoid overwritting manually created info)
** Note need to copy-paste MONGODB_PASSWORD and AUTH_KEY manually into this file
creates front end production environment file at ~/angular/src/environments/environment.prod.ts, with the cuurent public ip address.

Optional

- gitpull
  -------
Pulls the repo OVERWRITTING FILES ON THE VM.
Use with caution.
