module main

import os
import regex

fn clean_output_directory() ! {
	if os.exists(output_path) {
		os.rmdir_all(output_path)!
	}
}

fn create_output_directory() ! {
	if !os.exists(output_path) {
		os.mkdir(output_path)!
	}
}

fn copy_assets_to_output() ! {
	os.cp_all(os.join_path(template_path, 'assets'), os.join_path(output_path, 'assets'),
		true)!
}

fn write_output_file(filename string, content string) ! {
	os.write_file(os.join_path(output_path, filename), content)!
}

fn check_page_should_be_skipped(source string) bool {
	title := extract_title_from_markdown_topic(source) or { panic(err) }

	return should_be_skipped.contains(title)
}

fn title_to_filename(title string) string {
	filename := title.replace_each([' ', '-', '`', '', '/', '', '\\', '']).to_lower()

	return '${filename}'
}

fn extract_title_from_markdown_topic(source string) ?string {
	mut title_re := regex.regex_opt(r'^#+') or { panic(err) }
	lines := source.split_into_lines()

	if lines.len > 0 {
		first_line := lines.first()
		title := title_re.replace(first_line, '')

		if title != '' {
			return title.trim_space()
		}
	}

	return none
}
