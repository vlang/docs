module main

import regex

const (
	v_code_tag      = '<pre><code class="language-v">'
	c_code_tag      = '<pre><code class="language-c">'
	end_of_code_tag = '</code></pre>'
)

struct HTMLTransformer {
mut:
	content string
}

fn (mut t HTMLTransformer) process() string {
	t.add_main_class_to_first_h1()
	t.add_tip_class_to_blockquotes()
	t.prepare_v_and_c_code_for_playground()

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
			if line.starts_with(end_of_code_tag) {
				new_line = new_line.replace(end_of_code_tag, '</div>')

				in_v_code_tag = false
			}
		}

		result += '${new_line}\n'
	}

	t.content = result
}

fn (t &HTMLTransformer) add_anchors() {
	// <a href="#deprecated" class="header-anchor" aria-hidden="true">#</a>
}

fn pre_code_replacer(re regex.RE, in_txt string, _ int, _ int) string {
	start_of_pre_code := re.get_group_by_id(in_txt, 0)
	end_of_pre_code := re.get_group_by_id(in_txt, 2)

	return '${start_of_pre_code}test${end_of_pre_code}'
}
