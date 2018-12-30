SRCDIR := src
CSSSRCDIR := $(SRCDIR)
IMGSRCDIR := images
HTMSRCDIR := .
HTMBLDDIR := build
CSSBLDDIR := build/css
IMGBLDDIR := build/images
BUNDLEDIR := build/bundle
JSSRCFILES := $(wildcard $(SRCDIR)/*.js)
IMGSRCFILES := $(wildcard $(IMGSRCDIR)/*.jpg) $(wildcard $(IMGSRCDIR)/*.png)
HTMSRCFILES := $(wildcard $(HTMSRCDIR)/*.html)
CSSTHEMEFILES := $(wildcard $(SRCDIR)/*-theme.css)

BUNDLEFILES := $(patsubst $(SRCDIR)/%.js,$(BUNDLEDIR)/%.js,$(JSSRCFILES))
IMGBLDFILES := $(patsubst $(IMGSRCDIR)/%,$(IMGBLDDIR)/%,$(IMGSRCFILES))
CSSSTYLEFILES := $(patsubst $(CSSSRCDIR)/%-theme.css,$(CSSBLDDIR)/%-style.css,$(CSSTHEMEFILES))
CSSBLDFILES := $(CSSBLDDIR)/intro.css $(CSSSTYLEFILES)


all:	$(HTMBLDDIR)/index.html

clean:
	rm -rf build/*

deploy: all
	rm -rf amt/*
	if [ ! -d amt ]; then mkdir amt; fi
	mkdir amt/css
	mkdir amt/images
	mkdir amt/bundle
	cp $(HTMBLDDIR)/*.html amt/
	cp $(IMGBLDDIR)/* amt/images/
	cp $(CSSBLDDIR)/*_TIMESTAMP*.css amt/css/
	cp $(BUNDLEDIR)/SVGAnimation.js amt/bundle/
	cp $(BUNDLEDIR)/index_TIMESTAMP*.js amt/bundle/
	tar -czf amt-$(shell cat src/autoVersion.txt).tar.gz amt

$(CSSBLDDIR)/intro.css : $(CSSSRCDIR)/intro.css
	if [ ! -d $(CSSBLDDIR) ]; then mkdir -p $(CSSBLDDIR); fi
	cp $< $@

$(CSSBLDDIR)/%-style.css : $(CSSSRCDIR)/%-theme.css $(CSSSRCDIR)/style.css
	cat $< > $@
	cat $(CSSSRCDIR)/style.css >> $@


#
# this can run every time to check the current git version. if it hasn't
# changed since last build then autoVersion.js is not touched; nevertheless,
# autoVersion.js should not be under git, in order to avoid the need to
# recursively re-create, then re-commit it.
#
.PHONEY :
	./autoVersion.sh

$(SRCDIR)/autoVersion.js : .PHONEY

$(IMGBLDDIR)/%.jpg : $(IMGSRCDIR)/%.jpg
	if [ ! -d $(IMGBLDDIR) ]; then mkdir -p $(IMGBLDDIR); fi
	cp $< $@

$(IMGBLDDIR)/%.png : $(IMGSRCDIR)/%.png
	if [ ! -d $(IMGBLDDIR) ]; then mkdir -p $(IMGBLDDIR); fi
	cp $< $@

$(BUNDLEDIR)/%.js : $(SRCDIR)/%.js
	browserify $< -o $@

$(BUNDLEDIR)/index.js: $(SRCDIR)/index.js $(SRCDIR)/autoVersion.js \
	$(BUNDLEDIR)/ether.js \
	$(BUNDLEDIR)/mtEther.js \
	$(BUNDLEDIR)/dhcrypt.js \
	$(BUNDLEDIR)/mtUtil.js  \
	$(BUNDLEDIR)/common.js
	browserify $< -o $@

$(HTMBLDDIR)/index.html : $(HTMSRCDIR)/index.html \
	$(CSSBLDFILES) \
	$(IMGBLDFILES) \
	$(BUNDLEFILES)
	cp $< $@
	./set_timestamp.sh
