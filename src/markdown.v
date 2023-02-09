module main

import markdown

fn split_source_by_topics(source string, topic_level int) []string {
	mut sections := []string{}
	mut current_section := ''

	for line in source.split_into_lines() {
		if line.starts_with('${'#'.repeat(topic_level)} ') {
			sections << current_section
			current_section = '${line}\n'
		} else {
			current_section += '${line}\n'
		}
	}

	if current_section != '' {
		sections << current_section
	}

	return sections
}

fn extract_topics_from_markdown_parts(parts []string, skip_first bool) []Topic {
	mut topics := []Topic{}

	for index, part in parts {
		if skip_first && index == 0 {
			continue
		}

		title := extract_title_from_markdown_topic(part) or { panic(err) }
		filename := if index == 0 { 'index' } else { title_to_filename(title) }

		if should_be_skipped.contains(title) {
			continue
		}

		plain_title := markdown.to_plain(title)

		// TODO: remove .html
		topics << Topic{
			id: title_to_filename(plain_title)
			title: plain_title
			markdown_content: part
			url: '${filename}.html'
		}
	}

	return topics
}
