module main

import markdown

const v_repo_doc_url = 'https://github.com/vlang/v/blob/master/doc/'
const v_repo_url = 'https://github.com/vlang/v/blob/master'
const v_code_tag = '<pre><code class="language-v">'
const c_code_tag = '<pre><code class="language-c">'
const code_tag_end = '</code></pre>'
const heading_levels = [2, 3, 4, 5]

struct HTMLTransformer {
	topics []Topic
mut:
	content string
}

fn (mut t HTMLTransformer) process() string {
	t.add_main_class_to_first_h1()
	t.add_tip_class_to_blockquotes()
	t.prepare_v_and_c_code_for_playground()
	t.add_anchors()
	t.adjust_links()

	return t.content
}

fn (mut t HTMLTransformer) add_main_class_to_first_h1() {
	t.content = t.content.replace_once('<h1', '<h1 class="main"')
}

fn (mut t HTMLTransformer) add_tip_class_to_blockquotes() {
	t.content = t.content.replace('<blockquote', '<blockquote class="tip"')
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

		for level in heading_levels {
			tag_start := '<h${level}>'
			tag_end := '</h${level}>'

			if line.starts_with(tag_start) && line.ends_with(tag_end) {
				title := line.substr_ni(tag_start.len, -tag_end.len)
				plain_title := markdown.to_plain(title)
				id := title_to_filename(plain_title)

				new_line = new_line
					.replace(title, '${title} <a href="#${id}" class="header-anchor" aria-hidden="true">#</a>')
					.replace(tag_start, '<h${level} id="${id}">')

				break
			}
		}

		result += '${new_line}\n'
	}

	t.content = result
}

fn (mut t HTMLTransformer) adjust_links() {
	mut lines := string(t.content).split_into_lines()
	pattern := '<a href="'
	mut result := ''

	for line in lines {
		mut new_line := line
		mut search_start_index := 0

		for {
			pattern_start_index := new_line.index_after(pattern, search_start_index)

			if pattern_start_index < 0 {
				break
			}

			link_start_index := pattern_start_index + pattern.len
			link_end_index := new_line.index_after('"', link_start_index)

			if link_end_index < 0 {
				break
			}

			link_content := new_line.substr(link_start_index, link_end_index)

			mut new_link_content := link_content

			if link_content.starts_with('#') {
				adjusted_link_content := link_content.replace('--', '-&-')
				target_filename := adjusted_link_content.all_after_first('#') + '.html'

				for topic in t.topics {
					if found_topic := find_topic_by_filename(topic, target_filename) {
						if found_topic.level == 2 {
							new_link_content = topic.url
						} else {
							new_link_content = topic.url + adjusted_link_content
						}

						break
					}
				}
			} else if link_content.starts_with('http://') || link_content.starts_with('https://') {
				new_link_content = link_content
			} else if link_content.starts_with('/') {
				new_link_content = v_repo_url + link_content
			} else {
				new_link_content = v_repo_doc_url + link_content
			}

			new_line = new_line.substr(0, link_start_index) + new_link_content +
				new_line.substr(link_end_index, new_line.len)
			search_start_index = link_start_index
		}

		result += '${new_line}\n'
	}

	t.content = result
}
