.PHONY: clean all

all:
	v run .
	git add -u && git commit -m 'manual update'; git push
	cd ../ && v run build.vsh && git add . && git commit -m 'manual update'; git push

clean:
	rm -rf output/
