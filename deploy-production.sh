#!/bin/bash

set -e
set -u

if [[ ! -f .env.production ]]; then
	echo "### ERR: expects a file (or symlink) .env.production, but does not exist!"
	exit 1
fi

echo "building..."
npm run build.production

echo "uploading..."
rsync -r build/ zeroalpha@p4p.lab10.io:/var/www/zeroalpha/build --delete

