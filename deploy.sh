#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

SOURCE_BRANCH="local-source-deploy"
TARGET_BRANCH="gh-pages"

function doCompile {
  ./compile.sh
}

# Save some useful information
REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

# Clone the existing gh-pages for this repo into out/
# Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)
git clone $REPO amphtml
cd amphtml
git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
cd ..

# Clean out existing contents
rm -rf amphtml/**/* || exit 0

# Pull in changes from feature branch
git pull --rebase --no-commit origin amp-sort

# Run our compile script
doCompile

# Now let's go have some fun with the cloned repo
cd amphtml
git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"

# Commit the "changes", i.e. the new version
# The delta will show diffs between new and old versions
git add -A .
git commit --allow-empty -m "Deploy to GitHub Pages: ${SHA}"

# Get the deploy key by using Travis's stored variables to decrypt deploy_key.enc
ENCRYPTED_KEY_VAR="encrypted_${ENCRYPTION_LABEL}_key"
ENCRYPTED_IV_VAR="encrypted_${ENCRYPTION_LABEL}_iv"
ENCRYPTED_KEY=${!ENCRYPTED_KEY_VAR}
ENCRYPTED_IV=${!ENCRYPTED_IV_VAR}
openssl aes-256-cbc -K $ENCRYPTED_KEY -iv $ENCRYPTED_IV -in ../deploy_key.enc -out ../deploy_key -d
chmod 600 ../deploy_key
eval `ssh-agent -s`
ssh-add ../deploy_key

# Now that we're all set up, we can push.
git push $SSH_REPO $TARGET_BRANCH
