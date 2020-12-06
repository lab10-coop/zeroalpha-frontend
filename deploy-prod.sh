#!/bin/bash

set -e
set -u

echo "building..."
npm run build

echo "uploading..."
rsync -r build/ zeroalpha@p4p.lab10.io:/var/www/zeroalpha/build --delete

