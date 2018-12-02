#!/bin/bash

#
# this little utility creates a teensy module to get the
# version of the currently builing code from git. the module
# will be src/autoVersion.js, which should be in .gitignore
#
BRANCH=$(git branch | grep "*" | cut -d " " -f 2)
VER=$(git describe --tags --long)
echo "var autoVersion = module.exports = { version() { return \"$BRANCH $VER\"; } }" > src/autoVersion.js
