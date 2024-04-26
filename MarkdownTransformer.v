module main

struct MarkdownTransformer {
mut:
	content string
}

fn (mut t MarkdownTransformer) process() string {
	t.increase_headers()

	return t.content
}

fn (mut t MarkdownTransformer) increase_headers() {
	mut result := ''

	for line in t.content.split_into_lines() {
		mut new_line := if line.starts_with('##') {
			line.replace_once('##', '#')
		} else {
			line
		}

		result += '${new_line}\n'
	}

	t.content = result
}
