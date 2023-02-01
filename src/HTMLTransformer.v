module main

struct HTMLTransformer {
	content string
}

fn (t &HTMLTransformer) process() string {
	return t.content
}

fn (t &HTMLTransformer) add_anchors() {
	// <a href="#deprecated" class="header-anchor" aria-hidden="true">#</a>
}
