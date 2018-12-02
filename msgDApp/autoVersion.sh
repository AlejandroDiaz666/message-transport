#!/bin/bash

#
# this little utility creates a teensy module to get the
# version of the currently builing code from git. the module
# will be src/autoVersion.js, which should be in .gitignore
#
VER=$(git describe --tags --long)
echo "var autoVersion = module.exports = { version() { return \"$VER\"; } }" > src/autoVersion.js
