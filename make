#!/bin/bash

NAME_APP="astraflow"

sudo systemctl stop $NAME_APP.service

# get current version from main.go
CUR_VERSION=$(grep -oP 'var _version_ = "\K[0-9]+\.[0-9]+' main.go)

# increment version (0.01)
NEW_VERSION=$(LC_NUMERIC=C awk "BEGIN {printf \"%.2f\", $CUR_VERSION + 0.01}")

CURRENT_DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "Old version: $CUR_VERSION"
echo "New version: $NEW_VERSION"

echo
echo "Enter changes for version $NEW_VERSION (Ctrl+D to finish):"
TMP=$(mktemp)
nano $TMP
CHANGELOG=$(cat $TMP)
rm $TMP

echo "----------------------------------------" >> changelog.txt
echo "Version $NEW_VERSION - $CURRENT_DATE" >> changelog.txt
echo "$CHANGELOG" >> changelog.txt
echo >> changelog.txt

# update version in main.go
sed -i "s|var _version_ = \".*\".*|var _version_ = \"$NEW_VERSION\"  // $CURRENT_DATE|g" main.go

# update frontend version
cd ./frontend/

sed -i "s|REACT_APP_VERSION *=.*|REACT_APP_VERSION = $NEW_VERSION|g" .env

npm run build

cd ../

echo '####################################'

go build -ldflags "-linkmode external -extldflags '-static'" -o $NAME_APP

#./$NAME_APP
sudo systemctl restart $NAME_APP.service