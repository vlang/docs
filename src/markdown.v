module main

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

	for index, topic in parts {
		if skip_first && index == 0 {
			continue
		}

		if check_page_should_be_skipped(topic) {
			continue
		}

		title := extract_title_from_markdown_topic(topic) or { panic(err) }
		filename := title_to_filename(title)

		topics << Topic{
			title: title
			url: '${filename}.html'
		}
	}

	return topics
}
