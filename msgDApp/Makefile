
ALL:	bundle/index.js         \
	bundle/dhcrypt.js       \
	bundle/ether.js         \
	bundle/common.js        \
	fake

bundle/common.js: src/common.js
	browserify src/common.js -o bundle/common.js

bundle/dhcrypt.js: src/dhcrypt.js bundle/common.js
	browserify src/dhcrypt.js -o bundle/dhcrypt.js

bundle/ether.js: src/ether.js bundle/common.js
	browserify src/ether.js -o bundle/ether.js

bundle/index.js: src/index.js bundle/ether.js bundle/dhcrypt.js bundle/common.js
	browserify src/index.js -o bundle/index.js

fake:	bundle/index.js bundle/common.js bundle/dhcrypt.js bundle/ether.js
	./set_timestamp.sh
