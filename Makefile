all: css

css: \
	css/main.css \

css/%.css: less/%.less
	lessc $< $@
