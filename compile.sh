#!/bin/bash
# export AMP_TESTING_HOST="derekcecillewis.github.io"
# gulp dist --fortesting --version 123456789

gulp build --css-only
gulp dist --version 123456789 --type prod --hostname derekcecillewis.github.io --hostname3p derekcecillewis.github.io
mkdir -p amphtml/3p/
# this would be the files hosted on www.ampproject.org/
cp -R dist/* amphtml/
# this would be the files hosted on 3p.ampproject.net/
cp -R dist.3p/* amphtml/3p/

# Unfortunately we need these replace lines to compensate for the transition
# to the new code. We should be able to remove this in the next couple of weeks
# as we no longer prefix the global AMP_CONFIG during `gulp dist` in the latest
# code in master. We use -i.bak for cross compatibility on GNU and BSD/Mac.
# sed -i.bak "s#^.*\/\*AMP_CONFIG\*\/##" /amphtml/v0.js
# rm /amphtml/v0.js.bak
# sed -i.bak "s#^.*\/\*AMP_CONFIG\*\/##" /amphtml/alp.js
# rm /amphtml/alp.js.bak

# make sure and prepend the global production config to main binaries
gulp prepend-global --target amphtml/v0.js --prod
gulp prepend-global --target amphtml/alp.js --prod
# gulp prepend-global --target amphtml/3p/production/f.js --prod
