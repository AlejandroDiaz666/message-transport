SRCDIR := src
CSSDIR := css
BUNDLEDIR := bundle
JSSRCFILES := $(wildcard $(SRCDIR)/*.js)
BUNDLEFILES := $(patsubst $(SRCDIR)/%.js,$(BUNDLEDIR)/%.js,$(JSSRCFILES))
CSSTHEMEFILES := $(wildcard $(SRCDIR)/*-theme.css)
CSSSTYLEFILES := $(patsubst $(SRCDIR)/%-theme.css,$(CSSDIR)/%-style.css,$(CSSTHEMEFILES))
CSSFILES := $(CSSDIR)/intro.css $(CSSSTYLEFILES)


all:	$(BUNDLEDIR)/autoVersion.js \
	$(BUNDLEFILES) \
	$(CSSFILES)
	./set_timestamp.sh

clean:
	rm -f css/*
	rm -f bundle/*

$(CSSDIR)/intro.css : $(SRCDIR)/intro.css
	if [ ! -d css ]; then mkdir css; fi
	cp $< $@

$(CSSDIR)/%-style.css : $(SRCDIR)/%-theme.css $(SRCDIR)/style.css
	cat $< > $@
	cat $(SRCDIR)/style.css >> $@

.PHONEY :
	./autoVersion.sh

$(BUNDLEDIR)/autoVersion.js : $(SRCDIR)/autoVersion.js .PHONEY

$(BUNDLEDIR)/%.js : $(SRCDIR)/%.js
	browserify $< -o $@

$(BUNDLEDIR)/index.js: src/index.js \
	$(BUNDLEDIR)/ether.js \
	$(BUNDLEDIR)/mtEther.js \
	$(BUNDLEDIR)/dhcrypt.js \
	$(BUNDLEDIR)/msgUtil.js \
	$(BUNDLEDIR)/common.js  \
	$(BUNDLEDIR)/autoVersion.js
