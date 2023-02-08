module main

struct HTMLTransformer {
mut:
	content string
}

fn (mut t HTMLTransformer) process() string {
	t.add_main_class_to_first_h1()

	return t.content
}

fn (mut t HTMLTransformer) add_main_class_to_first_h1() {
	t.content = t.content.replace_once('<h1', '<h1 class="main"')
}

fn (t &HTMLTransformer) add_anchors() {
	// <a href="#deprecated" class="header-anchor" aria-hidden="true">#</a>
}
