
ALL:	bundle/index.js         \
	bundle/dhcrypt.js \
	bundle/ether.js         \
	fake

bundle/dhcrypt.js: src/dhcrypt.js
	browserify src/dhcrypt.js -o bundle/dhcrypt.js

bundle/ether.js: src/ether.js
	browserify src/ether.js -o bundle/ether.js

bundle/common.js: src/common.js
	browserify src/common.js -o bundle/common.js

bundle/index.js: src/index.js bundle/ether.js bundle/dhcrypt.js bundle/common.js
	browserify src/index.js -o bundle/index.js

fake:	bundle/index.js bundle/common.js bundle/dhcrypt.js bundle/ether.js
	./set_timestamp.sh
