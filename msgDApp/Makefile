
ALL:	bundle/index.js         \
	bundle/dhcrypt.js       \
	bundle/ether.js         \
	bundle/msgUtil.js       \
	bundle/common.js        \
	fake

bundle/SVGAnimation.js: src/SVGAnimation.js
	browserify src/SVGAnimation.js -o bundle/SVGAnimation.js

bundle/common.js: src/common.js
	browserify src/common.js -o bundle/common.js

bundle/dhcrypt.js: src/dhcrypt.js bundle/common.js
	browserify src/dhcrypt.js -o bundle/dhcrypt.js

bundle/ether.js: src/ether.js bundle/common.js
	browserify src/ether.js -o bundle/ether.js

bundle/msgUtil.js: src/msgUtil.js bundle/ether.js bundle/common.js bundle/dhcrypt.js
	browserify src/msgUtil.js -o bundle/msgUtil.js

bundle/index.js: src/index.js bundle/ether.js bundle/dhcrypt.js bundle/msgUtil.js bundle/common.js
	browserify src/index.js -o bundle/index.js

fake:	bundle/index.js bundle/common.js bundle/dhcrypt.js bundle/ether.js bundle/SVGAnimation.js
	./set_timestamp.sh
