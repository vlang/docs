module main

import markdown

const (
	v_code_tag   = '<pre><code class="language-v">'
	c_code_tag   = '<pre><code class="language-c">'
	code_tag_end = '</code></pre>'
	h2_tag       = '<h2>'
	h2_tag_end   = '</h2>'
)

struct HTMLTransformer {
mut:
	content string
}

fn (mut t HTMLTransformer) process() string {
	t.add_main_class_to_first_h1()
	t.add_tip_class_to_blockquotes()
	t.prepare_v_and_c_code_for_playground()
	t.add_anchors()

	return t.content
}

fn (mut t HTMLTransformer) add_main_class_to_first_h1() {
	t.content = t.content.replace_once('<h1', '<h1 class="main"')
}

fn (mut t HTMLTransformer) add_tip_class_to_blockquotes() {
	t.content = t.content.replace_once('<blockquote', '<blockquote class="tip"')
}

fn (mut t HTMLTransformer) prepare_v_and_c_code_for_playground() {
	// Until V has no good regex library.
	mut result := ''
	mut in_v_code_tag := false

	for line in t.content.split_into_lines() {
		mut new_line := line

		if line.starts_with(v_code_tag) || line.starts_with(c_code_tag) {
			new_line = new_line
				.replace(v_code_tag, '<div class="language-v">')
				.replace(c_code_tag, '<div class="language-c">')

			in_v_code_tag = true
		}

		if in_v_code_tag {
			if line.starts_with(code_tag_end) {
				new_line = new_line.replace(code_tag_end, '</div>')

				in_v_code_tag = false
			}
		}

		result += '${new_line}\n'
	}

	t.content = result
}

fn (mut t HTMLTransformer) add_anchors() {
	mut result := ''

	for line in t.content.split_into_lines() {
		mut new_line := line

		if line.starts_with(h2_tag) && line.ends_with(h2_tag_end) {
			title := line.substr_ni(h2_tag.len, -h2_tag_end.len)
			plain_title := markdown.to_plain(title)
			id := title_to_filename(plain_title)

			new_line = new_line
				.replace(title, '${title} <a href="#${id}" class="header-anchor" aria-hidden="true">#</a>')
				.replace('<h2>', '<h2 id="${id}">')
		}

		result += '${new_line}\n'
	}

	t.content = result
}
