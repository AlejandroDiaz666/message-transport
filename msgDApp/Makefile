SRCDIR := src
CSSDIR := css
BUNDLEDIR := bundle
JSSRCFILES := $(wildcard $(SRCDIR)/*.js)
BUNDLEFILES := $(patsubst $(SRCDIR)/%.js,$(BUNDLEDIR)/%.js,$(JSSRCFILES))
CSSTHEMEFILES := $(wildcard $(SRCDIR)/*-theme.css)
CSSSTYLEFILES := $(patsubst $(SRCDIR)/%-theme.css,$(CSSDIR)/%-style.css,$(CSSTHEMEFILES))
CSSFILES := $(CSSDIR)/intro.css $(CSSSTYLEFILES)
VERSION := $(shell cat src/autoVersion.txt)


all:	bundle/build-date

clean:
	rm -f css/*
	rm -f bundle/*

deploy:
	rm -rf amt/*
	if [ ! -d amt ]; then mkdir amt; fi
	mkdir amt/css
	mkdir amt/images
	mkdir amt/bundle
	cp index.html amt/
	cp images/* amt/images/
	cp css/*_TIMESTAMP*.css amt/css/
	cp bundle/SVGAnimation.js amt/bundle/
	cp bundle/index_TIMESTAMP*.js amt/bundle/
	./autoVersion.sh
	tar -czf amt-$(VERSION).tar.gz amt

$(CSSDIR)/intro.css : $(SRCDIR)/intro.css
	if [ ! -d css ]; then mkdir css; fi
	cp $< $@

$(CSSDIR)/%-style.css : $(SRCDIR)/%-theme.css $(SRCDIR)/style.css
	cat $< > $@
	cat $(SRCDIR)/style.css >> $@

.PHONEY :
	./autoVersion.sh

#
# this can run every time to check the current git version. if it hasn't
# changed since last build then autoVersion.js is not touched
#
$(SRCDIR)/autoVersion.js: .PHONEY

$(BUNDLEDIR)/autoVersion.js : $(SRCDIR)/autoVersion.js
	cp $< $@

$(BUNDLEDIR)/%.js : $(SRCDIR)/%.js
	browserify $< -o $@

$(BUNDLEDIR)/index.js: src/index.js \
	$(BUNDLEDIR)/ether.js \
	$(BUNDLEDIR)/mtEther.js \
	$(BUNDLEDIR)/dhcrypt.js \
	$(BUNDLEDIR)/mtUtil.js  \
	$(BUNDLEDIR)/common.js \

#
# this actually builds the dated version of index.js
#
bundle/build-date: \
	$(CSSFILES) \
	$(BUNDLEFILES)
	./set_timestamp.sh
