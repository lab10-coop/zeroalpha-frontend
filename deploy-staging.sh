#!/bin/bash

set -e
set -u

if [[ ! -f .env.staging ]]; then
        echo "### ERR: expects a file (or symlink) .env.staging, but does not exist!"
        exit 1
fi

echo "building..."
npm run build.staging

echo "uploading..."
rsync -r build/ zeroalpha@p4p.lab10.io:/var/www/test.zeroalpha/build --delete

