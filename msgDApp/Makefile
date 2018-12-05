SRCDIR := src
CSSDIR := css
BUNDLEDIR := bundle
JSSRCFILES := $(wildcard $(SRCDIR)/*.js)
BUNDLEFILES := $(patsubst $(SRCDIR)/%.js,$(BUNDLEDIR)/%.js,$(JSSRCFILES))
CSSTHEMEFILES := $(wildcard $(SRCDIR)/*-theme.css)
CSSSTYLEFILES := $(patsubst $(SRCDIR)/%-theme.css,$(CSSDIR)/%-style.css,$(CSSTHEMEFILES))
CSSFILES := $(CSSDIR)/intro.css $(CSSSTYLEFILES)
VERSION := $(shell cat src/autoVersion.txt)


all:	$(BUNDLEDIR)/autoVersion.js \
	$(BUNDLEFILES) \
	$(CSSFILES)
	./set_timestamp.sh

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

$(BUNDLEDIR)/autoVersion.js : $(SRCDIR)/autoVersion.js .PHONEY
	cp $< $@

$(BUNDLEDIR)/%.js : $(SRCDIR)/%.js
	browserify $< -o $@

$(BUNDLEDIR)/index.js: src/index.js \
	$(BUNDLEDIR)/ether.js \
	$(BUNDLEDIR)/mtEther.js \
	$(BUNDLEDIR)/dhcrypt.js \
	$(BUNDLEDIR)/mtUtil.js  \
	$(BUNDLEDIR)/common.js  \
	$(BUNDLEDIR)/autoVersion.js
