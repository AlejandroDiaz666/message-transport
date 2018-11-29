SRCDIR := src
CSSDIR := css
BUNDLEDIR := bundle
JSSRCFILES := $(wildcard $(SRCDIR)/*.js)
BUNDLEFILES := $(patsubst $(SRCDIR)/%.js,$(BUNDLEDIR)/%.js,$(JSSRCFILES))
CSSTHEMEFILES := $(wildcard $(SRCDIR)/*-theme.css)
CSSSTYLEFILES := $(patsubst $(SRCDIR)/%-theme.css,$(CSSDIR)/%-style.css,$(CSSTHEMEFILES))
CSSFILES := $(CSSDIR)/intro.css $(CSSSTYLEFILES)


all:	$(BUNDLEFILES) \
	$(CSSFILES)
	@echo $(CSSSTYLEFILES)
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

$(BUNDLEDIR)/%.js : $(SRCDIR)/%.js
	browserify $< -o $@

bundle/index.js: src/index.js bundle/ether.js bundle/mtEther.js bundle/dhcrypt.js bundle/msgUtil.js bundle/common.js
