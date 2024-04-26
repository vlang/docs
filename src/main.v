module main

import net.http
import markdown
import time

const (
	v_doc_path        = 'https://raw.githubusercontent.com/vlang/v/master/doc/docs.md'
	output_path       = 'output'
	template_path     = 'templates'
	should_be_skipped = ['Table of Contents']
)

fn main() {
	clean_output_directory()!
	create_output_directory()!

	response := http.get(v_doc_path)!

	generate_pages(response.body)!
	copy_assets_to_output()!
}

fn generate_pages(source string) ! {
	markdown_topics := split_source_by_topics(source, 2)

	topics := extract_topics_from_markdown_parts(markdown_topics, false)
	first_topic := topics.first()
	rest_topics := topics[1..]

	write_output_file('index.html', generate_page_from_template(rest_topics, '', markdown_topics.first(),
		Topic{}, topics[1]))!

	for index, topic in rest_topics {
		title := topic.title

		prev_topic := rest_topics[index - 1] or { first_topic }
		next_topic := rest_topics[index + 1] or { Topic{} }

		mut transformer := MarkdownTransformer{
			content: topic.markdown_content
		}
		content := generate_page_from_template(rest_topics, title, transformer.process(),
			prev_topic, next_topic)

		write_output_file('${title_to_filename(title)}.html', content)!
	}
}

fn generate_page_from_template(topics []Topic, title string, markdown_content string, prev_topic Topic, next_topic Topic) string {
	markdown_subtopics := split_source_by_topics(markdown_content, 2)
	subtopics := extract_topics_from_markdown_parts(markdown_subtopics, true)
	update_time := time.now()

	mut transformer := HTMLTransformer{
		content: markdown.to_html(markdown_content)
	}
	content := transformer.process()

	return $tmpl('../templates/index.html')
}
