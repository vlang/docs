module main

import os

fn update_sass() {
	// Note: sass is https://sass-lang.com/dart-sass/, while sassc is https://github.com/sass/sassc .
	// On the FreeBSD vps, where the documentation is generated, *only `sassc` is available* natively,
	// and the `sass` tool, does not have an easily installable prebuilt native version for FreeBSD,
	// only a slower transpiled to JS version, installed through `npm install -g sass`.
	//
	// In comparison, they both produce nearly equal output with --style=expanded , except for:
	// a) `transition: fill 0.25s;` vs `transition: fill .25s;`
	// b) some newlines at the end of each CSS rule
	// c) style.css.map is different.
	sass_cmd := 'sassc --sourcemap=auto --style=expanded templates/assets/styles/style.scss templates/assets/styles/style.css'
	// sass_cmd := 'sass --style=expanded templates/assets/styles/style.scss templates/assets/styles/style.css'
	res := os.system(sass_cmd)
	if res != 0 {
		eprintln('sass compilation failed, cmd: `${sass_cmd}`')
		exit(1)
	}
}
